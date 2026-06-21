# Dorfladen – Wiederkehrende Testcases

> Diese Datei wird bei Änderungen/Fehlern erweitert.  
> Tests werden per Playwright auf der Live-Seite durchgeführt.

## Umgebungen
| Umgebung | URL |
|---|---|
| Produktion | https://kind-pebble-072605b03.7.azurestaticapps.net |
| Bestellsystem | https://witty-island-064f9d903.7.azurestaticapps.net |

---

## T1 – Startseite: Navigation & Links
- [ ] Seite lädt ohne Fehler (kein JS-Error in Console)
- [ ] Desktop-Navigation: Kiosk-Link vorhanden (wenn Feature-Flag aktiv)
- [ ] Mobile-Navigation (Footer): Kiosk-Link vorhanden (wenn Feature-Flag aktiv)
- [ ] Alle Hauptlinks erreichbar: Shop, Sortiment, Öffnungszeiten, Bilder

## T2 – Wochenplan / Mittagstisch (Desktop & Mobile)
- [ ] Wochenplan wird angezeigt mit KW-Nummer und Datumsbereich
- [ ] Vergangene Tage sind ausgegraut (opacity < 1)
- [ ] Vergangene Tage zeigen KEINEN Bestell-Button 🍽
- [ ] Heutiger Tag: Bestell-Button nur sichtbar wenn vor 10:00 Uhr
- [ ] Zukünftige Tage: Bestell-Button sichtbar
- [ ] Am Wochenende: Nächste Woche wird angezeigt (alle Buttons sichtbar)
- [ ] Klick auf Bestell-Button öffnet mittagstisch-bestellen.html mit korrekten Parametern

## T3 – Shop-Admin (/shop-admin)
- [ ] Seite lädt ohne JS-Fehler
- [ ] Header-Toolbar: Kiosk-Button 🏪 vorhanden und verlinkt auf /kiosk
- [ ] Mittagstisch-Sektion: Gelber Header mit Badge sichtbar
- [ ] Mittagstisch aufklappen: Tages-Tabs (Heute + 4 Werktage) erscheinen
- [ ] Am Wochenende: Erster Tab = nächster Montag (nicht Samstag/Sonntag)
- [ ] Tab-Wechsel: Bestellungen laden für den gewählten Tag
- [ ] Stats: Neu/Bestätigt/Abgeholt/Storniert Zähler korrekt für gewählten Tag
- [ ] Status-Buttons funktional: Bestätigen, Abgeholt, Stornieren
- [ ] ➕ Neue Bestellung: Formular öffnet sich
- [ ] Gericht-Dropdown: Zeigt Gerichte passend zum gewählten Wochentag
- [ ] Manuelle Bestellung speichern: POST an API mit Quelle=Telefon/Personal
- [ ] Online-Shop-Bestellungen: Separater Bereich mit eigener Überschrift "🛒 Online-Shop-Bestellungen"
- [ ] Shop-Bestellungen laden und Statistiken stimmen

## T4 – Kiosk (/kiosk)
- [ ] Seite lädt ohne JS-Fehler
- [ ] Tabs vorhanden: Mittagstisch, Abholungen, Stammkunden, Speiseplan
- [ ] Mittagstisch-Tab: Bestellungen laden, Status-Buttons funktional
- [ ] Abholungen-Tab: Shop-Bestellungen laden, Live-Badge mit Zähler
- [ ] Abholungen-Tab: Filter (Offen/Heute/Alle) funktioniert
- [ ] Abholungen-Tab: Status-Buttons (Bearbeiten → Bereit → Abgeholt)
- [ ] Stammkunden-Tab: "Neuer Kunde" Button und "Alle laden" Button vorhanden
- [ ] Stammkunden-Tab: Suche funktioniert
- [ ] Speiseplan-Tab: Wochenplan wird angezeigt

## T5 – Lunch-Admin (/lunch-admin)
- [ ] Seite lädt ohne JS-Fehler
- [ ] Kiosk-Link 🏪 im Header vorhanden
- [ ] Bestellungen laden und filtern nach Datum/Status

## T6 – CMS (/cms)
- [ ] Feature-Toggles: An = Grün mit "AN" Label, Aus = Grau mit "AUS" Label
- [ ] Toggle-Farben wechseln beim Umschalten

## T7 – Mittagstisch bestellen (/mittagstisch-bestellen.html)
- [ ] Formular lädt mit Gerichtname und Preis aus URL-Parametern
- [ ] Pflichtfelder: Name, Telefon validiert
- [ ] Bestellung absenden funktioniert

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
