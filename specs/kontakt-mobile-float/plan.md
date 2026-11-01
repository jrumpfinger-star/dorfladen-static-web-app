# Implementierungsplan: Mobiler Chat-Float

## Betroffene Komponenten

- `static-site/js/kontakt.js` erzeugt `#hp-chat-float` dynamisch und besitzt
  dessen Klickverhalten. Hier kommen die mobile Pointer- und
  Tastaturbewegung, Positionsbegrenzung und Speicherung hinzu.
- `tests/kontakt-float-mobil.spec.js` prüft die lokale Script-Version in einem
  isolierten Browserkontext mit gemockten API-Antworten.
- `specs/kontakt-mobile-float/spec.md` und `tasks.md` definieren Verhalten und
  Abnahmekriterien.

## Technische Entscheidungen

- Mobile ist `matchMedia('(max-width: 768px)')`; Desktop behält bestehende
  `right`-/`bottom`-Positionierung und Darstellung.
- Gespeicherter Schlüssel: `dl_kontakt_float_position_v1`; Wert sind
  `left`-/`top`-Pixelpositionen. Speicherung erfolgt erst nach einer
  tatsächlichen Bewegung beziehungsweise Tastaturverschiebung.
- Pointer-Events mit Bewegungsschwelle unterscheiden Ziehen von Tippen.
  Nach einer Bewegung wird der vom Browser ausgelöste Klick unterdrückt.
- Positionsgrenzen berücksichtigen Button-Abmessungen und einen kleinen
  Viewport-Rand. Nach Viewport-Änderung wird eine gespeicherte Position
  angepasst und erneut gespeichert.
- `Alt`+`Umschalt`+Pfeiltasten bewegen den fokussierten Button schrittweise,
  ohne die üblichen Alt+Links/Rechts-Browsernavigationstasten zu belegen. Eine
  beschreibende Anweisung wird über `aria-describedby` bereitgestellt.
- Lokale Speicherfehler werden über `console.warn` sichtbar protokolliert;
  die Chatfunktion fällt auf die unveränderte Standardposition zurück.

## Verifikation

- Playwright-Tests gegen das lokale `kontakt.js`, nicht gegen eine bereits
  veröffentlichte Script-Version.
- Viewports: 375×667, 768×1024 und 1280×800.
- Pointer-Drag, Reload/Persistenz, Viewport-Verkleinerung, Tastaturbewegung,
  Tap zum Öffnen, Hintergrundtransparenz und Speicherfehler prüfen.
- Bestehende Kontakt-Regressionen gezielt mit ausführen; zusätzlich
  `git diff --check`.
