# Tagespost auf der Homepage – Popup/Modal

## Kontext
Im Kiosk/CMS wird täglich ein "Tagespost" zusammengestellt (Mittagessen, Theke, Kuchen etc.) und per WhatsApp/Instagram geteilt. Dieser Post soll auch auf der Homepage für Besucher abrufbar sein, ohne Platz auf der Seite wegzunehmen.

## Lösung
Ein **Floating Action Button (FAB)** unten links auf der Homepage. Klick öffnet ein Modal mit dem aktuellen Tagespost (Produkte, Preise, Bilder). Beim ersten Besuch am Tag öffnet sich das Modal automatisch.

## Anforderungen

### Daten-Backend
- [x] Bestehende SharePoint-Datei `posts.json` im SocialMedia-Ordner wird genutzt (kein neues Dataverse-Entity nötig)
- [x] Posts werden bereits über `/api/social-post` gespeichert mit Titel, Text, Items, Datum
- [x] Neuer API-Endpunkt `GET /api/tagespost` – gibt den neuesten Post von heute zurück (öffentlich, read-only)
- [x] Nach Ladenschluss (≥18:00) wird der Post für morgen zurückgegeben (`is_tomorrow: true`)
- [x] Zeitzone Europe/Berlin wird korrekt verwendet

### FAB (Floating Action Button)
- [x] Position: `fixed`, oben links (`top:110px; left:20px`) – unterhalb des Desktop-Headers
- [x] Styling: Dorfladen-grün (#1e3a2f), rund, 56px, mit Chat-Icon
- [x] Puls-Animation beim Laden wenn neuer Post vorhanden
- [x] Badge mit Anzahl sichtbarer Produkte (nach Zeitfilter)
- [x] Nicht sichtbar wenn kein Tagespost existiert oder keine sichtbaren Items
- [x] Nach Ladenschluss wird Post für morgen angezeigt (statt zu verschwinden)

### Modal
- [x] Öffnet sich beim Klick auf FAB
- [x] Auto-Open beim ersten Besuch am Tag (localStorage: `tagespost_seen_YYYY-MM-DD`)
- [x] Schließen über ✕-Button, Klick auf Overlay, oder Escape
- [x] Responsiv: Mobile fast Vollbild, Desktop max 500px breit zentriert
- [x] Inhalt:
  - Titel + Datum ("Morgen: ..." + "Vorschau – ..." bei morgen-Post)
  - Freitext (falls vorhanden)
  - Mittagessen-Sektion: Liste mit Bild, Name, Preis, direktem Bestell-Button pro Gericht
  - Theke/Kuchen-Sektion: Horizontales Grid mit kleinen Karten
- [x] Mittagessen nach 13:00 Uhr ausgeblendet (Mittagszeit vorbei)
- [x] CTA-Button: "Mittagessen bestellen" → `/mittagstisch-bestellen?heute=1` (nur heutige Gerichte)
- [x] Teilen-Button entfernt (nicht sinnvoll im Modal)

### Integration
- [x] Funktioniert auf Desktop und Mobile
- [x] Keine Abhängigkeit von Login/Token – öffentlich abrufbar
- [x] Bilder aus SharePoint (bestehende Bild-Pipeline nutzen)

## Betroffene Dateien
- `static-site/index.html` – FAB + Modal HTML/CSS/JS
- `api/tagespost/__init__.py` – neuer API-Endpunkt (GET)
- SharePoint: bestehende `posts.json` im SocialMedia-Ordner

## Akzeptanzkriterien
- [x] AK-TP-01: FAB erscheint nur wenn ein Tagespost existiert und sichtbare Items vorhanden sind
- [x] AK-TP-02: Nach Ladenschluss wird Post für morgen angezeigt (statt FAB zu verstecken)
- [x] AK-TP-03: Modal öffnet automatisch beim ersten Besuch am Tag
- [x] AK-TP-04: Modal zeigt Titel, Freitext und Produkte mit Bildern/Preisen
- [x] AK-TP-05: Mittagessen wird als Liste dargestellt, Theke als Grid
- [x] AK-TP-06: Direkter Bestell-Button pro Mittagessen-Gericht + CTA unten
- [x] AK-TP-07: Modal schließbar über ✕, Overlay-Klick und Escape
- [x] AK-TP-08: Responsiv: Mobile fast Vollbild, Desktop 500px zentriert
- [x] AK-TP-09: Bestehende Social-Post-Daten werden wiederverwendet (kein separater Speicher)
- [x] AK-TP-10: API /api/tagespost gibt korrekten Post für heute/morgen zurück (öffentlich, kein Auth)
- [x] AK-TP-11: Mittagessen nach 13:00 Uhr ausgeblendet
- [x] AK-TP-12: Mittagstisch-Bestellseite filtert auf heutige Gerichte (?heute=1)
- [x] AK-TP-13: Bestellungen-Badge zählt nur heutige und zukünftige offene Bestellungen

## Nicht-Ziele
- Kein Bearbeiten des Tagespost auf der Homepage (nur Anzeige)
- Keine Push-Benachrichtigung für den Tagespost
- Kein Tagespost-Archiv (nur aktueller Tag)

## Entscheidungen
- FAB nur auf der Hauptseite (index.html), nicht auf Unterseiten
- Produkte ohne Bild werden trotzdem angezeigt (nur Name + Preis)
- Nach Ladenschluss wird der Post für den nächsten Tag angezeigt (Vorschau)
- Mittagessen wird nach 13:00 Uhr nicht mehr angezeigt
- Teilen-Button im Modal entfernt (nicht sinnvoll an dieser Stelle)
- Direkter Bestell-Button pro Mittagessen-Gericht im Modal

## Status
- [x] Spec reviewed
- [x] Daten-Backend: bestehende posts.json wird genutzt
- [x] API /api/tagespost implementiert
- [x] Frontend (FAB + Modal) implementiert
- [x] Validierung (live getestet auf witty-island)
