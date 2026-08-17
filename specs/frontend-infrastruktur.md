# Frontend-Infrastruktur (Core JS) – Spec

> **Feature-ID**: FRONTEND-INFRA
> **Status**: Bestand (retrospektiv dokumentiert)
> **Erstellt**: 2026-07-07

---

## 1. Überblick

Gemeinsame Frontend-Bausteine, die auf allen Seiten geladen werden: App-Init und
Utilities (`app.js`), mobile UX (`mobile.js`), Umgebungs-Warnbanner
(`env-banner.js`) und ein globaler Bestätigungsdialog (`dl-confirm.js`).

**Betroffene Dateien:**
- `static-site/js/app.js`, `static-site/js/mobile.js`, `static-site/js/env-banner.js`, `static-site/js/dl-confirm.js`

## 2. Non-Goals

- Keine Geschäftslogik – nur Querschnitt/UX.

## 3. Requirements

### F1: App-Init & Utilities (`app.js`)

#### F1 Behaviour / Acceptance

- Setzt `API_BASE='/api'`; lädt CMS-Config beim Start (Hero-Text, Feature-Flags, Layout).
- Setzt `data-template`/`data-layout` am `<html>`; auf Staging (`witty-island`) sind alle Feature-Flags aktiv.
- Stellt Utilities bereit (Datum/Zeit, Preisformat, HTML-Escaping, Wochentagsnamen); injiziert `dl-confirm.js` bei Bedarf; prüft Cookie-Consent (localStorage).

#### F1 Test Cases

**TC-FRONTEND-INFRA-F1-01: Config lädt**
- **Expected:** Hero-Text/Feature-Flags aus CMS angewandt.

**TC-FRONTEND-INFRA-F1-02: Preis-/Datumsformat**
- **Expected:** Utilities liefern deutsches Format (`2,99 €`).

### F2: Mobile-UX (`mobile.js`)

#### F2 Behaviour / Acceptance

- Nur aktiv bei `innerWidth <= 768`; Popup-Öffnen/-Schließen mit Scroll-Lock, Swipe-down-to-close, Escape schließt Popups/Menü.

#### F2 Test Cases

**TC-FRONTEND-INFRA-F2-01: Nur mobil**
- **Setup:** Breite > 768.
- **Expected:** Mobile-Logik greift nicht.

### F3: Umgebungs-Banner (`env-banner.js`)

#### F3 Behaviour / Acceptance

- Zeigt rotes Banner + Umrandung auf Nicht-Prod-Hosts (`proud-dune`, `witty-island`, `dorfladen-test`); versteckt in Popups/iframes.

#### F3 Test Cases

**TC-FRONTEND-INFRA-F3-01: Staging-Warnung**
- **Setup:** Host `witty-island…`.
- **Expected:** Banner sichtbar.

**TC-FRONTEND-INFRA-F3-02: Prod ohne Banner**
- **Setup:** Produktions-Host.
- **Expected:** Kein Banner.

### F4: Bestätigungsdialog (`dl-confirm.js`)

#### F4 Behaviour / Acceptance

- `window.dlConfirm(opts, onConfirm)` – konfigurierbares Modal (Icon, Titel, Text, Button-Label/-Farbe); Fade/Slide-Animation; Escape/Klick-außerhalb bricht ab.

#### F4 Test Cases

**TC-FRONTEND-INFRA-F4-01: Bestätigen**
- **Expected:** `onConfirm` läuft bei Bestätigung; Abbruch schließt ohne Callback.

## 4. Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 | TC-FRONTEND-INFRA-F1-01..02 | — | — |
| F2 | TC-FRONTEND-INFRA-F2-01 | — | — |
| F3 | TC-FRONTEND-INFRA-F3-01..02 | — | — |
| F4 | TC-FRONTEND-INFRA-F4-01 | — | — |
