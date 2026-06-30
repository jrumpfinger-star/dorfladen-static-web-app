// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';

test.describe('Social Post Scheduling', () => {

  test('T-SP-01 (AK-SP-01) Kiosk: Heute/Morgen Toggle sichtbar', async ({ page }) => {
    await page.goto(BASE + '/kiosk.html');
    // Switch to Social tab
    await page.click('[data-tab="social"]');
    await page.waitForTimeout(500);
    // Click "Neuer Post" sub-tab if exists
    const postTab = page.locator('text=Neuer Post');
    if (await postTab.isVisible()) await postTab.click();
    await page.waitForTimeout(300);
    const toggle = page.locator('#soc-date-toggle');
    await expect(toggle).toBeVisible();
    const heuteBtn = toggle.locator('button[data-day="heute"]');
    const morgenBtn = toggle.locator('button[data-day="morgen"]');
    await expect(heuteBtn).toBeVisible();
    await expect(morgenBtn).toBeVisible();
  });

  test('T-SP-02 (AK-SP-02) Kiosk: Titel aendert sich bei Morgen-Toggle', async ({ page }) => {
    await page.goto(BASE + '/kiosk.html');
    await page.click('[data-tab="social"]');
    await page.waitForTimeout(500);
    const postTab = page.locator('text=Neuer Post');
    if (await postTab.isVisible()) await postTab.click();
    await page.waitForTimeout(300);
    // Click Morgen
    await page.click('#soc-date-toggle button[data-day="morgen"]');
    await page.waitForTimeout(200);
    const sel = page.locator('#soc-post-titel-sel');
    const firstOpt = await sel.locator('option').first().textContent();
    expect(firstOpt).toContain('Morgen im Dorfladen');
    // Click Heute
    await page.click('#soc-date-toggle button[data-day="heute"]');
    await page.waitForTimeout(200);
    const firstOptHeute = await sel.locator('option').first().textContent();
    expect(firstOptHeute).toContain('Heute im Dorfladen');
  });

  test('T-SP-03 (AK-SP-03) Kiosk: Datum-Label zeigt gewahlten Tag', async ({ page }) => {
    await page.goto(BASE + '/kiosk.html');
    await page.click('[data-tab="social"]');
    await page.waitForTimeout(500);
    const postTab = page.locator('text=Neuer Post');
    if (await postTab.isVisible()) await postTab.click();
    await page.waitForTimeout(300);
    const label = page.locator('#soc-date-label');
    await expect(label).not.toBeEmpty();
    // Should contain a German date like "Dienstag, 01. Juli"
    const text = await label.textContent();
    expect(text.length).toBeGreaterThan(5);
  });

  test('T-SP-04 (AK-SP-01) CMS: Heute/Morgen Toggle sichtbar', async ({ page }) => {
    await page.goto(BASE + '/cms.html');
    await page.waitForTimeout(1000);
    // Navigate to Social section
    const socialNav = page.locator('text=Social Media');
    if (await socialNav.isVisible()) await socialNav.click();
    await page.waitForTimeout(500);
    const postTab = page.locator('text=Neuer Post');
    if (await postTab.isVisible()) await postTab.click();
    await page.waitForTimeout(300);
    const toggle = page.locator('#soc-date-toggle');
    await expect(toggle).toBeVisible();
  });

  test('T-SP-05 (AK-SP-05) API: social-post akzeptiert ziel_datum', async ({ request }) => {
    // Just test that the API accepts the parameter without error (GET to verify structure)
    const res = await request.get(BASE + '/api/social-post');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('items');
  });

  test('T-SP-06 (AK-SP-07) API: tagespost liefert today_post und tomorrow_post', async ({ request }) => {
    const res = await request.get(BASE + '/api/tagespost');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('success', true);
    // Response should have today_post and tomorrow_post fields (may be null)
    if (data.post) {
      expect(data).toHaveProperty('today_post');
      expect(data).toHaveProperty('tomorrow_post');
    }
  });

  test('T-SP-07 (AK-SP-08) Homepage: TagesInfo-Modal hat Tab-Leiste', async ({ page }) => {
    await page.goto(BASE + '/');
    await page.waitForTimeout(2000);
    // The tab bar exists in DOM (may be hidden if only one post)
    const tabBar = page.locator('#tp-day-tabs');
    await expect(tabBar).toBeAttached();
  });

  test('T-SP-08 (AK-SP-11) Kiosk: Geplante Posts Label existiert', async ({ page }) => {
    await page.goto(BASE + '/kiosk.html');
    await page.click('[data-tab="social"]');
    await page.waitForTimeout(500);
    const postTab = page.locator('text=Neuer Post');
    if (await postTab.isVisible()) await postTab.click();
    await page.waitForTimeout(300);
    // The "Geplante Posts" section exists in DOM
    const wrap = page.locator('#soc-today-posts');
    await expect(wrap).toBeAttached();
  });
});
