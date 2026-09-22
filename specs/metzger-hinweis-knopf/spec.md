# Der Hinweis-Knopf zeigt den erfassten Text sofort

## Anlass

Beim Durchtesten der gesamten Suite gefunden — **nicht** aus dem Laden
gemeldet, aber ein Fehler, der im Alltag Arbeit doppelt macht.

## Was passierte

Der Knopf „Hinweis hinzufügen" trägt den erfassten Text als Beschriftung:
Sobald etwas hinterlegt ist, heißt er „Hinweis ändern" und zeigt den Anfang
des Textes. So sieht man auf einen Blick, dass ein Hinweis mitgeht.

Nach dem Übernehmen blieb dort aber **„Hinweis hinzufügen"** stehen,
obwohl der Text gespeichert war. Wer das sieht, hält die Erfassung für
gescheitert — und tippt sie womöglich ein zweites Mal.

## Ursache

```js
uebernehmen: function (wert) {
  _b.notiz = wert;
  markiereGeaendert();
  fuss();          // ← zeichnet nur die FUSSZEILE neu
}
```

Der Knopf stand früher in der Fußzeile. Beim Straffen des Kopfbereichs ist
er ins **Blatt hinter dem „i"** gewandert (`detailBlatt()`), das Neuzeichnen
wurde aber nicht nachgezogen. `fuss()` erneuert das Blatt nicht.

## Anforderungen

- **F1** Nach dem Übernehmen zeigt der Knopf **sofort** den erfassten Text
  und die Beschriftung „Hinweis ändern".
- **F2** Erneuert wird **nur dieser Knopf**, nicht das ganze Blatt. Ein
  offenes Blatt soll sich nicht schließen und seine Rollposition nicht
  verlieren.
- **F3** Ein geleerter Hinweis führt zurück auf „Hinweis hinzufügen".

## Testfälle

| Nr. | Fall | Erwartung |
|---|---|---|
| TC-F1-02 | Text erfassen und übernehmen | Knopf zeigt „Hinweis ändern" **und** den Text |
| TC-F1-05 | Text leeren | Knopf zeigt wieder „Hinweis hinzufügen" |
| TC-F5-02 | Bestellung senden | Der Hinweis geht mit hinaus |

Wächter: `tests/kiosk-notiz.spec.js` — 40 Fälle über alle vier Profile.

## Nebenbefund in den Wächtern

Dieselben Tests suchten den Knopf **direkt**, ohne das Blatt zu öffnen —
seit dem Umzug lief das ins Leere und die Folgeprüfungen in die
Zeitüberschreitung. Zehn von zehn Fällen waren rot, ohne dass es auffiel.
Die Datei öffnet das Blatt jetzt über `knopfSichtbar()` und schließt es mit
`blattZu()`, bevor gesendet wird — so, wie es im Betrieb auch abläuft.

## Berührte Dateien

- `static-site/js/kiosk-metzger-bestellung.js` — `notizKnopfAuffrischen()`
- `tests/kiosk-notiz.spec.js` — Helfer für Blatt auf/zu
