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
//   TEST_URL=https://... npx playwright test     # gegen deployed URL
//
// Constitution Prinzip 7: UI-Änderungen werden auf mobile (375×667),
// iPad mini (768×1024) und desktop (1280×800) getestet.
module.exports = {
  testDir: './tests',
  timeout: 60000,
  retries: 0,
  use: {
    baseURL: process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net',
    headless: true,
    ignoreHTTPSErrors: true,
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
  ],
};
