# Angebot-Bilder – Laden, Speichern, Anzeigen

## Übersicht
Produktbilder für Angebote werden in SharePoint (StrichcodeBilder-Ordner) gespeichert.
Der Dateiname im SharePoint = Wert aus dem Artikelnummer-Feld (Strichcode oder Produktname).

## Bildquellen (Priorität)
1. **Expliziter User-Upload** (📁-Button oder Clipboard-Paste) → sofort nach SharePoint
2. **Auto-Preload aus SharePoint** beim Bearbeiten einer Aktion (nur Vorschau, kein Re-Upload)
3. **Flyer-Rendering** lädt fehlende Bilder direkt aus SharePoint

## Architektur-Entscheidungen
- **Kein `_artikelCache`-Lookup** für Bild-Keys. Der Wert im Artikelnummer-Feld IST der SharePoint-Dateiname.
  - Grund: `_artikelCache` kann falsche Strichcodes für Eigenprodukte zurückliefern (z.B. Duplo statt Kirschkörbchen)
- **Kein Edeka-Nr / Werbebilder-Folder** – veraltet, wird nicht mehr verwendet
- **`data-bild-dirty` Flag**: Unterscheidet User-Uploads von Auto-Preloads
  - `data-bild-dirty=""` → Auto-Preload (kein Re-Upload beim Speichern)
  - `data-bild-dirty="1"` → User hat Bild explizit hochgeladen (wird an werbebilder API geschickt)

## Bekannte Fehler / Learnings
| Datum | Problem | Ursache | Fix |
|---|---|---|---|
| 2026-06-22 | Flyer zeigt falsches Bild (Duplo statt Kirschkörbchen) | `_artikelCache.find()` liefert falschen Strichcode für Eigenprodukte → falsches Bild aus SharePoint geladen | `_artikelCache`-Lookup entfernt, direkt `artikelnummer` als SP-Key |
| 2026-06-22 | Bild im Strichcodefolder wird beim Speichern überschrieben | Auto-Preload setzt `bild_data` → beim Speichern wird Bild unnötig erneut an API geschickt → API lädt erneut nach SP | `data-bild-dirty` Flag: nur User-Uploads re-uploaden |
| 2026-06-22 | Artikelnummer-Feld zu klein | CSS: 85px Spaltenbreite für EAN-13 zu schmal | Auf 120px verbreitert |

## Akzeptanzkriterien
- [x] AK-AB-01: Artikelnummer-Feld zeigt vollständige EAN-13 Strichcodes an (≥120px)
- [x] AK-AB-02: Flyer-Rendering verwendet `artikelnummer` direkt als SharePoint-Key (kein `_artikelCache`)
- [x] AK-AB-03: Auto-Preload beim Bearbeiten überschreibt keine User-Uploads
- [x] AK-AB-04: Nur explizite User-Uploads werden beim Speichern an die werbebilder API geschickt
- [x] AK-AB-05: Upload/Paste verwendet `artikelnummer` direkt als SP-Key (kein `_artikelCache`)

## Status
- [x] Spec erstellt (2026-06-22)
- [x] Bug-Fixes implementiert
- [ ] Live-Test ausstehend
