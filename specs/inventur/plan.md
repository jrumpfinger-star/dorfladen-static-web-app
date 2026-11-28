# Inventur-Web-App — Plan

**Spezifikation:** [spec.md](spec.md) · **Funktionen:** [inventur-web-funktionen.md](../inventur-web-funktionen.md)

## Architektur

- **Seite** `/inventur` (SWA-Rewrite auf `inventur.html`): Vanilla JS, gemeinsame
  Tokens aus `dl-design.css`, Dunkelmodus über `theme.js` (folgt dem System),
  eigene Anmeldung gegen `/api/cms-auth` mit demselben Token-Speicher wie der
  Kiosk. `admin-auth.js` wird bewusst nicht geladen, damit es kein stilles
  Wiederholen nach 401 gibt.
- **API** `/api/inventur` (klassisches `function.json`-Modell wie die übrigen
  Funktionen im Ordner `api/`): ein Endpunkt, `GET ?action=…` zum Lesen,
  `POST {action}` zum Schreiben. Jeder Aufruf prüft `token_valid` – auch bei
  ausgeschaltetem `CMS_AUTH_ENFORCE`.
- **Fachlogik** `api/shared/inventur_logic.py` (fail-closed Regeln, ohne
  Dataverse) und **Dataverse-Zugriff** `api/shared/inventur_dv.py` (gleiche
  Tabellen wie die PowerApps; Artikelstamm nur lesend).
- **Kamera** im Browser über `BarcodeDetector` + `getUserMedia`; Bilder werden
  weder gespeichert noch übertragen.
- **Service Worker** lässt `/api/inventur` unberührt (`sw.js`, Cache-Version 40).

## Dateikarte

| Datei | Änderung |
| --- | --- |
| `static-site/inventur.html`, `css/inventur.css`, `js/inventur.js` | neu |
| `static-site/staticwebapp.config.json` | Route `/inventur` |
| `static-site/sw.js` | `/api/inventur` ausnehmen, Cache `v40` |
| `api/inventur/` | neu (Funktion) |
| `api/shared/inventur_logic.py`, `inventur_dv.py` | neu |
| `tests/test_inventur.py`, `tests/inventur.spec.js` | neu |

## Sicherheitsregeln (fail-closed)

Doppelter Schlüssel, falsche Referenz, veraltete Version, inaktive Inventur,
zu langer Schlüssel oder unbekannte Mengenerfassung → keine Schreibung,
typisierter Fehler. Erstanlage wird nachgeprüft; nur die eigene neue Position
wird bei Kollision zurückgenommen. Keine Schema-/Datenänderung, keine
Bereinigung bestehender Duplikate.

## Restrisiken

Siehe „Abnahmepunkte“ in der Spezifikation (If-Match-Erzwingung,
Laufzeitrechte, echtes Mobilgerät, bekannter Duplikatschlüssel).
