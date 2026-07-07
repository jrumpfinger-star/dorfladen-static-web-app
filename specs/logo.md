# Logo-Verwaltung – Spec

> **Feature-ID**: LOGO
> **Status**: Bestand (retrospektiv dokumentiert)
> **Erstellt**: 2026-07-07

---

## 1. Überblick

Das Website-Logo wird zentral in Dataverse gespeichert und auf allen Seiten über
`logo-loader.js` in die Navigationsleiste geladen. Im CMS kann das Logo
hochgeladen, angezeigt und entfernt werden.

**Betroffene Dateien:**
- API: `api/logo/`
- Frontend: `static-site/js/logo-loader.js`, `static-site/cms.js`

## 2. Datenmodell

Dataverse `dl_seiteninhalts`, Schlüssel `site_logo`, Spalte `dl_logo` (Data-URI).

## 3. Requirements

### F1: Logo-API (`/api/logo` GET/POST/DELETE)

#### F1 Behaviour / Acceptance

- **GET** → `{success:true, logo:"data:image/…", mime}`.
- **POST** `{data:"data:image/png;base64,…"}` → speichert Logo.
- **DELETE** → entfernt Logo.

#### F1 Test Cases

**TC-LOGO-F1-01: Hochladen & Abrufen**
- **Expected:** POST speichert; GET liefert dasselbe Data-URI.

**TC-LOGO-F1-02: Löschen**
- **Expected:** GET liefert danach kein Logo mehr.

### F2: Logo-Anzeige (`logo-loader.js`)

#### F2 Behaviour / Acceptance

- Lädt `/api/logo` und setzt das Bild im `.nv-logo`-Element (Höhe 52px) auf allen Seiten.

#### F2 Test Cases

**TC-LOGO-F2-01: Anzeige**
- **Setup:** Logo gesetzt.
- **Expected:** `.nv-logo` zeigt das Logo.

## 4. Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 | TC-LOGO-F1-01..02 | — | — |
| F2 | TC-LOGO-F2-01 | — | — |
