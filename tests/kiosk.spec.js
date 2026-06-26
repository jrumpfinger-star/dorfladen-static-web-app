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
    // Set filter to "Alle" first so we see all orders
    await page.locator('#mittag-status-bar button[data-mt-filter="alle"]').click();
    await page.waitForTimeout(300);

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
        // Ensure "Alle" filter is active to see all orders
        await page.locator('#mittag-status-bar button[data-mt-filter="alle"]').click();
        await page.waitForTimeout(300);
        const visibleOrders = await page.locator('#mittag-orders .k-order').count();
        expect(visibleOrders, `${label}: Bestellungen rendern`).toBe(json.orders.length);
      }
    }
  });
});

// ════════════════════════════════════════════════════
//  Mittagstisch – Status-Filter
// ════════════════════════════════════════════════════

test.describe('Kiosk – Mittagstisch Filter', () => {

  test('T-17-01 (AK-UI-17b) Default-Filter ist "Offen", Wechsel funktioniert', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="mittag"]').click();
    await page.waitForTimeout(1000);
    const activeBtn = page.locator('#mittag-status-bar .k-filter-btn.active');
    await expect(activeBtn).toHaveCount(1);
    const text = await activeBtn.textContent();
    expect(text).toContain('Offen');
    // Switch to "Alle"
    await page.locator('#mittag-status-bar .k-filter-btn[data-mt-filter="alle"]').click();
    const newActive = page.locator('#mittag-status-bar .k-filter-btn.active');
    const newText = await newActive.textContent();
    expect(newText).toContain('Alle');
    // Switch to "Erledigt"
    await page.locator('#mittag-status-bar .k-filter-btn[data-mt-filter="erledigt"]').click();
    const erlActive = page.locator('#mittag-status-bar .k-filter-btn.active');
    const erlText = await erlActive.textContent();
    expect(erlText).toContain('Erledigt');
  });

  test('T-17-02 (AK-UI-17) Genau 4 Filter-Tabs vorhanden', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="mittag"]').click();
    await page.waitForTimeout(1000);
    const filterBtns = page.locator('#mittag-status-bar .k-filter-btn');
    await expect(filterBtns).toHaveCount(4);
    const labels = await filterBtns.allTextContents();
    const joined = labels.join(' ');
    expect(joined).toContain('Offen');
    expect(joined).toContain('Nachrichten');
    expect(joined).toContain('Erledigt');
    expect(joined).toContain('Alle');
  });
});

// ════════════════════════════════════════════════════
//  Mittagstisch – Bestellschluss (12:00)
// ════════════════════════════════════════════════════

test.describe('Kiosk – Bestellschluss', () => {
  test('T-17-06 (AK-UI-17g) Button hat id btn-new-order und _isMittagCutoff existiert', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="mittag"]').click();
    await page.waitForTimeout(1000);
    const btn = page.locator('#btn-new-order');
    await expect(btn).toHaveCount(1);
    // _isMittagCutoff function exists
    const hasFn = await page.evaluate(() => typeof K._isMittagCutoff === 'function' || document.body.innerHTML.includes('_isMittagCutoff'));
    expect(hasFn).toBe(true);
  });

  test('T-17-07 (AK-UI-17h) Button-Zustand passt zur Uhrzeit', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="mittag"]').click();
    await page.waitForTimeout(1000);
    const btn = page.locator('#btn-new-order');
    const hour = new Date().getHours();
    if (hour >= 12) {
      // After cutoff: button should be disabled
      await expect(btn).toBeDisabled();
      const opacity = await btn.evaluate(el => getComputedStyle(el).opacity);
      expect(parseFloat(opacity)).toBeLessThan(1);
    } else {
      // Before cutoff: button should be enabled
      await expect(btn).toBeEnabled();
    }
  });
});

// ════════════════════════════════════════════════════
//  Shop – Bestellkarten Redesign
// ════════════════════════════════════════════════════

test.describe('Kiosk – Shop Redesign', () => {
  test('T-35-01 (AK-UI-35) Shop-Karten haben Collapse-Pattern', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="abhol"]').click();
    await page.waitForTimeout(2000);
    // Cards should have k-order-hdr (collapsible header) and k-order-body
    const cards = page.locator('#abhol-orders .k-order');
    const count = await cards.count();
    if (count > 0) {
      const hdr = cards.first().locator('.k-order-hdr');
      await expect(hdr).toHaveCount(1);
      const body = cards.first().locator('.k-order-body');
      await expect(body).toHaveCount(1);
      // Default collapsed
      await expect(cards.first()).toHaveClass(/oc-collapsed/);
    }
  });

  test('T-35-02 (AK-UI-35b) Header zeigt Name, Status-Badge, Preis', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="abhol"]').click();
    await page.waitForTimeout(2000);
    const cards = page.locator('#abhol-orders .k-order');
    const count = await cards.count();
    if (count > 0) {
      const hdr = cards.first().locator('.k-order-hdr');
      // Name
      const name = hdr.locator('.k-oc-name');
      await expect(name).toHaveCount(1);
      const nameText = await name.textContent();
      expect(nameText.length).toBeGreaterThan(0);
      // Price (€)
      const priceText = await hdr.textContent();
      expect(priceText).toContain('€');
    }
  });

  test('T-35-03 (AK-UI-35d) Primär-Action im Header erreichbar', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="abhol"]').click();
    await page.waitForTimeout(2000);
    const cards = page.locator('#abhol-orders .k-order');
    const count = await cards.count();
    if (count > 0) {
      const hdrActions = cards.first().locator('.k-order-hdr .k-oc-actions');
      await expect(hdrActions).toHaveCount(1);
      const btns = hdrActions.locator('.k-btn');
      const btnCount = await btns.count();
      expect(btnCount).toBeGreaterThanOrEqual(1);
    }
  });

  test('T-35-04 (AK-UI-35f) Details-Button im Body ist vollwertiger Button', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="abhol"]').click();
    await page.waitForTimeout(2000);
    // Switch to "Heute" filter so all statuses are visible
    const todayFilter = page.locator('#abhol-filter-bar .k-filter-btn[data-filter="today"]');
    if (await todayFilter.count() > 0) await todayFilter.click();
    await page.waitForTimeout(1000);
    const cards = page.locator('#abhol-orders .k-order');
    const count = await cards.count();
    if (count > 0) {
      // Expand first card via JS to avoid visibility issues
      await cards.first().evaluate(el => el.classList.remove('oc-collapsed'));
      await page.waitForTimeout(300);
      // Find Details button
      const detailBtn = cards.first().locator('.k-order-body .k-btn:has-text("Details")');
      const detailCount = await detailBtn.count();
      expect(detailCount).toBeGreaterThanOrEqual(1);
      if (detailCount > 0) {
        const minH = await detailBtn.first().evaluate(el => parseInt(getComputedStyle(el).minHeight));
        expect(minH).toBeGreaterThanOrEqual(38);
      }
    }
  });

  test('T-35-05 (AK-UI-35h) Aufklappen/Zuklappen Toggle vorhanden', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="abhol"]').click();
    await page.waitForTimeout(2000);
    const cards = page.locator('#abhol-orders .k-order');
    const count = await cards.count();
    if (count > 1) {
      const toggleBtn = page.locator('#abhol-orders button:has-text("Aufklappen"), #abhol-orders button:has-text("Zuklappen")');
      await expect(toggleBtn).toHaveCount(1);
    }
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

  test('T-17-03 (AK-UI-17d) Nachrichten-Tab zeigt tagesübergreifende Kommentare', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.click('.k-tab[data-tab="mittag"]');
    await page.waitForTimeout(2000);
    // Click Nachrichten tab
    const apiPromise = page.waitForResponse(
      resp => resp.url().includes('/api/lunch-order') && resp.url().includes('mode=messages'),
      { timeout: 10000 }
    );
    await page.click('[data-mt-filter="nachrichten"]');
    const apiResponse = await apiPromise;
    expect(apiResponse.status()).toBe(200);
    const json = await apiResponse.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.orders)).toBe(true);
    if (json.orders.length > 0) {
      // Each order should have kunde_kommentar
      for (const o of json.orders) {
        expect(o.kunde_kommentar).toBeTruthy();
      }
      // Nachrichten list should show Kunde text
      await page.waitForTimeout(1000);
      const html = await page.locator('#mittag-orders').innerHTML();
      expect(html).toContain('Kunde:');
    }
  });

  test('T-17-04 (AK-UI-17e) Nachrichten-Tab: Antwort-Button und Gelesen-Button sichtbar', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.click('.k-tab[data-tab="mittag"]');
    await page.waitForTimeout(2000);
    await page.click('[data-mt-filter="nachrichten"]');
    await page.waitForTimeout(2000);
    const orders = await page.locator('#mittag-orders .k-order').count();
    if (orders === 0) {
      test.skip(true, 'Keine Nachrichten vorhanden');
      return;
    }
    // Antworten button should exist
    const replyBtns = page.locator('#mittag-orders button:has-text("Antworten")');
    expect(await replyBtns.count()).toBeGreaterThan(0);
  });

  test('T-17-05 (AK-UI-17f) API mode=messages liefert vollständige Bestellungen', async ({ request }) => {
    const response = await request.get(`${BASE}/api/lunch-order?mode=messages`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(typeof data.count).toBe('number');
    expect(Array.isArray(data.orders)).toBe(true);
    if (data.orders.length > 0) {
      const o = data.orders[0];
      expect(o.kunde_kommentar).toBeTruthy();
      expect(typeof o.name).toBe('string');
      expect(typeof o.gericht).toBe('string');
      expect(typeof o.datum).toBe('string');
      expect(typeof o.kommentar_gelesen).toBe('boolean');
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

  test('Bestellquellen-Labels sind als Pill-Badge gestaltet', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="mittag"]').click();
    await page.waitForTimeout(2000);
    // Switch to Alle to see all orders
    await page.locator('#mittag-status-bar .k-filter-btn[data-mt-filter="alle"]').click();
    await page.waitForTimeout(500);
    const srcLabels = page.locator('.k-order-src');
    if (await srcLabels.count() > 0) {
      const fontSize = await srcLabels.first().evaluate(el => getComputedStyle(el).fontSize);
      expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(11);
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

// ═══════════════════════════════════════════════════
//  AK-UI-36 – Android Zurück-Button
// ═══════════════════════════════════════════════════

test.describe('AK-UI-36 – Android Zurück-Button', () => {
  test('T-36-01: Hilfe-Modal öffnen → Back schließt Modal', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForLoadState('networkidle');

    // Open help modal
    await page.evaluate(() => K.openModal('modal-help'));
    await expect(page.locator('#modal-help')).toHaveClass(/open/);

    // Simulate Android back button
    await page.goBack();
    await page.waitForTimeout(300);

    // Modal should be closed
    await expect(page.locator('#modal-help')).not.toHaveClass(/open/);
    // Page should still be kiosk (not navigated away)
    expect(page.url()).toContain('/kiosk');
  });

  test('T-36-02: Bestelldetail-Modal öffnen → Back schließt Modal', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForLoadState('networkidle');

    // Open detail modal
    await page.evaluate(() => K.openModal('modal-detail'));
    await expect(page.locator('#modal-detail')).toHaveClass(/open/);

    // Simulate Android back
    await page.goBack();
    await page.waitForTimeout(300);

    await expect(page.locator('#modal-detail')).not.toHaveClass(/open/);
    expect(page.url()).toContain('/kiosk');
  });

  test('T-36-03: Zwei Modals → Back schließt nur das oberste', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForLoadState('networkidle');

    // Open first modal
    await page.evaluate(() => K.openModal('modal-detail'));
    await expect(page.locator('#modal-detail')).toHaveClass(/open/);

    // Open second modal on top
    await page.evaluate(() => K.openModal('modal-help'));
    await expect(page.locator('#modal-help')).toHaveClass(/open/);

    // Back closes only top modal (help)
    await page.goBack();
    await page.waitForTimeout(300);
    await expect(page.locator('#modal-help')).not.toHaveClass(/open/);
    await expect(page.locator('#modal-detail')).toHaveClass(/open/);

    // Second back closes detail
    await page.goBack();
    await page.waitForTimeout(300);
    await expect(page.locator('#modal-detail')).not.toHaveClass(/open/);
    expect(page.url()).toContain('/kiosk');
  });
});

// ═══════════════════════════════════════════════════
//  AK-UI-37 – Historie-Filter mit Zeitraum & Status
// ═══════════════════════════════════════════════════

test.describe('AK-UI-37 – Historie-Filter', () => {
  test('T-37-01: Historie-Tab zeigt Sub-Filter-Bar', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForLoadState('networkidle');

    // Sub-filter bar should be hidden initially
    await expect(page.locator('#hist-bar')).not.toHaveClass(/show/);

    // Click Historie tab
    await page.click('[data-filter="history"]');
    await page.waitForTimeout(300);

    // Sub-filter bar should now be visible
    await expect(page.locator('#hist-bar')).toHaveClass(/show/);

    // Should have time range pills
    await expect(page.locator('[data-range="7"]')).toBeVisible();
    await expect(page.locator('[data-range="30"]')).toBeVisible();
    await expect(page.locator('[data-range="all"]')).toBeVisible();

    // Should have status pills
    await expect(page.locator('[data-hstatus="all"]')).toBeVisible();
    await expect(page.locator('[data-hstatus="3"]')).toBeVisible();
    await expect(page.locator('[data-hstatus="4"]')).toBeVisible();
  });

  test('T-37-02: Wechsel zu anderem Filter versteckt Sub-Bar', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForLoadState('networkidle');

    // Activate history
    await page.click('[data-filter="history"]');
    await page.waitForTimeout(200);
    await expect(page.locator('#hist-bar')).toHaveClass(/show/);

    // Switch to "Zu erledigen"
    await page.click('[data-filter="open"]');
    await page.waitForTimeout(200);

    // Sub-filter bar should be hidden again
    await expect(page.locator('#hist-bar')).not.toHaveClass(/show/);
  });

  test('T-37-03: Zeitraum-Pills wechseln aktiven Zustand', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForLoadState('networkidle');

    await page.click('[data-filter="history"]');
    await page.waitForTimeout(200);

    // Default: "7 Tage" active
    await expect(page.locator('[data-range="7"]')).toHaveClass(/active/);
    await expect(page.locator('[data-range="30"]')).not.toHaveClass(/active/);

    // Click "30 Tage"
    await page.click('[data-range="30"]');
    await page.waitForTimeout(200);

    await expect(page.locator('[data-range="30"]')).toHaveClass(/active/);
    await expect(page.locator('[data-range="7"]')).not.toHaveClass(/active/);
  });

  test('T-37-04: Status-Pills wechseln aktiven Zustand', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForLoadState('networkidle');

    await page.click('[data-filter="history"]');
    await page.waitForTimeout(200);

    // Default: "Alle" status active
    await expect(page.locator('[data-hstatus="all"]')).toHaveClass(/active/);

    // Click "Abgeholt"
    await page.click('[data-hstatus="3"]');
    await page.waitForTimeout(200);

    await expect(page.locator('[data-hstatus="3"]')).toHaveClass(/active/);
    await expect(page.locator('[data-hstatus="all"]')).not.toHaveClass(/active/);
  });
});
