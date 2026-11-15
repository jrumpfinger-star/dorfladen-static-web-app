const { test, expect } = require('@playwright/test');
const crypto = require('crypto');

const BASE = process.env.TEST_URL || 'http://127.0.0.1:8817';
const NOW = '2026-11-18';
const PHOTO = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6hywAAAAASUVORK5CYII=', 'base64');
const copy = (value) => structuredClone(value);
const uid = () => crypto.randomBytes(16).toString('hex');
const hash = (value, n) => crypto.createHash('sha256').update(value).digest('hex').slice(0, n);
const ORIGINAL_TEMPLATES = [
  'classic-red', 'minimal-clean', 'dark-modern', 'organic-market', 'bold-poster',
  'modern-magazine', 'modern-mag-fresh', 'modern-mag-bold', 'modern-mag-xl',
];

function jpegSize(buf) {
  for (let i = 2; i < buf.length;) {
    if (buf[i] !== 255) { i++; continue; }
    const marker = buf[i + 1];
    if (marker >= 192 && marker <= 207 && ![196, 200, 204].includes(marker)) {
      return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error('Kein JPEG');
}

async function setup(page, options = {}) {
  const layout = { mode: 'template', template: 'land', density: 4, color: '#bb421e', background: '#fffdf6',
    font: 'Arial', title_color: '#234c38', text_color: '#24362d', card_background: '#ffffff',
    price_background: '#ffffff', price_shape: 'rect', name_size: 24, price_size: 58,
    details_size: 17, image_rotation: 0, image_scale: 100, pages: [] };
  const state = {
    config: { namespace: 'preview-test', scale_scope: hash('preview-test', 6), scale_enabled: !!options.send },
    catalog: [{ artikelnummer: 'ART2001', strichcode: '4001234567890', bezeichnung: 'Unser Testgetränk',
      menge: '20x0,50 l', vk: 14.99, angebot_statt: 14.99, uvp: null }],
    missingImageKeys: new Set(), failImageLookup: false,
    actions: new Map(), published: new Map(), images: new Map(), log: [], errors: [], failSave: false, failRead: false,
    design: { version: 0, weekly: copy(layout), drinks: copy(layout) }, scale: { dauer: [], vollbild: [] },
    bridge: { bekannt: true, online: false, ok: true, vor_s: 200, initialisiert: true, ist: [] },
  };
  if (options.loggedOut) state.loginReply = new Promise((resolve) => { state.finishLogin = resolve; });
  await page.clock.install({ time: new Date(NOW + 'T12:00:00Z') });
  await page.addInitScript((loggedOut) => {
    if (window !== window.top) return;
    if (!loggedOut) localStorage.setItem('cms_auth_token', 'test-auth');
    localStorage.setItem('dl_cookies', '1');
    window.print = () => { window.__printCalled = (window.__printCalled || 0) + 1; };
  }, !!options.loggedOut);
  page.on('pageerror', (error) => state.errors.push(error.message));
  await page.context().route('**/*', (route) => {
    if (new URL(route.request().url()).origin !== new URL(BASE).origin) return route.abort();
    return route.fallback();
  });
  await page.context().route('**/api/**', async (route) => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname, method = req.method();
    const entry = { path, method, params: Object.fromEntries(url.searchParams), token: req.headers()['x-cms-auth'] };
    state.log.push(entry);
    const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    const fail = (status, error) => json({ success: false, error }, status);
    if (path === '/api/cms-config') return json({ success: true, data: { feature_flags: { kiosk_getraenke: true, kiosk_werbebilder: true },
      design_config: { flyer_decoTitleColor: '#0066aa', flyer_decoBgColor: '#fff9ed', priceFontFlyer: 62 } } });
    if (path === '/api/cms-auth') {
      if (method === 'GET') return entry.token === 'test-auth'
        ? json({ authenticated: true }) : json({ authenticated: false }, 401);
      if (state.loginReply) await state.loginReply;
      if (req.postDataJSON().password !== 'test-cms-password') return fail(401, 'invalid password');
      return state.failLogin ? fail(503, 'Die CMS-Anmeldung ist gerade nicht erreichbar.') : json({ success: true, token: 'test-auth' });
    }
    if (path === '/api/angebote') return json({ success: true, data: [{
      dl_angeboteid: 'legacy-one', dl_produkt: 'Bisheriges Wochenangebot', dl_preis: 2.49, dl_statt_preis: 2.99,
      dl_aktion_id: 'legacy-action', dl_gueltig_von: '2026-11-15', dl_gueltig_bis: '2026-11-21',
    }] });
    if (path === '/api/preisliste') return json({ groups: { Getränke: state.catalog } });
    if (path === '/api/werbebilder' && method === 'POST') {
      entry.read_only_lookup = true;
      const { articles } = req.postDataJSON();
      entry.articles = articles;
      if (state.failImageLookup) return fail(503, 'Die Bildsuche ist gerade nicht erreichbar.');
      return json(articles.filter((a) => a.artikelnummer && !state.missingImageKeys.has(a.artikelnummer)).flatMap((article) => [{ dl_artikelnummer: article.artikelnummer, dl_bild_base64: '' }, { dl_artikelnummer: article.artikelnummer,
        dl_bild_base64: 'data:image/png;base64,' + PHOTO.toString('base64') }]));
    }
    if (path === '/api/getraenke-artikel') return fail(410, 'Der Bestellkatalog ist für Angebotsflyer nicht vorgesehen.');
    if (path === '/api/angebote-flyer') return state.failRead ? fail(503, 'Die Angebote sind gerade nicht erreichbar.')
      : json({ success: true, actions: [...state.published.values()].filter((a) => a.data.valid_from <= NOW && a.data.valid_to >= NOW) });
    if (path.startsWith('/api/angebote-bilder')) {
      if (method === 'POST') {
        expect(entry.token).toBe('test-auth');
        const id = uid(); state.images.set(id, req.postDataBuffer()); entry.image_id = id;
        return json({ success: true, image_id: id }, 201);
      }
      const id = path.split('/').pop();
      return state.images.has(id) ? route.fulfill({ contentType: 'image/png', body: state.images.get(id) }) : fail(404, 'Bild nicht verfügbar');
    }
    if (path.startsWith('/api/angebote-verwaltung')) {
      if (options.loggedOut && entry.token !== 'test-auth') return fail(401, 'Bitte zuerst anmelden.');
      expect(entry.token).toBe('test-auth');
      if (method === 'GET' && state.failRead) return fail(503, 'Die Angebote sind gerade nicht erreichbar.');
      if (url.searchParams.get('view') === 'design') {
        if (method === 'GET') return json({ success: true, design: state.design, config: state.config });
        const body = req.postDataJSON(); entry.body = body;
        if (body.version !== state.design.version) return fail(409, 'Die Designstandards wurden inzwischen geändert. Bitte neu laden.');
        state.design = { ...copy(body.data), version: body.version + 1 };
        return json({ success: true, design: state.design });
      }
      const id = path.split('/')[3], action = id && state.actions.get(id);
      if (method === 'GET') return json({ success: true, ...(id ? { action } : { actions: [...state.actions.values()] }), config: state.config });
      const body = req.postDataJSON(); entry.body = body;
      if (state.failSave) return fail(409, 'Das Angebot wurde inzwischen geändert. Bitte neu öffnen, bevor du es erneut speicherst.');
      let head;
      if (!id) {
        head = { id: uid(), draft: copy(body.data), version: 1, published_revision: null, published_summary: null };
      } else if (url.searchParams.get('action') === 'duplicate') {
        head = { id: uid(), draft: { ...copy(action.draft), title: action.draft.title + ' (Kopie)' },
          version: 1, published_revision: null, published_summary: null };
      } else {
        if (action.version !== body.version) return fail(409, 'Das Angebot wurde inzwischen geändert. Bitte neu öffnen.');
        head = copy(action); head.version++;
        if (url.searchParams.get('action') === 'publish') {
          head.published_revision = uid(); head.published_summary = copy(head.draft);
          state.published.set(id, { id, revision: head.published_revision, data: copy(head.draft) });
        } else head.draft = copy(body.data);
      }
      state.actions.set(head.id, copy(head));
      return json({ success: true, action: head, config: state.config });
    }
    if (path === '/api/waage-werbebilder') {
      const art = entry.params.art, name = entry.params.name;
      if (method === 'GET' && name) return route.fulfill({ contentType: 'image/png', body: PHOTO });
      if (method === 'GET') return json({ success: true, bilder: state.scale[art], bruecke: state.bridge });
      if (method === 'POST') {
        entry.dimensions = jpegSize(req.postDataBuffer());
        const etag = uid(); state.scale[art].push({ name, etag, status: 'wartet', groesse: req.postDataBuffer().length });
        return json({ success: true, name, etag });
      }
      if (method === 'DELETE') {
        state.scale[art] = state.scale[art].filter((b) => b.name !== name);
        return json({ success: true });
      }
    }
    return json({ success: true, data: [], value: [], groups: [], artikel: [], gruppen: [], bestellungen: [], kunden: [], tage: [] });
  });
  if (!options.loggedOut) {
    await page.goto(BASE + '/angebote.html');
    await expect(page.getByRole('button', { name: '+ Getränkeaktion anlegen' })).toBeVisible();
  }
  return state;
}

async function seed(page, state, { kind = 'drinks', count = 1, publish = false, title = 'Unsere Getränkeangebote' } = {}) {
  const data = await page.evaluate(({ kind, count, title }) => {
    const M = window.AngeboteModel, data = M.blank(kind);
    data.title = title; data.valid_from = '2026-11-16'; data.valid_to = '2026-11-25';
    for (let n = 0; n < count; n++) {
      const item = M.item();
      Object.assign(item, { name: n ? 'Weiteres Getränk ' + (n + 1) : 'Ein langer, gut lesbarer Getränkename aus unserer Region',
        article_number: 'KA40015-' + n, description: 'Regional genießen', units: 20, volume_ml: 500,
        packaging: 'Mehrweg', price_cents: 1249, old_price_cents: 1499, deposit_cents: 310 });
      data.items.push(item);
    }
    M.applyTemplate(data); return data;
  }, { kind, count, title });
  const head = { id: uid(), version: 1, draft: data, published_revision: publish ? uid() : null, published_summary: publish ? copy(data) : null };
  state.actions.set(head.id, head);
  if (publish) state.published.set(head.id, { id: head.id, revision: head.published_revision, data: copy(data) });
  return head;
}

async function editSeed(page, state, options) {
  const head = await seed(page, state, options);
  await page.reload();
  await page.locator('[data-open="' + head.id + '"]').click();
  await expect(page.locator('#an-save')).toBeEnabled();
  return head;
}

async function saveDraft(page) {
  await page.getByRole('button', { name: 'Entwurf speichern', exact: true }).click();
  await expect(page.locator('#an-root')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('#an-state')).toContainText('Entwurf gespeichert');
}

async function customerView(page) {
  await page.goto(BASE + '/index.html');
  const mobile = page.viewportSize().width <= 768;
  if (mobile) await page.locator('.mob-action[onclick*="offers"]').click();
  const grid = page.locator(mobile ? '#mob-ang-grid' : '#ang-grid');
  return { grid, shell: grid.locator('..') };
}

async function cms(page, tab = 'cfg&flyer=drinks') {
  await page.goto(BASE + '/cms.html?tab=' + tab);
  await page.evaluate(() => sessionStorage.setItem('cms_auth_ok', JSON.parse(document.getElementById('cms-pw-hash').textContent)));
  await page.reload();
}

async function noOverflow(page, selector = 'html') {
  const size = await page.locator(selector).evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
  expect(size.scroll).toBeLessThanOrEqual(size.client + 1);
}

test('Kundenangebote: filigrane Semibold-Schrift für Namen, Preise und Rabatt', async ({ page }) => {
  await setup(page);
  const { grid } = await customerView(page);
  const card = grid.locator('.an-legacy').first();
  await expect(card).toBeVisible();
  for (const selector of ['.ang-name', '.ang-tag-inner', '.ang-badge']) {
    await expect(card.locator(selector)).toHaveCSS('font-weight', '600');
  }
  await expect(card.locator('.ang-name')).toHaveCSS('font-family', /sans-serif/);
  const name = await card.locator('.ang-name').evaluate((el) => ({
    width: el.clientWidth, height: el.clientHeight, scrollWidth: el.scrollWidth, scrollHeight: el.scrollHeight,
  }));
  expect(name.scrollWidth).toBeLessThanOrEqual(name.width + 1);
  expect(name.scrollHeight).toBeLessThanOrEqual(name.height + 1);
  await noOverflow(page);
});

for (const failLogin of [false, true]) {
  test(`TC-F9-01/F4-01: erster CMS-Login ${failLogin ? 'meldet Serverfehler und erlaubt erneute Anmeldung' : 'wartet vor geschütztem Designabruf'}`, async ({ page }) => {
    const state = await setup(page, { loggedOut: true });
    state.failLogin = failLogin;
    const password = 'test-cms-password';
    try {
      await page.goto(BASE + '/cms.html?tab=cfg&flyer=drinks');
      await expect(page.locator('#cms-login-btn')).toBeEnabled();
      await page.locator('#cms-login-pw').fill(password);
      await page.locator('#cms-login-btn').click();
      const root = page.locator('#an-design-root');
      await expect(page.locator('#cms-login-status')).toContainText('CMS-Anmeldung wird abgeschlossen');
      await expect(page.locator('#cms-app')).toBeHidden();
      expect(state.log.filter((r) => r.path.startsWith('/api/angebote-verwaltung'))).toHaveLength(0);
      await expect(page.getByText('Admin-Anmeldung', { exact: true })).toHaveCount(0);
      state.finishLogin();
      if (failLogin) {
        await expect(page.locator('#cms-login-err')).toContainText('CMS-Anmeldung ist gerade nicht erreichbar');
        await expect(page.locator('#cms-login-btn')).toBeEnabled();
        await expect(page.getByText('Admin-Anmeldung', { exact: true })).toHaveCount(0);
        state.failLogin = false;
        await page.locator('#cms-login-pw').fill(password);
        await page.locator('#cms-login-btn').click();
      }
      await expect(root.getByRole('heading', { name: 'Getränkeflyer-Design' })).toBeVisible();
      expect(state.log.filter((r) => r.path === '/api/cms-auth' && r.method === 'POST')).toHaveLength(failLogin ? 2 : 1);
      await expect(page.locator('#cms-login-pw')).toHaveValue('');
      await expect(page.getByText('Admin-Anmeldung', { exact: true })).toHaveCount(0);
      expect(state.errors).toEqual([]);
    } finally { state.finishLogin(); }
  });
}

test('TC-F9-01: Serversitzung gilt ohne lokalen Merker auch nach Seitenwechsel', async ({ page }) => {
  const state = await setup(page);
  await page.goto(BASE + '/cms.html?tab=cfg&flyer=drinks');
  await expect(page.getByRole('heading', { name: 'Getränkeflyer-Design' })).toBeVisible();
  await expect(page.locator('#cms-login')).toBeHidden();
  await page.goto(BASE + '/angebote.html');
  await expect(page.getByRole('button', { name: '+ Getränkeaktion anlegen' })).toBeVisible();
  await page.goto(BASE + '/cms.html?tab=cfg&flyer=drinks');
  await expect(page.getByRole('heading', { name: 'Getränkeflyer-Design' })).toBeVisible();
  expect(state.log.filter((r) => r.path === '/api/cms-auth' && r.method === 'GET')).toHaveLength(2);
  expect(state.log.filter((r) => r.path === '/api/cms-auth' && r.method === 'POST')).toHaveLength(0);
  await expect(page.getByText('Admin-Anmeldung', { exact: true })).toHaveCount(0);
  expect(state.errors).toEqual([]);
});

test('TC-F9-01: lokaler Merker allein öffnet keine unvollständige CMS-Sitzung', async ({ page }) => {
  const state = await setup(page, { loggedOut: true });
  try {
    await cms(page);
    await expect(page.locator('#cms-login')).toBeVisible();
    await expect(page.locator('#cms-app')).toBeHidden();
    await expect(page.getByText('Admin-Anmeldung', { exact: true })).toHaveCount(0);
    expect(state.log.filter((r) => r.path.startsWith('/api/angebote-verwaltung'))).toHaveLength(0);
  } finally { state.finishLogin(); }
});

test('TC-F9-01: abgelehntes Token und falsches Passwort bleiben in derselben Anmeldung', async ({ page }) => {
  const state = await setup(page, { loggedOut: true });
  state.finishLogin();
  await page.addInitScript(() => localStorage.setItem('cms_auth_token', 'expired'));
  await page.goto(BASE + '/cms.html?tab=cfg&flyer=drinks');
  await expect(page.locator('#cms-login-btn')).toBeEnabled();
  await page.locator('#cms-login-pw').fill('wrong-password');
  await page.locator('#cms-login-btn').click();
  await expect(page.locator('#cms-login-err')).toContainText('Passwort stimmt nicht');
  await expect(page.getByText('Admin-Anmeldung', { exact: true })).toHaveCount(0);
  await expect(page.locator('#cms-app')).toBeHidden();
  expect(state.log.filter((r) => r.path.startsWith('/api/angebote-verwaltung'))).toHaveLength(0);
  await page.locator('#cms-login-pw').fill('test-cms-password');
  await page.locator('#cms-login-btn').click();
  await expect(page.getByRole('heading', { name: 'Getränkeflyer-Design' })).toBeVisible();
  expect(state.log.filter((r) => r.path === '/api/cms-auth' && r.method === 'GET')).toHaveLength(1);
  expect(state.log.filter((r) => r.path === '/api/cms-auth' && r.method === 'POST')).toHaveLength(2);
  expect(state.errors).toEqual([]);
});

test('TC-F13-02..03: alle Vorlagen rendern lesbar mit Original-Logo, beiden Arten und 4/6 Artikeln', async ({ page }) => {
  const state = await setup(page);
  const results = await page.evaluate(async () => {
    const M = window.AngeboteModel, results = [];
    const intersects = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > .5
      && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > .5;
    for (const [id] of M.templateOptions) for (const kind of ['weekly', 'drinks']) for (const density of [4, 6]) {
      const data = M.blank(kind);
      M.useTemplate(data.layout, id); data.layout.density = density;
      for (let n = 0; n <= density; n++) {
        const it = M.item();
        Object.assign(it, { name: 'Ein langer, gut lesbarer Getränkename aus unserer Region',
          description: 'Regional genießen', price_cents: 1249, old_price_cents: 1499,
          units: 20, volume_ml: 500, packaging: 'Mehrweg', deposit_cents: 310 });
        data.items.push(it);
      }
      M.applyTemplate(data); M.validate(data);
      const errors = [], layouts = [...data.layout.pages];
      for (let n = 0; n < data.layout.pages.length; n++) {
        errors.push(...(await M.render(data, n, .3)).errors);
        const logo = data.layout.pages[n].elements.filter((e) => e.type === 'logo');
        if (logo.length !== 1) errors.push('Logo fehlt auf Seite ' + n);
        else if (data.layout.pages[n].elements.some((e) => ['title', 'period', 'brand'].includes(e.type) && intersects(logo[0], e))) errors.push('Logo überlagert Kopf');
      }
      for (const target of ['card', 'single', 'scale']) {
        const layout = data.layout.targets[target][0];
        layouts.push(layout);
        const logos = layout.elements.filter((e) => e.type === 'logo').length;
        if (logos !== (target === 'card' ? 0 : 1)) errors.push('Falsche Logoanzahl: ' + target);
        errors.push(...(await M.renderTarget(data, target, data.items[0].id, .4)).errors);
      }
      for (const layout of layouts) {
        const fields = layout.elements.filter((e) => ['name', 'price', 'old_price', 'pack', 'deposit', 'base'].includes(e.type));
        for (let a = 0; a < fields.length; a++) for (let b = a + 1; b < fields.length; b++) {
          if (fields[a].item_id === fields[b].item_id && intersects(fields[a], fields[b])) errors.push(fields[a].type + '/' + fields[b].type + ' überlagert');
        }
      }
      results.push({ id, kind, density, pages: data.layout.pages.length, errors,
        background: data.layout.background,
        image: data.layout.pages[0].elements.find((e) => e.type === 'image') });
    }
    return results;
  });
  expect(results).toHaveLength(44);
  expect(results.filter((result) => result.errors.length)).toEqual([]);
  expect(results.every((result) => result.pages === 2)).toBe(true);
  const first = (id) => results.find((result) => result.id === id);
  expect(first('classic-red').background).toBe('#f4f1ea');
  expect(first('dark-modern').background).toBe('#0f172a');
  expect(first('modern-mag-fresh').background).toBe('#e8f6f8');
  expect(first('modern-magazine').image.w).toBeGreaterThan(first('classic-red').image.w);
  expect(first('modern-mag-xl').image.h).toBeGreaterThan(first('modern-magazine').image.h);
  const savings = await page.evaluate(() => [[139, 165], [1249, 1499], [0, 100], [100, 100], [200, 100], [9999, 10000], [100, null]]
    .map(([price_cents, old_price_cents]) => window.AngeboteModel.savings({ price_cents, old_price_cents })));
  expect(savings).toEqual([16, 17, null, null, null, null, null]);
  expect(state.errors).toEqual([]);
});

test('TC-F13-01/03..04: Logo bearbeiten und Vorlage nur auf das gewählte Ziel anwenden', async ({ page }) => {
  const state = await setup(page), head = await editSeed(page, state, { count: 2 });
  const original = copy(head.draft), logo = original.layout.pages[0].elements.find((e) => e.type === 'logo');
  await page.getByRole('button', { name: '2 · Frei gestalten' }).click();
  await page.locator('[data-layout-target=sheet]').click();
  await page.locator('#an-select-element').selectOption(logo.id);
  await page.locator('[data-element-prop=x]').fill('500');
  await page.locator('[data-element-prop=x]').dispatchEvent('change');
  await page.locator('[data-element-prop=rotation]').fill('5');
  await page.locator('[data-element-prop=rotation]').dispatchEvent('change');
  await saveDraft(page);
  await page.reload();
  await page.locator('[data-open="' + head.id + '"]').click();
  await page.getByRole('button', { name: '2 · Frei gestalten' }).click();
  await page.locator('[data-layout-target=sheet]').click();
  await page.locator('#an-select-element').selectOption(logo.id);
  await expect(page.locator('[data-element-prop=x]')).toHaveValue('500');
  await expect(page.locator('[data-element-prop=rotation]')).toHaveValue('5');
  const preserved = copy(state.actions.get(head.id).draft);
  await page.locator('[data-layout-target=card]').click();
  await page.locator('.an-template-picker > summary').click();
  await page.locator('input[data-style=template][value=modern-mag-fresh]').check();
  await page.locator('#an-template').click();
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await saveDraft(page);
  expect(state.actions.get(head.id).draft.layout.targets.card).toEqual(preserved.layout.targets.card);
  await page.locator('#an-template').click();
  await page.getByRole('button', { name: 'Vorlage anwenden', exact: true }).click();
  await saveDraft(page);
  const changed = state.actions.get(head.id).draft;
  expect(changed.layout.pages).toEqual(preserved.layout.pages);
  expect(changed.layout.targets.single).toEqual(preserved.layout.targets.single);
  expect(changed.layout.targets.scale).toEqual(preserved.layout.targets.scale);
  expect(changed.layout.targets.card[1]).toEqual(preserved.layout.targets.card[1]);
  expect(changed.layout.targets.card[0].background).toBe('#e8f6f8');
  expect(changed.layout.targets.card[0].elements.find((e) => e.type === 'image').w).toBe(372);
  const output = await page.evaluate(async (data) => {
    const M = window.AngeboteModel, pages = await M.preflight(data);
    const isolated = M.clone(data);
    isolated.layout.pages = [{ background: '#ffffff', elements: [M.el('logo', 100, 100, 200, 100)] }];
    const rendered = (await M.render(isolated, 0, 1)).canvas;
    const logo = await M.image('logo'), expected = document.createElement('canvas');
    expected.width = rendered.width; expected.height = rendered.height;
    const ctx = expected.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, expected.width, expected.height);
    const ratio = Math.min(200 / logo.width, 100 / logo.height);
    ctx.drawImage(logo, 100 + (200 - logo.width * ratio) / 2, 100 + (100 - logo.height * ratio) / 2, logo.width * ratio, logo.height * ratio);
    const actual = rendered.getContext('2d').getImageData(100, 100, 200, 100).data;
    const pixels = ctx.getImageData(100, 100, 200, 100).data;
    const scale = (await M.scaleImages(data, 'flyer', { w: 1600, h: 924 }))[0];
    return { logo: [logo.width, logo.height], pixels: {
      different: actual.reduce((count, value, i) => count + (value !== pixels[i] ? 1 : 0), 0),
      maxDifference: actual.reduce((max, value, i) => Math.max(max, Math.abs(value - pixels[i])), 0),
    },
      pages: pages.length, scale: scale.toDataURL('image/jpeg').slice(0, 23) };
  }, changed);
  expect(output.logo[0]).toBeGreaterThanOrEqual(1000);
  expect(output.logo[1]).toBeGreaterThanOrEqual(300);
  expect(output).toMatchObject({ pixels: { different: 0, maxDifference: 0 }, pages: 1, scale: 'data:image/jpeg;base64,' });
  await noOverflow(page);
  expect(state.errors).toEqual([]);
});

test('TC-F13-03: Logo-Ladefehler verhindert unvollständiges Rendern und ist wiederholbar', async ({ page }) => {
  const state = await setup(page);
  let blocked = true;
  await page.route('**/images/dorfladen-logo.png', (route) => blocked
    ? route.fulfill({ status: 503, body: '' }) : route.fallback());
  const failed = await page.evaluate(async () => {
    const M = window.AngeboteModel, data = M.blank('weekly'); M.applyTemplate(data);
    try { await M.render(data, 0, 1); return ''; }
    catch (error) { return error.userMessage; }
  });
  expect(failed).toContain('Dorfladen-Logo konnte nicht geladen');
  blocked = false;
  const recovered = await page.evaluate(async () => {
    const M = window.AngeboteModel, data = M.blank('weekly'); M.applyTemplate(data);
    const output = await M.render(data, 0, 1);
    return { errors: output.errors, png: output.canvas.toDataURL().slice(0, 22) };
  });
  expect(recovered).toEqual({ errors: [], png: 'data:image/png;base64,' });
  expect(state.errors).toEqual([]);
});

for (const cmsMode of [true, false]) {
  test(`TC-F13-05: große Vorlagenvorschau ohne Übernahme im ${cmsMode ? 'CMS' : 'Aktionseditor'}`, async ({ page }) => {
    const state = await setup(page), head = await seed(page, state, { count: 2 });
    if (cmsMode) await cms(page);
    else {
      await page.reload(); await page.locator('[data-open="' + head.id + '"]').click();
      await page.getByRole('button', { name: '2 · Frei gestalten' }).click();
    }
    const host = page.locator(cmsMode ? '#an-design-root' : '#an-step-design');
    await host.locator('.an-template-picker > summary').click();
    await expect(host.locator('[data-template-preview] canvas')).toHaveCount(11);
    const stored = copy(cmsMode ? state.design : state.actions.get(head.id));
    const writes = state.log.filter((r) => !['GET', 'HEAD', 'OPTIONS'].includes(r.method)).length;
    await host.locator('.an-choice-option').first().locator('.an-choice-body').dblclick();
    let dialog = page.getByRole('dialog', { name: 'Vorlagenvorschau · Landladen', exact: true });
    await expect(dialog.locator('canvas')).toHaveAttribute('width', '1588');
    await expect(dialog.locator('canvas')).toHaveAttribute('height', '2246');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    const enlarge = host.getByRole('button', { name: 'Klassisch vergrößern', exact: true });
    if (test.info().project.use.hasTouch) await enlarge.tap();
    else { await enlarge.focus(); await page.keyboard.press('Enter'); }
    dialog = page.getByRole('dialog', { name: 'Vorlagenvorschau · Klassisch', exact: true });
    await expect(dialog.locator('canvas')).toBeVisible();
    await dialog.getByRole('button', { name: '100 %', exact: true }).click();
    await expect(dialog.locator('output')).toHaveText('100 %');
    expect(await dialog.locator('canvas').evaluate((c) => c.getBoundingClientRect().width)).toBeCloseTo(794, 0);
    await dialog.getByRole('button', { name: 'Vorschau vergrößern', exact: true }).click();
    await expect(dialog.locator('output')).toHaveText('125 %');
    await dialog.getByRole('button', { name: 'Vorschau verkleinern', exact: true }).click();
    await expect(dialog.locator('output')).toHaveText('100 %');
    await dialog.getByRole('button', { name: 'Einpassen', exact: true }).click();
    const fits = await dialog.locator('.an-viewer-scroll').evaluate((s) => s.querySelector('.an-viewer-page').getBoundingClientRect().width <= s.clientWidth);
    expect(fits).toBe(true);
    await noOverflow(page);
    await page.screenshot({ path: test.info().outputPath('grosse-vorlagenvorschau.png') });
    await dialog.getByRole('button', { name: 'Schließen', exact: true }).click();
    await expect(dialog).toHaveCount(0); await expect(enlarge).toBeFocused();
    await expect(host.locator('input[data-style=template][value=land]')).toBeChecked();
    expect(cmsMode ? state.design : state.actions.get(head.id)).toEqual(stored);
    expect(state.log.filter((r) => !['GET', 'HEAD', 'OPTIONS'].includes(r.method)).length).toBe(writes);
    expect(state.errors).toEqual([]);
    await page.evaluate(() => {
      const model = window.AngeboteModel, render = model.render;
      model.render = async (...args) => {
        if (args[2] === 2) {
          model.render = render;
          throw model.problem('Die große Vorlagenvorschau konnte nicht geladen werden.');
        }
        return render(...args);
      };
    });
    await enlarge.click();
    const error = page.locator('dialog.an-dialog');
    await expect(error).toContainText('Die große Vorlagenvorschau konnte nicht geladen werden.');
    await expect(page.locator('dialog.an-viewer')).toHaveCount(0);
    await error.getByRole('button', { name: 'Schließen', exact: true }).click();
    await expect(enlarge).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.style.overflow)).not.toBe('hidden');
    await enlarge.click();
    await expect(page.locator('dialog.an-viewer canvas')).toBeVisible();
    await page.keyboard.press('Escape');
  });
}

for (const cmsMode of [true, false]) {
  test(`TC-F10-01..04: Layoutkacheln, Tastatur und Ausgabevorschauen im ${cmsMode ? 'CMS' : 'Aktionseditor'}`, async ({ page }) => {
    const state = await setup(page), head = await seed(page, state, { count: 7 });
    if (cmsMode) await cms(page);
    else {
      await page.reload();
      await page.locator('[data-open="' + head.id + '"]').click();
      expect(state.errors).toEqual([]);
      await expect(page.locator('dialog[open]')).toHaveCount(0);
      await page.getByRole('button', { name: '2 · Frei gestalten' }).click();
    }
    const host = page.locator(cmsMode ? '#an-design-root' : '#an-step-design');
    await expect(host.locator('.an-template-picker > summary')).toContainText('11 Designvorlagen');
    await host.locator('.an-template-picker > summary').click();
    await expect(host.locator('[data-template-preview] canvas')).toHaveCount(11);
    const sizes = await host.locator('[data-template-preview] canvas').evaluateAll((nodes) => nodes.map((c) => [c.width, c.height]));
    expect(sizes.every(([w, h]) => w > 100 && h > w)).toBe(true);
    await expect(host.locator('select[data-style=template],select[data-style=density]')).toHaveCount(0);
    for (const id of ORIGINAL_TEMPLATES) {
      await host.locator('input[data-style=template][value="' + id + '"]').check();
      await expect(host.locator('[data-template-label]')).not.toBeEmpty();
      const expected = await page.evaluate((id) => window.AngeboteModel.templateStyle(id).settings, id);
      await expect(host.getByLabel('Angebots-/Preisfarbe')).toHaveValue(expected.color);
      await expect(host.getByLabel('Flyer-Hintergrund', { exact: true })).toHaveValue(expected.background);
    }
    const classic = host.getByRole('radio', { name: /Klassisch/ });
    await classic.check();
    await expect(classic).toBeChecked();
    await classic.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(host.getByRole('radio', { name: /Landladen/ })).toBeChecked();
    await page.keyboard.press('ArrowRight');
    await expect(classic).toBeChecked();
    await host.getByRole('radio', { name: /6 · kompakt/ }).check();
    for (const group of await host.locator('.an-choice-group').all()) {
      await expect(group.locator('.an-choice-active:visible')).toHaveCount(1);
      const rect = await group.locator('.an-choice-body').first().boundingBox();
      expect(rect.height).toBeGreaterThanOrEqual(44);
    }
    await expect(host.getByLabel('Schrift', { exact: true })).toBeVisible();
    await expect(host.getByLabel('Angebots-/Preisfarbe')).toBeVisible();
    await host.getByLabel('Flyer-Hintergrund', { exact: true }).fill('#fff0df');
    await host.getByLabel('Flyer-Hintergrund', { exact: true }).dispatchEvent('change');
    await expect.poll(() => host.locator('[data-template-preview=classic] canvas').evaluate((canvas) =>
      Array.from(canvas.getContext('2d').getImageData(1, 1, 1, 1).data))).toEqual([255, 240, 223, 255]);
    await expect(host.locator('.an-fine')).not.toHaveAttribute('open');
    await host.getByText('Feinabstimmung · Größen und Drehung', { exact: true }).click();
    await expect(host.getByLabel('Produktbild · Drehung in Grad')).toBeVisible();
    const clippedLabels = await host.locator('.an-field > span').evaluateAll((labels) => labels.filter((label) => {
      const bounds = label.parentElement.getBoundingClientRect(), range = document.createRange();
      range.selectNodeContents(label);
      return [...range.getClientRects()].some((rect) => rect.width && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1));
    }).map((label) => label.textContent));
    expect(clippedLabels).toEqual([]);
    await host.getByText('Feinabstimmung · Größen und Drehung', { exact: true }).click();
    if (cmsMode) {
      await host.getByRole('button', { name: 'Designstandards speichern', exact: true }).click();
      await expect(host.locator('[data-design-status]')).toContainText('Designstandards gespeichert');
      expect(state.design.drinks).toMatchObject({ template: 'classic', density: 6 });
    } else {
      await saveDraft(page);
      expect(state.actions.get(head.id).draft.layout).toMatchObject({ template: 'classic', density: 6 });
    }
    const stored = copy(cmsMode ? state.design : state.actions.get(head.id));
    const attribute = cmsMode ? 'data-design-mode' : 'data-editor-mode';
    if (!cmsMode) await page.getByRole('button', { name: '3 · Ausgeben' }).click();
    for (const mode of ['cards', 'scale-large', 'scale-small', 'paper']) {
      const button = page.locator('[' + attribute + '="' + mode + '"]');
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      const preview = page.locator(cmsMode ? '[data-design-preview]' : mode === 'paper' ? '#an-stage' : '#an-other-preview');
      await expect(preview.locator(mode === 'cards' ? '.an-product' : 'canvas').first()).toBeVisible();
      if (mode === 'cards') {
        await expect.poll(() => preview.locator('canvas').first().evaluate((canvas) =>
          canvas.getContext('2d').getImageData(0, 0, 1, 1).data[3])).toBe(255);
      }
      if (!cmsMode) await expect(page.locator('#an-stage')).toBeVisible({ visible: mode === 'paper' });
      expect(cmsMode ? state.design : state.actions.get(head.id)).toEqual(stored);
    }
    if (!cmsMode) {
      await page.getByRole('button', { name: '2 · Frei gestalten' }).click();
    }
    await noOverflow(page, cmsMode ? '#an-design-root' : 'html');
    await page.screenshot({ path: test.info().outputPath('layout-auswahl.png'), fullPage: true });
    await host.locator('.an-choice-group').first().screenshot({ path: test.info().outputPath('stil-kacheln.png') });
    await page.reload();
    if (!cmsMode) {
      await page.locator('[data-open="' + head.id + '"]').click();
      await page.getByRole('button', { name: '2 · Frei gestalten' }).click();
    }
    await host.locator('.an-template-picker > summary').click();
    await expect(host.getByRole('radio', { name: /Klassisch/ })).toBeChecked();
    await expect(host.getByRole('radio', { name: /6 · kompakt/ })).toBeChecked();
    expect(state.errors).toEqual([]);
  });
}

test('TC-F1-01/F7-01..03/F9-01..03: echter CMS-Reiter, kopierte Standards und Kiosk-Einstieg', async ({ page }) => {
  const state = await setup(page);
  const head = await seed(page, state);
  const original = copy(head.draft);
  await cms(page);
  await expect(page.locator('#an-design-root').getByRole('heading', { name: 'Getränkeflyer-Design' })).toBeVisible();
  await expect(page.locator('#cfg-offer-legacy-save')).toBeHidden();
  await page.locator('#an-design-root [data-style=color]').fill('#0066aa');
  await page.locator('#an-design-root [data-style=color]').dispatchEvent('change');
  await page.getByRole('button', { name: 'Designstandards speichern', exact: true }).click();
  await expect(page.locator('[data-design-status]')).toContainText('Designstandards gespeichert');
  expect(state.actions.get(head.id).draft).toEqual(original);
  for (const mode of ['cards', 'scale-large', 'scale-small', 'paper']) {
    await page.locator('[data-design-mode="' + mode + '"]').click();
    await expect(page.locator(mode === 'cards' ? '[data-design-preview] .an-product' : '[data-design-preview] canvas')).toBeVisible();
  }
  await noOverflow(page, '#an-design-root');
  await page.screenshot({ path: test.info().outputPath('design-editor.png') });
  await page.locator('[data-id=sec-flyer]').click();
  await expect(page.locator('#cfg-sec-flyer')).toBeVisible();
  await expect(page.locator('#cfg-offer-legacy-save')).toBeVisible();
  await page.locator('[data-id=sec-plakat]').click();
  await expect(page.locator('#cfg-sec-plakat')).toBeVisible();
  await page.locator('[data-id=sec-shared]').click();
  await expect(page.locator('#cfg-sec-shared')).toBeVisible();
  await cms(page, 'ang');
  await page.getByRole('link', { name: 'Getränke & neue Angebote gestalten' }).click();
  await page.getByRole('button', { name: '+ Getränkeaktion anlegen' }).click();
  await saveDraft(page);
  expect([...state.actions.values()].at(-1).draft.layout.color).toBe('#0066aa');
  await page.goto(BASE + '/kiosk.html');
  await page.locator('.k-tab[data-tab=angebote]').click();
  await expect(page).toHaveURL(/angebote\.html/);
  expect(state.log.filter((r) => r.method !== 'GET' && r.path !== '/api/track' && !r.path.startsWith('/api/angebote-') && !r.read_only_lookup)).toEqual([]);
});

test('TC-F1-02..03/F2-01..03/F4-01: Artikelstamm, eigene Angebotspreise, Pfand und unvollständiger Entwurf', async ({ page }) => {
  const state = await setup(page);
  await page.getByRole('button', { name: '+ Getränkeaktion anlegen' }).click();
  await page.getByRole('button', { name: '+ Aus Artikelstamm wählen' }).click();
  await page.getByRole('button', { name: /Unser Testgetränk/ }).click();
  await page.getByRole('button', { name: /Auswahl übernehmen/ }).click();
  await expect(page.locator('#an-items')).toContainText('Unser Testgetränk');
  await saveDraft(page);
  const draft = [...state.actions.values()][0];
  expect(draft.draft.items[0].price_cents).toBeNull();
  expect(JSON.stringify(draft)).not.toContain('14.99');
  await page.getByRole('button', { name: '3 · Ausgeben' }).click();
  await page.locator('#an-publish').click();
  await expect(page.locator('dialog[open]')).toContainText('Angebotspreis');
  await page.locator('dialog[open]').getByRole('button', { name: 'Schließen', exact: true }).click();
  expect(state.published.size).toBe(0);
  await page.getByRole('button', { name: '1 · Artikel und Bilder' }).click();
  await page.locator('#an-items button[data-edit-item]').click();
  await page.locator('dialog[open]').getByLabel('Angebotspreis €', { exact: true }).fill('12.49');
  await page.locator('dialog[open] [data-item-field="packaging"]').selectOption('Mehrweg');
  await page.locator('dialog[open] [data-item-field="deposit_mode"]').selectOption('no');
  await expect(page.locator('dialog[open] [data-item-field="deposit_cents"]')).toHaveValue('0.00');
  await expect(page.locator('dialog[open] [data-item-field="deposit_cents"]')).toBeDisabled();
  await page.locator('dialog[open] [data-item-field="deposit_mode"]').selectOption('yes');
  await page.locator('dialog[open] [data-item-field="deposit_cents"]').fill('3.10');
  await page.locator('dialog[open] [data-item-field="deposit_cents"]').blur();
  await page.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(page.locator('[data-unit-price]')).toContainText('1,25 €/l');
  await page.locator('#an-items .an-item-menu summary').click();
  await page.locator('#an-items button[data-highlight]').click();
  await saveDraft(page);
  expect([...state.actions.values()][0].draft.items[0]).toMatchObject({ price_cents: 1249, deposit_cents: 310, highlight: true });
  expect([...state.actions.values()][0].draft.items[0].image_id).toMatch(/^[a-f0-9]{32}$/);
  expect(state.log.filter((r) => r.method !== 'GET' && !r.path.startsWith('/api/angebote-') && !r.read_only_lookup)).toEqual([]);
  expect(state.log.some((r) => r.path === '/api/getraenke-artikel')).toBe(false);
  await noOverflow(page);
  expect(state.errors).toEqual([]);
});

test('TC-F11: vier getrennte Ausgaben bearbeiten, speichern und als Kiosk-Kachel veröffentlichen', async ({ page }) => {
  const state = await setup(page), head = await editSeed(page, state);
  const itemId = head.draft.items[0].id;
  const cardName = head.draft.layout.targets.card[0].elements.find((element) => element.type === 'name');
  const singleName = head.draft.layout.targets.single[0].elements.find((element) => element.type === 'name');

  await page.getByRole('button', { name: '2 · Frei gestalten' }).click();
  for (const [target, width, height] of [['card', 630, 720], ['single', 1200, 1695], ['scale', 1200, 693], ['sheet', 1191, 1685]]) {
    await page.locator('[data-layout-target="' + target + '"]').click();
    await expect.poll(() => page.locator('#an-stage-canvas').evaluate((canvas) => [canvas.width, canvas.height]))
      .toEqual([width, height]);
  }
  await page.locator('[data-layout-target="card"]').click();
  await page.getByLabel('Gestaltungselement').selectOption(cardName.id);
  await page.getByLabel('Position X', { exact: true }).fill('130');
  await page.getByLabel('Position X', { exact: true }).blur();
  await saveDraft(page);
  const saved = state.actions.get(head.id).draft;
  expect(saved.layout.targets.card[0].elements.find((element) => element.id === cardName.id).x).toBe(130);
  expect(saved.layout.targets.single[0].elements.find((element) => element.id === singleName.id).x).toBe(330);
  expect(saved.layout.pages[0].elements.some((element) => element.type === 'name' && element.x === 130)).toBe(false);

  await page.getByRole('button', { name: '3 · Ausgeben' }).click();
  await page.locator('#an-print-single').click();
  await expect.poll(() => page.evaluate(() => window.__printCalled || 0)).toBe(1);
  const singlePrint = await page.locator('#an-print img').evaluate((image) => [image.naturalWidth, image.naturalHeight]);
  expect(singlePrint).toEqual([1600, 2260]);
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await page.locator('#an-publish').click();
  await page.locator('dialog[open]').getByRole('button', { name: 'Jetzt freigeben' }).click();
  const customer = await customerView(page);
  await customer.shell.locator('[data-offer-kind=drinks]').click();
  const card = customer.grid.locator('.an-product').first();
  await expect(card).toContainText('12,49 €');
  await expect(card.locator('canvas')).toHaveAttribute('aria-hidden', 'true');
  expect(state.published.get(head.id).data.layout.targets.card[0].elements.find((element) => element.id === cardName.id).x).toBe(130);
  expect(state.errors).toEqual([]);
});

test('TC-F11-legacy: veröffentlichte Aktionen ohne Ziellayout behalten ihre bisherige Kachel', async ({ page }) => {
  const state = await setup(page), head = await seed(page, state, { publish: true });
  delete head.draft.layout.targets;
  delete state.published.get(head.id).data.layout.targets;
  const { grid, shell } = await customerView(page);
  await shell.locator('[data-offer-kind=drinks]').click();
  const card = grid.locator('.an-product').last();
  await expect(card.locator('.an-price')).toBeVisible();
  await expect(card.locator('canvas')).toHaveCount(0);
});

for (const kind of ['weekly', 'drinks']) {
  test(`TC-F11-05: ${kind} direkt ohne Pflichtdialog bearbeiten und speichern`, async ({ page }) => {
    const state = await setup(page), head = await seed(page, state, { kind, count: 2, publish: true });
    head.draft.items[0].retail_price_cents = 1499;
    const published = copy(state.published.get(head.id));
    await page.reload(); await page.locator('[data-open="' + head.id + '"]').click();
    await expect(page.locator('#an-root')).toHaveAttribute('aria-busy', 'false');
    let rows = page.locator('#an-items .an-item'), first = rows.first(), second = rows.nth(1);
    await first.getByLabel('Artikelname', { exact: true }).fill('Erster Artikel');
    await page.keyboard.press('Tab');
    await expect(first.getByLabel('Angebotspreis €', { exact: true })).toBeFocused();
    await first.getByLabel('Angebotspreis €', { exact: true }).fill('8,00');
    await page.keyboard.press('Tab');
    await expect(first.getByLabel('Stattpreis / UVP €', { exact: true })).toBeFocused();
    await first.getByLabel('Stattpreis / UVP €', { exact: true }).fill('10,00');
    await page.keyboard.press('Tab');
    await expect(first.getByLabel('Beschreibung / Inhalt', { exact: true })).toBeFocused();
    await first.getByLabel('Beschreibung / Inhalt', { exact: true }).fill('Direkt erfasst');
    await second.getByLabel('Angebotspreis €', { exact: true }).fill('9.49');
    await second.getByLabel('Angebotspreis €', { exact: true }).blur();
    await expect(first.locator('[data-item-values]')).toContainText('Rabatt: −20 %');
    await expect(first.locator('[data-item-values]')).toContainText('Stamm-VK: 14,99 €');
    if (kind === 'drinks') {
      await first.locator('.an-item-extra>summary').click();
      await first.getByLabel('Anzahl Flaschen / Einheiten', { exact: true }).fill('8');
      await first.getByLabel('Liter je Einheit', { exact: true }).fill('1');
      await first.getByLabel('Liter je Einheit', { exact: true }).blur();
      await first.getByRole('combobox', { name: 'Gebindeart', exact: true }).selectOption('Einweg');
      await first.getByRole('combobox', { name: 'Pfandentscheidung', exact: true }).selectOption('no');
      await expect(first.getByLabel('Gesamtpfand €', { exact: true })).toBeDisabled();
      await expect(first.locator('[data-unit-price]')).toContainText('1,00 €/l');
      await first.getByRole('combobox', { name: 'Pfandentscheidung', exact: true }).selectOption('yes');
      await expect(first.getByLabel('Gesamtpfand €', { exact: true })).toHaveValue('');
      await first.getByLabel('Gesamtpfand €', { exact: true }).fill('2,00');
      await first.getByLabel('Gesamtpfand €', { exact: true }).blur();
    }
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await noOverflow(page);
    await first.screenshot({ path: test.info().outputPath('artikel-direktbearbeitung.png') });
    await first.locator('[data-edit-item]').click();
    await expect(page.locator('dialog[open] [data-item-field=name]')).toHaveValue('Erster Artikel');
    await expect(page.locator('dialog[open] [data-item-field=price_cents]')).toHaveValue('8,00');
    await page.getByRole('button', { name: 'Artikelbearbeitung schließen' }).click();
    await saveDraft(page);
    const saved = state.actions.get(head.id).draft;
    expect(saved.items[0]).toMatchObject({ name: 'Erster Artikel', description: 'Direkt erfasst', price_cents: 800, old_price_cents: 1000, retail_price_cents: 1499 });
    expect(saved.items[1].price_cents).toBe(949);
    if (kind === 'drinks') expect(saved.items[0]).toMatchObject({ units: 8, volume_ml: 1000, packaging: 'Einweg', deposit_free: false, deposit_cents: 200 });
    expect(state.published.get(head.id)).toEqual(published);
    await page.reload(); await page.locator('[data-open="' + head.id + '"]').click();
    first = page.locator('#an-items .an-item').first();
    await expect(first.getByLabel('Angebotspreis €', { exact: true })).toHaveValue('8,00');
    await expect(first.getByLabel('Beschreibung / Inhalt', { exact: true })).toHaveValue('Direkt erfasst');
    expect(state.log.filter((r) => r.method !== 'GET' && !r.path.startsWith('/api/angebote-') && !r.read_only_lookup)).toEqual([]);
    expect(state.errors).toEqual([]);
  });
}

test('TC-F11-06: automatische Bilder auch nur mit EAN oder kurzem Strichcode', async ({ page }) => {
  const state = await setup(page);
  state.catalog.push(
    { artikelnummer: '', strichcode: '4000286200145', bezeichnung: 'Artikel nur mit EAN', vk: 2.49 },
    { artikelnummer: '', strichcode: '508', bezeichnung: 'Breze', vk: 0.79 });
  await page.getByRole('button', { name: '+ Wochenaktion anlegen' }).click();
  await page.getByRole('button', { name: '+ Aus Artikelstamm wählen' }).click();
  for (const item of state.catalog) await page.getByRole('button', { name: new RegExp(item.bezeichnung) }).click();
  await page.getByRole('button', { name: /Auswahl übernehmen/ }).click();
  await expect(page.locator('#an-items .an-item-thumb[src]')).toHaveCount(3);
  expect(await page.locator('#an-items img').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0))).toBe(true);
  const lookup = state.log.find((r) => r.read_only_lookup);
  expect(lookup.articles.map((a) => a.artikelnummer)).toEqual(['ART2001', '4000286200145', '508']);
  await saveDraft(page);
  expect([...state.actions.values()][0].draft.items.every((it) => state.images.has(it.image_id))).toBe(true);
  expect(state.log.filter((r) => r.method !== 'GET' && !r.path.startsWith('/api/angebote-') && !r.read_only_lookup)).toEqual([]);
});

test('TC-F11-06: fehlende Entwurfsbilder automatisch nachladen, eigene Bilder erhalten', async ({ page }) => {
  const state = await setup(page), head = await seed(page, state, { count: 2, publish: true });
  const ownImage = 'f'.repeat(32);
  state.images.set(ownImage, PHOTO); head.draft.items[0].image_id = ownImage;
  Object.assign(head.draft.items[1], { article_number: '', barcode: '508' });
  const published = copy(state.published.get(head.id));
  await page.reload(); await page.locator('[data-open="' + head.id + '"]').click();
  await expect(page.locator('#an-root')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('#an-items img')).toHaveCount(2);
  await expect(page.locator('#an-image-status')).toContainText('1 Artikelbilder übernommen');
  expect(state.log.find((r) => r.read_only_lookup).articles).toEqual([{ artikelnummer: '508', edeka_nr: '', strichcode: '508' }]);
  expect(state.actions.get(head.id).draft.items[1].image_id).toBeFalsy();
  await saveDraft(page);
  expect(state.actions.get(head.id).draft.items[0].image_id).toBe(ownImage);
  expect(state.images.has(state.actions.get(head.id).draft.items[1].image_id)).toBe(true);
  expect(state.published.get(head.id)).toEqual(published);
});

for (const technical of [false, true]) {
  test(`TC-F11-06: ${technical ? 'Bildsuchfehler mit Wiederholung' : 'fehlendes Bild'} wird sichtbar gemeldet`, async ({ page }) => {
    const state = await setup(page), head = await seed(page, state);
    if (technical) state.failImageLookup = true;
    else state.missingImageKeys.add(head.draft.items[0].article_number);
    await page.reload(); await page.locator('[data-open="' + head.id + '"]').click();
    await expect(page.locator('#an-image-status')).toContainText(technical ? 'Bildsuche ist fehlgeschlagen' : 'kein Bild gefunden');
    if (technical) {
      await expect(page.locator('dialog[open]')).toContainText('Die Angebote konnten nicht geladen oder gespeichert werden.');
      await page.locator('dialog[open]').getByRole('button', { name: 'Schließen', exact: true }).click();
      await expect(page.locator('#an-root')).toHaveAttribute('aria-busy', 'false');
      state.failImageLookup = false;
      await page.locator('#an-reload-saved').click();
      await expect(page.locator('#an-items img')).toHaveCount(1);
    }
    expect(state.actions.get(head.id).draft.items[0].image_id).toBeFalsy();
    expect(state.errors).toEqual([]);
  });
}

test('TC-F11-04: direkt bearbeitbare Artikelliste bleibt lesbar ohne horizontalen Überlauf', async ({ page }) => {
  const state = await setup(page), head = await seed(page, state, { count: 4 });
  await page.reload();
  await page.locator('[data-open="' + head.id + '"]').click();
  await expect(page.locator('#an-items .an-item')).toHaveCount(4);
  await noOverflow(page);
  for (const rect of await page.locator('#an-items button[data-edit-item],#an-items .an-item-fields input').evaluateAll((buttons) =>
    buttons.map((button) => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })))) {
    expect(rect.width).toBeGreaterThanOrEqual(44);
    expect(rect.height).toBeGreaterThanOrEqual(44);
  }
  expect(state.errors).toEqual([]);
});

test('TC-F3-04: echte freie Elemente, eigenes Bild, Duplikat und gespeicherte Drehung/Transparenz', async ({ page }) => {
  const state = await setup(page), head = await editSeed(page, state);
  await page.locator('#an-items button[data-edit-item]').click();
  await page.getByLabel('Bilddatei wählen / ersetzen').setInputFiles({ name: 'produkt.png', mimeType: 'image/png', buffer: PHOTO });
  await page.getByRole('button', { name: 'Übernehmen' }).click();
  await page.getByRole('button', { name: '2 · Frei gestalten' }).click();
  await page.getByRole('button', { name: '+ Text', exact: true }).click();
  await page.getByRole('textbox', { name: 'Eigener Text', exact: true }).fill('Dein individueller Flyer');
  await page.getByLabel('Position X', { exact: true }).fill('88');
  await page.getByLabel('Drehung', { exact: true }).fill('15');
  await page.getByLabel('Deckkraft', { exact: true }).fill('0.65');
  await page.getByLabel('Deckkraft', { exact: true }).blur();
  await page.getByRole('button', { name: 'Duplizieren', exact: true }).click();
  await page.getByRole('button', { name: 'Ebene zurück', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '+ Eigenes Bild' }).click();
  await (await chooser).setFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PHOTO });
  await expect(page.getByLabel('Gestaltungselement')).toHaveValue(/^[a-f0-9]{32}$/);
  await saveDraft(page);
  const saved = state.actions.get(head.id).draft;
  expect(saved.layout.mode).toBe('template');
  const cardLayout = saved.layout.targets.card.find((entry) => entry.item_id === saved.items[0].id);
  const own = cardLayout.elements.filter((e) => e.type === 'text');
  expect(own).toHaveLength(2);
  expect(own[0]).toMatchObject({ text: 'Dein individueller Flyer', opacity: .65, rotation: 15 });
  expect(cardLayout.elements.some((e) => e.type === 'image' && e.image_id)).toBe(true);
  expect(saved.layout.targets.single[0].elements.some((e) => e.type === 'text' && e.text === 'Dein individueller Flyer')).toBe(false);
  expect(saved.items[0].image_id).toMatch(/^[a-f0-9]{32}$/);
  await page.reload();
  await page.locator('[data-open="' + head.id + '"]').click();
  await page.getByRole('button', { name: '2 · Frei gestalten' }).click();
  await page.getByLabel('Gestaltungselement').selectOption(own[0].id);
  await expect(page.getByLabel('Drehung', { exact: true })).toHaveValue('15');
  await expect(page.getByLabel('Deckkraft', { exact: true })).toHaveValue('0.65');
  await expect(page.getByRole('textbox', { name: 'Eigener Text', exact: true })).toHaveValue('Dein individueller Flyer');
  await page.locator('#an-stage').scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath('flyer-editor.png') });
  await page.getByRole('button', { name: 'Vorlage neu anwenden' }).click();
  await page.locator('dialog[open]').getByRole('button', { name: 'Abbrechen' }).click();
  expect(state.actions.get(head.id).draft).toEqual(saved);
  expect(state.errors).toEqual([]);
});

test('TC-F3-01..02/F3-05: sieben Artikel, freies Layout und echte A4-PDF-Seiten', async ({ page }) => {
  const state = await setup(page), head = await editSeed(page, state, { count: 7 });
  await saveDraft(page);
  await page.getByRole('button', { name: '3 · Ausgeben' }).click();
  await page.locator('#an-print-action').click();
  await expect.poll(() => page.evaluate(() => window.__printCalled || 0)).toBe(1);
  await expect(page.locator('body>#an-print .an-print-page')).toHaveCount(2);
  expect(await page.locator('[id=an-print]').count()).toBe(1);
  const printed = await page.locator('#an-print img').evaluateAll((images) => images.map((img) => ({ w: img.naturalWidth, h: img.naturalHeight, url: img.src })));
  expect(printed.map(({ w, h }) => ({ w, h }))).toEqual([{ w: 1588, h: 2246 }, { w: 1588, h: 2246 }]);
  const source = await page.evaluate(async (data) => (await window.AngeboteModel.render(data, 0, 2)).canvas.toDataURL('image/png'), state.actions.get(head.id).draft);
  expect(printed[0].url).toBe(source);
  const metrics = await page.evaluate(() => ({ className: document.body.className,
    print: getComputedStyle(document.getElementById('an-print')).display }));
  const pdf = await page.pdf({ path: test.info().outputPath('flyer.pdf'), preferCSSPageSize: true, printBackground: true });
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length, JSON.stringify(metrics)).toBe(2);
  const box = /\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/.exec(pdf.toString('latin1'));
  expect(Number(box[1])).toBeCloseTo(595, 0);
  expect(Number(box[2])).toBeCloseTo(842, 0);
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect(page.locator('body')).not.toHaveClass(/an-printing/);
  expect(state.log.filter((r) => r.path === '/api/waage-werbebilder' && r.method !== 'GET')).toEqual([]);
  expect(state.published.size).toBe(0);
});

test('TC-F4-02/F5-01..05/F7-02: gemeinsame Kundenkarten, mobiles Original mit Zoom und Seiten', async ({ page }) => {
  const state = await setup(page);
  const head = await seed(page, state, { count: 7, publish: true });
  await seed(page, state, { publish: true, title: 'Zweite Getränkeaktion' });
  state.log.length = 0;
  const { grid, shell } = await customerView(page);
  await expect(grid.locator('.an-legacy')).toHaveCount(1);
  await shell.locator('[data-offer-kind=drinks]').click();
  await expect(grid.locator('.an-product')).toHaveCount(8);
  const card = grid.locator('.an-product').first();
  await expect(card).toContainText('12,49 €');
  await expect(card).toContainText('20 × 0,5 l · Mehrweg');
  await expect(card).toContainText('zzgl. 3,10 € Pfand');
  await expect(card).toContainText('1 l = 1,25 €');
  const firstItem = state.published.get(head.id).data.items[0];
  const cardLayout = state.published.get(head.id).data.layout.targets.card.find((entry) => entry.item_id === firstItem.id);
  expect(cardLayout.elements.find((element) => element.type === 'price').font_size).toBeGreaterThanOrEqual(28);
  await expect(card.locator('canvas')).toHaveAttribute('aria-hidden', 'true');
  const lesbar = await grid.evaluate((el) => [...el.children].map((n) => ({
    breite: n.clientWidth,
    gitter: el.clientWidth,
    abgeschnitten: [...n.querySelectorAll('.ang-name')].some((t) => t.scrollWidth > t.clientWidth + 1),
  })));
  expect(lesbar.length).toBeGreaterThan(0);
  for (const eintrag of lesbar) {
    expect(eintrag.breite).toBeGreaterThanOrEqual(Math.min(300, eintrag.gitter - 2));
    expect(eintrag.abgeschnitten).toBe(false);
  }
  await noOverflow(page);
  await page.screenshot({ path: test.info().outputPath('customer-cards.png') });
  await shell.locator('[data-offer-action]').selectOption(head.id);
  await shell.locator('[data-offer-flyer]').click();
  const viewer = page.locator('dialog.an-viewer[open]');
  await expect(viewer.locator('canvas')).toBeVisible();
  await expect(viewer.locator('[data-viewer-page-label]')).toHaveText('1 / 2');
  if (page.viewportSize().width <= 480) {
    const box = await viewer.boundingBox();
    expect(box.width).toBe(page.viewportSize().width);
    expect(Math.abs(box.height - page.viewportSize().height)).toBeLessThanOrEqual(1);
  }
  const before = await viewer.locator('.an-viewer-page').evaluate((el) => el.getBoundingClientRect().width);
  await viewer.locator('[data-viewer-zoom-in]').click();
  const after = await viewer.locator('.an-viewer-page').evaluate((el) => el.getBoundingClientRect().width);
  expect(after / before).toBeCloseTo(1.5, 1);
  await page.screenshot({ path: test.info().outputPath('customer-original.png') });
  await viewer.locator('[data-viewer-next]').click();
  await expect(viewer.locator('[data-viewer-page-label]')).toHaveText('2 / 2');
  for (const box of await viewer.locator('button').evaluateAll((els) => els.map((el) => ({ w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height })))) {
    expect(box.w).toBeGreaterThanOrEqual(44); expect(box.h).toBeGreaterThanOrEqual(44);
  }
  await viewer.locator('[data-viewer-close]').click();
  await expect(viewer).toHaveCount(0);
  await noOverflow(page);
  expect(state.log.filter((r) => r.path === '/api/angebote' && r.method === 'GET')).toHaveLength(1);
  expect(state.log.filter((r) => r.path === '/api/angebote-flyer' && r.method === 'GET')).toHaveLength(1);
  expect(state.log.filter((r) => r.method !== 'GET' && r.path !== '/api/track')).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('TC-F4-04/F5-02: Lesefehler statt leerer Ersatzdaten, erneutes Laden und leere Getränkekategorie', async ({ page }) => {
  const state = await setup(page);
  state.failRead = true;
  const { grid, shell } = await customerView(page);
  await expect(grid.getByRole('alert')).toContainText('konnten nicht geladen werden');
  await expect(grid).not.toContainText('Aktuell keine');
  state.failRead = false;
  await grid.getByRole('button', { name: 'Erneut laden', exact: true }).click();
  await expect(grid.locator('.an-legacy')).toHaveCount(1);
  await expect(grid.getByRole('alert')).toHaveCount(0);
  await shell.locator('[data-offer-kind=drinks]').click();
  await expect(grid).toContainText('Aktuell keine Getränkeangebote');
  await expect(shell.locator('[data-offer-flyer]')).toHaveCount(0);
  await shell.locator('[data-offer-kind=weekly]').click();
  await expect(grid.locator('.an-legacy')).toHaveCount(1);
  await noOverflow(page);
  expect(state.log.filter((r) => r.method !== 'GET' && r.path !== '/api/track')).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('TC-F4-02/F4-04: Entwurfsänderung bleibt privat, Freigabe explizit und Konflikt sichtbar', async ({ page }) => {
  const state = await setup(page), head = await editSeed(page, state, { publish: true });
  await page.locator('#an-items button[data-edit-item]').click();
  await page.locator('dialog[open]').getByLabel('Angebotspreis €', { exact: true }).fill('10.99');
  await page.getByRole('button', { name: 'Übernehmen' }).click();
  await saveDraft(page);
  expect(state.published.get(head.id).data.items[0].price_cents).toBe(1249);
  expect(state.actions.get(head.id).draft.items[0].price_cents).toBe(1099);
  await page.getByRole('button', { name: '3 · Ausgeben' }).click();
  await page.locator('#an-publish').click();
  await page.locator('dialog[open]').getByRole('button', { name: 'Jetzt freigeben' }).click();
  await expect(page.locator('#an-output-status')).toContainText('Freigegeben');
  expect(state.published.get(head.id).data.items[0].price_cents).toBe(1099);
  await page.getByRole('button', { name: '1 · Artikel und Bilder' }).click();
  await page.locator('#an-items button[data-edit-item]').click();
  await page.locator('dialog[open]').getByLabel('Angebotspreis €', { exact: true }).fill('9.99');
  await page.getByRole('button', { name: 'Übernehmen' }).click();
  state.failSave = true;
  await page.getByRole('button', { name: 'Entwurf speichern', exact: true }).click();
  await expect(page.locator('dialog[open]')).toContainText('inzwischen geändert');
  await page.locator('dialog[open]').getByRole('button', { name: 'Schließen', exact: true }).click();
  await expect(page.locator('#an-save')).toBeEnabled();
  expect(state.actions.get(head.id).draft.items[0].price_cents).toBe(1099);
  expect(state.published.get(head.id).data.items[0].price_cents).toBe(1099);
  expect(state.log.filter((r) => r.path === '/api/waage-werbebilder' && r.method !== 'GET')).toEqual([]);
});

test('TC-F6-01: alle acht Exporte als tatsächliche JPEGs, A4 unverzerrt eingepasst', async ({ page }) => {
  const state = await setup(page), head = await seed(page, state);
  const outputs = await page.evaluate(async (data) => {
    const M = window.AngeboteModel, results = [];
    data.layout.pages[0].elements.unshift(M.el('shape', 0, 0, M.W, M.H, { fill: '#0066cc' }));
    for (const height of [1200, 960, 924, 560]) {
      for (const mode of ['single', 'full']) {
        const canvas = (await M.scaleImages(data, mode, { w: 1600, h: height }))[0];
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', .94));
        const bitmap = await createImageBitmap(blob);
        const row = canvas.getContext('2d').getImageData(0, 5, 1600, 1).data;
        let blue = 0;
        for (let n = 0; n < row.length; n += 4) if (row[n] === 0 && row[n + 1] === 102 && row[n + 2] === 204) blue++;
        results.push({ mode, w: bitmap.width, h: bitmap.height, bytes: blob.size, blue });
        bitmap.close();
      }
    }
    return results;
  }, head.draft);
  expect(outputs).toHaveLength(8);
  for (const out of outputs) {
    expect(out.w).toBe(1600); expect(out.bytes).toBeGreaterThan(1000);
    if (out.mode === 'full') expect(Math.abs(out.blue - 794 * out.h / 1123)).toBeLessThanOrEqual(3);
  }
});

test('TC-F8-02/F6-05: Preview exportiert, versendet und löscht aber nichts', async ({ page }) => {
  const state = await setup(page);
  await editSeed(page, state);
  await page.getByRole('button', { name: '3 · Ausgeben' }).click();
  await page.locator('#an-scale').click();
  await page.getByRole('button', { name: 'Waagenvorschau öffnen' }).click();
  await expect(page.locator('#wb-ueb-start')).toBeDisabled();
  await expect(page.locator('#wb-ueb')).toContainText('Echter Versand und Löschen sind gesperrt');
  await expect(page.locator('#wb-ueb a[download]')).toHaveCount(1);
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#wb-ueb a[download]').click();
  const download = await downloadPromise;
  const stream = await download.createReadStream(), chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  expect(jpegSize(Buffer.concat(chunks))).toEqual({ w: 1600, h: 924 });
  expect(download.suggestedFilename()).toMatch(/^21_[a-f0-9]{6}_[a-f0-9]{12}_[a-f0-9]{12}_20261116_20261125_01\.jpg$/);
  expect(state.log.filter((r) => r.path === '/api/waage-werbebilder' && r.method !== 'GET')).toEqual([]);
});

test('TC-F6-02/F6-05: Ersatz nur eigener Aktion, Upload vor Löschen und tatsächliche Bestätigung', async ({ page }) => {
  const state = await setup(page, { send: true }), head = await editSeed(page, state);
  const prefix = '21_' + state.config.scale_scope + '_' + hash(head.id, 12) + '_';
  const old = prefix + 'f'.repeat(12) + '_20261116_20261125_01.jpg';
  const other = 'AndereAktion.jpg';
  state.scale.dauer = [{ name: old, etag: 'alt', groesse: 1000, status: 'auf_waage' },
    { name: other, etag: 'fremd', groesse: 1000, status: 'auf_waage' }];
  state.bridge.ist = [old, other];
  await page.getByRole('button', { name: '3 · Ausgeben' }).click();
  await page.locator('#an-scale').click();
  await page.getByRole('button', { name: 'Waagenvorschau öffnen' }).click();
  await expect(page.getByRole('checkbox', { name: other + ' löschen', exact: true })).toBeDisabled();
  await expect(page.getByRole('checkbox', { name: old + ' löschen', exact: true })).toBeChecked();
  await expect(page.locator('#wb-ueb-start')).toBeEnabled({ timeout: 15000 });
  await page.locator('#wb-ueb-start').click();
  await expect(page.locator('#wb-ueb')).toContainText('wartet auf Bestätigung');
  await expect(page.locator('#wb-ueb')).toContainText('Brücke offline');
  const mutations = state.log.filter((r) => r.path === '/api/waage-werbebilder' && r.method !== 'GET');
  expect(mutations.map((r) => r.method)).toEqual(['POST', 'DELETE']);
  expect(mutations[0].dimensions).toEqual({ w: 1600, h: 924 });
  expect(mutations[1].params.name).toBe(old);
  expect(state.scale.dauer.some((b) => b.name === other)).toBe(true);
  state.bridge.online = true;
  state.bridge.ist = state.scale.dauer.map((b) => b.name);
  state.scale.dauer.forEach((b) => { b.status = 'auf_waage'; });
  await page.clock.fastForward(8001);
  await expect(page.locator('#wb-ueb')).toContainText('durch die Brücke bestätigt');
  expect(state.errors).toEqual([]);
});

test('TC-F1-02/F3-06: Wochenaktion duplizieren, Reihenfolge und fehlende Pflichtfelder', async ({ page }) => {
  const state = await setup(page);
  const head = await seed(page, state, { kind: 'weekly', count: 2, title: 'Wochenaktion' });
  await page.reload();
  await page.locator('[data-duplicate="' + head.id + '"]').click();
  await expect(page.locator('#an-save')).toBeEnabled();
  const duplicate = [...state.actions.values()].find((a) => a.id !== head.id);
  expect(duplicate.published_revision).toBeNull();
  await page.locator('#an-items .an-item').nth(1).locator('.an-item-menu summary').click();
  await page.locator('#an-items .an-item').nth(1).locator('[data-up]').click();
  await page.locator('#an-items .an-item').nth(1).locator('.an-item-menu summary').click();
  await page.locator('#an-items .an-item').nth(1).locator('[data-remove]').click();
  await saveDraft(page);
  expect(state.actions.get(duplicate.id).draft.items).toHaveLength(1);
  expect(state.actions.get(duplicate.id).draft.items[0].id).toBe(head.draft.items[1].id);
  await page.getByRole('button', { name: '2 · Frei gestalten' }).click();
  await page.locator('[data-layout-target="sheet"]').click();
  const price = state.actions.get(duplicate.id).draft.layout.pages[0].elements.find((e) => e.type === 'price');
  await page.getByLabel('Gestaltungselement').selectOption(price.id);
  await page.getByLabel('Ausblenden', { exact: true }).check();
  await page.getByRole('button', { name: '3 · Ausgeben' }).click();
  await page.locator('#an-publish').click();
  await expect(page.locator('dialog[open]')).toContainText('Pflichtfeld');
  expect(state.published.size).toBe(0);
  expect(state.actions.get(head.id).draft.items).toHaveLength(2);
});
