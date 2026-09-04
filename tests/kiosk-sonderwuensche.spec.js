/**
 * Kiosk – Sonderwünsche im Mittagstisch (Playwright E2E)
 *
 * Deckt die Test-Cases aus specs/mittagstisch-sonderwuensche/spec.md ab:
 *   F1 TC-F1-01 … TC-F1-05   Sonderwunsch-Ermittlung
 *   F2 TC-F2-01 … TC-F2-03   Sonderwunsch-Leiste
 *   F3 TC-F3-01 … TC-F3-03   Filter-Reiter
 *   F4 TC-F4-01 … TC-F4-04   Liste
 *   F5 TC-F5-01 … TC-F5-05   Aufklappbarer Verlauf
 *   F6 TC-F6-01 … TC-F6-03   Kompaktansicht
 *   F7 TC-F7-01 … TC-F7-03   Leerzustand & Responsive
 *
 * Alle API-Aufrufe werden gemockt, damit Zähler und Reihenfolge unabhängig
 * von echten Tagesdaten deterministisch sind.
 *
 * Ausführen:
 *   npx playwright test tests/kiosk-sonderwuensche.spec.js
 */

const { test, expect } = require('@playwright/test');

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const KIOSK_URL = `${BASE}/kiosk`;

function isoToday() {
  const d = new Date();
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}

const XSS_TEXT = '<img src=x onerror="window.__xss=1">ohne Salz';

// Tag MIT Sonderwünschen: 5 von 7 nicht stornierten Bestellungen haben einen.
// Schnitzel: 6 Portionen (3 Wünsche) → vor Käsegriller: 2 Portionen (2 Wünsche)
function ordersWithWishes() {
  return [
    // TC-F1-01 / TC-F1-05: Anmerkung gewinnt, Verlauf zählt komplett als "weitere"
    {
      id: 'o1', name: 'Bernert Simone', gericht: 'Schnitzel', menge: 1, preis: 8.8,
      status: 0, quelle: 0, mitnehmen: true, anmerkung: 'Bitte ohne Pommes',
      verlauf: [{ who: 'kunde', text: 'Bitte ohne Pommes' }, { who: 'dorfladen', text: 'Alles klar' }],
      kunde_kommentar: '', kommentar_gelesen: false,
    },
    // TC-F1-02: keine Anmerkung → erste Kundennachricht ist der Wunsch, 1 weitere
    {
      id: 'o2', name: 'Huber Anna', gericht: 'Schnitzel', menge: 2, preis: 8.8,
      status: 1, quelle: 0, mitnehmen: false, anmerkung: '',
      verlauf: [{ who: 'kunde', text: 'bitte glutenfrei' }, { who: 'dorfladen', text: 'notiert' }],
      kunde_kommentar: 'bitte glutenfrei', kommentar_gelesen: true,
    },
    // TC-F1-03: weder Anmerkung noch Nachricht → taucht nicht auf
    {
      id: 'o3', name: 'Ohne Wunsch', gericht: 'Schnitzel', menge: 4, preis: 8.8,
      status: 1, quelle: 0, mitnehmen: false, anmerkung: '', verlauf: [],
      kunde_kommentar: '', kommentar_gelesen: true,
    },
    // TC-F1-04: storniert → ausgeschlossen, obwohl Anmerkung vorhanden
    {
      id: 'o4', name: 'Storno Stefan', gericht: 'Schnitzel', menge: 1, preis: 8.8,
      status: 2, quelle: 0, mitnehmen: false, anmerkung: 'ohne Salz', verlauf: [],
      kunde_kommentar: '', kommentar_gelesen: true,
    },
    // TC-F5-02: Wunsch ohne Folgekonversation
    {
      id: 'o5', name: 'Maier Josef', gericht: 'Käsegriller', menge: 1, preis: 7.5,
      status: 0, quelle: 0, mitnehmen: true, anmerkung: 'Ohne Zwiebeln', verlauf: [],
      kunde_kommentar: '', kommentar_gelesen: true,
    },
    // Nur Weißraum → gilt als leer, kein Sonderwunsch
    {
      id: 'o6', name: 'Weiss Otto', gericht: 'Käsegriller', menge: 1, preis: 7.5,
      status: 1, quelle: 1, mitnehmen: false, anmerkung: '   ', verlauf: [],
      kunde_kommentar: '', kommentar_gelesen: true,
    },
    // TC-F1-05: Anmerkung + 2 weitere Nachrichten
    {
      id: 'o7', name: 'Familie Schmid', gericht: 'Schnitzel', menge: 3, preis: 8.8,
      status: 1, quelle: 1, mitnehmen: false, anmerkung: 'Soße separat',
      verlauf: [{ who: 'kunde', text: 'Soße separat' }, { who: 'dorfladen', text: 'ok' }],
      kunde_kommentar: 'Soße separat', kommentar_gelesen: true,
    },
    // TC-F4-04: HTML im Kundentext darf nicht ausgeführt werden
    {
      id: 'o8', name: 'Zilch Xaver', gericht: 'Käsegriller', menge: 1, preis: 7.5,
      status: 1, quelle: 0, mitnehmen: false, anmerkung: XSS_TEXT, verlauf: [],
      kunde_kommentar: '', kommentar_gelesen: true,
    },
  ];
}

// Tag OHNE Sonderwünsche
function ordersWithoutWishes() {
  return [
    { id: 'n1', name: 'Leer Lena', gericht: 'Schnitzel', menge: 1, preis: 8.8, status: 0, quelle: 0, mitnehmen: false, anmerkung: '', verlauf: [], kunde_kommentar: '', kommentar_gelesen: true },
    { id: 'n2', name: 'Leer Lukas', gericht: 'Schnitzel', menge: 2, preis: 8.8, status: 1, quelle: 0, mitnehmen: false, anmerkung: '', verlauf: [], kunde_kommentar: '', kommentar_gelesen: true },
  ];
}

/**
 * Mockt die Kiosk-APIs. Der heutige Tag liefert Sonderwünsche, jeder andere
 * Tag liefert Bestellungen ohne Sonderwunsch.
 */
async function mockApi(page, opts = {}) {
  const patches = [];
  page.__patches = patches;

  // Requests direkt mitschneiden – unabhaengig davon, welche Route sie bedient
  page.on('request', (req) => {
    if (req.method() !== 'PATCH') return;
    if (!/lunch-order/.test(req.url())) return;
    let body = {};
    try { body = JSON.parse(req.postData() || '{}'); } catch (e) { /* ignore */ }
    patches.push({ url: req.url(), body });
  });

  await page.route('**/api/lunch-order**', (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const json = (o) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });

    if (method !== 'GET') return json({ success: true });
    if (/mode=messages/.test(url)) return json({ success: true, orders: [] });

    const m = /[?&]datum=([0-9-]+)/.exec(url);
    const datum = m ? m[1] : isoToday();
    const list = (opts.empty || datum !== isoToday()) ? ordersWithoutWishes() : ordersWithWishes();
    return json({ success: true, orders: list.map((o) => Object.assign({ datum }, o)) });
  });

  // Feature-Flags: der Kiosk blendet Tabs aus, die im CMS nicht freigeschaltet
  // sind. Ohne diesen Mock waere der Mittagstisch-Tab im Test unsichtbar.
  await page.route('**/api/cms-config**', (route) =>
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

  // Auffangroute: alle übrigen API-Aufrufe leer, aber erfolgreich beantworten
  await page.route('**/api/**', (route) => {
    const url = route.request().url();
    if (/lunch-order|cms-config/.test(url)) return route.fallback();
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [], orders: [], customers: [], items: [], config: {} }),
    });
  });
}

/** Kiosk öffnen und in den Mittagstisch-Tab wechseln. */
async function openMittagstisch(page, opts = {}) {
  await mockApi(page, opts);
  await page.goto(KIOSK_URL);
  await page.locator('.k-tab[data-tab="mittag"]').click();
  await expect(page.locator('#panel-mittag')).toHaveClass(/active/);
  // Warten bis die gemockten Bestellungen gerendert sind
  await expect(page.locator('#mittag-orders .k-order').first()).toBeVisible({ timeout: 20000 });
}

const swFilter = (page) => page.locator('[data-mt-filter="sonderwunsch"]');
const swBar = (page) => page.locator('#mittag-sonder .k-sw-bar');
const swCards = (page) => page.locator('#mittag-orders .k-sw-card');
const swRows = (page) => page.locator('#mittag-orders .k-sw-row');

async function openSonderwuensche(page) {
  await swFilter(page).click();
  await expect(swFilter(page)).toHaveClass(/active/);
}

// ════════════════════════════════════════════════════
//  F1 – Sonderwunsch-Ermittlung
// ════════════════════════════════════════════════════

test.describe('Sonderwünsche – Ermittlung (F1)', () => {

  test('TC-F1-01/03/04: Anmerkung zählt, ohne Hinweis und storniert nicht', async ({ page }) => {
    await openMittagstisch(page);
    await openSonderwuensche(page);

    // 5 von 8 Bestellungen haben einen Sonderwunsch
    await expect(swCards(page)).toHaveCount(5);

    const text = await page.locator('#mittag-orders').innerText();
    expect(text).toContain('Ohne Zwiebeln');       // TC-F1-01 Anmerkung
    expect(text).not.toContain('Ohne Wunsch');      // TC-F1-03 kein Hinweis
    expect(text).not.toContain('Storno Stefan');    // TC-F1-04 storniert
    expect(text).not.toContain('Weiss Otto');       // Weißraum-Anmerkung
  });

  test('TC-F1-02: erste Kundennachricht ersetzt fehlende Anmerkung', async ({ page }) => {
    await openMittagstisch(page);
    await openSonderwuensche(page);

    const card = swCards(page).filter({ hasText: 'Huber Anna' });
    await expect(card).toHaveCount(1);
    await expect(card.locator('.k-sw-note')).toContainText('bitte glutenfrei');
    // genau eine weitere Nachricht ("notiert")
    await expect(card.locator('.k-sw-more-btn')).toContainText('Weitere Nachrichten (1)');
  });

  test('TC-F1-05: Anmerkung plus Chat zeigt beide Folgenachrichten', async ({ page }) => {
    await openMittagstisch(page);
    await openSonderwuensche(page);

    const card = swCards(page).filter({ hasText: 'Familie Schmid' });
    await expect(card.locator('.k-sw-note')).toContainText('Soße separat');
    await expect(card.locator('.k-sw-more-btn')).toContainText('Weitere Nachrichten (2)');

    await card.locator('.k-sw-more-btn').click();
    await expect(card.locator('.k-sw-bub')).toHaveCount(2);
  });
});

// ════════════════════════════════════════════════════
//  F2 – Sonderwunsch-Leiste
// ════════════════════════════════════════════════════

test.describe('Sonderwünsche – Leiste (F2)', () => {

  test('TC-F2-01: Leiste zeigt korrekte Anzahl und Kennzahlen', async ({ page }) => {
    await openMittagstisch(page);
    await expect(swBar(page)).toBeVisible();
    await expect(swBar(page).locator('.k-sw-n')).toHaveText('5');
    // 5 von 7 nicht stornierten Bestellungen, 1 ungelesen, 3 mit Rückfrage
    await expect(swBar(page).locator('.k-sw-bar-t2')).toContainText('5 von 7');
    await expect(swBar(page).locator('.k-sw-bar-t2')).toContainText('1 noch nicht gelesen');
    await expect(swBar(page).locator('.k-sw-bar-t2')).toContainText('3 mit weiterer Rückfrage');
  });

  test('TC-F2-02: Klick auf die Leiste öffnet die Sonderwunsch-Ansicht', async ({ page }) => {
    await openMittagstisch(page);
    await swBar(page).click();
    await expect(swFilter(page)).toHaveClass(/active/);
    await expect(swCards(page)).toHaveCount(5);
    // In der Ansicht selbst ist die Leiste redundant
    await expect(swBar(page)).toHaveCount(0);
  });

  test('TC-F2-03: keine Leiste an einem Tag ohne Sonderwünsche', async ({ page }) => {
    await openMittagstisch(page, { empty: true });
    await expect(swBar(page)).toHaveCount(0);
    await expect(page.locator('#mt-fc-sonderwunsch')).toHaveText('0');
  });
});

// ════════════════════════════════════════════════════
//  F3 – Filter-Reiter
// ════════════════════════════════════════════════════

test.describe('Sonderwünsche – Filter-Reiter (F3)', () => {

  test('TC-F3-01: Zähler stimmt mit der Leiste überein', async ({ page }) => {
    await openMittagstisch(page);
    await expect(page.locator('#mt-fc-sonderwunsch')).toHaveText('5');
    await expect(swBar(page).locator('.k-sw-n')).toHaveText('5');
  });

  test('TC-F3-02: Umschalten zwischen den Reitern', async ({ page }) => {
    await openMittagstisch(page);
    await openSonderwuensche(page);
    await expect(swCards(page).first()).toBeVisible();

    await page.locator('[data-mt-filter="offen"]').click();
    await expect(page.locator('[data-mt-filter="offen"]')).toHaveClass(/active/);
    await expect(swFilter(page)).not.toHaveClass(/active/);
    await expect(swCards(page)).toHaveCount(0);
    await expect(page.locator('#mittag-status-bar .k-filter-btn.active')).toHaveCount(1);
  });

  test('TC-F3-03: Ansicht überlebt das Neuladen der Bestellungen', async ({ page }) => {
    await openMittagstisch(page);
    await openSonderwuensche(page);

    await page.evaluate(() => window.K.refresh());
    await expect(swFilter(page)).toHaveClass(/active/);
    await expect(swCards(page)).toHaveCount(5);
  });
});

// ════════════════════════════════════════════════════
//  F4 – Liste
// ════════════════════════════════════════════════════

test.describe('Sonderwünsche – Liste (F4)', () => {

  test('TC-F4-01: Gruppierung nach Gericht, größte Gruppe zuerst', async ({ page }) => {
    await openMittagstisch(page);
    await openSonderwuensche(page);

    const groups = page.locator('#mittag-orders .k-dish-sep-row');
    await expect(groups).toHaveCount(2);
    await expect(groups.nth(0)).toContainText('Schnitzel');
    await expect(groups.nth(0)).toContainText('3 Sonderwünsche');
    await expect(groups.nth(1)).toContainText('Käsegriller');
    await expect(groups.nth(1)).toContainText('2 Sonderwünsche');
  });

  test('TC-F4-02: Karte zeigt Wunsch und Eckdaten', async ({ page }) => {
    await openMittagstisch(page);
    await openSonderwuensche(page);

    const card = swCards(page).filter({ hasText: 'Huber Anna' });
    await expect(card.locator('.k-sw-qty')).toHaveText('2×');
    await expect(card.locator('.k-sw-dish')).toContainText('Schnitzel');
    await expect(card.locator('.k-sw-note')).toContainText('bitte glutenfrei');
  });

  test('TC-F4-03: Kopfzeile zählt Wünsche und Portionen', async ({ page }) => {
    await openMittagstisch(page);
    await openSonderwuensche(page);

    const head = page.locator('#mittag-orders .k-sw-h1');
    await expect(head).toContainText('5 Sonderwünsche');
    await expect(head).toContainText('8 Portionen');
  });

  test('TC-F4-04: HTML aus Kundentext wird nicht ausgeführt', async ({ page }) => {
    await openMittagstisch(page);
    await openSonderwuensche(page);

    const card = swCards(page).filter({ hasText: 'Zilch Xaver' });
    await expect(card.locator('.k-sw-note')).toContainText(XSS_TEXT);
    await expect(card.locator('.k-sw-note img')).toHaveCount(0);
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════
//  F5 – Aufklappbarer Verlauf
// ════════════════════════════════════════════════════

test.describe('Sonderwünsche – Verlauf (F5)', () => {

  test('TC-F5-01: Aufklappen zeigt Verlauf und Antwortfeld', async ({ page }) => {
    await openMittagstisch(page);
    await openSonderwuensche(page);

    const card = swCards(page).filter({ hasText: 'Bernert Simone' });
    await expect(card.locator('.k-sw-more-btn')).toContainText('Weitere Nachrichten (2)');
    await expect(card.locator('.k-sw-thread')).toBeHidden();

    await card.locator('.k-sw-more-btn').click();
    await expect(card.locator('.k-sw-thread')).toBeVisible();
    await expect(card.locator('.k-sw-bub')).toHaveCount(2);
    await expect(card.locator('textarea#rpt-o1')).toBeVisible();
  });

  test('TC-F5-02: ohne Folgekonversation kein Aufklapper', async ({ page }) => {
    await openMittagstisch(page);
    await openSonderwuensche(page);

    const card = swCards(page).filter({ hasText: 'Maier Josef' });
    await expect(card.locator('.k-sw-more-btn')).toHaveCount(0);
    await expect(card.locator('.k-sw-none')).toContainText('Keine weiteren Nachrichten');
  });

  test('TC-F5-03: Antworten aus der Sonderwunsch-Ansicht', async ({ page }) => {
    await openMittagstisch(page);
    await openSonderwuensche(page);

    const card = swCards(page).filter({ hasText: 'Bernert Simone' });
    await card.locator('.k-sw-more-btn').click();
    await card.locator('textarea#rpt-o1').fill('Passt, wird notiert');
    await card.locator('button:has-text("Senden")').click();

    await expect.poll(() => page.__patches.length, { timeout: 10000 }).toBeGreaterThan(0);
    const patch = page.__patches[page.__patches.length - 1];
    expect(patch.url).toContain('/o1');
    expect(patch.body.personal_antwort).toBe('Passt, wird notiert');
  });

  test('TC-F5-04: leere Antwort wird nicht gesendet', async ({ page }) => {
    const dialogs = [];
    page.on('dialog', (d) => { dialogs.push(d.message()); d.dismiss(); });

    await openMittagstisch(page);
    await openSonderwuensche(page);

    const card = swCards(page).filter({ hasText: 'Bernert Simone' });
    await card.locator('.k-sw-more-btn').click();
    await card.locator('textarea#rpt-o1').fill('   ');
    await card.locator('button:has-text("Senden")').click();

    await page.waitForTimeout(800);
    expect(page.__patches.length).toBe(0);
    expect(dialogs).toHaveLength(0);
  });

  test('TC-F5-05: alle Verläufe auf- und wieder zuklappen', async ({ page }) => {
    await openMittagstisch(page);
    await openSonderwuensche(page);

    const open = page.locator('#mittag-orders .k-sw-more.open');
    await expect(open).toHaveCount(0);

    await page.locator('button:has-text("Alle Verläufe")').click();
    await expect(open).toHaveCount(3);   // o1, o2, o7 haben Folgenachrichten

    await page.locator('button:has-text("Verläufe zu")').click();
    await expect(open).toHaveCount(0);
  });
});

// ════════════════════════════════════════════════════
//  F6 – Kompaktansicht
// ════════════════════════════════════════════════════

test.describe('Sonderwünsche – Kompaktansicht (F6)', () => {

  test('TC-F6-01: Umschalten auf Kompakt', async ({ page }) => {
    await openMittagstisch(page);
    await openSonderwuensche(page);

    await page.locator('button:has-text("Kompakt")').click();
    await expect(swRows(page)).toHaveCount(5);
    await expect(swCards(page)).toHaveCount(0);
    await expect(page.locator('#mittag-orders textarea')).toHaveCount(0);
  });

  test('TC-F6-02/03: zurück auf Details, gleiche Menge', async ({ page }) => {
    await openMittagstisch(page);
    await openSonderwuensche(page);

    await page.locator('button:has-text("Kompakt")').click();
    await expect(swRows(page)).toHaveCount(5);

    await page.locator('button:has-text("Details")').click();
    await expect(swCards(page)).toHaveCount(5);
    await expect(swRows(page)).toHaveCount(0);
  });
});

// ════════════════════════════════════════════════════
//  F7 – Leerzustand & Responsive
// ════════════════════════════════════════════════════

test.describe('Sonderwünsche – Leerzustand & Responsive (F7)', () => {

  test('TC-F7-01: freundlicher Leerzustand', async ({ page }) => {
    await openMittagstisch(page, { empty: true });
    await openSonderwuensche(page);

    await expect(page.locator('#mittag-orders .k-empty')).toContainText('Keine Sonderwünsche für diesen Tag');
    await expect(page.locator('#mittag-orders .k-dish-sep-row')).toHaveCount(0);
    await expect(swCards(page)).toHaveCount(0);
  });

  test('TC-F7-02: kein horizontales Scrollen', async ({ page }) => {
    await openMittagstisch(page);
    await openSonderwuensche(page);

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('TC-F7-03: Tap-Targets mindestens 44px hoch', async ({ page }) => {
    await openMittagstisch(page);
    await openSonderwuensche(page);

    const more = swCards(page).filter({ hasText: 'Bernert Simone' }).locator('.k-sw-more-btn');
    const boxMore = await more.boundingBox();
    expect(boxMore.height).toBeGreaterThanOrEqual(44);

    const boxHead = await page.locator('button:has-text("Kompakt")').boundingBox();
    expect(boxHead.height).toBeGreaterThanOrEqual(44);
  });
});
