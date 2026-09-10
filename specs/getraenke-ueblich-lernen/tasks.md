# Getränke „üblich" fortschreiben — Tasks

**Status:** Umgesetzt · **Last updated:** 2026-09-10

## T1 — Ableitung im Store  ✅ erledigt

`statistik_aktualisieren(artikel, alle_bestellungen)` in
`api/getraenke-order/getraenke_store.py`: je Artikel `bestellungen` (Zahl der
Termine) und `ueblich` (kaufmännisch gerundeter Median der jüngsten `K = 8`
Mengen) aus der Historie ableiten; Zusatzpositionen ausschließen.

- Deckt: F2, F4, F6
- Abnahme: TC-F2-01, TC-F2-02, TC-F2-03, TC-F4-01, TC-F6-01

## T2 — Fortschreibung beim Senden  ✅ erledigt

In `_senden` (`api/getraenke-order/__init__.py`) nach `save_order` den Katalog
laden, `statistik_aktualisieren` mit der aktuellen Historie aufrufen und
`save_artikel` speichern — fehlertolerant (`try/except`). Läuft für Versand und
Korrektur; bei Fehlversand bleibt der Katalog unberührt.

- Deckt: F1, F3, F5, F7
- Abnahme: TC-F1-01, TC-F1-02, TC-F3-01, TC-F5-01, TC-F7-01

## T3 — Tests  ✅ erledigt

`tools/getraenke_ueblich_test.py`: reine Ableitung + `_senden`-Verdrahtung mit
In-Memory-Ablage und gestubbtem Mailversand.

- Abnahme: `python tools/getraenke_ueblich_test.py` → alle Prüfungen bestanden
  (10/10).

## Reihenfolge

```
T1 ─► T2 ─► T3
```
