# Bestellschluss bremst die telefonische Aufnahme nicht

## Anlass

Aus dem Laden:

> „Wo kann dies eingestellt werden? Bei Mittagessen Bestellung musst du bei
> telefonischer Bestellung Zeit ändern. Da ist momentan Schluss um 12.00 und
> nach 12.00 Uhr kann ich nichts mehr eingeben, keine Bestellung mehr."

## Zwei Fehler steckten darin

**1. Die Zeit war nicht einstellbar.** Im Kiosk standen die 12 Uhr **fest
im Code**:

```js
return _mittagDatum === today() && now.getHours() >= 12;
```

Dabei gibt es die Einstellung längst: im CMS unter **Bestellschluss**
(Dataverse-Schlüssel `bestellschluss_uhr`). Alle Kundenseiten lesen sie —
`js/app.js`, `mittagstisch-bestellen.html`, `tagesinfo.html`. Nur der Kiosk
nicht. Live gemessen stand dort **11:00**, während der Kiosk bei **12:00**
sperrte: zwei verschiedene Zeiten im selben Haus, und die gepflegte wirkte
an der Stelle gar nicht.

**2. Die Sperre war am falschen Ort.** Der Kiosk erfasst
**ausschließlich telefonische** Bestellungen — im Code fest `quelle: 1`.
Und genau diese Quelle nimmt der Server von seiner Zeitsperre **aus**:

```python
# api/lunch-order/__init__.py
if quelle == QUELLE_ONLINE and datum:
    ...  # Bestellschluss prüfen
```

Der Server erlaubt telefonische Aufnahme also zu jeder Zeit. Nur die
Oberfläche verweigerte sie. Ruft jemand um 12:30 an und die Küche kocht
noch, muss der Laden die Bestellung aufnehmen können — diese Entscheidung
trifft der Mensch am Telefon, nicht die Uhr.

## Anforderungen

- **F1** Der Kiosk liest den Bestellschluss aus dem CMS
  (`bestellschluss_uhr`), statt eine Zeit fest im Code zu führen. Damit
  gilt im ganzen Haus dieselbe Angabe.
- **F2** Die telefonische Erfassung wird **nie** gesperrt — weder der Knopf
  noch der Dialog. Das deckt sich mit dem Server, der telefonische
  Bestellungen ausdrücklich von der Zeitsperre ausnimmt.
- **F3** Nach dem Bestellschluss erscheint ein **Hinweis**: am Knopf als
  Kurzinfo, beim Öffnen als kurze Meldung. Er nennt die Uhrzeit und sagt,
  dass die telefonische Aufnahme weiterhin möglich ist.
- **F4** Ist im CMS nichts gepflegt oder die Angabe nicht lesbar, bleibt
  die Erfassung offen und der Hinweis aus. Eine fehlende Einstellung darf
  den Laden nie blockieren.

## Wo die Zeit eingestellt wird

**CMS → Bestellschluss → „Mittagstisch"** (Feld `bs-cfg-mittag`). Die
Angabe wirkt ab sofort auf:

| Ort | Wirkung |
|---|---|
| Kundenseiten (Startseite, Bestellseite, Tagesinfo) | Bestellung für heute wird gesperrt |
| Server `api/lunch-order` | weist Online-Bestellungen nach der Zeit ab |
| **Kiosk, telefonische Erfassung** | **nur Hinweis, keine Sperre** |

## Testfälle

| Nr. | Fall | Erwartung |
|---|---|---|
| TC-B01 | 12:30 Uhr, Bestellung aufnehmen | wird gesendet, `quelle = 1` |
| TC-B02 | 12:30 Uhr, Knopf „Neue Bestellung" | bedienbar, nicht ausgegraut |
| TC-B03 | 12:30 Uhr, Hinweis am Knopf | nennt „11:00" und „telefonisch" |
| TC-B04 | 9:30 Uhr | kein Hinweis |
| TC-B05 | CMS auf 14:15 gestellt, 14:30 Uhr | Hinweis nennt **14:15** |

Wächter: `tests/kiosk-telefon-name.spec.js`, Block „Bestellschluss bremst
die telefonische Aufnahme nicht".

**Nachweis der Wirksamkeit:** Mit zurückgenommener Änderung scheitern
TC-B01, TC-B02, TC-B03 und TC-B05. TC-B04 besteht — vor dem Bestellschluss
gab es auch vorher keinen Hinweis.

TC-B05 ist der eigentliche Wächter gegen einen Rückfall: Er stellt die
CMS-Zeit auf einen ungewöhnlichen Wert. Bliebe der Hinweis bei 11:00 oder
12:00 stehen, wäre die Zeit wieder fest verdrahtet.

## Angepasster Testfall

`tests/kiosk.spec.js`, **T-17-07** hieß „Button-Zustand passt zur Uhrzeit"
und verlangte nach 12 Uhr einen **gesperrten** Knopf — er schrieb den
gemeldeten Fehler fest. Jetzt prüft er das Gegenteil: Der Knopf bleibt zu
jeder Uhrzeit bedienbar.

## Berührte Dateien

- `static-site/kiosk-klassisch.html` — **Quelle**; `_ladeMittagSchluss()`,
  `_mittagSchlussText()`, `_isMittagCutoff()` und `_updateNewOrderBtn()`.
  `kiosk.html`, `kiosk-neu.html` und `css/kiosk-base.css` werden daraus von
  `tools/build-kiosk-neu.js` erzeugt und **nicht von Hand** geändert.
- `tests/kiosk-telefon-name.spec.js` — Wächter TC-B01 … TC-B05
- `tests/kiosk.spec.js` — T-17-07 auf die neue Absicht gezogen

## Nicht geändert

Die Zeitsperre für **Online**-Bestellungen bleibt unangetastet. Sie ist
richtig: Wer nachts um drei über die Webseite bestellt, soll erfahren, dass
der Bestellschluss vorbei ist. Nur die telefonische Aufnahme im Laden war
zu Unrecht mitbetroffen.
