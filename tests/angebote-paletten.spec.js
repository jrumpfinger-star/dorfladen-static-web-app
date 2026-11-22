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
async function offlineCms(page, visualContent = false) {
  const photo = visualContent ? 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, '..', 'static-site', 'images', 'sortiment', 'orangen.jpg')).toString('base64') : '';
  const dishes = ['Kartoffelrösti mit Kräuterquark', 'Linseneintopf mit Gemüse', 'Ofengemüse mit Feta', 'Spinatknödel mit Parmesan', 'Fischfilet mit Kartoffelgratin'];
  const state = { design: defaults(), config: {}, writes: [], errors: [], imageReads: 0, weekReads: 0 };
  page.on('pageerror', (error) => state.errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:'))
      state.errors.push(message.location().url + ': ' + message.text());
  });
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
    if (url.pathname === '/api/angebote-flyer') return json({ success: true, actions: [], homepage: {} });
    if (request.method() !== 'GET' && url.pathname !== '/api/werbebilder') throw new Error('Unexpected mocked write: ' + url.pathname);
    if (visualContent && url.pathname === '/api/werbebilder') {
      state.imageReads++;
      return json([{ dl_artikelnummer: 'palette-orangen', dl_werbebildid: 'palette-photo', dl_bild_base64: photo }]);
    }
    if (visualContent && url.pathname === '/api/wochenplan') {
      state.weekReads++;
      return json({ success: true, data: dishes.map((dish, index) => ({ dl_wochenplanid: 'palette-day-' + index,
        dl_wochentag: 101000 + index, dl_gericht: dish, dl_preis: 7.5 + index / 2, dl_status: 101001 })) });
    }
    if (url.pathname === '/api/preisliste') return json({ groups: {} });
    if (url.pathname === '/api/angebote') return json({ success: true, data: [{ dl_angeboteid: 'palette',
      dl_aktion_id: 'palette', dl_produkt: 'Regionaler Apfelsaft', dl_preis: 2.49, dl_statt_preis: 2.99,
      dl_gueltig_von: '2026-11-16', dl_gueltig_bis: '2026-11-25',
      ...(visualContent ? { dl_produkt: 'Saftorangen · 1-kg-Netz', dl_artikelnummer: 'palette-orangen',
        image_key: 'palette-orangen', bild_data: photo, action_kind: 'drinks' } : {}) }] });
    return json({ success: true, data: [], actions: [] });
  });
  await page.goto(BASE + '/cms.html?tab=cfg&flyer=drinks');
  await page.evaluate(() => sessionStorage.setItem('cms_auth_ok', JSON.parse(document.getElementById('cms-pw-hash').textContent)));
  await page.reload();
  if (state.errors.length) throw new Error('CMS page errors: ' + state.errors.join(' | '));
  await expect(page.locator('#an-design-root [data-style=family]')).toHaveCount(10);
  if (visualContent) {
    await expect(page.locator('#an-design-root [data-design-products]')).toContainText('mit Produktbildern');
    await page.evaluate(() => window.cmsWeekJump(0));
    await expect(page.locator('#cms-wp-grid')).toContainText(dishes[0]);
    await expect.poll(() => state.weekReads).toBeGreaterThan(0);
  }
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

test('TC-F66-01: actual price-tag selects expose their full text and fit computed inner height', async ({ page }) => {
  await offlineCms(page);
  const root = page.locator('#an-design-root');
  await tool(root, 'Werkzeuge', 5);
  await root.locator('[data-object-properties=price]').click();
  const controls = [
    ['select[data-style=price_shape]', 'explosion', 'Zacken'],
    ['select[data-style=old_price_strike]', 'single', 'Einfach durchgestrichen'],
    ['select[data-style=price_preset]', 'price-image', 'Rot/Gelb'],
  ];
  const measured = [];
  async function measureSelect(dialog, selector, value, expectedText) {
    const select = dialog.locator(selector);
    await expect(select).toHaveCount(1);
    await select.selectOption(value);
    const metrics = await select.evaluate((element) => {
      const style = getComputedStyle(element), rect = element.getBoundingClientRect();
      const px = (value) => parseFloat(value) || 0;
      const innerHeight = element.clientHeight - px(style.paddingTop) - px(style.paddingBottom);
      const textContext = document.createElement('canvas').getContext('2d');
      textContext.font = style.font;
      const textMetrics = textContext.measureText(element.selectedOptions[0].textContent);
      return { height: rect.height, clientHeight: element.clientHeight, innerHeight,
        lineHeight: px(style.lineHeight), paddingTop: px(style.paddingTop), paddingBottom: px(style.paddingBottom),
        borderTop: px(style.borderTopWidth), borderBottom: px(style.borderBottomWidth),
        fontHeight: (textMetrics.fontBoundingBoxAscent || textMetrics.actualBoundingBoxAscent)
          + (textMetrics.fontBoundingBoxDescent || textMetrics.actualBoundingBoxDescent),
        appearance: style.appearance, webkitAppearance: style.webkitAppearance,
        targetHeight: matchMedia('(pointer:coarse),(max-width:559px)').matches ? 44 : 32,
        selectedText: element.selectedOptions[0].textContent };
    });
    expect(metrics.height, selector + ' has a visible native select').toBeGreaterThan(0);
    expect(metrics.lineHeight, selector + ' line-height fits its inner box').toBeLessThanOrEqual(metrics.innerHeight);
    expect(metrics.fontHeight, selector + ' glyphs fit the actual content box').toBeLessThanOrEqual(metrics.innerHeight);
    expect(metrics.height, selector + ' preserves its mouse/touch target').toBeGreaterThanOrEqual(metrics.targetHeight);
    expect(['auto', 'menulist']).toContain(metrics.appearance);
    expect(['menulist', 'auto']).toContain(metrics.webkitAppearance);
    expect(metrics.selectedText).toBe(expectedText);
    measured.push({ selector, metrics });
  }
  const priceDialog = root.locator('.an-object-dialog[data-object-group=price]');
  await expect(priceDialog).toBeVisible();
  for (const [selector, value, expectedText] of controls) await measureSelect(priceDialog, selector, value, expectedText);
  await priceDialog.locator('button[type=submit]').click();
  await root.locator('[data-object-properties=text]').click();
  const textDialog = root.locator('.an-object-dialog[data-object-group=text]');
  await expect(textDialog).toBeVisible();
  await measureSelect(textDialog, 'select[data-style=old_price_font]', 'Arial', 'Arial');
  await page.screenshot({ path: test.info().outputPath('f66-select-text.png') });
  expect(measured).toHaveLength(4);
});

test('TC-F65-03: saved area standard is confirmed, isolated, undoable, and draft-only', async ({ page }) => {
  const state = await offlineCms(page);
  const standard = await page.evaluate(() => structuredClone(window.WochenangeboteRenderer.CFG_DEFAULTS));
  standard.plakat_nameSize = 27;
  standard.flyer_nameSize = 69;
  standard.imgRotation = 33;
  state.config.design_config = standard;
  const root = await area(page, 'cfg-plakat', 'sec-plakat', '#cfg-sec-plakat');
  const size = root.locator('#cfg-plakat-nameSize');
  const flyerSize = page.locator('#cfg-flyer-nameSize');
  const sharedRotation = page.locator('#cfg-imgRotation');
  const originalFlyerSize = await flyerSize.inputValue();
  const originalRotation = await sharedRotation.inputValue();
  await size.evaluate((element) => {
    element.focus();
    element.value = '31';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(root.locator('[data-design-history=undo]')).toBeEnabled();
  await root.locator('[data-design-load-standard]').click();
  await expect(page.locator('.cms-confirm-overlay')).toBeVisible();
  await page.locator('.cms-confirm-btn-cancel').click();
  await expect(size).toHaveValue('31');
  await root.locator('[data-design-load-standard]').click();
  await page.locator('.cms-confirm-btn-ok').click();
  await expect(size).toHaveValue('27');
  await expect(flyerSize).toHaveValue(originalFlyerSize);
  await expect(sharedRotation).toHaveValue(originalRotation);
  await root.locator('[data-design-history=undo]').click();
  await expect(size).toHaveValue('31');
  expect(state.writes).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('TC-F65-03: CMS provenance snapshots track effective target config and overrides without cross-target changes', { tag: '@ohne-layout' }, async ({ page }) => {
  const state = await offlineCms(page);
  state.config.design_config = { plakatTemplate:'classic-red', flyerTemplate:'modern-magazine',
    design_provenance:{ schema:1, targets:{
      plakat:{ name:'Markt historisch', snapshot:{ template:'classic-red', fields:{}, colors:{} } },
      flyer:{ name:'Waage historisch', snapshot:{ template:'modern-magazine', fields:{}, colors:{} } }
    } } };
  const result = await page.evaluate(async () => {
    const M=window.AngeboteModel, data=M.blank('weekly'), item=M.item();
    item.name='Saft'; item.price_cents=249; data.items.push(item);
    await M.adoptWeekly(data);
    const inherited=['sheet','card','single'].map((target) => M.designProvenanceState(data.layout,target));
    const initial=JSON.stringify(data.layout);
    M.designSnapshot(data.layout,'card');
    const immutable=initial===JSON.stringify(data.layout);
    M.cmsFor(data,'card',true).config.plakat_nameColor='#123456';
    const ownChanged=M.designProvenanceState(data.layout,'card').changed;
    const sheetUnchanged=!M.designProvenanceState(data.layout,'sheet').changed;
    M.setDesignProvenance(data.layout,'card','Kachel');
    M.cmsFor(data,'card').config.flyer_nameColor='#abcdef';
    const foreignUnchanged=!M.designProvenanceState(data.layout,'card').changed;
    M.cmsFor(data,'card').plakat_article_overrides.saft={nameScale:123};
    const overrideChanged=M.designProvenanceState(data.layout,'card').changed;
    M.setDesignProvenance(data.layout,'card','Kachel');
    const standard=M.clone(data.layout);
    M.cmsFor(data,'card').config.plakat_nameColor='#ffffff';
    M.inheritTargetStyle(data.layout,'card',standard);
    const adoptedUnchanged=!M.designProvenanceState(data.layout,'card').changed;
    const otherBefore=JSON.stringify(data.layout.design_provenance.targets.card);
    M.setDesignProvenance(data.layout,'sheet','Sammelflyer');
    const otherPreserved=otherBefore===JSON.stringify(data.layout.design_provenance.targets.card);
    return { inherited, immutable, ownChanged, sheetUnchanged, foreignUnchanged, overrideChanged, adoptedUnchanged, otherPreserved,
      savedName:M.savedCmsProvenance({design_provenance:{schema:1,targets:{plakat:{name:'Historisch',snapshot:{}}}}},'plakat').name };
  });
  expect(result.inherited.map((entry) => entry.name)).toEqual(['Markt historisch','Markt historisch','Waage historisch']);
  expect(result.inherited.every((entry) => entry.known && !entry.changed)).toBe(true);
  for (const key of ['immutable','ownChanged','sheetUnchanged','foreignUnchanged','overrideChanged','adoptedUnchanged','otherPreserved'])
    expect(result[key],key).toBe(true);
  expect(result.savedName).toBe('Historisch');
  expect(state.writes).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('TC-F66-03: color, range, and number input previews immediately and remains undoable without change or blur', async ({ page }) => {
  const state = await offlineCms(page);
  const root = page.locator('#an-design-root');
  async function sendInput(selector, value) {
    await tool(root, 'Werkzeuge', 5);
    await root.locator('[data-object-properties=price]').click();
    const dialog = root.locator('.an-object-dialog[data-object-group=price]');
    const control = dialog.locator(selector);
    const before = await control.inputValue();
    const count = await root.locator('[data-style]').count();
    await control.evaluate((element, next) => {
      element.focus();
      element.value = next;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }, String(value));
    expect(await page.evaluate(() => document.activeElement.dataset.style)).toBe(selector.match(/data-style=["']?([^"'\]]+)/)[1]);
    expect(await root.locator('[data-style]').count()).toBe(count);
    await expect(control).toHaveValue(String(value));
    await dialog.locator('button[type=submit]').click();
    await expect(root.locator('[data-design-history=undo]')).toBeEnabled();
    await root.locator('[data-design-history=undo]').click();
    await expect(root.locator(selector)).toHaveValue(before);
  }
  await sendInput('[data-style=color]', '#123456');
  await sendInput('[data-style="decoration.price_scale"]', '125');

  const global = await area(page, 'cfg-plakat', 'sec-plakat', '#cfg-sec-plakat');
  await tool(global, 'Werkzeuge', 5);
  await global.locator('[data-object-properties=text]').click();
  const globalDialog = global.locator('.an-object-dialog[data-object-group=text]');
  const number = global.locator('#cfg-plakat-nameSize');
  await expect(number).toBeVisible();
  const numberBefore = await number.inputValue();
  const originalCount = await global.locator('#cfg-plakat-nameSize').count();
  await number.evaluate((element) => {
    element.focus();
    element.value = '22';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(await page.evaluate(() => document.activeElement.id)).toBe('cfg-plakat-nameSize');
  expect(await global.locator('#cfg-plakat-nameSize').count()).toBe(originalCount);
  await expect(number).toHaveValue('22');
  await globalDialog.locator('button[type=submit]').click();
  await expect(global.locator('[data-design-history=undo]')).toBeEnabled();
  await global.locator('[data-design-history=undo]').click();
  await expect(global.locator('#cfg-plakat-nameSize')).toHaveValue(numberBefore);
  expect(state.errors).toEqual([]);
});

test('TC-F66-05: responsive designer footer stays compact, readable, and touch-safe', async ({ page }) => {
  const state = await offlineCms(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + '/angebote.html?bestand=1');
  const root = page.locator('#an-root');
  await expect(root.getByRole('button', { name: '+ Getränkeaktion anlegen', exact: true })).toBeVisible();
  await root.getByRole('button', { name: '+ Getränkeaktion anlegen', exact: true }).click();
  await expect(root).toHaveClass(/an-task-editor/);
  await root.locator('#an-title').evaluate((element) => {
    element.focus();
    element.value += ' Live';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const footer = root.locator('.an-action-footer');
  const status = footer.locator('#an-state');
  await expect(status).not.toBeEmpty();

  async function measure(width) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => footer.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(0);
    return footer.evaluate((element) => {
      const box = (node) => {
        const rect = node.getBoundingClientRect();
        return { left:rect.left, right:rect.right, top:rect.top, bottom:rect.bottom, width:rect.width, height:rect.height };
      };
      const children = Array.from(element.children).filter((node) => {
        const style = getComputedStyle(node), rect = node.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      }).map((node) => ({ node, box:box(node), name:node.className || node.dataset.action || node.tagName }));
      const buttons = Array.from(element.querySelectorAll('button')).filter((button) => {
        const style = getComputedStyle(button), rect = button.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      }).map((button) => ({ name:button.getAttribute('aria-label') || button.textContent.trim(), ...box(button) }));
      const sorted = children.map((child) => child.box).sort((a,b) => a.top-b.top);
      let rows=0,rowBottom=-Infinity;
      for (const child of sorted) {
        if (child.top >= rowBottom) rows++;
        rowBottom=Math.max(rowBottom,child.bottom);
      }
      const overlaps = [];
      for (let i=0;i<buttons.length;i++) for (const other of buttons.slice(i+1)) {
        if (buttons[i].left < other.right && buttons[i].right > other.left
            && buttons[i].top < other.bottom && buttons[i].bottom > other.top)
          overlaps.push(buttons[i].name + '/' + other.name);
      }
      const coarse = matchMedia('(pointer:coarse),(max-width:559px)').matches;
      const stateNode = element.querySelector('#an-state'), stateBox = stateNode.getBoundingClientRect();
      const toolColumn = element.closest('.an-task-tools').getBoundingClientRect();
      const containerStyle=getComputedStyle(element.closest('.an-task-tools'));
      return { rows, width:element.getBoundingClientRect().width, toolWidth:toolColumn.width,
        flexWrap:getComputedStyle(element).flexWrap, containerType:containerStyle.containerType, containerName:containerStyle.containerName,
        statusWidth:stateBox.width, statusTop:Math.round(stateBox.top), statusHeight:stateBox.height,
        statusFullRow:stateBox.width >= element.getBoundingClientRect().width * .9,
        statusRowAlone:children.filter((child) => child.box.top < stateBox.bottom && child.box.bottom > stateBox.top)
          .every((child) => child.node === stateNode),
        overlaps, minimum:coarse?44:32, buttons };
    });
  }
  const wide = await measure(1440);
  expect(wide.toolWidth).toBeGreaterThanOrEqual(500);
  expect(wide.rows, JSON.stringify(wide)).toBeLessThanOrEqual(1);
  expect(wide.overlaps).toEqual([]);
  const narrow = await measure(390);
  expect(narrow.toolWidth).toBeLessThan(500);
  expect(narrow.rows).toBeLessThanOrEqual(2);
  expect(narrow.statusFullRow).toBe(true);
  expect(narrow.statusRowAlone).toBe(true);
  expect(narrow.overlaps).toEqual([]);
  if (narrow.minimum === 44) for (const button of narrow.buttons) {
    expect(button.height, button.name).toBeGreaterThanOrEqual(44);
    expect(button.width, button.name).toBeGreaterThanOrEqual(44);
  }
  expect(state.writes).toEqual([]);
  expect(state.errors).toEqual([]);
});

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
    const R = window.WochenangeboteRenderer, D = window.AngeboteDesign;
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
        D.applyCmsPaletteValues(config, kind, { [key]: '#ff00ff' });
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
  await tool(root, 'Stil', 0);
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
  await tool(root, 'Stil', 0);
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

test('TC-F60/61: CMS action adapter shares genuine families, palette roles and immutable reads', { tag: '@ohne-layout' }, async ({ page }) => {
  await offlineCms(page);
  const result = await page.evaluate(() => {
    const M = window.AngeboteModel, D = window.AngeboteDesign, R = window.WochenangeboteRenderer;
    const cfg = M.clone(R.CFG_DEFAULTS), layout = { cms: { config: cfg } }, before = JSON.stringify(layout);
    const host = document.createElement('div'); host.innerHTML = D.controls(layout);
    const sections = Array.from(host.querySelectorAll('[data-cms-section]')).map((section) => ({
      families: section.querySelectorAll('[data-cms-family]').length,
      palettes: section.querySelectorAll('[data-cms-palette]').length,
      legacy: section.querySelector('[data-cms-config$=Template]').closest('[hidden]') !== null,
      options: section.querySelector('[data-cms-config$=Template]').options.length,
    }));
    const unchanged = before === JSON.stringify(layout);
    cfg.plakat_tagShape = 'price-image';
    const values = D.cmsPaletteValues(M.palettes[2].colors, cfg, 'plakat');
    cfg.tplColors = { 'plakat:classic-red': { bgColor_grad: true, bgColor_dir: '135deg', bgColor_pct: 37 },
      'flyer:classic-red': { headerBg: '#123456' } };
    const sourceEntry = cfg.tplColors['plakat:classic-red'];
    const untouched = structuredClone(cfg);
    D.applyCmsPaletteValues(cfg, 'plakat', { ...values, density: 4, priceTextColor: '#123456' });
    const colourKeys = new Set(['tplColors','plakat_decoBgColor','plakat_decoTitleColor','plakat_decoFooterColor','plakat_nameColor','plakat_vorratColor']);
    const sameOtherFields = Object.keys(untouched).every((key) => colourKeys.has(key) || JSON.stringify(cfg[key]) === JSON.stringify(untouched[key]));
    return { sections, unchanged,
      values, own: D.cmsPaletteState({ ...cfg, plakat_nameColor: '#123456' }, 'plakat').custom,
      sameOtherFields, gradient: cfg.tplColors['plakat:classic-red'].bgColor_dir,
      other: JSON.stringify(cfg.tplColors['flyer:classic-red']) === JSON.stringify(untouched.tplColors['flyer:classic-red']),
      price: cfg.plakat_priceImageColor === untouched.plakat_priceImageColor,
      sourceEntry: Object.keys(sourceEntry).length, geometryInjected: Object.hasOwn(cfg, 'density') };
  });
  expect(result.sections).toEqual(Array(2).fill({ families: 6, palettes: 8, legacy: true, options: 9 }));
  expect(result.values).toMatchObject({ headerBg: '#cffafe', titleColor: '#155e75', dateColor: '#38635c', detailsTextColor: '#38635c' });
  for (const key of ['priceBarBg','priceBarBorder','priceTextColor','stattColor']) expect(result.values).not.toHaveProperty(key);
  expect(result.unchanged).toBe(true);
  expect(result.own).toBe(true);
  expect(result.sameOtherFields && result.other && result.price).toBe(true);
  expect(result.gradient).toBe('135deg');
  expect(result.sourceEntry).toBe(3);
  expect(result.geometryInjected).toBe(false);
});

test('TC-F13-05/F60: inactive family enlargement preserves genuine global and free designer drafts', async ({ page }) => {
  const state = await offlineCms(page);
  await page.evaluate(() => {
    window.__f13OriginalToBlob = HTMLCanvasElement.prototype.toBlob;
    // Reproduce Chromium deferring idle PNG encoding indefinitely.
    HTMLCanvasElement.prototype.toBlob = function () {};
  });
  for (const [sub, selector] of [['sec-plakat','#cfg-sec-plakat'], ['sec-flyer','#cfg-sec-flyer']]) {
    const root = await area(page, 'cfg-plakat', sub, selector);
    const template = root.locator('select[id$=Template]'), before = await template.inputValue();
    await expect(root.locator('.an-family-option>.an-family-zoom')).toHaveCount(6);
    await root.getByRole('button', { name: 'Magazin vergrößern', exact: true }).click();
    await expect(page.locator('#cms-share-img')).toBeVisible();
    await expect(page.locator('#cms-share-img')).toHaveJSProperty('complete', true);
    await page.locator('#cms-modal-wrap button[data-action=closeModal]').last().click();
    await expect(template).toHaveValue(before);
    await expect(root.locator('[data-design-history=undo]')).toBeDisabled();
  }
  await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = window.__f13OriginalToBlob; delete window.__f13OriginalToBlob; });
  const root = await area(page, 'cfg-plakat', 'sec-drinks', '#an-design-root');
  await expect(root.locator('.an-family-option>.an-family-zoom')).toHaveCount(10);
  const before = await root.locator('[data-style=family]:checked').inputValue();
  await root.getByRole('button', { name: 'Minimal vergrößern', exact: true }).click();
  await expect(page.locator('dialog.an-viewer canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Schließen', exact: true }).click();
  await expect(root.locator('[data-style=family]:checked')).toHaveValue(before);
  await expect(root.locator('[data-design-history=undo]')).toBeDisabled();
  expect(state.writes).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('TC-F61-03: unchanged legacy CMS designs do not acquire optional colour overrides', { tag: '@ohne-layout' }, async ({ page }) => {
  const state = await offlineCms(page);
  const original = await page.evaluate(() => structuredClone(window.WochenangeboteRenderer.CFG_DEFAULTS));
  const templates = await page.evaluate(() => window.AngeboteModel.cmsTemplateOptions.map(([id]) => id));
  for (const id of templates) {
    state.config.design_config = { ...structuredClone(original), plakatTemplate: id, flyerTemplate: id };
    const writes = state.writes.length;
    await page.reload();
    const root = await area(page, 'cfg-plakat', 'sec-plakat', '#cfg-sec-plakat');
    expect(state.writes).toHaveLength(writes);
    await root.locator('[data-action=savePlakatCfg]').click();
    await expect.poll(() => state.writes.length).toBe(writes + 1);
    const saved = state.config.design_config;
    for (const kind of ['plakat','flyer']) {
      expect(saved[kind + 'Template']).toBe(id);
      for (const role of ['headerBg','headerAccent','dateColor','dividerColor','priceBarBg','priceBarBorder',
        'stattColor','footerColor','vorratColor','priceTextColor','detailsTextColor'])
        expect(saved.tplColors[kind + ':' + id], kind + '/' + id + '/' + role).not.toHaveProperty(role);
    }
  }
  expect(state.errors).toEqual([]);
});

test('TC-F13/V08/V24: initial photo-backed flyer and narrow preview toolbar need no field changes', { tag: '@ohne-layout' }, async ({ page }) => {
  for (const [view, width, height] of [['mobile', 375, 667], ['landscape', 686, 432]]) {
    await page.setViewportSize({ width, height });
    const state = await offlineCms(page, true);
    for (const [sub, selector, target] of [
      ['sec-plakat', '#cfg-sec-plakat', 'plakat'], ['sec-flyer', '#cfg-sec-flyer', 'flyer'],
    ]) {
      const root = await area(page, 'cfg-plakat', sub, selector);
      await expect(root.locator('#cfg-live-preview-' + target + ' canvas').first()).toBeVisible();
      await page.screenshot({ path: test.info().outputPath(`V08-${view}-${target}.png`) });
    }
    const homepage = await area(page, 'cfg-hpang', '', '#cms-cfg-hpang');
    await expect(homepage.locator('.an-hp-card')).toHaveCount(1);
    const problems = await homepage.locator('.an-zoombar').evaluate((toolbar) => {
      const controls = Array.from(toolbar.children).map((node) => ({ box:node.getBoundingClientRect(), text:node.textContent }));
      const failures = [];
      for (let i = 0; i < controls.length; i++) {
        const a = controls[i];
        for (const b of controls.slice(i + 1)) {
          if (a.box.left < b.box.right && a.box.right > b.box.left && a.box.top < b.box.bottom && a.box.bottom > b.box.top) failures.push(a.text + '/' + b.text);
        }
      }
      return failures;
    });
    expect(problems, view + ': zoom controls must not overlap').toEqual([]);
    await page.screenshot({ path: test.info().outputPath(`V08-${view}-homepage.png`) });
    expect(state.writes).toEqual([]);
    expect(state.errors).toEqual([]);
  }
});

test('TC-F60: family names and icons select separately from their enlargement hit targets', async ({ page }) => {
  const state = await offlineCms(page), hits = [];
  for (const kind of ['plakat', 'flyer']) {
    const root = await area(page, 'cfg-plakat', 'sec-' + kind, '#cfg-sec-' + kind);
    const name = root.getByText('Magazin', { exact:true });
    const hit = await name.evaluate((name) => {
      const box = name.getBoundingClientRect(), card = name.closest('.an-family-option');
      const target = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      const zoom = card.querySelector('.an-family-zoom').getBoundingClientRect(), icon = card.querySelector('.an-family>span>svg').getBoundingClientRect();
      return { dpr:devicePixelRatio, card:card.getBoundingClientRect().width, label:name.closest('label').getBoundingClientRect().width,
        name:box.width, nameTop:box.top, zoomBottom:zoom.bottom, iconRight:icon.right, zoomLeft:zoom.left,
        minimum:matchMedia('(pointer:coarse),(max-width:599px)').matches ? 44 : 32,
        zoomAtName:!!target.closest('.an-family-zoom'), actualTarget:target.outerHTML.slice(0,200) };
    });
    hits.push({ kind,...hit });
    expect(hit.zoomAtName, JSON.stringify(hit)).toBe(false);
    expect(hit.nameTop).toBeGreaterThanOrEqual(hit.zoomBottom);
    expect(hit.iconRight).toBeLessThanOrEqual(hit.zoomLeft);
    await name.click();
    await expect(root.locator('[data-style=family][value=magazine]')).toBeChecked();
    await expect(page.locator('#cms-share-img')).toHaveCount(0);
    await root.locator('.an-family:has([data-style=family][value=minimal])>span>svg').click();
    await expect(root.locator('[data-style=family][value=minimal]')).toBeChecked();
    const before = await root.locator('select[id$=Template]').inputValue();
    const zoom = root.getByRole('button', { name:'Magazin vergrößern', exact:true });
    const box = await zoom.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(hit.minimum - .01);
    await zoom.click();
    await expect(page.locator('#cms-share-img')).toBeVisible();
    await page.locator('#cms-modal-wrap button[data-action=closeModal]').last().click();
    await expect(root.locator('select[id$=Template]')).toHaveValue(before);
    await page.screenshot({ path:test.info().outputPath(`familien-${kind}-hit.png`) });
  }
  const file = test.info().outputPath('familien-hitbereiche.json');
  fs.writeFileSync(file, JSON.stringify(hits, null, 2));
  await test.info().attach('familien-hitbereiche', { path:file, contentType:'application/json' });
  expect(state.writes).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('TC-F44: phone preview handles compensate cumulative scaling without shrinking their hit areas', { tag: '@ohne-layout' }, async ({ page }) => {
  await page.setViewportSize({ width:375, height:667 });
  const state = await offlineCms(page, true), measurements = [];
  for (const kind of ['plakat', 'flyer']) {
    const root = await area(page, 'cfg-plakat', 'sec-' + kind, '#cfg-sec-' + kind);
    await tool(root, 'Werkzeuge', 5);
    await root.locator('[data-preview-element]').selectOption('img');
    const canvas = root.locator('.an-designer-preview canvas:visible');
    const before = await canvas.evaluate((node) => node._elMeta.find((entry) => entry.ovKey === 'img').w);
    await root.locator('[data-preview-transform=larger]').click();
    await expect.poll(() => canvas.evaluate((node) => node._elMeta.find((entry) => entry.ovKey === 'img').w)).toBeGreaterThan(before);
    await root.locator('[data-preview-transform=right]').click();
    const measurement = await root.locator('.an-rotate-handle:visible').evaluate((handle) => {
      const style = getComputedStyle(handle), transforms = [];
      let scale = 1;
      for (let node = handle.parentElement; node; node = node.parentElement) {
        const transform = getComputedStyle(node).transform;
        if (transform !== 'none') {
          const matrix = new DOMMatrixReadOnly(transform), value = Math.hypot(matrix.a, matrix.b);
          transforms.push({ element:node.className, transform, scale:value }); scale *= value;
        }
      }
      return { kind:handle.closest('[data-designer]').dataset.designer, finePointer:matchMedia('(pointer:fine)').matches,
        hit:style.getPropertyValue('--an-handle-hit'), compensation:style.getPropertyValue('--an-handle-scale'),
        cssWidth:parseFloat(style.width), screenWidth:handle.getBoundingClientRect().width, cumulativeScale:scale, transforms };
    });
    measurements.push(measurement);
    expect(measurement.screenWidth, JSON.stringify(measurement)).toBeGreaterThanOrEqual(43.99);
    expect(measurement.cssWidth * measurement.cumulativeScale).toBeCloseTo(measurement.screenWidth, 2);
  }
  const file = test.info().outputPath('TC-F44-griffskalierung.json');
  fs.writeFileSync(file, JSON.stringify(measurements, null, 2));
  await test.info().attach('TC-F44-griffskalierung', { path:file, contentType:'application/json' });
  expect(state.writes).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('TC-F61/V24: original weekly Web and print render independently', { tag: '@ohne-layout' }, async ({ page }) => {
  const state = await offlineCms(page, true);
  async function image(selector) {
    const img = page.locator(selector + ' img');
    await expect(img).toBeVisible();
    await expect.poll(() => img.evaluate((node) => node.complete && node.naturalWidth > 200)).toBe(true);
    const result = await img.evaluate(async (node) => ({ src:node.src, width:node.naturalWidth, height:node.naturalHeight,
      bytes:Array.from(new Uint8Array(await (await fetch(node.src)).arrayBuffer())) }));
    return { ...result, hash:crypto.createHash('sha256').update(Buffer.from(result.bytes)).digest('hex') };
  }
  await area(page, 'cfg-wp', 'wp-sec-home', '#wp-sec-home');
  const web = await image('#wp-home-live-preview');
  const printRoot = await area(page, 'cfg-wp', 'wp-sec-flyer', '#wp-sec-flyer');
  const print = await image('#wp-flyer-live-preview');
  await expect(page.locator('#hcfg-wpHomeTemplate')).toHaveValue('classic-red');
  await expect(printRoot.locator('#hcfg-wpFlyerTemplate')).toHaveValue('classic-red');
  expect(print.hash, 'original identical defaults intentionally produce identical pixels').toBe(web.hash);
  await printRoot.locator('#hcfg-wpFlyerTemplate').selectOption('zeitung');
  await expect(page.locator('#wp-flyer-live-preview img')).not.toHaveAttribute('src', print.src);
  const newspaper = await image('#wp-flyer-live-preview');
  expect(newspaper.height, 'print must use its selected original newspaper layout').not.toBe(web.height);
  expect(newspaper.hash).not.toBe(web.hash);
  fs.writeFileSync(test.info().outputPath('wochenplan-druck-zeitung.png'), Buffer.from(newspaper.bytes));
  await page.screenshot({ path:test.info().outputPath('wochenplan-druck-designer.png') });
  await area(page, 'cfg-wp', 'wp-sec-home', '#wp-sec-home');
  await expect(page.locator('#hcfg-wpHomeTemplate')).toHaveValue('classic-red');
  const webAgain = await image('#wp-home-live-preview');
  expect(webAgain.hash, 'moving the shared viewport must retain the independent Web renderer result').toBe(web.hash);
  fs.writeFileSync(test.info().outputPath('wochenplan-web-klassisch.png'), Buffer.from(webAgain.bytes));
  expect(state.writes).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('TC-F60/63: visual reference matrix of all six global designers at six screen sizes', { tag: '@ohne-layout' }, async ({ browser }) => {
  test.setTimeout(240000);
  const issues = [];
  for (const [name, width, height, touch] of [
    ['desktop',1280,800,false], ['mobile',375,667,false], ['ipad-mini',768,1024,false],
    ['tablet-hoch',686,1095,true], ['small',320,568,true], ['landscape',686,432,true],
  ].filter(([name]) => !process.env.PALETTE_SCREEN || name === process.env.PALETTE_SCREEN)) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch, serviceWorkers: 'block' });
    const state = await offlineCms(page, true);
    for (const [top, sub, selector, slug] of [
      ['cfg-plakat','sec-plakat','#cfg-sec-plakat','plakat'],
      ['cfg-plakat','sec-flyer','#cfg-sec-flyer','flyer'],
      ['cfg-plakat','sec-drinks','#an-design-root','drinks'],
      ['cfg-wp','wp-sec-home','#wp-sec-home','wochenplan-web'],
      ['cfg-wp','wp-sec-flyer','#wp-sec-flyer','wochenplan-druck'],
      ['cfg-hpang','','#cms-cfg-hpang','homepage'],
    ]) {
      const root = await area(page, top, sub, selector);
      if (slug.startsWith('wochenplan-')) {
        const preview = page.locator(slug === 'wochenplan-web' ? '#wp-home-live-preview img' : '#wp-flyer-live-preview img');
        await expect(preview).toBeVisible();
        await expect.poll(() => preview.evaluate((image) => image.complete && image.naturalWidth > 200)).toBe(true);
      }
      const select = root.locator('.an-designer-tool-select');
      const count = await select.locator('option').count();
      for (let index = 0; index < count; index++) {
        await tool(root, await select.locator('option').nth(index).textContent(), index);
        await root.locator('.an-designer-body').evaluate((node) => { node.scrollTop = 0; });
        const problems = await root.locator('.an-designer-settings').evaluate((settings) => {
          const result = [], box = settings.getBoundingClientRect(), body = settings.querySelector('.an-designer-body');
          if (body.scrollWidth > body.clientWidth + 2) {
            const edge = body.getBoundingClientRect().left + body.clientWidth;
            result.push('horizontal settings overflow (' + body.scrollWidth + '/' + body.clientWidth + '): ' + Array.from(body.querySelectorAll('*')).filter((node) =>
              node.checkVisibility() && node.getBoundingClientRect().width && (node.getBoundingClientRect().right > edge + 1 || node.scrollWidth > node.clientWidth + 2)
            ).slice(0, 7).map((node) => node.id || node.className || node.tagName).join(', '));
          }
          for (const control of settings.querySelectorAll('input,select,button')) {
            const rect = control.getBoundingClientRect();
            if (!rect.width || !rect.height || !control.checkVisibility() || control.type === 'radio' || control.closest('[popover]')) continue;
            if (rect.left < box.left - 2 || rect.right > box.right + 2) result.push('clipped: ' + (control.id || control.getAttribute('aria-label') || control.textContent.trim()));
          }
          const save = settings.querySelector('.an-designer-save').getBoundingClientRect();
          if (save.top < 0 || save.bottom > innerHeight + 1) result.push('save outside viewport');
          if (body.clientHeight < 60) result.push('settings body shorter than 60px: ' + body.clientHeight);
          if (document.documentElement.scrollWidth > innerWidth + 1) result.push('page overflow');
          for (const svg of settings.querySelectorAll('.an-family svg')) {
            if (svg.getBoundingClientRect().width > 40) result.push('oversized family icon');
          }
          return result;
        });
        issues.push(...problems.map((problem) => `${name}/${slug}/${index}: ${problem}`));
        await page.screenshot({ path: test.info().outputPath(`${name}-${slug}-${index}.png`) });
      }
      if (slug === 'homepage') await expect(root.locator('#hpang-preview .an-hp-card')).toHaveCount(1);
    }
    expect(state.writes, name + ': opening and switching must not persist anything').toEqual([]);
    expect(state.imageReads, name + ': product photographs came from the offline image API').toBeGreaterThan(0);
    expect(state.errors, name).toEqual([]);
    await page.close();
  }
  expect(issues).toEqual([]);
});

test('TC-F60/63: compact reference controls, readable colour labels and price-dialog transactions', async ({ page }) => {
  test.setTimeout(120000);
  const state = await offlineCms(page);
  const prompts = [];
  page.on('dialog', async (dialog) => { prompts.push(dialog.type()); await dialog.dismiss(); });
  const areas = [
    ['cfg-plakat','sec-plakat','#cfg-sec-plakat','plakat'],
    ['cfg-plakat','sec-flyer','#cfg-sec-flyer','flyer'],
    ['cfg-plakat','sec-drinks','#an-design-root','drinks'],
    ['cfg-wp','wp-sec-home','#wp-sec-home','web'],
    ['cfg-wp','wp-sec-flyer','#wp-sec-flyer','druck'],
    ['cfg-hpang','','#cms-cfg-hpang','homepage'],
  ];
  for (const [top, sub, selector, slug] of areas) {
    const root = await area(page, top, sub, selector);
    const metrics = await root.evaluate((root) => {
      const settings = root.querySelector('.an-designer-settings'), tabs = settings.querySelector('.an-designer-tabs');
      const palette = settings.querySelector('.an-palette-grid'), save = settings.querySelector('.an-designer-save>.an-primary,.an-designer-save>[data-action=savePlakatCfg],.an-designer-save>[data-action=saveHPCfg],.an-designer-save>[data-action=hpangSave]');
      const rect = save.getBoundingClientRect(), footer = save.parentElement.getBoundingClientRect();
      const tabRects = [...tabs.children].map((node) => node.getBoundingClientRect());
      const motif = root.querySelector('.an-split-picture').getBoundingClientRect();
      return {
        tabs: tabs.checkVisibility(), columns: new Set(tabRects.map((rect) => rect.left)).size,
        rows: new Set(tabRects.map((rect) => rect.top)).size,
        wide: settings.clientWidth > 375 && innerHeight > 560,
        palette: palette && getComputedStyle(palette).gridTemplateColumns.split(' ').length,
        saveCompact: rect.width < footer.width * .65 && Math.abs(footer.right - rect.right) < 14,
        mobile: innerWidth < 600, motif: motif.height >= 110 && motif.bottom <= innerHeight,
      };
    });
    if (metrics.wide) expect([metrics.tabs,metrics.columns,metrics.rows], slug).toEqual([true,3,2]);
    if (metrics.palette) expect(metrics.palette, slug).toBe(2);
    expect(metrics.saveCompact, slug).toBe(true);
    if (metrics.mobile) expect(metrics.motif, slug).toBe(true);
    await tool(root, 'Farben', slug === 'homepage' ? 0 : 1);
    const badLabels = await root.locator('.an-cfield').evaluateAll((fields) => fields.filter((field) => {
      if (!field.checkVisibility()) return false;
      const label = field.querySelector('.an-cfield-lab'), rect = label?.getBoundingClientRect();
      return !rect || rect.width < 35 || rect.height > 55 || field.querySelectorAll('.an-color-hex').length !== 1;
    }).map((field) => field.textContent.trim()));
    expect(badLabels, slug).toEqual([]);
    if (['plakat','flyer','drinks'].includes(slug)) {
      await expect(root.locator('.an-background-group')).toHaveCount(2);
      await tool(root, 'Weitere Gestaltung', 3);
      await root.getByRole('button', { name: 'Preisschild bearbeiten', exact: true }).click();
      const dialog = root.locator('.an-object-dialog');
      await expect(dialog).toBeVisible();
      const colors = dialog.locator('input[type=color]');
      expect(await colors.count(), slug).toBeGreaterThan(2);
      const duplicates = await colors.evaluateAll((inputs) => inputs.map((input) =>
        input.closest('label').querySelectorAll('output').length));
      expect(duplicates.every((count) => count === 1), slug).toBe(true);
      const before = await colors.first().inputValue();
      await colors.first().fill('#123456'); await colors.first().dispatchEvent('input');
      await expect(dialog.locator('.an-object-color-value').first()).toHaveText('#123456');
      await page.screenshot({ path: test.info().outputPath(slug + '-preisschild.png') });
      await dialog.getByRole('button', { name: 'Abbrechen', exact: true }).click();
      await root.getByRole('button', { name: 'Preisschild bearbeiten', exact: true }).click();
      await expect(dialog.locator('input[type=color]').first()).toHaveValue(before);
      await dialog.getByRole('button', { name: 'Abbrechen', exact: true }).click();
      await tool(root, 'Feinabstimmung', 2);
      const select = root.locator('select[data-style=marker_type],select[id$=-savingsMarkerType]');
      const original = await select.inputValue();
      const picker = root.locator('.an-marker-picker:has([data-marker-choice=badge])');
      await picker.locator('[data-marker-choice=badge]').click();
      await expect(select).toHaveValue('badge');
      await root.locator('[data-design-history=undo]').click();
      await expect(select).toHaveValue(original);
    }
    if (slug !== 'homepage') {
      await tool(root, 'Eigene Vorlagen', 4);
      await expect(root.locator('.an-own-presets')).toBeVisible();
      expect(await root.locator('.an-own-presets').evaluate((node) => node.tagName)).toBe('SECTION');
      const name = root.locator('[data-global-preset-name]');
      if (await name.count()) {
        await name.fill('Referenz ' + slug);
        await root.locator('[data-action=cfgPresetSave],[data-action=wpPresetSave]').click();
        await expect(root.getByText('Referenz ' + slug, { exact: true })).toBeVisible();
        await expect(name).toHaveValue('');
      }
    }
    const workspace = root.locator('.an-designer-workspace');
    for (const mode of ['inputs','picture','split']) {
      await root.locator('[data-workspace-views]:visible').click();
      await root.locator('.an-workspace-choices select').selectOption(mode);
      await expect(workspace).toHaveAttribute('data-workspace-view', mode);
      if (mode !== 'picture') await expect(root.locator('.an-designer-settings')).toBeVisible();
      if (mode !== 'inputs') await expect(root.locator('.an-split-picture')).toBeVisible();
    }
    const offset = await root.locator('.an-split-picture').evaluate((preview) =>
      preview.querySelector('.an-designer-frame').getBoundingClientRect().top - preview.querySelector('.an-zoombar').getBoundingClientRect().bottom);
    expect(offset, slug + ': motif is top aligned').toBeGreaterThanOrEqual(0);
    expect(offset, slug + ': no blank region above motif').toBeLessThan(18);
  }
  if (page.viewportSize().width < 600) {
    await expect(page.locator('.an-design-header #cmsneu-menue-btn')).toBeVisible();
    await page.evaluate(() => {
      const item = [...document.querySelectorAll('.an-design-locations .an-loc-item')].find((item) => /gemeinsam|allgemein/i.test(item.textContent));
      item.click();
    });
    await expect(page.locator('.cmsneu-kopf #cmsneu-menue-btn')).toBeVisible();
  }
  expect(state.writes.filter((write) => !/_presets$/.test(write.name))).toEqual([]);
  expect(prompts).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('TC-F66-14: Schriftstaerke von Bezeichnung und Zusatztext ist getrennt einstellbar, wird gespeichert und veraendert das Bild', async ({ page }, testInfo) => {
  const state = await offlineCms(page);
  const root = await area(page, 'cfg-plakat', 'sec-plakat', '#cfg-sec-plakat');
  await tool(root, 'Feinabstimmung', 2);
  const name = root.locator('#cfg-plakat-nameWeight'), details = root.locator('#cfg-plakat-detailsWeight');
  await expect(name).toBeVisible(); await expect(details).toBeVisible();
  await expect(name).toHaveValue('900'); await expect(details).toHaveValue('600');
  const picture = () => page.evaluate(() => [...document.querySelectorAll('canvas')].map((canvas) => canvas.toDataURL().length).join(','));
  const before = await picture();
  await name.selectOption('400');
  await expect.poll(picture).not.toBe(before);
  const afterName = await picture();
  await details.selectOption('900');
  await expect.poll(picture).not.toBe(afterName);
  const rows = await root.locator('#cfg-plakat-nameFont, #cfg-plakat-nameSize, #cfg-plakat-nameWeight, #cfg-plakat-detailsWeight').evaluateAll((nodes) => nodes.map((node) => Math.round(node.getBoundingClientRect().left)));
  expect(new Set(rows).size, 'gleiche Spalte: ' + rows).toBe(1);
  await page.screenshot({ path: testInfo.outputPath('feinabstimmung-ausrichtung.png') });
  await root.locator('button:visible', { hasText: 'Als Standard speichern' }).click();
  await expect.poll(() => state.config.design_config?.plakat_nameWeight).toBe('400');
  expect(state.config.design_config.plakat_detailsWeight).toBe('900');
  expect(state.errors).toEqual([]);
});

test('TC-F66-13: Mit geladener Vorlage speichert Speichern nur die Vorlage; der Standard laesst sich getrennt setzen und laden', async ({ page }) => {
  const state = await offlineCms(page);
  const root = await area(page, 'cfg-plakat', 'sec-plakat', '#cfg-sec-plakat');
  await tool(root, 'Eigene Vorlagen', 4);
  await root.locator('[data-global-preset-name]').fill('Vorlage A');
  await root.locator('[data-action=cfgPresetSave]').click();
  await expect(root.getByText('Vorlage A', { exact: true })).toBeVisible();
  await expect(root.locator('.an-design-context [data-save-hint]')).toContainText('nur die Vorlage „Vorlage A“');
  await expect(root.locator('[data-design-save-standard]')).toBeVisible();
  await root.locator('[data-action=cfgPresetLoad]').first().click();
  await tool(root, 'Farben', 1);
  const color = root.locator('#cfg-plakat-decoBgColor');
  const original = await color.inputValue();
  await color.fill('#123456'); await color.dispatchEvent('input'); await color.dispatchEvent('change');
  await root.locator('button:visible', { hasText: /^Vorlage speichern$/ }).click();
  await expect.poll(() => state.config.design_presets?.plakat?.[0]?.data?.plakat_decoBgColor).toBe('#123456');
  expect(state.config.design_presets.plakat).toHaveLength(1);
  expect(state.config.design_config?.plakat_decoBgColor).not.toBe('#123456');
  await root.locator('[data-design-save-standard]').click();
  await expect.poll(() => state.config.design_config?.plakat_decoBgColor).toBe('#123456');
  await color.fill('#654321'); await color.dispatchEvent('input'); await color.dispatchEvent('change');
  const signature = () => page.evaluate(() => [...document.querySelectorAll('#cfg-sec-plakat canvas, #cms-cfg-plakat canvas')].map((canvas) => canvas.toDataURL().length).join(','));
  await expect.poll(signature).not.toBe('');
  await page.waitForTimeout(1200);
  const beforeLoad = await signature();
  await root.locator('[data-design-load-standard]').click();
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(color).toHaveValue('#123456');
  await expect.poll(signature, { message: 'Vorschau aktualisiert sich nach Standard laden' }).not.toBe(beforeLoad);
  await expect(root.locator('[data-design-save-standard]')).toBeHidden();
  await root.locator('button:visible', { hasText: 'Als Standard speichern' }).first().click();
  await tool(root, 'Eigene Vorlagen', 4);
  await root.locator('[data-global-preset-name]').fill('Vorlage A');
  await root.locator('[data-action=cfgPresetSave]').click();
  await page.getByRole('button', { name: 'Vorlage ersetzen', exact: true }).click();
  await expect.poll(() => state.config.design_presets.plakat.length).toBe(1);
  await expect(root.getByText('Vorlage A', { exact: true })).toHaveCount(1);
  expect(original).not.toBe('#123456');
  expect(state.errors).toEqual([]);
});

test('TC-F66-06: saved own templates survive a reload for Plakat and Wochenplan', async ({ page }) => {
  const state = await offlineCms(page);
  for (const [top, sub, selector, slug, key] of [
    ['cfg-plakat', 'sec-plakat', '#cfg-sec-plakat', 'plakat', 'design_presets'],
    ['cfg-wp', 'wp-sec-home', '#wp-sec-home', 'wp', 'wp_design_presets'],
  ]) {
    let root = await area(page, top, sub, selector);
    await tool(root, 'Eigene Vorlagen', 4);
    await root.locator('[data-global-preset-name]').fill('Dauerhaft <b>' + slug + '</b>');
    await root.locator('[data-action=cfgPresetSave],[data-action=wpPresetSave]').click();
    await expect(root.getByText('Dauerhaft <b>' + slug + '</b>', { exact: true })).toBeVisible();
    await expect.poll(() => state.config[key] && JSON.stringify(state.config[key])).toContain('Dauerhaft');
    await page.reload();
    root = await area(page, top, sub, selector);
    await tool(root, 'Eigene Vorlagen', 4);
    await expect(root.getByText('Dauerhaft <b>' + slug + '</b>', { exact: true })).toBeVisible();
    await expect(root.locator('.an-own-presets b')).toHaveCount(0);
  }
  expect(state.errors).toEqual([]);
});

test('GF102: every original global design field retains its data key and reachable owner', { tag: '@ohne-layout' }, async ({ page }) => {
  const state = await offlineCms(page), report = [];
  for (const [top, sub, selector, saveHandler, tests] of [
    ['cfg-plakat','sec-plakat','#cfg-sec-plakat','savePlakatCfg → design_config',['TC-F61-03','TC-F61-04','TC-F60/61/63']],
    ['cfg-plakat','sec-flyer','#cfg-sec-flyer','savePlakatCfg → design_config',['TC-F61-03','TC-F61-04','TC-F60/61/63']],
    ['cfg-plakat','sec-drinks','#an-design-root','data-design-save → PUT /api/angebote-verwaltung?view=design',['TC-F61-01/02/03','TC-F60/61/63']],
    ['cfg-wp','wp-sec-home','#wp-sec-home','saveHPCfg → hp_design_config',['TC-F61-03/04','TC-F60/63']],
    ['cfg-wp','wp-sec-flyer','#wp-sec-flyer','saveHPCfg → hp_design_config',['TC-F61-03/04','TC-F60/63']],
    ['cfg-hpang','','#cms-cfg-hpang','hpangSave → PUT /api/angebote-verwaltung?view=design',['TC-F60/61/63','TC-F60/63']],
  ]) {
    const root = await area(page, top, sub, selector);
    const inventory = await root.evaluate((root) => window.AngeboteDesign.fieldInventory(root));
    expect(inventory.before.length, selector).toBeGreaterThan(10);
    expect(inventory.missing, selector).toEqual([]);
    expect(inventory.after.filter((field) => !field.tab), selector + ': all fields have a tab owner').toEqual([]);
    report.push({ ...inventory, saveHandler, tests });
  }
  const filename = test.info().outputPath('GF102-feldinventur.json');
  fs.writeFileSync(filename, JSON.stringify(report, null, 2));
  await test.info().attach('GF102-feldinventur', { path: filename, contentType: 'application/json' });
  const redundant = await page.evaluate(() => {
    const M = window.AngeboteModel, root = document.createElement('div'), layout = M.blank('drinks').layout;
    M.useTemplate(layout, 'modern-mag-xl'); root.innerHTML = window.AngeboteDesign.controls(layout);
    return { extra:root.querySelectorAll('.an-family-enlarge').length, zooms:root.querySelectorAll('.an-family-zoom').length,
      xl:root.querySelector('.an-family-option:has([value=magazine]) .an-family-zoom').dataset.templateEnlarge };
  });
  expect(redundant).toEqual({ extra:0, zooms:10, xl:'modern-mag-xl' });
  expect(state.writes).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('TC-AEA-F2-02: Design-Bereich teilt Werkzeuge und Vorschau standardmaessig mit rund 40 % Vorschau', async ({ page }) => {
  await offlineCms(page);
  const root = await area(page, 'cfg-plakat', 'sec-plakat', '#cfg-sec-plakat');
  const workspace = root.locator('.an-designer-workspace');
  await expect(workspace).toHaveAttribute('data-workspace-view', 'split');
  const tools = await root.locator('.an-split-tools').boundingBox(), picture = await root.locator('.an-split-picture').boundingBox();
  const mobile = await workspace.evaluate((node) => node.classList.contains('an-split-mobile'));
  const share = mobile ? picture.height / (tools.height + picture.height) : picture.width / (tools.width + picture.width);
  expect(share).toBeGreaterThan(.36); expect(share).toBeLessThanOrEqual(mobile ? .401 : Math.max(.401, 262 / (tools.width + picture.width)));
});
