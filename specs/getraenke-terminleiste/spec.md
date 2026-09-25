# Getränke: Terminleiste — alte Bestellungen auswählen und ansehen

## Die Meldung aus dem Laden

> „Ich kann aber hier immer noch nicht alte Bestellungen auswählen, wie bei
> Metzger, und diese ansehen."

## Warum der Verlauf allein nicht reicht

Der Reiter **Verlauf** zeigt seit gestern Status, Uhrzeit und Urheber, und
er klappt die Positionen auf. Das beantwortet die Frage „was wurde
bestellt?" — aber nicht die, um die es hier geht:

**Eine alte Bestellung im Bestellformular öffnen.** Beim Metzger geht das
mit einem Griff: Über der Liste steht eine Leiste mit Liefertagen, jeder
mit Status, vergangene sind anklickbar und werden nur gelesen
(`tagesleiste()` in `kiosk-metzger-bestellung.js`).

Bei Getränken gab es **keine Leiste**. Der Termin steckte als Datumsfeld
im Blatt hinter dem „i" — man musste also wissen, dass es dort ist, **und**
das Datum der alten Bestellung auswendig kennen. Technisch ging es
(`ladeTag()` lädt jedes Datum), praktisch fand es niemand.

## Der Unterschied zum Metzger

Der Metzger hat **feste Liefertage** (z. B. Di/Do/Sa). Seine Leiste zeigt
deshalb eine fortlaufende Woche.

Getränke werden **unregelmäßig** bestellt — es gibt keinen Rhythmus, aus
dem sich Tage errechnen ließen. Die Leiste muss daher aus den
**tatsächlich vorhandenen** Bestellungen entstehen: aus dem Verlauf, den
der Server ohnehin liefert (`mode=verlauf` mit `datum`, `status`, `summen`,
`positionen`), plus dem aktuellen Termin.

Das ist zugleich ehrlicher: Angezeigt wird, was es wirklich gibt.

## Anforderungen

- **F1** Über der Artikelliste steht eine Leiste mit Terminen: der
  aktuelle Termin und die letzten gesendeten Bestellungen.
- **F2** Jedes Plättchen nennt Datum, Wochentag und Status
  (*offen* / *Entwurf* / *gesendet* / *korrigiert*) samt Anzahl Positionen.
- **F3** Ein Klick lädt diesen Termin ins Bestellformular.
- **F4** Der gerade gezeigte Termin ist hervorgehoben.
- **F5** Vergangene Termine sind anklickbar; dass dort nicht mehr gesendet
  werden kann, sagt die vorhandene Fußzeile bereits.
- **F6** Höchstens acht Plättchen — die Leiste ist ein Sprungbrett, kein
  zweiter Verlauf. Der vollständige Verlauf bleibt im eigenen Reiter.
- **F7** Gibt es weder Verlauf noch Termin, entfällt die Leiste
  ersatzlos — eine leere Leiste wäre nur Lärm.
- **F8** Der aktuelle Termin steht immer dabei, auch wenn er noch nicht
  gesendet wurde und daher nicht im Verlauf steht.
- **F9** Die Termine stehen **absteigend** (der jüngste links): Beim
  Metzger läuft die Woche vorwärts, hier ist der neueste der wichtigste.

## Testfälle (`tests/kiosk-getraenke.spec.js`, Abschnitt GT)

| Fall | Lage | Erwartung |
|---|---|---|
| TC-GT-01 | Verlauf mit drei Bestellungen | Leiste zeigt Plättchen |
| TC-GT-02 | — | aktueller Termin ist hervorgehoben |
| TC-GT-03 | Klick auf altes Datum | dieser Termin wird geladen |
| TC-GT-04 | gesendete Bestellung | Status und Positionszahl stehen dabei |
| TC-GT-05 | zwölf Bestellungen im Verlauf | höchstens acht Plättchen |
| TC-GT-06 | kein Verlauf | keine Leiste, kein leerer Kasten |
| TC-GT-07 | aktueller Termin nicht im Verlauf | steht trotzdem in der Leiste |

## Gegenprobe

Die Leiste aus der Bestellansicht entfernt: **sechs der acht Fälle
fallen**. Grün bleiben TC-GT-06 (ohne Verlauf gibt es keine Leiste — das
trifft ohne Leiste naturgemäß zu) und ein weiterer, der nicht an der
Leiste hängt.

Der wichtigste Fall ist **TC-GT-08**: Er belegt, dass ein Klick die alte
Bestellung wirklich **mit ihrem Inhalt** lädt. Dafür liefert der
Ersatzspeicher je Tag einen anderen Inhalt (`proTag`) — vorher gab er für
jedes Datum dieselbe Antwort, und ein Klick, der nur das Datum wechselt,
wäre unbemerkt durchgegangen.
