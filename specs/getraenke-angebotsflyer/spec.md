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
Preise werden in ganzen Cent gespeichert, Literpreise ohne Pfand berechnet
und kaufmännisch auf Cent gerundet. Katalogpreise sind keine Vorbelegung.
Unvollständige Angaben dürfen als Entwurf gespeichert, aber nicht freigegeben
oder an die Waage gesendet werden.

- TC-F2-01: 12,49 EUR / (20 × 0,5 l) ergibt 1,25 EUR/l, 3,10 EUR Pfand separat.
- TC-F2-02: Fehlender Inhalt/Pfandentscheidung, Preis <= 0 oder ungültiger
  Zeitraum verhindert Freigabe und Versand mit verständlicher Meldung.
- TC-F2-03: Artikel-, Bild- und Preisangaben stimmen in allen Ausgaben überein.

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
- TC-F9-02: A4-/Karten-/Waagenvorschau aktualisiert sich ohne Veröffentlichung.
- TC-F9-03: Änderungen neuer Standards lassen bestehende Layouts, Veröffentlichungen
  und bisherige Plakat-/Einzelflyer-Einstellungen unverändert.

## Verifikation und offene Fragen

Automatisierte Python-Tests und Playwright bei 375×667, 768×1024, 1280×800
und 686×1095. Keine offenen fachlichen Klärungsmarker. Physische Waagenanzeige
erfordert eine spätere manuelle Abnahme am Gerät, keine fingierte Bestätigung.
