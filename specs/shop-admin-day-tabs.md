# Shop-Admin – Haupt-Tabs (Online-Shop / Mittagstisch)

## Kontext
Aktuell zeigt die Shop-Admin-Seite den Mittagstisch als aufklappbare Sektion über den Online-Shop-Bestellungen. Der User möchte stattdessen **zwei gleichwertige Haupt-Tabs** zum Umschalten – wie im Kiosk.

## Anforderungen

### Haupt-Tab-Leiste
- [ ] Zwei Tabs oben: **🛒 Online-Shop** und **🍽 Mittagstisch**
- [ ] Default: Online-Shop aktiv (wie bisher)
- [ ] Tabs wechseln den sichtbaren Bereich (Online-Shop oder Mittagstisch)
- [ ] Aktiver Tab farblich hervorgehoben

### Online-Shop Tab (bestehend)
- [ ] Enthält alles was bisher im Haupt-Bereich war: Toolbar, Bestellliste, Detail-Panel
- [ ] Keine Änderung an der Funktionalität

### Mittagstisch Tab
- [ ] Enthält die bisherige Mittagstisch-Sektion (ohne Aufklapp-Mechanismus)
- [ ] Day-Tabs (Mo–Sa) direkt sichtbar
- [ ] Stats, Bestellliste, Neue Bestellung – alles wie bisher
- [ ] Tagesauswahl inkl. Samstag

### Aufklapp-Mechanismus entfernen
- [ ] Kein `toggleMittag()` mehr
- [ ] Kein ▲/▼ Toggle-Icon
- [ ] Mittagstisch-Inhalt immer sichtbar wenn Tab aktiv

## Betroffene Dateien
- `static-site/shop-admin.html` – Layout-Umbau, Tab-Logik

## Akzeptanzkriterien
- [ ] AK-DT-01: Zwei Haupt-Tabs sichtbar: "Online-Shop" und "Mittagstisch"
- [ ] AK-DT-02: Default ist "Online-Shop"
- [ ] AK-DT-03: Klick auf "Mittagstisch" zeigt Mittagstisch, versteckt Online-Shop
- [ ] AK-DT-04: Klick auf "Online-Shop" zeigt Online-Shop, versteckt Mittagstisch
- [ ] AK-DT-05: Day-Tabs (Mo–Sa) sind sofort sichtbar im Mittagstisch-Tab
- [ ] AK-DT-06: Bestehende Online-Shop-Funktionalität bleibt unverändert
- [ ] AK-DT-07: Bestehende Mittagstisch-Funktionalität bleibt unverändert

## Nicht-Ziele
- Keine neuen Features, nur Layout-Umbau
- Kein neues Styling der Bestelllisten

## Status
- [ ] Spec reviewed
- [ ] Implementierung
- [ ] Validierung
