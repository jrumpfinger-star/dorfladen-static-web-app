# Gemeinsame Angebote und Getränkeflyer

Status: Zur Umsetzung freigegeben; ergänzt um freie Gestaltung, mobile Ansicht
und ein isoliertes Preview-Deployment.

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
und CMS erreichbar. Schritte: Artikel, Gestalten, Ausgeben. Aktionen lassen
sich speichern, erneut öffnen und duplizieren. Bestehende Aktionen sind aus
derselben Übersicht im bisherigen Editor erreichbar. Kein dauerhaftes CMS-iframe.

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
Unvollständige Angaben dürfen als Entwurf gespeichert, aber nicht freigegeben
oder an die Waage gesendet werden.

- TC-F2-01: 12,49 EUR / (20 × 0,5 l) ergibt 1,25 EUR/l, 3,10 EUR Pfand separat.
- TC-F2-02: Fehlender Inhalt/Pfandentscheidung, Preis <= 0 oder ungültiger
  Zeitraum verhindert Freigabe und Versand mit verständlicher Meldung.
- TC-F2-03: Artikel-, Bild- und Preisangaben stimmen in allen Ausgaben überein.

Stammartikelbilder werden ausschließlich über die bestehende Werbebildsuche
gelesen. Für den neuen Entwurf wird das Bild als privater, unveränderlicher
Angebotsbild-Snapshot gespeichert. Eigene Bildänderungen schreiben niemals in
Artikelstamm, SharePoint oder bestehende Werbebild-Datensätze zurück.

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

## F4: Entwurf und Veröffentlichung

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

Wochenangebote/Getränke umschalten; Karten zeigen Bild, Name, Gebinde,
Angebotspreis, separates Pfand und Grundpreis. Smartphones einspaltig,
größere Bildschirme mehrspaltig. Desktopbereich und mobiles Angebotspopup
verwenden denselben Datenzugriff und Renderer.
"Flyer ansehen" öffnet zusätzlich das freie Original mit Seitennavigation.
Mobil bildschirmfüllend, vergrößerbar, mit erreichbarem Schließen.
Das A4-Layout wird nicht zur einzigen, unleserlichen Handyansicht.
Bestehende Wochenumschaltung für Altangebote bleibt nutzbar.

- TC-F5-01: Beide Kategorien und mehrseitigen Flyer anzeigen.
- TC-F5-02: Lange Namen, mehrere Aktionen und leere Kategorien verständlich darstellen.
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
sichtbar. Suche und Bearbeitung sind lesend gegenüber dem Stamm und schreiben
nicht in vorhandene Werbebild-Datensätze zurück.
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

- TC-F11-01: Artikelsuche über Name, Nummer und EAN; Mehrfachauswahl übernimmt
  Stammfelder, zeigt VK als Vergleich und übernimmt ihn nur nach ausdrücklicher
  Auswahl als Angebotspreis. Kein Aufruf des Kratzer-Katalogs.
- TC-F11-02: Stamm- und manuelle Artikel zeigen Bildvorschau, Suche, Datei-/
  Zwischenablage, Ersetzen und Entfernen. Bildänderung speichert nur einen
  privaten Snapshot; kein mutierender Werbebilder-/Stammaufruf.
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
  Treffer und technische Fehler erkennbar melden. Keine Stammschreibzugriffe.

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

## Verifikation und offene Fragen

Automatisierte Python-Tests und Playwright bei 375×667, 768×1024, 1280×800
und 686×1095. Keine offenen fachlichen Klärungsmarker. Physische Waagenanzeige
erfordert eine spätere manuelle Abnahme am Gerät, keine fingierte Bestätigung.
