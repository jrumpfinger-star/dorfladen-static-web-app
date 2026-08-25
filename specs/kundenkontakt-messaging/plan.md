# Kundenkontakt-Messaging — Implementation Plan

> Abgeleitet aus [spec.md](./spec.md). Übersetzt *was* in *wie*.

**Spec:** [spec.md](./spec.md)

**Status:** Draft

## Constitution Check

- [x] Spec existiert und hat keine offenen `[NEEDS CLARIFICATION]`-Marker
- [x] On-Prem/Portabilität: nutzt vorhandene Azure Functions + Dataverse + SharePoint
- [x] Keine Secrets im Repo (Dataverse-Feld/Tabelle via Metadata-API; App-Settings)
- [x] Folgt bestehenden Ordnerkonventionen (`api/<name>/`, `static-site/`)

## Technical Approach

Ein neues, per Feature-Flag freischaltbares 1:1-Chat-System, das die bewährten
Muster der Bestell-Kommunikation wiederverwendet:

- **Speicher:** Neue Dataverse-Tabelle `dl_kontaktnachricht`, eine Zeile pro Gerät
  (Thread). Verlauf als JSON in `dl_chatverlauf` (Einträge `{t,who,typ,text?,datei?}`).
- **Identität:** `device_id` (localStorage) als Schlüssel, optional E-Mail.
- **API:** `api/contact-message` (Kunde POST/GET my; Kiosk GET list/unread, PATCH).
  `api/contact-upload` (Bild-Upload → SharePoint), `api/kontaktbild` (Bild-Proxy,
  verkleinert wie `api/tagesbild`).
- **Push:** neue Kategorie `kontakt`; Zustellung per E-Mail **oder** `device_id`
  (wie bei Bestellungen). Store→Kunde bei Antwort; Kunde→Store nur Kiosk-Badge/Ton.
- **Frontend Homepage:** Chat-Panel (Overlay, Muster wie Bestellstatus-Chat),
  ersetzt die 1:1-„Frage"-WhatsApp-Einstiege (Float-Button, Footer-Icon, Button).
  Nur sichtbar bei aktivem Flag.
- **Frontend Kiosk:** neuer Tab „Kontakt" (Flag `kiosk_kontakt`) mit
  Konversationsliste, Ungelesen-Badge, Chat-Verlauf, Antwort-Eingabe, Bild senden.

Entwicklung/Erprobung auf **Branch `dev`** → TEST-SWA. Merge nach `main` erst nach
Freigabe; Feature bleibt in Prod per Flag `kiosk_kontakt=false` unsichtbar.

## Key Decisions

| Decision | Optionen | Wahl & Begründung |
| --- | --- | --- |
| Thread-Modell | pro Gerät vs pro Anfrage | Pro Gerät (WhatsApp-Gefühl, einfacher) |
| Bildspeicher | base64 im Verlauf vs SharePoint+Proxy | SharePoint+Proxy (kein Payload-Ballast, verkleinert) |
| Sichtbarkeit Homepage | immer vs Flag | Nur bei `kiosk_kontakt` (keine unbeaufsichtigten Nachrichten) |
| Personal-Benachrichtigung | Push vs Badge/Ton | Badge/Ton (v1, bestätigt) |
| Kategorie-Merge | überschreiben vs merge | merge (bestehende Push-Kategorien erhalten) |

## Architecture

```
Homepage (index.html + js)                 Kiosk (kiosk.html)
  └─ Chat-Overlay  ─┐                         └─ Tab "Kontakt" ─┐
                    │  POST/GET (device_id)                     │ GET list/unread, PATCH
                    ▼                                           ▼
             api/contact-message  ◄───────────────────────────┘
                    │  (Dataverse dl_kontaktnachricht: dl_chatverlauf JSON)
                    ├─ Push (Kategorie 'kontakt') via api/push-send
                    ├─ No-Reply-E-Mail via shop-notify.send_email(reply_to=…)
                    └─ Bilder: api/contact-upload (SharePoint) + api/kontaktbild (Proxy)
```

## File-Level Change Map

| Path | Change | Purpose |
| --- | --- | --- |
| Dataverse `dl_kontaktnachricht` | new (Metadata-API) | Thread-Tabelle (Felder s. Spec) |
| `api/contact-message/__init__.py` + `function.json` | new | Chat-API (Kunde + Kiosk) |
| `api/contact-upload/__init__.py` + `function.json` | new | Bild-Upload → SharePoint |
| `api/kontaktbild/__init__.py` + `function.json` | new | Bild-Proxy (verkleinert) |
| `api/push-subscribe/__init__.py` | edit | Kategorie `kontakt` in `ALL_CATEGORIES` |
| `static-site/index.html` | edit | Chat-Overlay + Einstiege ersetzen (Float/Footer/Button) |
| `static-site/js/app.js` (o. neu `js/kontakt.js`) | new/edit | Chat-Client (senden, laden, Bilder, Polling) |
| `static-site/kiosk.html` | edit | Tab „Kontakt", Liste, Verlauf, Antwort, Bild |
| `static-site/cms.html` + `cms.js` | edit | Feature-Flag-Checkbox `feat-k-kontakt` |
| `static-site/sw.js` / `js/pwa.js` | edit (falls nötig) | Push-Kategorie/Badge-Anpassung |

## Test Strategy

- **Unit (Python):** Verlauf-Parsing/Anhängen, Rate-Limit, Bild-Validierung,
  Push/E-Mail-Auslösung (mockbar).
- **E2E (Playwright, TEST-SWA):** F1 senden/laden, F2 Kiosk-Antwort, F3 Flag,
  F4 Push/E-Mail, F6 Einstieg öffnet Chat, F7 Bild senden/anzeigen.
- **Mapping:** jede `TC-Fn-xx` mind. einmal exerziert (siehe Traceability in Spec).

## Risks & Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Spam ohne Login | med | Rate-Limit + Honeypot + Zeichenlimit |
| Große Bild-Uploads | med | Clientseitige Kompression + serverseitig verkleinern |
| Prod-Sichtbarkeit vor Freigabe | high | Feature-Flag aus; Entwicklung auf `dev`/TEST |
| Dataverse-Feldgrenzen (Verlauf) | low | Memo groß dimensioniert (wie `dl_chatverlauf`) |

## Rollout

1. `dev`-Branch → TEST-SWA, iterativ.
2. Dataverse-Tabelle/Felder via Metadata-API (additiv).
3. E2E auf TEST grün.
4. Merge `dev` → `main` (Flag aus).
5. Freischaltung im CMS wenn Personal bereit.
