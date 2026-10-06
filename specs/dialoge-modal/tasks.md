# `Escape` schließt überall — Aufgaben

> Abgeleitet aus [plan.md](./plan.md). `[P]` heißt: kann nebenher laufen,
> berührt keine gemeinsame Datei und wartet auf nichts.

**Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)

## Regeln

- Von oben nach unten, außer bei `[P]`.
- Eine Aufgabe ist erst fertig, wenn ihre Testfälle grün sind.
- Kleine Commits, Aufgabennummer in der Meldung.
- Nach jedem Commit-Block live auf der Feature-SWA prüfen.

## Messen

- [x] **T001** `escape_inventar.py` von Grobzählung auf **genaue Zählung**
  umstellen: je erkanntem Dialog ausweisen, ob ein Wächter ihn erreicht
  (heute zählt es nur Wächter je Datei, deshalb galt `kiosk.html` mit 17
  Dialogen und 1 Wächter als versorgt). Ergebnis als Vorher-Stand ablegen.
  — dient `R6`

  **Erledigt.** Werkzeug liegt als `tools/escape_inventar.py`.
  Vorher-Stand: **86 Dialoge, davon 58 ohne Wächter in Reichweite.**
  Ausgenommen die Cookie-Leiste (`cookieBar`, 14 Seiten) — Escape wäre dort
  weder Zustimmung noch Ablehnung; entschieden mit dem Nutzer am 06.10.2026.

## Kern

- [ ] **T010** Registratur und Wächter in `static-site/js/theme.js`:
  gekapselte Einheit am Dateiende, `window.dlEscapeRegistrieren(beschreibung)`
  nach außen, Rangfolge aus dem Plan. Noch **ohne** angemeldete Bauarten.
  — dient `R7`

- [ ] **T011** Die drei Sperren aus `R10` einbauen: `defaultPrevented`,
  offenes `<select>` / `contenteditable`, natives `<dialog open>`,
  `isComposing`. — dient `R10` / `TC-DM-12`

- [ ] **T012** Sammelbauart **Handy-Blatt** anmelden
  (`[id^="mob-popup-"].open` → `mobClosePopup`). — dient `R6` / `TC-DM-08`

- [ ] **T013** Sammelbauart **Desktop-Maske** anmelden
  (`[id^="dt-modal-"].open` → `closeDtModal`). — dient `R6` / `TC-DM-08`

- [ ] **T014** Sammelbauart **Lightbox** anmelden
  (`.lightbox-overlay.active` → `closeLightbox`). — dient `R6` / `TC-DM-08`

- [ ] **T015** Sammelbauart **freier Dialog** anmelden: sichtbares
  `[role="dialog"]` ohne eigenen Wächter, geschlossen über seinen
  Schließknopf. — dient `R6`

> Zwischenprobe nach T015: Startseite im Browser, je ein Dialog jeder
> Bauart, `Escape`, danach prüfen dass sich die Seite noch rollen lässt
> (`TC-DM-13`).

## Vorfahrt

- [ ] **T020** `preventDefault` in den bestehenden Wächtern von
  `js/dl-confirm.js`, `js/app.js` (Lightbox **und** News-Overlay),
  `hilfe-popup.js`, `js/social-poster.js`, `js/social.js`. Die Pfeiltasten
  der Lightbox bleiben unberührt. — dient `R8`

- [ ] **T021** Dasselbe in den vier Bestellmodulen: `js/kiosk-drax.js`,
  `js/kiosk-baecker.js`, `js/kiosk-getraenke.js`,
  `js/kiosk-metzger-bestellung.js`. — dient `R8`

- [ ] **T022** **Stapelprobe** im Browser: Bestellmaske über einer
  Kiosk-Rückfrage öffnen, einmal `Escape` — nur der obere Dialog schließt.
  Diese Probe steht vor allem Weiteren; ohne sie wird nicht fortgefahren.
  — dient `R8` / `TC-DM-09`

## Nachzügler

- [ ] **T030** `js/pwa.js`: `push-settings-overlay` und
  `push-ios-hint-overlay` über `dlEscapeRegistrieren` anmelden — sie
  entstehen zur Laufzeit. — dient `R6`

- [ ] **T031** [P] `sortiment.html`: `#solightbox` anmelden (eigener
  Schließname `soCloseLightbox`). — dient `R6`

- [ ] **T032** [P] `cms.html`, `cms-neu.html`, `cms-klassisch.html`:
  `herooverlay` anmelden. — dient `R6`

## Klappen

- [ ] **T040** Klappen anmelden, Rang 10: `js/mobile.js`
  (Handy-Navigation), `js/kiosk-filter.js`, `js/kiosk-neu-shell.js`,
  `js/cms-neu-shell.js`. Der Klick daneben bleibt dort erhalten.
  — dient `R9` / `TC-DM-11`

## Nachweis

- [ ] **T050** `escape_inventar.py` erneut laufen lassen: **jeder** erkannte
  Dialog wird von genau einem Wächter erreicht. Vorher/Nachher gegenüberstellen.
  — dient `R6`

- [ ] **T051** Maschinell prüfen, dass jede HTML-Seite mit Dialog `theme.js`
  lädt — die beiden Ausnahmen namentlich bestätigen. — dient `R7` / `TC-DM-10`

- [ ] **T052** Playwright: TC-DM-08 bis TC-DM-13 nach dem Muster der
  vorhandenen Dialog-Tests, Lauf über `test-live.ps1`. — dient `R6`–`R10`

- [ ] **T053** Spec-Abschnitt „Gegenprobe" um die Ergebnisse ergänzen.

## Nachvollzug

| Aufgabe | Anforderung | Testfälle |
| --- | --- | --- |
| T001 | R6 | — |
| T010, T012–T015 | R6, R7 | TC-DM-08 |
| T011 | R10 | TC-DM-12 |
| T020–T022 | R8 | TC-DM-09 |
| T030–T032 | R6 | TC-DM-08 |
| T040 | R9 | TC-DM-11 |
| T050, T053 | R6 | TC-DM-13 |
| T051 | R7 | TC-DM-10 |
| T052 | R6–R10 | TC-DM-08…13 |
