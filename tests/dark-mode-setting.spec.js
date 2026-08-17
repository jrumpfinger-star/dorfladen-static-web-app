// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/**
 * Dark-Mode-Freigabe (CMS-Einstellung) — E2E
 * Spec:  specs/dark-mode-setting/spec.md
 * Plan:  specs/dark-mode-setting/plan.md
 *
 * Strategie: Das lokale (neue) theme.js wird via page.route auf '/js/theme.js'
 * eingeschleust, damit die Logik getestet wird, ohne vorher zu deployen.
 * '/api/cms-config' wird gemockt, um die Freigabe deterministisch zu setzen.
 * Läuft über die 3 Viewport-Projekte (mobile/ipad-mini/desktop) → Konstitution §7.
 */

const BASE = process.env.BASE_URL || process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const THEME_JS = fs.readFileSync(path.join(__dirname, '..', 'static-site', 'js', 'theme.js'), 'utf8');
const CMS_HTML = fs.readFileSync(path.join(__dirname, '..', 'static-site', 'cms.html'), 'utf8');

// PWA-Service-Worker blockieren, damit gecachte Assets (altes theme.js) die
// Route-Interception nicht umgehen.
test.use({ serviceWorkers: 'block' });

async function serveLocalTheme(page) {
  await page.route('**/js/theme.js', route => route.fulfill({
    status: 200, contentType: 'application/javascript; charset=utf-8', body: THEME_JS,
  }));
}
async function mockConfig(page, darkMode) {
  await page.route('**/api/cms-config**', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { feature_flags: { dark_mode: darkMode } } }),
  }));
}
function themeOf(page) {
  return page.evaluate(() => document.documentElement.getAttribute('data-theme'));
}
async function themeAfterSync(page) {
  await page.waitForTimeout(1000); // Mindest-Settle für den async Config-Abgleich
  let last = await themeOf(page), stable = 1;
  for (let i = 0; i < 15 && stable < 3; i++) { // bis Wert 3× stabil (~600ms) oder ~4s
    await page.waitForTimeout(200);
    const t = await themeOf(page);
    stable = (t === last) ? stable + 1 : 1;
    last = t;
  }
  return last;
}

// ───────────────────────── F1: CMS-Schalter ─────────────────────────
test.describe('F1 – CMS-Schalter „Dark Mode erlauben"', () => {
  // CMS erfordert Login → DOM-Präsenz prüfen (Repo-Konvention). Der Lese-/
  // Schreib-Contract (feature_flags.dark_mode) wird durch F2–F4 mitverifiziert;
  // ein authentifizierter End-to-End-Speichertest erfolgt als Smoke-Test (T031).
  test('TC-F1-01 #feat-darkmode Checkbox ist im CMS-DOM vorhanden', async ({ page }) => {
    await page.route('**/cms.html', route => route.fulfill({
      status: 200, contentType: 'text/html; charset=utf-8', body: CMS_HTML,
    }));
    await page.goto(BASE + '/cms.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const el = page.locator('#feat-darkmode');
    await expect(el).toBeAttached();
    expect(await el.getAttribute('type')).toBe('checkbox');
  });
});

// ───────────────────────── F2: Freigabe respektiert ─────────────────────────
test.describe('F2 – Seiten respektieren die Freigabe', () => {
  test('TC-F2-01 nicht erlaubt → hell trotz System=dunkel', async ({ page }) => {
    await serveLocalTheme(page); await mockConfig(page, false);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    expect(await themeAfterSync(page)).toBe('light');
  });

  test('TC-F2-02 nicht erlaubt ignoriert dl-theme (bleibt erhalten)', async ({ page }) => {
    await serveLocalTheme(page); await mockConfig(page, false);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.addInitScript(() => { try { localStorage.setItem('dl-theme', 'dark'); } catch (e) {} });
    await page.goto(BASE + '/konzept', { waitUntil: 'domcontentloaded' });
    expect(await themeAfterSync(page)).toBe('light');
    expect(await page.evaluate(() => localStorage.getItem('dl-theme'))).toBe('dark');
  });

  test('TC-F2-03 erlaubt folgt System (dunkel → dunkel)', async ({ page }) => {
    await serveLocalTheme(page); await mockConfig(page, true);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    expect(await themeAfterSync(page)).toBe('dark');
  });

  test('TC-F2-04 gilt auch für Admin-Seiten', async ({ page }) => {
    await serveLocalTheme(page); await mockConfig(page, false);
    await page.emulateMedia({ colorScheme: 'dark' });
    for (const p of ['/cms.html', '/kiosk.html', '/shop-admin.html']) {
      await page.goto(BASE + p, { waitUntil: 'domcontentloaded' });
      expect(await themeAfterSync(page)).toBe('light');
    }
  });

  test('TC-F2-05 hell auf Info-Seiten (Viewport über Projekt)', async ({ page }) => {
    await serveLocalTheme(page); await mockConfig(page, false);
    await page.emulateMedia({ colorScheme: 'dark' });
    for (const p of ['/', '/sortiment', '/oeffnungszeiten']) {
      await page.goto(BASE + p, { waitUntil: 'domcontentloaded' });
      expect(await themeAfterSync(page)).toBe('light');
    }
  });
});

// ───────────────────────── F3: kein manueller Umschalter ─────────────────────────
test.describe('F3 – kein manueller Umschalter (strikt System)', () => {
  test('TC-F3-01 kein #dl-theme-toggle', async ({ page }) => {
    await serveLocalTheme(page); await mockConfig(page, true);
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    expect(await page.$('#dl-theme-toggle')).toBeNull();
  });

  test('TC-F3-02 Live-Reaktion auf System-Wechsel bei erlaubt', async ({ page }) => {
    await serveLocalTheme(page); await mockConfig(page, true);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    expect(await themeOf(page)).toBe('light');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(400);
    expect(await themeOf(page)).toBe('dark');
  });

  test('TC-F3-03 keine Reaktion bei nicht erlaubt', async ({ page }) => {
    await serveLocalTheme(page); await mockConfig(page, false);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(400);
    expect(await themeOf(page)).toBe('light');
  });
});

// ───────────────────────── F4: flackerfrei & Fallback ─────────────────────────
test.describe('F4 – flackerfrei & robustes Fallback', () => {
  test('TC-F4-01 Cache=1 → dunkel (System dunkel)', async ({ page }) => {
    await serveLocalTheme(page); await mockConfig(page, true);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.addInitScript(() => { try { localStorage.setItem('dl-dark-allowed', '1'); } catch (e) {} });
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    expect(await themeOf(page)).toBe('dark');
  });

  test('TC-F4-02 API-Fehler → Fallback System (dunkel)', async ({ page }) => {
    await serveLocalTheme(page);
    await page.route('**/api/cms-config**', route => route.abort());
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    expect(await themeAfterSync(page)).toBe('dark');
  });

  test('TC-F4-03 nicht erlaubt + leerer Cache → stabil hell', async ({ page }) => {
    await serveLocalTheme(page); await mockConfig(page, false);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1300);
    const a = await themeOf(page);
    await page.waitForTimeout(600);
    const b = await themeOf(page);
    expect(a).toBe('light');
    expect(b).toBe('light');
  });
});
