// @ts-check
/**
 * Kiosk – ein Listenbaustein für Bäcker, Metzger und Getränke (LH)
 *
 * Aus dem Laden: „Warum erfindest du das Rad immer wieder neu, wenn es
 * gute Beispiele wie beim Bäcker gibt? Harmonisiere die Listen bei
 * Bäcker, Metzger und Getränke, so dass sie alle ähnlich bedienbar sind
 * und aussehen."
 *
 * Vorher dreimal dieselbe Liste, dreimal anders gebaut — und bei
 * Getränken in 11 px Monospace, was die Kritik „schwer lesbar" auslöste.
 *
 * Dieser Wächter prüft, dass alle drei denselben Baustein benutzen und
 * dass niemand still zu einem Eigenbau zurückkehrt.
 *
 * Spec: specs/listen-harmonie/spec.md
 */
const { test, expect } = require('./_kiosk-angemeldet');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

const GETRAENKE = [
  { nummer: 'KA40015', name: 'Augustiner Hell', bestelltext: 'Augustiner hell 0,5l',
    gebinde: '20x0,50', gruppe: 'Bier', preis: 13.75, aktiv: true,
    ueblich: 18, bestellungen: 9, zuletzt: 18 },
  { nummer: 'KA40120', name: 'Tegernseer Hell', bestelltext: 'Tegernseer hell',
    gebinde: '20x0,50', gruppe: 'Bier', preis: 15.2, aktiv: true,
    ueblich: 2, bestellungen: 5, zuletzt: 2 },
  { nummer: 'KA49999', name: 'Alte Sorte', bestelltext: 'Alte Sorte',
    gebinde: '20x0,50', gruppe: 'Bier', preis: 9.9, aktiv: false,
    ueblich: null, bestellungen: 1, zuletzt: 0 },
];

async function mockGetraenke(page) {
  await page.route('**/api/**', (route) => {
    const u = route.request().url();
    const j = (o) => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(o),
    });
    if (u.includes('cms-config')) {
      return j({ success: true, data: { feature_flags: { kiosk_getraenke: true } } });
    }
    if (u.includes('getraenke-artikel')) {
      return j({ success: true, artikel: GETRAENKE, gruppen: ['Bier'], pfand: {} });
    }
    if (/getraenke-order\/\d{4}/.test(u)) {
      return j({
        success: true,
        bestellung: { datum: '2026-09-30', kw: 40, status: 0, positionen: [], protokoll: [] },
        artikel: GETRAENKE, gruppen: ['Bier'], pfand: {}, letzte: null,
        bestellbar: true, config: { name: 'Getränke Kratzer' }, testbetrieb: true, summen: {},
      });
    }
    if (u.includes('getraenke-order')) {
      return j({
        success: true, termin: '2026-09-30', kw: 40, letzte: null,
        config: { name: 'Getränke Kratzer' }, testbetrieb: true, verlauf: [],
      });
    }
    return j({ success: true, data: [], orders: [] });
  });
}

async function getraenkeArtikel(page) {
  await mockGetraenke(page);
  await page.goto(KIOSK_URL);
  await page.locator('.k-tab[data-tab="getraenke"]').click();
  await page.waitForTimeout(900);
  /* Auf dem Telefon stehen die Unterreiter nicht im festen Kopf, sondern
     im Blatt hinter dem „i" — der Kopf bliebe sonst zu hoch.
     (Spec kiosk-bestellreiter-mobil, F1) */
  const fest = page.locator('#panel-getraenke .gk-fest .gk-sub[data-sub="artikel"]');
  if (await fest.count() && await fest.first().isVisible()) {
    await fest.first().dispatchEvent('click');
  } else {
    await page.locator('#gk-mehr').click();
    await page.locator('#gk-blatt .gk-sub[data-sub="artikel"]').dispatchEvent('click');
  }
  await page.locator('#panel-getraenke .dl-zeile').first().waitFor({ timeout: 15000 });
}

/** Alles, woran sich eine Liste messen lassen muss. */
const befund = (page, panel) => page.evaluate((sel) => {
  const liste = document.querySelector(sel + ' .dl-liste');
  const zeilen = [...document.querySelectorAll(sel + ' .dl-zeile')];
  if (!liste || !zeilen.length) return null;
  const hh = zeilen.map((e) => Math.round(e.getBoundingClientRect().height));
  // Antippgröße der Symbolknöpfe
  const ik = [...document.querySelectorAll(sel + ' .dl-ik')]
    .map((e) => { const r = e.getBoundingClientRect(); return Math.round(Math.min(r.width, r.height)); });
  // Monospace war der Grund für „schwer lesbar" — sie darf nirgends stehen.
  let mono = [];
  zeilen.forEach((z) => {
    z.querySelectorAll('*').forEach((e) => {
      const f = getComputedStyle(e).fontFamily.toLowerCase();
      if (/mono|consolas|courier/.test(f)) mono.push(e.className || e.tagName);
    });
  });
  return {
    spalten: getComputedStyle(liste).gridTemplateColumns.split(' ').length,
    zeilen: zeilen.length,
    hMin: Math.min(...hh), hMax: Math.max(...hh),
    ikMin: ik.length ? Math.min(...ik) : 0,
    ikProZeile: ik.length / zeilen.length,
    mono: [...new Set(mono)],
    quer: Math.round(document.documentElement.scrollWidth) > window.innerWidth + 1,
  };
}, panel);

test.describe('Listen harmonisiert – Getränke (LH)', () => {

  test('TC-LH-01: Die Getränkeliste benutzt den gemeinsamen Baustein', async ({ page }) => {
    await getraenkeArtikel(page);
    const b = await befund(page, '#panel-getraenke');
    expect(b, 'kein .dl-liste/.dl-zeile gefunden').not.toBeNull();
    expect(b.zeilen).toBe(GETRAENKE.length);
  });

  test('TC-LH-02: Keine Monospace-Schrift mehr', async ({ page }) => {
    /* Der Kern der Kritik: „Die Schriftarten entsprechen nicht dem
       Standard und die Texte sind daher schwer lesbar." Nummer, Gebinde
       und Preis standen in 11 px Monospace. */
    await getraenkeArtikel(page);
    const b = await befund(page, '#panel-getraenke');
    expect(b.mono, `Monospace an: ${b.mono.join(', ')}`).toEqual([]);
  });

  test('TC-LH-03: Zwei Symbolknöpfe je Zeile, in Antippgröße', async ({ page }) => {
    await getraenkeArtikel(page);
    const b = await befund(page, '#panel-getraenke');
    expect(b.ikProZeile, 'nicht genau zwei Schaltflächen je Zeile').toBe(2);
    // Die projektweite Antippgröße ist eine Grundsatzentscheidung.
    expect(b.ikMin, `Antippgröße ${b.ikMin}px`).toBeGreaterThanOrEqual(44);
  });

  test('TC-LH-04: Die Zeile bleibt flach und die Breite wird genutzt', async ({ page }, info) => {
    await getraenkeArtikel(page);
    const b = await befund(page, '#panel-getraenke');
    // Früher war die Liste immer einspaltig — auf dem Rechner blieben
    // zwei Drittel der Breite leer.
    const breite = (info.project.use.viewport || {}).width || 0;
    if (breite >= 1200) {
      expect(b.spalten, `${b.spalten} Spalten bei ${breite}px`).toBeGreaterThan(1);
    }
    expect(b.quer, 'die Seite rollt waagerecht').toBe(false);
  });

  test('TC-LH-05: Nichts ragt aus der Zeile heraus', async ({ page }) => {
    await getraenkeArtikel(page);
    const raus = await page.evaluate(() => {
      const aus = [];
      document.querySelectorAll('#panel-getraenke .dl-zeile').forEach((z) => {
        const rz = z.getBoundingClientRect();
        z.querySelectorAll(':scope > *').forEach((k) => {
          const r = k.getBoundingClientRect();
          if (Math.round(r.right) > Math.round(rz.right) + 1
              || Math.round(r.left) < Math.round(rz.left) - 1) {
            aus.push(k.className);
          }
        });
      });
      return aus;
    });
    expect(raus, JSON.stringify(raus)).toEqual([]);
  });

  test('TC-LH-06: Der ausgeblendete Artikel ist als solcher erkennbar', async ({ page }) => {
    await getraenkeArtikel(page);
    const zeile = page.locator('#panel-getraenke .dl-zeile').filter({ hasText: 'Alte Sorte' });
    await expect(zeile).toHaveClass(/\baus\b/);
    await expect(zeile.locator('.dl-tag')).toHaveText('ausgeblendet');
    // Und sein Auge ist zugeklappt, nicht grün.
    await expect(zeile.locator('.dl-ik').last()).not.toHaveClass(/\ban\b/);
  });
});
