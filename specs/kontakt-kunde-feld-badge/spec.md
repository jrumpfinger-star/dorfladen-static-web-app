# Kundenchat: Eingabefeld auf dem Telefon und Badge für neue Antworten

## Die Meldungen aus dem Laden

> „Die Nachrichtenbox auf mobile ist immer noch zu klein, da hast du ja
> nichts verändert."
>
> „Wie kann der Kunde sehen, dass er neue Nachrichten empfangen hat?
> Sollte dies nicht bei ,Schreib uns' mit einem Badge gekennzeichnet
> werden?"

## Zur ersten Meldung: Der Vorwurf trifft zu

Es wurde tatsächlich nichts verändert — jedenfalls nicht dort, wo es
gemeint war. Behoben wurde damals die Antwortbox im **Kiosk**
(`.kk-rpt` in `kiosk-kontakt.js`), also das Feld der **Verkäuferin**. Das
Eingabefeld des **Kunden** steckt in `js/kontakt.js` und blieb unberührt.

Zwei Felder, zwei Dateien, dieselbe Ursache — und nur eines davon wurde
angefasst.

## Gemessen (Telefon, 375 px)

| | vorher | nachher |
|---|---|---|
| Breite des Feldes | **221 px von 355 px (62 %)** | **355 px (100 %)** |
| Höhe | 60 px | 89 px |
| Badge am Knopf | Punkt **14 × 14 px**, ohne Zahl | **22 px**, mit Anzahl |

Die Ursache war dieselbe wie im Kiosk: Feld und **drei** Knöpfe (Emoji,
Foto, Senden) teilten sich eine Flex-Reihe. 38 + 38 + 40 px Knöpfe plus
Abstände gingen vom Feld ab.

## Zur zweiten Meldung: Was es schon gab

Ein roter Punkt am „Schreib uns"-Knopf existierte (`#hp-chat-dot`),
gesetzt von `pollDot()` alle 45 Sekunden. Er hatte zwei Schwächen:

1. **14 × 14 px** — neben einem Knopf mit Text geht das unter.
2. Er sagte **nicht, wie viele** Antworten warten.

## Anforderungen

- **F1** Das Eingabefeld nimmt die volle Breite der Zeile ein; die Knöpfe
  stehen darunter.
- **F2** Das Feld ist mindestens 84 px hoch und wächst mit dem Text.
- **F3** Das Badge nennt die **Anzahl** der Antworten, die seit dem letzten
  Öffnen dazugekommen sind.
- **F4** Ab zehn steht `9+` — sonst wüchse das Badge dem Knopf davon.
- **F5** Das Badge misst mindestens 22 px.
- **F6** Beim Öffnen des Chats verschwindet es.
- **F7** Der bereits gespeicherte Stand (`dl_kontakt_seen`, Form
  `<zeit>|<text>`) wird weiterverwendet — niemand muss den Chat erst
  einmal öffnen, damit die Zählung stimmt.

## Testfälle (`tests/kontakt-kunde-feld-badge.spec.js`)

| Fall | Lage | Erwartung |
|---|---|---|
| TC-KF-01 | Telefon | Feld nutzt über 90 % der Zeilenbreite |
| TC-KF-02 | Telefon | Feld mindestens 60 px hoch |
| TC-KF-03 | mehrzeiliger Text | Feld wächst |
| TC-KB-01 | letzte Antwort gesehen | kein Badge |
| TC-KB-02 | eine neue Antwort | Badge sichtbar |
| TC-KB-03 | drei Antworten, eine gesehen | Badge zeigt `2` |
| TC-KB-04 | Badge sichtbar | mindestens 22 px |
| TC-KB-05 | Chat geöffnet | Badge weg |
| TC-KB-06 | zwölf neue Antworten | Badge zeigt `9+` |

## Gegenprobe

Die Wächter wurden **vor** der Änderung gegen den alten Stand gefahren.
Sie fielen mit genau den Messwerten, die den Umbau begründen:

- **TC-KF-01**: `Feld 221px von 355px` — Verhältnis 0,62 statt > 0,9.
- **TC-KB-03**: Badge-Text `""` statt `2` — es gab keine Zählung.
- **TC-KB-04**: `Badge 14×14px` statt ≥ 22 px.

TC-KB-02 und TC-KB-05 blieben grün: Erscheinen und Verschwinden
funktionierten schon vorher — nur eben als stummer Punkt.

## Bewusst nicht geändert

Im Kundenchat **sendet** die Eingabetaste weiterhin; ein Zeilenumbruch
entsteht mit Umschalt+Eingabe. Im Kiosk wurde das auf ausdrücklichen
Wunsch umgedreht, hier lag kein solcher Wunsch vor. Wer es auch hier
anders will, sagt Bescheid — es ist eine Zeile.
