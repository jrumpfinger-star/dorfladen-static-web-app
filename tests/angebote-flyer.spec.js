const { test, expect } = require('@playwright/test');
const crypto = require('crypto');

const BASE = process.env.TEST_URL || 'http://127.0.0.1:8817';
const NOW = '2026-11-18';
const PHOTO = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6hywAAAAASUVORK5CYII=', 'base64');
const copy = (value) => structuredClone(value);
const uid = () => crypto.randomBytes(16).toString('hex');
const hash = (value, n) => crypto.createHash('sha256').update(value).digest('hex').slice(0, n);

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
      if (state.loginReply) await state.loginReply;
      return state.failLogin ? fail(503, 'Die CMS-Anmeldung ist gerade nicht erreichbar.') : json({ success: true, token: 'test-auth' });
    }
    if (path === '/api/angebote') return json({ success: true, data: [{
      dl_angeboteid: 'legacy-one', dl_produkt: 'Bisheriges Wochenangebot', dl_preis: 2.49, dl_statt_preis: 2.99,
      dl_aktion_id: 'legacy-action', dl_gueltig_von: '2026-11-15', dl_gueltig_bis: '2026-11-21',
    }] });
    if (path === '/api/getraenke-artikel') return json({ artikel: [{ nummer: 'KA40015', name: 'Unser Testgetränk',
      gebinde: '20x0,50', pfand: 3.10, preis: 99.99, bestelltext: 'NICHT VERÖFFENTLICHEN', aktiv: true }], gruppen: [], pfand: [] });
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

for (const failLogin of [false, true]) {
  test(`TC-F9-01/F4-01: erster CMS-Login ${failLogin ? 'meldet Serverfehler und erlaubt erneute Anmeldung' : 'wartet vor geschütztem Designabruf'}`, async ({ page }) => {
    const state = await setup(page, { loggedOut: true });
    state.failLogin = failLogin;
    const password = 'test-cms-password';
    await page.route('**/cms.html**', async (route) => {
      const response = await route.fetch();
      const html = await response.text();
      const pattern = /(<script\b[^>]*\bid="cms-pw-hash"[^>]*>)[\s\S]*?(<\/script>)/;
      expect(html).toMatch(pattern);
      await route.fulfill({ response, body: html.replace(pattern, (_, open, close) => open + JSON.stringify(hash(password, 64)) + close) });
    });
    try {
      await page.goto(BASE + '/cms.html?tab=cfg&flyer=drinks');
      await page.locator('#cms-login-pw').fill(password);
      await page.locator('#cms-login-btn').click();
      const root = page.locator('#an-design-root');
      await expect(root.getByRole('status')).toContainText('CMS-Anmeldung wird abgeschlossen');
      expect(state.log.filter((r) => r.path.startsWith('/api/angebote-verwaltung'))).toHaveLength(0);
      await expect(page.getByText('Admin-Anmeldung', { exact: true })).toHaveCount(0);
      state.finishLogin();
      if (failLogin) {
        await expect(root.getByRole('alert')).toContainText('CMS-Anmeldung konnte nicht abgeschlossen werden');
        await page.locator('dialog[open]').getByRole('button', { name: 'Schließen', exact: true }).click();
        state.failLogin = false;
        await page.locator('[data-id=sec-drinks]').click();
        const login = page.getByRole('dialog').filter({ hasText: 'Admin-Anmeldung' });
        await login.getByRole('textbox').fill(password);
        await login.getByRole('button', { name: 'Anmelden', exact: true }).click();
      }
      await expect(root.getByRole('heading', { name: 'Getränkeflyer-Design' })).toBeVisible();
      expect(state.log.filter((r) => r.path === '/api/cms-auth')).toHaveLength(failLogin ? 2 : 1);
      await expect(page.getByText('Admin-Anmeldung', { exact: true })).toHaveCount(0);
      expect(state.errors).toEqual([]);
    } finally { state.finishLogin(); }
  });
}

for (const cmsMode of [true, false]) {
  test(`TC-F10-01..04: Layoutkacheln, Tastatur und Ausgabevorschauen im ${cmsMode ? 'CMS' : 'Aktionseditor'}`, async ({ page }) => {
    const state = await setup(page), head = await seed(page, state, { count: 7 });
    if (cmsMode) await cms(page);
    else {
      await page.reload();
      await page.locator('[data-open="' + head.id + '"]').click();
      await page.getByRole('button', { name: '2 · Gestalten' }).click();
    }
    const host = page.locator(cmsMode ? '#an-design-root' : '#an-step-design');
    await expect(host.locator('[data-template-preview] canvas')).toHaveCount(2);
    const sizes = await host.locator('[data-template-preview] canvas').evaluateAll((nodes) => nodes.map((c) => [c.width, c.height]));
    expect(sizes.every(([w, h]) => w > 100 && h > w)).toBe(true);
    await expect(host.locator('select[data-style=template],select[data-style=density]')).toHaveCount(0);
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
    for (const mode of ['cards', 'scale-large', 'scale-small', 'paper']) {
      const button = page.locator('[' + attribute + '="' + mode + '"]');
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      const preview = page.locator(cmsMode ? '[data-design-preview]' : mode === 'paper' ? '#an-stage' : '#an-other-preview');
      await expect(preview.locator(mode === 'cards' ? '.an-product' : 'canvas').first()).toBeVisible();
      if (!cmsMode) await expect(page.locator('#an-stage')).toBeVisible({ visible: mode === 'paper' });
      expect(cmsMode ? state.design : state.actions.get(head.id)).toEqual(stored);
    }
    await noOverflow(page, cmsMode ? '#an-design-root' : 'html');
    await page.screenshot({ path: test.info().outputPath('layout-auswahl.png'), fullPage: true });
    await host.locator('.an-choice-group').first().screenshot({ path: test.info().outputPath('stil-kacheln.png') });
    await page.reload();
    if (!cmsMode) {
      await page.locator('[data-open="' + head.id + '"]').click();
      await page.getByRole('button', { name: '2 · Gestalten' }).click();
    }
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
  expect(state.log.filter((r) => r.method !== 'GET' && r.path !== '/api/track' && !r.path.startsWith('/api/angebote-'))).toEqual([]);
});

test('TC-F1-02..03/F2-01..03/F4-01: Katalog, eigene Verkaufspreise, Pfand und unvollständiger Entwurf', async ({ page }) => {
  const state = await setup(page);
  await page.getByRole('button', { name: '+ Getränkeaktion anlegen' }).click();
  await page.getByRole('button', { name: 'Aus Getränkekatalog' }).click();
  await page.getByRole('button', { name: /Unser Testgetränk/ }).click();
  await expect(page.getByLabel('Angebotspreis € 1', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Anzahl Flaschen / Einheiten 1')).toHaveValue('20');
  await expect(page.getByLabel('Liter je Einheit 1')).toHaveValue('0.5');
  await saveDraft(page);
  const draft = [...state.actions.values()][0];
  expect(draft.draft.items[0].price_cents).toBeNull();
  expect(JSON.stringify(draft)).not.toContain('99.99');
  expect(JSON.stringify(draft)).not.toContain('NICHT VERÖFFENTLICHEN');
  await page.getByRole('button', { name: '3 · Ausgeben' }).click();
  await page.locator('#an-publish').click();
  await expect(page.locator('dialog[open]')).toContainText('Angebotspreis');
  await page.locator('dialog[open]').getByRole('button', { name: 'Schließen', exact: true }).click();
  expect(state.published.size).toBe(0);
  await page.getByRole('button', { name: '1 · Artikel' }).click();
  await page.getByLabel('Angebotspreis € 1', { exact: true }).fill('12.49');
  await page.getByLabel('Gebindeart 1').selectOption('Mehrweg');
  await page.getByLabel('Pfandentscheidung 1').selectOption('no');
  await expect(page.getByLabel('Gesamtpfand € 1')).toHaveValue('0.00');
  await expect(page.getByLabel('Gesamtpfand € 1')).toBeDisabled();
  await page.getByLabel('Pfandentscheidung 1').selectOption('yes');
  await page.getByLabel('Gesamtpfand € 1').fill('3.10');
  await page.getByLabel('Gesamtpfand € 1').blur();
  await expect(page.locator('[data-unit-price]')).toContainText('1,25 €/l');
  await page.locator('[data-highlight]').click();
  await saveDraft(page);
  expect([...state.actions.values()][0].draft.items[0]).toMatchObject({ price_cents: 1249, deposit_cents: 310, highlight: true });
  expect(state.log.filter((r) => r.method !== 'GET' && !r.path.startsWith('/api/angebote-'))).toEqual([]);
  await noOverflow(page);
  expect(state.errors).toEqual([]);
});

test('TC-F3-04: echte freie Elemente, eigenes Bild, Duplikat und gespeicherte Drehung/Transparenz', async ({ page }) => {
  const state = await setup(page), head = await editSeed(page, state);
  await page.getByLabel('Eigenes Produktbild 1', { exact: false }).setInputFiles({ name: 'produkt.png', mimeType: 'image/png', buffer: PHOTO });
  await expect(page.getByLabel(/Eigenes Produktbild 1 · Bild gespeichert/)).toBeVisible();
  await page.getByRole('button', { name: '2 · Gestalten' }).click();
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
  expect(saved.layout.mode).toBe('free');
  const own = saved.layout.pages[0].elements.filter((e) => e.type === 'text');
  expect(own).toHaveLength(2);
  expect(own[0]).toMatchObject({ text: 'Dein individueller Flyer', opacity: .65, rotation: 15 });
  expect(saved.layout.pages[0].elements.some((e) => e.type === 'image' && e.image_id)).toBe(true);
  expect(saved.items[0].image_id).toMatch(/^[a-f0-9]{32}$/);
  await page.reload();
  await page.locator('[data-open="' + head.id + '"]').click();
  await page.getByRole('button', { name: '2 · Gestalten' }).click();
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
  await page.getByRole('button', { name: '3 · Ausgeben' }).click();
  await page.locator('#an-print-action').click();
  await expect.poll(() => page.evaluate(() => window.__printCalled || 0)).toBe(1);
  await expect(page.locator('body>#an-print .an-print-page')).toHaveCount(2);
  expect(await page.locator('[id=an-print]').count()).toBe(1);
  const printed = await page.locator('#an-print img').evaluateAll((images) => images.map((img) => ({ w: img.naturalWidth, h: img.naturalHeight, url: img.src })));
  expect(printed.map(({ w, h }) => ({ w, h }))).toEqual([{ w: 1588, h: 2246 }, { w: 1588, h: 2246 }]);
  const source = await page.evaluate(async (data) => (await window.AngeboteModel.render(data, 0, 2)).canvas.toDataURL('image/png'), head.draft);
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
  expect(await card.locator('.an-price').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(28);
  const columns = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  expect(columns).toBe(page.viewportSize().width <= 480 ? 1 : page.viewportSize().width <= 850 ? 2 : 3);
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
  await page.getByLabel('Angebotspreis € 1', { exact: true }).fill('10.99');
  await saveDraft(page);
  expect(state.published.get(head.id).data.items[0].price_cents).toBe(1249);
  expect(state.actions.get(head.id).draft.items[0].price_cents).toBe(1099);
  await page.getByRole('button', { name: '3 · Ausgeben' }).click();
  await page.locator('#an-publish').click();
  await page.locator('dialog[open]').getByRole('button', { name: 'Jetzt freigeben' }).click();
  await expect(page.locator('#an-output-status')).toContainText('Freigegeben');
  expect(state.published.get(head.id).data.items[0].price_cents).toBe(1099);
  await page.getByRole('button', { name: '1 · Artikel' }).click();
  await page.getByLabel('Angebotspreis € 1', { exact: true }).fill('9.99');
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
  await expect(page.locator('#wb-ueb-start')).toBeEnabled();
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
  await page.locator('[data-up]').nth(1).click();
  await page.locator('[data-remove]').nth(1).click();
  await saveDraft(page);
  expect(state.actions.get(duplicate.id).draft.items).toHaveLength(1);
  expect(state.actions.get(duplicate.id).draft.items[0].id).toBe(head.draft.items[1].id);
  await page.getByRole('button', { name: '2 · Gestalten' }).click();
  const price = state.actions.get(duplicate.id).draft.layout.pages[0].elements.find((e) => e.type === 'price');
  await page.getByLabel('Gestaltungselement').selectOption(price.id);
  await page.getByLabel('Ausblenden', { exact: true }).check();
  await page.getByRole('button', { name: '3 · Ausgeben' }).click();
  await page.locator('#an-publish').click();
  await expect(page.locator('dialog[open]')).toContainText('Pflichtfeld');
  expect(state.published.size).toBe(0);
  expect(state.actions.get(head.id).draft.items).toHaveLength(2);
});
