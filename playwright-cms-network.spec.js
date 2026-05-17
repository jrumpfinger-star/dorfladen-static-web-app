// playwright-cms-network.spec.js
// Playwright-Test: Überwacht Netzwerkanfragen und prüft JSON-Antworten

const { test, expect } = require('@playwright/test');

test('CMS Seite: JSON-Antworten prüfen', async ({ page }) => {
  let jsonError = false;

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/cms') || url.includes('api')) {
      try {
        const body = await response.text();
        if (response.headers()['content-type']?.includes('application/json')) {
          try {
            JSON.parse(body);
          } catch (e) {
            jsonError = true;
            console.error(`❌ Fehlerhafte JSON-Antwort von ${url}:`, e.message);
            console.error('Antwort:', body);
          }
        }
      } catch (err) {
        jsonError = true;
        console.error(`❌ Fehler beim Lesen der Antwort von ${url}:`, err.message);
      }
    }
  });

  // Use the deployed static web app's hostname for all requests
  const BASE_URL = 'https://kind-pebble-072605b03.7.azurestaticapps.net';
  await page.goto(BASE_URL + '/cms');
  await page.waitForTimeout(5000); // 5 Sekunden warten, damit alle Requests durchlaufen

  expect(jsonError).toBe(false);
});
