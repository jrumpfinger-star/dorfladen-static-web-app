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

#### PATCH `/api/fleisch-order` – Status/Kommentar ändern
- Body: `{"id": "...", "status": 1}` (0=Neu, 1=Beim Metzger, 2=Eingetroffen, 3=Abgeholt, 4=Storniert)
- Body: `{"id": "...", "kunde_kommentar": "..."}` → setzt Kommentar + `kommentar_gelesen=false`
- Body: `{"id": "...", "personal_antwort": "...", "kommentar_gelesen": true}` → Antwort + Push an Kunde
- Body: `{"id": "...", "kommentar_gelesen": true}` → Nur als gelesen markieren
- Bei Status 2 (Eingetroffen): Push an Kunde „Ihre Fleischbestellung ist abholbereit"
- Bei Personal-Antwort: Push an Kunde „Neue Nachricht zu Ihrer Bestellung"

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
- Kundenname, Telefon, Bestellnummer
- Positionen mit Menge und Preis
- Status-Badge mit Farbe
- Aktions-Buttons: Status ändern, Nachricht senden/Antworten, Gelesen markieren
- Kundenkommentar wird inline angezeigt (blau=ungelesen, grau=gelesen)
- Personal-Antwort wird grün angezeigt
- Inline-Antwort-Formular per Button

### Sammelbestellung (Metzger-Zettel)
- **Pro Liefertag**: alle Positionen aller Kunden aggregiert
- Beispiel: „Montag 30.06.: Schweineschnitzel 4.5 kg, Rinderfilet 2.0 kg, Bratwurst 3.0 kg"
- **Druckbar** als Bestellzettel für den Metzger
- Button: „Alle als 'Beim Metzger bestellt' markieren"

### Status-Workflow
```
Neu → Beim Metzger bestellt → Eingetroffen → Abgeholt
                                              ↗
Neu → Storniert
```

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
- Status-Timeline: Neu → Beim Metzger bestellt → Eingetroffen → Abgeholt (+ Storniert)
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
- API liefert nur Status 0–2 (Neu, Beim Metzger, Eingetroffen) – NICHT Abgeholt/Storniert
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
- [ ] Bestellstatus-Seite: Kunde kann Kommentar senden

### AK-FLEISCH-12: Bestellstatus-Seite für Fleisch
- [ ] Bestellnummer mit FM-Prefix wird automatisch als Fleischbestellung erkannt
- [ ] Lookup per Bestellnummer + Telefon (nicht E-Mail)
- [ ] Positionen-Tabelle mit Artikel, Menge, Preis angezeigt
- [ ] Gesamtsumme + Ersparnis angezeigt
- [ ] Liefertag angezeigt
- [ ] Status-Timeline: Neu → Beim Metzger → Eingetroffen → Abgeholt
- [ ] Personal-Antwort wird angezeigt
- [ ] Kunde kann Kommentar senden (PATCH an fleisch-order API)
- [ ] Auto-Login per localStorage (fm_nr + fm_telefon)

### AK-FLEISCH-13: Homepage-Widget „Meine Fleischbestellung“
- [ ] Widget in Fleisch-Kachel auf Startseite (Mobile)
- [ ] Lädt wenn fm_telefon im localStorage gesetzt
- [ ] Zeigt nur aktive Bestellungen (Status 0–2)
- [ ] Link führt zu /bestellstatus?nr=FM-xxx
- [ ] Versteckt wenn keine aktiven Bestellungen

### AK-FLEISCH-14: Android Zurück-Button (fleisch-bestellen.html)
- [ ] Cart-Drawer: pushState beim Öffnen, popstate schließt Drawer
- [ ] Bestätigungs-Ansicht: pushState nach Bestellerfolg, popstate zurück zur Artikelliste
- [ ] Kein doppeltes history.back() bei UI-Close + Back-Button

### AK-FLEISCH-15: Bestätigung → Bestellstatus-Link
- [ ] Nach Bestellerfolg: Link „Bestellstatus ansehen“ in der Bestätigung
- [ ] Bestellnummer + Telefon in localStorage gespeichert (fm_nr, fm_telefon)

### AK-FLEISCH-10: CMS-Integration
- [x] Rabatt, Mindestmenge, Liefertage, Bestellschluss konfigurierbar
- [x] Fleisch-Vorbestellung aktivierbar/deaktivierbar
- [ ] Liefertage einzeln sperrbar (Urlaub, Sonderfälle)
- [x] Bestellübersicht mit Filter und Export
- [x] Werte werden live aus CMS-Config geladen (nicht hard-coded)

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
