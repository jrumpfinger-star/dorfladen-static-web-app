# Mittagstisch — Sonderwünsche auf einen Blick — Tasks

> Derived from `plan.md`. Ordered, dependency-aware, checkable units of work.
> `[P]` marks tasks that can run in parallel (no shared files / no ordering
> dependency). Each task references the spec requirement or test case it serves.

**Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)

## Conventions

- Complete tasks top-to-bottom unless marked `[P]`.
- A task is done only when its referenced Test Cases pass.
- Keep commits small; reference the task id in the commit message.
- Alle Code-Änderungen liegen in [static-site/kiosk.html](../../static-site/kiosk.html),
  daher sind die Implementierungstasks bewusst **nicht** parallelisiert.

## Setup

- [ ] T001 Arbeitsstand prüfen: `main` aktuell, Arbeitsverzeichnis sauber,
  Playwright vorhanden (`npx playwright --version`).

## Core Implementation

- [ ] T010 CSS-Block „Sonderwunsch-Leiste & -Liste" in `kiosk.html` ergänzen
  (nach dem Kochbedarf-CSS): `.k-sw-bar`, `.k-sw-card`, `.k-sw-note`,
  `.k-sw-more`, `.k-sw-thread`, `.k-sw-row`, `.k-sw-head`; Bernstein-Palette,
  Tap-Targets ≥44px, Dark-Mode-Overrides — serves `F2`, `F4`, `F6`, `F7`
- [ ] T011 HTML ergänzen: Host `<div id="mittag-sonder"></div>` direkt nach
  `<div id="mittag-cook">`; Filter-Knopf `data-mt-filter="sonderwunsch"` mit
  Zähler `mt-fc-sonderwunsch` zwischen „Offen" und „Nachrichten" —
  serves `F2`, `F3`
- [ ] T012 `_sonderwunsch(o)` implementieren (Anmerkung → sonst erste
  Kundennachricht; storniert ausschließen; leere Texte bereinigen) —
  serves `F1` / `TC-F1-01` … `TC-F1-05`
- [ ] T013 `_sonderwunschListe()` implementieren: Gruppierung nach Gericht,
  Gruppenreihenfolge nach Portionen absteigend, innerhalb ungelesene zuerst
  dann alphabetisch; Kennzahlen `anzahl`, `portionen`, `ungelesen`, `mitChat` —
  serves `F4` / `TC-F4-01`, `TC-F4-03`
- [ ] T014 `renderSonderwunschBar()` implementieren und in `renderOrders()`
  einhängen; Ausblenden bei `anzahl === 0` sowie in den Ansichten
  `nachrichten` und `sonderwunsch` — serves `F2` / `TC-F2-01`, `TC-F2-03`
- [ ] T015 Filterzweig verdrahten: `setMittagFilter('sonderwunsch')`,
  Verzweigung in `renderOrders()`, Ausblendbedingung in `renderCookBar()`,
  Ladeplatzhalter-Bedingung in `loadOrders()`, Zähler in
  `updateMittagFilterCounts()` — serves `F2`, `F3` / `TC-F2-02`, `TC-F3-01` … `TC-F3-03`
- [ ] T016 `renderSonderwuensche()` + `_renderSwCard(o, sw)`: Kopfzeile mit
  Datum/Kennzahlen, Gruppenköpfe, Karten mit Badges und hervorgehobenem
  Wunschtext; Ausgabe konsequent über `esc()` —
  serves `F4` / `TC-F4-01`, `TC-F4-02`, `TC-F4-04`
- [ ] T017 Aufklappbarer Verlauf: `toggleSwThread(id)`, Zustand `_swThreadOpen`,
  Chatblasen, Antwortzeile mit `id="rpt-<id>"` auf bestehendes `sendReply`,
  „Gelesen"-Knopf auf bestehendes `markMsgRead`, Kopfzeilen-Knopf
  `toggleAllSwThreads()` — serves `F5` / `TC-F5-01` … `TC-F5-05`
- [ ] T018 Kompaktansicht: Umschalter `setSwCompact(v)`, Zustand `_swCompact`,
  `_renderSwRow(o, sw)` ohne Verlauf und ohne Eingabefeld —
  serves `F6` / `TC-F6-01` … `TC-F6-03`
- [ ] T019 Leerzustand „Keine Sonderwünsche für diesen Tag" und Export der neuen
  Funktionen im `K`-Namespace — serves `F7` / `TC-F7-01`

## Tests

- [ ] T020 `tests/kiosk-sonderwuensche.spec.js` anlegen: Mock für
  `GET **/api/lunch-order**` mit festem Datensatz, Auffangroute für
  `**/api/**`, Helfer zum Öffnen des Mittagstisch-Tabs —
  Grundlage für alle TCs
- [ ] T021 Tests F1 (Ermittlung) — covers `TC-F1-01` … `TC-F1-05`
- [ ] T022 Tests F2 (Leiste) — covers `TC-F2-01` … `TC-F2-03`
- [ ] T023 Tests F3 (Filter-Reiter) — covers `TC-F3-01` … `TC-F3-03`
- [ ] T024 Tests F4 (Liste inkl. XSS) — covers `TC-F4-01` … `TC-F4-04`
- [ ] T025 Tests F5 (Verlauf, Antworten) — covers `TC-F5-01` … `TC-F5-05`
- [ ] T026 Tests F6 (Kompaktansicht) — covers `TC-F6-01` … `TC-F6-03`
- [ ] T027 Tests F7 (Leerzustand, kein Überlauf, Tap-Targets) —
  covers `TC-F7-01` … `TC-F7-03`

## Validation & Rollout

- [ ] T030 `npx playwright test tests/kiosk-sonderwuensche.spec.js` über alle
  drei Projekte (`mobile`, `ipad-mini`, `desktop`) grün
- [ ] T031 Regression: `npx playwright test tests/kiosk.spec.js` weiterhin grün
  (Filterleiste und Mittagstisch wurden angefasst)
- [ ] T032 Sichtprüfung auf 375×667, 768×1024 und 1280×800: kein horizontales
  Scrollen, Wunschtext dominant, Leiste fällt ins Auge — serves `F7`
- [ ] T033 `tests/TESTCASES.md` um die neuen Test-Cases ergänzen
- [ ] T034 Commit nach Repo-Konvention; Deployment über den bestehenden
  SWA-Workflow

## Traceability

| Task | Requirement | Test Cases |
| --- | --- | --- |
| T010 | F2, F4, F6, F7 | TC-F7-02, TC-F7-03 |
| T011 | F2, F3 | TC-F2-01, TC-F3-01 |
| T012 | F1 | TC-F1-01 … TC-F1-05 |
| T013 | F4 | TC-F4-01, TC-F4-03 |
| T014 | F2 | TC-F2-01, TC-F2-03 |
| T015 | F2, F3 | TC-F2-02, TC-F3-01 … TC-F3-03 |
| T016 | F4 | TC-F4-01, TC-F4-02, TC-F4-04 |
| T017 | F5 | TC-F5-01 … TC-F5-05 |
| T018 | F6 | TC-F6-01 … TC-F6-03 |
| T019 | F7 | TC-F7-01 |
| T020–T027 | F1–F7 | alle |
| T030–T032 | F1–F7 | alle |
| T033 | — | Dokumentation |
| T034 | — | Rollout |
