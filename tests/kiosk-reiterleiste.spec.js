/**
 * Reiterleiste auf dem Telefon — eine wischbare Zeile
 * Spec: specs/kiosk-umbau/spec.md, F1
 *
 * Deckt TC-F1-01 bis TC-F1-08 ab.
 *
 * Hintergrund: Acht Reiter brauchten bei 44 px Mindestbreite zusammen 374 px.
 * Auf einem 360-px-Telefon brach die Leiste deshalb auf zwei Zeilen um und
 * kostete 50 px Arbeitsflaeche. Seither ist sie eine wischbare Zeile — mit
 * zwei Zusagen, die hier geprueft werden: Reiter mit Zaehler stehen ohne
 * Wischen im Blick, und Randpfeile zeigen, wo es weitergeht.
 *
 *   $env:TEST_URL='http://127.0.0.1:8099'
 *   node node_modules\@playwright\test\cli.js test tests/kiosk-reiterleiste.spec.js
 */

const { test, expect } = require('./_kiosk-angemeldet');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

/* Ohne Freischaltung stehen nur fuenf Reiter da — dann gaebe es gar keinen
   Ueberlauf, und genau der ist hier der Gegenstand. Deshalb werden fuer die
   Messung alle Reiter eingeblendet. Das ist der ungünstigste Fall und
   zugleich der Zustand, auf den der Laden zulaeuft. */
async function alleReiter(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.k-tab').forEach((t) => { t.style.display = ''; });
  });
  await page.waitForTimeout(250);
}

async function oeffne(page, breite, hoehe) {
  await page.setViewportSize({ width: breite, height: hoehe });
  await page.goto(KIOSK_URL, { waitUntil: 'domcontentloaded' });
  // Ohne freigeschaltete Merkmale sind die vorderen Reiter ausgeblendet —
  // auf Sichtbarkeit zu warten liefe deshalb ins Leere.
  await page.waitForSelector('.k-tabs .k-tab', { state: 'attached', timeout: 15000 });
  await page.waitForSelector('.k-tabs .k-tab-pfeil-r', { state: 'attached', timeout: 15000 });
  await page.waitForTimeout(1200);
}

/** Liest Lage und Zustand der Leiste in einem Zug aus. */
async function leiste(page) {
  return await page.evaluate(() => {
    const nav = document.querySelector('.k-tabs');
    const nr = nav.getBoundingClientRect();
    const tabs = [...nav.querySelectorAll('.k-tab')]
      .filter((t) => getComputedStyle(t).display !== 'none');
    const drin = (t) => {
      const r = t.getBoundingClientRect();
      return r.left >= nr.left - 1 && r.right <= nr.right + 1;
    };
    return {
      hoehe: nr.height,
      zeilen: new Set(tabs.map((t) => Math.round(t.getBoundingClientRect().top))).size,
      anzahl: tabs.length,
      minBreite: Math.min(...tabs.map((t) => t.getBoundingClientRect().width)),
      minHoehe: Math.min(...tabs.map((t) => t.getBoundingClientRect().height)),
      scrollLeft: Math.round(nav.scrollLeft),
      ueberlauf: Math.round(nav.scrollWidth - nav.clientWidth),
      sichtOrdnung: tabs.slice()
        .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)
        .map((t) => t.dataset.tab),
      quellOrdnung: tabs.map((t) => t.dataset.tab),
      ausserhalb: tabs.filter((t) => !drin(t)).map((t) => t.dataset.tab),
      mitZaehlerDrin: tabs
        .filter((t) => t.querySelector('.k-tab-badge.show'))
        .map((t) => ({ tab: t.dataset.tab, sichtbar: drin(t) })),
      pfeilLinks: getComputedStyle(nav.querySelector('.k-tab-pfeil-l')).display !== 'none',
      pfeilRechts: getComputedStyle(nav.querySelector('.k-tab-pfeil-r')).display !== 'none',
    };
  });
}

async function setzeZaehler(page, tab, anzahl) {
  await page.evaluate(
    ([t, n]) => K.updateTabBadges(t, [{ count: n, cls: 'badge-neu', title: 'Test' }]),
    [tab, anzahl]
  );
  await page.waitForTimeout(800);   // weiches Rollen abwarten
}

test.describe('F1 — Reiterleiste auf dem Telefon', () => {

  /* Jeder Test setzt seine Breite selbst — ein Durchlauf je Geraeteprofil
     waere dieselbe Messung viermal. */
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile',
      'misst eigene Viewports, laeuft nur im Profil "mobile"');
  });

  for (const b of [320, 360, 390, 430]) {
    test(`TC-F1-01: einzeilig und flach bei ${b} px`, async ({ page }) => {
      await oeffne(page, b, 800);
      await alleReiter(page);
      const l = await leiste(page);

      expect(l.zeilen, `Leiste bei ${b} px umgebrochen`).toBe(1);
      expect(l.hoehe, `Leiste bei ${b} px zu hoch`).toBeLessThanOrEqual(60);
      // Die Reiter duerfen nicht zusammengedrueckt werden, nur verschoben.
      expect(l.minBreite).toBeGreaterThanOrEqual(55.5);
      expect(l.minHoehe).toBeGreaterThanOrEqual(44);
    });
  }

  test('TC-F1-02: Zaehler ist bei jeder Breite sichtbar', async ({ page }) => {
    for (const b of [320, 360, 744, 768, 1024, 1280, 1920]) {
      await oeffne(page, b, 900);
      await alleReiter(page);
      await setzeZaehler(page, 'baecker', 1);
      await setzeZaehler(page, 'kontakt', 1);

      const gross = await page.evaluate(() =>
        [...document.querySelectorAll('.k-tab-badge.show')]
          .map((e) => e.getBoundingClientRect().width));
      expect(gross.length, `keine Zaehler bei ${b} px`).toBe(2);
      gross.forEach((w) => expect(w, `Zaehler ohne Breite bei ${b} px`).toBeGreaterThan(0));
    }
  });

  test('TC-F1-03: kein Ausklappmenue in der Leiste', async ({ page }) => {
    await oeffne(page, 360, 800);
    // Kein Reiter steckt hinter einem Element, das erst geoeffnet werden muss.
    const versteckt = await page.evaluate(() =>
      document.querySelectorAll('.k-tabs details, .k-tabs select, .k-tabs [aria-haspopup]').length);
    expect(versteckt).toBe(0);
  });

  test('TC-F1-04: Reiter mit Zaehler steht ohne Wischen im Blick', async ({ page }) => {
    await oeffne(page, 360, 800);
    await alleReiter(page);

    const vorher = await leiste(page);
    // Vorbedingung: Es passen wirklich nicht alle nebeneinander, sonst
    // prueft der Test nichts.
    expect(vorher.ueberlauf, 'kein Ueberlauf — Test ohne Aussage').toBeGreaterThan(0);
    expect(vorher.ausserhalb).toContain('kalender');

    await setzeZaehler(page, 'kalender', 2);
    const l = await leiste(page);

    const kal = l.mitZaehlerDrin.find((x) => x.tab === 'kalender');
    expect(kal, 'Zaehler auf "Termine" nicht gesetzt').toBeTruthy();
    expect(kal.sichtbar, '"Termine" liegt trotz Zaehler ausserhalb').toBe(true);
    // Vorgezogen, aber nicht durchmischt: Die uebrigen behalten ihre Folge.
    expect(l.sichtOrdnung[0]).toBe('kalender');
    const rest = l.sichtOrdnung.filter((t) => t !== 'kalender');
    expect(rest).toEqual(l.quellOrdnung.filter((t) => t !== 'kalender'));
  });

  test('TC-F1-05: Pfeile zeigen nur, wo wirklich mehr steht', async ({ page }) => {
    await oeffne(page, 360, 800);
    await alleReiter(page);

    const ruhe = await leiste(page);
    expect(ruhe.pfeilLinks, 'linker Pfeil in der Ruhelage sichtbar').toBe(false);
    expect(ruhe.pfeilRechts, 'rechter Pfeil fehlt trotz Ueberlauf').toBe(true);

    await page.evaluate(() => {
      const n = document.querySelector('.k-tabs');
      n.scrollLeft = n.scrollWidth;
    });
    await page.waitForTimeout(400);

    const ende = await leiste(page);
    expect(ende.pfeilLinks, 'linker Pfeil fehlt am rechten Ende').toBe(true);
    expect(ende.pfeilRechts, 'rechter Pfeil noch sichtbar am Ende').toBe(false);
  });

  test('TC-F1-05b: ohne Ueberlauf kein Pfeil', async ({ page }) => {
    await oeffne(page, 430, 900);
    // Nur die vier Reiter stehen lassen, die sicher nebeneinander passen.
    await page.evaluate(() => {
      const bleibt = ['mittag', 'baecker', 'metzgerbest', 'drax'];
      document.querySelectorAll('.k-tab').forEach((t) => {
        t.style.display = bleibt.includes(t.dataset.tab) ? '' : 'none';
      });
    });
    await page.waitForTimeout(400);

    const l = await leiste(page);
    expect(l.ueberlauf).toBeLessThanOrEqual(2);
    expect(l.pfeilLinks).toBe(false);
    expect(l.pfeilRechts).toBe(false);
  });

  test('TC-F1-06: Ruhelage ist der erste Reiter', async ({ page }) => {
    await oeffne(page, 360, 800);
    const vorher = await leiste(page);
    expect(vorher.scrollLeft).toBe(0);

    // Nachtraegliche Freischaltung: Die Leiste darf nicht von selbst wandern.
    await alleReiter(page);
    const l = await leiste(page);
    expect(l.scrollLeft, 'Leiste ist von selbst verrutscht').toBe(0);
    expect(l.sichtOrdnung[0]).toBe('mittag');
  });

  test('TC-F1-07: eigenes Wischen hat Vorrang', async ({ page }) => {
    await oeffne(page, 360, 800);
    await alleReiter(page);

    // Wischen von Hand nachbilden: ein echtes Scroll-Ereignis am Ende.
    await page.evaluate(() => {
      const n = document.querySelector('.k-tabs');
      n.scrollLeft = n.scrollWidth;
      n.dispatchEvent(new Event('scroll'));
    });
    await page.waitForTimeout(300);
    const stand = (await leiste(page)).scrollLeft;
    expect(stand).toBeGreaterThan(0);

    await setzeZaehler(page, 'mittag', 7);
    const l = await leiste(page);
    expect(l.scrollLeft, 'Leiste wurde unter dem Finger zurueckgerissen')
      .toBe(stand);
  });

  for (const b of [640, 1280]) {
    test(`TC-F1-08: ab ${b} px keine wischbare Zeile`, async ({ page }) => {
      await oeffne(page, b, 900);
      await alleReiter(page);
      await setzeZaehler(page, 'kalender', 3);

      const l = await leiste(page);
      expect(l.pfeilLinks).toBe(false);
      expect(l.pfeilRechts).toBe(false);
      expect(l.ueberlauf).toBeLessThanOrEqual(2);
      // Senkrechte Spalte: jeder Reiter auf eigener Zeile, Folge unveraendert.
      expect(l.zeilen).toBe(l.anzahl);
      expect(l.sichtOrdnung).toEqual(l.quellOrdnung);
    });
  }
});
