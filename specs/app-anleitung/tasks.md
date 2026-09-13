# App-Anleitung unter /app — Tasks

**Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)

## Conventions

- Von oben nach unten, außer bei `[P]`.
- Eine Aufgabe gilt erst als erledigt, wenn ihre Testfälle laufen.
- Umlaute: bestehende Dateien nur über das `edit`-Werkzeug ändern.

## Setup

- [x] T001 Ordner `static-site/images/anleitung/` anlegen

## Core Implementation

- [x] T002 [P] QR-Code auf `https://dorfladen-oberornau.de/app` erzeugen, mit
      einem Decoder gegenlesen und als `images/anleitung/qr-app.svg` ablegen
      — bedient `F8` / `TC-F8-01`
- [x] T003 [P] Rund 14 Abbildungen als SVG zeichnen: iOS-Teilen-Menü,
      „Zum Home-Bildschirm", Android-Chrome-Menü, Installationsdialog,
      Samsung-„+", Firefox-Menü, Adressleisten-Symbol am Rechner,
      macOS-Ablage-Menü, Erlaubnisdialoge iOS und Android, Startbildschirm
      mit Dorfladen-Symbol — bedient `F2`
- [x] T004 `static-site/app.html` aufbauen: Seitengerüst, Statusband,
      Geräte- und Browserwahl, alle acht Wege mit `data-weg`, Hilfeabschnitt,
      Teilen-Abschnitt — bedient `F1`, `F2` / `TC-F2-01` … `TC-F2-03`
- [x] T005 `js/app-anleitung.js`: Erkennung (inkl. iPadOS über
      `maxTouchPoints`), Umschaltung mit Adresspflege, Statusband,
      Aktionsknöpfe — bedient `F3`, `F4`, `F5`
- [x] T006 Abschnitt „Was bekomme ich?" mit den vier Arten, je mit Nutzen,
      Häufigkeit, Empfängerkreis und Beispieltext — bedient `F6`
- [x] T007 `css/app-anleitung.css` inklusive `@media print` — bedient `F8` /
      `TC-F8-02`
- [x] T008 Route in `staticwebapp.config.json`, `alert()` in `js/pwa.js`
      ersetzen, Verweis auf der Startseite, `sw.js` prüfen — bedient `F1`,
      `F9`
- [x] T009 Kategorie `kontakt` in `js/pwa.js` sichtbar machen — bedient `F7` /
      `TC-F7-01`

## Tests

- [x] T020 `tests/app-anleitung.spec.js` mit einem Test je Testfall der Spec,
      `serviceWorkers: 'block'`, eigener Kontext ohne JavaScript für
      `TC-F2-02`

## Validation & Rollout

- [x] T030 Tests laufen lassen, Fehler beheben
- [x] T031 Committen, ausrollen, `/app` live auf Telefonmaß und am Rechner
      prüfen; QR-Code mit einem Handy scannen

## Traceability

| Task | Requirement | Test Cases |
| --- | --- | --- |
| T002 | F8 | TC-F8-01 |
| T003 | F2 | — |
| T004 | F1, F2 | TC-F1-01, TC-F2-01 … TC-F2-03 |
| T005 | F3, F4, F5 | TC-F3-01 … TC-F3-05, TC-F4-01, TC-F4-02, TC-F5-01, TC-F5-02 |
| T006 | F6 | TC-F6-01, TC-F6-02 |
| T007 | F8 | TC-F8-02 |
| T008 | F1, F9 | TC-F1-01, TC-F9-01, TC-F9-02 |
| T009 | F7 | TC-F7-01 |
| T020 | alle | alle |
