// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Mittagstisch-Kachel auf der Startseite — lesbar und kompakt.
 *
 * Spec: specs/mittagstisch-kachel/spec.md (TC-K01 … TC-K06)
 *
 * Aus dem Laden: „Die Anzeige des bestellten Mittagstisches auf dem Handy
 * ist zu klobig und die Texte werden abgeschnitten."
 *
 * Gemessen wurde der Ausgangszustand bei 320/360/390/414 px: Die Kachel
 * war 164–219 px hoch, und sowohl das Datum („Freitag, 18. September
 * 2026") als auch das Gericht liefen aus ihrer Box heraus. Grund war ein
 * zweites Symbol (40 px) und ein Augen-Knopf (32 px) in einer Karte, die
 * selbst nur 198 px breit ist — zusammen rund 92 px allein für Zierrat.
 *
 * Ausführen (lokaler Server aus static-site/ auf 8811):
 *   $env:TEST_URL='http://127.0.0.1:8811'
 *   npx playwright test tests/mittagstisch-kachel.spec.js --project=mobile
 */

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://www.dorfladen-oberornau.de';
const GERAET = 'test-geraet-kachel';

function heute() {
  const d = new Date();
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)
    + '-' + ('0' + d.getDate()).slice(-2);
}

/* Bewusst ein langes Gericht: Kurze Namen hätten den Fehler nie gezeigt.
   Genau dieser Fall wurde aus dem Laden gemeldet. */
const LANG = 'Fischfilet mit Dillsauce und Petersilienkartoffeln';

const EINE = {
  id: 'k-1',
  bestellnummer: 'MT-TEST-7001',
  name: 'Testkunde',
  gericht: LANG,
  menge: 1,
  preis: 8.8,
  datum: heute(),
  status: 3,
  mitnehmen: true,
  device_id: GERAET,
  personal_antwort: 'Liegt bereit.',
};

const ZWEITE = {
  id: 'k-2',
  bestellnummer: 'MT-TEST-7002',
  name: 'Testkunde',
  gericht: 'Rahmschwammerl mit Semmelknödel und Salat',
  menge: 2,
  preis: 9.4,
  datum: heute(),
  status: 1,
  mitnehmen: false,
  device_id: GERAET,
  personal_antwort: '',
};

async function startseite(page, orders) {
  await page.addInitScript((g) => {
    try {
      localStorage.setItem('dl_push_device_id', g);
      localStorage.removeItem('bs_email');
    } catch (e) { /* Speicher gesperrt */ }
  }, GERAET);

  await page.route('**/api/lunch-order**', (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, orders, count: orders.length }),
    }));

  await page.route('**/api/**', (route) => {
    if (/lunch-order/.test(route.request().url())) return route.fallback();
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [], orders: [], posts: [], threads: [] }),
    });
  });

  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.locator('#mob-my-orders').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(400);
}

/**
 * Misst die Kachel: Maße und alle Textknoten, die aus ihrer Box laufen.
 *
 * `scrollWidth > clientWidth` ist der verlässliche Nachweis für
 * abgeschnittenen Text — auf die Auslassungspunkte zu prüfen wäre
 * unzuverlässig, weil sie erst beim Zeichnen entstehen.
 */
async function messe(page, wahl) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const abgeschnitten = [];
    el.querySelectorAll('*').forEach((k) => {
      if (k.children.length === 0 && k.textContent.trim()
          && k.scrollWidth > k.clientWidth + 1) {
        abgeschnitten.push(k.textContent.trim().slice(0, 40));
      }
    });
    return {
      breite: Math.round(r.width),
      hoehe: Math.round(r.height),
      abgeschnitten,
      text: el.textContent.replace(/\s+/g, ' ').trim(),
    };
  }, wahl);
}

/* Die Fenstergröße lässt sich im Projektaufbau nicht nachträglich ändern
   („To resize minimized/maximized/fullscreen window…"). Jede Breite
   bekommt deshalb einen eigenen Kontext. */
async function beiBreite(browser, w, orders, was) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: 880 },
    isMobile: true, hasTouch: true, serviceWorkers: 'block',
  });
  const p = await ctx.newPage();
  try {
    await startseite(p, orders);
    return await was(p);
  } finally { await ctx.close(); }
}

const BREITEN = [320, 360, 390, 414];

test.describe('Mittagstisch-Kachel: lesbar und kompakt', () => {
  test('TC-K01: auf keiner Handybreite wird Text abgeschnitten',
    async ({ browser }) => {
      test.setTimeout(180000);
      for (const w of BREITEN) {
        const m = await beiBreite(browser, w, [EINE],
          (p) => messe(p, '#mob-my-orders'));
        expect(m, 'Breite ' + w + ': keine Kachel').not.toBeNull();
        expect(m.abgeschnitten,
          'Breite ' + w + ': abgeschnitten → ' + m.abgeschnitten.join(' | '))
          .toEqual([]);
      }
    });

  test('TC-K02: die Kachel bleibt kompakt', async ({ browser }) => {
    test.setTimeout(180000);
    for (const w of BREITEN) {
      const m = await beiBreite(browser, w, [EINE],
        (p) => messe(p, '#mob-my-orders'));
      /* Vorher waren es 219 px auf schmalen Geräten. 140 px lässt Luft
         für längere Gerichtsnamen, hält aber die Kachel klein. */
      expect(m.hoehe, 'Breite ' + w + ': Kachel zu hoch').toBeLessThanOrEqual(140);
    }
  });

  test('TC-K03: der volle Gerichtsname steht da', async ({ browser }) => {
    test.setTimeout(120000);
    const m = await beiBreite(browser, 360, [EINE],
      (p) => messe(p, '#mob-my-orders'));
    expect(m.text).toContain(LANG);
  });

  test('TC-K04: Datum kurz mit Wochentag, Menge und Mitnehmen dabei',
    async ({ browser }) => {
      test.setTimeout(120000);
      const m = await beiBreite(browser, 360, [EINE],
        (p) => messe(p, '#mob-my-orders'));
      // Kurzform wie „Fr., 18. Sep." – der Wochentag hilft im Alltag.
      expect(m.text).toMatch(/(Mo|Di|Mi|Do|Fr|Sa|So)\.,\s\d{1,2}\.\s\w{3}/);
      expect(m.text).toContain('1 Portion');
      expect(m.text).toContain('Mitnehmen');
      expect(m.text).toContain('Abgeholt');
    });

  test('TC-K05: auch die Liste mehrerer Bestellungen schneidet nichts ab',
    async ({ browser }) => {
      test.setTimeout(180000);
      for (const w of [320, 390]) {
        const m = await beiBreite(browser, w, [EINE, ZWEITE], async (p) => {
          await p.locator('#mob-my-orders div[onclick]').first().click();
          const blatt = p.locator('#popup-mob-my-orders .dl-pop-card');
          await blatt.waitFor({ state: 'visible', timeout: 8000 });
          await p.waitForTimeout(200);
          return messe(p, '#popup-mob-my-orders .dl-pop-card');
        });
        expect(m, 'Breite ' + w + ': keine Liste').not.toBeNull();
        expect(m.abgeschnitten,
          'Breite ' + w + ': abgeschnitten → ' + m.abgeschnitten.join(' | '))
          .toEqual([]);
        expect(m.text).toContain(LANG);
      }
    });

  test('TC-K06: die Kachel bleibt als Ganzes anklickbar',
    async ({ browser }) => {
      test.setTimeout(120000);
      /* Der Augen-Knopf ist entfallen — die Bedienbarkeit darf darunter
         nicht leiden, denn er war der sichtbare Hinweis aufs Antippen. */
      const ziel = await beiBreite(browser, 390, [EINE], (p) =>
        p.evaluate(() => new Promise((fertig) => {
          window.openMittagPopup = (url) => fertig(url);
          const k = document.querySelector('#mob-my-orders [role="button"]');
          if (k) k.click(); else fertig('kein Knopf');
          setTimeout(() => fertig('kein Aufruf'), 2000);
        })));
      expect(ziel).toContain('/bestellstatus');
      expect(ziel).toContain('MT-TEST-7001');
    });
});
