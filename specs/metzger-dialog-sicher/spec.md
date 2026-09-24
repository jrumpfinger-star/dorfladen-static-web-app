# Metzger-Artikelmaske: kein Wegklicken, alle Einheiten sichtbar

**Meldung aus dem Laden:** „Bei Bestellung Metzger schließt sich Dialog, wenn
klick auf außerhalb. Außerdem werden die Vorbelegungen nicht komplett
angezeigt."

## Ausgangslage

Zwei getrennte Beobachtungen an derselben Maske (Artikel anlegen/bearbeiten
im Metzger-Tab):

1. **Wegklicken verwirft.** Jeder Dialog des Moduls schloss beim Klick auf den
   abgedunkelten Rand. Bei reinen Hinweisen ist das bequem — bei einer Maske
   mit Eingabefeldern ist es Datenverlust ohne Nachfrage und ohne Weg zurück.
   Auf dem Tablet passiert der Fehlgriff besonders leicht.

2. **Einheiten hinter der Rollkante.** Die Einheitenzeile kennt sieben
   Einträge (kg, g, Stück, cm, Größe, Schale, Beutel). Sie war auf `nowrap`
   gestellt und rollte waagrecht. In der schmalen Maske lagen damit drei
   Einträge außerhalb des sichtbaren Bereichs — ohne sichtbaren Hinweis
   darauf, dass dort noch etwas steht.

## Anforderungen

- **R1** Ein Klick neben die Artikelmaske darf sie nicht schließen.
- **R2** Die bewussten Wege hinaus bleiben: „Abbrechen" und `Escape`.
- **R3** In der Artikelmaske sind alle Einheiten gleichzeitig sichtbar; die
  Zeile bricht um statt zu rollen.
- **R4** In der **Bestellliste** bleibt es beim Rollen. Dort steht die Zeile
  über die ganze Breite, und jede Artikelzeile soll gleich hoch bleiben —
  ein Umbruch machte einzelne Zeilen doppelt so hoch.
- **R5** Dialoge ohne Eingaben (Hinweise, Rückfragen) dürfen weiterhin
  weggeklickt werden; die Änderung gilt gezielt, nicht pauschal.

## Test Cases

| ID | Prüft | Erwartung |
|----|-------|-----------|
| TC-F21-01 | R1 | Eingabe machen, auf den Rand klicken → Maske steht noch, Eingabe unverändert |
| TC-F21-02 | R2 | „Abbrechen" schließt |
| TC-F21-03 | R2 | `Escape` schließt |
| TC-F21-04 | R3 | mindestens sieben Einheiten, **keine** davon außerhalb des Kastens |
| TC-F21-05 | R4 | Die Regel für die Bestellliste steht weiterhin auf `nowrap` |

Wächter: [tests/kiosk-metzger-sortierung.spec.js](../../tests/kiosk-metzger-sortierung.spec.js)

## Umsetzung

`huelle(inhalt, sicher)` in
[static-site/js/kiosk-metzger-bestellung.js](../../static-site/js/kiosk-metzger-bestellung.js)
bekommt einen Schalter. Nur die Artikelmaske ruft mit `sicher = true` auf
(R5); `Escape` bleibt in beiden Fällen aktiv (R2).

Der Umbruch ist in
[static-site/css/kiosk-neu.css](../../static-site/css/kiosk-neu.css) auf
`.mb-dlg .mb-erf` eingeschränkt, damit die Bestellliste unberührt bleibt (R4).

## Gegenprobe

Mit neutralisiertem `sicher`-Schalter fällt **genau TC-F21-01**; die übrigen
vier bleiben grün. Der Wächter greift also an der gemeinten Stelle und nicht
bloß irgendwo.
