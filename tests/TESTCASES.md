# Dorfladen – Wiederkehrende Testcases

> Diese Datei wird bei Änderungen/Fehlern erweitert.  
> Tests werden per Playwright auf der Live-Seite durchgeführt.  
> Jeder Test hat: **Aktion** (was tun), **Prüfung** (was prüfen), **Erwartung** (expected outcome).

## Umgebungen
| Umgebung | URL |
|---|---|
| Produktion | https://kind-pebble-072605b03.7.azurestaticapps.net |
| Bestellsystem | https://witty-island-064f9d903.7.azurestaticapps.net |

---

## T1 – Startseite: Navigation & Links

### T1.1 – Seite lädt fehlerfrei
- **Aktion:** Startseite `/` aufrufen
- **Prüfung:** Browser-Console auf Fehler prüfen (`console.errors`)
- **Erwartung:** 0 JS-Errors in der Console

### T1.2 – Desktop-Navigation enthält Kiosk-Link
- **Aktion:** Startseite laden, Desktop-Viewport (>768px)
- **Prüfung:** `document.querySelector('a[href="/kiosk"]')` im Desktop-Nav prüfen
- **Erwartung:** Link `🏪 Kiosk` vorhanden, `offsetParent !== null` (sichtbar), wenn Feature-Flag `mittagstisch` aktiv

### T1.3 – Mobile-Navigation enthält Kiosk-Link
- **Aktion:** Startseite laden, Mobile-Viewport (<768px) oder Footer-Navigation prüfen
- **Prüfung:** `a[href="/kiosk"]` im Mobile-Footer prüfen
- **Erwartung:** Link `🏪 Kiosk` vorhanden mit CSS-Klasse `feature-mittagstisch`, wenn Feature-Flag aktiv

### T1.4 – Hauptlinks erreichbar
- **Aktion:** Auf Startseite alle Hauptlinks sammeln (Shop, Sortiment, Öffnungszeiten, Bilder)
- **Prüfung:** Jeder Link hat gültiges `href` und `offsetParent !== null`
- **Erwartung:** Mindestens 4 Navigations-Links sichtbar und klickbar

---

## T2 – Wochenplan / Mittagstisch (Desktop & Mobile)

### T2.1 – Wochenplan wird angezeigt
- **Aktion:** Startseite laden, `#wp-body` Element prüfen
- **Prüfung:** `document.getElementById('wp-body').innerHTML` enthält `<table class="wp-table">`
- **Erwartung:** Tabelle mit 5 Tagen (Mo–Fr), KW-Nummer sichtbar, Datumsbereich angezeigt

### T2.2 – Vergangene Tage ausgegraut (Mo–Fr, unter der Woche)
- **Aktion:** An einem Werktag (z.B. Mittwoch) die Seite laden
- **Prüfung:** Für Tage mit Index < `todayIdx`: `style.opacity` der `<tr>` Elemente prüfen
- **Erwartung:** Vergangene Tage haben `opacity: .45`, heutiger und zukünftige Tage `opacity: 1` (kein inline style)

### T2.3 – Kein Bestell-Button bei vergangenen Tagen
- **Aktion:** An einem Werktag die Seite laden
- **Prüfung:** Für vergangene Tage `<a class="feature-mittagstisch">` zählen
- **Erwartung:** Vergangene Tage: `hasOrderBtn = false`, zukünftige Tage: `hasOrderBtn = true`

### T2.4 – Bestellschluss heute 10:00 Uhr
- **Aktion:** Am heutigen Tag die Seite laden
- **Prüfung:** Für heutigen Tag den Bestell-Button prüfen
- **Erwartung:**
  - Vor 10:00 Uhr: Button sichtbar (`hasOrderBtn = true`)
  - Ab 10:00 Uhr: Button versteckt (`hasOrderBtn = false`)

### T2.5 – Wochenende zeigt nächste Woche
- **Aktion:** Am Samstag oder Sonntag die Seite laden
- **Prüfung:** Alle 5 Tage auf `opacity` und `hasOrderBtn` prüfen
- **Erwartung:** Alle Tage haben `opacity: 1` (keine Opacity), alle haben `hasOrderBtn = true`, Wochentage sind Mo–Fr der nächsten Woche

### T2.6 – Bestell-Button URL korrekt
- **Aktion:** Auf einen sichtbaren Bestell-Button das `href` prüfen
- **Prüfung:** URL enthält Parameter `gericht_id`, `gericht`, `preis`, `datum`, `tag`
- **Erwartung:** URL = `/mittagstisch-bestellen.html?gericht_id=...&gericht=...&preis=...&datum=YYYY-MM-DD&tag=Montag`

### T2.7 – Mobile Wochenplan analog
- **Aktion:** Mobile-Viewport laden, `#mob-wp-days` prüfen
- **Prüfung:** Gleiche Logik wie Desktop (opacity, canOrder, isWeekend)
- **Erwartung:** Ergebnisse identisch zu T2.2–T2.5 für mobile Ansicht

---

## T3 – Shop-Admin (/shop-admin)

### T3.1 – Seite lädt fehlerfrei
- **Aktion:** `/shop-admin` aufrufen
- **Prüfung:** `console.errors` zählen
- **Erwartung:** 0 JS-Errors

### T3.2 – Kiosk-Link im Header
- **Aktion:** Header-Toolbar prüfen
- **Prüfung:** `document.querySelector('a[href="/kiosk"]')`
- **Erwartung:** Button mit Text `🏪Kiosk` vorhanden, `offsetParent !== null`

### T3.3 – Mittagstisch-Sektion Header
- **Aktion:** Seite laden
- **Prüfung:** `#mt-section` existiert, `#mt-badge` prüfen
- **Erwartung:** Gelber Header sichtbar, Badge zeigt Zahl oder ist `display:none` wenn 0

### T3.4 – Mittagstisch aufklappen → Tages-Tabs
- **Aktion:** `toggleMittag()` aufrufen
- **Prüfung:** `#mt-day-tabs` Buttons zählen und Texte prüfen
- **Erwartung:** 5 Buttons mit Werktagen (heute + nächste 4 Werktage). Erster Button = "📅 Heute" wenn Werktag, sonst "Mo DD.MM"

### T3.5 – Wochenende: Erster Tab = nächster Montag
- **Aktion:** Am Sa/So `toggleMittag()` aufrufen
- **Prüfung:** Text des ersten Tab-Buttons, `#mt-orders` Text prüfen
- **Erwartung:** Erster Tab = "Mo DD.MM" (nicht Sa/So), Bestellungen laden für Montag-Datum

### T3.6 – Tab-Wechsel lädt korrekten Tag
- **Aktion:** `mtSelectDay('YYYY-MM-DD')` für einen anderen Wochentag aufrufen
- **Prüfung:** `#mt-orders` Text prüfen nach 2s Wartezeit
- **Erwartung:** Text enthält das gewählte Datum (z.B. "für 2026-06-24")

### T3.7 – Stats-Zähler korrekt
- **Aktion:** Nach dem Laden der Bestellungen `#mt-stats` prüfen
- **Prüfung:** 4 Stat-Divs: Neu, Bestätigt, Abgeholt, Storniert
- **Erwartung:** Summe der Zähler = Anzahl geladener Bestellungen

### T3.8 – Status-Buttons
- **Aktion:** Bei einer Bestellung mit Status "Neu" auf "✅ Bestätigen" klicken
- **Prüfung:** `mtSetStatus(id, 1)` aufrufen, danach Bestellliste neu laden
- **Erwartung:** Status ändert sich von "Neu" auf "Bestätigt", PATCH Request an `/api/lunch-order` erfolgreich

### T3.9 – Neue Bestellung: Formular öffnen
- **Aktion:** `mtShowNewOrder()` aufrufen
- **Prüfung:** `#mt-new-form` `display` prüfen, Formularfelder prüfen
- **Erwartung:** Formular sichtbar (`display !== 'none'`), Felder leer, Menge=1

### T3.10 – Gericht-Dropdown passend zum Tag
- **Aktion:** Formular öffnen, `#mt-new-gericht` Options prüfen
- **Prüfung:** Options haben `data-gericht` und `data-preis` Attribute
- **Erwartung:** Nur Gerichte des gewählten Wochentags (Wochenplan-Tag-Code stimmt überein). Format: `Gerichtname (X,XX€)`

### T3.11 – Manuelle Bestellung speichern
- **Aktion:** Name eingeben, Gericht wählen, "✅ Bestellung speichern" klicken
- **Prüfung:** Network-Request prüfen: POST `/api/lunch-order` mit Body
- **Erwartung:** Request-Body enthält `quelle: 1` (Telefon) oder `2` (Personal), `erfasst_von: "Shop-Admin"`, `datum: YYYY-MM-DD`. Response: `{success: true}`. Formular schließt, Bestellliste aktualisiert.

### T3.12 – Online-Shop separiert
- **Aktion:** Unter der Mittagstisch-Sektion prüfen
- **Prüfung:** `document.body.innerHTML.match(/Online-Shop-Bestellungen/)`
- **Erwartung:** Überschrift "🛒 Online-Shop-Bestellungen" vorhanden, darunter eigene Statistiken

---

## T4 – Kiosk (/kiosk)

### T4.1 – Seite lädt fehlerfrei
- **Aktion:** `/kiosk` aufrufen
- **Prüfung:** `console.errors` zählen
- **Erwartung:** 0 JS-Errors

### T4.2 – 3 Tabs vorhanden
- **Aktion:** `.k-tab` Elemente zählen und Texte lesen
- **Prüfung:** `document.querySelectorAll('.k-tab')` → `textContent`
- **Erwartung:** 3 Tabs: "🍽 Mittagstisch", "🛒 Online-Shop", "👥 Stammkunden" (kein Speiseplan-Tab)

### T4.3 – Online-Shop Badge: Nur aktiv zu erledigende Bestellungen
- **Aktion:** Badge `#badge-abhol` prüfen
- **Prüfung:** Badge-Zahl ≤ Zahl offener Bestellungen (`#fc-open`)
- **Erwartung:** Badge = Eingang (Status 0) + Packen (Status 1), **nicht** Warten (Status 2)

### T4.4 – Online-Shop: 3 Filter (Zu erledigen / Heute abholen / Überfällig)
- **Aktion:** Online-Shop-Tab öffnen, Filter-Buttons anklicken
- **Prüfung:** Active-Klasse wechselt, angezeigte Bestellungen ändern sich
- **Erwartung:** "Zu erledigen" = Status < 3, "Heute abholen" = Abholdatum heute, "Überfällig" = Abholzeit vorbei + Status < 3

### T4.5 – Stammkunden-Tab: Buttons vorhanden
- **Aktion:** Stammkunden-Tab öffnen
- **Prüfung:** "Neuer Kunde" und "Alle laden" Buttons prüfen
- **Erwartung:** Beide Buttons sichtbar und klickbar

### T4.6 – Refresh-Button im Header
- **Aktion:** Header-Bereich prüfen
- **Prüfung:** `.k-header button[title="Aktualisieren"]` vorhanden
- **Erwartung:** 🔄 Button sichtbar rechts neben der Uhr, lädt Bestellungen neu

### T4.7 – Küchenliste drucken
- **Aktion:** Tag in Tagesauswahl wechseln (z.B. Di 23.06), dann "🖨 Küchenliste drucken" klicken
- **Prüfung:** Neues Fenster öffnet sich mit gruppierter Ansicht
- **Erwartung:**
  - Datum = **ausgewählter Tag** (nicht immer heute) – *Bugfix: war `new Date()` statt `_mittagDatum`*
  - Kundennamen vollständig angezeigt – *Bugfix: `o.name` statt `o.kundenname`*
  - Portionen korrekt gezählt – *Bugfix: `o.menge` statt `o.portionen`*
  - Bestellungen nach Gericht gruppiert, Mitnehmen/Vor-Ort Aufschlüsselung, Gesamtstatistik

### T4.8 – Bottom-Bar: Nur 2 Buttons
- **Aktion:** `.k-bottom` Buttons zählen
- **Prüfung:** `document.querySelectorAll('.k-bottom .k-btn')` → `length`
- **Erwartung:** 2 Buttons: "☎ Neue Telefonbestellung" und "🖨 Küchenliste drucken" (kein separater Refresh-Button)

### T4.9 – Überfällige Bestellungen rot hervorgehoben
- **Aktion:** Online-Shop-Tab öffnen, Überfällig-Filter klicken
- **Prüfung:** CSS-Klasse `k-order-overdue` an überfälligen Karten
- **Erwartung:** Rote Hervorhebung (`border-left-color:#dc2626`, `background:#fef2f2`)

### T4.10 – Bestätigen: Abbrechen schließt Dialog
- **Aktion:** Bei offener Bestellung "Bestätigen" klicken, dann "Abbrechen"
- **Prüfung:** Dialog verschwindet, Status unverändert
- **Erwartung:** `.k-confirm-dialog` nicht mehr sichtbar

### T4.11 – Mittagstisch-Stats: Keine veralteten Labels
- **Aktion:** Mittagstisch-Tab prüfen
- **Prüfung:** Stats-Text enthält "Portionen", nicht "Umsatz"/"Bestätigt"/"Abgeholt"
- **Erwartung:** Nur handlungsorientierte Labels

### T4.12 – Küchenliste Code: Korrekte Feldnamen
- **Aktion:** Quellcode prüfen
- **Prüfung:** `printKitchen` verwendet `o.name`, `o.menge`, `_mittagDatum`
- **Erwartung:** Kein `o.kundenname`, kein `o.portionen`, kein `new Date()` für Datum

---

## T9 – Datum-Normalisierung (lunch-order API)

### T9.1 – POST normalisiert Datum
- **Aktion:** POST `/api/lunch-order` mit `datum: "2026-06-22T00:00:00Z"`
- **Prüfung:** GET `/api/lunch-order?datum=2026-06-22`, Bestellung prüfen
- **Erwartung:** Bestellung gefunden, `datum` in Response = `"2026-06-22"` (ohne Zeitstempel)

### T9.2 – GET findet Bestellungen unabhängig vom Format
- **Aktion:** GET `/api/lunch-order?datum=2026-06-22`
- **Prüfung:** Findet sowohl Records mit `dl_datum="2026-06-22"` als auch `dl_datum="2026-06-22T00:00:00Z"`
- **Erwartung:** Alle Bestellungen für dieses Datum werden zurückgegeben

### T9.3 – API-Rückgabe normalisiert Datum
- **Aktion:** GET `/api/lunch-order` (ohne Datum-Filter)
- **Prüfung:** Alle `datum`-Felder in der Response prüfen
- **Erwartung:** Kein Datum enthält `T00:00:00Z`, alle im Format `YYYY-MM-DD`

---

## T10 – Bestätigen mit optionalem Text

### T10.1 – Bestätigen öffnet Confirm-Dialog
- **Aktion:** Kiosk laden, bei offener Bestellung auf "✅ Bestätigen" klicken
- **Prüfung:** Inline-Dialog mit Textfeld erscheint
- **Erwartung:** Dialog sichtbar, Textfeld hat Placeholder "Nachricht an Kunde (optional)"

### T10.2 – Bestätigen ohne Text
- **Aktion:** Confirm-Dialog öffnen, direkt "✅ Bestätigen" klicken (ohne Text)
- **Prüfung:** PATCH wird ohne `bestaetigung_text` gesendet
- **Erwartung:** Bestellung bestätigt, Toast zeigt "✅ Bestätigt"

### T10.3 – Bestätigen mit Text
- **Aktion:** Confirm-Dialog öffnen, "Abholzeit 12:30" eingeben, "✅ Bestätigen" klicken
- **Prüfung:** PATCH mit `bestaetigung_text: "Abholzeit 12:30"` gesendet
- **Erwartung:** Bestellung bestätigt, Text auf Karte grün angezeigt

### T10.4 – Abbrechen schließt Dialog
- **Aktion:** Confirm-Dialog öffnen, "← Abbrechen" klicken
- **Prüfung:** Dialog verschwindet, Status unverändert
- **Erwartung:** Dialog nicht sichtbar, Bestellung immer noch "Neu"

### T10.5 – Bestätigungstext auf Karte sichtbar
- **Aktion:** Bestellung mit Bestätigungstext laden
- **Prüfung:** Karte zeigt grün hinterlegten Text mit ✅-Prefix
- **Erwartung:** Div mit `background:#dcfce7` und `border-left:3px solid #16a34a` vorhanden

---

## T11 – Stammkunden-Suche (erweitert)

### T11.1 – Suche nach Nachname
- **Aktion:** GET `/api/stammkunden?q=Rumpf`
- **Prüfung:** Kunden mit Nachname "Rumpfinger" werden gefunden
- **Erwartung:** Mindestens 1 Treffer, `nachname` enthält "Rumpf"

### T11.2 – Suche nach Vorname
- **Aktion:** GET `/api/stammkunden?q=Josef`
- **Prüfung:** Kunden mit Vorname "Josef" werden gefunden
- **Erwartung:** Mindestens 1 Treffer, `vorname` enthält "Josef"

### T11.3 – Suche nach E-Mail
- **Aktion:** GET `/api/stammkunden?q=@example`
- **Prüfung:** Kunden mit E-Mail-Domain werden gefunden
- **Erwartung:** Treffer wenn E-Mail `@example` enthält

### T11.4 – Suche nach Telefon (bestehend)
- **Aktion:** GET `/api/stammkunden?q=08082`
- **Prüfung:** Kunden mit Telefonnummer werden gefunden
- **Erwartung:** Treffer wenn Telefon `08082` enthält

---

## T5 – Lunch-Admin (/lunch-admin)

### T5.1 – Seite lädt fehlerfrei
- **Aktion:** `/lunch-admin` aufrufen
- **Prüfung:** `console.errors` zählen
- **Erwartung:** 0 JS-Errors

### T5.2 – Kiosk-Link im Header
- **Aktion:** `a[href="/kiosk"]` prüfen
- **Prüfung:** Link vorhanden und sichtbar
- **Erwartung:** Text enthält "🏪 Kiosk"

### T5.3 – Bestellungen laden und filtern
- **Aktion:** Datumsfilter ändern oder Status-Filter wählen
- **Prüfung:** Bestelltabelle aktualisiert sich
- **Erwartung:** Bestellungen gefiltert nach gewähltem Datum/Status, Zähler passt

---

## T6 – CMS (/cms)

### T6.1 – Feature-Toggle Farben
- **Aktion:** `/cms` aufrufen, `.feat-slider` Elemente prüfen
- **Prüfung:** `getComputedStyle(slider).backgroundColor` für checked/unchecked
- **Erwartung:**
  - An (checked): `rgb(34, 197, 94)` = Grün
  - Aus (unchecked): `rgb(229, 231, 235)` = Grau

### T6.2 – Toggle Labels
- **Aktion:** `::after` Pseudo-Element prüfen
- **Prüfung:** Content des `::after` Elements
- **Erwartung:** Checked = "AN", Unchecked = "AUS"

---

## T7 – Mittagstisch bestellen (/mittagstisch-bestellen)

### T7.1 – Formular lädt mit URL-Parametern
- **Aktion:** `/mittagstisch-bestellen.html?gericht_id=123&gericht=Cordon+bleu&preis=9.80&datum=2026-06-23&tag=Montag` aufrufen
- **Prüfung:** Formularfelder auf Vorbelegung prüfen
- **Erwartung:** Gerichtname = "Cordon bleu", Preis = "9,80", Datum und Tag korrekt angezeigt

### T7.2 – Pflichtfeld-Validierung
- **Aktion:** Formular absenden ohne Name und Telefon
- **Prüfung:** Validierungsmeldungen prüfen
- **Erwartung:** Fehlermeldung: "Name ist erforderlich" oder HTML5-Validierung verhindert Submit

### T7.3 – Bestellung absenden
- **Aktion:** Name, Telefon, E-Mail ausfüllen und absenden
- **Prüfung:** POST-Request an `/api/lunch-order`, Response prüfen
- **Erwartung:** `{success: true, bestellnummer: "MT-YYMMDD-XXXXX"}`, Bestätigungsseite/Meldung erscheint

---

## T8 – Shop-Config (CMS-konfigurierbare Werte)

### T8.1 – Öffnungszeiten werden von /api/hours geladen
- **Aktion:** `/shop.html` laden, Network-Tab beobachten
- **Prüfung:** Request an `/api/hours` wird beim Start gemacht
- **Erwartung:** Request vorhanden, Response `{success: true, data: [...]}`

### T8.2 – CMS-Config wird beim Start geladen
- **Aktion:** `/shop.html` laden, Network-Tab beobachten
- **Prüfung:** Request an `/api/cms-config` wird beim Start gemacht
- **Erwartung:** Request vorhanden, Response `{success: true, data: {...}}`

### T8.3 – Mindestbestellwert dynamisch
- **Aktion:** `/shop.html` laden, Warenkorb öffnen (mit Artikeln unter Mindestbestellwert)
- **Prüfung:** `#shop-cart-minorder` Text prüfen
- **Erwartung:** Text zeigt dynamischen Wert (aus CMS oder Default 10,00 €), NICHT den Platzhalter "wird geladen…"

### T8.4 – SHOP_HOURS aus Öffnungszeiten-API
- **Aktion:** `/shop.html` laden, Abholslots prüfen
- **Prüfung:** Slot-Zeiten stimmen mit `/api/hours`-Daten überein
- **Erwartung:** Slots basieren auf live Öffnungszeiten, nicht auf hardcoded Werten

### T8.5 – API: cms-config liefert korrektes Format
- **Aktion:** GET `/api/cms-config`
- **Prüfung:** Response-Body parsen
- **Erwartung:** `{success: true, data: {...}}` als Key-Value-Objekt

### T8.6 – API: hours liefert korrektes Format
- **Aktion:** GET `/api/hours`
- **Prüfung:** Response-Body parsen
- **Erwartung:** `{success: true, data: [...]}` als Array mit Wochentag-Einträgen

### T8.7 – API: shop-order ohne Auth → 401
- **Aktion:** POST `/api/shop-order` ohne `X-Shop-Token` Header
- **Prüfung:** HTTP-Status
- **Erwartung:** 400 oder 401 (kein 500er)

---

## T9 – Lucide Icons, Historie, Schicht-Hervorhebung

### T9.1 – Lucide CDN eingebunden
- **Aktion:** Kiosk `/kiosk` aufrufen
- **Prüfung:** `<script src="...lucide...">` im Head vorhanden
- **Erwartung:** Genau 1 Lucide-Script-Tag

### T9.2 – Keine Emojis in statischem HTML
- **Aktion:** Kiosk laden
- **Prüfung:** Header, Tab-Bar, Filter-Buttons enthalten `<i data-lucide="...">` statt Emoji-Zeichen
- **Erwartung:** Mindestens 3 Tab-Icons als Lucide-Icons gerendert

### T9.3 – Lucide Icons werden zu SVG gerendert
- **Aktion:** Kiosk laden, 2s warten
- **Prüfung:** `.k-header svg` Elemente zählen
- **Erwartung:** ≥ 1 SVG-Element im Header

### T9.4 – Historie-Button vorhanden
- **Aktion:** Kiosk laden, Shop-Tab öffnen
- **Prüfung:** `#btn-history` sichtbar
- **Erwartung:** Button mit Text "Historie" und Zähler vorhanden

### T9.5 – Historie-Toggle wechselt active
- **Aktion:** Historie-Button klicken
- **Prüfung:** Button-Klasse nach Klick
- **Erwartung:** Klasse `active` wird gesetzt; erneuter Klick entfernt sie

### T9.6 – CSS für aktuelle Schicht vorhanden
- **Aktion:** Kiosk laden
- **Prüfung:** Stylesheet enthält `.k-slot-current` und `.k-slot-now`
- **Erwartung:** CSS-Klassen für Hervorhebung vorhanden

### T9.7 – toggleHistory in Public API
- **Aktion:** `typeof K.toggleHistory` in Console
- **Prüfung:** Typ prüfen
- **Erwartung:** `'function'`

---

## T12 – Homepage: Meine Bestellungen Widget (mode=my)
> Spec: `specs/bestellstatus.md` → Abschnitt "Meine Bestellungen Widget", AK-BS-16 bis AK-BS-23

### T12.1 – Ohne bs_email → Widget versteckt (AK-BS-16)
- **Aktion:** Startseite `/` laden, localStorage `bs_email` nicht gesetzt
- **Prüfung:** `#mob-my-orders` und `#desk-my-orders` prüfen
- **Erwartung:** Beide Container `display:none` / nicht sichtbar

### T12.2 – API mode=my mit korrekter Email (AK-BS-17)
- **Aktion:** `bs_email` in localStorage setzen, Startseite laden
- **Prüfung:** Network-Request an `/api/lunch-order?email=...&mode=my` abfangen
- **Erwartung:** Request enthält korrekte Email und `mode=my` Parameter

### T12.3 – API liefert nur Neu+Bestätigt, aufsteigend sortiert (AK-BS-18, AK-BS-23)
- **Aktion:** `GET /api/lunch-order?email=jrumpfinger@t-online.de&mode=my` aufrufen
- **Prüfung:** Response-Body: Jede Bestellung hat Status 0 oder 1, Datum aufsteigend
- **Erwartung:** Kein Status 2 (Storniert) oder 3 (Abgeholt) in Ergebnissen

### T12.4 – Einzeilige Darstellung: Direktlink oder Popup (AK-BS-19, AK-BS-21)
- **Aktion:** `bs_email` setzen, Startseite laden
- **Prüfung:** Widget enthält genau 1 Kind-Element (einzeilig). Bei >1 Bestellungen: Klick öffnet Popup mit Auswahl
- **Erwartung:** Einzelbestellung → Direktlink. Mehrere → Popup mit allen Bestellungen, Schließen via ✕

### T12.5 – Datumsformat dd.mm.yyyy (AK-BS-22)
- **Aktion:** `bs_email` setzen, Startseite laden, Widget-Text lesen
- **Prüfung:** Datum im Format dd.mm.yyyy (z.B. "22.06.2026"), kein ISO-Format
- **Erwartung:** Regex `/\d{2}\.\d{2}\.\d{4}/` matcht, kein `yyyy-mm-dd`

### T12.6 – Falsche Email → Widget bleibt versteckt (AK-BS-20)
- **Aktion:** `bs_email = 'nobody@example.com'` setzen, Startseite laden
- **Prüfung:** `#mob-my-orders` und `#desk-my-orders` prüfen
- **Erwartung:** Beide Container versteckt (API gibt leere Liste zurück)

---

## Letzter Testlauf: 2026-06-21 (Samstag)
Umgebung: witty-island-064f9d903.7.azurestaticapps.net

| Test | Status | Anmerkung |
|---|---|---|
| T1 Startseite lädt | ✅ | 0 JS-Fehler |
| T2 Wochenplan Desktop | ✅ | Alle 5 Tage mit Button, keine Opacity (Wochenende = nächste Woche) |
| T3 Shop-Admin Kiosk-Link | ✅ | 🏪 Kiosk sichtbar |
| T3 Mittagstisch-Sektion | ✅ | Vorhanden, Badge=0 (hidden) |
| T3 Tages-Tabs | ✅ | 5 Tabs: Mo 22.06 – Fr 26.06 (Sonntag → erster Tab = Mo) |
| T3 Tab-Wechsel | ✅ | Bestellungen laden für korrekten Tag (z.B. 2026-06-24) |
| T3 Neue Bestellung Form | ✅ | Formular öffnet, Gericht-Dropdown mit Montags-Gericht |
| T3 Shop getrennt | ✅ | "Online-Shop-Bestellungen" Überschrift |
| T4 Kiosk 3 Tabs | ✅ | 3 Tabs (Speiseplan entfernt), Online-Shop Badge |
| T4 Refresh im Header | ✅ | 🔄 Button im Header sichtbar |
| T4 Küchenliste | ✅ | Druckansicht nach Gericht gruppiert |
| T4 Bottom-Bar 2 Buttons | ✅ | Telefonbestellung + Küchenliste |
| T5 Lunch-Admin Kiosk-Link | ✅ | 🏪 Kiosk sichtbar |
| T6 CMS Toggle An | ✅ | Grün (#22c55e) |
| T6 CMS Toggle Aus | ✅ | Grau (#e5e7eb) |
| T9 Datum POST normalisiert | ✅ | T00:00:00Z wird zu YYYY-MM-DD |
| T9 Datum GET startswith | ✅ | Findet beide Formate |

---

## T9.5 – Mittagstisch: Tages-Buttons API-Daten

### T9.5.1 – Jeder Tages-Button liefert API-Daten
- **Aktion:** Kiosk laden, Mittagstisch Tab öffnen, jeden der 7 Tages-Buttons klicken (Gestern bis Fr)
- **Prüfung:** Für jeden Button: API-Response prüfen (Status 200, success=true, orders Array)
- **Erwartung:** Kein 400/500-Fehler, "Alle"-Zähler = API-Anzahl, Bestellkarten werden gerendert

---

## T10 – Kiosk: Slot-Header-Badges & Filterung

### T10.1 – Slot-Header-Badges lesbar (nicht gelb auf gelb)
- **Aktion:** Kiosk `/kiosk` laden, Online-Shop Tab öffnen
- **Prüfung:** `.k-slot-badge` CSS prüfen: `background:#fff`, farbige Schrift
- **Erwartung:** Weiße Pillen mit farbiger Schrift + Textlabels ("Packen", "Warten", "Bereit")

### T10.2 – Online-Shop ist Default-Tab
- **Aktion:** Kiosk `/kiosk` laden
- **Prüfung:** `.k-tab.active` hat `data-tab="abhol"`, Panel `#panel-abhol` hat Klasse `active`
- **Erwartung:** Online-Shop Tab ist beim Start aktiv, nicht Mittagstisch

### T10.3 – Filter-Zähler ohne alte erledigte Bestellungen
- **Aktion:** Kiosk laden, "Zu erledigen" Zähler und Stats prüfen
- **Prüfung:** Alte abgeschlossene Bestellungen (status >= 3, Abholdatum < heute) nicht mitzählen
- **Erwartung:** Zähler zeigt nur aktive Bestellungen, alte nur in Historie

### T10.4 – Historie-Button zeigt alte Bestellungen
- **Aktion:** "Historie" Button klicken
- **Prüfung:** Alte abgeschlossene Bestellungen werden sichtbar
- **Erwartung:** Historie-Zähler korrekt, Toggle blendet alte ein/aus

---

## T11 – Shop-Admin: Dashboard zeigt alle Bestellungen

### T11.1 – Shop-Admin zeigt offene/überfällige Bestellungen
- **Aktion:** Shop-Admin `/shop-admin` laden
- **Prüfung:** Bestellungsliste enthält auch ältere offene Bestellungen (Abholdatum in Vergangenheit)
- **Erwartung:** Alle Bestellungen mit Status < 3 sichtbar, unabhängig vom Abholdatum

### T11.2 – Shop-Admin Zähler korrekt
- **Aktion:** Shop-Admin laden, Stats-Leiste prüfen
- **Prüfung:** Bestellungen-Zahl, Offen-Zahl, Abholbereit-Zahl
- **Erwartung:** Zähler stimmen mit Kiosk-Ansicht überein

---

## Testlauf 2026-06-21 (Abend)
| Test | Status | Ergebnis |
|---|---|---|
| T10.1 Badges lesbar | ✅ | Weiße Pillen, farbige Schrift, Labels "Warten"/"Bereit" |
| T10.2 Default-Tab | ✅ | Online-Shop aktiv (data-tab=abhol, panel-abhol) |
| T10.3 Filter-Zähler | ✅ | 3 Zu erledigen, 0 Überfällig, 23 Historie – alte komplett raus |
| T10.4 Historie | ✅ | 23 alte Bestellungen in Historie, nur Morgen-Slots sichtbar |
| T11.1 Shop-Admin Bestellungen | ✅ | 16 Bestellungen (vorher nur 3) |
| T11.2 Shop-Admin Zähler | ✅ | 16 Bestellungen, 5 Offen, 11 Abholbereit |
| T9.5.1 Tages-Buttons API | ✅ | Alle 7 Tages-Buttons: API 200, Zähler korrekt, Karten gerendert |

## Testlauf 2026-06-22 (Sonntag)
Umgebung: witty-island-064f9d903.7.azurestaticapps.net

| Test | Status | Ergebnis |
|---|---|---|
| T12.1 Ohne bs_email → Widget versteckt | ✅ | Beide Container hidden |
| T12.2 API mode=my mit korrekter Email | ✅ | Request enthält email + mode=my |
| T12.3 API mode=my liefert Bestellungen | ✅ | success:true, orders Array mit gericht/status/bestellnummer |
| T12.4 Widget sichtbar bei aktiven Bestellungen | ✅ | Widget sichtbar, Links zu /bestellstatus |
| T12.5 Falsche Email → Widget versteckt | ✅ | Beide Container hidden |

## Fehler-Log
| Datum | Test | Fehler | Fix |
|---|---|---|---|
| 2026-06-21 | T2 Wochenplan | Am Wochenende alle Tage ausgegraut (opacity .45) + keine Bestell-Buttons, obwohl nächste Woche angezeigt wird | `isWeekend`-Check: am Sa/So `isPast=false` und `isToday=false` für alle Tage → alles bestellbar |
| 2026-06-21 | T3 Tages-Tabs | Am Wochenende war Sonntag als Datum selektiert, statt nächster Werktag. Tabs korrekt (Mo-Fr) aber Bestellungen für Sonntag geladen | `validDates.indexOf()` Check: falls `_mtSelectedDate` nicht in Tabs → auf ersten Tab (Montag) setzen |
| 2026-06-21 | T4 Kiosk | Online-Bestellungen nicht im Kiosk sichtbar | Datum-Format Mismatch: Wochenplan liefert `T00:00:00Z`, Kiosk filtert mit `eq` auf `YYYY-MM-DD`. Fix: POST normalisiert Datum, GET verwendet `startswith` |
| 2026-06-21 | T4 Kiosk UI | Speiseplan-Tab redundant, Refresh-Button unpraktisch in Bottom-Bar, Küchenliste = `window.print()` | Speiseplan-Tab entfernt, Refresh in Header, Küchenliste gruppiert nach Gericht |
| 2026-06-21 | T9.5 Mittagstisch API | lunch-order API 400-Fehler: `$select` enthielt `dl_kunde_kommentar` und `dl_personal_antwort`, die in Dataverse nicht existierten | Felder per Script `scripts/create-dv-fields.py` in Dataverse angelegt + PublishAllXml |
| 2026-06-22 | T12 mode=my | OData-Filter `dl_datum ge 2026-06-22` ohne Quotes → String-Vergleich fehlgeschlagen → leere Ergebnisse | Fix: `dl_datum ge '2026-06-22'` (einfache Anführungszeichen um String-Wert im OData-Filter) |
