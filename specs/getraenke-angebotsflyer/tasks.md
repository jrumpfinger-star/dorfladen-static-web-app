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
| GF26 | Dezimale Mengen in Liste und Dialog mit Komma anzeigen, verlustfrei speichern und auf vier Viewports prüfen | GF22 | TC-F11-07, TC-F2-01..03 |
| GF27 | Direkte Vorschauwerkzeuge und echten Maus-/Touch-Größenanfasser integrieren und testen | GF14, GF22 | TC-F11-08, TC-F3-04 |
| GF28 | Eigene Produktbilder mit Strichcode zusätzlich nach SharePoint speichern, Fehler sichtbar behandeln und private Vorschaubilder authentifiziert laden | GF23 | TC-F2-04..06 |
| GF29 | Bildregression auf vier Viewports, Hilfe aktualisieren und ausschließlich PR-Preview bereitstellen | GF28 | TC-F2-04..06, TC-F11-02, TC-F11-06 |
| GF30 | Originale CMS-Zeichenfunktionen gemeinsam nutzen, Designsnapshot validieren und Wocheneditor anbinden | GF29 | TC-F14-01..03 |
| GF31 | Gemeinsamen Editor als normalen Kioskinhalt einbetten, Reiter und Entwurf erhalten | GF29 | TC-F14-04 |
| GF32 | Originalrenderer-/Snapshot-/Kioskregression, vier Viewports, Hilfe und Feature-Preview prüfen | GF30, GF31 | TC-F14-01..04 |
| GF33 | Kompakte Zeilenübersicht mit Filtern und Direktaktionen; bestätigtes versionsgeschütztes Löschen | GF29 | TC-F15-01..02 |
| GF34 | Gemeinsame Direktwerkzeuge für CMS-Designvorschau und Original-Wochenvorlagen, gespeicherte Anpassungen, Original-Ersparnismarker und bestätigter Vorschau-Reset | GF30 | TC-F16-01..04 |
| GF35 | Artikelschritt auf volle Breite, kompakte direkt bearbeitbare Zeilen und semantisch farbige Übersichtsknöpfe | GF33, GF34 | TC-F17-01, TC-F17-03 |
| GF36 | Stabile Mehrfachauswahl ohne Treffer-Neuaufbau, gemeinsame Artikelübernahme mit einmaliger Layoutaktualisierung, Hilfe und Vier-Viewport-Tests | GF35 | TC-F17-01..03 |
| GF37 | F18-Datenvertrag/SDD aktualisieren, Dataverse-Schema prüfen und nur ausdrücklich freigegebene optionale Spalten ergänzen; keine Testangebote in Produktion | GF36 | TC-F18-03, TC-F18-06 |
| GF38 | Bestehende Dataverse-API für Art/Getränkedaten und transaktionale Aktions-/Layoutspeicherung erweitern | GF37 | TC-F18-03, TC-F18-06 |
| GF39 | Gemeinsamen CMS-Erfassungsdialog mit direkter Suche/Bildwerkzeugen und Getränke-Kachelwahl 4/6 integrieren | GF37 | TC-F18-01, TC-F18-02 |
| GF40 | Vorschau/Karten-/Einzelflyerbearbeitung und bestehende Renderer in CMS/Kiosk verbinden, Altbestand erhalten | GF38, GF39 | TC-F18-04, TC-F18-05 |
| GF41 | Vier-Viewport-Abnahme, Daten-/Speicherregression und Anwenderhilfe | GF38, GF39, GF40 | TC-F18-01..06 |
| GF42 | Ausschließlich Feature-Preview nach Schema-/Datenisolationsprüfung oder ausdrücklicher Freigabe des gemeinsamen produktiven Bestands bereitstellen; keine produktiven Schreibtests | GF41 | TC-F18-05, TC-F18-06 |
| GF43 | Blockierende Vorlagenabrufe aus Übersicht entfernen, bestehende Bilder nachladen und abgelaufene Bildlinks erneuern | GF41 | TC-F18-07, TC-F18-08 |
| GF44 | Ursprüngliche kompakte CMS-Übersicht/Erfassung mit aufklappbaren Artikeln wiederherstellen, vier Viewports prüfen und nur Feature-Preview aktualisieren | GF43 | TC-F18-07..09 |
| GF45 | Vorschau mit fester Zeichenfläche, seitlichen Werkzeugen und wiederverwendeter Artikelbearbeitung integrieren | GF44 | TC-F19-02, TC-F19-03 |
| GF46 | Auswahl ohne Layoutsprung, echte Direkttransformationen und Drehgriffe für Getränke und Original-Wochenvorlagen ergänzen | GF45 | TC-F19-01, TC-F19-04 |
| GF48 | Stabile Artikelkennungen beim Speichern, deutsche Konfliktmeldungen und zentrierte Meldungsfenster | GF44 | TC-F18-10, TC-F18-11 |
| GF49 | Kopf der Magazinvorlagen (Logo, Titel, Zeitraum) vertikal ausrichten, Titel einzeilig | GF45 | TC-F19-05 |
| GF50 | Drei bildbetonte Standardvorlagen (Bild 50 %) für Sammelflyer, Kachel, Einzelflyer und Waage; Serverfreigabe; CMS-Originalauswahl unverändert | GF49 | TC-F20-01, TC-F20-02 |
| GF51 | Mockups aller Ausgabeziele aus dem echten Renderer erzeugen und zur Abnahme bereitstellen | GF50 | TC-F20-03 |
| GF52 | Drei Preisschild-Vorlagen (Aufteilung der Originalkachel) mit Flag `tag` für alle Ausgabeziele ergänzen | GF50 | TC-F20-04 |
| GF53 | Startseitenkacheln halbfett statt fett zeichnen (Option nur für `paintCards`), CMS-/Flyerausgaben unverändert | GF52 | TC-F21-01 |
| GF47 | Vier-Viewport-Pointer-/Speicherregression und Hilfe aktualisieren; ausschließlich Feature-Preview prüfen und bereitstellen | GF46 | TC-F19-01..04 |
| GF54 | Öffentliche API liefert künftige, nicht abgelaufene Aktionen (Homepage Nächste Woche) | GF53 | TC-F25-01, TC-F25-02 |
| GF55 | Kontraststarke Buttons und Felder im Angebotsbereich | GF54 | TC-F24-01 |
| GF56 | Kompakte Werkzeugspalte der Original-Wochenvorschau mit Feinverschiebung | GF55 | TC-F26-01 |
| GF57 | Ersparnismarker passend zur Textbreite vergrößern | GF56 | TC-F22-01 |
| GF58 | Stil je Ausgabeziel (layout.target_styles) in Modell, UI und API | GF57 | TC-F23-01..03 |
| GF59 | Ghost, Duplikat, Kopien, Eigenes Bild, Drehung und Zurücksetzen in allen Editoren (Original-Renderer liefert Elemente für Auswahl) | GF58 | TC-F27-01, TC-F27-02 |
| GF60 | Kiosk-Reiter „Angebote“ in Quelle und Generator übernehmen | GF59 | TC-S8a, TC-S8c |
| GF61 | Flyer-Aktion nach Mockup A in Wochenleiste integrieren; Mehrfachauswahl, Fokus, Leerzustand und vier Viewports prüfen; Preview bereitstellen | GF60 | TC-F29-01, TC-F29-02 |
| GF62 | „Designstandards übernehmen“ wirkt im gewählten Ausgabeziel auf alle Artikel, mit Zielfeinverschiebungen; Hinweis auf der Designseite; Preview bereitstellen | GF61 | TC-F30-01 |