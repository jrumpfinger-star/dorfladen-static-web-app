# Social-Media-Tool Vereinheitlichung — Implementation Plan

> Derived from `spec.md`. Übersetzt *was* (Spec) in *wie*. Keine neuen
> Verhaltensweisen — falls nötig, zuerst die Spec anpassen.

**Spec:** [spec.md](./spec.md)

**Status:** Draft

## Constitution Check

- [x] Spec exists and has no open `[NEEDS CLARIFICATION]` markers
- [x] On-prem compatibility respected (rein clientseitig, keine neuen Cloud-APIs)
- [x] No secrets introduced into the repo
- [x] Follows existing folder conventions (`static-site/js/`, `specs/…`)

## Technical Approach

Der Standard besteht aus zwei geladenen Skripten in fester Reihenfolge:

1. `static-site/js/social.js` — definiert `var API = window.SOCIAL_API || '/api'`,
   die UI-/Daten-Logik (Sub-Tabs, Wizard Schritt 1–2, Katalog-Verwaltung,
   Produktauswahl, freie Produkte, Mittagessen laden) und exportiert
   `window._socialModule = {esc, API, socialStatus, socialGatherSelected, …}`.
   Initialisiert per `_socialInit()` auf `DOMContentLoaded`.
2. `static-site/js/social-poster.js` — liest `M = window._socialModule` und
   `API = M.API`; enthält Poster-Zeichnen, Vorschau, Mehrbild-Serie, Teilen,
   Veröffentlichen, Entwürfe. **Setzt voraus, dass `social.js` vorher geladen ist.**

Die Seiten liefern Kontext: `window.SOCIAL_MEALS()` (Mittagessen aus Wochenplan),
`window._socSelectedDay` (heute/morgen) und kleine Inline-Skripte (Titel-Optionen,
Tag-Umschalter). Kiosk und Posten tun das bereits; **CMS wird analog umgestellt**.

Die CMS-Extras (Geräte-Vorschau, Poster/TagesInfo-Umschalter, TagesInfo-iframe,
Desktop-Split-View) werden **in den Standard portiert** und über
**DOM-Feature-Detection** aktiviert: Fehlt das jeweilige Element (z. B. auf dem
Kiosk), ist die Funktion ein No-Op. So bleibt Kiosk/Posten unverändert.

## Key Decisions

| Decision | Options considered | Choice & rationale |
| --- | --- | --- |
| Kanonische Basis | cms.js vs. social.js+social-poster.js | **social.js+social-poster.js** — bereits von 2 von 3 Seiten genutzt, reifer (Entwürfe, Mehrbild-Serie), Nutzer-Vorgabe „Kiosk ist Default". |
| CMS-Extras | im CMS belassen vs. in Standard portieren | **In Standard portieren**, feature-detektiert. Sonst bleibt Dupl-Logik bestehen. |
| Vorgehen | Big-Bang vs. Phasen | **Phasen** mit lokalem Mock-Server + Playwright-Verifikation je Phase; Deploy erst nach voller lokaler Verifikation aller 3 Seiten. |
| cms.js Social-Code | löschen vs. auskommentieren | **Löschen** (nach erfolgreicher Umstellung), da tote Duplikate Fehlerquelle sind. |

## Architecture

```
        social.js  ──exports──►  window._socialModule
            │                          │
            ▼                          ▼
     (UI, Katalog, Wizard 1-2)   social-poster.js (Poster, Preview, Share, Drafts)
            ▲                          ▲
            │  window.SOCIAL_MEALS, _socSelectedDay, Titel/Tag-Inline
            │
   ┌────────┼─────────┬───────────────┐
 kiosk.html   posten.html          cms.html   ← alle laden dieselben 2 Skripte
```

CMS-Extras (neu im Standard, feature-detektiert per Element-Präsenz):
`socialSetPreviewDevice`, `socialSetPreviewContent`, TagesInfo-iframe-Handling,
`socDeskTab` (Desktop-Split-View).

## File-Level Change Map

| Path | Change | Purpose |
| --- | --- | --- |
| `static-site/js/social-poster.js` | edit | CMS-Extras portieren: `socialSetPreviewDevice`, `socialSetPreviewContent`, TagesInfo-iframe in `socialGenPreview`; feature-detektiert. |
| `static-site/js/social.js` | edit (falls nötig) | ggf. `socDeskTab` + kleine Helfer, feature-detektiert. |
| `static-site/cms.html` | edit | Social-Markup an Kiosk angleichen; `social.js`+`social-poster.js` laden (richtige Reihenfolge); `SOCIAL_MEALS`/`_socSelectedDay`/Titel-Inline bereitstellen; Preview-Extra-Markup behalten. |
| `static-site/cms.js` | edit | Duplizierte Social-Funktionen entfernen; Social-Panel-Init auf die geteilte Logik umstellen (`socialLoadKatalog`, `socialBuildPostItems`, `socialLoadTodayPosts`). CMS-fremde Teile unberührt lassen. |
| `static-site/kiosk.html`, `static-site/posten.html` | edit (nur falls Mobile-Katalog-Fix nötig) | Sub-Tab/Katalog-Darstellung auf Mobile sicherstellen. |

## Test Strategy

- **Lokaler Harness:** Node-Mock-Server (liefert `/api/*`), Playwright.
- **Integration/E2E je Seite (CMS, Kiosk, Posten), Mobile + Desktop:**
  - F1: geteilte Skripte aktiv, Sub-Tabs auf Mobile bedienbar (TC-F1-01/02).
  - F2: Produktsuche/Filter, freies Produkt mit Bild (TC-F2-01/02).
  - F3: Produkt anlegen/speichern (TC-F3-01).
  - F4: Geräte-Umschaltung, TagesInfo-Vorschau (TC-F4-01/02).
  - F5: WhatsApp-Teilen (kein Download), Veröffentlichen, Entwurf (TC-F5-01/02/03).
  - F6: keine Doppeldefinition (TC-F6-01, grep).
- **Regressionslauf:** vorhandene Playwright-Suite.

## Risks & Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| CMS bricht (täglich genutzt) | Hoch | Phasen + lokale Verifikation; Deploy erst nach vollständigem Test aller 3 Seiten; kleiner, gut isolierter Diff je Phase. |
| Verdeckte Kopplung cms.js ↔ Social | Mittel | Vor dem Löschen prüfen, welche Nicht-Social-Teile die Funktionen aufrufen; nur eindeutig Social-Code entfernen. |
| Ladereihenfolge social.js→poster.js | Mittel | In cms.html strikt in dieser Reihenfolge einbinden; nach Umbau prüfen. |
| Feature-Detection greift nicht auf Kiosk | Mittel | Extras nur ausführen, wenn Ziel-Element existiert; Kiosk/Posten nach Portierung erneut testen. |

## Rollout

- Umsetzung in Phasen, jede Phase lokal verifiziert (Mock-Server + Playwright).
- Commit je Phase mit klarer Nachricht; Deploy (Push → Azure SWA CI/CD) **erst
  nach** grüner Verifikation aller drei Seiten.
- Versions-Bump erfolgt automatisch via CI (`[skip ci]`-Bumps).
