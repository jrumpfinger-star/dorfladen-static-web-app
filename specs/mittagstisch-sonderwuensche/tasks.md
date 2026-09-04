# Mittagstisch â€” SonderwÃ¼nsche auf einen Blick â€” Tasks

> Derived from `plan.md`. Ordered, dependency-aware, checkable units of work.
> `[P]` marks tasks that can run in parallel (no shared files / no ordering
> dependency). Each task references the spec requirement or test case it serves.

**Spec:** [spec.md](./spec.md) Â· **Plan:** [plan.md](./plan.md)

## Conventions

- Complete tasks top-to-bottom unless marked `[P]`.
- A task is done only when its referenced Test Cases pass.
- Keep commits small; reference the task id in the commit message.
- Alle Code-Ã„nderungen liegen in [static-site/kiosk.html](../../static-site/kiosk.html),
  daher sind die Implementierungstasks bewusst **nicht** parallelisiert.

## Setup

- [x] T001 Arbeitsstand prÃ¼fen: `main` aktuell, Arbeitsverzeichnis sauber,
  Playwright vorhanden (`npx playwright --version`).

## Core Implementation

- [x] T010 CSS-Block â€žSonderwunsch-Leiste & -Liste" in `kiosk.html` ergÃ¤nzen
  (nach dem Kochbedarf-CSS): `.k-sw-bar`, `.k-sw-card`, `.k-sw-note`,
  `.k-sw-more`, `.k-sw-thread`, `.k-sw-row`, `.k-sw-head`; Bernstein-Palette,
  Tap-Targets â‰¥44px, Dark-Mode-Overrides â€” serves `F2`, `F4`, `F6`, `F7`
- [x] T011 HTML ergÃ¤nzen: Host `<div id="mittag-sonder"></div>` direkt nach
  `<div id="mittag-cook">`; Filter-Knopf `data-mt-filter="sonderwunsch"` mit
  ZÃ¤hler `mt-fc-sonderwunsch` zwischen â€žOffen" und â€žNachrichten" â€”
  serves `F2`, `F3`
- [x] T012 `_sonderwunsch(o)` implementieren (Anmerkung â†’ sonst erste
  Kundennachricht; storniert ausschlieÃŸen; leere Texte bereinigen) â€”
  serves `F1` / `TC-F1-01` â€¦ `TC-F1-05`
- [x] T013 `_sonderwunschListe()` implementieren: Gruppierung nach Gericht,
  Gruppenreihenfolge nach Portionen absteigend, innerhalb ungelesene zuerst
  dann alphabetisch; Kennzahlen `anzahl`, `portionen`, `ungelesen`, `mitChat` â€”
  serves `F4` / `TC-F4-01`, `TC-F4-03`
- [x] T014 `renderSonderwunschBar()` implementieren und in `renderOrders()`
  einhÃ¤ngen; Ausblenden bei `anzahl === 0` sowie in den Ansichten
  `nachrichten` und `sonderwunsch` â€” serves `F2` / `TC-F2-01`, `TC-F2-03`
- [x] T015 Filterzweig verdrahten: `setMittagFilter('sonderwunsch')`,
  Verzweigung in `renderOrders()`, Ausblendbedingung in `renderCookBar()`,
  Ladeplatzhalter-Bedingung in `loadOrders()`, ZÃ¤hler in
  `updateMittagFilterCounts()` â€” serves `F2`, `F3` / `TC-F2-02`, `TC-F3-01` â€¦ `TC-F3-03`
- [x] T016 `renderSonderwuensche()` + `_renderSwCard(o, sw)`: Kopfzeile mit
  Datum/Kennzahlen, GruppenkÃ¶pfe, Karten mit Badges und hervorgehobenem
  Wunschtext; Ausgabe konsequent Ã¼ber `esc()` â€”
  serves `F4` / `TC-F4-01`, `TC-F4-02`, `TC-F4-04`
- [x] T017 Aufklappbarer Verlauf: `toggleSwThread(id)`, Zustand `_swThreadOpen`,
  Chatblasen, Antwortzeile mit `id="rpt-<id>"` auf bestehendes `sendReply`,
  â€žGelesen"-Knopf auf bestehendes `markMsgRead`, Kopfzeilen-Knopf
  `toggleAllSwThreads()` â€” serves `F5` / `TC-F5-01` â€¦ `TC-F5-05`
- [x] T018 Kompaktansicht: Umschalter `setSwCompact(v)`, Zustand `_swCompact`,
  `_renderSwRow(o, sw)` ohne Verlauf und ohne Eingabefeld â€”
  serves `F6` / `TC-F6-01` â€¦ `TC-F6-03`
- [x] T019 Leerzustand â€žKeine SonderwÃ¼nsche fÃ¼r diesen Tag" und Export der neuen
  Funktionen im `K`-Namespace â€” serves `F7` / `TC-F7-01`

## Tests

- [x] T020 `tests/kiosk-sonderwuensche.spec.js` anlegen: Mock fÃ¼r
  `GET **/api/lunch-order**` mit festem Datensatz, Auffangroute fÃ¼r
  `**/api/**`, Helfer zum Ã–ffnen des Mittagstisch-Tabs â€”
  Grundlage fÃ¼r alle TCs
- [x] T021 Tests F1 (Ermittlung) â€” covers `TC-F1-01` â€¦ `TC-F1-05`
- [x] T022 Tests F2 (Leiste) â€” covers `TC-F2-01` â€¦ `TC-F2-03`
- [x] T023 Tests F3 (Filter-Reiter) â€” covers `TC-F3-01` â€¦ `TC-F3-03`
- [x] T024 Tests F4 (Liste inkl. XSS) â€” covers `TC-F4-01` â€¦ `TC-F4-04`
- [x] T025 Tests F5 (Verlauf, Antworten) â€” covers `TC-F5-01` â€¦ `TC-F5-05`
- [x] T026 Tests F6 (Kompaktansicht) â€” covers `TC-F6-01` â€¦ `TC-F6-03`
- [x] T027 Tests F7 (Leerzustand, kein Ãœberlauf, Tap-Targets) â€”
  covers `TC-F7-01` â€¦ `TC-F7-03`

## Validation & Rollout

- [x] T030 `npx playwright test tests/kiosk-sonderwuensche.spec.js` Ã¼ber alle
  drei Projekte (`mobile`, `ipad-mini`, `desktop`) grÃ¼n
- [x] T031 Regression: `npx playwright test tests/kiosk.spec.js` weiterhin grÃ¼n
  (Filterleiste und Mittagstisch wurden angefasst)
- [x] T032 SichtprÃ¼fung auf 375Ã—667, 768Ã—1024 und 1280Ã—800: kein horizontales
  Scrollen, Wunschtext dominant, Leiste fÃ¤llt ins Auge â€” serves `F7`
- [x] T033 `tests/TESTCASES.md` um die neuen Test-Cases ergÃ¤nzen
- [x] T034 Commit nach Repo-Konvention; Deployment Ã¼ber den bestehenden
  SWA-Workflow

## Traceability

| Task | Requirement | Test Cases |
| --- | --- | --- |
| T010 | F2, F4, F6, F7 | TC-F7-02, TC-F7-03 |
| T011 | F2, F3 | TC-F2-01, TC-F3-01 |
| T012 | F1 | TC-F1-01 â€¦ TC-F1-05 |
| T013 | F4 | TC-F4-01, TC-F4-03 |
| T014 | F2 | TC-F2-01, TC-F2-03 |
| T015 | F2, F3 | TC-F2-02, TC-F3-01 â€¦ TC-F3-03 |
| T016 | F4 | TC-F4-01, TC-F4-02, TC-F4-04 |
| T017 | F5 | TC-F5-01 â€¦ TC-F5-05 |
| T018 | F6 | TC-F6-01 â€¦ TC-F6-03 |
| T019 | F7 | TC-F7-01 |
| T020â€“T027 | F1â€“F7 | alle |
| T030â€“T032 | F1â€“F7 | alle |
| T033 | â€” | Dokumentation |
| T034 | â€” | Rollout |

