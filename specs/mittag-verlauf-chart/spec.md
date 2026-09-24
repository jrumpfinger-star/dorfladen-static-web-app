# Mittagstisch: Rückblick auf sieben Tage

**Meldung aus dem Laden:** „Bei Mittagstisch wäre ein kleiner Chart schön, in
dem die Bestellungen der letzten 7 Tage dargestellt werden. Er sollte einfach
als Popup aufrufbar sein über ein passendes Icon. Stornierte Bestellungen
sollen nicht berücksichtigt werden."

**Nachtrag:** „Wenn möglich, sollten als Tooltip die Anzahl der einzelnen
Gerichte angezeigt werden können."

## Ausgangslage

Der Kiosk zeigt immer genau **einen** Tag. Wie sich die Nachfrage über die
Woche entwickelt, sieht niemand — und genau danach wird beim Einkauf
gefragt: „Wie viele Hendl letzten Donnerstag?"

Ein Endpunkt `mode=stats` bestand bereits, taugte hier aber nicht:

- er filtert auf `dl_quelle eq 0`, kennt also **nur Online-Bestellungen**.
  Im Laden wird rund die Hälfte telefonisch bestellt — der Chart hätte die
  halbe Wahrheit gezeigt.
- er lädt `dl_gericht` gar nicht, der Tooltip wäre nicht möglich gewesen.
- er gruppiert nach `dl_datum`, **filtert** aber nach `createdon`. Eine am
  Montag für Freitag aufgenommene Bestellung fiele je nach Zeitraum heraus.

## Anforderungen

- **R1** Ein Symbol im Mittagstisch-Reiter öffnet ein Popup.
- **R2** Sieben Balken, einer je Tag, Höhe nach Portionen.
- **R3** Leere Tage bleiben in der Reihe. Ein Ruhetag ist eine Aussage; fiele
  er weg, rutschten die übrigen zusammen und die Reihe läse sich falsch.
- **R4** **Stornierte Bestellungen zählen nicht mit** — sie wurden nie
  gekocht.
- **R5** Telefonische und am Tresen aufgenommene Bestellungen zählen mit.
- **R6** Der Tooltip am Balken nennt die einzelnen Gerichte mit ihrer Anzahl.
- **R7** Auf dem Tablet gibt es kein Überfahren: Ein Tippen auf den Balken
  schreibt dieselbe Aufschlüsselung unter das Diagramm.
- **R8** Ohne Zutun steht der jüngste Tag mit Bestellungen offen.
- **R9** Streikt der Server, erscheint eine Meldung — **kein leeres
  Diagramm**. Das sähe aus wie „nichts bestellt" und wäre die gefährlichste
  Antwort von allen.

## Test Cases

### Anzeige — [tests/mittagstisch-verlauf-chart.spec.js](../../tests/mittagstisch-verlauf-chart.spec.js)

| ID | Prüft | Erwartung |
|----|-------|-----------|
| TC-VC-01 | R1 | Symbol da, Klick öffnet das Popup |
| TC-VC-02 | R3 | genau sieben Balken |
| TC-VC-03 | R2 | gemessene Höhen folgen den Portionen; der leere Tag hat eine sichtbare Grundlinie |
| TC-VC-04 | R6 | `title` am Balken nennt beide Gerichte mit Anzahl |
| TC-VC-05 | R7 | Klick auf den Balken schreibt die Gerichte darunter |
| TC-VC-06 | R8 | ohne Zutun steht der jüngste Tag mit Bestellungen offen |
| TC-VC-07 | R4 | der Hinweis „ohne stornierte" steht dabei |
| TC-VC-08 | — | abgefragt wird `days=7` |
| TC-VC-09 | — | leere Woche sagt es im Klartext |
| TC-VC-10 | R9 | Serverfehler → Meldung statt leerem Diagramm |
| TC-VC-11 | — | `Escape` und Klick auf den Rand schließen |

### Server — [tests/test_mittagstisch_verlauf.py](../../tests/test_mittagstisch_verlauf.py)

| ID | Prüft | Erwartung |
|----|-------|-----------|
| TC-VC-S1 | R3 | sieben Einträge, letzter ist heute, leere Tage dabei |
| TC-VC-S2 | R4 | stornierte fehlen in Portionen **und** in der Zahl der Bestellungen |
| TC-VC-S3 | R5 | alle drei Wege gezählt, online und vor Ort getrennt ausgewiesen |
| TC-VC-S4 | R6 | gleiche Gerichte zusammengezählt, häufigstes vorn, Tage getrennt |
| TC-VC-S5 | — | gefiltert wird auf `dl_datum`, nicht auf `createdon`; `dl_gericht` wird geladen |
| TC-VC-S6 | — | `days` einstellbar, unsinnige Angabe → 7, maßlose → 31 |
| TC-VC-S7 | R9 | Dataverse-Fehler → 502, kein `success: true` |
| TC-VC-S8 | — | Bestellung ohne Gerichtname verschwindet nicht |

## Umsetzung

**Server** — neuer `mode=tagesverlauf` in
[api/lunch-order/\_\_init\_\_.py](../../api/lunch-order/__init__.py).
Filtert über `dl_datum` im Zeitraum, lässt `STATUS_STORNIERT` beim Zählen
aus und gibt je Tag Portionen, Bestellungen, online/vor Ort und die Gerichte
zurück.

**Kiosk** — Knopf `#mt-verlauf-btn` in der Filterleiste,
`zeigeVerlauf()` in
[static-site/kiosk-klassisch.html](../../static-site/kiosk-klassisch.html).
Gezeichnet mit gewöhnlichen Kästen statt einer Diagrammbibliothek: Sieben
Balken brauchen kein zusätzliches Paket, und der Kiosk läuft auch ohne Netz
weiter. Gestaltung in
[static-site/css/kiosk-neu.css](../../static-site/css/kiosk-neu.css).

## Gegenprobe

- Zählen stornierte wieder mit, fällt **TC-VC-S2** mit `waren 10 statt 7`.
- Beschränkt der Server sich wieder auf Online, fällt die Zählung auf `0`.
- Fällt das `title` am Balken weg, fällt **TC-VC-04** — die übrigen zehn
  bleiben grün.
