const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const { sources } = require('../tools/build-wochenplan-mockup');

const url = pathToFileURL(path.resolve(__dirname, '..', 'mockups', 'cms-wochenplan-mobil-mockup.html')).href + '?ansicht=app';
const errors = new WeakMap();
const api = new WeakMap();

test.beforeEach(async ({ page }) => {
  errors.set(page, []); api.set(page, []);
  page.on('pageerror', error => errors.get(page).push(error.message));
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) api.get(page).push(request.url()); });
  await page.route('https://unpkg.com/**', route => route.abort());
  await page.goto(url);
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
  expect(api.get(page)).toEqual([]);
});

test('TC-WPM-01: ruhige direkte Aktionen, nutzbare Liste und Touchflaechen ohne Ueberlauf', { tag: '@layout' }, async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Wochenplan', exact: true })).toBeVisible();
  await expect(page.locator('.brand img')).toBeVisible();
  expect(await page.locator('.brand img').evaluate(node => node.complete && node.naturalWidth > 0)).toBe(true);
  const geometry = await page.evaluate(() => ({
    width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    listHeight: document.querySelector('.days-area').clientHeight,
    contentFits: [...document.querySelectorAll('.day')].every(day => {
      const card = day.getBoundingClientRect();
      return [...day.querySelectorAll('.meal-edit > *')].every(node => {
        const box = node.getBoundingClientRect();
        return box.top >= card.top && box.bottom <= card.bottom && box.left >= card.left && box.right <= card.right;
      });
    }),
    touch: innerWidth < 600 || matchMedia('(pointer:coarse)').matches,
    buttons: [...document.querySelectorAll('.app-head button,.controls button')].map(node => {
      const box = node.getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return { label: node.getAttribute('aria-label') || node.textContent, width: box.width, height: box.height,
        left: box.left, right: box.right, bottom: box.bottom, hit: hit === node || node.contains(hit) };
    })
  }));
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width);
  expect(geometry.scrollHeight).toBeLessThanOrEqual(geometry.height);
  expect(geometry.listHeight / geometry.height).toBeGreaterThanOrEqual(.5);
  expect(geometry.contentFits).toBe(true);
  for (const button of geometry.buttons) {
    expect(button.height, button.label).toBeGreaterThanOrEqual(geometry.touch ? 44 : 32);
    expect(button.width, button.label).toBeGreaterThanOrEqual(geometry.touch ? 44 : 32);
    expect(button.left, button.label).toBeGreaterThanOrEqual(0);
    expect(button.right, button.label).toBeLessThanOrEqual(geometry.width);
    expect(button.bottom, button.label).toBeLessThanOrEqual(geometry.height);
    expect(button.hit, button.label).toBe(true);
  }
  const buttons = await page.locator('.exports button').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().top));
  expect(Math.max(...buttons) - Math.min(...buttons)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: test.info().outputPath('wochenplan-mockup.png') });
});

test('TC-WPM-02: Wochenwahl und getrennte lokale Erfassung, Bearbeitung und Loeschbestaetigung', async ({ page }) => {
  await page.getByRole('button', { name: 'Nächste Woche anzeigen', exact: true }).click();
  await expect(page.locator('#week-title')).toHaveText('KW 49 / 2026');
  await page.getByRole('button', { name: 'Diese Woche', exact: true }).click();
  await page.getByRole('button', { name: 'Vorherige Woche', exact: true }).click();
  await expect(page.locator('#week-title')).toHaveText('KW 47 / 2026');
  await page.getByRole('button', { name: 'Nächste Woche', exact: true }).click();
  await expect(page.locator('#week-title')).toHaveText('KW 49 / 2026');
  await page.getByRole('button', { name: 'Diese Woche', exact: true }).click();
  await page.getByRole('button', { name: 'Gericht', exact: true }).click();
  await page.getByRole('combobox', { name: 'Wochentag', exact: true }).selectOption('4');
  await page.getByLabel('Gerichtsname', { exact: true }).fill('Lokales Testgericht');
  await page.getByLabel('Preis in EUR', { exact: true }).fill('8,90');
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await page.getByRole('button', { name: 'Gericht bearbeiten: Lokales Testgericht', exact: true }).click();
  await page.getByLabel('Preis in EUR', { exact: true }).fill('9,40');
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Gericht bearbeiten: Lokales Testgericht', exact: true })).toContainText('9,40');
  await page.getByRole('button', { name: 'Gericht löschen: Lokales Testgericht', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Gericht bearbeiten: Lokales Testgericht', exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Gericht löschen: Lokales Testgericht', exact: true }).click();
  await page.getByRole('button', { name: 'Löschen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Gericht bearbeiten: Lokales Testgericht', exact: true })).toHaveCount(0);
});

test('TC-WPM-03: Ausgaben und Hilfe bleiben getrennt erreichbar; Dialoge passen mobil', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  for (const [action, title] of [
    ['preview', 'Wochenplan-Vorschau'], ['print', 'Druckvorschau'],
    ['scale', 'Auf die Waage'], ['share', 'Wochenplan teilen'], ['help', 'Hilfe zum Wochenplan']
  ]) {
    await page.locator('[data-action=' + action + ']').first().click();
    const dialog = page.getByRole('dialog', { name: title, exact: true });
    await expect(dialog).toBeVisible();
    if (action !== 'help') await expect(dialog.locator('.output-graphic img')).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(375);
    expect(box.y + box.height).toBeLessThanOrEqual(667);
    const footer = await dialog.locator('.dialog-foot').boundingBox();
    expect(footer.y + footer.height).toBeLessThanOrEqual(box.y + box.height);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('[data-action=' + action + ']').first()).toBeFocused();
  }
  await page.getByRole('button', { name: 'Gericht', exact: true }).click();
  await page.getByRole('button', { name: 'Weiteres Gericht', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Gericht hinzufügen', exact: true });
  expect(await dialog.locator('.dialog-body').evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true);
  await expect(dialog.getByRole('button', { name: 'Speichern', exact: true })).toBeInViewport();
});

test('TC-WPM-04: fertiges CMS-Motiv und alle Vorschauaktionen passen ohne Abschneiden', { tag: '@layout' }, async ({ page }) => {
  await page.getByRole('button', { name: 'Vorschau', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const image = dialog.getByRole('img', { name: 'Fertiges Wochenplan-Motiv im gespeicherten CMS-Design', exact: true });
  await expect(image).toBeVisible();
  expect(await image.evaluate(node => ({ width: node.naturalWidth, loaded: node.complete }))).toEqual({ width: 2382, loaded: true });
  await expect(image).toBeInViewport({ ratio: 1 });
  for (const name of ['Download', 'Drucken', 'Auf die Waage', 'Schließen']) {
    const button = dialog.getByRole('button', { name, exact: true });
    await expect(button).toBeEnabled();
    await expect(button).toBeInViewport({ ratio: 1 });
    const box = await button.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    const hit = await button.evaluate(node => {
      const box = node.getBoundingClientRect();
      return node.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
    });
    expect(hit, name).toBe(true);
  }
  await page.screenshot({ path: test.info().outputPath('wochenplan-cms-vorschau.png') });
});

test('TC-WPM-05: Original-CMS-Pixel, identisches Download-PNG, echter Druckaufruf und lokale Waagendemo', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.getByRole('button', { name: 'Vorschau', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const image = dialog.locator('.output-graphic img');
  await expect(image).toBeVisible();
  const initial = await image.getAttribute('src');
  const reference = await page.evaluate(async ({ source, logo }) => {
    const config = window.WochenplanMockup.config;
    const render = new Function('hpCfgGet', 'hdLogoSrc', source.colors + source.context + source.render + '\nreturn generateMenuImage;')(
      () => config, () => logo);
    const rows = [...document.querySelectorAll('.day')].flatMap(day =>
      [...day.querySelectorAll('.meal-edit')].map((meal, i) => ({
        day: i === 0 ? day.querySelector('h2').textContent : '',
        dish: meal.querySelector('.meal-name').textContent,
        price: meal.querySelector('.meal-price').firstChild.textContent, alt: ''
      })));
    const flyer = config.wpFlyerTemplate || 'classic-red', home = config.wpHomeTemplate || 'classic-red';
    const template = flyer !== 'classic-red' ? flyer : home !== 'classic-red' ? home : flyer;
    const kind = flyer !== 'classic-red' ? 'flyer' : 'home';
    const blob = await new Promise(resolve => render(rows, 'KW 48 \u00b7 23.11.26 \u2013 27.11.26', resolve, template, kind, { scale: 3 }));
    return new Promise(resolve => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob);
    });
  }, {
    source: sources(),
    logo: 'data:image/png;base64,' + fs.readFileSync(path.resolve(__dirname, '..', 'static-site', 'images', 'dorfladen-logo.png')).toString('base64')
  });
  const digest = data => createHash('sha256').update(Buffer.from(data.split(',')[1], 'base64')).digest('hex');
  expect(digest(initial)).toBe(digest(reference));

  const downloadEvent = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download', exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('Wochenplan_KW48_2026.png');
  expect(createHash('sha256').update(fs.readFileSync(await download.path())).digest('hex')).toBe(digest(initial));

  await page.evaluate(() => { window.printCalls = 0; window.print = () => { window.printCalls++; }; });
  await dialog.getByRole('button', { name: 'Drucken', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.printCalls)).toBe(1);
  await expect(page.locator('#print-sheet img')).toHaveAttribute('src', initial);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#print-sheet img')).toBeVisible();
  await expect(page.locator('.app')).not.toBeVisible();
  await expect(dialog).not.toBeVisible();
  await page.emulateMedia({ media: 'screen' });
  await dialog.getByRole('button', { name: 'Auf die Waage', exact: true }).click();
  await dialog.getByLabel('Anzeigedauer in Sekunden', { exact: true }).fill('15');
  await dialog.getByRole('button', { name: 'Demo testen', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('15 Sekunden');
  await expect(dialog.getByRole('status')).toContainText('Keine Daten an eine Waage gesendet');
  await dialog.getByRole('button', { name: 'Zurück', exact: true }).click();
  await expect(image).toHaveAttribute('src', initial);
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Teilen', exact: true }).click();
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false });
  });
  await dialog.getByRole('button', { name: 'Teilen', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('unterstützt das Teilen von Dateien nicht');
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async options => {
      const file = options.files[0];
      window.sharedFile = { name: file.name, type: file.type, size: file.size };
    } });
  });
  await dialog.getByRole('button', { name: 'Teilen', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.sharedFile)).toEqual({
    name: 'Wochenplan_KW48_2026.png', type: 'image/png', size: Buffer.from(initial.split(',')[1], 'base64').length
  });
  await page.evaluate(() => {
    window.whatsappTab = { opener: null, location: { href: '' } };
    window.open = () => window.whatsappTab;
  });
  const whatsappDownload = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'WhatsApp', exact: true }).click();
  expect((await whatsappDownload).suggestedFilename()).toBe('Wochenplan_KW48_2026.png');
  const whatsapp = await page.evaluate(() => window.whatsappTab.location.href);
  expect(new URL(whatsapp).origin).toBe('https://wa.me');
  expect(new URL(whatsapp).searchParams.get('text')).toBe('Mittagsmenü KW 48 · 23.11.26 – 27.11.26');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Gericht bearbeiten: Halsgrat in Gulaschsoße mit Spätzle und Salat', exact: true }).click();
  await page.getByLabel('Preis in EUR', { exact: true }).fill('10,40');
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await page.getByRole('button', { name: 'Vorschau', exact: true }).click();
  await expect(image).toBeVisible();
  expect(digest(await image.getAttribute('src'))).not.toBe(digest(initial));
});
