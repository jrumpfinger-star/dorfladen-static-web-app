# Aufgaben

## Gemeinsamer Mockup-Umbau F60–F64

| Aufgabe | Umsetzung / Abschlussnachweis | Abhängigkeiten | Testfälle |
| --- | --- | --- | --- |
| GF102 | Datenkey-/Handlerinventur und vollständige Vorher-/Nachher-Übernahme gemäß Plan; keine im Mockup nicht gezeigte Funktion streichen | Spezifikation und Plan F60–F64 | TC-F60-01, TC-F62-03 |
| GF103 | Feldbesitz/Sichtbarkeit reparieren, Einzelregler direkt und vollständigen transaktionalen Preisschilddialog integrieren; sichtbare Griffe kachelrelativ mit getrennten transparenten Touchzielen verkleinern | GF102 | TC-F60-01..04, TC-F19-06 |
| GF104 | Marker-/Farbweltbinding und reproduzierte Originaltextfehler beheben | GF102 | TC-F64-01..02 |
| GF105 | Rückwärtskompatible Familien/Varianten/Paletten, alle Farbrollen und bestätigtes Ersetzen eigener Farben integrieren | GF103, GF104 | TC-F61-01..04 |
| GF106 | Moderne Designbereichsauswahl und sechs vollständige Designerbereiche möglichst 1:1 integrieren | GF103, GF105 | TC-F60-01..03, TC-F63-03 |
| GF107 | Gemeinsame Aktionsbereiche mit denselben Draft-/Bild-/Revisionszuständen integrieren | GF103, GF105 | TC-F62-01..03 |
| GF108 | Mobile Kopfzeile, Daten-/Filterklappe, Liste/Einzelartikel samt Vorheriger/Nächster und Resize/Fokus integrieren | GF107 | TC-F63-01..03 |
| GF109 | Vollständige Funktions-, Daten-/Bild-/Gestaltungsroundtrips und visuelle Referenzabnahme auf Pflichtansichten; Generator-/Syntax-/Diffprüfung; Dokumentation | GF104, GF106, GF108 | TC-F60-01..TC-F64-03, TC-F58-01 |
| GF110 | Erst nach vollständiger Abnahme committen/pushen, PR #15 aktualisieren und Deployment des tatsächlichen Commits schreibfrei verifizieren; keine Produktion | GF109, GF100 | TC-F59-01, TC-F64-03 |

Keine Aufgabe durch reine Mockup-Prüfungen oder vorhandene Controls als
erledigt markieren. GF100/GF101 bleiben bis zu ihren echten Nachweisen offen.

Visuelle Nacharbeit innerhalb GF103/GF105-GF109: zuerst mobile Farbzeilen,
doppelte Hexanzeigen und Panelbesitz reproduzieren; dann gemeinsame Hülle,
alle sechs Werkzeugbereiche, Aktionskarten/Hauptnavigation/Zielselect und
echte Ausgabegruppen vervollständigen. TC-F60-03 und TC-F62-02 prüfen
sichtbare Inhalte statt nur den aktiven Reiter. Funktions- und Sichtabnahme
sind getrennte Abschlussbedingungen.

### Abschlussnachweise der Mockup-Nacharbeit

- Globale Designer-/Palettensuite: **29/29** auf vier Pflichtansichten,
  einschließlich Originalpixeln, Zieltrennung, Dialogtransaktionen,
  Initialvorschau, Vergrößerung und echter Namens-/Lupen-Hitbereiche.
  Die enthaltene Sichtmatrix erzeugt 204 Aufnahmen aller sechs Bereiche
  und verfügbaren Reiter auf sechs Bildschirmgrößen; das sind keine
  204 zusätzlichen bestandenen Tests.
- Desktop-Gesamtregression: **151/156** im Gesamtlauf. Die fünf alten
  UI-Zugriffspfade/Inventurannahmen wurden migriert und anschließend
  vollständig grün nachgeprüft: **12/12** für Desktop und iPad mini.
  Die neue Inventur erlaubt zusätzliche Farbrollen, verlangt aber weiterhin
  jeden ursprünglichen Key und eindeutige Feldkennungen.
- Responsive Aktionskernfälle: **83/84** im Vieransichtenlauf; der eine
  ResizeObserver-Wettlauf im Testhelfer wurde durch Warten auf die sichtbare
  Bedienvariante behoben. Der zugehörige Panel-/Zielvertrag ist danach
  **4/4** grün. Keine Panel- oder Datenassertion entfernt.
- Zusätzliche mobile/Ladentablet-Nachprüfung der migrierten Vorlagen-,
  Preisbild-, Bildnachlade- und Kompaktheitsverträge: **12/12** grün.
  Direkte Plakat-/Flyerwerkzeuge einschließlich Speichern und Undo:
  **8/8** auf vier Ansichten grün.
- Python-Angebots-/API-Verträge: **81/81** grün. CMS-Funktionsabgleich ohne
  Fehlstellen, Generator per Hashvergleich idempotent, JS-Syntax und
  Diff-Hygiene erfolgreich.
- Feldgenaue GF102-Inventur und Aktions-Daten-/Handlermatrix stehen im Plan.
  Originalrenderer, zusätzliche Bestandsfelder, zehn freie Stilfamilien
  und die vier Homepage-Werkzeugreiter bleiben erhalten. Daher können
  vollständige Paletten/Feldlisten auf dem Telefon weiterhin Scrollen
  benötigen; Eingaben, Motiv und Geteilt bleiben ausdrücklich wählbar.

Damit sind die lokalen Integrations- und Abnahmegates GF100/GF102–GF109
nachgewiesen. GF101/GF110 erfordern zusätzlich Commit, Push und die
schreibfreie Prüfung des tatsächlich ausgelieferten PR-Commits.

Reproduzierbare Hauptbefehle:

```text
node tools/test-lauf.js schnell angebote-flyer.spec.js cms-angebote-ablauf.spec.js
node tools/test-lauf.js schnell --alle-ansichten angebote-paletten.spec.js
node tools/test-lauf.js schnell --alle-ansichten cms-angebote-ablauf.spec.js --grep "TC-F42-|TC-F58-|TC-F62-|TC-F63-|TC-F19-|TC-F60-|TC-F61-"
python -m unittest discover -s tests -p "test_angebote*.py"
node tools/pruef-cms-abgleich.js
```

### Ausdrücklich freigegebene Zwischenveröffentlichung

Der Nutzer hat einen Zwischenstand auf PR #15 angefordert. Dieser darf nach
gezielter Prüfung veröffentlicht werden, ohne GF109/GF110 oder die
Gesamtabnahme als abgeschlossen zu markieren. Produktion bleibt unverändert.
Der Stand enthält die gemeinsame Entwurfsbearbeitung, mobile Artikelliste,
Preisschildstruktur, kleinere Vorschaugriffe und die globalen Stil-/Paletten-
Designer. Zum damaligen Zwischenstand waren die Paletten-Clickintegration im Aktionseditor sowie die vollständige
visuelle Referenzabnahme und restlichen F64-Nachweise sind noch offen.
Die Preview verwendet weiterhin echte gemeinsame Dataverse-Angebote; reales
Speichern und Löschen ist kein isolierter Test.

Prüfung dieses eingefrorenen Zwischenstands: 53 Desktop-CMS-/Palettenfälle,
24 gezielte Fälle auf allen vier Ansichten und 50 Python-Angebotsverträge
bestanden. Alle geänderten JavaScriptdateien sind syntaktisch gültig;
CMS-Funktionsabgleich ohne Fehlstellen, Generator per Hashvergleich idempotent
und `git diff --check` erfolgreich. Das ersetzt keine vollständige GF109-Abnahme.

### Integrationsnachweise 18.11.2026

- Parent: TC-F42-01, TC-F62-01 und TC-F63-01 zusammen 16 Fälle auf allen vier
  Pflichtansichten bestanden; gemeinsamer Entwurf/Editor-Bridge und mobile Liste.
- Parent: TC-F62-02 (Speicherkonflikt) auf allen vier Ansichten bestanden;
  kein Überschreiben des fremden Stands und kein Verlust des aktuellen Entwurfs.
- Parent: TC-F19-01/-03/-04 sowie TC-F19-06 auf vier Ansichten bestanden;
  TC-F19-06 enthält echtes adaptives 1280→320-Resize, kleinere sichtbare Griffe
  bei erhaltenen transparenten Maus-/Touch-Treffflächen und Tastaturalternativen.
- Stil-/Palettenagent: 50 Pythonfälle einschließlich aller neun
  CMS-Legacy-/Zusatzfarbroundtrips bestanden. Neun fokussierte Playwrightfälle
  (ein Modell-/Pixelvertrag und zwei UI-Verträge in vier Ansichten) bestanden;
  sechs echte Designer, Palettenbestätigung, Undo/Redo, Speichern/Reload und
  getrennte Wochenplanfarben einschließlich Schwarz/Verläufen.
- Die abschließende Gesamtintegration/visuelle Abnahme und Veröffentlichung
  sind damit ausdrücklich noch nicht als erledigt markiert.

Spec: [spec.md](./spec.md), Plan: [plan.md](./plan.md).
Status wird in den Session-Todos geführt, Abnahme nur anhand der Testfälle.

| ID | Arbeit | Abhängigkeit | Testfälle |
|---|---|---|---|
| GF94 | Kompakte Hülle, adaptive Typografie, Eingabenpriorität, vollständige Navigation und Ansichtswahl integrieren; echte 32-px-Mausaktionen und 44-px-Touchziele ohne Breitenersatz messen | GF86, GF87 | TC-F52-02, TC-F52-04..05 |
| GF95 | Vollständige transaktionale Schrift-/Preisschild-/Bildfenster mit echter mobiler Kachelvorschau und unverändertem Dirty-/Undo-/Redo-Zustand bei Abbruch integrieren | GF94 | TC-F52-01, TC-F54-01 |
| GF96 | Begrenzte Herkunftsbasis, Kontextanzeige, gezieltes Rücksetzen und ausdrücklich bestätigte aktuelle Vorgaben ergänzen | GF95 | TC-F53-01..02 |
| GF97 | Geladenen Dataverse-Revisionsstand serverseitig vergleichen; eindeutige Status-/Konflikt-/Verlassensmeldungen in beiden Speicherwegen anbinden | GF94 | TC-F55-01..02 |
| GF98 | Daten-/Rendererprüfung mit getrennten Hinweisen und direkter Auswahl der Fehlerstelle integrieren | GF95, GF96 | TC-F56-01 |
| GF99 | Dataverse-Aktion ohne Write duplizieren und ausgewählte Gestaltungseigenschaften auf ausdrücklich gewählte Kacheln übertragen | GF96 | TC-F57-01..02 |
| GF100 | Funktionsübernahmematrix, F46–F51 und vollständigen Roundtrip beider Arten auf vier Ansichten abnehmen; Anwenderhilfe nachführen | GF92, GF93, GF95, GF96, GF97, GF98, GF99 | TC-F58-01, TC-F46-01..TC-F57-02 |
| GF101 | Geprüften vollständigen Stand normal committen/pushen; PR-Preview-Deployment und schreibfreie Erreichbarkeit verifizieren | GF100 | TC-F59-01 |
| GF89 | Waage auf native Zielgestaltung statt A4-Einzelflyer umstellen und Bearbeitungsgruppen standardmäßig öffnen | GF87 | TC-F47-01..02 |
| GF86 | Gemeinsame kompakte Aktionen, echte Hinweishilfen, kontrastreiche Arbeitsbereiche und zugänglichen Splitter für Standarddesigner integrieren | GF85 | TC-F46-01..02, TC-F46-04 |
| GF87 | Gespeicherte Aktionsvorschau und Angebotserstellung auf denselben Arbeitsrahmen mit ausgelagerten Werkzeugen und rechter Bildfläche übertragen; weitere Design-/Erfassungsseiten prüfen | GF86 | TC-F46-03..04 |
| GF92 | Erste echte Plakatkachel direkt bedienen und Namensgruppe mit Schrift, Größe und Farbe in Originalvorlagen konfigurieren | GF90 | TC-F50-01..02 |
| GF93 | Reiterunabhängiges Vollbild in Designhülle und Angebots-Arbeitsbereichen sichtbar anbieten | GF87 | TC-F51-01 |
| GF91 | Zentrale Preisschildvorgaben einschließlich Rot/Gelb unabhängig von Gesamtvorlage auswählen, austauschen und speichern | GF89 | TC-F49-01..03 |
| GF90 | Zusatztext unter Bezeichnung gruppieren, normalgroß und semibold; alle Ziele sowie Vorschau/Export prüfen | GF89 | TC-F48-01..02 |
| GF88 | Tatsächliche 50-%-Arbeitsflächen, Splitter, Kontraste und Speicher-/Bilderregression auf vier Ansichten abnehmen und Feature-Preview veröffentlichen | GF86, GF87, GF89, GF90, GF91, GF92, GF93, GF100 | TC-F46-01..04, TC-F47-01..02, TC-F48-01..02, TC-F49-01..03, TC-F50-01..02, TC-F51-01 |
| GF85 | Aktionsvorschau-Raster für alle Ausgabeziele rechts anordnen; Desktop-/Tabletzuordnungen und mobilen Bestand mit tatsächlicher Geometrie, Werkzeug- und Speicherregression prüfen; Bedienhilfe aktualisieren | GF83 | TC-F45-01..02, TC-F19-01..04, TC-F31-01..02 |
| GF82 | Feste Designnavigation für alle Reiter, bildreine rechte Vorschau, linke Werkzeuge mit eigenem Aktionsbereich, Einpassen/Zoom/Vollbild und kompakte erreichbare Infohilfen integrieren | GF81 | TC-F43-01..04 |
| GF84 | Direkten Vorschaueditor für Plakat/Einzelflyer mit echten Renderer-Geometrien, getrennten Standardanpassungen und unverändertem explizitem Speichern anbinden | GF82 | TC-F44-01..03 |
| GF83 | Vieransichten-Geometrie und echte Werkzeug-/Speicherregression abnehmen, Generator/Parität und Bedienhilfe prüfen | GF82, GF84 | TC-F43-01..04, TC-F44-01..03, TC-F38-02, TC-F39-01..04, TC-F40-01..03 |
| GF73 | Gemeinsame Designer-Arbeitsfläche mit fünf Werkzeugreitern und verlustfreien CMS-Adaptern integrieren | GF72 | TC-F38-01..02 |
| GF76 | Lokales Undo/Redo in alle Standarddesigner integrieren und Aktionsdesigner-Toolbar vervollständigen; Gesten und getrennte Ausgaben testen | GF73 | TC-F39-01..04 |
| GF77 | Preisbildziffern mit lokal lizenzierter Schmalschrift und engeren Cent originalnäher rendern; Fontbereitschaft und Ausgaben prüfen | GF73 | TC-F38-04 |
| GF78 | Bild-/Preisposition abhängig vom verfügbaren Platz kompakt nebeneinander anordnen; breite und schmale Container prüfen | GF73 | TC-F38-07 |
| GF79 | HP-Sonderangebote auf gemeinsame Arbeitsfläche übertragen, echte Artikel-/Bildvorschau anbinden und zusätzliche Produktbildschatten entfernen | GF76 | TC-F40-01..04 |
| GF80 | Getränkedesigner mit echten Vorschauartikeln und Produktbildern samt Fehler-/Leerzustand ergänzen; Designspeicherung getrennt halten | GF73 | TC-F41-01..03 |
| GF81 | Freigegebenen gemeinsamen Erfassungsdialog mit dauerhaft sichtbaren Werten, Bildmenü und unverdeckter Artikelauswahl integrieren; Bildverträge und vier Viewports abnehmen | GF80 | TC-F42-01..03 |
| GF74 | Einzelflyer-Bildnachladen, Rot/Gelb-Preisbild mit fünf Farben, initial eingeklappte Vorlagen und unabhängiges Vorschau-Scrollen; Reiter-/Speicherregression und Vieransichtenlayout abnehmen; Hilfe und Generator prüfen | GF73 | TC-F38-01..06 |
| GF75 | Änderungen committen, PR aktualisieren und ausschließlich Feature-Preview deployen; live read-only prüfen | GF74, GF76, GF77, GF78, GF79, GF80, GF81 | TC-F38-01..07, TC-F39-01..04, TC-F40-01..04, TC-F41-01..03, TC-F42-01..03, Preview-Smoke |
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
| GF63 | Gestaltungsmodus: Einstellungen neben der Vorschau (3 Spalten, Reiter bis 1000 px, Handy mit fester Aktionsleiste); Funktionsparität in vier Zielen | GF62 | TC-F31-01, TC-F31-02 |
| GF64 | Reiter Plakat/Einzelflyer im Stil des Getränkeflyers (Quelle cms-klassisch.html, cms-neu.css, Generator, Abgleichwächter); Preview bereitstellen | GF63 | TC-F32-01, TC-F32-02 |
| GF65 | Designstandard-Designer auf erste Musterkachel begrenzen; Änderungen über bestehende Anpassungsschlüssel für alle Rasterplätze synchronisieren; Altstände und Dichtewechsel vereinheitlichen; Hilfe aktualisieren | GF64 | TC-F33-01, TC-F33-02 |
| GF66 | Additive Preisbildvorlage mit hochgestellten Cent, weißer Kontur und gelbem, rot durchgestrichenem Stattpreis in Modell, API und allen Getränkeausgaben ergänzen; Randfälle und UI prüfen | GF65 | TC-F34-01, TC-F34-02 |
| GF67 | Zusätzliche Dekorations-, Farb-, Form-, Verlaufs- und Positionsoptionen für Getränke ergänzen; eigene versionierte Designvorlagen und Verwerfen; Renderer-, UI- und API-Parität gezielt prüfen | GF66 | TC-F35-01, TC-F35-02, TC-F35-03 |
| GF68 | Versionierte umgebungsgetrennte HP-Einstellungen und öffentliche Projektion; bestehende CMS-Controls wirksam anbinden | GF67 | TC-F36-01, TC-F36-04 |
| GF69 | Kompakte Homepage nach Mockup mit gemeinsamer CMS-Vorschau, Originalausgaben erhalten und vier Viewports prüfen | GF68 | TC-F36-02, TC-F36-03 |
| GF70 | Offene responsive F31/F32-Lücken und Generatorquellen schließen; idempotente CMS-Ausgaben erzeugen | GF64, GF68 | TC-F31-01..02, TC-F32-01..02 |
| GF71 | Explizite Testzuordnung, asynchroner lokaler Server, Fehlerbehandlung und gezielte Testbefehle fertigstellen | GF67 | TC-F37-01..02 |
| GF72 | Gezielte Abnahme F31-F37, Hilfe und Regression; Commit/PR #15/Feature-Preview mit read-only Nachweis, kein main-Merge | GF69, GF70, GF71 | TC-F31-01..TC-F37-02, Preview-Smoke |
# Folgeauftrag F65-F69

| Aufgabe | Abhaengigkeit | Testvertrag |
| --- | --- | --- |
| GF111 Herkunft und Standardquellen bereichsbezogen implementieren | F65-Spec/Plan | TC-F65-01..03 |
| GF112 Auswahltexte, Trefferreihenfolge und Scrollfokus beheben | F66-Spec/Plan | TC-F66-01..02, TC-F66-04 |
| GF113 Artikelpfeile und CMS-Workspacebreite korrigieren | F67-Spec/Plan | TC-F67-01..02 |
| GF114 Reine Ausgabe, zieltreuer Einzel-/Sammelauftrag | GF113 | TC-F68-01..03 |
| GF115 A4-Paginierung und echter Modal-PDF-Nachweis | GF114 | TC-F69-01 |
| GF116 Vier Ansichten, Bestandsregression und Bedienhilfe abnehmen | GF111..GF115, GF117..GF118 | TC-F65..F69 |
| GF117 Live-Rendering kontinuierlicher Eingaben erhalten | F66-Spec/Plan | TC-F66-03 |
| GF118 Responsive Fussleiste an Werkzeugbreite anpassen | F66-Spec/Plan | TC-F66-05 |

# Folgeauftrag F70: Motiv zuerst am Telefon

| Aufgabe | Abhaengigkeit | Testvertrag |
| --- | --- | --- |
| GF121 Motivleiste und aufschiebbares Werkzeugblatt im Telefon-Aktionseditor | F70-Spec | TC-F70-01..02 |
| GF122 Artikelsynchronisation Motivleiste/Blatt, Ausgabe-Tab unverändert | GF121 | TC-F70-03 |
| GF123 Schnellleiste (Element, Rückgängig, Verschieben, Größe, Drehen) mit Halten-Wiederholung, Proxy auf vorhandene Werkzeugknöpfe | GF121, F71-Spec | TC-F71-01..02 |
| GF124 Einzeilige Leiste mit „Mehr"; Blatt über vollem Arbeitsbereich, doppelte Artikelnavigation im Blatt entfällt | GF123 | TC-F70-01..03, TC-F71-02 |
| GF125 Reiterleiste oben, feste Hauptleiste (Rückgängig, Wiederholen, Artikel, Speichern, Ansicht), Kontext ins Blatt; „Mehr" entfällt | GF124 | TC-F70-01..03, TC-F71-01..03 |
| GF126 Touch: Antippen wählt, Ziehen scrollt, ✥-Griff verschiebt (beide Editoren) | GF123 | TC-F72-01 |
| GF127 Zurück-Taste: Editor und Blatt als Verlaufsebenen mit Rückfrage | GF125 | TC-F72-02 |
| GF128 Schnellleiste reserviert Scrollraum in der Vorschau (Enden erreichbar, Einpassen neben der Leiste) | GF125 | TC-F71-03 |

# Folgeauftrag F73: Gestaltung am Telefon ohne Reiterleiste

| Aufgabe | Abhaengigkeit | Testvertrag |
| --- | --- | --- |
| GF129 Reiterleiste und „Fertig" entfernen; durchscheinendes Overlay-Blatt Peek/Halb/Voll ohne Motivverkleinerung, Kopf und Zusammenfassung wie Mockup | GF125 | TC-F73-01, TC-F73-05 |
| GF130 Element, Marker und Stil im Blatt; Artikelfelder nur in Artikel/Bilder; Chips Schrift/Preisschild/Bild an vorhandene Eigenschaftenfenster anbinden | GF129 | TC-F73-02, TC-F73-03b, TC-F73-04 |
| GF131 Kontext und Vorlagen ins Blatt statt Ziel-Popup; platzneutraler Zoom; Zurueck-Ebenen erhalten | GF129 | TC-F73-03, TC-F73-05 |
| GF132 Testhelfer showTab/openSheet und TC-F70/F71/F72 auf das neue Blatt umstellen | GF129..GF131 | TC-F70..F73 |

Abgenommen: Globale Designer F65/F66 17/17 und CMS-Aktionseditor F65–F69 (Einzel-/Sammelausgabe, PNG, Navigation, Live) jeweils auf den vier Pflichtansichten grün; API-Provenienz (`test_angebote.py`) grün. Der echte Scrollbalken-Test läuft nur Desktop/iPad (Headless-Einschränkung).

F73-Nachfreigabe lokal geprueft: CMS-Angebotsablauf 173/173 auf Desktop,
Telefon und Laden-Tablet sowie 42/42 Layouttests bei 768x1024.
Objektblatt-Footer und Android-Zurueck zusaetzlich in allen vier Projekten
geprueft. Dies ist kein Live-Deploymentnachweis.

# Folgeauftrag F74: Mobile Aktionsnavigation

| Aufgabe | Abhängigkeit | Testvertrag |
| --- | --- | --- |
| GF133 Kartenaktionen einzeilig, Lucide-Symbole und zugängliche Namen; Text nach Kartenbreite | F74-Spec/Plan, Mockup-Freigabe | TC-F74-01 |
| GF134 Erfassungskopf mit aktiver Beschriftung und rechter Daten-/Schließen-Gruppe | GF133 | TC-F74-02, TC-F63-01, TC-F62-02 |
| GF135 Doppelte mobile Zielauswahl aus Gestaltung entfernen, Ausgabeziel erhalten | F74-Nachfreigabe | TC-F74-03, TC-F72-02, TC-F73-03b/05 |
| GF137 Vorlagenauswahl verbreitern und gleich hohen Standardknopf zweizeilig setzen | F74-Nachfreigabe | TC-F74-04 |
| GF136 Vier Zielansichten, Touch und Bestandsregression prüfen; freigegebenen Stand bereitstellen | GF133, GF134, GF135, GF137 | TC-F74-01..04 |

F74 lokal abgenommen: CMS-Angebotsablauf 228/228 auf Desktop, Telefon,
Laden-Tablet und Touch-iPad. Kartenaktionen, aktive Bereichsbeschriftung,
Zielerhalt und Vorlagenzeile bestehen einschließlich Browser-Zurück.
Alle zehn Getränkefelder passen weiterhin ab 360x640 vollständig in den
Arbeitsraum; die Eingabeflächen bleiben mindestens 44 px hoch.
Browser-Zurück emuliert Android-Zurück; kein physisches Androidgerät getestet.
Die Feature-Preview besteht 17/17 fokussierte Abnahmetests mit vollständig
gemockter API; sechs ausgelieferte HTML-/CSS-/JS-Dateien stimmen bytegenau
mit dem Feature-Commit überein. Der Größenwechsel-Test wartet vor dem
Metadaten-Klick auf den mobilen Erfassungsmodus, damit ein ausstehendes
Media-Query-Ereignis den Zustand nicht zwischen Lesen und Klicken umschaltet.
Der iPad-Start mit anschließendem Größenwechsel besteht fünf Wiederholungen.
