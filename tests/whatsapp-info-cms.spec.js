/**
 * WhatsApp-Hinweis auf der Startseite - im CMS pflegbar
 * Spec: specs/whatsapp-info-cms/spec.md
 *
 * Aus dem Laden: "Ist dieser Text dynamisch? Wenn nein, bitte in CMS
 * einrichten und dynamisch machen (HTML-Editor). 'mit Onlineshop!!!'
 * entfällt."
 *
 * Er war es nicht: Der Text stand fest in index.html. Jetzt kommt er aus
 * dem CMS-Feld `whatsapp_info` (Homepage-Reiter, HTML-Editor); der feste
 * Text bleibt nur als Rückfall.
 *
 * Der heikle Teil ist nicht das Anzeigen, sondern WAS angezeigt wird:
 * Der Text landet per innerHTML auf der öffentlichen Startseite. Deshalb
 * prüfen drei Fälle gezielt, dass Skripte, Event-Handler und
 * javascript:-Links nicht durchkommen.
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const LOKAL = /localhost|127\.0\.0\.1/.test(BASE);
const START = LOKAL ? `${BASE}/index.html` : `${BASE}/`;

async function mitConfig(page, config) {
  await page.route('**/api/cms-config*', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: config }) }));
  await page.route('**/api/lunch-order*', (route) => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ success: true, orders: [] }) }));
}

async function startseite(page) {
  await page.goto(START, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
}

const text = (page) => page.locator('#wa-info-text');

test('TC-WA-01: Ohne CMS-Eintrag steht der Standardtext - ohne "mit Onlineshop"', async ({ page }) => {
  await mitConfig(page, { feature_flags: {} });
  await startseite(page);

  await expect(text(page)).toContainText('WhatsApp Gruppe');
  await expect(text(page)).toContainText('Hier klicken');
  await expect(text(page), '"mit Onlineshop!!!" steht noch da').not.toContainText('Onlineshop');
});

test('TC-WA-02: Ein CMS-Eintrag ersetzt den Text', async ({ page }) => {
  await mitConfig(page, {
    feature_flags: {},
    whatsapp_info: 'Neu: <b>Tagesangebote</b> in der Gruppe. <a href="https://wa.me/491714910935">Beitreten</a>',
  });
  await startseite(page);

  await expect(text(page)).toContainText('Tagesangebote');
  await expect(text(page).locator('b')).toHaveText('Tagesangebote');
  const link = text(page).locator('a');
  await expect(link).toHaveAttribute('href', 'https://wa.me/491714910935');
  await expect(link, 'Externer Link öffnet nicht in neuem Tab').toHaveAttribute('target', '_blank');
  await expect(text(page)).not.toContainText('Mittagsmen');
});

test('TC-WA-03: Ein leerer CMS-Eintrag lässt den Standardtext stehen', async ({ page }) => {
  /* Der Editor hinterlässt beim Leeren oft ein "<br>" - das darf den
     Hinweis nicht verschwinden lassen. */
  await mitConfig(page, { feature_flags: {}, whatsapp_info: '<br>' });
  await startseite(page);
  await expect(text(page)).toContainText('WhatsApp Gruppe');
});

test('TC-WA-04: Skripte und Event-Handler kommen nicht durch', async ({ page }) => {
  await mitConfig(page, {
    feature_flags: {},
    whatsapp_info: 'Hallo<script>window.__xss1=1</script>'
      + '<img src="x" onerror="window.__xss2=1">'
      + '<b onclick="window.__xss3=1" style="color:red">fett</b>'
      + '<iframe src="https://example.com"></iframe>',
  });
  await startseite(page);

  const html = await text(page).innerHTML();
  const treffer = await page.evaluate(() => [window.__xss1, window.__xss2, window.__xss3]);
  expect(treffer, 'Ein eingeschleustes Skript wurde ausgeführt').toEqual([undefined, undefined, undefined]);
  expect(html).not.toMatch(/<script|<img|<iframe|onerror|onclick|style=/i);
  // Der harmlose Teil bleibt erhalten.
  await expect(text(page)).toContainText('Hallo');
  await expect(text(page).locator('b')).toHaveText('fett');
});

test('TC-WA-05: javascript:-Links verlieren ihr Ziel', async ({ page }) => {
  await mitConfig(page, {
    feature_flags: {},
    whatsapp_info: '<a href="javascript:window.__xss4=1">Klick</a> <a href="  JavaScript:alert(1)">Zwei</a>',
  });
  await startseite(page);

  const hrefs = await text(page).locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  expect(hrefs, 'Ein javascript:-Link hat überlebt').toEqual([null, null]);
});

test('TC-WA-06: Die Handy-Klasse des QR-Hinweises bleibt erhalten', async ({ page }) => {
  /* .wa-qr-hint blendet den QR-Satz auf dem Handy aus - dort gibt es
     keinen QR-Code zum Scannen, nur den Link. Die Bereinigung darf genau
     diese eine Klasse nicht verwerfen. */
  await mitConfig(page, {
    feature_flags: {},
    whatsapp_info: 'Text <span class="wa-qr-hint boese">QR-Satz</span> <span class="anders">x</span>',
  });
  await startseite(page);

  await expect(text(page).locator('span.wa-qr-hint')).toHaveCount(1);
  const klassen = await text(page).locator('span').evaluateAll((s) => s.map((e) => e.getAttribute('class')));
  expect(klassen).toEqual(['wa-qr-hint', null]);
});

test('TC-WA-07: CMS-Vorbelegung und Rückfall in index.html sagen dasselbe', async () => {
  /* Beide Fassungen stehen an zwei Stellen. Laufen sie auseinander, sieht
     man im CMS einen anderen Text als auf der Seite. */
  const wurzel = path.join(__dirname, '..', 'static-site');
  const cms = fs.readFileSync(path.join(wurzel, 'cms.js'), 'utf8');
  const idx = fs.readFileSync(path.join(wurzel, 'index.html'), 'utf8');

  const m = cms.match(/var WA_INFO_STANDARD=([\s\S]*?);\r?\n/);
  expect(m, 'WA_INFO_STANDARD fehlt in cms.js').toBeTruthy();
  // eslint-disable-next-line no-eval
  const standard = eval(m[1]);
  const block = idx.match(/<div class="wa-info-text" id="wa-info-text">([\s\S]*?)<\/div>/);
  expect(block, '#wa-info-text fehlt in index.html').toBeTruthy();

  const nurText = (s) => s.replace(/<[^>]*>/g, ' ')
    .replace(/&uuml;/g, 'ü').replace(/&auml;/g, 'ä').replace(/&ouml;/g, 'ö')
    .replace(/\s+/g, ' ').replace(/\s+([.,])/g, '$1').trim();
  expect(nurText(standard)).toBe(nurText(block[1]));
});

test.describe('CMS', () => {
  test('TC-WA-08: Das Feld erscheint im Homepage-Reiter mit HTML-Editor, auch wenn es noch nie gespeichert wurde', async ({ page }) => {
    await page.route('**/api/cms-config?full=true*', (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [
        { id: 'a1', name: 'hero_titel', key: 'hero_titel', wert: 'Willkommen' },
      ] }) }));
    await page.route('**/api/**', (route) => {
      if (route.request().url().includes('cms-config?full=true')) return route.fallback();
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
    });

    await page.goto(`${BASE}/cms.html`, { waitUntil: 'domcontentloaded' });
    const hash = await page.evaluate(() => {
      const el = document.getElementById('cms-pw-hash');
      return el ? JSON.parse(el.textContent) : null;
    });
    test.skip(!hash, 'CMS hier nicht ausgeliefert');
    await page.evaluate((v) => sessionStorage.setItem('cms_auth_ok', v), hash);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('#cms-app').waitFor({ state: 'visible', timeout: 20000 });
    await page.evaluate(() => window.cmsTab('hp'));

    const editor = page.locator('[data-hp-name="whatsapp_info"][data-hp-html="1"]');
    await expect(editor, 'Kein HTML-Editor für whatsapp_info').toBeVisible({ timeout: 10000 });
    await expect(editor).toContainText('WhatsApp Gruppe');
    await expect(editor).not.toContainText('Onlineshop');
  });
});
