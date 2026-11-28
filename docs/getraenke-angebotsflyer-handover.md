# Getränke-/Angebotsflyer — Stand & Weiterarbeit (Handover)

Stand: 18.11.2026 · Branch `feature/getraenke-angebotsflyer` · Repo `jrumpfinger-star/dorfladen-static-web-app`

## Wichtigste URLs

- **Feature-Preview (PR #15), aktuelle Deployments:**
  `https://kind-pebble-072605b03-15.westeurope.7.azurestaticapps.net`
  (Wird bei jedem Push auf den Branch automatisch neu deployt; der Hostname steht auch im
  Deploy-Log der GitHub-Actions-Run „Azure Static Web Apps CI/CD".)
- **Achtung:** `https://witty-island-064f9d903.7.azurestaticapps.net` ist eine VERALTETE
  Preview-Environment — dort fehlen u. a. `angebote.html`/`app.html` (404). Nicht mehr verwenden.
- Produktion (nur main): `https://kind-pebble-072605b03.7.azurestaticapps.net`
- Tests laufen lokal gegen den statischen Server, nicht gegen die Live-URL (siehe unten).
- Live-UI-Prüfungen: read-only; Dark-Mode ist per CMS-Feature-Flag `dark_mode:false` bewusst
  abgeschaltet (System-Follow nur bei Freigabe), Kiosk-401 ohne Gerätekennung ist normal.

## Wie weiterarbeiten (anderer Rechner)

1. `git clone` / `git pull` auf `feature/getraenke-angebotsflyer`.
2. `npm install` (nur Playwright als devDependency).
3. Tests:
   - Lokaler statischer Server: `node tools/statischer-server.js` (Port 8099, bedient `static-site/`).
   - Angebots-Suite: `$env:TEST_URL='http://127.0.0.1:8099'; npx playwright test tests/angebote-flyer.spec.js --reporter=line`
   - Oder über den Teststarter, der geänderte Dateien zuordnet: `npm run test:geaendert` / `test:schnell` / `test:voll` (startet den Server selbst, zufälliger Port).
   - Vier Ansichten: mobile (375×667), ipad-mini (768×1024), desktop (1280×800), tablet-hoch (686×1095, echtes Ladentablett).
4. Deploy: Push auf den Branch → GitHub Actions → Feature-Preview. **Niemals direkt nach main pushen.**
5. Spec/Plan/Tasks: `specs/getraenke-angebotsflyer/` (spec.md, plan.md, tasks.md). Designstandard: `docs/ui-designstandard.md`. Conventions: `specs/conventions.md` (Lucide-Icons, CSS-Split style.css/content.css).

## Was in dieser Runde gemacht wurde (Commits ab 8aa1858f)

1. **Preisschild-Dialog (Objekt-Dialog „Preisschild einstellen"):** Riesige leere Feldkästen behoben.
   - Ursache 1: Die Slider-Zeilen (.an-srow, horizontale Zeile mit 190px-Label) wurden in den Dialog
     verschoben, wo `.an-object-grid>label` `flex-direction:column` erzwingt — die 190px-Labelbreite
     wurde zur Zellhöhe (258px hohe Zellen).
   - Ursache 2: Die generische Feldzeilen-Regel
     `label.an-field:has(>span)…>span{flex:0 0 190px}` traf nach Umbau auch den neuen
     Slider-Wrapper (`.an-srow-slider`) und fixierte ihn auf 190px Breite.
   - Fix: `restyleSliderRows` (js/angebote-design.js) verpackt Slider+Wertausgabe in
     `span.an-srow-slider` (Ausgabe VOR dem Verschieben greifen!); CSS-Overrides unter
     `.an-object-dialog .an-object-grid …` (css/angebote.css) machen den Dialog gestapelt-kompakt;
     die Feldzeilen-Regel schließt `.an-srow` aus (`:not(.an-srow)`).
   - Regressionstest: `TC-F55a: Preisschild-Dialog zeigt kompakte, gestapelte Felder …`
     (tests/angebote-flyer.spec.js) — Zelle < 120px, kein Horizontalüberlauf, alle Bedienelemente sichtbar.
2. **Slider-Zeilen mobil:** Label (190px) + Wertausgabe (52px) liefen auf schmalen Ansichten
   über die Zeile (der Wert war abgeschnitten — echter Usability-Bug aus 8aa1858f).
   Fix: Label `flex:0 1 190px` (schrumpfbar), Wertausgabe `flex:0 1 52px;min-width:40px`.
   Abgedeckt durch den vorhandenen Clip-Check in TC-F10-01..04 (mobile + ipad-mini).
3. **Ersparnis-Marker Typ/Farbwelt pro Ausgabeziel:** Die Karten „Preisschild und Marker" für Plakat
   und Einzelflyer (cms.html, cms-neu.html, cms-klassisch.html) haben jetzt je zwei Selects
   (`cfg-savingsMarkerTypePlakat/Flyer`, `cfg-savingsPalettePlakat/Flyer`), „Wie Vorgabe" = leer.
   - Mechanismus: `PERSEC_SELECTS` in js/wochenangebote-renderer.js um `savingsMarkerType`,`savingsPalette`
     erweitert; `cfgForKind()` überschreibt die globalen Werte nur, wenn gesetzt (leer = Vorgabe gilt).
   - Laden/Speichern läuft generisch über die PERSEC-Schleifen in cms.js (kein cms.js-Eingriff nötig).
4. **Stattpreis-Stil (Preisschild-Rot/Gelb-Bild):** Neue Designoptionen
   `old_price_size` (60–160 %), `old_price_font`, `old_price_strike` (`single`/`double`/`none`).
   - UI: js/angebote-design.js `definitions` + „Weitere Gestaltung"-Panel (Sektion Preisschild) und
     Objekt-Dialog „Preisschild einstellen".
   - Renderer: drawPriceImage in js/wochenangebote-renderer.js (Farbe `old_price_color` und
     Durchstreichfarbe `price_strike_color` existierten schon).
5. Verifiziert: Label „Element in der Vorschau" ist auf allen vier Ansichten vollständig lesbar
   (scrollWidth == clientWidth) — durch den vorherigen Commit (8aa1858f) behoben.

## Mockup-Nacharbeit / Abnahme

### Mockup-Nacharbeit F60–F64

Der vorherige PR-Zwischenstand `29a1b557` ist keine abgeschlossene
Mockup-Abnahme. Die verbindliche Nacharbeit umfasst alle sechs globalen
Designer und den vollständigen gemeinsamen Aktionsweg:

- Aktionsübersicht mit Typkennzeichnung, zwei direkten Neuaktionen und
  Mehrmenü für Nebenaktionen; ursprüngliche Artikelliste und Filter erhalten.
- Gemeinsame Hauptschritte, kompakter mobiler Bereichsselect und linker
  Zielselect; alle delegieren an die vorhandenen Handler.
- Expliziter Panelbesitz: Ansicht und Ausgabe zeigen nicht mehr den
  Elementinspector. Ausgabekarten nutzen die echten Export-/Druck-/Waagenpfade.
- Original-CMS-Familien und Paletten sind im Aktionseditor angeschlossen;
  getrennte Zielkonfigurationen, Geometrie und Undo/Redo bleiben erhalten.
- Sichtbare Dreh-/Größenmarkierungen sind kachelrelativ; transparente
  Maus-/Touchtrefferflächen und numerische Alternativen bleiben groß genug.
- Datenkeys, Besitzer und Testzuordnungen stehen im Implementierungsplan.
  SDD-Aufgaben GF100–GF110 erst nach funktionalem und visuellem Nachweis
  schließen; eine Screenshotanzahl ist keine bestandene Abnahme.

Die Nacharbeit ist lokal integriert und geprüft: 29 globale Designer-/Paletten-
Verträge bestanden; die 156 Desktopfälle sind durch 151 bestandene Fälle des
Gesamtlaufs plus grünen Nachlauf aller fünf migrierten UI-Verträge abgedeckt.
Die responsive Kernprüfung bestand 83/84 Fälle; nach Beheben des
Testhelfer-Wettlaufs ist auch der betroffene Vertrag in allen vier Ansichten
grün. Zusätzliche Vorlagen-/Preisbild-/Bild-/Kompaktheitsfälle sind auf Desktop,
iPad mini, Telefon und Ladentablet erfolgreich. Python: 81/81.
Exakte Befehle und die differenzierten Nachweise stehen in
[tasks.md](../specs/getraenke-angebotsflyer/tasks.md).

Lokale Regressionen einschließlich Bild-/Entwurfsroundtrips verwenden ausschließlich
gemockte APIs. Zur Veröffentlichung gehören normaler Commit/Push und
schreibfreier Abgleich der PR-Preview mit dem ausgelieferten Commit.
Kein main-Merge, kein Produktionsdeploy und keine echten Dataverse-, Upload-
oder Waagenschreibtests in der Preview.

## Stolpersteine

- `test-live.ps1` existiert nicht mehr; Live-Checks gegen die PR-15-Preview
  (`TEST_URL=https://kind-pebble-072605b03-15.westeurope.7.azurestaticapps.net`).
- Playwright direkt ohne Server läuft gegen `http://127.0.0.1:8817` → ERR_CONNECTION_REFUSED.
  Immer statischer Server starten oder TEST_URL setzen bzw. `npm run test:*` nutzen.
- Service Worker ist in der Playwright-Konfig global geblockt (Gründe siehe playwright.config.js).
- CSS: Dark-Mode- und Navigations-Fixes müssen in **style.css UND content.css** landen.
