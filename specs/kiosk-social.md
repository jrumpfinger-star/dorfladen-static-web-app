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
- [ ] Social-Tab wird im Kiosk angezeigt und ist klickbar
- [ ] Katalog laden, Produkt hinzufügen, bearbeiten, löschen funktioniert
- [ ] Post-Builder zeigt Katalog-Produkte und ermöglicht Auswahl
- [ ] Poster-Vorschau wird korrekt gerendert
- [ ] WhatsApp/Instagram-Sharing funktioniert
- [ ] CMS Social-Funktionalität bleibt unverändert (nach Migration auf social.js)

## Nicht enthalten
- "Verlauf" Sub-Tab (nur im CMS)
- CMS-Migration auf social.js (separater Schritt)
