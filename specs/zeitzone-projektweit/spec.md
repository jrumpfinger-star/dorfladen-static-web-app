# Zeitangaben projektweit in Ladenzeit

## Overview

Beim Sendestempel der Bäckerei gemeldet: *„Das gesendete Datum wird falsch
angezeigt."* Die Untersuchung zeigte, dass derselbe Fehler in **20 Modulen**
steckte. Dieser Abschnitt behandelt die Bereinigung des gesamten Bestands.

**Azure Functions laufen in UTC.** `WEBSITE_TIME_ZONE` ist nicht gesetzt —
nachgesehen, die Einstellung kommt im ganzen Projekt nicht vor.

## Die drei Fehlerbilder

1. **Zwei Stunden zu früh** (im Winter eine). Trifft jede angezeigte Zeit.
2. **Der falsche Tag.** Zwischen 22 Uhr und Mitternacht steht in UTC noch der
   Vortag. Dann galt ein gelieferter Tag als bestellbar, eine Tagesleiste
   begann zu früh, ein SEPA-Mandat trug das falsche Datum.
3. **Ein Zeitstempel ohne Zonenangabe.** Der Browser liest ihn nach ES-Norm
   als *lokale* Zeit — die Verschiebung fällt erst in der Anzeige auf und ist
   dort nicht mehr zu reparieren.

Ein viertes, kleineres Bild: An acht Stellen stand
`utcnow() + timedelta(hours=2)` als Näherung. Das ist im Sommer richtig und
**im Winter eine Stunde daneben**. `ZoneInfo` kennt die Umstellung.

## Die Bestandsaufnahme

**53 Stellen** gefunden, jede einzeln bewertet: **35 Fehler, 18 harmlos.**

### Behoben (35)

| Grund | Stellen | Module |
|---|---|---|
| Tagesgrenze | 13 | baecker-artikel, getraenke-order, kalender, metzger-order, shop-admin, shop-articles, lunch-order |
| Näherung +2 h | 8 | fleisch-order, shop-order, lunch-order |
| Sendestempel | 2 | metzger-order, getraenke-order |
| Zeitstempel ohne Zone | 4 | kalender, preisliste, roterpunkt |
| Datum auf Dokument/Nummer | 3 | metzger-order, lunch-order, auth-register |
| SEPA-Mandatsdatum | 2 | auth-register |
| Wochengrenze | 1 | wochenplan |
| bestellbar / nur_lesen | 2 | metzger-order, getraenke-order |

Besonders ernst waren zwei:

- **`auth-register`** schrieb das **SEPA-Mandatsdatum** aus `utcnow()`. Ein
  Mandat, das abends nach 22 Uhr erteilt wird, trug den Vortag — bei einem
  rechtlich bindenden Dokument.
- **`metzger-order`** setzte das Erstellungsdatum **auf das versendete
  Bestelldokument**. Der Metzger bekam ein Blatt mit falscher Uhrzeit.

### Geprüft und bewusst belassen (18)

| Grund | Stellen |
|---|---|
| Zeitstempel trägt ausdrücklich ein `Z` | 7 |
| Stichtag über Wochen/Monate, Stunden unerheblich | 5 |
| JWT-Felder — die Norm (RFC 7519) schreibt UTC vor | 2 |
| Ablauffrist, nur mit sich selbst verglichen | 2 |
| Differenz in ganzen Tagen | 1 |
| nur ein Dateiname | 1 |

## F1: Ein gemeinsamer Helfer

`api/shared/zeit.py` mit fünf Funktionen:

| Funktion | Zweck |
|---|---|
| `jetzt_lokal()` | Zeitpunkt im Laden, **mit** Zone |
| `heute_lokal()` | Kalendertag im Laden |
| `heute_iso()` | derselbe als `JJJJ-MM-TT` |
| `stempel_lokal()` | `2026-09-22T13:59:00+02:00` — für die Anzeige |
| `stempel_utc()` | `2026-09-22T11:59:00Z` — für die Ablage |

Rückfall auf feste +2 Stunden nur, falls die Zeitzonendaten fehlen. Auf einer
vollständigen Laufzeit greift dieser Zweig nie.

**Eine Wahrheit:** `baecker-order/store.py` und `lunch-order` hatten eigene
Fassungen; beide leiten jetzt auf den gemeinsamen Helfer weiter. Ihre Namen
bleiben, weil bestehende Aufrufe und Wächter sie verwenden.

## F2: Der Kiosk rechnet Altwerte um

Bestehende Stempel tragen keine Zone und sind UTC-Werte. Da ab sofort immer
mit Zone geschrieben wird, ist die Regel eindeutig:

> Fehlt die Zonenangabe, war es Weltzeit.

Umgesetzt in `zeitKurz()` des Bäcker-Moduls (siehe
[baecker-sendezeitpunkt](../baecker-sendezeitpunkt/spec.md)).

## Test Cases

**TC-TZ-01: Der Sucher arbeitet richtig** — fünf Selbsttests: erkennt
`now()`, `today()`, `utcnow()`; lässt `now(tz)` durch; schlägt nicht auf
Text in Zeichenketten an.

**TC-TZ-02: Kein ungeprüftes Modul nutzt blanke Zeitaufrufe** — geprüft über
den **Syntaxbaum**, nicht über den Text. Die 18 Ausnahmen stehen als Liste
mit Begründung im Wächter; kommt eine neue Stelle hinzu, fällt er.

**TC-TZ-03: Alle 18 Ausnahmen sind noch vorhanden** — die Gegenrichtung.
Verschwindet eine, ist die Liste veraltet.

**TC-TZ-04: Der gemeinsame Helfer liefert Ladenzeit** — Zone gesetzt,
Versatz +1 oder +2, die vier Ableitungen stimmen überein.

**TC-TZ-05: Beide Stempel meinen denselben Augenblick** — `stempel_lokal()`
und `stempel_utc()` dürfen nicht auseinanderlaufen.

**TC-TZ-06: Die Bestellmodule nutzen den Helfer** — Bäcker, Metzger,
Getränke, Mittagstisch.

## Wo der Wächter absichtlich nicht hinschaut

Er prüft **Struktur**, nicht Verhalten: ob irgendwo wieder ein blanker
Zeitaufruf auftaucht. Ob eine einzelne Stelle fachlich richtig rechnet,
prüfen die Wächter der jeweiligen Module — beim Bäcker etwa
`baecker_zeitzone_test.py` und die fünf Playwright-Fälle TC-B2-F36-01…05.

Ein Strukturwächter hat eine Schwäche: Er merkt nicht, wenn jemand
`jetzt_lokal()` an der falschen Stelle verwendet. Dafür fängt er zuverlässig
den Rückfall, und genau der war hier das Problem — der Fehler hat sich über
20 Module verteilt, weil niemand ihn bemerken konnte.

## Betroffene Dateien

Neu: [shared/zeit.py](../../api/shared/zeit.py),
[tools/zeitzone_test.py](../../tools/zeitzone_test.py).

Geändert: 15 Module (`auth-register`, `baecker-artikel`, `baecker-order`,
`fleisch-order`, `getraenke-order`, `kalender`, `lunch-order`,
`metzger-order`, `preisliste`, `roterpunkt`, `shop-admin`, `shop-articles`,
`shop-order`, `wochenplan`).
