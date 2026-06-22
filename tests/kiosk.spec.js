/**
 * Kiosk Tests – Playwright (funktionale E2E-Tests)
 * 
 * Testet die kiosk.html Features gegen die Specs:
 *   - specs/kiosk-ui.md
 *   - specs/kiosk-packing.md
 * 
 * Nur funktionale Tests – keine DOM-Präsenz-, Source-String- oder CSS-Checks.
 * 
 * Ausführen:
 *   npx playwright test tests/kiosk.spec.js
 */

const { test, expect } = require('@playwright/test');

const BASE = process.env.TEST_URL || 'http://localhost:4280';
const KIOSK_URL = `${BASE}/kiosk`;

// ════════════════════════════════════════════════════
//  Tab-Navigation & Default-Tab
// ════════════════════════════════════════════════════

test.describe('Kiosk – Tab-Navigation', () => {

  test('Online-Shop ist Default-Tab beim Laden', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const activeTab = page.locator('.k-tab.active');
    await expect(activeTab).toHaveAttribute('data-tab', 'abhol');
    const activePanel = page.locator('.k-panel.active');
    await expect(activePanel).toHaveAttribute('id', 'panel-abhol');
  });

  test('Tab-Wechsel zeigt korrektes Panel', async ({ page }) => {
    await page.goto(KIOSK_URL);
    // Switch to Mittagstisch
    await page.locator('.k-tab[data-tab="mittag"]').click();
    await expect(page.locator('.k-tab[data-tab="mittag"]')).toHaveClass(/active/);
    await expect(page.locator('#panel-mittag')).toHaveClass(/active/);
    // Switch to Stammkunden
    await page.locator('.k-tab[data-tab="kunden"]').click();
    await expect(page.locator('.k-tab[data-tab="kunden"]')).toHaveClass(/active/);
    await expect(page.locator('#panel-kunden')).toHaveClass(/active/);
    // Mittagstisch panel should no longer be active
    await expect(page.locator('#panel-mittag')).not.toHaveClass(/active/);
  });
});

// ════════════════════════════════════════════════════
//  Online-Shop Filter-Wechsel
// ════════════════════════════════════════════════════

test.describe('Kiosk – Shop-Filter', () => {

  test('Filterwechsel ändert active-Klasse und angezeigte Bestellungen', async ({ page }) => {
    await page.goto(KIOSK_URL);
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

  test('Historie-Toggle ein/aus', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const histBtn = page.locator('#btn-history');
    await expect(histBtn).not.toHaveClass(/active/);
    await histBtn.click();
    await expect(histBtn).toHaveClass(/active/);
    await histBtn.click();
    await expect(histBtn).not.toHaveClass(/active/);
  });

  test('Badge-Zahl ≤ "Zu erledigen" Filteranzahl', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(2000);
    const badgeText = await page.locator('#badge-abhol').textContent();
    const badgeVal = parseInt(badgeText) || 0;
    const filterCount = parseInt(await page.locator('#fc-open').textContent()) || 0;
    expect(badgeVal).toBeLessThanOrEqual(filterCount);
  });
});

// ════════════════════════════════════════════════════
//  Zeitslot-Gruppen: Auf/Zuklappen + Zustand beibehalten
// ════════════════════════════════════════════════════

test.describe('Kiosk – Slot-Gruppen', () => {

  test('Slot-Gruppen klappen auf/zu und behalten Zustand bei Refresh', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(2000);
    const headers = page.locator('.k-slot-header');
    const count = await headers.count();
    if (count === 0) {
      test.skip(true, 'Keine Bestellungen – Slot-Gruppen nicht testbar');
      return;
    }
    // Find first collapsed group
    const firstHeader = headers.first();
    const group = firstHeader.locator('..');
    const wasCollapsed = await group.evaluate(el => el.classList.contains('collapsed'));

    if (wasCollapsed) {
      // Expand it
      await firstHeader.click();
      await expect(group).not.toHaveClass(/collapsed/);
    } else {
      // Collapse it
      await firstHeader.click();
      await expect(group).toHaveClass(/collapsed/);
    }

    // Click Refresh – slot group state should be preserved
    const groupId = await group.getAttribute('id');
    await page.locator('button[title="Aktualisieren"]').click();
    await page.waitForTimeout(3000);
    const updatedGroup = page.locator('#' + groupId);
    if (wasCollapsed) {
      // Was collapsed, we expanded it → after refresh should still be expanded
      await expect(updatedGroup).not.toHaveClass(/collapsed/);
    } else {
      // Was expanded, we collapsed it → after refresh should still be collapsed
      await expect(updatedGroup).toHaveClass(/collapsed/);
    }
  });
});

// ════════════════════════════════════════════════════
//  Mittagstisch – Tagesauswahl + API
// ════════════════════════════════════════════════════

test.describe('Kiosk – Mittagstisch Tagesauswahl', () => {

  test('7 Tage, Default=Heute, Wechsel lädt korrekte Daten', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="mittag"]').click();
    await page.waitForSelector('#mittag-day-bar button');

    const dayButtons = page.locator('#mittag-day-bar button');
    await expect(dayButtons).toHaveCount(7);

    // Default active = Heute
    const activeBtn = page.locator('#mittag-day-bar button.active');
    await expect(activeBtn).toContainText('Heute');

    // Click each day: verify API call + response + rendering
    const count = await dayButtons.count();
    for (let i = 0; i < count; i++) {
      const btn = dayButtons.nth(i);
      const label = (await btn.textContent()).trim();
      const datum = await btn.getAttribute('data-datum');

      const apiPromise = page.waitForResponse(
        resp => resp.url().includes('/api/lunch-order') && resp.url().includes(`datum=${datum}`),
        { timeout: 10000 }
      );
      await btn.click();
      const apiResponse = await apiPromise;
      expect(apiResponse.status(), `API für "${label}" (${datum})`).toBe(200);
      const json = await apiResponse.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.orders)).toBe(true);
      await expect(btn).toHaveClass(/active/);

      // "Alle" Zähler = API order count
      const alleCount = await page.locator('#mt-fc-alle').textContent();
      expect(parseInt(alleCount), `Alle-Zähler für ${label}`).toBe(json.orders.length);

      if (json.orders.length > 0) {
        await page.locator('#mittag-status-bar button[data-mt-filter="alle"]').click();
        await page.waitForTimeout(300);
        const visibleOrders = await page.locator('#mittag-orders .k-order').count();
        expect(visibleOrders, `${label}: Bestellungen rendern`).toBe(json.orders.length);
        await page.locator('#mittag-status-bar button[data-mt-filter="offen"]').click();
      }
    }
  });
});

// ════════════════════════════════════════════════════
//  Mittagstisch – Status-Filter
// ════════════════════════════════════════════════════

test.describe('Kiosk – Mittagstisch Filter', () => {

  test('Default-Filter ist "Zu bestätigen", Wechsel funktioniert', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="mittag"]').click();
    await page.waitForTimeout(1000);
    const activeBtn = page.locator('#mittag-status-bar .k-filter-btn.active');
    await expect(activeBtn).toHaveCount(1);
    const text = await activeBtn.textContent();
    expect(text).toContain('Zu bestätigen');
    // Switch to "Alle"
    await page.locator('#mittag-status-bar .k-filter-btn[data-mt-filter="alle"]').click();
    const newActive = page.locator('#mittag-status-bar .k-filter-btn.active');
    const newText = await newActive.textContent();
    expect(newText).toContain('Alle');
  });
});

// ════════════════════════════════════════════════════
//  Mittagstisch – Bestätigen-Dialog
// ════════════════════════════════════════════════════

test.describe('Kiosk – Bestätigen-Dialog', () => {

  test('Bestätigen öffnet Dialog mit Textfeld, Abbrechen schließt ihn', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="mittag"]').click();
    await page.waitForTimeout(2000);
    const confirmBtn = page.locator('.k-order-actions .k-btn-confirm:has-text("Bestätigen")').first();
    if (await confirmBtn.count() === 0) {
      test.skip(true, 'Keine offene Bestellung vorhanden');
      return;
    }
    await confirmBtn.click();
    const dialog = page.locator('.k-confirm-dialog').first();
    await expect(dialog).toBeVisible();
    // Optionales Textfeld vorhanden
    const input = page.locator('.k-confirm-input').first();
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', /optional/i);
    // Abbrechen schließt Dialog
    await page.locator('.k-btn-outline:has-text("Abbrechen")').first().click();
    await expect(dialog).not.toBeVisible();
  });
});

// ════════════════════════════════════════════════════
//  Stammkunden – Formular-Validierung
// ════════════════════════════════════════════════════

test.describe('Kiosk – Stammkunden Formular', () => {

  test('Nachname Pflichtfeld: Submit ohne Nachname zeigt Fehler', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="kunden"]').click();
    await page.locator('text=Neuer Kunde').click();
    await expect(page.locator('#nk-nachname')).toBeVisible();
    await expect(page.locator('#nk-vorname')).toBeVisible();
    // Submit without Nachname
    await page.locator('#nk-phone').fill('123');
    await page.locator('text=Kunde anlegen').click();
    await expect(page.locator('#k-toast')).toContainText('Nachname');
  });
});

// ════════════════════════════════════════════════════
//  Datum-Normalisierung – lunch-order API
// ════════════════════════════════════════════════════

test.describe('Datum-Normalisierung – API', () => {

  test('POST normalisiert ISO-Datum auf YYYY-MM-DD', async ({ request }) => {
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
    expect(body.order.datum).toBe('2026-06-22');
    expect(body.order.datum).not.toContain('T');
  });

  test('GET findet Bestellungen und alle Datums-Felder normalisiert', async ({ request }) => {
    const response = await request.get(`${BASE}/api/lunch-order`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    for (const order of body.orders) {
      if (order.datum) {
        expect(order.datum).not.toContain('T00:00:00Z');
        expect(order.datum).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
});

// ════════════════════════════════════════════════════
//  Pack-Modal – E2E Workflow
// ════════════════════════════════════════════════════

test.describe('Kiosk – Packen E2E', () => {

  test('Pack-Modal öffnet inline, zeigt Positionen, Checkbox aktualisiert Summe + Fortschritt', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(2000);
    // Find Packen button (status 1 or ungepackte status 2)
    const packBtn = page.locator('button[onclick*="openPackModal"]').first();
    if (await packBtn.count() === 0) {
      test.skip(true, 'Keine packbare Bestellung vorhanden');
      return;
    }
    // Slot group might be collapsed – expand first
    const group = packBtn.locator('closest=.k-slot-group');
    // Click Packen
    await packBtn.click({ force: true });
    expect(page.url()).toContain('/kiosk');
    await expect(page.locator('#modal-pack')).toBeVisible({ timeout: 10000 });

    // Wait for items to load
    await page.waitForSelector('.pk-item', { timeout: 15000 });
    const checkboxes = page.locator('.pk-item input[type="checkbox"]');
    const itemCount = await checkboxes.count();
    expect(itemCount).toBeGreaterThan(0);

    // Check a box: should update progress and trigger autosave
    const firstCb = checkboxes.first();
    const wasChecked = await firstCb.isChecked();
    if (!wasChecked) {
      await firstCb.click();
      await page.waitForTimeout(1500);
      // Progress text should show updated count
      const progressText = await page.locator('#pk-progress-text').textContent();
      expect(progressText).toMatch(/\d+\/\d+ gepackt/);
      // Autosave indicator should show
      const autosaveText = await page.locator('#pk-autosave').textContent();
      expect(autosaveText).toContain('Gespeichert');
    }

    // Close modal
    await page.locator('#modal-pack .k-modal-close').click();
    await expect(page.locator('#modal-pack')).not.toBeVisible();
  });
});

// ════════════════════════════════════════════════════
//  Shop-Karten Buttons: Annehmen, Ausgeben, Details
// ════════════════════════════════════════════════════

test.describe('Kiosk – Shop-Karten Buttons', () => {

  test('Details-Button öffnet Detail-Modal mit Bestellinfos', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(3000);
    // Expand a slot group to find a Details button
    const headers = page.locator('.k-slot-header');
    const hCount = await headers.count();
    for (let i = 0; i < hCount; i++) {
      const h = headers.nth(i);
      const g = h.locator('..');
      if (await g.evaluate(el => el.classList.contains('collapsed'))) {
        await h.click();
        await page.waitForTimeout(300);
      }
    }
    const detailBtns = page.locator('button[onclick*="showOrderDetail"]');
    if (await detailBtns.count() === 0) {
      test.skip(true, 'Keine Bestellungen mit Details-Button');
      return;
    }
    await detailBtns.first().click();
    await page.waitForSelector('#modal-detail.open', { state: 'attached', timeout: 5000 });
    const body = await page.locator('#detail-body').textContent();
    expect(body).toContain('Kunde');
    expect(body).toContain('Nr.');
  });

  test('API liefert gepackt-Feld für Shop-Bestellungen', async ({ request }) => {
    const response = await request.get(`${BASE}/api/shop-order?mode=cms`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    if (data.orders.length > 0) {
      for (const order of data.orders) {
        expect(typeof order.gepackt).toBe('boolean');
      }
    }
  });

  test('Ungepackte Bereit-Bestellung zeigt Packen statt Ausgeben', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(3000);
    const hasUnpackedBereit = await page.evaluate(() => {
      if (typeof _allShopOrders === 'undefined') return false;
      return _allShopOrders.some(o => o.status === 2 && !o.gepackt);
    });
    if (hasUnpackedBereit) {
      // Expand all groups to see buttons
      const headers = page.locator('.k-slot-header');
      for (let i = 0; i < await headers.count(); i++) {
        const g = headers.nth(i).locator('..');
        if (await g.evaluate(el => el.classList.contains('collapsed'))) {
          await headers.nth(i).click();
        }
      }
      await page.waitForTimeout(500);
      const panelHtml = await page.locator('#panel-abhol').innerHTML();
      expect(panelHtml).toContain('Packen');
    }
  });
});

// ════════════════════════════════════════════════════
//  Detail-Modal Preise
// ════════════════════════════════════════════════════

test.describe('Kiosk – Detail-Modal Preise', () => {

  test('Shop-Bestellung Detail zeigt Einzelpreise > 0€', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForTimeout(3000);
    // Expand all groups
    const headers = page.locator('.k-slot-header');
    for (let i = 0; i < await headers.count(); i++) {
      const g = headers.nth(i).locator('..');
      if (await g.evaluate(el => el.classList.contains('collapsed'))) {
        await headers.nth(i).click();
      }
    }
    await page.waitForTimeout(300);
    const detailBtns = page.locator('button[onclick*="showOrderDetail"]');
    if (await detailBtns.count() === 0) {
      test.skip(true, 'Keine Bestellungen');
      return;
    }
    await detailBtns.first().click();
    await page.waitForSelector('#modal-detail.open', { state: 'attached', timeout: 5000 });
    const priceTexts = await page.locator('#detail-body td:nth-child(4)').allTextContents();
    const gesamtText = await page.locator('#detail-body tfoot td:last-child').textContent();
    if (!gesamtText.includes('0,00')) {
      const allZero = priceTexts.every(t => t.trim() === '0,00€');
      expect(allZero).toBe(false);
    }
  });
});

// ════════════════════════════════════════════════════
//  Nachrichten-Gelesen (Dataverse-basiert)
// ════════════════════════════════════════════════════

test.describe('Kiosk – Nachrichten-Gelesen', () => {

  test('API liefert kommentar_gelesen Boolean für alle Bestellungen', async ({ request }) => {
    const response = await request.get(`${BASE}/api/lunch-order`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.orders.length).toBeGreaterThan(0);
    for (const order of data.orders) {
      expect(typeof order.kommentar_gelesen).toBe('boolean');
    }
  });

  test('Badge-Zähler stimmt mit ungelesenen Kommentaren überein', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.click('.k-tab[data-tab="mittag"]');
    await page.waitForTimeout(3000);
    const badge = page.locator('[data-mt-filter="nachrichten"]');
    await expect(badge).toBeAttached();
    const unreadCount = await page.evaluate(() => {
      if (typeof orders === 'undefined') return -1;
      return orders.filter(o => o.kunde_kommentar && o.status !== 2 && !o.kommentar_gelesen).length;
    });
    if (unreadCount > 0) {
      const badgeText = await badge.textContent();
      expect(badgeText).toContain(String(unreadCount));
    }
  });

  test('API mode=unread_messages liefert unread_count', async ({ request }) => {
    const response = await request.get(`${BASE}/api/lunch-order?mode=unread_messages`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(typeof data.unread_count).toBe('number');
    expect(data.unread_count).toBeGreaterThanOrEqual(0);
  });

  test('Tab-Badge zeigt Summe aus neuen Bestellungen (heute) + ungelesene Nachrichten', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.click('.k-tab[data-tab="mittag"]');
    // Wait for loadMittagBadge to complete
    await page.waitForTimeout(3000);

    // Get today's new orders via API
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRes = await page.request.get(`${BASE}/api/lunch-order?datum=${todayStr}&status=0`);
    const todayData = await todayRes.json();
    const todayNew = todayData.success ? (todayData.orders || []).length : 0;

    // Get unread messages via API
    const msgRes = await page.request.get(`${BASE}/api/lunch-order?mode=unread_messages`);
    const msgData = await msgRes.json();
    const unreadMsgs = msgData.success ? (msgData.unread_count || 0) : 0;

    const expectedTotal = todayNew + unreadMsgs;
    const badge = page.locator('#badge-mittag');

    if (expectedTotal > 0) {
      await expect(badge).toHaveClass(/show/);
      const badgeText = await badge.textContent();
      expect(parseInt(badgeText)).toBe(expectedTotal);
    } else {
      await expect(badge).not.toHaveClass(/show/);
    }
  });

  test('Klick auf Badge sendet PATCH mit kommentar_gelesen: true', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.click('.k-tab[data-tab="mittag"]');
    await page.waitForTimeout(3000);
    const unreadCount = await page.evaluate(() => {
      if (typeof orders === 'undefined') return 0;
      return orders.filter(o => o.kunde_kommentar && o.status !== 2 && !o.kommentar_gelesen).length;
    });
    if (unreadCount > 0) {
      const patchRequests = [];
      page.on('request', r => {
        if (r.url().includes('/api/lunch-order/') && r.method() === 'PATCH') {
          patchRequests.push(r);
        }
      });
      await page.click('[data-mt-filter="nachrichten"]');
      await page.waitForTimeout(2000);
      expect(patchRequests.length).toBe(unreadCount);
      for (const req of patchRequests) {
        const body = JSON.parse(req.postData());
        expect(body.kommentar_gelesen).toBe(true);
      }
      // After marking: 0 unread
      const stillUnread = await page.evaluate(() => {
        return orders.filter(o => o.kunde_kommentar && o.status !== 2 && !o.kommentar_gelesen).length;
      });
      expect(stillUnread).toBe(0);
    }
  });
});

// ════════════════════════════════════════════════════
//  Info vs. Actions Design
// ════════════════════════════════════════════════════

test.describe('Kiosk – Info vs Actions Design', () => {

  test('Stats sind flacher Text ohne box-shadow', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="mittag"]').click();
    await page.waitForTimeout(2000);
    const stat = page.locator('#mittag-stats .k-stat').first();
    if (await stat.count() > 0) {
      const shadow = await stat.evaluate(el => getComputedStyle(el).boxShadow);
      expect(shadow === 'none' || shadow === '').toBeTruthy();
      const bg = await stat.evaluate(el => getComputedStyle(el).background);
      expect(bg).not.toContain('rgb(255, 255, 255)');
    }
  });

  test('Stats verwenden Dot-Separatoren', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="mittag"]').click();
    await page.waitForTimeout(2000);
    const dots = page.locator('#mittag-stats .k-stat-dot');
    const stats = page.locator('#mittag-stats .k-stat');
    const statCount = await stats.count();
    if (statCount > 1) {
      const dotCount = await dots.count();
      expect(dotCount).toBe(statCount - 1);
    }
  });

  test('Filter-Tabs haben border-bottom statt border/border-radius', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const filterBar = page.locator('#abhol-filter-bar');
    const borderBottom = await filterBar.evaluate(el => getComputedStyle(el).borderBottomStyle);
    expect(borderBottom).toBe('solid');
    const activeBtn = page.locator('#abhol-filter-bar .k-filter-btn.active');
    const btnBorder = await activeBtn.evaluate(el => getComputedStyle(el).borderBottomColor);
    // Should be green (not transparent)
    expect(btnBorder).not.toBe('rgba(0, 0, 0, 0)');
    const btnBg = await activeBtn.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(btnBg).toBe('rgba(0, 0, 0, 0)');
  });

  test('Tagesauswahl verwendet k-day-pill Klasse', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="mittag"]').click();
    await page.waitForSelector('#mittag-day-bar button');
    const pills = page.locator('#mittag-day-bar .k-day-pill');
    await expect(pills).toHaveCount(7);
    const activePill = page.locator('#mittag-day-bar .k-day-pill.active');
    const bg = await activePill.evaluate(el => getComputedStyle(el).backgroundColor);
    // Active pill should have green background
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('Bestellquellen-Labels haben keinen Hintergrund', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="mittag"]').click();
    await page.waitForTimeout(2000);
    const srcLabels = page.locator('.k-order-src');
    if (await srcLabels.count() > 0) {
      const bg = await srcLabels.first().evaluate(el => getComputedStyle(el).backgroundColor);
      expect(bg).toBe('rgba(0, 0, 0, 0)');
    }
  });
});

// ════════════════════════════════════════════════════
//  Kompakte Buttons (Mobile)
// ════════════════════════════════════════════════════

test.describe('Kiosk – Kompakte Buttons', () => {

  test('k-btn-sm Buttons sind ≤32px hoch', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="mittag"]').click();
    await page.waitForTimeout(2000);
    const smBtns = page.locator('.k-btn-sm');
    const count = await smBtns.count();
    if (count === 0) {
      test.skip(true, 'Keine k-btn-sm sichtbar');
      return;
    }
    const firstBtn = smBtns.first();
    const minHeight = await firstBtn.evaluate(el => parseFloat(getComputedStyle(el).minHeight));
    expect(minHeight).toBeLessThanOrEqual(32);
  });
});
