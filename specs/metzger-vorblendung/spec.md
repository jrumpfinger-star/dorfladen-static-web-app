# Metzger Mair — Vorblendungen einzeln wählbar, Vorgabe im Artikelstamm

Ergänzt [metzger-bestellung](../metzger-bestellung/spec.md). Nur die hier
beschriebenen Punkte ändern sich, alles andere bleibt wie dort festgelegt.

## Warum

Beim Metzger wiederholt sich viel, aber nicht alles. Bisher stand über jeder
Position **ein** Knopf, der die ganze letzte Bestellung übernahm — alles oder
nichts. Wer nur eine von drei Portionen wieder haben wollte, musste den Rest
einzeln wieder wegräumen.

Dazu kommt: Bei manchen Artikeln ist die Portionierung immer dieselbe, ganz
unabhängig davon, was zuletzt bestellt wurde. Diese Gewohnheit gehört an den
Artikel, nicht an die letzte Bestellung.

## Anforderungen

### F1 — Jede Vorblendung einzeln

Über einer Position steht **je Portionsblock ein eigener Knopf**. Ein Tipp
übernimmt genau diesen Block. Mehrere Tipps übernehmen mehrere Blöcke.

### F2 — Vorgabe aus dem Artikelstamm

Ein Artikel kann eine **Standard-Portionierung** tragen. Sie wird zusätzlich
zur letzten Bestellung vorgeblendet und steht **vor** dieser.

Dieselbe Portion erscheint nur einmal, auch wenn Vorgabe und letzte
Bestellung sie beide enthalten.

### F3 — Vorgabe ist sichtbar unterschieden

Eine Vorgabe aus dem Stamm sieht anders aus als ein Wert aus der letzten
Bestellung, damit man weiß, woher der Vorschlag kommt.

### F4 — Erfassung bleibt unverändert

Die Vorschläge **im Erfassungsfeld** rechnen weiterhin nach dem bestehenden
Verfahren (`vorschlaegeFuer()`). An ihnen ändert sich nichts.

### F5 — Vorgabe pflegen

Im Bereich „Artikel" trägt jede Zeile ihre Vorgabe und einen Knopf
**Bearbeiten**. Er öffnet eine Maske mit Bezeichnung, Nummer, Gruppe, Preis,
Einheit und Standard-Portionierung.

Die Portionierung wird in derselben Kurzschreibweise eingetragen wie im
Erfassungsfeld (`2x500g V`). Ein leeres Feld entfernt die Vorgabe.

Unlesbare Eingaben werden abgewiesen, ohne etwas zu speichern.

### F6 — Mehr Kacheln

Die Schnellwahl bietet zusätzlich:

| Einheit | neu |
|---------|-----|
| cm | 3, 5 |
| Stück | ½, 1 |

### F7 — Neuen Artikel anlegen

Über der Liste steht **+ Neuer Artikel**. Er öffnet dieselbe Maske, leer.

Die Schnittstelle konnte das Anlegen längst — im Kiosk fehlte nur der Weg
dorthin. Wer einen Artikel aufnehmen wollte, kam nicht weiter.

Eine Bezeichnung ist Pflicht. Nummer und Preis müssen Zahlen sein, sonst
wird nichts gesendet.

Gibt es den Namen schon, ist das eine **Rückfrage**, keine Absage: Der Kiosk
fragt nach und legt auf Bestätigung trotzdem an.

## Testfälle

| ID | Prüft |
|----|-------|
| TC-V01 | Bei drei Portionsblöcken stehen drei Knöpfe, nicht einer |
| TC-V02 | Ein Tipp übernimmt genau einen Block |
| TC-V03 | Zwei Tipps übernehmen zwei Blöcke |
| TC-V04 | Die Stamm-Vorgabe erscheint als eigener Knopf |
| TC-V05 | Die Stamm-Vorgabe steht vor der letzten Bestellung |
| TC-V06 | Stamm-Knopf trägt die Klasse `stamm`, der andere nicht |
| TC-V07 | Eine doppelte Portion erscheint nur einmal |
| TC-V08 | Kachel „3 cm" und „5 cm" vorhanden |
| TC-V09 | Kachel „½ St" und „1 St" vorhanden |
| TC-V10 | Bereich „Artikel" zeigt die hinterlegte Vorgabe |
| TC-V11 | Ohne Vorgabe steht dort „keine Vorgabe" |
| TC-V12 | Knopf „Bearbeiten" öffnet die Maske mit dem heutigen Wert |
| TC-V13 | Speichern schickt ein PATCH mit `standard` |
| TC-V14 | Unlesbare Portionierung wird abgewiesen, kein PATCH |
| TC-V15 | Leeres Feld schickt `standard: null` |
| TC-V16 | Der Bereich „Artikel" bietet „+ Neuer Artikel" an |
| TC-V17 | Anlegen schickt alle Felder als POST |
| TC-V18 | Ohne Bezeichnung wird nichts gesendet |
| TC-V19 | Eine unlesbare Nummer wird abgewiesen |
| TC-V20 | Gleicher Name führt zur Rückfrage, Bestätigen legt an |
