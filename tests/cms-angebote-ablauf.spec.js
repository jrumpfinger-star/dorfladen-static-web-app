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
          || (action.valid_from <= '2026-11-18' && action.valid_to >= '2026-11-18'));
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

test('TC-F18-01/03: eigene Bilddatei bleibt bei Uploadfehler zur erneuten Speicherung erhalten', async ({ page }) => {
  const state = await setup(page);
  await page.goto(BASE + '/angebote.html');
  const dlg = await create(page, 'drinks'), row = dlg.locator('.cms-ang-row').first();
  await fillDrink(row, 1);
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

async function openPreview(page, kind, count) {
  const dlg = await create(page, kind), rows = dlg.locator('.cms-ang-row');
  if (kind === 'drinks') for (let i = 0; i < count; i++) await fillDrink(rows.nth(i), i + 1);
  else for (let i = 0; i < count; i++) {
    await rows.nth(i).locator('[data-f=produkt]').fill('Original ' + (i + 1));
    await rows.nth(i).locator('[data-f=preis]').fill('1,99');
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
  await expect(page.locator('[data-element-prop=rotation]')).toHaveValue('90');
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
  if (dialogBox.width >= 640) expect(canvasBox.width).toBeGreaterThanOrEqual((canvasBox.width + sideBox.width) * .49);
  else expect((await page.locator('#an-stage').boundingBox()).width).toBeGreaterThanOrEqual(view.width * .5);
  for (const field of await side.locator('input:visible,select:visible').all()) expect((await field.boundingBox()).height).toBeLessThanOrEqual(40);
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

test('TC-F19-03: Artikel, Farbe und Rückgängig in der Vorschau bearbeiten und speichern', async ({ page }) => {
  const state = await setup(page);
  await page.goto(BASE + '/angebote.html');
  await openPreview(page, 'drinks', 2);
  const name = page.locator('[data-cms-article=name]'), price = page.locator('[data-cms-article=price_cents]');
  await name.fill('Geändertes Bier'); await name.dispatchEvent('change');
  await price.fill('9,5'); await price.dispatchEvent('change');
  await expect(price).toHaveValue('9,50');
  const id = await page.locator('#an-select-element').inputValue();
  const fill = page.locator('[data-element-prop=fill]'), original = await fill.inputValue();
  await fill.fill('#ff0000');
  await expect(fill).toHaveValue('#ff0000');
  await page.locator('#an-inspector [data-history=undo]').click();
  await expect(page.locator('[data-element-prop=fill]')).toHaveValue(original);
  await page.locator('[data-element-prop=fill]').fill('#00aa00');
  await saveDesign(page);
  const write = state.writes.at(-1);
  expect(write.items[0].name).toBe('Geändertes Bier');
  expect(write.items[0].price_cents).toBe(950);
  expect(write.layout.pages.flatMap((entry) => entry.elements).find((entry) => entry.id === id).fill).toBe('#00aa00');
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
  const stacked = (await page.locator('.an-cms-preview-modal').boundingBox()).width < 640;
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
