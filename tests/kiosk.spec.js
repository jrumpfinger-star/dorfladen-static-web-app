/**
 * Kiosk Tests – Playwright
 * 
 * Testet die kiosk.html Features gegen die Specs:
 *   - specs/kiosk-ui.md
 *   - specs/kiosk-packing.md
 * 
 * Voraussetzung: SWA CLI oder lokaler Server auf Port 4280
 *   npx @azure/static-web-apps-cli start static-site --api-location api
 * 
 * Ausführen:
 *   npx playwright test tests/kiosk.spec.js
 */

const { test, expect } = require('@playwright/test');

const BASE = process.env.TEST_URL || 'http://localhost:4280';
const KIOSK_URL = `${BASE}/kiosk`;

// ════════════════════════════════════════════════════
//  AK-UI: Kiosk UI Verbesserungen (specs/kiosk-ui.md)
// ════════════════════════════════════════════════════

test.describe('Kiosk UI – Tabs', () => {

  test('AK-UI-01: Tab zeigt "Online-Shop" statt "Abholungen"', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const tabTexts = await page.locator('.k-tab').allTextContents();
    const joined = tabTexts.join(' ');
    expect(joined).toContain('Online-Shop');
    expect(joined).not.toContain('Abholungen');
  });

  test('AK-UI-01b: 3 Tabs vorhanden: Mittagstisch, Online-Shop, Stammkunden', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const tabs = page.locator('.k-tab');
    await expect(tabs).toHaveCount(3);
    const texts = await tabs.allTextContents();
    expect(texts[0]).toContain('Mittagstisch');
    expect(texts[1]).toContain('Online-Shop');
    expect(texts[2]).toContain('Stammkunden');
  });

  test('AK-UI-01c: Refresh-Button im Header vorhanden', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const refreshBtn = page.locator('.k-header button[title="Aktualisieren"]');
    await expect(refreshBtn).toBeVisible();
  });
});

test.describe('Kiosk UI – Online-Shop Filter', () => {

  test('AK-UI-02: Nur 2 Filter-Buttons: Offene und Heute', async ({ page }) => {
    await page.goto(KIOSK_URL);
    // Switch to Online-Shop tab
    await page.locator('.k-tab[data-tab="abhol"]').click();
    const buttons = page.locator('#abhol-filter-bar .k-filter-btn');
    await expect(buttons).toHaveCount(2);
    const texts = await buttons.allTextContents();
    expect(texts[0]).toContain('Offene');
    expect(texts[1]).toContain('Heute');
  });

  test('AK-UI-09: Badge auf Online-Shop-Tab vorhanden', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const badge = page.locator('#badge-abhol');
    await expect(badge).toBeAttached();
  });
});

test.describe('Kiosk UI – Mittagstisch Tagesauswahl', () => {

  test('AK-UI-05: Tagesauswahl zeigt 7 Tage', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForSelector('#mittag-day-bar button');
    const dayButtons = page.locator('#mittag-day-bar button');
    await expect(dayButtons).toHaveCount(7);
  });

  test('AK-UI-05b: Heute-Button ist standardmäßig aktiv', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForSelector('#mittag-day-bar button');
    const activeBtn = page.locator('#mittag-day-bar button.active');
    await expect(activeBtn).toHaveCount(1);
    await expect(activeBtn).toContainText('Heute');
  });

  test('AK-UI-05c: Tagesauswahl enthält "Gestern" und "Morgen"', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForSelector('#mittag-day-bar button');
    const texts = await page.locator('#mittag-day-bar button').allTextContents();
    expect(texts[0]).toContain('Gestern');
    expect(texts[1]).toContain('Heute');
    expect(texts[2]).toContain('Morgen');
  });

  test('AK-UI-05d: Klick auf anderen Tag wechselt aktiven Button', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForSelector('#mittag-day-bar button');
    const morgenBtn = page.locator('#mittag-day-bar button', { hasText: 'Morgen' });
    await morgenBtn.click();
    await expect(morgenBtn).toHaveClass(/active/);
    const heuteBtn = page.locator('#mittag-day-bar button', { hasText: 'Heute' });
    await expect(heuteBtn).not.toHaveClass(/active/);
  });
});

test.describe('Kiosk UI – Stammkunden Formular', () => {

  test('AK-UI-06: Nachname und Vorname sind separate Felder', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="kunden"]').click();
    // Open new customer modal
    await page.locator('text=Neuer Kunde').click();
    await expect(page.locator('#nk-nachname')).toBeVisible();
    await expect(page.locator('#nk-vorname')).toBeVisible();
  });

  test('AK-UI-06b: Nachname ist Pflichtfeld, Vorname optional', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="kunden"]').click();
    await page.locator('text=Neuer Kunde').click();
    // Try submit without Nachname
    await page.locator('#nk-phone').fill('123');
    await page.locator('text=Kunde anlegen').click();
    // Should show error toast
    await expect(page.locator('#k-toast')).toContainText('Nachname');
  });
});

// ════════════════════════════════════════════════════
//  AK-UI: Zeitslot-Gruppen (specs/kiosk-ui.md)
// ════════════════════════════════════════════════════

test.describe('Kiosk UI – Zeitslot-Gruppen', () => {

  test('AK-UI-03 + AK-UI-04: Slot-Header klappbar mit Pfeil', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="abhol"]').click();
    // Wait for orders to load
    await page.waitForTimeout(2000);
    const headers = page.locator('.k-slot-header');
    const count = await headers.count();
    if (count === 0) {
      test.skip(true, 'Keine Bestellungen vorhanden – Slot-Gruppen nicht testbar');
      return;
    }
    // Click first header to collapse
    const firstHeader = headers.first();
    await firstHeader.click();
    // Group should have collapsed class (CSS rotate, not text change)
    const group = firstHeader.locator('..');
    await expect(group).toHaveClass(/collapsed/);
    // Click again to expand
    await firstHeader.click();
    await expect(group).not.toHaveClass(/collapsed/);
  });
});

// ════════════════════════════════════════════════════
//  AK-PK: Kiosk Packing (specs/kiosk-packing.md)
// ════════════════════════════════════════════════════

test.describe('Kiosk Packing – Modal', () => {

  test('AK-PK-01: Pack-Modal öffnet inline, keine Navigation', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="abhol"]').click();
    await page.waitForTimeout(2000);
    // Find a "Packen" button
    const packBtn = page.locator('text=Packen').first();
    if (await packBtn.count() === 0) {
      test.skip(true, 'Keine packbare Bestellung vorhanden');
      return;
    }
    await packBtn.click();
    // Should stay on same page, modal visible
    expect(page.url()).toContain('/kiosk');
    await expect(page.locator('#modal-pack')).toBeVisible();
  });

  test('AK-PK-01b: Pack-Modal hat Schließen-Button', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="abhol"]').click();
    await page.waitForTimeout(2000);
    const packBtn = page.locator('text=Packen').first();
    if (await packBtn.count() === 0) {
      test.skip(true, 'Keine packbare Bestellung vorhanden');
      return;
    }
    await packBtn.click();
    await expect(page.locator('#modal-pack')).toBeVisible();
    // Close it
    await page.locator('#modal-pack .k-modal-close').click();
    await expect(page.locator('#modal-pack')).not.toBeVisible();
  });
});

test.describe('Kiosk Packing – Funktionalität', () => {

  test('AK-PK-02: Pack-Items haben Checkboxen', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="abhol"]').click();
    await page.waitForTimeout(2000);
    const packBtn = page.locator('text=Packen').first();
    if (await packBtn.count() === 0) {
      test.skip(true, 'Keine packbare Bestellung vorhanden');
      return;
    }
    await packBtn.click();
    await page.waitForSelector('.pk-item');
    const checkboxes = page.locator('.pk-item input[type="checkbox"]');
    expect(await checkboxes.count()).toBeGreaterThan(0);
  });

  test('AK-PK-03: Pack-Items haben Mengen-Eingabefelder', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="abhol"]').click();
    await page.waitForTimeout(2000);
    const packBtn = page.locator('text=Packen').first();
    if (await packBtn.count() === 0) {
      test.skip(true, 'Keine packbare Bestellung vorhanden');
      return;
    }
    await packBtn.click();
    await page.waitForSelector('.pk-item');
    const qtyInputs = page.locator('.pk-item input[type="number"]');
    expect(await qtyInputs.count()).toBeGreaterThan(0);
  });

  test('AK-PK-04: Beipackzettel-Button vorhanden', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="abhol"]').click();
    await page.waitForTimeout(2000);
    const packBtn = page.locator('text=Packen').first();
    if (await packBtn.count() === 0) {
      test.skip(true, 'Keine packbare Bestellung vorhanden');
      return;
    }
    await packBtn.click();
    await expect(page.locator('#modal-pack')).toBeVisible();
    const printBtn = page.locator('text=Beipackzettel');
    await expect(printBtn).toBeVisible();
  });

  test('AK-PK-06: Abholbereit-Button vorhanden', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="abhol"]').click();
    await page.waitForTimeout(2000);
    const packBtn = page.locator('text=Packen').first();
    if (await packBtn.count() === 0) {
      test.skip(true, 'Keine packbare Bestellung vorhanden');
      return;
    }
    await packBtn.click();
    await expect(page.locator('#modal-pack')).toBeVisible();
    const finishBtn = page.locator('#modal-pack button:has-text("Abholbereit"), #modal-pack [onclick*="Abholbereit"]').first();
    await expect(finishBtn).toBeVisible();
  });

  test('AK-PK-07: Autosave-Indikator vorhanden', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="abhol"]').click();
    await page.waitForTimeout(2000);
    const packBtn = page.locator('text=Packen').first();
    if (await packBtn.count() === 0) {
      test.skip(true, 'Keine packbare Bestellung vorhanden');
      return;
    }
    await packBtn.click();
    await expect(page.locator('#pk-autosave')).toBeAttached();
  });
});

// ═══════════════════════════════════════════════════════
//  T4.6–T4.8 – Header & Bottom-Bar
// ═══════════════════════════════════════════════════════
test.describe('Kiosk UI – Header & Bottom-Bar', () => {

  test('T4.6: Refresh-Button im Header sichtbar', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const refreshBtn = page.locator('.k-header button[title="Aktualisieren"]');
    await expect(refreshBtn).toBeVisible();
    await expect(refreshBtn).toContainText('🔄');
  });

  test('T4.8a: Bottom-Bar hat genau 2 Buttons', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const buttons = page.locator('.k-bottom .k-btn');
    await expect(buttons).toHaveCount(2);
  });

  test('T4.8b: Bottom-Bar enthält Telefonbestellung und Küchenliste', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const texts = await page.locator('.k-bottom .k-btn').allTextContents();
    const joined = texts.join(' ');
    expect(joined).toContain('Neue Telefonbestellung');
    expect(joined).toContain('Küchenliste');
    expect(joined).not.toContain('🔄');
  });

  test('T4.8c: Kein Speiseplan-Tab vorhanden', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const tabs = await page.locator('.k-tab').allTextContents();
    const joined = tabs.join(' ');
    expect(joined).not.toContain('Speiseplan');
  });
});

// ═══════════════════════════════════════════════════════
//  T9 – Datum-Normalisierung (lunch-order API)
// ═══════════════════════════════════════════════════════
test.describe('Datum-Normalisierung – lunch-order API', () => {

  test('T9.1: POST mit ISO-Datum wird normalisiert', async ({ request }) => {
    const response = await request.post(`${BASE}/api/lunch-order`, {
      data: {
        name: 'Datum-Test ISO',
        email: 'datumtest@test.de',
        gericht: 'Testgericht Datum',
        menge: 1,
        preis: 5.00,
        datum: '2026-06-22T00:00:00Z',
        wochentag_label: 'Montag',
        quelle: 0
      }
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
    // Datum in Response should be normalized
    expect(body.order.datum).toBe('2026-06-22');
    expect(body.order.datum).not.toContain('T');
  });

  test('T9.2: GET findet Bestellungen mit startswith-Filter', async ({ request }) => {
    const response = await request.get(`${BASE}/api/lunch-order?datum=2026-06-22`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    // Should find at least one order for this date
    expect(body.count).toBeGreaterThan(0);
  });

  test('T9.3: Alle Datum-Felder in Response normalisiert', async ({ request }) => {
    const response = await request.get(`${BASE}/api/lunch-order`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    // Check all orders have normalized datum
    for (const order of body.orders) {
      if (order.datum) {
        expect(order.datum).not.toContain('T00:00:00Z');
        expect(order.datum).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
});
