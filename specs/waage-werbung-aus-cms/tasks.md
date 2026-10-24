# Aufgaben: Waage-Werbung aus dem CMS

| # | Aufgabe | Testfälle | Stand |
|---|---------|-----------|-------|
| T1 | Spec, Plan, Tasks | – | erledigt |
| T2 | HD-Rendern Wochenplan | TC-F1-01, F1-03 | erledigt |
| T3 | HD-Rendern Plakat | TC-F1-02 | erledigt |
| T4 | HD-Rendern Einzelflyer, Editor bleibt 1× | TC-F2-01, F2-02 | erledigt |
| T5 | Waagen-Dialog `KWerbebilder.uebertragen`, CMS-Einbindung | TC-F4…F6, F10, F11 | erledigt |
| T6 | Wochenplan: Waagenbild, Knöpfe | TC-F3-01, F7-01, F7-02 | erledigt |
| T7 | Aktion: Querformat-Zeichner, Einzelbilder, Knöpfe | TC-F8, F9 | erledigt |
| T8 | Playwright-Tests, Gegenproben, Regression CMS | alle | erledigt |
| T9 | Handbuch | – | erledigt |
| T10 | Preview-Live-Test, Auslieferung | alle | erledigt (Preview in Edge: HD 2382 px, Dialog, 7 Aktionsbilder mit echten Daten; ohne Upload) |
# Erweiterung: Anzeigeprofile

- [x] D1 Gemeinsame Profile und Dialogwahl (TC-F12-01/02); Voraussetzung: aktualisierte Spec/Plan.
- [x] D2 Native ganze Wochenübersicht (TC-F7-01/02/03); Voraussetzung: D1.
- [x] D3 Aktionslayout mit getrennten Text-/Preisbereichen (TC-F13-01); Voraussetzung: D1.
- [x] D4 Vier-Viewport-Tests und Handbuch; Voraussetzung: D2/D3.
- [ ] D5 Tatsächliche Fläche an der Hardware nach autorisiertem Transfer bestätigen.

Validierung: Werbebilder-/CMS-Suiten 232/232 auf vier Viewports; nach abschließenden
Layoutverbesserungen 20/20 gezielte Fälle und zuletzt 12/12 Aktionsfälle grün.
Neue Wochenplan-/Aktions-JPEGs visuell geprüft. Noch kein Hardwaretransfer und kein Deployment
dieser Erweiterung. D5 bleibt ausdrücklich offen.
