# Social-Media-Tool Vereinheitlichung — Tasks

> Derived from `plan.md`. Geordnete, testbare Aufgaben. Eine Aufgabe ist erst
> „done", wenn die zugeordneten Test Cases (`TC-Fn-xx`) grün sind.

**Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)

## Phase 0 — Test-Harness

- [x] T00: Lokaler Mock-Server (`/api/*`) + Playwright-Setup. Kein Deploy.

## Phase 1 — Vorschau bereinigen (tote CMS-Buttons)

- [x] T10–T13: `socialSetPreviewDevice`/`socialSetPreviewContent` waren nirgends
  definiert (tote Buttons) → entfernt inkl. TagesInfo-iframe; funktionierende
  Canvas-Vorschau bleibt. (Ersetzt die ursprgl. Portierungs-Idee.) → TC-F4-01

## Phase 2 — CMS auf geteilte Skripte umstellen

- [x] T20: CMS-Social-Markup war bereits kiosk-nah (Sub-Tabs + Wizard 1–4).
- [x] T21: `cms.html` lädt `dl-confirm.js` + `social.js` + `social-poster.js`;
  Brücke stellt `SOCIAL_MEALS` (aus Wochenplan `meals`), `_socSelectedDay`,
  `_cmsMtBilder`, `dlImagePopup` bereit. → TC-F2-*
- [x] T22: Panel-Init nutzt geteilte Loader (`socialLoadKatalog`,
  `socialBuildPostItems`, `socialLoadMtBilder`). → TC-F2/F3
- [x] T23: End-to-End lokal + produktiv verifiziert (Katalog 13 Produkte,
  Produktauswahl, Vorschau, Teilen, Veröffentlichen). → TC-F2/F3/F4/F5

## Phase 3 — Deduplizieren

- [x] T30: Doppel-Block (9921–12300, ~2380 Zeilen) aus `cms.js` entfernt. → TC-F6-01
- [x] T31: Tote Vorschau-Buttons/iframe entfernt (Phase 1).
- [x] T32: `node --check` grün; keine Konsolen-Fehler; Kiosk-Regression geprüft.

## Phase 4 — Mobile-Katalog/Sub-Tab

- [x] T40: `.k-filter-bar` mit `overflow-x:auto` (aus früherer Sitzung) greift
  jetzt einheitlich, da CMS dieselbe Sub-Tab-Logik nutzt. → TC-F1-02

## Phase 5 — Gesamtverifikation & Rollout

- [x] T50: CMS + Kiosk lokal grün, CMS produktiv grün (echte API, 13 Produkte).
- [x] T51: Commit je Phase; deployed nach grüner Verifikation.
