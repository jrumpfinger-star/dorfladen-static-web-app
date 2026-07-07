// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * CMS Social-UI – Angleichung an Kiosk-Wizard-Layout (AK-UI-50)
 *
 * Da das CMS Login erfordert, prüfen wir die DOM-Präsenz der portierten
 * Wizard-Struktur (nicht die Sichtbarkeit). Die geteilte social.js-Logik
 * wird über die Kiosk-Tests (social-scheduling.spec.js, kiosk.spec.js)
 * funktional abgedeckt.
 */

const BASE = process.env.BASE_URL || process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const CMS_URL = `${BASE}/cms.html`;

test.describe('CMS Social-UI – Kiosk-Wizard-Angleichung', () => {

  test('T-CS-01 Social-Panel + Sub-Tabs (Neuer Post | Katalog) vorhanden', async ({ page }) => {
    await page.goto(CMS_URL);
    await page.waitForTimeout(1500);
    await expect(page.locator('#cms-panel-social')).toBeAttached();
    await expect(page.locator('#cms-panel-social #social-subtab-post')).toBeAttached();
    await expect(page.locator('#cms-panel-social #social-subtab-katalog')).toBeAttached();
    // Sub-Tabs nutzen die Kiosk-Klasse k-filter-btn
    await expect(page.locator('#cms-panel-social .k-filter-btn')).toHaveCount(2);
  });

  test('T-CS-02 4 nummerierte Step-Karten (soc-step-1..4) als k-order', async ({ page }) => {
    await page.goto(CMS_URL);
    await page.waitForTimeout(1500);
    for (const n of [1, 2, 3, 4]) {
      const step = page.locator(`#cms-panel-social #soc-step-${n}`);
      await expect(step).toBeAttached();
      await expect(step).toHaveClass(/k-order/);
    }
  });

  test('T-CS-03 Step-Header nutzen k-order-hdr mit socToggleStep', async ({ page }) => {
    await page.goto(CMS_URL);
    await page.waitForTimeout(1500);
    const headers = page.locator('#cms-panel-social .k-order-hdr');
    const count = await headers.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('T-CS-04 socToggleStep + socDeskTab sind global registriert', async ({ page }) => {
    await page.goto(CMS_URL);
    await page.waitForTimeout(1500);
    const hasToggle = await page.evaluate(() => typeof window.socToggleStep === 'function');
    const hasDeskTab = await page.evaluate(() => typeof window.socDeskTab === 'function');
    expect(hasToggle).toBe(true);
    expect(hasDeskTab).toBe(true);
  });

  test('T-CS-05 Katalog: Split-View-Container + Kategorie-Manager vorhanden', async ({ page }) => {
    await page.goto(CMS_URL);
    await page.waitForTimeout(1500);
    await expect(page.locator('#cms-panel-social #soc-kat-split-container')).toBeAttached();
    await expect(page.locator('#cms-panel-social #soc-kat-col-left')).toBeAttached();
    await expect(page.locator('#cms-panel-social #soc-kat-col-right')).toBeAttached();
    await expect(page.locator('#cms-panel-social #soc-kat-manager')).toBeAttached();
    // Geteilte Formular-IDs (social.js) erhalten
    await expect(page.locator('#cms-panel-social #soc-kat-name')).toBeAttached();
    await expect(page.locator('#cms-panel-social #soc-kat-kategorie')).toBeAttached();
    await expect(page.locator('#cms-panel-social #soc-kat-list')).toBeAttached();
  });

  test('T-CS-06 Desktop-Action-Bar + Desktop-Tabs (Erfassen | Posts) vorhanden', async ({ page }) => {
    await page.goto(CMS_URL);
    await page.waitForTimeout(1500);
    await expect(page.locator('#cms-panel-social #soc-desk-bar')).toBeAttached();
    await expect(page.locator('#cms-panel-social #soc-desk-tabs')).toBeAttached();
    await expect(page.locator('#cms-panel-social #soc-desk-tab-edit')).toBeAttached();
    await expect(page.locator('#cms-panel-social #soc-desk-tab-posts')).toBeAttached();
  });

  test('T-CS-07 2-Spalten-Layout (soc-col-left | soc-col-right) vorhanden', async ({ page }) => {
    await page.goto(CMS_URL);
    await page.waitForTimeout(1500);
    await expect(page.locator('#cms-panel-social #soc-col-left')).toBeAttached();
    await expect(page.locator('#cms-panel-social #soc-col-right')).toBeAttached();
  });

  test('T-CS-08 Heute/Morgen-Toggle + Titel-Select + Vorschau-Canvas erhalten', async ({ page }) => {
    await page.goto(CMS_URL);
    await page.waitForTimeout(1500);
    await expect(page.locator('#cms-panel-social #soc-date-toggle')).toBeAttached();
    await expect(page.locator('#cms-panel-social #soc-date-toggle button[data-day="heute"]')).toBeAttached();
    await expect(page.locator('#cms-panel-social #soc-date-toggle button[data-day="morgen"]')).toBeAttached();
    await expect(page.locator('#cms-panel-social #soc-post-titel-sel')).toBeAttached();
    await expect(page.locator('#cms-panel-social #soc-post-canvas')).toBeAttached();
  });

  test('T-CS-09 Step-2-Badge (soc-step2-count) für Produktanzahl vorhanden', async ({ page }) => {
    await page.goto(CMS_URL);
    await page.waitForTimeout(1500);
    await expect(page.locator('#cms-panel-social #soc-step2-count')).toBeAttached();
  });

  test('T-CS-10 socToggleStep togglet oc-collapsed auf Step 3', async ({ page }) => {
    await page.goto(CMS_URL);
    await page.waitForTimeout(1500);
    // Step 3 startet zugeklappt (oc-collapsed)
    const before = await page.evaluate(() => {
      const el = document.getElementById('soc-step-3');
      return el ? el.classList.contains('oc-collapsed') : null;
    });
    expect(before).toBe(true);
    // Toggle via globaler Funktion
    await page.evaluate(() => window.socToggleStep(3));
    const after = await page.evaluate(() => {
      const el = document.getElementById('soc-step-3');
      return el ? el.classList.contains('oc-collapsed') : null;
    });
    expect(after).toBe(false);
  });
});
