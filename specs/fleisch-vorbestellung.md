# Fleisch-Vorbestellung – Spec

> **Feature-ID**: FLEISCH
> **Status**: Entwurf
> **Erstellt**: 2026-06-27

---

## 1. Überblick

Kunden können Fleisch- und Wurstwaren (gewogene Artikel) ab 1 kg vorbestellen und erhalten **15 % Rabatt**. Die Ware wird beim Metzger bestellt, vakuumverpackt geliefert und kann im Laden abgeholt werden.

**Bezahlung:** Bar bei Abholung (kein SEPA, kein Online-Payment).
**Kundendaten:** Name + Telefon (kein Account/JWT erforderlich, localStorage wie Mittagstisch).

---

## 2. Liefertag-Logik

### Liefertage
- **Montag** und **Donnerstag** (fest)

### Bestellschluss
- Am **Werktag davor bis 10:00 Uhr**
- Mo-Lieferung → Bestellschluss **Freitag 10:00**
- Do-Lieferung → Bestellschluss **Mittwoch 10:00**

### Feiertag-Handling
- Liegt der **Liefertag** auf einem Feiertag → Liefertag entfällt, nächster regulärer Termin
- Liegt der **Bestellschluss-Tag** auf einem Feiertag → Bestellschluss verschiebt auf den Werktag davor
- Feiertage: Bayerische gesetzliche Feiertage (identische Logik wie `shop-order/_bayern_feiertage`)

### Beispiele
| Jetzt | Bestellschluss | Nächster Liefertag |
|---|---|---|
| Mi 09:00 | Mi 10:00 | **Do** (gleiche Woche) |
| Mi 11:00 | Fr 10:00 | **Mo** (nächste Woche) |
| Fr 09:00 | Fr 10:00 | **Mo** (nächste Woche) |
| Fr 11:00 | Mi 10:00 | **Do** (nächste Woche) |
| Sa/So | Mi 10:00 | **Do** (nächste Woche) |

---

## 3. Sortiment

### Quelle
- Bestehender Artikelstamm `cr5d4_tables` in Dataverse
- Filter: Warengruppe enthält „Fleisch", „Wurst", „Metzger", „Aufschnitt", „Schinken", „Salami" (identisch zu `is_fleisch_wurst()` in `preisliste/__init__.py`)
- Zusätzlicher Filter: nur gewogene Ware (`einheit == "kg"` / `gewichtsware == true`)

### Preise
- Preise kommen aus dem Artikelstamm (`cr5d4_vk_dorf`)
- Preis pro kg, Umrechnung über `calc_menge_vk()`

### Rabatt
- **15 % auf alle Positionen ab 1 kg**
- Unter 1 kg: kein Rabatt, keine Vorbestellung (→ normaler Ladenkauf)
- Rabatt wird im Frontend angezeigt und im Backend bei Bestellaufgabe berechnet

---

## 4. Bestellseite `fleisch-bestellen.html`

### Design-Prinzip
- Mobile-First, ähnlich wie Mittagstisch-Bestellseite
- Kein Account/Login erforderlich
- Kundendaten (Name, Telefon, optional E-Mail) aus localStorage vorausgefüllt

### Layout

#### Header
- Logo + Titel „Fleisch & Wurst vorbestellen"
- Countdown-Banner: „Nächster Liefertag: Do 03.07. – Bestellen bis Mi 02.07. 10:00 (noch 23h 14min)"
- Wenn Bestellschluss verpasst: nächster möglicher Termin anzeigen

#### Kategorien
- Tabs/Pills: **Alle** | **Rind** | **Schwein** | **Geflügel** | **Wurst** | **Sonstiges**
- Kategorien abgeleitet aus den Warengruppen-Bezeichnungen im Artikelstamm

#### Artikelkarten
- Artikelname
- Preis pro kg
- Durchgestrichener Normalpreis + Rabattpreis (−15%)
- kg-Eingabe (Slider oder Input, Minimum 1.0 kg, Schrittweite 0.5 kg)
- Bild aus SharePoint (falls vorhanden) oder Kategorie-Icon
- ❤️ Favoriten-Button (localStorage)
- „In den Warenkorb"-Button

#### Warenkorb
- Seitliches Panel oder Bottom-Sheet
- Artikelliste mit Menge, Normalpreis (durchgestrichen), Rabattpreis
- Summe + Ersparnis-Anzeige: „Sie sparen: 4,35 €"
- Liefertag-Anzeige (automatisch berechnet)

#### Nachbestellen
- Letzte Bestellung(en) aus localStorage
- „Nochmal bestellen"-Button → alle Positionen in den Warenkorb

#### Checkout
- Name (Pflicht)
- Telefon (Pflicht)
- E-Mail (optional, für Benachrichtigung)
- Anmerkungen (optional, z.B. „Bitte in Scheiben schneiden")
- Liefertag-Anzeige (berechnet, nicht änderbar)
- „Jetzt vorbestellen"-Button

#### Bestätigung
- Bestellnummer anzeigen
- Zusammenfassung: Artikel, Menge, Preis, Ersparnis
- Liefertag + Abholhinweis
- Optional: Push-Benachrichtigung aktivieren

---

## 5. Shop-Integration (`shop.html`)

### Kein gemeinsamer Warenkorb
- Fleisch-Vorbestellungen laufen **komplett separat** vom Shop-Warenkorb
- Verschiedene Abholzeitpunkte (Shop: Abholslot, Fleisch: Liefertag Mo/Do) dürfen nicht vermischt werden

### Verweis-Button bei Fleisch-Artikeln
- Fleisch/Wurst-Artikel im Shop (gewogen, ab Warengruppe Fleisch/Wurst) bekommen einen zusätzlichen Hinweis:
  - Badge: „−15% ab 1kg vorbestellen"
  - Button/Link → leitet zu `fleisch-bestellen.html` weiter
  - Optional: URL-Parameter `?artikel=ARTIKELNUMMER` für Vorauswahl
- Unter 1 kg: normaler Shop-Kauf bleibt möglich

---

## 6. Homepage-Integration (`index.html`)

### Bestehende Fleisch-Promo nutzen
- Die bestehende Fleisch & Wurst Daueraktion (`#fleisch-aktion`, `#mob-popup-meat`) verlinkt auf `fleisch-bestellen.html`
- CTA-Button „Jetzt vorbestellen" → `/fleisch-bestellen`
- Mobile-Popup: Link zu `/fleisch-bestellen`
- Flyer-Seite (`flyer-wurstaktion.html`): Link ergänzen

---

## 7. API `api/fleisch-order`

### Endpunkte

#### POST `/api/fleisch-order` – Bestellung aufgeben
- **Kein JWT erforderlich** (wie Mittagstisch)
- Body:
  ```json
  {
    "name": "Max Mustermann",
    "telefon": "08082 12345",
    "email": "max@example.de",
    "positionen": [
      {"artikelnummer": "123", "bezeichnung": "Schweineschnitzel", "menge_kg": 1.5, "preis_kg": 12.90, "strichcode": "..."}
    ],
    "anmerkung": "Bitte in Scheiben"
  }
  ```
- Backend berechnet:
  - Rabatt (15%) pro Position
  - Gesamtsumme nach Rabatt
  - Nächsten Liefertag
- Bestellnummer-Format: `FM-YYYYMMDD-XXXX`
- Response: Bestellnummer, Liefertag, Zusammenfassung

#### GET `/api/fleisch-order` – Bestellungen abrufen
- `?mode=kiosk` → alle offenen Bestellungen (für Kiosk-Tab)
- `?mode=messages` → alle Bestellungen mit Kundenkommentar (für Kiosk-Nachrichten)
- `?mode=unread_messages` → Anzahl ungelesener Kundenkommentare (für Badge)
- `?nr=FM-xxx&telefon=xxx` → einzelne Bestellung (Statusabfrage)
- `?liefertag=2026-07-03` → alle Bestellungen für einen Liefertag (Sammelbestellung)

#### PATCH `/api/fleisch-order` – Status/Kommentar/Positionen ändern
- Body: `{"id": "...", "status": 1}` (0=Neu, 1=Beim Metzger, 3=Abgeholt, 4=Storniert)
- Body: `{"id": "...", "positionen": [...]}` → aktualisiert `dl_positionen_json` (für per-Item „bestellt"-Tracking)
- Body: `{"id": "...", "kunde_kommentar": "..."}` → setzt Kommentar + `kommentar_gelesen=false`
- Body: `{"id": "...", "personal_antwort": "...", "kommentar_gelesen": true}` → Antwort + Push an Kunde
- Body: `{"id": "...", "kommentar_gelesen": true}` → Nur als gelesen markieren
- Bei Personal-Antwort: Push an Kunde „Neue Nachricht zu Ihrer Bestellung"
- Validierung: `positionen` muss ein Array von Objekten sein, sonst HTTP 400

---

## 8. Dataverse Entity `dl_fleischbestellungs`

> **Manuell anzulegen** in Dataverse

| Feld | Typ | Beschreibung |
|---|---|---|
| `dl_bestellnummer` | Text (100) | z.B. `FM-20260627-A3F2` |
| `dl_name` | Text (200) | Kundenname |
| `dl_telefon` | Text (50) | Telefonnummer |
| `dl_email` | Text (200) | Optional, für Push/E-Mail |
| `dl_liefertag` | Text (20) | `2026-07-03` (berechnet) |
| `dl_bestelldatum` | DateTime | Wann bestellt |
| `dl_positionen_json` | Multiline | JSON-Array der Positionen |
| `dl_gesamtsumme` | Decimal | Summe nach Rabatt |
| `dl_rabatt_summe` | Decimal | Ersparnis durch 15% |
| `dl_status` | Whole Number | 0=Neu, 1=Beim Metzger, 2=Eingetroffen, 3=Abgeholt, 4=Storniert |
| `dl_anmerkung` | Multiline | Kundenwünsche |
| `dl_kunde_kommentar` | Multiline | Nachricht Kunde→Laden |
| `dl_personal_antwort` | Multiline | Nachricht Laden→Kunde |
| `dl_kommentar_gelesen` | Boolean | Ob der Kundenkommentar vom Personal gelesen wurde |

---

## 9. Kiosk-Tab „Metzger" (`kiosk.html`)

### Tab
- Neuer Tab „Metzger" mit Lucide-Icon `beef`
- Zwischen „Stammkunden" und „Social Media" einordnen

### Filter
- **Zu erledigen** (Neu + Beim Metzger + Eingetroffen)
- **Heute abholen** (Liefertag = heute, Status Eingetroffen)
- **Sammelbestellung** (Alle Positionen für nächsten Liefertag aggregiert)
- **Nachrichten** (Kundenkommentare mit Antwort-Möglichkeit, ungelesen/gelesen getrennt)
- **Historie** (Abgeholt + Storniert)

### Bestellkarten
- Klappbare Karten (wie Mittagstisch/Shop-Bestellungen)
- **Header**: Kundenname, Positions-Anzahl, Bestellt-Zähler (X/Y), Status-Badge (k-badge), Quick-Action-Button
- **Body: 2-Spalten-Layout** (Grid: 200px | 1fr):
  - **Links (Meta)**: Bestellnummer, Telefon, Liefertag, Gesamtsumme, Ersparnis, Anmerkung
  - **Rechts (Positionen)**: Artikelliste mit per-Item „bestellt"-Checkbox
- **Per-Item-Bestellung**: Jede Position hat eine Checkbox „bestellt" (nur bei Status 0+1 aktiv)
  - Checkbox-Änderung → sofortiger PATCH an API (positionen_json)
  - Bestellte Items: grüner Hintergrund (#f0fdf4), grüner Text
  - Unbestellte Items: weißer Hintergrund
- **Aktions-Buttons** (am unteren Rand, mit border-top):
  - Status 0: „Alle markieren" oder „Alle beim Metzger bestellt" (wenn alle markiert) + „Stornieren"
  - Status 1: „Eingetroffen"
  - Status 2: „Abgeholt"
  - „Gelesen" bei ungelesenen Nachrichten, „Nachricht" bei offenen Bestellungen
- Status-Badge mit Farbe (k-badge Klassen: st-new, st-confirm, st-ready, st-done, st-cancel)
- Kundenkommentar wird inline angezeigt (blau=ungelesen, grau=gelesen)
- Personal-Antwort wird grün angezeigt
- Touch-Modal für Nachrichten (AK-FLEISCH-19)

### Sammelbestellung (Metzger-Zettel)
- **Pro Liefertag**: alle Einzelpositionen aller Kunden (NICHT aggregiert!)
- Jede Position einzeln mit Kunde, Menge, Zuschnitt – da jede Bestellung separat vakuumverpackt wird
- Checkbox pro Position → markiert als bestellt (PATCH an API)
- **Druckbar** als Bestellzettel für den Metzger
- Button: „Alle als 'Beim Metzger bestellt' markieren"

### Status-Workflow
```
Neu (0) → Beim Metzger bestellt (1) → Abgeholt (3)
                                        ↗
Neu (0) → Storniert (4)
```
> **Hinweis:** Status 2 (Eingetroffen) wurde entfernt. Wareneingang wird nicht dokumentiert.
> Der Kunde holt die Ware direkt ab, nachdem sie beim Metzger bestellt wurde.

---

## 10. CMS-Integration (`cms.html`)

### Konfigurierbare Parameter (CMS-Config `dl_seiteninhalt`)

| Schlüssel | Default | Beschreibung |
|---|---|---|
| `fleisch_rabatt_prozent` | `15` | Rabattsatz in Prozent |
| `fleisch_mindestmenge_kg` | `1` | Mindestmenge in kg für Rabatt |
| `fleisch_liefertage` | `1,4` | Wochentage (0=So, 1=Mo, …, 4=Do) |
| `fleisch_bestellschluss_h` | `10` | Bestellschluss-Uhrzeit (Stunde) |
| `fleisch_aktiv` | `1` | Vorbestellung aktiviert? (0=deaktiviert) |

### CMS-Bereich „Fleisch-Vorbestellung"

- **Einstellungen**: Rabatt, Mindestmenge, Liefertage, Bestellschluss, Aktiv/Inaktiv
- **Bestellübersicht**: Tabelle aller Fleisch-Bestellungen mit Filter (Status, Liefertag, Datum)
- **Liefertag sperren**: Einzelne Liefertage sperren (z.B. Urlaub, Feiertag) → `dl_fleisch_gesperrt` Config-Einträge
- **Export**: Bestellungen als CSV/Druckansicht (für Buchhaltung)
- **Sammelbestellung**: Aggregierte Ansicht pro Liefertag (identisch mit Kiosk, aber mit Bearbeitungsmöglichkeit)

### Validierung im Frontend + Backend
- Wenn `fleisch_aktiv = 0`: Bestellseite zeigt Hinweis „Vorbestellung derzeit nicht möglich"
- Rabatt + Mindestmenge werden live aus CMS-Config geladen, nicht hard-coded

---

## 11. Bestellstatus für Fleischbestellungen

### Erweiterung `bestellstatus.html`
Die bestehende Bestellstatus-Seite wird erweitert, um auch Fleischbestellungen (FM-xxx) anzuzeigen.

#### Auto-Erkennung Bestelltyp
- Bestellnummer mit `FM-` Prefix → API `/api/fleisch-order?nr=XXX&telefon=YYY`
- Bestellnummer mit `MT-` Prefix → API `/api/lunch-order?nr=XXX&email=YYY` (wie bisher)
- Authentifizierung Fleisch: **Bestellnummer + Telefon** (statt E-Mail, da E-Mail optional)

#### Anzeige Fleischbestellung
- Positionen-Tabelle (Artikel, Menge kg, Preis)
- Gesamtsumme + Ersparnis
- Liefertag
- Status-Timeline (Kundenansicht): Neu → Bestätigt → Abholbereit → Abgeholt (+ Storniert)
- Nachrichten (Personal-Antwort) anzeigen
- Kommentar-Feld: Kunde kann Nachricht an den Laden senden

#### localStorage
- `fm_nr` – letzte Fleisch-Bestellnummer
- `fm_telefon` – Telefonnummer (für Auto-Login)

#### Link aus Bestätigung
- Nach erfolgreicher Fleischbestellung: Link "📋 Bestellstatus ansehen" → `/bestellstatus?nr=FM-xxx`
- Bestellnummer + Telefon in localStorage speichern

### Startseiten-Widget „Meine Fleischbestellung"
- Container `#mob-fm-orders` in der Fleisch-Kachel auf der Startseite (Mobile)
- Widget lädt wenn `fm_telefon` im localStorage gesetzt
- API-Call: `GET /api/fleisch-order?telefon=XXX&mode=my`
- API liefert nur Status 0–2 (Neu, Bestätigt, Abholbereit) – NICHT Abgeholt/Storniert
- Bei aktiver Bestellung: Link zu `/bestellstatus?nr=FM-xxx`
- Widget versteckt wenn keine aktiven Bestellungen

### Android Zurück-Button (`fleisch-bestellen.html`)
- **Cart-Drawer**: `history.pushState({overlay:'cart'})` beim Öffnen, `history.back()` beim Schließen per UI
- **Bestätigungs-Ansicht**: `history.pushState({overlay:'confirm'})` nach Bestellerfolg
- **popstate-Listener**: Schließt Cart-Drawer bzw. navigiert von Bestätigung zurück zur Artikelliste

---

## 12. Benachrichtigungen

| Ereignis | Kanal | Empfänger |
|---|---|---|
| Bestellung aufgegeben | E-Mail (optional) | Kunde |
| Status: Eingetroffen | Push + E-Mail | Kunde |
| Status: Storniert | Push + E-Mail | Kunde |
| Neue Bestellung eingegangen | Kiosk-Aktualisierung | Verkäuferin |
| Personal antwortet auf Kommentar | Push | Kunde |

---

## 13. Akzeptanzkriterien

### AK-FLEISCH-01: Liefertag-Berechnung
- [ ] Nächster Liefertag (Mo/Do) wird korrekt berechnet
- [ ] Bestellschluss (Werktag davor 10:00) wird eingehalten
- [ ] Feiertage werden berücksichtigt

### AK-FLEISCH-02: Sortiment aus Artikelstamm
- [ ] Nur Fleisch/Wurst-Artikel mit Gewichtsware werden angezeigt
- [ ] Preise kommen aus Artikelstamm
- [ ] Artikelbilder werden geladen (falls vorhanden)

### AK-FLEISCH-03: Rabatt-Berechnung
- [ ] 15% Rabatt ab 1 kg pro Position
- [ ] Unter 1 kg: kein Rabatt, keine Vorbestellung
- [ ] Rabatt wird im Frontend und Backend korrekt berechnet
- [ ] Ersparnis wird angezeigt

### AK-FLEISCH-04: Bestellung aufgeben
- [ ] Bestellung ohne Account möglich (Name + Telefon)
- [ ] Positionen mit Menge und Rabattpreis
- [ ] Bestellnummer FM-xxx wird generiert
- [ ] Liefertag wird automatisch zugewiesen
- [ ] Bestätigung mit Zusammenfassung

### AK-FLEISCH-05: Favoriten + Nachbestellen
- [ ] Favoriten werden in localStorage gespeichert
- [ ] Letzte Bestellung(en) in localStorage
- [ ] „Nochmal bestellen" übernimmt alle Positionen

### AK-FLEISCH-06: Shop-Verweis
- [x] Fleisch/Wurst-Artikel im Shop zeigen Rabatt-Hinweis
- [x] Link/Button führt zu fleisch-bestellen.html
- [x] Kein gemeinsamer Warenkorb

### AK-FLEISCH-07: Homepage-Integration
- [x] Fleisch-Promo auf Homepage verlinkt zu fleisch-bestellen.html
- [x] Mobile-Popup verlinkt zu fleisch-bestellen.html
- [ ] Flyer-Seite verlinkt zu fleisch-bestellen.html

### AK-FLEISCH-08: Kiosk-Tab „Metzger"
- [x] Eigener Tab mit Bestellübersicht
- [x] Statusfilter funktionieren
- [x] Sammelbestellung pro Liefertag (aggregiert)
- [x] Druckansicht für Metzger-Bestellzettel
- [x] Status-Workflow mit Buttons

### AK-FLEISCH-09: Benachrichtigungen
- [ ] E-Mail bei Bestellaufgabe (optional)
- [x] Push bei Status „Eingetroffen"
- [x] Push bei Stornierung
- [x] Push bei Personal-Antwort auf Kundenkommentar

### AK-FLEISCH-11: Kommentar-System (Kunde ↔ Personal)
- [x] PATCH-API: `kunde_kommentar`, `personal_antwort`, `kommentar_gelesen` aktualisierbar
- [x] GET-API: `mode=messages` liefert alle Bestellungen mit Kommentar
- [x] GET-API: `mode=unread_messages` liefert Anzahl ungelesener Kommentare
- [x] Kiosk: Nachrichten-Filter im Metzger-Tab zeigt alle Kommentare
- [x] Kiosk: Badge zeigt ungelesene Nachrichten + offene Bestellungen
- [x] Kiosk: Bestellkarten zeigen Kundenkommentar + Antwort inline
- [x] Kiosk: Antworten-Button öffnet Inline-Formular, sendet PATCH + Push
- [x] Kiosk: Gelesen-Button markiert Kommentar als gelesen
- [x] Kiosk: „Alle als gelesen" Massenaktion im Nachrichten-Bereich
- [x] Bestellstatus-Seite: Kunde kann Kommentar senden

### AK-FLEISCH-12: Bestellstatus-Seite für Fleisch
- [x] Bestellnummer mit FM-Prefix wird automatisch als Fleischbestellung erkannt
- [x] Lookup per Bestellnummer + Telefon (nicht E-Mail)
- [x] Positionen-Tabelle mit Artikel, Menge, Preis angezeigt
- [x] Gesamtsumme + Ersparnis angezeigt
- [x] Liefertag angezeigt
- [x] Status-Timeline (Kundenansicht): Neu → Bestätigt → Abholbereit → Abgeholt
- [x] Personal-Antwort wird angezeigt
- [x] Kunde kann Kommentar senden (PATCH an fleisch-order API)
- [x] Auto-Login per localStorage (fm_nr + fm_telefon)

### AK-FLEISCH-13: Homepage-Widget „Meine Fleischbestellung“
- [x] Widget in Fleisch-Kachel auf Startseite (Mobile)
- [x] Lädt wenn fm_telefon im localStorage gesetzt
- [x] Zeigt nur aktive Bestellungen (Status 0–2)
- [x] Link führt zu /bestellstatus?nr=FM-xxx
- [x] Versteckt wenn keine aktiven Bestellungen

### AK-FLEISCH-14: Android Zurück-Button (fleisch-bestellen.html)
- [x] Cart-Drawer: pushState beim Öffnen, popstate schließt Drawer
- [x] Bestätigungs-Ansicht: pushState nach Bestellerfolg, popstate zurück zur Artikelliste
- [x] Kein doppeltes history.back() bei UI-Close + Back-Button

### AK-FLEISCH-15: Bestätigung → Bestellstatus-Link
- [x] Nach Bestellerfolg: Link „Bestellstatus ansehen“ in der Bestätigung
- [x] Bestellnummer + Telefon in localStorage gespeichert (fm_nr, fm_telefon)

### AK-FLEISCH-21: Kiosk Per-Item-Bestellung & 2-Spalten-Layout
- [x] Aufgeklappte Fleisch-Bestellkarte zeigt 2-Spalten-Layout (Meta links, Positionen rechts)
- [x] Linke Spalte (200px): Bestellnummer, Telefon, Liefertag, Gesamtsumme, Ersparnis, Anmerkung
- [x] Rechte Spalte: Artikelliste mit per-Item Checkbox „bestellt"
- [x] Checkboxen nur aktiv bei Status 0 (Neu) oder 1 (Beim Metzger bestellt)
- [x] Bestellt-Zähler im Header: „X/Y" Fortschrittsanzeige (statt Quick-Action-Button bei Status 0)
- [x] Checkbox-Änderung speichert sofort per PATCH (positionen_json)
- [x] „Alle markieren"-Button markiert alle Positionen als bestellt
- [x] Wenn alle Positionen bestellt: „Beim Metzger bestellt"-Button erscheint
- [x] Teilweise bestellt: Fortschritts-Anzeige + „Rest markieren"-Button
- [x] Status-Badges mit farbcodierten CSS-Klassen (k-badge st-new/st-confirm/st-ready/st-done/st-cancel)
- [x] Kein doppelter „Bestellt"-Button: Header zeigt nur Fortschritt bei Status 0, Quick-Action erst ab Status 1
- [x] API PATCH akzeptiert `positionen` Array und speichert als `dl_positionen_json`
- [x] Funktionen `K.toggleFmItemBestellt` und `K.toggleAllFmItems` im K-Namespace registriert

### AK-FLEISCH-23: Sammelbestellung Status-Spalte & Batch-Bestellt
- [x] Sammelbestellung-Tabelle hat Status-Spalte (5. Spalte)
- [x] Status pro Artikel: ✅ = alle Positionen bestellt, X/Y = teilbestellt, — = keine bestellt
- [x] API `/fleisch-order?liefertag=...` liefert `bestellt_count` pro aggregiertem Artikel
- [x] „Alle beim Metzger bestellt"-Button setzt alle Positionen auf `bestellt=true` UND Status auf 1
- [x] Filter-Leiste: Full-width sticky ohne Gap (negative margin negiert Panel-Padding)

### AK-FLEISCH-24: Kiosk Metzger UI/UX Optimierung
- [x] Badge blinkt nur bei Status 0 (Neu), nicht bei bearbeiteten Bestellungen
- [x] Bestellnummer und Telefonnummer aus Karten-Anzeige entfernt
- [x] „Anzahl Portionen" Info entfernt
- [x] Bestellungen aufsteigend nach Datum sortiert
- [x] Datumsformat immer dd.mm.yyyy
- [x] Collapsible-Pfeile funktional mit Lucide-Icons
- [x] Status-Workflow: Status 2 (Eingetroffen) entfernt, direkt von „Beim Metzger" zu „Abgeholt"
- [x] Kompaktes Button-Layout für Mobile
- [x] Sammelbestellung: Keine Aggregation gleicher Artikel (jede Position einzeln mit Kundenname)
- [x] API: `einzelpositionen` statt `aggregiert` im Sammelbestellungs-Response

### AK-FLEISCH-26: Metzger Label-Refactoring, Workflow & Historie
- [x] Label: "Beim Metzger" → "In Bestellung" in kiosk.html, shop.html, fleisch-bestellen.html, cms.js, bestellstatus.html
- [x] Label: Checkbox-Titel "Beim Metzger bestellt" → "Bestellt"
- [x] Label: Button "Alle beim Metzger bestellt" → "Alle bestellt"
- [x] Workflow: Neu (0) → In Bestellung (1) → Abgeholt (3), kein Zwischenstatus "Eingetroffen" (2)
- [x] Auto-Advance: Status 0→1 wenn alle Items bestellt (Einzelbestellung + Sammelbestellung)
- [x] Auto-Reset: Status 1→0 wenn ein Item entcheckt wird
- [x] UI: "X Pos." Label aus Mobile-Header entfernt
- [x] UI: Footer-Buttons immer inline (kein Stacking auf iPad Mini)
- [x] API: Neuer Mode `kiosk_history` für abgeschlossene/stornierte Bestellungen (Status ≥ 3)
- [x] Frontend: Historie-Tab lädt Daten über separate API statt aus dem Kiosk-Dataset zu filtern
- [x] Frontend: Auto-Refresh überschreibt Historie-View nicht

### AK-FLEISCH-27: Sammelbestellung Workflow-Fix & 2-Spalten-Layout
- [x] Neues `gesendet`-Flag pro Item: Trennung von "auf Bestellliste" (bestellt) und "beim Metzger bestellt" (gesendet)
- [x] Sammelbestellung: Checkbox zeigt `gesendet`-State statt `bestellt`-State
- [x] Sammelbestellung: Items abhakbar auch wenn `bestellt=true` (solange `gesendet=false`)
- [x] `_fmMarkPositionGesendet()`: Setzt `gesendet=true` auf einzelne Position
- [x] `metzgerAlleGesendet()`: Setzt `gesendet=true` auf alle Positionen (nicht mehr `bestellt`)
- [x] API: `einzelpositionen` enthält `gesendet`-Flag
- [x] 2-Spalten-Grid für Bestellkarten bei Viewport ≥ 900px

### AK-FLEISCH-28: Liefertag-Auswahl & Vorbestellung bis 2 Wochen
- [x] API: `_calc_liefertage_voraus()` liefert alle Liefertage der nächsten ~2 Wochen
- [x] API: `info=1` Response enthält `alle_termine` mit allen verfügbaren Liefertagen
- [x] API: POST akzeptiert optionalen `liefertag`-Parameter und validiert gegen verfügbare Termine
- [x] Frontend: Liefertag-Dropdown im Checkout-Formular mit allen bestellbaren Terminen
- [x] Frontend: Gewählter Liefertag wird bei Bestellung an API gesendet
- [x] Frontend: Footer-Liefertag-Label aktualisiert sich bei Dropdown-Wechsel
- [x] Kiosk Sammelbestellung: Datumswechsel-Buttons wenn Bestellungen für mehrere Liefertage existieren
- [x] Sammelbestellung: Bestellungen landen beim richtigen Liefertag

### AK-FLEISCH-29: Kiosk UI-Verbesserungen (Sammelbestellung, Layout, Detail-Chips)
- [x] Sammelbestellung: "Alle bestellt" Button umbenannt zu "Alle abhaken" mit Bestätigungsdialog
- [x] Sammelbestellung: Schutz wenn bereits alles abgehakt (Toast statt erneuter Request)
- [x] Mittagstisch: 2-Spalten-Grid ab 900px Viewport-Breite
- [x] Metzger Day-Group-Header: Detail-Chips (Anzahl Positionen, Gesamt-kg) ab 700px sichtbar
- [x] Metzger Bestellkarten-Header: Detail-Chips (Anzahl Artikel, Gesamt-kg) ab 700px sichtbar
- [x] Leere States (.k-empty) spannen über volle Breite im Grid
- [x] Shop: Aufklappen-Button in Stats-Zeile integriert (keine eigene Zeile)
- [x] Shop: Sichtbarer Zurück-Button (undo-2 Icon) im Body für Status 1+2
- [x] Shop: Ring-Textlabel ("0/2 gepackt") ab 1200px sichtbar neben Ring
- [x] Shop: Body-Buttons mit Textlabels (Details, Stornieren, Zurück)
- [x] Metzger: Sichtbarer Zurück-Button (undo-2) für Status 1 und 3
- [x] Metzger: revertMetzgerStatus-Funktion mit Bestätigungsdialog

### AK-FLEISCH-25: Kiosk Mittagstisch UI/UX Optimierung
- [x] Collapse/Expand-Button platzsparend (kleiner, Kurztext)
- [x] Preis im Header der Bestellkarte statt im Body
- [x] Lucide-Icon für Collapse-Pfeil statt Unicode
- [x] Kompaktere Badge- und Button-Darstellung

### AK-FLEISCH-10: CMS-Integration
- [x] Rabatt, Mindestmenge, Liefertage, Bestellschluss konfigurierbar
- [x] Fleisch-Vorbestellung aktivierbar/deaktivierbar
- [ ] Liefertage einzeln sperrbar (Urlaub, Sonderfälle)
- [x] Bestellübersicht mit Filter und Export
- [x] Werte werden live aus CMS-Config geladen (nicht hard-coded)

### AK-FLEISCH-20: Fleisch-Banner im Shop immer sichtbar
- [x] Banner „15 % Rabatt auf Fleisch & Wurst" nicht nur in der Kategorien-Übersicht, sondern **in jeder Ansicht** des Shops sichtbar (auch bei aktiver Warengruppe wie Backwaren, Molkereiprodukte etc.)
- [x] Platzierung: oberhalb der Artikelliste, unterhalb der Breadcrumb/Kategorie-Leiste
- [x] Kompakte Darstellung wenn nicht in Fleisch-Kategorie (schmaler, einzeilig)
- [x] In der Fleisch-Kategorie: volle Breite wie aktuell
- [x] Link führt zu `/fleisch-bestellen`

### AK-FLEISCH-16: Produktbilder auf Bestellseite
- [x] `shop-images.js` in `fleisch-bestellen.html` einbinden
- [x] Nach Laden der Artikel `ShopImages.loadBatch()` aufrufen
- [x] Grid-Ansicht: Bild anstelle des Kategorie-Icons anzeigen (Fallback: bisheriges Beef-Icon)
- [x] Listen-Ansicht: kleines Thumbnail (38×38px) anstelle des Icons (Fallback: bisheriges Beef-Icon)
- [x] Bilder kommen über `/api/werbebilder?sharepoint=1` (identisch zu Shop)

### AK-FLEISCH-17: CMS-Metzger Lesbarkeit & Bestelldetails
- [x] Header-Farbe: weiße Schrift auf dunkelrotem Hintergrund (`#7f1d1d`) statt rote Schrift auf grünem Hintergrund
- [x] Bestellkarten aufklappbar: Klick auf Zeile zeigt Details (Positionen, Preise, Anmerkung)
- [x] Status-Buttons in Bestelldetails: „Beim Metzger bestellt", „Eingetroffen", „Abgeholt", „Stornieren"
- [x] Nachricht-Button in Bestelldetails: öffnet Modal zum Antworten (PATCH personal_antwort)
- [x] Kundenkommentar + Personal-Antwort in Details sichtbar
- [x] „Gelesen"-Button bei ungelesenen Kundenkommentaren
- [x] „Vorbestellung aktiviert"-Checkbox prominent als Toggle oben in der Konfiguration

### AK-FLEISCH-18: CMS Sammelbestellung aufsummiert
- [x] Sammelbestellung-Button im Bestellungsbereich
- [x] Gruppierung nach Liefertag (aufklappbar)
- [x] Gleiche Artikel aufsummieren (Gesamtmenge kg + Anzahl Bestellungen)
- [x] Keine einzelnen Kundenbestellungen unter der Summentabelle
- [x] Drucken-Button pro Liefertag

### AK-FLEISCH-22: Kunden-Status-Labels (kein interner Status sichtbar)
- [x] Kunden sehen **kundengerechte** Status-Labels statt interner Bezeichnungen
- [x] Mapping: `0=Neu, 1=Bestätigt, 2=Abholbereit, 3=Abgeholt, 4=Storniert`
- [x] Interne Labels bleiben für Kiosk/CMS: `0=Neu, 1=Beim Metzger, 2=Eingetroffen, 3=Abgeholt, 4=Storniert`
- [x] API liefert beide Felder: `status_label` (intern) + `status_label_kunde` (Kundenansicht)
- [x] Homepage-Widget „Ihre Vorbestellungen" zeigt Kunden-Labels (Bestätigt/Abholbereit)
- [x] Bestellstatus-Seite (`bestellstatus.html`) zeigt Kunden-Labels
- [x] Storno-Hinweis: „Möglich, solange die Bestellung noch nicht bestätigt wurde"
- [x] Status-Icon für Status 1: ✔️ (Haken) statt 🥩 (Fleisch)

### AK-FLEISCH-19: Kiosk Touch-Modal für Nachrichten
- [x] Inline-Nachrichtenfeld in Metzger-Bestellkarten entfernt
- [x] „Nachricht" / „Antworten"-Button stattdessen
- [x] Button öffnet großes Modal-Overlay mit Textarea (min-height 120px, font-size 16px)
- [x] Modal: Abbrechen + Senden Buttons (touch-freundlich, min 44px Höhe)
- [x] PATCH an `/api/fleisch-order` mit `personal_antwort` + `kommentar_gelesen: true`
- [x] Playwright-Test für Modal-Funktion

---

## 14. Umsetzungsreihenfolge

| # | Task | Aufwand |
|---|---|---|
| 1 | ~~Dataverse Entity `dl_fleischbestellungs` anlegen~~ ✅ (via Script) | 20 min |
| 2 | API `api/fleisch-order` (POST/GET/PATCH + Liefertag-Logik) | 2h |
| 3 | `fleisch-bestellen.html` (Katalog, Warenkorb, Favoriten, Nachbestellen) | 5h |
| 4 | Kiosk-Tab „Metzger" (Bestellübersicht, Sammelbestellung, Druck) | 3h |
| 5 | Shop-Verweis bei Fleisch-Artikeln | 1h |
| 6 | Homepage/Flyer-Verlinkung | 30 min |
| 7 | CMS-Integration (Config, Bestellübersicht, Liefertag-Sperre) | 2h |
| 8 | Push/E-Mail bei Statusänderung | 1h |
| 9 | Tests + TESTCASES.md | 2h |
| **Gesamt** | | **~17h** |
