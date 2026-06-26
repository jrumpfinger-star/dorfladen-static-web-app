# AK-UI-40 – Stammkunden-Tab: Klappbare Karten

## Ziel
Stammkunden-Karten im Kiosk auf das gleiche klappbare Header/Body-Pattern umstellen, das bei Mittagstisch- und Shop-Bestellungen verwendet wird.

## Ist-Zustand
- Flache Karten ohne Klappfunktion
- Alle Infos (Name, Telefon, Email, Notiz) + alle Buttons (Bestellen, Bearbeiten, Löschen) immer sichtbar
- Keine visuelle Hierarchie zwischen Übersicht und Detail

## Soll-Zustand

### Kompakter Header (immer sichtbar)
- ▼-Pfeil (klappbar)
- Kundenname (fett)
- Telefonnummer (kompakt)
- SK-Nummer
- "Bestellen"-Button als Quick-Action (stopPropagation)

### Klappbarer Body (nur bei Aufklappen)
- Telefon, E-Mail, Adresse, SK-Nr als Meta-Infos
- Notiz (falls vorhanden, im k-order-note Style)
- "Bevorzugt zum Mitnehmen"-Badge (falls gesetzt)
- Aktionsbuttons: Bestellen, Bearbeiten, Löschen

### Verhalten
- Karten starten zugeklappt (`oc-collapsed`)
- Klick auf Header toggled auf/zu
- Zustand bleibt beim Re-Render erhalten (`_kundenCardOpen`)
- CSS-Klassen: `k-order`, `k-order-hdr`, `k-order-body`, `oc-collapsed`
- IDs: `kc-{stammkunde_id}`

## Anpassungsstellen
1. `static-site/kiosk.html` – `renderKunden()` refactored + `toggleKundeCard()` + Public API Export

## Status
| Komponente | Status |
|---|---|
| renderKunden() Header/Body | ✅ Implementiert |
| toggleKundeCard() | ✅ Implementiert |
| Public API Export | ✅ Implementiert |
| Zustandserhaltung | ✅ Implementiert |
