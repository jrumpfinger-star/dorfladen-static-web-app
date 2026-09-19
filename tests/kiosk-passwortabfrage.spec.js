// @ts-check
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

/**
 * Kiosk: dieselbe Passwortabfrage wie im CMS.
 *
 * Spec: specs/kiosk-passwortabfrage/spec.md (TC-P01 … TC-P10)
 *
 * Aus dem Laden: „Ich möchte die gleiche Passwortabfrage wie in CMS."
 *
 * Wichtig zur Einordnung: Das ist ein Riegel vor der Bedienoberfläche,
 * kein Schutz der Daten — die Schnittstellen antworten weiterhin ohne
 * Anmeldung. Diese Tests prüfen genau das, was die Maske leisten soll.
 *
 * Ausführen (lokaler Server aus static-site/ auf 8811):
 *   $env:TEST_URL='http://127.0.0.1:8811'
 *   node node_modules\@playwright\test\cli.js test tests/kiosk-passwortabfrage.spec.js
 */

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://www.dorfladen-oberornau.de';
const KIOSK = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

/* Ein Prüfpasswort samt Prüfsumme. Das echte Passwort steht nirgends im
   Test — die Seite bekommt für den Lauf eine andere Prüfsumme untergelegt. */
const PW = 'pruef-kiosk-2026';
const PW_HASH = '1d9b4e8a1c7e1537aa6c000fe2460ddea75ecbb5c3e58bc921790b4495c0a9c2';

/**
 * Öffnet den Kiosk und tauscht dabei die hinterlegte Prüfsumme aus.
 * `opts.ohneHash` entfernt sie ganz (Sicherungsfall).
 * `opts.schluessel` legt einen Sitzungsschlüssel vor dem Laden ab.
 */
async function kioskOeffnen(page, opts = {}) {
  await page.route('**/api/**', (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [], orders: [], tage: [], artikel: [] }),
    }));

  await page.route(/kiosk(\.html)?(\?.*)?$/, async (route) => {
    const antwort = await route.fetch();
    let html = await antwort.text();
    const alt = /<script id="cms-pw-hash"[^>]*>"[^"]*"<\/script>/;
    html = opts.ohneHash
      ? html.replace(alt, '')
      : html.replace(alt, `<script id="cms-pw-hash" type="application/json">"${PW_HASH}"</script>`);
    await route.fulfill({ response: antwort, body: html, headers: { 'content-type': 'text/html; charset=utf-8' } });
  });

  if (opts.schluessel) {
    await page.addInitScript((v) => {
      try { sessionStorage.setItem('cms_auth_ok', v); } catch (e) { /* egal */ }
    }, opts.schluessel);
  }

  await page.goto(KIOSK, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
}

/** Ist der Betrieb dahinter wirklich verdeckt? */
function lage(page) {
  return page.evaluate(() => {
    const g = document.getElementById('kiosk-gate');
    const kopf = document.querySelector('.k-header');
    const r = kopf ? kopf.getBoundingClientRect() : null;
    return {
      gateSichtbar: g ? getComputedStyle(g).display !== 'none' : false,
      gesperrt: document.documentElement.classList.contains('kiosk-zu'),
      // Im Raster steckt die Kopfzeile in `.k-app` — ist die verborgen,
      // hat sie messbar keine Fläche. Das ist der verlässliche Nachweis.
      kopfFlaeche: r ? Math.round(r.width * r.height) : 0,
    };
  });
}

test.describe('Kiosk – Passwortabfrage', () => {
  test('TC-P01/P07: ohne Anmeldung erscheint die Maske, der Betrieb ist verdeckt',
    async ({ page }) => {
      await kioskOeffnen(page);
      const l = await lage(page);

      expect(l.gateSichtbar).toBe(true);
      expect(l.gesperrt).toBe(true);          // TC-P07: von Anfang an gesperrt
      expect(l.kopfFlaeche).toBe(0);          // nichts vom Kiosk zu sehen
      await expect(page.locator('#kiosk-gate')).toContainText('Bitte Passwort eingeben');
    });

  test('TC-P02: ein falsches Passwort meldet sich und sperrt weiter',
    async ({ page }) => {
      await kioskOeffnen(page);

      await page.locator('#kg-pw').fill('falsch');
      await page.locator('#kg-btn').click();
      await page.waitForTimeout(600);

      await expect(page.locator('#kg-err')).toBeVisible();
      expect(await page.locator('#kg-pw').inputValue()).toBe('');   // Feld geleert
      const l = await lage(page);
      expect(l.gesperrt).toBe(true);
      expect(l.kopfFlaeche).toBe(0);
    });

  test('TC-P03: das richtige Passwort sperrt auf', async ({ page }) => {
    await kioskOeffnen(page);

    await page.locator('#kg-pw').fill(PW);
    await page.locator('#kg-btn').click();

    await expect.poll(async () => (await lage(page)).gesperrt, { timeout: 8000 }).toBe(false);
    const l = await lage(page);
    expect(l.gateSichtbar).toBe(false);
    expect(l.kopfFlaeche).toBeGreaterThan(1000);   // der Kiosk ist wieder da
  });

  test('TC-P08: die Eingabetaste meldet genauso an', async ({ page }) => {
    await kioskOeffnen(page);

    await page.locator('#kg-pw').fill(PW);
    await page.locator('#kg-pw').press('Enter');

    await expect.poll(async () => (await lage(page)).gesperrt, { timeout: 8000 }).toBe(false);
  });

  test('TC-P04: nach dem Aufsperren bleibt die Sitzung frei', async ({ page }) => {
    await kioskOeffnen(page);
    await page.locator('#kg-pw').fill(PW);
    await page.locator('#kg-btn').click();
    await expect.poll(async () => (await lage(page)).gesperrt, { timeout: 8000 }).toBe(false);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const l = await lage(page);
    expect(l.gesperrt).toBe(false);
    expect(l.gateSichtbar).toBe(false);
  });

  test('TC-P05: wer im CMS angemeldet ist, kommt ohne Eingabe hinein',
    async ({ page }) => {
      // Genau das, was cms.js beim Anmelden ablegt — derselbe Schlüssel.
      await kioskOeffnen(page, { schluessel: PW_HASH });
      const l = await lage(page);

      expect(l.gesperrt).toBe(false);
      expect(l.gateSichtbar).toBe(false);
      expect(l.kopfFlaeche).toBeGreaterThan(1000);
    });

  test('TC-P06: ohne hinterlegtes Passwort wird nicht ausgesperrt',
    async ({ page }) => {
      /* Der Laden muss arbeiten können. Fehlt die Prüfsumme, wäre ein
         gesperrter Kiosk schlimmer als ein offener. */
      await kioskOeffnen(page, { ohneHash: true });
      const l = await lage(page);

      expect(l.gesperrt).toBe(false);
      expect(l.gateSichtbar).toBe(false);
      expect(l.kopfFlaeche).toBeGreaterThan(1000);
    });

  test('TC-P09: Feld und Knopf haben Antippgröße', async ({ page }) => {
    await kioskOeffnen(page);

    for (const sel of ['#kg-pw', '#kg-btn']) {
      const h = await page.locator(sel).evaluate((el) =>
        Math.round(el.getBoundingClientRect().height));
      expect(h, sel + ' ist zu flach').toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('Quelle', () => {
  test('TC-P10: das Passwort steht an genau einer Stelle', () => {
    /* Anfangs stand die Prüfsumme doppelt im Code (Sperrskript und
       Maske). Wer eines der beiden ändert, hätte einen Kiosk, der sich
       mit zwei verschiedenen Passwörtern unterschiedlich verhält. */
    const quelle = fs.readFileSync(
      path.join(__dirname, '..', 'static-site', 'kiosk-klassisch.html'), 'utf8');
    const treffer = quelle.match(/d324fb3c8c3a1ef449e1f776b2f29fd718d00e7967adbb0bbe8326c2452bea93/g) || [];
    expect(treffer.length).toBe(1);
    // Und beide Skripte lesen ihn aus demselben Element.
    expect(quelle).toContain('id="cms-pw-hash"');
  });
});
