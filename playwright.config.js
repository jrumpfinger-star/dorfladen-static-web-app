// playwright.config.js
// Playwright-Konfiguration für den Test
//
// Ausführen:
//   npx playwright test                          # alle Tests, alle Viewports
//   npx playwright test tests/kiosk.spec.js      # nur Kiosk
//   npx playwright test tests/shop-admin.spec.js # nur Shop-Admin
//   npx playwright test --project=mobile         # nur mobile Auflösung
//   npx playwright test --project="ipad-mini"    # nur iPad mini
//   npx playwright test --project=desktop        # nur Desktop
//   npx playwright test --project="tablet-hoch"  # nur Ladentablett (Hochformat)
//   TEST_URL=https://... npx playwright test     # gegen deployed URL
//
// Constitution Prinzip 7: UI-Änderungen werden auf mobile (375×667),
// iPad mini (768×1024) und desktop (1280×800) getestet.
//
// Seit der Test-Beschleunigung: Tests ohne Layoutbezug laufen nur auf dem
// Desktop (`test:schnell`/`--project=desktop`); ansichtsabhängige Tests
// tragen { tag: '@layout' } und laufen zusätzlich auf ansichten-mobil und
// ansichten-tablet. Details: README „Test-Arbeitsregel".
//
// Dazu kommt das ECHTE Ladentablett (`tablet-hoch`): ein Lenovo TAB P12
// mit 1200×2000 Bildpunkten, das im Laden im Hochformat bedient wird.
// Es ist die Auflösung, auf der der Kiosk täglich läuft — Fehler dort
// treffen den Betrieb sofort.
const fs = require('fs');
const path = require('path');

// Viewport-unabhaengige Dateien werden ausschliesslich explizit markiert:
//   // @ansichten: alle      immer auf allen vier Ansichten
//   // @ansichten: desktop   immer nur auf dem Desktop
// ALLE_ANSICHTEN=1 erzwingt alle Ansichten fuer alle Dateien.
function nurDesktop() {
  if (process.env.ALLE_ANSICHTEN) return [];
  const verzeichnis = path.join(__dirname, 'tests');
  return fs.readdirSync(verzeichnis).filter((f) => f.endsWith('.spec.js')).filter((f) => {
    const text = fs.readFileSync(path.join(verzeichnis, f), 'utf8');
    const marke = /\/\/\s*@ansichten:\s*(alle|desktop)/.exec(text);
    return marke ? marke[1] === 'desktop' : false;
  });
}
const OHNE_LAYOUT = nurDesktop();

/* S2 Viewport-Matrix: Tests ohne Layoutbezug laufen nur auf dem Desktop.
   Ansichtsabhaengige Tests tragen den Tag @layout und laufen zusaetzlich
   auf den beiden Ansichts-Projekten unten (mobil + Ladentablett).
   Die beiden Angebots-Specs sind vollstaendig auf dieses System umgestellt
   und daher aus den alten Ansichts-Projekten ausgeschlossen. */
const ANGEBOTS_SPECS = ['tests/angebote-flyer.spec.js', 'tests/cms-angebote-ablauf.spec.js'];

module.exports = {
  testDir: './tests',
  timeout: 60000,
  retries: 0,
  // Tests innerhalb einer Datei laufen parallel auf eigene Worker (jeder Test
  // hat eigene Page, Context und Mocks). Ausnahme: cms-waage-werbung.spec.js
  // setzt beschreib-serial test.describe.configure({ mode: 'serial' }).
  fullyParallel: true,
  // 75 % der Kerne statt der Haelfte - die Suite ist der Engpass beim Entwickeln.
  workers: process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : '75%',
  // Reporter: Liste im Terminal + HTML-Report (im VS-Code Simple Browser
  // ansehbar via `npm run test:report` -> http://127.0.0.1:9323).
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL: process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net',
    headless: true,
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    /* Der Service Worker wird für ALLE Tests abgeschaltet — aus zwei
       Gründen:

       1. Er beantwortet API-Aufrufe aus seinem Zwischenspeicher. Die Mocks
          der Tests greifen dann nicht, und der Reiter bleibt leer.
       2. Er bringt Chromium reproduzierbar zum Absturz („Terminating render
          process for bad Mojo message … BadgeService"). Die Tests brechen
          dann mit „Target page, context or browser has been closed" ab —
          ein Fehlerbild, das nichts mit der geprüften Sache zu tun hat.

       Bisher schalteten ihn 30 Dateien einzeln ab (`test.use({ serviceWorkers:
       'block' })`), 18 andere nicht — und genau die waren rot. Hier steht es
       einmal für alle; die Einzelangaben dürfen bleiben, sie schaden nicht.

       Kein Test braucht den Service Worker im Browser: Die beiden, die ihn
       prüfen (`kiosk-kopfnavigation`, `kiosk-ladefehler`), lesen `sw.js` als
       Datei. */
    serviceWorkers: 'block',
    // Optional: Zeitlupe zum Zuschauen im Headed-Modus, z. B.
    //   $env:PW_SLOWMO=800; npx playwright test --headed
    launchOptions: { slowMo: Number(process.env.PW_SLOWMO) || 0 },
  },
  projects: [
    {
      name: 'mobile',
      grepInvert: /@ohne-layout/,
      testIgnore: [...OHNE_LAYOUT, ...ANGEBOTS_SPECS],
      use: { viewport: { width: 375, height: 667 } },
    },
    {
      name: 'ipad-mini',
      grepInvert: /@ohne-layout/,
      testIgnore: [...OHNE_LAYOUT, ...ANGEBOTS_SPECS],
      use: { viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'desktop',
      use: { viewport: { width: 1280, height: 800 } },
    },
    /* Das Ladentablett im Hochformat — Lenovo TAB P12, 1200×2000 Bildpunkte.
       Die Angaben hier sind CSS-Pixel, nicht Bildpunkte. Umgerechnet mit dem
       am Gerät gemessenen Pixelverhältnis 1,75:
         Breite : 1200 / 1,75 = 686
         Hoehe  : 2000 / 1,75 = 1143, abzüglich 48 für die Systemleisten
       Die 48 stammen ebenfalls aus der Messung (im Querformat standen
       686 CSS-Pixel Gerätehöhe 638 nutzbaren gegenüber).

       Diese Breite ist kein Zufallswert: Bei 686 greift die Zweispalten-
       Ansicht der Metzger-Liste — genau die Ansicht, die im Laden benutzt
       wird. */
    {
      name: 'tablet-hoch',
      grepInvert: /@ohne-layout/,
      testIgnore: [...OHNE_LAYOUT, ...ANGEBOTS_SPECS],
      use: {
        viewport: { width: 686, height: 1095 },
        deviceScaleFactor: 1.75,
        hasTouch: true,
      },
    },
    /* Ansichts-Projekte fuer die mit @layout markierten Tests: dieselben
       Viewports wie mobil und Ladentablett, aber ausschliesslich die
       Tests, die tatsaechlich ansichtsabhaengige Zusicherungen machen. */
    {
      name: 'ansichten-mobil',
      grep: /@layout/,
      grepInvert: /@ohne-layout/,
      testIgnore: OHNE_LAYOUT,
      use: { viewport: { width: 375, height: 667 } },
    },
    {
      name: 'ansichten-tablet',
      grep: /@layout/,
      grepInvert: /@ohne-layout/,
      testIgnore: OHNE_LAYOUT,
      use: {
        viewport: { width: 686, height: 1095 },
        deviceScaleFactor: 1.75,
        hasTouch: true,
      },
    },
  ],
};
