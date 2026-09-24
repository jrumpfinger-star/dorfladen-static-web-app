# Kontakt-Chat: Zugestellt- und Gelesen-Anzeige für unsere Antworten

## Die Meldung aus dem Laden

> „Kann auch angezeigt werden, ob eine ausgehende Nachricht geliefert und
> gelesen wurde wie in WhatsApp?"

## Ausgangslage — was heute wirklich da ist

Im Kiosk tragen **nur Kundennachrichten** einen Haken. Er sagt: *wir* haben
gelesen. Abgeleitet wird er aus `dl_kommentar_gelesen`, einem Feld für die
**ganze** Konversation (`bubbles()`, `firstUnread`).

Über **unsere eigenen** Antworten war bis jetzt **nichts** gespeichert — weder
ob sie beim Kunden angekommen sind noch ob er sie gelesen hat. Unsere Blasen
hatten folgerichtig gar keinen Haken. Die Frage aus dem Laden ist also nicht
„falsch angezeigt", sondern schlicht „gibt es noch nicht".

## Was „zugestellt" hier ehrlicherweise heißt

Es gibt keinen Zustellbericht vom Mobilfunknetz. Was wir belegen können:

| Stufe | Beleg | Wann |
|---|---|---|
| **gesendet** | Der Eintrag steht im Verlauf | sofort beim Absenden |
| **zugestellt** | Das Gerät des Kunden hat den Verlauf abgerufen (`GET mode=my`) | Chat offen **oder** Hintergrundabfrage der Startseite (alle 45 s) |
| **gelesen** | Der Kunde hatte das Chatfenster **offen**, als der Verlauf geladen wurde | `GET mode=my&gelesen=1` |

„Zugestellt" ist damit schwächer als bei WhatsApp: Wer die Seite nie öffnet,
bekommt keinen Haken — auch wenn ihn eine Push-Nachricht erreicht hat. Dafür
ist jede Stufe durch einen echten Abruf belegt und nichts geraten.

## Datenmodell

Der Verlauf liegt als JSON-Array in `dl_chatverlauf`. Einträge mit
`who === "dorfladen"` bekommen zwei **optionale** Felder:

- `zug` — Zeitstempel des ersten Abrufs durch das Kundengerät
- `gel` — Zeitstempel des ersten Abrufs bei geöffnetem Chat

Keine neue Spalte in Dataverse, kein neuer Endpunkt. Alte Einträge ohne die
Felder gelten als „gesendet" — das ist die richtige Aussage, denn über sie ist
tatsächlich nichts bekannt.

## Anforderungen

- **F1** `GET mode=my` setzt an allen Dorfladen-Einträgen ohne `zug` den
  Zeitstempel.
- **F2** `GET mode=my&gelesen=1` setzt zusätzlich `gel` an allen
  Dorfladen-Einträgen ohne `gel` (und `zug`, falls noch offen).
- **F3** Gesetzte Zeitstempel werden **nie überschrieben** — der erste zählt.
- **F4** Geschrieben wird nur, wenn sich etwas geändert hat. Eine
  Hintergrundabfrage ohne Neues löst **keinen** Schreibzugriff aus.
- **F5** Kundennachrichten (`who === "kunde"`) bleiben unberührt.
- **F6** Die Kundenseite ruft mit `gelesen=1` nur, wenn das Chatfenster offen
  ist; die Hintergrundabfrage für den roten Punkt ruft **ohne**.
- **F7** Der Kiosk zeigt an **unseren** Blasen: ein grauer Haken (gesendet),
  ein grauer Doppelhaken (zugestellt), ein blauer Doppelhaken (gelesen).
- **F8** Der Titel jeder Stufe nennt die Uhrzeit und sagt ausdrücklich, dass
  die Aussage den **Kunden** betrifft — damit niemand sie mit dem Haken an den
  Kundennachrichten verwechselt, der unser eigenes Lesen meint.
- **F9** Die Haken an Kundennachrichten bleiben unverändert klickbar
  (Konversation wieder als ungelesen markieren).

## Testfälle

### Server (`tests/test_kontakt_zustellstatus.py`)

| Fall | Lage | Erwartung |
|---|---|---|
| TC-KZ-S1 | `mode=my`, Antwort ohne `zug` | `zug` gesetzt, PATCH erfolgt |
| TC-KZ-S2 | `mode=my` ohne `gelesen` | `gel` bleibt leer |
| TC-KZ-S3 | `mode=my&gelesen=1` | `zug` **und** `gel` gesetzt |
| TC-KZ-S4 | zweiter Abruf, alles schon gesetzt | **kein** PATCH |
| TC-KZ-S5 | bereits gesetzter `zug` | bleibt unverändert |
| TC-KZ-S6 | Kundennachricht im Verlauf | bekommt weder `zug` noch `gel` |
| TC-KZ-S7 | `mode=my` ohne Treffer | kein Absturz, `thread: null` |

### Anzeige (`tests/kiosk-kontakt-zustellung.spec.js`)

| Fall | Lage | Erwartung |
|---|---|---|
| TC-KZ-01 | Antwort ohne `zug` | ein Haken, Titel „Gesendet" |
| TC-KZ-02 | Antwort mit `zug` | Doppelhaken grau, Titel nennt „Zugestellt" + Uhrzeit |
| TC-KZ-03 | Antwort mit `gel` | Doppelhaken blau, Titel nennt „gelesen" + Uhrzeit |
| TC-KZ-04 | Kundennachricht | Haken weiterhin klickbar (markUnread) |
| TC-KZ-05 | gemischter Verlauf | jede Blase trägt genau ihren eigenen Zustand |

### Kundenseite (`tests/kontakt-zustellung-melden.spec.js`)

| Fall | Lage | Erwartung |
|---|---|---|
| TC-KZ-K1 | Chat geöffnet | Abruf enthält `gelesen=1` |
| TC-KZ-K2 | Hintergrundabfrage (roter Punkt) | Abruf enthält **kein** `gelesen` |

## Gegenprobe

Jeder Wächter wurde ohne die Korrektur zum Fallen gebracht:

**Server** (`tests/test_kontakt_zustellstatus.py`)

- Quittung ganz abgeschaltet (`if False:`) → **TC-KZ-S1** fällt: die Antwort
  trägt keinen Zustellstempel.
- Nur `gelesen` gekappt (`gelesen = False`) → **TC-KZ-S1 bleibt grün**
  (`zug` wird ja gesetzt), **TC-KZ-S3** fällt. Die beiden Stufen sind also
  wirklich getrennt geprüft.

**Kiosk** (`tests/kiosk-kontakt-zustellung.spec.js`)

- `ticks = zustellHaken(m)` durch `ticks = ''` ersetzt → **TC-KZ-01, -02,
  -03, -05** fallen, **TC-KZ-04 bleibt grün**. Der Haken an den
  Kundennachrichten ist davon unberührt — genau die Trennung, auf die es
  ankommt.

**Kundenseite** (`tests/kontakt-zustellung-melden.spec.js`)

- `myUrl(_open)` auf `myUrl()` zurückgedreht → **TC-KZ-K1** fällt,
  **TC-KZ-K2 bleibt grün**.

## Angepasste Altfälle

`tests/kiosk-kontakt-haken.spec.js` zählte bisher „genau ein Haken im
Verlauf" — mit den neuen Zustellhaken sind es zwei:

- **K2-02** prüft jetzt gezielt den Haken der **Kundennachricht**
  (`.kk-ticks:not([data-zustell])`) und dessen Titel „Von uns gelesen".
- **K2-03** hieß „eigene Nachrichten tragen keinen Lesehaken". Diese
  Aussage ist durch die Meldung aus dem Laden überholt. Der Fall hält
  stattdessen fest, was weiterhin gelten muss: an der eigenen Antwort hängt
  der **Zustell**haken, und der Knopf zum Zurücksetzen der Konversation
  hängt **nur** an der Kundennachricht.

