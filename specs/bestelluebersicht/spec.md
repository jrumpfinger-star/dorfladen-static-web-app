# Meine Bestellungen: Shop und Mittagstisch in zwei Reitern

**Meldung aus dem Laden (27.09.2026):** „Hab Mittagessen bestellt, aber
erscheint nicht in Online-Einkauf. Es wäre auch schön, wenn hier erst
nur die aktuellen Einkäufe von gestern bis in die Zukunft dargestellt
werden würden und in einem weiteren Tab die älteren. Eventuell dann auch
mit einem Badge versehen, wieviele Bestellungen noch offen sind."

## Drei Mängel in einer Meldung

**1. Der Mittagstisch fehlte ganz.** Das Popup holte ausschließlich
`/api/shop-order`. Mittagsbestellungen kommen von `/api/lunch-order` —
sie konnten dort gar nicht erscheinen.

**2. Alles stand in einer Liste.** Im Bildschirmfoto aus dem Laden:
sieben Bestellungen, die älteste vom **29. Juni**, mit Abholterminen aus
Juli — mitten zwischen dem, was morgen ansteht.

**3. Der Zähler war irreführend.** Er nannte **alle** offenen (`status < 3`),
unabhängig vom Datum. Die „7" im Bild bestand fast nur aus Abholungen,
die nie stattgefunden haben.

## Anforderungen

- **U1** Die Übersicht zeigt **beide** Bestellarten.
- **U2** Zwei Reiter: **Aktuell** (ab gestern) und **Früher**.
- **U3** Der Zähler nennt die **offenen der aktuellen**.
- **U4** Der Mittagstisch erscheint auch **ohne Konto** — über die
  Geräte-Kennung.
- **U5** Beide Reiter stehen immer da, auch wenn einer leer ist.

## Warum „gestern" und nicht „heute"

Wer am Morgen nachsieht, hat die gestrige Abholung vielleicht noch nicht
erledigt. Eine Grenze bei „heute" ließe sie über Nacht verschwinden —
genau dann, wenn man sie sucht.

## Warum U4 eigens dasteht

Der Shop verlangt ein Konto, der Mittagstisch nicht: Er findet die
Bestellung auch über die Geräte-Kennung (Spec
`meine-bestellungen-geraete`, F4). Wer ohne Konto ein Mittagessen
bestellt, soll es hier trotzdem sehen — sonst wäre die Übersicht für
genau die Kundschaft leer, für die die Kachel eigens erhalten wurde.

`TC-BU-06` prüft das mitsamt der Gegenrichtung: Ohne Konto wird der
Shop **gar nicht erst** abgefragt.

## Der Zeitraum im Server

`mode=my` lieferte bisher nur **ab heute**. Für den Reiter „Früher"
hätte damit ausgerechnet der Mittagstisch gefehlt.

Neu ist `tage_zurueck` (Standard **0** = ab heute, wie bisher;
Obergrenze **400**). Unsinnige und negative Werte fallen auf 0 zurück —
ein Tippfehler darf keine Zeitreise auslösen. Bei einem Rückblick werden
die **neuesten zuerst** geliefert; sonst stünden bei 20 Treffern die
ältesten da und das Jetzt fehlte.

Die Kachel auf der Startseite ruft **ohne** den Parameter auf und bleibt
damit unverändert.

> **Nebenwirkung, bewusst in Kauf genommen:** Die Seite fragt
> `lunch-order` nun **zweimal** — einmal für die Kachel (ab heute) und
> einmal für diese Übersicht (mit Rückblick). Ein gemeinsamer Aufruf
> hätte die Kachel-Logik ändern müssen, die aus dem Laden ausdrücklich
> erhalten bleiben sollte. `TC-BU-07` prüft deshalb mit `some` über alle
> Aufrufe, nicht am ersten.

## Kein Emoji als Kennzeichen

Zuerst stand ein Teller (`U+1F37D`) vor jeder Mittagsbestellung. Im
Testbrowser erschien er als **leeres Rechteck** — der Zeichensatz kannte
ihn nicht. Jetzt steht dort das Wort **„Mittagstisch"** als kleines
grünes Kennzeichen: überall lesbar, auch für Vorleseprogramme.

## Umsetzung

[static-site/index.html](../../static-site/index.html):

- `_vereinheitlichen()` bringt beide Arten auf ein Format
  (`typ`, `nr`, `tag`, `was`, `summe`, `status`, `offen`).
  Die Bedeutung von „offen" ist je Art verschieden: Shop `status < 3`,
  Mittagstisch `status 0 oder 1` — dort sind 2 (storniert) und 3
  (abgeholt) erledigt.
- `reloadShopOrders()` holt beides, teilt an `_gestern()` und setzt den
  Zähler.
- `dlOrdersTab()` schaltet um, `renderOrdersPopup()` zeichnet.

[api/lunch-order/\_\_init\_\_.py](../../api/lunch-order/__init__.py):
`tage_zurueck` für `mode=my`.

Der Titel heißt jetzt **„Meine Bestellungen"** statt „Online-Einkauf" —
er zeigt beides, und ein Titel, der nur den Shop nennt, wäre irreführend.

## Testfälle

### Anzeige — [tests/bestelluebersicht.spec.js](../../tests/bestelluebersicht.spec.js)

| ID | Prüft | Erwartung |
|----|-------|-----------|
| TC-BU-01 | U1 | der Mittagstisch erscheint — der gemeldete Fall |
| TC-BU-02 | U2 | Aufteilung stimmt: zwei aktuell, zwei früher |
| TC-BU-03 | U3 | der Zähler nennt nur die offenen aktuellen |
| TC-BU-04 | U5 | beide Reiter stehen da, „Aktuell" ist vorgewählt |
| TC-BU-05 | U2 | Umschalten zeigt die älteren — und **nicht** die aktuellen |
| TC-BU-06 | U4 | ohne Konto: Mittagstisch ja, Shop gar nicht erst abgefragt |
| TC-BU-07 | — | mindestens ein Aufruf trägt `tage_zurueck` |
| TC-BU-08 | — | der Titel heißt „Meine Bestellungen" |
| TC-BU-09 | — | Mittagsbestellungen führen auf ihre Statusseite |

### Server — [tests/test_meine_bestellungen.py](../../tests/test_meine_bestellungen.py)

| Prüfung | Erwartung |
|---|---|
| ohne Parameter | bleibt es bei heute — die Kachel ändert sich nicht |
| `tage_zurueck=7` | sieben Tage zurück |
| unsinniger Wert | fällt auf heute zurück |
| negativer Wert | geht **nicht** in die Zukunft |
| `99999` | die Obergrenze von 400 greift |

## Gegenprobe

| Rücknahme | Ergebnis |
|---|---|
| nur `shop-order` holen | **TC-BU-01** fällt |
| Grenze auf „heute" statt „gestern" | **TC-BU-02** fällt, sobald eine Bestellung von gestern dabei ist |
| Zähler wieder über **alle** offenen | **TC-BU-03** fällt |
| Shop auch ohne Konto abfragen | **TC-BU-06** fällt |
| `tage_zurueck` weglassen | **TC-BU-07** fällt, und „Früher" bliebe ohne Mittagstisch |
