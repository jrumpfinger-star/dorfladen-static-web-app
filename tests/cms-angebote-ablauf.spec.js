const { test, expect } = require('@playwright/test');
const BASE = process.env.TEST_URL || 'http://127.0.0.1:8818';
const PHOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6hywAAAAASUVORK5CYII=';

async function setup(page) {
  const state = { actions: new Map(), writes: [], errors: [], offerReads: [], imageLookups: [], failSave: false, images: 0 };
  await page.clock.install({ time: new Date('2026-11-18T12:00:00Z') });
  await page.addInitScript((hash) => {
    if (window !== window.top) return;
    sessionStorage.setItem('cms_auth_ok', hash);
    localStorage.setItem('cms_auth_token', 'test-cms-session');
    localStorage.setItem('dl_cookies', '1');
    window.print = () => { window.__printed = true; };
  }, require('./_kiosk-angemeldet').PW_HASH);
  page.on('pageerror', (error) => state.errors.push(error.message));
  await page.route('**/*', (route) => new URL(route.request().url()).origin === new URL(BASE).origin ? route.fallback() : route.abort());
  await page.route('**/api/**', async (route) => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname;
    const json = (data, status = 200) => route.fulfill({ status, json: data });
    if (path === '/api/cms-auth') return json({ authenticated: true });
    if (path === '/api/angebote-flyer') return json({ success: true, homepage: {}, actions: [] });
    if (path === '/api/cms-config') return json({ success: true, data: { feature_flags: { kiosk_werbebilder: true }, design_config: {} } });
    if (path === '/api/preisliste') return json({ groups: { Getränke: [{
      bezeichnung: 'Testgetränk', artikelnummer: 'ART1', strichcode: '4001234567890', vk: 14.99, menge: '20x0,5 l'
    }] } });
    if (path === '/api/werbebilder') {
      const body = req.postDataJSON();
      if (body.articles) {
        state.imageLookups.push(...body.articles);
        return json([{ dl_artikelnummer: body.articles[0].artikelnummer, dl_werbebildid: '11111111-1111-4111-8111-111111111111', dl_bild_base64: PHOTO }]);
      }
      state.images++;
      if (state.failImages) return json({ success: false, error: 'Das Artikelbild konnte nicht gespeichert werden.' }, 503);
      return json({ success: true, id: '11111111-1111-4111-8111-111111111111' });
    }
    if (path === '/api/angebote') {
      if (req.method() === 'GET') {
        const token = req.headers()['x-cms-auth'] || '';
        state.offerReads.push(token);
        const visible = [...state.actions.values()].filter((action) => token === 'test-cms-session'
          || action.valid_to >= '2026-11-18');
        return json({ success: true, config: { scale_enabled: false, scale_scope: 'preview', feature_archive_enabled: false },
          data: visible.flatMap((action) => action.items.map((it, i) => ({
            id: it.id, dl_angeboteid: it.id, dl_aktion_id: action.aktion_id, dl_aktion_titel: action.title,
            dl_gueltig_von: action.valid_from, dl_gueltig_bis: action.valid_to, dl_sortierung: i,
            dl_produkt: it.name, dl_details: it.description, dl_preis: it.price_cents / 100,
            dl_statt_preis: it.old_price_cents == null ? null : it.old_price_cents / 100,
            dl_artikelnummer: it.barcode, dl_werbebildid: it.werbebild_id, image_key: it.image_id?.slice(4),
            bild_data: it.image_id ? PHOTO : '', action_kind: action.kind, action_layout: action.layout,
            units: it.units, volume_ml: it.volume_ml, packaging: it.packaging,
            deposit_cents: it.deposit_cents, deposit_free: it.deposit_free, article_number: it.article_number
          }))) });
      }
      const body = req.postDataJSON(); state.writes.push(body);
      if (state.failSave) return json({ success: false, error: 'Offer action changed; reload before saving' }, 409);
      if (url.searchParams.get('action') === 'delete') { state.actions.delete(body.aktion_id); return json({ success: true }); }
      const canonical = (id) => id.replace(/-/g, '').toLowerCase().replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
      const existing = state.actions.get(body.aktion_id);
      if (existing && existing.items.map((it) => canonical(it.id)).sort().join() !== body.original_ids.map(canonical).sort().join()) {
        return json({ success: false, error: 'Offer action changed; reload before saving' }, 409);
      }
      state.actions.set(body.aktion_id, structuredClone(body));
      return json({ success: true, aktion_id: body.aktion_id, items: body.items.map((it) => ({ id: canonical(it.id), client_id: it.id })) });
    }
    if (path === '/api/angebote-verwaltung') return json({ success: true, actions: [], config: { scale_enabled: false } });
    return json({ success: true, data: [], groups: {}, value: [] });
  });
  return state;
}

async function create(page, kind) {
  await page.getByRole('button', { name: '+ Neue Aktion erstellen', exact: true }).click();
  await page.getByRole('button', { name: kind === 'drinks' ? 'Getränkeaktion' : 'Sonderaktion', exact: true }).click();
  return page.getByRole('dialog', { name: kind === 'drinks' ? 'Getränkeaktion erfassen' : 'Sonderaktion erfassen', exact: true });
}

async function fillDrink(row, index) {
  await row.getByRole('textbox', { name: 'Produkt', exact: true }).fill('Getränk ' + index);
  await row.getByRole('textbox', { name: 'Angebotspreis', exact: true }).fill('12,49');
  await row.getByRole('textbox', { name: 'Stattpreis', exact: true }).fill('14,99');
  await row.locator('[data-f=details]').fill('Inhalt ' + index);
  await row.locator('[data-f=units]').fill('20');
  await row.locator('[data-f=volume_ml]').fill('0,5');
  await row.locator('[data-f=packaging]').selectOption('Mehrweg');
  await row.locator('[data-f=deposit_mode]').selectOption('yes');
  await row.locator('[data-f=deposit_cents]').fill('3,10');
}

for (const kind of ['drinks', 'weekly']) {
  test(`TC-F42-01: direkt editierbare ausgerichtete Erfassung mit erhaltenen Werten (${kind})`, async ({ page }) => {
    const state = await setup(page);
    await page.goto(BASE + '/angebote.html');
    const dlg = await create(page, kind), rows = dlg.locator('.cms-ang-row');
    for (let i = 0; i < 2; i++) {
      const row = rows.nth(i);
      if (kind === 'drinks') {
        await fillDrink(row, i + 1);
        await row.locator('[data-f=units]').fill(i ? '12' : '20');
        await row.locator('[data-f=deposit_cents]').fill(i ? '2,00' : '3,10');
      } else {
        await row.locator('[data-f=produkt]').fill('Sonderartikel ' + i);
        await row.locator('[data-f=preis]').fill(i ? '2,99' : '1,49');
        await row.locator('[data-f=details]').fill('Beschreibung ' + i);
      }
      for (const field of await row.locator('.an-capture-extra input,.an-capture-extra select').all()) {
        await expect(field).toBeEditable();
        await expect(field).toBeVisible();
      }
    }
    await expect(dlg.locator('.an-capture-items details')).toHaveCount(0);
    const geometry = await dlg.evaluate(el => {
      const b = el.getBoundingClientRect();
      return [...el.querySelectorAll('input:not([type=hidden]),select,.an-image-trigger')].map(field => {
        const r = field.getBoundingClientRect();
        return { left: r.left - b.left, right: b.right - r.right, height: r.height };
      });
    });
    expect(geometry.every(b => b.left >= 0 && b.right >= -1 && b.height >= 40)).toBe(true);
    if (page.viewportSize().width >= 1100) {
      const fields = await rows.first().locator('.an-capture-extra input,.an-capture-extra select').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().bottom));
      expect(new Set(fields.map(Math.round)).size).toBe(1);
      expect((await rows.first().boundingBox()).height).toBeLessThan(160);
    }
    await page.screenshot({ path: test.info().outputPath('gemeinsame-erfassung-' + kind + '.png') });
    await dlg.getByRole('button', { name: 'Speichern', exact: true }).click();
    await expect(dlg).toHaveCount(0);
    expect(state.writes).toHaveLength(1);
    const original = structuredClone(state.writes[0].items);
    if (kind === 'drinks') expect(original.map(it => [it.units, it.deposit_cents])).toEqual([[20, 310], [12, 200]]);
    await page.locator('#an-overview').click();
    await page.getByRole('button', { name: 'Alle', exact: true }).click();
    await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
    const reopened = page.getByRole('dialog', { name: kind === 'drinks' ? 'Getränkeaktion erfassen' : 'Sonderaktion erfassen', exact: true });
    await expect(reopened.locator('.cms-ang-row')).toHaveCount(2);
    if (kind === 'drinks') await expect(reopened.locator('[data-f=deposit_cents]').last()).toHaveValue('2,00');
    await reopened.getByRole('button', { name: 'Speichern', exact: true }).click();
    await expect(reopened).toHaveCount(0);
    expect(state.writes[1].items).toEqual(original);
    expect(state.errors).toEqual([]);
  });

  test(`TC-F42-02: gemeinsames Bildmenü mit echter Suche, Datei, Paste und Entfernen (${kind})`, async ({ page }) => {
    const state = await setup(page);
    await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { read: async () => [] } }));
    await page.goto(BASE + '/angebote.html');
    const dlg = await create(page, kind), row = dlg.locator('.cms-ang-row').first();
    if (kind === 'drinks') await fillDrink(row, 1);
    else { await row.locator('[data-f=produkt]').fill('Sonderartikel'); await row.locator('[data-f=preis]').fill('2,99'); }
    const trigger = row.getByRole('button', { name: 'Produktbild bearbeiten', exact: true });
    await trigger.click();
    await expect(row.locator('.an-capture-image-menu')).toBeVisible();
    await expect(row.locator('[data-offer-action=loadBildSharePoint]')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await expect(dlg).toBeVisible();
    await trigger.click();
    await row.locator('[data-offer-action=loadBildSharePoint]').click();
    await expect(row.locator('.cms-bild-preview')).toBeVisible();
    expect(state.imageLookups).toHaveLength(1);
    await trigger.click();
    const chooser = page.waitForEvent('filechooser');
    await row.locator('[data-offer-action=uploadBildSP]').click();
    await (await chooser).setFiles({ name: 'produkt.png', mimeType: 'image/png', buffer: Buffer.from(PHOTO.split(',')[1], 'base64') });
    await expect(row.locator('.cms-bild-preview')).toBeVisible();
    expect(state.images).toBe(0);
    await trigger.click();
    await row.locator('[data-offer-action=clearBild]').click();
    await expect(row.locator('.cms-bild-preview')).toBeHidden();
    await trigger.click();
    await row.locator('[data-offer-action=pasteBildSP]').click();
    await row.evaluate((el, source) => {
      const bytes = Uint8Array.from(atob(source.split(',')[1]), c => c.charCodeAt(0)), data = new DataTransfer();
      data.items.add(new File([bytes], 'zwischenablage.png', { type: 'image/png' }));
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }));
    }, PHOTO);
    await expect(row.locator('.cms-bild-preview')).toBeVisible();
    expect(state.writes).toHaveLength(0);
    expect(state.images).toBe(0);
    await dlg.getByRole('button', { name: 'Speichern', exact: true }).click();
    await expect(dlg).toHaveCount(0);
    expect(state.images).toBe(1);
    expect(state.writes[0].items[0].werbebild_id).toBe('11111111-1111-4111-8111-111111111111');
    expect(state.errors).toEqual([]);
  });

  test(`TC-F42-03: unverdeckte Auswahl am Dialogende mit Tastatur und ohne verwaiste Ebenen (${kind})`, async ({ page }) => {
    const state = await setup(page);
    await page.route('**/api/preisliste?all=1', route => route.fulfill({ json: { groups: { Artikel: Array.from({ length: 12 }, (_, i) => ({
      bezeichnung: 'Testgetränk ' + (i + 1), artikelnummer: 'ART1-' + i, strichcode: '4001234567890', vk: 14.99, menge: '20x0,5 l'
    })) } } }));
    await page.goto(BASE + '/kiosk.html');
    await page.evaluate(() => window.K.switchTab('angebote'));
    const dlg = await create(page, kind), row = dlg.locator('.cms-ang-row').last(), input = row.locator('[data-f=produkt]'), dd = row.locator('.cms-art-dd');
    await input.fill('ART1');
    await expect(dd.locator('button')).toHaveCount(12);
    await input.evaluate(el => {
      const body = el.closest('.an-capture-body');
      body.scrollTop += el.getBoundingClientRect().bottom - body.getBoundingClientRect().bottom + 14;
    });
    await expect(dd).toBeVisible();
    await expect.poll(async () => {
      const b = await dd.boundingBox(), anchor = await input.boundingBox();
      return !!b && b.y >= 0 && b.y + b.height <= anchor.y;
    }).toBe(true);
    const hit = await dd.locator('button').first().evaluate(el => {
      const r = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
    });
    expect(hit).toBe(true);
    await page.screenshot({ path: test.info().outputPath('artikelauswahl-dialogende.png') });
    await input.press('ArrowDown');
    await expect(dd.locator('button').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dd).toBeHidden();
    await expect(dlg).toBeVisible();
    await input.fill('ART1-0');
    await expect(dd).toBeVisible();
    await dd.locator('button').first().click();
    await expect(input).toHaveValue('Testgetränk 1');
    await expect(dd).toBeHidden();
    await row.getByRole('button', { name: 'Produktbild bearbeiten', exact: true }).click();
    const menu = row.locator('.an-capture-image-menu'), menuId = await menu.getAttribute('id'), b = await menu.boundingBox();
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.y + b.height).toBeLessThanOrEqual(page.viewportSize().height);
    expect(b.x + b.width).toBeLessThanOrEqual(page.viewportSize().width);
    await page.screenshot({ path: test.info().outputPath('bildmenue-dialogende.png') });
    await row.locator('[data-offer-action=removeAngRow]').click();
    await expect(dlg.locator('#' + menuId)).toHaveCount(0);
    await dlg.getByRole('button', { name: 'Abbrechen', exact: true }).click();
    await page.getByRole('button', { name: 'Änderungen verwerfen', exact: true }).click();
    await expect(page.locator(':popover-open')).toHaveCount(0);
    expect(state.writes).toHaveLength(0);
    expect(state.errors).toEqual([]);
  });
}

test('TC-F18-02/03: Kachelwahl, Folgeseiten, Speichern und Neuöffnen ohne Artikelverlust', async ({ page }) => {
  const state = await setup(page);
  await page.goto(BASE + '/angebote.html');
  const dlg = await create(page, 'drinks'), rows = dlg.locator('.cms-ang-row');
  expect(state.offerReads[0]).toBe('test-cms-session');
  await expect(rows).toHaveCount(6);
  for (let i = 0; i < 6; i++) await fillDrink(rows.nth(i), i + 1);
  await dlg.locator('[data-density]').selectOption('4');
  await expect(rows).toHaveCount(6);
  await dlg.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(dlg).toHaveCount(0);
  expect(state.writes).toHaveLength(1);
  const saved = state.writes[0];
  await require('node:fs/promises').writeFile(test.info().outputPath('dataverse-action.json'), JSON.stringify(saved));
  expect(saved.layout.density).toBe(4);
  expect(saved.items.map((it) => it.name)).toEqual(Array.from({ length: 6 }, (_, i) => 'Getränk ' + (i + 1)));
  expect(saved.items.every((it) => it.units === 20 && it.volume_ml === 500 && it.deposit_cents === 310)).toBe(true);
  expect(saved.layout.pages.map((p) => p.elements.filter((e) => e.type === 'name').length)).toEqual([4, 2]);
  await expect(page.locator('#an-page-label')).toHaveText('Seite 1 / 2');
  await page.getByRole('button', { name: 'Nächste Flyerseite', exact: true }).click();
  await expect(page.locator('#an-page-label')).toHaveText('Seite 2 / 2');
  await expect(page.locator('#an-stage-info')).not.toHaveClass(/an-error/);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('Angebot-1.png');
  await page.screenshot({ path: test.info().outputPath('getraenke-vorschau.png') });
  await page.getByRole('button', { name: 'Alle Einzelflyer', exact: true }).click();
  await expect(page.locator('#an-design-item option')).toHaveCount(6);
  await page.locator('#an-overview').click();
  await page.getByRole('button', { name: 'Alle', exact: true }).click();
  await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
  const reopened = page.getByRole('dialog', { name: 'Getränkeaktion erfassen', exact: true });
  await expect(reopened.locator('[data-density]')).toHaveValue('4');
  await expect(reopened.locator('.cms-ang-row')).toHaveCount(6);
  await expect(reopened.locator('[data-f=volume_ml]').last()).toHaveValue('0,5');
  await reopened.locator('[data-density]').selectOption('6');
  await reopened.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(reopened).toHaveCount(0);
  expect(state.writes[1].layout.pages).toHaveLength(1);
  expect(state.writes[1].layout.targets.single).toEqual(saved.layout.targets.single);
  expect(state.writes[1].items).toEqual(saved.items);
  expect(state.errors).toEqual([]);
});

test('TC-F18-01/05: Erfassung direkt im Kiosk mit Produktsuche und erhaltenem Menü', async ({ page }) => {
  const state = await setup(page);
  await page.goto(BASE + '/kiosk.html');
  await page.evaluate(() => window.K.switchTab('angebote'));
  await expect(page.locator('.k-tabs .k-tab').last()).toHaveAttribute('data-tab', 'angebote');
  const dlg = await create(page, 'drinks');
  await dlg.locator('[data-density]').selectOption('4');
  await expect(dlg.locator('.cms-ang-row')).toHaveCount(4);
  const row = dlg.locator('.cms-ang-row').first();
  await row.getByRole('textbox', { name: 'Produkt', exact: true }).fill('ART1');
  await row.getByRole('button', { name: /Testgetränk.*ART1/ }).click();
  await expect(row.locator('[data-f=produkt]')).toHaveValue('Testgetränk');
  await expect(row.locator('[data-f=artikelnummer]')).toHaveValue('4001234567890');
  await expect(row.locator('[data-f=preis]')).toHaveValue('');
  await expect(row.locator('[data-f=volume_ml]')).toHaveValue('0,5');
  await expect(row.locator('.cms-bild-preview')).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('getraenke-erfassung-im-kiosk.png') });
  expect(state.images).toBe(0);
  const bounds = await dlg.evaluate((el) => {
    const b = el.getBoundingClientRect();
    return { left: b.left, right: b.right, overflow: el.scrollWidth > el.clientWidth + 1 };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(page.viewportSize().width);
  expect(bounds.overflow).toBe(false);
  if (page.viewportSize().width >= 1100) {
    expect(bounds.right - bounds.left).toBeGreaterThanOrEqual(900);
    expect(bounds.right - bounds.left).toBeLessThanOrEqual(980);
  }
  expect((await dlg.locator('.an-dialog-top').boundingBox()).height).toBeLessThan(180);
  for (const field of await dlg.locator('input:visible,select:visible,button:visible').all()) {
    const b = await field.boundingBox();
    expect(b.x).toBeGreaterThanOrEqual(bounds.left);
    expect(b.x + b.width).toBeLessThanOrEqual(bounds.right + 1);
  }
  await dlg.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await page.getByRole('button', { name: 'Änderungen verwerfen', exact: true }).click();
  expect(page.url()).toContain('/kiosk.html');
  await expect(page.locator('.k-tab[data-tab=angebote]')).toBeVisible();
  await expect(page.locator('#panel-angebote')).toBeVisible();
  expect(state.errors).toEqual([]);
});

test('TC-F18-04/06: gespeicherte Getränke sind ohne weitere Freigabe mit Flyer genau einmal öffentlich sichtbar', async ({ page }) => {
  const state = await setup(page);
  await page.goto(BASE + '/angebote.html');
  const dlg = await create(page, 'drinks');
  await dlg.locator('[data-density]').selectOption('4');
  await dlg.locator('[data-meta=valid_from]').fill('2026-11-16');
  await dlg.locator('[data-meta=valid_to]').fill('2026-11-21');
  await fillDrink(dlg.locator('.cms-ang-row').first(), 1);
  await dlg.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(dlg).toHaveCount(0);
  expect(state.writes).toHaveLength(1);
  await page.goto(BASE + '/index.html');
  const mobile = page.viewportSize().width <= 768;
  if (mobile) await page.locator('.mob-action[onclick*="offers"]').click();
  const grid = page.locator(mobile ? '#mob-ang-grid' : '#ang-grid');
  await expect(grid.locator('.an-product')).toHaveCount(1);
  await expect(grid.locator('.an-legacy')).toHaveCount(0);
  await expect(grid).toContainText('1,25');
  await grid.locator('..').getByRole('button', { name: 'Flyer ansehen', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Original-Angebotsflyer', exact: true })).toBeVisible();
  expect(state.errors).toEqual([]);
});

test('TC-F25-02: Aktion der nächsten Woche erscheint auf der Startseite nur unter „Nächste Woche“', async ({ page }) => {
  const state = await setup(page);
  await page.goto(BASE + '/angebote.html');
  const dlg = await create(page, 'drinks');
  await dlg.locator('[data-density]').selectOption('4');
  await dlg.locator('[data-meta=valid_from]').fill('2026-11-23');
  await dlg.locator('[data-meta=valid_to]').fill('2026-11-28');
  await fillDrink(dlg.locator('.cms-ang-row').first(), 1);
  await dlg.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(dlg).toHaveCount(0);
  expect(state.writes).toHaveLength(1);
  await page.goto(BASE + '/index.html');
  const mobile = page.viewportSize().width <= 768;
  if (mobile) await page.locator('.mob-action[onclick*="offers"]').click();
  const grid = page.locator(mobile ? '#mob-ang-grid' : '#ang-grid');
  await expect(grid.locator('.an-product')).toHaveCount(0);
  await page.locator(mobile ? '#mob-ang-btn-next' : '#ang-btn-next').click();
  await expect(grid.locator('.an-product')).toHaveCount(1);
  await expect(grid).toContainText('1,25');
  await page.locator(mobile ? '#mob-ang-btn-this' : '#ang-btn-this').click();
  await expect(grid.locator('.an-product')).toHaveCount(0);
  expect(state.errors).toEqual([]);
});
test('TC-F18-01/06: Sonderaktion bleibt sechszeilig; ungültige Daten und Schreibfehler bleiben sichtbar', async ({ page }) => {
  const state = await setup(page);
  await page.goto(BASE + '/angebote.html');
  const dlg = await create(page, 'weekly');
  await expect(dlg.locator('.cms-ang-row')).toHaveCount(6);
  await expect(dlg.locator('[data-density]')).toHaveCount(0);
  const row = dlg.locator('.cms-ang-row').first();
  await row.locator('[data-f=produkt]').fill('Sonderartikel');
  await dlg.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByRole('dialog').last()).toContainText('gültigen Angebotspreis');
  await page.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  expect(state.writes).toHaveLength(0);
  await row.locator('[data-f=preis]').fill('1,99');
  state.failSave = true;
  await dlg.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByRole('dialog').last()).toContainText('zwischenzeitlich geändert');
  await expect(page.getByRole('dialog').last()).not.toContainText('Offer action');
  expect(state.actions.size).toBe(0);
  await expect(dlg).toBeVisible();
  expect(state.errors).toEqual([]);
});

test('TC-F18-10: Gestaltung direkt nach dem Erfassen mehrfach speichern ohne Konflikt', async ({ page }) => {
  const state = await setup(page);
  await page.goto(BASE + '/angebote.html');
  const dlg = await create(page, 'drinks');
  await fillDrink(dlg.locator('.cms-ang-row').first(), 1);
  await dlg.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(dlg).toHaveCount(0);
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Gestaltung speichern', exact: true }).click();
    await expect(page.locator('#an-root')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('dialog.an-dialog:not(.an-cms-preview-modal)[open]')).toHaveCount(0);
  }
  expect(state.writes).toHaveLength(3);
  const ids = state.writes[0].items.map((it) => it.id.replace(/-/g, '').toLowerCase());
  expect(state.writes[2].original_ids.map((id) => id.replace(/-/g, '').toLowerCase())).toEqual(ids);
  expect(state.writes[2].items.map((it) => it.id)).toEqual(state.writes[0].items.map((it) => it.id));
  expect(state.errors).toEqual([]);
});

test('TC-F18-11: Meldungsfenster stehen im Kiosk mittig im sichtbaren Bereich', async ({ page }) => {
  await setup(page);
  await page.goto(BASE + '/kiosk.html');
  await page.evaluate(() => window.K.switchTab('angebote'));
  const dlg = await create(page, 'weekly');
  await dlg.locator('[data-f=produkt]').first().fill('Ohne Preis');
  await dlg.getByRole('button', { name: 'Speichern', exact: true }).click();
  const message = page.getByRole('dialog').last();
  await expect(message).toContainText('gültigen Angebotspreis');
  const box = await message.boundingBox(), view = page.viewportSize();
  expect(Math.abs(box.x + box.width / 2 - view.width / 2)).toBeLessThan(2);
  expect(Math.abs(box.y + box.height / 2 - view.height / 2)).toBeLessThan(2);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(view.width);
});

test('TC-F19-05: Magazinkopf richtet Logo, Titel und Zeitraum auf einer Mittellinie aus', async ({ page }) => {
  await setup(page);
  await page.goto(BASE + '/angebote.html');
  const result = await page.evaluate(async () => {
    const M = window.AngeboteModel, out = [];
    for (const template of ['modern-magazine', 'modern-mag-fresh', 'modern-mag-bold', 'modern-mag-xl']) {
      const data = M.blank('drinks');
      data.title = 'Getränkeangebote'; data.valid_from = '2026-11-23'; data.valid_to = '2026-11-28';
      Object.assign(data.items[0] || (data.items[0] = M.item()), { name: 'Bier', price_cents: 999, units: 20, volume_ml: 500, packaging: 'Mehrweg', deposit_cents: 310, deposit_free: false });
      M.useTemplate ? M.useTemplate(data.layout, template) : (data.layout.template = template);
      M.applyTemplate(data);
      const header = Object.fromEntries(data.layout.pages[0].elements.filter((e) => ['logo', 'title', 'period'].includes(e.type)).map((e) => [e.type, e]));
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.font = 'bold ' + header.title.font_size + 'px "' + header.title.font + '"';
      const rendered = await M.render(data, 0, 1);
      out.push({ template, header, titleWidth: ctx.measureText(data.title).width, errors: rendered.errors });
    }
    return out;
  });
  for (const entry of result) {
    const { logo, title, period } = entry.header, middle = (e) => e.y + e.h / 2;
    expect(Math.abs(middle(logo) - middle(title)), entry.template).toBeLessThanOrEqual(2);
    expect(Math.abs(middle(logo) - middle(period)), entry.template).toBeLessThanOrEqual(2);
    expect(logo.x + logo.w).toBeLessThanOrEqual(title.x);
    expect(title.x + title.w).toBeLessThanOrEqual(period.x);
    expect(logo.x).toBe(794 - (period.x + period.w));
    expect(entry.titleWidth, entry.template).toBeLessThanOrEqual(title.w * 1.12);
    expect(entry.errors, entry.template).toEqual([]);
  }
});

test('TC-F20-01/02/04: bildbetonte und Preisschild-Vorlagen ohne Überlappung und Überlauf', async ({ page }) => {
  await setup(page);
  await page.goto(BASE + '/angebote.html');
  const result = await page.evaluate(async () => {
    const M = window.AngeboteModel, ids = ['half-red', 'half-green', 'half-blue', 'tag-red', 'tag-green', 'tag-blue'], output = { ids: M.templateOptions.map((o) => o[0]), cms: M.cmsTemplateOptions.map((o) => o[0]), cases: [] };
    const overlap = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0.5 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 0.5;
    for (const template of ids) for (const kind of ['drinks', 'weekly']) for (const density of [4, 6]) {
      const data = M.blank(kind); data.layout.density = density; data.title = 'Angebote'; data.valid_from = '2026-11-23'; data.valid_to = '2026-11-28';
      M.useTemplate(data.layout, template);
      data.items = ['Mineralwasser still', 'Franziskaner Hefe-Weissbier naturtrüb', 'Cola Zero', 'Apfelschorle', 'Bio-Orangensaft', 'Weißbier'].map((name, i) => Object.assign(M.item(), {
        name, description: 'Kurzbeschreibung', price_cents: 1099 + i, old_price_cents: 1399, units: 12, volume_ml: 750, packaging: 'Mehrweg', deposit_cents: 330 }));
      M.applyTemplate(data); M.ensureTargets(data);
      const problems = [], text = ['name', 'pack', 'description', 'price', 'old_price', 'deposit', 'base', 'period'];
      const check = (elements, box, label) => {
        const shown = elements.filter((e) => !e.hidden);
        for (const e of shown) if (e.x < box.x - 0.5 || e.y < box.y - 0.5 || e.x + e.w > box.x + box.w + 0.5 || e.y + e.h > box.y + box.h + 0.5) problems.push(label + ': ' + e.type + ' außerhalb');
        const words = shown.filter((e) => text.includes(e.type));
        for (let i = 0; i < words.length; i++) for (let j = i + 1; j < words.length; j++) {
          if (words[i].item_id === words[j].item_id && overlap(words[i], words[j])) problems.push(label + ': ' + words[i].type + ' überlappt ' + words[j].type);
        }
      };
      const sheet = data.layout.pages[0], first = data.items[0].id, ratios = [], isHalf = template.startsWith('half');
      const markerOnTag = (elements, label) => {
        const tag = elements.find((e) => e.type === 'shape' && e.rotation !== 0), marker = elements.find((e) => e.type === 'discount');
        if (!tag || !marker || !overlap(tag, marker)) problems.push(label + ': Marker liegt nicht auf dem Preisschild');
      };
      for (const item of data.items.slice(0, density)) {
        const parts = sheet.elements.filter((e) => e.item_id === item.id), card = parts.find((e) => e.type === 'shape');
        const image = parts.find((e) => e.type === 'image');
        if (isHalf) ratios.push(image.w / card.w); else markerOnTag(parts, template + ' Sammelflyer ' + density);
        check(parts, card, template + ' Sammelflyer ' + density);
      }
      for (const target of ['card', 'single', 'scale']) {
        const layout = data.layout.targets[target].find((entry) => entry.item_id === first), image = layout.elements.find((e) => e.type === 'image');
        if (isHalf) ratios.push(image.w / layout.width); else markerOnTag(layout.elements, template + ' ' + target);
        check(layout.elements, { x: 0, y: 0, w: layout.width, h: layout.height }, template + ' ' + target);
      }
      const errors = [];
      for (let n = 0; n < data.layout.pages.length; n++) errors.push(...(await M.render(data, n, 1)).errors);
      for (const target of ['card', 'single', 'scale']) errors.push(...(await M.renderTarget(data, target, first, 1)).errors);
      output.cases.push({ label: template + ' ' + kind + ' ' + density, ratios, problems, errors });
    }
    return output;
  });
  expect(result.ids).toEqual(expect.arrayContaining(['half-red', 'half-green', 'half-blue', 'tag-red', 'tag-green', 'tag-blue']));
  expect(result.cms).not.toEqual(expect.arrayContaining(['half-red']));
  expect(result.cms).not.toEqual(expect.arrayContaining(['tag-red']));
  expect(result.cms).toContain('modern-mag-xl');
  for (const entry of result.cases) {
    for (const ratio of entry.ratios) expect(Math.abs(ratio - 0.5), entry.label).toBeLessThanOrEqual(0.01);
    expect(entry.problems, entry.label).toEqual([]);
    expect(entry.errors, entry.label).toEqual([]);
  }
});

test('TC-F21-01: Startseitenkacheln verwenden halbfette statt fette Schrift', async ({ page }) => {
  await setup(page);
  await page.goto(BASE + '/angebote.html');
  const result = await page.evaluate(async () => {
    const M = window.AngeboteModel, proto = CanvasRenderingContext2D.prototype, desc = Object.getOwnPropertyDescriptor(proto, 'font');
    let fonts = [];
    Object.defineProperty(proto, 'font', { configurable: true, get() { return desc.get.call(this); }, set(value) { fonts.push(String(value)); desc.set.call(this, value); } });
    const output = {};
    const build = async (kind) => {
      const data = M.blank(kind);
      data.title = 'Angebote'; data.valid_from = '2026-11-23'; data.valid_to = '2026-11-28';
      data.items = [Object.assign(M.item(), { name: 'Cookie&Cream 154g', price_cents: 119, old_price_cents: 149, units: 12, volume_ml: 750, packaging: 'Mehrweg', deposit_cents: 330 })];
      M.applyTemplate(data); if (kind === 'weekly') await M.adoptWeekly(data);
      M.ensureTargets(data); return data;
    };
    const heavy = /(^|\s)(bold|700|800|900)\s/;
    for (const kind of ['weekly', 'drinks']) {
      const data = await build(kind), id = data.items[0].id;
      fonts = []; await M.renderTarget(data, 'card', id, 1, true); const light = fonts.slice();
      fonts = []; await M.renderTarget(data, 'card', id, 1); const normal = fonts.slice();
      output[kind] = { lightHeavy: light.filter((f) => heavy.test(f)), lightSemibold: light.filter((f) => /^600\s/.test(f)).length, normalHeavy: normal.filter((f) => heavy.test(f)).length };
    }
    Object.defineProperty(proto, 'font', desc);
    return output;
  });
  for (const kind of ['weekly', 'drinks']) {
    expect(result[kind].lightHeavy, kind).toEqual([]);
    expect(result[kind].lightSemibold, kind).toBeGreaterThan(0);
    expect(result[kind].normalHeavy, kind).toBeGreaterThan(0);
  }
});

test('TC-F18-01/03: eigene Bilddatei bleibt bei Uploadfehler zur erneuten Speicherung erhalten', async ({ page }) => {
  const state = await setup(page);
  await page.goto(BASE + '/angebote.html');
  const dlg = await create(page, 'drinks'), row = dlg.locator('.cms-ang-row').first();
  await fillDrink(row, 1);
  await row.getByRole('button', { name: 'Produktbild bearbeiten', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await row.locator('[data-offer-action=uploadBildSP]').click();
  await (await chooser).setFiles({ name: 'produkt.png', mimeType: 'image/png', buffer: Buffer.from(PHOTO.split(',')[1], 'base64') });
  state.failImages = true;
  await dlg.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByRole('dialog').last()).toContainText('nicht geladen oder gespeichert');
  expect(state.writes).toHaveLength(0);
  await page.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await expect(dlg).toBeVisible();
  state.failImages = false;
  await dlg.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(dlg).toHaveCount(0);
  expect(state.images).toBe(2);
  const item = state.writes[0].items[0];
  expect(item.image_id).toBe('cms:ANG-' + item.id);
  expect(state.writes[0].layout.image_refs[item.id]).toBe(item.image_id);
  expect(item.werbebild_id).toBe('11111111-1111-4111-8111-111111111111');
  expect(state.errors).toEqual([]);
});

test('TC-F18-04: Original-Wochenanpassungen überstehen Speichern und Umbenennen des Artikels', async ({ page }) => {
  const state = await setup(page);
  await page.goto(BASE + '/angebote.html');
  const dlg = await create(page, 'weekly'), row = dlg.locator('.cms-ang-row').first();
  await row.locator('[data-f=produkt]').fill('Originalartikel');
  await row.locator('[data-f=preis]').fill('1,99');
  await dlg.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(dlg).toHaveCount(0);
  await showTab(page, 'Artikel');
  await page.getByText('Exakte CMS-Artikelpositionen', { exact: true }).click();
  await page.locator('[data-cms-override=imgDx]').fill('13');
  await page.locator('[data-cms-override=imgDx]').dispatchEvent('change');
  await page.getByRole('button', { name: 'Gestaltung speichern', exact: true }).click();
  await expect(page.locator('#an-root')).toHaveAttribute('aria-busy', 'false');
  const itemId = state.writes[0].items[0].id;
  expect(state.writes[1].layout.cms.plakat_article_overrides[itemId].imgDx).toBe(13);
  await page.locator('#an-overview').click();
  await page.getByRole('button', { name: 'Alle', exact: true }).click();
  await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
  const edit = page.getByRole('dialog', { name: 'Sonderaktion erfassen', exact: true });
  await edit.locator('[data-f=produkt]').first().fill('Umbenannter Originalartikel');
  await edit.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(edit).toHaveCount(0);
  expect(state.writes[2].layout.cms.plakat_article_overrides[itemId].imgDx).toBe(13);
  expect(state.writes[2].items[0].id).toBe(itemId);
  expect(state.errors).toEqual([]);
});

test('TC-F18-01/03: gefundene CMS-Bilder mit Produktnamen bleiben nach dem Speichern verknüpft', async ({ page }) => {
  const state = await setup(page);
  await page.goto(BASE + '/angebote.html');
  const dlg = await create(page, 'drinks'), row = dlg.locator('.cms-ang-row').first();
  await fillDrink(row, 1);
  await row.getByRole('button', { name: 'Produktbild bearbeiten', exact: true }).click();
  await row.locator('[data-offer-action=loadBildSharePoint]').click();
  await expect(row.locator('.cms-bild-preview')).toBeVisible();
  await dlg.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(dlg).toHaveCount(0);
  const item = state.writes[0].items[0];
  expect(item.image_id).toBe('cms:Getränk 1');
  expect(state.writes[0].layout.image_refs[item.id]).toBe(item.image_id);
  expect(state.images).toBe(0);
  await page.reload();
  await page.getByRole('button', { name: 'Alle', exact: true }).click();
  await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Getränkeaktion erfassen' }).locator('.cms-bild-preview').first()).toBeVisible();
  expect(state.errors).toEqual([]);
});

test('TC-F18-07/09: ursprüngliche aufklappbare CMS-Übersicht lädt ohne Vorlagen- und Bildabrufe', async ({ page }) => {
  const state = await setup(page);
  let templates = 0;
  await page.route('**/api/cms-config', async route => {
    templates++;
    await route.fulfill({ json: { success: true, data: { design_config: {} } } });
  });
  await page.route('**/api/angebote', route => route.fulfill({ json: { success: true, data: Array.from({ length: 30 }, (_, i) => ({
    id: '00000000-0000-4000-8000-' + String(i).padStart(12, '0'), aktion_id: 'ALT-' + i,
    aktion_titel: 'Vorhandene Aktion ' + i, name: 'Artikel ' + i, price: 1.99, old_price: 2.49,
    valid_from: '2026-11-16', valid_to: '2026-11-21', barcode: '4001234567890'
  })) } }));
  await page.goto(BASE + '/angebote.html');
  await expect(page.locator('.an-cms-overview .cms-card')).toHaveCount(30, { timeout: 2000 });
  expect(templates).toBe(0);
  expect(state.imageLookups).toHaveLength(0);
  expect((await page.getByRole('button', { name: 'Diese Woche', exact: true }).boundingBox()).width).toBeLessThan(200);
  const first = page.locator('.an-cms-overview .cms-card').first();
  await expect(first.locator('.cms-ang-items')).toBeHidden();
  await first.locator('[data-cms-toggle]').press('Enter');
  await expect(first.locator('.cms-ang-items')).toBeVisible();
  await expect(first.locator('.cms-ang-name')).toHaveText('Artikel 0');
  await expect(first.locator('.cms-btn-preview')).toBeVisible();
  await expect(first.locator('.cms-btn-wa')).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('urspruengliche-cms-uebersicht.png') });
  await first.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Sonderaktion erfassen' })).toBeVisible();
  expect(templates).toBe(1);
  expect(state.writes).toHaveLength(0);
  expect(state.errors).toEqual([]);
});

test('TC-F18-08: vorhandene SharePoint-Bilder ohne Verknüpfung und mit abgelaufenem Link werden lesend geladen', async ({ page }) => {
  const state = await setup(page);
  await page.route('**/api/angebote', route => route.fulfill({ json: { success: true, data: [0, 1, 2].map(i => ({
    id: '00000000-0000-4000-8000-' + String(i).padStart(12, '0'), aktion_id: 'ALT-BILDER',
    aktion_titel: 'Vorhandene Bilder', name: 'Artikel ' + i, price: 1.99,
    valid_from: '2026-11-16', valid_to: '2026-11-21', barcode: '400123456789' + i,
    image_key: '400123456789' + i, dl_werbebildid: i ? '11111111-1111-4111-8111-111111111111' : '',
    bild_data: i === 1 ? 'https://expired.invalid/image.jpg' : i === 2 ? PHOTO : '',
    dl_bild_base64: i === 2 ? PHOTO : ''
  })) } }));
  await page.goto(BASE + '/angebote.html');
  await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
  const dlg = page.getByRole('dialog', { name: 'Sonderaktion erfassen' });
  await expect(dlg.locator('.cms-bild-preview:visible')).toHaveCount(3);
  expect(state.imageLookups.map(it => it.artikelnummer).sort()).toEqual(['4001234567890', '4001234567891']);
  expect(state.imageLookups.every(it => it.edeka_nr && it.strichcode)).toBe(true);
  await dlg.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await page.getByRole('button', { name: 'Vorschau', exact: true }).click();
  await expect(page.locator('#an-page-label')).toHaveText('Seite 1 / 1');
  await expect(page.locator('#an-stage-info')).not.toHaveClass(/an-error/);
  expect(state.imageLookups).toHaveLength(3);
  expect(state.images).toBe(0);
  expect(state.writes).toHaveLength(0);
  expect(state.errors).toEqual([]);
});

async function openPreview(page, kind, count, withImage) {
  const dlg = await create(page, kind), rows = dlg.locator('.cms-ang-row');
  if (kind === 'drinks') for (let i = 0; i < count; i++) await fillDrink(rows.nth(i), i + 1);
  else for (let i = 0; i < count; i++) {
    await rows.nth(i).locator('[data-f=produkt]').fill('Original ' + (i + 1));
    await rows.nth(i).locator('[data-f=preis]').fill('1,99');
  }
  if (withImage) {
    await rows.first().getByRole('button', { name: 'Produktbild bearbeiten', exact: true }).click();
    const chooser = page.waitForEvent('filechooser');
    await rows.first().locator('[data-offer-action=uploadBildSP]').click();
    await (await chooser).setFiles({ name: 'produkt.png', mimeType: 'image/png', buffer: Buffer.from(PHOTO.split(',')[1], 'base64') });
  }
  await dlg.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(dlg).toHaveCount(0);
}
const middle = async (locator) => { const b = await locator.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
async function drag(page, from, to) {
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 3 });
  await page.mouse.move(to.x, to.y, { steps: 5 }); await page.mouse.up();
}
const saveDesign = async (page) => {
  await page.getByRole('button', { name: 'Gestaltung speichern', exact: true }).click();
  await expect(page.locator('#an-root')).toHaveAttribute('aria-busy', 'false');
};
// Unter 1000 px Dialogbreite liegen die Einstellungen hinter Reitern; sonst stehen sie neben der Vorschau.
const showTab = async (page, name) => {
  const tab = page.locator('.an-cms-tabbar').getByRole('button', { name, exact: true });
  if (await tab.isVisible()) await tab.click();
};

test('TC-F19-01: Elemente direkt verschieben, vergrößern und frei drehen', async ({ page }) => {
  const state = await setup(page);
  await page.goto(BASE + '/angebote.html');
  await openPreview(page, 'drinks', 2);
  const stage = page.locator('#an-stage'), selected = page.locator('#an-hit-layer .an-selected');
  await expect(selected).toBeVisible();
  const stageBefore = await stage.boundingBox(), before = await selected.boundingBox();
  const id = await page.locator('#an-select-element').inputValue();
  const xBefore = Number(await page.locator('[data-element-prop=x]').inputValue());
  const start = await selected.evaluate((element) => {
    const box = element.getBoundingClientRect();
    for (let y = box.top + 3; y < box.bottom; y += 3) for (let x = box.left + 3; x < box.right; x += 3) {
      if (document.elementFromPoint(x, y) === element) return { x, y };
    }
    return null;
  });
  expect(start).not.toBeNull();
  await drag(page, start, { x: start.x + 30, y: start.y + 20 });
  expect(await page.locator('#an-select-element').inputValue()).toBe(id);
  expect(Number(await page.locator('[data-element-prop=x]').inputValue())).toBeGreaterThan(xBefore + 10);
  expect(await stage.boundingBox()).toEqual(stageBefore);
  const width = Number(await page.locator('[data-element-prop=w]').inputValue());
  const grip = await middle(page.locator('#an-hit-layer [data-resize]'));
  await drag(page, grip, { x: grip.x + 30, y: grip.y + 30 });
  expect(Number(await page.locator('[data-element-prop=w]').inputValue())).toBeGreaterThan(width);
  const turn = await middle(page.locator('#an-hit-layer [data-rotate]')), center = await middle(page.locator('#an-hit-layer .an-selected'));
  await drag(page, turn, { x: center.x + 80, y: center.y });
  await expect(page.locator('[data-element-prop=rotation][type=number]')).toHaveValue('90');
  await saveDesign(page);
  const saved = state.writes.at(-1).layout.pages.flatMap((entry) => entry.elements).find((entry) => entry.id === id);
  expect(saved.rotation).toBe(90);
  expect(saved.w).toBeGreaterThan(width);
  expect(state.errors).toEqual([]);
});

test('TC-F19-02: Werkzeuge stehen neben bzw. unter dem fest sichtbaren Motiv', async ({ page }) => {
  await setup(page);
  await page.goto(BASE + '/angebote.html');
  await openPreview(page, 'drinks', 2);
  const modal = page.locator('.an-cms-preview-modal'), canvas = page.locator('.an-cms-canvas'), side = page.locator('.an-cms-side');
  const view = page.viewportSize(), dialogBox = await modal.boundingBox();
  const canvasBox = await canvas.boundingBox(), sideBox = await side.boundingBox();
  if (dialogBox.width >= 640) expect(canvasBox.x + canvasBox.width).toBeLessThanOrEqual(sideBox.x + 2);
  else expect(canvasBox.y + canvasBox.height).toBeLessThanOrEqual(sideBox.y + 2);
  if (dialogBox.width >= 1000) expect(canvasBox.width).toBeGreaterThanOrEqual((canvasBox.width + sideBox.width) * .49);
  else expect((await page.locator('#an-stage').boundingBox()).width).toBeGreaterThanOrEqual(view.width * (dialogBox.width >= 640 ? .35 : .5));
  for (const field of await side.locator('input:not([type=checkbox]):visible,select:visible').all()) {
    const height = (await field.boundingBox()).height;
    if (dialogBox.width < 640) expect(height).toBeGreaterThanOrEqual(44);
    else expect(height).toBeLessThanOrEqual(40);
  }
  if (view.width >= 1200) expect(await modal.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
  await expect(side.locator('[data-element-prop=fill]')).toBeVisible();
  await expect(side.locator('[data-element-prop=opacity]')).toBeVisible();
  await expect(side.locator('[data-nudge]')).toHaveCount(4);
  await modal.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  const stage = await page.locator('#an-stage').boundingBox();
  expect(stage.y).toBeGreaterThanOrEqual(0);
  expect(stage.y + stage.height).toBeLessThanOrEqual(view.height);
  expect(await modal.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('vorschau-mit-seitlichen-werkzeugen.png') });
});

test('TC-F19-03/TC-F39-04: Artikel, Farbe und Undo/Redo in der Vorschau bearbeiten und speichern', async ({ page }) => {
  const state = await setup(page);
  await page.goto(BASE + '/angebote.html');
  await openPreview(page, 'drinks', 2);
  const undo = page.locator('.an-toolbar [data-history=undo]'), redo = page.locator('.an-toolbar [data-history=redo]');
  await expect(undo).toBeVisible(); await expect(redo).toBeVisible();
  await expect(undo).toBeDisabled(); await expect(redo).toBeDisabled();
  const name = page.locator('[data-cms-article=name]'), price = page.locator('[data-cms-article=price_cents]');
  await showTab(page, 'Artikel');
  await name.fill('Geändertes Bier'); await name.dispatchEvent('change');
  await price.fill('9,5'); await price.dispatchEvent('change');
  await expect(price).toHaveValue('9,50');
  await showTab(page, 'Element');
  const id = await page.locator('#an-select-element').inputValue();
  const fill = page.locator('[data-element-prop=fill]'), original = await fill.inputValue();
  await fill.fill('#ff0000');
  await expect(fill).toHaveValue('#ff0000');
  await expect(undo).toBeEnabled();
  const writes = state.writes.length;
  await undo.click();
  await expect(page.locator('[data-element-prop=fill]')).toHaveValue(original);
  await expect(redo).toBeEnabled(); await redo.click();
  await expect(page.locator('[data-element-prop=fill]')).toHaveValue('#ff0000');
  await undo.focus(); await page.keyboard.press('Control+z');
  await expect(page.locator('[data-element-prop=fill]')).toHaveValue(original);
  await redo.focus(); await page.keyboard.press('Control+Shift+z');
  await expect(page.locator('[data-element-prop=fill]')).toHaveValue('#ff0000');
  expect(state.writes).toHaveLength(writes);
  await page.locator('[data-element-prop=fill]').fill('#00aa00');
  await expect(redo).toBeDisabled();
  await saveDesign(page);
  const write = state.writes.at(-1);
  expect(write.items[0].name).toBe('Geändertes Bier');
  expect(write.items[0].price_cents).toBe(950);
  expect(write.layout.pages.flatMap((entry) => entry.elements).find((entry) => entry.id === id).fill).toBe('#00aa00');
  await showTab(page, 'Artikel');
  await name.fill(''); await name.dispatchEvent('change');
  await expect(page.getByRole('dialog').last()).toContainText('Artikelnamen');
  expect(state.errors).toEqual([]);
});

test('TC-F19-04: Original-Wochenvorschau mit Seitenleiste und frei ziehbarem Drehgriff', async ({ page }) => {
  const state = await setup(page);
  await page.goto(BASE + '/angebote.html');
  await openPreview(page, 'weekly', 1);
  const surface = page.locator('.an-weekly-surface');
  await expect(surface.locator('canvas')).toBeVisible();
  const stageBox = await surface.locator('.an-stage').boundingBox(), toolsBox = await surface.locator('.an-direct-tools').boundingBox();
  const stacked = (await page.locator('.an-cms-preview-modal').boundingBox()).width < 1000;
  if (stacked) expect(stageBox.y + stageBox.height).toBeLessThanOrEqual(toolsBox.y + 2);
  else expect(stageBox.x + stageBox.width).toBeLessThanOrEqual(toolsBox.x + 2);
  const turn = await middle(surface.locator('[data-preview-rotate]')), center = await middle(surface.locator('.an-selected'));
  await drag(page, turn, { x: center.x + 80, y: center.y });
  await saveDesign(page);
  const overrides = Object.values(state.writes.at(-1).layout.cms.plakat_article_overrides)[0];
  const part = (await surface.locator('select').inputValue()).split(':').pop();
  expect(Math.abs(overrides[part + 'Rot'])).toBeGreaterThan(60);
  expect(state.errors).toEqual([]);
});

const SURFACES = [['angebote', '/angebote.html'], ['kiosk', '/kiosk.html'], ['cms', '/cms.html?tab=ang']];
async function openSurface(page, path) {
  await page.goto(BASE + path);
  if (path.startsWith('/kiosk')) await page.evaluate(() => window.K.switchTab('angebote'));
}

for (const [surface, path] of SURFACES) {
  test(`TC-F26-01/F27-01: Original-Wochenvorschau hat überall dieselben Werkzeuge (${surface})`, async ({ page }) => {
    const state = await setup(page);
    await openSurface(page, path);
    await openPreview(page, 'weekly', 1, true);
    const surfaceBox = page.locator('.an-weekly-surface');
    await expect(surfaceBox.locator('canvas')).toBeVisible();
    const select = surfaceBox.locator('[data-preview-element]');
    const part = async (suffix) => select.locator('option[value$=":' + suffix + '"]');
    // kompakt: keine Streckung zwischen den Werkzeugblöcken
    const stacked = (await page.locator('.an-cms-preview-modal').boundingBox()).width < 1000;
    if (!stacked) {
      const boxes = [];
      for (const selector of ['.an-direct-tools', '.an-extras', '#an-cms-article', '#an-inspector > details']) boxes.push(await page.locator('.an-cms-preview-modal ' + selector).first().boundingBox());
      for (let i = 1; i < boxes.length; i++) expect(boxes[i].y - (boxes[i - 1].y + boxes[i - 1].height)).toBeLessThanOrEqual(60);
    }
    // Pfeile, Drehung
    await surfaceBox.locator('[data-preview-nudge="2,0"]').click();
    await surfaceBox.locator('[data-x-rot]').fill('40');
    await expect(surfaceBox.locator('[data-x-rot-out]')).toHaveText('40°');
    // Ghost, Duplikat, Kopien
    await surfaceBox.getByRole('button', { name: 'Ghost', exact: true }).click();
    await expect(surfaceBox.getByRole('button', { name: 'Ghost', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(await part('ghost')).toHaveCount(1);
    await surfaceBox.getByRole('button', { name: 'Duplikat', exact: true }).click();
    await expect(await part('dup')).toHaveCount(1);
    await surfaceBox.getByRole('button', { name: '+ Ghost', exact: true }).click();
    await expect(surfaceBox.locator('.an-chip')).toHaveCount(1);
    await expect(await part('copy-0')).toHaveCount(1);
    await surfaceBox.getByRole('button', { name: 'Kopie 1 löschen', exact: true }).click();
    await expect(surfaceBox.locator('.an-chip')).toHaveCount(0);
    await surfaceBox.locator('[data-x-prop=ghostAlpha]').fill('60');
    // Eigenes Bild
    await surfaceBox.locator('[data-x-image]').setInputFiles({ name: 'eigen.png', mimeType: 'image/png', buffer: Buffer.from(PHOTO.split(',')[1], 'base64') });
    await expect(await part('customImg')).toHaveCount(1, { timeout: 15000 });
    await saveDesign(page);
    const saved = Object.values(state.writes.at(-1).layout.cms.plakat_article_overrides)[0];
    expect(saved).toMatchObject({ ghostMode: 'on', dupOn: true, imgRot: 40 });
    expect(saved.imgDx).toBeGreaterThan(0);
    expect(saved.ghostAlpha).toBeCloseTo(.6);
    expect(saved.customImg).toMatch(/^data:image\/png;base64,/);
    // Alles zurücksetzen
    await surfaceBox.getByRole('button', { name: 'Alles zurücksetzen', exact: true }).click();
    await page.getByRole('dialog').last().getByRole('button', { name: 'Zurücksetzen', exact: true }).click();
    await expect(surfaceBox.getByRole('button', { name: 'Ghost', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect(await part('customImg')).toHaveCount(0);
    expect(state.errors).toEqual([]);
  });

  test(`TC-F27-02: Freie Gestaltung bietet überall Ghost, Duplizieren, Eigenes Bild und Drehung (${surface})`, async ({ page }) => {
    const state = await setup(page);
    await openSurface(page, path);
    await openPreview(page, 'drinks', 2);
    const tools = page.locator('#an-inspector');
    const count = async () => (await page.locator('#an-select-element option').count());
    const before = await count();
    await expect(tools.getByRole('button', { name: '+ Eigenes Bild', exact: true })).toBeVisible();
    await tools.getByRole('button', { name: 'Ghost', exact: true }).click();
    await expect.poll(count).toBe(before + 1);
    await tools.getByRole('button', { name: 'Duplizieren', exact: true }).click();
    await expect.poll(count).toBe(before + 2);
    await tools.locator('[data-element-prop=rotation][type=range]').fill('30');
    await saveDesign(page);
    const elements = state.writes.at(-1).layout.pages.flatMap((entry) => entry.elements);
    expect(elements.some((e) => e.opacity === .35)).toBe(true);
    expect(elements.some((e) => e.rotation === 30)).toBe(true);
    expect(state.errors).toEqual([]);
  });
}

test('TC-F23-01..03: Stil gilt je Ausgabeziel; freie Positionen werden erst nach Bestätigung ersetzt', async ({ page }) => {
  const state = await setup(page);
  await page.goto(BASE + '/angebote.html');
  await openPreview(page, 'drinks', 2);
  const chosen = () => page.locator('input[data-style=template]:checked').first().inputValue();
  const pick = async (id) => {
    await showTab(page, 'Vorlage');
    const picker = page.locator('.an-template-picker').first();
    if (!(await picker.evaluate((d) => d.open))) await picker.locator('> summary').click();
    await page.locator('label.an-choice', { has: page.locator('input[data-style=template][value=' + id + ']') }).click();
  };
  const original = await chosen();
  await page.locator('[data-layout-target=card]').click();
  await pick('half-red');
  await expect.poll(chosen).toBe('half-red');
  await expect(page.getByRole('dialog', { name: 'Gestaltung ersetzen?' })).toHaveCount(0);
  await expect(page.locator('[data-style=density]').first()).toBeHidden();
  await page.locator('[data-layout-target=single]').click();
  await expect.poll(chosen).toBe(original);
  await page.locator('[data-layout-target=card]').click();
  await expect.poll(chosen).toBe('half-red');
  await saveDesign(page);
  let layout = state.writes.at(-1).layout;
  expect(layout.target_styles.card.template).toBe('half-red');
  expect(layout.target_styles.single).toBeUndefined();
  expect(layout.template).toBe(original);
  expect(layout.targets.card.every((entry) => entry.background === layout.target_styles.card.background)).toBe(true);
  // freie Position → Rückfrage
  await showTab(page, 'Element');
  await page.locator('#an-select-element').selectOption({ index: 1 });
  await page.locator('[data-element-prop=x]').fill('77');
  await page.locator('[data-element-prop=x]').dispatchEvent('change');
  await pick('tag-green');
  const dialog = page.getByRole('dialog').last();
  await expect(dialog).toContainText('Gestaltung ersetzen?');
  await dialog.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect.poll(chosen).toBe('half-red');
  await pick('tag-green');
  await page.getByRole('dialog').last().getByRole('button', { name: 'Stil anwenden', exact: true }).click();
  await expect.poll(chosen).toBe('tag-green');
  await saveDesign(page);
  layout = state.writes.at(-1).layout;
  expect(layout.target_styles.card.template).toBe('tag-green');
  expect(state.errors).toEqual([]);
});
test('TC-F24-01: Buttons und Felder sind klar erkennbar (Kontrast)', async ({ page }) => {
  await setup(page);
  await page.goto(BASE + '/angebote.html');
  await openPreview(page, 'drinks', 2);
  const result = await page.evaluate(() => {
    const parse = (value) => value.match(/[\d.]+/g).slice(0, 4).map(Number);
    const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    const out = [];
    const check = (label, element, around) => {
      const style = getComputedStyle(element);
      out.push({ label, border: ratio(parse(style.borderTopColor), around), text: ratio(parse(style.color), parse(style.backgroundColor)) });
    };
    const dialog = document.querySelector('.an-cms-preview-modal');
    const white = [255, 255, 255];
    check('Standard', [...dialog.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Download'), white);
    check('Standard klein', [...dialog.querySelectorAll('.an-cms-side button')].find((b) => b.textContent.includes('Duplizieren')), white);
    check('Feld', dialog.querySelector('.an-cms-side input[data-cms-article=name]'), white);
    const primary = [...dialog.querySelectorAll('button')].find((b) => b.textContent.includes('Gestaltung speichern'));
    out.push({ label: 'Primär', border: 4, text: ratio(parse(getComputedStyle(primary).color), parse(getComputedStyle(primary).backgroundColor)) });
    return out;
  });
  for (const entry of result) {
    expect(entry.border, entry.label).toBeGreaterThanOrEqual(3);
    expect(entry.text, entry.label).toBeGreaterThanOrEqual(4.5);
  }
});

for (const kind of ['weekly', 'drinks']) {
  test(`TC-F31-01: Gestaltung liegt neben der Vorschau bzw. hinter Reitern (${kind})`, async ({ page }) => {
    const state = await setup(page);
    await page.goto(BASE + '/angebote.html');
    await openPreview(page, kind, 2);
    const modal = page.locator('.an-cms-preview-modal'), panel = page.locator('.an-cms-style-options');
    const stage = page.locator(kind === 'weekly' ? '.an-weekly-surface .an-stage' : '#an-stage');
    const dialog = await modal.boundingBox(), view = page.viewportSize();
    await expect(page.locator('details.an-cms-style-options')).toHaveCount(0);
    const inView = async (locator) => {
      const b = await locator.boundingBox();
      expect(b.y).toBeGreaterThanOrEqual(-1);
      expect(b.y + b.height).toBeLessThanOrEqual(view.height + 1);
    };
    if (dialog.width >= 1000) {
      await expect(panel).toBeVisible();
      const s = await stage.boundingBox(), p = await panel.boundingBox();
      expect(s.x + s.width).toBeLessThanOrEqual(p.x + 2);
      const previewWidth = kind === 'weekly'
        ? await page.locator('#an-inspector').evaluate((node) => parseFloat(getComputedStyle(node).gridTemplateColumns))
        : await page.locator('.an-cms-canvas').evaluate((node) => node.clientWidth);
      expect(previewWidth).toBeGreaterThanOrEqual(dialog.width * .4);
      await expect(page.locator('.an-cms-tabbar')).toBeHidden();
      await inView(kind === 'weekly' ? page.locator('[data-cms-config=savingsMarkerType]') : panel.locator('.an-template-picker > summary'));
    } else {
      await expect(page.locator('.an-cms-tabbar button')).toHaveCount(kind === 'weekly' ? 4 : 3);
      await expect(panel).toBeHidden();
      await showTab(page, 'Vorlage');
      await expect(panel).toBeVisible();
      await inView(stage);
      if (kind === 'weekly') {
        await expect(page.locator('[data-cms-config=plakatTemplate]')).toBeVisible();
        await expect(page.locator('[data-cms-config=savingsMarkerType]')).toBeHidden();
        await showTab(page, 'Marker');
        await expect(page.locator('[data-cms-config=savingsMarkerType]')).toBeVisible();
        await expect(page.locator('[data-cms-config=plakatTemplate]')).toBeHidden();
        await inView(stage);
      }
      await showTab(page, 'Element');
      await expect(panel).toBeHidden();
    }
    expect(await modal.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    expect(state.errors).toEqual([]);
  });
}

test('TC-F31-02: Weekly-Ziele behalten alle Werkzeuge; Farbänderung wirkt sofort in der Vorschau', async ({ page }) => {
  const state = await setup(page);
  await page.goto(BASE + '/angebote.html');
  await openPreview(page, 'weekly', 2);
  const surface = page.locator('.an-weekly-surface');
  for (const target of ['card', 'single', 'sheet', 'scale']) {
    await page.locator('[data-layout-target=' + target + ']').click();
    await showTab(page, 'Element');
    await expect(surface.locator('canvas')).toBeVisible();
    for (const name of ['Ghost', 'Duplikat', '+ Ghost', '+ Duplikat', 'Element zurücksetzen', 'Alles zurücksetzen']) {
      await expect(surface.getByRole('button', { name, exact: true })).toBeVisible();
    }
    await expect(surface.locator('[data-x-image]')).toBeAttached();
    await expect(surface.locator('[data-x-rot]')).toBeVisible();
  }
  await page.locator('[data-layout-target=sheet]').click();
  const canvas = surface.locator('canvas'), before = await canvas.evaluate((c) => c.toDataURL());
  await showTab(page, 'Vorlage');
  const color = page.locator('[data-cms-config=plakat_decoBgColor]');
  await color.fill('#336699'); await color.dispatchEvent('change');
  await expect.poll(async () => (await surface.locator('canvas').evaluate((c) => c.toDataURL())) !== before).toBe(true);
  await saveDesign(page);
  expect(state.writes.at(-1).layout.cms.config.plakat_decoBgColor).toBe('#336699');
  expect(state.errors).toEqual([]);
});

test('TC-F31-02: Getränke-Ziele behalten alle Werkzeuge; Stiländerung wirkt je Ziel', async ({ page }) => {
  const state = await setup(page);
  await page.goto(BASE + '/angebote.html');
  await openPreview(page, 'drinks', 2);
  const tools = page.locator('#an-inspector');
  for (const target of ['card', 'single', 'sheet', 'scale']) {
    await page.locator('[data-layout-target=' + target + ']').click();
    await showTab(page, 'Element');
    for (const name of ['+ Eigenes Bild', 'Ghost', 'Duplizieren']) await expect(tools.getByRole('button', { name, exact: true })).toBeVisible();
    await expect(tools.locator('[data-element-prop=rotation][type=range]')).toBeVisible();
  }
  await page.locator('[data-layout-target=card]').click();
  await showTab(page, 'Vorlage');
  const color = page.locator('input[data-style=background]');
  await color.fill('#336699'); await color.dispatchEvent('change');
  await saveDesign(page);
  expect(state.writes.at(-1).layout.target_styles.card.background).toBe('#336699');
  expect(state.errors).toEqual([]);
});
