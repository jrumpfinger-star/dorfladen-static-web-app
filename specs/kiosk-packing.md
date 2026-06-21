# Kiosk – Inline Packing (Packen)

## Kontext
Die Kiosk-Seite (`static-site/kiosk.html`) zeigt Online-Shop-Bestellungen an. Bisher öffnete "Packen" eine neue Seite (`shop-admin.html?pack=orderId`). Jetzt soll das Packen direkt inline als Modal in der Kiosk-Seite passieren, mit voller Funktionsparität zur Shop-Admin.

## Anforderungen
- [x] Inline Pack-Modal statt Navigation zu neuer Seite
- [x] Checkboxen pro Artikel (gepackt/nicht gepackt)
- [x] Mengen-Eingabefelder pro Artikel (Stk oder g mit passendem Step)
- [x] Einzelpreise und Gesamtpreise pro Zeile, live berechnet
- [x] Summenzeile am Ende
- [x] Autosave (1,2s Delay) mit Statusanzeige
- [x] Tags: "Nicht lieferbar" (rot) / "Teilmenge" (orange)
- [x] Fortschrittsbalken (X/Y gepackt)
- [x] "Abholbereit" Button mit Bestätigungsdialog bei fehlenden Artikeln
- [x] Beipackzettel drucken (öffnet Druckansicht im neuen Fenster)
- [x] Anmerkungen anzeigen

## Betroffene Dateien
- `static-site/kiosk.html` – UI + JS für Pack-Modal

## API-Endpunkte
- `GET /api/shop-order?mode=pack&id={id}` – Bestellung mit Positionen laden
- `PATCH /api/shop-order` – Pack-Daten speichern (`{id, status, pack_json}`)

## Akzeptanzkriterien
- [x] AK-PK-01: Pack-Modal öffnet sich inline, keine Navigation
- [x] AK-PK-02: Checkbox-Änderung triggert Autosave und aktualisiert Tags/Summe
- [x] AK-PK-03: Mengenänderung aktualisiert Einzelpreis, Gesamtpreis und Summe live
- [x] AK-PK-04: Beipackzettel zeigt alle Positionen mit Bestellt/Geliefert-Mengen, Preisen, Markierung
- [ ] AK-PK-05: Gewichtsware (kg): Menge in Gramm eingeben, Preis = EP × g/1000
- [ ] AK-PK-06: "Abholbereit" setzt Status 2, Liste aktualisiert sich
- [ ] AK-PK-07: Autosave-Indikator zeigt "✓ Gespeichert" nach erfolgreicher Speicherung
- [ ] AK-PK-08: Nicht-gepackte Artikel zeigen "✕ Nicht lieferbar" Tag
- [ ] AK-PK-09: Teilmenge-Artikel (weniger als bestellt) zeigen "⚠ Teilmenge" Tag
- [ ] AK-PK-10: Finish-Dialog zeigt fehlende Artikel namentlich auf

## Nicht-Ziele
- Kein Barcode-Scanning im Kiosk-Pack-Modal
- Keine Drag&Drop-Sortierung der Artikel

## Status
- [x] Spec reviewed
- [x] Implementierung
- [ ] Validierung gegen Akzeptanzkriterien (API-Test ausstehend)
