# Kiosk: Wochenplan im Menü, Getränke ans Ende — Tasks

**Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)

- [x] **T001** Tests: `tests/kiosk-wochenplan.spec.js` mit TC-F1-01, F1-03, F2-01, F3-01…05, F6-01. Alle API-Aufrufe abgefangen, nichts Echtes geschrieben.
- [x] **T002** `tests/cms-angebote-ablauf.spec.js` (Reiterreihenfolge) angepasst. — TC-F1-01
- [x] **T003** CMS-Embed-Modus in `cms.js`. — TC-F3-01, TC-F3-04
- [x] **T004** Kiosk-Quelle `kiosk-klassisch.html`: Panel mit Rahmen, `switchTab`-Laden beim ersten Öffnen, Layout ohne Seitenscroll. — TC-F2-01, TC-F3-02, TC-F3-03, TC-F3-05
- [x] **T005** `panel-wochenplan` in `isBusy()`. — TC-F4-01
- [x] **T006** Generator `tools/build-kiosk-neu.js` anpassen, `kiosk.html`/`kiosk-neu.html` erzeugen. — TC-F1-01, TC-F1-03
- [x] **T007** Vier Zielgrößen (375×667, 768×1024, 1280×800, 686×1095) prüfen. — TC-F6-01
- [x] **T008** Regression: `kiosk-*`, `cms-*`, `angebote-flyer`, Generator-Tests grün (sechs Getränke/Listen/Tagesleiste-Tests auf `desktop` schlagen schon ohne diese Änderung fehl).
- [ ] **T009** Auf Freigabe committen, pushen, Preview deployen, live prüfen.
