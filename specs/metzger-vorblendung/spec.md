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

Die übrigen Knöpfe **bleiben dabei stehen**. Weg fällt nur, was bereits in
der Zeile steht. Früher hingen alle Vorblendungen daran, dass die Zeile noch
leer war — der erste Tipp nahm damit alle übrigen mit, und wer zwei Größen
wollte, kam an die zweite nicht mehr heran.

Das gilt ausdrücklich auch für **verschiedene Einheiten**: `1 × 1 kg` und
`1 × 2 St` sind zwei Vorblendungen und einzeln übernehmbar.

### F2 — Vorbelegung aus dem Artikelstamm

Ein Artikel kann eine **Vorbelegung** tragen: eine oder mehrere Portionen.
Sie werden zusätzlich zur letzten Bestellung vorgeblendet und stehen
**vor** dieser.

Dieselbe Portion erscheint nur einmal, auch wenn Vorbelegung und letzte
Bestellung sie beide enthalten.

Gespeichert wird sie als Liste von Portionsblöcken. Ältere Einträge in
Kurzschreibweise (`"2x500g V"`) werden weiterhin gelesen.

### F3 — Vorgabe ist sichtbar unterschieden

Eine Vorgabe aus dem Stamm sieht anders aus als ein Wert aus der letzten
Bestellung, damit man weiß, woher der Vorschlag kommt.

### F4 — Erfassung bleibt unverändert

Die Vorschläge **im Erfassungsfeld** rechnen weiterhin nach dem bestehenden
Verfahren (`vorschlaegeFuer()`). An ihnen ändert sich nichts.

### F5 — Vorgabe pflegen

Im Bereich „Artikel" trägt jede Zeile ihre Vorbelegung und einen Knopf
**Bearbeiten**. Er öffnet eine Maske mit Bezeichnung, Nummer, Gruppe, Preis,
Einheit und Vorbelegung.

Die Vorbelegung wird mit **derselben Erfassung** festgelegt wie eine
Bestellposition: Anzahl, Vakuum, Einheit, Mengenkacheln, freies Maß,
Kurzeingabe und **Hinweisfeld**. Mehrere Portionen sind möglich; jede lässt
sich einzeln ändern und entfernen.

Die zuletzt gewählte **Einheit bleibt stehen**, auch wenn eine Portion wieder
entfernt oder die Kurzeingabe übernommen wird.

Es gibt also nur **eine** Erfassung im Reiter — technisch über eine
Pseudo-Position, die `finde()` unter einem eigenen Schlüssel liefert.
Nicht übernommen wird dort nur der Umweg-Knopf zum Hinweis-Blatt: Das
Hinweisfeld steht in der Maske ohnehin daneben.

Ohne Portion **und** ohne Hinweis heißt: keine Vorbelegung.


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

### F8 — Hinweis im Artikelstamm

Ein Artikel kann zusätzlich einen **festen Hinweis** tragen
(`standard_hinweis`), etwa „dünn aufgeschnitten". Er gehört zur ganzen
Position, nicht zu einer einzelnen Portion.

Daraus folgt:

- Ein Artikel darf einen Hinweis **ohne** Portion haben und eine Portion
  **ohne** Hinweis.
- Der Hinweis wird als **eigene Vorblendung** angeboten und ist als solche
  erkennbar (Klasse `hw`). Ein Tipp setzt ihn als Hinweis der Position —
  nicht als Portion.
- Trägt die Position bereits einen Hinweis, wird er nicht mehr angeboten.
- Ein geleertes Feld löscht die Vorgabe (`standard_hinweis: null`).

### F9 — Fester Kopf im Artikelstamm

Reiterleiste und die Kopfzeile mit „+ Neuer Artikel" bleiben beim Rollen der
Artikelliste **oben stehen**. Bei über hundert Artikeln war der Knopf zum
Anlegen sonst nach dem ersten Rollen nicht mehr erreichbar.

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
| TC-V10 | Bereich „Artikel" zeigt die hinterlegte Vorbelegung |
| TC-V11 | Ohne Vorbelegung steht dort „keine Vorgabe" |
| TC-V12 | „Bearbeiten" öffnet die Maske mit Erfassung und heutigen Portionen |
| TC-V13 | Eine Kachel legt eine Portion an, Speichern schickt sie als Liste |
| TC-V14 | Mehrere Portionen sind erfassbar (Kurzeingabe) |
| TC-V15 | Ohne Portion wird `standard: null` geschickt |
| TC-V16 | Der Bereich „Artikel" bietet „+ Neuer Artikel" an |
| TC-V17 | Anlegen schickt alle Felder als POST |
| TC-V18 | Ohne Bezeichnung wird nichts gesendet |
| TC-V19 | Eine unlesbare Nummer wird abgewiesen |
| TC-V20 | Gleicher Name führt zur Rückfrage, Bestätigen legt an |
| TC-V21 | Der hinterlegte Hinweis steht als eigene Vorblendung (Klasse `hw`) |
| TC-V22 | Ein Tipp übernimmt ihn als Hinweis, nicht als Portion |
| TC-V23 | In der Artikelmaske ist der Hinweis pflegbar und wird gesendet |
| TC-V24 | Ein geleerter Hinweis schickt `standard_hinweis: null` |
| TC-V25 | Reiter und Kopfzeile bleiben beim Rollen der Artikelliste stehen |
