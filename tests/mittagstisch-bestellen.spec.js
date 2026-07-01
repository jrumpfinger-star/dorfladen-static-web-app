// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';

/* ───────────────────────────────────────────────
   T-MT – Mittagstisch bestellen (AK-MT-01 .. AK-MT-06)
   ─────────────────────────────────────────────── */

test.describe('T-MT Mittagstisch bestellen', () => {

  // AK-MT-01: Vergangene Tage nicht bestellbar
  test('T-MT-01 Vergangene Tage sind ausgegraut und nicht klickbar (AK-MT-01)', async ({ page }) => {
    await page.goto(BASE + '/mittagstisch-bestellen');
    await page.waitForSelector('.menu-day-header', { timeout: 10000 });

    // Get current day of week (1=Mon .. 5=Fri)
    const todayDow = new Date().getDay(); // 0=Sun
    if (todayDow <= 1) {
      test.skip(true, 'Montag oder Sonntag – keine vergangenen Tage');
    }

    // Past items should have opacity and pointer-events:none
    const pastItems = page.locator('.menu-item[style*="pointer-events"]');
    const pastCount = await pastItems.count();
    expect(pastCount).toBeGreaterThan(0);

    // Past items should have line-through
    const firstPastDish = pastItems.first().locator('.menu-item-dish');
    await expect(firstPastDish).toHaveCSS('text-decoration-line', 'line-through');
  });

  // AK-MT-01: "vorbei" Label
  test('T-MT-02 Vergangene Tage zeigen "vorbei" Label (AK-MT-01)', async ({ page }) => {
    await page.goto(BASE + '/mittagstisch-bestellen');
    await page.waitForSelector('.menu-day-header', { timeout: 10000 });

    const todayDow = new Date().getDay();
    if (todayDow <= 1) {
      test.skip(true, 'Montag oder Sonntag – keine vergangenen Tage');
    }

    const headers = page.locator('.menu-day-header');
    const headerTexts = await headers.allInnerTexts();
    const hasVorbei = headerTexts.some(t => t.includes('vorbei'));
    expect(hasVorbei).toBe(true);
  });

  // AK-MT-01: Kein Bestell-Button bei vergangenen Tagen
  test('T-MT-03 Vergangene Tage haben keinen Bestell-Button (AK-MT-01)', async ({ page }) => {
    await page.goto(BASE + '/mittagstisch-bestellen');
    await page.waitForSelector('.menu-day-header', { timeout: 10000 });

    const todayDow = new Date().getDay();
    if (todayDow <= 1) {
      test.skip(true, 'Montag oder Sonntag – keine vergangenen Tage');
    }

    const pastItems = page.locator('.menu-item[style*="pointer-events"]');
    const count = await pastItems.count();
    for (let i = 0; i < count; i++) {
      const orderBtn = pastItems.nth(i).locator('.menu-item-order');
      await expect(orderBtn).toHaveCount(0);
    }
  });

  // AK-MT-03: Zukünftige Tage bestellbar
  test('T-MT-04 Zukünftige Tage zeigen Bestell-Button (AK-MT-03)', async ({ page }) => {
    await page.goto(BASE + '/mittagstisch-bestellen');
    await page.waitForSelector('.menu-day-header', { timeout: 10000 });

    const todayDow = new Date().getDay();
    if (todayDow >= 5) {
      test.skip(true, 'Freitag/Samstag – keine zukünftigen Wochentage');
    }

    const activeItems = page.locator('.menu-item:not([style*="pointer-events"])');
    const activeCount = await activeItems.count();
    expect(activeCount).toBeGreaterThan(0);

    const firstActive = activeItems.first().locator('.menu-item-order');
    await expect(firstActive).toHaveCount(1);
  });

  // AK-MT-04: Dynamischer Bestellschluss
  test('T-MT-05 Bestellschluss wird dynamisch geladen (AK-MT-04)', async ({ page }) => {
    await page.goto(BASE + '/mittagstisch-bestellen');
    await page.waitForSelector('#lunch-cd', { timeout: 10000 });

    const cdEl = page.locator('#lunch-cd');
    await expect(cdEl).toBeVisible();

    // Should contain either countdown or "erreicht"
    const text = await cdEl.innerText();
    expect(text.length).toBeGreaterThan(0);
  });

  // AK-MT-05: TagesInfo Bestell-Button
  test('T-MT-06 TagesInfo zeigt Mittagessen-Bestell-Button (AK-MT-05)', async ({ page }) => {
    await page.goto(BASE + '/');
    // Open TagesInfo modal
    await page.evaluate(() => {
      var el = document.getElementById('tp-overlay');
      if (el) el.classList.add('open');
    });
    await page.waitForTimeout(500);

    const orderBtn = page.locator('.tp-item-order');
    // Only check if there are Mittagessen items
    const mittag = page.locator('.tp-section-title:has-text("Mittagessen")');
    const hasMittag = await mittag.count();
    if (hasMittag > 0) {
      await expect(orderBtn.first()).toBeVisible();
      const href = await orderBtn.first().getAttribute('href');
      expect(href).toContain('/mittagstisch-bestellen');
    }
  });

  // AK-MT-06: TagesInfo Name nicht abgeschnitten
  test('T-MT-07 TagesInfo Mittagessen-Name wird nicht abgeschnitten (AK-MT-06)', async ({ page }) => {
    await page.goto(BASE + '/');
    await page.evaluate(() => {
      var el = document.getElementById('tp-overlay');
      if (el) el.classList.add('open');
    });
    await page.waitForTimeout(500);

    const itemName = page.locator('.tp-item-name').first();
    const nameCount = await itemName.count();
    if (nameCount > 0) {
      const ws = await itemName.evaluate(el => getComputedStyle(el).whiteSpace);
      expect(ws).not.toBe('nowrap');
    }
  });

  // AK-MT-06: Keine redundante Kategorie "Mittagessen"
  test('T-MT-08 TagesInfo zeigt nicht redundant "Mittagessen" als Kategorie (AK-MT-06)', async ({ page }) => {
    await page.goto(BASE + '/');
    await page.evaluate(() => {
      var el = document.getElementById('tp-overlay');
      if (el) el.classList.add('open');
    });
    await page.waitForTimeout(500);

    const mittag = page.locator('.tp-section-title:has-text("Mittagessen")');
    const hasMittag = await mittag.count();
    if (hasMittag > 0) {
      // Items within Mittagessen section should NOT show "Mittagessen" as category text
      const section = page.locator('.tp-section').first();
      const catLabels = section.locator('.tp-item-cat');
      const count = await catLabels.count();
      for (let i = 0; i < count; i++) {
        const text = await catLabels.nth(i).innerText();
        expect(text.trim()).not.toBe('Mittagessen');
      }
    }
  });
});
