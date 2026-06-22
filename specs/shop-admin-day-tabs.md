# Shop-Admin – Haupt-Tabs (Online-Shop / Mittagstisch)

## Kontext
Aktuell zeigt die Shop-Admin-Seite den Mittagstisch als aufklappbare Sektion über den Online-Shop-Bestellungen. Der User möchte stattdessen **zwei gleichwertige Haupt-Tabs** zum Umschalten – wie im Kiosk.

## Anforderungen

### Haupt-Tab-Leiste
- [x] Zwei Tabs oben: **🛒 Online-Shop** und **🍽 Mittagstisch**
- [x] Default: Online-Shop aktiv (wie bisher)
- [x] Tabs wechseln den sichtbaren Bereich (Online-Shop oder Mittagstisch)
- [x] Aktiver Tab farblich hervorgehoben

### Online-Shop Tab (bestehend)
- [x] Enthält alles was bisher im Haupt-Bereich war: Toolbar, Bestellliste, Detail-Panel
- [x] Keine Änderung an der Funktionalität

### Mittagstisch Tab
- [x] Enthält die bisherige Mittagstisch-Sektion (ohne Aufklapp-Mechanismus)
- [x] Day-Tabs (Mo–Sa) direkt sichtbar
- [x] Stats, Bestellliste, Neue Bestellung – alles wie bisher
- [x] Tagesauswahl inkl. Samstag

### Aufklapp-Mechanismus entfernen
- [x] Kein `toggleMittag()` mehr
- [x] Kein ▲/▼ Toggle-Icon
- [x] Mittagstisch-Inhalt immer sichtbar wenn Tab aktiv

## Betroffene Dateien
- `static-site/shop-admin.html` – Layout-Umbau, Tab-Logik

## Akzeptanzkriterien
- [x] AK-DT-01: Zwei Haupt-Tabs sichtbar: "Online-Shop" und "Mittagstisch"
- [x] AK-DT-02: Default ist "Online-Shop"
- [x] AK-DT-03: Klick auf "Mittagstisch" zeigt Mittagstisch, versteckt Online-Shop
- [x] AK-DT-04: Klick auf "Online-Shop" zeigt Online-Shop, versteckt Mittagstisch
- [x] AK-DT-05: Day-Tabs (Mo–Sa) sind sofort sichtbar im Mittagstisch-Tab
- [x] AK-DT-06: Bestehende Online-Shop-Funktionalität bleibt unverändert
- [x] AK-DT-07: Bestehende Mittagstisch-Funktionalität bleibt unverändert

## Nicht-Ziele
- Keine neuen Features, nur Layout-Umbau
- Kein neues Styling der Bestelllisten

## Status
- [x] Spec reviewed
- [x] Implementierung
- [x] Validierung (2026-06-21)
