const { test, expect } = require('./_kiosk-angemeldet');

const DAY = '2026-10-30';
const DISH = { dl_wochenplanid: 'wp-1', dl_gericht: 'Schnitzel mit Pommes oder Kartoffelsalat',
  dl_datum: DAY, dl_preis: 8.8, dl_wochentag: 101004, dl_kalenderwoche: 44, dl_jahr: 2026 };
const baseOrder = { name: 'Laufkundschaft', gericht: DISH.dl_gericht, datum: DAY,
  menge: 1, preis: 8.8, status: 1, quelle: 3, version: 'W/"1"' };
const BASE = process.env.TEST_URL || 'http://127.0.0.1:8811';

async function setup(page, opts = {}) {
  await page.clock.setFixedTime(new Date('2026-10-30T12:30:00+01:00'));
  let orders = opts.orders || [];
  const posts = [], patches = [];
  const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });
  await page.route('**/api/**', async (route) => {
    const r = route.request(), u = new URL(r.url());
    if(u.pathname.endsWith('/wochenplan')) {
      return route.fulfill(json({ data: opts.dishes || [DISH] }, opts.planFailure ? 500 : 200));
    }
    if(u.pathname.endsWith('/cms-config')) {
      return route.fulfill(json({ success: true, data: { bestellschluss_uhr: '11:00', kiosk_mittag: true } }));
    }
    if(u.pathname.includes('/lunch-order')) {
      if(r.method() === 'POST') {
        const body = r.postDataJSON(); posts.push(body);
        if(opts.failure) return route.fulfill(json({success:false},500));
        orders = orders.concat({ ...baseOrder, ...body, id: `new-${posts.length}` });
        return route.fulfill(json({ success: true },201));
      }
      if(r.method() === 'PATCH') {
        const body = r.postDataJSON(); patches.push(body);
        if(opts.conflict) return route.fulfill(json({success:false},409));
        const id = u.pathname.split('/').pop();
        orders = orders.map(o => o.id === id ? {...o, menge:body.menge, version:'W/"2"'} : o);
        return route.fulfill(json({success:true}));
      }
      return route.fulfill(json({success:true,orders,verlauf:[]}));
    }
    return route.fulfill(json({success:true,data:[],customers:[]}));
  });
  await page.goto(`${BASE}/kiosk.html`);
  await page.evaluate(() => K.switchTab('mittag'));
  await expect(page.locator('#btn-lauf')).toBeVisible();
  await expect(page.locator('#mittag-orders')).not.toContainText('Laden…');
  return {posts,patches};
}

test('TC-F1/F2: Eigene Heute-Erfassung, zwei Portionen, bestätigt und Mitnehmen', async ({page}) => {
  const calls = await setup(page);
  await page.locator('#btn-lauf').click();
  await expect(page.locator('#lauf-save')).toBeEnabled();
  await expect(page.locator('#lauf-gericht input[value="0"]')).toBeChecked();
  await expect(page.locator('#modal-lauf')).not.toContainText('Kunde suchen');
  await page.locator('#modal-lauf').getByRole('button',{name:'Eine Portion mehr',exact:true}).click();
  await page.locator('#lauf-mit').check();
  await page.locator('#lauf-save').click();
  await expect(page.locator('#modal-lauf')).not.toHaveClass(/open/);
  expect(calls.posts).toHaveLength(1);
  expect(calls.posts[0]).toMatchObject({quelle:3,menge:2,datum:DAY,mitnehmen:true});
  await expect(page.locator('#mittag-orders')).toContainText('Laufkundschaft');
  await expect(page.locator('#mittag-orders')).toContainText('Bestätigt');
  await expect(page.locator('#mittag-cook')).toContainText('2 Laufkundschaft');
  await page.locator('#btn-lauf').click();
  await expect(page.locator('#lauf-save')).toBeEnabled();
  await expect(page.locator('#lauf-menge')).toHaveText('1');
  await expect(page.locator('#lauf-mit')).not.toBeChecked();
});

test('TC-F1-03: Andere Tage erlauben keine Laufkundschaft', async ({page}) => {
  const calls = await setup(page);
  await page.getByText('Morgen',{exact:true}).first().click();
  await expect(page.locator('#btn-lauf')).toBeDisabled();
  await page.evaluate(() => K.openLauf());
  await expect(page.locator('#modal-lauf')).not.toHaveClass(/open/);
  expect(calls.posts).toHaveLength(0);
});

for(const mode of ['empty','failure','multiple']) {
  test(`TC-F1-02/04: Plan ${mode}`,async ({page})=>{
    const opts = mode==='failure'?{planFailure:true}:
      {dishes:mode==='empty'?[{...DISH,dl_datum:'2026-10-29'}]:[DISH,{...DISH,dl_wochenplanid:'wp-2',dl_gericht:'Gulasch'}]};
    const calls = await setup(page,opts);
    await page.locator('#btn-lauf').click();
    if(mode==='multiple') {
      await expect(page.locator('#lauf-save')).toBeEnabled();
      await page.locator('#lauf-save').click();
      await expect(page.locator('#lauf-fehler')).toHaveText('Bitte ein Gericht auswählen.');
      await page.locator('#lauf-gericht input[value="1"]').check();
      await page.locator('#lauf-save').click();
      await expect(page.locator('#modal-lauf')).not.toHaveClass(/open/);
      expect(calls.posts[0].gericht).toBe('Gulasch');
    } else {
      await expect(page.locator('#lauf-fehler')).toContainText(mode==='empty'?'kein Gericht':'nicht geladen');
      await expect(page.locator('#lauf-save')).toBeDisabled();
      expect(calls.posts).toHaveLength(0);
    }
  });
}

test('TC-F2-06: Fehler erlaubt keinen stillen erneuten POST', async ({page})=>{
  const calls = await setup(page,{failure:true});
  await page.locator('#btn-lauf').click();
  await expect(page.locator('#lauf-save')).toBeEnabled();
  await page.locator('#lauf-save').click();
  await expect(page.locator('#lauf-fehler')).toContainText('Tagesliste prüfen');
  await expect(page.locator('#lauf-save')).toBeDisabled();
  expect(calls.posts).toHaveLength(1);
});

test('TC-F1-06/F2-05: Tageswechsel sperrt, Doppelklick bucht nur einmal',async ({page})=>{
  const calls = await setup(page);
  await page.locator('#btn-lauf').click();
  await expect(page.locator('#lauf-save')).toBeEnabled();
  await page.clock.setFixedTime(new Date('2026-10-30T23:30:00Z'));
  await page.locator('#lauf-save').click();
  await expect(page.locator('#lauf-fehler')).toContainText('Tag hat sich geändert');
  expect(calls.posts).toHaveLength(0);
  await page.clock.setFixedTime(new Date('2026-10-30T12:30:00+01:00'));
  await page.evaluate(()=>{ K.saveLauf(); K.saveLauf(); });
  await expect(page.locator('#modal-lauf')).not.toHaveClass(/open/);
  expect(calls.posts).toHaveLength(1);
});

test('TC-F3-02/F4-03: Statusfilter kombiniert, Abbruch und Telefonmenge',async ({page})=>{
  const calls = await setup(page,{orders:[
    {...baseOrder,id:'walk'},
    {...baseOrder,id:'done',status:3},
    {...baseOrder,id:'cancel',status:2},
    {...baseOrder,id:'phone',quelle:1,name:'Telefonkunde'}
  ]});
  await page.locator('#mt-src-lauf').click();
  await page.locator('[data-mt-filter="erledigt"]').click();
  await expect(page.locator('#oc-done')).toBeVisible();
  await expect(page.locator('#oc-done').getByRole('button',{name:'Menge ändern'})).toHaveCount(0);
  await page.locator('[data-mt-filter="storniert"]').click();
  await expect(page.locator('#oc-cancel')).toBeVisible();
  await expect(page.locator('#oc-cancel').getByRole('button',{name:'Menge ändern'})).toHaveCount(0);
  await page.locator('[data-mt-filter="offen"]').click();
  await page.locator('#mt-src-toggle').click();
  await page.locator('#oc-phone').getByRole('button',{name:'Menge ändern'}).click();
  await page.locator('#modal-menge').getByRole('button',{name:'Eine Portion mehr',exact:true}).click();
  await page.locator('#modal-menge').getByRole('button',{name:'Abbrechen',exact:true}).click();
  expect(calls.patches).toHaveLength(0);
  await page.locator('#oc-phone').getByRole('button',{name:'Menge ändern'}).click();
  await expect(page.locator('#menge-wert')).toHaveText('1');
  await page.locator('#modal-menge').getByRole('button',{name:'Eine Portion mehr',exact:true}).click();
  await page.locator('#menge-save').click();
  await expect(page.locator('#modal-menge')).not.toHaveClass(/open/);
  expect(calls.patches[0].menge).toBe(2);
  await expect(page.locator('#oc-phone')).toContainText('17,60');
});

test('TC-F3/F4: Quellen getrennt und offene Mengenänderung aktualisiert Preis und Summen', async ({page})=>{
  const orders = [
    {...baseOrder,id:'walk',menge:2,mitnehmen:true},
    {...baseOrder,id:'phone',name:'Telefonkunde',quelle:1},
    {...baseOrder,id:'online',name:'Onlinekunde',quelle:0},
    {...baseOrder,id:'personal',name:'Personal',quelle:2},
    {...baseOrder,id:'done',status:3},
    {...baseOrder,id:'cancel',status:2},
  ];
  const calls = await setup(page,{orders});
  await expect(page.locator('#mt-fc-lauf')).toHaveText('3');
  await expect(page.locator('#mt-fc-telefon')).toHaveText('1');
  await expect(page.locator('#oc-online').getByRole('button',{name:'Menge ändern'})).toHaveCount(0);
  await expect(page.locator('#oc-personal').getByRole('button',{name:'Menge ändern'})).toHaveCount(0);
  await page.locator('#mt-src-lauf').click();
  await expect(page.locator('#oc-phone')).toHaveCount(0);
  await expect(page.locator('#oc-walk')).toBeVisible();
  await page.locator('#oc-walk').getByRole('button',{name:'Menge ändern'}).click();
  await page.locator('#modal-menge').getByRole('button',{name:'Eine Portion mehr',exact:true}).click();
  await page.locator('#menge-save').click();
  await expect(page.locator('#modal-menge')).not.toHaveClass(/open/);
  expect(calls.patches).toEqual([{aktion:'menge-aendern',menge:3,version:'W/"1"'}]);
  await expect(page.locator('#oc-walk')).toContainText('26,40');
  await expect(page.locator('#oc-walk')).toContainText('Bestätigt');
  await expect(page.locator('#mittag-cook')).toContainText('7 Portionen');
  await expect(page.locator('#oc-walk').getByRole('button',{name:'Menge ändern'})).toBeFocused();
  const kitchen = await page.evaluate(()=>{
    const original = window.open;
    let html = '';
    window.open = () => ({document:{write: value => {html += value;},close(){}}});
    try { K.printKitchen(); } finally { window.open = original; }
    const doc = new DOMParser().parseFromString(html,'text/html');
    return [...doc.querySelectorAll('.kl-kz')].map(e=>e.textContent);
  });
  expect(kitchen).toEqual(['7Portionen','4vor Ort','3mitnehmen']);
  await page.locator('#mt-src-toggle').click();
  await expect(page.locator('#oc-phone')).toBeVisible();
  await expect(page.locator('#oc-walk')).toHaveCount(0);
  await page.reload();
  await page.evaluate(()=>K.switchTab('mittag'));
  await expect(page.locator('#oc-walk')).toContainText('26,40');
});

test('TC-F4-05: Konflikt sperrt erneutes Speichern', async ({page})=>{
  const calls = await setup(page,{orders:[{...baseOrder,id:'walk'}],conflict:true});
  await page.locator('#oc-walk').getByRole('button',{name:'Menge ändern'}).click();
  await page.locator('#menge-save').click();
  await expect(page.locator('#menge-fehler')).toContainText('inzwischen geändert');
  await expect(page.locator('#menge-save')).toBeDisabled();
  expect(calls.patches).toHaveLength(1);
});

test('TC-F5-01: Alle Aktionen und kompakte Dialoge passen ins Viewport',async ({page},testInfo)=>{
  await setup(page,{orders:[{...baseOrder,id:'walk'}]});
  for(const id of ['btn-lauf','btn-new-order']) {
    const box = await page.locator('#'+id).boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x+box.width).toBeLessThanOrEqual(page.viewportSize().width+1);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.y+box.height).toBeLessThanOrEqual(page.viewportSize().height+1);
  }
  await page.locator('#btn-lauf').click();
  await expect(page.locator('#lauf-save')).toBeEnabled();
  const box = await page.locator('#lauf-save').boundingBox();
  expect(box.y+box.height).toBeLessThanOrEqual(page.viewportSize().height);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('laufkundschaft-dialog.png')});
});

test('Mockup: Daten eingeklappt, Erstbestellung offen und Preis bedienbar',async ({page})=>{
  await page.goto(`${BASE}/entwurf-mittag-bestellen.html`);
  await expect(page.locator('#customer')).not.toHaveAttribute('open','');
  await page.locator('#plus').click();
  await expect(page.locator('#total')).toContainText('17,60');
  await page.locator('#mode').click();
  await expect(page.locator('#customer')).toHaveAttribute('open','');
  await expect(page.locator('#name')).toHaveValue('');
  await page.locator('#name').fill('Beispielkunde');
  await page.locator('#submit').click();
  await expect(page.locator('#feedback')).toContainText('keine echte Bestellung');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#close-bottom').click();
  await expect(page.locator('#dialog')).toBeHidden();
  await page.locator('#reopen').click();
  await expect(page.locator('#dialog')).toBeVisible();
  await page.locator('#close-top').click();
  await expect(page.locator('#dialog')).toBeHidden();
});
