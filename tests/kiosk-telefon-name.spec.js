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

const { test, expect } = require('./_kiosk-angemeldet');

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

  /* Der Bestellschluss kommt aus dem CMS. Ohne ihn bliebe `_mittagSchluss`
     leer und der Hinweis-Toast erschiene nie — der Wächter wäre blind.
     (Spec mittag-telefon-bestellschluss) */
  await page.route('**/api/cms-config**', (route) =>
    route.fulfill(j({ success: true,
      data: { bestellschluss_uhr: opts.bestellschluss || '11:00' } })));

  await page.route('**/api/**', (route) => {
    const u = route.request().url();
    if (/stammkunden|lunch-order|wochenplan|cms-config/.test(u)) return route.fallback();
    return route.fulfill(j({ success: true }));
  });
}

/** Kiosk öffnen, Mittagstisch wählen und den Dialog „Neue Bestellung" zeigen.
 *  Umgeschaltet wird über switchTab statt per Klick: Ohne Freigaben aus
 *  /api/cms-config ist der Reiter ausgeblendet und nicht anklickbar.
 *
 *  Die Uhr wird auf den Vormittag gestellt, damit der Wächter unabhängig
 *  von der Tageszeit dasselbe misst. Früher war das zwingend: Der Kiosk
 *  verriegelte die Neubestellung ab 12:00 Uhr. Diese Sperre ist gefallen
 *  (Spec mittag-telefon-bestellungen sind nicht an die Zeit gebunden), die
 *  feste Zeit bleibt aber nützlich — nach dem Bestellschluss erscheint ein
 *  Hinweis-Toast, der sonst je nach Uhrzeit mal da wäre und mal nicht.
 *  setFixedTime lässt die Zeitgeber weiterlaufen und stellt nur Date.now()
 *  fest. */
async function oeffneDialog(page, opts = {}) {
  await page.clock.setFixedTime(new Date(opts.zeit || '2026-03-04T09:30:00'));
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

/* ── Bestellschluss: Hinweis statt Sperre ───────────────────────────────
   Aus dem Laden: „Bei Mittagessen Bestellung musst du bei telefonischer
   Bestellung Zeit ändern. Da ist momentan Schluss um 12.00 und nach 12.00
   Uhr kann ich nichts mehr eingeben, keine Bestellung mehr."

   Zwei Fehler steckten darin: Die 12 Uhr standen fest im Code, obwohl im
   CMS eine Zeit gepflegt wird (dort 11:00) — und die Sperre traf die
   telefonische Erfassung, die der Server ausdruecklich erlaubt.
   Deckt specs/mittag-telefon-bestellschluss/spec.md (TC-B01 ... TC-B05). */
test.describe('Bestellschluss bremst die telefonische Aufnahme nicht', () => {
  const NACH = '2026-03-04T12:30:00';   // nach jedem denkbaren Schluss
  const VOR  = '2026-03-04T09:30:00';   // davor

  test('TC-B01: nach dem Bestellschluss laesst sich weiter bestellen',
    async ({ page }) => {
      const g = sammle(page);
      await oeffneDialog(page, { zeit: NACH });
      await waehleGericht(page);
      await page.locator('#no-kunde-search').fill('Herr Huber');
      await page.evaluate(() => window.K.submitNewOrder());
      await page.waitForTimeout(900);

      expect(g.orders.length,
        'Nach dem Bestellschluss kam keine Bestellung an').toBe(1);
      expect(g.orders[0].name).toBe('Herr Huber');
      /* Der Kiosk erfasst ausschliesslich telefonisch — genau diese Quelle
         nimmt der Server von seiner Zeitsperre aus. */
      expect(g.orders[0].quelle, 'Quelle muss telefonisch sein').toBe(1);
    });

  test('TC-B02: der Knopf bleibt auch nach dem Bestellschluss bedienbar',
    async ({ page }) => {
      await oeffneDialog(page, { zeit: NACH });
      const btn = page.locator('#btn-new-order');
      await expect(btn, 'Knopf darf nicht gesperrt sein').toBeEnabled();
      const deck = await btn.evaluate((el) => getComputedStyle(el).opacity);
      expect(parseFloat(deck), 'Knopf darf nicht ausgegraut wirken').toBe(1);
    });

  test('TC-B03: nach dem Bestellschluss erklaert ein Hinweis die Lage',
    async ({ page }) => {
      await oeffneDialog(page, { zeit: NACH });
      const titel = await page.locator('#btn-new-order').getAttribute('title');
      expect(titel, 'kein Hinweis am Knopf').toBeTruthy();
      /* Die Uhrzeit stammt aus dem CMS (11:00), nicht aus dem Code. */
      expect(titel).toContain('11:00');
      expect(titel).toMatch(/telefonisch/i);
    });

  test('TC-B04: vor dem Bestellschluss gibt es keinen Hinweis',
    async ({ page }) => {
      await oeffneDialog(page, { zeit: VOR });
      const titel = await page.locator('#btn-new-order').getAttribute('title');
      expect(titel || '', 'vorher soll nichts stehen').toBe('');
    });

  test('TC-B05: die Uhrzeit kommt aus dem CMS, nicht aus dem Code',
    async ({ page }) => {
      /* Mit einer anderen gepflegten Zeit muss sich der Hinweis mitbewegen.
         Steht er weiterhin auf 11:00 oder 12:00, ist die Zeit wieder fest
         verdrahtet — genau der Fehler, um den es ging. */
      await oeffneDialog(page, { zeit: '2026-03-04T14:30:00',
        bestellschluss: '14:15' });
      const titel = await page.locator('#btn-new-order').getAttribute('title');
      expect(titel, 'kein Hinweis am Knopf').toBeTruthy();
      expect(titel, 'Die Uhrzeit folgt der CMS-Angabe nicht').toContain('14:15');
    });
});
