/**
 * Kiosk – Metzger-Bestellung (Playwright E2E)
 *
 * Deckt die Test Cases aus specs/metzger-bestellung/spec.md ab:
 *   F1  Bestelltag wählen
 *   F3  Portionen als Badges erfassen
 *   F4  Vorschläge als Mehrfachauswahl
 *   F5  Kurzeingabe in Papier-Schreibweise
 *   F6  Vakuum als Ja/Nein
 *   F10 Suchen und Filtern
 *   F11 Versanddialog mit Testbetrieb
 *   F17 Responsive über drei Viewports
 *
 * Alle API-Aufrufe werden gemockt. Wichtig: Der Kiosk ist eine PWA – ohne
 * `serviceWorkers: 'block'` beantwortet der Service Worker die Aufrufe aus
 * seinem Cache und die Mocks greifen nicht.
 *
 * Ausführen:
 *   npx playwright test tests/kiosk-metzger-bestellung.spec.js
 */

const { test, expect } = require('@playwright/test');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

const TAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const BESTELLTAGE = [1, 4];          // Montag und Donnerstag (JS: So = 0)

function iso(d) {
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)
    + '-' + ('0' + d.getDate()).slice(-2);
}

function plusTage(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

/** Nächster Bestelltag ab morgen – heute ist die Ware längst da. */
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
      datum,
      wochentag: TAGE[d.getDay()],
      bestelltag: ist,
      // Bestellt wird spätestens am Vortag – heute ist die Ware längst da.
      bestellbar: ist && datum > heute,
      status: null,
    });
  }
  return out;
}

/** Werte der zuletzt gesendeten Bestellung – Anhalt beim Neuerfassen (F7). */
const LETZTE = {
  datum: '2026-08-27',
  wochentag: 'Donnerstag',
  positionen: {
    600: [{ anzahl: 1, menge: 30, einheit: 'St', vakuum: false }],
    360: [{ anzahl: 2, menge: 4, einheit: 'St', vakuum: true }],
  },
};

const CONFIG = {
  name: 'Metzgerei Mair',
  empfaenger: 'jrumpfinger@t-online.de',
  empfaenger_name: 'Test (Metzger-Bestellung)',
  metzger_mail: '',
  bestelltage: [0, 3],
  bestellschluss: '12:00',
  kd_nr: '1041',
};

const ARTIKEL = [
  { name: 'Lende Schwein', nummer: 2, preis: 11.05, einheit: 'kg',
    gruppe: 'Fleisch frisch', aktiv: true, auf_formular: true },
  { name: 'Oberschalenschnitzel', nummer: null, preis: null, einheit: 'kg',
    gruppe: 'Fleisch frisch', aktiv: true, auf_formular: true },
  { name: 'Putenschnitzel', nummer: 360, preis: 17.50, einheit: 'kg',
    gruppe: 'Fleisch frisch', aktiv: true, auf_formular: true },
  { name: 'Hackfleisch gemischt', nummer: 142, preis: 10.30, einheit: 'kg',
    gruppe: 'Fleisch frisch', aktiv: true, auf_formular: true },
  { name: 'Weißwurst', nummer: 600, preis: 8.70, einheit: 'kg',
    gruppe: 'Würste frisch', aktiv: true, auf_formular: true },
  { name: 'Griebenschmalz', nummer: 431, preis: 11.75, einheit: 'kg',
    gruppe: 'Nicht auf dem Formular', aktiv: false, auf_formular: false },
];

const VORSCHLAEGE = {
  360: [
    { portionen: [{ anzahl: 2, menge: 4, einheit: 'St', vakuum: true }],
      punkte: 1.0, belege: 1, quelle: 'bestellung', zuletzt: '2026-08-24' },
    { portionen: [{ anzahl: 1, menge: 1.5, einheit: 'kg', vakuum: false }],
      punkte: 2.8, belege: 7, quelle: 'lieferung', zuletzt: '2026-08-27' },
    { portionen: [{ anzahl: 1, menge: 0.75, einheit: 'kg', vakuum: false }],
      punkte: 2.4, belege: 7, quelle: 'lieferung', zuletzt: '2026-08-20' },
  ],
};

/** Positionen der vorbelegten Bestellung. */
function positionen() {
  return [
    { nummer: 360, name: 'Putenschnitzel',
      portionen: [{ anzahl: 2, menge: 4, einheit: 'St', vakuum: true }],
      hinweis: '', zusatz: false },
    { nummer: 142, name: 'Hackfleisch gemischt',
      portionen: [{ anzahl: 2, menge: 500, einheit: 'g', vakuum: true },
                  { anzahl: 6, menge: 250, einheit: 'g', vakuum: true }],
      hinweis: '', zusatz: false },
  ];
}

async function mockApi(page, opts = {}) {
  const datum = opts.datum || naechsterTag();
  const status = opts.status || 0;

  await page.route('**/api/metzger-order**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (method === 'POST') {
      const gesendet = /\/(senden|korrektur)$/.test(url);
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          success: true, status: gesendet ? 1 : 0,
          empfaenger: CONFIG.empfaenger, testbetrieb: true,
          protokoll: [], summen: {},
        }),
      });
      return;
    }
    if (/mode=verlauf/.test(url)) {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, verlauf: opts.verlauf || [] }),
      });
      return;
    }
    if (/metzger-order\/\d{4}-\d{2}-\d{2}/.test(url)) {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          bestellung: {
            datum, status,
            positionen: opts.leer ? [] : positionen(),
            protokoll: [],
          },
          artikel: ARTIKEL, vorschlaege: VORSCHLAEGE,
          vorbelegt_aus: opts.leer ? null : '2026-08-24',
          letzte: LETZTE,
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

  // Übrige Kiosk-Aufrufe still beantworten, damit nichts blockiert.
  await page.route('**/api/**', (route) => {
    if (/metzger-order|metzger-artikel/.test(route.request().url())) return route.fallback();
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
}

async function oeffneTab(page, opts) {
  await mockApi(page, opts);
  await page.goto(KIOSK_URL);
  await page.locator('.k-tab[data-tab="metzgerbest"]').click();
  await page.locator('#metzgerbest-body .mb-row').first().waitFor({ timeout: 15000 });
}

function zeile(page, name) {
  return page.locator('.mb-row').filter({ hasText: name }).first();
}

/**
 * Der umgebaute Reiter (Spec kiosk-bestellreiter-mobil) legt Termin-Details,
 * Filter, Sprungmarken und den Bereichswechsel ins Blatt hinter dem „i".
 * Dieser Helfer öffnet es.
 */
async function oeffneBlatt(page) {
  await page.locator('#panel-metzgerbest .mb-mehr').click();
  await page.locator('#mb-blatt').waitFor({ state: 'visible', timeout: 5000 });
}

/**
 * Der umgebaute Kiosk legt vor nicht zurueckholbaren Schritten ein Blatt
 * mit einer Rueckfrage vor (specs/kiosk-umbau, TC-F5-05). Der gewohnte
 * Kiosk kennt sie nicht. Damit dieselbe Datei gegen beide laeuft, wird sie
 * bestaetigt, wenn sie erscheint - und sonst nichts getan.
 */
async function bestaetigenFallsGefragt(page) {
  const ja = page.locator('.kneu-frage-ja');
  if (await ja.count()) await ja.click();
}

test.describe('Metzger-Bestellung im Kiosk', () => {

  test('TC-F1-01: Tab, Tagesleiste und nur Mo/Do wählbar', async ({ page }) => {
    await oeffneTab(page);
    await expect(page.locator('.k-tab[data-tab="metzgerbest"]')).toContainText('Metzger Mair');
    const tage = page.locator('.mb-day');
    expect(await tage.count()).toBe(14);
    // Genau die Bestelltage sind bedienbar.
    const aktiv = await page.locator('.mb-day:not([disabled])').count();
    expect(aktiv).toBeGreaterThan(0);
    expect(await page.locator('.mb-day.off').count()).toBeGreaterThan(0);
  });

  test('TC-F3-01/02: Nummer als eigene Spalte, Badges zeigen Portionen', async ({ page }) => {
    await oeffneTab(page);
    const r = zeile(page, 'Putenschnitzel');
    await expect(r.locator('.mb-nr')).toHaveText('360');
    await expect(r.locator('.mb-chip .lab').first()).toContainText('2 × 4 St');
    await expect(r.locator('.mb-chip .vak').first()).toHaveText('vak');
    // Artikel ohne Nummer zeigt einen Strich.
    await expect(zeile(page, 'Oberschalenschnitzel').locator('.mb-nr')).toHaveText('–');
  });

  test('TC-F3-05: Portion direkt in der Zeile entfernen', async ({ page }) => {
    await oeffneTab(page);
    const r = zeile(page, 'Hackfleisch gemischt');
    expect(await r.locator('.mb-chip').count()).toBe(2);
    await r.locator('.mb-chip .x').first().click();
    await expect(zeile(page, 'Hackfleisch gemischt').locator('.mb-chip')).toHaveCount(1);
    // Der Editor darf sich dabei nicht öffnen.
    await expect(page.locator('.mb-ed')).toHaveCount(0);
  });

  test('TC-F3-10/11: Kachel legt sofort an, Einheiten sind Knöpfe', async ({ page }) => {
    await oeffneTab(page);
    await zeile(page, 'Weißwurst').locator('.mb-add').click();
    await expect(page.locator('.mb-ed')).toBeVisible();
    // Keine Auswahlliste – auf dem Tablet muss ein Tipp genügen.
    expect(await page.locator('.mb-ed select').count()).toBe(0);
    await page.locator('.mb-kach button', { hasText: '½' }).first().click();
    await page.locator('.mb-kach button', { hasText: /^1$/ }).first().click();
    await expect(zeile(page, 'Weißwurst').locator('.mb-chip')).toHaveCount(2);
  });

  test('TC-F3-12/F6-06: Größe ist Portionsgröße, unabhängig vom Vakuum', async ({ page }) => {
    await oeffneTab(page);
    await zeile(page, 'Weißwurst').locator('.mb-add').click();
    await page.locator('.mb-einh button', { hasText: 'Größe' }).click();
    await page.locator('.mb-kach button', { hasText: 'klein' }).click();
    await expect(zeile(page, 'Weißwurst').locator('.mb-chip .lab').first())
      .toContainText('1 × klein');
    // Der Vakuumschalter bleibt davon unberührt.
    await expect(page.locator('.mb-vak.on')).toHaveCount(0);
  });

  test('TC-F6-01/02: Vakuum ist Ja/Nein ohne Beutelgröße', async ({ page }) => {
    await oeffneTab(page);
    await zeile(page, 'Weißwurst').locator('.mb-add').click();
    await expect(page.locator('.mb-vak')).toHaveCount(1);
    await page.locator('.mb-vak').click();
    await expect(page.locator('.mb-vak.on')).toHaveCount(1);
    await page.locator('.mb-kach button', { hasText: '½' }).first().click();
    await expect(zeile(page, 'Weißwurst').locator('.mb-chip .vak')).toHaveCount(1);
  });

  test('TC-F4-04/05: Vorschläge sind eine Mehrfachauswahl', async ({ page }) => {
    await oeffneTab(page);
    const r = zeile(page, 'Putenschnitzel');
    await r.locator('.mb-add').click();
    const vor = page.locator('.mb-sugg button');
    expect(await vor.count()).toBe(3);
    // Der erste Vorschlag steckt schon in der Zeile und ist markiert.
    await expect(page.locator('.mb-sugg button.on')).toHaveCount(1);
    await vor.nth(1).click();
    await expect(page.locator('.mb-sugg button.on')).toHaveCount(2);
    await expect(zeile(page, 'Putenschnitzel').locator('.mb-chip')).toHaveCount(2);
    // Nochmal tippen wählt wieder ab.
    await page.locator('.mb-sugg button').nth(1).click();
    await expect(zeile(page, 'Putenschnitzel').locator('.mb-chip')).toHaveCount(1);
  });

  test('TC-F4-02: Bestellungen ranken vor Lieferungen', async ({ page }) => {
    await oeffneTab(page);
    await zeile(page, 'Putenschnitzel').locator('.mb-add').click();
    await expect(page.locator('.mb-sugg button').first()).toHaveClass(/bestellung/);
  });

  test('TC-F5-01/07/11: Kurzeingabe löst auf, Rest wird zum Hinweis', async ({ page }) => {
    await oeffneTab(page);
    await zeile(page, 'Weißwurst').locator('.mb-add').click();
    const feld = page.locator('#mb-pf');

    await feld.fill('2x500g V + 6x250g');
    await expect(page.locator('#mb-prev')).toContainText('2 × 500 g (vak)');
    await page.locator('.mb-take').click();
    await expect(zeile(page, 'Weißwurst').locator('.mb-chip')).toHaveCount(2);

    // Sternchen trennt, der Rohtext darf nicht als Hinweis übrig bleiben.
    await zeile(page, 'Weißwurst').locator('.mb-chip .lab').first().click();
    await page.locator('#mb-pf').fill('*100gr *456kg');
    await expect(page.locator('#mb-prev')).toContainText('1 × 100 g');
    await page.locator('.mb-take').click();
    const chips = zeile(page, 'Weißwurst').locator('.mb-chip');
    await expect(chips).toHaveCount(2);
    await expect(zeile(page, 'Weißwurst').locator('.mb-chip.hw')).toHaveCount(0);
  });

  test('TC-F5-08: Unlesbares landet sichtbar im Hinweis-Badge', async ({ page }) => {
    await oeffneTab(page);
    await zeile(page, 'Weißwurst').locator('.mb-add').click();
    await page.locator('#mb-pf').fill('wie letzte Woche');
    await page.locator('.mb-take').click();
    const r = zeile(page, 'Weißwurst');
    await expect(r.locator('.mb-chip.hw')).toHaveCount(1);
    await expect(r.locator('.mb-chip.hw .lab')).toContainText('wie letzte Woche');
    await expect(r).toHaveClass(/pruef/);
  });

  test('TC-F10-01/02: Suche filtert sofort', async ({ page }) => {
    await oeffneTab(page);
    await page.locator('#mb-q').fill('puten');
    await expect(page.locator('.mb-row')).toHaveCount(1);
    await page.locator('#mb-q').fill('360');
    await expect(page.locator('.mb-row')).toHaveCount(1);
    await page.locator('#mb-q').fill('');
  });

  test('TC-F10-06: „Übliche Artikel" ist die Vorgabe', async ({ page }) => {
    await oeffneTab(page);
    // Vorgabe ist die kurze Liste – nur was der Metzger schon geliefert hat.
    // Der Umfang-Umschalter steht jetzt am Listenende (Spec kiosk-bestellreiter-mobil).
    await expect(page.locator('#panel-metzgerbest .k-filterzeile button.on')).toContainText('Übliche');
    const ueblich = await page.locator('.mb-row').count();
    const aktive = ARTIKEL.filter((a) => a.aktiv !== false).length;
    expect(ueblich).toBe(aktive);
    // „Alle Artikel" zeigt zusätzlich die ausgeblendeten.
    await page.locator('#panel-metzgerbest .k-filterzeile button', { hasText: 'Alle' }).click();
    await expect(page.locator('.mb-row')).toHaveCount(ARTIKEL.length);
  });

  test('TC-F1-05: Heute ist nicht bestellbar, Vorauswahl liegt in der Zukunft',
    async ({ page }) => {
      await oeffneTab(page);
      const heute = iso(new Date());
      // Bestellt wird spätestens am Vortag – heute ist die Ware längst da.
      const heutePille = page.locator('.mb-day').first();
      await expect(heutePille).toBeDisabled();
      const aktiv = await page.locator('.mb-day.on').getAttribute('onclick');
      expect(aktiv).not.toContain(heute);
    });

  test('TC-F13-05: Im Testbetrieb blinkt der Reiter nicht', async ({ page }) => {
    await oeffneTab(page);
    await expect(page.locator('.k-tab[data-tab="metzgerbest"]')).not.toHaveClass(/mb-blink/);
    await expect(page.locator('#badges-metzgerbest .k-badge')).toHaveCount(0);
  });

  test('TC-F7-06: Werte der letzten Bestellung stehen als Anhalt daneben',
    async ({ page }) => {
      await oeffneTab(page, { leer: true });
      const r = zeile(page, 'Weißwurst');
      const anhalt = r.locator('.mb-frueher');
      await expect(anhalt).toHaveCount(1);
      await expect(anhalt).toContainText('1 × 30 St');
      // Ein Tipp übernimmt ihn.
      await anhalt.click();
      await expect(zeile(page, 'Weißwurst').locator('.mb-chip')).toHaveCount(1);
      await expect(zeile(page, 'Weißwurst').locator('.mb-frueher')).toHaveCount(0);
    });

  test('TC-F11-05/06: Versanddialog zeigt Empfänger und Testbetrieb', async ({ page }) => {
    await oeffneTab(page);
    await page.locator('.mb-send', { hasText: 'Bestellung senden' }).click();
    const dlg = page.locator('.mb-dlg');
    await expect(dlg).toBeVisible();
    await expect(dlg).toContainText('jrumpfinger@t-online.de');
    await expect(dlg.locator('.mb-test')).toContainText('Testbetrieb');
    await expect(dlg).toContainText('Putenschnitzel');
    await expect(dlg).toContainText('Bestellung-Metzger-Mair.pdf');
  });

  test('TC-F12-01: Nach dem Versand ist alles gesperrt', async ({ page }) => {
    await oeffneTab(page, { status: 1 });
    // Die Zustandszeile ersetzt die frühere Statuskarte.
    await expect(page.locator('#panel-metzgerbest .mb-kontext')).toContainText('Gesendet');
    await expect(page.locator('.mb-add')).toHaveCount(0);
    // Der Knopf eröffnet die Korrektur, er sendet noch nichts.
    await expect(page.locator('.mb-btn', { hasText: 'Korrigieren' })).toBeVisible();
  });

  test('TC-F17-01/06: Kein Überlauf, Bedienelemente groß genug', async ({ page }) => {
    await oeffneTab(page);
    await zeile(page, 'Putenschnitzel').locator('.mb-add').click();
    const mass = await page.evaluate(() => {
      const de = document.documentElement;
      const inScroller = (el) => {
        let p = el.parentElement;
        while (p) {
          const ox = getComputedStyle(p).overflowX;
          if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true;
          p = p.parentElement;
        }
        return false;
      };
      const raus = [];
      document.querySelectorAll('#panel-metzgerbest *').forEach((el) => {
        const b = el.getBoundingClientRect();
        if (b.width && b.right > de.clientWidth + 1 && !inScroller(el)) {
          raus.push(el.className);
        }
      });
      const klein = [];
      document.querySelectorAll('#panel-metzgerbest button, #panel-metzgerbest input')
        .forEach((el) => {
          const b = el.getBoundingClientRect();
          if (b.height && (b.height < 33 || b.width < 28)) klein.push(el.className);
        });
      return { raus: [...new Set(raus)], klein: [...new Set(klein)] };
    });
    expect(mass.raus).toEqual([]);
    expect(mass.klein).toEqual([]);
  });

  test('TC-F17-04: Die Mengenreihe liegt nicht hinter der Fußzeile', async ({ page }) => {
    // Früher wurde hier der Knopf „+ Hinzufügen" geprüft. Den gibt es nicht
    // mehr — eine Kachel legt sofort an (Spec kiosk-erfassung-filter, F4).
    // Geprüft wird jetzt die Reihe, die an seine Stelle getreten ist.
    await oeffneTab(page);
    await zeile(page, 'Putenschnitzel').locator('.mb-add').first().click();
    await page.waitForTimeout(900);
    const m = await page.evaluate(() => {
      const box = document.getElementById('panel-metzgerbest');
      const mengen = box.querySelector('.mb-mengen');
      const liste = box.querySelector('.k-liste');
      const fuss = document.getElementById('mb-foot');
      const r = (liste || box).getBoundingClientRect();
      return {
        unterkante: mengen ? mengen.getBoundingClientRect().bottom : null,
        oberkante: mengen ? mengen.getBoundingClientRect().top : null,
        unten: fuss ? fuss.getBoundingClientRect().top : r.bottom,
        oben: r.top,
      };
    });
    expect(m.unterkante, 'Keine Mengenreihe gefunden').not.toBeNull();
    expect(m.unterkante).toBeLessThanOrEqual(m.unten + 1);
    expect(m.oberkante).toBeGreaterThanOrEqual(m.oben - 1);
  });

  test('TC-F17-07: Keine nativen Dialoge', async ({ page }) => {
    await oeffneTab(page);
    let nativ = false;
    page.on('dialog', async (d) => { nativ = true; await d.dismiss(); });
    await page.locator('.mb-send', { hasText: 'Bestellung senden' }).click();
    await page.locator('.mb-dlg .mb-send').click();
    await page.waitForTimeout(600);
    expect(nativ).toBe(false);
  });

  test('TC-F14-04: Leerer Verlauf erklärt sich', async ({ page }) => {
    await oeffneTab(page);
    // Der Bereichswechsel steht jetzt im Blatt hinter dem „i".
    await oeffneBlatt(page);
    await page.locator('#mb-blatt .mb-sub', { hasText: 'Verlauf' }).click();
    await expect(page.locator('#metzgerbest-body')).toContainText('Noch keine gesendete Bestellung');
  });

  test('TC-F9-01: Artikelverwaltung listet den Katalog', async ({ page }) => {
    await oeffneTab(page);
    await oeffneBlatt(page);
    await page.locator('#mb-blatt .mb-sub', { hasText: 'Artikel' }).click();
    await expect(page.locator('.mb-arow')).toHaveCount(ARTIKEL.length);
    // Ausgeblendete Artikel bleiben sichtbar, nur gedimmt.
    await expect(page.locator('.mb-arow.aus')).toHaveCount(1);
  });

  test('TC-F18-03: Der Kunden-Tab „Metzger" bleibt unberührt', async ({ page }) => {
    await oeffneTab(page);
    await expect(page.locator('.k-tab[data-tab="metzger"]')).toHaveCount(1);
    await expect(page.locator('.k-tab[data-tab="metzgerbest"]')).toHaveCount(1);
  });
});


// ── F30: Liefertag klar benennen, Eingaben still sichern ────────────────
//
// Dieselben zwei Meldungen wie beim Bäcker – der Metzger-Tab hatte sie auch:
//  1. Unklar, wofür die Tagesplättchen stehen. Es sind LIEFERtage.
//  2. Ein Neuladen warf alle Eingaben weg. Der Merker `_dirty` war zwar da,
//     aber nichts sicherte automatisch.

test.describe('Metzger-Bestellung – Liefertag und stille Sicherung (F30)', () => {

  test('TC-M-F30-01: Tagesleiste ist als Liefertag beschriftet', async ({ page }) => {
    await oeffneTab(page);
    await expect(page.locator('#panel-metzgerbest .mb-days-lbl')).toContainText('Liefertag wählen');
  });

  test('TC-M-F30-02: Der Liefertag wird benannt', async ({ page }) => {
    await oeffneTab(page);
    // Die frühere Statuskarte ist einer Zustandszeile gewichen; der Liefertag
    // steht in der gewählten Tageskachel und ausführlich im Blatt hinter dem
    // „i" (Spec kiosk-bestellreiter-mobil, F3).
    await expect(page.locator('#panel-metzgerbest .mb-day.on')).toBeVisible();
    await oeffneBlatt(page);
    const sub = page.locator('#mb-blatt .mb-blatt-sub');
    await expect(sub).toContainText(/Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag/);
    await expect(sub).toContainText('Mair');
  });

  test('TC-M-F30-03: Eine Portion wird ohne Zutun gesichert', async ({ page }) => {
    const posts = [];
    await page.route('**/api/metzger-order/**/speichern', (r) => r.fallback());
    await oeffneTab(page);
    page.on('request', (r) => {
      if (r.method() === 'POST' && /\/speichern$/.test(r.url())) posts.push(r.url());
    });
    await zeile(page, 'Weißwurst').locator('.mb-add').click();
    await page.locator('.mb-kach button', { hasText: /^1$/ }).first().click();
    // 1,5 s Ruhe, dann geht der Entwurf raus – niemand muss etwas drücken.
    await page.waitForTimeout(2600);
    expect(posts.length).toBeGreaterThan(0);
    await expect(page.locator('#panel-metzgerbest .mb-autosave')).toContainText('gesichert');
  });

  test('TC-M-F30-04: Schnelle Eingaben lösen nur eine Sicherung aus', async ({ page }) => {
    const posts = [];
    await oeffneTab(page);
    page.on('request', (r) => {
      if (r.method() === 'POST' && /\/speichern$/.test(r.url())) posts.push(r.url());
    });
    await zeile(page, 'Weißwurst').locator('.mb-add').click();
    await page.locator('.mb-kach button', { hasText: '½' }).first().click();
    await page.locator('.mb-kach button', { hasText: /^1$/ }).first().click();
    await page.waitForTimeout(2600);
    expect(posts.length).toBe(1);
  });

  test('TC-M-F30-05: Der Kiosk erkennt ungesicherte Eingaben', async ({ page }) => {
    // Davon haengt ab, ob nach einem Update neu geladen werden darf.
    await oeffneTab(page);
    expect(await page.evaluate(() => window.KMetzgerBest.istGeaendert())).toBe(false);
    await zeile(page, 'Weißwurst').locator('.mb-add').click();
    await page.locator('.mb-kach button', { hasText: /^1$/ }).first().click();
    expect(await page.evaluate(() => window.KMetzgerBest.istGeaendert())).toBe(true);
  });
});

// ── F32: Korrektur ist zweistufig ───────────────────────────────────────
//
// Gemeldet: „Wie kann eine Korrektur gesendet werden, wenn es gar keine
// Möglichkeit gibt die Werte zu ändern?"
//
// Der Knopf hiess „Korrektur senden" und sprang sofort in den Versanddialog.
// Alle Felder blieben gesperrt (`gesperrt()` = status 1), also verschickte
// man die unveraenderte Bestellung ein zweites Mal. Jetzt gibt der Knopf
// erst die Felder frei; gesendet wird ausdruecklich danach.

test.describe('Metzger-Bestellung – Korrektur ist zweistufig (F32)', () => {

  test('TC-F32-01: Gesendet ist gesperrt und bietet „Korrigieren"', async ({ page }) => {
    await oeffneTab(page, { status: 1 });
    await expect(page.locator('.mb-add')).toHaveCount(0);
    await expect(page.locator('.mb-btn', { hasText: 'Korrigieren' })).toBeVisible();
    // Der Versanddialog darf noch nicht aufgehen.
    await expect(page.locator('.mb-dlg')).toHaveCount(0);
  });

  test('TC-F32-02: „Korrigieren" gibt die Felder frei, ohne zu senden', async ({ page }) => {
    await oeffneTab(page, { status: 1 });
    await page.locator('.mb-btn', { hasText: 'Korrigieren' }).click();
    // Jetzt lassen sich Portionen anlegen – vorher ging das nicht.
    expect(await page.locator('.mb-add').count()).toBeGreaterThan(0);
    await expect(page.locator('.mb-dlg')).toHaveCount(0);
    await expect(page.locator('.mb-send', { hasText: 'Korrektur senden' }).first()).toBeVisible();
  });

  test('TC-F32-03: Ohne Änderung wird nichts verschickt', async ({ page }) => {
    const posts = [];
    await oeffneTab(page, { status: 1 });
    page.on('request', (r) => {
      if (r.method() === 'POST' && /\/korrektur$/.test(r.url())) posts.push(r.url());
    });
    await page.locator('.mb-btn', { hasText: 'Korrigieren' }).click();
    await page.locator('.mb-send', { hasText: 'Korrektur senden' }).first().click();
    await page.waitForTimeout(600);
    await expect(page.locator('.mb-dlg')).toHaveCount(0);
    expect(posts.length).toBe(0);
  });

  test('TC-F32-04: Geänderte Menge lässt sich als Korrektur senden', async ({ page }) => {
    const posts = [];
    await oeffneTab(page, { status: 1 });
    page.on('request', (r) => {
      if (r.method() === 'POST' && /\/korrektur$/.test(r.url())) posts.push(r.url());
    });
    await page.locator('.mb-btn', { hasText: 'Korrigieren' }).click();
    await zeile(page, 'Weißwurst').locator('.mb-add').click();
    await page.locator('.mb-kach button', { hasText: /^1$/ }).first().click();
    await page.locator('.mb-send', { hasText: 'Korrektur senden' }).first().click();
    await expect(page.locator('.mb-dlg')).toBeVisible();
    await page.locator('.mb-dlg-acts button', { hasText: 'Korrektur absenden' }).click();
    await page.waitForTimeout(900);
    expect(posts.length).toBe(1);
  });

  test('TC-F32-05: Im Korrekturmodus wird nicht still gespeichert', async ({ page }) => {
    // Ein Entwurfs-Speicher würde die bereits gesendete Bestellung überschreiben.
    const posts = [];
    await oeffneTab(page, { status: 1 });
    page.on('request', (r) => {
      if (r.method() === 'POST' && /\/speichern$/.test(r.url())) posts.push(r.url());
    });
    await page.locator('.mb-btn', { hasText: 'Korrigieren' }).click();
    await zeile(page, 'Weißwurst').locator('.mb-add').click();
    await page.locator('.mb-kach button', { hasText: /^1$/ }).first().click();
    await page.waitForTimeout(2600);
    expect(posts.length).toBe(0);
  });

  test('TC-F32-06: „Verwerfen" schliesst die Korrektur wieder', async ({ page }) => {
    await oeffneTab(page, { status: 1 });
    await page.locator('.mb-btn', { hasText: 'Korrigieren' }).click();
    expect(await page.locator('.mb-add').count()).toBeGreaterThan(0);
    await page.locator('.mb-btn', { hasText: 'Verwerfen' }).first().click();
    // Verwerfen loescht das Erfasste und laesst sich nicht zurueckholen; der
    // umgebaute Kiosk fragt deshalb vorher nach (TC-F5-05). Der gewohnte
    // Kiosk kennt die Rueckfrage nicht - beide Wege bestehen.
    await bestaetigenFallsGefragt(page);
    await page.waitForTimeout(800);
    await expect(page.locator('.mb-add')).toHaveCount(0);
    await expect(page.locator('.mb-btn', { hasText: 'Korrigieren' })).toBeVisible();
  });
});

// ── F36: Stammdaten gehören ins CMS ─────────────────────────────────────
//
// Gemeldet: „Die Einstellungen bitte auf die CMS Seiten und nicht im Kiosk."
// Der Kiosk ist die Arbeitsfläche der Verkäuferinnen; Empfänger, Liefertage
// und Kunden-Nr. werden dort nicht gepflegt. Beim Bäcker war das schon so.

test.describe('Metzger-Bestellung – Einstellungen im CMS (F36)', () => {

  test('TC-F36-01: Kein Einstellungen-Reiter mehr im Kiosk', async ({ page }) => {
    await oeffneTab(page);
    // Der Bereichswechsel steht im Kopf (ab Tablet) und noch einmal im Blatt
    // (Telefon). Geprüft wird die sichtbare Leiste im Kopf.
    const reiter = await page.locator('#panel-metzgerbest .mb-subs.nur-breit .mb-sub')
      .allInnerTexts();
    expect(reiter.map((t) => t.trim())).toEqual(['Bestellung', 'Verlauf', 'Artikel']);
  });

  test('TC-F36-02: Die Eingabefelder sind verschwunden', async ({ page }) => {
    await oeffneTab(page);
    await expect(page.locator('#mb-c-mail')).toHaveCount(0);
    await expect(page.locator('#mb-c-kd')).toHaveCount(0);
  });
});