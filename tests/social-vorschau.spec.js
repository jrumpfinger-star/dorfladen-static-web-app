// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Social-Vorschau (F16) – Poster passt ohne Scrollen in die rechte Spalte,
 * laesst sich zoomen und im Vollbild oeffnen. Ausserdem: gespeicherte Posts
 * zeigen ihr erzeugtes Bild erneut an ("Posts & Entwuerfe").
 *
 * Die API wird komplett abgefangen (page.route) – kein echter Versand,
 * unabhaengig davon, ob lokal oder gegen eine Umgebung getestet wird.
 */

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

const KAT = {
  kategorien: [{ name: 'Aufstriche', icon: 'tag' }, { name: 'Kuchen', icon: 'tag' }],
  items: [
    { id: 'k1', name: 'Antipasti, 100g', kategorie: 'Aufstriche', preis: '1,59' },
    { id: 'k2', name: 'Apfelkuchen', kategorie: 'Kuchen', preis: '2,40' },
    { id: 'k3', name: 'Apfelkuchen mit Schmandhaube', kategorie: 'Kuchen', preis: '3,30' },
  ],
};

function heute() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

const POSTS = {
  posts: [
    {
      id: 'p1', titel: 'Heute im Dorfladen', status: 'veroeffentlicht',
      datum: heute() + 'T09:15:00', ziel_datum: heute(),
      items: [{ id: 'k1', name: 'Antipasti, 100g', kategorie: 'Aufstriche', preis: '1,59' }],
      push_count: 0,
    },
  ],
};

async function mockApi(page, posts) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const json = (o) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
    if (url.includes('/api/social-katalog')) return json(url.includes('mt-bilder') ? { bilder: {} } : KAT);
    if (url.includes('/api/social-post')) return json(posts);
    if (url.includes('/api/cms-config')) return json({ success: true, data: { feature_flags: { kiosk_mittag: true, kiosk_social: true, kiosk_kontakt: true } } });
    return json({ success: true, items: [], posts: [] });
  });
}

async function openSocial(page) {
  await page.goto(KIOSK_URL);
  await page.click('[data-tab="social"]');
  await page.waitForTimeout(400);
  const postTab = page.locator('#social-subtab-post, text=Neuer Post').first();
  if (await postTab.isVisible().catch(() => false)) await postTab.click();
  await page.waitForTimeout(600);
}

test.describe('Social-Vorschau: einpassen + Post-Bild', () => {
  test.use({ serviceWorkers: 'block' });

  test('TC-F16-01 Vorschau passt ohne Scrollen in die rechte Spalte', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'nur Desktop-Layout');
    await mockApi(page, POSTS);
    await openSocial(page);
    const cbs = page.locator('.soc-post-cb');
    await expect(cbs.first()).toBeAttached({ timeout: 10000 });
    for (let i = 0; i < 3; i++) await cbs.nth(i).check();
    await page.waitForTimeout(1200);
    const canvas = page.locator('#soc-post-canvas');
    await expect(canvas).toBeVisible();
    const fits = await page.evaluate(() => {
      const c = document.getElementById('soc-post-canvas');
      const col = document.getElementById('soc-col-right');
      const r = c.getBoundingClientRect();
      return {
        bottom: r.bottom,
        colBottom: col.getBoundingClientRect().bottom,
        viewport: window.innerHeight,
        h: r.height,
        scrollOverflow: col.scrollHeight - col.clientHeight,
      };
    });
    expect(fits.h).toBeGreaterThan(100);
    expect(fits.bottom).toBeLessThanOrEqual(Math.min(fits.colBottom, fits.viewport) + 2);
    expect(fits.scrollOverflow).toBeLessThanOrEqual(2);
  });

  test('TC-F16-02 Zoom vergroessert die Vorschau', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'nur Desktop-Layout');
    await mockApi(page, POSTS);
    await openSocial(page);
    const cbs = page.locator('.soc-post-cb');
    await expect(cbs.first()).toBeAttached({ timeout: 10000 });
    await cbs.nth(0).check();
    await page.waitForTimeout(1000);
    const bar = page.locator('#soc-zoom-bar');
    await expect(bar).toBeVisible();
    const before = await page.locator('#soc-post-canvas').boundingBox();
    await bar.locator('button').nth(1).click();
    await page.waitForTimeout(300);
    const after = await page.locator('#soc-post-canvas').boundingBox();
    expect(after.height).toBeGreaterThan(before.height);
    await expect(page.locator('#soc-zoom-lvl')).toHaveText('125%');
    await bar.locator('button').nth(0).click();
    await page.waitForTimeout(300);
    await expect(page.locator('#soc-zoom-lvl')).toHaveText('Einpassen');
  });

  test('TC-F16-03 Vollbild zeigt das Poster gross', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'nur Desktop-Layout');
    await mockApi(page, POSTS);
    await openSocial(page);
    const cbs = page.locator('.soc-post-cb');
    await expect(cbs.first()).toBeAttached({ timeout: 10000 });
    await cbs.nth(0).check();
    await page.waitForTimeout(1000);
    await page.locator('#soc-zoom-bar button').nth(2).click();
    const box = page.locator('#soc-lightbox');
    await expect(box).toBeVisible();
    await expect(box.locator('canvas')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(box).toHaveCount(0);
  });

  test('TC-F16-04 Posts & Entwuerfe: Bild-Knopf oeffnet das Poster', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'nur Desktop-Layout');
    await mockApi(page, POSTS);
    await openSocial(page);
    await page.locator('#soc-desk-tab-posts').click();
    await page.waitForTimeout(1200);
    const panel = page.locator('#soc-desk-posts-content');
    await expect(panel).toContainText('Heute im Dorfladen');
    await panel.locator('button:has-text("Bild")').first().click();
    const box = page.locator('#soc-lightbox');
    await expect(box).toBeVisible({ timeout: 10000 });
    await expect(box.locator('canvas')).toBeVisible();
    await box.locator('button:has-text("Schließen")').click();
    await expect(box).toHaveCount(0);
  });

  test('TC-F16-05 Posts & Entwuerfe: Hinweis statt leerer Flaeche', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'nur Desktop-Layout');
    await mockApi(page, { posts: [] });
    await openSocial(page);
    await page.locator('#soc-desk-tab-posts').click();
    await page.waitForTimeout(1200);
    await expect(page.locator('#soc-desk-posts-content')).toContainText('Keine Posts');
  });

  test('TC-F16-06 Mobil: keine Skalierung, Zoomleiste ausgeblendet', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'nur mobiles Layout');
    const fehler = [];
    page.on('pageerror', (e) => fehler.push(e.message));
    await mockApi(page, POSTS);
    await openSocial(page);
    await page.waitForTimeout(800);
    await expect(page.locator('#soc-zoom-bar')).toBeHidden();
    const stil = await page.evaluate(() => {
      const c = document.getElementById('soc-post-canvas');
      return { w: c.style.width, h: c.style.height, mw: c.style.maxWidth };
    });
    expect(stil.w).toBe('');
    expect(stil.h).toBe('');
    expect(stil.mw).toBe('100%');
    expect(fehler).toEqual([]);
  });
});
