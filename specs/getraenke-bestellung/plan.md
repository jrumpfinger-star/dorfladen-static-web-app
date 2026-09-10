# Getränke-Bestellung — Implementation Plan

Grundlage: [spec.md](./spec.md). Vorbild: `specs/metzger-bestellung/plan.md`.

## Leitentscheidungen

### 1. Kein Bestelltag, sondern ein freier Liefertermin

Bäcker und Metzger haben feste Bestelltage; ihre Tagesleiste bildet einen
Rhythmus ab, den es bei Kratzer nicht gibt (Abstände von 6 bis 26 Wochen).
Eine Leiste über 14 Tage wäre hier fast immer leer und würde etwas suggerieren,
das nicht existiert. Stattdessen ein Datumsfeld; die Kalenderwoche entsteht
daraus und wandert in den Betreff — so, wie der Laden es seit jeher schreibt.

### 2. Ganze Kisten statt Portionsmodell

Der Metzger braucht Portionsblöcke (`2 × 4 St, vakuumiert`), weil dort
Bedientheken-Ware in Stücken bestellt wird. Getränke kommen ausschließlich in
ganzen Kisten. Ein Schrittzähler je Zeile ist die vollständige Erfassung —
alles Weitere wäre Ballast.

### 3. Zwei Namen je Artikel

Rechnung und Bestellmail nennen dieselbe Ware verschieden (`Aho Individual
Sanft Glas 12x0,75` gegen `Adelh. MIWA sanft Glas 0,75l`). Der Rechnungsname
ist genauer, die Bestellschreibweise ist die gewohnte. Deshalb führt jeder
Artikel beide: `name` für die Anzeige, `bestelltext` für die Mail. Bei Kratzer
kommt an, was dort seit Jahren ankommt.

### 4. Vorlage ist die letzte Bestellung, nicht der gleiche Wochentag

Der Metzger-Store sucht `vorlage_bestellung()` nach Wochentag — sinnvoll bei
festen Rhythmen, sinnlos bei unregelmäßigen Bestellungen. Hier ist die Vorlage
schlicht die zuletzt gesendete Bestellung, und sie wird **nicht** automatisch
übernommen, sondern auf Knopfdruck. Grund: Bei sechs Wochen Abstand hat sich
zu viel geändert, als dass eine stille Vorbelegung hilfreich wäre.

### 5. Vorschläge aus Median, nicht aus Lernen

Der Metzger führt eine eigene `metzger_vorschlaege`-Struktur mit Punkten und
Belegen. Bei sieben Bestellungen über zehn Monate trägt so ein Lernverfahren
nicht. Der Median der bisherigen Mengen je Artikel ist stabil, sofort
erklärbar („so viel nehmen wir üblicherweise") und wird beim Seed einmal
berechnet. Ein vierter Dataverse-Schlüssel entfällt damit.

### 6. Kein PDF-Anhang

Der Metzger bekommt ein PDF-Formular, weil dort Portionen, Vakuum und Hinweise
in eine Tabelle müssen. Kratzer bekam bisher reinen Text und kommt damit
zurecht. Ein PDF wäre eine Umstellung beim Empfänger ohne Nutzen für ihn.
Damit entfällt auch `reportlab` als Abhängigkeit dieses Features.

### 7. Preise sind Schätzung, keine Zusage

Die Rechnungen zeigen, dass Kratzer Preise unterjährig anpasst. Der Warenwert
im Formular dient der Größenordnung („liegen wir bei 300 € oder bei 800 €")
und wird deshalb sichtbar als Schätzung ausgewiesen. Ebenso das Pfand: Es
heißt „max.", weil nur berechnet wird, was nicht als Leergut zurückgeht.

## Architektur

```
Getränke/*.eml  ──►  tools/getraenke_katalog_build.py
                          │
                          ├──►  mockups/getraenke-katalog.js        (Mockup)
                          └──►  api/getraenke-order/vorlage/katalog.json
                                        │  Startbestand, falls Dataverse leer
                                        ▼
static-site/js/kiosk-getraenke.js  ◄──►  api/getraenke-order/   ──►  Dataverse
        (window.KGetraenke)              api/getraenke-artikel/       dl_seiteninhalts
                                                 │
                                                 └──►  api/shop-notify (Graph-Mail)
```

### Persistenz

Wie bei Metzger und Bäcker: **keine** neue Tabelle, keine Schemaänderung.
Alles liegt als JSON-String in der bestehenden Dataverse-Entität
`dl_seiteninhalts`.

| Schlüssel | Inhalt |
|-----------|--------|
| `getraenke_artikel` | Artikelkatalog (Liste) |
| `getraenke_config` | Empfänger, Kd-Nr., Tour, Name |
| `getraenke_order_JJJJ-MM-TT` | eine Bestellung je Liefertermin |

Fehlt `getraenke_artikel`, greift `api/getraenke-order/vorlage/katalog.json`.

### Endpunkte

`api/getraenke-order` mit Route `getraenke-order/{datum?}/{aktion?}`:

| Methode | Pfad | Zweck |
|---------|------|-------|
| GET | `/api/getraenke-order` | Übersicht: Config, letzte Bestellung, Vorschlagstermin |
| GET | `/api/getraenke-order?mode=verlauf` | gesendete Bestellungen |
| GET | `/api/getraenke-order/2026-09-14` | Entwurf, Artikel, Vorlage |
| POST | `/api/getraenke-order/2026-09-14/speichern` | Entwurf sichern |
| POST | `/api/getraenke-order/2026-09-14/senden` | Mail versenden, sperren |
| POST | `/api/getraenke-order/2026-09-14/korrektur` | Korrektur nachsenden |
| GET/POST | `/api/getraenke-order/config` | Einstellungen |

`api/getraenke-artikel` (analog `metzger-artikel`):

| Methode | Zweck |
|---------|-------|
| GET | Katalog lesen |
| POST | Artikel anlegen, Dublettenprüfung mit `409` + `trotzdem` |
| PATCH | Ändern, Aus-/Einblenden |

Kein DELETE — Spec F11.3.

### Berechtigung

`shared.auth.admin_auth_guard(req)` wie beim Metzger: GET und OPTIONS offen,
schreibende Aufrufe brauchen den Header `X-CMS-Auth`. Der Kiosk holt das Token
aus `sessionStorage.cmsAuthToken` (Fallback `localStorage`).

### Mailversand

Dynamischer Import von `api/shop-notify/__init__.py` und Aufruf von
`send_email(...)` — genau wie `api/metzger-order/__init__.py._send_mail`.
Ohne Anhang, ohne Shop-Knopf (`mit_shop_link=False`): Kratzer bestellt nicht
in unserem Laden.

## Datenformate

### Artikel

```json
{
  "nummer": "KA40015",
  "name": "Augustiner Hell",
  "bestelltext": "Augustiner hell 0,5l",
  "gebinde": "20x0,50",
  "gruppe": "Bier",
  "preis": 13.75,
  "pfand": 3.10,
  "bestellungen": 7,
  "ueblich": 15,
  "zuletzt": 20,
  "aktiv": true
}
```

- `nummer` ist bei Kratzer **alphanumerisch** (`KA40015`) — anders als beim
  Metzger, wo eine Zahl steht. Der Vergleich läuft deshalb über Zeichenketten.
- `preis` und `nummer` dürfen `null` sein (sechs Artikel ohne Rechnungsbeleg).
- `ueblich` ist der Median der bisherigen Mengen, `zuletzt` die Menge aus der
  jüngsten Bestellung.

### Position

```json
{ "nummer": "KA40015", "name": "Augustiner Hell",
  "bestelltext": "Augustiner hell 0,5l", "gebinde": "20x0,50",
  "gruppe": "Bier", "menge": 20, "preis": 13.75, "zusatz": false }
```

`zusatz: true` kennzeichnet einen einmalig angelegten Artikel (Spec F7.2). Er
wird bei der Vorbelegung der nächsten Bestellung übersprungen — genau wie beim
Bäcker.

### Bestellung

```json
{ "datum": "2026-09-14", "kw": 38, "status": 0,
  "positionen": [ ... ], "protokoll": [ ... ] }
```

`status`: `0` Entwurf, `1` gesendet, `2` korrigiert.

### Mailtext

```
Bestellung für Dorfladen Oberornau KW 38

Guten Tag,

bitte liefern Sie uns zum Montag, den 14.09.2026:

20 Kisten Augustiner hell 0,5l
5 Kisten Tegernseer Hell 0,5l

6 Kisten Adelh. MIWA classic Glas 0,75l

Kd.-Nr. 15554

Mit freundlichen Grüßen
Dorfladen Oberornau
```

Blöcke folgen der Warengruppenreihenfolge und sind durch Leerzeilen getrennt —
so wie die bisherigen Mails aufgebaut sind.

## File Change Map

| Datei | Art | Zweck |
|-------|-----|-------|
| `specs/getraenke-bestellung/spec.md` | neu | Anforderungen |
| `specs/getraenke-bestellung/plan.md` | neu | dieses Dokument |
| `specs/getraenke-bestellung/tasks.md` | neu | Aufgabenliste |
| `tools/getraenke_katalog_build.py` | ändern | schreibt zusätzlich den API-Seed |
| `api/getraenke-order/vorlage/katalog.json` | neu | Startbestand (generiert) |
| `api/getraenke-order/getraenke_store.py` | neu | Dataverse, Config, KW, Katalog |
| `api/getraenke-order/__init__.py` | neu | Endpunkt |
| `api/getraenke-order/function.json` | neu | Route |
| `api/getraenke-artikel/__init__.py` | neu | Artikelpflege |
| `api/getraenke-artikel/function.json` | neu | Route |
| `static-site/js/kiosk-getraenke.js` | neu | Kiosk-Modul `KGetraenke` |
| `static-site/css/kiosk-base.css` | ändern | `gk-`-Block angehängt (kein eigenes Stylesheet: Beide Kiosk-Fassungen laden bereits `kiosk-base.css`, ein weiteres `<link>` in beiden Dateien wäre nur zusätzliche Angriffsfläche) |
| `static-site/kiosk.html` | ändern | Reiter, Panel, `onShow`, Feature-Flag, Neulade-Sperre, Script-Tag |
| `static-site/kiosk-klassisch.html` | ändern | dieselben sechs Änderungen — die klassische Fassung wird mit ausgeliefert |
| `static-site/cms.html` | ändern | Einstellungsmaske |
| `static-site/cms-neu.html` | ändern | dieselbe Maske |
| `static-site/cms-klassisch.html` | ändern | dieselbe Maske, feste Farbwerte statt CSS-Variablen |
| `static-site/cms.js` | ändern | Laden und Speichern der Einstellungen (die drei CMS-Fassungen teilen sich diese Datei) |
| `tests/kiosk-getraenke.spec.js` | neu | Playwright über drei Viewports |

Nicht angefasst: `api/shop-notify` (nur genutzt), `shared/*`, Dataverse-Schema.

## Reihenfolge

1. Seed erzeugen (`katalog.json`) — alles Weitere hängt an den Daten.
2. `getraenke_store.py`, dann `__init__.py` + `function.json`.
3. `getraenke-artikel`.
4. Kiosk-Modul und CSS, portiert aus dem abgenommenen Mockup.
5. Einbindung in `kiosk.html` **und** `kiosk-klassisch.html`.
6. CMS-Maske in allen drei CMS-Fassungen.
7. Playwright-Tests, drei Viewports.

## Risiken

| Risiko | Umgang |
|--------|--------|
| Versehentlicher Versand an Kratzer vor der Freigabe | Empfänger startet leer, `testbetrieb` erzwingt die Testadresse (F13) |
| Preise veralten | sichtbar als Schätzung ausgewiesen (F8.2) |
| Sechs Artikel ohne Nummer | werden geführt und bestellbar; die Nummer ist optional |
| Schreibweise weicht ab und verwirrt Kratzer | `bestelltext` aus den echten Mails, nicht neu erfunden |
| Kiosk lädt neu, während erfasst wird | Reiter blockiert den Neustart wie Bäcker/Metzger |
| Vorschau und versendete Mail laufen auseinander | Der Text entsteht zweimal — im Kiosk für die Vorschau, im Server für den Versand. TC-F9-06 vergleicht beide Zeichen für Zeichen; Wortlaut, Datumsformat und Gruppenreihenfolge sind angeglichen. Wer einen der beiden ändert, muss den anderen mitziehen. |
| Zwei Kiosk- und drei CMS-Fassungen | Alle fünf Dateien werden gepflegt; TC-F12-02 prüft die klassische Kiosk-Fassung mit. |

## Traceability

| Requirement | Umsetzung | Test |
|-------------|-----------|------|
| F1 | `kiosk-getraenke.js` Terminfeld, `getraenke_store.kw()`, `bestellbar()` | TC-F1-01…04 |
| F2 | `katalog.json` Gruppen, `zeile()` | TC-F2-01…04 |
| F3 | Schrittzähler in `zeile()` | TC-F3-01…04 |
| F4 | `ueblich`/`zuletzt` im Seed, Vorschlagsknöpfe | TC-F4-01…03 |
| F5 | `store.letzte_bestellung()`, Knopf „übernehmen" | TC-F5-01…03 |
| F6 | `sichtbar()` | TC-F6-01…04 |
| F7 | `anlegenOeffnen()`, `uebernimmServerartikel()`, `api/getraenke-artikel` POST mit `_hausnummer()` | TC-F7-01…07 |
| F8 | `summen()` | TC-F8-01…03 |
| F9 | `mailtext()` im Kiosk, `_mail_text()` im Server | TC-F9-01…06 |
| F10 | `speichern`/`senden`/`korrektur` | TC-F10-01…03 |
| F11 | `artikelAnsicht()`, PATCH | TC-F11-01…03 |
| F12 | `cms.html`, `cms-neu.html`, `cms-klassisch.html`, `cms.js` | TC-F12-01…02 |
| F13 | `store.testbetrieb()`, `gkcfgHinweis()` | TC-F13-01…03 |
| F14 | CSS, Playwright-Projekte, beide Kiosk-Fassungen | TC-F14-01…04 |
