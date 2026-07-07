# Shop-Infrastruktur (Setup & Benachrichtigung) – Spec

> **Feature-ID**: SHOP-INFRA
> **Status**: Bestand (retrospektiv dokumentiert)
> **Erstellt**: 2026-07-07

---

## 1. Überblick

Unterstützende Backend-Endpunkte für den Click-&-Collect-Shop, die nicht Teil des
Bestellablaufs selbst sind:

1. **Shop-Setup** (`/api/shop-setup`) – einmalige, idempotente Anlage der
   Dataverse-Tabellen (`dl_shopkunde`, `dl_shopbestellung`, `dl_shopposition`).
2. **Shop-Benachrichtigung** (`/api/shop-notify`) – sendet E-Mail (Graph) und
   Push, wenn eine Bestellung „Abholbereit" ist.

**Betroffene Dateien:**
- API: `api/shop-setup/`, `api/shop-notify/`
- Frontend: `static-site/cms.js` (Auslöser bei Statuswechsel)

## 2. Non-Goals

- Kein Bestell-CRUD (eigenes Bestellsystem/`bestellungen`).
- Kein Kundenkonto-Handling (siehe `auth-konten.md`).

## 3. Requirements

### F1: Shop-Setup (`POST /api/shop-setup`)

#### F1 Behaviour / Acceptance

- Prüft/erstellt drei Entitäten, jede mit Primärnamensattribut, UserOwned.
- Antwort: `{results:[{entity, status:"already_exists"|"created"}, …]}`.
- Idempotent: erneuter Aufruf ändert nichts.

#### F1 Test Cases

**TC-SHOP-INFRA-F1-01: Erstlauf**
- **Setup:** Tabellen fehlen.
- **Expected:** `created` für alle drei.

**TC-SHOP-INFRA-F1-02: Idempotenz**
- **Setup:** Tabellen existieren.
- **Expected:** `already_exists` für alle drei; keine Änderung.

### F2: Shop-Benachrichtigung (`POST /api/shop-notify`)

#### F2 Inputs

| Input | Required | Beschreibung |
| --- | --- | --- |
| `order_id` | Ja | Dataverse-GUID |
| `bestellnummer` | Ja | Bestellnummer |
| `kunde_email` | Ja | Kunden-E-Mail |
| `kunde_name` | Ja | Kundenname |

#### F2 Behaviour / Acceptance

- Lädt `shop_kontakt` aus `dl_seiteninhalts` (Fallback auf hartkodierte Kontaktdaten).
- Sendet HTML-E-Mail via Graph `sendMail` (Bestellnummer, Abholort, Öffnungszeiten, Kontakt).
- Löst zusätzlich Push aus (`/api/push-send`, best-effort).
- Antwort: `{success, notification_sent, email_sent}`.

#### F2 Test Cases

**TC-SHOP-INFRA-F2-01: Benachrichtigung „Abholbereit"**
- **Action:** `POST` mit gültigen Bestelldaten.
- **Expected:** `email_sent:true`; Push versucht; Antwort `success:true`.

**TC-SHOP-INFRA-F2-02: Kontakt-Fallback**
- **Setup:** `shop_kontakt` nicht in Dataverse.
- **Expected:** E-Mail nutzt hartkodierte Standard-Kontaktdaten.

## 4. Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 | TC-SHOP-INFRA-F1-01..02 | — | — |
| F2 | TC-SHOP-INFRA-F2-01..02 | — | — |
