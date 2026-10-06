# Drax-Bestellung — Specification

> Spec-driven development. Every requirement carries explicit test cases.
> Ein Spec mit offenen `[NEEDS CLARIFICATION]`-Markern darf NICHT nach `/sdd-plan`.

**Status:** Draft — Mockup abgenommen

**Owner:** Dorfladen Oberornau — Verkäuferinnen

**Last updated:** 2026-10-07

## Overview

Die Bestellung bei der **Drax Mühle** läuft heute auf Papier: Ein vorgedrucktes
Blatt wird von Hand ausgefüllt (Spalten *Stück · Einheit · Art. Nr ·
Artikelbezeichnung*), die Artikelnummern werden aus dem Kopf gesucht und
eingetragen. Das Foto des zuletzt verwendeten Blattes liegt unter
`Drax/WhatsApp Image 2026-10-06 at 15.00.20.jpeg`.

Daraus folgen dieselben Schwächen wie beim Bäcker vor der Umstellung:

- **Artikelnummern werden von Hand gesucht.** Die Gebindegröße steckt in der
  Nummer — `40401`/`40402`/`40405`/`40408` ist Weizenmehl 405 in 1 / 2,5 / 5 /
  12,5 kg. Ein Zahlendreher bestellt die falsche Packungsgröße.
- **Korrekturen entstehen durch Durchstreichen.** Auf dem vorliegenden Blatt ist
  eine Zeile durchgestrichen (`80802`, 2,5 kg) und durch `80805` (5 kg, Menge 4)
  ersetzt. Was am Ende gilt, muss der Leser erraten.
- **Nichts erinnert**, wenn die Bestellung am Mittwoch vergessen wird.
- **Das Sortiment ist nirgends vollständig erfasst.** 15 Artikel, die Drax
  regelmäßig liefert, fehlen im Kassen-Export des Ladens.

Dieses Feature ergänzt den Kiosk
([static-site/kiosk.html](../../static-site/kiosk.html)) um einen
**Drax-Tab** mit vier Unterreitern (Bestellung · Verlauf · Artikel ·
Einstellungen) sowie zwei neue Azure-Functions-Endpunkte `api/drax-artikel/`
und `api/drax-order/` (Python, Dataverse-Persistenz analog zu
`api/baecker-order/`).

Referenz-Mockup: [mockups/drax-bestellung-mockup.html](../../mockups/drax-bestellung-mockup.html).

## Datenlage

Zwei Quellen wurden ausgewertet; die Werkzeuge dazu liegen im Repository und
sind jederzeit wiederholbar:

| Quelle | Werkzeug | Ergebnis |
| --- | --- | --- |
| `Drax/data (10).xlsx` (Kassen-Export, 81 Zeilen) | [tools/drax_katalog_aus_xlsx.py](../../tools/drax_katalog_aus_xlsx.py) | Bezeichnung, Artikelnummer, EAN, Verkaufsanzahl 12 Monate |
| `Drax/Rechnung*.pdf` (7 Rechnungen, Aug–Sep 2026) | [tools/drax_rechnung_extract.py](../../tools/drax_rechnung_extract.py) | Artikelstamm **in der Schreibweise der Mühle**, Lieferhistorie, Vorbelegung |

| Merkmal | Befund |
| --- | --- |
| Lieferant | DRAX-MÜHLE GmbH, Hochhaus 5, 83562 Rechtmehring, `info@drax-muehle.de` |
| Kunden-Nr. | **11225** (konstant auf allen Rechnungen und auf dem Papierblatt) |
| Liefertag | **Donnerstag** — 6 von 7 ausgewerteten Lieferungen; eine Ausnahme am Montag, 17.08.2026 |
| Bestellschluss | **Mittwoch 12:00** (vom Betreiber festgelegt) |
| Formularspalten | Stück · Einheit · Art. Nr · Artikelbezeichnung — **keine** Preisspalte |
| Katalog | **96 Artikel** in 9 Warengruppen |
| davon nur aus Rechnungen | **15** — fehlen im Kassen-Export, z. B. `60601`/`60602` Roggenmehl Type 610, `40531` Bio Emmermehl Type 812, `88812` Bio Haferflocken Großblatt |
| Umfang je Lieferung | 7–17 Positionen, 19–58 Stück |
| Spitzenreiter 12 Monate | `40401` Weizenmehl Type 405 1 kg (102×), `88949` Bio Haferflocken Kleinblatt 1 kg (76×), `80802` Dinkelmehl Type 630 2,5 kg (59×) |

### Warengruppen

Neun Gruppen, Reihenfolge nach Bestellhäufigkeit; innerhalb einer Gruppe stehen
die Renner oben:

| Gruppe | Artikel |
| --- | --- |
| Weizenmehl & Grieß | 17 |
| Dinkelmehl & Dinkel | 12 |
| Roggenmehl | 3 |
| Backmischungen | 7 |
| Müsli & Flocken | 23 |
| Backzutaten | 10 |
| Knabbern & Süßes | 16 |
| Nudeln | 3 |
| Sonstiges | 5 |

## Goals

- Bestellung im Kiosk erfassen und **auf einen Knopfdruck** als PDF-Anhang an
  die Mühle senden.
- **Vorbelegung** der Mengen aus der letzten Lieferung, sodass nur Abweichungen
  getippt werden.
- **Erinnerung**, solange der Bestellschluss naht oder überschritten ist.
- Die **Artikelnummer** nie mehr von Hand suchen müssen.
- Korrekturen nachvollziehbar machen, statt sie durchzustreichen.

## Non-Goals

- **Keine Preise, keine Bestellsumme.** Vom Betreiber ausdrücklich so gewünscht:
  Das Blatt soll dem Papierformular entsprechen, und das führt keine Preisspalte.
- **Keine Retourenspalte.** Mehl und Trockenware gehen nicht zurück; die
  ausgewerteten Rechnungen enthalten keine einzige Gutschrift.
- **Keine Bestandsführung.** Was im Regal steht, weiß der Kiosk nicht.
- **Kein zweiter Lieferant** in diesem Modul. Anders als beim Bäcker beliefert
  nur eine Mühle den Laden; der Parameter `lieferant` entfällt.

## Decisions (aufgelöste Klärungen)

| Frage | Entscheidung | Herkunft |
| --- | --- | --- |
| Übermittlungsweg | E-Mail mit Formular im Anhang, wie beim Bäcker | Betreiber, 07.10.2026 |
| Bestellschluss | Mittwoch 12:00 | Betreiber, 07.10.2026 |
| Aussehen des Anhangs | wie das Papierformular: Kopf „Drax Mühle" + KDNr 11225, Spalten Stück · Einheit · Art. Nr · Artikelbezeichnung | Betreiber, 07.10.2026 |
| Preise im Bestellbildschirm | nein, nur Stückzahlen | Betreiber, 07.10.2026 |
| Aufbau der Artikelliste | nach Warengruppen, innerhalb nach Verkaufshäufigkeit | Betreiber, 07.10.2026 |
| Ausbaustufe | volle Parität zum Bäcker (vier Unterreiter) | Betreiber, 07.10.2026 |
| Maßgebliche Bezeichnung | die der Mühle (aus den Rechnungen), nicht die der Kasse — das Blatt liest die Mühle | Auswertung + Betreiber |
| Artikel `78549` | Drax hat das Produkt unter derselben Nummer ausgetauscht: „Tellofix" → „Klare Delikatess-Suppe ‚Frei von'". Der Kassenname ist veraltet und entfällt. | Betreiber, 07.10.2026 |
| Gebindegröße | eigene Zeile je Nummer, **keine** getrennte Einheitenauswahl — so führt die Mühle ihr Sortiment | Auswertung Rechnungen |

## Requirements

<!-- markdownlint-disable MD024 -->

### F1: Liefertag wählen

#### F1 Description

Der Drax-Tab zeigt eine Leiste mit den **nächsten vier Donnerstagen**. Beim
Öffnen ist der nächste Liefertag aktiv, für den noch nicht gesendet wurde.

#### F1 Behaviour / Acceptance

- Given heute ist Montag, When der Tab geöffnet wird, Then ist der **kommende
  Donnerstag** vorausgewählt.
- Given die Bestellung für den kommenden Donnerstag ist bereits gesendet,
  Then ist der **übernächste** Donnerstag vorausgewählt.
- Jeder Tag zeigt seinen Status: `offen` · `gesendet` · `korrigiert`.
- Ist in den Einstellungen ein anderer Liefertag gesetzt, richtet sich die
  Leiste danach — der Donnerstag ist Vorgabe, nicht Gesetz.

#### F1 Test Cases

**TC-F1-01: Nächster Donnerstag ist vorausgewählt**

- **Setup:** Heute Montag, keine Bestellung gesendet.
- **Action:** Drax-Tab öffnen.
- **Expected:** Der kommende Donnerstag ist aktiv; die Kopfzeile nennt
  „Donnerstag" und das Datum.

**TC-F1-02: Gesendeter Tag wird übersprungen**

- **Setup:** Bestellung für den kommenden Donnerstag ist gesendet.
- **Action:** Tab öffnen.
- **Expected:** Der übernächste Donnerstag ist aktiv; der gesendete Tag trägt
  die Kennzeichnung „gesendet".

**TC-F1-03: Nur Donnerstage in der Leiste**

- **Setup:** Liefertag = Donnerstag.
- **Action:** Tagesleiste betrachten.
- **Expected:** Vier Einträge, alle sieben Tage auseinander, alle Donnerstag.

### F2: Mengen aus der letzten Lieferung vorbelegen

#### F2 Description

Beim Öffnen eines offenen Liefertags sind die Mengen der **letzten Lieferung**
bereits eingetragen und als übernommen gekennzeichnet. Sie sparen das Tippen,
gelten aber erst als bestätigt, wenn sie angefasst wurden.

#### F2 Inputs

| Input | Beschreibung |
| --- | --- |
| `datum` | gewählter Liefertag |
| Historie | gesendete/korrigierte Bestellungen, absteigend; ersatzweise `lieferhistorie.json` aus den Rechnungen |

#### F2 Behaviour / Acceptance

- Given es gibt eine vorherige Bestellung, Then werden deren Mengen übernommen
  und die Herkunft genannt („übernommen von der Lieferung am 24.09.").
- Given es gibt **keine** Historie, Then starten alle Mengen bei 0 und der
  Hinweis nennt „keine Vorlage vorhanden".
- Übernommene Zeilen sind sichtbar anders markiert als selbst erfasste.
- Sobald eine Menge geändert wird, verliert die Zeile die Kennzeichnung
  „übernommen".
- Die Fußleiste nennt, wie viele Positionen noch unverändert übernommen sind.

#### F2 Test Cases

**TC-F2-01: Vorbelegung aus der letzten Lieferung**

- **Setup:** Letzte Lieferung 24.09.2026 mit 12 Positionen.
- **Action:** Neuen Liefertag öffnen.
- **Expected:** Dieselben 12 Positionen mit denselben Mengen, alle als
  „übernommen" markiert; Fußleiste nennt „12 übernommen".

**TC-F2-02: Ändern löscht die Kennzeichnung**

- **Setup:** Zeile `40401` ist mit Menge 6 übernommen.
- **Action:** Auf „+" tippen.
- **Expected:** Menge 7, Kennzeichnung „übernommen" verschwunden, Zähler in der
  Fußleiste um eins kleiner.

**TC-F2-03: Ohne Historie leer starten**

- **Setup:** Keine vorherige Bestellung, keine Lieferhistorie.
- **Action:** Tab öffnen.
- **Expected:** Alle Mengen 0, Hinweis „keine Vorlage vorhanden", Senden gesperrt.

### F3: Mengen erfassen

#### F3 Description

Je Artikel eine Zeile mit Artikelnummer, Bezeichnung, Einheit und einem
Mengenfeld aus Minus, Zahl und Plus.

#### F3 Behaviour / Acceptance

- Minus, Zahl und Plus sind jeweils mindestens 40 px hoch (Touch-Bedienung).
- Die Menge lässt sich direkt eintippen; alles außer Ziffern wird verworfen.
- Menge 0 löscht die Position; das Feld bleibt leer statt „0" zu zeigen.
- Zeilen mit Menge > 0 sind links farbig markiert.
- Die Einheit steht als eigenes Merkmal neben der Bezeichnung; Artikel ohne
  Gewichtsangabe tragen „Stück".
- **Keine** Preis- oder Summenangabe (Non-Goal).

#### F3 Test Cases

**TC-F3-01: Plus und Minus**

- **Action:** Dreimal „+", einmal „−" auf `88949`.
- **Expected:** Menge 2.

**TC-F3-02: Minus unter null**

- **Setup:** Menge 1.
- **Action:** Zweimal „−".
- **Expected:** Menge leer, Position gelöscht, keine negative Zahl.

**TC-F3-03: Direkteingabe verwirft Buchstaben**

- **Action:** „a12b" ins Mengenfeld tippen, Feld verlassen.
- **Expected:** Menge 12.

**TC-F3-04: Keine Preise sichtbar**

- **Action:** Bestellbildschirm nach „€" durchsuchen.
- **Expected:** Kein Treffer.

### F4: Artikelliste gliedern, suchen und springen

#### F4 Description

96 Artikel sind zu viele für eine lange Liste. Sie sind nach Warengruppen
gegliedert; eine Sprungleiste und eine Suche führen schnell ans Ziel.

#### F4 Behaviour / Acceptance

- Gruppen erscheinen in fester Reihenfolge; innerhalb einer Gruppe sortiert die
  Verkaufshäufigkeit der letzten zwölf Monate, bei Gleichstand die Zahl der
  Lieferungen, dann der Name.
- Die Sprungleiste nennt je Gruppe die Artikelzahl und scrollt zur Gruppe.
- Die Suche greift auf Bezeichnung **und** Artikelnummer.
- Ein Schalter „Nur bestellt" blendet alles ohne Menge aus.
- Die Liste nutzt mehrere Spalten, sobald die Breite reicht.

#### F4 Test Cases

**TC-F4-01: Reihenfolge innerhalb der Gruppe**

- **Action:** Gruppe „Weizenmehl & Grieß" ansehen.
- **Expected:** `40401` (102×) steht vor `40412` (46×), dieses vor `40408` (0×).

**TC-F4-02: Suche nach Nummer**

- **Action:** „80805" eingeben.
- **Expected:** Genau die Zeile Dinkelmehl Type 630, 5 kg.

**TC-F4-03: Nur bestellt**

- **Setup:** 12 Positionen mit Menge.
- **Action:** Auf „Nur bestellt" schalten.
- **Expected:** 12 Zeilen sichtbar, Gruppentitel nur für belegte Gruppen.

**TC-F4-04: Sprungleiste**

- **Action:** Auf „Müsli & Flocken" tippen.
- **Expected:** Die Liste scrollt zu diesem Gruppentitel; er steht unterhalb des
  festen Kopfes und ist vollständig sichtbar.

### F5: Formular erzeugen

#### F5 Description

Aus den Positionen entsteht ein PDF im Aufbau des Papierformulars. Es ist das,
was die Mühle liest.

#### F5 Behaviour / Acceptance

- Kopf: „Drax Mühle", Empfängerangabe, **KDNr 11225**, Bestelldatum,
  Lieferdatum („Do TT.MM.JJJJ vormittags").
- Tabelle mit genau vier Spalten in der Reihenfolge **Stück · Einheit ·
  Art. Nr · Artikelbezeichnung**.
- Nur Positionen mit Menge > 0 erscheinen.
- Zwischen den Warengruppen steht eine Leerzeile — so ist das Papierblatt
  gegliedert.
- Die Bezeichnung ist die der Mühle, nicht die der Kasse.
- Fußzeile: Anzahl Positionen, Summe der Stück, Absenderanschrift.
- Im Testbetrieb trägt das Blatt einen deutlich sichtbaren Testvermerk.

#### F5 Test Cases

**TC-F5-01: Spaltenfolge**

- **Action:** Formular erzeugen.
- **Expected:** Kopfzeile lautet „Stück | Einheit | Art. Nr | Artikelbezeichnung".

**TC-F5-02: Nur bestellte Positionen**

- **Setup:** 96 Artikel im Katalog, 12 mit Menge.
- **Action:** Formular erzeugen.
- **Expected:** 12 Positionszeilen plus Gruppen-Leerzeilen; kein Artikel ohne Menge.

**TC-F5-03: Kundennummer und Lieferdatum**

- **Action:** Formular für den 15.10.2026 erzeugen.
- **Expected:** Kopf nennt „KDNr 11225" und „Lieferung Do 15.10.2026".

**TC-F5-04: Schreibweise der Mühle**

- **Setup:** Artikel `78549` bestellt.
- **Expected:** Auf dem Blatt steht „Klare Delikatess-Suppe ‚Frei von'", nicht
  „Tellofix".

### F6: Bestellung senden

#### F6 Description

Ein Knopf erzeugt das Formular, hängt es an eine E-Mail und verschickt sie an
die Mühle.

#### F6 Behaviour / Acceptance

- Senden ist gesperrt, solange keine Position eine Menge hat.
- Der Dateiname des Anhangs besteht aus reinen ASCII-Zeichen und nennt
  Lieferant und Lieferdatum (`Drax-Bestellung-2026-10-15.pdf`).
- Nach erfolgreichem Versand wird die Bestellung mit Zeitstempel gespeichert und
  der Tag auf `gesendet` gesetzt.
- Schlägt der Versand fehl, bleibt die Bestellung offen und die Meldung nennt
  den Grund — kein stilles Verschlucken.
- Steht in den Einstellungen die Testadresse, trägt die Mail einen Testvermerk
  im Betreff.

#### F6 Test Cases

**TC-F6-01: Leere Bestellung lässt sich nicht senden**

- **Setup:** Alle Mengen 0.
- **Expected:** Sende-Knopf ist deaktiviert.

**TC-F6-02: Anhangname ohne Sonderzeichen**

- **Action:** Bestellung für den 15.10.2026 senden.
- **Expected:** Anhang heißt `Drax-Bestellung-2026-10-15.pdf`.

**TC-F6-03: Fehler wird gemeldet**

- **Setup:** Mailversand antwortet mit Fehler.
- **Action:** Senden.
- **Expected:** Bestellung bleibt `offen`, Meldung nennt den Fehler, kein
  Zeitstempel gesetzt.

### F7: Sperre und Korrektur

#### F7 Description

Nach dem Versand ist die Bestellung gesperrt. Änderungen gehen nur über eine
ausdrückliche Korrektur — das ersetzt das Durchstreichen auf dem Papier.

#### F7 Behaviour / Acceptance

- Eine gesendete Bestellung ist schreibgeschützt; Mengenfelder sind gesperrt.
- Ein Knopf „Korrektur" hebt die Sperre für diesen Tag auf.
- Die Korrektur erzeugt ein zweites Formular, das im Kopf deutlich
  **„Korrektur"** trägt und das ursprüngliche Sendedatum nennt.
- Geänderte Positionen sind auf dem Korrekturblatt hervorgehoben, gestrichene
  mit Menge 0 aufgeführt — damit die Mühle sieht, was wegfällt.
- Der Verlauf führt Erst- und Korrekturbestellung getrennt auf.

#### F7 Test Cases

**TC-F7-01: Gesperrt nach Versand**

- **Setup:** Bestellung gesendet.
- **Action:** Menge ändern wollen.
- **Expected:** Keine Änderung möglich; Hinweis auf den Korrektur-Knopf.

**TC-F7-02: Korrektur nennt den Vermerk**

- **Action:** Korrektur auslösen, Menge ändern, senden.
- **Expected:** Zweites PDF mit „Korrektur" im Kopf und dem Datum der
  Erstbestellung.

**TC-F7-03: Gestrichene Position erscheint mit 0**

- **Setup:** `80802` war mit 4 bestellt.
- **Action:** In der Korrektur auf 0 setzen, senden.
- **Expected:** `80802` steht auf dem Korrekturblatt mit Menge 0 und ist als
  gestrichen gekennzeichnet.

### F8: Erinnerung ab Bestellschluss

#### F8 Description

Der Tab meldet sich, solange die Bestellung für den nächsten Liefertag fehlt.

#### F8 Behaviour / Acceptance

- Vor dem Schluss nennt ein Hinweis den Bestellschluss und die verbleibende
  Zeit („Bestellschluss: Mittwoch, 07.10. um 12:00 Uhr — noch 20 Stunden").
- Nach dem Schluss und ohne Versand wechselt der Hinweis die Farbe, blinkt und
  rät zum Anruf bei der Mühle.
- Der Kiosk-Reiter trägt in diesem Zustand ein Merkmal, das auch von außerhalb
  des Tabs sichtbar ist.
- Ist gesendet, nennt der Hinweis das nur noch sachlich.

#### F8 Test Cases

**TC-F8-01: Hinweis vor dem Schluss**

- **Setup:** Dienstag, Lieferung Donnerstag.
- **Expected:** Hinweis nennt Mittwoch 12:00 und die Reststunden; kein Blinken.

**TC-F8-02: Blinken nach dem Schluss**

- **Setup:** Mittwoch 13:00, nicht gesendet.
- **Expected:** Hinweis blinkt, Reiter trägt das Merkmal.

**TC-F8-03: Kein Blinken nach Versand**

- **Setup:** Mittwoch 13:00, gesendet.
- **Expected:** Sachlicher Hinweis, kein Blinken, kein Merkmal am Reiter.

### F9: Verlauf

#### F9 Description

Der Reiter *Verlauf* führt alle Lieferungen und Bestellungen auf.

#### F9 Behaviour / Acceptance

- Absteigend nach Liefertag, neueste zuerst.
- Je Zeile: Liefertag, Wochentag, Positionen, Stück, Zustand bzw. Rechnungsnummer.
- Ein Liefertag, der **nicht** auf den eingestellten Liefertag fällt, ist als
  Ausnahme gekennzeichnet.
- Das Formular einer gesendeten Bestellung lässt sich erneut öffnen.
- Die aus den Rechnungen gewonnenen Lieferungen erscheinen mit, solange es noch
  keine eigenen Bestellungen gibt — sonst wäre der Reiter leer.

#### F9 Test Cases

**TC-F9-01: Reihenfolge**

- **Expected:** 24.09.2026 steht oben, 06.08.2026 unten.

**TC-F9-02: Ausnahme gekennzeichnet**

- **Setup:** Lieferung am Montag, 17.08.2026.
- **Expected:** Zeile trägt „Montag — Ausnahme" und hebt sich farblich ab.

**TC-F9-03: Formular erneut öffnen**

- **Action:** Bei einer gesendeten Bestellung auf das Formular tippen.
- **Expected:** Dasselbe PDF wie beim Versand.

### F10: Artikel verwalten

#### F10 Description

Der Reiter *Artikel* zeigt den Artikelstamm und lässt ihn pflegen.

#### F10 Behaviour / Acceptance

- Je Zeile: Nummer, Bezeichnung, Einheit, Warengruppe, Verkaufsanzahl,
  Zahl der Lieferungen.
- Bezeichnung, Einheit, Warengruppe und der Schalter aktiv/inaktiv sind
  bearbeitbar; die **Artikelnummer nicht** — sie ist der Schlüssel zur Mühle.
- Inaktive Artikel erscheinen nicht im Bestellbildschirm, bleiben aber im
  Verlauf lesbar.
- Neue Artikel lassen sich anlegen; die Nummer muss fünfstellig und noch nicht
  vergeben sein.
- Artikel, die nur aus Rechnungen stammen, sind gekennzeichnet.
- Eine Suche filtert über Bezeichnung und Nummer.

#### F10 Test Cases

**TC-F10-01: Nummer ist nicht bearbeitbar**

- **Action:** Artikelnummer anklicken.
- **Expected:** Kein Eingabefeld.

**TC-F10-02: Doppelte Nummer wird abgewiesen**

- **Action:** Neuen Artikel mit Nummer `40401` anlegen.
- **Expected:** Meldung „Nummer bereits vergeben", nichts gespeichert.

**TC-F10-03: Inaktiv verschwindet aus der Bestellung**

- **Action:** `40408` auf inaktiv setzen, zum Bestellbildschirm wechseln.
- **Expected:** `40408` fehlt dort; im Verlauf bleibt es lesbar.

**TC-F10-04: Herkunft gekennzeichnet**

- **Expected:** Die 15 nur aus Rechnungen stammenden Artikel tragen ein Merkmal.

### F11: Einstellungen

#### F11 Description

Der Reiter *Einstellungen* führt alles, was sich ändern kann, ohne Code.

#### F11 Behaviour / Acceptance

- Felder: Empfängeradresse, Anzeigename, Kunden-Nr. (Vorgabe `11225`),
  Liefertag (Vorgabe Donnerstag), Bestellschluss (Vorgabe Mittwoch 12:00),
  Anhangformat (Vorgabe PDF), Vorbelegungsart.
- Solange die Empfängeradresse die Testadresse ist, gilt **Testbetrieb**: Ein
  Warnkasten weist darauf hin, Mail und Formular tragen den Testvermerk.
- Die Einstellungen sind nur mit Anmeldung änderbar.

#### F11 Test Cases

**TC-F11-01: Testbetrieb erkannt**

- **Setup:** Empfänger ist die Testadresse.
- **Expected:** Warnkasten sichtbar; Betreff und Formular tragen den Testvermerk.

**TC-F11-02: Vorgaben stimmen**

- **Setup:** Noch nie gespeichert.
- **Expected:** KDNr `11225`, Liefertag Donnerstag, Schluss Mittwoch 12:00,
  Format PDF.

**TC-F11-03: Ohne Anmeldung keine Änderung**

- **Action:** `POST` auf den Endpunkt ohne Anmeldung.
- **Expected:** `401`, nichts gespeichert.

### F12: Bedienbar am Kiosk und am Handy

#### F12 Behaviour / Acceptance

- Alle Bedienelemente mindestens 40 px hoch.
- Ab etwa 1000 px Breite zwei Spalten, ab etwa 1500 px drei.
- Der Kopf mit Tagesleiste, Suche und Sprungleiste bleibt beim Scrollen stehen.
- Auf dem Handy bleibt die Fußleiste mit den Zählern und dem Sende-Knopf sichtbar.

#### F12 Test Cases

**TC-F12-01: Zwei Spalten ab 1000 px**

- **Action:** Fenster auf 1280 px.
- **Expected:** Die Artikelliste steht zweispaltig.

**TC-F12-02: Eine Spalte am Handy**

- **Action:** Fenster auf 390 px.
- **Expected:** Eine Spalte, keine waagerechte Scrollleiste.

**TC-F12-03: Kopf bleibt stehen**

- **Action:** Bis zur letzten Gruppe scrollen.
- **Expected:** Tagesleiste und Suche weiterhin sichtbar.

### F13: Tab im CMS an- und abschaltbar

#### F13 Behaviour / Acceptance

- Der Drax-Tab hängt am Schalter `kiosk_drax`.
- Ohne gesetzten Schalter ist der Tab **sichtbar** (Standard an), wie bei
  `baecker`, `metzgerbest` und `getraenke`.
- Wird er im CMS abgeschaltet, verschwinden Reiter und Panel; ein offener Tab
  springt auf den ersten sichtbaren.

#### F13 Test Cases

**TC-F13-01: Standard sichtbar**

- **Setup:** Kein Schalter in der Konfiguration.
- **Expected:** Drax-Tab ist da.

**TC-F13-02: Abschalten blendet aus**

- **Action:** `kiosk_drax` im CMS auf aus.
- **Expected:** Reiter und Panel verschwinden; kein Fehler in der Konsole.

## Data / API

### Neue Endpunkte

| Methode | Route | Zweck |
| --- | --- | --- |
| `GET` | `/api/drax-artikel` | Artikelstamm lesen |
| `POST` | `/api/drax-artikel` | Artikel anlegen oder ändern (Anmeldung nötig) |
| `GET` | `/api/drax-order?datum=JJJJ-MM-TT` | Bestellung inkl. Vorbelegung |
| `GET` | `/api/drax-order?mode=uebersicht` | Tagesleiste und Erinnerung |
| `GET` | `/api/drax-order?mode=verlauf` | Verlauf |
| `GET` | `/api/drax-order?mode=config` | Einstellungen |
| `POST` | `/api/drax-order` | Entwurf speichern |
| `POST` | `/api/drax-order` `{aktion:"config"}` | Einstellungen speichern |
| `POST` | `/api/drax-order/{datum}/senden` | Formular erzeugen und senden |
| `POST` | `/api/drax-order/{datum}/korrektur` | Korrektur versenden |

### Vorlagen

| Datei | Inhalt | Erzeugt von |
| --- | --- | --- |
| `api/drax-order/vorlage/katalog-drax.json` | 96 Artikel, Gruppe, Einheit, Häufigkeit | `tools/drax_katalog_aus_xlsx.py` |
| `api/drax-order/vorlage/rechnungsartikel.json` | Artikelstamm aus Sicht der Mühle | `tools/drax_rechnung_extract.py` |
| `api/drax-order/vorlage/lieferhistorie.json` | 7 Liefertage mit Mengen | `tools/drax_rechnung_extract.py` |
| `api/drax-order/vorlage/startwerte-drax.json` | Vorbelegung aus der letzten Lieferung | `tools/drax_rechnung_extract.py` |

### Wiederverwendung

- `shared/auth.py` — `admin_auth_guard` für alle schreibenden Aufrufe.
- `api/baecker-order/store.py` — Vorbild für Persistenz, Konfiguration und
  `bestellschluss_tag()`.
- `static-site/js/kiosk-notiz.js` — Notiz zur Bestellung, bereits gemeinsam genutzt.

## Constitution Compliance

- **Spec vor Code:** Diese Datei entsteht vor `plan.md` und `tasks.md`.
- **Keine Geheimnisse im Repository:** Die Empfängeradresse steht in den
  Einstellungen, nicht im Code; bis zur Freigabe gilt die Testadresse.
- **Deutsche Oberfläche**, deutsche Bezeichner im neuen Code.
- **Tests vor „fertig":** Ein Task gilt erst als erledigt, wenn seine
  `TC-Fn-xx` nachweislich laufen.
