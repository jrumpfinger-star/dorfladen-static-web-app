/**
 * Stammkunden Tests – Playwright
 * 
 * API-Tests + UI-Tests für die Stammkunden-Verwaltung.
 * Entity: dl_stammkunde (Dataverse)
 * API: /api/stammkunden
 * UI: kiosk.html → Tab "Stammkunden"
 * 
 * Ausführen:
 *   npx playwright test tests/stammkunden.spec.js
 */

const { test, expect } = require('@playwright/test');

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const API = `${BASE}/api`;
const KIOSK_URL = `${BASE}/kiosk`;

// Unique suffix to avoid collisions between test runs
const TS = Date.now();
const TEST_NACHNAME = `Testkundeauto${TS}`;
const TEST_VORNAME = 'PW';
const TEST_PHONE = `0800${TS.toString().slice(-7)}`;

// ════════════════════════════════════════════════════
//  API Tests – /api/stammkunden
// ════════════════════════════════════════════════════

test.describe('Stammkunden API', () => {

  test('SK-API-01: GET /api/stammkunden erreichbar und gibt JSON zurück', async ({ request }) => {
    const res = await request.get(`${API}/stammkunden`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('customers');
    expect(Array.isArray(body.customers)).toBeTruthy();
  });

  test('SK-API-02: POST neuen Stammkunden anlegen', async ({ request }) => {
    const res = await request.post(`${API}/stammkunden`, {
      data: {
        nachname: TEST_NACHNAME,
        vorname: TEST_VORNAME,
        telefon: TEST_PHONE,
        email: `test-${TS}@example.com`,
        notiz: 'Playwright-Testdaten – kann gelöscht werden'
      }
    });
    // 201 Created or 409 if already exists
    expect([201, 409]).toContain(res.status());
    const body = await res.json();
    if (res.status() === 201) {
      expect(body.success).toBeTruthy();
      expect(body.customer).toBeTruthy();
      expect(body.customer.name).toContain(TEST_NACHNAME);
      expect(body.customer.stammkunde_nr).toBeTruthy();
    } else {
      // 409 = duplicate
      expect(body.existing).toBeTruthy();
    }
  });

  test('SK-API-03: POST ohne Name schlägt fehl (400)', async ({ request }) => {
    const res = await request.post(`${API}/stammkunden`, {
      data: { telefon: '12345' }
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBeFalsy();
    expect(body.errors).toBeTruthy();
  });

  test('SK-API-04: GET Suche findet angelegten Kunden', async ({ request }) => {
    // Create first
    await request.post(`${API}/stammkunden`, {
      data: { nachname: TEST_NACHNAME, vorname: TEST_VORNAME, telefon: TEST_PHONE }
    });
    // Search
    const res = await request.get(`${API}/stammkunden?q=${TEST_NACHNAME}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBeTruthy();
    const found = body.customers.find(c => c.nachname === TEST_NACHNAME || c.name.includes(TEST_NACHNAME));
    expect(found).toBeTruthy();
  });

  test('SK-API-05: GET Suche nach Telefon findet Kunden', async ({ request }) => {
    const res = await request.get(`${API}/stammkunden?q=${TEST_PHONE}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBeTruthy();
    expect(body.customers.length).toBeGreaterThanOrEqual(1);
  });

  test('SK-API-05b: GET Suche nach Vorname findet Kunden', async ({ request }) => {
    const res = await request.get(`${API}/stammkunden?q=${TEST_VORNAME}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBeTruthy();
    const found = body.customers.find(c => (c.vorname || '').includes(TEST_VORNAME));
    expect(found).toBeTruthy();
  });

  test('SK-API-05c: GET Suche nach Nachname findet Kunden', async ({ request }) => {
    const res = await request.get(`${API}/stammkunden?q=${TEST_NACHNAME}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBeTruthy();
    const found = body.customers.find(c => (c.nachname || '').includes(TEST_NACHNAME));
    expect(found).toBeTruthy();
  });

  test('SK-API-05d: GET Suche nach E-Mail findet Kunden', async ({ request }) => {
    const res = await request.get(`${API}/stammkunden?q=test-${TS}@example`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBeTruthy();
    expect(body.customers.length).toBeGreaterThanOrEqual(1);
  });

  test('SK-API-06: PATCH Kunden aktualisieren', async ({ request }) => {
    // Find the customer first
    const search = await request.get(`${API}/stammkunden?q=${TEST_NACHNAME}`);
    const searchBody = await search.json();
    const customer = searchBody.customers && searchBody.customers[0];
    if (!customer) {
      test.skip(true, 'Testkunde nicht gefunden – vorherigen Test prüfen');
      return;
    }
    const res = await request.patch(`${API}/stammkunden/${customer.id}`, {
      data: { notiz: `Aktualisiert ${new Date().toISOString()}` }
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBeTruthy();
  });

  test('SK-API-07: DELETE (Soft-Delete) deaktiviert Kunden', async ({ request }) => {
    // Find the test customer
    const search = await request.get(`${API}/stammkunden?q=${TEST_NACHNAME}`);
    const searchBody = await search.json();
    const customer = searchBody.customers && searchBody.customers[0];
    if (!customer) {
      test.skip(true, 'Testkunde nicht gefunden');
      return;
    }
    const res = await request.delete(`${API}/stammkunden/${customer.id}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBeTruthy();
    // Verify: should not appear in active list
    const verify = await request.get(`${API}/stammkunden?q=${TEST_NACHNAME}`);
    const verifyBody = await verify.json();
    const stillActive = verifyBody.customers.find(c => c.id === customer.id);
    expect(stillActive).toBeFalsy();
  });

  test('SK-API-08: Duplikat-Erkennung (409)', async ({ request }) => {
    const data = {
      nachname: 'DuplikatTest' + TS,
      vorname: 'PW',
      telefon: '0800' + TS.toString().slice(-7)
    };
    // Create first
    const r1 = await request.post(`${API}/stammkunden`, { data });
    expect([201, 409]).toContain(r1.status());
    // Try again – should be 409
    const r2 = await request.post(`${API}/stammkunden`, { data });
    expect(r2.status()).toBe(409);
    const body = await r2.json();
    expect(body.existing).toBeTruthy();

    // Cleanup: soft-delete
    const id = body.existing.id || (await r1.json()).customer?.id;
    if (id) await request.delete(`${API}/stammkunden/${id}`);
  });
});

// ════════════════════════════════════════════════════
//  UI Tests – Kiosk Stammkunden-Tab
// ════════════════════════════════════════════════════

test.describe('Stammkunden UI – Kiosk', () => {

  test('SK-UI-01: Stammkunden-Tab öffnet sich', async ({ page }) => {
    await page.goto(KIOSK_URL);
    const tab = page.locator('.k-tab[data-tab="kunden"]');
    await tab.click();
    await expect(page.locator('#kunden-search')).toBeVisible();
  });

  test('SK-UI-02: "Alle Kunden laden" Button vorhanden', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="kunden"]').click();
    const loadAllBtn = page.getByRole('button', { name: /Alle Kunden laden/ });
    await expect(loadAllBtn).toBeVisible();
  });

  test('SK-UI-03: "Neuer Kunde" Button vorhanden', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="kunden"]').click();
    const newBtn = page.locator('text=Neuer Kunde');
    await expect(newBtn).toBeVisible();
  });

  test('SK-UI-04: Alle Kunden laden – Liste wird gefüllt', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="kunden"]').click();
    // Click "Alle Kunden laden"
    await page.getByRole('button', { name: /Alle Kunden laden/ }).click();
    // Wait for API response
    await page.waitForResponse(r => r.url().includes('/api/stammkunden'));
    await page.waitForTimeout(500);
    // Check if list has content (either customers or "Keine Kunden" message)
    const listContent = await page.locator('#kunden-list').innerHTML();
    expect(listContent.length).toBeGreaterThan(0);
  });

  test('SK-UI-05: Suche filtert Kunden', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="kunden"]').click();
    const searchInput = page.locator('#kunden-search');
    await searchInput.fill('test');
    // Wait for debounced search
    await page.waitForResponse(r => r.url().includes('/api/stammkunden'));
    await page.waitForTimeout(500);
    const listContent = await page.locator('#kunden-list').innerHTML();
    expect(listContent.length).toBeGreaterThan(0);
  });

  test('SK-UI-06: Neuer Kunde Modal öffnet sich', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="kunden"]').click();
    await page.locator('text=Neuer Kunde').click();
    await expect(page.locator('#modal-kunde')).toBeVisible();
    await expect(page.locator('#nk-nachname')).toBeVisible();
    await expect(page.locator('#nk-vorname')).toBeVisible();
    await expect(page.locator('#nk-phone')).toBeVisible();
  });

  test('SK-UI-07: Neuer Kunde – Validierung Pflichtfelder', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="kunden"]').click();
    await page.locator('text=Neuer Kunde').click();
    // Submit without filling anything
    await page.locator('#modal-kunde button:has-text("Kunde anlegen")').click();
    // Should show error toast with "Nachname"
    await expect(page.locator('#k-toast')).toContainText('Nachname');
  });

  test('SK-UI-08: Neuer Kunde anlegen (E2E)', async ({ page }) => {
    const uiTs = Date.now();
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="kunden"]').click();
    await page.locator('text=Neuer Kunde').click();
    await page.locator('#nk-nachname').fill('UITest' + uiTs);
    await page.locator('#nk-vorname').fill('PW');
    await page.locator('#nk-phone').fill('0800' + uiTs.toString().slice(-7));
    await page.locator('#modal-kunde button:has-text("Kunde anlegen")').click();
    // Should show success toast
    await expect(page.locator('#k-toast')).toContainText('angelegt');
    // Modal should close
    await page.waitForTimeout(500);
    await expect(page.locator('#modal-kunde')).not.toBeVisible();
  });

  test('SK-UI-09: Kundenkarte zeigt Bestellen-Button', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.locator('.k-tab[data-tab="kunden"]').click();
    await page.getByRole('button', { name: /Alle Kunden laden/ }).click();
    await page.waitForResponse(r => r.url().includes('/api/stammkunden'));
    await page.waitForTimeout(500);
    const orderBtn = page.locator('text=Bestellen').first();
    if (await orderBtn.count() > 0) {
      await expect(orderBtn).toBeVisible();
    } else {
      test.skip(true, 'Keine Stammkunden vorhanden für Bestellen-Test');
    }
  });
});
