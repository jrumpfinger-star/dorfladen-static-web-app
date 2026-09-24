# Kontakt: Das Antwortfeld im Verlauf

**Meldung aus dem Laden:** „Die Nachrichtenbox ist sowohl auf dem Handy, als
auch auf dem mobile zu klein. Die Box muss auch mit dem Text mitwachsen und
Enter auf der Tastatur muss einen Zeilenumbruch erzeugen und nicht den Chat
abschicken."

## Ausgangslage

Drei Beobachtungen an derselben Stelle:

1. **Zu schmal.** Antwortfeld und drei Knöpfe (Emoji, Foto, Senden) teilten
   sich eine einzige Flex-Zeile. Gemessen auf dem Handy: **184 px von
   307 px** — dem Feld blieben 60 %, den Knöpfen der Rest. Auf dem Tablet
   dasselbe Bild in größerem Maßstab.

2. **Enter schickte ab.** Ein Zeilenumbruch ging nur mit Umschalt+Enter.
   Im Laden wird mehrzeilig geantwortet, und wer nach dem ersten Satz Enter
   drückte, hatte die halbe Nachricht beim Kunden — nicht zurückzuholen.

3. **Nur drei Zeilen hoch.** Das Feld wuchs zwar mit dem Text, startete aber
   bei 88 px (Grundregel `.k-app textarea`).

## Anforderungen

- **R1** Das Antwortfeld steht über die volle Breite; die Knöpfe darunter.
- **R2** `Enter` erzeugt einen Zeilenumbruch und schickt nichts ab.
- **R3** Abgeschickt wird über den Senden-Knopf. Für die Tastatur bleibt
  `Strg`/`Cmd`+`Enter`.
- **R4** Das Feld wächst mit dem Text — und schrumpft wieder, wenn der Text
  gelöscht wird.
- **R5** Nach oben ist Schluss bei 40 % der Schirmhöhe; darüber wird
  gerollt, sonst verdeckt das Feld den Verlauf.
- **R6** Schriftgröße mindestens 16 px, sonst zoomt iOS beim Hineintippen.

## Test Cases

| ID | Prüft | Erwartung |
|----|-------|-----------|
| TC-F23-01 | R2 | Enter zwischen zwei Sätzen → Feld enthält `\n`, nichts wurde gesendet |
| TC-F23-02 | R3 | `Strg`+`Enter` → genau eine Antwort geht raus |
| TC-F23-03 | R4 | acht Zeilen tippen → Feld ist deutlich höher |
| TC-F23-04 | R4 | Text wieder löschen → Feld ist wieder so hoch wie am Anfang |
| TC-F23-05 | R1 | Feld nimmt über 90 % der Zeilenbreite, mindestens 110 px hoch |
| TC-F23-06 | R5 | 40 Zeilen → höchstens halbe Schirmhöhe, `overflow-y: auto` |

Wächter: [tests/kiosk-kontakt-haken.spec.js](../../tests/kiosk-kontakt-haken.spec.js)

## Umsetzung

[static-site/js/kiosk-kontakt.js](../../static-site/js/kiosk-kontakt.js):
Die Antwortzeile wird zu `.kk-reply` (Feld oben, `.kk-reply-tools` darunter).
Die bisherigen Inline-Handler weichen zwei benannten Funktionen — `grow()`
misst die Höhe neu (erst `auto`, sonst kann das Feld nie schrumpfen) und
`taste()` regelt die Tastatur.

[static-site/css/kiosk-neu.css](../../static-site/css/kiosk-neu.css):
Die Regeln stehen als `.k-app .kk-rpt`. Ohne das `.k-app` davor greifen sie
nicht — die Grundregel `.k-app textarea` ist spezifischer und setzt
`min-height` zusätzlich mit `!important`.

## Gegenprobe

- Schickt `Enter` wieder ab, fallen **TC-F23-01, -03 und -04** (die beiden
  letzten tippen Zeilenumbrüche). TC-F23-02, -05 und -06 bleiben grün.
- Steht die Antwortzeile wieder nebeneinander (`flex-direction: row`), fällt
  **TC-F23-05** mit der Messung `Feld 184px von 307px`.
