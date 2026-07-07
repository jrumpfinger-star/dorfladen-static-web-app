# CMS-Inhalte & statische Seiten – Spec

> **Feature-ID**: CMS-INHALTE
> **Status**: Bestand (retrospektiv dokumentiert)
> **Erstellt**: 2026-07-07

---

## 1. Überblick

Zentrale Inhaltsverwaltung über `/api/cms-config`: Textbausteine und
Konfigurationswerte liegen in Dataverse `dl_seiteninhalts`, adressiert über
`dl_schluessel`. Rechts- und Info-Seiten laden ihren Inhalt aus dieser Config und
haben einen statischen Fallback im HTML. Das CMS bearbeitet die Werte.

**Betroffene Dateien:**
- API: `api/cms-config/`
- Frontend (Rechtstexte): `impressum.html`, `datenschutzerklaerung.html`, `agb.html`, `widerrufsrecht.html`
- Frontend (Info): `beirat.html`, `geschaeftsfuehrung.html`, `stille-gesellschafter.html`, `essen-im-dorfladen.html`
- Frontend (Sortiment-Texte): `sortiment.html`; `static-site/cms.js`

## 2. Non-Goals

- Kein freies Seiten-Routing/CMS-Templating – nur definierte Schlüssel.

## 3. Datenmodell (`dl_seiteninhalts`)

| Feld | Bedeutung |
| --- | --- |
| `dl_schluessel` | Config-Schlüssel (z. B. `agb_inhalt`, `sortiment_intro`, `shop_kontakt`) |
| `dl_wert` | Wert (Text oder JSON-String) |

**Bekannte Schlüssel (Auszug):**
`impressum_inhalt`, `datenschutz_inhalt`, `agb_inhalt`, `widerruf_inhalt`,
`beirat_inhalt`, `gf_inhalt`, `stille_gesellschafter_inhalt`, `essen_inhalt`,
`sortiment_intro`, `sortiment_highlights`, `sortiment_eco`, `shop_kontakt`,
`site_logo` (siehe `logo.md`).

## 4. Requirements

### F1: CMS-Config-API (`/api/cms-config` GET/POST)

#### F1 Inputs

| Input | Required | Beschreibung |
| --- | --- | --- |
| `full` (Query) | Nein | `true` ⇒ alle Einträge als strukturiertes JSON |
| `name`, `wert` (POST-Body) | Ja (POST) | Schlüssel + Wert |

#### F1 Behaviour / Acceptance

- **GET** → Config-Objekt (JSON-Werte geparst).
- **POST** `{name, wert}` → anlegen/aktualisieren, `{success:true, action:"created"|"updated", name}`.

#### F1 Test Cases

**TC-CMS-INHALTE-F1-01: Wert speichern & lesen**
- **Action:** `POST {name:"agb_inhalt", wert:"..."}` dann `GET`.
- **Expected:** Gelesener Wert entspricht gespeichertem.

**TC-CMS-INHALTE-F1-02: Voll-Export**
- **Action:** `GET ?full=true`.
- **Expected:** Alle Schlüssel als strukturiertes JSON.

### F2: Rechts- & Info-Seiten mit Fallback

#### F2 Behaviour / Acceptance

- Jede Seite lädt ihren Schlüssel aus `/api/cms-config`; ist kein Wert vorhanden oder API nicht erreichbar, wird der eingebettete statische HTML-Inhalt angezeigt.
- Betroffen: Impressum, Datenschutz, AGB, Widerruf, Beirat, Geschäftsführung, Stille Gesellschafter, Essen im Dorfladen.

#### F2 Test Cases

**TC-CMS-INHALTE-F2-01: API-Inhalt hat Vorrang**
- **Setup:** Config-Wert gesetzt.
- **Expected:** Seite zeigt Config-Inhalt.

**TC-CMS-INHALTE-F2-02: Fallback bei fehlendem Wert**
- **Setup:** Kein Config-Wert / API offline.
- **Expected:** Statischer Fallback sichtbar (keine leere Seite).

### F3: Sortiment-Texte

#### F3 Behaviour / Acceptance

- `sortiment_intro`, `sortiment_highlights`, `sortiment_eco` werden im CMS gepflegt und auf der Sortimentseite angezeigt.

#### F3 Test Cases

**TC-CMS-INHALTE-F3-01: Intro-Text**
- **Expected:** Gepflegter Intro-Text erscheint auf `sortiment.html`.

## 5. Open Questions

- [NEEDS CLARIFICATION: Exakte Schlüsselnamen der Rechtstexte (`*_inhalt`) im Code gegen Dataverse verifizieren – Reports zeigten teils abweichende Namen.]

## 6. Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 | TC-CMS-INHALTE-F1-01..02 | — | — |
| F2 | TC-CMS-INHALTE-F2-01..02 | — | — |
| F3 | TC-CMS-INHALTE-F3-01 | — | — |
