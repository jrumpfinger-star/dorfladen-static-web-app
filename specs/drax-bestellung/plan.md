# Drax-Bestellung — Implementation Plan

> SDD-Stufe 2. Grundlage: [spec.md](./spec.md). Kein Code in diesem Dokument.

**Status:** Draft · **Last updated:** 2026-10-07

## Leitentscheidungen

1. **Kein neues Dataverse-Schema.** Wie bei Bäcker und Metzger liegt alles als
   JSON im generischen Schlüssel-/Wert-Speicher `dl_seiteninhalts`.

   | Schlüssel | Inhalt |
   | --- | --- |
   | `drax_artikel` | Artikelkatalog (96 Artikel) |
   | `drax_config` | Einstellungen (Empfänger, KDNr, Liefertag, Bestellschluss) |
   | `drax_order_JJJJ-MM-TT` | eine Bestellung je Liefertag |

2. **Startbestand aus den Vorlagen.** Fehlt ein Schlüssel in Dataverse, liefert
   der Server den Inhalt aus `api/drax-order/vorlage/*.json`. Der Kiosk ist
   dadurch ab dem ersten Aufruf brauchbar, auch ohne Seed-Lauf. Die vier
   Vorlagedateien sind bereits erzeugt (F2, F9, F10).

3. **Ein Lieferant, kein Parameter.** Anders als beim Bäcker (Freundl /
   Martin's) gibt es nur die Drax Mühle. Der Schlüssel trägt daher **keinen**
   Lieferantenteil — das vermeidet die Präfix-Fallstricke, die `drax_store.py` des
   Bäckers mit `baecker_order_` zu tragen hat.

4. **Anhang als PDF mit `fpdf2`.** Es gibt keine Word-Vorlage, nur das Foto des
   Papierblatts (`Drax/WhatsApp Image 2026-10-06 at 15.00.20.jpeg`). Das
   Formular wird deshalb neu gesetzt, nach dem Muster von
   `api/baecker-order/formular_pdf.py` — gleiche Bibliothek, gleiche
   Latin-1-Absicherung, aber **vier eigene Spalten**: Stück · Einheit ·
   Art. Nr · Artikelbezeichnung (F5).

5. **Mailversand über `shop-notify.send_email`**, exakt wie beim Bäcker,
   inklusive Dateianhang. Der Anhangname ist reines ASCII (F6).

6. **Testbetrieb.** Empfänger bleibt bis zur Freigabe die Testadresse. Solange
   der Empfänger nicht die echte Bestelladresse der Mühle ist, meldet der
   Server `testbetrieb: true`; Betreff und Formular tragen den Testvermerk
   (F11). `info@drax-muehle.de` steht zwar auf den Rechnungen, ist aber **nicht
   bestätigt** als Bestelladresse — siehe Risiken.

7. **Maßgeblich ist die Schreibweise der Mühle.** Der Katalog führt zwei
   Namensfelder: `name` (Mühle, auf dem Formular) und `kassenname` (nur zur
   Information im Artikelreiter, wenn er abweicht). Die 15 Artikel ohne
   Kassen-Gegenstück tragen `nur_rechnung: true` (F10).

8. **Gebindegröße ist Teil der Artikelnummer.** Keine getrennte
   Einheitenauswahl; `40401` und `40405` sind zwei Zeilen. Die Einheit ist ein
   reines Anzeigemerkmal.

## Architektur

```
static-site/kiosk.html
  └─ Tab „Drax Mühle" + #panel-drax + <script kiosk-drax.js>

static-site/js/kiosk-drax.js                   (Portierung des Mockups)
  └─ window.KDrax = { onShow, ... }            vier Unterreiter

api/drax-artikel/                              Katalogpflege (F10)
  ├─ __init__.py        GET · POST · PATCH
  └─ function.json

api/drax-order/                                Bestellung (F1–F9, F11)
  ├─ __init__.py        Route drax-order/{datum?}/{aktion?}
  ├─ drax_store.py      Dataverse-Schicht, Konfiguration, Vorbelegung, Verlauf
  ├─ drax_pdf.py        Formular-PDF im Aufbau des Papierblatts
  └─ vorlage/*.json     Startbestand (bereits erzeugt)
```

**Modulnamen sind bewusst präfixiert.** Azure Functions (Python v1) legt alle
Function-Ordner in denselben `sys.path`. Ein zweites `drax_store.py` würde das des
Bäckers verdecken. Metzger und Getränke halten es ebenso
(`metzger_store.py`, `getraenke_store.py`).

```

tests/kiosk-drax.spec.js                       Playwright, API gemockt
tools/drax_katalog_aus_xlsx.py                 Katalog neu erzeugen (vorhanden)
tools/drax_rechnung_extract.py                 Rechnungen auswerten (vorhanden)
```

## Endpunkte

| Route | Methode | Zweck | Spec |
| --- | --- | --- | --- |
| `/api/drax-artikel` | GET | Katalog nach Gruppe und Artikelnummer | F4, F10 |
| `/api/drax-artikel` | POST | Artikel anlegen | F10 |
| `/api/drax-artikel` | PATCH | Ändern, aus-/einblenden | F10 |
| `/api/drax-order` | GET | Übersicht: Tage, Konfiguration, Erinnerung | F1, F8 |
| `/api/drax-order/{datum}` | GET | Entwurf inkl. Vorbelegung | F2 |
| `/api/drax-order/{datum}/speichern` | POST | Entwurf speichern | F3 |
| `/api/drax-order/{datum}/senden` | POST | PDF erzeugen, Mail senden | F5, F6 |
| `/api/drax-order/{datum}/korrektur` | POST | Korrektur senden | F7 |
| `/api/drax-order/{datum}/dokument` | GET | Gesendetes PDF abrufen | F9 |
| `/api/drax-order?mode=verlauf` | GET | Verlauf inkl. Rechnungslieferungen | F9 |
| `/api/drax-order/config` | POST | Einstellungen speichern | F11 |

Schreibende Aufrufe laufen durch `admin_auth_guard` aus `shared/auth.py`.

## Datenformate

**Artikel** (`drax_artikel`):

```json
{ "nr": "40401", "name": "Weizenmehl Type 405", "einheit": "1 kg",
  "gruppe": "Weizenmehl & Grieß", "verkauft12": 102, "lieferungen": 5,
  "kassenname": "", "nur_rechnung": false, "aktiv": true }
```

**Position:**

```json
{ "nr": "40401", "menge": 6, "uebernommen": true }
```

**Bestellung** (`drax_order_JJJJ-MM-TT`):

```json
{ "datum": "2026-10-15", "status": 0, "positionen": [],
  "protokoll": [{ "zeit": "…", "was": "gesendet", "an": "…", "wer": "Kiosk" }],
  "dokument": "<base64 PDF>", "korrektur_von": null }
```

`status`: `0` offen · `1` gesendet · `2` korrigiert.

**Konfiguration** (`drax_config`):

```json
{ "empfaenger": "…", "anzeigename": "Drax Mühle", "kd_nr": "11225",
  "liefertag": 3, "bestellschluss": { "tag": 2, "zeit": "12:00" },
  "format": "pdf", "vorbelegung": "letzte" }
```

`liefertag`/`bestellschluss.tag` nach `datetime.weekday()` — 3 = Donnerstag,
2 = Mittwoch.

## File Change Map

| Datei | Art | Inhalt |
| --- | --- | --- |
| `api/drax-order/drax_store.py` | neu | Dataverse, Konfiguration, Vorbelegung, Verlauf, Bestellschluss |
| `api/drax-order/drax_pdf.py` | neu | Formular-PDF, vier Spalten, Gruppen-Leerzeilen |
| `api/drax-order/__init__.py` | neu | HTTP-Router |
| `api/drax-order/function.json` | neu | Route `drax-order/{datum?}/{aktion?}` |
| `api/drax-order/vorlage/*.json` | vorhanden | Startbestand, von den Tools erzeugt |
| `api/drax-artikel/__init__.py` | neu | Katalogpflege |
| `api/drax-artikel/function.json` | neu | GET/POST/PATCH |
| `static-site/js/kiosk-drax.js` | neu | Kiosk-Oberfläche, vier Unterreiter |
| `static-site/kiosk.html` | ändern | Tab Z. ~110, Panel Z. ~237, Feature-Map Z. ~618 **und** Z. ~1056, `defaultAn` Z. ~1057, Skript Z. ~5679 |
| `tools/drax_katalog_aus_xlsx.py` | vorhanden | Katalog erzeugen |
| `tools/drax_rechnung_extract.py` | vorhanden | Rechnungen auswerten |
| `tests/kiosk-drax.spec.js` | neu | Playwright über drei Viewports |
| `mockups/drax-bestellung-mockup.html` | vorhanden | abgenommener Vorschlag |

**Achtung `kiosk.html`:** Der Feature-Schalter kommt an **zwei** Stellen vor
(Z. ~618 und Z. ~1056). Wird nur eine gepflegt, erscheint der Tab, lässt sich
aber nicht abschalten — oder umgekehrt. Änderungen bleiben streng additiv.

## Reihenfolge

1. `drax_store.py` samt Konfiguration, Vorbelegung und `bestellschluss_*` —
   trägt alles andere; ohne Azure prüfbar halten.
2. `drax_pdf.py` — der Anhang ist das sichtbare Ergebnis.
3. `__init__.py` beider Endpunkte, `function.json`.
4. Kiosk-Oberfläche aus dem Mockup portieren.
5. `kiosk.html` verdrahten (Tab, Panel, beide Map-Stellen, `defaultAn`, Skript).
6. Playwright-Tests über drei Viewports.
7. Cache-Bust-Version erhöhen, committen, Deployment prüfen.

## Risiken

| Risiko | Umgang |
| --- | --- |
| **Bestelladresse der Mühle unbekannt** | Testadresse bleibt aktiv; `testbetrieb` wird gemeldet und im Kiosk angezeigt. Freigabe erst nach Rückfrage beim Betreiber. |
| Dataverse/Graph hier nicht prüfbar | Logik in `drax_store.py` ohne Azure testbar halten; Playwright mockt die API |
| `kiosk.html` ist groß und wird oft geändert | Nur additive Blöcke; beide Map-Stellen in einem Durchgang |
| Latin-1-Grenze von `fpdf2` | `latin1()` wie beim Bäcker; „Frei von"-Anführungszeichen vorher ersetzen |
| Katalog veraltet, wenn Drax umstellt | Tools im Repo; `VERALTETE_KASSENNAMEN` dokumentiert den Fall `78549` |
| Versehentlicher Echtversand | Empfänger bleibt Testadresse, Testvermerk im Betreff und auf dem Blatt |

## Traceability

| Requirement | Umsetzung |
| --- | --- |
| F1 | `store.naechste_liefertage`, `store.liefertag_status`; Tagesleiste im JS |
| F2 | `store.vorlage_bestellung` aus letzter Bestellung bzw. `startwerte-drax.json` |
| F3 | Mengenfeld im JS, Serverprüfung in `store.normalisiere_positionen` |
| F4 | Gruppen- und Nummernsortierung in `api/drax-artikel`; Suche, Sprungleiste, „Nur bestellt" im JS |
| F5 | `drax_pdf.build_pdf` mit vier Spalten und Gruppen-Leerzeilen |
| F6 | `_senden`, `shop-notify.send_email`, ASCII-Anhangname |
| F7 | `status`/`korrektur_von` in `drax_store`, Korrekturkopf in `drax_pdf` |
| F8 | `store.bestellschluss_zeitpunkt`; Hinweis, Countdown und Reiter-Merkmal im JS |
| F9 | `_verlauf` mit Einmischung von `lieferhistorie.json`, `dokument` |
| F10 | `api/drax-artikel` GET/POST/PATCH, Artikelreiter im JS |
| F11 | `_config_speichern`, Testbetriebs-Erkennung |
| F12 | CSS in `kiosk.html`, Playwright über drei Viewports |
| F13 | CMS-Schalter `kiosk_drax`, Standard an |
