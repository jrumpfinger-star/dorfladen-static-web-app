# Plan: Kiosk-Werbebilder-Upload

## Architektur

```
Kiosk (HTTPS, Browser)  --HTTP/CORS-->  Brücke (Laden-LAN, Python)  --FTP-->  Waage
```

Die Cloud (Azure Functions) ist nicht beteiligt.

### Brücke `tools/waage-bruecke/waage_bruecke.py`

Nur Standardbibliothek (`http.server`, `ftplib`, `json`, `ssl`). Eine FTP-Verbindung je
Anfrage (kurzlebig, keine Zustandsfehler). FTP-Zugriff hinter der Klasse `FtpWaage`
(austauschbar im Test).

| Route | Wirkung |
|-------|---------|
| `GET /health` | `{ok, waage, basis, arten}`; `waage` = FTP-Login und Verzeichniswechsel gelingen |
| `GET /bilder/<art>` | `{art, verzeichnis, max, bilder:[{name,groesse}]}` nach Name sortiert |
| `GET /bilder/<art>/<name>` | Bildbytes (für Miniaturen) |
| `POST /bilder/<art>?name=…` | Rumpf = Bild; prüft Typ, Größe, Anzahl; liefert gespeicherten Namen |
| `DELETE /bilder/<art>/<name>` | löscht |
| `OPTIONS *` | CORS + `Access-Control-Allow-Private-Network` |

Arten: `vollbild` → `<basis>/fullscreen/default`, `dauer` → `<basis>/permanent/default`.
Alles andere: 404. Kein Verzeichnis wird angelegt.

Konfiguration: `config.json` neben dem Skript, überschreibbar durch `WAAGE_FTP_HOST`,
`WAAGE_FTP_USER`, `WAAGE_FTP_PASS`, `WAAGE_PORT`. Beispieldatei `config.example.json` ohne
Zugangswerte. Optional `tls_cert`/`tls_key` für HTTPS.

### Kiosk

- Panel `#panel-werbebilder` in `static-site/kiosk-klassisch.html`, Modul
  `static-site/js/kiosk-werbebilder.js` (`window.KWerbebilder`, Namensraum `wb-`,
  eigenes `<style id="wb-style">`).
- Verdrahtung: `REITER` in `tools/build-kiosk-neu.js`, beide Flag-Maps
  (`MAP` im Kopfskript und `map` in `applyKioskFeatures`), Standard an, `switchTab` →
  `onShow`, Skript-Einbindung, `isBusy()` (kein Auto-Neuladen mitten im Upload).
- Adresse der Brücke: `localStorage['kiosk_waage_url']`.
- `node tools/build-kiosk-neu.js` erzeugt `kiosk.html`, `kiosk-neu.html`.

## Änderungsübersicht

| Datei | Änderung |
|-------|----------|
| `specs/kiosk-werbebilder-upload/*` | Spec, Plan, Tasks |
| `tools/waage-bruecke/waage_bruecke.py` | neu |
| `tools/waage-bruecke/config.example.json`, `README.md`, `start.bat` | neu |
| `.gitignore` | `tools/waage-bruecke/config.json` |
| `static-site/js/kiosk-werbebilder.js` | neu |
| `static-site/kiosk-klassisch.html` | Panel, Maps, onShow, Skript, isBusy |
| `tools/build-kiosk-neu.js` | Reiter |
| `static-site/kiosk.html`, `kiosk-neu.html`, `css/kiosk-base.css` | erzeugt |
| `tests/test_waage_bruecke.py`, `tests/kiosk-werbebilder.spec.js` | neu |

## Tests

Python-Test der Brücke gegen einen Fake-FTP (TC-F9, F10, F11). Playwright gegen gemockte
Brücke auf mobil, iPad und Desktop (TC-F1…F8). Gegenprobe: Tests müssen ohne die
Änderung rot sein.
