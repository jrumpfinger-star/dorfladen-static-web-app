# Werbebilder / Produktbilder – Spec

> **Feature-ID**: WERBEBILDER
> **Status**: Bestand (retrospektiv dokumentiert)
> **Erstellt**: 2026-07-07

---

## 1. Überblick

Produktbilder für den Shop. Bilder liegen in SharePoint (Haupt- und
Barcode-Ordner); Metadaten in Dataverse `dl_werbebilds`. Das Shared-Modul
`shop-images.js` lädt Bilder batchweise zu Artikeln (per EDEKA-Nr./Strichcode)
und zeigt sie in `shop.html`. Das CMS pflegt Bild-Metadaten.

**Betroffene Dateien:**
- API: `api/werbebilder/`
- Frontend: `static-site/shop-images.js`, `static-site/shop.html`, `static-site/cms.js`

## 2. Datenmodell

- Dataverse `dl_werbebilds` – Metadaten.
- SharePoint-Ordner `SP_FOLDER` (Haupt), `SP_BARCODE_FOLDER` (Barcode).

## 3. Requirements

### F1: Werbebilder-API (`/api/werbebilder` GET/POST)

#### F1 Inputs

| Input | Required | Beschreibung |
| --- | --- | --- |
| `sharepoint` (Query) | Nein | `1` ⇒ Batch-Load aus SharePoint (Graph `$batch`) |
| `articles` (POST-Body) | Ja (Batch) | Liste `{artikelnummer, edeka_nr, strichcode}` |

#### F1 Behaviour / Acceptance

- Sucht Bilder je Artikel per `edeka_nr` und `strichcode`, testet `.jpg/.png/.jpeg`.
- Max. 24 Artikel je Batch (Graph-Limit 20 Subrequests); Retry mit Backoff bei `429`/`5xx`.
- Antwort: Liste `{dl_artikelnummer, dl_bild_base64}`.

#### F1 Test Cases

**TC-WERBEBILDER-F1-01: Batch-Load**
- **Action:** `POST /api/werbebilder?sharepoint=1` mit Artikelliste.
- **Expected:** Für vorhandene Bilder base64-Daten zurück.

**TC-WERBEBILDER-F1-02: Kein Bild vorhanden**
- **Expected:** Artikel ohne Treffer wird ausgelassen/leer.

### F2: Bildanzeige im Shop (`shop-images.js`)

#### F2 Behaviour / Acceptance

- `ShopImages`-Modul lädt Bilder batchweise und zeigt sie zu Artikeln in `shop.html` (und Shop-Freigabe).

#### F2 Test Cases

**TC-WERBEBILDER-F2-01: Shop zeigt Produktbilder**
- **Expected:** Artikel mit Bild zeigen es an; ohne Bild Platzhalter.

## 4. Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 | TC-WERBEBILDER-F1-01..02 | — | — |
| F2 | TC-WERBEBILDER-F2-01 | — | — |
