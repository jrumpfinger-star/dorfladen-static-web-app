const { test, expect } = require('@playwright/test');
const BASE = process.env.TEST_URL || 'http://127.0.0.1:8818';
const PHOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6hywAAAAASUVORK5CYII=';

async function setup(page) {
  const state = { actions: new Map(), revisions: new Map(), writes: [], errors: [], offerReads: [], imageLookups: [], failSave: false, failReads: false, images: 0, featureArchive: false };
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
        if (state.failReads) return json({ success: false, error: 'Dataverse nicht erreichbar' }, 503);
        const token = req.headers()['x-cms-auth'] || '';
        state.offerReads.push(token);
        const visible = [...state.actions.values()].filter((action) => token === 'test-cms-session'
          || action.valid_to >= '2026-11-18');
        return json({ success: true, config: { scale_enabled: false, scale_scope: 'preview', feature_archive_enabled: state.featureArchive },
          data: visible.flatMap((action) => action.items.map((it, i) => ({
            id: it.id, dl_angeboteid: it.id, dl_aktion_id: action.aktion_id, dl_aktion_titel: action.title,
            dl_gueltig_von: action.valid_from, dl_gueltig_bis: action.valid_to, dl_sortierung: i,
            dl_produkt: it.name, dl_details: it.description, dl_preis: it.price_cents / 100,
            dl_statt_preis: it.old_price_cents == null ? null : it.old_price_cents / 100,
            dl_artikelnummer: it.barcode, dl_werbebildid: it.werbebild_id, image_key: it.image_id?.slice(4),
            bild_data: it.image_id ? PHOTO : '', action_kind: action.kind, action_layout: action.layout,
            units: it.units, volume_ml: it.volume_ml, packaging: it.packaging,
            deposit_cents: it.deposit_cents, deposit_free: it.deposit_free, article_number: it.article_number,
            action_revision: 'rev-' + (state.revisions.get(action.aktion_id) || 1)
          }))) });
      }
      const body = req.postDataJSON(); state.writes.push(body);
      if (state.failSave) return json({ success: false, error: 'Offer action changed; reload before saving' }, 409);
      if (url.searchParams.get('action') === 'delete') {
        if (state.actions.has(body.aktion_id) && body.revision !== 'rev-' + (state.revisions.get(body.aktion_id) || 1)) {
          return json({ success: false, error: 'Offer action changed; reload before deleting' }, 409);
        }
        state.actions.delete(body.aktion_id); return json({ success: true });
      }
      const canonical = (id) => id.replace(/-/g, '').toLowerCase().replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
      const existing = state.actions.get(body.aktion_id);
      if (existing && (existing.items.map((it) => canonical(it.id)).sort().join() !== body.original_ids.map(canonical).sort().join()
        || body.revision !== 'rev-' + (state.revisions.get(body.aktion_id) || 1))) {
        return json({ success: false, error: 'Offer action changed; reload before saving' }, 409);
      }
      state.revisions.set(body.aktion_id, (state.revisions.get(body.aktion_id) || 0) + 1);
      state.actions.set(body.aktion_id, structuredClone(body));
      return json({ success: true, aktion_id: body.aktion_id, items: body.items.map((it) => ({ id: canonical(it.id), client_id: it.id })) });
    }
    if (path === '/api/angebote-verwaltung') return json({ success: true, actions: [], config: { scale_enabled: false } });
    return json({ success: true, data: [], groups: {}, value: [] });
  });
  return state;
}

async function create(page, kind) {
  await page.getByRole('button', { name: kind === 'drinks' ? '+ Getränkeaktion' : '+ Sonderaktion', exact: true }).click();
  const dlg = page.getByRole('dialog', { name: kind === 'drinks' ? 'Getränkeaktion erfassen' : 'Sonderaktion erfassen', exact: true });
  await focusRow(dlg.locator('.cms-ang-row').first());
  await showMeta(dlg);
  return dlg;
}

async function focusRow(row) {
  if (await row.isVisible()) return;
  const dlg = row.locator('xpath=ancestor::dialog'), id = await row.getAttribute('id');
  const back = dlg.locator('[data-capture-back]');
  if (await back.isVisible()) await back.click();
  await dlg.locator('[data-capture-item="' + id + '"]').click();
}

async function allWeeks(page) {
  const all = page.locator('.an-cms-overview [data-week=all]');
  await all.waitFor({ state: 'attached' });
  if (!(await all.isVisible())) await page.locator('[data-filter-toggle]').click();
  await all.click();
}

async function showMeta(dlg) {
  if (!(await dlg.locator('[data-meta=title]').isVisible())) await dlg.locator('[data-meta-toggle]').click();
}
async function selectArea(scope, value) {
  const select = scope.getByLabel('Aktionsbereich', { exact: true });
  if (await select.isVisible()) await select.selectOption(value);
  else await scope.locator('[data-action-area=' + value + ']').click();
}

async function fillDrink(row, index) {
  await focusRow(row);
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
      await focusRow(row);
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
      return [...el.querySelectorAll('input:not([type=hidden]),select,.an-image-trigger')].filter(field => field.checkVisibility()).map(field => {
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
    await allWeeks(page);
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
    await focusRow(row);
    await input.fill('ART1');
    await expect(dd.locator('button')).toHaveCount(12);
    await input.evaluate(el => {
      const body = el.closest('.an-capture-body');
      body.scrollTop += el.getBoundingClientRect().bottom - body.getBoundingClientRect().bottom + 14;
    });
    await expect(dd).toBeVisible();
    await expect.poll(async () => {
      const b = await dd.boundingBox(), anchor = await input.boundingBox();
      const phone = await dlg.evaluate(node => node.classList.contains('an-capture-phone'));
      return !!b && b.y >= 0 && b.y + b.height <= page.viewportSize().height
        && (b.y + b.height <= anchor.y || (phone && b.y >= anchor.y + anchor.height));
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
  await showMeta(dlg);
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
  await showTab(page, 'Ansicht');
  await expect(page.locator('#an-page-label')).toHaveText('Seite 1 / 2');
  await page.getByRole('button', { name: 'Nächste Flyerseite', exact: true }).click();
  await expect(page.locator('#an-page-label')).toHaveText('Seite 2 / 2');
  await expect(page.locator('#an-stage-info')).not.toHaveClass(/an-error/);
  await showTab(page, 'Ausgabe');
  const download = page.waitForEvent('download');
  await page.locator('[data-cms-download]').click();
  expect((await download).suggestedFilename()).toContain('Seite 2');
  await page.screenshot({ path: test.info().outputPath('getraenke-vorschau.png') });
  await page.locator('[data-output-target]').selectOption('single');
  await page.locator('[data-cms-singles]').click();
  const selection = page.getByRole('dialog', { name: 'Einzelflyer auswählen', exact: true });
  await selection.getByRole('button', { name: 'Alle auswählen', exact: true }).click();
  await expect(selection.locator('input:checked')).toHaveCount(6);
  await selection.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await showTab(page, 'Element');
  await expect(page.locator('#an-design-item option')).toHaveCount(6);
  await page.locator('#an-overview').click();
  await allWeeks(page);
  await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
  const reopened = page.getByRole('dialog', { name: 'Getränkeaktion erfassen', exact: true });
  await expect(reopened.locator('[data-density]')).toHaveValue('4');
  await expect(reopened.locator('.cms-ang-row')).toHaveCount(6);
  await expect(reopened.locator('[data-f=volume_ml]').last()).toHaveValue('0,5');
  await showMeta(reopened);
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
  const positions = page.locator('details', { hasText: 'Exakte CMS-Artikelpositionen' }).last();
  if (!(await positions.evaluate((node) => node.open))) await positions.locator('> summary').click();
  await page.locator('[data-cms-override=imgDx]').fill('13');
  await page.locator('[data-cms-override=imgDx]').dispatchEvent('change');
  await page.getByRole('button', { name: 'Gestaltung speichern', exact: true }).click();
  await expect(page.locator('#an-root')).toHaveAttribute('aria-busy', 'false');
  const itemId = state.writes[0].items[0].id;
  expect(state.writes[1].layout.cms.plakat_article_overrides[itemId].imgDx).toBe(13);
  await page.locator('#an-overview').click();
  await allWeeks(page);
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
  await allWeeks(page);
  await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
  const reopened = page.getByRole('dialog', { name: 'Getränkeaktion erfassen' });
  if (page.viewportSize().width < 600) await expect(reopened.locator('[data-capture-item] img').first()).toBeVisible();
  await focusRow(reopened.locator('.cms-ang-row').first());
  await expect(reopened.locator('.cms-bild-preview').first()).toBeVisible();
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
  const week = page.getByRole('button', { name: 'Diese Woche', exact: true });
  if (!(await week.isVisible())) await page.locator('[data-filter-toggle]').click();
  expect((await week.boundingBox()).width).toBeLessThan(200);
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

async function openPreview(page, kind, count, withImage, density) {
  const dlg = await create(page, kind), rows = dlg.locator('.cms-ang-row');
  if (density) await dlg.locator('[data-density]').selectOption(String(density));
  while (await rows.count() < count) {
    const add = dlg.getByRole('button', { name: '+ Artikel', exact: true });
    if (!(await add.isVisible())) await dlg.locator('[data-capture-back]').click();
    await add.click();
  }
  if (kind === 'drinks') for (let i = 0; i < count; i++) await fillDrink(rows.nth(i), i + 1);
  else for (let i = 0; i < count; i++) {
    await focusRow(rows.nth(i));
    await rows.nth(i).locator('[data-f=produkt]').fill('Original ' + (i + 1));
    await rows.nth(i).locator('[data-f=preis]').fill('1,99');
  }
  if (withImage) {
    await focusRow(rows.first());
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
  const root = page.locator('#an-root');
  if (name === 'Ausgabe') { await selectArea(root, 'output'); return; }
  if (await root.getAttribute('data-output-mode') === 'true') await selectArea(root, 'design');
  const tab = page.locator('.an-cms-tabbar').getByRole('button', { name, exact: true });
  if (await tab.isVisible()) await tab.click();
};
// Mausbedienung ab 600 px: 32 px hohe Kontrollen; Touch und Telefone behalten mindestens 44 px.
const compactMouse = (page) => page.evaluate(() => innerWidth >= 600 && matchMedia('(hover:hover) and (pointer:fine)').matches && !matchMedia('(any-pointer:coarse)').matches);
async function workspaceView(root, mode) {
  const select = root.locator('[aria-label=Arbeitsansicht]');
  const toggle = root.locator('[data-workspace-views]');
  await expect(select.or(toggle).locator('visible=true').first()).toBeVisible();
  if (!(await select.isVisible())) await toggle.click();
  await select.selectOption(mode);
}

test('TC-F65-03: Aktion laedt benannten Bereichsstandard bestaetigt und behaelt fremde Ziele', async ({ page }) => {
  const state = await setup(page);
  await page.goto(BASE + '/angebote.html');
  await openPreview(page, 'drinks', 2);
  const root = page.locator('#an-root');
  const standard = await page.evaluate(() => {
    const M = window.AngeboteModel, layout = M.blank('drinks').layout;
    layout.background = '#224466';
    M.setDesignProvenance(layout, 'sheet', 'Fruehlingsvorlage');
    return layout;
  });
  await page.route('**/api/angebote-verwaltung?view=design', route => route.fulfill({ json: { success: true, design: { drinks: standard } } }));
  await workspaceView(root.locator('.an-cms-workspace'), 'inputs');
  await showTab(page, 'Vorlage');
  const color = root.locator('input[data-style=background]');
  await color.fill('#552244');
  await root.locator('#an-defaults').click();
  await page.getByRole('dialog').last().getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect(color).toHaveValue('#552244');
  expect(state.writes).toHaveLength(1);
  await root.locator('#an-defaults').click();
  await page.getByRole('dialog').last().getByRole('button', { name: 'Vorlage anwenden', exact: true }).click();
  await expect(root.locator('[data-action-design-context]')).toContainText('Fruehlingsvorlage');
  await expect(color).toHaveValue('#224466');
  await saveDesign(page);
  expect(state.writes[1].layout.targets.card).toEqual(state.writes[0].layout.targets.card);
  expect(state.writes[1].items).toEqual(state.writes[0].items);
  await root.locator('#an-overview').click();
  await allWeeks(page);
  await page.getByRole('button', { name: 'Vorschau', exact: true }).click();
  await expect(root.locator('[data-action-design-context]')).toContainText('Fruehlingsvorlage');
  expect(state.writes).toHaveLength(2);
  expect(state.errors).toEqual([]);
});

test('TC-F65-01: Neue Getraenkeaktion uebernimmt die Herkunft des gespeicherten Bereichsstandards', async ({ page }) => {
  const state = await setup(page);
  state.featureArchive = true;
  await page.goto(BASE + '/angebote.html');
  const layout = await page.evaluate(() => {
    const M = window.AngeboteModel, layout = M.blank('drinks').layout;
    M.setDesignProvenance(layout, 'sheet', 'Sommerangebote');
    return layout;
  });
  await page.route('**/api/angebote-verwaltung?view=design', route => route.fulfill({ json: { success: true, design: { drinks: layout } } }));
  await openPreview(page, 'drinks', 1);
  await expect(page.locator('[data-action-design-context]')).toContainText('Sommerangebote');
  await expect(page.locator('[data-article-prev]')).toBeDisabled();
  await expect(page.locator('[data-article-next]')).toBeDisabled();
  expect(state.writes[0].layout.design_provenance.targets.sheet.name).toBe('Sommerangebote');
  expect(state.errors).toEqual([]);
});

test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });
test('TC-F66-04: Exakter Name und exakter Code stehen vor den ersten zwoelf Teiltreffern', async ({ page }) => {
  await setup(page);
  const catalog = Array.from({ length: 14 }, (_, index) => ({
    bezeichnung: 'Brezel Snack ' + (index + 1), artikelnummer: 'ART-' + index, strichcode: '1508' + index, vk: 1.99
  }));
  catalog.push({ bezeichnung: 'Breze', artikelnummer: '', strichcode: '508', vk: 0.79 });
  await page.route('**/api/preisliste?all=1', route => route.fulfill({ json: { groups: { Backwaren: catalog } } }));
  await page.goto(BASE + '/angebote.html');
  const dlg = await create(page, 'weekly'), input = dlg.locator('.cms-ang-row').first().locator('[data-f=produkt]');
  const dd = dlg.locator('.cms-ang-row').first().locator('.cms-art-dd');
  for (const [index, query] of ['Breze', '508'].entries()) {
    if (index) await input.fill('');
    await input.fill(query);
    await expect(dd.locator('button')).toHaveCount(12);
    await expect(dd.locator('button').first().locator('strong')).toHaveText('Breze');
  }
});
test('TC-F66-02: Produktauswahl bleibt beim echten Scrollbalkenziehen geöffnet', async ({ page }) => {
  test.skip(['mobile', 'tablet-hoch'].includes(test.info().project.name));
  const state = await setup(page);
  await page.route('**/api/preisliste?all=1', route => route.fulfill({ json: { groups: { Artikel: Array.from({ length: 12 }, (_, i) => ({
    bezeichnung: 'Breze ' + (i + 1), artikelnummer: 'BREZE-' + i, vk: 1.99
  })) } } }));
  await page.goto(BASE + '/angebote.html');
  await page.addStyleTag({ content: '.cms-art-dd{scrollbar-width:auto!important;scrollbar-gutter:stable}.cms-art-dd::-webkit-scrollbar{width:16px;background:#eee}.cms-art-dd::-webkit-scrollbar-thumb{background:#777}' });
  const dlg = await create(page, 'weekly'), row = dlg.locator('.cms-ang-row').first();
  const input = row.locator('[data-f=produkt]'), dd = row.locator('.cms-art-dd');
  await input.fill('Breze');
  await expect(dd.locator('button')).toHaveCount(12);
  await expect(dd).toBeVisible();
  const scrollbar = await dd.evaluate(el => {
    const r = el.getBoundingClientRect(), style = getComputedStyle(el);
    return { x: r.right - (el.offsetWidth - el.clientWidth) / 2 - parseFloat(style.borderRightWidth) / 2,
      top: r.top, height: r.height, gutter: el.offsetWidth - el.clientWidth, overflow: el.scrollHeight > el.clientHeight };
  });
  expect(scrollbar.overflow).toBe(true);
  expect(scrollbar.gutter).toBeGreaterThan(2);
  await drag(page, { x: scrollbar.x, y: scrollbar.top + 36 },
    { x: scrollbar.x, y: scrollbar.top + scrollbar.height - 30 });
  await expect(dd).toBeVisible();
  await expect.poll(() => dd.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await expect(input).toHaveValue('Breze');
  await dd.locator('button').last().click();
  await expect(input).toHaveValue('Breze 12');
  await expect(dd).toBeHidden();
  await input.fill('Breze');
  await expect(dd).toBeVisible();
  const track = await dd.boundingBox();
  await page.mouse.click(scrollbar.x, track.y + track.height - 18);
  await expect(dd).toBeVisible();
  await expect.poll(() => dd.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await input.press('Escape');
  await expect(dd).toBeHidden();
  await input.fill('Brez');
  await expect(dd).toBeVisible();
  await dd.hover();
  await page.mouse.wheel(0, 150);
  await expect(dd).toBeVisible();
  await row.locator('[data-f=preis]').click();
  await expect(dd).toBeHidden();
  await input.fill('Breze');
  await expect(dd).toBeVisible();
  await input.press('Tab');
  await expect(dd).toBeHidden();
  expect(state.writes).toHaveLength(0);
  expect(state.errors).toEqual([]);
});

for (const kind of ['weekly', 'drinks']) {
  test(`TC-F66-03: Gestaltung rendert waehrend input ohne Auswahlwechsel (${kind})`, async ({ page }) => {
    const state = await setup(page);
    await page.goto(BASE + '/angebote.html');
    await openPreview(page, kind, 2);
    const root = page.locator('#an-root');
    await workspaceView(root.locator('.an-cms-workspace'), 'inputs');
    await showTab(page, 'Vorlage');
    const color = kind === 'drinks' ? root.locator('input[data-style=background]') : root.locator('[data-cms-config=plakat_decoBgColor]');
    const before = await color.inputValue();
    const canvas = root.locator('#an-stage-canvas');
    const image = await canvas.evaluate(el => el.toDataURL());
    await color.focus();
    await color.evaluate(el => { window.__liveInput = el; el.value = '#112233'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await expect.poll(() => canvas.evaluate(el => el.toDataURL())).not.toBe(image);
    const intermediate = await canvas.evaluate(el => el.toDataURL());
    await color.evaluate(el => { el.value = '#556677'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await expect.poll(() => canvas.evaluate(el => el.toDataURL())).not.toBe(intermediate);
    expect(await color.evaluate(el => el === window.__liveInput && el === document.activeElement)).toBe(true);
    await root.locator('.an-compact-actions [data-history=undo]').click();
    await showTab(page, 'Vorlage');
    await expect(color).toHaveValue(before);
    expect(state.writes).toHaveLength(1);
    expect(state.errors).toEqual([]);
  });

  test(`TC-F67/68/69: Artikelwechsel und reine zieltreue Einzelausgabe (${kind})`, async ({ page }) => {
    const state = await setup(page);
    await page.goto(BASE + '/angebote.html');
    await openPreview(page, kind, 3);
    const root = page.locator('#an-root'), workspace = root.locator('.an-cms-workspace');
    await workspaceView(workspace, 'inputs');
    const sizes = await root.evaluate(el => {
      const outer = el.querySelector('.an-layout').getBoundingClientRect(), inner = el.querySelector('#an-preview').getBoundingClientRect();
      return { outer: outer.width, inner: inner.width };
    });
    expect(sizes.inner).toBeGreaterThan(sizes.outer * .95);
    await expect(root.locator('[data-article-position]')).toBeVisible();
    await root.getByRole('button', { name: 'Nächster Artikel', exact: true }).click();
    await expect(root.locator('[data-article-position]')).toHaveText('Artikel 2 von 3');
    await root.getByRole('button', { name: 'Vorheriger Artikel', exact: true }).click();
    await root.locator('[data-action-target]').selectOption('single');
    await expect(root.locator('[data-article-position]')).toHaveText('Artikel 1 von 3');
    await expect(root.getByRole('button', { name: 'Vorheriger Artikel', exact: true })).toBeDisabled();
    await root.getByRole('button', { name: 'Nächster Artikel', exact: true }).click();
    await expect(root.locator('[data-article-position]')).toHaveText('Artikel 2 von 3');
    await root.getByRole('button', { name: 'Nächster Artikel', exact: true }).click();
    await expect(root.locator('[data-article-position]')).toHaveText('Artikel 3 von 3');
    await expect(root.getByRole('button', { name: 'Nächster Artikel', exact: true })).toBeDisabled();
    await root.locator('#an-design-item').selectOption({ index: 0 });
    await expect(root.locator('[data-article-position]')).toHaveText('Artikel 1 von 3');
    await root.getByRole('button', { name: 'Nächster Artikel', exact: true }).click();
    await expect(root.locator('[data-article-position]')).toHaveText('Artikel 2 von 3');
    await root.getByRole('button', { name: 'Nächster Artikel', exact: true }).click();
    await expect(root.locator('[data-article-position]')).toHaveText('Artikel 3 von 3');
    await expect(root.getByRole('button', { name: 'Nächster Artikel', exact: true })).toBeDisabled();
    await root.getByRole('button', { name: 'Vorheriger Artikel', exact: true }).click();
    const selectedId = await root.locator('#an-design-item').inputValue();
    const writes = state.writes.length;
    await selectArea(root, 'output');
    await expect(root.locator('[data-cms-print]')).toBeVisible();
    await expect(root.locator('#an-save')).toBeHidden();
    await expect(root.locator('#an-hit-layer')).toBeHidden();
    await expect(root.locator('.an-weekly-picture')).toBeHidden();
    await expect(root.locator('#an-design-item')).toHaveValue(selectedId);
    const readonlyCanvas = root.locator('#an-stage-canvas');
    const readonlyImage = await readonlyCanvas.evaluate(el => el.toDataURL());
    await root.locator('#an-stage').press('Delete');
    await root.locator('#an-stage').press('Control+z');
    expect(await readonlyCanvas.evaluate(el => el.toDataURL())).toBe(readonlyImage);
    await root.locator('[data-cms-print]').click();
    await expect.poll(() => page.evaluate(() => window.__printed)).toBe(true);
    await expect(page.locator('#an-print .an-print-page')).toHaveCount(1);
    expect(await page.locator('#an-print img').getAttribute('alt')).toContain('2');
    const pdf = await page.pdf({ path: test.info().outputPath(kind + '-einzelflyer.pdf'), preferCSSPageSize: true, printBackground: true });
    expect((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length).toBe(1);
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    const download = page.waitForEvent('download');
    await root.locator('[data-cms-download]').click();
    expect((await download).suggestedFilename()).toContain('2');
    await root.locator('[data-cms-singles]').click();
    const batch = page.getByRole('dialog', { name: 'Einzelflyer auswählen', exact: true });
    await expect(batch.locator('input:checked')).toHaveCount(1);
    await batch.getByRole('button', { name: 'Auswahl aufheben', exact: true }).click();
    await expect(batch.locator('[data-batch-print]')).toBeDisabled();
    await batch.locator('input').nth(1).check();
    await batch.locator('input').nth(2).check();
    await page.evaluate(() => { window.__printed = false; });
    await batch.locator('[data-batch-print]').click();
    await expect.poll(() => page.evaluate(() => window.__printed)).toBe(true);
    await expect(page.locator('#an-print .an-print-page')).toHaveCount(2);
    const batchPdf = await page.pdf({ path: test.info().outputPath(kind + '-auswahl.pdf'), preferCSSPageSize: true, printBackground: true });
    expect((batchPdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length).toBe(2);
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await root.locator('[data-output-target]').selectOption('card');
    const cardDownload = page.waitForEvent('download');
    await root.locator('[data-cms-download]').click();
    const card = await cardDownload;
    expect(card.suggestedFilename()).toContain('2-card.png');
    const png = await require('node:fs/promises').readFile(await card.path());
    const targetSize = await page.evaluate(() => window.AngeboteModel.targetSizes.card);
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([targetSize.w * 2, targetSize.h * 2]);
    await selectArea(root, 'design');
    expect(state.writes).toHaveLength(writes);
    expect(state.errors).toEqual([]);
  });

  test(`TC-F69-01: Sammeldruck hat exakt zwei A4-Seiten ohne Restbogen (${kind})`, async ({ page }) => {
    const state = await setup(page);
    await page.goto(BASE + '/angebote.html');
    await openPreview(page, kind, kind === 'drinks' ? 6 : 7, false, kind === 'drinks' ? 4 : undefined);
    const picker = page.locator('#an-design-item'), ids = await picker.locator('option').evaluateAll(options => options.map(option => option.value));
    await picker.selectOption(ids.at(-1));
    await expect(page.locator('#an-page-label')).toHaveText('Seite 2 / 2');
    await picker.selectOption(ids[0]);
    await expect(page.locator('#an-page-label')).toHaveText('Seite 1 / 2');
    await showTab(page, 'Ausgabe');
    await expect(page.locator('#an-page-label')).toBeVisible();
    await page.locator('#an-page-next').click();
    await expect(page.locator('#an-page-label')).toHaveText('Seite 2 / 2');
    const download = page.waitForEvent('download');
    await page.locator('[data-cms-download]').click();
    expect((await download).suggestedFilename()).toContain('Seite 2');
    await page.locator('[data-cms-print]').click();
    await expect.poll(() => page.evaluate(() => window.__printed)).toBe(true);
    const pdf = await page.pdf({ path: test.info().outputPath(kind + '-sammeldruck.pdf'), preferCSSPageSize: true, printBackground: true });
    const content = pdf.toString('latin1');
    expect((content.match(/\/Type\s*\/Page\b/g) || []).length).toBe(2);
    const mediaBoxes = [...content.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)];
    expect(mediaBoxes.length).toBeGreaterThan(0);
    for (const box of mediaBoxes) { expect(Number(box[1])).toBeCloseTo(595, 0); expect(Number(box[2])).toBeCloseTo(842, 0); }
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await expect(page.locator('#an-print .an-print-page')).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveClass(/an-printing/);
    expect(state.writes).toHaveLength(1);
    expect(state.errors).toEqual([]);
  });
}

test('TC-F19-01: Elemente direkt verschieben, vergrößern und frei drehen', async ({ page }) => {
  const state = await setup(page);
  await page.goto(BASE + '/angebote.html');
  await openPreview(page, 'drinks', 2);
  const stage = page.locator('#an-stage'), selected = page.locator('#an-hit-layer .an-selected'), workspace = page.locator('.an-cms-workspace');
  const mobile = await workspace.evaluate((node) => node.classList.contains('an-split-mobile'));
  // Mobil sind Eingaben und Motiv getrennte Arbeitsansichten; verborgene Felder sind weiterhin lesbar.
  const numeric = async (prop) => Number(await page.locator('[data-element-prop=' + prop + ']').first().inputValue());
  if (mobile) await workspaceView(workspace, 'picture');
  await expect(selected).toBeVisible();
  const stageBefore = await stage.boundingBox();
  const id = await page.locator('#an-select-element').inputValue();
  const xBefore = await numeric('x');
  const start = await selected.evaluate((element) => {
    const box = element.getBoundingClientRect();
    for (let y = box.top + 3; y < box.bottom; y += 3) for (let x = box.left + 3; x < box.right; x += 3) {
      if (document.elementFromPoint(x, y) === element) return { x, y };
    }
    return null;
  });
  expect(start).not.toBeNull();
  await drag(page, start, { x: start.x + 30, y: start.y + 20 });
  expect(await stage.boundingBox()).toEqual(stageBefore);
  expect(await page.locator('#an-select-element').inputValue()).toBe(id);
  expect(await numeric('x')).toBeGreaterThan(xBefore + 10);
  const width = await numeric('w');
  for (const handle of await page.locator('#an-hit-layer [data-resize],#an-hit-layer [data-rotate]').all()) {
    const metrics = await handle.evaluate(el => {
      const style = getComputedStyle(el), glyph = getComputedStyle(el, '::before');
      let scale = 1;
      for (let parent = el.parentElement; parent; parent = parent.parentElement) {
        const transform = new DOMMatrixReadOnly(getComputedStyle(parent).transform);
        scale *= Math.hypot(transform.a, transform.b);
      }
      return { visible: parseFloat(glyph.width) * scale, hit: el.getBoundingClientRect().width,
        transparent: style.backgroundColor === 'rgba(0, 0, 0, 0)', coarse: matchMedia('(pointer:coarse)').matches };
    });
    expect(metrics.visible).toBeGreaterThanOrEqual(13.9);
    expect(metrics.visible).toBeLessThanOrEqual(24.1);
    expect(metrics.transparent).toBe(true);
    expect(metrics.hit).toBeGreaterThanOrEqual(metrics.coarse ? 43.9 : 31.9);
  }
  await page.screenshot({ path: test.info().outputPath('kleine-proportionale-griffe.png') });
  const grip = await middle(page.locator('#an-hit-layer [data-resize]'));
  await drag(page, grip, { x: grip.x + 30, y: grip.y + 30 });
  expect(await numeric('w')).toBeGreaterThan(width);
  const turn = await middle(page.locator('#an-hit-layer [data-rotate]')), center = await middle(page.locator('#an-hit-layer .an-selected'));
  await drag(page, turn, { x: center.x + 80, y: center.y });
  await expect(page.locator('[data-element-prop=rotation][type=number]')).toHaveValue('90');
  if (mobile) await workspaceView(workspace, 'inputs');
  await saveDesign(page);
  const saved = state.writes.at(-1).layout.pages.flatMap((entry) => entry.elements).find((entry) => entry.id === id);
  expect(saved.rotation).toBe(90);
  expect(saved.w).toBeGreaterThan(width);
  expect(state.errors).toEqual([]);
});

test('TC-F60-03/TC-F62-02: Aktionsreiter zeigen nur ihren Inhalt und behalten Ziel und Entwurf', async ({ page }) => {
  const state = await setup(page);
  await page.goto(BASE + '/angebote.html');
  await openPreview(page, 'drinks', 1);
  const workspace = page.locator('.an-cms-workspace');
  await workspaceView(workspace, 'inputs');
  await page.locator('[data-action-target]').selectOption('card');
  await showTab(page, 'Ausgabe');
  await expect(page.locator('#an-inspector')).toBeHidden();
  await expect(page.locator('.an-cms-style-options')).toBeHidden();
  await expect(page.locator('[data-cms-download]')).toBeVisible();
  await expect(page.locator('[data-cms-print]')).toBeVisible();
  await page.locator('.an-output-more>summary').click();
  await expect(page.locator('[data-cms-scale]')).toBeVisible();
  await expect(page.locator('[data-action-target]')).toHaveValue('card');
  await showTab(page, 'Ansicht');
  await expect(page.locator('#an-inspector')).toBeHidden();
  await expect(page.locator('[data-cms-download]')).toBeHidden();
  await showTab(page, 'Element');
  await expect(page.locator('#an-inspector')).toBeVisible();
  await expect(page.locator('[data-cms-download]')).toBeHidden();
  await expect(page.locator('.an-action-footer #an-save')).toBeVisible();
  await expect(page.locator('#an-inspector [data-history]')).toHaveCount(0);
  expect(state.writes).toHaveLength(1);
  expect(state.errors).toEqual([]);
  await page.screenshot({ path: test.info().outputPath('aktion-panelbesitz.png') });
});

test('TC-F61-03: Original-CMS-Familie und Palette erhalten fremde Ausgabeziele und Historie', async ({ page }) => {
  const state = await setup(page);
  await page.goto(BASE + '/angebote.html');
  await openPreview(page, 'weekly', 1);
  const original = structuredClone(state.writes[0].layout.cms);
  await workspaceView(page.locator('.an-cms-workspace'), 'inputs');
  await page.locator('[data-action-target]').selectOption('card');
  await showTab(page, 'Artikel');
  await page.locator('[data-cms-override=imgDx]').fill('23');
  await page.locator('[data-cms-override=imgDx]').dispatchEvent('change');
  await showTab(page, 'Vorlage');
  await page.locator('[data-cms-family][data-cms-kind=plakat][value=magazine]').locator('..').click();
  await expect(page.locator('[data-cms-family][data-cms-kind=plakat][value=magazine]')).toBeChecked();
  const palette = page.locator('[data-cms-palette][data-cms-kind=plakat]').first();
  await palette.click();
  const confirm = page.getByRole('button', { name: 'Palette übernehmen', exact: true });
  await expect.poll(async () => await confirm.isVisible() || await page.locator('#an-root').getAttribute('aria-busy') !== 'true').toBe(true);
  if (await confirm.isVisible()) await confirm.click();
  await expect(page.locator('#an-root')).toHaveAttribute('aria-busy', 'false');
  await page.locator('[data-history=undo]').click();
  await expect(page.locator('[data-cms-family][data-cms-kind=plakat][value=magazine]')).toBeChecked();
  await page.locator('[data-history=redo]').click();
  await saveDesign(page);
  const saved = state.writes.at(-1).layout.cms;
  expect(saved.config).toEqual(original.config);
  expect(saved.targets.single ? saved.targets.single.config : saved.config).toEqual(original.config);
  expect(saved.targets.card.config.plakatTemplate).toBe('modern-magazine');
  expect(saved.targets.card.config).not.toEqual(original.config);
  expect(saved.targets.card.plakat_article_overrides[state.writes[0].items[0].id].imgDx).toBe(23);
  expect(state.errors).toEqual([]);
});

test('TC-F61-05: Aktionspaletten erhalten freie Geometrie, fremde Ziele und Undo nach Speichern', async ({ page }) => {
  test.setTimeout(120000);
  const state = await setup(page);
  await page.goto(BASE + '/angebote.html');
  await openPreview(page, 'drinks', 2);
  const geometry = layout => JSON.stringify([layout.pages, layout.targets], (key, value) => ['fill', 'background'].includes(key) ? undefined : value);
  const colours = layout => page.evaluate(layout => Object.fromEntries(['sheet', 'card', 'single', 'scale'].map(target =>
    [target, window.AngeboteModel.effectiveColors(window.AngeboteModel.styleOf(layout, target))])), layout);
  for (const [index, target] of ['card', 'single', 'scale', 'sheet'].entries()) {
    await page.locator('[data-action-target]').selectOption(target);
    await showTab(page, 'Element');
    const select = page.locator('#an-select-element');
    const imageId = await select.locator('option').evaluateAll(options => options.find(option => /\bBild\b/.test(option.textContent)).value);
    await select.selectOption(imageId);
    const x = page.locator('[data-element-prop=x]');
    await x.fill('77'); await x.dispatchEvent('change');
    await saveDesign(page);
    const baseline = structuredClone(state.writes.at(-1).layout), before = await colours(baseline);
    await showTab(page, 'Vorlage');
    const palette = page.locator('[data-offer-palette]').nth(index);
    const id = await palette.getAttribute('data-offer-palette');
    await palette.click();
    const confirmation = page.getByRole('dialog', { name: 'Eigene Farben ersetzen?', exact: true });
    if (await confirmation.isVisible()) {
      await confirmation.getByRole('button', { name: 'Abbrechen', exact: true }).click();
      await expect(page.locator('input[data-style=background]')).toHaveValue(before[target].background);
      await palette.click();
      await confirmation.getByRole('button', { name: 'Palette anwenden', exact: true }).click();
    }
    await expect(page.locator('[data-offer-palette="' + id + '"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('.an-compact-actions [data-history=undo]').click();
    await expect(page.locator('input[data-style=background]')).toHaveValue(before[target].background);
    await page.locator('.an-compact-actions [data-history=redo]').click();
    await saveDesign(page);
    const result = state.writes.at(-1).layout, after = await colours(result);
    expect(geometry(result)).toBe(geometry(baseline));
    expect(after[target]).not.toEqual(before[target]);
    for (const other of ['sheet', 'card', 'single', 'scale'].filter(other => other !== target)) expect(after[other]).toEqual(before[other]);
    await showTab(page, 'Element');
    await select.selectOption(imageId);
    await expect(page.locator('[data-element-prop=x]')).toHaveValue('77');
  }
  expect(state.errors).toEqual([]);
});

test('TC-F19-06: sichtbare Griffe schrumpfen mit der dargestellten Kachel statt den Inhalt zu verdecken', async ({ page }) => {
  const state = await setup(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + '/angebote.html');
  await openPreview(page, 'drinks', 2);
  const grip = page.locator('#an-hit-layer [data-resize]');
  const visibleSize = () => grip.evaluate(el => parseFloat(getComputedStyle(el, '::before').width) * el.getBoundingClientRect().width / el.offsetWidth);
  const large = await visibleSize();
  await page.setViewportSize({ width: 320, height: 568 });
  await workspaceView(page.locator('.an-cms-workspace'), 'picture');
  await expect.poll(visibleSize).toBeLessThan(large - 1);
  expect(await visibleSize()).toBeGreaterThanOrEqual(13.9);
  await page.screenshot({ path: test.info().outputPath('kleine-griffe-320px.png') });
  expect(state.errors).toEqual([]);
});

test('TC-F19-02: Werkzeuge stehen links bzw. mobil als Eingaben vor dem separat erreichbaren Motiv', async ({ page }) => {
  await setup(page);
  await page.goto(BASE + '/angebote.html');
  await openPreview(page, 'drinks', 2);
  const modal = page.locator('.an-cms-preview-modal'), canvas = page.locator('.an-cms-canvas'), side = page.locator('.an-cms-side');
  const workspace = page.locator('.an-cms-workspace'), view = page.viewportSize(), dialogBox = await modal.boundingBox();
  const mobile = await workspace.evaluate((node) => node.classList.contains('an-split-mobile'));
  const minimum = (await compactMouse(page)) ? 32 : 44;
  const stageInView = async () => {
    const stage = await page.locator('#an-stage').boundingBox();
    expect(stage.y).toBeGreaterThanOrEqual(0);
    expect(stage.y + stage.height).toBeLessThanOrEqual(view.height);
    return stage;
  };
  if (mobile) {
    await expect(canvas).toBeHidden();
    expect((await page.locator('.an-task-fields').boundingBox()).height).toBeGreaterThanOrEqual(view.height * .5);
    await workspaceView(workspace, 'picture');
    await expect(side).toBeHidden();
    expect((await stageInView()).width).toBeGreaterThanOrEqual(view.width * .5);
    await workspaceView(workspace, 'inputs');
    await expect(canvas).toBeHidden();
  } else {
    const canvasBox = await canvas.boundingBox(), sideBox = await side.boundingBox(), total = canvasBox.width + sideBox.width;
    expect(sideBox.x + sideBox.width).toBeLessThanOrEqual(canvasBox.x + 2);
    expect(sideBox.width).toBeGreaterThanOrEqual(total * .5 - 1);
    if (dialogBox.width >= 1000) expect(canvasBox.width).toBeGreaterThanOrEqual(total * .35);
    else expect((await stageInView()).width).toBeGreaterThanOrEqual(Math.min(view.width * .35, 240) - 1);
  }
  for (const field of await side.locator('input:not([type=checkbox]):visible,select:visible').all()) {
    const height = (await field.boundingBox()).height, label = await field.evaluate((node) => node.outerHTML.slice(0, 120));
    expect(height, label).toBeGreaterThanOrEqual(minimum - .5);
  }
  for (const button of await side.locator('button:visible').all()) {
    const height = (await button.boundingBox()).height, label = await button.evaluate((node) => node.outerHTML.slice(0, 120));
    expect(height, label).toBeGreaterThanOrEqual(minimum - .5);
  }
  if (view.width >= 1200) expect(await modal.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
  await expect(side.locator('[data-element-prop=fill]')).toBeVisible();
  await expect(side.locator('[data-element-prop=opacity]')).toBeVisible();
  await expect(side.locator('[data-nudge]')).toHaveCount(4);
  if (mobile) await workspaceView(workspace, 'picture');
  await modal.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await stageInView();
  expect(await modal.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('vorschau-mit-seitlichen-werkzeugen.png') });
});

test('TC-F19-03/TC-F39-04: Artikel, Farbe und Undo/Redo in der Vorschau bearbeiten und speichern', async ({ page }) => {
  const state = await setup(page);
  await page.goto(BASE + '/angebote.html');
  await openPreview(page, 'drinks', 2);
  const undo = page.locator('.an-compact-actions [data-history=undo]'), redo = page.locator('.an-compact-actions [data-history=redo]');
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
  const surface = page.locator('.an-weekly-surface'), workspace = page.locator('.an-cms-workspace');
  const tools = page.locator('.an-cms-side .an-direct-tools');
  const mobile = await workspace.evaluate((node) => node.classList.contains('an-split-mobile'));
  await expect(tools).toBeVisible();
  const toolsBox = await tools.boundingBox();
  if (mobile) {
    await expect(surface.locator('canvas')).toBeHidden();
    await workspaceView(workspace, 'picture');
  }
  await expect(surface.locator('canvas')).toBeVisible();
  const stageBox = await surface.locator('.an-stage').boundingBox();
  if (!mobile) expect(toolsBox.x + toolsBox.width).toBeLessThanOrEqual(stageBox.x + 2);
  const turn = await middle(surface.locator('[data-preview-rotate]')), center = await middle(surface.locator('.an-selected'));
  await drag(page, turn, { x: center.x + 80, y: center.y });
  if (mobile) await workspaceView(workspace, 'inputs');
  await saveDesign(page);
  const overrides = Object.values(state.writes.at(-1).layout.cms.plakat_article_overrides)[0];
  const part = (await tools.locator('[data-preview-element]').inputValue()).split(':').pop();
  expect(Math.abs(overrides[part + 'Rot'])).toBeGreaterThan(60);
  expect(state.errors).toEqual([]);
});

const SURFACES = [['angebote', '/angebote.html'], ['kiosk', '/kiosk.html'], ['cms', '/cms.html?tab=ang']];
async function openSurface(page, path) {
  await page.goto(BASE + path);
  if (path.startsWith('/kiosk')) await page.evaluate(() => window.K.switchTab('angebote'));
}

for (const [surface, path] of SURFACES) {
  test(`TC-F45-01/02: alle Aktionsvorschauen rechts und ohne Schreibvorgang (${surface})`, async ({ page }) => {
    const state = await setup(page);
    await openSurface(page, path);
    for (const kind of ['weekly', 'drinks']) {
      await openPreview(page, kind, 2);
      const modal = page.locator('.an-cms-preview-modal'), workspace = page.locator('.an-cms-workspace');
      const mobile = await workspace.evaluate((node) => node.classList.contains('an-split-mobile'));
      const writes = state.writes.length;
      for (const target of ['card', 'single', 'sheet', 'scale']) {
        await page.locator('[data-action-target]').selectOption(target);
        await showTab(page, 'Element');
        const stage = page.locator('.an-task-picture .an-stage:visible');
        const tools = page.locator('.an-task-tools');
        await modal.evaluate((node) => { node.scrollTop = 0; });
        // Mobil stehen zuerst die Eingaben im Vordergrund; das Motiv ist separat erreichbar.
        if (mobile) { await expect(stage).toBeHidden(); await expect(tools).toBeVisible(); }
        const fields = await tools.boundingBox();
        const working = await page.locator('.an-task-fields').boundingBox();
        expect(working.height).toBeGreaterThanOrEqual(fields.height * .5);
        if (mobile) await workspaceView(workspace, 'picture');
        await expect(stage.locator('canvas')).toBeVisible();
        const picture = await stage.boundingBox(), dialog = await modal.boundingBox();
        await expect(page.locator('.an-task-picture').locator(':is(input,select,.an-direct-tools,.an-actions,h2,.an-note):visible')).toHaveCount(0);
        const contentWidths = await page.locator('#an-root').evaluate(el => ({
          outer: el.querySelector('.an-layout').getBoundingClientRect().width,
          inner: el.querySelector('#an-preview').getBoundingClientRect().width
        }));
        expect(contentWidths.inner).toBeGreaterThan(contentWidths.outer * .95);
        if (mobile) {
          await expect(tools).toBeHidden();
          await workspaceView(workspace, 'inputs');
        }
        const split = page.getByRole('separator');
        if (await split.isVisible()) {
          // Ende gibt den Eingaben maximal Platz, Pos1 genau die Hälfte; die Vorschau bleibt nutzbar.
          await split.focus(); await split.press('End');
          let right = await page.locator('.an-task-picture').boundingBox(), left = await tools.boundingBox();
          expect(left.width).toBeGreaterThan(right.width);
          expect(right.width).toBeGreaterThanOrEqual(240);
          await split.press('Home');
          right = await page.locator('.an-task-picture').boundingBox(); left = await tools.boundingBox();
          expect(left.width).toBeGreaterThanOrEqual(right.width - 1);
          await split.press('ArrowRight');
        }
        if (!mobile) {
          expect(fields.x + fields.width).toBeLessThanOrEqual(picture.x + 2);
          const styles = page.locator('.an-cms-style-options');
          if (await styles.isVisible()) {
            const box = await styles.boundingBox();
            expect(box.x + box.width).toBeLessThanOrEqual(picture.x + 2);
          }
        }
        await expect(page.locator('[data-action-target] option')).toHaveCount(4);
        await expect(page.locator('[data-action-target]')).toBeVisible();
        expect(await modal.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
        expect(state.writes).toHaveLength(writes);
      }
      await page.locator('[data-action-target]').selectOption('sheet');
      await page.screenshot({ path: test.info().outputPath('aktionsvorschau-rechts-' + kind + '.png') });
      await page.getByRole('button', { name: 'Schließen', exact: true }).click();
      await expect(modal).toHaveCount(0);
    }
    expect(state.errors).toEqual([]);
  });
}

for (const [surface, path] of SURFACES) {
  test(`TC-F26-01/F27-01: Original-Wochenvorschau hat überall dieselben Werkzeuge (${surface})`, async ({ page }) => {
    const state = await setup(page);
    await openSurface(page, path);
    await openPreview(page, 'weekly', 1, true);
    const surfaceBox = page.locator('.an-cms-side'), workspace = page.locator('.an-cms-workspace'), canvas = page.locator('.an-weekly-surface canvas');
    const mobile = await workspace.evaluate((node) => node.classList.contains('an-split-mobile'));
    if (mobile) { await expect(canvas).toBeHidden(); await workspaceView(workspace, 'picture'); }
    await expect(canvas).toBeVisible();
    if (mobile) await workspaceView(workspace, 'inputs');
    const select = surfaceBox.locator('[data-preview-element]');
    const part = async (suffix) => select.locator('option[value$=":' + suffix + '"]');
    // kompakt: keine Streckung zwischen den Werkzeugblöcken desselben Reiters
    const stacked = (await page.locator('.an-cms-preview-modal').boundingBox()).width < 1000;
    if (!stacked) {
      for (const [tab, selectors] of [['Element', ['.an-direct-tools', '.an-extras']], ['Artikel', ['#an-cms-article', '#an-inspector > details']]]) {
        await showTab(page, tab);
        const boxes = [];
        for (const selector of selectors) {
          const block = page.locator('.an-cms-preview-modal ' + selector).first();
          if (await block.isVisible()) boxes.push(await block.boundingBox());
        }
        expect(boxes.length, tab).toBeGreaterThan(0);
        for (let i = 1; i < boxes.length; i++) expect(boxes[i].y - (boxes[i - 1].y + boxes[i - 1].height), tab).toBeLessThanOrEqual(60);
      }
      await showTab(page, 'Element');
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
    await page.locator('label.an-family', { has: page.locator('input[data-style=family][value=' + id + ']') }).click();
  };
  const original = await chosen();
  await page.locator('[data-action-target]').selectOption('card');
  await pick('half');
  await expect.poll(chosen).toBe('half-red');
  await expect(page.getByRole('dialog', { name: 'Gestaltung ersetzen?' })).toHaveCount(0);
  await expect(page.locator('[data-style=density]').first()).toBeHidden();
  await page.locator('[data-action-target]').selectOption('single');
  await expect.poll(chosen).toBe(original);
  await page.locator('[data-action-target]').selectOption('card');
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
  await pick('tag');
  const dialog = page.getByRole('dialog').last();
  await expect(dialog).toContainText('Gestaltung ersetzen?');
  await dialog.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect.poll(chosen).toBe('half-red');
  await pick('tag');
  await page.getByRole('dialog').last().getByRole('button', { name: 'Stil anwenden', exact: true }).click();
  await expect.poll(chosen).toBe('tag-red');
  await saveDesign(page);
  layout = state.writes.at(-1).layout;
  expect(layout.target_styles.card.template).toBe('tag-red');
  expect(state.errors).toEqual([]);
});
test('TC-F24-01: Buttons und Felder sind klar erkennbar (Kontrast)', async ({ page }) => {
  await setup(page);
  await page.goto(BASE + '/angebote.html');
  await openPreview(page, 'drinks', 2);
  await showTab(page, 'Artikel');
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
    check('Standard', dialog.querySelector('[data-cms-download]'), white);
    check('Standard klein', dialog.querySelector('.an-cms-side [data-element-action=copy]'), white);
    check('Feld', dialog.querySelector('.an-cms-side input[data-cms-article=name]'), white);
    const primary = dialog.querySelector('#an-save');
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
    const workspace = page.locator('.an-cms-workspace');
    const mobile = await workspace.evaluate((node) => node.classList.contains('an-split-mobile'));
    const stageInView = async () => {
      if (mobile) await workspaceView(workspace, 'picture');
      await inView(stage);
      if (mobile) await workspaceView(workspace, 'inputs');
    };
    // Die Gestaltungsbereiche stehen auf allen Breiten hinter Reitern; Vorlage und Marker sind eigene Reiter.
    await expect(page.locator('.an-cms-tabbar')).toBeVisible();
    await expect(page.locator('.an-cms-tabbar button')).toHaveCount(kind === 'weekly' ? 6 : 5);
    await expect(panel).toBeHidden();
    await showTab(page, 'Vorlage');
    await expect(panel).toBeVisible();
    if (!mobile) {
      const s = await stage.boundingBox(), p = await panel.boundingBox();
      expect(p.x + p.width).toBeLessThanOrEqual(s.x + 2);
      if (dialog.width >= 1000) expect(await page.locator('.an-cms-canvas').evaluate((node) => node.clientWidth)).toBeGreaterThanOrEqual(dialog.width * .35);
    }
    await stageInView();
    await inView(panel.locator('.an-style-families:visible legend'));
    if (kind === 'weekly') {
      await expect(panel.locator('.an-style-families:visible legend')).toBeVisible();
      await expect(page.locator('[data-cms-config=plakatTemplate]')).toHaveCount(1);
      await expect(page.locator('[data-cms-config=savingsMarkerType]')).toBeHidden();
      await showTab(page, 'Marker');
      await expect(page.locator('[data-cms-config=savingsMarkerType]')).toBeVisible();
      await expect(page.locator('[data-cms-config=plakatTemplate]')).toBeHidden();
      await inView(page.locator('[data-cms-config=savingsMarkerType]'));
      await stageInView();
    }
    await showTab(page, 'Element');
    await expect(panel).toBeHidden();
    expect(await modal.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    expect(state.errors).toEqual([]);
  });
}

test('TC-F31-02: Weekly-Ziele behalten alle Werkzeuge; Farbänderung wirkt sofort in der Vorschau', async ({ page }) => {
  const state = await setup(page);
  await page.goto(BASE + '/angebote.html');
  await openPreview(page, 'weekly', 2);
  const surface = page.locator('.an-weekly-surface'), side = page.locator('.an-cms-side'), workspace = page.locator('.an-cms-workspace');
  const mobile = await workspace.evaluate((node) => node.classList.contains('an-split-mobile'));
  for (const target of ['card', 'single', 'sheet', 'scale']) {
    await page.locator('[data-action-target]').selectOption(target);
    await showTab(page, 'Element');
    // F47: Die Waage hat ein eigenes Zielrenderer-Layout und damit die nativen Gestaltungswerkzeuge statt der Originalwochenvorschau.
    const native = target === 'scale', canvas = native ? page.locator('#an-stage canvas') : surface.locator('canvas');
    if (mobile) await workspaceView(workspace, 'picture');
    await expect(canvas).toBeVisible();
    if (mobile) await workspaceView(workspace, 'inputs');
    if (native) {
      for (const name of ['+ Eigenes Bild', 'Ghost', 'Duplizieren']) await expect(side.getByRole('button', { name, exact: true })).toBeVisible();
      await expect(side.locator('[data-element-prop=rotation][type=range]')).toBeVisible();
      continue;
    }
    // Der Namensblock bringt eigene Textfelder statt Ghost/Duplikat; die Bildwerkzeuge gehören zu den übrigen Elementen.
    const choice = side.locator('[data-preview-element] option:not([value=""])').filter({ hasNotText: /^Bezeichnung/ }).first();
    await side.locator('[data-preview-element]').selectOption(await choice.getAttribute('value'));
    for (const name of ['Ghost', 'Duplikat', '+ Ghost', '+ Duplikat', 'Element zurücksetzen', 'Alles zurücksetzen']) {
      await expect(side.getByRole('button', { name, exact: true })).toBeVisible();
    }
    await expect(side.locator('[data-x-image]')).toBeAttached();
    await expect(side.locator('[data-x-rot]')).toBeVisible();
  }
  await page.locator('[data-action-target]').selectOption('sheet');
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
    await page.locator('[data-action-target]').selectOption(target);
    await showTab(page, 'Element');
    for (const name of ['+ Eigenes Bild', 'Ghost', 'Duplizieren']) await expect(tools.getByRole('button', { name, exact: true })).toBeVisible();
    await expect(tools.locator('[data-element-prop=rotation][type=range]')).toBeVisible();
  }
  await page.locator('[data-action-target]').selectOption('card');
  await showTab(page, 'Vorlage');
  const color = page.locator('input[data-style=background]');
  await color.fill('#336699'); await color.dispatchEvent('change');
  await saveDesign(page);
  expect(state.writes.at(-1).layout.target_styles.card.background).toBe('#336699');
  expect(state.errors).toEqual([]);
});

for (const kind of ['drinks', 'weekly']) {
  test(`TC-F58-01: vollständiger Roundtrip aus Erfassung, Bild, Gestaltung, Neuöffnung und Ausgabe (${kind})`, async ({ page }) => {
    const state = await setup(page);
    await page.goto(BASE + '/angebote.html');
    await openPreview(page, kind, 2, true);
    expect(state.writes).toHaveLength(1);
    await page.locator('[data-action-target]').selectOption('sheet');
    await showTab(page, 'Vorlage');
    const color = kind === 'drinks' ? page.locator('input[data-style=background]') : page.locator('[data-cms-config=plakat_decoBgColor]');
    await color.fill('#336699'); await color.dispatchEvent('change');
    await saveDesign(page);
    expect(state.writes).toHaveLength(2);
    const saved = state.writes[1];
    if (kind === 'drinks') expect(saved.layout.background).toBe('#336699'); else expect(saved.layout.cms.config.plakat_decoBgColor).toBe('#336699');
    expect(saved.items).toHaveLength(2);
    expect(saved.items[0].image_id).toMatch(/^cms:/);
    expect(saved.layout.image_refs[saved.items[0].id]).toBe(saved.items[0].image_id);
    const fs = require('node:fs/promises');
    async function output() {
      await showTab(page, 'Ausgabe');
      const download = page.waitForEvent('download');
      await page.locator('[data-cms-download]').click();
      return fs.readFile(await (await download).path());
    }
    const before = await output();
    const pngSize = (buffer) => buffer.subarray(16, 24).toString('hex');
    expect(before.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    await page.locator('#an-overview').click();
    await page.goto(BASE + '/angebote.html');
    await allWeeks(page);
    await page.getByRole('button', { name: 'Vorschau', exact: true }).click();
    await expect(page.locator('#an-stage-info')).not.toHaveClass(/an-error/);
    const after = await output();
    // Der Originalwochenrenderer streut Dekoration zufällig; dort gilt gleiche Ausgabegröße, bei Getränken Byte-Gleichheit.
    if (kind === 'drinks') expect(after.equals(before)).toBe(true);
    else expect(pngSize(after)).toBe(pngSize(before));
    await page.locator('#an-overview').click();
    await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
    const edit = page.getByRole('dialog', { name: kind === 'drinks' ? 'Getränkeaktion erfassen' : 'Sonderaktion erfassen', exact: true });
    await expect(edit.locator('[data-f=produkt]').first()).toHaveValue(saved.items[0].name);
    await expect(edit.locator('.cms-ang-row').first().locator('.an-has-image')).toHaveCount(1);
    await edit.getByRole('button', { name: 'Abbrechen', exact: true }).first().click();
    expect(state.writes).toHaveLength(2);
    expect(state.errors).toEqual([]);
  });
}

const seededAction = (id, title, from, to) => ({
  aktion_id: id, title, kind: 'drinks', valid_from: from, valid_to: to, layout: null,
  items: [{ id: id + '-item', name: 'Seed ' + title, description: '', price_cents: 1249, old_price_cents: 1499, barcode: '', werbebild_id: '', image_id: '',
    units: 20, volume_ml: 500, packaging: 'Mehrweg', deposit_cents: 310, deposit_free: false, article_number: '' }]
});

test('TC-F55-01: wahrheitsgemäße Zustände, Schutz vor Verlust und kein doppeltes Anlegen nach unlesbarem Speichern', async ({ page }) => {
  const state = await setup(page);
  [['AKT-PLAN', 'Geplant', '2026-12-01', '2026-12-07'], ['AKT-AKTIV', 'Aktiv', '2026-11-16', '2026-11-21'], ['AKT-ALT', 'Abgelaufen', '2026-11-01', '2026-11-07']]
    .forEach((entry) => state.actions.set(entry[0], seededAction(...entry)));
  await page.goto(BASE + '/angebote.html');
  await allWeeks(page);
  for (const label of ['Geplant', 'Aktiv', 'Abgelaufen']) {
    await expect(page.locator('.an-action-list').getByText('Gespeichert · ' + label, { exact: false })).toHaveCount(1);
  }
  const dlg = await create(page, 'drinks');
  const status = dlg.locator('[data-capture-status]');
  const prevented = () => page.evaluate(() => !window.dispatchEvent(new Event('beforeunload', { cancelable: true })));
  expect(await prevented()).toBe(false);
  await fillDrink(dlg.locator('.cms-ang-row').first(), 1);
  await expect(status).toContainText('Ungespeicherte Änderungen');
  expect(await prevented()).toBe(true);
  state.failReads = true;
  await dlg.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByRole('dialog').last()).toContainText('konnte aber nicht geladen werden');
  await page.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await expect(dlg).toBeVisible();
  await expect(status).toContainText('Speichern nicht abgeschlossen');
  expect(state.actions.size).toBe(4);
  state.failReads = false;
  await dlg.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(dlg).toHaveCount(0);
  expect(state.actions.size).toBe(4);
  const written = state.writes.filter((body) => body.title === 'Getränkeangebote');
  expect(written).toHaveLength(2);
  expect(new Set(written.map((body) => body.aktion_id)).size).toBe(1);
  expect(written[1].original_ids).toHaveLength(1);
  await page.locator('#an-overview').click();
  expect(await prevented()).toBe(false);
  expect(state.errors).toEqual([]);
});

test('TC-F55-02: zwei Bearbeitungen desselben Inhalts überschreiben sich nicht', async ({ page }) => {
  const state = await setup(page);
  state.actions.set('AKT-ZWEI', seededAction('AKT-ZWEI', 'Gemeinsame Aktion', '2026-11-16', '2026-11-21'));
  await page.goto(BASE + '/angebote.html');
  await allWeeks(page);
  await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
  const dlg = page.getByRole('dialog', { name: 'Getränkeaktion erfassen', exact: true });
  await showMeta(dlg);
  await dlg.locator('[data-meta=title]').fill('Meine Fassung');
  state.actions.set('AKT-ZWEI', { ...state.actions.get('AKT-ZWEI'), title: 'Fassung des anderen Clients' });
  state.revisions.set('AKT-ZWEI', 2);
  await dlg.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByRole('dialog').last()).toContainText('Es wurde nichts überschrieben');
  await page.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await expect(dlg).toBeVisible();
  await expect(dlg.locator('[data-meta=title]')).toHaveValue('Meine Fassung');
  expect(state.actions.get('AKT-ZWEI').title).toBe('Fassung des anderen Clients');
  await dlg.getByRole('button', { name: 'Gespeicherten Stand laden', exact: true }).click();
  await page.getByRole('button', { name: 'Stand neu laden', exact: true }).click();
  const fresh = page.getByRole('dialog', { name: 'Getränkeaktion erfassen', exact: true });
  await expect(fresh.locator('[data-meta=title]')).toHaveValue('Fassung des anderen Clients');
  await fresh.locator('[data-meta=title]').fill('Zusammengeführt');
  await fresh.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(fresh).toHaveCount(0);
  expect(state.actions.get('AKT-ZWEI').title).toBe('Zusammengeführt');
  await page.locator('#an-overview').click();
  await allWeeks(page);
  state.revisions.set('AKT-ZWEI', 9);
  await page.locator('.an-action-more > summary').click();
  await page.getByRole('button', { name: 'Aktion löschen', exact: true }).click();
  await page.getByRole('button', { name: 'Aktion löschen', exact: true }).last().click();
  await expect(page.getByRole('dialog').last()).toContainText('nicht gelöscht');
  expect(state.actions.has('AKT-ZWEI')).toBe(true);
  expect(state.errors).toEqual([]);
});

test('TC-F62-01: Bereichswechsel erhält ungespeicherte Artikel, Bilder und Gestaltungshistorie', async ({ page }) => {
  const state = await setup(page);
  await page.goto(BASE + '/angebote.html');
  const dlg = await create(page, 'drinks'), row = dlg.locator('.cms-ang-row').first();
  await fillDrink(row, 1);
  await row.getByRole('button', { name: 'Produktbild bearbeiten', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await row.locator('[data-offer-action=uploadBildSP]').click();
  await (await chooser).setFiles({ name: 'artikel.png', mimeType: 'image/png', buffer: Buffer.from(PHOTO.split(',')[1], 'base64') });
  await row.evaluate(el => { window.__captureRow = el; });
  await selectArea(dlg, 'design');
  const workspace = page.getByRole('dialog', { name: 'Vorschau', exact: true });
  if (page.viewportSize().width < 600) await workspaceView(workspace, 'picture');
  await expect(workspace.locator('#an-stage-canvas')).toBeVisible();
  if (page.viewportSize().width < 600) await workspaceView(workspace, 'inputs');
  expect(state.writes).toHaveLength(0); expect(state.images).toBe(0);
  await showTab(page, 'Vorlage');
  const color = page.locator('input[data-style=background]');
  await color.fill('#336699');
  await selectArea(workspace, 'articles');
  await expect(workspace).toHaveCount(0);
  await expect(row.locator('[data-f=produkt]')).toHaveValue('Getränk 1');
  expect(await row.evaluate(el => el === window.__captureRow)).toBe(true);
  await row.locator('[data-f=produkt]').fill('Korrigierter Artikel');
  await selectArea(dlg, 'output');
  await expect(workspace.locator('[data-cms-download]')).toBeVisible();
  expect(state.writes).toHaveLength(0); expect(state.images).toBe(0);
  await showTab(page, 'Vorlage');
  await expect(page.locator('input[data-style=background]')).toHaveValue('#336699');
  const undo = page.locator('.an-compact-actions [data-history=undo]');
  await expect(undo).toBeEnabled(); await undo.click();
  await expect(page.locator('input[data-style=background]')).not.toHaveValue('#336699');
  await page.locator('.an-compact-actions [data-history=redo]').click();
  await selectArea(workspace, 'articles');
  await expect(row.locator('[data-f=produkt]')).toHaveValue('Korrigierter Artikel');
  await selectArea(dlg, 'design');
  await workspace.locator('#an-save').click();
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.images).toBe(1);
  expect(state.writes[0].items[0].name).toBe('Korrigierter Artikel');
  expect(state.writes[0].items[0].image_id).not.toContain('pending-');
  expect(state.writes[0].layout.background).toBe('#336699');
  expect(state.errors).toEqual([]);
});

test('TC-F62-02: Speicherkonflikt nach Bildupload erhält Bild, Artikel und gemeinsame Gestaltung', async ({ page }) => {
  const state = await setup(page);
  await page.goto(BASE + '/angebote.html');
  const dlg = await create(page, 'drinks'), row = dlg.locator('.cms-ang-row').first();
  await fillDrink(row, 1);
  await row.getByRole('button', { name: 'Produktbild bearbeiten', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await row.locator('[data-offer-action=uploadBildSP]').click();
  await (await chooser).setFiles({ name: 'konflikt.png', mimeType: 'image/png', buffer: Buffer.from(PHOTO.split(',')[1], 'base64') });
  await selectArea(dlg, 'design');
  const workspace = page.getByRole('dialog', { name: 'Vorschau', exact: true });
  state.failSave = true;
  await workspace.locator('#an-save').click();
  await expect(page.getByRole('dialog').last()).toContainText('zwischenzeitlich geändert');
  await page.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await selectArea(workspace, 'articles');
  await expect(row.locator('[data-f=produkt]')).toHaveValue('Getränk 1');
  await expect(row.locator('.cms-bild-preview')).toBeVisible();
  expect(state.images).toBe(1); expect(state.actions.size).toBe(0);
  state.failSave = false;
  await dlg.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(dlg).toHaveCount(0);
  expect(state.images).toBe(1);
  expect(state.writes).toHaveLength(2);
  expect(state.writes[1].items[0].image_id).toMatch(/^cms:/);
  expect(state.writes[1].items[0].image_id).not.toContain('pending-');
  expect(state.writes[1].items[0].werbebild_id).toBe('11111111-1111-4111-8111-111111111111');
  expect(state.writes[1].items[0].name).toBe('Getränk 1');
  expect(state.errors).toEqual([]);
});

test('TC-F63-01: kompakte Handyliste, Einzelartikel und Größenwechsel behalten dieselben Zeilen', async ({ page }) => {
  const state = await setup(page);
  await page.goto(BASE + '/angebote.html');
  const dlg = await create(page, 'drinks');
  for (let index = 0; index < 3; index++) await fillDrink(dlg.locator('.cms-ang-row').nth(index), index + 1);
  await page.setViewportSize({ width: 375, height: 667 });
  await dlg.locator('[data-capture-back]').click();
  const first = dlg.locator('[data-capture-item]').first();
  await expect(first).toContainText('Getränk 1');
  const geometry = await dlg.evaluate(el => ({
    header: el.querySelector('.an-dialog-top').getBoundingClientRect().height,
    body: el.querySelector('.an-capture-body').getBoundingClientRect().height,
    first: el.querySelector('[data-capture-item]').getBoundingClientRect().top,
    overflow: el.scrollWidth > el.clientWidth
  }));
  expect(geometry.header).toBe(44); expect(geometry.body).toBeGreaterThanOrEqual(550);
  expect(geometry.first).toBeLessThanOrEqual(164); expect(geometry.overflow).toBe(false);
  for (const [width, height] of [[320, 568], [360, 640], [375, 667], [390, 844]]) {
    await page.setViewportSize({ width, height });
    const list = await dlg.evaluate(el => {
      const body = el.querySelector('.an-capture-body').getBoundingClientRect();
      return { header: el.querySelector('.an-dialog-top').getBoundingClientRect().height, height: body.height,
        cards: [...el.querySelectorAll('[data-capture-item]')].slice(0, 3).map(node => {
          const box = node.getBoundingClientRect(); return { top: box.top, bottom: box.bottom, visible: box.top >= body.top && box.bottom <= body.bottom };
        }) };
    });
    expect(list.header).toBe(44); expect(list.height).toBeGreaterThanOrEqual(height * .75);
    expect(list.cards[0].top).toBeLessThanOrEqual(164); expect(list.cards.every(card => card.visible)).toBe(true);
    await page.screenshot({ path: test.info().outputPath('artikelliste-' + width + '.png') });
  }
  await first.click();
  await dlg.locator('.cms-ang-row').first().evaluate(el => { window.__mobileRow = el; });
  await dlg.locator('[data-capture-next]').click();
  await expect(dlg.locator('[data-capture-count]')).toHaveText('2 / 6');
  await dlg.locator('[data-capture-prev]').click();
  await expect(dlg.locator('[data-f=produkt]').first()).toHaveValue('Getränk 1');
  expect(await dlg.locator('.cms-ang-row').first().evaluate(el => el === window.__mobileRow)).toBe(true);
  await page.setViewportSize({ width: 686, height: 1095 });
  await expect(dlg.locator('.cms-ang-row:visible')).toHaveCount(6);
  await page.setViewportSize({ width: 320, height: 568 });
  await expect(dlg.locator('.cms-ang-row:visible')).toHaveCount(1);
  expect(state.writes).toHaveLength(0); expect(state.errors).toEqual([]);
});

test('TC-F63-02: alle zehn Getränkefelder passen in den mobilen Einzelarbeitsraum', async ({ page }) => {
  const state = await setup(page);
  await page.goto(BASE + '/angebote.html');
  const dlg = await create(page, 'drinks'), row = dlg.locator('.cms-ang-row').first();
  await fillDrink(row, 1);
  for (const [width, height] of [[360, 640], [375, 667], [390, 844], [320, 568], [686, 432]]) {
    await page.setViewportSize({ width, height });
    if (await dlg.locator('[data-meta-toggle]').getAttribute('aria-expanded') === 'true') await dlg.locator('[data-meta-toggle]').click();
    await focusRow(row);
    const bounds = await row.evaluate(el => {
      const body = el.closest('.an-capture-body').getBoundingClientRect();
      return [...el.querySelectorAll('input[data-f]:not([type=hidden]),select[data-f]')].map(field => {
        const box = field.getBoundingClientRect(); return { height: box.height, left: box.left, right: box.right, bottom: box.bottom, bodyBottom: body.bottom };
      });
    });
    expect(bounds).toHaveLength(10);
    expect(bounds.every(box => box.height >= 44 && box.left >= 0 && box.right <= width)).toBe(true);
    const remove = await row.locator('.cms-ang-row-close').boundingBox();
    expect(remove.width).toBeGreaterThanOrEqual(44); expect(remove.height).toBeGreaterThanOrEqual(44);
    if (height >= 640) expect(bounds.every(box => box.bottom <= box.bodyBottom)).toBe(true);
    await page.screenshot({ path: test.info().outputPath('einzelartikel-' + width + 'x' + height + '.png') });
  }
  await expect(row.locator('[data-f=produkt]')).toHaveValue('Getränk 1');
  expect(state.writes).toHaveLength(0); expect(state.errors).toEqual([]);
});

test('TC-F57-01: Duplizieren öffnet eine ungespeicherte Kopie mit neuen Kennungen und gleichen Bildern', async ({ page }) => {
  const state = await setup(page);
  await page.goto(BASE + '/angebote.html');
  await openPreview(page, 'drinks', 2, true);
  expect(state.writes).toHaveLength(1);
  const source = structuredClone(state.writes[0]);
  await page.locator('#an-overview').click();
  await allWeeks(page);
  await page.locator('.an-action-more > summary').click();
  await page.getByRole('button', { name: 'Duplizieren', exact: true }).click();
  const dlg = page.getByRole('dialog', { name: 'Getränkeaktion erfassen', exact: true });
  await expect(dlg.locator('[data-meta=title]')).toHaveValue(/ · Kopie$/);
  await expect(dlg.locator('[data-capture-status]')).toContainText('Ungespeicherte Änderungen');
  expect(state.writes).toHaveLength(1);
  await showMeta(dlg);
  await dlg.locator('[data-meta=title]').fill('Meine Kopie');
  await dlg.getByRole('button', { name: 'Abbrechen', exact: true }).first().click();
  await page.getByRole('button', { name: 'Änderungen verwerfen', exact: true }).click();
  expect(state.writes).toHaveLength(1);
  const more = page.locator('.an-action-more');
  if (!(await more.evaluate(node => node.open))) await more.locator('summary').click();
  await page.getByRole('button', { name: 'Duplizieren', exact: true }).click();
  await showMeta(dlg);
  await dlg.locator('[data-meta=title]').fill('Meine Kopie');
  await dlg.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(dlg).toHaveCount(0);
  expect(state.writes).toHaveLength(2);
  const copy = state.writes[1];
  expect(copy.aktion_id).not.toBe(source.aktion_id);
  expect(copy.original_ids).toEqual([]);
  const oldIds = source.items.map((item) => item.id.toLowerCase());
  expect(copy.items.map((item) => item.id.toLowerCase()).filter((id) => oldIds.includes(id))).toEqual([]);
  expect(copy.items.map((item) => item.name)).toEqual(source.items.map((item) => item.name));
  expect(copy.items[0].image_id).toBe(source.items[0].image_id);
  expect(copy.items[0].werbebild_id).toBe(source.items[0].werbebild_id);
  expect(Object.keys(copy.layout.image_refs)).toEqual([copy.items[0].id]);
  const leaks = [], layoutWithoutImages = structuredClone(copy.layout);
  delete layoutWithoutImages.image_refs;
  (function walk(value, path) {
    if (typeof value === 'string' && value.includes(source.items[0].id)) leaks.push(path);
    else if (value && typeof value === 'object') Object.entries(value).forEach(([key, entry]) => { if (key.includes(source.items[0].id)) leaks.push(path + '/' + key); walk(entry, path + '/' + key); });
  })(layoutWithoutImages, 'layout');
  expect(leaks).toEqual([]);
  expect(state.actions.get(source.aktion_id).title).toBe(source.title);
  expect(state.errors).toEqual([]);
});
