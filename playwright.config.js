// playwright.config.js
// Playwright-Konfiguration für den Test
module.exports = {
  timeout: 60000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  },
};
