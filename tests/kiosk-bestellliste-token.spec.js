// @ts-check
const { test, expect } = require('./_kiosk-angemeldet');

/**
 * Die Bestellliste trägt das Kiosk-Token
 * Spec: specs/bestellliste-schuetzen/spec.md
 *
 * Der Server verlangt für die Mittagstisch-Liste künftig `X-CMS-Auth`.
 * Dieser Fall ist die **Voraussetzung** dafür, dass die Durchsetzung
 * überhaupt eingeschaltet werden darf: Schickt der Kiosk das Token nicht
 * mit, stünde der Laden am nächsten Morgen vor einer leeren Liste.
 *
 * Deshalb wird hier nicht die Sperre geprüft, sondern der Schlüssel.
 */

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const LOKAL = /localhost|127\.0\.0\.1/.test(BASE);
const KIOSK_URL = LOKAL ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

function heute() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
    + '-' + String(d.getDate()).padStart(2, '0');
}

async function mockApi(page) {
  const abfragen = [];
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = req.url();
    const json = (o) => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(o),
    });
    if (url.includes('/api/cms-config')) {
      return json({ success: true, data: { feature_flags: { kiosk_mittag: true } } });
    }
    if (url.includes('mode=unread_messages')) return json({ success: true, unread_count: 0 });
    if (url.includes('mode=messages')) return json({ success: true, orders: [] });
    if (url.includes('/api/lunch-order')) {
      if (req.method() === 'GET') abfragen.push({ url, headers: req.headers() });
      return json({
        success: true,
        orders: [{
          id: 'b1', name: 'Anna Beispiel', status: 1, quelle: 1,
          datum: heute(), gericht: 'Dampfnudeln', menge: 1, preis: 7.8,
          mitnehmen: false, anmerkung: '', kommentar_gelesen: true, verlauf: [],
        }],
      });
    }
    return json({ success: true, orders: [], data: [] });
  });
  return abfragen;
}

test.describe('Bestellliste: der Kiosk weist sich aus', () => {
  test.use({ serviceWorkers: 'block' });

  /** Legt das Admin-Token ab, wie es `dlAdminLogin()` nach der
   *  Passworteingabe tut. */
  async function mitToken(page) {
    await page.addInitScript(() => {
      try { localStorage.setItem('cms_auth_token', 'kiosk-token-test'); } catch (e) { }
    });
  }

  test('TC-BL-A1: Die Listen-Abfrage trägt X-CMS-Auth',
    async ({ page }) => {
      /* Ohne diesen Nachweis darf CMS_AUTH_ENFORCE nicht eingeschaltet
         werden — die Liste bliebe leer und niemand wüsste, warum. */
      await mitToken(page);
      const abfragen = await mockApi(page);
      await page.goto(KIOSK_URL);
      await page.click('[data-tab="mittag"]');
      await page.waitForTimeout(2000);

      const listen = abfragen.filter((a) =>
        !a.url.includes('mode=my') && !a.url.includes('nr='));
      expect(listen.length, 'der Kiosk hat die Liste gar nicht abgefragt')
        .toBeGreaterThan(0);

      const ohne = listen.filter((a) => !a.headers['x-cms-auth']);
      expect(ohne.length,
        `${ohne.length} von ${listen.length} Abfragen ohne Token, z. B. ${ohne[0] && ohne[0].url}`)
        .toBe(0);
    });

  test('TC-BL-A2: Die Kundenwege tragen es NICHT',
    async ({ page }) => {
      /* Die Gegenprobe: `mode=my` und die Statusseite laufen über
         denselben Endpunkt, hängen aber am Anmeldezeichen bzw. an der
         Bestellnummer. Würde ihnen das Kiosk-Token angehängt, wäre das
         ein Schlüssel im Browser jeder Kundin. */
      await mitToken(page);
      const abfragen = await mockApi(page);
      await page.goto(KIOSK_URL);
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        fetch('/api/lunch-order?mode=my&device_id=abc');
        fetch('/api/lunch-order?nr=ML-1&email=a@b.de');
      });
      await page.waitForTimeout(1200);

      const kunde = abfragen.filter((a) =>
        a.url.includes('mode=my') || a.url.includes('nr='));
      expect(kunde.length, 'die Kundenwege wurden nicht abgefragt')
        .toBeGreaterThan(0);
      const mit = kunde.filter((a) => a.headers['x-cms-auth']);
      expect(mit.length,
        `Kiosk-Token an einem Kundenweg: ${mit[0] && mit[0].url}`).toBe(0);
    });

  test('TC-BL-A3: Ohne Token bleibt die Anzeige trotzdem stehen',
    async ({ page }) => {
      /* Solange die Durchsetzung aus ist, ändert sich nichts — auch
         nicht für einen Kiosk, dessen Token abgelaufen ist. Das ist die
         Sicherung für den Rollout. */
      await mockApi(page);
      await page.goto(KIOSK_URL);
      await page.click('[data-tab="mittag"]');
      await page.waitForTimeout(2000);
      await expect(page.locator('#oc-b1')).toBeVisible();
    });
});
