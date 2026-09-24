/**
 * Metzger – die Erinnerung zielt auf den richtigen Tag
 *
 * Aus dem Laden: „Warum blinkt Metzger Mair heute?"
 *
 * Es war Donnerstag, 24.09.2026, 12:54 Uhr. Donnerstag ist ein Liefertag,
 * für heute lag noch ein **Entwurf** mit 6 Positionen herum, und der
 * Bestellschluss (12:00) war vorbei. Der Reiter blinkte.
 *
 * Verlangt wurde damit etwas Unmögliches. Die Spec sagt zum Liefertag:
 *
 *   „Der heutige Tag ist deshalb nie mehr bestellbar, auch wenn er ein
 *    Bestelltag ist — die Ware ist längst gepackt."
 *    (metzger-bestellung, F1)
 *
 * Der Tag war nicht einmal anwählbar. Das Blinken hätte bis Mitternacht
 * angehalten, ohne dass sich etwas tun ließ.
 *
 * Richtig ist der Liefertag von **morgen**: Für ihn ist heute der letzte
 * Tag. Genau so macht es der Bäcker-Tab schon serverseitig — er sucht
 * Liefertage, deren Bestellschluss auf heute fällt.
 *
 * Ausführen (lokaler Server aus static-site/ auf 8099):
 *   $env:TEST_URL='http://127.0.0.1:8099'
 *   node node_modules\@playwright\test\cli.js test tests/kiosk-metzger-erinnerung.spec.js
 */

const { test, expect } = require('./_kiosk-angemeldet');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

const TAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const LIEFERTAGE = [1, 4];        // Montag und Donnerstag (JS: So = 0)

/* Feste Tage statt „heute": Ein Wächter darf nicht vom Wochentag abhängen,
   an dem er zufällig läuft. Der 24.09.2026 ist der gemeldete Donnerstag. */
const DONNERSTAG = '2026-09-24';
const MITTWOCH = '2026-09-23';

function iso(d) {
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)
    + '-' + ('0' + d.getDate()).slice(-2);
}

/** Tagesleiste ab `startIso`, wie der Server sie liefert. */
function tagesleiste(startIso, zustaende) {
  const out = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(startIso + 'T12:00:00');
    d.setDate(d.getDate() + i);
    const datum = iso(d);
    const ist = LIEFERTAGE.includes(d.getDay());
    out.push({
      datum,
      wochentag: TAGE[d.getDay()],
      bestelltag: ist,
      // Heute ist die Ware längst gepackt (F1).
      bestellbar: ist && datum > startIso,
      nur_lesen: false,
      status: Object.prototype.hasOwnProperty.call(zustaende || {}, datum)
        ? zustaende[datum] : null,
      positionen: 0,
    });
  }
  return out;
}

const CONFIG = {
  name: 'Metzgerei Mair',
  empfaenger: 'metzgerei@example.org',
  empfaenger_name: 'Metzgerei Mair',
  metzger_mail: 'metzgerei@example.org',
  bestelltage: [0, 3],
  bestellschluss: '12:00',
  kd_nr: '1041',
};

async function mockApi(page, opts) {
  const j = (o) => ({ status: 200, contentType: 'application/json',
    body: JSON.stringify(o) });
  const tage = tagesleiste(opts.heute, opts.zustaende);

  await page.route('**/api/metzger-order**', (route) => {
    const url = route.request().url();
    if (/mode=verlauf/.test(url)) {
      return route.fulfill(j({ success: true, verlauf: [] }));
    }
    if (/metzger-order\/\d{4}-\d{2}-\d{2}/.test(url)) {
      return route.fulfill(j({
        success: true,
        bestellung: { datum: opts.heute, status: 0, positionen: [], protokoll: [] },
        artikel: [], vorschlaege: [], letzte: null,
        bestelltag: true, bestellbar: true,
        config: CONFIG, testbetrieb: !!opts.testbetrieb, summen: {},
      }));
    }
    return route.fulfill(j({
      success: true, tage: tage, aktiv: opts.heute,
      config: CONFIG, testbetrieb: !!opts.testbetrieb,
    }));
  });

  await page.route('**/api/metzger-artikel**', (route) =>
    route.fulfill(j({ success: true, artikel: [] })));
  await page.route('**/api/**', (route) => {
    if (/metzger-order|metzger-artikel/.test(route.request().url())) return route.fallback();
    return route.fulfill(j({ success: true }));
  });
}

/**
 * Kiosk mit fest gestellter Uhr öffnen und den Metzger-Reiter zeigen.
 * `zeit` ist die Ortszeit, aus der sich „heute" und „morgen" ergeben.
 */
async function oeffne(page, zeit, opts = {}) {
  await page.clock.setFixedTime(new Date(zeit));
  await mockApi(page, Object.assign({ heute: zeit.slice(0, 10) }, opts));
  await page.goto(KIOSK_URL);
  await page.waitForTimeout(2200);
  await page.evaluate(() => window.K.switchTab('metzgerbest'));
  await page.waitForTimeout(1500);
}

const reiter = (page) => page.locator('.k-tab[data-tab="metzgerbest"]');
const abzeichen = (page) => page.locator('#badges-metzgerbest .k-badge');

test.describe('Metzger – Erinnerung ab Bestellschluss (F13)', () => {

  test('TC-ME-01: Ein Entwurf von HEUTE lässt den Reiter ruhig',
    async ({ page }) => {
      /* Der gemeldete Fall: Donnerstag 12:54, Liefertag ist heute, ein
         Entwurf liegt herum. Für heute lässt sich nichts mehr bestellen —
         also gibt es auch nichts zu erinnern. Morgen (Fr) ist kein
         Liefertag. */
      await oeffne(page, DONNERSTAG + 'T12:54:00', {
        zustaende: { [DONNERSTAG]: 0 },      // 0 = Entwurf
      });
      await expect(reiter(page), 'blinkt trotz unmöglicher Bestellung')
        .not.toHaveClass(/mb-blink/);
      await expect(abzeichen(page)).toHaveCount(0);
    });

  test('TC-ME-02: Ist morgen Liefertag und nichts raus, wird erinnert',
    async ({ page }) => {
      // Mittwoch 12:30 – morgen (Do) wird geliefert, heute ist der letzte Tag.
      await oeffne(page, MITTWOCH + 'T12:30:00', { zustaende: {} });
      await expect(reiter(page), 'keine Erinnerung, obwohl morgen fällig')
        .toHaveClass(/mb-blink/);
      await expect(abzeichen(page)).toHaveCount(1);
    });

  test('TC-ME-03: Vor Bestellschluss bleibt es ruhig', async ({ page }) => {
    await oeffne(page, MITTWOCH + 'T10:00:00', { zustaende: {} });
    await expect(reiter(page)).not.toHaveClass(/mb-blink/);
    await expect(abzeichen(page)).toHaveCount(0);
  });

  test('TC-ME-04: Ist morgen schon gesendet, wird nicht erinnert',
    async ({ page }) => {
      await oeffne(page, MITTWOCH + 'T12:30:00', {
        zustaende: { [DONNERSTAG]: 1 },      // 1 = gesendet
      });
      await expect(reiter(page)).not.toHaveClass(/mb-blink/);
      await expect(abzeichen(page)).toHaveCount(0);
    });

  test('TC-ME-05: Ein Entwurf für morgen reicht nicht', async ({ page }) => {
    // Erst die Mail beendet die Erinnerung, nicht der Entwurf (F13).
    await oeffne(page, MITTWOCH + 'T12:30:00', {
      zustaende: { [DONNERSTAG]: 0 },
    });
    await expect(reiter(page), 'Entwurf zählt fälschlich als erledigt')
      .toHaveClass(/mb-blink/);
  });

  test('TC-ME-06: Eine Korrektur beendet die Erinnerung ebenfalls',
    async ({ page }) => {
      await oeffne(page, MITTWOCH + 'T12:30:00', {
        zustaende: { [DONNERSTAG]: 2 },      // 2 = korrigiert
      });
      await expect(reiter(page)).not.toHaveClass(/mb-blink/);
    });

  test('TC-ME-07: Ist morgen kein Liefertag, wird nicht erinnert',
    async ({ page }) => {
      // Donnerstag 12:54 – morgen ist Freitag, da wird nicht geliefert.
      await oeffne(page, DONNERSTAG + 'T12:54:00', { zustaende: {} });
      await expect(reiter(page)).not.toHaveClass(/mb-blink/);
    });

  test('TC-ME-08: Im Testbetrieb blinkt nichts', async ({ page }) => {
    /* Solange die Empfängeradresse die Testadresse ist, wäre ein blinkender
       Reiter eine Aufforderung zu einer Bestellung, die niemanden erreicht. */
    await oeffne(page, MITTWOCH + 'T12:30:00', {
      zustaende: {}, testbetrieb: true,
    });
    await expect(reiter(page)).not.toHaveClass(/mb-blink/);
    await expect(abzeichen(page)).toHaveCount(0);
  });
});
