# Shop-Admin – Mittagstisch Design & Filterung

## Kontext
Die Mittagstisch-Bestellungen werden als Tabelle dargestellt, sind bei 20–50 Bestellungen/Tag schwer zu überblicken und bieten keine Filterung. Ziel: schnelle, einfache Bedienung im Tagesgeschäft.

## Anforderungen

### Filter-Buttons (wie Kiosk)
- [ ] Status-Filter als Button-Leiste: **Alle** | **Offen** (Neu+Bestätigt) | **Abgeholt** | **Storniert**
- [ ] Aktiver Filter farblich hervorgehoben
- [ ] Default: "Offen" (zeigt nur offene Bestellungen)
- [ ] Zähler als Badge auf jedem Button

### Stats-Leiste überarbeiten
- [ ] Kompakte Darstellung: Offen | Bestätigt | Abgeholt | Portionen | Umsatz
- [ ] Stats als klickbare Filter (Klick auf "Offen" filtert auf offene)

### Karten-Design statt Tabelle
- [ ] Jede Bestellung als kompakte Karte
- [ ] Links: Menge (groß), Gericht, Kunde
- [ ] Rechts: Status-Badge + Aktions-Buttons
- [ ] Anmerkungen direkt sichtbar (gelb hinterlegt)
- [ ] Mitnehmen-Kennzeichnung: 📦-Badge
- [ ] Touch-optimiert: Buttons min. 44px

### Gerichtzusammenfassung
- [ ] Über den Karten: Zusammenfassung "3× Schnitzel, 2× Gulasch"
- [ ] Nur offene Bestellungen zählen

## Betroffene Dateien
- `static-site/shop-admin.html` – `renderMittagStats()`, `renderMittagOrders()`, CSS

## Akzeptanzkriterien
- [ ] AK-MD-01: Filter-Buttons vorhanden und funktionsfähig
- [ ] AK-MD-02: Default zeigt nur offene Bestellungen
- [ ] AK-MD-03: Karten statt Tabelle
- [ ] AK-MD-04: Gerichtzusammenfassung über den Karten
- [ ] AK-MD-05: Aktions-Buttons touch-optimiert (min 44px)
- [ ] AK-MD-06: Anmerkungen sichtbar

## Status
- [ ] Spec reviewed
- [ ] Implementierung
- [ ] Validierung
