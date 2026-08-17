# Social Media Post Scheduling (Morgen-Posts)

## Beschreibung
Posts im Kiosk/CMS heute schon für morgen vorbereiten. Auf der Homepage Heute/Morgen-Tabs im TagesInfo-Modal.

## Akzeptanzkriterien

### Kiosk & CMS
- [x] **AK-SP-01**: Heute/Morgen Toggle-Buttons im Social-Tab (Step 1: Titel & Text)
- [x] **AK-SP-02**: Titel-Optionen passen sich dynamisch an (Heute/Morgen im Dorfladen – [Wochentag])
- [x] **AK-SP-03**: Datum-Label zeigt den gewählten Tag (z.B. "Dienstag, 01. Juli")
- [x] **AK-SP-04**: Toggle-State wird bei WhatsApp-Share, Instagram-Share und Tagesinfo-Publish berücksichtigt

### API
- [x] **AK-SP-05**: `POST /api/social-post` akzeptiert optionales `ziel_datum` (ISO-Datum "YYYY-MM-DD")
- [x] **AK-SP-06**: Bei `ziel_datum` wird das Post-Datum auf Zieldatum gesetzt, Wochentag korrekt berechnet
- [x] **AK-SP-07**: `GET /api/tagespost` liefert `today_post` und `tomorrow_post` im Response

### Homepage
- [x] **AK-SP-08**: TagesInfo-Modal zeigt Heute/Morgen-Tabs wenn beide Posts existieren
- [x] **AK-SP-09**: Tab-Umschalten rendert den jeweiligen Post korrekt
- [x] **AK-SP-10**: Mobile Subtitle zeigt "X Produkte heute" oder "X Produkte morgen"

### Kiosk Geplante Posts
- [x] **AK-SP-11**: "Geplante Posts" Übersicht zeigt Posts für Heute (grün) und Morgen (blau) gruppiert

## Geänderte Dateien
- `api/social-post/__init__.py` – ziel_datum Parameter
- `api/tagespost/__init__.py` – today_post + tomorrow_post Response
- `static-site/kiosk.html` – Heute/Morgen Toggle
- `static-site/cms.html` – Heute/Morgen Toggle
- `static-site/js/social-poster.js` – ziel_datum senden + Geplante Posts anzeigen
- `static-site/index.html` – TagesInfo-Modal Tabs
