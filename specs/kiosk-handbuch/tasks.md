# Kiosk-Handbuch — Tasks

**Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)

## Conventions

- Aufgaben werden in der angegebenen Reihenfolge abgeschlossen.
- Eine Aufgabe ist erst erledigt, wenn die zugeordneten Testfälle erfolgreich sind.
- Die Hilfe beschreibt ausschließlich nachgewiesene Bedienabläufe.

## Setup und Quellenprüfung

- [x] T001 Aktuelle Kiosk-Oberfläche und Spezifikationen für alle sechs Fachbereiche prüfen — dient `F2`
- [x] T002 Unbelegte und geschäftlich ungeeignete Aussagen der bisherigen Hilfe erfassen — dient `F1`, `F2`
- [x] T003 Spezifikation und Umsetzungsplan ohne offene Klärung erstellen — dient `F1`–`F4`

## Core Implementation

- [x] T010 Grundlayout, semantische Tab-Navigation und responsive Darstellung überarbeiten — dient `F4` / `TC-F4-01`, `TC-F4-02`, `TC-F4-03`
- [x] T011 Überblick, Mittagstisch, Online-Shop, Metzger und Stammkunden professionell neu schreiben — dient `F1`, `F2`, `F3` / `TC-F1-01`, `TC-F1-02`, `TC-F2-01`, `TC-F2-02`, `TC-F2-03`, `TC-F3-01`
- [x] T012 Social Media mit geräteabhängigem Teilen, Entwürfen und Katalogpflege neu schreiben — dient `F2`, `F3` / `TC-F2-01`, `TC-F3-02`
- [x] T013 Kalender mit belegten Einzel- und Serienaktionen neu schreiben — dient `F2`, `F3` / `TC-F2-01`, `TC-F2-03`, `TC-F3-01`

## Tests

- [x] T020 Playwright-Test für Sprache, Kernbegriffe und ausgeschlossene Falschaussagen ergänzen — deckt `TC-F1-*`, `TC-F2-*`, `TC-F3-*`
- [x] T021 Playwright-Test für Klick-, Tastatur- und Responsive-Verhalten ergänzen — deckt `TC-F4-*`
- [x] T022 Geänderte Dateien diagnostisch prüfen und fokussierte Tests lokal in allen Viewports ausführen — deckt `TC-F1-*` bis `TC-F4-*`

## Validation & Rollout

- [x] T030 Änderungen auf Feature-Branch committen und pushen
- [x] T031 Bereitstellung abwarten und fokussierte Tests gegen Feature-URL wiederholen
- [x] T032 Live-Inhalt mit Cache-Buster prüfen und Ergebnisse dokumentieren

## Traceability

| Task | Requirement | Test Cases |
| --- | --- | --- |
| T010 | F4 | TC-F4-01, TC-F4-02, TC-F4-03 |
| T011 | F1, F2, F3 | TC-F1-01, TC-F1-02, TC-F2-01, TC-F2-02, TC-F2-03, TC-F3-01 |
| T012 | F2, F3 | TC-F2-01, TC-F3-02 |
| T013 | F2, F3 | TC-F2-01, TC-F2-03, TC-F3-01 |
| T020 | F1, F2, F3 | TC-F1-01, TC-F1-02, TC-F2-01, TC-F2-02, TC-F2-03, TC-F3-01, TC-F3-02 |
| T021 | F4 | TC-F4-01, TC-F4-02, TC-F4-03 |
| T022 | F1–F4 | alle |
| T030–T032 | F1–F4 | alle |
