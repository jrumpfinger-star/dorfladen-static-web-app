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

## Testlauf 2026-06-22 (Sonntag, 10:45)
Umgebung: witty-island-064f9d903.7.azurestaticapps.net

| Test | Status | Ergebnis |
|---|---|---|
| T12.1 Ohne bs_email → Widget versteckt | ⏭ | Timeout beim Seitenaufruf (Netzwerk, kein Code-Fehler) |
| T12.2 API mode=my mit korrekter Email | ✅ | Request enthält email + mode=my |
| T12.3 API nur Neu+Bestätigt, aufsteigend | ✅ | Alle Orders Status 0 oder 1, Datum aufsteigend |
| T12.4 Einzeilige Darstellung + Popup | ✅ | Widget 1 Kind-Element, Popup öffnet/schließt korrekt |
| T12.5 Datumsformat dd.mm.yyyy | ⏭ | Übersprungen (catch, Daten-abhängig) |
| T12.6 Falsche Email → Widget versteckt | ✅ | Beide Container hidden |

---

## T13 – Flyer Kachel-Editor: Eigenes Bild
> Spec: specs/flyer-kachel-editor.md → AK-FKE-01..05

### T13.1 – Eigenes Bild wird beim Upload komprimiert (AK-FKE-01)
- **Aktion:** Im Kachel-Editor auf `🖼+ Bild` klicken, großes Bild (>1 MB) hochladen
- **Prüfung:** `ov.customImg` enthält komprimierte Base64-Daten (<<1 MB)
- **Erwartung:** Bild wird auf max 400×400 px verkleinert, JPEG 0.75 oder PNG

### T13.2 – Eigenes Bild auf Kachel sichtbar (AK-FKE-02)
- **Aktion:** Bild hochladen, Kachel-Vorschau prüfen
- **Prüfung:** Canvas zeigt das hochgeladene Bild als Overlay
- **Erwartung:** Bild korrekt auf der Kachel dargestellt

### T13.3 – Bild bleibt nach Speichern+Neuladen erhalten (AK-FKE-03)
- **Aktion:** Bild hochladen → Speichern → CMS neu laden → Kachel-Editor erneut öffnen
- **Prüfung:** `customImg` in Dataverse (`plakat_article_overrides`) vorhanden
- **Erwartung:** Bild erscheint wieder auf der Kachel

### T13.4 – Fehlermeldung bei zu großem Payload (AK-FKE-04)
- **Aktion:** (Manuell) Override-Daten >900 KB simulieren
- **Prüfung:** Toast-Meldung
- **Erwartung:** Toast: "Kachel-Daten zu groß zum Speichern..."

### T13.5 – Fehlermeldung bei HTTP-Fehler (AK-FKE-05)
- **Aktion:** Speichern bei Netzwerk-/Server-Fehler
- **Prüfung:** Toast-Meldung
- **Erwartung:** Toast: "Kachel-Speichern fehlgeschlagen: ..." (kein stilles Verschlucken)

---

## Fehler-Log
| Datum | Test | Fehler | Fix |
|---|---|---|---|
| 2026-06-21 | T2 Wochenplan | Am Wochenende alle Tage ausgegraut (opacity .45) + keine Bestell-Buttons, obwohl nächste Woche angezeigt wird | `isWeekend`-Check: am Sa/So `isPast=false` und `isToday=false` für alle Tage → alles bestellbar |
| 2026-06-21 | T3 Tages-Tabs | Am Wochenende war Sonntag als Datum selektiert, statt nächster Werktag. Tabs korrekt (Mo-Fr) aber Bestellungen für Sonntag geladen | `validDates.indexOf()` Check: falls `_mtSelectedDate` nicht in Tabs → auf ersten Tab (Montag) setzen |
| 2026-06-21 | T4 Kiosk | Online-Bestellungen nicht im Kiosk sichtbar | Datum-Format Mismatch: Wochenplan liefert `T00:00:00Z`, Kiosk filtert mit `eq` auf `YYYY-MM-DD`. Fix: POST normalisiert Datum, GET verwendet `startswith` |
| 2026-06-21 | T4 Kiosk UI | Speiseplan-Tab redundant, Refresh-Button unpraktisch in Bottom-Bar, Küchenliste = `window.print()` | Speiseplan-Tab entfernt, Refresh in Header, Küchenliste gruppiert nach Gericht |
| 2026-06-21 | T9.5 Mittagstisch API | lunch-order API 400-Fehler: `$select` enthielt `dl_kunde_kommentar` und `dl_personal_antwort`, die in Dataverse nicht existierten | Felder per Script `scripts/create-dv-fields.py` in Dataverse angelegt + PublishAllXml |
| 2026-06-22 | T12 mode=my | OData-Filter `dl_datum ge 2026-06-22` ohne Quotes → String-Vergleich fehlgeschlagen → leere Ergebnisse | Fix: `dl_datum ge '2026-06-22'` (einfache Anführungszeichen um String-Wert im OData-Filter) |
| 2026-06-22 | T13 Kachel-Bild | Eigenes Bild wird nach Speichern nicht auf dem Flyer angezeigt. Unkomprimierte Base64-Data-URL in `ov.customImg` überschreitet Dataverse `dl_wert` Feldgröße. `.catch(function(){})` verschluckt den Fehler. | 1. `cmsCompressImage(400,400)` beim Upload 2. Payload-Größen-Check vor Senden 3. Fehler-Handling in `plakatArtOverrideSave` + `_dvSave` |
| 2026-06-22 | T14 Angebot-Bilder | Flyer zeigt falsches Bild (Duplo statt Kirschkörbchen). `_artikelCache.find()` liefert falschen Strichcode für Eigenprodukte. | `_artikelCache`-Lookup entfernt – `artikelnummer` direkt als SharePoint-Key verwendet |
| 2026-06-22 | T14 Angebot-Bilder | Bild im Strichcodefolder wird beim Bearbeiten+Speichern überschrieben. Auto-Preload setzt `bild_data` → unnötiger Re-Upload an API. | `data-bild-dirty` Flag: nur explizite User-Uploads werden an werbebilder API geschickt |
| 2026-06-22 | T14 Angebot-Bilder | Artikelnummer-Feld zu klein (85px) für EAN-13 Strichcodes | CSS-Spaltenbreite auf 120px erhöht |
| 2026-06-22 | T13.6 Kachel-Bild→Flyer | customImg im Kachel-Editor gespeichert, aber auf Flyer nicht sichtbar. Magazine-Layout: async Image-Load ohne await vor toBlob. Klassisches Layout: customImg-Rendering fehlte komplett. | 1. customImg-Loads als Promises 2. `Promise.all` vor `toBlob` 3. customImg-Rendering im klassischen Layout nachgerüstet |

---

## T14 – Angebot-Bilder: Laden, Speichern, Anzeigen
> Spec: specs/angebot-bilder.md → AK-AB-01..05

### T14.1 – Artikelnummer-Feld zeigt vollständige EAN-13 an (AK-AB-01)
- **Aktion:** Aktion mit Artikel öffnen, der EAN-13 Strichcode hat (z.B. 4001686327487)
- **Prüfung:** Artikelnummer-Feld zeigt die vollständige Nummer ohne Abschneiden
- **Erwartung:** Gesamte Nummer sichtbar (≥120px Spaltenbreite)

### T14.2 – Flyer zeigt korrektes Bild für Eigenprodukte (AK-AB-02)
- **Aktion:** Aktion mit Eigenprodukt "Kirschkörbchen" erstellen, Bild hochladen, Flyer-Vorschau öffnen
- **Prüfung:** Flyer-Kachel zeigt das hochgeladene Kirschkörbchen-Bild
- **Erwartung:** Korrektes Bild (nicht Duplo oder anderes Produkt)

### T14.3 – Auto-Preload überschreibt kein User-Upload (AK-AB-03)
- **Aktion:** Bild zu Artikel hochladen → Speichern → erneut Bearbeiten
- **Prüfung:** Nach erneutem Öffnen ist das hochgeladene Bild sichtbar
- **Erwartung:** Kein Überschreiben durch altes Bild aus SharePoint

### T14.4 – Nur User-Uploads triggern Re-Upload (AK-AB-04)
- **Aktion:** Aktion bearbeiten (ohne neues Bild hochzuladen) → Speichern
- **Prüfung:** Konsole: kein `POST /werbebilder` Request
- **Erwartung:** Auto-preloaded Bilder werden nicht erneut an API geschickt

### T14.5 – Upload/Paste verwendet Artikelnummer als SP-Key (AK-AB-05)
- **Aktion:** Bild per 📁-Button für "Kirschkörbchen" hochladen
- **Prüfung:** Konsole: Upload nach SharePoint unter "Kirschkörbchen.png"
- **Erwartung:** Dateiname = Wert aus Artikelnummer-Feld (nicht aus _artikelCache)

---

## T13.6 – customImg auf Angebots-Plakat sichtbar (AK-FKE-06)
> Spec: specs/flyer-kachel-editor.md → AK-FKE-06

### T13.6.1 – customImg im Magazine-Layout
- **Aktion:** Kachel bearbeiten → + BILD → Bild hochladen → Speichern → Flyer-Vorschau öffnen (Magazine-Template)
- **Prüfung:** Das eigene Bild ist auf der Flyer-Kachel sichtbar
- **Erwartung:** Eigenes Bild wird als Overlay über die Kachel gerendert

### T13.6.2 – customImg im klassischen Layout
- **Aktion:** Kachel bearbeiten → + BILD → Bild hochladen → Speichern → Flyer-Vorschau öffnen (klassisches Template)
- **Prüfung:** Das eigene Bild ist auf der Flyer-Kachel sichtbar
- **Erwartung:** Eigenes Bild wird als Overlay über die Kachel gerendert

---

## T14 – Social: Dynamische Kategorien & Lucide-Icons
> Spec: specs/kiosk-social.md → AK-SO-08, AK-SO-09, AK-SO-10, AK-SO-11

### T14.1 – Kategorien werden dynamisch aus API geladen (AK-SO-08)
- **Aktion:** Kiosk → Social → Katalog öffnen
- **Prüfung:** Kategorie-Dropdown im "Neues Produkt"-Formular enthält Optionen
- **Erwartung:** Dropdown enthält mind. 5 Einträge (Mittagessen, Kuchen, Obst & Gemuese, Aufstriche, Salate), keine hardcoded Emojis in den Options-Texten

### T14.2 – Kategorie-Header zeigen Lucide-Icons (AK-SO-11)
- **Aktion:** Kiosk → Social → Katalog, Produkte sind vorhanden
- **Prüfung:** Kategorie-Header im Katalog enthalten `<svg>` oder `<i data-lucide="...">` statt Emoji-Zeichen
- **Erwartung:** Jeder Kategorie-Header zeigt ein Lucide-Icon, keine Unicode-Emojis (&#127869; etc.)

### T14.3 – Kategorie-Manager öffnen und Kategorien anzeigen (AK-SO-09)
- **Aktion:** Kiosk → Social → Katalog → "Kategorien verwalten" Button klicken
- **Prüfung:** Manager-Panel öffnet sich, aktuelle Kategorien mit Lucide-Icons sind aufgelistet
- **Erwartung:** Panel zeigt mind. 5 Kategorien mit Icon-Name und Lucide-Icon-Vorschau

### T14.4 – Neue Kategorie hinzufügen (AK-SO-09)
- **Aktion:** Kategorie-Manager öffnen → Name "Getränke" eingeben → Icon "coffee" im Icon-Picker auswählen → "+ Hinzufügen" klicken
- **Prüfung:** Neue Kategorie erscheint in der Liste, Dropdown wird aktualisiert
- **Erwartung:** "Getränke" mit Coffee-Icon in der Manager-Liste und im Kategorie-Dropdown sichtbar

### T14.5 – Kategorie entfernen (AK-SO-09)
- **Aktion:** Kategorie-Manager → × Button bei einer Kategorie klicken → Bestätigung
- **Prüfung:** Kategorie verschwindet aus Manager-Liste und Dropdowns
- **Erwartung:** Kategorie ist entfernt, Änderung wird in Dataverse gespeichert

### T14.6 – Icon-Picker Suchfilter
- **Aktion:** Kategorie-Manager → "Icon suchen" Feld → "cake" eintippen
- **Prüfung:** Icon-Grid filtert auf passende Icons
- **Erwartung:** Nur Icons mit "cake" im Namen werden angezeigt (z.B. cake-slice)

### T14.7 – Strg+V Bild-Paste in Edit-Row (AK-SO-10)
- **Aktion:** Katalog → Produkt bearbeiten (Stift-Icon) → In Paste-Zone klicken → Strg+V mit Bild in Zwischenablage
- **Prüfung:** Bild-Vorschau erscheint in Paste-Zone, Bild wird hochgeladen
- **Erwartung:** Paste-Zone zeigt Bild-Vorschau, Thumbnail im Katalog wird aktualisiert, Status-Meldung "Bild aktualisiert!"

### T14.8 – CMS: Dynamische Kategorien (AK-SO-08)
- **Aktion:** CMS → Social → Katalog öffnen
- **Prüfung:** Kategorie-Dropdown im "Neues Produkt"-Formular enthält dynamische Optionen
- **Erwartung:** Gleiche Kategorien wie im Kiosk, keine hardcoded Emojis

### T14.9 – CMS: Strg+V in Edit-Row (AK-SO-10)
- **Aktion:** CMS → Social → Katalog → Produkt bearbeiten → In Paste-Zone klicken → Strg+V
- **Prüfung:** Bild wird in Paste-Zone angezeigt und hochgeladen
- **Erwartung:** Bild-Vorschau in Paste-Zone, Thumbnail aktualisiert

### T14.10 – Post-Builder: Kategorie-Chips zeigen Lucide-Icons (AK-SO-11)
- **Aktion:** Kiosk → Social → Neuer Post → Katalog-Produkte vorhanden
- **Prüfung:** Kategorie-Filter-Chips enthalten `<svg>` statt Emoji-Zeichen
- **Erwartung:** Chips zeigen Lucide-Icons inline neben dem Kategorienamen

---

## T15 – Bild-Zoom (Doppelklick-Lightbox)
> Spec: specs/kiosk-funktionen.md, Abschnitt 6a

### T15.1 – dlImagePopup ist verfuegbar (Kiosk)
- **Aktion:** Kiosk `/kiosk.html` laden
- **Pruefung:** `typeof window.dlImagePopup` in Console pruefen
- **Erwartung:** `"function"`

### T15.2 – dlImagePopup ist verfuegbar (CMS)
- **Aktion:** CMS `/cms` laden
- **Pruefung:** `typeof window.dlImagePopup` in Console pruefen
- **Erwartung:** `"function"`

### T15.3 – dlImagePopup ist verfuegbar (Homepage)
- **Aktion:** Homepage `/` laden
- **Pruefung:** `typeof window.dlImagePopup` in Console pruefen
- **Erwartung:** `"function"`

### T15.4 – Katalog-Thumbnail: Doppelklick oeffnet Lightbox
- **Aktion:** Kiosk, Social, Katalog, Kategorie aufklappen, Doppelklick auf Produkt-Thumbnail (44x44)
- **Pruefung:** `document.getElementById('dl-img-popup')` existiert nach Doppelklick
- **Erwartung:** Fullscreen-Overlay mit vergroessertem Bild, Produktname als Caption, X-Button sichtbar

### T15.5 – Lightbox schliessen per X-Button
- **Aktion:** Lightbox geoeffnet, X-Button klicken
- **Pruefung:** `document.getElementById('dl-img-popup')` nach Klick
- **Erwartung:** `null` (Lightbox entfernt)

### T15.6 – Lightbox schliessen per Escape
- **Aktion:** Lightbox geoeffnet, Escape-Taste druecken
- **Pruefung:** `document.getElementById('dl-img-popup')` nach Escape
- **Erwartung:** `null` (Lightbox entfernt)

### T15.7 – Lightbox schliessen per Klick auf Hintergrund
- **Aktion:** Lightbox geoeffnet, auf den halbtransparenten Hintergrund klicken (nicht auf Bild)
- **Pruefung:** Overlay wird entfernt
- **Erwartung:** Lightbox geschlossen

### T15.8 – Post-Builder Bilder: Doppelklick oeffnet Lightbox
- **Aktion:** Kiosk, Social, Neuer Post, Doppelklick auf ein Produkt-Thumbnail (40x40) im Picker
- **Pruefung:** Lightbox oeffnet mit vergroessertem Bild
- **Erwartung:** Bild und Produktname korrekt angezeigt

### T15.9 – Platzhalter-Icons loesen keinen Zoom aus
- **Aktion:** Doppelklick auf ein Produkt ohne Bild (Kamera-Platzhalter-Div)
- **Pruefung:** Kein Lightbox-Overlay erscheint
- **Erwartung:** `document.getElementById('dl-img-popup')` ist `null`

### T15.10 – cursor:zoom-in auf zoombaren Bildern
- **Aktion:** Katalog-Thumbnails mit Bild inspizieren
- **Pruefung:** `getComputedStyle(img).cursor`
- **Erwartung:** `"zoom-in"`

### T15.11 – Bestehende Checkbox-Funktionalitaet bleibt erhalten
- **Aktion:** Im Post-Builder ein Produkt per Checkbox anwaehlen (Einfachklick)
- **Pruefung:** Checkbox wird gecheckt, Vorschau aktualisiert
- **Erwartung:** Checkbox reagiert normal, kein ungewollter Lightbox-Trigger bei Einfachklick

---

## T16 – Kiosk Mittagstisch: Filter-Redesign + Nachrichten-Tab

> Spec: specs/kiosk-ui.md → AK-UI-17, AK-UI-17b–f

### T16.1 – T-17-01 (AK-UI-17b) Default-Filter ist "Offen"
- **Aktion:** Kiosk oeffnen, auf Mittagstisch-Tab wechseln
- **Pruefung:** Aktiver Filter-Button pruefen
- **Erwartung:** "Offen" ist aktiv (nicht "Alle" oder "Zu bestaetigen")

### T16.2 – T-17-02 (AK-UI-17) Genau 4 Filter-Tabs
- **Aktion:** Kiosk → Mittagstisch
- **Pruefung:** Anzahl und Labels der Filter-Buttons
- **Erwartung:** 4 Tabs: "Offen", "Nachrichten", "Erledigt", "Alle"

### T16.3 – T-17-03 (AK-UI-17d) Nachrichten-Tab tagesuebergreifend
- **Aktion:** Klick auf "Nachrichten" Filter-Tab
- **Pruefung:** API-Call mode=messages + Anzeige
- **Erwartung:** API liefert Bestellungen mit Kundenkommentaren ueber alle Tage, Anzeige zeigt "Kunde:" Text

### T16.4 – T-17-04 (AK-UI-17e) Nachrichten-Tab: Antwort + Gelesen
- **Aktion:** Nachrichten-Tab oeffnen, Nachrichtenkarten pruefen
- **Pruefung:** "Antworten" und "Gelesen" Buttons vorhanden
- **Erwartung:** Mindestens ein Antworten-Button sichtbar (wenn Nachrichten vorhanden)

### T16.5 – T-17-05 (AK-UI-17f) API mode=messages
- **Aktion:** GET /api/lunch-order?mode=messages
- **Pruefung:** Response-Format pruefen
- **Erwartung:** success:true, orders-Array mit kunde_kommentar, name, gericht, datum, kommentar_gelesen

### T16.6 – T-17-06 (AK-UI-17g) Bestellschluss-Funktion existiert
- **Aktion:** Kiosk → Mittagstisch
- **Pruefung:** Button #btn-new-order vorhanden, _isMittagCutoff im Code
- **Erwartung:** Button existiert, Cutoff-Funktion ist definiert

### T16.7 – T-17-07 (AK-UI-17h) Button-Zustand nach Uhrzeit
- **Aktion:** Kiosk → Mittagstisch, Uhrzeit pruefen
- **Pruefung:** Vor 12:00 → Button enabled, ab 12:00 → Button disabled + opacity
- **Erwartung:** Zustand entspricht aktueller Uhrzeit

### Testlauf-Tabelle

| Datum | Test | Ergebnis |
|---|---|---|
| 2026-06-26 | T16.1 T-17-01 Default-Filter Offen | ✅ Pass |
| 2026-06-26 | T16.2 T-17-02 Genau 4 Filter-Tabs | ✅ Pass |
| 2026-06-26 | T16.3 T-17-03 Nachrichten tagesuebergreifend | ✅ Pass |
| 2026-06-26 | T16.4 T-17-04 Antwort+Gelesen Buttons | ✅ Pass |
| 2026-06-26 | T16.5 T-17-05 API mode=messages | ✅ Pass |
| 2026-06-26 | T16.6 T-17-06 Bestellschluss-Funktion | ✅ Pass |
| 2026-06-26 | T16.7 T-17-07 Button-Zustand (vor 12:00) | ✅ Pass |

---

## T17 – Shop Bestellkarten Redesign (AK-UI-35)

### T-35-01 (AK-UI-35) Shop-Karten haben Collapse-Pattern
- **Aktion:** Kiosk öffnen → Shop-Tab wählen → Karten laden
- **Prüfung:** Karten haben `.k-order-hdr` und `.k-order-body`, Default = collapsed
- **Erwartung:** Header sichtbar, Body ausgeblendet (oc-collapsed)

### T-35-02 (AK-UI-35b) Header zeigt Name, Status-Badge, Preis
- **Aktion:** Shop-Tab öffnen, erste Karte inspizieren
- **Prüfung:** Header enthält `.k-oc-name` mit Text, €-Zeichen
- **Erwartung:** Name, Status und Preis im Header sichtbar

### T-35-03 (AK-UI-35d) Primär-Action im Header erreichbar
- **Aktion:** Shop-Tab öffnen, Header-Actions prüfen
- **Prüfung:** `.k-oc-actions` enthält mindestens 1 `.k-btn`
- **Erwartung:** Annehmen/Packen/Ausgeben direkt im Header

### T-35-04 (AK-UI-35f) Details-Button ist vollwertiger Button
- **Aktion:** Karte aufklappen → Details-Button suchen
- **Prüfung:** `.k-order-body .k-btn:has-text("Details")` existiert, min-height ≥38px
- **Erwartung:** Großer, klar sichtbarer Details-Button

### T-35-05 (AK-UI-35h) Aufklappen/Zuklappen Toggle vorhanden
- **Aktion:** Shop-Tab öffnen mit >1 Bestellung
- **Prüfung:** Aufklappen/Zuklappen-Button existiert
- **Erwartung:** Toggle-Button sichtbar

### Testlauf-Tabelle

| Datum | Test | Ergebnis |
|---|---|---|
| 2026-06-26 | T-35-01 Collapse-Pattern | ✅ Pass |
| 2026-06-26 | T-35-02 Header Name/Status/Preis | ✅ Pass |
| 2026-06-26 | T-35-03 Primär-Action im Header | ✅ Pass |
| 2026-06-26 | T-35-04 Details-Button vollwertig | ✅ Pass |
| 2026-06-26 | T-35-05 Aufklappen/Zuklappen Toggle | ✅ Pass |

---

## AK-UI-36 – Android Zurück-Button für alle Overlays

> Spec: `specs/android-back-button.md`  
> Tests: `tests/kiosk.spec.js` → `AK-UI-36`

### T-36-01 (AK-UI-36a) Hilfe-Modal → Back schließt Modal
- **Aktion:** Kiosk öffnen, Hilfe-Modal öffnen, Android-Zurück drücken
- **Prüfung:** Modal geschlossen, Seite bleibt auf /kiosk
- **Erwartung:** Modal zu, keine Navigation weg

### T-36-02 (AK-UI-36b) Bestelldetail-Modal → Back schließt Modal
- **Aktion:** Kiosk öffnen, Detail-Modal öffnen, Android-Zurück drücken
- **Prüfung:** Modal geschlossen, Seite bleibt auf /kiosk
- **Erwartung:** Modal zu, keine Navigation weg

### T-36-03 (AK-UI-36c) Zwei Modals → Back schließt nur oberstes
- **Aktion:** Detail-Modal öffnen, dann Hilfe-Modal öffnen, Back drücken
- **Prüfung:** Nur Hilfe-Modal geschlossen, Detail noch offen
- **Erwartung:** Stack-Verhalten, zweiter Back schließt Detail

### Weitere Seiten (manuell getestet)
- **pack.html:** Camera-Overlay + Kasse-Overlay → Back schließt
- **shop-freigabe.html:** Image-Upload-Overlay → Back schließt
- **lunch-admin.html:** Storno-Dialog → Back schließt
- **mittagstisch-bestellen.html:** Success-Overlay → Back schließt

### Testlauf-Tabelle

| Datum | Test | Ergebnis |
|---|---|---|
| 2026-06-26 | T-36-01 Hilfe-Modal → Back | ✅ Pass |
| 2026-06-26 | T-36-02 Detail-Modal → Back | ✅ Pass |
| 2026-06-26 | T-36-03 Zwei Modals Stack | ✅ Pass |

---

## AK-UI-37 – Historie-Filter mit Zeitraum & Status

> Spec: `specs/kiosk-historie-filter.md`  
> Tests: `tests/kiosk.spec.js` → `AK-UI-37`

### T-37-01 (AK-UI-37a) Historie-Tab zeigt Sub-Filter-Bar
- **Aktion:** Kiosk Shop-Tab → Historie-Filter klicken
- **Prüfung:** Sub-Filter-Bar mit Zeitraum-Pills (7 Tage, 30 Tage, Alle) und Status-Pills (Alle, Abgeholt, Storniert) erscheint
- **Erwartung:** Bar sichtbar, alle Pills vorhanden

### T-37-02 (AK-UI-37b) Wechsel zu anderem Filter versteckt Sub-Bar
- **Aktion:** Historie aktivieren, dann "Zu erledigen" klicken
- **Prüfung:** Sub-Filter-Bar verschwindet
- **Erwartung:** Bar versteckt

### T-37-03 (AK-UI-37c) Zeitraum-Pills wechseln aktiven Zustand
- **Aktion:** Historie aktivieren, "30 Tage" klicken
- **Prüfung:** "30 Tage" wird aktiv, "7 Tage" wird inaktiv
- **Erwartung:** Nur ein Zeitraum-Pill aktiv

### T-37-04 (AK-UI-37d) Status-Pills wechseln aktiven Zustand
- **Aktion:** Historie aktivieren, "Abgeholt" klicken
- **Prüfung:** "Abgeholt" wird aktiv, "Alle" wird inaktiv
- **Erwartung:** Nur ein Status-Pill aktiv

### Testlauf-Tabelle

| Datum | Test | Ergebnis |
|---|---|---|
| 2026-06-26 | T-37-01 Sub-Filter-Bar sichtbar | ✅ Pass |
| 2026-06-26 | T-37-02 Sub-Bar versteckt bei Filterwechsel | ✅ Pass |
| 2026-06-26 | T-37-03 Zeitraum-Pills Toggle | ✅ Pass |
| 2026-06-26 | T-37-04 Status-Pills Toggle | ✅ Pass |

---

## AK-UI-39 – Shop-Kommunikation (Kunde ↔ Verkäufer)

Gegenseitiger Nachrichtenaustausch bei Shop-Bestellungen, analog zum Mittagstisch.

### T-39-01 (AK-UI-39a) Shop-Karten zeigen Nachrichten-Buttons
- **Aktion:** Kiosk laden → Shop-Tab → erste Karte aufklappen
- **Prüfung:** "Antworten" oder "Nachricht senden" Button im erweiterten Bereich
- **Erwartung:** Button vorhanden bei aktiven Bestellungen (Status < 3)

### T-39-02 (AK-UI-39b) Shop-Antwort-Dialog öffnet sich
- **Aktion:** Aktive Shop-Karte aufklappen → "Antworten"/"Nachricht senden" klicken
- **Prüfung:** Antwort-Eingabefeld und Senden-Button erscheinen
- **Erwartung:** Input-Feld sichtbar mit Placeholder "Antwort an Kunden…"

### T-39-03 (AK-UI-39c) NEU-Badge bei ungelesener Nachricht
- **Aktion:** Kiosk laden → Shop-Tab
- **Prüfung:** Karten mit ungelesener Kundennachricht zeigen blaues "NEU" Badge
- **Erwartung:** Badge animiert (blink), datenabhängig

### T-39-04 (AK-UI-39d) Kunden-Nachricht und Antwort werden angezeigt
- **Aktion:** Shop-Karte aufklappen
- **Prüfung:** Vorhandene Nachrichten (Kunde:/Antwort:) werden angezeigt
- **Erwartung:** Korrekte Darstellung, keine JS-Fehler

### Testlauf-Tabelle

| Datum | Test | Ergebnis |
|---|---|---|
| 2026-06-27 | T-39-01 | ⏭ Skipped (keine Shop-Bestellungen in Live-Daten) |
| 2026-06-27 | T-39-02 | ⏭ Skipped (keine Shop-Bestellungen in Live-Daten) |
| 2026-06-27 | T-39-03 | ✅ Pass |
| 2026-06-27 | T-39-04 | ⏭ Skipped (keine Shop-Bestellungen in Live-Daten) |

---

## AK-UI-40 – Stammkunden klappbare Karten

Stammkunden-Tab auf das gleiche klappbare Header/Body-Pattern umstellen wie Mittagstisch und Shop.

### T-40-01 (AK-UI-40a) Karten haben klappbaren Header
- **Aktion:** Kiosk → Stammkunden-Tab → "Alle Kunden laden"
- **Prüfung:** Karten haben `.k-order-hdr` und starten zugeklappt (`oc-collapsed`)
- **Erwartung:** Header sichtbar, Body versteckt

### T-40-02 (AK-UI-40b) Karte klappt auf/zu
- **Aktion:** Header einer Karte klicken
- **Prüfung:** Karte klappt auf (kein `oc-collapsed`), Body sichtbar; erneut klicken → zugeklappt
- **Erwartung:** Toggle-Verhalten funktioniert

### T-40-03 (AK-UI-40c) Header zeigt Bestellen-Button
- **Aktion:** Karten laden
- **Prüfung:** Im Header `.k-oc-actions` ist "Bestellen"-Button sichtbar
- **Erwartung:** Quick-Action direkt im Header verfügbar

### T-40-04 (AK-UI-40d) Body zeigt Bearbeiten und Löschen
- **Aktion:** Karte aufklappen
- **Prüfung:** Body enthält "Bearbeiten"-Button und Löschen-Button (`.k-btn-cancel`)
- **Erwartung:** Sekundäre Aktionen nur im Body

### Testlauf-Tabelle

| Datum | Test | Ergebnis |
|---|---|---|
| 2026-06-27 | T-40-01 | ✅ Pass |
| 2026-06-27 | T-40-02 | ✅ Pass |
| 2026-06-27 | T-40-03 | ✅ Pass |
| 2026-06-27 | T-40-04 | ✅ Pass |

---

## AK-UI-50 – Social Media Step-Wizard

> Spec: specs/social-wizard.md → AK-UI-50-01 bis AK-UI-50-07

### T-50-01: 4 nummerierte Step-Karten sichtbar (AK-UI-50-01)
- **Aktion**: Kiosk öffnen → Social-Tab klicken
- **Prüfung**: 4 Step-Karten (#soc-step-1 bis #soc-step-4) sichtbar, jeweils mit Nummer 1–4
- **Erwartung**: Alle 4 Steps sind sichtbar mit nummeriertem Kreis

### T-50-02: Steps 1+2 offen, Steps 3+4 zugeklappt (AK-UI-50-02)
- **Aktion**: Social-Tab öffnen
- **Prüfung**: CSS-Klasse `oc-collapsed` nur auf Steps 3+4
- **Erwartung**: Steps 1+2 sind aufgeklappt, Steps 3+4 zugeklappt

### T-50-03: Klick auf Step-Header toggled auf/zu (AK-UI-50-03)
- **Aktion**: Klick auf Step-1-Header → Klick erneut → Klick auf Step-3-Header
- **Prüfung**: `oc-collapsed` Klasse wird getoggelt
- **Erwartung**: Step 1 wird zugeklappt, dann wieder aufgeklappt; Step 3 wird aufgeklappt

### T-50-04: Touch-Targets min 44px hoch (AK-UI-50-04)
- **Aktion**: boundingBox() der Titel-Select und Sub-Tab-Buttons messen
- **Prüfung**: Höhe ≥ 44px
- **Erwartung**: Alle Touch-Targets sind iPad-freundlich (≥44px)

### T-50-05: Sub-Tabs mit Lucide-Icons (AK-UI-50-05)
- **Aktion**: Sub-Tab-Buttons im Social-Panel prüfen
- **Prüfung**: Buttons haben [data-lucide]-Icon, Höhe ≥ 44px
- **Erwartung**: Icons vorhanden, Touch-freundliche Größe

### T-50-06: Teilen-Buttons vertikal mit min-height 56px (AK-UI-50-06)
- **Aktion**: Step 4 aufklappen → Share-Buttons messen
- **Prüfung**: WhatsApp und Instagram Buttons haben Höhe ≥ 56px, Tagesinfo sichtbar
- **Erwartung**: Große, leicht treffbare Share-Buttons

### T-50-07: Badge "X ausgewählt" in Step 2 Header (AK-UI-50-07)
- **Aktion**: Social-Tab öffnen → Step-2-Count prüfen
- **Prüfung**: #soc-step2-count existiert, initial leer
- **Erwartung**: Badge-Element vorhanden, ohne Produkte leer

---

## T-TL – Status-Zurücksetzen: Confirm-Abfrage (AK-TL-07, AK-TL-08)

### T-TL-01: Kiosk – Doppelklick auf Status-Badge zeigt confirm
- **Aktion**: Kiosk öffnen → Online-Shop → Bestellung mit Status "In Bearbeitung" → Status-Badge doppelklicken
- **Prüfung**: Browser-confirm Dialog erscheint mit Text „Status zurücksetzen auf ‚Neu'?"
- **Erwartung**: Bei "OK" → Status wird auf "Neu" zurückgesetzt. Bei "Abbrechen" → keine Änderung

### T-TL-02: Kiosk – Doppelklick auf Status-Badge bei Status "Neu" – kein Handler
- **Aktion**: Kiosk → Bestellung mit Status "Neu" → Status-Badge doppelklicken
- **Prüfung**: Kein confirm-Dialog, kein Status-Change
- **Erwartung**: Nichts passiert (Badge hat kein ondblclick bei Status 0)

### T-TL-03: Shop-Admin – Timeline-Klick zeigt showConfirm Dialog
- **Aktion**: Shop-Admin öffnen → Bestellung mit Status "In Bearbeitung" → Timeline-Schritt "Neu" (grün, done) klicken
- **Prüfung**: Schöner Confirm-Dialog (showConfirm) erscheint mit Titel „Status zurücksetzen?" und Zielstatus
- **Erwartung**: Bei "Zurücksetzen" → Status wird auf "Neu" gesetzt. Bei "Abbrechen" → keine Änderung

### T-TL-04: Shop-Admin – Timeline-Klick auf aktiven/zukünftigen Schritt – nicht klickbar
- **Aktion**: Bestellung Status "In Bearbeitung" → Timeline-Schritt "Abholbereit" klicken
- **Prüfung**: Kein Dialog, kein onclick-Handler (Element hat keine st-clickable Klasse)
- **Erwartung**: Nichts passiert

### T-TL-05: Kiosk – Vorwärts-Aktionen bleiben ohne Confirm
- **Aktion**: Kiosk → Bestellung "Neu" → Button "Annehmen" klicken
- **Prüfung**: Kein confirm-Dialog, Status wird direkt auf "In Bearbeitung" gesetzt
- **Erwartung**: Sofortige Statusänderung ohne Rückfrage

---

## T-RD – Social Feature-Abgleich Kiosk ↔ CMS (AK-RD-10, AK-RD-11, AK-RD-12)

> Spec: specs/kiosk-social-redesign.md → RD-11, RD-12, RD-13

### T-RD-11: Kiosk – Tagesinfo-Button vorhanden (AK-RD-10)
- **Aktion**: Kiosk → Social-Tab öffnen
- **Prüfung**: Button "Nur als Tagesinfo veröffentlichen" ist sichtbar
- **Erwartung**: Button existiert im Step-4-Bereich

### T-RD-11b: CMS – Tagesinfo-Button vorhanden (AK-RD-10)
- **Aktion**: CMS → Social → Neuer Post
- **Prüfung**: Button "Nur als Tagesinfo veröffentlichen" ist sichtbar
- **Erwartung**: Button existiert unterhalb der Teilen-Buttons (Feature-Parität mit Kiosk)

### T-RD-12: Kiosk – Heutige-Posts-Container vorhanden (AK-RD-11)
- **Aktion**: Kiosk → Social-Tab öffnen
- **Prüfung**: DOM-Elemente `#soc-today-posts` und `#soc-today-posts-list` existieren
- **Erwartung**: Container ist im DOM (hidden wenn keine Posts heute)

### T-RD-12b: CMS – Heutige-Posts-Container vorhanden (AK-RD-11)
- **Aktion**: CMS → Social → Neuer Post
- **Prüfung**: DOM-Elemente `#soc-today-posts` und `#soc-today-posts-list` existieren
- **Erwartung**: Container ist im DOM (hidden wenn keine Posts heute)

### T-RD-13: CMS – Verlauf-Tab entfernt (AK-RD-12)
- **Aktion**: CMS → Social-Tab öffnen
- **Prüfung**: Kein Button `#social-subtab-verlauf`, kein Panel `#social-panel-verlauf`
- **Erwartung**: Verlauf-Tab und Panel sind vollständig entfernt

### T-RD-14: Kiosk – Mittagessen nach 11 Uhr ausgeblendet
- **Aktion**: Kiosk → Social → Neuer Post (nach 11:00 Uhr)
- **Prüfung**: Sektion "Heutiges Mittagessen" ist nicht sichtbar
- **Erwartung**: Ab 11:00 Uhr wird kein Mittagessen im Tagespost-Builder angezeigt

### T-RD-14b: CMS – Mittagessen nach 11 Uhr ausgeblendet
- **Aktion**: CMS → Social → Neuer Post (nach 11:00 Uhr)
- **Prüfung**: Sektion "Heutiges Mittagessen" ist nicht sichtbar
- **Erwartung**: Ab 11:00 Uhr wird kein Mittagessen im Tagespost-Builder angezeigt

### Testlauf-Tabelle

| Datum | Test | Ergebnis |
|---|---|---|
| 2026-06-27 | T-50-01 | ✅ Pass |
| 2026-06-27 | T-50-02 | ✅ Pass |
| 2026-06-27 | T-50-03 | ✅ Pass |
| 2026-06-27 | T-50-04 | ✅ Pass |
| 2026-06-27 | T-50-05 | ✅ Pass |
| 2026-06-27 | T-50-06 | ✅ Pass |
| 2026-06-27 | T-50-07 | ✅ Pass |
| 2026-06-26 | T-RD-11 | ✅ Pass |
| 2026-06-26 | T-RD-11b | ✅ Pass |
| 2026-06-26 | T-RD-12 | ✅ Pass |
| 2026-06-26 | T-RD-12b | ✅ Pass |
| 2026-06-26 | T-RD-13 | ✅ Pass |
| 2026-06-26 | T-RD-14 | ✅ Pass |
| 2026-06-26 | T-RD-14b | ✅ Pass |
| 2026-06-27 | T-06-01 | ✅ Pass |
| 2026-06-27 | T-06-02 | ✅ Pass |
| 2026-06-27 | T-07-01 | ✅ Pass |
| 2026-06-27 | T-07-02 | ✅ Pass |
| 2026-06-27 | T-08-01 | ✅ Pass |
| 2026-06-27 | T-08-02 | ✅ Pass |
| 2026-06-27 | T-08-03 | ✅ Pass |
| 2026-06-27 | T-10-01 | ✅ Pass |
| 2026-06-27 | T-10-02 | ✅ Pass |
| 2026-06-27 | T-10-03 | ✅ Pass |
| 2026-06-27 | T-04-01 | ✅ Pass |
| 2026-06-27 | T-04-02 | ✅ Pass |
| 2026-06-27 | T-09-01 | ✅ Pass |
| 2026-06-27 | T-09-02 | ✅ Pass |
| 2026-06-27 | Routing | ✅ Pass |

---

## T-FM – Fleisch-Vorbestellung

> Spec: specs/fleisch-vorbestellung.md

### T-06-01 Shop-Verweis: Fleisch-Gewichtswaren zeigen Vorbestellen-Link (AK-FLEISCH-06)
- **Aktion:** Shop-Seite `/shop` laden, Fleisch/Wurst-Kategorie öffnen
- **Prüfung:** Gewichtsware-Artikel der Warengruppe Fleisch/Wurst haben einen "Vorbestellen"-Link statt "Hinzufügen"
- **Erwartung:** Link mit `href="/fleisch-bestellen"` und Text "Vorbestellen mit 15% Rabatt"

### T-06-02 Shop-Verweis: Vorbestellen-Link führt zu fleisch-bestellen (AK-FLEISCH-06)
- **Aktion:** Auf Vorbestellen-Link klicken
- **Prüfung:** Navigation zur Fleisch-Bestellseite
- **Erwartung:** URL enthält `/fleisch-bestellen`

### T-07-01 Homepage Desktop: Fleisch-Promo CTA verlinkt auf fleisch-bestellen (AK-FLEISCH-07)
- **Aktion:** Startseite `/` laden
- **Prüfung:** Element `#meat-cta` hat `href="/fleisch-bestellen"`
- **Erwartung:** Link vorhanden und korrekt

### T-07-02 Homepage Mobile: Popup CTA verlinkt auf fleisch-bestellen (AK-FLEISCH-07)
- **Aktion:** Startseite `/` laden
- **Prüfung:** Element `#mob-meat-cta` hat `href="/fleisch-bestellen"`
- **Erwartung:** Link vorhanden und korrekt

### T-08-01 Kiosk: Metzger-Tab existiert und ist klickbar (AK-FLEISCH-08)
- **Aktion:** Kiosk `/kiosk` laden, Metzger-Tab klicken
- **Prüfung:** Tab wird aktiv, Panel `#panel-metzger` wird sichtbar
- **Erwartung:** Tab mit `data-tab="metzger"` hat Klasse `active`, Panel hat Klasse `active`

### T-08-02 Kiosk: Metzger Filter-Buttons vorhanden (AK-FLEISCH-08)
- **Aktion:** Kiosk laden, Metzger-Tab öffnen
- **Prüfung:** Filter-Buttons für Status sind sichtbar
- **Erwartung:** Mindestens 2 Filter-Buttons im Panel

### T-08-03 Kiosk: Metzger-Panel hat Sammelbestellungs-Bereich (AK-FLEISCH-08)
- **Aktion:** Kiosk laden, Metzger-Tab öffnen
- **Prüfung:** Sammelbestellungs-Bereich ist vorhanden
- **Erwartung:** Bereich mit ID `fm-sammel` oder ähnlich existiert

### T-10-01 CMS: Metzger-Tab existiert (AK-FLEISCH-10)
- **Aktion:** CMS `/cms` laden
- **Prüfung:** Element `#cms-tab-metzger` ist vorhanden
- **Erwartung:** Tab-Button im DOM vorhanden

### T-10-02 CMS: Metzger Config-Felder vorhanden (AK-FLEISCH-10)
- **Aktion:** CMS `/cms` laden
- **Prüfung:** Input-Felder `#fm-cfg-rabatt`, `#fm-cfg-mindestmenge`, `#fm-cfg-bestellschluss`, `#fm-cfg-aktiv`
- **Erwartung:** Alle Config-Felder im DOM vorhanden

### T-10-03 CMS: Metzger Bestellungs-Filter vorhanden (AK-FLEISCH-10)
- **Aktion:** CMS `/cms` laden
- **Prüfung:** Filter-Buttons und Bestellliste im Panel
- **Erwartung:** `#fm-orders-list`, `#fm-orders-btn-offen`, `#fm-orders-btn-alle` vorhanden

### T-04-01 Fleisch-Bestellseite lädt (AK-FLEISCH-04)
- **Aktion:** `/fleisch-bestellen` aufrufen
- **Prüfung:** HTTP Status 200, Seite enthält "Fleisch" oder "Vorbestell"
- **Erwartung:** Seite lädt korrekt

### T-09-01 API PATCH Endpoint existiert (AK-FLEISCH-09)
- **Aktion:** PATCH `/api/fleisch-order` mit leerem Body
- **Prüfung:** HTTP Status (400 oder 405 erwartet, nicht 404)
- **Erwartung:** API-Endpoint existiert und validiert Input

### T-09-02 API GET Info-Endpoint liefert Liefertag-Info (AK-FLEISCH-09)
- **Aktion:** GET `/api/fleisch-order?info=1`
- **Prüfung:** Antwort enthält `liefertag` und `bestellschluss`
- **Erwartung:** `success: true` mit Liefertag-Daten

### Routing: SWA Route /fleisch-bestellen
- **Aktion:** `/fleisch-bestellen` aufrufen
- **Prüfung:** HTTP Status
- **Erwartung:** 200 OK (Route in staticwebapp.config.json konfiguriert)

### T-11-01 API: GET mode=unread_messages liefert Zähler (AK-FLEISCH-11)
- **Aktion:** GET `/api/fleisch-order?mode=unread_messages`
- **Prüfung:** Response hat `success: true` und `unread_count` (Number)
- **Erwartung:** `success: true`, `unread_count >= 0`

### T-11-02 API: GET mode=messages liefert Bestellungen mit Kommentar (AK-FLEISCH-11)
- **Aktion:** GET `/api/fleisch-order?mode=messages`
- **Prüfung:** Response hat `success: true`, `orders` (Array), `count` (Number)
- **Erwartung:** `success: true`, Array mit Bestellungen die `kunde_kommentar` haben

### T-11-03 API: PATCH mit kommentar_gelesen akzeptiert (AK-FLEISCH-11)
- **Aktion:** PATCH `/api/fleisch-order` mit `{id: "...", kommentar_gelesen: true}`
- **Prüfung:** Response hat `success: true`
- **Erwartung:** Kommentar wird als gelesen markiert

### T-11-04 Kiosk: Metzger-Tab Nachrichten-Filter vorhanden (AK-FLEISCH-11)
- **Aktion:** Kiosk `/kiosk` laden, Metzger-Tab öffnen
- **Prüfung:** Filter-Button mit `data-fm-filter="nachrichten"` vorhanden
- **Erwartung:** Button mit Text "Nachrichten" und Count-Badge sichtbar

### T-11-05 Kiosk: Metzger-Tab Badge zeigt Nachrichten (AK-FLEISCH-11)
- **Aktion:** Kiosk `/kiosk` laden
- **Prüfung:** `#badge-metzger` Element prüfen
- **Erwartung:** Badge zeigt kombinierte Zahl (offene Bestellungen + ungelesene Nachrichten)

### T-11-06 Kiosk: Bestellkarte zeigt Antworten-Button (AK-FLEISCH-11)
- **Aktion:** Kiosk laden, Metzger-Tab öffnen, Bestellkarte aufklappen
- **Prüfung:** Button mit Text "Antworten" oder "Nachricht senden" in `.k-oc-actions`
- **Erwartung:** Button vorhanden, klickbar, öffnet Inline-Antwortformular

---

## T12 – Fleisch Bestellstatus (AK-FLEISCH-12)

### T-12-01 Bestellstatus: FM-Bestellung Lookup per Nr + Telefon (AK-FLEISCH-12)
- **Aktion:** `/bestellstatus?nr=FM-...` aufrufen, Telefon eingeben
- **Prüfung:** Bestelldetails werden angezeigt (Status, Positionen, Gesamtsumme)
- **Erwartung:** Bestellung wird korrekt geladen und angezeigt
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-12

### T-12-02 Bestellstatus: Auth-Feld wechselt bei FM-Prefix (AK-FLEISCH-12)
- **Aktion:** `/bestellstatus` aufrufen, "FM-" in Bestellnummer-Feld eingeben
- **Prüfung:** E-Mail-Feld wird ausgeblendet, Telefon-Feld erscheint
- **Erwartung:** `#bs-auth-email-wrap` display:none, `#bs-auth-telefon-wrap` sichtbar
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-12

### T-12-03 Bestellstatus: Kommentar senden für FM-Bestellung (AK-FLEISCH-12)
- **Aktion:** FM-Bestellung laden, Kommentar eingeben und senden
- **Prüfung:** PATCH an `/api/fleisch-order` mit `{id, kunde_kommentar}`
- **Erwartung:** `success: true`, Kommentar erscheint in Nachrichten
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-12

### T-12-04 Bestellstatus: Auto-Login mit localStorage (AK-FLEISCH-12)
- **Aktion:** `fm_nr` und `fm_telefon` in localStorage setzen, `/bestellstatus?nr=FM-...` aufrufen
- **Prüfung:** Telefon wird automatisch aus localStorage befüllt
- **Erwartung:** Bestellung wird ohne manuelle Eingabe geladen
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-12

---

## T13 – Fleisch Startseiten-Widget (AK-FLEISCH-13)

### T-13-01 Homepage: Widget lädt aktive Fleischbestellungen (AK-FLEISCH-13)
- **Aktion:** Startseite `/` mit `fm_telefon` in localStorage laden
- **Prüfung:** `#mob-fm-orders` wird sichtbar, enthält Links zu Bestellstatus
- **Erwartung:** Widget zeigt Liefertag + Status für offene Bestellungen
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-13

### T-13-02 Homepage: Widget API mode=my (AK-FLEISCH-13)
- **Aktion:** GET `/api/fleisch-order?mode=my&telefon=...`
- **Prüfung:** Response hat `success: true`, `bestellungen` Array
- **Erwartung:** Nur aktive (Status < Abgeholt) Bestellungen zurückgegeben
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-13

---

## T14 – Android Zurück-Button Fleisch (AK-FLEISCH-14)

### T-14-01 Fleisch: Cart-Drawer pushState (AK-FLEISCH-14)
- **Aktion:** `/fleisch-bestellen` laden, Artikel in Warenkorb, FAB klicken
- **Prüfung:** `history.state` nach Cart-Open hat `{overlay:'cart'}`
- **Erwartung:** pushState wird gesetzt, history.back() schließt Cart
> Spec: specs/android-back-button.md, specs/fleisch-vorbestellung.md → AK-FLEISCH-14

### T-14-02 Fleisch: Bestätigung pushState (AK-FLEISCH-14)
- **Aktion:** Bestellung abschicken → Bestätigungsansicht
- **Prüfung:** `history.state` hat `{overlay:'confirm'}`
- **Erwartung:** pushState wird gesetzt, history.back() schließt Bestätigung
> Spec: specs/android-back-button.md, specs/fleisch-vorbestellung.md → AK-FLEISCH-14

---

## T15 – Bestätigung → Bestellstatus-Link (AK-FLEISCH-15)

### T-15-01 Fleisch: Bestätigungsansicht enthält Bestellstatus-Link (AK-FLEISCH-15)
- **Aktion:** Fleisch-Bestellung abschicken
- **Prüfung:** `#fm-confirm-status-link` wird sichtbar, href enthält Bestellnummer
- **Erwartung:** Link führt zu `/bestellstatus?nr=FM-...`
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-15

| Datum | Test | Ergebnis |
|---|---|---|
| 2026-06-27 | T-12-01, T-12-02 | ✅ passed |
| 2026-06-27 | T-13-01, T-13-02 | ✅ passed |
| 2026-06-27 | T-14-01, T-14-02 | ✅ passed |
| 2026-06-27 | T-15-01 | ✅ passed |
| 2026-06-27 | T-16-01, T-16-02, T-16-03 | ✅ passed |
| 2026-06-27 | T-17-01, T-17-02 | ✅ passed |
| 2026-06-27 | T-18-01, T-18-02, T-18-03 | ✅ passed |
| 2026-06-27 | T-19-01 | ✅ passed |
| 2026-06-27 | T-20-01, T-20-02, T-20-03 | ✅ passed |

---

## T18 – CMS-Metzger Lesbarkeit & Bestelldetails (AK-FLEISCH-17)

### T-18-01 CMS Metzger-Panel hat aufklappbare Bestellkarten (AK-FLEISCH-17)
- **Aktion:** CMS `/cms.html` laden, Metzger-Tab öffnen, „Offene" klicken
- **Prüfung:** `[data-fm-toggle]` Elemente vorhanden, Klick zeigt/verbirgt `[data-fm-detail]`
- **Erwartung:** Bestellkarten mit klickbarem Header, die Details ein-/ausklappen
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-17

### T-18-02 CMS Metzger-Panel hat Status-Buttons (AK-FLEISCH-17)
- **Aktion:** CMS Metzger-Tab, Bestellung aufklappen
- **Prüfung:** `[data-fm-status]` Buttons in Detail-Bereich vorhanden
- **Erwartung:** Buttons für „Beim Metzger", „Eingetroffen", „Abgeholt", „Stornieren"
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-17

### T-18-03 CMS Metzger-Panel hat Nachricht-Button (AK-FLEISCH-17)
- **Aktion:** CMS Metzger-Tab, Bestellung aufklappen
- **Prüfung:** `[data-fm-reply]` Button vorhanden
- **Erwartung:** Button „Nachricht senden" öffnet Modal
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-17

---

## T19 – CMS Sammelbestellung aufsummiert (AK-FLEISCH-18)

### T-19-01 Sammelbestellung zeigt aggregierte Artikel (AK-FLEISCH-18)
- **Aktion:** CMS Metzger-Tab, „Sammelbestellung" klicken
- **Prüfung:** Tabelle mit Artikel + Gesamt-Menge pro Liefertag
- **Erwartung:** Keine Einzelbestellungen, sondern Artikel gruppiert nach Liefertag mit aufsummierten Mengen
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-18

---

## T17 – Produktbilder auf Fleisch-Bestellseite (AK-FLEISCH-16)

### T-17-01 shop-images.js ist eingebunden (AK-FLEISCH-16)
- **Aktion:** `/fleisch-bestellen` laden
- **Prüfung:** `typeof ShopImages !== 'undefined'` im Browser evaluieren
- **Erwartung:** ShopImages Objekt ist verfügbar
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-16

### T-17-02 Artikelkarten haben data-img-artnr Attribut (AK-FLEISCH-16)
- **Aktion:** `/fleisch-bestellen` laden, Artikel anzeigen lassen
- **Prüfung:** `document.querySelectorAll('[data-img-artnr]').length > 0`
- **Erwartung:** Mindestens 1 Element mit `data-img-artnr` Attribut vorhanden
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-16

---

## T16 – Fleisch-Banner im Shop überall sichtbar (AK-FLEISCH-20)

### T-16-01 Shop-Übersicht zeigt Fleisch-Banner (AK-FLEISCH-20)
- **Aktion:** `/shop` laden, Kategorien-Übersicht anzeigen
- **Prüfung:** `a[href="/fleisch-bestellen"]` im `#shop-content` sichtbar
- **Erwartung:** Banner mit „15 % Rabatt" und Link zu `/fleisch-bestellen` vorhanden
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-20

### T-16-02 Shop-Artikelansicht (nicht Fleisch) zeigt kompaktes Banner (AK-FLEISCH-20)
- **Aktion:** `/shop` laden, Kategorie „Backwaren" oder „Molkereiprodukte" auswählen
- **Prüfung:** `a[href="/fleisch-bestellen"]` im `#shop-content` sichtbar
- **Erwartung:** Kompaktes Banner mit Link zu `/fleisch-bestellen` vorhanden
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-20

### T-16-03 Shop-Fleisch-Kategorie zeigt großes Banner (AK-FLEISCH-20)
- **Aktion:** `/shop` laden, Kategorie „Fleisch und Wurstwaren" auswählen
- **Prüfung:** `a[href="/fleisch-bestellen"]` im `#shop-content` mit großem Padding sichtbar
- **Erwartung:** Großes Banner mit Icon, Text und CTA-Button
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-20

---

## T20 – Kiosk Touch-Modal für Nachrichten (AK-FLEISCH-19)

### T-20-01 openFmReplyModal Funktion existiert (AK-FLEISCH-19)
- **Aktion:** `/kiosk` laden
- **Prüfung:** `typeof K.openFmReplyModal === 'function'`
- **Erwartung:** Funktion existiert in der K-API
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-19

### T-20-02 sendFmModalReply Funktion existiert (AK-FLEISCH-19)
- **Aktion:** `/kiosk` laden
- **Prüfung:** `typeof K.sendFmModalReply === 'function'`
- **Erwartung:** Funktion existiert in der K-API
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-19

### T-20-03 Kein inline sendFmReply mehr (AK-FLEISCH-19)
- **Aktion:** `/kiosk` laden
- **Prüfung:** `typeof K.sendFmReply === 'function'` ist `false`
- **Erwartung:** Alte inline-Funktion wurde entfernt
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-19

---

## T21 – Kiosk Fleisch Per-Item-Bestellung & 2-Spalten-Layout (AK-FLEISCH-21)
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-21

### T-21-01 toggleFmItemBestellt Funktion existiert (AK-FLEISCH-21)
- **Aktion:** `/kiosk` laden
- **Prüfung:** `typeof K.toggleFmItemBestellt === 'function'`
- **Erwartung:** Funktion existiert in der K-API
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-21

### T-21-02 toggleAllFmItems Funktion existiert (AK-FLEISCH-21)
- **Aktion:** `/kiosk` laden
- **Prüfung:** `typeof K.toggleAllFmItems === 'function'`
- **Erwartung:** Funktion existiert in der K-API
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-21

### T-21-03 Metzger-Karte zeigt 2-Spalten-Grid-Layout (AK-FLEISCH-21)
- **Aktion:** Kiosk → Metzger-Tab → erste Bestellkarte aufklappen
- **Prüfung:** `k-order-body` enthält ein Grid-Element mit `grid-template-columns: 200px 1fr`
- **Erwartung:** 2-Spalten-Layout sichtbar (Meta links, Positionen rechts)
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-21

### T-21-04 Checkboxen bei Status 0/1 sichtbar (AK-FLEISCH-21)
- **Aktion:** Kiosk → Metzger-Tab → Bestellkarte mit Status 0 oder 1 aufklappen
- **Prüfung:** `input[type="checkbox"]` Elemente in der Bestellkarte vorhanden
- **Erwartung:** Mindestens 1 Checkbox pro Bestellung sichtbar (bei offenen Bestellungen)
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-21

### T-21-05 Status-Badge mit korrekter CSS-Klasse (AK-FLEISCH-21)
- **Aktion:** Kiosk → Metzger-Tab → Bestellkarten prüfen
- **Prüfung:** `.k-badge` Elemente mit Klassen `st-new`, `st-confirm`, `st-ready`, `st-done` oder `st-cancel`
- **Erwartung:** Jede Bestellkarte hat ein k-badge mit passender Status-Klasse
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-21

### T-21-06 Quick-Action-Button im Header (AK-FLEISCH-21)
- **Aktion:** Kiosk → Metzger-Tab → Header einer offenen Bestellkarte prüfen
- **Prüfung:** `.k-oc-actions button` im Header vorhanden
- **Erwartung:** Status-Änderungs-Button im Header sichtbar (z.B. „Bestellt", „Eingetroffen")
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-21

### T-21-07 API PATCH akzeptiert positionen (AK-FLEISCH-21)
- **Aktion:** PATCH `/api/fleisch-order` mit `{"id": "invalid", "positionen": [{"bezeichnung":"Test","bestellt":true}]}`
- **Prüfung:** Response-Status ist 400 oder 404 (ungültige ID), NICHT 500
- **Erwartung:** API verarbeitet positionen-Feld fehlerfrei (kein Server-Crash)
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-21

### T-21-08 API PATCH validiert positionen-Format (AK-FLEISCH-21)
- **Aktion:** PATCH `/api/fleisch-order` mit `{"id": "test", "positionen": "invalid"}`
- **Prüfung:** Response-Status ist 400
- **Erwartung:** API lehnt ungültiges Format ab mit Fehlermeldung
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-21

### Testlauf-Tabelle

| Datum | Test | Ergebnis |
|---|---|---|
| 2026-07-04 | T-21-01 toggleFmItemBestellt existiert | ✅ Pass |
| 2026-07-04 | T-21-02 toggleAllFmItems existiert | ✅ Pass |
| 2026-07-04 | T-21-03 2-Spalten-Grid-Layout | ✅ Pass |
| 2026-07-04 | T-21-04 Checkboxen bei Status 0/1 | ✅ Pass |
| 2026-07-04 | T-21-05 Status-Badge CSS-Klasse | ✅ Pass |
| 2026-07-04 | T-21-06 Quick-Action-Button im Header | ✅ Pass |
| 2026-07-04 | T-21-07 API PATCH akzeptiert positionen | ✅ Pass |
| 2026-07-04 | T-21-08 API PATCH validiert Format | ✅ Pass |

---

## T22 – Kunden-Status-Labels (AK-FLEISCH-22)

### T-22-01: API liefert status_label_kunde
- **Aktion:** GET `/api/fleisch-order?mode=kiosk` und JSON parsen
- **Prüfung:** Jede Bestellung hat Feld `status_label_kunde`
- **Erwartung:** Feld ist vorhanden und nicht leer
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-22

### T-22-02: status_label_kunde Mapping korrekt
- **Aktion:** API-Response auswerten für verschiedene Status-Werte
- **Prüfung:** status_label_kunde: 0→Neu, 1→Bestätigt, 2→Abholbereit, 3→Abgeholt, 4→Storniert
- **Erwartung:** Kein „Beim Metzger" oder „Eingetroffen" in status_label_kunde
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-22

### T-22-03: Homepage-Widget zeigt Kunden-Labels
- **Aktion:** Startseite mit fm_telefon im localStorage laden, Fleisch-Popup öffnen
- **Prüfung:** Status-Badges in der Bestellliste
- **Erwartung:** „Bestätigt" und „Abholbereit" statt „Beim Metzger" und „Eingetroffen"
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-22

### T-22-04: Bestellstatus-Seite zeigt Kunden-Labels
- **Aktion:** `/bestellstatus?nr=FM-xxx` öffnen (mit gültiger Bestellnummer)
- **Prüfung:** FM_STATUS_LABELS im JS-Code der Seite
- **Erwartung:** Labels sind: Neu, Bestätigt, Abholbereit, Abgeholt, Storniert
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-22

### T-22-05: Kiosk zeigt aktualisierte interne Labels
- **Aktion:** Kiosk Metzger-Tab öffnen
- **Prüfung:** STATUS_LABELS im Kiosk-JS
- **Erwartung:** Kiosk zeigt „In Bestellung" (AK-FLEISCH-26: Refactoring von „Beim Metzger")
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-22

### Testlauf-Tabelle

| Datum | Test | Ergebnis |
|---|---|---|
| 2026-06-28 | T-22-01 API liefert status_label_kunde | ✅ Pass |
| 2026-06-28 | T-22-02 status_label_kunde Mapping korrekt | ✅ Pass |
| 2026-06-28 | T-22-03 Homepage-Widget zeigt Kunden-Labels | ✅ Pass |
| 2026-06-28 | T-22-04 Bestellstatus-Seite zeigt Kunden-Labels | ✅ Pass |
| 2026-06-28 | T-22-05 Kiosk behält interne Labels | ✅ Pass |

---

## T-23 – Kiosk Metzger: Sammelbestellung Status & Batch-Bestellt
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-23

### T-23-01: API liefert bestellt_count in Sammelbestellung
- **Aktion:** GET `/api/fleisch-order?liefertag=2026-07-02`
- **Prüfung:** `aggregiert[].bestellt_count` vorhanden und numerisch
- **Erwartung:** `bestellt_count >= 0` und `<= anzahl_bestellungen`

### T-23-02: Sammelbestellung-Tabelle hat Status-Spalte
- **Aktion:** Kiosk → Metzger → Sammelbestellung
- **Prüfung:** Tabelle hat 5 Spalten: ☐ | Artikel | Gesamt kg | Bestellungen | Status
- **Erwartung:** Letzte Spalten-Überschrift = „Status"

### T-23-03: Sammelbestellung zeigt Bestellt-Status pro Zeile
- **Aktion:** Kiosk → Metzger → Sammelbestellung
- **Prüfung:** Jede Zeile hat 5 Zellen, letzte Zelle zeigt ✅, X/Y, oder —
- **Erwartung:** ✅ = alle bestellt, X/Y = teilbestellt (orange), — = keine bestellt (grau)

### T-23-04: Button Text: „Alle bestellt"
- **Aktion:** Kiosk → Metzger → Sammelbestellung
- **Prüfung:** Button-Text im Sammelbestellung-Header
- **Erwartung:** „Alle bestellt" (AK-FLEISCH-26: Refactoring von „Alle beim Metzger bestellt")

### T-23-05: Filter-Leiste sticky ohne Gap
- **Aktion:** Kiosk → Metzger-Tab öffnen, Filter-Leiste CSS prüfen
- **Prüfung:** `position: sticky`, `margin-top: -12px`
- **Erwartung:** Leiste klebt bündig oben ohne Gap zum Panel-Rand

### T-23-06: metzgerAlleGesendet Funktion existiert
- **Aktion:** Kiosk laden, `K.metzgerAlleGesendet` prüfen
- **Prüfung:** `typeof K.metzgerAlleGesendet === 'function'`
- **Erwartung:** `true`

---

## T-21 Update – Kiosk Metzger: Header-Fortschritt statt Button
> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-21

### T-21-06: Status 0 Header zeigt Fortschritt statt Button
- **Aktion:** Kiosk → Metzger → Bestellung mit Status 0
- **Prüfung:** Header `.k-oc-actions` enthält `<span>` mit X/Y, keinen `<button>`
- **Erwartung:** Fortschrittsanzeige (z.B. „1/1" oder „0/3"), kein Quick-Action-Button

### T-21-09: Status 1+ Header zeigt Quick-Action-Button
- **Aktion:** Kiosk → Metzger → Bestellung mit Status 1 oder 2
- **Prüfung:** Header `.k-oc-actions` enthält `<button>`
- **Erwartung:** Button „Eingetroffen" (Status 1) oder „Abgeholt" (Status 2)

### Testlauf-Tabelle

| Datum | Test | Ergebnis |
|---|---|---|
| 2026-06-29 | T-21-06 Status 0 Header zeigt Fortschritt statt Button | ✅ Pass |
| 2026-06-29 | T-21-09 Status 1+ Header zeigt Quick-Action-Button | ✅ Pass |
| 2026-06-29 | T-23-01 API liefert bestellt_count | ✅ Pass |
| 2026-06-29 | T-23-02 Sammelbestellung-Tabelle hat Status-Spalte | ✅ Pass |
| 2026-06-29 | T-23-03 Bestellt-Status pro Zeile | ✅ Pass |
| 2026-06-29 | T-23-04 Button Text: Alle beim Metzger bestellt | ✅ Pass |
| 2026-06-29 | T-23-05 Filter-Leiste sticky ohne Gap | ✅ Pass |
| 2026-06-29 | T-23-06 metzgerAlleGesendet Funktion existiert | ✅ Pass |

---

## T-24 – Backlog-Items: F-01, N-01, N-02, Shop-Fleisch-Fix

### T-24-01: F-01 Fleisch-Bestellverlauf – History-Button sichtbar
- **Aktion:** `/fleisch-bestellen` aufrufen
- **Prüfung:** Button `#fm-history-btn` im Header sichtbar
- **Erwartung:** Button mit Clipboard-Icon vorhanden

### T-24-02: F-01 Fleisch-Bestellverlauf – Overlay zeigt Bestellungen
- **Aktion:** History-Button klicken (Telefonnummer in localStorage vorhanden)
- **Prüfung:** Overlay `#fm-history-overlay` öffnet sich, Bestellungen werden angezeigt
- **Erwartung:** Liste mit Datum, Bestellnummer, Positionen, Summe, Status-Badge

### T-24-03: N-01 Bilder in News – Kein doppeltes Bild
- **Aktion:** `/aktuelles` aufrufen, "Weiterlesen" klicken bei Beitrag mit Bild
- **Prüfung:** Bild nicht doppelt (einmal auf Karte, nicht nochmal im Volltext)
- **Erwartung:** Kein doppeltes Bild im aufgeklappten Inhalt

### T-24-04: N-02 Teilen-Buttons auf News-Karten
- **Aktion:** `/aktuelles` aufrufen
- **Prüfung:** Jede News-Karte hat "WhatsApp" und "Link kopieren" Buttons
- **Erwartung:** 5 Karten × 2 Buttons = 10 Share-Buttons sichtbar

### T-24-05: Shop Fleisch/Wurst – Normale Bestellbarkeit
- **Aktion:** `/shop` → Kategorie "Fleisch und Wurstwaren" klicken
- **Prüfung:** Alle Fleisch-Artikel zeigen Gewichtseingabe + "+ Hinzu" Button
- **Erwartung:** Kein "Vorbestellen"-Link mehr, stattdessen normale Warenkorb-Interaktion

### T-24-06: Shop Rabatt-Banner – Aktive Vorbestellungen
- **Aktion:** `/shop` aufrufen (fm_telefon in localStorage gesetzt)
- **Prüfung:** Rabatt-Banner enthält Hinweis auf aktive Vorbestellungen
- **Erwartung:** Unter dem Banner: "Sie haben X aktive Vorbestellung(en)" mit "Ansehen" Link

### Testlauf-Tabelle

| Datum | Test | Ergebnis |
|---|---|---|
| 2026-06-28 | T-24-01 F-01 History-Button sichtbar | ✅ Pass |
| 2026-06-28 | T-24-02 F-01 Overlay zeigt 8 Bestellungen | ✅ Pass |
| 2026-06-28 | T-24-03 N-01 Kein doppeltes Bild im Volltext | ✅ Pass |
| 2026-06-28 | T-24-04 N-02 10 Share-Buttons (5×WhatsApp + 5×Link kopieren) | ✅ Pass |
| 2026-06-28 | T-24-05 Shop Fleisch 5 Artikel mit Gewichtseingabe + Hinzu | ✅ Pass |
| 2026-06-28 | T-24-06 Shop Rabatt-Banner: Kein Hinweis ohne aktive Bestellungen | ✅ Pass (korrekt: hint bleibt hidden wenn API 0 Bestellungen zurückgibt) |

---

## T-25 – Backlog-Items: S-04, K-05, A-02

### T-25-01: S-04 Gewichts-Schnellwahl – +/- Buttons sichtbar (Grid)
- **Aktion:** `/shop` → Gewichtsware-Artikel (z.B. Fleisch) in Grid-Ansicht
- **Prüfung:** Buttons `-` und `+` links/rechts neben Gewichtseingabe sichtbar
- **Erwartung:** `.shop-qty-ctrl` Container mit 3 Elementen (−, Input, +)

### T-25-02: S-04 Gewichts-Schnellwahl – 100g-Schritte
- **Aktion:** Bei Gewichtsware auf `+` klicken (Startwert 500g)
- **Prüfung:** Wert erhöht sich auf 600, nochmal → 700
- **Erwartung:** Schrittweite 100g, Minimum 50g, Maximum 9999g

### T-25-03: S-04 Gewichts-Schnellwahl – Liste-Ansicht
- **Aktion:** Zur Listen-Ansicht wechseln, Gewichtsware prüfen
- **Prüfung:** Auch in der Liste +/- Buttons vorhanden
- **Erwartung:** Gleiche Funktionalität wie in Grid-Ansicht

### T-25-04: K-05 Keyboard-Shortcuts – Tab-Wechsel
- **Aktion:** `/kiosk` aufrufen, Tasten 1-5 drücken
- **Prüfung:** Tab wechselt: 1=Mittagstisch, 2=Online-Shop, 3=Stammkunden, 4=Metzger, 5=Social
- **Erwartung:** Korrekter Tab wird aktiviert

### T-25-05: K-05 Keyboard-Shortcuts – Refresh
- **Aktion:** Taste `R` drücken auf `/kiosk`
- **Prüfung:** Daten werden neu geladen (Netzwerk-Request sichtbar)
- **Erwartung:** Kein Page-Reload, nur API-Refresh

### T-25-06: A-02 Umsatz-Kachel im Shop-Admin
- **Aktion:** `/shop-admin` aufrufen
- **Prüfung:** Vierte Statistik-Kachel "Umsatz" mit Euro-Betrag sichtbar
- **Erwartung:** Umsatz-Wert in Format "X,XX €", grüne Farbe

### Testlauf-Tabelle

| Datum | Test | Ergebnis |
|---|---|---|
| 2026-06-28 | T-25-01 S-04 +/- Buttons sichtbar (Grid) – Gewichtsware mit −/500/+ und Stückware mit −/1/+ | ✅ Pass |
| 2026-06-28 | T-25-02 S-04 100g-Schritte: 500→600→700, Minus 700→600 | ✅ Pass |
| 2026-06-28 | T-25-03 S-04 Listen-Ansicht: −/500/+/g Buttons vorhanden | ✅ Pass |
| 2026-06-28 | T-25-04 K-05 Keyboard 1=Mittagstisch, 4=Metzger, 2=Online-Shop | ✅ Pass |
| 2026-06-28 | T-25-05 K-05 Taste R → API-Refresh ohne Page-Reload | ✅ Pass |
| 2026-06-28 | T-25-06 A-02 Umsatz-Kachel zeigt 270,34 € | ✅ Pass |
| 2026-06-28 | T-25-07 Fleisch-API email-Lookup: mode=my&email=...→ 8 Bestellungen | ✅ Pass |
| 2026-06-28 | T-25-08 Fleisch-Hint im Shop: "Sie haben 9 aktive Vorbestellungen" + "Ansehen" sichtbar | ✅ Pass |
| 2026-06-28 | T-25-09 Fleisch-Hint: Dunkle Schrift auf hellem Hintergrund (#fef2f2) gut lesbar | ✅ Pass |
| 2026-06-28 | T-25-10 Zurück-Button auf /fleisch-bestellen → history.back() zum Shop | ✅ Pass |
| 2026-06-28 | T-25-11 Shop "Bestellt": Fleisch-Vorbestellungen (11) Karten mit Preisen sichtbar | ✅ Pass |
| 2026-06-28 | T-25-12 Shop "Bestellt": Fleisch-Preis zeigt gesamtsumme (nicht 0,00 €) | ✅ Pass |
| 2026-06-28 | T-25-13 Shop "Bestellt": "Noch keine Bestellungen" wird ausgeblendet wenn Fleisch-Orders da | ✅ Pass |
| 2026-06-28 | T-25-14 Shop "Bestellt": Überschrift "Online-Bestellungen" vor Shop-Orders hinzugefügt | ✅ Pass |
| 2026-06-28 | T-25-15 Bestellstatus Timeline: FM Status Neu → blauer Dot, 3 graue Dots | ✅ Pass |
| 2026-06-28 | T-25-16 Bestellstatus Timeline: FM Status Beim Metzger → grün Neu, blau BM, 2 grau | ✅ Pass |
| 2026-06-28 | T-25-17 Bestellstatus Timeline: FM Status Eingetroffen → 2 grün, blau Eingetr, 1 grau | ✅ Pass |
| 2026-06-28 | T-25-18 Bestellstatus Timeline: FM Status Storniert → roter Dot "❌ Storniert" | ✅ Pass |
| 2026-06-28 | T-25-19 Artikelfreigabe: Fleisch & Wurst ohne 6-Wochen-Filter → 258 statt 5 nicht freigegeben | ✅ Pass |

## T-24 – Kiosk Metzger UI/UX (AK-FLEISCH-24)

> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-24

### T-24-01 Metzger Lucide Icons
- **Aktion:** Kiosk öffnen → Metzger-Tab
- **Prüfung:** Collapse-Pfeil in Bestellkarten prüfen
- **Erwartung:** Lucide `chevron-down` Icon statt Unicode-Pfeil

### T-24-02 Keine Bestellnummer/Telefon
- **Aktion:** Kiosk → Metzger-Tab → Header einer Karte ansehen
- **Prüfung:** Text im Header prüfen
- **Erwartung:** Kein „FM-" Prefix, kein „Tel" im Header

### T-24-03 Toggle funktioniert
- **Aktion:** Kiosk → Metzger-Tab → Karten-Header klicken
- **Prüfung:** CSS-Klasse `oc-collapsed` prüfen
- **Erwartung:** Karte klappt auf/zu bei Klick

### T-24-04 Aufsteigend sortiert
- **Aktion:** Kiosk → Metzger-Tab
- **Prüfung:** `data-fmdate` Attribute aller Karten vergleichen
- **Erwartung:** Aufsteigende Reihenfolge

### T-24-05 API einzelpositionen
- **Aktion:** GET `/api/fleisch-order?liefertag=...`
- **Prüfung:** Response-Felder prüfen
- **Erwartung:** `einzelpositionen` Array vorhanden, `aggregiert` nicht vorhanden, jede Position hat `kunde`, `bezeichnung`, `menge_kg`

### T-24-06 Kein Status 2 Button
- **Aktion:** Kiosk → Metzger-Tab
- **Prüfung:** Buttons in Bestellkarten prüfen
- **Erwartung:** Kein „Eingetroffen"-Button vorhanden

## T-25-MT – Kiosk Mittagstisch UI/UX (AK-FLEISCH-25)

> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-25

### T-25-MT-01 Lucide Icons in Mittagstisch
- **Aktion:** Kiosk → Mittagstisch-Tab
- **Prüfung:** Collapse-Pfeil in Bestellkarten prüfen
- **Erwartung:** Lucide `chevron-down` Icon statt Unicode-Pfeil

### T-25-MT-02 Preis im Header
- **Aktion:** Kiosk → Mittagstisch-Tab → Header einer Karte ansehen
- **Prüfung:** Header-Text auf €-Zeichen prüfen
- **Erwartung:** Preis direkt im Header sichtbar

### T-25-MT-03 Kompakter Toggle
- **Aktion:** Kiosk → Mittagstisch → Filter „Alle"
- **Prüfung:** Collapse-Toggle-Button Höhe prüfen
- **Erwartung:** Button ≤ 36px Höhe, kurzer Text („Alle"/„Zu")

## Testlauf-Ergebnisse

| Datum | Testfall | Ergebnis |
|---|---|---|
| 2026-06-30 | T-24-01 Metzger Lucide SVG Icons | ✅ Pass |
| 2026-06-30 | T-24-02 Keine Bestellnr/Telefon im Header | ✅ Pass |
| 2026-06-30 | T-24-03 Toggle auf/zu | ✅ Pass |
| 2026-06-30 | T-24-04 Aufsteigend sortiert | ✅ Pass |
| 2026-06-30 | T-24-05 API einzelpositionen | ✅ Pass |
| 2026-06-30 | T-24-06 Kein Status 2 Button | ✅ Pass |
| 2026-06-30 | T-25-MT-01 Mittagstisch Lucide Icons | ✅ Pass |
| 2026-06-30 | T-25-MT-02 Preis im Header | ✅ Pass |
| 2026-06-30 | T-25-MT-03 Kompakter Toggle | ✅ Pass |
| 2026-06-30 | T-35-01 Shop Collapse-Pattern | ✅ Pass |
| 2026-06-30 | T-35-02 Header Name/Status/Preis | ✅ Pass |
| 2026-06-30 | T-35-03 Primär-Action im Header | ✅ Pass |
| 2026-06-30 | T-35-04 Details-Button im Body | ✅ Pass |
| 2026-06-30 | T-35-05 Aufklappen/Zuklappen Toggle | ✅ Pass |
| 2026-06-30 | T-39-01 Shop Nachrichten-Buttons | ✅ Pass |
| 2026-06-30 | T-39-02 Shop Antwort-Dialog | ✅ Pass |
| 2026-06-30 | T-39-03 NEU-Badge sichtbar | ✅ Pass |
| 2026-06-30 | T-39-04 Kunden-Nachricht angezeigt | ✅ Pass |

---

## T-26 – Metzger Label-Refactoring, Workflow & Historie (AK-FLEISCH-26)

> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-26

### T-26-01: Kiosk STATUS_LABELS enthält „In Bestellung" (AK-FLEISCH-26)
- **Aktion:** `/kiosk` laden
- **Prüfung:** `document.documentElement.innerHTML.includes("'In Bestellung'")` im Kiosk-JS
- **Erwartung:** STATUS_LABELS[1] === 'In Bestellung', kein 'Beim Metzger'

### T-26-02: Kein „Beim Metzger" Text in kiosk.html (AK-FLEISCH-26)
- **Aktion:** `/kiosk` laden
- **Prüfung:** `!document.documentElement.innerHTML.includes('Beim Metzger')`
- **Erwartung:** Kein Vorkommen von „Beim Metzger" im HTML

### T-26-03: shop.html FM_ST enthält „In Bestellung" (AK-FLEISCH-26)
- **Aktion:** `/shop` laden
- **Prüfung:** `document.documentElement.innerHTML.includes("1:'In Bestellung'")` 
- **Erwartung:** Status 1 = 'In Bestellung'

### T-26-04: fleisch-bestellen.html FM_STATUS enthält „In Bestellung" (AK-FLEISCH-26)
- **Aktion:** `/fleisch-bestellen` laden
- **Prüfung:** `document.documentElement.innerHTML.includes("1:'In Bestellung'")`
- **Erwartung:** Status 1 = 'In Bestellung'

### T-26-05: bestellstatus.html Timeline-Label „In Bestellung" (AK-FLEISCH-26)
- **Aktion:** `/bestellstatus` laden
- **Prüfung:** `document.documentElement.innerHTML.includes("label:'In Bestellung'")`
- **Erwartung:** Timeline-Step hat Label 'In Bestellung'

### T-26-06: Kiosk Metzger-Header zeigt keine „X Pos." Info (AK-FLEISCH-26)
- **Aktion:** Kiosk → Metzger-Tab → Bestellkarten-Header prüfen
- **Prüfung:** Kein Text „Pos." im Header-Bereich (außer Fortschritts-Counter)
- **Erwartung:** Nur Name + Status-Badge im Header, kein „X Pos."

### T-26-07: Footer-Buttons immer inline (AK-FLEISCH-26)
- **Aktion:** Kiosk → Metzger → Bestellung aufklappen, Viewport 768px
- **Prüfung:** `.fm-footer` hat `display:flex` und Buttons sind nebeneinander
- **Erwartung:** Buttons wrappen nicht vertikal

### T-26-08: API mode=kiosk_history liefert abgeschlossene Bestellungen (AK-FLEISCH-26)
- **Aktion:** GET `/api/fleisch-order?mode=kiosk_history`
- **Prüfung:** Response `success: true`, `bestellungen` Array, jede Bestellung hat `status >= 3`
- **Erwartung:** Nur Bestellungen mit Status Abgeholt (3) oder Storniert (4)

### T-26-09: Historie-Tab zeigt Bestellungen (AK-FLEISCH-26)
- **Aktion:** Kiosk → Metzger → Historie-Tab klicken
- **Prüfung:** Container zeigt Bestellkarten mit Status „Abgeholt" oder „Storniert"
- **Erwartung:** Mindestens 1 Bestellung sichtbar, kein „Keine Bestellungen"

### T-26-10: Auto-Advance Neu→In Bestellung (AK-FLEISCH-26)
- **Aktion:** Kiosk → Metzger → Bestellung Status 0 → alle Items abhaken
- **Prüfung:** Status-Badge wechselt von „Neu" auf „In Bestellung"
- **Erwartung:** Automatischer Status-Wechsel 0→1 nach letztem Item-Check

### T-26-11: Button Text „Alle bestellt" (AK-FLEISCH-26)
- **Aktion:** Kiosk → Metzger → Sammelbestellung
- **Prüfung:** Button-Text prüfen
- **Erwartung:** „Alle bestellt" (nicht „Alle beim Metzger bestellt")

### Testlauf-Tabelle

| Datum | Test | Ergebnis |
|---|---|---|
| 2026-06-30 | T-26-01 Kiosk STATUS_LABELS enthält In Bestellung | ✅ Pass |
| 2026-06-30 | T-26-02 Kein Beim Metzger Text in kiosk.html | ✅ Pass |
| 2026-06-30 | T-26-03 shop.html FM_ST enthält In Bestellung | ✅ Pass |
| 2026-06-30 | T-26-04 fleisch-bestellen.html FM_STATUS enthält In Bestellung | ✅ Pass |
| 2026-06-30 | T-26-05 bestellstatus.html Timeline-Label In Bestellung | ✅ Pass |
| 2026-06-30 | T-26-06 Kiosk Metzger-Header zeigt keine X Pos Info | ✅ Pass |
| 2026-06-30 | T-26-08 API mode=kiosk_history liefert abgeschlossene Bestellungen | ✅ Pass |
| 2026-06-30 | T-26-09 Historie-Tab zeigt Bestellungen | ✅ Pass |
| 2026-06-30 | T-26-11 Button Text Alle bestellt | ✅ Pass |

## T-27 – Sammelbestellung Workflow-Fix & 2-Spalten-Layout (AK-FLEISCH-27)

> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-27

### T-27-01: API einzelpositionen enthalten gesendet-Flag (AK-FLEISCH-27)
- **Aktion:** GET `/api/fleisch-order?liefertag=<nächster Liefertag>`
- **Prüfung:** `einzelpositionen[0]` enthält sowohl `bestellt` als auch `gesendet` Keys
- **Erwartung:** Beide Flags sind im API-Response vorhanden

### T-27-02: Sammelbestellung hat abhakbare Checkboxen (AK-FLEISCH-27)
- **Aktion:** Kiosk → Metzger → Sammelbestellung öffnen
- **Prüfung:** Checkboxen im Sammelbestellung-Body prüfen
- **Erwartung:** Items mit `gesendet=false` haben enabled Checkboxen (abhakbar)

### T-27-03: _fmMarkPositionGesendet Funktion existiert (AK-FLEISCH-27)
- **Aktion:** `/kiosk` laden
- **Prüfung:** HTML enthält `_fmMarkPositionGesendet`
- **Erwartung:** Funktion ist im JS-Code vorhanden

### T-27-04: 2-Spalten-CSS existiert für breiten Viewport (AK-FLEISCH-27)
- **Aktion:** `/kiosk` laden
- **Prüfung:** CSS-Regeln nach `grid-template-columns` + `panel-metzger` durchsuchen
- **Erwartung:** Media-Query für 2-Spalten-Grid bei ≥ 900px existiert

### Testlauf-Tabelle

| Datum | Test | Ergebnis |
|---|---|---|
| 2026-06-30 | T-27-01 API einzelpositionen enthalten gesendet-Flag | ✅ Pass |
| 2026-06-30 | T-27-02 Sammelbestellung hat abhakbare Checkboxen | ✅ Pass |
| 2026-06-30 | T-27-03 _fmMarkPositionGesendet Funktion existiert | ✅ Pass |
| 2026-06-30 | T-27-04 2-Spalten-CSS existiert fuer breiten Viewport | ✅ Pass |

## T-28 – Liefertag-Auswahl & Vorbestellung bis 2 Wochen (AK-FLEISCH-28)

> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-28

### T-28-01: API info liefert alle_termine mit mehreren Liefertagen (AK-FLEISCH-28)
- **Aktion:** GET `/api/fleisch-order?info=1`
- **Prüfung:** `alle_termine` Array mit >2 Einträgen, jeder mit `liefertag`, `liefertag_label`, `bestellschluss`, `noch_bestellbar`
- **Erwartung:** Alle Liefertage der nächsten ~2 Wochen werden zurückgegeben

### T-28-02: API info enthält weiterhin termine (Kompatibilität) (AK-FLEISCH-28)
- **Aktion:** GET `/api/fleisch-order?info=1`
- **Prüfung:** `termine` Array existiert weiterhin und hat ≤2 Einträge
- **Erwartung:** Rückwärtskompatibilität mit bestehendem Frontend

### T-28-03: Frontend hat Liefertag-Dropdown im Checkout (AK-FLEISCH-28)
- **Aktion:** `/fleisch-bestellen` laden
- **Prüfung:** `#fm-liefertag-select` Element existiert und hat mehrere `<option>`-Elemente
- **Erwartung:** Dropdown ist sichtbar mit allen bestellbaren Terminen

### T-28-04: Liefertag-Dropdown zeigt naechster-Label (AK-FLEISCH-28)
- **Aktion:** `/fleisch-bestellen` laden
- **Prüfung:** Erste Option im Dropdown enthält "(naechster)"
- **Erwartung:** Nächster Liefertag ist vorausgewählt und markiert

### T-28-05: Kiosk Sammelbestellung switchSammelDate existiert (AK-FLEISCH-28)
- **Aktion:** `/kiosk` laden
- **Prüfung:** HTML enthält `switchSammelDate`
- **Erwartung:** Datumswechsel-Funktion für Sammelbestellung existiert

### Testlauf-Tabelle

| Datum | Test | Ergebnis |
|---|---|---|
| 2026-06-30 | T-28-01 API info liefert alle_termine mit mehreren Liefertagen | ✅ Pass |
| 2026-06-30 | T-28-02 API info enthaelt weiterhin termine (Kompatibilitaet) | ✅ Pass |
| 2026-06-30 | T-28-03 Frontend hat Liefertag-Dropdown im Checkout | ✅ Pass |
| 2026-06-30 | T-28-04 Liefertag-Dropdown zeigt naechster-Label | ✅ Pass |
| 2026-06-30 | T-28-05 Kiosk Sammelbestellung switchSammelDate existiert | ✅ Pass |

## T-29 – Kiosk UI-Verbesserungen (AK-FLEISCH-29)

> Spec: specs/fleisch-vorbestellung.md → AK-FLEISCH-29

### T-29-01: Alle abhaken Button existiert in Sammelbestellung (AK-FLEISCH-29)
- **Aktion:** `/kiosk` laden
- **Prüfung:** HTML enthält "Alle abhaken"
- **Erwartung:** Button-Text wurde von "Alle bestellt" zu "Alle abhaken" geändert

### T-29-02: Mittagstisch 2-Spalten CSS-Regel existiert (AK-FLEISCH-29)
- **Aktion:** `/kiosk` laden
- **Prüfung:** CSS enthält Regel für `#mittag-orders` mit `grid-template-columns`
- **Erwartung:** 2-Spalten-Grid für Mittagstisch ab 900px

### T-29-03: Detail-Chips CSS-Klasse fm-hdr-details existiert (AK-FLEISCH-29)
- **Aktion:** `/kiosk` laden
- **Prüfung:** CSS enthält `.fm-hdr-details` Selektor
- **Erwartung:** Detail-Chips-Klasse ist definiert

### T-29-04: Detail-Chips werden ab 700px sichtbar (AK-FLEISCH-29)
- **Aktion:** `/kiosk` laden
- **Prüfung:** Media-Query für 700px mit `fm-hdr-details` existiert
- **Erwartung:** Detail-Chips sind ab 700px Viewport-Breite sichtbar

### T-29-05: metzgerAlleGesendet hat Bestätigungsdialog (AK-FLEISCH-29)
- **Aktion:** `/kiosk` laden
- **Prüfung:** HTML enthält `metzgerAlleGesendet` und Bestätigungstext
- **Erwartung:** Vor dem Abhaken aller Positionen wird ein Bestätigungsdialog angezeigt

### Testlauf-Tabelle

| Datum | Test | Ergebnis |
|---|---|---|
| 2026-06-30 | T-29-01 Alle abhaken Button existiert in Sammelbestellung | ✅ Pass |
| 2026-06-30 | T-29-02 Mittagstisch 2-Spalten CSS-Regel existiert | ✅ Pass |
| 2026-06-30 | T-29-03 Detail-Chips CSS-Klasse fm-hdr-details existiert | ✅ Pass |
| 2026-06-30 | T-29-04 Detail-Chips werden ab 700px sichtbar | ✅ Pass |
| 2026-06-30 | T-29-05 metzgerAlleGesendet hat Bestaetigungsdialog | ✅ Pass |

| 2026-06-30 | T-29-06 Aufklappen-Button ist in Stats-Zeile integriert | ✅ Pass |
| 2026-06-30 | T-29-07 Shop-Karten haben sichtbaren Zurueck-Button | ✅ Pass |
| 2026-06-30 | T-29-08 Ring-Label-Wide CSS existiert | ✅ Pass |
| 2026-06-30 | T-29-09 Mittagstisch 2-Spalten Grid ab 900px | ✅ Pass |
| 2026-06-30 | T-29-10 Metzger-Karten haben Zurueck-Button (revertMetzgerStatus) | ✅ Pass |
| 2026-06-30 | T-29-11 revertMetzgerStatus ist im K-Namespace exportiert | ✅ Pass |
| 2026-06-30 | T-30-01 Liefertag-Picker existiert oben auf der Seite | ✅ Pass |
| 2026-06-30 | T-30-02 Reorder-Banner zeigt Artikeldetails | ✅ Pass |
| 2026-06-30 | T-30-03 Reorder oeffnet Warenkorb (fmOpenCart) | ✅ Pass |
| 2026-06-30 | T-30-04 fmSyncLiefertag Funktion existiert | ✅ Pass |
| 2026-06-30 | T-30-05 fmToggleReorderDetails Funktion existiert | ✅ Pass |
| 2026-06-30 | T-29-12 Mute-Button existiert im Header | ✅ Pass |
| 2026-06-30 | T-29-13 Name wird nicht abgeschnitten (kein ellipsis) | ✅ Pass |
| 2026-06-30 | T-29-14 Zurueck-Button im Header neben Aktions-Button | ✅ Pass |
| 2026-06-30 | T-29-15 metzgerAlleGesendet setzt bestellt+gesendet | ✅ Pass |
| 2026-06-30 | T-29-16 Bestellstatus laedt Lucide Script | ✅ Pass |
| 2026-06-30 | T-29-17 Bestellstatus hat Lucide Icons statt Emojis | ✅ Pass |
| 2026-06-30 | T-29-18 History filtert abgeholte/stornierte Bestellungen | ✅ Pass |
| 2026-06-30 | T-29-19 Bestellstatus Zurueck nutzt history.back | ✅ Pass |

### T-29-06: Aufklappen-Button ist in Stats-Zeile integriert (AK-FLEISCH-29)
- **Aktion:** `/kiosk` laden (Online-Shop Tab)
- **Prüfung:** Button "Aufklappen"/"Zuklappen" ist innerhalb `#abhol-stats`
- **Erwartung:** Kein eigener Zeilenumbruch mehr, Button sitzt rechts in der Stats-Leiste

### T-29-07: Shop-Karten haben sichtbaren Zurück-Button (AK-FLEISCH-29)
- **Aktion:** `/kiosk` laden
- **Prüfung:** `revertShopStatus` und `undo-2` Icon im HTML vorhanden
- **Erwartung:** Sichtbarer Zurück-Button statt verstecktem Doppelklick

### T-29-08: Ring-Label-Wide CSS existiert (AK-FLEISCH-29)
- **Aktion:** `/kiosk` laden
- **Prüfung:** CSS enthält `.ring-label-wide` Selektor
- **Erwartung:** Textlabel neben Pack-Ring auf breiten Screens

### T-29-09: Mittagstisch 2-Spalten Grid ab 900px (AK-FLEISCH-29)
- **Aktion:** `/kiosk` laden
- **Prüfung:** CSS-Regel `#mittag-orders` mit `grid-template-columns` existiert
- **Erwartung:** 2-Spalten-Layout für Mittagstisch auf breiten Screens

---

## AK-ST – Storno mit Begründung
> Spec: specs/storno-begruendung.md

### T-ST-01 Kiosk Shop-Storno ruft showShopStornoDialog auf (AK-ST-02)
- **Aktion:** `/kiosk` laden
- **Prüfung:** Page-Source enthält `showShopStornoDialog`, `SHOP_STORNO_REASONS`, `Stornierungsgrund (Pflichtfeld)`
- **Erwartung:** Shop-Storno nutzt Dialog statt direktem Status-Update

### T-ST-02 Kiosk Metzger-Storno ruft showMetzgerStornoDialog auf (AK-ST-03)
- **Aktion:** `/kiosk` laden
- **Prüfung:** Page-Source enthält `showMetzgerStornoDialog`, `METZGER_STORNO_REASONS`
- **Erwartung:** Metzger-Storno nutzt Dialog mit Pflicht-Begründung

### T-ST-03 Kiosk Shop-Storno: Button disabled ohne Grund (AK-ST-02)
- **Aktion:** `/kiosk` laden
- **Prüfung:** Page-Source enthält `storno-shop-confirm` und `disabled>Stornieren`
- **Erwartung:** Stornieren-Button ist initial deaktiviert

### T-ST-04 Kiosk Metzger-Storno: Button disabled ohne Grund (AK-ST-03)
- **Aktion:** `/kiosk` laden
- **Prüfung:** Page-Source enthält `storno-fm-confirm` und `disabled>Stornieren`
- **Erwartung:** Stornieren-Button ist initial deaktiviert

### T-ST-05 Shop-Kundenansicht: Storno hat Pflicht-Grund-Textfeld (AK-ST-07)
- **Aktion:** `/shop.html` laden
- **Prüfung:** Page-Source enthält `data-cancel-reason` und `Grund für Stornierung (Pflichtfeld)`
- **Erwartung:** Kundenansicht hat Pflicht-Textfeld für Stornierungsgrund

### T-ST-06 Bestellstatus Fleisch-Storno: prompt mit Begründung (AK-ST-08)
- **Aktion:** `/bestellstatus` laden
- **Prüfung:** Page-Source enthält `Bitte geben Sie einen Grund an` und `Stornierungsgrund`
- **Erwartung:** Fleisch-Kunden-Storno erfordert Begründung

### T-ST-07 CMS Shop-Storno: cmsShowShopStornoDialog (AK-ST-05)
- **Aktion:** `/cms.html` laden
- **Prüfung:** Page-Source enthält `cmsShowShopStornoDialog` und `CMS_SHOP_STORNO_REASONS`
- **Erwartung:** CMS nutzt Dialog statt confirm() für Shop-Storno

### T-ST-08 CMS Metzger-Storno: Dialog mit Gründen (AK-ST-06)
- **Aktion:** `/cms.html` laden
- **Prüfung:** Page-Source enthält `CMS_FM_STORNO_REASONS` und `data-fm-storno`
- **Erwartung:** CMS nutzt Dialog statt confirm() für Metzger-Storno

### T-ST-09 Kiosk sendet storno_grund statt personal_antwort (AK-ST-04)
- **Aktion:** `/kiosk` laden
- **Prüfung:** Page-Source enthält `payload.storno_grund` und NICHT `payload.personal_antwort = grund`
- **Erwartung:** Storno-Grund wird im dedizierten Feld gesendet

### T-ST-10 CMS sendet storno_grund statt personal_antwort (AK-ST-04)
- **Aktion:** `cms.js` laden
- **Prüfung:** JS-Source enthält `storno_grund`
- **Erwartung:** CMS nutzt dediziertes Storno-Feld

### T-ST-11 CMS Shop hat Antwort-Dialog + Gelesen-Button (AK-MSG-01)
- **Aktion:** `cms.js` laden
- **Prüfung:** JS-Source enthält `cmsShowShopReplyDialog`, `cmsMarkShopMsgRead`, `Nachricht an Kunden`
- **Erwartung:** CMS Shop hat Antwort-Dialog und Gelesen-Funktion

### T-ST-12 CMS Shop zeigt Kundennachricht + Antwort an (AK-MSG-02)
- **Aktion:** `cms.js` laden
- **Prüfung:** JS-Source enthält `Kunde:</strong>`, `Antwort:</strong>`, `Als gelesen markieren`
- **Erwartung:** CMS Shop-Bestelltabelle zeigt Nachrichten an

### T-ST-13 Shop-Kundenansicht zeigt gesendete Nachricht + Antwort an (AK-MSG-03)
- **Aktion:** `/shop.html` laden
- **Prüfung:** Page-Source enthält `Antwort vom Dorfladen`, `Ihre Nachricht`, `Nachricht an den Dorfladen`
- **Erwartung:** Kunde sieht gesendete und empfangene Nachrichten

### T-ST-14 Shop API liefert kunde_kommentar + personal_antwort (AK-MSG-04)
- **Aktion:** `/api/shop-order?mode=cms` aufrufen
- **Prüfung:** JSON-Response enthält `kunde_kommentar`, `personal_antwort`, `kommentar_gelesen`
- **Erwartung:** API liefert Nachrichtenfelder in der Response

### Testlauf-Tabelle
| Datum | Tests | Ergebnis | Anmerkung |
|---|---|---|---|
| 30.06.2026 | T-ST-01 bis T-ST-10 | ✅ 10/10 | Alle bestanden nach Rerun (2 Timeouts beim 1. Lauf) |
| *ausstehend* | T-ST-11 bis T-ST-14 | – | Nachrichten-Tests, warten auf Deploy |

---

## Social Post Scheduling (Morgen-Posts)
> Spec: specs/social-post-scheduling.md

### T-SP-01 Kiosk: Heute/Morgen Toggle sichtbar (AK-SP-01)
- **Aktion:** Kiosk laden, Social-Tab > Neuer Post
- **Prüfung:** `#soc-date-toggle` mit Buttons "Heute" und "Morgen" sichtbar
- **Erwartung:** Toggle-Leiste wird angezeigt

### T-SP-02 Kiosk: Titel aendert sich bei Morgen-Toggle (AK-SP-02)
- **Aktion:** Kiosk Social-Tab, Morgen-Button klicken
- **Prüfung:** Erste Option in `#soc-post-titel-sel` enthält "Morgen im Dorfladen"
- **Erwartung:** Titel-Optionen passen sich dynamisch an den gewählten Tag an

### T-SP-03 Kiosk: Datum-Label zeigt gewählten Tag (AK-SP-03)
- **Aktion:** Kiosk Social-Tab öffnen
- **Prüfung:** `#soc-date-label` zeigt deutsches Datum
- **Erwartung:** Label nicht leer, enthält Wochentag + Datum

### T-SP-04 CMS: Heute/Morgen Toggle sichtbar (AK-SP-01)
- **Aktion:** CMS laden, Social Media > Neuer Post
- **Prüfung:** `#soc-date-toggle` sichtbar
- **Erwartung:** Toggle-Leiste wird im CMS angezeigt

### T-SP-05 API: social-post akzeptiert ziel_datum (AK-SP-05)
- **Aktion:** `GET /api/social-post`
- **Prüfung:** Response Status 200, JSON hat `items`
- **Erwartung:** API antwortet korrekt

### T-SP-06 API: tagespost liefert today_post und tomorrow_post (AK-SP-07)
- **Aktion:** `GET /api/tagespost`
- **Prüfung:** Response enthält `today_post` und `tomorrow_post` Felder
- **Erwartung:** Beide Felder vorhanden (Werte können null sein)

### T-SP-07 Homepage: TagesInfo-Modal hat Tab-Leiste (AK-SP-08)
- **Aktion:** Homepage laden
- **Prüfung:** `#tp-day-tabs` existiert im DOM
- **Erwartung:** Tab-Leiste ist im DOM vorhanden (ggf. versteckt wenn nur ein Post)

### T-SP-08 Kiosk: Geplante Posts Label existiert (AK-SP-11)
- **Aktion:** Kiosk Social-Tab > Neuer Post
- **Prüfung:** `#soc-today-posts` existiert im DOM
- **Erwartung:** Container für geplante Posts vorhanden

### Testlauf-Tabelle
| Datum | Tests | Ergebnis | Anmerkung |
|---|---|---|---|
| 01.07.2026 | T-SP-01 bis T-SP-08 | ✅ 8/8 | Alle bestanden |

---

## Kunden-Stornierung (Bestellstatus-Seite)
> Spec: specs/storno-begruendung.md → AK-ST-12, AK-ST-13, AK-ST-14
> Testdatei: tests/kunden-storno.spec.js

### T-ST-12-01 Cancel-Card HTML-Element existiert im DOM (AK-ST-12)
- **Aktion:** Bestellstatus-Seite `/bestellstatus` aufrufen
- **Prüfung:** `#bs-cancel-card` existiert im DOM
- **Erwartung:** Element ist vorhanden (initial versteckt)

### T-ST-12-02 Cancel-Button enthält korrekten Text und Icon (AK-ST-12)
- **Aktion:** Bestellstatus-Seite laden
- **Prüfung:** `#bs-cancel-btn` enthält "Bestellung stornieren" + Lucide x-circle Icon
- **Erwartung:** Button-Text und Icon vorhanden

### T-ST-12-03 cancelOrder Funktion existiert global (AK-ST-12)
- **Aktion:** Bestellstatus-Seite laden, `typeof cancelOrder` prüfen
- **Prüfung:** JS-Funktion ist global verfügbar
- **Erwartung:** `typeof cancelOrder === 'function'`

### T-ST-13-01 MT Status 0 zeigt Cancel-Card (AK-ST-13)
- **Aktion:** `renderOrder()` mit Status 0 und `_orderType='mt'` aufrufen
- **Prüfung:** `#bs-cancel-card` ist sichtbar (display !== 'none')
- **Erwartung:** Cancel-Button wird angezeigt

### T-ST-13-02 MT Status 1 versteckt Cancel-Card (AK-ST-13)
- **Aktion:** `renderOrder()` mit Status 1 (Bestätigt) und `_orderType='mt'` aufrufen
- **Prüfung:** `#bs-cancel-card` ist versteckt
- **Erwartung:** Cancel-Button wird NICHT angezeigt

### T-ST-13-03 MT Status 2 versteckt Cancel-Card (AK-ST-13)
- **Aktion:** `renderOrder()` mit Status 2 (Storniert) und `_orderType='mt'` aufrufen
- **Prüfung:** `#bs-cancel-card` ist versteckt
- **Erwartung:** Cancel-Button wird NICHT angezeigt

### T-ST-13-04 FM Status 0 zeigt Cancel-Card (AK-ST-08)
- **Aktion:** `renderFleischOrder()` mit Status 0 und `_orderType='fm'` aufrufen
- **Prüfung:** `#bs-cancel-card` ist sichtbar
- **Erwartung:** Cancel-Button wird angezeigt

### T-ST-13-05 FM Status 1 versteckt Cancel-Card (AK-ST-08)
- **Aktion:** `renderFleischOrder()` mit Status 1 und `_orderType='fm'` aufrufen
- **Prüfung:** `#bs-cancel-card` ist versteckt
- **Erwartung:** Cancel-Button wird NICHT angezeigt

### T-ST-14-01 cancelOrder baut korrekten API-Aufruf für MT (AK-ST-14)
- **Aktion:** JS-Logik mit `_orderType='mt'` und Mock-Order prüfen
- **Prüfung:** API-URL ist `/api/lunch-order/{id}`, Payload enthält `status:2, kunde_storno:true, storno_grund`
- **Erwartung:** Korrekte URL und Payload-Struktur

### Testlauf-Tabelle
| Datum | Tests | Ergebnis | Anmerkung |
|---|---|---|---|
| 02.07.2026 | T-ST-12-01 bis T-ST-14-01 | ✅ 9/9 | Alle bestanden (Live) |
| 01.07.2026 | T-ST-15-01 bis T-ST-15-08 | ✅ 8/8 | Custom-Dialog + Toast alle bestanden (Live) |

### T-ST-15-01 cancelOrder öffnet Custom-Dialog statt prompt() (AK-ST-08)
- **Aktion:** `cancelOrder()` aufrufen mit Mock-Order
- **Prüfung:** `.bs-dialog-ov` Overlay erscheint, kein nativer Dialog
- **Erwartung:** Custom-Modal wird angezeigt

### T-ST-15-02 Custom-Dialog zeigt Titel und Textarea (AK-ST-08)
- **Aktion:** `cancelOrder()` aufrufen
- **Prüfung:** `.bs-dialog-title` enthält "stornieren", `#bs-storno-grund` sichtbar
- **Erwartung:** Dialog hat Titel und Eingabefeld

### T-ST-15-03 Stornieren-Button ist initial deaktiviert (AK-ST-08)
- **Aktion:** `cancelOrder()` aufrufen
- **Prüfung:** `#bs-storno-yes` ist disabled
- **Erwartung:** Button ist erst nach Texteingabe aktiv

### T-ST-15-04 Stornieren-Button wird aktiv nach Texteingabe (AK-ST-08)
- **Aktion:** Text in `#bs-storno-grund` eingeben
- **Prüfung:** `#bs-storno-yes` ist enabled
- **Erwartung:** Button wird klickbar

### T-ST-15-05 Abbrechen schließt Dialog (AK-ST-08)
- **Aktion:** `#bs-storno-no` klicken
- **Prüfung:** `.bs-dialog-ov` nicht mehr sichtbar
- **Erwartung:** Dialog wird geschlossen

### T-ST-15-06 bsToast Funktion existiert und zeigt Toast (AK-ST-15)
- **Aktion:** `bsToast('Testmeldung', 'info')` aufrufen
- **Prüfung:** `.bs-toast` sichtbar mit Text "Testmeldung"
- **Erwartung:** Toast-Notification erscheint

### T-ST-15-07 bsToast zeigt Fehlerfarbe bei error-Typ (AK-ST-15)
- **Aktion:** `bsToast('Fehler!', 'error')` aufrufen
- **Prüfung:** `.bs-toast.error` sichtbar
- **Erwartung:** Toast hat rote Fehlerfarbe

### T-ST-15-08 Kein nativer alert() oder prompt() im Code (AK-ST-15)
- **Aktion:** Inline-Scripts der Seite analysieren
- **Prüfung:** Kein `alert(` oder `prompt(` in Inline-Scripts
- **Erwartung:** Alle nativen Dialoge sind durch Custom-Dialoge/Toasts ersetzt

---

## Mittagstisch bestellen – Bestellbare Tage
> Spec: specs/mittagstisch-bestellen.md → AK-MT-01 bis AK-MT-06
> Testdatei: tests/mittagstisch-bestellen.spec.js

### T-MT-01 Vergangene Tage sind ausgegraut und nicht klickbar (AK-MT-01)
- **Aktion:** `/mittagstisch-bestellen` öffnen
- **Prüfung:** Vergangene Tage haben `opacity:.45`, `pointer-events:none`, `line-through`
- **Erwartung:** Items nicht klickbar, Text durchgestrichen

### T-MT-02 Vergangene Tage zeigen "vorbei" Label (AK-MT-01)
- **Aktion:** `/mittagstisch-bestellen` öffnen
- **Prüfung:** Header vergangener Tage enthalten "vorbei"
- **Erwartung:** Mindestens ein Header mit "vorbei" vorhanden

### T-MT-03 Vergangene Tage haben keinen Bestell-Button (AK-MT-01)
- **Aktion:** `/mittagstisch-bestellen` öffnen
- **Prüfung:** Vergangene Items haben kein `.menu-item-order` Element
- **Erwartung:** Kein Warenkorb-Icon bei vergangenen Tagen

### T-MT-04 Zukünftige Tage zeigen Bestell-Button (AK-MT-03)
- **Aktion:** `/mittagstisch-bestellen` öffnen
- **Prüfung:** Aktive Items haben `.menu-item-order`
- **Erwartung:** Warenkorb-Icon bei bestellbaren Tagen sichtbar

### T-MT-05 Bestellschluss wird dynamisch geladen (AK-MT-04)
- **Aktion:** `/mittagstisch-bestellen` öffnen
- **Prüfung:** `#lunch-cd` ist sichtbar und hat Text
- **Erwartung:** Countdown oder "erreicht"-Meldung wird angezeigt

### T-MT-06 TagesInfo zeigt Mittagessen-Bestell-Button (AK-MT-05)
- **Aktion:** Startseite öffnen, TagesInfo-Modal öffnen
- **Prüfung:** `.tp-item-order` mit href `/mittagstisch-bestellen` vorhanden
- **Erwartung:** Bestell-Button im TagesInfo sichtbar

### T-MT-07 TagesInfo Mittagessen-Name wird nicht abgeschnitten (AK-MT-06)
- **Aktion:** Startseite öffnen, TagesInfo-Modal öffnen
- **Prüfung:** `.tp-item-name` hat `white-space` ≠ `nowrap`
- **Erwartung:** Name wird mehrzeilig angezeigt

### T-MT-08 TagesInfo zeigt nicht redundant "Mittagessen" als Kategorie (AK-MT-06)
- **Aktion:** Startseite öffnen, TagesInfo-Modal öffnen
- **Prüfung:** `.tp-item-cat` unter Mittagessen-Sektion enthält nicht "Mittagessen"
- **Erwartung:** Redundantes Kategorie-Label entfernt

---

## Meine Bestellungen – Unified Order View
> Spec: specs/meine-bestellungen.md → AK-MB-01 bis AK-MB-12
> Testdatei: tests/meine-bestellungen.spec.js

### T-MB-01-01 loadMyOrders Funktion existiert (AK-MB-01)
- **Aktion:** Shop-Seite `/shop` aufrufen
- **Prüfung:** `typeof loadMyOrders === 'function'`
- **Erwartung:** `true`

### T-MB-01-02 renderMyOrders Funktion existiert (AK-MB-01)
- **Aktion:** Shop-Seite `/shop` aufrufen
- **Prüfung:** `typeof renderMyOrders === 'function'`
- **Erwartung:** `true`

### T-MB-01-03 Default-Filter ist open (AK-MB-07)
- **Aktion:** Shop-Seite `/shop` aufrufen
- **Prüfung:** `_myOrdersFilter === 'open'`
- **Erwartung:** `true`

### T-MB-01-04 shop-history-btn existiert (AK-MB-01)
- **Aktion:** Shop-Seite `/shop` aufrufen
- **Prüfung:** `#shop-history-btn` existiert
- **Erwartung:** Element vorhanden

### T-MB-06-01 Filter-Buttons werden gerendert (AK-MB-06)
- **Aktion:** Mock-Daten in `_myOrdersCache` setzen, `renderMyOrders()` aufrufen
- **Prüfung:** Filter-Buttons `open`, `7d`, `30d`, `all` vorhanden
- **Erwartung:** Alle 4 Filter-Buttons existieren

### T-MB-07-01 Filter open zeigt nur offene Bestellungen (AK-MB-07)
- **Aktion:** 4 Mock-Bestellungen (2 offen, 2 abgeschlossen), Filter `open`
- **Prüfung:** Anzahl `.shop-order-card` Elemente
- **Erwartung:** 2 Karten

### T-MB-07-02 Filter all zeigt alle Bestellungen (AK-MB-10)
- **Aktion:** 3 Mock-Bestellungen, Filter `all`
- **Prüfung:** Anzahl `.shop-order-card` Elemente
- **Erwartung:** 3 Karten

### T-MB-07-03 Filter 7d zeigt nur letzte 7 Tage (AK-MB-08)
- **Aktion:** 1 Bestellung 2 Tage alt, 1 Bestellung 10 Tage alt, Filter `7d`
- **Prüfung:** Anzahl `.shop-order-card` Elemente
- **Erwartung:** 1 Karte

### T-MB-02-01 Fleisch-Badge sichtbar (AK-MB-02)
- **Aktion:** FM Mock-Bestellung, `renderMyOrders()`
- **Prüfung:** Karte enthält Text "Fleisch"
- **Erwartung:** `true`

### T-MB-04-01 FM Details-Link vorhanden (AK-MB-04)
- **Aktion:** FM Mock-Bestellung mit Bestellnummer, Karte aufklappen
- **Prüfung:** Link zu `/bestellstatus?nr=...` vorhanden
- **Erwartung:** Link existiert

### T-MB-12-01 Schon bestellt – FM abgeholte/stornierte gefiltert (AK-MB-12)
- **Aktion:** Shop-Seite Quellcode prüfen
- **Prüfung:** Code enthält `b.status<3` Filterung
- **Erwartung:** Bedingung vorhanden

### Testlauf-Tabelle
| Datum | Tests | Ergebnis | Anmerkung |
|---|---|---|---|
| 03.07.2026 | T-MB-01-01 bis T-MB-12-01 | ✅ 11/11 | Alle bestanden (Live) |
