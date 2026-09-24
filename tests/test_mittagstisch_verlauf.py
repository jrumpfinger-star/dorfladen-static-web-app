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
import re
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
    """Ersatz-Dataverse. Wertet den OData-Filter WIRKLICH aus.

    Das ist der Kern dieses Waechters, und er ist teuer gelernt: Vorher gab
    dieser Speicher schlicht alle Saetze zurueck, egal was gefragt wurde. Der
    Test war gruen, der Rueckblick im Laden meldete trotzdem „Der Verlauf
    konnte nicht geladen werden" -- der Filter war fehlerhaft, und niemand
    hat es gemerkt.

    Zwei Eigenheiten von Dataverse werden deshalb hier nachgebildet:

    1. `dl_datum` ist ein TEXTFELD. Ein Vergleich ohne Anfuehrungszeichen
       wird abgewiesen (400), nicht etwa still ignoriert.
    2. Verglichen wird als Zeichenkette, nicht als Datum. Deshalb sortiert
       „2026-09-24T00:00:00Z" HINTER „2026-09-24" -- was eine Obergrenze
       `le '2026-09-24'` den letzten Tag kosten wuerde.
    """

    def __init__(self, saetze=None, status=200):
        self.saetze = list(saetze or [])
        self.status = status
        self.abfragen = []

    @staticmethod
    def _bedingungen(url):
        teil = url.split("$filter=", 1)[1].split("&", 1)[0] if "$filter=" in url else ""
        return re.findall(r"dl_datum\s+(ge|gt|le|lt|eq)\s+(\S+)", teil)

    def get(self, url, **kw):
        self.abfragen.append(url)
        if self.status != 200:
            return Antwort(self.status, {})

        treffer = list(self.saetze)
        for op, roh in self._bedingungen(url):
            if not (roh.startswith("'") and roh.endswith("'")):
                # So antwortet Dataverse auf einen unquotierten Vergleich
                # gegen ein Textfeld.
                return Antwort(400, {"error": {
                    "message": f"Invalid comparison for text field: dl_datum {op} {roh}"}})
            wert = roh[1:-1]
            pruef = {
                "ge": lambda d: d >= wert, "gt": lambda d: d > wert,
                "le": lambda d: d <= wert, "lt": lambda d: d < wert,
                "eq": lambda d: d == wert,
            }[op]
            treffer = [s for s in treffer if pruef(s.get("dl_datum") or "")]
        return Antwort(200, {"value": treffer})


def satz(datum, gericht, menge=1, status=0, quelle=1, lang=True):
    """Ein Bestelldatensatz.

    `lang` bildet die ausfuehrliche Schreibweise „…T00:00:00Z" nach, die in
    der Tabelle neben der kurzen „YYYY-MM-DD" steht (Testchronik 2026-06-21).
    """
    return {
        "dl_datum": datum + ("T00:00:00Z" if lang else ""),
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

    # ── TC-VC-S9: der Filter muss Anfuehrungszeichen tragen ───────────
    # Der Ausfall im Laden: „Der Verlauf konnte nicht geladen werden."
    # `dl_datum` ist ein TEXTFELD; ohne Anfuehrungszeichen weist Dataverse
    # den Ausdruck ab. Der Ersatzspeicher oben tut jetzt dasselbe -- deshalb
    # faellt dieser Fall, sobald die Quotes wieder verschwinden.
    # (Testchronik 2026-06-22, T12 mode=my)
    sp = Speicher([satz(heute_s, "Hendl", 2)])
    antwort = lauf(sp)
    pruefe("TC-VC-S9  die Abfrage laeuft ueberhaupt durch",
           antwort.status_code == 200,
           f"war {antwort.status_code} - Abfrage: "
           f"{sp.abfragen[0][:200] if sp.abfragen else '-'}")
    bed = Speicher._bedingungen(sp.abfragen[0])
    pruefe("TC-VC-S9  beide Datumsgrenzen stehen in Anfuehrungszeichen",
           bed and all(w.startswith("'") and w.endswith("'") for _op, w in bed),
           f"Bedingungen: {bed}")
    pruefe("TC-VC-S9  und die Portionen kommen wirklich an",
           rumpf(antwort)["verlauf"][-1]["portionen"] == 2,
           f"heute: {rumpf(antwort)['verlauf'][-1]}")

    # ── TC-VC-S10: der letzte Tag geht in KEINER Schreibweise verloren ─
    # In der Tabelle stehen „2026-09-24" und „2026-09-24T00:00:00Z"
    # nebeneinander. Verglichen wird als Zeichenkette, also sortiert die
    # lange Form HINTER der kurzen. Eine Obergrenze `le '<heute>'` wuerde
    # ausgerechnet den heutigen Tag verschlucken -- den wichtigsten der
    # ganzen Reihe. (Testchronik 2026-06-21, T4)
    sp = Speicher([
        satz(heute_s, "Hendl", 3, lang=True),
        satz(heute_s, "Fisch", 2, lang=False),
    ])
    heute_fach = rumpf(lauf(sp))["verlauf"][-1]
    pruefe("TC-VC-S10  beide Schreibweisen des heutigen Tages zaehlen mit",
           heute_fach["portionen"] == 5,
           f"waren {heute_fach['portionen']} statt 5 - Abfrage: "
           f"{sp.abfragen[0][:200]}")

    # Und der Tag DAVOR der Reihe faellt weiterhin heraus.
    davor = (heute - timedelta(days=7)).isoformat()
    sp = Speicher([satz(davor, "Zu alt", 9), satz(heute_s, "Hendl", 1)])
    reihe = rumpf(lauf(sp))["verlauf"]
    pruefe("TC-VC-S10  aeltere Tage bleiben draussen",
           sum(t["portionen"] for t in reihe) == 1,
           f"Summe: {sum(t['portionen'] for t in reihe)}")

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
