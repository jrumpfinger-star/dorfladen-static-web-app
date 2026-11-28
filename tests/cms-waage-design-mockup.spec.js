const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const url = pathToFileURL(path.resolve(__dirname, '..', 'mockups', 'waage-design-mockup.html')).href;
const sizes = [[375, 667], [768, 1024], [1280, 800], [686, 1095]];
const errors = new WeakMap();
const api = new WeakMap();

test.beforeEach(async ({ page }) => {
  errors.set(page, []); api.set(page, []);
  page.on('pageerror', error => errors.get(page).push(error.message));
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) api.get(page).push(request.url()); });
  await page.goto(url);
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
  expect(api.get(page)).toEqual([]);
});

async function geometry(page) {
  return page.evaluate(() => {
    const box = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, b: r.bottom, r: r.right }; };
    const touch = innerWidth < 600 || matchMedia('(pointer:coarse)').matches;
    return {
      width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight, touch,
      tab: box('.tabs [aria-selected=true]'), frame: box('[data-preview] > *'), tools: box('.tools'),
      toolsScrolls: document.querySelector('.tools').scrollHeight >= document.querySelector('.tools').clientHeight,
      controls: [...document.querySelectorAll('.tools button, .tools select, .tools input, .tools summary, .top button')].filter(n => n.offsetParent).map(n => {
        const r = n.getBoundingClientRect();
        return { label: n.getAttribute('aria-label') || n.textContent.trim() || n.dataset.f || n.tagName, w: r.width, h: r.height };
      })
    };
  });
}

for (const [width, height] of sizes) {
  test(`TC-WDM-01 ${width}x${height}: Reiter, Vorschau im echten Format und Bedienmaße`, { tag: '@layout' }, async ({ page }) => {
    await page.setViewportSize({ width, height });
    for (const [tab, ratio] of [['Waage groß', 800 / 462], ['Waage klein', 800 / 280]]) {
      await page.getByRole('tab', { name: new RegExp('^' + tab) }).click();
      await expect(page.getByRole('tab', { name: new RegExp('^' + tab) })).toHaveAttribute('aria-selected', 'true');
      const g = await geometry(page);
      expect(g.scrollWidth).toBeLessThanOrEqual(g.width);
      expect(g.scrollHeight).toBeLessThanOrEqual(g.height);
      expect(g.tab.x).toBeGreaterThanOrEqual(0);
      expect(g.tab.r).toBeLessThanOrEqual(g.width);
      expect(g.frame.x).toBeGreaterThanOrEqual(0);
      expect(g.frame.r).toBeLessThanOrEqual(g.width);
      expect(g.frame.b).toBeLessThanOrEqual(g.height);
      expect(g.frame.w / g.frame.h).toBeCloseTo(ratio, 1);
      expect(g.tools.h).toBeGreaterThanOrEqual(g.width >= 900 ? 300 : 150);
      for (const c of g.controls) {
        expect(c.h, c.label).toBeGreaterThanOrEqual(g.touch ? 44 : 32);
        if (!/^(Farbvorgabe|Form|Marker|Eigene Vorlage|Vorlage)/.test(c.label)) expect(c.w, c.label).toBeGreaterThanOrEqual(g.touch ? 44 : 32);
      }
    }
    await page.screenshot({ path: test.info().outputPath(`waage-design-${width}x${height}.png`) });
  });
}

test('TC-WDM-02: Profile getrennt, Eingaben bleiben beim Wechsel, Speichern schreibt nichts', async ({ page }) => {
  await page.getByRole('tab', { name: /^Waage groß/ }).click();
  await page.locator('input[data-f=bg]').fill('#112233');
  await expect(page.locator('[data-status]')).toContainText('noch nicht gespeichert');
  await page.getByRole('tab', { name: /^Waage klein/ }).click();
  await expect(page.locator('input[data-f=bg]')).toHaveValue('#fffdf6');
  await expect(page.locator('[data-status]')).toContainText('Gespeichert');
  await page.getByRole('tab', { name: /^Waage groß/ }).click();
  await expect(page.locator('input[data-f=bg]')).toHaveValue('#112233');
  await expect(page.locator('.motif')).toHaveCSS('background-color', 'rgb(17, 34, 51)');
  await page.getByRole('button', { name: 'Standard speichern' }).click();
  await expect(page.locator('[data-status]')).toContainText('Gespeichert');
  await page.getByRole('tab', { name: /^Waage klein/ }).click();
  await expect(page.locator('.motif')).toHaveCSS('background-color', 'rgb(255, 253, 246)');
});

test('TC-WDM-03: jede Einstellung wirkt, Rückfragen lassen sich mit Escape abbrechen', async ({ page }) => {
  await page.getByRole('tab', { name: /^Waage groß/ }).click();
  await expect(page.locator('.m-mark')).toHaveAttribute('data-type', 'starburst');
  await page.locator('select[data-f=template]').selectOption('dunkel');
  await expect(page.locator('input[data-f=bg]')).toHaveValue('#1b2228');
  await expect(page.locator('.m-mark')).toHaveAttribute('data-type', 'starburst');
  await page.locator('select[data-f=template]').selectOption('land');
  await page.getByRole('button', { name: 'Vorlage anwenden' }).click();
  await expect(page.locator('input[data-f=bg]')).toHaveValue('#fffdf6');
  await page.locator('summary', { hasText: 'Preisschild' }).click();
  await page.locator('select[data-f=shape]').selectOption('pill');
  await expect(page.locator('.m-tag')).toHaveAttribute('data-shape', 'pill');
  await page.locator('summary', { hasText: 'Sparmarker' }).click();
  await page.locator('select[data-f=mark]').selectOption('off');
  await expect(page.locator('.m-mark')).toHaveCount(0);
  await page.locator('input[data-f=bg]').fill('#abcdef');
  await page.getByRole('button', { name: 'Verwerfen' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('input[data-f=bg]')).toHaveValue('#abcdef');
  await page.getByRole('button', { name: 'Verwerfen' }).click();
  await page.getByRole('button', { name: 'Änderungen verwerfen' }).click();
  await expect(page.locator('input[data-f=bg]')).toHaveValue('#fffdf6');
});

test('TC-WDM-04: Wochenplan-Waage je Profil mit Hinweis bei zu großer Schrift', async ({ page }) => {
  await page.getByRole('button', { name: 'Wochenplan', exact: true }).click();
  await page.getByRole('tab', { name: 'Waage klein' }).click();
  await expect(page.locator('.wp')).toHaveAttribute('data-profile', 'small');
  await expect(page.locator('[data-hint]')).toBeHidden();
  await page.locator('input[data-w=fs]').fill('34');
  await expect(page.locator('[data-hint]')).toBeVisible();
  await page.locator('input[data-w=price]').fill('#00aa00');
  await expect(page.locator('.wp')).toHaveCSS('--w-price', '#00aa00');
  await page.getByRole('tab', { name: 'Waage groß' }).click();
  await expect(page.locator('.wp')).toHaveAttribute('data-profile', 'large');
  await expect(page.locator('input[data-w=price]')).toHaveValue('#a51d2d');
  await expect(page.locator('[data-hint]')).toBeHidden();
});
