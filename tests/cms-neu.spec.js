/**
 * CMS im Kiosk-Design (Playwright E2E)
 *
 * Deckt die Test Cases aus specs/cms-redesign/spec.md ab:
 *   F3  Navigation fÃ¼r 15 Bereiche
 *   F6  Bedienbarkeit und Erscheinungsbild
 *
 * Die Seite verlangt ein Kennwort. Es wird **nicht** hinterlegt: Der
 * Vergleichswert steht offen im Markup (`#cms-pw-hash`) und wird von dort
 * Ã¼bernommen. Die eigentliche Absicherung liegt ohnehin serverseitig im
 * `admin_auth_guard` der API â€” das Gatter hier hÃ¤lt nur die OberflÃ¤che zu.
 *
 * AusfÃ¼hren:
 *   npx playwright test tests/cms-neu.spec.js
 */

const { test, expect } = require('@playwright/test');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'http://localhost:8789';
// GeprÃ¼ft wird die Seite, mit der gearbeitet wird. Die Vorschau
// `cms-neu.html` entsteht aus derselben Quelle und unterscheidet sich nur
// durch den Entwurfshinweis.
const URL = `${BASE}/cms.html`;
const VORSCHAU_URL = `${BASE}/cms-neu.html`;

const BEREICHE = ['wp', 'hours', 'ang', 'sort', 'hp', 'news', 'gallery', 'cfg',
  'orders', 'metzger', 'stats', 'social', 'push', 'settings', 'help'];

async function oeffne(page, adresse) {
  await page.goto(adresse || URL, { waitUntil: 'domcontentloaded' });
  const hash = await page.evaluate(() => {
    const el = document.getElementById('cms-pw-hash');
    return el ? JSON.parse(el.textContent) : null;
  });
  if (!hash) test.skip(true, 'Diese Seite ist hier nicht ausgeliefert');
  await page.evaluate((v) => sessionStorage.setItem('cms_auth_ok', v), hash);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#cms-app').waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(2500);
}

/** Bereich Ã¶ffnen und warten, bis er wirklich steht.
 *
 *  Eine feste kurze Wartezeit reichte nicht: Laufen die drei GerÃ¤teprojekte
 *  gleichzeitig gegen die Live-Daten, braucht ein Bereich manchmal lÃ¤nger,
 *  und die Messung traf einen halb aufgebauten Zustand. */
async function zeigeBereich(page, id) {
  await page.evaluate((t) => window.cmsTab(t), id);
  await page.locator('#cms-panel-' + id).waitFor({ state: 'visible', timeout: 15000 })
    .catch(() => { /* Hilfe Ã¶ffnet auf dem Telefon ein eigenes Fenster */ });
  await page.waitForTimeout(500);
}

test.describe('CMS im Kiosk-Design', () => {

  test('TC-F3-01: Alle 15 Bereiche stehen in der Navigation', async ({ page }) => {
    await oeffne(page);
    await expect(page.locator('.cmsneu-nav .cms-tab')).toHaveCount(15);
    const ids = await page.locator('.cmsneu-nav .cms-tab')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-id')));
    for (const id of BEREICHE) expect(ids).toContain(id);
    // FÃ¼nf Gruppen mit Ãœberschrift und Farbpunkt.
    await expect(page.locator('.cmsneu-gruppe')).toHaveCount(5);
  });

  test('TC-F3-02: Umschalten zeigt genau einen Bereich', async ({ page }) => {
    await oeffne(page);
    for (const id of ['wp', 'ang', 'orders', 'settings']) {
      await page.evaluate((t) => window.cmsTab(t), id);
      await page.waitForTimeout(250);
      const sichtbar = await page.evaluate((ids) => ids.filter((t) => {
        const p = document.getElementById('cms-panel-' + t);
        return p && getComputedStyle(p).display !== 'none';
      }), BEREICHE);
      expect(sichtbar).toEqual([id]);
    }
  });

  test('TC-F3-02b: Der aktive Bereich ist in der Navigation erkennbar', async ({ page }) => {
    await oeffne(page);
    await page.evaluate(() => window.cmsTab('ang'));
    await page.waitForTimeout(250);
    // cmsTab() setzt className neu - die Gestaltung darf davon nicht abhÃ¤ngen.
    await expect(page.locator('.cmsneu-nav .cms-tab.active')).toHaveCount(1);
    await expect(page.locator('.cmsneu-nav .cms-tab.active'))
      .toHaveAttribute('data-id', 'ang');
    const farbe = await page.locator('.cmsneu-nav .cms-tab.active')
      .evaluate((e) => getComputedStyle(e).backgroundColor);
    expect(farbe).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('TC-F3-04/F6-02: Kein Ãœberlauf in keinem der 15 Bereiche', async ({ page }) => {
    await oeffne(page);
    const befunde = [];
    for (const id of BEREICHE) {
      await zeigeBereich(page, id);
      const m = await page.evaluate((bereich) => {
        const de = document.documentElement;
        const inhalt = document.getElementById('cmsneu-inhalt');
        const grenze = inhalt.getBoundingClientRect().right;
        const imRoller = (el) => {
          let p = el.parentElement;
          while (p && p !== inhalt) {
            const ox = getComputedStyle(p).overflowX;
            if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true;
            p = p.parentElement;
          }
          return false;
        };
        const raus = [...document.querySelectorAll('#cms-panel-' + bereich + ' *')]
          .filter((e) => {
            const r = e.getBoundingClientRect();
            return r.width && r.right > grenze + 2 && !imRoller(e);
          }).length;
        return { bereich, quer: de.scrollWidth > de.clientWidth + 1, raus };
      }, id);
      if (m.quer || m.raus) befunde.push(m);
    }
    expect(befunde).toEqual([]);
  });

  test('TC-F6-01: Bedienelemente sind mindestens 44 px hoch', async ({ page }) => {
    await oeffne(page);
    const befunde = [];
    for (const id of BEREICHE) {
      await zeigeBereich(page, id);
      const klein = await page.evaluate((bereich) => {
        return [...document.querySelectorAll('#cms-panel-' + bereich + ' button')]
          .map((e) => ({
            t: (e.textContent || '').trim().slice(0, 20),
            h: Math.round(e.getBoundingClientRect().height),
          }))
          .filter((x) => x.h && x.h < 43);
      }, id);
      if (klein.length) befunde.push({ bereich: id, klein });
    }
    expect(befunde).toEqual([]);
  });

  test('TC-F6-05: Nichts ist fetter als halbfett', async ({ page }) => {
    await oeffne(page);
    const fett = await page.evaluate(() => {
      return [...document.querySelectorAll('#cms-app *')]
        .filter((e) => {
          const g = parseInt(getComputedStyle(e).fontWeight, 10);
          return g > 600 && (e.textContent || '').trim();
        })
        .map((e) => e.tagName + '.' + String(e.className || '').slice(0, 20))
        .slice(0, 8);
    });
    expect(fett).toEqual([]);
  });

  test('TC-F1-02: Die Werte kommen aus dem gemeinsamen Schema', async ({ page }) => {
    await oeffne(page);
    const w = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return {
        gr: s.getPropertyValue('--gr').trim(),
        ink: s.getPropertyValue('--ink').trim(),
        tap: s.getPropertyValue('--tap-min').trim(),
        // Die alten Seitenvariablen zeigen auf das Schema und lÃ¶sen sich
        // deshalb zum selben Wert auf.
        alt: s.getPropertyValue('--c-m-muted').trim(),
        mut: s.getPropertyValue('--mut').trim(),
      };
    });
    expect(w.gr).toBe('#2e7d4f');
    expect(w.ink).toBe('#132a1e');
    expect(w.tap).toBe('44px');
    expect(w.alt).toBe(w.mut);
  });

  test('TC-F5-02: Die Vorschau warnt vor echten Daten', async ({ page }) => {
    await oeffne(page, VORSCHAU_URL);
    await expect(page.locator('.cmsneu-hinweis')).toContainText('wirkt auf echte Daten');
  });

  test('TC-F7-02: Die gewohnte Fassung bleibt erreichbar', async ({ page }) => {
    // RÃ¼ckfallweg nach dem Umschalten: cms-klassisch.html ist die gepflegte
    // Quelle und muss vollstÃ¤ndig bedienbar bleiben.
    const antwort = await page.goto(`${BASE}/cms-klassisch.html`,
      { waitUntil: 'domcontentloaded' });
    expect(antwort.status()).toBe(200);
    await expect(page.locator('#cms-login')).toBeAttached();
    await expect(page.locator('#cms-app')).toBeAttached();
    // Sie trÃ¤gt die alte Reiterleiste, nicht die neue Navigation.
    await expect(page.locator('.cmsneu-nav')).toHaveCount(0);
    await expect(page.locator('.cms-tab')).toHaveCount(15);
  });
});
