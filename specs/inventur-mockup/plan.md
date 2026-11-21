# Inventur-Mockup — Implementierungsplan

**Spec:** [spec.md](spec.md)  
**Status:** Umsetzung freigegeben nach ausdrücklicher Funktionsbestätigung

## Konstitutionsprüfung

Spec und Funktionsbeschreibung bestehen und wurden bestätigt. Keine offenen
Entscheidungsmarker, keine Geheimnisse oder Exportdateien im Repository.
Vanilla-Frontend, gemeinsame Tokens, verständliche deutsche Meldungen,
vier Ansichten und automatisierte eng begrenzte Tests.

## Technischer Ansatz

Eine isolierte [HTML-Datei](../../mockups/inventur-mockup.html) mit lokalen
Beispieldaten, CSS und JS. Gemeinsame Tokens als relativer Stylesheet-Link,
Lucide über die vorhandene CDN-Konvention. Beschriftungen bleiben ohne Icons
bedienbar. Keine produktiven Fachmodule laden: ihre Dialog-/Toast-Helfer sind
in Module mit Initialisierungs-/API-Nebenwirkungen eingebettet.

Ein lokales Modell führt Inventuren, Artikel und Positionen. UI-Zustand enthält
Bereich, ausgewählte Inventur/Artikel, getrennte Menge/Plus, Änderungsstatus,
Scan-Modus und Verwaltungsentwurf. DOM-Werte mit textContent ausgeben.
Original-Strichcode/Artikelnummer und Namensschlüssel getrennt erhalten.

Ein Commit validiert optionale Ganzzahlbasis und Differenz, prüft Summengrenzen,
schreibt genau eine lokale Position und lädt die neue Basis. Änderungshandler
und beide Buttons verwenden denselben Commit. Nach erfolgreichem Commit sind
Eingaben synchronisiert und Plus leer; ein anschließender Klick ist unverändert.
Keine Persistenz, keine Request- oder Service-Worker-APIs.

## Layout und Dialoge

Bestätigte Ergänzung F12: Der normale Aufruf zeigt ab 850 px Browserbreite eine
Handy-Vorschauhülle mit einem iframe derselben Datei (`?ansicht=app`).
Standard-Inhaltsgröße 375 × 667, alternativ 384 × 832. Keine Skalierung,
kein zweites Fachmodell. Größenwechsel verändert nur iframe-Maße.
Der explizite Fachansicht-Link und die automatisierten F1–F11-Tests verwenden
`?ansicht=app`; zusätzliche F12-Tests prüfen den normalen Desktop-/Handyaufruf.

- Stationärer Header, kompakter Inventurkontext und ein Hauptarbeitsbereich.
- Erfassung enthält Suche/Barcode, Artikelkontext, separate EK/VK,
  Menge/Plus, beide Aktionen, feste Statusfläche und Scanner-Modus.
- Suchliste als begrenztes Popover, intern scrollbar; Menü ebenso kompakt.
- Ausdrücklich bestätigte Ergänzung: ab 850 × 600 dauerhaft neben der
  Erfassung, ab 600 × 900 auf schmaleren Ansichten dauerhaft darunter.
  Keine neue Fachfunktion; vorhandene Trefferliste als reale Arbeitsfläche.
- Settings mobil Liste und fokussiertes Bearbeitungsblatt, breit Liste/Formular.
  Formularentwurf bleibt bei Bereichswechsel erhalten.
- Benannte native dialog-Elemente mit Escape/Rückkehrfokus; eigene
  verständliche Inhalte statt alert/confirm.
- Flex/Grid mit min-height:0 und dynamischer Viewport-Höhe. Keine
  ausgeblendeten Pflichtfelder zur scheinbaren Überlauffreiheit.
- Bei geringer sichtbarer Höhe während Zahleneingabe den fokussierten
  Eingabeschritt mit zugehöriger Aktion priorisieren; alle Felder bleiben
  nach Beenden des Fokusmodus erhalten.
- Dark-/forced-colors- und Touch-Regeln lokal auf die gemeinsamen Tokens
  aufbauen. Kontrast von Feldgrenzen ausdrücklich prüfen.

## Dateikarte

| Datei | Änderung |
| --- | --- |
| spec.md, plan.md, tasks.md | SDD-Vertrag und Nachweise |
| ../inventur-funktionen.md | Bestätigte Bedienbeschreibung |
| ../../mockups/inventur-mockup.html | Isolierter klickbarer Entwurf |
| ../../tests/inventur-mockup.spec.js | Verhaltens-, Geometrie-, Accessibility- und Isolationstests |
| ../../tests/TESTCASES.md | Zugehörige Testfälle und Ergebnis |

## Tests und Traceability

Alle TC-IDs aus F1–F12 werden in tasks.md und im Playwright-Test zugeordnet.
UI-Aktionen und gespeicherte lokale Modellwerte prüfen, keine Tests nur gegen
Konstanten/Klassen. Geometrie per Rechtecken und hit testing, Dokumentmaße,
internen Scrollfortschritt, Touch-Flächen und nutzbare Arbeitsfläche.
Die Demo darf ihr lokales Modell für prüfbare Transparenz read-only als
Snapshot bereitstellen; Tests dürfen darüber keine Werte verändern.

Enger Lauf gegen einen temporären, nur lokal gebundenen read-only
Repository-Root-Server; bestehender static-site-Server bleibt unverändert.
Explizites TEST_URL, vier Projekte mobile/ipad-mini/desktop/tablet-hoch.
Keine zusätzliche Bibliothek oder vollständige Testsuite.
Statisches Icon-Skript im Test bei Bedarf lokal ausliefern bzw. blockieren,
danach beschriftete Kernbedienung prüfen; kein externer App-Datenverkehr.

## Risiken, Rollout und Ergebnisgrenzen

Namenschlüssel und versteckte Datumszeit nicht stillschweigend migrieren.
Autosave-Klickfolge muss genau eine Differenz buchen. Ungültige Eingabe
bleibt sichtbar und überschreibt keine gespeicherten Werte.
Echte Bildschirmtastaturprüfung getrennt vom verkleinerten Viewport berichten.
Keine Bereitstellung, Route, Push oder Produktivintegration. Nach Tests die
vier Screenshots und den klickbaren Entwurf zur Mockup-Abnahme vorlegen.
