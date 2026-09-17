# Bestellungen löschen (Bäcker und Metzger)

## Ausgangslage

Aus dem Laden: *„Es sollte auch möglich sein, bei Bäcker und Metzger
bestehende Bestellungen zu löschen, da dies z. B. nur Testbestellungen
waren."*

Im Verlauf beider Bereiche steht heute nur „Formular ansehen"
(Metzger) beziehungsweise Aufklappen und Nachdrucken (Bäcker). Ein
Eintrag, der versehentlich oder zum Ausprobieren entstanden ist, bleibt
für immer stehen und verfälscht den Verlauf.

## Zwei Dinge, die das Löschen **nicht** kann

Beides muss der Bedienung klar gesagt werden, sonst entsteht ein
falsches Sicherheitsgefühl:

1. **Eine bereits versendete Bestellung wird nicht zurückgeholt.** Die
   E-Mail an Bäckerei oder Metzgerei ist raus. Gelöscht wird nur der
   Eintrag im Kiosk. Wer eine echte Bestellung zurücknehmen will, muss
   dort anrufen.
2. **Gelernte Vorschläge bleiben bestehen** (Metzger). Die Vorschläge
   sammeln Punkte über alle Bestellungen hinweg; welcher Punkt aus
   welchem Tag stammt, ist nicht festgehalten. Ein einzelner Tag lässt
   sich daher nicht sauber „zurücklernen".

## Anforderungen

- **F1** Im Verlauf hat jeder Eintrag eine Schaltfläche **„Löschen"** —
  bei Bäcker **und** Metzger.
- **F2** Vor dem Löschen kommt eine Rückfrage (kein natives `confirm`,
  Konstitution 6). Sie nennt Liefertag und Bäckerei/Metzger und weist
  bei einer **gesendeten** Bestellung ausdrücklich darauf hin, dass die
  E-Mail dadurch nicht zurückgeholt wird.
- **F3** Nach dem Löschen verschwindet der Eintrag aus dem Verlauf, und
  es erscheint eine kurze Rückmeldung.
- **F4** Gelöscht wird der Datensatz im Speicher, nicht nur die
  Anzeige. Ein erneutes Laden zeigt den Eintrag nicht wieder.
- **F5** Beim Bäcker werden **beide** Schlüsselformen entfernt (neuer
  Schlüssel `baecker_order_<bäckerei>_<datum>` und der Altschlüssel
  `baecker_order_<datum>`). Bliebe der Altschlüssel liegen, käme der
  Eintrag beim nächsten Laden zurück.
- **F6** Ist zu dem Tag nichts (mehr) gespeichert, meldet der Server das
  verständlich und gibt **404** — kein stiller Erfolg.
- **F7** Der Liefertag wird geprüft; ein unsinniges Datum wird
  abgewiesen.
- **F8** Beim Bäcker muss die Bäckerei mitgegeben und gültig sein.
- **F9** Das Löschen ist eine Verwaltungsaktion und unterliegt derselben
  Anmeldung wie die übrigen Schreibzugriffe.
- **F10** Ein gelöschter Liefertag lässt sich danach wieder ganz normal
  neu erfassen.

## Nachtrag: Status je Liefertag und die letzten drei Bestellungen

Aus dem Laden, zum selben Bereich: *„Es sollte auch hier der Status der
Bestellung angezeigt werden, so dass man gleich sieht, was an welchem
Tag bestellt wurde. Es sollten die letzten 3 Bestellungen auch angezeigt
werden, so dass man auf Klick auch sieht, was bestellt wurde, aber nur
im Read Modus."*

- **F11** Die Tagesleiste zeigt zusätzlich die **letzten drei gesendeten
  Liefertage**. Sie sind anklickbar und sichtbar abgesetzt (gestrichelter
  Rand).
- **F12** Ein vergangener Liefertag ist **nur lesbar**: keine Erfassung,
  kein „Korrigieren", stattdessen der Hinweis „Geliefert – nur zum
  Nachsehen". Der Server liefert dafür ein eigenes Kennzeichen
  (`nur_lesen`); `bestellbar` wird **nicht** zweckentfremdet, denn das
  ist auch für **heute** falsch.
- **F13** Jede Tageskachel trägt eine Statuszeile: „✓ gesendet",
  „✓ korrigiert", „Entwurf", „offen", „nicht bestellt" oder „keine
  Lieferung" — beim Metzger zusätzlich die Zahl der Positionen.

## Testfälle

| Nr. | Fall | Erwartung |
|---|---|---|
| TC-D01 | Metzger-Verlauf | jeder Eintrag hat „Löschen" |
| TC-D02 | Metzger: Löschen antippen | Rückfrage mit Liefertag, noch kein Aufruf |
| TC-D03 | Metzger: Rückfrage abbrechen | nichts wird gesendet, Eintrag bleibt |
| TC-D04 | Metzger: bestätigen | `POST …/metzger-order/<datum>/loeschen`, Eintrag verschwindet |
| TC-D05 | Metzger: gesendete Bestellung | Rückfrage nennt, dass die E-Mail bleibt |
| TC-D06 | Bäcker-Verlauf aufklappen | der Eintrag hat „Löschen" |
| TC-D07 | Bäcker: bestätigen | `POST …/baecker-order/<datum>/loeschen` mit Bäckerei |
| TC-D08 | Bäcker: Fehler vom Server | Meldung, Eintrag bleibt stehen |
| TC-D13 | Metzger: Tageskachel mit gesendeter Bestellung | zeigt „✓ gesendet" und die Positionszahl |
| TC-D14 | Metzger: Kachel eines vergangenen Tages | anklickbar, Klasse `lesen` |
| TC-D15 | Metzger: vergangener Tag geöffnet | kein „Korrigieren", Hinweis „nur zum Nachsehen" |
| TC-D16 | Bäcker: Kachel eines vergangenen Tages | „✓ geliefert", Klasse `lesen` |

