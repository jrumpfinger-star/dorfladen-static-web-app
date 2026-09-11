# Erfassung und Filter im Kiosk — Tasks

**Status:** Umgesetzt · **Last updated:** 2026-09-11

## T1 — Wächtertest zuerst  ✅ erledigt

`tests/kiosk-erfassung-filter.spec.js` mit allen Test Cases aus der Spec.
Er hat gegen den unveränderten Kiosk fehlgeschlagen und die Ursachen benannt —
unter anderem „Die Zeile ist nach dem Erfassen um −140 px gesprungen" und
„Der Rollstand ist von 400 auf 11 gefallen".

Die Attrappen der drei Reiter liegen jetzt gemeinsam in
`tests/helpers/bestellreiter-mocks.js`.

- Deckt: F1–F9

## T2 — Erfassung bei Mair umbauen  ✅ erledigt

- Deckt: F3, F4, F5, F6, F9
- Abnahme: TC-F3-01/02, TC-F4-01…05, TC-F5-01/02, TC-F6-01/02 — grün

## T3 — Scrollverhalten reparieren  ✅ erledigt

`render()` hält den Rollstand der `.k-liste`; `inSicht()` ist `zeigeGanz(key)`
gewichen und legt die **Zeile** an, nicht den Editor.

- Deckt: F1, F2
- Abnahme: TC-F1-01/02, TC-F2-01/02 — grün

## T4 — Filter in allen drei Reitern  ✅ erledigt

Gemeinsamer Baustein `static-site/js/kiosk-filter.js` (`window.KFilter`),
eingebunden in alle drei Kiosk-Fassungen.

- Deckt: F7, F8, F9
- Abnahme: TC-F7-01…04, TC-F8-01…03, TC-F9-01 — grün

## T5 — Bestandssuiten grün ziehen  ✅ erledigt

- Bäcker 52, Metzger 36, Getränke 29, Kiosk-Shell — grün
- Wächter `kiosk-erfassung-filter` + `kiosk-bestellreiter-mobil`:
  **150/150** über mobile, ipad-mini und desktop

## T6 — Abnahme und Auslieferung

- Abhängigkeiten: T5

## Erfahrungen

- **Der Bäcker hat kein Suchfeld.** Eine eigene Filterzeile hätte seinen Kopf
  um 44 px wachsen lassen und die Vier-Zeilen-Regel gerissen. Das Symbol sitzt
  deshalb in der Kontextzeile neben dem „i" — dort kostet es nichts.
- **Suche und Filterzeile teilen sich eine Reihe**, sobald der Platz reicht.
  Als eigene Zeile riss der Metzger-Kopf auf dem Desktop die 45-%-Grenze
  (362 px statt 360).
- **Die Höhenschwelle allein genügt nicht.** Mit `max-height:819px` verschwand
  die Kurzeingabe auch auf dem 1280 × 800 großen Desktop. Die Regel lautet
  jetzt „schmal **und** niedrig".
- **`Get-Content -Raw | Set-Content` zerstört Umlaute** (PowerShell 5 liest als
  ANSI). Für Textersetzungen ein Node-Skript mit ausdrücklichem `utf8` nutzen.

## Reihenfolge

```
T1 ─┬─► T2 ─┐
    ├─► T3 ─┼─► T5 ─► T6
    └─► T4 ─┘
```

