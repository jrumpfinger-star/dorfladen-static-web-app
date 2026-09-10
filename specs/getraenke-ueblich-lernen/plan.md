# Getränke „üblich" fortschreiben — Plan

**Status:** Umgesetzt · **Last updated:** 2026-09-10

## Architektur

Rein serverseitig. Der Kiosk-Reiter bleibt unverändert — er liest weiterhin
`a.ueblich` (Knopf) und `bestellungen >= 2` (Filter). Neu ist allein, dass der
Server diese beiden Katalogfelder nach jedem Versand aus der Bestellhistorie
neu ableitet, so wie der Metzger seine Vorschläge über `lerne()` fortschreibt.

### Leitentscheidungen

1. **Ableiten statt zählen.** `bestellungen`/`ueblich` werden bei jedem Senden
   vollständig aus dem Order-Store neu berechnet (nicht inkrementell). Das
   macht Korrekturen (F5) und Backfill (F7) automatisch korrekt und ist
   robust gegen gelöschte/geänderte Bestellungen.
2. **Median über ein hartes Fenster `K = 8`.** Keine Zeitgewichtung — bei
   ganzen Kisten und unregelmäßigem Rhythmus unnötig.
3. **Fehlertolerant.** Die Fortschreibung läuft nach `save_order` in einem
   `try/except`; scheitert sie, ist die Bestellung dennoch versandt (die
   Statistik ist eine Hilfe, kein Teil des Auftrags).

## Dateien (Change-Map)

| Datei | Änderung |
| --- | --- |
| `api/getraenke-order/getraenke_store.py` | Neu: Konstante `UEBLICH_FENSTER = 8`, Helfer `_stat_schluessel`, Funktion `statistik_aktualisieren(artikel, alle_bestellungen)`; `import statistics`. |
| `api/getraenke-order/__init__.py` | In `_senden` nach `save_order`: Katalog laden, `statistik_aktualisieren`, `save_artikel` (in `try/except`). |
| `tools/getraenke_ueblich_test.py` | Neu: Test der reinen Ableitung und der `_senden`-Verdrahtung (Dataverse/Mail als Attrappe). |

## Kein Eingriff

- Bäcker und Metzger: unberührt (deren Mechanik bleibt).
- Frontend `kiosk-getraenke.js`: unverändert (nutzt die Felder wie bisher).
- Dataverse-Schema: unverändert (JSON im generischen Schlüssel-Wert-Speicher).

## Testansatz

- Reine Ableitung als Python-Test (`statistics.median`, Fenster, Zusatz,
  Reproduzierbarkeit).
- Verdrahtung: `_senden` mit In-Memory-Ablage und gestubbtem Mailversand;
  prüft Fortschreibung, Fehlversand-Verhalten, neuen Artikel, Korrektur.
- Ausführen: `python tools/getraenke_ueblich_test.py`.
