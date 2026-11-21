# Inventur-Web-App — Spezifikation

**Status:** Funktionsbeschreibung fachlich freigegeben; Umsetzung fail-closed
freigegeben und implementiert, Abnahmepunkte offen  
**Stand:** 20.11.2026  
**Funktionsbeschreibung:** [inventur-web-funktionen.md](../inventur-web-funktionen.md)

## Überblick

Die bestehende PowerApps-Inventur erhält einen mobilen Web-Zugang unter
`/inventur` in der vorhandenen Dorfladen Static Web App. Beide Anwendungen
verwenden dieselben vorhandenen Dataverse-Tabellen. Die PowerApps-App bleibt
zunächst unverändert nutzbar.

Die bestehende [Mockup-Spezifikation](../inventur-mockup/spec.md) beschreibt
die deklarativ erhobenen Bestandsfunktionen und deren Übernahmematrix.
Diese Spezifikation ergänzt echte Anmeldung, Datenzugriff, Kamera,
dauerhafte Speicherung, Wiederholschutz und sichtbare Konflikte.
Der [Mockup](../../mockups/inventur-mockup.html) bleibt ein eigener,
isolierter Entwurf; seine lokalen Speichermeldungen sind kein
Nachweis einer produktiven Dataverse-Integration.

Verbindlich sind [Konstitution](../../.specify/memory/constitution.md),
[UI-Standard](../../docs/ui-designstandard.md) und
[Konventionen](../conventions.md).

## Ziele

- Vollständige Inventurerfassung und Verwaltung der erhobenen Originalfelder.
- Bedienbare Erfassung bei 375 × 667 ohne Seitenscrollen, intern scrollende
  Treffer-/Inventurlisten und tatsächliche Mobilkamera.
- Vorhandener Kiosk-Zugang, serverseitig geschützte Inventurdaten.
- Bestehende Dataverse-Daten dauerhaft lesen und schreiben, ohne
  unbemerkte fremde Überschreibungen oder doppelte Plus-Buchungen.
- Weiterhin paralleler Betrieb der unveränderten PowerApps-App unter einer
  ausdrücklich benannten organisatorischen Grenze.

## Nicht-Ziele

- In diesem Specify-Schritt: kein Produktivcode, keine echten Datenabfragen,
  keine Abfragen von Geschäftsdatensätzen, Schreibzugriffe, App-Einstellungen,
  Schemaänderungen oder Bereitstellung.
- Kein persönlicher Microsoft-Login, keine individuellen Inventurrollen oder
  neue Benutzerverwaltung.
- Keine Offline-Warteschlange oder automatische spätere Nachbuchung.
- Kein Hardware-Tastaturscanner als gesondert zugesicherter Erfassungsweg.
  Artikelsuche bleibt erhalten; Kamera ist der bestätigte Scanweg.
- Keine Änderungen an PowerApps, keine Migration in einen anderen Speicher.
- Keine neuen Lösch-, Export-, Auswertungs- oder Abschlussbuchungsfunktionen.
- Kein globaler Umbau der vorhandenen CMS-/Kiosk-Authentifizierung.

## Ausdrücklich bestätigte Entscheidungen

| Thema | Entscheidung |
| --- | --- |
| Daten | Vorhandene Tabellen weiterverwenden; keine getrennte Kopie |
| Zugang | Vorhandenes Laden-/Kiosk-Anmeldeverfahren |
| Befugnisse | Alle angemeldeten Kiosk-Nutzer dürfen erfassen und Inventuren verwalten |
| Übergang | PowerApps und Web-App vorerst parallel |
| Konflikte | Veraltete Speicherung blockieren, neuen Stand zeigen, erneut bestätigen |
| Parallelgrenze | Gleiche Position nicht gleichzeitig in beiden Apps bearbeiten; PowerApps bleibt unverändert |
| Verbindung | Eingabe erhalten, Fehler/unklaren Status zeigen, keine Offline-Nachbuchung |
| Kamera | Manuelles und automatisches Scannen über die Handykamera |
| Schema | Notwendige Ergänzungen vorschlagen; Ausführung erst nach separater Freigabe |
| Umbenennen | Inventurname nach erster Erfassung gesperrt; übrige Felder bearbeitbar |

Die Namenssperre ist eine ausdrücklich bestätigte Einschränkung gegenüber
dem Original. Sie ersetzt keine Bereinigung oder Migration schon bestehender
Namensprobleme.

## Verifizierter Repository- und Exportstand

- Vorhandene Workflows liefern `static-site` als App und `api` als API aus:
  [Produktionsworkflow](../../.github/workflows/azure-static-web-apps-kind-pebble-072605b03.yml),
  [Featureworkflow](../../.github/workflows/azure-static-web-apps-bestellsystem.yml).
- Neben [function_app.py](../../function_app.py) existieren API-Handler unter
  `api/<funktion>/__init__.py`. Nicht allein aus einer allgemeinen
  Architekturangabe ableiten, dass neue Inventur-Routen in die Root-Datei
  gehören; die konkrete Laufzeitregistrierung ist in der Plan-Stufe zu prüfen.
- [SWA-Routing](../../static-site/staticwebapp.config.json) enthält noch keine
  `/inventur`-Route. Die API-Route ist dort anonym erreichbar; der neue
  Handler muss seine Berechtigung selbst durchsetzen.
- [admin-auth.js](../../static-site/js/admin-auth.js) bietet Server-Login,
  Server-Sitzungsprüfung und `X-CMS-Auth`. Geschützte Inventur-GETs sind noch
  nicht in seiner Liste; eine Integration darf dies nicht voraussetzen.
- [shared/auth.py](../../api/shared/auth.py) bietet `token_valid`; die
  allgemeinen Guards sind teilweise schalterabhängig. Neue Inventur-Routen
  dürfen damit nicht versehentlich offen bleiben.
- [shared/dataverse.py](../../api/shared/dataverse.py) enthält vorhandene
  zentrale Konfigurationshelfer, aber keine allgemeine atomare
  Inventurbuchungs-/Idempotenzfunktion.
- Der lokale PAC-Export wurde nur als Quelle für Schema und Regeln gelesen.
  Keine Datensätze, Geheimnisse oder Connector-Exporte werden eingecheckt.
- Eine ergänzende Live-Metadatenabfrage mit PAC ModelBuilder war auf die drei
  Inventur-Tabellen begrenzt. Es wurden keine Geschäftsdatensätze gelesen oder
  verändert; das zuvor aktive PAC-Profil wurde anschließend wiederhergestellt.
  Eine danach gesondert freigegebene FetchXML-Aggregation las ausschließlich
  Positionsschlüssel und zählte deren Gruppen. Es wurden keine Mengen, Preise,
  Artikelwerte oder einzelnen Schlüsselwerte ausgegeben; das PAC-Profil wurde
  auch nach dieser Abfrage wiederhergestellt.

Die Live-Abfragen bestätigen nur die genannten Tabellenmetadaten und den
aggregierten Schlüsselbefund. Sie belegen weder die Live-App-Konfiguration
noch die aktuellen Dataverse-Laufzeitberechtigungen.

## Anforderungen

### F1: Einstieg, Bereiche und Anmeldung

**Eingaben:** `/inventur`, vorhandene Kiosk-Serversitzung oder Kiosk-Passwort.  
**Verhalten:**

- Direkter Einstieg zeigt die responsive echte Erfassung, keinen
  Handyrahmen/Mockup-Umschalter.
- Startbereich Erfassung; Menü enthält Erfassung und Settings.
- Gültige bestehende Serversitzung wiederverwenden. Ein lokales
  UI-Freigabeflag allein ist keine ausreichende Berechtigung.
- Ohne gültige Sitzung verständliche Anmeldung vor Anzeige interner Daten.
- Alle Inventur-Lese- und Schreibwege serverseitig prüfen, unabhängig vom
  globalen CMS-Rolloutschalter. Fehlkonfiguration lässt nicht offen durch.
- Keine individuellen Nutzeridentitäten behaupten: gemeinsamer Kiosk-Zugang
  erlaubt keine verlässliche personenbezogene Zuordnung einer Buchung.
- Abgebrochene/fehlgeschlagene Anmeldung erzeugt keine Dataverse-Änderung.
- Vorhandene Kunden-/CMS-/Kiosk-Wege bleiben fachlich unverändert.

**Testfälle:**

- **TC-F1-01:** Direkter Einstieg ohne Servernachweis → Anmeldemaske,
  keine internen Artikeldaten oder Inventurdetails.
- **TC-F1-02:** Gültige bestehende Sitzung → Erfassung ohne erneute Anmeldung;
  falsches/fehlendes Token bei direkten Lese-/Schreibaufrufen → abgelehnt,
  kein Dataverse-Aufruf; gilt auch bei deaktiviertem allgemeinem CMS-Schalter.
- **TC-F1-03:** Fehlende Serverkonfiguration, abgelaufenes/rotiertes Token und
  abgebrochene Anmeldung → klare Meldung, keine Mutation.
- **TC-F1-04:** Bereichswechsel erhält Entwurf und Datenauswahl; vorhandene
  Kunden-/Kiosk-Zugriffe werden nicht durch die neue Integration verändert.

### F2: Inventurauswahl und aktuelle Daten

**Eingaben:** aktive Inventur, Artikel, Leseantworten.  
**Verhalten:**

- Erfassungsauswahl enthält nur `aktiv`; erste gelieferte aktive Inventur
  ist Vorgabe. Name, Jahr und Startdatum bleiben zugänglich.
- Keine aktive Inventur → erklärter Leerzustand, keine Mengenspeicherung.
- Inventurwechsel lädt die Position des gewählten Artikels neu; niemals
  Mengen aus einer anderen Inventur verwenden.
- Spät eintreffende Antworten für vorherige Auswahl dürfen aktuelle Daten
  nicht ersetzen. Während erforderlicher Ladevorgänge keine Buchung mit
  altem Kontext ermöglichen.
- Fehlgeschlagene/abgebrochene Abfrage ist nicht gleich „keine Position“.
  Ein Serverfehler darf keine vermeintliche neue Position auslösen.
- Fachliche Daten nicht per Service Worker oder öffentlichem Cache als
  angeblich aktuellen Serverstand ausliefern.

**Testfälle:**

- **TC-F2-01:** Aktive/geplante/abgeschlossene Inventuren → richtige Auswahl;
  keine aktive → gesperrte Erfassung mit Hinweis.
- **TC-F2-02:** Gleichen Artikel zwischen Inventuren wechseln → richtige
  getrennte Position, keine Übernahme.
- **TC-F2-03:** Antworten vertauschen, Ladefehler und Berechtigungsfehler
  simulieren → kein alter/falscher Kontext, keine neue Ersatzposition.

### F3: Artikelsuche und Preise

**Eingaben:** Suchtext, Strichcode, ausgewählter Artikel.  
**Verhalten:**

- Originale Such-/Sortierfelder und getrennte Barcodefelder verwenden;
  führende Nullen bleiben erhalten, keine numerische Barcodeumwandlung.
- Suche liefert paginierte/fortsetzbare Treffer statt eines still
  abgeschnittenen Vollkatalogs. Nur notwendige Artikelwerte ausliefern.
- Bezeichnung Total für Treffer, Artikelbezeichnung und Strichcode im
  Kontext, vollständige lesbare Angaben.
- Artikel-Lookup muss eindeutig sein. Mehrdeutige Daten oder fehlerhafte
  Referenzen nicht durch Auswahl des zufällig ersten Datensatzes übergehen.
- Neue Position: Menge leer; EK aus letzterEK, bei 0
  `VK / (MwStKz = 9 ? 1,07 : 1,19) × 0,67`.
- Bestehende Position: gespeicherter Positions-EK bleibt erhalten.
  VK bleibt aktueller Artikel-VK; Preise sind nur lesbar.
- EK-Zuordnung/Berechnung serverseitig bestätigen, nicht aus manipulierbaren
  Browserpreisen ungeprüft speichern. Speicherung folgt Präzision 2.
- Einheit `0` = Stück, `3` = Gramm. Unbekannte Kennzeichen erklären und
  nicht stillschweigend in eine bekannte Erfassung umdeuten.

**Testfälle:**

- **TC-F3-01:** Teiltext/Barcode mit führender Null und fortgesetzte lange
  Trefferliste → passende sortierte, vollständig erreichbare Ergebnisse.
- **TC-F3-02:** Vorhandene/neue Position, letzter EK und beide Ersatzpfade →
  richtige EK/VK-Anzeige und gespeicherter EK.
- **TC-F3-03:** Mehrdeutiger Artikel, unbekannte Einheit und geänderter
  Browserpreis → kein willkürlicher oder manipulierter Schreibvorgang.

### F4: Echte Handykamera

**Eingaben:** Kamera-Aktion, Erlaubnis, Scanmodus, erkannte Barcodes.  
**Verhalten:**

- Kamera erst nach ausdrücklicher Nutzeraktion öffnen; kein automatischer
  Berechtigungsdialog beim Seitenstart.
- HTTPS/sicherer Kontext und tatsächlich unterstützte Scan-Technik prüfen.
  Kein Browser-API-Erfolg allein als Funktionsnachweis ausgeben.
- Manuell: Motiv anvisieren und Scan gezielt auslösen.
  Automatisch: Erkennung übernimmt ein Ergebnis ohne zweiten Bestätigungsschritt.
- Ein Scanvorgang übernimmt wie im Original nur den ersten erkannten Barcode.
  Wiederholte Kameraframes dürfen nicht mehrfach Positionen öffnen oder
  Buchungen auslösen. Erneuter Scan bleibt bewusst erreichbar.
- Kameraauswahl, soweit vom Gerät bereitgestellt; Rückkamera bevorzugen,
  ohne eine nicht vorhandene Hardware zu behaupten.
- Nach Schließen/Verlassen Kamera-Tracks stoppen. Keine Kamerabilder
  speichern, hochladen oder protokollieren.
- Verweigerte Berechtigung, fehlende/benutzte Kamera und nicht unterstützte
  Erkennung verständlich melden; Artikelsuche bleibt bedienbar.
- Barcodeerkennung ist Auswahl, keine automatische Mengenbuchung.
- Unbekannter Barcode → Originalwarnung und keine nutzbare Mengenerfassung
  für einen zuvor ausgewählten falschen Artikel.

**Testfälle:**

- **TC-F4-01:** Beide Modi mit kontrollierten Barcodes und wiederholten Frames →
  genau eine passende Artikelauswahl, keine Mengenmutation.
- **TC-F4-02:** Berechtigung verweigert, Kamera nicht verfügbar, Scan abgebrochen
  und unbekannter Barcode → klare Meldung, Suche weiter nutzbar.
- **TC-F4-03:** Kamera schließen/Bereich wechseln → sämtliche Tracks beendet,
  keine Bildübertragung.
- **TC-F4-04:** Tatsächlicher Android-Mobilbrowser mit realer Kamera,
  Barcode und Bildschirmtastatur → erfolgreiche Bedienung. Exaktes Gerät
  im Prüfbericht nennen; „Samsung 24 SE“ ist noch keine bestätigte Modellangabe.

### F5: Menge, Plus und vollständige Positionsdaten

**Eingaben:** Menge, Plus und Kontextinventur/-artikel.  
**Verhalten:**

- Menge und Plus bleiben getrennte Felder mit Speichern/Hinzufügen.
  Bestätigte Feldänderung/Verlassen speichert wie im bestätigten Mockup,
  nicht jeder Tastendruck.
- Optionale Ganzzahlmenge im Bereich −2.147.483.648 bis 2.147.483.647;
  0 und negative Werte nicht neu verbieten.
- Leere Basis ohne Plus bleibt leer; Plus ohne Basis addiert zu 0.
  Dezimal-/ungültige Werte und Bereichsüberlauf ohne Schreibzugriff ablehnen.
- Ergebnis und Bezug serverseitig validieren. Client darf Inventurstatus,
  Artikelreferenz, Einheit und Schlüsselbildung nicht umgehen.
- InventurKey, Artikelnummer, Artikel-Stamm-/Inventurreferenz,
  Mengenerfassung und EK vollständig erhalten.
- Echte Speicherung nicht als lokal erfolgreich darstellen. Status unterscheidet
  ungespeichert, speichert, gespeichert, Konflikt, Fehler und Erfolg unklar.
- Häkchen nur bei bestätigtem unverändertem Speicherstand und Menge > 0;
  Null/negative/leere gültige Werte trotzdem verständlich bestätigen.

**Testfälle:**

- **TC-F5-01:** Leer/0/negativ/Integer-Grenzen, Basis + Plus und ungültige
  Werte → korrekte serverseitige Regeln und vollständige Positionswerte.
- **TC-F5-02:** Blur plus Buttonklick, Enter und wiederholter Klick →
  genau ein fachlicher Vorgang, kein doppeltes Plus.
- **TC-F5-03:** Manipulierter Kontext, inaktive Inventur und Überlauf →
  keine Mutation, verständliche Rückmeldung, Eingaben erhalten.

### F6: Gleichzeitige Änderungen und Wiederholschutz

**Eingaben:** gelesener Positionsstand, Schreibabsicht, stabiler Vorgangsbezug.  
**Verhalten:**

- Veraltete Basis nicht überschreiben: fremde Änderung seit dem Lesen →
  Konflikt, aktuellen Serverstand und eigenen Entwurf getrennt anzeigen.
- Keine automatische Neuinterpretation einer alten Plus-Differenz oder
  Wiederholung nach Konflikt. Nutzer muss neu bestätigen.
- Neuanlage muss denselben Inventur-/Artikelbezug eindeutig halten.
  Parallel eintreffende Erstanlagen dürfen nicht zwei gültige Positionen erzeugen.
- Technische Wiederholung desselben Vorgangs muss über Requests, Prozesswechsel
  und mehrere Backendinstanzen hinweg dieselbe bestätigte Wirkung haben.
  Kein bloßer Browser-/Prozessspeicher als Wiederholschutz.
- Buchung und Nachweis ihrer Durchführung müssen zusammenpassen. Ein zwischen
  Buchung und Nachweis abstürzender Prozess darf nicht zur erneuten Addition führen.
- Erst nach eindeutigem Erfolg Menge aktualisieren und Plus leeren.
- Gemeinsamer Kiosk-Zugang ersetzt keine Konfliktprüfung.

**Testfälle:**

- **TC-F6-01:** Zwei Web-Clients lesen denselben Stand und schreiben →
  eine Änderung, der veraltete zweite Versuch wird sichtbar abgelehnt.
- **TC-F6-02:** PowerApps ändert vor Web-Speicherung → Web-Standkonflikt,
  keine stille Rücküberschreibung.
- **TC-F6-03:** Gleichzeitige Erstanlage, Doppelrequest, Antwortverlust und
  Backend-Neustart → keine Doppelposition und keine doppelte Plus-Buchung.
- **TC-F6-04:** Absturz zwischen Datenspeicherung und Wiederholnachweis →
  Auflösung ergibt genau einmalige Wirkung, keine behauptete Bestätigung.

### F7: Verbindungsfehler und unklarer Erfolg

**Eingaben:** Server-/Netzfehler, Timeout, erneute Anmeldung, Auswahlwechsel.  
**Verhalten:**

- Keine Offline-Warteschlange und keine automatische Nachbuchung bei Rückkehr
  der Verbindung. Ungespeicherte Eingabe bleibt in der geöffneten Ansicht.
- Bei sicherem Fehler klar „nicht gespeichert“ melden.
  Bei möglicher bereits erfolgter Mutation stattdessen „Speicherstand unklar“.
- Vor bewusstem erneutem Speichern den bisherigen Vorgang auflösen.
  Das Lesen derselben Menge allein beweist nicht, wer welchen Vorgang gebucht hat.
- Anmeldung/401-Wiederholung darf eine mutierende Anfrage nur mit demselben
  fachlichen Vorgangsbezug erneut senden.
- Während eines offenen/unklaren Vorgangs keine Buchung im wechselnden
  Inventur-/Artikelkontext ermöglichen.
- Keine falschen Erfolgstoasts, technischen Details oder unbemerkten
  Standardwerte. Nutzertexte verständlich deutsch; technische Diagnose ins
  Serverlog ohne Passwörter/Tokens/Kamerabilder.
- Ungespeicherte Eingaben sind nicht dauerhaft offline gesichert; vor
  bewusstem Verlassen/Neuladen bei offenem Vorgang warnen.

**Testfälle:**

- **TC-F7-01:** Verbindung vor/vor Abschluss/nach Dataverse-Buchung verlieren →
  richtiger Status, Entwurf erhalten, kein blindes erneutes Addieren.
- **TC-F7-02:** Verbindung zurück, Auswahlwechsel oder Anmeldung nach 401 →
  keine stille Nachbuchung oder falscher Positionskontext.
- **TC-F7-03:** Serverfehler und Navigation mit offenem Vorgang →
  verständliche Meldung/Warnung ohne Erfolgsvortäuschung.

### F8: Inventurverwaltung und Namensschutz

**Eingaben:** Inventurname, Jahr, Startdatum, Status, Neu/Edit/Speichern.  
**Verhalten:**

- Alle angemeldeten Kiosk-Nutzer dürfen Neu/Edit und Erfassung nutzen.
- Liste enthält Name/Jahr/Startdatum/Status; lange Listen intern scrollbar.
- Name Pflicht, maximal 850 Zeichen; Jahr optionaler Text maximal 4000 Zeichen;
  Datum optional; Status optional mit geplant/aktiv/abgeschlossen.
- Im Export vorhandene nicht sichtbare Datum-/Zeitanteile nicht versehentlich
  durch Browser-/UTC-Umrechnung ändern. Live-DateTime-Vertrag vor Plan klären.
- Verwaltungsentwurf speichert ausschließlich explizit. Neue Daten nach
  Erfolg vom Server bestätigen; Entwurfswechsel nicht heimlich buchen.
- Nach erster Position Namensänderung serverseitig und im Formular sperren,
  Grund sichtbar erklären. Übrige Felder bleiben bearbeitbar.
- Parallel laufende Erstanlage und Namensänderung dürfen den
  Namensschlüssel nicht auseinanderreißen; Nachweis ist Voraussetzung.
- Bei bereits mehrdeutigem Namen/Positionsschlüssel oder unpassenden Referenzen
  keine zufällige Position ändern. Datenproblem melden; Bereinigung separat.
- Schlüssel bleibt original `Inventurname + "-" + Artikel[Strichcode]`.
  Zusammengesetzter Schlüssel maximal 850 Zeichen: keine stille Kürzung.
  Nicht speicherbare Kombination klar vor einer Buchung ablehnen.
- Geändertem Aktivstatus bei Erfassung folgen; keine automatischen
  Abschlussbuchungen oder nachträgliche stillschweigende Schreibfreigabe.
- Verwaltungsänderungen unterliegen demselben Konfliktprinzip wie Mengen.

**Testfälle:**

- **TC-F8-01:** Neu/Edit mit allen vier Feldern, optionalen Werten, Grenzen und
  Pflichtfehler → korrekte serverseitige Persistenz.
- **TC-F8-02:** Inventur mit Position umbenennen, auch direkt per API →
  abgelehnt; Jahr/Datum/Status bleiben bearbeitbar.
- **TC-F8-03:** Gleichzeitige Verwaltungsänderung und Erstanlage/Umbenennung →
  sichtbarer Konflikt statt auseinanderlaufender Schlüssel.
- **TC-F8-04:** Mehrdeutige Altpositionen und zu langer zusammengesetzter
  Schlüssel → keine falsche Mutation, verständliche Diagnose.

### F9: Parallelbetrieb und Integrationsgrenzen

**Verhalten:**

- Bestehende Tabellen/Felder/Statuswerte weiterverwenden. Keine Änderung der
  Alt-App, kein stilles Schlüsselformat und keine automatische Migration.
- Web-seitiger Konfliktschutz verhindert nicht, dass die unveränderte
  PowerApps-App nach einer erfolgreichen Web-Buchung erneut überschreibt.
  Diese Grenze muss in Einführung/Hilfe ausdrücklich benannt werden.
- Dieselbe Position wird organisatorisch jeweils nur in einer Anwendung
  bearbeitet. Das ist keine technisch durchgesetzte appübergreifende Sperre.
- Notwendige Schemaergänzungen mit Bestandseffekt, Rücknahme und Datenprüfung
  vorlegen; ohne separate Freigabe nicht ausführen.
- Kein Produktiv-Smoke-Test legt erfundene Inventuren oder Testmengen an.
  Schreibtests laufen gegen isolierte Testdaten und simulierte Verträge.
- Veröffentlichung, echte Schreibprüfung und Schemaänderung sind getrennte
  Freigaben, nicht durch diese Spezifikation automatisch erlaubt.

**Testfälle:**

- **TC-F9-01:** Web liest/schreibt vertragstreue Testdaten → unveränderte
  originale Beziehungen/Statuswerte und kompatible Alt-App-Schlüssel.
- **TC-F9-02:** Einführung/Hilfe und Freigabeunterlagen prüfen →
  Parallelgrenze und fehlende technische Alt-App-Sperre ausdrücklich genannt.
- **TC-F9-03:** Automatisierte Tests ausführen → keine Verbindung zu
  Produktivschreibzielen und keine Schemaänderung.

### F10: UI, tatsächliche Arbeitsfläche und mobile Abnahme

**Verhalten:**

- Gemeinsame Design-Tokens und Komponentenfamilie, Lucide-Konvention,
  Systemschrift, Gewicht 400/600 und verständliche deutsche Meldungen.
- Vier Pflichtansichten: 375 × 667, 768 × 1024, 1280 × 800 und
  686 × 1095 CSS-px, Touch zusätzlich real prüfen.
- Erfassung ohne Seitenscroll; lange Treffer-/Inventurlisten intern.
  Große/hohe Ansichten nutzen die bestätigte dauerhafte Trefferliste.
- Tatsächliche nutzbare Feld-/Listenfläche mindestens 50 % Fensterhöhe;
  Ziele 70 % klein/80 % Desktop. Keine leere Hülle als Flächennachweis.
- Touch-Ziele mindestens 44 × 44, Regelwert 48 px; wesentliche mobile
  Texte mindestens 16 px. Desktop-Mausregeln nach UI-Standard.
- Hell/Dunkel, forced-colors, reduzierter Bewegung, Tastaturfokus,
  benannte Dialoge, Escape, Rückkehrfokus und gesperrter modaler Hintergrund.
- Bei Bildschirmtastatur fokussiertes Feld und zugehörige Aktion erreichbar;
  keine abgeschnittenen Pflichtfelder durch pauschales overflow:hidden.
- Lade-, Konflikt-, Auth- und Fehlerzustände werden ebenfalls geometrisch
  und interaktiv geprüft, nicht nur der erfolgreiche Grundzustand.

**Testfälle:**

- **TC-F10-01:** Alle vier Viewports, lange Inhalte und Zustände →
  tatsächliche Rechtecke/hit testing, Dokumentmaße und Arbeitsfläche erfüllen
  Vorgaben; letzter Listentreffer bleibt intern erreichbar.
- **TC-F10-02:** Touch/Tastatur, Dialoge, Farben und Systemmodi →
  Kontrast Text mindestens 4,5:1, relevante Grenzen mindestens 3:1,
  vollständige Bedienbarkeit.
- **TC-F10-03:** Echtes Mobilgerät mit Tastatur und Kamera →
  Erfassung/Speicherung/Fehlerrückmeldung erreichbar; realen Prüfstand
  getrennt vom simulierten Browser-Viewport ausweisen.

### F11: Fortschritt der gewählten Inventur

**Eingaben:** Fortschritt-Icon in der Kopfzeile (nur Erfassungsbereich, nur
mit gewählter aktiver Inventur); Lesen `GET ?action=progress&inventory=…`,
Tokenpflicht wie jeder andere Aufruf. Nur Lesen, kein Schreibweg.
**Verhalten:**

- Ansicht zeigt: Positionen erfasst, Artikel erfasst (eine Position pro
  Artikel), Artikel im Sortiment (aktiv), Abdeckung in Prozent als Ring,
  Warenwert erfasst als Summe von Menge × EK je Position (Positionen ohne
  EK zählen 0 €, Hinweis sichtbar).
- Warengruppen aus `cr5d4_warengruppebez` des Artikelstamms: je Gruppe
  erfasste/gesamte Artikelzahl, Warenwert (EK) und Abdeckungsbalken.
  Gruppensummen ergeben zusammen den Gesamtwert; Mengenangaben stehen nur
  bei den Einzelpositionen („Zuletzt erfasst“, mit Uhrzeit und Warenwert).
- Laden schlägt fehl oder keine aktive Inventur → verständliche Meldung,
  keine leere Anzeige; Zurück-Knopf kehrt in die Erfassung zurück.
- Stand wird beim Öffnen geladen (kein Dauerabruf); Icon erscheint erst
  nach geladener Inventurwahl.
- Kein Seitenscrollen auf 375 × 667 durch Listenbegrenzung; Ansicht folgt
  F10 (Tokens, Modi, Touch-Ziele).

**Testfälle:**

- **TC-F11-01:** Öffnen mit Positionen → Zähler, Ring, Warenwert gesamt,
  Warengruppen (Artikelzahl + Wert, keine Mengen) und zuletzt erfasste
  Positionen mit Menge/Uhrzeit korrekt aus simulierter API.
- **TC-F11-02:** Position ohne EK oder ohne Menge → zählt 0 € bzw. nicht
  als erfasst; Summen bleiben stimmig (Fachlogik-Tests).
- **TC-F11-03:** Lese- oder Konfigurationsfehler → Meldung, kein Inhalt;
  ohne Inventurwahl kein Icon; Zurück zeigt Erfassung wieder vollständig.

## Datenverträge aus dem lokalen Export

### Inventuren

EntitySet `cr5d4_inventurs`, Primärschlüssel `cr5d4_inventurid`.

| Fachwert | Logischer Name | Typ / Grenze |
| --- | --- | --- |
| Inventurname | cr5d4_inventur1 | Pflichttext, 850 Zeichen |
| Jahr | cr5d4_jahr | Optionaler Text, 4000 Zeichen |
| Startdatum | cr5d4_startdatum | DateTime; Exportformat DateOnly, Live-Verhalten noch zu prüfen |
| Status | cr5d4_status | 769580000 geplant, 769580001 aktiv, 769580002 abgeschlossen |

### Positionen

EntitySet **`cr5d4_inventurdetailses`**, nicht aus einem vermuteten
englischen Plural ableiten. Primärschlüssel `cr5d4_inventurdetailsid`.

| Fachwert | Logischer Name | Typ / Grenze |
| --- | --- | --- |
| InventurKey | cr5d4_newcolumn | Text, 850 Zeichen |
| Artikelnummer | cr5d4_artikelnummer | Text, 100 Zeichen |
| Artikel-Stamm | cr5d4_artikelstamm | Lookup |
| Inventur | cr5d4_inventur | Lookup |
| Mengenerfassung | cr5d4_mengenerfassung | Text, 100 Zeichen |
| Menge | cr5d4_menge | Optionale Integer-Zahl |
| EK | cr5d4_ekpreis | Dezimal, Präzision 2 |

### Artikel

EntitySet `cr5d4_tables`, Primärschlüssel `cr5d4_tableid`.

| Fachwert | Logischer Name |
| --- | --- |
| Such-/Lookup-Barcode | cr5d4_strichcode |
| Artikel[Strichcode] für Positionsschlüssel/Artikelnummer | cr5d4_artikelstrichcode |
| Artikelbezeichnung | cr5d4_artikelbezeichnung |
| Trefferbezeichnung | cr5d4_bezeichnungtotal |
| Suche/Sortierung | cr5d4_search |
| Verkaufspreis | cr5d4_vk_dorf |
| Letzter Einkaufspreis | cr5d4_letzterek |
| Steuerkennzeichen | cr5d4_mwstkz |
| Mengenerfassung | cr5d4_mengenerfassung |

Originalbarcodefelder nicht gleichsetzen, selbst wenn Beispieldaten gleich
aussehen. Artikelstamm wird nur gelesen, nicht aus der Inventur verändert.

### Lesend bestätigte Live-Metadaten

PAC ModelBuilder hat für `cr5d4_inventur`, `cr5d4_inventurdetails` und
`cr5d4_table` die folgenden logischen Feldtypen und Beziehungen generiert:

- Inventurname und Jahr sind Text; Startdatum ist DateTime; Status ist ein
  Optionset.
- Positionsschlüssel und Mengenerfassung sind Text; Artikelnummer ist Text;
  Menge ist Integer; EK ist Decimal; Artikelstamm und Inventur sind Lookups.
- Beide Barcodefelder (`cr5d4_strichcode` und
  `cr5d4_artikelstrichcode`) sind eigenständige Textfelder.
- Die Lookup-Beziehungen heißen `cr5d4_inventurdetails_ArtikelStamm_cr5d4_table`
  und `cr5d4_inventurdetails_Inventur_cr5d4_inventur`.

Die Codegenerierung bestätigt weder das DateTime-Verhalten noch die
`IsOptimisticConcurrencyEnabled`-Werte oder App-Berechtigungen. Ein
Lösungsexport bestätigt die Lookup-Navigationsnamen
`cr5d4_ArtikelStamm` und `cr5d4_Inventur`.

Der Lösungsexport enthält für Positionen eine Alternate-Key-Definition
`cr5d4_InventurKwey` auf `cr5d4_newcolumn`. Der aktuelle Indexstatus dieser
Definition ist im Export nicht enthalten und daher nicht bestätigt.

Die separate, nur auf nichtleere `cr5d4_newcolumn`-Werte gruppierte
FetchXML-Abfrage ergab eine Gruppe mit doppeltem Schlüssel. Null- und
Leerwerte waren ausgeschlossen. Die einzelnen Schlüsselwerte wurden nicht
ausgegeben oder gespeichert. Dies ist ein aktueller Datenbefund, kein
Nachweis bereits vorhandener Alternate Keys oder eines sicheren
Bereinigungsverfahrens.

Der Export der ausgewählten Dorfladen-App-Lösung enthielt keine Definitionen
der Inventur- und Positionstabellen. Ein zusätzlich freigegebener Export der
Common Data Services Default Solution enthielt diese Tabellenmetadaten. Der
Export der allgemeinen Default Solution wird von PAC nicht unterstützt.

### Kommunikationsvertrag

Die konkrete API-Aufteilung ist Aufgabe des nachfolgenden SDD-Plans.
Unabhängig von Routen/Methoden muss der Vertrag fachlich transportieren:

- eindeutige Inventur-/Artikel-/Positionsreferenz;
- Basisversion für Mengen- und Verwaltungsänderungen;
- unterscheidbare Absicht Menge setzen / Plus hinzufügen / optional leeren;
- stabilen Vorgangsbezug für Wiederholung und Erfolgsauflösung;
- bestätigten neuen Stand oder typisierten Konflikt/Fehler/unklaren Ausgang.

Browser erhält keine Dataverse-Zugangsdaten. Authentifizierung ersetzt keine
serverseitige Datenvalidierung. Keine Success-shaped Antworten bei Fehlern.

## Technische Voraussetzungen und Entscheidung (fail-closed)

Entscheidung des Auftraggebers: Die Web-App wird ohne Schema- und
Datenänderung umgesetzt. Ist ein Schreibvorgang nicht eindeutig sicher,
wird nur dieser Vorgang blockiert und verständlich gemeldet; eindeutige
Positionen laufen normal. PAC ModelBuilder und Lösungsexport lieferten keine
`IsOptimisticConcurrencyEnabled`-Werte, keinen Indexstatus des Alternate Keys
und kein `DateTimeBehavior`; fehlende Angaben beweisen nicht, dass eine
Fähigkeit fehlt. Deshalb gilt:

1. **Konflikte:** Vor jeder Änderung wird der aktuelle Stand serverseitig
   gelesen und mit der Basisversion des Browsers verglichen; zusätzlich geht
   `If-Match` an Dataverse. Fehlt ein ETag, ersetzt eine Näherung aus
   Änderungszeit und Menge die Version. Restrisiko: Ist Optimistic
   Concurrency in Dataverse aus, bleibt zwischen Lesen und Schreiben ein sehr
   kleines Zeitfenster. Ein Live-Nachweis braucht ein isoliertes Testziel.
2. **Eindeutigkeit/Wiederholschutz:** Eine Position wird nur gespeichert,
   wenn der Schlüssel genau einmal vorkommt (aktuell eine bekannte
   Duplikatgruppe → diese Position ist blockiert, keine Bereinigung).
   Nach jeder Erstanlage prüft der Server den Schlüssel erneut und nimmt nur
   die EIGENE neue Position zurück, falls parallel eine zweite entstand oder
   die Inventur umbenannt wurde. Jede Änderung trägt die Basisversion; eine
   wiederholte Anfrage nach unklarem Ausgang scheitert deshalb als Konflikt
   und bucht Plus nie doppelt.
3. **Datum:** Bestehende Uhrzeit-Anteile des Startdatums bleiben erhalten; es
   wird nur gesendet, wenn sich das Datum ändert.
4. **Berechtigungen:** Der Server nutzt die vorhandenen `DV_*`-App-Settings
   wie die übrigen Funktionen. Die minimalen Laufzeitrechte wurden nicht live
   geprüft.
5. **Zugang:** Jeder Aufruf – auch lesend – braucht ein gültiges
   Kiosk-/CMS-Token, unabhängig von `CMS_AUTH_ENFORCE`.

## Abnahmepunkte vor produktiver Nutzung

Der geführte Livetest mit echten Daten steht in [livetest.md](livetest.md).

- Echtes Mobilgerät (z. B. Samsung S24-Klasse): Kamera, Bildschirmtastatur,
  Speichern gegen ein isoliertes Testziel; Produktivumgebung ist kein
  Testdatenlager.
- Prüfen, ob Dataverse `If-Match` für Positionen/Inventuren erzwingt.
- Doppelten Positionsschlüssel durch den Fachbereich bereinigen lassen
  (separate Freigabe); bis dahin bleibt diese Position gesperrt.

## Freigabestatus

1. Funktionsbeschreibung fachlich freigegeben.
2. Umsetzung fail-closed freigegeben; Plan und Aufgaben siehe
   [plan.md](plan.md) und [tasks.md](tasks.md).
3. Veröffentlichung ist eine eigene Entscheidung nach grünen Tests.

Die vorhandene Mockup-Freigabe ersetzt keine dieser Produktivfreigaben.