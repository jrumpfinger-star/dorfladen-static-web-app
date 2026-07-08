# Dark-Mode-Freigabe (CMS-Einstellung) — Tasks

> Abgeleitet aus [plan.md](./plan.md). Geordnete, abhängigkeitsbewusste,
> abhakbare Arbeitseinheiten. `[P]` = parallelisierbar (keine gemeinsame Datei,
> keine Reihenfolge-Abhängigkeit). Jede Task referenziert Requirement/Testfälle.

**Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)

## Conventions

- Tasks von oben nach unten abarbeiten, außer `[P]`.
- Eine Task ist erst erledigt, wenn ihre referenzierten Testfälle grün sind.
- Kleine Commits; Task-ID in der Commit-Message referenzieren.

## Setup

- [x] **T001** Playwright-Testdatei `tests/dark-mode-setting.spec.js` anlegen
  (3-Viewport-Projekt-Setup 375×667 / 768×1024 / 1280×800) und einen
  Helper `mockCmsConfig(page, { dark_mode })` via
  `page.route('**/api/cms-config', …)` bereitstellen. — dient allen `TC-*`

## Core Implementation

### theme.js (sequenziell — gemeinsame Datei)

- [x] **T010** In [static-site/js/theme.js](../../static-site/js/theme.js) die
  Freigabe-Logik einführen: Funktion `effective(allowed)` →
  `allowed ? (systemDark()?'dark':'light') : 'light'`. Default-Annahme
  „nicht erlaubt". `dl-theme` wird ignoriert (nicht gelöscht). — serves `F2` /
  `TC-F2-01`, `TC-F2-02`, `TC-F2-03`
- [x] **T011** theme.js: Pre-Paint aus `localStorage['dl-dark-allowed']` (fehlt →
  „nicht erlaubt"); danach `fetch('/api/cms-config')` →
  `feature_flags.dark_mode`, Cache aktualisieren und `data-theme` **einmalig**
  korrigieren; bei Fetch-Fehler Fallback „erlaubt/System". — serves `F4` /
  `TC-F4-01`, `TC-F4-02`, `TC-F4-03`
- [x] **T012** theme.js: Floating-Button-Injektion `#dl-theme-toggle` und die
  manuelle API/Zyklus entfernen; bei „erlaubt" `prefers-color-scheme`-Listener
  aktiv, bei „nicht erlaubt" bleibt `light`. — serves `F3` / `TC-F3-01`,
  `TC-F3-02`, `TC-F3-03`

### CMS (eigene Dateien)

- [x] **T013** [P] In [static-site/cms.html](../../static-site/cms.html) im Block
  „Feature-Einstellungen" einen Toggle „🌙 Dark Mode erlauben"
  (`id="feat-darkmode"`) mit Untertitel ergänzen (Muster wie `feat-push`). —
  serves `F1` / `TC-F1-01`
- [x] **T014** In [static-site/cms.js](../../static-site/cms.js)
  `feat-darkmode` in `loadFeatureFlags()` (`fd.checked = flags.dark_mode===true`)
  und `saveFeatureFlags()` (`dark_mode: fd?fd.checked:false`) einbinden;
  übrige Flags unverändert. — serves `F1` / `TC-F1-02`, `TC-F1-03`
  *(nach T013)*

## Tests

- [x] **T020** [P] Playwright F1: CMS lädt Schalter aus `feature_flags`,
  Speichern sendet korrekten POST-Body (Netzwerk-Assert), übrige Flags
  erhalten. — covers `TC-F1-01`, `TC-F1-02`, `TC-F1-03`
- [x] **T021** [P] Playwright F2: `dark_mode=false` erzwingt `light` (trotz
  System-dunkel & gesetztem `dl-theme`, das unverändert bleibt); `dark_mode=true`
  folgt System; Admin-Seiten im Scope; 3 Viewports. — covers `TC-F2-01`,
  `TC-F2-02`, `TC-F2-03`, `TC-F2-04`, `TC-F2-05`
- [x] **T022** [P] Playwright F3: kein `#dl-theme-toggle`; `emulateMedia`-Wechsel
  → live dunkel bei erlaubt, bleibt hell bei nicht erlaubt. — covers
  `TC-F3-01`, `TC-F3-02`, `TC-F3-03`
- [x] **T023** [P] Playwright F4: Cache `'1'` → erster Frame dunkel;
  `route.abort()` auf cms-config → Fallback System; `dark_mode=false` + leerer
  Cache → stabil hell (kein Dauerflackern). — covers `TC-F4-01`, `TC-F4-02`,
  `TC-F4-03`

## Validation & Rollout

- [x] **T030** Gesamte Spec `tests/dark-mode-setting.spec.js` über alle 3
  Viewports grün; Failures fixen. (Konstitution §7/§8)
- [ ] **T031** Commit + Push (SWA-Deploy); Smoke-Test: CMS-Toggle → öffentliche
  Seite + eine Admin-Seite; Default `dark_mode` im CMS bewusst setzen.

## Traceability

| Task | Requirement | Test Cases |
| --- | --- | --- |
| T001 | (Setup) | alle |
| T010 | F2 | TC-F2-01, TC-F2-02, TC-F2-03 |
| T011 | F4 | TC-F4-01, TC-F4-02, TC-F4-03 |
| T012 | F3 | TC-F3-01, TC-F3-02, TC-F3-03 |
| T013 | F1 | TC-F1-01 |
| T014 | F1 | TC-F1-02, TC-F1-03 |
| T020 | F1 | TC-F1-01, TC-F1-02, TC-F1-03 |
| T021 | F2 | TC-F2-01, TC-F2-02, TC-F2-03, TC-F2-04, TC-F2-05 |
| T022 | F3 | TC-F3-01, TC-F3-02, TC-F3-03 |
| T023 | F4 | TC-F4-01, TC-F4-02, TC-F4-03 |
| T030 | alle | alle |
| T031 | (Rollout) | — |
