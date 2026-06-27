/**
 * Shop-Admin Tests – Playwright
 *
 * Testet die shop-admin.html Features gegen die Live-Umgebung:
 *   - Haupt-Tabs (Online-Shop / Mittagstisch)
 *   - Mittagstisch: Day-Tabs, Filter, Card-Design, Dish-Summary
 *   - Online-Shop: Dashboard, Bestellliste, Status-Änderung
 *   - Allgemeine UI (Toast, Scan, etc.)
 *
 * Ausführen gegen Live:
 *   TEST_URL=https://witty-island-064f9d903.7.azurestaticapps.net npx playwright test tests/shop-admin.spec.js
 *
 * Ausführen lokal:
 *   npx playwright test tests/shop-admin.spec.js
 */

const { test, expect } = require('@playwright/test');

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const ADMIN_URL = `${BASE}/shop-admin.html`;

// ════════════════════════════════════════════════════
//  Grundlagen
// ════════════════════════════════════════════════════

test.describe('Shop-Admin – Grundlagen', () => {

  test('Seite lädt ohne JS-Fehler', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto(ADMIN_URL);
    await page.waitForTimeout(3000);
    const criticalErrors = errors.filter(e =>
      !e.includes('fetch') && !e.includes('NetworkError') && !e.includes('Failed to fetch')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('Toast-Funktion existiert', async ({ page }) => {
    await page.goto(ADMIN_URL);
    // toast is defined inside a closure, so check page source
    const content = await page.content();
    expect(content).toContain('function toast(');
  });

  test('Header-Toolbar: Links vorhanden (Freigabe, CMS, Shop, Kiosk)', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.waitForTimeout(2000);
    const content = await page.content();
    expect(content).toContain('href="/shop-freigabe"');
    expect(content).toContain('href="/cms"');
    expect(content).toContain('href="/shop"');
    expect(content).toContain('href="/kiosk"');
  });

  test('Abholscan-Button vorhanden', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await expect(page.locator('#scan-btn')).toBeAttached();
  });

  test('Aktualisieren-Button vorhanden', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await expect(page.locator('#refresh-btn')).toBeAttached();
  });
});

// ════════════════════════════════════════════════════
//  Haupt-Tabs (Online-Shop / Mittagstisch)
// ════════════════════════════════════════════════════

test.describe('Shop-Admin – Haupt-Tabs', () => {

  test('AK-DT-01: Zwei Haupt-Tabs vorhanden', async ({ page }) => {
    await page.goto(ADMIN_URL);
    const tabs = page.locator('.admin-tab');
    await expect(tabs).toHaveCount(2);
  });

  test('AK-DT-02: Online-Shop-Tab ist Standard-aktiv', async ({ page }) => {
    await page.goto(ADMIN_URL);
    const shopTab = page.locator('.admin-tab[data-admin-tab="shop"]');
    await expect(shopTab).toHaveClass(/active/);
    const mittagTab = page.locator('.admin-tab[data-admin-tab="mittag"]');
    await expect(mittagTab).not.toHaveClass(/active/);
  });

  test('AK-DT-03: Tab-Text enthält Online-Shop und Mittagstisch', async ({ page }) => {
    await page.goto(ADMIN_URL);
    const tabs = page.locator('.admin-tab');
    const texts = await tabs.allTextContents();
    expect(texts.join(' ')).toContain('Online-Shop');
    expect(texts.join(' ')).toContain('Mittagstisch');
  });

  test('AK-DT-04: Tab-Wechsel zu Mittagstisch zeigt Panel', async ({ page }) => {
    await page.goto(ADMIN_URL);
    // Mittagstisch panel should be hidden initially
    const mittagPanel = page.locator('#panel-mittag');
    await expect(mittagPanel).not.toBeVisible();
    // Click Mittagstisch tab
    await page.locator('.admin-tab[data-admin-tab="mittag"]').click();
    await expect(mittagPanel).toBeVisible();
    // Shop panel should be hidden
    const shopPanel = page.locator('#panel-shop');
    await expect(shopPanel).not.toBeVisible();
    // Mittagstisch tab should now be active
    await expect(page.locator('.admin-tab[data-admin-tab="mittag"]')).toHaveClass(/active/);
  });

  test('AK-DT-05: Tab-Wechsel zurück zu Online-Shop', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.locator('.admin-tab[data-admin-tab="mittag"]').click();
    await page.locator('.admin-tab[data-admin-tab="shop"]').click();
    await expect(page.locator('#panel-shop')).toBeVisible();
    await expect(page.locator('#panel-mittag')).not.toBeVisible();
  });

  test('AK-DT-06: Badges auf Tabs vorhanden', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await expect(page.locator('#badge-shop')).toBeAttached();
    await expect(page.locator('#badge-mittag')).toBeAttached();
  });
});

// ════════════════════════════════════════════════════
//  Online-Shop Panel
// ════════════════════════════════════════════════════

test.describe('Shop-Admin – Online-Shop Panel', () => {

  test('OS-01: Stats-Leiste vorhanden (Offen, Bereit, Anzahl)', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.waitForTimeout(3000);
    await expect(page.locator('#stat-open')).toBeAttached();
    await expect(page.locator('#stat-ready')).toBeAttached();
    await expect(page.locator('#stat-count')).toBeAttached();
  });

  test('OS-02: Suchfeld und Statusfilter vorhanden', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await expect(page.locator('#search')).toBeAttached();
    await expect(page.locator('#status-filter')).toBeAttached();
  });

  test('OS-03: Dashboard lädt Bestellungen', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.waitForTimeout(3000);
    // Orders are rendered as .order elements inside #orders container
    const ordersEl = page.locator('#orders');
    await expect(ordersEl).toBeAttached();
    const content = await ordersEl.textContent();
    // Container should have content (orders or loading message)
    expect(content.length).toBeGreaterThan(0);
  });

  test('OS-04: Stornieren-Dialog verwendet Gründe-Auswahl', async ({ page }) => {
    await page.goto(ADMIN_URL);
    const scriptContent = await page.content();
    expect(scriptContent).toContain('stornoReasons');
    expect(scriptContent).toContain('Stornierungsgrund');
  });

  test('OS-05: updateOrder-Funktion existiert', async ({ page }) => {
    await page.goto(ADMIN_URL);
    // updateOrder is in a closure, check page source
    const content = await page.content();
    expect(content).toContain('function updateOrder(');
  });

  test('OS-06: Historie-Button vorhanden', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await expect(page.locator('#show-history')).toBeAttached();
  });
});

// ════════════════════════════════════════════════════
//  Mittagstisch – Day Tabs
// ════════════════════════════════════════════════════

test.describe('Shop-Admin Mittagstisch – Day Tabs', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.locator('.admin-tab[data-admin-tab="mittag"]').click();
    await page.waitForTimeout(2000);
  });

  test('AK-MT-01: 5 Day-Tab-Buttons vorhanden', async ({ page }) => {
    await page.waitForSelector('#mt-day-tabs button');
    const dayButtons = page.locator('#mt-day-tabs button');
    const count = await dayButtons.count();
    expect(count).toBe(5);
  });

  test('AK-MT-01b: Samstag wird in Day-Tab-Logik unterstützt', async ({ page }) => {
    const scriptContent = await page.content();
    expect(scriptContent).toContain('d.getDay() <= 6');
  });

  test('AK-MT-01c: Heute-Tab oder erster Tab ist aktiv', async ({ page }) => {
    await page.waitForSelector('#mt-day-tabs button');
    // An einem Werktag: "Heute" aktiv, am Wochenende: erster Werktag aktiv
    const buttons = page.locator('#mt-day-tabs button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
    // Mindestens ein Button muss aktives Styling haben (grüner Hintergrund)
    const allStyles = [];
    for (let i = 0; i < count; i++) {
      const style = await buttons.nth(i).getAttribute('style') || '';
      allStyles.push(style);
    }
    const hasActive = allStyles.some(s => s.includes('var(--green)'));
    expect(hasActive).toBe(true);
  });

  test('AK-MT-02: Tab-Wechsel lädt Bestellungen', async ({ page }) => {
    await page.waitForSelector('#mt-day-tabs button');
    const secondTab = page.locator('#mt-day-tabs button').nth(1);
    await secondTab.click();
    await page.waitForTimeout(2000);
    // mt-orders should have content (either orders or "Keine")
    const orderContent = await page.locator('#mt-orders').textContent();
    expect(orderContent.length).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════════════════
//  AK-MD: Mittagstisch Redesign – Filter & Cards
// ════════════════════════════════════════════════════

test.describe('Shop-Admin Mittagstisch – Filter-Buttons (AK-MD-01/02)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.locator('.admin-tab[data-admin-tab="mittag"]').click();
    await page.waitForTimeout(2000);
  });

  test('AK-MD-01: Filter-Bar vorhanden', async ({ page }) => {
    const filterBar = page.locator('#mt-filter-bar');
    await expect(filterBar).toBeAttached();
  });

  test('AK-MD-01b: Filter-Buttons existieren (Alle, Offen, Abgeholt, Storniert)', async ({ page }) => {
    await page.waitForSelector('.mt-filter-btn', { timeout: 5000 }).catch(() => {});
    const buttons = page.locator('.mt-filter-btn');
    const count = await buttons.count();
    if (count === 0) {
      test.skip(true, 'Keine Bestellungen – Filter-Buttons werden nicht gerendert');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(4);
    const texts = await buttons.allTextContents();
    const joined = texts.join(' ');
    expect(joined).toContain('Alle');
    expect(joined).toContain('Offen');
  });

  test('AK-MD-02: Default-Filter ist "Offen"', async ({ page }) => {
    await page.waitForSelector('.mt-filter-btn', { timeout: 5000 }).catch(() => {});
    const activeFilter = page.locator('.mt-filter-btn.active');
    const count = await activeFilter.count();
    if (count === 0) {
      test.skip(true, 'Keine Filter-Buttons vorhanden');
      return;
    }
    const text = await activeFilter.textContent();
    expect(text).toContain('Offen');
  });

  test('AK-MD-01c: Filter-Klick wechselt aktiven Button', async ({ page }) => {
    await page.waitForSelector('.mt-filter-btn', { timeout: 5000 }).catch(() => {});
    const alleBtn = page.locator('.mt-filter-btn', { hasText: 'Alle' });
    if (await alleBtn.count() === 0) {
      test.skip(true, 'Keine Filter-Buttons vorhanden');
      return;
    }
    await alleBtn.click();
    await expect(alleBtn).toHaveClass(/active/);
  });
});

test.describe('Shop-Admin Mittagstisch – Card-Design (AK-MD-03)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.locator('.admin-tab[data-admin-tab="mittag"]').click();
    await page.waitForTimeout(2000);
  });

  test('AK-MD-03: Orders als Karten statt Tabelle', async ({ page }) => {
    // If there are orders, they should be cards not table rows
    const cards = page.locator('.mt-card');
    const tables = page.locator('#mt-orders table');
    const cardCount = await cards.count();
    const tableCount = await tables.count();
    if (cardCount === 0 && tableCount === 0) {
      test.skip(true, 'Keine Bestellungen vorhanden');
      return;
    }
    expect(cardCount).toBeGreaterThan(0);
    expect(tableCount).toBe(0);
  });

  test('AK-MD-03b: Karte hat Menge, Gericht, Kunde', async ({ page }) => {
    const card = page.locator('.mt-card').first();
    if (await card.count() === 0) {
      test.skip(true, 'Keine Bestellungen vorhanden');
      return;
    }
    await expect(card.locator('.mt-card-qty')).toBeAttached();
    await expect(card.locator('.mt-card-dish')).toBeAttached();
    await expect(card.locator('.mt-card-customer')).toBeAttached();
  });

  test('AK-MD-05: Aktions-Buttons haben ausreichende Größe', async ({ page }) => {
    const actionBtn = page.locator('.mt-card-actions .btn').first();
    if (await actionBtn.count() === 0) {
      test.skip(true, 'Keine Aktions-Buttons vorhanden');
      return;
    }
    const box = await actionBtn.boundingBox();
    // Buttons should be reasonably tall for touch targets
    expect(box.height).toBeGreaterThanOrEqual(30);
    expect(box.width).toBeGreaterThanOrEqual(40);
  });

  test('AK-MD-06: Anmerkungen sichtbar (gelber Hintergrund)', async ({ page }) => {
    const note = page.locator('.mt-card-note').first();
    if (await note.count() === 0) {
      test.skip(true, 'Keine Bestellungen mit Anmerkungen');
      return;
    }
    await expect(note).toBeVisible();
  });
});

test.describe('Shop-Admin Mittagstisch – Gerichtzusammenfassung (AK-MD-04)', () => {

  test('AK-MD-04: Dish-Summary Container vorhanden', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.locator('.admin-tab[data-admin-tab="mittag"]').click();
    await page.waitForTimeout(2000);
    const summary = page.locator('#mt-dish-summary');
    await expect(summary).toBeAttached();
  });
});

// ════════════════════════════════════════════════════
//  Mittagstisch – Status-Änderung
// ════════════════════════════════════════════════════

test.describe('Shop-Admin Mittagstisch – Status-Änderung', () => {

  test('AK-MT-API-01: mtSetStatus sendet PATCH mit ID in URL', async ({ page }) => {
    await page.goto(ADMIN_URL);
    const scriptContent = await page.content();
    expect(scriptContent).toContain("fetch('/api/lunch-order/'+encodeURIComponent(id)");
  });

  test('AK-MT-API-02: Fehlerbehandlung nutzt toast() statt alert()', async ({ page }) => {
    await page.goto(ADMIN_URL);
    const scriptContent = await page.content();
    const mtSetStatusMatch = scriptContent.match(/function mtSetStatus[\s\S]*?^}/m);
    if (mtSetStatusMatch) {
      expect(mtSetStatusMatch[0]).not.toContain('alert(');
      expect(mtSetStatusMatch[0]).toContain('toast(');
    }
  });

  test('AK-MT-API-03: Statusänderung via API-Interception', async ({ page }) => {
    const patchCalls = [];
    await page.route('**/api/lunch-order/**', (route) => {
      if (route.request().method() === 'PATCH') {
        patchCalls.push(route.request().url());
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto(ADMIN_URL);
    await page.locator('.admin-tab[data-admin-tab="mittag"]').click();
    await page.waitForTimeout(3000);

    const statusBtn = page.locator('[onclick*="mtSetStatus"]').first();
    if (await statusBtn.count() === 0) {
      test.skip(true, 'Keine Mittagstisch-Bestellungen vorhanden');
      return;
    }
    await statusBtn.click();
    await page.waitForTimeout(500);

    expect(patchCalls.length).toBeGreaterThan(0);
    expect(patchCalls[0]).toMatch(/\/api\/lunch-order\/[a-f0-9-]+/i);
  });
});

// ════════════════════════════════════════════════════
//  Mittagstisch – Neue Bestellung
// ════════════════════════════════════════════════════

test.describe('Shop-Admin Mittagstisch – Neue Bestellung', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.locator('.admin-tab[data-admin-tab="mittag"]').click();
    await page.waitForTimeout(2000);
  });

  test('AK-MT-NB-01: Formular öffnet mit Button', async ({ page }) => {
    const newBtn = page.locator('text=Neue Bestellung');
    await expect(newBtn).toBeVisible();
    await newBtn.click();
    await expect(page.locator('#mt-new-form')).toBeVisible();
  });

  test('AK-MT-NB-02: Formular hat Name, Telefon, Gericht, Menge', async ({ page }) => {
    await page.locator('text=Neue Bestellung').click();
    await expect(page.locator('#mt-new-name')).toBeVisible();
    await expect(page.locator('#mt-new-tel')).toBeVisible();
    await expect(page.locator('#mt-new-gericht')).toBeVisible();
    await expect(page.locator('#mt-new-menge')).toBeVisible();
  });

  test('AK-MT-NB-03: Gericht-Dropdown hat Optionen', async ({ page }) => {
    await page.locator('text=Neue Bestellung').click();
    await page.waitForTimeout(1000);
    const options = page.locator('#mt-new-gericht option');
    const count = await options.count();
    // Should have at least 1 option (or "Kein Gericht" placeholder)
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
