/* Werbebilder der Waage im Kiosk (specs/kiosk-werbebilder-upload/spec.md).
 *
 * Die Bruecke im Laden-LAN wird durch eine Attrappe mit Zustand ersetzt, die
 * mitschreibt, WAS der Kiosk an sie schickt - und in welcher Reihenfolge.
 * Ihre eigene Pruefung steht in `tests/test_waage_bruecke.py`.
 */
const { test, expect } = require('./_kiosk-angemeldet');

const BASE = process.env.TEST_URL || 'http://127.0.0.1:8811';
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;
const BRUECKE = 'http://waage.test:8765';

// 1x1-GIF: ein gueltiges Bild fuer Miniaturen und Vorschau.
const GIF = Buffer.from('R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=', 'base64');
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
  'access-control-allow-headers': 'Content-Type',
  'access-control-allow-private-network': 'true',
};

/**
 * @param {object} opts
 *   vollbild/dauer  Namen, die schon auf der Waage liegen
 *   waage           false = Bruecke laeuft, Waage antwortet nicht
 *   tot             true  = Bruecke nicht erreichbar
 *   ablehnen        Dateinamen, die die Bruecke mit 415 ablehnt
 *   flags           feature_flags aus dem CMS
 */
async function mockBruecke(page, opts = {}) {
  const o = Object.assign({
    vollbild: ['10_fruehling.jpg', '20_sommer.gif'], dauer: ['banner.gif'],
    waage: true, tot: false, ablehnen: [], flags: { kiosk_werbebilder: true },
  }, opts);
  const dateien = { vollbild: o.vollbild.slice(), dauer: o.dauer.slice() };
  const log = [];

  await page.addInitScript((url) => {
    try { localStorage.setItem('kiosk_waage_url', url); } catch (e) { /* gesperrt */ }
  }, BRUECKE);

  await page.route(/\/api\//, (r) => {
    const json = (b) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
    if (/cms-config/.test(r.request().url())) {
      return json({ success: true, data: { feature_flags: o.flags } });
    }
    return json({ success: true, data: [] });
  });

  await page.route(/^http:\/\/waage\.test:8765\//, (r) => {
    const req = r.request();
    const u = new URL(req.url());
    const json = (status, b) => r.fulfill({
      status, headers: CORS, contentType: 'application/json; charset=utf-8', body: JSON.stringify(b) });
    if (req.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
    if (o.tot) return r.abort('connectionrefused');
    log.push({ methode: req.method(), pfad: u.pathname, name: u.searchParams.get('name') });

    if (u.pathname === '/health') {
      return json(200, { success: true, ok: true, waage: o.waage, fehler: o.waage ? undefined : 'Verbindung abgelehnt',
        arten: { vollbild: true, dauer: true } });
    }
    const m = u.pathname.match(/^\/bilder\/([^/]+)(?:\/(.+))?$/);
    if (!m || !dateien[m[1]]) return json(404, { success: false, error: 'Unbekannte Art' });
    const art = m[1];
    if (req.method() === 'GET' && !m[2]) {
      const namen = dateien[art].slice().sort();
      return json(200, { success: true, art, max: 99, bilder: namen.map((n) => ({ name: n, groesse: 2048 })) });
    }
    if (req.method() === 'GET') {
      return r.fulfill({ status: 200, headers: CORS, contentType: 'image/gif', body: GIF });
    }
    if (req.method() === 'POST') {
      const name = u.searchParams.get('name');
      if (o.ablehnen.includes(name)) return json(415, { success: false, error: 'Nur JPEG und GIF erlaubt' });
      if (!dateien[art].includes(name)) dateien[art].push(name);
      return json(200, { success: true, name, groesse: GIF.length });
    }
    if (req.method() === 'DELETE') {
      dateien[art] = dateien[art].filter((n) => n !== decodeURIComponent(m[2]));
      return json(200, { success: true });
    }
    return json(405, { success: false });
  });

  return { log, dateien, anfragen: (methode) => log.filter((l) => l.methode === methode) };
}

async function oeffne(page) {
  await page.goto(KIOSK_URL, { waitUntil: 'domcontentloaded' });
  await page.locator('.k-tab[data-tab="werbebilder"]').click();
  await expect(page.locator('#panel-werbebilder')).toHaveClass(/active/);
}

const jpg = (name) => ({ name, mimeType: 'image/jpeg', buffer: GIF });

test.describe('Werbebilder-Upload', () => {

  test('TC-F1-01: Tab ist da, braucht keine Anmeldung, zeigt die Waage als verbunden', async ({ page }) => {
    await mockBruecke(page);
    await oeffne(page);
    await expect(page.locator('#wb-stat')).toContainText('verbunden', { timeout: 15000 });
    await expect(page.locator('#panel-werbebilder input[type="password"]')).toHaveCount(0);
    await expect(page.locator('#panel-werbebilder .wb-drop')).toBeVisible();
  });

  test('TC-F1-02: Schalter aus blendet den Tab aus', async ({ page }) => {
    await mockBruecke(page, { flags: { kiosk_werbebilder: false } });
    await page.goto(KIOSK_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.k-tab[data-tab="werbebilder"]')).toBeHidden({ timeout: 15000 });
  });

  test('TC-F2-01: nur Vollbild und Dauerwerbung, nie ein Monatsverzeichnis', async ({ page }) => {
    const m = await mockBruecke(page);
    await oeffne(page);
    const arten = page.locator('#panel-werbebilder [data-wb="art"]');
    await expect(arten).toHaveText(['Vollbild', 'Dauerwerbung']);
    await expect(page.locator('#panel-werbebilder .wb-item')).toHaveCount(2);
    await arten.nth(1).click();
    await expect(page.locator('#panel-werbebilder .wb-item')).toHaveCount(1);
    for (const l of m.log) {
      expect(l.pfad).toMatch(/^\/(health|bilder\/(vollbild|dauer)(\/[^/]+)?)$/);
    }
    expect(m.log.some((l) => l.pfad === '/bilder/dauer')).toBe(true);
  });

  test('TC-F5-01: Liste in Namensreihenfolge mit Position und Zaehler', async ({ page }) => {
    await mockBruecke(page, { vollbild: ['30_c.jpg', '10_a.jpg', '20_b.gif'] });
    await oeffne(page);
    const namen = page.locator('#panel-werbebilder [data-wb-bild]');
    await expect(namen).toHaveCount(3);
    await expect(namen.locator('.wb-info b')).toHaveText(['10_a.jpg', '20_b.gif', '30_c.jpg']);
    await expect(namen.locator('.wb-pos')).toHaveText(['1', '2', '3']);
    await expect(page.locator('#wb-zaehl')).toHaveText('3 / 99');
  });

  test('TC-F3-01: Dateiwahl zeigt Vorschau, Hochladen sendet jede Datei und fuellt die Liste', async ({ page }) => {
    const m = await mockBruecke(page);
    await oeffne(page);
    await page.locator('#wb-datei').setInputFiles([jpg('neu1.jpg'), jpg('neu2.jpg')]);
    await expect(page.locator('#panel-werbebilder .wb-stage .wb-item')).toHaveCount(2);
    await expect(page.locator('#panel-werbebilder .wb-stage .wb-thumb img')).toHaveCount(2);
    expect(m.anfragen('POST')).toHaveLength(0);

    await page.locator('[data-wb="hoch"]').click();
    await expect(page.locator('#panel-werbebilder [data-wb-bild]')).toHaveCount(4, { timeout: 15000 });
    expect(m.anfragen('POST').map((l) => l.name)).toEqual(['neu1.jpg', 'neu2.jpg']);
    expect(m.anfragen('POST').every((l) => l.pfad === '/bilder/vollbild')).toBe(true);
    await expect(page.locator('#panel-werbebilder .wb-stage')).toHaveCount(0);
  });

  test('TC-F3-02: Ziehen und Ablegen nimmt Dateien an', async ({ page }) => {
    await mockBruecke(page);
    await oeffne(page);
    await page.evaluate((b64) => {
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const dt = new DataTransfer();
      dt.items.add(new File([bin], 'gezogen.gif', { type: 'image/gif' }));
      document.getElementById('wb-root').dispatchEvent(
        new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    }, GIF.toString('base64'));
    await expect(page.locator('#panel-werbebilder .wb-stage .wb-info b')).toHaveText('gezogen.gif');
  });

  test('TC-F4-01: PNG und PDF werden abgewiesen, ohne Anfrage', async ({ page }) => {
    const m = await mockBruecke(page);
    await oeffne(page);
    await page.locator('#wb-datei').setInputFiles([
      { name: 'logo.png', mimeType: 'image/png', buffer: GIF },
      { name: 'preis.pdf', mimeType: 'application/pdf', buffer: GIF },
    ]);
    await expect(page.locator('#panel-werbebilder .wb-warn').first()).toContainText('logo.png');
    await expect(page.locator('#panel-werbebilder .wb-stage .wb-item')).toHaveCount(0);
    expect(m.anfragen('POST')).toHaveLength(0);
  });

  test('TC-F6-01: Loeschen fragt nach; Abbrechen sendet nichts', async ({ page }) => {
    const m = await mockBruecke(page);
    await oeffne(page);
    await expect(page.locator('#panel-werbebilder [data-wb-bild]')).toHaveCount(2);

    await page.locator('[data-wb-bild="10_fruehling.jpg"] [data-wb="loeschen"]').click();
    await page.locator('[data-wb="dlg-nein"]').click();
    expect(m.anfragen('DELETE')).toHaveLength(0);
    await expect(page.locator('#panel-werbebilder [data-wb-bild]')).toHaveCount(2);

    await page.locator('[data-wb-bild="10_fruehling.jpg"] [data-wb="loeschen"]').click();
    await page.locator('[data-wb="dlg-ja"]').click();
    await expect(page.locator('#panel-werbebilder [data-wb-bild]')).toHaveCount(1);
    expect(m.anfragen('DELETE').map((l) => l.pfad)).toEqual(['/bilder/vollbild/10_fruehling.jpg']);
  });

  test('TC-F7-01: Alle ersetzen laedt erst hoch und loescht dann die alten', async ({ page }) => {
    const m = await mockBruecke(page);
    await oeffne(page);
    await page.locator('#wb-datei').setInputFiles([jpg('ostern.jpg')]);
    await page.locator('[data-wb="ersetzen"]').click();
    await page.locator('[data-wb="dlg-ja"]').click();
    await expect(page.locator('#panel-werbebilder [data-wb-bild]')).toHaveCount(1, { timeout: 15000 });

    const folge = m.log.filter((l) => l.methode === 'POST' || l.methode === 'DELETE').map((l) => l.methode);
    expect(folge).toEqual(['POST', 'DELETE', 'DELETE']);
    expect(m.dateien.vollbild).toEqual(['ostern.jpg']);
  });

  test('TC-F7-02: Schlaegt ein Upload fehl, wird nichts geloescht', async ({ page }) => {
    const m = await mockBruecke(page, { ablehnen: ['kaputt.jpg'] });
    await oeffne(page);
    await page.locator('#wb-datei').setInputFiles([jpg('gut.jpg'), jpg('kaputt.jpg')]);
    await page.locator('[data-wb="ersetzen"]').click();
    await page.locator('[data-wb="dlg-ja"]').click();
    await expect(page.locator('#panel-werbebilder .wb-item.wb-fehler')).toContainText('Nur JPEG und GIF erlaubt', { timeout: 15000 });
    expect(m.anfragen('DELETE')).toHaveLength(0);
    expect(m.dateien.vollbild).toEqual(expect.arrayContaining(['10_fruehling.jpg', '20_sommer.gif', 'gut.jpg']));
  });

  test('TC-F8-01: Bruecke nicht erreichbar -> Hinweis, Adresse bleibt aenderbar', async ({ page }) => {
    await mockBruecke(page, { tot: true });
    await oeffne(page);
    await expect(page.locator('#panel-werbebilder .wb-fehler')).toContainText('nicht erreichbar', { timeout: 15000 });
    await page.locator('[data-wb="einst"]').first().click();
    await expect(page.locator('#wb-host')).toBeVisible();
    await page.locator('#wb-host').fill('192.168.1.20');
    await page.locator('[data-wb="url-speichern"]').click();
    expect(await page.evaluate(() => localStorage.getItem('kiosk_waage_url'))).toBe('http://192.168.1.20:8765');
  });

  test('TC-F13-01: Adresse wird als IP + Port eingegeben, vorbelegt und gespeichert', async ({ page }) => {
    await mockBruecke(page);
    await oeffne(page);
    await page.locator('[data-wb="einst"]').first().click();
    await expect(page.locator('#wb-host')).toHaveValue('waage.test');
    await expect(page.locator('#wb-port')).toHaveValue('8765');
    await page.locator('#wb-schema').selectOption('https');
    await page.locator('#wb-host').fill('10.0.0.7');
    await page.locator('#wb-port').fill('9000');
    await page.locator('[data-wb="url-speichern"]').click();
    expect(await page.evaluate(() => localStorage.getItem('kiosk_waage_url'))).toBe('https://10.0.0.7:9000');
  });

  test('TC-F13-02: Ungueltige IP/Port werden mit Hinweis abgewiesen, nichts gespeichert', async ({ page }) => {
    await mockBruecke(page);
    await oeffne(page);
    await page.locator('[data-wb="einst"]').first().click();
    const vorher = await page.evaluate(() => localStorage.getItem('kiosk_waage_url'));
    for (const [host, port, text] of [['', '8765', 'IP-Adresse'], ['192.168.1.300', '8765', '255'],
      ['192.168 .1.2', '8765', 'ungültig'], ['192.168.1.20', '70000', 'Port'], ['192.168.1.20', 'abc', 'Port']]) {
      await page.locator('#wb-host').fill(host);
      await page.locator('#wb-port').fill(port);
      await page.locator('[data-wb="url-speichern"]').click();
      await expect(page.locator('#wb-adr-fehler')).toBeVisible();
      await expect(page.locator('#wb-adr-fehler')).toContainText(text);
    }
    expect(await page.evaluate(() => localStorage.getItem('kiosk_waage_url'))).toBe(vorher);
  });

  test('TC-F13-03: Verbindung testen meldet Erfolg, Waage-Ausfall und Nicht-Erreichbarkeit', async ({ page }) => {
    const m = await mockBruecke(page);
    await oeffne(page);
    await page.locator('[data-wb="einst"]').first().click();
    await page.locator('[data-wb="url-test"]').click();
    await expect(page.locator('#wb-test')).toContainText('Waage antwortet', { timeout: 10000 });
    expect(m.log.some((l) => l.pfad === '/health')).toBe(true);
    await page.locator('#wb-host').fill('192.0.2.1');
    await page.locator('#wb-port').fill('1');
    await page.route(/^http:\/\/192\.0\.2\.1:1\//, (r) => r.abort('connectionrefused'));
    await page.locator('[data-wb="url-test"]').click();
    await expect(page.locator('#wb-test')).toContainText('Keine Antwort', { timeout: 10000 });
  });

  test('Fremder Server antwortet 504 statt der Bruecke -> klarer Hinweis auf falsche Adresse', async ({ page }) => {
    await mockBruecke(page);
    await page.route(/^http:\/\/waage\.test:8765\//, (r) => r.fulfill({
      status: 504, headers: { 'Access-Control-Allow-Origin': '*' }, contentType: 'text/html', body: '<h1>Gateway Timeout</h1>' }));
    await oeffne(page);
    const f = page.locator('#panel-werbebilder .wb-fehler');
    await expect(f).toContainText('antwortet nicht die Waage-Brücke', { timeout: 15000 });
    await expect(f).toContainText('504');
    await page.locator('[data-wb="einst"]').first().click();
    await page.locator('[data-wb="url-test"]').click();
    await expect(page.locator('#wb-test')).toContainText('antwortet nicht die Waage-Brücke', { timeout: 10000 });
  });

  test('TC-F8-02: Waage antwortet nicht -> eigener Hinweis', async ({ page }) => {
    await mockBruecke(page, { waage: false });
    await oeffne(page);
    await expect(page.locator('#panel-werbebilder .wb-fehler')).toContainText('Waage antwortet nicht', { timeout: 15000 });
    await expect(page.locator('#panel-werbebilder .wb-fehler')).not.toContainText('Brücke ist nicht erreichbar');
  });

  test('Vorschau: Miniatur oeffnet die Grossansicht, Esc schliesst, Pfeile blaettern', async ({ page }) => {
    await mockBruecke(page);
    await oeffne(page);
    await expect(page.locator('#panel-werbebilder .wb-thumb img').first()).toBeVisible({ timeout: 15000 });
    await page.locator('[data-wb-bild="10_fruehling.jpg"] .wb-thumb').click();
    const lb = page.locator('#wb-lb');
    await expect(lb.locator('img')).toBeVisible();
    await expect(lb.locator('.wb-lb-name')).toContainText('10_fruehling.jpg');
    await page.keyboard.press('ArrowRight');
    await expect(lb.locator('.wb-lb-name')).toContainText('20_sommer.gif');
    await page.keyboard.press('Escape');
    await expect(lb).toHaveCount(0);
  });

  test('Vorschau: auch ein noch nicht hochgeladenes Bild laesst sich gross ansehen', async ({ page }) => {
    await mockBruecke(page);
    await oeffne(page);
    await page.locator('#wb-datei').setInputFiles([jpg('vorab.jpg')]);
    await page.locator('.wb-stage .wb-thumb').click();
    await expect(page.locator('#wb-lb img')).toBeVisible();
    await expect(page.locator('#wb-lb .wb-lb-name')).toContainText('vorab.jpg');
    await page.locator('[data-wb="lb-zu"]').click();
    await expect(page.locator('#wb-lb')).toHaveCount(0);
  });

  test('Layout: keine waagerechte Verschiebung, Tippflaechen mindestens 44 px', async ({ page }) => {
    await mockBruecke(page);
    await oeffne(page);
    await expect(page.locator('#panel-werbebilder [data-wb-bild]')).toHaveCount(2);
    const ueberlauf = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(ueberlauf).toBeLessThanOrEqual(1);
    for (const sel of ['[data-wb="art"]', '[data-wb="loeschen"]', '[data-wb="neu"]']) {
      const boxen = await page.locator('#panel-werbebilder ' + sel).evaluateAll(
        (els) => els.map((e) => e.getBoundingClientRect().height));
      for (const h of boxen) expect(h).toBeGreaterThanOrEqual(43.5);
    }
  });
});
