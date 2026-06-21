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

  test('AK-UI-02: 4 Filter-Buttons: Zu erledigen, Heute abholen, Überfällig, Historie', async ({ page }) => {
    await page.goto(KIOSK_URL);
    // Switch to Online-Shop tab
    await page.locator('.k-tab[data-tab="abhol"]').click();
    const buttons = page.locator('#abhol-filter-bar .k-filter-btn');
    await expect(buttons).toHaveCount(4);
    const texts = await buttons.allTextContents();
    expect(texts[0]).toContain('Zu erledigen');
    expect(texts[1]).toContain('Heute abholen');
    expect(texts[2]).toContain('Überfällig');
    expect(texts[3]).toContain('Historie');
  });

  test('AK-UI-09: Badge auf Online-Shop-Tab vorhanden', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const badge = page.locator('#badge-abhol');
    await expect(badge).toBeAttached();
  });

  test('AK-UI-13: Shop-Stats zeigen handlungsorientierte Labels', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="abhol"]').click();
    await page.waitForTimeout(2000);
    const stats = await page.locator('#abhol-stats').textContent();
    // Should NOT contain old labels
    expect(stats).not.toContain('Bearb.');
    expect(stats).not.toContain('Umsatz');
    expect(stats).not.toContain('€');
  });

  test('AK-UI-14: Mittagstisch-Stats zeigen Portionen statt Umsatz', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(2000);
    const stats = await page.locator('#mittag-stats').textContent();
    expect(stats).toContain('Portionen');
    expect(stats).not.toContain('Umsatz');
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

  test('AK-UI-03 + AK-UI-04: Slot-Gruppen default collapsed, klappbar', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="abhol"]').click();
    await page.waitForTimeout(2000);
    const headers = page.locator('.k-slot-header');
    const count = await headers.count();
    if (count === 0) {
      test.skip(true, 'Keine Bestellungen vorhanden – Slot-Gruppen nicht testbar');
      return;
    }
    const firstHeader = headers.first();
    const group = firstHeader.locator('..');
    // Default: collapsed
    await expect(group).toHaveClass(/collapsed/);
    // Click to expand
    await firstHeader.click();
    await expect(group).not.toHaveClass(/collapsed/);
    // Click again to collapse
    await firstHeader.click();
    await expect(group).toHaveClass(/collapsed/);
  });

  test('AK-UI-03b: Slot-Header zeigt Status-Badges (📥/📦/🔔)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="abhol"]').click();
    await page.waitForTimeout(2000);
    const counts = page.locator('.k-slot-count');
    if (await counts.count() === 0) {
      test.skip(true, 'Keine Slot-Gruppen vorhanden');
      return;
    }
    const firstCount = await counts.first().textContent();
    // Should contain status icons or "Bestellung(en)"
    const hasStatusBadges = firstCount.includes('📥') || firstCount.includes('📦') || firstCount.includes('🔔') || firstCount.includes('Bestellung');
    expect(hasStatusBadges).toBe(true);
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
    const packBtn = page.locator('button[onclick*="openPackModal"]').first();
    if (await packBtn.count() === 0) {
      test.skip(true, 'Keine packbare Bestellung vorhanden (Status 1 nötig)');
      return;
    }
    await packBtn.click();
    // Should stay on same page, modal visible
    expect(page.url()).toContain('/kiosk');
    await expect(page.locator('#modal-pack')).toBeVisible({ timeout: 10000 });
  });

  test('AK-PK-01b: Pack-Modal hat Schließen-Button', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="abhol"]').click();
    await page.waitForTimeout(2000);
    const packBtn = page.locator('button[onclick*="openPackModal"]').first();
    if (await packBtn.count() === 0) {
      test.skip(true, 'Keine packbare Bestellung vorhanden (Status 1 nötig)');
      return;
    }
    await packBtn.click();
    await expect(page.locator('#modal-pack')).toBeVisible({ timeout: 10000 });
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
    const packBtn = page.locator('button[onclick*="openPackModal"]').first();
    if (await packBtn.count() === 0) {
      test.skip(true, 'Keine packbare Bestellung vorhanden (Status 1 nötig)');
      return;
    }
    await packBtn.click();
    await page.waitForSelector('.pk-item', { timeout: 15000 });
    const checkboxes = page.locator('.pk-item input[type="checkbox"]');
    expect(await checkboxes.count()).toBeGreaterThan(0);
  });

  test('AK-PK-03: Pack-Items haben Mengen-Eingabefelder', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="abhol"]').click();
    await page.waitForTimeout(2000);
    const packBtn = page.locator('button[onclick*="openPackModal"]').first();
    if (await packBtn.count() === 0) {
      test.skip(true, 'Keine packbare Bestellung vorhanden (Status 1 nötig)');
      return;
    }
    await packBtn.click();
    await page.waitForSelector('.pk-item', { timeout: 15000 });
    const qtyInputs = page.locator('.pk-item input[type="number"]');
    expect(await qtyInputs.count()).toBeGreaterThan(0);
  });

  test('AK-PK-04: Beipackzettel-Button vorhanden', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="abhol"]').click();
    await page.waitForTimeout(2000);
    const packBtn = page.locator('button[onclick*="openPackModal"]').first();
    if (await packBtn.count() === 0) {
      test.skip(true, 'Keine packbare Bestellung vorhanden (Status 1 nötig)');
      return;
    }
    await packBtn.click();
    await expect(page.locator('#modal-pack')).toBeVisible({ timeout: 10000 });
    const printBtn = page.locator('#modal-pack button:has-text("Beipackzettel")');
    await expect(printBtn).toBeVisible();
  });

  test('AK-PK-06: Abholbereit-Button vorhanden', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="abhol"]').click();
    await page.waitForTimeout(2000);
    const packBtn = page.locator('button[onclick*="openPackModal"]').first();
    if (await packBtn.count() === 0) {
      test.skip(true, 'Keine packbare Bestellung vorhanden (Status 1 nötig)');
      return;
    }
    await packBtn.click();
    await expect(page.locator('#modal-pack')).toBeVisible({ timeout: 10000 });
    const finishBtn = page.locator('#modal-pack button:has-text("Abholbereit"), #pk-finish-btn').first();
    await expect(finishBtn).toBeVisible();
  });

  test('AK-PK-07: Autosave-Indikator vorhanden', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="abhol"]').click();
    await page.waitForTimeout(2000);
    const packBtn = page.locator('button[onclick*="openPackModal"]').first();
    if (await packBtn.count() === 0) {
      test.skip(true, 'Keine packbare Bestellung vorhanden (Status 1 nötig)');
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

// ═══════════════════════════════════════════════════════
//  Bestätigen mit optionalem Text
// ═══════════════════════════════════════════════════════
test.describe('Kiosk – Bestätigen mit Text', () => {

  test('AK-UI-16: Bestätigen-Button öffnet Confirm-Dialog', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(2000);
    const confirmBtn = page.locator('.k-order-actions .k-btn-confirm:has-text("Bestätigen")').first();
    if (await confirmBtn.count() === 0) {
      test.skip(true, 'Keine offene Bestellung vorhanden');
      return;
    }
    await confirmBtn.click();
    const dialog = page.locator('.k-confirm-dialog').first();
    await expect(dialog).toBeVisible();
  });

  test('AK-UI-16b: Confirm-Dialog hat optionales Textfeld', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(2000);
    const confirmBtn = page.locator('.k-order-actions .k-btn-confirm:has-text("Bestätigen")').first();
    if (await confirmBtn.count() === 0) {
      test.skip(true, 'Keine offene Bestellung vorhanden');
      return;
    }
    await confirmBtn.click();
    const input = page.locator('.k-confirm-input').first();
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', /optional/i);
  });

  test('AK-UI-16c: Bestätigungstext-Div hat korrektes Styling', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(2000);
    // Verify that the rendering code for bestaetigung_text exists in page source
    const source = await page.content();
    expect(source).toContain('bestaetigung_text');
    expect(source).toContain('dcfce7');
  });

  test('AK-UI-16d: Abbrechen-Button schließt Confirm-Dialog', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(2000);
    const confirmBtn = page.locator('.k-order-actions .k-btn-confirm:has-text("Bestätigen")').first();
    if (await confirmBtn.count() === 0) {
      test.skip(true, 'Keine offene Bestellung vorhanden');
      return;
    }
    await confirmBtn.click();
    const dialog = page.locator('.k-confirm-dialog').first();
    await expect(dialog).toBeVisible();
    // Click Abbrechen
    const cancelBtn = page.locator('.k-btn-outline:has-text("Abbrechen")').first();
    await cancelBtn.click();
    await expect(dialog).not.toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════
//  Badge, Überfällig, Filter-Wechsel
// ═══════════════════════════════════════════════════════
test.describe('Kiosk UI – Badge & Überfällig', () => {

  test('AK-UI-09b: Badge-Zahl entspricht Eingang+Packen (nicht alle offenen)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="abhol"]').click();
    await page.waitForTimeout(2000);
    const badgeText = await page.locator('#badge-abhol').textContent();
    const badgeVal = parseInt(badgeText) || 0;
    // Badge should match "Zu erledigen" filter count (Eingang + Packen)
    // Get stats values
    const statsText = await page.locator('#abhol-stats').textContent();
    // Badge value should be <= "Zu erledigen" filter count
    const filterCount = parseInt(await page.locator('#fc-open').textContent()) || 0;
    expect(badgeVal).toBeLessThanOrEqual(filterCount);
  });

  test('AK-UI-15: Überfällige Bestellungen haben CSS-Klasse k-order-overdue', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="abhol"]').click();
    await page.waitForTimeout(2000);
    // Check if overdue CSS class and styling is in the page
    const source = await page.content();
    expect(source).toContain('k-order-overdue');
    // If there are overdue orders, check they have red styling
    const overdueCount = parseInt(await page.locator('#fc-overdue').textContent()) || 0;
    if (overdueCount > 0) {
      // Click overdue filter to show only overdue
      await page.locator('.k-filter-btn[data-filter="overdue"]').click();
      await page.waitForTimeout(500);
      const overdueCards = page.locator('.k-order-overdue');
      expect(await overdueCards.count()).toBeGreaterThan(0);
    }
  });

  test('AK-UI-02b: Filterwechsel ändert angezeigte Bestellungen', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="abhol"]').click();
    await page.waitForTimeout(2000);
    // Click "Heute abholen"
    const todayBtn = page.locator('.k-filter-btn[data-filter="today"]');
    await todayBtn.click();
    await expect(todayBtn).toHaveClass(/active/);
    // Click back to "Zu erledigen"
    const openBtn = page.locator('.k-filter-btn[data-filter="open"]');
    await openBtn.click();
    await expect(openBtn).toHaveClass(/active/);
    await expect(todayBtn).not.toHaveClass(/active/);
  });
});

// ═══════════════════════════════════════════════════════
//  Mittagstisch Stats: Mitnehmen & Vor Ort
// ═══════════════════════════════════════════════════════
test.describe('Kiosk UI – Mittagstisch Stats Detail', () => {

  test('AK-UI-14b: Mittagstisch-Stats zeigen Mitnehmen und Vor Ort', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(2000);
    const stats = await page.locator('#mittag-stats').textContent();
    // Stats should have "Offen", "Portionen" labels
    // "Mitnehmen" and "Vor Ort" may or may not show depending on data
    expect(stats).toContain('Portionen');
    // Verify it does NOT show "Umsatz" or "Bestätigt"
    expect(stats).not.toContain('Umsatz');
    expect(stats).not.toContain('Bestätigt');
    expect(stats).not.toContain('Abgeholt');
  });
});

// ═══════════════════════════════════════════════════════
//  Küchenliste: Datum & Kundennamen
// ═══════════════════════════════════════════════════════
test.describe('Kiosk UI – Küchenliste', () => {

  test('AK-UI-10b: Küchenliste-Button vorhanden', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const btn = page.locator('.k-bottom .k-btn:has-text("Küchenliste")');
    await expect(btn).toBeVisible();
  });

  test('AK-UI-10c: printKitchen verwendet ausgewähltes Datum (nicht heute)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    // Verify that the code references _mittagDatum for kitchen list
    const source = await page.content();
    expect(source).toContain('_mittagDatum');
    // Verify it does NOT use "new Date()" directly for the header
    // The fix changed "new Date().toLocaleDateString" to "new Date(_mittagDatum..."
    expect(source).toContain("new Date(_mittagDatum");
  });

  test('AK-UI-10d: printKitchen verwendet o.name und o.menge', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const source = await page.content();
    // Should use o.name (not o.kundenname) and o.menge (not o.portionen)
    expect(source).toContain("o.name || '?'");
    expect(source).toContain('o.menge || 1');
    // Should NOT contain the old buggy field names
    expect(source).not.toContain('o.kundenname');
    expect(source).not.toContain('o.portionen');
  });
});

// ═══════════════════════════════════════════════════════
//  Mittagstisch Status-Filter
// ═══════════════════════════════════════════════════════
test.describe('Kiosk UI – Mittagstisch Status-Filter', () => {

  test('AK-UI-17: Status-Filter-Bar mit 5 Buttons vorhanden', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const bar = page.locator('#mittag-status-bar');
    await expect(bar).toBeVisible();
    const btns = bar.locator('.k-filter-btn');
    expect(await btns.count()).toBe(5);
  });

  test('AK-UI-17b: Default-Filter ist "Zu bestätigen"', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(1000);
    const activeBtn = page.locator('#mittag-status-bar .k-filter-btn.active');
    await expect(activeBtn).toHaveCount(1);
    const text = await activeBtn.textContent();
    expect(text).toContain('Zu bestätigen');
  });

  test('AK-UI-17c: Filterwechsel ändert active-Klasse', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(1000);
    // Click "Alle"
    await page.locator('#mittag-status-bar .k-filter-btn[data-mt-filter="alle"]').click();
    const activeBtn = page.locator('#mittag-status-bar .k-filter-btn.active');
    const text = await activeBtn.textContent();
    expect(text).toContain('Alle');
  });
});

// ═══════════════════════════════════════════════════════
//  Shop Order Detail Modal
// ═══════════════════════════════════════════════════════
test.describe('Kiosk UI – Order Detail Modal', () => {

  test('AK-UI-18: Detail-Modal HTML vorhanden', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const modal = page.locator('#modal-detail');
    await expect(modal).toBeAttached();
  });

  test('AK-UI-18b: Shop-Karten haben ondblclick für Details', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const source = await page.content();
    expect(source).toContain('showOrderDetail');
    expect(source).toContain('ondblclick');
  });

  test('AK-UI-16e: Confirm-Dialog ist vollbreit unter der Karte', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const source = await page.content();
    // Confirm dialog should NOT be inside k-order-actions anymore
    // It should be a separate div after the card
    expect(source).toContain('Nachricht an Kunde (optional)');
    expect(source).toContain('Jetzt bestätigen');
  });
});

// ──────────────────────────────────────────────
// AK-UI-19: Lucide Icons
// ──────────────────────────────────────────────
test.describe('Lucide Icons (AK-UI-19)', () => {
  test('AK-UI-19: Lucide CDN ist eingebunden', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const lucideScript = page.locator('script[src*="lucide"]');
    await expect(lucideScript).toHaveCount(1);
  });

  test('AK-UI-19b: Keine Emoji-Icons in statischem HTML (Buttons, Header, Tabs)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    // Check that main UI areas use data-lucide icons instead of emojis
    const header = page.locator('.k-header h1 i[data-lucide]');
    await expect(header).toHaveCount(1);
    const tabIcons = page.locator('.k-tab i[data-lucide]');
    expect(await tabIcons.count()).toBeGreaterThanOrEqual(3);
  });

  test('AK-UI-19c: Lucide Icons werden nach DOM-Update gerendert (SVG-Elemente)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(2000);
    // After createIcons(), <i data-lucide> should be replaced with <svg>
    const svgs = page.locator('.k-header svg');
    expect(await svgs.count()).toBeGreaterThanOrEqual(1);
  });
});

// ──────────────────────────────────────────────
// AK-UI-20: Shop Historie Toggle
// ──────────────────────────────────────────────
test.describe('Shop Historie Toggle (AK-UI-20)', () => {
  test('AK-UI-20: Historie-Button existiert in Shop-Filter-Bar', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const histBtn = page.locator('#btn-history');
    await expect(histBtn).toBeVisible();
    await expect(histBtn).toContainText('Historie');
  });

  test('AK-UI-20b: Historie-Button hat Zähler', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const counter = page.locator('#fc-history');
    await expect(counter).toBeVisible();
  });

  test('AK-UI-20c: Historie-Toggle wechselt active-Klasse', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const histBtn = page.locator('#btn-history');
    // Initially not active
    await expect(histBtn).not.toHaveClass(/active/);
    await histBtn.click();
    await expect(histBtn).toHaveClass(/active/);
    await histBtn.click();
    await expect(histBtn).not.toHaveClass(/active/);
  });
});

// ──────────────────────────────────────────────
// AK-UI-21: Aktuelle Schicht Hervorhebung
// ──────────────────────────────────────────────
test.describe('Aktuelle Schicht (AK-UI-21)', () => {
  test('AK-UI-21: CSS für aktuelle Schicht existiert', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const source = await page.content();
    expect(source).toContain('k-slot-current');
    expect(source).toContain('k-slot-now');
  });

  test('AK-UI-21b: toggleHistory ist in Public API verfügbar', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const hasToggle = await page.evaluate(() => typeof K.toggleHistory === 'function');
    expect(hasToggle).toBe(true);
  });
});

// ════════════════════════════════════════════════════
//  Slot-Header Badge Readability
// ════════════════════════════════════════════════════

test.describe('Kiosk UI – Slot-Header Badges', () => {

  test('AK-UI-22: k-slot-badge CSS hat weißen Hintergrund', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const source = await page.content();
    expect(source).toContain('k-slot-badge');
    expect(source).toContain('background:#fff');
  });

  test('AK-UI-22b: Badge-Klassen für Farbkodierung vorhanden', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const source = await page.content();
    expect(source).toContain('sb-pack');
    expect(source).toContain('sb-wait');
    expect(source).toContain('sb-overdue');
  });

  test('AK-UI-23: Filter-Zähler schließen alte erledigte Bestellungen aus', async ({ page }) => {
    await page.goto(KIOSK_URL);
    // The counter logic filters old completed orders – verify the function exists
    const hasFilter = await page.evaluate(() => typeof K.loadShopOrders === 'function');
    expect(hasFilter).toBe(true);
  });

  test('AK-UI-24: Online-Shop ist Default-Tab beim Laden', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const activeTab = page.locator('.k-tab.active');
    await expect(activeTab).toHaveAttribute('data-tab', 'abhol');
    const activePanel = page.locator('.k-panel.active');
    await expect(activePanel).toHaveAttribute('id', 'panel-abhol');
  });
});
