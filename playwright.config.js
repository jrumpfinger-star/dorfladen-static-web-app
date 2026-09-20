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
// Dazu kommt das ECHTE Ladentablett (`tablet-hoch`): ein Lenovo TAB P12
// mit 1200×2000 Bildpunkten, das im Laden im Hochformat bedient wird.
// Es ist die Auflösung, auf der der Kiosk täglich läuft — Fehler dort
// treffen den Betrieb sofort.
module.exports = {
  testDir: './tests',
  timeout: 60000,
  retries: 0,
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
    // Optional: Zeitlupe zum Zuschauen im Headed-Modus, z. B.
    //   $env:PW_SLOWMO=800; npx playwright test --headed
    launchOptions: { slowMo: Number(process.env.PW_SLOWMO) || 0 },
  },
  projects: [
    {
      name: 'mobile',
      use: { viewport: { width: 375, height: 667 } },
    },
    {
      name: 'ipad-mini',
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
      use: {
        viewport: { width: 686, height: 1095 },
        deviceScaleFactor: 1.75,
        hasTouch: true,
      },
    },
  ],
};
