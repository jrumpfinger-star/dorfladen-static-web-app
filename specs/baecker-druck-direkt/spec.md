# Drucken ohne Umweg über den PDF-Betrachter

## Anlass

Aus dem Laden:

> „Auf Android kommt man nicht direkt zu der Möglichkeit zu drucken. Es geht
> erst das PDF-Formular auf, dann muss man teilen sagen und dann kann man
> drucken. Es geht aber dann erst wieder der PDF-Viewer auf und von dort kann
> der Druck angestoßen werden. Das ist zu kompliziert."

Und auf Nachfrage: „Gibt es eine Möglichkeit direkt zu drucken ohne über das
Viewing zu gehen?"

## Ursache

Der Druckknopf holte ein fertiges **PDF** vom Server und legte es als
Blob-URL ins Fenster:

```js
var url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
w.location.href = url;
```

Android kann ein PDF nicht selbst drucken. Es öffnet deshalb den Betrachter,
und von dort führt der Weg nur über *Teilen → Drucken → zweiter Betrachter*.
Vier Schritte für einen Ausdruck, den der Laden mehrmals täglich braucht.

Eine **HTML-Seite mit `window.print()`** löst dagegen sofort den
Systemdruckdialog aus — ein Schritt.

## Der Zielkonflikt, der dahintersteckt

Auf PDF umgestellt wurde genau **wegen einer früheren Meldung**:

> „Es wird nicht das Originalfile gedruckt!! Wir brauchen aber dies."

Damals druckte der Kiosk eine eigene HTML-Liste — und die zeigte **nur die
bestellten Zeilen**. Das versendete Formular führt dagegen den **ganzen
Katalog**; auf Papier wird daran abgehakt und mit dem Stift nachgetragen.
Eine Liste nur der bestellten Positionen ist dafür das falsche Papier.

Beide Anliegen schließen sich **nicht** aus. Der Fehler von damals lag nicht
am Format, sondern am **Inhalt**: gefiltert statt vollständig. Eine
HTML-Seite, die den ganzen Katalog führt, erfüllt beides — sie sieht aus wie
das Formular **und** druckt in einem Schritt.

## Anforderungen

- **F1** Der Druckknopf öffnet **unmittelbar** den Systemdruckdialog. Kein
  PDF-Betrachter, kein „Teilen".
- **F2** Das gedruckte Blatt führt **alle** Katalogzeilen, nicht nur die
  bestellten — wie das versendete Formular. Leere Mengenfelder bleiben leer,
  damit man mit dem Stift nachtragen kann.
- **F3** Die Spalten entsprechen dem versendeten Formular: Nr,
  Artikelbezeichnung, **Bestell Menge**, **Retouren Menge** — in dieser
  Reihenfolge.
- **F4** Die Fußzeile zählt die **bestellten** Positionen, nicht die Zeilen
  des Blattes. Sonst stünde dort die Kataloggröße.
- **F5** Löst der Browser den Druckdialog beim Laden nicht aus, steht ein
  Knopf „Drucken" auf dem Blatt bereit.
- **F6** Die Liste hat ein **vollständiges Gitternetz** — waagerecht **und**
  senkrecht. Aus dem Laden: „Beim Ausdruck müssen Gitternetzlinien in der
  Liste rein." Auf dem Blatt wird von Hand eingetragen; ohne senkrechte
  Linien rutscht man beim Schreiben in die falsche Spalte. Die Linien sind
  dunkel genug, um auf schlichtem Papier zu tragen; ein helles Grau
  verschwindet im Ausdruck.

## Testfälle

| Nr. | Fall | Erwartung |
|---|---|---|
| TC-F35-01 | Drucken auslösen | **kein** Abruf von `mode=dokument`; `window.print()` wird gerufen |
| TC-F35-03 | gedrucktes Blatt | mindestens so viele Zeilen wie der Katalog |
| TC-F35-02 | nach dem Senden | Nachdruck steht bereit |
| TC-F35-04 | Tabellenzelle im Blatt | Rand auf **allen vier** Seiten |

Wächter: `tests/kiosk-baecker-zwei.spec.js`, Block „Bäcker – Ausdruck bildet
das Blatt ab (F35)". Geprüft wird das Blatt, das **wirklich** ins
Druckfenster geht: Das Fenster wird durch ein Doppel ersetzt, das den
geschriebenen Inhalt und den Druckaufruf mitschreibt. Ein echtes Fenster
würde den Lauf blockieren, sobald der Systemdialog aufgeht.

TC-F35-04 zeichnet das Blatt in einem echten Dokument und **misst** die
Ränder. Eine Textsuche im CSS würde nur beweisen, dass etwas dasteht — nicht,
dass es wirkt.

## Das PDF bleibt erreichbar

Der Server-Weg `mode=dokument` ist **unverändert**. Er erzeugt weiterhin
dasselbe Dokument wie der Mailanhang — nur der Druckknopf nimmt ihn nicht
mehr. Wer die Datei braucht, bekommt sie darüber.

## Berührte Dateien

- `static-site/js/kiosk-baecker.js` — `blattDrucken()` druckt direkt;
  `druckseite()` bildet das Formular nach; `druckDaten()` filtert nicht mehr
- `tests/kiosk-baecker-zwei.spec.js` — F35-Block neu gefasst

## Vorbestehend, nicht Teil dieser Änderung

*(erledigt — siehe unten)*

## Nachtrag: die vorbestehenden Fehlschläge sind behoben

In `tests/kiosk-baecker-zwei.spec.js` scheiterten **23 Fälle** — mit und
ohne die Druckumstellung identisch. Ursache war ein **Umbau der Oberfläche,
dem die Tests nicht gefolgt waren**: Der frühere Infokasten (`.bk-stat`)
wurde zur Kontextzeile (`.bk-kontext`), und die Angaben, die man einmal
liest, wanderten ins Blatt hinter dem „i" (Spec
`kiosk-bestellreiter-mobil`, F3).

Die Tests suchten also an Orten, die es nicht mehr gab. Sie liefen zum Teil
in 60-Sekunden-Zeitüberschreitungen — der Durchlauf brauchte **12,6 Minuten**
statt gut zwei.

| | vorher | nachher |
|---|---|---|
| Fehlschläge | 23 | **0** |
| Laufzeit | 12,6 min | **2,2 min** |

Nachgezogen wurde die **Absicht**, nicht nur der Selektor:

| Test | Früher geprüft | Jetzt geprüft |
|---|---|---|
| TC-F29-01/03 | Herkunft in der Statuszeile | Herkunft im Blatt |
| TC-F30-02 | „Lieferung am" in der Zeile | Leiste heißt „Liefertag wählen", Zeile nennt ihn nicht doppelt |
| TC-F30-03 | Bestelltag in der Zeile | Bestellschluss im Blatt auffindbar |
| TC-F31-04 | „Gesendet – Lieferung am" | „Gesendet **HH:MM**" — eine Uhrzeit lässt sich nicht mit einem Liefertag verwechseln |
| TC-B2-F27-03 | `.bk-offen` | Klartext am Zähler-Tooltip **und** im Blatt |
| TC-F34-02/04 | „Verwerfen" in der Fußzeile | „Korrektur verwerfen" im Blatt |
| TC-F35-02 | „Noch einmal drucken" | „Drucken" im Blatt |

Ebenfalls behoben: **drei Python-Wächter** brachen schon beim Import ab
(`ModuleNotFoundError: shared`), weil `api` nicht im Suchpfad lag —
`baecker_docx_test.py`, `baecker_pdf_test.py`, `metzger_pdf_test.py`. Sie
liefen dadurch **gar nicht mehr**, ohne dass es auffiel. Jetzt laufen alle
21 Python-Wächter grün.
