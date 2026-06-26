# AK-UI-39 – Shop-Bestellung Kommunikation (Kunde ↔ Verkäufer)

## Ziel
Gegenseitiger Nachrichtenaustausch zwischen Kunde und Verkäufer bei Shop-Bestellungen (Warenkorb-Bestellungen), analog zur bestehenden Mittagessen-Kommunikation.

## Ist-Zustand
- **Mittagessen:** Felder `kunde_kommentar`, `personal_antwort`, `kommentar_gelesen` existieren.
  Kunde kann über `bestellstatus.html` eine Nachricht senden, Verkäufer sieht sie im Kiosk mit NEU-Badge und kann antworten.
- **Shop:** Es gibt nur das `anmerkungen`-Feld (einmalig bei Bestellaufgabe). Keine nachträgliche Kommunikation möglich.

## Soll-Zustand

### Dataverse-Felder (dl_shopbestellungs)
Neue Felder im bestehenden Entity:
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `dl_kunde_kommentar` | Text (2000) | Letzte Nachricht vom Kunden |
| `dl_personal_antwort` | Text (2000) | Letzte Antwort vom Verkäufer |
| `dl_kommentar_gelesen` | Boolean | Wurde Kundennachricht gelesen? |

### API (shop-order/__init__.py)
1. **GET (Serialisierung):** `kunde_kommentar`, `personal_antwort`, `kommentar_gelesen` in Response aufnehmen
2. **PATCH:** Neue Felder `kunde_kommentar`, `personal_antwort`, `kommentar_gelesen` akzeptieren
   - Bei neuem `kunde_kommentar` → `kommentar_gelesen = False`
   - Bei `personal_antwort` → Push-Nachricht an Kunden
   - Bei `kommentar_gelesen` → Markierung setzen
3. **Kunden-PATCH:** JWT-Prüfung + Email-Abgleich bei `kunde_kommentar`

### Frontend: Kundenseite (shop.html Bestellstatus)
- Nachrichtenbereich unter Bestelldetails anzeigen (Dorfladen-Antwort + eigene Nachricht)
- Textfeld + Senden-Button für Kundennachricht
- Nur sichtbar wenn Bestellung nicht abgeholt/storniert

### Frontend: Kiosk (kiosk.html)
1. **Shop-Order Card:** NEU-Badge bei ungelesener Nachricht
2. **Expandierte Ansicht:** Nachrichten (Kunde + Antwort) anzeigen + Antworten-Button + Gelesen-Button
3. **Antwort-Dialog:** Textfeld + Senden → PATCH mit `personal_antwort`

### Push-Benachrichtigung
- Verkäufer antwortet → Push an Kunden: "💬 Nachricht zu Ihrer Bestellung"
- Kunde schreibt → NEU-Badge im Kiosk (kein Push an Verkäufer, da Polling)

## Anpassungsstellen

### Backend
1. `api/shop-order/__init__.py` – Serialisierung, PATCH-Handler

### Frontend
2. `static-site/kiosk.html` – Shop-Order-Card + Antwort-Funktion
3. `static-site/shop.html` – Kundenseite Bestellstatus/Nachrichtenaustausch

### Dataverse
4. Felder `dl_kunde_kommentar`, `dl_personal_antwort`, `dl_kommentar_gelesen` in `dl_shopbestellungs` anlegen
