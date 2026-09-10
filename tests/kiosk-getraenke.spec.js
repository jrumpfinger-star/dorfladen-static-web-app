/**
 * Kiosk – Getränke-Bestellung (Playwright E2E)
 *
 * Deckt die Test Cases aus specs/getraenke-bestellung/spec.md ab:
 *   F1  Liefertermin frei wählen (keine Bestelltagsleiste)
 *   F2  Artikel nach Warengruppen mit sichtbarem Gebinde
 *   F3  Menge in ganzen Kisten
 *   F4  Vorschläge aus der Bestellhistorie
 *   F5  Vorbelegung aus der letzten Bestellung
 *   F6  Suchen und Filtern
 *   F7  Neue Artikel anlegen
 *   F8  Summen
 *   F9  Bestellmail in gewohnter Schreibweise
 *   F10 Entwurf, Senden, Korrektur
 *   F11 Artikelpflege
 *   F13 Testbetrieb
 *   F14 Responsive über drei Viewports
 *
 * Alle API-Aufrufe werden gemockt. Wichtig: Der Kiosk ist eine PWA – ohne
 * `serviceWorkers: 'block'` beantwortet der Service Worker die Aufrufe aus
 * seinem Cache und die Mocks greifen nicht.
 *
 * Ausführen (gegen einen lokalen Server):
 *   TEST_URL=http://127.0.0.1:8080 npx playwright test tests/kiosk-getraenke.spec.js
 */

const { test, expect } = require('@playwright/test');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

const GRUPPEN = [
  'Bier', 'Limonade Mehrweg', 'Mineralwasser Glas 0,75 l',
  'Mineralwasser Glas 0,5 l', 'Mineralwasser PET 1,0 l',
  'Mineralwasser PET 0,5 l', 'Erfrischungsgetränke PET 0,5 l', 'Säfte',
];

const PFAND = { '20x0,50': 3.10, '12x0,75': 3.30, '12x0,50': 3.30, '6x1,00': 0 };

/** Auszug aus dem echten Katalog – Reihenfolge wie im Seed: nach Warengruppe. */
const ARTIKEL = [
  { nummer: 'KA40015', name: 'Augustiner Hell', bestelltext: 'Augustiner hell 0,5l',
    gebinde: '20x0,50', gruppe: 'Bier', preis: 13.75, pfand: 3.10,
    bestellungen: 4, ueblich: 15, zuletzt: 20, aktiv: true },
  { nummer: 'KA40120', name: 'Tegernseer Hell', bestelltext: 'Tegernseer hell 0,5l',
    gebinde: '20x0,50', gruppe: 'Bier', preis: 15.20, pfand: 3.10,
    bestellungen: 3, ueblich: 2, zuletzt: 2, aktiv: true },
  { nummer: 'KA45001', name: 'Flötzinger Cola-Mix', bestelltext: 'Flötzinger Cola-Mix 0,5l',
    gebinde: '20x0,50', gruppe: 'Limonade Mehrweg', preis: 12.10, pfand: 3.10,
    bestellungen: 5, ueblich: 4, zuletzt: 4, aktiv: true },
  { nummer: 'KA50120', name: 'Aho Individual Sanft Glas', bestelltext: 'Adelh. MIWA sanft Glas 0,75l',
    gebinde: '12x0,75', gruppe: 'Mineralwasser Glas 0,75 l', preis: 7.30, pfand: 3.30,
    bestellungen: 7, ueblich: 8, zuletzt: 8, aktiv: true },
  // Bestellt, aber nie abgerechnet: kein Preis, nur eine Bestellung (F2.3, F6.2).
  { nummer: 'WOLFRA-APFEL', name: 'Wolfra Apfelsaft', bestelltext: 'Wolfra Apfelsaft 0,7l',
    gebinde: '6x1,00', gruppe: 'Säfte', preis: null, pfand: null,
    bestellungen: 1, ueblich: 1, zuletzt: 0, aktiv: true },
  { nummer: 'KA49999', name: 'Alte Sorte', bestelltext: 'Alte Sorte 0,5l',
    gebinde: '20x0,50', gruppe: 'Säfte', preis: 9.90, pfand: 3.10,
    bestellungen: 0, ueblich: null, zuletzt: 0, aktiv: false },
];

/** Die zuletzt gesendete Bestellung: 34 Kisten, 4 Positionen, 412,20 €. */
const LETZTE = {
  datum: '2026-08-26',
  datum_de: '26.08.2026',
  aus_vorlage: true,
  mengen: { 'KA40015': 20, 'KA40120': 2, 'KA45001': 4, 'KA50120': 8 },
  positionen: [
    { nummer: 'KA40015', name: 'Augustiner Hell', bestelltext: 'Augustiner hell 0,5l',
      gebinde: '20x0,50', gruppe: 'Bier', menge: 20, preis: 13.75, zusatz: false },
    { nummer: 'KA40120', name: 'Tegernseer Hell', bestelltext: 'Tegernseer hell 0,5l',
      gebinde: '20x0,50', gruppe: 'Bier', menge: 2, preis: 15.20, zusatz: false },
    { nummer: 'KA45001', name: 'Flötzinger Cola-Mix', bestelltext: 'Flötzinger Cola-Mix 0,5l',
      gebinde: '20x0,50', gruppe: 'Limonade Mehrweg', menge: 4, preis: 12.10, zusatz: false },
    { nummer: 'KA50120', name: 'Aho Individual Sanft Glas', bestelltext: 'Adelh. MIWA sanft Glas 0,75l',
      gebinde: '12x0,75', gruppe: 'Mineralwasser Glas 0,75 l', menge: 8, preis: 7.30, zusatz: false },
  ],
};

const CONFIG = {
  name: 'Getränke Kratzer',
  empfaenger: 'jrumpfinger@t-online.de',
  empfaenger_name: 'Test (Getränke-Bestellung)',
  lieferant_mail: '',
  kd_nr: '15554',
  tour: '1',
};

/** Ein Liefertermin, der sicher in der Zukunft liegt (Spec F1.3). */
function termin() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)
    + '-' + ('0' + d.getDate()).slice(-2);
}

function kalenderwoche(iso) {
  const d = new Date(iso + 'T00:00:00');
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const start = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - start) / 86400000 + 1) / 7);
}

async function mockApi(page, opts = {}) {
  const tag = opts.termin || termin();
  const gesendet = [];

  await page.route('**/api/getraenke-artikel**', async (route) => {
    const req = route.request();
    if (req.method() === 'GET') {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, artikel: ARTIKEL, gruppen: GRUPPEN, pfand: PFAND }),
      });
    }
    const body = JSON.parse(req.postData() || '{}');
    if (req.method() === 'POST') {
      gesendet.push(body);
      // Dublettenprüfung wie im Server: gleiche Bezeichnung -> 409 (F7.4).
      const flach = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const doppelt = ARTIKEL.find((a) => flach(a.name) === flach(body.name));
      if (doppelt && !body.trotzdem) {
        return route.fulfill({
          status: 409, contentType: 'application/json',
          body: JSON.stringify({ success: false, error: `„${doppelt.name}“ gibt es schon.` }),
        });
      }
      return route.fulfill({
        status: 201, contentType: 'application/json',
        // Der Server vergibt eine Hausnummer und gibt den ganzen Katalog
        // zurück – daran hängt die Schlüsselübernahme im Kiosk (TC-F7-07).
        body: JSON.stringify({
          success: true,
          artikel: ARTIKEL.concat([{
            nummer: body.nummer || 'DL-1', name: body.name,
            bestelltext: body.bestelltext || body.name,
            gebinde: body.gebinde || '', gruppe: body.gruppe || '',
            preis: body.preis || null, pfand: null,
            bestellungen: 0, ueblich: null, zuletzt: 0, aktiv: true,
          }]),
        }),
      });
    }
    // PATCH: Aus- und Einblenden (F11.2)
    const i = ARTIKEL.findIndex((a) => a.nummer === body.alt_nummer);
    const kopie = ARTIKEL.map((a, k) => (k === i ? { ...a, aktiv: !!body.aktiv } : a));
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, artikel: kopie }),
    });
  });

  await page.route('**/api/getraenke-order**', async (route) => {
    const req = route.request();
    const url = req.url();

    if (req.method() === 'POST') {
      if (/\/(senden|korrektur)$/.test(url)) {
        gesendet.push(JSON.parse(req.postData() || '{}'));
        return route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({
            success: true, status: /korrektur$/.test(url) ? 2 : 1,
            empfaenger: CONFIG.empfaenger, testbetrieb: true,
            protokoll: [], summen: {},
          }),
        });
      }
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, status: 0 }),
      });
    }
    if (/mode=verlauf/.test(url)) {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, verlauf: opts.verlauf || [] }),
      });
    }
    if (/getraenke-order\/\d{4}-\d{2}-\d{2}/.test(url)) {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          bestellung: { datum: tag, kw: kalenderwoche(tag),
                        status: opts.status || 0, positionen: opts.positionen || [], protokoll: [] },
          artikel: ARTIKEL, gruppen: GRUPPEN, pfand: PFAND,
          letzte: LETZTE, bestellbar: true,
          config: CONFIG, testbetrieb: true, summen: {},
        }),
      });
    }
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        success: true, termin: tag, kw: kalenderwoche(tag),
        letzte: LETZTE, config: CONFIG, testbetrieb: true,
      }),
    });
  });

  // Übrige Kiosk-Aufrufe still beantworten, damit nichts blockiert.
  await page.route('**/api/**', (route) => {
    if (/getraenke-order|getraenke-artikel/.test(route.request().url())) return route.fallback();
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  return gesendet;
}

async function oeffneTab(page, opts) {
  const gesendet = await mockApi(page, opts);
  await page.goto(KIOSK_URL);
  await page.locator('.k-tab[data-tab="getraenke"]').click();
  await page.locator('#getraenke-body .gk-row').first().waitFor({ timeout: 15000 });
  return gesendet;
}

function zeile(page, name) {
  return page.locator('.gk-row').filter({ hasText: name }).first();
}

async function oeffneBlatt(page) {
  const blatt = page.locator('#gk-blatt');
  if (await blatt.isVisible()) return;
  await page.locator('#gk-mehr').click();
  await blatt.waitFor({ state: 'visible', timeout: 5000 });
}

async function schliesseBlatt(page) {
  const blatt = page.locator('#gk-blatt');
  if (await blatt.isVisible()) {
    await page.locator('#gk-blatt-zu').click();
    await expect(blatt).toBeHidden({ timeout: 5000 });
  }
}

async function filterArtikel(page, filter) {
  await oeffneBlatt(page);
  await page.locator(`#gk-blatt .gk-tgl button[data-filter="${filter}"]`).click();
  await schliesseBlatt(page);
}

async function alleArtikel(page) {
  await filterArtikel(page, 'alle');
}

async function uebernimmLetzte(page) {
  await oeffneBlatt(page);
  await page.locator('#gk-take').click();
  await schliesseBlatt(page);
}

async function klickeSubtab(page, sub) {
  const kopf = page.locator(`.gk-fest .gk-sub[data-sub="${sub}"]`);
  if (await kopf.count()) {
    if (await kopf.first().isVisible()) {
      await kopf.first().dispatchEvent('click');
      return;
    }
  }
  const direkt = page.locator(`.gk-sub[data-sub="${sub}"]`);
  if (await direkt.count() === 1) {
    await direkt.dispatchEvent('click');
    return;
  }
  await oeffneBlatt(page);
  await page.locator(`#gk-blatt .gk-sub[data-sub="${sub}"]`).dispatchEvent('click');
}

test.describe('Getränke-Bestellung im Kiosk', () => {

  // ── F1: Liefertermin statt Bestelltagsleiste ──
  test('TC-F1-01/02/03: Terminfeld mit Kalenderwoche, keine Tagesleiste', async ({ page }) => {
    await oeffneTab(page);
    await expect(page.locator('.k-tab[data-tab="getraenke"]')).toContainText('Getränke');
    await oeffneBlatt(page);
    const datum = page.locator('#gk-datum');
    await expect(datum).toBeVisible();
    const wert = await datum.inputValue();
    await schliesseBlatt(page);
    await expect(page.locator('.gk-kontext .z1')).toContainText('KW ' + kalenderwoche(wert));
    // Bei Kratzer wird unregelmäßig bestellt – eine Tagesleiste gibt es nicht.
    await expect(page.locator('.gk-day')).toHaveCount(0);
    await expect(page.locator('.mb-days')).toHaveCount(0);
  });

  test('TC-F1-04: Ein Termin in der Vergangenheit sperrt das Senden', async ({ page }) => {
    await oeffneTab(page);
    await uebernimmLetzte(page);
    await expect(page.locator('#gk-send')).toBeEnabled();
    await oeffneBlatt(page);
    await page.locator('#gk-datum').fill('2020-01-06');
    await page.locator('#gk-datum').dispatchEvent('change');
    await expect(page.locator('#gk-send')).toBeDisabled({ timeout: 10000 });
    await expect(page.locator('#gk-foot')).toContainText('nicht in der Zukunft');
  });

  // ── F2: Warengruppen und Gebinde ──
  test('TC-F2-01/02/03: Gruppen in fester Reihenfolge, Gebinde und Preis je Zeile', async ({ page }) => {
    await oeffneTab(page);
    // Die Sprungleiste führt alle acht Warengruppen.
    await oeffneBlatt(page);
    await expect(page.locator('#gk-blatt #gk-jump button')).toHaveCount(GRUPPEN.length);
    await alleArtikel(page);
    const kopf = await page.locator('.gk-grp').allTextContents();
    const nurNamen = kopf.map((t) => t.replace(/\d+ Kisten$/, '').trim());
    // Reihenfolge entspricht der Katalogreihenfolge, keine Gruppe doppelt.
    const erwartet = GRUPPEN.filter((g) => nurNamen.indexOf(g) >= 0);
    expect(nurNamen).toEqual(erwartet);

    const r = zeile(page, 'Augustiner Hell');
    await expect(r.locator('.gk-geb')).toHaveText('20x0,50');
    await expect(r.locator('.gk-pr')).toContainText('13,75');
    // Ein Artikel ohne belegten Preis wird gekennzeichnet, nicht versteckt.
    await expect(zeile(page, 'Wolfra Apfelsaft').locator('.gk-tag.ohne')).toBeVisible();
  });

  // ── F3: Kisten-Schrittzähler ──
  test('TC-F3-01/02/03: Schrittzähler erhöht, sperrt bei 0 und nimmt Eingaben an', async ({ page }) => {
    await oeffneTab(page);
    const r = zeile(page, 'Augustiner Hell');
    await expect(r.locator('.gk-step button[data-minus]')).toBeDisabled();
    await r.locator('.gk-step button[data-plus]').click();
    await expect(zeile(page, 'Augustiner Hell')).toHaveClass(/has/);
    await expect(zeile(page, 'Augustiner Hell').locator('.gk-step input')).toHaveValue('1');
    await zeile(page, 'Augustiner Hell').locator('.gk-step input').fill('7');
    await zeile(page, 'Augustiner Hell').locator('.gk-step input').dispatchEvent('change');
    await expect(page.locator('#gk-foot')).toContainText('7');
    await expect(zeile(page, 'Augustiner Hell').locator('.gk-step button[data-minus]')).toBeEnabled();
  });

  test('TC-F3-04: Werte über 99 werden begrenzt', async ({ page }) => {
    await oeffneTab(page);
    const inp = zeile(page, 'Augustiner Hell').locator('.gk-step input');
    await inp.fill('250');
    await inp.dispatchEvent('change');
    await expect(zeile(page, 'Augustiner Hell').locator('.gk-step input')).toHaveValue('99');
  });

  // ── F4: Vorschläge ──
  test('TC-F4-01/02/03: Vorschlag setzt die Menge und nimmt sie zurück', async ({ page }) => {
    await oeffneTab(page);
    const r = zeile(page, 'Augustiner Hell');
    // „üblich 15“ (Median) und „letzte 20“ – beide stehen zur Auswahl.
    await expect(r.locator('.gk-sugg button')).toHaveCount(2);
    await r.locator('.gk-sugg button', { hasText: 'üblich 15' }).click();
    await expect(zeile(page, 'Augustiner Hell').locator('.gk-step input')).toHaveValue('15');
    await expect(zeile(page, 'Augustiner Hell').locator('.gk-sugg button.on')).toHaveCount(1);
    await zeile(page, 'Augustiner Hell').locator('.gk-sugg button.on').dispatchEvent('click');
    await expect(zeile(page, 'Augustiner Hell').locator('.gk-step input')).toHaveValue('0');
  });

  // ── F5 und F8: Übernehmen und Summen ──
  test('TC-F5-01/02 + TC-F8-01/02: Letzte Bestellung übernehmen', async ({ page }) => {
    await oeffneTab(page);
    await oeffneBlatt(page);
    await expect(page.locator('#gk-take')).toContainText('26.08.2026');
    await page.locator('#gk-take').click();
    await schliesseBlatt(page);
    const foot = page.locator('#gk-foot');
    await expect(foot).toContainText('34');            // Kisten
    await expect(foot).toContainText('4');             // Positionen
    await expect(foot).toContainText('412,20');        // Warenwert
  });

  test('TC-F5-03: Eine geänderte Menge zeigt den Vorlagewert', async ({ page }) => {
    await oeffneTab(page);
    // Ohne Menge steht der Wert der letzten Bestellung als Hinweis da.
    await expect(zeile(page, 'Augustiner Hell').locator('.gk-tag.vor')).toContainText('letzte: 20');
    await uebernimmLetzte(page);
    await zeile(page, 'Augustiner Hell').locator('.gk-step button[data-plus]').click();
    await expect(zeile(page, 'Augustiner Hell').locator('.gk-tag.chg')).toContainText('war 20');
    await expect(zeile(page, 'Augustiner Hell')).toHaveClass(/chg/);
  });

  test('TC-F8-03: Eine Position ohne Preis wird gesondert ausgewiesen', async ({ page }) => {
    await oeffneTab(page);
    await alleArtikel(page);
    await zeile(page, 'Wolfra Apfelsaft').locator('.gk-step button[data-plus]').click();
    await expect(page.locator('#gk-foot')).toContainText('ohne Preis');
  });

  // ── F6: Suchen und Filtern ──
  test('TC-F6-01/02/03: Filter und Suche', async ({ page }) => {
    await oeffneTab(page);
    const ueblich = await page.locator('.gk-row').count();
    await alleArtikel(page);
    const alle = await page.locator('.gk-row').count();
    expect(alle).toBeGreaterThan(ueblich);

    // „Nur bestellte“ zeigt genau die Zeilen mit Menge > 0.
    await filterArtikel(page, 'ueblich');
    await zeile(page, 'Augustiner Hell').locator('.gk-step button[data-plus]').click();
    await filterArtikel(page, 'best');
    await expect(page.locator('.gk-row')).toHaveCount(1);

    // Die Suche sticht den Filter: Wolfra ist unter „üblich“ verborgen.
    await filterArtikel(page, 'ueblich');
    await expect(zeile(page, 'Wolfra Apfelsaft')).toHaveCount(0);
    await page.locator('#gk-q').fill('Wolfra');
    await expect(zeile(page, 'Wolfra Apfelsaft')).toHaveCount(1);
  });

  test('TC-F6-04: Ohne Treffer erscheint ein Hinweis statt einer leeren Liste', async ({ page }) => {
    await oeffneTab(page);
    await page.locator('#gk-q').fill('Rotwein');
    await expect(page.locator('.gk-empty')).toContainText('Kein Getränk gefunden');
  });

  // ── F7: Artikel anlegen ──
  test('TC-F7-01/05: Einmaliger Artikel erscheint in Liste und Mailtext', async ({ page }) => {
    await oeffneTab(page);
    await page.locator('#gk-neu').click();
    await expect(page.locator('#gk-neu-blatt')).toBeVisible();
    await page.locator('#gkn-text').fill('Adelh. Rhabarber PET 0,5l');
    await page.locator('#gkn-gebinde').fill('12x0,50');
    await page.locator('#gkn-menge').fill('3');
    // Vorschau der Mailzeile (F7.3)
    await expect(page.locator('#gkn-vorschau')).toContainText('3 Kisten Adelh. Rhabarber PET 0,5l');
    await page.locator('#gkn-ok').click();
    await expect(page.locator('#gk-neu-blatt')).toHaveCount(0);

    const r = zeile(page, 'Adelh. Rhabarber PET 0,5l');
    await expect(r).toHaveCount(1);
    await expect(r.locator('.gk-tag.einmal')).toContainText('nur diese Bestellung');
    await expect(r.locator('.gk-step input')).toHaveValue('3');

    await page.locator('#gk-send').click();
    await expect(page.locator('#gk-mailtext')).toContainText('3 Kisten Adelh. Rhabarber PET 0,5l');
  });

  test('TC-F7-02 + TC-F7-07: Ein dauerhafter Artikel zieht auf die Servernummer um', async ({ page }) => {
    const gesendet = await oeffneTab(page);
    await page.locator('#gk-neu').click();
    await page.locator('#gkn-text').fill('Adelh. Rhabarber PET 0,5l');
    await page.locator('#gkn-gebinde').fill('12x0,50');
    await page.locator('#gkn-menge').fill('3');
    await page.locator('#gkn-dauer').check();
    // Solange der Server nicht geantwortet hat, gilt der Artikel als neu.
    await expect(page.locator('#gkn-dauer')).toBeChecked();
    await page.locator('#gkn-ok').click();

    await expect.poll(() => gesendet.filter((g) => g.name === 'Adelh. Rhabarber PET 0,5l').length,
      { timeout: 8000 }).toBe(1);

    // Danach ist es ein gewöhnlicher Katalogartikel unter der Nummer, die der
    // Server vergeben hat – mit unveränderter Menge. Bliebe der vorläufige
    // Schlüssel stehen, wäre die Menge beim nächsten Laden verschwunden.
    const r = zeile(page, 'Adelh. Rhabarber PET 0,5l');
    await expect(r).toHaveAttribute('data-key', 'DL-1', { timeout: 8000 });
    await expect(r.locator('.gk-step input')).toHaveValue('3');
    await expect(r.locator('.gk-tag.einmal')).toHaveCount(0);
    await expect(page.locator('#gk-foot')).toContainText('3');

    // Und er überlebt das Senden (anders als ein einmaliger Artikel).
    await page.locator('#gk-send').click();
    await expect(page.locator('#gk-mailtext'))
      .toContainText('3 Kisten Adelh. Rhabarber PET 0,5l');
    await page.locator('#gks-ok').click();
    await expect(page.locator('#gk-send-blatt')).toHaveCount(0, { timeout: 10000 });
    await alleArtikel(page);
    await expect(zeile(page, 'Adelh. Rhabarber PET 0,5l')).toHaveCount(1);
  });

  test('TC-F7-03: Gleiche Bezeichnung löst die Dublettenwarnung aus', async ({ page }) => {
    await oeffneTab(page);
    await page.locator('#gk-neu').click();
    await page.locator('#gkn-text').fill('Augustiner Hell');
    await expect(page.locator('#gkn-warn')).toBeVisible();
    await expect(page.locator('#gkn-warn')).toContainText('gibt es schon');
    // Gewarnt, nicht verboten: Der Laden entscheidet.
    await expect(page.locator('#gkn-ok')).toBeEnabled();
  });

  test('TC-F7-04: Ohne Bezeichnung wird nicht angelegt', async ({ page }) => {
    await oeffneTab(page);
    const vorher = await page.locator('.gk-row').count();
    await page.locator('#gk-neu').click();
    await page.locator('#gkn-ok').click();
    // Das Blatt bleibt offen, es entsteht keine Zeile.
    await expect(page.locator('#gk-neu-blatt')).toBeVisible();
    await page.locator('#gkn-zu').click();
    await expect(page.locator('.gk-row')).toHaveCount(vorher);
  });

  test('TC-F7-06: Einmalige Artikel fallen nach dem Senden weg', async ({ page }) => {
    await oeffneTab(page);
    await page.locator('#gk-neu').click();
    await page.locator('#gkn-text').fill('Adelh. Rhabarber PET 0,5l');
    await page.locator('#gkn-ok').click();
    await expect(zeile(page, 'Adelh. Rhabarber PET 0,5l')).toHaveCount(1);
    await page.locator('#gk-send').click();
    await page.locator('#gks-ok').click();
    await expect(page.locator('#gk-send-blatt')).toHaveCount(0, { timeout: 10000 });
    await alleArtikel(page);
    await expect(zeile(page, 'Adelh. Rhabarber PET 0,5l')).toHaveCount(0);
  });

  // ── F9 und F10: Mailtext und Versand ──
  test('TC-F9-01/02/03/04: Vorschau zeigt Betreff, Kisten und Gruppenblöcke', async ({ page }) => {
    await oeffneTab(page);
    await uebernimmLetzte(page);
    await alleArtikel(page);
    await zeile(page, 'Wolfra Apfelsaft').locator('.gk-step button[data-plus]').click();
    await oeffneBlatt(page);
    const kw = kalenderwoche(await page.locator('#gk-datum').inputValue());
    await schliesseBlatt(page);
    await page.locator('#gk-send').click();

    const text = await page.locator('#gk-mailtext').textContent();
    expect(text).toContain('Bestellung für Dorfladen Oberornau KW ' + kw);
    expect(text).toContain('20 Kisten Augustiner hell 0,5l');
    expect(text).toContain('1 Kiste Wolfra Apfelsaft 0,7l');
    expect(text).not.toContain('1 Kisten');
    // Warengruppen sind durch eine Leerzeile getrennt.
    expect(text).toContain('2 Kisten Tegernseer hell 0,5l\n\n4 Kisten Flötzinger Cola-Mix 0,5l');
    expect(text).toContain('Kd.-Nr. 15554, Tour 1');
  });

  test('TC-F9-06: Vorschau und Servertext sind Zeichen für Zeichen gleich', async ({ page }) => {
    // Der Kiosk baut den Text selbst (Vorschau), versendet wird der Text aus
    // api/getraenke-order/__init__.py. Beide müssen deckungsgleich sein.
    // Der Erwartungswert stammt aus _betreff() + _mail_text() für denselben
    // Termin und dieselben Positionen.
    const ERWARTET = [
      'Bestellung für Dorfladen Oberornau KW 38',
      '',
      'Guten Tag,',
      '',
      'bitte liefern Sie uns zum Montag, den 16.09.2030:',
      '',
      '20 Kisten Augustiner hell 0,5l',
      '2 Kisten Tegernseer hell 0,5l',
      '',
      '4 Kisten Flötzinger Cola-Mix 0,5l',
      '',
      '8 Kisten Adelh. MIWA sanft Glas 0,75l',
      '',
      '1 Kiste Wolfra Apfelsaft 0,7l',
      '',
      'Kd.-Nr. 15554, Tour 1',
      '',
      'Mit freundlichen Grüßen',
      'Dorfladen Oberornau',
    ].join('\n');

    await oeffneTab(page, { termin: '2030-09-16' });
    await uebernimmLetzte(page);
    await alleArtikel(page);
    await zeile(page, 'Wolfra Apfelsaft').locator('.gk-step button[data-plus]').click();
    await page.locator('#gk-send').click();
    expect(await page.locator('#gk-mailtext').textContent()).toBe(ERWARTET);
  });

  test('TC-F9-05 + TC-F10-01/02: Ohne Position kein Versand, sonst Bestätigung', async ({ page }) => {    const gesendet = await oeffneTab(page);
    await expect(page.locator('#gk-send')).toBeDisabled();
    await uebernimmLetzte(page);
    await expect(page.locator('#gk-send')).toBeEnabled();
    await page.locator('#gk-send').click();
    // Der Dialog nennt Empfänger, Positionen und Kisten.
    const kopf = page.locator('#gk-send-blatt header');
    await expect(kopf).toContainText(CONFIG.empfaenger);
    await expect(kopf).toContainText('4 Positionen');
    await expect(kopf).toContainText('34 Kisten');
    await page.locator('#gks-ok').click();
    await expect(page.locator('#gk-send-blatt')).toHaveCount(0, { timeout: 10000 });
    await expect(page.locator('.gk-kontext.gesendet')).toContainText('Bereits gesendet');
    expect(gesendet.some((g) => (g.positionen || []).length === 4)).toBeTruthy();
  });

  test('TC-F10-03: Eine gesendete Bestellung bietet die Korrektur an', async ({ page }) => {
    await oeffneTab(page, { status: 1, positionen: LETZTE.positionen });
    await expect(page.locator('.gk-kontext.gesendet')).toBeVisible();
    await expect(page.locator('#gk-send')).toContainText('Korrektur');
    await page.locator('#gk-send').click();
    await expect(page.locator('#gk-send-blatt header')).toContainText('Korrektur senden');
    await expect(page.locator('#gk-mailtext')).toContainText('Korrektur der Bestellung');
  });

  // ── F11: Artikelpflege ──
  test('TC-F11-01/03: Artikelliste mit Gebinde und Preis, kein Löschen', async ({ page }) => {
    await oeffneTab(page);
    await klickeSubtab(page, 'artikel');
    const r = page.locator('.gk-arow').filter({ hasText: 'Augustiner Hell' }).first();
    await expect(r).toContainText('KA40015');
    await expect(r).toContainText('20x0,50');
    await expect(r).toContainText('13,75');
    // Ausgeblendete Artikel bleiben in der Pflege stehen.
    await expect(page.locator('.gk-arow').filter({ hasText: 'Alte Sorte' })).toContainText('ausgeblendet');
    // Gelöscht wird nie (Spec F11.3).
    await expect(page.locator('.gk-arow button')).toHaveCount(await page.locator('.gk-arow').count());
    await expect(page.getByRole('button', { name: /löschen/i })).toHaveCount(0);
  });

  test('TC-F11-02: Ausblenden nimmt den Artikel aus der Bestellliste', async ({ page }) => {
    await oeffneTab(page);
    await klickeSubtab(page, 'artikel');
    await page.locator('.gk-arow').filter({ hasText: 'Augustiner Hell' })
      .locator('button').click();
    await expect(page.locator('.gk-arow').filter({ hasText: 'Augustiner Hell' }))
      .toContainText('ausgeblendet', { timeout: 8000 });
    await klickeSubtab(page, 'bestellung');
    await alleArtikel(page);
    await expect(zeile(page, 'Augustiner Hell')).toHaveCount(0);
  });

  // ── F13: Testbetrieb ──
  test('TC-F13-01/02: Der Testbetrieb ist im Formular und im Dialog sichtbar', async ({ page }) => {
    await oeffneTab(page);
    await expect(page.locator('.gk-kontext')).toContainText('Testbetrieb');
    await oeffneBlatt(page);
    await expect(page.locator('#gk-blatt')).toContainText(CONFIG.empfaenger);
    await expect(page.locator('#gk-blatt')).toContainText('Testbetrieb');
    await schliesseBlatt(page);
    await uebernimmLetzte(page);
    await page.locator('#gk-send').click();
    await expect(page.locator('#gk-send-blatt header')).toContainText('Testbetrieb');
  });

  // ── F14: Responsive (läuft in allen drei Projekten) ──
  test('TC-F14-01/02: Kein waagerechtes Scrollen, Fußleiste sichtbar', async ({ page }) => {
    await oeffneTab(page);
    await uebernimmLetzte(page);
    const ueber = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(ueber).toBeLessThanOrEqual(1);
    await expect(page.locator('#gk-foot')).toBeInViewport();
  });

  test('TC-F14-03: Der Anlegen-Dialog passt auf den Schirm', async ({ page }) => {
    await oeffneTab(page);
    await page.locator('#gk-neu').click();
    const dlg = page.locator('#gk-neu-blatt .gk-dlg');
    await expect(dlg).toBeVisible();
    const box = await dlg.boundingBox();
    const vp = page.viewportSize();
    expect(box.width).toBeLessThanOrEqual(vp.width);
    expect(box.height).toBeLessThanOrEqual(vp.height);
  });
});

/* Der Kiosk gibt es zweimal: kiosk.html und die klassische Fassung. Beide
 * binden dasselbe Modul ein und müssen gemeinsam gepflegt werden. */
test.describe('Getränke-Bestellung in der klassischen Kiosk-Fassung', () => {
  const KLASSISCH = /localhost|127\.0\.0\.1/.test(BASE)
    ? `${BASE}/kiosk-klassisch.html` : `${BASE}/kiosk-klassisch`;

  test('TC-F14-04: Reiter, Artikelliste und Fußleiste stehen auch dort', async ({ page }) => {
    await mockApi(page);
    const antwort = await page.goto(KLASSISCH);
    test.skip(!antwort || antwort.status() === 404,
      'Die klassische Fassung wird nicht ausgeliefert.');
    await page.locator('.k-tab[data-tab="getraenke"]').click();
    await page.locator('#getraenke-body .gk-row').first().waitFor({ timeout: 15000 });
    await oeffneBlatt(page);
    await expect(page.locator('#gk-datum')).toBeVisible();
    await page.locator('#gk-take').click();
    await schliesseBlatt(page);
    await expect(page.locator('#gk-foot')).toContainText('34');
    await expect(page.locator('#gk-send')).toBeEnabled();
  });
});

/* Die Einstellungen liegen im CMS, nicht im Kiosk (Spec F12) – wie beim
 * Metzger. Alle drei CMS-Fassungen teilen sich cms.js. */
test.describe('Getränke-Einstellungen im CMS', () => {
  const CMS_URL = `${BASE}/cms.html`;

  const CFG = {
    name: 'Getränke Kratzer',
    empfaenger: 'jrumpfinger@t-online.de',
    empfaenger_name: 'Test (Getränke-Bestellung)',
    lieferant_mail: '',
    kd_nr: '15554',
    tour: '1',
  };

  async function oeffneCms(page) {
    const gespeichert = [];
    await page.route('**/api/getraenke-order/config**', async (route) => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        gespeichert.push(body.config);
        return route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ success: true, config: body.config }),
        });
      }
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, config: CFG }),
      });
    });
    await page.route('**/api/**', (route) => {
      if (/getraenke-order\/config/.test(route.request().url())) return route.fallback();
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto(CMS_URL, { waitUntil: 'domcontentloaded' });
    // Das Gatter der Oberfläche trägt seinen Vergleichswert offen im Markup;
    // die echte Absicherung liegt serverseitig im admin_auth_guard.
    const hash = await page.evaluate(() => {
      const el = document.getElementById('cms-pw-hash');
      return el ? JSON.parse(el.textContent) : null;
    });
    test.skip(!hash, 'Diese Seite ist hier nicht ausgeliefert.');
    await page.evaluate((v) => sessionStorage.setItem('cms_auth_ok', v), hash);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('#cms-app').waitFor({ state: 'visible', timeout: 20000 });
    await page.evaluate(() => window.cmsTab('settings'));
    await page.locator('#gkcfg-empfaenger').waitFor({ timeout: 15000 });
    return gespeichert;
  }

  test('TC-F12-01: Die Maske speichert Empfänger und Kundennummer', async ({ page }) => {
    const gespeichert = await oeffneCms(page);
    await expect(page.locator('#gkcfg-empfaenger')).toHaveValue(CFG.empfaenger);
    await expect(page.locator('#gkcfg-kdnr')).toHaveValue('15554');
    await expect(page.locator('#gkcfg-tour')).toHaveValue('1');
    // Solange die Lieferantenadresse fehlt, läuft der Testbetrieb (F13).
    await expect(page.locator('#gkcfg-testhinweis')).toBeVisible();
    await expect(page.locator('#gkcfg-echthinweis')).toBeHidden();

    await page.locator('#gkcfg-kdnr').fill('15554');
    await page.locator('#gkcfg-empfaenger').fill('bestellung@getraenke-kratzer.de');
    await page.locator('#gkcfg-save').click();
    await expect.poll(() => gespeichert.length, { timeout: 10000 }).toBe(1);
    expect(gespeichert[0].empfaenger).toBe('bestellung@getraenke-kratzer.de');
    expect(gespeichert[0].kd_nr).toBe('15554');
    await expect(page.locator('#gkcfg-saved-hint')).toBeVisible();
  });

  test('TC-F12-02: Eine unvollständige Adresse wird freundlich abgewiesen', async ({ page }) => {
    const gespeichert = await oeffneCms(page);
    await page.locator('#gkcfg-empfaenger').fill('bestellung@kratzer');
    await page.locator('#gkcfg-save').click();
    await expect(page.locator('#gkcfg-status')).toContainText('g\u00fcltige E-Mail-Adresse');
    expect(gespeichert).toHaveLength(0);

    // Auch ohne Kunden-Nr. wird nicht gespeichert – sie steht in jeder Mail.
    await page.locator('#gkcfg-empfaenger').fill('bestellung@getraenke-kratzer.de');
    await page.locator('#gkcfg-kdnr').fill('');
    await page.locator('#gkcfg-save').click();
    await expect(page.locator('#gkcfg-status')).toContainText('Kunden-Nr.');
    expect(gespeichert).toHaveLength(0);
  });

  test('TC-F13-03: Die echte Adresse schaltet den Testbetrieb scharf', async ({ page }) => {
    await oeffneCms(page);
    await page.locator('#gkcfg-lieferant').fill('bestellung@getraenke-kratzer.de');
    await page.locator('#gkcfg-empfaenger').fill('bestellung@getraenke-kratzer.de');
    await expect(page.locator('#gkcfg-echthinweis')).toBeVisible();
    await expect(page.locator('#gkcfg-testhinweis')).toBeHidden();
  });
});
