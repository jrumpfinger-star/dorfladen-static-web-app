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
| – | T-39-01 | – |
| – | T-39-02 | – |
| – | T-39-03 | – |
| – | T-39-04 | – |
