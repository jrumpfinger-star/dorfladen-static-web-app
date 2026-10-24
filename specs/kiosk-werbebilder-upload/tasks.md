# Aufgaben: Kiosk-Werbebilder-Upload

| # | Aufgabe | Testfälle | Stand |
|---|---------|-----------|-------|
| T1 | Brücke: Konfiguration, FTP-Klasse, Prüfungen, Routen, CORS | TC-F9-01…05, TC-F10-01, TC-F11-01 | erledigt |
| T2 | Brücke: Python-Test mit Fake-FTP, Gegenprobe | wie T1 | erledigt |
| T3 | Brücke: `config.example.json`, `start.bat`, `README.md`, `.gitignore` | TC-F10-01 | erledigt |
| T4 | Kiosk: Modul `kiosk-werbebilder.js` (Liste, Upload, Löschen, Ersetzen, Vorschau, Fehlerzustände) | TC-F3…F8, TC-F12 | erledigt |
| T5 | Kiosk: Panel, Flag-Maps, `onShow`, Skript, `isBusy`, `REITER`, Neubau | TC-F1-01…02, TC-F2-01 | erledigt |
| T6 | Playwright-Test (4 Profile), Gegenprobe | TC-F1…F8, TC-F12 | erledigt |
| T8 | Adress-Konfiguration: Brücke (`pruefe_config`, `--einrichten`, Startausgabe), Kiosk (IP/Port-Felder, Test) | TC-F13-01…03 | erledigt |
| T9 | exe-Paketierung (`build-exe.bat`), Autostart/Firewall-Angebot, README | TC-F14-01…03 | erledigt |
| T10 | Praxisfunde: `default` anlegen, Vorrang-Hinweis, Vorschau-Herkunft, klare Meldung bei fremdem Server | TC-F15-01…05, TC-F16-01 | erledigt |
| T7 | Bestehende Kiosk-Tests gegenprüfen, Auslieferung, Live-Prüfung | — | offen |
| T11 | API `waage-werbebilder` + `shared/waage.py` (Kiosk- und Brücken-Aufrufe, SharePoint, Table) | TC-F17…F18 | erledigt |
| T12 | Brücke als Agent (Abgleich, Erstlauf, etag-Stand, Anmeldung, `--trocken`/`--einmal`, Assistent) | TC-F20…F24 | erledigt |
| T13 | Kiosk-Modul auf API umbauen, Status, Auto-Aktualisierung; Playwright neu | TC-F19, TC-F25, F1…F7, F12 | erledigt |
| T14 | README, exe neu, Defender-Scan | — | erledigt |
| T15 | Preview-Live-Test (Brücke lokal, ohne Browser-Sonderfreigabe) | alle | erledigt (Kette Kiosk → Cloud → Brücke → Test-FTP in Edge; echte Waage nur lesend/trocken) |
| T16 | Zwischenablage: Einfügen per Strg+V und Knopf, Umwandlung in JPEG, Tests | TC-F26-01…05 | erledigt |
| T17 | Kamera: Live-Aufnahme im Tab, Kamera-App als Ersatz, Freigabe der Kamera, Tests | TC-F27-01…03 | erledigt |
# Erweiterung: Upload-Anpassung

- [x] D1 Profile und Persistenz (TC-F28-01, CMS TC-F12-02); Voraussetzung: Spec/Plan aktualisiert.
- [x] D2 JPEG-Anpassung und tatsächliche Zielvorschau (TC-F29-01); Voraussetzung: D1.
- [x] D3 Wechsel/Fehler/GIF sowie Kamera/Clipboard (TC-F29-02/03); Voraussetzung: D2.
- [x] D4 Vier-Viewport-Regression und Handbuch; Voraussetzung: D3.

Validierung: Beide Werbebilder-Suiten 232/232 auf vier Viewports. Upload-Vorschau und
POST-Bytes verglichen, Pixelmarkierungen für Beschnitt geprüft, Fehlerfälle und GIF-Erhalt
bestätigt. Keine echten Bilder auf der Waage geändert.
