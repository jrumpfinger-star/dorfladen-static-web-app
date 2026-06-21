# Kiosk – UI Verbesserungen

## Kontext
Die Kiosk-Seite soll als zentrales Bedien-Interface im Laden dienen. Verschiedene UI-Verbesserungen wurden angefordert.

## Anforderungen
- [x] Tab "Abholungen" umbenennen zu "Online-Shop"
- [x] Filter-Buttons vereinfachen: nur "Offene" und "Heute" (kein "Alle", kein "Abgeholt")
- [x] Zeitslot-Gruppen aufklappbar (collapsible) mit Pfeil-Indikator und Bestellanzahl
- [x] Mittagstisch: Tagesauswahl-Leiste (Gestern, Heute, Morgen, +4 weitere Tage)
- [x] Neue-Kunde-Formulare: Separate Felder für Nachname und Vorname
- [x] Fehlerbehandlung beim Kunden-Anlegen verbessern (HTTP-Status, Duplikate)

## Betroffene Dateien
- `static-site/kiosk.html`

## Akzeptanzkriterien
- [x] Tab zeigt "Online-Shop" statt "Abholungen"
- [x] Nur 2 Filter-Buttons sichtbar: "Offene" und "Heute"
- [x] Klick auf Slot-Header klappt Gruppe auf/zu
- [x] Tagesauswahl zeigt alle Tage inkl. Samstag/Sonntag
- [x] Nachname/Vorname werden separat erfasst und korrekt an API gesendet
- [ ] Bei API-Fehler (z.B. 404) wird verständliche Fehlermeldung angezeigt (kein alert())

## Nicht-Ziele
- Keine Änderung am Stammkunden-Tab-Layout
- Keine Änderung am Speiseplan-Tab

## Status
- [x] Spec reviewed
- [x] Implementierung
- [ ] Validierung (teilweise – API-Endpoint muss deployed sein)
