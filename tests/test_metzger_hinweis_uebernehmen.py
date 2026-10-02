"""Hinweise wandern mit in die Vorbelegung der Folgewoche (Metzger).

Spec: specs/hinweis-uebernehmen/spec.md

Aus dem Laden: "Die Hinweise werden aber nicht uebernommen vom selben Tag
der Woche vorher."

Gemessen am 02.10. an den echten Daten: Montag 28.09. -> 05.10. verlor
6 von 6 Hinweisen, Freitag 02.10. -> 09.10. 2 von 2. Die Ursache war eine
einzige Zeile in metzger_store.entwurf_positionen():
    p["hinweis"] = ""   # Hinweise gelten fuer den einen Tag
Im Laden sind es aber Sortenangaben ("Kraeuter", "Kaese", "Klein") - ohne
sie bestellt die Vorbelegung "Salami mit Zwiebelrand/Kaeserand", ohne zu
sagen, welche.

Geprueft wird am ECHTEN _entwurf() mit Ersatzspeicher - also genau der
Weg, den der Kiosk beim Oeffnen eines neuen Liefertags geht.

Ausfuehren:  python tests/test_metzger_hinweis_uebernehmen.py
"""
import importlib.util
import os
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
API = os.path.abspath(os.path.join(HIER, "..", "api"))
sys.path.insert(0, API)

os.environ.setdefault("DV_TENANT_ID", "00000000-0000-0000-0000-000000000000")
os.environ.setdefault("DV_CLIENT_ID", "00000000-0000-0000-0000-000000000001")
os.environ["DV_CLIENT_SECRET"] = "test"
os.environ.setdefault("DV_URL", "https://test.crm4.dynamics.com")
try:
    sys.stdout.reconfigure(errors="replace")
except Exception:
    pass

_fehler = []


def pruefe(name, bedingung, hinweis=""):
    print(("  ok  " if bedingung else "  FEHLER  ") + name
          + ("" if bedingung or not hinweis else f"  -> {hinweis}"))
    if not bedingung:
        _fehler.append(name)


spec = importlib.util.spec_from_file_location(
    "metzger_order_hinweis", os.path.join(API, "metzger-order", "__init__.py"))
MOD = importlib.util.module_from_spec(spec)
sys.modules["metzger_order_hinweis"] = MOD
spec.loader.exec_module(MOD)
S = MOD.store


def blk(anzahl=1, menge=0.5, einheit="St"):
    return [{"anzahl": anzahl, "menge": menge, "einheit": einheit, "vakuum": False}]


# Der letzte Freitag, nachgebildet nach den echten Daten vom 02.10.
VORLAGE = {
    "datum": "2026-10-02", "status": S.STATUS_GESENDET,
    "positionen": [
        {"nummer": 532, "name": "Gewürzlende", "portionen": blk(), "hinweis": "Kräuter"},
        {"nummer": None, "name": "Salami mit Zwiebelrand/Käserand",
         "portionen": blk(), "hinweis": "Käse"},
        {"nummer": 564, "name": "Pfeffersalami", "portionen": blk(), "hinweis": ""},
        # Nur ein Hinweis, keine Menge: "nur wenn da" gilt als bestellt.
        {"nummer": 700, "name": "Bierschinken", "portionen": [], "hinweis": "nur wenn da"},
        # Zusatzartikel gelten nur fuer den einen Tag (Spec F8) - bleiben draussen.
        {"nummer": None, "name": "Spanferkel", "portionen": blk(1, 1, "St"),
         "hinweis": "für Geburtstag", "zusatz": True},
    ],
}


def entwurf_fuer(datum, alle):
    S.load_order = lambda url, hdrs, d: (None, None)   # noch nichts gespeichert
    S.bestellungen = lambda url, hdrs: alle
    _, order, quelle, _ = MOD._entwurf("u", {}, {}, datum)
    return order, quelle


def nach_name(order):
    return {p["name"]: p for p in order["positionen"]}


def test_hu01_hinweise_kommen_mit():
    order, quelle = entwurf_fuer("2026-10-09", [VORLAGE])
    pos = nach_name(order)
    pruefe("TC-HU-01 Vorlage ist der letzte Freitag", quelle == "2026-10-02", str(quelle))
    pruefe("TC-HU-01 'Kräuter' bei Gewürzlende übernommen",
           pos.get("Gewürzlende", {}).get("hinweis") == "Kräuter",
           repr(pos.get("Gewürzlende", {}).get("hinweis")))
    pruefe("TC-HU-01 'Käse' bei der Salami ohne Nummer übernommen",
           pos.get("Salami mit Zwiebelrand/Käserand", {}).get("hinweis") == "Käse",
           repr(pos.get("Salami mit Zwiebelrand/Käserand", {}).get("hinweis")))
    pruefe("TC-HU-01 Position ohne Hinweis bleibt ohne",
           pos.get("Pfeffersalami", {}).get("hinweis") == "")


def test_hu02_nur_hinweis_wird_vorbelegt():
    order, _ = entwurf_fuer("2026-10-09", [VORLAGE])
    p = nach_name(order).get("Bierschinken")
    pruefe("TC-HU-02 'nur wenn da' (Hinweis ohne Menge) wird vorbelegt",
           p is not None and p.get("hinweis") == "nur wenn da", repr(p))


def test_hu03_zusatz_bleibt_draussen():
    order, _ = entwurf_fuer("2026-10-09", [VORLAGE])
    pruefe("TC-HU-03 Zusatzartikel wird nicht übernommen",
           "Spanferkel" not in nach_name(order))


def test_hu04_mengen_unveraendert():
    order, _ = entwurf_fuer("2026-10-09", [VORLAGE])
    p = nach_name(order).get("Gewürzlende", {})
    pruefe("TC-HU-04 Mengen kommen weiter mit",
           p.get("portionen") and p["portionen"][0]["menge"] == 0.5, repr(p.get("portionen")))


def test_hu05_vorlage_bleibt_unberuehrt():
    """Der Entwurf darf die gesendete Vorlage nicht veraendern."""
    entwurf_fuer("2026-10-09", [VORLAGE])
    pruefe("TC-HU-05 Vorlage behält ihren Hinweis",
           VORLAGE["positionen"][0]["hinweis"] == "Kräuter")


if __name__ == "__main__":
    for name, f in sorted(globals().items()):
        if name.startswith("test_") and callable(f):
            f()
    print()
    if _fehler:
        print(f"{len(_fehler)} Waechter fehlgeschlagen")
        sys.exit(1)
    print("Alle Waechter gruen.")
