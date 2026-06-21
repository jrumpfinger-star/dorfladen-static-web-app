# Shop-Admin – Mittagstisch Design & Filterung

## Kontext
Die Mittagstisch-Bestellungen werden als Tabelle dargestellt, sind bei 20–50 Bestellungen/Tag schwer zu überblicken und bieten keine Filterung. Ziel: schnelle, einfache Bedienung im Tagesgeschäft.

## Anforderungen

### Filter-Buttons (wie Kiosk)
- [x] Status-Filter als Button-Leiste: **Zu bestätigen** | **Bestätigt** | **Alle** | **Abgeholt** | **Storniert**
- [x] Aktiver Filter farblich hervorgehoben
- [x] Default: "Bestätigt" (zeigt bestätigte Bestellungen)
- [x] Zähler als Badge auf jedem Button

### Stats-Leiste überarbeiten
- [x] Kompakte Darstellung: Portionen-Zähler rechts oben
- [x] Filter-Buttons als klickbare Filter

### Karten-Design statt Tabelle
- [x] Jede Bestellung als kompakte Karte
- [x] Links: Menge (groß), Gericht, Kunde
- [x] Rechts: Status-Badge + Aktions-Buttons
- [x] Anmerkungen direkt sichtbar (gelb hinterlegt)
- [x] Mitnehmen-Kennzeichnung: Badge
- [x] Touch-optimiert: Buttons min. 44px

### Gerichtzusammenfassung
- [x] Über den Karten: Zusammenfassung "5× Cordon bleu, 3× Gulasch"
- [x] Zählt alle angezeigten Bestellungen

## Betroffene Dateien
- `static-site/shop-admin.html` – `renderMittagStats()`, `renderMittagOrders()`, CSS

## Akzeptanzkriterien
- [x] AK-MD-01: Filter-Buttons vorhanden und funktionsfähig
- [x] AK-MD-02: Default zeigt bestätigte Bestellungen
- [x] AK-MD-03: Karten statt Tabelle
- [x] AK-MD-04: Gerichtzusammenfassung über den Karten
- [x] AK-MD-05: Aktions-Buttons touch-optimiert (min 44px)
- [x] AK-MD-06: Anmerkungen sichtbar

## Status
- [x] Spec reviewed
- [x] Implementierung
- [x] Validierung (2026-06-21)
