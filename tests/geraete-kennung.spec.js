/**
 * Bestellen ohne E-Mail bleibt auffindbar
 *
 * Aus dem Laden: Bestellungen ohne E-Mail-Adresse tauchten auf der
 * Startseite nie wieder auf.
 *
 * Ursache war nicht die Suche, sondern die Ablage. Die Bestellung trug
 * keine Geräte-Kennung:
 *
 *     device_id: (window.dlPushDeviceId ? dlPushDeviceId() : '')
 *
 * Die Funktion lag in `pwa.js`, und die Bestellseite lud diese Datei nicht.
 * Der Ausweichzweig griff also **immer**. Zu sehen war davon nichts — die
 * Bestellung ging durch, nur eben unauffindbar.
 *
 * Geprüft wird hier die ganze Kette: Was die Bestellseite absendet, was
 * davon dauerhaft bleibt, und womit die Startseite danach sucht.
 *
 * Ausführen (lokaler Server aus static-site/ auf 8099):
 *   $env:TEST_URL='http://127.0.0.1:8099'
 *   node node_modules\@playwright\test\cli.js test tests/geraete-kennung.spec.js
 */

const { test, expect } = require('@playwright/test');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const LOKAL = /localhost|127\.0\.0\.1/.test(BASE);
const seite = (n) => LOKAL ? `${BASE}/${n}.html` : `${BASE}/${n}`;

function heute() {
  const d = new Date();
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)
    + '-' + ('0' + d.getDate()).slice(-2);
}

/* Ein Gericht für morgen: Heute griffe der Bestellschluss und der Test
   kippte je nach Tageszeit. */
function morgen() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)
    + '-' + ('0' + d.getDate()).slice(-2);
}

const GERICHT = {
  dl_wochenplanid: 'wp-1',
  dl_gericht: 'Schaschlikpfanne mit Reis oder Pommes',
  dl_preis: 8.8,
  dl_datum: morgen(),
  dl_wochentag: 100999 + (new Date(morgen() + 'T12:00:00').getDay() || 7),
};

/** Sammelt jeden Bestellrumpf, der abgeschickt wird. */
function sammle(page) {
  const raus = { orders: [], push: [] };
  page.on('request', (r) => {
    if (r.method() !== 'POST') return;
    let leib = {};
    try { leib = JSON.parse(r.postData() || '{}'); } catch (e) { /* egal */ }
    if (/lunch-order/.test(r.url())) raus.orders.push(leib);
    if (/push-subscribe/.test(r.url())) raus.push.push(leib);
  });
  return raus;
}

async function mockApi(page, opts = {}) {
  const j = (o) => ({ status: 200, contentType: 'application/json',
    body: JSON.stringify(o) });

  await page.route('**/api/wochenplan**', (r) =>
    r.fulfill(j({ success: true, data: [GERICHT] })));
  await page.route('**/api/cms-config**', (r) =>
    r.fulfill(j({ success: true, data: { bestellschluss_uhr: '11:00',
      feature_flags: { mittagstisch: true } } })));
  await page.route('**/api/lunch-order**', (r) => {
    if (r.request().method() === 'POST') {
      return r.fulfill(j({ success: true, bestellnummer: 'MT-TEST-1' }));
    }
    // mode=my – die Abfrage der Startseite
    return r.fulfill(j({ success: true, orders: opts.orders || [], count: 0 }));
  });
  await page.route('**/api/**', (r) => {
    const u = r.request().url();
    if (/wochenplan|cms-config|lunch-order/.test(u)) return r.fallback();
    return r.fulfill(j({ success: true }));
  });
}

/** Bestellt ein Gericht – ausdrücklich OHNE E-Mail. */
async function bestelleOhneEmail(page) {
  await page.goto(seite('mittagstisch-bestellen'));
  await page.waitForSelector('.menu-item', { timeout: 15000 });

  // Das Gericht für morgen wählen
  await page.locator('.menu-item').first().click();
  await page.waitForTimeout(400);
  await page.fill('#cust-name', 'Testkunde ohne Mail');
  // E-Mail bleibt leer – genau der gemeldete Fall.
  await page.waitForTimeout(200);
  await page.locator('#submit-btn').click();
  await page.waitForTimeout(1200);
}

test.describe('Geräte-Kennung – Bestellen ohne E-Mail', () => {

  test('TC-GK-07: Die Bestellung trägt eine Geräte-Kennung', async ({ page }) => {
    await mockApi(page);
    const g = sammle(page);
    await bestelleOhneEmail(page);

    expect(g.orders.length, 'eine Bestellung wurde gesendet').toBe(1);
    const b = g.orders[0];
    expect(b.email || '', 'der Fall ist: ohne E-Mail').toBe('');
    expect(b.device_id, 'ohne Kennung wäre die Bestellung unauffindbar')
      .toBeTruthy();
    expect(String(b.device_id).length,
      `Kennung zu kurz: ${b.device_id}`).toBeGreaterThan(8);
  });

  test('TC-GK-08: Dieselbe Kennung bleibt über Besuche hinweg', async ({ page }) => {
    // Eine wechselnde Kennung wäre so nutzlos wie gar keine.
    await mockApi(page);
    const g = sammle(page);
    await bestelleOhneEmail(page);
    await bestelleOhneEmail(page);

    expect(g.orders.length).toBe(2);
    expect(g.orders[1].device_id, 'zweite Bestellung, andere Kennung')
      .toBe(g.orders[0].device_id);
  });

  test('TC-GK-09: Die Startseite sucht mit genau dieser Kennung', async ({ page }) => {
    /* Der eigentliche Beweis: Was die Bestellseite ablegt, muss die
       Startseite wiederfinden. Beides hängt am selben Speicher. */
    await mockApi(page);
    const g = sammle(page);
    await bestelleOhneEmail(page);
    const kennung = g.orders[0].device_id;

    const abfragen = [];
    page.on('request', (r) => {
      if (/lunch-order.*mode=my/.test(r.url())) abfragen.push(r.url());
    });
    await page.goto(seite('index'));
    await page.waitForTimeout(2000);

    expect(abfragen.length, 'die Startseite fragt nach eigenen Bestellungen')
      .toBeGreaterThan(0);
    expect(abfragen[0], `gesucht wurde mit: ${abfragen[0]}`)
      .toContain('device_id=' + encodeURIComponent(kennung));
  });

  test('TC-GK-10: Mit E-Mail hat diese Vorrang', async ({ page }) => {
    // Die Gegenprobe: Wer eine E-Mail angibt, wird darüber gefunden –
    // sie gilt über Geräte hinweg, die Kennung nur je Browser.
    await mockApi(page);
    await page.goto(seite('index'));
    await page.evaluate(() => {
      localStorage.setItem('bs_email', 'gast@example.org');
      localStorage.setItem('dl_push_device_id', 'test-kennung-123');
    });
    const abfragen = [];
    page.on('request', (r) => {
      if (/lunch-order.*mode=my/.test(r.url())) abfragen.push(r.url());
    });
    await page.goto(seite('index'));
    await page.waitForTimeout(2000);

    expect(abfragen.length).toBeGreaterThan(0);
    expect(abfragen[0]).toContain('email=');
    expect(abfragen[0], 'bei vorhandener E-Mail keine Kennung')
      .not.toContain('device_id=');
  });

  test('TC-GK-11: Bloßes Blättern legt noch keine Kennung an',
    async ({ page }) => {
      /* Die Kennung entsteht erst, wenn sie gebraucht wird — beim
         Bestellen oder beim Anmelden für Nachrichten. Wer nur den
         Speiseplan ansieht, bekommt keine Kennung in den Browser
         geschrieben.

         Ein erster Entwurf dieses Tests forderte das Gegenteil: Die
         Kennung solle schon beim Laden feststehen. Das wäre bequemer
         gewesen, hätte aber jedem Besucher ungefragt eine Kennung
         verpasst — auch dem, der nie bestellt. Für die Sache ist es
         nicht nötig: Beim Absenden ist sie rechtzeitig da (TC-GK-07). */
      await mockApi(page);
      await page.goto(seite('mittagstisch-bestellen'));
      await page.waitForTimeout(800);

      const vorher = await page.evaluate(
        () => localStorage.getItem('dl_push_device_id'));
      expect(vorher, 'ohne Anlass keine Kennung').toBeFalsy();

      // Die Funktion steht aber bereit – genau daran fehlte es früher.
      const bereit = await page.evaluate(
        () => typeof window.dlPushDeviceId === 'function');
      expect(bereit, 'geraete-id.js ist nicht geladen').toBe(true);
    });

  test('TC-GK-12: Nach der Bestellung steht sie im Browser', async ({ page }) => {
    // Sonst fände die Startseite beim nächsten Besuch nichts wieder.
    await mockApi(page);
    const g = sammle(page);
    await bestelleOhneEmail(page);

    const gespeichert = await page.evaluate(
      () => localStorage.getItem('dl_push_device_id'));
    expect(gespeichert, 'Kennung nicht dauerhaft abgelegt').toBeTruthy();
    expect(gespeichert, 'abgelegt wurde etwas anderes als gesendet')
      .toBe(g.orders[0].device_id);
  });
});
