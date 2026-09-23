# Der Sendezeitpunkt steht in Ladenzeit

## Overview

Aus dem Laden: *„Das gesendete Datum wird falsch angezeigt. Es ist nicht das
Datum, wann gesendet wurde."*

Im Bild: Liefertag Mittwoch 23.09., darunter „Gesendet 22.09. **11:59** Uhr".
Versandt wurde um **13:59**.

## Ursache

**Azure Functions laufen in UTC.** `WEBSITE_TIME_ZONE` ist nicht gesetzt —
geprüft, die Einstellung kommt im ganzen Projekt nicht vor.

Der Server schrieb den Zeitstempel mit `datetime.now()`. Das liefert dort
Weltzeit und schreibt sie **ohne Kennzeichnung** fort:

```
2026-09-22T11:59:00      ← gemeint war 13:59 Ladenzeit
```

Der Browser liest einen solchen String nach ES-Norm als **lokale** Zeit und
zeigt ihn unverändert an. Ergebnis: zwei Stunden zu früh im Sommer, eine im
Winter.

Der zweite Teil der Meldung — *„es ist nicht das Datum"* — hat dieselbe
Wurzel: Ein Versand um 00:30 Ladenzeit steht in UTC als 22:30 des
**Vortags**. Dann stimmt nicht nur die Uhrzeit nicht, sondern der Tag.

### Der Fehler reichte weiter als der Stempel

Betroffen waren **acht** Stellen im Bäcker-Modul, nicht nur die gemeldete:

| Stelle | Folge in der UTC-Lücke (22–24 Uhr) |
|---|---|
| `_senden` – Sendestempel | **gemeldet**: Zeit und Tag falsch |
| `gedruckt_am` – Druckstempel | derselbe Fehler |
| `_bestellbar` | ein gelieferter Tag galt noch als bestellbar |
| `nur_lesen` | ein vergangener Tag blieb bearbeitbar |
| `_letzte_tage`, `uebersicht` | die Tagesleiste begann einen Tag zu früh |
| `naechster_bestelltag` | Vorauswahl auf den falschen Tag |
| Bestellschluss-Warnung | schlug zwei Stunden zu spät an |

## Behebung

### F1: Der Server rechnet in Ladenzeit

- Zwei Helfer in `store.py`: `jetzt_lokal()` und `heute_lokal()`, beide über
  `ZoneInfo("Europe/Berlin")`. Rückfall auf feste +2 Stunden, falls die
  Zeitzonendaten fehlen — im Sommer richtig, im Winter eine Stunde daneben,
  immer noch besser als UTC.
- Alle acht Stellen nutzen sie.
- Der Zeitstempel trägt die Zone **mit**: `2026-09-22T13:59:00+02:00`. Damit
  muss niemand mehr raten.

### F2: Der Kiosk rechnet Altwerte um

Bestehende Stempel tragen keine Zone und sind UTC-Werte. Da ab sofort immer
mit Zone geschrieben wird, ist die Regel eindeutig:

> Fehlt die Zonenangabe, war es Weltzeit.

`zeitKurz()` hängt in diesem Fall ein `Z` an. Ohne diese Brücke bliebe jede
alte Bestellung dauerhaft zwei Stunden zu früh.

## Test Cases

**TC-Z01 … TC-Z08** (`tools/baecker_zeitzone_test.py`, ohne Netz):
Die Helfer liefern Berliner Zeit mit Zone; `heute_lokal()` stimmt mit ihr
überein; der Zeitstempel nennt die Zone; im Modul gibt es **keine** blanken
`now()`/`today()`-Aufrufe mehr. Letzteres wird über den **Syntaxbaum**
geprüft, nicht über den Text — ein Textvergleich schlug auch auf die
Beschreibungen an, in denen `datetime.now()` als das Falsche erwähnt wird.
Der Sucher hat zwei Selbsttests.

**TC-B2-F36-01: Ein Stempel mit Zone behält seine Stunde** — der gemeldete
Fall, 13:59 bleibt 13:59.

**TC-B2-F36-02: Ein Altwert ohne Zone gilt als Weltzeit** — 11:59 wird 13:59.

**TC-B2-F36-03: Nach Mitternacht bleibt der Tag richtig** — der 23. darf
nicht zum 22. werden.

**TC-B2-F36-04: Ein Altwert vor Mitternacht rückt auf den Folgetag** —
22:30 UTC am 22. ist 00:30 am 23.

**TC-B2-F36-05: Ein unlesbarer Stempel stürzt nicht ab.**

Geprüft wird ausschließlich die **sichtbare Anzeige**. Ein erster Entwurf
bildete die Umrechnung im Test nach — der hätte sich selbst geprüft und
jeden Fehler im Kiosk mitgemacht. Die Gegenprobe (Korrektur entfernt) lässt
TC-B2-F36-02 und -04 fehlschlagen; die drei übrigen decken das Sollverhalten
der Server-Seite ab, die der Python-Wächter sichert.

## Erledigt: derselbe Fehler in anderen Modulen

Gemessen über alle API-Module — Aufrufe ohne Zeitzone: **53 Stellen**, jede
einzeln bewertet. **35 waren Fehler und sind behoben**, 18 sind geprüft und
bewusst belassen (Zeitstempel mit `Z`, Stichtage über Wochen, JWT-Felder).

Am ernstesten waren zwei, die hier nicht zu vermuten waren: `auth-register`
schrieb das **SEPA-Mandatsdatum** aus `utcnow()`, und `metzger-order` setzte
das Erstellungsdatum **auf das versendete Bestelldokument**.

Der gemeinsame Helfer steht in `api/shared/zeit.py`; dieses Modul leitet
darauf weiter, damit es nur eine Wahrheit gibt. Einzelheiten und die
vollständige Bewertung: [zeitzone-projektweit](../zeitzone-projektweit/spec.md).

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| [store.py](../../api/baecker-order/store.py) | `jetzt_lokal()`, `heute_lokal()` |
| [\_\_init\_\_.py](../../api/baecker-order/__init__.py) | sieben Fundstellen |
| [kiosk-baecker.js](../../static-site/js/kiosk-baecker.js) | `zeitKurz()` mit Altwert-Brücke |
