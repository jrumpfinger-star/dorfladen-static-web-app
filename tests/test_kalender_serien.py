"""Unit-Tests für api/kalender/serien.py (Serien-Expansion, F5).

Läuft ohne Azure-Deps (serien.py ist rein).
Ausführen:  python tests/test_kalender_serien.py
        oder python -m pytest tests/test_kalender_serien.py
"""
import os
import sys
from datetime import date

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api", "kalender"))
import serien  # noqa: E402


def iso(*ds):
    return [d.isoformat() for d in ds]


def occ(start, rec, von, bis):
    return [d.isoformat() for d in serien.occurrences(start, rec, von, bis)]


def test_einzeltermin_im_bereich():
    assert occ("2026-07-21", "", "2026-07-20", "2026-07-26") == ["2026-07-21"]
    assert occ("2026-07-19", "", "2026-07-20", "2026-07-26") == []


def test_daily():
    # TC-F5-02-Basis: tägliche Serie liefert jeden Tag im Bereich
    assert occ("2026-07-20", "daily", "2026-07-20", "2026-07-23") == [
        "2026-07-20", "2026-07-21", "2026-07-22", "2026-07-23",
    ]
    # Start vor dem Bereich → beginnt bei von
    assert occ("2026-07-01", "daily", "2026-07-20", "2026-07-21") == [
        "2026-07-20", "2026-07-21",
    ]


def test_weekly():
    # TC-F5-01: wöchentlich erscheint an jedem passenden Wochentag (Di)
    assert occ("2026-07-21", "weekly", "2026-07-21", "2026-08-04") == [
        "2026-07-21", "2026-07-28", "2026-08-04",
    ]
    # Start vor dem Bereich → erstes Vorkommen an/nach von, ausgerichtet auf Serie
    assert occ("2026-07-07", "weekly", "2026-07-20", "2026-07-31") == [
        "2026-07-21", "2026-07-28",
    ]


def test_biweekly_ueberspringt_zwischenwoche():
    # TC-F5-03: 14-tägig → KW A und KW A+2, nicht A+1
    assert occ("2026-07-21", "biweekly", "2026-07-21", "2026-08-05") == [
        "2026-07-21", "2026-08-04",
    ]


def test_monthly_gleicher_tag():
    assert occ("2026-01-15", "monthly", "2026-01-01", "2026-04-30") == [
        "2026-01-15", "2026-02-15", "2026-03-15", "2026-04-15",
    ]


def test_monthly_klemmt_auf_monatsende():
    # 31. → Februar hat keinen 31., wird auf 28. geklemmt (2026 kein Schaltjahr)
    assert occ("2026-01-31", "monthly", "2026-01-01", "2026-03-31") == [
        "2026-01-31", "2026-02-28", "2026-03-31",
    ]


def test_expand_entry_overrides():
    entry = {"id": "S1", "datum": "2026-07-20", "wiederholung": "daily",
             "titel": "Kasse abrechnen", "status": "offen"}
    overrides = {
        "2026-07-21": {"status": "erledigt", "erledigt_am": "2026-07-21T18:00"},
        "2026-07-22": {"status": "geloescht"},
    }
    items = serien.expand_entry(entry, "2026-07-20", "2026-07-23", overrides)
    dates = [i["datum"] for i in items]
    # 22. ist gelöscht → ausgeblendet
    assert dates == ["2026-07-20", "2026-07-21", "2026-07-23"]
    by_date = {i["datum"]: i for i in items}
    assert by_date["2026-07-20"]["status"] == "offen"
    assert by_date["2026-07-21"]["status"] == "erledigt"   # nur dieses Vorkommen
    assert by_date["2026-07-21"]["_ist_vorkommen"] is True
    assert by_date["2026-07-21"]["_serien_id"] == "S1"


def _run():
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    passed = 0
    for fn in fns:
        fn()
        passed += 1
        print(f"  ok  {fn.__name__}")
    print(f"\n{passed}/{len(fns)} Tests bestanden.")


if __name__ == "__main__":
    _run()
