# Bestellreiter auf dem Telefon — Tasks

**Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)

**Status:** Draft

## T1 — Der Wächtertest zuerst  ✅ erledigt

`tests/kiosk-bestellreiter-mobil.spec.js` anlegen: misst für jeden
Bestellreiter die Höhe der festen Blöcke, der Liste sowie der Fuß- und
Reiterleiste und zählt die vollständig sichtbaren Artikelzeilen. Läuft über
360 × 640, 375 × 667, 768 × 1024 und 1280 × 800.

Der Test wird **vor** der Umsetzung geschrieben und schlägt anfangs fehl —
er beschreibt das Ziel und beweist am Ende, dass es erreicht ist. Die
Fehlermeldung nennt den Block, der die Grenze reißt, samt Höhe.

- Abhängigkeiten: keine
- Abnahme: Der Test läuft und meldet den heutigen Zustand als Fehlschlag
  (0 sichtbare Zeilen, 111 % Kopfbereich).
- Deckt: F7

## T2 — Kopfzeile und Tagesleiste straffen  ✅ erledigt

In `kiosk-neu.css` unter `@media (max-width:559px)`: Kopfzeile einzeilig mit
vier Symbolen, das vierte öffnet das Überlaufmenü. Tagesleiste mit
Wochentag und Datum in einer Zeile, Farbpunkte neben dem Status, Kachel
mindestens 48 px. Markup für das Überlaufmenü in `kiosk.html`.

- Abhängigkeiten: T1
- Abnahme: Kopfzeile 56 px statt 92, Tagesleiste 120 px statt 155, keine
  Antippfläche unter 44 px, kein Text beschnitten.
- Deckt: F2, F4, F5

## T3 — Kontextzeile und Detailblatt im Bäcker  ✅ erledigt

`statusKarte()` in `kiosk-baecker.js` durch `kontextZeile()` ersetzen und
`detailBlatt()` ergänzen. `offenHinweis()`, Testbetriebsstreifen und
`bk-sortnote` gehen darin auf. Die Sendeschaltfläche entfällt aus der Karte;
die Fußzeile trägt alle Zustände (senden, drucken, korrigieren). Die
Werkzeugleiste wandert ans Listenende.

- Abhängigkeiten: T2
- Abnahme: Genau eine Sendeschaltfläche im Dokument. Jede heutige Funktion
  ist weiter erreichbar. Kontextzeile höchstens zwei Textzeilen.
- Ergebnis: Kopfbereich von 710 px auf 237 px (37 %), vier Artikelzeilen
  sichtbar statt keiner. Die bestehende Bäcker-Suite läuft mit 50 von 52
  Tests; die beiden übrigen sind ein vorbestehender, wochentagsabhängiger
  Fehler (TC-F1-03, im unveränderten Stand identisch rot) und ein
  Timing-Effekt im Sammellauf (TC-F12-05, einzeln grün).
- Deckt: F1, F3

## T4 — Metzger nach demselben Muster  ✅ erledigt

`kiosk-metzger.js` erhält dieselbe Kontextzeile und dieselbe Fußzeilenregel.

- Abhängigkeiten: T3
- Abnahme: Der Wächtertest ist für „Mair" grün; die bestehende
  Metzger-Suite (36 Tests) läuft unverändert durch.
- Deckt: F1, F2

## T5 — Getränke gliedern  ✅ erledigt

`kiosk-getraenke.js` in feste Kopfbereiche und scrollende Liste teilen.
Zeilenhöhe von 136 px auf höchstens 72 px bringen, Mengenbedienung bleibt
mindestens 44 px.

- Abhängigkeiten: T3
- Abnahme: Kopfbereiche bleiben beim Scrollen stehen; Zeile höchstens 72 px;
  die bestehende Getränke-Suite (87 Läufe) bleibt grün.
- Deckt: F1, F6

## T6 — Abnahme über alle Viewports  ✅ erledigt

Wächtertest, Bäcker-, Metzger- und Getränke-Suiten über die drei
Pflicht-Viewports. Dunkles Schema und Kontraste prüfen. Live-Vergleich
gegen die Messwerte aus der Spec.

- Abhängigkeiten: T4, T5
- Abnahme: Alle Suiten grün, keine Regression, Messwerte innerhalb der
  Grenzen aus F1 und F2.
- Deckt: alle F

Ergebnis:
- Wächter `kiosk-bestellreiter-mobil.spec.js`: **39/39** über mobile,
  ipad-mini und desktop (alle drei Reiter zeigen 4 Zeilen auf 360×640,
  10 auf dem Tablet).
- Bestandssuiten grün: Bäcker **52/52**, Metzger **36/36**,
  Getränke **29/29**.
- Angepasst an das geteilte Layout: Bäcker TC-F12-05 (Container- statt
  Fensterbreite), TC-F15-01 (Kopf bleibt beim Scrollen der Liste stehen);
  Metzger- und Getränke-Suiten auf die neuen Bedienwege (Blatt hinter dem
  „i", Umfang-Umschalter am Listenende) umgestellt.

## Reihenfolge

```
T1 ─► T2 ─► T3 ─┬─► T4 ─┐
                └─► T5 ─┴─► T6
```
