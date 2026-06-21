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
- `static-site/kiosk.html`

## Akzeptanzkriterien
- [x] Pack-Modal öffnet sich inline, keine Navigation
- [x] Checkbox-Änderung triggert Autosave und aktualisiert Tags/Summe
- [x] Mengenänderung aktualisiert Einzelpreis, Gesamtpreis und Summe live
- [x] Beipackzettel zeigt alle Positionen mit Bestellt/Geliefert-Mengen, Preisen, Nicht-verfügbar-Markierung
- [ ] Gewichtsware (kg): Menge in Gramm eingeben, Preis korrekt berechnen (EP × g/1000)
- [ ] Bestellung wird nach "Abholbereit" korrekt auf Status 2 gesetzt und Liste aktualisiert
- [ ] Autosave-Indikator zeigt "✓ Gespeichert" nach erfolgreicher Speicherung

## Nicht-Ziele
- Kein Barcode-Scanning im Kiosk-Pack-Modal
- Keine Drag&Drop-Sortierung der Artikel

## Status
- [x] Spec reviewed
- [x] Implementierung
- [ ] Validierung gegen Akzeptanzkriterien (API-Test ausstehend)
