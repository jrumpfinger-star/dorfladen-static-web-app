// tests/smoke.spec.js
//
// READ-ONLY Smoke-Tests: prüfen nur, dass zentrale Seiten laden und rendern.
// KEINE Mutationen (kein CMS-Login, keine Bestellungen) – gefahrlos in CI/PR.
//
// Ausführen:
//   npx playwright test tests/smoke.spec.js
//   TEST_URL=https://<preview> npx playwright test tests/smoke.spec.js --project=mobile
const { test, expect } = require('@playwright/test');

// Öffentliche, rein lesende Seiten (statische .html – immer direkt erreichbar).
const PAGES = [
  { path: '/', name: 'Homepage' },
  { path: '/shop.html', name: 'Shop' },
  { path: '/aktuelles.html', name: 'Aktuelles' },
  { path: '/oeffnungszeiten.html', name: 'Öffnungszeiten' },
  { path: '/sortiment.html', name: 'Sortiment/Preisliste' },
];

for (const p of PAGES) {
  test(`Smoke: ${p.name} lädt und rendert`, async ({ page }) => {
    const resp = await page.goto(p.path, { waitUntil: 'domcontentloaded' });
    expect(resp, `keine Antwort für ${p.path}`).not.toBeNull();
    expect(resp.status(), `HTTP-Status für ${p.path}`).toBeLessThan(400);
    // Titel aller Seiten enthält den Ladennamen.
    await expect(page).toHaveTitle(/Dorfladen/i);
    // Body ist vorhanden und nicht leer.
    await expect(page.locator('body')).toBeVisible();
  });
}
