"""Prueft die Bestandsuebernahme und – wichtiger noch – das Verhalten davor.

Laeuft **ohne Azure**: Dataverse wird durch ein Woerterbuch ersetzt.

    python tools/baecker_migration_test.py

Teil (a) ist der eigentliche Sicherheitsgurt: Der neue Code muss gegen einen
**un-migrierten** Bestand genauso arbeiten wie vorher. Ohne diesen Test waere
die Lesebruecke nur eine Behauptung.

Deckt TC-B2-F24-01 bis TC-B2-F24-04.
"""
import importlib.util
import os
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
WURZEL = os.path.dirname(HIER)
sys.path.insert(0, os.path.join(WURZEL, "api", "baecker-order"))

import store  # noqa: E402

_ok = 0
_fehler = []


def pruefe(name, bedingung, hinweis=""):
    global _ok
    if bedingung:
        _ok += 1
        print(f"  OK   {name}")
    else:
        _fehler.append(name)
        print(f"  FEHL {name}" + (f"  -> {hinweis}" if hinweis else ""))


def lade_migration():
    """Das Migrations-Modul liegt in einem Ordner mit Bindestrich."""
    pfad = os.path.join(WURZEL, "api", "baecker-migration", "__init__.py")
    spec = importlib.util.spec_from_file_location("baecker_migration", pfad)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["baecker_migration"] = mod
    spec.loader.exec_module(mod)
    return mod


class Speicher:
    def __init__(self, inhalt=None):
        self.inhalt = dict(inhalt or {})
        self.geschrieben = []

    def read_json(self, url, hdrs, key):
        if key in self.inhalt:
            return f"id-{key}", self.inhalt[key]
        return None, {}

    def read_many(self, url, hdrs, prefix, top=400):
        treffer = [(k, v) for k, v in self.inhalt.items() if k.startswith(prefix)]
        return treffer[:top]

    def write_json(self, url, hdrs, key, rec_id, data, bezeichnung="x"):
        self.geschrieben.append(key)
        self.inhalt[key] = data
        return True


def einhaengen(inhalt):
    s = Speicher(inhalt)
    store.read_json = s.read_json
    store.read_many = s.read_many
    store.write_json = s.write_json
    return s


def bestellung(datum, menge=10, status=None):
    return {
        "datum": datum,
        "status": store.STATUS_GESENDET if status is None else status,
        "positionen": [
            {"nummer": "1", "name": "Kaisersemmel", "menge": menge},
            {"nummer": "33", "name": "Mohnsemmel", "menge": 2},
        ],
        "protokoll": [{"zeit": f"{datum}T10:30:00", "art": "gesendet", "wer": "Anna"}],
    }


ALTBESTAND = {
    "baecker_artikel": {"artikel": [
        {"nummer": "1", "name": "Kaisersemmel", "aktiv": True},
        {"nummer": "33", "name": "Mohnsemmel", "aktiv": True},
        {"nummer": "99", "name": "Sonderbrot", "aktiv": False},
    ]},
    "baecker_config": {"kd_nr": "1190", "bestellschluss": "12:00",
                       "bestelltage": [2, 3, 4, 5]},
    # Vier Donnerstage – Grundlage der Vorbelegung
    "baecker_order_2026-08-20": bestellung("2026-08-20", 40),
    "baecker_order_2026-08-27": bestellung("2026-08-27", 44),
    "baecker_order_2026-09-03": bestellung("2026-09-03", 48),
    "baecker_order_2026-09-05": bestellung("2026-09-05", 60),   # Samstag
}


# ══════════════════════════════════════════════════════════════════
#  (a) Verhalten VOR dem Umzug – der eigentliche Sicherheitsgurt
# ══════════════════════════════════════════════════════════════════

def test_vor_dem_umzug():
    print("\n(a) Neuer Code gegen un-migrierten Bestand (TC-B2-F24-02)")
    einhaengen(ALTBESTAND)

    # Katalog: die gepflegten Artikel, NICHT der Startkatalog aus der Datei
    art = store.load_artikel(None, None, "freundl")
    pruefe("Katalog kommt aus dem Altbestand", len(art) == 3, str(len(art)))
    pruefe("Sonderbrot ist dabei",
           any(a["name"] == "Sonderbrot" for a in art))

    # Einzelne Bestellung
    _, b = store.load_order(None, None, "freundl", "2026-09-03")
    pruefe("Bestellung wird gefunden",
           b.get("positionen") and b["positionen"][0]["menge"] == 48, str(b)[:80])

    # Verlauf
    alle = store.bestellungen(None, None, "freundl")
    pruefe("TC-B2-F24-01 Verlauf vollstaendig", len(alle) == 4, str(len(alle)))

    # Vorbelegung: naechster Donnerstag zieht den letzten Donnerstag
    v = store.vorlage_bestellungen(None, None, "freundl", "2026-09-10")
    pruefe("Vorbelegung findet Donnerstage", len(v) == 3, str([x[0] for x in v]))
    pruefe("juengster Donnerstag zuerst", v and v[0][0] == "2026-09-03",
           str(v[0][0]) if v else "-")
    pruefe("Menge stimmt", v and store.positionen_map(v[0][1])["1"] == 48)

    # Einstellungen
    cfg = store.load_config(None, None)
    pruefe("Einstellungen kommen bei Freundl an",
           store.cfg_von(cfg, "freundl")["kd_nr"] == "1190")

    # Martins sieht davon NICHTS
    _, m = store.load_order(None, None, "martins", "2026-09-03")
    pruefe("Martins sieht nichts davon", not m, str(m))
    pruefe("Martins bekommt seinen Startkatalog",
           len(store.load_artikel(None, None, "martins")) == 48,
           str(len(store.load_artikel(None, None, "martins"))))


# ══════════════════════════════════════════════════════════════════
#  (b) Der Umzug selbst
# ══════════════════════════════════════════════════════════════════

def test_testlauf(mig):
    print("\n(b1) Testlauf schreibt nichts (TC-B2-F24-04)")
    s = einhaengen(ALTBESTAND)
    auf = mig._bestandsaufnahme(None, None)
    bericht = mig._bericht(auf)
    pruefe("4 Altbestellungen erkannt", bericht["bestellungen_alt"] == 4,
           str(bericht["bestellungen_alt"]))
    pruefe("keine neuen vorhanden", bericht["bestellungen_neu"] == 0)
    pruefe("4 umzuziehen", len(bericht["umzuziehen"]) == 4)
    pruefe("Katalog erkannt", bericht["katalog_alt"] == 3)
    pruefe("Testlauf schreibt nichts", s.geschrieben == [], str(s.geschrieben))
    pruefe("keine Warnung", mig._pruefen(auf) is None, str(mig._pruefen(auf)))


def test_umzug(mig):
    print("\n(b2) Echter Umzug (TC-B2-F24-01)")
    s = einhaengen(ALTBESTAND)
    vorher = mig._bericht(mig._bestandsaufnahme(None, None))
    ergebnis = mig._umziehen(None, None, mig._bestandsaufnahme(None, None))
    pruefe("4 Bestellungen kopiert", len(ergebnis["kopiert"]) == 4,
           str(ergebnis["kopiert"]))
    pruefe("keine Fehler", not ergebnis["fehler"], str(ergebnis["fehler"]))
    pruefe("Katalog mitgenommen", ergebnis["katalog"]["kopiert"])

    nachher = mig._bericht(mig._bestandsaufnahme(None, None))
    pruefe("TC-B2-F24-01 Anzahl stimmt",
           nachher["bestellungen_neu"] == vorher["bestellungen_alt"],
           f"{nachher['bestellungen_neu']} vs {vorher['bestellungen_alt']}")
    pruefe("TC-B2-F24-01 Positionen stimmen",
           nachher["positionen_neu"] == vorher["positionen_alt"],
           f"{nachher['positionen_neu']} vs {vorher['positionen_alt']}")
    pruefe("nichts bleibt offen", nachher["umzuziehen"] == [],
           str(nachher["umzuziehen"]))
    pruefe("Altschluessel bleiben stehen",
           "baecker_order_2026-09-03" in s.inhalt)

    # Nach dem Umzug muss die Vorbelegung UNVERAENDERT sein (TC-B2-F24-02)
    v = store.vorlage_bestellungen(None, None, "freundl", "2026-09-10")
    pruefe("TC-B2-F24-02 Vorbelegung unveraendert",
           len(v) == 3 and v[0][0] == "2026-09-03", str([x[0] for x in v]))
    pruefe("Verlauf unveraendert",
           len(store.bestellungen(None, None, "freundl")) == 4)


def test_wiederholung(mig):
    print("\n(b3) Zweiter Lauf ist folgenlos (TC-B2-F24-03)")
    s = einhaengen(ALTBESTAND)
    mig._umziehen(None, None, mig._bestandsaufnahme(None, None))
    stand = dict(s.inhalt)
    s.geschrieben = []

    ergebnis = mig._umziehen(None, None, mig._bestandsaufnahme(None, None))
    pruefe("TC-B2-F24-03 nichts kopiert", ergebnis["kopiert"] == [],
           str(ergebnis["kopiert"]))
    pruefe("alle uebersprungen", len(ergebnis["uebersprungen"]) == 4)
    pruefe("Katalog nicht doppelt", not ergebnis["katalog"]["kopiert"])
    pruefe("keine Schluessel dazugekommen", set(s.inhalt) == set(stand))
    pruefe("Bestand unveraendert", len(store.bestellungen(None, None, "freundl")) == 4)


def test_neuer_stand_gewinnt(mig):
    print("\n(b4) Ein neuerer Stand wird nicht ueberschrieben")
    # Fall aus dem Plan: Zwischen Live-Gang und Umzug wurde eine Bestellung
    # erfasst. Sie liegt auf dem neuen Schluessel und muss gewinnen.
    inhalt = dict(ALTBESTAND)
    inhalt["baecker_order_freundl_2026-09-03"] = bestellung("2026-09-03", 99)
    s = einhaengen(inhalt)

    ergebnis = mig._umziehen(None, None, mig._bestandsaufnahme(None, None))
    pruefe("betroffener Tag wird uebersprungen",
           "2026-09-03" in ergebnis["uebersprungen"], str(ergebnis))
    pruefe("neuerer Stand bleibt erhalten",
           s.inhalt["baecker_order_freundl_2026-09-03"]["positionen"][0]["menge"] == 99)
    pruefe("die anderen drei ziehen um", len(ergebnis["kopiert"]) == 3)


def test_lesegrenze(mig):
    print("\n(b5) Lesegrenze bricht ab, statt still abzuschneiden")
    viele = {f"baecker_order_2026-01-{i:02d}": bestellung(f"2026-01-{i:02d}")
             for i in range(1, 29)}
    s = einhaengen(viele)
    # Grenze kuenstlich klein setzen
    echte = mig.LESEGRENZE
    mig.LESEGRENZE = 10
    try:
        auf = mig._bestandsaufnahme(None, None)
        warnung = mig._pruefen(auf)
        pruefe("Warnung bei erreichter Grenze", warnung and "Obergrenze" in warnung,
               str(warnung))
    finally:
        mig.LESEGRENZE = echte


def test_unbekannte_schluessel(mig):
    print("\n(b6) Unbekannte Schluessel werden gemeldet")
    inhalt = dict(ALTBESTAND)
    inhalt["baecker_order_kaputt"] = {"positionen": []}
    einhaengen(inhalt)
    auf = mig._bestandsaufnahme(None, None)
    warnung = mig._pruefen(auf)
    pruefe("TC-B2-F24-04 Warnung nennt den Schluessel",
           warnung and "baecker_order_kaputt" in warnung, str(warnung))


def main():
    print("Bestandsuebernahme \u2013 Baecker")
    mig = lade_migration()
    test_vor_dem_umzug()
    test_testlauf(mig)
    test_umzug(mig)
    test_wiederholung(mig)
    test_neuer_stand_gewinnt(mig)
    test_lesegrenze(mig)
    test_unbekannte_schluessel(mig)
    print(f"\n{_ok} von {_ok + len(_fehler)} Pruefungen bestanden")
    if _fehler:
        print("Fehlgeschlagen: " + ", ".join(_fehler))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
