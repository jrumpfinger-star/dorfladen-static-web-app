# Inventur-Mockup — Spezifikation

**Status:** Funktionsbeschreibung ausdrücklich bestätigt; Umsetzung freigegeben  
**Stand:** 2026-11-20  
**Funktionsbeschreibung:** [inventur-funktionen.md](../inventur-funktionen.md)

## Überblick

Klickbarer Vanilla-HTML/CSS/JS-Entwurf unter
`mockups/inventur-mockup.html` als Grundlage für eine spätere Inventur-Web-App.
Er bildet die deklarierte bestehende PowerApps-App ab, verwendet jedoch nur
synthetische Daten im Arbeitsspeicher. Jeder Speicherhinweis benennt diese
lokale Wirkung.

Grundlagen: [Konstitution](../../.specify/memory/constitution.md),
[UI-Standard](../../docs/ui-designstandard.md),
[Konventionen](../conventions.md) und
[gemeinsame Tokens](../../static-site/css/dl-design.css).
Der UI-Standard und die Konstitution bestimmen die vier Zielansichten;
abweichende ältere Ansichtsmaße in den Konventionen sind hierfür nicht maßgeblich.

## Ziele und Nicht-Ziele

- Erfassung bei 375 × 667 CSS-px ohne Seitenscrollen.
- Alle nachfolgend zugeordneten Felder und Aktionen erhalten.
- Suchtreffer und lange Inventurlisten dürfen intern scrollen.
- Keine Produktivroute `/inventur`, Daten-/Rollenintegration, Kamera,
  Dataverse-Aufrufe, echten Schreibzugriffe, Deployment oder Veröffentlichung.
- Keine erfundenen Lösch-, Export-, Auswertungs-, Inventurpositionslisten-
  oder Abschlussfunktionen. Statusänderung ist keine Abschlussautomatik.

## Bestandsgrundlage und ausdrücklich bestätigte Präzisierungen

Der lokale PAC-Export der früheren Sitzung wurde gelesen. Quellen:
`Src/App.pa.yaml`, `Src/Screen1.pa.yaml`, `References/DataSources.json`.
Es gibt einen fachlichen Screen mit Erfassung und Settings. Export und
Connector-Metadaten bleiben außerhalb des Repositorys.

Die Quelle enthält deklarative Regeln, nicht den Nachweis aller tatsächlichen
PowerApps-Laufzeiteffekte. Folgende Präzisierungen wurden ausdrücklich bestätigt:

- Barcode-Simulation ohne Kamera; Zustand ausschließlich im Arbeitsspeicher.
- Automatisches Speichern bei bestätigter Feldänderung/Verlassen beibehalten.
- Optionale Ganzzahl-Menge innerhalb der exportierten Integer-Grenzen;
  keine neue Positivregel.
- Leere Menge bleibt leer, Plus ohne Basis rechnet mit 0.
- Ungültige Zahlen, Dezimalwerte und Grenzüberlauf verständlich ablehnen.
- Plus nach erfolgreicher Buchung leeren; jede Buchung genau einmal ausführen.
- Bei Inventurwechsel die Position aus der Zielinventur neu laden.

Es wurde keine Zusammenlegung oder Entfernung von Funktionen freigegeben.

## Anforderungen und Testfälle

### F1: Einstieg und Navigation

**Eingaben:** Menü, Bereichsauswahl.  
**Verhalten:** Start in Erfassung. Das schließbare Menü bietet Erfassung und
Settings. Bereichswechsel erhält lokale fachliche Daten und Verwaltungsentwürfe.
Titel und eindeutige Mockup-Kennzeichnung bleiben sichtbar.

- **TC-F1-01:** Neu laden → Erfassung und Demo-Kennzeichnung sichtbar;
  Menü öffnen, Settings wählen und zurück → richtiger Bereich, Menü geschlossen.
- **TC-F1-02:** Verwaltungsentwurf ändern, Bereich wechseln und zurück →
  Entwurf erhalten, nicht automatisch gespeichert.

### F2: Inventurkontext

**Eingaben:** ausgewählte Inventur.  
**Verhalten:** Nur Status `aktiv` erscheint in der Erfassungsauswahl; erste
aktive Inventur ist Startvorgabe. Name, Jahr und Startdatum bleiben zugänglich.
Ohne aktive Inventur klare Meldung und gesperrte Erfassung, keine Ersatzinventur.

- **TC-F2-01:** Mehrere aktive/geplante/abgeschlossene Beispiele →
  ausschließlich aktive wählbar, erste aktive vorausgewählt.
- **TC-F2-02:** Alle aktiven Inventuren in Settings umstellen →
  verständlicher Leerzustand, Mengenaktionen nicht ausführbar.

### F3: Artikelsuche

**Eingaben:** Suchtext oder Barcode, Ergebnisauswahl.  
**Verhalten:** Lokales Search-Feld entspricht Bezeichnung/Barcode; Sortierung
aufsteigend nach Search. Anzeige verwendet vollständige Gesamtbezeichnung.
Auswahl lädt Artikel und inventurspezifische Position und fokussiert Menge.
Mobil schließt die Trefferliste; ab 850 × 600 bzw. auf hohen Ansichten ab
600 × 900 bleibt sie als intern scrollender Arbeitsbereich sichtbar.
Desktop steht sie neben der Erfassung, auf hohen schmalen Ansichten darunter.
Diese platznutzende Bedienpräzisierung wurde ausdrücklich bestätigt.
Die Liste ist per Tastatur bedienbar.
Leere Trefferliste ist ein erklärter Zustand.

- **TC-F3-01:** Teilbezeichnung und Barcode suchen → passende sortierte Treffer;
  per Tastatur wählen → korrekter Artikel und Mengenfokus.
- **TC-F3-02:** Viele Treffer → intern zum letzten Treffer scrollen und auswählen,
  ohne Dokument-Scroll; unbekannter Suchtext → keine Scheinauswahl.

### F4: Simulierter Barcode-Scanner

**Eingaben:** Barcode-Aktion, manuell/automatisch, Demo-Ergebnis.  
**Verhalten:** Benannter Scanner-Dialog ohne Kamera. Beide Originalmodi wirken:
manuell Demo-Ergebnis wählen und bestätigen; automatisch ein bereitgestelltes
Demo-Ergebnis direkt übernehmen. Bei mehreren Demo-Barcodes zählt der erste.
Unbekannter Barcode zeigt die verständliche Warnung, setzt die Erfassung zurück
und ermöglicht erneutes Scannen. Scannerabbruch verändert keine Daten.

- **TC-F4-01:** Beide Modi mit bekanntem Barcode → korrekter Artikel;
  mehrere Ergebnisse → erster Barcode entscheidet.
- **TC-F4-02:** Unbekannter Barcode → Warnung, keine nutzbare Mengenerfassung;
  erneut gültig scannen → Erfassung wieder bedienbar. Abbruch bleibt wirkungslos.

### F5: Artikel, Preise und Positionsmodus

**Eingaben:** ausgewählter Artikel und vorhandene Position.  
**Verhalten:** Bezeichnung, Barcode, separate EK-/VK-Anzeige und Einheit bleiben
lesbar. Neue Position startet mit leerer Menge. Bestehende Position lädt Menge
und Positions-EK. Neuer EK ist `letzterEK`; bei `letzterEK = 0` gilt
`VK / (MwStKz = 9 ? 1,07 : 1,19) × 0,67`. Anzeige als Euro mit zwei
Nachkommastellen; gespeicherter EK folgt der exportierten Dezimalpräzision 2.
VK bleibt der aktuelle Artikel-VK. Kennzeichen `0` heißt Stück, `3` Gramm.
Andere Kennzeichen werden nicht stillschweigend umgedeutet; klare Meldung,
keine scheinbar unterstützte Erfassung.

- **TC-F5-01:** Neue Artikel mit letztem EK und beiden Ersatzsteuerpfaden →
  erwartete EK-/VK-Werte; Stück/Gramm richtig beschriftet, Menge leer.
- **TC-F5-02:** Bestehende Position mit abweichendem Positions-EK →
  ursprünglicher Positions-EK und Menge erhalten.
- **TC-F5-03:** Unbekanntes Mengenkennzeichen → erklärter nicht unterstützter
  Zustand, keine falsche Einheit.

### F6: Menge und Zahlenvertrag

**Eingaben:** Menge und Plus als getrennte Felder.  
**Verhalten:** Menge optional, ganzzahlig, einschließlich 0 und negativer Werte.
Bereich −2.147.483.648 bis 2.147.483.647 gilt für eingegebene und resultierende
Menge. Plus ist eine ganzzahlige Differenz, negative Korrekturen zulässig.
Leere Basis ohne Plus bleibt leer; Plus bei leerer Basis addiert zu 0.
Leeres Plus bedeutet keine Differenz. Keine Artikel-/Inventurauswahl sperrt
Felder und Aktionen mit verständlichem Grund. Keine stille Rundung,
Teilverarbeitung ungültiger Strings oder Erfolgsmeldung bei ungültigen Werten.

- **TC-F6-01:** Leer, 0, negative Menge und beide Grenzen speichern →
  exakt erwartete lokale Werte.
- **TC-F6-02:** Dezimalwert, Text oder Überlauf eingeben →
  verständliche Meldung, vorherige Position unverändert.
- **TC-F6-03:** Plus bei leerer Basis und negative Differenz →
  richtige Summe; Überlauf durch Addition wird abgelehnt.

### F7: Lokales Speichern und Hinzufügen

**Eingaben:** bestätigte Feldänderung/Verlassen, Speichern, Hinzufügen.  
**Verhalten:** Nicht pro Tastendruck speichern. Bestätigte Änderung und die
beiden eigenständigen Aktionen verwenden denselben Commit: validieren,
Menge + Plus genau einmal speichern, Position neu laden, Plus leeren,
lokale Rückmeldung. Blur und nachfolgender Klick dürfen keine doppelte
Buchung auslösen. Unveränderte Aktion bucht nichts erneut.
Nach Erfolg Scanner-Modus fokussieren. Häkchen nur ohne ungespeicherte
Erfassungsänderung und bei Menge > 0; andere erfolgreiche Werte erhalten
trotzdem den verständlichen lokalen Speicherstatus.

- **TC-F7-01:** Menge ändern und verlassen → lokale Position geändert;
  explizite Speichern-/Hinzufügen-Aktion ebenfalls wirksam.
- **TC-F7-02:** Plus ändern, anschließend Hinzufügen klicken →
  nur eine Addition, Plus leer; erneuter Klick und Artikel-Rückkehr addieren
  nicht nochmals.
- **TC-F7-03:** Dirty/gespeichert/0/negative Menge →
  Häkchen genau nach Originalbedingung, Status und Fokus korrekt.

### F8: Verdeckte Daten und Inventurwechsel

**Eingaben:** Artikel-/Inventurwechsel, lokale Position.  
**Verhalten:** InventurKey, Artikel-Stamm-Referenz, Mengenerfassung,
Inventur-Referenz und Artikelnummer bleiben im Positionsmodell erhalten.
InventurKey bleibt `Inventurname + "-" + Artikel[Strichcode]`.
`Strichcode` für Lookup und `Artikel[Strichcode]` für Schlüssel/Artikelnummer
werden als getrennte Quellfelder erhalten, auch wenn Beispieldaten sie gleich
belegen. Keine Umstellung auf ID-Schlüssel. Zielinventurwechsel lädt deren
Position oder leere neue Menge; keine fremde Menge übernehmen.
Namenskollisionen/Umbenennungsmigration nicht stillschweigend reparieren.

- **TC-F8-01:** Position speichern → sämtliche Referenzen/Quellwerte und
  zusammengesetzter Schlüssel korrekt.
- **TC-F8-02:** Gleichen Artikel in zwei aktiven Inventuren mit verschiedenen
  Mengen auswählen/ändern → getrennte Positionen, keine Vermischung.

### F9: Inventurverwaltung

**Eingaben:** Liste, Neu, Editieren, Name, Jahr, Startdatum, Status, Speichern.  
**Verhalten:** Liste mit Name/Jahr/Startdatum/Status intern scrollbar.
Neu startet ein Formular, Detailzugang bearbeitet den ausgewählten Datensatz.
Name ist Pflicht (exportierte Maximallänge 850 Zeichen); Jahr optionaler Text
(maximal 4000 Zeichen), kein erfundener Jahreszahlenzwang.
Startdatum optional; vorhandene versteckte Stunden/Minuten bleiben bei
Bearbeitung erhalten. Status optional mit exakt `geplant`, `aktiv`,
`abgeschlossen`. Kein zusätzliches Statusregelwerk.
Explizit lokal speichern; bei Entwurf sichtbar bzw. eindeutig aktiv,
ohne Änderungen keine Scheinbuchung. Hintergrund-Daten ändern sich nicht
allein durch Eingaben. Erfassungsauswahl folgt gespeichertem Aktivstatus.

- **TC-F9-01:** Neu mit Pflichtname und optionalen Angaben lokal speichern →
  Listeneintrag vorhanden; leerer Name → Meldung und keine Speicherung.
- **TC-F9-02:** Bestehenden Eintrag mit textuellem Jahr/Status bearbeiten →
  gespeicherte Werte und Aktivfilter korrekt, Uhrzeit unverändert.
- **TC-F9-03:** Lange Liste bis zum letzten Eintrag intern scrollen →
  Detailzugang und Speicheraktion erreichbar.

### F10: Gestaltung, Rückmeldungen und Accessibility

**Eingaben:** Touch/Tastatur, Themenwechsel, Systempräferenzen.  
**Verhalten:** Gemeinsame Tokens und Lucide-Konvention, keine zweite
Seitenstilfamilie. Systemschrift Gewicht 400/600; wesentliche mobile Texte
mindestens 16 px, Metadaten mindestens 13 px. Touch-Ziele mindestens
44 × 44 px, Regelwert 48 px; präzise Mausaktionen entsprechend UI-Standard.
Normale Textkontraste mindestens 4,5:1, relevante Grenzen/Icons mindestens 3:1.
Hell/Dunkel, forced-colors und reduzierte Bewegung berücksichtigen.
Dialoge benannt, Fokus geführt, Escape schließt oberste Ebene, Rückkehrfokus
zum Auslöser, Hintergrund während modaler Bedienung gesperrt.
Keine nativen alert/confirm und keine technischen/englischen Fehlermeldungen.

- **TC-F10-01:** Scanner/Fehlerdialog mit Tastatur öffnen und schließen →
  Name, Fokusführung, Escape und Rückkehrfokus korrekt.
- **TC-F10-02:** Hell/Dunkel und forced-colors → kritische Felder/Aktionen
  lesbar; Kontrast und tatsächliche Touch-Flächen geprüft.

### F11: Geometrie und isolierter Demo-Betrieb

**Eingaben:** Viewport, lange Inhalte, Reload.  
**Verhalten:** Vier Zielansichten 375 × 667, 768 × 1024, 1280 × 800,
686 × 1095 CSS-px. Kein horizontaler Dokumentüberlauf. Erfassung ohne
vertikalen Seitenscroll; Pflichtfelder und Aktionen sichtbar und klickbar,
nicht nur durch overflow abgeschnitten. Listen intern scrollbar.
Tatsächlich nutzbare Eingabe-/Listenfläche mindestens 50 % sichtbarer
Fensterhöhe; Ziel 70 % auf kleinen und 80 % auf großen Ansichten.
Beim Tastaturzustand fokussiertes Feld und zugehörige Aktion erreichbar;
Viewport-Verkleinerung ist kein Ersatz für reale Mobilbrowser-Prüfung.
Nur synthetische Daten im Speicher, Reload setzt sie zurück. Kein
fetch/XHR, Formular-POST, Dataverse, Telemetrie, Service Worker oder
Browser-Persistenz. Statische Styles/Icons dürfen geladen werden; keine
App-Daten an externe Ressourcen übermitteln.

- **TC-F11-01:** Alle vier Ansichten mit Artikel, Suchtreffern, langen
  Bezeichnungen und Speicher-/Fehlerzuständen → Dokumentmaße, Rechtecke,
  Trefferprüfung und Arbeitsflächenanteile bestehen.
- **TC-F11-02:** Lange Suche-/Inventurliste bedienen → interner Scrollfortschritt
  und auswählbarer letzter Eintrag, Dokument bleibt stehen.
- **TC-F11-03:** Lokale Mengen/Inventuren ändern, Netz-/Storage-Nachweis und
  Reload → keine Schreibrequests/Persistenz, ursprünglicher Beispielstand.
- **TC-F11-04:** Reduzierte sichtbare Höhe automatisiert und reale
  Mobilbrowser-Tastatur manuell prüfen → Feld/Aktion erreichbar; fehlende
  reale Prüfung ausdrücklich als nicht verifiziert ausweisen.

### F12: Handy-Vorschau am PC

**Bestätigter Nutzerwunsch:** Der Mockup soll am PC direkt im Handyformat
erscheinen, nicht automatisch als Desktop-Fachansicht.

**Verhalten:** Ab 850 px Browserbreite startet der normale Mockup-Aufruf in
einer beschrifteten Handy-Vorschau mit echter 375 × 667 CSS-px Inhaltsfläche.
Optional ist ein höheres Handyformat 384 × 832 wählbar, ohne es einem
unbestätigten Samsung-Modell zuzuordnen. Keine verkleinernde CSS-Skalierung.
Ein separater Link öffnet die responsive Fachansicht mit `?ansicht=app`.
Auf schmalen Geräten bleibt der normale Aufruf direkt responsiv.
Eine iframe-Vorschau enthält dieselbe lokale Demo, keine zweite Implementierung.
Nur die Vorschauhülle am PC darf bei unzureichender Fensterhöhe scrollen;
die Erfassung innerhalb der Handyansicht bleibt seitenscrollfrei.

- **TC-F12-01:** Normaler Desktop-Aufruf → benannter Vorschau-Frame mit
  375 × 667 Inhalt; Artikel wählen, Menge/Plus bedienen, kein innerer
  Dokumentüberlauf. Formatwechsel → 384 × 832, keine Datenänderung.
- **TC-F12-02:** Direkter Fachansicht-Aufruf auf Desktop und normaler
  Aufruf auf Handy → keine Vorschauhülle, responsive Erfassung.

## Daten und Verträge

| Lokales Modell | Quellwerte |
| --- | --- |
| Inventur | Referenz-ID, Name, Jahr als Text, optionales Startdatum samt Zeit, optionaler Status |
| Artikel | Referenz-ID, Gesamtbezeichnung/Search, Artikelbezeichnung, Strichcode, Artikel[Strichcode], VK, letzterEK, MwStKz, Mengenerfassung |
| Position | InventurKey, Artikel-/Inventur-Referenz, Artikelnummer, Mengenerfassung, optionale Menge, EK mit Präzision 2 |
| UI-Zustand | Bereich, aktive Inventur, ausgewählter Artikel, getrennte Menge/Plus, Scan-Modus, Verwaltungsentwurf, Dirty-/Speicherstatus |

Beispieldaten enthalten mehrere aktive Inventuren, geplante/abgeschlossene
Inventuren, Stück/Gramm, beide EK-Ersatzpfade, bestehende Positions-EKs,
leere/0/negative Mengen und viele lange Such-/Listeneinträge.
Keine Kopie realer Datensätze oder Connector-Metadaten.

## Vollständige Bestandszuordnung

| Original-Control / Feldgruppe | Zuordnung | TC-Nachweise |
| --- | --- | --- |
| App.OnStart, colTabData, var_show; IconCancel1, Container Menü, TabList1/Name1 | Start, Menü, zwei Bereiche; Reihenfolge erhalten | F1 |
| RectQuickActionBar1, LblAppName1 | Kompakter stationärer Header, Titel Inventur | F1, F11 |
| InventurAuswahl; Inventur1/Jahr1/Startdatum1 | Aktivauswahl samt Metadaten | F2, F8 |
| ComboBox2: DisplayFields, Items, SearchFields, OnChange | Suche, Sortierung, Auswahl-/Lookup-Regeln | F3, F5 |
| Toggle1, BarcodeReader1: OnScan/ScanningMode/Quality | Zwei Simulationsmodi; erster Barcode; Hardwarequalität nicht als geprüft behaupten | F4 |
| Form3: New/Edit, Item, Visible, OnSuccess | Neue/bestehende Position, Erfassungsbereich, lokales Feedback | F5, F7 |
| DataCard1/TextCanvas2/TextCanvas7 | Bezeichnung und Barcode | F5, F11 |
| EK-Preis_DataCard1, DataCardValue14/TextCanvas5 | Nur lesbarer EK und gespeicherter Wert | F5 |
| DataCard4/TextCanvas4/DataCardKey16_1 | Separater aktueller VK | F5 |
| Menge_DataCard1, DataCardValue15, TextCanvas3 | Menge, OnChange, Update, Einheit, Sperrzustand | F6, F7 |
| DataCard2/IconSave | Separate Speicheraktion, Dirty-State, Fokusfolge | F7 |
| DataCard3/TextCanvas6/NumberInput1, DataCard5/IconAdd | Separates Plus und Hinzufügen | F6, F7 |
| Icon2 | Häkchenbedingung | F7 |
| InventurKey_DataCard2/DataCardValue11 | Zusammengesetzter Schlüssel, verborgen | F8 |
| Artikel-Stamm_DataCard1/DataCardValue12 | Artikelreferenz, verborgen | F8 |
| Mengenerfassung_DataCard1/DataCardValue1 | Erfassungskennzeichen, verborgen | F8 |
| Inventur_DataCard2/DataCardValue6 | Inventurreferenz, verborgen | F8 |
| Artikelnummer_DataCard1/DataCardValue8 | Artikel[Strichcode], verborgen | F8 |
| Container Setting, Form Inventur, var_record | Eigener Verwaltungsbereich und Entwurf | F1, F9 |
| Gallery1, Title2/Title2_1/TextCanvas1/TextCanvas1_1 | Name/Jahr/Datum/Status, Auswahlmarkierung | F9 |
| NextArrow2; Zeilen-/Auswahlcontrols | Bearbeiten, Auswahlzugang; keine Datenänderung durch Auswahl | F9 |
| Icon_Add/Icon_Store | Neu und explizites Speichern bei Änderungen | F9 |
| Inventur-, Jahr-, Startdatum-, Status-DataCards | Vier vollständige Verwaltungsfelder | F9 |
| DateValue2/HourValue2/MinuteValue2 | Datum bearbeiten, verborgene Zeit erhalten | F9 |
| Feldlabels, Pflichtsterne, ErrorMessage-Controls | Beschriftungen, Pflichtname und zugängliche Fehlermeldungen | F6, F9, F10 |
| Rein dekorative Separatoren, Füllungen, Radien und feste Koordinaten | Gemeinsame responsive Gestaltung statt Originalgeometrie; keine fachliche Funktion entfällt | F10, F11 |

Die TC-Nachweise in dieser Tabelle beziehen sich auf die Testfälle des
gleichnamigen F-Abschnitts. Original-Icons und nichtdeutsche Meldungen werden
an den verbindlichen Design-/Meldungsstandard angepasst.

## Offene Fragen und Traceability

Keine offenen fachlichen Entscheidungsmarker für den vereinbarten Mockup.
Reale Scannerhardware, Dataverse-Latenz/Parallelität, Namenskollisionen und
Migration bleiben außerhalb dieses Entwurfs, nicht stillschweigend gelöst.
Die Funktionsbeschreibung benötigt vor der Plan-Stufe ausdrückliche Bestätigung.

Jeder F-Abschnitt enthält verbindliche TC-IDs. SDD-Plan und Tasks müssen diese
IDs vollständig zuordnen. Ein Task ist erst nach bestandenen zugehörigen
automatisierten Nachweisen erledigt; reale Tastaturprüfung wird getrennt
ausgewiesen und nie durch einen simulierten Test als erledigt behauptet.
