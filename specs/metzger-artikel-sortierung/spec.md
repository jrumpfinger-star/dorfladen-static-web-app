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

**Unverändert bleibt das versendete Dokument.** Das PDF an die Metzgerei
führt weiterhin den Katalog in seiner gespeicherten Reihenfolge — der
Empfänger liest es neben seinem eigenen Formular. Diese Reihenfolge betrifft
einen Dritten und wurde nicht beanstandet.

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

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| [kiosk-metzger-bestellung.js](../../static-site/js/kiosk-metzger-bestellung.js) | `nachGruppeUndNummer`, `liste`, `artikelSortiert`, `artikelKopf`, `asuch`, `sprungleiste` |
| [kiosk-neu.css](../../static-site/css/kiosk-neu.css) | `.mb-asuche`, `.mb-aleer` |
| [metzger-bestellung/spec.md](../metzger-bestellung/spec.md) | Leitentscheidung 7 abgelöst |
| [kiosk-metzger-sortierung.spec.js](../../tests/kiosk-metzger-sortierung.spec.js) | neu, 10 Fälle |
