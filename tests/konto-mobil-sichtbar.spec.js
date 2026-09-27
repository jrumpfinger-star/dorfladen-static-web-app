/**
 * Anmeldung auf dem Handy: sichtbar auf der Startseite, funktioniert aus dem Menü
 * Spec: specs/konto-mobil-sichtbar/spec.md
 *
 * Zwei Meldungen aus dem Laden, direkt nach der Umstellung von "Mein
 * Konto" auf das modale Fenster:
 *   1. "Anmeldung muss bei mobile auf der Startseite sichtbar sein."
 *   2. "Außerdem funktioniert die Anmeldung auf mobile nicht aus Menü.
 *      Hast du das UI nicht gecheckt?"
 *
 * Berechtigt - ich hatte nur den Desktop-Weg (#tb-konto) geprüft, nicht
 * den mobilen. Zwei unabhängige Ursachen:
 *
 * 1. #tb-konto sitzt in der Kopfleiste `.tb`, die unter 640px per CSS
 *    verschwindet. Auf dem Handy blieb nur der Weg über das Menü übrig -
 *    kein direkt sichtbarer Einstieg.
 *
 * 2. Der Klick auf "Mein Konto" IM Menü löste einen Wettlauf zweier
 *    unabhängiger Verlaufs-Mechanismen aus: Ein direkter Aufruf von
 *    removePopupState() beim Schließen JEDES Menü-Links rief
 *    history.back() auf - auch dann, wenn derselbe Klick GERADE ein
 *    neues Fenster (das modale "Mein Konto") geöffnet und dafür seinen
 *    EIGENEN Verlaufseintrag angelegt hatte. Das history.back() holte
 *    genau diesen Eintrag sofort wieder herunter, was popstate auslöste
 *    und das gerade geöffnete Fenster augenblicklich wieder schloss.
 *
 * Ausführen:
 *   python -m http.server 8099   (aus static-site/)
 *   $env:TEST_URL='http://127.0.0.1:8099'
 *   npx playwright test tests/konto-mobil-sichtbar.spec.js
 */

const { test, expect } = require('@playwright/test');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const LOKAL = /localhost|127\.0\.0\.1/.test(BASE);
const START = LOKAL ? `${BASE}/index.html` : `${BASE}/`;
const KUNDE = { vorname: 'Anna', nachname: 'Beispiel', email: 'anna@example.com' };

async function mocks(page) {
  await page.route('**/api/auth-login', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, token: 'test-zeichen', kunde: KUNDE }) }));
  await page.route('**/api/lunch-order*', (route) => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ success: true, orders: [] }) }));
  await page.route('**/api/shop-order*', (route) => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ success: true, orders: [] }) }));
  if (LOKAL) {
    await page.route('**/mein-konto?*', (route) => route.continue({
      url: route.request().url().replace('/mein-konto?', '/mein-konto.html?') }));
  }
}

test.describe('Konto-Einstieg auf dem Handy', () => {
  test.use({ viewport: { width: 375, height: 700 } });

  test('TC-MS-01: Auf der Startseite ist der Einstieg direkt sichtbar, ohne das Menü zu öffnen', async ({ page }) => {
    await mocks(page);
    await page.goto(START, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await expect(page.locator('#mob-header-konto'),
      'Kein Konto-Symbol direkt sichtbar - man müsste das Menü öffnen.')
      .toBeVisible();
    // Das Menü selbst darf dafür nicht geöffnet worden sein.
    await expect(page.locator('#mob-nav')).not.toHaveClass(/open/);
  });

  test('TC-MS-02: Ein Klick darauf öffnet "Mein Konto" im modalen Fenster', async ({ page }) => {
    await mocks(page);
    await page.goto(START, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.click('#mob-header-konto');
    await page.waitForTimeout(600);

    await expect(page.locator('#mt-popup-overlay')).toHaveClass(/open/);
    const src = await page.locator('#mt-popup-iframe').getAttribute('src');
    expect(src).toContain('mein-konto');
  });

  test('TC-MS-03: "Mein Konto" aus dem Menü öffnet sich und bleibt offen', async ({ page }) => {
    /* Der eigentliche, gemeldete Fehler: Das Fenster ging auf und
       schloss sich im selben Wimpernschlag wieder - fuer die Kundin sah
       es aus, als passiere beim Klicken gar nichts. */
    await mocks(page);
    await page.goto(START, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.click('.mob-header-menu');
    await page.waitForTimeout(400);
    await expect(page.locator('#mob-nav')).toHaveClass(/open/);

    await page.click('#mob-konto');
    await page.waitForTimeout(700);

    await expect(page.locator('#mob-nav'), 'Das Menü ist nicht zugegangen.')
      .not.toHaveClass(/open/);
    await expect(page.locator('#mt-popup-overlay'),
      'Das Fenster hat sich nach dem Öffnen sofort wieder geschlossen.')
      .toHaveClass(/open/, { timeout: 3000 });
    const src = await page.locator('#mt-popup-iframe').getAttribute('src');
    expect(src, `iframe.src zeigt auf "${src}" statt auf mein-konto - das Fenster wurde geschlossen und geleert.`)
      .toContain('mein-konto');
  });

  test('TC-MS-04: Darin lässt sich tatsächlich anmelden', async ({ page }) => {
    await mocks(page);
    await page.goto(START, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.click('.mob-header-menu');
    await page.waitForTimeout(400);
    await page.click('#mob-konto');
    await page.waitForTimeout(700);

    const rahmen = page.frameLocator('#mt-popup-iframe');
    await rahmen.locator('#mk-login-mail').fill(KUNDE.email);
    await rahmen.locator('#mk-login-pw').fill('geheim123');
    await rahmen.locator('#mk-login-knopf').click();
    await page.waitForTimeout(700);

    await expect(page.locator('#mob-header-konto'),
      'Das Konto-Symbol auf dem Handy weiß nichts von der Anmeldung.')
      .toHaveClass(/an/);
  });
});
