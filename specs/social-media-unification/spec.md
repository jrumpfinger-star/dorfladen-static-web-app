# Social-Media-Tool Vereinheitlichung — Specification

> Spec-driven development. Diese Spec ist die verbindliche Referenz für den
> Umbau. Ziel: **eine** gemeinsame Implementierung des Social-Media-/Tagespost-
> Tools für CMS, Kiosk und Posten — mit der Kiosk-Optik als Standard und
> **ohne Verlust irgendeiner heute vorhandenen Funktion**.

**Status:** Draft (zur Freigabe)

**Owner:** Dorfladen Oberornau

**Last updated:** 2026-08-18

## Overview

Das „Social Media / Tagespost"-Werkzeug existiert heute in **zwei** getrennten
Code-Basen, die auseinandergedriftet sind:

- **Kiosk** (`kiosk.html`) und **Posten** (`posten.html`) nutzen die gemeinsamen
  Dateien `static-site/js/social.js` + `static-site/js/social-poster.js`
  (Posten erweitert `socialSubTab` nur um einen „Bestellungen"-Tab). Dies ist
  der **Standard** (Kiosk-Social).
- **CMS** (`cms.html`) besitzt eine **eigene, ~1.000 Zeilen umfassende Kopie**
  der Logik in `cms.js` plus ein Inline-Wizard-Skript in `cms.html`. Laut
  Code-Kommentar „ported from kiosk.html" — seither eigenständig weiter­entwickelt.

Folgen: unterschiedliche Optik/Bedienung, Bugs müssen doppelt gefixt werden
(z. B. der WhatsApp-Download-Bug steckte nur in `cms.js`), Features weichen ab
(Geräte-Vorschau nur im CMS; Mehrbild-Serie/Entwürfe im Standard reifer),
und auf Mobile verhält sich der Katalog/Sub-Tab je nach Seite anders.

Zielplattform: statische Site (Vanilla-JS, Canvas-Poster), Azure Static Web App,
Azure Functions API (`/api/social-*`, `/api/tagespost`, `/api/wochenplan` u. a.).

## Goals

- Es gibt **genau eine** Implementierung (`social.js` + `social-poster.js`),
  die von **CMS, Kiosk und Posten** verwendet wird.
- Die **Kiosk-Optik** (Schritt-Assistent 1–4, Sub-Tabs „Neuer Post | Katalog")
  ist die einheitliche Darstellung auf allen drei Seiten.
- **Keine** heute existierende Funktion geht verloren (siehe vollständige
  Funktionsliste unter F1–F6). Die CMS-Extras werden in den Standard portiert.
- Die duplizierte Social-Logik wird aus `cms.js` **entfernt**.
- Bekannte Cross-Varianten-Bugs werden behoben (mobiler Katalog/Sub-Tab).

## Non-Goals

- Kein Redesign des Poster-Aussehens (Canvas-Layout bleibt inhaltlich gleich).
- Keine Änderung der Backend-/API-Verträge.
- Keine Änderung der übrigen Kiosk-/CMS-/Posten-Bereiche außerhalb des
  Social-Tools (Mittagstisch-Kasse, Kalender, Angebote, News etc.).

## Requirements

### F1: Gemeinsame Grundstruktur & Navigation

#### F1 Description

Alle drei Seiten laden dieselbe Implementierung und zeigen dieselbe Struktur:
Sub-Tabs „Neuer Post | Katalog" (Posten zusätzlich „Bestellungen") und den
4-Schritt-Assistenten „1 Titel & Text · 2 Produkte auswählen · 3 Vorschau ·
4 Teilen & Veröffentlichen".

#### F1 Behaviour / Acceptance

- CMS lädt `social.js` + `social-poster.js` (statt eigener `cms.js`-Kopie).
- Die Sub-Tabs und Schritte sind auf allen drei Seiten identisch aufgebaut.
- Umschalten der Sub-Tabs funktioniert auf **Mobile und Desktop** (horizontal
  scrollbar, kein „verschwindender" Tab).

#### F1 Test Cases

**TC-F1-01: CMS nutzt geteilte Skripte**

- **Setup:** CMS-Seite geladen, eingeloggt.
- **Action:** Social-Panel öffnen.
- **Expected:** `window.socialShareWhatsApp` etc. stammen aus `social-poster.js`;
  keine doppelten Social-Funktionsdefinitionen aus `cms.js` mehr aktiv.

**TC-F1-02: Mobiler Sub-Tab „Katalog" sichtbar/erreichbar**

- **Setup:** Kiosk/CMS/Posten auf schmalem Viewport (≤ 480 px).
- **Action:** Social öffnen, „Katalog"-Sub-Tab antippen.
- **Expected:** Der Katalog-Bereich erscheint; der Tab ist nicht abgeschnitten
  oder verschwunden.

### F2: Beitrag zusammenstellen (Schritt 1 + 2)

#### F2 Description

Titel wählen (Dropdown + Freitext-Option), optionaler Freitext, Tag-Auswahl
(Heute/Morgen), Produkte aus Katalog auswählen (Suche + Kategorie-Chips),
freie Produkte ohne Katalog erfassen, Produktbilder hochladen/einfügen,
Mittagessen aus dem Wochenplan einbinden.

#### F2 Behaviour / Acceptance

- Muss enthalten: `socialTitelChange`, Freitext, `socialGetZielDatum`/Heute-
  Morgen, `socialPickFilter`, `socialPickCat`, `socialGatherSelected`,
  `socialFreeAdd/Toggle/Paste/ImgPreview/Remove`, `socialPickImgChange/Paste/
  Preview`, `socialMtBildUpload`, `socialMtPasteFocus`, `socialGetTodayMeals`,
  `socialLoadMtBilder`, `socialBuildPostItems`, `socialRenderFreeItems`.

#### F2 Test Cases

**TC-F2-01: Produkt-Suche + Kategorie-Filter**

- **Setup:** Katalog geladen.
- **Action:** Suchbegriff eingeben und Kategorie-Chip wählen.
- **Expected:** Liste filtert korrekt; Auswahl bleibt erhalten.

**TC-F2-02: Freies Produkt mit eingefügtem Bild**

- **Action:** „Produkt frei erfassen", Bild aus Zwischenablage einfügen.
- **Expected:** Produkt erscheint mit Vorschaubild in der Auswahl.

### F3: Katalog-Verwaltung (Sub-Tab „Katalog")

#### F3 Description

Produkte anlegen/bearbeiten/löschen/speichern, Icons und Kategorien verwalten,
Produktbilder pflegen (Upload/Paste), WhatsApp-/Meta-Katalog-Sync.

#### F3 Behaviour / Acceptance

- Muss enthalten: `socialKatAdd/Edit/Save/Delete/CancelEdit/ImgChange/
  EditPaste/ToggleCat`, `socialKatMgr*`, `socRenderKatManager`,
  `socRenderIconPicker`, `socialSyncMetaCatalog`.

#### F3 Test Cases

**TC-F3-01: Produkt anlegen und speichern**

- **Action:** Neues Produkt mit Name/Preis/Kategorie/Icon anlegen, speichern.
- **Expected:** Produkt erscheint im Katalog und in Schritt 2 wählbar.

### F4: Vorschau (Schritt 3) — inkl. CMS-Extras

#### F4 Description

Live-Vorschau der Poster. **Aus CMS zu übernehmen:** Umschalter
**Poster/TagesInfo**, Geräte-Vorschau **Mobile / iPad Mini / Desktop /
Desktop breit**, TagesInfo-Live-Vorschau per iframe (`/essen-im-dorfladen.html`),
Desktop-Split-View „Bearbeiten | Posts".

#### F4 Inputs

| Input | Required | Description |
| --- | --- | --- |
| Vorschau-Modus | Ja | `poster` oder `tagesinfo` |
| Geräte-Breite | Ja | `mobile` / `ipad` / `desktop` / `wide` |

#### F4 Behaviour / Acceptance

- Muss enthalten: `socialGenPreview`, `socialSetPreviewContent`,
  `socialSetPreviewDevice`, `socDeskTab`, TagesInfo-iframe, Poster-Canvases
  (`soc-post-canvas`, `soc-post-canvas-meal`).
- Auf Touch-Seiten (Kiosk) dürfen die Geräte-/Split-View-Extras vorhanden,
  aber unaufdringlich sein; sie dürfen die Bedienung nicht stören.

#### F4 Test Cases

**TC-F4-01: Geräte-Umschaltung ändert Vorschaubreite**

- **Action:** „iPad Mini" → „Desktop breit" wählen.
- **Expected:** Vorschau-Container ändert die max. Breite entsprechend.

**TC-F4-02: TagesInfo-Vorschau**

- **Action:** Umschalter auf „TagesInfo".
- **Expected:** iframe zeigt die TagesInfo-Seite; Poster-Canvas ausgeblendet.

### F5: Teilen & Veröffentlichen (Schritt 4)

#### F5 Description

Auf WhatsApp teilen (Mehrbild-Serie), auf Instagram teilen, Bild speichern,
auf Homepage als TagesInfo veröffentlichen, Entwürfe parken/bearbeiten/senden,
Poster pro Gericht, Posts-&-Entwürfe-Liste.

#### F5 Behaviour / Acceptance

- Muss enthalten: `socialShareWhatsApp`, `socialShareFiles` (+ Fallbacks),
  `socialBuildPages`/`socialPagesToFiles` (Mehrbild), `socialBuildWhatsAppMsg`,
  `socialShareInstagram`, `socialDownloadPoster`, `socialPublishTagesinfo`,
  `socialSaveDraft`, `socialEditDraft`, `socialPublishDraft`, `socialDeletePost`,
  `socialGetEditingDraftId`, `socialClearEditingDraft`, `socialLoadTodayPosts`,
  `socialGenMealPoster`, `socialSavePost`.
- **Regression-Schutz:** Auf dem Handy erscheint der native Teilen-Dialog
  (kein Datei-Download); kein `clipboard.writeText` VOR `navigator.share`.

#### F5 Test Cases

**TC-F5-01: WhatsApp-Teilen auf Handy**

- **Setup:** Mobiles Gerät mit Web-Share.
- **Action:** „Auf WhatsApp teilen".
- **Expected:** System-Teilen-Dialog mit Bild(ern); kein Download-Dialog.

**TC-F5-02: Als TagesInfo veröffentlichen**

- **Action:** „Auf Homepage veröffentlichen".
- **Expected:** Beitrag erscheint als TagesInfo auf der Website.

**TC-F5-03: Entwurf parken und wieder laden**

- **Action:** „Parken", später aus Liste „Bearbeiten".
- **Expected:** Titel/Text/Produkte werden korrekt wiederhergestellt.

### F6: Aufräumen / Deduplizierung

#### F6 Description

Entfernen der duplizierten Social-Logik aus `cms.js` und des redundanten
Inline-Wizard-Skripts in `cms.html`, sofern durch den Standard abgedeckt.

#### F6 Behaviour / Acceptance

- Keine toten/doppelten `window.social*`-Definitionen mehr aus `cms.js`.
- CMS-spezifische Extras (F4) leben in genau **einer** Datei (bevorzugt im
  Standard, feature-detektiert über vorhandene DOM-Elemente).

#### F6 Test Cases

**TC-F6-01: Keine Doppeldefinition**

- **Expected:** Grep auf `window.socialShareWhatsApp =` findet nur eine aktive
  Quelle für die CMS-Seite (`social-poster.js`).

## Data & Contracts

- API: `/api/social-katalog`, `/api/social-post`, `/api/tagespost`,
  `/api/wochenplan`, `/api/meta-catalog` (unverändert).
- DOM-IDs, die stabil bleiben müssen: `soc-post-titel`, `soc-post-titel-sel`,
  `soc-post-text`, `soc-post-items`, `soc-post-canvas`, `soc-post-canvas-meal`,
  `soc-tagesinfo-frame`, `soc-subtabs-container`, `soc-step-1..4`,
  `soc-post-status`, `soc-today-posts-list`.

## Open Questions

- Keine offenen Punkte — Umfang durch den Nutzer bestätigt: Kiosk-Optik als
  Standard, **alle** Funktionen (F1–F5) müssen erhalten bleiben.

## Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 | TC-F1-01, TC-F1-02 | — | — |
| F2 | TC-F2-01, TC-F2-02 | — | — |
| F3 | TC-F3-01 | — | — |
| F4 | TC-F4-01, TC-F4-02 | — | — |
| F5 | TC-F5-01, TC-F5-02, TC-F5-03 | — | — |
| F6 | TC-F6-01 | — | — |
