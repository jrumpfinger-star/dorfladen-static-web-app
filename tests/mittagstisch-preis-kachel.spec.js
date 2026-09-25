// @ts-check
/**
 * Kiosk – Mittagstisch: Preis in schmalen Karten (MP)
 *
 * Aus dem Laden: „Der Preis wird nicht komplett in einigen Kacheln
 * angezeigt."
 *
 * Gemessen mit denselben Bestellungen über alle Breiten:
 *
 *   Fenster   Karte   Kennzeichen hat / braucht   gequetscht
 *   1280 px   496     172 / 172                   nein
 *    768 px   639     315 / 315                   nein
 *    686 px   557     233 / 233                   nein
 *    375 px   334      47 /  73                   JA
 *
 * Nicht der Preis war zu schmal — der Kennzeichenblock war es. Er steht in
 * Spalte 1 (`minmax(0,1fr)`) und darf unter seine Inhaltsbreite schrumpfen.
 * Ab etwa 410 px Kartenbreite bleibt weniger als die 73 px, die
 * „BESTÄTIGT" braucht: Die Kennzeichen laufen über und zeichnen über den
 * Preis. Von „8,80 €" blieb „80 €" übrig.
 *
 * Spec: specs/mittag-preis-kachel/spec.md
 */
const { test, expect } = require('./_kiosk-angemeldet');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

function heute() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
    + '-' + String(d.getDate()).padStart(2, '0');
}

const GERICHT = 'Schnitzel mit Pommes oder Kartoffelsalat';

/* Nachbau der gemeldeten Karten: viele Kennzeichen, grosse Preise. Genau
   diese Kombination — Quelle, Status, MIT, Sonderwunsch, Push — macht den
   Kennzeichenblock breit genug, um den Preis zu verdecken. */
function bestellungen() {
  return [
    { id: 'elo', name: 'Elo', status: 1, quelle: 1, menge: 1, preis: 8.8,
      anmerkung: 'Pom' },
    { id: 'pfarrer', name: 'Pfarrer', status: 1, quelle: 1, menge: 1, preis: 8.8 },
    { id: 'bublak', name: 'Bublak', status: 1, quelle: 1, menge: 5, preis: 8.8,
      anmerkung: '3p', mitnehmen: true },
    { id: 'noel', name: 'Noel Breil', status: 0, quelle: 0, menge: 2, preis: 8.8,
      push_available: true },
    { id: 'gross', name: 'Grossbestellung Gasthaus', status: 1, quelle: 1,
      menge: 14, preis: 9.8, anmerkung: 'ohne Salat', mitnehmen: true,
      push_available: true, notify_email: true, email: 'a@b.de' },
  ].map((o) => Object.assign({
    datum: heute(), gericht: GERICHT, menge: 1, preis: 8.8,
    mitnehmen: false, anmerkung: '', kommentar_gelesen: true, verlauf: [],
  }, o));
}

async function openMittag(page) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const json = (o) => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(o),
    });
    if (url.includes('/api/cms-config')) {
      return json({ success: true, data: { feature_flags: { kiosk_mittag: true } } });
    }
    if (url.includes('mode=unread_messages')) return json({ success: true, unread_count: 0 });
    if (url.includes('mode=messages')) return json({ success: true, orders: [] });
    if (url.includes('/api/lunch-order')) return json({ success: true, orders: bestellungen() });
    return json({ success: true, orders: [], data: [] });
  });
  await page.goto(KIOSK_URL);
  await page.click('[data-tab="mittag"]');
  await page.locator('#panel-mittag .k-order-hdr').first().waitFor({ timeout: 20000 });
}

/** Karten auf eine feste Breite zwingen — so ist der gemeldete Fall auf
 *  jedem Schirm nachstellbar. Im Laden legt das Raster
 *  `repeat(auto-fill, minmax(330px,1fr))`; bei vier Spalten auf einem
 *  breiten Schirm misst eine Karte rund 340 px. */
async function kartenBreite(page, px) {
  await page.evaluate((b) => {
    document.querySelectorAll('#panel-mittag .k-dish-body').forEach((el) => {
      el.style.gridTemplateColumns = 'repeat(auto-fill, ' + b + 'px)';
    });
  }, px);
  await page.waitForTimeout(150);
}

/** Je Karte: passt der Kennzeichenblock in seinen Kasten? */
const befund = (page) => page.evaluate(() => {
  const aus = [];
  document.querySelectorAll('#panel-mittag .k-order-hdr').forEach((hdr) => {
    const p = hdr.querySelector('.k-oc-price');
    const b = hdr.querySelector('.k-oc-badges');
    if (!p || !b) return;
    const rb = b.getBoundingClientRect();
    const rp = p.getBoundingClientRect();
    // Das am weitesten rechts endende Kennzeichen — der Kasten selbst sagt
    // nichts, weil seine Kinder über ihn hinauslaufen. Geprüft wird die
    // ECHTE Überschneidung: waagerecht UND senkrecht. Stehen die
    // Kennzeichen in einer eigenen Zeile, überdecken sie nichts, auch wenn
    // sie waagerecht weiter reichen als der Preis.
    let ueberdeckt = false;
    b.querySelectorAll(':scope > *').forEach((k) => {
      const rk = k.getBoundingClientRect();
      const waagerecht = rk.right > rp.left + 1 && rk.left < rp.right - 1;
      const senkrecht = rk.bottom > rp.top + 1 && rk.top < rp.bottom - 1;
      if (waagerecht && senkrecht) ueberdeckt = true;
    });
    aus.push({
      name: ((hdr.querySelector('.k-oc-name') || {}).textContent || '').trim(),
      preis: p.textContent.trim(),
      karte: Math.round(hdr.getBoundingClientRect().width),
      hat: Math.round(rb.width),
      braucht: Math.ceil(b.scrollWidth),
      gequetscht: Math.ceil(b.scrollWidth) > Math.round(rb.width) + 1,
      ueberdeckt: ueberdeckt,
      preisSichtbar: Math.ceil(p.scrollWidth) <= Math.round(rp.width) + 1,
      preisZeile: Math.round(rp.top + rp.height / 2),
      badgeZeile: Math.round(rb.top + rb.height / 2),
    });
  });
  return aus;
});

test.describe('Mittagstisch – Preis in schmalen Karten (MP)', () => {

  test('TC-MP-01: Der Kennzeichenblock wird nicht gequetscht', async ({ page }) => {
    await openMittag(page);
    const b = await befund(page);
    expect(b.length, 'keine Karten gefunden').toBeGreaterThan(0);
    const schlecht = b.filter((z) => z.gequetscht);
    expect(schlecht, JSON.stringify(schlecht)).toEqual([]);
  });

  test('TC-MP-02: Kein Kennzeichen zeichnet über den Preis', async ({ page }) => {
    await openMittag(page);
    const b = await befund(page);
    const schlecht = b.filter((z) => z.ueberdeckt);
    expect(schlecht, JSON.stringify(schlecht)).toEqual([]);
  });

  test('TC-MP-03: Auch in der schmalen Karte bleibt der Preis lesbar', async ({ page }) => {
    // Genau die Lage aus dem eingereichten Bild: breiter Schirm, vier
    // Spalten, Karten um die 340 px.
    await openMittag(page);
    await kartenBreite(page, 340);
    const b = await befund(page);
    const schlecht = b.filter((z) => z.gequetscht || z.ueberdeckt || !z.preisSichtbar);
    expect(schlecht, JSON.stringify(schlecht)).toEqual([]);
  });

  test('TC-MP-04: Auch knapp an der Rastergrenze hält die Anordnung', async ({ page }) => {
    // 330 px ist die kleinste Breite, die das Raster im Laden zulässt.
    await openMittag(page);
    await kartenBreite(page, 330);
    const b = await befund(page);
    const schlecht = b.filter((z) => z.gequetscht || z.ueberdeckt);
    expect(schlecht, JSON.stringify(schlecht)).toEqual([]);
  });

  test('TC-MP-05: Auf breiten Karten bleibt die kompakte Anordnung', async ({ page }, info) => {
    /* Die Korrektur darf nicht überall eine Zeile kosten. Wo Platz ist,
       stehen Kennzeichen und Preis weiterhin nebeneinander.
       Auf schmalen Schirmen kann es gar keine breite Karte geben. */
    const breite = (info.project.use.viewport || {}).width || 0;
    test.skip(breite < 700, 'hier passt keine Karte über 430 px');
    await openMittag(page);
    await kartenBreite(page, 600);
    const b = await befund(page);
    const breit = b.filter((z) => z.karte > 430);
    expect(breit.length, 'keine breite Karte im Versuch').toBeGreaterThan(0);
    breit.forEach((z) => {
      expect(Math.abs(z.preisZeile - z.badgeZeile),
        `${z.name}: Preis ${z.preisZeile}px, Kennzeichen ${z.badgeZeile}px`)
        .toBeLessThan(12);
    });
  });

  test('TC-MP-06: Der Preis steht vollständig da', async ({ page }) => {
    await openMittag(page);
    await kartenBreite(page, 340);
    // „137,20 €" ist der längste Wert im Versuch - er darf nicht kürzen.
    const gross = page.locator('#panel-mittag .k-order-hdr')
      .filter({ hasText: 'Grossbestellung' }).locator('.k-oc-price');
    await expect(gross).toHaveText('137,20 €');
    const ok = await gross.evaluate((el) =>
      Math.ceil(el.scrollWidth) <= Math.round(el.getBoundingClientRect().width) + 1);
    expect(ok, 'der Preis passt nicht in seinen Kasten').toBe(true);
  });
});
