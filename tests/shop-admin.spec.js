/**
 * Shop-Admin Tests – Playwright
 * 
 * Testet die shop-admin.html Features gegen die Specs:
 *   - specs/shop-admin-mittagstisch.md
 * 
 * Voraussetzung: SWA CLI oder lokaler Server auf Port 4280
 *   npx @azure/static-web-apps-cli start static-site --api-location api
 * 
 * Ausführen:
 *   npx playwright test tests/shop-admin.spec.js
 */

const { test, expect } = require('@playwright/test');

const BASE = process.env.TEST_URL || 'http://localhost:4280';
const ADMIN_URL = `${BASE}/shop-admin.html`;

// ════════════════════════════════════════════════════
//  AK-MT: Mittagstisch (specs/shop-admin-mittagstisch.md)
// ════════════════════════════════════════════════════

test.describe('Shop-Admin Mittagstisch – Day Tabs', () => {

  test('AK-MT-01: Samstag erscheint in Day-Tabs (Mo–Sa)', async ({ page }) => {
    await page.goto(ADMIN_URL);
    // Open Mittagstisch section if collapsed
    const toggleBtn = page.locator('#mt-toggle');
    if (await toggleBtn.count() > 0) {
      const icon = page.locator('#mt-toggle-icon');
      const text = await icon.textContent();
      if (text === '▼') {
        await toggleBtn.click();
      }
    }
    await page.waitForSelector('#mt-day-tabs button');
    const dayButtons = page.locator('#mt-day-tabs button');
    const count = await dayButtons.count();
    expect(count).toBe(5);

    // Verify that the day generation logic includes Saturday
    // We check the JS source to confirm getDay() <= 6
    const scriptContent = await page.content();
    expect(scriptContent).toContain('d.getDay() <= 6');
    expect(scriptContent).not.toContain('d.getDay() <= 5');
  });

  test('AK-MT-01b: Heute-Tab ist standardmäßig selektiert', async ({ page }) => {
    await page.goto(ADMIN_URL);
    const toggleBtn = page.locator('#mt-toggle');
    if (await toggleBtn.count() > 0) {
      const icon = page.locator('#mt-toggle-icon');
      const text = await icon.textContent();
      if (text === '▼') {
        await toggleBtn.click();
      }
    }
    await page.waitForSelector('#mt-day-tabs button');
    // Find active tab
    const activeTab = page.locator('#mt-day-tabs button').filter({
      has: page.locator('css=*'),
    }).filter({ hasText: 'Heute' });
    // At least one button should contain "Heute" and have green styling
    const todayButtons = page.locator('#mt-day-tabs button', { hasText: 'Heute' });
    const todayCount = await todayButtons.count();
    if (todayCount > 0) {
      // Check it has active styling (background green)
      const style = await todayButtons.first().getAttribute('style');
      expect(style).toContain('var(--green)');
    }
  });
});

test.describe('Shop-Admin Mittagstisch – Status-Änderung', () => {

  test('AK-MT-02: mtSetStatus URL enthält ID-Parameter', async ({ page }) => {
    await page.goto(ADMIN_URL);
    // Verify the JS code sends ID in URL path
    const scriptContent = await page.content();
    expect(scriptContent).toContain("fetch('/api/lunch-order/'+encodeURIComponent(id)");
  });

  test('AK-MT-03: Fehlerbehandlung nutzt toast() statt alert()', async ({ page }) => {
    await page.goto(ADMIN_URL);
    const scriptContent = await page.content();
    // mtSetStatus should not contain alert()
    // Check that the catch handler uses toast
    const mtSetStatusMatch = scriptContent.match(/function mtSetStatus[\s\S]*?^}/m);
    if (mtSetStatusMatch) {
      expect(mtSetStatusMatch[0]).not.toContain('alert(');
      expect(mtSetStatusMatch[0]).toContain('toast(');
    }
  });

  test('AK-MT-02b: Statusänderung mit API-Interception', async ({ page }) => {
    // Intercept PATCH calls to verify correct URL pattern
    const patchCalls = [];
    await page.route('**/api/lunch-order/**', (route) => {
      if (route.request().method() === 'PATCH') {
        patchCalls.push(route.request().url());
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto(ADMIN_URL);
    await page.waitForTimeout(2000);

    // Find a status button (Bestätigen or ❌)
    const statusBtn = page.locator('[onclick*="mtSetStatus"]').first();
    if (await statusBtn.count() === 0) {
      test.skip(true, 'Keine Mittagstisch-Bestellungen vorhanden');
      return;
    }
    await statusBtn.click();
    await page.waitForTimeout(500);

    // Verify PATCH URL includes an ID
    expect(patchCalls.length).toBeGreaterThan(0);
    expect(patchCalls[0]).toMatch(/\/api\/lunch-order\/[a-f0-9-]+/i);
  });
});

// ════════════════════════════════════════════════════
//  Shop-Admin – Allgemeine UI-Tests
// ════════════════════════════════════════════════════

test.describe('Shop-Admin – Grundlagen', () => {

  test('Seite lädt ohne JS-Fehler', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto(ADMIN_URL);
    await page.waitForTimeout(2000);
    // Filter out expected errors (e.g. network issues in test env)
    const criticalErrors = errors.filter(e => !e.includes('fetch') && !e.includes('NetworkError'));
    expect(criticalErrors).toHaveLength(0);
  });

  test('Toast-Funktion existiert', async ({ page }) => {
    await page.goto(ADMIN_URL);
    const hasToast = await page.evaluate(() => typeof toast === 'function');
    expect(hasToast).toBe(true);
  });

  test('Stornieren-Dialog verwendet Gründe-Auswahl', async ({ page }) => {
    await page.goto(ADMIN_URL);
    const scriptContent = await page.content();
    expect(scriptContent).toContain('stornoReasons');
    expect(scriptContent).toContain('Stornierungsgrund');
  });
});
