# Kiosk – „Laden…" darf nie das letzte Wort sein

## Ausgangslage

Aus dem Laden gemeldet und mit Bildschirmfoto belegt: Der Mittagstisch
im Kiosk zeigt „Laden…" und bleibt dort stehen. Die Zähler stehen alle
auf 0, obwohl Bestellungen vorliegen. Es gibt keinen Hinweis, was fehlt,
und keinen Weg zurück außer neu laden.

## Befund

`loadOrders()` ersetzte den Platzhalter in **keinem** Fehlerfall:

| Fall | Verhalten vorher |
|---|---|
| `fetch` schlägt fehl | nur `console.error`, Platzhalter bleibt |
| `res.success === false` | schlichtes `return`, Platzhalter bleibt |
| Antwort verworfen (`datum !== _mittagDatum`) | `return`, Platzhalter bleibt |
| Antwort kommt nie | nichts geschieht, Platzhalter bleibt |

Alle vier Wege enden im selben Bild: ein Spinner, der sich für immer
dreht. Für die Bedienung im Laden ist das der schlechteste aller
Zustände — es sieht aus wie ein Absturz, ist aber oft nur ein
Schluckauf, der sich mit einem Tipp beheben ließe.

Die API selbst antwortete zum Meldezeitpunkt in **beiden** Umgebungen
(eigene Domain und `*.azurestaticapps.net`) einwandfrei in unter einer
Sekunde. Der Fehler lag also im Browser des Anwenders — und genau dann
braucht es eine Anzeige statt eines stummen Spinners.

Zusätzlich fiel auf: `CACHE_NAME` im Service Worker stand unverändert
auf `dorfladen-v32`, obwohl der Dateiinhalt geändert wurde. Der
`activate`-Handler löscht nur Zwischenspeicher, die **anders** heißen —
jeder Browser behielt also seinen alten Inhalt.

## Anforderungen

- **F1** Schlägt das Laden fehl, erscheint an der Stelle des Spinners
  eine verständliche Meldung samt Knopf **„Erneut versuchen"**.
- **F2** Das gilt für alle vier Wege: abgelehnter `fetch`,
  `success: false`, ausbleibende Antwort und verworfene Antwort.
- **F3** Bleibt eine Antwort länger als **15 Sekunden** aus, erscheint
  die Meldung ebenfalls.
- **F4** Ein Abbruch durch einen **nachfolgenden** Ladelauf
  (`AbortError`) ist **kein** Fehler und darf nichts anzeigen.
- **F5** Stehen bereits Bestellkarten in der Liste, wird nichts
  überschrieben — eine misslungene Hintergrundaktualisierung darf
  sichtbare Daten nicht wegnehmen.
- **F6** Der Knopf lädt erneut; gelingt es, erscheinen die Daten.
- **F7** Wird `sw.js` geändert, wird `CACHE_NAME` hochgezählt.

## Testfälle

| Nr. | Fall | Erwartung |
|---|---|---|
| TC-L01 | API antwortet mit HTTP 500 | Meldung + „Erneut versuchen" |
| TC-L02 | API liefert `success: false` | Meldung + „Erneut versuchen" |
| TC-L03 | API antwortet gar nicht | nach 15 s Meldung |
| TC-L04 | Verbindung bricht ab | Meldung |
| TC-L05 | „Erneut versuchen" bei wieder gesunder API | Bestellungen erscheinen |
| TC-L06 | Normalfall | Bestellungen erscheinen, **keine** Meldung |
| TC-L07 | `CACHE_NAME` in `sw.js` | mindestens `dorfladen-v33` |
