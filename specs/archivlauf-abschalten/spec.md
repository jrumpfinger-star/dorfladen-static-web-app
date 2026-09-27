# Der Archivlauf wird abgeschaltet, nicht repariert

> **Entscheidung vom 27.09.2026.** Ein seit Langem bekannter Fehler wird
> **bewusst nicht** behoben — weil seine Behebung mehr Schaden anrichtete
> als der Fehler selbst.

## Was der Lauf tun sollte

`_archive_old_orders()` in
[api/lunch-order/\_\_init\_\_.py](../../api/lunch-order/__init__.py):
Online-Bestellungen älter als 31 Tage zu **Tagessummen** verdichten und
die Detaildatensätze **löschen**. Gedacht als Aufräumen — die Statistik
behält die Zahlen, der Platz wird frei.

## Was er tatsächlich tut: nichts

```python
f"?$filter=dl_quelle eq {QUELLE_ONLINE} and dl_datum lt {cutoff_iso}T00:00:00Z"
```

`dl_datum` ist in Dataverse ein **Textfeld**. Ein Vergleich ohne
Anführungszeichen wird mit **HTTP 400** abgewiesen — und die Schleife
bricht still ab:

```python
if r.status_code != 200:
    break
```

Kein Fehler im Protokoll, kein Hinweis, keine Wirkung. Derselbe Fehler
wie im Sieben-Tage-Rückblick (Spec `mittagstisch-verlauf`, dort behoben).

**Der Lauf hat also noch nie etwas archiviert.**

## Was eine Korrektur heute auslösen würde

Gemessen am 27.09.2026 gegen den echten Bestand:

| Messwert | Zahl |
|---|---|
| Bestellungen im Bestand insgesamt | 278 |
| **davon online und älter als 31 Tage** | **90 — würden gelöscht** |
| betroffene Kundinnen und Kunden | **26** |
| davon **mit Nachrichtenverlauf** | **13** — Text unwiederbringlich weg |
| davon **mit Storno-Grund** | **3** — Text weg |
| Zeitraum | 22.06. bis 26.08.2026 (24 Tage) |

Vom 22.06. bliebe statt 25 Bestellungen nur:

```json
{"total": 25, "0": 22, "1": 2, "3": 1, "menge": 27}
```

Namen, Gerichte, Nachrichten und Stornogründe wären fort. Unwiderruflich
— der Lauf löscht, er verschiebt nicht.

## Warum abschalten statt reparieren

**Der Nutzen wiegt den Verlust nicht auf.** Bei 278 Datensätzen ist Platz
kein Thema. Die Statistik liest die Detaildatensätze ohnehin direkt; das
Archiv ist nur ein Zwischenspeicher für Zeiträume, die nicht mehr da
sind.

**Die Verläufe sind gerade jetzt wertvoll.** Seit Spec
`bestellung-aendern` schreiben Kundinnen aus ihrem Konto heraus zu ihren
Bestellungen. Diese Texte nach einem Monat zu löschen, während man sie
gleichzeitig zum Schreiben einlädt, wäre widersprüchlich.

**Der Fehler hat sich als Glücksfall erwiesen.** Hätte der Filter von
Anfang an funktioniert, wären die 13 Nachrichtenverläufe längst weg —
und niemand hätte es bemerkt.

## Was genau geändert wurde

```python
ARCHIVE_ENABLED = False
```

und gleich zu Beginn von `_archive_old_orders()`:

```python
if not ARCHIVE_ENABLED:
    return archive
```

**Wichtig: `return archive`, nicht `return {}`.** Bereits verdichtete
Tageszahlen werden weiterhin **gelesen** und in der Statistik gezeigt.
Mit einem leeren `dict` wären alte Statistikwerte auf einen Schlag
verschwunden — die Abschaltung hätte selbst Schaden angerichtet
(`TC-AR-03`).

**Der kaputte Filter bleibt stehen.** Wer den Lauf wieder anschalten
will, muss **zwei** Dinge bewusst tun: den Schalter umlegen **und** den
Filter reparieren (`dl_datum lt '<datum>'` mit Anführungszeichen). Der
Schalter allein ändert nichts. `TC-AR-04` hält fest, dass der Filter
unverändert ist — damit niemand den Schalter für eine vollständige
Reparatur hält.

## Falls das Aufräumen doch gewünscht wird

Drei Wege, vom mildesten zum härtesten:

1. **Aufbewahrungsfrist erhöhen** — `ARCHIVE_AFTER_DAYS` auf etwa 365.
   Dann trifft es nur, was wirklich alt ist.
2. **Nur verdichten, nicht löschen** — die Tagessummen schreiben und die
   Detaildatensätze stehen lassen. Erfordert einen Umbau, ist aber der
   einzige Weg ohne Datenverlust.
3. **Wie ursprünglich gedacht** — Filter reparieren, Schalter umlegen.
   Dann sind die 90 Bestellungen weg.

## Testfälle

[tests/test_archivlauf.py](../../tests/test_archivlauf.py)

| ID | Prüft | Erwartung |
|----|-------|-----------|
| TC-AR-01 | — | `ARCHIVE_ENABLED` ist `False` |
| TC-AR-02 | — | **keine** Löschung, und es wird gar nicht erst gesucht |
| TC-AR-03 | — | bereits verdichtete Tageszahlen bleiben lesbar |
| TC-AR-04 | — | der kaputte Filter steht noch dort |
| TC-AR-05 | — | die Begründung steht im Code, nicht nur hier |

**Zum Mock:** Er bildet den kaputten Filter **absichtlich nicht** nach.
Ein Mock, der die 400er-Antwort nachstellt, lieferte denselben Befund
auch dann, wenn die Abschaltung fehlte — und bewiese nichts. Geprüft
wird, dass gar nicht erst gesucht wird.

## Gegenprobe

Nachgestellt: `ARCHIVE_ENABLED = True` gesetzt.

```
FEHLER  TC-AR-01  ARCHIVE_ENABLED ist False  -> war True
FEHLER  TC-AR-02  keine einzige Loeschung
        -> geloescht: ['alt-1', 'alt-2', 'alt-3', 'alt-4', 'alt-5']
```

Alle fünf Testbestellungen werden gelöscht — der Schalter wirkt, und der
Wächter sieht den Unterschied.
