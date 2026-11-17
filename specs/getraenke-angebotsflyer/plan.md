# Umsetzung: Angebote und Getränkeflyer

Spec: [spec.md](./spec.md). Status: zur Implementierung.

## Constitution

Spec/Testfälle vorhanden, keine offenen Klärungsmarker. Eigener Feature-Worktree,
keine Secrets im Repository, keine fremden Assets. Bestehende Vanilla-JS-,
Azure-Functions- und Playwright-Struktur beibehalten. Vier Viewports testen.

## Entscheidungen

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
