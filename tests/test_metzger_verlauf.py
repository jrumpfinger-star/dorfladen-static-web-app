"""Metzger-Verlauf: Die Positionen reisen mit (Spec specs/listen-harmonie).

Aus dem Laden: „Gleiches gilt bei Verlauf. Alles schaut anders aus."

Der Metzger war der Einzige, dessen Verlauf sich NICHT aufklappen liess:
Man sah nur Zahlen — „14 Positionen · 23,4 kg" — und musste das Formular
oeffnen, um zu erfahren, WAS bestellt wurde. Baecker und Getraenke konnten
das laengst.

Dass die Anzeige aufklappt, nuetzt nichts, wenn der Server die Positionen
gar nicht mitschickt. Genau das prueft dieser Waechter — am ECHTEN
_verlauf(), mit einem Ersatzspeicher darunter.

Ausfuehren:  python tests/test_metzger_verlauf.py
"""
import importlib.util
import json
import os
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
API = os.path.abspath(os.path.join(HIER, "..", "api"))
sys.path.insert(0, API)

os.environ.setdefault("DV_TENANT_ID", "00000000-0000-0000-0000-000000000000")
os.environ.setdefault("DV_CLIENT_ID", "00000000-0000-0000-0000-000000000001")
os.environ["DV_CLIENT_SECRET"] = "test"
os.environ.setdefault("DV_URL", "https://test.crm4.dynamics.com")


def pruefe(name, bedingung, hinweis=""):
    if not bedingung:
        raise AssertionError(f"{name}{(' - ' + hinweis) if hinweis else ''}")
    print(f"  ok  {name}")


def lade():
    spec = importlib.util.spec_from_file_location(
        "metzger_order_verlauf",
        os.path.join(API, "metzger-order", "__init__.py"))
    modul = importlib.util.module_from_spec(spec)
    sys.modules["metzger_order_verlauf"] = modul
    spec.loader.exec_module(modul)
    return modul


MOD = lade()


def bestellungen():
    """Zwei gesendete Bestellungen und ein Entwurf."""
    return [
        {
            "datum": "2026-09-25", "status": MOD.store.STATUS_GESENDET,
            "dokument": "x.pdf",
            "protokoll": [{"zeit": "2026-09-24T07:50:00", "was": "gesendet",
                           "wer": "Kiosk"}],
            "positionen": [
                # Der Metzger rechnet in PORTIONSBLÖCKEN, nicht in einer
                # Menge: „2 × 500 g, vakuumiert". Der Block heißt `menge`,
                # die Anzahl `anzahl`.
                {"name": "Leberkäse", "nummer": "204",
                 "portionen": [{"anzahl": 2, "menge": 500, "einheit": "g",
                                "vakuum": True}]},
                {"name": "Wiener Würstchen", "nummer": "211",
                 "portionen": [{"anzahl": 3, "menge": 1, "einheit": "kg",
                                "vakuum": False}]},
                # Ohne Portionsblock ist nichts bestellt.
                {"name": "Schinkenwurst", "nummer": "220", "portionen": []},
            ],
        },
        {
            "datum": "2026-09-23", "status": MOD.store.STATUS_KORRIGIERT,
            "protokoll": [
                {"zeit": "2026-09-22T09:00:00", "was": "gesendet", "wer": "Anna"},
                {"zeit": "2026-09-22T15:12:00", "was": "korrigiert", "wer": "Anna"},
            ],
            "positionen": [
                {"name": "Hackfleisch", "nummer": "301",
                 "portionen": [{"anzahl": 5, "menge": 1, "einheit": "kg",
                                "vakuum": False}]},
            ],
        },
        {
            # Ein Entwurf hat im Verlauf nichts verloren.
            "datum": "2026-09-28", "status": 0, "protokoll": [],
            "positionen": [{"name": "Noch offen", "nummer": "999",
                            "portionen": [{"anzahl": 7, "menge": 1,
                                           "einheit": "kg", "vakuum": False}]}],
        },
    ]


def main():
    print("Metzger-Verlauf")

    MOD.store.bestellungen = lambda url, hdrs: bestellungen()
    verlauf = MOD._verlauf("https://test", {})

    # ── TC-MV-01: Nur Gesendetes steht im Verlauf ─────────────────────
    pruefe("TC-MV-01  nur gesendete Bestellungen", len(verlauf) == 2,
           f"waren {len(verlauf)}")
    pruefe("TC-MV-01  der Entwurf fehlt",
           all(v["datum"] != "2026-09-28" for v in verlauf))

    erste = verlauf[0]

    # ── TC-MV-02: Die Positionen reisen mit ───────────────────────────
    # Das ist der Kern: Ohne sie bliebe das Aufklappen im Kiosk leer.
    pruefe("TC-MV-02  der Verlauf traegt Positionen", "positionen" in erste,
           f"Schluessel: {sorted(erste)}")
    namen = [p["name"] for p in erste["positionen"]]
    pruefe("TC-MV-02  und zwar die bestellten",
           namen == ["Leberkäse", "Wiener Würstchen"], f"Namen: {namen}")

    # ── TC-MV-03: Nullpositionen bleiben draussen ─────────────────────
    pruefe("TC-MV-03  eine Nullposition steht nicht drin",
           "Schinkenwurst" not in namen, f"Namen: {namen}")

    # ── TC-MV-04: Menge, Vakuum und Nummer sind dabei ─────────────────
    lk = erste["positionen"][0]
    # Die Menge kommt aus `position_text()` — derselben Funktion, die
    # Formular und Mail benutzen. So kann der Verlauf nichts anderes
    # zeigen als das, was der Metzger bekommen hat.
    pruefe("TC-MV-04  die Menge steht als lesbarer Text dabei",
           "2" in str(lk["menge"]) and "500" in str(lk["menge"]), f"{lk}")
    pruefe("TC-MV-04  vakuumiert ist vermerkt", lk["vakuum"] is True, f"{lk}")
    pruefe("TC-MV-04  die Nummer steht dabei", str(lk["nummer"]) == "204", f"{lk}")

    # ── TC-MV-05: Die Summen bleiben unveraendert ─────────────────────
    pruefe("TC-MV-05  die Summen sind weiterhin da", "summen" in erste)
    pruefe("TC-MV-05  und zaehlen die Positionen",
           erste["summen"].get("positionen") == 2,
           f"Summen: {erste['summen']}")

    # ── TC-MV-06: Das Protokoll bleibt vollstaendig ───────────────────
    # Der Kiosk liest daraus den JUENGSTEN Eintrag - beim Metzger ist das
    # der letzte, weil hier angehaengt wird.
    zweite = verlauf[1]
    pruefe("TC-MV-06  beide Protokolleintraege sind da",
           len(zweite["protokoll"]) == 2, f"{zweite['protokoll']}")
    pruefe("TC-MV-06  der letzte ist die Korrektur",
           zweite["protokoll"][-1]["was"] == "korrigiert")

    # ── TC-MV-07: Alles ist als JSON verschickbar ─────────────────────
    try:
        json.dumps(verlauf, ensure_ascii=False)
    except Exception as e:
        raise AssertionError(f"TC-MV-07  Verlauf ist nicht serialisierbar: {e}")
    pruefe("TC-MV-07  der Verlauf laesst sich verschicken", True)

    print("\nAlle Pruefungen bestanden.")


if __name__ == "__main__":
    main()
