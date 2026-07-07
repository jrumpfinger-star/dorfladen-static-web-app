# Shop-Konten & Authentifizierung – Spec

> **Feature-ID**: AUTH
> **Status**: Bestand (retrospektiv dokumentiert)
> **Erstellt**: 2026-07-07

---

## 1. Überblick

Kundenkonten für den Click-&-Collect-Shop (`shop.html`). Kundinnen registrieren
sich mit Adress- und SEPA-Daten, bestätigen ihre E-Mail per Link, melden sich an
(JWT für 90 Tage) und können ihr Passwort zurücksetzen. Admins können im CMS ein
Kundenpasswort direkt neu setzen.

Backend: vier Azure-Functions (Python, Auth-Level `anonymous`), Speicherung in
Dataverse-Tabelle `dl_shopkundes`. Passwörter werden mit `bcrypt` gehasht, JWTs
mit `HS256` und dem Secret `SHOP_JWT_SECRET` signiert. E-Mails werden über
Microsoft Graph (`sendMail`) versendet.

**Betroffene Dateien:**
- API: `api/auth-register/`, `api/auth-login/`, `api/auth-verify/`, `api/auth-reset/`
- Frontend: `static-site/shop.html` (Login/Registrierung/Reset-Formulare), `static-site/cms.js` (Admin-Reset)

## 2. Non-Goals

- Keine Social-/OAuth-Logins.
- Kein kostenpflichtiger Key-Vault-Dienst – die IBAN wird symmetrisch (Fernet/AES) mit einem App-Setting-Schlüssel verschlüsselt (siehe Abschnitt 5).
- Keine Rollen-/Rechteverwaltung über dieses Feature (Admin-Zugang wird separat geregelt).

## 3. Datenmodell (`dl_shopkundes`)

| Feld | Bedeutung |
| --- | --- |
| `dl_shopkundeid` | Primärschlüssel (GUID) |
| `dl_email` | E-Mail, immer lowercase gespeichert |
| `dl_passwort_hash` | bcrypt-Hash |
| `dl_vorname`, `dl_nachname`, `dl_telefon`, `dl_strasse`, `dl_plz`, `dl_ort` | Stammdaten |
| `dl_iban_encrypted`, `dl_kontoinhaber` | SEPA-Bankdaten |
| `dl_mandatsreferenz`, `dl_mandatsdatum`, `dl_mandatstyp` (`RCUR`), `dl_mandatsstatus`, `dl_sepa_mandat_json` | SEPA-Mandat |
| `dl_email_verifiziert` | Bool, Default `false` |
| `dl_aktiv` | Bool, Default `true` |
| `dl_verify_token` | UUID für E-Mail-Bestätigung, nach Verifizierung geleert |
| `dl_reset_token` | JSON `{token, expiry}` für Passwort-Reset (60 min gültig) |

## 4. Requirements

### F1: Registrierung (`POST /api/auth-register`)

#### F1 Description

Legt einen neuen Kunden an, validiert alle Pflichtfelder und Zustimmungen,
erzeugt ein SEPA-Mandat und verschickt eine Bestätigungs-E-Mail.

#### F1 Inputs

| Input | Required | Beschreibung |
| --- | --- | --- |
| `email` | Ja | Gültige E-Mail (RFC-Regex) |
| `passwort` | Ja | Min. 8 Zeichen |
| `vorname`, `nachname`, `telefon`, `strasse`, `plz`, `ort` | Ja | Stammdaten |
| `iban` | Ja | IBAN mit Prüfziffer (mod 97) |
| `kontoinhaber` | Ja | Kontoinhaber |
| `sepa_zustimmung`, `dsgvo_zustimmung`, `agb_zustimmung` | Ja | Müssen `true` sein |

#### F1 Behaviour / Acceptance

- Bei ungültigen Feldern → `400` mit `{success:false, errors:[...]}`.
- Bereits registrierte E-Mail → `409`.
- Erfolg → `201` mit `id`, `mandatsreferenz` (`DL-YYYY-XXXXX`), Gläubiger-Infos; `dl_email_verifiziert=false`, `dl_verify_token` gesetzt; Bestätigungs-E-Mail mit Link `/api/auth-verify?token=…&email=…`.

#### F1 Test Cases

**TC-AUTH-F1-01: Erfolgreiche Registrierung**
- **Setup:** Neue, valide Daten, alle Zustimmungen `true`.
- **Action:** `POST /api/auth-register`.
- **Expected:** `201`; neuer Datensatz in `dl_shopkundes`; `dl_email_verifiziert=false`; Bestätigungs-E-Mail versendet.

**TC-AUTH-F1-02: Doppelte E-Mail**
- **Setup:** E-Mail existiert bereits.
- **Expected:** `409`, kein neuer Datensatz.

**TC-AUTH-F1-03: Fehlende Zustimmung / ungültige IBAN**
- **Setup:** `agb_zustimmung=false` oder IBAN mit falscher Prüfziffer.
- **Expected:** `400`, `errors` enthält passende Meldung, kein Datensatz.

### F2: Login (`POST /api/auth-login`)

#### F2 Description

Prüft E-Mail/Passwort und liefert ein 90-Tage-JWT sowie Kundendaten.

#### F2 Inputs

| Input | Required | Beschreibung |
| --- | --- | --- |
| `email` | Ja | Kunden-E-Mail |
| `passwort` | Ja | Passwort |
| `resend_verify` | Nein | Wenn `true`, Bestätigungs-E-Mail erneut senden |

#### F2 Behaviour / Acceptance

- Falsche Credentials → `401` `{success:false}`.
- Nicht verifizierte E-Mail → `403` mit `email_not_verified:true`.
- Deaktiviertes Konto (`dl_aktiv=false`) → `403`.
- Erfolg → `200` mit `token` und `kunde` (`id, vorname, nachname, email, email_verifiziert`).

#### F2 Test Cases

**TC-AUTH-F2-01: Erfolgreicher Login**
- **Setup:** Verifizierter, aktiver Kunde, korrektes Passwort.
- **Expected:** `200`, gültiges JWT, `kunde`-Objekt.

**TC-AUTH-F2-02: Unverifizierte E-Mail**
- **Setup:** Kunde mit `dl_email_verifiziert=false`.
- **Expected:** `403`, `email_not_verified:true`.

**TC-AUTH-F2-03: Falsches Passwort**
- **Expected:** `401`, kein Token.

### F3: E-Mail-Bestätigung (`GET /api/auth-verify`)

#### F3 Description

Öffnet der Kunde den Link aus der E-Mail, wird das Konto verifiziert. Antwort ist
eine HTML-Seite (Erfolg oder „Ungültiger Link").

#### F3 Inputs

| Input | Required | Beschreibung |
| --- | --- | --- |
| `token` | Ja | Verify-Token (Query) |
| `email` | Ja | Kunden-E-Mail (Query) |

#### F3 Behaviour / Acceptance

- Gültig → `dl_email_verifiziert=true`, `dl_verify_token` geleert; HTML „E-Mail bestätigt".
- Ungültig/abgelaufen → HTML „Ungültiger Link" (Status 200).

#### F3 Test Cases

**TC-AUTH-F3-01: Gültiger Token**
- **Setup:** Kunde mit passendem `dl_verify_token`.
- **Action:** `GET /api/auth-verify?token=…&email=…`.
- **Expected:** Konto verifiziert, Erfolgs-HTML mit Link „Zum Shop".

**TC-AUTH-F3-02: Falscher Token**
- **Expected:** Fehler-HTML, Konto bleibt unverifiziert.

### F4: Passwort-Reset (`POST /api/auth-reset`)

#### F4 Description

Drei Aktionen über `action`-Feld: `request` (Reset anfordern), `confirm` (mit Token
neues Passwort setzen), `admin-reset` (Admin setzt Passwort direkt per `kunde_id`).

#### F4 Inputs

| Input | Required | Beschreibung |
| --- | --- | --- |
| `action` | Ja | `request` \| `confirm` \| `admin-reset` |
| `email` | bei `request`/`confirm` | Kunden-E-Mail |
| `token` | bei `confirm` | Reset-Token aus E-Mail |
| `kunde_id` | bei `admin-reset` | Kunden-GUID |
| `passwort` | bei `confirm`/`admin-reset` | Neues Passwort, min. 8 Zeichen |

#### F4 Behaviour / Acceptance

- `request` → immer `200` (kein E-Mail-Enumeration); bei existierendem Konto wird `dl_reset_token` gesetzt (60 min gültig) und Reset-E-Mail mit Link `shop.html?reset_token=…&email=…` versendet.
- `confirm` → prüft Token/Ablauf, setzt neuen `dl_passwort_hash`, leert `dl_reset_token`. Ungültig/abgelaufen → `400`.
- `admin-reset` → setzt Passwort direkt (aus CMS).

#### F4 Test Cases

**TC-AUTH-F4-01: Reset anfordern (existierendes Konto)**
- **Expected:** `200`; `dl_reset_token` gesetzt; Reset-E-Mail versendet.

**TC-AUTH-F4-02: Reset anfordern (unbekannte E-Mail)**
- **Expected:** `200` mit generischer Meldung, kein Token, keine E-Mail.

**TC-AUTH-F4-03: Confirm mit gültigem Token**
- **Expected:** `200`; Passwort geändert; Token geleert; Login mit neuem Passwort möglich.

**TC-AUTH-F4-04: Confirm mit abgelaufenem Token**
- **Setup:** `expiry` in Vergangenheit.
- **Expected:** `400`, Passwort unverändert.

## 5. Data & Contracts

- JWT: `HS256`, Claims `sub` (Kunden-ID), `email`, `name`, `iat`, `exp` (+90 Tage), Secret `SHOP_JWT_SECRET`. Die Gültigkeit von **90 Tagen ist bewusst gewählt** (Dorfladen-Stammkunden, geringe Missbrauchsfläche, Komfort vor kurzer Session-Dauer).
- E-Mail-Versand: Microsoft Graph `sendMail` über Service-Konto.
- Gläubiger-ID (SEPA): `DE98ZZZ09999999999`, Gläubiger „Dorfladen Oberornau UG (haftungsbeschränkt)".
- **IBAN-Verschlüsselung:** Echte symmetrische Verschlüsselung mit Fernet (AES-128-CBC + HMAC-SHA256, Bibliothek `cryptography`). Der Schlüssel kommt aus dem App-Setting `IBAN_ENCRYPTION_KEY` (kein Secret im Repo). Neue Werte erhalten das Präfix `ENC2:`; Alt-Datensätze mit `ENC:` (Base64) bleiben rückwärtskompatibel lesbar. Fehlt der Key, greift eine geloggte Base64-Fallback-Kodierung.

## 6. Open Questions

- _(keine offenen Punkte)_

## 7. Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 | TC-AUTH-F1-01..03 | — | — |
| F2 | TC-AUTH-F2-01..03 | — | — |
| F3 | TC-AUTH-F3-01..02 | — | — |
| F4 | TC-AUTH-F4-01..04 | — | — |
