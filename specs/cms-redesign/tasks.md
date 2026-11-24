# CMS-Wochenplan F8 — Aufgaben

Grundlage: [Spec F8](./spec.md), [Plan F8-Ergänzung](./plan.md).

| Aufgabe | Voraussetzung | Umsetzung | Abnahme |
| --- | --- | --- | --- |
| WP1 | Freigegebenes Mockup und abgeschlossene SDD-Unterlagen | Generierte Wochenplan-Steuerung und gezielte CSS-Hüllen einschließlich mobiler Kopfzeile an Mockup angleichen. | TC-F8-01, maschineller Funktionsabgleich |
| WP2 | WP1 | Neue Tageskarten mit bisherigen Informationen und Handlern; klassische Darstellung erhalten. | TC-F8-01, TC-F8-02 |
| WP3 | WP1 | Wochenplan-Vorschauhülle angleichen; ursprünglichen Motivrenderer und echte Ausgabewege erhalten. | TC-F8-03 |
| WP4 | WP2, WP3 | Isolierte Playwright-Abnahme auf vier Zielgrößen, Zurück, Dunkelmodus und betroffene Regressionen; visueller und gegebenenfalls Feature-Live-Nachweis. | TC-F8-01–04 |
| WP5 | WP4 | Verlaufssteuerung in `cms.js`: genau ein Eintrag je offene Ebene (Dialog, Druckansicht), Entfernen beim Schließen per Knopf, Zurück schließt oberste Ebene zuerst, tote Einträge werden übersprungen. | TC-F8-05 |

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
