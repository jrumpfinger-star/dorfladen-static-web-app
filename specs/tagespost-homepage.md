# Tagespost auf der Homepage – Popup/Modal

## Kontext
Im Kiosk/CMS wird täglich ein "Tagespost" zusammengestellt (Mittagessen, Theke, Kuchen etc.) und per WhatsApp/Instagram geteilt. Dieser Post soll auch auf der Homepage für Besucher abrufbar sein, ohne Platz auf der Seite wegzunehmen.

## Lösung
Ein **Chip in der Promo-Bar** (Desktop) bzw. ein **Action-Button im Mobile-Grid** zeigt "Aktuelles" an. Klick öffnet ein Modal mit dem aktuellen Tagespost (Produkte, Preise, Bilder). Beim ersten Besuch am Tag öffnet sich das Modal automatisch.

## Anforderungen

### Daten-Backend
- [x] Bestehende SharePoint-Datei `posts.json` im SocialMedia-Ordner wird genutzt (kein neues Dataverse-Entity nötig)
- [x] Posts werden bereits über `/api/social-post` gespeichert mit Titel, Text, Items, Datum
- [x] `bild_url` wird beim Speichern mitgespeichert (Fix: fehlte vorher in `socialSavePost`)
- [x] Neuer API-Endpunkt `GET /api/tagespost` – gibt **alle Posts von heute zusammengeführt** zurück (öffentlich, read-only)
- [x] Mehrere Posts pro Tag werden dedupliziert zusammengeführt (Items nach Name, Freitexte kombiniert)
- [x] API reichert fehlende Bilder an: Lookup in `katalog.json` und `mittagstisch-bilder.json`, Download + base64-Konvertierung
- [x] Nach Ladenschluss (≥18:00) wird der Post für morgen zurückgegeben (`is_tomorrow: true`)
- [x] Zeitzone Europe/Berlin wird korrekt verwendet

### Tagespost-Trigger (Promo-Bar + Mobile Action)
- [x] Desktop: Chip "Aktuelles" in der Promo-Bar (neben Sonderangebote, Roter Punkt, Preisliste)
- [x] Mobile: Action-Button "Aktuelles" im mob-actions-row Grid (hellgrün hervorgehoben)
- [x] Styling: Dorfladen-grün (#1e3a2f), weißer Text, mit Chat-Icon
- [x] Badge/Counter mit Anzahl sichtbarer Produkte
- [x] Nicht sichtbar wenn kein Tagespost existiert oder keine sichtbaren Items
- [x] Nach Ladenschluss wird Post für morgen angezeigt (statt zu verschwinden)
- [x] ~~Alte FABs (runde schwebende Buttons) entfernt~~ – harmonieren nicht mit der Seite

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
- [x] Kategorie-spezifische Emoji-Platzhalter für Items ohne Bild (🍽️ Mittagessen, 🍰 Kuchen, 🧀 Theke, 🥤 Getränke, 📦 Sonstiges)
- [x] Bestellungen-Badge als Chip in Promo-Bar (Desktop) + Mobile Action-Button
- [x] WhatsApp-Share: Bestelllinks werden als `text` im `navigator.share()` mitgegeben (nicht nur Zwischenablage)

## Betroffene Dateien
- `static-site/index.html` – FAB + Modal HTML/CSS/JS
- `api/tagespost/__init__.py` – neuer API-Endpunkt (GET)
- SharePoint: bestehende `posts.json` im SocialMedia-Ordner

## Akzeptanzkriterien
- [x] AK-TP-01: Aktuelles-Chip/Button erscheint nur wenn ein Tagespost existiert und sichtbare Items vorhanden sind
- [x] AK-TP-02: Nach Ladenschluss wird Post für morgen angezeigt (statt Chip zu verstecken)
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
- [x] AK-TP-14: Mehrere Posts pro Tag werden zusammengeführt (alle Items sichtbar)
- [x] AK-TP-15: Fehlende Bilder werden von API aus Katalog/MT-Bilder nachgeladen
- [x] AK-TP-16: Items ohne Bild zeigen kategorie-spezifisches Emoji statt generischem 📦
- [x] AK-TP-17: WhatsApp-Share enthält Bestelllinks als Text (nicht nur Bild)
- [x] AK-TP-18: Desktop Promo-Bar + Mobile Action-Buttons statt runder FABs
- [x] AK-TP-19: Bestellungen-Chip zeigt Popup mit offenen Bestellungen (Nummer, Status, Abholtermin, Summe) statt zur Shop-Seite weiterzuleiten

## Nicht-Ziele
- Kein Bearbeiten des Tagespost auf der Homepage (nur Anzeige)
- Keine Push-Benachrichtigung für den Tagespost
- Kein Tagespost-Archiv (nur aktueller Tag)

## Entscheidungen
- Trigger nur auf der Hauptseite (index.html), nicht auf Unterseiten
- Produkte ohne Bild werden mit kategorie-spezifischem Emoji angezeigt
- Nach Ladenschluss wird der Post für den nächsten Tag angezeigt (Vorschau)
- Mittagessen wird nach 13:00 Uhr nicht mehr angezeigt
- Teilen-Button im Modal entfernt (nicht sinnvoll an dieser Stelle)
- Direkter Bestell-Button pro Mittagessen-Gericht im Modal
- Runde FABs durch flache Chips/Buttons ersetzt (harmonieren besser mit Seitendesign)
- Bilder-Enrichment passiert serverseitig (API), nicht clientseitig

## Status
- [x] Spec reviewed
- [x] Daten-Backend: bestehende posts.json wird genutzt
- [x] API /api/tagespost implementiert (inkl. Post-Merge + Bild-Enrichment)
- [x] Frontend (Promo-Bar Chip + Mobile Action + Modal) implementiert
- [x] Validierung (live getestet auf witty-island)
- [x] Spec aktualisiert nach UI-Redesign (FAB→Chips) und Bild-/Post-Merge-Fixes
