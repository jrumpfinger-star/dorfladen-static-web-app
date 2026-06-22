# Konzept: Social-Media-Posting aus dem CMS

## Übersicht

Tägliches Veröffentlichen von Angeboten (Mittagessen, Kuchen, Fleischsalate, Saisonware etc.)
auf WhatsApp und Instagram direkt aus dem CMS heraus.

## Workflow

1. **Katalog pflegen** – Produkte/Gerichte mit Bild, Name, Preis, Kategorie erfassen
2. **Tagespost erstellen** – Produkte aus Katalog auswählen + optionales Foto hochladen
3. **Vorschau** – Ansprechende Karte im Dorfladen-Design wird generiert
4. **Veröffentlichen** – An WhatsApp (Share-Link) + Instagram (API) senden

## Datenmodell

### Dataverse Entity: `dl_social_katalog`
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| dl_name | String | Produktname (z.B. "Geschnetzeltes mit Champignonrahmsoße") |
| dl_kategorie | OptionSet | Mittagessen, Kuchen, Obst & Gemüse, Aufstriche |
| dl_preis | Decimal | Preis (z.B. 9.80) |
| dl_bild_url | String | SharePoint-Pfad zum Bild |
| dl_aktiv | Boolean | Im Katalog sichtbar? |
| dl_sortierung | Int | Reihenfolge in der Kategorie |

### Dataverse Entity: `dl_social_post`
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| dl_datum | DateTime | Veröffentlichungsdatum |
| dl_titel | String | Überschrift (z.B. "Mittagessen Montag") |
| dl_text | String | Freitext-Nachricht |
| dl_bild_base64 | String | Generiertes Posterbild als Base64 |
| dl_items | String (JSON) | Ausgewählte Katalog-Einträge mit Mengen |
| dl_status | OptionSet | Entwurf, Veröffentlicht |
| dl_instagram_id | String | Instagram Post-ID (nach Veröffentlichung) |

### SharePoint-Folder: `Daily`
- Ablage für hochgeladene Produktbilder
- Namenskonvention: `{kategorie}_{name}_{timestamp}.jpg`

## CMS-Oberfläche

### Tab "Social Media" im CMS
Zwei Bereiche:
1. **Katalog verwalten** – CRUD für Produkte
2. **Tagespost erstellen** – Auswahl + Vorschau + Senden

### Katalog-Verwaltung
- Liste aller Produkte, gruppiert nach Kategorie
- Neues Produkt: Name, Kategorie, Preis, Bild (Upload oder Kamera)
- Bild wird nach SharePoint "Daily"-Folder hochgeladen
- Bearbeiten / Löschen / Sortieren

### Tagespost-Erstellung
1. Kategorien aufklappen (Mittagessen, Kuchen, etc.)
2. Produkte ankreuzen (Checkbox)
3. Optional: Eigenes Foto hochladen (z.B. frisches Handyfoto)
4. Optional: Freitext ergänzen
5. **Vorschau**: Generierte Karte im Dorfladen-Design
6. **Buttons**: "Auf WhatsApp teilen" / "Auf Instagram posten"

### Bild-Generator (Canvas)
- Dorfladen-Logo + Branding oben
- Wochentag + "Heute bei uns" Überschrift
- Produktbilder in Grid
- Namen + Preise
- Grünes Dorfladen-Farbschema
- Output: 1080×1080px (Instagram-optimiert)

## Technische Umsetzung

### Phase 1: Katalog + Tagespost + WhatsApp-Share
- CMS-Tab "Social Media" 
- Katalog-CRUD mit Bild-Upload nach SharePoint
- Tagespost-Builder mit Checkbox-Auswahl
- Canvas-basierter Bild-Generator
- WhatsApp-Share-Link (Web Share API oder wa.me Link)
- **Kein API-Zugang nötig!**

### Phase 2: Instagram API
- Meta Business Account verifizieren
- Instagram Graph API anbinden
- Automatischer Instagram-Post aus dem CMS
- Post-Verlauf im CMS

### Phase 3: WhatsApp Business API
- WhatsApp Business API (Cloud API) einrichten
- Message Templates in Meta erstellen
- Automatischer Broadcast an alle Abonnenten
- Opt-in/Opt-out Verwaltung

## API-Endpunkte (Azure Functions)

### `POST /api/social-katalog`
- CRUD für Katalog-Einträge
- Bild-Upload nach SharePoint

### `POST /api/social-post`
- Tagespost erstellen/speichern
- Generiertes Bild speichern

### `POST /api/social-publish`
- Instagram API Publish (Phase 2)
- WhatsApp API Broadcast (Phase 3)

## Entscheidungen (15.06.2026)

- **Kategorien**: Mittagessen, Kuchen, Obst & Gemüse, Aufstriche
- **Website**: Tagespost soll auch auf der Website unter "Aktuelles" erscheinen
- **Benutzer**: Mitarbeiter erstellen die Posts (nicht nur Geschäftsführung)
- **Bildstil**: Kompakt, gut lesbar, mit Bildern, kein unnötiges Scrollen
- **Meta Business Manager**: Vorhanden, Zugang muss geklärt werden

## Meta Business Manager – Zugang

URL: https://business.facebook.com/
1. Mit dem Facebook-Account einloggen, der mit dem Instagram-Account @oberornau verknüpft ist
2. Unter "Einstellungen" → "Business-Einstellungen" → "Instagram-Konten" prüfen ob @oberornau dort verknüpft ist
3. Für die Instagram API brauchen wir später eine "App" unter https://developers.facebook.com/
4. Das machen wir in Phase 2 – für Phase 1 brauchen wir keinen API-Zugang
