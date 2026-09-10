# Bestellreiter auf dem Telefon — Specification

**Status:** Draft

**Owner:** Dorfladen Oberornau

**Last updated:** 2026-09-10

## Overview

Die Bestellreiter des Kiosks — „Bäcker", „Mair" (Metzger) und „Getränke" —
sind das tägliche Werkzeug der Verkäuferinnen. Ihr Kern ist eine Liste: Artikel
für Artikel eine Menge eintragen. Alles andere auf dem Bildschirm dient nur
dazu, diese Liste einzuordnen.

Auf dem Telefon ist dieses Verhältnis heute umgekehrt. Gemessen im Reiter
„Bäcker" bei 360 × 640 px mit Live-Daten:

| Block | Höhe |
| --- | --- |
| Kopfzeile | 92 px |
| Tagesleiste (7 Kacheln à 76 px in zwei Reihen) | 155 px |
| Infokasten `.bk-stat` | 250 px |
| Status- und Testbetriebszeile | 68 px |
| Werkzeugknöpfe (zwei Reihen) | 94 px |
| Filterleiste | 50 px |
| Fußzeile | 109 px |
| Reiterleiste | 57 px |

Die erste Artikelzeile beginnt dadurch bei **y = 810 px**. Der sichtbare
Bereich endet bei y = 583. **Keine einzige der 34 Artikelzeilen ist ohne
Scrollen zu sehen**; wer gescrollt hat, sieht drei. Von 640 px Bildschirmhöhe
arbeiten 33 % für die Aufgabe, 67 % für ihren Rahmen.

Im Reiter „Getränke" beginnt die erste Zeile bei y = 614, und jede Zeile ist
136 px hoch — bei 40 Artikeln. Der Reiter „Mair" trägt 533 px feste Blöcke
über der Liste.

Der Kiosk-Umbau (`specs/kiosk-umbau`) hat dieses Problem schon einmal gelöst
und in F3 festgeschrieben: feste Kopfbereiche, und nur die Liste scrollt. Die
Kopfbereiche sind seither aber weiter gewachsen — jede neue Angabe bekam eine
eigene Zeile. Diese Spec zieht die Grenze nach, die dort fehlt: **wie viel**
Platz die Kopfbereiche höchstens beanspruchen dürfen.

**Zielgruppe** ist unverändert das ungeschulte Personal unter Zeitdruck, oft
auf dem eigenen, kleinen Telefon.

## Goals

- Auf jedem Telefon ist beim Öffnen eines Bestellreiters sofort Arbeitsfläche
  zu sehen, ohne zu scrollen.
- Der Rahmen um die Liste beansprucht weniger Platz als die Liste selbst.
- Jede Angabe und jede Schaltfläche erscheint genau einmal.
- Bedienmaße und Schriftgrößen bleiben dabei unangetastet oder werden größer.

## Non-Goals

- Keine Änderung an der Fachlogik: Bestellablauf, Mailversand, Fristen,
  Statuswechsel und Dokumenterzeugung bleiben, wie sie sind.
- Keine Änderung an API-Endpunkten oder am Datenmodell.
- Keine getrennte Mobilfassung. Ein Bedienmuster für alle Geräte
  (`specs/kiosk-umbau`, F10).
- Keine Umgestaltung von Tablet und Desktop. Dort ist genug Platz; die
  Regeln dieser Spec greifen nur, wo er fehlt.
- Kein neues Farb- oder Formschema. Es gilt `css/dl-design.css`.

## Requirements

### F1: Arbeitsfläche im ersten Bildschirm

#### F1 Description

Beim Öffnen eines Bestellreiters ist ohne jede Geste ein zusammenhängendes
Stück der Artikelliste zu sehen. Die Verkäuferin erkennt sofort, dass hier
eine Liste bearbeitet wird, und kann die erste Menge eintragen.

#### F1 Behaviour / Acceptance

- Bei 360 × 640 px sind mindestens **vier vollständige Artikelzeilen**
  sichtbar, ohne zu scrollen.
- Bei 375 × 667 px (Verfassung, Prinzip 7) ebenfalls mindestens **vier**.
  Die 27 px Unterschied ergeben keine weitere ganze Zeile; eine fünfte
  verlangte entweder kleinere Schrift (F5 verbietet das) oder eine
  einreihige Tagesleiste, in der nicht alle Liefertage Platz haben.
- Bei 768 × 1024 px mindestens **zehn**.
- „Vollständig sichtbar" heißt: Ober- und Unterkante der Zeile liegen im
  sichtbaren Bereich, oberhalb der Reiterleiste und der Fußzeile.
- Gilt für die Reiter „Bäcker", „Getränke" und „Mair".

#### F1 Test Cases

**TC-F1-01: Vier Zeilen auf dem kleinen Telefon**

- **Setup:** Reiter „Bäcker", 360 × 640 px, Live-Daten mit mindestens
  zehn Artikeln.
- **Expected:** Mindestens vier Artikelzeilen sind vollständig sichtbar,
  ohne zu scrollen.

**TC-F1-02: Gleiches gilt für Getränke und Mair**

- **Setup:** Reiter „Getränke" und „Mair", 360 × 640 px.
- **Expected:** Je mindestens vier Artikelzeilen vollständig sichtbar.

**TC-F1-03: Größere Geräte zeigen mehr**

- **Setup:** Alle drei Reiter bei 375 × 667 und 768 × 1024 px.
- **Expected:** Mindestens vier beziehungsweise zehn vollständige Zeilen.

### F2: Der Rahmen ist kleiner als die Arbeitsfläche

#### F2 Description

Eine harte Obergrenze verhindert, dass die Kopfbereiche wie bisher Zeile um
Zeile zurückwachsen. Sie ist die Regel, die in `specs/kiosk-umbau` F3 fehlt.

#### F2 Behaviour / Acceptance

- Unterhalb von 560 px Breite beansprucht alles, was über der Liste fest
  steht — Kopfzeile, Tagesleiste, Kontextangabe, Filterleiste — zusammen
  höchstens **45 % der Bildschirmhöhe**.
- Fußzeile und Reiterleiste zusammen höchstens **weitere 25 %**.
- Der Liste bleiben damit mindestens 30 %.
- Wer eine Angabe hinzufügt, muss eine andere entfernen oder
  zusammenlegen.

#### F2 Test Cases

**TC-F2-01: Obergrenze wird eingehalten**

- **Setup:** Alle drei Bestellreiter, 360 × 640 und 375 × 667 px.
- **Expected:** Die Summe der festen Blöcke über der Liste beträgt
  höchstens 45 % der Fensterhöhe; Fußzeile und Reiterleiste zusammen
  höchstens 25 %.

**TC-F2-02: Auch im ungünstigsten Zustand**

- **Setup:** Ein Tag mit zwei Bäckereien, offenem Ausdruck und aktivem
  Testbetrieb — also mit allen Hinweisen gleichzeitig.
- **Expected:** Die Obergrenze aus TC-F2-01 gilt unverändert.

### F3: Jede Angabe und jede Schaltfläche genau einmal

#### F3 Description

Heute steht „An Bäckerei senden" zweimal untereinander im selben Blick:
einmal im Infokasten, einmal in der Fußzeile. Doppelte Elemente kosten Platz
und stiften Zweifel, ob beide dasselbe tun.

#### F3 Behaviour / Acceptance

- Die Sendeschaltfläche steht **nur in der Fußzeile**. Dort ist sie immer
  sichtbar, unabhängig von der Scrollposition.
- Der Liefertermin steht in der Tagesleiste (gewählte Kachel) **oder** in der
  Kontextzeile, nicht in beiden.
- Es gibt genau eine Kontextzeile, die Lieferung, Bäckerei und Zustand in
  höchstens zwei Textzeilen zusammenfasst.
- Was heute im Infokasten steht und dort entfällt — etwa die Herkunft der
  Vorbelegung — bleibt erreichbar, aber nicht dauerhaft sichtbar.

#### F3 Test Cases

**TC-F3-01: Nur eine Sendeschaltfläche**

- **Setup:** Reiter „Bäcker", jeder Zustand (offen, gesendet, korrigierbar),
  alle drei Viewports.
- **Expected:** Genau eine Schaltfläche mit der Sendehandlung ist im
  Dokument sichtbar.

**TC-F3-02: Kontextzeile bleibt kurz**

- **Setup:** Ein Tag mit der längsten vorkommenden Beschriftung.
- **Expected:** Die Kontextzeile ist höchstens zwei Textzeilen hoch und
  nichts ist abgeschnitten (`scrollHeight <= clientHeight + 1`).

**TC-F3-03: Die Herkunft der Vorbelegung geht nicht verloren**

- **Setup:** Ein Tag, dessen Mengen aus der Vorwoche übernommen wurden.
- **Expected:** Die Angabe ist weiterhin erreichbar und nennt das
  Bezugsdatum.

### F4: Tageskacheln kompakt und trotzdem sicher zu treffen

#### F4 Description

Sieben Kacheln à 76 px in zwei Reihen sind der zweitgrößte Posten. Der Platz
geht nicht an Schrift, sondern an vier gestapelte Zeilen: Wochentag, Datum,
Status, Farbpunkte.

#### F4 Behaviour / Acceptance

- Wochentag und Datum stehen in **einer** Zeile („Do 10.09.").
- Die Farbpunkte der Bäckereien stehen in derselben Zeile wie der Status,
  nicht in einer eigenen.
- Eine Kachel ist damit höchstens **56 px** hoch und mindestens
  **48 px** (`--tap`), nie unter 44 px (`specs/kiosk-umbau`, F4).
- Die Statuszeile wird **nicht kleiner** als heute (10,5 px) — sie wird
  auf mindestens 11,5 px angehoben, weil sie die Lesbarkeitsregel für
  60+ ohnehin schon streift.
- Der Status entfällt dort, wo er nichts sagt: Ein Tag ohne Lieferung
  erkennt man an seiner Ausgrauung; „offen" ist der Normalfall und braucht
  keine Beschriftung. Wo er etwas sagt — „heute bestellen", „Ausdruck
  fehlt", „2 von 3" —, bleibt er.

#### F4 Test Cases

**TC-F4-01: Kachelhöhe innerhalb der Grenzen**

- **Setup:** Alle sieben Kacheln, Breiten 320, 360, 375, 430 px.
- **Expected:** Jede Kachel ist mindestens 44 px und höchstens 56 px hoch.

**TC-F4-02: Wochentag und Datum in einer Zeile**

- **Setup:** 360 px Breite.
- **Expected:** Wochentag und Datum haben dieselbe Oberkante.

**TC-F4-03: Sprechende Zustände bleiben sichtbar**

- **Setup:** Ein Tag mit „heute bestellen", einer mit offenem Ausdruck,
  einer mit Teilstand („1 von 2").
- **Expected:** Alle drei Beschriftungen sind vorhanden und lesbar.

**TC-F4-04: Keine Kachel unter dem Bedienmaß**

- **Setup:** Alle Prüfbreiten von 320 bis 1920 px.
- **Expected:** Keine antippbare Kachel ist schmaler oder niedriger als
  44 px.

### F5: Lesbarkeit und Bedienmaße werden nicht geopfert

#### F5 Description

Der Platzgewinn entsteht durch Weglassen und Zusammenlegen, nicht durch
Verkleinern. Diese Anforderung ist die Bremse gegen den bequemen Weg.

#### F5 Behaviour / Acceptance

- Keine Schriftgröße in den geänderten Bereichen wird kleiner als vorher.
- Keine antippbare Fläche wird kleiner als 44 × 44 px.
- Nebeneinanderliegende Bedienelemente behalten mindestens 8 px Abstand.
- Kontraste erfüllen mindestens WCAG AA, in hellem und dunklem Schema.

#### F5 Test Cases

**TC-F5-01: Keine Schrift ist geschrumpft**

- **Setup:** Vergleich der berechneten `font-size` aller Textelemente in den
  geänderten Bereichen vor und nach der Änderung.
- **Expected:** Kein Wert ist kleiner als vorher.

**TC-F5-02: Bedienmaße gewahrt**

- **Setup:** Alle drei Bestellreiter, alle drei Viewports.
- **Expected:** Keine antippbare Fläche unter 44 × 44 px.

**TC-F5-03: Dunkles Schema**

- **Setup:** Dunkles Farbschema, Reiter „Bäcker", 360 × 640 px.
- **Expected:** Alle Texte der geänderten Bereiche erfüllen WCAG AA.

### F6: Nur die Liste scrollt — auch im Reiter „Getränke"

#### F6 Description

`specs/kiosk-umbau` F3 verlangt feste Kopfbereiche mit einer einzigen
scrollenden Liste. Der Reiter „Getränke" erfüllt das nicht: Er gibt seinen
gesamten Inhalt als einen 5276 px hohen Block aus, Kopfbereiche
eingeschlossen.

#### F6 Behaviour / Acceptance

- Kopfzeile, Kontextzeile und Filterleiste des Getränke-Reiters bleiben beim
  Scrollen stehen.
- Nur der Listenbereich scrollt.
- Beim Wechsel von Filter oder Termin springt die Liste an den Anfang.
- Die Artikelzeile wird auf die Höhe der übrigen Reiter gebracht (heute
  136 px gegenüber 56 px beim Bäcker).

#### F6 Test Cases

**TC-F6-01: Kopfbereiche bleiben stehen**

- **Setup:** Reiter „Getränke", 360 × 640 px, bis ans Listenende scrollen.
- **Expected:** Die Bildschirmkoordinaten von Kopfzeile, Kontextzeile und
  Filterleiste sind unverändert.

**TC-F6-02: Zeilenhöhe angeglichen**

- **Setup:** Reiter „Getränke", 360 × 640 px.
- **Expected:** Eine Artikelzeile ist höchstens 72 px hoch, und die
  Mengenbedienung bleibt mindestens 44 px groß.

### F7: Die Grenze bleibt geprüft

#### F7 Description

Die Kopfbereiche sind einmal zurückgewachsen. Ohne laufende Prüfung
geschieht das wieder.

#### F7 Behaviour / Acceptance

- Ein Playwright-Test prüft F1 und F2 für alle drei Bestellreiter über die
  drei Pflicht-Viewports und zusätzlich 360 × 640 px.
- Der Test benennt im Fehlerfall den Block, der die Grenze reißt, samt
  seiner Höhe — damit die Ursache ohne Nachmessen erkennbar ist.

#### F7 Test Cases

**TC-F7-01: Der Wächter schlägt an**

- **Setup:** Ein künstlich um 120 px vergrößerter Kopfbereich.
- **Expected:** Der Test schlägt fehl und nennt den verursachenden Block.

## Data & Contracts

Keine. Diese Spec ändert ausschließlich Darstellung und Anordnung. Alle
API-Endpunkte, Dataverse-Schlüssel und Funktionsnamen bleiben unverändert;
`specs/kiosk-umbau` F7 (Funktionserhalt) gilt weiter.

Betroffene Dateien nach heutigem Stand:

| Datei | Rolle |
| --- | --- |
| `static-site/css/kiosk-neu.css` | Gestaltungsblatt, Abschnitt 14 (Bäcker) |
| `static-site/css/kiosk-base.css` | Grundmaße `.bk-day`, `.gk-*` |
| `static-site/js/kiosk-baecker.js` | `tagesleiste()`, Infokasten, Fußzeile |
| `static-site/js/kiosk-getraenke.js` | Aufbau des Reiters, Zeilenhöhe |
| `tests/kiosk-bestellreiter-mobil.spec.js` | neuer Wächter (F7) |

## Open Questions

Keine offenen Punkte.

## Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 | TC-F1-01 … 03 | — | — |
| F2 | TC-F2-01, TC-F2-02 | — | — |
| F3 | TC-F3-01 … 03 | — | — |
| F4 | TC-F4-01 … 04 | — | — |
| F5 | TC-F5-01 … 03 | — | — |
| F6 | TC-F6-01, TC-F6-02 | — | — |
| F7 | TC-F7-01 | — | — |
