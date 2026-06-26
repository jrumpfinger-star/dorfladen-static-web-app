# Spec: Status-Timeline & Status-Rücksetzen

## Kontext
Bestellungen im Online-Shop durchlaufen einen Status-Flow:
`Neu (0) → In Bearbeitung (1) → Abholbereit (2) → Abgeholt (3)` oder `Storniert (4)`.

Die Timeline visualisiert diesen Flow und ermöglicht auch Rückwärts-Navigation.

## Betroffene Dateien
- `static-site/kiosk.html` – Kiosk-Admin mit Bestellkarten + Detail-Modal
- `static-site/shop-admin.html` – Shop-Admin mit Split-View (Liste + Detail)

## Akzeptanzkriterien

### AK-TL-01: Timeline in Bestellkarten (kiosk.html)
- [x] Jede Bestellkarte zeigt eine kompakte horizontale Timeline
- [x] Abgeschlossene Schritte sind grün (done)
- [x] Aktueller Schritt ist blau hervorgehoben (active)
- [x] Storniert zeigt roten Punkt

### AK-TL-02: Timeline im Detail-Modal (kiosk.html)
- [x] Detail-Modal zeigt größere Timeline mit Icons
- [x] Klick auf einen abgeschlossenen (grünen) Schritt setzt Status zurück
- [x] Modal schließt sich nach Rücksetzen

### AK-TL-03: Timeline in Shop-Admin Detail (shop-admin.html)
- [x] Detail-Ansicht (rechts) zeigt Timeline unter dem Header
- [x] Funktioniert auf Desktop (Split-View) und Mobile (Accordion)
- [x] Klick auf abgeschlossene Schritte setzt Status zurück

### AK-TL-04: Klickbare Timeline – Status zurücksetzen
- [x] Nur abgeschlossene (grüne) Schritte sind klickbar
- [x] Aktiver und zukünftige Schritte sind nicht klickbar
- [x] Hover zeigt visuelles Feedback (Vergrößerung + Unterstreichung)
- [x] Tooltip zeigt "Zurück auf [Statusname]"

### AK-TL-05: Status-Flow-Regeln
- [x] "Bereit" (Status 2) kann NUR über den Pack-Abschluss gesetzt werden, nicht direkt
- [x] Jeder Status hat einen Zurück-Button (↩) in den Action-Buttons
- [x] Status 1→0 (Bearbeitung → Neu)
- [x] Status 2→1 (Bereit → Bearbeitung)
- [x] Status 3→2 (Abgeholt → Bereit)

### AK-TL-07: Confirm-Abfrage bei Status-Zurücksetzen
- [x] **Kiosk** – Doppelklick auf Status-Badge in Bestellkarte löst `confirm()` Dialog aus
  - Text: „Status zurücksetzen auf ‚[Zielstatus]'?"
  - Nur bei Status 1–3 (nicht bei Neu/Storniert)
  - Abbrechen → keine Aktion
- [x] **Kiosk** – Timeline-Klick im Detail-Modal löst `confirm()` aus
- [x] **Shop-Admin** – Timeline-Klick in Detailansicht löst `showConfirm()` Dialog aus
  - Schöner Dialog mit Titel „Status zurücksetzen?" und Beschreibung des Zielstatus
  - Bestätigungs-Button: „Zurücksetzen"
  - Abbrechen-Button
- [x] Vorwärts-Aktionen (Annehmen, Packen, Ausgeben) bleiben OHNE Confirm
  - Ausnahme: Storno hat bereits confirm

### AK-TL-08: Kiosk Status-Badge Doppelklick
- [x] Status-Badge im Card-Header zeigt `cursor:pointer` bei Status 1–3
- [x] Tooltip: „Doppelklick: Status zurücksetzen"
- [x] Doppelklick setzt Status um genau 1 Schritt zurück (nicht beliebig)
- [x] Bei Status 0 (Neu) oder 4 (Storniert): kein Doppelklick-Handler

### AK-TL-06: Lucide Icons in Timeline
- [x] Neu: `circle-dot`
- [x] In Bearbeitung: `clipboard-list`
- [x] Abholbereit: `check-circle`
- [x] Abgeholt: `package-check`
- [x] Storniert: `x`
- [x] Zurück-Button: `undo-2`
