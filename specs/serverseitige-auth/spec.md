# Serverseitige Auth für Admin-/CMS-Write-Endpoints – Spec

> **Feature-ID**: SEC-AUTH
> **Status**: Entwurf
> **Erstellt**: 2026-07-08
> **Bezug**: Checkliste SEC-2

---

## 1. Überblick

Der Schreibzugriff auf CMS-/Admin-Funktionen ist derzeit **nur clientseitig**
geschützt: Der Passwort-Gate vergleicht im Browser einen SHA-256-Hash
(`cms.js`, `index.html` → `submitCmsGate()`), und die zugehörigen
Azure-Functions sind mit `"authLevel": "anonymous"` konfiguriert
(z. B. [api/cms-config/function.json](../../api/cms-config/function.json)).

**Folge:** Jeder kann die mutierenden Endpunkte (`POST /api/cms-config`,
`POST /api/logo`, `POST /api/news-save`, …) direkt aufrufen und Inhalte ändern,
**ohne** das CMS-Passwort zu kennen. Der Client-Gate ist reine Kosmetik.

Dieses Feature führt eine **serverseitige** Prüfung ein: Mutierende
Admin-/CMS-Requests müssen ein gültiges Auth-Token mitschicken, das der Server
gegen ein Geheimnis in den App-Settings validiert. Ohne gültiges Token → `401`.

**Plattform:** Azure Static Web Apps + Azure Functions (Python v1, `api/`),
statisches Frontend (`static-site/`).

---

## 2. Goals

- Mutierende Admin-/CMS-Endpunkte lehnen Requests ohne gültiges Auth-Token mit
  `401 Unauthorized` ab.
- Das CMS-Passwort wird **serverseitig** validiert (nicht mehr nur im Browser).
- Zentrale, wiederverwendbare Prüf-Funktion (analog `shared/dataverse.py`).
- Kein Klartext-Passwort und kein Passwort-Hash mehr fest im ausgelieferten
  HTML/JS.
- Rückwärtskompatibel für **lesende** (öffentliche) Zugriffe: `GET` bleibt offen.

## 3. Non-Goals

- **Kunden-/Shop-Auth** (Endpunkte `auth-login`, `auth-register`, `auth-verify`,
  `auth-reset`, `shop-order`, `lunch-order`, `fleisch-order`, `shop-favorites`,
  `push-subscribe`, `track`) wird von diesem Feature **nicht** verändert – diese
  haben ihre eigene Logik bzw. sind bewusst öffentlich.
- Kein vollwertiges Benutzer-/Rollen-System, keine Einzelnutzer-Logins fürs CMS
  (ein gemeinsames CMS-Geheimnis genügt vorerst).
- Keine Änderung der SWA-`staticwebapp.config.json`-Routen-Rollen (wird in der
  Plan-Phase als Alternative bewertet, ist aber nicht Ziel dieser Spec).
- Kein Audit-Trail (separater Backlog-Punkt C-04/K-04).

---

## 4. Requirements

### F1: Zentrale serverseitige Auth-Prüfung

#### F1 Description

Eine wiederverwendbare Funktion `require_admin_auth(req)` in
`api/shared/auth.py` prüft, ob ein Request ein gültiges Admin-Token trägt.
Sie wird von allen geschützten Endpunkten bei **mutierenden** Methoden
(`POST`, `PUT`, `PATCH`, `DELETE`) aufgerufen.

#### F1 Inputs

| Input | Required | Beschreibung |
| --- | --- | --- |
| Header `X-CMS-Auth` | Ja | Vom Client mitgeschicktes Token |
| App-Setting `CMS_AUTH_TOKEN` | Ja | Serverseitiges Geheimnis (Vergleichswert) |

#### F1 Behaviour / Acceptance

- Fehlt `CMS_AUTH_TOKEN` in der Umgebung → `500` mit klarer Fehlermeldung
  (Fehlkonfiguration, **kein** stiller Durchlass).
- Header fehlt oder Wert ≠ erwartetes Token → Funktion signalisiert „nicht
  autorisiert"; der Endpunkt antwortet `401` und führt **keine** Mutation aus.
- Vergleich erfolgt konstant-zeitig (`hmac.compare_digest`), um Timing-Angriffe
  zu vermeiden.
- `OPTIONS` (CORS-Preflight) und `GET` werden **nicht** geblockt.

#### F1 Test Cases

**TC-F1-01: Fehlendes Token → 401**
- **Setup:** `CMS_AUTH_TOKEN` gesetzt.
- **Action:** `POST /api/cms-config` ohne `X-CMS-Auth`.
- **Expected:** `401`, Dataverse wird nicht verändert.

**TC-F1-02: Falsches Token → 401**
- **Setup:** `CMS_AUTH_TOKEN=geheim`.
- **Action:** `POST /api/cms-config` mit `X-CMS-Auth: falsch`.
- **Expected:** `401`.

**TC-F1-03: Gültiges Token → Mutation erlaubt**
- **Setup:** `CMS_AUTH_TOKEN=geheim`.
- **Action:** `POST /api/cms-config` mit `X-CMS-Auth: geheim`.
- **Expected:** `200`, Wert wird gespeichert (bisheriges Verhalten).

**TC-F1-04: GET bleibt offen**
- **Action:** `GET /api/cms-config` ohne Token.
- **Expected:** `200` (unverändert).

**TC-F1-05: Fehlkonfiguration**
- **Setup:** `CMS_AUTH_TOKEN` **nicht** gesetzt.
- **Action:** `POST /api/cms-config` mit beliebigem Token.
- **Expected:** `500` (kein stiller Durchlass, keine Mutation).

---

### F2: Server-Login-Endpoint

#### F2 Description

Neuer Endpunkt `POST /api/cms-auth` validiert das CMS-Passwort serverseitig und
gibt bei Erfolg das Admin-Token zurück, das der Client anschließend als
`X-CMS-Auth`-Header verwendet.

#### F2 Inputs

| Input | Required | Beschreibung |
| --- | --- | --- |
| Body `{ "password": "..." }` | Ja | Vom Nutzer eingegebenes CMS-Passwort |
| App-Setting `CMS_PW_HASH` | Ja | SHA-256-Hash des gültigen Passworts |
| App-Setting `CMS_AUTH_TOKEN` | Ja | Wird bei Erfolg zurückgegeben |

#### F2 Behaviour / Acceptance

- SHA-256(Passwort) == `CMS_PW_HASH` → `200 { "token": "<CMS_AUTH_TOKEN>" }`.
- Sonst → `401`, kein Token.
- Passwort-Hash liegt **nur** serverseitig (App-Setting), nicht im HTML.

#### F2 Test Cases

**TC-F2-01: Richtiges Passwort → Token**
- **Setup:** `CMS_PW_HASH` = Hash von `test123`.
- **Action:** `POST /api/cms-auth` mit `{"password":"test123"}`.
- **Expected:** `200`, Body enthält `token`.

**TC-F2-02: Falsches Passwort → 401**
- **Action:** `POST /api/cms-auth` mit `{"password":"falsch"}`.
- **Expected:** `401`, kein `token`.

---

### F3: Geschützte Endpunkte (mutierende Methoden)

#### F3 Description

Alle Admin-/CMS-Endpunkte rufen bei mutierenden Methoden `require_admin_auth`
auf. `GET` bleibt öffentlich.

#### F3 Behaviour / Acceptance

Zu schützen (mutierende Methoden): `cms-config`, `logo`, `news-save`,
`news-delete`, `angebote`, `wochenplan`, `hours`, `werbebilder`, `gallery`,
`social-post`, `social-katalog`, `tagespost`, `meta-catalog`, `shop-setup`,
`shop-admin`, `shop-freigabe`, `push-send`, `push-image`.

Nicht betroffen (öffentlich / eigene Auth, siehe Non-Goals): `auth-*`,
`shop-order`, `lunch-order`, `fleisch-order`, `shop-articles` (GET),
`shop-favorites`, `push-subscribe`, `track`, `analytics` (GET), `preisliste`,
`roterpunkt`, `news` (GET), `stammkunden`.

> [NEEDS CLARIFICATION: Die exakte Methoden-Matrix (welche HTTP-Methode je
> Endpunkt mutierend ist) wird in der Plan-Phase aus den `function.json` +
> `main()`-Verzweigungen abgeleitet und hier bestätigt.]

#### F3 Test Cases

**TC-F3-01: Repräsentative Endpunkte ohne Token → 401**
- **Action:** `POST` gegen `logo`, `news-save`, `angebote`, `push-send` ohne Token.
- **Expected:** je `401`, keine Mutation.

**TC-F3-02: Kunden-Endpunkt unberührt**
- **Action:** `POST /api/shop-order` (gültige Kundenbestellung) ohne `X-CMS-Auth`.
- **Expected:** funktioniert wie bisher (kein `401` durch dieses Feature).

---

### F4: Client sendet Token

#### F4 Description

Nach erfolgreichem Login (`/api/cms-auth`) speichert der Client das Token in
`sessionStorage` und schickt es bei jedem Schreib-Request als `X-CMS-Auth`.

#### F4 Behaviour / Acceptance

- CMS-Login (`cms.js`) und Homepage-Gate (`index.html`) rufen `/api/cms-auth`
  statt rein clientseitigem Hash-Vergleich.
- Zentraler Fetch-Wrapper hängt `X-CMS-Auth` an alle mutierenden Requests.
- Bei `401` einer Schreibaktion → Nutzer wird zur erneuten Anmeldung geführt.

#### F4 Test Cases

**TC-F4-01: End-to-End Login + Speichern (Playwright)**
- **Setup:** CMS-Seite, gültiges Passwort.
- **Action:** Anmelden, eine Seiteninhalt-Änderung speichern.
- **Expected:** Speichern erfolgreich; Request trägt `X-CMS-Auth`.

**TC-F4-02: Abgelaufene/fehlende Session (Playwright)**
- **Setup:** `sessionStorage` geleert.
- **Action:** Schreibaktion auslösen.
- **Expected:** Re-Login-Aufforderung, keine stille 401-Fehlermeldung.

---

## 5. Data & Contracts

**Neue App-Settings (Azure):**

| Name | Bedeutung |
| --- | --- |
| `CMS_PW_HASH` | SHA-256-Hex des CMS-Passworts (serverseitig) |
| `CMS_AUTH_TOKEN` | Zufälliges Geheimnis (≥ 32 Zeichen), als `X-CMS-Auth` genutzt |

**Header:** `X-CMS-Auth: <token>`

**Neuer Endpoint:** `POST /api/cms-auth` → `200 { "token": "..." }` | `401`

**Antwort bei fehlender Auth:** `401 { "error": "unauthorized" }`

---

## 6. Rollout / Migration

- App-Settings **vor** dem Aktivieren der Prüfung setzen (sonst `500`).
- Reihenfolge: (1) `shared/auth.py` + `cms-auth`-Endpoint deployen,
  (2) Client auf Token umstellen, (3) `require_admin_auth` in geschützten
  Endpunkten aktivieren.
- Bestehendes clientseitiges Gate bleibt als UX-Schicht erhalten, ist aber
  nicht mehr die Sicherheitsgrenze.

---

## 7. Open Questions

- [NEEDS CLARIFICATION: Statisches gemeinsames Token vs. HMAC-signiertes,
  ablaufendes Token? Statisch ist einfacher, rotiert aber nur manuell.]
- [NEEDS CLARIFICATION: Sollen die Admin-Seiten (`shop-admin.html`,
  `kiosk.html`, `shop-freigabe.html`) denselben Login nutzen wie das CMS?]
- [NEEDS CLARIFICATION: Exakte Methoden-Matrix je Endpunkt (siehe F3).]

---

## 8. Traceability

| Requirement | Test Cases | Plan-Abschnitt | Tasks |
| --- | --- | --- | --- |
| F1 | TC-F1-01…05 | — | — |
| F2 | TC-F2-01, 02 | — | — |
| F3 | TC-F3-01, 02 | — | — |
| F4 | TC-F4-01, 02 | — | — |
