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

- [x] **T010** Registratur und Wächter in `static-site/js/theme.js`:
  gekapselte Einheit am Dateiende, `window.dlEscapeRegistrieren(beschreibung)`
  nach außen, Rangfolge aus dem Plan. Noch **ohne** angemeldete Bauarten.
  — dient `R7`

- [x] **T011** Die drei Sperren aus `R10` einbauen: `defaultPrevented`,
  offenes `<select>` / `contenteditable`, natives `<dialog open>`,
  `isComposing`. — dient `R10` / `TC-DM-12`

- [x] **T012** Sammelbauart **Handy-Blatt** anmelden
  (`[id^="mob-popup-"].open` → `mobClosePopup`). — dient `R6` / `TC-DM-08`

- [x] **T013** Sammelbauart **Desktop-Maske** anmelden
  (`[id^="dt-modal-"].open` → `closeDtModal`). — dient `R6` / `TC-DM-08`

- [x] **T014** Sammelbauart **Lightbox** anmelden
  (`.lightbox-overlay.active` → `closeLightbox`). — dient `R6` / `TC-DM-08`

- [x] **T015** Sammelbauart **freier Dialog** anmelden: sichtbares
  `[role="dialog"]` ohne eigenen Wächter, geschlossen über seinen
  Schließknopf. — dient `R6`

> Zwischenprobe nach T015: Startseite im Browser, je ein Dialog jeder
> Bauart, `Escape`, danach prüfen dass sich die Seite noch rollen lässt
> (`TC-DM-13`).

## Vorfahrt

> **T020 und T021 sind gegenstandslos.** Beim Bauen zeigte sich, dass die
> Vorfahrt aus dem Plan verkehrt herum gewirkt hätte: `theme.js` steht im
> `<head>` und meldet seinen Wächter damit **vor** allen anderen an — bei
> gleicher Phase laufen Wächter in Anmeldereihenfolge. `preventDefault`
> hätte dem gemeinsamen Wächter den Vortritt gegeben statt den eigenen.
> Stattdessen **wartet** der gemeinsame Wächter ab (`setTimeout(…, 0)`)
> und hält still, sobald sich etwas geschlossen hat. Damit bleiben die
> neun bestehenden Wächter unangetastet.

- [ ] ~~**T020**~~ `preventDefault` in den bestehenden Wächtern von
  `js/dl-confirm.js`, `js/app.js` (Lightbox **und** News-Overlay),
  `hilfe-popup.js`, `js/social-poster.js`, `js/social.js`. Die Pfeiltasten
  der Lightbox bleiben unberührt. — dient `R8`

- [ ] ~~**T021**~~ Dasselbe in den vier Bestellmodulen: `js/kiosk-drax.js`,
  `js/kiosk-baecker.js`, `js/kiosk-getraenke.js`,
  `js/kiosk-metzger-bestellung.js`. — dient `R8`

- [x] **T022** **Stapelprobe** im Browser: Bestellmaske über einer
  Kiosk-Rückfrage öffnen, einmal `Escape` — nur der obere Dialog schließt.
  Diese Probe steht vor allem Weiteren; ohne sie wird nicht fortgefahren.
  — dient `R8` / `TC-DM-09`

## Nachzügler

- [x] **T030** `js/pwa.js`: `push-ios-hint-overlay` über
  `dlEscapeRegistrieren` angemeldet — er entsteht zur Laufzeit.
  (`push-settings-overlay` hat bereits einen eigenen Wächter.)
  Ebenso `cms.js` für `.cms-modal-bg` und die drei Druckschichten,
  `shop.html` und `fleisch-bestellen.html` für ihren Warenkorb — dessen
  Verdunklung trägt keinen Schließknopf. — dient `R6`

- [x] **T031** [P] `sortiment.html`: `#soLightbox` in `js/sortiment.js`
  angemeldet. **Befund:** Die Datei ist auf keiner Seite eingebunden, das
  Markup ist damit unbedient — das Inventar meldet den Dialog weiterhin.
  — dient `R6`

- [x] **T032** [P] 17 Dialoge in 12 Dateien tragen jetzt
  `role="dialog" aria-modal="true"` und werden damit von der Bauart
  „freier Dialog" erreicht. `heroOverlay` ist kein Dialog, sondern der
  Schieberegler für die Hero-Abdunklung. — dient `R6`

## Klappen

- [x] **T040** Klappen angemeldet, Rang 20: `js/mobile.js`
  (Handy-Navigation), `js/kiosk-filter.js`, `js/kiosk-neu-shell.js`
  (Blätter, Rang 40), `js/cms-neu-shell.js`. Der Klick daneben bleibt dort
  erhalten. Dabei behoben: `mobile.js` schloss bei `Escape` **alle**
  Blätter samt Navigation gleichzeitig. — dient `R9` / `TC-DM-11`

## Nachweis

- [x] **T050** `escape_inventar.py` erneut gelaufen: **81 von 85** Dialogen
  werden erreicht (vorher 25 von 83). Die vier verbliebenen Meldungen sind
  geprüft: `cms-modal-wrap` (3×) ist der leere Behälter, den `cms.js`
  befüllt — seine Masken sind angemeldet; `soLightbox` ist unbedientes
  Markup (siehe T031). — dient `R6`

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
