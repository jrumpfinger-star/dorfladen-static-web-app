/**
 * Anmelden während der Bestellung - und Fehlermeldungen, die man sieht
 * Spec: specs/konto-waehrend-bestellung/spec.md
 *
 * Aus dem Laden: „Bei der Bestellung selbst gibt es aber nicht die
 * Möglichkeit sich anzumelden, und es gibt auch keinen Hinweis darauf
 * und was es für Möglichkeiten bietet."
 *
 * Gemessen: Stimmt genau. Der einzige Weg zum Konto war ein
 * unbeschrifteter Link „Mein Konto" ganz unten in der Fußzeile - und der
 * hätte beim Anklicken den eingebetteten Bestell-Rahmen (ein <iframe>)
 * selbst umgeleitet, die halb ausgefüllte Bestellung stillschweigend
 * verworfen und die Kontoseite winzig im Bestellfenster gezeigt.
 *
 * Beim Bau des Anmelde-Fensters ein zweiter, unabhängiger Fund: Der
 * Fehlerkasten (`#error-box`) dieser Seite setzt seit jeher
 * `style.display=''` - aber die CSS-Klasse selbst trägt `display:none`.
 * Eine leere Zeichenkette hebt eine per Klasse gesetzte Eigenschaft nicht
 * auf; sie bleibt unsichtbar. Fehlender Name, überschrittener
 * Bestellschluss, vom Server abgelehnte Bestellung, fehlgeschlagene
 * Verbindung - keine dieser vier Meldungen war je zu sehen. Wer sein
 * Formular falsch ausfüllte, sah nur, dass nichts passierte.
 *
 * Ausführen:
 *   python -m http.server 8099   (aus static-site/)
 *   $env:TEST_URL='http://127.0.0.1:8099'
 *   npx playwright test tests/konto-waehrend-bestellung.spec.js
 */

const { test, expect } = require('@playwright/test');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const SEITE = /localhost|127\.0\.0\.1/.test(BASE)
  ? `${BASE}/mittagstisch-bestellen.html` : `${BASE}/mittagstisch-bestellen`;

const KUNDE = { vorname: 'Anna', nachname: 'Beispiel', email: 'anna@example.com' };

async function mocks(page, { loginFehler = false } = {}) {
  await page.route('**/api/wochenplan*', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: [{
      dl_wochenplanid: 'w1', dl_gericht: 'Fleischpflanzerl mit Kartoffelsalat',
      dl_preis: 8.8, dl_wochentag: 101002, dl_datum: '2099-10-01T00:00:00Z',
    }] }) }));
  await page.route('**/api/cms-config*', (route) => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ success: true, data: { feature_flags: {} } }) }));
  await page.route('**/api/auth-login', (route) => {
    if (loginFehler) return route.fulfill({ contentType: 'application/json',
      body: JSON.stringify({ success: false, error: 'E-Mail oder Passwort stimmt nicht.' }) });
    return route.fulfill({ contentType: 'application/json',
      body: JSON.stringify({ success: true, token: 'test-zeichen', kunde: KUNDE }) });
  });
  await page.route('**/api/lunch-order', (route) => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ success: false, error: 'Abgelehnt (Test).' }) }));
}

async function gerichtWaehlen(page) {
  await page.goto(SEITE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.menu-item', { timeout: 10000 });
  await page.click('.menu-item');
  await page.waitForSelector('#dish-section:visible');
}

test('TC-KB-01: In den Kundendaten steht ein Weg zum Anmelden', async ({ page }) => {
  await mocks(page);
  await gerichtWaehlen(page);

  const hinweis = page.locator('#konto-status-aus');
  await expect(hinweis, 'Kein Hinweis auf die Anmeldung während der Bestellung.')
    .toBeVisible();
  await expect(hinweis).toContainText('Anmelden');
  await expect(hinweis).toContainText('anderen Geräten');
});

test('TC-KB-02: Anmelden öffnet ein Fenster, ohne die Seite zu verlassen', async ({ page }) => {
  await mocks(page);
  await gerichtWaehlen(page);

  // Etwas von der Bestellung eintragen, die erhalten bleiben muss.
  await page.click('#qty-plus');
  await page.fill('#note-input', 'ohne Zwiebeln');

  await page.click('#konto-status-aus a');
  await expect(page.locator('#login-modal')).toHaveClass(/open/);

  await page.fill('#login-mail', KUNDE.email);
  await page.fill('#login-pw', 'geheim123');
  await page.click('#login-knopf');

  await expect(page.locator('#login-modal'), 'Das Anmeldefenster schließt sich nicht.')
    .not.toHaveClass(/open/, { timeout: 8000 });

  /* Der eigentliche Beweis: keine Navigation, die Bestellung lebt weiter. */
  expect(page.url()).toContain('mittagstisch-bestellen');
  await expect(page.locator('#qty-val')).toHaveText('2');
  await expect(page.locator('#note-input')).toHaveValue('ohne Zwiebeln');
});

test('TC-KB-03: Nach dem Anmelden füllen sich Name und E-Mail, der Status wechselt', async ({ page }) => {
  await mocks(page);
  await gerichtWaehlen(page);

  await page.click('#konto-status-aus a');
  await page.fill('#login-mail', KUNDE.email);
  await page.fill('#login-pw', 'geheim123');
  await page.click('#login-knopf');
  await expect(page.locator('#login-modal')).not.toHaveClass(/open/, { timeout: 8000 });

  await expect(page.locator('#konto-status-aus')).toBeHidden();
  await expect(page.locator('#konto-status-an')).toBeVisible();
  await expect(page.locator('#konto-status-name')).toHaveText(KUNDE.vorname);
  await expect(page.locator('#cust-email')).toHaveValue(KUNDE.email);
  await expect(page.locator('#cust-name')).toHaveValue('Anna Beispiel');
});

test('TC-KB-04: Falsches Passwort wird verständlich gemeldet', async ({ page }) => {
  await mocks(page, { loginFehler: true });
  await gerichtWaehlen(page);

  await page.click('#konto-status-aus a');
  await page.fill('#login-mail', KUNDE.email);
  await page.fill('#login-pw', 'falsch');
  await page.click('#login-knopf');

  await expect(page.locator('#login-fehler'), 'Die Fehlermeldung bleibt unsichtbar.')
    .toBeVisible({ timeout: 8000 });
  await expect(page.locator('#login-fehler')).toContainText('stimmt nicht');
  // Das Fenster bleibt offen - ein zweiter Versuch muss möglich sein.
  await expect(page.locator('#login-modal')).toHaveClass(/open/);
});

test('TC-KB-05: Leeres Anmeldeformular wird verständlich gemeldet', async ({ page }) => {
  await mocks(page);
  await gerichtWaehlen(page);

  await page.click('#konto-status-aus a');
  await page.click('#login-knopf');

  await expect(page.locator('#login-fehler'), 'Die Fehlermeldung bleibt unsichtbar.')
    .toBeVisible({ timeout: 5000 });
  await expect(page.locator('#login-fehler')).toContainText('E-Mail und Passwort');
});

test('TC-KB-06: Fehlender Name wird beim Bestellen sichtbar gemeldet', async ({ page }) => {
  /* Der zweite, unabhängige Fund: dieselbe Anzeige-Lücke betrifft auch
     die Bestellung selbst, nicht nur das neue Anmeldefenster. */
  await mocks(page);
  await gerichtWaehlen(page);
  await page.fill('#cust-name', '');

  await page.click('#submit-btn');

  await expect(page.locator('#error-box'), 'Die Fehlermeldung bleibt unsichtbar.')
    .toBeVisible({ timeout: 5000 });
  await expect(page.locator('#error-box')).toContainText('Name');
});

test('TC-KB-07: Eine vom Server abgelehnte Bestellung wird sichtbar gemeldet', async ({ page }) => {
  await mocks(page);
  await gerichtWaehlen(page);
  await page.fill('#cust-name', 'Test Kunde');

  await page.click('#submit-btn');

  await expect(page.locator('#error-box'), 'Die Fehlermeldung bleibt unsichtbar.')
    .toBeVisible({ timeout: 8000 });
  await expect(page.locator('#error-box')).toContainText('Abgelehnt');
});

test('TC-KB-08: Angemeldete sehen den Hinweis nicht mehr', async ({ page }) => {
  await mocks(page);
  await page.addInitScript((k) => {
    try {
      localStorage.setItem('dl_shop_token', 'test-zeichen');
      localStorage.setItem('dl_shop_user', JSON.stringify(k));
    } catch (e) {}
  }, KUNDE);
  await gerichtWaehlen(page);

  await expect(page.locator('#konto-status-aus')).toBeHidden();
  await expect(page.locator('#konto-status-an')).toBeVisible();
});

test('TC-KB-09: „Mein Konto" in der Fußzeile öffnet einen neuen Tab', async ({ page, context }) => {
  /* Vorher navigierte dieser Link den eingebetteten Bestell-Rahmen
     selbst - die Bestellung wäre beim Zurückkommen verloren gewesen. */
  await mocks(page);
  await gerichtWaehlen(page);

  const [neueSeite] = await Promise.all([
    context.waitForEvent('page'),
    page.locator('.footer a[href="/mein-konto"]').click(),
  ]);
  await neueSeite.waitForLoadState('domcontentloaded');

  expect(neueSeite.url()).toContain('mein-konto');
  expect(page.url(), 'Die ursprüngliche Bestellseite wurde verlassen.')
    .toContain('mittagstisch-bestellen');
});
