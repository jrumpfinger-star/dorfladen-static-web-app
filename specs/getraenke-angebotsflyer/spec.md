# Gemeinsame Angebote und Getränkeflyer

Status: Zur Umsetzung freigegeben. F18 ersetzt den bisherigen Schritt-Editor
und dessen getrennte Entwurf-/Veröffentlichungsablage für neue Aktionen.
Frühere Anforderungen an Blob-Snapshots gelten nur noch für den erhaltenen
Feature-Altbestand, nicht für neue Dataverse-Aktionen.

## Ziel und Grenzen

Mitarbeitende erstellen Wochen- und Getränkeangebote über einen gemeinsamen
Einstieg aus Kiosk und CMS. Ein Datenstand liefert responsive Kundenkarten,
einen frei gestaltbaren A4-Flyer und profilgerechte Waagenbilder.
Vorlagen sind optionale Startpunkte, kein verpflichtendes Raster.

Keine Lieferantenimporte, Einkaufspreise als Verkaufspreise oder Änderungen
an Getränke-Bestellungen. Keine Kopie fremder Prospekte/Bilder. Bestehende
Aktionen und deren umfangreicher bisheriger Editor bleiben unverändert nutzbar;
sie werden nicht automatisch migriert oder von neuen Aktionen überschrieben.

## F1: Gemeinsame Verwaltung

Ein gemeinsamer Editor für neue Wochen- und Getränkeaktionen ist aus Kiosk
und CMS erreichbar. Ablauf: Aktionsart wählen, kompakter Erfassungsdialog,
Speichern, Vorschau mit Karten-/Einzelflyerbearbeitung. Angebote werden in
der bestehenden Dataverse-Angebotstabelle gespeichert. Kein CMS-iframe.

- TC-F1-01: Alte Aktionen bleiben erreichbar und unverändert bearbeitbar.
- TC-F1-02: Neue Aktionen beider Arten anlegen/duplizieren; Artikel hinzufügen,
  entfernen, hervorheben und sortieren.
- TC-F1-03: Angebotsbearbeitung schreibt weder Katalog- noch Bestelldaten.

## F2: Preise und Getränkedaten

Eingaben: Name, Artikelnummer (auch Zeichenketten/leer), Beschreibung, Bild,
Verkaufspreis, optionaler Stattpreis. Getränke zusätzlich: Anzahl, Milliliter
je Einheit, Gebindeart und Gesamtpfand oder ausdrückliche Pfandfreiheit.
Neue Artikel werden aus dem normalen Artikelstamm übernommen: Bezeichnung,
Artikelnummer, EAN, Inhalt und regulärer Verkaufspreis. Der Angebotspreis
bleibt separat; der reguläre VK wird nur auf ausdrückliche Wahl als
Angebotspreis vorbelegt. Preise werden in ganzen Cent gespeichert, Literpreise
ohne Pfand berechnet und kaufmännisch auf Cent gerundet. Einkaufs- und
Kratzer-Bestellkatalogpreise werden nicht verwendet.
Dezimale Mengen werden in Liste und Artikeldialog mit deutschem Komma
angezeigt und eingegeben, beispielsweise `0,5` Liter. Punkteingaben bleiben
kompatibel und werden nach Abschluss der Eingabe in Kommaschreibweise
angezeigt. Literwerte mit bis zu drei Nachkommastellen werden verlustfrei
als ganze Milliliter gespeichert; ungültige Mengen werden erkennbar gemeldet.
Unvollständige Eingaben bleiben lokal; Speichern und Waagenversand erfordern
vollständige gültige Angaben. Der erhaltene Feature-Altbestand behält seine
bisherige Entwurfssemantik.

- TC-F2-01: 12,49 EUR / (20 × 0,5 l) ergibt 1,25 EUR/l, 3,10 EUR Pfand separat.
- TC-F2-02: Fehlender Inhalt/Pfandentscheidung, Preis <= 0 oder ungültiger
  Zeitraum verhindert Freigabe und Versand mit verständlicher Meldung.
- TC-F2-03: Artikel-, Bild- und Preisangaben stimmen in allen Ausgaben überein.

Stammartikelbilder werden ausschließlich über die bestehende Werbebildsuche
gelesen. Für den neuen Entwurf wird das Bild als privater, unveränderlicher
Angebotsbild-Snapshot gespeichert. Eigene Produktbilder mit EAN/Strichcode
werden zusätzlich über die bestehende Werbebilder-API in SharePoint
`StrichcodeBilder` gespeichert. Preis- und Artikelstammdaten bleiben unverändert.
Ohne Strichcode bleibt das Bild privat; der Bilddialog erklärt diese Grenze.
Automatisch gefundene Bilder und freie Gestaltungselemente werden nicht
als Stammbilder zurückgeschrieben.

### Produktbild-Speicherung und angemeldete Vorschau

- TC-F2-04: Eigene Datei oder Zwischenablage mit Strichcode wird beim
  Übernehmen zusätzlich unter diesem Schlüssel in `StrichcodeBilder`
  gespeichert; der private Snapshot bleibt für das Angebot erhalten.
- TC-F2-05: Fehler beim Stammbild-Upload bleiben sichtbar; der Bilddialog
  bleibt offen und das Artikelbild wird nicht als erfolgreich übernommen.
- TC-F2-06: Private Bilder erscheinen angemeldet in Artikelliste und
  Bilddialog, auch wenn sie noch nicht veröffentlicht sind.

## F3: Freie Gestaltung und Druck

Vorlagen für 4/6 Artikel mit Folgeseiten; zusätzlich freie Elementgestaltung.
Elemente lassen sich auswählen, positionieren, skalieren, drehen, duplizieren,
ein-/ausblenden und in der Ebenenreihenfolge verändern. Eigene Bilder und Texte,
Schriften, Farben und Transparenz sind einstellbar. Touch-/Tastaturkontrollen
ergänzen das Ziehen. Preis-/Pfand-/Grundpreisfelder bleiben an Artikeldaten
gebunden, statt als unabhängige Zahlen auseinanderzulaufen.
Individuelle Einstellungen bleiben beim Speichern und Kanalwechsel erhalten.
Erneutes Anwenden einer Vorlage darf freie Gestaltung nur nach Bestätigung ersetzen.
Wichtige Pflichtangaben dürfen beim Ausgeben nicht fehlen oder abgeschnitten sein.
A4-Druck über den Browserdialog, auch als PDF; keine externen PDF-Dienste.

- TC-F3-01: Titel/Farben/Highlight wirken konsistent in Vorschau und Druck.
- TC-F3-02: Sieben Artikel erzeugen vollständige Folgeseiten.
- TC-F3-03: Bisherige Wochenangebotsvorlagen bleiben unverändert nutzbar.
- TC-F3-04: Freie Position/Größe/Rotation, eigene Bilder, Text und Duplikate
  speichern und nach erneutem Öffnen wiederfinden.
- TC-F3-05: Druck und Originalansicht erhalten das freie Layout unverändert.
- TC-F3-06: Fehlende oder nicht lesbar platzierte Pflichtangaben verhindern Ausgabe.

## F4: Speichern und Sichtbarkeit

Neue Aktionen verwenden die bestehende Dataverse-Datenhaltung. Speichern
übernimmt die vollständige gültige Aktion; im Gültigkeitszeitraum ist sie
für Kunden sichtbar. Kein zusätzlicher Veröffentlichungsknopf. Layout und
Artikel dürfen bei einem fehlgeschlagenen Speichern nicht teilweise als
erfolgreich übernommen werden. F18 konkretisiert diesen Vertrag.

### Erhaltener Feature-Altbestand

Verwaltungszugriffe, einschließlich Lesen von Entwürfen und Bildern, erfordern
eine serverseitig geprüfte CMS-Anmeldung. Speichern veröffentlicht nichts.
Freigabe erstellt eine unveränderliche Version und schaltet den
Veröffentlichungszeiger atomar um. Versionskonflikte überschreiben keine fremden
Änderungen. Öffentliche Antworten enthalten ausschließlich Kundendaten der
freigegebenen, aktuell gültigen Fassung, keine Entwürfe oder Einkaufspreise.
Zeitraum in Europe/Berlin, Enddatum einschließlich. Geplante Angebote erscheinen
erst ab Beginn, abgelaufene nicht mehr. Fehler werden sichtbar gemeldet.

- TC-F4-01: Neue Entwurfsänderungen und Entwurfsbilder sind nicht öffentlich lesbar.
- TC-F4-02: Veröffentlichung liefert einen vollständigen Snapshot; konkurrierendes
  Speichern und fehlgeschlagene Freigabe erhalten den vorherigen Stand.
- TC-F4-03: Beginn/Ende, Mitternacht und Sommer-/Winterzeit funktionieren.
- TC-F4-04: Lese-/Speicherfehler liefern keine Erfolgsmeldung oder leere Ersatzdaten.

## F5: Kundenansicht

Alle freigegebenen Wochen- und Getränkeangebote sowie Altangebote erscheinen
automatisch gemeinsam im gewählten Zeitraum, ohne Kategorieumschaltung.
Entwürfe bleiben intern; eine Freigabe gilt gemeinsam für Homepage und Kiosk,
es gibt keine zusätzliche Homepage-Freigabe. Karten zeigen Bild, Name, Gebinde,
Angebotspreis, separates Pfand und Grundpreis. Smartphones einspaltig,
größere Bildschirme mehrspaltig. Desktopbereich und mobiles Angebotspopup
verwenden denselben Datenzugriff und Renderer.
"Flyer ansehen" öffnet zusätzlich das freie Original mit Seitennavigation.
Mobil bildschirmfüllend, vergrößerbar, mit erreichbarem Schließen.
Das A4-Layout wird nicht zur einzigen, unleserlichen Handyansicht.
Bestehende Wochenumschaltung für Altangebote bleibt nutzbar.

- TC-F5-01: Beide Angebotsarten gemeinsam ohne Benutzeraktion sowie
  mehrseitigen Flyer anzeigen; keine Kategorieauswahl vorhanden.
- TC-F5-02: Lange Namen, mehrere Aktionen und leere Zeiträume verständlich darstellen.
- TC-F5-03: Keine Verwaltungsfunktionen oder internen Daten in Kundenantworten.
- TC-F5-04: 375×667: eine Kartenspalte, lesbare Pflichtpreise, kein horizontaler
  Seitenüberlauf, mindestens 44 px große zentrale Touchziele.
- TC-F5-05: Original mobil öffnen, zoomen, blättern und schließen; Layout erhalten.

## F6: Waage und Gültigkeit

Explizite Ausgabe als Einzelartikel oder gesamter Flyer (eingepasste A4-Seiten,
Lesbarkeitshinweis). Bestehende Profile und Relais/Brücke verwenden:
800×600/800×480, Dauerwerbung 800×462/800×280, Export jeweils doppelt aufgelöst.
Druck und Homepage-Freigabe lösen keinen Versand aus.
Dateien sind Namespace, Aktion, Ausgabeversion und Zeitraum zugeordnet.
Ersetzen entfernt ausschließlich die vorherige Ausgabe derselben Aktion.
Geplante/abgelaufene zugeordnete Bilder gehören nicht zum aktiven Sollzustand;
unzugeordnete Werbung bleibt unverändert. Ablauf funktioniert ohne offenen Kiosk.
Bei Offline-Brücke kann die physische Änderung erst nach Wiederverbindung
bestätigt werden. Cloud-Upload ist keine Bestätigung der Waage.

- TC-F6-01: Beide Darstellungen und alle Profile haben passende Exportmaße.
- TC-F6-02: Bereit/Warteschlange/Bestätigung/Offline/Fehler unterscheiden.
- TC-F6-03: Ablauf einer Aktion erhält andere Aktionen und Dauerwerbung.
- TC-F6-04: Offline zum Ablauf, danach Reconnect entfernt abgelaufene Bilder.
- TC-F6-05: Keine ungefragten Sendungen; Ersatz nur innerhalb einer Aktion.

## F7: Bestandsschutz

Bestehende Angebots-API und Daten unverändert lassen. Altaktionen gelten als
Wochenangebote. Keine automatische Übernahme in die neue Speicherung und keine
konkurrierenden Schreibwege auf Altaktionen. Ein neuer Datensatz ist explizit
neu; der bisherige Editor bleibt der Rückweg für den Altbestand.

- TC-F7-01: Altbestand ohne neue Felder weiterhin laden.
- TC-F7-02: Dieselbe Altaktion erscheint nicht doppelt.
- TC-F7-03: Bestehender Editor und seine Vorlagen bleiben erreichbar und unverändert.

## F8: Isolierte Entwicklung und Bereitstellung

Branch `feature/getraenke-angebotsflyer`, eigener Worktree.
Deployment ausschließlich als Azure-PR-Vorschau, ohne Merge in `main`.
Neue Dokumente und Bilder liegen in einem Preview-spezifischen Datenbereich;
Artikel/Altangebote werden nur gelesen. Keine schreibenden Live-Integrationstests.
Echter Waagenversand ist in der Vorschau serverseitig abgeschaltet; Vorschau und
Export bleiben möglich. In einer später ausdrücklich freigegebenen Umgebung
kann der Versand gezielt aktiviert werden.

- TC-F8-01: Namespaces können keine Dokumente/Bilder anderer Umgebungen lesen/ersetzen.
- TC-F8-02: Preview blockiert echten Versand, ohne andere Werbung zu verändern.
- TC-F8-03: Feature-Branch-Preview erreichbar; `main` und Produktion unverändert.

## F9: Bestehender CMS-Designeditor

Im gezeigten CMS-Bereich Design -> Plakate & Flyer kommt ein Reiter
"Getränkeflyer" hinzu, kein ausschließlich separater Einstellungsweg.
Er bietet Vorlage, Farben, Schriften, Preisgestaltung, Gebinde-/Pfand-/
Grundpreis-Typografie und eine umschaltbare Live-Vorschau für A4, mobile
Kundenkarten und Waagenprofile. Speichern übernimmt Standards ausdrücklich.
Bestehende Plakat-/Einzelflyer-/Gemeinsame Einstellungen werden nicht ersetzt.

Neue Wochen- und Getränkeaktionen können getrennte Standards verwenden.
Standards werden beim Erstellen kopiert. Spätere Änderungen verändern weder
bestehende individuelle Gestaltungen noch veröffentlichte Snapshots.
Eine bestehende Aktion übernimmt neue Standards nur nach ausdrücklicher
Bestätigung; freie Bearbeitung bleibt je Aktion möglich.

- TC-F9-01: Neuen Getränkeflyer-Reiter im vorhandenen Designeditor öffnen,
  Standards ändern, speichern und nach erneutem Öffnen wiederfinden.
  Die erste CMS-Anmeldung wird vor geschützten Designabrufen abgeschlossen,
  ohne doppelte Passwortabfrage; Anmeldefehler bleiben sichtbar und wiederholbar.
  Eine vorhandene serverseitige Anmeldung wird auch nach Seiten-/Tabwechsel
  wiederverwendet. Eine alte rein lokale Freigabe reicht nicht als Anmeldung:
  Fehlt die Serversitzung oder ist sie ungültig, erfolgt die Anmeldung einmal
  am CMS-Eingang, nicht zusätzlich im Getränkeflyer. Ein falsches Passwort oder
  ein Serverfehler lässt die Hauptanmeldung offen, ohne weiteren Passwortdialog.
  Passwort und Token erscheinen weder in URLs noch in Meldungen.
- TC-F9-02: A4-/Karten-/Waagenvorschau aktualisiert sich ohne Veröffentlichung.
- TC-F9-03: Änderungen neuer Standards lassen bestehende Layouts, Veröffentlichungen
  und bisherige Plakat-/Einzelflyer-Einstellungen unverändert.

## F10: Übersichtliche Layoutauswahl

Im Getränkeflyer-Designeditor und im einzelnen Aktionseditor stehen die
bestehenden Stile Landladen/Klassisch als echte Vorschaukacheln zur Auswahl.
Stil und Seitenaufteilung (4 großzügige / 6 kompakte Artikel) sind getrennt.
Nur die aktive Auswahl erhält eine eindeutige Aktiv-Markierung; Hover und
Tastaturfokus bleiben unterscheidbar. Es gibt keine doppelte Dropdown-Auswahl.
Layout, Farben und Schrift sind direkt sichtbar, Detailgrößen und Drehung
stehen unter einer zunächst geschlossenen Feinabstimmung.

Beide Editoren bieten sichtbare Vorschau-Umschalter A4/PDF, Handy/Kiosk und
Waage mit den vorhandenen Profilen. Die A4-Vorschau bleibt frei bearbeitbar;
andere Ansichten sind reine Vorschauen, keine unabhängigen Layouts.
Zum damaligen Ausbaustand keine neuen Stilvorlagen; F13 erweitert diese Auswahl.
Keine Änderung bestehender Kundenlayouts,
Speicher-/Freigabeverträge oder der Bestätigungen beim Ersetzen freier Layouts.

- TC-F10-01: Beide Stile über Kacheln mit echten Miniatur-Canvas wählen,
  aktive Markierung und gespeicherte Auswahl nach erneutem Öffnen prüfen.
- TC-F10-02: 4/6 Artikel unabhängig vom Stil wählen; Farben/Schrift sichtbar,
  Feinabstimmung geschlossen und bedienbar, Tastaturauswahl möglich.
- TC-F10-03: Alle Vorschauarten in beiden Editoren umschalten; keine Änderung
  des Entwurfs durch Vorschauwechsel; freie A4-Bearbeitung und geschützte
  Vorlagenersetzung bleiben erhalten.
- TC-F10-04: Alle Bedienelemente auf vier Zielgrößen ohne horizontalen
  Überlauf, mit mindestens 44 px hohen Klickflächen und eindeutigem Fokus.

## F11: Artikelstamm, freie Kundenkacheln und Mockup-Layout

Der neue Wochen-/Getränkeeditor wird im Aufbau und in der Bedienung 1:1 am
freigegebenen Mockup V2 ausgerichtet: kompakter Kopf mit Entwurfsaktionen,
dreistufige Navigation, links kompakte Artikelliste/Formulare und rechts die
Vorschau. Name, Beschreibung, Angebotspreis und Stattpreis/UVP werden direkt
in jeder Artikelzeile bearbeitet, ohne einen Dialog öffnen zu müssen.
Getränke-Gebinde, Pfand und Identifikationsdaten sind direkt in derselben
Zeile aufklappbar. Tab wechselt zwischen den Eingaben, ohne Fokusverlust oder
Neuaufbau der Artikelliste. Rabatt und Literpreis aktualisieren sich aus den
Eingaben; der reguläre Stamm-VK bleibt unverändert. Der bisherige Dialog
bleibt als optionale Bild-/Detailbearbeitung erhalten. Alle Änderungen
bleiben bis zum ausdrücklichen Speichern lokal im Entwurf.

Stil und Layoutwechsel dürfen diese Flächenordnung nicht verändern. Auch auf
Mobilgeräten sind die Felder ohne horizontalen Überlauf und mit mindestens
44 px Bedienhöhe erreichbar. Lesbare Direkteingaben haben Vorrang vor der
bisherigen Vier-Artikel-ohne-Scrollen-Regel; zusätzliche Felder bleiben kompakt
einklappbar. Ein Neuaufbau nach Speichern übernimmt die bearbeiteten Werte.

Neue Artikel werden über `/api/preisliste?all=1` aus demselben Artikelstamm wie
die bisherigen Angebote gesucht, per Name/Artikelnummer/EAN gefiltert und
mehrfach ausgewählt. Getränke werden nicht aus `/api/getraenke-artikel` oder
dem Kratzer-Bestellkatalog übernommen. Der Dialog zeigt den Stamm-VK und eine
explizite Wahl, ob dieser als Angebotspreis vorbelegt wird. Der Nutzer kann
Angebotspreis, Stattpreis und Angebotsdaten frei bearbeiten.

Stammbilder werden mit der bestehenden `/api/werbebilder`-Suche
(Dataverse-/SharePoint-Fallback) geladen und als private Angebotsbilder
gespeichert. In manuellen und übernommenen Artikeln sind Bildvorschau,
Datei-/Zwischenablage-Übernahme, Suche nach Nummer/EAN, Ersetzen und Entfernen
sichtbar. Die Suche bleibt lesend. Eigene Produktbilder mit Strichcode
aktualisieren zusätzlich das gemeinsame Bild in `StrichcodeBilder`;
Preis- und Artikelstammdaten bleiben unverändert.
Die automatische Übernahme funktioniert auch für Stammartikel ohne
Artikelnummer, aber mit EAN/Strichcode (einschließlich kurzer eigener Codes).
Beim Öffnen eines Entwurfs werden fehlende Bilder anhand dieser Kennungen
erneut gesucht; vorhandene eigene Bilder werden niemals ersetzt. Gefundene
Bilder bleiben private Entwurfsänderungen bis zum Speichern. Kein Treffer
wird sichtbar gemeldet, technische Fehler nicht als „kein Bild“ verschluckt.

Homepage-/Kioskkachel, Einzelflyer, Sammelflyer und Waage sind eigenständige,
speicherbare Gestaltungsflächen. Kachel-, Einzel- und Waagenelemente werden je
Artikel frei gewählt, verschoben, skaliert, gedreht, eingefärbt, aus-/eingeblendet,
dupliziert und in der Ebene angeordnet. Das Kachellayout bleibt getrennt von
Einzelflyer, Sammelflyer und Waagenprofilen erhalten. Die Kundenansicht
verwendet die veröffentlichte Kachelgestaltung; fehlende Ziellayouts alter
Datensätze fallen auf die bisherige automatische Ausgabe zurück.

Die Vorschau bietet ihre Gestaltungswerkzeuge unmittelbar in jeder
Bearbeitungsansicht, ohne Pflichtwechsel zu „Frei gestalten“. Das Produktbild
ist zunächst ausgewählt. Drehen, proportional vergrößern/verkleinern,
Bilddatei einfügen/ersetzen und Duplizieren sind direkt erreichbar.
Ein sichtbarer Größenanfasser funktioniert mit Maus und Touch. Exakte Werte,
Deckkraft, Texte und Ebenen bleiben unter weiteren Werkzeugen erreichbar.
Änderungen betreffen ausschließlich das gewählte Ausgabeziel und den Artikel;
Rückgängig, Speichern/Öffnen und freigegebene Fassungen bleiben erhalten.

- TC-F11-01: Artikelsuche über Name, Nummer und EAN; Mehrfachauswahl übernimmt
  Stammfelder, zeigt VK als Vergleich und übernimmt ihn nur nach ausdrücklicher
  Auswahl als Angebotspreis. Kein Aufruf des Kratzer-Katalogs.
- TC-F11-02: Stamm- und manuelle Artikel zeigen Bildvorschau, Suche, Datei-/
  Zwischenablage, Ersetzen und Entfernen. Bildänderung speichert nur einen
  privaten Snapshot; eigene Produktbilder mit Strichcode aktualisieren
  zusätzlich das gemeinsame SharePoint-Bild, gefundene Bilder nicht.
- TC-F11-03: Alle vier Ziele frei und unabhängig bearbeiten, speichern und
  wieder öffnen; veröffentlichte Kacheln in der Kundenansicht rendern und
  Einzelflyer/Waagenbilder aus ihren jeweiligen Layouts ausgeben.
  Altveröffentlichungen ohne Ziellayouts funktionieren.
- TC-F11-04: Artikelübersicht und Dialog entsprechen dem Mockup-Aufbau auf
  vier Viewports, ohne horizontalen Überlauf und mit mindestens 44 px
  Bedienflächen; Kernfelder sind direkt in der Liste bedienbar.
- TC-F11-05: Zwei Artikel ohne Dialog nacheinander bearbeiten, Tab-Navigation,
  Beschreibung, Preis/Stattpreis und Rabatt prüfen; bei Getränken Gebinde,
  Literpreis, Pfand und Pfandfreiheit direkt ändern. Speichern/erneut öffnen
  erhält die Werte, Veröffentlichung, Stamm-VK und andere Artikel bleiben
  unverändert. Optionale Bildbearbeitung übernimmt aktuelle Inlinewerte.
- TC-F11-06: Bildübernahme für EAN ohne Artikelnummer, kurzen Strichcode und
  Artikelnummer mit EAN prüfen, einschließlich leerem Dataverse-Treffer mit
  anschließendem SharePoint-Bild. Beim Öffnen fehlende Bilder nachladen,
  vorhandene eigene Bilder und veröffentlichte Fassungen erhalten; fehlende
  Treffer und technische Fehler erkennbar melden. Keine Rückschreibung
  automatisch gefundener Bilder.
- TC-F11-07: Liste und Artikeldialog zeigen `0,5` statt `0.5`. Komma- und
  Punkteingaben, `0,029` Liter, Grundpreis und Gebindeausgabe prüfen.
  Speichern/erneut öffnen erhält ganze Milliliter und die Kommaschreibweise;
  ungültige Eingaben werden gemeldet. Die freigegebene Fassung bleibt unverändert.
- TC-F11-08: Ohne Schrittwechsel direkt an der Vorschau drehen, proportional
  skalieren, per Größenanfasser ändern, Bild einfügen/ersetzen und duplizieren.
  Maus und Touch, vier Ausgabeziele, Rückgängig und Speichern/Öffnen prüfen.
  Andere Ziele/Artikel und Veröffentlichungen bleiben unverändert.

## F13: Originalvorlagen und Dorfladen-Logo

Der neue Editor bietet zusätzlich zu Landladen/Klassisch die neun Vorlagen
des bisherigen Angebotseditors als frei bearbeitbare Startpunkte an:
Classic Red, Minimal Clean, Dark Modern, Organic Market, Bold Poster,
Modern Magazine, Mag Fresh, Mag Bold und Mag XL. Namen, Grundfarben und die
Unterscheidung zwischen klassischem Angebotslayout und Magazinlayout bleiben
erkennbar. Mag XL verwendet eine größere Bildfläche. Alle Vorlagen stehen
für Wochen- und Getränkeangebote sowie 4/6 Artikel bereit.

Die Auswahl ist unter „Frei gestalten“ direkt erreichbar, nicht nur in einer
zunächst geschlossenen Einstellungsgruppe. Vorschaukacheln zeigen das
tatsächliche Design. Die Auswahl einer Vorlage aktualisiert die Startwerte;
bereits frei positionierte Elemente werden weiterhin erst durch bestätigtes
Anwenden ersetzt. Änderungen betreffen nur das gewählte Ausgabeziel.
Bestehende gespeicherte Layouts bleiben beim Öffnen unverändert.
Auch die Hintergrundfarbe anderer Ziele bleibt erhalten. Der Rabatt wird wie
im Original aus Angebots-/Stattpreis berechnet, nicht unabhängig erfasst;
ohne positive Ersparnis wird kein Rabatt angezeigt.

Wie im Original verwenden Sammel- und Einzelflyer das echte Dorfladen-Logo
im Kopfbereich. Verwendet wird dieselbe hochauflösende Originaldatei wie beim
bisherigen Druck. Das Logo wird proportional, ohne Beschnitt und ohne
Überlagerung von Titel, Zeitraum oder Artikeldaten dargestellt. Es ist ein
eigenes verschieb-/skalier-/dreh-/ausblendbares Element und wird identisch
in Vorschau, Originalansicht, Druck/PDF und Waagenexport übernommen.
Keine zusätzliche Logo-Wiederholung auf jeder kleinen Kundenkarte.
Ein fehlendes/unlesbares Logo löst eine verständliche Fehlermeldung aus;
es wird nicht stillschweigend ohne Logo exportiert.

- TC-F13-01: Alle neun Originalstile und beide bisherigen neuen Stile sind
  in Aktionseditor und CMS auswählbar, mit echten Miniaturen und eindeutiger
  Aktiv-Markierung. Auswahl, Farben und freie Elemente bleiben nach Speichern
  und Öffnen erhalten; unbekannte Vorlagen werden serverseitig abgelehnt.
- TC-F13-02: Jede Vorlage mit beiden Angebotsarten, 4/6 Artikeln und Folgeseiten
  rendern; Namen, Preise und Getränkepflichtfelder passen. Klassische und
  Magazinvorlagen sowie die größere XL-Bildfläche unterscheiden sich sichtbar.
- TC-F13-03: Original-Logo auf jeder neuen Sammelflyerseite und jedem
  Einzelflyer prüfen; keine Wiederholung auf Kundenkarten. Lage/Größe ändern,
  speichern, öffnen und in Druck-/Waagenausgabe wiederfinden. Alte Layouts
  werden nicht ungefragt verändert; Logo-Ladefehler verhindern eine
  unvollständige Ausgabe und erlauben erneutes Laden.
- TC-F13-04: Vorlagenauswahl und Logo auf den vier Zielgrößen ohne horizontalen
  Überlauf oder abgeschnittene Bedienelemente bedienen; bestehender
  Bestätigungsdialog schützt frei gestaltete Ziele.

### F13: Lesbare Großvorschau der Vorlagen

Ein Doppelklick auf eine Vorlagenkachel öffnet in CMS und Aktionseditor eine
große, scharf gerenderte Vorschau. Zusätzlich hat jede Vorlage eine per
Tastatur und Touch erreichbare Schaltfläche „Vergrößern“. Die Vorschau bietet
Vergrößern/Verkleinern, 100 % und Einpassen; bei Übergröße wird nur innerhalb
der Vorschau gescrollt. Schließen und Escape stellen den Fokus wieder her.
Die Vorschau selbst speichert, veröffentlicht oder ersetzt keine Gestaltung;
die normale Vorlagenauswahl per Klick bleibt erhalten.

- TC-F13-05: In beiden Editoren Doppelklick, Touch-/Tastaturzugang, scharfes
  Neurendern statt Thumbnail-Streckung, Zoom/Einpassen, Escape/Schließen und
  Fokuswiederherstellung auf allen vier Viewports prüfen. Vergrößern einer
  anderen Vorlage verändert weder Auswahl noch Entwurf/Designstandards.

## F14: Tatsächliche CMS-Wochenvorlagen und Kioskeinbettung

F14 ersetzt für Wochenangebote die nachgebildeten Startlayouts aus F13.
Die neue Oberfläche bleibt erhalten. Neue Wochenaktionen übernehmen automatisch
die gespeicherten CMS-Einstellungen für Plakat und Einzelflyer einschließlich
Vorlagenauswahl, Farben/Verläufen, Preisschildern, Bildaufbereitung und
artikelbezogenen Positionen. Vorschau, Druck und Waagenausgabe verwenden die
tatsächlichen gemeinsamen CMS-Zeichenfunktionen, keinen nachgebauten
Getränkerenderer und keinen versteckten CMS-iframe. Das klassische Plakat
behält insbesondere ANGEBOT, Logo und das 2-mal-3-Raster.

Die übernommenen Einstellungen sind ein Aktionssnapshot; spätere CMS-Änderungen
verändern weder gespeicherte Entwürfe noch Veröffentlichungen. Bereits frei
gestaltete Wochenaktionen werden nicht automatisch überschrieben: Eine
ausdrückliche, bestätigte Übernahme der CMS-Vorlage ist möglich.
Getränkegestaltungen bleiben unverändert. Ladefehler der CMS-Einstellungen
werden angezeigt und führen nicht zu einer Getränke-Ersatzvorlage.
Für die Originalvorlagen werden deren Einstellungen und Artikelpositionen
angeboten, keine wirkungslosen Werkzeuge des anderen Renderers.

Der Kioskreiter Angebote öffnet die gemeinsame Angebotsverwaltung als normalen
Inhaltsbereich innerhalb des Kiosks. Kopf, Navigation und Reiterwechsel bleiben
erhalten. Beim Wechsel zu anderen Funktionen und zurück bleibt ein ungespeicherter
Entwurf erhalten. Der direkte eigenständige Aufruf bleibt nutzbar.

- TC-F14-01: Neue Wochenaktion übernimmt unterschiedliche gespeicherte Plakat-
  und Flyervorlagen samt Farben, Schildern und Artikelpositionen. Vorschau und
  Druck verwenden dieselben Original-Zeichenfunktionen wie das CMS.
- TC-F14-02: Klassische und Magazinvorlagen, Centpreise, Bilder, Rabatte und
  Folgeseiten mit mehr als sechs Artikeln prüfen. Getränke bleiben unverändert.
- TC-F14-03: Snapshot speichern, öffnen, veröffentlichen und öffentlich rendern;
  spätere CMS-Änderungen ändern ihn nicht. Alte freie Wochenlayouts bleiben
  erhalten, bis ihre bestätigte Übernahme erfolgt. Ladefehler sichtbar melden.
- TC-F14-04: Aus dem Kiosk Angebote öffnen, bearbeiten, anderen Reiter öffnen
  und zurückkehren: URL, Kioskmenü und Entwurf bleiben erhalten. Auf allen
  vier Viewports auch eigenständigen Einstieg und Überlauf prüfen.

## F15: Kompakte Aktionsübersicht

Die Verwaltung übernimmt die kompakte Zeilenstruktur der alten CMS-Übersicht.
Eine kleine Werkzeugleiste ersetzt die großen Einstiegskacheln. Jede Aktion
zeigt Titel, Art, Zeitraum, Artikelzahl und Freigabestatus zusammen mit
Bearbeiten, Vorschau, Teilen/Download, Waage, Duplizieren und Löschen.
Desktop und ausreichend breite Tablets zeigen die Funktionen in einer Zeile;
mobil dürfen sie platzsparend umbrechen, bleiben aber mindestens 44 px groß.
Diese Woche, nächste Woche und alle sind direkt auswählbare Zeitraumfilter.
Löschen verlangt eine ausdrückliche Bestätigung und eine aktuelle Version;
eine bestehende Homepagefreigabe endet damit, bereits versandte Waagenbilder
werden nicht implizit gelöscht. Vorschau/Teilen veröffentlichen nichts.

- TC-F15-01: Übersicht zeigt ohne Einstiegskacheln kompakte Zeilen, vollständige
  Direktaktionen und korrekte Wochenfilter auf den vier Viewports, ohne Überlauf.
- TC-F15-02: Vorschau, Teilen/Download, Bearbeiten, Duplizieren und Waage über
  die Zeile öffnen; keine unbeabsichtigte Freigabe. Löschen abbrechen und
  bestätigen, Versionskonflikt behandeln und öffentliche Freigabe entfernen.

## F16: Direkt bearbeitbare Vorschau und originaler Ersparnismarker

Auch die Vorschau der Designstandards ist eine Bearbeitungsfläche, nicht nur
ein Bild. Elemente auswählen, verschieben, drehen und proportional vergrößern/
verkleinern sowie per Größenanfasser ändern funktioniert mit Maus, Touch
und Tastatur. Änderungen werden erst mit den Designstandards gespeichert und
gelten danach für neue Aktionen, nicht rückwirkend für bestehende Aktionen.
In Original-Wochenvorlagen lassen sich mindestens dieselben Bild- und
Preiselemente wie im bisherigen Plakat-/Einzelflyereditor direkt bearbeiten;
numerische Positionen bleiben als Ergänzung erreichbar.

Der vorhandene CMS-Ersparnismarker wird gemeinsam verwendet, auch im
Getränkelayout. Typ, Farbwelt und Größe sind sichtbar auswählbar; die Optionen
entsprechen den vorhandenen Plakat-/Einzelflyereinstellungen. Die
Designvorschau enthält positive Stattpreise, damit der Marker tatsächlich
sichtbar und seine Wirkung prüfbar ist. Kein Marker ohne positive Ersparnis.
Vorschau, gespeicherte Aktion, Druck und Waage verwenden dieselben Werte.

- TC-F16-01: In CMS-Designvorschau ein Element mit Maus/Touch verschieben,
  drehen und skalieren, speichern und neu laden; neue Aktionen übernehmen
  das Layout, bestehende Aktionen bleiben unverändert.
- TC-F16-02: Bilder und Preise einer Original-Wochenvorlage direkt auswählen,
  verschieben, drehen und skalieren, speichern und erneut öffnen; die
  Original-Zeichenfunktionen verwenden die bearbeiteten Overrides.
- TC-F16-03: Ersparnismarker mit Stattpreis sichtbar, Typ/Farbwelt/Größe ändern,
  Vorschau und gespeicherte Ausgaben vergleichen; ohne positive Ersparnis
  kein Marker. Alle vier Viewports und Getränke-/Wochenvorlagen prüfen.
- TC-F16-04: „Vorlage auf Original zurücksetzen“ stellt nach Bestätigung die
  ausgewählte eingebaute Vorlage einschließlich Marker und freier Anpassungen
  in der Vorschau wieder her. Erst „Designstandards speichern“ ersetzt den
  bisherigen Startstandard. Vorlagenbibliothek, andere Angebotsarten und
  bestehende Aktionen bleiben unverändert. Die Oberfläche erklärt diesen
  Unterschied ausdrücklich.

## F17: Schnell erfassbare Artikelzeilen und farbige Direktaktionen

Die Artikelerfassung nutzt die gesamte verfügbare Breite statt einer schmalen
Spalte neben den Gestaltungswerkzeugen. Auf breiten Bildschirmen zeigt jede
Artikelzeile Bild, Name, Beschreibung, Angebotspreis, Stattpreis und Strichcode
direkt nebeneinander. Kein doppelter Artikelname als zusätzlicher Kartenkopf.
Bildbearbeitung und weitere Aktionen bleiben direkt erreichbar; Zusatzangaben
und berechnete Werte werden platzsparend dargestellt. Auf schmalen Geräten
brechen die Felder lesbar um, ohne horizontales Scrollen oder kleinere Touchziele.
Die Gestaltung bleibt unverändert erreichbar und wird nicht automatisch gespeichert.

Die Artikelstammauswahl bleibt über mehrere Suchbegriffe hinweg erhalten.
Ein Auswahltipp aktualisiert nur den betroffenen Treffer und Auswahlzähler,
ohne die Trefferliste neu aufzubauen oder Scrollposition/Fokus zu verlieren.
Mehrere Artikel werden gemeinsam übernommen; Vorlagen und Vorschau werden dabei
nur einmal für die gesamte Übernahme aktualisiert.

Die Übersicht kennzeichnet Vorschau schiefergrau, Teilen grün, Waage warm
orange und Löschen rot. Beschriftung, Tastaturfokus und ausreichender Kontrast
bleiben erhalten; Farbe ist nicht das einzige Unterscheidungsmerkmal.

- TC-F17-01: Sechs Artikel auf Desktop als kompakte Zeilen (höchstens 110 px
  je geschlossener Zeile) mit direkt sichtbaren Kernfeldern; auf allen vier
  Viewports keine abgeschnittenen Felder, Touchziele mindestens 44 px,
  Bearbeiten/Tab/Speichern/Neuöffnen ohne Datenverlust.
- TC-F17-02: Mehrere Artikel über unterschiedliche Suchen auswählen, ohne
  Fokus-/Scrollverlust; gemeinsam übernehmen, Reihenfolge und Preise erhalten,
  keine implizite Speicherung oder Freigabe.
- TC-F17-03: Übersicht hat unterscheidbare Aktionsfarben; bestehende Direkt-
  aktionen, Bestätigungen und Tastaturbedienung bleiben unverändert.

## F18: Originaler CMS-Ablauf mit Getränkeauswahl

F18 ersetzt widersprechende Ablauf-/Speichervorgaben aus F1, F4, F10, F11
und F17 für neue Aktionen. Bestellungen bleiben unverändert.

Der gemeinsame Einstieg aus CMS, Kiosk und Angebotsseite führt zur kompakten
Aktionsübersicht mit farbigen Direktaktionen. „Neue Aktion erstellen“ bietet
Sonderaktion/Getränkeaktion. Es folgt der vertraute Dialog mit Titel, Zeitraum,
Speichern/Abbrechen, nummerierten Zeilen, direkter Produktsuche, Details,
Angebots-/Stattpreis, Strichcode, Bildsuche/Datei/Zwischenablage, Entfernen
und Sortieren. Sonderaktionen starten mit sechs leeren Zeilen; Getränke
zusätzlich mit Gebinde-/Inhalts-/Pfandangaben.

Im Getränkedialog wird 4 Kacheln (2×2) oder 6 Kacheln (2×3) gewählt.
Dies bestimmt vorbereitete Zeilen und Sammelflyer-Raster, nicht die maximale
Artikelzahl. Wechsel erhalten alle Artikel und deren Daten; sechs Artikel
bei vier Kacheln ergeben Folgeseiten mit 4+2 Artikeln. Die Wahl bleibt beim
Speichern/Öffnen erhalten. Alte Aktionen ohne Auswahl behalten ihr Layout.

Neue Artikel stehen ausschließlich in den bestehenden Dataverse-Angeboten;
aktionsbezogene Layoutmetadaten verwenden vorhandene Dataverse-Konfiguration.
Es gibt keinen parallelen Blob-Schreibpfad. Speichern veröffentlicht gültige
Aktionen innerhalb ihres Zeitraums wie das bisherige CMS. Fehler/Konflikte
bleiben sichtbar; kein teilweise erfolgreiches Speichern.

Danach dient die vertraute Vorschau als Arbeitszentrum: Karten anklicken,
Sammel-/Einzelflyer gestalten, Elemente verschieben/drehen/skalieren,
Ersparnismarker einstellen, Download/Druck/Teilen/Waage. Sonderaktionen
verwenden Original-CMS-Vorlagen; Getränke behalten Getränkevorlagen.
Einzelflyer sind vom Sammelraster unabhängig. Der Kiosk bleibt eingebettet.
Bestehende Feature-Aktionen bleiben gekennzeichnet erreichbar und werden
nicht automatisch migriert oder freigegeben.

Ein Preview-Rollout mit gemeinsamem produktivem Dataverse-Bestand und die acht
optionalen Schemaergänzungen benötigen ausdrückliche Freigabe. Bestehende
Angebote werden nicht migriert oder für Schreibtests verwendet. Schreibtests
erfolgen ausschließlich isoliert; ein Feature-Rollout ändert main nicht.

- TC-F18-01: Beide Arten über gemeinsamen Einstieg mit passenden Dialogen
  anlegen; direkte Suche nach Name/Artikelnummer/EAN und Bildfunktionen.
- TC-F18-02: Vier/sechs vorbereitete Getränkezeilen und Raster 2×2/2×3;
  verlustfreier Wechsel 6→4 (4+2) und 4→6; alle Ausgabeseiten vollständig.
- TC-F18-03: Dataverse-Felder und Raster speichern/öffnen, alte Sonderaktionen
  ohne neue Felder kompatibel; transaktionales Speichern/Löschen und Fehlerfall.
- TC-F18-04: Vorschau-Kartenklick, Einzel-/Sammelflyerbearbeitung, Marker und
  Ausgaben für beide Arten; gespeicherte Layouts beeinflussen keine andere Aktion.
- TC-F18-05: Eingebetteter Kiosk und CMS, keine Doppelanzeigen, unveränderter
  Bestellablauf, Feature-Bestand erhalten, kein echter Preview-Waagenversand.
  Der Kioskreiter „Angebote“ steht als letzter Menüpunkt unter „Werbebilder“.
- TC-F18-06: Neue Aktionen im Gültigkeitszeitraum ohne zusätzliche Freigabe
  sichtbar; ungültige Daten und fehlendes Schema verhindern den Schreibvorgang
  mit verständlicher Meldung. Keine unautorisierten Schreibzugriffe.
- TC-F18-07: Die Übersicht zeigt vorhandene Aktionen ohne Vorlagen- oder
  Bildabrufe; langsame CMS-Konfiguration darf die Liste nicht blockieren.
  Originalvorlagen werden erst beim Öffnen einer Aktion geladen.
- TC-F18-08: Bestehende Artikelbilder auch ohne Werbebildverknüpfung automatisch
  aus SharePoint lesen; abgelaufene Download-URLs erneuern. Bildfehler sichtbar
  an der betroffenen Zeile anzeigen, keine ungefragten Stammbild-Schreibzugriffe.
- TC-F18-09: Ursprüngliche CMS-Darstellung beibehalten: kompakte Aktionszeile
  mit aufklappbaren Artikeln und farbigen Direktaktionen sowie ursprüngliche
  kompakte Erfassungszeilen. Nur Getränkezusatzfelder und 4/6-Auswahl ergänzen;
  keine neue Oberflächengestaltung.
- TC-F18-10: Neue Artikel behalten ihre Kennung beim Speichern. Dadurch kann
  die direkt nach dem Erfassen geöffnete Vorschau die Gestaltung ohne
  Konflikt speichern, mehrfach hintereinander; Layout- und Bildbezüge bleiben
  nach erneutem Öffnen derselben Artikel zugeordnet. Konflikte erscheinen als
  verständliche deutsche Meldung ohne technische Details.
- TC-F18-11: Meldungs- und Bestätigungsfenster der Angebotsverwaltung stehen
  in CMS, Kiosk und Angebotsseite mittig im sichtbaren Bereich, nicht in einer
  Ecke, auf allen vier Viewports.

## F19: Direktbearbeitung mit gleichzeitig sichtbarer Vorschau

Die Aktionsvorschau bietet eine dauerhafte Werkzeugleiste neben dem Motiv.
Das Motiv beansprucht mindestens die halbe Arbeitsbreite und wird so groß,
wie es ohne Scrollen ins Fenster passt; Eingabefelder und Schaltflächen sind
kompakt (höchstens 40 px hoch), damit auf großen Bildschirmen nichts gescrollt
werden muss. Ab 600 px stehen Werkzeuge und Motiv nebeneinander; auf schmaleren Geräten
bleibt das Motiv oberhalb der unabhängig scrollbar bedienbaren Werkzeuge
sichtbar. Aufklappen oder Scrollen der Formatierung verschiebt das Motiv nicht.
Die ursprüngliche Übersicht und Erfassung bleiben unverändert.

Elemente lassen sich mit Maus und Touch direkt auswählen, verschieben,
am Größenanfasser skalieren und am Drehgriff frei drehen. Die Vorschau
aktualisiert sich während der Bewegung. Farben, Schrift, Dreh-/Größenknöpfe
und Feinabstimmung sind in der Werkzeugleiste erreichbar. Artikeldaten können
dort ebenfalls geändert werden. Original-Wochenvorlagen behalten ihre Renderer
und Artikel-Overrides; Getränke ihre unabhängigen Ausgabeziele.
Änderungen bleiben bis „Gestaltung speichern“ lokal; Rückgängig sowie
Speichern/Öffnen erhalten Artikel und Layout ohne Änderungen anderer Ziele.

- TC-F19-01: Echtes Pointer-Ziehen, Skalieren und freies Drehen in der
  gemeinsamen Aktionsvorschau mit Maus und Touch; Auswahlrahmen und Motiv
  aktualisieren sich, ohne beim Auswählen wegzuspringen.
- TC-F19-02: Seitliche Werkzeugleiste auf drei großen Zielgrößen, fest
  sichtbares Motiv über den Werkzeugen auf Mobilgeräten. Farben und
  Feinabstimmung bedienen/scrollen, ohne das Motiv aus dem sichtbaren Bereich
  zu bewegen; keine Überläufe oder abgeschnittenen Bedienelemente.
- TC-F19-03: Artikelname/Preis und Elementfarbe ändern, rückgängig machen,
  Gestaltung speichern und erneut öffnen. Werte und Transformationen bleiben
  erhalten, andere Ausgabeziele unverändert; keine impliziten Schreibzugriffe.
- TC-F19-04: Original-Wochenvorschau mit derselben seitlichen Bedienung,
  direktem Drehgriff und Größenanfasser bearbeiten; Original-Overrides und
  bestehende Vorschau-/Kioskfunktionen erhalten.
- TC-F19-05: Der Kopf der Magazinvorlagen richtet Logo, Titel und Zeitraum
  auf einer gemeinsamen vertikalen Mittellinie aus. Der Titel „Getränkeangebote“
  bleibt einzeilig ohne Umbruch mitten im Wort, Logo und Zeitraum haben denselben
  seitlichen Rand und die Textfelder überlappen sich nicht.

## F20: Bildbetonte Standardvorlagen (Bild 50 % der Breite)

Zusätzlich zu den bestehenden Vorlagen stehen drei Standardvorlagen
„Bild 50 % · Rot“, „Bild 50 % · Grün“ und „Bild 50 % · Blau“ bereit. In
ihnen nimmt das Produktbild genau die halbe Breite der jeweiligen Fläche ein
(Sammelflyer-Kachel, Homepage-/Kioskkachel, Einzelflyer, Waagenmotiv). Die
übrigen Elemente sind harmonisch verteilt: Bild links, rechts davon Name,
Gebinde bzw. Beschreibung, darunter ein durchgehendes Preisband mit Preis und
Stattpreis, danach Pfand, Literpreis und Zeitraum. Der Ersparnismarker liegt
auf dem Bild. Die Vorlagen funktionieren mit 4 und 6 Kacheln, für Getränke und
Wochenangebote ohne originale CMS-Vorlage und sind wie alle Vorlagen danach
frei bearbeitbar. Bestehende Vorlagen, gespeicherte Layouts und die originalen
CMS-Wochenvorlagen bleiben unverändert; die neuen Vorlagen erscheinen nur in
der Vorlagenauswahl der freien Gestaltung. Der Server akzeptiert die neuen
Kennungen.

- TC-F20-01: Die drei Vorlagen sind auswählbar (mit echter Miniatur), nicht in
  der Originalvorlagenauswahl der CMS-Wochenangebote, und werden vom Server
  akzeptiert.
- TC-F20-02: Für Sammelflyer (4 und 6 Kacheln), Kachel, Einzelflyer und Waage
  hat das Bild 50 % (±1 %) der Flächenbreite, alle Elemente liegen innerhalb
  der Fläche, überlappen sich nicht untereinander und es entstehen keine
  Textüberläufe (auch mit langen Namen).
- TC-F20-03: Mockup-Bilder aller Ausgabeziele für jede Vorlage werden aus dem
  echten Renderer erzeugt und zur Abnahme bereitgestellt.

Zusätzlich gibt es drei Vorlagen „Preisschild · Rot/Grün/Blau“ mit der
Aufteilung der Originalkachel: Artikelname und Gebinde bzw. Beschreibung oben
links, darunter eine große helle Bildfläche über die volle Kartenbreite. Auf
dem rechten Bildrand überlappt ein leicht gedrehtes farbiges Preisschild mit dem
Preis, der Ersparnismarker sitzt auf dessen oberer Ecke und der durchgestrichene
Stattpreis darunter. Pfand und Literpreis stehen unter der Bildfläche. Die
Vorlagen gelten für Sammelflyer (4/6 Kacheln), Kachel, Einzelflyer und Waage.

- TC-F20-04: Die drei Preisschild-Vorlagen sind wählbar, nicht in der
  CMS-Originalvorlagenauswahl; Preisschild und Bildfläche liegen innerhalb der
  Fläche, Textfelder überlappen sich nicht, der Marker überlappt das Schild und
  es entstehen keine Textüberläufe.

## F21: Filigranere Schrift auf der Startseite

Die Angebotskacheln der Startseite (Kundenansicht) verwenden für sonst fette
Texte (Artikelname, Preis, Stattpreis, Zeitraum) die Schriftstärke „halbfett“
(600) statt „fett“ (700/900) und die Systemschrift der Seite. Das gilt für
Kacheln aus den Original-CMS-Wochenvorlagen und für freie Getränkekacheln.
Vorschau, Flyer, Einzelflyer, Waage, Druck und CMS-Ausgaben bleiben
unverändert; die Gestaltungsdaten werden nicht verändert.

- TC-F21-01: Beim Zeichnen einer Startseitenkachel (Original-Wochenvorlage und
  Getränkekachel) wird keine fette Schrift (bold, 700, 900) gesetzt, aber
  halbfette (600). Die normale Ausgabe (Vorschau/Flyer) verwendet weiterhin fett.

## F22–F26: Korrekturrunde Marker, Zielstile, Buttons, Homepage, Wochenvorschau

**F25:** Die öffentliche Angebots-API liefert neue Dataverse-Aktionen, solange
sie nicht abgelaufen sind (Ende ≥ heute, Europe/Berlin). Die Homepage filtert
Wochen im Browser; „Nächste Woche“ zeigt damit schon vor Beginn die
Getränkeaktion, „Diese Woche“ nicht. Abgelaufene bleiben ausgeblendet,
`?filter=today` bleibt strikt.

- TC-F25-01: API liefert künftige, nicht abgelaufene Aktionen; abgelaufene
  nicht; `filter=today` unverändert.
- TC-F25-02: Homepage zeigt eine Aktion der nächsten Woche nur unter
  „Nächste Woche“.

**F24:** Buttons und Eingabefelder im Angebotsbereich sind klar erkennbar:
Rand mit mindestens 3 : 1 Kontrast, leichte Tönung, Schatten, sichtbarer
Fokus/Hover; primäre Aktionen bleiben gefüllt grün.

- TC-F24-01: Rand-Kontrast ≥ 3 : 1 und Text-Kontrast ≥ 4,5 : 1 für
  Standard-, Primär-, Tab-Buttons und Felder.

**F26:** In der Original-Wochenvorschau stehen die Werkzeuge oben zusammen,
ohne Streckung, mit Pfeilen zur Feinverschiebung und kompakten Feldern.

- TC-F26-01: Abstand zwischen Werkzeugblöcken ≤ 60 px (Hinweiszeile); Pfeilbutton verändert
  die Override-Werte; Original-Renderer unverändert.

**F22:** Der Ersparnismarker wird bei langem Text (z. B. „−12 %“) passend zur
Textbreite vergrößert; die Textgröße bleibt; gilt für alle Markertypen.

- TC-F22-01: Für alle Typen und −5/−12/−45/−99 % liegt der Text innerhalb
  des Markers (Pixelprüfung) und der Marker bleibt im Bild.

**F23:** Vorlage, Farben und Schrift gelten je Ausgabeziel (Kachel,
Einzelflyer, Waage, Sammelflyer) für alle Artikel dieses Ziels
(`layout.target_styles`); das Panel zeigt die Werte des aktiven Reiters.
Alte Aktionen ohne Zielstil verhalten sich unverändert.

- TC-F23-01: Stiländerung im Reiter wirkt nur auf dieses Ziel; Reiterwechsel
  zeigt die jeweiligen Werte.
- TC-F23-02: Speichern/Öffnen erhält Zielstile; alte Aktion unverändert.
- TC-F23-03: API akzeptiert gültige und lehnt ungültige Zielstile ab.
  Eine Stiländerung wird sofort auf alle Artikel des Ziels angewendet; enthält
  das Ziel frei verschobene Elemente, erscheint vorher „Gestaltung ersetzen?“.

**F27:** Alle Werkzeuge des bisherigen CMS-Editors stehen in jedem neuen Editor
zur Verfügung: Ghost, Duplikat (je mit Deckkraft/Größe), weitere Kopien
(+ Ghost, + Duplikat, löschen), eigenes Bild (+ Bild, Deckkraft, entfernen),
Drehung per Schieber samt 0°-Knopf sowie Element- und Alles-Zurücksetzen. Das
gilt in der Original-Wochenvorschau (Sammelflyer, Einzelflyer) und – soweit
fachlich vorhanden (Ghost, Duplizieren, Eigenes Bild, Drehung) – im Editor der
Getränke-Gestaltung. Bedienung und Aussehen sind auf `angebote.html`, im Kiosk
und im CMS (`cms.html?tab=ang`) identisch.

- TC-F27-01: Ghost, Duplikat, Kopien, Eigenes Bild, Drehung und Zurücksetzen
  in der Original-Wochenvorschau auf allen drei Seiten; Werte werden gespeichert.
- TC-F27-02: Ghost, Duplizieren, Eigenes Bild und Drehung im Getränke-Editor auf
  allen drei Seiten.

**F28:** Der Reiter „Angebote“ ist Teil der Kiosk-Quelle
(`kiosk-klassisch.html`) und der REITER-Liste des Generators; ein Lauf von
`tools/build-kiosk-neu.js` verändert die ausgelieferten Dateien nicht
(TC-S8a, TC-S8c).

**F29:** Die freigegebene Mockup-Variante A integriert „Flyer ansehen“ rechts
in die Wochenleiste der Homepage. Die separate Zeile zwischen Wochenwahl und
Angebotskacheln entfällt. Der Button erhält ein Dokument-Symbol und eine
kontrastreiche rote Kontur. Mobil bleibt derselbe Ablauf erhalten: Bei wenig
Platz stehen Zeitraum und Flyer-Aktion kompakt unter der Wochenwahl. Bei
mehreren Aktionen bleibt die Auswahl des Flyers verfügbar. Ohne Flyer wird
kein leerer Aktionsbereich angezeigt. Der Original-Flyer, Wochenfilter und
die Tastaturbedienung bleiben unverändert.

- TC-F29-01: Bei einem und mehreren Flyern sitzt die Aktion in der Wochenleiste,
  nicht vor dem Raster; rechts ausgerichtet auf Desktop, ohne horizontalen
  Überlauf auf allen vier Viewports. Der Button ist mindestens 44 px hoch.
- TC-F29-02: Auswahl und Öffnen des Original-Flyers funktionieren; beim
  Schließen erhält der Button den Fokus zurück. Ein Zeitraum ohne Flyer
  lässt keinen leeren Aktionsbereich stehen.

## Verifikation und offene Fragen

Automatisierte Python-Tests und Playwright bei 375×667, 768×1024, 1280×800
und 686×1095. Keine offenen fachlichen Klärungsmarker. Physische Waagenanzeige
erfordert eine spätere manuelle Abnahme am Gerät, keine fingierte Bestätigung.
