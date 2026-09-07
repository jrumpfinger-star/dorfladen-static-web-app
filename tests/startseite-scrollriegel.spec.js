// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Startseite – Bildlauf-Riegel der Dialoge.
 *
 * Auf der Startseite liegen mehrere Dialoge übereinander (TagesInfo,
 * „Meine Bestellungen", Bestelldetails, Mittagstisch-Popup). Damit der
 * Hintergrund nicht mitscrollt, wird der Bildlauf gesperrt – über den
 * gemeinsamen, ZÄHLENDEN Mechanismus `dlLockScroll`/`dlUnlockScroll`
 * (`body.overlay-open`).
 *
 * Gefundene Fehler, die diese Tests absichern:
 *  1. Escape schloss „Meine Bestellungen" nur optisch – der Riegel blieb
 *     stehen und die Seite liess sich danach GAR NICHT mehr scrollen.
 *  2. Escape ohne offenen Dialog sprang an den Seitenanfang.
 *  3. Das TagesInfo-Fenster brachte einen eigenen Riegel aus Inline-Stilen mit
 *     und sperrte nichts, wenn es über die Kachel geöffnet wurde.
 */

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';

async function startseite(page) {
  await page.route('**/api/**', (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [], orders: [], posts: [], threads: [] }),
    }));
  await page.addInitScript(() => {
    try {
      const d = new Date().toISOString().substring(0, 10);
      localStorage.setItem('dl_cookies', '1');
      localStorage.setItem('pwa-dismissed', '1');
      localStorage.setItem('tagespost_seen_' + d, '1'); // Dialog nicht von selbst öffnen
    } catch (e) { /* ignore */ }
  });
  await page.goto(BASE + '/', { waitUntil: 'commit' });
  await page.waitForSelector('#tp-overlay', { state: 'attached', timeout: 30000 });
  await page.waitForFunction(() => typeof window.tpOpenModal === 'function', null, { timeout: 30000 });
}

/** Aktueller Sperrzustand der Seite. */
function zustand(page) {
  return page.evaluate(() => ({
    gesperrt: document.body.classList.contains('overlay-open'),
    zaehler: window._dlScrollLocks,
    position: getComputedStyle(document.body).position,
  }));
}

test.describe('Startseite: Bildlauf-Riegel der Dialoge', () => {
  test.use({ serviceWorkers: 'block' });

  test('TC-SL-01 Escape ohne offenen Dialog verändert die Position nicht', async ({ page }) => {
    await startseite(page);
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(300);
    const vorher = await page.evaluate(() => Math.round(window.scrollY));
    expect(vorher).toBeGreaterThan(0);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    const nachher = await page.evaluate(() => Math.round(window.scrollY));
    expect(Math.abs(nachher - vorher)).toBeLessThanOrEqual(2);
  });

  test('TC-SL-02 Escape auf „Meine Bestellungen" gibt den Bildlauf wieder frei', async ({ page }) => {
    await startseite(page);
    await page.evaluate(() => {
      document.getElementById('orders-overlay').classList.add('open');
      window.dlLockScroll();
    });
    expect((await zustand(page)).gesperrt).toBe(true);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    const z = await zustand(page);
    expect(await page.locator('#orders-overlay').evaluate((e) => e.classList.contains('open'))).toBe(false);
    expect(z.gesperrt).toBe(false);
    expect(z.zaehler).toBe(0);
    // Und die Seite lässt sich wieder bewegen (html hat scroll-behavior:smooth,
    // daher kurz warten statt sofort auszulesen)
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(600);
    const y = await page.evaluate(() => Math.round(window.scrollY));
    expect(y).toBeGreaterThan(0);
  });

  test('TC-SL-03 TagesInfo über die Kachel sperrt den Hintergrund', async ({ page }) => {
    await startseite(page);
    await page.evaluate(() => window.tpOpenModal());
    await page.waitForTimeout(300);
    const z = await zustand(page);
    expect(z.gesperrt).toBe(true);
    expect(z.zaehler).toBe(1);
  });

  test('TC-SL-04 TagesInfo schließen gibt den Bildlauf frei und hält die Position', async ({ page }) => {
    await startseite(page);
    await page.evaluate(() => window.scrollTo(0, 350));
    // html hat scroll-behavior:smooth – erst wenn die Bewegung steht, darf
    // gesperrt werden, sonst merkt sich der Riegel eine Zwischenposition.
    await page.waitForTimeout(800);
    const vorher = await page.evaluate(() => Math.round(window.scrollY));
    expect(vorher).toBeGreaterThan(0);
    await page.evaluate(() => window.tpOpenModal());
    await page.waitForTimeout(300);
    expect((await zustand(page)).gesperrt).toBe(true);
    await page.locator('#tp-close').click();
    await page.waitForTimeout(800);
    const z = await zustand(page);
    expect(z.gesperrt).toBe(false);
    expect(z.zaehler).toBe(0);
    const nachher = await page.evaluate(() => Math.round(window.scrollY));
    expect(Math.abs(nachher - vorher)).toBeLessThanOrEqual(3);
  });

  test('TC-SL-05 Zwei Dialoge übereinander lassen den Riegel nicht fallen', async ({ page }) => {
    await startseite(page);
    await page.evaluate(() => window.tpOpenModal());          // Riegel 1
    await page.evaluate(() => window.dlLockScroll());          // Riegel 2 (z.B. Bestell-Popup)
    expect((await zustand(page)).zaehler).toBe(2);
    await page.evaluate(() => window.dlUnlockScroll());        // oberer Dialog zu
    const mitte = await zustand(page);
    expect(mitte.zaehler).toBe(1);
    expect(mitte.gesperrt).toBe(true);                         // TagesInfo ist noch offen
    await page.locator('#tp-close').click();
    await page.waitForTimeout(400);
    const ende = await zustand(page);
    expect(ende.zaehler).toBe(0);
    expect(ende.gesperrt).toBe(false);
  });

  test('TC-SL-06 Mehrfaches Escape sperrt die Seite nicht aus', async ({ page }) => {
    await startseite(page);
    for (let i = 0; i < 4; i++) { await page.keyboard.press('Escape'); }
    await page.waitForTimeout(400);
    const z = await zustand(page);
    expect(z.zaehler).toBe(0);
    expect(z.gesperrt).toBe(false);
    await page.evaluate(() => window.scrollTo(0, 250));
    await page.waitForTimeout(600);
    const y = await page.evaluate(() => Math.round(window.scrollY));
    expect(y).toBeGreaterThan(0);
  });
});
