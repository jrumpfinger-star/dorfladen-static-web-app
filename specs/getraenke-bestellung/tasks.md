# Getränke-Bestellung — Tasks

Grundlage: [spec.md](./spec.md) und [plan.md](./plan.md).
Eine Aufgabe gilt erst als erledigt, wenn ihre Test Cases laufen
(Constitution Prinzip 2 und 8).

## T1 — Seed erzeugen

`tools/getraenke_katalog_build.py` so erweitern, dass es neben
`mockups/getraenke-katalog.js` auch `api/getraenke-order/vorlage/katalog.json`
im API-Format schreibt: `lieferant`, `gruppen`, `pfand`, `artikel[]` mit
`nummer`, `name`, `bestelltext`, `gebinde`, `gruppe`, `preis`, `pfand`,
`bestellungen`, `ueblich`, `zuletzt`, `aktiv`, dazu `verlauf[]`.

- Abhängigkeiten: keine
- Abnahme: Datei enthält 50 Artikel und 8 Gruppen; die letzte Bestellung
  ergibt mit den Preisen 553,22 €.
- Deckt: Datengrundlage für F2, F4, F5

## T2 — `getraenke_store.py`

Dataverse-Zugriff nach Vorbild `metzger_store.py`: `get_token`, `base_url`,
`headers`, `cors_headers`, `read_json`, `write_json`, `read_many`.
Dazu: `load_config`/`save_config`/`testbetrieb`, `load_artikel`/`save_artikel`
mit Vorlagen-Fallback, `order_key`/`load_order`/`save_order`/`bestellungen`,
`letzte_bestellung`, `entwurf_positionen`, `kw()`, `datum_de()`,
`wochentag()`, `bestellbar()`, `summen()`, `normalisiere_position()`.

- Abhängigkeiten: T1
- Abnahme: Modul importiert ohne Dataverse-Verbindung; `kw()` liefert für
  2026-09-14 die 38; `summen()` rechnet Kisten, Positionen, Wert, Pfand.
- Deckt: F1, F5, F8, F13

## T3 — `api/getraenke-order`

`__init__.py` und `function.json` mit Route
`getraenke-order/{datum?}/{aktion?}`, Methoden get/post/options,
`authLevel: anonymous`. Aktionen `speichern`, `senden`, `korrektur`, dazu
`config`. `_mail_text()` erzeugt den Text nach plan.md. Versand über
`shop-notify.send_email` ohne Anhang. Scheitert der Versand, bleibt der
Entwurf erhalten und es kommt eine freundliche Meldung (Constitution 6).

- Abhängigkeiten: T2
- Abnahme: Modul importiert; Mailtext enthält „20 Kisten Augustiner hell
  0,5l" und trennt Warengruppen durch Leerzeilen; ohne Position `400`;
  vergangener Termin `409`.
- Deckt: F9, F10, F12, F13

## T4 — `api/getraenke-artikel`

GET/POST/PATCH nach Vorbild `metzger-artikel`: Dublettenprüfung über
normalisierte Bezeichnung mit `409` und `trotzdem`-Umgehung, doppelte
Artikelnummer wird abgewiesen, Ausblenden statt Löschen.

- Abhängigkeiten: T2
- Abnahme: Modul importiert; kein DELETE-Zweig vorhanden.
- Deckt: F7, F11

## T5 — Kiosk-Modul

`static-site/js/kiosk-getraenke.js` als IIFE `window.KGetraenke` mit
`onShow()`, portiert aus `mockups/getraenke-bestellung-mockup.html`.
Gestaltung in `static-site/css/kiosk-getraenke.css`, Klassenpräfix `gk-`.
Keine `alert`/`confirm`, sondern modul-eigene Blätter und Toasts.

- Abhängigkeiten: T3, T4
- Abnahme: Terminfeld mit KW, Warengruppen, Schrittzähler, Vorschläge,
  Suche und Filter, Anlegen-Dialog, Mailvorschau, Verlauf, Artikelpflege.
- Deckt: F1 bis F11

## T6 — Einbindung in den Kiosk

`static-site/kiosk.html`: Reiter `getraenke` mit Symbol, Panel
`panel-getraenke`, `onShow()`-Aufruf, Feature-Flag `kiosk_getraenke` in
`applyKioskFeatures` samt Vorbelegung, Blockade des automatischen Neuladens
bei offenem Panel, Einbinden von CSS und Skript.

- Abhängigkeiten: T5
- Abnahme: Der Reiter erscheint und lädt das Formular.
- Deckt: F1

## T7 — CMS-Maske

`static-site/cms.html` und `static-site/js/cms.js`: Felder `#gkcfg-empfaenger`,
`#gkcfg-name`, `#gkcfg-kdnr`, `#gkcfg-tour`, Speichern über
`data-action="gkcfgSave"` gegen `/api/getraenke-order/config`.

- Abhängigkeiten: T3
- Abnahme: Speichern und erneutes Laden zeigen die Werte; unvollständige
  Adresse wird freundlich abgewiesen.
- Deckt: F12

## T8 — Playwright-Tests  ✅ erledigt

`tests/kiosk-getraenke.spec.js` mit `serviceWorkers: 'block'` und
vollständig gemockter API. Test-IDs entsprechen den TC-Nummern der Spec.

- Abhängigkeiten: T6
- Abnahme: Alle Tests laufen auf `mobile`, `ipad-mini` und `desktop`.
  **Ergebnis: 87 Läufe, alle grün.** Zusätzlich `tests/test_getraenke_order.py`
  — ein vollständiger Serverdurchlauf gegen einen Dataverse-Ersatz im
  Speicher, ebenfalls grün.
- Deckt: alle F

## T9 — Abnahme  ✅ erledigt

Python-Import der neuen Functions prüfen, Playwright gezielt ausführen,
temporäre Prüfdateien entfernen.

- Abhängigkeiten: T8
- Abnahme: Keine Konsolenfehler, keine Reste im Arbeitsbaum.
- Ergebnis: Beide Functions importieren sauber. Die Metzger-Suite läuft
  unverändert durch (36/36) — keine Regression. Zwei echte Fehler wurden
  dabei gefunden und behoben: die fehlende Hausnummer für dauerhaft
  angelegte Artikel (F7.8) und der im Kiosk verbliebene vorläufige
  Schlüssel nach dem Anlegen.

## Reihenfolge

```
T1 ─► T2 ─┬─► T3 ─┬─► T5 ─► T6 ─► T8 ─► T9
          └─► T4 ─┘        └─► T7 ─┘
```
