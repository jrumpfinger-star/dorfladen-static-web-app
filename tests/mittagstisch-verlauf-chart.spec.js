// @ts-check
const { test, expect } = require('./_kiosk-angemeldet');

/**
 * Mittagstisch – Rückblick auf sieben Tage
 * Spec: specs/mittag-verlauf-chart/spec.md
 *
 * Aus dem Laden: „Bei Mittagstisch wäre ein kleiner Chart schön, in dem die
 * Bestellungen der letzten 7 Tage dargestellt werden. Er sollte einfach als
 * Popup aufrufbar sein über ein passendes Icon. Stornierte Bestellungen
 * sollen nicht berücksichtigt werden." Dazu: „Wenn möglich, sollten als
 * Tooltip die Anzahl der einzelnen Gerichte angezeigt werden können."
 */

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const LOKAL = /localhost|127\.0\.0\.1/.test(BASE);
const KIOSK_URL = LOKAL ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

/* Feste Uhr: Ohne sie verschiebt sich die Sieben-Tage-Reihe über Nacht und
   der Wächter misst morgen etwas anderes als heute. */
const JETZT = '2026-09-24T10:00:00';
const HEUTE = '2026-09-24';

function tagVor(n) {
  const d = new Date(HEUTE + 'T12:00:00');
  d.setDate(d.getDate() - n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
    + '-' + String(d.getDate()).padStart(2, '0');
}

/** Sieben Tage, wie der Server sie liefert (ohne stornierte). */
function verlauf() {
  const leer = { portionen: 0, bestellungen: 0, online: 0, vor_ort: 0, gerichte: [] };
  const reihe = [];
  for (let i = 6; i >= 0; i--) reihe.push(Object.assign({ datum: tagVor(i) }, leer));
  // Tag 6 zurück: der höchste Balken
  Object.assign(reihe[0], {
    portionen: 40, bestellungen: 30, online: 22, vor_ort: 18,
    gerichte: [{ name: 'Rinderbraten mit Knödel', portionen: 40 }],
  });
  // heute: zwei Gerichte — dafür ist der Tooltip da
  Object.assign(reihe[6], {
    portionen: 32, bestellungen: 23, online: 14, vor_ort: 18,
    gerichte: [
      { name: '1/2 Hendl mit Pommes oder Kartoffelsalat', portionen: 22 },
      { name: 'Fisch nach griechischer Art mit Reis', portionen: 10 },
    ],
  });
  return reihe;
}

async function mockApi(page, opts = {}) {
  const gefragt = [];
  /* Ohne `await` ist die Route unter Last nicht sicher registriert, bevor
     `page.goto` die ersten Aufrufe absetzt — der Mock liefe dann ins
     Leere und der Fall fiele scheinbar grundlos. */
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const json = (o) => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(o),
    });
    if (url.includes('/api/cms-config')) {
      return json({ success: true, data: { feature_flags: { kiosk_mittag: true } } });
    }
    if (url.includes('mode=tagesverlauf')) {
      gefragt.push(url);
      if (opts.kaputt) {
        return route.fulfill({ status: 502, contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'kaputt' }) });
      }
      return json({ success: true, von: tagVor(6), bis: HEUTE, tage: 7,
        verlauf: opts.leer ? verlauf().map((t) => Object.assign({}, t,
          { portionen: 0, bestellungen: 0, gerichte: [] })) : verlauf(),
        hinweis: 'ohne stornierte Bestellungen' });
    }
    if (url.includes('mode=unread_messages')) return json({ success: true, unread_count: 0 });
    if (url.includes('mode=messages')) return json({ success: true, orders: [] });
    if (url.includes('/api/lunch-order')) return json({ success: true, orders: [] });
    return json({ success: true, orders: [], data: [] });
  });
  return gefragt;
}

async function openMittag(page, opts = {}) {
  await page.clock.setFixedTime(new Date(JETZT));
  const gefragt = await mockApi(page, opts);
  await page.goto(KIOSK_URL);
  await page.click('[data-tab="mittag"]');
  await page.waitForTimeout(1200);
  return gefragt;
}

async function oeffneChart(page, opts = {}) {
  const gefragt = await openMittag(page, opts);
  await page.locator('#mt-verlauf-btn').click();
  await page.locator('#mt-verlauf-bg').waitFor({ state: 'visible', timeout: 8000 });
  await page.waitForTimeout(500);
  return gefragt;
}

test.describe('Mittagstisch: Rückblick auf sieben Tage', () => {
  test.use({ serviceWorkers: 'block' });

  test('TC-VC-01: Ein Symbol im Mittagstisch öffnet das Popup',
    async ({ page }) => {
      await openMittag(page);
      const knopf = page.locator('#mt-verlauf-btn');
      await expect(knopf, 'kein Symbol für den Rückblick').toBeVisible();
      await knopf.click();
      await expect(page.locator('#mt-verlauf-bg')).toBeVisible();
      await expect(page.locator('#mt-vl-titel')).toContainText('7 Tage');
    });

  test('TC-VC-02: Sieben Balken, auch die leeren Tage', async ({ page }) => {
    /* Ein Ruhetag ist eine Aussage. Würde er wegfallen, rutschten die
       übrigen zusammen und die Reihe läse sich falsch. */
    await oeffneChart(page);
    await expect(page.locator('.mt-vl-tag')).toHaveCount(7);
  });

  test('TC-VC-03: Die Höhe folgt den Portionen', async ({ page }) => {
    await oeffneChart(page);
    const hoehen = await page.evaluate(() =>
      [...document.querySelectorAll('.mt-vl-fuell')]
        .map((el) => Math.round(el.getBoundingClientRect().height)));
    // 40 Portionen am ersten Tag, 32 heute, dazwischen nichts.
    expect(hoehen[0], 'höchster Tag ist nicht der höchste Balken')
      .toBeGreaterThan(hoehen[6]);
    expect(hoehen[6], 'der zweithöchste Tag fehlt').toBeGreaterThan(hoehen[3]);
    expect(hoehen[3], 'leerer Tag hat keine sichtbare Grundlinie')
      .toBeGreaterThan(0);
  });

  test('TC-VC-04: Der Tooltip nennt die einzelnen Gerichte',
    async ({ page }) => {
      /* Der ausdrückliche Wunsch. Am Balken hängt der Text als `title`,
         damit ihn der Mauszeiger zeigt. */
      await oeffneChart(page);
      const tip = await page.locator('.mt-vl-tag').nth(6).getAttribute('title');
      expect(tip, 'kein Tooltip am Balken').toBeTruthy();
      expect(tip).toContain('22× 1/2 Hendl mit Pommes oder Kartoffelsalat');
      expect(tip).toContain('10× Fisch nach griechischer Art mit Reis');
    });

  test('TC-VC-05: Ein Tippen zeigt die Gerichte auch ohne Maus',
    async ({ page }) => {
      /* Auf dem Tablet gibt es kein Überfahren. Der Balken ist deshalb
         ein Knopf und schreibt die Aufschlüsselung darunter. */
      await oeffneChart(page);
      await page.locator('.mt-vl-tag').nth(0).click();
      await page.waitForTimeout(300);
      const detail = page.locator('#mt-vl-detail');
      await expect(detail).toContainText('Rinderbraten mit Knödel');
      await expect(detail).toContainText('40');
    });

  test('TC-VC-06: Ohne Zutun steht der jüngste Tag mit Bestellungen offen',
    async ({ page }) => {
      // Ein leeres Feld unter dem Diagramm verrät nicht, dass dort etwas ist.
      await oeffneChart(page);
      await expect(page.locator('#mt-vl-detail'))
        .toContainText('Fisch nach griechischer Art mit Reis');
    });

  test('TC-VC-07: Der Hinweis auf die stornierten steht dabei',
    async ({ page }) => {
      await oeffneChart(page);
      await expect(page.locator('.mt-vl-fuss'))
        .toContainText('ohne stornierte');
    });

  test('TC-VC-08: Abgefragt werden genau sieben Tage', async ({ page }) => {
    const gefragt = await oeffneChart(page);
    expect(gefragt.length, 'der Verlauf wurde nicht geladen')
      .toBeGreaterThan(0);
    expect(gefragt[0]).toContain('days=7');
  });

  test('TC-VC-09: Leere Woche sagt es im Klartext', async ({ page }) => {
    await oeffneChart(page, { leer: true });
    await expect(page.locator('#mt-vl-inhalt')).toContainText('nichts bestellt');
  });

  test('TC-VC-10: Streikt der Server, erscheint kein leeres Diagramm',
    async ({ page }) => {
      await oeffneChart(page, { kaputt: true });
      await expect(page.locator('#mt-vl-inhalt'))
        .toContainText('nicht geladen werden');
    });

  test('TC-VC-11: Escape und der Rand schließen das Popup',
    async ({ page }) => {
      await oeffneChart(page);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await expect(page.locator('#mt-verlauf-bg')).toBeHidden();

      await page.locator('#mt-verlauf-btn').click();
      await page.locator('#mt-verlauf-bg').waitFor({ state: 'visible' });
      await page.locator('#mt-verlauf-bg').click({ position: { x: 4, y: 4 } });
      await page.waitForTimeout(300);
      await expect(page.locator('#mt-verlauf-bg')).toBeHidden();
    });
});
