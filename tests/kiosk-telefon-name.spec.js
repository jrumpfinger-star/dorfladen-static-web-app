/**
 * Kiosk – Telefonbestellung mit freiem Namen
 *
 * Deckt specs/telefon-freier-name/spec.md ab (TC-T01 … TC-T07).
 *
 * Am Telefon steht der Anrufer oft nicht in der Kartei. Bisher kam dann
 * „Bitte zuerst einen Kunden auswählen" und es ging nicht weiter.
 *
 * Ausführen:
 *   node node_modules\@playwright\test\cli.js test tests/kiosk-telefon-name.spec.js
 */

const { test, expect } = require('@playwright/test');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

function heute() {
  const d = new Date();
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)
    + '-' + ('0' + d.getDate()).slice(-2);
}

/* Wochentag als Dataverse-Wert: 101000 = Montag … 101005 = Samstag.
   Sonntag hat keinen — dann greift im Kiosk der Rückfall auf alle. */
function wochentagWert() {
  const t = new Date().getDay();
  return t === 0 ? 101000 : 100999 + t;
}

const GERICHT = {
  dl_gericht: 'Hähnchenbrustfilet mit Currysoße und Reis',
  dl_preis: 9.8,
  dl_datum: heute(),
  dl_wochentag: wochentagWert(),
  dl_wochenplanid: 'wp-1',
};

/** Sammelt die Rümpfe aller Bestellungen und Kundenanlagen. */
function sammle(page) {
  const raus = { orders: [], kunden: [] };
  page.on('request', (r) => {
    if (r.method() !== 'POST') return;
    let leib = {};
    try { leib = JSON.parse(r.postData() || '{}'); } catch (e) { /* egal */ }
    if (/lunch-order/.test(r.url())) raus.orders.push(leib);
    if (/stammkunden/.test(r.url())) raus.kunden.push(leib);
  });
  return raus;
}

async function mockApi(page, opts = {}) {
  const j = (o, st) => ({ status: st || 200, contentType: 'application/json',
    body: JSON.stringify(o) });

  await page.route('**/api/stammkunden**', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill(j({ success: true,
        customer: { id: 'neu-1', name: 'Neu Kunde', telefon: '' } }, 201));
    }
    return route.fulfill(j({ success: true, customers: opts.kunden || [] }));
  });

  await page.route('**/api/lunch-order**', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill(j({ success: true, bestellnummer: 'B-4711' }, 201));
    }
    return route.fulfill(j({ success: true, orders: [] }));
  });

  await page.route('**/api/wochenplan**', (route) =>
    route.fulfill(j({ success: true, data: [GERICHT] })));

  await page.route('**/api/**', (route) => {
    const u = route.request().url();
    if (/stammkunden|lunch-order|wochenplan/.test(u)) return route.fallback();
    return route.fulfill(j({ success: true }));
  });
}

/** Kiosk öffnen, Mittagstisch wählen und den Dialog „Neue Bestellung" zeigen.
 *  Umgeschaltet wird über switchTab statt per Klick: Ohne Freigaben aus
 *  /api/cms-config ist der Reiter ausgeblendet und nicht anklickbar.
 *
 *  Die Uhr wird auf den Vormittag gestellt. Der Kiosk verweigert die
 *  Neubestellung ab 12:00 Uhr für den heutigen Tag (_isMittagCutoff) - ohne
 *  feste Uhrzeit wäre dieser Wächter nur vormittags grün und ab Mittag rot,
 *  ohne dass sich am Programm etwas geändert hätte. setFixedTime lässt die
 *  Zeitgeber weiterlaufen und stellt nur Date.now() fest. */
async function oeffneDialog(page, opts = {}) {
  await page.clock.setFixedTime(new Date('2026-03-04T09:30:00'));
  await mockApi(page, opts);
  await page.goto(KIOSK_URL);
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.K.switchTab('mittag'));
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.K.openNewOrder());
  await page.locator('#no-kunde-search').waitFor({ state: 'visible', timeout: 8000 });
  await page.waitForTimeout(600);
}

/** Ein Gericht wählen — ohne das sendet der Kiosk grundsätzlich nicht. */
async function waehleGericht(page) {
  const opt = page.locator('#no-dishes .k-dish-opt').first();
  if (await opt.count()) await opt.click();
  await page.waitForTimeout(200);
}

test.describe('Telefonbestellung mit freiem Namen', () => {
  test('TC-T01/T02: Ein frei eingetippter Name genügt, ohne Kundenanlage',
    async ({ page }) => {
      await oeffneDialog(page);
      const g = sammle(page);
      await waehleGericht(page);
      await page.locator('#no-kunde-search').fill('Frau Huber vom Berg');
      await page.evaluate(() => window.K.submitNewOrder());
      await page.waitForTimeout(900);

      expect(g.orders.length).toBe(1);
      expect(g.orders[0].name).toBe('Frau Huber vom Berg');
      expect(g.orders[0].stammkunde_id).toBe('');
      // Es darf dabei KEIN Kunde angelegt worden sein.
      expect(g.kunden.length).toBe(0);
    });

  test('TC-T03: Ohne Namen und ohne Kunde wird nichts gesendet',
    async ({ page }) => {
      await oeffneDialog(page);
      const g = sammle(page);
      await waehleGericht(page);
      await page.evaluate(() => window.K.submitNewOrder());
      await page.waitForTimeout(700);
      expect(g.orders.length).toBe(0);
    });

  test('TC-T04: Ohne Gericht wird nichts gesendet', async ({ page }) => {
    await oeffneDialog(page);
    const g = sammle(page);
    await page.evaluate(() => { window.K.pickDish; });
    await page.evaluate(() => { /* kein Gericht waehlen */ });
    await page.locator('#no-kunde-search').fill('Ohne Gericht');
    // Die Auswahl zuruecksetzen, falls nur ein Gericht automatisch gewaehlt wurde.
    await page.evaluate(() => { try { window._noDishes = []; } catch (e) {} });
    await page.evaluate(() => {
      // selectedDish liegt im Modul; ueber pickDish mit ungueltigem Index leeren
      try { window.K.pickDish(999); } catch (e) { /* erwartet */ }
    });
    await page.evaluate(() => window.K.submitNewOrder());
    await page.waitForTimeout(700);
    expect(g.orders.length).toBe(0);
  });

  test('TC-T05: „Nur für diese Bestellung" steht vor der Neuanlage',
    async ({ page }) => {
      await oeffneDialog(page);
      await page.locator('#no-kunde-search').fill('Unbekannt');
      await page.locator('#no-kunde-results.show').waitFor({ timeout: 8000 });
      await page.locator('#no-kunde-results .si-frei').waitFor({ timeout: 8000 });

      const reihe = await page.evaluate(() => {
        const el = document.getElementById('no-kunde-results');
        return Array.from(el.querySelectorAll('.k-search-item'))
          .map((x) => x.className);
      });
      expect(reihe.length).toBe(2);
      expect(reihe[0]).toContain('si-frei');
      expect(reihe[1]).toContain('si-new');
    });

  test('TC-T06: Der Vorschlag übernimmt den Namen und nennt den Grund',
    async ({ page }) => {
      await oeffneDialog(page);
      await page.locator('#no-kunde-search').fill('Herr Meier');
      await page.locator('#no-kunde-results .si-frei').waitFor({ timeout: 8000 });
      await page.locator('#no-kunde-results .si-frei').click();
      await page.waitForTimeout(400);
      await expect(page.locator('#no-kunde-name')).toHaveText('Herr Meier');
      await expect(page.locator('#no-kunde-phone'))
        .toHaveText(/ohne Kundenkartei/);
    });

  test('TC-T07: Ein gewählter Stammkunde sendet weiterhin Id und Nummer',
    async ({ page }) => {
      await oeffneDialog(page, { kunden: [
        { id: 'sk-9', name: 'Anna Bauer', telefon: '08031 12345' },
      ] });
      const g = sammle(page);
      await waehleGericht(page);
      await page.locator('#no-kunde-search').fill('Anna');
      await page.locator('#no-kunde-results .k-search-item').first()
        .waitFor({ timeout: 8000 });
      await page.locator('#no-kunde-results .k-search-item').first().click();
      await page.waitForTimeout(400);
      await page.evaluate(() => window.K.submitNewOrder());
      await page.waitForTimeout(900);

      expect(g.orders.length).toBe(1);
      expect(g.orders[0].name).toBe('Anna Bauer');
      expect(g.orders[0].stammkunde_id).toBe('sk-9');
      expect(g.orders[0].telefon).toBe('08031 12345');
      expect(g.kunden.length).toBe(0);
    });
});
