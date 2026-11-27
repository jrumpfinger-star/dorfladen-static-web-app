# Kiosk: Wochenplan im Menü, Getränke ans Ende — Plan

**Spec:** [spec.md](./spec.md)

## Architektur

- **Reiter:** In der Quelle `static-site/kiosk-klassisch.html` wird der Getränke-Reiter ans Ende verschoben und der Reiter `wochenplan` nach `angebote` eingefügt. Panel `#panel-wochenplan` mit einem Rahmen (`<iframe>`), Quelle erst beim ersten Öffnen gesetzt.
- **Generator:** `tools/build-kiosk-neu.js` (Liste `REITER`) erhält dieselbe Reihenfolge und den Reiter `wochenplan` (Symbol `calendar-days`, kurz „Wochenplan"). Danach `kiosk.html`/`kiosk-neu.html` neu erzeugen (nie von Hand ändern) und `tools/pruef-kiosk-neu.js` laufen lassen.
- **Reiterlogik:** `switchTab(id)` lädt für `wochenplan` den Rahmen beim ersten Aufruf. Auto-Reload-Schutz: `panel-wochenplan` steht in `isBusy()`. Der Wochenplan hat keinen Seiten-Entwurfszustand; Dialoge sichert das CMS selbst.
- **CMS-Embed:** `static-site/cms.js` liest `?embed=wochenplan`: setzt `html.cms-embed`, blendet Kopf, Reiterleiste und Hinweisstreifen per CSS aus (Raster nur „main"). Wochenplan ist der Standardbereich. Im Embed-Modus: keine `history.pushState` beim Bereichswechsel, Hilfe immer als Popup; Dialog-Verlauf bleibt wie im CMS. Die generierten CMS-Seiten bleiben unverändert. Anmeldung läuft unverändert (`cms_auth_token`).
- **Layout:** Rahmen `height:100%` im Panel; Panel nutzt den bestehenden Platz unter der Leiste, nur der Rahmen-Inhalt scrollt.

## Dateiänderungen

| Datei | Änderung |
| --- | --- |
| `static-site/kiosk-klassisch.html` | Panel, Rahmen, CSS, switchTab, isBusy; Getränke-Tab im Klassik-Gerüst ans Ende (die Reiterleiste kommt aus dem Generator) |
| `tools/build-kiosk-neu.js` | `REITER`: Reihenfolge, Reiter `wochenplan` (kurz „Woche") |
| `static-site/kiosk.html`, `kiosk-neu.html`, `css/kiosk-base.css` | generiert |
| `static-site/cms.js` | Embed-Modus |
| `tests/cms-angebote-ablauf.spec.js` | Zeile 353: letzter Reiter ist `getraenke` |
| `tests/kiosk-wochenplan.spec.js` | neue Tests TC-F1…F6 |

## Risiken

- Verlauf/Android-Zurück im Rahmen: durch Embed-Modus ohne History-Einträge entschärft (TC-F3-04).
- Zwei Skripte im selben Ursprung teilen Anmeldung: gewollt.
- Generierte Dateien: nur über Generatoren ändern.
