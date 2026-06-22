# Bestellstatus – Kundenansicht & Kommentar-System

## Kontext
Kunden erhalten Push-Benachrichtigungen wenn ihre Mittagsbestellung bestätigt/storniert wird. Bisher öffnete der Klick auf die Notification die Bestellseite (`mittagstisch-bestellen.html`), was keinen Sinn ergibt – der Kunde will seinen Bestellstatus sehen, nicht neu bestellen.

Zusätzlich soll ein Kommentar-System ermöglichen, dass Kunde und Personal bidirektional kommunizieren.

## Anforderungen

### Bestellstatus-Seite (`bestellstatus.html`)
- [x] Eigene Seite unter `/bestellstatus`
- [x] Lookup per Bestellnummer + E-Mail (doppelte Authentifizierung)
- [x] Auto-Login per URL-Parameter (`?nr=XXX`) + localStorage-Email
- [x] Bestelldetails: Gericht, Menge, Preis, Datum, Status, Mitnehmen
- [x] Status-Badge farblich kodiert (Eingegangen=gelb, Bestätigt=grün, Storniert=rot, Abgeholt=blau)
- [x] Nachrichten vom Dorfladen anzeigen (Bestätigungstext, Personal-Antwort)
- [x] Kunde kann Kommentar/Nachricht schreiben
- [x] Mobile-first, modernes Design

### Kommentar-System
- [x] Neues Dataverse-Feld `dl_kunde_kommentar` für Kundennachrichten
- [x] Neues Dataverse-Feld `dl_personal_antwort` für Personalantworten
- [x] Kiosk zeigt Kundenkommentar mit blauer Hervorhebung + Puls-Animation
- [x] Kiosk zeigt Antwort-Button bei bestätigten Bestellungen mit Kundenkommentar
- [x] Antwort-Dialog im Kiosk mit Freitext-Eingabe
- [x] Personalantwort wird per Push an Kunden gesendet
- [x] Bestellstatus-Seite zeigt bidirektionale Kommunikation

### Push-Notifications
- [x] Push-URL zeigt auf `/bestellstatus?nr=XXX` statt `/mittagstisch-bestellen.html`
- [x] Bestellnummer in Push-URL für Auto-Lookup
- [x] Neuer Push-Typ: "💬 Nachricht vom Dorfladen" für Personalantworten

### Mittagstisch-Bestellseite
- [x] Nach erfolgreicher Bestellung: Email + Bestellnummer in localStorage speichern
- [x] Success-Overlay enthält Link "📋 Bestellstatus ansehen"

### Startseite – "Meine Bestellung ansehen" (Einzellink)
- [x] Link unter Mittagstisch-Kachel (Mobile) und unter Wochenplan (Desktop)
- [x] Sichtbar nur wenn: `bs_nr` + `bs_email` im localStorage UND API bestätigt aktive Bestellung
- [x] Aktive Bestellung = Datum ≥ heute UND Status ≠ 2 (storniert)
- [x] Klick führt zu `/bestellstatus` (auto-login per localStorage)
- [x] Versteckt wenn keine aktive Bestellung vorliegt

### Startseite – "Meine Bestellungen" Widget (alle aktiven Bestellungen)
- [x] Container `#mob-my-orders` (Mobile) und `#desk-my-orders` (Desktop) auf Startseite
- [x] Widget lädt automatisch wenn `bs_email` im localStorage gesetzt ist
- [x] API-Call: `GET /api/lunch-order?email=X&mode=my`
- [x] API liefert alle nicht-stornierten Bestellungen mit Datum ≥ heute
- [x] OData-Filter: `dl_email eq '{email}' and dl_status ne 2 and dl_datum ge '{today}'`
- [x] Jede Bestellung als Link zu `/bestellstatus?nr=XXX`
- [x] Anzeige: Gericht, Status-Badge (farblich), Bestellnummer
- [x] Widget versteckt wenn keine Bestellungen oder keine Email im localStorage
- [x] Falsche Email → Widget bleibt versteckt (leere API-Antwort)

### Nachrichten-Gelesen (Kiosk)
- [x] Neues Dataverse-Feld `dl_kommentar_gelesen` (Boolean)
- [x] Nachrichten-Badge blinkt nur bei ungelesenen Nachrichten (`kommentar_gelesen === false`)
- [x] Klick auf Badge markiert alle als gelesen (PATCH `kommentar_gelesen: true`)
- [x] Geräteübergreifend: Status in Dataverse gespeichert, nicht localStorage
- [x] Neuer Kundenkommentar setzt `kommentar_gelesen` automatisch auf `false` zurück

## Betroffene Dateien
- `static-site/bestellstatus.html` – Kundenansicht, Zurück-Link → `/`
- `static-site/kiosk.html` – Kommentar-Anzeige + Antwort-Dialog + Gelesen-Badge
- `static-site/mittagstisch-bestellen.html` – localStorage-Speicherung + Link
- `static-site/index.html` – "Meine Bestellung ansehen" Link (Mobile + Desktop)
- `api/lunch-order/__init__.py` – Neue Felder, Bestellnummer-Lookup, Push-URL, kommentar_gelesen
- `staticwebapp.config.json` – Route `/bestellstatus`

## API-Änderungen
- `GET /api/lunch-order?nr=XXX&email=YYY` – Lookup per Bestellnummer + Email
- `PATCH /api/lunch-order/{id}` – Neue Felder: `kunde_kommentar`, `personal_antwort`
- Push-URL: `/bestellstatus?nr=XXX`

## Dataverse-Felder (dl_mittagsbestellungs)
- `dl_kunde_kommentar` – Einzeilig Text, max 2000 Zeichen (angelegt 2026-06-21)
- `dl_personal_antwort` – Einzeilig Text, max 2000 Zeichen (angelegt 2026-06-21)
- `dl_kommentar_gelesen` – Boolean, Default false (angelegt 2026-06-21)

## Akzeptanzkriterien
- [x] AK-BS-01: Push-Notification öffnet Bestellstatus-Seite (nicht Bestellformular)
- [x] AK-BS-02: Bestellstatus-Seite zeigt Bestelldetails (Gericht, Menge, Preis, Status)
- [x] AK-BS-03: Bestätigungstext vom Personal wird auf Bestellstatus-Seite angezeigt
- [x] AK-BS-04: Kunde kann Kommentar schreiben und absenden
- [x] AK-BS-05: Kundenkommentar erscheint im Kiosk mit blauer Hervorhebung
- [x] AK-BS-06: Personal kann per Antwort-Dialog im Kiosk antworten
- [x] AK-BS-07: Personalantwort wird per Push an Kunden gesendet
- [x] AK-BS-08: Personalantwort erscheint auf Bestellstatus-Seite
- [x] AK-BS-09: Auto-Login per localStorage (Bestellnummer + Email)
- [x] AK-BS-10: Success-Overlay auf Bestellseite enthält Link zum Bestellstatus
- [x] AK-BS-11: "Meine Bestellung ansehen" Link auf Startseite (Mobile unter Kachel, Desktop unter Wochenplan)
- [x] AK-BS-12: Link nur sichtbar bei aktiver Bestellung (Datum ≥ heute, Status ≠ storniert)
- [x] AK-BS-13: Bestellstatus-Seite "Zurück"-Link führt zur Startseite (`/`)
- [x] AK-BS-14: Nachrichten-Badge im Kiosk nutzt `kommentar_gelesen` aus Dataverse (geräteübergreifend)
- [x] AK-BS-15: Klick auf Nachrichten-Badge → PATCH `kommentar_gelesen: true` → Badge verschwindet
- [x] AK-BS-16: Ohne `bs_email` im localStorage → Widget `#mob-my-orders` / `#desk-my-orders` bleibt versteckt
- [x] AK-BS-17: API `mode=my` wird mit korrekter Email aus localStorage aufgerufen
- [x] AK-BS-18: API `mode=my` liefert nicht-stornierte Bestellungen mit Datum ≥ heute (OData-Filter mit Quotes)
- [x] AK-BS-19: Bei aktiven Bestellungen wird Widget sichtbar mit Links zu `/bestellstatus?nr=XXX`
- [x] AK-BS-20: Falsche/unbekannte Email → Widget bleibt versteckt (API gibt leere Liste zurück)

## Nicht-Ziele
- Kein Echtzeit-Chat (kein WebSocket) – Polling reicht
- Keine mehrfachen Kommentare (ein Kommentar pro Seite, überschreibbar)
- Kein Benachrichtigungs-Sound im Kiosk

## Status
- [x] Spec reviewed
- [x] Implementierung
- [x] Validierung – Dataverse-Felder angelegt (2026-06-21), API verifiziert
