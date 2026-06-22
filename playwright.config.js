// playwright.config.js
// Playwright-Konfiguration für den Test
//
// Ausführen:
//   npx playwright test                          # alle Tests
//   npx playwright test tests/kiosk.spec.js      # nur Kiosk
//   npx playwright test tests/shop-admin.spec.js # nur Shop-Admin
//   TEST_URL=https://... npx playwright test     # gegen deployed URL
module.exports = {
  testDir: './tests',
  timeout: 60000,
  retries: 0,
  use: {
    baseURL: process.env.TEST_URL || 'http://localhost:4280',
    headless: true,
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  },
};
