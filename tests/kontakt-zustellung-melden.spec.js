// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Kundenchat „Schreib uns" – die Quittung an den Laden (js/kontakt.js)
 *
 * Aus dem Laden: „Kann auch angezeigt werden, ob eine ausgehende Nachricht
 * geliefert und gelesen wurde wie in WhatsApp?"
 *
 * Der Abruf des Verlaufs IST die Quittung. Entscheidend ist, dass die beiden
 * Fälle sauber getrennt bleiben:
 *   - Hintergrundabfrage (roter Punkt, alle 45 s) → nur „zugestellt"
 *   - geöffnetes Chatfenster                      → auch „gelesen"
 *
 * Würde die Hintergrundabfrage `gelesen=1` mitschicken, stünde im Kiosk
 * „vom Kunden gelesen", obwohl er die Seite nur im Hintergrund offen hat.
 * Das wäre schlimmer als gar keine Anzeige.
 *
 * Spec: specs/kontakt-zustellstatus/spec.md
 */

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';

function thread() {
  return {
    id: 'k1', name: 'Testkunde', device_id: 'dev-test-1',
    kommentar_gelesen: true,
    verlauf: [
      { who: 'kunde', text: 'Habt ihr Brot?', t: '2026-09-24T08:00:00Z' },
      { who: 'dorfladen', text: 'Ja, frisch da.', t: '2026-09-24T09:00:00Z' },
    ],
  };
}

async function chatVorbereiten(page) {
  /** @type {string[]} */
  const abrufe = [];

  // Reihenfolge zaehlt: erst die Auffangroute, danach die spezifischen.
  // Und jedes route() MIT await – sonst ist die Route unter Last noch nicht
  // registriert, wenn die Seite ihre ersten Aufrufe absetzt.
  await page.route('**/api/**', (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [], orders: [], posts: [], thread: null }),
    }));

  await page.route('**/api/cms-config**', (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { feature_flags: { kiosk_kontakt: true } } }),
    }));

  await page.route('**/api/contact-message**', (route) => {
    const url = route.request().url();
    if (route.request().method() === 'GET' && /mode=my/.test(url)) abrufe.push(url);
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, thread: thread() }),
    });
  });

  await page.addInitScript(() => {
    try {
      localStorage.clear();
      // Ohne Geraete-ID fragt der Chat den Verlauf gar nicht ab.
      localStorage.setItem('dl_push_device_id', 'dev-test-1');
      const d = new Date().toISOString().substring(0, 10);
      localStorage.setItem('tagespost_seen_' + d, '1');
      localStorage.setItem('pwa-dismissed', '1');
      localStorage.setItem('dl_cookies', '1');
    } catch (e) { /* ignore */ }
  });

  await page.goto(BASE + '/', { waitUntil: 'commit' });
  await page.waitForFunction(() => !!(window.DLKontakt && window.DLKontakt.open), null, { timeout: 20000 });
  return abrufe;
}

const mitGelesen = (u) => /[?&]gelesen=1/.test(u);

test.describe('Schreib uns: Zustell- und Lesequittung (KZ)', () => {
  test.use({ serviceWorkers: 'block' });

  test('TC-KZ-K1: Bei geöffnetem Chat wird „gelesen" gemeldet', async ({ page }) => {
    const abrufe = await chatVorbereiten(page);
    await page.evaluate(() => window.DLKontakt.open());
    await expect(page.locator('#hp-chat-input')).toBeVisible({ timeout: 10000 });
    await expect.poll(() => abrufe.filter(mitGelesen).length, { timeout: 10000 })
      .toBeGreaterThan(0);
  });

  test('TC-KZ-K2: Die Hintergrundabfrage meldet NICHT „gelesen"', async ({ page }) => {
    const abrufe = await chatVorbereiten(page);
    // Der rote Punkt wird beim Laden geprüft – ohne dass jemand den Chat öffnet.
    await expect.poll(() => abrufe.length, { timeout: 10000 }).toBeGreaterThan(0);
    await page.waitForTimeout(500);
    expect(abrufe.filter(mitGelesen)).toEqual([]);
    // Die Geräte-ID muss trotzdem mit – sonst findet der Server den Thread nicht.
    expect(abrufe.every((u) => /device_id=/.test(u))).toBe(true);
  });
});
