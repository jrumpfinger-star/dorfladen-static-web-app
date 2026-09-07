// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Mittagstisch – Bestellstatus sichtbar und einheitlich.
 * Spec: specs/mittagstisch-bestellstatus/spec.md
 *
 * Alle API-Aufrufe sind abgefangen; es wird nichts gespeichert oder versendet.
 * Wichtig: serviceWorkers blockieren, sonst beantwortet der Service Worker
 * der PWA die API-Aufrufe aus dem Cache.
 */

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const LOKAL = /localhost|127\.0\.0\.1/.test(BASE);
const KIOSK_URL = LOKAL ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

function heute() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

const GERICHT = 'Chicken Teriyaki mit Reis oder Pommes';

/** @param {any[]} extra */
function bestellungen(extra) {
  const basis = [
    { id: 'o1', name: 'Mich Sedlmaier', gericht: GERICHT, menge: 2, preis: 9.8, status: 1, quelle: 0 },
    { id: 'o2', name: 'Oliver', gericht: GERICHT, menge: 1, preis: 9.8, status: 1, quelle: 0 },
    { id: 'o3', name: 'Martl', gericht: GERICHT, menge: 1, preis: 9.8, status: 3, quelle: 1 },
    { id: 'o4', name: 'Elo', gericht: GERICHT, menge: 2, preis: 9.8, status: 2, quelle: 0 },
  ];
  return basis.concat(extra || []).map((o) =>
    Object.assign({ datum: heute(), mitnehmen: false, anmerkung: '', kommentar_gelesen: true, verlauf: [] }, o)
  );
}

async function mockApi(page, orders) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const json = (o) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
    if (url.includes('/api/cms-config')) {
      return json({ success: true, data: { feature_flags: { kiosk_mittag: true } } });
    }
    if (url.includes('mode=unread_messages')) return json({ success: true, unread_count: 0 });
    if (url.includes('mode=messages')) return json({ success: true, orders: [] });
    if (url.includes('/api/lunch-order')) return json({ success: true, orders });
    return json({ success: true, orders: [], data: [] });
  });
}

async function openMittag(page, orders) {
  await mockApi(page, orders);
  await page.goto(KIOSK_URL);
  await page.click('[data-tab="mittag"]');
  await page.waitForTimeout(1500);
}

test.describe('Mittagstisch: Status sichtbar und einheitlich', () => {
  test.use({ serviceWorkers: 'block' });

  test('TC-F1-01 Karte zeigt den Status als Text', async ({ page }) => {
    await openMittag(page, bestellungen([]));
    const karte = page.locator('#oc-o1');
    await expect(karte).toBeVisible();
    await expect(karte.locator('.k-order-st')).toHaveText('Bestätigt');
  });

  test('TC-F1-02 Telefonbestellung zeigt Quelle UND Status', async ({ page }) => {
    await openMittag(page, bestellungen([]));
    await page.click('[data-mt-filter="erledigt"]');
    await page.waitForTimeout(400);
    const karte = page.locator('#oc-o3');
    await expect(karte).toBeVisible();
    await expect(karte.locator('.k-order-src')).toHaveText('Telefon');
    await expect(karte.locator('.k-order-st')).toHaveText('Abgeholt');
  });

  test('TC-F2-01 Bestellung ohne Status landet unter Offen mit Knöpfen', async ({ page }) => {
    // status:null – genau der Fall, der bisher durch jeden Filter fiel
    await openMittag(page, bestellungen([
      { id: 'ox', name: 'Ohne Status', gericht: GERICHT, menge: 1, preis: 9.8, status: null, quelle: null },
    ]));
    const karte = page.locator('#oc-ox');
    await expect(karte).toBeVisible();
    await expect(karte.locator('.k-order-st')).toHaveText('Neu');
    // Eine neue Bestellung bekommt den Bestätigen-Knopf in der Kopfzeile
    await expect(karte.locator('.k-oc-actions .k-btn-confirm')).toBeVisible();
  });

  test('TC-F2-02 Offen + Erledigt + Storniert deckt alle Bestellungen ab', async ({ page }) => {
    await openMittag(page, bestellungen([
      { id: 'ox', name: 'Ohne Status', gericht: GERICHT, menge: 1, preis: 9.8, status: null, quelle: null },
    ]));
    const zahl = async (id) => parseInt(await page.locator('#' + id).innerText(), 10);
    const summe = (await zahl('mt-fc-offen')) + (await zahl('mt-fc-erledigt')) + (await zahl('mt-fc-storniert'));
    expect(summe).toBe(5);
  });

  test('TC-F2-03 Leere Quelle gilt als Online – Karte und Kochbedarf einig', async ({ page }) => {
    await openMittag(page, bestellungen([
      { id: 'ox', name: 'Ohne Quelle', gericht: GERICHT, menge: 1, preis: 9.8, status: 1, quelle: null },
    ]));
    await expect(page.locator('#oc-ox .k-order-src')).toHaveText('Online');
    // 2+1+1 online (o1,o2,ox) = 4 Portionen online, 1 telefonisch (o3)
    const kochbedarf = await page.locator('.k-cook-chips').first().innerText();
    expect(kochbedarf).toContain('4 online');
    expect(kochbedarf).toContain('1 telefonisch');
  });

  test('TC-F3-01 Gruppenzeile nennt Portionen und Bestellungen', async ({ page }) => {
    await openMittag(page, bestellungen([]));
    const zeile = await page.locator('.k-dish-sep-label').first().innerText();
    // Offen: o1 (2) + o2 (1) = 3 Portionen in 2 Bestellungen
    expect(zeile).toContain('3 Portionen');
    expect(zeile).toContain('2 Bestellungen');
  });

  test('TC-F3-02 Sonderwunsch-Leiste zieht sich nicht über die volle Breite', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'nur breite Ansicht');
    // Mit Anmerkung entsteht ein Sonderwunsch – erst dann erscheint die Leiste.
    await openMittag(page, bestellungen([
      { id: 'o9', name: 'Mit Wunsch', gericht: GERICHT, menge: 1, preis: 9.8, status: 1, quelle: 0, anmerkung: 'ohne Zwiebeln' },
    ]));
    const mass = await page.evaluate(() => {
      const b = document.querySelector('#mittag-sonder .k-sw-bar');
      if (!b) return null;
      return {
        leiste: b.getBoundingClientRect().width,
        bereich: b.parentElement.getBoundingClientRect().width,
      };
    });
    expect(mass).not.toBeNull();
    // Die Leiste richtet sich nach ihrem Inhalt, statt den Knopf ans
    // aeusserste Ende zu schieben.
    expect(mass.leiste).toBeLessThan(mass.bereich * 0.75);
    expect(mass.leiste).toBeGreaterThan(200);
  });

  test('TC-F4-01 Ohne Telefonbestellung ist der Schalter unsichtbar', async ({ page }) => {
    const nurOnline = bestellungen([]).filter((o) => o.quelle === 0);
    await openMittag(page, nurOnline);
    const btn = page.locator('#mt-src-toggle');
    await expect(btn).toHaveCount(1);
    await expect(btn).toBeHidden();
  });

  test('TC-F4-02 Schalter zeigt Anzahl und blendet Online aus', async ({ page }) => {
    await openMittag(page, bestellungen([]));
    const btn = page.locator('#mt-src-toggle');
    await expect(btn).toBeVisible();
    await expect(page.locator('#mt-fc-telefon')).toHaveText('1');
    // Telefonbestellung ist abgeholt -> unter "Alle" sichtbar machen
    await page.click('[data-mt-filter="alle"]');
    await page.waitForTimeout(400);
    await expect(page.locator('#oc-o1')).toBeVisible();
    await btn.click();
    await page.waitForTimeout(400);
    await expect(page.locator('#oc-o3')).toBeVisible();
    await expect(page.locator('#oc-o1')).toHaveCount(0);
  });

  test('TC-F4-03 Kochbedarf sagt "telefonisch", nicht "vor Ort"', async ({ page }) => {
    await openMittag(page, bestellungen([]));
    const kochbedarf = await page.locator('.k-cook-chips').first().innerText();
    expect(kochbedarf).toContain('telefonisch');
    expect(kochbedarf).not.toContain('vor Ort');
  });

  test('TC-F5-01 Telefondialog nennt den entstehenden Status', async ({ page }) => {
    await openMittag(page, bestellungen([]));
    const hinweis = page.locator('#no-status-hinweis');
    await expect(hinweis).toHaveCount(1);
    await expect(hinweis).toContainText('Best');
    await expect(hinweis).toContainText('Abgeholt');
  });
});
