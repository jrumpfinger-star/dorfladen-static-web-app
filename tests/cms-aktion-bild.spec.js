// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * CMS-Aktion: Bild zum Strichcode auch von Hand holen.
 *
 * Spec: specs/cms-aktion-bild/spec.md (TC-B01 … TC-B07)
 *
 * Aus dem Laden: „Warum wird bei Bayerntaler nicht das Originalbild aus
 * SharePoint angezeigt?"
 *
 * Befund: Das Bild ist da (`2154807005.png`, 437×437). Aber der Ladeversuch
 * lief nur bei Auswahl aus der Vorschlagsliste — und „Bayerntaler" steht
 * nicht in der Preisliste (0 von 2883). Ein Knopf zum Auslösen fehlte;
 * der Code suchte ihn bereits.
 *
 * Ausführen (lokaler Server aus static-site/ auf 8811):
 *   $env:TEST_URL='http://127.0.0.1:8811'
 *   node node_modules\@playwright\test\cli.js test tests/cms-aktion-bild.spec.js
 */

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://www.dorfladen-oberornau.de';
const SC = '2154807005';

/* Ein winziges, gültiges PNG — als Platzhalter für das echte Bild. */
const BILD = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGP4z8AARwzEcQCukw/x0F8jngAAAABJRU5ErkJggg==';
/* Ein zweites, deutlich anderes Bild (16x16 blau) – nach dem Verkleinern
   muss sich das Ergebnis unterscheiden, sonst prueft TC-B09 nichts. */
const BILD_NEU = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFUlEQVR4nGNgYPhPIhrVMKph2GoAAJLb/wFh5Z4RAAAAAElFTkSuQmCC';

/**
 * Antwort des Servers. Der erste Eintrag ist der LEERE Werbebild-Datensatz
 * aus Dataverse — genau so liegt er für diesen Strichcode vor. Wer den
 * ersten Treffer nimmt, bekommt nichts. (TC-B03)
 */
function serverAntwort(mitBild) {
  const aus = [{ id: 'b968a175', dl_werbebildid: 'b968a175',
    dl_artikelnummer: SC, dl_bild_base64: '' }];
  if (mitBild) {
    aus.push({ dl_artikelnummer: SC, dl_bild_base64: BILD,
      source: 'sharepoint', name: SC + '.png' });
  }
  return aus;
}

async function cmsOeffnen(page, opts = {}) {
  const rufe = [];
  await page.route('**/api/werbebilder**', (route) => {
    rufe.push(route.request().url());
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify(serverAntwort(opts.gefunden !== false)),
    });
  });
  await page.route('**/api/**', (route) => {
    if (/werbebilder/.test(route.request().url())) return route.fallback();
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [], groups: [], value: [] }),
    });
  });

  await page.goto(BASE + '/cms.html', { waitUntil: 'domcontentloaded' });
  const hash = await page.evaluate(() => {
    const el = document.getElementById('cms-pw-hash');
    return el ? JSON.parse(el.textContent) : null;
  });
  if (!hash) test.skip(true, 'Diese Seite ist hier nicht ausgeliefert');
  await page.evaluate((v) => sessionStorage.setItem('cms_auth_ok', v), hash);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#cms-app').waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(2000);
  return rufe;
}

/** Den Suchknopf druecken. Auf schmalen Schirmen liegt er ausserhalb des
 *  Sichtfelds - geprueft wird hier der Zwischenspeicher, nicht die
 *  Erreichbarkeit. Die deckt TC-B01 ab. */
async function knopfDruecken(zeile) {
  await zeile.locator('[data-action="loadBildSharePoint"]').evaluate((b) => b.click());
}
/** Den Aktions-Dialog öffnen und die erste Artikelzeile liefern. */
async function aktionOeffnen(page) {
  await page.evaluate(() => window.cmsOpenNewAktion && window.cmsOpenNewAktion());
  await page.locator('.cms-ang-row').first().waitFor({ timeout: 10000 });
  return page.locator('.cms-ang-row').first();
}

test.describe('CMS-Aktion – Bild zum Strichcode', () => {
  test('TC-B01: die Artikelzeile hat einen Knopf zum Bildsuchen',
    async ({ page }) => {
      await cmsOeffnen(page);
      const zeile = await aktionOeffnen(page);
      await expect(zeile.locator('[data-action="loadBildSharePoint"]')).toHaveCount(1);
    });

  test('TC-B02/B03: der Knopf holt das Bild — der leere Datensatz gewinnt nicht',
    async ({ page }) => {
      const rufe = await cmsOeffnen(page);
      const zeile = await aktionOeffnen(page);

      await zeile.locator('[data-f="artikelnummer"]').fill(SC);
      await knopfDruecken(zeile);

      // Das Bild muss im verborgenen Feld landen …
      await expect.poll(async () =>
        (await zeile.locator('[data-f="bild_data"]').inputValue()).length,
      { timeout: 10000 }).toBeGreaterThan(32);
      // … und in der Vorschau sichtbar sein.
      await expect(zeile.locator('.cms-bild-preview')).toBeVisible();

      // TC-B07: über den Server, ohne Anmeldefenster.
      expect(rufe.some((u) => u.includes('artnrs=' + SC) && u.includes('sharepoint=1')))
        .toBe(true);
    });

  test('TC-B04: findet sich nichts, bleibt die Zeile unberührt',
    async ({ page }) => {
      await cmsOeffnen(page, { gefunden: false });
      const zeile = await aktionOeffnen(page);

      await zeile.locator('[data-f="artikelnummer"]').fill(SC);
      await knopfDruecken(zeile);
      await page.waitForTimeout(2500);

      expect(await zeile.locator('[data-f="bild_data"]').inputValue()).toBe('');
      await expect(zeile.locator('.cms-bild-preview')).toBeHidden();
    });

  test('TC-B05: ein von Hand eingetragener Strichcode sucht selbsttätig',
    async ({ page }) => {
      await cmsOeffnen(page);
      const zeile = await aktionOeffnen(page);

      // Genau der gemeldete Fall: Artikel steht nicht in der Preisliste,
      // Name und Strichcode werden getippt.
      await zeile.locator('[data-f="produkt"]').fill('Bayerntaler');
      await zeile.locator('[data-f="artikelnummer"]').fill(SC);
      await zeile.locator('[data-f="artikelnummer"]').blur();

      await expect.poll(async () =>
        (await zeile.locator('[data-f="bild_data"]').inputValue()).length,
      { timeout: 10000 }).toBeGreaterThan(32);
    });

  test('TC-B06: ein vorhandenes Bild wird nicht selbsttätig überschrieben',
    async ({ page }) => {
      await cmsOeffnen(page);
      const zeile = await aktionOeffnen(page);

      const eigenes = 'data:image/png;base64,EIGENESBILD';
      await zeile.locator('[data-f="bild_data"]').evaluate((el, v) => {
        el.value = v;
      }, eigenes);

      await zeile.locator('[data-f="artikelnummer"]').fill(SC);
      await zeile.locator('[data-f="artikelnummer"]').blur();
      await page.waitForTimeout(2500);

      expect(await zeile.locator('[data-f="bild_data"]').inputValue()).toBe(eigenes);
    });

  test('TC-B09/B10: der Knopf holt frisch — ein getauschtes Bild kommt an',
    async ({ page }) => {
      /* Gemeldet: „Es wird immer das alte Bild angezeigt, obwohl es auf
         SharePoint bereits verändert ist." Der 15-Minuten-Speicher im CMS
         hätte beim zweiten Druck weiter das alte geliefert. */
      let aktuell = BILD;
      const rufe = [];
      await page.route('**/api/werbebilder**', (route) => {
        rufe.push(route.request().url());
        return route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify([
            { dl_artikelnummer: SC, dl_bild_base64: '' },
            { dl_artikelnummer: SC, dl_bild_base64: aktuell, source: 'sharepoint' },
          ]),
        });
      });
      await page.route('**/api/**', (route) => {
        if (/werbebilder/.test(route.request().url())) return route.fallback();
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [], groups: [], value: [] }) });
      });

      await page.goto(BASE + '/cms.html', { waitUntil: 'domcontentloaded' });
      const hash = await page.evaluate(() => {
        const el = document.getElementById('cms-pw-hash');
        return el ? JSON.parse(el.textContent) : null;
      });
      if (!hash) test.skip(true, 'Diese Seite ist hier nicht ausgeliefert');
      await page.evaluate((v) => sessionStorage.setItem('cms_auth_ok', v), hash);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('#cms-app').waitFor({ state: 'visible', timeout: 20000 });
      await page.waitForTimeout(2000);

      const zeile = await aktionOeffnen(page);
      await zeile.locator('[data-f="artikelnummer"]').fill(SC);
      await knopfDruecken(zeile);
      await expect.poll(async () =>
        (await zeile.locator('[data-f="bild_data"]').inputValue()).length,
      { timeout: 10000 }).toBeGreaterThan(32);
      const ersteLaenge = (await zeile.locator('[data-f="bild_data"]').inputValue()).length;

      // Das Bild wird in SharePoint getauscht — deutlich größer.
      aktuell = BILD_NEU;

      await knopfDruecken(zeile);
      await expect.poll(async () =>
        (await zeile.locator('[data-f="bild_data"]').inputValue()).length,
      { timeout: 10000 }).not.toBe(ersteLaenge);

      // TC-B10: der zweite Abruf ging wirklich raus und umging den Speicher.
      expect(rufe.length).toBeGreaterThan(1);
      expect(rufe[rufe.length - 1]).toContain('_t=');
    });
});

test.describe('Server – Bilder dürfen nicht zwischengespeichert werden', () => {
  test('TC-B08: /api/werbebilder sendet Cache-Control: no-store', () => {
    /* Ohne diese Kopfzeile darf ein Browser die Antwort nach eigenem
       Ermessen aufbewahren — dann bleibt das ALTE Bild stehen, obwohl in
       SharePoint längst ein neues liegt. Genau das wurde gemeldet. */
    const fs = require('fs');
    const path = require('path');
    const quelle = fs.readFileSync(
      path.join(__dirname, '..', 'api', 'werbebilder', '__init__.py'), 'utf8');
    const kopf = quelle.split('def get_cors_headers()')[1].split('def ')[0];
    expect(kopf).toMatch(/Cache-Control/);
    expect(kopf).toMatch(/no-store/);
  });
});