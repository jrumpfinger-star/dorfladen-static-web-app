# AK-UI-37: Kiosk Shop-Abholungen – Historien-Filter

## Ziel
Der "Historie"-Tab im Kiosk-Shop-Panel soll zu einem vollwertigen Filter werden mit Zeitraum-Auswahl und optionalem Status-Filter, statt einfach alle alten Bestellungen auf einmal anzuzeigen.

## Aktuelles Problem
- "Historie" ist nur ein Toggle, der ALLE abgeschlossenen Bestellungen einblendet
- Bei 32+ Einträgen unübersichtlich
- Kein Zeitraum-Filter
- Kein Status-Filter innerhalb der Historie

## Design

### Filter-Tab-Leiste (oben)
Die bestehenden Tabs bleiben:
- ⚙ **Zu erledigen** (N) — Status 0/1/2, abholdatum >= heute
- 📅 **Heute abholen** (N) — abholdatum = heute, Status < 4
- ⚠ **Überfällig** (N) — Status < 3, Zeitslot abgelaufen
- 🕐 **Historie** (N) — **wird zum aktiven Filter-Tab** statt Toggle

### Wenn "Historie" aktiv
Unter der Filter-Leiste erscheint eine **Zeitraum-Bar** (Pill-Buttons):
| Button | Logik |
|---|---|
| Heute | abholdatum = heute, Status 3 oder 4 |
| 7 Tage | abholdatum >= heute-7 |
| 30 Tage | abholdatum >= heute-30 |
| Alle | Kein Zeitfilter |

Daneben optional ein **Status-Filter** (kleine Toggle-Pills):
| Pill | Logik |
|---|---|
| ✅ Abgeholt | Status 3 |
| ❌ Storniert | Status 4 |
| Alle | Status 3 + 4 |

### Verhalten
- Default beim Klick auf "Historie": **7 Tage**, **Alle Status**
- Die Zeitraum-Bar ist NUR sichtbar wenn Historie aktiv ist
- Zurück zu "Zu erledigen" etc. versteckt die Zeitraum-Bar wieder
- Die Historie-Zählung (Badge) zeigt immer die Gesamtanzahl historischer Bestellungen

### UI der Zeitraum-Bar
```
[Heute] [7 Tage] [30 Tage] [Alle]     [✅ Abgeholt] [❌ Storniert]
```
- Pill-Buttons im gleichen Stil wie die k-filter-btn, aber kleiner
- Aktiver Pill: grüner Hintergrund
- Angeordnet in einer Flex-Row unterhalb der Haupt-Filter-Bar

## Testfälle
Siehe `tests/TESTCASES.md` → AK-UI-37
