"""Mittagstisch-Rueckblick auf sieben Tage - Serverseite.

Spec: specs/mittag-verlauf-chart/spec.md

Aus dem Laden: „Bei Mittagstisch waere ein kleiner Chart schoen, in dem die
Bestellungen der letzten 7 Tage dargestellt werden. … Stornierte
Bestellungen sollen nicht beruecksichtigt werden." Dazu: „Wenn moeglich,
sollten als Tooltip die Anzahl der einzelnen Gerichte angezeigt werden
koennen."

Der vorhandene mode=stats taugte dafuer nicht: Er kennt nur
Online-Bestellungen und laedt die Gerichtnamen gar nicht. Im Laden wird
aber rund die Haelfte telefonisch bestellt - ein Chart ohne diese
Bestellungen zeigte die halbe Wahrheit. Genau das pruefen TC-VC-S2 und
TC-VC-S3.

Ausfuehren:  python tests/test_mittagstisch_verlauf.py
"""
import importlib.util
import json
import os
import sys
from datetime import timedelta

HIER = os.path.dirname(os.path.abspath(__file__))
API = os.path.abspath(os.path.join(HIER, "..", "api"))
sys.path.insert(0, API)

import requests      # noqa: E402

os.environ.setdefault("DV_TENANT_ID", "00000000-0000-0000-0000-000000000000")
os.environ.setdefault("DV_CLIENT_ID", "00000000-0000-0000-0000-000000000001")
os.environ["DV_CLIENT_SECRET"] = "test"
os.environ.setdefault("DV_URL", "https://test.crm4.dynamics.com")


def pruefe(name, bedingung, hinweis=""):
    if not bedingung:
        raise AssertionError(f"{name}{(' - ' + hinweis) if hinweis else ''}")
    print(f"  ok  {name}")


class Antwort:
    def __init__(self, status=200, daten=None):
        self.status_code = status
        self._daten = daten if daten is not None else {}
        self.text = json.dumps(self._daten)

    def json(self):
        return self._daten


class Anfrage:
    def __init__(self, method="GET", route=None, params=None, body=None):
        self.method = method
        self.route_params = route or {}
        self.params = params or {}
        self.headers = {}
        self._body = body if body is not None else {}

    def get_json(self):
        return self._body


def lade():
    spec = importlib.util.spec_from_file_location(
        "lunch_verlauf_test", os.path.join(API, "lunch-order", "__init__.py"))
    modul = importlib.util.module_from_spec(spec)
    sys.modules["lunch_verlauf_test"] = modul
    spec.loader.exec_module(modul)
    modul.get_token = lambda: "test-token"
    return modul


def rumpf(antwort):
    roh = antwort.get_body()
    if isinstance(roh, bytes):
        roh = roh.decode("utf-8")
    try:
        return json.loads(roh)
    except Exception:
        return {}


class Speicher:
    """Ersatz-Dataverse. Merkt sich die gestellte Abfrage."""

    def __init__(self, saetze=None, status=200):
        self.saetze = list(saetze or [])
        self.status = status
        self.abfragen = []

    def get(self, url, **kw):
        self.abfragen.append(url)
        if self.status != 200:
            return Antwort(self.status, {})
        return Antwort(200, {"value": self.saetze})


def satz(datum, gericht, menge=1, status=0, quelle=1):
    return {
        "dl_datum": datum + "T00:00:00Z",
        "dl_gericht": gericht,
        "dl_menge": menge,
        "dl_status": status,
        "dl_quelle": quelle,
    }


def main():
    lunch = lade()
    heute = lunch.heute_lokal()
    gestern = (heute - timedelta(days=1)).isoformat()
    heute_s = heute.isoformat()

    def lauf(sp, params=None):
        requests.get = sp.get
        p = {"mode": "tagesverlauf"}
        p.update(params or {})
        return lunch.main(Anfrage(method="GET", params=p))

    print("Mittagstisch-Rueckblick")

    # ── TC-VC-S1: sieben Tage, auch die leeren ────────────────────────
    sp = Speicher([satz(heute_s, "Hendl", 2)])
    antwort = lauf(sp)
    daten = rumpf(antwort)
    pruefe("TC-VC-S1  Antwort ist erfolgreich", antwort.status_code == 200,
           f"war {antwort.status_code}: {daten}")
    reihe = daten.get("verlauf", [])
    pruefe("TC-VC-S1  genau sieben Tage", len(reihe) == 7,
           f"waren {len(reihe)}")
    pruefe("TC-VC-S1  der letzte Tag ist heute",
           reihe and reihe[-1]["datum"] == heute_s,
           f"war {reihe[-1]['datum'] if reihe else '-'}")
    pruefe("TC-VC-S1  leere Tage bleiben in der Reihe",
           all("portionen" in t for t in reihe) and reihe[0]["portionen"] == 0,
           f"erster Tag: {reihe[0] if reihe else '-'}")

    # ── TC-VC-S2: stornierte zaehlen nicht mit ────────────────────────
    # Der ausdrueckliche Wunsch. Eine stornierte Bestellung wurde nie
    # gekocht; sie im Rueckblick mitzuzaehlen waere schlicht falsch.
    sp = Speicher([
        satz(heute_s, "Hendl", 5, status=0),
        satz(heute_s, "Hendl", 3, status=lunch.STATUS_STORNIERT),
        satz(heute_s, "Fisch", 2, status=lunch.STATUS_ABGEHOLT),
    ])
    heute_fach = rumpf(lauf(sp))["verlauf"][-1]
    pruefe("TC-VC-S2  stornierte Portionen fehlen",
           heute_fach["portionen"] == 7,
           f"waren {heute_fach['portionen']} statt 7")
    pruefe("TC-VC-S2  und auch nicht in der Zahl der Bestellungen",
           heute_fach["bestellungen"] == 2,
           f"waren {heute_fach['bestellungen']} statt 2")
    namen = [g["name"] for g in heute_fach["gerichte"]]
    pruefe("TC-VC-S2  storniertes Gericht faellt nicht heraus, wenn noch "
           "andere Bestellungen dafuer da sind", namen == ["Hendl", "Fisch"],
           f"Gerichte: {namen}")

    # ── TC-VC-S3: telefonische Bestellungen zaehlen mit ───────────────
    # Genau hier scheiterte mode=stats: Er filtert auf dl_quelle eq 0.
    sp = Speicher([
        satz(heute_s, "Hendl", 4, quelle=lunch.QUELLE_ONLINE),
        satz(heute_s, "Hendl", 6, quelle=lunch.QUELLE_TELEFON),
        satz(heute_s, "Hendl", 1, quelle=lunch.QUELLE_PERSONAL),
    ])
    heute_fach = rumpf(lauf(sp))["verlauf"][-1]
    pruefe("TC-VC-S3  alle Wege sind dabei", heute_fach["portionen"] == 11,
           f"waren {heute_fach['portionen']} statt 11")
    pruefe("TC-VC-S3  online getrennt ausgewiesen", heute_fach["online"] == 4,
           f"waren {heute_fach['online']}")
    pruefe("TC-VC-S3  telefonisch und Tresen zusammen",
           heute_fach["vor_ort"] == 7, f"waren {heute_fach['vor_ort']}")

    # ── TC-VC-S4: Gerichte je Tag, nach Menge sortiert ────────────────
    # Das ist die Grundlage des Tooltips.
    sp = Speicher([
        satz(heute_s, "Fisch", 3),
        satz(heute_s, "Hendl", 7),
        satz(heute_s, "Hendl", 4),
        satz(gestern, "Braten", 2),
    ])
    reihe = rumpf(lauf(sp))["verlauf"]
    heute_fach = reihe[-1]
    pruefe("TC-VC-S4  gleiche Gerichte werden zusammengezaehlt",
           heute_fach["gerichte"][0] == {"name": "Hendl", "portionen": 11},
           f"erstes Gericht: {heute_fach['gerichte'][0]}")
    pruefe("TC-VC-S4  das haeufigste steht vorne",
           [g["name"] for g in heute_fach["gerichte"]] == ["Hendl", "Fisch"],
           f"Reihenfolge: {[g['name'] for g in heute_fach['gerichte']]}")
    pruefe("TC-VC-S4  der Vortag bleibt getrennt",
           reihe[-2]["gerichte"] == [{"name": "Braten", "portionen": 2}],
           f"Vortag: {reihe[-2]['gerichte']}")

    # ── TC-VC-S5: gefiltert wird ueber den Mittagstisch-Tag ───────────
    # Nicht ueber das Anlagedatum: Eine am Montag fuer Freitag aufgenommene
    # Bestellung gehoert auf den Freitag.
    sp = Speicher([satz(heute_s, "Hendl")])
    lauf(sp)
    pruefe("TC-VC-S5  Abfrage filtert auf dl_datum",
           sp.abfragen and "dl_datum ge" in sp.abfragen[0],
           f"Abfrage: {sp.abfragen[0][:160] if sp.abfragen else '-'}")
    pruefe("TC-VC-S5  und nicht auf createdon",
           "createdon" not in sp.abfragen[0])
    pruefe("TC-VC-S5  der Gerichtname wird geladen",
           "dl_gericht" in sp.abfragen[0])

    # ── TC-VC-S6: Zeitraum ist einstellbar und gedeckelt ──────────────
    sp = Speicher([])
    pruefe("TC-VC-S6  14 Tage liefern 14 Eintraege",
           len(rumpf(lauf(sp, {"days": "14"}))["verlauf"]) == 14)
    sp = Speicher([])
    pruefe("TC-VC-S6  unsinnige Angabe faellt auf 7 zurueck",
           len(rumpf(lauf(sp, {"days": "abc"}))["verlauf"]) == 7)
    sp = Speicher([])
    pruefe("TC-VC-S6  masslose Angabe wird gedeckelt",
           len(rumpf(lauf(sp, {"days": "9999"}))["verlauf"]) == 31)

    # ── TC-VC-S7: Streikt Dataverse, kein stiller Nullverlauf ─────────
    # Ein leeres Diagramm sieht aus wie „nichts bestellt" - das waere die
    # gefaehrlichste Antwort von allen.
    sp = Speicher([], status=500)
    antwort = lauf(sp)
    pruefe("TC-VC-S7  Fehler statt leerer Reihe", antwort.status_code == 502,
           f"war {antwort.status_code}: {rumpf(antwort)}")
    pruefe("TC-VC-S7  und kein success:true",
           rumpf(antwort).get("success") is False)

    # ── TC-VC-S8: Bestellung ohne Gericht verschwindet nicht ──────────
    sp = Speicher([satz(heute_s, "", 2), satz(heute_s, None, 1)])
    heute_fach = rumpf(lauf(sp))["verlauf"][-1]
    pruefe("TC-VC-S8  die Portionen bleiben gezaehlt",
           heute_fach["portionen"] == 3, f"waren {heute_fach['portionen']}")
    pruefe("TC-VC-S8  unter einem lesbaren Namen",
           heute_fach["gerichte"] == [{"name": "ohne Gericht", "portionen": 3}],
           f"Gerichte: {heute_fach['gerichte']}")

    print("\nAlle Pruefungen bestanden.")


if __name__ == "__main__":
    main()
