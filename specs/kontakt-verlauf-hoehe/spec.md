# Kontakt: Höhe des Nachrichtenverlaufs

## Die Meldung aus dem Laden

> „Bitte die Anzeige der Nachrichten je nach Bildschirmhöhe einschränken
> und scrollen, da ansonsten alle anderen Chats verschwinden und man für
> den aktuellsten nach unten scrollen muss. Der aktuelle Beitrag und die
> Antwortbox müssen immer sichtbar sein."

## Gemessen — mit nur ZWEI Nachrichten

| | Rechner (800 px) | iPad (1024 px) | Ladentablett (1095 px) |
|---|---|---|---|
| Verlauf | 320 px | 320 px | 320 px |
| Antwortbox | 164 px | 164 px | 164 px |
| Karte gesamt | 710 px | 669 px | 710 px |
| **Unterkante Antwortbox** | **1084 px** | 1064 px | 1138 px |

Auf dem Rechner lag die Antwortbox damit **284 px unterhalb des
Sichtbaren** — und das bei einem kurzen Verlauf. Mit vielen Nachrichten
wurde es deutlich schlimmer.

## Die Ursache

Zwei Regeln am Verlauf, beide gut gemeint:

```css
max-height: 60vh;    /* ein Anteil des Fensters */
min-height: 320px;   /* auch wenn weniger da ist */
```

`60vh` begrenzte den Verlauf auf einen **Anteil des Fensters**, ohne zu
wissen, was unter ihm noch steht. Bei 800 px durfte er allein 480 px
nehmen — für Antwortbox und Hinweiszeile blieb nichts. Und `min-height`
blähte selbst einen Zweizeiler auf 320 px auf.

## Änderung

Gerechnet statt geschätzt (`passeVerlaufHoehe()`): Vom Fenster abgezogen
wird, **wo der Verlauf beginnt**, und **alles, was in der Karte unter ihm
steht** (Bildvorschau, Antwortbox, Hinweiszeile). Was übrig bleibt, ist
seine Höhe — mindestens 120 px, damit er lesbar bleibt.

Dazu: Beim Aufklappen wird die Karte erst **in den Blick geholt**
(`inDenBlick()`) und **danach** gerechnet — die Höhe hängt davon ab, wo
die Karte steht. Wer eine Konversation weit unten öffnet, bekäme sonst
einen winzigen Verlauf. Und bei Größenänderung wird neu gerechnet.

## Ergebnis

| | Rechner | iPad | Ladentablett | Handy |
|---|---|---|---|---|
| Unterkante Karte | 788 / 800 | 892 / 1024 | 1063 / 1095 | 641 / 667 |
| Unterkante Antwortbox | 724 | 1064 → im Bild | 999 | 577 |

Alles passt ins Fenster; der Verlauf rollt und steht am Ende, sodass die
jüngste Nachricht direkt über der Antwortbox steht.

## Anforderungen

- **F1** Die Antwortbox steht vollständig im Bild.
- **F2** Die ganze Karte passt ins Fenster — dann bleiben auch die übrigen
  Konversationen erreichbar.
- **F3** Ein langer Verlauf wird gerollt, nicht ausgebreitet.
- **F4** Die Karte wird beim Aufklappen in den Blick geholt, **bevor** die
  Höhe gerechnet wird.
- **F5** Die jüngste Nachricht steht direkt über der Antwortbox.
- **F6** Der Verlauf bleibt mindestens 120 px hoch.

## Testfälle (`tests/kiosk-kontakt-hoehe.spec.js`)

| Fall | Erwartung |
|---|---|
| TC-KH-01 | Antwortbox endet innerhalb des Fensters |
| TC-KH-02 | Karte endet innerhalb des Fensters |
| TC-KH-03 | langer Verlauf ist rollbar und kleiner als das Fenster |
| TC-KH-04 | Verlauf steht am Ende, letzte Nachricht im Bild |
| TC-KH-05 | die nächste Karte steht nicht Bildschirme weiter |
| TC-KH-06 | auch weit unten geöffnet bleibt alles sichtbar |

Geprüft auf allen vier Auflösungen des Projekts: **24/24 grün**.

## Ein Testfehler, der mich zweimal aufhielt

TC-KH-06 fiel zunächst mit `98 px` statt der erwarteten ≥ 120 px. Ursache
war **nicht** der Code: Die Liste wird nach letzter Aktivität sortiert, und
`nth(2)` traf eine Konversation mit nur **einer** Nachricht — ein kurzer
Verlauf *soll* kurz sein. Erst als alle drei Prüfkonversationen einen
langen Verlauf bekamen, prüfte der Fall wirklich das Gemeinte.

## Gegenprobe

Die alte Regel wieder eingesetzt (`max-height:60vh; min-height:320px`):

- **TC-KH-01** fällt mit `Antwortbox endet bei 866px, Fenster 800px`.
- **TC-KH-02** fällt mit `Karte endet bei 930px, Fenster 800px`.
- **TC-KH-06** fällt mit `Antwortbox endet bei 867px, Fenster 800px`.

Genau die Meldung aus dem Laden, in Zahlen. Die übrigen Fälle (Rollen,
Ende des Verlaufs, Abstand zur nächsten Karte) bleiben grün — sie hängen
nicht an der Höhenrechnung, sondern am Rollverhalten.
