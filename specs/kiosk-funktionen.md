# Kiosk – Funktionsbeschreibung

## Überblick
Der Kiosk (`static-site/kiosk.html`) ist das zentrale Bedien-Interface für die Verkäuferin im Laden. Er wird auf einem Touchscreen oder Tablet bedient und bietet Zugriff auf Mittagstisch-Bestellungen, Online-Shop-Abholungen, Stammkunden und Social-Media-Funktionen.

**URL:** `https://<domain>/kiosk.html`
**Passwortschutz:** CMS-Passwort erforderlich

---

## 1. Navigation

### Tabs
Der Kiosk hat 4 Hauptbereiche als Tab-Leiste oben:

| Tab | Icon | Funktion |
|-----|------|----------|
| Mittagstisch | Besteck | Tagesbestellungen für Mittagsgerichte |
| Online-Shop | Warenkorb | Abholbestellungen aus dem Online-Shop |
| Stammkunden | Personen | Kundenverwaltung (anlegen, bearbeiten, löschen) |
| Social | Teilen | Social-Media-Posts erstellen und verwalten |

### Tab-Badges
- **Mittagstisch-Badge** (orange/blau): Zeigt neue Bestellungen (heute) + ungelesene Kundennachrichten
- **Online-Shop-Badge** (grün): Zeigt aktiv zu erledigende Bestellungen (Eingang + Packen)

### Header
- **Uhrzeit** wird live angezeigt
- **Refresh-Button** (🔄) rechts neben der Uhr – lädt Daten neu

---

## 2. Mittagstisch

### Tagesauswahl
- Leiste mit 7 Tage-Pills: Gestern → Heute → +5 Tage
- **Heute** ist standardmäßig ausgewählt (grüne Pill)
- Bestellungen werden nach dem gewählten Tag gefiltert

### Status-Filter
Unterhalb der Tagesauswahl eine Filter-Leiste:

| Filter | Zeigt |
|--------|-------|
| Zu bestätigen | Neue Bestellungen (Status 0) |
| Bestätigt | Bereits bestätigte (Status 1) |
| Alle | Alle Bestellungen des Tages |
| Abgeholt | Abgeholte (Status 3) |
| Storniert | Stornierte (Status 2) |
| Nachrichten | Bestellungen mit Kundenkommentaren |

Jeder Filter zeigt eine Zahl (Badge) mit der Anzahl.

### Bestellkarten
Bestellungen werden **nach Gericht gruppiert** angezeigt:
- **Gruppen-Header**: Gerichtname, Anzahl Portionen, Mitnehmen-Anzahl
  - Aufklappbar/zuklappbar per Klick (▼/▶)
  - Buttons: "Alle bestätigen" / "Alle abgeholt" für Massenaktionen
- **Einzelne Karte** (kompakt, aufklappbar):
  - **Kopfzeile**: Name, Menge, Quelle (Online/Telefon/Personal), Mitnehmen-Badge
  - **Aktions-Buttons** je nach Status:
    - Status 0 (Neu): "Bestätigen" + "Stornieren (X)"
    - Status 1 (Bestätigt): "Abgeholt" + "Stornieren (X)"
    - Status 3 (Abgeholt): Grünes Häkchen (keine Aktion)
  - **Aufgeklappte Details**: Bestellnummer, Telefon, Preis, Anmerkung

### Bestätigen mit Nachricht
- Klick auf "Bestätigen" öffnet einen **Inline-Dialog** unter der Karte
- Optionales Textfeld: z.B. "Gericht wird um 12:30 fertig"
- Text wird als Push-Nachricht an den Kunden gesendet
- Bestätigungstext wird auf der Karte grün hinterlegt angezeigt

### Nachricht an Kunde (nur Online-Bestellungen)
- Bei **bestätigten Online-Bestellungen** erscheint ein Button:
  - "Antworten" (wenn Kundenkommentar vorhanden)
  - "Nachricht senden" (wenn kein Kundenkommentar)
- Öffnet Inline-Dialog mit Textfeld → Nachricht wird als Push gesendet
- **Nicht bei Telefon-/Personal-Bestellungen** (kein Push-Kanal)

### Kundennachrichten
- Kundenkommentare werden **blau hinterlegt** auf der Karte angezeigt (pulsierend)
- Personal-Antworten werden **grün hinterlegt** angezeigt
- Nachrichten-Badge im Tab blinkt bei ungelesenen Nachrichten
- Filter "Nachrichten" zeigt alle Bestellungen mit Kommentaren

---

## 3. Bottom-Bar (nur im Mittagstisch-Tab)

Zwei Buttons am unteren Bildschirmrand:

| Button | Funktion |
|--------|----------|
| Neue Telefonbestellung | Öffnet Bestell-Modal für telefonische Bestellungen |
| Küchenliste drucken | Öffnet Druckansicht mit Bestellungen nach Gericht gruppiert |

**Responsive**: Auf Mobilgeräten (≤600px) werden die Buttons kleiner dargestellt (40px statt 64px, Font 13px).

### Neue Telefonbestellung
1. **Gerichtauswahl**: Zeigt Gerichte des aktuellen Wochentags
   - Wenn nur 1 Gericht verfügbar → automatisch vorausgewählt
   - Karten mit Gerichtname und Preis, Klick wählt aus
2. **Menge**: +/- Buttons (1–99)
3. **Kundensuche**: Tippen sucht in Stammkunden (Name/Telefon)
   - Kunde auswählen → wird vorausgefüllt
   - "Neuen Kunden anlegen" → Inline-Formular
4. **Mitnehmen**: Checkbox
5. **Anmerkung**: Freitextfeld (z.B. "ohne Zwiebeln")
6. **Bestellung aufnehmen** → POST an API

### Küchenliste
- Druckfenster mit allen Bestellungen des gewählten Tages
- Gruppiert nach Gericht
- Pro Gericht: Gesamtportionen, Mitnehmen/Vor-Ort-Split, Kundenliste
- Gesamtsumme aller Portionen am Ende

---

## 4. Online-Shop

### Stats-Leiste
Flacher Text mit Trennpunkten:
- **Eingang**: Neue Bestellungen (Status 0)
- **Packen**: In Bearbeitung (Status 1)
- **Warten**: Abholbereit (Status 2)
- **Überfällig**: Abholzeit vorbei + nicht abgeholt

### Filter
| Filter | Zeigt |
|--------|-------|
| Zu erledigen | Status 0 + 1 (Eingang + Packen) |
| Heute abholen | Abholtermin = heute |
| Überfällig | Abholzeit vorbei, nicht abgeholt |
| Historie | Abgeschlossene Bestellungen ein-/ausblenden |

### Bestellkarten
- Gruppiert nach Abholdatum + Zeitslot (aufklappbar)
- Pro Karte: Kundenname, Bestellnummer, Positionen-Preview, Status-Badge
- **Aktionen** je nach Status:
  - Neu → "Annehmen"
  - In Bearbeitung → "Packen" öffnet Pack-Modal
  - Abholbereit (gepackt) → "Ausgeben"
  - Abholbereit (nicht gepackt) → "Packen" anbieten
- **Details-Button** (Auge-Icon): Öffnet Detail-Modal mit Positionen-Tabelle
- Überfällige Karten werden rot hervorgehoben
- "Alles erledigt"-Indikator wenn nichts offen

### Pack-Modal
- Inline-Packen: Items abhaken, Mengen anpassen (für gewogene Ware)
- Live-Preisberechnung
- Autosave
- Beipackzettel drucken
- Tags: "Nicht lieferbar", "Teilmenge"
- Fortschrittsbalken
- "Fertig"-Button mit Bestätigungsdialog

---

## 5. Stammkunden

### Suche
- **Suchfeld**: Suche nach Name oder Telefonnummer (mit Debounce)
- **"Alle Kunden laden"**: Zeigt alle aktiven Stammkunden
- **"Neuer Kunde"**: Öffnet Anlage-Modal

### Kundenkarten
Jede Karte zeigt:
- Name, Stammkunde-Nr (z.B. SK-D81BF5)
- Telefon, E-Mail, Notiz (wenn vorhanden)

**Drei Aktionen pro Karte:**

| Button | Funktion |
|--------|----------|
| Bestellen | Wechselt zum Mittagstisch-Tab und öffnet Bestell-Modal mit vorausgewähltem Kunden |
| Bearbeiten | Öffnet Edit-Modal mit allen Feldern (Nachname, Vorname, Telefon, E-Mail, Notiz) |
| Löschen (🗑) | Bestätigungsdialog → Soft-Delete (Kunde wird deaktiviert, nicht physisch gelöscht) |

### Neuer Kunde anlegen
Modal mit Feldern:
- **Nachname** (Pflicht)
- **Vorname** (optional)
- **Telefon** (Pflicht)
- **E-Mail** (optional)
- **Notiz** (optional, z.B. "Stammgast, immer Freitags")

Duplikat-Erkennung: Gleicher Name + Telefon → Info-Toast statt Fehlermeldung.

### Kunde bearbeiten
Edit-Modal mit denselben Feldern, vorausgefüllt mit aktuellen Daten. Speichern aktualisiert den Kunden via PATCH-API.

### Kunde löschen
- Bestätigungsdialog: "Kunde XY wirklich löschen?"
- Soft-Delete: Kunde wird auf `aktiv=false` gesetzt
- Deaktivierte Kunden erscheinen nicht mehr in der Suche

---

## 6. Social (Tab)

### Sub-Tabs
| Sub-Tab | Funktion |
|---------|----------|
| Neuer Post | Tagespost zusammenstellen und veröffentlichen |
| Katalog | Produktkatalog verwalten (Bilder, Preise, Kategorien) |

### Neuer Post erstellen
1. **Titel wählen**: Vorgefertigte Titel (z.B. "Heute im Dorfladen – Donnerstag") oder eigenen Titel eingeben
2. **Freitext** (optional): z.B. "Frisch aus der Küche! Heute als Dessert: Erdbeer-Sahne-Torte"
3. **Produkte auswählen**:
   - Heutiges Mittagessen (automatisch aus Wochenplan)
   - Produkte aus dem Katalog (nach Kategorie filterbar)
   - Freie Produkt-Eingabe (Name + Preis, ohne Katalog)
4. **Poster-Vorschau**: Canvas-Rendering mit Dorfladen-Design

### Veröffentlichungsoptionen

| Button | Funktion |
|--------|----------|
| **Auf WhatsApp teilen** | Poster + Bestelllinks werden per WhatsApp geteilt. Post wird gespeichert. |
| **Auf Instagram teilen** | Poster wird per Instagram geteilt (oder in Zwischenablage). Post wird gespeichert. |
| **Bild speichern** | Poster als PNG herunterladen |
| **Nur als Tagesinfo veröffentlichen** | Post wird gespeichert und erscheint auf der Homepage im Tagespost-Modal – **ohne WhatsApp/Instagram**. Für reine Tagesinformationen gedacht. |

Der "Tagesinfo"-Button ist visuell als grüner Outline-Button unterhalb der Share-Buttons platziert, mit Hinweistext "Erscheint auf der Homepage – ohne WhatsApp/Instagram".

### Katalog
- Produkte anlegen: Name, Kategorie, Preis, Bild
- Bild per Drag&Drop, Datei-Upload oder Strg+V einfügen
- Produkte bearbeiten und löschen
- Kategorien: Mittagessen, Kuchen, Obst & Gemüse, Aufstriche

### Tagespost auf der Homepage
- Gespeicherte Posts erscheinen automatisch als **Tagespost-Modal** auf der Homepage (`index.html`)
- Modal zeigt Titel, Freitext, Produkte mit Bildern und Preisen
- Mittagessen mit direktem Bestell-Button pro Gericht
- Öffnet sich automatisch beim ersten Besuch am Tag
- Nach Ladenschluss (≥18:00) wird der Post für morgen angezeigt
- Siehe `specs/tagespost-homepage.md` für Details

---

## 7. Technische Details

### Datenquellen
- **Mittagstisch**: `GET /api/lunch-order?datum=YYYY-MM-DD`
- **Online-Shop**: `GET /api/shop-order`
- **Stammkunden**: `GET/POST/PATCH/DELETE /api/stammkunden/{id?}`
- **Wochenplan**: `GET /api/wochenplan`
- **Social-Posts**: `GET/POST /api/social-post`
- **Tagespost (public)**: `GET /api/tagespost`

### Auto-Refresh
- Bestellungen werden periodisch automatisch neu geladen
- Manueller Refresh über Header-Button

### Push-Benachrichtigungen
- Bestätigungstexte und Antworten werden als Push an Online-Kunden gesendet
- Nur Online-Bestellungen (quelle=0) haben einen Push-Kanal
- Telefon-/Personal-Bestellungen haben keinen Push-Kanal

### Responsive Design
- Optimiert für Touchscreen/Tablet (min-height 44px für Touch-Targets)
- Bottom-Bar passt sich an Mobile an (≤600px: kompaktere Buttons)
- Action-Button-Labels werden auf Mobile ausgeblendet (nur Icons)
