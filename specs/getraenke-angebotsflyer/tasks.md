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
| GF8 | Gemeinsame Vorschaukacheln, Aufteilungswahl und gruppierte Felder | GF7 | TC-F10-01, TC-F10-02, TC-F10-04 |
| GF9 | Sichtbare Ausgabevorschauen in beiden Editoren integrieren | GF8 | TC-F10-03, TC-F10-04 |
| GF10 | Vier-Viewport-Abnahme, Regression, Anwenderhilfe und Preview aktualisieren | GF8, GF9 | TC-F10-01..04, TC-F8-03 |
| GF11 | F11-Spezifikation: Artikelstamm, Mockup-Layout und Kundenkacheln | GF10 | TC-F11-01..04 |
| GF12 | Artikelstamm-/Bildsuche und private Bildübernahme integrieren | GF11 | TC-F11-01..02 |
| GF13 | Editor 1:1 nach Mockup verdichten, Artikeldialog/Bildpflege ergänzen | GF11, GF12 | TC-F11-02, TC-F11-04 |
| GF14 | Vier unabhängige Ziellayouts im Modell, Validator, Editor und Ausgaben | GF11, GF12 | TC-F11-03 |
| GF15 | API-, Renderer-, Komponenten- und Regressionstests ergänzen; Hilfe aktualisieren | GF13, GF14 | TC-F11-01..04, F2, F3, F4, F5, F7 |
| GF16 | Vier-Viewport-Abnahme und erneute Preview-Verifikation | GF15 | TC-F11-01..04, TC-F8-03 |
| GF17 | CMS-Anmeldung und gespeicherte Serversitzung zusammenführen, Fehler am Hauptlogin behandeln | GF16 | TC-F9-01, TC-F4-01 |
| GF18 | Originalvorlagenliste, freie Layoutfamilien und API-Validierung ergänzen | GF16 | TC-F13-01..02 |
| GF19 | Hochauflösendes Original-Logo als frei bearbeitbares Flyerelement integrieren | GF18 | TC-F13-03 |
| GF20 | Auswahl direkt zugänglich machen, Hilfe aktualisieren und vier Viewports prüfen | GF17, GF18, GF19 | TC-F9-01, TC-F13-01..04 |
| GF21 | Gemeinsame große Vorlagenvorschau mit Doppelklick, Touch/Tastatur, Zoom und Fokus ergänzen; Hilfe und Vier-Viewport-Tests | GF20 | TC-F13-05 |
| GF22 | Artikel direkt bearbeiten, Inline-Zusatzfelder und abgeleitete Werte, Mobil-/Tab-/Speicherregression und Hilfe | GF13 | TC-F11-04..05 |
| GF23 | Automatische EAN-only-Bildübernahme und Nachladen fehlender Entwurfsbilder mit sichtbarem Status korrigieren | GF12 | TC-F11-06 |
| GF24 | GF21–GF23 zusammen in isolierter Feature-Vorschau bereitstellen und ausgelieferte UI prüfen | GF21, GF22, GF23 | TC-F11-04..06, TC-F13-05 |
| GF25 | Kundenangebote ohne Kategorieumschaltung gemeinsam anzeigen, mobil und Desktop prüfen | GF24 | TC-F5-01..05 |
