# Der Storno-Grund muss sichtbar sein

**Meldung aus dem Laden (27.09.2026):** „Wenn eine Bestellung storniert
wird vom Kunden, sieht man den Grund nicht."

## Befund: eine unterbrochene Kette

| Schritt | Zustand |
|---|---|
| 1. Beim Stornieren wird ein Grund **verlangt** | ✓ funktioniert |
| 2. Er wird in `dl_storno_grund` gespeichert | ✓ funktioniert |
| 3. `_serialize()` gibt ihn zurück | ✗ **fehlte** |
| 4. Der Kiosk zeigt ihn an | ✗ **fehlte** |

Der Grund wurde also sorgfältig abgefragt, sauber gespeichert — und
verschwand danach spurlos.

### Gemessen, nicht vermutet

In Dataverse nachgesehen (27.09.2026):

```
Stornierte Bestellungen betrachtet: 12
davon MIT hinterlegtem Grund      : 12

  2026-09-30  Josef Rumpfinger  [Online]   Kundengrund: Test
  2026-09-24  …                 [Telefon]  Storniert: Gericht ist leider ausverkauft
  2026-09-08  Josef Rumpfinger  [Online]   Storniert: Kunde hat telefonisch storniert
  2026-08-28  Elo               [Online]   Kundengrund: Freitag wos anders
```

**Alle zwölf** hatten einen Grund. Und die Schnittstelle lieferte:

```
Felder: anmerkung, bestaetigung_text, bestellnummer, bestellt_am, datum,
        device_id, email, erfasst_von, gericht, gericht_id, id,
        kommentar_gelesen, kunde_kommentar, menge, mitnehmen, name,
        notify_email, personal_antwort, preis, push_available, quelle,
        quelle_label, stammkunde_id, status, telefon, verlauf,
        wochentag_label

Storno-Feld dabei: NEIN
```

27 Felder, und ausgerechnet das eine nicht. Seit August hat niemand
gesehen, warum abgesagt wurde — obwohl es jedes Mal dabeistand.

## Anforderungen

- **S1** `_serialize()` liefert `storno_grund` mit.
- **S2** `dl_storno_grund` steht in **jeder** Feldauswahl — Dataverse
  liefert nur, was im `$select` angefordert wird.
- **S3** Der Kiosk zeigt den Grund an stornierten Bestellungen, **ohne
  dass die Karte geöffnet werden muss**.
- **S4** Ohne Grund bleibt die Zeile weg — kein leerer Kasten.
- **S5** Der Grund ist vom Sonderwunsch zu unterscheiden.
- **S6** Auch die Kundin sieht ihren eigenen Grund wieder.

## Warum S2 eigens dasteht

Dieselbe Falle hat schon einmal zugeschlagen: Beim Löschen stornierter
Bestellungen fehlte `dl_status` im `$select`, und der Server entschied
blind (Spec `telefon-bestellung-loeschen`, TC-TL-S8). Ein Feld in
`_serialize` einzutragen genügt nicht — wird es nicht angefordert, ist
es auch nicht da.

Der Wächter prüft deshalb **beides getrennt**: dass der Wert
zurückkommt, und dass er angefordert wird.

## Warum S5

An derselben Karte können Sonderwunsch **und** Storno-Grund stehen.
Hätten beide dasselbe Aussehen, läse die Verkäuferin einen abgesagten
Wunsch als offenen. Der Wunsch bleibt bernsteinfarben, der Grund wird
rot.

## Warum S6

Der Grund wird beim Stornieren **verlangt** (Spec `bestellung-aendern`,
A3). Ihn danach nicht mehr zu zeigen wäre schwer erklärbar — man hat ihn
ja gerade eingetippt.

## Umsetzung

**Server** — [api/lunch-order/\_\_init\_\_.py](../../api/lunch-order/__init__.py):
`storno_grund` in `_serialize()`, `dl_storno_grund` in beiden
Feldauswahlen.

**Kiosk** — [static-site/kiosk-klassisch.html](../../static-site/kiosk-klassisch.html):
`.k-oc-storno` direkt unter der Kopfzeile, neben `.k-oc-wunsch`. Das
Vorwort im Text (`Kundengrund:` / `Storniert:`) bleibt stehen — es sagt,
**wer** abgesagt hat.

**Kontoseite** — [static-site/mein-konto.html](../../static-site/mein-konto.html):
rote Zeile unter dem Status.

## Ein Folgefund: Die Nachricht nach der Absage

Seit die Kundin aus ihrem Konto heraus schreiben kann (Spec
`bestellung-aendern`), liegt genau **nach** einer Absage die Frage nahe:
„Warum wurde storniert?"

Diese Nachricht wäre stumm geblieben. Der Kiosk entschied:

```js
return !!(vomKunden && o.status!==2 && !o.kommentar_gelesen);
```

Der Zusatz `o.status!==2` war richtig, solange niemand zu einer
stornierten Bestellung schreiben konnte — eine abgesagte Bestellung
braucht keine Aufmerksamkeit mehr. Mit dem neuen Nachrichtenfaden stimmt
das nicht mehr: Die Kundin hätte in ein Feld geschrieben, das niemand
liest.

**Die Regel unterscheidet jetzt zwei Fälle:**

| Was | Nach einer Stornierung |
|---|---|
| **Echte Nachricht** (`kunde_kommentar`) | meldet sich — gerade dann |
| **Sonderwunsch** (`anmerkung`) | bleibt still, er ist erledigt |

Der Server tat seinen Teil schon vorher richtig: `kunde_kommentar` setzt
`dl_kommentar_gelesen = False`. Es fehlte allein die Anzeige.

| ID | Prüft | Erwartung |
|----|-------|-----------|
| TC-SG-07 | — | echte Nachricht meldet sich auch nach der Absage |
| TC-SG-08 | — | der blosse Sonderwunsch meldet sich **nicht** mehr |
| TC-SG-09 | — | bei offenen Bestellungen bleibt alles wie bisher |

Gegenprobe: Mit der alten Regel fällt **genau** TC-SG-07, die übrigen
acht bleiben grün (nachgestellt). Die fünf Fälle in
`kiosk-sonderwunsch-telefon.spec.js`, die dieselbe Funktion prüfen,
bleiben ebenfalls grün.

## Testfälle

### Kiosk — [tests/kiosk-storno-grund.spec.js](../../tests/kiosk-storno-grund.spec.js)

| ID | Prüft | Erwartung |
|----|-------|-----------|
| TC-SG-01 | S3 | der Kundengrund steht an der Karte |
| TC-SG-02 | S3 | lesbar **ohne** Aufklappen |
| TC-SG-03 | S3 | auch der Grund des Ladens |
| TC-SG-04 | S4 | ohne Grund keine leere Zeile |
| TC-SG-05 | — | an offenen Bestellungen steht nichts |
| TC-SG-06 | S5 | Grund und Sonderwunsch sehen verschieden aus |

### Server — [tests/test_meine_bestellungen.py](../../tests/test_meine_bestellungen.py)

| Prüfung | Erwartung |
|---|---|
| „wird zurückgegeben" | `storno_grund` kommt aus `mode=my` mit |
| „steht in jeder Feldauswahl" | `dl_storno_grund` in **allen** `$select` |

### Kontoseite

**TC-BA-09** (Spec `bestellung-aendern`): Die Kundin sieht ihren Grund.

## Gegenprobe

| Rücknahme | Ergebnis |
|---|---|
| `storno_grund` aus `_serialize` | „wird zurückgegeben" fällt mit `bekam: None` |
| `dl_storno_grund` aus dem `$select` | „steht in jeder Feldauswahl" fällt mit `2 von 2 ohne` |
| `.k-oc-storno` im Kiosk weglassen | **TC-SG-01** fällt |
| dem Grund die Farbe des Wunsches geben | **TC-SG-06** fällt |

Die ersten beiden sind nachgestellt — sie belegen, dass die **Kette**
geprüft wird und nicht nur ihr letztes Glied.
