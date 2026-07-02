# Kiosk – UI Verbesserungen

## Kontext
Die Kiosk-Seite (`static-site/kiosk.html`) soll als zentrales Bedien-Interface im Laden dienen. Verschiedene UI-Verbesserungen wurden angefordert, um die Bedienung zu vereinfachen.

## Anforderungen

### Tab-Leiste
- [x] Tab "Abholungen" umbenennen zu "Online-Shop"
- [x] ~~4 Tabs: Mittagstisch, Online-Shop, Stammkunden, Speiseplan~~
- [x] 3 Tabs: Mittagstisch, Online-Shop, Stammkunden (Speiseplan entfernt – redundant, Gerichte werden im Bestellmodal angezeigt)

### Header
- [x] Refresh-Button (🔄) im Header rechts neben Uhr, nicht in Bottom-Bar

### Bottom-Bar
- [x] Nur 2 Buttons: "☎ Neue Telefonbestellung" + "🖨 Küchenliste drucken"
- [x] Küchenliste öffnet Druck-Fenster mit Bestellungen gruppiert nach Gericht (Portionen, Mitnehmen/Vor-Ort, Kundennamen)
- [x] Responsive auf Mobile (≤600px): kleinere Höhe (40px statt 64px), kompakteres Padding, Font 13px

### Datum-Normalisierung
- [x] Online-Bestellungen speichern Datum als `YYYY-MM-DD` (nicht `YYYY-MM-DDT00:00:00Z`)
- [x] GET-Filter verwendet `startswith` statt `eq` für Abwärtskompatibilität
- [x] API-Rückgabe normalisiert Datum immer auf `YYYY-MM-DD`

### Online-Shop Filter & Stats
- [x] ~~Filter-Buttons: "Offene" und "Heute"~~
- [x] 3 Filter: "📦 Zu erledigen", "📅 Heute abholen", "⚠️ Überfällig"
- [x] Stats handlungsorientiert: "📥 Eingang" / "📦 Packen" / "🔔 Warten" / "⚠️ Überfällig" (kein Umsatz)
- [x] Überfällige Bestellungen = Abholzeit vorbei + Status < abgeholt
- [x] Überfällige Karten rot hervorgehoben
- [x] Wenn nichts offen: "✅ Alles erledigt"

### Mittagstisch-Stats
- [x] Stats: Portionen (Gesamt), Offen (unbestätigt), Mitnehmen, Vor Ort
- [x] Kein Umsatz, kein "Bestätigt"-Zähler, kein "Abgeholt"-Zähler

### Bestätigen mit optionalem Text
- [x] "Bestätigen"-Button öffnet Inline-Confirm-Dialog statt direkt Status zu ändern
- [x] Dialog enthält optionales Textfeld (Placeholder: "Nachricht an Kunde")
- [x] Text wird als `bestaetigung_text` per PATCH an API gesendet
- [x] Text wird in Push-Benachrichtigung an Kunden angehängt
- [x] Bestätigungstext wird auf der Karte grün hinterlegt angezeigt
- [x] Abbrechen-Button schließt Dialog ohne Aktion

### Nachricht an Kunde
- [x] "Nachricht senden"-Button nur bei Online-Bestellungen (quelle===0), nicht bei Telefon/Personal
- [x] Bei Kundenkommentar: Button-Label "Antworten" mit Reply-Icon
- [x] Ohne Kundenkommentar: Button-Label "Nachricht senden" mit Send-Icon
- [x] Reply-Dialog zeigt Kundenkommentar (wenn vorhanden) + Textfeld + Senden-Button

### Zeitslot-Gruppen
- [x] Bestellungen gruppiert nach Abholdatum + Zeitslot
- [x] Gruppen aufklappbar (collapsible) mit Pfeil-Indikator (▶/▼) und Bestellanzahl-Badge
- [x] Klick auf Gruppen-Header klappt Gruppe auf/zu

### Mittagstisch Tagesauswahl
- [x] Tagesauswahl-Leiste mit Buttons: Gestern, Heute, Morgen, +4 weitere Tage
- [x] Default-Selektion: Heute
- [x] Tagesauswahl inkl. Samstag und Sonntag (alle Kalendertage)
- [x] Bestellungen werden nach ausgewähltem Datum gefiltert

### Kundenverwaltung
- [x] Neue-Kunde-Formular: Separate Felder für Nachname (Pflicht) und Vorname
- [x] Inline-Kunden-Anlage im Bestellformular: ebenfalls Nachname/Vorname getrennt
- [x] Fehlerbehandlung: HTTP-Status prüfen, Duplikate erkennen (409), verständliche Meldungen
- [x] Stammkunden-Karte: Bearbeiten-Button → Edit-Modal mit allen Feldern (Name, Telefon, E-Mail, Notiz)
- [x] Stammkunden-Karte: Löschen-Button → Bestätigungsdialog, Soft-Delete (Kunde wird deaktiviert)
- [x] Edit-Modal nutzt PATCH `/api/stammkunden/{id}`, Löschen nutzt DELETE `/api/stammkunden/{id}`

## Betroffene Dateien
- `static-site/kiosk.html` – Tabs, Filter, Gruppen, Tagesauswahl, Kundenformulare

## API-Endpunkte
- `GET /api/shop-order` – Shop-Bestellungen laden
- `POST /api/stammkunden` – Neuen Stammkunden anlegen
- `GET /api/stammkunden?q=...` – Stammkunden suchen
- `GET /api/stammkunden/{id}` – Einzelner Kunde laden
- `PATCH /api/stammkunden/{id}` – Kundendaten aktualisieren
- `DELETE /api/stammkunden/{id}` – Kunde deaktivieren (Soft-Delete)
- `GET /api/lunch-order?datum=YYYY-MM-DD` – Mittagstisch-Bestellungen nach Datum

## Akzeptanzkriterien
- [x] AK-UI-01: Tab zeigt "Online-Shop" statt "Abholungen"
- [x] AK-UI-01b: 3 Tabs: Mittagstisch, Online-Shop, Stammkunden (kein Speiseplan)
- [x] AK-UI-01c: Refresh-Button im Header sichtbar
- [x] AK-UI-02: 4 Filter-Buttons: "📦 Zu erledigen", "📅 Heute abholen", "⚠️ Überfällig", "🕓 Historie"
- [x] AK-UI-03: Slot-Gruppen default collapsed, Klick klappt auf/zu
- [x] AK-UI-03b: Slot-Header zeigt Status-Badges (📥 Eingang / 📦 Packen / 🔔 Warten) statt nur Gesamtzahl
- [x] AK-UI-04: Pfeil wechselt zwischen ▶ (collapsed) und ▼ (expanded)
- [x] AK-UI-05: Tagesauswahl zeigt 7 Tage (Gestern bis +5)
- [x] AK-UI-06: Nachname/Vorname werden separat erfasst und an API als `nachname`/`vorname` gesendet
- [x] AK-UI-07: Duplikat-Kunde (409) zeigt Info-Toast, nicht Fehlermeldung
- [ ] AK-UI-08: Bei API-Fehler (404/500) wird Toast mit Statuscode angezeigt, kein alert()
- [x] AK-UI-09: Badge auf Online-Shop-Tab zeigt Anzahl aktiv zu erledigender Bestellungen (Eingang + Packen, nicht Warten)
- [x] AK-UI-10: Küchenliste druckt Bestellungen nach Gericht gruppiert
- [x] AK-UI-11: Datum wird beim POST normalisiert (YYYY-MM-DD)
- [x] AK-UI-12: GET-Filter findet Bestellungen unabhängig vom Datum-Format
- [x] AK-UI-13: Shop-Stats zeigen handlungsorientierte Labels (kein Umsatz/Bearb.)
- [x] AK-UI-14: Mittagstisch-Stats zeigen Portionen/Mitnehmen/Vor-Ort statt Umsatz
- [x] AK-UI-15: Überfällige Bestellungen rot hervorgehoben
- [x] AK-UI-16: Bestätigen-Button öffnet Confirm-Dialog mit optionalem Textfeld
- [x] AK-UI-16b: Confirm-Dialog zeigt Textfeld mit Placeholder
- [x] AK-UI-16c: Bestätigungstext wird auf Karte grün angezeigt
- [x] AK-UI-16d: Abbrechen-Button schließt Confirm-Dialog ohne Aktion
- [x] AK-UI-09b: Badge-Zahl = Eingang + Packen (nicht Warten)
- [x] AK-UI-02b: Filterwechsel ändert active-Klasse und angezeigte Bestellungen
- [x] AK-UI-14b: Mittagstisch-Stats enthalten keine veralteten Labels (Umsatz/Bestätigt/Abgeholt)
- [x] AK-UI-10b: Küchenliste-Button in Bottom-Bar vorhanden
- [x] AK-UI-10c: printKitchen verwendet _mittagDatum (nicht new Date())
- [x] AK-UI-10d: printKitchen verwendet o.name und o.menge (nicht o.kundenname/o.portionen)
- [x] AK-UI-17: Mittagstisch Filter-Bar: 4 Tabs (Offen/Nachrichten/Erledigt/Alle)
- [x] AK-UI-17b: Default-Filter ist "Offen" (Status 0+1)
- [x] AK-UI-17c: Filter-Badges zeigen Anzahl pro Gruppe
- [x] AK-UI-17d: Nachrichten-Tab zeigt alle Kundenkommentare tagesübergreifend
- [x] AK-UI-17e: Nachrichten-Tab: Inline-Antwort + Gelesen-Markierung
- [x] AK-UI-17f: API mode=messages liefert vollständige Nachrichten-Bestellungen
- [x] AK-UI-17g: Alle Bestellkarten zuklappen/aufklappen Toggle-Button
- [x] AK-UI-17g2: Bestellschluss 12:00 – Neue Telefonbestellung für heute ab 12 Uhr gesperrt
- [x] AK-UI-17h: Button visuell deaktiviert (disabled + opacity) ab Bestellschluss
- [x] AK-UI-17i: Toast-Hinweis bei Klick auf gesperrten Button
- [x] AK-UI-18: Doppelklick auf Shop-Bestellkarte öffnet Detail-Modal
- [x] AK-UI-18b: Detail-Modal zeigt Positionen-Tabelle mit Menge, Einheit, Preis
- [x] AK-UI-16e: Confirm-Dialog als vollbreites Element unter der Karte (nicht inline in Actions)
- [x] AK-UI-19: Alle UI-Icons verwenden Lucide Icons (keine Emojis in produktiven UI-Elementen)
- [x] AK-UI-19b: Lucide CDN eingebunden, createIcons() wird nach jedem DOM-Update aufgerufen
- [x] AK-UI-20: Shop-Historie-Toggle blendet alte abgeschlossene Bestellungen ein/aus (Default: ausgeblendet)
- [x] AK-UI-20b: Historie-Button zeigt Anzahl alter abgeschlossener Bestellungen
- [x] AK-UI-21: Aktuelle Schicht (Slot-Gruppe) ist farblich hervorgehoben (grün statt orange)
- [x] AK-UI-21b: Aktuelle Schicht ist standardmäßig aufgeklappt, andere collapsed
- [x] AK-UI-21c: "Jetzt"-Badge mit Uhr-Icon pulsiert in der aktuellen Slot-Gruppe
- [x] AK-UI-22: Slot-Header-Badges haben weißen Hintergrund mit farbiger Schrift (lesbar auf orange/grün)
- [x] AK-UI-22b: Badges zeigen Textlabels: "Neu", "Packen", "Warten" (Status 0=Neu, 1=Packen, 2=Warten/Abholbereit)
- [x] AK-UI-23: Filter-Zähler (Zu erledigen/Überfällig) schließen alte erledigte Bestellungen aus
- [x] AK-UI-24: Online-Shop ist Default-Tab beim Laden des Kiosk
- [x] AK-UI-25: Shop-Karten haben expliziten "Details"-Button (Auge-Icon) statt nur Doppelklick
- [x] AK-UI-25b: Button-Labels sind aktionsorientiert: "Annehmen" (statt "Bearbeiten"), "Ausgeben" (statt "Abgeholt")
- [x] AK-UI-25c: "Ausgeben" bei Status "Bereit" – keine Verwechslung mit Status-Anzeige
- [x] AK-UI-25d: "Ausgeben" nur sichtbar wenn Bestellung gepackt (`gepackt: true`), sonst "Packen" anbieten
- [x] AK-UI-26: Stats haben keinen box-shadow und keinen border-radius (flacher Text)
- [x] AK-UI-26b: Stats verwenden Dot-Separatoren zwischen den Werten
- [x] AK-UI-27: Filter-Bar hat border-bottom-Underline statt Button-Borders
- [x] AK-UI-27b: Aktiver Filter hat grünen Hintergrund + weiße Schrift + grüne Unterstreichung (siehe specs/filter-visibility.md)
- [x] AK-UI-28: Tagesauswahl verwendet k-day-pill (keine Borders, runde Pills)
- [x] AK-UI-28b: Aktiver Tag hat grünen Hintergrund mit weißer Schrift
- [x] AK-UI-29: Gerichtzusammenfassung als Inline-Text mit Pipe-Trennern
- [x] AK-UI-30: Bestellquellen-Labels (Online/Telefon/Personal) nur farbiger Text, kein Hintergrund
- [x] AK-UI-30b: Mitnehmen-Label ohne Hintergrund, nur farbiger Text
- [x] AK-UI-31: Bottom-Bar responsive auf Mobile (≤600px)
- [x] AK-UI-32: Gericht auto-select wenn nur 1 Gericht verfügbar
- [x] AK-UI-33: Nachricht-senden nur bei Online-Bestellungen (nicht Telefon/Personal)
- [x] AK-UI-33b: Button-Label kontextabhängig: "Antworten" vs "Nachricht senden"
- [x] AK-UI-34: Stammkunden-Karte zeigt Bearbeiten-Button → Edit-Modal
- [x] AK-UI-34b: Stammkunden-Karte zeigt Löschen-Button → Soft-Delete mit Bestätigung
- [x] AK-UI-34c: Edit-Modal lädt Kundendaten, speichert via PATCH

### Shop-Bestellkarten Redesign
- [x] AK-UI-35: Shop-Karten verwenden Collapse-Pattern wie Mittagstisch (Header immer sichtbar, Details aufklappbar)
- [x] AK-UI-35b: Header zeigt Name, Pos.-Anzahl, Status-Badge, Preis und Primär-Action
- [x] AK-UI-35c: Status als farbiger Badge (Icon + Text) statt Timeline in Karte
- [x] AK-UI-35d: Primär-Action im Header ohne Aufklappen erreichbar (Annehmen/Packen/Ausgeben)
- [x] AK-UI-35e: Aufgeklappte Karte zeigt Bestellnr, Abholdatum, Telefon, Positionen-Liste, volle Action-Buttons
- [x] AK-UI-35f: Details-Button als vollwertiger Button (file-text Icon + "Details") statt Mini-Eye-Icon
- [x] AK-UI-35g: Alle Buttons ≥38px Höhe (Touch-Target-konform)
- [x] AK-UI-35h: Alle zuklappen/aufklappen Toggle für Shop-Karten
- [x] AK-UI-35i: Shop-Karten-Header bricht dynamisch um (flex-wrap) wenn Platz nicht reicht
- [x] AK-UI-35j: Rings, Status-Badge und Preis in .k-oc-meta Container gruppiert (brechen gemeinsam um)
- [x] AK-UI-35k: Mobile: Rings auf 36px skaliert, Name flex-basis angepasst

### Metzger-Tagesgruppen: Visuelle Trennung
- [x] AK-UI-36: Metzger-Tagesgruppen-Header hat box-shadow und margin-bottom:10px zur Abgrenzung von Bestellkarten
- [x] AK-UI-36b: Tagesgruppen-Container hat margin-bottom:20px für klare Trennung zwischen Gruppen

### Bestellstatus: Sticky Header
- [x] AK-UI-37: Bestellstatus-Header (.bs-header) ist sticky (position:sticky, top:0, z-index:100)
- [x] AK-UI-37b: Kein inline position:relative auf .bs-header (verhindert sticky)

### Tab-Badge: Neue Bestellungen + Nachrichten
- [x] Mittagstisch-Tab-Badge zeigt Summe aus neuen Bestellungen (heute, Status 0) + ungelesene Nachrichten (tagesübergreifend)
- [x] Neue Bestellungen werden IMMER für heute gezählt (unabhängig vom gewählten Tag)
- [x] Ungelesene Nachrichten werden über alle Tage gezählt (neuer API-Modus `mode=unread_messages`)
- [x] Badge wird blau eingefärbt wenn Nachrichten vorhanden, sonst orange
- [x] Badge-Tooltip zeigt Aufschlüsselung (z.B. "1 neu, 2 💬")

### Kompakte Buttons (Mobile)
- [x] Action-Buttons (`k-btn-sm`) sind kleiner: min-height 32px, padding 4px 8px, font-size 11px
- [x] Mengenanzeige (`qty-display`) kompakter: 20px statt 24px
- [x] Action-Spalte weniger Padding/Gap

### Info vs. Actions Design-Prinzip
- [x] Stats-Leiste als flacher Inline-Text mit Trennpunkten (nicht als Card/Button)
- [x] Status-Filter als Unterstrich-Tabs (nicht als Button-Chips)
- [x] Tag-Auswahl als schlichte Pills ohne Rand (`k-day-pill`)
- [x] Gerichtzusammenfassung als Inline-Text mit Pipe-Trenner (nicht als Card)
- [x] Bestellquelle (Online/Telefon) als farbiger Text ohne Hintergrund (uppercase, 9px)
- [x] Mitnehmen-Label als kleiner Text statt Badge mit Hintergrund

## API-Endpunkte
- `GET /api/lunch-order?mode=unread_messages` – Anzahl ungelesener Kundennachrichten (tagesübergreifend)
- `GET /api/lunch-order?mode=messages` – Vollständige Bestellungen mit Kundenkommentaren (tagesübergreifend, für Nachrichten-Tab)

### Mittagstisch Gerichtauswahl
- [x] Wenn nur 1 Gericht für heute verfügbar: automatisch als Default vorausgewählt (spart einen Klick)

### Stornierung mit Begründung (Pflicht)
- [x] Storno-Button öffnet Dialog mit 5 vordefinierten Gründen (Pflichtauswahl)
- [x] Optionaler Kommentar als Freitext
- [x] Stornieren-Button erst aktiv wenn Grund gewählt
- [x] Grund wird als `bestaetigung_text` gespeichert → Push an Kunden mit Begründung
- [x] Implementiert in: Kiosk, lunch-admin.html, shop-admin.html (Mittagstisch-Bereich)

### Mittagstisch Filter-Redesign (iPad-optimiert)
- [x] 4 Filter statt 5+1: "Offen" (Neu+Bestätigt), "Nachrichten", "Erledigt" (Abgeholt+Storniert), "Alle"
- [x] Default-Filter ist "Offen" (zeigt alles was noch zu erledigen ist)
- [x] Nachrichten-Tab zeigt alle Kundenkommentare über alle Tage hinweg (nicht nur aktueller Tag)
- [x] Nachrichten-Tab sortiert: ungelesen oben, dann nach Datum absteigend
- [x] Nachrichten-Tab: "Alle als gelesen" Button bei ungelesenen Nachrichten
- [x] Nachrichten-Tab: Inline-Antwort-Funktion (Reply-Box direkt in der Karte)
- [x] Nachrichten-Tab: "Gelesen" Button pro Nachricht
- [x] Nachrichten-Tab: Ungelesene Karten blau hervorgehoben mit NEU-Badge
- [x] Nachrichten-Count wird via `mode=unread_messages` geladen (tagesübergreifend)
- [x] Nachrichten-Tab nutzt neuen API-Modus `mode=messages` für vollständige Bestelldaten
- [x] "Offen"-Tab rot hervorgehoben wenn neue Bestellungen (Status 0) vorhanden
- [x] "Nachrichten"-Tab blau hervorgehoben wenn ungelesene Nachrichten vorhanden

### iPad Mini Optimierung (Schriftbild + Touch-Targets)
- [x] Einheitliche Schriftgrößen: Name 15px, Qty 15px, Badges 11px, Notes 13px
- [x] Touch-Targets mindestens 34px (Action-Buttons) / 44px (Day-Pills)
- [x] Badges (ONLINE, MIT) mit Hintergrund-Pill statt nur Text
- [x] Kommentar-Abschnitte mit Border-Left und Hintergrundfarbe zur Unterscheidung
- [x] Card-Abstände 6px, rounded 10px

### Bestellzeitsperre (Mittagstisch)
- [x] Online-Bestellungen für heute nur bis 10:30 Uhr möglich
- [x] Frontend: `mittagstisch-bestellen.html` zeigt Fehlermeldung + deaktiviert Submit-Button
- [x] Frontend: `index.html` Tagespost-Modal blendet Bestell-Button nach 10:30 aus
- [x] Frontend: Wochenplan (`app.js`, `mobile.js`) bereits implementiert
- [x] Backend: `api/lunch-order` POST lehnt Online-Bestellungen für heute nach 10:30 ab (HTTP 400)
- [x] Personal-/Telefonbestellungen sind nicht betroffen

## Status
- [x] Spec reviewed
- [x] Implementierung
- [x] Validierung (Tab-Badge + kompakte Buttons + Info vs Actions: 2026-06-22)
- [x] Validierung (Bottom-Bar responsive + Gericht-Default + Nachricht-senden + Stammkunden CRUD: 2026-06-25)
