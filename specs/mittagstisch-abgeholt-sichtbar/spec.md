# Abgeholte Bestellungen bleiben den Tag über sichtbar

## Ausgangslage

Aus dem Laden: *„Das ist das Problem, abgeholt. Die heutigen Bestellungen
sollten den ganzen Tag angezeigt werden, aber dann auch mit Status
abgeholt. So hat der Kunde die Möglichkeit, weiterhin zu dieser
Bestellung mit uns zu chatten."*

Der Kasten „Ihre Bestellung" auf der Startseite fragt
`GET /api/lunch-order?mode=my`. Dieser Aufruf filterte bisher auf die
Status **Neu (0), Bestätigt (1), Storniert (2)** — **Abgeholt (3) fiel
heraus**.

Die Folge: In dem Moment, in dem im Laden auf „abgeholt" gesetzt wird,
verschwindet die Bestellung von der Startseite der Kundin. Der Kasten
ist aber der **einzige** Weg zurück in den Bestellstatus — und dort
liegt der Nachrichtenverlauf. Wer nach dem Abholen etwas fragen oder
anmerken möchte, findet den Faden nicht mehr.

Der Nachrichtenbereich auf `bestellstatus.html` ist **nicht**
statusabhängig — er funktioniert bei „abgeholt" ohne Weiteres. Es fehlte
allein der Weg dorthin.

## Ein zweiter Punkt, der dadurch erst ins Gewicht fällt

Der Datumsfilter rechnete mit `datetime.utcnow()`. UTC hinkt der
Berliner Zeit ein bis zwei Stunden hinterher. Bislang war das harmlos.
Mit den abgeholten Bestellungen wäre es sichtbar geworden: Die
Bestellung von gestern bliebe nach Mitternacht noch bis zu zwei Stunden
stehen. „Den ganzen Tag" heißt aber **genau diesen Tag**.

Für die Tageszuordnung gibt es im Projekt bereits ein Muster
(`api/social-post`, Europe/Berlin mit Rückfall auf UTC+2).

## Anforderungen

- **F1** `mode=my` liefert zusätzlich Bestellungen mit Status
  **Abgeholt (3)**.
- **F2** Der Datumsfilter bleibt `datum >= heute`; „heute" ist der
  **Berliner** Kalendertag. Am Folgetag ist die Bestellung weg.
- **F3** Der Kasten zeigt den Status als **„Abgeholt"** an — nicht als
  offene Bestellung.
- **F4** Aus dem Kasten ist der Bestellstatus samt Nachrichtenverlauf
  weiterhin erreichbar; Schreiben bleibt möglich.
- **F5** Die Kennzeichen am Tagesgericht („bestellt") dürfen eine
  abgeholte Bestellung **nicht** als offen darstellen. Sie zeigen
  **„abgeholt"** in der Farbe für Erledigtes.
- **F6** Am Verhalten für Neu, Bestätigt und Storniert ändert sich
  nichts.

## Testfälle

| Nr. | Fall | Erwartung |
|---|---|---|
| TC-A01 | `mode=my`, Bestellung heute mit Status 3 | wird geliefert |
| TC-A02 | `mode=my`, Status 0/1/2 heute | unverändert geliefert |
| TC-A03 | `mode=my`, Status 3 von **gestern** | wird **nicht** geliefert |
| TC-A04 | Der Filter nennt alle vier Status | erfüllt |
| TC-A05 | „heute" wird in Berliner Zeit gebildet | kein `utcnow()` in diesem Zweig |
| TC-A06 | Kasten bei Status 3 | zeigt „Abgeholt" |
| TC-A07 | Kasten bei Status 3 anklicken | öffnet den Bestellstatus |
| TC-A08 | Nachrichtenfeld bei Status 3 | vorhanden und bedienbar |
| TC-A09 | Kennzeichen am Gericht bei Status 3 | „abgeholt", grün statt orange |
