# Social – Schritt 1 „Titel & Text" aufklappbar

## Ausgangslage

Im Social-Bereich stehen vier Schritte untereinander. Schritt 1
(„Titel & Text") war immer aufgeklappt und belegte rund die halbe Höhe
des Bereichs — obwohl im Alltag fast immer der **vorgeschlagene Titel**
übernommen wird.

Aus dem Laden: *„Da man hauptsächlich mit dem Default arbeitet, wird
selten etwas geändert. Und dies soll dann durch Aufklappen möglich sein.
So spart man Platz für das Produktive."*

## Entscheidung

Schritt 1 startet **zugeklappt**. Damit man trotzdem sieht, was
gepostet wird, steht der **gewählte Titel in der Kopfzeile** des
Schritts. Wer ändern will, klappt auf.

## Anforderungen

- **F1** Schritt 1 ist beim Öffnen des Social-Bereichs **zugeklappt**.
- **F2** Die Kopfzeile von Schritt 1 zeigt den aktuell gewählten Titel.
  Ist zusätzlich ein Freitext erfasst, wird das mit „· mit Freitext"
  angedeutet. Ohne Titel steht dort „Noch kein Titel gewählt".
- **F3** Ein Klick auf die Kopfzeile klappt auf und wieder zu — **auch
  auf breiten Schirmen**. Dort erzwang bisher eine Regel, dass alle
  Schritte offen sind und die Pfeile verborgen bleiben; für Schritt 1
  gilt jetzt eine Ausnahme.
- **F4** Im aufgeklappten Zustand ist die Kurzfassung ausgeblendet —
  der Titel steht dann ja im Auswahlfeld.
- **F5** Die Kurzfassung darf die Kopfzeile nie sprengen: Sie wird bei
  Bedarf mit Auslassungspunkten gekürzt.
- **F6** Ändert man den Titel (Auswahl, eigener Titel) oder den
  Freitext, aktualisiert sich die Kurzfassung sofort.
- **F7** Die übrigen Schritte bleiben unverändert.

## Testfälle

| Nr. | Fall | Erwartung |
|---|---|---|
| TC-S01 | Social-Bereich öffnen (schmal) | Schritt 1 zugeklappt, Inhalt verborgen |
| TC-S02 | Kopfzeile nach dem Öffnen | zeigt den vorgeschlagenen Titel |
| TC-S03 | Klick auf die Kopfzeile | klappt auf, Inhalt sichtbar, Kurzfassung verborgen |
| TC-S04 | Erneuter Klick | klappt wieder zu |
| TC-S05 | Anderen Titel wählen, zuklappen | Kopfzeile zeigt den **neuen** Titel |
| TC-S06 | Freitext erfassen | Kopfzeile ergänzt „· mit Freitext" |
| TC-S07 | Breiter Schirm (1280 px) | Schritt 1 ebenfalls zugeklappt und klappbar |
| TC-S08 | Sehr langer Titel | Kopfzeile bleibt einzeilig, nichts läuft über |
