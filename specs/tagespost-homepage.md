# Tagespost auf der Homepage – Popup/Modal

## Kontext
Im Kiosk/CMS wird täglich ein "Tagespost" zusammengestellt (Mittagessen, Theke, Kuchen etc.) und per WhatsApp/Instagram geteilt. Dieser Post soll auch auf der Homepage für Besucher abrufbar sein, ohne Platz auf der Seite wegzunehmen.

## Lösung
Ein **Floating Action Button (FAB)** unten links auf der Homepage. Klick öffnet ein Modal mit dem aktuellen Tagespost (Produkte, Preise, Bilder). Beim ersten Besuch am Tag öffnet sich das Modal automatisch.

## Anforderungen

### Daten-Backend
- [ ] Neue Dataverse-Entity `dl_tagesposts` mit Feldern:
  - `dl_datum` (Date) – Gültigkeitstag
  - `dl_titel` (String) – z.B. "Heute im Dorfladen – Dienstag"
  - `dl_freitext` (Multiline) – optionaler Text
  - `dl_produkte` (Multiline/JSON) – Array von Produkten mit Name, Preis, Bild-URL, Kategorie
  - `dl_aktiv` (Boolean) – ob angezeigt werden soll
- [ ] Neuer API-Endpunkt `GET /api/tagespost` – gibt den aktiven Tagespost für heute zurück
- [ ] Social-Tab "Senden"-Aktion speichert den Post zusätzlich in `dl_tagesposts`

### FAB (Floating Action Button)
- [ ] Position: `fixed`, oben links (`top:90px; left:20px`) – unterhalb des sticky Headers
- [ ] Styling: Dorfladen-grün (#1e3a2f), rund, 56px, mit Icon (Einkaufstüte oder Megaphone)
- [ ] Puls-Animation beim Laden wenn neuer Post vorhanden
- [ ] Badge mit Anzahl Produkte
- [ ] Nicht sichtbar wenn kein Tagespost für heute existiert
- [ ] Nicht sichtbar nach Ladenschluss (Öffnungszeiten aus /api/hours)

### Modal
- [ ] Öffnet sich beim Klick auf FAB
- [ ] Auto-Open beim ersten Besuch am Tag (localStorage: `tagespost_seen_YYYY-MM-DD`)
- [ ] Schließen über ✕-Button, Klick auf Overlay, oder Escape
- [ ] Responsiv: Mobile fast Vollbild, Desktop max 500px breit zentriert
- [ ] Inhalt:
  - Titel + Datum
  - Freitext (falls vorhanden)
  - Mittagessen-Sektion: Liste mit Bild, Name, Preis, Bestell-Link
  - Theke/Kuchen-Sektion: Horizontales Grid mit kleinen Karten
- [ ] CTA-Buttons:
  - "Jetzt bestellen" → `/shop` oder `/mittagstisch-bestellen`
  - "Per WhatsApp teilen" → WhatsApp Share-Link

### Integration
- [ ] Funktioniert auf Desktop und Mobile
- [ ] Keine Abhängigkeit von Login/Token – öffentlich abrufbar
- [ ] Bilder aus SharePoint (bestehende Bild-Pipeline nutzen)

## Betroffene Dateien
- `static-site/index.html` – FAB + Modal HTML/CSS/JS
- `api/tagespost/__init__.py` – neuer API-Endpunkt (GET)
- `static-site/kiosk.html` oder `static-site/social.js` – Senden-Aktion erweitern
- Dataverse: neue Entity `dl_tagesposts`

## Akzeptanzkriterien
- [ ] AK-TP-01: FAB erscheint nur wenn ein Tagespost für heute existiert
- [ ] AK-TP-02: FAB verschwindet nach Ladenschluss
- [ ] AK-TP-03: Modal öffnet automatisch beim ersten Besuch am Tag
- [ ] AK-TP-04: Modal zeigt Titel, Freitext und Produkte mit Bildern/Preisen
- [ ] AK-TP-05: Mittagessen wird als Liste dargestellt, Theke als Grid
- [ ] AK-TP-06: CTA-Button "Jetzt bestellen" verlinkt auf Shop/Mittagstisch
- [ ] AK-TP-07: Modal schließbar über ✕, Overlay-Klick und Escape
- [ ] AK-TP-08: Responsiv: Mobile fast Vollbild, Desktop 500px zentriert
- [ ] AK-TP-09: Social-Tab "Senden" speichert Post auch in dl_tagesposts
- [ ] AK-TP-10: API /api/tagespost gibt korrekten Post für heute zurück (öffentlich, kein Auth)

## Nicht-Ziele
- Kein Bearbeiten des Tagespost auf der Homepage (nur Anzeige)
- Keine Push-Benachrichtigung für den Tagespost
- Kein Tagespost-Archiv (nur aktueller Tag)

## Offene Fragen
- Soll der FAB auch auf Unterseiten (z.B. /shop) sichtbar sein oder nur auf der Homepage?
- Soll der Tagespost auch Produkte ohne Bild anzeigen (nur Name + Preis)?

## Status
- [ ] Spec reviewed
- [ ] Dataverse-Entity angelegt
- [ ] API implementiert
- [ ] Frontend (FAB + Modal) implementiert
- [ ] Social-Tab Integration
- [ ] Validierung
