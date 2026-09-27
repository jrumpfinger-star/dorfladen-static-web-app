/**
 * Aus der Liste "Meine Bestellungen" eine Bestellung oeffnen - der Waechter
 * Spec: specs/bestellung-aus-liste-oeffnen/spec.md
 *
 * Aus dem Laden gemeldet: "Von hier aus kann man aber nicht die Bestellung
 * bearbeiten." Gemessen: Der Klick oeffnete das Statusfenster - und schloss
 * es im selben Wimpernschlag wieder. Ursache war ein history.back() aus
 * pwa.js: Sobald das Listen-Popup zuging, hielt der Beobachter dort alle
 * Overlays fuer geschlossen und raeumte seinen History-Eintrag ab. Der
 * Ruecksprung traf das gerade geoeffnete Fenster.
 *
 * Der Fehler trat nur ab ZWEI Bestellungen auf. Bei einer einzigen zeigt
 * die Startseite die Bestellung direkt in der Kachel, ohne Popup - und
 * ohne Popup gibt es keinen History-Eintrag, der abgeraeumt werden
 * koennte. Deshalb blieb er lange unbemerkt.
 *
 * Ausfuehren:
 *   python -m http.server 8099   (aus static-site/)
 *   $env:TEST_URL='http://127.0.0.1:8099'
 *   npx playwright test tests/bestellung-aus-liste-oeffnen.spec.js
 */

const { test, expect } = require('@playwright/test');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const LOKAL = /localhost|127\.0\.0\.1/.test(BASE);
const START = LOKAL ? `${BASE}/index.html` : `${BASE}/`;

const OFFEN = {
  id: 'test-1', bestellnummer: 'MT-9001', datum: '2099-09-30',
  gericht: 'Fleischpflanzerl mit Kartoffelsalat', status: 0, menge: 1, preis: 8.8,
  name: 'Test Kunde', email: 'test@example.com',
};
const STORNIERT = {
  id: 'test-2', bestellnummer: 'MT-9002', datum: '2099-09-30',
  gericht: 'Fleischpflanzerl mit Kartoffelsalat', status: 2, menge: 1, preis: 8.8,
  name: 'Test Kunde', email: 'test@example.com',
  storno_grund: 'Kundengrund: Krank geworden',
};

/* Die Bestellungen kommen aus dem Mock, nicht aus dem echten Laden - der
   Waechter darf keine fremden Daten anfassen und keine erzeugen. */
async function bestellungenStellen(page, liste) {
  await page.route('**/api/lunch-order*', (route) => {
    const nr = new URL(route.request().url()).searchParams.get('nr');
    if (nr) {
      const treffer = liste.find((o) => o.bestellnummer === nr);
      return route.fulfill({ contentType: 'application/json',
        body: JSON.stringify(treffer ? { success: true, order: treffer } : { success: false }) });
    }
    return route.fulfill({ contentType: 'application/json',
      body: JSON.stringify({ success: true, orders: liste }) });
  });
  await page.route('**/api/shop-order*', (route) => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ success: true, orders: [] }) }));

  /* Der lokale Testserver kennt keine huebschen URLs; live uebernimmt das
     eine Umschreibregel der Static Web App. */
  if (LOKAL) {
    await page.route('**/bestellstatus?*', (route) => route.continue({
      url: route.request().url().replace('/bestellstatus?', '/bestellstatus.html?') }));
  }

  await page.addInitScript(() => {
    try { localStorage.setItem('dl_push_device_id', 'waechter-geraet'); } catch (e) {}
  });
}

async function startseite(page) {
  await page.goto(START, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
}

/* Je nach Breite baut die Startseite die Kachel an einer anderen Stelle
   auf; die jeweils andere bleibt verborgen. Deshalb :visible. */
async function kachelKlicken(page) {
  const kachel = page.locator(
    '#desk-my-orders div[onclick]:visible, #mob-my-orders div[onclick]:visible')
    .filter({ hasText: /Bestellung/i }).first();
  await expect(kachel, 'Die Kachel "Meine Bestellungen" fehlt.')
    .toBeVisible({ timeout: 10000 });
  await kachel.click();
}

test('TC-BL-01: Ab zwei Bestellungen oeffnet ein Klick in der Liste die Bestellung', async ({ page }) => {
  await bestellungenStellen(page, [OFFEN, STORNIERT]);
  await startseite(page);
  await kachelKlicken(page);

  const eintrag = page.locator('[id^="popup-"]:visible a').first();
  await expect(eintrag, 'Das Listen-Popup zeigt keine Bestellung.')
    .toBeVisible({ timeout: 15000 });
  await eintrag.click();

  /* Der eigentliche Beweis: Das Fenster bleibt offen. Vor der Korrektur
     ging es auf und sofort wieder zu. */
  await expect(page.locator('#mt-popup-overlay'),
    'Das Statusfenster hat sich sofort wieder geschlossen.')
    .toHaveClass(/open/, { timeout: 15000 });
});

test('TC-BL-02: Dort laesst sich die Bestellung auch stornieren', async ({ page }) => {
  await bestellungenStellen(page, [OFFEN, STORNIERT]);
  await startseite(page);
  await kachelKlicken(page);
  await page.locator('[id^="popup-"]:visible a').first().click();

  const rahmen = page.frameLocator('#mt-popup-iframe');
  await expect(rahmen.locator('#bs-cancel-btn'),
    'Der Storno-Knopf ist im Statusfenster nicht erreichbar.')
    .toBeVisible({ timeout: 15000 });
  await expect(rahmen.locator('#bs-comment'),
    'Das Nachrichtenfeld fehlt.').toBeVisible();
});

test('TC-BL-03: Mit nur einer Bestellung fuehrt die Kachel weiterhin hin', async ({ page }) => {
  await bestellungenStellen(page, [OFFEN]);
  await startseite(page);
  await kachelKlicken(page);

  await expect(page.locator('#mt-popup-overlay')).toHaveClass(/open/, { timeout: 15000 });
});

test('TC-BL-04: Die Zurueck-Taste schliesst das Fenster, ohne die Seite zu verlassen', async ({ page }) => {
  await bestellungenStellen(page, [OFFEN, STORNIERT]);
  await startseite(page);
  await kachelKlicken(page);
  await page.locator('[id^="popup-"]:visible a').first().click();
  await expect(page.locator('#mt-popup-overlay')).toHaveClass(/open/, { timeout: 15000 });

  await page.goBack();
  await page.waitForTimeout(1200);

  await expect(page.locator('#mt-popup-overlay'),
    'Die Zurueck-Taste schliesst das Statusfenster nicht.').not.toHaveClass(/open/);
  expect(page.url().replace(/#.*$/, ''),
    'Die Zurueck-Taste hat die Startseite verlassen.')
    .toContain(LOKAL ? 'index.html' : BASE);
});

/* Dieselbe Stelle gibt es ein zweites Mal: Die Fleisch- und Wurstliste
   schliesst ihr Popup genauso und ruft dann openBestellstatus. Sie war
   damit ebenso betroffen - nur faellt es dort seltener auf, weil selten
   mehrere Vorbestellungen zugleich offen sind. */
test('TC-BL-05: Auch aus der Fleischliste laesst sich eine Bestellung oeffnen', async ({ page }) => {
  await bestellungenStellen(page, [OFFEN, STORNIERT]);
  await page.route('**/api/fleisch-order*', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, bestellungen: [
      { id: 'fm-1', bestellnummer: 'FM-9001', liefertag: '2099-10-02', status: 0 },
      { id: 'fm-2', bestellnummer: 'FM-9002', liefertag: '2099-10-09', status: 1 },
    ] }) }));
  await page.addInitScript(() => {
    try { localStorage.setItem('fm_telefon', '08082622999'); } catch (e) {}
  });
  await startseite(page);

  /* Das Fleisch-Banner erscheint nur, wenn im CMS gerade eine Aktion
     laeuft - die Liste darin wird aber immer aufgebaut. Der Waechter
     oeffnet das Popup deshalb so, wie es der Knopf taete, statt sich von
     der Tagesaktion abhaengig zu machen. */
  const popupDa = await page.locator('#popup-desk-fm-orders').count();
  expect(popupDa, 'Die Fleischliste wurde gar nicht aufgebaut.').toBeGreaterThan(0);
  await page.evaluate(() => {
    const p = document.getElementById('popup-desk-fm-orders');
    p.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  });

  const eintrag = page.locator('#popup-desk-fm-orders a:visible').first();
  await expect(eintrag, 'Die Fleischliste zeigt keine Vorbestellung.')
    .toBeVisible({ timeout: 10000 });
  await eintrag.click();

  await expect(page.locator('#mt-popup-overlay'),
    'Aus der Fleischliste oeffnet sich keine Bestellung.')
    .toHaveClass(/open/, { timeout: 15000 });
});
