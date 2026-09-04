/**
 * Kiosk – Kontakt: Lesehaken, Sortierung und Spalten-Ausrichtung
 *
 * Prüft die WhatsApp-artigen Verbesserungen im Tab "Kontakt":
 *   K1  Ungelesene Konversationen stehen oben, mit sichtbarer Trennung
 *   K2  Gelesene Konversationen tragen einen Doppelhaken
 *   K3  Öffnen einer Konversation markiert sie als gelesen
 *   K4  Die Spalten der Listenzeile sind sauber ausgerichtet
 *
 * Ausführen:
 *   npx playwright test tests/kiosk-kontakt-haken.spec.js
 */

const { test, expect } = require('@playwright/test');

// Der Kiosk ist eine PWA: ohne diesen Schalter beantwortet der Service Worker
// die API-Aufrufe aus seinem Cache und die Mock-Routen greifen nicht.
test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
// Lokal (python http.server) gibt es keine SWA-Route /kiosk -> Datei ansteuern
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

function threads() {
  return [
    // gelesen, aber juengste Aktivitaet – darf NICHT oben stehen
    {
      id: 'c1', name: 'Anna Gelesen', device_id: 'devaaaa1111', geraet: 'Windows · Chrome',
      kommentar_gelesen: true, modified: '2026-09-04T15:00:00Z',
      verlauf: [
        { who: 'kunde', text: 'Habt ihr Brot?', t: '2026-09-04T14:00:00Z' },
        { who: 'dorfladen', text: 'Ja, frisch da.', t: '2026-09-04T15:00:00Z' },
      ],
    },
    // ungelesen, aelter – muss trotzdem oben stehen
    {
      id: 'c2', name: 'Bert Ungelesen', device_id: 'devbbbb2222', geraet: 'Android · Chrome',
      kommentar_gelesen: false, modified: '2026-09-04T09:00:00Z',
      verlauf: [
        { who: 'dorfladen', text: 'Guten Morgen', t: '2026-09-04T08:00:00Z' },
        { who: 'kunde', text: 'Ist der Mittagstisch noch offen?', t: '2026-09-04T09:00:00Z' },
      ],
    },
    // ungelesen mit zwei offenen Kundennachrichten
    {
      id: 'c3', name: 'Clara Zwei', device_id: 'devcccc3333', geraet: '',
      kommentar_gelesen: false, modified: '2026-09-04T10:00:00Z',
      verlauf: [
        { who: 'kunde', text: 'Hallo', t: '2026-09-04T09:50:00Z' },
        { who: 'kunde', text: 'Noch eine Frage', t: '2026-09-04T10:00:00Z' },
      ],
    },
  ];
}

async function mockApi(page, opts = {}) {
  const patches = [];
  page.__patches = patches;
  // Serverzustand nachbilden: ein PATCH markiert die Konversation dauerhaft
  // als gelesen, damit ein Neuladen nicht wieder "ungelesen" liefert.
  const readIds = new Set();
  page.on('request', (req) => {
    if (req.method() === 'PATCH' && /contact-message/.test(req.url())) {
      let body = {};
      try { body = JSON.parse(req.postData() || '{}'); } catch (e) { /* ignore */ }
      patches.push({ url: req.url(), body });
      const m = /contact-message\/([^/?]+)/.exec(req.url());
      if (m && body.kommentar_gelesen) readIds.add(m[1]);
    }
  });

  // Reihenfolge zaehlt: zuletzt registrierte Route wird zuerst geprueft.
  // Daher erst die Auffangroute, danach die spezifischen. Regex statt Glob,
  // damit die Muster unabhaengig von Host und Port zuverlaessig greifen.
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
    const list = threads().map((t) => Object.assign({}, t, {
      kommentar_gelesen: opts.allRead || t.kommentar_gelesen || readIds.has(t.id),
    }));
    if (/mode=unread/.test(url)) {
      return json({ success: true, unread_count: list.filter((t) => !t.kommentar_gelesen).length });
    }
    return json({ success: true, threads: list });
  });
}

async function openKontakt(page, opts = {}) {
  await mockApi(page, opts);
  await page.goto(KIOSK_URL);
  await page.locator('.k-tab[data-tab="kontakt"]').click();
  await expect(page.locator('#kontakt-list .kk-card').first()).toBeVisible({ timeout: 20000 });
}

const cards = (page) => page.locator('#kontakt-list .kk-card');

// ════════════════════════════════════════════════════
//  K1 – Ungelesene oben
// ════════════════════════════════════════════════════

test.describe('Kontakt – Sortierung (K1)', () => {

  test('K1-01: ungelesene Konversationen stehen oben', async ({ page }) => {
    await openKontakt(page);
    const names = await page.locator('#kontakt-list .kk-name').allTextContents();
    // Bert und Clara sind ungelesen, Anna gelesen – trotz juengerer Aktivitaet
    expect(names.slice(0, 2).sort()).toEqual(['Bert Ungelesen', 'Clara Zwei']);
    expect(names[2]).toBe('Anna Gelesen');
  });

  test('K1-02: Abschnitte trennen neu und gelesen', async ({ page }) => {
    await openKontakt(page);
    const secs = page.locator('#kontakt-list .kk-sec');
    await expect(secs).toHaveCount(2);
    await expect(secs.nth(0)).toContainText('Neue Nachrichten');
    await expect(secs.nth(0)).toContainText('2 ungelesen');
    await expect(secs.nth(1)).toContainText('Bereits gelesen');
  });

  test('K1-03: ohne ungelesene keine Abschnittsköpfe', async ({ page }) => {
    await openKontakt(page, { allRead: true });
    await expect(page.locator('#kontakt-list .kk-sec')).toHaveCount(0);
    await expect(cards(page)).toHaveCount(3);
  });
});

// ════════════════════════════════════════════════════
//  K2 – Lesehaken
// ════════════════════════════════════════════════════

test.describe('Kontakt – Lesehaken (K2)', () => {

  test('K2-01: gelesene Konversation zeigt Doppelhaken, ungelesene die Anzahl', async ({ page }) => {
    await openKontakt(page);

    const gelesen = cards(page).filter({ hasText: 'Anna Gelesen' });
    await expect(gelesen.locator('.kk-state .kk-ticks')).toHaveCount(1);

    const offen = cards(page).filter({ hasText: 'Clara Zwei' });
    await expect(offen.locator('.kk-state .kk-ticks')).toHaveCount(0);
    await expect(offen.locator('.kk-state')).toContainText('2');
  });

  test('K2-02: Haken an gelesenen Kundennachrichten im Verlauf', async ({ page }) => {
    await openKontakt(page);

    const gelesen = cards(page).filter({ hasText: 'Anna Gelesen' });
    await gelesen.locator('.kk-hdr').click();
    await expect(gelesen.locator('.kk-thread')).toBeVisible();
    // Kundennachricht ist gelesen -> Haken ohne "pending"
    await expect(gelesen.locator('.kk-thread .kk-ticks')).toHaveCount(1);
    await expect(gelesen.locator('.kk-thread .kk-ticks.pending')).toHaveCount(0);
  });

  test('K2-03: eigene Nachrichten tragen keinen Lesehaken', async ({ page }) => {
    await openKontakt(page);

    const gelesen = cards(page).filter({ hasText: 'Anna Gelesen' });
    await gelesen.locator('.kk-hdr').click();
    await expect(gelesen.locator('.kk-thread')).toBeVisible();
    // 2 Nachrichten im Verlauf, aber nur die des Kunden hat einen Haken
    await expect(gelesen.locator('.kk-thread .kk-ticks')).toHaveCount(1);
  });
});

// ════════════════════════════════════════════════════
//  K3 – Öffnen markiert als gelesen
// ════════════════════════════════════════════════════

test.describe('Kontakt – Öffnen markiert gelesen (K3)', () => {

  test('K3-01: Öffnen sendet PATCH und setzt den Haken', async ({ page }) => {
    await openKontakt(page);

    const offen = cards(page).filter({ hasText: 'Clara Zwei' });
    await expect(offen.locator('.kk-state .kk-ticks')).toHaveCount(0);

    await offen.locator('.kk-hdr').click();

    await expect.poll(() => page.__patches.length, { timeout: 10000 }).toBeGreaterThan(0);
    const patch = page.__patches[page.__patches.length - 1];
    expect(patch.url).toContain('/c3');
    expect(patch.body.kommentar_gelesen).toBe(true);

    // Nach dem Öffnen traegt die Zeile den Doppelhaken statt der Zahl
    await expect(offen.locator('.kk-state .kk-ticks')).toHaveCount(1);
    // ... und die zuvor offenen Kundennachrichten gelten als gelesen
    await expect(offen.locator('.kk-thread .kk-ticks')).toHaveCount(2);
    await expect(offen.locator('.kk-thread .kk-ticks.pending')).toHaveCount(0);
  });

  test('K3-02: gelesene Konversation springt nicht sofort weg', async ({ page }) => {
    await openKontakt(page);

    const before = await page.locator('#kontakt-list .kk-name').allTextContents();
    await cards(page).filter({ hasText: 'Clara Zwei' }).locator('.kk-hdr').click();
    await expect(cards(page).filter({ hasText: 'Clara Zwei' }).locator('.kk-thread')).toBeVisible();

    const after = await page.locator('#kontakt-list .kk-name').allTextContents();
    expect(after).toEqual(before);
  });
});

// ════════════════════════════════════════════════════
//  K4 – Spalten-Ausrichtung
// ════════════════════════════════════════════════════

test.describe('Kontakt – Spalten (K4)', () => {

  test('K4-01: Name, Gerät und Vorschau starten bündig', async ({ page }, testInfo) => {
    await openKontakt(page);
    test.skip(testInfo.project.name !== 'desktop', 'Rasterlayout erst ab 900px');

    const cols = async (sel) => page.locator('#kontakt-list ' + sel).evaluateAll(
      (els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));

    const names = await cols('.kk-name');
    const devs = await cols('.kk-dev');
    const prevs = await cols('.kk-prev');

    expect(names.length).toBe(3);
    // Alle drei Spalten jeweils an derselben x-Position
    expect(new Set(names).size).toBe(1);
    expect(new Set(devs).size).toBe(1);
    expect(new Set(prevs).size).toBe(1);
  });

  test('K4-02: Zeitspalte endet bündig', async ({ page }, testInfo) => {
    await openKontakt(page);
    test.skip(testInfo.project.name !== 'desktop', 'Rasterlayout erst ab 900px');

    const rights = await page.locator('#kontakt-list .kk-time').evaluateAll(
      (els) => els.map((e) => Math.round(e.getBoundingClientRect().right)));
    expect(new Set(rights).size).toBe(1);
  });

  test('K4-03: kein horizontales Scrollen', async ({ page }) => {
    await openKontakt(page);
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('K4-04: auf schmalen Schirmen zwei feste Zeilen statt freiem Umbruch', async ({ page }, testInfo) => {
    await openKontakt(page);
    test.skip(testInfo.project.name === 'desktop', 'Zweizeiliges Raster nur unter 900px');

    const box = async (sel) => page.locator('#kontakt-list .kk-card').first()
      .locator(sel).evaluate((e) => { const r = e.getBoundingClientRect(); return { top: Math.round(r.top), left: Math.round(r.left) }; });

    const name = await box('.kk-name');
    const state = await box('.kk-state');
    const prev = await box('.kk-prev');

    // Name und Status teilen sich die erste Zeile
    expect(Math.abs(name.top - state.top)).toBeLessThanOrEqual(6);
    // Die Vorschau steht darunter
    expect(prev.top).toBeGreaterThan(name.top);
  });

  test('K4-05: Namensspalte startet in allen Zeilen gleich', async ({ page }) => {
    await openKontakt(page);
    // Unterschiedlich breite Geraete-Chips duerfen die Namensspalte nicht verschieben
    const lefts = await page.locator('#kontakt-list .kk-name').evaluateAll(
      (els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
    expect(lefts.length).toBe(3);
    expect(new Set(lefts).size).toBe(1);
  });
});
