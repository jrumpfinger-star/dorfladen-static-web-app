/* Drax-Bestellung im Kiosk (specs/drax-bestellung/spec.md).
 *
 * Geprueft wird die Oberflaeche gegen gemockte Antworten: Die Serverlogik
 * hat ihre eigene Pruefung in `tools/drax_logik_test.py`. Hier geht es um
 * das, was die Verkaeuferin sieht und antippt.
 *
 * Alle Pruefungen laufen laut Verfassung (Prinzip 7) auf mobile 375x667,
 * iPad mini 768x1024 und Desktop 1280x800 - dazu auf dem echten
 * Ladentablett im Hochformat.
 */
const { test, expect } = require('@playwright/test');

const GRUPPEN = [
  { id: 'weizenmehl', name: 'Weizenmehl & Grieß' },
  { id: 'muesli', name: 'Müsli & Flocken' },
];

const ARTIKEL = [
  { nr: '40401', name: 'Weizenmehl Type 405', einheit: '1 kg', gruppe: 'weizenmehl',
    haeufigkeit: 240, lieferungen: 7, aktiv: true },
  { nr: '40405', name: 'Weizenmehl Type 405', einheit: '5 kg', gruppe: 'weizenmehl',
    haeufigkeit: 60, lieferungen: 4, aktiv: true },
  { nr: '40412', name: 'Weizenmehl Type 550', einheit: '1 kg', gruppe: 'weizenmehl',
    haeufigkeit: 90, lieferungen: 5, aktiv: true, kassenname: 'W.Mehl 550' },
  { nr: '88949', name: 'Bio Haferflocken Großblatt', einheit: '500 g', gruppe: 'muesli',
    haeufigkeit: 30, lieferungen: 3, aktiv: true, nur_rechnung: true },
];

/** Der naechste Donnerstag - derselbe Rhythmus wie im Server. */
function naechsterDonnerstag(versatz) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  while (d.getDay() !== 4) d.setDate(d.getDate() + 1);
  d.setDate(d.getDate() + (versatz || 0) * 7);
  return d.toISOString().slice(0, 10);
}

function vortag(iso, stunde) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  d.setHours(stunde, 0, 0, 0);
  return d.toISOString().slice(0, 19);
}

const CONFIG = {
  empfaenger: 'test@dorfladen-oberornau.de',
  empfaenger_name: 'Test (Drax-Bestellung)',
  kd_nr: '11225', liefertag: 3, bestellschluss_tag: 2, bestellschluss: '12:00',
  anschrift: ['Dorfladen Oberornau', 'Oberornau 8', '83552 Obing'],
};

/**
 * @param {object} opts
 *   status        Status des ersten Liefertages (0 Entwurf, 1 gesendet)
 *   positionen    Vorbelegte Positionen der Bestellung
 *   verstrichen   Bestellschluss ist vorbei
 *   testbetrieb   Testadresse statt echter Muehle
 */
async function mockDrax(page, opts = {}) {
  const o = Object.assign({
    status: 0, verstrichen: false, testbetrieb: true,
    positionen: [{ nr: '40401', menge: 4, uebernommen: true },
                 { nr: '88949', menge: 2, uebernommen: true }],
  }, opts);
  const tag = naechsterDonnerstag(0);
  const gesendet = [];

  await page.route(/\/api\//, (r) => {
    const url = r.request().url();
    const method = r.request().method();
    const json = (b) => r.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(b),
    });

    if (/cms-config/.test(url)) {
      return json({ success: true, data: { feature_flags: {
        kiosk_mittag: true, kiosk_drax: true } } });
    }

    if (/drax-artikel/.test(url)) {
      if (method === 'POST' || method === 'PATCH') {
        gesendet.push({ url, method, body: r.request().postDataJSON() });
        return json({ success: true, artikel: ARTIKEL, gruppen: GRUPPEN });
      }
      return json({ success: true, artikel: ARTIKEL, gruppen: GRUPPEN });
    }

    if (/drax-order/.test(url)) {
      if (method === 'POST') {
        gesendet.push({ url, method, body: r.request().postDataJSON() });
        if (/\/config/.test(url)) {
          return json({ success: true, config: CONFIG, testbetrieb: o.testbetrieb });
        }
        return json({ success: true, status: /korrektur/.test(url) ? 2 : 1,
          testbetrieb: o.testbetrieb, protokoll: [], summen: {}, entfallen: [] });
      }
      if (/mode=verlauf/.test(url)) {
        return json({ success: true, verlauf: [
          { datum: '2026-09-24', wochentag: 'Donnerstag', positionen: 12, stueck: 28,
            quelle: 'lieferung', rechnung: 'RE-4711', ausnahme: false },
          { datum: '2026-08-17', wochentag: 'Montag', positionen: 9, stueck: 17,
            quelle: 'lieferung', rechnung: 'RE-4698', ausnahme: true },
        ] });
      }
      // Uebersicht: ohne Datum in der Route
      if (!/drax-order\/\d{4}-\d{2}-\d{2}/.test(url)) {
        return json({
          success: true, aktiv: tag, testbetrieb: o.testbetrieb, config: CONFIG,
          tage: [0, 1, 2, 3].map((i) => ({
            datum: naechsterDonnerstag(i), wochentag: 'Donnerstag',
            status: i === 0 ? o.status : 0,
            positionen: i === 0 ? o.positionen.length : 0,
            bestellbar: true,
            bestellschluss: vortag(naechsterDonnerstag(i), 12),
            schluss_verstrichen: i === 0 ? o.verstrichen : false,
          })),
        });
      }
      return json({
        success: true,
        bestellung: { datum: tag, status: o.status, positionen: o.positionen,
          protokoll: o.status ? [{ was: 'gesendet', zeit: tag + 'T10:05:00',
            an: CONFIG.empfaenger, wer: 'Kiosk' }] : [] },
        artikel: ARTIKEL, gruppen: GRUPPEN, config: CONFIG,
        testbetrieb: o.testbetrieb,
        vorbelegt_aus: { art: 'lieferung',
          text: 'Übernommen von der Lieferung am 24.09.2026' },
        liefertag: true, bestellbar: true,
        nur_lesen: o.status === 1 || o.status === 2,
        korrektur_moeglich: o.status === 1 || o.status === 2,
        bestellschluss: vortag(tag, 12),
        schluss_verstrichen: o.verstrichen,
        summen: { positionen: o.positionen.length, stueck: 6 },
      });
    }
    return json({ success: true, data: {} });
  });

  return gesendet;
}

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

/* Vor dem Kiosk liegt seit der Spec kiosk-passwortabfrage ein Riegel. Der
   Hash steht in der Seite; wir setzen damit denselben Schluessel, den die
   Anmeldung setzen wuerde, statt das Passwort zu tippen. */
async function anmelden(page) {
  await page.goto(KIOSK_URL, { waitUntil: 'domcontentloaded' });
  const hash = await page.evaluate(() => {
    const el = document.getElementById('cms-pw-hash');
    return el ? JSON.parse(el.textContent) : null;
  });
  if (hash) {
    await page.evaluate((h) => {
      try { localStorage.setItem('kiosk_auth_ok', h); } catch (e) { /* gesperrt */ }
    }, hash);
  }
}

async function oeffne(page) {
  await anmelden(page);
  await page.goto(KIOSK_URL, { waitUntil: 'domcontentloaded' });
  await page.locator('.k-tab[data-tab="drax"]').click();
  await expect(page.locator('#drax-body .dx-row').first()).toBeVisible({ timeout: 20000 });
}

test.describe('Drax-Bestellung', () => {

  test('TC-F4-01: Artikel stehen nach Warengruppe, Nummer in eigener Spalte', async ({ page }) => {
    await mockDrax(page);
    await oeffne(page);

    const gruppen = page.locator('#drax-body .dx-grp');
    await expect(gruppen).toHaveCount(2);
    await expect(gruppen.first()).toHaveText('Weizenmehl & Grieß');

    // Die Nummer steht links in eigener Spalte - danach sucht, wer das
    // Blatt gegenliest.
    const ersteZeile = page.locator('#drax-body .dx-row').first();
    await expect(ersteZeile.locator('.dx-nr')).toHaveText('40401');
    await expect(ersteZeile.locator('.dx-nm')).toContainText('Weizenmehl Type 405');
    // Die Gebindegroesse steht als Einheit daneben; zwei Zeilen tragen
    // denselben Namen und unterscheiden sich nur darin.
    await expect(ersteZeile.locator('.dx-eh')).toHaveText('1 kg');
  });

  test('TC-F3-01: Preise kommen im Bestellschirm nicht vor', async ({ page }) => {
    await mockDrax(page);
    await oeffne(page);
    const text = await page.locator('#drax-body').innerText();
    expect(text).not.toMatch(/€|EUR/);
  });

  test('TC-F2-01: Vorbelegte Mengen sind markiert und nennen ihre Herkunft', async ({ page }) => {
    await mockDrax(page);
    await oeffne(page);

    const vor = page.locator('#drax-body .dx-row.vor');
    await expect(vor).toHaveCount(2);
    await expect(vor.first().locator('.dx-tag.vor')).toHaveText('übernommen');
    // Die Herkunft muss auch im Testbetrieb lesbar bleiben - der laeuft,
    // bis die Bestelladresse der Mühle freigegeben ist.
    await expect(page.locator('#drax-body .dx-kontext .z2'))
      .toContainText('Lieferung am 24.09.2026');
    await expect(page.locator('#drax-body .dx-kontext .dx-test')).toHaveText('Testbetrieb');
    await expect(page.locator('#drax-foot, #dx-foot').first())
      .toContainText('übernommen');
  });

  test('TC-F2-02: Angefasste Menge verliert die Übernahme-Markierung', async ({ page }) => {
    await mockDrax(page);
    await oeffne(page);

    const zeile = page.locator('#drax-body .dx-row').filter({ hasText: 'Type 405' }).first();
    await expect(zeile).toHaveClass(/vor/);
    await zeile.locator('.dx-cnt button').last().click();

    const neu = page.locator('#drax-body .dx-row').filter({ hasText: 'Type 405' }).first();
    await expect(neu).toHaveClass(/has/);
    await expect(neu).not.toHaveClass(/vor/);
    await expect(neu.locator('.dx-cnt input')).toHaveValue('5');
  });

  test('TC-F3-02: Mengenfeld nimmt nur Zahlen an', async ({ page }) => {
    await mockDrax(page);
    await oeffne(page);

    const zeile = page.locator('#drax-body .dx-row').filter({ hasText: 'Type 550' }).first();
    await zeile.locator('.dx-cnt input').fill('abc');
    await zeile.locator('.dx-cnt input').blur();
    const neu = page.locator('#drax-body .dx-row').filter({ hasText: 'Type 550' }).first();
    await expect(neu.locator('.dx-cnt input')).toHaveValue('');

    await neu.locator('.dx-cnt input').fill('12');
    await neu.locator('.dx-cnt input').blur();
    await expect(page.locator('#drax-body .dx-row').filter({ hasText: 'Type 550' })
      .first().locator('.dx-cnt input')).toHaveValue('12');
  });

  test('Minus unter null löscht die Position, statt negativ zu werden', async ({ page }) => {
    await mockDrax(page, { positionen: [{ nr: '40401', menge: 1 }] });
    await oeffne(page);

    const zeile = page.locator('#drax-body .dx-row').first();
    await zeile.locator('.dx-cnt button').first().click();
    const neu = page.locator('#drax-body .dx-row').first();
    await expect(neu.locator('.dx-cnt input')).toHaveValue('');
    await neu.locator('.dx-cnt button').first().click();
    await expect(page.locator('#drax-body .dx-row').first().locator('.dx-cnt input'))
      .toHaveValue('');
  });

  test('TC-F8-01: Der Bestellschluss steht mit Countdown im Kopf', async ({ page }) => {
    await mockDrax(page);
    await oeffne(page);
    const zeile = page.locator('#dx-schluss');
    await expect(zeile).toHaveClass(/offen/);
    await expect(zeile).toContainText('Bestellschluss');
    await expect(zeile).toContainText('Mittwoch');
  });

  test('TC-F8-02: Nach dem Schluss drängt die Zeile sichtbar', async ({ page }) => {
    await mockDrax(page, { verstrichen: true });
    await oeffne(page);
    const zeile = page.locator('#dx-schluss');
    await expect(zeile).toHaveClass(/eilt/);
    await expect(zeile).toContainText('sofort senden');
  });

  test('TC-F6-01: Senden fragt nach und schickt die Positionen', async ({ page }) => {
    const gesendet = await mockDrax(page);
    await oeffne(page);

    page.on('dialog', (d) => {
      expect(d.message()).toContain('Testadresse');
      d.accept();
    });
    await page.locator('#dx-foot .dx-send').click();
    await expect.poll(() => gesendet.filter((g) => /\/senden/.test(g.url)).length)
      .toBeGreaterThan(0);

    const ruf = gesendet.find((g) => /\/senden/.test(g.url));
    expect(ruf.body.positionen).toEqual([
      { nr: '40401', menge: 4 }, { nr: '88949', menge: 2 },
    ]);
  });

  test('TC-F7-01: Gesendetes ist gesperrt und nur über Korrektur änderbar', async ({ page }) => {
    await mockDrax(page, { status: 1 });
    await oeffne(page);

    // Keine Mengenfelder mehr - die Zahlen stehen fest.
    await expect(page.locator('#drax-body .dx-cnt input')).toHaveCount(0);
    await expect(page.locator('#dx-schluss')).toContainText('versendet');

    await page.locator('#dx-foot .dx-btn', { hasText: 'Korrigieren' }).click();
    await expect(page.locator('#drax-body .dx-cnt input').first()).toBeVisible();
    await expect(page.locator('#dx-foot')).toContainText('Korrektur senden');
  });

  test('TC-F9-01: Der Verlauf nennt Lieferungen und kennzeichnet Ausnahmen', async ({ page }) => {
    await mockDrax(page);
    await oeffne(page);

    await page.locator('.mb-sub', { hasText: 'Verlauf' }).click();
    const zeilen = page.locator('#drax-body .dx-tab tbody tr');
    await expect(zeilen).toHaveCount(2);
    await expect(zeilen.first()).toContainText('24.09.2026');
    await expect(zeilen.nth(1)).toContainText('Ausnahme');
  });

  test('TC-F10-01: Der Artikelstamm weist die Nummer als unveränderlich aus', async ({ page }) => {
    await mockDrax(page);
    await oeffne(page);

    await page.locator('.mb-sub', { hasText: 'Artikel' }).click();
    await expect(page.locator('#drax-body .dx-hint').first())
      .toContainText('Artikelnummer lässt sich nicht ändern');
    await expect(page.locator('#drax-body .dx-tab tbody tr')).toHaveCount(4);
  });

  test('TC-F10-02: Artikel anlegen schickt Nummer, Name und Gruppe', async ({ page }) => {
    const gesendet = await mockDrax(page);
    await oeffne(page);

    await page.locator('.mb-sub', { hasText: 'Artikel' }).click();
    await page.locator('.dx-btn', { hasText: 'Artikel anlegen' }).click();
    await page.locator('#dx-n-nr').fill('45020');
    await page.locator('#dx-n-name').fill('Roggenmehl Type 610');
    await page.locator('#dx-n-eh').fill('1 kg');
    await page.locator('.dx-send', { hasText: 'Anlegen' }).click();

    await expect.poll(() => gesendet.filter((g) => g.method === 'POST'
      && /drax-artikel/.test(g.url)).length).toBeGreaterThan(0);
    const ruf = gesendet.find((g) => /drax-artikel/.test(g.url));
    expect(ruf.body.nr).toBe('45020');
    expect(ruf.body.name).toBe('Roggenmehl Type 610');
    expect(ruf.body.gruppe).toBe('weizenmehl');
  });

  test('TC-F11-01: Der Testbetrieb ist in den Einstellungen benannt', async ({ page }) => {
    await mockDrax(page);
    await oeffne(page);

    await page.locator('.mb-sub', { hasText: 'Einstellungen' }).click();
    await expect(page.locator('#drax-body .dx-warn')).toContainText('Testbetrieb');
    await expect(page.locator('#dx-c-kd')).toHaveValue('11225');
    await expect(page.locator('#dx-c-uhr')).toHaveValue('12:00');
  });

  test('Suche und „Nur bestellt" grenzen die lange Liste ein', async ({ page }) => {
    await mockDrax(page);
    await oeffne(page);

    await page.locator('#dx-q').fill('88949');
    await expect(page.locator('#drax-body .dx-row')).toHaveCount(1);

    await page.locator('#dx-q').fill('');
    await expect(page.locator('#drax-body .dx-row')).toHaveCount(4);

    await page.locator('.dx-tgl button', { hasText: 'Nur bestellt' }).click();
    await expect(page.locator('#drax-body .dx-row')).toHaveCount(2);
  });

  test('Die Liste rollt eigenständig, Kopf und Fuß bleiben stehen', async ({ page }) => {
    await mockDrax(page);
    await oeffne(page);

    // Genau das war der Mangel, der den Bestellreitern auf dem Telefon
    // vorgeworfen wurde: Alles lag in einem hohen Block, die Sendeknöpfe
    // erst nach der letzten Artikelzeile.
    const fuss = page.locator('#dx-foot');
    await expect(fuss).toBeInViewport();
    await expect(page.locator('#drax-body .dx-days')).toBeInViewport();

    const rollbar = await page.locator('#drax-body .dx-liste').evaluate(
      (el) => getComputedStyle(el).overflowY);
    expect(rollbar).toBe('auto');
  });

  test('Die Bereichsknöpfe stehen auf dem Telefon in einer Zeile', async ({ page }) => {
    await mockDrax(page);
    await oeffne(page);

    // Eine zweite Zeile kostete 46 px Kopfhöhe, die der Artikelliste
    // fehlten (Spec kiosk-bestellreiter-mobil, F2).
    const oben = await page.locator('#drax-body .mb-subs .mb-sub')
      .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(new Set(oben).size).toBe(1);
  });

  test('Der Liefertag lässt sich wechseln', async ({ page }) => {
    await mockDrax(page);
    await oeffne(page);

    const tage = page.locator('#drax-body .dx-day');
    await expect(tage).toHaveCount(4);
    await expect(tage.first()).toHaveClass(/on/);
    await tage.nth(1).click();
    await expect(page.locator('#drax-body .dx-day').nth(1)).toHaveClass(/on/);
  });
});
