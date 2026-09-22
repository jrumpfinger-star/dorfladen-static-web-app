/**
 * Kiosk – Stammkunden nach Nachnamen sortiert
 *
 * Aus dem Laden: „Die Daten bitte nach Nachnamen sortiert anzeigen."
 *
 * Die Liste stand nach Vornamen: Christine Kastler, Josef Rumpfinger,
 * Julian Rumpfinger, Maria Kailich, Martl, Rosmarie Kailich. Der Server
 * ordnet nach `dl_name`, und der beginnt mit dem Vornamen.
 *
 * Sortiert wird nach dem gepflegten Feld `nachname`. Fehlt es, gilt das
 * letzte Wort des Namens – bei einem einzelnen Wort („Martl") eben dieses.
 *
 * Ausführen (lokaler Server aus static-site/ auf 8099):
 *   $env:TEST_URL='http://127.0.0.1:8099'
 *   node node_modules\@playwright\test\cli.js test tests/kiosk-kunden-sortierung.spec.js
 */

const { test, expect } = require('./_kiosk-angemeldet');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

/* Genau die Kunden aus der Meldung, in der Reihenfolge, in der sie der
   Server liefert (nach `dl_name`, also nach Vornamen). „Martl" hat keinen
   Nachnamen, „Kailich Maria" ist verdreht erfasst – beide Fälle gibt es
   wirklich und beide muss die Sortierung aushalten. */
const KUNDEN = [
  { id: 'k1', name: 'Christine Kastler', vorname: 'Christine', nachname: 'Kastler', telefon: '080829489', stammkunde_nr: 'SK-9645D3' },
  { id: 'k2', name: 'Josef Rumpfinger', vorname: 'Josef', nachname: 'Rumpfinger', telefon: '08082946689', stammkunde_nr: 'SK-7C1778' },
  { id: 'k3', name: 'Julian Rumpfinger', vorname: 'Julian', nachname: 'Rumpfinger', telefon: '08082966689', stammkunde_nr: 'SK-D818F5' },
  { id: 'k4', name: 'Maria Kailich', vorname: 'Maria', nachname: 'Kailich', telefon: '1234', stammkunde_nr: 'SK-3567AF' },
  { id: 'k5', name: 'Martl', vorname: '', nachname: '', telefon: '545544', stammkunde_nr: 'SK-048823' },
  { id: 'k6', name: 'Rosmarie Kailich', vorname: 'Rosmarie', nachname: 'Kailich', telefon: '1234', stammkunde_nr: 'SK-8E66EA' },
];

async function mockApi(page, kunden) {
  const j = (o) => ({ status: 200, contentType: 'application/json',
    body: JSON.stringify(o) });
  await page.route('**/api/stammkunden**', (route) =>
    route.fulfill(j({ success: true, customers: kunden })));
  await page.route('**/api/**', (route) => {
    if (/stammkunden/.test(route.request().url())) return route.fallback();
    return route.fulfill(j({ success: true }));
  });
}

async function oeffneKunden(page, kunden) {
  await mockApi(page, kunden || KUNDEN);
  await page.goto(KIOSK_URL);
  await page.waitForTimeout(2200);
  await page.evaluate(() => window.K.switchTab('kunden'));
  await page.waitForTimeout(1200);
}

/** Die Namen in der Reihenfolge, in der sie auf dem Schirm stehen. */
async function namen(page) {
  return page.evaluate(() => [...document.querySelectorAll('#kunden-list .k-oc-name')]
    .map((el) => el.textContent.trim()));
}

test.describe('Stammkunden – Sortierung nach Nachnamen', () => {

  test('TC-KS-01: Die Liste steht nach Nachnamen', async ({ page }) => {
    await oeffneKunden(page);
    expect(await namen(page)).toEqual([
      'Maria Kailich',
      'Rosmarie Kailich',
      'Christine Kastler',
      'Martl',
      'Josef Rumpfinger',
      'Julian Rumpfinger',
    ]);
  });

  test('TC-KS-02: Gleicher Nachname wird nach Vornamen geordnet',
    async ({ page }) => {
      await oeffneKunden(page);
      const liste = await namen(page);
      // Josef vor Julian, Maria vor Rosmarie
      expect(liste.indexOf('Josef Rumpfinger'))
        .toBeLessThan(liste.indexOf('Julian Rumpfinger'));
      expect(liste.indexOf('Maria Kailich'))
        .toBeLessThan(liste.indexOf('Rosmarie Kailich'));
    });

  test('TC-KS-03: Ohne gepflegtes Feld zählt das letzte Wort',
    async ({ page }) => {
      /* Altbestand ohne `nachname`. Ohne Rückfall stünden diese Kunden
         alle vorn, weil ein leerer Schlüssel vor allem anderen kommt. */
      await oeffneKunden(page, [
        { id: 'a', name: 'Anton Zwick', vorname: '', nachname: '', telefon: '', stammkunde_nr: 'SK-A' },
        { id: 'b', name: 'Berta Ahorn', vorname: '', nachname: '', telefon: '', stammkunde_nr: 'SK-B' },
        { id: 'c', name: 'Martl', vorname: '', nachname: '', telefon: '', stammkunde_nr: 'SK-C' },
      ]);
      expect(await namen(page)).toEqual(['Berta Ahorn', 'Martl', 'Anton Zwick']);
    });

  test('TC-KS-04: Umlaute stehen wie im Telefonbuch', async ({ page }) => {
    // Ohne 'de' als Sprache landete Österle hinter Zwick.
    await oeffneKunden(page, [
      { id: 'a', name: 'Anna Zwick', vorname: 'Anna', nachname: 'Zwick', telefon: '', stammkunde_nr: 'SK-A' },
      { id: 'b', name: 'Otto Österle', vorname: 'Otto', nachname: 'Österle', telefon: '', stammkunde_nr: 'SK-B' },
      { id: 'c', name: 'Paul Ostler', vorname: 'Paul', nachname: 'Ostler', telefon: '', stammkunde_nr: 'SK-C' },
    ]);
    const liste = await namen(page);
    expect(liste[liste.length - 1], 'Zwick gehört ans Ende').toBe('Anna Zwick');
    expect(liste.indexOf('Otto Österle')).toBeLessThan(liste.indexOf('Anna Zwick'));
  });

  test('TC-KS-05: Eine leere Kartei stürzt nicht ab', async ({ page }) => {
    await oeffneKunden(page, []);
    await expect(page.locator('#kunden-list')).toContainText('Keine Kunden gefunden');
  });
});
