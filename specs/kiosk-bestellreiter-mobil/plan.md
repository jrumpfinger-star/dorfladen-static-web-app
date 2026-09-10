# Bestellreiter auf dem Telefon — Plan

**Spec:** [spec.md](./spec.md)

**Status:** Draft

**Last updated:** 2026-09-10

## Leitentscheidungen

### L1: Der Platz kommt aus Weglassen, nicht aus Verkleinern

Die Spec verbietet in F5 kleinere Schrift und kleinere Antippflächen. Jeder
gewonnene Pixel muss also aus einer Angabe stammen, die entfällt, oder aus
zwei Angaben, die sich eine Zeile teilen. Der abgenommene Mockup
(`mockups/baecker-mobil-mockup.html`) weist nach, dass das reicht: 710 px
werden zu 237 px, ohne dass ein Schriftgrad sinkt.

### L2: Eine Kontextzeile ersetzt vier Blöcke

`statusKarte()` (250 px), `offenHinweis()` (27 px), der Testbetriebsstreifen
(41 px) und `bk-sortnote` verschmelzen zu einer Zeile von 46 px: Symbol,
zwei Textzeilen, ein **i**-Knopf. Die Zeile trägt nur, was den Zustand
beschreibt — Bäckerei und ob gesendet wurde.

Alles Weitere zieht in ein Blatt hinter dem **i**: Herkunft der Vorbelegung,
Bestellschluss, Sortierhinweis, offene Erinnerungen, dazu die selteneren
Handlungen (Hinweis, Zurücksetzen, Drucken, Artikel, Verlauf).

Der Testbetrieb verschwindet dabei nicht: Er färbt die Kontextzeile blau und
schreibt „Testbetrieb aktiv" in die zweite Zeile. Eine Warnung, die man
übersehen kann, wäre keine.

### L3: Der Liefertag steht an einer Stelle

Heute steht er in der markierten Kachel **und** im Infokasten. Künftig nur
in der Kachel. Das ist nicht nur kürzer, sondern auch eindeutiger: Der
markierte Tag ist der, für den gerade erfasst wird.

### L4: Die Sendeschaltfläche gehört in die Fußzeile

Sie steht heute zweimal untereinander. Die Fußzeile gewinnt, weil sie beim
Scrollen sichtbar bleibt. Die Kontextzeile verliert ihren Knopf ganz — auch
in den Zuständen „drucken" und „korrigieren", die ebenfalls in die Fußzeile
wandern. So gibt es genau einen Ort für die nächste Handlung.

### L5: Der Umfang-Umschalter wandert ans Listenende

„Übliche Artikel / Alle Artikel" kostet oben eine ganze Zeile (94 px mit dem
Zurücksetzen-Knopf). Am Ende der Liste steht er genau dort, wo man ihn
sucht: wenn man einen Artikel vermisst und weitergescrollt hat. Er bleibt
zusätzlich im **i**-Blatt erreichbar, für den, der ihn oben sucht.

### L6: Die Kopfzeile bricht auf dem Telefon nicht mehr um

Sechs Symbole plus Titel passen nicht in eine Zeile, deshalb sind es heute
zwei (92 px). Unter 560 px zeigt die Kopfzeile künftig vier Symbole in einer
Zeile — Aktualisieren, Ton, Hilfe und „…" für den Rest (Stammkunden,
Website, CMS). 56 px statt 92.

Die Auswahl folgt der Häufigkeit im Laden: Aktualisieren und Ton werden
täglich gebraucht, Stammkundenverwaltung und CMS selten.

### L7: Getränke bekommt dieselbe Gliederung wie Bäcker und Metzger

`kiosk-getraenke.js` gibt heute einen einzigen Block aus. Er wird in
`fest` (Termin, Kontext, Filter) und `liste` geteilt, wie es
`specs/kiosk-umbau` F3 verlangt. Die Zeilenhöhe sinkt von 136 px auf das
Maß der übrigen Reiter, indem Gebinde, Preis und Pfand in eine
Beschreibungszeile unter den Namen rücken statt in eigene Blöcke.

### L8: Ein Wächtertest statt guter Vorsätze

Die Kopfbereiche sind einmal zurückgewachsen. `tests/kiosk-bestellreiter-mobil.spec.js`
misst die Anteile und schlägt an, sobald ein Block die Grenze reißt — mit
Namen und Höhe des Verursachers in der Fehlermeldung.

## Architektur

Keine neuen Abhängigkeiten, kein Build-Schritt, keine API-Änderung. Die
Arbeit verteilt sich auf drei Ebenen:

1. **Gestaltungsblatt** (`kiosk-neu.css`): Maße der Kopfzeile, der
   Tagesleiste, der neuen Kontextzeile und der Fußzeile. Alles unter einem
   Umschaltpunkt `@media (max-width:559px)`, damit Tablet und Desktop
   unberührt bleiben (Spec, Non-Goals).
2. **Reitermodule** (`kiosk-baecker.js`, `kiosk-getraenke.js`,
   `kiosk-metzger.js`): Umbau der erzeugten Struktur — Kontextzeile statt
   Statuskarte, Blatt hinter dem **i**, Umfang ans Listenende.
3. **Prüfung** (`tests/kiosk-bestellreiter-mobil.spec.js`): der Wächter.

## File Change Map

| Datei | Änderung | Deckt |
| --- | --- | --- |
| `static-site/css/kiosk-neu.css` | Kopfzeile einzeilig unter 560 px; Tagesleiste gestrafft; neue Klassen `.bk-kontext`, `.bk-blatt`, `.bk-listenknopf`; Fußzeile gestrafft | F1, F2, F4 |
| `static-site/js/kiosk-baecker.js` | `statusKarte()` → `kontextZeile()` + `detailBlatt()`; `tagesleiste()` zweizeilig; `bk-tools` ans Listenende; Fußzeile trägt alle Handlungen | F1, F3, F4 |
| `static-site/js/kiosk-getraenke.js` | Aufteilung in feste Kopfbereiche und scrollende Liste; Zeilenhöhe | F1, F6 |
| `static-site/js/kiosk-metzger.js` | Kontextzeile nach demselben Muster | F1, F2 |
| `static-site/kiosk.html` | Kopfzeile: Überlaufmenü „…" | F2 |
| `tests/kiosk-bestellreiter-mobil.spec.js` | neuer Wächter über vier Viewports | F7, alle |
| `mockups/baecker-mobil-mockup.html` | abgenommener Entwurf, bleibt als Beleg | — |
| `tools/baecker_mockup_daten.js` | zieht die Live-Daten für den Mockup | — |

## Risiken

| Risiko | Umgang |
| --- | --- |
| Der **i**-Knopf versteckt etwas, das täglich gebraucht wird | Nur Angaben, die den Zustand erklären, und Handlungen, die selten sind. Senden, Entwurf und Mengen bleiben direkt erreichbar. |
| Das Überlaufmenü der Kopfzeile verbirgt einen Zähler | Die Reiterleiste trägt die Zähler, nicht die Kopfzeile. Dort ändert sich nichts. |
| Die Straffung wirkt versehentlich auf Tablet und Desktop | Alle neuen Maße stehen in `@media (max-width:559px)`. Der Wächtertest prüft 768 und 1280 px mit. |
| `kiosk-baecker.js` ist gewachsen und hat 166 verdrahtete Funktionen | Kein Umbenennen, kein Entfernen von Funktionen. Nur die erzeugte Struktur ändert sich; `onclick`-Ziele bleiben identisch. |
| Die Metzger-Suite bricht | Sie läuft vor und nach jeder Aufgabe (36 Tests). |
| Der Mockup und der Kiosk driften auseinander | Der Mockup ist der abgenommene Stand, nicht die Quelle. Verbindlich sind Spec und Wächtertest. |

## Traceability

| Requirement | Test Cases | Plan | Tasks |
| --- | --- | --- | --- |
| F1 | TC-F1-01 … 03 | L1, L2, L5, L6 | T2–T6 |
| F2 | TC-F2-01, TC-F2-02 | L2, L6 | T2, T3 |
| F3 | TC-F3-01 … 03 | L2, L3, L4 | T3 |
| F4 | TC-F4-01 … 04 | L1 | T2 |
| F5 | TC-F5-01 … 03 | L1 | T2–T6 |
| F6 | TC-F6-01, TC-F6-02 | L7 | T5 |
| F7 | TC-F7-01 | L8 | T1 |
