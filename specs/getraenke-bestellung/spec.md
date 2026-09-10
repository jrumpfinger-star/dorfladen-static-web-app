# Getränke-Bestellung (Getränke Kratzer) — Specification

## Overview

Der Dorfladen bestellt Getränke bei **Getränke Kratzer**
(`bestellung@getraenke-kratzer.de`, Kd-Nr. 15554, Tour 1). Bisher tippt die
Ladenleitung die Bestellung von Hand in eine formlose E-Mail. Diese Spec
beschreibt ein elektronisches Bestellformular im Kiosk — analog zur
Bäcker-Bestellung (`specs/baecker-bestellung`) und zur Metzger-Bestellung
(`specs/metzger-bestellung`).

### Abgrenzung

- Es geht um die **Ladenbestellung beim Lieferanten**, nicht um
  Kundenvorbestellungen.
- Der Getränkeverkauf im Shop bleibt unberührt.

### Der eine große Unterschied zu Bäcker und Metzger

Bei Kratzer wird **unregelmäßig** bestellt. Es gibt keine festen Bestell- oder
Liefertage. Die sieben ausgewerteten Bestellungen liegen zwischen 6 und 26
Wochen auseinander. Deshalb:

- **keine Tagesleiste** wie beim Bäcker/Metzger,
- stattdessen ein **frei wählbarer Liefertermin**,
- aus dem die **Kalenderwoche** für den Betreff entsteht
  („Bestellung für Dorfladen Oberornau KW 36").

Zweiter Unterschied: Getränke laufen ausschließlich in **ganzen Kisten**. Es
gibt weder Gewichte noch Portionsblöcke noch Vakuum — ein Schrittzähler je
Zeile genügt.

## Datenlage

Ausgewertet wurden die Belege in `Getränke/`:

- **9 Rechnungen** (PDF-Anhang) vom 17.02.2026 bis 01.09.2026
- **7 Bestellmails** vom 29.10.2025 bis 26.08.2026

Daraus abgeleitet (`tools/getraenke_katalog_build.py`):

| Größe | Wert |
|-------|------|
| Artikel gesamt | 50 |
| davon durch Rechnung belegt (Art-Nr. + Preis) | 44 |
| nur bestellt, nie abgerechnet | 6 |
| Warengruppen | 8 |
| Pfandsätze je Gebinde | 5 |

**Prüfsumme.** Die letzte Bestellung (KW 36, 26.08.2026) umfasst 61 Kisten in
25 Positionen. Mit den aus den Rechnungen gewonnenen Preisen ergibt sich ein
Warenwert von **553,22 €** — exakt der Nettobetrag der zugehörigen Rechnung
2008520. Preis- und Mengenextraktion sind damit belegt.

### Warengruppen (Reihenfolge wie in den Bestellmails)

1. Bier · 2. Limonade Mehrweg · 3. Mineralwasser Glas 0,75 l ·
4. Mineralwasser Glas 0,5 l · 5. Mineralwasser PET 1,0 l ·
6. Mineralwasser PET 0,5 l · 7. Erfrischungsgetränke PET 0,5 l · 8. Säfte

### Schreibweisen

Die Rechnung nennt einen Artikel `Aho Individual Sanft Glas 12x0,75`, die
Bestellmail dagegen `Adelh. MIWA sanft Glas 0,75l`. Beide Namen werden
geführt: der Rechnungsname zur Anzeige, die **gewachsene Bestellschreibweise**
für den Mailtext. Bei Kratzer soll nichts Ungewohntes ankommen.

Vier Artikel kamen bisher nur in Sammelzeilen vor („Je 1 Kiste Adelh. PET
0,5l:" gefolgt von Geschmacksrichtungen). Für sie gibt es keine gewachsene
Zeile; ihr Mailtext greift ersatzweise auf die Rechnungsbezeichnung zurück.

---

## Requirements

### F1: Liefertermin frei wählen

Es gibt keine festen Bestelltage. Die Bestellung gilt für einen frei
gewählten Liefertermin, der in der Zukunft liegen muss.

- F1.1 Der Liefertermin ist ein Datumsfeld, vorbelegt mit dem nächsten Montag.
- F1.2 Aus dem Termin entsteht die Kalenderwoche nach ISO-8601; sie steht im
  Betreff und neben dem Feld.
- F1.3 Ein Termin in der Vergangenheit oder heute ist nicht bestellbar. Der
  Riegel sitzt auch im Server.

**TC-F1:**
- `TC-F1-01`: Reiter „Getränke" öffnet das Formular; ein Datumsfeld ist sichtbar.
- `TC-F1-02`: Die Kalenderwoche wird zum gewählten Termin angezeigt.
- `TC-F1-03`: Es gibt **keine** Tagesleiste (`.gk-day` existiert nicht).
- `TC-F1-04`: Ein vergangener Termin sperrt den Senden-Knopf mit Hinweis.

### F2: Artikel nach Warengruppen mit sichtbarem Gebinde

- F2.1 Die Liste ist nach den acht Warengruppen gegliedert.
- F2.2 Jede Zeile zeigt das Gebinde (`20x0,50`) in eigener Spalte, den Namen
  und den Preis je Kiste.
- F2.3 Artikel ohne belegten Preis werden als solche gekennzeichnet, nicht
  versteckt.
- F2.4 Je Warengruppe wird die bestellte Kistenzahl angezeigt.

**TC-F2:**
- `TC-F2-01`: Acht Gruppenüberschriften erscheinen in der festgelegten Reihenfolge.
- `TC-F2-02`: Eine Zeile zeigt Gebinde, Name und Preis je Kiste.
- `TC-F2-03`: Ein Artikel ohne Preis trägt die Kennzeichnung „ohne Preis".
- `TC-F2-04`: Die Gruppensumme zählt nur Artikel dieser Gruppe.

### F3: Menge in ganzen Kisten

- F3.1 Je Zeile ein Schrittzähler mit `−`, Zahlenfeld und `+`.
- F3.2 Erlaubt sind ganze Zahlen von 0 bis 99. 0 bedeutet „nicht bestellt".
- F3.3 Bei Menge 0 ist `−` gesperrt.
- F3.4 Eine Zeile mit Menge > 0 ist optisch hervorgehoben.

**TC-F3:**
- `TC-F3-01`: `+` erhöht die Menge um 1, die Zeile wird hervorgehoben.
- `TC-F3-02`: `−` ist bei Menge 0 gesperrt.
- `TC-F3-03`: Direkte Eingabe einer Zahl wird übernommen.
- `TC-F3-04`: Werte über 99 oder unter 0 werden begrenzt.

### F4: Vorschläge aus der Bestellhistorie

- F4.1 `üblich N` = Median der bisherigen Bestellmengen dieses Artikels.
- F4.2 `letzte N` = Menge aus der zuletzt gesendeten Bestellung, falls sie
  sich von `üblich` unterscheidet.
- F4.3 Ein Tipp setzt die Menge, ein zweiter Tipp nimmt sie zurück.
- F4.4 Der gewählte Vorschlag ist als gewählt erkennbar.

**TC-F4:**
- `TC-F4-01`: Ein Vorschlagsknopf setzt die Menge auf den Vorschlagswert.
- `TC-F4-02`: Nochmaliges Tippen setzt die Menge auf 0 zurück.
- `TC-F4-03`: Der aktive Vorschlag ist markiert.

### F5: Vorbelegung aus der letzten Bestellung

Anders als beim Metzger gibt es keinen „gleichen Wochentag". Vorlage ist
immer die **zuletzt gesendete** Bestellung.

- F5.1 Ein Knopf „Letzte Bestellung übernehmen" füllt alle Mengen.
- F5.2 Der Knopf nennt das Datum der Vorlage.
- F5.3 Weicht eine Menge von der Vorlage ab, wird das an der Zeile vermerkt.
- F5.4 Ein neuer Entwurf startet leer — übernommen wird nur auf Zuruf.

**TC-F5:**
- `TC-F5-01`: Der Knopf trägt das Datum der letzten Bestellung.
- `TC-F5-02`: Nach dem Übernehmen stimmen Kisten- und Positionszahl mit der Vorlage überein.
- `TC-F5-03`: Eine geänderte Menge zeigt den Vorlagewert als Vermerk.

### F6: Suchen und Filtern

- F6.1 Drei Filter: „Übliche Artikel", „Alle Artikel", „Nur bestellte".
- F6.2 „Üblich" = in mindestens zwei der ausgewerteten Bestellungen bestellt,
  oder Menge > 0, oder selbst angelegt.
- F6.3 Die Suche greift immer über den **Gesamtbestand** und sticht den Filter.
- F6.4 Sprungknöpfe je Warengruppe scrollen zur Gruppe.

**TC-F6:**
- `TC-F6-01`: „Alle Artikel" zeigt mehr Zeilen als „Übliche Artikel".
- `TC-F6-02`: „Nur bestellte" zeigt genau die Zeilen mit Menge > 0.
- `TC-F6-03`: Die Suche findet einen Artikel, der unter „üblich" verborgen ist.
- `TC-F6-04`: Ohne Treffer erscheint ein erklärender Hinweis statt einer leeren Liste.

### F7: Neue Artikel anlegen

Kratzer führt saisonale Sorten, die auf keiner Rechnung stehen. Ohne diesen
Weg müsste der Laden für eine einzige neue Sorte wieder zur formlosen Mail
greifen.

- F7.1 Ein Dialog erfasst Bezeichnung (Pflicht), Gebinde, Menge, Warengruppe,
  Artikelnummer und Preis (beide optional).
- F7.2 Zwei Fälle: **einmalig** (gilt nur für diese Bestellung) und
  **dauerhaft** (wandert in den Katalog). Voreinstellung ist einmalig.
- F7.3 Eine Vorschau zeigt die entstehende Mailzeile.
- F7.4 Gleiche Bezeichnung wie ein vorhandener Artikel → Dublettenwarnung.
  Gewarnt, nicht verboten: Der Laden entscheidet.
- F7.5 Der neue Artikel erscheint sofort in seiner Warengruppe und ist
  unabhängig vom Filter sichtbar.
- F7.6 Einmalige Artikel fallen mit dem Senden weg, dauerhafte bleiben.
- F7.7 Gebinde und Warengruppen werden aus dem Bestand vorgeschlagen.
- F7.8 Ein dauerhaft angelegter Artikel erhält eine Nummer. Wird keine
  Lieferantennummer eingetragen, vergibt der Server eine Hausnummer
  (`DL-1`, `DL-2`, …). Sie ist der stabile Schlüssel des Artikels: Ohne
  sie träte der Name an ihre Stelle, und eine spätere Umbenennung risse die
  Verbindung zu Vorbelegung und Verlauf ab. Der Kiosk übernimmt diese Nummer
  sofort für die bereits erfasste Menge.

**TC-F7:**
- `TC-F7-01`: Ein einmaliger Artikel erscheint in der Liste und im Mailtext.
- `TC-F7-02`: Ein dauerhafter Artikel wird zusätzlich an die Artikel-API gemeldet.
- `TC-F7-03`: Gleiche Bezeichnung löst die Dublettenwarnung aus.
- `TC-F7-04`: Ohne Bezeichnung wird nicht angelegt, sondern freundlich erinnert.
- `TC-F7-05`: Die Vorschau zeigt die Mailzeile mit Menge und Bezeichnung.
- `TC-F7-06`: Nach dem Senden ist der einmalige Artikel weg, der dauerhafte da.
- `TC-F7-07`: Nach dem dauerhaften Anlegen steht die Zeile unter der Nummer
  des Servers, und die bereits erfasste Menge steht unverändert darin.

### F8: Summen

- F8.1 Fußzeile zeigt Kisten, Positionen, Warenwert und Pfand.
- F8.2 Der Warenwert summiert `Menge × Preis` und ist als Schätzung
  gekennzeichnet — Kratzer passt Preise laufend an.
- F8.3 Positionen ohne Preis werden gesondert ausgewiesen, nicht verschwiegen.
- F8.4 Pfand heißt „max.", weil nur berechnet wird, was nicht als Leergut
  zurückgeht.

**TC-F8:**
- `TC-F8-01`: Kisten- und Positionszahl stimmen mit den erfassten Mengen überein.
- `TC-F8-02`: Der Warenwert entspricht der Summe aus Menge × Preis.
- `TC-F8-03`: Eine Position ohne Preis erscheint als gesonderter Hinweis.

### F9: Bestellmail in gewohnter Schreibweise

- F9.1 Betreff: `Bestellung für Dorfladen Oberornau KW <nn>`.
- F9.2 Je Warengruppe ein Block, Blöcke durch Leerzeile getrennt — genau wie
  in den bisherigen Mails.
- F9.3 Zeilenform: `<n> Kisten <Bestellschreibweise>`, Singular `1 Kiste`.
- F9.4 Vor dem Versand erscheint eine Vorschau mit dem vollständigen Text.
- F9.5 Der Text nennt Liefertermin und Kundennummer.

**TC-F9:**
- `TC-F9-01`: Der Betreff enthält die Kalenderwoche des Liefertermins.
- `TC-F9-02`: Die Vorschau zeigt „20 Kisten Augustiner hell 0,5l".
- `TC-F9-03`: Bei Menge 1 heißt es „1 Kiste", nicht „1 Kisten".
- `TC-F9-04`: Warengruppen sind durch Leerzeilen getrennt.
- `TC-F9-05`: Ohne Position lässt sich nicht senden.
- `TC-F9-06`: Der in der Vorschau gezeigte Text stimmt Zeichen für Zeichen mit
  dem Text überein, den der Server versendet — Anrede, Datumsformat,
  Gruppenreihenfolge und Fußzeile eingeschlossen.

### F10: Entwurf, Senden, Korrektur

- F10.1 Der Entwurf wird gespeichert und übersteht einen Reiterwechsel.
- F10.2 Nach dem Senden ist die Bestellung gesperrt; Änderungen laufen über
  „Korrektur senden".
- F10.3 Scheitert der Versand, bleibt der Entwurf erhalten.
- F10.4 Jeder Versand wird protokolliert (Zeit, Empfänger, wer).

**TC-F10:**
- `TC-F10-01`: Der Senden-Dialog nennt Empfänger, Positionen und Kisten.
- `TC-F10-02`: Nach dem Senden erscheint eine Bestätigung.
- `TC-F10-03`: Eine gesendete Bestellung bietet „Korrektur senden".

### F11: Artikelpflege

- F11.1 Ein Unterreiter listet alle Artikel mit Nummer, Gebinde, Gruppe, Preis.
- F11.2 Artikel lassen sich aus- und einblenden.
- F11.3 **Gelöscht wird nie** — ein gelöschter Artikel risse Lücken in
  Vorbelegung und Verlauf.
- F11.4 Doppelte Artikelnummern werden abgewiesen.

**TC-F11:**
- `TC-F11-01`: Die Artikelliste zeigt alle Artikel mit Gebinde und Preis.
- `TC-F11-02`: Ausblenden nimmt den Artikel aus der Bestellliste, nicht aus der Pflege.
- `TC-F11-03`: Es gibt keinen Löschen-Knopf.

### F12: Einstellungen im CMS

Empfänger, Anzeigename, Lieferantenadresse und Kundennummer werden im CMS
gepflegt — nicht im Kiosk. Ein zweiter Pflegeweg wäre einer ohne die dortigen
Prüfungen.

**TC-F12:**
- `TC-F12-01`: Die CMS-Maske speichert Empfänger und Kundennummer.
- `TC-F12-02`: Eine unvollständige E-Mail-Adresse wird freundlich abgewiesen.

### F13: Testbetrieb bis zur Freigabe

Solange die echte Kratzer-Adresse nicht als Empfänger eingetragen ist, geht
jede Bestellung an die Testadresse. Der Kiosk weist darauf sichtbar hin.

**TC-F13:**
- `TC-F13-01`: Im Testbetrieb nennt der Versanddialog die Testadresse.
- `TC-F13-02`: Der Hinweis auf den Testbetrieb ist im Formular sichtbar.
- `TC-F13-03`: Trägt das CMS die echte Kratzer-Adresse als Empfänger **und**
  als Lieferantenadresse ein, weicht der Testhinweis dem Hinweis „scharf
  geschaltet".

### F14: Responsive

Nach Constitution Prinzip 7 muss das Formular auf **375×667**, **768×1024**
und **1280×800** ohne Überlauf, ohne Überlappung und ohne waagerechtes
Scrollen bedienbar sein.

**TC-F14:**
- `TC-F14-01`: Auf allen drei Viewports gibt es kein waagerechtes Scrollen.
- `TC-F14-02`: Die Fußleiste mit den Summen bleibt sichtbar.
- `TC-F14-03`: Der Anlegen-Dialog passt auf das Handy.
- `TC-F14-04`: Die klassische Kiosk-Fassung (`kiosk-klassisch.html`) bietet
  dasselbe Formular. Der Kiosk wird in zwei Fassungen ausgeliefert; beide
  binden dasselbe Modul ein und müssen gemeinsam gepflegt werden.

---

## Nicht in diesem Umfang

- Leergut-/Rückgabeerfassung. Die Rechnungen führen Leergut getrennt; eine
  Erfassung im Formular wäre eine eigene Spec.
- Automatischer Bestellvorschlag aus Verkaufszahlen.
- Artikelnummern für die sechs unbelegten Artikel — sie müssen bei Kratzer
  erfragt werden.

## Offene Punkte

- Die echte Bestelladresse bleibt bis zur ausdrücklichen Freigabe leer
  (F13). Danach wird sie im CMS eingetragen.
