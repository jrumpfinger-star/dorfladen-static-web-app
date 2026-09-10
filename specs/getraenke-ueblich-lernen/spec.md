# Getränke „üblich" fortschreiben — Specification

**Status:** Umgesetzt

**Owner:** Ladenleitung Dorfladen Oberornau

**Last updated:** 2026-09-10

## Overview

Das Getränke-Bestellformular (Getränke Kratzer) zeigt je Artikel zwei
Hilfen: den Vorschlagsknopf **„üblich N"** (eine typische Kistenzahl) und den
Filter **„Übliche Artikel"**. Beide speisen sich aus zwei Katalogfeldern:

- `ueblich` — der Median der bisherigen Bestellmengen dieses Artikels.
- `bestellungen` — in wie vielen früheren Bestellungen der Artikel vorkam.

Diese Werte wurden **einmalig offline** aus den abgelegten Kratzer-E-Mails
berechnet (`tools/getraenke_katalog_build.py`) und liegen als Startbestand in
`api/getraenke-order/vorlage/katalog.json`. Zur Laufzeit werden sie **nie
aktualisiert**: `_senden` (api/getraenke-order/__init__.py) speichert die
Bestellung, rechnet den Katalog aber trotz des Kommentars „den Katalog
nachfuehren" nicht fort. Neu angelegte Artikel starten mit
`bestellungen: 0, ueblich: null` und bekommen nie einen Wert.

Damit veraltet „üblich": Es spiegelt nur die anfängliche E-Mail-Auswertung,
nicht das laufende Bestellverhalten.

**Die anderen beiden Reiter lösen das bereits** (Analyse in diesem Vorhaben):

- **Bäcker** ist durch Konstruktion selbstaktualisierend: Die Vorbelegung ist
  die *letzte gesendete Bestellung desselben Wochentags*
  (`vorlage_bestellungen`, api/baecker-order/store.py); die
  Rechnungs-Startwerte dienen nur als Kaltstart, bis eine echte Bestellung
  vorliegt. Kein statistisches Feld, keine Veraltung.
- **Metzger** *lernt beim Senden*: `_senden` (api/metzger-order/__init__.py)
  ruft `lerne` und `save_vorschlaege` (api/metzger-order/metzger_store.py) auf
  und schreibt die Portionsvorschläge mit zeitgewichteten Punkten
  (Halbwertszeit) fort; die Rechnungen sind nur der Startbestand.

Getränke ist damit der einzige Reiter ohne Fortschreibung. Diese Spec schließt
die Lücke **nach dem Metzger-Muster**: beim Senden lernen.

## Goals

- Nach jedem gesendeten (oder korrigierten) Getränke-Auftrag spiegeln
  `ueblich` und `bestellungen` das tatsächliche, laufende Bestellverhalten.
- Selbst angelegte Artikel erhalten mit der Zeit automatisch einen
  „üblich"-Wert und rücken in die Liste „Übliche Artikel", ohne Handarbeit.
- Kein Bruch der bestehenden Reiter (Bäcker, Metzger) und keine Änderung am
  Bedienablauf des Getränke-Reiters — nur die Werte werden lebendig.

## Non-Goals

- Keine Änderung an Bäcker oder Metzger (deren Mechanik bleibt wie sie ist).
- Kein neues UI-Element; der bestehende Knopf „üblich N" und der Filter
  bleiben unverändert, nur ihre Datengrundlage aktualisiert sich.
- Keine Vorhersage/Glättung über das Median-Verfahren hinaus (kein ML).
- Kein Rückschreiben von Preisen (Preise kommen weiter aus den Rechnungen).

## Requirements

### F1: Beim Senden die Statistik fortschreiben

#### F1 Description

Nach erfolgreichem Versand (und bei Korrektur) rechnet der Server je
bestelltem Artikel `bestellungen` und `ueblich` neu und speichert den Katalog
(`save_artikel`) — analog zu `lerne`/`save_vorschlaege` beim Metzger. Der
Schritt läuft **nach** `save_order` und **nur bei erfolgreichem Mailversand**;
scheitert der Versand, bleibt der Katalog unverändert (der Entwurf bleibt
erhalten).

#### F1 Inputs

| Input | Required | Description |
| --- | --- | --- |
| gesendete Positionen | Ja | Die Positionen der soeben gesendeten Bestellung (ganze Kisten je Zeile). |
| Bestellhistorie | Ja | Die bisher gesendeten/korrigierten Bestellungen aus dem Order-Store. |
| Katalog | Ja | Der aktuelle Artikelkatalog (Dataverse oder Seed). |

#### F1 Behaviour / Acceptance

- **Given** eine Bestellung mit Artikel A (Menge m) wird gesendet,
  **when** der Versand gelingt, **then** enthält der gespeicherte Katalog für
  A ein aktualisiertes `bestellungen` und `ueblich`.
- **Given** der Mailversand scheitert, **when** `_senden` mit Fehler endet,
  **then** ist der Katalog unverändert.
- Die Fortschreibung ist **idempotent gegenüber Wiederholung derselben
  Bestellung**: Eine erneut gesendete Korrektur desselben Termins zählt den
  Termin **nicht doppelt** (siehe F5).

#### F1 Test Cases

**TC-F1-01: Senden schreibt bestellungen und ueblich fort**

- **Setup:** Katalog mit Artikel A (`bestellungen: 2, ueblich: 3`); zwei
  frühere gesendete Bestellungen mit A enthalten Mengen 3 und 5.
- **Action:** Neue Bestellung mit A = 7 senden (Mock-Mailversand erfolgreich).
- **Expected:** Gespeicherter Katalog: A hat `bestellungen: 3` und
  `ueblich` = Median(3, 5, 7) = 5.

**TC-F1-02: Gescheiterter Versand lässt den Katalog unberührt**

- **Setup:** Katalog wie oben; Mailversand schlägt fehl (Mock 502).
- **Action:** Bestellung mit A = 7 senden.
- **Expected:** Antwort ist ein Fehler; der Katalog ist unverändert
  (`bestellungen: 2, ueblich: 3`); der Entwurf bleibt erhalten.

### F2: „üblich" ist der Median der jüngsten Bestellmengen

#### F2 Description

`ueblich` ist der auf eine ganze Kiste gerundete Median der Mengen aus den
letzten `K` gesendeten Bestellungen, in denen der Artikel mit Menge > 0 vorkam.
`K` ist ein fester Fensterwert (Vorschlag: `K = 8`), damit alte Ausreißer mit
der Zeit herausfallen, ohne eine Zeitgewichtung wie beim Metzger einzuführen.

#### F2 Inputs

| Input | Required | Description |
| --- | --- | --- |
| Mengenreihe | Ja | Die Bestellmengen des Artikels aus den jüngsten `K` Bestellungen (Menge > 0). |

#### F2 Behaviour / Acceptance

- Median über eine gerade Anzahl Werte wird kaufmännisch auf ganze Kisten
  gerundet.
- Kommt der Artikel in weniger als einer Bestellung vor, ist `ueblich = null`
  (kein Vorschlagsknopf).

#### F2 Test Cases

**TC-F2-01: Median über das Fenster**

- **Setup:** Artikel A kam in Bestellungen mit Mengen 2, 4, 4, 10 vor.
- **Expected:** `ueblich` = Median(2, 4, 4, 10) = 4.

**TC-F2-02: Rundung bei gerader Anzahl**

- **Setup:** Mengen 3 und 6.
- **Expected:** `ueblich` = round((3+6)/2) = 5 (kaufmännisch, ganze Kisten).

**TC-F2-03: Fenster begrenzt den Einfluss alter Werte**

- **Setup:** `K = 8`; neun Bestellungen, die älteste mit Menge 99, die acht
  jüngsten mit Menge 2.
- **Expected:** `ueblich` = 2 (die älteste fällt aus dem Fenster).

### F3: Selbst angelegte Artikel wachsen in die „übliche" Liste hinein

#### F3 Description

Ein im Kiosk angelegter Artikel startet mit `bestellungen: 0, ueblich: null`.
Sobald er in Bestellungen vorkommt, steigen `bestellungen` und ab dem
Schwellwert `UEBLICH_AB` (= 2) erscheint er ohne Zutun im Filter „Übliche
Artikel"; sobald `ueblich` gesetzt ist, trägt seine Zeile den Knopf „üblich N".

#### F3 Test Cases

**TC-F3-01: Neuer Artikel erscheint nach zwei Bestellungen unter „üblich"**

- **Setup:** Neuer Artikel N (`bestellungen: 0, ueblich: null`).
- **Action:** N in zwei aufeinanderfolgenden Bestellungen senden (je Menge 4).
- **Expected:** Katalog: N hat `bestellungen: 2, ueblich: 4`; im Kiosk steht N
  bei Filter „Übliche Artikel" in der Liste und seine Zeile zeigt „üblich 4".

### F4: Einmalige Artikel fließen nicht in die Statistik

#### F4 Description

Positionen, die nur für eine Bestellung angelegt wurden (Kennzeichen
`zusatz`/„nur diese Bestellung"), verändern `bestellungen`/`ueblich` **nicht**
und landen nicht dauerhaft im Katalog — konsistent mit `entwurf_positionen`
(einmalige Artikel werden beim Übernehmen ausgelassen).

#### F4 Test Cases

**TC-F4-01: Zusatzposition zählt nicht**

- **Setup:** Bestellung mit dauerhaftem Artikel A = 3 und einer Zusatzposition
  Z (`zusatz: true`) = 5.
- **Action:** Senden.
- **Expected:** A wird fortgeschrieben; Z taucht im Katalog nicht mit
  `bestellungen`/`ueblich` auf.

### F5: Korrektur überschreibt, zählt nicht doppelt

#### F5 Description

Eine Korrektur desselben Liefertermins ersetzt die zuvor gesendete Bestellung
für die Statistik, statt sie ein zweites Mal zu zählen. `bestellungen` bleibt
die Zahl **verschiedener** Bestelltermine mit dem Artikel; `ueblich` rechnet mit
der korrigierten Menge.

#### F5 Test Cases

**TC-F5-01: Korrektur ersetzt statt zu addieren**

- **Setup:** Termin T mit A = 3 wurde gesendet (`bestellungen` enthält T
  einmal).
- **Action:** Korrektur für T mit A = 8 senden.
- **Expected:** `bestellungen` für A ist unverändert (T zählt weiter einmal);
  `ueblich` rechnet mit 8 statt 3.

### F6: Ableitung aus der Historie statt inkrementeller Zähler

#### F6 Description

`bestellungen` und `ueblich` werden bei jedem Senden **aus dem Order-Store neu
abgeleitet** (Zahl der Termine mit dem Artikel bzw. Median der jüngsten `K`
Mengen), nicht als loser Zähler hochgezählt. So bleiben die Werte auch nach
gelöschten/geänderten Bestellungen korrekt und die Korrektur-Regel (F5) ergibt
sich von selbst.

#### F6 Test Cases

**TC-F6-01: Wert ist reproduzierbar aus der Historie**

- **Setup:** Order-Store mit drei Terminen für A (Mengen 2, 4, 9).
- **Action:** Fortschreibung auslösen (ohne neue Bestellung, reine
  Neuableitung).
- **Expected:** `bestellungen: 3`, `ueblich: 4` — unabhängig vom vorher im
  Katalog stehenden Wert.

### F7: Einmaliger Backfill aus der vorhandenen Historie

#### F7 Description

Beim ersten Lauf mit der neuen Logik werden die Werte für alle Artikel einmal
aus der bereits vorhandenen Bestellhistorie abgeleitet, damit „üblich" nicht
erst nach der nächsten Bestellung aktuell wird. Der Seed-Katalog bleibt
Kaltstart, solange noch keine Historie existiert.

#### F7 Test Cases

**TC-F7-01: Erststart leitet aus vorhandenen Bestellungen ab**

- **Setup:** Kein gespeicherter Katalog in Dataverse, aber drei gesendete
  Bestellungen in der Historie.
- **Action:** Katalog-Fortschreibung/Backfill auslösen.
- **Expected:** Der gespeicherte Katalog trägt für jeden bestellten Artikel die
  aus der Historie abgeleiteten `bestellungen`/`ueblich`.

## Data & Contracts

- **Katalogfelder** (`api/getraenke-order/vorlage/katalog.json`, Dataverse-Key
  `KEY_ARTIKEL`): je Artikel u. a. `nummer`, `name`, `gebinde`, `preis`,
  `bestellungen` (int), `ueblich` (int|null), `aktiv`, `zusatz`.
- **Order-Store**: `store.bestellungen(url, hdrs)` liefert die Bestellungen;
  gezählt/ausgewertet werden nur `STATUS_GESENDET`/`STATUS_KORRIGIERT`.
- **Frontend-Vertrag** unverändert: `kiosk-getraenke.js` nutzt
  `a.ueblich` für den Knopf und `bestellungen >= UEBLICH_AB (=2)` für den
  Filter — beide Felder existieren bereits, nur ihre Pflege ändert sich.
- **Testrahmen**: Server-Logik als Python-Test analog zu
  `tools/metzger_endpunkt_test.py`; die sichtbare Wirkung (neuer Artikel zeigt
  nach Bestellungen „üblich N") zusätzlich als Playwright-Test im
  Getränke-Reiter über die drei Pflicht-Viewports (Konstitution P7/P8).

## Design decisions (aufgelöste Klärungen)

Da die Umsetzung ohne Rückfrage erfolgte, sind die offenen Punkte wie folgt
entschieden (bewusst konservativ, am Metzger-Muster orientiert):

- **Fenster `K` = 8 über die Anzahl Bestellungen** (nicht über einen
  Zeitraum). Bei Kratzer liegen die Bestellungen 6–26 Wochen auseinander; ein
  Zeitfenster wäre bei so unregelmäßigem Rhythmus willkürlich.
- **Einfacher Median der jüngsten `K`, keine Zeitgewichtung.** Die
  Halbwertszeit des Metzgers löst ein Problem (viele, dichte Portionsvarianten),
  das es bei ganzen Kisten nicht gibt. Weniger Komplexität, gleiches Ziel.
- **Backfill automatisch durch Neuableitung aus der Historie** (F6): Jede
  Fortschreibung rechnet den ganzen Katalog aus dem Order-Store neu; ein
  separater Backfill-Lauf entfällt. Der Seed bleibt Kaltstart, solange keine
  Historie existiert.

## Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 | TC-F1-01, TC-F1-02 | — | — |
| F2 | TC-F2-01, TC-F2-02, TC-F2-03 | — | — |
| F3 | TC-F3-01 | — | — |
| F4 | TC-F4-01 | — | — |
| F5 | TC-F5-01 | — | — |
| F6 | TC-F6-01 | — | — |
| F7 | TC-F7-01 | — | — |
