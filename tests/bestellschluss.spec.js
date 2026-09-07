// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Bestellschluss Mittagstisch (F17) – der im CMS gepflegte Wert muss auch dann
 * greifen, wenn die Konfiguration langsamer eintrifft als der Wochenplan.
 *
 * Hintergrund: `window._dlBestellschluss` wird asynchron aus /api/cms-config
 * geladen. Wer vorher rendert, benutzt den Notfallwert 10:30 – dann fehlt der
 * Bestellknopf, obwohl laut CMS (z. B. 11:00) noch bestellt werden darf.
 *
 * Alle API-Aufrufe werden abgefangen; der Test ist damit unabhaengig von
 * echten Daten und loest keine Bestellung aus.
 */

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const LOKAL = /localhost|127\.0\.0\.1/.test(BASE);
// Der lokale Testserver kennt keine Rewrites – dort mit .html ansteuern.
const BESTELL_URL = LOKAL ? `${BASE}/mittagstisch-bestellen.html` : `${BASE}/mittagstisch-bestellen`;

// Montag, 08.09.2026 – 10:45 Uhr Ortszeit.
const MONTAG_1045 = new Date('2026-09-08T10:45:00+02:00');

const WOCHENPLAN = {
  success: true,
  data: [1, 2, 3, 4, 5].map((i) => ({
    dl_wochenplanid: 'w' + i,
    dl_wochentag: 100999 + i,
    dl_gericht: 'Testgericht ' + i,
    dl_preis: 8.5,
    dl_datum: '2026-09-0' + (7 + i) + 'T00:00:00Z',
    dl_beschreibung: '',
    dl_allergene: '',
  })),
};

/**
 * @param {import('@playwright/test').Page} page
 * @param {{schluss: string, verzoegerung?: number}} opt
 */
async function mockApi(page, opt) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const json = (o) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
    if (url.includes('/api/cms-config')) {
      if (opt.verzoegerung) await new Promise((r) => setTimeout(r, opt.verzoegerung));
      return json({
        success: true,
        data: {
          bestellschluss_uhr: opt.schluss,
          feature_flags: { mittagstisch: true, tagesinfo_home: false },
        },
      });
    }
    if (url.includes('/api/wochenplan')) return json(WOCHENPLAN);
    if (url.includes('/api/tagespost')) return json({ success: false });
    return json({ success: true, data: [] });
  });
}

/** Liest, ob der Wochenplan fuer HEUTE einen Bestellknopf zeigt. */
async function heuteBestellbar(page) {
  return page.evaluate(() => {
    const c = document.getElementById('mob-wp-days');
    const heute = c ? c.querySelector('.today') : null;
    if (!heute) return null;
    return /mittagstisch-bestellen/.test(heute.innerHTML);
  });
}

test.describe('Mittagstisch-Bestellschluss aus dem CMS', () => {
  test.use({ serviceWorkers: 'block' });

  test('TC-F17-01 Bestellschluss 11:00 gilt auch bei langsamer Konfiguration', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile Ansicht (js/mobile.js)');
    await page.clock.install({ time: MONTAG_1045 });
    // 2,5 s Verzoegerung: die Konfiguration verliert den Wettlauf sicher.
    await mockApi(page, { schluss: '11:00', verzoegerung: 2500 });
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    expect(await page.evaluate(() => window._dlBestellschluss)).toBe(11);
    expect(await heuteBestellbar(page)).toBe(true);
  });

  test('TC-F17-02 Bestellschluss 11:00 gilt auch ohne Verzoegerung', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile Ansicht (js/mobile.js)');
    await page.clock.install({ time: MONTAG_1045 });
    await mockApi(page, { schluss: '11:00' });
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    expect(await heuteBestellbar(page)).toBe(true);
  });

  test('TC-F17-03 Frueherer Bestellschluss sperrt heute weiterhin', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile Ansicht (js/mobile.js)');
    await page.clock.install({ time: MONTAG_1045 });
    // Gegenprobe: 10:00 liegt vor 10:45 -> heute darf NICHT bestellbar sein.
    await mockApi(page, { schluss: '10:00', verzoegerung: 2500 });
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    expect(await page.evaluate(() => window._dlBestellschluss)).toBe(10);
    expect(await heuteBestellbar(page)).toBe(false);
  });

  test('TC-F17-04 Bestellseite markiert heute nicht faelschlich als geschlossen', async ({ page }) => {
    await page.clock.install({ time: MONTAG_1045 });
    await mockApi(page, { schluss: '11:00', verzoegerung: 2500 });
    await page.goto(BESTELL_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    const liste = page.locator('#menu-list');
    await expect(liste).toBeVisible();
    await expect(liste).not.toContainText('Bestellschluss erreicht');
  });
});
