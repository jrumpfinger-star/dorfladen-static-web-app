// @ansichten: alle
const { test, expect } = require('@playwright/test');
const path = require('path');

const url = '/mockups/inventur-mockup.html?ansicht=app';
const errors = new WeakMap();
const model = page => page.evaluate(() => window.inventurDemo.snapshot());
const position = async (page, id = 'shop', articleId = 'milk') =>
  (await model(page)).positions.find(p => p.inventoryId === id && p.articleId === articleId);

async function choose(page, text) {
  await page.locator('#search').fill(text);
  await page.locator('#results .result').first().click();
}
async function change(page, id, value) {
  await page.locator('#' + id).fill(value);
  await page.locator('#' + id).press('Tab');
}
async function settings(page) {
  await page.locator('#menu-open').click();
  await page.locator('#go-settings').click();
}
async function capture(page) {
  await page.locator('#menu-open').click();
  await page.locator('#go-capture').click();
}
async function closeMessage(page) {
  await expect(page.locator('#message')).toBeVisible();
  await page.locator('#message-close').click();
}
async function assertGeometry(page) {
  const measurement = await page.evaluate(() => {
    const bounds = id => {
      const el = document.getElementById(id), r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { id, x:r.x, y:r.y, right:r.right, bottom:r.bottom, width:r.width,
        height:r.height, hit:hit === el || el.contains(hit) };
    };
    const doc = document.documentElement, area = document.getElementById('capture-fields').getBoundingClientRect();
    const search = document.querySelector('.search-area').getBoundingClientRect();
    const extraHeights = ['.search-area .field-label','.search-row','#results'].map(selector => {
      const el = document.querySelector(selector);return el.hidden ? 0 : el.getBoundingClientRect().height;
    });
    return { width:innerWidth, height:innerHeight, scrollWidth:doc.scrollWidth,
      scrollHeight:doc.scrollHeight, bodyHeight:document.body.scrollHeight,
      areas:search.height ? [area.height,search.height] : [area.height,...extraHeights], fields:['inventory','search','scan-open','quantity','plus','save','add','manual-scan'].map(bounds),
      touch:matchMedia('(pointer:coarse)').matches || innerWidth < 600 };
  });
  expect(measurement.scrollWidth).toBeLessThanOrEqual(measurement.width);
  expect(measurement.scrollHeight).toBeLessThanOrEqual(measurement.height);
  expect(measurement.bodyHeight).toBeLessThanOrEqual(measurement.height);
  for (const field of measurement.fields) {
    expect(field.x, field.id).toBeGreaterThanOrEqual(0);
    expect(field.y, field.id).toBeGreaterThanOrEqual(0);
    expect(field.right, field.id).toBeLessThanOrEqual(measurement.width + 1);
    expect(field.bottom, field.id).toBeLessThanOrEqual(measurement.height + 1);
    expect(field.hit, field.id).toBe(true);
    if (measurement.touch && ['scan-open','save','add'].includes(field.id)) {
      expect(field.width).toBeGreaterThanOrEqual(44);
      expect(field.height).toBeGreaterThanOrEqual(44);
    }
  }
  const fraction = (measurement.width >= 850 ? Math.max(...measurement.areas) : measurement.areas.reduce((sum,h) => sum+h,0)) / measurement.height;
  expect(fraction).toBeGreaterThanOrEqual(measurement.width >= 850 ? .8 : .7);
  return measurement;
}

test.beforeEach(async ({ page }) => {
  errors.set(page,[]);
  page.on('pageerror',e => errors.get(page).push(e.message));
  // The demo must remain fully usable even if its optional icon CDN is unavailable.
  await page.route('https://unpkg.com/**', route => route.abort());
  await page.goto(url);
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

test('TC-F1-01/02, TC-F2-01, TC-F9-01/02: Bereiche und Verwaltungsentwürfe', async ({ page }) => {
  await expect(page.locator('#capture-screen')).toBeVisible();
  await expect(page.locator('#inventory option')).toHaveText(['Ladeninventur','Lagerinventur']);
  await expect(page.locator('#inventory')).toHaveValue('shop');
  await settings(page);
  await page.locator('#new-inventory').click();
  await page.locator('#inventory-name').fill('Demoinventur');
  await page.locator('#inventory-year').fill('Winter / Frühjahr');
  await page.locator('#inventory-status').selectOption('aktiv');
  await page.locator('#editor-close').click();
  await capture(page);
  await settings(page);
  await page.locator('#new-inventory').click();
  await expect(page.locator('#inventory-name')).toHaveValue('Demoinventur');
  expect((await model(page)).inventories.some(i => i.name === 'Demoinventur')).toBe(false);
  await page.locator('#inventory-save').click();
  if (await page.locator('#inventory-editor').isVisible()) await page.locator('#editor-close').click();
  await expect(page.getByRole('button',{name:'Demoinventur bearbeiten',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Ladeninventur bearbeiten',exact:true}).click();
  await page.locator('#inventory-date').fill('2026-11-22');
  await page.locator('#inventory-save').click();
  expect((await model(page)).inventories.find(i => i.id === 'shop').date).toBe('2026-11-22T08:30');
  if (await page.locator('#inventory-editor').isVisible()) await page.locator('#editor-close').click();
  await capture(page);
  await expect(page.locator('#inventory option')).toHaveText(['Ladeninventur','Lagerinventur','Demoinventur']);
  await settings(page);
  await page.getByRole('button',{name:'Ladeninventur bearbeiten',exact:true}).click();
  await expect(page.locator('#inventory-name')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'Ladeninventur bearbeiten',exact:true})).toBeFocused();
});

test('TC-F2-02, TC-F9-01: Pflichtname und keine aktive Inventur', async ({ page }) => {
  await settings(page);
  await page.locator('#new-inventory').click();
  await page.locator('#inventory-year').fill('2027');
  await page.locator('#inventory-save').click();
  await expect(page.locator('#message-text')).toContainText('Inventurnamen');
  expect((await model(page)).inventories).toHaveLength(28);
  await closeMessage(page);
  await page.locator('#editor-close').click();
  for (const name of ['Ladeninventur','Lagerinventur']) {
    await page.getByRole('button',{name:name+' bearbeiten',exact:true}).click();
    await page.locator('#inventory-status').selectOption('abgeschlossen');
    await page.locator('#inventory-save').click();
    if (await page.locator('#inventory-editor').isVisible()) await page.locator('#editor-close').click();
  }
  await capture(page);
  await expect(page.locator('#inventory')).toBeDisabled();
  await expect(page.locator('#inventory-meta')).toContainText('aktivieren');
  await expect(page.locator('#quantity')).toBeDisabled();
  await expect(page.locator('#scan-open')).toBeDisabled();
});

test('TC-F3-01/02, TC-F11-02: Suche, Tastatur und lange interne Trefferliste', async ({ page }) => {
  await page.locator('#search').fill('9000000000011');
  await page.locator('#search').press('ArrowDown');
  await page.locator('#search').press('Enter');
  await expect(page.locator('#quantity')).toBeFocused();
  await expect(page.locator('#quantity')).toHaveValue('12');
  await page.locator('#search').fill('Regionaler Beispielartikel');
  await expect(page.locator('#results .result')).toHaveCount(40);
  const names = await page.locator('#results .result strong').allTextContents();
  expect(names).toEqual([...names].sort((a,b) => a.localeCompare(b,'de')));
  await page.locator('#search').press('ArrowUp');
  await expect(page.locator('#results .result').last()).toHaveAttribute('aria-selected','true');
  await page.locator('#results').evaluate(el => {el.scrollTop = el.scrollHeight;});
  expect(await page.locator('#results').evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await page.locator('#results .result').last().click();
  await expect(page.locator('#article-name')).toContainText('40');
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.locator('#search').fill('gibt-es-nicht');
  await expect(page.locator('#results')).toContainText('Keine Artikel gefunden');
  await expect(page.locator('#results .result')).toHaveCount(0);
});

test('TC-F4-01/02, TC-F10-01: beide Scan-Modi, erster Barcode und unbekanntes Ergebnis', async ({ page }) => {
  await page.locator('#scan-open').click();
  await expect(page.getByRole('dialog',{name:'Barcode · Simulation'})).toBeVisible();
  await expect(page.locator('body')).toHaveClass('modal-open');
  await page.locator('#scan-example').focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#scanner-close')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  expect(await page.locator('#scanner').evaluate(el => el.contains(document.activeElement))).toBe(true);
  await page.locator('#scan-example').selectOption('batch');
  await expect(page.locator('#article-name')).toContainText('Bio-Vollmilch');
  await expect(page.locator('#quantity')).toBeFocused();
  await page.locator('#manual-scan').check();
  await page.locator('#scan-open').click();
  await page.locator('#scan-example').selectOption('bread');
  await expect(page.locator('#scanner')).toBeVisible();
  await expect(page.locator('#article-name')).toContainText('Bio-Vollmilch');
  await page.locator('#scan-confirm').click();
  await expect(page.locator('#unit')).toHaveText('Gramm');
  await page.locator('#scan-open').click();
  await page.locator('#scan-example').selectOption('unknown');
  await page.locator('#scan-confirm').click();
  await expect(page.locator('#message-text')).toContainText('Artikel nicht gefunden');
  await expect(page.locator('#quantity')).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.locator('#scan-open')).toBeFocused();
  await page.locator('#scan-open').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#scan-open')).toBeFocused();
  await choose(page,'9000000000011');
  await expect(page.locator('#quantity')).toBeEnabled();
});

test('TC-F5-01/02/03: Preise, Einheiten und gespeicherter EK', async ({ page }) => {
  await choose(page,'9000000000011');
  await expect(page.locator('#ek')).toHaveText('0,98 €');
  await expect(page.locator('#vk')).toHaveText('1,79 €');
  await expect(page.locator('#unit')).toHaveText('Stück');
  await choose(page,'9000000000028');
  await expect(page.locator('#quantity')).toHaveValue('');
  await expect(page.locator('#ek')).toHaveText('2,82 €');
  await expect(page.locator('#unit')).toHaveText('Gramm');
  await change(page,'quantity','750');
  expect((await position(page,'shop','bread')).ek).toBe(2.82);
  await choose(page,'9000000000035');
  await expect(page.locator('#ek')).toHaveText('1,96 €');
  await choose(page,'Regionaler Beispielartikel 01');
  await expect(page.locator('#ek')).toHaveText('1,80 €');
  await choose(page,'9000000000042');
  await expect(page.locator('#message-text')).toContainText('nicht unterstützt');
  await expect(page.locator('#quantity')).toBeDisabled();
});

test('TC-F6-01/02/03, TC-F7-01/03: optionale Integer-Menge und unveränderte Fehlerposition', async ({ page }) => {
  await choose(page,'9000000000011');
  for (const value of ['', '0','-5','-2147483648','2147483647']) {
    await change(page,'quantity',value);
    expect((await position(page)).quantity).toBe(value === '' ? null : Number(value));
    if (value.length > 8) {
      expect(await page.locator('#quantity').evaluate(el => {
        const s = getComputedStyle(el), canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
        ctx.font = s.font;
        return ctx.measureText(el.value).width <= el.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight);
      })).toBe(true);
    }
    if (Number(value) > 0) await expect(page.locator('#saved-check')).toBeVisible();
    else await expect(page.locator('#saved-check')).toBeHidden();
  }
  for (const value of ['1.5','1,5','abc','2147483648']) {
    await change(page,'quantity',value);
    await expect(page.locator('#message')).toBeVisible();
    expect((await position(page)).quantity).toBe(2147483647);
    await closeMessage(page);
  }
  await change(page,'quantity','2147483647');
  await change(page,'plus','1');
  await expect(page.locator('#message-text')).toContainText('Gesamtmenge');
  expect((await position(page)).quantity).toBe(2147483647);
  await closeMessage(page);
  await change(page,'plus','');
  await change(page,'quantity','');
  await change(page,'plus','-3');
  expect((await position(page)).quantity).toBe(-3);
  await expect(page.locator('#status-text')).toHaveText('Gespeichert · nur lokal');
});

test('TC-F7-02, TC-F8-01/02: Plus genau einmal und getrennte Inventurpositionen', async ({ page }) => {
  await choose(page,'9000000000011');
  await page.locator('#plus').fill('4');
  await expect(page.locator('#saved-check')).toBeHidden();
  await page.locator('#add').click();
  await expect(page.locator('#quantity')).toHaveValue('16');
  await expect(page.locator('#plus')).toHaveValue('');
  await page.locator('#add').click();
  expect((await position(page)).quantity).toBe(16);
  expect(await position(page)).toEqual({inventurKey:'Ladeninventur-9000000000011',inventoryId:'shop',articleId:'milk',articleNumber:'9000000000011',unit:'0',quantity:16,ek:.98});
  await page.locator('#inventory').selectOption('store');
  await expect(page.locator('#quantity')).toHaveValue('30');
  await page.locator('#quantity').fill('25');
  await page.locator('#save').click();
  expect((await position(page,'store')).quantity).toBe(25);
  await page.locator('#inventory').selectOption('shop');
  await expect(page.locator('#quantity')).toHaveValue('16');
  await choose(page,'9000000000028');
  await choose(page,'9000000000011');
  await expect(page.locator('#quantity')).toHaveValue('16');
});

test('TC-F9-03, TC-F11-02: lange Inventurenliste und optionales Datum', async ({ page }) => {
  await settings(page);
  await page.locator('#inventory-list').evaluate(el => {el.scrollTop = el.scrollHeight;});
  expect(await page.locator('#inventory-list').evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await page.getByRole('button',{name:'Beispielinventur 24 bearbeiten',exact:true}).click();
  await page.locator('#inventory-year').fill('');
  await page.locator('#inventory-date').fill('');
  await page.locator('#inventory-status').selectOption('');
  await page.locator('#inventory-save').click();
  const inv = (await model(page)).inventories.find(i => i.id === 'example-23');
  expect([inv.year,inv.date,inv.status]).toEqual(['','','']);
  if (await page.locator('#inventory-editor').isVisible()) await page.locator('#editor-close').click();
  await expect(page.getByRole('button',{name:'Beispielinventur 24 bearbeiten',exact:true})).toContainText('Kein Startdatum');
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test('TC-F10-02, TC-F11-01: tatsächliche Geometrie, Kontrast und vier Screenshots', async ({ page }, info) => {
  await choose(page,'Regionaler Beispielartikel 40');
  await assertGeometry(page);
  await change(page,'quantity','120');
  await assertGeometry(page);
  const shots = process.env.MOCKUP_SHOTS;
  if (shots) await page.screenshot({path:path.join(shots,'inventur-'+info.project.name+'.png')});
  for (const dark of [false,true]) {
    if (dark) await page.locator('#theme').click();
    const pairs = await page.evaluate(() => {
      function rgb(c) {return c.match(/[\d.]+/g).slice(0,3).map(Number);}
      return ['quantity','save','status-text'].map(id => {
        const el = document.getElementById(id), s = getComputedStyle(el);
        return {color:rgb(s.color),bg:rgb(id === 'status-text' ? getComputedStyle(document.getElementById('capture-fields')).backgroundColor : s.backgroundColor)};
      }).concat([{color:rgb(getComputedStyle(document.getElementById('quantity')).borderTopColor),bg:rgb(getComputedStyle(document.getElementById('quantity')).backgroundColor),border:true}]);
    });
    const luminance = rgb => rgb.map(x => x/255).map(x => x <= .04045 ? x/12.92 : ((x+.055)/1.055)**2.4).reduce((sum,x,i) => sum+x*[.2126,.7152,.0722][i],0);
    for (const pair of pairs) {
      const a = luminance(pair.color), b = luminance(pair.bg);
      expect((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toBeGreaterThanOrEqual(pair.border ? 3 : 4.5);
    }
    await assertGeometry(page);
  }
  await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
  await expect(page.locator('#quantity')).toBeVisible();
  await expect(page.locator('#save')).toBeVisible();
  await assertGeometry(page);
});

test('TC-F11-03/04: keine Writes/Persistenz, Reload und reduzierte Eingabehöhe', async ({ page }) => {
  const writes = [], remote = [];
  page.on('request',request => {
    if (!['GET','HEAD'].includes(request.method())) writes.push(request.url());
    if (!request.url().startsWith('http://127.0.0.1:') && !request.url().startsWith('https://unpkg.com/')) remote.push(request.url());
  });

  await choose(page,'9000000000011');
  const originalSize = page.viewportSize();
  await page.setViewportSize({width:375,height:375});
  await page.locator('#quantity').focus();
  const rects = await page.locator('#quantity, #save').evaluateAll(els => els.map(el => {
    const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:innerHeight};
  }));
  for (const r of rects) {expect(r.top).toBeGreaterThanOrEqual(0);expect(r.bottom).toBeLessThanOrEqual(r.height);}
  await page.setViewportSize(originalSize);
  await change(page,'quantity','99');
  expect((await position(page)).quantity).toBe(99);
  await page.reload();
  await choose(page,'9000000000011');
  await expect(page.locator('#quantity')).toHaveValue('12');
  expect(writes).toEqual([]);
  expect(remote).toEqual([]);
  expect(await page.evaluate(async () => ({local:localStorage.length,session:sessionStorage.length,sw:(await navigator.serviceWorker.getRegistrations()).length}))).toEqual({local:0,session:0,sw:0});
});

test('TC-F12-01/02: normaler Aufruf zeigt am PC ein echtes Handyformat', async ({ page }) => {
  await page.goto('/mockups/inventur-mockup.html');
  if (page.viewportSize().width >= 850) {
    await expect(page.getByRole('region',{name:'Handy-Vorschau'})).toBeVisible();
    const frame = page.frameLocator('#phone-preview');
    await frame.locator('#search').fill('9000000000011');
    await frame.locator('#results button').first().click();
    await frame.locator('#plus').fill('3');
    await frame.locator('#add').click();
    await expect(frame.locator('#quantity')).toHaveValue('15');
    const size = () => frame.locator('html').evaluate(() => ({
      width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,
      scrollHeight:document.documentElement.scrollHeight
    }));
    expect(await size()).toEqual({width:375,height:667,scrollWidth:375,scrollHeight:667});
    await page.locator('#preview-size').selectOption('384,832');
    expect(await size()).toEqual({width:384,height:832,scrollWidth:384,scrollHeight:832});
    await expect(frame.locator('#quantity')).toHaveValue('15');
    await page.getByRole('link',{name:'Responsive Vollansicht'}).click();
  }
  await expect(page.locator('.preview-shell')).toBeHidden();
  await expect(page.locator('#capture-screen')).toBeVisible();
});
