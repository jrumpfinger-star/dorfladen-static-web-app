"""Der heutige Liefertag ist beim Metzger zum Nachsehen offen.

Spec: specs/bestellung-heute-lesen/spec.md

Aus dem Laden, an einem Freitag: "Warum kann die Bestellung von diesem
Freitag nicht angezeigt werden?" Die Kachel trug "gesendet - 46 Pos.",
war aber ausgegraut.

Ursache: Zwei Bedingungen, die zusammen eine Luecke von genau einem Tag
liessen:
  bestellbar  = Liefertag liegt NACH heute
  nur_lesen   = Liefertag liegt VOR heute
Heute ist weder das eine noch das andere - die Kachel war gesperrt,
ausgerechnet an dem Tag, an dem man die Lieferung mit der Bestellung
vergleicht.

Gerprueft wird am ECHTEN _uebersicht(), relativ zum tatsaechlichen
heutigen Datum - der Waechter gilt also an jedem Tag, nicht nur freitags.
Die bestehenden Oberflaechen-Tests konnten das nicht finden: Sie geben
nur_lesen selbst vor, statt es vom Server zu bekommen.

Ausfuehren:  python tests/test_metzger_heute_lesen.py
"""
import importlib.util
import os
import sys
from datetime import timedelta

HIER = os.path.dirname(os.path.abspath(__file__))
API = os.path.abspath(os.path.join(HIER, "..", "api"))
sys.path.insert(0, API)

os.environ.setdefault("DV_TENANT_ID", "00000000-0000-0000-0000-000000000000")
os.environ.setdefault("DV_CLIENT_ID", "00000000-0000-0000-0000-000000000001")
os.environ["DV_CLIENT_SECRET"] = "test"
os.environ.setdefault("DV_URL", "https://test.crm4.dynamics.com")

_fehler = []


def pruefe(name, bedingung, hinweis=""):
    print(("  ok  " if bedingung else "  FEHLER  ") + name
          + ("" if bedingung or not hinweis else f"  -> {hinweis}"))
    if not bedingung:
        _fehler.append(name)


spec = importlib.util.spec_from_file_location(
    "metzger_order_heute", os.path.join(API, "metzger-order", "__init__.py"))
MOD = importlib.util.module_from_spec(spec)
sys.modules["metzger_order_heute"] = MOD
spec.loader.exec_module(MOD)
S = MOD.store

HEUTE = MOD.heute_lokal()
GESTERN = (HEUTE - timedelta(days=1)).isoformat()
H = HEUTE.isoformat()
MORGEN = (HEUTE + timedelta(days=1)).isoformat()
UEBERMORGEN = (HEUTE + timedelta(days=2)).isoformat()


def pos(n):
    return [{"name": f"A{i}", "nummer": str(i),
             "portionen": [{"anzahl": 1, "menge": 1, "einheit": "St", "vakuum": False}]}
            for i in range(n)]


def uebersicht(bestellungen):
    S.bestellungen = lambda url, hdrs: bestellungen
    S.ist_bestelltag = lambda cfg, d: True
    S.naechster_bestelltag = lambda cfg: MORGEN
    tage = MOD._uebersicht("u", {}, {})["tage"]
    # Ein Datum kann vorn (letzte Tage) und hinten (14 Tage) stehen -
    # massgeblich fuer die Kachel ist der Eintrag ab heute.
    return {t["datum"]: t for t in tage}


def test_hl01_heute_gesendet_ist_lesbar():
    t = uebersicht([{"datum": H, "status": S.STATUS_GESENDET, "positionen": pos(46)}])[H]
    pruefe("TC-HL-01 Heute, gesendet: nicht bestellbar", t["bestellbar"] is False)
    pruefe("TC-HL-01 Heute, gesendet: zum Nachsehen offen", t["nur_lesen"] is True,
           f"nur_lesen={t['nur_lesen']} - die Kachel waere gesperrt")
    pruefe("TC-HL-01 Positionen stimmen", t["positionen"] == 46, str(t["positionen"]))


def test_hl02_heute_korrigiert_ist_lesbar():
    t = uebersicht([{"datum": H, "status": S.STATUS_KORRIGIERT, "positionen": pos(3)}])[H]
    pruefe("TC-HL-02 Heute, korrigiert: zum Nachsehen offen", t["nur_lesen"] is True)


def test_hl03_heute_ohne_bestellung_bleibt_zu():
    """Ohne gesendete Bestellung gibt es nichts zu sehen - die Kachel
    bleibt gesperrt. Sonst oeffnete sich ein leeres Formular, in dem
    man nichts tun kann."""
    leer = uebersicht([])[H]
    pruefe("TC-HL-03 Heute ohne Bestellung: nicht lesbar", leer["nur_lesen"] is False)
    entwurf = uebersicht([{"datum": H, "status": S.STATUS_ENTWURF, "positionen": pos(2)}])[H]
    pruefe("TC-HL-03 Heute nur Entwurf (nie gesendet): nicht lesbar",
           entwurf["nur_lesen"] is False)


def test_hl04_zukunft_bleibt_bearbeitbar():
    """Ein gesendeter KUENFTIGER Tag ist korrigierbar - er darf nicht
    versehentlich auf "nur lesen" fallen."""
    t = uebersicht([{"datum": UEBERMORGEN, "status": S.STATUS_GESENDET,
                     "positionen": pos(5)}])[UEBERMORGEN]
    pruefe("TC-HL-04 Kuenftig gesendet: bestellbar", t["bestellbar"] is True)
    pruefe("TC-HL-04 Kuenftig gesendet: NICHT nur lesen", t["nur_lesen"] is False)


def test_hl05_gestern_wie_bisher():
    tage = uebersicht([{"datum": GESTERN, "status": S.STATUS_GESENDET, "positionen": pos(4)}])
    pruefe("TC-HL-05 Gestern gesendet: weiterhin lesbar",
           GESTERN in tage and tage[GESTERN]["nur_lesen"] is True)


def test_hl06_einzelabruf_stimmt_ueberein():
    """Die Kachel ist das eine - beim Anklicken fragt der Kiosk den Tag
    einzeln ab. Liefert DER nur_lesen=False, oeffnet sich ein Formular,
    das bearbeitbar aussieht, aber nicht gesendet werden kann."""
    pruefe("TC-HL-06 _nur_lesen(heute, gesendet)", MOD._nur_lesen(H, S.STATUS_GESENDET) is True)
    pruefe("TC-HL-06 _nur_lesen(heute, Entwurf)", MOD._nur_lesen(H, S.STATUS_ENTWURF) is False)
    pruefe("TC-HL-06 _nur_lesen(morgen, gesendet)", MOD._nur_lesen(MORGEN, S.STATUS_GESENDET) is False)
    quelle = open(os.path.join(API, "metzger-order", "__init__.py"), encoding="utf-8").read()
    pruefe("TC-HL-06 Einzelabruf nutzt dieselbe Regel",
           '"nur_lesen": _nur_lesen(datum, order.get("status"))' in quelle)


if __name__ == "__main__":
    print(f"(heute = {H})")
    for name, f in sorted(globals().items()):
        if name.startswith("test_") and callable(f):
            f()
    print()
    if _fehler:
        print(f"{len(_fehler)} Waechter fehlgeschlagen")
        sys.exit(1)
    print("Alle Waechter gruen.")
