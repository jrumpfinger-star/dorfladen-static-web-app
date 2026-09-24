# Artikel nach Gruppe und Nummer, mit Suche im Artikelstamm

## Overview

Zwei Meldungen aus dem Laden — eine Wurzel.

> *„Es sollte auch nach Gruppe und dann aufsteigend nach Nummer sortiert
> werden. Außerdem wäre eine Suche hier sinnvoll."*

> *„Warum erscheint Schnitzel vom Strohschwein in einer eigenen Gruppe
> Fleisch frisch?"*

## Ursache

Beide Listen — Bestellung und Artikelverwaltung — liefen in der **Reihenfolge
des Katalogs**. Die Gruppenüberschrift wurde immer dann gesetzt, wenn sich die
Gruppe gegenüber der Vorzeile änderte:

```js
if (a.gruppe !== gruppe) { … Überschrift … }
```

Ein **neu angelegter Artikel wird hinten angehängt**. Trägt er eine Gruppe,
die weiter oben schon vorkam, beginnt am Listenende ein **zweiter Block mit
derselben Überschrift** — genau der gemeldete Fall: „Schnitzel vom
Strohschwein" (Nr. 3, Fleisch frisch) stand ganz unten unter einer zweiten
Überschrift „FLEISCH FRISCH".

Nachgemessen: Die ausgelieferte `katalog.json` ist sauber — neun Gruppen,
jede in genau einem Block, kein „Strohschwein". Der Artikel wurde also **im
Betrieb angelegt** und ans Ende geschrieben. Jeder künftige neue Artikel
hätte denselben Effekt gehabt.

## Die frühere Regel ist abgelöst

Bisher galt: *„Die **Formularreihenfolge** des Papiers, unverändert"*
(metzger-bestellung, Leitentscheidung 7). Ausdrücklich verworfen:

> *„Das kann ignoriert werden und macht keinen Sinn."*

Die Begründung trug ohnehin nicht mehr: Sobald ein Artikel nachgetragen wird,
entspricht die Liste dem Papier nicht mehr — sie bekommt nur zusätzlich einen
doppelten Abschnitt.

## F1: Sortiert nach Gruppe und Nummer

- **Beide Listen** — Bestellung und Artikelverwaltung — nutzen dieselbe
  Ordnung. Ein Helfer, eine Wahrheit.
- **Reihenfolge der Gruppen:** die des Katalogs, also die gewohnte
  Abschnittsfolge (Fleisch frisch, Brät & Leberkäse, Schinken & Speck,
  Salami …). Alphabetisch zu ordnen würde sie ohne Gewinn zerreißen —
  „Brät & Leberkäse" käme vor „Fleisch frisch".
- **Innerhalb der Gruppe:** aufsteigend nach Artikelnummer.
- **Artikel ohne Nummer** stehen am Ende ihrer Gruppe, dort nach Namen. Sie
  lassen sich nicht einreihen, und es sind gerade die, die der Metzger nicht
  nummeriert.
- Die **Sprungmarken** zu den Warengruppen laufen in derselben Ordnung, sonst
  zeigten sie auf die falschen Abschnitte.

**Das versendete PDF folgt derselben Ordnung.** Nachgereicht: *„ja, stell es
auch um."*

Entscheidend ist der **Gleichlauf**: Wer im Laden am Schirm erfasst, prüft
danach den Ausdruck. Laufen die beiden Listen auseinander, muss man bei jeder
Zeile suchen. Die Sortierung sitzt dafür in `store.nach_gruppe_und_nummer`
und wird vor `build_pdf` angewandt; das PDF arbeitet sie nur noch ab.

Gruppenüberschriften erscheinen im Dokument weiterhin **nicht** — daran hat
sich nichts geändert. Die Abschnitte sind an den Nummernsprüngen erkennbar,
genau wie auf dem Papier.

## F2: Suche im Artikelstamm

- Eigenes Suchfeld im Reiter „Artikel", neben Zähler und „+ Neuer Artikel".
- Sucht in **Name, Nummer und Gruppe**.
- Der Zähler nennt bei aktiver Suche **„n von m"** statt „m Artikel".
- Ohne Treffer steht eine Erklärung statt einer leeren Fläche.
- **Getrennt von der Suche im Bestellreiter.** Die beiden Reiter zeigen
  verschiedene Listen; ein mitwanderndes Suchwort hätte beim Umschalten
  unversehens den Artikelstamm gefiltert.
- Das Feld behält den Eingabestand: `render()` baut das Markup neu, deshalb
  wird der Fokus danach zurückgesetzt — sonst verlöre man ihn nach jedem
  Zeichen.

## Test Cases

**TC-MS-01: Jede Gruppe steht nur EINMAL in der Bestellliste** — der
gemeldete Fall.

**TC-MS-02: Der nachgetragene Artikel steht bei seiner Gruppe** — „Strohschwein"
vor der nächsten Gruppenüberschrift.

**TC-MS-03: In der Verwaltung laufen die Nummern je Gruppe aufsteigend** —
erwartet `2, 3, 109, 360, –, 402, 407`.

**TC-MS-04: Artikel ohne Nummer stehen am Ende ihrer Gruppe.**

**TC-MS-05: Die Gruppenfolge bleibt die gewohnte** — nicht alphabetisch.

**TC-MS-06: Die Verwaltung hat ein Suchfeld.**

**TC-MS-07: Die Suche filtert nach Name, Nummer und Gruppe.**

**TC-MS-08: Der Zähler nennt Treffer und Gesamtzahl.**

**TC-MS-09: Ohne Treffer steht eine Erklärung da.**

**TC-MS-10: Die Suche der Verwaltung wirkt nicht in die Bestellliste.**

Der Prüfbestand bildet die gemeldete Lage nach: „Fleisch frisch" vorn **und**
am Ende noch einmal, Nummern durcheinander.

**Gegenprobe gemacht:** Wird allein der Vergleich der Sortierung
neutralisiert (`return 0`), fallen **genau die vier Sortierfälle**
TC-MS-01…04; die sechs übrigen bleiben grün. Ein erster, gröberer Versuch
hatte das Modul zerstört und alle zehn fallen lassen — das hätte nichts
bewiesen.

### Server und PDF (`tools/metzger_sortierung_test.py`, ohne Netz)

**TC-MP-01: Nach Gruppe, darin aufsteigend nach Nummer.**

**TC-MP-02: Der nachgetragene Artikel steht bei seiner Gruppe.**

**TC-MP-03: Jede Gruppe bildet genau einen Block.**

**TC-MP-04: Die Gruppenfolge bleibt die des Katalogs.**

**TC-MP-05: Artikel ohne Nummer stehen am Ende ihrer Gruppe.**

**TC-MP-06: Die Sortierung verändert den Bestand nicht** — nichts verloren,
nichts doppelt, die Eingabeliste bleibt unberührt.

**TC-MP-07: Randfälle stürzen nicht ab** — leere Liste, fehlende Gruppe,
Nummer als Text, Nummer 0.

**TC-MP-08: Das PDF nutzt die Sortierung** — vor `build_pdf` wird sortiert.

**TC-MP-09: Kiosk und Server tragen dieselbe Regel.** Nicht über
Textvergleiche, sondern indem **dieselben Daten durch beide Regeln** laufen;
die Kiosk-Fassung ist dafür in Python nachgebildet. Weicht eine der beiden
ab, fällt es auf.

**Gegenprobe gemacht:** Werden im Server die nummernlosen Artikel nach vorn
statt nach hinten gesetzt, fallen drei Prüfungen — darunter der
Gleichlauf-Vergleich.

Ein erster Entwurf dieser Prüfung endete auf `… or True` und konnte damit
**nie fallen**. Ersetzt.

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| [kiosk-metzger-bestellung.js](../../static-site/js/kiosk-metzger-bestellung.js) | `nachGruppeUndNummer`, `liste`, `artikelSortiert`, `artikelKopf`, `asuch`, `sprungleiste` |
| [metzger_store.py](../../api/metzger-order/metzger_store.py) | `nach_gruppe_und_nummer` |
| [metzger-order/\_\_init\_\_.py](../../api/metzger-order/__init__.py) | sortiert vor `build_pdf` |
| [metzger_pdf.py](../../api/metzger-order/metzger_pdf.py) | Beschreibung nachgezogen |
| [kiosk-neu.css](../../static-site/css/kiosk-neu.css) | `.mb-asuche`, `.mb-aleer` |
| [metzger-bestellung/spec.md](../metzger-bestellung/spec.md) | Leitentscheidung 7 abgelöst |
| [kiosk-metzger-sortierung.spec.js](../../tests/kiosk-metzger-sortierung.spec.js) | neu, 10 Fälle |
| [metzger_sortierung_test.py](../../tools/metzger_sortierung_test.py) | neu, 9 Abschnitte |
