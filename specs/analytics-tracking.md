# Website-Analytics & Tracking – Spec

> **Feature-ID**: ANALYTICS
> **Status**: Bestand (retrospektiv dokumentiert)
> **Erstellt**: 2026-07-07

---

## 1. Überblick

Datenschutzfreundliche, cookielose Reichweitenmessung der Website. Jeder
Seitenaufruf wird per `navigator.sendBeacon()` an `/api/track` gemeldet und in
Azure Table Storage (Tabelle `analytics`) geschrieben. Das CMS-Dashboard liest
über `/api/analytics` aggregierte Kennzahlen.

Besucher werden nur als **täglicher Hash** (`SHA256(ip:user-agent:datum)[:16]`)
gespeichert – keine IP, keine Cookies. Geolocation (Stadt/Region/Land) kommt aus
ip-api.com; die IP selbst wird nicht persistiert.

**Betroffene Dateien:**
- API: `api/track/` (Schreiben), `api/analytics/` (Aggregation)
- Frontend: `static-site/js/pwa.js` (Beacon-Tracker), `static-site/cms.js` (Dashboard)

## 2. Non-Goals

- Kein Cross-Site-/Third-Party-Tracking, keine Werbe-IDs.
- CMS-Seiten (`/cms*`) werden bewusst **nicht** getrackt.

## 3. Datenmodell (Azure Table `analytics`)

| Feld | Bedeutung |
| --- | --- |
| `PartitionKey` | Datum `YYYY-MM-DD` |
| `RowKey` | `HHMMSS-<visitorhash>-<page-md5[:6]>` |
| `page` | Pfad, max. 200 Zeichen |
| `referrer` | Referrer-Domain |
| `visitor` | SHA256-Hash (16 Zeichen), pro Tag eindeutig |
| `hour` | Stunde 0–23 |
| `screenW` | Bildschirmbreite (px); `<768` ⇒ mobil |
| `city`, `region`, `country` | Aus IP-Geolocation (IP nicht gespeichert) |
| `ua`, `ts` | User-Agent, Zeitstempel |

Lokale IPs (`10.*`, `192.168.*`, `::1`) ⇒ `city="Lokal"`, `country="DE"`.

## 4. Requirements

### F1: Seitenaufruf erfassen (`POST /api/track`)

#### F1 Inputs

| Input | Required | Beschreibung |
| --- | --- | --- |
| `page` | Ja | Pfad, z. B. `/shop.html` |
| `referrer` | Nein | Referrer oder leer |
| `sw` | Nein | Bildschirmbreite px |

#### F1 Behaviour / Acceptance

- Gültiges JSON → schreibt eine Zeile in `analytics`, Antwort `200 {ok:true}`.
- Ungültiges JSON → `400 {error:"invalid json"}`.
- Besucher-Hash wird serverseitig berechnet; IP wird nicht gespeichert.

#### F1 Test Cases

**TC-ANALYTICS-F1-01: Aufruf wird gespeichert**
- **Action:** `POST /api/track` mit `{page:"/",sw:1920}`.
- **Expected:** `200 {ok:true}`; neue Zeile mit korrektem `PartitionKey` (heute), `visitor`-Hash, `hour`.

**TC-ANALYTICS-F1-02: CMS-Seiten nicht getrackt**
- **Setup:** Aufruf einer `/cms`-Seite.
- **Expected:** `pwa.js` sendet keinen Beacon.

**TC-ANALYTICS-F1-03: Kein PII**
- **Expected:** Gespeicherte Zeile enthält keine IP; `visitor` ist gehasht.

### F2: Kennzahlen abrufen (`GET /api/analytics`)

#### F2 Inputs

| Input | Required | Beschreibung |
| --- | --- | --- |
| `days` | Nein | Zeitraum in Tagen, Default 30, max. 90 |

#### F2 Behaviour / Acceptance

- Liefert `period`, `totals` (views/visitors), `today`, `timeline[]`, `topPages[]`, `topReferrers[]`, `hourly[24]`, `devices{mobile,desktop}`, `topCities[]`, `topRegions[]`.
- `days` > 90 wird auf 90 begrenzt.

#### F2 Test Cases

**TC-ANALYTICS-F2-01: Standard-Zeitraum**
- **Action:** `GET /api/analytics`.
- **Expected:** `200`; `period.days=30`; alle Aggregat-Felder vorhanden.

**TC-ANALYTICS-F2-02: Begrenzung**
- **Action:** `GET /api/analytics?days=365`.
- **Expected:** `period.days=90`.

## 5. Open Questions

- [NEEDS CLARIFICATION: ip-api.com Free-Tier (45 req/min) – Rate-Limit-Verhalten bei Lastspitzen dokumentieren?]

## 6. Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 | TC-ANALYTICS-F1-01..03 | — | — |
| F2 | TC-ANALYTICS-F2-01..02 | — | — |
