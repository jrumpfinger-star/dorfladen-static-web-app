# Bildergalerie – Spec

> **Feature-ID**: GALERIE
> **Status**: Bestand (retrospektiv dokumentiert)
> **Erstellt**: 2026-07-07

---

## 1. Überblick

Öffentliche Bildergalerie (`bilder.html`) mit Kategorie-Filter und Lightbox. Die
Bilder liegen in SharePoint Online und werden über Microsoft Graph verwaltet. Das
CMS lädt, kategorisiert und löscht Bilder über `/api/gallery`.

**Betroffene Dateien:**
- API: `api/gallery/`
- Frontend: `static-site/bilder.html`, `static-site/cms.js`

## 2. Non-Goals

- Keine Bildbearbeitung (Zuschnitt/Filter) im Backend.

## 3. Datenmodell

SharePoint-Ordner (Graph `drive_id` + `item_id`, aufgelöst aus Sharing-Link);
Unterordner = Kategorie. Erlaubte Endungen: `.jpg .jpeg .png .gif .webp .bmp .svg`.

## 4. Requirements

### F1: Galerie-API (`/api/gallery` GET/POST/PUT/PATCH/DELETE)

#### F1 Behaviour / Acceptance

- **GET** → Struktur (Ordner/Bilder).
- **POST** (`multipart/form-data`: `file`, `category`, `description`) → lädt Bild hoch, legt Kategorie-Unterordner bei Bedarf an; Antwort `{success:true, id, name, size, category, description}`. Ungültige Endung → Fehler.
- **DELETE** (`{id}`) → Bild/Ordner entfernen.

#### F1 Test Cases

**TC-GALERIE-F1-01: Upload**
- **Expected:** `success:true`, Bild in korrekter Kategorie.

**TC-GALERIE-F1-02: Ungültiger Dateityp**
- **Setup:** `.exe`.
- **Expected:** Ablehnung, kein Upload.

**TC-GALERIE-F1-03: Löschen**
- **Expected:** Bild danach nicht mehr in GET-Liste.

### F2: Galerie-Seite (`bilder.html`)

#### F2 Behaviour / Acceptance

- Filter-Buttons je Kategorie, responsives Grid, Lightbox mit Vor/Zurück.

#### F2 Test Cases

**TC-GALERIE-F2-01: Filter & Lightbox**
- **Expected:** Filter zeigt nur Kategorie-Bilder; Klick öffnet Lightbox mit Navigation.

## 5. Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 | TC-GALERIE-F1-01..03 | — | — |
| F2 | TC-GALERIE-F2-01 | — | — |
