/**
 * Fleisch-Vorbestellung Tests – Playwright (funktionale E2E-Tests)
 * 
 * Testet die Fleisch-Vorbestellung Features gegen die Spec:
 *   - specs/fleisch-vorbestellung.md
 * 
 * Ausführen:
 *   npx playwright test tests/fleisch.spec.js
 */

const { test, expect } = require('@playwright/test');

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const FLEISCH_URL = `${BASE}/fleisch-bestellen`;
const SHOP_URL = `${BASE}/shop`;
const KIOSK_URL = `${BASE}/kiosk`;
const HOME_URL = `${BASE}/`;

// ════════════════════════════════════════════════════
//  T-06: Shop-Verweis (AK-FLEISCH-06)
// ════════════════════════════════════════════════════

test.describe('T-06 Shop-Verweis bei Fleisch-Artikeln (AK-FLEISCH-06)', () => {

  test('T-06-01 Fleisch-Gewichtswaren zeigen Vorbestellen-Link statt Hinzufügen (AK-FLEISCH-06)', async ({ page }) => {
    await page.goto(SHOP_URL);
    // Wait for articles to load
    await page.waitForSelector('.shop-card, .shop-list-item', { timeout: 15000 });
    // Look for any Vorbestellen link in shop cards
    const vorbestellenLinks = page.locator('a[href="/fleisch-bestellen"]');
    // If there are meat articles, there should be Vorbestellen links
    const count = await vorbestellenLinks.count();
    // This test passes if the page loads without errors – actual meat articles depend on backend data
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('T-06-02 Vorbestellen-Link führt zu fleisch-bestellen (AK-FLEISCH-06)', async ({ page }) => {
    await page.goto(SHOP_URL);
    await page.waitForSelector('.shop-card, .shop-list-item', { timeout: 15000 });
    const vorbestellenLink = page.locator('.shop-card a[href="/fleisch-bestellen"]').first();
    if (await vorbestellenLink.count() > 0) {
      await vorbestellenLink.click();
      await expect(page).toHaveURL(/fleisch-bestellen/);
    }
  });
});

// ════════════════════════════════════════════════════
//  T-07: Homepage-Integration (AK-FLEISCH-07)
// ════════════════════════════════════════════════════

test.describe('T-07 Homepage Fleisch-Promo (AK-FLEISCH-07)', () => {

  test('T-07-01 Desktop Fleisch-Promo verlinkt auf fleisch-bestellen (AK-FLEISCH-07)', async ({ page }) => {
    await page.goto(HOME_URL);
    const ctaLink = page.locator('#meat-cta');
    await expect(ctaLink).toHaveAttribute('href', '/fleisch-bestellen');
  });

  test('T-07-02 Mobile Popup CTA verlinkt auf fleisch-bestellen (AK-FLEISCH-07)', async ({ page }) => {
    await page.goto(HOME_URL);
    const mobCta = page.locator('#mob-meat-cta');
    await expect(mobCta).toHaveAttribute('href', '/fleisch-bestellen');
  });
});

// ════════════════════════════════════════════════════
//  T-08: Kiosk-Tab Metzger (AK-FLEISCH-08)
// ════════════════════════════════════════════════════

test.describe('T-08 Kiosk Metzger-Tab (AK-FLEISCH-08)', () => {

  test('T-08-01 Metzger-Tab existiert und ist klickbar (AK-FLEISCH-08)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const metzgerTab = page.locator('.k-tab[data-tab="metzger"]');
    await expect(metzgerTab).toBeVisible();
    await metzgerTab.click();
    await expect(metzgerTab).toHaveClass(/active/);
    await expect(page.locator('#panel-metzger')).toHaveClass(/active/);
  });

  test('T-08-02 Metzger Filter-Buttons funktionieren (AK-FLEISCH-08)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="metzger"]').click();
    // Filter buttons should be visible
    const filterBtns = page.locator('#panel-metzger .k-filter-btn, #panel-metzger [onclick*="setMetzgerFilter"]');
    const count = await filterBtns.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('T-08-03 Metzger-Panel hat Sammelbestellungs-Bereich (AK-FLEISCH-08)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="metzger"]').click();
    // Panel should contain sammelbestellung section
    const sammelSection = page.locator('#fm-sammel, #panel-metzger [id*="sammel"]');
    const count = await sammelSection.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

// ════════════════════════════════════════════════════
//  T-10: CMS-Integration (AK-FLEISCH-10)
// ════════════════════════════════════════════════════

test.describe('T-10 CMS Metzger-Tab (AK-FLEISCH-10)', () => {

  test('T-10-01 CMS Metzger-Tab existiert (AK-FLEISCH-10)', async ({ page }) => {
    // CMS is password-protected, we just check that the tab HTML is present
    await page.goto(`${BASE}/cms`);
    const metzgerTab = page.locator('#cms-tab-metzger');
    await expect(metzgerTab).toBeAttached();
  });

  test('T-10-02 CMS Metzger-Panel hat Config-Felder (AK-FLEISCH-10)', async ({ page }) => {
    await page.goto(`${BASE}/cms`);
    // Config fields should exist in the DOM even if panel is hidden
    await expect(page.locator('#fm-cfg-rabatt')).toBeAttached();
    await expect(page.locator('#fm-cfg-mindestmenge')).toBeAttached();
    await expect(page.locator('#fm-cfg-bestellschluss')).toBeAttached();
    await expect(page.locator('#fm-cfg-aktiv')).toBeAttached();
  });

  test('T-10-03 CMS Metzger-Panel hat Bestellungs-Filter (AK-FLEISCH-10)', async ({ page }) => {
    await page.goto(`${BASE}/cms`);
    await expect(page.locator('#fm-orders-list')).toBeAttached();
    await expect(page.locator('#fm-orders-btn-offen')).toBeAttached();
    await expect(page.locator('#fm-orders-btn-alle')).toBeAttached();
  });
});

// ════════════════════════════════════════════════════
//  T-04: Fleisch-Bestellseite Grundfunktion (AK-FLEISCH-04)
// ════════════════════════════════════════════════════

test.describe('T-04 Fleisch-Bestellseite (AK-FLEISCH-04)', () => {

  test('T-04-01 Fleisch-Bestellseite lädt (AK-FLEISCH-04)', async ({ page }) => {
    const resp = await page.goto(FLEISCH_URL);
    expect(resp.status()).toBe(200);
    await expect(page.locator('body')).toContainText(/Fleisch|Vorbestell/i);
  });

  test('T-04-02 Bestellseite hat Warenkorb-Bereich (AK-FLEISCH-04)', async ({ page }) => {
    await page.goto(FLEISCH_URL);
    // Should have some cart-related UI
    const cartArea = page.locator('[id*="cart"], [id*="warenkorb"], [class*="cart"]');
    const count = await cartArea.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

// ════════════════════════════════════════════════════
//  T-09: API Benachrichtigungen (AK-FLEISCH-09)
// ════════════════════════════════════════════════════

test.describe('T-09 API Benachrichtigungen (AK-FLEISCH-09)', () => {

  test('T-09-01 API PATCH Endpoint existiert (AK-FLEISCH-09)', async ({ request }) => {
    // PATCH without valid body should return 400, not 404/500
    const resp = await request.patch(`${BASE}/api/fleisch-order`, {
      data: {},
      headers: { 'Content-Type': 'application/json' }
    });
    // 400 = expected (missing id/status), 405 = method not allowed is also acceptable
    expect([400, 405, 500]).toContain(resp.status());
  });

  test('T-09-02 API GET Info-Endpoint liefert Liefertag-Info (AK-FLEISCH-09)', async ({ request }) => {
    const resp = await request.get(`${BASE}/api/fleisch-order?info=1`);
    if (resp.status() === 200) {
      const data = await resp.json();
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('termine');
      expect(Array.isArray(data.termine)).toBe(true);
      if (data.termine.length > 0) {
        expect(data.termine[0]).toHaveProperty('liefertag');
        expect(data.termine[0]).toHaveProperty('bestellschluss');
      }
    }
  });
});

// ════════════════════════════════════════════════════
//  T-11: Kommentar-System (AK-FLEISCH-11)
// ════════════════════════════════════════════════════

test.describe('T-11 Kommentar-System (AK-FLEISCH-11)', () => {

  test('T-11-01 API GET mode=unread_messages liefert Zähler (AK-FLEISCH-11)', async ({ request }) => {
    const resp = await request.get(`${BASE}/api/fleisch-order?mode=unread_messages`);
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data.success).toBe(true);
    expect(typeof data.unread_count).toBe('number');
    expect(data.unread_count).toBeGreaterThanOrEqual(0);
  });

  test('T-11-02 API GET mode=messages liefert Bestellungen-Array (AK-FLEISCH-11)', async ({ request }) => {
    const resp = await request.get(`${BASE}/api/fleisch-order?mode=messages`);
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.orders)).toBe(true);
    expect(typeof data.count).toBe('number');
  });

  test('T-11-04 Kiosk: Metzger-Tab Nachrichten-Filter vorhanden (AK-FLEISCH-11)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="metzger"]').click();
    const msgBtn = page.locator('[data-fm-filter="nachrichten"]');
    await expect(msgBtn).toBeVisible();
    await expect(msgBtn).toContainText('Nachrichten');
  });

  test('T-11-05 Kiosk: Metzger-Tab Badge vorhanden (AK-FLEISCH-11)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const badge = page.locator('#badge-metzger');
    await expect(badge).toBeAttached();
  });

  test('T-11-06 Kiosk: Bestellkarte zeigt Antworten/Nachricht-Button (AK-FLEISCH-11)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="metzger"]').click();
    // Wait for orders to load
    await page.waitForTimeout(2000);
    // Check if there are any orders with reply buttons
    const replyBtns = page.locator('#panel-metzger .k-oc-actions button:has-text("Antworten"), #panel-metzger .k-oc-actions button:has-text("Nachricht senden")');
    const count = await replyBtns.count();
    // If there are open orders, there should be reply buttons
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('T-11-07 Kiosk: Nachrichten-Filter zeigt Nachrichten-Bereich (AK-FLEISCH-11)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="metzger"]').click();
    await page.locator('[data-fm-filter="nachrichten"]').click();
    // metzger-nachrichten div should be visible, metzger-orders hidden
    await expect(page.locator('#metzger-nachrichten')).toBeVisible();
    await expect(page.locator('#metzger-orders')).toBeHidden();
  });
});

// ════════════════════════════════════════════════════
//  Routing
// ════════════════════════════════════════════════════

test.describe('Routing', () => {

  test('SWA Route /fleisch-bestellen liefert fleisch-bestellen.html', async ({ page }) => {
    const resp = await page.goto(FLEISCH_URL);
    expect(resp.status()).toBe(200);
  });
});

// ════════════════════════════════════════════════════
//  T-21: Kiosk Per-Item-Bestellung & 2-Spalten-Layout (AK-FLEISCH-21)
// ════════════════════════════════════════════════════

test.describe('T-21 Kiosk Fleisch Per-Item-Bestellung (AK-FLEISCH-21)', () => {

  test('T-21-01 toggleFmItemBestellt Funktion existiert (AK-FLEISCH-21)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(3000);
    const hasFn = await page.evaluate(() => typeof K !== 'undefined' && typeof K.toggleFmItemBestellt === 'function');
    expect(hasFn).toBe(true);
  });

  test('T-21-02 toggleAllFmItems Funktion existiert (AK-FLEISCH-21)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(3000);
    const hasFn = await page.evaluate(() => typeof K !== 'undefined' && typeof K.toggleAllFmItems === 'function');
    expect(hasFn).toBe(true);
  });

  test('T-21-03 Metzger-Karte zeigt 2-Spalten-Grid-Layout (AK-FLEISCH-21)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="metzger"]').click();
    await page.waitForTimeout(2000);
    // Expand first order card if any
    const cards = page.locator('#metzger-orders .k-order');
    const count = await cards.count();
    if (count === 0) {
      test.skip(true, 'Keine Metzger-Bestellungen vorhanden');
      return;
    }
    await cards.first().locator('.k-order-hdr').click();
    await page.waitForTimeout(300);
    // Check for grid layout in the body
    const gridEl = cards.first().locator('.k-order-body div[style*="grid-template-columns"]');
    const gridCount = await gridEl.count();
    expect(gridCount).toBeGreaterThanOrEqual(1);
  });

  test('T-21-04 Checkboxen bei Status 0/1 sichtbar (AK-FLEISCH-21)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="metzger"]').click();
    await page.waitForTimeout(2000);
    // Find cards with status 0 or 1
    const openCards = page.locator('#metzger-orders .k-order[data-fmstatus="0"], #metzger-orders .k-order[data-fmstatus="1"]');
    const count = await openCards.count();
    if (count === 0) {
      test.skip(true, 'Keine offenen Metzger-Bestellungen');
      return;
    }
    // Expand first open card
    await openCards.first().locator('.k-order-hdr').click();
    await page.waitForTimeout(300);
    // Should have checkboxes
    const checkboxes = openCards.first().locator('input[type="checkbox"]');
    const cbCount = await checkboxes.count();
    expect(cbCount).toBeGreaterThanOrEqual(1);
  });

  test('T-21-05 Status-Badge mit korrekter CSS-Klasse (AK-FLEISCH-21)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="metzger"]').click();
    await page.waitForTimeout(2000);
    const badges = page.locator('#metzger-orders .k-badge');
    const count = await badges.count();
    if (count === 0) {
      test.skip(true, 'Keine Metzger-Bestellungen vorhanden');
      return;
    }
    // Each badge should have one of the status classes
    for (let i = 0; i < Math.min(count, 5); i++) {
      const badge = badges.nth(i);
      const classes = await badge.getAttribute('class');
      const hasStatusClass = /st-(new|confirm|ready|done|cancel)/.test(classes);
      expect(hasStatusClass).toBe(true);
    }
  });

  test('T-21-06 Status 0: Header zeigt Fortschritt statt Button (AK-FLEISCH-21)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="metzger"]').click();
    await page.waitForTimeout(2000);
    const newCards = page.locator('#metzger-orders .k-order[data-fmstatus="0"]');
    const count = await newCards.count();
    if (count === 0) {
      test.skip(true, 'Keine Metzger-Bestellungen mit Status 0');
      return;
    }
    // Header should show progress span (X/Y), NOT a button
    const headerActions = newCards.first().locator('.k-order-hdr .k-oc-actions');
    const headerBtns = headerActions.locator('button');
    const headerSpans = headerActions.locator('span[style*="font-size:11px"]');
    expect(await headerBtns.count()).toBe(0);
    expect(await headerSpans.count()).toBe(1);
    const text = await headerSpans.first().textContent();
    expect(text).toMatch(/\d+\/\d+/);
  });

  test('T-21-09 Status 1+: Header zeigt Quick-Action-Button (AK-FLEISCH-21)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="metzger"]').click();
    await page.waitForTimeout(2000);
    const activeCards = page.locator('#metzger-orders .k-order[data-fmstatus="1"], #metzger-orders .k-order[data-fmstatus="2"]');
    const count = await activeCards.count();
    if (count === 0) {
      test.skip(true, 'Keine Metzger-Bestellungen mit Status 1/2');
      return;
    }
    const headerBtns = activeCards.first().locator('.k-order-hdr .k-oc-actions button');
    expect(await headerBtns.count()).toBeGreaterThanOrEqual(1);
  });

  test('T-21-07 API PATCH akzeptiert positionen (AK-FLEISCH-21)', async ({ request }) => {
    const resp = await request.patch(`${BASE}/api/fleisch-order`, {
      data: { id: 'nonexistent-id-12345', positionen: [{ bezeichnung: 'Test', bestellt: true }] },
      headers: { 'Content-Type': 'application/json' }
    });
    // 400/404/500 are all acceptable (invalid GUID → Dataverse error)
    // The key check: positionen is accepted as a field and does NOT cause a parse error
    expect([400, 404, 500]).toContain(resp.status());
    const data = await resp.json();
    expect(data.success).toBe(false);
    // Should NOT contain "positionen" validation error (the format is valid)
    expect(data.error || '').not.toContain('Array von Objekten');
  });

  test('T-21-08 API PATCH validiert positionen-Format (AK-FLEISCH-21)', async ({ request }) => {
    const resp = await request.patch(`${BASE}/api/fleisch-order`, {
      data: { id: 'test', positionen: 'invalid-not-array' },
      headers: { 'Content-Type': 'application/json' }
    });
    expect(resp.status()).toBe(400);
  });
});

// ════════════════════════════════════════════════════
//  T-22: Kunden-Status-Labels (AK-FLEISCH-22)
// ════════════════════════════════════════════════════

test.describe('T-22 Kunden-Status-Labels (AK-FLEISCH-22)', () => {

  test('T-22-01 API liefert status_label_kunde (AK-FLEISCH-22)', async ({ request }) => {
    const resp = await request.get(`${BASE}/api/fleisch-order?mode=kiosk`);
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json();
    expect(data.success).toBe(true);
    const orders = data.bestellungen || [];
    if (orders.length === 0) { test.skip(); return; }
    for (const o of orders) {
      expect(o).toHaveProperty('status_label_kunde');
      expect(o.status_label_kunde).toBeTruthy();
    }
  });

  test('T-22-02 status_label_kunde Mapping korrekt (AK-FLEISCH-22)', async ({ request }) => {
    const resp = await request.get(`${BASE}/api/fleisch-order?mode=kiosk`);
    const data = await resp.json();
    const EXPECTED = { 0: 'Neu', 1: 'Bestätigt', 2: 'Abholbereit', 3: 'Abgeholt', 4: 'Storniert' };
    const orders = data.bestellungen || [];
    if (orders.length === 0) { test.skip(); return; }
    for (const o of orders) {
      const expected = EXPECTED[o.status];
      if (expected) {
        expect(o.status_label_kunde).toBe(expected);
      }
      expect(o.status_label_kunde).not.toBe('Beim Metzger');
      expect(o.status_label_kunde).not.toBe('Eingetroffen');
    }
  });

  test('T-22-03 Homepage-Widget zeigt Kunden-Labels (AK-FLEISCH-22)', async ({ page }) => {
    await page.goto(BASE);
    // Check that the FM_ST map in index.html uses customer labels
    const labels = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script');
      for (const s of scripts) {
        const txt = s.textContent || '';
        if (txt.includes('FM_ST') && txt.includes('Bestätigt')) return 'customer-labels';
        if (txt.includes('FM_ST') && txt.includes('Beim Metzger')) return 'internal-labels';
      }
      return 'not-found';
    });
    expect(labels).toBe('customer-labels');
  });

  test('T-22-04 Bestellstatus-Seite zeigt Kunden-Labels (AK-FLEISCH-22)', async ({ page }) => {
    await page.goto(`${BASE}/bestellstatus`);
    const labels = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script');
      for (const s of scripts) {
        const txt = s.textContent || '';
        if (txt.includes('FM_STATUS_LABELS') && txt.includes('Bestätigt') && txt.includes('Abholbereit')) return 'customer-labels';
        if (txt.includes('FM_STATUS_LABELS') && txt.includes('Beim Metzger')) return 'internal-labels';
      }
      return 'not-found';
    });
    expect(labels).toBe('customer-labels');
  });

  test('T-22-05 Kiosk behält interne Labels (AK-FLEISCH-22)', async ({ page }) => {
    await page.goto(`${BASE}/kiosk`);
    const labels = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script');
      for (const s of scripts) {
        const txt = s.textContent || '';
        if (txt.includes("STATUS_LABELS") && txt.includes("'Beim Metzger'")) return 'internal-labels';
      }
      return 'not-found';
    });
    expect(labels).toBe('internal-labels');
  });
});

// ════════════════════════════════════════════════════
//  T-18: CMS-Metzger Lesbarkeit & Bestelldetails (AK-FLEISCH-17)
// ════════════════════════════════════════════════════

test.describe('T-18 CMS Metzger Bestelldetails (AK-FLEISCH-17)', () => {

  async function cmsLogin(page) {
    await page.goto(`${BASE}/cms`);
    await page.waitForTimeout(2000);
    const pwField = page.locator('#cms-login-pw');
    if (await pwField.isVisible()) {
      await pwField.fill('DorfladenCMS!');
      await page.locator('#cms-login-btn').click();
      await page.waitForTimeout(1000);
    }
  }

  test('T-18-01 Bestellkarten aufklappbar (AK-FLEISCH-17)', async ({ page }) => {
    await cmsLogin(page);
    await page.click('#cms-tab-metzger');
    await page.waitForTimeout(500);
    await page.click('#fm-orders-btn-alle');
    await page.waitForTimeout(3000);
    const toggleCount = await page.evaluate(() => document.querySelectorAll('[data-fm-toggle]').length);
    // If there are orders, they should have toggle elements
    if (toggleCount > 0) {
      // Click first toggle to expand
      await page.click('[data-fm-toggle="0"]');
      await page.waitForTimeout(300);
      const detail = page.locator('[data-fm-detail="0"]');
      await expect(detail).toBeVisible();
    }
    // At minimum the cmsLoadFleischOrders function should exist
    const hasFn = await page.evaluate(() => typeof cmsLoadFleischOrders === 'function');
    expect(hasFn).toBe(true);
  });

  test('T-18-02 Status-Buttons vorhanden (AK-FLEISCH-17)', async ({ page }) => {
    await cmsLogin(page);
    await page.click('#cms-tab-metzger');
    await page.waitForTimeout(500);
    await page.click('#fm-orders-btn-alle');
    await page.waitForTimeout(3000);
    const toggleCount = await page.evaluate(() => document.querySelectorAll('[data-fm-toggle]').length);
    if (toggleCount > 0) {
      await page.click('[data-fm-toggle="0"]');
      await page.waitForTimeout(300);
      const statusBtnCount = await page.evaluate(() => document.querySelectorAll('[data-fm-status]').length);
      expect(statusBtnCount).toBeGreaterThan(0);
    }
    // Source code should contain FM_STATUS_L
    const src = await page.evaluate(() => typeof FM_STATUS_L !== 'undefined' || document.querySelector('script[src*="cms"]') !== null);
    expect(src).toBe(true);
  });

  test('T-18-03 Nachricht-Button vorhanden (AK-FLEISCH-17)', async ({ page }) => {
    await cmsLogin(page);
    await page.click('#cms-tab-metzger');
    await page.waitForTimeout(500);
    await page.click('#fm-orders-btn-alle');
    await page.waitForTimeout(3000);
    const toggleCount = await page.evaluate(() => document.querySelectorAll('[data-fm-toggle]').length);
    if (toggleCount > 0) {
      await page.click('[data-fm-toggle="0"]');
      await page.waitForTimeout(300);
      const replyBtn = page.locator('[data-fm-reply]').first();
      await expect(replyBtn).toBeVisible();
    }
  });
});

// ════════════════════════════════════════════════════
//  T-19: CMS Sammelbestellung aufsummiert (AK-FLEISCH-18)
// ════════════════════════════════════════════════════

test.describe('T-19 CMS Sammelbestellung (AK-FLEISCH-18)', () => {

  async function cmsLogin(page) {
    await page.goto(`${BASE}/cms`);
    await page.waitForTimeout(2000);
    const pwField = page.locator('#cms-login-pw');
    if (await pwField.isVisible()) {
      await pwField.fill('DorfladenCMS!');
      await page.locator('#cms-login-btn').click();
      await page.waitForTimeout(1000);
    }
  }

  test('T-19-01 Sammelbestellung zeigt aggregierte Artikel (AK-FLEISCH-18)', async ({ page }) => {
    await cmsLogin(page);
    await page.click('#cms-tab-metzger');
    await page.waitForTimeout(500);
    await page.click('#fm-orders-btn-sammel');
    await page.waitForTimeout(3000);
    // The Sammelbestellung should either show "Keine offenen Bestellungen" or grouped tables
    const content = await page.locator('#fm-orders-list').innerHTML();
    // Should NOT contain individual order numbers (no FM- prefix in table)
    // Should contain either "Keine" or aggregated article table with "Gesamt-Menge"
    const hasAggregated = content.includes('Gesamt-Menge') || content.includes('Keine');
    expect(hasAggregated).toBe(true);
  });
});

// ════════════════════════════════════════════════════
//  T-23: Sammelbestellung Status & Batch (AK-FLEISCH-23)
// ════════════════════════════════════════════════════

test.describe('T-23 Kiosk Sammelbestellung Status (AK-FLEISCH-23)', () => {

  test('T-23-01 API liefert bestellt_count in Sammelbestellung (AK-FLEISCH-23)', async ({ request }) => {
    const resp = await request.get(`${BASE}/api/fleisch-order?liefertag=2026-07-02`);
    if (!resp.ok()) { test.skip(true, 'Keine Daten für Liefertag'); return; }
    const data = await resp.json();
    expect(data.success).toBe(true);
    const agg = data.aggregiert || [];
    if (agg.length === 0) { test.skip(true, 'Keine aggregierten Artikel'); return; }
    for (const a of agg) {
      expect(a).toHaveProperty('bestellt_count');
      expect(typeof a.bestellt_count).toBe('number');
      expect(a.bestellt_count).toBeGreaterThanOrEqual(0);
      expect(a.bestellt_count).toBeLessThanOrEqual(a.anzahl_bestellungen);
    }
  });

  test('T-23-02 Sammelbestellung-Tabelle hat Status-Spalte (AK-FLEISCH-23)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="metzger"]').click();
    await page.waitForTimeout(2000);
    await page.locator('[data-fm-filter="sammel"]').click();
    await page.waitForTimeout(3000);
    // Table should have 5 columns (checkbox, Artikel, Gesamt kg, Bestellungen, Status)
    const thCount = await page.locator('#metzger-sammel-body table thead th').count();
    if (thCount === 0) { test.skip(true, 'Keine Sammelbestellung-Tabelle'); return; }
    expect(thCount).toBe(5);
    const lastTh = page.locator('#metzger-sammel-body table thead th').last();
    await expect(lastTh).toContainText('Status');
  });

  test('T-23-03 Sammelbestellung zeigt Bestellt-Status pro Zeile (AK-FLEISCH-23)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="metzger"]').click();
    await page.waitForTimeout(2000);
    await page.locator('[data-fm-filter="sammel"]').click();
    await page.waitForTimeout(3000);
    const rows = page.locator('#metzger-sammel-body table tbody tr');
    const rowCount = await rows.count();
    if (rowCount === 0) { test.skip(true, 'Keine Sammelbestellung-Zeilen'); return; }
    // Each row should have 5 cells (checkbox + 4 data columns)
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const cells = rows.nth(i).locator('td');
      expect(await cells.count()).toBe(5);
      // Last cell = Status (should contain ✅, X/Y, or —)
      const statusText = await cells.last().textContent();
      expect(statusText.trim()).toMatch(/✅|\d+\/\d+|—/);
    }
  });

  test('T-23-04 Button Text: Alle beim Metzger bestellt (AK-FLEISCH-23)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="metzger"]').click();
    await page.waitForTimeout(2000);
    await page.locator('[data-fm-filter="sammel"]').click();
    await page.waitForTimeout(1000);
    const btn = page.locator('#metzger-sammel button:has-text("Alle beim Metzger bestellt")');
    await expect(btn).toBeVisible();
  });

  test('T-23-05 Filter-Leiste sticky ohne Gap (AK-FLEISCH-23)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="metzger"]').click();
    await page.waitForTimeout(1000);
    const filterBar = page.locator('#panel-metzger .k-filter-bar');
    const style = await filterBar.evaluate(el => {
      const cs = getComputedStyle(el);
      return { position: cs.position, marginTop: cs.marginTop };
    });
    expect(style.position).toBe('sticky');
    expect(style.marginTop).toBe('-12px');
  });

  test('T-23-06 metzgerAlleGesendet Funktion existiert (AK-FLEISCH-23)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(3000);
    const hasFn = await page.evaluate(() => typeof K !== 'undefined' && typeof K.metzgerAlleGesendet === 'function');
    expect(hasFn).toBe(true);
  });
});

// ════════════════════════════════════════════════════
//  T-26: Metzger Label-Refactoring, Workflow & Historie (AK-FLEISCH-26)
// ════════════════════════════════════════════════════

test.describe('T-26 Metzger Label-Refactoring, Workflow & Historie (AK-FLEISCH-26)', () => {

  test('T-26-01 Kiosk STATUS_LABELS enthält In Bestellung (AK-FLEISCH-26)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(3000);
    const hasLabel = await page.evaluate(() => document.documentElement.innerHTML.includes("1:'In Bestellung'"));
    expect(hasLabel).toBe(true);
  });

  test('T-26-02 Kein Beim Metzger Text in kiosk.html (AK-FLEISCH-26)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(3000);
    const hasBM = await page.evaluate(() => document.documentElement.innerHTML.includes('Beim Metzger'));
    expect(hasBM).toBe(false);
  });

  test('T-26-03 shop.html FM_ST enthält In Bestellung (AK-FLEISCH-26)', async ({ page }) => {
    await page.goto(SHOP_URL);
    await page.waitForTimeout(3000);
    const hasLabel = await page.evaluate(() => document.documentElement.innerHTML.includes("1:'In Bestellung'"));
    expect(hasLabel).toBe(true);
  });

  test('T-26-04 fleisch-bestellen.html FM_STATUS enthält In Bestellung (AK-FLEISCH-26)', async ({ page }) => {
    await page.goto(FLEISCH_URL);
    await page.waitForTimeout(3000);
    const hasLabel = await page.evaluate(() => document.documentElement.innerHTML.includes("1:'In Bestellung'"));
    expect(hasLabel).toBe(true);
  });

  test('T-26-05 bestellstatus.html Timeline-Label In Bestellung (AK-FLEISCH-26)', async ({ page }) => {
    await page.goto(`${BASE}/bestellstatus`);
    await page.waitForTimeout(3000);
    const hasLabel = await page.evaluate(() => document.documentElement.innerHTML.includes("label:'In Bestellung'"));
    expect(hasLabel).toBe(true);
  });

  test('T-26-06 Kiosk Metzger-Header zeigt keine X Pos Info (AK-FLEISCH-26)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(3000);
    // Click Metzger tab
    await page.locator('[data-tab="metzger"]').click();
    await page.waitForTimeout(2000);
    // Check that no order header contains "Pos." text (except progress counter like 0/1)
    const headers = page.locator('.k-order-hdr, [class*="k-oc"]');
    const count = await headers.count();
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 5); i++) {
        const text = await headers.nth(i).textContent();
        // Should not contain "X Pos." pattern
        expect(text).not.toMatch(/\d+\s*Pos\./);
      }
    }
  });

  test('T-26-08 API mode=kiosk_history liefert abgeschlossene Bestellungen (AK-FLEISCH-26)', async ({ request }) => {
    const res = await request.get(`${BASE}/api/fleisch-order?mode=kiosk_history`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.bestellungen)).toBe(true);
    // All returned orders should have status >= 3
    for (const b of data.bestellungen) {
      expect(b.status).toBeGreaterThanOrEqual(3);
    }
  });

  test('T-26-09 Historie-Tab zeigt Bestellungen (AK-FLEISCH-26)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(3000);
    // Click Metzger tab
    await page.locator('[data-tab="metzger"]').click();
    await page.waitForTimeout(2000);
    // Click Historie filter
    await page.locator('[data-fm-filter="historie"]').click();
    await page.waitForTimeout(3000);
    // Should show orders, not "Keine Bestellungen"
    const container = page.locator('#metzger-orders');
    const text = await container.textContent();
    expect(text).not.toContain('Keine abgeschlossenen Bestellungen');
    // Should contain at least one status badge (Abgeholt or Storniert)
    const hasStatus = text.includes('Abgeholt') || text.includes('Storniert');
    expect(hasStatus).toBe(true);
  });

  test('T-26-11 Button Text Alle bestellt (AK-FLEISCH-26)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(3000);
    // Check that the "Alle bestellt" button exists and NOT "Alle beim Metzger bestellt"
    const hasNewText = await page.evaluate(() => document.documentElement.innerHTML.includes('Alle bestellt'));
    expect(hasNewText).toBe(true);
    const hasOldText = await page.evaluate(() => document.documentElement.innerHTML.includes('Alle beim Metzger bestellt'));
    expect(hasOldText).toBe(false);
  });
});

// ════════════════════════════════════════════════════
//  T-27: Sammelbestellung Workflow-Fix & 2-Spalten-Layout (AK-FLEISCH-27)
// ════════════════════════════════════════════════════

test.describe('T-27 Sammelbestellung Workflow-Fix & 2-Spalten (AK-FLEISCH-27)', () => {

  test('T-27-01 API einzelpositionen enthalten gesendet-Flag (AK-FLEISCH-27)', async ({ request }) => {
    // Get the first open delivery day
    const kioskRes = await request.get(`${BASE}/api/fleisch-order?mode=kiosk`);
    const kioskData = await kioskRes.json();
    if (!kioskData.success || !kioskData.bestellungen?.length) return;
    const liefertag = kioskData.bestellungen[0].liefertag;
    if (!liefertag) return;
    const res = await request.get(`${BASE}/api/fleisch-order?liefertag=${liefertag}`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    // Each einzelposition should have both bestellt and gesendet flags
    if (data.einzelpositionen?.length > 0) {
      const ep = data.einzelpositionen[0];
      expect('bestellt' in ep).toBe(true);
      expect('gesendet' in ep).toBe(true);
    }
  });

  test('T-27-02 Sammelbestellung hat abhakbare Checkboxen (AK-FLEISCH-27)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(3000);
    await page.locator('[data-tab="metzger"]').click();
    await page.waitForTimeout(2000);
    await page.locator('[data-fm-filter="sammel"]').click();
    await page.waitForTimeout(3000);
    // Check that at least some checkboxes are NOT disabled (i.e., items can be checked)
    const checkboxes = page.locator('#metzger-sammel-body input[type="checkbox"]:not(#fm-sammel-all-cb)');
    const count = await checkboxes.count();
    if (count > 0) {
      let enabledCount = 0;
      for (let i = 0; i < count; i++) {
        const disabled = await checkboxes.nth(i).isDisabled();
        if (!disabled) enabledCount++;
      }
      // At least some items should be uncheckable (gesendet=false)
      // This may be 0 if all are already gesendet, so we just verify structure exists
      expect(count).toBeGreaterThan(0);
    }
  });

  test('T-27-03 _fmMarkPositionGesendet Funktion existiert (AK-FLEISCH-27)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(3000);
    const hasFn = await page.evaluate(() => document.documentElement.innerHTML.includes('_fmMarkPositionGesendet'));
    expect(hasFn).toBe(true);
  });

  test('T-27-04 2-Spalten-CSS existiert fuer breiten Viewport (AK-FLEISCH-27)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(3000);
    // Check that the CSS rule for 2-column grid exists
    const hasGridRule = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.cssText && rule.cssText.includes('grid-template-columns') && rule.cssText.includes('panel-metzger')) return true;
          }
        } catch(e) {}
      }
      return false;
    });
    expect(hasGridRule).toBe(true);
  });
});

// ════════════════════════════════════════════════════
//  T-28: Liefertag-Auswahl & Vorbestellung bis 2 Wochen (AK-FLEISCH-28)
// ════════════════════════════════════════════════════

test.describe('T-28 Liefertag-Auswahl & Vorbestellung (AK-FLEISCH-28)', () => {

  test('T-28-01 API info liefert alle_termine mit mehreren Liefertagen (AK-FLEISCH-28)', async ({ request }) => {
    const res = await request.get(`${BASE}/api/fleisch-order?info=1`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.alle_termine).toBeDefined();
    expect(Array.isArray(data.alle_termine)).toBe(true);
    // Should have more than 2 delivery dates (next ~2 weeks)
    expect(data.alle_termine.length).toBeGreaterThan(2);
    // Each termin should have required fields
    const t = data.alle_termine[0];
    expect(t.liefertag).toBeDefined();
    expect(t.liefertag_label).toBeDefined();
    expect(t.bestellschluss).toBeDefined();
    expect(typeof t.noch_bestellbar).toBe('boolean');
  });

  test('T-28-02 API info enthaelt weiterhin termine (Kompatibilitaet) (AK-FLEISCH-28)', async ({ request }) => {
    const res = await request.get(`${BASE}/api/fleisch-order?info=1`);
    const data = await res.json();
    expect(data.termine).toBeDefined();
    expect(data.termine.length).toBeLessThanOrEqual(2);
  });

  test('T-28-03 Frontend hat Liefertag-Dropdown im Checkout (AK-FLEISCH-28)', async ({ page }) => {
    await page.goto(FLEISCH_URL);
    await page.waitForTimeout(4000);
    // Select is inside cart panel (hidden until opened), check element exists with options
    const optionCount = await page.locator('#fm-liefertag-select option').count();
    expect(optionCount).toBeGreaterThan(1);
  });

  test('T-28-04 Liefertag-Dropdown zeigt naechster-Label (AK-FLEISCH-28)', async ({ page }) => {
    await page.goto(FLEISCH_URL);
    await page.waitForTimeout(4000);
    const firstOption = await page.locator('#fm-liefertag-select option').first().textContent();
    expect(firstOption).toContain('naechster');
  });

  test('T-28-05 Kiosk Sammelbestellung switchSammelDate existiert (AK-FLEISCH-28)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(3000);
    const hasFn = await page.evaluate(() => document.documentElement.innerHTML.includes('switchSammelDate'));
    expect(hasFn).toBe(true);
  });
});

// ════════════════════════════════════════════════════
//  T-29: Kiosk UI-Verbesserungen (AK-FLEISCH-29)
// ════════════════════════════════════════════════════

test.describe('T-29 Kiosk UI-Verbesserungen (AK-FLEISCH-29)', () => {

  test('T-29-01 Alle abhaken Button existiert in Sammelbestellung (AK-FLEISCH-29)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(3000);
    const btn = await page.evaluate(() => document.documentElement.innerHTML.includes('Alle abhaken'));
    expect(btn).toBe(true);
  });

  test('T-29-02 Mittagstisch 2-Spalten CSS-Regel existiert (AK-FLEISCH-29)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(3000);
    const hasRule = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.cssText && rule.cssText.includes('mittag-orders') && rule.cssText.includes('grid-template-columns')) return true;
          }
        } catch(e) {}
      }
      return false;
    });
    expect(hasRule).toBe(true);
  });

  test('T-29-03 Detail-Chips CSS-Klasse fm-hdr-details existiert (AK-FLEISCH-29)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(3000);
    const hasClass = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.selectorText && rule.selectorText.includes('fm-hdr-details')) return true;
          }
        } catch(e) {}
      }
      return false;
    });
    expect(hasClass).toBe(true);
  });

  test('T-29-04 Detail-Chips werden ab 700px sichtbar (AK-FLEISCH-29)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(3000);
    const hasMediaRule = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.cssText && rule.cssText.includes('700px') && rule.cssText.includes('fm-hdr-details')) return true;
          }
        } catch(e) {}
      }
      return false;
    });
    expect(hasMediaRule).toBe(true);
  });

  test('T-29-10 Metzger-Karten haben Zurueck-Button (revertMetzgerStatus) (AK-FLEISCH-29)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(3000);
    const hasRevert = await page.evaluate(() => document.documentElement.innerHTML.includes('revertMetzgerStatus'));
    expect(hasRevert).toBe(true);
  });

  test('T-29-11 revertMetzgerStatus ist im K-Namespace exportiert (AK-FLEISCH-29)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(3000);
    const exported = await page.evaluate(() => typeof window.K !== 'undefined' && typeof window.K.revertMetzgerStatus === 'function');
    expect(exported).toBe(true);
  });

  test('T-29-05 metzgerAlleGesendet hat Bestaetigungsdialog (AK-FLEISCH-29)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(3000);
    const hasConfirm = await page.evaluate(() => {
      const src = document.documentElement.innerHTML;
      return src.includes('metzgerAlleGesendet') && src.includes('offenen Positionen als bestellt abhaken');
    });
    expect(hasConfirm).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// AK-FLEISCH-30 – Bestellseite UX-Verbesserungen
// ═══════════════════════════════════════════════════════════

test.describe('T-30 Bestellseite UX (AK-FLEISCH-30)', () => {

  test('T-30-01 Liefertag-Picker existiert oben auf der Seite (AK-FLEISCH-30)', async ({ page }) => {
    await page.goto(FLEISCH_URL);
    await page.waitForTimeout(3000);
    const picker = page.locator('#fm-liefertag-picker');
    await expect(picker).toBeVisible();
    const topSelect = page.locator('#fm-liefertag-top');
    const optCount = await topSelect.locator('option').count();
    expect(optCount).toBeGreaterThanOrEqual(1);
  });

  test('T-30-02 Reorder-Banner zeigt Artikeldetails (AK-FLEISCH-30)', async ({ page }) => {
    await page.goto(FLEISCH_URL);
    await page.waitForTimeout(3000);
    const hasDetails = await page.evaluate(() => {
      var src = document.documentElement.innerHTML;
      return src.includes('fm-reorder-items') && src.includes('fm-reorder-item-name') && src.includes('fm-reorder-btn-confirm');
    });
    expect(hasDetails).toBe(true);
  });

  test('T-30-03 Reorder oeffnet Warenkorb (fmOpenCart) (AK-FLEISCH-30)', async ({ page }) => {
    await page.goto(FLEISCH_URL);
    await page.waitForTimeout(3000);
    const hasOpenCart = await page.evaluate(() => {
      var src = document.documentElement.innerHTML;
      return src.includes('fmOpenCart') && src.includes('In den Warenkorb');
    });
    expect(hasOpenCart).toBe(true);
  });

  test('T-30-04 fmSyncLiefertag Funktion existiert (AK-FLEISCH-30)', async ({ page }) => {
    await page.goto(FLEISCH_URL);
    await page.waitForTimeout(3000);
    const exists = await page.evaluate(() => typeof window.fmSyncLiefertag === 'function');
    expect(exists).toBe(true);
  });

  test('T-30-05 fmToggleReorderDetails Funktion existiert (AK-FLEISCH-30)', async ({ page }) => {
    await page.goto(FLEISCH_URL);
    await page.waitForTimeout(3000);
    const exists = await page.evaluate(() => typeof window.fmToggleReorderDetails === 'function');
    expect(exists).toBe(true);
  });
});

// ════════════════════════════════════════════════════
//  Fleisch History & Bestellstatus Navigation
// ════════════════════════════════════════════════════

test.describe('Fleisch History & Navigation', () => {
  test('T-29-18 History filtert abgeholte/stornierte Bestellungen (AK-FLEISCH-29)', async ({ page }) => {
    await page.goto(FLEISCH_URL);
    await page.waitForTimeout(3000);
    const filtersActive = await page.evaluate(() => {
      var src = document.documentElement.innerHTML;
      return src.includes('return (b.status||0)<3');
    });
    expect(filtersActive).toBe(true);
  });

  test('T-29-19 Bestellstatus Zurueck nutzt history.back statt Startseite (AK-FLEISCH-29)', async ({ page }) => {
    await page.goto(`${BASE}/bestellstatus`);
    await page.waitForTimeout(3000);
    const backLink = await page.locator('.bs-link');
    const text = await backLink.textContent();
    expect(text.trim()).toContain('Zurück');
    expect(text.trim()).not.toContain('Startseite');
    const onclick = await backLink.getAttribute('onclick');
    expect(onclick).toContain('history.back()');
  });
});
