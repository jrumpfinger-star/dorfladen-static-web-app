// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Dorfladen Oberornau Frontend', () => {
  const base = 'https://kind-pebble-072605b03.7.azurestaticapps.net';

  test('Preisliste zeigt Daten', async ({ page }) => {
    await page.goto(`${base}/preisliste`);
    await expect(page.locator('#preisliste-live')).toContainText(['Artikel', 'Warengruppen']);
    await expect(page.locator('#preisliste-live')).not.toContainText('Fehler');
  });

  test('Roter Punkt zeigt Daten', async ({ page }) => {
    await page.goto(`${base}/roter-punkt`);
    await expect(page.locator('#roterpunkt-live')).toContainText(['Roter Punkt', 'Artikel', 'Warengruppen']);
    await expect(page.locator('#roterpunkt-live')).not.toContainText('Fehler');
  });

  test('Wochenplan zeigt Daten', async ({ page }) => {
    await page.goto(`${base}/`);
    await expect(page.locator('#wp-body')).not.toContainText(['konnte nicht geladen', 'Kein aktueller Wochenplan']);
    await expect(page.locator('#wp-body')).toContainText(['Öko-Rabatt', 'Vorbestell']);
  });
});
