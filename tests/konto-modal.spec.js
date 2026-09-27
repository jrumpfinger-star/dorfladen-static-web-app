/**
 * "Mein Konto" als modales Fenster statt Seitenwechsel
 * Spec: specs/konto-modal/spec.md
 *
 * Rückfrage aus dem Laden: "Warum muss ein eigenes Fenster aufgehen
 * anstatt eines modalen Dialoges mit einem Schließen-X-Button?"
 *
 * Berechtigt - das Fenster gab es längst: Bestellstatus, Mittagstisch
 * und CMS öffnen alle im selben mt-popup-overlay mit Schließen-Kreuz,
 * Klick-daneben und Android-Zurück-Taste. Nur "Mein Konto" navigierte
 * bisher die ganze Seite weg.
 *
 * Zweite, verwandte Meldung: "Wenn man sich bei Mittagessen anmeldet,
 * muss auch auf der Homepage dies aktualisiert werden." Das Anmelde-
 * fenster im Bestellformular (Spec konto-waehrend-bestellung) und das
 * jetzt modale "Mein Konto" mussten beide dem Konto-Symbol der
 * Startseite Bescheid geben.
 *
 * Ausführen:
 *   python -m http.server 8099   (aus static-site/)
 *   $env:TEST_URL='http://127.0.0.1:8099'
 *   npx playwright test tests/konto-modal.spec.js
 */

const { test, expect } = require('@playwright/test');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const LOKAL = /localhost|127\.0\.0\.1/.test(BASE);
const START = LOKAL ? `${BASE}/index.html` : `${BASE}/`;

const KUNDE = { vorname: 'Anna', nachname: 'Beispiel', email: 'anna@example.com' };

async function mocks(page, { loginFehler = false } = {}) {
  await page.route('**/api/auth-login', (route) => {
    if (loginFehler) return route.fulfill({ contentType: 'application/json',
      body: JSON.stringify({ success: false, error: 'E-Mail oder Passwort stimmt nicht.' }) });
    return route.fulfill({ contentType: 'application/json',
      body: JSON.stringify({ success: true, token: 'test-zeichen', kunde: KUNDE }) });
  });
  await page.route('**/api/lunch-order*', (route) => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ success: true, orders: [] }) }));
  await page.route('**/api/shop-order*', (route) => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ success: true, orders: [] }) }));
  if (LOKAL) {
    await page.route('**/mein-konto?*', (route) => route.continue({
      url: route.request().url().replace('/mein-konto?', '/mein-konto.html?') }));
    await page.route('**/mein-konto#*', (route) => route.continue());
  }
}

async function startseite(page) {
  await page.goto(START, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
}

test('TC-KM-01: Ein Klick auf "Anmelden" öffnet das modale Fenster, keine neue Seite', async ({ page }) => {
  await mocks(page);
  await startseite(page);

  await page.click('#tb-konto');
  await page.waitForTimeout(600);

  await expect(page.locator('#mt-popup-overlay'), 'Kein modales Fenster geöffnet.')
    .toHaveClass(/open/);
  expect(page.url(), 'Die Seite hat gewechselt statt ein Fenster zu öffnen.')
    .toContain(LOKAL ? 'index.html' : BASE);
  const iframeSrc = await page.locator('#mt-popup-iframe').getAttribute('src');
  expect(iframeSrc).toContain('mein-konto');
});

test('TC-KM-02: Das Schließen-Kreuz schließt das Fenster wieder', async ({ page }) => {
  await mocks(page);
  await startseite(page);
  await page.click('#tb-konto');
  await expect(page.locator('#mt-popup-overlay')).toHaveClass(/open/);

  await page.click('.mt-popup-close');
  await page.waitForTimeout(400);

  await expect(page.locator('#mt-popup-overlay')).not.toHaveClass(/open/);
});

test('TC-KM-03: "Zur Startseite" im Fenster schließt es, statt die Homepage darin zu laden', async ({ page }) => {
  await mocks(page);
  await startseite(page);
  await page.click('#tb-konto');
  await page.waitForTimeout(600);

  const rahmen = page.frameLocator('#mt-popup-iframe');
  await rahmen.locator('.mk-zurueck').click();
  await page.waitForTimeout(400);

  await expect(page.locator('#mt-popup-overlay'),
    'Das Fenster ist noch offen - "Zur Startseite" hat nicht geschlossen.')
    .not.toHaveClass(/open/);
});

test('TC-KM-04: Strg-Klick öffnet weiterhin einen echten neuen Tab', async ({ page, context }) => {
  await mocks(page);
  await startseite(page);

  const [neueSeite] = await Promise.all([
    context.waitForEvent('page'),
    page.click('#tb-konto', { modifiers: ['Control'] }),
  ]);
  await neueSeite.waitForURL(/mein-konto/, { timeout: 8000 }).catch(() => {});
  await neueSeite.waitForLoadState('domcontentloaded');

  expect(neueSeite.url()).toContain('mein-konto');
  await expect(page.locator('#mt-popup-overlay'),
    'Trotz Strg-Klick hat sich zusätzlich das modale Fenster geöffnet.')
    .not.toHaveClass(/open/);
});

test('TC-KM-05: Nach dem Anmelden im Fenster zeigt das Konto-Symbol sofort den Namen', async ({ page }) => {
  await mocks(page);
  await startseite(page);
  await expect(page.locator('#tb-konto-txt')).toHaveText('Anmelden');

  await page.click('#tb-konto');
  await page.waitForTimeout(700);
  const rahmen = page.frameLocator('#mt-popup-iframe');
  await rahmen.locator('#mk-login-mail').fill(KUNDE.email);
  await rahmen.locator('#mk-login-pw').fill('geheim123');
  await rahmen.locator('#mk-login-knopf').click();
  await page.waitForTimeout(700);

  await expect(page.locator('#mt-popup-overlay'), 'Das Fenster hat sich nach dem Anmelden nicht geschlossen.')
    .not.toHaveClass(/open/);
  await expect(page.locator('#tb-konto-txt'), 'Das Konto-Symbol zeigt den Namen nicht.')
    .toHaveText(KUNDE.vorname);
});

test('TC-KM-06: Anmelden im Mittagessen-Popup aktualisiert das Konto-Symbol der Startseite', async ({ page }) => {
  /* Die zweite gemeldete Lücke: ein GANZ ANDERES eingebettetes Fenster
     (das Bestellformular, nicht "Mein Konto") meldet der Startseite
     ebenfalls Bescheid. */
  await mocks(page);
  await page.route('**/api/wochenplan*', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: [{
      dl_wochenplanid: 'w1', dl_gericht: 'Testgericht', dl_preis: 8.8,
      dl_wochentag: 101002, dl_datum: '2099-10-01T00:00:00Z' }] }) }));
  await page.route('**/api/cms-config*', (route) => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ success: true, data: { feature_flags: {} } }) }));
  await startseite(page);
  await expect(page.locator('#tb-konto-txt')).toHaveText('Anmelden');

  // Das Mittagstisch-Popup oeffnen (ueber den vorhandenen Weg) und darin anmelden.
  await page.evaluate((url) => window.openMittagPopup(url),
    (LOKAL ? `${BASE}/mittagstisch-bestellen.html` : `${BASE}/mittagstisch-bestellen`) + '?id=w1');
  await page.waitForTimeout(800);

  const rahmen = page.frameLocator('#mt-popup-iframe');
  await rahmen.locator('#konto-status-aus a').click();
  await rahmen.locator('#login-mail').fill(KUNDE.email);
  await rahmen.locator('#login-pw').fill('geheim123');
  await rahmen.locator('#login-knopf').click();
  await page.waitForTimeout(700);

  await expect(page.locator('#tb-konto-txt'),
    'Das Konto-Symbol der Startseite weiß nichts von der Anmeldung im Bestellformular.')
    .toHaveText(KUNDE.vorname);
});
