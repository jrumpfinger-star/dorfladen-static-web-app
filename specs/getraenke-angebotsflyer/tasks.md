# Aufgaben

Spec: [spec.md](./spec.md), Plan: [plan.md](./plan.md).
Status wird in den Session-Todos geführt, Abnahme nur anhand der Testfälle.

| ID | Arbeit | Abhängigkeit | Testfälle |
|---|---|---|---|
| GF0 | Feature-Branch/Worktree, main unverändert | keine | Ausgangsstand geprüft |
| GF1 | SDD und konkrete Daten-/Integrationsverträge abschließen | GF0 | F1-F9 Traceability |
| GF2 | Private Dokumente/Bilder, API, Validierung und atomare Freigabe | GF1 | TC-F2-01..03, TC-F4-01..04, TC-F8-01 |
| GF3 | Gemeinsamer Editor, freie Elemente, Vorlagen/Druck; Kiosk/CMS und neuer Reiter im bestehenden Designeditor | GF2 | TC-F1-01..03, TC-F3-01..06, TC-F7-01..03, TC-F9-01..03 |
| GF4 | Gemeinsame Kundenkarten und Original-Flyer mobil/Desktop | GF2, GF3 | TC-F5-01..05, TC-F4-01..03 |
| GF5 | Bestehende Waagenausgabe erweitern, Ablauf und Preview-Schutz | GF2, GF3 | TC-F6-01..05, TC-F8-02 |
| GF6 | Zieltests/Regression auf vier Viewports, Anwenderhilfe | GF4, GF5 | alle lokalen Testfälle |
| GF7 | Branch veröffentlichen, PR-Preview deployen und nachprüfen | GF6 | TC-F8-03, Preview-Smoke |
