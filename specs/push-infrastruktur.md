# Push-Benachrichtigungen & PWA – Spec

> **Feature-ID**: PUSH
> **Status**: Bestand (retrospektiv dokumentiert)
> **Erstellt**: 2026-07-07

---

## 1. Überblick

Web-Push-Infrastruktur (VAPID) für die PWA. Besucher abonnieren
Benachrichtigungen nach Kategorien (`tagesinfo`, `news`). Abos liegen in
Dataverse (`dl_seiteninhalt`), der Versand läuft über `pywebpush`. Der Service
Worker (`sw.js`) zeigt die Benachrichtigungen an; `pwa.js` verwaltet
Registrierung, Kategorie-Einstellungen und Abmeldung.

**Betroffene Dateien:**
- API: `api/push-vapid-key/`, `api/push-subscribe/`, `api/push-send/`, `api/push-image/`
- Frontend: `static-site/sw.js`, `static-site/js/pwa.js`

## 2. Non-Goals

- Keine E-Mail-Benachrichtigungen (siehe `shop-infrastruktur.md`).
- Keine geplanten/zeitgesteuerten Kampagnen (Versand ist ereignis-/manuell getriggert).

## 3. Datenmodell

**Abo (Dataverse `dl_seiteninhalt`):**
- `dl_schluessel` = `push_sub_<hash(endpoint)[:16]>`
- `dl_wert` = JSON `{subscription:{endpoint,keys{p256dh,auth}}, categories:[...], email?}`

**Push-Bild:**
- `dl_schluessel` = `push_img_<hash>`, `dl_bezeichnung` = MIME, `dl_wert` = base64.

**Kategorien:** `tagesinfo` (Mittagstisch/Theke/Angebote), `news` (Neuigkeiten).
Legacy-Mapping: `mittagstisch` → `tagesinfo`, `angebote` → `tagesinfo`.

## 4. Requirements

### F1: VAPID-Public-Key (`GET /api/push-vapid-key`)

#### F1 Behaviour / Acceptance

- Liefert `{publicKey}` aus `VAPID_PUBLIC_KEY`; `500` wenn nicht konfiguriert.

#### F1 Test Cases

**TC-PUSH-F1-01: Key abrufen**
- **Expected:** `200 {publicKey}`.

### F2: Abo verwalten (`/api/push-subscribe` GET/POST/PATCH/DELETE)

#### F2 Behaviour / Acceptance

- **POST** `{subscription, categories?, email?, validate?}` → legt Abo an/aktualisiert; Default-Kategorien `["tagesinfo","news"]`.
- **GET** `?endpoint=` → aktuelle Kategorien (mit Legacy-Mapping).
- **PATCH** `{endpoint, categories}` → nur Kategorien aktualisieren.
- **DELETE** `{endpoint}` → Abo entfernen (`action:"unsubscribed"`).

#### F2 Test Cases

**TC-PUSH-F2-01: Abonnieren**
- **Action:** `POST` mit gültiger Subscription.
- **Expected:** `created`; Datensatz in Dataverse.

**TC-PUSH-F2-02: Kategorien ändern**
- **Action:** `PATCH` mit neuen `categories`.
- **Expected:** Gespeicherte Kategorien aktualisiert.

**TC-PUSH-F2-03: Abmelden**
- **Action:** `DELETE` mit `endpoint`.
- **Expected:** `unsubscribed`; Datensatz entfernt.

### F3: Push senden (`POST /api/push-send`)

#### F3 Inputs

| Input | Required | Beschreibung |
| --- | --- | --- |
| `message` | Ja | Text |
| `title` | Nein | Default „Dorfladen Oberornau" |
| `url`, `tag`, `image` | Nein | Ziel, Gruppierung, Bild |
| `category` | Nein | Nur Abos dieser Kategorie |
| `target_email` | Nein | Nur an dieses E-Mail-Abo |

#### F3 Behaviour / Acceptance

- Verschlüsselter Versand je Abo via VAPID (`aud` = Endpoint-Origin, `ttl=86400`).
- Antwort `{success, sent, failed, removed, total, errors}`.
- Abgelaufene Abos (`404`/`410`) werden automatisch gelöscht (`removed`).
- **GET** dient Debug/Monitoring (`?test=1` sendet Test-Push).

#### F3 Test Cases

**TC-PUSH-F3-01: Versand an alle**
- **Action:** `POST {message:"Test"}`.
- **Expected:** `sent` = Anzahl gültiger Abos.

**TC-PUSH-F3-02: Kategorie-Filter**
- **Action:** `POST {message, category:"news"}`.
- **Expected:** Nur `news`-Abos erhalten Push.

**TC-PUSH-F3-03: Abgelaufenes Abo bereinigt**
- **Setup:** Abo liefert `410`.
- **Expected:** `removed >= 1`; Datensatz gelöscht.

### F4: Push-Bild (`/api/push-image` GET/POST)

#### F4 Behaviour / Acceptance

- **POST** `{data}` (data-URL/base64) → speichert Bild, liefert `{url:"/api/push-image?name=…"}`.
- **GET** `?name=` → Binärbild, `Cache-Control: public, max-age=86400`.

#### F4 Test Cases

**TC-PUSH-F4-01: Upload & Abruf**
- **Expected:** POST liefert URL; GET liefert Bild mit korrektem Content-Type.

### F5: Service Worker & PWA (`sw.js`, `pwa.js`)

#### F5 Behaviour / Acceptance

- `sw.js` zeigt bei `push`-Event Notification (`title, body, icon, badge, tag`, Vibration `[200,100,200]`); Klick fokussiert/öffnet Ziel-URL.
- `pwa.js` registriert Abo über VAPID-Key, bietet Kategorie-Toggles, Ab-/Anmeldung, sendet Tracking-Beacon.
- `pushsubscriptionchange` erneuert Abo automatisch (Firefox).

#### F5 Test Cases

**TC-PUSH-F5-01: Notification-Anzeige**
- **Setup:** Push mit `{title, body, url}`.
- **Expected:** Notification sichtbar; Klick öffnet `url`.

**TC-PUSH-F5-02: Toggle Kategorie**
- **Expected:** Änderung wird per PATCH gespeichert.

## 5. Open Questions

- [NEEDS CLARIFICATION: `pwa.js freshSubscribe` nutzt in einem Pfad noch Legacy-Default `['mittagstisch','angebote','news']` – auf `['tagesinfo','news']` vereinheitlichen?]

## 6. Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 | TC-PUSH-F1-01 | — | — |
| F2 | TC-PUSH-F2-01..03 | — | — |
| F3 | TC-PUSH-F3-01..03 | — | — |
| F4 | TC-PUSH-F4-01 | — | — |
| F5 | TC-PUSH-F5-01..02 | — | — |
