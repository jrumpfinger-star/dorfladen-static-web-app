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


def test_weekdays_di_mi_fr():
    # Bestellung bei Bäcker: Di(2), Mi(3), Fr(5) in der Woche 20.–26.07.2026
    # Mo=20, Di=21, Mi=22, Do=23, Fr=24, Sa=25, So=26
    got = [d.isoformat() for d in serien.occurrences("2026-07-20", "weekdays", "2026-07-20", "2026-07-26", "235")]
    assert got == ["2026-07-21", "2026-07-22", "2026-07-24"]


def test_weekdays_ueber_zwei_wochen_und_ohne_auswahl():
    got = [d.isoformat() for d in serien.occurrences("2026-07-20", "weekdays", "2026-07-20", "2026-08-02", "235")]
    assert got == ["2026-07-21", "2026-07-22", "2026-07-24",
                   "2026-07-28", "2026-07-29", "2026-07-31"]
    # keine Wochentage gewählt → keine Vorkommen
    assert serien.occurrences("2026-07-20", "weekdays", "2026-07-20", "2026-07-26", "") == []


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


def test_expand_entry_serie_ende_behaelt_historie():
    # Serie ab 2026-07-22 beendet: frühere Vorkommen (auch bearbeitete) bleiben,
    # das Ende-Datum selbst und alles danach entfällt.
    entry = {"id": "S1", "datum": "2026-07-20", "wiederholung": "daily",
             "titel": "Kasse abrechnen", "status": "offen"}
    overrides = {
        "2026-07-21": {"status": "erledigt", "erledigt_am": "2026-07-21T18:00"},
        "2026-07-22": {"status": "serie_ende"},
    }
    items = serien.expand_entry(entry, "2026-07-20", "2026-07-25", overrides)
    dates = [i["datum"] for i in items]
    # 22. (Ende) und später entfallen; 20./21. (bearbeitet) bleiben sichtbar
    assert dates == ["2026-07-20", "2026-07-21"]
    by_date = {i["datum"]: i for i in items}
    assert by_date["2026-07-21"]["status"] == "erledigt"


# ══════════════════════════════════════════════════════════════════════
#  Serienende (Spec specs/kalender-serienende)
#
#  Aus dem Laden: "Bei der Terminserie sollte es auch moeglich sein
#  anzugeben, wie lange die Serie laufen soll."
#
#  Das Ende reist im vorhandenen Textfeld mit, weil die Dataverse-Tabelle
#  feste Spalten hat: "weekly~2026-12-31". Trennzeichen ist "~" und nicht
#  ":", denn letzteres trennt schon weekdays von den Ziffern.
# ══════════════════════════════════════════════════════════════════════

def test_serienende_zerlegen():
    # TC-E01: ohne Ende bleibt alles wie bisher
    assert serien.zerlege("weekly") == ("weekly", "", "")
    # TC-E02: mit Ende
    assert serien.zerlege("weekly~2026-12-31") == ("weekly", "", "2026-12-31")
    # TC-E03: Wochentage UND Ende - beide Trennzeichen im selben Text
    assert serien.zerlege("weekdays:135~2026-12-31") == ("weekdays", "135", "2026-12-31")
    assert serien.zerlege("weekdays:135") == ("weekdays", "135", "")
    # Leer bleibt leer
    assert serien.zerlege("") == ("", "", "")
    assert serien.zerlege(None) == ("", "", "")


def test_serienende_hin_und_zurueck():
    # TC-E04: Was zusammengebaut wird, muss sich wieder zerlegen lassen.
    faelle = [
        ("weekly", "", ""),
        ("weekly", "", "2026-12-31"),
        ("weekdays", "135", ""),
        ("weekdays", "135", "2026-12-31"),
        ("monthly", "", "2027-01-01"),
    ]
    for rec, wd, ende in faelle:
        text = serien.fuege_zusammen(rec, wd, ende)
        assert serien.zerlege(text) == (rec, wd, ende), text
    # Ein Einzeltermin hat kein Ende - der Text bleibt leer.
    assert serien.fuege_zusammen("", "", "2026-12-31") == ""


def test_serienende_begrenzt_die_expansion():
    # TC-E05: woechentlich ab 20.07., Ende 03.08. - der 10.08. faellt weg.
    entry = {"id": "1", "datum": "2026-07-20", "wiederholung": "weekly",
             "serie_bis": "2026-08-03"}
    dates = [i["datum"] for i in
             serien.expand_entry(entry, "2026-07-20", "2026-08-31")]
    assert dates == ["2026-07-20", "2026-07-27", "2026-08-03"], dates

    # TC-E06: dieselbe Serie OHNE Ende laeuft weiter.
    ohne = dict(entry)
    ohne.pop("serie_bis")
    dates = [i["datum"] for i in
             serien.expand_entry(ohne, "2026-07-20", "2026-08-31")]
    assert dates == ["2026-07-20", "2026-07-27", "2026-08-03",
                     "2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31"], dates


def test_serienende_am_starttag():
    # TC-E07: Ende am Starttag - genau ein Vorkommen, nicht null.
    entry = {"id": "1", "datum": "2026-07-20", "wiederholung": "daily",
             "serie_bis": "2026-07-20"}
    dates = [i["datum"] for i in
             serien.expand_entry(entry, "2026-07-01", "2026-07-31")]
    assert dates == ["2026-07-20"], dates


def test_serienende_unlesbar_faellt_auf_endlos_zurueck():
    # TC-E08: Ein kaputter Wert darf den Kalender nicht leerraeumen -
    # lieber zu viele Termine als gar keine.
    entry = {"id": "1", "datum": "2026-07-20", "wiederholung": "weekly",
             "serie_bis": "kaputt"}
    dates = [i["datum"] for i in
             serien.expand_entry(entry, "2026-07-20", "2026-08-03")]
    assert dates == ["2026-07-20", "2026-07-27", "2026-08-03"], dates


def test_serienende_und_override_das_fruehere_gewinnt():
    # TC-E09: Beendet jemand die Serie zusaetzlich von Hand, gilt das
    # fruehere der beiden Enden.
    entry = {"id": "1", "datum": "2026-07-20", "wiederholung": "weekly",
             "serie_bis": "2026-08-31"}
    overrides = {"2026-08-03": {"status": "serie_ende"}}
    dates = [i["datum"] for i in
             serien.expand_entry(entry, "2026-07-20", "2026-08-31", overrides)]
    assert dates == ["2026-07-20", "2026-07-27"], dates

    # Andersherum: das gespeicherte Ende ist frueher als der Override.
    entry2 = {"id": "1", "datum": "2026-07-20", "wiederholung": "weekly",
              "serie_bis": "2026-07-27"}
    overrides2 = {"2026-08-17": {"status": "serie_ende"}}
    dates2 = [i["datum"] for i in
              serien.expand_entry(entry2, "2026-07-20", "2026-08-31", overrides2)]
    assert dates2 == ["2026-07-20", "2026-07-27"], dates2

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
