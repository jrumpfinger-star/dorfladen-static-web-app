/**
 * Die Registrierung schickt mit, woher sie kam.
 * Spec: specs/registrierung-herkunft/spec.md
 *
 * Der Server-Teil (Liste, Bestätigungsseite, offene Weiterleitung) steht
 * in tests/test_registrierung_herkunft.py. Hier nur: Sendet die Seite den
 * richtigen Schlüssel?
 */
const { test, expect } = require('@playwright/test');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const LOKAL = /localhost|127\.0\.0\.1/.test(BASE);
const KONTO = LOKAL ? `${BASE}/mein-konto.html` : `${BASE}/mein-konto`;

async function registriere(page, adresse) {
  const gesendet = [];
  await page.route('**/api/auth-register', (route) => {
    gesendet.push(route.request().postDataJSON());
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
  await page.goto(adresse, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await page.fill('#mk-vorname', 'Anna');
  await page.fill('#mk-nachname', 'Beispiel');
  await page.fill('#mk-neu-mail', 'anna@example.com');
  await page.fill('#mk-neu-pw', 'geheim123');
  await page.fill('#mk-neu-pw2', 'geheim123');
  await page.check('#mk-dsgvo');
  await page.check('#mk-agb');
  await page.click('#mk-neu-knopf');
  await expect(page.locator('#mk-bestaetigen')).toBeVisible({ timeout: 8000 });
  return gesendet[0];
}

test('TC-RH-10: Von der Startseite aus -> herkunft "start"', async ({ page }) => {
  const b = await registriere(page, `${KONTO}#neu`);
  expect(b.herkunft).toBe('start');
});

test('TC-RH-11: Aus dem Mittagstisch aus -> herkunft "mittag"', async ({ page }) => {
  const b = await registriere(page, `${KONTO}?von=mittag#neu`);
  expect(b.herkunft).toBe('mittag');
});

test('TC-RH-12: Die Links im Mittagstisch tragen ?von=mittag', async ({ page }) => {
  await page.goto(LOKAL ? `${BASE}/mittagstisch-bestellen.html` : `${BASE}/mittagstisch-bestellen`,
    { waitUntil: 'domcontentloaded' });
  const hrefs = await page.locator('a[href*="mein-konto"][href*="#neu"]')
    .evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  expect(hrefs.length).toBeGreaterThan(0);
  for (const h of hrefs) expect(h).toContain('von=mittag');
});
