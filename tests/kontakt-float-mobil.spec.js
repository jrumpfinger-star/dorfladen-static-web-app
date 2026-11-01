// @ts-check
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const SCRIPT = fs.readFileSync(path.join(__dirname, '..', 'static-site', 'js', 'kontakt.js'), 'utf8');
const ORIGIN = 'http://127.0.0.1:4173';
const STORAGE_KEY = 'dl_kontakt_float_position_v1';

function alphaOf(color) {
  if (!color.startsWith('rgba(')) return 1;
  return Number(color.slice(color.lastIndexOf(',') + 1, -1));
}

async function laden(page, viewport, speicherBlockieren = false) {
  await page.setViewportSize(viewport);
  await page.route(ORIGIN + '/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/') {
      return route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><html lang="de"><head><meta charset="utf-8"></head><body><script src="/js/kontakt.js"></script></body></html>',
      });
    }
    if (url.pathname === '/js/kontakt.js') {
      return route.fulfill({ contentType: 'application/javascript', body: SCRIPT });
    }
    if (url.pathname === '/api/cms-config') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { feature_flags: { kiosk_kontakt: true } } }),
      });
    }
    if (url.pathname === '/api/contact-message') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ success: true, thread: null }),
      });
    }
    return route.fulfill({ status: 404, body: 'Not found' });
  });
  if (speicherBlockieren) {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() { throw new Error('Storage is disabled'); },
      });
    });
  }
  await page.goto(ORIGIN + '/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#hp-chat-float')).toBeVisible();
}

test.describe('Mobiler Chat-Float', () => {
  test('TC-KMF-01/02/03: Drag, Speicherung und Viewport-Begrenzung', async ({ page }) => {
    await laden(page, { width: 375, height: 667 });
    const button = page.locator('#hp-chat-float');
    const idleBackground = await button.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(alphaOf(idleBackground)).toBeLessThan(1);

    const start = await button.boundingBox();
    if (!start) throw new Error('Chat-Float hat keine Bounding-Box.');
    await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
    await page.mouse.down();
    await page.mouse.move(start.x + start.width / 2 - 80, start.y + start.height / 2 - 90, { steps: 6 });
    await page.mouse.up();

    const moved = await button.boundingBox();
    if (!moved) throw new Error('Verschobener Chat-Float hat keine Bounding-Box.');
    expect(moved.x).toBeLessThan(start.x);
    expect(moved.y).toBeLessThan(start.y);
    await expect(page.locator('#hp-chat-ov')).toBeHidden();

    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
    expect(Math.abs(saved.left - moved.x)).toBeLessThan(1);
    expect(Math.abs(saved.top - moved.y)).toBeLessThan(1);

    await page.reload();
    const restored = await button.boundingBox();
    if (!restored) throw new Error('Wiederhergestellter Chat-Float hat keine Bounding-Box.');
    expect(Math.abs(restored.x - moved.x)).toBeLessThan(1);
    expect(Math.abs(restored.y - moved.y)).toBeLessThan(1);

    await page.setViewportSize({ width: 320, height: 480 });
    const bounded = await button.boundingBox();
    if (!bounded) throw new Error('Begrenzter Chat-Float hat keine Bounding-Box.');
    expect(bounded.x).toBeGreaterThanOrEqual(0);
    expect(bounded.y).toBeGreaterThanOrEqual(0);
    expect(bounded.x + bounded.width).toBeLessThanOrEqual(320);
    expect(bounded.y + bounded.height).toBeLessThanOrEqual(480);
    const savedBounded = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
    expect(Math.abs(savedBounded.left - bounded.x)).toBeLessThan(1);
    expect(Math.abs(savedBounded.top - bounded.y)).toBeLessThan(1);
  });

  test('TC-KMF-02: Touch-Pointer kann den Float verschieben', async ({ page }) => {
    await laden(page, { width: 375, height: 667 });
    const before = await page.locator('#hp-chat-float').boundingBox();
    if (!before) throw new Error('Chat-Float hat keine Bounding-Box.');
    await page.evaluate(({ x, y }) => {
      const button = document.getElementById('hp-chat-float');
      if (!button) throw new Error('Chat-Float fehlt.');
      button.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true,
        button: 0, clientX: x, clientY: y,
      }));
      document.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true,
        button: 0, clientX: x - 40, clientY: y - 50,
      }));
      document.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true,
        button: 0, clientX: x - 40, clientY: y - 50,
      }));
    }, { x: before.x + before.width / 2, y: before.y + before.height / 2 });
    const after = await page.locator('#hp-chat-float').boundingBox();
    if (!after) throw new Error('Per Touch verschobener Chat-Float hat keine Bounding-Box.');
    expect(after.x).toBe(before.x - 40);
    expect(after.y).toBe(before.y - 50);
    await expect(page.locator('#hp-chat-ov')).toBeHidden();
  });

  test('TC-KMF-01: 768 px bleibt im mobilen Verhalten', async ({ page }) => {
    await laden(page, { width: 768, height: 1024 });
    const button = page.locator('#hp-chat-float');
    const idleBackground = await button.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(alphaOf(idleBackground)).toBeLessThan(1);
    await expect(button).toHaveAttribute('aria-describedby', 'hp-chat-float-hinweis');
  });

  test('TC-KMF-04: Alt+Umschalt+Pfeiltasten verschieben, Tap öffnet den Chat', async ({ page }) => {
    await laden(page, { width: 375, height: 667 });
    const button = page.locator('#hp-chat-float');
    await button.focus();
    await expect.poll(async () => {
      const color = await button.evaluate((el) => getComputedStyle(el).backgroundColor);
      return alphaOf(color);
    }).toBe(1);
    const before = await button.boundingBox();
    if (!before) throw new Error('Chat-Float hat keine Bounding-Box.');
    await page.keyboard.press('Alt+Shift+ArrowLeft');
    const after = await button.boundingBox();
    if (!after) throw new Error('Per Tastatur verschobener Chat-Float hat keine Bounding-Box.');
    expect(after.x).toBe(before.x - 48);
    await expect(page.locator('#hp-chat-float-hinweis')).toContainText('Alt, Umschalt und Pfeiltasten');
    await expect(page.locator('#hp-chat-ov')).toBeHidden();

    await button.click();
    await expect(page.locator('#hp-chat-ov')).toBeVisible();
  });

  test('TC-KMF-06: Bei gesperrtem localStorage bleibt der Float nutzbar', async ({ page }) => {
    const warnungen = [];
    page.on('console', (msg) => {
      if (msg.type() === 'warning' && msg.text().includes('Position des Chat-Buttons')) warnungen.push(msg.text());
    });
    await laden(page, { width: 375, height: 667 }, true);
    const button = page.locator('#hp-chat-float');
    await button.focus();
    await page.keyboard.press('Alt+Shift+ArrowLeft');
    expect(warnungen.length).toBeGreaterThan(0);
    await button.click();
    await expect(page.locator('#hp-chat-ov')).toBeVisible();
  });
});

test('TC-KMF-05: Desktop-Position, Opacity und Klickverhalten bleiben erhalten', async ({ page }) => {
  await laden(page, { width: 1280, height: 800 });
  const button = page.locator('#hp-chat-float');
  const before = await button.boundingBox();
  if (!before) throw new Error('Chat-Float hat keine Bounding-Box.');
  expect(Number(await button.evaluate((el) => getComputedStyle(el).opacity))).toBe(1);

  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 - 70, before.y + before.height / 2 - 60, { steps: 5 });
  await page.mouse.up();

  const after = await button.boundingBox();
  if (!after) throw new Error('Chat-Float nach Desktop-Klick hat keine Bounding-Box.');
  expect(after.x).toBe(before.x);
  expect(after.y).toBe(before.y);
  await button.click();
  await expect(page.locator('#hp-chat-ov')).toBeVisible();
});
