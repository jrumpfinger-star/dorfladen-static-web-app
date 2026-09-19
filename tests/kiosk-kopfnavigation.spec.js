/**
 * Kiosk – Kopfnavigation, die sich selbst heilt
 *
 * Deckt specs/kiosk-kopfnavigation/spec.md ab (TC-K01 … TC-K10).
 *
 * Gemeldet war: Die Symbole oben rechts öffnen ihre Seite „anfangs,
 * später aber dann nicht mehr". Gemessen ist, dass der Klick gesund
 * ankommt — es stirbt die Navigation danach, lautlos.
 *
 * Der Fehlerfall lässt sich sauber nachstellen: Der Schutz hängt am
 * `document` (Bubble-Phase), ein `preventDefault` am `window` läuft
 * dort DANACH. Der Schutz sieht also einen gesunden Klick, die
 * Navigation unterbleibt trotzdem — genau das gemeldete Bild.
 *
 * Ausführen (lokaler Server aus static-site/ auf 8811):
 *   $env:TEST_URL='http://127.0.0.1:8811'
 *   node node_modules\@playwright\test\cli.js test tests/kiosk-kopfnavigation.spec.js
 */

const fs = require('fs');
const path = require('path');
const { test, expect } = require('./_kiosk-angemeldet');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

const CMS = 'a.k-hbtn[href="/cms.html"]';
const WEB = 'a.k-hbtn[href="/index.html"]';

/** Hält die API still – geprüft wird hier nur die Kopfzeile. */
async function ruhigeApi(page) {
  await page.route('**/api/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
}

/**
 * Verschluckt die Navigation für passende Links – am `window`, also
 * NACH dem Schutz. Das ist der gemeldete Fehler in Reinform.
 */
async function navigationVerschlucken(page, treffer) {
  await page.addInitScript((sel) => {
    window.addEventListener('click', (e) => {
      const a = e.target && e.target.closest && e.target.closest(sel);
      if (a) e.preventDefault();
    }, false);
  }, treffer);
}

async function kioskOeffnen(page) {
  await ruhigeApi(page);
  await page.goto(KIOSK_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(CMS, { state: 'attached', timeout: 20000 });
  // Der Schutz wird erst in start() gesetzt.
  await page.waitForTimeout(600);
  await kopfLinksZeigen(page);
}

/**
 * Unter 560 px stehen „Zur Website" und „Zum CMS" hinter dem
 * „Mehr"-Knopf. Dort erst aufklappen.
 */
async function kopfLinksZeigen(page) {
  if (await page.locator(CMS).isVisible()) return;
  const mehr = page.locator('.k-head-mehr');
  if (await mehr.count()) {
    await mehr.first().click();
    await page.waitForSelector(CMS, { state: 'visible', timeout: 5000 });
  }
}

/** Legt einen Probe-Link in die Kopfzeile. */
async function probeLink(page, href, ziel) {
  await page.evaluate(({ href, ziel }) => {
    const a = document.createElement('a');
    a.className = 'k-hbtn k-head-extra dl-probe';
    a.href = href;
    if (ziel) a.target = ziel;
    a.textContent = 'P';
    a.style.cssText = 'position:fixed;left:4px;bottom:4px;z-index:99999;padding:8px';
    document.body.appendChild(a);
  }, { href, ziel });
  return page.locator('a.dl-probe');
}

test.describe('Kiosk – Kopfnavigation', () => {
  test('TC-K01: Klick auf „Zum CMS" öffnet die Seite', async ({ page }) => {
    await kioskOeffnen(page);
    await page.click(CMS);
    await page.waitForURL(/\/cms\.html/, { timeout: 15000 });
    expect(page.url()).toContain('/cms.html');
  });

  test('TC-K02: Klick auf „Zur Website" öffnet die Seite', async ({ page }) => {
    await kioskOeffnen(page);
    await page.click(WEB);
    await page.waitForURL(/\/index\.html/, { timeout: 15000 });
    expect(page.url()).toContain('/index.html');
  });

  test('TC-K03: verschluckte Navigation wird nachgeholt', async ({ page }) => {
    await navigationVerschlucken(page, 'a.k-hbtn[href="/cms.html"]');
    await kioskOeffnen(page);

    // Der Klick kommt an, die Navigation unterbleibt – ohne Schutz
    // bliebe die Seite hier für immer stehen.
    await page.click(CMS);
    await page.waitForURL(/\/cms\.html/, { timeout: 15000 });
    expect(page.url()).toContain('/cms.html');
  });

  test('TC-K04: normaler Klick erzeugt genau einen Seitenaufruf', async ({ page }) => {
    await kioskOeffnen(page);

    let aufrufe = 0;
    page.on('request', (r) => {
      if (r.resourceType() === 'document' && /\/cms\.html/.test(r.url())) aufrufe += 1;
    });

    await page.click(CMS);
    await page.waitForURL(/\/cms\.html/, { timeout: 15000 });
    // Deutlich länger als die Frist des Schutzes warten.
    await page.waitForTimeout(1500);
    expect(aufrufe).toBe(1);
  });

  test('TC-K05: Strg-Klick navigiert das Fenster nicht', async ({ page }) => {
    await kioskOeffnen(page);
    const vorher = page.url();
    await page.click(CMS, { modifiers: ['Control'] });
    await page.waitForTimeout(1800);
    expect(page.url()).toBe(vorher);
  });

  test('TC-K06: Link mit target="_blank" bleibt unberührt', async ({ page }) => {
    await navigationVerschlucken(page, 'a.dl-probe');
    await kioskOeffnen(page);
    const link = await probeLink(page, '/index.html', '_blank');

    const vorher = page.url();
    await link.click();
    await page.waitForTimeout(1800);
    expect(page.url()).toBe(vorher);
  });

  test('TC-K07: fremde Herkunft bleibt unberührt', async ({ page }) => {
    await navigationVerschlucken(page, 'a.dl-probe');
    await kioskOeffnen(page);
    const link = await probeLink(page, 'https://example.com/irgendwo', '');

    const vorher = page.url();
    await link.click();
    await page.waitForTimeout(1800);
    expect(page.url()).toBe(vorher);
  });

  test('TC-K08: ausdrückliches preventDefault wird respektiert', async ({ page }) => {
    // Capture-Phase am document: läuft VOR dem Schutz.
    await page.addInitScript(() => {
      document.addEventListener('click', (e) => {
        const a = e.target && e.target.closest && e.target.closest('a.k-hbtn[href="/cms.html"]');
        if (a) e.preventDefault();
      }, true);
    });
    await kioskOeffnen(page);

    const vorher = page.url();
    await page.click(CMS);
    await page.waitForTimeout(1800);
    expect(page.url()).toBe(vorher);
  });

  test('TC-K11: „Mehr"-Menü sammelt keine Klick-Horcher an', async ({ page }) => {
    // Klick-Horcher am document exakt mitzählen.
    await page.addInitScript(() => {
      const menge = new Set();
      const add = document.addEventListener.bind(document);
      const weg = document.removeEventListener.bind(document);
      document.addEventListener = function (typ, fn, opt) {
        if (typ === 'click') menge.add(fn);
        return add(typ, fn, opt);
      };
      document.removeEventListener = function (typ, fn, opt) {
        if (typ === 'click') menge.delete(fn);
        return weg(typ, fn, opt);
      };
      window.__horcher = () => menge.size;
    });

    await ruhigeApi(page);
    await page.goto(KIOSK_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(CMS, { state: 'attached', timeout: 20000 });
    await page.waitForTimeout(600);

    const mehr = page.locator('.k-head-mehr');
    test.skip(!(await mehr.count()), 'Kein „Mehr"-Knopf in diesem Aufbau');

    /* Oberhalb 560 px ist der Knopf ausgeblendet — geprüft wird die
       Funktion dahinter, also wird sie direkt gerufen. */
    const umschalten = async () => {
      await page.evaluate(() => window.K && window.K.kopfMenue && window.K.kopfMenue());
      await page.waitForTimeout(120);
    };

    // Einmal auf und zu, damit der Anfangsstand stimmt.
    await umschalten(); await umschalten();
    const anfang = await page.evaluate(() => window.__horcher());

    for (let i = 0; i < 8; i++) { await umschalten(); await umschalten(); }
    const ende = await page.evaluate(() => window.__horcher());

    // Vor der Reparatur wuchs der Stand hier um acht.
    expect(ende).toBeLessThanOrEqual(anfang);
  });

  test('TC-K12: langsame Antwort wird nicht abgebrochen', async ({ page }) => {
    /* Der erste Entwurf holte die Navigation per Zeitgeber nach. Bei
       zwei Sekunden Antwortzeit brach er die laufende Navigation ab
       (ERR_ABORTED) und startete sie neu — auf dem Tablet über
       Mobilfunk bei jedem Klick. Dieser Wächter hält das fest. */
    const ereignisse = [];
    page.on('request', (r) => {
      if (r.resourceType() === 'document' && /cms\.html/.test(r.url())) ereignisse.push('anfrage');
    });
    page.on('requestfailed', (r) => {
      if (/cms\.html/.test(r.url())) ereignisse.push('abbruch');
    });

    await ruhigeApi(page);
    await page.route('**/cms.html', async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.continue();
    });
    await page.goto(KIOSK_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(CMS, { state: 'attached', timeout: 20000 });
    await page.waitForTimeout(600);
    await kopfLinksZeigen(page);

    await page.click(CMS);
    await page.waitForURL(/\/cms\.html/, { timeout: 25000 });
    await page.waitForTimeout(1500);

    expect(ereignisse.filter((e) => e === 'abbruch')).toEqual([]);
    expect(ereignisse.filter((e) => e === 'anfrage').length).toBe(1);
  });
});

test.describe('Service Worker – Navigationen sterben nicht lautlos', () => {
  const swQuelle = fs.readFileSync(
    path.join(__dirname, '..', 'static-site', 'sw.js'), 'utf8');

  test('TC-K09: kein „return undefined" im Navigationszweig', () => {
    expect(swQuelle).not.toMatch(/return\s+undefined\s*;/);
    // Ohne Netz und ohne Vorrat kommt eine echte Antwort.
    expect(swQuelle).toMatch(/new Response\(/);
  });

  test('TC-K10: weitergeleitete Antworten werden bei Navigationen nachgebaut', () => {
    expect(swQuelle).toMatch(/response\.redirected/);
    /* Beim Nachbau duerfen die Kodierungsheader NICHT mitkommen: blob()
       liefert den bereits entpackten Rumpf. */
    expect(swQuelle).not.toMatch(/headers\s*:\s*response\.headers/);
    expect(swQuelle).toMatch(/Content-Type/);
    // Nur Brauchbares wird abgelegt, und ein Fehlschlag bleibt folgenlos.
    expect(swQuelle).toMatch(/response\.ok/);
    expect(swQuelle).toMatch(/cache\.put\(e\.request,clone\);?\s*\n?\s*\}\)\.catch\(/);
  });
});
