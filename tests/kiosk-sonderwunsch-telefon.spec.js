/**
 * Kiosk – Sonderwunsch statt „Nachricht vom Kunden" (Telefonbestellung)
 * und Kachelhöhen im Mittagstisch.
 *
 * Zwei Meldungen aus dem Laden:
 *
 * 1. „Bei telefonischer Bestellung kann es eigentlich keine Nachricht vom
 *    Kunden geben. Warum blinkt es trotzdem auf?"
 *    Der Sonderwunsch steht im selben Feld `anmerkung` wie der Wunsch aus
 *    dem Online-Formular – nur hat ihn hier das Personal selbst getippt.
 *    Er galt als ungelesene Nachricht: Die Karte blinkte, klappte auf und
 *    blockierte die Sammelbestätigung.
 *    Nachgereicht: „Es muss aber trotzdem als Sonderwunsch angezeigt
 *    werden. Evtl. kann die Nachricht gleich beim Erfassen auf gelesen
 *    gesetzt werden."
 *
 * 2. „Es schaut blöd aus, wenn eine Bestellung mehrere Chats beinhaltet,
 *    da alle anderen Kacheln dann auch die gleiche Größe bekommen."
 *    Das Raster zog ohne `align-items` jede Karte einer Zeile auf die Höhe
 *    der höchsten.
 *
 * Ausführen (lokaler Server aus static-site/ auf 8099):
 *   $env:TEST_URL='http://127.0.0.1:8099'
 *   node node_modules\@playwright\test\cli.js test tests/kiosk-sonderwunsch-telefon.spec.js
 */

const { test, expect } = require('./_kiosk-angemeldet');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

const QUELLE_ONLINE = 0;
const QUELLE_TELEFON = 1;

function heute() {
  const d = new Date();
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)
    + '-' + ('0' + d.getDate()).slice(-2);
}

/** Eine Bestellung, wie sie der Server liefert. */
function order(id, extra) {
  return Object.assign({
    id: id,
    bestellnummer: 'MT-T-' + id,
    name: 'Testkunde ' + id,
    gericht: 'Schaschlikpfanne mit Reis oder Pommes',
    menge: 1,
    preis: 8.8,
    datum: heute(),
    status: 1,
    quelle: QUELLE_TELEFON,
    anmerkung: '',
    kunde_kommentar: '',
    kommentar_gelesen: false,
    verlauf: [],
  }, extra || {});
}

async function mockApi(page, orders) {
  const j = (o) => ({ status: 200, contentType: 'application/json',
    body: JSON.stringify(o) });

  await page.route('**/api/lunch-order**', (route) =>
    route.fulfill(j({ success: true, orders: orders })));
  await page.route('**/api/stammkunden**', (route) =>
    route.fulfill(j({ success: true, customers: [] })));
  await page.route('**/api/**', (route) => {
    if (/lunch-order|stammkunden/.test(route.request().url())) return route.fallback();
    return route.fulfill(j({ success: true }));
  });
}

async function oeffneMittag(page, orders) {
  await mockApi(page, orders);
  await page.goto(KIOSK_URL);
  await page.waitForTimeout(2200);
  await page.evaluate(() => window.K.switchTab('mittag'));
  await page.waitForTimeout(1200);
  // „Alle" statt des Vorgabefilters – sonst fehlen bestätigte Bestellungen.
  await page.evaluate(() => window.K.setMittagFilter('alle'));
  await page.waitForTimeout(900);
}

// ════════════════════════════════════════════════════════════
//  Telefonisch erfasster Sonderwunsch
// ════════════════════════════════════════════════════════════

test.describe('Mittagstisch – Sonderwunsch am Telefon', () => {

  test('TC-SW-01: Der Wunsch bleibt sichtbar, heißt aber Sonderwunsch',
    async ({ page }) => {
      await oeffneMittag(page, [
        order('t1', { quelle: QUELLE_TELEFON, anmerkung: 'ohne Beilage, bissi große Portionen' }),
      ]);
      const txt = await page.locator('#mittag-orders').innerText();
      // Sichtbar bleiben muss er – er gehört zur Zubereitung.
      expect(txt).toContain('ohne Beilage, bissi große Portionen');
      expect(txt).toContain('Sonderwunsch');
      expect(txt, 'Das Personal hat den Text selbst getippt')
        .not.toContain('Nachricht vom Kunden');
    });

  test('TC-SW-02: Kein „Gelesen"-Knopf für den eigenen Text', async ({ page }) => {
    await oeffneMittag(page, [
      order('t1', { quelle: QUELLE_TELEFON, anmerkung: 'Reis und Pommes' }),
    ]);
    const karte = page.locator('#mittag-orders .k-order').first();
    await expect(karte.locator('button:has-text("Gelesen")')).toHaveCount(0);
  });

  test('TC-SW-03: Kein blinkendes NEU an einer Telefonbestellung',
    async ({ page }) => {
      await oeffneMittag(page, [
        order('t1', { quelle: QUELLE_TELEFON, anmerkung: 'Currywurst mit Pommes' }),
      ]);
      const karte = page.locator('#mittag-orders .k-order').first();
      await expect(karte.locator('text=NEU')).toHaveCount(0);
    });

  test('TC-SW-04: Online bleibt es eine Nachricht vom Kunden', async ({ page }) => {
    // Die Gegenprobe: Dort hat der Kunde den Text selbst geschrieben.
    await oeffneMittag(page, [
      order('o1', { quelle: QUELLE_ONLINE, anmerkung: 'Bitte ohne Zwiebeln' }),
    ]);
    const txt = await page.locator('#mittag-orders').innerText();
    expect(txt).toContain('Nachricht vom Kunden');
    expect(txt).toContain('Bitte ohne Zwiebeln');
    await expect(page.locator('#mittag-orders button:has-text("Gelesen")'))
      .not.toHaveCount(0);
  });

  test('TC-SW-05: Eine echte Kundennachricht meldet sich auch am Telefon',
    async ({ page }) => {
      /* Ein telefonisch erfasster Kunde kann später über die App schreiben.
         Das ist dann sehr wohl eine Nachricht – sie darf nicht verstummen,
         nur weil die Bestellung am Telefon aufgenommen wurde. */
      await oeffneMittag(page, [
        order('t2', {
          quelle: QUELLE_TELEFON,
          anmerkung: 'ohne Beilage',
          kunde_kommentar: 'Kann ich später abholen?',
        }),
      ]);
      const txt = await page.locator('#mittag-orders').innerText();
      expect(txt).toContain('Kann ich später abholen?');
      expect(txt, 'der eigene Wunsch bleibt Sonderwunsch').toContain('Sonderwunsch');
      await expect(page.locator('#mittag-orders button:has-text("Gelesen")'))
        .not.toHaveCount(0);
    });
});

// ════════════════════════════════════════════════════════════
//  Kachelhöhen
// ════════════════════════════════════════════════════════════

test.describe('Mittagstisch – Kachelhöhen', () => {

  test('TC-KH-01: Eine Karte mit Chat zieht die Nachbarn nicht mit',
    async ({ page }) => {
      await page.setViewportSize({ width: 1500, height: 900 });
      await oeffneMittag(page, [
        order('c1', {
          quelle: QUELLE_ONLINE,
          anmerkung: 'Beide mit Pommes',
          kunde_kommentar: 'Beide mit Pommes',
          verlauf: [
            { who: 'kunde', text: 'Beide mit Pommes' },
            { who: 'personal', text: 'Ok' },
            { who: 'kunde', text: 'Danke, bis gleich!' },
            { who: 'personal', text: 'Gern geschehen.' },
          ],
        }),
        order('c2'), order('c3'), order('c4'),
      ]);

      const hoehen = await page.evaluate(() => {
        const karten = [...document.querySelectorAll('#mittag-orders .k-order')];
        return karten.map((k) => Math.round(k.getBoundingClientRect().height));
      });
      expect(hoehen.length, 'vier Karten erwartet').toBe(4);

      const hoch = Math.max(...hoehen);
      const flach = Math.min(...hoehen);
      // Die Karte mit Chat ist zwangsläufig höher. Die anderen dürfen
      // deshalb nicht mitwachsen – sonst stünde daneben nur Leerraum.
      expect(flach, `alle Karten gleich hoch (${hoehen.join(', ')}) – `
        + 'das Raster dehnt wieder').toBeLessThan(hoch - 40);
    });

  test('TC-KH-02: Ohne Chat bleiben die Karten gleichmäßig', async ({ page }) => {
    // Gegenprobe: Bei ähnlichem Inhalt soll das Bild ruhig bleiben.
    await page.setViewportSize({ width: 1500, height: 900 });
    await oeffneMittag(page, [order('g1'), order('g2'), order('g3'), order('g4')]);

    const hoehen = await page.evaluate(() => {
      const karten = [...document.querySelectorAll('#mittag-orders .k-order')];
      return karten.map((k) => Math.round(k.getBoundingClientRect().height));
    });
    const spanne = Math.max(...hoehen) - Math.min(...hoehen);
    expect(spanne, `Karten unterschiedlich hoch: ${hoehen.join(', ')}`)
      .toBeLessThan(20);
  });
});
