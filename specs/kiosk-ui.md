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

## Betroffene Dateien
- `static-site/kiosk.html` – Tabs, Filter, Gruppen, Tagesauswahl, Kundenformulare

## API-Endpunkte
- `GET /api/shop-order` – Shop-Bestellungen laden
- `POST /api/stammkunden` – Neuen Stammkunden anlegen
- `GET /api/stammkunden?q=...` – Stammkunden suchen
- `GET /api/lunch-order?datum=YYYY-MM-DD` – Mittagstisch-Bestellungen nach Datum

## Akzeptanzkriterien
- [x] AK-UI-01: Tab zeigt "Online-Shop" statt "Abholungen"
- [x] AK-UI-01b: 3 Tabs: Mittagstisch, Online-Shop, Stammkunden (kein Speiseplan)
- [x] AK-UI-01c: Refresh-Button im Header sichtbar
- [x] AK-UI-02: 3 Filter-Buttons: "📦 Zu erledigen", "📅 Heute abholen", "⚠️ Überfällig"
- [x] AK-UI-03: Klick auf Slot-Header klappt Gruppe auf/zu
- [x] AK-UI-04: Pfeil wechselt zwischen ▶ (collapsed) und ▼ (expanded)
- [x] AK-UI-05: Tagesauswahl zeigt 7 Tage (Gestern bis +5)
- [x] AK-UI-06: Nachname/Vorname werden separat erfasst und an API als `nachname`/`vorname` gesendet
- [x] AK-UI-07: Duplikat-Kunde (409) zeigt Info-Toast, nicht Fehlermeldung
- [ ] AK-UI-08: Bei API-Fehler (404/500) wird Toast mit Statuscode angezeigt, kein alert()
- [x] AK-UI-09: Badge auf Online-Shop-Tab zeigt Anzahl offener Bestellungen
- [x] AK-UI-10: Küchenliste druckt Bestellungen nach Gericht gruppiert
- [x] AK-UI-11: Datum wird beim POST normalisiert (YYYY-MM-DD)
- [x] AK-UI-12: GET-Filter findet Bestellungen unabhängig vom Datum-Format
- [x] AK-UI-13: Shop-Stats zeigen handlungsorientierte Labels (kein Umsatz/Bearb.)
- [x] AK-UI-14: Mittagstisch-Stats zeigen Portionen/Mitnehmen/Vor-Ort statt Umsatz
- [x] AK-UI-15: Überfällige Bestellungen rot hervorgehoben
- [x] AK-UI-16: Bestätigen-Button öffnet Confirm-Dialog mit optionalem Textfeld
- [x] AK-UI-16b: Confirm-Dialog zeigt Textfeld mit Placeholder
- [x] AK-UI-16c: Bestätigungstext wird auf Karte grün angezeigt

## Nicht-Ziele
- Keine Änderung am Stammkunden-Tab-Layout (nur Formular)

## Status
- [x] Spec reviewed
- [x] Implementierung
- [x] Validierung – 19/19 Kiosk-Tests grün (2026-06-21)
