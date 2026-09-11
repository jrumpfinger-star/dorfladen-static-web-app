/**
 * Erfassung und Filter im Kiosk — der Wächter
 * Spec: specs/kiosk-erfassung-filter/spec.md
 * Mockup (abgenommen): mockups/erfassung-filter-mockup.html
 *
 * Zwei Beschwerden stehen dahinter:
 *   1. Die Portions-Erfassung bei Mair — Artikelname verschwindet, Erfassung
 *      passt nicht aufs Bild, die Liste springt.
 *   2. Die Filter stecken im Info-Blatt hinter dem „i" — in allen drei Reitern.
 *
 * Dieser Test ist vor der Umsetzung entstanden und beschreibt das Ziel.
 *
 *   $env:TEST_URL='http://127.0.0.1:8811'
 *   node node_modules\@playwright\test\cli.js test tests/kiosk-erfassung-filter.spec.js
 */

const { test, expect } = require('@playwright/test');
const { mockApi, ARTIKEL_LANG } = require('./helpers/bestellreiter-mocks');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

const KLEIN = { width: 360, height: 640 };     // kleines Telefon, engster Fall
const HOCH = { width: 390, height: 900 };      // hoher Schirm (≥ 820)

/* Echte Vorschlagsform: je Artikelnummer eine Liste von Portionsbündeln. */
const VORSCHLAEGE = {
  1: [{ portionen: [{ anzahl: 1, menge: 1.5, einheit: 'kg', vakuum: false }],
        belege: 4, quelle: 'bestellung' },
      { portionen: [{ anzahl: 2, menge: 500, einheit: 'g', vakuum: true }],
        belege: 2, quelle: 'lieferung' }],
};

const REITER = [
  { tab: 'baecker', name: 'Bäcker', p: 'bk', zeile: '.bk-row' },
  { tab: 'metzgerbest', name: 'Mair', p: 'mb', zeile: '.mb-row' },
  { tab: 'getraenke', name: 'Getränke', p: 'gk', zeile: '.gk-row' },
];

async function oeffne(page, tab, opts) {
  await mockApi(page, opts);
  await page.goto(KIOSK_URL);
  await page.waitForFunction(() => !!window.K, null, { timeout: 20000 });
  await page.evaluate((t) => window.K.switchTab(t), tab);
  // Getränke lädt in zwei Schritten; 2600 ms decken beide ab.
  await page.waitForTimeout(2600);
}

/** Öffnet die Erfassung bei einem Artikel und gibt dessen Zeile zurück. */
async function erfassungOeffnen(page, name) {
  const row = page.locator('.mb-row').filter({ hasText: name }).first();
  await row.locator('.mb-add').first().click();
  await expect(row.locator('.mb-ed')).toBeVisible({ timeout: 5000 });
  return row;
}

/* ══════════════════════════════════════════════════════════════════════
   F1 + F2 — Artikel sichtbar, Liste steht still
   ══════════════════════════════════════════════════════════════════════ */

test.describe('Erfassung bei Mair', () => {

  test('TC-F1-01: Artikelname bleibt beim Öffnen sichtbar', async ({ page }) => {
    await page.setViewportSize(KLEIN);
    await oeffne(page, 'metzgerbest', { metzgerLeer: true });

    // Ein Artikel weit unten — dort ist der Platz nach unten am knappsten.
    const name = ARTIKEL_LANG[ARTIKEL_LANG.length - 2].name;
    const row = await erfassungOeffnen(page, name);

    const lage = await row.evaluate((el) => {
      const liste = el.closest('.k-liste');
      const l = liste.getBoundingClientRect();
      const nm = el.querySelector('.mb-nm').getBoundingClientRect();
      const erf = el.querySelector('.mb-erf, .mb-ed').getBoundingClientRect();
      return {
        nameOben: Math.round(nm.top - l.top),
        nameUnten: Math.round(l.bottom - nm.bottom),
        erfUnten: Math.round(l.bottom - erf.bottom),
      };
    });
    expect(lage.nameOben,
      `Der Artikelname liegt ${-lage.nameOben} px über dem Listenrand — `
      + 'er ist aus dem Bild gerutscht.').toBeGreaterThanOrEqual(-1);
    expect(lage.nameUnten,
      'Der Artikelname liegt unterhalb des Listenrandes.').toBeGreaterThanOrEqual(0);
    expect(lage.erfUnten,
      `Die Erfassung ragt ${-lage.erfUnten} px über den Listenrand hinaus — `
      + 'sie ist nicht ganz sichtbar.').toBeGreaterThanOrEqual(-1);
  });

  test('TC-F1-02: Die Erfassung steht unter dem Artikel', async ({ page }) => {
    await page.setViewportSize(KLEIN);
    await oeffne(page, 'metzgerbest', { metzgerLeer: true });
    const row = await erfassungOeffnen(page, ARTIKEL_LANG[0].name);
    const ok = await row.evaluate((el) => {
      const nm = el.querySelector('.mb-nm').getBoundingClientRect();
      const ed = el.querySelector('.mb-ed').getBoundingClientRect();
      return ed.top >= nm.bottom - 1;
    });
    expect(ok, 'Die Erfassung liegt nicht unterhalb des Artikelnamens').toBe(true);
  });

  test('TC-F2-01: Eine Kachel verschiebt die Zeile nicht', async ({ page }) => {
    await page.setViewportSize(KLEIN);
    await oeffne(page, 'metzgerbest', { metzgerLeer: true });
    const row = await erfassungOeffnen(page, ARTIKEL_LANG[2].name);

    const vorher = await row.evaluate((el) =>
      Math.round(el.getBoundingClientRect().top - el.closest('.k-liste').getBoundingClientRect().top));
    await row.locator('.mb-kach button', { hasText: '½' }).first().click();
    await page.waitForTimeout(500);

    await expect(row.locator('.mb-chip'),
      'Die Kachel hat keine Portion angelegt').toHaveCount(1);
    const nachher = await row.evaluate((el) =>
      Math.round(el.getBoundingClientRect().top - el.closest('.k-liste').getBoundingClientRect().top));
    expect(Math.abs(nachher - vorher),
      `Die Zeile ist nach dem Erfassen um ${nachher - vorher} px gesprungen.`)
      .toBeLessThanOrEqual(4);
  });

  test('TC-F2-02: Der Rollstand überlebt das Öffnen', async ({ page }) => {
    await page.setViewportSize(KLEIN);
    await oeffne(page, 'metzgerbest', { metzgerLeer: true });
    await page.locator('#panel-metzgerbest .k-liste').evaluate((el) => { el.scrollTop = 400; });
    await page.waitForTimeout(200);
    const vorher = await page.locator('#panel-metzgerbest .k-liste')
      .evaluate((el) => el.scrollTop);
    expect(vorher, 'Die Liste liess sich nicht rollen').toBeGreaterThan(100);

    const sichtbar = await page.evaluate(() => {
      const liste = document.querySelector('#panel-metzgerbest .k-liste');
      const l = liste.getBoundingClientRect();
      const row = [...liste.querySelectorAll('.mb-row')].find((r) => {
        const b = r.getBoundingClientRect();
        return b.top >= l.top && b.bottom <= l.bottom;
      });
      return row ? row.dataset.key : null;
    });
    expect(sichtbar, 'Keine Zeile ganz im Bild').not.toBeNull();
    await page.locator(`.mb-row[data-key="${sichtbar}"] .mb-add`).first().click();
    await page.waitForTimeout(500);

    const nachher = await page.locator('#panel-metzgerbest .k-liste')
      .evaluate((el) => el.scrollTop);
    expect(nachher,
      `Der Rollstand ist von ${vorher} auf ${nachher} gefallen — die Liste ist `
      + 'an den Anfang gesprungen.').toBeGreaterThan(100);
  });

  /* ══════════ F3 — Reihenfolge ══════════ */

  test('TC-F3-01: Reihenfolge Anzahl → vak → Einheit → Menge', async ({ page }) => {
    await page.setViewportSize(KLEIN);
    await oeffne(page, 'metzgerbest', { metzgerLeer: true });
    const row = await erfassungOeffnen(page, ARTIKEL_LANG[0].name);

    const lage = await row.evaluate((el) => {
      const q = (s) => { const e = el.querySelector(s); return e ? e.getBoundingClientRect() : null; };
      const step = q('.mb-step'), vak = q('.mb-vak'), einh = q('.mb-einh'), kach = q('.mb-kach');
      if (!step || !vak || !einh || !kach) {
        return { fehlt: ['.mb-step', '.mb-vak', '.mb-einh', '.mb-kach']
          .filter((s) => !el.querySelector(s)) };
      }
      return { stepX: step.left, vakX: vak.left, einhX: einh.left,
               einhY: einh.top, kachY: kach.top };
    });
    expect(lage.fehlt, `Diese Bausteine fehlen: ${(lage.fehlt || []).join(', ')}`)
      .toBeUndefined();
    expect(lage.stepX, 'Die Anzahl steht nicht links vom vak-Kästchen')
      .toBeLessThan(lage.vakX);
    expect(lage.vakX, 'Das vak-Kästchen steht nicht links von der Einheit')
      .toBeLessThan(lage.einhX);
    expect(lage.kachY, 'Die Mengenkacheln stehen nicht unter der Einheit')
      .toBeGreaterThan(lage.einhY);
  });

  test('TC-F3-02: vak ist kurz beschriftet und schaltet um', async ({ page }) => {
    await page.setViewportSize(KLEIN);
    await oeffne(page, 'metzgerbest', { metzgerLeer: true });
    const row = await erfassungOeffnen(page, ARTIKEL_LANG[0].name);
    const vak = row.locator('.mb-vak');
    await expect(vak).toHaveText(/^\s*vak\s*$/);
    await expect(vak).not.toHaveClass(/\bon\b/);
    await vak.click();
    await expect(vak, 'Das vak-Kästchen schaltet nicht um').toHaveClass(/\bon\b/);
  });

  /* ══════════ F4 — kein Bestätigungsknopf ══════════ */

  test('TC-F4-01: Kein Knopf „Hinzufügen" oder „Ändern" mehr', async ({ page }) => {
    await page.setViewportSize(KLEIN);
    await oeffne(page, 'metzgerbest', { metzgerLeer: true });
    const row = await erfassungOeffnen(page, ARTIKEL_LANG[0].name);
    const treffer = await row.locator('.mb-ed button').evaluateAll((bs) => bs
      .filter((b) => b.getClientRects().length && /Hinzuf(ü|ue)gen|Ändern/i.test(b.textContent))
      .map((b) => b.textContent.trim()));
    expect(treffer, `Diese Knöpfe stehen noch da: ${treffer.join(' · ')}`).toEqual([]);
  });

  test('TC-F4-02: Der Haken erscheint erst mit gültiger Zahl', async ({ page }) => {
    await page.setViewportSize(KLEIN);
    await oeffne(page, 'metzgerbest', { metzgerLeer: true });
    const row = await erfassungOeffnen(page, ARTIKEL_LANG[0].name);

    const haken = row.locator('.mb-frei-ok');
    await expect(haken, 'Der Haken fehlt im Markup').toHaveCount(1);
    await expect(haken, 'Der Haken ist schon ohne Eingabe sichtbar').toBeHidden();

    await row.locator('.mb-mg').fill('233');
    await expect(haken, 'Der Haken erscheint nicht, obwohl eine Zahl dasteht')
      .toBeVisible();
    await haken.click();
    await expect(row.locator('.mb-chip').first(),
      'Der Haken hat keine Portion angelegt').toContainText('233');
  });

  test('TC-F4-03: Die Eingabetaste legt ebenfalls an', async ({ page }) => {
    await page.setViewportSize(KLEIN);
    await oeffne(page, 'metzgerbest', { metzgerLeer: true });
    const row = await erfassungOeffnen(page, ARTIKEL_LANG[0].name);
    await row.locator('.mb-mg').fill('3');
    await row.locator('.mb-mg').press('Enter');
    await expect(row.locator('.mb-chip')).toHaveCount(1);
    await expect(row.locator('.mb-mg'), 'Das Feld wurde nicht geleert').toHaveValue('');
  });

  test('TC-F4-04: Das Verlassen des Feldes legt nichts an', async ({ page }) => {
    await page.setViewportSize(KLEIN);
    await oeffne(page, 'metzgerbest', { metzgerLeer: true });
    const row = await erfassungOeffnen(page, ARTIKEL_LANG[0].name);
    await row.locator('.mb-mg').fill('7');
    await row.locator('.mb-nm').click();
    await page.waitForTimeout(400);
    await expect(row.locator('.mb-chip'),
      'Beim Verlassen des Feldes wurde ungewollt eine Portion angelegt')
      .toHaveCount(0);
  });

  /* ══════════ F5 — + öffnet, − schließt ══════════ */

  test('TC-F5-01: Derselbe Knopf öffnet und schließt', async ({ page }) => {
    await page.setViewportSize(KLEIN);
    await oeffne(page, 'metzgerbest', { metzgerLeer: true });
    const row = page.locator('.mb-row').filter({ hasText: ARTIKEL_LANG[0].name }).first();
    const knopf = row.locator('.mb-add').first();

    await expect(knopf).toHaveText('+');
    await knopf.click();
    await expect(row.locator('.mb-ed')).toBeVisible();
    await expect(knopf, 'Der Knopf zeigt nach dem Öffnen kein Minus').toHaveText('−');
    await knopf.click();
    await expect(row.locator('.mb-ed'),
      'Das Minus schließt die Erfassung nicht').toHaveCount(0);
    await expect(knopf).toHaveText('+');
  });

  test('TC-F5-02: Kein Knopf „Fertig" mehr', async ({ page }) => {
    await page.setViewportSize(KLEIN);
    await oeffne(page, 'metzgerbest', { metzgerLeer: true });
    await erfassungOeffnen(page, ARTIKEL_LANG[0].name);
    const treffer = await page.locator('#panel-metzgerbest button').evaluateAll((bs) => bs
      .filter((b) => b.getClientRects().length && /^\s*Fertig\s*$/.test(b.textContent))
      .length);
    expect(treffer, 'Der Knopf „Fertig" steht noch da').toBe(0);
  });

  /* ══════════ F6 — Höhe entscheidet über den Umfang ══════════ */

  test('TC-F6-01: Niedriger Schirm ohne Kurzeingabe und Hinweisfeld', async ({ page }) => {
    await page.setViewportSize(KLEIN);
    await oeffne(page, 'metzgerbest', { metzgerLeer: true });
    const row = await erfassungOeffnen(page, ARTIKEL_LANG[0].name);
    await expect(row.locator('.mb-g.kurz'),
      'Die Kurzeingabe ist auf dem kleinen Telefon noch sichtbar').toBeHidden();
    await expect(row.locator('.mb-g.hinweis'),
      'Das Hinweisfeld ist auf dem kleinen Telefon noch sichtbar').toBeHidden();
    await expect(row.locator('.mb-hw-knopf'),
      'Ohne Hinweisfeld fehlt der Knopf „Hinweis …" — der Hinweis wäre '
      + 'unerreichbar').toBeVisible();
  });

  test('TC-F6-02: Hoher Schirm mit beiden Feldern', async ({ page }) => {
    await page.setViewportSize(HOCH);
    await oeffne(page, 'metzgerbest', { metzgerLeer: true });
    const row = await erfassungOeffnen(page, ARTIKEL_LANG[0].name);
    await expect(row.locator('.mb-g.kurz')).toBeVisible();
    await expect(row.locator('.mb-g.hinweis')).toBeVisible();
    await expect(row.locator('.mb-hw-knopf')).toBeHidden();
  });

  /* ══════════ Vorschläge bleiben erhalten ══════════ */

  test('TC-F4-05: Ein Vorschlag legt die Portion in einem Tipp an', async ({ page }) => {
    await page.setViewportSize(KLEIN);
    await oeffne(page, 'metzgerbest',
      { metzgerLeer: true, metzgerVorschlaege: VORSCHLAEGE });
    const row = await erfassungOeffnen(page, ARTIKEL_LANG[0].name);
    const vor = row.locator('.mb-sugg button').first();
    await expect(vor, 'Die Vorschläge sind verschwunden').toBeVisible();
    await vor.click();
    // `zahl()` schreibt 1.5 als Bruch: „1 × 1½ kg".
    await expect(row.locator('.mb-chip').first()).toContainText('1½ kg');
  });
});

/* ══════════════════════════════════════════════════════════════════════
   F7 + F8 — Filter in allen drei Reitern
   ══════════════════════════════════════════════════════════════════════ */

test.describe('Filter in allen Bestellreitern', () => {

  for (const r of REITER) {
    test(`TC-F7-01: Keine Filter mehr im „i"-Blatt (${r.name})`, async ({ page }) => {
      await page.setViewportSize(KLEIN);
      await oeffne(page, r.tab);
      await page.locator(`.${r.p}-mehr`).click();
      const blatt = page.locator(`#${r.p}-blatt`);
      await expect(blatt).toBeVisible({ timeout: 5000 });
      const treffer = await blatt.locator('button').evaluateAll((bs) => bs
        .filter((b) => /^\s*(Übliche|Alle|Nur (bestellte|erfasste))/i.test(b.textContent))
        .map((b) => b.textContent.trim()));
      expect(treffer,
        `${r.name}: Im Info-Blatt stehen noch Filter: ${treffer.join(' · ')}`)
        .toEqual([]);
    });

    test(`TC-F7-02 + TC-F8-01: Filtersymbol auf dem Telefon (${r.name})`, async ({ page }) => {
      await page.setViewportSize(KLEIN);
      await oeffne(page, r.tab);
      const knopf = page.locator(`#panel-${r.tab === 'metzgerbest' ? 'metzgerbest' : r.tab} .k-filterknopf`);
      await expect(knopf,
        `${r.name}: Kein Filtersymbol neben der Suche`).toBeVisible({ timeout: 5000 });
      const mass = await knopf.boundingBox();
      expect(Math.min(mass.width, mass.height),
        `${r.name}: Das Filtersymbol ist nur ${Math.round(mass.width)} × `
        + `${Math.round(mass.height)} px`).toBeGreaterThanOrEqual(44);
      await expect(page.locator(`#panel-${r.tab} .k-filterzeile`).first(),
        `${r.name}: Auf dem kleinen Telefon ist auch noch die Filterzeile da`)
        .toBeHidden();
    });

    test(`TC-F8-03: Auswahlblatt wählt und schließt (${r.name})`, async ({ page }) => {
      await page.setViewportSize(KLEIN);
      await oeffne(page, r.tab);
      await page.locator(`#panel-${r.tab} .k-filterknopf`).click();
      const blatt = page.locator(`#panel-${r.tab} .k-filterblatt`);
      await expect(blatt).toBeVisible({ timeout: 5000 });
      await blatt.locator('[data-umfang="alle"]').click();
      await expect(blatt, 'Das Auswahlblatt bleibt offen').toBeHidden();
      await expect(page.locator(`#panel-${r.tab} .k-filterknopf .punkt`),
        `${r.name}: Das Symbol zeigt nicht an, dass gefiltert wird`).toBeVisible();
    });

    test(`TC-F8-02: Filterzeile auf hohem Schirm (${r.name})`, async ({ page }) => {
      await page.setViewportSize(HOCH);
      await oeffne(page, r.tab);
      await expect(page.locator(`#panel-${r.tab} .k-filterzeile`).first(),
        `${r.name}: Keine Filterzeile, obwohl Platz ist`).toBeVisible({ timeout: 5000 });
      await expect(page.locator(`#panel-${r.tab} .k-filterknopf`),
        `${r.name}: Filtersymbol und Filterzeile zugleich`).toBeHidden();
      const umfaenge = await page.locator(`#panel-${r.tab} .k-filterzeile [data-umfang]`)
        .evaluateAll((bs) => bs.map((b) => b.dataset.umfang));
      expect(umfaenge.sort(),
        `${r.name}: Es fehlen Umfänge — gefunden: ${umfaenge.join(', ')}`)
        .toEqual(['alle', 'best', 'ueblich']);
    });

    test(`TC-F7-04: Kein zweiter Umschalter am Listenende (${r.name})`, async ({ page }) => {
      await page.setViewportSize(HOCH);
      await oeffne(page, r.tab);
      await expect(page.locator(`#panel-${r.tab} .${r.p}-umfang`),
        `${r.name}: Am Listenende steht noch ein Umfang-Umschalter`).toHaveCount(0);
    });
  }

  test('TC-F7-03: „Nur erfasste" zeigt genau das Erfasste (Mair)', async ({ page }) => {
    await page.setViewportSize(HOCH);
    await oeffne(page, 'metzgerbest', { metzgerLeer: true });

    // Zwei Artikel erfassen.
    for (const name of [ARTIKEL_LANG[0].name, ARTIKEL_LANG[1].name]) {
      const row = await erfassungOeffnen(page, name);
      await row.locator('.mb-kach button', { hasText: '1' }).first().click();
      await page.waitForTimeout(300);
      await row.locator('.mb-add').first().click();     // wieder schliessen
    }
    await page.locator('#panel-metzgerbest .k-filterzeile [data-umfang="best"]').click();
    await page.waitForTimeout(400);
    await expect(page.locator('#panel-metzgerbest .mb-row'),
      '„Nur erfasste" zeigt nicht genau die beiden erfassten Artikel').toHaveCount(2);
  });

  test('TC-F9-01: Das Filtersymbol ist ein Trichter', async ({ page }) => {
    await page.setViewportSize(KLEIN);
    await oeffne(page, 'metzgerbest');
    const klasse = await page.locator('#panel-metzgerbest .k-filterknopf svg')
      .getAttribute('class');
    expect(klasse || '',
      `Das Filtersymbol ist kein list-filter, sondern: ${klasse}`)
      .toContain('list-filter');
  });
});
