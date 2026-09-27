// @ts-check
const { test, expect } = require('./_kiosk-angemeldet');

/**
 * Der Storno-Grund muss sichtbar sein
 * Spec: specs/storno-grund-sichtbar/spec.md
 *
 * Aus dem Laden: „Wenn eine Bestellung storniert wird vom Kunden, sieht
 * man den Grund nicht."
 *
 * Der Befund war eine unterbrochene Kette:
 *   1. Beim Stornieren wird ein Grund VERLANGT  ✓
 *   2. Er wird in `dl_storno_grund` gespeichert ✓
 *   3. `_serialize` gab ihn nicht zurück        ✗
 *   4. Der Kiosk zeigte ihn nie                 ✗
 *
 * In Dataverse lagen 12 von 12 stornierten Bestellungen mit Grund,
 * darunter Kundengründe wie „Freitag wos anders". Niemand hat sie je
 * gesehen — die Eingabe war umsonst.
 */

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const LOKAL = /localhost|127\.0\.0\.1/.test(BASE);
const KIOSK_URL = LOKAL ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

function heute() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
    + '-' + String(d.getDate()).padStart(2, '0');
}

const GERICHT = 'Fleischpflanzerl mit Kartoffelsalat';

function bestellungen() {
  const basis = [
    // Der gemeldete Fall: online bestellt, vom Kunden storniert.
    { id: 'kunde-storno', name: 'Josef Rumpfinger', status: 2, quelle: 0,
      storno_grund: 'Kundengrund: Freitag wos anders' },
    // Vom Laden storniert - auch dieser Grund gehört gezeigt.
    { id: 'laden-storno', name: 'Elo', status: 2, quelle: 1,
      storno_grund: 'Storniert: Gericht ist leider ausverkauft' },
    // Storniert, aber ohne Grund (Altbestand): keine leere Zeile.
    { id: 'ohne-grund', name: 'Ohne Grund', status: 2, quelle: 1,
      storno_grund: '' },
    // Offen: hier darf nichts stehen.
    { id: 'offen', name: 'Noch offen', status: 0, quelle: 1,
      storno_grund: '' },
  ];
  return basis.map((o) => Object.assign({
    datum: heute(), gericht: GERICHT, menge: 1, preis: 8.8,
    mitnehmen: false, anmerkung: '', kommentar_gelesen: true, verlauf: [],
  }, o));
}

async function mockApi(page) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const json = (o) => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(o),
    });
    if (url.includes('/api/cms-config')) {
      return json({ success: true, data: { feature_flags: { kiosk_mittag: true } } });
    }
    if (url.includes('mode=unread_messages')) return json({ success: true, unread_count: 0 });
    if (url.includes('mode=messages')) return json({ success: true, orders: [] });
    if (url.includes('/api/lunch-order')) return json({ success: true, orders: bestellungen() });
    return json({ success: true, orders: [], data: [] });
  });
}

async function stornoReiter(page) {
  await mockApi(page);
  await page.goto(KIOSK_URL);
  await page.click('[data-tab="mittag"]');
  await page.waitForTimeout(1500);
  await page.click('[data-mt-filter="storniert"]');
  await page.waitForTimeout(600);
}

test.describe('Storno-Grund im Kiosk', () => {
  test.use({ serviceWorkers: 'block' });

  test('TC-SG-01: Der Kundengrund steht an der Karte', async ({ page }) => {
    // Genau der gemeldete Fall.
    await stornoReiter(page);
    const karte = page.locator('#oc-kunde-storno');
    await expect(karte).toBeVisible();
    await expect(karte, 'der Grund fehlt an der Karte')
      .toContainText('Freitag wos anders');
  });

  test('TC-SG-02: Ohne Aufklappen lesbar', async ({ page }) => {
    /* Die Verkäuferin soll nicht erst jede Karte öffnen müssen, um zu
       sehen, warum abgesagt wurde. */
    await stornoReiter(page);
    await expect(page.locator('#oc-kunde-storno .k-oc-storno')).toBeVisible();
    await expect(page.locator('#oc-kunde-storno .k-order-body'),
      'die Karte ist aufgeklappt — dann sagt der Fall nichts aus').toBeHidden();
  });

  test('TC-SG-03: Auch der Grund des Ladens steht da', async ({ page }) => {
    await stornoReiter(page);
    await expect(page.locator('#oc-laden-storno'))
      .toContainText('ausverkauft');
  });

  test('TC-SG-04: Ohne Grund bleibt die Zeile weg', async ({ page }) => {
    /* Altbestand ohne Grund soll keine leere rote Zeile erzeugen. */
    await stornoReiter(page);
    await expect(page.locator('#oc-ohne-grund .k-oc-storno')).toHaveCount(0);
  });

  test('TC-SG-05: An offenen Bestellungen steht nichts', async ({ page }) => {
    await mockApi(page);
    await page.goto(KIOSK_URL);
    await page.click('[data-tab="mittag"]');
    await page.waitForTimeout(1500);
    await expect(page.locator('#oc-offen .k-oc-storno')).toHaveCount(0);
  });

  test('TC-SG-06: Grund und Sonderwunsch sind auseinanderzuhalten',
    async ({ page }) => {
      /* Beide können an derselben Karte stehen. Gleiche Farbe hieße:
         die Verkäuferin liest einen abgesagten Wunsch als offenen. */
      await stornoReiter(page);
      const farben = await page.evaluate(() => {
        const s = document.querySelector('.k-oc-storno');
        const w = document.querySelector('.k-oc-wunsch');
        const f = (el) => el ? getComputedStyle(el).backgroundColor : '';
        return { storno: f(s), wunsch: f(w) };
      });
      expect(farben.storno, 'der Grund hat keinen eigenen Hintergrund')
        .not.toBe('');
      if (farben.wunsch) {
        expect(farben.storno, 'Grund und Sonderwunsch sehen gleich aus')
          .not.toBe(farben.wunsch);
      }
    });
});

test.describe('Nachricht zu einer stornierten Bestellung', () => {
  test.use({ serviceWorkers: 'block' });

  /* Seit die Kundin aus ihrem Konto heraus schreiben kann, liegt genau
     nach einer Absage die Frage nahe: „Warum wurde storniert?"
     Vorher blendete `_hasUnseenComment` alles mit Status 2 aus — die
     Nachricht wäre in einem Feld gelandet, das niemand liest. */

  async function mitNachricht(page, o) {
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      const json = (x) => route.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify(x),
      });
      if (url.includes('/api/cms-config')) {
        return json({ success: true, data: { feature_flags: { kiosk_mittag: true } } });
      }
      if (url.includes('mode=unread_messages')) return json({ success: true, unread_count: 0 });
      if (url.includes('mode=messages')) return json({ success: true, orders: [] });
      if (url.includes('/api/lunch-order')) {
        return json({ success: true, orders: [Object.assign({
          id: 'b1', name: 'Josef Rumpfinger', quelle: 0, datum: heute(),
          gericht: GERICHT, menge: 1, preis: 8.8, mitnehmen: false,
          kommentar_gelesen: false, verlauf: [],
        }, o)] });
      }
      return json({ success: true, orders: [], data: [] });
    });
    await page.goto(KIOSK_URL);
    await page.click('[data-tab="mittag"]');
    await page.waitForTimeout(1500);
  }

  test('TC-SG-07: Eine echte Nachricht meldet sich auch nach der Absage',
    async ({ page }) => {
      await mitNachricht(page, {
        status: 2, storno_grund: 'Kundengrund: Termin verschoben',
        kunde_kommentar: 'Warum wurde das abgesagt?',
      });
      await page.click('[data-mt-filter="storniert"]');
      await page.waitForTimeout(600);
      await expect(page.locator('#oc-b1'),
        'die Nachricht zur stornierten Bestellung bleibt stumm')
        .toContainText('NEU');
    });

  test('TC-SG-08: Der blosse Sonderwunsch meldet sich nicht mehr',
    async ({ page }) => {
      /* Die Gegenseite derselben Regel: Ein Sonderwunsch ist mit der
         Stornierung erledigt und braucht keine Aufmerksamkeit. */
      await mitNachricht(page, {
        status: 2, storno_grund: 'Storniert: ausverkauft',
        anmerkung: 'ohne Zwiebeln bitte',
      });
      await page.click('[data-mt-filter="storniert"]');
      await page.waitForTimeout(600);
      await expect(page.locator('#oc-b1'),
        'der erledigte Sonderwunsch blinkt trotzdem')
        .not.toContainText('NEU');
    });

  test('TC-SG-09: Bei offenen Bestellungen bleibt alles wie bisher',
    async ({ page }) => {
      await mitNachricht(page, { status: 0, anmerkung: 'ohne Zwiebeln bitte' });
      await expect(page.locator('#oc-b1')).toContainText('NEU');
    });
});
