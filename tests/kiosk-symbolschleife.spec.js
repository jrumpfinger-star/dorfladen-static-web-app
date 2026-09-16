/**
 * Kiosk – die Symbolschleife, die Klicks verschluckt hat
 *
 * Deckt specs/kiosk-symbolschleife/spec.md ab (TC-S01 … TC-S05).
 *
 * lucide.createIcons() setzte data-lucide auch auf das erzeugte <svg>
 * und baute beim nächsten Lauf seine eigenen Ergebnisse neu auf. Mit
 * dem Beobachter in inhalteBeobachten() ergab das eine Endlosschleife
 * im Takt von requestAnimationFrame – gemessen 8253 Austausche in 70
 * Sekunden. Klicks gingen dabei verloren, weil mousedown und mouseup
 * auf demselben Element landen müssen.
 *
 * Ausführen (lokaler Server aus static-site/ auf 8811):
 *   $env:TEST_URL='http://127.0.0.1:8811'
 *   node node_modules\@playwright\test\cli.js test tests/kiosk-symbolschleife.spec.js
 */

const { test, expect } = require('@playwright/test');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://www.dorfladen-oberornau.de';
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

const CMS = 'a.k-hbtn[href="/cms.html"]';

async function ruhigeApi(page) {
  await page.route('**/api/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
}

/** Zählt Kindknoten-Änderungen in der Kopfzeile ab dem Seitenstart. */
async function zaehlerSetzen(page) {
  await page.addInitScript(() => {
    window.__ersetzt = 0;
    const start = () => {
      const kopf = document.querySelector('.k-header-acts');
      if (!kopf) { setTimeout(start, 100); return; }
      new MutationObserver((m) => { window.__ersetzt += m.length; })
        .observe(kopf, { childList: true, subtree: true });
    };
    start();
  });
}

async function kioskOeffnen(page) {
  await ruhigeApi(page);
  await page.goto(KIOSK_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(CMS, { state: 'attached', timeout: 20000 });
  await page.waitForTimeout(1500);
}

test.describe('Kiosk – Symbole werden nicht endlos neu gebaut', () => {
  test('TC-S01: im Ruhezustand bleibt die Kopfzeile stehen', async ({ page }) => {
    test.setTimeout(90000);
    await zaehlerSetzen(page);
    await kioskOeffnen(page);

    await page.evaluate(() => { window.__ersetzt = 0; });
    await page.waitForTimeout(20000);
    const ersetzt = await page.evaluate(() => window.__ersetzt);

    // Vor der Reparatur waren es hier rund 2400.
    expect(ersetzt).toBeLessThan(100);
  });

  test('TC-S02: Klicks mit menschlicher Haltezeit kommen an', async ({ page }) => {
    test.setTimeout(90000);
    await kioskOeffnen(page);

    await page.evaluate(() => {
      window.__klicks = 0;
      window.addEventListener('click', (e) => {
        if (e.target.closest && e.target.closest('a[href="/cms.html"]')) {
          window.__klicks++;
          e.preventDefault();       // nicht wirklich navigieren
        }
      }, true);
    });

    const knopf = page.locator(CMS);
    if (!(await knopf.isVisible())) {
      const mehr = page.locator('.k-head-mehr').first();
      if (await mehr.count()) { await mehr.click(); await page.waitForTimeout(400); }
    }
    const k = await knopf.boundingBox();
    expect(k).not.toBeNull();

    for (let i = 0; i < 10; i++) {
      await page.mouse.move(k.x + k.width / 2, k.y + k.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(120);      // so lange hält ein Mensch
      await page.mouse.up();
      await page.waitForTimeout(150);
    }

    const klicks = await page.evaluate(() => window.__klicks);
    // Vor der Reparatur kamen hier 0 von 10 an.
    expect(klicks).toBe(10);
  });

  test('TC-S03: nach dem Laden bleibt nichts unbearbeitet', async ({ page }) => {
    await kioskOeffnen(page);
    const offen = await page.evaluate(() =>
      document.querySelectorAll(':not(svg)[data-lucide]').length);
    expect(offen).toBe(0);
  });

  test('TC-S04: neue Symbole werden gezeichnet, bestehende bleiben stehen', async ({ page }) => {
    await kioskOeffnen(page);

    const ergebnis = await page.evaluate(async () => {
      const kopfVorher = [...document.querySelectorAll('.k-header-acts svg')];

      // So schreiben die Module neues HTML in die Reiter.
      const kasten = document.createElement('div');
      kasten.id = 'dl-probe';
      kasten.innerHTML = '<i data-lucide="star"></i><i data-lucide="heart"></i>';
      (document.querySelector('.k-main') || document.body).appendChild(kasten);

      if (window.lucide) window.lucide.createIcons();
      await new Promise((r) => setTimeout(r, 300));

      const kopfNachher = [...document.querySelectorAll('.k-header-acts svg')];
      return {
        neueGezeichnet: document.querySelectorAll('#dl-probe svg').length,
        nochOffen: document.querySelectorAll(':not(svg)[data-lucide]').length,
        kopfUnberuehrt: kopfVorher.length === kopfNachher.length
          && kopfVorher.every((el, i) => el === kopfNachher[i]),
      };
    });

    expect(ergebnis.neueGezeichnet).toBe(2);        // das Neue wird gezeichnet
    expect(ergebnis.nochOffen).toBe(0);
    expect(ergebnis.kopfUnberuehrt).toBe(true);     // und der Kopf bleibt stehen
  });

  test('TC-S05: zweimal createIcons() tauscht nichts aus', async ({ page }) => {
    await kioskOeffnen(page);

    const gleich = await page.evaluate(() => {
      const vorher = [...document.querySelectorAll('.k-header-acts svg')];
      if (!window.lucide || !vorher.length) return null;
      window.lucide.createIcons();
      window.lucide.createIcons();
      const nachher = [...document.querySelectorAll('.k-header-acts svg')];
      if (vorher.length !== nachher.length) return false;
      return vorher.every((el, i) => el === nachher[i]);
    });

    expect(gleich).toBe(true);
  });
});
