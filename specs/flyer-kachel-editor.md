# Flyer – Kachel-Editor (PCE)

## Übersicht
Der Kachel-Editor (PCE = Patch Canvas Editor) ermöglicht die visuelle Bearbeitung einzelner Produkt-Kacheln im Flyer. Er wird über `cms.js` bereitgestellt und speichert Layout-Overrides pro Artikel in Dataverse (`dl_seiteninhalt`, Schlüssel `plakat_article_overrides`).

## Funktionen
- [x] Bild verschieben (Drag & D-Pad)
- [x] Bild skalieren (Slider)
- [x] Bild rotieren (Slider)
- [x] Ghost-Modus (halbtransparente Kopie)
- [x] Duplikat-Modus (volle Kopie)
- [x] Eigenes Bild hochladen (`+ BILD` Button)
- [x] Drucken / Download

### Eigenes Bild (`customImg`)
- [x] Upload über File-Input (`#pce-custom-img`)
- [x] Bild wird beim Upload auf max 400×400 px komprimiert (JPEG 0.75 / PNG)
- [x] Base64-Data-URL wird in `ov.customImg` gespeichert
- [x] Bild wird als Overlay über die Kachel gerendert
- [x] Position, Größe, Rotation, Deckkraft einstellbar
- [x] Bild entfernen über Kontextmenü

### Speichern
- [x] Beim Klick auf "Speichern": `plakatArtOverrideSave(item, ov)` → `_dvSave('plakat_article_overrides', all)`
- [x] Payload-Größe wird vor dem Senden geprüft (max ~900 KB)
- [x] Bei zu großem Payload: Fehlermeldung per Toast
- [x] Bei HTTP-Fehler: Fehlermeldung per Toast (kein stilles Verschlucken)
- [x] Beim Klick auf "Verwerfen": initialer Zustand wird wiederhergestellt

## Bekannte Fehler / Learnings
| Datum | Problem | Ursache | Fix |
|---|---|---|---|
| 2026-06-22 | Eigenes Bild wird nach Speichern nicht auf dem Flyer angezeigt | Bild wurde als volle unkomprimierte Base64-Data-URL gespeichert → Dataverse `dl_wert` Feldgröße überschritten → stiller Fehler durch `.catch(function(){})` | 1. Bild beim Upload komprimieren (400×400, JPEG 0.75) 2. Fehler-Handling in `plakatArtOverrideSave` + `_dvSave` eingebaut |
| 2026-06-22 | customImg in Kachel gespeichert, aber nicht auf Flyer sichtbar | `drawAngebotPlakat`: customImg-Load ist async (`new Image().onload`) aber `toBlob(callback)` wartet nicht darauf. Klassisches Layout hatte customImg-Rendering gar nicht. | 1. customImg-Loads als Promises sammeln 2. `Promise.all` vor `toBlob` 3. customImg-Rendering im klassischen Layout hinzugefügt |
| 2026-06-22 | Kachel-Override (z.B. Donut) auf Main sichtbar, auf Feature-Branch nicht | `_flyerArtKey` nutzte `artikelnummer` als Key, aber `artikelnummer` ist instabil (EAN vs. Strichcode vs. Produktname-Fragment). Auf Main: Key=`4001686327487`, auf Feature-Branch: Key=`Saure`. | 1. `_flyerArtKey` nur noch `produkt`-basiert 2. Fallback-Migration: alte `artikelnummer`-Keys werden automatisch auf neuen `produkt`-Key migriert |
| 2026-06-22 | VERWERFEN schließt den Kachel-Editor statt nur Änderungen zurückzusetzen | `pce-close-discard` rief `closeEditor(true)` auf, was den Dialog komplett schloss | VERWERFEN setzt nur `ov=_clone(_initOv)` und re-rendert, ohne Dialog zu schließen |

## Akzeptanzkriterien
- [x] AK-FKE-01: Eigenes Bild wird beim Upload auf max 400×400 komprimiert
- [x] AK-FKE-02: Komprimiertes Bild wird korrekt auf der Kachel angezeigt (Vorschau)
- [x] AK-FKE-03: Bild bleibt nach Speichern + Neuladen erhalten (Persistenz in Dataverse)
- [x] AK-FKE-04: Bei zu großem Payload erscheint Fehlermeldung (Toast)
- [x] AK-FKE-05: Bei HTTP-Fehler beim Speichern erscheint Fehlermeldung (kein stilles Verschlucken)
- [x] AK-FKE-06: customImg aus Kachel-Editor erscheint auf dem Angebots-Plakat (beide Layouts)
- [x] AK-FKE-07: Override-Key ist stabil (produkt-basiert), alte artikelnummer-Keys werden migriert
- [x] AK-FKE-08: VERWERFEN setzt Änderungen zurück ohne Dialog zu schließen

## Status
- [x] Spec erstellt (2026-06-22)
- [x] Bug-Fix implementiert (Komprimierung + Fehler-Handling)
- [ ] Live-Test ausstehend
