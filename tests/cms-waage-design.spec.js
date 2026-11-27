const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const BASE = process.env.TEST_URL;

function model() {
  const context = { window: {}, structuredClone, crypto, Intl };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'static-site', 'js', 'angebote-modell.js'), 'utf8'), context);
  return context.window.AngeboteModel;
}
function defaults() {
  const M = model();
  return { version: 0, weekly: M.blank('weekly').layout, drinks: M.blank('drinks').layout };
}

async function offlineCms(page, design, config) {
  const state = { design: design || defaults(), writes: [], configWrites: [], config: config || {}, errors: [] };
  page.on('pageerror', (error) => state.errors.push(error.message));
  await page.addInitScript(() => { localStorage.setItem('cms_auth_token', 'waage-test'); localStorage.setItem('dl_cookies', '1'); });
  await page.route('**/*', async (route) => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== new URL(BASE).origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const json = (body) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/api/cms-auth') return json({ success: true, authenticated: true, token: 'waage-test' });
    if (url.pathname === '/api/cms-config') {
      if (request.method() === 'POST') {
        const body = request.postDataJSON(); state.configWrites.push(body); state.config[body.name] = body.wert;
        return json({ success: true });
      }
      return json({ success: true, data: state.config });
    }
    if (url.pathname === '/api/angebote-verwaltung') {
      if (request.method() === 'PUT') {
        state.design = request.postDataJSON().data; state.design.version++;
        state.writes.push(structuredClone(state.design));
      }
      return json({ success: true, design: state.design, actions: [] });
    }
    if (request.method() !== 'GET') throw new Error('Unexpected mocked write: ' + url.pathname);
    if (url.pathname === '/api/angebote-flyer') return json({ success: true, actions: [], homepage: {} });
    return json({ success: true, data: [], actions: [], groups: {} });
  });
  await page.goto(BASE + '/cms.html?tab=cfg');
  await page.evaluate(() => sessionStorage.setItem('cms_auth_ok', JSON.parse(document.getElementById('cms-pw-hash').textContent)));
  await page.reload();
  return state;
}
async function open(page, section, selector) {
  await page.evaluate((id) => { window.cmsTab('cfg'); window.cmsCfgSubTab('cfg-plakat'); window.cfgSwitchSection(id); }, section);
  const root = page.locator(selector);
  await expect(root.locator('.an-designer-settings')).toBeVisible();
  return root;
}
async function previewSize(root) {
  return root.locator('[data-design-preview] canvas').first().evaluate((canvas) => ({ w: canvas.width, h: canvas.height }));
}

test('TC-F1-01: Reiter Waage groß und Waage klein stehen in der Leiste und öffnen je ihren Designer', { tag: '@layout' }, async ({ page }) => {
  const state = await offlineCms(page);
  const nav = page.locator('#cms-cfg-plakat .cfg-section-nav');
  await expect(nav.locator('[data-id=sec-waage-large]')).toHaveText('Waage groß');
  await expect(nav.locator('[data-id=sec-waage-small]')).toHaveText('Waage klein');
  const order = await nav.locator('.cfg-section-btn').evaluateAll((nodes) => nodes.map((node) => node.dataset.id));
  expect(order).toEqual(['sec-plakat', 'sec-flyer', 'sec-drinks', 'sec-waage-large', 'sec-waage-small', 'sec-shared']);
  const large = await open(page, 'sec-waage-large', '#an-design-root-waage-large');
  expect((await previewSize(large)).w / (await previewSize(large)).h).toBeCloseTo(800 / 462, 2);
  await expect(large.locator('.an-density-choice')).toHaveCount(0);
  const small = await open(page, 'sec-waage-small', '#an-design-root-waage-small');
  expect((await previewSize(small)).w / (await previewSize(small)).h).toBeCloseTo(800 / 280, 2);
  const geometry = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(geometry.scroll).toBeLessThanOrEqual(geometry.width);
  expect(state.writes).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('TC-F2-01/F3-01: Änderung wirkt in der Vorschau; Speichern schreibt nur das eigene Profil', async ({ page }) => {
  const state = await offlineCms(page);
  const large = await open(page, 'sec-waage-large', '#an-design-root-waage-large');
  const before = await large.locator('[data-design-preview] canvas').first().evaluate((canvas) => canvas.toDataURL());
  const background = large.locator('input[data-style=background]');
  await background.evaluate((input) => { input.value = '#112233'; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); });
  await expect.poll(() => large.locator('[data-design-preview] canvas').first().evaluate((canvas) => canvas.toDataURL())).not.toBe(before);
  expect(state.writes).toEqual([]);
  await large.locator('[data-design-save]').click();
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.writes[0].scale_large.background).toBe('#112233');
  expect(state.writes[0].scale_small).toBeUndefined();
  await page.reload();
  const again = await open(page, 'sec-waage-large', '#an-design-root-waage-large');
  await expect(again.locator('input[data-style=background]')).toHaveValue('#112233');
  const small = await open(page, 'sec-waage-small', '#an-design-root-waage-small');
  await expect(small.locator('input[data-style=background]')).not.toHaveValue('#112233');
  expect(state.errors).toEqual([]);
});

test('TC-F3-01: beide Profile bleiben bei getrennten Speichervorgängen unabhängig', async ({ page }) => {
  const state = await offlineCms(page);
  for (const [section, selector, color] of [['sec-waage-large', '#an-design-root-waage-large', '#112233'], ['sec-waage-small', '#an-design-root-waage-small', '#445566']]) {
    const root = await open(page, section, selector);
    await root.locator('input[data-style=background]').evaluate((input, value) => {
      input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
    }, color);
    await root.locator('[data-design-save]').click();
    await expect.poll(() => state.writes.length).toBe(color === '#112233' ? 1 : 2);
  }
  const last = state.writes[1];
  expect(last.scale_large.background).toBe('#112233');
  expect(last.scale_small.background).toBe('#445566');
  expect(state.errors).toEqual([]);
});

test('TC-F4-01: neue Aktionen übernehmen den Standard, bestehende Gestaltung bleibt', () => {
  const M = model();
  const standards = defaults();
  const large = M.clone(standards.drinks), small = M.clone(standards.drinks);
  large.background = '#112233'; small.background = '#445566'; small.template = 'classic';
  const fresh = M.blank('weekly', undefined, { large, small });
  expect(fresh.layout.target_styles.scale.background).toBe('#112233');
  expect(fresh.layout.target_styles.scale_small.background).toBe('#445566');
  expect(fresh.layout.target_styles.scale_small.template).toBe('classic');
  expect(fresh.layout.background).toBe('#fffdf6');
  const plain = M.blank('weekly');
  expect(plain.layout.target_styles).toBeUndefined();
  const legacy = M.blank('drinks', standards.drinks, { large: undefined, small: undefined });
  expect(legacy.layout.target_styles).toBeUndefined();
});

test('TC-F2-01: Waage klein hat eine eigene 800×280-Gestaltung mit lesbaren Elementen', () => {
  const M = model();
  const data = M.blank('drinks');
  const item = M.item(); Object.assign(item, { name: 'Testgetränk', price_cents: 999, packaging: 'Mehrweg', deposit_cents: 310, units: 20, volume_ml: 500 });
  data.items.push(item);
  M.applyTemplate(data);
  const small = data.layout.targets.scale_small[0];
  expect(small.width).toBe(800); expect(small.height).toBe(280);
  for (const element of small.elements) {
    expect(element.y + element.h, element.type).toBeLessThanOrEqual(280 + 1);
    if (element.font_size && element.type !== 'shape') expect(element.font_size, element.type).toBeGreaterThanOrEqual(12);
  }
  expect(data.layout.targets.scale[0].height).toBe(462);
});

async function openWeekWaage(page, profile) {
  await page.evaluate((id) => { window.cmsTab('cfg'); window.cmsCfgSubTab('cfg-wp'); window.wpCfgSwitchSection(id); }, 'wp-sec-waage-' + profile);
  const root = page.locator('#wp-sec-waage-' + profile);
  await expect(root.locator('[data-wpw=bg]')).toBeVisible();
  await expect.poll(() => root.locator('[data-wpw-img]').evaluate((img) => img.src.startsWith('blob:') && img.naturalWidth)).toBeGreaterThan(0);
  return root;
}
async function produced(page, profile) {
  return page.evaluate(async (height) => {
    let captured;
    window.KWerbebilder = window.KWerbebilder || {};
    window.KWerbebilder.uebertragen = (options) => { captured = options; };
    window.cmsWaageWP();
    const files = await captured.erzeuge('dauer', () => {}, () => false, { w: 1600, h: height });
    const bitmap = await createImageBitmap(files[0].blob);
    const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext('2d'); context.drawImage(bitmap, 0, 0);
    return { w: bitmap.width, h: bitmap.height, corner: Array.from(context.getImageData(6, 6, 1, 1).data).slice(0, 3) };
  }, profile === 'small' ? 560 : 924);
}

test('TC-F5-01: ohne gespeicherte Einstellung nutzt das Waagenbild die Vorlagenfarben', async ({ page }) => {
  const state = await offlineCms(page);
  const root = await openWeekWaage(page, 'large');
  const preview = await root.locator('[data-wpw-img]').evaluate((img) => ({ w: img.naturalWidth, h: img.naturalHeight }));
  expect(preview).toEqual({ w: 1600, h: 924 });
  const output = await produced(page, 'large');
  expect(output.w).toBe(1600);
  for (const channel of output.corner) expect(channel).toBeGreaterThanOrEqual(250);
  expect(state.configWrites).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('TC-F5-02: gespeicherte Farbe wirkt je Profil im Waagenbild; Speichern schreibt genau einen Schlüssel', async ({ page }) => {
  const state = await offlineCms(page);
  const root = await openWeekWaage(page, 'large');
  await root.locator('[data-wpw=bg]').evaluate((input) => {
    input.value = '#102030'; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(root.locator('[data-wpw-status]')).toContainText('noch nicht gespeichert');
  expect(state.configWrites).toEqual([]);
  await root.locator('[data-wpw-save]').click();
  await expect.poll(() => state.configWrites.length).toBe(1);
  expect(state.configWrites[0].name).toBe('wp_waage_design');
  expect(state.configWrites[0].wert.large.bg).toBe('#102030');
  expect(state.configWrites[0].wert.small).toBeUndefined();
  const large = await produced(page, 'large');
  expect(Math.abs(large.corner[0] - 16)).toBeLessThan(8);
  expect(Math.abs(large.corner[2] - 48)).toBeLessThan(8);
  const small = await produced(page, 'small');
  expect(small.h).toBe(560);
  for (const channel of small.corner) expect(channel).toBeGreaterThanOrEqual(250);
  expect(state.errors).toEqual([]);
});

test('TC-F5-02: Schriftgröße und Schriftart verändern das Waagenbild', async ({ page }) => {
  await offlineCms(page);
  const root = await openWeekWaage(page, 'large');
  const bytes = () => root.locator('[data-wpw-img]').evaluate(async (img) => {
    const buffer = await (await fetch(img.src)).arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  });
  const before = await bytes();
  await root.locator('[data-wpw=fs]').evaluate((input) => { input.value = '18'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await expect.poll(bytes).not.toBe(before);
  const sized = await bytes();
  await root.locator('[data-wpw=font]').selectOption('Georgia');
  await expect.poll(bytes).not.toBe(sized);
  await expect(root.locator('[data-wpw-hint]')).toBeHidden();
});

test('TC-F4-03: Aktion im Querformat übernimmt den gespeicherten Waagen-Standard', async ({ page }) => {
  const design = defaults();
  const withStandard = model().clone(design.drinks);
  withStandard.background = '#102030'; design.scale_large = withStandard;
  await offlineCms(page, design);
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  await page.route((url) => url.pathname === '/api/angebote', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: [{
    dl_angeboteid: 'a0', dl_produkt: 'Apfelsaft', dl_details: '1 l', dl_preis: 2.49, dl_statt_preis: 2.99, dl_artikelnummer: '400000',
    dl_aktion_titel: 'Herbstwoche', dl_aktion_id: 'A1', dl_gueltig_von: '2026-10-26', dl_gueltig_bis: '2026-10-31', dl_sortierung: 0, dl_status: 101001 }] }) }));
  await page.route((url) => url.pathname === '/api/werbebilder', (route) => route.fulfill({ contentType: 'application/json',
    body: JSON.stringify([{ dl_artikelnummer: '400000', dl_bild_base64: png, source: 'sharepoint', name: '400000.png' }]) }));
  await page.reload();
  await page.waitForFunction(() => typeof window.cmsWaageAktion === 'function');
  await page.waitForTimeout(1500);
  const corner = await page.evaluate(async () => {
    let captured;
    window.KWerbebilder = window.KWerbebilder || {};
    window.KWerbebilder.uebertragen = (options) => { captured = options; };
    window.cmsWaageAktion('A1');
    const files = await captured.erzeuge('dauer', () => {}, () => false, { w: 1600, h: 924 });
    const bitmap = await createImageBitmap(files[0].blob);
    const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext('2d'); context.drawImage(bitmap, 0, 0);
    return Array.from(context.getImageData(6, 6, 1, 1).data).slice(0, 3);
  });
  expect(Math.abs(corner[0] - 16)).toBeLessThan(8);
  expect(Math.abs(corner[2] - 48)).toBeLessThan(8);
});
