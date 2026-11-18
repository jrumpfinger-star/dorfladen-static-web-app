const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const BASE = process.env.TEST_URL;

// Generate defaults from the production model, not a second hand-maintained flyer fixture.
function defaults() {
  const context = { window: {}, structuredClone, crypto, Intl };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'static-site', 'js', 'angebote-modell.js'), 'utf8'), context);
  return { version: 0, weekly: context.window.AngeboteModel.blank('weekly').layout,
    drinks: context.window.AngeboteModel.blank('drinks').layout };
}
async function offlineCms(page) {
  const state = { design: defaults(), config: {}, writes: [], errors: [] };
  page.on('pageerror', (error) => state.errors.push(error.message));
  await page.addInitScript(() => { localStorage.setItem('cms_auth_token', 'palette-test'); localStorage.setItem('dl_cookies', '1'); });
  await page.route('**/*', async (route) => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== new URL(BASE).origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const json = (body) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/api/cms-auth') return json({ success: true, authenticated: true, token: 'palette-test' });
    if (url.pathname === '/api/cms-config') {
      if (request.method() === 'POST') { const body = request.postDataJSON(); state.writes.push(body); state.config[body.name] = body.wert; }
      return json({ success: true, data: state.config });
    }
    if (url.pathname === '/api/angebote-verwaltung') {
      if (request.method() === 'PUT') { state.design = request.postDataJSON().data; state.design.version++; state.writes.push(structuredClone(state.design)); }
      return json({ success: true, design: state.design, actions: [] });
    }
    if (request.method() !== 'GET' && url.pathname !== '/api/werbebilder') throw new Error('Unexpected mocked write: ' + url.pathname);
    if (url.pathname === '/api/preisliste') return json({ groups: {} });
    if (url.pathname === '/api/angebote') return json({ success: true, data: [{ dl_angeboteid: 'palette',
      dl_aktion_id: 'palette', dl_produkt: 'Regionaler Apfelsaft', dl_preis: 2.49, dl_statt_preis: 2.99,
      dl_gueltig_von: '2026-11-16', dl_gueltig_bis: '2026-11-25' }] });
    return json({ success: true, data: [], actions: [] });
  });
  await page.goto(BASE + '/cms.html?tab=cfg&flyer=drinks');
  await page.evaluate(() => sessionStorage.setItem('cms_auth_ok', JSON.parse(document.getElementById('cms-pw-hash').textContent)));
  await page.reload();
  await expect(page.locator('#an-design-root [data-style=family]')).toHaveCount(10);
  return state;
}
async function tool(root, name, index) {
  const select = root.locator('.an-designer-tool-select');
  if (await select.isVisible()) await select.selectOption(String(index));
  else await root.getByRole('tab', { name, exact: true }).click();
}
async function area(page, top, sub, selector) {
  await page.evaluate(({ top, sub }) => {
    window.cmsCfgSubTab(top);
    if (top === 'cfg-plakat') window.cfgSwitchSection(sub);
    if (top === 'cfg-wp') window.wpCfgSwitchSection(sub);
  }, { top, sub });
  const root = page.locator(selector); await expect(root.locator('.an-designer-settings')).toBeVisible(); return root;
}

test('TC-F61-01/02/03: all legacy families retain exact colours; palettes change pixels, never geometry', { tag: '@ohne-layout' }, async ({ page }) => {
  await offlineCms(page);
  const result = await page.evaluate(async () => {
    const M = window.AngeboteModel, D = window.AngeboteDesign;
    const report = { legacy: [], palettes: [], xl: false, independent: false };
    const source = M.blank('drinks'), item = M.item();
    Object.assign(item, { name: 'Regionaler Apfelsaft', units: 6, volume_ml: 1000, packaging: 'Mehrweg',
      price_cents: 1249, old_price_cents: 1499, deposit_cents: 310 });
    source.items.push(item);
    const geometry = (data) => { M.applyTemplate(data); return data.layout.pages.flatMap((page) => page.elements.map((element) => {
      const { id, fill, ...rest } = element; return rest;
    })); };
    for (const [id] of M.templateOptions) {
      const data = M.clone(source); M.useTemplate(data.layout, id);
      data.layout.decoration = { background_gradient: true, background_color2: '#123456',
        background_direction: '135deg', background_pct: 37, image_gradient: true, image_color2: '#abcdef',
        image_direction: 'to right', image_pct: 63 };
      const before = M.effectiveColors(data.layout), loaded = JSON.stringify(data);
      M.paletteState(data.layout); M.familyOf(id); D.controls(data.layout);
      const unchanged = loaded === JSON.stringify(data);
      M.useStyle(data.layout, 'modern-magazine');
      report.legacy.push({ id, unchanged, equal: JSON.stringify(before) === JSON.stringify(M.effectiveColors(data.layout)) });
    }
    M.useTemplate(source.layout, 'modern-magazine');
    M.applyTemplate(source);
    const base = geometry(source), marker = source.layout.marker_palette;
    for (const palette of M.palettes) {
      const data = M.clone(source); await D.applyPalette(data.layout, palette.id); M.applyTemplate(data);
      const rendered = await M.render(data, 0, .3);
      report.palettes.push({ id: palette.id, same: JSON.stringify(base) === JSON.stringify(geometry(data)),
        marker: marker === data.layout.marker_palette, pixel: rendered.canvas.toDataURL() });
    }
    M.applyTemplate(source);
    const before = source.layout.pages[0].elements.find((el) => el.type === 'image').h;
    M.useStyle(source.layout, 'modern-mag-xl');
    M.applyTemplate(source);
    report.xl = source.layout.pages[0].elements.find((el) => el.type === 'image').h > before;
    const saved = JSON.stringify(source.layout);
    M.setTargetStyle(source.layout, 'card', (style) => M.assignColors(style, M.paletteColors(M.palettes[2])));
    const { target_styles, ...rest } = source.layout;
    report.independent = JSON.stringify(rest) === saved && !target_styles.single && !target_styles.scale;
    report.palettes = report.palettes.map(({ pixel, ...entry }) => ({ ...entry, pixel }));
    return report;
  });
  expect(result.legacy).toHaveLength(17);
  expect(result.legacy.every((entry) => entry.unchanged && entry.equal)).toBe(true);
  expect(result.palettes.every((entry) => entry.same && entry.marker)).toBe(true);
  expect(new Set(result.palettes.map((entry) => entry.pixel)).size).toBe(8);
  expect(result.xl).toBe(true); expect(result.independent).toBe(true);
});

test('TC-F61-04: every additional CMS colour role changes genuine poster and flyer pixels', { tag: '@ohne-layout' }, async ({ page }) => {
  await offlineCms(page);
  const result = await page.evaluate(async () => {
    const R = window.WochenangeboteRenderer;
    const item = { key: 'apfelsaft', produkt: 'Regionaler Apfelsaft', details: 'Naturtrüb aus Streuobst',
      preis: 2.49, statt_preis: 2.99, image: '' };
    const action = { von: '2026-11-16', bis: '2026-11-25', items: [item] };
    const report = [];
    for (const kind of ['plakat','flyer']) {
      const base = structuredClone(R.CFG_DEFAULTS);
      base.plakatTemplate = base.flyerTemplate = 'modern-magazine';
      base.plakat_showTexture = base.flyer_showTexture = false;
      const renderer = R.create({ cfgGet: () => base, flyerArtOverrideGet: () => ({}), plakatArtOverrideGet: () => ({}) });
      async function render(config) {
        const canvas = kind === 'flyer' ? await renderer.generateEinzelflyer(item, action, config, { scale: .4 })
          : await new Promise((resolve) => renderer.drawAngebotPlakat(action, [item], [null], resolve, config, { scale: .4, returnCanvas: true }));
        const bytes = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).join(',');
        return { digest, geometry: JSON.stringify(canvas._elMeta), w: canvas.width, h: canvas.height };
      }
      const original = await render(base);
      for (const key of ['headerBg','headerAccent','dateColor','dividerColor','priceBarBg','priceBarBorder',
        'stattColor','footerColor','vorratColor','priceTextColor','detailsTextColor']) {
        const config = structuredClone(base);
        config.tplColors = { [kind + ':modern-magazine']: { [key]: '#ff00ff' } };
        const changed = await render(config);
        report.push({ kind, key, pixels: changed.digest !== original.digest,
          geometry: changed.geometry === original.geometry && changed.w === original.w && changed.h === original.h });
      }
    }
    return report;
  });
  expect(result.filter((entry) => !entry.pixels || !entry.geometry)).toEqual([]);
});

test('TC-F60/61/63: six real designers, compact families, palette confirmation and persistent undo roundtrip', async ({ page }) => {
  const state = await offlineCms(page);
  let root = await area(page, 'cfg-plakat', 'sec-plakat', '#cfg-sec-plakat');
  await expect(root.locator('.an-family')).toHaveCount(6);
  await root.locator('.an-family:has([value=magazine])').click();
  await root.locator('[data-style=variant]').selectOption('xl');
  await expect(root.locator('#cfg-plakatTemplate')).toHaveValue('modern-mag-xl');
  await tool(root, 'Farben', 1);
  const color = root.locator('#cfg-tpl-plakat-titleColor'), before = await color.inputValue();
  await color.fill('#123456'); await color.dispatchEvent('input');
  await root.locator('[data-offer-palette=teal]').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Eigene Farben ersetzen');
  await dialog.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect(color).toHaveValue('#123456');
  await root.locator('[data-offer-palette=teal]').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Palette anwenden', exact: true }).click();
  await expect(color).toHaveValue('#155e75');
  await expect(root.locator('#cfg-plakatTemplate')).toHaveValue('modern-mag-xl');
  await root.locator('[data-design-history=undo]').click();
  await expect(color).toHaveValue('#123456');
  await root.locator('[data-design-history=redo]').click();
  await expect(color).toHaveValue('#155e75');
  await root.locator('[data-action=savePlakatCfg]').click();
  expect(state.writes.some((entry) => entry.name === 'design_config')).toBe(true);
  await page.screenshot({ path: test.info().outputPath('palette.png') });
  for (const [top, sub, selector, count] of [
    ['cfg-plakat', 'sec-flyer', '#cfg-sec-flyer', 6],
    ['cfg-plakat', 'sec-drinks', '#an-design-root', 10],
    ['cfg-wp', 'wp-sec-home', '#wp-sec-home', 7],
    ['cfg-wp', 'wp-sec-flyer', '#wp-sec-flyer', 7],
    ['cfg-hpang', '', '#cms-cfg-hpang', 0],
  ]) {
    root = await area(page, top, sub, selector);
    await expect(root.locator('.an-designer-tool-select')).toHaveCount(1);
    expect(await root.locator('input[id],select[id],input[data-style],select[data-style]').count()).toBeGreaterThan(5);
    if (count === 7) await expect(root.locator('.an-week-styles .cms-wp-preview')).toHaveCount(7);
    else if (count) await expect(root.locator('.an-family')).toHaveCount(count);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    if (count && count !== 7) {
      expect(await root.locator('.an-family svg').first().evaluate((node) => node.getBoundingClientRect().width)).toBeLessThanOrEqual(40);
    }
    if (test.info().project.name === 'tablet-hoch') await expect(root.locator('.an-designer-workspace')).not.toHaveClass(/an-split-mobile/);
    await page.screenshot({ path: test.info().outputPath((sub || 'homepage') + '.png') });
  }
  await page.reload();
  root = await area(page, 'cfg-plakat', 'sec-plakat', '#cfg-sec-plakat');
  await expect(root.locator('#cfg-plakatTemplate')).toHaveValue('modern-mag-xl');
  await expect(root.locator('#cfg-tpl-plakat-titleColor')).toHaveValue('#155e75');
  expect(before).not.toBe('#123456');
  expect(state.errors).toEqual([]);
});

test('TC-F61-03/04: weekly Web/print palettes keep gradients, black, controls and separate history', async ({ page }) => {
  const state = await offlineCms(page);
  let root = await area(page, 'cfg-wp', 'wp-sec-home', '#wp-sec-home');
  await tool(root, 'Farben', 1);
  const from = root.locator('#hcfg-wpTpl-home-wpHeaderFrom');
  await from.fill('#000000'); await from.dispatchEvent('input');
  await root.locator('#hcfg-wpTpl-home-wpHeaderTo').fill('#123456');
  await root.locator('#hcfg-wpTpl-home-wpHeaderDir').selectOption('to right');
  await tool(root, 'Stil', 0);
  await root.locator('#hcfg-wpHomeTemplate').selectOption('tafel');
  await expect(from).toHaveValue('#000000');
  await expect(root.locator('#hcfg-wpTpl-home-wpHeaderTo')).toHaveValue('#123456');
  await expect(root.locator('#hcfg-wpTpl-home-wpHeaderDir')).toHaveValue('to right');
  root = await area(page, 'cfg-wp', 'wp-sec-flyer', '#wp-sec-flyer');
  const printBefore = await root.locator('#hcfg-wpTpl-flyer-wpHeaderFrom').inputValue();
  await tool(root, 'Farben', 1);
  await root.locator('[data-offer-palette=purple]').click();
  if (await page.getByRole('dialog').isVisible()) await page.getByRole('dialog').getByRole('button', { name: 'Palette anwenden' }).click();
  await expect(root.locator('#hcfg-wpTpl-flyer-wpHeaderFrom')).toHaveValue('#ede9fe');
  await root.locator('[data-design-history=undo]').click();
  await expect(root.locator('#hcfg-wpTpl-flyer-wpHeaderFrom')).toHaveValue(printBefore);
  await root.locator('[data-design-history=redo]').click();
  await expect(root.locator('#hcfg-wpTpl-flyer-wpHeaderFrom')).toHaveValue('#ede9fe');
  await root.locator('[data-action=saveHPCfg]').click();
  expect(state.writes.some((entry) => entry.name === 'hp_design_config')).toBe(true);
  await page.reload();
  root = await area(page, 'cfg-wp', 'wp-sec-home', '#wp-sec-home');
  await expect(root.locator('#hcfg-wpHomeTemplate')).toHaveValue('tafel');
  await expect(root.locator('#hcfg-wpTpl-home-wpHeaderFrom')).toHaveValue('#000000');
  await expect(root.locator('#hcfg-wpTpl-home-wpHeaderTo')).toHaveValue('#123456');
  await expect(root.locator('#hcfg-wpTpl-home-wpHeaderDir')).toHaveValue('to right');
  root = await area(page, 'cfg-wp', 'wp-sec-flyer', '#wp-sec-flyer');
  await expect(root.locator('#hcfg-wpTpl-flyer-wpHeaderFrom')).toHaveValue('#ede9fe');
  expect(state.errors).toEqual([]);
});
