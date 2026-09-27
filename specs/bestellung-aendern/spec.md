# Bestellungen aus dem Konto heraus ändern

**Zwei Meldungen aus dem Laden, kurz nacheinander:**

> „Ich möchte die Bestellungen auch bearbeiten können, z. B. stornieren."

> „Ich möchte nicht nur stornieren, sondern auch zu der Bestellung chatten."

## Ausgangslage

Die Kontoseite (Spec `konto-ohne-bankdaten`) **zeigte** Bestellungen nur
an. Ansehen, mehr nicht. Wer absagen oder etwas fragen wollte, musste den
Weg über die Bestellstatus-Seite finden — und dafür die Bestellnummer
zur Hand haben.

Beides gibt es dort längst: Stornieren mit Grund, und einen
Nachrichtenfaden. Nur eben nicht da, wo man seine Bestellungen sieht.

## Anforderungen

- **A1** Eine Bestellung lässt sich aus der Liste heraus stornieren.
- **A2** Der Storno-Knopf steht **nur** dort, wo der Server die
  Stornierung auch zulässt.
- **A3** Für die Stornierung ist ein **Grund** anzugeben.
- **A4** Zu jeder Bestellung lässt sich ein Nachrichtenfaden öffnen,
  lesen und fortführen.
- **A5** Eine Nachricht ändert den **Status nicht**.
- **A6** Weist der Server ab, erfährt die Kundin warum — und die
  Bestellung bleibt unverändert.
- **A7** Alle Bedienelemente sind mindestens **40 px** hoch.

## Warum A2 der entscheidende Punkt ist

Der Server lässt eine Kundenstornierung nur zu, solange die Küche noch
nicht bestätigt hat:

```python
if kunde_storno and int(new_status) == STATUS_STORNIERT:
    if current_status != STATUS_NEU:
        return _err("Stornierung nicht mehr möglich – "
                    "die Bestellung wurde bereits bestätigt")
```

Ein Knopf an einer bestätigten Bestellung wäre deshalb ein **leeres
Versprechen**: Er führte zuverlässig in eine Fehlermeldung. Die
Oberfläche darf nicht mehr anbieten, als der Server einlöst.

Trotzdem bleibt `TC-BA-06`: Die Küche kann in derselben Minute
bestätigen, in der die Kundin storniert. Dann muss die Absage sauber
scheitern und erklärt werden — die Bestellung bleibt bestehen, und der
Knopf lässt sich erneut drücken.

## Warum der Grund Pflicht ist

Die Küche plant nach Bestellungen ein. Eine Absage ohne Wort lässt sie
rätseln, ob etwas nicht geschmeckt hat oder nur ein Termin dazwischenkam.
Dieselbe Regel gilt auf der Bestellstatus-Seite — zwei verschiedene
Regeln für dasselbe wären für niemanden nachvollziehbar.

Der Grund wird als `Kundengrund: …` gespeichert. Das Vorwort sagt später,
**wer** abgesagt hat: Der Laden schreibt `Storniert: …`.

## Arbeitsteilung mit der Bestellstatus-Seite

| | Kontoseite | Bestellstatus-Seite |
|---|---|---|
| Alle Bestellungen auf einen Blick | ✓ | — |
| Stornieren | ✓ | ✓ |
| Nachrichten lesen und schreiben | ✓ | ✓ |
| Einzelne Bestellung im Detail | Link dorthin | ✓ |

Beide Seiten gehen **denselben Weg**: `PATCH /api/lunch-order/{id}` mit
`kunde_storno` bzw. `kunde_kommentar`. Keine zweite Logik, keine zweite
Wahrheit.

## Zwei Entscheidungen, die nicht offensichtlich sind

**Nach dem Senden wird die Liste neu geladen**, statt die Nachricht von
Hand anzuhängen. So steht genau das da, was der Server gespeichert hat —
und eine zwischenzeitliche Antwort aus dem Laden kommt gleich mit. Der
gerade benutzte Faden bleibt dabei offen (`TC-BA-14`); klappte er zu,
stünde die Kundin vor ihrer eigenen Nachricht und wüsste nicht, ob sie
angekommen ist.

**Der Abmelden-Knopf war 24 px hoch.** Gemessen, nicht geschätzt. Wer
sich auf einem geteilten Gerät wieder abmelden will, soll ihn nicht
suchen müssen — jetzt 40 px mit Rahmen (`TC-BA-16`).

## Testfälle

[tests/mein-konto-stornieren.spec.js](../../tests/mein-konto-stornieren.spec.js)

| ID | Prüft | Erwartung |
|----|-------|-----------|
| TC-BA-01 | A2 | **nur** die offene Bestellung trägt einen Storno-Knopf |
| TC-BA-02 | — | jede Bestellung führt zu ihren Details |
| TC-BA-03 | A3 | ohne Grund bleibt „Stornieren" gesperrt, auch bei Leerzeichen |
| TC-BA-04 | A1 | genau ein `PATCH` mit `status: 2`, `kunde_storno`, Grund |
| TC-BA-05 | — | „Behalten" storniert nichts |
| TC-BA-06 | A6 | weist der Server ab, steht der Grund da und der Knopf ist wieder bereit |
| TC-BA-07 | A7 | Storno- und Detail-Knopf ≥ 40 px |
| TC-BA-08 | — | Escape schließt die Rückfrage |
| TC-BA-09 | — | der eigene Storno-Grund steht an der Karte |
| TC-BA-10 | A4 | jede Bestellung hat einen Faden, mit Anzahl |
| TC-BA-11 | A4 | der Faden zeigt **beide** Seiten getrennt |
| TC-BA-12 | — | eine leere Nachricht geht nicht raus |
| TC-BA-13 | A5 | genau ein `PATCH` mit `kunde_kommentar`, **ohne** `status` |
| TC-BA-14 | — | nach dem Senden bleibt der Faden offen, das Feld ist leer |
| TC-BA-15 | — | ohne Nachrichten steht ein Satz da, nicht nichts |
| TC-BA-16 | A7 | Abmelden ≥ 40 px |

## Gegenprobe

| Rücknahme | Ergebnis |
|---|---|
| Storno-Knopf an jeder Bestellung | **TC-BA-01** fällt |
| Grund nicht mehr verlangen | **TC-BA-03** fällt |
| `status` bei der Nachricht mitschicken | **TC-BA-13** fällt |
| Faden nach dem Senden zuklappen | **TC-BA-14** fällt |
| Abmelden wieder auf 24 px | **TC-BA-16** fällt |
