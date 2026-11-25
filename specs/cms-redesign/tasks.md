# CMS-Wochenplan F8 — Aufgaben

Grundlage: [Spec F8](./spec.md), [Plan F8-Ergänzung](./plan.md).

| Aufgabe | Voraussetzung | Umsetzung | Abnahme |
| --- | --- | --- | --- |
| WP1 | Freigegebenes Mockup und abgeschlossene SDD-Unterlagen | Generierte Wochenplan-Steuerung und gezielte CSS-Hüllen einschließlich mobiler Kopfzeile an Mockup angleichen. | TC-F8-01, maschineller Funktionsabgleich |
| WP2 | WP1 | Neue Tageskarten mit bisherigen Informationen und Handlern; klassische Darstellung erhalten. | TC-F8-01, TC-F8-02 |
| WP3 | WP1 | Wochenplan-Vorschauhülle angleichen; ursprünglichen Motivrenderer und echte Ausgabewege erhalten. | TC-F8-03 |
| WP4 | WP2, WP3 | Isolierte Playwright-Abnahme auf vier Zielgrößen, Zurück, Dunkelmodus und betroffene Regressionen; visueller und gegebenenfalls Feature-Live-Nachweis. | TC-F8-01–04 |
| WP5 | WP4 | Verlaufssteuerung in `cms.js`: genau ein Eintrag je offene Ebene (Dialog, Druckansicht), Entfernen beim Schließen per Knopf, Zurück schließt oberste Ebene zuerst, tote Einträge werden übersprungen. | TC-F8-05 |
| WP6 | WP5; Freigabe des bedarfsweisen zweiten Antippens | Aktivierungsabhängig direkt teilen oder vorbereitete PNG in bestehender Vorschauhülle anbieten; keine automatischen Ersatzaktionen. Fehler/Abbruch unterscheiden, expliziten Download und Schließen erhalten; isoliert auf vier Zielgrößen prüfen. | TC-F8-06, TC-F8-07 |

## Teilen-Korrektur: Nachweis

- Vor der Korrektur reproduziert: 5,5 Sekunden verzögerte Canvas-Ausgabe,
  echte Browseraktivierung beim Teilen abgelaufen, `NotAllowedError`,
  danach ungefragter Download.
- WP6 lokal umgesetzt: **45/45 gezielte Tests bestanden** (42 Wochenplan-
  Tests einschließlich TC-F8-06/07 auf 375×667, 768×1024, 1280×800,
  686×1095; drei bestehende HD-/Download-/Druck-/Waagenregressionen).
- TC-F8-06 prüft tatsächlich abgelaufene Browseraktivierung nach 5,5 Sekunden
  Verzögerung, frische Aktivierung beim Wiederholen, unveränderte PNG-Bytes
  und 2382 px Breite ohne Neurendern. Browserabfragen werden während des
  Ablaufs vermieden, weil sie in Playwright die Aktivierung erneuern können.
- TC-F8-07 prüft nativen Abbruch, asynchronen/synchronen Fehler, fehlende
  Teilen-API und leere Canvas-Ausgabe. Keine ungefragten Downloads oder
  WhatsApp-Starts; erneutes Antippen, expliziter Download, Escape, Zurück,
  Schließen und Freigabe der Bild-URL geprüft.
- Bereitschaftshülle auf allen vier Zielgrößen visuell geprüft.
- Zusätzlicher Prüflauf von `cms-waage-werbung` TC-F1-02 scheitert vor dem
  Motivaufruf am bereits unten dokumentierten versteckten `waageAktion`-
  Element; kein neuer Teilen-Fehler, Test unverändert.
- Veröffentlichung der Teilen-Korrektur ausdrücklich freigegeben und auf
  die PR-15-Feature-Vorschau begrenzt; Produktion bleibt unverändert.
- **Feature-Live-Abnahme: 42/42 Wochenplan-Tests bestanden**, einschließlich
  der langsamen Bilderzeugung auf allen vier Zielgrößen. Alle API-Anfragen
  abgefangen; keine echten Schreibzugriffe.
- Der Verzögerungstest wartet außerhalb des Browsers auf das Renderereignis
  statt auf eine feste Gesamtdauer. Dadurch verlängern schwankende
  Live-Logo-Ladezeiten nicht versehentlich die Aktivierung durch nachfolgende
  Playwright-Abfragen. Beide finalen Läufe mit dieser Synchronisierung:
  lokal 45/45, live 42/42.
- Ausgelieferte `cms.js` per SHA-256 gegen Code-Commit `6721e05a`
  abgeglichen (UTF-8, Zeilenenden normalisiert): identisch.
- [Deployment 45581068625](https://github.com/jrumpfinger-star/dorfladen-static-web-app/actions/runs/45581068625)
  einschließlich isolierter Preview-Einstellungen und
  [Read-only Smoke 45581068594](https://github.com/jrumpfinger-star/dorfladen-static-web-app/actions/runs/45581068594)
  erfolgreich. Ein reales Android-Gerät wurde nicht fernbedient; die
  Browseraktivierung und Dateiübergabe wurden automatisiert geprüft.

## Lokale Abnahme

WP1–WP4 sind umgesetzt, lokal geprüft und nach ausdrücklicher Commit-/Push-
Freigabe auch in der Feature-Preview veröffentlicht und abgenommen.

- **33/33 gezielte Playwright-Tests bestanden:** neue Wochenplan-Suite
  14/14, freigegebenes Mockup 11/11, betroffene CMS- und Ausgabe-Regressionen
  8/8.
- **TC-F8-01:** 375×667, 768×1024, 1280×800 und 686×1095.
  Listenhöhe mindestens 50 %, echte Scrollradbedienung bei Überlänge,
  stehende Steuerung und vollständig erreichbares letztes Gericht.
  32/44-px-Bedienmaße; Hell-/Dunkel-Kontraste mindestens 4,5:1 für
  Gerichtstext, Tagesüberschrift, Verbindungsstatus und Hauptaktion.
- **TC-F8-02:** vier Wochenwahlen mit richtigen API-Filtern; Mehrfachzeilen,
  Bild, Hinweis, Allergene, Bearbeiten und bestätigtes Löschen ausschließlich
  über zustandsbehaftete lokale API-Fixtures. Klassischer Renderer geprüft.
- **TC-F8-03:** aktuelle CMS-Farbe wirkt ohne Besuch des Design-Reiters;
  geänderte Konfiguration wirkt nach Neuladen. Originalgrafik 2382 px breit,
  Download bytegleich zur Vorschau; tatsächliche Druckaufrufe und native
  PNG-Übergabe abgefangen. Waageneinstieg und vorhandene JPEG-/Uploadfolge
  mit API-Attrappen geprüft. Vorschauaktionen bei allen vier Größen sichtbar.
- **TC-F8-04:** Escape und Browser-Zurück nach wiederholtem Öffnen von
  Vorschau/Bearbeitung geprüft; keine unbeabsichtigten API-Schreibzugriffe.
- **TC-F8-05:** Android-Zurück nach Schließen per Knopf (zweimal wiederholt),
  mit Druckansicht über der Vorschau (zuerst Druckansicht, dann Dialog) und
  danach der Verlaufszustand wieder `cmsTab`. Vor der Korrektur
  reproduziert (toter Eintrag, Druckansicht blieb stehen); danach 4/4 grün.
  Betroffene Regressionen (Angebote-Ablauf einschließlich F72/F73-Zurück,
  Wochenplan-Mockup, CMS-Neu): 258 grün; einziger Fehler ist der unten
  dokumentierte Altbefund der Waagen-Suite.
- Sichtprüfung der vier Ansichten und der mobilen fertigen Vorschau gegen
  das freigegebene Mockup.
- Generator erneut ausgeführt: beide HTML-Ausgaben bytegleich.
  Maschineller Funktionsabgleich für Betriebs- und Entwurfsseite jeweils
  **0 Fehlstellen**; JavaScript-Syntax und `git diff --check` fehlerfrei.

## Feature-Live-Abnahme

- [PR-15-Feature-Vorschau](https://kind-pebble-072605b03-15.westeurope.7.azurestaticapps.net/cms.html):
  **14/14 Wochenplan-Tests bestanden**, einschließlich aller vier Zielgrößen.
  Sämtliche API-Zugriffe waren abgefangen; keine echten Schreibzugriffe.
- [Deployment 45459700157](https://github.com/jrumpfinger-star/dorfladen-static-web-app/actions/runs/45459700157)
  einschließlich isolierter Preview-Einstellungen erfolgreich.
- [Read-only Smoke 45459700663](https://github.com/jrumpfinger-star/dorfladen-static-web-app/actions/runs/45459700663)
  erfolgreich.
- Ausgelieferte Betriebs-/Entwurfsseite, CMS-JavaScript und neues CSS per
  SHA-256 gegen den Code-Commit `d66fc714` abgeglichen; Zeilenenden normalisiert.
- Produktion unverändert; keine API-, Renderer- oder Datenmodelländerung.

Zusätzlicher, nicht durch F8 verursachter Befund:
[cms-waage-werbung.spec.js, TC-F3-01](../../tests/cms-waage-werbung.spec.js)
verwendet im Angebotsbereich das erste `waageAktion`-Element, obwohl dieses
versteckt ist. Der Fehler wurde mit den unveränderten HTML-/JS-/CSS-Dateien
von `HEAD` identisch reproduziert. Test und Angebotsbereich bleiben für
diesen Wochenplan-Auftrag unverändert; dies ist keine vollständig grüne
Gesamtabnahme der älteren Waagen-Suite.
