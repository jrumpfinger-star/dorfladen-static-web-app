# Umsetzung: Angebote und Getränkeflyer

Spec: [spec.md](./spec.md). Status: zur Implementierung.

## Constitution

Spec/Testfälle vorhanden, keine offenen Klärungsmarker. Eigener Feature-Worktree,
keine Secrets im Repository, keine fremden Assets. Bestehende Vanilla-JS-,
Azure-Functions- und Playwright-Struktur beibehalten. Vier Viewports testen.

## Entscheidungen

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

Der große bisherige CMS-Renderer bleibt bewusst erhalten: Seine Extraktion
würde den Altbestand unnötig gefährden. Neue Wochen-/Getränkeaktionen teilen
vollständig Editor und Renderer; der bisherige Editor bleibt für Altaktionen.

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
`angebote-kunden.js` lädt Alt-/Neuangebote einmal und rendert Desktop/mobile
Karten sowie einen skalierbaren Original-Flyer. Vorhandene Wochenumschaltung
für Altbestand bleibt erhalten; neue Angebote sind strikt aktuell gültig.
Dateinamen der Waagenausgabe enthalten Scope-/Aktions-/Revisionskennung und
Start/Ende. Die Brücke erhält nur gültige Dateien; keine Dataverse-Abfrage
pro Poll erforderlich. Unzugeordnete Dateien verhalten sich unverändert.

## Dateiänderungen

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
