# Metzger-Bestellung — Implementation Plan

> SDD-Stufe 2. Grundlage: [spec.md](./spec.md). Kein Code in diesem Dokument.

**Status:** Draft · **Last updated:** 2026-09-07

## Leitentscheidungen

1. **Kein neues Dataverse-Schema.** Wie die Bäcker-Bestellung liegt alles als
   JSON im generischen Schlüssel-/Wert-Speicher `dl_seiteninhalts`. Das spart
   eine Schema-Änderung und nutzt eine im Betrieb bewährte Ablage.

   | Schlüssel | Inhalt |
   | --- | --- |
   | `metzger_artikel` | Artikelkatalog (84 + 18 inaktive) |
   | `metzger_config` | Einstellungen (Empfänger, Bestelltage, …) |
   | `metzger_vorschlaege` | Vorschlagslisten je Artikelnummer (F4) |
   | `metzger_order_JJJJ-MM-TT` | eine Bestellung je Liefertag |

   Damit entfallen die in der Spec genannten Tabellen `dl_metzgerartikels`,
   `dl_metzgerbestellungs` und `dl_metzgervorschlaege`. Die Spec wird
   entsprechend nachgezogen.

2. **Startbestand aus den Vorlagen.** Fehlt ein Schlüssel in Dataverse, liefert
   der Server den Inhalt aus `api/metzger-order/vorlage/*.json`. Der Kiosk ist
   dadurch ab dem ersten Aufruf brauchbar, auch ohne Seed-Lauf.

3. **Anhang als PDF.** Es gibt keine Word-Vorlage des Metzger-Formulars, nur
   einen Scan. Das Formular wird deshalb mit `fpdf2` neu gesetzt — dieselbe
   Bibliothek, die für Martin's Backstube bereits im Einsatz ist.

4. **Mailversand über `shop-notify.send_email`**, exakt wie beim Bäcker,
   inklusive Dateianhang und ohne Shop-Knopf.

5. **Testbetrieb.** Empfänger ist bis zur Freigabe `jrumpfinger@t-online.de`.
   Solange der Empfänger nicht die echte Metzger-Adresse ist, kennzeichnet die
   Antwort des Servers den Versand als Testbetrieb (`testbetrieb: true`), und
   der Kiosk zeigt das im Versanddialog.

6. **Getrennt von der Fleisch-Vorbestellung.** Neuer Tab `metzgerbest`, neues
   Panel, neue Datei. Der bestehende Tab `metzger` (Kundenvorbestellungen)
   bleibt unberührt.

## Architektur

```
static-site/kiosk.html
  └─ Tab „Metzger Mair" + #panel-metzgerbest + <script kiosk-metzger-bestellung.js>

static-site/js/kiosk-metzger-bestellung.js      (Portierung des Mockups)
  └─ window.KMetzgerBest = { onShow, ... }

api/metzger-artikel/                            Katalogpflege (F9)
  ├─ __init__.py        GET · POST · PATCH
  └─ function.json

api/metzger-order/                              Bestellung (F1, F7, F11, F12, F14, F15)
  ├─ __init__.py        Route metzger-order/{datum?}/{aktion?}
  ├─ store.py           Dataverse-Schicht, Konfiguration, Vorbelegung, Vorschläge
  ├─ pdf_form.py        Formular-PDF mit allen Zeilen
  ├─ portionen.py       Portionsmodell: Normalisieren, Text, Summen (F2, F6)
  └─ vorlage/*.json     Startbestand (bereits erzeugt)

tests/kiosk-metzger-bestellung.spec.js          Playwright, API gemockt
tools/metzger_portionen_test.py                 Prüft portionen.py ohne Azure
```

## Endpunkte

| Route | Methode | Zweck | Spec |
| --- | --- | --- | --- |
| `/api/metzger-artikel` | GET | Katalog in Formularreihenfolge | F9 |
| `/api/metzger-artikel` | POST | Artikel anlegen | F9 |
| `/api/metzger-artikel` | PATCH | Ändern, aus-/einblenden, Nummer umziehen | F9 |
| `/api/metzger-order` | GET | Übersicht: Tage, Konfiguration, Status | F1 |
| `/api/metzger-order/{datum}` | GET | Entwurf inkl. Vorbelegung und Vorschlägen | F7, F4 |
| `/api/metzger-order/{datum}/speichern` | POST | Entwurf speichern | F1 |
| `/api/metzger-order/{datum}/senden` | POST | PDF erzeugen, Mail senden, lernen | F11, F4 |
| `/api/metzger-order/{datum}/korrektur` | POST | Korrektur senden | F12 |
| `/api/metzger-order/{datum}/dokument` | GET | Gesendetes PDF abrufen | F14 |
| `/api/metzger-order?mode=verlauf` | GET | Verlauf | F14 |
| `/api/metzger-order/config` | POST | Einstellungen speichern | F15 |

Schreibende Aufrufe laufen durch `admin_auth_guard`.

## Datenformate

**Position** (wie Spec, `vakuum` ist `true`/`false`):

```json
{ "nummer": 360, "name": "Putenschnitzel",
  "portionen": [{ "anzahl": 2, "menge": 4, "einheit": "St", "vakuum": true }],
  "hinweis": "", "zusatz": false }
```

**Bestellung** (`metzger_order_JJJJ-MM-TT`):

```json
{ "datum": "2026-08-31", "status": 0, "positionen": [],
  "protokoll": [{ "zeit": "…", "was": "gesendet", "an": "…", "wer": "Kiosk" }],
  "dokument": "<base64 PDF>" }
```

**Vorschlag** (`metzger_vorschlaege`, je Artikelnummer höchstens fünf):

```json
{ "360": [{ "portionen": [...], "punkte": 2.1, "belege": 7,
            "quelle": "lieferung", "zuletzt": "2026-08-27" }] }
```

## File Change Map

| Datei | Art | Inhalt |
| --- | --- | --- |
| `api/metzger-order/store.py` | neu | Dataverse, Konfiguration, Vorbelegung, Vorschläge |
| `api/metzger-order/portionen.py` | neu | Portionsmodell und Summen |
| `api/metzger-order/pdf_form.py` | neu | Formular-PDF |
| `api/metzger-order/__init__.py` | neu | HTTP-Router |
| `api/metzger-order/function.json` | neu | Route mit `{datum?}/{aktion?}` |
| `api/metzger-artikel/__init__.py` | neu | Katalogpflege |
| `api/metzger-artikel/function.json` | neu | GET/POST/PATCH |
| `static-site/js/kiosk-metzger-bestellung.js` | neu | Kiosk-Oberfläche |
| `static-site/kiosk.html` | ändern | Tab, Panel, Skript, CMS-Schalter |
| `tests/kiosk-metzger-bestellung.spec.js` | neu | Playwright |
| `tools/metzger_portionen_test.py` | neu | Prüft Parser und Summen ohne Azure |
| `specs/metzger-bestellung/spec.md` | ändern | Ablage auf `dl_seiteninhalts` |

**Achtung:** `static-site/kiosk.html` wird derzeit von einer parallelen Session
(`baecker-zwei-baeckereien`) bearbeitet. Änderungen dort bleiben streng additiv
und auf den neuen Tab beschränkt.

## Reihenfolge

1. `portionen.py` samt Selbsttest — das Modell trägt alles andere.
2. `store.py` — Ablage, Konfiguration, Vorbelegung, Vorschlagspflege.
3. `pdf_form.py` — Anhang.
4. `__init__.py` beider Endpunkte.
5. Kiosk-Oberfläche aus dem Mockup portieren.
6. `kiosk.html` verdrahten.
7. Playwright-Tests über drei Viewports.

## Risiken

| Risiko | Umgang |
| --- | --- |
| Dataverse/Graph hier nicht prüfbar | Logik in `portionen.py`/`store.py` ohne Azure testbar halten; Playwright mockt die API |
| Paralleles Bearbeiten von `kiosk.html` | Nur additive Blöcke, keine bestehenden Zeilen umformatieren |
| Namenskollision mit dem Tab „Metzger" | Neuer Tab heißt `metzgerbest`, Panel `#panel-metzgerbest` |
| Versehentlicher Echtversand | Empfänger bleibt Testadresse; Server meldet `testbetrieb` |

## Traceability

| Requirement | Umsetzung |
| --- | --- |
| F1 | `store.ist_bestelltag`, `naechster_bestelltag`; Tagesleiste im JS |
| F2 | `portionen.normalisiere`, `text`, `summen` |
| F3 | Portionspad im JS |
| F4 | `store.vorschlaege`, `store.lerne`; Mehrfachauswahl im JS |
| F5 | Parser im JS, Gegenprobe in `portionen.py` |
| F6 | `vakuum` als Boolean, Zählung in `portionen.summen` |
| F7 | `store.vorlage_bestellung` |
| F8 | Zusatzpositionen im JS, `zusatz`-Kennzeichen |
| F9 | `api/metzger-artikel` |
| F10 | Suche und Sprungleiste im JS |
| F11 | `_senden`, `pdf_form.build_pdf`, `_mail_text` |
| F12 | Status und Protokoll in `store` |
| F13 | Erinnerung im JS über `badge()` |
| F14 | `_verlauf`, `dokument` |
| F15 | `_config_speichern` |
| F16 | `portionen.summen` mit Preisen |
| F17 | CSS in `kiosk.html`, Playwright über drei Viewports |
| F18 | CMS-Schalter `kiosk_metzgerbest` |
