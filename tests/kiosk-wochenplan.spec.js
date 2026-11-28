const { test, expect } = require('./_kiosk-angemeldet');
const cmsAngemeldet = require('./_cms-angemeldet');

const BASE = process.env.TEST_URL || 'http://127.0.0.1:8099';

const zeilen = ['Halsgrat in Gulaschsoße', 'Cordon bleu', 'Lasagne', 'Rinderbraten', 'Gebackener Fisch'].map((name, i) => ({
  dl_wochenplanid: 'w' + i, dl_gericht: name, dl_wochentag: 101000 + i, dl_preis: 9.8, dl_allergene: '',
  dl_status: 101001, dl_kalenderwoche: 48, dl_jahr: 2026
}));

/* Nichts Echtes: Lesen liefert Beispieldaten, jeder Schreibzugriff wird gezählt und abgewiesen. */
async function aufbau(page, flags) {
  const schreib = [];
  page.on('dialog', d => d.dismiss());
  await page.clock.setFixedTime(new Date('2026-11-24T12:00:00Z'));
  await page.route('https://unpkg.com/**', r => r.abort());
  await page.route('https://cdn.jsdelivr.net/**', r => r.abort());
  await page.route('**/api/**', route => {
    const req = route.request(), url = new URL(req.url());
    if (req.method() !== 'GET') { schreib.push(req.method() + ' ' + url.pathname); return route.fulfill({ status: 405, json: { success: false } }); }
    if (url.pathname === '/api/wochenplan') return route.fulfill({ json: { success: true, data: zeilen } });
    if (url.pathname === '/api/cms-config') return route.fulfill({ json: { success: true, data: { feature_flags: flags || {} } } });
    return route.fulfill({ json: { success: true, data: [], value: [], groups: [] } });
  });
  await cmsAngemeldet(page);
  await page.goto(BASE + '/kiosk.html');
  await expect(page.locator('.k-tabs .k-tab').first()).toBeAttached();
  return schreib;
}

async function waehle(page, id) {
  const tab = page.locator('.k-tab[data-tab="' + id + '"]');
  await tab.scrollIntoViewIfNeeded();
  await tab.click();
}

async function sichtbareReiter(page) {
  return page.locator('.k-tabs .k-tab').evaluateAll(tabs => tabs
    .filter(t => getComputedStyle(t).display !== 'none').map(t => t.dataset.tab));
}

test('TC-F1-01/F2-01: Reihenfolge Angebote, Wochenplan, Getränke ganz am Ende', { tag: '@layout' }, async ({ page }) => {
  await aufbau(page);
  const alle = await page.locator('.k-tabs .k-tab').evaluateAll(tabs => tabs.map(t => t.dataset.tab));
  expect(alle).toEqual(['mittag', 'abhol', 'metzger', 'baecker', 'metzgerbest', 'drax', 'kontakt', 'social', 'kalender', 'werbebilder', 'angebote', 'wochenplan', 'getraenke']);
  await page.locator('.k-tab[data-tab="wochenplan"]').scrollIntoViewIfNeeded();
  const tab = page.locator('.k-tab[data-tab="wochenplan"]');
  await expect(tab).toBeVisible();
  await tab.click();
  await expect(page.locator('#panel-wochenplan')).toBeVisible();
});

test('TC-F1-03: Getränke-Schalter aus blendet den Reiter weiter aus', async ({ page }) => {
  await aufbau(page, { kiosk_getraenke: false });
  await expect.poll(() => sichtbareReiter(page)).not.toContain('getraenke');
  expect(await sichtbareReiter(page)).toContain('wochenplan');
});

test('TC-F3-01/02/03/05, F6-01: CMS-Wochenplan eingebettet, lädt erst beim ersten Öffnen, ohne Überlauf', { tag: '@layout' }, async ({ page }) => {
  const schreib = await aufbau(page);
  const rahmen = page.locator('#wochenplan-frame');
  await expect(rahmen).not.toHaveAttribute('src', /.+/);
  await page.locator('.k-tab[data-tab="wochenplan"]').scrollIntoViewIfNeeded();
  await page.locator('.k-tab[data-tab="wochenplan"]').click();
  await expect(rahmen).toHaveAttribute('src', '/cms.html?embed=wochenplan');
  const cms = page.frameLocator('#wochenplan-frame');
  await expect(cms.locator('#cms-wp-grid .cms-meal')).toHaveCount(5);
  /* Kein CMS-Kopf, keine CMS-Navigation; der Wochenplan ist vollständig bedienbar. */
  await expect(cms.locator('.cmsneu-kopf')).toBeHidden();
  await expect(cms.locator('.cmsneu-nav')).toBeHidden();
  const steuerung = cms.locator('.cms-wp-controls');
  for (const name of ['Gericht', 'Hilfe zum Wochenplan', 'Vorherige Woche', 'Nächste Woche anzeigen', 'Vorschau', 'Drucken', 'Auf die Waage', 'Teilen']) {
    await expect(steuerung.getByRole('button', { name, exact: true })).toBeVisible();
  }
  /* Seite scrollt nicht, der Rahmen füllt den Platz unter der Leiste. */
  const mass = await page.evaluate(() => {
    const panel = document.getElementById('panel-wochenplan').getBoundingClientRect();
    const tabs = document.querySelector('.k-tabs').getBoundingClientRect();
    const f = document.getElementById('wochenplan-frame').getBoundingClientRect();
    const de = document.documentElement;
    return { ueberlaufX: de.scrollWidth - de.clientWidth, ueberlaufY: de.scrollHeight - innerHeight,
      fuellt: Math.abs(f.height - panel.height) < 2 && Math.abs(f.width - panel.width) < 2, unterLeiste: panel.top >= tabs.bottom - 1 || panel.left >= tabs.right - 1 || panel.bottom <= tabs.top + 1 };
  });
  expect(mass.ueberlaufX).toBeLessThanOrEqual(0);
  expect(mass.ueberlaufY).toBeLessThanOrEqual(0);
  expect(mass.fuellt).toBe(true);
  expect(mass.unterLeiste).toBe(true);
  expect(await cms.locator('html').evaluate(h => h.scrollWidth - h.clientWidth)).toBeLessThanOrEqual(0);
  /* Wiederöffnen lädt nicht neu: eine Markierung im Rahmen bleibt erhalten. */
  await cms.locator('html').evaluate(h => { h.dataset.marke = '1'; });
  await waehle(page, 'angebote');
  await waehle(page, 'wochenplan');
  await expect(cms.locator('html')).toHaveAttribute('data-marke', '1');
  expect(schreib).toEqual([]);
});

test('TC-F3-02: Hilfe im Rahmen öffnet als Popup und schließt wieder', async ({ page }) => {
  await aufbau(page);
  await page.locator('.k-tab[data-tab="wochenplan"]').scrollIntoViewIfNeeded();
  await page.locator('.k-tab[data-tab="wochenplan"]').click();
  const cms = page.frameLocator('#wochenplan-frame');
  await expect(cms.locator('#cms-wp-grid .cms-meal')).toHaveCount(5);
  await cms.getByRole('button', { name: 'Hilfe zum Wochenplan', exact: true }).click();
  await expect(cms.locator('#cms-panel-wp')).toBeVisible();
  await expect(cms.locator('#cms-panel-help')).toBeHidden();
});

test('TC-F3-04: Embed-Modus legt keine Reiter-Verlaufseinträge an; CMS ohne embed behält Kopf und Navigation', async ({ page }) => {
  await aufbau(page);
  await page.goto(BASE + '/cms.html?embed=wochenplan');
  await expect(page.locator('#cms-wp-grid .cms-meal')).toHaveCount(5);
  const vorher = await page.evaluate(() => history.length);
  await page.evaluate(() => window.cmsTab('hours'));
  await page.evaluate(() => window.cmsTab('wp'));
  expect(await page.evaluate(() => history.length)).toBe(vorher);
  expect(await page.evaluate(() => sessionStorage.getItem('cms_home_anker'))).toBeNull();
  await page.goto(BASE + '/cms.html');
  await expect(page.locator('#cms-wp-grid .cms-meal')).toHaveCount(5);
  await expect(page.locator('html')).not.toHaveClass(/cms-embed/);
  await expect(page.locator('.cmsneu-kopf')).toBeVisible();
  const vor = await page.evaluate(() => history.length);
  await page.evaluate(() => window.cmsTab('hours'));
  expect(await page.evaluate(() => history.length)).toBe(vor + 1);
});
