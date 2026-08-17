# Social-Media-Katalog & Meta-Commerce-Sync – Spec

> **Feature-ID**: SOCIAL-KATALOG
> **Status**: Bestand (retrospektiv dokumentiert)
> **Erstellt**: 2026-07-07

---

## 1. Überblick

Zwei zusammenhängende Backend-Features für Social-Media/Marketing:

1. **Social-Katalog** (`/api/social-katalog`) – pflegt einen Bild-/Produktkatalog
   in SharePoint (`SocialMedia`-Ordner, `katalog.json`, `mittagstisch-bilder.json`),
   inkl. Upload von Mittagstisch-Bildern aus dem CMS.
2. **Meta-Commerce-Sync** (`/api/meta-catalog`) – synchronisiert Mittagessen als
   Produkte in den Meta-(Facebook-)Commerce-Katalog (`27188960997392965`).

**Betroffene Dateien:**
- API: `api/social-katalog/`, `api/meta-catalog/`
- Frontend: `static-site/cms.js` (Katalogpflege, Mittagstisch-Bild-Upload)

## 2. Non-Goals

- Keine öffentliche Frontend-Seite (rein CMS-/Admin-getrieben).

## 3. Requirements

### F1: Social-Katalog (`/api/social-katalog` GET/POST/PATCH/DELETE)

#### F1 Behaviour / Acceptance

- **GET** → `{katalog:[…], mittagstisch_bilder:[…]}`; Default-Kategorien (Mittagessen, Kuchen, Obst & Gemüse, Aufstriche, Salate).
- **POST** `?action=mt-bild` (multipart) → Mittagstisch-Bild hochladen.
- **POST** (allg.) → Katalogeintrag anlegen/aktualisieren.
- **PATCH** → Metadaten aktualisieren.
- **DELETE** → Eintrag per ID entfernen.

#### F1 Test Cases

**TC-SOCIAL-KATALOG-F1-01: Katalog laden**
- **Expected:** `katalog` + `mittagstisch_bilder` vorhanden.

**TC-SOCIAL-KATALOG-F1-02: Mittagstisch-Bild hochladen**
- **Action:** `POST ?action=mt-bild`.
- **Expected:** Neues Bild in `mittagstisch-bilder.json`.

**TC-SOCIAL-KATALOG-F1-03: Eintrag löschen**
- **Expected:** Eintrag nicht mehr im Katalog.

### F2: Meta-Commerce-Sync (`/api/meta-catalog` GET/POST/DELETE)

#### F2 Behaviour / Acceptance

- **GET** → aktuelle Produkte im Meta-Katalog.
- **POST** → Produkt anlegen/synchronisieren (`retailer_id, name, description, price, currency, availability, image_url`) via Graph-`batch`.
- **DELETE** → Produkt per `retailer_id` entfernen.
- Quelle: Mittagessen aus Dataverse + Bilder aus SharePoint.

#### F2 Test Cases

**TC-SOCIAL-KATALOG-F2-01: Produkt synchronisieren**
- **Action:** `POST` mit gültigem Produkt.
- **Expected:** `success:true`, Meta-Produkt-ID zurück.

**TC-SOCIAL-KATALOG-F2-02: Produkt löschen**
- **Expected:** Produkt nicht mehr im Meta-Katalog.

## 4. Open Questions

- [NEEDS CLARIFICATION: Meta-Katalog-ID und Access-Token-Handling (Ablauf/Erneuerung) dokumentieren.]

## 5. Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 | TC-SOCIAL-KATALOG-F1-01..03 | — | — |
| F2 | TC-SOCIAL-KATALOG-F2-01..02 | — | — |
