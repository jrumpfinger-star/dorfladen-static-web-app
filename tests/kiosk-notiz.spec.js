/**
 * Kiosk – Hinweis zur Bestellung (Playwright E2E)
 *
 * Deckt die Test Cases aus specs/bestell-freitext/spec.md ab:
 *   F1  Freitext erfassen
 *   F2  Einfügen ohne fremde Gestaltung (TC-F2-06)
 *   F5  Der Freitext gehört zur Bestellung
 *   F6  Bedienbarkeit über drei Bildschirmgrößen
 *
 * Alle API-Aufrufe sind gemockt. Wichtig: Der Kiosk ist eine PWA – ohne
 * `serviceWorkers: 'block'` beantwortet der Service Worker die Aufrufe aus
 * seinem Cache und die Mocks greifen nicht.
 *
 * Ausführen:
 *   npx playwright test tests/kiosk-notiz.spec.js
 */

const { test, expect } = require('@playwright/test');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

const TAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const BESTELLTAGE = [1, 4];

function iso(d) {
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)
    + '-' + ('0' + d.getDate()).slice(-2);
}

function plusTage(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function naechsterTag() {
  for (let i = 1; i < 14; i++) {
    const d = plusTage(i);
    if (BESTELLTAGE.includes(d.getDay())) return iso(d);
  }
  return iso(plusTage(1));
}

function tagesleiste() {
  const out = [];
  const heute = iso(new Date());
  for (let i = 0; i < 14; i++) {
    const d = plusTage(i);
    const datum = iso(d);
    const ist = BESTELLTAGE.includes(d.getDay());
    out.push({
      datum, wochentag: TAGE[d.getDay()], bestelltag: ist,
      bestellbar: ist && datum > heute, status: null,
    });
  }
  return out;
}

const CONFIG = {
  name: 'Metzgerei Mair', empfaenger: 'test@example.org',
  empfaenger_name: 'Test', metzger_mail: '',
  bestelltage: [0, 3], bestellschluss: '12:00', kd_nr: '1041',
};

const ARTIKEL = [
  { name: 'Putenschnitzel', nummer: 360, preis: 17.5, einheit: 'kg',
    gruppe: 'Fleisch frisch', aktiv: true, auf_formular: true },
  { name: 'Weißwurst', nummer: 600, preis: 8.7, einheit: 'kg',
    gruppe: 'Würste frisch', aktiv: true, auf_formular: true },
];

function positionen() {
  return [{
    nummer: 360, name: 'Putenschnitzel',
    portionen: [{ anzahl: 2, menge: 4, einheit: 'St', vakuum: false }],
    hinweis: '', zusatz: false,
  }];
}

/**
 * Der Mock hält die Bestellung im Speicher: Was gespeichert wird, kommt beim
 * nächsten Laden zurück. Nur so lässt sich prüfen, dass der Hinweis das
 * Neuladen übersteht (TC-F5-01).
 */
async function mockApi(page, opts = {}) {
  const datum = opts.datum || naechsterTag();
  const zustand = {
    status: opts.status || 0,
    notiz: opts.notiz === undefined ? null : opts.notiz,
    gesendet: [],
  };

  await page.route('**/api/metzger-order**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (method === 'POST') {
      let rumpf = {};
      try { rumpf = JSON.parse(route.request().postData() || '{}'); } catch (e) { /* egal */ }
      const versand = /\/(senden|korrektur)$/.test(url);
      if ('notiz' in rumpf) zustand.notiz = rumpf.notiz;
      if (versand) { zustand.status = 1; zustand.gesendet.push(rumpf); }
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          success: true, status: zustand.status, empfaenger: CONFIG.empfaenger,
          testbetrieb: true, protokoll: [], summen: {},
        }),
      });
      return;
    }
    if (/mode=verlauf/.test(url)) {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, verlauf: [] }),
      });
      return;
    }
    if (/metzger-order\/\d{4}-\d{2}-\d{2}/.test(url)) {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          bestellung: {
            datum, status: zustand.status, positionen: positionen(),
            notiz: zustand.notiz, protokoll: [],
          },
          artikel: ARTIKEL, vorschlaege: {}, vorbelegt_aus: null, letzte: null,
          bestelltag: true, bestellbar: true,
          config: CONFIG, testbetrieb: true, summen: {},
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        success: true, tage: tagesleiste(), aktiv: datum,
        config: CONFIG, testbetrieb: true,
      }),
    });
  });

  await page.route('**/api/metzger-artikel**', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ success: true, artikel: ARTIKEL }),
  }));

  await page.route('**/api/**', (route) => {
    if (/metzger-order|metzger-artikel/.test(route.request().url())) return route.fallback();
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  return zustand;
}

async function oeffneTab(page, opts) {
  const zustand = await mockApi(page, opts);
  await page.goto(KIOSK_URL);
  await page.locator('.k-tab[data-tab="metzgerbest"]').click();
  await page.locator('#metzgerbest-body .mb-row').first().waitFor({ timeout: 15000 });
  return zustand;
}

function knopf(page) {
  return page.locator('#panel-metzgerbest .kn-knopf').first();
}

async function schreibe(page, text) {
  const feld = page.locator('.kn-feld');
  await feld.click();
  await feld.evaluate((el) => { el.innerHTML = ''; });
  await page.keyboard.type(text);
}

test.describe('Hinweis zur Bestellung', () => {

  test('TC-F1-01: Der Knopf steht in der Bestellansicht', async ({ page }) => {
    await oeffneTab(page);
    await expect(knopf(page)).toBeVisible();
    await expect(knopf(page)).toContainText('Hinweis hinzufügen');
  });

  test('TC-F1-02: Text erfassen und übernehmen', async ({ page }) => {
    await oeffneTab(page);
    await knopf(page).click();
    await expect(page.locator('.kn-bg')).toBeVisible();
    await schreibe(page, 'Bitte erst ab 7 Uhr liefern');
    await page.locator('.kn-ok').click();
    await expect(page.locator('.kn-bg')).toHaveCount(0);
    await expect(knopf(page)).toContainText('Hinweis ändern');
    await expect(knopf(page)).toContainText('Bitte erst ab 7 Uhr liefern');
  });

  test('TC-F1-03: Abbrechen verwirft die Änderung', async ({ page }) => {
    await oeffneTab(page, { notiz: { html: '<p>Erst ab 7 Uhr</p>', text: 'Erst ab 7 Uhr' } });
    await expect(knopf(page)).toContainText('Erst ab 7 Uhr');
    await knopf(page).click();
    await schreibe(page, 'Ganz anders');
    await page.locator('.kn-abbruch').last().click();
    await expect(page.locator('.kn-bg')).toHaveCount(0);
    await expect(knopf(page)).toContainText('Erst ab 7 Uhr');
  });

  test('TC-F1-04: Gesendete Bestellung ist nur lesbar', async ({ page }) => {
    await oeffneTab(page, {
      status: 1,
      notiz: { html: '<p>Erst ab 7 Uhr</p>', text: 'Erst ab 7 Uhr' },
    });
    await knopf(page).click();
    await expect(page.locator('.kn-feld')).toContainText('Erst ab 7 Uhr');
    await expect(page.locator('.kn-leiste')).toHaveCount(0);
    await expect(page.locator('.kn-ok')).toHaveCount(0);
    await expect(page.locator('.kn-feld')).toHaveAttribute('contenteditable', 'false');
  });

  test('TC-F1-05: Leerer Text entfernt den Hinweis', async ({ page }) => {
    await oeffneTab(page, { notiz: { html: '<p>Erst ab 7 Uhr</p>', text: 'Erst ab 7 Uhr' } });
    await knopf(page).click();
    await page.locator('.kn-feld').evaluate((el) => { el.innerHTML = ''; });
    await page.locator('.kn-ok').click();
    await expect(knopf(page)).toContainText('Hinweis hinzufügen');
  });

  test('TC-F2-06: Einfügen bringt keine fremde Gestaltung mit', async ({ page }) => {
    await oeffneTab(page);
    await knopf(page).click();
    const feld = page.locator('.kn-feld');
    await feld.click();
    // Einfügen mit Gestaltung nachstellen – der Kiosk nimmt nur den Text.
    await feld.evaluate((el) => {
      const dt = new DataTransfer();
      dt.setData('text/plain', 'Bitte fruehe Lieferung');
      dt.setData('text/html', '<a href="http://x.de" style="color:red">Bitte fruehe Lieferung</a>');
      el.dispatchEvent(new ClipboardEvent('paste', {
        clipboardData: dt, bubbles: true, cancelable: true,
      }));
    });
    await expect(feld).toContainText('Bitte fruehe Lieferung');
    const html = await feld.innerHTML();
    expect(html).not.toContain('<a');
    expect(html).not.toContain('color:red');
  });

  test('TC-F5-01: Der Hinweis übersteht das Neuladen', async ({ page }) => {
    await oeffneTab(page);
    await knopf(page).click();
    await schreibe(page, 'Bitte erst ab 7 Uhr liefern');
    await page.locator('.kn-ok').click();
    // Die stille Sicherung braucht ihre Ruhezeit.
    await page.waitForTimeout(2500);
    await page.reload();
    await page.locator('.k-tab[data-tab="metzgerbest"]').click();
    await page.locator('#metzgerbest-body .mb-row').first().waitFor({ timeout: 15000 });
    await expect(knopf(page)).toContainText('Bitte erst ab 7 Uhr liefern');
  });

  test('TC-F5-02: Der Hinweis geht mit der Bestellung hinaus', async ({ page }) => {
    const zustand = await oeffneTab(page);
    await knopf(page).click();
    await schreibe(page, 'Bitte erst ab 7 Uhr liefern');
    await page.locator('.kn-ok').click();
    await page.waitForTimeout(300);

    await page.locator('#panel-metzgerbest .mb-send').click();
    // Versanddialog bestätigen – der Knopf trägt dieselbe Beschriftung.
    await page.locator('.mb-dlg .mb-send, .k-modal-footer .k-btn-confirm')
      .last().click();
    await expect.poll(() => zustand.gesendet.length, { timeout: 10000 })
      .toBeGreaterThan(0);

    const rumpf = zustand.gesendet[zustand.gesendet.length - 1];
    expect(rumpf.notiz).toBeTruthy();
    expect(rumpf.notiz.text).toContain('Bitte erst ab 7 Uhr liefern');
  });

  test('TC-F6-01/02: Dialog passt und Bedienelemente sind groß genug', async ({ page }) => {
    await oeffneTab(page);
    await knopf(page).click();
    await expect(page.locator('.kn-bg')).toBeVisible();
    const mass = await page.evaluate(() => {
      const de = document.documentElement;
      const modal = document.querySelector('.kn-modal').getBoundingClientRect();
      const klein = [...document.querySelectorAll('.kn-modal button')]
        .map((e) => e.getBoundingClientRect())
        .filter((r) => r.height && r.height < 43)
        .length;
      return {
        quer: de.scrollWidth > de.clientWidth + 1,
        passt: modal.height <= window.innerHeight + 1
          && modal.top >= -1 && modal.bottom <= window.innerHeight + 1,
        klein,
      };
    });
    expect(mass.quer).toBe(false);
    expect(mass.passt).toBe(true);
    expect(mass.klein).toBe(0);
  });

  test('TC-F6-03: Der Rest-Vorrat wird angezeigt und begrenzt', async ({ page }) => {
    await oeffneTab(page);
    await knopf(page).click();
    await expect(page.locator('.kn-zaehler')).toContainText('Noch 1000 Zeichen frei');
    await page.locator('.kn-feld').evaluate((el) => {
      el.textContent = 'x'.repeat(1000);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('.kn-zaehler')).toContainText('Noch 0 Zeichen frei');
    // Über die Grenze hinaus nimmt das Feld nichts mehr an.
    await page.locator('.kn-feld').click();
    await page.keyboard.type('yyy');
    const laenge = await page.locator('.kn-feld').evaluate((el) => el.innerText.trim().length);
    expect(laenge).toBe(1000);
  });
});
