# Admin-Flächen & Popups auf Lucide + einheitliches UI — Specification

> Spec-driven development template. Fill every section. Mark unknowns with
> `[NEEDS CLARIFICATION: question]` — a spec with open markers may NOT proceed
> to `/plan`. Placeholders are written as `{like this}`.

**Status:** Draft

**Owner:** Josef Rumpfinger / GitHub Copilot

**Last updated:** 2026-07-07

## Overview

Die öffentlichen Seiten wurden bereits auf zentrale Lucide-Initialisierung und
Dark-Mode-Lesbarkeit angepasst. In den Admin-Flächen bestehen jedoch weiterhin
uneinheitliche Icons (teilweise Emojis/Alt-Icons), unterschiedliche Popup-
Stile und inkonsistente Interaktionen.

Diese Spezifikation definiert eine einheitliche Umstellung für alle
Admin-relevanten Oberflächen im `static-site/`-Bereich (u. a. CMS,
Kiosk, Shop-Admin, Bestell-/Pack-Ansichten) auf ein konsistentes Lucide- und
Popup-System mit responsivem Verhalten auf Mobile, iPad mini und Desktop.

## Goals

- Einheitliche, professionelle Icon-Sprache (Lucide) in allen Admin-Flächen.
- Einheitliches Popup-/Dialog-/Bottom-Sheet-Verhalten in allen Admin-Flächen.
- Dark-Mode-Lesbarkeit und visuelle Konsistenz für Admin-Navigation,
  Aktions-Buttons und Popup-Inhalte.
- Testbare Akzeptanz inkl. automatisierter Playwright-Abdeckung auf 3 Viewports.

## Non-Goals

- Keine funktionalen Änderungen an Geschäftslogik (Bestellstatus,
  Preisberechnung, Dataverse-Verträge).
- Keine Neugestaltung der öffentlichen Informationsseiten außerhalb der
  Admin-Use-Cases.
- Keine Migration auf neues Frontend-Framework; bestehende Architektur bleibt.

## Requirements

### F1: Lucide-Standard in allen Admin-Flächen

#### F1 Description

Alle Admin-Flächen verwenden Lucide-Icons konsistent; Emojis und heterogene
Alt-Icon-Muster werden für produktive, klickbare UI-Elemente entfernt.

#### F1 Inputs

| Input | Required | Description |
| --- | --- | --- |
| `admin_pages` | Yes | Liste der Admin-Seiten (z. B. `cms.html`, `kiosk.html`, `shop-admin.html`, `pack.html`, `bestellungen.html`, `portal.html`, `lunch-admin.html`) |
| `icon_mapping` | Yes | Mapping Alt-Icon/Emoji → Lucide-Name |
| `theme_loader` | Yes | Zentrale Icon-Initialisierung (`theme.js` oder äquivalenter Loader) |

#### F1 Behaviour / Acceptance

- Alle klickbaren Admin-UI-Icons werden über `<i data-lucide="..."></i>` gerendert.
- Es verbleiben keine produktiven Emoji-Icons in Admin-Navigation,
  Admin-Toolbar, Aktionsbuttons oder Listen-Actions.
- Dynamisch gerenderte Admin-Elemente triggern eine Icon-Neuinitialisierung,
  damit Icons nach DOM-Updates sichtbar bleiben.

#### F1 Test Cases

#### TC-F1-01: Statische Admin-Icons sind Lucide

- **Setup:** Admin-Seite laden (z. B. `shop-admin.html`) im Desktop-Viewport.
- **Action:** DOM der Aktions-/Navigationsleiste prüfen.
- **Expected:** Icons sind als Lucide-SVG gerendert; keine Emoji-Zeichen in
  klickbaren Icon-Buttons.

#### TC-F1-02: Dynamische Admin-Icons nach Render-Update

- **Setup:** Seite mit dynamischen Listen (z. B. CMS/Bestellungen) laden.
- **Action:** UI-Update auslösen (Filter/Refresh/Tab-Wechsel).
- **Expected:** Neu hinzugefügte Buttons zeigen Lucide-Icons korrekt an.

### F2: Einheitliches Popup-/Dialog-/Bottom-Sheet-Verhalten in Admin-Flächen

#### F2 Description

Alle Admin-Popups folgen einem gemeinsamen Verhalten für Öffnen/Schließen,
Scroll-Lock, Fokus/Interaktion und visuelle Struktur.

#### F2 Inputs

| Input | Required | Description |
| --- | --- | --- |
| `popup_components` | Yes | Alle Admin-Modaltypen: Dialog, Sheet, Bestätigungsdialog, Auswahl-Popup |
| `close_triggers` | Yes | X-Button, Backdrop, Escape, ggf. Android-Back |
| `scroll_lock_api` | Yes | Standardisierte Lock/Unlock-Methoden |

#### F2 Behaviour / Acceptance

- Jeder Admin-Popup-Typ nutzt ein konsistentes Header-/Body-/Footer-Layout.
- Hintergrundscroll wird beim Öffnen zuverlässig gesperrt und beim Schließen
  korrekt wiederhergestellt.
- Schließen funktioniert über definierte Trigger konsistent; keine
  versehentlichen Schließer bei internen Klicks (z. B. Dropdown im Modal).
- Popups bleiben auf Mobile (375×667), iPad mini (768×1024) und Desktop
  (1280×800) ohne Overflow und ohne unbenutzbare Bedienelemente.

#### F2 Test Cases

#### TC-F2-01: Scroll-Lock robust

- **Setup:** Admin-Seite mit langem Hintergrund-Content.
- **Action:** Popup öffnen, im Hintergrund scrollen versuchen, schließen.
- **Expected:** Während Popup offen kein Hintergrundscroll; nach Schließen ist
  ursprüngliche Scroll-Position wiederhergestellt.

#### TC-F2-02: Konsistente Close-Trigger

- **Setup:** Admin-Popup geöffnet.
- **Action:** Nacheinander X, Backdrop, Escape betätigen.
- **Expected:** Popup schließt konsistent; kein UI-Deadlock.

#### TC-F2-03: Keine Fehlschließung bei interner Interaktion

- **Setup:** Popup mit internem Dropdown/Picker geöffnet.
- **Action:** Interne Auswahl treffen.
- **Expected:** Popup bleibt offen; nur die Zielaktion wird ausgeführt.

### F3: Dark-Mode-Lesbarkeit und visuelle Konsistenz in Admin-Flächen

#### F3 Description

Admin-Flächen erhalten konsistente Kontraste und Farbregeln für Aktionslinks,
Buttons, Popup-Texte und Status-Badges in Dark Mode.

#### F3 Inputs

| Input | Required | Description |
| --- | --- | --- |
| `theme_tokens` | Yes | Definierte Farb-/Kontrasttokens für Dark Mode |
| `admin_link_selectors` | Yes | Selektoren/Klassen für Aktionslinks (inkl. inline-color Altfälle) |
| `status_badges` | Yes | Farbregeln für Status-Chips (z. B. Neu, Bestätigt, Abholbereit) |
| `system_color_modes` | Yes | OS-/Browser-Modi: `forced-colors`, `prefers-contrast` |

#### F3 Behaviour / Acceptance

- Alle Admin-Aktionslinks sind im Dark Mode eindeutig lesbar.
- Status-Badges und Popup-Text erfüllen ausreichenden Kontrast.
- Es gibt keine Seite, auf der Admin-Aktionslinks durch inline-Styles im Dark
  Mode unlesbar werden.
- Alle Texte in Admin-Flächen und Popups sind auch für 60+ Nutzer:innen gut
  lesbar (klare Kontraste, ausreichende Schriftgröße, keine zu dünnen Fonts).
- System-Kontrastmodi bleiben nutzbar: In `forced-colors: active` sind Texte,
  Icons, Fokuszustände und Buttons sichtbar/bedienbar.

#### F3 Test Cases

#### TC-F3-01: Admin-Aktionslinks im Dark Mode lesbar

- **Setup:** Dark Mode aktiv, jede Admin-Seite öffnen.
- **Action:** Nav/Toolbar/Footer-Aktionslinks visuell und per CSS-Assertion prüfen.
- **Expected:** Lesbare Farben gemäß Theme-Regeln; keine dunkel-auf-dunkel Kombination.

#### TC-F3-02: Popup-Kontrast im Dark Mode

- **Setup:** Dark Mode aktiv, Admin-Popup öffnen.
- **Action:** Titel, Text, Status-Chips und Primär/Sekundär-Buttons prüfen.
- **Expected:** Alle Kernelemente sind lesbar und visuell konsistent.

#### TC-F3-03: Lesbarkeit für 60+ in Light und Dark Mode

- **Setup:** Relevante Admin-Seite und zugehöriges Popup in Light Mode und Dark Mode öffnen.
- **Action:** Kritische Textelemente (Titel, Fließtext, Labels, Button-Texte, Status-Badges)
  visuell und per Kontrast-Check prüfen.
- **Expected:** Text ist auf dem Hintergrund klar lesbar; kein dunkel-auf-dunkel oder
  hell-auf-hell; kritische Textelemente erfüllen mindestens WCAG AA.

#### TC-F3-04: High-Contrast/Systemfarben (forced-colors)

- **Setup:** Windows High Contrast / `forced-colors: active` simulieren oder aktivieren.
- **Action:** Admin-Seite + Popup öffnen; Fokusnavigation und zentrale Aktionen prüfen.
- **Expected:** Inhalte bleiben sichtbar und bedienbar; keine unsichtbaren Texte/Icons;
  Fokusindikatoren sind klar erkennbar.

### F4: Automatisierte Regressionstests für Admin-Flächen (3 Viewports)

#### F4 Description

Die Umstellung wird durch Playwright regressionssicher gemacht, inkl. Admin-
Flows, Popup-Verhalten und Icon-Prüfungen auf Mobile, iPad mini, Desktop.

#### F4 Inputs

| Input | Required | Description |
| --- | --- | --- |
| `playwright_projects` | Yes | `mobile`, `ipad-mini`, `desktop` |
| `admin_test_specs` | Yes | Relevante Spezifikationsdateien unter `tests/` |
| `test_url` | Yes | Live-/Staging-URL für E2E-Tests |

#### F4 Behaviour / Acceptance

- Neue/aktualisierte Tests decken mindestens die kritischen Admin-Popup-Flows
  und Icon-Rendering-Pfade ab.
- Tests laufen in allen drei Viewports ohne horizontalen Overflow,
  abgeschnittene Dialoge oder unbedienbare Controls.
- Tests enthalten explizit Lesbarkeitsprüfungen für Texte auf Hintergründen
  (inkl. 60+-Zielgruppe) in Light und Dark Mode.

#### F4 Test Cases

#### TC-F4-01: Admin-Popup-Flow auf 3 Viewports

- **Setup:** Playwright-Projekte `mobile`, `ipad-mini`, `desktop`.
- **Action:** Relevante Admin-Flow-Tests ausführen (Popup öffnen/interagieren/schließen).
- **Expected:** Alle Tests grün; keine viewport-spezifischen Layoutfehler.

#### TC-F4-02: Lucide-Rendering-Regressionstest

- **Setup:** Admin-Seitenaufruf in Playwright.
- **Action:** Auf zentrale UI-Bereiche Assertions für vorhandene Lucide-SVGs ausführen.
- **Expected:** Erwartete Icon-Knoten vorhanden; keine Emoji-Fallbacks in Zielbereichen.

## Data & Contracts

- **UI-Contract (Icons):** Klickbare Admin-Icons nutzen `data-lucide`.
- **UI-Contract (Popup):** Gemeinsame Struktur und standardisierte Open/Close-
  Semantik inkl. Scroll-Lock.
- **Theme-Contract:** Admin-Aktionslinks und Popup-Elemente nutzen Dark-Mode-
  Tokens/Klassen statt uneinheitlicher inline Einzelregeln.
- **Test-Contract:** Playwright läuft gegen konfigurierte Live-/Staging-URL;
  die drei Standardprojekte sind Pflicht.

## Open Questions

- Verbindlicher Scope „Admin-Flächen“:
  `cms.html`, `kiosk.html`, `shop-admin.html`, `bestellungen.html`, `pack.html`,
  `portal.html`, `lunch-admin.html`, `shop-freigabe.html`.
- Interne Wartungs-/Hilfsdialoge sind **in Scope**, sofern sie in den genannten
  Seiten produktiv nutzbar sind.
- Popup-Umstellung umfasst **UI + A11y-Basisstandard**:
  Fokusfalle, `role="dialog"`/`aria-modal`, erreichbare Close-Controls,
  Escape-Schließen.
- Statusfarben-Standard (verbindlich):
  `Neu` = Blau, `Bestätigt` = Indigo, `Abholbereit` = Grün,
  `In Bearbeitung` = Orange, `Fehler` = Rot;
  jeweils mit Textlabel und WCAG-AA-konformen Kontrasten.
- Formale Abnahme erfolgt auf `feature/bestellsystem` (mit finalem Smoke-Check
  auf `dev` vor Merge).
- Lesbarkeitsgrenze ist **hart**: mindestens WCAG AA für kritische Textelemente,
  plus Mindestschriftgrößen gemäß `specs/conventions.md`.

## Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 | TC-F1-01, TC-F1-02 | — | — |
| F2 | TC-F2-01, TC-F2-02, TC-F2-03 | — | — |
| F3 | TC-F3-01, TC-F3-02, TC-F3-03, TC-F3-04 | — | — |
| F4 | TC-F4-01, TC-F4-02 | — | — |
