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

/* Auf schmalen Breiten ist #tb-konto unsichtbar (die Kopfleiste .tb
   blendet dort aus) - dort zaehlt #mob-header-konto in der mobilen
   Kopfzeile. Beide fuehren zu genau demselben dlOeffneKontoModal().
   (Spec konto-mobil-sichtbar) */
function kontoKnopf(page) {
  return page.locator('#tb-konto:visible, #mob-header-konto:visible').first();
}

test('TC-KM-01: Ein Klick auf "Anmelden" öffnet das modale Fenster, keine neue Seite', async ({ page }) => {
  await mocks(page);
  await startseite(page);

  await kontoKnopf(page).click();
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
  await kontoKnopf(page).click();
  await expect(page.locator('#mt-popup-overlay')).toHaveClass(/open/);

  await page.click('.mt-popup-close');
  await page.waitForTimeout(400);

  await expect(page.locator('#mt-popup-overlay')).not.toHaveClass(/open/);
});

test('TC-KM-03: Der eigene "Zur Startseite"-Knopf bleibt eingebettet verborgen', async ({ page }) => {
  /* Er würde sich sonst mit dem Schließen-Kreuz des Fensters
     überlappen - beide sitzen oben rechts an derselben Stelle.
     Genau das war gemeldet: "Überlappung schließen." Statt zwei
     Wege zum Schließen zu zeigen, bleibt nur einer sichtbar - wie
     in mittagstisch-bestellen.html schon gelöst. */
  await mocks(page);
  await startseite(page);
  await kontoKnopf(page).click();
  await page.waitForTimeout(600);

  const rahmen = page.frameLocator('#mt-popup-iframe');
  await expect(rahmen.locator('#mk-zurueck-link'),
    'Der eingebettete "Zur Startseite"-Knopf überlappt das Schließen-Kreuz.')
    .toBeHidden();
});

test('TC-KM-03b: Direkt aufgerufen (kein Fenster) bleibt "Zur Startseite" sichtbar', async ({ page }) => {
  await mocks(page);
  await page.goto(LOKAL ? `${BASE}/mein-konto.html` : `${BASE}/mein-konto`,
    { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await expect(page.locator('#mk-zurueck-link')).toBeVisible();
});

test('TC-KM-03c: Ein Klick daneben schließt "Mein Konto" nicht', async ({ page }) => {
  /* Die zweite Meldung: "Dialog ist nicht modal. Klick außerhalb
     schließt ihn." Bei den einfachen Lese-Dialogen (Bestellstatus,
     CMS) ist das ein bequemer Schnellschluss - hier aber trägt das
     Fenster Formulare (Anmeldung, Profil, Passwort). Ein
     versehentlicher Klick daneben darf das nicht wortlos verwerfen. */
  await mocks(page);
  await startseite(page);
  await kontoKnopf(page).click();
  await page.waitForTimeout(600);

  await page.locator('#mt-popup-overlay').click({ position: { x: 5, y: 5 } });
  await page.waitForTimeout(400);

  await expect(page.locator('#mt-popup-overlay'),
    'Ein Klick daneben hat "Mein Konto" doch geschlossen.')
    .toHaveClass(/open/);
});

test('TC-KM-03d: Bei anderen Dialogen schließt ein Klick daneben weiterhin', async ({ page }) => {
  /* Der Schalter ist bewusst nur für "Mein Konto" gesetzt - die
     einfacheren Lese-Dialoge sollen ihren gewohnten Schnellschluss
     behalten.

     Auf schmaler Breite gibt es dafür keinen Platz: Unter 600px wird
     das Fenster laut CSS randlos (`.mt-popup-overlay{padding:0}`) - es
     gibt dort schlicht kein "daneben" zum Anklicken. Das ist Absicht
     (volle Fläche auf dem Handy), kein Fall für diesen Wächter. */
  const { width } = page.viewportSize();
  test.skip(width < 600, 'Unter 600px gibt es keinen Rand zum Anklicken (Absicht).');

  await mocks(page);
  await startseite(page);
  await page.evaluate(() => window.openMittagPopup('/bestellstatus.html'));
  await page.waitForTimeout(600);

  await page.locator('#mt-popup-overlay').click({ position: { x: 5, y: 5 } });
  await page.waitForTimeout(400);

  await expect(page.locator('#mt-popup-overlay'),
    'Bestellstatus schließt nicht mehr bei Klick daneben.')
    .not.toHaveClass(/open/);
});

test('TC-KM-04: Strg-Klick öffnet weiterhin einen echten neuen Tab', async ({ page, context }) => {
  await mocks(page);
  await startseite(page);

  const [neueSeite] = await Promise.all([
    context.waitForEvent('page'),
    kontoKnopf(page).click({ modifiers: ['Control'] }),
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

  await kontoKnopf(page).click();
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
