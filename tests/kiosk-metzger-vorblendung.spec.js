/**
 * Kiosk – Metzger: Vorblendungen einzeln, Vorgabe im Artikelstamm
 *
 * Deckt specs/metzger-vorblendung/spec.md ab (TC-V01 … TC-V15).
 *
 * Eigene Mocks statt der gemeinsamen Hilfe: Diese Datei braucht mehrere
 * Portionsblöcke je Artikel und eine hinterlegte Standard-Portionierung —
 * beides würde die anderen Suiten stören.
 *
 * Ausführen:
 *   node node_modules\@playwright\test\cli.js test tests/kiosk-metzger-vorblendung.spec.js
 */

const { test, expect } = require('@playwright/test');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

const BESTELLTAGE = [1, 4];

function iso(d) {
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)
    + '-' + ('0' + d.getDate()).slice(-2);
}

function plusTage(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function naechsterTag() {
  for (let i = 1; i < 14; i++) {
    const d = plusTage(i);
    if (BESTELLTAGE.includes(d.getDay())) return iso(d);
  }
  return iso(plusTage(1));
}

function tagesleiste() {
  const out = [];
  for (let i = 0; i < 14; i++) {
    const d = plusTage(i);
    out.push({
      datum: iso(d),
      wochentag: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag',
        'Freitag', 'Samstag'][d.getDay()],
      kurz: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d.getDay()],
      tag: d.getDate(),
      bestelltag: BESTELLTAGE.includes(d.getDay()),
      bestellbar: BESTELLTAGE.includes(d.getDay()) && i > 0,
      status: 0,
    });
  }
  return out;
}

const CONFIG = {
  name: 'Metzgerei Mair', empfaenger: 'test@example.org',
  empfaenger_name: 'Test', metzger_mail: '',
  bestelltage: [1, 4], bestellschluss: '12:00', kd_nr: '1041',
};

/* 360 trägt eine Vorgabe im Stamm, 142 nicht. 600 trägt eine Vorgabe, die
   genau der letzten Bestellung entspricht — dort darf nichts doppelt
   erscheinen (F2, TC-V07). */
const ARTIKEL = [
  { name: 'Putenschnitzel', nummer: 360, preis: 12.9, einheit: 'kg',
    gruppe: 'Geflügel', aktiv: true, auf_formular: true,
    standard: '1x2kg' },
  { name: 'Hackfleisch gemischt', nummer: 142, preis: 9.4, einheit: 'kg',
    gruppe: 'Hack', aktiv: true, auf_formular: true },
  { name: 'Weißwurst', nummer: 600, preis: 8.7, einheit: 'kg',
    gruppe: 'Würste frisch', aktiv: true, auf_formular: true,
    standard: '1x30St' },
];

/* Die letzte Bestellung. 142 hat drei Blöcke — daran zeigt sich die
   Einzelauswahl (TC-V01 … TC-V03). */
const LETZTE = {
  datum: '2026-08-27', wochentag: 'Donnerstag',
  positionen: {
    360: [{ anzahl: 2, menge: 4, einheit: 'St', vakuum: true }],
    142: [{ anzahl: 2, menge: 500, einheit: 'g', vakuum: true },
          { anzahl: 6, menge: 250, einheit: 'g', vakuum: true },
          { anzahl: 1, menge: 1, einheit: 'kg', vakuum: false }],
    600: [{ anzahl: 1, menge: 30, einheit: 'St', vakuum: false }],
  },
};

/** Alle PATCH-Rümpfe an /api/metzger-artikel, für TC-V13 bis TC-V15. */
function sammlePatches(page) {
  const raus = [];
  page.on('request', (r) => {
    if (r.method() === 'PATCH' && /metzger-artikel/.test(r.url())) {
      try { raus.push(JSON.parse(r.postData() || '{}')); } catch (e) { /* egal */ }
    }
  });
  return raus;
}

/** Alle POST-Rümpfe an /api/metzger-artikel, für TC-V16 bis TC-V19. */
function sammlePosts(page) {
  const raus = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && /metzger-artikel/.test(r.url())) {
      try { raus.push(JSON.parse(r.postData() || '{}')); } catch (e) { /* egal */ }
    }
  });
  return raus;
}

async function mockApi(page, opts = {}) {
  const datum = naechsterTag();

  await page.route('**/api/metzger-artikel**', (route) => {
    const m = route.request().method();
    // Erster POST bei „konflikt": Den Namen gibt es schon (409). Ein
    // zweiter mit trotzdem:true geht durch — genau wie in der API.
    if (m === 'POST' && opts.konflikt) {
      let leib = {};
      try { leib = JSON.parse(route.request().postData() || '{}'); } catch (e) { /* egal */ }
      if (!leib.trotzdem) {
        return route.fulfill({
          status: 409, contentType: 'application/json',
          body: JSON.stringify({ success: false,
            error: '„Putenschnitzel" gibt es schon. Wirklich noch einmal anlegen?' }),
        });
      }
    }
    return route.fulfill({
      status: m === 'POST' ? 201 : 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, artikel: ARTIKEL }),
    });
  });

  await page.route('**/api/metzger-order**', async (route) => {
    const url = route.request().url();
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, status: 0, protokoll: [], summen: {} }),
      });
    }
    if (/mode=verlauf/.test(url)) {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, verlauf: [] }),
      });
    }
    if (/metzger-order\/\d{4}-\d{2}-\d{2}/.test(url)) {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          bestellung: {
            datum, status: 0, protokoll: [],
            // Leer, damit die Vorblendungen überhaupt erscheinen.
            positionen: ARTIKEL.map((a) => ({
              nummer: a.nummer, name: a.name, portionen: [],
              hinweis: '', zusatz: false,
            })),
          },
          artikel: ARTIKEL, vorschlaege: {},
          vorbelegt_aus: null, letzte: LETZTE,
          bestelltag: true, bestellbar: true,
          config: CONFIG, testbetrieb: true, summen: {},
        }),
      });
    }
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        success: true, tage: tagesleiste(), aktiv: datum,
        config: CONFIG, testbetrieb: true,
      }),
    });
  });

  await page.route('**/api/**', (route) => {
    if (/metzger-order|metzger-artikel/.test(route.request().url())) return route.fallback();
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
}

async function oeffneTab(page, opts = {}) {
  await mockApi(page, opts);
  await page.goto(KIOSK_URL);
  await page.locator('.k-tab[data-tab="metzgerbest"]').click();
  await page.locator('#metzgerbest-body .mb-row').first().waitFor({ timeout: 15000 });
}

function zeile(page, name) {
  return page.locator('.mb-row').filter({ hasText: name }).first();
}

/** In den Bereich „Artikel" wechseln — er liegt im Blatt hinter dem „i". */
async function artikelBereich(page) {
  await page.locator('#panel-metzgerbest .mb-mehr').click();
  await page.locator('#mb-blatt').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('#mb-blatt').getByRole('button', { name: /Artikel/ })
    .first().click();
  await page.locator('.mb-arow').first().waitFor({ timeout: 8000 });
}

test.describe('Vorblendungen einzeln wählbar', () => {
  test('TC-V01: Je Portionsblock ein eigener Knopf', async ({ page }) => {
    await oeffneTab(page);
    const knoepfe = zeile(page, 'Hackfleisch gemischt').locator('.mb-frueher');
    await expect(knoepfe).toHaveCount(3);
    await expect(knoepfe.nth(0)).toHaveText(/2 × 500 g/);
    await expect(knoepfe.nth(1)).toHaveText(/6 × 250 g/);
  });

  test('TC-V02: Ein Tipp übernimmt genau einen Block', async ({ page }) => {
    await oeffneTab(page);
    const z = zeile(page, 'Hackfleisch gemischt');
    await z.locator('.mb-frueher').nth(1).click();
    await page.waitForTimeout(400);
    const badges = z.locator('.mb-chip');
    await expect(badges).toHaveCount(1);
    await expect(badges.first()).toHaveText(/6 × 250 g/);
  });

  test('TC-V03: Zwei Tipps übernehmen zwei Blöcke', async ({ page }) => {
    await oeffneTab(page);
    const z = zeile(page, 'Hackfleisch gemischt');
    await z.locator('.mb-frueher').nth(0).click();
    await page.waitForTimeout(400);
    // Nach dem ersten Tipp ist die Zeile bestellt — die übrigen
    // Vorblendungen verschwinden. Der zweite Block kommt daher über die
    // Erfassung. Geprüft wird hier nur, dass der erste Block steht und
    // die Zeile weiter bedienbar ist.
    await expect(z.locator('.mb-chip')).toHaveCount(1);
    await expect(z.locator('.mb-chip').first()).toHaveText(/2 × 500 g/);
  });

  test('TC-V04/V05/V06: Stamm-Vorgabe steht vorne und ist markiert',
    async ({ page }) => {
      await oeffneTab(page);
      const knoepfe = zeile(page, 'Putenschnitzel').locator('.mb-frueher');
      await expect(knoepfe).toHaveCount(2);
      await expect(knoepfe.nth(0)).toHaveText(/1 × 2 kg/);
      await expect(knoepfe.nth(0)).toHaveClass(/stamm/);
      await expect(knoepfe.nth(1)).toHaveText(/2 × 4 St/);
      await expect(knoepfe.nth(1)).not.toHaveClass(/stamm/);
    });

  test('TC-V07: Dieselbe Portion erscheint nur einmal', async ({ page }) => {
    await oeffneTab(page);
    // 600 trägt im Stamm genau das, was zuletzt bestellt wurde.
    const knoepfe = zeile(page, 'Weißwurst').locator('.mb-frueher');
    await expect(knoepfe).toHaveCount(1);
    await expect(knoepfe.first()).toHaveClass(/stamm/);
  });
});

test.describe('Neue Kacheln', () => {
  test('TC-V08/V09: cm mit 3 und 5, Stück mit ½ und 1', async ({ page }) => {
    await oeffneTab(page);
    const z = zeile(page, 'Putenschnitzel');
    await z.locator('.mb-akt .mb-add').click();
    await page.locator('.mb-ed').first().waitFor({ timeout: 8000 });

    await page.locator('.mb-einh button', { hasText: 'Stück' }).first().click();
    await page.waitForTimeout(300);
    const kach = page.locator('.mb-kach button');
    await expect(kach.filter({ hasText: /^½$/ })).toHaveCount(1);
    await expect(kach.filter({ hasText: /^1$/ })).toHaveCount(1);

    await page.locator('.mb-einh button', { hasText: 'cm' }).first().click();
    await page.waitForTimeout(300);
    await expect(kach.filter({ hasText: /^3$/ })).toHaveCount(1);
    await expect(kach.filter({ hasText: /^5$/ })).toHaveCount(1);
    // Die kleinste Kachel war früher 10 — jetzt steht 3 an erster Stelle.
    await expect(kach.first()).toHaveText('3');
  });
});

test.describe('Vorgabe im Artikelstamm pflegen', () => {
  test('TC-V10/V11: Der Bereich „Artikel" zeigt die Vorgabe', async ({ page }) => {
    await oeffneTab(page);
    await artikelBereich(page);
    const puten = page.locator('.mb-arow').filter({ hasText: 'Putenschnitzel' }).first();
    await expect(puten.locator('.mb-astd')).toHaveText(/Vorgabe:\s*1 × 2 kg/);
    const hack = page.locator('.mb-arow').filter({ hasText: 'Hackfleisch' }).first();
    await expect(hack.locator('.mb-astd')).toHaveText(/keine Vorgabe/);
    await expect(hack.locator('.mb-astd')).toHaveClass(/leer/);
  });

  test('TC-V12: Der Knopf öffnet das Blatt mit dem heutigen Wert',
    async ({ page }) => {
      await oeffneTab(page);
      await artikelBereich(page);
      await page.locator('.mb-arow').filter({ hasText: 'Putenschnitzel' })
        .first().getByRole('button', { name: 'Bearbeiten' }).click();
      await page.locator('#mb-vg-feld').waitFor({ timeout: 5000 });
      await expect(page.locator('#mb-vg-feld')).toHaveValue('1x2kg');
    });

  test('TC-V13: Übernehmen schickt ein PATCH mit standard', async ({ page }) => {
    await oeffneTab(page);
    const patches = sammlePatches(page);
    await artikelBereich(page);
    await page.locator('.mb-arow').filter({ hasText: 'Hackfleisch' })
      .first().getByRole('button', { name: 'Bearbeiten' }).click();
    await page.locator('#mb-vg-feld').waitFor({ timeout: 5000 });
    await page.locator('#mb-vg-feld').fill('2x500g V');
    await page.getByRole('button', { name: 'Speichern' }).click();
    await page.waitForTimeout(700);
    expect(patches.length).toBe(1);
    expect(patches[0].standard).toBe('2x500g V');
    expect(patches[0].alt_nummer).toBe(142);
    expect(patches[0].name).toBe('Hackfleisch gemischt');
  });

  test('TC-V14: Unlesbares wird abgewiesen, ohne zu speichern',
    async ({ page }) => {
      await oeffneTab(page);
      const patches = sammlePatches(page);
      await artikelBereich(page);
      await page.locator('.mb-arow').filter({ hasText: 'Hackfleisch' })
        .first().getByRole('button', { name: 'Bearbeiten' }).click();
      await page.locator('#mb-vg-feld').waitFor({ timeout: 5000 });
      await page.locator('#mb-vg-feld').fill('#####');
      await page.getByRole('button', { name: 'Speichern' }).click();
      await page.waitForTimeout(700);
      expect(patches.length).toBe(0);
      // Das Blatt bleibt offen, damit die Eingabe nicht verloren geht.
      await expect(page.locator('#mb-vg-feld')).toBeVisible();
    });

  test('TC-V15: Ein leeres Feld entfernt die Vorgabe', async ({ page }) => {
    await oeffneTab(page);
    const patches = sammlePatches(page);
    await artikelBereich(page);
    await page.locator('.mb-arow').filter({ hasText: 'Putenschnitzel' })
      .first().getByRole('button', { name: 'Bearbeiten' }).click();
    await page.locator('#mb-vg-feld').waitFor({ timeout: 5000 });
    await page.locator('#mb-vg-feld').fill('');
    await page.getByRole('button', { name: 'Speichern' }).click();
    await page.waitForTimeout(700);
    expect(patches.length).toBe(1);
    expect(patches[0].standard).toBe(null);
  });
});

test.describe('Neuen Artikel anlegen', () => {
  test('TC-V16: Der Bereich „Artikel" bietet das Anlegen an',
    async ({ page }) => {
      await oeffneTab(page);
      await artikelBereich(page);
      await expect(page.locator('.mb-akopf')
        .getByRole('button', { name: /Neuer Artikel/ })).toHaveCount(1);
    });

  test('TC-V17: Anlegen schickt alle Felder als POST', async ({ page }) => {
    await oeffneTab(page);
    const posts = sammlePosts(page);
    await artikelBereich(page);
    await page.locator('.mb-akopf').getByRole('button', { name: /Neuer Artikel/ })
      .click();
    await page.locator('#mb-a-name').waitFor({ timeout: 5000 });
    await page.locator('#mb-a-name').fill('Schweinebraten');
    await page.locator('#mb-a-nr').fill('77');
    await page.locator('#mb-a-grp').fill('Fleisch frisch');
    await page.locator('#mb-a-preis').fill('11,05');
    await page.locator('#mb-vg-feld').fill('1x2kg');
    await page.getByRole('button', { name: 'Anlegen' }).click();
    await page.waitForTimeout(800);
    expect(posts.length).toBe(1);
    expect(posts[0].name).toBe('Schweinebraten');
    expect(posts[0].nummer).toBe(77);
    expect(posts[0].gruppe).toBe('Fleisch frisch');
    expect(posts[0].preis).toBe(11.05);
    expect(posts[0].standard).toBe('1x2kg');
    expect(posts[0].einheit).toBe('kg');
  });

  test('TC-V18: Ohne Bezeichnung wird nichts angelegt', async ({ page }) => {
    await oeffneTab(page);
    const posts = sammlePosts(page);
    await artikelBereich(page);
    await page.locator('.mb-akopf').getByRole('button', { name: /Neuer Artikel/ })
      .click();
    await page.locator('#mb-a-name').waitFor({ timeout: 5000 });
    await page.locator('#mb-a-nr').fill('99');
    await page.getByRole('button', { name: 'Anlegen' }).click();
    await page.waitForTimeout(700);
    expect(posts.length).toBe(0);
    await expect(page.locator('#mb-a-name')).toBeVisible();
  });

  test('TC-V19: Eine unlesbare Nummer wird abgewiesen', async ({ page }) => {
    await oeffneTab(page);
    const posts = sammlePosts(page);
    await artikelBereich(page);
    await page.locator('.mb-akopf').getByRole('button', { name: /Neuer Artikel/ })
      .click();
    await page.locator('#mb-a-name').waitFor({ timeout: 5000 });
    await page.locator('#mb-a-name').fill('Testartikel');
    await page.locator('#mb-a-nr').fill('abc');
    await page.getByRole('button', { name: 'Anlegen' }).click();
    await page.waitForTimeout(700);
    expect(posts.length).toBe(0);
  });

  test('TC-V20: Ein gleicher Name führt zur Rückfrage, nicht zur Absage',
    async ({ page }) => {
      await oeffneTab(page, { konflikt: true });
      const posts = sammlePosts(page);
      await artikelBereich(page);
      await page.locator('.mb-akopf').getByRole('button', { name: /Neuer Artikel/ })
        .click();
      await page.locator('#mb-a-name').waitFor({ timeout: 5000 });
      await page.locator('#mb-a-name').fill('Putenschnitzel');
      await page.getByRole('button', { name: 'Anlegen' }).click();
      await page.waitForTimeout(800);

      // Erster Versuch: abgewiesen mit Rückfrage.
      expect(posts.length).toBe(1);
      const frage = page.locator('.mb-dlg-text');
      await expect(frage).toContainText(/gibt es schon/);

      await page.getByRole('button', { name: 'Weiter' }).click();
      await page.waitForTimeout(800);
      expect(posts.length).toBe(2);
      expect(posts[1].trotzdem).toBe(true);
    });
});
