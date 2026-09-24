/**
 * Kiosk – Kontakt: Zustell- und Lesehaken an UNSEREN Antworten (KZ)
 *
 * Aus dem Laden: „Kann auch angezeigt werden, ob eine ausgehende Nachricht
 * geliefert und gelesen wurde wie in WhatsApp?"
 *
 * Drei Stufen, jede durch einen echten Abruf des Kundengeräts belegt:
 *   ohne `zug`  – gesendet (einfacher Haken)
 *   mit  `zug`  – zugestellt (grauer Doppelhaken)
 *   mit  `gel`  – vom Kunden gelesen (blauer Doppelhaken)
 *
 * Der Haken an KUNDEN-Nachrichten bedeutet weiterhin etwas anderes: dort
 * heißt er „wir haben gelesen". TC-KZ-04 hält fest, dass er klickbar bleibt.
 *
 * Spec: specs/kontakt-zustellstatus/spec.md
 * Ausführen: npx playwright test tests/kiosk-kontakt-zustellung.spec.js
 */

const { test, expect } = require('./_kiosk-angemeldet');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

function threads() {
  return [{
    id: 'z1', name: 'Zita Zustell', device_id: 'devzzzz9999', geraet: 'Android · Chrome',
    kommentar_gelesen: true, modified: '2026-09-24T12:00:00Z',
    verlauf: [
      // 0: Kundennachricht – trägt unseren eigenen Lesehaken
      { who: 'kunde', text: 'Habt ihr Brot?', t: '2026-09-24T08:00:00Z' },
      // 1: abgeschickt, das Kundengerät hat nie abgerufen
      { who: 'dorfladen', text: 'Noch unterwegs', t: '2026-09-24T09:00:00Z' },
      // 2: auf dem Gerät angekommen, aber nicht geöffnet
      { who: 'dorfladen', text: 'Angekommen', t: '2026-09-24T10:00:00Z',
        zug: '2026-09-24T10:05:00Z' },
      // 3: der Kunde hatte den Chat offen
      { who: 'dorfladen', text: 'Gelesen', t: '2026-09-24T11:00:00Z',
        zug: '2026-09-24T11:05:00Z', gel: '2026-09-24T11:30:00Z' },
    ],
  }];
}

async function mockApi(page) {
  await page.route(/\/api\//, (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [], orders: [], threads: [], customers: [] }),
    }));

  await page.route(/\/api\/cms-config/, (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          feature_flags: {
            kiosk_shop: true, kiosk_mittag: true, kiosk_metzger: true,
            kiosk_social: true, kiosk_kontakt: true,
          },
        },
      }),
    }));

  await page.route(/\/api\/contact-message/, (route) => {
    const url = route.request().url();
    const json = (o) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
    if (route.request().method() !== 'GET') return json({ success: true });
    if (/mode=unread/.test(url)) return json({ success: true, unread_count: 0 });
    return json({ success: true, threads: threads() });
  });
}

async function openVerlauf(page) {
  await mockApi(page);
  await page.goto(KIOSK_URL);
  await page.locator('.k-tab[data-tab="kontakt"]').click();
  const karte = page.locator('#kontakt-list .kk-card').first();
  await expect(karte).toBeVisible({ timeout: 20000 });
  await karte.locator('.kk-hdr').click();
  await expect(karte.locator('.kk-thread')).toBeVisible();
  return karte;
}

// Die Haken an unseren Antworten, in der Reihenfolge des Verlaufs.
const ausgehend = (karte) => karte.locator('.kk-thread [data-zustell]');

test.describe('Kontakt – Zustellhaken an eigenen Antworten (KZ)', () => {

  test('TC-KZ-01: Eine noch nicht abgerufene Antwort zeigt einen einzelnen Haken', async ({ page }) => {
    const karte = await openVerlauf(page);
    const h = ausgehend(karte).nth(0);
    await expect(h).toHaveAttribute('data-zustell', 'gesendet');
    await expect(h).toHaveAttribute('title', /Gesendet/);
    // Ein Haken, nicht zwei: das SVG trägt genau einen Pfad.
    expect(await h.locator('svg path').count()).toBe(1);
  });

  test('TC-KZ-02: Eine zugestellte Antwort zeigt einen grauen Doppelhaken mit Uhrzeit', async ({ page }) => {
    const karte = await openVerlauf(page);
    const h = ausgehend(karte).nth(1);
    await expect(h).toHaveAttribute('data-zustell', 'zugestellt');
    await expect(h).toHaveAttribute('title', /Zugestellt/);
    // Die Uhrzeit des Abrufs muss dranstehen, sonst ist der Haken wertlos.
    await expect(h).toHaveAttribute('title', /\d{2}:\d{2}/);
    expect(await h.locator('svg path').count()).toBe(2);
    await expect(h).toHaveClass(/pending/);
  });

  test('TC-KZ-03: Eine gelesene Antwort zeigt einen blauen Doppelhaken', async ({ page }) => {
    const karte = await openVerlauf(page);
    const h = ausgehend(karte).nth(2);
    await expect(h).toHaveAttribute('data-zustell', 'gelesen');
    await expect(h).toHaveAttribute('title', /gelesen/);
    await expect(h).toHaveAttribute('title', /\d{2}:\d{2}/);
    expect(await h.locator('svg path').count()).toBe(2);
    // Blau heisst gelesen – nicht die graue Wartefarbe.
    await expect(h).not.toHaveClass(/pending/);
    const farbe = await h.evaluate((el) => getComputedStyle(el).color);
    const grau = await ausgehend(karte).nth(1).evaluate((el) => getComputedStyle(el).color);
    expect(farbe).not.toBe(grau);
  });

  test('TC-KZ-04: Der Haken an Kundennachrichten bleibt der Weg zurück', async ({ page }) => {
    const karte = await openVerlauf(page);
    // Der Knopf zum Zurücksetzen hängt NUR an Kundennachrichten.
    const knopf = karte.locator('.kk-thread button.kk-ticks');
    await expect(knopf).toHaveCount(1);
    await expect(knopf).toHaveAttribute('title', /Von uns gelesen/);
    // Und er trägt keinen Zustellstatus – das sind zwei verschiedene Dinge.
    expect(await knopf.getAttribute('data-zustell')).toBeNull();
  });

  test('TC-KZ-05: Jede Blase trägt genau ihren eigenen Zustand', async ({ page }) => {
    const karte = await openVerlauf(page);
    const stufen = await ausgehend(karte).evaluateAll(
      (els) => els.map((e) => e.getAttribute('data-zustell')));
    expect(stufen).toEqual(['gesendet', 'zugestellt', 'gelesen']);
  });
});
