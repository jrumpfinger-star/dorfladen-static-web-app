# Verbindlicher UI-Designstandard

## 1. Zweck, Geltung und Status

**Arbeitsfläche zuerst.** Die Oberfläche unterstützt die Hauptaufgabe, statt
selbst den Bildschirm zu besetzen: wenig notwendiges Scrollen, klare
Orientierung, frisches und ruhiges Erscheinungsbild, gleiche Bedienung.

Dieser Standard gilt für neue und überarbeitete Benutzeroberflächen dieses
Repositories, insbesondere CMS, Designbereiche, Angebotserstellung und
Aktionsdialoge. Gemeinsame Bedienelemente folgen auch auf anderen Seiten
denselben Regeln. Ein Gestaltungswunsch für das gedruckte Motiv verändert
nicht die Gestaltung seiner Bedienoberfläche.

Das ist eine verbindliche **Soll-Vorgabe**, keine Behauptung, dass der Bestand
bereits vollständig umgestellt oder getestet ist. Bestehende Seiten werden bei
gezielten Änderungen angepasst, nicht ungefragt in einem Komplettumbau.
Mockups sind als solche zu kennzeichnen und vor einem größeren UI-Umbau
abzunehmen. Fachliches Verhalten folgt weiterhin dem SDD-Verfahren.

### Bestehende Grundlagen statt eines weiteren Stils

- Die [Projektkonstitution](../.specify/memory/constitution.md) bleibt
  übergeordnet, insbesondere bei Bedienmaßen, Meldungen und vier Zielansichten.
- [dl-design.css](../static-site/css/dl-design.css) ist das vorhandene gemeinsame
  Designschema. Seine Tokens werden wiederverwendet und bei einer Umsetzung
  gezielt erweitert, nicht pro Seite neu erfunden.
- Die [CMS-Spezifikation](../specs/cms-redesign/spec.md) definiert gemeinsame
  Gestaltung, Funktionserhalt, maximal halbfette UI-Schrift und Dunkelmodus.
- Die [Angebots-Spezifikation](../specs/getraenke-angebotsflyer/spec.md),
  insbesondere F43–F51, liefert die konkreten Arbeitsflächenregeln.
- Die [Design-Token-Spezifikation](../specs/design-tokens/spec.md) beschreibt
  eine weitergehende Vereinheitlichung. Eine dort geplante Datei darf nicht
  als bereits vorhandene Implementierung vorausgesetzt werden.

Bei Widersprüchen zu älteren bereichsspezifischen Layouts gilt für neue
Gestaltungsarbeit dieser Standard. Bestehende fachliche Verträge dürfen nicht
stillschweigend geändert werden; betroffene Spezifikationen zuerst nachführen.

## 2. Nicht verhandelbare Grundsätze

1. **Platz durch Struktur gewinnen, nicht durch Verkleinern.** Keine winzigen
   Schriften, geschrumpften Trefferflächen oder versteckten Pflichtangaben.
2. **Eine Familie von Komponenten.** Gleiche Felder, Buttons, Reiter,
   Hinweise und Dialoge sehen bereichsübergreifend gleich aus.
3. **Eine Hauptaktion je Arbeitsschritt.** Seltene Aktionen stehen nicht als
   gleichwertiger dauerhafter Buttonblock neben der Hauptaufgabe.
4. **Direkt statt umständlich.** Ein Motiv anklicken öffnet die passenden
   Eigenschaften. Gängige Aufgaben benötigen keine Suche durch mehrere Reiter.
5. **Eindeutige Grenzen.** Werkzeugbereich, Eingabefelder, Motiv und aktive
   Auswahl sind ohne Raten zu unterscheiden.
6. **Keine Scheinfunktion.** Jede angebotene Einstellung bewirkt eine
   nachvollziehbare Änderung. Nicht anwendbare Funktionen werden erklärt,
   nicht wirkungslos angeboten.
7. **Kein Zustandsverlust durch Ansicht.** Reiter, Splitter, Zoom und Vollbild
   ändern weder fachliche Daten noch Speicherstatus oder Historie.
8. **Vollständiger Funktionserhalt.** Alle vorhandenen Eigenschaften und
   Funktionen müssen im neuen Design wieder vorhanden sein. Eine
   Vereinheitlichung ist keine pauschale Erlaubnis, etwas zu entfernen,
   zusammenzulegen oder inhaltlich zu vereinfachen.

## 3. Messbare Platzbudgets

### 3.1 Hauptarbeitsbereich

Der Hauptarbeitsbereich ist die tatsächlich sichtbare Fläche für
**Eingabefelder, Datenpflege und Listenbearbeitung**. Eine reine Vorschau
ist eine Hilfsfläche und zählt nicht als Nachweis für den Eingabe-Arbeitsraum.
Navigation, Hinweisblöcke und globale Aktionsleisten zählen ebenfalls nicht.

- **Harte Untergrenze:** Er nutzt mindestens 50 % der sichtbaren
  Anwendungsfensterhöhe. Die verbleibende Fläche darf nicht beliebig durch
  neue Leisten aufgefüllt werden.
- **Entwurfsziel:** mindestens 80 % auf Desktop, mindestens 70 % auf kleinen
  Ansichten. Das sind zusätzliche Gestaltungsziele, keine Behauptung über
  bereits erreichte Messwerte.
- **Zusätzliche harte Untergrenze für Editoren:** Die sichtbare aktive
  Feldfläche nutzt mindestens 50 % der gesamten Werkzeugspaltenhöhe.
  Allgemeine Element-, Zoom-, History- oder Aktionsblöcke zählen nicht als
  aktive Feldfläche.
- Prozentanzeigen müssen eindeutig benennen, ob sie die sichtbare
  Eingabehöhe im Fenster oder in der Werkzeugspalte messen. Eine gemeinsame
  Eingabe-/Vorschaubox darf nicht als „80 % Arbeitsbereich“ beworben werden.
- Ein gezielt kompaktes Eigenschaftenfenster wird an seiner eigenen
  nutzbaren Dialoghöhe bewertet: mindestens die Hälfte für seine Eingaben.
  Es wird nicht künstlich mit Leerraum auf halbe Bildschirmhöhe vergrößert.
  Die Anzeige benennt ausdrücklich „Dialoghöhe“; gesperrte Hintergrundfelder
  zählen währenddessen nicht als verfügbare Eingabearbeit.
- Die Grenzen gelten auch nach Reiterwechsel, Auswahl, Validierung,
  Speicherrückmeldung und Öffnen anderer Ausgabeziele.
- Eine leere, große Hülle beweist keine nutzbare Arbeitsfläche. Die
  wesentlichen Eingaben müssen darin tatsächlich erreichbar und sichtbar sein.

Gemessen werden sichtbare Rechtecke nach Layout, Padding und Überlagerungen,
nicht lediglich CSS-Angaben wie `height:50%`. Die Anwendungsfensterhöhe
schließt ihre eigenen Header und Navigationen ein; die Browserleiste nicht.
Bei eingeblendeter Bildschirmtastatur haben ein sichtbares fokussiertes Feld
und erreichbare Aktionen Vorrang vor starren Höhen.

### 3.2 Linke Eingaben, rechtes Motiv

- Bei ausreichend breitem Arbeitsbereich: Erfassung/Gestaltung links, Motiv
  rechts. Keine dritte dauerhaft sichtbare Werkzeugspalte.
- **Eingaben haben Vorrang.** Für den neuen Entwurf zunächst ungefähr
  60 % Eingaben / 40 % Motiv, mit verstellbarer Trennung. Die Vorschau darf
  nicht automatisch zwei Drittel des Raums beanspruchen, während die
  eigentliche Erfassung zusammengedrückt wird.
- Die Eingabespalte erhält im geteilten Entwurf mindestens die halbe
  verfügbare Breite; die Motivspalte bleibt sinnvoll nutzbar.
- Linke Mindestbreite im bestehenden Angebotsarbeitsbereich: 250 CSS-px.
  Der Standardwert berücksichtigt auch eine nutzbare Motiv-Mindestbreite.
- Reicht die reale Containerbreite für beide Mindestbreiten nicht aus, wird
  die Eingabe in den Vordergrund gestellt. Mobil zunächst die Eingaben
  anzeigen; Motiv und bewusst geteilte Ansicht bleiben direkt wählbar.
  Nicht allein anhand eines Gerätenamens entscheiden.
- Das hohe Laden-Tablet darf nicht versehentlich als kurzes Telefon behandelt
  und um seine nutzbare Höhe gebracht werden.
- Seiten ohne Motiv verwenden die freie Breite für ihre eigentliche Aufgabe;
  keine leere rechte Pflichtspalte.
- Eine ausdrücklich gewählte reine Motivansicht ist eine andere Aufgabe.
  Dort „Eingaben ausgeblendet“ anzeigen, nicht einen erfüllten
  Eingabe-Flächennachweis behaupten.
- Diese Klarstellung ersetzt die frühere Vorschaupriorisierung in F46.
  Vor der Übernahme in Anwendungscode ist die betroffene Feature-Spezifikation
  entsprechend nachzuführen; die vorhandene Umsetzung wird hier nicht
  rückwirkend als standardkonform erklärt.

### 3.3 Scrollen

- Header und Kontextnavigation bleiben stehen. Formular oder Liste scrollen
  im dafür vorgesehenen Inhaltsbereich.
- Möglichst ein vertikaler Scrollbereich pro Arbeitsspalte. Keine Kombination
  aus scrollender Gesamtseite, scrollender Karte und scrollender Untergruppe.
- Die Vorschau darf bei echtem Zoom separat scrollen. Das ganze Dokument
  erhält dadurch keinen horizontalen Überlauf.
- Keine mehrzeiligen Schaltflächenblöcke oberhalb der eigentlichen Eingaben.
- Zusammengehörige kurze Felder dürfen nebeneinander stehen, wenn
  Beschriftung, Wert und Trefferfläche vollständig passen.
- Lange Artikel- oder Feldlisten dürfen scrollen. „Wenig Scrollen“ bedeutet
  keine abgeschnittenen Inhalte und kein Verstecken notwendiger Angaben.

## 4. Ruhige, frische visuelle Sprache

### 4.1 Farben und Flächen

- Hausgrün als Akzent, neutrale helle Arbeitsflächen, dunkler gut lesbarer
  Text. Nicht je Reiter eine neue Farbe oder Gestaltungssprache.
- Vorhandene Schemawerte: `--gr`, `--gr-d`, `--gr-l`, `--ink`, `--mut`,
  `--flaeche`, `--karte` und die semantischen Statusfarben.
- Weiß für Eingaben/Karten, leicht getönte Fläche für den Motivhintergrund.
  Keine konkurrierenden Farbflächen hinter jeder einzelnen Untergruppe.
- Rot bedeutet Fehler oder destruktive Aktion, nicht eine zweite beliebige
  Hauptaktion. Preisfarben im Motiv sind davon unabhängig.
- Bestehende Tokenwerte sind kein automatischer Kontrastnachweis.
  Kombinationen werden gemessen; fehlende stärkere Rand-/Texttöne werden
  zentral ergänzt, nicht in jedem Bereich als andere Hexfarbe eingebaut.
- Dunkelmodus verwendet die gemeinsamen dunklen Tokens; keine fest weißen
  Hilfefenster oder unlesbaren Formularflächen.

### 4.2 Typografie

- **Einheitlich bedeutet zusammengehörig, nicht überall gleich groß.**
  Die UI verwendet die lesbare Systemschrift des jeweiligen Geräts:
  `system-ui, "Segoe UI", -apple-system, sans-serif`. Unter Windows ist das
  üblicherweise Segoe UI; andere Plattformen verwenden ihre Systemschrift.
  Keine neuen Schriftdateien allein für unterschiedliche Bildschirmgrößen.
- Alle Buttons, Felder, Reiter, Popover und Dialoge erben diese Schrift.
  Nicht zufällig zwischen Arial, Georgia und Systemschrift wechseln.
- Schriftgrößen reagieren auf **verfügbare CSS-Breite und -Höhe**, die
  tatsächliche Containerbreite und die Bedienart, nicht allein auf physische
  Pixelzahl, Betriebssystemauflösung oder einen Gerätenamen.
- Für präzise Mausbedienung: kompakter UI-Text ab **14 px** bei knapper Höhe,
  etwa **15 px** im normalen Arbeitsbereich, bis **16 px** bei viel Platz.
  Das sind gestufte Dichtewerte, keine überall fest vorgegebene 16-px-Schrift.
- Touch-/Grobzeigerbedienung und Telefone: Feldwerte und wesentliche Aktionen
  in der Regel mindestens **16 px**, unabhängig von hoher Pixeldichte.
  Kein automatisches Verkleinern nur deshalb, weil ein Tablet viele Pixel hat.
- Nicht wesentliche Metadaten dürfen eine kleine Stufe darunter liegen,
  mindestens 13 px. Für wichtige Hinweise gilt die normale UI-Schriftgröße.
- Größen über relative Tokens und begrenzte responsive Werte, etwa `clamp()`,
  definieren. Browserzoom und vergrößerte System-/Schrifteinstellungen
  respektieren; keine verkleinernde Skalierung der gesamten Anwendung.
- Abschnittstitel eine kleine Hierarchiestufe über dem Fließtext, Seitentitel
  höchstens 20 px in Arbeitsansichten.
  Keine große dekorative Überschrift oberhalb eines Editors.
- Schriftgewichte 400 und 600. Keine UI-Überschriften mit 700/900.
- Zeilenhöhe mindestens 1,3; Umlaute und mehrzeilige Texte bleiben vollständig.
- Ein gewählter Motivfont wirkt ausschließlich im Motiv. Ein Wechsel zu
  Georgia für die Bezeichnung darf keinen UI-Reiter auf Georgia umstellen.
- Abweichende Drucktypografie ist eine fachliche Motiv-Einstellung, keine
  Ausnahme für beliebige UI-Schriften.

### 4.3 Abstände, Ränder und Formen

- Gemeinsame Abstände verwenden: 4 px Feinabstand, 8 px innerhalb kurzer
  Gruppen, etwa 12–16 px zwischen inhaltlichen Abschnitten.
  Vorhandene Schema-Tokens bleiben die Implementierungsquelle.
- Kompakte Eigenschaftszeilen brauchen nicht zusätzlich 12 px Außenabstand
  pro Feld. Sichtbare Kontrollen und Trefferflächen getrennt dimensionieren:
  z. B. 30–36 px sichtbarer Feldrahmen innerhalb einer 44 px hohen Trefferzone.
  Die vollständige Zone muss tatsächlich fokussierbar/anklickbar sein.
- **Buttons bei präziser Mausbedienung:** Ab 600 CSS-px Fensterbreite beträgt
  die tatsächliche Höhe einzeiliger Arbeitsaktionen und Werkzeugreiter 32 px,
  nicht nur die sichtbare Füllung innerhalb einer weiterhin 44 px hohen Zeile.
  Navigationsauswahl, kompakte Vorlagenzusammenfassung und 4/6-Auswahl folgen
  derselben Höhe. Mehrzeilige Beschriftungen dürfen wachsen; nichts abschneiden.
  Auf Telefonen und bei Touch-/Grobzeigern bleiben mindestens 44 px echte
  Trefferhöhe erhalten. Diese ausdrückliche Präzisierung ersetzt die pauschale
  44-px-Vorgabe für diese Maus-Arbeitsaktionen; sie ändert keine Buttonbreiten.
- Normale Felder und Buttons verwenden einen gemeinsamen kleinen Radius
  (`--r-s`), größere Arbeitsflächen `--r-m`.
- Keine unterschiedliche Rundung für jeden Button, keine plastischen
  Schatten auf jeder Eingabe, keine Karten-in-Karten ohne fachlichen Grund.
- Schatten nur für echte Ebenen wie Dialoge und Popover. Bereichsgrenzen
  müssen auch ohne Schatten erkennbar sein.

## 5. Navigation und Aktionen

- Ein klarer Seitentitel und ein kompakter Kontext. Nicht dieselbe
  Information als Breadcrumb, Überschrift und Kartenüberschrift wiederholen.
- Bereich und Unterbereich sind höchstens zwei gleichzeitig sichtbare
  Navigationsebenen. Werkzeugreiter bleiben lokal zur Werkzeugspalte.
- Reiter bilden eine ruhige einzeilige Leiste mit erkennbarem aktiven Zustand,
  keine Sammlung großer abgerundeter Vollbuttons in zwei bis drei Zeilen.
- Auf engem Raum eine verständliche Auswahl oder ein Menü verwenden, statt
  Beschriftungen abzuschneiden oder horizontales Seitenscrollen zu erzeugen.
- **Speichern** bleibt sichtbar und eindeutig. Es wird nicht zwischen drei
  anderen gleich stark gestalteten Hauptbuttons versteckt.
- **Undo/Redo** als kompakte Symbolbuttons mit zugänglichem Namen und Hilfe.
- **Vollbild** immer direkt erreichbar, unabhängig vom aktiven Reiter.
- **Weitere Aktionen** enthält seltene Vorgänge wie Verwerfen,
  Zurücksetzen, Import oder Export, soweit der konkrete Arbeitsablauf sie
  nicht zur Hauptaufgabe macht.
- Explizite Freigabe/Veröffentlichung bleibt von Speichern unterscheidbar;
  ein visueller Umbau darf keinen zusätzlichen Schreibvorgang auslösen.
- Kein Auto-„Aktualisieren“-Buttonblock vor den eigentlichen Feldern, wenn
  bereits eine automatische Vorschau vorgesehen ist.
- Symbolbuttons nicht ohne Not nur über ein Symbol identifizieren:
  `aria-label`, Fokus und Hilfe gehören dazu. Destruktive Aktionen sind
  im Menü ausgeschrieben und vor Fehlbedienung geschützt.

## 6. Formulare, Gruppen und Hilfen

- Eindeutige Beschriftung direkt beim Feld; Platzhalter ersetzt kein Label.
- In Eigenschaftseditoren standardmäßig kompakte Zeilen: Beschriftung links,
  Wert rechts. Erst bei wirklich zu wenig Containerbreite sinnvoll umbrechen.
  Kein großes Formularfeld über die gesamte Spaltenbreite für jede Kleinigkeit.
- **Keine Pflicht zur eigenen Zeile pro Eigenschaft.** Kurze Farben- und
  Zahlenoptionen nach verfügbarer Containerbreite in ein, zwei oder drei
  Spalten anordnen. Oberhalb kurzer Farbfelder dürfen die Labels stehen,
  wenn das platzsparender und eindeutiger ist.
- Raster reagieren auch auf Splitterbewegungen und Dialoggrößen, nicht
  nur auf die Fensterbreite. Lange Texte, Auswahllisten und Schieberegler
  dürfen mehrere Spalten überspannen. Reihenfolge von DOM, Tastatur und
  Darstellung bleibt gleich.
- Mindestbreiten mit tatsächlichen Beschriftungen prüfen. Keine
  Wortzerlegung wie „Stattpreisban / d“ und keine neuen kryptischen
  Abkürzungen zugunsten einer zusätzlichen Spalte.
- Kurze Texte starten einzeilig und wachsen bei tatsächlichem Inhalt.
  Bezeichnung/Zusatz erhalten nicht pauschal zwei bis drei leere Zeilen.
  Lange Werte müssen weiter vollständig les- und bearbeitbar sein.
- Zahlenfelder nur so breit wie Werte, Einheit und native Bedienung es
  brauchen; Farbfelder als kleine Farbmuster statt voller Farbbalken.
- Keine zusätzliche Überschriftenzeile, wenn aktiver Reiter und Feldlabels
  bereits denselben Kontext eindeutig erklären.
- Bearbeitungsgruppen sind beim ersten Öffnen aufgeklappt. Manuelles
  Einklappen bleibt möglich und wird nicht bei jedem Preview-Render aufgehoben.
  Aktionsmenüs und explizite Vorlagenauswahlen starten dagegen geschlossen.
- Fachlich zusammengehörige Angaben zusammen zeigen: Bezeichnung/Zusatztext,
  Preis/Stattpreis, Gebinde/Pfand. Keine verstreuten Doppelfelder.
- Lange statische Erläuterungen stehen in einer erreichbaren Infohilfe,
  nicht als dauerhafter Absatz vor den Eingaben.
- Hilfe funktioniert mit Maus, Touch und Tastatur; nicht nur bei Hover.
  Sie verdeckt nicht das auslösende Feld, bleibt im sichtbaren Fenster und
  lässt sich mit Escape schließen.
- Kurze Pflichtangaben, relevante Einheiten, Fehler, Konflikte und
  Wiederholungsaktionen bleiben sichtbar. Sie gehören nicht nur in Tooltips.
- Status braucht eine feste kompakte Position, die bei Textänderungen nicht
  die Feldfläche zusammendrückt. Längere Fehler verständlich in den
  vorhandenen Dialogkomponenten zeigen.
- Nur anwendbare Felder anbieten. Ein bewusst deaktiviertes Feld erklärt
  seinen Grund; eine aktive Einstellung ohne Wirkung ist ein Fehler.

### Objekt-Zusammenfassung und Eigenschaftenfenster

Für **Schrift, Preisschild und Bild** ist das folgende Muster für das
Mockup ausdrücklich freigegeben. Andere fachliche Zusammenfassungen bleiben
gesondert freizugeben.

- Der aktuelle Zustand bleibt als kompakte beschriftete Schaltfläche sichtbar:
  z. B. Schriftfamilie/Größe/Farbmuster, Preisschildvorgabe mit Beispiel oder
  Bildminiatur mit Skalierung. Nicht nur ein namenloses Zahnrad.
- Ein Klick öffnet die vollständigen zugeordneten Eigenschaften, ohne sie
  fachlich zu verschmelzen. Häufige Inhaltseingaben bleiben direkt zugänglich.
- Auf großen Ansichten ein kompakter Dialog beim Eingabebereich, nach
  Möglichkeit neben dem sichtbaren Motiv; mobil ein geeignetes Blatt.
  Kein neues Browserfenster und keine Popup-Kaskaden.
- Darin die gleichen responsiven Raster und Feldhelfer verwenden. Gruppen
  im Fenster starten aufgeklappt. Eine bewusst gewählte Objekt-Zusammenfassung
  ist keine versehentlich eingeklappte Feldgruppe.
- Änderungen wirken live auf die Vorschau, aber zunächst nur innerhalb
  einer lokalen Bearbeitungstransaktion. Mobil eine echte Live-Motivvorschau
  im Fenster bereitstellen, wenn das Hauptmotiv nicht sichtbar ist.
- **Übernehmen** bestätigt die Fensterwerte im übergeordneten Entwurf und
  bildet genau einen Undo-Schritt. Unverändertes Bestätigen erzeugt keinen.
  Es ersetzt nicht das explizite Speichern der gesamten Seite.
- **Abbrechen, Escape und Schließen-X** verwerfen alle Fensteränderungen.
  Vorheriger Entwurf, Vorschau, Historie und Speicherstatus bleiben erhalten,
  auch wenn der Entwurf schon vor dem Öffnen ungespeicherte Änderungen hatte.
- Abhängige Presetfarben und gewählte lokale Bilder vollständig
  zurückrollen. Ein Abbruch darf keine defekten Bildreferenzen hinterlassen.
- Kein unbeabsichtigtes Bestätigen durch Außenklick. Bei modaler Bearbeitung
  Hintergrundaktionen wie Speichern, Zielwechsel und Undo sperren.
- Fokus im Fenster führen und beim Schließen zum Auslöser zurückgeben.
  Footeraktionen bleiben beim Scrollen erreichbar. Escape behandelt zuerst
  das Eigenschaftenfenster, soweit der Browser die Taste nicht selbst für
  seine Vollbild-/Sicherheitsfunktion reserviert.
- Solche Fenster sind eine andere Bedienform, kein Vorwand zum Weglassen
  vorhandener Eigenschaften. Ein Mockup bleibt bis zum geprüften vollständigen
  Bestandsabgleich ein Gestaltungsausschnitt.

## 7. Gemeinsamer Editor und bildreine Vorschau

### 7.1 Gleiche Bedienung

**Getrennte Seiten, gemeinsame Komponenten.** Design und Angebotserstellung
bleiben an ihren unterschiedlichen Einbindungsstellen eigenständige Seiten
mit eigenem Einstieg und eigenem fachlichen Speicherweg. Kein gemeinsamer
„Design / Angebot“-Umschalter innerhalb derselben Seite.
Design verwaltet Vorlagen/Standards; Angebote verwalten konkrete Aktionen
und Artikel. Wiederverwendet werden Gestaltung, Arbeitsrahmen und passende
Bedienbausteine, nicht die gesamte Fachseite oder ihr Datenzustand.

Plakat, Einzelflyer, Getränke, HP-Sonderangebote, Angebotserstellung und
gespeicherte Aktionsvorschauen teilen denselben Arbeitsrahmen und dieselben
Bedienprinzipien. Homepage, Wochenplan und gemeinsame Einstellungen verwenden
dieselbe visuelle Sprache; fachlich andere Inhalte bleiben andere Inhalte.

- Gleiche Werkzeuge heißen gleich und stehen am gleichen Ort.
- Die rechte Fläche zeigt das tatsächliche Motiv in seinem Seitenverhältnis.
  Keine Schalter, langen Hinweise oder Werkzeugsammlungen im Motiv.
- Elementauswahl und Bearbeitungsmarkierungen erscheinen nur im
  Bearbeitungskontext. Sie werden nicht in Bild oder Export eingebrannt.
- Element-, Zoom- und Ausgabehilfen liegen kompakt im passenden Werkzeug-
  oder Ansichtsreiter, nicht vor den Feldern aller anderen Reiter.
- Auswahl per Motiv öffnet die passenden Eigenschaften links.
  Direkte Bearbeitung funktioniert auch bei der **ersten echten Plakatkachel**;
  nur einen Eintrag in einer Auswahlliste zu bedienen genügt nicht.
- Direkte Maus-/Touch-Bearbeitung hat eine gleichwertige Tastatur-/Feldbedienung.

### 7.2 Splitter und Vollbild

- Ein gut sichtbarer Splitter teilt die Spalten. Ziehen funktioniert mit Maus
  und Touch; Pfeiltasten sowie Home/End bedienen dieselben Grenzen.
- Separator mit Rolle, Ausrichtung, zugänglichem Namen und aktuellem Wert.
  Ein schmaler sichtbarer Strich allein ist kein ausreichendes Touch-Ziel;
  eine größere Trefferfläche darf keine benachbarten Felder blockieren.
- Fenstergrößenwechsel begrenzen die Aufteilung erneut korrekt.
  Fokus, Entwurf und getrennte Zielgestaltung bleiben erhalten.
- Vollbild umfasst **Eingaben und Motiv**, nicht nur ein vergrößertes Bild.
  Der geeignete Container muss auch aus einem Angebotsdialog funktionieren.
- Beenden über sichtbare Schaltfläche oder Escape; Auswahl, Historie und
  ungespeicherte Änderungen bleiben erhalten.
- Ohne Browserunterstützung eine verständliche Meldung zeigen. Kein
  wirkungsloser Button und keine als echtes Vollbild ausgegebene Attrappe.

### 7.3 Motiveinstellungen müssen fachlich stimmen

- „Waage“ zeigt das eigene Layout **800 × 462**, keinen A4-Flyer im Querformat.
- Vorschau und Export verwenden dieselbe Rendering-Grundlage.
- Bezeichnung und Zusatztext bilden eine Gruppe. Zusatz direkt unter dem
  Namen, normale Detailgröße und Semibold 600; leerer Zusatz ohne Leerzeile,
  langer Zusatz mit Umbruch ohne Überlappung.
- Bezeichnung nach Schriftart, Größe und Farbe konfigurierbar; Gruppe
  gemeinsam verschiebbar, skalierbar und drehbar.
- Preisschildvorgaben wie **Rot/Gelb** gehören in die bestehende
  Preisschildauswahl, nicht als Ersatz in eine neue Gesamtvorlage.
- Wechsel betrifft nur das Schild, nicht Artikelpreise, Bilder oder die
  übrige Gestaltung. Bestehende Entwürfe bleiben lesbar und wechselbar.
- Preisfarbe, Hintergrund/Streifen, Kontur, Stattpreis und Durchstreichung
  müssen ebenso tatsächlich wirken wie Form, Rundung, Neigung und Größe.
- Was die Vorschau verändert, bleibt nach Speichern/Neuladen und im Export
  erhalten. Andere Ausgabeziele bleiben unverändert.

## 8. Zugänglichkeit und Rückmeldungen

- Touch-Ziele mindestens **44 × 44 CSS-px**, Regelwert nach gemeinsamem
  Schema 48 px. Gilt auch für Info-, Menü- und Symbolbuttons.
- Zusammenhängende Separator-/Ziehbereiche dürfen eine dafür geeignete
  größere Trefferregion verwenden, ohne benachbarte Inhalte zu überlagern.
- Textkontrast mindestens **4,5:1**, relevante Feld-/Bereichsgrenzen,
  Zustandsmarkierungen und Icons mindestens **3:1** zu ihren Bezugsflächen.
- Aktive Auswahl und Fehler nicht ausschließlich durch Farbe vermitteln.
- Deutlicher Tastaturfokus; kein Abschneiden durch `overflow:hidden`,
  kein Fokusverlust beim Reiterwechsel, keine unerreichbare Popover-Ebene.
- Dialoge und Popover korrekt benennen; schließen gibt den Fokus an den
  Auslöser zurück. Escape beendet die vorderste passende Ebene.
- Dunkelmodus, erzwungene Systemfarben und reduzierte Bewegung berücksichtigen.
- Meldungen in verständlichem Deutsch über vorhandene Komponenten.
  Technische Einzelheiten ins Log, nicht als HTTP-Code vor die Nutzenden.

## 9. Verbindlicher Entwurfs- und Prüfablauf

1. Bestehenden Standard, gemeinsame Helfer und betroffene Spezifikation lesen.
   Kein neues Bauteil einführen, bevor vorhandene Lösungen geprüft wurden.
2. Vor dem Umbau eine Bestandsaufnahme und Übernahmematrix erstellen:
   Eigenschaften, Funktionen, Sonderfälle und bisherige Speicherwege.
   Fehlende oder noch nicht zugeordnete Punkte blockieren die Umsetzung.
3. Die Hauptaufgabe benennen: Was muss ohne Umweg sichtbar und bedienbar sein?
   Daraus Platzbudget und primäre Aktion ableiten.
4. Bei größerer Umgestaltung zuerst ein realistisches Mockup mit tatsächlichen
   Feldlängen, Artikelbezeichnungen und allen relevanten Zuständen zeigen.
   Ein Mockup mit Beispieldaten oder ausgewählten Feldern ist ausdrücklich
   kein Nachweis vollständiger Funktionalität.
5. Erst nach Abnahme über Spec, Plan und Tasks in die Anwendung übernehmen.
   Keine neue Bibliothek oder Frameworkmigration allein für einen anderen Stil.
6. Gemeinsame Helfer, Komponenten und Tokens verwenden. CMS-Änderungen an der
   gepflegten Quelle vornehmen und abgeleitete HTML-Dateien erzeugen lassen.
7. Eng betroffene Tests ausführen; tatsächliche Geometrie, Interaktionen und
   Motivänderungen prüfen, nicht nur Klassen, ausgewählte Werte oder Screenshots.
8. Screenshots aller Zielansichten ansehen. Erst mit bestandenen passenden
   Prüfungen von umgesetzt sprechen; Deployment separat verifizieren.

### Vollständigkeit und Freigabe von Vereinfachungen

Für jeden betroffenen Bereich die vorhandene Funktion dem neuen Ort und
einem geeigneten Nachweis zuordnen. In den SDD-Unterlagen dokumentieren,
nicht in einer isolierten Liste, die von der Umsetzung getrennt veraltet.

| Bestand | Erforderliche Zuordnung |
| --- | --- |
| Eigenschaft/Feld | Neuer Ort, Beschriftung, Datentyp, Wertebereich, Standardwert und Einheit |
| Geltungsbereich | Designstandard, konkrete Aktion, Artikel, Kachel oder Ausgabeziel |
| Bedienfunktion | Neuer Auslöser; Maus, Touch und Tastaturalternative, soweit vorhanden |
| Zustandsverhalten | Vorschau, Auswahl, Undo/Redo, Entwurfs-/Speicherstatus |
| Daten-/Ausgabeverhalten | Speichern/Neuladen, alte Entwürfe, Export und Zieltrennung |
| Sonderfall | Leere Werte, lange Inhalte, deaktivierte Optionen, Fehler und Wiederholen |
| Nachweis | Passender Testfall und Ergebnis; bei Bedarf Bestands-/Generatorabgleich |

- Kein Feld darf nur deshalb fehlen, weil es im Mockup nicht gezeigt wurde.
- Keine Funktion darf lediglich technisch noch existieren, aber im neuen
  UI nicht mehr erreichbar oder faktisch nicht mehr bedienbar sein.
- Ein Verschieben in einen anderen sinnvollen Bereich muss die Funktion
  vollständig erhalten und in der Matrix nachvollziehbar sein.
- **Zusammenfassen, fachliches Vereinfachen, Weglassen und Entfernen
  vermeintlicher Redundanzen benötigen vor der Umsetzung eine ausdrückliche
  Freigabe.** Auch scheinbar doppelte Felder können unterschiedliche Ziele
  oder Speicherbereiche betreffen.
- Dafür jeweils konkret vorstellen: bisheriges Verhalten, vorgeschlagene
  Änderung, Begründung, betroffene Eigenschaften/Funktionen, mögliche
  Einschränkung und vorgesehener Nachweis. Die Entscheidung per Rückfrage
  einholen und bei den betroffenen SDD-Anforderungen festhalten.
- Eine allgemeine Mockup-Abnahme oder „einheitlicher gestalten“ ersetzt
  diese Einzelfreigabe nicht. Ohne Freigabe bleibt das bisherige fachliche
  Verhalten vollständig erhalten.
- Rein technische Wiederverwendung ist davon zu unterscheiden: Gemeinsame
  Komponenten sind erwünscht, solange keine fachliche Einstellmöglichkeit,
  Erreichbarkeit oder Zustands-/Speichertrennung verloren geht.

### Abnahme auf vier Ansichten

| Ansicht | CSS-Größe |
| --- | --- |
| Telefon | 375 × 667 |
| iPad mini | 768 × 1024 |
| Desktop | 1280 × 800 |
| Laden-Tablet hoch | 686 × 1095 |

| Prüfung | Nachweis |
| --- | --- |
| Platzbudget | Hauptarbeits- und aktive Feldfläche tatsächlich messen, auch nach Meldungen/Reiterwechsel |
| Orientierung | Feste Header, klarer aktiver Kontext, identische Komponenten, keine doppelte Navigation |
| Passform | Kein horizontaler Seitenüberlauf, keine abgeschnittenen Texte oder verdeckten Aktionen |
| Lesen und Treffen | Schriftgrößen, 44-px-Ziele, gemessene Kontraste, sichtbarer Fokus |
| Hilfe | Per Fokus und Touch erreichbar; Hauptfläche bleibt frei; Fehler bleiben sichtbar |
| Splitter | Echter Pointer-/Touch- und Tastaturtest, Grenzen, Größenwechsel, keine Datenmutation |
| Vollbild | Echte Browserfunktion öffnen/schließen, aus allen Bereichen und Dialogen, Zustand bleibt |
| Direkte Gestaltung | Erste Kachel tatsächlich anklicken/ziehen; Auswahl und Geometrie ändern sich |
| Sichtbare Wirkung | Reale Motivpixel oder Rendergeometrie ändern sich bei anwendbaren Einstellungen |
| Funktionsgleichheit | Artikel, Bilder, Pfand, Gruppen, Historie, Speichern/Neuladen und Zieltrennung erhalten |
| Vollständigkeit | Jede Bestandseigenschaft/Funktion hat neuen Ort und Nachweis; kein ungeklärter Verlust |
| Vereinfachungen | Jede fachliche Zusammenfassung, Streichung oder Einschränkung ist ausdrücklich freigegeben |
| Ausgabe | Vorschau/Export-Parität; natives Waagenformat; keine Bedienmarkierungen im Export |
| Darstellungsmodi | Dunkelmodus, Systemkontrast, Tastatur; keine festen hellen Sonderflächen |
| Seiteneffekte | Reiter, Splitter, Zoom und Vollbild schreiben keine fachlichen Daten |

Mockups verwenden lokale Beispieldaten ohne echte Schreibzugriffe.
Read-only-Abnahme einer PR-Preview ersetzt keine gemockten Schreibtests:
Preview-Umgebungen können dieselben Dataverse-Daten wie Produktion verwenden.

## 10. Konkrete Anti-Muster aus dieser Sitzung

| Nicht mehr so | Stattdessen |
| --- | --- |
| Fünf große Werkzeugbuttons in mehreren Reihen vor den Feldern | Eine kompakte lokale Reiterleiste |
| Acht Dreh-/Pfeilbuttons und Zoom vor den Farbfeldern | Passende Werkzeuge im eigenen Reiter; direkte Motivauswahl |
| Dauerhafter mehrzeiliger Erklärungstext | Erreichbare Infohilfe |
| Sechs gleichwertige Footerbuttons | Speichern sichtbar, Undo/Redo als Symbole, Seltenes im Menü |
| „50 %“ nur als CSS-Deklaration | Sichtbare echte Feldfläche inklusive konkurrierender Leisten messen |
| Getrenntes neues UI pro Flyerart | Gemeinsamer Arbeitsrahmen, unterschiedliche fachliche Inhalte |
| Vollbild versteckt oder nur für einen alten Container verdrahtet | Dauerhafter Auslöser und geprüfter Vollbildcontainer |
| Einstellung geändert, Vorschau unverändert | Tatsächliche Renderwirkung und Speicherrücklauf nachweisen |
| Eigene Gesamtvorlage statt vorhandener Preisvorgabe | Unabhängig austauschbares Preisschild |
| UI-Schrift folgt gewählter Motivschrift | UI-Typografie und Drucktypografie strikt trennen |
| Immer weitere CSS-Overrides gegen Legacy-Regeln | Ursache/Spezifität prüfen, gemeinsame Regeln gezielt integrieren |

**Abschlussfrage jeder UI-Änderung:** Hat die eigentliche Arbeit jetzt mehr
brauchbaren Platz, weniger Umwege und dieselbe verlässliche Bedienung wie in
den anderen Bereichen? Wenn nicht, ist die Gestaltung noch nicht fertig.
