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

## Betroffene Dateien
- `static-site/bestellstatus.html` – Neu: Kundenansicht
- `static-site/kiosk.html` – Kommentar-Anzeige + Antwort-Dialog
- `static-site/mittagstisch-bestellen.html` – localStorage-Speicherung + Link
- `api/lunch-order/__init__.py` – Neue Felder, Bestellnummer-Lookup, Push-URL
- `staticwebapp.config.json` – Route `/bestellstatus`

## API-Änderungen
- `GET /api/lunch-order?nr=XXX&email=YYY` – Lookup per Bestellnummer + Email
- `PATCH /api/lunch-order/{id}` – Neue Felder: `kunde_kommentar`, `personal_antwort`
- Push-URL: `/bestellstatus?nr=XXX`

## Dataverse-Felder (dl_mittagsbestellungs)
- `dl_kunde_kommentar` – Einzeilig Text, max 500 Zeichen
- `dl_personal_antwort` – Einzeilig Text, max 500 Zeichen

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

## Nicht-Ziele
- Kein Echtzeit-Chat (kein WebSocket) – Polling reicht
- Keine mehrfachen Kommentare (ein Kommentar pro Seite, überschreibbar)
- Kein Benachrichtigungs-Sound im Kiosk

## Status
- [x] Spec reviewed
- [x] Implementierung
- [ ] Validierung – Dataverse-Felder müssen noch in Prod angelegt werden
