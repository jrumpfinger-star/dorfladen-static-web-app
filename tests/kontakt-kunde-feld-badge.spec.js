// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Kundenchat „Schreib uns" – Eingabefeld und Hinweis auf neue Antworten
 *
 * Aus dem Laden, drei Punkte:
 *   „Die Nachrichtenbox auf mobile ist immer noch zu klein."
 *   „Wie kann der Kunde sehen, dass er neue Nachrichten empfangen hat?"
 *   „Sollte dies nicht bei ,Schreib uns' mit einem Badge gekennzeichnet werden?"
 *
 * Die erste Meldung ging auf mein Konto: Verbreitert wurde damals die
 * Antwortbox im KIOSK (.kk-rpt) – das Feld der Verkäuferin. Das Feld des
 * KUNDEN steckt in js/kontakt.js und blieb unangetastet.
 *
 * Spec: specs/kontakt-kunde-feld-badge/spec.md
 */

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';

function threadMit(antworten) {
  const v = [{ who: 'kunde', text: 'Habt ihr Brot?', t: '2026-09-20T08:00:00Z' }];
  antworten.forEach((t, i) => v.push({ who: 'dorfladen', text: 'Antwort ' + (i + 1), t: t }));
  return { id: 'b1', name: 'Testkunde', device_id: 'dev-b1', kommentar_gelesen: true, verlauf: v };
}

async function seite(page, opts = {}) {
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
  await page.route('**/api/contact-message**', (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, thread: opts.thread || null }),
    }));

  const gesehen = opts.gesehen;
  await page.addInitScript((g) => {
    try {
      localStorage.clear();
      localStorage.setItem('dl_push_device_id', 'dev-b1');
      const d = new Date().toISOString().substring(0, 10);
      localStorage.setItem('tagespost_seen_' + d, '1');
      localStorage.setItem('pwa-dismissed', '1');
      localStorage.setItem('dl_cookies', '1');
      if (g) localStorage.setItem('dl_kontakt_seen', g);
    } catch (e) { /* ignore */ }
  }, gesehen || '');

  await page.goto(BASE + '/', { waitUntil: 'commit' });
  await page.waitForFunction(() => !!(window.DLKontakt && window.DLKontakt.open), null, { timeout: 20000 });
}

// ════════════════════════════════════════════════════
//  KF – Das Eingabefeld des Kunden
// ════════════════════════════════════════════════════

test.describe('Schreib uns – Eingabefeld (KF)', () => {
  test.use({ serviceWorkers: 'block' });

  test('TC-KF-01: Das Feld nutzt auf dem Telefon die ganze Breite', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'misst die Telefonansicht');
    await seite(page);
    await page.evaluate(() => window.DLKontakt.open());
    await expect(page.locator('#hp-chat-input')).toBeVisible({ timeout: 10000 });

    const m = await page.evaluate(() => {
      const el = document.getElementById('hp-chat-input');
      const zeile = el.parentElement;
      return {
        feld: Math.round(el.getBoundingClientRect().width),
        zeile: Math.round(zeile.getBoundingClientRect().width),
      };
    });
    // Vorher teilten sich Feld und drei Knöpfe eine Reihe – das Feld bekam
    // rund zwei Drittel. Es muss die Zeile beherrschen, nicht teilen.
    expect(m.feld / m.zeile, `Feld ${m.feld}px von ${m.zeile}px`).toBeGreaterThan(0.9);
  });

  test('TC-KF-02: Das Feld ist hoch genug für mehrere Zeilen', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'misst die Telefonansicht');
    await seite(page);
    await page.evaluate(() => window.DLKontakt.open());
    const el = page.locator('#hp-chat-input');
    await expect(el).toBeVisible({ timeout: 10000 });
    const h = await el.evaluate((e) => Math.round(e.getBoundingClientRect().height));
    expect(h, `Feldhöhe ${h}px`).toBeGreaterThanOrEqual(60);
  });

  test('TC-KF-03: Das Feld wächst mit dem Text', async ({ page }) => {
    await seite(page);
    await page.evaluate(() => window.DLKontakt.open());
    const el = page.locator('#hp-chat-input');
    await expect(el).toBeVisible({ timeout: 10000 });
    const vorher = await el.evaluate((e) => e.getBoundingClientRect().height);
    await el.fill('Zeile 1\nZeile 2\nZeile 3\nZeile 4');
    await page.waitForTimeout(200);
    const nachher = await el.evaluate((e) => e.getBoundingClientRect().height);
    expect(nachher, `${vorher} → ${nachher}`).toBeGreaterThan(vorher);
  });
});

// ════════════════════════════════════════════════════
//  KB – Badge für neue Antworten
// ════════════════════════════════════════════════════

test.describe('Schreib uns – Badge für neue Antworten (KB)', () => {
  test.use({ serviceWorkers: 'block' });

  const badge = (page) => page.locator('#hp-chat-dot');

  test('TC-KB-01: Ohne neue Antwort bleibt der Knopf schmucklos', async ({ page }) => {
    // Der Kunde hat die letzte Antwort schon gesehen.
    await seite(page, {
      thread: threadMit(['2026-09-21T09:00:00Z']),
      gesehen: '2026-09-21T09:00:00Z|Antwort 1',
    });
    await page.waitForTimeout(1500);
    await expect(badge(page)).toBeHidden();
  });

  test('TC-KB-02: Eine neue Antwort erzeugt ein sichtbares Badge', async ({ page }) => {
    await seite(page, { thread: threadMit(['2026-09-21T09:00:00Z']) });
    await expect(badge(page)).toBeVisible({ timeout: 10000 });
  });

  test('TC-KB-03: Das Badge nennt die Anzahl der neuen Antworten', async ({ page }) => {
    await seite(page, {
      thread: threadMit([
        '2026-09-21T09:00:00Z', '2026-09-22T10:00:00Z', '2026-09-23T11:00:00Z',
      ]),
      // Die erste ist gesehen, zwei sind neu.
      gesehen: '2026-09-21T09:00:00Z|Antwort 1',
    });
    await expect(badge(page)).toBeVisible({ timeout: 10000 });
    await expect(badge(page)).toHaveText('2');
  });

  test('TC-KB-04: Das Badge ist groß genug, um aufzufallen', async ({ page }) => {
    await seite(page, { thread: threadMit(['2026-09-21T09:00:00Z']) });
    await expect(badge(page)).toBeVisible({ timeout: 10000 });
    const m = await badge(page).evaluate((e) => {
      const r = e.getBoundingClientRect();
      return { b: Math.round(r.width), h: Math.round(r.height) };
    });
    // Der frühere Punkt maß 14 px und ging neben dem Knopf unter.
    expect(m.b, `Badge ${m.b}×${m.h}px`).toBeGreaterThanOrEqual(18);
    expect(m.h).toBeGreaterThanOrEqual(18);
  });

  test('TC-KB-05: Nach dem Öffnen verschwindet das Badge', async ({ page }) => {
    await seite(page, { thread: threadMit(['2026-09-21T09:00:00Z']) });
    await expect(badge(page)).toBeVisible({ timeout: 10000 });
    await page.evaluate(() => window.DLKontakt.open());
    await expect(page.locator('#hp-chat-input')).toBeVisible({ timeout: 10000 });
    await expect(badge(page)).toBeHidden();
  });

  test('TC-KB-06: Mehr als neun wird nicht endlos breit', async ({ page }) => {
    const viele = [];
    for (let i = 0; i < 12; i++) viele.push('2026-09-' + (10 + i) + 'T09:00:00Z');
    await seite(page, { thread: threadMit(viele) });
    await expect(badge(page)).toBeVisible({ timeout: 10000 });
    await expect(badge(page)).toHaveText('9+');
  });
});

// ════════════════════════════════════════════════════
//  KW – „Schreib uns" darf nicht auf WhatsApp zurückfallen
//
//  Aus dem Laden: „Warum ist auf Desktop ,Schreib uns' ein WhatsApp-Aufruf?
//  Muss genauso wie bei mobile sein."
//
//  Es war keine Frage der Bildschirmgröße: Die Umschaltung hing an einer
//  einzigen Abfrage, deren Fehlschlag still verschluckt wurde. Auf dem
//  Telefon fiel das nie auf, weil mobile.css den WhatsApp-Knopf ohnehin
//  per Regel ausblendet.   (Spec specs/kontakt-float-zuverlaessig/spec.md)
// ════════════════════════════════════════════════════

test.describe('Schreib uns – kein Rückfall auf WhatsApp (KW)', () => {
  test.use({ serviceWorkers: 'block' });

  async function laden(page, opts = {}) {
    let abrufe = 0;
    const start = Date.now();
    await page.route('**/api/**', (route) =>
      route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], orders: [], posts: [], thread: null }),
      }));
    await page.route('**/api/cms-config**', (route) => {
      abrufe++;
      /* Zeitbasiert scheitern lassen, nicht nach Anzahl: `app.js` fragt
         dieselbe Konfiguration ebenfalls ab. Ein Zähler über alle Aufrufe
         wäre stumpf - der erste Fehlschlag träfe womöglich app.js, und
         kontakt.js bekäme beim ersten eigenen Versuch schon eine Antwort.
         Der Wächter prüfte dann gar nichts. */
      if (Date.now() - start < (opts.fehlerBisMs || 0)) return route.abort('failed');
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { feature_flags: { kiosk_kontakt: opts.flag !== false } },
        }),
      });
    });
    await page.addInitScript((g) => {
      try {
        localStorage.clear();
        localStorage.setItem('tagespost_seen_' + new Date().toISOString().slice(0, 10), '1');
        localStorage.setItem('pwa-dismissed', '1');
        localStorage.setItem('dl_cookies', '1');
        if (g) localStorage.setItem('dl_kontakt_an', '1');
      } catch (e) { /* ignore */ }
    }, opts.gemerkt ? '1' : '');
    await page.goto(BASE + '/', { waitUntil: 'commit' });
    return () => abrufe;
  }

  const waSichtbar = (page) => page.evaluate(() => {
    const el = document.getElementById('hp-wa-float');
    if (!el) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && el.getBoundingClientRect().width > 0;
  });

  test('TC-KW-01: Im Normalfall steht der Chat, WhatsApp ist weg', async ({ page }) => {
    await laden(page);
    await expect(page.locator('#hp-chat-float')).toBeVisible({ timeout: 15000 });
    expect(await waSichtbar(page), 'WhatsApp-Knopf steht noch da').toBe(false);
  });

  test('TC-KW-02: Klemmt die Abfrage anfangs, wird nachgefasst', async ({ page }) => {
    // Eine Sekunde lang scheitert jede Abfrage - das überlebt nur, wer
    // nachfasst (erster neuer Versuch nach 1,5 s).
    const zaehler = await laden(page, { fehlerBisMs: 1000 });
    await expect(page.locator('#hp-chat-float')).toBeVisible({ timeout: 15000 });
    expect(await waSichtbar(page)).toBe(false);
    expect(zaehler(), 'es wurde nicht nachgefasst').toBeGreaterThan(1);
  });

  test('TC-KW-03: Fällt die Abfrage ganz aus, rettet der gemerkte Stand', async ({ page }) => {
    // Der Kunde war schon einmal da - dann darf ein Aussetzer den Chat
    // nicht kosten.
    await laden(page, { fehlerBisMs: 60000, gemerkt: true });
    await expect(page.locator('#hp-chat-float')).toBeVisible({ timeout: 15000 });
    expect(await waSichtbar(page), 'WhatsApp-Knopf kam zurück').toBe(false);
  });

  test('TC-KW-04: Ist das Merkmal abgeschaltet, bleibt WhatsApp', async ({ page }, info) => {
    /* Nur oberhalb von 768 px prüfbar — und genau darin liegt der Kern der
       Meldung: `mobile.css` blendet den WhatsApp-Knopf in
       `@media(max-width:768px)` hart aus. Unterhalb dieser Grenze fällt ein
       Rückfall auf WhatsApp deshalb NIE auf, oberhalb sofort. Das ist der
       Grund, warum es „auf Desktop anders als auf mobile" aussah. */
    const breit = (info.project.use.viewport || {}).width || 0;
    test.skip(breit <= 768,
      'bis 768 px blendet mobile.css den WhatsApp-Knopf ohnehin aus');
    // Auch wenn ein alter Merker noch „an" sagt - die Abfrage entscheidet.
    await laden(page, { flag: false, gemerkt: true });
    await expect.poll(() => waSichtbar(page), { timeout: 15000 }).toBe(true);
    await expect(page.locator('#hp-chat-float')).toHaveCount(0);
  });
});