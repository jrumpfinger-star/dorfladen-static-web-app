# Umsetzung: Angebote und Getränkeflyer

Spec: [spec.md](./spec.md). Status: zur Implementierung.

## Constitution

Spec/Testfälle vorhanden, keine offenen Klärungsmarker. Eigener Feature-Worktree,
keine Secrets im Repository, keine fremden Assets. Bestehende Vanilla-JS-,
Azure-Functions- und Playwright-Struktur beibehalten. Vier Viewports testen.

## Gemeinsamer Mockup-Umbau F60–F64

UI möglichst 1:1 nach der jeweils zuletzt freigegebenen Referenz, ohne
Funktionsverlust. Reihenfolge: Spezifikation, dieser Architekturplan,
zugeordnete Aufgaben, dann Anwendungscode. Keine neue parallele Anwendung.

### Übernahme- und Besitzmatrix

| Bestand | Weiterer Besitzer / Integration | Erhaltener Vertrag / Abnahme |
| --- | --- | --- |
| `AngeboteDesign.definitions`: Vorlage/Dichte, Schrift/Farben, Größen/Drehung | Vorhandene Controls in sechs Designerbereichen; Einzelwerte direkt | Jeder Datenkey bleibt erreichbar; TC-F60-01 |
| Preisschild: Form/Preset, Preis-/Stattpreis-/Kontur-/Strichfarben, Radius/Neigung/Größe/Offsets, Stattpreisschrift/-größe/-strich | Ein transaktionaler Dialog; ursprüngliche Nodes samt Handler zurückstellen | Übernehmen als ein Schritt, Abbruch erhält Zustand; TC-F60-02 |
| Dekoration: Blatt/Tasche/Textur, Rahmen/Kartenrahmen und Farben | Weitere Gestaltung, vorhandene Settings | Kein pauschales Ausblenden anderer Eigenschaften; TC-F60-01 |
| Hintergründe: Seite/Bild, Verläufe/Zweitfarben/Richtung/Stopp/Bildbreite/Offsets | Bestehende Farbcontrols plus Palette als ausdrückliche Sammeländerung | Exakte Bestandswerte und Vererbung; TC-F61-01/04 |
| Template-Registry und freie Layouts | Familien-/Variantenadapter auf bestehende IDs; keine Lade-Migration | 6/10 Familien, 7 Wochenplanlayouts, XL/eckige Kacheln erhalten; TC-F61-01/02 |
| CMS `tplColors`, `wpTplColors`, Zieloverrides | Derselbe Lade-/Speicherpfad, Farbrollenadapter | Keine heimliche Geometrieänderung oder fremdes Ziel überschreiben; TC-F61-03/04 |
| Artikelstamm/Suche/manuelle Erfassung, Preise/Volumen/Gebinde/Pfand | `cms-angebote.js` / `cms-angebote-form.js`; bestehende Row-Nodes | Cent/Milliliter, kein Stamm-VK-Write; TC-F62-01 |
| Bilder: Suche/Datei/Paste/Entfernen/Pending/Wiederholen | Bestehende Bildzustände und SharePoint-/Dataverseadapter | Keine verlorenen Uploads oder falscher Erfolg; TC-F62-01 |
| Aktionsübersicht/Filter/Duplizieren/Löschen und Feature-Altbestand | Bestehender CMS-Einstieg; neue Hülle und Aktionsnavigation | Bestandsaktionen und Bestätigungen erhalten; TC-F62-02/03 |
| Save/Reload/Revisionskonflikte/Verlassen | Vorhandene tatsächliche API-Aufrufe und Dirty-Zustände | Keine neue Persistenz und kein Save bei Tabwechsel; TC-F62-01/02 |
| Vier Ausgabeziele, bedingte Marker, Element/Artikel/Vorlage/Ansicht/Ausgabe | Bestehende Editor-/Rendereradapter | Ziel-/Artikelisolierung, Historie; TC-F62-02, TC-F64-01 |
| Vorschau: Auswahl/Verschieben/Skalieren/Drehen/Ghost/Duplikat/Bilder/Reset/Transfer | Vorhandener Vorschaueditor, Inspector und Overlay-Handler | Keine statische Ersatzvorschau; TC-F64-02 |
| Eigene Vorlagen, Splitter, Zoom, Vollbild, Qualitätsprüfung, Export/Print/Teilen/Waage | Bestehende Tools hinter neuer Navigation | Originalpfade, echte Bestätigungen/Qualitätsfehler; TC-F60-01, TC-F64-02/03 |

Vor-/Nachher-Abnahme über vollständige Datenkey-/Handlerinventur und vorhandene
fachliche Tests ergänzen; diese gruppierte Matrix erlaubt keine Auslassungen.

### Architektur und Dateien

- `angebote-design.js`: gemeinsame Controls, Feldbesitz und restaurierte
  Sichtbarkeit; Stil-/Palettenadapter; moderne Bereichsauswahl und sechs Tabs.
  Keine Feldkopien mit divergierenden Handlern.
- `angebote-modell.js` / `wochenangebote-renderer.js`: bestehende IDs und
  Originalrenderer erhalten; explizite Farbrollen für Palette und Zusatzfarben.
  Beim Laden nichts schreiben. Stil/Palette/Variante getrennt behandeln.
- `cms.js` / `cms-klassisch.html`: zielbezogene Markerkeys mit generischem
  Read/Write abstimmen, Ereignis-/Vererbungs- und Previewpfade erhalten;
  Wochenplanpalette je Homepage/Druck. Nur direkt erforderliche Änderungen.
- `cms-angebote.js`, `cms-angebote-form.js`, `angebote-editor.js`: gemeinsame
  Aktionsnavigation und Draftübergabe ohne Daten-/Pendingbildverlust.
  Mobile Listen-/Einzelartikelansicht nutzt dieselben Formularnodes.
- `angebote.css`: gemeinsame Dichte/Raster/Dialoge, Höhe und Bedienart
  berücksichtigen; eine mobile Kopfzeile. Hohes Ladentablet gesondert.
- CMS aus `tools/build-cms-neu.js` generieren, Funktionserhaltung mit
  `tools/pruef-cms-abgleich.js`, zweiter Generatorlauf unverändert.
- Bestehende Playwrightdateien erweitern, Testzuordnung aktuell halten;
  echte UI-/Pixel-/Roundtripabnahme auf vier Pflichtansichten plus kleinen
  und kurzen Fenstern. Keine abgeschwächten fachlichen Tests.

### Stil-/Palettenadapter und Aktionsintegration (F61)

`AngeboteModel.styleFamilies` ordnet alte IDs nur lesend sechs globalen bzw.
zehn freien Familien zu. `modern-mag-xl` bleibt echte Bildgeometrie,
`land`/`classic` bleiben getrennt. Das Preisbild ist ein separates
Preisschildpreset. Die acht freigegebenen Paletten besitzen nur Farbwerte;
Markerpalette, Form, Dichte, Bildmaße, Schrift und Verlaufsgeometrie werden
nicht durch die Sammeländerung ersetzt.

Öffentliche Integrations-API in `AngeboteDesign` (kein zusätzliches Skript):

- `controls(layout)` enthält `paletteControls(layout)` mit Buttons
  `[data-offer-palette]` (Wert = Paletten-ID).
- `await applyPalette(layout, id)` bestätigt eigene Farben über `M.dialog`,
  mutiert ausschließlich das übergebene Layout und liefert bei Abbruch
  `false`, sonst `true`. Kein Speichern und kein eigener Historieneintrag.
- Der RootEditor-Clickhandler muss den **aktuellen State `data`** verwenden:
  zunächst `draft = M.clone(M.styleOf(data.layout, target))`, dann
  `await applyPalette(draft, id)`. Nur bei `true` für `sheet` die Farbwerte
  übernehmen, für andere Ziele `M.setTargetStyle(data.layout, target, ...)`
  ausführen; anschließend vorhandenen Template-/Preview-Refresh und genau
  einen Historieneintrag auslösen. Beim Abbruch darf kein `target_styles`
  angelegt werden. Eine Referenz auf einen früheren State ist nicht gültig.
- `change(layout, input)` verarbeitet `data-style="family"` und `"variant"`
  zusätzlich zu den unveränderten bisherigen Feldern; Stilwechsel benutzt
  `M.useStyle`, nicht das farbersetzende Original-Reset `M.useTemplate`.
- `previewChoices(host, layout, kind)` synchronisiert Familie, Variante,
  Bestands-/Eigene-Farbenanzeige und Palette nach Undo/Redo/Zielwechsel.
- `palettePicker(host, {read, map, defaults, write, changed})` bindet die
  globalen CMS-/Wochenplan-/Homepagefelder an dieselbe Palettenauswahl.
  `write` darf nur bestehende Farbfelder ändern, `changed` verwendet die
  jeweilige bestehende Historie/Vorschau. Keine zweite Persistenz.

Zusätzliche optionale Farbrollen in CMS-`tplColors` laufen über
`getOfferTheme` bzw. die bestehenden Preisfelder; ohne diese Rollen bleiben
alle Legacy-Pixel unverändert. Freie Layouts speichern entsprechende
`decoration`-Farben mit derselben API-Validierung wie bestehende Farben.
`M.registerImage(id, dataUrl)` bleibt unverändert öffentlich.

### Integrierter Preisschilddialog

Neu bestätigte Griffdarstellung (TC-F19-06 / TC-F60-04): Der Vorschaueditor berechnet
sichtbare Dreh-/Skaliergriffe relativ zur gerenderten Kachel. Sichtbare
Markierung und transparente Trefferfläche bleiben getrennt; Touchziele
mindestens 44 px sowie sämtliche Zahlen-/Tastaturalternativen bleiben erhalten.
Die gemeinsame Griff-API wird vom vorhandenen Originalrenderer-Overlay und
vom Aktionseditor verwendet, nicht durch eine zweite Demoauswahl ersetzt.

Die drei Mockupbereiche „Vorlage & Form“, „Farben“ (Preis/Schild und
Stattpreis) sowie „Größe & Ausrichtung“ nehmen alle tatsächlichen Felder
auf, auch zusätzliche Schriften, Größen und Positionsregler des Bestands.
Die ursprünglichen Feldnodes und Listener bleiben erhalten; temporäre
Hexanzeigen werden beim Schließen entfernt. Transaktionen und
Herkunftsrücksetzen verwenden unverändert die vorhandenen Besitzer.
Der Vorschauausschnitt stammt auch auf Desktop aus dem echten Canvas,
nicht aus dem SVG-Demopreisschild des Mockups.

Notwendige responsive Abweichung: Touchziele bleiben mindestens 44 px
statt der teils kleineren Mockup-Farbfelder. Auf kleinen/kurzen Fenstern
scrollt deshalb nur der Eigenschaftsbereich; Kopf, echte Vorschau und
Abbrechen/Übernehmen bleiben sichtbar. Kein Weglassen zusätzlicher
Eigenschaften zugunsten einer künstlichen Ein-Bildschirm-Abnahme.

### Rolloutgate

SDD und alle zugeordneten TC-Fälle müssen vor Fertigmeldung nachgewiesen sein.
GF100/GF101 bleiben bis zu ihren tatsächlichen Abnahmen offen. Nach grünem
Gesamtstand normal committen/pushen und PR #15 aktualisieren. Nur die zugehörige
Feature-Preview schreibfrei prüfen, niemals main/Produktion oder echte
Dataverse-/SharePoint-/Waagen-Schreibtests in der Preview.

## Entscheidungen

## Produktverbesserungen F52–F59

### Constitution Check

Spezifikation ohne offene Klärungsmarker, bestehende Vanilla-JS-/Python-
Architektur, keine neuen Dienste/Secrets/Dataverse-Tabellen. Vier Zielansichten,
isolierte Schreibtests und ausschließlich PR-Preview. Benutzer hat den Erhalt
der Sichtbarkeitslogik sowie die kompakte Anwendungsübernahme bestätigt.

### Technical Approach und Architektur

Gemeinsame Komponenten in `angebote-design.js` statt parallelem UI-System:
Ansichtswahl/Splitter, kompakte Objekt-Zusammenfassungen und native modale
Eigenschaften. Vorhandene Controls samt IDs und Listenern verschieben statt
kopieren. Dialoge bleiben im zuständigen Root und damit im Vollbildcontainer.
Während einer Transaktion bestehende Preview-Ereignisse weiterreichen, aber
Historien-/Dirty-Änderungen bis zur Bestätigung puffern; bei Abbruch den
gesamten vorherigen fachlichen und Historienstand restaurieren.

Die erneute Layoutkorrektur fasst die vorhandene Bereichsnavigation über
native Auswahlen zusammen, behält die ursprünglichen Handler und sämtliche
Ziele bei und stellt mobil die Eingaben ohne Miniatur-Split in den Vordergrund.
Die Aktionsleiste bleibt erreichbar; die separate Motivansicht bietet immer
einen Rückweg. Werkzeugauswahl orientiert sich an der tatsächlichen Spaltenbreite.
Für präzise Mausbedienung ab 600 CSS-px erhalten einzeilige Arbeitsaktionen
und kompakte Auswahlzeilen eine tatsächliche Höhe von 32 px; gemeinsame
CSS-Dichtetokens steuern auch ihre Zeilen. Telefone und Grobzeiger behalten
44 px Trefferhöhe. Native Radios ersetzen die großen 4/6-Kacheln, während
die Auswahlsemantik und Bedienung vollständig erhalten bleiben.
Abnahme: TC-F52-04/05, einschließlich tatsächlicher Rechtecke statt
einer bloß kleineren Buttonfüllung.

Das Modell kapselt eingefrorene Herkunftsbasen, gezielte Objektübertragung,
Duplizieren mit neuer ID-Zuordnung und Qualitätsbefunde. Herkunftsbasis enthält
nur Gestaltung, keine zweite Kopie von Produktbildern oder Artikeldaten.
Bestehende Layouts ohne Basis werden explizit als gespeicherte Gestaltung
bezeichnet. Aktuelle Vorgaben nur auf ausdrückliche Anforderung laden.

Dataverse behält seine bestehenden atomaren Changesets und If-Matchs.
Zusätzlicher Revisionsvergleich zwischen gelesenem und aktuellem Stand
schließt die bisherige Lücke vor dem Changeset: gleiche Artikel-IDs allein
erkennen zwischenzeitliche Inhaltsänderungen nicht. Verglichen werden alle
Artikel und der zugehörige Layoutstand. Kein automatischer Konflikt-Retry.

### Key Decisions

| Entscheidung | Wahl und Grund |
| --- | --- |
| Speicher-/Publikationslogik | Bestehende Dataverse-/Feature-Verträge getrennt erhalten; keine zusätzliche Freigabe erfinden |
| Vorschau | Echte vorhandene Canvas-Ausgabe plus Kachelausschnitt, kein zweiter vereinfachter Renderer |
| Modalität | Native Dialoge mit transaktionalen Historienadaptern und festen Footeraktionen |
| Vorlagen | Eingefrorene Gestaltungsbasis; Altbestand ohne fingierte Vererbung |
| Mehrfachübertragung | Explizite Eigenschaften und Zielartikel, ein Undo-Schritt; keine Preise oder Bildzuordnungen |
| Qualitätscheck | Bestehende Pflichtdaten-/Rendererfehler wiederverwenden, optionale Bild-/Kontrasthinweise getrennt |

### File-Level Change Map

| Pfad | Änderung | Zweck |
| --- | --- | --- |
| `static-site/js/angebote-design.js` | ergänzen | Gemeinsame kompakte Hülle, Sichtbarkeit/Ansichten, Objektfenster, Transaktionen |
| `static-site/css/angebote.css` | ergänzen | Systemtypografie, dichte Felder, responsive Raster und Dialoge nach gemeinsamem Schema |
| `static-site/js/angebote-modell.js` | ergänzen | Quellenbasis, Übertragung/Duplizierung, gezielte Qualitätsbefunde und gleiche Ausgabe |
| `static-site/js/angebote-dataverse.js` | ergänzen | Revisionsstand und korrekter gespeicherter Status; keine geänderte Sichtbarkeitslogik |
| `static-site/js/cms-angebote.js` | ergänzen | Duplizieren ohne Write, Erfassungsstatus, Verlassensschutz und Fehlerfokus |
| `static-site/js/angebote-editor.js` | ergänzen | Kontext, Herkunft, Dialogadapter, Mehrfachübertragung, Qualitätsprüfung, Speicherstatus |
| `static-site/cms.js` | ergänzen | Getrennte Standarddesigner-Adapter, Dirty-/Historienrestaurierung |
| `api/angebote/__init__.py` | ergänzen | Geladenen Revisionsstand liefern und vor atomaren Änderungen vergleichen |
| `api/shared/angebote.py` | ergänzen | Begrenzter rückwärtskompatibler Herkunftsvertrag |
| `tests/cms-angebote-ablauf.spec.js` | ergänzen | Isolierter Roundtrip, Kopien, Zustände, Konflikte |
| `tests/angebote-flyer.spec.js` | ergänzen | Echte Renderer-/Fenster-/Ziel-/Historienparität |
| `tests/test_angebote_dataverse_actions.py` | ergänzen | Same-ID-Inhaltskonflikte ohne echten Datenzugriff |
| `tests/test_angebote.py` | ergänzen | Herkunftsvalidierung und Roundtrip |
| `docs/ui-designstandard.md` und vorhandene Anwenderhilfe | nachführen | Freigegebene Bedienung und korrekte Speichersemantik |
| CMS-Generatorquellen/-ausgaben | bei nötiger Markupänderung generieren | Keine manuellen Abweichungen zwischen CMS-Varianten |

### Vorher-/Nachher-Übernahmematrix

| Vorhandene Funktion/Eigenschaften | Erhaltener Zielort | Prüfung |
| --- | --- | --- |
| Name, Zusatz, Preise, Menge/Gebinde/Pfand, Kennungen | Direkte Artikelzeilen/Erfassung | F42, TC-F58-01 |
| Artikelsuche, Stamm-VK, EAN, Bildsuche/Datei/Paste/Entfernen | Erfassung und bestehendes Bildmenü | F42, TC-F57-01, TC-F58-01 |
| Gesamtvorlagen, Dichte, eigene Vorlagen, Hintergründe/Dekoration | Vorlagen-/Weitere-Gestaltung-Reiter | F35/F38, TC-F52-01 |
| Schriftart/-größe/-farbe, Namen/Zusatz, Textausrichtung | Objektfenster Schrift; übrige Textwerte erhalten | F48/F50, TC-F52-01 |
| Preisschildvorgaben inkl. Rot/Gelb, alle Farben/Form/Rundung/Neigung/Größe | Objektfenster Preisschild | F49, TC-F52-01 |
| Bildposition/Skalierung/Drehung, Ghost, Duplikat/Kopien, eigenes Bild und Reset | Bildobjektfenster und vorhandene Direktwerkzeuge | F27/F44, TC-F52-01 |
| Freie Texte/Flächen/Logo, Ebenen, Sichtbarkeit, Transparenz, genaue Positionen | Vorhandene Element-/Weitere-Gestaltung-Werkzeuge | F3/F27, TC-F58-01 |
| Erste echte Musterkachel, Ziehen/Skalieren/Drehen, Tastatur-/Touchäquivalente | Tatsächliche Motivfläche plus Eigenschaften | F44/F50, TC-F58-01 |
| Vier getrennte Zielgestaltungen, native Waage | Zielwahl, jeweilige echte Vorschau/Export | F23/F47, TC-F58-01 |
| Undo/Redo, Speichern, Verwerfen, Standards übernehmen | Gemeinsame feste Aktionen; Objektübernahme ersetzt Speichern nicht | F39/F55, TC-F52-01 |
| Einpassen/Zoom/Splitter/Vollbild | Ansichtssteuerung, sichtbarer Vollbildknopf | F43/F51, TC-F52-02 |
| Druck/Teilen/Waage, Ausgabeprofile, Fehlerrückmeldung | Bestehender Ausgabereiter plus Qualitätsprüfung | F6/F56, TC-F58-01 |
| Alte Feature-Entwürfe/Freigaben, Dataverse-Aktionen, Kundenansicht | Bestehende getrennte Datenwege | F4/F18/F55, TC-F58-01 |

### Test Strategy

- Unit: Vorhandenes `unittest` für Angebots- und Dataverse-Verträge; Ausgangsbasis
  76 Tests erfolgreich. Kein zusätzliches pytest erforderlich.
- Integration: Vorhandene Playwright-Specs mit vollständig abgefangenen
  API-Schreibwegen und lokalem Static-Server; alle vier Viewports.
- TC-F52-01/02 und TC-F54-01: tatsächliche Dialog-/Feld-/Canvas-Geometrie,
  Tastatur/Fokus, Live-Pixel, Cancel/Apply/Undo/Redo und Vollbild.
- TC-F53-01/02: Quellenbasis, Altbestand, getrennte Ziele und Wiederöffnung.
- TC-F55-01/02: tatsächliche Statusübergänge und zwei geladene Revisionen;
  API-Prüfung vor Changeset und UI-Erhalt nach 409.
- TC-F56-01: konkrete Daten-/Renderfehler sowie getrennte Hinweise/Fehlerfokus.
- TC-F57-01/02: Kopie ohne Write, ID-/Layoutzuordnung und selektive Übertragung.
- TC-F58-01: vollständiger Erfassungs-/Gestaltungs-/Speicher-/Ausgaberoundtrip
  plus Regression der offenen F46–F51 und Übernahmematrix.
- TC-F59-01: normale Branchveröffentlichung, Workflowerfolg und schreibfreie
  Previewprüfung des tatsächlichen Commitstands.

### Risks & Mitigations

| Risiko | Gegenmaßnahme |
| --- | --- |
| Preview teilt produktives Dataverse | Tests lokal mit Mocks; live ausschließlich lesen |
| Verschobene Controls verlieren Listener | Vorhandene Nodes und Rootdelegation erhalten; Matrix-/Ereignistests |
| Popup-Abbruch beschädigt Redo/Dirty | Ganze Transaktion sichern und exakt restaurieren |
| Vorlagenherkunft im Altbestand unbekannt | Ehrlicher Zustand ohne erfundene Basis oder automatische Migration |
| Neue Revisionsprüfung vs. alte Clients | Vertrag und alle abhängigen Aufrufer/isolierten Testdoubles gemeinsam ändern |

### Rollout

SDD zuerst, danach geordnete Umsetzung und gezielte Prüfungen. Keine
Veröffentlichung eines nur teilweise grünen Stands. Vorhandene Änderungen
F46–F51 erhalten und mitprüfen. Normaler Commit/Push auf bestehenden
Featurebranch, PR-Preview abwarten; keine Produktion und kein main-Merge.

F50: Bezeichnung/Zusatz in einem Originalrenderer-Helfer zeichnen und
echte Gruppenmetadaten liefern. Namensschrift, -größe, -farbe und direkte
Namens-Overrides in bestehende Konfigurations-/Snapshot-Verträge aufnehmen.
Native Zeigerbedienung der ersten Plakatkachel ausdrücklich prüfen.

F51: Vollbildschaltfläche außerhalb der scrollenden Werkzeugfelder
anbringen; vorhandene Fullscreen-API und explizite Fehleranzeige verwenden.
Gemeinsame Designhülle und Angebotswerkzeugleiste behalten ihre Zustände.

F49: Zentralen TAG_PRESETS-Vertrag wiederverwenden. Eigenständige,
validierte Preisschildwahl im Zielstil speichern; Altentwürfe mit
Gesamtvorlage `price-image` weiter lesen, explizite Vorgaben haben Vorrang.
Preisbild-Darstellung von der Gesamtvorlagenkennung entkoppeln;
keine neue Gesamtvorlage ergänzen. Backend-Vertrag und Roundtrip testen.

F48: Bezeichnung und Zusatztext gemeinsam im Namensbereich rendern,
normale Detailgröße mit Gewicht 600. Ein bisher separat gespeichertes
Beschreibungselement liefert nur die Detailtypografie, nicht eine
unabhängige Position. Renderer und Editor verwenden dieselbe Gruppen-
Geometrie; ursprüngliche Artikeldaten und Ausgabeziele erhalten.
Originalrenderer und kompakte Ausgaben entsprechend abgleichen.

F47: CMS-Originalrendering bleibt für Sammelflyer/Karte/Einzelflyer erhalten.
Das Waagenziel verwendet stattdessen den vorhandenen nativen Zielrenderer
und seine getrennten Elemente/Stile. Editor-Auswahl, Inspector und
Stiländerungen unterscheiden echte CMS-Ziele vom freien Waagenziel.
Bearbeitungsgruppen einmalig pro DOM-Knoten öffnen; Auswahl-/Aktionsmenüs
ausnehmen. Pixelvergleich gegen native Zielgestaltung und UI-Roundtrip prüfen.

F46: Gemeinsame, ansichtsbezogene Splitter-/Aktionsleistenhelfer in
`angebote-design.js` verwenden; keine zusätzliche Bibliothek oder
Persistenz. Bestehende DOM-Controls verschieben, IDs/Ereignisse erhalten.
Standarddesigner zeigen allgemeine Werkzeuge in einem eigenen Reiter,
nicht vor jedem aktiven Feldpanel. Speichern/Undo/Redo plus Aktionsmenü
ersetzen mehrzeilige Fußleisten. Der Hilfekonverter erfasst auch statische
`div.an-note`, lässt Status-/Fehler-/interaktive Inhalte intakt.
Vorschaudialog und freier Ersteller erhalten denselben zweispaltigen
Arbeitsrahmen; der wöchentliche Vorschaueditor trennt Bildhost und Tools
über den bestehenden `toolsHost`-Vertrag. ResizeObserver passt Motive
an verfügbare Fläche und verstellte Breite an. Messbare Mindestflächen
und Kontraste prüfen, statt nur DOM-Sichtbarkeit als UX-Nachweis zu nehmen.

F45: Die bestehenden CSS-Raster des Aktionsvorschaudialogs spiegeln:
bei freier Gestaltung Element-/Artikelbereich und Gestaltung links,
Motiv rechts; bei Original-Wochenvorlagen zusätzlich das innere
Inspektorraster spiegeln. Explizite Spaltenzuordnungen für Desktop und
schmale Tablets konsistent ändern, mobile Vertikalanordnung beibehalten.
DOM, Vorschaucontroller, Renderer und Speicherwege bleiben unverändert.
Bestehende Geometrieverträge auf die rechte Bildspalte aktualisieren;
echte Motiv-/Werkzeugrechtecke über alle Ausgabeziele und Einstiege messen.

F44: Plakat-/Einzelflyervorschau erhält den vorhandenen Vorschaueditor mit
echten `_elMeta`-Geometrien des Originalrenderers statt eines statischen
PNG-Bildes. Ausgabeweite Inline-Anpassungen werden als zwei getrennte
Objekte im bestehenden `design_config` gespeichert und vom gemeinsamen
Renderer vor vorhandenen Artikel-Overrides angewendet. CMS-UI-Lesen,
Anwenden, bestehende getrennte Historien und Snapshotvalidierung nehmen
die Objekte auf; weder neue Dataverse-Spalten noch Artikel-Override-Writes.
Vorschau-Rendertickets verhindern Überholen bei Gesten und Reiterwechseln.
Bestehende Bildnachlade-/Fehlerwege bleiben erhalten. Tests prüfen echte
Rendergeometrien, persistierte und verworfene Zustände sowie Altbestand.

F43: Gemeinsame `workspace()`-Hülle erhält links einen scrollbaren
Werkzeugkörper und einen separaten Aktionsbereich, rechts einen reinen
Bildviewport mit skalierbarem Inhalt. Bestehende Controls werden verschoben,
nicht kopiert; der Vorschaueditor bindet seine Werkzeugereignisse direkt
am Werkzeugknoten statt am gemeinsamen Bildhost. Geteilte CMS-Vorschauen
werden beim Reiterwechsel samt Werkzeugen und aktuellem Viewportadapter
in den passenden Designer übernommen. ResizeObserver passt Bildrahmen bei
Inhalts-, Fenster- und Reitergrößenänderungen ein; Zoom ist rein visuell
und verändert weder Design noch Undo. Vollbild verwendet die Workspace-Hülle
mit erreichbaren Werkzeugen und behandelt Fehler sichtbar.

Die gemeinsame CMS-Laufzeithülle gruppiert die vorhandene Designnavigation
in einer eigenen Kopfzeile, ohne Generatorquelle oder Feldkennungen zu ändern;
alle Haupt-/Unterreiter bekommen begrenzte Inhaltsbereiche mit korrektem
`min-height:0`. Statische Hilfen werden über einen gemeinsamen Helfer in
native, fensterbegrenzte Info-Popover umgewandelt; dynamische Status-/Fehler-
und Retryelemente bleiben links sichtbar. Wochenplan und gemeinsame
Einstellungen behalten ihre vorhandenen DOM-/Speicherwege, erhalten aber
ebenfalls bildreine rechte Vorschauflächen. CSS verwendet den tatsächlich
verfügbaren Bereich statt pauschal 220px abzuziehen. Mobile Anordnung mit
sichtbarer oberer Vorschau und darunter scrollbareren Werkzeugen.
Gezielte F43-Geometrie-, Tooltip- und Bedienregressionen sowie angepasste
F38/F40-Layoutverträge auf allen vier Ansichten; Generator-/Paritätsprüfung
und direkt zugehörige Bedienhilfe aktualisieren.

F42: Der gemeinsame Capture-Controller verschiebt die bestehenden Eingaben
und Bildaktionsknöpfe aus `CMSAngeboteForm.row()` in beschriftete Zeilen und
ein natives Popover am Vorschaubild; der klassische Formularrenderer bleibt
unverändert. Beschreibung und Getränkeangaben bilden eine dauerhaft sichtbare
zweite Zeile. Kachelwahl zieht in die Metadatenzeile. Gemeinsames CSS mit
Containerumbruch erhält breite Desktopspalten und schmale Touchbedienung.
Artikeltreffer und Bildmenü verwenden die native Popover-Top-Layer innerhalb
des modalen Dialogs, mit gemeinsamer fensterbegrenzter Positionierung am
Auslöser, Aufwärtsöffnung und Neupositionierung bei Scroll/Resize. Vorhandene
Zeilenbezüge und delegierte Bildaktionen bleiben erhalten; keine neuen APIs.
Neue Fälle in `cms-angebote-ablauf.spec.js` decken Feldgeometrie, echte
Such-/Upload-/Paste-Verträge und am unteren Dialogrand anklickbare Treffer
auf vier Viewports ab. Bestehende Bildtests öffnen zuvor das neue Menü.
Bedienhilfe aktualisieren, anschließend sämtliche offenen Designeränderungen
gezielt abnehmen und zusammen ausschließlich auf PR #15 veröffentlichen.

F41: Der Standarddesigner lädt höchstens sechs vorhandene Getränkeartikel
über `AngeboteDataverse.load()` und die vorhandenen Bildhelfer rein lesend.
Die Daten bleiben separat vom `design`-Objekt und seinem Undo-Verlauf.
`sample()` akzeptiert optionale Vorschauartikel, vergibt für wiederholte
Kacheln aber weiterhin eigene IDs. Eine sichtbare Hinweiszeile neben der
Vorschau benennt Quelle, Leerzustand oder Bildfehler und bietet bei Fehlern
erneutes Laden. Asynchrone Vorschaugeneration bleibt über vorhandene Tickets
gegen Überholen geschützt. Keine neuen Speicherfelder oder Uploads.

F40: `workspace()` akzeptiert optionale Reiternamen und richtet seine
Tastaturnavigation nach deren Anzahl aus. Ein kleiner HP-Adapter verschiebt
die vorhandenen vier Kartenkörper in die drei passenden Werkzeugreiter,
ohne Eingabefelder zu duplizieren. Er verwendet dieselbe Vorschau-, Speicher-
und Verlaufskomponente. `AngeboteKunden` stellt die aktuelle Wochenauswahl
als Vorschauartikel und seinen bestehenden Bildpainter bereit. Der Painter
kann zusätzlich vorhandene Artikelnummern über `AngeboteDataverse.findImage()`
auflösen; das ist eine lesende Suche, kein Upload. Der CMS-Controller lädt die
Vorschauartikel einmal mit sichtbarem Lade-/Fehler-/Leerzustand und rendert
Farbänderungen weiter synchron mit `homepageCard()`. Keine fiktiven Bildlinks,
keine zusätzlichen Datenmodelle oder neuen API-Verträge.
Der zusätzliche `drop-shadow` der alten Produktbildklasse entfällt in
`style.css`; die Homepage kapselt ihre Bilder zusätzlich mit `filter:none`.
Canvas-Produktbilder bleiben schattenfrei, vorhandene Karten-/Tag-Schatten
und ausdrücklich angelegte Bildkopien werden nicht verändert.

F39: Ein gemeinsamer lokaler Snapshot-Verlauf in `AngeboteDesign` bindet
Undo-/Redo-Buttons und zielgebundene Tastenkürzel. Er speichert maximal 30
Schritte und gruppiert Vorschaugesten über optionale begin/end-Hooks des
bestehenden Vorschaueditors. Im Getränkedesigner werden Designdaten ohne
Serverversion erfasst und über bestehende Feld-/Vorschauhelfer restauriert.
Der CMS-Adapter liest nur die betroffene Ausgabe aus `cfgReadUI()` und
restauriert sie über `cfgApplyUI()`, unter Erhalt der anderen Ausgabe und
deren Vorlagenfarben. Ereignisse werden nach bestehender Delegation erfasst;
reine Navigationsaktionen ändern keinen Snapshot. Der Aktionseditor behält
seinen vorhandenen Verlauf; Toolbar-Redo, Statusnachführung und scoped
Tastenkürzel schließen die Erreichbarkeitslücke. Keine Serverhistorie.

F38: `AngeboteDesign.workspace()` baut die gemeinsame Arbeitsfläche für alle
Designer. Das Rot/Gelb-Preisbild erhält die unveränderte OFL-Schrift Anton
als lokale Fontdatei mit Lizenz; ein gemeinsamer Promise-basierter Fontloader
wartet in allen asynchronen Render-Einstiegen vor dem Zeichnen auf die Datei.
Nur die großen Preisziffern wechseln die Schrift, die Cent rücken über den
Dezimalpunkt. Die bisherige Schrift der übrigen Inhalte bleibt erhalten.
Die Arbeitsfläche hat fünf Werkzeugreiter, Vorschau und Speicherleiste.
Bild-/Preisanker werden als zusammengehörige Gruppen mit einem automatisch
an der Containerbreite umbrechenden Raster angeordnet; bei genügend Platz
stehen sie nebeneinander statt untereinander. Die Bildbreite nutzt beide Spalten.
Der Getränkedesigner übergibt seine bestehenden Kontrollgruppen; der
CMS-Adapter verschiebt die Original-Eingabeknoten von Plakat/Einzelflyer in
dieselben Gruppen (keine Kopien oder neuen Datenmodelle). Die bisherige
Kartenstruktur wird dabei entfernt. Die Original-IDs, Delegationsaktionen,
Speicherwege und Renderer bleiben erhalten. Gemeinsame CSS-Regeln bestimmen
Desktop-/Tabletspalten und mobile Reihenfolge. Der Generator markiert nur
die moderne CMS-Fassung für diese Integration. `cfgSwitchSection()` aktiviert
den jeweiligen Adapter und die passende Live-Vorschau. Bildnachladen der
Einzelflyervorschauen verwendet einen gemeinsamen Helfer.
Rot/Gelb wird zusätzlich als `tagPreset`/`tagShape` im Originalrenderer
angeboten, nicht als Ersatz der neun Blattvorlagen. Fünf neue
ausgabegetrennte Farben werden über die bestehenden PERSEC-Mechanismen
gelesen/gespeichert und im Wochenaktions-Snapshot zugelassen.
Die eigentliche Preisbild-Zeichenfunktion wird vom Getränkemodell in den
gemeinsamen Wochenrenderer verlagert und von beiden Wegen wiederverwendet.
Alle vier Original-/Magazin-Zeichenzweige berücksichtigen die neue Preisform.
Der Vorlagenbereich erhält zusätzlich ein initial geschlossenes `details`
mit „Eigene Designvorlagen“ als Summary, gemeinsam für alle drei Designer.
Vorschau und Desktop-/Tabletwerkzeuge bekommen begrenzte Höhen,
`overflow-y: scroll`, `scrollbar-gutter: stable` und
`overscroll-behavior: contain`. Auf dem Handy begrenzt der Vorschaucontainer
statt der Zeichenfläche die Höhe; das Motiv behält sein Seitenverhältnis.
Ein echter Wheel-Test prüft Scrollpositionen von Vorschau und Dokument.
Gezielte F38-Layoutfälle auf vier Ansichten, Speicher-/Bildregression am
Desktop, Generatorabgleich und idempotente Erzeugung; ausschließlich
Feature-Preview veröffentlichen und read-only nachprüfen.

F31/F32: `cmsPreviewTools()` hängt `#an-design-options` direkt als Seitenpanel ein
(kein `details`). `D.controls()` kennzeichnet Bereiche mit `data-side-panel`
(`design`, `marker`); der Editor ergänzt Element/Artikel. Breite des CMS-Dialogs
steuert die Klasse `an-cms-cols` (≥ 1000 px, drei Spalten) bzw. `an-cms-tabs`
(Reiter Element · Artikel · Vorlage · Marker), die Reiterwahl bleibt im Editor-
Zustand. F32 ändert nur Markup-Titel/Reihenfolge in `cms-klassisch.html` und die
Darstellung in `cms-neu.css`; IDs und `data-action` bleiben (Wächter
`tools/pruef-cms-abgleich.js`), Generator `tools/build-cms-neu.js` erzeugt
`cms.html`/`cms-neu.html`. Keine API-Änderung.

F30: `an-defaults` im Editor ruft für Nicht-Sammelziele `applyTargetStyleToAll`
statt `applyTargetTemplate` (nur gewählter Artikel) auf und übernimmt nur die
Feinverschiebungen des gewählten Ziels aus den Designstandards; Verschiebungen
anderer Ziele bleiben. Dialogtext angepasst, Hinweis in `angebote-design.js`.
Keine API-Änderung. Betroffen: `angebote-editor.js`, `angebote-design.js`,
Editor-Tests, Anwenderhilfe.

F29: Der gemeinsame Kundenadapter fügt die Flyer-Werkzeuge in die vorhandene
`.ang-week-nav` ein; Kundenansichten ohne Wochenleiste behalten den bisherigen
Werkzeugcontainer. Die mobile Zeitraumanzeige zieht in dieselbe Leiste um.
Gezielte Regeln in `angebote.css` richten die Aktion rechts aus und wechseln
bei schmaler Breite auf ein kompaktes Zweispaltenraster. Mehrfachauswahl,
Wochenfilter und Original-Viewer werden wiederverwendet. Keine API-Änderung.
Betroffen: `angebote-kunden.js`, `index.html`, `angebote.css`, Kundenansicht-
Tests und Anwenderhilfe.

F21: `paintCards` rendert mit der Option „halbfett“. `fitted`/`renderElements`
wählen dann Gewicht 600 mit Systemschriftstapel; der Original-Wochenrenderer
erhält `opts.semibold` und ersetzt dafür Schriftsetzungen (bold/600–900) am
Zeichenkontext. Ohne Option bleibt alles unverändert.

F20: Neue Stilkennungen `half-red`, `half-green`, `half-blue` (Flag `half`) sowie `tag-red`, `tag-green`,
`tag-blue` (Flag `tag`, Aufteilung der Originalkachel mit gedrehtem Preisschild)
in `templateStyles`. Sammelflyer-Kacheln und die Zielgestaltungen
(Kachel, Einzelflyer, Waage) erhalten je einen eigenen Zweig mit festen
Koordinaten: bei `half` Bildbreite = halbe Flächenbreite, rechte Textspalte, volles
Preisband; bei `tag` Bildfläche über die volle Breite mit überlappendem Preisschild. Die Originalvorlagenauswahl der CMS-Wochenangebote filtert `half`
heraus, weil deren Renderer nur die Originalvorlagen kennt. Die Serverliste
`TEMPLATES` wird um die drei Kennungen erweitert. Keine Datenmigration.
F18-Korrektur Speichern/Meldungen: Neue Artikel werden mit der vom Client
vergebenen GUID als Dataverse-Primärschlüssel angelegt, sodass Zeilen-,
Layout- und Bildbezüge stabil bleiben und `original_ids` nach dem Speichern
übereinstimmen. Der Client übernimmt die in der Antwort gelieferten
gespeicherten Kennungen. Fehler der Aktions-API werden nach Status in
verständliches Deutsch übersetzt. Globale Seitenresets dürfen den automatischen
Dialogrand nicht entfernen: `.an-dialog`/`.an-viewer` erhalten `margin:auto`.

F19: Nur die Aktionsvorschau erhält einen höhenbegrenzten Arbeitsbereich
mit unabhängig scrollbar bedienbarer Seitenleiste und eingepasstem Motiv.
Bestehende Artikel- und Gestaltungseingaben wiederverwenden. Der gemeinsame
Wochen-Vorschaubearbeiter kann seine Werkzeuge in dieselbe Seitenleiste
einsetzen; seine Original-Zeichenfunktionen bleiben unverändert.
Aufklappende Werkzeuge im Pointer-Pfad entfernen: sie verschieben bisher
die Zeichenfläche beim Auswählen. Auswahl unmittelbar aktualisieren und
Drehgriffe für native sowie originale Wochen-Elemente ergänzen.
Transformationen verwenden bestehende Layout-/Override-Daten und Historie.
Gezielte Playwright-Tests messen echte Pointer-Bewegungen, unveränderte
Canvas-Position beim Werkzeugscrollen und Speicherung auf vier Viewports.
Betroffen: Angebote-Editor, gemeinsamer Vorschau-Editor, Angebote-CSS,
bestehende UI-Tests und Anwenderhilfe. Keine API-/Schemaänderung.

F18-Korrektur: Listenadaption bleibt ohne Vorlagen-/Bildnetzwerkzugriffe.
Originale Wochenvorlagen erst beim Öffnen laden. Fehlende Artikelbilder im
Erfassungsdialog asynchron nachladen; abgelaufene CMS-Downloadlinks über die
bestehende Werbebildsuche erneuern. Ursprüngliches CMS-Markup und kompakte
Darstellung wiederverwenden, einschließlich aufklappbarer Aktionsartikel.
Betroffen: gemeinsames Formular, Dataverse-Adapter, Modell-Bildauflösung,
Erfassungscontroller, Vorschau, gezielte Tests und Anwenderhilfe.

F18 ersetzt den separaten Schritt-Editor und die Blob-Aktionsablage für neue
Aktionen. Bestehende Dataverse-Angebote erhalten typisierte Getränke-/Artfelder;
aktionsbezogene Layouts verwenden vorhandene Seitenkonfiguration. Ein
transaktionaler Action-Save übernimmt Artikel und Layout zusammen. Schema und
Testumgebung werden vor realen Schreibzugriffen geprüft. Die acht optionalen
Schemaergänzungen und ein Preview-Rollout mit gemeinsamem produktivem Bestand
benötigen ausdrückliche Freigabe; keine Migration bestehender Datensätze.
Schreibtests bleiben auf isolierte Testdaten beschränkt.

Ein gemeinsamer CMS-Erfassungscontroller stellt kompakte Zeilen mit direkter
Autovervollständigung und Bildwerkzeugen für CMS, Kiosk und Angebotsseite bereit.
Die bestehende Vorschau-/Elementgestaltung wird wiederverwendet, aber aus der
Vorschau geöffnet statt als Pflichtschritt. Speichern statt Entwurf/Freigabe.
Bestehende Feature-Blob-Aktionen bleiben über einen gekennzeichneten Bestandsweg
erreichbar. Sie werden weder migriert noch in Dataverse doppelt geschrieben.

Die 4/6-Auswahl sitzt bereits im Getränkedialog und speichert `layout.density`.
Vorhandene `templates` teilen nach dieser Dichte in vollständige Folgeseiten auf.
Ein Wechsel erhält Artikel, Bilder, Pfand und Reihenfolge, erzeugt neue
Sammelraster nur nach dem vorhandenen Bestätigungsmechanismus für freie Layouts.
Einzelziele bleiben dabei unangetastet. Sonderaktionen behalten ihre
Originalrenderer und deren bestehende Raster.

Betroffene Komponenten: bestehende Angebote-API und gezielte Validierung,
gemeinsamer Erfassungscontroller, Angebotseditor als Vorschauwerkzeug,
CMS/Kiosk-Einstiege, Kundenadapter, direkt betroffene Tests und Hilfe.
F18 hat Vorrang vor den folgenden historischen Architekturentscheidungen.

F16: Eine kleine gemeinsame Vorschau-Bearbeitungsfläche verbindet die
vorhandenen Elementdaten bzw. Original-Override-Metadaten mit Pointer-,
Tastatur-, Dreh- und Skalierwerkzeugen. Der Originalrenderer liefert zusätzlich
Trefferflächen für Plakat-Bilder und Preise; seine bestehende Zeichenlogik und
Overrides bleiben maßgeblich. Getränkestandards speichern artikelunabhängige
relative Elementanpassungen im Layout. Neue Vorlagen instanziieren diese für
die jeweiligen Artikel-IDs. Der bestehende `drawSavingsBurst` rendert die
konfigurierbaren Ersparnismarker auch für Getränke; Beispieldaten haben
Stattpreise. Der Validator erlaubt nur bekannte Markeroptionen und begrenzte
Gestaltungsanpassungen.
Ein bestätigter Reset setzt nur die Vorschau des gewählten Getränkestandards
auf `blank` plus eingebaute Vorlagenwerte zurück. Ein separater Speicherklick
bleibt erforderlich; die Oberfläche erklärt Standard und Vorlagenbibliothek.

F15: Die Übersicht verwendet eine schmale Werkzeugleiste, Wochenfilter und
kompakte Aktionszeilen mit allen Direktaktionen. Vorschau und Teilen rendern
den Entwurf ohne Schreibzugriff; Waage verwendet den bestehenden Versanddialog.
`POST ?action=delete` entfernt nach Versions- und ETag-Prüfung nur den
Aktionskopf. Unveränderliche Revisionen/Bilder werden nicht rekursiv gelöscht
und sind ohne aktive Freigabe nicht öffentlich erreichbar.

F14: Plakat-/Einzelflyer-Zeichenfunktionen und ihre reinen Helfer werden
mechanisch aus `cms.js` in `js/wochenangebote-renderer.js` ausgelagert.
Das CMS ruft dieselben Funktionen mit seinen bestehenden Konfigurations- und
Override-Gettern auf. Ein Adapter im Angebotsmodell bildet Centwerte und
authentifiziert geladene Bilder auf die ursprüngliche Artikelform ab.
`layout.cms` speichert ausschließlich die benötigten Designwerte und die
Overrides der Aktionsartikel. Der API-Validator erhält den begrenzten,
JSON-validierten Snapshot auch in der öffentlichen Revision.
Neue Wochenaktionen verwenden sechs Artikel je Originalplakat; bestehende
freie Dokumente wechseln nur nach ausdrücklicher Bestätigung.
Originaleinstellungen ersetzen in diesem Modus die unpassenden freien
Elementwerkzeuge. Getränkemodell und Altbestandsdaten bleiben unverändert.

Der Kiosk erhält einen normalen `panel-angebote` mit dem gemeinsamen
`an-root` und denselben Skripten wie die eigenständige Seite. Der Reiter ruft
`K.switchTab('angebote')` auf; kein Seitenwechsel und kein iframe.

Eigene Produktdateien und Zwischenablagebilder mit Strichcode werden beim
Übernehmen im Artikeldialog zuerst über den bestehenden authentifizierten
`POST /api/werbebilder` unter dem Strichcode gespeichert, danach als privater
Angebots-Snapshot. Fehler brechen die Übernahme ab. Ohne Strichcode bleibt
das Bild privat und ein Hinweis erklärt dies. Suchtreffer und freie
Gestaltungsbilder bleiben reine Snapshots.
Private Vorschaubilder werden über den bestehenden authentifizierten
Modell-Bildloader geladen und als kleine Canvas-Vorschau dargestellt;
direkte, nicht authentifizierbare img-API-URLs entfallen im Editor.

Die gemeinsame Kundenansicht filtert ausschließlich nach Zeitraum, nicht
nach interner Angebotsart. Kategorieknöpfe und Kategorienzustand entfallen
in `angebote-kunden.js`; Flyerauswahl und Wochenumschaltung bleiben erhalten.
Der öffentliche Snapshot-/Gültigkeitsvertrag bleibt unverändert. Tests
prüfen gemischte Wochen-/Getränkeaktionen und Altangebote schon beim Öffnen.

Artikelkernfelder werden über die vorhandenen `data-prop`-Änderungshandler
direkt in der Liste bearbeitet. Zusatzfelder bleiben inline aufklappbar, der
vorhandene Dialog optional für Bilder/Details. Feldänderungen aktualisieren
Zusammenfassung, Rabatt, Literpreis und Vorschau ohne Austausch der Eingaben.
Die bisherige starre Vier-Zeilen-Höhenprüfung wird zugunsten lesbarer
Direkteingaben durch Feldgrößen-, Fokus- und Überlaufprüfungen ersetzt.

Der vorhandene Elementinspektor zieht direkt in die Vorschau. Häufige
Werkzeuge sind immer sichtbar, weitere Felder aufklappbar; die explizite
Gestaltungsansicht öffnet sie weiterhin. Bestehende Upload-, Element- und
Undo-Wege werden wiederverwendet. Elementauswahl wechselt nicht mehr den
Bearbeitungsschritt. Ein echter 44-Pixel-Größenanfasser erweitert die vorhandenen
Pointer-Handler für Maus und Touch; Bilder werden proportional skaliert.
Tests bedienen die sichtbaren Werkzeuge statt nur gespeicherte Layoutdaten.

Literfelder in Liste und Artikeldialog verwenden Textfelder mit
`inputmode="decimal"` statt browserabhängig lokalisierter Number-Felder.
Gemeinsame Modellhelfer formatieren Milliliter als deutsche Literwerte und
lesen Komma oder Punkt mit höchstens drei Nachkommastellen ein. Anzeige,
Dialogübernahme und Inlineänderungen verwenden dieselben Helfer; gespeicherte
Milliliter und der API-Vertrag bleiben unverändert. Ungültige Eingaben erhalten
eine verständliche Feldmeldung. Vier-Viewport-Tests prüfen beide Eingabewege,
die Normalisierung, Speichern/Öffnen und unveränderte Veröffentlichungen.

Die Bildsuche verwendet als Korrelationsschlüssel eine nichtleere Artikelnummer
oder den Strichcode; die tatsächliche EDEKA-Nummer bleibt separat. Damit kann
die bestehende SharePoint-Batch-API EAN-only-Treffer wieder zuordnen. Fehlende
Bilder bestehender Entwürfe werden beim Öffnen nachgeladen und ausschließlich
über die private Angebotsbild-API übernommen. Keine Änderung der alten API.

Die gemeinsame Vorlagenauswahl in `angebote-design.js` erhält delegierte
Doppelklick-/Vergrößern-Aktionen für beide Editoren. Ein modaler Dialog nutzt
die vorhandenen Viewer-CSS-Klassen und rendert eine isolierte Kopie der
Vorlagen-Beispieldaten mit doppelter Auflösung. Zoom verändert nur die
Darstellung; ResizeObserver, Dialogschließen und Fokus werden aufgeräumt.
Es gibt keine neuen API- oder Speicherformate.

| Thema | Entscheidung |
|---|---|
| Gemeinsamer Einstieg | Eine echte Editorseite aus Kiosk und CMS, keine kopierten Editoren und kein CMS-iframe |
| Altbestand | Unverändert im bisherigen Editor lassen, aus gemeinsamer Übersicht verlinken; keine riskante automatische Migration |
| Neue Daten | Privater Azure-Blob-Container über vorhandenes `STORAGE_CONN`, Namespace als verbindliches App-Setting |
| Warum nicht CMS-Key/Value | Dataverse `dl_seiteninhalt` existiert, wird aber über `cms-config` öffentlich gelesen. Private Blobs vermeiden Entwurfslecks und Schemaänderungen |
| Atomare Freigabe | Unveränderlichen Revisionsblob anlegen, danach Aktionskopf mit ETag-Bedingung umschalten |
| Bilder | Authentifizierter Upload, Pillow-Prüfung/Optimierung, unveränderliche Bild-ID. Öffentlich nur Bilder einer aktuell freigegebenen Fassung |
| Preise | Ganze Cent, Inhalt als Milliliter und ganze Anzahl, Grundpreis aus denselben Werten ableiten |
| Freie Gestaltung | Gemeinsames Canvas-Modell für Vorschau, Druck, Originalansicht und Export; semantisch gebundene Preis-/Pfandfelder |
| Waage | Vorhandenen `KWerbebilder`-Dialog erweitern, aktionsbezogener Dateipräfix, Gültigkeit im Server-Sollzustand |
| Preview | PR gegen main, keine Zusammenführung; eigener Namespace und abgeschalteter echter Waagenversand |

Die frühere Entscheidung gegen eine Renderer-Extraktion wird durch F14 ersetzt:
Die Original-Zeichenfunktionen werden gemeinsam genutzt statt nachgebildet.
Der bisherige Editor bleibt für Altaktionen erhalten.

## Datenvertrag

Container `angebote`, private Zugriffsart. Namespace zwingend aus
`ANGEBOTE_NAMESPACE` (`preview-<PR>`); kein clientseitig wählbarer Namespace.

- `<namespace>/actions/<id>.json`: `{id, version, draft, published_revision,
  published_summary, updated_at}`.
- `<namespace>/revisions/<action>/<revision>.json`: unveränderlicher Snapshot.
- `<namespace>/images/<id>`: optimiertes eigenes Bild.
- `<namespace>/design/defaults.json`: getrennte Wochen-/Getränkestandards
  mit Versions-/ETag-Schutz, ohne Auswirkung auf existierende Aktionskopien.

Aktionsdaten: Art `weekly|drinks`, Titel, ISO-Datumsgrenzen, Artikel, Layout.
Artikel besitzen stabile IDs, Namen, Beschreibung/Artikelnummer, Preise in Cent,
Gebinde/Inhalt/Pfand und Bild-ID. Layout enthält optionale Vorlagen sowie freie
Seiten mit positionierten, typisierten Elementen. Öffentliche Projektion ist
eine explizite Positivliste; unbekannte Katalog-/Einkaufsfelder werden verworfen.
Speicherung erhält unvollständige Entwürfe; Freigabe/Export prüft Vollständigkeit.

## Endpunkte

- `angebote-verwaltung/{id?}`: strikt authentifizierte Liste/Create/Save/Publish/
  Duplicate, numerische Version plus Storage-ETag für Konflikte.
  `?view=design` liest/speichert die Designstandards im selben geschützten Vertrag.
- `angebote-flyer`: ausschließlich öffentliche aktuelle Snapshots, keine Verwaltungskonfiguration.
- `angebote-bilder/{id?}`: authentifizierter Upload und privates Lesen; öffentliches
  Lesen nur bei Bezug zu einem aktuell veröffentlichten Snapshot.
- Bestehendes `angebote` bleibt der Legacy-Vertrag, ohne neue Schreibwege.

Fehler mit passenden Statuscodes und freundlichem deutschem Text, technische
Ursachen ausschließlich im Serverlog. Keine leeren Ersatzdaten bei Speicherfehlern.
Verwaltungsantworten und freigabeabhängige Antworten `no-store`.

## Darstellung

`angebote-modell.js` teilt Formatierung, Vorlagen und Canvas-Rendering.
`angebote-editor.js` verwaltet Entwurf/Version, Artikel, Elemente und Ausgabe.
`angebote-design.js` ergänzt den bestehenden CMS-Designeditor um
Getränkeflyer-Einstellungen mit A4-/Karten-/Waagenvorschau. Gemeinsame
Standard-/Typografie-Einstellungen stammen aus demselben Modell wie der
Aktionseditor; alte Plakat-/Einzelflyer-Einstellungen bleiben unverändert.
Geschützte Designabrufe warten auf eine noch laufende serverseitige
CMS-Anmeldung; Fehler bleiben sichtbar und lassen einen neuen Versuch zu.
`angebote-kunden.js` lädt Alt-/Neuangebote einmal und rendert Desktop/mobile
Karten sowie einen skalierbaren Original-Flyer. Vorhandene Wochenumschaltung
für Altbestand bleibt erhalten; neue Angebote sind strikt aktuell gültig.
Dateinamen der Waagenausgabe enthalten Scope-/Aktions-/Revisionskennung und
Start/Ende. Die Brücke erhält nur gültige Dateien; keine Dataverse-Abfrage
pro Poll erforderlich. Unzugeordnete Dateien verhalten sich unverändert.

## F17: Kompakte Artikelerfassung

`angebote-editor.js` markiert den Artikelschritt am bestehenden Layoutcontainer,
damit die Arbeitsfläche volle Breite erhält und die Vorschau darunter steht.
Der doppelte Zeilenkopf wird nur für Screenreader beibehalten; Kernfelder und
Strichcode erscheinen direkt in einem responsiven Raster. Bestehende
Ereignisdelegation, Bilddialoge, Zusatzfelder und Datenverträge bleiben erhalten.
`angebote.css` definiert kompakte Zeilen und semantische Aktionsfarben.

Die Artikelstammauswahl speichert den Katalogindex einmal beim Filtern und
ändert bei Auswahl nur den betroffenen Knopf und Zähler. Die gemeinsame
Übernahme sammelt Artikel zunächst und aktualisiert Layout und Oberfläche
anschließend einmal statt pro Artikel. Bestehende Bild-/Fehlerpfade bleiben.
Playwright ergänzt TC-F17 mit messbarer Zeilenhöhe, vier Viewports, stabilen
Trefferknoten/Fokus und Auswahl über mehrere Suchen. Anwenderhilfe nachführen.

## Dateiänderungen

### F9: Eine gemeinsame CMS-Anmeldung

`cms-auth` erhält einen rein lesenden GET zur Prüfung des vorhandenen Tokens.
Er verwendet denselben serverseitigen Vergleich wie geschützte Angebotszugriffe,
liefert kein Token aus und wird nicht gecacht. `admin-auth.js` verwendet den
ursprünglichen Fetch für Anmelde-/Sitzungsanfragen, damit ein abgelehntes
Passwort nicht den allgemeinen 401-Passwortdialog rekursiv öffnet.

Das CMS wartet am vorhandenen Anmeldebildschirm auf die erfolgreiche
Serveranmeldung. Ein gültiges gespeichertes Token wird vor dem Einstieg geprüft
und wiederverwendet; ein lokaler Hash-Merker allein öffnet das CMS nicht.
Fehler erscheinen am selben Anmeldebildschirm mit erneut bedienbarem Knopf.
Die bestehende nachgelagerte Anmeldung in eigenständigen Verwaltungsseiten
bleibt als Rückweg für tatsächlich abgelaufene/fehlende Sitzungen erhalten.
F9-Tests decken Erstlogin, Wiederaufnahme ohne lokalen Merker, ungültiges Token,
falsches Passwort und Serverfehler ab. Server-Tests prüfen die GET-Antworten.

### F13: Originalvorlagen und Logo

`angebote-modell.js` verwaltet eine gemeinsame Vorlagenliste mit IDs, Namen und
den Originalfarbwerten aus `cms.js`. Die bisherigen IDs `land`/`classic` bleiben
gültig. Klassische Vorlagen und Magazinvorlagen erzeugen frei bearbeitbare
Elemente; Mag XL vergrößert die Bildzone. Die API-Positivliste akzeptiert dieselben
IDs. Kein Import des großen Legacy-CMS-Renderers und kein Rasterbild als Ersatz
für bearbeitbare Vorlagenelemente.
Seiten und Ziellayouts erhalten optional ihre eigene Hintergrundfarbe; bei
alten Dokumenten bleibt der globale Hintergrund der kompatible Rückweg.
Vor einem expliziten Stilwechsel werden fehlende Hintergrundwerte mit dem
aktuellen Wert fixiert, damit andere Ziele optisch unverändert bleiben.
Ein gebundenes Rabattfeld verwendet dieselbe Rundungsformel wie das Original.

Ein eigener Elementtyp `logo` rendert die bereits vorhandene hochauflösende
Datei `images/dorfladen-logo.png` proportional. Neue Sammel-/Einzelflyervorlagen
reservieren Platz im Kopf. Die gemeinsame Renderfunktion erwartet ein vollständig
geladenes Logo vor jeder Ausgabe; der Bildcache erlaubt nach Fehlern einen neuen
Versuch. Vorhandene freie Seiten ohne Logo bleiben unverändert.

`angebote-design.js` verwendet dieselbe Liste für Vorschaukacheln und Startwerte.
Der Aktionseditor zeigt die Auswahl offen, Detailgrößen bleiben einklappbar.
Bestätigtes Neuanwenden betrifft nur das aktuelle Ziel, nie andere Ziellayouts.
API- und Playwright-Tests prüfen alle Stile, beide Angebotsarten, beide Dichten,
Logo-Pixel/Proportionen, gespeicherte Elemente und reale PDF-/JPEG-Ausgaben.

### F10: Layoutauswahl und Bedienbarkeit

`angebote-design.js` liefert gemeinsame native Radio-Kacheln, getrennte
Aufteilungswahl, gruppierte Basis-/Detailfelder und Vorschau-Umschalter.
Miniaturen verwenden Beispieldaten und denselben Canvas-Renderer wie die
Ausgabe. Radio-Gruppen erhalten eindeutige Namen, asynchrone Vorschauen
verwerfen veraltete Render-Ergebnisse. Beide bestehenden Editoren verwenden
dieselben Hilfen. A4 bleibt im Aktionseditor der interaktive Canvas;
Handy-/Waagenansichten stehen in einem getrennten, nicht bearbeitbaren Host.
Vorschauzustand wird nicht im Entwurf gespeichert. CSS unterscheidet aktiv,
Hover und Tastaturfokus; Playwright prüft F10 auf allen vier Projekten.
Anwenderhilfe und bestehende Selektoren werden der neuen Bedienung angepasst.

| Bereich | Dateien |
|---|---|
| API-Kern | `api/shared/angebote.py`, `api/shared/angebote_store.py`, neue Routen |
| Abhängigkeit | `api/requirements.txt`: offizielles `azure-storage-blob` für private Dokumente/Bilder und ETag-Schreibschutz |
| Editor | `static-site/angebote.html`, `js/angebote-modell.js`, `js/angebote-editor.js`, `js/angebote-design.js`, `css/angebote.css` |
| Integration | `kiosk.html`, `cms.html`, kleiner Legacy-Sprung in `cms.js` |
| Kunden | `js/angebote-kunden.js`, `index.html`, `js/app.js`, `js/mobile.js` |
| Waage | `api/shared/waage.py`, `api/waage-werbebilder/`, `js/kiosk-werbebilder.js` |
| Offline-Assets | `static-site/sw.js`, falls vorhandene Cache-Regeln neue Dateien benötigen |
| Qualität | `tests/test_angebote.py`, `tests/angebote-flyer.spec.js`, Waagenregression |
| Betrieb | PR-Workflow-Settings und Feature-Anwenderhilfe unter `docs/` |

## Tests

Python: erlaubte Felder, Cent/Inhalt/Pfand, Entwurf/Freigabe, ETag-Konflikt,
Publikationsfehler, öffentliche/private Bilder, Namespace-Isolation,
Zeitzonen-/Ablaufgrenzen und Brücken-Reconnect.
Playwright: echter Editor mit gemockter API, beide Kategorien, Artikel-/
Layoutpersistenz, eigene Bilder, Druck, Exportauflösung, mobile Originalansicht,
Fehlermeldungen, Kiosk-/CMS-Einstieg und Legacy-Verträglichkeit.
Alle vier Viewports, keine echten Sendungen in Tests.

## Rollout

Gezielt testen, dokumentieren, ausschließlich Feature-Branch committen/pushen.
PR-Vorschau durch vorhandenen Azure-Workflow; Namespace `preview-<PR>` und
`ANGEBOTE_WAAGE_SEND_ENABLED=false` explizit setzen. Benötigte vorhandene
Storage-/CMS-Konfiguration auf Preview prüfen, keine Secrets ausgeben.
Deployment und öffentliche/geschützte Routen an der Preview-URL verifizieren.
Kein Merge, kein Produktivdeploy. Live-Waage bleibt eine gesonderte Abnahme.

## F11: Mockup-getreue Artikelerfassung und gestaltbare Kacheln

Die fachliche Korrektur nutzt nur die vorhandenen Stamm-Schnittstellen:

- Artikel über `/api/preisliste?all=1` laden und Bezeichnung, Artikelnummer,
  Strichcode/EAN, VK, Menge und Stattpreis/UVP explizit mappen. Keine Aufrufe
  des Getränkekatalog-Endpunkts. VK bleibt Referenzpreis; eine separate Wahl
  steuert, ob er in den Angebotspreis übernommen wird.
- Stamm-/EAN-Bilder über den lesenden `/api/werbebilder?sharepoint=1`-Lookup
  suchen. Gefundene Daten-URIs werden als Blob in den bestehenden privaten
  `/api/angebote-bilder`-Namespace kopiert. Manuelle und geänderte Bilder
  durchlaufen denselben privaten Upload; eigene Produktbilder mit Strichcode
  werden zusätzlich über den bestehenden Werbebilder-Schreibvertrag gespeichert.
- Kompakten Kopf, Schrittleiste, zweigeteiltes Arbeits-/Vorschaupanel,
  kurze Artikelliste und Artikeldialog nach dem V2-Mockup umsetzen. Vorhandene
  Editoraktionen und zugängliche 44-px-Bedienflächen bleiben erhalten;
  Metadaten, Zusatzfelder und erweiterte Bildaktionen klappen auf.
- Pro Artikel eigenständige Gestaltungen in `layout.targets.card`,
  `.single` und `.scale` speichern. Sie nutzen dieselben typisierten
  Gestaltungselemente, stabile Artikel-IDs und private Bild-IDs wie A4-Seiten,
  aber eigene 420×480-, 800×1130- bzw. 800×462-Koordinaten. Der API-
  Normalisierer prüft alle Zielgruppen und Bildreferenzen. Veröffentlichungen
  ohne Ziellayouts bleiben kompatibel und verwenden die bisherigen automatischen
  Kunden-/Einzel-/Waagenausgaben; neue Ausgaben verwenden die gespeicherten Ziele.

Änderungsorte: `static-site/js/angebote-editor.js`,
`static-site/js/angebote-modell.js`, `static-site/js/angebote-kunden.js`,
`static-site/css/angebote.css`, `api/shared/angebote.py`,
`tests/angebote-flyer.spec.js`, `tests/test_angebote.py` und
`docs/getraenke-angebotsflyer.md`. Der alte CMS-Editor bleibt unverändert.

Abnahme mit gemocktem Stamm-/Bilddienst und den bestehenden vier Playwright-
Viewports. Zusätzlich Negativassertions für den Kratzer-Endpunkt und alle
mutierenden Artikelstamm-Endpunkte. Werbebilder-Schreibzugriffe sind nur bei
eigenen Produktbildern mit Strichcode erlaubt; private Bild-Uploads bleiben im
Preview-Namespace. Kein Merge oder Produktivdeployment.

### F33: Einheitliche Musterkachel im Designstandard-Designer

- `static-site/js/angebote-design.js`: Die vorhandenen Anpassungsschlüssel
  bleiben API-kompatibel. Vor jeder Vorschau und Speicherung werden je
  Ausgabeziel die Anpassungen von Kachel 0 auf sämtliche Rasterplätze kopiert;
  abweichende Anpassungen anderer Plätze werden entfernt. Seitenweite
  Anpassungen bleiben erhalten. Nur die erste Artikel-ID wird dem gemeinsamen
  Vorschauwerkzeug als bearbeitbar übergeben.
- Die Synchronisation bleibt auf Designstandards beschränkt. Modell,
  Renderer, API und individuelle Aktionseditoren ändern sich nicht.
- `tests/angebote-flyer.spec.js`: Auswahlbeschränkung, direkte Änderungen,
  Bestandsnormalisierung, Dichtewechsel, Speicherung und tatsächliche
  Elementgeometrie neuer mehrseitiger Aktionen prüfen.
- `docs/getraenke-angebotsflyer.md`: Musterkachel und Geltungsbereich erklären.
  Gezielte F33-/F16-Regression auf den vier vorhandenen Viewports.

### F34: Preisbild mit durchgestrichenem Stattpreis

- Additive Vorlage `price-image` in Modell und API-Freigabe; keine neue
  Bilddatei und keine Änderung bestehender Vorlagen. Bestehende Preisfarbe
  und Preis-Hintergrund für Rot und Gelb wiederverwenden; zusätzliche
  Themenfarben `price_outline_color`, `old_price_color`, `price_strike_color`
  für Kontur, Stattpreis und Strich aufnehmen und validieren. Sie nutzt die
  vorhandene Preisschild-Aufteilung mit angepasstem
  Platz für das kombinierte Preisbild.
- Gemeinsame Canvas-Zeichenfunktion im Angebotsmodell: dynamische Euro-/Cent-
  Typografie, weiße Kontur, gelber Vergleichspreisstreifen mit rotem Strich.
  Sie passt das gesamte Motiv proportional in das Preisfeld. Separate
  Preishintergründe und Stattpreisfelder der neuen Vorlage bleiben ausgeblendet.
- Dieselbe Zeichenfunktion für Papier, Kacheln, Einzelflyer und Waage nutzen.
  Vorhandene Auswahl, Standardspeicherung und Zielstile wiederverwenden.
- Bestehende Playwright-Datei um Auswahl-/Speicherprüfung und tatsächliche
  Canvas-Text-/Pixelprüfungen einschließlich Preisrandfällen ergänzen;
  Python-Vertragstest für Standard, Veröffentlichung und Zielstil ergänzen.
  Dokumentierte Vorlagenzahl und Hilfe aktualisieren.

### F35: Zusätzliche Gestaltungsoptionen und eigene Vorlagen

- Optionale, sparsame `layout.decoration` für bisher fehlende Einstellungen
  einführen, ebenfalls in Zielstilen. Fehlende Eigenschaften behalten exakt
  den bisherigen Zeichenpfad. API validiert die erlaubten Eigenschaften.
- Formen und Verläufe aus dem bestehenden Wochenrenderer wiederverwenden.
  Blatt-, Taschen- und Papierdekoration als gemeinsame Zeichenfunktion für
  alle Getränkeausgaben, einschließlich eigener Farben und Rahmen.
  Gemeinsame numerische Bild-/Preisposition vor bestehenden
  Feinverschiebungen anwenden, damit F33 erhalten bleibt.
- Zusätzliche Felder kompakt unter „Weitere Gestaltung“ in denselben
  Controls für Standards und Aktionen ergänzen. Gemeinsame
  Preisschild-Farbvorlagen statt neuer Kopien der vorhandenen Vorgaben nutzen.
- Optionale Liste benannter `presets` im versionierten Design-Dokument;
  Layouts ohne Artikel-/Seiten-/Zielinhalte speichern. Expliziter Hinweis auf
  persistierende Standardspeicherung, zugängliche Eingabe und Löschbestätigung.
- Gezielte Playwright- und API-Vertragstests für Darstellung, Wiederladen,
  Vorlagenverwaltung und nicht gesetzte Optionen; Hilfe aktualisieren.

### F36: Zentrale kompakte Homepage

- Optionale `homepage`-Eigenschaft im bestehenden versionierten
  `design/defaults.json`; bekannte Farben, Booleans und numerische Grenzen
  validieren. Fehlende Eigenschaft älterer Clients erhält den gespeicherten Wert.
- Geschützte Design-API für CMS, öffentliche Projektion über
  `angebote-flyer?view=homepage` ohne Entwürfe oder private Vorlagen.
- Gemeinsame HTML-Karten und CSS-Variablen für CMS-Vorschau und Homepage im
  Kundenmodul. Bestehende Modell-Bildauflösung nutzen, keine neuen öffentlichen
  Bildspeicher. Homepage-Kontext explizit von Kiosk/Originalausgaben trennen.
- Vorhandene HP-Controls laden/speichern mit Version und verständlichen Fehlern.
  Keine Speicherung in produktionsgeteiltem Dataverse-CMS-Config.
- Containerabhängiges 3/2/1-Raster, Homepage-Typografie, kompakte Desktop-
  und mindestens 44 px hohe mobile Buttons; Getränkepflichtangaben erhalten.
- Funktionales CMS-Markup in Quelle pflegen, neue Darstellung über vorhandenen
  Generator/CSS ableiten; Abgleich und wiederholbarer Generatorlauf.

### F37: Gezielte Tests

- Explizite Dateimarkierung und `@ohne-layout` für reine Verträge statt
  Inhaltsheuristik; unbekannte UI-Tests bleiben auf allen Viewports.
- Änderungszuordnung mit sichtbaren Fehlern und konservativer Eskalation.
  Asynchroner Playwright-Prozess, ansprechbarer lokaler Node-Server mit
  Readiness und sicherem Cleanup. Windows-kompatible Selektoren.
- Kleine zusammenhängende Läufe; abschließend betroffene UI auf vier Viewports,
  API/Renderer ohne Viewportbezug einmal, keine pauschale Gesamtsuite.
- Erst nach Abnahme committen und bestehenden PR #15 aktualisieren; isolierte
  Feature-Preview und ausgelieferte Dateien read-only verifizieren.
