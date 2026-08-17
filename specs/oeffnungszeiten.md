# Öffnungszeiten – Spec

> **Feature-ID**: OEFFNUNGSZEITEN
> **Status**: Bestand (retrospektiv dokumentiert)
> **Erstellt**: 2026-07-07

---

## 1. Überblick

Verwaltung und Anzeige der Öffnungszeiten (Laden und Poststelle). Startseite und
Shop zeigen die Zeiten; im CMS werden sie bearbeitet. Speicherung in Dataverse
`dl_oeffnungszeits`.

**Betroffene Dateien:**
- API: `api/hours/` (Route `hours/{id?}`)
- Frontend: `static-site/index.html`, `static-site/shop.html`, `static-site/oeffnungszeiten.html`, `static-site/cms.js`

## 2. Datenmodell (`dl_oeffnungszeits`)

| Feld | Bedeutung |
| --- | --- |
| `dl_oeffnungszeitid` | Primärschlüssel |
| `dl_wochentag` | Wochentag (Code) |
| `dl_name` | Anzeigename (z. B. „Montag") |
| `dl_von`, `dl_bis` | Zeiten |
| `dl_sortierung` | Reihenfolge |

## 3. Requirements

### F1: Öffnungszeiten-API (`/api/hours` GET/PATCH)

#### F1 Behaviour / Acceptance

- **GET** → alle Einträge, sortiert nach `dl_sortierung` aufsteigend.
- **PATCH** über `{id}` oder `{dl_wochentag, dl_name}` (Lookup) → aktualisiert `dl_von`/`dl_bis`/`dl_geschlossen`.

#### F1 Test Cases

**TC-OEFFNUNGSZEITEN-F1-01: Liste laden**
- **Expected:** Einträge in korrekter Reihenfolge.

**TC-OEFFNUNGSZEITEN-F1-02: Zeit ändern**
- **Action:** `PATCH hours/{id}` mit `{dl_von:"09:00"}`.
- **Expected:** Neuer Wert gespeichert.

### F2: Anzeige (Startseite, Shop, `oeffnungszeiten.html`)

#### F2 Behaviour / Acceptance

- Startseite/Shop laden `/api/hours` und zeigen die aktuellen Zeiten.
- `oeffnungszeiten.html` zeigt statische Tabellen (Laden + Post) plus dynamischen Loader `#dyn-hours`.

#### F2 Test Cases

**TC-OEFFNUNGSZEITEN-F2-01: Anzeige aktuell**
- **Expected:** Angezeigte Zeiten entsprechen `/api/hours`.

## 4. Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 | TC-OEFFNUNGSZEITEN-F1-01..02 | — | — |
| F2 | TC-OEFFNUNGSZEITEN-F2-01 | — | — |
