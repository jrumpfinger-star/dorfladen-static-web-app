# Technischer Plan: Mittagstisch-Laufkundschaft

Grundlage: [spec.md](./spec.md). Status: lokal implementiert und geprüft,
noch nicht deployed.

## 1. Datenvertrag

Den bestehenden Dataverse-Bestellspeicher und `/api/lunch-order` weiterverwenden.
Keine separate Tageszähler-Datenbank und keine Umdeutung alter Personal-Einträge.

Eigene Quelle `QUELLE_LAUFKUNDSCHAFT` hinzufügen. Zielwert ist 3 neben
Online 0, Telefon 1 und Personal 2. Vor Implementierung die Metadaten von
`dl_quelle` lesen: Bei Ganzzahlspalte ist kein Choice-Update erforderlich; bei
Choice muss der neue zulässige Wert zuerst kontrolliert bereitgestellt werden.
Keine unbekannte Quelle still auf Telefon/Personal abbilden. Schemaänderungen
an Produktion sind kein Bestandteil der Planerstellung.

Metadatenprüfung durchgeführt: `dl_quelle` ist INT, keine Choice-Spalte.
Quelle 3 kann ohne Schemaänderung verwendet werden; historische Werte bleiben
unverändert.

POST mit dieser Quelle ist eine authentifizierte Mitarbeiteraktion:
Datum serverseitig auf heute (Berliner Ortszeit) begrenzen, Name intern
„Laufkundschaft“, Status Bestätigt, ohne Kundenanlage und Benachrichtigung.
Gericht und Preis kommen aus der heutigen Tagesauswahl. Vorhandene
Telefon-/Onlineverträge erhalten.

Für den Mitarbeiter-Mengenpfad PATCH um eine ausdrückliche Kennzeichnung
erweitern, beispielsweise `aktion: "menge-aendern"`, mit `menge` und dem bei
Dialogbeginn gelesenen Versionsstand. Nur `dl_menge` schreiben. CMS-Anmeldung
über den bestehenden Auth-Helfer prüfen. Quelle und Status aus Dataverse lesen,
nicht vom Client übernehmen. Ganze Zahlen 1–99 validieren, auch boolesche Werte
und Dezimalzahlen ablehnen.

Dataverse-ETag beim Lesen unverändert als optionalen Versionswert serialisieren.
Für diesen PATCH einen konkreten `If-Match`-Wert statt `*` verwenden.
Fehlender Datensatz, nicht erlaubte Quelle/Status und Versionskonflikt bekommen
eindeutige Fehlerantworten. Keine Erfolgsmeldung bei gescheitertem PATCH.
Bestehende Kunden-Kommentar-/Statuspfade nicht pauschal verändern.

## 2. Kiosk

Maßgebliche Quelle ist
[`static-site/kiosk-klassisch.html`](../../static-site/kiosk-klassisch.html).
Mit [`tools/build-kiosk-neu.js`](../../tools/build-kiosk-neu.js) daraus die
beiden Ausgaben erzeugen; keine unabhängigen Logikkopien bearbeiten.

- Fußleiste: Telefon, Laufkundschaft, Küchenliste; bei schmalen Viewports
  sinnvolle Zeilenverteilung und passende Inhaltsabstände, keine versteckten
  Hauptaktionen.
- Eigener Laufkundschaft-Dialog mit eigenem Zustand. Tagesgerichtauswahl über
  gemeinsame bestehende Helfer nutzen, nicht den Telefon-Dialog aufrufen.
- Heute-Bindung auch beim Speichern und nach Mitternacht kontrollieren.
- Eigener Badge-Stil und explizite Quellenlabels. Quellenfilter gegenseitig
  exklusiv und mit Statusfiltern kombinierbar.
- Alle Stellen mit „nicht online = telefonisch“ unterscheiden: Karten,
  Filterzähler, Kochbedarf, Tagesverlauf und ergänzende Sonderwunschkarten.
  Vorhandene Sonderwunsch-/Nachrichtenfilter bleiben funktionstüchtig.
- Mengenänderung an berechtigter Karte als gut erreichbare Aktion, separater
  kleiner Dialog. Bestehende API-/Auth-Helfer verwenden, Speichern während
  laufender Anfrage sperren.
- Nach Erfolg aktuelle Daten laden; Scroll-/Fokusposition und Filter erhalten.
  Konflikt: Dialog erklärt den geänderten Stand, Daten neu laden; nicht
  automatisch mit frischer Version erneut speichern.
- Bei unklarer POST-Antwort keine automatische Wiederholung; Hinweis, zunächst
  die Tagesliste zu prüfen. Das verhindert absichtlich keine manuelle Buchung
  eines tatsächlich weiteren Kunden.

Zusätzliche responsive Regeln bei Bedarf in
[`static-site/css/kiosk-neu.css`](../../static-site/css/kiosk-neu.css).

## 3. Dateiänderungskarte

| Datei/Bereich | Änderung |
|---|---|
| `api/lunch-order/__init__.py` | Quelle, POST-Regeln, Serialisierung, authentifizierter Mengenpfad und Konfliktprüfung |
| `static-site/kiosk-klassisch.html` | Eigenständige Dialoge, Fußleiste, Quellenbadge/-filter, aktualisierte Quellenzahlen |
| `static-site/kiosk.html`, `static-site/kiosk-neu.html` | Generierte Ausgaben |
| `static-site/css/kiosk-neu.css` | Falls erforderlich responsive Fußleiste/Filter/Dialoge |
| `static-site/css/kiosk-base.css` | Vom Kiosk-Generator erzeugte gemeinsame Styles |
| `static-site/shop-admin.html` | Neue Quelle korrekt als Laufkundschaft beschriften |
| `tools/build-kiosk-neu.js` | Nur falls neue Struktur eine bestehende Transformation anpassen muss |
| `tests/kiosk-laufkundschaft.spec.js` | Gemockte Browser-Verträge und Layout auf vier Viewports |
| `tests/test_mittagstisch_laufkundschaft.py` | POST/PATCH-Grenzen, ETags, ungültige Mengen, Fehler |
| `specs/kiosk-funktionen.md` | Detaillierte neue Funktionsbeschreibung vor Codeänderung ergänzen |
| `specs/mittagstisch-bestellstatus/spec.md` | Nicht-Ziel „kein direkter Ladenverkauf“ und pauschale Telefonzuordnung berichtigen |
| `static-site/handbuch/anwenderhandbuch.html`, betroffene Kiosk-Hilfe | Bedienung, Status und Mengenänderung |
| `tests/TESTCASES.md` | Neue Testfälle und tatsächliche Testresultate |

## 4. Verifikation und Auslieferung

Erst Spezifikation, dann Plan, dann [tasks.md](./tasks.md), danach Code.
Die vorgeschlagene Funktionsbeschreibung vor Code bestätigen lassen.

Metadatenprüfung ist Voraussetzung für die Festlegung des persistenten
Quellwerts, kein Proxy für eine erfolgreiche End-to-End-Buchung.

Gezielt neue Python-/Playwright-Fälle sowie bestehende Tests für Telefon,
Bestellstatus, Abgeholt, Tagwahl und Küchenliste ausführen. Vier Viewports:
375×667, 768×1024, 1280×800 und 686×1095.

Erwartungen numerisch prüfen: Datensatzanzahl, Quelle/Status, Menge, Stückpreis,
Gesamtpreis, Portionssummen und Versionskonflikte. Nicht nur auf sichtbare
Erfolgsmeldungen testen. Keine Testbestellungen in produktive Dataverse-Daten
schreiben. Deployment bleibt ein separater Auftrag.
