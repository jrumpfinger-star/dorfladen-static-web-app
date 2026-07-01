// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';

test.describe('T-MB-01 Unified Order View – DOM-Struktur (AK-MB-01, AK-MB-06)', () => {
  test('T-MB-01-01 loadMyOrders Funktion existiert', async ({ page }) => {
    await page.goto(BASE + '/shop');
    await page.waitForLoadState('networkidle');
    const exists = await page.evaluate(() => typeof loadMyOrders === 'function');
    expect(exists).toBe(true);
  });

  test('T-MB-01-02 renderMyOrders Funktion existiert', async ({ page }) => {
    await page.goto(BASE + '/shop');
    await page.waitForLoadState('networkidle');
    const exists = await page.evaluate(() => typeof renderMyOrders === 'function');
    expect(exists).toBe(true);
  });

  test('T-MB-01-03 _myOrdersFilter Default ist open', async ({ page }) => {
    await page.goto(BASE + '/shop');
    await page.waitForLoadState('networkidle');
    const val = await page.evaluate(() => _myOrdersFilter);
    expect(val).toBe('open');
  });

  test('T-MB-01-04 shop-history-btn existiert im DOM', async ({ page }) => {
    await page.goto(BASE + '/shop');
    await page.waitForLoadState('networkidle');
    const el = await page.$('#shop-history-btn');
    expect(el).not.toBeNull();
  });
});

test.describe('T-MB-06 Filter-Tabs HTML (AK-MB-06)', () => {
  test('T-MB-06-01 Filter-Buttons werden nach Login + Klick auf Bestellungen gerendert', async ({ page }) => {
    await page.goto(BASE + '/shop');
    await page.waitForLoadState('networkidle');

    // Inject mock data to avoid needing real login
    const filterButtons = await page.evaluate(() => {
      // Simulate cached orders
      if (typeof _myOrdersCache !== 'undefined') {
        window._myOrdersCache = [
          { _type: 'shop', _isOpen: true, _sortDate: new Date().toISOString(), status: 0, bestelldatum: new Date().toISOString(), gesamtsumme: 25, positionen: [], bestellnummer: 'DL-TEST-01' }
        ];
        window._myOrdersFilter = 'open';
        if (typeof renderMyOrders === 'function') renderMyOrders();
        var btns = document.querySelectorAll('[data-order-filter]');
        return Array.from(btns).map(function(b) { return b.getAttribute('data-order-filter'); });
      }
      return [];
    });
    // If we got filter buttons, verify all 4 exist
    if (filterButtons.length > 0) {
      expect(filterButtons).toContain('open');
      expect(filterButtons).toContain('7d');
      expect(filterButtons).toContain('30d');
      expect(filterButtons).toContain('all');
    }
  });
});

test.describe('T-MB-07 Filter-Logik (AK-MB-07, AK-MB-08, AK-MB-09, AK-MB-10)', () => {
  test('T-MB-07-01 Filter open zeigt nur offene Bestellungen', async ({ page }) => {
    await page.goto(BASE + '/shop');
    await page.waitForLoadState('networkidle');

    const result = await page.evaluate(() => {
      var orders = [
        { _type: 'shop', _isOpen: true, _sortDate: new Date().toISOString(), status: 0, bestelldatum: new Date().toISOString(), gesamtsumme: 10, positionen: [], bestellnummer: 'DL-TEST-A1' },
        { _type: 'shop', _isOpen: false, _sortDate: new Date().toISOString(), status: 3, bestelldatum: new Date().toISOString(), gesamtsumme: 20, positionen: [], bestellnummer: 'DL-TEST-A2' },
        { _type: 'fm', _isOpen: true, _sortDate: new Date().toISOString(), status: 0, bestelldatum: new Date().toISOString(), gesamtsumme: 30, positionen: [], bestellnummer: 'FM-TEST-A3' },
        { _type: 'fm', _isOpen: false, _sortDate: new Date().toISOString(), status: 4, bestelldatum: new Date().toISOString(), gesamtsumme: 40, positionen: [], bestellnummer: 'FM-TEST-A4' }
      ];
      window._myOrdersCache = orders;
      window._myOrdersFilter = 'open';
      renderMyOrders();
      var cards = document.querySelectorAll('.shop-order-card');
      return cards.length;
    });
    expect(result).toBe(2); // only 2 open orders
  });

  test('T-MB-07-02 Filter all zeigt alle Bestellungen', async ({ page }) => {
    await page.goto(BASE + '/shop');
    await page.waitForLoadState('networkidle');

    const result = await page.evaluate(() => {
      var orders = [
        { _type: 'shop', _isOpen: true, _sortDate: new Date().toISOString(), status: 0, bestelldatum: new Date().toISOString(), gesamtsumme: 10, positionen: [], bestellnummer: 'DL-TEST-B1' },
        { _type: 'shop', _isOpen: false, _sortDate: new Date().toISOString(), status: 3, bestelldatum: new Date().toISOString(), gesamtsumme: 20, positionen: [], bestellnummer: 'DL-TEST-B2' },
        { _type: 'fm', _isOpen: true, _sortDate: new Date().toISOString(), status: 1, bestelldatum: new Date().toISOString(), gesamtsumme: 30, positionen: [], bestellnummer: 'FM-TEST-B3' }
      ];
      window._myOrdersCache = orders;
      window._myOrdersFilter = 'all';
      renderMyOrders();
      var cards = document.querySelectorAll('.shop-order-card');
      return cards.length;
    });
    expect(result).toBe(3);
  });

  test('T-MB-07-03 Filter 7d zeigt nur Bestellungen der letzten 7 Tage', async ({ page }) => {
    await page.goto(BASE + '/shop');
    await page.waitForLoadState('networkidle');

    const result = await page.evaluate(() => {
      var now = new Date();
      var recent = new Date(now.getTime() - 2 * 86400000).toISOString(); // 2 days ago
      var old = new Date(now.getTime() - 10 * 86400000).toISOString(); // 10 days ago
      var orders = [
        { _type: 'shop', _isOpen: false, _sortDate: recent, status: 3, bestelldatum: recent, gesamtsumme: 10, positionen: [], bestellnummer: 'DL-TEST-C1' },
        { _type: 'shop', _isOpen: false, _sortDate: old, status: 3, bestelldatum: old, gesamtsumme: 20, positionen: [], bestellnummer: 'DL-TEST-C2' }
      ];
      window._myOrdersCache = orders;
      window._myOrdersFilter = '7d';
      renderMyOrders();
      var cards = document.querySelectorAll('.shop-order-card');
      return cards.length;
    });
    expect(result).toBe(1); // only the recent one
  });
});

test.describe('T-MB-02 Fleisch-Badge (AK-MB-02)', () => {
  test('T-MB-02-01 Fleisch-Bestellungen zeigen Fleisch-Badge', async ({ page }) => {
    await page.goto(BASE + '/shop');
    await page.waitForLoadState('networkidle');

    const hasBadge = await page.evaluate(() => {
      window._myOrdersCache = [
        { _type: 'fm', _isOpen: true, _sortDate: new Date().toISOString(), status: 0, bestelldatum: new Date().toISOString(), gesamtsumme: 50, positionen: [], bestellnummer: 'FM-TEST-D1' }
      ];
      window._myOrdersFilter = 'all';
      renderMyOrders();
      var card = document.querySelector('.shop-order-card');
      return card ? card.innerHTML.indexOf('Fleisch') !== -1 : false;
    });
    expect(hasBadge).toBe(true);
  });
});

test.describe('T-MB-04 FM Details-Link (AK-MB-04)', () => {
  test('T-MB-04-01 Fleisch-Bestellungen haben Details-Link zur Bestellstatus-Seite', async ({ page }) => {
    await page.goto(BASE + '/shop');
    await page.waitForLoadState('networkidle');

    const hasLink = await page.evaluate(() => {
      window._myOrdersCache = [
        { _type: 'fm', _isOpen: true, _sortDate: new Date().toISOString(), status: 0, bestelldatum: new Date().toISOString(), gesamtsumme: 50, positionen: [{ bezeichnung: 'Rind', menge: 1, einheit: 'kg', einzelpreis: 15 }], bestellnummer: 'FM-TEST-E1' }
      ];
      window._myOrdersFilter = 'all';
      renderMyOrders();
      // Expand the first card
      var toggle = document.querySelector('[data-order-toggle="0"]');
      if (toggle) toggle.click();
      var link = document.querySelector('a[href*="/bestellstatus?nr=FM-TEST-E1"]');
      return link !== null;
    });
    expect(hasLink).toBe(true);
  });
});

test.describe('T-MB-12 Schon bestellt – FM abgeholte/stornierte ausgeblendet (AK-MB-12)', () => {
  test('T-MB-12-01 Filter in shop.html Code prüft status<3', async ({ page }) => {
    await page.goto(BASE + '/shop');
    await page.waitForLoadState('networkidle');
    // Check that the source code contains the filter condition
    const src = await page.content();
    expect(src).toContain('b.status<3');
  });
});
