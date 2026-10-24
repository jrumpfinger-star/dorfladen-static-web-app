# Plan: Kiosk-Werbebilder-Upload

## Architektur (ab 2026-10-23: Cloud-Relais)

```
Kiosk (HTTPS) --/api/waage-werbebilder--> Azure Functions --> SharePoint (Bilder) + Table (Brückenstatus)
                                                  ^
Brücke (Laden-PC, nur ausgehend, HTTPS) ----------+   ... gleicht per FTP die Waage ab
```

Kein offener Port im Laden, kein Mixed Content, keine IP-Eingabe. Die frühere
Direktverbindung Kiosk → Brücke (HTTP) ist entfallen (siehe Spec, „Änderung 2026-10-23“).

### API `api/waage-werbebilder/` + `api/shared/waage.py`

Eine Funktion, Auswahl über Abfrageparameter:

| Aufruf | Wirkung |
|--------|---------|
| `GET ?art=<a>` | Liste `{bilder:[{name,groesse,etag,status}], max, bruecke:{online,zuletzt,vor_s,ok,fehler,initialisiert}}` |
| `GET ?art=<a>&name=<n>` | Bildbytes (`no-store`) |
| `POST ?art=<a>&name=<n>` | Rumpf = Bild; prüft Typ, Größe, Anzahl; speichert |
| `DELETE ?art=<a>&name=<n>` | löscht |
| `GET ?bruecke=sync` | Sollvorgabe `{version, initialisiert, arten:{vollbild:[…],dauer:[…]}}` |
| `POST ?bruecke=bericht` | JSON-Bericht der Brücke → Table `waage` (PK `bruecke`, RK `status`) |

`shared/waage.py` enthält die reine Logik (Typprüfung, Namensbereinigung, `version`,
Statusableitung) und dünne Adapter für Graph (SharePoint, Ordner `Waage-Werbebilder/<art>/`)
und Table Storage (`STORAGE_CONN`); beide im Test austauschbar.

### Brücke `tools/waage-bruecke/waage_bruecke.py`

Nur Standardbibliothek (`urllib`, `ftplib`, `json`). Schleife alle `poll_sekunden`:
`GET sync` → bei geänderter `version` (oder alle 5 min) FTP-Abgleich (`plane()` + Ausführung)
→ `POST bericht` (spätestens alle 30 s). `plane()` ist reine Funktion (Erstlauf-Übernahme,
Hochladen, Löschen). Stand der übertragenen `etag`s in `sync_stand.json` neben der exe.
`--trocken` (nur Plan), `--einmal`, `--einrichten`, `--autostart-entfernen`.
FTP bleibt hinter `FtpWaage` (nur Default-Verzeichnisse, `default` wird bei Bedarf angelegt).

### Kiosk

Wie zuvor (Panel, Flag-Maps, `onShow`, `isBusy`, `REITER`), das Modul spricht nur noch
`/api/waage-werbebilder`; Statuszeile und Status je Bild; Auto-Aktualisierung alle 8 s,
solange der Tab sichtbar ist.

## Änderungsübersicht (Relais)

| Datei | Änderung |
|-------|----------|
| `api/shared/waage.py`, `api/waage-werbebilder/*` | neu |
| `tools/waage-bruecke/*` | Agent statt HTTP-Server; Assistent ohne Firewall |
| `static-site/js/kiosk-werbebilder.js` | Verbindungsteil ersetzt, Statusanzeige |
| `tests/test_waage_relais_api.py`, `tests/test_waage_bruecke.py`, `tests/kiosk-werbebilder.spec.js` | neu/umgebaut |

## Tests

Python: API-Logik gegen Fake-Speicher, Brücken-Abgleich gegen Fake-FTP und Fake-API
(Gegenproben). Playwright gegen gemockte `/api/waage-werbebilder` (mobil, iPad, Desktop).
Live: Brücke lokal gegen die Preview (`--trocken`, Fake-FTP), Edge ohne Sondereinstellung.

---

## Frühere Fassung (Direktverbindung, abgelöst)

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
# Erweiterung: Anzeigeprofile und Upload-Vorschau

F28/F29 werden im bestehenden `kiosk-werbebilder.js` umgesetzt: gemeinsame Profile
mit Browser-Persistenz, Auswahl im Kiosk und CMS, zentrale JPEG-Anpassung mit contain/cover.
Staging behält Original plus Ausgabedatei/Objekt-URL. Token schützen vor veralteten
Konvertierungen; während Bearbeitung/Fehler kein Transfer. Kamera und Clipboard gehen
bereits durch dieselbe Staging-Aufnahme. GIF-Bytes unverändert transportieren, keine
animierten Bilder durch Canvas schicken. Bestehenden Upload-vor-Löschen-Ablauf bewahren.
Playwright prüft echte Vorschau-/POST-Bytes und Pixelmarkierungen, Profilwechsel,
Fehlerfälle, GIF-Erhalt und bestehende Kamera-/Clipboard-Fälle auf vier Viewports.
