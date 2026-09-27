/**
 * Anmelden statt Registrieren - und zurueck zur Startseite
 * Spec: specs/anmelden-vor-registrieren/spec.md
 *
 * Aus dem Laden: "Macht es nicht mehr Sinn, sich anzumelden und
 * nachzufragen, ob schon registriert - und dann kann er sich
 * registrieren?" Dazu ein Bildschirmfoto: Ein Klick auf "Anmelden"
 * landete im Formular "Konto anlegen".
 *
 * Stimmt - der Knopf sagte das eine und tat das andere. Getroffen hat es
 * vor allem die, die laengst ein Konto haben; und das werden mit der Zeit
 * die meisten.
 *
 * Zweite Meldung: "Nach Abmelden und Anmelden soll man zur Homepage
 * automatisch kommen." Vorher blieb man auf der Kontoseite stehen.
 *
 * Ausfuehren:
 *   python -m http.server 8099   (aus static-site/)
 *   $env:TEST_URL='http://127.0.0.1:8099'
 *   npx playwright test tests/anmelden-vor-registrieren.spec.js
 */

const { test, expect } = require('@playwright/test');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const LOKAL = /localhost|127\.0\.0\.1/.test(BASE);
const KONTO = LOKAL ? `${BASE}/mein-konto.html` : `${BASE}/mein-konto`;
const START = LOKAL ? `${BASE}/index.html` : `${BASE}/`;

const KUNDE = { vorname: 'Anna', nachname: 'Beispiel', email: 'anna@example.com' };

async function mocks(page) {
  await page.route('**/api/auth-login', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, token: 'test-zeichen', kunde: KUNDE }) }));
  await page.route('**/api/auth-register', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true }) }));
  await page.route('**/api/lunch-order*', (route) => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ success: true, orders: [] }) }));
  await page.route('**/api/shop-order*', (route) => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ success: true, orders: [] }) }));
}

async function abgemeldet(page) {
  await page.addInitScript(() => {
    try {
      localStorage.removeItem('dl_shop_token');
      localStorage.removeItem('dl_shop_user');
    } catch (e) {}
  });
}

test('TC-AR-01: Ohne Hash zeigt die Kontoseite die Anmeldung', async ({ page }) => {
  await mocks(page);
  await abgemeldet(page);
  await page.goto(KONTO, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  await expect(page.locator('#mk-anmelden'),
    'Die Anmeldemaske ist nicht die erste Ansicht.').toBeVisible();
  await expect(page.locator('#mk-neu'),
    'Das Anlegen-Formular draengt sich vor.').toBeHidden();
});

test('TC-AR-02: Von der Anmeldung aus kommt man zum Anlegen und zurueck', async ({ page }) => {
  await mocks(page);
  await abgemeldet(page);
  await page.goto(KONTO, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  /* Genau die Rueckfrage aus dem Laden: Wer noch nicht registriert ist,
     muss hier weiterkommen - ohne die Adresse von Hand zu aendern. */
  const hin = page.locator('#mk-zu-konto');
  await expect(hin, 'Kein Weg von der Anmeldung zum Anlegen.').toBeVisible();
  await expect(page.locator('.mk-wechsel').first()).toContainText('Noch kein Konto');
  await hin.click();
  await expect(page.locator('#mk-neu')).toBeVisible();

  const zurueck = page.locator('#mk-zu-anmelden');
  await expect(zurueck, 'Kein Weg zurueck zur Anmeldung.').toBeVisible();
  await zurueck.click();
  await expect(page.locator('#mk-anmelden')).toBeVisible();
});

test('TC-AR-03: Nach dem Anmelden landet man auf der Startseite', async ({ page }) => {
  await mocks(page);
  await abgemeldet(page);
  await page.goto(KONTO, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  await page.fill('#mk-login-mail', KUNDE.email);
  await page.fill('#mk-login-pw', 'geheim123');
  await page.click('#mk-login-knopf');

  await page.waitForURL((u) => !/mein-konto/.test(u.pathname), { timeout: 10000 });
  expect(page.url(), 'Nach dem Anmelden blieb die Kontoseite stehen.')
    .not.toContain('mein-konto');
});

test('TC-AR-04: Nach dem Abmelden landet man auf der Startseite', async ({ page }) => {
  await mocks(page);
  await page.addInitScript((k) => {
    try {
      localStorage.setItem('dl_shop_token', 'test-zeichen');
      localStorage.setItem('dl_shop_user', JSON.stringify(k));
    } catch (e) {}
  }, KUNDE);
  await page.goto(KONTO, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  await page.click('#mk-abmelden');
  await page.waitForURL((u) => !/mein-konto/.test(u.pathname), { timeout: 10000 });
  expect(page.url(), 'Nach dem Abmelden blieb die Kontoseite stehen.')
    .not.toContain('mein-konto');
});

test('TC-AR-05: Nach dem Anlegen bleibt der Bestaetigungshinweis stehen', async ({ page }) => {
  /* Hier darf NICHT weitergesprungen werden: Nach dem Anlegen ist man
     noch gar nicht angemeldet, sondern muss erst die E-Mail bestaetigen.
     Dieser Hinweis ist das Wichtigste auf der Seite. */
  await mocks(page);
  await abgemeldet(page);
  await page.goto(`${KONTO}#neu`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  await page.fill('#mk-vorname', 'Anna');
  await page.fill('#mk-nachname', 'Beispiel');
  await page.fill('#mk-neu-mail', KUNDE.email);
  await page.fill('#mk-neu-pw', 'geheim123');
  await page.fill('#mk-neu-pw2', 'geheim123');
  await page.check('#mk-dsgvo');
  await page.check('#mk-agb');
  await page.click('#mk-neu-knopf');

  await expect(page.locator('#mk-bestaetigen'),
    'Der Bestaetigungshinweis fehlt.').toBeVisible({ timeout: 10000 });
  expect(page.url(), 'Nach dem Anlegen wurde weggesprungen.').toContain('mein-konto');
});

test('TC-AR-06: Der Einstieg auf der Startseite fuehrt zur Anmeldung', async ({ page }) => {
  await mocks(page);
  await abgemeldet(page);
  await page.goto(START, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  /* Beschriftung und Ziel muessen zusammenpassen - daran ist es
     gescheitert. */
  await expect(page.locator('#tb-konto')).toHaveAttribute('href', '/mein-konto');
  await expect(page.locator('#mob-konto')).toHaveAttribute('href', '/mein-konto');
});

test('TC-AR-07: Wo "Konto anlegen" steht, geht es auch dorthin', async ({ page }) => {
  /* Die Umkehrung derselben Regel: Ein Link, der das Anlegen verspricht,
     darf nicht in der Anmeldemaske enden. */
  await mocks(page);
  await abgemeldet(page);
  await page.goto(LOKAL ? `${BASE}/bestellstatus.html` : `${BASE}/bestellstatus`,
    { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  const link = page.locator('#bs-konto a');
  await expect(link).toContainText('Konto anlegen');
  await expect(link).toHaveAttribute('href', '/mein-konto#neu');
});
