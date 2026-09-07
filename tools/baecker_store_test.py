"""Prueft das Fundament der Zwei-Baeckereien-Umstellung: Schluessel, Lesebruecke
und die Zuordnung ueber den gemeinsamen Praefix.

Laeuft **ohne Azure**: Dataverse wird durch ein Woerterbuch ersetzt. Aufruf::

    python tools/baecker_store_test.py

Deckt TC-B2-F17-01/-02/-03 und TC-B2-F24-02.
"""
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


# ──────────────────────────────────────────────────────────────────
#  Dataverse durch ein Woerterbuch ersetzen
# ──────────────────────────────────────────────────────────────────

class Speicher:
    """Minimaler Ersatz fuer die drei Zugriffsfunktionen in store.py."""

    def __init__(self, inhalt=None):
        self.inhalt = dict(inhalt or {})
        self.geschrieben = []

    def read_json(self, url, hdrs, key):
        if key in self.inhalt:
            return f"id-{key}", self.inhalt[key]
        return None, {}

    def read_many(self, url, hdrs, prefix, top=400):
        return [(k, v) for k, v in self.inhalt.items() if k.startswith(prefix)]

    def write_json(self, url, hdrs, key, rec_id, data, bezeichnung="x"):
        self.geschrieben.append(key)
        self.inhalt[key] = data
        return True


def mit_speicher(inhalt):
    """Haengt einen Speicher in store.py ein und gibt ihn zurueck."""
    s = Speicher(inhalt)
    store.read_json = s.read_json
    store.read_many = s.read_many
    store.write_json = s.write_json
    return s


def bestellung(status=store.STATUS_GESENDET, positionen=None):
    return {"status": status, "positionen": positionen or [
        {"nummer": "1", "name": "Artikel 1", "menge": 10},
    ]}


# ──────────────────────────────────────────────────────────────────

def test_schluessel():
    print("\nSchluessel und Deutung")
    pruefe("order_key neu", store.order_key("freundl", "2026-09-10")
           == "baecker_order_freundl_2026-09-10")
    pruefe("alt_order_key", store.alt_order_key("2026-09-10")
           == "baecker_order_2026-09-10")
    pruefe("artikel_store_key", store.artikel_store_key("martins")
           == "baecker_artikel_martins")

    # Der springende Punkt: 'baecker_order_' ist Praefix der NEUEN Schluessel.
    bk, d, alt = store.schluessel_deuten("baecker_order_2026-09-10")
    pruefe("Altschluessel -> Freundl", (bk, d, alt) == ("freundl", "2026-09-10", True),
           f"{bk},{d},{alt}")
    bk, d, alt = store.schluessel_deuten("baecker_order_martins_2026-09-12")
    pruefe("neuer Schluessel Martins", (bk, d, alt) == ("martins", "2026-09-12", False),
           f"{bk},{d},{alt}")
    bk, d, alt = store.schluessel_deuten("baecker_artikel_freundl")
    pruefe("fremder Schluessel wird verworfen", bk is None, f"{bk}")
    bk, _, _ = store.schluessel_deuten("baecker_order_unsinn")
    pruefe("unbekannte Form wird verworfen", bk is None)

    # artikel_key(a) darf NICHT von artikel_store_key ueberschrieben sein
    pruefe("artikel_key(a) ist der Positionsschluessel",
           store.artikel_key({"nummer": "7"}) == "7")


def test_lesebruecke():
    print("\nLesebruecke (TC-B2-F24-02)")

    # Nur Altbestand vorhanden -> Freundl findet ihn trotzdem
    s = mit_speicher({"baecker_order_2026-09-10": bestellung()})
    rec, data = store.load_order(None, None, "freundl", "2026-09-10")
    pruefe("Altbestellung wird gefunden", data.get("positionen"), str(data))
    pruefe("record_id bleibt None (schreibt neu an)", rec is None, str(rec))

    # Martins darf den Altbestand NICHT sehen (TC-B2-F17-03)
    _, data = store.load_order(None, None, "martins", "2026-09-10")
    pruefe("TC-B2-F17-03 Martins sieht Freundls Altbestand nicht", not data, str(data))

    # Neuer Schluessel gewinnt
    s = mit_speicher({
        "baecker_order_2026-09-10": bestellung(positionen=[{"nummer": "1", "menge": 10}]),
        "baecker_order_freundl_2026-09-10": bestellung(positionen=[{"nummer": "1", "menge": 99}]),
    })
    _, data = store.load_order(None, None, "freundl", "2026-09-10")
    pruefe("neuer Schluessel schlaegt alten",
           data["positionen"][0]["menge"] == 99, str(data))

    # Katalog: Altschluessel greift nur fuer Freundl
    s = mit_speicher({"baecker_artikel": {"artikel": [{"nummer": "1", "name": "Kaisersemmel"}]}})
    art = store.load_artikel(None, None, "freundl")
    pruefe("Altkatalog wird gefunden",
           any(a.get("name") == "Kaisersemmel" for a in art), str(art[:2]))
    art_m = store.load_artikel(None, None, "martins")
    pruefe("Martins bekommt seinen eigenen Startkatalog",
           art_m and not any(a.get("name") == "Kaisersemmel" for a in art_m),
           str(art_m[:2]))


def test_trennung():
    print("\nTrennung der Baeckereien (TC-B2-F17-01/-02)")
    s = mit_speicher({
        "baecker_order_freundl_2026-09-12": bestellung(
            positionen=[{"nummer": "1", "name": "Kaisersemmel", "menge": 80}]),
        "baecker_order_martins_2026-09-12": bestellung(
            positionen=[{"nummer": "1", "name": "Semmel", "menge": 90}]),
    })
    _, f = store.load_order(None, None, "freundl", "2026-09-12")
    _, m = store.load_order(None, None, "martins", "2026-09-12")
    pruefe("TC-B2-F17-02 gleiche Nummer, eigene Mengen",
           f["positionen"][0]["menge"] == 80 and m["positionen"][0]["menge"] == 90,
           f"{f} / {m}")
    pruefe("TC-B2-F17-01 gleiche Nummer, eigene Namen",
           f["positionen"][0]["name"] == "Kaisersemmel"
           and m["positionen"][0]["name"] == "Semmel")

    alle = store.bestellungen(None, None)
    pruefe("bestellungen() ohne Filter liefert beide", len(alle) == 2, str(len(alle)))
    nur_f = store.bestellungen(None, None, "freundl")
    pruefe("bestellungen('freundl') liefert nur eine", len(nur_f) == 1, str(len(nur_f)))


def test_vorbelegung():
    print("\nVorbelegung ueberschreitet keine Grenze (TC-B2-F17-03)")
    # Freundl hat Historie fuer Samstage, Martins nicht.
    s = mit_speicher({
        "baecker_order_freundl_2026-09-05": bestellung(),   # Samstag
        "baecker_order_freundl_2026-08-29": bestellung(),   # Samstag
    })
    v_f = store.vorlage_bestellungen(None, None, "freundl", "2026-09-12")
    pruefe("Freundl findet seine Samstage", len(v_f) == 2, str(len(v_f)))
    v_m = store.vorlage_bestellungen(None, None, "martins", "2026-09-12")
    pruefe("TC-B2-F17-03 Martins findet nichts", v_m == [], str(v_m))

    # Auch aus dem ALTBESTAND darf Martins nichts ziehen
    s = mit_speicher({"baecker_order_2026-09-05": bestellung()})
    pruefe("Martins zieht auch aus dem Altbestand nichts",
           store.vorlage_bestellungen(None, None, "martins", "2026-09-12") == [])
    pruefe("Freundl zieht aus dem Altbestand",
           len(store.vorlage_bestellungen(None, None, "freundl", "2026-09-12")) == 1)


def test_nummer_umziehen():
    print("\nNummernwechsel bleibt in der Baeckerei")
    s = mit_speicher({
        "baecker_order_freundl_2026-09-05": bestellung(
            positionen=[{"nummer": "1", "name": "Kaisersemmel", "menge": 80}]),
        "baecker_order_martins_2026-09-05": bestellung(
            positionen=[{"nummer": "1", "name": "Semmel", "menge": 90}]),
    })
    anzahl = store.nummer_umziehen(None, None, "freundl", "1", "2", "Kaisersemmel")
    pruefe("eine Bestellung angepasst", anzahl == 1, str(anzahl))
    pruefe("Freundl umgezogen",
           s.inhalt["baecker_order_freundl_2026-09-05"]["positionen"][0]["nummer"] == "2")
    pruefe("Martins UNBERUEHRT",
           s.inhalt["baecker_order_martins_2026-09-05"]["positionen"][0]["nummer"] == "1")

    # Altbestand wird auf den neuen Schluessel geschrieben
    s = mit_speicher({
        "baecker_order_2026-09-05": bestellung(
            positionen=[{"nummer": "1", "name": "Kaisersemmel", "menge": 80}]),
    })
    store.nummer_umziehen(None, None, "freundl", "1", "2")
    pruefe("Altbestand landet auf dem neuen Schluessel",
           "baecker_order_freundl_2026-09-05" in s.geschrieben, str(s.geschrieben))


def test_config():
    print("\nEinstellungen je Baeckerei")
    # Altform (flach) -> Freundl
    s = mit_speicher({"baecker_config": {"kd_nr": "9999", "bestellschluss": "11:00"}})
    cfg = store.load_config(None, None)
    pruefe("Altform wird Freundl zugeordnet",
           store.cfg_von(cfg, "freundl")["kd_nr"] == "9999", str(cfg))
    pruefe("Martins bekommt seine Vorgaben",
           store.cfg_von(cfg, "martins")["kd_nr"] == "1015")
    pruefe("uebernommener Bestellschluss",
           store.cfg_von(cfg, "freundl")["bestellschluss"] == "11:00")

    # Neue Form
    s = mit_speicher({"baecker_config": {"baeckereien": {
        "martins": {"kd_nr": "1015", "bestelltage": [0, 1, 5]},
        "freundl": {"kd_nr": "1190", "bestelltage": [2, 3, 4, 5]},
    }}})
    cfg = store.load_config(None, None)
    pruefe("beide Baeckereien vorhanden",
           set(cfg["baeckereien"]) == {"freundl", "martins"})

    # Samstag: beide liefern
    pruefe("Samstag liefern beide",
           store.liefert_am(cfg, "2026-09-12") == ["freundl", "martins"],
           str(store.liefert_am(cfg, "2026-09-12")))
    pruefe("Dienstag nur Martins",
           store.liefert_am(cfg, "2026-09-08") == ["martins"],
           str(store.liefert_am(cfg, "2026-09-08")))
    pruefe("Donnerstag nur Freundl",
           store.liefert_am(cfg, "2026-09-10") == ["freundl"])
    pruefe("Sonntag niemand", store.liefert_am(cfg, "2026-09-13") == [])

    # Tour-Nummer: Freundl samstags 8, sonst 87; Martins hat keine
    f = store.cfg_von(store.load_config(None, None), "freundl")
    pruefe("Tour Samstag", store.tour_nr(store.DEFAULT_BAECKEREIEN["freundl"],
                                        "2026-09-12") == "8")
    pruefe("Tour Werktag", store.tour_nr(store.DEFAULT_BAECKEREIEN["freundl"],
                                        "2026-09-10") == "87")
    pruefe("Martins ohne Tour", store.tour_nr(store.DEFAULT_BAECKEREIEN["martins"],
                                              "2026-09-12") == "")


def main():
    print("store.py \u2013 Fundament fuer zwei Baeckereien")
    test_schluessel()
    test_lesebruecke()
    test_trennung()
    test_vorbelegung()
    test_nummer_umziehen()
    test_config()
    print(f"\n{_ok} von {_ok + len(_fehler)} Pruefungen bestanden")
    if _fehler:
        print("Fehlgeschlagen: " + ", ".join(_fehler))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
