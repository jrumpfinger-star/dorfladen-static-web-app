# Admin-Flächen & Popups auf Lucide + einheitliches UI — Tasks

> Derived from `plan.md`. Ordered, dependency-aware, checkable units of work.
> `[P]` marks tasks that can run in parallel (no shared files / no ordering
> dependency). Each task references the spec requirement or test case it serves.

**Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)

## Conventions

- Complete tasks top-to-bottom unless marked `[P]`.
- A task is done only when its referenced Test Cases pass.
- Keep commits small; reference the task id in the commit message.

## Setup

- [ ] T001 Scope-Baseline erfassen: aktuelle Admin-Seiten/JS/CSS/Popup-Varianten inventarisieren (`cms`, `kiosk`, `shop-admin`, `bestellungen`, `pack`, `portal`, `lunch-admin`, `shop-freigabe`) — serves `F1`, `F2`, `F3`, `F4`
- [ ] T002 Test-Baseline festhalten: bestehende relevante Playwright-Specs und kritische Flows dokumentieren — serves `F4`

## Core Implementation

- [ ] T010 Zentrale Lucide-Refresh-Pfade in gemeinsamer JS-Layer absichern (inkl. dynamischer DOM-Updates) — serves `F1` / `TC-F1-02`
- [ ] T011 [P] Icon-Migration in Admin-Navigation/Toolbars/Aktionsbuttons: Emoji/Alt-Icons auf `data-lucide` umstellen — serves `F1` / `TC-F1-01`
- [ ] T012 [P] Dynamische Admin-Listen/Actions auf korrekte Lucide-Neuinitialisierung umstellen — serves `F1` / `TC-F1-02`

- [ ] T020 Gemeinsamen Popup-Standard technisch verankern (Open/Close, Header/Body/Footer, Scroll-Lock) — serves `F2` / `TC-F2-01`, `TC-F2-02`
- [ ] T021 [P] Close-Trigger vereinheitlichen (X, Backdrop, Escape; kein versehentliches Schließen bei internen Interaktionen) — serves `F2` / `TC-F2-02`, `TC-F2-03`
- [ ] T022 A11y-Basis für Popups durchziehen (`role="dialog"`, `aria-modal`, erreichbare Close-Controls, Fokusfalle) — serves `F2`

- [ ] T030 Dark-Mode-Link-/Text-/Badge-Regeln für Admin-Flächen vereinheitlichen (inkl. Inline-Color-Altfälle entfernen/übersteuern) — serves `F3` / `TC-F3-01`, `TC-F3-02`
- [ ] T031 [P] Lesbarkeitsregeln für 60+ auf kritischen Admin-Screens und Popups durchziehen (Schriftgröße/Kontrast) — serves `F3` / `TC-F3-03`
- [ ] T032 [P] System-Color-Mode-Absicherung ergänzen (`forced-colors`, `prefers-contrast`, Fokusindikatoren sichtbar) — serves `F3` / `TC-F3-04`

## Tests

- [ ] T040 Playwright-Testfälle für Lucide-Rendering in statischen Admin-Bereichen ergänzen/aktualisieren — covers `TC-F1-01`
- [ ] T041 [P] Playwright-Testfälle für dynamische Icon-Updates ergänzen/aktualisieren — covers `TC-F1-02`

- [ ] T042 Playwright-Testfälle für Popup-Scroll-Lock ergänzen/aktualisieren — covers `TC-F2-01`
- [ ] T043 [P] Playwright-Testfälle für Close-Trigger und No-Fehlschließung ergänzen/aktualisieren — covers `TC-F2-02`, `TC-F2-03`

- [ ] T044 Dark-Mode-Lesbarkeitstests für Admin-Links/Popup-Inhalte ergänzen/aktualisieren — covers `TC-F3-01`, `TC-F3-02`
- [ ] T045 [P] Lesbarkeits-/Kontrasttests (Light + Dark, 60+-Ziel) ergänzen/aktualisieren — covers `TC-F3-03`
- [ ] T046 [P] High-Contrast/Systemfarben-Tests (`forced-colors`) ergänzen/aktualisieren — covers `TC-F3-04`

- [ ] T047 Viewport-Regression über `mobile`, `ipad-mini`, `desktop` für relevante Admin-Flows sicherstellen — covers `TC-F4-01`
- [ ] T048 [P] Lucide-Regressionstest für Zielbereiche konsolidieren (keine Emoji-Fallbacks) — covers `TC-F4-02`

## Validation & Rollout

- [ ] T050 Betroffene Testsuite auf Live-/Staging-URL ausführen, Fehler beheben, erneut validieren — serves `F4`
- [ ] T051 `tests/TESTCASES.md` mit finalen Testfällen/Läufen aktualisieren — serves `F4`
- [ ] T052 Abschluss-Smoketest auf `feature/bestellsystem`, danach finaler Smoke-Check auf `dev` vor Merge — serves Rollout

## Traceability

| Task | Requirement | Test Cases |
| --- | --- | --- |
| T010 | F1 | TC-F1-02 |
| T011 | F1 | TC-F1-01 |
| T012 | F1 | TC-F1-02 |
| T020 | F2 | TC-F2-01, TC-F2-02 |
| T021 | F2 | TC-F2-02, TC-F2-03 |
| T022 | F2 | — |
| T030 | F3 | TC-F3-01, TC-F3-02 |
| T031 | F3 | TC-F3-03 |
| T032 | F3 | TC-F3-04 |
| T040 | F1 | TC-F1-01 |
| T041 | F1 | TC-F1-02 |
| T042 | F2 | TC-F2-01 |
| T043 | F2 | TC-F2-02, TC-F2-03 |
| T044 | F3 | TC-F3-01, TC-F3-02 |
| T045 | F3 | TC-F3-03 |
| T046 | F3 | TC-F3-04 |
| T047 | F4 | TC-F4-01 |
| T048 | F4 | TC-F4-02 |
| T050 | F4 | TC-F4-01, TC-F4-02 |
| T051 | F4 | — |
| T052 | F4 | Smoke-Check |
