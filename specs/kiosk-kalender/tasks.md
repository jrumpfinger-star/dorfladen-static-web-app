# Kiosk-Kalender — Tasks

> Abgeleitet aus [plan.md](./plan.md). Geordnete, abhängigkeitsbewusste,
> abhakbare Arbeitseinheiten. `[P]` = parallelisierbar (keine gemeinsamen
> Dateien / keine Reihenfolge-Abhängigkeit). Jede Task referenziert die
> Spec-Anforderung bzw. den Testfall, den sie bedient.

**Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)

## Conventions

- Tasks von oben nach unten abarbeiten, außer `[P]`.
- Eine Task ist erst „done", wenn ihre referenzierten Testfälle grün sind.
- Kleine Commits; Task-ID in der Commit-Message referenzieren.

> **Fortschritt:** Backend, Frontend und die reine Serien-Logik sind
> implementiert; die E2E-Suite (33 Tests × 3 Viewports) und der Python-Unit-Test
> laufen grün. Offen bleiben Schritte, die eine **echte Dataverse-Umgebung** oder
> ein **Deployment** erfordern (T002, T061, T062, T063) sowie ergänzende
> Test-Abdeckung (T056).

## Setup

- [x] **T001** Auf bestehendem Branch `feature/bestellsystem` umgesetzt (kein
      separater Branch, um laufende Arbeit nicht zu stören).
- [ ] **T002** Dataverse-Feld-/Choice-Namen für `dl_kalendereintrag` und
      `dl_kalender_override` gegen die reale Umgebung verifizieren (Muster aus
      `stammkunden`/`wochenplan`); die endgültigen `dl_*`-Namen + Choice-Werte
      in [plan.md](./plan.md) „Data & Contracts" festschreiben. — Risiko-Mitigation

## Backend: API `api/kalender/`

- [x] **T010** `api/kalender/function.json` — Route `kalender/{id?}`, Methoden GET/POST/PATCH/DELETE/OPTIONS. — `F7`
- [x] **T011** `api/kalender/__init__.py` Grundgerüst (MSAL, CORS, `_serialize`, `main()`-Dispatch) nach `stammkunden`-Muster. — `F1`,`F2`
- [x] **T012** `POST /api/kalender` mit Validierung (Titel/Uhrzeit) + freundliche Fehlertexte. — `F1`
- [x] **T013** Kundenverknüpfung im POST (`kunde_id` oder `kunde_freitext`). — `F4`
- [x] **T014** `GET ?von=&bis=` mit Sortierung (ganztags zuerst). — `F2`
- [x] **T015** Serien-Expansion als reine Funktion in `serien.py` + Einbindung im GET. — `F5`
- [x] **T016** `PATCH /{id}` inkl. `status`/`erledigt_am`. — `F3`
- [x] **T017** Override-Handling `POST /{id}?override=<datum>` (`dl_kalender_override`). — `F5`
- [x] **T018** `DELETE /{id}`. — `F1`
- [x] **T019** additive `read_auth_guard` in `api/shared/auth.py` + Aufruf im Kalender-`main()`. — `F7`

## Frontend: Kiosk-Tab „Kalender"

- [x] **T030** `static-site/kiosk.html`: Tab „Kalender" + `#panel-kalender` + `switchTab`-Hook + Script-Include. — `F6`
- [x] **T031** `static-site/js/kiosk-kalender.js`: Rendering Tagesliste mit Gruppen/Leerzustand/Kategorie-Farben. — `F2`
- [x] **T032** Tages-Pills + Wochennavigation (`‹`/`›`/„Heute"), Default heute, Markierung von Tagen mit Einträgen. — `F6`
- [x] **T033** Schnellerfassung + Ganztags/Uhrzeit-Toggle; freundliche Hinweise statt `alert()`. — `F1`
- [x] **T034** Kunden-Autocomplete gegen `/api/stammkunden` (id/Freitext) + Badge. — `F4`
- [x] **T035** Erledigt-Checkbox (`PATCH`/Override), durchgestrichen, Umschalter. — `F3`
- [x] **T036** Wiederholungs-Auswahl + `↻`-Badge. — `F5`
- [x] **T037** Auto-Refresh-Polling nur bei aktivem Tab; 401-Hinweis. — `F7`
- [x] **T038** `admin-auth.js`: `X-CMS-Auth` auch an `GET /api/kalender`. — `F7`
- [x] **T039** Responsive verifiziert über die drei Viewport-Projekte. — `F8`

## Tests

- [x] **T050** [P] `tests/kiosk-kalender.spec.js`: self-contained Static-Server + `page.route`-Mocks; über alle drei Viewport-Projekte.
- [x] **T051** [P] E2E F1/F2 (ganztags/uhrzeit/leerer Titel, Gruppierung). — `TC-F1-01..03`,`TC-F2-01`
- [x] **T052** [P] E2E F3 (Abhaken, Ein-/Ausblenden). — `TC-F3-01`,`TC-F3-03`
- [x] **T053** [P] E2E F4 (Freitext-Kunde). — `TC-F4-02`
- [x] **T054** [P] E2E F5 (Serien-Vorkommen, pro-Vorkommen-Erledigt). — `TC-F5-01`,`TC-F5-02`
- [x] **T055** [P] E2E F6 (heute-Default, Woche vor, „Heute"). — `TC-F6-01`,`TC-F6-03`
- [x] **T056** [P] E2E F7 (401-Pfad zeigt Hinweis, kein Absturz). — `TC-F7-01`
- [x] **T057** [P] E2E F8 (keine nativen Dialoge; drei Viewports). — `TC-F8-02`
- [x] **T058** [P] Python-Unit-Test `test_kalender_serien.py` (7/7 grün). — `TC-F5-01`,`TC-F5-03`
- [x] **T059** [P] Ergänzende E2E: TC-F1-04, F2-02, F3-02, F4-01/03, F5-04, F6-02.
      Gesamtsuite **57 grün** (19 × 3 Viewports).

> Verbleibend (bewusst offen): TC-F7-02 Auto-Refresh-Timing.

## Validation & Rollout

- [x] **T002/T061** Dataverse-Tabellen `dl_kalendereintrag`/`dl_kalender_override`
      via `scripts/create_kalender_entity.py` angelegt + veröffentlicht; Live-Test
      der **echten Function** (`func start` → HTTP) grün: POST/GET/PATCH/DELETE,
      Serien-Expansion (2 Vorkommen) und pro-Vorkommen-Override (`di=erledigt,
      next_di=offen`). Feldnamen bestätigt.
- [x] **T060** Kalender-Playwright-Suite über alle drei Projekte grün (57).
- [ ] **T062** Auth staged ausrollen: deployen (Client sendet Token), dann
      `CMS_AUTH_ENFORCE` scharf schalten. — `F7` (Deployment)
- [ ] **T063** Deploy auf die Static Web App + `DV_*`-App-Settings prod prüfen.

## Traceability

| Task | Requirement | Test Cases |
| --- | --- | --- |
| T010 | F7 | — |
| T011 | F1, F2 | — |
| T012 | F1 | TC-F1-01, TC-F1-02, TC-F1-03, TC-F1-04 |
| T013 | F4 | TC-F4-01, TC-F4-02, TC-F4-03 |
| T014 | F2 | TC-F2-01, TC-F2-02 |
| T015 | F5 | TC-F5-01, TC-F5-03 |
| T016 | F3 | TC-F3-01, TC-F3-02 |
| T017 | F5 | TC-F5-02, TC-F5-04 |
| T018 | F1 | — |
| T019 | F7 | TC-F7-01 |
| T030 | F6 | — |
| T031 | F2 | TC-F2-01, TC-F2-02 |
| T032 | F6 | TC-F6-01, TC-F6-02, TC-F6-03 |
| T033 | F1 | TC-F1-01, TC-F1-02, TC-F1-03, TC-F1-04 |
| T034 | F4 | TC-F4-01, TC-F4-02, TC-F4-03 |
| T035 | F3 | TC-F3-01, TC-F3-02, TC-F3-03 |
| T036 | F5 | TC-F5-01 |
| T037 | F7 | TC-F7-02 |
| T038 | F7 | TC-F7-01 |
| T039 | F8 | TC-F8-01 |
| T050–T058 | F1–F8 | alle TC-* |
| T060–T063 | — | Quality Gate / Rollout |
