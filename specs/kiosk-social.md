# Kiosk Social Media Integration

## Beschreibung
Die Social-Media-Funktionen "Neuer Post" und "Katalog" aus dem CMS sollen 1:1 im Kiosk verfügbar sein. Die Funktionalität wird in eine shared JavaScript-Datei (`social.js` + `social-poster.js`) extrahiert, die sowohl vom CMS als auch vom Kiosk verwendet wird.

## Anforderungen

### Tab-Struktur
- [x] Neuer Tab "Social" in der Kiosk-Tab-Leiste (neben Mittagstisch, Online-Shop, Stammkunden)
- [x] Sub-Tabs: "Neuer Post" und "Katalog" (kein "Verlauf" im Kiosk)
- [x] Tab-Wechsel lädt die Social-Daten (Katalog, Mittagstisch-Bilder)

### Katalog (Sub-Tab)
- [x] Produkte hinzufügen (Name, Kategorie, Preis, Bild)
- [x] Produkte bearbeiten, löschen
- [x] Bild per Drag&Drop, Datei-Upload oder Strg+V einfügen
- [x] Kategorien: Mittagessen, Kuchen, Obst & Gemüse, Aufstriche

### Neuer Post (Sub-Tab)
- [x] Titel-Auswahl (vorgefertigte + eigener Titel)
- [x] Freitext (optional)
- [x] Produkte aus Katalog auswählen
- [x] Heutiges Mittagessen (falls Wochenplan vorhanden)
- [x] Freie Produkt-Eingabe ohne Katalog
- [x] Poster-Vorschau (Canvas-Rendering)
- [x] WhatsApp-Teilen (mit Bestelllinks)
- [x] Instagram-Teilen
- [x] Poster herunterladen

### Shared Code
- [x] `static-site/js/social.js` – Katalog-Verwaltung, Post-Builder, Produkt-Picker
- [x] `static-site/js/social-poster.js` – Canvas-Poster-Rendering, Sharing, WA-Katalog

## Akzeptanzkriterien
- [x] AK-SO-01: Social-Tab wird im Kiosk angezeigt und ist klickbar
- [x] AK-SO-02: Katalog laden, Produkt hinzufügen, bearbeiten, löschen funktioniert
- [x] AK-SO-03: Post-Builder zeigt Katalog-Produkte und ermöglicht Auswahl
- [x] AK-SO-04: Poster-Vorschau wird korrekt gerendert
- [x] AK-SO-05: WhatsApp/Instagram-Sharing funktioniert
- [ ] AK-SO-06: CMS Social-Funktionalität bleibt unverändert (nach Migration auf social.js – nicht migriert, CMS hat eigenen Code)

## Nicht enthalten
- "Verlauf" Sub-Tab (nur im CMS)
- CMS-Migration auf social.js (separater Schritt, noch offen)

## Status
- [x] Spec erstellt
- [x] Implementierung (Social-Tab, Katalog, Post-Builder, Sharing)
- [ ] AK-SO-06 offen (CMS-Migration auf shared social.js)
