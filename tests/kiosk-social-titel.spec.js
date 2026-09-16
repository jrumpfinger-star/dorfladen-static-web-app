/**
 * Social – Schritt 1 „Titel & Text" aufklappbar
 *
 * Deckt specs/social-titel-klappbar/spec.md ab (TC-S01 … TC-S08).
 *
 * Aus dem Laden: „Da man hauptsächlich mit dem Default arbeitet, wird
 * selten etwas geändert. So spart man Platz für das Produktive."
 *
 * Ausführen (lokaler Server aus static-site/ auf 8811):
 *   $env:TEST_URL='http://127.0.0.1:8811'
 *   node node_modules\@playwright\test\cli.js test tests/kiosk-social-titel.spec.js
 */

const { test, expect } = require('@playwright/test');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://www.dorfladen-oberornau.de';
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

const SCHRITT = '#soc-step-1';
const KOPF = '#soc-step-1 .k-order-hdr';
const KURZ = '#soc-step1-kurz';

async function socialOeffnen(page) {
  await page.route('**/api/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' }));
  await page.goto(KIOSK_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const t = document.querySelector('.k-tab[data-tab="social"]');
    if (t) t.click();
  });
  await page.waitForSelector(SCHRITT, { state: 'attached', timeout: 15000 });
  await page.waitForTimeout(1200);
}

/** Der Kopf reagiert auf onclick – auch wenn Playwright ihn als
 *  „nicht sichtbar" einstuft, weil er im Rasterfluss sitzt. */
async function kopfKlicken(page) {
  await page.evaluate(() => {
    const h = document.querySelector('#soc-step-1 .k-order-hdr');
    if (h) h.click();
  });
  await page.waitForTimeout(400);
}

function lage(page) {
  return page.evaluate(() => {
    const s = document.getElementById('soc-step-1');
    const body = s && s.querySelector('.k-order-body');
    const k = document.getElementById('soc-step1-kurz');
    const hdr = s && s.querySelector('.k-order-hdr');
    return {
      zu: s ? s.classList.contains('oc-collapsed') : null,
      bodyOffen: body ? getComputedStyle(body).display !== 'none' : null,
      kurzText: k ? k.textContent.trim() : null,
      kurzSichtbar: k ? getComputedStyle(k).display !== 'none' : null,
      kopfHoehe: hdr ? Math.round(hdr.getBoundingClientRect().height) : null,
      kurzUeberlauf: k ? k.scrollWidth > k.clientWidth + 1 : null,
      breite: window.innerWidth,
    };
  });
}

test.describe('Social – Titel & Text klappbar', () => {
  test('TC-S01/S02: startet zugeklappt und zeigt den Titel im Kopf', async ({ page }) => {
    await socialOeffnen(page);
    const l = await lage(page);

    expect(l.zu).toBe(true);
    expect(l.bodyOffen).toBe(false);
    expect(l.kurzSichtbar).toBe(true);
    expect(l.kurzText).not.toBe('');
    expect(l.kurzText).not.toBe('Noch kein Titel gewählt');
  });

  test('TC-S03/S04: Klick klappt auf und wieder zu', async ({ page }) => {
    await socialOeffnen(page);

    await kopfKlicken(page);
    const auf = await lage(page);
    expect(auf.zu).toBe(false);
    expect(auf.bodyOffen).toBe(true);
    // F4: aufgeklappt braucht es die Kurzfassung nicht.
    expect(auf.kurzSichtbar).toBe(false);

    await kopfKlicken(page);
    const zu = await lage(page);
    expect(zu.zu).toBe(true);
    expect(zu.bodyOffen).toBe(false);
    expect(zu.kurzSichtbar).toBe(true);
  });

  test('TC-S05: ein anderer Titel erscheint im Kopf', async ({ page }) => {
    await socialOeffnen(page);
    const vorher = (await lage(page)).kurzText;

    await kopfKlicken(page);
    const gewaehlt = await page.evaluate(() => {
      const sel = document.getElementById('soc-post-titel-sel');
      if (!sel || sel.options.length < 2) return null;
      sel.selectedIndex = 1;
      sel.dispatchEvent(new Event('change'));
      return sel.value;
    });
    test.skip(!gewaehlt, 'Keine zweite Titelvorlage vorhanden');
    await kopfKlicken(page);

    const nachher = (await lage(page)).kurzText;
    expect(nachher).toContain(gewaehlt);
    expect(nachher).not.toBe(vorher);
  });

  test('TC-S06: ein Freitext wird im Kopf angedeutet', async ({ page }) => {
    await socialOeffnen(page);
    await kopfKlicken(page);

    await page.evaluate(() => {
      const t = document.getElementById('soc-post-text');
      if (t) { t.value = 'Frisch aus der Küche'; t.dispatchEvent(new Event('input')); }
    });
    await kopfKlicken(page);

    expect((await lage(page)).kurzText).toContain('mit Freitext');
  });

  test('TC-S08: ein sehr langer Titel sprengt den Kopf nicht', async ({ page }) => {
    await socialOeffnen(page);
    const vorher = (await lage(page)).kopfHoehe;

    await page.evaluate(() => {
      const k = document.getElementById('soc-step1-kurz');
      if (k) k.textContent = 'Ein außerordentlich langer Titel, der niemals '
        + 'in eine Kopfzeile passen würde und deshalb gekürzt gehört – '
        + 'sonst bricht die ganze Zeile um und der Platzgewinn ist dahin.';
    });
    await page.waitForTimeout(300);
    const nachher = await lage(page);

    expect(nachher.kopfHoehe).toBe(vorher);      // keine zweite Zeile
    expect(nachher.kurzUeberlauf).toBe(true);    // also wirklich gekürzt
  });
});

test.describe('Social – auch auf breitem Schirm klappbar', () => {
  /* Auf Desktop-Breite erzwang eine Regel, dass alle Schritte offen sind
     und die Pfeile verborgen bleiben. Fuer Schritt 1 gilt eine Ausnahme.
     Die Fenstergroesse laesst sich im Projektaufbau nicht nachtraeglich
     aendern – deshalb ein eigener Kontext. (TC-S07) */
  test('TC-S07: bei 1280 px ebenfalls zugeklappt und klappbar',
    async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      try {
        await socialOeffnen(page);
        const start = await lage(page);
        expect(start.breite).toBe(1280);
        expect(start.zu).toBe(true);
        expect(start.bodyOffen).toBe(false);

        await kopfKlicken(page);
        const auf = await lage(page);
        expect(auf.zu).toBe(false);
        expect(auf.bodyOffen).toBe(true);
      } finally { await ctx.close(); }
    });
});
