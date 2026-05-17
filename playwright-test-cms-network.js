// playwright-test-cms-network.js
// Playwright-Skript: Testet die Netzwerkanfragen und prüft auf JSON-Fehler

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Netzwerk-Logging
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/cms') || url.includes('api')) {
      try {
        const body = await response.text();
        if (response.headers()['content-type']?.includes('application/json')) {
          try {
            JSON.parse(body);
          } catch (e) {
            console.error(`❌ Fehlerhafte JSON-Antwort von ${url}:`, e.message);
            console.error('Antwort:', body);
          }
        }
      } catch (err) {
        console.error(`❌ Fehler beim Lesen der Antwort von ${url}:`, err.message);
      }
    }
  });

  // Seite aufrufen
  await page.goto('https://kind-pebble-072605b03.7.azurestaticapps.net/cms');
  await page.waitForTimeout(5000); // 5 Sekunden warten, damit alle Requests durchlaufen

  await browser.close();
})();
