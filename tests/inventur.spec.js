// @ansichten: alle
// Inventur-Web-App (/inventur): echte Seite, simulierte Server-API.
// Es werden NIE echte Daten gelesen oder geschrieben.
const { test, expect } = require('@playwright/test');

const INV1 = '11111111-1111-1111-1111-111111111111';
const INV2 = '22222222-2222-2222-2222-222222222222';
const INV3 = '33333333-3333-3333-3333-333333333333';
const MILK = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const BREAD = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const ODD = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const TOKEN = 'test-token';

function makeBackend() {
  const articles = [
    { id: MILK, name: 'Bio-Vollmilch 3,8 % · 0900', code: '9000000000011', articleCode: '9000000000011', vk: 1.79, lastEk: 1.12, tax: 9, unit: '0', unitLabel: 'Stück', supported: true, ekSuggestion: 1.12 },
    { id: BREAD, name: 'Bauernbrot · 4500', code: '9000000000028', articleCode: '9000000000028', vk: 4.5, lastEk: 0, tax: 9, unit: '3', unitLabel: 'Gramm', supported: true, ekSuggestion: 2.82 },
    { id: ODD, name: 'Sonderartikel', code: '9000000000042', articleCode: '9000000000042', vk: 1, lastEk: 0.5, tax: 9, unit: '8', unitLabel: null, supported: false, ekSuggestion: 0.5 },
  ];
  for (let i = 0; i < 60; i++) {
    const n = String(i).padStart(2, '0');
    articles.push({ id: 'dddddddd-dddd-dddd-dddd-0000000000' + n, name: 'Regionaler Beispielartikel ' + n, code: '91' + n, articleCode: '91' + n, vk: 2.99, lastEk: 1.8, tax: 9, unit: '0', unitLabel: 'Stück', supported: true, ekSuggestion: 1.8 });
  }
  const s = {
    inventories: [
      { id: INV1, name: 'Ladeninventur', year: '2026', date: '2026-11-20T08:30:00Z', status: 'aktiv', version: 'i1' },
      { id: INV2, name: 'Lagerinventur', year: '2026', date: '2026-11-20T09:15:00Z', status: 'aktiv', version: 'i1' },
      { id: INV3, name: 'Sommerinventur', year: '2026', date: '2026-07-01', status: 'abgeschlossen', version: 'i1' },
    ],
    articles,
    positions: {},
    duplicates: new Set(),
    requests: [],
    posts: [],
    unauthorized: false,
    abortNext: false,
    applyThenAbort: false,
    counter: 0,
  };
  const posKey = (inv, art) => inv + '|' + art;
  s.seed = (inv, art, quantity, version = 'p1') => { s.positions[posKey(inv, art)] = { id: 'p-' + (++s.counter), quantity, ek: 1.12, version }; };
  s.external = (inv, art, quantity, version) => { Object.assign(s.positions[posKey(inv, art)], { quantity, version }); };
  s.pos = (inv, art) => s.positions[posKey(inv, art)];
  const pub = p => p && { id: p.id, quantity: p.quantity, ek: p.ek, version: p.version };
  const bump = v => v.replace(/\d+$/, n => String(Number(n) + 1));

  s.handle = (method, params, body) => {
    if (method === 'GET') {
      switch (params.get('action')) {
        case 'inventories': return [200, { inventories: s.inventories }];
        case 'inventory': {
          const inv = s.inventories.find(i => i.id === params.get('id'));
          const locked = Object.keys(s.positions).some(k => k.startsWith(inv.id));
          return [200, { inventory: { ...inv, nameLocked: locked } }];
        }
        case 'articles': {
          const q = (params.get('q') || '').toLowerCase();
          const after = params.get('after');
          const rows = s.articles.filter(a => a.name.toLowerCase().includes(q) && (!after || a.name > after))
            .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
          const page = rows.slice(0, 50);
          return [200, { articles: page, hasMore: rows.length > 50, after: rows.length > 50 ? page[page.length - 1].name : null }];
        }
        case 'article': {
          const a = s.articles.find(x => x.code === params.get('barcode'));
          return a ? [200, { article: a }] : [404, { error: 'article_not_found', message: 'Artikel nicht gefunden – bitte erneut scannen oder Barcode prüfen.' }];
        }
        case 'position': {
          const inv = params.get('inventory'), art = params.get('article');
          if (s.duplicates.has(posKey(inv, art))) return [409, { error: 'duplicate_position', message: 'Für diesen Artikel gibt es mehrere Positionen. Aus Sicherheitsgründen wird nichts geändert.' }];
          return [200, { position: pub(s.pos(inv, art)) || null }];
        }
      }
      return [400, { error: 'unknown_action', message: 'Unbekannte Anfrage.' }];
    }
    if (body.action === 'savePosition') {
      const cur = s.pos(body.inventoryId, body.articleId);
      const total = body.plus === null ? body.quantity : (body.quantity || 0) + body.plus;
      const apply = () => {
        if (cur) { cur.quantity = total; cur.version = bump(cur.version); }
        else s.positions[posKey(body.inventoryId, body.articleId)] = { id: 'p-' + (++s.counter), quantity: total, ek: 1.12, version: 'p1' };
        return pub(s.pos(body.inventoryId, body.articleId));
      };
      if (s.applyThenAbort) { s.applyThenAbort = false; apply(); return ['abort']; }
      if (cur ? body.baseVersion !== cur.version : body.baseVersion) {
        return [409, { error: 'conflict', message: 'Die Position wurde inzwischen geändert. Es wurde nichts gespeichert.', current: pub(cur) || null }];
      }
      return [200, { position: apply() }];
    }
    if (body.action === 'saveInventory') {
      const inv = s.inventories.find(i => i.id === body.id);
      if (!inv) {
        const created = { id: 'eeeeeeee-eeee-eeee-eeee-' + String(s.inventories.length).padStart(12, '0'), name: body.name, year: body.year, date: body.date, status: body.status || null, version: 'i1' };
        s.inventories.push(created);
        return [200, { inventory: created }];
      }
      if (body.baseVersion !== inv.version) return [409, { error: 'conflict', message: 'Die Inventur wurde inzwischen geändert. Es wurde nichts gespeichert.', current: inv }];
      Object.assign(inv, { name: body.name, year: body.year, date: body.date || null, status: body.status || null, version: bump(inv.version) });
      return [200, { inventory: inv }];
    }
    return [400, { error: 'unknown_action', message: 'Unbekannte Anfrage.' }];
  };
  return s;
}

async function setup(page, { token = true, backend = makeBackend() } = {}) {
  await page.route('https://unpkg.com/**', route => route.abort());
  await page.route('**/api/cms-auth', async route => {
    const data = route.request().postDataJSON() || {};
    if (data.password === 'richtig') await route.fulfill({ status: 200, json: { token: TOKEN } });
    else await route.fulfill({ status: 401, json: { error: 'invalid password' } });
  });
  await page.route('**/api/inventur**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const body = request.method() === 'POST' ? request.postDataJSON() : null;
    backend.requests.push({ method: request.method(), params: Object.fromEntries(url.searchParams), headers: request.headers() });
    if (body) backend.posts.push(body);
    if (backend.unauthorized || request.headers()['x-cms-auth'] !== TOKEN) {
      await route.fulfill({ status: 401, json: { error: 'unauthorized', message: 'Bitte anmelden.' } });
      return;
    }
    if (body && backend.abortNext) { backend.abortNext = false; await route.abort('failed'); return; }
    const result = backend.handle(request.method(), url.searchParams, body);
    if (result[0] === 'abort') { await route.abort('failed'); return; }
    await route.fulfill({ status: result[0], json: result[1] });
  });
  if (token) await page.addInitScript(value => localStorage.setItem('cms_auth_token', value), TOKEN);
  await page.goto('/inventur');
  return backend;
}

async function choose(page, text) {
  await page.locator('#search').fill(text);
  const item = page.locator('#results .result', { hasText: text }).first();
  await expect(item).toBeVisible();
  await item.click();
  await expect(page.locator('#quantity')).toBeEnabled();
}
async function change(page, id, value) {
  await page.locator('#' + id).fill(value);
  await page.locator('#' + id).press('Tab');
}
async function goSettings(page) {
  await page.locator('#menu-open').click();
  await page.locator('#go-settings').click();
}
const saves = backend => backend.posts.filter(p => p.action === 'savePosition');

test('ohne Anmeldung zeigt die Seite nur die Anmeldung und ruft keine Daten ab', async ({ page }) => {
  const backend = await setup(page, { token: false });
  await expect(page.locator('#login-screen')).toBeVisible();
  await expect(page.locator('#capture-screen')).toBeHidden();
  await expect(page.locator('#context')).toBeHidden();
  expect(backend.requests).toEqual([]);
  await page.locator('#login-password').fill('falsch');
  await page.locator('#login-submit').click();
  await expect(page.locator('#login-error')).toContainText('Passwort stimmt nicht');
  expect(backend.requests).toEqual([]);
  await page.locator('#login-password').fill('richtig');
  await page.locator('#login-submit').click();
  await expect(page.locator('#capture-screen')).toBeVisible();
  await expect(page.locator('#inventory option')).toHaveText(['Ladeninventur', 'Lagerinventur']);
  expect(backend.requests.every(r => r.headers['x-cms-auth'] === TOKEN)).toBe(true);
});

test('abgelaufene Sitzung blendet Daten aus, erhält den Entwurf und bucht nichts nach', async ({ page }) => {
  const backend = await setup(page);
  backend.seed(INV1, MILK, 12);
  await choose(page, 'Vollmilch');
  await expect(page.locator('#quantity')).toHaveValue('12');
  await page.locator('#plus').fill('5');
  backend.unauthorized = true;
  await page.locator('#plus').press('Tab');
  await expect(page.locator('#login-screen')).toBeVisible();
  await expect(page.locator('#capture-screen')).toBeHidden();
  expect(saves(backend)).toHaveLength(1);
  backend.unauthorized = false;
  await page.locator('#login-password').fill('richtig');
  await page.locator('#login-submit').click();
  await expect(page.locator('#capture-screen')).toBeVisible();
  await expect(page.locator('#plus')).toHaveValue('5');
  expect(saves(backend)).toHaveLength(1);
  expect(backend.pos(INV1, MILK).quantity).toBe(12);
});

test('neue Position wird mit Menge gespeichert', async ({ page }) => {
  const backend = await setup(page);
  await choose(page, 'Vollmilch');
  await expect(page.locator('#ek')).toContainText('1,12');
  await expect(page.locator('#status-text')).toHaveText('Neue Position · noch nicht gespeichert');
  await change(page, 'quantity', '4');
  await expect(page.locator('#status-text')).toHaveText('Gespeichert');
  expect(saves(backend)).toEqual([{ action: 'savePosition', inventoryId: INV1, articleId: MILK, quantity: 4, plus: null, baseVersion: null }]);
});

test('Plus wird zur Basis addiert, einmal gebucht und danach geleert', async ({ page }) => {
  const backend = await setup(page);
  backend.seed(INV1, MILK, 12);
  await choose(page, 'Vollmilch');
  await expect(page.locator('#quantity')).toHaveValue('12');
  await change(page, 'plus', '5');
  await expect(page.locator('#status-text')).toHaveText('Gespeichert');
  await expect(page.locator('#quantity')).toHaveValue('17');
  await expect(page.locator('#plus')).toHaveValue('');
  expect(saves(backend)).toEqual([{ action: 'savePosition', inventoryId: INV1, articleId: MILK, quantity: 12, plus: 5, baseVersion: 'p1' }]);
  await page.locator('#add').click();
  expect(saves(backend)).toHaveLength(1);
});

test('ungültige Eingaben werden abgelehnt und nicht gesendet', async ({ page }) => {
  const backend = await setup(page);
  await choose(page, 'Vollmilch');
  await change(page, 'quantity', '1,5');
  await expect(page.locator('#message')).toBeVisible();
  await expect(page.locator('#message-text')).toContainText('ganze Zahl');
  await page.locator('#message-close').click();
  await expect(page.locator('#quantity')).toHaveAttribute('aria-invalid', 'true');
  await change(page, 'quantity', '2147483648');
  await expect(page.locator('#message-text')).toContainText('außerhalb');
  await page.locator('#message-close').click();
  expect(saves(backend)).toHaveLength(0);
});

test('Eingabetaste speichert Menge oder Plus und schließt die Eingabe', async ({ page }) => {
  const backend = await setup(page);
  await choose(page, 'Vollmilch');
  await page.locator('#quantity').fill('7');
  await page.locator('#quantity').press('Enter');
  await expect(page.locator('#status-text')).toHaveText('Gespeichert');
  expect(saves(backend)).toEqual([{ action: 'savePosition', inventoryId: INV1, articleId: MILK, quantity: 7, plus: null, baseVersion: null }]);
  expect(await page.evaluate(() => document.activeElement.id)).not.toBe('quantity');
  await page.locator('#plus').fill('3');
  await page.locator('#plus').press('Enter');
  await expect(page.locator('#quantity')).toHaveValue('10');
  expect(saves(backend)).toHaveLength(2);
  expect(saves(backend)[1]).toMatchObject({ quantity: 7, plus: 3, baseVersion: 'p1' });
  await page.locator('#quantity').focus();
  await page.locator('#quantity').press('Enter');
  expect(saves(backend)).toHaveLength(2);
  expect(await page.evaluate(() => document.activeElement.id)).not.toBe('quantity');
});

test('Bei geöffneter Tastatur bleibt der Artikel sichtbar', async ({ page }) => {
  await setup(page);
  await choose(page, 'Vollmilch');
  await page.setViewportSize({ width: 375, height: 340 });
  await page.locator('#quantity').click();
  await expect(page.locator('#app')).toHaveClass(/keyboard/);
  await expect(page.locator('#article-name')).toBeVisible();
  const m = await page.evaluate(() => {
    const box = id => { const r = document.getElementById(id).getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; };
    return { name: box('article-name'), quantity: box('quantity'), save: box('save'), status: box('status'), ih: innerHeight,
      scrollHeight: document.documentElement.scrollHeight };
  });
  for (const part of ['name', 'quantity', 'save', 'status']) {
    expect(m[part].top, part).toBeGreaterThanOrEqual(0);
    expect(m[part].bottom, part).toBeLessThanOrEqual(m.ih);
  }
  expect(m.name.bottom).toBeLessThanOrEqual(m.quantity.top);
  await expect(page.locator('#article-name')).toContainText('Vollmilch');
  // Nach Eingabe und Eingabetaste: gespeichert, Tastaturansicht endet, volle Ansicht kehrt zurück.
  await page.locator('#quantity').fill('5');
  await page.locator('#quantity').press('Enter');
  await expect(page.locator('#status-text')).toHaveText('Gespeichert');
  await expect(page.locator('#app')).not.toHaveClass(/keyboard/);
  expect(await page.evaluate(() => document.activeElement.id)).not.toMatch(/^(quantity|plus)$/);
  await expect(page.locator('#search')).toBeVisible();
  await expect(page.locator('#context')).toBeVisible();
  await expect(page.locator('#ek')).toBeVisible();
});

test('Speichern über die Schaltfläche beendet die Tastaturansicht ebenfalls', async ({ page }) => {
  await setup(page);
  await choose(page, 'Vollmilch');
  await page.setViewportSize({ width: 375, height: 340 });
  await page.locator('#quantity').click();
  await expect(page.locator('#app')).toHaveClass(/keyboard/);
  await page.locator('#quantity').fill('6');
  await page.locator('#save').click();
  await expect(page.locator('#status-text')).toHaveText('Gespeichert');
  await expect(page.locator('#app')).not.toHaveClass(/keyboard/);
  await expect(page.locator('#search')).toBeVisible();
});

test('Speichern liegt rechts, ist die größte Aktion und mit dem Daumen erreichbar', async ({ page }) => {
  await setup(page);
  await choose(page, 'Vollmilch');
  const m = await page.evaluate(() => {
    const save = document.getElementById('save').getBoundingClientRect();
    const add = document.getElementById('add').getBoundingClientRect();
    return { saveRight: save.right, addRight: add.right, saveLeft: save.left, addLeft: add.left,
      saveH: save.height, addH: add.height, saveW: save.width, addW: add.width, iw: innerWidth, ih: innerHeight };
  });
  expect(m.saveLeft).toBeGreaterThan(m.addLeft);
  expect(m.saveRight).toBeGreaterThanOrEqual(m.addRight - 1);
  expect(m.saveW).toBeGreaterThan(m.addW);
  expect(m.saveH).toBeGreaterThanOrEqual(m.addH);
  expect(m.saveH).toBeGreaterThanOrEqual(40);
  expect(m.saveRight).toBeLessThanOrEqual(m.iw); // innerhalb des Bildschirms
});

test('Konflikt: aktueller Stand und Entwurf getrennt, Plus wird nicht automatisch neu gebucht', async ({ page }) => {
  const backend = await setup(page);
  backend.seed(INV1, MILK, 12);
  await choose(page, 'Vollmilch');
  backend.external(INV1, MILK, 20, 'p2');
  await change(page, 'plus', '5');
  await expect(page.locator('#conflict')).toBeVisible();
  await expect(page.locator('#conflict-current')).toHaveText('Menge 20');
  await expect(page.locator('#conflict-draft')).toHaveText('Menge 12 · Plus 5');
  await page.locator('#conflict-keep').click();
  await expect(page.locator('#quantity')).toHaveValue('12');
  await expect(page.locator('#plus')).toHaveValue('');
  expect(saves(backend)).toHaveLength(1);
  expect(backend.pos(INV1, MILK).quantity).toBe(20);
  await page.locator('#save').click();
  await expect(page.locator('#status-text')).toHaveText('Gespeichert');
  expect(saves(backend)[1]).toMatchObject({ quantity: 12, plus: null, baseVersion: 'p2' });
  expect(backend.pos(INV1, MILK).quantity).toBe(12);
});

test('Konflikt: Übernahme des aktuellen Stands bucht nichts', async ({ page }) => {
  const backend = await setup(page);
  backend.seed(INV1, MILK, 12);
  await choose(page, 'Vollmilch');
  backend.external(INV1, MILK, 20, 'p2');
  await change(page, 'quantity', '13');
  await page.locator('#conflict-take').click();
  await expect(page.locator('#quantity')).toHaveValue('20');
  expect(saves(backend)).toHaveLength(1);
  expect(backend.pos(INV1, MILK).quantity).toBe(20);
});

test('unklarer Ausgang: kein automatisches Neusenden, Stand wird zuerst geprüft', async ({ page }) => {
  const backend = await setup(page);
  backend.seed(INV1, MILK, 12);
  await choose(page, 'Vollmilch');
  backend.abortNext = true;
  await change(page, 'plus', '5');
  await expect(page.locator('#conflict')).toBeVisible();
  await expect(page.locator('#conflict-title')).toHaveText('Speicherstand unklar');
  expect(saves(backend)).toHaveLength(1);
  await page.locator('#conflict-take').click();
  await expect(page.locator('#conflict')).toBeHidden();
  await expect(page.locator('#status-text')).toContainText('Nicht gespeichert');
  await expect(page.locator('#plus')).toHaveValue('5');
  expect(saves(backend)).toHaveLength(1);
  await page.locator('#save').click();
  await expect(page.locator('#status-text')).toHaveText('Gespeichert');
  expect(backend.pos(INV1, MILK).quantity).toBe(17);
});

test('unklarer Ausgang nach tatsächlicher Speicherung wird nicht doppelt gebucht', async ({ page }) => {
  const backend = await setup(page);
  backend.seed(INV1, MILK, 12);
  await choose(page, 'Vollmilch');
  backend.applyThenAbort = true;
  await change(page, 'plus', '5');
  await expect(page.locator('#conflict-title')).toHaveText('Speicherstand unklar');
  await page.locator('#conflict-take').click();
  await expect(page.locator('#conflict-title')).toHaveText('Stand geprüft');
  await expect(page.locator('#conflict-current')).toHaveText('Menge 17');
  await page.locator('#conflict-take').click();
  await expect(page.locator('#quantity')).toHaveValue('17');
  expect(saves(backend)).toHaveLength(1);
  expect(backend.pos(INV1, MILK).quantity).toBe(17);
});

test('doppelte Position blockiert die Erfassung mit verständlicher Meldung', async ({ page }) => {
  const backend = await setup(page);
  backend.duplicates.add(INV1 + '|' + MILK);
  await page.locator('#search').fill('Vollmilch');
  await page.locator('#results .result', { hasText: 'Vollmilch' }).first().click();
  await expect(page.locator('#message')).toBeVisible();
  await expect(page.locator('#message-text')).toContainText('mehrere Positionen');
  await page.locator('#message-close').click();
  await expect(page.locator('#quantity')).toBeDisabled();
  await expect(page.locator('#save')).toBeDisabled();
  expect(saves(backend)).toHaveLength(0);
});

test('Inventurwechsel lädt die Menge der Zielinventur', async ({ page }) => {
  const backend = await setup(page);
  backend.seed(INV1, MILK, 12);
  backend.seed(INV2, MILK, 30);
  await choose(page, 'Vollmilch');
  await expect(page.locator('#quantity')).toHaveValue('12');
  await page.locator('#inventory').selectOption(INV2);
  await expect(page.locator('#quantity')).toHaveValue('30');
  expect(backend.requests.filter(r => r.params.action === 'position').map(r => r.params.inventory)).toEqual([INV1, INV2]);
});

test('unbekannter Barcode zeigt Warnung und erlaubt keine Speicherung für den vorigen Artikel', async ({ page }) => {
  const backend = await setup(page);
  await choose(page, 'Vollmilch');
  await page.locator('#search').fill('9999999999999');
  await page.locator('#search').press('Enter');
  await expect(page.locator('#message-text')).toContainText('Artikel nicht gefunden');
  await page.locator('#message-close').click();
  await expect(page.locator('#article-name')).toHaveText('Welchen Artikel zählst du?');
  await expect(page.locator('#quantity')).toBeDisabled();
  expect(saves(backend)).toHaveLength(0);
});

test('nicht unterstützte Mengenerfassung sperrt die Felder', async ({ page }) => {
  await setup(page);
  await page.locator('#search').fill('Sonderartikel');
  await page.locator('#results .result', { hasText: 'Sonderartikel' }).first().click();
  await expect(page.locator('#message-text')).toContainText('nicht unterstützt');
  await page.locator('#message-close').click();
  await expect(page.locator('#quantity')).toBeDisabled();
});

test('Trefferliste scrollt intern und lädt weitere Treffer nach', async ({ page }) => {
  await setup(page);
  await page.locator('#search').focus();
  await expect(page.locator('#results .result').first()).toBeVisible();
  expect(await page.locator('#results .result').count()).toBe(50);
  const scrolls = await page.locator('#results').evaluate(el => el.scrollHeight > el.clientHeight);
  expect(scrolls).toBe(true);
  await page.locator('#results .more-results').scrollIntoViewIfNeeded();
  await page.locator('#results .more-results').click();
  await expect(page.locator('#results .result')).toHaveCount(63);
  const page1 = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, w: innerHeight }));
  expect(page1.h).toBeLessThanOrEqual(page1.w + 1);
});

test('Erfassung braucht kein Seitenscrollen und nichts läuft seitlich über', async ({ page }) => {
  const backend = await setup(page);
  backend.seed(INV1, MILK, 12);
  await choose(page, 'Vollmilch');
  const m = await page.evaluate(() => {
    const doc = document.documentElement, q = document.getElementById('quantity').getBoundingClientRect(),
      s = document.getElementById('save').getBoundingClientRect();
    return { sh: doc.scrollHeight, ih: innerHeight, sw: doc.scrollWidth, iw: innerWidth,
      quantityVisible: q.top >= 0 && q.bottom <= innerHeight, saveVisible: s.top >= 0 && s.bottom <= innerHeight,
      saveHeight: s.height, quantityHeight: q.height };
  });
  expect(m.sh).toBeLessThanOrEqual(m.ih + 1);
  expect(m.sw).toBeLessThanOrEqual(m.iw);
  expect(m.quantityVisible && m.saveVisible).toBe(true);
  expect(m.quantityHeight).toBeGreaterThanOrEqual(44);
});

test('Settings: Name nach erster Position gesperrt, andere Felder bleiben bearbeitbar', async ({ page }) => {
  const backend = await setup(page);
  backend.seed(INV1, MILK, 12);
  await goSettings(page);
  await page.locator('.inventory-row', { hasText: 'Ladeninventur' }).click();
  await expect(page.locator('#inventory-name')).toBeDisabled();
  await expect(page.locator('#name-lock-note')).toBeVisible();
  await page.locator('#inventory-year').fill('2027');
  await page.locator('#inventory-save').click();
  await expect(page.locator('#editor-status')).toHaveText('Gespeichert');
  expect(backend.posts.find(p => p.action === 'saveInventory')).toEqual({
    action: 'saveInventory', id: INV1, name: 'Ladeninventur', year: '2027', date: '2026-11-20', status: 'aktiv', baseVersion: 'i1' });
});

test('Settings: Inventur ohne Positionen umbenennen und neue Inventur anlegen', async ({ page }) => {
  const backend = await setup(page);
  await goSettings(page);
  await page.locator('.inventory-row', { hasText: 'Lagerinventur' }).click();
  await expect(page.locator('#inventory-name')).toBeEnabled();
  await page.locator('#inventory-name').fill('Lager 2026');
  await page.locator('#inventory-status').selectOption('abgeschlossen');
  await page.locator('#inventory-save').click();
  await expect(page.locator('.inventory-row', { hasText: 'Lager 2026' })).toBeVisible();
  await page.locator('#new-inventory').click();
  await expect(page.locator('#inventory-save')).toBeDisabled();
  await page.locator('#inventory-name').fill('Neue Inventur');
  await page.locator('#inventory-status').selectOption('geplant');
  await page.locator('#inventory-save').click();
  await expect(page.locator('.inventory-row', { hasText: 'Neue Inventur' })).toBeVisible();
  const posts = backend.posts.filter(p => p.action === 'saveInventory');
  expect(posts[0]).toMatchObject({ id: INV2, name: 'Lager 2026', status: 'abgeschlossen', baseVersion: 'i1' });
  expect(posts[1]).toMatchObject({ id: null, name: 'Neue Inventur', status: 'geplant' });
});

test('Settings: veraltete Inventur zeigt Konflikt und behält den Entwurf', async ({ page }) => {
  const backend = await setup(page);
  await goSettings(page);
  await page.locator('.inventory-row', { hasText: 'Lagerinventur' }).click();
  await expect(page.locator('#inventory-name')).toBeEnabled();
  backend.inventories.find(i => i.id === INV2).version = 'i2';
  await page.locator('#inventory-year').fill('2030');
  await page.locator('#inventory-save').click();
  await expect(page.locator('#message-text')).toContainText('inzwischen geändert');
  await page.locator('#message-close').click();
  await expect(page.locator('#inventory-year')).toHaveValue('2030');
});

test('Kiosk- und CMS-Kopfzeilen verlinken die Inventur', async () => {
  const fs = require('fs');
  const path = require('path');
  const read = rel => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  for (const file of ['static-site/kiosk-klassisch.html', 'static-site/kiosk.html', 'static-site/kiosk-neu.html',
    'static-site/cms-klassisch.html', 'static-site/cms.html', 'static-site/cms-neu.html',
    'tools/build-kiosk-neu.js', 'tools/build-cms-neu.js']) {
    expect(read(file), file).toContain('href="/inventur"');
  }
});

// ---------- Kamera ----------
const cameraStub = () => {
  window.__camera = { stopped: 0, queue: [], opened: 0 };
  class FakeDetector {
    static async getSupportedFormats() { return ['ean_13', 'code_128']; }
    async detect() { const value = window.__camera.queue.shift(); return value ? [{ rawValue: value }] : []; }
  }
  window.BarcodeDetector = FakeDetector;
  navigator.mediaDevices.getUserMedia = async () => {
    window.__camera.opened++;
    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 240;
    canvas.getContext('2d').fillRect(0, 0, 40, 40);
    const stream = canvas.captureStream();
    stream.getTracks().forEach(track => { const stop = track.stop.bind(track); track.stop = () => { window.__camera.stopped++; stop(); }; });
    return stream;
  };
};

test('Kamera automatisch: erkannter Barcode wählt den Artikel, einmal, und gibt die Kamera frei', async ({ page }) => {
  await page.addInitScript(cameraStub);
  const backend = await setup(page);
  await page.evaluate(() => window.__camera.queue.push('9000000000011', '9000000000011'));
  await page.locator('#scan-open').click();
  await expect(page.locator('#article-name')).toContainText('Vollmilch');
  await expect(page.locator('#scanner')).toBeHidden();
  expect(await page.evaluate(() => window.__camera.stopped)).toBeGreaterThan(0);
  expect(backend.requests.filter(r => r.params.action === 'article')).toHaveLength(1);
  expect(saves(backend)).toHaveLength(0);
});

test('Kamera manuell: erst der Knopf löst den Scan aus', async ({ page }) => {
  await page.addInitScript(cameraStub);
  const backend = await setup(page);
  await page.locator('#manual-scan').check();
  await page.evaluate(() => window.__camera.queue.push('9000000000028'));
  await page.locator('#scan-open').click();
  await expect(page.locator('#scan-confirm')).toBeVisible();
  await page.waitForTimeout(900);
  await expect(page.locator('#scanner')).toBeVisible();
  expect(backend.requests.filter(r => r.params.action === 'article')).toHaveLength(0);
  await page.locator('#scan-confirm').click();
  await expect(page.locator('#article-name')).toContainText('Bauernbrot');
  await expect(page.locator('#unit')).toHaveText('Gramm');
});

test('Kamerabereich ist groß genug und der Dialog passt in den Bildschirm', async ({ page }) => {
  await page.addInitScript(cameraStub);
  await setup(page);
  await page.locator('#manual-scan').check();
  await page.locator('#scan-open').click();
  await expect(page.locator('#camera')).toBeVisible();
  const m = await page.evaluate(() => {
    const camera = document.getElementById('camera').getBoundingClientRect();
    const dialog = document.getElementById('scanner').getBoundingClientRect();
    const confirm = document.getElementById('scan-confirm').getBoundingClientRect();
    return { cw: camera.width, ch: camera.height, dTop: dialog.top, dBottom: dialog.bottom, dLeft: dialog.left, dRight: dialog.right,
      cBottom: confirm.bottom, iw: innerWidth, ih: innerHeight };
  });
  expect(m.cw).toBeGreaterThanOrEqual(300);
  expect(m.ch).toBeGreaterThanOrEqual(300);
  expect(m.dTop).toBeGreaterThanOrEqual(0);
  expect(m.dBottom).toBeLessThanOrEqual(m.ih);
  expect(m.dLeft).toBeGreaterThanOrEqual(0);
  expect(m.dRight).toBeLessThanOrEqual(m.iw);
  expect(m.cBottom).toBeLessThanOrEqual(m.ih);
});

test('Kamera verweigert: verständliche Meldung, Suche bleibt nutzbar', async ({ page }) => {
  await page.addInitScript(() => {
    window.BarcodeDetector = class { static async getSupportedFormats() { return ['ean_13']; } async detect() { return []; } };
    navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('verweigert', 'NotAllowedError'); };
  });
  await setup(page);
  await page.locator('#scan-open').click();
  await expect(page.locator('#scanner-hint')).toContainText('Kamerazugriff');
  await page.locator('#scanner-close').click();
  await choose(page, 'Vollmilch');
});

for (const angle of [0, 90, 270]) {
test(`Kamera ohne eingebaute Erkennung: Leser erkennt einen EAN-13-Strichcode in Lage ${angle}°`, async ({ page }) => {
  await page.addInitScript(rotation => {
    delete window.BarcodeDetector;
    const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
    const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
    const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
    const P = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
    const digits = '4006381333931'.split('').map(Number);
    let bits = '101';
    for (let i = 1; i <= 6; i++) bits += (P[digits[0]][i - 1] === 'L' ? L : G)[digits[i]];
    bits += '01010';
    for (let i = 7; i <= 12; i++) bits += R[digits[i]];
    bits += '101';
    window.__camera = { stopped: 0, queue: [], opened: 0 };
    navigator.mediaDevices.getUserMedia = async () => {
      window.__camera.opened++;
      const canvas = document.createElement('canvas');
      canvas.width = 640; canvas.height = 480;
      const ctx = canvas.getContext('2d');
      const draw = tick => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 640, 480);
        ctx.translate(320, 240); ctx.rotate(rotation * Math.PI / 180);
        ctx.fillStyle = '#000';
        const module = 4, left = -95 * module / 2;
        [...bits].forEach((bit, index) => { if (bit === '1') ctx.fillRect(left + index * module, -100, module, 200); });
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = tick % 2 ? '#fefefe' : '#fff'; ctx.fillRect(0, 0, 2, 2);
      };
      let tick = 0; draw(tick);
      const timer = setInterval(() => draw(++tick), 100);
      const stream = canvas.captureStream(10);
      stream.getTracks().forEach(track => { const stop = track.stop.bind(track); track.stop = () => { window.__camera.stopped++; clearInterval(timer); stop(); }; });
      return stream;
    };
  }, angle);
  const backend = makeBackend();
  backend.articles.push({ id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', name: 'Strichcode-Testartikel', code: '4006381333931', articleCode: '4006381333931', vk: 1, lastEk: 0.5, tax: 9, unit: '0', unitLabel: 'Stück', supported: true, ekSuggestion: 0.5 });
  await setup(page, { backend });
  expect(await page.evaluate(() => typeof window.BarcodeDetector)).toBe('undefined');
  await page.locator('#scan-open').click();
  await expect(page.locator('#article-name')).toContainText('Strichcode-Testartikel', { timeout: 15000 });
  expect(await page.evaluate(() => Boolean(window.ZXing))).toBe(true);
  expect(await page.evaluate(() => window.__camera.stopped)).toBeGreaterThan(0);
  expect(saves(backend)).toHaveLength(0);
});
}

test('Kamera nicht unterstützt: Hinweis statt Fehler', async ({ page }) => {
  await page.addInitScript(() => { delete window.BarcodeDetector; });
  await page.addInitScript(() => { Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true }); });
  await setup(page);
  await page.locator('#scan-open').click();
  await expect(page.locator('#scanner-hint')).toContainText('Kamera hier nicht benutzen');
});
