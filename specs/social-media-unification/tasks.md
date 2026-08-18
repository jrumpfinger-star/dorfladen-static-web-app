# Social-Media-Tool Vereinheitlichung — Tasks

> Derived from `plan.md`. Geordnete, testbare Aufgaben. Eine Aufgabe ist erst
> „done", wenn die zugeordneten Test Cases (`TC-Fn-xx`) grün sind.

**Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)

## Phase 0 — Test-Harness

- [ ] T00: Lokaler Mock-Server (`/api/*` inkl. `social-katalog`, `wochenplan`,
  `tagespost`, `social-post`) + Playwright-Setup. Kein Deploy.

## Phase 1 — CMS-Extras in den Standard portieren (feature-detektiert)

- [ ] T10: `socialSetPreviewDevice(mobile|ipad|desktop|wide)` in `social-poster.js`
  (No-Op ohne `#soc-preview-shell`). → TC-F4-01
- [ ] T11: `socialSetPreviewContent(poster|tagesinfo)` + TagesInfo-iframe-Logik in
  `socialGenPreview` (No-Op ohne `#soc-tagesinfo-frame`). → TC-F4-02
- [ ] T12: `socDeskTab(edit|posts)` Desktop-Split-View feature-detektiert. → TC-F4-*
- [ ] T13: Verifizieren, dass Kiosk/Posten unverändert funktionieren (keine der
  Elemente vorhanden → No-Op). → TC-F1-01

## Phase 2 — CMS auf geteilte Skripte umstellen

- [ ] T20: `cms.html` Social-Markup an Kiosk angleichen (Sub-Tabs + Wizard 1–4,
  Preview-Extra-Markup behalten). → TC-F1-01
- [ ] T21: `cms.html` lädt `social.js` dann `social-poster.js`; stellt
  `SOCIAL_MEALS`, `_socSelectedDay`, Titel-/Tag-Inline bereit. → TC-F2-*
- [ ] T22: CMS-Social-Panel-Init auf geteilte Loader umstellen
  (`socialLoadKatalog`, `socialBuildPostItems`, `socialLoadTodayPosts`). → TC-F2/F3
- [ ] T23: End-to-End im CMS lokal: Beitrag zusammenstellen, Vorschau, Teilen,
  Veröffentlichen, Entwurf. → TC-F2/F3/F4/F5

## Phase 3 — Deduplizieren

- [ ] T30: Duplizierte Social-Funktionen aus `cms.js` entfernen (nur eindeutig
  Social-Code; Nicht-Social unberührt). → TC-F6-01
- [ ] T31: Redundantes Inline-Wizard-Skript in `cms.html` bereinigen. → TC-F6-01
- [ ] T32: Syntax-/Regressionsprüfung (`node --check`, Playwright-Suite).

## Phase 4 — Mobile-Katalog/Sub-Tab-Fix

- [ ] T40: Sub-Tab „Katalog" auf Mobile in allen 3 Seiten sichtbar/erreichbar;
  Katalog-Inhalt lädt. → TC-F1-02

## Phase 5 — Gesamtverifikation & Rollout

- [ ] T50: Alle TC-Fn-xx grün auf CMS + Kiosk + Posten, Mobile + Desktop.
- [ ] T51: Commit je Phase; Deploy (Push → Azure SWA) erst nach grüner
  Gesamtverifikation.
