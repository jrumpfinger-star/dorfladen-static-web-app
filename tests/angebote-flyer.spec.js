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
    cmsDesign: { design_config: { flyer_decoTitleColor: '#0066aa', flyer_decoBgColor: '#fff9ed', priceFontFlyer: 62 } },
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
    if (path === '/api/cms-config') return state.failCmsDesign ? fail(503, 'Vorlagen nicht verfügbar')
      : json({ success: true, data: { feature_flags: { kiosk_getraenke: true, kiosk_werbebilder: true }, ...state.cmsDesign } });
    if (path === '/api/cms-auth') {
      if (method === 'GET') return entry.token === 'test-auth'
        ? json({ authenticated: true }) : json({ authenticated: false }, 401);
      if (state.loginReply) await state.loginReply;
      if (req.postDataJSON().password !== 'test-cms-password') return fail(401, 'invalid password');
      return state.failLogin ? fail(503, 'Die CMS-Anmeldung ist gerade nicht erreichbar.') : json({ success: true, token: 'test-auth' });
    }
    if (path === '/api/angebote') return state.failOffers ? fail(503, 'Angebote nicht erreichbar') : json({ success: true, data: state.emptyOffers ? [] : [{
      dl_angeboteid: 'legacy-one', dl_produkt: 'Bisheriges Wochenangebot', dl_preis: 2.49, dl_statt_preis: 2.99,
      dl_aktion_id: 'legacy-action', dl_gueltig_von: '2026-11-15', dl_gueltig_bis: '2026-11-21',
      dl_artikelnummer: options.legacyArticleNumber || '',
    }, ...(state.previewOffers || [])] });
    if (path === '/api/preisliste') return json({ groups: { Getränke: state.catalog } });
    if (path === '/api/werbebilder' && method === 'GET' && options.legacyArticleNumber) {
      return json([{ dl_artikelnummer: options.legacyArticleNumber,
        dl_bild_base64: 'data:image/png;base64,' + (state.previewImage || PHOTO).toString('base64') }]);
    }
    if (path === '/api/werbebilder' && method === 'POST') {
      if (!req.postDataJSON().articles) {
        entry.body = req.postDataJSON();
        expect(entry.token).toBe('test-auth');
        return state.failMasterUpload ? fail(503, 'Das Produktbild konnte nicht gespeichert werden.')
          : json({ success: true, id: uid() });
      }
      entry.read_only_lookup = true;
      const { articles } = req.postDataJSON();
      entry.articles = articles;
      if (state.failImageLookup) return fail(503, 'Die Bildsuche ist gerade nicht erreichbar.');
      return json(articles.filter((a) => a.artikelnummer && !state.missingImageKeys.has(a.artikelnummer)).flatMap((article) => [{ dl_artikelnummer: article.artikelnummer, dl_bild_base64: '' }, { dl_artikelnummer: article.artikelnummer,
        dl_bild_base64: 'data:image/png;base64,' + (state.previewImage || PHOTO).toString('base64') }]));
    }
    if (path === '/api/getraenke-artikel') return fail(410, 'Der Bestellkatalog ist für Angebotsflyer nicht vorgesehen.');
    if (path === '/api/angebote-flyer' && url.searchParams.get('view') === 'homepage') return state.failRead || state.failHomepage
      ? fail(503, 'Die Gestaltung ist gerade nicht erreichbar.') : json({ success: true, homepage: state.design.homepage || {} });
    if (path === '/api/angebote-flyer') return state.failRead ? fail(503, 'Die Angebote sind gerade nicht erreichbar.')
      : json({ success: true, actions: [...state.published.values()].filter((a) => a.data.valid_from <= NOW && a.data.valid_to >= NOW) });
    if (path.startsWith('/api/angebote-bilder')) {
      if (method === 'POST') {
        expect(entry.token).toBe('test-auth');
        const id = uid(); state.images.set(id, req.postDataBuffer()); entry.image_id = id;
        return json({ success: true, image_id: id }, 201);
      }
      const id = path.split('/').pop();
      if (options.privateImages && entry.token !== 'test-auth') return fail(401, 'Bitte zuerst anmelden.');
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
      if (url.searchParams.get('action') === 'delete') {
        if (body.version !== action.version) return fail(409, 'Das Angebot wurde inzwischen geändert. Bitte neu öffnen.');
        state.actions.delete(id); state.published.delete(id);
        return json({ success: true });
      }
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
    await page.goto(BASE + '/angebote.html?bestand=1');
    await expect(page.getByRole('button', { name: '+ Getränkeaktion anlegen' })).toBeVisible();
  }
  return state;
}

async function seed(page, state, { kind = 'drinks', count = 1, publish = false, title = 'Unsere Getränkeangebote', origin = false } = {}) {
  const data = await page.evaluate(({ kind, count, title, origin }) => {
    const M = window.AngeboteModel, data = M.blank(kind);
    data.title = title; data.valid_from = '2026-11-16'; data.valid_to = '2026-11-25';
    for (let n = 0; n < count; n++) {
      const item = M.item();
      Object.assign(item, { name: n ? 'Weiteres Getränk ' + (n + 1) : 'Ein langer, gut lesbarer Getränkename aus unserer Region',
        article_number: 'KA40015-' + n, description: 'Regional genießen', units: 20, volume_ml: 500,
        packaging: 'Mehrweg', price_cents: 1249, old_price_cents: 1499, deposit_cents: 310 });
      data.items.push(item);
    }
    M.applyTemplate(data); if (origin) M.rememberDesign(data); return data;
  }, { kind, count, title, origin });
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

async function designTab(page, id) {
  const trigger = page.locator('.an-design-location-btn');
  if (await trigger.isVisible()) {
    await trigger.click();
    const popup = page.locator('.an-design-locations').locator('visible=true').first();
    const items = popup.locator('.an-loc-item[data-value="' + id + '"], [data-value$="/' + id + '"], [data-value^="' + id + '/"]');
    await items.first().click();
  } else await page.locator('[data-id="' + id + '"]').click();
}

async function designerTool(root, index) {
  const select = root.getByRole('combobox', { name: 'Gestaltungswerkzeuge', exact: true });
  const tab = index === 'tools' ? await root.locator('[data-designer-tools]').getAttribute('data-designer-tab') : String(index);
  // Auf schmalen Viewports erscheint das Werkzeuge-Select erst mit dem Layout (ResizeObserver);
  // bis dahin ist auch der Reiter-Button versteckt. Auf eines von beiden warten.
  await expect(select.or(root.locator('[data-designer-tab="' + tab + '"]')).locator('visible=true').first()).toBeVisible({ timeout: 15000 });
  if (await select.isVisible()) await select.selectOption(tab);
  else await root.locator('[data-designer-tab="' + tab + '"]').click();
}

async function workspaceView(root, mode) {
  const select = root.locator('[aria-label=Arbeitsansicht]');
  await expect(select.or(root.locator('[data-workspace-views]')).locator('visible=true').first()).toBeVisible();
  if (!(await select.isVisible())) await root.locator('[data-workspace-views]:visible').click();
  await select.selectOption(mode);
}

async function chooseFamily(root, name) {
  const radio = root.getByRole('radio', { name, exact: true });
  await radio.locator('..').click({ position: { x: 4, y: 4 } });
  await expect(radio).toBeChecked();
}

// Unter ~612 px stehen Eingaben und Motiv als getrennte Arbeitsansichten; breiter ist es ein No-op.
async function phoneView(page, mode) {
  const split = page.locator('.an-split-mobile').first();
  if (!(await split.count())) return;
  await workspaceView(split, mode);
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
}

async function openDetails(details) {
  if (await details.evaluate((node) => node.tagName === 'DETAILS' && !node.open)) await details.locator(':scope > summary').click();
}
// Mindestgröße von Bedienflächen: 32 px bei Maus ab 600 px, sonst 44 px (docs/ui-designstandard.md 4.3).
const hit = (page) => page.viewportSize().width >= 600 && !test.info().project.use.hasTouch ? 32 : 44;

// Gestaltungswerte stehen hinter Zusammenfassungen: Feld ggf. im zugehörigen Objektfenster ändern und übernehmen.
async function setField(page, root, locator, value) {
  const act = async () => {
    if (await locator.evaluate((node) => node.tagName) === 'SELECT') await locator.selectOption(value);
    else if (await locator.evaluate((node) => node.type) === 'checkbox') await locator.setChecked(!!value);
    else if (await locator.evaluate((node) => node.type) === 'range') await locator.evaluate((n, v) => {
      n.value = String(v);
      n.dispatchEvent(new Event('input', { bubbles: true }));
      n.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
    else { await locator.fill(String(value)); await locator.dispatchEvent('change'); }
  };
  if (await locator.isVisible()) { await act(); return; }
  const key = await locator.evaluate((node) => node.dataset.style || node.dataset.cmsConfig || node.id || '');
  const group = await page.evaluate((name) => window.AngeboteModel.propertyGroup(name), key);
  const toolSelect = root.locator('select[aria-label="Gestaltungswerkzeuge"]');
  const previousTool = await toolSelect.count() ? await toolSelect.inputValue() : null;
  if (!group) {
    const ownerTab = await locator.evaluate(node => {
      const panel = node.closest('[role=tabpanel]');
      const tab = panel && document.querySelector('[role=tab][aria-controls="' + panel.id + '"]');
      return tab && tab.dataset.designerTab;
    });
    expect(ownerTab, 'Das Feld besitzt einen erreichbaren Werkzeugreiter: ' + key).toBeTruthy();
    await designerTool(root, ownerTab);
    for (const details of (await locator.locator('xpath=ancestor::details').all()).reverse()) await openDetails(details);
    await act();
    if (previousTool !== null) await designerTool(root, previousTool);
    return;
  }
  if (!(await root.locator('[data-object-properties=' + group + ']').isVisible()) && previousTool !== null) await designerTool(root, 'tools');
  await root.locator('[data-object-properties=' + group + ']').click();
  await act();
  await root.locator('dialog.an-object-dialog[open]').getByRole('button', { name: 'Übernehmen', exact: true }).click();
  if (previousTool !== null) await designerTool(root, previousTool);
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
  for (const selector of ['.ang-name', '.an-hp-price', '.an-hp-discount']) {
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
  await page.goto(BASE + '/angebote.html?bestand=1');
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

test('TC-F13-02..03: alle Vorlagen rendern lesbar mit Original-Logo, beiden Arten und 4/6 Artikeln', { tag: '@ohne-layout' }, async ({ page }) => {
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
        const fields = layout.elements.filter((e) => !e.hidden && ['name', 'price', 'old_price', 'pack', 'deposit', 'base'].includes(e.type));
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
  expect(results).toHaveLength(68);
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
  await page.locator('[data-element-prop=rotation][type=number]').fill('5');
  await page.locator('[data-element-prop=rotation][type=number]').dispatchEvent('change');
  await saveDraft(page);
  await page.reload();
  await page.locator('[data-open="' + head.id + '"]').click();
  await page.getByRole('button', { name: '2 · Frei gestalten' }).click();
  await page.locator('[data-layout-target=sheet]').click();
  await page.locator('#an-select-element').selectOption(logo.id);
  await expect(page.locator('[data-element-prop=x]')).toHaveValue('500');
  await expect(page.locator('[data-element-prop=rotation][type=number]')).toHaveValue('5');
  const preserved = copy(state.actions.get(head.id).draft);
  await page.locator('[data-layout-target=card]').click();
  await templatePanel(page);
  await page.locator('label.an-family').filter({ has: page.locator('input[data-style=family][value=magazine]') }).click();
  await saveDraft(page);
  const changed = state.actions.get(head.id).draft;
  expect(changed.layout.pages).toEqual(preserved.layout.pages);
  expect(changed.layout.targets.single).toEqual(preserved.layout.targets.single);
  expect(changed.layout.targets.scale).toEqual(preserved.layout.targets.scale);
  expect(changed.layout.template).toBe(preserved.layout.template);
  expect(changed.layout.target_styles.card.template).toBe('modern-magazine');
  for (const card of changed.layout.targets.card) {
    expect(card.background).toBe(preserved.layout.targets.card.find(entry => entry.item_id === card.item_id).background);
    expect(card.elements.find((e) => e.type === 'image').w).toBe(372);
  }
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
      await templatePanel(page);
    }
    const host = page.locator(cmsMode ? '#an-design-root' : '#an-step-design');
    await expect(host.locator('[data-style=family]')).toHaveCount(10);
    const stored = copy(cmsMode ? state.design : state.actions.get(head.id));
    const writes = state.log.filter((r) => !['GET', 'HEAD', 'OPTIONS'].includes(r.method)).length;
    await host.getByRole('button', { name: 'Landladen vergrößern', exact: true }).click();
    let dialog = page.getByRole('dialog', { name: 'Vorlagenvorschau · Landladen', exact: true });
    await expect(dialog.locator('canvas')).toHaveAttribute('width', '1588');
    await expect(dialog.locator('canvas')).toHaveAttribute('height', '2246');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    const enlarge = host.getByRole('button', { name: 'Kantig vergrößern', exact: true });
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
      await page.locator('[data-layout-target=sheet]').click();
      await templatePanel(page);
    }
    const host = page.locator(cmsMode ? '#an-design-root' : '#an-step-design');
    await expect(host.locator('[data-style=family]')).toHaveCount(10);
    await expect(host.locator('[data-style=template]')).toHaveCount(17);
    await expect(host.locator('select[data-style=template],select[data-style=density]')).toHaveCount(0);
    const originalColors = [await host.getByLabel('Angebots-/Preisfarbe').inputValue(), await host.getByLabel('Flyer-Hintergrund', { exact: true }).inputValue()];
    const families = await host.locator('[data-style=family]').evaluateAll(nodes => nodes.map(node => node.value));
    for (const id of families) {
      await host.locator('label.an-family').filter({ has: page.locator('input[data-style=family][value="' + id + '"]') }).click();
      await expect(host.getByLabel('Angebots-/Preisfarbe')).toHaveValue(originalColors[0]);
      await expect(host.getByLabel('Flyer-Hintergrund', { exact: true })).toHaveValue(originalColors[1]);
    }
    const classic = host.getByRole('radio', { name: /Kantig/ });
    await host.locator('label.an-family:has(input[data-style=family][value=square])').click();
    await expect(classic).toBeChecked();
    await classic.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(host.getByRole('radio', { name: /Landladen/ })).toBeChecked();
    await page.keyboard.press('ArrowRight');
    await expect(classic).toBeChecked();
    await host.locator('label.an-choice:has(input[data-style=density][value="6"])').click();
    for (const group of await host.locator('.an-choice-group:visible').filter({ has: page.locator('input[type=radio]') }).all()) {
      await expect(group.locator('input[type=radio]:checked')).toHaveCount(1);
      const rect = await group.locator('.an-family,.an-choice').first().boundingBox();
      expect(rect.height).toBeGreaterThanOrEqual(page.viewportSize().width >= 600 && !test.info().project.use.hasTouch ? 32 : 44);
    }
    await expect(host.getByLabel('Schrift', { exact: true })).toBeAttached();
    await expect(host.getByLabel('Angebots-/Preisfarbe')).toBeAttached();
    if (cmsMode) await designerTool(host, 1);
    await host.getByLabel('Flyer-Hintergrund', { exact: true }).fill('#fff0df');
    await host.getByLabel('Flyer-Hintergrund', { exact: true }).dispatchEvent('change');
    await expect.poll(() => host.locator('[data-template-preview=classic] canvas').evaluate((canvas) =>
      Array.from(canvas.getContext('2d').getImageData(1, 1, 1, 1).data))).toEqual([255, 240, 223, 255]);
    if (cmsMode) {
      await designerTool(host, 'tools');
      await expect(host.locator('[data-object-properties=image]')).toBeVisible();
    } else await expect(host.locator('.an-fine:not(.an-more-design)').first()).toHaveAttribute('open', '');
    await expect(host.getByLabel('Produktbild · Drehung in Grad')).toBeAttached();
    const clippedLabels = await host.locator('.an-field > span').evaluateAll((labels) => labels.filter((label) => {
      const bounds = label.parentElement.getBoundingClientRect(), range = document.createRange();
      range.selectNodeContents(label);
      return [...range.getClientRects()].some((rect) => rect.width && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1));
    }).map((label) => label.textContent));
    if (clippedLabels.length) {
      const dump = await host.locator('.an-field > span').evaluateAll((labels) => labels.filter((label) => {
        const bounds = label.parentElement.getBoundingClientRect(), range = document.createRange();
        range.selectNodeContents(label);
        return [...range.getClientRects()].some((rect) => rect.width && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1));
      }).map((label) => {
        const r = document.createRange(); r.selectNodeContents(label);
        const b = label.parentElement.getBoundingClientRect();
        return { html: label.parentElement.outerHTML.slice(0, 400), cls: label.className,
          spanRect: JSON.parse(JSON.stringify(label.getBoundingClientRect())),
          bounds: { left: Math.round(b.left), right: Math.round(b.right), width: Math.round(b.width) },
          rects: [...r.getClientRects()].map((x) => ({ left: Math.round(x.left), right: Math.round(x.right), w: Math.round(x.width) })) };
      }));
      console.log('CLIPPED-DUMP ' + JSON.stringify(dump, null, 1));
    }
    expect(clippedLabels).toEqual([]);
    if (cmsMode) {
      await host.locator('[data-design-save]').click();
      await expect(host.locator('[data-design-status]')).toContainText('Designstandards gespeichert');
      expect(state.design.drinks).toMatchObject({ template: 'classic', density: 6 });
    } else {
      await saveDraft(page);
      expect(state.actions.get(head.id).draft.layout).toMatchObject({ template: 'classic', density: 6 });
    }
    const stored = copy(cmsMode ? state.design : state.actions.get(head.id));
    const attribute = cmsMode ? 'data-design-mode' : 'data-editor-mode';
    if (cmsMode) await designerTool(host, 'tools');
    // Die reine Ausgabe zeigt nur das Motiv; die Ausgabevorschauen (Handy/Kiosk, Waage) liegen in der Gestaltung.
    await workspaceView(cmsMode ? page.locator('[data-designer=drinks]') : page.locator('#an-root'), 'split');
    // Im Aktionseditor ersetzt die Formatwahl der reinen Ausgabe (Homepage/Kiosk, Waage) die früheren Vorschauschalter.
    for (const mode of cmsMode ? ['cards', 'scale-large', 'scale-small', 'paper'] : []) {
      const button = page.locator('[' + attribute + '="' + mode + '"]');
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      const preview = page.locator(cmsMode ? '[data-design-preview]' : mode === 'paper' ? '#an-stage' : '#an-other-preview');
      await expect(preview.locator(!cmsMode && mode === 'cards' ? '.an-product' : 'canvas').first()).toBeVisible();
      if (mode === 'cards') {
        await expect.poll(() => preview.locator('canvas').first().evaluate((canvas) =>
          canvas.getContext('2d').getImageData(0, 0, 1, 1).data[3])).toBe(255);
      }
      if (!cmsMode) await expect(page.locator('#an-stage')).toBeVisible({ visible: mode === 'paper' });
      expect(cmsMode ? state.design : state.actions.get(head.id)).toEqual(stored);
    }
    if (!cmsMode) {
      await page.getByRole('button', { name: '2 · Frei gestalten' }).click();
      await templatePanel(page);
    }
    if (cmsMode) await designerTool(host, 0);
    await noOverflow(page, cmsMode ? '#an-design-root' : 'html');
    await page.screenshot({ path: test.info().outputPath('layout-auswahl.png'), fullPage: true });
    await host.locator('.an-choice-group').first().screenshot({ path: test.info().outputPath('stil-kacheln.png') });
    await page.reload();
    if (!cmsMode) {
      await page.locator('[data-open="' + head.id + '"]').click();
      await page.getByRole('button', { name: '2 · Frei gestalten' }).click();
      await page.locator('[data-layout-target=sheet]').click();
      await templatePanel(page);
    }
    await expect(host.getByRole('radio', { name: /Kantig/ })).toBeChecked();
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
  await setField(page, page.locator('#an-design-root'), page.locator('#an-design-root [data-style=color]'), '#0066aa');
  await page.locator('[data-design-save]').click();
  await expect(page.locator('[data-design-status]')).toContainText('Designstandards gespeichert');
  expect(state.actions.get(head.id).draft).toEqual(original);
  await designerTool(page.locator('#an-design-root'), 'tools');
  await workspaceView(page.locator('[data-designer=drinks]'), 'split');
  for (const mode of ['cards', 'scale-large', 'scale-small', 'paper']) {
    await page.locator('[data-design-mode="' + mode + '"]').click();
    await expect(page.locator('[data-design-preview] canvas')).toBeVisible();
  }
  await noOverflow(page, '#an-design-root');
  await page.screenshot({ path: test.info().outputPath('design-editor.png') });
  await designTab(page, 'sec-flyer');
  await expect(page.locator('#cfg-sec-flyer')).toBeVisible();
  await expect(page.locator('#cfg-offer-legacy-save')).toBeVisible();
  await designTab(page, 'sec-plakat');
  await expect(page.locator('#cfg-sec-plakat')).toBeVisible();
  await designTab(page, 'sec-shared');
  await expect(page.locator('#cfg-sec-shared')).toBeVisible();
  await cms(page, 'ang');
  await expect(page.locator('#an-root').getByRole('button', { name: '+ Sonderaktion', exact: true })).toBeVisible();
  await expect(page.locator('#an-root').getByRole('button', { name: '+ Getränkeaktion', exact: true })).toBeVisible();
  await page.goto(BASE + '/angebote.html?bestand=1');
  await page.getByRole('button', { name: '+ Getränkeaktion anlegen' }).click();
  await saveDraft(page);
  expect([...state.actions.values()].at(-1).draft.layout.color).toBe('#0066aa');
  await page.goto(BASE + '/kiosk.html?bestand=1');
  await page.locator('.k-tab[data-tab=angebote]').click();
  await expect(page).toHaveURL(/kiosk\.html/);
  await expect(page.locator('#panel-angebote')).toBeVisible();
  expect(state.log.filter((r) => r.method !== 'GET' && r.path !== '/api/track' && !r.path.startsWith('/api/angebote-') && !r.read_only_lookup)).toEqual([]);
});

test('TC-F16-01/04: CMS-Vorschau direkt bearbeiten, Standards speichern und Vorlage ausdrücklich zurücksetzen', async ({ page }) => {
  const state = await setup(page), existing = await seed(page, state);
  const before = copy(existing);
  await cms(page);
  const host = page.locator('[data-design-preview]'), tools = page.locator('#an-design-root .an-direct-tools');
  await workspaceView(page.locator('[data-designer=drinks]'), 'split');
  await expect(host.locator('canvas')).toBeVisible();
  await designerTool(page.locator('#an-design-root'), 'tools');
  await tools.locator('[data-preview-element]').selectOption('sheet:0:image:0');
  await tools.getByRole('button', { name: 'Vorschauelement nach rechts drehen', exact: true }).click();
  await tools.getByRole('button', { name: 'Vorschauelement vergrößern', exact: true }).click();
  const hit = host.locator('[data-preview-select="sheet:0:image:0"]'), box = await hit.boundingBox();
  await hit.dispatchEvent('pointerdown', { pointerId: 71, pointerType: 'touch', button: 0, clientX: box.x + 5, clientY: box.y + 5 });
  await page.dispatchEvent('body', 'pointermove', { pointerId: 71, pointerType: 'touch', clientX: box.x + 20, clientY: box.y + 15 });
  await page.dispatchEvent('body', 'pointerup', { pointerId: 71, pointerType: 'touch' });
  await designerTool(page.locator('#an-design-root'), 2);
  await page.locator('#an-design-root').getByRole('button', { name: 'Herz', exact: true }).click();
  await page.locator('#an-design-root').getByRole('button', { name: 'Ozean Blau', exact: true }).click();
  await page.locator('[data-style=marker_scale]').evaluate((n) => {
    n.value = '140';
    n.dispatchEvent(new Event('input', { bubbles: true }));
    n.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.locator('[data-design-save]').click();
  await expect(page.locator('[data-design-status]')).toContainText('gespeichert');
  expect(state.design.drinks.adjustments['sheet:0:image:0']).toMatchObject({ rotation: 15, scale: 1.1 });
  expect(state.design.drinks.adjustments['sheet:0:image:0'].dx).toBeGreaterThan(0);
  expect(state.design.drinks.marker_type).toBe('heart');
  expect(state.actions.get(existing.id)).toEqual(before);
  const saved = copy(state.design);
  await page.goto(BASE + '/angebote.html?bestand=1');
  await page.getByRole('button', { name: '+ Getränkeaktion anlegen' }).click();
  await saveDraft(page);
  expect([...state.actions.values()].at(-1).draft.layout.adjustments).toEqual(saved.drinks.adjustments);
  await cms(page);
  await expect(page.locator('[data-style=marker_type]')).toHaveValue('heart');
  await page.locator('[data-designer=drinks] [data-more-actions]').click();
  await page.locator('[data-design-reset]').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Vorschau zurücksetzen', exact: true }).click();
  await expect(page.locator('[data-style=marker_type]')).toHaveValue('starburst');
  expect(state.design).toEqual(saved);
  await page.locator('[data-design-save]').click();
  await expect(page.locator('[data-design-status]')).toContainText('gespeichert');
  expect(state.design.drinks.adjustments || {}).toEqual({});
  expect(state.design.drinks.marker_scale).toBe(100);
  await noOverflow(page, '#an-design-root');
  await page.screenshot({ path: test.info().outputPath('bearbeitbare-designvorschau.png') });
  expect(state.errors).toEqual([]);
});

for (const density of [4, 6]) {
  test(`TC-F33-01: nur Musterkachel bearbeiten und alle ${density} Kacheln synchronisieren`, async ({ page }) => {
    test.setTimeout(120000);
    const state = await setup(page);
    state.design.drinks.density = density;
    const existing = await seed(page, state), before = copy(existing);
    await cms(page);
    await designerTool(page.locator('#an-design-root'), 'tools');
    await workspaceView(page.locator('[data-designer=drinks]'), 'split');
    await expect(page.getByRole('button', { name: /Hinweis: Nur die erste Kachel ist als Musterkachel bearbeitbar/ })).toBeVisible();
    const host = page.locator('[data-design-preview]'), tools = page.locator('#an-design-root .an-direct-tools');
    for (const [mode, target] of [['paper', 'sheet'], ['cards', 'card'], ['scale-large', 'scale'], ['scale-small', 'scale']]) {
      await page.locator('[data-design-mode="' + mode + '"]').click();
      const select = tools.locator('[data-preview-element]'), imageId = target + ':0:image:0';
      await expect(select.locator('option[value="' + imageId + '"]')).toHaveCount(1);
      if (mode === 'paper') await expect(select.locator('option[value="sheet:page:title:0"]')).toHaveCount(1);
      expect(await select.locator('option').evaluateAll((options) =>
        options.map((option) => option.value).filter((value) => /:[1-5]:/.test(value)))).toEqual([]);
      expect(await host.locator('[data-preview-select]').evaluateAll((nodes) =>
        nodes.map((node) => node.dataset.previewSelect).filter((value) => /:[1-5]:/.test(value)))).toEqual([]);
      await select.selectOption(imageId);
      const image = host.locator('[data-preview-select="' + imageId + '"]');
      const rotation = await image.evaluate((node) => node.style.transform);
      await tools.getByRole('button', { name: 'Vorschauelement nach rechts drehen', exact: true }).click();
      await expect.poll(() => image.evaluate((node) => node.style.transform)).not.toBe(rotation);
      const width = await image.evaluate((node) => parseFloat(node.style.width));
      await tools.getByRole('button', { name: 'Vorschauelement verkleinern', exact: true }).click();
      await expect.poll(() => image.evaluate((node) => parseFloat(node.style.width))).toBeLessThan(width);
      const imageY = await image.evaluate((node) => parseFloat(node.style.top));
      await tools.getByRole('button', { name: 'Vorschauelement nach unten', exact: true }).click();
      await expect.poll(() => image.evaluate((node) => parseFloat(node.style.top))).toBeGreaterThan(imageY);
      await select.selectOption(target + ':0:price:0');
      const price = host.locator('[data-preview-select="' + target + ':0:price:0"]');
      const y = await price.evaluate((node) => parseFloat(node.style.top));
      await host.locator('.an-stage').focus();
      await page.keyboard.press('ArrowDown');
      await expect.poll(() => price.evaluate((node) => parseFloat(node.style.top))).toBeGreaterThan(y);
    }
    await page.locator('[data-design-save]').click();
    await expect(page.locator('[data-design-status]')).toContainText('Designstandards gespeichert');
    expect(state.actions.get(existing.id)).toEqual(before);
    const saved = copy(state.design.drinks);
    for (const target of ['sheet', 'card', 'scale']) {
      for (let slot = 1; slot < density; slot++) {
        for (const type of ['image', 'price']) {
          expect(saved.adjustments[`${target}:${slot}:${type}:0`]).toEqual(saved.adjustments[`${target}:0:${type}:0`]);
        }
      }
    }
    expect(Object.keys(saved.adjustments).some((key) => key.startsWith('single:'))).toBe(false);
    await cms(page);
    await workspaceView(page.locator('[data-designer=drinks]'), 'split');
    await expect(host.locator('canvas')).toBeVisible();
    await page.locator('[data-design-save]').click();
    await expect(page.locator('[data-design-status]')).toContainText('Designstandards gespeichert');
    expect(state.design.drinks.adjustments).toEqual(saved.adjustments);
    const geometries = await page.evaluate(({ layout, count }) => {
      const M = window.AngeboteModel;
      function build(adjustments) {
        const data = M.blank('drinks', { ...layout, adjustments, pages: [], targets: { card: [], single: [], scale: [] } });
        for (let n = 0; n < count; n++) {
          data.items.push(Object.assign(M.item(), { name: 'Beispiel ' + n, price_cents: 1249, old_price_cents: 1499,
            units: 20, volume_ml: 500, packaging: 'Mehrweg', deposit_cents: 310 }));
        }
        M.applyTemplate(data);
        const groups = { sheet: data.layout.pages.flatMap((entry) => entry.elements) };
        for (const target of ['card', 'single', 'scale']) groups[target] = data.layout.targets[target].flatMap((entry) => entry.elements);
        return Object.fromEntries(Object.entries(groups).map(([target, elements]) => [target, elements
          .filter((element) => element.item_id && ['image', 'price'].includes(element.type))
          .map(({ type, x, y, w, h, rotation }) => ({ type, x, y, w, h, rotation }))]));
      }
      return { changed: build(layout.adjustments), original: build({}) };
    }, { layout: saved, count: density + 2 });
    for (const target of ['sheet', 'card', 'scale']) {
      for (const type of ['image', 'price']) {
        const changed = geometries.changed[target].filter((entry) => entry.type === type);
        const original = geometries.original[target].filter((entry) => entry.type === type);
        expect(changed).toHaveLength(density + 2);
        const deltas = changed.map((entry, index) => ({
          dx: entry.x + entry.w / 2 - original[index].x - original[index].w / 2,
          dy: entry.y + entry.h / 2 - original[index].y - original[index].h / 2,
          scale: entry.w / original[index].w, rotation: entry.rotation - original[index].rotation,
        }));
        for (const delta of deltas) for (const key of ['dx', 'dy', 'scale', 'rotation']) {
          expect(delta[key]).toBeCloseTo(deltas[0][key], 5);
        }
        if (type === 'image') {
          expect(deltas[0].rotation).toBeGreaterThan(0);
          expect(deltas[0].scale).toBeLessThan(1);
          expect(deltas[0].dy).toBeGreaterThan(0);
        } else expect(deltas[0].dy).toBeGreaterThan(0);
      }
    }
    expect(geometries.changed.single).toEqual(geometries.original.single);
    await noOverflow(page, '#an-design-root');
    expect(state.errors).toEqual([]);
  });
}

test('TC-F33-02: alte Einzelanpassungen vereinheitlichen und von vier auf sechs Kacheln wechseln', async ({ page }) => {
  const state = await setup(page);
  const master = { dx: 4, dy: 3, scale: 1.05, rotation: 15 };
  state.design.drinks.adjustments = {
    'sheet:0:image:0': copy(master),
    'sheet:1:image:0': { dx: 100, dy: 70, scale: 1.8, rotation: 90 },
    'sheet:2:price:0': { dx: 80, dy: 0, scale: 1, rotation: 30 },
    'card:1:image:0': { dx: 60, dy: 0, scale: 1, rotation: 45 },
    'sheet:page:title:0': { dx: 2, dy: 0, scale: 1, rotation: 0 },
  };
  const original = copy(state.design);
  await cms(page);
  const host = page.locator('[data-design-preview]');
  await workspaceView(page.locator('[data-designer=drinks]'), 'split');
  await expect(host.locator('canvas')).toBeVisible();
  await expect(host.locator('[data-preview-select="sheet:0:image:0"]')).toHaveCSS('transform', /matrix/);
  expect(state.design).toEqual(original);
  await page.locator('#an-design-root').getByRole('radio', { name: /6 · kompakt/ }).check();
  await page.locator('[data-design-save]').click();
  await expect(page.locator('[data-design-status]')).toContainText('Designstandards gespeichert');
  for (let slot = 0; slot < 6; slot++) expect(state.design.drinks.adjustments[`sheet:${slot}:image:0`]).toEqual(master);
  expect(state.design.drinks.adjustments['sheet:2:price:0']).toBeUndefined();
  expect(state.design.drinks.adjustments['card:1:image:0']).toBeUndefined();
  expect(state.design.drinks.adjustments['sheet:page:title:0']).toEqual(original.drinks.adjustments['sheet:page:title:0']);
  expect(state.design.weekly).toEqual(original.weekly);
  await page.locator('#an-design-root').getByRole('radio', { name: /4 · großzügig/ }).check();
  await page.locator('[data-design-save]').click();
  await expect.poll(() => state.design.drinks.density).toBe(4);
  expect(state.design.drinks.adjustments['sheet:4:image:0']).toBeUndefined();
  expect(state.design.drinks.adjustments['sheet:5:image:0']).toBeUndefined();
  expect(state.errors).toEqual([]);
});

test('TC-F34-01: Preisbild auswählen, fünf Farben einstellen und Standards erneut laden', async ({ page }) => {
  const state = await setup(page);
  await cms(page);
  const root = page.locator('#an-design-root');
  const colors = {
    color: ['#ed1c24', '#1234aa'], price_background: ['#fff000', '#aaff22'],
    price_outline_color: ['#ffffff', '#ddccff'], old_price_color: ['#000000', '#112233'],
    price_strike_color: ['#ed1c24', '#ff44aa'],
  };
  await designerTool(root, 'tools');
  await root.locator('[data-object-properties=price]').click();
  const dialog = root.locator('dialog.an-object-dialog[open]');
  await dialog.locator('[data-style=price_preset]').selectOption('price-image');
  await expect(dialog.getByText('Stattpreis-Streifen', { exact: true })).toBeVisible();
  for (const [key, [initial, custom]] of Object.entries(colors)) {
    const control = dialog.locator('[data-style="' + key + '"]');
    await expect(control).toBeVisible();
    await expect(control).toHaveValue(initial);
    await control.fill(custom); await control.dispatchEvent('change');
  }
  await dialog.getByRole('button', { name: 'Übernehmen', exact: true }).click();
  await root.locator('[data-design-save]').click();
  await expect(root.locator('[data-design-status]')).toContainText('Designstandards gespeichert');
  expect(state.design.drinks.price_preset).toBe('price-image');
  for (const [key, [, custom]] of Object.entries(colors)) expect(state.design.drinks[key]).toBe(custom);
  await cms(page);
  await expect(root.locator('[data-style=price_preset]')).toHaveValue('price-image');
  for (const [key, [, custom]] of Object.entries(colors)) await expect(root.locator('[data-style="' + key + '"]')).toHaveValue(custom);
  await designerTool(root, 'tools');
  await workspaceView(page.locator('[data-designer=drinks]'), 'split');
  for (const mode of ['cards', 'scale-large', 'scale-small', 'paper']) {
    await root.locator('[data-design-mode="' + mode + '"]').click();
    await expect(root.locator('[data-design-preview] canvas')).toBeVisible();
    await expect(root.locator('[data-preview-element] option[value*=":0:old_price:"]')).toHaveCount(0);
  }
  await root.locator('[data-design-preview]').screenshot({ path: test.info().outputPath('preisbild-konfiguriert.png') });
  await noOverflow(page, '#an-design-root');
  expect(state.errors).toEqual([]);
});

test('TC-F35-01/02: zusätzliche Gestaltung und eigene Vorlagen bleiben gespeichert', async ({ page }) => {
  test.setTimeout(240000);
  const state = await setup(page);
  await cms(page);
  const root = page.locator('#an-design-root');
  await designerTool(root, 3);
  const options = { show_leaf: true, show_bag: true, show_texture: true, leaf_color: '#123456',
    leaf_size: 26, border_width: 4, border_color: '#112233', card_border_width: 3, card_border_color: '#223344',
    details_color: '#334455', footer_color: '#445566', vorrat_color: '#556677', background_gradient: true,
    background_color2: '#ddbb99', background_direction: 'to right', background_pct: 35, image_background: '#bbddff',
    image_gradient: true, image_color2: '#aabbcc', image_direction: '135deg', image_pct: 65,
    price_radius: 12, price_skew: 8, price_scale: 85, image_width_pct: 45, image_dx: 3, image_dy: 4, price_dx: -3, price_dy: 5 };
  for (const [key, value] of Object.entries(options)) {
    await setField(page, root, root.locator('[data-style="decoration.' + key + '"]'), value);
  }
  await setField(page, root, root.locator('[data-style=price_shape]'), 'ticket');
  await designerTool(root, 4);
  await openDetails(root.locator('.an-own-presets'));
  await root.locator('[data-preset-name]').fill('Sommer <img src=x>');
  await root.locator('[data-preset-add]').click();
  await root.locator('[data-design-save-standard]').click();
  await expect(root.locator('[data-design-status]')).toContainText('Designstandards gespeichert');
  expect(state.design.drinks.decoration).toEqual(options);
  expect(state.design.presets[0].name).toBe('Sommer <img src=x>');
  await cms(page);
  await designerTool(root, 4);
  await openDetails(root.locator('.an-own-presets'));
  await root.locator('[data-preset-select]').selectOption('0');
  await root.locator('[data-preset-load]').click();
  await expect(root.locator('[data-style=price_shape]')).toHaveValue('ticket');
  expect(await root.locator('[data-preview-element] option[value*=":1:"]').count()).toBe(0);
  await designerTool(root, 4);
  await root.locator('[data-preset-delete]').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect(root.locator('[data-preset-select] option')).toHaveCount(2);
  await root.locator('[data-preset-delete]').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Vorlage löschen', exact: true }).click();
  await expect(root.locator('[data-preset-select] option')).toHaveCount(1);
  await root.locator('[data-more-actions]').click();
  await root.locator('[data-design-discard]').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Änderungen verwerfen', exact: true }).click();
  await expect(root.locator('[data-preset-select] option')).toHaveCount(2);
  await designerTool(root, 4);
  await openDetails(root.locator('.an-own-presets'));
  await root.locator('[data-preset-select]').selectOption('0');
  await root.locator('[data-preset-delete]').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Vorlage löschen', exact: true }).click();
  await root.locator('[data-design-save]').click();
  await expect(root.locator('[data-design-status]')).toContainText('Designstandards gespeichert');
  await cms(page);
  await expect(root.locator('[data-preset-select] option')).toHaveCount(1);
  await noOverflow(page, '#an-design-root');
  expect(state.errors).toEqual([]);
});

test('TC-F35-01: neue Dekoration zeichnet sichtbar ohne sachfremde Positionsänderung', { tag: '@ohne-layout' }, async ({ page }) => {
  await setup(page); await cms(page);
  const result = await page.evaluate(async () => {
    const M = window.AngeboteModel;
    async function draw(decoration) {
      const data = M.blank('drinks');
      data.layout.price_background = '#eebb77';
      data.items.push(Object.assign(M.item(), { name: 'Test', price_cents: 1249, units: 20, volume_ml: 500, packaging: 'Mehrweg', deposit_cents: 310 }));
      if (decoration) data.layout.decoration = decoration;
      M.applyTemplate(data);
      const { canvas } = await M.render(data, 0, 1);
      const bytes = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let hash = 0; for (let i = 0; i < bytes.length; i++) hash = (hash * 31 + bytes[i]) >>> 0;
      return { hash, geometry: data.layout.pages[0].elements.map(({ type, x, y, w, h }) => ({ type, x, y, w, h })) };
    }
    const plain = await draw();
    const cases = [
      { show_leaf: true }, { show_bag: true }, { show_texture: true },
      { border_width: 6, border_color: '#ff00ff' }, { card_border_width: 5, card_border_color: '#ff00ff' },
      { details_color: '#ff00ff' }, { footer_color: '#ff00ff' }, { vorrat_color: '#ff00ff' },
      { background_gradient: true, background_color2: '#ff00ff', background_direction: 'to right', background_pct: 35 },
      { image_background: '#ff00ff' }, { image_gradient: true, image_color2: '#ff00ff' },
      { price_radius: 20, price_skew: 15 }, { price_scale: 70 }, { image_width_pct: 35, image_dy: 8 }
    ];
    const changed = [];
    for (const decoration of cases) changed.push({ decoration, ...(await draw(decoration)) });
    return { plain, changed };
  });
  for (const entry of result.changed) expect(entry.hash, JSON.stringify(entry.decoration)).not.toBe(result.plain.hash);
  expect(result.changed[0].geometry).toEqual(result.plain.geometry);
});

test('TC-F36-01/02: zentraler Homepage-Designer wirkt in Kundensitzung, Flyer bleiben erhalten', async ({ page }) => {
  const state = await setup(page);
  const action = await seed(page, state, { count: 2 });
  const imageId = uid(); state.images.set(imageId, PHOTO); action.draft.items[0].image_id = imageId;
  action.draft.items[1].price_cents = 12345678;
  action.draft.items[1].old_price_cents = 23456789;
  state.published.set(action.id, { id: action.id, data: copy(action.draft) });
  await cms(page);
  await designTab(page, 'cfg-hpang');
  await expect(page.locator('#hpang-preview .an-hp-card')).toHaveCount(3);
  await page.locator('#hpang-cardBg').fill('#eeddcc');
  await page.locator('#hpang-cardBg').dispatchEvent('input');
  await designerTool(page.locator('#cms-cfg-hpang'), 2);
  await page.locator('#hpang-imgSize').fill('110');
  await page.locator('#hpang-imgSize').dispatchEvent('input');
  await page.locator('[data-action=hpangSave]').click();
  await expect.poll(() => state.design.homepage?.cardBg).toBe('#eeddcc');
  expect(state.actions.get(action.id)).toEqual(action);
  const { grid, shell } = await customerView(page);
  await expect(grid.locator('.an-hp-card.an-product')).toHaveCount(action.draft.items.length);
  await expect(grid.locator('canvas')).toHaveCount(0);
  await expect(grid.locator('.an-product img')).toHaveCount(1);
  await expect.poll(() => grid.locator('.an-product img').evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(grid.locator('.an-product img')).toHaveCSS('filter', 'none');
  await expect(grid.locator('.an-hp-card').first()).toHaveCSS('background-color', 'rgb(238, 221, 204)');
  await expect(grid).toContainText('Pfand');
  await expect(grid).toContainText('1 l =');
  const font = await grid.locator('h3').last().evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
  expect(font).toBeLessThanOrEqual(14);
  const overflow = await grid.locator('.an-hp-card').evaluateAll((cards) => cards.some((card) => card.scrollWidth > card.clientWidth + 1));
  expect(overflow).toBe(false);
  const columns = await grid.locator('.an-group-body').first().evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length);
  expect(columns).toBeGreaterThanOrEqual(2);
  if (page.viewportSize().width === 375) {
    expect((await shell.locator('[data-offer-flyer]').boundingBox()).height).toBeGreaterThanOrEqual(44);
  }
  await noOverflow(page);
  await grid.screenshot({ path: test.info().outputPath('homepage-kompakt.png') });
  await shell.locator('[data-offer-flyer]').click();
  await expect(page.getByRole('dialog', { name: 'Original-Angebotsflyer' }).locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Flyer schließen' }).click();
  await expect(shell.locator('[data-offer-flyer]')).toBeFocused();
});

test('TC-F36-04: Homepage-Konfigurations- und Bildfehler sind erneut ladbar', async ({ page }) => {
  const state = await setup(page);
  const action = await seed(page, state, { publish: true });
  const id = uid();
  state.published.get(action.id).data.items[0].image_id = id;
  state.failHomepage = true;
  const { grid } = await customerView(page);
  await expect(grid.getByRole('alert')).toBeVisible();
  state.failHomepage = false;
  await grid.getByRole('button', { name: 'Erneut laden' }).click();
  await expect(grid.locator('.an-product')).toContainText('Bild nicht verfügbar');
  state.images.set(id, PHOTO);
  await grid.locator('.an-product').getByRole('button', { name: 'Erneut laden' }).click();
  await expect(grid.locator('.an-product img')).toHaveCount(1);
  await expect.poll(() => grid.locator('.an-product img').evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);
});

test('TC-F36-04: HP-Speicherkonflikt erhält Eingaben, Verwerfen und Reset schreiben nicht', { tag: '@ohne-layout' }, async ({ page }) => {
  const state = await setup(page);
  await cms(page); await designTab(page, 'cfg-hpang');
  await expect(page.locator('#hpang-preview .an-hp-card')).toHaveCount(1);
  await page.locator('#hpang-cardBg').fill('#112233');
  state.design.version++;
  await page.locator('[data-action=hpangSave]').click();
  await expect(page.getByRole('dialog')).toContainText('inzwischen geändert');
  await expect(page.locator('#hpang-cardBg')).toHaveValue('#112233');
  expect(state.design.homepage).toBeUndefined();
  await page.getByRole('dialog').getByRole('button', { name: 'Schließen', exact: true }).click();
  await page.locator('[data-designer=homepage] [data-more-actions]').click();
  await page.locator('[data-action=hpangRevert]').click();
  await expect(page.locator('#hpang-cardBg')).toHaveValue('#ffffff');
  await page.locator('[data-designer=homepage] [data-more-actions]').click();
  await page.locator('[data-action=hpangReset]').click();
  expect(state.log.filter((entry) => entry.method === 'PUT')).toHaveLength(1);
});

test('TC-F34-02: Preisbild rendert echte Beträge, Kontur und optionalen durchgestrichenen Stattpreis', { tag: '@ohne-layout' }, async ({ page }) => {
  const state = await setup(page);
  await cms(page);
  await expect(page.locator('[data-design-preview] canvas')).toBeVisible();
  const result = await page.evaluate(async () => {
    const M = window.AngeboteModel, proto = CanvasRenderingContext2D.prototype;
    const originals = { fillText: proto.fillText, strokeText: proto.strokeText, stroke: proto.stroke };
    let calls = [];
    proto.fillText = function (value, x, y, ...rest) {
      const box = this.measureText(value), matrix = this.getTransform();
      const top = matrix.transformPoint({ x: x - box.actualBoundingBoxLeft, y: y - box.actualBoundingBoxAscent });
      const bottom = matrix.transformPoint({ x: x + box.actualBoundingBoxRight, y: y + box.actualBoundingBoxDescent });
      calls.push({ kind: 'text', value, color: this.fillStyle, font: this.font, top: top.y, bottom: bottom.y, left: top.x, right: bottom.x });
      return originals.fillText.call(this, value, x, y, ...rest);
    };
    proto.strokeText = function (value, ...args) {
      calls.push({ kind: 'outline', value, color: this.strokeStyle });
      return originals.strokeText.call(this, value, ...args);
    };
    proto.stroke = function (...args) {
      calls.push({ kind: 'line', color: this.strokeStyle });
      return originals.stroke.call(this, ...args);
    };
    const output = [];
    try {
      for (const [price, old] of [[99, null], [299, 549], [1299, 1299], [1234567, 2345678], [299, 199]]) {
        const layout = M.blank('drinks').layout; M.useTemplate(layout, 'price-image');
        Object.assign(layout, { color: '#1234aa', price_background: '#aaff22', price_outline_color: '#ddccff',
          old_price_color: '#112233', price_strike_color: '#ff44aa' });
        const data = M.blank('drinks', layout); data.title = 'Test';
        for (let n = 0; n < 4; n++) data.items.push(Object.assign(M.item(), {
          name: 'Artikel', price_cents: price, old_price_cents: old,
          units: 20, volume_ml: 500, packaging: 'Mehrweg', deposit_cents: 310,
        }));
        M.applyTemplate(data);
        for (const target of ['sheet', 'card', 'single', 'scale']) {
          calls = [];
          const rendered = target === 'sheet' ? await M.render(data, 0, 1)
            : await M.renderTarget(data, target, data.items[0].id, 1);
          const elements = target === 'sheet' ? data.layout.pages[0].elements : data.layout.targets[target][0].elements;
          const priceFields = elements.filter((entry) => entry.type === 'price' && !entry.hidden);
          const ctx = rendered.canvas.getContext('2d'), pixels = ctx.getImageData(0, 0, rendered.canvas.width, rendered.canvas.height).data;
          let bandPixels = 0;
          for (let n = 0; n < pixels.length; n += 4) if (pixels[n] === 170 && pixels[n + 1] === 255 && pixels[n + 2] === 34) bandPixels++;
          output.push({ price, old, target, calls: [...calls], fields: priceFields,
            visibleOldFields: elements.filter((entry) => entry.type === 'old_price' && !entry.hidden).length,
            bandPixels, errors: rendered.errors });
        }
      }
    } finally { Object.assign(proto, originals); }
    return output;
  });
  for (const entry of result) {
    const count = entry.target === 'sheet' ? 4 : 1, euro = Math.floor(entry.price / 100) + '.', cents = String(entry.price % 100).padStart(2, '0');
    const main = entry.calls.filter((call) => call.kind === 'text' && call.value === euro && call.color === '#1234aa');
    const fraction = entry.calls.filter((call) => call.kind === 'text' && call.value === cents && call.color === '#1234aa');
    expect(main).toHaveLength(count); expect(fraction).toHaveLength(count);
    expect(entry.calls.filter((call) => call.kind === 'outline' && call.color === '#ddccff')).toHaveLength(count * 2);
    const comparison = entry.old > entry.price;
    expect(entry.calls.filter((call) => call.kind === 'text' && call.color === '#112233')).toHaveLength(comparison ? count : 0);
    expect(entry.calls.filter((call) => call.kind === 'line' && call.color === '#ff44aa')).toHaveLength(comparison ? count : 0);
    expect(entry.bandPixels > 0).toBe(comparison);
    expect(entry.visibleOldFields).toBe(0);
    for (let i = 0; i < count; i++) {
      expect(main[i].font).toContain('Anton');
      expect(fraction[i].font).toContain('Anton');
      expect(parseFloat(fraction[i].font.match(/[\d.]+px/)[0])).toBeLessThan(parseFloat(main[i].font.match(/[\d.]+px/)[0]));
      expect(fraction[i].bottom).toBeLessThan(main[i].bottom);
      for (const text of [main[i], fraction[i]]) {
        expect(text.left).toBeGreaterThanOrEqual(entry.fields[i].x - 1);
        expect(text.right).toBeLessThanOrEqual(entry.fields[i].x + entry.fields[i].w + 1);
        expect(text.top).toBeGreaterThanOrEqual(entry.fields[i].y - 1);
        expect(text.bottom).toBeLessThanOrEqual(entry.fields[i].y + entry.fields[i].h + 1);
      }
    }
    expect(entry.errors).toEqual([]);
  }
  expect(state.errors).toEqual([]);
});

test('TC-F16-02: Original-Wochenvorschau mit Bild-/Preis-Drehung, Skalierung und Touch-Verschieben', async ({ page }) => {
  const state = await setup(page), head = await editSeed(page, state, { kind: 'weekly' });
  await page.locator('[data-step=design]').first().click(); await templatePanel(page); await page.locator('#an-defaults').click();
  await page.getByRole('dialog').getByRole('button', { name: 'CMS-Vorlage übernehmen', exact: true }).click();
  await page.locator('[data-editor-panel-tab=element]').click();
  await workspaceView(page.locator('#an-root'), 'split');
  const host = page.locator('.an-weekly-surface'), tools = page.locator('#an-inspector .an-weekly-tools');
  const imageId = await tools.locator('option', { hasText: 'Produktbild' }).first().getAttribute('value');
  await tools.locator('select').first().selectOption(imageId);
  await tools.getByRole('button', { name: 'Vorschauelement nach rechts drehen', exact: true }).click();
  await tools.getByRole('button', { name: 'Vorschauelement vergrößern', exact: true }).click();
  const hit = host.locator('[data-preview-select="' + imageId + '"]'), box = await hit.boundingBox();
  await hit.dispatchEvent('pointerdown', { pointerId: 72, pointerType: 'touch', button: 0, clientX: box.x + 5, clientY: box.y + 5 });
  await page.dispatchEvent('body', 'pointermove', { pointerId: 72, pointerType: 'touch', clientX: box.x + 15, clientY: box.y + 12 });
  await page.dispatchEvent('body', 'pointerup', { pointerId: 72, pointerType: 'touch' });
  const priceId = await tools.locator('option', { hasText: /^Preis/ }).first().getAttribute('value');
  await tools.locator('select').first().selectOption(priceId);
  await tools.getByRole('button', { name: 'Vorschauelement nach rechts drehen', exact: true }).click();
  await tools.getByRole('button', { name: 'Vorschauelement vergrößern', exact: true }).click();
  const handle = host.locator('[data-preview-resize]'), handleBox = await handle.boundingBox();
  await handle.dispatchEvent('pointerdown', { pointerId: 73, pointerType: 'touch', button: 0, clientX: handleBox.x + 10, clientY: handleBox.y + 10 });
  await page.dispatchEvent('body', 'pointermove', { pointerId: 73, pointerType: 'touch', clientX: handleBox.x + 18, clientY: handleBox.y + 18 });
  await page.dispatchEvent('body', 'pointerup', { pointerId: 73, pointerType: 'touch' });
  await saveDraft(page);
  const overrides = Object.values(state.actions.get(head.id).draft.layout.cms.plakat_article_overrides)[0];
  expect(overrides.imgRot).toBe(-15); expect(overrides.imgScale).toBeCloseTo(110);
  expect(overrides.imgDx).toBeGreaterThan(0); expect(overrides.imgDy).toBeGreaterThan(0);
  expect(overrides.priceRot).toBe(15); expect(overrides.priceScale).toBeGreaterThan(110);
  await page.reload(); await page.locator('[data-open="' + head.id + '"]').click();
  await workspaceView(page.locator('#an-root'), 'split');
  await expect(page.locator('.an-weekly-surface canvas')).toBeVisible();
  await noOverflow(page);
  expect(state.errors).toEqual([]);
});

test('TC-F16-03: gemeinsamer Ersparnismarker erscheint auch nach später eingetragenem Stattpreis', async ({ page }) => {
  await setup(page);
  const output = await page.evaluate(async () => {
    const M = window.AngeboteModel, R = window.WochenangeboteRenderer, original = R.create, calls = [];
    R.create = function (env) {
      const renderer = original(env), draw = renderer.drawSavingsBurst;
      renderer.drawSavingsBurst = function (...args) { calls.push({ text: args[5], config: args[7] }); return draw(...args); };
      return renderer;
    };
    try {
      const data = M.blank('drinks'), it = M.item();
      Object.assign(it, { name: 'Getränk', price_cents: 1000, old_price_cents: null, units: 20, volume_ml: 500, packaging: 'Mehrweg', deposit_cents: 310 });
      data.items.push(it); M.applyTemplate(data);
      await M.render(data, 0, 1); const withoutSavings = calls.length;
      it.old_price_cents = 2000;
      data.layout.marker_type = 'heart'; data.layout.marker_palette = 'ocean-blue'; data.layout.marker_scale = 140;
      const first = (await M.render(data, 0, 1)).canvas.toDataURL();
      const after = calls.slice();
      data.layout.marker_type = 'flag';
      const second = (await M.render(data, 0, 1)).canvas.toDataURL();
      return { withoutSavings, after, differs: first !== second };
    } finally { R.create = original; }
  });
  expect(output.withoutSavings).toBe(0);
  expect(output.after).toHaveLength(1);
  expect(output.after[0]).toMatchObject({ text: '-50%', config: { savingsMarkerType: 'heart', savingsPalette: 'ocean-blue' } });
  expect(output.differs).toBe(true);
});

test('TC-F14-01/03: neue Wochenaktion übernimmt echte CMS-Einstellungen als unveränderlichen Snapshot', async ({ page }) => {
  const state = await setup(page);
  state.cmsDesign = {
    design_config: { plakatTemplate: 'classic-red', flyerTemplate: 'modern-mag-xl',
      plakat_decoBgColor: '#f0e2d3', flyer_decoTitleColor: '#0066aa',
      plakat_tagShape: 'ticket', priceFontFlyer: 62, plakat_showTexture: false, flyer_showTexture: false },
    plakat_article_overrides: { 'unser_testgetränk': { imgDx: 27, imgRot: 12 }, unrelated: { imgDx: 99 } },
    flyer_article_overrides: { 'unser_testgetränk': { priceDy: -18 } },
  };
  await page.getByRole('button', { name: '+ Wochenaktion anlegen' }).click();
  await page.getByRole('button', { name: '+ Aus Artikelstamm wählen' }).click();
  await page.getByRole('button', { name: /Unser Testgetränk/ }).click();
  await page.getByRole('button', { name: /Auswahl übernehmen/ }).click();
  await page.locator('#an-items').getByLabel('Angebotspreis €', { exact: true }).fill('9,99');
  await page.locator('#an-items').getByLabel('Angebotspreis €', { exact: true }).blur();
  await page.locator('[data-step=design]').first().click();
  await expect(page.locator('[data-cms-config=flyerTemplate]')).toHaveValue('modern-mag-xl');
  await expect(page.locator('[data-cms-config=plakat_tagShape]')).toHaveValue('ticket');
  await expect(page.locator('[data-cms-override=imgDx]')).toHaveValue('27');
  await expect(page.locator('#an-hit-layer button')).toHaveCount(0);
  await noOverflow(page);
  await saveDraft(page);
  const head = [...state.actions.values()][0], snapshot = copy(head.draft.layout.cms);
  expect(snapshot.config.plakat_decoBgColor).toBe('#f0e2d3');
  expect(snapshot.plakat_article_overrides.unrelated).toBeUndefined();
  expect(snapshot.flyer_article_overrides['unser_testgetränk'].priceDy).toBe(-18);
  state.cmsDesign.design_config.flyerTemplate = 'dark-modern';
  await page.reload(); await page.locator('[data-open="' + head.id + '"]').click();
  await page.locator('[data-step=design]').first().click();
  await expect(page.locator('[data-cms-config=flyerTemplate]')).toHaveValue('modern-mag-xl');
  expect(state.actions.get(head.id).draft.layout.cms).toEqual(snapshot);
  expect(state.errors).toEqual([]);
});

test('TC-F14-01..02: Wochenposter und Einzelflyer entsprechen pixelgenau den gemeinsamen Originalfunktionen', async ({ page }) => {
  const state = await setup(page), imageId = uid(); state.images.set(imageId, PHOTO);
  state.cmsDesign.design_config = { plakat_showTexture: false, flyer_showTexture: false };
  const result = await page.evaluate(async ({ imageId, templates }) => {
    const M = window.AngeboteModel, R = window.WochenangeboteRenderer, data = M.blank('weekly');
    for (let n = 0; n < 7; n++) Object.assign(data.items[data.items.push(M.item()) - 1], {
      name: 'Artikel ' + (n + 1), description: 'Regional 500 g', price_cents: 249,
      old_price_cents: 399, image_id: imageId,
    });
    await M.adoptWeekly(data);
    const logo = await M.image('logo'), photo = await M.image(imageId);
    const encode = (img) => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0); return c.toDataURL(); };
    const comparisons = [];
    for (const id of templates) {
      data.layout.cms.config.plakatTemplate = id; data.layout.cms.config.flyerTemplate = id;
      const cfg = data.layout.cms.config, renderer = R.create({
        cfgGet: () => cfg, logo: encode(logo), flyerArtOverrideGet: () => null, plakatArtOverrideGet: () => null,
      });
      const originals = data.items.slice(0, 6).map((it) => ({
        produkt: it.name, details: it.description, preis: 2.49, statt_preis: 3.99, bild_data: encode(photo),
      }));
      const action = { von: data.valid_from, bis: data.valid_to, items: originals };
      const poster = await new Promise((resolve) => renderer.drawAngebotPlakat(action, originals, originals.map(() => photo), resolve, cfg, { scale: 1, returnCanvas: true }));
      const single = await renderer.generateEinzelflyer(originals[0], action, cfg, { scale: 1 });
      const adapted = await M.render(data, 0, 1), adaptedSingle = await M.renderTarget(data, 'single', data.items[0].id, 1);
      comparisons.push({ id, poster: poster.toDataURL() === adapted.canvas.toDataURL(), single: single.toDataURL() === adaptedSingle.canvas.toDataURL(),
        cards: poster._offerCards.length, columns: [...new Set(poster._offerCards.map((rect) => rect.x))].length });
    }
    return { comparisons, pages: data.layout.pages.length, next: (await M.render(data, 1, 1)).canvas._offerCards.length };
  }, { imageId, templates: ORIGINAL_TEMPLATES });
  expect(result.pages).toBe(2); expect(result.next).toBe(1);
  for (const comparison of result.comparisons) expect(comparison, comparison.id).toMatchObject({ poster: true, single: true, cards: 6, columns: 2 });
  expect(state.errors).toEqual([]);
});

test('TC-F14-03: alte freie Wochenlayouts bleiben erhalten; Übernahme nur bestätigt, Ladefehler sichtbar', async ({ page }) => {
  const state = await setup(page), head = await editSeed(page, state, { kind: 'weekly' });
  await saveDraft(page); expect(state.actions.get(head.id).draft.layout.cms).toBeUndefined();
  await page.locator('[data-step=design]').first().click(); await templatePanel(page);
  await page.locator('#an-defaults').click();
  await page.getByRole('dialog').getByRole('button', { name: 'CMS-Vorlage übernehmen', exact: true }).click();
  await templatePanel(page);
  await expect(page.locator('.an-style-families:visible')).toBeVisible();
  await expect(page.locator('[data-cms-config=plakatTemplate]')).toHaveValue('classic-red');
  await saveDraft(page); expect(state.actions.get(head.id).draft.layout.cms.config.plakatTemplate).toBe('classic-red');
  await page.locator('#an-overview').click();
  state.failCmsDesign = true;
  await page.getByRole('button', { name: '+ Wochenaktion anlegen' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(state.actions.size).toBe(1);
});

test('TC-F14-04: Kioskmenü und ungespeicherter Angebotsentwurf bleiben beim Reiterwechsel erhalten', async ({ page }) => {
  const state = await setup(page);
  await page.addInitScript((hash) => sessionStorage.setItem('cms_auth_ok', hash), require('./_kiosk-angemeldet').PW_HASH);
  await page.goto(BASE + '/kiosk.html?bestand=1');
  await page.locator('.k-tab[data-tab=angebote]').click();
  await expect(page).toHaveURL(/kiosk\.html/);
  await expect(page.locator('#panel-angebote')).toBeVisible();
  await page.getByRole('button', { name: '+ Getränkeaktion anlegen' }).click();
  const meta = page.locator('#an-action-meta');
  if (!(await meta.evaluate((node) => node.open))) await page.locator('#an-action-meta>summary').click();
  await page.locator('#an-title').fill('Ungespeicherter Kioskentwurf'); await page.locator('#an-title').blur();
  await page.locator('.k-tab[data-tab=getraenke]').click();
  await expect(page.locator('#panel-angebote')).toBeHidden();
  await page.locator('.k-tab[data-tab=angebote]').click();
  await expect(page.locator('#an-title')).toHaveValue('Ungespeicherter Kioskentwurf');
  await expect(page.locator('.k-tab[data-tab=getraenke]')).toBeVisible();
  expect(await page.evaluate(() => window.KAngebote.hasUnsavedChanges())).toBe(true);
  await noOverflow(page);
  const clipped = await page.locator('#panel-angebote button').evaluateAll((buttons) => buttons.filter((button) => {
    const r = button.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && (r.left < -1 || r.right > innerWidth + 1);
  }).map((button) => button.textContent));
  expect(clipped, 'abgeschnittene Buttons').toEqual([]);
  await page.screenshot({ path: test.info().outputPath('angebote-im-kiosk.png') });
  expect(state.log.filter((r) => r.method !== 'GET' && r.path.startsWith('/api/angebote-'))).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('TC-F15-01..02: kompakte Übersicht mit Wochenfiltern und Direktaktionen ohne implizite Freigabe', async ({ page }) => {
  const state = await setup(page), current = await seed(page, state, { count: 2, publish: true, title: 'Aktuelle Aktion' });
  const next = await seed(page, state, { title: 'Nächste Aktion' });
  next.draft.valid_from = '2026-11-23'; next.draft.valid_to = '2026-11-29';
  current.draft.valid_to = '2026-11-22';
  await page.reload();
  await expect(page.locator('.an-overview')).toHaveCount(0);
  const row = page.locator('[data-action-id="' + current.id + '"]');
  for (const name of ['Bearbeiten', 'Vorschau', 'Teilen', 'Waage', 'Duplizieren', 'Aktion löschen']) await expect(row.getByRole('button', { name, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Diese Woche', exact: true }).click();
  await expect(row).toBeVisible(); await expect(page.locator('[data-action-id="' + next.id + '"]')).toBeHidden();
  await page.getByRole('button', { name: 'Nächste Woche', exact: true }).click(); await expect(row).toBeHidden();
  await page.getByRole('button', { name: 'Alle', exact: true }).click();
  await noOverflow(page);
  const height = await row.evaluate((el) => el.getBoundingClientRect().height);
  expect(height).toBeLessThan(page.viewportSize().width >= 1200 ? 85 : 215);
  await page.screenshot({ path: test.info().outputPath('kompakte-angebotsuebersicht.png') });
  await row.getByRole('button', { name: 'Vorschau', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Aktionsvorschau' }).locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Vorschau schließen' }).click();
  await row.getByRole('button', { name: 'Teilen', exact: true }).click();
  const shareDialog = page.getByRole('dialog', { name: 'Angebot teilen' });
  await expect(shareDialog).toBeVisible();
  const download = page.waitForEvent('download'); await shareDialog.getByRole('button', { name: 'Herunterladen', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('Angebot-1.png');
  await shareDialog.getByRole('button', { name: 'Schließen', exact: true }).click();
  await row.getByRole('button', { name: 'Aktion löschen', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Abbrechen', exact: true }).click();
  expect(state.actions.has(current.id)).toBe(true);
  await row.getByRole('button', { name: 'Aktion löschen', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Aktion löschen', exact: true }).click();
  await expect(row).toHaveCount(0); expect(state.published.has(current.id)).toBe(false);
  expect(state.log.filter((r) => r.params.action === 'publish')).toEqual([]);
  expect(state.errors).toEqual([]);
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
  await expect(customer.shell.locator('[data-offer-kind]')).toHaveCount(0);
  const card = customer.grid.locator('.an-product').first();
  await expect(card).toContainText('12,49 €');
  await expect(card.locator('.an-hp-price')).toBeVisible();
  await expect(card.locator('canvas')).toHaveCount(0);
  expect(state.published.get(head.id).data.layout.targets.card[0].elements.find((element) => element.id === cardName.id).x).toBe(130);
  expect(state.errors).toEqual([]);
});

test('TC-F11-legacy: veröffentlichte Aktionen ohne Ziellayout zeigen kompakte Homepage-Karten', async ({ page }) => {
  const state = await setup(page), head = await seed(page, state, { publish: true });
  delete head.draft.layout.targets;
  delete state.published.get(head.id).data.layout.targets;
  const { grid, shell } = await customerView(page);
  await expect(shell.locator('[data-offer-kind]')).toHaveCount(0);
  const card = grid.locator('.an-product').last();
  await expect(card.locator('.an-hp-price')).toBeVisible();
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

for (const paste of [false, true]) {
  test(`TC-F2-04/06: eigenes Produktbild aus ${paste ? 'Zwischenablage' : 'Datei'} in SharePoint und privater Vorschau`, async ({ page }) => {
    const state = await setup(page, { privateImages: true });
    const head = await editSeed(page, state);
    await page.locator('#an-root[aria-busy=false]').waitFor();
    await page.locator('[data-edit-item]').first().click();
    const dialog = page.locator('.an-item-dialog');
    await dialog.locator('.an-extra-fields > summary').click();
    await dialog.locator('[data-item-field=barcode]').fill('42043362');
    if (paste) {
      await dialog.locator('[data-image-paste]').click();
      await page.evaluate((base64) => {
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const clipboardData = new DataTransfer();
        clipboardData.items.add(new File([bytes], 'produkt.png', { type: 'image/png' }));
        document.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true }));
      }, PHOTO.toString('base64'));
    } else {
      await dialog.locator('input[type=file]').setInputFiles({ name: 'produkt.png', mimeType: 'image/png', buffer: PHOTO });
    }
    await dialog.locator('[data-item-save]').click();
    await expect(dialog).toHaveCount(0);
    const writes = state.log.filter((r) => r.path === '/api/werbebilder' && !r.read_only_lookup);
    expect(writes).toHaveLength(1);
    expect(writes[0].body).toMatchObject({ dl_artikelnummer: '42043362', dl_bild_base64: 'data:image/png;base64,' + PHOTO.toString('base64') });
    const thumb = page.locator('.an-item-thumb').first();
    await expect.poll(() => thumb.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
    await saveDraft(page);
    expect(state.actions.get(head.id).draft.items[0].image_id).toBeTruthy();
    await page.locator('[data-edit-item]').first().click();
    await expect.poll(() => page.locator('.an-image-preview img').evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
    expect(state.errors).toEqual([]);
  });
}

test('TC-F2-05: SharePoint-Fehler lässt Produktbilddialog mit Hinweis offen', async ({ page }) => {
  const state = await setup(page);
  await editSeed(page, state);
  await page.locator('#an-root[aria-busy=false]').waitFor();
  await page.locator('[data-edit-item]').first().click();
  const dialog = page.locator('.an-item-dialog');
  await dialog.locator('.an-extra-fields > summary').click();
  await dialog.locator('[data-item-field=barcode]').fill('42043362');
  await dialog.locator('input[type=file]').setInputFiles({ name: 'produkt.png', mimeType: 'image/png', buffer: PHOTO });
  state.failMasterUpload = true;
  const before = state.log.filter((r) => r.path === '/api/angebote-bilder' && r.method === 'POST').length;
  await dialog.locator('[data-item-save]').click();
  await expect(dialog.locator('[data-image-status]')).toContainText('nicht in StrichcodeBilder gespeichert');
  await expect(dialog).toBeVisible();
  expect(state.log.filter((r) => r.path === '/api/angebote-bilder' && r.method === 'POST')).toHaveLength(before);
  state.failMasterUpload = false;
  await dialog.locator('[data-item-save]').click();
  await expect(dialog).toHaveCount(0);
});

test('TC-F11-07: Liter in Liste und Dialog mit Komma eingeben, anzeigen und speichern', async ({ page }) => {
  const state = await setup(page), head = await editSeed(page, state, { publish: true });
  const published = copy(state.published.get(head.id));
  await expect(page.locator('#an-root')).toHaveAttribute('aria-busy', 'false');
  let row = page.locator('#an-items .an-item').first();
  await row.locator('.an-item-extra>summary').click();
  let volume = row.getByLabel('Liter je Einheit', { exact: true });
  await expect(volume).toHaveAttribute('inputmode', 'decimal');
  expect(await volume.evaluate((input) => input.type)).toBe('text');
  await expect(volume).toHaveValue('0,5');
  await volume.fill('0.75');
  await volume.blur();
  await expect(volume).toHaveValue('0,75');
  await expect(row.locator('[data-unit-price]')).toContainText('0,83 €/l');

  await row.locator('[data-edit-item]').click();
  let dialog = page.locator('dialog[open]');
  let dialogVolume = dialog.getByLabel('Liter je Einheit', { exact: true });
  await expect(dialogVolume).toHaveValue('0,75');
  await expect(dialogVolume).toHaveAttribute('inputmode', 'decimal');
  await dialogVolume.fill('0,1234');
  await dialogVolume.blur();
  await expect(dialogVolume).toHaveAttribute('aria-invalid', 'true');
  expect(await dialogVolume.evaluate((input) => input.validationMessage)).toContain('höchstens drei Nachkommastellen');
  await dialog.getByRole('button', { name: 'Übernehmen', exact: true }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-image-status]')).toContainText('höchstens drei Nachkommastellen');
  await dialogVolume.fill('0,029');
  await dialogVolume.blur();
  await expect(dialogVolume).toHaveAttribute('aria-invalid', 'false');
  await dialog.getByRole('button', { name: 'Übernehmen', exact: true }).click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  row = page.locator('#an-items .an-item').first();
  await row.locator('.an-item-extra>summary').click();
  volume = row.getByLabel('Liter je Einheit', { exact: true });
  await expect(volume).toHaveValue('0,029');
  await expect(row.locator('[data-unit-price]')).toContainText('21,53 €/l');
  await volume.fill('kein Inhalt');
  await volume.blur();
  await expect(volume).toHaveAttribute('aria-invalid', 'true');
  await volume.fill('0,029');
  await volume.blur();
  await expect(volume).toHaveAttribute('aria-invalid', 'false');
  await noOverflow(page);
  await saveDraft(page);
  expect(state.actions.get(head.id).draft.items[0].volume_ml).toBe(29);
  expect(state.published.get(head.id)).toEqual(published);

  await page.reload(); await page.locator('[data-open="' + head.id + '"]').click();
  await expect(page.locator('#an-root')).toHaveAttribute('aria-busy', 'false');
  row = page.locator('#an-items .an-item').first();
  await row.locator('.an-item-extra>summary').click();
  await expect(row.getByLabel('Liter je Einheit', { exact: true })).toHaveValue('0,029');
  await row.locator('[data-edit-item]').click();
  dialog = page.locator('dialog[open]');
  dialogVolume = dialog.getByLabel('Liter je Einheit', { exact: true });
  await expect(dialogVolume).toHaveValue('0,029');
  await dialogVolume.fill('1.5');
  await dialogVolume.blur();
  await expect(dialogVolume).toHaveValue('1,5');
  await dialog.getByRole('button', { name: 'Übernehmen', exact: true }).click();
  await saveDraft(page);
  expect(state.actions.get(head.id).draft.items[0].volume_ml).toBe(1500);
  expect(state.published.get(head.id)).toEqual(published);
  const values = await page.evaluate(() => {
    const M = window.AngeboteModel;
    return {
      parsed: ['0,5', '0.5', ' 0,029 ', '1,005', '0,000', '-0,5', '0,5.1', '0,1234', '1e3', ''].map(M.millilitres),
      formatted: [null, 29, 500, 1000, 1005, 1500].map(M.litres),
      pack: M.pack({ units: 20, volume_ml: 500, packaging: 'Mehrweg' }),
    };
  });
  expect(values.parsed).toEqual([500, 500, 29, 1005, null, null, null, null, null, null]);
  expect(values.formatted).toEqual(['', '0,029', '0,5', '1', '1,005', '1,5']);
  expect(values.pack).toBe('20 × 0,5 l · Mehrweg');
  expect(state.errors).toEqual([]);
});

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
      await page.locator('[data-more-actions]').click();
      await page.locator('#an-reload-saved').click();
      await expect(page.locator('#an-items img')).toHaveCount(1);
    }
    expect(state.actions.get(head.id).draft.items[0].image_id).toBeFalsy();
    expect(state.errors).toEqual([]);
  });
}

test('TC-F17-01/03: kompakte Artikelzeilen auf voller Breite und farbige Direktaktionen', async ({ page }) => {
  const state = await setup(page), head = await seed(page, state, { kind: 'weekly', count: 6 });
  await page.reload();
  const action = page.locator('[data-action-id="' + head.id + '"]');
  const colors = await action.locator('[data-preview-action],[data-share-action],[data-scale-action],[data-delete-action]').evaluateAll((buttons) =>
    buttons.map((button) => ({ bg: getComputedStyle(button).backgroundColor, fg: getComputedStyle(button).color })));
  expect(new Set(colors.map((value) => value.bg)).size).toBe(4);
  expect(colors.every((value) => value.fg !== value.bg)).toBe(true);
  await action.locator('[data-open]').click();
  const rows = page.locator('#an-items .an-item');
  await expect(rows).toHaveCount(6);
  const panel = await page.locator('.an-work-panel').boundingBox(), layout = await page.locator('.an-layout').boundingBox();
  expect(panel.width).toBeGreaterThanOrEqual(layout.width * .45);
  if (page.viewportSize().width >= 1101) {
    for (const height of await rows.evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height))) {
      expect(height).toBeLessThanOrEqual(220);
    }
    if (page.viewportSize().width >= 600 && page.viewportSize().width <= 1100) {
      for (const height of await rows.evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height))) {
        expect(height).toBeLessThanOrEqual(210);
      }
    }
  }
  for (const row of await rows.all()) {
    await expect(row.getByLabel('EAN / Strichcode', { exact: true })).toBeVisible();
  }
  await rows.first().getByLabel('EAN / Strichcode', { exact: true }).fill('4311500164160');
  await rows.first().getByLabel('EAN / Strichcode', { exact: true }).blur();
  await saveDraft(page);
  expect(state.actions.get(head.id).draft.items[0].barcode).toBe('4311500164160');
  await noOverflow(page);
  const clipped = await rows.locator('input:visible').evaluateAll((inputs) => inputs.filter((input) => {
    const r = input.getBoundingClientRect(), parent = input.closest('.an-item').getBoundingClientRect();
    return r.width && (r.left < parent.left || r.right > parent.right || r.height < 44 || r.width < 44);
  }).map((input) => input.dataset.prop));
  expect(clipped).toEqual([]);
  await page.locator('.an-work-panel').screenshot({ path: test.info().outputPath('kompakte-artikelzeilen.png') });
  await page.addInitScript((hash) => sessionStorage.setItem('cms_auth_ok', hash), require('./_kiosk-angemeldet').PW_HASH);
  await page.goto(BASE + '/kiosk.html?bestand=1');
  await page.locator('.k-tab[data-tab=angebote]').click();
  await page.locator('[data-open="' + head.id + '"]').click();
  await expect(page.locator('#an-items .an-item')).toHaveCount(6);
  const outside = await page.locator('#an-items .an-item-fields input').evaluateAll((inputs) => inputs.filter((input) => {
    const box = input.getBoundingClientRect(), row = input.closest('.an-item').getBoundingClientRect();
    return box.left < row.left || box.right > row.right || box.width < 44;
  }).map((input) => input.dataset.prop));
  expect(outside).toEqual([]);
  await noOverflow(page);
  expect(state.errors).toEqual([]);
});

test('TC-F17-02: Mehrfachauswahl behält Trefferknoten, Fokus und Auswahl über Suchen hinweg', async ({ page }) => {
  const state = await setup(page);
  state.catalog = Array.from({ length: 30 }, (_, index) => ({
    artikelnummer: 'ART' + index, strichcode: '40000000' + index,
    bezeichnung: 'Artikel ' + String(index).padStart(2, '0'), vk: 1.49, menge: '100 g',
  }));
  await page.getByRole('button', { name: '+ Getränkeaktion anlegen' }).click();
  await page.locator('#an-add-catalog').click();
  const dialog = page.getByRole('dialog'), search = dialog.getByLabel('Artikel suchen', { exact: true });
  const target = dialog.locator('[data-master-index="15"]');
  await target.scrollIntoViewIfNeeded();
  const scrollTop = await dialog.evaluate((node) => node.scrollTop);
  await target.evaluate((button) => { window.__selectedResult = button; });
  await target.click();
  await expect(target).toBeFocused();
  expect(await target.evaluate((button) => button === window.__selectedResult)).toBe(true);
  expect(await dialog.evaluate((node) => node.scrollTop)).toBe(scrollTop);
  await target.press('Space');
  await expect(target).toHaveAttribute('aria-pressed', 'false');
  await target.press('Space');
  await expect(target).toHaveAttribute('aria-pressed', 'true');
  await search.fill('Artikel 29');
  await dialog.locator('[data-master-index="29"]').click();
  await search.fill('Artikel 15');
  await expect(target).toHaveAttribute('aria-pressed', 'true');
  await expect(dialog.locator('#an-master-add')).toHaveText('Auswahl übernehmen (2)');
  await page.evaluate(() => {
    const original = window.AngeboteModel.applyTemplate;
    window.__batchLayouts = 0;
    window.AngeboteModel.applyTemplate = function (...args) {
      if (args[0].items.some((item) => item.article_number === 'ART15')) window.__batchLayouts++;
      return original(...args);
    };
  });
  await dialog.locator('#an-master-add').click();
  await expect(page.locator('#an-items .an-item')).toHaveCount(2);
  expect(await page.evaluate(() => window.__batchLayouts)).toBe(1);
  expect(state.actions.size).toBe(0);
  await saveDraft(page);
  expect([...state.actions.values()][0].draft.items.map((item) => item.article_number)).toEqual(['ART15', 'ART29']);
  expect(state.errors).toEqual([]);
});

test('TC-F11-04: direkt bearbeitbare Artikelliste bleibt lesbar ohne horizontalen Überlauf', async ({ page }) => {
  const state = await setup(page), head = await seed(page, state, { count: 4 });
  await page.reload();
  await page.locator('[data-open="' + head.id + '"]').click();
  await expect(page.locator('#an-items .an-item')).toHaveCount(4);
  await noOverflow(page);
  for (const rect of await page.locator('#an-items button[data-edit-item],#an-items .an-item-fields input').evaluateAll((buttons) =>
    buttons.map((button) => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })))) {
    expect(rect.width).toBeGreaterThanOrEqual(hit(page));
    expect(rect.height).toBeGreaterThanOrEqual(hit(page));
  }
  expect(state.errors).toEqual([]);
});

for (const target of ['card', 'single', 'sheet', 'scale']) {
  test(`TC-F11-08: ${target} direkt drehen, skalieren, Bilder einfügen und per Maus/Touch ändern`, async ({ page }, testInfo) => {
    const state = await setup(page), head = await seed(page, state, { count: 2, publish: true });
    const sourceId = uid();
    const image = await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 120; canvas.height = 80;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#2244aa'; ctx.fillRect(0, 0, 120, 80);
      ctx.fillStyle = '#cc3300'; ctx.fillRect(0, 0, 35, 40);
      return canvas.toDataURL('image/png').split(',')[1];
    });
    state.images.set(sourceId, Buffer.from(image, 'base64')); head.draft.items[0].image_id = sourceId;
    await page.reload(); await page.locator('[data-open="' + head.id + '"]').click();
    await expect(page.locator('#an-root')).toHaveAttribute('aria-busy', 'false');
    await stepTab(page, 'design');
    const published = copy(state.published.get(head.id));
    const before = copy(head.draft.layout);
    if (target !== 'card') await page.locator('[data-layout-target="' + target + '"]').click();
    const layouts = (layout) => target === 'sheet' ? layout.pages[0] : layout.targets[target][0];
    const original = layouts(before).elements.find((element) => element.type === 'image');
    const inspector = page.locator('#an-inspector');
    await expect(inspector).toBeVisible();
    await expect(page.locator('[data-step=design]').first()).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel('Gestaltungselement')).toHaveValue(original.id);
    await phoneView(page, 'picture');
    await expect(page.locator('[data-resize]')).toBeVisible();
    const pixels = hash(await page.locator('#an-stage-canvas').evaluate((canvas) => canvas.toDataURL()), 16);
    await phoneView(page, 'inputs');
    await page.getByRole('button', { name: 'Element 15 Grad nach rechts drehen', exact: true }).click();
    await expect.poll(async () => hash(await page.locator('#an-stage-canvas').evaluate((canvas) => canvas.toDataURL()), 16)).not.toBe(pixels);
    await page.getByRole('button', { name: 'Element vergrößern', exact: true }).click();
    await page.getByRole('button', { name: 'Element verkleinern', exact: true }).click();
    await page.getByRole('button', { name: 'Rückgängig', exact: true }).first().click();
    await phoneView(page, 'picture');
    await page.locator('[data-resize]').scrollIntoViewIfNeeded();
    const box = await page.locator('[data-resize]').boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(hit(page) - .01);
    expect(box.height).toBeGreaterThanOrEqual(hit(page) - .01);
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    const beforeDrag = await page.locator('#an-hit-layer .an-selected').evaluate((element) => parseFloat(element.style.width));
    if (testInfo.project.use.hasTouch) {
      const session = await page.context().newCDPSession(page);
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 12, y: y - 12 }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await session.detach();
    } else {
      await page.mouse.move(x, y); await page.mouse.down();
      await page.mouse.move(x - 12, y - 12, { steps: 4 }); await page.mouse.up();
    }
    await expect.poll(() => page.locator('#an-hit-layer .an-selected').evaluate((element) => parseFloat(element.style.width))).toBeLessThan(beforeDrag);
    await phoneView(page, 'inputs');
    await expect(page.locator('[data-step=design]').first()).toHaveAttribute('aria-pressed', 'true');
    let chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Bild ersetzen', exact: true }).click();
    await (await chooser).setFiles({ name: 'ersatz.png', mimeType: 'image/png', buffer: PHOTO });
    await expect(page.locator('#an-root')).toHaveAttribute('aria-busy', 'false');
    chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: '+ Eigenes Bild', exact: true }).click();
    await (await chooser).setFiles({ name: 'eigenes-bild.png', mimeType: 'image/png', buffer: PHOTO });
    await expect(page.locator('#an-root')).toHaveAttribute('aria-busy', 'false');
    const insertedId = await page.getByLabel('Gestaltungselement').inputValue();
    expect(insertedId).not.toBe(original.id);
    await inspector.getByRole('button', { name: 'Duplizieren', exact: true }).click();
    await openDetails(inspector.locator('.an-more-tools'));
    await inspector.getByRole('button', { name: 'Ghost', exact: true }).click();
    await saveDraft(page);
    const saved = state.actions.get(head.id).draft;
    const changed = layouts(saved.layout).elements.find((element) => element.id === original.id);
    expect(changed.rotation).toBe(15);
    expect(changed.w).toBeGreaterThanOrEqual(8);
    expect(changed.w / changed.h).toBeCloseTo(original.w / original.h, 8);
    expect(state.images.has(changed.image_id)).toBe(true);
    expect(layouts(saved.layout).elements.find((element) => element.id === insertedId).image_id).toMatch(/^[a-f0-9]{32}$/);
    expect(layouts(saved.layout).elements.some((element) => element.opacity === .35 && element.image_id)).toBe(true);
    expect(layouts(saved.layout).elements.length).toBe(layouts(before).elements.length + 3);
    for (const other of ['card', 'single', 'scale']) {
      if (other !== target) expect(saved.layout.targets[other]).toEqual(before.targets[other]);
      else expect(saved.layout.targets[other][1]).toEqual(before.targets[other][1]);
    }
    if (target !== 'sheet') expect(saved.layout.pages).toEqual(before.pages);
    expect(state.published.get(head.id)).toEqual(published);
    const renderErrors = await page.evaluate(async ({ data, target }) =>
      (target === 'sheet' ? await window.AngeboteModel.render(data, 0, 1)
        : await window.AngeboteModel.renderTarget(data, target, data.items[0].id, 1)).errors, { data: saved, target });
    expect(renderErrors).toEqual([]);
    await page.reload(); await page.locator('[data-open="' + head.id + '"]').click();
    await stepTab(page, 'design');
    if (target !== 'card') await page.locator('[data-layout-target="' + target + '"]').click();
    await page.getByLabel('Gestaltungselement').selectOption(original.id);
    await openDetails(page.locator('#an-inspector .an-more-tools'));
    await expect(page.getByLabel('Drehung', { exact: true })).toHaveValue('15');
    await expect(page.getByLabel('Breite', { exact: true })).toHaveValue(String(changed.w));
    await noOverflow(page);
    await phoneView(page, 'picture');
    await page.locator('#an-preview').screenshot({ path: test.info().outputPath('direkte-gestaltung-' + target + '.png') });
    expect(state.errors).toEqual([]);
  });
}

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
  await phoneView(page, 'picture');
  await page.locator('#an-stage').scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath('flyer-editor.png') });
  await phoneView(page, 'inputs');
  await templatePanel(page);
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
  await seed(page, state, { kind: 'weekly', publish: true, title: 'Neue Wochenaktion' });
  await seed(page, state, { kind: 'weekly', publish: false, title: 'Nicht freigegebener Entwurf', count: 3 });
  state.log.length = 0;
  const { grid, shell } = await customerView(page);
  await expect(grid.locator('.an-legacy')).toHaveCount(1);
  await expect(shell.locator('[data-offer-kind]')).toHaveCount(0);
  await expect(grid.locator('.an-product')).toHaveCount(9);
  const card = grid.locator('.an-product').first();
  await expect(card).toContainText('12,49 €');
  await expect(card).toContainText('20 × 0,5 l · Mehrweg');
  await expect(card).toContainText('zzgl. 3,10 € Pfand');
  await expect(card).toContainText('1 l = 1,25 €');
  const firstItem = state.published.get(head.id).data.items[0];
  const cardLayout = state.published.get(head.id).data.layout.targets.card.find((entry) => entry.item_id === firstItem.id);
  expect(cardLayout.elements.find((element) => element.type === 'price').font_size).toBeGreaterThanOrEqual(28);
  await expect(card.locator('canvas')).toHaveCount(0);
  await expect(card.locator('.an-hp-price')).toBeVisible();
  const lesbar = await grid.locator('.an-product').evaluateAll((cards) => cards.map((card) => ({
    breite: card.clientWidth,
    gitter: card.parentElement.clientWidth,
    abgeschnitten: [...card.querySelectorAll('.ang-name')].some((t) => t.scrollWidth > t.clientWidth + 1),
  })));
  expect(lesbar.length).toBeGreaterThan(0);
  for (const eintrag of lesbar) {
    expect(eintrag.breite).toBeGreaterThanOrEqual(100);
    expect(eintrag.breite).toBeLessThan(eintrag.gitter * .55);
    expect(eintrag.abgeschnitten).toBe(false);
  }
  await noOverflow(page);
  await page.screenshot({ path: test.info().outputPath('customer-cards.png') });
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
  expect(state.log.filter((r) => r.path === '/api/angebote-flyer' && r.method === 'GET' && !r.params.view)).toHaveLength(1);
  expect(state.log.filter((r) => r.path === '/api/angebote-flyer' && r.params.view === 'homepage')).toHaveLength(1);
  expect(state.log.filter((r) => r.method !== 'GET' && r.path !== '/api/track')).toEqual([]);
  expect(state.errors).toEqual([]);
});

for (const count of [1, 2]) {
  test(`TC-F29-01/02: Flyer in der Wochenleiste (${count} Aktionen)`, async ({ page }) => {
    const state = await setup(page);
    let selected;
    for (let n = 0; n < count; n++) {
      selected = await seed(page, state, { publish: true, title: 'Unsere Angebote ' + (n + 1) });
      state.published.get(selected.id).data.valid_to = '2026-11-21';
    }
    state.log.length = 0;
    const { grid, shell } = await customerView(page);
    const nav = shell.locator('.ang-week-nav'), controls = nav.locator('.an-customer-controls');
    const button = controls.getByRole('button', { name: 'Flyer ansehen', exact: true });
    await expect(button).toBeVisible();
    await expect(shell.locator('> .an-customer-controls')).toHaveCount(0);
    const boxes = await Promise.all([nav, button, grid].map((locator) => locator.boundingBox()));
    const [navBox, buttonBox, gridBox] = boxes;
    expect(buttonBox.height).toBeGreaterThanOrEqual(page.viewportSize().width <= 768 ? 44 : 32);
    expect(buttonBox.y + buttonBox.height).toBeLessThanOrEqual(navBox.y + navBox.height + 1);
    expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(navBox.x + navBox.width + 1);
    expect(gridBox.y - (navBox.y + navBox.height)).toBeLessThanOrEqual(2);
    if (page.viewportSize().width > 768) {
      const next = await nav.getByRole('button', { name: 'Nächste Woche', exact: true }).boundingBox();
      expect(buttonBox.x).toBeGreaterThan(next.x + next.width);
      expect(Math.abs(buttonBox.y - next.y)).toBeLessThanOrEqual(2);
    }
    await noOverflow(page, '.ang-week-nav:visible');
    await noOverflow(page);
    await expect(controls.locator('select')).toHaveCount(0);
    const groups = shell.locator('.an-group-hdr');
    const legacy = await shell.locator('.an-legacy').count();
    await expect(groups).toHaveCount(count + legacy);
    await expect(groups.first()).toHaveAttribute('aria-expanded', 'true');
    await groups.first().click();
    await expect(groups.first()).toHaveAttribute('aria-expanded', 'false');
    await expect(groups.first().locator('+ .an-group-body')).toBeHidden();
    await groups.first().click();
    await expect(groups.first()).toHaveAttribute('aria-expanded', 'true');
    await nav.screenshot({ path: test.info().outputPath('flyer-week-toolbar.png') });
    await button.locator('svg').click();
    const viewer = page.getByRole('dialog', { name: 'Original-Angebotsflyer', exact: true });
    if (count > 1) {
      await expect(viewer.locator('strong')).toContainText('· Flyer 1/2');
      await expect(viewer.locator('canvas')).toBeVisible();
      await viewer.locator('[data-viewer-next]').click();
      await expect(viewer.locator('strong')).toContainText('· Flyer 2/2');
      await expect(viewer.locator('[data-viewer-page-label]')).toContainText('1 /');
    } else {
      await expect(viewer.locator('strong')).toHaveText(selected.draft.title);
      await expect(viewer.locator('canvas')).toBeVisible();
    }
    await viewer.getByRole('button', { name: 'Flyer schließen', exact: true }).click();
    await expect(button).toBeFocused();
    await nav.getByRole('button', { name: 'Nächste Woche', exact: true }).click();
    await expect(button).toHaveCount(0);
    await expect(controls).toBeHidden();
    expect(await controls.evaluate((element) => element.getBoundingClientRect().height)).toBe(0);
    await nav.getByRole('button', { name: 'Diese Woche', exact: true }).click();
    await expect(button).toBeVisible();
    expect(state.log.filter((r) => r.method !== 'GET' && r.path !== '/api/track')).toEqual([]);
    expect(state.errors).toEqual([]);
  });
}

test('TC-F4-04/F5-02: Lesefehler statt leerer Ersatzdaten, erneutes Laden und leerer Zeitraum', async ({ page }) => {
  const state = await setup(page);
  state.failRead = true;
  const { grid, shell } = await customerView(page);
  await expect(grid.getByRole('alert')).toContainText('konnten nicht geladen werden');
  await expect(grid).not.toContainText('Aktuell keine');
  state.failRead = false;
  await grid.getByRole('button', { name: 'Erneut laden', exact: true }).click();
  await expect(grid.locator('.an-legacy')).toHaveCount(1);
  await expect(grid.getByRole('alert')).toHaveCount(0);
  await expect(shell.locator('[data-offer-kind]')).toHaveCount(0);
  await grid.evaluate((el) => window.AngeboteKunden.mount({ grid: el.id, week: 'next' }));
  await expect(grid).toContainText('Aktuell keine Angebote in diesem Zeitraum');
  await expect(shell.locator('[data-offer-flyer]')).toHaveCount(0);
  await grid.evaluate((el) => window.AngeboteKunden.mount({ grid: el.id, week: 'this' }));
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
  await page.locator('[data-cms-scale]').click();
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
  await page.locator('[data-cms-scale]').click();
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

test('TC-F30-01: Designstandards übernehmen wirkt auf alle Artikel des Handy-Ziels', async ({ page }) => {
  const state = await setup(page);
  state.design.drinks = await page.evaluate(() => {
    const M = window.AngeboteModel, layout = M.blank('drinks').layout;
    M.useTemplate(layout, 'modern-mag-fresh');
    M.updateAdjustment(layout, 'card:0:image:0', { dx: 30, dy: 20, scale: 1, rotation: 15 });
    return layout;
  });
  const head = await editSeed(page, state, { count: 2 }), before = copy(state.actions.get(head.id).draft.layout);
  await page.getByRole('button', { name: '2 · Frei gestalten' }).click(); await templatePanel(page);
  await page.locator('[data-layout-target=card]').click();
  await page.locator('#an-defaults').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Vorlage anwenden', exact: true }).click();
  await saveDraft(page);
  const draft = state.actions.get(head.id).draft, image = (entry) => entry.elements.find((e) => e.type === 'image');
  expect(draft.layout.targets.card.map((entry) => entry.background)).toEqual(['#e8f6f8', '#e8f6f8']);
  expect(draft.layout.targets.card.map((entry) => image(entry).w)).toEqual([372, 372]);
  expect(image(draft.layout.targets.card[0]).rotation).toBe(15);
  expect(image(draft.layout.targets.card[1]).rotation).toBe(0);
  expect(draft.layout.targets.single).toEqual(before.targets.single);
  expect(draft.layout.targets.scale).toEqual(before.targets.scale);
  expect(draft.layout.pages).toEqual(before.pages);
  state.published.set(head.id, { id: head.id, revision: uid(), data: copy(draft) });
  const { grid } = await customerView(page);
  await expect(grid.locator('.an-hp-card.an-product')).toHaveCount(2);
  const original = await page.evaluate(async (data) => {
    const canvas = (await window.AngeboteModel.renderTarget(data, 'card', data.items[0].id, 1)).canvas;
    return Array.from(canvas.getContext('2d').getImageData(2, 2, 1, 1).data);
  }, draft);
  expect(original).toEqual([232, 246, 248, 255]);
  expect(state.errors).toEqual([]);
});

test('Einzelflyer-Live-Vorschau lädt das Produktbild über die Artikelnummer und zeichnet es', async ({ page }) => {
  const state = await setup(page, { legacyArticleNumber: 'ART2001' });
  await page.addInitScript(() => {
    const drawImage = CanvasRenderingContext2D.prototype.drawImage;
    window.__previewProductImages = 0;
    CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
      if (image instanceof HTMLImageElement && image.src.startsWith('data:image/png;base64,'))
        window.__previewProductImages++;
      return drawImage.call(this, image, ...args);
    };
  });
  await cms(page);
  await designTab(page, 'sec-flyer');
  const root = page.locator('[data-designer=flyer]');
  await designerTool(root, 0);
  await chooseFamily(root, 'Magazin');
  await root.getByRole('combobox', { name: 'Magazin-Bildfläche', exact: true }).selectOption({ label: 'Großbild' });
  await expect(root.locator('#cfg-flyerTemplate')).toHaveValue('modern-mag-xl');
  await page.clock.runFor(1000);
  await workspaceView(page.locator('[data-designer=flyer]'), 'split');
  await expect(page.locator('#cfg-live-preview-flyer canvas')).toBeVisible();
  expect(state.log.some((entry) => entry.path === '/api/werbebilder'
    && entry.method === 'GET' && entry.params.artnrs === 'ART2001')).toBe(true);
  expect(await page.evaluate(() => window.__previewProductImages)).toBeGreaterThan(0);
  expect(state.errors).toEqual([]);
});

test('TC-F60-03: moderne Bereichsauswahl erhält alle Ziele, Fokus und volle Bezeichnungen', async ({ page }) => {
  const state = await setup(page);
  await cms(page);
  async function checkSaveContrast() {
    const save = page.locator('[data-design-save]:visible,#cfg-plakat-save:visible,[data-action=hpangSave]:visible');
    await expect(save).toBeVisible();
    expect(await save.evaluate((button) => {
      function luminance(color) {
        const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map((value) => {
          value /= 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
        });
        return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
      }
      const foreground = luminance(getComputedStyle(button).color);
      const background = luminance(getComputedStyle(button, '::before').backgroundColor);
      return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
    })).toBeGreaterThanOrEqual(4.5);
  }
  await checkSaveContrast();
  const trigger = page.locator('.an-design-location-btn'), popup = page.locator('.an-design-locations');
  await trigger.click();
  await expect(popup).toBeVisible();
  const entries = await popup.locator('[role=option]').evaluateAll((buttons) =>
    buttons.map((button) => ({ key: button.dataset.value, title: button.querySelector('.an-loc-name').textContent })));
  expect(entries.length).toBeGreaterThanOrEqual(6);
  const geometry = await popup.evaluate((node) => {
    const r = node.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, overflow: node.scrollWidth > node.clientWidth,
      targets: [...node.querySelectorAll('[role=option]')].map((button) => {
        const label = button.querySelector('.an-loc-name'), box = button.getBoundingClientRect();
        return { height: box.height, clipped: label.scrollWidth > label.clientWidth + 1 || label.scrollHeight > label.clientHeight + 1,
          glyph: getComputedStyle(button.querySelector('.an-loc-glyph')).backgroundColor };
      }) };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(page.viewportSize().width);
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.bottom).toBeLessThanOrEqual(page.viewportSize().height);
  expect(geometry.overflow).toBe(false);
  expect(geometry.targets.every((target) => target.height >= 44 && !target.clipped)).toBe(true);
  expect(new Set(geometry.targets.map((target) => target.glyph)).size).toBeGreaterThanOrEqual(4);
  expect(await popup.locator('[aria-selected=true]').evaluate((node) => {
    const style = getComputedStyle(node), inactive = getComputedStyle(node.parentElement.querySelector('[aria-selected=false]'));
    return style.backgroundColor !== inactive.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)'
      && getComputedStyle(node, '::before').width === '3px';
  })).toBe(true);
  await page.screenshot({ path: test.info().outputPath('designbereich-auswahl.png') });
  await popup.press('Home');
  await expect(popup.locator('[role=option]').first()).toBeFocused();
  await page.keyboard.press('End');
  await expect(popup.locator('[role=option]').last()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(popup.locator('[role=option]').first()).toBeFocused();
  await popup.getByRole('button', { name: 'Bereichsauswahl schließen' }).click();
  await expect(trigger).toBeFocused();
  for (const entry of entries) {
    await trigger.click();
    await popup.locator('[data-value="' + entry.key + '"]').click();
    await expect(trigger.locator('[data-location-label]')).toHaveText('Vorgabe: ' + entry.title);
    if (entry.key.startsWith('cfg-plakat/') || entry.key === 'cfg-hpang') await checkSaveContrast();
    await trigger.click();
    await expect(popup.locator('[data-value="' + entry.key + '"]')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Escape');
    await expect(popup).not.toBeVisible();
  }
  await noOverflow(page);
  expect(state.log.filter((entry) => entry.method !== 'GET' && !entry.read_only_lookup)).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('TC-F60-01: Objekteigenschaften restaurieren Feldbesitz und direkte Bildregler', async ({ page }) => {
  const state = await setup(page);
  await cms(page);
  await designTab(page, 'sec-plakat');
  const root = page.locator('[data-designer=plakat]');
  await designerTool(root, 'tools');
  const before = await root.locator('input[id],select[id]').evaluateAll((controls) =>
    controls.map((control) => ({ id: control.id, parent: control.closest('label')?.parentElement.className,
      hidden: control.closest('label')?.hidden })).sort((a, b) => a.id.localeCompare(b.id)));
  for (const close of ['Abbrechen', 'Übernehmen', 'Escape']) {
    await root.locator('[data-object-properties=price]').click();
    const dialog = page.locator('.an-object-dialog');
    await expect(dialog.locator('input,select').first()).toBeVisible();
    if (close === 'Escape') await dialog.press('Escape');
    else await dialog.getByRole('button', { name: close, exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(await root.locator('input[id],select[id]').evaluateAll((controls) =>
      controls.map((control) => ({ id: control.id, parent: control.closest('label')?.parentElement.className,
        hidden: control.closest('label')?.hidden })).sort((a, b) => a.id.localeCompare(b.id)))).toEqual(before);
  }
  const direct = await page.evaluate(() => {
    const host = document.createElement('section');
    host.innerHTML = '<div id="an-style-controls"><h3 class="an-settings-heading">Preisschild</h3>'
      + '<fieldset><label>Preisfarbe<input data-style="color" value="#123456"></label>'
      + '<label>Preisgröße<input data-style="price_size" value="50"></label></fieldset>'
      + '<h3 class="an-settings-heading">Bild</h3><label>Bildgröße<input data-style="image_scale" value="100"></label></div>';
    document.body.appendChild(host);
    window.AngeboteDesign.objectProperties(host, {});
    const result = { hidden: host.querySelector('[data-style=image_scale]').closest('label').hidden,
      buttonHidden: host.querySelector('[data-object-properties=image]').hidden,
      emptyPriceHidden: host.querySelector('fieldset').hidden,
      emptyHeadingHidden: host.querySelector('.an-settings-heading').hidden,
      priceReachable: !host.querySelector('[data-object-properties=price]').hidden };
    host.remove(); return result;
  });
  expect(direct).toEqual({ hidden: false, buttonHidden: true,
    emptyPriceHidden: true, emptyHeadingHidden: true, priceReachable: true });
  expect(state.errors).toEqual([]);
});

test('TC-F60-02: Preisschilddialog gliedert echte Felder und erhält Transaktionen', async ({ page }) => {
  const state = await setup(page);
  await cms(page); await designTab(page, 'sec-plakat');
  const root = page.locator('[data-designer=plakat]');
  await designerTool(root, 'tools');
  const ids = await root.locator('[data-object-field=price] input,[data-object-field=price] select')
    .evaluateAll((controls) => controls.map((control) => control.id).sort());
  await root.locator('[data-object-properties=price]').click();
  const dialog = root.getByRole('dialog', { name: 'Preisschild einstellen', exact: true });
  await expect(dialog.locator('.an-price-section>h3')).toHaveText(['Vorlage & Form', 'Farben', 'Größe & Ausrichtung']);
  expect(await dialog.locator('input,select').evaluateAll((controls) => controls.map((control) => control.id).sort())).toEqual(ids);
  await expect(dialog.locator('[data-price-section=base] #cfg-plakat-tagShape')).toBeVisible();
  const color = dialog.locator('#cfg-plakat-priceImageColor'), original = await color.inputValue();
  await expect(color.locator('..').locator('.an-object-color-value')).toHaveText(original.toUpperCase());
  await color.fill('#112233'); await color.dispatchEvent('change'); await page.clock.runFor(500);
  await expect(color.locator('..').locator('.an-object-color-value')).toHaveText('#112233');
  await expect(dialog.locator('[data-price-colors=old] #cfg-plakat-priceOldColor')).toBeVisible();
  await expect(dialog.locator('[data-price-section=size] #cfg-plakat-tagScale')).toBeVisible();
  await expect(dialog.locator('canvas')).toBeVisible();
  expect(await dialog.locator('canvas').evaluate((canvas) => canvas.width)).toBeGreaterThan(1);
  await dialog.locator('.an-object-body').evaluate((body) => { body.scrollTop = 0; });
  const geometry = await dialog.evaluate((node) => {
    const body = node.querySelector('.an-object-body'), footer = node.querySelector('footer');
    return { width: node.getBoundingClientRect().width, viewport: innerWidth,
      overflow: body.scrollWidth - body.clientWidth, bottom: footer.getBoundingClientRect().bottom, height: innerHeight };
  });
  expect(geometry.width).toBeLessThan(geometry.viewport);
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.height);
  await page.screenshot({ path: test.info().outputPath('preisschild-strukturiert.png') });
  const originalViewport = page.viewportSize();
  if (originalViewport.width === 375 || await page.evaluate(() => matchMedia('(any-pointer:coarse)').matches)) {
    for (const [width, height] of [[320, 568], [360, 640], [390, 844], [686, 432]]) {
      await page.setViewportSize({ width, height }); await page.clock.runFor(200);
      expect(await dialog.locator('.an-object-body').evaluate((body) => body.scrollWidth - body.clientWidth)).toBeLessThanOrEqual(1);
      const footer = await dialog.locator('footer').boundingBox();
      expect(footer.y + footer.height).toBeLessThanOrEqual(height);
      const minimum = await page.evaluate(() => matchMedia('(any-pointer:coarse),(max-width:599px)').matches ? 44 : 32);
      expect((await dialog.getByRole('button', { name: 'Übernehmen', exact: true }).boundingBox()).height).toBeGreaterThanOrEqual(minimum);
    }
    await page.setViewportSize(originalViewport);
  }
  await dialog.getByRole('button', { name: 'Übernehmen', exact: true }).click();
  await root.locator('[data-design-history=undo]').click(); await page.clock.runFor(500);
  await expect(root.locator('#cfg-plakat-priceImageColor')).toHaveValue(original);
  await root.locator('[data-design-history=redo]').click(); await page.clock.runFor(500);
  await expect(root.locator('#cfg-plakat-priceImageColor')).toHaveValue('#112233');
  await root.locator('[data-object-properties=price]').click();
  await dialog.locator('#cfg-plakat-priceImageColor').fill('#556677');
  await page.keyboard.press('Escape'); await page.clock.runFor(500);
  await expect(root.locator('#cfg-plakat-priceImageColor')).toHaveValue('#112233');
  await expect(root.locator('.an-object-color-value')).toHaveCount(0);
  expect(state.log.filter((entry) => entry.method !== 'GET' && !entry.read_only_lookup)).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('TC-F64-02: Originalrenderer erhält lange Wörter und explizite Textzeilen', { tag: '@ohne-layout' }, async ({ page }) => {
  const state = await setup(page);
  const result = await page.evaluate(async () => {
    const R = window.WochenangeboteRenderer, config = structuredClone(R.CFG_DEFAULTS);
    config.flyerTemplate = 'minimal-clean'; config.flyer_showTexture = false;
    const logo = document.createElement('canvas'); logo.width = 2; logo.height = 1;
    const renderer = R.create({ cfgGet: () => config, logo: logo.toDataURL(),
      flyerArtOverrideGet: () => null, plakatArtOverrideGet: () => null });
    const item = { key: 'lange-bezeichnung', produkt: 'Bio-Dinkelvollkornknuspermüsli-Beerenfamilienvorratspackung',
      details: 'Mehrwegflaschen im wiederverwendbaren Getränkekasten\nPfand wird gesondert berechnet',
      preis: 2.49, statt_preis: 3.29, bild_data: '' };
    const probe = document.createElement('canvas').getContext('2d'); probe.font = '20px Arial';
    const lines = renderer.wrapTextCMS(probe, item.produkt, 120);
    const calls = [], original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
      calls.push({ canvas: this.canvas, text, width: this.measureText(text).width });
      return original.call(this, text, ...args);
    };
    let canvas;
    try {
      canvas = await renderer.generateEinzelflyer(item, { von: '2026-03-16', bis: '2026-03-22' }, config, { scale: 1 });
    } finally { CanvasRenderingContext2D.prototype.fillText = original; }
    const text = calls.filter((entry) => entry.canvas === canvas && entry.text);
    return { source: item.produkt, lines, widths: lines.map((line) => probe.measureText(line).width),
      paragraphs: renderer.wrapTextCMS(probe, 'Zeile eins\nZeile zwei', 1000),
      product: text.filter((entry) => item.produkt.includes(entry.text)).map(({ text, width }) => ({ text, width })),
      details: text.filter((entry) => item.details.includes(entry.text)).map(({ text, width }) => ({ text, width })),
      detailSource: item.details, box: canvas._elMeta.find((entry) => entry.ovKey === 'name').w };
  });
  expect(result.lines.join('')).toBe(result.source);
  expect(result.widths.every((width) => width <= 120)).toBe(true);
  expect(result.paragraphs).toEqual(['Zeile eins', 'Zeile zwei']);
  expect(result.product.map((entry) => entry.text).join('')).toBe(result.source);
  expect(result.product.every((entry) => entry.width <= result.box)).toBe(true);
  expect(result.details.map((entry) => entry.text).join(' ').replace(/\s+/g, ' ')).toBe(result.detailSource.replace(/\s+/g, ' '));
  expect(result.details.every((entry) => entry.width <= result.box)).toBe(true);
  expect(state.errors).toEqual([]);
});

test('TC-F61-02: Aktionspaletten färben alle freien Bestandsvorlagen ohne Geometrie-Neuaufbau', { tag: '@ohne-layout' }, async ({ page }) => {
  const state = await setup(page);
  const result = await page.evaluate(async () => {
    const M = window.AngeboteModel, rows = [];
    const geometry = layout => JSON.stringify([layout.pages, layout.targets], (key, value) => ['fill', 'background'].includes(key) ? undefined : value);
    for (const [id] of M.templateOptions) {
      const source = M.blank('drinks'), item = M.item(); Object.assign(item, { name: 'Apfelsaft', price_cents: 249 });
      source.items.push(item); M.useTemplate(source.layout, id); M.applyTemplate(source);
      const image = source.layout.targets.card[0].elements.find(element => element.type === 'image');
      Object.assign(image, { x: 77, rotation: 13, image_scale: 1.17 });
      const hashes = [], before = geometry(source.layout), foreign = JSON.stringify(source.layout.targets.single);
      for (const palette of M.palettes) {
        const data = M.clone(source);
        M.applyPaletteColors(data, 'card', M.paletteColors(palette));
        if (geometry(data.layout) !== before || JSON.stringify(data.layout.targets.single) !== foreign) throw Error('Geometrie verändert: ' + id + '/' + palette.id);
        const { canvas } = await M.renderTarget(data, 'card', item.id, .3);
        const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        let hash = 2166136261;
        for (const byte of pixels) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
        hashes.push(hash);
      }
      rows.push({ id, distinct: new Set(hashes).size, palettes: M.palettes.length });
    }
    return rows;
  });
  expect(result).toHaveLength(17);
  for (const row of result) expect(row.distinct, row.id).toBe(row.palettes);
  expect(state.errors).toEqual([]);
});

test('TC-F64-02: extreme Originaltexte melden eine echte Qualitätsgrenze statt stiller Überdeckung', { tag: '@ohne-layout' }, async ({ page }) => {
  const state = await setup(page);
  const result = await page.evaluate(async templates => {
    const M = window.AngeboteModel, source = M.blank('weekly');
    const item = M.item(); Object.assign(item, { name: 'Apfelsaft', description: '1 Liter Mehrweg', price_cents: 249, old_price_cents: 329 });
    source.items.push(item); await M.adoptWeekly(source); M.applyTemplate(source);
    const reports = [];
    for (const id of templates) {
      const data = M.clone(source);
      data.layout.cms.config.plakatTemplate = id; data.layout.cms.config.flyerTemplate = id;
      data.layout.cms.config.plakat_showTexture = false; data.layout.cms.config.flyer_showTexture = false;
      const normal = await M.quality(data);
      data.items[0].name = 'Donaudampfschifffahrtsgesellschaftsgetränkevorratspackung '.repeat(24);
      data.items[0].description = 'Mehrwegflaschen im wiederverwendbaren Getränkekasten, Pfand gesondert berechnet. '.repeat(12);
      const extreme = await M.quality(data);
      reports.push({ id, normal: normal.errors, extreme: extreme.errors });
    }
    return reports;
  }, ORIGINAL_TEMPLATES);
  for (const report of result) {
    expect(report.normal, report.id).toEqual([]);
    expect(report.extreme.some(issue => issue.code === 'outside' || issue.code === 'text-overlap'), report.id).toBe(true);
    expect(report.extreme.every(issue => issue.message && issue.target)).toBe(true);
  }
  expect(state.errors).toEqual([]);
});

test('TC-F64-01: zielbezogene Markerform und Farbwelt erreichen den echten Konfigurationspfad', async ({ page }) => {
  const state = await setup(page);
  await page.route('**/api/cms-config', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      if (body.name === 'design_config') state.cmsDesign.design_config = copy(body.wert);
    }
    await route.fallback();
  });
  await cms(page);
  await designTab(page, 'sec-plakat');
  const root = page.locator('[data-designer=plakat]');
  await workspaceView(root, 'split');
  await root.locator('#cfg-plakat-showTexture').evaluate((control) => {
    control.checked = false;
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const hash = () => root.locator('.an-designer-preview canvas:visible').first().evaluate((canvas) => {
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let hash = 2166136261;
    for (const byte of data) hash = Math.imul(hash ^ byte, 16777619);
    return hash;
  });
  await page.clock.runFor(1000);
  await expect.poll(hash).not.toBe('');
  const before = await hash();
  await designerTool(root, 3);
  const set = async (id, value) => root.locator(id).evaluate((control, value) => {
    control.value = value;
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await set('#cfg-plakat-savingsMarkerType', 'heart');
  await expect.poll(hash).not.toBe(before);
  const heart = await hash();
  await set('#cfg-plakat-savingsPalette', 'midnight-gold');
  await expect.poll(hash).not.toBe(heart);
  const save = async () => {
    const request = page.waitForRequest((request) => new URL(request.url()).pathname === '/api/cms-config'
      && request.method() === 'POST' && request.postDataJSON().name === 'design_config');
    await root.locator('[data-action=savePlakatCfg]').evaluate((button) => button.click());
    return (await request).postDataJSON().wert;
  };
  const config = await save();
  expect(config.plakat_savingsMarkerType).toBe('heart');
  expect(config.plakat_savingsPalette).toBe('midnight-gold');
  expect(config.flyer_savingsMarkerType).toBe('');
  expect(config.savingsMarkerType).toBe('starburst');
  expect(await page.evaluate(async () => {
    const model = window.AngeboteModel, data = model.blank('weekly');
    await model.adoptWeekly(data);
    const config = data.layout.cms.config;
    return [config.plakat_savingsMarkerType, config.plakat_savingsPalette, config.flyer_savingsMarkerType, config.savingsMarkerType];
  })).toEqual(['heart', 'midnight-gold', '', 'starburst']);
  await set('#cfg-plakat-savingsMarkerType', '');
  await set('#cfg-plakat-savingsPalette', '');
  const inherited = await save();
  expect(await page.evaluate((config) => {
    const effective = window.WochenangeboteRenderer.create({}).cfgForKind(config, 'plakat');
    return [effective.savingsMarkerType, effective.savingsPalette];
  }, inherited)).toEqual(['starburst', 'harmonie']);
  await page.clock.runFor(1000);
  const inheritedPixels = await hash();
  await set('#cfg-plakat-savingsMarkerType', 'starburst');
  await set('#cfg-plakat-savingsPalette', 'harmonie');
  await page.clock.runFor(1000);
  expect(await hash()).toBe(inheritedPixels);
  await page.reload();
  await designTab(page, 'sec-plakat');
  await expect(root.locator('#cfg-plakat-savingsMarkerType')).toHaveValue('');
  await expect(root.locator('#cfg-plakat-savingsPalette')).toHaveValue('');
  expect(state.errors).toEqual([]);
});

test('TC-F55a: Preisschild-Dialog zeigt kompakte, gestapelte Felder ohne Riesenflächen', async ({ page }) => {
  test.setTimeout(180000);
  const state = await setup(page);
  await seed(page, state, { count: 8, publish: true });
  await cms(page);
  await designTab(page, 'sec-plakat');
  const root = page.locator('[data-designer=plakat]');
  await designerTool(root, 'tools');
  const button = root.locator('[data-object-properties="price"]');
  await expect(button).toBeVisible();
  await button.click();
  const dialog = page.locator('.an-object-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.an-object-grid label')).not.toHaveCount(0);
  // Regression: Ohne Fix waren Slider-Zellen 258 px hoch (Labelbasis 190 px wurde
  // zur Hoehe) und der Dialogkörper 717 px. Kompakt heißt: Zelle < 120 px, kein
  // horizontaler Überlauf, Bedienelemente sichtbar.
  const geometry = await dialog.evaluate((dialog) => {
    const cells = Array.from(dialog.querySelectorAll('.an-object-grid > label'));
    const body = dialog.querySelector('.an-object-body');
    return {
      cells: cells.length,
      maxCellHeight: Math.max(...cells.map((cell) => cell.getBoundingClientRect().height)),
      bodyScroll: body.scrollHeight, bodyClient: body.clientHeight,
      overflowX: body.scrollWidth > body.clientWidth + 1,
      visibleControls: cells.filter((cell) => {
        const control = cell.querySelector('input,select');
        return control && control.getBoundingClientRect().height > 0;
      }).length,
    };
  });
  expect(geometry.maxCellHeight).toBeLessThan(120);
  expect(geometry.overflowX).toBe(false);
  expect(geometry.visibleControls).toBe(geometry.cells);
  expect(state.errors).toEqual([]);
});

test('TC-F57-02: Ersparnis-Marker und Stattpreis sind eigene, getrennt verschiebbare Vorschau-Elemente', async ({ page }) => {
  test.setTimeout(180000);
  const state = await setup(page);
  await seed(page, state, { count: 8, publish: true });
  await cms(page);
  await designTab(page, 'sec-plakat');
  const root = page.locator('[data-designer=plakat]');
  await expect(root).toBeVisible();
  await workspaceView(root, 'split');
  await designerTool(root, 'tools');
  const select = root.locator('[data-preview-element]');
  await expect(select).toBeVisible({ timeout: 15000 });
  await expect(select.locator('option[value=discount]')).toHaveCount(1);
  await expect(select.locator('option[value=old_price]')).toHaveCount(1);
  const hash = () => page.locator('.an-designer-preview canvas:visible').first().evaluate((c) => { const d = c.toDataURL(); let h = 0; for (let i = 0; i < d.length; i += 13) h = (h * 31 + d.charCodeAt(i)) | 0; return d.length + ':' + h; });
  await expect.poll(hash, { timeout: 20000 }).not.toMatch(/^0:/);
  // Marker verschieben → Vorschau regeneriert sofort mit neuem Offset
  await select.selectOption('discount');
  const beforeMarker = await hash();
  const nudge = root.locator('[data-preview-nudge="2,0"]');
  for (let i = 0; i < 12; i++) await nudge.click();
  await expect.poll(hash, { timeout: 15000 }).not.toBe(beforeMarker);
  // Stattpreis verschieben → ebenfalls sofort
  await select.selectOption('old_price');
  const beforeOld = await hash();
  const nudgeDown = root.locator('[data-preview-nudge="0,2"]');
  for (let i = 0; i < 12; i++) await nudgeDown.click();
  await expect.poll(hash, { timeout: 15000 }).not.toBe(beforeOld);
});

test('TC-F57-01: Designvorgaben erreichen die Live-Vorschau (Marker-Typ, Footer-Farbe)', async ({ page }) => {
  test.setTimeout(180000);
  const state = await setup(page);
  await seed(page, state, { count: 8, publish: true });
  await cms(page);
  await designTab(page, 'sec-plakat');
  const root = page.locator('[data-designer=plakat]');
  await expect(root).toBeVisible();
  await workspaceView(root, 'split');
  const canvas = page.locator('.an-designer-preview canvas:visible').first();
  await expect(canvas).toBeVisible({ timeout: 20000 });
  const hash = () => page.locator('.an-designer-preview canvas:visible').first().evaluate((c) => { const d = c.toDataURL(); let h = 0; for (let i = 0; i < d.length; i += 13) h = (h * 31 + d.charCodeAt(i)) | 0; return d.length + ':' + h; });
  const setValue = async (scope, sel, value) => scope.locator(sel).evaluate((n, v) => {
    if (n.type === 'checkbox') n.checked = !!v;
    else n.value = String(v);
    n.dispatchEvent(new Event('input', { bubbles: true }));
    n.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);

  // Zufällige Papiertextur darf keinen erfolgreichen Wirkungstest vortäuschen.
  await setValue(root, '#cfg-plakat-showTexture', false);
  await page.clock.runFor(1000);
  // Marker-Typ (Gemeinsame Einstellungen) muss die Plakat-Vorschau sofort verändern
  await expect.poll(hash, { timeout: 20000 }).not.toMatch(/^0:/);
  const beforeMarker = await hash();
  await setValue(page.locator('#cfg-sec-shared'), '#cfg-savingsMarkerType', 'heart');
  await expect.poll(hash, { timeout: 15000 }).not.toBe(beforeMarker);

  // Footer-Farbe wirkt in den Mag-Vorlagen (dort wird eine Fußzeile gezeichnet)
  await setValue(root, '#cfg-plakatTemplate', 'modern-magazine');
  await expect.poll(hash, { timeout: 20000 }).not.toMatch(/^0:/);
  const beforeFooter = await hash();
  await setValue(root, '#cfg-plakat-decoFooterColor', '#00ff88');
  await expect.poll(hash, { timeout: 15000 }).not.toBe(beforeFooter);
});

test('TC-F43-01/02/03 TC-F46-01/02/04: bildreine Vorschau, mindestens halbe Feldfläche und Splitter in allen Designern', async ({ page }) => {
  const state = await setup(page, { legacyArticleNumber: 'LEGACY-IMAGE' });
  await seed(page, state, { count: 8, publish: true });
  await cms(page);
  for (const kind of ['plakat', 'flyer', 'drinks', 'homepage']) {
    await designTab(page, kind === 'homepage' ? 'cfg-hpang' : 'sec-' + kind);
    const root = page.locator('[data-designer=' + kind + ']');
    expect(await root.locator('.an-designer-body').evaluate((node) => node.clientHeight / node.parentElement.clientHeight)).toBeGreaterThanOrEqual(.5);
    await workspaceView(root, 'split');
    const preview = root.locator('.an-designer-preview'), body = root.locator('.an-designer-body');
    await expect(preview.locator(kind === 'homepage' ? '#hpang-preview .an-hp-card' : 'canvas:visible').first()).toBeVisible();
    await expect(preview.locator('h2,.an-note,select,.an-direct-tools,.an-designer-save,[data-action]')).toHaveCount(0);
    await expect(preview.locator('.an-selected,.an-resize-handle,.an-rotate-handle')).toHaveCount(0);
    await expect(root.locator('.an-designer-save button:visible')).toHaveCount(4 + await root.locator('[data-workspace-views]:visible').count());
    await expect(root.locator('[data-picture-zoom]')).toHaveValue('fit');
    await expect.poll(() => preview.evaluate((node) => {
      const frame = node.querySelector('.an-designer-frame').getBoundingClientRect(), r = node.getBoundingClientRect();
      return frame.width > 0 && frame.height > 0 && frame.top >= r.top && frame.bottom <= r.bottom + 1
        && frame.left >= r.left && frame.right <= r.right + 1;
    })).toBe(true);
    const geometry = await root.evaluate((node) => {
      const rect = (selector) => { const r = node.querySelector(selector).getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
      return { p: rect('.an-designer-preview'), s: rect('.an-designer-settings'), a: rect('.an-designer-save') };
    });
    const { p, s, a } = geometry;
    if (await root.locator('.an-split').evaluate(node => node.classList.contains('an-split-mobile'))) expect(s.bottom).toBeLessThanOrEqual(p.y + 1);
    else { expect(s.right).toBeLessThanOrEqual(p.x + 1); expect(s.width).toBeGreaterThanOrEqual(p.width - 1); }
    expect(a.right <= p.x || a.y >= p.bottom || a.bottom <= p.y).toBe(true);
    expect(p.bottom).toBeLessThanOrEqual(page.viewportSize().height + 1);
    const splitter = root.getByRole('separator');
    if (await splitter.isVisible()) {
      await splitter.focus(); await splitter.press('End');
      const half = await preview.boundingBox(), tools = await root.locator('.an-designer-settings').boundingBox();
      expect(tools.width).toBeGreaterThanOrEqual(half.width - 1);
      await splitter.press('Home'); await splitter.press('ArrowRight');
    }
    await expect(root.locator('.an-designer-save button').first()).toBeInViewport();
    const header = page.locator('.an-design-header'), before = await header.boundingBox();
    await body.evaluate((node) => { node.scrollTop = node.scrollHeight; });
    expect((await header.boundingBox()).y).toBe(before.y);
    expect((await preview.boundingBox()).y).toBe(p.y);
    await designerTool(root, 'tools');
    await root.locator('[data-picture-zoom]').selectOption('2');
    expect(await preview.evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
    const documentScroll = await page.evaluate(() => document.scrollingElement.scrollTop);
    await preview.hover({ position: { x: 25, y: 25 } }); await page.mouse.wheel(0, 200);
    await expect.poll(() => preview.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.scrollingElement.scrollTop)).toBe(documentScroll);
    await root.locator('[data-picture-fit]').click();
    await expect(root.locator('[data-picture-zoom]')).toHaveValue('fit');
    if (kind === 'drinks') {
      await root.locator('[data-picture-fullscreen]').click();
      await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
      await root.locator('[data-picture-fullscreen]').click();
      await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
    }
    await noOverflow(page, '#cms-panel-cfg');
    await page.screenshot({ path: test.info().outputPath('bildreiner-designer-' + kind + '.png') });
  }
  for (const tab of ['cfg-hp', 'cfg-wp', 'cfg-plakat', 'cfg-hpang']) {
    await designTab(page, tab);
    await expect(page.locator('.an-design-header')).toBeInViewport();
    await page.getByRole('button', { name: 'Designoptionen und Hilfe', exact: true }).click();
    const help = page.locator('.an-design-header .an-help-button').first();
    await help.focus();
    const popup = page.locator('#' + await help.getAttribute('aria-controls'));
    await expect(popup).toBeVisible(); await expect(popup).toBeInViewport();
    await help.press('Escape'); await expect(popup).not.toBeVisible();
    await help.click(); await expect(popup).toBeVisible();
    await popup.getByRole('button', { name: 'Schließen', exact: true }).click();
    await expect(help).toBeFocused();
    await page.getByRole('button', { name: 'Designoptionen und Hilfe', exact: true }).click();
  }
  expect(state.errors).toEqual([]);
});

for (const kind of ['plakat', 'flyer']) {
  test('TC-F44-01/02: identische Direktwerkzeuge, echtes Rendern, Undo und explizites Speichern ' + kind, async ({ page }) => {
    const state = await setup(page, { legacyArticleNumber: 'LEGACY-IMAGE' });
    state.previewImage = Buffer.from(await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 200; canvas.height = 300;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#224488'; ctx.fillRect(0, 0, 200, 300);
      return canvas.toDataURL('image/png').split(',')[1];
    }), 'base64');
    await cms(page); await designTab(page, 'sec-' + kind); await page.clock.runFor(500);
    const root = page.locator('[data-designer=' + kind + ']'), preview = root.locator('.an-designer-preview');
    await designerTool(root, 'tools');
    await workspaceView(root, 'split');
    const select = root.locator('[data-preview-element]'), canvas = preview.locator('canvas:visible');
    await expect(select).toBeVisible(); await expect(canvas).toBeVisible();
    await select.selectOption('img');
    const meta = () => canvas.evaluate((node) => node._elMeta.find((entry) => entry.ovKey === 'img'));
    const before = await meta(), writes = state.log.filter((entry) => entry.path === '/api/cms-config' && entry.method !== 'GET').length;
    await root.locator('[data-preview-nudge="2,0"]').click(); await page.clock.runFor(500);
    await expect.poll(async () => (await meta()).x).toBeGreaterThan(before.x);
    await root.locator('[data-design-history=undo]').click(); await page.clock.runFor(500);
    await expect.poll(async () => (await meta()).x).toBeCloseTo(before.x, 3);
    await root.locator('[data-design-history=redo]').click(); await page.clock.runFor(500);
    await root.locator('[data-preview-transform=larger]').click(); await page.clock.runFor(500);
    await expect.poll(async () => (await meta()).w).toBeGreaterThan(before.w);
    await root.locator('[data-preview-transform=right]').click(); await page.clock.runFor(500);
    const handle = await preview.locator('.an-rotate-handle:visible').boundingBox();
    expect(handle.width).toBeGreaterThanOrEqual(hit(page) - .01);
    expect(state.log.filter((entry) => entry.path === '/api/cms-config' && entry.method !== 'GET')).toHaveLength(writes);
    await designTab(page, 'sec-drinks');
    await designTab(page, 'sec-' + kind); await page.clock.runFor(500);
    const savedRequest = page.waitForRequest((request) => request.url().includes('/api/cms-config') && request.method() !== 'GET');
    await root.locator('#cfg-plakat-save').click();
    state.cmsDesign.design_config = (await savedRequest).postDataJSON().wert;
    expect(state.cmsDesign.design_config[kind + '_inline']?.imgDx).toBe(2);
    expect(state.cmsDesign.design_config[kind + '_inline'].imgScale).toBeCloseTo(110);
    expect(Math.abs(state.cmsDesign.design_config[kind + '_inline'].imgRot)).toBe(15);
    const savedMeta = await meta();
    await root.locator('[data-preview-nudge="2,0"]').click(); await page.clock.runFor(500);
    await expect.poll(async () => (await meta()).x).toBeGreaterThan(savedMeta.x);
    await root.locator('[data-more-actions]').click();
    await root.locator('[data-action=cfgRevertUnsaved]').click(); await page.clock.runFor(500);
    await expect.poll(async () => (await meta()).x).toBeCloseTo(savedMeta.x, 3);
    await page.reload(); await page.clock.runFor(500);
    await designTab(page, 'sec-' + kind); await page.clock.runFor(500);
    await workspaceView(root, 'split');
    await page.clock.runFor(500);
    await expect(canvas).toBeVisible();
    await expect(root.locator('[data-design-history=undo]')).toBeDisabled();
    await page.evaluate((kind) => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (...args) {
        HTMLCanvasElement.prototype.getContext = getContext;
        throw new Error('Absichtlicher einmaliger Renderfehler');
      };
      window.cfgLivePreview(kind);
    }, kind);
    await page.clock.runFor(500);
    await expect(preview.getByRole('alert')).toContainText('konnte nicht geladen werden');
    await page.evaluate((kind) => window.cfgLivePreview(kind), kind); await page.clock.runFor(500);
    await expect(canvas).toBeVisible();
    expect(state.errors).toEqual([]);
  });
}

test('TC-F52-04: echte Eingabefläche statt abgeschnittener mobiler Miniansicht', async ({ page }) => {
  const state = await setup(page, { legacyArticleNumber: 'LEGACY-IMAGE' });
  await cms(page);
  const root = page.locator('[data-designer=drinks]'), body = root.locator('.an-designer-body');
  await expect(root).toBeVisible();
  await workspaceView(root, 'inputs');
  await designerTool(root, 'tools');
  await expect.poll(() => body.evaluate(node => node.getBoundingClientRect().height / innerHeight)).toBeGreaterThanOrEqual(.5);
  await expect(root.locator('[data-design-save]')).toBeInViewport();
  await expect(root.locator('[data-object-properties=text]')).toBeInViewport();
  await expect(root.locator('[data-object-properties=image]')).toBeInViewport();
  if (await root.locator('.an-designer-tool-select').isVisible()) await expect(root.locator('.an-designer-tabs')).not.toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: test.info().outputPath('arbeitsraum-eingaben.png') });
  await workspaceView(root, 'picture');
  await expect(root.locator('.an-designer-preview')).toBeVisible();
  await expect(root.locator('.an-designer-settings')).not.toBeVisible();
  await expect(root.locator('.an-designer-preview')).toBeInViewport();
  await page.screenshot({ path: test.info().outputPath('arbeitsraum-motiv.png') });
  await workspaceView(root, 'inputs');
  await expect(body).toBeVisible();
  await expect(root.locator('[data-design-save]')).toBeInViewport();
  await designTab(page, 'sec-flyer');
  await designerTool(page.locator('[data-designer=flyer]'), 'tools');
  await expect(page.locator('[data-designer=flyer] [data-object-properties=text]')).toBeVisible();
  await designTab(page, 'sec-drinks');
  await expect(root.locator('[data-workspace-views]:visible')).toHaveCount(1);
  expect(state.log.filter(entry => entry.method !== 'GET' && !entry.read_only_lookup)).toHaveLength(0);
  expect(state.errors).toEqual([]);
});

test('TC-F52-05: Mausaktionen sind tatsächlich 32 px hoch, Touchziele bleiben erreichbar', async ({ page }) => {
  const state = await setup(page);
  await cms(page);
  const root = page.locator('[data-designer=drinks]');
  await expect(root.locator('[data-design-save]')).toBeVisible();
  const compact = await page.evaluate(() => innerWidth >= 600 && matchMedia('(hover:hover) and (pointer:fine)').matches && !matchMedia('(any-pointer:coarse)').matches);
  const controls = [
    root.locator('[data-design-save]'), root.locator('[data-design-history=undo]'),
    root.locator('[data-more-actions]'),
    root.locator('.an-density-choice .an-choice').first(),
    page.locator('.an-design-location-btn').first(),
    page.getByRole('button', { name: 'Designoptionen und Hilfe', exact: true }),
    page.locator('.an-design-header [data-workspace-fullscreen]'),
  ];
  const measurements = await Promise.all(controls.map(control => control.evaluate(node => ({
    control: node.outerHTML.slice(0, 200), height: node.getBoundingClientRect().height
  }))));
  await test.info().attach('control-sizes.json', { body: JSON.stringify(measurements, null, 2), contentType: 'application/json' });
  for (const { control, height } of measurements) {
    if (compact) expect(height, control).toBeCloseTo(32, 0);
    else expect(height, control).toBeGreaterThanOrEqual(44);
  }
  const toolSelect = root.locator('.an-designer-tool-select');
  const navigation = await toolSelect.isVisible() ? toolSelect : root.locator('[data-designer-tab]').first();
  const navigationHeight = (await navigation.boundingBox()).height;
  expect(navigationHeight).toBeGreaterThanOrEqual(hit(page) - .5);
  if (compact) expect(navigationHeight).toBeLessThanOrEqual((await toolSelect.isVisible() ? 32 : 44) + .5);
  const familyZoom = await root.locator('.an-family-zoom').first().boundingBox();
  expect(familyZoom.height).toBeGreaterThanOrEqual(hit(page) - .5);
  const density = root.locator('.an-density-choice .an-choice').last();
  await density.click({ position: { x: 2, y: 2 } });
  await expect(density.locator('input')).toBeChecked();
  await density.locator('input').press('ArrowLeft');
  await expect(root.locator('[data-style=density][value="4"]')).toBeChecked();
  await designerTool(root, 'tools');
  const objectButtonHeight = (await root.locator('[data-object-properties=text]').boundingBox()).height;
  if (compact) expect(objectButtonHeight).toBeCloseTo(32, 0);
  else expect(objectButtonHeight).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: test.info().outputPath('kompakte-buttonhoehen.png') });
  await page.goto(BASE + '/angebote.html?bestand=1');
  await page.getByRole('button', { name: '+ Getränkeaktion anlegen', exact: true }).click();
  await expect(page.locator('#an-save')).toBeVisible();
  for (const control of [page.locator('#an-save'), page.locator('#an-root [data-more-actions]')]) {
    const height = await control.evaluate(node => node.getBoundingClientRect().height);
    if (compact) expect(height).toBeCloseTo(32, 0);
    else expect(height).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: test.info().outputPath('angebote-buttonhoehen.png') });
  expect(state.log.filter(entry => entry.method !== 'GET' && !entry.read_only_lookup)).toHaveLength(0);
  expect(state.errors).toEqual([]);
});

test('TC-F52-01/02/03: kompakte Eigenschaften sind live, verwerfbar und ein Gestaltungsschritt', async ({ page }) => {
  const state = await setup(page, { legacyArticleNumber: 'LEGACY-IMAGE' });
  await cms(page); await designTab(page, 'sec-plakat');
  const root = page.locator('[data-designer=plakat]');
  await workspaceView(root, 'inputs');
  await designerTool(root, 'tools');
  if (page.viewportSize().width < 612) {
    await expect(root.locator('[aria-label=Arbeitsansicht]')).toHaveValue('inputs');
    await expect(root.locator('.an-designer-preview')).not.toBeVisible();
  }
  await root.locator('[data-object-properties=text]').click();
  const dialog = root.getByRole('dialog', { name: 'Schrift einstellen', exact: true });
  await expect(dialog).toBeVisible();
  const size = root.locator('#cfg-plakat-nameSize'), original = await size.inputValue();
  await size.fill('38'); await page.clock.runFor(500);
  if (page.viewportSize().width < 560) await expect(dialog.locator('canvas')).toBeVisible();
  await dialog.getByRole('button', { name: 'Abbrechen', exact: true }).click(); await page.clock.runFor(500);
  await expect(size).toHaveValue(original);
  await expect(root.locator('[data-design-history=undo]')).toBeDisabled();
  await root.locator('[data-object-properties=text]').click();
  await size.fill('39'); await page.clock.runFor(300);
  await size.fill('41'); await page.clock.runFor(300);
  await dialog.getByRole('button', { name: 'Übernehmen', exact: true }).click();
  await root.locator('[data-design-history=undo]').click(); await page.clock.runFor(500);
  await expect(size).toHaveValue(original);
  await expect(root.locator('[data-design-history=undo]')).toBeDisabled();
  await root.locator('[data-design-history=redo]').click(); await page.clock.runFor(500);
  await expect(size).toHaveValue('41');
  await root.locator('[data-object-properties=text]').click();
  await size.fill('44'); await page.keyboard.press('Escape'); await page.clock.runFor(500);
  await expect(size).toHaveValue('41');
  expect(state.log.filter((entry) => entry.method !== 'GET' && !entry.read_only_lookup)).toHaveLength(0);
  expect(state.errors).toEqual([]);
});

const templatePanel = (page) => page.locator('[data-editor-panel-tab=design]').click();
const stepTab = (page, name) => page.locator('.an-steps [data-step=' + name + ']').click();
const openEditor = async (page, head) => {
  await page.reload();
  await page.locator('[data-open="' + head.id + '"]').click();
  await expect(page.locator('#an-save')).toBeEnabled();
};

test('TC-F53-01: Herkunft folgt der Abweichung; Zurücksetzen wirkt nur auf Gruppe und Ziel', async ({ page }) => {
  const state = await setup(page);
  await page.getByRole('button', { name: '+ Getränkeaktion anlegen', exact: true }).click();
  await stepTab(page, 'design'); await templatePanel(page);
  const root = page.locator('#an-root');
  const price = root.locator('[data-object-properties=price]'), text = root.locator('[data-object-properties=text]');
  await expect(price).toContainText('Aus Vorlage'); await expect(text).toContainText('Aus Vorlage');
  const apply = (name) => page.getByRole('dialog', { name, exact: true }).getByRole('button', { name: 'Übernehmen', exact: true }).click();
  await price.click();
  await page.getByRole('dialog', { name: 'Preisschild einstellen', exact: true }).locator('[data-style=price_preset]').selectOption('green-rounded');
  await apply('Preisschild einstellen');
  await expect(price).toContainText('Individuell angepasst'); await expect(text).toContainText('Aus Vorlage');
  await root.locator('[data-layout-target=single]').click();
  await expect(root.locator('[data-object-properties=price]')).toContainText('Aus Vorlage');
  await root.locator('[data-layout-target=card]').click();
  await expect(price).toContainText('Individuell angepasst');
  await text.click();
  await page.getByRole('dialog', { name: 'Schrift einstellen', exact: true }).locator('[data-style=font]').selectOption('Georgia');
  await apply('Schrift einstellen');
  await expect(text).toContainText('Individuell angepasst');
  await price.click();
  const dialog = page.getByRole('dialog', { name: 'Preisschild einstellen', exact: true });
  await dialog.getByRole('button', { name: 'Auf Vorlagenwert zurücksetzen', exact: true }).click();
  await expect(dialog.locator('[data-style=price_preset]')).not.toHaveValue('green-rounded');
  await apply('Preisschild einstellen');
  await expect(price).toContainText('Aus Vorlage');
  await expect(text).toContainText('Individuell angepasst');
  await expect(root.locator('#an-style-controls [data-style=font]')).toHaveValue('Georgia');
  await root.locator('[data-history=undo]').first().click();
  await expect(root.locator('[data-object-properties=price]')).toContainText('Individuell angepasst');
  expect(state.log.filter((entry) => ['POST', 'PUT'].includes(entry.method) && entry.path.startsWith('/api/angebote-verwaltung'))).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('TC-F53-02: Altbestand ohne Herkunft und geänderte Standards verändern gespeicherte Aktionen nicht', async ({ page }) => {
  const state = await setup(page);
  const legacy = await seed(page, state, { title: 'Altbestand' });
  const known = await seed(page, state, { title: 'Mit Herkunft', origin: true });
  await page.reload();
  const before = JSON.stringify([legacy.draft, known.draft]);
  state.design.drinks.color = '#112233';
  state.design.drinks.price_size = 40;
  const root = page.locator('#an-root');
  await page.locator('[data-open="' + legacy.id + '"]').click();
  await expect(page.locator('#an-save')).toBeEnabled();
  await stepTab(page, 'design'); await templatePanel(page);
  await expect(root.locator('[data-object-properties=price]')).toContainText('Gespeicherte Gestaltung');
  await root.locator('[data-object-properties=price]').click();
  const dialog = page.getByRole('dialog', { name: 'Preisschild einstellen', exact: true });
  await expect(dialog.getByRole('button', { name: 'Keine gespeicherte Vorlagenherkunft', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.locator('#an-overview').click();
  await page.getByRole('button', { name: 'Änderungen verwerfen', exact: true }).click();
  await page.locator('[data-open="' + known.id + '"]').click();
  await expect(page.locator('#an-save')).toBeEnabled();
  await stepTab(page, 'design'); await templatePanel(page);
  await expect(root.locator('[data-object-properties=price]')).toContainText('Aus Vorlage');
  await expect(root.locator('#an-style-controls [data-style=color]')).toHaveValue('#bb421e');
  const undo = root.locator('[data-history=undo]').first();
  await expect(undo).toBeDisabled();
  await page.locator('#an-defaults').click();
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect(root.locator('#an-style-controls [data-style=color]')).toHaveValue('#bb421e');
  await expect(undo).toBeDisabled();
  await page.locator('#an-defaults').click();
  await page.getByRole('button', { name: 'Vorlage anwenden', exact: true }).click();
  await expect(root.locator('#an-style-controls [data-style=color]')).toHaveValue('#112233');
  await expect(undo).toBeEnabled();
  await root.locator('[data-layout-target=single]').click();
  await expect(root.locator('#an-style-controls [data-style=color]')).toHaveValue('#bb421e');
  await undo.click();
  await root.locator('[data-layout-target=card]').click();
  await expect(root.locator('#an-style-controls [data-style=color]')).toHaveValue('#bb421e');
  expect(JSON.stringify([state.actions.get(legacy.id).draft, state.actions.get(known.id).draft])).toBe(before);
  expect(state.log.filter((entry) => entry.method === 'PUT')).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('TC-F54-01: mobile Detailvorschau aus echten Motivpixeln', async ({ page }) => {
  const state = await setup(page);
  const head = await seed(page, state, { count: 2 });
  await openEditor(page, head);
  await stepTab(page, 'design'); await templatePanel(page);
  const root = page.locator('#an-root');
  await root.locator('[data-object-properties=text]').click();
  const dialog = page.getByRole('dialog', { name: 'Schrift einstellen', exact: true });
  if (page.viewportSize().width >= 560) {
    await expect(dialog.locator('.an-object-preview')).toBeHidden();
    await dialog.getByRole('button', { name: 'Abbrechen', exact: true }).click();
    return;
  }
  const figure = dialog.locator('.an-object-preview figure'), canvas = figure.locator('canvas');
  await expect(canvas).toBeVisible();
  expect((await figure.boundingBox()).width).toBeGreaterThanOrEqual(160);
  const before = await canvas.evaluate((node) => node.toDataURL());
  expect(await canvas.evaluate((node) => node.width)).toBeGreaterThan(160);
  await dialog.locator('[data-style=text_color]').fill('#cc0000'); await dialog.locator('[data-style=text_color]').dispatchEvent('change');
  await expect.poll(async () => { await page.clock.runFor(300); return canvas.evaluate((node) => node.toDataURL()); }).not.toBe(before);
  await dialog.getByRole('button', { name: 'Gesamtmotiv', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Detailansicht', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Abbrechen', exact: true }).first().click();
  await expect(root.locator('[data-history=undo]').first()).toBeDisabled();
  expect(state.log.filter((entry) => ['POST', 'PUT'].includes(entry.method) && entry.path.startsWith('/api/angebote-verwaltung'))).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('TC-F56-01: Fehler blockieren, Hinweise führen gezielt zur Stelle', async ({ page }) => {
  const state = await setup(page);
  const head = await seed(page, state, { count: 2 });
  head.draft.items[0].name = 'Superlangername'.repeat(25);
  await openEditor(page, head);
  await stepTab(page, 'output');
  await page.locator('#an-quality').click();
  const report = page.getByRole('dialog', { name: 'Qualitätsprüfung', exact: true });
  await expect(report.getByRole('status')).toContainText(/[1-9]\d* Fehler/);
  await expect(report).toContainText('wird abgeschnitten');
  await expect(report.getByRole('heading', { name: /Hinweise/ })).toBeVisible();
  await expect(report).toContainText('Das Bild ist nur');
  await report.getByRole('button', { name: 'Schließen', exact: true }).click();
  await page.locator('#an-publish').click();
  await expect(page.getByRole('dialog', { name: 'Qualitätsprüfung', exact: true })).toBeVisible();
  expect(state.log.some((entry) => entry.params.action === 'publish')).toBe(false);
  await page.getByRole('dialog', { name: 'Qualitätsprüfung', exact: true }).locator('.an-quality-list').first().getByRole('button', { name: 'Zur Stelle', exact: true }).first().click();
  await expect(page.locator('#an-step-design')).toBeVisible();
  await expect(page.locator('#an-design-item')).toHaveValue(head.draft.items[0].id);
  await expect(page.locator('[data-layout-target][aria-pressed=true]')).toHaveCount(1);
  await stepTab(page, 'articles');
  const name = page.locator('[data-item-id="' + head.draft.items[0].id + '"] [data-prop=name]');
  await name.fill('Kurzer Name'); await name.dispatchEvent('change');
  await stepTab(page, 'output');
  await page.locator('#an-quality').click();
  await expect(report.getByRole('status')).toContainText('0 Fehler');
  await expect(report.getByRole('heading', { name: /Hinweise/ })).toBeVisible();
  await expect(report.getByRole('button', { name: 'Hinweise bestätigen', exact: true })).toBeVisible();
  await report.getByRole('button', { name: 'Hinweise bestätigen', exact: true }).click();
  await expect(page.locator('#an-quality-note')).toContainText('Hinweise bestätigt');
  const published = page.waitForRequest((request) => request.url().includes('action=publish'));
  await page.locator('#an-publish').click();
  await page.getByRole('button', { name: 'Jetzt freigeben', exact: true }).click();
  await published;
  expect(state.errors).toEqual([]);
});

test('TC-F57-02: gezielte Mehrfachübertragung ändert nur gewählte Eigenschaft und Kachel', async ({ page }) => {
  const state = await setup(page);
  const head = await seed(page, state, { count: 3 });
  const colors = ['#aa0000', '#00aa00', '#0000aa'];
  head.draft.layout.targets.card.forEach((entry, index) => {
    entry.elements.find((element) => element.type === 'name').fill = colors[index];
    entry.elements.find((element) => element.type === 'name').font_size = 20 + index;
  });
  const original = JSON.parse(JSON.stringify(head.draft));
  await openEditor(page, head);
  await stepTab(page, 'design');
  await templatePanel(page);
  await page.locator('#an-transfer').click();
  const dialog = page.getByRole('dialog', { name: 'Gestaltung übertragen', exact: true });
  const undo = page.locator('[data-history=undo]').first();
  await expect(undo).toBeDisabled();
  await expect(dialog.locator('[data-transfer-item]')).toHaveCount(2);
  await expect(dialog.getByRole('button', { name: 'Übertragen', exact: true })).toBeDisabled();
  await dialog.locator('[data-transfer-item="' + original.items[1].id + '"]').check();
  await dialog.locator('[data-transfer-prop="text.fill"]').check();
  await expect(dialog.locator('[data-transfer-summary]')).toContainText('1 Kachel(n) · 1 Eigenschaft(en) · 1 Änderung(en)');
  await expect(dialog.locator('[data-transfer-changes] li')).toHaveText([/Schriftfarbe: #00aa00 → #aa0000/]);
  await dialog.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect(undo).toBeDisabled();
  await page.locator('#an-transfer').click();
  await dialog.locator('[data-transfer-item="' + original.items[1].id + '"]').check();
  await dialog.locator('[data-transfer-prop="text.fill"]').check();
  await dialog.getByRole('button', { name: 'Übertragen', exact: true }).click();
  await expect(undo).toBeEnabled();
  await saveDraft(page);
  const saved = state.actions.get(head.id).draft, name = (target, index) => saved.layout.targets[target][index].elements.find((element) => element.type === 'name');
  expect(name('card', 1).fill).toBe('#aa0000');
  expect(name('card', 1).font_size).toBe(21);
  expect(name('card', 2).fill).toBe('#0000aa');
  expect(name('card', 0).fill).toBe('#aa0000');
  expect(saved.layout.targets.single).toEqual(original.layout.targets.single);
  expect(saved.layout.targets.scale).toEqual(original.layout.targets.scale);
  const withoutImages = (items) => items.map(({ image_id, ...rest }) => rest);
  expect(withoutImages(saved.items)).toEqual(withoutImages(original.items));
  await page.locator('[data-history=undo]').first().click();
  await saveDraft(page);
  expect(state.actions.get(head.id).draft.layout.targets.card).toEqual(original.layout.targets.card);
  expect(state.errors).toEqual([]);
});

test('TC-F49-03: Preisschildfarben und Geometrie ändern echte Magazin-Vorschaupixel', async ({ page }) => {
  const state = await setup(page, { legacyArticleNumber: 'LEGACY-IMAGE' });
  await cms(page);
  for (const kind of ['plakat', 'flyer']) {
    await designTab(page, 'sec-' + kind);
    const root = page.locator('[data-designer=' + kind + ']'), canvas = root.locator('.an-designer-preview canvas:visible');
    await workspaceView(root, 'split');
    await designerTool(root, 0);
    await chooseFamily(root, 'Magazin');
    await root.getByRole('combobox', { name: 'Magazin-Bildfläche', exact: true }).selectOption({ label: 'Großbild' });
    await expect(root.locator('#cfg-' + kind + 'Template')).toHaveValue('modern-mag-xl');
    await page.clock.runFor(500); await expect(canvas).toBeVisible();
    await designerTool(root, 'tools');
    await root.locator('[data-object-properties=price]').click();
    async function change(key, value, select = false) {
      const field = root.locator('#cfg-' + kind + '-' + key);
      const before = await canvas.evaluate((node) => node.toDataURL());
      if (select) await field.selectOption(value); else await field.fill(value);
      await page.clock.runFor(500);
      await expect.poll(async () => {
        await page.clock.runFor(500);
        return canvas.evaluate((node) => node.toDataURL());
      }, { message: kind + '/' + key }).not.toBe(before);
    }
    await change('tagPreset', 'green-rounded', true);
    await change('tagRadius', '30'); await change('tagSkew', '4'); await change('tagScale', '75');
    for (const key of ['priceImageColor', 'priceStripColor', 'priceOutlineColor', 'priceOldColor', 'priceStrikeColor']) await change(key, '#7733bb');
    await change('tagPreset', 'price-image', true);
    for (const key of ['priceImageColor', 'priceStripColor', 'priceOutlineColor', 'priceOldColor', 'priceStrikeColor']) await change(key, '#1166aa');
    await change('tagPreset', 'classic-red-rect', true);
    await expect(root.locator('#cfg-' + kind + '-tagShape')).toHaveValue('rect');
    await root.getByRole('dialog', { name: 'Preisschild einstellen', exact: true }).getByRole('button', { name: 'Übernehmen', exact: true }).click();
    const saved = page.waitForRequest((request) => request.url().includes('/api/cms-config') && request.method() !== 'GET');
    await root.locator('#cfg-plakat-save').click();
    expect((await saved).postDataJSON().wert[kind + '_tagPreset']).toBe('classic-red-rect');
    await workspaceView(root, 'inputs');
    expect(await root.locator('.an-designer-body').evaluate((node) => node.clientHeight / node.parentElement.clientHeight)).toBeGreaterThanOrEqual(.5);
  }
  expect(state.errors).toEqual([]);
});

test('TC-F47-01 TC-F48-01/02 TC-F49-01/02: native Waage, gruppierter Zusatz und austauschbares Preisschild', { tag: '@ohne-layout' }, async ({ page }) => {
  const state = await setup(page);
  const result = await page.evaluate(async () => {
    const M = window.AngeboteModel, D = window.AngeboteDesign;
    const data = M.blank('drinks'), item = Object.assign(M.item(), {
      name: 'UNERTL WEISSBIER', description: 'Das Original aus Bayern', price_cents: 1999, old_price_cents: 2399,
      units: 20, volume_ml: 500, deposit_cents: 300
    });
    data.items.push(item); M.applyTemplate(data); M.ensureTargets(data);
    const texts = [], fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, ...rest) {
      const t = this.getTransform(); texts.push({ text, x, y, font: this.font, tx: t.e, ty: t.f });
      return fillText.call(this, text, x, y, ...rest);
    };
    const descriptions = [];
    try {
      for (const target of ['sheet', 'card', 'single', 'scale']) {
        texts.length = 0;
        if (target === 'sheet') await M.render(data, 0, 1);
        else await M.renderTarget(data, target, item.id, 1);
        descriptions.push({ target, title: texts.filter((entry) => entry.text && item.name.includes(entry.text)).at(-1),
          detail: texts.filter((entry) => /^600 /.test(entry.font)) });
      }
    } finally { CanvasRenderingContext2D.prototype.fillText = fillText; }
    const before = M.clone(data), target = data.layout.targets.scale[0], frames = [];
    for (const preset of Object.keys(window.WochenangeboteRenderer.TAG_PRESETS)) {
      M.setTargetStyle(data.layout, 'scale', (style) => D.change(style, { dataset: { style: 'price_preset' }, value: preset }));
      frames.push((await M.renderTarget(data, 'scale', item.id, 1)).canvas.toDataURL());
    }
    const independent = JSON.stringify(data.layout.pages) === JSON.stringify(before.layout.pages)
      && JSON.stringify(target.elements) === JSON.stringify(before.layout.targets.scale[0].elements)
      && JSON.stringify(data.items) === JSON.stringify(before.items);
    const legacy = M.clone(data.layout); legacy.template = 'price-image'; delete legacy.price_preset;
    D.change(legacy, { dataset: { style: 'price_preset' }, value: 'green-rounded' });
    const legacyReplaced = !M.priceImage(legacy);
    const weekly = M.blank('weekly'); weekly.items.push(Object.assign(M.item(), { name: 'Waagenartikel', price_cents: 249 }));
    await M.adoptWeekly(weekly);
    const plain = M.clone(weekly); delete plain.layout.cms;
    const native = await M.renderTarget(weekly, 'scale', weekly.items[0].id, 1);
    const comparison = await M.renderTarget(plain, 'scale', weekly.items[0].id, 1);
    return { descriptions, independent, legacyReplaced, variants: new Set(frames).size, presets: frames.length,
      native: { w: native.canvas.width, h: native.canvas.height, metadata: !!native.canvas._weeklyElements,
        equal: native.canvas.toDataURL() === comparison.canvas.toDataURL() } };
  });
  for (const { title, detail } of result.descriptions) {
    expect(title).toBeTruthy(); expect(detail.map((entry) => entry.text).join(' ')).toBe('Das Original aus Bayern');
    expect(detail[0].font).toMatch(/^600 /);
    expect(detail[0].x).toBe(title.x); expect(detail[0].y).toBeGreaterThan(title.y);
    expect(detail[0].tx).toBe(title.tx); expect(detail[0].ty).toBe(title.ty);
  }
  expect(result).toMatchObject({ independent: true, legacyReplaced: true,
    native: { w: 800, h: 462, metadata: false, equal: true } });
  expect(result.variants).toBe(result.presets);
  expect(state.errors).toEqual([]);
});

test('TC-F44-03: Inline-Standards verändern Originalausgaben und werden identisch in CMS-Snapshots übernommen', { tag: '@ohne-layout' }, async ({ page }) => {
  const state = await setup(page), imageId = uid(); state.images.set(imageId, PHOTO);
  state.cmsDesign.design_config = { plakat_showTexture: false, flyer_showTexture: false,
    plakat_inline: { imgDx: 12, priceDy: -7, priceRot: 15 },
    flyer_inline: { imgDx: -9, priceDy: 13, priceRot: -15 } };
  const result = await page.evaluate(async (imageId) => {
    const M = window.AngeboteModel, R = window.WochenangeboteRenderer, data = M.blank('weekly');
    const item = Object.assign(M.item(), { name: 'Testprodukt', price_cents: 249, image_id: imageId });
    data.items.push(item); await M.adoptWeekly(data);
    const encode = (image) => { const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height; canvas.getContext('2d').drawImage(image, 0, 0); return canvas.toDataURL(); };
    const photo = await M.image(imageId), logo = encode(await M.image('logo')), cfg = data.layout.cms.config;
    const renderer = R.create({ cfgGet: () => cfg, logo, flyerArtOverrideGet: () => null, plakatArtOverrideGet: () => null });
    const original = { produkt: item.name, preis: 2.49, bild_data: encode(photo) };
    const action = { von: data.valid_from, bis: data.valid_to, items: [original] };
    const poster = (config) => new Promise((resolve) => renderer.drawAngebotPlakat(action, [original], [photo], resolve, config, { scale: 1, returnCanvas: true }));
    const base = { ...cfg, plakat_inline: {}, flyer_inline: {} };
    const beforePoster = await poster(base), afterPoster = await poster(cfg);
    const beforeSingle = await renderer.generateEinzelflyer(original, action, base);
    const afterSingle = await renderer.generateEinzelflyer(original, action, cfg);
    const adapted = await M.render(data, 0, 1), adaptedSingle = await M.renderTarget(data, 'single', item.id, 1);
    const delta = (a, b, key, field) => b._elMeta.find((entry) => entry.ovKey === key)[field] - a._elMeta.find((entry) => entry.ovKey === key)[field];
    return { posterDx: delta(beforePoster, afterPoster, 'img', 'x'), posterDy: delta(beforePoster, afterPoster, 'price', 'y'),
      singleDx: delta(beforeSingle, afterSingle, 'img', 'x'), singleDy: delta(beforeSingle, afterSingle, 'price', 'y'),
      posterSame: afterPoster.toDataURL() === adapted.canvas.toDataURL(),
      singleSame: afterSingle.toDataURL() === adaptedSingle.canvas.toDataURL() };
  }, imageId);
  expect(result).toMatchObject({ posterDx: 12, posterDy: -7, singleDx: -9, singleDy: 13, posterSame: true, singleSame: true });
  expect(state.errors).toEqual([]);
});

test('TC-F38-01/05/06: gemeinsame Arbeitsfläche, geschlossene Vorlagen und unabhängige Vorschau', async ({ page }) => {
  const state = await setup(page);
  await cms(page);
  for (const kind of ['plakat', 'flyer', 'drinks']) {
    await designTab(page, 'sec-' + kind);
    const root = page.locator('[data-designer=' + kind + ']');
    await expect(root).toBeVisible();
    const tabs = root.locator('.an-designer-tabs [role=tab]');
    await expect(tabs).toHaveText(['Stil', 'Farben', 'Feinabstimmung', 'Weitere Gestaltung', 'Eigene Vorlagen', 'Werkzeuge']);
    for (let i = 0; i < 6; i++) {
      await designerTool(root, i);
      await expect(root.locator('[role=tabpanel]:visible')).toHaveCount(1);
      await expect(root.locator('[data-designer-panel="' + i + '"]')).toBeVisible();
    }
    await designerTool(root, 0);
    await expect(root.locator('.an-style-families')).toBeVisible();
    const previewHost = root.locator('.an-designer-preview');
    await workspaceView(root, 'split');
    await page.clock.runFor(500);
    await expect(kind === 'drinks' ? root.locator('[data-design-preview] canvas')
      : root.locator('#cfg-live-preview-' + kind + ' canvas')).toBeVisible();
    await expect(previewHost).toHaveCSS('overflow-y', 'auto');
    await expect(previewHost).toHaveCSS('overscroll-behavior-y', 'contain');
    await previewHost.scrollIntoViewIfNeeded();
    await previewHost.evaluate((node) => { node.scrollTop = 0; });
    const before = await root.evaluate((node) => ({
      document: document.scrollingElement.scrollTop,
      settings: node.querySelector('.an-designer-settings').scrollTop,
      overflow: node.querySelector('.an-designer-preview').scrollHeight > node.querySelector('.an-designer-preview').clientHeight,
    }));
    await previewHost.hover({ position: { x: 30, y: 80 } });
    await page.mouse.wheel(0, 250);
    if (before.overflow) await expect.poll(() => previewHost.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.scrollingElement.scrollTop)).toBe(before.document);
    expect(await root.locator('.an-designer-settings').evaluate((node) => node.scrollTop)).toBe(before.settings);
    const preview = await root.locator('.an-designer-preview').boundingBox();
    const settings = await root.locator('.an-designer-settings').boundingBox();
    // Unter ~612 px stehen die Eingaben vor (über) der Vorschau; sonst links daneben.
    if (await root.evaluate((node) => node.classList.contains('an-split-mobile') || !!node.querySelector('.an-split-mobile'))) expect(settings.y + settings.height).toBeLessThanOrEqual(preview.y + 1);
    else expect(settings.x + settings.width).toBeLessThanOrEqual(preview.x + 1);
    await root.locator('.an-designer-save').scrollIntoViewIfNeeded();
    await expect(root.locator('.an-designer-save button').first()).toBeInViewport();
    await noOverflow(page, '#cms-cfg-plakat');
    await page.screenshot({ path: test.info().outputPath('designer-' + kind + '.png') });
  }
  expect(state.errors).toEqual([]);
});

for (const section of ['plakat', 'flyer']) {
  test('TC-F38-02: Reiter ' + section + ' erhält Eingabefelder und Speichervertrag', async ({ page }) => {
    const state = await setup(page);
    await cms(page);
    await designTab(page, 'sec-' + section);
    const root = page.locator('#cfg-sec-' + section);
    await expect(root).toBeVisible();
    const original = await (await page.request.get(BASE + '/cms.html')).text();
    const originalIds = await page.evaluate(({ html, section }) => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return [...doc.querySelectorAll('#cfg-sec-' + section + ' input[id],#cfg-sec-' + section + ' select[id]')].map((node) => node.id).sort();
    }, { html: original, section });
    const currentIds = await root.locator('.an-designer-settings input[id]:not([id^=cfg-live-auto]),.an-designer-settings select[id]').evaluateAll((nodes) => nodes.map((node) => node.id).sort());
    expect(currentIds).toEqual(expect.arrayContaining(originalIds));
    expect(new Set(currentIds).size).toBe(currentIds.length);
    await expect(root.locator('.cms-card')).toHaveCount(0);
    await expect(root.locator('.an-style-families:visible')).toBeVisible();
    await expect(root.locator('.an-style-families:visible input:checked')).toHaveCount(1);
    const left = page.locator('#cms-cfg-plakat .cfg-split-left');
    expect(await left.evaluate((node) => getComputedStyle(node).overflowY)).toBe('visible');
    await page.locator('#cfg-plakat-save').scrollIntoViewIfNeeded();
    const save = await page.locator('#cfg-plakat-save').boundingBox(), view = page.viewportSize();
    expect(save.y).toBeGreaterThanOrEqual(0);
    expect(save.y + save.height).toBeLessThanOrEqual(view.height + 1);
    await designerTool(root, 'tools');
    await root.locator('[data-object-properties=price]').click();
    await expect(root.locator('#cfg-' + section + '-tagShape')).toBeVisible();
    const contrast = await root.locator('#cfg-' + section + '-tagShape').evaluate((node) => {
      const parse = (value) => value.match(/[\d.]+/g).slice(0, 3).map(Number);
      const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
      const style = getComputedStyle(node);
      return { border: ratio(parse(style.borderTopColor), [255, 255, 255]), text: ratio(parse(style.color), parse(style.backgroundColor)) };
    });
    expect(contrast.border).toBeGreaterThanOrEqual(3);
    expect(contrast.text).toBeGreaterThanOrEqual(4.5);
    await root.getByRole('dialog', { name: 'Preisschild einstellen', exact: true }).getByRole('button', { name: 'Abbrechen', exact: true }).click();
    await noOverflow(page, '#cms-cfg-plakat');
    await page.screenshot({ path: test.info().outputPath('design-' + section + '.png') });
    // Funktion: Vorlagenwechsel, Preisschildform, unveränderte Speicheranfrage
    await designerTool(root, 0);
    await chooseFamily(root, 'Minimal');
    await expect(root.getByRole('radio', { name: 'Minimal', exact: true })).toBeChecked();
    await expect(page.locator('#cfg-' + section + 'Template')).toHaveValue('minimal-clean');
    await designerTool(root, 3);
    await setField(page, root, root.locator('#cfg-' + section + '-tagShape'), 'pill');
    const request = page.waitForRequest((r) => r.url().includes('/api/cms-config') && r.method() !== 'GET');
    await page.locator('#cfg-plakat-save').click();
    const body = (await request).postDataJSON();
    expect(body.name).toBe('design_config');
    expect(body.wert[section + 'Template']).toBe('minimal-clean');
    expect(body.wert[section + '_tagShape']).toBe('pill');
    expect(state.errors).toEqual([]);
  });
}

test('TC-F38-04: Rot/Gelb-Preisbild und fünf Farben für Plakat und Einzelflyer speichern und neu laden', async ({ page }) => {
  const state = await setup(page);
  await cms(page);
  const colors = { priceImageColor: '#1234aa', priceOutlineColor: '#ddccff', priceStripColor: '#aaff22',
    priceOldColor: '#112233', priceStrikeColor: '#ff44aa' };
  let saved;
  for (const kind of ['plakat', 'flyer']) {
    await designTab(page, 'sec-' + kind);
    const root = page.locator('#cfg-sec-' + kind);
    await designerTool(root, 'tools');
    await root.locator('[data-object-properties=price]').click();
    const dialog = root.locator('dialog.an-object-dialog[open]');
    await dialog.locator('#cfg-' + kind + '-tagPreset').selectOption('price-image');
    await expect(dialog.locator('#cfg-' + kind + '-tagShape')).toHaveValue('price-image');
    for (const [key, value] of Object.entries(colors)) {
      const field = dialog.locator('#cfg-' + kind + '-' + key);
      await expect(field).toBeVisible();
      await field.fill(value); await field.dispatchEvent('change');
    }
    await dialog.getByRole('button', { name: 'Übernehmen', exact: true }).click();
    const request = page.waitForRequest((req) => req.url().includes('/api/cms-config')
      && req.method() !== 'GET' && req.postDataJSON().name === 'design_config');
    await page.locator('#cfg-plakat-save').click();
    saved = (await request).postDataJSON().wert;
  }
  for (const kind of ['plakat', 'flyer']) {
    expect(saved[kind + '_tagShape']).toBe('price-image');
    for (const [key, value] of Object.entries(colors)) expect(saved[kind + '_' + key]).toBe(value);
  }
  state.cmsDesign.design_config = saved;
  await cms(page);
  for (const kind of ['plakat', 'flyer']) {
    await designTab(page, 'sec-' + kind);
    const root = page.locator('#cfg-sec-' + kind);
    await designerTool(root, 3);
    await expect(root.locator('#cfg-' + kind + '-tagShape')).toHaveValue('price-image');
    for (const [key, value] of Object.entries(colors)) await expect(root.locator('#cfg-' + kind + '-' + key)).toHaveValue(value);
  }
  expect(state.errors).toEqual([]);
});

test('TC-F38-04: Original- und Magazinrenderer zeichnen das gemeinsame Preisbild mit echtem Stattpreis', { tag: '@ohne-layout' }, async ({ page }) => {
  const state = await setup(page);
  await cms(page);
  await expect(page.locator('[data-design-preview] canvas')).toBeVisible();
  const output = await page.evaluate(async () => {
    const W = window.WochenangeboteRenderer, proto = CanvasRenderingContext2D.prototype;
    await W.loadPriceFont();
    const original = proto.fillText, strokeText = proto.strokeText, stroke = proto.stroke;
    let calls = [];
    proto.fillText = function (text, ...args) { calls.push({ text, color: this.fillStyle }); return original.call(this, text, ...args); };
    proto.strokeText = function (text, ...args) { calls.push({ outline: this.strokeStyle }); return strokeText.call(this, text, ...args); };
    proto.stroke = function (...args) { calls.push({ line: this.strokeStyle }); return stroke.call(this, ...args); };
    const output = [];
    try {
      for (const template of ['classic-red', 'modern-mag-xl']) for (const kind of ['plakat', 'flyer']) for (const old of [5.49, 2.99, null]) {
        const cfg = { ...W.CFG_DEFAULTS, plakatTemplate: template, flyerTemplate: template,
          [kind + '_tagShape']: 'price-image', [kind + '_priceImageColor']: '#1234aa',
          [kind + '_priceOutlineColor']: '#ddccff', [kind + '_priceStripColor']: '#aaff22',
          [kind + '_priceOldColor']: '#112233', [kind + '_priceStrikeColor']: '#ff44aa' };
        const renderer = W.create({ cfgGet: () => cfg, flyerArtOverrideGet: () => null, plakatArtOverrideGet: () => null,
          logo: '/Logo-sm-64.png' });
        const item = { key: 'test', produkt: 'Testprodukt', preis: 2.99, statt_preis: old, bild_data: '' };
        const data = { von: '2026-11-16', bis: '2026-11-22', items: [item] };
        calls = [];
        if (kind === 'flyer') await renderer.generateEinzelflyer(item, data, cfg);
        else await new Promise((resolve) => renderer.drawAngebotPlakat(data, [item], [null], resolve, cfg, { returnCanvas: true }));
        output.push({ template, kind, old, calls: [...calls] });
      }
    } finally { proto.fillText = original; proto.strokeText = strokeText; proto.stroke = stroke; }
    return output;
  });
  for (const entry of output) {
    expect(entry.calls.filter((call) => call.color === '#1234aa').map((call) => call.text)).toEqual(['2.', '99']);
    expect(entry.calls.filter((call) => call.outline === '#ddccff')).toHaveLength(2);
    expect(entry.calls.filter((call) => call.color === '#112233').map((call) => call.text)).toEqual(entry.old > 2.99 ? ['5,49 €'] : []);
    expect(entry.calls.filter((call) => call.line === '#ff44aa')).toHaveLength(entry.old > 2.99 ? 1 : 0);
  }
  expect(state.errors).toEqual([]);
});

test('TC-F39-01/03: getrennte CMS-Verläufe mit Undo, Redo und ausdrücklichem Speichern', async ({ page }) => {
  const state = await setup(page);
  await cms(page);
  await workspaceView(page.locator('[data-designer=drinks]'), 'split');
  await expect(page.locator('[data-design-preview] canvas')).toBeVisible();
  for (const kind of ['plakat', 'flyer']) {
    await designTab(page, 'sec-' + kind);
    const root = page.locator('#cfg-sec-' + kind), undo = root.locator('[data-design-history=undo]'), redo = root.locator('[data-design-history=redo]');
    await expect(undo).toBeDisabled(); await expect(redo).toBeDisabled();
    await designerTool(root, 3);
    const shape = root.locator('#cfg-' + kind + '-tagShape');
    await setField(page, root, shape, 'price-image');
    await expect(undo).toBeEnabled(); await undo.click(); await expect(shape).toHaveValue('rect');
    await expect(redo).toBeEnabled(); await redo.click(); await expect(shape).toHaveValue('price-image');
    await undo.click(); await setField(page, root, shape, 'rounded'); await expect(redo).toBeDisabled();
  }
  await designTab(page, 'sec-plakat');
  await page.locator('#cfg-sec-plakat [data-design-history=undo]').click();
  await expect(page.locator('#cfg-plakat-tagShape')).toHaveValue('rect');
  await expect(page.locator('#cfg-flyer-tagShape')).toHaveValue('rounded');
  expect(state.log.filter((r) => r.path === '/api/cms-config' && r.method !== 'GET')).toEqual([]);
  const request = page.waitForRequest((r) => r.url().includes('/api/cms-config') && r.method() !== 'GET');
  await page.locator('#cfg-plakat-save').click();
  expect((await request).postDataJSON().wert).toMatchObject({ plakat_tagShape: 'rect', flyer_tagShape: 'rounded' });
  expect(state.errors).toEqual([]);
});

test('TC-F39-01/02: Getränkedesign mit Farbverlauf, gruppiertem Ziehen und nativen Textkürzeln', async ({ page }) => {
  const state = await setup(page);
  await cms(page);
  const root = page.locator('#an-design-root'), host = root.locator('[data-design-preview]');
  const undo = root.locator('[data-design-history=undo]'), redo = root.locator('[data-design-history=redo]');
  await workspaceView(root, 'split');
  await expect(host.locator('canvas')).toBeVisible(); await expect(undo).toBeDisabled();
  await designerTool(root, 1);
  const color = root.locator('[data-style=color]'), initial = await color.inputValue();
  await setField(page, root, color, '#1234aa');
  await undo.click(); await expect(color).toHaveValue(initial);
  await redo.click(); await expect(color).toHaveValue('#1234aa');
  await undo.click(); await setField(page, root, color, '#223344'); await expect(redo).toBeDisabled();
  await designerTool(root, 'tools');
  await root.locator('[data-preview-element]').selectOption('sheet:0:image:0');
  const hit = host.locator('[data-preview-select="sheet:0:image:0"]'), box = await hit.boundingBox();
  await hit.dispatchEvent('pointerdown', { pointerId: 81, pointerType: 'touch', button: 0, clientX: box.x + 5, clientY: box.y + 5 });
  for (const step of [10, 20, 30]) await page.dispatchEvent('body', 'pointermove', {
    pointerId: 81, pointerType: 'touch', clientX: box.x + 5 + step, clientY: box.y + 15,
  });
  await page.dispatchEvent('body', 'pointerup', { pointerId: 81, pointerType: 'touch' });
  await undo.click();
  await root.locator('[data-design-save]').click();
  await expect(root.locator('[data-design-status]')).toContainText('gespeichert');
  expect(state.design.drinks.color).toBe('#223344');
  expect(state.design.drinks.adjustments || {}).toEqual({});
  await redo.click();
  await root.locator('[data-design-save]').click();
  await expect(root.locator('[data-design-status]')).toContainText('gespeichert');
  expect(state.design.version).toBe(2);
  expect(state.design.drinks.adjustments['sheet:0:image:0'].dx).toBeGreaterThan(0);
  await designerTool(root, 4);
  await openDetails(root.locator('.an-own-presets'));
  const name = root.locator('[data-preset-name]');
  await name.fill('Unabhängige Texteingabe');
  const allowed = await name.evaluate((node) => node.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true })));
  expect(allowed).toBe(true);
  await undo.focus(); await page.keyboard.press('Control+z'); await expect(redo).toBeEnabled();
  expect(state.design.version).toBe(2);
  expect(state.errors).toEqual([]);
});

test('TC-F38-07: Bild- und Preisposition nutzen breite Container nebeneinander', async ({ page }) => {
  const state = await setup(page);
  await cms(page);
  await designTab(page, 'sec-flyer');
  const root = page.locator('#cfg-sec-flyer');
  await designerTool(root, 2);
  const grid = root.locator('.cfg-anchor-grid'), groups = grid.locator('.cfg-anchor-group');
  const check = async () => {
    const [image, price, width] = await Promise.all([groups.nth(0).boundingBox(), groups.nth(1).boundingBox(), grid.evaluate((node) => node.clientWidth)]);
    if (width - 24 >= 414) {
      expect(Math.abs(image.y - price.y)).toBeLessThan(2);
      expect(price.x).toBeGreaterThan(image.x + image.width - 1);
    } else expect(price.y).toBeGreaterThanOrEqual(image.y + image.height);
    await noOverflow(page, '#cfg-sec-flyer');
  };
  await check();
  if (page.viewportSize().width >= 1200) {
    await page.setViewportSize({ width: 1920, height: 1080 }); await check();
    expect((await groups.nth(1).boundingBox()).y).toBe((await groups.nth(0).boundingBox()).y);
  }
  await groups.nth(0).locator('button[title="nach rechts"]').click();
  await expect(page.locator('#cfg-flyer-imgAnchorX')).toHaveValue('20');
  await root.locator('[data-design-history=undo]').click();
  await expect(page.locator('#cfg-flyer-imgAnchorX')).toHaveValue('10');
  await page.screenshot({ path: test.info().outputPath('positionen-kompakt.png') });
  expect(state.errors).toEqual([]);
});

test('TC-F38-04: Preisbild wartet auf lokale Anton-Schrift und setzt Cent eng an', { tag: '@ohne-layout' }, async ({ page }) => {
  const state = await setup(page);
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  await page.route('**/fonts/Anton-Regular.ttf', async (route) => { await gate; await route.fallback(); });
  const fontRequest = page.waitForRequest('**/fonts/Anton-Regular.ttf');
  await page.evaluate(() => {
    const M = window.AngeboteModel, layout = M.blank('drinks').layout;
    M.useTemplate(layout, 'price-image');
    const data = M.blank('drinks', layout);
    data.items.push(Object.assign(M.item(), { name: 'Testprodukt', price_cents: 1249, old_price_cents: 1499,
      units: 20, volume_ml: 500, packaging: 'Mehrweg', deposit_cents: 310 }));
    M.applyTemplate(data); window.__fontDone = false;
    window.__fontRender = M.render(data, 0, 1).then((result) => {
      window.__fontDone = true;
      const host = document.createElement('div'); host.id = 'font-result'; host.appendChild(result.canvas);
      document.body.replaceChildren(host);
    });
  });
  await fontRequest;
  expect(await page.evaluate(() => window.__fontDone)).toBe(false);
  release();
  await page.evaluate(() => window.__fontRender);
  const typography = await page.evaluate(() => {
    const canvas = document.querySelector('#font-result canvas'), ctx = canvas.getContext('2d');
    ctx.font = '160px Anton'; const narrow = ctx.measureText('12.49').width;
    ctx.font = 'bold 160px Arial'; const wide = ctx.measureText('12.49').width;
    const calls = [], original = ctx.fillText;
    ctx.fillText = function (text, x, y) { calls.push({ text, x, y, width: this.measureText(text).width }); return original.call(this, text, x, y); };
    window.WochenangeboteRenderer.drawPriceImage(ctx, { w: 400, h: 220, font: 'Arial', font_size: 160, align: 'left' },
      { price_cents: 1249, old_price_cents: 1499 }, {});
    return { loaded: document.fonts.check('160px Anton'), ratio: narrow / wide, main: calls[0], cents: calls[1] };
  });
  expect(typography.loaded).toBe(true);
  expect(typography.ratio).toBeLessThan(0.92);
  expect(typography.cents.x).toBeLessThan(typography.main.x + typography.main.width);
  expect(typography.cents.y).toBeLessThan(typography.main.y);
  await page.locator('#font-result canvas').screenshot({ path: test.info().outputPath('preisbild-schmalschrift.png') });
  expect(state.errors).toEqual([]);
});

test('TC-F40-01/02: HP-Designer mit echter bebilderter Vorschau, kompakten Reitern und Undo', async ({ page }) => {
  const state = await setup(page, { legacyArticleNumber: 'LEGACY-IMAGE' });
  const action = await seed(page, state, { count: 8, publish: true });
  const id = uid(); state.images.set(id, PHOTO); state.published.get(action.id).data.items[0].image_id = id;
  const before = copy(action);
  await cms(page); await designTab(page, 'cfg-hpang');
  const root = page.locator('#cms-cfg-hpang'), preview = root.locator('.an-designer-preview'), settings = root.locator('.an-designer-settings');
  await expect(root).toHaveAttribute('data-designer', 'homepage');
  await workspaceView(root, 'split');
  await expect(root.locator('[role=tab]')).toHaveText(['Farben', 'Preis-Tag', 'Layout', 'Werkzeuge']);
  await expect(root.locator('#hpang-preview .an-hp-card')).toHaveCount(9);
  await expect(root.locator('#hpang-preview .an-hp-card').first()).toContainText('Bisheriges Wochenangebot');
  await expect(root.locator('#hpang-preview .an-hp-card').first().locator('img')).toBeVisible();
  await expect(root.locator('#hpang-preview .an-hp-card').nth(1).locator('img')).toBeVisible();
  expect(await root.locator('#hpang-preview img').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0))).toBe(true);
  await expect(root.locator('#hpang-preview img').first()).toHaveCSS('filter', 'none');
  const original = await (await page.request.get(BASE + '/cms.html')).text();
  const ids = await page.evaluate((html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return [...doc.querySelectorAll('#cms-cfg-hpang input')].map((node) => node.id).sort();
  }, original);
  expect(await root.locator('input').evaluateAll((nodes) => nodes.map((node) => node.id).sort())).toEqual(ids);
  const undo = root.locator('[data-design-history=undo]'), redo = root.locator('[data-design-history=redo]');
  await expect(undo).toBeDisabled(); await expect(redo).toBeDisabled();
  const color = root.locator('#hpang-cardBg');
  await color.fill('#aabbcc'); await color.dispatchEvent('input');
  await undo.click(); await expect(color).toHaveValue('#ffffff');
  await redo.click(); await expect(color).toHaveValue('#aabbcc');
  const [p, s] = await Promise.all([preview.boundingBox(), settings.boundingBox()]);
  if (await root.evaluate((node) => node.classList.contains('an-split-mobile') || !!node.querySelector('.an-split-mobile'))) expect(s.y + s.height).toBeLessThanOrEqual(p.y + 1);
  else expect(s.x + s.width).toBeLessThanOrEqual(p.x + 1);
  await expect(preview).toHaveCSS('overflow-y', 'auto');
  await designerTool(root, 'tools');
  await root.locator('[data-picture-zoom]').selectOption('2');
  await preview.scrollIntoViewIfNeeded();
  const documentScroll = await page.evaluate(() => document.scrollingElement.scrollTop);
  await preview.hover({ position: { x: 30, y: 80 } }); await page.mouse.wheel(0, 250);
  await expect.poll(() => preview.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.scrollingElement.scrollTop)).toBe(documentScroll);
  for (const [tab, field] of [[1, '#hpang-tagSkew'], [2, '#hpang-imgSize']]) {
    await designerTool(root, tab);
    await expect(root.locator(field)).toBeVisible();
  }
  await root.locator('[data-action=hpangSave]').click();
  await expect.poll(() => state.design.homepage?.cardBg).toBe('#aabbcc');
  expect(state.actions.get(action.id)).toEqual(before);
  await noOverflow(page, '#cms-cfg-hpang');
  await page.screenshot({ path: test.info().outputPath('homepage-designer-echte-bilder.png') });
  expect(state.errors).toEqual([]);
});

test('TC-F40-02/03: HP-Vorschau lädt Daten und Bilder nach Fehlern erneut und zeigt echte Leerzustände', async ({ page }) => {
  const state = await setup(page, { legacyArticleNumber: 'LEGACY-RETRY' });
  await cms(page);
  await workspaceView(page.locator('[data-designer=drinks]'), 'split');
  await expect(page.locator('[data-design-preview] canvas')).toBeVisible();
  state.failOffers = true;
  await designTab(page, 'cfg-hpang');
  const root = page.locator('#cms-cfg-hpang');
  await workspaceView(root, 'split');
  await expect(root.locator('#hpang-preview [role=alert]')).toContainText('nicht geladen');
  state.failOffers = false; state.failImageLookup = true;
  await root.locator('[data-hpang-retry]').click();
  await expect(root.locator('.an-hp-image')).toContainText('Bild nicht verfügbar');
  state.failImageLookup = false;
  await root.locator('.an-hp-image').getByRole('button', { name: 'Erneut laden' }).click();
  await expect(root.locator('.an-hp-image img')).toBeVisible();
  await root.locator('#hpang-cardBg').fill('#112233'); await root.locator('#hpang-cardBg').dispatchEvent('input');
  await root.locator('[data-more-actions]').click();
  await root.locator('[data-action=hpangRevert]').click();
  await expect(root.locator('#hpang-cardBg')).toHaveValue('#ffffff');
  await expect(root.locator('[data-design-history=undo]')).toBeDisabled();
  expect(state.log.filter((r) => r.method !== 'GET' && !r.read_only_lookup && r.path.startsWith('/api/angebote'))).toEqual([]);
  state.emptyOffers = true;
  await cms(page); await designTab(page, 'cfg-hpang');
  await workspaceView(root, 'split');
  await expect(root.locator('#hpang-preview')).toContainText('Aktuell keine Angebote');
  await expect(root.locator('#hpang-preview .an-hp-card')).toHaveCount(0);
  expect(state.errors).toEqual([]);
});

test('TC-F40-04: Produktbilder bleiben in Originalflyern und allen Getränkezielen schattenfrei', { tag: '@ohne-layout' }, async ({ page }) => {
  const state = await setup(page); await cms(page);
  const samples = await page.evaluate(async () => {
    const W = window.WochenangeboteRenderer, M = window.AngeboteModel;
    const source = document.createElement('canvas'); source.width = 64; source.height = 96;
    source.getContext('2d').fillRect(8, 8, 48, 80);
    const encoded = source.toDataURL(), img = new Image(); img.src = encoded; await img.decode();
    const proto = CanvasRenderingContext2D.prototype, draw = proto.drawImage, calls = [];
    proto.drawImage = function (image, ...args) {
      if (image.width === 64 && image.height === 96) calls.push({ shadow: this.shadowColor.replace(/\s/g, ''), filter: this.filter });
      return draw.call(this, image, ...args);
    };
    try {
      for (const template of ['classic-red', 'modern-mag-xl']) for (const kind of ['plakat', 'flyer']) {
        const cfg = { ...W.CFG_DEFAULTS, plakatTemplate: template, flyerTemplate: template };
        const renderer = W.create({ cfgGet: () => cfg, flyerArtOverrideGet: () => null, plakatArtOverrideGet: () => null, logo: '/Logo-sm-64.png' });
        const item = { key: 'shadow-test', produkt: 'Produkt', preis: 2.99, statt_preis: 3.99, bild_data: encoded };
        const data = { von: '2026-11-16', bis: '2026-11-22', items: [item] };
        if (kind === 'flyer') await renderer.generateEinzelflyer(item, data, cfg);
        else await new Promise((resolve) => renderer.drawAngebotPlakat(data, [item], [img], resolve, cfg, { returnCanvas: true }));
      }
      M.registerImage('cms:shadow-test', encoded);
      const data = M.blank('drinks');
      data.items.push(Object.assign(M.item(), { name: 'Produkt', image_id: 'cms:shadow-test', price_cents: 299,
        units: 20, volume_ml: 500, packaging: 'Mehrweg', deposit_cents: 310 }));
      M.applyTemplate(data);
      await M.render(data, 0, 1);
      for (const target of ['card', 'single', 'scale']) await M.renderTarget(data, target, data.items[0].id, 1);
    } finally { proto.drawImage = draw; }
    return calls;
  });
  expect(samples.length).toBeGreaterThanOrEqual(8);
  expect(samples.every((sample) => sample.shadow === 'rgba(0,0,0,0)' && sample.filter === 'none')).toBe(true);
  expect(state.errors).toEqual([]);
});

test('TC-F41-01/03: echte Getränkeproduktbilder in allen Vorschauformaten bleiben vom Design getrennt', async ({ page }) => {
  const state = await setup(page);
  state.previewOffers = [{ dl_angeboteid: uid(), dl_aktion_id: 'REAL-DRINKS', action_kind: 'drinks',
    dl_produkt: 'Echter Getränkekasten', dl_details: 'Aus dem vorhandenen Angebot',
    dl_preis: 12.49, dl_statt_preis: 14.99, dl_artikelnummer: '4001234567890',
    dl_gueltig_von: '2026-11-16', dl_gueltig_bis: '2026-11-22',
    units: 20, volume_ml: 500, packaging: 'Mehrweg', deposit_cents: 310 }];
  const original = copy(state.previewOffers);
  await page.addInitScript(() => {
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    window.__productDraws = 0;
    CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
      if (image.width === 1 && image.height === 1) window.__productDraws++;
      return draw.call(this, image, ...args);
    };
  });
  await cms(page);
  const root = page.locator('#an-design-root');
  await expect(root.locator('[data-design-products]')).toContainText('mit Produktbildern');
  await expect.poll(() => page.evaluate(() => window.__productDraws)).toBeGreaterThan(0);
  await designerTool(root, 'tools');
  for (const mode of ['cards', 'scale-large', 'scale-small', 'paper']) {
    await page.evaluate(() => { window.__productDraws = 0; });
    await root.locator('[data-design-mode="' + mode + '"]').click();
    await expect.poll(() => page.evaluate(() => window.__productDraws)).toBeGreaterThan(0);
  }
  expect(state.log.filter((r) => r.method !== 'GET' && !r.read_only_lookup && r.path.startsWith('/api/angebote'))).toEqual([]);
  await setField(page, root, root.locator('[data-style=color]'), '#1234aa');
  await root.locator('[data-design-save]').click();
  await expect(root.locator('[data-design-status]')).toContainText('gespeichert');
  expect(state.design.drinks.color).toBe('#1234aa');
  expect(JSON.stringify(state.design)).not.toContain('Echter Getränkekasten');
  expect(JSON.stringify(state.design)).not.toContain('cms:');
  expect(state.previewOffers).toEqual(original);
  await workspaceView(page.locator('[data-designer=drinks]'), 'split');
  await root.locator('[data-design-preview]').screenshot({ path: test.info().outputPath('getraenkedesigner-produktbilder.png') });
  expect(state.errors).toEqual([]);
});

test('TC-F41-02: Getränkevorschau meldet Bildfehler und fehlende Artikel ohne Gestaltungsverlust', async ({ page }) => {
  const state = await setup(page);
  state.previewOffers = [{ dl_angeboteid: uid(), dl_aktion_id: 'RETRY-DRINKS', action_kind: 'drinks',
    dl_produkt: 'Getränk', dl_preis: 12.49, dl_artikelnummer: '4001234567890',
    dl_gueltig_von: '2026-11-16', dl_gueltig_bis: '2026-11-22',
    units: 20, volume_ml: 500, packaging: 'Mehrweg', deposit_cents: 310 }];
  state.failImageLookup = true;
  await cms(page);
  const root = page.locator('#an-design-root');
  await expect(root.locator('[data-design-products][role=alert]')).toContainText('Nicht alle Produktbilder');
  await setField(page, root, root.locator('[data-style=color]'), '#445566');
  state.failImageLookup = false;
  await designerTool(root, 'tools');
  await root.locator('[data-design-products-retry]').click();
  await expect(root.locator('[data-design-products]')).toContainText('mit Produktbildern');
  await expect(root.locator('[data-style=color]')).toHaveValue('#445566');
  expect(state.log.filter((r) => r.method === 'PUT')).toEqual([]);
  state.previewOffers = [];
  await cms(page);
  await workspaceView(page.locator('[data-designer=drinks]'), 'split');
  await expect(root.locator('[data-design-products]')).toContainText('Keine Getränkeartikel vorhanden');
  await expect(root.locator('[data-design-preview] canvas')).toBeVisible();
  expect(state.errors).toEqual([]);
});