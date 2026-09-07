// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Kundenchat „Schreib uns" (js/kontakt.js)
 *  - Der Name ist Pflicht: sonst weiß die Verkäuferin nicht, wer geschrieben hat.
 *  - Ist „Antworten auch per E-Mail" angehakt, muss eine E-Mail dastehen.
 *  - Bilder lassen sich per Strg+V aus der Zwischenablage einfügen.
 *
 * Alle API-Aufrufe sind abgefangen – es wird keine Nachricht abgeschickt.
 */

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';

async function chatOeffnen(page) {
  /** @type {any[]} */
  const gesendet = [];
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    if (/contact-message/.test(url) && route.request().method() === 'POST') {
      let body = {};
      try { body = JSON.parse(route.request().postData() || '{}'); } catch (e) { /* ignore */ }
      gesendet.push(body);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, verlauf: [] }) });
    }
    if (/contact-upload/.test(url)) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, datei: 'test.jpg' }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [], orders: [], posts: [], thread: null }) });
  });
  // Der Chat wird nur aufgebaut, wenn der Schalter kiosk_kontakt gesetzt ist.
  await page.route('**/api/cms-config**', (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { feature_flags: { kiosk_kontakt: true } } }),
    }));
  await page.addInitScript(() => {
    try {
      localStorage.clear();
      const d = new Date().toISOString().substring(0, 10);
      localStorage.setItem('tagespost_seen_' + d, '1');
      localStorage.setItem('pwa-dismissed', '1');
      localStorage.setItem('dl_cookies', '1');
    } catch (e) { /* ignore */ }
  });
  await page.goto(BASE + '/', { waitUntil: 'commit' });
  // Chat über die öffentliche Schnittstelle öffnen – unabhängig von Einstiegspunkten
  await page.waitForFunction(() => !!(window.DLKontakt && window.DLKontakt.open), null, { timeout: 20000 });
  await page.evaluate(() => window.DLKontakt.open());
  await expect(page.locator('#hp-chat-input')).toBeVisible({ timeout: 10000 });
  return gesendet;
}

test.describe('Schreib uns: Pflichtangaben und Einfügen', () => {
  test.use({ serviceWorkers: 'block' });

  test('TC-KC-01 Ohne Namen wird nicht gesendet', async ({ page }) => {
    const gesendet = await chatOeffnen(page);
    await page.fill('#hp-chat-name', '');
    await page.fill('#hp-chat-input', 'Hallo, habt ihr heute Brezn?');
    await page.click('#hp-chat-send');
    await page.waitForTimeout(600);
    await expect(page.locator('#hp-chat-ident-err')).toBeVisible();
    await expect(page.locator('#hp-chat-ident-err')).toContainText('Namen');
    expect(gesendet.length).toBe(0);
  });

  test('TC-KC-02 Mit Namen wird gesendet', async ({ page }) => {
    const gesendet = await chatOeffnen(page);
    await page.fill('#hp-chat-name', 'Josef Rumpfinger');
    await page.fill('#hp-chat-input', 'Hallo, habt ihr heute Brezn?');
    await page.click('#hp-chat-send');
    await page.waitForTimeout(800);
    expect(gesendet.length).toBe(1);
    expect(gesendet[0].name).toBe('Josef Rumpfinger');
  });

  test('TC-KC-03 E-Mail-Antwort ohne Adresse wird abgelehnt', async ({ page }) => {
    const gesendet = await chatOeffnen(page);
    await page.fill('#hp-chat-name', 'Josef Rumpfinger');
    await page.fill('#hp-chat-email', '');
    await page.check('#hp-chat-email-opt');
    await page.fill('#hp-chat-input', 'Bitte per Mail antworten');
    await page.click('#hp-chat-send');
    await page.waitForTimeout(600);
    await expect(page.locator('#hp-chat-ident-err')).toBeVisible();
    await expect(page.locator('#hp-chat-ident-err')).toContainText('E-Mail');
    expect(gesendet.length).toBe(0);
  });

  test('TC-KC-04 Unsinnige E-Mail wird abgelehnt', async ({ page }) => {
    const gesendet = await chatOeffnen(page);
    await page.fill('#hp-chat-name', 'Josef Rumpfinger');
    await page.fill('#hp-chat-email', 'keine-adresse');
    await page.check('#hp-chat-email-opt');
    await page.fill('#hp-chat-input', 'Test');
    await page.click('#hp-chat-send');
    await page.waitForTimeout(600);
    await expect(page.locator('#hp-chat-ident-err')).toBeVisible();
    expect(gesendet.length).toBe(0);
  });

  test('TC-KC-05 Mit gültiger E-Mail geht es durch', async ({ page }) => {
    const gesendet = await chatOeffnen(page);
    await page.fill('#hp-chat-name', 'Josef Rumpfinger');
    await page.fill('#hp-chat-email', 'josef@example.de');
    await page.check('#hp-chat-email-opt');
    await page.fill('#hp-chat-input', 'Test');
    await page.click('#hp-chat-send');
    await page.waitForTimeout(800);
    expect(gesendet.length).toBe(1);
    expect(gesendet[0].notify_email).toBe(true);
    expect(gesendet[0].email).toBe('josef@example.de');
  });

  test('TC-KC-06 Haken kennzeichnet das E-Mail-Feld als Pflicht', async ({ page }) => {
    await chatOeffnen(page);
    const mail = page.locator('#hp-chat-email');
    await expect(mail).toHaveAttribute('placeholder', 'E-Mail');
    await page.check('#hp-chat-email-opt');
    await expect(mail).toHaveAttribute('placeholder', 'E-Mail *');
    await page.uncheck('#hp-chat-email-opt');
    await expect(mail).toHaveAttribute('placeholder', 'E-Mail');
  });

  test('TC-KC-07 Bild per Strg+V wird als Vorschau übernommen', async ({ page }) => {
    await chatOeffnen(page);
    await expect(page.locator('#hp-chat-preview')).toBeHidden();
    // Einfügen eines Bildes aus der Zwischenablage nachstellen
    await page.evaluate(async () => {
      const cv = document.createElement('canvas');
      cv.width = 40; cv.height = 30;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#2e7d4f'; ctx.fillRect(0, 0, 40, 30);
      const blob = await new Promise((res) => cv.toBlob(res, 'image/png'));
      const datei = new File([blob], 'bild.png', { type: 'image/png' });
      const dt = new DataTransfer();
      dt.items.add(datei);
      const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
      document.getElementById('hp-chat-input').dispatchEvent(ev);
    });
    await expect(page.locator('#hp-chat-preview')).toBeVisible({ timeout: 10000 });
    const src = await page.locator('#hp-chat-prev-img').getAttribute('src');
    expect(src).toContain('data:image');
  });

  test('TC-KC-08 Reiner Text beim Einfügen bleibt unangetastet', async ({ page }) => {
    await chatOeffnen(page);
    await page.fill('#hp-chat-input', '');
    await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.setData('text/plain', 'eingefuegter Text');
      const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
      document.getElementById('hp-chat-input').dispatchEvent(ev);
    });
    await page.waitForTimeout(400);
    // Keine Bildvorschau, und das Einfügen wurde nicht abgefangen
    await expect(page.locator('#hp-chat-preview')).toBeHidden();
  });
});
