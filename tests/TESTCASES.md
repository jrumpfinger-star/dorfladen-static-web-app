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

### T4.2 – Alle 4 Tabs vorhanden
- **Aktion:** `.k-tab` Elemente zählen und Texte lesen
- **Prüfung:** `document.querySelectorAll('.k-tab')` → `textContent`
- **Erwartung:** 4 Tabs: "🍽 Mittagstisch", "🛒 Abholungen (N)", "👥 Stammkunden", "📋 Speiseplan"

### T4.3 – Abholungen-Tab: Badge mit Zähler
- **Aktion:** Text des Abholungen-Tabs prüfen
- **Prüfung:** Zahl im Tab-Text extrahieren
- **Erwartung:** Zahl > 0 wenn offene Shop-Bestellungen vorhanden, z.B. "🛒 Abholungen 16"

### T4.4 – Abholungen-Tab: Filter funktioniert
- **Aktion:** Abholungen-Tab öffnen, Filter-Buttons (Offen/Heute/Alle) anklicken
- **Prüfung:** Angezeigte Bestellungen zählen nach Filterwechsel
- **Erwartung:** "Offen" zeigt nur Status Neu/Bearbeitung/Bereit, "Heute" nur heutiges Datum, "Alle" alle Bestellungen

### T4.5 – Stammkunden-Tab: Buttons vorhanden
- **Aktion:** Stammkunden-Tab öffnen
- **Prüfung:** "Neuer Kunde" und "Alle laden" Buttons prüfen
- **Erwartung:** Beide Buttons sichtbar und klickbar

### T4.6 – Speiseplan-Tab: Wochenplan angezeigt
- **Aktion:** Speiseplan-Tab öffnen
- **Prüfung:** Inhalt enthält Wochentage und Gerichte
- **Erwartung:** Mo–Fr mit Gerichtnamen und Preisen sichtbar

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

## Letzter Testlauf: 2026-06-21 (Sonntag)
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
| T4 Kiosk Tabs | ✅ | 4 Tabs, Abholungen Badge=16 |
| T5 Lunch-Admin Kiosk-Link | ✅ | 🏪 Kiosk sichtbar |
| T6 CMS Toggle An | ✅ | Grün (#22c55e) |
| T6 CMS Toggle Aus | ✅ | Grau (#e5e7eb) |

## Fehler-Log
| Datum | Test | Fehler | Fix |
|---|---|---|---|
| 2026-06-21 | T2 Wochenplan | Am Wochenende alle Tage ausgegraut (opacity .45) + keine Bestell-Buttons, obwohl nächste Woche angezeigt wird | `isWeekend`-Check: am Sa/So `isPast=false` und `isToday=false` für alle Tage → alles bestellbar |
| 2026-06-21 | T3 Tages-Tabs | Am Wochenende war Sonntag als Datum selektiert, statt nächster Werktag. Tabs korrekt (Mo-Fr) aber Bestellungen für Sonntag geladen | `validDates.indexOf()` Check: falls `_mtSelectedDate` nicht in Tabs → auf ersten Tab (Montag) setzen |
