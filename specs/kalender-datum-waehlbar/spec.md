# Kalender: Der Tag ist im Dialog wählbar

**Meldung aus dem Laden:** „Bei einer Vorbestellung aus dem Nachrichtenchat
kann der Tag nicht ausgewählt werden für den Termin. Es wird immer heute
angelegt."

## Ausgangslage

Der Dialog „Neuer Eintrag" hatte nie ein Feld für den Tag. Er nahm stumm
`state.selected` — den Tag, der oben in der Wochenleiste angetippt ist. Im
Kalender selbst geht das auf: Man tippt erst den Tag an, dann „+ Neuer
Eintrag".

Aus einer Kundennachricht heraus gibt es diesen Schritt nicht.
`KalenderKiosk.neuAus()` wechselt in den Kalender-Tab, und dessen `onShow`
setzt `state.selected` auf **heute** zurück. Eine telefonisch für Freitag
bestellte Hendl-Portion landete damit am heutigen Tag — ohne Hinweis und
ohne Möglichkeit, das im Dialog zu ändern.

Der Fehler traf genau den Weg, der zuletzt neu gebaut wurde (Spec
`kontakt-in-kalender`): Bestellung aus dem Chat in den Kalender übernehmen.

## Anforderungen

- **R1** Der Dialog zeigt den Tag und lässt ihn ändern — auch, wenn er aus
  einer Nachricht heraus geöffnet wurde.
- **R2** Heute, morgen und übermorgen sind mit einem Antippen erreichbar;
  alles Weitere über ein Datumsfeld.
- **R3** Wird nichts geändert, bleibt es beim bisherigen Verhalten: der in
  der Wochenleiste angetippte Tag.
- **R4** Nach dem Speichern springt die Ansicht auf den gespeicherten Tag —
  auch über Wochengrenzen hinweg.
- **R5** Vergangene Tage sind nicht wählbar (`min` = heute).
- **R6** Die Prüfung „Serie endet vor ihrem Beginn" bezieht sich auf den im
  Dialog gewählten Tag, nicht mehr auf die Wochenleiste.

## Test Cases

| ID | Prüft | Erwartung |
|----|-------|-----------|
| TC-F22-01 | R1 | `neuAus()` öffnen, Tag auf übermorgen setzen → gesendetes `datum` ist übermorgen |
| TC-F22-02 | R2 | „Morgen" antippen → gesendetes `datum` ist morgen |
| TC-F22-03 | R3 | Dienstag in der Leiste, Dialog öffnen → Feld zeigt Dienstag, gesendet wird Dienstag |
| TC-F22-04 | R4 | Tag in neun Tagen speichern → dieser Tag ist danach in der Leiste aktiv |
| TC-F22-05 | R6 | Start nach hinten schieben, Ende davor → nichts wird gesendet |

Wächter: [tests/kiosk-kalender.spec.js](../../tests/kiosk-kalender.spec.js)

## Umsetzung

In [static-site/js/kiosk-kalender.js](../../static-site/js/kiosk-kalender.js):

- neues Feld `#kal-datum` samt Schnellknöpfen `#kal-tagpills`
- `state.newDatum` und der Lesehelfer `dlgDatum()`; alle Stellen, die bisher
  `state.selected` für den **neuen** Eintrag lasen, gehen jetzt darüber
  (Speichern, Serienende-Berechnung, Serienende-Untergrenze)
- `wochenAbstand()` verschiebt die Woche nach dem Speichern (R4)

Gestaltung in
[static-site/css/kiosk-neu.css](../../static-site/css/kiosk-neu.css)
(`.kal-datum-box` und Nachbarn).

## Gegenprobe

Nimmt das Speichern wieder `state.selected`, fallen **TC-F22-01, -02 und
-04**. TC-F22-03 bleibt grün (es prüft genau den unveränderten Fall) und
TC-F22-05 ebenfalls, weil die Serienprüfung eine eigene Stelle ist.
