# CMS im Kiosk-Design — Specification

> Spec-driven development. Every requirement carries explicit test cases.
> Ein Spec mit offenen `[NEEDS CLARIFICATION]`-Markern darf NICHT nach `/sdd-plan`.

**Status:** Implemented — produktiv seit dem Umschalten (Stufe 4)

**Owner:** Dorfladen — Ladenleitung (CMS-Pflege)

**Last updated:** 2026-09-09

## Overview

Der Kiosk wurde umgebaut und läuft seit v1.7.0 im neuen Erscheinungsbild:
ruhige Farbpalette, Rasterhülle, Navigation als Leiste, Dialoge als Blatt,
44-px-Bedienmaße, Dunkelmodus. Das **CMS** — die Pflegeoberfläche für
Wochenplan, Angebote, Homepage, Sortiment, Bestellungen und Social —
kommt aus einer früheren Zeit und sieht daneben fremd aus.

Dieses Feature stellt das CMS **vollständig auf dasselbe Designschema um**,
**ohne eine einzige Funktion zu verlieren**.

Der Bestand (Stand 2026-09-09):

| Kennzahl | CMS | zum Vergleich: Kiosk |
| --- | --- | --- |
| `cms.html` | 4 022 Zeilen / 352 KB | 6 226 Zeilen |
| `cms.js` | 10 639 Zeilen / 602 KB | (mehrere Module) |
| Bereiche (Reiter) | **15** | 8 |
| DOM-Zugriffe aus dem Skript | ~915 (`getElementById` 715, `querySelector` ~200) | — |
| `onclick`-Attribute im HTML | 104 | — |
| `data-action`-Attribute | 119 | — |
| **Inline-Gestaltungen** | **2 306 `style="…"` mit 7 528 Deklarationen** | im Kiosk: keine nennenswerten |
| davon verschiedene Deklarationen | **741** | — |
| eingebettetes `<style>` | 615 Zeilen (Z. 24–639) | 1 363 Zeilen |

**Der entscheidende Unterschied zum Kiosk-Umbau:** Beim Kiosk steckte das
gesamte Aussehen in **einem** `<style>`-Block; ihn auszutauschen genügte, und
alle Funktionen blieben bauartbedingt erhalten. Im CMS liegen rund **zwei
Drittel des Aussehens in Inline-Gestaltungen**, die jedes Gestaltungsblatt
überstimmen. Ein reiner Blattaustausch würde hier fast nichts bewirken. Diese
Spezifikation trägt dem Rechnung.

## Goals

- Das CMS sieht aus und bedient sich wie der umgebaute Kiosk — **dieselben**
  Farben, Abstände, Rundungen, Schriftgrade, Bedienmaße und Dialogmuster.
- **Kein Funktionsverlust.** Jede heute vorhandene Bedienmöglichkeit ist danach
  vorhanden und tut dasselbe. Das wird **maschinell nachgewiesen**, nicht
  behauptet.
- Ein **lokaler Prototyp mit Live-Daten** erlaubt die Abnahme, bevor
  irgendetwas veröffentlicht wird.
- Die Umstellung ist **in Stufen** abnehmbar und jederzeit umkehrbar.
- Das Designschema wird zur **gemeinsamen, benannten Grundlage** — nicht zum
  zweiten Mal abgetippt.
- Konform zur Konstitution: drei Bildschirmgrößen, verständliche Meldungen,
  automatisierte Tests.

## Non-Goals

- **Keine neue Fachfunktion.** Es kommt nichts hinzu und nichts weg. Wünsche
  nach neuen Funktionen sind eigene Spezifikationen.
- **Kein Umschreiben von `cms.js`.** Die 10 639 Zeilen Fachlogik werden nicht
  angefasst; jede angefasste Zeile wäre ein Rückfallrisiko.
- **Keine Änderung an den API-Endpunkten** und an keiner gespeicherten Angabe.
- Keine Modularisierung von `cms.js`, keine Umstellung auf ein
  Oberflächen-Rahmenwerk, kein Umbau der Anmeldung.
- Keine Änderung an den mitbenutzten Skripten (`social.js`, `social-poster.js`,
  `hilfe-popup.js`, `admin-auth.js`, `dl-confirm.js`).
- Keine Umbenennung von DOM-Kennungen, Klassennamen, `data-action`-Werten oder
  globalen Funktionsnamen.

## Decisions (aufgelöste Klärungen)

1. **Umbauform.** Wie beim Kiosk entsteht die neue Seite **erzeugt** aus der
   gepflegten Quelle — nicht als Handkopie. `cms.html` bleibt die einzige
   Stelle, an der die Fachlogik gepflegt wird; ein Werkzeug formt daraus
   `cms-neu.html`. Alles, was keine Regel trifft, wird zeichengleich
   übernommen.
2. **Inline-Gestaltung.** Sie wird **nicht entfernt**, sondern **umgewertet**:
   Die 741 verschiedenen Deklarationen werden über eine Zuordnungstabelle auf
   die Gestaltungswerte des Schemas gezogen (`color:#374151` → `color:var(--ink)`,
   `font-size:12px` → `font-size:var(--schrift-klein)`). Das Verfahren rührt
   den Mechanismus nicht an: Was `cms.js` zur Laufzeit an `style` schreibt oder
   liest, funktioniert unverändert weiter.
3. **Navigation.** 15 Reiter passen nicht in die Kiosk-Reiterleiste. Das CMS
   bekommt dieselbe Leiste **als Seitenleiste mit Gruppen** (siehe F3).
4. **Kein Vollbild-Neuentwurf je Bereich.** Die Bereiche behalten ihren
   inhaltlichen Aufbau. Neu sind Hülle, Navigation, Werte und Muster — nicht
   die Anordnung der Felder. Alles andere wäre in einer Stufe nicht abnehmbar.
5. **Nachweis des Funktionserhalts.** Ein Werkzeug vergleicht alt und neu
   maschinell: jede Kennung, jedes `onclick`, jedes `data-action`, jeder
   Klassenname, jedes Formularfeld. Abweichungen sind Fehler, keine
   Ermessensfrage.
6. **Anmeldung.** Der Prototyp verwendet die echte CMS-Anmeldung gegen die
   Live-API. Das Kennwort wird **nirgends** im Repo, in Skripten oder in
   Testdaten abgelegt; es gibt es an der Oberfläche ein.

## Requirements

### F1: Gemeinsame Gestaltungsgrundlage

#### F1 Description

Die Gestaltungswerte des Kiosk-Umbaus (Farben, Abstände, Rundungen, Schatten,
Schriftgrade, Bedienmaße, Umschaltpunkte) werden aus `css/kiosk-neu.css`
herausgelöst in ein **gemeinsames Blatt**, das Kiosk und CMS benutzen.

#### F1 Behaviour / Acceptance

- Es gibt genau **eine** Stelle, an der ein Wert des Schemas steht.
- Der Kiosk sieht nach der Herauslösung **unverändert** aus.
- Das CMS bezieht dieselben Werte unter denselben Namen.

#### F1 Test Cases

**TC-F1-01: Kiosk bleibt unverändert**

- **Setup:** Kiosk vor und nach der Herauslösung.
- **Expected:** Die errechneten Werte von `--gr`, `--ink`, `--flaeche`,
  `--tap-min`, `--r-m` sind identisch.

**TC-F1-02: CMS bezieht dieselben Werte**

- **Expected:** `getComputedStyle` liefert im CMS für `--gr`, `--ink`,
  `--flaeche`, `--tap-min` dieselben Werte wie im Kiosk.

**TC-F1-03: Ein Wert, eine Stelle**

- **Expected:** Keiner der Schemawerte ist in `kiosk-neu.css` **und**
  `cms-neu.css` gesetzt.

### F2: Funktionserhalt — maschinell nachgewiesen

#### F2 Description

Die neue Seite bietet **jede** Bedienmöglichkeit der alten. Nachgewiesen wird
das durch einen Abgleich, der beide Seiten ausliest und vergleicht.

#### F2 Inputs

| Input | Required | Description |
| --- | --- | --- |
| `cms.html` | Ja | Ausgangsstand |
| `cms-neu.html` | Ja | erzeugter Stand |

#### F2 Behaviour / Acceptance

- **Jede** DOM-Kennung (`id`) der alten Seite existiert in der neuen.
- **Jeder** `onclick`-Aufruf ist unverändert vorhanden.
- **Jedes** `data-action`/`data-id`-Paar ist vorhanden.
- **Jedes** Formularfeld (`input`, `select`, `textarea`) ist mit gleicher
  Kennung, gleichem Typ und gleichem `name` vorhanden.
- **Jeder** Klassenname, den `cms.js` per `querySelector` sucht, existiert
  weiterhin.
- Neue Kennungen dürfen hinzukommen; fehlende sind ein Fehler.

#### F2 Test Cases

**TC-F2-01: Keine Kennung geht verloren**

- **Action:** Abgleichwerkzeug über beide Dateien.
- **Expected:** Fehlende Kennungen: 0.

**TC-F2-02: Kein Aufruf geht verloren**

- **Expected:** Fehlende `onclick`-Aufrufe: 0; fehlende `data-action`: 0.

**TC-F2-03: Kein Formularfeld geht verloren**

- **Expected:** Fehlende Felder: 0; abweichende Feldtypen: 0.

**TC-F2-04: Alle 15 Bereiche sind erreichbar**

- **Setup:** Neue Seite, angemeldet.
- **Action:** Jeden Bereich nacheinander öffnen.
- **Expected:** Jeder Bereich wird sichtbar, keiner meldet einen Fehler in der
  Browserkonsole.

**TC-F2-05: Die globalen Funktionen sind alle da**

- **Expected:** Jeder Name, den die alte Seite an `window` hängt, ist auch in
  der neuen vorhanden.

### F3: Navigation für 15 Bereiche

#### F3 Description

Das CMS bekommt die Navigation des Kiosks, angepasst an 15 Bereiche: auf dem
Telefon eine ausklappbare Leiste, ab Tablet eine Seitenleiste, ab 1180 px eine
breite Seitenleiste mit Beschriftungen — die Bereiche in **Gruppen**.

#### F3 Inputs

| Input | Required | Description |
| --- | --- | --- |
| Gruppierung | Ja | „Laden" (Wochenplan, Öffnungszeiten, Angebote, Sortiment) · „Website" (Homepage, News, Galerie, Design) · „Verkauf" (Bestellungen, Metzger, Kunden/Statistik) · „Kanäle" (Social, Push) · „System" (Einstellungen, Hilfe) |

#### F3 Behaviour / Acceptance

- Der Reiterwechsel läuft weiterhin über `data-action="tab"` und `data-id`;
  die Kennungen `cms-tab-*` und `cms-panel-*` bleiben.
- Der aktive Bereich ist erkennbar, ohne dass Farbe allein den Unterschied
  macht.
- Auf dem Telefon verdeckt die Navigation den Inhalt nicht dauerhaft.
- Kein waagerechter Rollstreifen bei 320 px.
- Die bunten Reiterfarben (`style="color:#7c3aed"` und weitere) entfallen
  zugunsten der Hauspalette.

#### F3 Test Cases

**TC-F3-01: Alle 15 Bereiche in der Navigation**

- **Expected:** 15 Einträge mit `class="cms-tab"` und `data-id`.

**TC-F3-02: Umschalten funktioniert**

- **Action:** Auf jeden Eintrag tippen.
- **Expected:** Das zugehörige `#cms-panel-*` wird sichtbar, die übrigen nicht.

**TC-F3-03: Navigation über drei Größen**

- **Expected:** 375 px unten/ausklappbar, 768 px schmale Leiste, 1280 px breite
  Leiste mit Beschriftung; nirgends abgeschnittener Text.

**TC-F3-04: Kein waagerechter Rollstreifen**

- **Setup:** 320, 375, 768, 1024, 1280, 1920 px.
- **Expected:** `scrollWidth <= clientWidth` in jedem Bereich.

### F4: Inline-Gestaltung auf das Schema ziehen

#### F4 Description

Die 7 528 Inline-Deklarationen werden über eine Zuordnungstabelle auf die
Werte des Schemas umgestellt. Was sich nicht zuordnen lässt, bleibt stehen und
wird berichtet — stillschweigend verschluckt wird nichts.

#### F4 Inputs

| Input | Required | Description |
| --- | --- | --- |
| Zuordnungstabelle | Ja | Deklaration → Schemawert, z. B. `color:#374151` → `color:var(--ink)` |

#### F4 Behaviour / Acceptance

- **Zustandstragende** Angaben bleiben unangetastet: `display`, `visibility`,
  `width`/`height` an Fortschrittsbalken, `transform`, `position`, `z-index`,
  `order`, `flex`.
- Umgestellt werden ausschließlich **gestalterische** Angaben: Farbe,
  Hintergrund, Schriftgrad, Schriftschnitt, Innen- und Außenabstand, Rahmen,
  Rundung, Schatten, Zeilenhöhe.
- Das Werkzeug meldet nach jedem Lauf: umgestellt, unverändert gelassen,
  **nicht zugeordnet** (mit Fundstelle).
- Die Zahl der `style="…"`-Attribute ändert sich nicht — es ändern sich nur
  ihre Werte. Damit bleibt jeder Lese- und Schreibzugriff aus `cms.js` gültig.

#### F4 Test Cases

**TC-F4-01: Zustand bleibt unangetastet**

- **Expected:** Jedes `display:` im alten Stand steht unverändert im neuen.

**TC-F4-02: Farben kommen aus dem Schema**

- **Expected:** In `cms-neu.html` kommt keine der zugeordneten Farbschreibweisen
  (`#374151`, `#1f2937`, `#6b7280`, `#e5e7eb` …) mehr als Literal vor.

**TC-F4-03: Nichts wird verschluckt**

- **Expected:** Der Bericht nennt jede nicht zugeordnete Deklaration; die Liste
  ist bei der Abnahme leer oder ausdrücklich abgenommen.

**TC-F4-04: Die Zahl der Attribute bleibt gleich**

- **Expected:** Gleich viele `style="`-Attribute in alt und neu.

### F5: Lokaler Prototyp mit Live-Daten

#### F5 Description

Vor jeder Veröffentlichung steht ein Prototyp bereit, der lokal ausgeliefert
wird und mit den **echten** Daten arbeitet.

#### F5 Behaviour / Acceptance

- `http://localhost:<port>/cms-neu.html` zeigt das neue CMS; `/api/*` geht an
  die Live-Umgebung (bestehender Entwicklungs-Vermittler).
- Die alte Oberfläche bleibt unter `cms.html` unverändert erreichbar — zum
  Vergleichen und als Rückfallweg.
- Ein deutlich sichtbarer Streifen weist darauf hin: **„Entwurf — wirkt auf
  echte Daten"**.
- Das Kennwort wird nirgends abgelegt.

#### F5 Test Cases

**TC-F5-01: Prototyp lädt und meldet sich an**

- **Expected:** Nach Eingabe des Kennworts erscheint die Oberfläche mit echten
  Daten.

**TC-F5-02: Der Hinweisstreifen ist da**

- **Expected:** Der Text „wirkt auf echte Daten" ist sichtbar.

**TC-F5-03: Die alte Oberfläche bleibt unberührt**

- **Expected:** `cms.html` zeigt weiterhin den gewohnten Stand.

### F6: Bedienbarkeit und Erscheinungsbild

#### F6 Description

Das CMS hält dieselben Regeln ein wie der umgebaute Kiosk.

#### F6 Behaviour / Acceptance

- Bedienelemente mindestens 44 px hoch.
- Kein abgeschnittener Text, keine gekappten Umlautpunkte (Zeilenhöhe ≥ 1,3).
- Keine waagerechten Rollstreifen bei 320–1920 px.
- Dialoge folgen dem Blattmuster: Telefon unten, ab 1180 px angedockte Spalte.
- Schriftschnitt höchstens halbfett (≤ 600).
- Der Dunkelmodus funktioniert in jedem Bereich.
- Meldungen bleiben, wie sie sind — verständliches Deutsch, keine technischen
  Angaben.

#### F6 Test Cases

**TC-F6-01: Bedienmaße**

- **Expected:** In jedem der 15 Bereiche ist kein Knopf niedriger als 44 px.

**TC-F6-02: Kein Überlauf**

- **Setup:** 6 Breiten × 15 Bereiche.
- **Expected:** Kein waagerechter Rollstreifen, kein Element ragt heraus.

**TC-F6-03: Dialoge als Blatt**

- **Expected:** `#cms-modal-wrap` folgt dem Blattmuster; auf 1280 px angedockt.

**TC-F6-04: Dunkelmodus**

- **Expected:** In jedem Bereich ist der Textkontrast ausreichend; keine weiße
  Fläche auf dunklem Grund.

**TC-F6-05: Halbfett genügt**

- **Expected:** Kein Element mit `font-weight` über 600.

### F7: Umkehrbarkeit und Übergabe

#### F7 Description

Bis zur Abnahme lässt sich der Umbau jederzeit zurücknehmen; nach der Abnahme
wird aus der Umformung ein einmaliger Schreibvorgang.

#### F7 Behaviour / Acceptance

- Solange der Prototyp läuft, ist `cms.html` unverändert.
- Nach der Abnahme wird `cms.html` durch den erzeugten Stand ersetzt, die alte
  Fassung bleibt als `cms-klassisch.html` erreichbar — genau wie beim Kiosk.
- Das Umformungswerkzeug bricht ab, wenn ein Anker nicht greift. Ein
  stillschweigend übersprungener Umbau wäre der gefährlichste Fehler.

#### F7 Test Cases

**TC-F7-01: Werkzeug bricht bei fehlendem Anker ab**

- **Setup:** Anker künstlich entfernen.
- **Expected:** Das Werkzeug endet mit Fehler und schreibt keine Datei.

**TC-F7-02: Rückfallweg vorhanden**

- **Expected:** Nach dem Umschalten ist `cms-klassisch.html` erreichbar und
  vollständig bedienbar.

## Data & Contracts

**Keine Änderung an Daten oder Schnittstellen.** Es werden keine Endpunkte
angefasst, keine Felder umbenannt, nichts gespeichert, was es nicht schon gibt.

Neue Dateien im Frontend:

| Datei | Rolle |
| --- | --- |
| `static-site/cms-klassisch.html` | Die gepflegte Quelle (vormals `cms.html`) |
| `static-site/css/dl-design.css` | Das gemeinsame Schema (F1) |
| `static-site/css/cms-neu.css` | Das Gestaltungsblatt des CMS |
| `static-site/cms.html` | Erzeugt — die Seite, mit der gearbeitet wird |
| `static-site/cms-neu.html` | Erzeugt — Vorschau mit Entwurfshinweis (F5) |
| `tools/build-cms-neu.js` | Die Umformung |
| `tools/pruef-cms-abgleich.js` | Der Funktionsabgleich (F2) |
| `tools/pruef-cms-darstellung.js` | Die Darstellungsprüfung (F3, F6) |
| `tools/cms-stilwerte.json` | Die Zuordnungstabelle (F4) |

## Open Questions

Keine offenen Punkte, die den Plan aufhalten. Zwei Punkte sind bewusst als
**Abnahmefragen** an den Auftraggeber gestellt und in Stufe 2 zu klären:

- Die vorgeschlagene **Gruppierung der 15 Bereiche** (F3) ist ein Vorschlag aus
  der Sache heraus; sie lässt sich ohne Aufwand ändern.
- Ob die **bunten Reiterfarben** ganz entfallen oder als kleiner Farbpunkt je
  Gruppe erhalten bleiben. Vorschlag: Farbpunkt je Gruppe.

## Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 Gemeinsame Grundlage | TC-F1-01 … TC-F1-03 | Stufe 0 | — |
| F2 Funktionserhalt | TC-F2-01 … TC-F2-05 | Der Abgleich | — |
| F3 Navigation | TC-F3-01 … TC-F3-04 | Stufe 1 | — |
| F4 Inline-Gestaltung | TC-F4-01 … TC-F4-04 | Stufe 2 | — |
| F5 Prototyp | TC-F5-01 … TC-F5-03 | Stufe 1 | — |
| F6 Bedienbarkeit | TC-F6-01 … TC-F6-05 | Stufe 3 | — |
| F7 Umkehrbarkeit | TC-F7-01, TC-F7-02 | Stufe 4 | — |
