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

- TC-F16-01: In CMS-Designvorschau ein Element mit Maus (am Element) bzw.
  Touch (am ✥-Griff, siehe F72) verschieben,
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

- TC-F17-01: Sechs Artikel auf Desktop als kompakte, vollständige Zeilen
  gemäß F62 (Referenz: 125 px normal, 194 px Getränke einschließlich
  Zusatzfeldern; lange Inhalte dürfen umbrechen) mit direkt sichtbaren Kernfeldern; auf allen vier
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

**F30:** Gespeicherte Designstandards gelten weiterhin nur für neue Aktionen.
Für eine bestehende Aktion übernimmt „Designstandards übernehmen“ in einem
Handy-/Kiosk-, Einzelflyer- oder Waagenziel die Standards für **alle** Artikel
dieses Ziels (nicht nur den gewählten Artikel) einschließlich der dafür
gespeicherten Feinverschiebungen. Eine Rückfrage warnt vor dem Ersetzen freier
Positionen; Feinverschiebungen anderer Ziele bleiben erhalten. Erst nach
Speichern und Veröffentlichen sehen Kunden das neue Layout. Die Designseite
weist darauf hin, wie bestehende Aktionen den Standard erhalten.

- TC-F30-01: Eine bestehende Aktion mit altem Layout und mehreren Artikeln
  erhält im Ziel Handy/Kiosk für jeden Artikel Vorlage, Farbe und
  Feinverschiebung der Designstandards; Einzelflyer und Sammelflyer bleiben
  unverändert; nach Veröffentlichen zeigt die Kundenansicht (Handy) das Layout.

**F31:** Im Gestaltungsmodus einer Aktion (CMS, Reiter Homepage/Kiosk,
Einzelflyer, Sammelflyer, Waage) liegen die Einstellungen **neben** der Vorschau
und nicht darunter. „Vorlage und Gestaltung“ ist kein zugeklappter Bereich mehr.
Ab 1000 px Dialogbreite stehen Vorschau, „Element und Artikel“ und „Vorlage,
Farben und Marker“ nebeneinander und sind ohne Aufklappen und ohne Scrollen des
Dialogs sichtbar. Darunter bis 640 px steht die Vorschau links und rechts eine
Reiterleiste Element · Artikel · Vorlage · Marker, die jeweils einen Bereich
zeigt. Auf dem Handy steht die Vorschau oben, darunter dieselben Reiter;
Rückgängig und „Gestaltung speichern“ bleiben sichtbar. Die zuletzt gewählte
Reiterwahl bleibt beim Wechsel des Ausgabeziels erhalten. Alle Werkzeuge
(Ghost, Duplikat, weitere Kopien, Eigenes Bild, Drehung, Zurücksetzen,
Feinverschiebung, CMS-Artikelpositionen) bleiben in jedem Reiter verfügbar.
Touch-Ziele sind auf dem Handy mindestens 44 px hoch.

- TC-F31-01: Desktop – Gestaltungsfelder rechts neben der Vorschau ohne
  `details`-Aufklappen; Vorschau mindestens 40 % der Dialogbreite; kein
  horizontaler Überlauf auf allen vier Viewports. Tablet/Handy – Reiter sichtbar,
  je Reiter nur ein Bereich, Speichern erreichbar.
- TC-F31-02: In allen vier Ausgabezielen wirken Farb-/Vorlagenänderungen sofort
  und Ghost, Duplikat, Eigenes Bild, Drehung und Zurücksetzen bleiben erreichbar.

**F38 (ersetzt die reine Stilangleichung aus F32):** Plakat, Einzelflyer und
Getränkeflyer verwenden dieselbe Designer-Arbeitsfläche: Vorschau links,
Werkzeuge rechts, auf dem Handy Vorschau oben und Werkzeuge darunter.
Die gemeinsamen Werkzeugreiter heißen „Stil“, „Farben“, „Feinabstimmung“,
„Weitere Gestaltung“ und „Eigene Vorlagen“. Vorlagenwahl, Felder, Buttons und
Speicherleiste verwenden dieselben Komponenten statt der bisherigen
Plakat-/Einzelflyer-Karten. Nur die Werkzeuge des aktiven Reiters sind sichtbar.
Alle bisherigen Einstellungen einschließlich Verläufen, Dekoration,
Bild-/Preisposition, benannten Vorlagen und eigenen Standards bleiben erreichbar.
Originalrenderer und Speicherverträge bleiben unverändert; Ausgabeziele, die
nur der Getränkeflyer unterstützt, werden nicht für Wochenangebote erfunden.
Die automatische Einzelflyervorschau lädt hinterlegte Produktbilder wie die
separat geöffnete Vorschau nach. Die klassische CMS-Fassung bleibt erhalten.

- TC-F38-01: Alle drei Reiter verwenden dieselbe Arbeitsfläche und dieselben
  fünf Werkzeugreiter; Handy oben/unten, andere Zielansichten nebeneinander,
  kein Überlauf, Vorschau und Speichern erreichbar auf vier Ansichten.
- TC-F38-02: Sämtliche ursprünglichen Eingabekennungen und Werte bleiben beim
  Umstellen erhalten. Vorlagen-/Farb-/Formänderung, Wechsel der Reiter,
  Verwerfen und Speichern funktionieren mit unverändertem Speichervertrag.
- TC-F38-03: Automatische Einzelflyervorschau lädt und zeichnet ein nur über
  die Artikelnummer referenziertes Produktbild; Aktualisierung und separate
  Vorschau verwenden denselben Bildladeweg.
- TC-F38-04: Plakat und Einzelflyer bieten zusätzlich unter Preisschild-Vorlage
  und Preisschild-Form „Preisbild · Rot/Gelb“. Fünf Farben (Preis, Kontur,
  Stattpreis-Streifen, Stattpreistext und Durchstreichung) sind unabhängig je
  Ausgabe konfigurierbar und speicherbar. Original- und Magazinvorlagen zeichnen
  dieselbe Preisgrafik wie der Getränkeflyer: große Euroziffern, hochgestellte
  Cent und nur bei höherem Stattpreis einen durchgestrichenen gelben Streifen.
  Bereits vorhandene Vorlagen und Farbwerte bleiben unverändert.
  Als originalnähere Standardschrift des Preisbilds wird eine lokal
  mitgelieferte, kräftige Schmalschrift verwendet; Euroziffern und
  hochgestellte Cent stehen enger zusammen. Vorschau und Export warten auf
  die Schrift, ohne externe Schriftabrufe zur Laufzeit. Andere Vorlagen
  behalten ihre bisherige Schrift.
- TC-F38-05: „Eigene Designvorlagen“ ist beim Öffnen und erneuten Laden
  standardmäßig eingeklappt. Anlegen, Laden und Löschen bleiben nach dem
  bewussten Aufklappen erreichbar; Feinabstimmung und weitere Gestaltung
  werden initial ebenfalls nicht ausgeklappt angezeigt.
- TC-F38-06: Die Live-Vorschau hat in allen drei Designern einen eigenen,
  höhenbegrenzten vertikalen Scrollbereich mit sichtbarem Scrollbalken.
  Scrollen darin bewegt weder die Einstellungsseite noch deren Felder.
  Auf Desktop/Tablet sind auch die Einstellungen unabhängig scrollbar;
  auf dem Handy bleibt die Vorschau separat scrollbar, ohne das Motiv
  durch eine falsche Seitenverhältnis-Begrenzung abzuschneiden.
- TC-F38-07: Bild- und Preisposition im Einzelflyer stehen bei ausreichender
  verfügbarer Breite nebeneinander, bei schmalen Containern untereinander.
  Bildbreite bleibt darüber über beide Spalten bedienbar. Keine horizontalen
  Überläufe; Bedienflächen und unabhängige Vorschau bleiben erhalten.

**F41:** Die Live-Vorschau der Getränkedesignstandards lädt vorhandene
Getränkeartikel aus dem CMS samt Produktbildern. Fehlende Bildreferenzen
werden über die bestehende lesende Artikelbildsuche aufgelöst. Die erste
Musterkachel und die Folgekacheln verwenden diese Artikel in allen
Vorschauformaten; bei weniger Artikeln als Kacheln werden die Vorschauartikel
wiederholt. Dies verändert weder Angebote noch gespeicherte Designstandards.
Die eingebauten Vorlagenminiaturen bleiben neutrale Muster.
Ohne vorhandene Getränkeartikel bleiben beschriftete Beispieldaten sichtbar,
mit ausdrücklichem Hinweis auf den fehlenden Artikelbestand. Bildladefehler
werden sichtbar gemeldet und können erneut geladen werden.

- TC-F41-01: Vorhandene Getränkeartikel und echte Produktbilder erscheinen
  auf A4, Kacheln und beiden Waagenformaten; die reine Vorschau schreibt nicht.
- TC-F41-02: Bildsuche-/Bildladefehler und fehlende Artikel sind sichtbar;
  erneuter Ladeversuch gelingt ohne Verlust der eingestellten Gestaltung.
- TC-F41-03: Speichern sichert ausschließlich die Designstandards, nicht
  die geladenen Vorschauartikel und deren Bildreferenzen.

**F40:** „HP-Sonderangebote“ verwendet dieselbe kompakte Arbeitsfläche wie
„Plakate & Flyer“: links eine unabhängig scrollbare Live-Vorschau, rechts
Werkzeugreiter, darunter die erreichbare Speicherleiste; mobil untereinander.
Alle bisherigen Einstellungs-IDs und der isolierte Homepage-Speichervertrag
bleiben erhalten. Die Reiter sind auf die vorhandenen Optionen begrenzt:
„Farben“, „Preis-Tag“ und „Layout“. Auch hier gibt es lokales Undo/Redo.
Die Vorschau zeigt tatsächliche Angebote der aktuellen Homepage-Woche und
dieselben Kundenkarten statt fiktiver Produkte ohne Bilder. Bildreferenzen
werden über den gemeinsamen Bildrenderer geladen, fehlende Referenzen über
die bestehende rein lesende Artikelbildsuche aufgelöst. Nicht hinterlegte Bilder
werden ausdrücklich benannt; Ladefehler haben einen Wiederholungsweg.
Ohne Angebote erscheint ein Leerzustand, bei Ladefehlern ein sichtbarer Fehler
mit erneutem Ladeversuch. Designänderungen beeinflussen nur die Vorschau,
nicht die Artikel und nicht automatisch den gespeicherten Homepage-Stil.

- TC-F40-01: HP-Arbeitsfläche, vollständiger Erhalt der Eingabefelder,
  Tab-/Scrollgeometrie, Undo/Redo und expliziter Speichervertrag auf vier Ansichten.
- TC-F40-02: Tatsächliche Artikeltexte und geladene Bilder aus Referenzen und
  lesender Bildsuche; ohne Bestand leer statt erfundener Musterprodukte.
- TC-F40-03: Bild-/Datenfehler sichtbar und erneut ladbar; Verwerfen/Reset
  speichern nicht und verändern weder Aktionen noch die anderen Designer.
- TC-F40-04: Homepage-Produktbilder und die Designer-Vorschau erhalten keinen
  zusätzlichen CSS-Schlagschatten aus der alten `.ang-img`-Darstellung.
  Weiße Bildränder werfen daher keinen künstlichen rechteckigen Schatten.
  Das gilt auch für Flyer-Produktdarstellungen und Canvas-Ausgaben von
  Plakat, Einzelflyer und Getränkeflyer. Karten-/Preisschildschatten und die
  unveränderten Quelldateien bleiben erhalten.

**F39:** Alle drei Designstandard-Designer bieten „Rückgängig“ und
„Wiederholen“ für einzelne Änderungen an Farben, Vorlagen, Größen,
Dekoration und Vorschauelementen. Eigene Designvorlagen im Getränkedesigner
werden ebenfalls berücksichtigt. Der Verlauf bleibt lokal im geöffneten
Designer, umfasst wie der Aktionseditor höchstens 30 Schritte und schreibt
nicht automatisch auf den Server. Speichern bleibt ein eigener Vorgang;
Versionsstände werden durch Undo nicht zurückgesetzt. Verwerfen/Neuladen
beginnt mit dem gespeicherten Stand und leerem Verlauf. Eine neue Änderung
nach Undo verwirft den Wiederholen-Zweig. Reine Reiter-/Zielwechsel erzeugen
keinen Schritt; eine Ziehbewegung zählt als ein Schritt. Plakat und Einzelflyer
haben getrennte Verläufe und überschreiben beim Undo nicht die jeweils andere
Ausgabe. Auch der Aktionsdesigner zeigt beide vorhandenen Verlaufsaktionen
ständig in seiner Werkzeugleiste und aktualisiert ihre Verfügbarkeit.
Strg/Cmd+Z, Strg/Cmd+Umschalt+Z und Strg/Cmd+Y bedienen den fokussierten
Designer; innerhalb von Texteingaben bleibt das native Text-Undo erhalten.

- TC-F39-01: Farbe/Vorlage ändern, rückgängig machen, wiederholen und nach
  erneutem Ändern den Redo-Zweig verlieren; Buttons initial deaktiviert.
- TC-F39-02: Musterkachel verschieben/drehen, als einen Schritt zurücknehmen
  und wiederholen; synchronisierte Kacheln folgen mit.
- TC-F39-03: Plakat-/Einzelflyerverläufe isoliert; Undo speichert nicht,
  rückgängig gemachte Werte werden erst durch Speichern übernommen.
- TC-F39-04: Aktionsdesigner bietet aktivierte Undo-/Redo-Buttons für
  Gestaltungsänderungen; Tastenkürzel wirken nur außerhalb von Eingabefeldern.

**F32 (historisch; durch F38 erweitert):** Die Einstellungsreiter „Plakat“ und „Einzelflyer“ unter Design →
Plakate & Flyer folgen im Stil dem Getränkeflyer: nummerierte Bereiche statt
grüner Kartenbalken, kontrastreiche Felder (Rand mindestens 3:1, Text
mindestens 4,5:1), Vorlagenkacheln mit „✓ Aktiv“ und ein Einstellungsbereich
ohne inneren Scrollbereich. „Speichern“, „Verwerfen“ und „Auf Default
zurücksetzen“ sind fest erreichbar. Alle Felder, Kennungen, Voreinstellungen
und Speicherwege bleiben unverändert; die „gewohnte Fassung“ (`cms-klassisch.html`)
bleibt wie bisher. Die Vorschau behält Aktualisieren und Auto; Ausgabereiter und
Elementwerkzeuge der Aktionsvorschau gehören nicht zu diesem Bereich.

- TC-F32-01: Plakat und Einzelflyer zeigen nummerierte Bereiche, die aktive
  Vorlage mit „✓ Aktiv“, Speichern ohne Scrollen erreichbar, keinen inneren
  Scrollcontainer und keinen horizontalen Überlauf auf allen vier Viewports.
- TC-F32-02: Vorlagenwechsel, Farbänderung und Preisschildform wirken in der
  Vorschau; die Speicheranfrage bleibt unverändert.

**F33:** Im Designstandard-Designer ist nur die erste Artikelkachel als
Musterkachel bearbeitbar. Verschieben, Drehen und Skalieren eines ihrer
Elemente gelten automatisch für die entsprechenden Elemente aller Kacheln
des jeweiligen Ausgabeziels, auch nach einem Wechsel zwischen vier und sechs
Kacheln und auf Folgeseiten neuer Aktionen. Die übrigen Kacheln sind weder
durch Antippen noch über die Elementauswahl individuell bearbeitbar.
Seitenweite Elemente wie Titel und Logo bleiben separat bearbeitbar.
Ein Hinweis erklärt die Musterkachel. Beim Laden älterer Designstandards
ersetzt die Gestaltung der ersten Kachel abweichende Anpassungen weiterer
Kacheln; fehlt dort eine Anpassung, gilt für dieses Element die Vorlage.
Erst Speichern persistiert die vereinheitlichten Standards. Bereits angelegte
Aktionen und ihre individuellen Aktionseditoren bleiben unverändert.

- TC-F33-01: Bei vier und sechs Kacheln sind nur Elemente der ersten Kachel
  sowie seitenweite Elemente auswählbar. Drehen, Skalieren und Verschieben
  synchronisieren alle Kacheln des Ausgabeziels, nicht andere Ausgabeziele.
  Speichern, Neuladen und neue mehrseitige Aktionen erhalten die einheitliche
  Gestaltung. Die Prüfung läuft auf allen vier Viewports.
- TC-F33-02: Alte abweichende Anpassungen weiterer Kacheln werden im Designer
  durch die erste Kachel vereinheitlicht, ohne bestehende Aktionen oder
  Standards vor dem Speichern zu verändern. Der Wechsel von vier auf sechs
  Kacheln synchronisiert auch die zusätzlichen Kacheln.

**F34:** Eine zusätzliche Getränkevorlage „Preisbild · Rot/Gelb“ zeigt den
Angebotspreis mit großer roter Eurozahl samt Dezimalpunkt, kleineren
hochgestellten Cent und weißer Kontur. Ein tatsächlich höherer Stattpreis
erscheint darunter schwarz mit Währungszeichen auf einem gelben, leicht
schrägen Streifen und wird rot durchgestrichen. Ohne höheren Stattpreis wird
kein Vergleichspreis erfunden und kein leerer gelber Streifen angezeigt.
Die Vorlage ist im Designstandard- und Aktionseditor wählbar und gilt für
Sammelflyer, Homepage/Kiosk, Einzelflyer und beide Waagenformate. Preise stammen
aus den Artikeldaten; ein- und mehrstellige Eurobeträge passen in das
Preisfeld. Alle bisherigen Vorlagen und deren Standarddarstellung bleiben
unverändert. Musterkachel-Synchronisation gemäß F33 gilt auch hier.
Alle fünf Farben sind konfigurierbar: Angebotspreis (Standard Rot),
Kontur (Weiß), Stattpreis-Streifen (Gelb), Stattpreistext (Schwarz) und
Durchstreichung (Rot). Die Auswahl wird in Standards und Ausgabezielstilen
gespeichert und in jeder Ausgabe berücksichtigt.

- TC-F34-01: Neue Vorlage im Designer wählen, speichern und erneut laden.
  Neue Aktionen übernehmen sie; alle Ausgabeziele zeichnen echte Preise,
  hochgestellte Cent, weiße Kontur und den gelben durchgestrichenen Stattpreis
  ohne doppelte Preisfelder. Alle fünf Farben ändern und nach dem Neuladen
  sowie in den gerenderten Ausgaben prüfen. UI-Prüfung auf vier Viewports.
- TC-F34-02: Preise von 0,99 bis zu mehrstelligen Eurobeträgen passen in das
  Preisfeld. Fehlende, gleiche oder niedrigere Stattpreise erzeugen keinen
  Vergleichspreisstreifen. Die API erhält die Vorlage in Standards,
  Veröffentlichung und Zielstilen und lehnt unbekannte Vorlagen weiterhin ab.

**F35:** Der Getränkeflyer-Designer erhält die zusätzlichen Gestaltungsgruppen
aus Plakat/Einzelflyer: Blatt-Dekoration (Farbe/Größe), Einkaufstasche,
Papiertextur, Rahmen (Breite/Farbe), getrennte Detail-/Fußzeilen-/Vorratfarben,
Kartenrahmen, Bildhintergrund sowie Farbverläufe für Flyer- und Bildhintergrund.
Preisschilder bieten alle bisherigen Formen (einschließlich der elf
Plakat-/Einzelflyerformen), Eckenradius, Neigung, Größe und
Farbvorlagen. Bildbreite und relative Bild-/Preisposition sind als Zahlenfelder
sowie weiterhin direkt an der Musterkachel einstellbar. Alle neuen Optionen
wirken auf alle Kacheln des Ausgabeziels und sind im Aktionseditor über dieselben
Gestaltungsfelder verfügbar. Nicht gesetzte Optionen verändern alte Ausgaben
nicht. Neue Elemente werden nicht artikelindividuell im Designer bearbeitet.

Eigene benannte Getränke-Designvorlagen lassen sich anlegen, laden und nach
Bestätigung löschen. Sie enthalten Gestaltung einschließlich Feinverschiebungen,
aber keine Artikeldaten. Die Verwaltung erfolgt gemeinsam mit den versionierten
Designstandards; erst „Designstandards speichern“ persistiert Änderungen.
„Änderungen verwerfen“ stellt den zuletzt gespeicherten Stand wieder her.
„Vorlage auf Original zurücksetzen“ bleibt erhalten.

- TC-F35-01: Zusätzliche Felder einstellen, Vorschauänderungen beobachten,
  speichern und nach Neuladen sowie in neuen Aktionen wiederfinden. Blatt,
  Tasche, Textur, Rahmen, Farben, Verläufe und Preisschildform wirken tatsächlich
  im Renderer. Keine individuellen Bearbeitungsflächen für weitere Kacheln.
- TC-F35-02: Benannte Vorlage mit vollständiger Gestaltung anlegen, speichern,
  neuladen, laden und löschen (Abbrechen/Bestätigen); Änderungen verwerfen
  stellt den gespeicherten Stand her. Namen werden als Text behandelt.
- TC-F35-03: API erhält zusätzliche Optionen und Vorlagen samt
  Zielüberschreibungen; ungültige Typen, Farben, Grenzen und unbekannte
  Eigenschaften werden zurückgewiesen. Bestehende Aktionen ohne diese
  Optionen bleiben unverändert. UI-Prüfung auf vier Viewports.

## F36: Kompakte Homepage mit wirksamen zentralen Einstellungen

Die Homepage zeigt Angebote aller Arten in kompakten HTML-Karten nach dem
freigegebenen Mockup. Schrift und Buttons folgen dem Homepage-Stil statt den
Schriftgrößen eines skalierten Portraitflyers. Das Raster wählt automatisch
drei Spalten bei ausreichend breitem Container, sonst zwei und unter 340 px
eine. Mobile Touchflächen bleiben mindestens 44 px hoch. Produktbild, Name,
Details, echter Angebots-/Stattpreis und Rabatt bleiben sichtbar; bei Getränken
zusätzlich Gebinde, Pfand und Grundpreis. Originalflyer, gespeicherte Ziellayouts,
Kiosk, Druck und Waage werden durch diese Homepage-Darstellung nicht verändert.
Wochenwahl, Flyerauswahl, Viewer und Fokus-Rückgabe bleiben erhalten.

Design → HP-Sonderangebote steuert diese tatsächliche Darstellung zentral:
Farben, Radien, Bildgröße, Preisschildneigung, Blatt und Tasche. Vorschau und
Homepage verwenden dieselbe Kartendarstellung. Speichern persistiert versioniert
im umgebungsgetrennten Angebotsspeicher, nicht in der produktionsgeteilten
Dataverse-Konfiguration. Andere Designbereiche und eigene Vorlagen bleiben
erhalten. Ohne gespeicherte Einstellungen gelten dokumentierte Standards;
Lade-/Speicherfehler und Konflikte werden sichtbar statt als Erfolg behandelt.
Es gibt keinen zusätzlichen Darstellungsform- oder Spalten-Umschalter.

- TC-F36-01: HP-Einstellungen speichern, neu laden und in anderer Kundensitzung
  wiederfinden; andere Designbereiche und Vorlagen bleiben erhalten.
- TC-F36-02: Gemischte Angebote zeigen kompakte Karten, vollständige Pflichtangaben
  und passende Typografie ohne Überlauf auf vier Viewports; Kiosk und
  Originalausgaben bleiben unverändert.
- TC-F36-03: Wochenfilter, mehrere Flyer, Viewer und Fokus-Rückgabe funktionieren;
  Bild-/Konfigurationsfehler sind sichtbar und können erneut geladen werden.
- TC-F36-04: API validiert Farben, Typen, Grenzen, Version und Zugriffsschutz;
  öffentliche Homepage-Antwort enthält keine privaten Designs oder Vorlagen.
  Einstellungen unterschiedlicher Namespaces bleiben getrennt.

## F37: Gezielte und zuverlässige Testausführung

Der Teststarter wählt anhand geänderter Dateien betroffene Tests aus und zeigt
den Umfang. UI-Prüfungen laufen auf den vier vorgesehenen Viewports; reine
viewportunabhängige Verträge können explizit nur einmal laufen. Keine automatische
Klassifizierung anhand von Suchworten. Nicht klassifizierte UI-Tests bleiben auf
vier Viewports. Gitfehler, ungültige Zuordnungen und nicht zugeordnete
Verhaltensänderungen dürfen nicht zu stillen erfolgreichen Null-Läufen führen.
Der lokale Server bleibt während des Tests ansprechbar, wird vorab geprüft und
nach Abschluss einschließlich Fehlerfällen beendet.

- TC-F37-01: Geänderte Dateien, explizite Markierungen, ungültige Zuordnungen
  und Gitfehler wählen nachvollziehbar passende Tests oder melden einen Fehler.
- TC-F37-02: Lokaler Server antwortet während des Testlaufs; dessen Exitcode
  wird weitergegeben und der selbst gestartete Server danach aufgeräumt.

## F42: Gemeinsame, direkt editierbare Angebotserfassung

Der freigegebene Dialogentwurf vereinheitlicht Getränke- und Sonderaktionen.
Produkt, Angebots-/Stattpreis und Strichcode stehen in ausgerichteten Spalten;
Beschreibung sowie sämtliche Getränke-, Gebinde- und Pfandwerte sind immer
direkt editierbar, nicht hinter einer Zusammenfassung oder einem Aufklapper.
Auf dem Desktop stehen die Artikelwerte in zwei kompakten Eingabezeilen;
auf schmalen Geräten brechen sie ohne horizontalen Überlauf um.
Titel, Zeitraum und Getränke-Kachelwahl teilen sich bei genügend Platz eine
Kopfzeile. Gültige bestehende Werte, Reihenfolge, Datenmodell und Speichern
bleiben erhalten. Diese freigegebene Erfassungsdarstellung ersetzt insoweit
die optische Bestandserhaltung aus F18-09; die Aktionsübersicht bleibt gleich.

Ein Klick auf das Produktbild öffnet ein platzsparendes Bildmenü, identisch
für beide Aktionsarten: Bestandssuche zum Artikel/Strichcode, Dateiauswahl
(PNG/JPEG/WebP), Zwischenablage und Entfernen der Bildzuordnung.
Die bisherigen realen Such-, Upload- und Speicherwege bleiben erhalten.
Dateien werden erst beim expliziten Speichern hochgeladen; das Entfernen
einer Zuordnung löscht kein Stammbild. Status und Fehler bleiben sichtbar.
Drag-and-drop von Bilddateien ist nicht Bestandteil dieser Änderung.

Artikeltreffer und Bildmenü liegen oberhalb des scrollenden Dialoginhalts.
Ihre Breite/Höhe bleibt im Fenster; bei Platzmangel unter dem Feld öffnen
sie nach oben. Lange Treffer zeigen Produkt, Nummer und Stamm-VK lesbar.
Scrollen, Größenänderung, Escape, Klick außerhalb, Auswahl und Schließen
hinterlassen keine abgetrennten oder unsichtbar offenen Menüs.

- TC-F42-01: Beide Dialogarten zeigen alle zugehörigen Felder ohne Aufklappen,
  ausgerichtete Desktopzeilen und auf vier Viewports keine abgeschnittenen
  Eingaben. Verschiedene Gebinde-/Pfandwerte lassen sich direkt ändern und
  nach Speichern/Öffnen unverändert wiederfinden.
- TC-F42-02: Bildmenü in beiden Arten mit Suche, Dateiauswahl, Zwischenablage
  und Entfernen bedienen; automatische Bildsuche, lokale Vorschau, verzögerter
  Upload und Wiederholung nach Uploadfehler erhalten. Keine ungefragten
  Stammbildlöschungen oder impliziten Aktionsspeicherungen.
- TC-F42-03: Artikelsuche am unteren Dialogrand bleibt innerhalb des Fensters
  tatsächlich sichtbar und anklickbar, auch nach Scrollen/Größenänderung;
  Tastaturauswahl und Escape funktionieren. Bildmenü ebenso unverdeckt.
  Keine verwaisten Ebenen nach Zeilenentfernung oder Dialogschließen.

## F43: Bildreine Vorschau rechts und feste Design-Navigation

**F43 (präzisiert F38/F40):** Alle Design-Reiter verwenden eine feste,
kompakte Kopf- und Reiternavigation außerhalb ihrer Scrollbereiche.
Plakat, Einzelflyer, Getränkeflyer und HP-Sonderangebote zeigen rechts
ausschließlich das Ausgabebild beziehungsweise die gerenderten Angebotskarten.
Elementauswahl, Ausgabeformat, Vorschauaktionen und Bearbeitungswerkzeuge
liegen links; die Vorschau hat weder Überschriften noch Erklärungskästen
oder darüberliegende Aktionsleisten. Auswahlrahmen und direkte
Bearbeitungsanfasser bleiben erlaubt.

Die linke Werkzeugspalte scrollt unabhängig. Rückgängig/Wiederholen,
Speichern, Verwerfen und Zurücksetzen erhalten links einen eigenen
reservierten Bereich und überlagern die Vorschau niemals. Desktop erhält
ungefähr ein Drittel Werkzeuge und zwei Drittel Vorschau. Auf schmalen
Geräten bleibt die eingepasste Vorschau oberhalb der separat scrollbareren
Werkzeuge sichtbar; Navigation und Aktionen bleiben bedienbar.
Die Vorschau startet vollständig eingepasst. Links sind Zoom, Einpassen
und Vollbild erreichbar; beim Vergrößern scrollt ausschließlich die
Bildfläche, ohne das Dokument oder die andere Spalte mitzubewegen.

Statische Hilfetexte werden zu platzsparenden Info-Auslösern, deren
Erklärung per Maus, Tastaturfokus oder Antippen erreichbar ist.
Escape schließt die Erklärung, der Fokus bleibt sinnvoll erhalten.
Feldbezeichnungen, Lade-/Leerzustände, Speicherstatus und Fehler bleiben
sichtbar. Homepage-, Wochenplan- und gemeinsame Design-Einstellungen
erhalten ebenfalls die feste Navigation und kompakte Hilfen; bestehende
Wochenplan-/gemeinsame Vorschauen bleiben rechts ohne Bedienknöpfe.
Bestehende IDs, Werte, Speicherverträge, Vorlagen und Undo bleiben erhalten.
Keine Änderungen an Angebotsdaten, Renderer-Ausgaben oder APIs.

- TC-F43-01: Alle Haupt- und Ausgabereiter behalten sichtbare Kopf- und
  Reiternavigation beim Scrollen. Desktopwerkzeuge liegen links und die
  Vorschau rechts, mobil oberhalb; alle vier Viewports ohne Überlauf.
- TC-F43-02: Alle vier Designer zeigen rechts nur Ausgabe und direkte
  Anfasser; sämtliche Vorschauwerkzeuge und Aktionen liegen außerhalb.
  Eingepasstes Bild vollständig sichtbar, Aktionsrechtecke überschneiden
  sich nicht mit der Vorschau. Zoom erzeugt unabhängiges Bildscrollen;
  Einpassen und Vollbild funktionieren auch nach Reiterwechseln.
- TC-F43-03: Statische Erklärungen verbrauchen keine Hinweisblöcke mehr;
  Info-Inhalt ist per Fokus, Maus und Klick erreichbar, im Fenster,
  per Escape schließbar. Dynamische Zustände/Fehler bleiben sichtbar.
- TC-F43-04: Plakat-/Flyer-Reiterwechsel, Getränkeformatwechsel,
  direkte Elementbearbeitung, HP-Ansicht und Save/Undo/Redo bewahren ihre
  bestehenden Werte und Speicherwege nach dem Verschieben der Controls.

## F44: Gleiche direkte Bedienung für alle Flyerdesigner

**F44:** Plakat, Einzelflyer und Getränkeflyer verwenden denselben direkten
Vorschaueditor: Elementauswahl im Bild oder Auswahlfeld, Ziehen, Pfeiltasten,
Feinverschiebung, Vergrößern/Verkleinern sowie Drehknöpfe und Drehanfasser.
Bearbeitbar sind die vom jeweiligen Renderer tatsächlich ausgewiesenen
Elemente; keine nur optischen Anfasser ohne Wirkung auf die Ausgabe.
Die Originalvorlagen von Plakat und Einzelflyer bleiben erhalten.
Ihre Standardanpassungen gelten für die Musterkacheln der jeweiligen
Ausgabe, nicht als Änderungen echter Angebote oder Artikelbilder.

Anpassungen bleiben zunächst lokal, sind je Designer rückgängig/wiederholbar
und werden erst mit dem vorhandenen expliziten Speichern dauerhaft.
Reiterwechsel bewahrt ungespeicherte Anpassungen. Verwerfen/Zurücksetzen
und erneutes Laden stellen den zugehörigen Stand wieder her.
Gespeicherte Ausgabeanpassungen müssen auch in tatsächlichen Originalausgaben
und übernommenen CMS-Snapshots wirken, nicht nur in der Designeranzeige.
Vorhandene artikelbezogene Sonderanpassungen bleiben erhalten.

- TC-F44-01: Plakat/Einzelflyer zeigen dieselben Direktwerkzeuge wie Getränke;
  Elementauswahl und Verschieben/Skalieren/Drehen verändern die tatsächliche
  Rendergeometrie auf allen vier Ansichten, ohne implizite Schreibanfrage.
- TC-F44-02: Getrenntes Undo/Redo, Reiterwechsel, explizites Speichern,
  Verwerfen und Neuöffnen erhalten die richtigen Standardanpassungen.
- TC-F44-03: Originalrenderer und CMS-Snapshot übernehmen Standardanpassungen
  mit identischer Wirkung; Altbestand ohne Anpassungen bleibt unverändert.

## F45: Rechte Vorschau auch im Aktionsdialog

**F45:** Der Vorschaudialog gespeicherter Wochen- und Getränkeaktionen
ordnet das Motiv auf Desktop und beiden Tabletansichten rechts an.
Element-, Artikel- und Gestaltungseinstellungen stehen links davon.
Dies gilt für alle Ausgabeziele **Homepage / Kiosk**, **Einzelflyer**,
**Sammelflyer** und **Waage**, unabhängig vom Einstieg über CMS, Kiosk
oder Angebotsseite. Auf dem Handy bleibt das Motiv über den Werkzeugen.
Vorhandene Werkzeugreiter, Elementbedienung, Scrollbarkeit, Speichern,
Undo/Redo und getrennte Ausgabeanpassungen bleiben unverändert.
Keine Änderungen an Renderer, Daten oder APIs.

- TC-F45-01: Für Wochen- und Getränkeaktionen stehen sichtbare
  Werkzeuggruppen auf Desktop/Tablet links vom tatsächlichen Motiv,
  mobil darunter; alle vier Ausgabeziele und drei Einstiege prüfen.
- TC-F45-02: Kein horizontaler Überlauf, vollständige Zielauswahl und
  unveränderte Schreibanzahl beim Reiterwechsel auf vier Ansichten.
  Vorhandene Zieh-, Dreh-, Farb-, Werkzeugreiter- und Speicherfälle bestehen.

## F46: Arbeitsraum statt dauerhaft sichtbarer Werkzeugblöcke

**F46:** Standarddesigner (Plakat, Einzelflyer, Getränke, HP-Sonderangebote),
Aktionsvorschauen und Angebotserstellung verwenden links die Erfassung/
Gestaltung und rechts das Motiv. Die tatsächlichen aktiven Eingabefelder
erhalten mindestens 50 % der Höhe ihrer Werkzeugspalte, auch nach
Speichermeldungen und Reiterwechseln. Navigation, allgemeine Werkzeuge
und Aktionen dürfen diesen Platz nicht verdrängen.

Die Eingaben belegen auf Desktop/Tablet standardmäßig etwa 60 Prozent,
mindestens die Hälfte der verfügbaren Workspacebreite. Eine erkennbare,
per Maus/Touch und Tastatur verstellbare Trennlinie verändert die Breite
innerhalb dieser Grenzen. Die Aufteilung ist nur Ansichtszustand:
keine Design-, Artikel- oder API-Schreibvorgänge. Mobil bleibt die
Eingabe im Vordergrund; Motiv und geteilte Ansicht bleiben direkt wählbar.

Speichern bleibt dauerhaft erreichbar. Undo/Redo werden beschriftete
Symbolschaltflächen mit Hilfe; seltene Aktionen sind über „Weitere Aktionen“
erreichbar. Element-, Format-, Zoom- und Ausgabeaktionen verdrängen nicht
die Eingaben anderer Werkzeugreiter. Lange statische Hinweise einschließlich
des Getränke-Startstandardtextes sind ausschließlich über Infohilfen
erreichbar; echte Fehler/Status und Wiederholungsaktionen bleiben sichtbar.
Schriftgrößen und Bedienflächen werden nicht zur Platzgewinnung verkleinert.
Werkzeugbereich, Eingabefelder, aktive Reiter und Bildfläche sind deutlich
getrennt: Textkontrast mindestens 4,5:1, relevante Grenzen mindestens 3:1;
Tastaturfokus und erzwungene Systemfarben bleiben erkennbar.

Der gleiche Aufbau gilt bei neuer Angebotserstellung und bei gespeicherten
Aktionen, für alle vier Ausgabeziele und CMS-/Kiosk-/Angebotseinstiege.
Die weiteren Designreiter (Homepage, Wochenplan, gemeinsame Einstellungen)
und Erfassungsdialoge werden auf gleiche Platz-/Hinweisprobleme geprüft.
Dateneingaben, Pflichtwerte, Bilderfassung, Historie, Renderer und
ausdrückliche Speicher-/Freigabewege bleiben erhalten.

- TC-F46-01: Alle vier Standarddesigner: echte aktive Feldfläche mindestens
  50 % der Werkzeugspaltenhöhe, keine dauerhaft davorliegenden allgemeinen
  Werkzeugblöcke; auch nach Statusanzeige. Hinweise nur in erreichbarer Hilfe.
- TC-F46-02: Splitter per Ziehen und Pfeiltasten bedienbar; Eingaben bleiben
  mindestens 50 % breit, Grenzen, Größenwechsel und mobile Anordnung stimmen.
  Keine Mutation, kein verlorener Gestaltungsstand oder Fokus.
- TC-F46-03: Aktionsvorschau und Angebotserstellung behalten tatsächliche
  Eingaben, Ausgabeziele, Bilder, Undo/Redo und explizites Speichern;
  Hauptarbeitsraum und Bildreinheit erfüllen dieselben Grenzen.
- TC-F46-04: Sichtbare Bereichs-/Feldgrenzen mindestens 3:1, kritischer Text
  mindestens 4,5:1, lesbare Schrift und Systemkontrast auf vier Ansichten.

## F47: Echtes Waagenziel und offene Bearbeitungsgruppen

**F47:** „Waage“ zeigt und bearbeitet auch bei Original-Wochenangeboten
das eigenständige Waagenlayout (800 × 462), keinen eingepassten A4-Flyer.
Vorschau und tatsächlicher Waagenexport verwenden dieselbe Zielgestaltung.
Andere Ausgaben und vorhandene Artikel-/Preisdaten bleiben unverändert.
Bearbeitungsgruppen starten aufgeklappt; manuelles Einklappen bleibt möglich.
Aktionsmenüs und explizite Vorlagenauswahldialoge sind keine Feldgruppen.

- TC-F47-01: Original-Wochenangebot im Waagenziel entspricht pixelgenau
  der nativen gespeicherten Waagen-Zielgestaltung, hat Querformat und
  echte Waagen-Elemente statt A4-Metadaten. Zieländerung bleibt getrennt.
- TC-F47-02: Bearbeitungsgruppen sind beim Öffnen expandiert, auch nach
  Ausgabe-/Werkzeugwechsel; Aktionsmenüs bleiben geschlossen.

## F48: Zusatztext gehört zur Bezeichnung

**F48:** Ein vorhandener Zusatztext steht unmittelbar unter der
Artikelbezeichnung, in normaler Detail-Schriftgröße und Semibold (600).
Er ist kein unabhängiger Textblock unter Preis oder Gebinde. Bezeichnung
und Zusatztext bilden beim Verschieben und Skalieren eine gemeinsame
Gruppe. Dies gilt für alle Ausgabeziele, Originalvorlagen, Vorschau und
Export. Ohne Zusatztext entsteht keine Leerzeile; lange Texte umbrechen
innerhalb des gemeinsamen Bereichs ohne Überschneidung mit Preis/Gebinde.
Artikelinhalt, Preise und getrennte Zielgestaltung bleiben erhalten.

- TC-F48-01: „Das Original aus Bayern“ steht bei Getränke-/Wochenangeboten
  direkt unter dem Namen, genau einmal und mit Schriftgewicht 600;
  alle vier Ziele, Vorschau und Export verwenden dieselbe Anordnung.
- TC-F48-02: Lange/mehrzeilige und leere Zusatztexte, bestehende
  Gestaltung, Verschieben/Skalieren und Speichern/Neuladen bleiben korrekt.

## F49: Preisschild unabhängig von der Gesamtvorlage wechseln

**F49:** Die vorhandene Preisschild-Vorgabenauswahl enthält auch Rot/Gelb
und verwendet dieselben zentralen Preisschildvorgaben wie die CMS-
Standardgestaltung. Jede Vorgabe kann gegen jede andere getauscht werden,
auch in bestehenden Rot/Gelb-Entwürfen. Der Austausch betrifft nur das
Preisschild, nicht Gesamtvorlage, Bilder, Bezeichnung oder Artikelpreise.
Rot/Gelb wird nicht als zusätzliche neue Gesamtvorlage angeboten;
bereits so gespeicherte Entwürfe bleiben lesbar und austauschbar.
Speichern/Neuladen, Zieltrennung, Undo/Redo, Vorschau und Export erhalten
die gewählte Vorgabe einschließlich der Rot/Gelb-Farbanpassungen.

- TC-F49-01: Rot/Gelb in bestehender Preisschildauswahl wählen und durch
  jede andere Vorgabe ersetzen; Gesamtgestaltung und Artikeldaten erhalten.
- TC-F49-02: Alte Rot/Gelb-Entwürfe, getrennte Ziele, Farben,
  Undo/Redo und expliziter Speicherrücklauf funktionieren.
- TC-F49-03: Preisfarbe, Hintergrund/Stattpreis-Streifen, Kontur,
  Stattpreis und Durchstreichung sind einstellbar. Jede anwendbare
  Änderung an diesen Farben, Form, Rundung, Neigung und Größe verändert
  unmittelbar die tatsächlichen Vorschaupixel, auch bei Magazinvorlagen.
  Originalrenderer, gespeicherter Stand und Export stimmen überein.

## F50: Erste Plakatkachel direkt und Bezeichnung konfigurierbar

**F50:** Im Plakat-Standarddesigner sind Bild, Preis und Bezeichnung
der ersten Kachel direkt im tatsächlichen Motiv auswählbar, verschiebbar,
skalierbar und drehbar. Die Auswahl öffnet die passenden Eingaben, ohne
die Bildfläche zu verdrängen. Bezeichnung und zugehöriger Zusatz bleiben
eine gemeinsame Gruppe. Schriftart, Schriftgröße und Farbe der
Bezeichnung sind in Plakat-/Einzelflyervorlagen einstellbar und verändern
die Vorschau unmittelbar. Standards gelten für alle Kacheln des Ziels;
die erste ist die Musterkachel. Getrennte Ziele, Historie, explizites
Speichern und identischer Originalexport bleiben erhalten.

- TC-F50-01: Erste echte Plakatkachel per Zeiger auswählen und ziehen,
  nicht nur über eine Auswahlliste; echte Metadaten/Pixel ändern sich.
- TC-F50-02: Namensschrift, Größe und Farbe verändern Original- und
  Magazinvorlagen; Zusatztext bleibt zugeordnet, Speicherrücklauf besteht.

## F51: Vollbild dauerhaft erreichbar

**F51:** Alle Designbereiche und Angebots-Arbeitsbereiche bieten eine
sichtbare, vom aktiven Werkzeugreiter unabhängige Vollbildschaltfläche.
Vollbild umfasst Eingaben und Motiv, bleibt auf allen Reitern bedienbar
und kann per Schaltfläche oder Escape verlassen werden. Entwurf,
Auswahl, Historie und Speicherstatus bleiben erhalten; kein automatisches
Speichern. Nicht unterstützte Browser zeigen einen verständlichen Hinweis.

- TC-F51-01: Vollbild aus Stil/Farben und Angebotsbearbeitung öffnen,
  Reiter wechseln und wieder verlassen; Zustand und Schreibanzahl erhalten.

## Ergänzung: Produktverbesserungen und kompakte Arbeitsoberfläche

Status: Umsetzung in der Anwendung und Veröffentlichung ausschließlich in der
PR-Preview ausdrücklich freigegeben. Der Nutzer bestätigt den Erhalt der
bestehenden Speicher-/Sichtbarkeitslogik und die Übernahme des kompakten
Mockup-Stils. Dieser Abschnitt konkretisiert F46 und ergänzt F52–F59.

### Overview

Bestehende Vanilla-JS-Designer und Angebotserfassung erhalten einen gemeinsamen
kompakten Bedienrahmen, ohne ihre Fachseiten, Speicherwege oder Funktionen zu
verschmelzen. Änderungen sollen verständlich, rücknehmbar und nach erneutem
Öffnen in allen Ausgaben identisch sein. Vorhandene Funktionen werden
wiederverwendet; bereits begonnene F46–F51 gehören zur Abnahme.

### Goals

- Weniger Scrollen bei gut lesbaren Feldern und mindestens 44-px-Bedienflächen.
- Eindeutige Reichweite, Herkunft und Speicherzustände ohne überraschende Writes.
- Verlässlicher Gesamtablauf von Artikelauswahl bis tatsächlicher Ausgabe.
- Isolierte automatische Prüfung auf den vier verbindlichen Zielansichten.

### Non-Goals

- Keine gemeinsame Design-/Angebotsfachseite, keine verlorenen Eigenschaften.
- Kein neuer Veröffentlichungsknopf für Dataverse-Aktionen, keine Änderung
  ihrer zeitabhängigen Sichtbarkeit; Feature-Altbestand behält seine Freigabe.
- Keine Produktion, echten Testaktionen oder automatischen Waagensendungen.
- Kein stilles Überschreiben konkurrierender Änderungen, kein Autosave.
- Keine fachlichen Entfernungen oder Zusammenlegungen ohne Einzelfreigabe.

### F52: Kompakter Arbeitsrahmen mit vollständigen Objekt-Eigenschaften

#### F52 Description

Der freigegebene Mockup-Stil und der
[UI-Designstandard](../../docs/ui-designstandard.md) gelten für die echten
Design- und Angebotsarbeitsbereiche. Design und Angebote bleiben getrennt.

#### F52 Inputs

Bestehende Inhalte, Ziele und Gestaltungseigenschaften; aktuelle Containergröße,
Bedienart, Auswahl und lokaler ungespeicherter Entwurf.

#### F52 Behaviour / Acceptance

- Häufige Artikel-/Preis-/Pfandeingaben bleiben direkt bearbeitbar.
- Schrift, Preisschild und Bilddarstellung erhalten beschriftete kompakte
  Zustandszusammenfassungen und vollständige Eigenschaftenfenster.
- Änderungen werden live gezeigt. Übernehmen bildet genau einen Undo-Schritt;
  Abbrechen, Schließen und Escape stellen den vorherigen Entwurf samt
  Speicherstatus und Undo/Redo wieder her. Kein implizites Speichern.
- Native modale Bearbeitung sperrt Hintergrundaktionen. Fokus kehrt zurück;
  Außenklick übernimmt oder verwirft nichts. Vollbild bleibt kompatibel.
- Eigenschaftenraster nutzen je tatsächlicher Breite 1–3 Spalten. Keine
  abgeschnittenen Labels; kompakte Feldrahmen in mindestens 44-px-Trefferflächen.
- Linke Eingaben erhalten standardmäßig etwa 60 Prozent, mindestens die Hälfte
  der geteilten Breite; die Vorschau bleibt sinnvoll nutzbar. Ansichten
  „Geteilt“, „Nur Eingaben“ und „Nur Motiv“ sind erreichbar; mobil Eingaben zuerst.
- Plattform-Systemschrift, adaptive Größen, UI-Gewichte maximal 600.
- Die Designnavigation wird ohne Funktionsverlust in einer Bereichsauswahl
  zusammengefasst. Schmale Werkzeugspalten zeigen eine vollständige Auswahl
  statt angeschnittener Reiter. Mobil stehen zunächst Eingaben und eine
  dauerhaft erreichbare Aktionsleiste im Vordergrund; Motiv bleibt separat
  groß erreichbar.
- Einzeilige Arbeitsbuttons und kompakte Auswahlzeilen sind bei präziser
  Mausbedienung ab 600 CSS-px tatsächlich 32 px hoch. Touch-/Grobzeiger und
  Telefone behalten mindestens 44 px Trefferhöhe. Keine reine Verkleinerung
  der Füllung in unverändert hohen Maus-Zeilen und keine Breitenänderung.
- Alle bisherigen Eigenschaften, Sonderfälle, Speicher- und Bildwege erhalten
  eine überprüfbare Vorher-/Nachher-Zuordnung.

#### F52 Test Cases

**TC-F52-01: Vollständige transaktionale Objektfenster**
- Setup: Bereits geänderter ungespeicherter Entwurf, vorhandene Undo-/Redo-Schritte.
- Action: Schrift, Preisschild und Bild ändern; abbrechen und danach übernehmen.
- Expected: Abbruch erhält exakt den vorherigen Stand; Übernahme erzeugt einen
  Undo-Schritt; unveränderte Übernahme keinen. Fokus, Validierung und alle
  bisherigen Eigenschaften bleiben erreichbar; keine API-Schreibvorgänge.

**TC-F52-02: Tatsächlich kompakter responsiver Arbeitsrahmen**
- Setup: Vier Zielansichten, kurze Höhe und durch Splitter verengte Spalte.
- Action: Reiter/Ansicht wechseln, Fenster skalieren und Vollbild verwenden.
- Expected: Kein horizontaler Überlauf, 32-px-Mausaktionen beziehungsweise
  mindestens 44-px-Touchflächen gemäß TC-F52-05,
  passende 1–3 Spalten und erreichbare Aktionen. Sichtbare Eingaben erfüllen
  die Platzbudgets; Motiv zählt nicht als Eingabefläche. Ansicht ändert keine Daten.

**TC-F52-04: Eingaben statt abgeschnittener mobiler Miniansicht**
- Setup: Vier Zielansichten mit echten Standarddesignern.
- Action: Bereich, Werkzeug und Arbeitsansicht wechseln; Motiv öffnen und
  wieder zu den Eingaben zurückkehren.
- Expected: Aktive Feldfläche mindestens halbe Fensterhöhe, Speichern und
  Eigenschaften erreichbar, keine abgeschnittenen Navigationen oder Writes.

**TC-F52-05: Tatsächlich niedrigere Maus-Buttons**
- Setup: Getrennte Design- und Angebotsseiten mit Maus, Telefon und echtem Touchkontext.
- Action: Aktionshöhe, Vorlagenzusammenfassung, 4/6-Auswahl und
  Eigenschaften messen; 4/6 per Randklick und Tastatur wechseln.
- Expected: Einzeilige Maus-Kontrollen tatsächlich 32 px hoch, Touchziele
  mindestens 44 px. Beschriftung, Auswahl und Fokus bleiben vollständig;
  Buttonbreiten werden nicht zur vermeintlichen Höhenkorrektur verändert.

### F53: Verständliche Reichweite und sichere Vorlagenherkunft

#### F53 Description

Nutzer erkennen, ob sie eine Designvorgabe oder eine konkrete Aktion bearbeiten,
welches Ausgabeziel und welche Kachel beziehungsweise Objekte betroffen sind.
Bereits gespeicherte Angebote behalten ihre Gestaltung unabhängig von späteren
Änderungen an Standards.

#### F53 Inputs

Vorhandene Zielgestaltung, eingefrorene Standardwerte bei Erstellung und
ausdrückliche Auswahl der zurückzusetzenden Objektgruppe.

#### F53 Behaviour / Acceptance

- Kompakter Kontext nennt „Designvorgabe“ oder Aktionsname, Ziel und Reichweite.
- Neue Angebote speichern eine begrenzte Herkunftsbasis ihrer übernommenen
  Gestaltung. Objektgruppen unterscheiden „Aus Vorlage“ und „Individuell angepasst“.
- Altbestand ohne verlässliche Herkunft zeigt „Gespeicherte Gestaltung“ und
  behauptet keine Vererbung. Es werden keine Werte rückwirkend geraten.
- „Auf Vorlagenwert zurücksetzen“ wirkt nur auf die bezeichnete Objektgruppe
  und das gewählte Ziel. Artikeldaten und andere Ziele bleiben unverändert.
- Aktuelle Standards werden nur durch bewusstes Laden und bestätigtes
  Übernehmen angewendet. Abbruch und Undo erhalten den vorherigen Entwurf.
- Standardänderungen verändern bestehende Angebote beim Laden nicht automatisch.

#### F53 Test Cases

**TC-F53-01: Herkunft, Reichweite und gezieltes Rücksetzen**
- Setup: Angebot mit übernommenen Standardwerten und unabhängigem Waagenziel.
- Action: Preisschild anpassen und auf Vorlagenwert zurücksetzen.
- Expected: Herkunftsanzeige folgt der tatsächlichen Abweichung; nur die
  gewählte Gruppe/Zielgestaltung ändert sich, Undo/Redo und Roundtrip bestehen.

**TC-F53-02: Kein überraschendes Aktualisieren**
- Setup: Gespeicherte Aktion und Altaktion ohne Herkunft; Standards danach ändern.
- Action: Beide erneut öffnen; aktuelle Vorgabe ausdrücklich laden/abbrechen.
- Expected: Bestehende Gestaltung bleibt erhalten, Altbestand wird korrekt
  bezeichnet; erst bestätigtes Übernehmen aktualisiert den gewählten Umfang.

### F54: Lesbare mobile Detailvorschau

#### F54 Description

Ein Eigenschaftenfenster zeigt bei verdecktem Hauptmotiv das tatsächlich
bearbeitete Objekt beziehungsweise die ausgewählte Kachel ausreichend groß,
nicht lediglich einen unlesbaren vollständigen Flyer.

#### F54 Inputs

Aktuelle echte Renderausgabe, Auswahl-/Kachelgeometrie und Fensterbreite.

#### F54 Behaviour / Acceptance

- Dieselbe Renderausgabe liefert einen eingepassten Ausschnitt ohne neue
  Beispieldaten oder abweichende Motivdarstellung.
- Mindestens 160 CSS-px nutzbare Ausschnittbreite bei 375-px-Fensterbreite;
  aktuelle Schrift-/Preis-/Bildänderungen sind unmittelbar sichtbar.
- Gesamtmotiv bleibt erreichbar. Ausschnitt, Zoom und Ansicht verändern weder
  Gestaltung noch Speicherstatus; Eingaben und Footer bleiben erreichbar.

#### F54 Test Cases

**TC-F54-01: Echte Detailansicht statt Miniatur**
- Setup: Mobiler Angebots-/Designerbereich mit ausgewählter erster Kachel.
- Action: Eigenschaften öffnen, Farbe/Größe ändern, Gesamtmotiv ansehen.
- Expected: Ausschnitt mindestens 160 px breit und aus denselben aktuellen
  Motivpixeln; Änderung sichtbar, kein Write oder zusätzlicher Undo-Schritt.

### F55: Eindeutige Zustände und Schutz vor Datenverlust

#### F55 Description

Speicherstatus ist wahrheitsgemäß und unabhängig von rein visuellen Änderungen.
Bestehende Dataverse-/Feature-Speicherlogik bleibt ausdrücklich erhalten.

#### F55 Inputs

Dirty-/Busy-Zustand, gespeicherter Stand, Berliner Tagesdatum, Gültigkeitszeitraum,
vorhandene Feature-Freigabe und geladener Versionsstand.

#### F55 Behaviour / Acceptance

- Dataverse: „Ungespeichert“, „Wird gespeichert“, „Gespeichert · Geplant/Aktiv/
  Abgelaufen“ beziehungsweise sichtbarer Speicherfehler. Hinweis, dass Speichern
  die bestehende Sichtbarkeit im Gültigkeitszeitraum steuert.
- Feature-Bestand: Entwurf und vorhandene Freigabe bleiben getrennt bezeichnet.
  Keine falsche Behauptung, ein gespeicherter Dataverse-Stand sei privat.
- Eigenschaften-Übernahme ersetzt Seitenspeichern nicht. Ansichtswechsel sind
  keine Änderungen. Verlassen geänderter Eingaben erfordert Bestätigung;
  Browsernavigation erhält den nativen Schutz bei ungespeicherten Änderungen.
- Gleichzeitige Bearbeitung wird anhand des beim Lesen erhaltenen Standes
  serverseitig geprüft. Konflikte überschreiben nichts; Entwurf bleibt offen
  und bietet bewusstes Neuladen nach Verwerfbestätigung, kein blindes Retry.
- Auch unveränderte Artikel-IDs dürfen keinen inzwischen geänderten Inhalt
  überschreiben. Löschungen verwenden denselben Konfliktschutz.

#### F55 Test Cases

**TC-F55-01: Wahrheitsgemäßer Status und fehlgeschlagenes Speichern**
- Setup: Geplante/aktive/abgelaufene Dataverse-Aktionen und Feature-Entwurf.
- Action: Ändern, Popup abbrechen/übernehmen, Speichern erfolgreich/fehlgeschlagen.
- Expected: Richtige getrennte Status, kein Erfolg bei Fehler; Entwurf bleibt
  erhalten. Verlassen warnt nur bei echten ungespeicherten Änderungen.

**TC-F55-02: Zwei Bearbeitungen desselben Inhalts**
- Setup: Zwei Clients laden denselben Stand mit identischen Artikel-IDs.
- Action: Client A speichert; Client B versucht Speichern oder Löschen.
- Expected: B erhält verständlichen Konflikt ohne Teiländerungen; sein Entwurf
  bleibt offen. Bewusst neu geladener Stand kann wieder gespeichert werden.

### F56: Qualitätsprüfung mit direktem Weg zur Fehlerstelle — ENTFERNT (19.11.2026)

#### F56 Description

Die Qualitätsprüfung wurde auf Nutzerentscheidung überall entfernt
(Erfassungsdialog, Aktionseditor, Vorschau). Sie meldete in der Praxis
Falschmeldungen für Nicht-Getränke-Artikel (z. B. gefordertes Pfand /
Grundpreis im Sammelflyer) und blockierte Ausgaben zu Unrecht.

Weiterhin gelten die Basisprüfungen beim Speichern: Pflichtfelder
(Artikelname), gültige Preise und Zeitraum sowie `M.validate`.
`M.quality` bleibt als Modellfunktion für Grenzwert-Meldungen bestehen,
hat aber keine Bedienoberfläche und blockiert nichts mehr.

#### F56 Behaviour / Acceptance

- Kein „Qualität prüfen“-Knopf, kein Qualitätsdialog, keine
  Qualitäts-Statuszeile, keine Blockierung vor Veröffentlichen,
  Drucken/PDF, Download, Waagenvorbereitung oder Speichern.
- Basisvalidierung (Pflichtfelder, Zeitraum, Preise) bleibt blockierend.

#### F56 Test Cases

**TC-F56-01: entfallen** (Feature entfernt).

### F57: Schnellere wiederkehrende Arbeit ohne Überraschungen

#### F57 Description

Vorhandene Artikelsuche und Bildwiederverwendung werden erhalten; neue
Dataverse-Aktionen können ohne sofortigen Write dupliziert und gezielte
Gestaltungseigenschaften auf ausgewählte Kacheln übertragen werden.

#### F57 Inputs

Quellaktion, neue Gültigkeit, Suchbegriff, ausgewählte Kacheln und ausdrücklich
ausgewählte Gestaltungseigenschaften.

#### F57 Behaviour / Acceptance

- „Duplizieren“ öffnet eine neue ungespeicherte Aktion mit neuen Artikel-IDs
  und neuen Aktionsbezügen; bestehende Bilder werden wiederverwendet.
- Daten und Gestaltung bleiben vollständig erhalten, neue Gültigkeit ist
  sichtbar zu prüfen. Duplizieren übernimmt keine Veröffentlichung oder
  Waagenaufträge und verändert die Quelle nicht.
- Artikelsuche bleibt über Name, Artikelnummer und Strichcode erreichbar;
  kein fremder Preis wird ungefragt zum Angebotspreis.
- Mehrfachübertragung bietet konkrete Zielkacheln und auswählbare Schrift-,
  Preisschild- oder Bilddarstellungswerte mit Vorschau und Bestätigung von
  Umfang/Anzahl. Keine Artikel-/Preiswerte oder Bildzuordnungen mitkopieren.
- Andere Ausgabeziele bleiben erhalten; eine Übernahme bildet einen
  rücknehmbaren Schritt. Abbruch und leere Auswahl ändern nichts.
- Übertragbar sind im aktuellen Ausgabeziel Schriftart, -größe und -farbe, Preisgröße
  und -farbe sowie Bildgröße und -drehung freier Gestaltungen; bei der
  Originalwochenvorlage Namens-, Preisschild- und Bildgröße sowie Drehung. Der Dialog
  „Gestaltung übertragen“ zeigt je Kachel „alt → neu“ und überträgt nur tatsächliche
  Unterschiede.

#### F57 Test Cases

**TC-F57-01: Neue Kopie ohne Nebenwirkung**
- Setup: Gespeicherte Aktion mit Gestaltung, Bildern und mindestens zwei Artikeln.
- Action: Duplizieren, verändern und abbrechen beziehungsweise bewusst speichern.
- Expected: Vor Speichern kein Write; neue Kennungen, unveränderte Quelle,
  vollständige Bild-/Gestaltungszuordnung und neue eigenständige Aktion.

**TC-F57-02: Gezielte Mehrfachübertragung**
- Setup: Drei unterschiedlich gestaltete Kacheln und getrenntes Waagenziel.
- Action: Nur Schriftfarbe auf Kachel zwei übertragen, abbrechen/übernehmen/Undo.
- Expected: Bestätigung nennt genau eine Zielkachel und Schriftfarbe; ausschließlich
  diese Eigenschaft ändert sich. Andere Werte/Ziele und Artikelpreise bleiben gleich.

### F58: Vollständiger Funktionserhalt und reproduzierbare Ausgabe

#### F58 Description

Der gesamte Arbeitsablauf wird vor Veröffentlichung mit echten UI-Eingaben und
isolierter Speicherung automatisch geprüft. Bereits begonnene F46–F51 werden
zusammen mit der kompakten Übernahme abgeschlossen, nicht als Altlast versteckt.

#### F58 Inputs

Beide Angebotsarten, vier Ausgabeziele, Original-/freie Vorlagen und alle
vorhandenen Eigenschaften gemäß Übernahmematrix im Implementierungsplan.

#### F58 Behaviour / Acceptance

- Artikel auswählen, Angebot erfassen, gestalten, speichern, erneut öffnen
  und ausgeben erhält Daten, Bilder und Gestaltung.
- Derselbe Zielrenderer liefert Vorschau und Export; Waage bleibt nativ,
  Name/Zusatz zusammen, Rot/Gelb austauschbar und alle angebotenen Farben wirksam.
- Direkte erste Kachel, Tastatur-/Touchbedienung, Vollbild, Splitter und Historie
  bleiben auf allen vier Zielansichten bedienbar.
- Jede bisherige Eigenschaft/Funktion hat im Plan einen erhaltenen Zielort und
  passende Prüfung; keine unbeauftragte Entfernung oder Vereinfachung.

#### F58 Test Cases

**TC-F58-01: Vollständiger Roundtrip**
- Setup: Isolierter API-/Dataverse-Ersatz, beide Angebotsarten und vier Ansichten.
- Action: Den vollständigen Ablauf einschließlich Bild, direkter Gestaltung,
  Neuöffnung und Ausgabe ausführen.
- Expected: Persistierte Werte und echte Ausgabe stimmen überein; F46–F57 und
  die Vorher-/Nachher-Matrix sind ohne versteckte Funktionsverluste erfüllt.

### F59: Ausschließlich geprüfte PR-Preview veröffentlichen

#### F59 Description

Nach bestandenen Prüfungen normale Commits und Push auf den bestehenden
Featurebranch; Preview-Deployment und schreibfreie Erreichbarkeit verifizieren.

#### F59 Inputs

Geprüfter Featurestand, vorhandene PR und deren bestehender Deploymentworkflow.

#### F59 Behaviour / Acceptance

- Keine Produktion, kein main-Merge, kein Force-Push, keine echten Testwrites.
- Keine Erfolgsmeldung bei ausstehenden/fehlgeschlagenen Checks.
- Produktive Dataverse-Daten der Preview dürfen durch Tests nicht verändert
  werden; alle Schreib-/Lösch-/Konfliktfälle laufen mit isolierten Testdaten.

#### F59 Test Cases

**TC-F59-01: Geprüfte Preview**
- Setup: Alle zugehörigen lokalen Verträge grün.
- Action: Normal veröffentlichen, Actions abwarten, Preview lesend prüfen.
- Expected: Richtiger Commit erfolgreich deployed, Oberfläche erreichbar und
  keine Teständerungen an produktiven Daten.

### Data & Contracts

Bestehende Speicher-/Sichtbarkeitsverträge bleiben erhalten. Neue optionale
Herkunftsmetadaten sind beschränkt und rückwärtskompatibel; alte Layouts bleiben
ohne fingierte Herkunft lesbar. Dataverse-Schreib-/Löschverträge erhalten einen
beim Lesen ausgegebenen Vergleichsstand zusätzlich zu ihren atomaren
If-Match-Operationen. Keine neue Dataverse-Tabelle oder Pflichtmigration.

### Open Questions

Keine offenen fachlichen Klärungsmarker. Bestehende Sichtbarkeitslogik und
Übernahme des kompakten Mockup-Stils wurden ausdrücklich bestätigt.

### Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F52 | TC-F52-01/02 | Produktverbesserungen | Folgt im Planungsschritt |
| F53 | TC-F53-01/02 | Produktverbesserungen | Folgt im Planungsschritt |
| F54 | TC-F54-01 | Produktverbesserungen | Folgt im Planungsschritt |
| F55 | TC-F55-01/02 | Produktverbesserungen | Folgt im Planungsschritt |
| F56 | — (entfernt) | Produktverbesserungen | 19.11.2026 entfernt |
| F57 | TC-F57-01/02 | Produktverbesserungen | Folgt im Planungsschritt |
| F58 | TC-F58-01 | Produktverbesserungen | Folgt im Planungsschritt |
| F59 | TC-F59-01 | Produktverbesserungen | Folgt im Planungsschritt |

## F60: Mockupgetreue Designverwaltung ohne Funktionsverlust

Die zuletzt freigegebenen Mockups bestimmen die UI möglichst 1:1:
Designbereichsauswahl, sechs Designerbereiche, strukturierter Preisschilddialog,
gemeinsamer Aktionsarbeitsraum und die neueste kompakte mobile Hülle.
Neuere abgestimmte Varianten ersetzen ältere Darstellungen, nicht deren Funktionen.
Einzelne Bildgrößen-/Drehregler bleiben direkt bedienbar. Nur komplexe
Preisschildeigenschaften werden transaktional zusammengefasst. Ein Feld hat
einen Besitzer; Dialogschließen stellt Feldposition und Sichtbarkeit korrekt
wieder her. Keine leeren ehemaligen Feldgruppen. Unterschiedliche Zielwerte
werden nicht wegen gleicher Beschriftung zusammengelegt.

- TC-F60-01: Alle sechs Bereiche und sämtliche vorher verfügbaren Datenkeys
  bleiben erreichbar, auch nach mehrfacher Dialogöffnung und Zielwechsel.
  Bildgröße und Drehung erfordern keinen Ein-Regler-Dialog.
- TC-F60-02: Preisschilddialog zeigt volle Eigenschaften strukturiert;
  Übernehmen ist ein Undo-Schritt, Abbrechen/X/Escape erhält den Entwurf
  einschließlich zuvor vorgenommener Änderungen.
- TC-F60-03: Designbereichsauswahl und Oberflächengeometrie gegen die neueste
  freigegebene Referenz vergleichen; notwendige Abweichungen dokumentieren.
- TC-F19-06 / TC-F60-04: Sichtbare Dreh-/Größengriffe proportional zur dargestellten
  Kachel verkleinern, damit sie das Motiv nur gering überdecken. Transparente
  Touch-Trefferflächen bleiben mindestens 44 px groß; sämtliche bisherigen
  Griffe, Dreh-/Skalierfunktionen und Zahlen-/Tastaturalternativen erhalten.
  Große und kleine Motiv-/Kachelgrößen auf allen vier Pflichtansichten prüfen.

## F61: Stilfamilie, echte Layoutvariante und Farbpalette

Farbdubletten werden konsolidiert, echte Geometrie-/Typografieunterschiede
bleiben erhalten: Magazin Grün/Türkis/Violett als Familie, XL als Bildvariante;
Bild-50-%- und Preisschild-Farbvarianten jeweils als Familie. Landladen und
bisheriges Klassisch bleiben wegen runder/eckiger Kacheln getrennt. Neun
globale Angebotsvorlagen entsprechen sechs Familien, 17 freie Vorlagen zehn.
Die sieben Wochenplanlayouts bleiben je Homepage-/Druckkontext verfügbar.

Stilwechsel erhält Palette und eigene Farben; Palette verändert nur Farben,
nicht Positionen, Schrift, Bildgröße, Artikelanzahl oder fremde Ziele.
Bestehende IDs, wirksame Farbwerte, Verläufe und Overrides ohne Schreibzugriff
beim Laden erhalten. Kein Ersetzen durch ähnlich aussehende neue Presets.
Eigene Farben bleiben sichtbar gekennzeichnet und werden bei Palettenwechsel
nur nach Bestätigung ersetzt. Separate Ersparnismarkerpalette, Preisbild
Rot/Gelb und individuelle Preisschildvorlagen bleiben erhalten.

- TC-F61-01: Alte Vorlagen unverändert laden; Familien/Varianten korrekt
  zuordnen und Speichern/Reload ohne Verlust vorhandener Werte prüfen.
- TC-F61-02: Jede angebotene Palette verändert echte Motivpixel, aber keine
  Nicht-Farbparameter; Großbild verändert hingegen echte Bildgeometrie.
- TC-F61-03: Eigene Farbe, Stilwechsel, Palette-Abbruch/bestätigter Ersatz,
  Undo/Redo und getrennte Ausgabeziele überstehen den Speicherroundtrip.
- TC-F61-04: Alle bestehenden Farb-/Verlaufseigenschaften einschließlich
  Kopf-, Datums-, Trenn-, Preisleisten- und Fußfarben bleiben wirksam.

## F62: Gemeinsame vollständige Aktionsbearbeitung

Artikel/Bilder, Gestaltung und Ausgabe sind Bereiche desselben Arbeitsablaufs.
Kein Verlust ungespeicherter Eingaben, ausstehender Bilder oder Historie beim
Wechsel. Erfassung verwendet die vorhandenen Cent-/Milliliterverträge und
Schreib-/Revisionspfade. Keine zweite Persistenz oder Platzhalterausgabe.

Desktop behält volle Erfassungsbreite, ausgerichtete Hauptzeile und Beschreibung
darunter. Die neue vollständige Referenz konkretisiert F17:
normale Referenzzeile 125 px, Getränkereferenz einschließlich
aller Zusatzfelder 194 px; längere Inhalte dürfen vollständig umbrechen.

- TC-F62-01: Beide Arten mit Suche/manueller Erfassung, Reihenfolge, Bildern
  aus Bestand/Datei/Paste, Preisen/Pfand, Speichern/Reload und Konflikten
  durchlaufen; keine Stammpreisänderung.
- TC-F62-02: Erfassung/Gestaltung/Ausgabe wechseln ohne Datenverlust,
  alle vier Ziele, bedingte Marker und sämtliche Ausgabewege erhalten.
  Speicherkonflikte überschreiben keinen fremden Stand und behalten den
  gemeinsamen aktuellen Entwurf einschließlich ungespeicherter Eingaben.
- TC-F62-03: Vollständige Funktionsübernahmematrix und vorhandene fachliche
  Regressionen bestehen; keine nicht gezeigte Funktion still entfernen.

## F63: Mobiler Inhalt vor Kopf-, Filter- und Metadatenblöcken

Eine kompakte Kopfzeile statt gestapelter Titel-/Tabzeilen. Aktionsdaten bei
Bestandsaktionen eingeklappt, bei Neuanlage und fehlenden Pflichtdaten offen.
Aktive Filter bleiben erkennbar, ihre Auswahl ist bedarfsweise aufklappbar.
Handy: kompakte Artikelliste, ein Artikel im Arbeitsraum mit Vorheriger/
Nächster, Rückweg ohne Verlust. Touchziele mindestens 44 px, Mausaktionen
32 px; Eingabewerte lesbar. Keine abgeschnittenen Auswahltexte.
Das hohe Ladentablet nicht allein wegen 686 px Breite wie ein Handy behandeln.

- TC-F63-01: Referenz-Artikelliste in 320x568, 360x640, 375x667 und 390x844:
  Kopf 44 px, erste Karte spätestens y=164, drei Referenzartikel voll sichtbar
  und mindestens 75 % Fensterhöhe für den Inhaltsbereich bei geschlossenen
  Metadaten; lange Listen und geöffnete Pflichtdaten dürfen scrollen.
  Auswahl und Rückkehr aus dem gemeinsamen Editor erhalten Reihenfolge,
  aktuelle Daten und noch nicht gespeicherte Bilder.
- TC-F63-02: Einzelartikel mit allen zehn Getränkefeldern auf normalen
  Handyformaten ohne Scrollen; kurze Fenster/320x568 begrenzt vertikal.
  Fokus, unbestätigte Eingaben und Daten beim Größenwechsel erhalten.
- TC-F63-03: Stil-/Palettenauswahl ohne unnötiges Scrollen; übrige Fläche
  für Motiv statt leere Auswahlbereiche. Vier Pflichtansichten einschließlich
  Touch/DPR 1,75 sowie kleine/kurze Fenster geometrisch prüfen.

## F64: Wirksame Originalvorschau und nachgewiesene Veröffentlichung

Originalrenderer und direkte Auswahl/Verschiebung/Skalierung/Drehung bleiben,
ebenso Ghost, Duplikate, eigene Bilder, Zahlen-/Tastaturalternativen,
Splitter/Zoom, Historie, eigene Vorlagen, Rücksetzen und Kacheltransfer.
Marker-/Farbweltänderungen erreichen den tatsächlichen Konfigurationspfad.
Texte vollständig darstellen oder eine echte Qualitätsgrenze sichtbar melden,
nicht pauschal kürzen. Speichern steuert CMS-Sichtbarkeit im Zeitraum;
Featurefreigabe und ausdrücklicher Waagenversand bleiben getrennt.

- TC-F64-01: Zielbezogene Markerform/Farbe/Größe verändern Canvaspixel;
  Wie-Vorgabe erbt korrekt, Speichern/Reload und andere Ziele isoliert.
- TC-F64-02: Lange echte Produkt-/Zusatz-/Gebinde-/Pfandtexte, direkte
  Motivbearbeitung und Transfer im Originalrenderer regressionsfrei.
- TC-F64-03: Visuelle Referenzen und vollständige Funktionserhaltung separat
  abnehmen. Bestehende fachliche Tests nicht abschwächen. Erst danach
  Commit/Push und schreibfreie PR-Preview-Abnahme gemäß TC-F59-01;
  keine Produktion, kein Merge nach main, keine echten Preview-Schreibtests.

## F65: Eindeutige Designherkunft und gespeicherter Bereichsstandard

Alle sechs globalen Designer und Aktionsgestaltungen zeigen kompakt Bereich,
aktives Layout/Variante und die Herkunft einer geladenen eigenen Vorlage.
Herkunft und Speicherzustand sind getrennt. Weitere Anpassungen behalten den
historischen Vorlagennamen und kennzeichnen die Gestaltung als angepasst.
Optionale validierte Herkunftsdaten bleiben beim Speichern/Neuoeffnen erhalten;
bei Altbestand ohne verlaessliche Herkunft wird kein Name geraten.

"Bereichsstandard laden" laedt die aktuell gespeicherte Bereichsgestaltung,
die neue Angebote verwenden, nicht die getrennte alte Ruecksetzvorgabe.
Ungespeicherte Gestaltung nur nach Bestaetigung ersetzen. Uebernahme ist
atomar und rueckgaengig, speichert nicht und veraendert weder andere Bereiche/
Ausgaben noch Artikel, Preise, Produktbilder oder Vorlagenlisten.
Ladefehler/Abbruch erhalten den Entwurf. Aeltere Werks-/Ruecksetzfunktionen
bleiben eindeutig getrennt erreichbar.

- TC-F65-01: Eigene Vorlage laden, anpassen, Undo/Redo, speichern/neu oeffnen:
  Herkunft und wirkliches Layout stimmen; Altbestand erhaelt keinen Namen.
- TC-F65-02: Bereichsstandard nach bestaetigter Uebernahme korrekt; Abbruch/
  Ladefehler identisch, keine Schreibanfrage, fremde Bereiche/Ziele erhalten.
- TC-F65-03: API akzeptiert begrenzte optionale Herkunft und erhaelt sie im
  Roundtrip; ungueltige Werte/Versionen werden explizit abgelehnt.

## F66: Lesbare Auswahlfelder und bedienbare Produktergebnisse

Auswahltexte sind vertikal vollstaendig sichtbar, lange Werte zugaenglich.
Die kompakte Mausbedienung und mindestens 44-px-Touchziele bleiben erhalten.
Produktsuche bleibt beim Klicken/Ziehen am eigenen Scrollbalken sowie
Rad-/Touchscrollen offen. Tab, Escape, echte Aussenklicks und Auswahl
schliessen weiterhin korrekt; kein versehentlich ausgewaehlter Artikel.
Exakte Name-, Artikelnummer- und Strichcode-Treffer erscheinen vor
Teiltreffern, bevor die Ergebnisliste auf zwoelf Eintraege begrenzt wird.
Farben, Groessen und andere kontinuierliche Gestaltungseingaben aktualisieren
die echte Vorschau bereits waehrend `input`, ohne Auswahlwechsel, Blur oder
Schliessen des nativen Farbwaehlers. Der aktive Editor und Fokus bleiben erhalten;
eine Eingabeserie bildet einen ruecknehmbaren Schritt und wird nicht gespeichert.
Die gemeinsame Fussleiste richtet sich nach der tatsaechlichen Werkzeugbreite:
ab 500 px stehen Undo/Redo, weitere Aktionen, Arbeitsansicht, Status und Speichern
in einer kompakten Zeile; darunter darf der Status eine eigene Zeile belegen.
Keine unnoetige dritte Reihe; Status und alle Funktionen bleiben erreichbar,
Mauskontrollen kompakt und Touchziele mindestens 44 px.

- TC-F66-01: Echte betroffene Preisschildselects samt Text/Innenhoehe auf vier
  Ansichten sichten/messen; keine abgeschnittenen Auswahltexte.
- TC-F66-02: Zwoelf Produkttreffer mit echten Mausaktionen an Scrollspur und
  Griff scrollen, dann unteren Treffer waehlen; Escape/Tab/Aussenklick/
  Touch und Dialogcleanup bleiben funktionsfaehig.
- TC-F66-03: Farbe und Groesse nur durch `input` veraendern, ohne `change`/Blur;
  sichtbare Vorschau aendert sich sofort, Feld bleibt aktiv, Undo stellt den
  vorherigen Stand her. Gilt fuer globale Designer und Aktionsgestaltung.
- TC-F66-04: Bei mehr als zwoelf Teiltreffern erscheinen exakte Namen und
  Artikel-/Strichcodes vor der Trefferbegrenzung.
- TC-F66-05: Breite und schmale Werkzeugspalten auf vier Ansichten messen;
  Fussleiste belegt hoechstens eine beziehungsweise zwei Inhaltsreihen,
  ohne verdeckte Bedienelemente oder beschnittenen Status.
- TC-F66-06: Gespeicherte eigene Vorlagen (Plakat, Flyer, gemeinsam, Wochenplan)
  werden dauerhaft in `design_presets` bzw. `wp_design_presets` abgelegt und
  sind nach einem Neuladen wieder sichtbar; Namen werden nicht als HTML gedeutet.
- TC-F66-07: Die Waagenvorschau liegt sichtbar und bedienbar über dem modalen
  Aktionseditor; Escape schließt nur sie. Bilder zeigen Klartext statt
  technischer Dateinamen; alle Bilder werden ohne Auswahl übertragen.
- TC-F66-08: „Ausgabe" ist ein direkter Knopf (keine Auswahlliste); die
  Ausgabeleiste ist kompakt und lässt den Flyer auf vier Ansichten groß sichtbar.
- TC-F66-09: Waage ist in der Aktionsliste direkt erreichbar und öffnet ohne
  Zwischendialog; Löschen steht beschriftet im Menü „⋯".
- TC-F66-10: Der Preisschild-Dialog ist für Sonder- und Getränkeaktion, Sammel-
  und Einzelflyer erreichbar und der Zugang ist nicht dauerhaft deaktiviert.
- TC-F66-11: Im Aktionseditor (Sonderaktion) lässt sich eine eigene Vorlage aus
  „Eigene Vorlagen" wählen (Plakat für Sammelflyer/Kachel, Einzelflyer für
  Einzelflyer); sie ersetzt nach Bestätigung nur das aktuelle Ausgabeziel,
  setzt die Herkunft auf den Vorlagennamen und speichert nicht automatisch.
- TC-F66-12: „Teilen" öffnet zuerst das System-Teilen-Menü (WhatsApp-App), auch
  wenn `canShare` false meldet. Nur wenn das scheitert oder fehlt, erscheint ein
  Dialog: Mobil „WhatsApp öffnen" (wa.me → App), „Herunterladen"; am Desktop
  zusätzlich „Bild kopieren & WhatsApp öffnen" (PNG in die Zwischenablage, Strg+V,
  öffnet die WhatsApp-App über `whatsapp://`) und „WhatsApp Web". Kein stiller Download.
- TC-F66-13: In den Design-Einstellungen heißt der Speichern-Knopf „Als Standard
  speichern". Ist eine eigene Vorlage geladen (oder gerade angelegt), speichert
  „Vorlage speichern" nur diese Vorlage; der Standard bleibt unverändert. Der
  Standard wird dann über den Knopf „Als Standard speichern" neben „Standard-
  Gestaltung laden" gesetzt. Laden einer Vorlage und „Standard-Gestaltung laden"
  aktualisieren die Vorschau sofort. „+ Vorlage speichern" fragt bei gleichem
  Namen „Vorlage ersetzen?". „★ Als Standard speichern" und „Werkseinstellungen"
  entfallen; „Auf Default zurücksetzen" nutzt die Werksvorgaben. Gilt für
  Plakat, Einzelflyer, Wochenplan und Getränkeflyer.
- TC-F66-14: Bezeichnung und Zusatztext haben je eine eigene Schriftstärke
  (Normal 400 · Halbfett 600 · Fett 700 · Extrafett 900; Standard 900 bzw. 600),
  im Designer und im Aktionseditor, gespeichert und von der API geprüft. Die
  Bedienelemente der Feinabstimmung stehen in einer gemeinsamen Spalte.

## F67: Gemeinsame Artikelnavigation und volle CMS-Inhaltsbreite

Sonder- und Getraenkeangebote bieten an der bestehenden Artikelauswahl
Vor/Zurueck und "Artikel x von n", bei erster/letzter Position deaktiviert.
Keine zyklische Navigation. Auswahlliste, CMS-Artikelpositionen, direkte
Vorschauauswahl, Inspector und Zaehler verwenden denselben aktuellen Artikel.
Navigation speichert nicht und erhaelt Werte, Bilder, Ziel, Werkzeugkontext
und Historie. Null/ein Artikel und Loeschen/Umordnen sind deterministisch.
Sammelflyer-Seitenpfeile bleiben Seitensteuerung, keine Artikelpfeile.

Der eingebettete CMS-Editor nutzt die verfuegbare Inhaltsbreite mit genau
einem aktiven Werkzeug-/Vorschausplit. Keine leere aeussere Rasterspalte;
aktiver Hauptschritt entspricht dem sichtbaren Inhalt. Containerbreite,
verborgener Einstieg, Resize und Vollbild korrekt behandeln.

- TC-F67-01: Beide Arten mit drei Artikeln ueber Pfeile/Select/Vorschau
  wechseln; Grenzen, null/ein Artikel und erhaltenen Entwurf pruefen.
- TC-F67-02: Echter CMS-Einstieg/Modal/Kiosk/Standalone nutzen volle Breite;
  Hauptnavigation, vier Ansichten, Resize und Wiederoeffnen pruefen.

## F68: Reine Ausgabevorschau und eindeutig begrenzter Export

Ausgabe zeigt ausschliesslich das Ergebnis mit direkt daran platzierten
Aktionen, Artikelwahl und Zaehler, ohne bearbeitbare Hitlayer. Gestaltung
bleibt separat; kein zweiter unbestimmter Speicherbutton unter Ausgabe.
PNG/Druck verwenden den beim Klick sichtbaren Ausgabe-/Artikelzustand
einschliesslich ungespeicherter Gestaltung, ohne implizites Speichern,
Veroeffentlichen, Hochladen oder Waagensenden.

Einzelflyer: aktuellen Artikel direkt als PNG oder drucken/PDF; "Weitere
Artikel" bietet Checkboxen, Alle, Auswahl aufheben und Sammeldruck mit Anzahl.
Anfangs aktueller Artikel gewaehlt, null Auswahl deaktiviert, Reihenfolge
wie Aktion. Abbruch aendert keine Gestaltung/Artikelwahl.
Kachel-Download liefert die angezeigte Kachel; Sammelflyer-Seitendownload
die angezeigte Seite, Gesamtausgabe bleibt separat eindeutig erreichbar.
Alle bisherigen Qualitaets-/Fehler-/Bestaetigungsgates bleiben erhalten.
Dieses Konzept gilt gleich fuer Sonder- und Getraenkeangebote.

- TC-F68-01: Ausgabe nicht editierbar, Rueckkehr erhaelt Kontext; aktueller
  Artikel B erzeugt genau B als PNG/Druck, keine andere Ausgabe.
- TC-F68-02: Auswahl B/C, Alle, Nullauswahl und Abbruch liefern exakt den
  angeforderten Umfang; danach Einzeldruck weiterhin einzeln.
- TC-F68-03: Zieltreue fuer Kachel/Sammelseite/Waage,
  eingefrorener Exportumfang und keine impliziten Schreibanfragen
  (Qualitaetsgates sind seit 19.11.2026 entfernt).

## F69: Ein Flyer pro A4-Seite ohne Restbogen

Je angefordertem Einzelflyer entsteht genau eine vollstaendige A4-Seite,
ohne Fragmentierung, abgeschnittenen Rahmen oder zusaetzlichen roten
Balkenbogen. Motiv proportional innerhalb der nutzbaren Seite einpassen,
nicht beschneiden/verdecken. Echte Sammelflyer-Folgeseiten erhalten.
Browserdruck erfolgt nur ausdruecklich; Druckende/Abbruch reinigen den
Druckzustand. Physischer Druckertreiber bleibt manuelle Gegenprobe.

- TC-F69-01: Original-CMS-Einzelflyer mit Rahmen und Getraenkeflyer im echten
  modalen Ausgabeweg als PDF: exakt eine Seite; ausgewaehlte zwei Flyer
  exakt zwei Seiten, Motiv vollstaendig. Sammelflyer-Regression erhalten.
- TC-F69-02: Druck aus dem eingebetteten CMS-Modal (cms.html) liefert je
  angefordertem Einzelflyer eine eigene A4-Seite; das html/body-Druck-
  Zuruecksetzen verhindert, dass Chrome nach der ersten Seite abschneidet.

## F70: Motiv zuerst am Telefon (Aktionseditor)

Die Telefonansicht (unter 640 CSS-px Dialogbreite) des eingebetteten
Aktionseditors kehrt die bisherige Stapelung um: Das Motiv fuellt die
Arbeitshoehe, die Werkzeugspalte wird zu einem aufschiebbaren Blatt
(Bottom-Sheet) ueber dem Motiv. Eine schmale Motivleiste unten enthaelt
Artikelnavigation und den Werkzeuge-Umschalter; bei gewaehltem Element
zusaetzlich Elementname und einen Eigenschaften-Knopf, der das Blatt
oeffnet. Der Ausgabe-Tab behaelt seine eigene Ausgabeleiste mit voller
Vorschauhoehe; Vollbild bleibt der bestehende Knopf. Alle Werkzeuge,
Felder, Undo/Redo und Speichern bleiben unveraendert erreichbar —
nur die Anordnung aendert sich. Gilt fuer alle Aktionen (auch Wochen- und
Sonderaktionen mit CMS-Vorlage), aber nur fuer den Aktionseditor am
Telefon; eigenstaendige Editoren und breite Ansichten bleiben unveraendert
(TC-F19-02 gilt dort weiter).

- TC-F70-01: Auf 375x667 zeigt der Gestaltungstab das Motiv mit mehr als
  der halben Dialoghoehe, das Blatt ist geschlossen und die Motivleiste
  sichtbar; „Werkzeuge" oeffnet das Blatt mit den Reitern
  Element/Artikel/Vorlage/Marker/Ansicht und „Fertig" schliesst es. Gilt
  fuer Getraenke- und Wochenaktionen (TC-AEA-F1-01 prueft beide Arten).
- TC-F70-02: Antippen eines Elements im Motiv zeigt Elementname und
  Eigenschaften-Knopf in der Motivleiste und schliesst ein offenes Blatt;
  der Eigenschaften-Knopf oeffnet das Blatt mit dem Element-Reiter.
- TC-F70-03: Die Artikelnavigation in der Motivleiste blaettert wie die
  bisherige Navigation (Positionstext, Grenzen deaktiviert) und bleibt
  mit der Auswahl im Blatt synchron; im Ausgabe-Tab ist die Motivleiste
  ausgeblendet.

## F71/F72: Werkzeuge in der Vorschau, feste Hauptleiste, Touch und Zurück-Taste (Telefon)

Praxistest von F70 auf 375x667 mit echter Bedienung (Sammelflyer): Das
Werkzeugblatt zeigte nur ca. 204 px von 588 px Werkzeuginhalt und
verdeckte oder verkleinerte das Motiv auf wenige Pixel. Rueckmeldung zu
F71: Werkzeuge und Vorschau duerfen nicht getrennt sein; der Knopf „Mehr"
neben Speichern ist sinnlos, Rueckgaengig usw. gehoeren auf die Hauptseite;
jede Beruehrung eines Elements wurde sofort aktiv, sodass man nicht scrollen
konnte; die Android-Zurueck-Taste verliess die Seite bzw. schloss den
ganzen Editor. Deshalb gilt am Telefon (Gestaltungstab, geteilte Ansicht):

- **Reiterleiste oben** (Element, Artikel, Vorlage, [Marker nur Wochenaktion],
  Ansicht): oeffnet das Werkzeugblatt mit dem gewaehlten Reiter; erneutes
  Antippen des aktiven Reiters oder „Fertig" schliesst es. „Mehr" entfaellt.
- **Schnellleiste als Ueberlagerung auf der Vorschau**: Elementauswahl,
Verschieben (4 Pfeile), Groesse (− / +), Drehen (↺ ↻ je 15°); sitzt immer
am unteren Rand der Vorschau und weicht nicht mehr aus. Die scrollbare
Vorschau reserviert unten konstant Scrollraum in Leistenhoehe, damit auch
das untere Ende des Motivs beim Scrollen ueber der Leiste bleibt; nach
Auswahl oder Layoutaenderung wird das gewaehlte Element gegebenenfalls
ueber die Leiste gescrollt (nie waehrend des eigenen Scrollens, damit die
Leiste nicht gegen den Nutzer arbeitet). Knoepfe mindestens 44 px;
Verschieben, Groesse
  und Drehen wiederholen beim Gedrueckthalten. Sie loest die Knoepfe der
  vorhandenen Werkzeugspalte aus (gleiche Logik, kein zweiter Code-Pfad).
- **Feste Hauptleiste unten** (einzeilig, immer sichtbar, nie hinter einem
  Menue): Rueckgaengig, Wiederholen, Artikelnavigation („1 / 6"),
  Speichern, Arbeitsansicht. Das Blatt nutzt den ganzen Arbeitsbereich fuer
  Formularaufgaben; die Hauptleiste bleibt dabei sichtbar.
- **Touch**: Antippen eines Elements waehlt es aus. Ziehen mit dem Finger
  an einem Element scrollt die Vorschau und aendert nichts. Verschieben,
  Groesse und Drehen starten nur an den Griffen (✥ verschieben, ↘ Groesse,
  ↻ drehen; `touch-action:none`) oder ueber die Schnellleiste. Maus und
  Stift behalten das Ziehen am Element.
- **Zurueck-Taste (Android)**: Editor und geoeffnetes Blatt sind Ebenen im
  Browserverlauf. Zurueck schliesst zuerst einen offenen Dialog, dann das
  Blatt, dann den Editor; mit ungespeicherten Aenderungen erscheint die
  Rueckfrage, „Abbrechen" laesst den Editor offen und die naechste
  Zurueck-Taste fragt wieder. Die Seite wird nie verlassen, solange ein
  Editor offen ist; eigene Schliesswege (Schliessen, Artikel/Bilder,
  Uebersicht) geben die Verlaufseintraege wieder frei.
- Alle bisherigen Werkzeuge bleiben erhalten. Mapping: Verschieben, Groesse,
  Drehen, Elementwahl → Schnellleiste und Griffe, zusaetzlich Blatt;
  Rueckgaengig/Wiederholen/Speichern/Artikelwechsel/Arbeitsansicht →
  Hauptleiste; Reiter → Reiterleiste; „Gestalten fuer", „Standard-Gestaltung
  laden", „Eigene Vorlage laden" und alle uebrigen Felder → Blatt (der
  Gestaltungskontext zieht am Telefon in das Blatt). Die Chip-Anzeige aus
  F70 entfaellt (die Elementauswahl der Schnellleiste zeigt das Element).

- TC-F71-01: Auf 375x667 sind fuer Wochen- und Getraenkeaktion die 8
  Schnellknoepfe sichtbar, mindestens 44 px hoch und liegen innerhalb der
  Vorschau; das Motiv ist hoeher als 300 px, die Hauptleiste ist einzeilig
  (< 70 px) und enthaelt die Arbeitsansicht, kein Seiten-Scrollen, das Blatt
  ist geschlossen; die Schnellleiste ueberdeckt das gewaehlte Preis-Element
  beim ersten und beim letzten Artikel nicht.
- TC-F71-02: Element „Preis" waehlen, nach links schieben und vergroessern
  setzt den Gestaltungsstand auf „geaendert"; Rueckgaengig der Hauptleiste
  macht beides rueckgaengig (ohne das Blatt zu oeffnen); ein Reiter oeffnet
  das Blatt und blendet die Schnellleiste aus (Rueckgaengig und Speichern
  bleiben sichtbar), „Fertig" stellt sie wieder her.
- TC-F71-03: Beim Scrollen der Vorschau verdeckt die Schnellleiste keinen
  Inhalt: die scrollbare Vorschau reserviert unten konstant Platz in
  Leistenhoehe, sodass sich das untere Ende des Motivs ueber die Leiste
  hinaus scrollen laesst und die Zoomleiste (Sticky) nach dem Scrollen oben
  bleibt statt mittig zu kleben; nach Auswahl wird das gewaehlte Element
  ueber die Leiste gescrollt; beim Oeffnen des Blatts wird der reservierte
  Platz freigegeben.
- TC-F72-01: Touch-Ziehen am Element (Wochen- und Getraenkeaktion) laesst
  den Gestaltungsstand unveraendert; Antippen waehlt das Element; Ziehen am
  ✥-Griff aendert die Gestaltung; Elementflaechen erlauben natives Scrollen,
  Griffe nicht.
- TC-F72-02: Zurueck-Taste schliesst erst das Blatt, dann (mit Rueckfrage)
  den Editor; „Abbrechen" haelt den Editor offen, die naechste Zurueck-Taste
  fragt erneut; die URL bleibt unveraendert.

## F73: Gestaltung am Telefon ohne Reiterleiste (Auswahl steuert das Blatt)

Rueckmeldung zu F72: Die Reiter Element, Artikel, Ansicht und „Fertig" sind in
dieser Form ueberfluessig (Elementwahl, Artikelwechsel und Zoom liegen schon in
Schnell- und Hauptleiste, „Fertig" schliesst nur das Blatt); Marker und Vorlage
gehoeren auf die erste Seite der Gestaltung. Mockup
`mockups/angebote-gestaltung-ohne-reiter-mockup.html` und die fuenf
Konsolidierungen unten sind vom Nutzer ausdruecklich freigegeben. Der Umbau gilt
nur am Telefon (Dialogbreite unter 640 CSS-px, Gestaltung, nicht Ausgabe);
Tablet und Desktop behalten ihre Reiter unveraendert.

- Die Reiterleiste (`.an-motiv-tabs`) und der Knopf „Fertig" entfallen.
- **Eigenschaften-Blatt mit Rastpunkten** statt Reitern: Peek (Standard: nur
  Kopf und Kurzwahl-Chips, das Motiv behaelt fast die ganze Hoehe), Halb und
  Voll. Nachfreigabe: Das durchscheinende Blatt ueberlagert ausschliesslich
  die Vorschau oberhalb der Hauptleiste; die Motivgroesse bleibt in allen
  Rasten unveraendert. Optik, Reihenfolge und Zusammenfassungen folgen dem
  freigegebenen Mockup, nicht nur dessen Funktionsumfang. Der Kopf zeigt
  den Namen der Auswahl (sonst „Seite · Ausgabeziel") und eine passende
  Zustandszusammenfassung sowie ▲/▼; Tippen auf
  den Kopf schaltet Peek → Halb → Voll → Peek.
- **Alle Einstellungen stehen im Blatt untereinander** (keine Reiter):
  Elementwerkzeuge, Vorlage und Stil (aufklappbar), Ersparnis-Marker
  (aufklappbar, nur Wochenaktion; Typ, Farbwelt, Markergroesse).
  Artikeldaten entfallen hier ausdruecklich; sie bleiben in Artikel/Bilder.
  Schrift, Preisschild und Bild verwenden ihre bestehenden vollstaendigen
  Eigenschaftenfenster mit unveraenderter Uebernehmen-/Abbrechen-Transaktion.
- **Kurzwahl-Chips im Peek**: ohne Auswahl „Marker" (nur Wochenaktion),
  „Schrift", „Preisschild", „Bild", „Stil"; mit Auswahl zusaetzlich „Position".
  Marker/Stil/Position setzen das Blatt auf „Halb" und scrollen die Gruppe in
  den Blick; Objektchips oeffnen das zugehoerige Eigenschaftenfenster.
- Kein zusaetzliches Ziel-Popup in der Gestaltung. Der uebliche Zielwechsel
  erfolgt unter Ausgabe. Bestehende Zielauswahl und Standard-/eigene Vorlagen
  bleiben im geoeffneten Blatt erreichbar, nicht als weitere Zeile ueber dem
  Motiv. Zoom schwebt kompakt ueber dem Motiv und reserviert keine eigene Zeile.
- Schnellleiste (nur bei Peek), Hauptleiste (Rueckgaengig, Wiederholen,
  Artikel n / N, Arbeitsansicht, Speichern), Touch-Regeln und die
  Zurueck-Taste (Blatt schliessen = auf Peek, dann Editor) aus F71/F72 bleiben.
  Eigenschaftenfenster und Blatt schliessen sich mit der Zurueck-Taste.
- Mapping (nichts geht verloren): Reiter Element → Auswahl im Motiv, Blatt und
  Schnellleiste; Reiter Artikel → ausdruecklich entfernt aus der Gestaltung,
  Bearbeitung in Artikel/Bilder, Artikelwechsel bleibt in der Hauptleiste;
  Reiter Vorlage → vorhandene Vorlagencontrols im Blatt und Gruppe „Stil";
  Reiter Marker → Gruppe „Ersparnis-Marker"; Reiter Ansicht → Seitenwechsel
  im Blatt und schwebende Zoomleiste;
  „Fertig" → entfaellt, das Blatt schliesst per ▼, Kopf-Tipp oder Zurueck.
  Ausgabe bleibt der eigene Bereich „Ausgabe / Gestaltung" (Aktionsbereich).

- TC-F73-01: Auf 375x667 gibt es keine Reiterleiste und keinen Knopf „Fertig";
  das Blatt steht im Peek (hoechstens 120 px), das Motiv ist hoeher als 300 px,
  kein Seiten-Scrollen; Kurzwahl-Chips: „Schrift", „Preisschild", „Bild", „Stil"
  und bei Wochenaktion „Marker". Vorhandene Auswahl ergaenzt „Position".
  Blatt halb/voll veraendert weder Vorschau-Rechteck noch Canvasgroesse.
- TC-F73-02: Chip „Marker" (Wochenaktion) setzt das Blatt auf Halb und zeigt
  Typ, Farbwelt und Markergroesse; eine Aenderung wirkt in der Vorschau, setzt
  den Stand auf „geaendert" und Rueckgaengig der Hauptleiste macht sie
  rueckgaengig. Das Blatt ist hoeher als der Peek, das Motiv bleibt sichtbar.
- TC-F73-03: Chip „Stil" klappt die Gestaltung auf; Standard-Gestaltung und
  Zielauswahl bleiben ohne neues Popup erreichbar. Objektchips oeffnen die
  vorhandenen Schrift-/Preisschild-/Bild-Eigenschaften.
- TC-F73-03b: Auf Telefonen oeffnen alle drei Objektchips bei Getraenke- und
  Wochenaktion ein durchscheinendes Blatt ohne Hintergrundabdunklung.
  Eingaben scrollen intern; Abbrechen/Uebernehmen bleiben vollstaendig sichtbar.
  Android-Zurueck verwirft die lokale Bearbeitung, ohne neuen Undo-Schritt,
  Schreibzugriff, Motivverkleinerung oder Verlassen des Editors.
- TC-F73-04: Mit gewaehltem Element zeigt der Blattkopf dessen Namen und den
  Chip „Position"; Artikelfelder sind in der geteilten Gestaltung unsichtbar;
  ohne Auswahl (Rueckfall, der Editor waehlt beim Zielwechsel selbst ein
  Element) heisst der Kopf „Seite · Ausgabeziel" und „Position" entfaellt.
- TC-F73-05: Zurueck-Taste: erst Eigenschaftenfenster (Abbruch), dann Blatt
  (auf Peek), dann Editor;
  ▼ im Kopf und Kopf-Tipp schalten die Rastpunkte; im Ausgabe-Bereich ist das
  Blatt ausgeblendet. Tablet und Desktop behalten die Reiter.

## F75: Scrollbare Live-Vorschau bei offenen Eigenschaften

Nachfreigabe zu F73/F74: Im Telefon-Aktionseditor bleiben Motivgröße und
freigegebenes Erscheinungsbild erhalten. Alle Gestaltungsänderungen, auch
Schrift, Preisschild und Bild, erscheinen bereits während der Eingabe im
Motiv. Die vom Nutzer bestätigte Transaktion bleibt: Übernehmen behält den
lokalen Stand, Abbrechen, Schließen, Escape und Android-Zurück stellen den
Stand vor dem Öffnen einschließlich Speicherstatus und Undo/Redo wieder her.
Kein automatischer Schreibzugriff.

- Die freie Vorschau bleibt mit echten Fingerbewegungen scrollbar, sowohl
  im Peek als auch bei offenem Position-/Marker-/Stilblatt oder
  Schrift-/Preisschild-/Bildfenster. Scrollen verändert keine Gestaltung
  und wird nicht durch automatisches Nachführen rückgängig gemacht.
- Die drei Eigenschaftenfenster überlagern am Telefon als durchscheinende,
  unten verankerte Halbhöhen-Blätter dieselbe unverkleinerte Vorschau.
  Sie sperren nur andere Bearbeitungsaktionen, nicht Scrollen/Zoom der
  Vorschau. Alle bestehenden Felder, Reset, Übernehmen und Abbrechen bleiben;
  die Felder scrollen intern, Kopf und Abschlussaktionen bleiben erreichbar.
- Beim Artikel-/Elementwechsel und Öffnen eines Blatts wird die zugehörige
  Kachel oberhalb der Überlagerung sichtbar gemacht, nicht stets der erste
  Artikel. Bei echtem Zoom wird der erreichbare Kachelausschnitt gezeigt,
  ohne den Zoom eigenmächtig zu ändern. Während manuellen Scrollens erfolgt
  kein Zurückspringen zur Auswahl. Der interne Scrollraum berücksichtigt
  Schnellleiste, Eigenschaftenblatt und Eigenschaftenfenster.
- Änderungen an Preisschild-Vorlagen aktualisieren auch die abhängigen
  Felder im geöffneten Fenster, ohne verschobene Controls zu verlieren.
  Außerhalb des Telefon-Aktionseditors bleibt das modale Verhalten erhalten.

### Testfälle

- TC-F75-01: Für Sonder-/Wochen- und Getränkeaktion mit sechs Artikeln echte
  Browser-Touchgesten im Peek und geöffneten Blatt ausführen. Scrollposition
  muss sich messbar ändern und stabil bleiben; Gestaltung und Schreibzahl
  bleiben gleich. Ein Griff verändert weiterhin nur bewusst die Gestaltung.
- TC-F75-02: Schrift, Preisschild und Bild im Telefoneditor jeweils öffnen:
  Eingaben verändern die tatsächlichen Motivpixel vor dem Schließen;
  die freie Vorschau bleibt mit Touch scrollbar. Abbrechen/Escape/Zurück
  stellen Motiv und Historie wieder her; Übernehmen ergibt einen Undo-Schritt.
  Vorlagenwechsel im Preisschildfenster synchronisiert die abhängigen Felder.
- TC-F75-03: Letzten Artikel und ein Element auswählen, dann Position,
  Marker/Stil und Eigenschaften öffnen: die passende Kachel liegt im freien
  Motivbereich, Vorschau-/Canvasgröße und Zoom bleiben unverändert. Weiteres
  manuelles Scrollen wird nicht zurückgesetzt. Vier Zielansichten,
  Fokus-/Tastaturbedienung und unveränderte Tablet-/Desktopdialoge prüfen.
- TC-F75-04: Eine noch laufende Live-Aktualisierung nach Abbrechen und
  Schließen des Editors wird als veraltet verworfen. Kein Fehlerdialog,
  kein Zugriff auf den geschlossenen Editor und kein Schreibzugriff.

## F74: Freigegebene mobile Aktionsnavigation

Referenz: `mockups/angebote-mobile-navigation-mockup.html`. Freigegeben sind
die Aktionszeile der Bestandskarten und der Erfassungskopf, nicht eine neue
Artikelpflege oder ein Ersatz der bereits freigegebenen Gestaltung.

- Die sechs Kartenaktionen bleiben in einer Zeile: Bearbeiten/Stift,
  Vorschau/Auge, Teilen/Teilen-Symbol, Waage/Waage, Löschen/Papierkorb,
  Weitere Aktionen/drei Punkte. Bei knapper Kartenbreite nur Lucide-Symbole;
  mit genügend Platz bleiben die vier bisherigen Texte sichtbar.
  Duplizieren bleibt unter Weitere Aktionen. Keine Funktion entfällt.
- Der Erfassungskopf zeigt am Telefon drei Bereichsknöpfe: nur der aktive
  Bereich mit Symbol und kurzem Text, die übrigen als Symbole. Rechts stehen
  Aktionsdaten/Kalender und Schließen/X optisch getrennt. Keine Nummern,
  gequetschten Kleinsttexte oder zweite Kopfzeile. Die freigegebene Kopfhöhe
  von 56 px ersetzt hier die frühere 44-px-Vorgabe aus TC-F63-01.
- Namen für assistive Technik, Titel, Tastaturfokus und bestehende Handler
  bleiben erhalten. Touchziele mindestens 44 x 44 px, Mausaktionen ab 600 px
  32 px hoch. Der Metadatenknopf behält die vorhandene Ein-/Ausklappfunktion.
  Kein neuer Speicherpfad, kein Speichern durch Navigation.
- Nachfreigabe: In der mobilen Aktionsgestaltung entfällt die doppelte
  Auswahl „Gestalten für“. Das zuvor unter Ausgabe gewählte Ziel bleibt
  erhalten und im Gestaltungskopf lesbar. Wechsel erfolgen unter Ausgabe.
  Globale Designer und die Zielwahl unter Ausgabe bleiben unverändert.
- Weitere Nachfreigabe: Die Vorlagenauswahl im mobilen Gestaltungsblatt
  erhält den freien Platz statt auf wenige Zeichen zu schrumpfen. Der
  gleich hohe Knopf zeigt zweizeilig „Standard“ / „laden“; sein vollständiger
  zugänglicher Name und seine bisherige Lade-/Bestätigungsfunktion bleiben.
  Herkunft/Zusammenfassung steht bei sichtbarer Auswahl darüber.

### Testfälle

- TC-F74-01: Übersicht auf den vier Pflichtansichten messen: sechs echte
  Aktionen in einer Zeile, passende Text-/Symbolzustände, zugängliche Namen,
  Mindestmaße und kein horizontaler Überlauf. Weitere Aktionen und
  Löschabbruch erhalten die Bestandsaktion ohne Schreibzugriff.
- TC-F74-02: Erfassungskopf auf vier Ansichten und am Telefon mit beiden
  Aktionsarten: fünf erreichbare Knöpfe in einer Zeile, aktiver Bereich
  mit Text, übrige mobil ohne Text; Aktionsdaten auf/zu und Schließen bleiben
  funktionsfähig. Navigation erhält Daten, Bilder und Historie (TC-F62-02).
- TC-F74-03: Mobil unter Ausgabe Waage wählen, Gestaltung öffnen: kein
  sichtbares Gestaltungsziel-Select, Zielanzeige Waage und unveränderte
  Zielgestaltung. Blatt/Objektfenster und Android-Zurück bleiben funktionsfähig
  (TC-F72-02, TC-F73-03b/05); Rückkehr zu Ausgabe erlaubt weiterhin Zielwahl.
- TC-F74-04: Bei sichtbarer eigener Vorlagenauswahl im 375-px-Gestaltungsblatt
  ist das Select mindestens 160 px breit; „Standard / laden“ maximal 100 px
  breit und wie das Select 44 px hoch. Beide Textzeilen vollständig sichtbar,
  kein Überlauf; eigene Vorlage und Standardladefunktion bleiben erreichbar.

## Verifikation und offene Fragen

Automatisierte Python-Tests und Playwright bei 375×667, 768×1024, 1280×800
und 686×1095. Keine offenen fachlichen Klärungsmarker. Physische Waagenanzeige
erfordert eine spätere manuelle Abnahme am Gerät, keine fingierte Bestätigung.

## F76: Verständlicher Angebotsablauf und Produktivkonfiguration

Die Produktionsumgebung erhält nach erfolgreichem Main-Deployment den
eigenständigen Namespace `production`; Pull-Request-Vorschauen behalten ihren
separaten `preview-<PR>`-Namespace. Vorhandene erforderliche Azure-Einstellungen
werden geprüft und ihre Werte weder ausgegeben noch in das Repository kopiert.

Bei einer neuen Aktion bleiben Gestaltung und Ausgabe bis zum erfolgreichen
ersten Speichern der Artikel gesperrt. Ein fehlgeschlagener Speicherversuch
behält Eingaben und Sperre. Nach dem Speichern öffnet sich Gestaltung in
derselben Erfassungssitzung, damit der Weg zu Artikel/Bilder erhalten bleibt.
Von Gestaltung führt eine eigene Aktion direkt zur Angebotsübersicht;
ungespeicherte Änderungen werden vor dem Verlassen bestätigt und bei Abbruch
der Rückfrage erhalten.

Die Angebotskarte zeigt zunächst nur Titel, Gültigkeit, Aktionsart, Status und
Anzahl der Artikel. Produktnamen, Preise und Bilder erscheinen erst nach
Aufklappen über „Artikel und Bilder anzeigen“ und werden beim Zuklappen
wieder verborgen. Auf breiten Karten stehen Artikeldetails in kompakten
Spalten mit maximal 360 px Breite; schmale Karten zeigen eine Spalte. Eine
separate Produkt-/Preisvorschau außerhalb des Detailbereichs entfällt.
Bearbeiten, Vorschau/Ausgabe, Teilen und Waage behalten Beschriftung und Funktion,
wirken aber kompakter und optisch nachrangig; Touchziele bleiben mindestens
44 px hoch. Der eingeklappte Einstieg „Bereits gespeicherte Feature-Aktionen“
entfällt aus der Übersicht. Bestehende Feature-Daten und Backendpfade bleiben
unverändert und werden weder gelöscht noch migriert.

Die klare Kartenhierarchie ist in
`mockups/angebote-uebersicht-redesign-mockup.html` festgehalten: Titel,
Zeitraum, Aktionsart und Status bilden einen ausgerichteten Kopf; Produktname
und Angebotspreis stehen ausschließlich im aufklappbaren Detailbereich; Bearbeiten und
Vorschau/Ausgabe sind als Hauptaktionen von Teilen, Waage und Lösch-/Mehrmenü
abgesetzt. Schmale Ansichten brechen die Gruppen geordnet um, ohne
Touchzielgrößen oder Beschriftungen der Hauptaktionen zu reduzieren.

### Testfälle

- TC-F76-01: Ein Main-Push konfiguriert nach dem Deployment `production`;
  PR-Vorschauen behalten ihren isolierten Namespace. Erforderliche
  App-Einstellungen werden validiert und Geheimwerte nicht protokolliert.
- TC-F76-02: Bei einer neuen Aktion sind Gestaltung und Ausgabe vor dem
  ersten Speichern nicht auswählbar. Ein fehlgeschlagener Schreibversuch
  erhält Artikel und Sperre; ein erfolgreicher Schreibversuch öffnet den
  bestehenden Gestaltungs-/Ausgabeablauf.
- TC-F76-03: Aus Gestaltung führt „Zur Angebotsübersicht“ direkt zur Liste.
  „Artikel / Bilder“ bleibt ein eigener Rückweg, führt in den Artikel-
  Bearbeiten-Dialog zurück und stellt hinter ihm die Übersicht wieder her
  (nie eine leere Editorseite). Das gilt auch für gespeicherte Aktionen im
  eingebetteten CMS und Kiosk. Ungespeicherte Änderungen
  können verworfen oder nach Abbruch der Rückfrage weiterbearbeitet werden.
- TC-F76-06: Bei einer gespeicherten Aktion auf Angebotsseite, im CMS und Kiosk führt „Artikel / Bilder“
  aus der Gestaltung zurück in den geöffneten, bedienbaren Bearbeitungsdialog;
  Artikelwerte und Bildzustand bleiben erhalten.
- TC-F76-04: Die Angebotsübersicht zeigt Produkt und Preis erst nach
  Aufklappen und verbirgt sie beim Zuklappen wieder; eine separate Vorschau
  außerhalb der Details fehlt. Der Einstieg zum Editor heißt „Vorschau/Ausgabe“. Die
  Artikeldetails bleiben kompakt ausgerichtet: auf breiten Karten zweispaltig,
  auf schmalen einspaltig und ohne horizontalen Überlauf. Die Aktionsknöpfe
  sind kompakter, behalten ihre Funktion und Mindest-Touchgröße.
  Der alte Feature-Aktionen-Einstieg ist nicht sichtbar; vorhandene
  Feature-Daten werden nicht verändert.
- TC-F76-05: Die Artikeldetails der Angebotskarte sind standardmäßig
  geschlossen und lassen sich per Maus, Touch und Tastatur auf- und zuklappen.
