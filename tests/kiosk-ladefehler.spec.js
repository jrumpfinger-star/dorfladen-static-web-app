/**
 * Kiosk – „Laden…" darf nie das letzte Wort sein
 *
 * Deckt specs/kiosk-ladefehler/spec.md ab (TC-L01 … TC-L07).
 *
 * Gemeldet mit Bildschirmfoto: Der Mittagstisch bleibt bei „Laden…"
 * stehen, Zähler auf 0, kein Hinweis, kein Weg zurück.
 *
 * Ausführen (lokaler Server aus static-site/ auf 8811):
 *   $env:TEST_URL='http://127.0.0.1:8811'
 *   node node_modules\@playwright\test\cli.js test tests/kiosk-ladefehler.spec.js
 */

const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://www.dorfladen-oberornau.de';
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

const LADEN = '#mittag-orders';
const FEHLER = '#mittag-orders .k-empty:has-text("Die Daten konnten nicht geladen werden")';
const NOCHMAL = '#mittag-orders button:has-text("Erneut versuchen")';

function heute() {
  const d = new Date();
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)
    + '-' + ('0' + d.getDate()).slice(-2);
}

const BESTELLUNG = {
  id: 'b-1',
  name: 'Herbert Andraschko',
  gericht: 'Hähnchenbrustfilet mit Currysoße und Reis',
  anzahl: 2,
  status: 0,
  datum: heute(),
  abholzeit: '12:00',
};

/**
 * Die Hauptabfrage (`?datum=…` ohne `status`) wird nach `art` behandelt,
 * alles Übrige antwortet gesund.
 */
async function mockApi(page, art) {
  await page.route('**/api/lunch-order**', async (route) => {
    const u = route.request().url();
    const haupt = /datum=/.test(u) && !/status=/.test(u) && !/mode=/.test(u);

    if (!haupt) {
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, orders: [], count: 0, unread_count: 0 }) });
    }

    if (art === 'fehler500') {
      return route.fulfill({ status: 500, contentType: 'text/plain', body: 'Serverfehler' });
    }
    if (art === 'ohneErfolg') {
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'kaputt' }) });
    }
    if (art === 'abbruch') {
      return route.abort('failed');
    }
    if (art === 'stumm') {
      return new Promise(() => { /* antwortet nie */ });
    }
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, orders: [BESTELLUNG] }) });
  });

  // Alles Übrige ruhigstellen.
  await page.route('**/api/**', (route) => {
    if (/lunch-order/.test(route.request().url())) return route.fallback();
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
}

async function kioskOeffnen(page) {
  await page.goto(KIOSK_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(LADEN, { state: 'attached', timeout: 20000 });
}

test.describe('Kiosk – Ladefehler werden angezeigt', () => {
  test('TC-L01: HTTP 500 zeigt Meldung statt ewigem Spinner', async ({ page }) => {
    await mockApi(page, 'fehler500');
    await kioskOeffnen(page);

    await expect(page.locator(LADEN)).toContainText('Die Daten konnten nicht geladen werden', { timeout: 20000 });
    await expect(page.locator(LADEN)).toContainText('Erneut versuchen');
    await expect(page.locator(LADEN)).not.toContainText('Laden…');
  });

  test('TC-L02: success:false zeigt Meldung', async ({ page }) => {
    await mockApi(page, 'ohneErfolg');
    await kioskOeffnen(page);

    await expect(page.locator(LADEN)).toContainText('Die Daten konnten nicht geladen werden', { timeout: 20000 });
    await expect(page.locator(LADEN)).toContainText('Der Server meldet einen Fehler');
  });

  test('TC-L04: abgebrochene Verbindung zeigt Meldung', async ({ page }) => {
    await mockApi(page, 'abbruch');
    await kioskOeffnen(page);

    await expect(page.locator(LADEN)).toContainText('Die Daten konnten nicht geladen werden', { timeout: 20000 });
    await expect(page.locator(LADEN)).toContainText('Keine Verbindung');
  });

  test('TC-L03: ausbleibende Antwort zeigt nach 15 s eine Meldung', async ({ page }) => {
    test.setTimeout(90000);
    await mockApi(page, 'stumm');
    await kioskOeffnen(page);

    // Zuerst dreht der Spinner – das ist richtig so.
    await expect(page.locator(LADEN)).toContainText('Laden…');
    // Und dann darf er nicht ewig dort bleiben.
    await expect(page.locator(LADEN)).toContainText('Die Daten konnten nicht geladen werden', { timeout: 30000 });
    await expect(page.locator(LADEN)).toContainText('dauert ungewöhnlich lange');
  });

  test('TC-L05: „Erneut versuchen" holt die Daten', async ({ page }) => {
    let art = 'fehler500';
    await page.route('**/api/lunch-order**', async (route) => {
      const u = route.request().url();
      const haupt = /datum=/.test(u) && !/status=/.test(u) && !/mode=/.test(u);
      if (!haupt) {
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ success: true, orders: [], count: 0, unread_count: 0 }) });
      }
      if (art === 'fehler500') {
        return route.fulfill({ status: 500, contentType: 'text/plain', body: 'Serverfehler' });
      }
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, orders: [BESTELLUNG] }) });
    });
    await page.route('**/api/**', (route) => {
      if (/lunch-order/.test(route.request().url())) return route.fallback();
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await kioskOeffnen(page);
    await expect(page.locator(LADEN)).toContainText('Erneut versuchen', { timeout: 20000 });

    art = 'gut';                       // die Leitung ist wieder da
    let neueVersuche = 0;
    page.on('request', (r) => {
      const u = r.url();
      if (/lunch-order/.test(u) && /datum=/.test(u) && !/status=/.test(u)) neueVersuche++;
    });

    await page.evaluate((sel) => {
      const b = document.querySelector(sel);
      if (b) b.click();
    }, '#mittag-orders button');

    // Der Knopf muss einen neuen Ladeversuch ausloesen …
    await expect.poll(() => neueVersuche, { timeout: 15000 }).toBeGreaterThan(0);
    // … und die Meldung muss wieder verschwinden.
    await expect(page.locator(LADEN))
      .not.toContainText('Die Daten konnten nicht geladen werden', { timeout: 20000 });
  });

  test('TC-L06: im Normalfall erscheint keine Meldung', async ({ page }) => {
    await mockApi(page, 'gut');
    await kioskOeffnen(page);

    await expect(page.locator('#mittag-orders')).toContainText('Herbert Andraschko', { timeout: 25000 });
    await expect(page.locator(LADEN)).not.toContainText('Die Daten konnten nicht geladen werden');
  });
});

test.describe('Service Worker', () => {
  test('TC-L07: CACHE_NAME wurde hochgezählt', () => {
    const quelle = fs.readFileSync(
      path.join(__dirname, '..', 'static-site', 'sw.js'), 'utf8');
    const treffer = quelle.match(/CACHE_NAME\s*=\s*'dorfladen-v(\d+)'/);
    expect(treffer).not.toBeNull();
    expect(Number(treffer[1])).toBeGreaterThanOrEqual(33);
  });
});
