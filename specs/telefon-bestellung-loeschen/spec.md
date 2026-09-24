# Telefonbestellung löschen, nicht nur stornieren

**Meldung aus dem Laden:** „Telefonbestellung sollen auch gelöscht werden
können und nicht nur storniert."

## Ausgangslage

Für Mittagstisch-Bestellungen gab es nur den Weg über den Status:
Stornieren setzt `dl_status = 2`. Der Datensatz bleibt bestehen — er steht
weiter im Reiter „Storniert", zählt im Zähler mit und taucht in der
Statistik auf.

Für eine echte Absage ist das richtig: Man will später sehen, dass storniert
wurde und warum. Für eine **Fehleingabe** oder eine **Testbestellung** ist es
falsch — die gehört gar nicht erst in die Zahlen.

Bäcker, Metzger und Getränke kennen das Löschen bereits
(Spec `bestellung-loeschen`); beim Mittagstisch fehlte es.

## Anforderungen

- **R1** Telefonisch oder am Tresen aufgenommene Bestellungen (`quelle` 1
  und 2) lassen sich endgültig löschen.
- **R2** Online-Bestellungen nicht. Der Kunde sieht sie in seiner eigenen
  Übersicht; ein stilles Verschwinden könnte er sich nicht erklären. Dort
  bleibt es beim Stornieren.
- **R3** Der Server stellt R2 selbst sicher und verlässt sich nicht darauf,
  dass der Kiosk den Knopf weglässt.
- **R4** Gelöscht wird erst nach einer Rückfrage, die Kunde und Gericht
  nennt und auf den Unterschied zum Stornieren hinweist.
- **R5** Das gilt in jedem Status — auch eine bereits stornierte
  Telefonbestellung lässt sich wegräumen (der gemeldete Fall).
- **R6** Eine bereits gelöschte Bestellung gilt als Erfolg, nicht als
  Fehler. Zwei Personen am selben Tablet sollen sich nicht gegenseitig
  Fehlermeldungen erzeugen.

## Test Cases

### Anzeige — [tests/mittagstisch-telefon-loeschen.spec.js](../../tests/mittagstisch-telefon-loeschen.spec.js)

| ID | Prüft | Erwartung |
|----|-------|-----------|
| TC-TL-01 | R1 | Telefon- und Tresen-Bestellungen tragen einen Papierkorb |
| TC-TL-02 | R2 | Online-Bestellungen tragen keinen — offen wie storniert |
| TC-TL-03 | R5 | auch die stornierte Telefonbestellung trägt einen |
| TC-TL-04 | R4 | erst Rückfrage mit dem Namen, dann genau ein `DELETE` auf die richtige Kennung |
| TC-TL-05 | R4 | „Abbrechen" löscht nichts |
| TC-TL-06 | — | der Klick klappt nicht nebenbei die Karte auf |

### Server — [tests/test_bestellung_loeschen.py](../../tests/test_bestellung_loeschen.py)

| ID | Prüft | Erwartung |
|----|-------|-----------|
| TC-TL-S1 | R1 | `quelle = 1` → 200, Datensatz ist weg |
| TC-TL-S2 | R1 | `quelle = 2` → dasselbe |
| TC-TL-S3 | R3 | `quelle = 0` → 403, nichts gelöscht, Begründung im Klartext |
| TC-TL-S4 | R6 | unbekannte Kennung → 200, nichts gelöscht |
| TC-TL-S5 | — | streikt Dataverse, wird kein Erfolg gemeldet |
| TC-TL-S6 | — | ohne Kennung wird nichts gelöscht (405) |

## Umsetzung

**Server** —
[api/lunch-order/\_\_init\_\_.py](../../api/lunch-order/__init__.py):
neuer `DELETE`-Zweig. Er liest zuerst `dl_quelle` und weist Online ab;
`function.json` und die CORS-Kopfzeilen kennen die Methode jetzt.

**Kiosk** —
[static-site/kiosk-klassisch.html](../../static-site/kiosk-klassisch.html):
Papierkorb in der Kopfzeile der Karte, nur bei `_istVorOrt(o)`.
`showDeleteDialog()` fragt über `dlConfirm` zurück, `deleteOrder()` schickt
das `DELETE`. `kiosk.html` und `kiosk-neu.html` werden neu gebaut.

## Gegenprobe

- Erscheint der Papierkorb auch an Online-Bestellungen, fällt
  **TC-TL-02**; die übrigen fünf bleiben grün.
- Entfällt die Prüfung `quelle == QUELLE_ONLINE` im Server, fällt
  **TC-TL-S3** mit `war 200`.
