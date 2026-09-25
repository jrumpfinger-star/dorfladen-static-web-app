/**
 * Kiosk – Kontakt: Höhe des Nachrichtenverlaufs (KH)
 *
 * Aus dem Laden: „Bitte die Anzeige der Nachrichten je nach Bildschirmhöhe
 * einschränken und scrollen, da ansonsten alle anderen Chats verschwinden
 * und man für den aktuellsten nach unten scrollen muss. Der aktuelle
 * Beitrag und die Antwortbox müssen immer sichtbar sein."
 *
 * Gemessen auf dem Rechner (Fenster 800 px) mit nur ZWEI Nachrichten:
 * Die Antwortbox endete bei 1084 px — 284 px unter dem Sichtbaren. Die alte
 * Regel `max-height:60vh` begrenzte den Verlauf auf einen Anteil des
 * Fensters, ohne zu wissen, was unter ihm noch steht.
 *
 * Spec: specs/kontakt-verlauf-hoehe/spec.md
 */

const { test, expect } = require('./_kiosk-angemeldet');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

// Ein Verlauf mit `n` Wechseln — lang genug, um die Seite zu sprengen.
function verlauf(n) {
  const v = [];
  for (let i = 0; i < n; i++) {
    v.push({
      who: i % 2 ? 'dorfladen' : 'kunde',
      text: (i % 2 ? 'Antwort ' : 'Frage ') + (i + 1)
        + ' — ein Satz, der die Blase auf zwei Zeilen bringt und damit Höhe kostet.',
      t: '2026-09-2' + (i % 9) + 'T1' + (i % 9) + ':00:00Z',
    });
  }
  // Die jüngste Nachricht ist eindeutig erkennbar.
  v.push({ who: 'kunde', text: 'ALLERLETZTE NACHRICHT', t: '2026-09-25T09:32:00Z' });
  return v;
}

function threads(n) {
  return [
    {
      id: 'h1', name: 'Elo Lang', device_id: 'devhhhh1111', geraet: 'iOS · Safari',
      kommentar_gelesen: true, modified: '2026-09-25T09:32:00Z',
      verlauf: verlauf(n),
    },
    {
      id: 'h2', name: 'Josef Rumpfinger', device_id: 'devhhhh2222', geraet: 'Android · Chrome',
      kommentar_gelesen: true, modified: '2026-09-24T18:43:00Z',
      /* Alle drei tragen einen langen Verlauf. Die Liste wird nach letzter
         Aktivität sortiert — welche Karte an welcher Stelle landet, ist
         damit nicht von der Reihenfolge hier abzulesen. Ein kurzer Verlauf
         an der falschen Stelle ließ TC-KH-06 auf 98 px messen und scheitern,
         obwohl die Anzeige völlig richtig war. */
      verlauf: verlauf(n),
    },
    {
      id: 'h3', name: 'Margot Puls', device_id: 'devhhhh3333', geraet: 'Android · Chrome',
      kommentar_gelesen: true, modified: '2026-09-24T14:06:00Z',
      // Ebenfalls lang: TC-KH-06 öffnet diese Karte am Ende der Liste. Mit
      // nur einer Nachricht wäre der Verlauf naturgemäß kurz, und der Fall
      // prüfte nichts.
      verlauf: verlauf(n),
    },
  ];
}

async function mockApi(page, n) {
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
    return json({ success: true, threads: threads(n) });
  });
}

async function oeffne(page, { n = 24, welche = 0 } = {}) {
  await mockApi(page, n);
  await page.goto(KIOSK_URL);
  await page.locator('.k-tab[data-tab="kontakt"]').click();
  const karte = page.locator('#kontakt-list .kk-card').nth(welche);
  await expect(karte).toBeVisible({ timeout: 20000 });
  await karte.locator('.kk-hdr').click();
  await expect(karte.locator('.kk-thread')).toBeVisible();
  return karte;
}

// Alle Maße einer offenen Karte auf einen Griff.
const masse = (page) => page.evaluate(() => {
  const k = [...document.querySelectorAll('.kk-card')].find((c) => c.querySelector('.kk-thread'));
  const th = k.querySelector('.kk-thread');
  const rp = k.querySelector('.kk-reply');
  const u = (el) => (el ? Math.round(el.getBoundingClientRect().bottom) : 0);
  const o = (el) => (el ? Math.round(el.getBoundingClientRect().top) : 0);
  return {
    fenster: window.innerHeight,
    karteUnten: u(k),
    verlaufUnten: u(th),
    antwortOben: o(rp),
    antwortUnten: u(rp),
    verlaufHoehe: Math.round(th.getBoundingClientRect().height),
    rollbar: th.scrollHeight > th.clientHeight + 1,
    amEnde: th.scrollHeight - th.scrollTop - th.clientHeight < 4,
  };
});

test.describe('Kontakt – Höhe des Verlaufs (KH)', () => {

  test('TC-KH-01: Die Antwortbox steht im Bild', async ({ page }) => {
    await oeffne(page);
    const m = await masse(page);
    /* Der eigentliche Punkt der Meldung. Vorher: Unterkante bei 1084 px in
       einem 800-px-Fenster — man musste die ganze Seite herunterrollen. */
    expect(m.antwortUnten, `Antwortbox endet bei ${m.antwortUnten}px, Fenster ${m.fenster}px`)
      .toBeLessThanOrEqual(m.fenster);
    expect(m.antwortOben, 'Antwortbox beginnt unterhalb des Fensters')
      .toBeLessThan(m.fenster);
  });

  test('TC-KH-02: Die ganze Karte passt ins Fenster', async ({ page }) => {
    await oeffne(page);
    const m = await masse(page);
    // Passt die Karte, bleiben auch die übrigen Konversationen erreichbar.
    expect(m.karteUnten, `Karte endet bei ${m.karteUnten}px, Fenster ${m.fenster}px`)
      .toBeLessThanOrEqual(m.fenster);
  });

  test('TC-KH-03: Ein langer Verlauf wird gerollt, nicht ausgebreitet', async ({ page }) => {
    await oeffne(page, { n: 40 });
    const m = await masse(page);
    expect(m.rollbar, 'der Verlauf rollt nicht, er breitet sich aus').toBe(true);
    expect(m.verlaufHoehe, `Verlauf ${m.verlaufHoehe}px bei Fenster ${m.fenster}px`)
      .toBeLessThan(m.fenster);
  });

  test('TC-KH-04: Die jüngste Nachricht steht direkt über der Antwortbox', async ({ page }) => {
    const karte = await oeffne(page, { n: 40 });
    const m = await masse(page);
    expect(m.amEnde, 'der Verlauf steht nicht am Ende').toBe(true);
    // Und sie ist wirklich zu sehen, nicht nur rechnerisch unten.
    const letzte = karte.locator('.kk-thread > div').last();
    await expect(letzte).toContainText('ALLERLETZTE NACHRICHT');
    await expect(letzte).toBeInViewport();
  });

  test('TC-KH-05: Die anderen Konversationen verschwinden nicht', async ({ page }) => {
    await oeffne(page, { n: 40 });
    /* „… da ansonsten alle anderen Chats verschwinden." Die nächste Karte
       muss gleich unter der offenen stehen, nicht Bildschirme weiter. */
    const abstand = await page.evaluate(() => {
      const alle = [...document.querySelectorAll('.kk-card')];
      const i = alle.findIndex((c) => c.querySelector('.kk-thread'));
      const naechste = alle[i + 1];
      if (!naechste) return null;
      return Math.round(naechste.getBoundingClientRect().top);
    });
    expect(abstand, 'keine weitere Karte gefunden').not.toBeNull();
    const fenster = await page.evaluate(() => window.innerHeight);
    expect(abstand, `nächste Karte erst bei ${abstand}px, Fenster ${fenster}px`)
      .toBeLessThanOrEqual(fenster + 120);
  });

  test('TC-KH-06: Auch weit unten geöffnet bleibt alles sichtbar', async ({ page }) => {
    // Die dritte Karte – sie steht am Ende der Liste.
    await oeffne(page, { n: 40, welche: 2 });
    const m = await masse(page);
    expect(m.antwortUnten, `Antwortbox endet bei ${m.antwortUnten}px, Fenster ${m.fenster}px`)
      .toBeLessThanOrEqual(m.fenster);
    expect(m.verlaufHoehe, 'der Verlauf ist zusammengequetscht')
      .toBeGreaterThanOrEqual(120);
  });
});
