# Waagen-Design unter „Design" — Tasks

> Abgeleitet aus [plan.md](./plan.md). Reihenfolge von oben nach unten, sofern
> nicht `[P]`. Eine Aufgabe ist erst erledigt, wenn ihre Testfälle laufen.

**Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
**Mockup:** [waage-design-mockup.html](../../mockups/waage-design-mockup.html) (abgenommen)

## Setup

- [x] T001 Mockup erstellen und abnehmen lassen —
  `TC-F6-01` (Mockup-Variante `TC-WDM-01…04`)
- [x] T002 Zielmodell-Analyse (`targetSizes`, `target !== 'scale'`, Backend-
  Validierungen) — Ergebnis in Plan „Risks"

## Backend

- [x] T010 `api/shared/angebote.py`, `api/angebote/__init__.py`: Ziel `scale_small`
  (800 × 280) in allen Ziel-Mengen, Maßen und Provenienz zulassen;
  `design()` / `save_design()` nehmen optionale `scale_large`, `scale_small` an —
  `F3`, `F4`
- [x] T011 [P] Backend-Test: altes Designdokument ohne `scale_*` lesbar, neues
  mit `scale_*` gespeichert, ungültige Ziele abgelehnt — `TC-F3-01`

## Modell

- [x] T020 `angebote-modell.js`: Ziel `scale_small`, Geometrie in
  `targetTemplate`, `isScale()` statt `target !== 'scale'`, Zielnamen, leere
  Ziele über Hilfsfunktion — `F2`
- [x] T021 `angebote-modell.js`: `blank(kind, defaults, scaleStandards)` belegt
  `target_styles.scale` / `scale_small` nur bei vorhandenem Standard — `F4`
- [x] T022 `scaleImages`: kleines Profil nutzt Ziel `scale_small` — `F2`, `F4`
- [x] T023 `cms-angebote.js`, `angebote-editor.js`: Neuanlage reicht
  Waagen-Standards weiter; Ausgabeziel „Waage klein“; „Designstandards
  übernehmen“ je Ziel — `TC-F4-01`, `TC-F4-02`

## Oberfläche Design

- [x] T030 `angebote-design.js`: `mount` auf Art-Konfiguration verallgemeinern
  (`drinks`, `scale_large`, `scale_small`), Vorschau je Profil, nicht anwendbare
  Felder ausblenden — `F1`, `F2`, `F3`
- [x] T031 `cms-klassisch.html`, `cms.js`: Reiter „Waage groß/klein“ in
  `cfg-section-nav`, Container, `cfgSwitchSection`; Generator + Abgleich —
  `F1`, `TC-F1-01`, `TC-F1-02`
- [x] T032 Wochenplan-Design: Abschnitte `wp-sec-waage-large/-small`
  (Farben, Schriftgröße, Schriftart, Live-Vorschau, Speichern in
  `cms-config wp_waage_design`) — `F5`
- [x] T033 `waageWochenplan` liest `wp_waage_design`; ohne Schlüssel unverändert —
  `TC-F5-01`, `TC-F5-02`
- [x] T034 „Aktion im Querformat“ (`waageAktionBilder`) liest den Standard
  lesend — `F4`

## Tests

- [x] T040 `tests/cms-waage-design.spec.js`: TC-F1…TC-F6 mit gemockter API,
  vier Zielgrößen
- [x] T041 Regression: `cms-angebote-ablauf`, `cms-wochenplan`,
  `cms-waage-werbung`, Backend-Tests

## Validierung & Rollout

- [ ] T050 Build `tools/build-cms-neu.js`, `node tools\pruef-cms-abgleich.js`
- [ ] T051 Nachführung Spec/Plan/Tasks, Abnahmenachweise
- [ ] T052 Commit/Push/Preview nur nach ausdrücklicher Freigabe

## Traceability

| Task | Requirement | Test Cases |
| --- | --- | --- |
| T010, T011 | F3, F4 | TC-F3-01 |
| T020–T023 | F2, F4 | TC-F2-01, TC-F4-01, TC-F4-02 |
| T030, T031 | F1, F2, F3 | TC-F1-01, TC-F1-02, TC-F2-01, TC-F2-02, TC-F3-01, TC-F3-02 |
| T032, T033 | F5 | TC-F5-01, TC-F5-02 |
| T034 | F4 | TC-F4-01 |
| T040, T041 | F6 | TC-F6-01, TC-F6-02 |
