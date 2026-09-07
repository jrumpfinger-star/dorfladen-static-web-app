# Zweite Bäckerei (Martin's Backstube) — Implementation Plan

> Derived from `spec.md`. The plan translates *what* (spec) into *how*.
> Do not introduce new behaviour here — if the plan needs a behaviour that is
> not in the spec, go back and update the spec first.

**Spec:** [spec.md](./spec.md)

**Status:** Draft

**Last updated:** 2026-09-07

## Constitution Check

- [x] Spec exists and has no open `[NEEDS CLARIFICATION]` markers
- [x] On-prem compatibility respected (keine cloud-only APIs; `fpdf2` ist reines
      Python ohne Systembibliotheken)
- [x] No secrets introduced into the repo
- [x] Follows existing folder conventions (`api/baecker-*`, `static-site/js/`,
      `tools/`, `tests/`)

## Technical Approach

Der Umbau ist **kein neues Feature neben dem alten**, sondern eine
Verallgemeinerung des bestehenden. Überall dort, wo heute implizit „Freundl"
gemeint ist, tritt ein Parameter `baeckerei` an dessen Stelle.

Drei Bausteine sind wirklich neu:

1. **`pdf_fill.py`** — erzeugt das Bestellformular für Martin's als PDF.
2. **`rechnung_parser.py`** — liest Artikelnummer und Bezeichnung aus einem
   Rechnungs-PDF.
3. **Druckansicht im Browser** — für den Papierausdruck bei Freundl (F23).

Dazu kommt der heikelste Teil: die **Koexistenz von altem und neuem
Speicherschema**.

### Warum eine Lesebrücke nötig ist

Naheliegend wäre: Code ausrollen, danach den Bestand umziehen. Das geht **nicht**
gut, und zwar aus einem konkreten Grund:

Der neue Code liest aus `baecker_order_freundl_2026-09-10`. Vor dem Umzug liegt
die Bestellung aber unter `baecker_order_2026-09-10`. Zwischen Ausrollen und
Umzug sähe der Bäcker-Tab für Freundl also: **leere Historie, leere Vorbelegung,
und statt des gepflegten Katalogs den Startkatalog aus der Datei** (weil
`load_artikel` bei fehlendem Datensatz auf `vorlage/…json` zurückfällt).

Das verletzt F24 unmittelbar („Ist der Umzug noch nicht gelaufen, verhält sich
der Tab wie bisher"). Schlimmer: Wer in diesem Fenster eine Bestellung erfasst,
tut das auf Basis von Nullwerten und schreibt sie unter den **neuen** Schlüssel.
Der spätere Umzug müsste dann entweder diesen Tag überspringen (die schlechte
Bestellung bliebe stehen) oder ihn überschreiben (die gerade gesendete Bestellung
wäre weg). Beides ist inakzeptabel.

**Lösung: eine Lesebrücke in `store.py`.** Fehlt der neue Schlüssel, wird der
alte gelesen. Geschrieben wird **immer** auf den neuen. Damit ist das Zeitfenster
harmlos und der Umzug wird vom kritischen Pfad zur reinen Aufräumarbeit.

### Datenfluss

```
Kiosk (kiosk-baecker.js)
  │  state: { datum, baeckerei }
  ├─ GET  /api/baecker-order?mode=uebersicht      → Tage × Bäckereien
  ├─ GET  /api/baecker-order?baeckerei=…&datum=…  → Bestellung + Vorbelegung
  ├─ GET  /api/baecker-artikel?baeckerei=…        → Katalog
  ├─ POST /api/baecker-order {aktion:'senden'}    → docx_fill | pdf_fill → Mail
  ├─ POST /api/baecker-order {aktion:'gedruckt'}  → gedruckt_am setzen
  └─ window.open + window.print()                 → Papierausdruck (rein clientseitig)

CMS (cms.js)
  └─ GET/POST /api/baecker-order?mode=config      → Einstellungen aller Bäckereien
```

### Warum der Ausdruck clientseitig entsteht

Das an Freundl versendete Dokument ist ein **`.docx`** — der Browser kann es
nicht drucken. Ein zweites Format serverseitig zu erzeugen wäre doppelter
Aufwand und eine zweite Fehlerquelle. Stattdessen baut der Kiosk aus **denselben
Positionsdaten** eine Druckansicht in HTML und ruft `window.print()` auf — genau
das Muster, das `K.printKitchen()` in [kiosk.html](../../static-site/kiosk.html)
bereits verwendet (`window.open('', '_blank')`, HTML schreiben, drucken).

Der Ausdruck ist damit **keine Kopie des Anhangs**, sondern eine zweite
Darstellung derselben Daten. Das ist zulässig (F23 fordert „dieselben
Positionen", nicht „dieselbe Datei") und erspart eine Server-Runde.

**Für den Nachdruck aus dem Verlauf (F23-04) reicht die Verlaufsantwort nicht:**
`_verlauf` liefert heute nur `"positionen": len(pos)` — die Anzahl, nicht die
Zeilen. Der Kiosk holt die zu druckende Bestellung deshalb per
`GET ?baeckerei=…&datum=…` nach. Die Verlaufsantwort aufzublähen (60 Einträge ×
~30 Positionen) wäre der falsche Weg für einen selten genutzten Knopf.

## Key Decisions

| Entscheidung | Erwogen | Wahl & Begründung |
| --- | --- | --- |
| **PDF-Erzeugung** | `reportlab`, `fpdf2`, PDF von Hand mit stdlib, DOCX statt PDF | **`fpdf2`** — reines Python, keine Systembibliotheken (wichtig für den Linux-Consumption-Plan), erzeugtes Formular 2 KB. Praktisch erprobt, siehe „Erprobung" unten. PDF von Hand wäre dependency-frei, aber ein fehleranfälliger Eigenbau für ein gelöstes Problem. |
| **Zeichensatz im PDF** | Kernschrift (Latin-1) vs. eingebettete Unicode-TTF | **Kernschrift + Bereinigung.** Umlaute und ß liegen in Latin-1 und funktionieren; nur Sonderzeichen wie „–" oder „…" nicht. Eine TTF einzubetten kostet ~750 KB im Repo für einen Nutzen, den kein Artikelname braucht. Der Bereiniger ersetzt die Handvoll bekannter Zeichen und fällt sonst auf `?` zurück — **nie** ein Absturz beim Senden. |
| **Speicherschlüssel** | Ein Datensatz mit Bäckerei-Feld vs. getrennte Schlüssel | **Getrennte Schlüssel** (`baecker_order_martins_2026-09-12`). `read_many` filtert über das Schlüssel-Präfix; ein gemeinsamer Datensatz würde jede Abfrage über beide Bäckereien ziehen. |
| **Bestandsübernahme** | Beim ersten Zugriff automatisch vs. eigener Lauf | **Eigener Lauf mit Testmodus.** Eine Migration, die nebenbei im Request passiert, ist bei parallelen Zugriffen nicht beherrschbar und im Fehlerfall nicht nachvollziehbar. |
| **Rechnungs-Parser** | In der Function vs. eigenes Modul | **Eigenes Modul ohne Azure-Bezug**, testbar mit den 11 vorliegenden Rechnungen (wie `tools/baecker_logik_test.py`). |
| **PDF-Text auslesen** | `pypdf`, `pdfplumber` | **`pypdf`** — bereits als Werkzeug im Einsatz, reines Python. |
| **Ausdruck** | Server-PDF vs. Browser-Druckansicht | **Browser** (Begründung oben). |
| **Bäckerei-Kennungen** | Freitext vs. feste Kürzel | **Feste Kürzel** `freundl`, `martins` — sie stehen in Speicherschlüsseln und dürfen sich nie ändern. Der **Anzeigename** ist davon getrennt und im CMS frei änderbar. |

### Erprobung der PDF-Erzeugung (vorab durchgeführt)

Ein Musterformular wurde mit `fpdf2` 2.8.7 tatsächlich erzeugt:

- Ergebnis: **2.132 Bytes**, eine A4-Seite, Kopf + Tabelle + Fußzeile.
- Umlaute überstehen den Weg (Rückprobe mit `pypdf`: „Kümmel", „Käse", „Stück"
  wieder auslesbar).
- **Gefundener Stolperstein:** Mit der Kernschrift Helvetica bricht `fpdf2` bei
  Zeichen außerhalb von Latin-1 mit `FPDFUnicodeEncodingException` ab — beim
  Gedankenstrich „–" (U+2013) sofort reproduziert. Ohne Bereinigung würde ein
  einziges Sonderzeichen in einem Artikelnamen den **Versand scheitern lassen**.
  Daraus folgt die Aufgabe „Zeichen bereinigen" mit eigenem Test.

## Architecture

```
api/
├── baecker-order/
│   ├── __init__.py          ← baeckerei-Parameter, aktion 'gedruckt'
│   ├── store.py             ← Schlüssel je Bäckerei, Config je Bäckerei
│   ├── docx_fill.py         ← unverändert (Freundl)
│   ├── pdf_fill.py          ← NEU: Formular für Martin's
│   └── vorlage/
│       ├── freundl-*.docx   ← unverändert
│       ├── katalog.json     ← wird zu katalog-freundl.json
│       └── katalog-martins.json  ← NEU
├── baecker-artikel/
│   ├── __init__.py          ← baeckerei-Parameter, aktion 'rechnung'
│   └── rechnung_parser.py   ← NEU: Rechnungs-PDF → Artikel
└── baecker-migration/       ← NEU: einmalige Bestandsübernahme
    └── __init__.py

static-site/
├── js/kiosk-baecker.js      ← _baeckerei im Zustand, Reiterzeile, Druckansicht
├── kiosk.html               ← CSS .bk-btabs, Druck-Stile
└── cms.js / cms.html        ← Bäckerei-Auswahl in der Einstellungskarte

tools/
├── baecker_rechnung_test.py ← NEU: Parser gegen die 11 Rechnungen
└── baecker_migration_test.py← NEU: Übernahme im Testmodus

tests/
└── kiosk-baecker-zwei.spec.js ← NEU: TC-B2-F17…F26
```

### Kern der Umstellung: `store.py`

Heute:

```python
KEY_ARTIKEL = "baecker_artikel"
KEY_ORDER   = "baecker_order_"
def order_key(datum_iso):   return f"{KEY_ORDER}{datum_iso}"
```

Künftig:

```python
BAECKEREIEN = ("freundl", "martins")
ALT_BAECKEREI = "freundl"          # der Bestand gehoert Freundl

def artikel_key_store(bk):        return f"baecker_artikel_{bk}"
def order_key(bk, datum_iso):     return f"baecker_order_{bk}_{datum_iso}"
def order_praefix(bk):            return f"baecker_order_{bk}_"
```

Beim Lesen einer **einzelnen** Bestellung greift die Lesebrücke:

```python
def load_order(url, hdrs, bk, datum_iso):
    rec_id, data = read_json(url, hdrs, order_key(bk, datum_iso))
    if data or bk != ALT_BAECKEREI:
        return rec_id, data
    # Noch nicht umgezogen: aus dem Altschluessel lesen.
    # Geschrieben wird trotzdem immer auf den neuen -> rec_id bewusst None.
    _, alt = read_json(url, hdrs, f"baecker_order_{datum_iso}")
    return None, alt
```

Dasselbe Muster für `load_artikel`. **Geschrieben wird ausschließlich auf den
neuen Schlüssel** — der Altbestand bleibt unangetastet und damit als Rückfall
erhalten.

`cfg` wird von einem flachen Objekt zu:

```python
{
  "baeckereien": {
    "freundl": { "name": "Bäckerei Freundl", "empfaenger": …, "bestelltage": [2,3,4,5],
                 "format": "docx", "papierausdruck": True, … },
    "martins": { "name": "Martin's Backstube", "bestelltage": [0,1,5],
                 "format": "pdf",  "papierausdruck": False, … }
  }
}
```

Fehlt `baeckereien` (alter Datensatz), baut `load_config` den Eintrag `freundl`
aus dem flachen Objekt auf und ergänzt `martins` aus den Vorgabewerten — dieselbe
Lesebrücke wie bei Katalog und Bestellungen.

Alle vorhandenen Helfer (`ist_bestelltag`, `naechster_bestelltag`, `tour_nr`,
`korrektur_moeglich`) erhalten die Bäckerei-Konfiguration statt der globalen —
ihre **Logik bleibt unverändert**, nur die Herkunft der Werte ändert sich.

### Die Präfix-Falle

`baecker_order_` ist ein **Präfix von** `baecker_order_freundl_`. Ein
stehengebliebenes `read_many(url, hdrs, KEY_ORDER)` liefert künftig also
**beide** Bäckereien *und* die Altschlüssel. Die Folgen wären still und übel:
`nummer_umziehen` würde eine Freundl-Nummernänderung auch in Martin's-Bestellungen
schreiben, der Verlauf zählte in der Koexistenzphase jeden Tag doppelt.

Die drei betroffenen Aufrufstellen — `store.vorlage_bestellungen`,
`store.nummer_umziehen` und `_verlauf` in `__init__.py` — bekommen deshalb
**keine** eigene Präfixlogik, sondern rufen alle **eine** neue Funktion auf:

```python
def bestellungen(url, hdrs, bk):
    """Alle Bestellungen einer Baeckerei, neue vor alten Schluesseln.

    Liest den gemeinsamen Praefix EINMAL und ordnet ueber die Schluesselform zu:
        baecker_order_2026-09-10           -> alt, gehoert freundl
        baecker_order_freundl_2026-09-10   -> neu
    Existiert ein Tag doppelt, gewinnt der neue Schluessel.
    """
```

Damit ist die Trennung an genau **einer** Stelle festgelegt statt an dreien, und
die Lesebrücke aus dem vorigen Abschnitt sitzt gleich mit darin.

### Tagesleiste über beide Bäckereien

`_uebersicht()` liefert heute je Tag ein Objekt. Künftig je Tag eine Liste:

```json
{ "datum": "2026-09-12", "wochentag": "Samstag",
  "lieferanten": [
    { "baeckerei": "martins", "status": "offen" },
    { "baeckerei": "freundl", "status": "gesendet", "gedruckt": true }
  ] }
```

Daraus ergeben sich Punkte, „1 von 2" und der Tab-Zähler ohne weitere Abfragen.

## File-Level Change Map

| Pfad | Änderung | Zweck | Anforderung |
| --- | --- | --- | --- |
| `api/baecker-order/store.py` (277 Z.) | edit | Schlüssel je Bäckerei, **Lesebrücke** alt→neu, `store.bestellungen(bk)` als einzige Präfix-Stelle, `cfg`-Struktur, Helfer auf Bäckerei-Config | F17, F24 |
| `api/baecker-order/__init__.py` (378 Z.) | edit | `baeckerei` aus Query/Rumpf lesen und prüfen; `_uebersicht` über beide; `_verlauf` auf `store.bestellungen`; Formatweiche docx/pdf; `aktion:'gedruckt'` | F17, F18, F20, F23 |
| `api/baecker-order/pdf_fill.py` | **new** | Bestellformular für Martin's (A4, Kopf, Tabelle, Fußzeile) inkl. Zeichenbereinigung | F20 |
| `api/baecker-order/vorlage/katalog-martins.json` | **new** | Startkatalog, 48 Artikel, nie bestellte auf `aktiv:false` | F21 |
| `api/baecker-order/vorlage/katalog.json` | rename | → `katalog-freundl.json` | F17 |
| `api/baecker-artikel/__init__.py` (196 Z.) | edit | `baeckerei` in GET/POST/PATCH; Dublettenprüfung je Bäckerei; `aktion:'rechnung'` | F17, F21, F22 |
| `api/baecker-artikel/rechnung_parser.py` | **new** | PDF → `[{nummer, name, liefer, retour}]`, mehrzeilige Positionen | F22 |
| `api/baecker-migration/__init__.py` | **new** | Bestandsübernahme mit `?modus=test\|echt`, paginierend, überspringt bereits umgezogene Tage | F24 |
| `api/baecker-migration/function.json` | **new** | Route + Admin-Auth | F24 |
| `api/requirements.txt` | edit | `fpdf2`, `pypdf` ergänzen | F20, F22 |
| `static-site/js/kiosk-baecker.js` (984 Z.) | edit | `_baeckerei` im Zustand, Reiterzeile, Bäckerei je Tag, Druckansicht (inkl. Nachladen der Positionen beim Nachdruck), Rechnungs-Import | F18, F19, F22, F23 |
| `static-site/kiosk.html` | edit | CSS `.bk-btabs`, Tagespunkte, Zustand „Ausdruck fehlt"; Reiterzeile in `.bk-sticky` | F19, F23, F26 |
| `static-site/cms.html` | edit | Bäckerei-Auswahl + Felder `format`, `papierausdruck` in der Karte | F25 |
| `static-site/cms.js` | edit | Laden/Speichern je Bäckerei; Testbetrieb-Hinweis je Bäckerei | F25 |
| `tools/baecker_rechnung_test.py` | **new** | Parser gegen die 11 vorliegenden Rechnungen | F22 |
| `tools/baecker_migration_test.py` | **new** | Übernahme prüfen (Zahlen vorher/nachher) | F24 |
| `tools/baecker_pdf_test.py` | **new** | PDF erzeugen, mit `pypdf` zurücklesen, Umlaute prüfen | F20 |
| `tests/kiosk-baecker-zwei.spec.js` | **new** | TC-B2-F17…F26 mit gemockter API | alle |
| `tests/kiosk-baecker.spec.js` (697 Z.) | edit | Mock um `baeckerei` erweitern — bestehende 156 Tests müssen grün bleiben | Regression |
| `tests/TESTCASES.md` | edit | Abschnitt T-B2 mit Ergebnissen füllen | — |
| `specs/baecker-bestellung/spec.md` | edit | Querverweis auf die Erweiterung | — |

## Test Strategy

### Ohne Azure (schnell, in jedem Lauf)

- **`tools/baecker_rechnung_test.py`** — Parser gegen alle 11 Rechnungen.
  Erwartung: 39 Artikel inkl. der mehrzeiligen Nr. 104; die vier nur dort
  belegten (104, 186, 192, 242) werden gefunden.
  Deckt **TC-B2-F22-01, -02, -04**.
- **`tools/baecker_pdf_test.py`** — Formular erzeugen, mit `pypdf` zurücklesen.
  Prüft Kd.-Nr. 1015, Datum, Sortierung, Umlaute **und** einen Artikelnamen mit
  Nicht-Latin-1-Zeichen (der Bereiniger darf nicht abstürzen).
  Deckt **TC-B2-F20-01…03**.
- **`tools/baecker_migration_test.py`** — zwei Dinge, nicht nur eines:
  1. **Lesebrücke:** Neuer Code gegen einen **un-migrierten** Bestand. Verlauf,
     Vorbelegung und Katalog müssen identisch zum Altverhalten sein. Das ist der
     Test, der F24 „verhält sich wie bisher" tatsächlich absichert — ohne ihn
     bliebe die Brücke eine Behauptung.
  2. **Umzug:** Zahl der Bestellungen und Positionen vorher/nachher, zweiter Lauf
     folgenlos, Abbruch statt stillem Abschneiden bei erreichter Lesegrenze.

  Deckt **TC-B2-F24-01…04**.
- **`tools/baecker_logik_test.py`** (vorhanden) — um Bestelltage je Bäckerei und
  die Samstags-Überschneidung erweitern. Deckt **TC-B2-F18-01…03**.

### Playwright mit gemockter API

`tests/kiosk-baecker-zwei.spec.js`, drei Auflösungen, `serviceWorkers: 'block'`.
Der Mock ist **eine** Route und antwortet je nach `baeckerei` unterschiedlich —
so wird die Trennung tatsächlich geprüft und nicht nur behauptet.

Deckt **TC-B2-F17-02/03, F19-01…05, F21-01…04, F22-05/06, F23-01…06, F25-01…04,
F26-01…04**.

### Regression

Die 156 bestehenden Tests in `tests/kiosk-baecker.spec.js` müssen **grün
bleiben**. Sie sind die Absicherung dafür, dass die Freundl-Bestellung durch die
Verallgemeinerung nicht beschädigt wird.

### Mapping-Lücken

`TC-B2-F17-01` (gleiche Nummer, verschiedene Artikel) und `TC-B2-F17-04`
(fehlende Bäckerei wird abgelehnt) prüfen Serververhalten und werden über
direkte API-Aufrufe in der Playwright-Suite abgedeckt (`request`-Fixture, gegen
die Testumgebung).

## Risks & Mitigations

| Risiko | Auswirkung | Gegenmaßnahme |
| --- | --- | --- |
| **Bestandsübernahme verliert den Artikelbezug** | **hoch** — Vorbelegung startet bei 0, Verlauf wirkt leer. Genau dieser Fehler ist beim Ändern einer Artikelnummer schon passiert | Lesebrücke macht den Betrieb vom Umzug unabhängig; Testmodus zuerst; Zahlen vorher/nachher vergleichen; Altschlüssel bleiben bis zur Freigabe stehen |
| **Bestellung im Fenster zwischen Live-Gang und Umzug** | **hoch** — ohne Lesebrücke entstünde sie aus Nullwerten und der Umzug müsste sie entweder überschreiben (Verlust) oder überspringen (schlechte Bestellung bleibt) | Lesebrücke: gelesen wird alt, geschrieben neu. Der Umzug überspringt Tage, die neu bereits existieren — dann ist der neue Stand der gültige |
| **Präfix-Kollision `baecker_order_`** | **hoch** — `nummer_umziehen` schriebe quer über Bäckereien, der Verlauf zählte doppelt | Genau **eine** Funktion `store.bestellungen(bk)` für alle drei Aufrufstellen; Zuordnung über die Schlüsselform, nicht über den Präfix allein |
| **Sonderzeichen im Artikelnamen sprengen das PDF** | hoch — Versand scheitert im Moment des Absendens | Bereiniger mit Rückfall auf `?`; eigener Test mit einem Namen voller Sonderzeichen. Bereits vorab reproduziert |
| **`baeckerei` an einer Stelle vergessen** | hoch — stillschweigend die falsche Bäckerei | Server **lehnt ab** statt Freundl anzunehmen (F17). Möglich, weil Kiosk und API gemeinsam ausgeliefert werden |
| **Umzug liest wegen `top=400` nicht alles** | hoch, aber erst später — heute ~19 Bestellungen | Der Umzug **paginiert** oder bricht hart ab, wenn er die Kappe erreicht. Niemals stillschweigend abschneiden. Der Testlauf zählt vorher/nachher und schlägt bei Abweichung an |
| **Zwei Reiterzeilen übereinander verwirren** | mittel | Bäckerei-Reiter farbig unterlegt und nur an Samstagen sichtbar; im Mockup bestätigt |
| **Klebender Kopf verdeckt auf kleinen Schirmen die Zeilen** | mittel — auf 375×667 bereits einmal aufgetreten, Klicks wurden abgefangen | Reiterzeile in denselben `@media (min-width:900px) and (min-height:620px)`-Block wie `.bk-sticky`; `TC-B2-F26-03` |
| **`fpdf2` bricht die Function beim Deploy** | mittel | Reines Python-Wheel, keine Systembibliotheken; vorab lokal installiert und erprobt. Erster Deploy auf die Testumgebung, nicht auf Produktion |
| **Altes CMS gegen neue Config-Struktur** | niedrig — nur Admin, kurzes Fenster | Entfällt, weil CMS und API gemeinsam ausgeliefert werden |
| **Rechnungslayout ändert sich** | niedrig | Parser meldet „keine Artikel gelesen" statt still nichts zu tun (`TC-B2-F22-05`); Katalog bleibt unberührt |
| **`read_many` liest nur 400 Datensätze** | niedrig, aber wachsend | `read_many(..., top=400)` in [store.py](../../api/baecker-order/store.py). Bei ~200 Bestellungen je Bäckerei und Jahr ist die Grenze in ein bis zwei Jahren erreicht. Die Aufteilung nach Bäckerei entschärft das, hebt es aber nicht auf. Bei der Gelegenheit prüfen, ob eine Datumsgrenze das bessere Mittel ist |
| **Zwei parallele Zweige an denselben Dateien** | mittel — am Mittagstisch-Bestellschluss wird gerade gearbeitet | Berührt `kiosk.html` und `cms.js`; vor dem Start rebasen und die Testfall-Übersicht zusammenführen |

## Rollout

**Wichtig vorweg:** Der SWA-Workflow liefert `static-site` **und** `api` in
*einem* Lauf aus (`app_location: "static-site"`, `api_location: "api"` in
[azure-static-web-apps-kind-pebble-072605b03.yml](../../.github/workflows/azure-static-web-apps-kind-pebble-072605b03.yml)).
Server und Kiosk lassen sich also **nicht** nacheinander ausrollen — sie gehen
immer gemeinsam live. Ein Fenster „neuer Server, alter Kiosk" gibt es nicht;
die strenge Ablehnung eines fehlenden `baeckerei` (F17) ist damit unproblematisch.

1. **Reihenfolge der Umsetzung** (nicht der Auslieferung): `store.py` inklusive
   Lesebrücke → `__init__.py` → `pdf_fill.py` → Kiosk → CMS. Ausgeliefert wird
   erst, wenn alles zusammen grün ist.
2. **Erst auf die Testumgebung**, dort die volle Suite fahren — auch die 156
   bestehenden Freundl-Tests.
3. **Live-Gang ohne Migration.** Dank der Lesebrücke arbeitet der Tab mit dem
   Altbestand weiter, als wäre nichts geschehen. Das ist der eigentliche Grund
   für die Brücke: Der Live-Gang braucht kein Zeitfenster, in dem niemand
   bestellen darf.
4. **Bestandsübernahme später und bewusst** — erst im Testmodus, Zahlen prüfen,
   dann echt. Sie ist ab jetzt reine Aufräumarbeit: Sie verschiebt Daten, von
   denen der Betrieb nicht mehr abhängt.
5. **Altschlüssel entfernen** erst nach ausdrücklicher Freigabe und einigen Tagen
   Beobachtung. Danach kann die Lesebrücke samt Sonderfall aus `store.py`
   verschwinden — sonst schleppt sie sich für immer mit.
6. **Empfänger bleibt** auf der Testadresse, bis der Nutzer ausdrücklich
   freigibt — für **beide** Bäckereien. Die Bestelladresse von Martin's ist im
   vorliegenden Material ohnehin nicht belegt (die Rechnungen kommen von
   `rechnung@martins-backstube.de`, das ist keine Bestelladresse).
7. **Live-Prüfung** nach dem Ausrollen: volle Suite gegen
   `kind-pebble-072605b03.7.azurestaticapps.net`, alle drei Auflösungen.

Keine neuen App-Einstellungen, keine neuen Secrets. Neu in
`api/requirements.txt`: `fpdf2`, `pypdf`.

## Offene Punkte für `/sdd-tasks`

- Die **Bestelladresse von Martin's** ist unbekannt. Für die Umsetzung
  unerheblich (Testbetrieb), vor der Scharfschaltung aber zu klären.
- Ob der Papierausdruck **Retourenspalte** enthalten soll, ist in F23 nicht
  ausdrücklich geregelt. Vorschlag: ja, identisch zum Anhang — beim Aufräumen
  der Retouren ist das Blatt sonst nur halb nützlich.
- Die **Lesebrücke** ist bewusst befristet. In `tasks.md` gehört eine Aufgabe
  „Altschlüssel entfernen und Brücke zurückbauen" als letzter Schritt hinein,
  sonst bleibt sie auf Dauer stehen und niemand traut sich später noch, sie
  anzufassen.

## Änderungshistorie

| Datum | Änderung |
| --- | --- |
| 2026-09-07 | Erstfassung |
| 2026-09-07 | Nach Gegenlesen überarbeitet: **Lesebrücke** statt „Migration danach" (der Tab hätte sonst zwischen Live-Gang und Umzug mit leerem Verlauf und Startkatalog dagestanden); **Präfix-Falle** `baecker_order_` ⊂ `baecker_order_freundl_` erkannt und auf eine einzige Zuordnungsfunktion gebündelt; Rollout korrigiert, da der SWA-Workflow API und Kiosk **gemeinsam** ausliefert; Nachladen der Positionen für den Nachdruck ergänzt (`_verlauf` liefert nur Anzahl); Paginierung des Umzugs wegen `top=400` |
