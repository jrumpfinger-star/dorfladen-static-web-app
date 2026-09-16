# Telefonbestellung mit freiem Namen

## Warum

Am Telefon steht der Anrufer oft nicht in der Kundenkartei. Telefonnummer
und E-Mail sind dabei häufig unbekannt, und für einen einzelnen Anruf
einen Kontakt anzulegen kostet zu viel Zeit — die Leitung wartet.

Bisher gab es nur zwei Wege: einen Stammkunden auswählen oder einen neuen
anlegen. Wer einfach den Namen eintippte und speicherte, bekam
„Bitte zuerst einen Kunden auswählen" — und kam nicht weiter.

Die Schnittstelle verlangt ohnehin nur einen Namen; `dl_stammkunde_id`
darf leer bleiben. Es fehlte allein der Weg dorthin.

## Anforderungen

### F1 — Der eingetippte Name genügt

Steht im Kundenfeld ein Name und ist kein Stammkunde gewählt, wird die
Bestellung mit diesem Namen aufgenommen. Ohne Kundenanlage, ohne
Telefonnummer.

### F2 — Der Weg ist sichtbar

Findet die Suche keinen Kunden, steht **„Nur für diese Bestellung: …"**
an erster Stelle — vor „… als neuen Kunden anlegen". Es ist der häufigere
Fall.

### F3 — Die Suche bleibt unverändert

Wer einen Stammkunden findet, wählt ihn weiterhin aus und bekommt dessen
Telefonnummer mit. Auch die Neuanlage bleibt.

### F4 — Kein falscher Eindruck

Bei einer Bestellung ohne Kartei steht statt der fehlenden Telefonnummer
der Grund: „ohne Kundenkartei – nur für diese Bestellung".

### F5 — Leer bleibt leer

Ist weder ein Kunde gewählt noch ein Name eingetippt, erscheint weiterhin
ein Hinweis und es wird nichts gesendet.

## Testfälle

| ID | Prüft |
|----|-------|
| TC-T01 | Ein frei eingetippter Name sendet die Bestellung |
| TC-T02 | Dabei bleibt `stammkunde_id` leer |
| TC-T03 | Ohne Namen und ohne Kunde wird nichts gesendet |
| TC-T04 | Ohne Gericht wird nichts gesendet |
| TC-T05 | Bei leerer Suche steht „Nur für diese Bestellung" vor der Neuanlage |
| TC-T06 | Der Vorschlag übernimmt den Namen und nennt den Grund |
| TC-T07 | Ein gewählter Stammkunde sendet weiterhin dessen Id und Nummer |
