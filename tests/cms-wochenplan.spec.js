const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const cmsAngemeldet = require('./_cms-angemeldet');

const BASE = process.env.TEST_URL || 'http://127.0.0.1:8099';
const PHOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const errors = new WeakMap();
const forbidden = new WeakMap();
const names = [
  'Halsgrat in Gulaschsoße mit Spätzle und Salat',
  'Cordon bleu mit Pommes oder Kartoffelsalat',
  'Lasagne mit gemischtem Salat',
  'Rinderbraten mit Semmelknödel und Blaukraut',
  'Gebackener Fisch mit Kartoffelsalat'
];

function contrast(foreground, background) {
  const luminance = color => color.match(/\d+/g).slice(0, 3).map(Number).map(value => {
    const channel = value / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  }).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

async function setup(page, options = {}) {
  errors.set(page, []); forbidden.set(page, []);
  page.on('pageerror', error => errors.get(page).push(error.message));
  await page.context().addInitScript(() => {
    window.printCalls = 0;
    window.print = () => { window.printCalls++; };
  });
  await page.clock.setFixedTime(new Date('2026-11-24T12:00:00Z'));
  const rows = names.map((name, i) => ({
    dl_wochenplanid: 'w' + i, dl_gericht: name, dl_wochentag: 101000 + i,
    dl_preis: [9.8, 9.8, 8.9, 10.9, 9.8][i], dl_allergene: i === 2 ? 'A, G' : '',
    dl_status: 101001, dl_kalenderwoche: 48, dl_jahr: 2026
  }));
  if (options.complex) rows.push(
    { ...rows[0], dl_wochenplanid: 'extra', dl_gericht: 'Kartoffelsuppe', dl_preis: 5.9, dl_beschreibung: 'Mit frischem Brot', dl_allergene: 'G' },
    { ...rows[1], dl_wochenplanid: 'notice', dl_gericht: '', dl_preis: null, dl_beschreibung: 'Betriebsurlaub' }
  );
  const writes = [], filters = [];
  const design = { wpFlyerTemplate: 'classic-red', wpHomeTemplate: 'classic-red',
    wpTplColors: { 'home:classic-red': { wpBgColor: '#f0fffc', wpDayColor: '#17281b' } } };
  await page.route('https://unpkg.com/**', route => route.abort());
  await page.route('https://cdn.jsdelivr.net/**', route => route.abort());
  await page.route('**/api/**', route => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    const reply = json => route.fulfill({ status: 200, json });
    if (url.pathname === '/api/wochenplan' || url.pathname.startsWith('/api/wochenplan/')) {
      if (method === 'GET') {
        const filter = url.searchParams.get('$filter') || '';
        filters.push(filter);
        const week = /dl_kalenderwoche eq (\d+)/.exec(filter);
        return reply({ success: true, data: week && Number(week[1]) !== 48 ? [] : rows });
      }
      if (options.write && ['POST', 'PATCH', 'DELETE'].includes(method)) {
        writes.push({ method, body: request.postDataJSON() });
        const id = url.pathname.split('/')[3];
        if (method === 'DELETE') rows.splice(rows.findIndex(row => row.dl_wochenplanid === id), 1);
        else if (method === 'PATCH') Object.assign(rows.find(row => row.dl_wochenplanid === id), request.postDataJSON());
        else rows.push({ ...request.postDataJSON(), dl_wochenplanid: 'new-' + rows.length });
        return reply({ success: true });
      }
    }
    if (method !== 'GET') {
      if (options.write && url.pathname === '/api/social-katalog' && url.searchParams.get('action') === 'mt-bild') {
        writes.push({ method, image: true });
        return reply({ bild_url: PHOTO });
      }
      forbidden.get(page).push(method + ' ' + url.pathname);
      return route.fulfill({ status: 405, json: { success: false } });
    }
    if (url.pathname === '/api/cms-config') return reply({ success: true, data: { hp_design_config: design, feature_flags: { wp_images: !!options.complex } } });
    if (url.pathname === '/api/logo') return reply({ success: true, logo: '/images/dorfladen-logo.png' });
    if (url.pathname === '/api/social-katalog' && url.searchParams.get('action') === 'mt-bilder') {
      return reply({ bilder: { [names[0]]: { bild_url: PHOTO } } });
    }
    return reply({ success: true, data: [], value: [], groups: [] });
  });
  await cmsAngemeldet(page);
  await page.goto(BASE + (options.classic ? '/cms-klassisch.html' : '/cms.html'));
  await expect(page.locator('#cms-app')).toBeVisible();
  await expect(page.locator('#cms-wp-grid .cms-meal')).toHaveCount(5);
  await expect(page.locator('#cms-status')).toHaveText('Verbunden');
  await expect(page.locator('#cms-header-logo')).toBeVisible();
  await expect.poll(() => page.locator('#cms-header-logo').evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
  if (options.complex) await expect(page.locator('.cms-wp-photo')).toBeVisible();
  return { rows, writes, filters, design, errors, forbidden };
}

test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
  expect(forbidden.get(page)).toEqual([]);
});

test('TC-F8-01: mockupgetreue Struktur, ruhige Aktionen, nutzbare Liste und Dunkelmodus', { tag: '@layout' }, async ({ page }) => {
  await setup(page);
  const controls = page.locator('.cms-wp-controls');
  for (const name of ['Gericht', 'Hilfe zum Wochenplan', 'Vorherige Woche', 'Nächste Woche anzeigen', 'Diese Woche', 'Nächste Woche', 'Vorschau', 'Drucken', 'Auf die Waage', 'Teilen']) {
    await expect(controls.getByRole('button', { name, exact: true })).toBeVisible();
  }
  await expect(page.locator('#cms-wp-title')).toHaveText('KW 48 / 2026');
  const layout = await page.evaluate(() => {
    const list = document.getElementById('cms-wp-grid'), control = document.querySelector('.cms-wp-controls').getBoundingClientRect();
    const buttons = [...document.querySelectorAll('.cms-wp-controls button')].map(button => {
      const box = button.getBoundingClientRect();
      return { top: box.top, height: box.height, hit: button.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)) };
    });
    const status = document.getElementById('cms-status'), statusBox = status.getBoundingClientRect();
    return {
      height: innerHeight, listHeight: list.clientHeight, listTop: list.getBoundingClientRect().top,
      controlBottom: control.bottom, width: innerWidth, scroll: document.documentElement.scrollWidth,
      touch: innerWidth < 600 || matchMedia('(pointer:coarse)').matches, buttons,
      exportTops: [...document.querySelectorAll('.cms-wp-exports button')].map(button => button.getBoundingClientRect().top),
      statusFits: status.scrollWidth <= status.clientWidth && statusBox.left >= 0 && statusBox.right <= innerWidth,
      cardFits: [...list.querySelectorAll('.cms-meal')].every(card => {
        const box = card.getBoundingClientRect();
        return [...card.querySelectorAll('.cms-wp-edit > *')].every(child => {
          const r = child.getBoundingClientRect();
          return r.left >= box.left && r.right <= box.right && r.bottom <= box.bottom;
        });
      })
    };
  });
  expect(layout.listHeight / layout.height).toBeGreaterThanOrEqual(.5);
  expect(layout.listTop).toBeGreaterThanOrEqual(layout.controlBottom - 1);
  expect(layout.scroll).toBeLessThanOrEqual(layout.width);
  if (layout.width < 600) expect((await controls.boundingBox()).width).toBe(layout.width);
  expect(layout.statusFits).toBe(true);
  expect(layout.cardFits).toBe(true);
  expect(Math.max(...layout.exportTops) - Math.min(...layout.exportTops)).toBeLessThanOrEqual(1);
  for (const button of layout.buttons) {
    expect(button.height).toBeGreaterThanOrEqual(layout.touch ? 44 : 32);
    expect(button.hit).toBe(true);
  }
  await page.screenshot({ path: test.info().outputPath('wochenplan-umgesetzt.png') });
  const first = await controls.boundingBox();
  const list = page.locator('#cms-wp-grid');
  if (await list.evaluate(node => node.scrollHeight > node.clientHeight)) {
    await list.hover();
    await page.mouse.wheel(0, 2000);
    await expect.poll(() => list.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  }
  await expect(page.getByRole('button', { name: 'Gericht bearbeiten: ' + names[4], exact: true })).toBeInViewport({ ratio: 1 });
  expect((await controls.boundingBox()).y).toBe(first.y);
  for (const theme of ['dark', 'light']) {
    await page.evaluate(value => document.documentElement.dataset.theme = value, theme);
    const colors = await page.locator('.cms-meal').first().evaluate(node => {
      const style = selector => getComputedStyle(document.querySelector(selector));
      return {
        card: getComputedStyle(node).backgroundColor, text: getComputedStyle(node.querySelector('.cms-wp-edit')).color,
        heading: getComputedStyle(node.querySelector('h3')).color,
        status: style('#cms-status').color, header: style('.cmsneu-kopf').backgroundColor,
        primary: style('[data-action=openAddMeal]').color, primaryBackground: style('[data-action=openAddMeal]').backgroundColor
      };
    });
    expect(contrast(colors.text, colors.card)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.heading, colors.card)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.status, colors.header)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.primary, colors.primaryBackground)).toBeGreaterThanOrEqual(4.5);
    if (theme === 'dark') expect(colors.card).not.toBe('rgb(255, 255, 255)');
  }
});

test('TC-F8-02/04: Wochenwahl, alle bisherigen Erfassungsfelder und getrennte bestaetigte Loeschung', { tag: '@layout' }, async ({ page }) => {
  const state = await setup(page, { complex: true, write: true });
  for (const [action, week] of [['weekPrev', 47], ['weekThis', 48], ['weekNext', 49], ['weekNxt', 49], ['weekThis', 48]]) {
    await page.locator('[data-action=' + action + ']').click();
    await expect(page.locator('#cms-wp-title')).toHaveText('KW ' + week + ' / 2026');
    await expect.poll(() => state.filters[state.filters.length - 1]).toContain('dl_kalenderwoche eq ' + week);
  }
  const meal = page.getByRole('button', { name: 'Gericht bearbeiten: Kartoffelsuppe', exact: true });
  await expect(meal).toContainText('Mit frischem Brot');
  await expect(meal).toContainText('Allergene: G');
  await expect(page.getByRole('button', { name: 'Gericht bearbeiten: Betriebsurlaub', exact: true })).toBeVisible();
  await page.locator('.cms-wp-photo').click();
  await expect(page.locator('#cms-meal-rows [data-f=name]')).toHaveValue(names[0]);
  await expect(page.locator('#cms-meal-day')).toBeVisible();
  await expect(page.locator('#cms-meal-notice-sel')).toBeVisible();
  await expect(page.locator('[data-action=mealRowPaste]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#cms-modal-wrap')).toBeHidden();
  await meal.click();
  await page.goBack();
  await expect(page.locator('#cms-modal-wrap')).toBeHidden();
  await expect(page).toHaveURL(/cms\.html$/);
  await meal.click();
  await page.locator('#cms-meal-rows [data-f=price]').fill('6,40');
  await page.locator('[data-action=saveMeal]').click();
  await expect(meal).toContainText('6,40');
  expect(state.writes[0].method).toBe('PATCH');
  await page.getByRole('button', { name: 'Gericht', exact: true }).click();
  await page.locator('#cms-meal-rows [data-f=name]').fill('Lokales Testgericht');
  await page.locator('#cms-meal-rows [data-f=price]').fill('7,50');
  await page.locator('#cms-meal-rows [data-f=allergene]').fill('A, C');
  await page.locator('#cms-meal-day').selectOption('101004');
  await page.locator('#cms-meal-notice-sel').selectOption('__custom__');
  await page.locator('#cms-meal-notice-custom').fill('Solange der Vorrat reicht');
  await page.locator('[data-action=addMealRow]').click();
  await expect(page.locator('#cms-meal-rows .cms-ang-row')).toHaveCount(2);
  await page.locator('[data-action=removeMealRow]').click();
  await page.locator('input[data-action=mealRowImg]').setInputFiles({
    name: 'lokal.png', mimeType: 'image/png', buffer: Buffer.from(PHOTO.split(',')[1], 'base64')
  });
  await page.locator('[data-action=saveMeal]').click();
  await expect(page.getByRole('button', { name: 'Gericht bearbeiten: Lokales Testgericht', exact: true })).toContainText('Allergene: A, C');
  expect(state.writes.some(write => write.image)).toBe(true);
  const count = state.writes.length;
  await page.getByRole('button', { name: 'Gericht löschen: Lokales Testgericht', exact: true }).click();
  await page.keyboard.press('Escape');
  expect(state.writes.length).toBe(count);
  await page.getByRole('button', { name: 'Gericht löschen: Lokales Testgericht', exact: true }).click();
  await page.locator('[data-action=confirmDeleteMeal]').click();
  await expect(page.getByRole('button', { name: 'Gericht bearbeiten: Lokales Testgericht', exact: true })).toHaveCount(0);
});

test('TC-F8-03/04: aktuelles CMS-Motiv, echte Ausgabewege und Zurueck ohne Datenverlust', { tag: '@layout' }, async ({ page }) => {
  const state = await setup(page);
  await page.getByRole('button', { name: 'Vorschau', exact: true }).click();
  const dialog = page.locator('.cms-wp-preview'), image = page.locator('#cms-share-img');
  await expect(image).toBeVisible();
  const rendered = await image.evaluate(async node => {
    await node.decode();
    const canvas = document.createElement('canvas'); canvas.width = node.naturalWidth; canvas.height = node.naturalHeight;
    const context = canvas.getContext('2d'); context.drawImage(node, 0, 0);
    return { width: node.naturalWidth, background: [...context.getImageData(0, 0, 1, 1).data] };
  });
  expect(rendered.width).toBe(2382);
  expect(rendered.background).toEqual([240, 255, 252, 255]);
  await expect(image).toBeInViewport({ ratio: 1 });
  for (const name of ['Download', 'Drucken', 'Auf die Waage', 'Schließen']) {
    await expect(dialog.locator('.cms-modal-footer').getByRole('button', { name, exact: true })).toBeInViewport({ ratio: 1 });
  }
  await page.screenshot({ path: test.info().outputPath('wochenplan-vorschau-umgesetzt.png') });
  const event = page.waitForEvent('download');
  await page.locator('#cms-share-dl').click();
  const download = await event, png = fs.readFileSync(await download.path());
  expect(png.readUInt32BE(16)).toBe(2382);
  const shownDigest = await image.evaluate(async node => {
    const bytes = await (await fetch(node.src)).arrayBuffer();
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    return [...digest].map(value => value.toString(16).padStart(2, '0')).join('');
  });
  expect(createHash('sha256').update(png).digest('hex')).toBe(shownDigest);
  if (page.viewportSize().width <= 768) {
    await page.locator('#cms-share-print').click();
    await expect(page.locator('#_printOverlay img')).toBeVisible();
    await page.locator('#_printOverlay').getByRole('button', { name: /Drucken/ }).click();
    await expect.poll(() => page.evaluate(() => window.printCalls)).toBe(1);
    await page.locator('#_printOverlay').getByRole('button', { name: 'Zurück', exact: true }).click();
  } else {
    const popupEvent = page.waitForEvent('popup');
    await page.locator('#cms-share-print').click();
    const popup = await popupEvent;
    await expect(popup.locator('img')).toBeVisible();
    await expect.poll(() => popup.evaluate(() => window.printCalls)).toBe(1);
    await popup.close();
  }
  await page.locator('#cms-share-waage').click();
  await expect(page.locator('#wb-ueb')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.cmsCloseModal());
  await page.getByRole('button', { name: 'Vorschau', exact: true }).click();
  await expect(image).toBeVisible();
  await page.goBack();
  await expect(page.locator('#cms-modal-wrap')).toBeHidden();
  await expect(page.locator('#cms-wp-grid')).toBeVisible();
  await expect(page).toHaveURL(/cms\.html$/);
  state.design.wpTplColors['home:classic-red'].wpBgColor = '#fff1e0';
  await page.reload();
  await expect(page.locator('#cms-wp-grid .cms-meal')).toHaveCount(5);
  await page.getByRole('button', { name: 'Vorschau', exact: true }).click();
  await expect(image).toBeVisible();
  expect(await image.evaluate(async node => {
    await node.decode();
    const canvas = document.createElement('canvas'), context = canvas.getContext('2d');
    context.drawImage(node, 0, 0);
    return [...context.getImageData(0, 0, 1, 1).data];
  })).toEqual([255, 241, 224, 255]);
});

test('TC-F8-02/03: Teilen uebergibt den aktuellen Wochenplan als echte PNG-Datei', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: async data => {
      if (!navigator.userActivation.isActive) throw new DOMException('User activation required', 'NotAllowedError');
      const file = data.files[0], image = await createImageBitmap(file);
      window.sharedPlan = { text: data.text, name: file.name, type: file.type, width: image.width };
      image.close();
    } });
  });
  await page.getByRole('button', { name: 'Teilen', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.sharedPlan)).toEqual({
    text: '🍽️ *Mittagsmenü KW 48 · 23.11.26 – 27.11.26*',
    name: 'Wochenplan_KW48.png', type: 'image/png', width: 2382
  });
  await expect(page.getByRole('dialog', { name: 'Bild bereit', exact: true })).toHaveCount(0);
});

test('TC-F8-06: langsames HD-PNG wird mit frischer Aktivierung ohne Neurendern geteilt', { tag: '@layout' }, async ({ page }) => {
  await setup(page);
  const downloads = [];
  page.on('download', download => downloads.push(download));
  await page.evaluate(() => {
    window.shareAttempts = []; window.openedShareLinks = []; window.pngRenders = 0;
    window.open = url => { window.openedShareLinks.push(url); return null; };
    const toBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, ...args) {
      window.pngRenders++;
      toBlob.call(this, blob => setTimeout(() => {
        window.activationAtRenderEnd = navigator.userActivation.isActive;
        callback(blob);
        console.debug('test:wochenplan-share-rendered');
      }, 5500), ...args);
    };
    Object.defineProperty(navigator, 'share', { configurable: true, value: async data => {
      const active = navigator.userActivation.isActive;
      window.shareAttempts.push({ active });
      if (!active) throw new DOMException('User activation required', 'NotAllowedError');
      const file = data.files[0], bitmap = await createImageBitmap(file);
      const bytes = await file.arrayBuffer();
      const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
        .map(value => value.toString(16).padStart(2, '0')).join('');
      Object.assign(window.shareAttempts[window.shareAttempts.length - 1], {
        name: file.name, type: file.type, width: bitmap.width, text: data.text, digest
      });
      bitmap.close();
    } });
  });
  // Browser-Abfragen waehrenddessen koennen in Playwright die Nutzeraktivierung erneuern.
  const renderEnded = page.waitForEvent('console', {
    predicate: message => message.text() === 'test:wochenplan-share-rendered'
  });
  await page.getByRole('button', { name: 'Teilen', exact: true }).click();
  await renderEnded;
  const dialog = page.getByRole('dialog', { name: 'Bild bereit', exact: true });
  await expect(dialog).toBeVisible({ timeout: 15000 });
  expect(await page.evaluate(() => window.activationAtRenderEnd)).toBe(false);
  expect(await page.evaluate(() => window.shareAttempts)).toEqual([]);
  expect(downloads).toHaveLength(0);
  expect(await page.evaluate(() => window.openedShareLinks)).toEqual([]);
  await expect(dialog.getByRole('status')).toContainText('Teilen');
  for (const name of ['Teilen', 'Download', 'Schließen']) {
    await expect(dialog.locator('.cms-modal-footer').getByRole('button', { name, exact: true })).toBeInViewport({ ratio: 1 });
  }
  const image = dialog.locator('#cms-share-img');
  const prepared = await image.evaluate(async node => {
    await node.decode();
    const bytes = await (await fetch(node.src)).arrayBuffer();
    return {
      url: node.src, width: node.naturalWidth,
      digest: [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
        .map(value => value.toString(16).padStart(2, '0')).join('')
    };
  });
  expect(prepared.width).toBe(2382);
  await page.screenshot({ path: test.info().outputPath('wochenplan-teilen-bereit.png') });
  const downloadEvent = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download', exact: true }).click();
  const download = await downloadEvent;
  expect(createHash('sha256').update(fs.readFileSync(await download.path())).digest('hex')).toBe(prepared.digest);
  await dialog.getByRole('button', { name: 'Teilen', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => window.shareAttempts)).toEqual([{
    active: true, name: 'Wochenplan_KW48.png', type: 'image/png', width: 2382,
    text: '🍽️ *Mittagsmenü KW 48 · 23.11.26 – 27.11.26*', digest: prepared.digest
  }]);
  expect(await page.evaluate(() => window.pngRenders)).toBe(1);
  expect(await page.evaluate(() => window.openedShareLinks)).toEqual([]);
  await expect.poll(() => page.evaluate(() => history.state)).toEqual({ cmsTab: 'wp' });
  expect(await page.evaluate(async url => {
    try { await fetch(url); return true; } catch { return false; }
  }, prepared.url)).toBe(false);
});

for (const mode of ['AbortError', 'NotAllowedError', 'synchronous', 'unavailable', 'missing-image']) {
  test(`TC-F8-07: Teilen behandelt ${mode} ohne ungefragte Ersatzaktion`, { tag: '@layout' }, async ({ page }) => {
    await setup(page);
    const downloads = [];
    page.on('download', download => downloads.push(download));
    await page.evaluate(mode => {
      window.shareCalls = 0; window.openedShareLinks = [];
      window.open = url => { window.openedShareLinks.push(url); return null; };
      Object.defineProperty(navigator, 'share', { configurable: true, value: mode === 'unavailable' ? undefined : () => {
        window.shareCalls++;
        if (mode === 'synchronous') throw new TypeError('unsupported file');
        return Promise.reject(new DOMException('test share rejection', mode));
      } });
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: mode === 'unavailable' ? undefined : options => options.files && options.files[0].type === 'image/png' });
      if (mode === 'missing-image') HTMLCanvasElement.prototype.toBlob = function (callback) { callback(null); };
    }, mode);
    await page.getByRole('button', { name: 'Teilen', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Bild bereit', exact: true });
    if (mode === 'AbortError') {
      await expect.poll(() => page.evaluate(() => window.shareCalls)).toBe(1);
      await expect(dialog).toHaveCount(0);
    } else if (mode === 'missing-image') {
      await expect(page.locator('.cms-toast')).toContainText('Bild konnte nicht erstellt werden');
      expect(await page.evaluate(() => window.shareCalls)).toBe(0);
      await expect(dialog).toHaveCount(0);
    } else {
      await expect(dialog).toBeVisible();
      const share = dialog.getByRole('button', { name: 'Teilen', exact: true });
      if (mode === 'unavailable') {
        await expect(share).toBeDisabled();
        await expect(dialog.getByRole('status')).toContainText('unterstützt');
      } else {
        await expect(dialog.getByRole('status')).toContainText('WhatsApp verwenden');
        await page.evaluate(() => {
          Object.defineProperty(navigator, 'share', { configurable: true, value: () =>
            Promise.reject(new DOMException('test share rejection', 'NotAllowedError')) });
        });
        await share.click();
        await expect(share).toBeEnabled();
        await expect(dialog.getByRole('status')).toContainText('WhatsApp verwenden');
      }
      if (mode === 'unavailable') {
        await page.goBack();
        await expect(dialog).toHaveCount(0);
      } else if (mode === 'synchronous') {
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
      } else {
        await page.evaluate(() => {
          Object.defineProperty(navigator, 'share', { configurable: true, value: () =>
            Promise.reject(new DOMException('cancelled', 'AbortError')) });
        });
        await share.click();
        await expect(dialog.getByRole('status')).toContainText('abgebrochen');
        const waEvent = page.waitForEvent('download');
        await dialog.locator('.cms-modal-footer').getByRole('button', { name: 'WhatsApp', exact: true }).click();
        expect((await waEvent).suggestedFilename()).toMatch(/\.png$/);
        await expect.poll(() => page.evaluate(() => window.openedShareLinks)).toHaveLength(1);
        await dialog.locator('.cms-modal-footer').getByRole('button', { name: 'Schließen', exact: true }).click();
      }
      await expect.poll(() => page.evaluate(() => history.state)).toEqual({ cmsTab: 'wp' });
      await expect(page.locator('#cms-wp-grid')).toBeVisible();
      if (mode === 'unavailable' || mode === 'missing-image') {
        expect(downloads).toHaveLength(0);
        expect(await page.evaluate(() => window.openedShareLinks)).toEqual([]);
      }
    }
  });
}

test('TC-F8-08: Zurueck am Verlaufsende verankert sich auf der Homepage ohne leeren Bildschirm', { tag: '@layout' }, async ({ page }) => {
  const state = await setup(page);
  await page.route('**maps.googleapis.com/**', route => route.abort());
  await page.route('**/api/track', route => route.fulfill({ status: 204 }));
  // Realistischer Ablauf: Homepage war vorher da (Verlauf: index -> cms).
  await page.goto(BASE + '/index.html');
  await page.waitForTimeout(500);
  await page.evaluate(() => { sessionStorage.setItem('cms_home_anker', '1'); location.href = '/cms.html'; });
  await page.locator('#cms-app').waitFor({ state: 'visible' });
  // CMS-Verlauf abarbeiten, bis die Homepage erreicht ist (max. 8 Schritte).
  for (let i = 0; i < 8; i++) {
    await page.goBack();
    await page.waitForTimeout(600);
    if (/\/(index\.html?)?$/.test(page.url())) break;
  }
  await expect(page).toHaveURL(/\/(index\.html?)?$/);
  // Die Homepage ist wirklich geladen: Hero-Text steht im Dokument und das
  // Dokument hat nennenswerten Inhalt (kein Leerbildschirm).
  await expect(page.locator('h1').first()).toContainText('Nahversorger');
  expect(await page.evaluate(() => document.body.innerText.trim().length)).toBeGreaterThan(100);
  // Anker aktiv: weitere Zurück-Taste(n) bleiben auf der Homepage, statt
  // ins CMS zurueck oder in einen leeren Bildschirm zu pendeln.
  for (let i = 0; i < 4; i++) {
    await page.goBack();
    await page.waitForTimeout(500);
    const url = page.url();
    expect(url).not.toMatch(/cms\.html$/);
    expect(url).not.toBe('about:blank');
    await expect(page.locator('h1').first()).toContainText('Nahversorger');
    expect(await page.evaluate(() => document.body.innerText.trim().length)).toBeGreaterThan(100);
  }
  expect(await page.evaluate(() => history.state && history.state.cmsHomeAnker)).toBe(true);
  // Verlaesst der Nutzer die Homepage normal, wird der Anker abgebaut.
  await page.evaluate(() => { location.href = '/impressum'; });
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => sessionStorage.getItem('cms_home_anker'))).toBe(null);
  expect(state.errors.get(page)).toEqual([]);
});

test('TC-F8-05: Android-Zurueck schliesst genau die oberste Ebene und hinterlaesst keine toten Eintraege', { tag: '@layout' }, async ({ page }) => {
  await setup(page);
  const modal = page.locator('#cms-modal-wrap'), image = page.locator('#cms-share-img');
  const state = () => page.evaluate(() => history.state);
  expect(await state()).toEqual({ cmsTab: 'wp' });
  // Mit Schliessen-Knopf geschlossene Dialoge duerfen keinen Verlaufseintrag zuruecklassen.
  for (let round = 0; round < 2; round++) {
    await page.getByRole('button', { name: 'Vorschau', exact: true }).click();
    await expect(image).toBeVisible();
    await page.locator('.cms-modal-footer').getByRole('button', { name: 'Schließen', exact: true }).click();
    await expect(modal).toBeHidden();
    await expect.poll(state).toEqual({ cmsTab: 'wp' });
  }
  // Zurueck schliesst zuerst die Druckansicht, danach die Vorschau.
  await page.getByRole('button', { name: 'Vorschau', exact: true }).click();
  await expect(image).toBeVisible();
  if (page.viewportSize().width <= 768) {
    await page.locator('#cms-share-print').click();
    await expect(page.locator('#_printOverlay img')).toBeVisible();
    await page.goBack();
    await expect(page.locator('#_printOverlay')).toHaveCount(0);
    await expect(image).toBeVisible();
    await page.locator('#cms-share-print').click();
    await page.locator('#_printOverlay').getByRole('button', { name: 'Zurück', exact: true }).click();
    await expect(page.locator('#_printOverlay')).toHaveCount(0);
    await expect(image).toBeVisible();
    await expect.poll(state).toEqual({ cmsModal: true });
  }
  await page.goBack();
  await expect(modal).toBeHidden();
  await expect(page.locator('#cms-wp-grid')).toBeVisible();
  await expect.poll(state).toEqual({ cmsTab: 'wp' });
  await expect(page).toHaveURL(/cms\.html$/);
});

test('TC-F8-02: klassische Wochenplan-Darstellung bleibt unveraendert', async ({ page }) => {
  await setup(page, { classic: true });
  await expect(page.locator('.cms-wp-controls')).toHaveCount(0);
  await expect(page.locator('.cms-wp-edit')).toHaveCount(0);
  await expect(page.locator('.cms-meal-actions [data-action=editMeal]')).toHaveCount(5);
});
