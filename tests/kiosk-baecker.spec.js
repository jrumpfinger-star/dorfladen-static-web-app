/**
 * Kiosk – Bäcker-Bestellung (Playwright E2E)
 *
 * Deckt die Test-Cases aus specs/baecker-bestellung/spec.md ab:
 *   F1  Bestelltag wählen
 *   F2  Vorbelegung aus dem letzten gleichen Wochentag
 *   F3  Mengen und Retouren erfassen
 *   F4  Zusatzartikel nur für diesen Tag
 *   F5  Artikel verwalten
 *   F7  Bestellung senden
 *   F8  Sperre und Korrektur
 *   F9  Erinnerung ab Bestellschluss
 *   F12 Responsive und bedienbar
 *
 * Alle API-Aufrufe werden gemockt. Wichtig: Der Kiosk ist eine PWA – ohne
 * `serviceWorkers: 'block'` beantwortet der Service Worker die Aufrufe aus
 * seinem Cache und die Mocks greifen nicht.
 *
 * Ausführen:
 *   npx playwright test tests/kiosk-baecker.spec.js
 */

const { test, expect } = require('@playwright/test');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

const TAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const BESTELLTAGE = [3, 4, 5, 6]; // Mi–Sa (JS: So=0)

function iso(d) {
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}
function plusTage(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

/** Sieben Tage ab heute, nur Mi–Sa sind Bestelltage. */
function tagesleiste(gesendet = []) {
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = plusTage(i);
    const datum = iso(d);
    const ist = BESTELLTAGE.includes(d.getDay());
    out.push({
      datum,
      wochentag: TAGE[d.getDay()],
      bestelltag: ist,
      status: !ist ? 'kein_tag' : (gesendet.includes(datum) ? 'gesendet' : 'offen'),
    });
  }
  return out;
}

function ersterBestelltag(gesendet = []) {
  return tagesleiste(gesendet).find((t) => t.bestelltag && !gesendet.includes(t.datum));
}

/** Positionen mit aufsteigenden Artikelnummern und Vergleichswerten. */
function positionen() {
  return [
    { nummer: '1', name: 'Kaisersemmel', aktiv: true, menge: 48, retoure: 0, vorbelegt: 48, verlauf: [48, 45, 48] },
    { nummer: '33', name: 'Mohnsemmel', aktiv: true, menge: 2, retoure: 0, vorbelegt: 2, verlauf: [2, 2, 2] },
    { nummer: '43', name: 'Urige', aktiv: true, menge: 0, retoure: 0, vorbelegt: 0, verlauf: [] },
    { nummer: '73', name: 'Schrötlisemmel', aktiv: true, menge: 4, retoure: 0, vorbelegt: 4, verlauf: [4, 4, 3] },
    { nummer: '126', name: 'Baguette 400g', aktiv: true, menge: 1, retoure: 0, vorbelegt: 1, verlauf: [1, 1, 1] },
    { nummer: '160', name: 'Ebrachtaler 1 kg', aktiv: true, menge: 2, retoure: 0, vorbelegt: 2, verlauf: [2, 2, 3] },
    { nummer: '1183', name: 'König-Ludwig-Brot 1kg', aktiv: true, menge: 2, retoure: 0, vorbelegt: 2, verlauf: [2, 2, 2] },
    { nummer: '2019', name: 'Bogen Backpapier', aktiv: false, menge: 0, retoure: 0, vorbelegt: 0, verlauf: [] },
  ];
}

function bestellung(opts = {}) {
  const t = opts.tag || ersterBestelltag();
  return {
    datum: t.datum,
    wochentag: t.wochentag,
    datum_de: t.datum.split('-').reverse().join('.'),
    status: opts.status || 0,
    gesperrt: !!opts.gesperrt,
    vorlage_datum: opts.ohneVorlage ? '' : '2026-09-03',
    vorlage_datum_de: opts.ohneVorlage ? '' : '03.09.2026',
    protokoll: opts.protokoll || [],
    positionen: opts.positionen || positionen(),
    tour_nr: opts.tour_nr || '87',
    kd_nr: '1190',
    empfaenger: opts.empfaenger || 'jrumpfinger@t-online.de',
    testbetrieb: opts.testbetrieb !== false,
  };
}

async function mockApi(page, opts = {}) {
  const calls = [];
  page.__calls = calls;
  page.on('request', (req) => {
    if (req.method() === 'POST' && /baecker-/.test(req.url())) {
      let body = {};
      try { body = JSON.parse(req.postData() || '{}'); } catch (e) { /* ignore */ }
      calls.push({ url: req.url(), body });
    }
  });

  // Eine einzige Route für alle API-Aufrufe. Bewusst nicht mehrere Routen mit
  // unterschiedlicher Genauigkeit: So kann kein Aufruf – insbesondere kein
  // POST – versehentlich an die echte API durchrutschen und eine Mail auslösen.
  await page.route(/\/api\//, (r) => {
    const url = r.request().url();
    const method = r.request().method();
    const json = (o, status = 200) => r.fulfill({
      status, contentType: 'application/json', body: JSON.stringify(o),
    });

    if (/\/api\/cms-config/.test(url)) {
      return json({ success: true, data: { feature_flags: {
        kiosk_mittag: true, kiosk_kontakt: true, kiosk_baecker: true } } });
    }

    if (/\/api\/baecker-artikel/.test(url)) {
      if (method !== 'GET') return json({ success: true, meldung: 'Artikel angelegt.' });
      const artikel = positionen().map((p) => ({
        nummer: p.nummer, name: p.name, aktiv: p.aktiv,
        bestellt_in: p.menge ? 12 : 0,
        gruppe: parseInt(p.nummer, 10) <= 119 ? 'Semmeln & Kleingebäck'
          : parseInt(p.nummer, 10) <= 301 ? 'Brote & Baguettes' : 'Süßes & Sonstiges',
      }));
      return json({ success: true, artikel,
        anzahl_aktiv: artikel.filter((a) => a.aktiv).length, anzahl_gesamt: artikel.length });
    }

    if (/\/api\/baecker-order/.test(url)) {
      if (method === 'POST') {
        if (opts.sendeFehler) {
          return json({ success: false,
            error: 'Die Bestellung konnte nicht versendet werden. Bitte erneut versuchen.' }, 502);
        }
        return json({ success: true, status: 1, protokoll: [],
          meldung: 'Bestellung gesendet. 7 Positionen, 59 Stück.' });
      }
      if (/mode=uebersicht/.test(url)) {
        return json({ success: true, tage: tagesleiste(opts.gesendetTage || []),
          naechster: (opts.tag || ersterBestelltag()).datum,
          erinnerung: opts.erinnerung
            || { offen: false, blinkt: false, datum: '', wochentag: '', bestellschluss: '12:00' } });
      }
      if (/mode=verlauf/.test(url)) {
        return json({ success: true, verlauf: [
          { datum: '2026-09-04', datum_de: '04.09.2026', wochentag: 'Freitag', status: 1,
            positionen: 28, stueck: 134, protokoll: [{ zeit: '2026-09-03T12:05:00', wer: 'Lidia' }] },
          { datum: '2026-08-29', datum_de: '29.08.2026', wochentag: 'Samstag', status: 2,
            positionen: 21, stueck: 48, protokoll: [{ zeit: '2026-08-28T11:02:00', wer: 'Lidia' }] },
        ] });
      }
      return json({ success: true, bestellung: bestellung(opts) });
    }

    // Alle übrigen Kiosk-Aufrufe leer, aber erfolgreich beantworten
    return json({ success: true, data: [], orders: [], threads: [] });
  });
}

async function openBaecker(page, opts = {}) {
  await mockApi(page, opts);
  await page.goto(KIOSK_URL);
  await page.locator('.k-tab[data-tab="baecker"]').click();
  await expect(page.locator('#panel-baecker .bk-row').first()).toBeVisible({ timeout: 20000 });
}

const rows = (page) => page.locator('#panel-baecker .bk-row');
const row = (page, name) => rows(page).filter({ hasText: name });

// ════════════════════════════════════════════════════
//  F1 – Bestelltag wählen
// ════════════════════════════════════════════════════

test.describe('Bäcker – Bestelltag (F1)', () => {

  test('TC-F1-01: nächster Bestelltag ist vorausgewählt', async ({ page }) => {
    await openBaecker(page);
    const aktiv = page.locator('#panel-baecker .bk-day.active');
    await expect(aktiv).toHaveCount(1);
    const ziel = ersterBestelltag();
    await expect(aktiv).toContainText(ziel.wochentag.slice(0, 2));
  });

  test('TC-F1-02: Nicht-Bestelltage sind gesperrt', async ({ page }) => {
    await openBaecker(page);
    const gesperrt = page.locator('#panel-baecker .bk-day.off');
    await expect(gesperrt.first()).toBeDisabled();
    await expect(gesperrt.first()).toContainText('kein Tag');
  });

  test('TC-F1-03: gesendeter Tag ist gekennzeichnet', async ({ page }) => {
    const alle = tagesleiste().filter((t) => t.bestelltag);
    const gesendet = alle[0].datum;          // erster Bestelltag ist erledigt
    await openBaecker(page, { gesendetTage: [gesendet], tag: alle[1] });
    await expect(page.locator('#panel-baecker .bk-day.sent')).toHaveCount(1);
    await expect(page.locator('#panel-baecker .bk-day.sent')).toContainText('gesendet');
    // Vorausgewählt ist der nächste offene Tag
    await expect(page.locator('#panel-baecker .bk-day.active'))
      .toContainText(alle[1].wochentag.slice(0, 2));
  });
});

// ════════════════════════════════════════════════════
//  F2 – Vorbelegung
// ════════════════════════════════════════════════════

test.describe('Bäcker – Vorbelegung (F2)', () => {

  test('TC-F2-01: Mengen sind vorbelegt und die Herkunft genannt', async ({ page }) => {
    await openBaecker(page);
    await expect(row(page, 'Kaisersemmel').locator('.step input')).toHaveValue('48');
    await expect(page.locator('#panel-baecker .bk-stat')).toContainText('03.09.2026');
  });

  test('TC-F2-03: ohne Vorlage wird darauf hingewiesen', async ({ page }) => {
    await openBaecker(page, { ohneVorlage: true });
    await expect(page.locator('#panel-baecker .bk-stat')).toContainText('keine Vorlage vorhanden');
  });

  test('TC-F2-04: Vergleichswerte werden angezeigt', async ({ page }) => {
    await openBaecker(page);
    const hist = row(page, 'Kaisersemmel').locator('.hist .v');
    await expect(hist).toHaveCount(3);
    await expect(hist.nth(0)).toHaveText('48');
    await expect(hist.nth(1)).toHaveText('45');
  });

  test('TC-F2-05: Zurücksetzen stellt die Vorbelegung wieder her', async ({ page }) => {
    await openBaecker(page);
    const feld = row(page, 'Kaisersemmel').locator('.step input');
    await row(page, 'Kaisersemmel').locator('.step button').last().click();
    await expect(feld).toHaveValue('49');

    await page.locator('button:has-text("zurücksetzen")').click();
    await expect(feld).toHaveValue('48');
    await expect(row(page, 'Kaisersemmel')).not.toHaveClass(/changed/);
  });
});

// ════════════════════════════════════════════════════
//  F3 – Mengen und Retouren
// ════════════════════════════════════════════════════

test.describe('Bäcker – Erfassung (F3)', () => {

  test('TC-F3-01: Sortierung aufsteigend nach Artikelnummer', async ({ page }) => {
    await openBaecker(page);
    const nummern = await page.locator('#panel-baecker .bk-row .nr').allTextContents();
    const zahlen = nummern.map((n) => parseInt(n, 10)).filter((n) => !isNaN(n));
    expect(zahlen).toEqual([...zahlen].sort((a, b) => a - b));
  });

  test('TC-F3-02: Plus und Minus verändern die Menge', async ({ page }) => {
    await openBaecker(page);
    const r = row(page, 'Mohnsemmel');
    await r.locator('.step button').last().click();
    await expect(row(page, 'Mohnsemmel').locator('.step input')).toHaveValue('3');
    await expect(row(page, 'Mohnsemmel')).toHaveClass(/changed/);

    await row(page, 'Mohnsemmel').locator('.step button').first().click();
    await expect(row(page, 'Mohnsemmel').locator('.step input')).toHaveValue('2');
  });

  test('TC-F3-03: Minus stoppt bei 0', async ({ page }) => {
    await openBaecker(page);
    await row(page, 'Urige').locator('.step button').first().click();
    await expect(row(page, 'Urige').locator('.step input')).toHaveValue('0');
  });

  test('TC-F3-04: Retouren sind erfassbar', async ({ page }) => {
    await openBaecker(page);
    await row(page, 'Kaisersemmel').locator('.ret input').fill('3');
    await row(page, 'Kaisersemmel').locator('.ret input').blur();
    await expect(row(page, 'Kaisersemmel').locator('.ret input')).toHaveValue('3');
    // Bestellmenge bleibt unberührt
    await expect(row(page, 'Kaisersemmel').locator('.step input')).toHaveValue('48');
  });

  test('TC-F3-05: Umschalter ändert die Reihenfolge nicht', async ({ page }) => {
    await openBaecker(page);
    const vorher = await rows(page).count();
    await page.locator('button:has-text("Alle Artikel")').click();
    await expect(rows(page)).toHaveCount(vorher + 1); // ausgeblendeter Artikel kommt dazu
    const nummern = await page.locator('#panel-baecker .bk-row .nr').allTextContents();
    const zahlen = nummern.map((n) => parseInt(n, 10)).filter((n) => !isNaN(n));
    expect(zahlen).toEqual([...zahlen].sort((a, b) => a - b));
  });

  test('TC-F3-06: negative Eingabe wird abgefangen', async ({ page }) => {
    await openBaecker(page);
    await row(page, 'Mohnsemmel').locator('.step input').fill('-5');
    await row(page, 'Mohnsemmel').locator('.step input').blur();
    await expect(row(page, 'Mohnsemmel').locator('.step input')).toHaveValue('0');
  });

  test('TC-F3-07: Tab springt von Mengenfeld zu Mengenfeld', async ({ page }) => {
    await openBaecker(page);
    await row(page, 'Kaisersemmel').locator('.step input').focus();

    // Erst das Retourenfeld derselben Zeile, dann die nächste Menge –
    // die Plus/Minus-Knöpfe dürfen nicht dazwischen liegen.
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-feld', 'retoure');
    await page.keyboard.press('Tab');
    const fokus = page.locator(':focus');
    await expect(fokus).toHaveAttribute('data-feld', 'menge');
    await expect(fokus).toHaveAttribute('data-key', '33');
  });

  test('TC-F3-08: Fokus bleibt beim Tippen erhalten', async ({ page }) => {
    await openBaecker(page);
    const feld = row(page, 'Kaisersemmel').locator('.step input');
    await feld.focus();
    await feld.fill('52');
    // Nach der Eingabe muss der Fokus noch im selben Feld stehen
    await expect(page.locator(':focus')).toHaveAttribute('data-key', '1');
    await expect(row(page, 'Kaisersemmel')).toHaveClass(/changed/);
    await expect(row(page, 'Kaisersemmel')).toContainText('48 → 52');
  });

  test('TC-F3-09: Enter springt ins nächste Mengenfeld', async ({ page }) => {
    await openBaecker(page);
    await row(page, 'Kaisersemmel').locator('.step input').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator(':focus')).toHaveAttribute('data-key', '33');
  });
});

// ════════════════════════════════════════════════════
//  F4 – Zusatzartikel
// ════════════════════════════════════════════════════

test.describe('Bäcker – Zusatzartikel (F4)', () => {

  test('TC-F4-02: frei eingetragene Position erscheint', async ({ page }) => {
    await openBaecker(page);
    await page.locator('.bk-addrow').click();
    await page.locator('#bk-neu-name').fill('Brezen für Feuerwehrfest');
    await page.locator('#bk-neu-menge').fill('40');
    await page.locator('.bk-dlg-f button:has-text("Hinzufügen")').click();

    await expect(page.locator('#panel-baecker .bk-grp.extra')).toContainText('Nur für diesen Tag');
    const neu = row(page, 'Feuerwehrfest');
    await expect(neu).toHaveCount(1);
    await expect(neu.locator('.step input')).toHaveValue('40');
  });

  test('TC-F4-03: Bezeichnung ist Pflicht', async ({ page }) => {
    await openBaecker(page);
    await page.locator('.bk-addrow').click();
    await page.locator('.bk-dlg-f button:has-text("Hinzufügen")').click();
    // Dialog bleibt offen, nichts wurde hinzugefügt
    await expect(page.locator('#bk-neu-name')).toBeVisible();
    await expect(page.locator('#panel-baecker .bk-grp.extra')).toHaveCount(0);
  });

  test('TC-F4-04: Zusatzposition lässt sich entfernen', async ({ page }) => {
    await openBaecker(page);
    await page.locator('.bk-addrow').click();
    await page.locator('#bk-neu-name').fill('Testposition');
    await page.locator('.bk-dlg-f button:has-text("Hinzufügen")').click();
    await expect(row(page, 'Testposition')).toHaveCount(1);

    await row(page, 'Testposition').locator('.bk-del').click();
    await expect(row(page, 'Testposition')).toHaveCount(0);
    await expect(page.locator('#panel-baecker .bk-grp.extra')).toHaveCount(0);
  });

  test('TC-F4-01: Artikel aus der Liste ergänzen', async ({ page }) => {
    await openBaecker(page);
    // Ein ausgeblendeter Artikel taucht in der Standardansicht nicht auf
    await expect(row(page, 'Backpapier')).toHaveCount(0);

    await page.locator('.bk-addrow').click();
    await page.locator('#bk-suche').fill('Backpapier');
    await expect(page.locator('.bk-pk .add').first()).toBeVisible();
    await page.locator('.bk-pk .add').first().click();

    // … und erscheint danach mit Menge 1 in der Bestellung
    await expect(row(page, 'Backpapier')).toHaveCount(1);
    await expect(row(page, 'Backpapier').locator('.step input')).toHaveValue('1');
  });
});

// ════════════════════════════════════════════════════
//  F5 – Artikelverwaltung
// ════════════════════════════════════════════════════

test.describe('Bäcker – Artikelverwaltung (F5)', () => {

  test('TC-F5-01: Katalog ist nach Nummer sortiert', async ({ page }) => {
    await openBaecker(page);
    await page.locator('.bk-sub button:has-text("Artikel")').click();
    await expect(page.locator('#panel-baecker .bk-art').first()).toBeVisible();
    const nummern = await page.locator('#panel-baecker .bk-art .nr').allTextContents();
    const zahlen = nummern.map((n) => parseInt(n, 10)).filter((n) => !isNaN(n));
    expect(zahlen).toEqual([...zahlen].sort((a, b) => a - b));
  });

  test('TC-F5-05: Umschalter zeigt ausgeblendete Artikel', async ({ page }) => {
    await openBaecker(page);
    await page.locator('.bk-sub button:has-text("Artikel")').click();
    await expect(page.locator('#panel-baecker .bk-art').first()).toBeVisible();
    const aktiv = await page.locator('#panel-baecker .bk-art').count();

    await page.locator('.bk-tools button:has-text("Alle")').click();
    await expect(page.locator('#panel-baecker .bk-art')).toHaveCount(aktiv + 1);
    await expect(page.locator('#panel-baecker .bk-art.off')).toHaveCount(1);
  });

  test('TC-F5-02: neuer Artikel lässt sich anlegen', async ({ page }) => {
    await openBaecker(page);
    await page.locator('.bk-sub button:has-text("Artikel")').click();
    await page.locator('button:has-text("Neuer Artikel")').click();
    await page.locator('#bk-a-nr').fill('852');
    await page.locator('#bk-a-name').fill('Dinkel-Nuss-Kruste');
    await page.locator('.bk-dlg-f button:has-text("Anlegen")').click();

    await expect.poll(() => page.__calls.filter((c) => /baecker-artikel/.test(c.url)).length,
      { timeout: 10000 }).toBeGreaterThan(0);
    const call = page.__calls.filter((c) => /baecker-artikel/.test(c.url)).pop();
    expect(call.body.nummer).toBe('852');
    expect(call.body.name).toBe('Dinkel-Nuss-Kruste');
  });
});

// ════════════════════════════════════════════════════
//  F7 – Senden
// ════════════════════════════════════════════════════

test.describe('Bäcker – Senden (F7)', () => {

  test('TC-F7-01: Vorschau zeigt die Versanddaten', async ({ page }) => {
    await openBaecker(page);
    await page.locator('.bk-send').first().click();

    const dlg = page.locator('.bk-dlg');
    await expect(dlg).toBeVisible();
    await expect(dlg).toContainText('Freundl-Bestellformular.docx');
    await expect(dlg).toContainText('Tour-Nr. 87');
    await expect(dlg.locator('.bk-prev tr')).not.toHaveCount(0);
    // Noch kein Versand
    expect(page.__calls.filter((c) => /baecker-order/.test(c.url)).length).toBe(0);
  });

  test('TC-F7-02: Testbetrieb ist gekennzeichnet', async ({ page }) => {
    await openBaecker(page);
    await expect(page.locator('#panel-baecker .bk-test')).toContainText('Testbetrieb');
    await page.locator('.bk-send').first().click();
    await expect(page.locator('.bk-dlg .bk-test')).toContainText('jrumpfinger@t-online.de');
  });

  test('TC-F7-03: Bestätigen sendet die Bestellung', async ({ page }) => {
    await openBaecker(page);
    await page.locator('.bk-send').first().click();
    await page.locator('#bk-send-btn').click();

    await expect.poll(() => page.__calls.filter((c) => /baecker-order/.test(c.url)).length,
      { timeout: 10000 }).toBeGreaterThan(0);
    const call = page.__calls.filter((c) => /baecker-order/.test(c.url)).pop();
    expect(call.body.aktion).toBe('senden');
    expect(call.body.positionen.length).toBeGreaterThan(0);
    // Positionen sind aufsteigend nach Nummer sortiert
    const nrs = call.body.positionen.map((p) => parseInt(p.nummer, 10)).filter((n) => !isNaN(n));
    expect(nrs).toEqual([...nrs].sort((a, b) => a - b));
  });

  test('TC-F7-04: Fehlschlag meldet sich freundlich', async ({ page }) => {
    const dialoge = [];
    page.on('dialog', (d) => { dialoge.push(d.message()); d.dismiss(); });

    await openBaecker(page, { sendeFehler: true });
    await page.locator('.bk-send').first().click();
    await page.locator('#bk-send-btn').click();

    await expect(page.locator('#k-toast')).toContainText('konnte nicht versendet werden');
    expect(dialoge).toHaveLength(0);   // kein natives alert()
  });
});

// ════════════════════════════════════════════════════
//  F8 – Sperre und Korrektur
// ════════════════════════════════════════════════════

test.describe('Bäcker – Sperre und Korrektur (F8)', () => {

  const gesendetOpts = {
    gesperrt: true, status: 1,
    protokoll: [{ zeit: '2026-09-09T11:42:00', art: 'gesendet', wer: 'Lidia', positionen: 7, stueck: 59 }],
  };

  test('TC-F8-01: gesendete Bestellung ist gesperrt', async ({ page }) => {
    await openBaecker(page, gesendetOpts);
    await expect(page.locator('#panel-baecker .bk-stat.done')).toContainText('Gesendet');
    await expect(row(page, 'Kaisersemmel').locator('.step input')).toHaveAttribute('readonly', '');
    await expect(row(page, 'Kaisersemmel').locator('.step button').first()).toBeDisabled();
    await expect(page.locator('#panel-baecker .bk-send')).toHaveCount(0);
  });

  test('TC-F8-02/03: Korrekturmodus entsperrt und markiert Änderungen', async ({ page }) => {
    await openBaecker(page, gesendetOpts);
    await page.locator('button:has-text("Korrektur senden")').first().click();

    const feld = row(page, 'Kaisersemmel').locator('.step input');
    await expect(feld).not.toHaveAttribute('readonly', '');
    await row(page, 'Kaisersemmel').locator('.step button').last().click();
    await expect(row(page, 'Kaisersemmel')).toHaveClass(/changed/);
    await expect(row(page, 'Kaisersemmel')).toContainText('48 → 49');
  });

  test('TC-F8-04: Korrektur wird als Korrektur gesendet', async ({ page }) => {
    await openBaecker(page, gesendetOpts);
    await page.locator('button:has-text("Korrektur senden")').first().click();
    await page.locator('.bk-send').first().click();
    await page.locator('#bk-send-btn').click();

    await expect.poll(() => page.__calls.filter((c) => /baecker-order/.test(c.url)).length,
      { timeout: 10000 }).toBeGreaterThan(0);
    const call = page.__calls.filter((c) => /baecker-order/.test(c.url)).pop();
    expect(call.body.aktion).toBe('korrektur');
  });

  test('TC-F8-06: Protokoll zeigt Zeitpunkt und Namen', async ({ page }) => {
    await openBaecker(page, gesendetOpts);
    await expect(page.locator('#panel-baecker .bk-stat')).toContainText('Lidia');
    await expect(page.locator('#panel-baecker .bk-stat')).toContainText('7 Positionen');
  });
});

// ════════════════════════════════════════════════════
//  F9 – Erinnerung
// ════════════════════════════════════════════════════

test.describe('Bäcker – Erinnerung (F9)', () => {

  test('TC-F9-01: Zähler vor dem Bestellschluss, kein Blinken', async ({ page }) => {
    const t = ersterBestelltag();
    await openBaecker(page, {
      erinnerung: { offen: true, blinkt: false, datum: t.datum, wochentag: t.wochentag, bestellschluss: '12:00' },
    });
    await expect(page.locator('#badges-baecker .k-tab-badge')).toBeVisible();
    await expect(page.locator('.k-tab[data-tab="baecker"]')).not.toHaveClass(/bk-blink/);
  });

  test('TC-F9-02: ab dem Bestellschluss blinkt der Reiter', async ({ page }) => {
    const t = ersterBestelltag();
    await openBaecker(page, {
      erinnerung: { offen: true, blinkt: true, datum: t.datum, wochentag: t.wochentag, bestellschluss: '12:00' },
    });
    await expect(page.locator('.k-tab[data-tab="baecker"]')).toHaveClass(/bk-blink/);
    await expect(page.locator('#panel-baecker .bk-stat.late')).toContainText('Bestellschluss war um 12:00');
  });

  test('TC-F9-03: kein Blinken ohne offene Bestellung', async ({ page }) => {
    await openBaecker(page);
    await expect(page.locator('.k-tab[data-tab="baecker"]')).not.toHaveClass(/bk-blink/);
    await expect(page.locator('#badges-baecker .k-tab-badge')).toHaveCount(0);
  });
});

// ════════════════════════════════════════════════════
//  F10 – Verlauf
// ════════════════════════════════════════════════════

test.describe('Bäcker – Verlauf (F10)', () => {

  test('TC-F10-01: Verlauf listet die Bestellungen', async ({ page }) => {
    await openBaecker(page);
    await page.locator('.bk-sub button:has-text("Verlauf")').click();
    const eintraege = page.locator('#panel-baecker .bk-hist');
    await expect(eintraege).toHaveCount(2);
    await expect(eintraege.nth(0)).toContainText('Freitag');
    await expect(eintraege.nth(0)).toContainText('28 Positionen');
    await expect(eintraege.nth(1)).toContainText('korrigiert');
  });
});

// ════════════════════════════════════════════════════
//  F12 – Responsive
// ════════════════════════════════════════════════════

test.describe('Bäcker – Responsive (F12)', () => {
  test('TC-F12-01: kein horizontales Scrollen', async ({ page }) => {
    await openBaecker(page);
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('TC-F12-02: Tap-Targets mindestens 44px', async ({ page }) => {
    await openBaecker(page);
    const plus = await row(page, 'Kaisersemmel').locator('.step button').last().boundingBox();
    expect(plus.height).toBeGreaterThanOrEqual(44);
    const menge = await row(page, 'Kaisersemmel').locator('.step input').boundingBox();
    expect(menge.height).toBeGreaterThanOrEqual(44);
    const tag = await page.locator('#panel-baecker .bk-day.active').boundingBox();
    expect(tag.height).toBeGreaterThanOrEqual(44);
  });

  test('TC-F12-03: keine nativen Dialoge beim Senden', async ({ page }) => {
    const dialoge = [];
    page.on('dialog', (d) => { dialoge.push(d.message()); d.dismiss(); });
    await openBaecker(page);
    await page.locator('.bk-send').first().click();
    await page.locator('#bk-send-btn').click();
    await page.waitForTimeout(800);
    expect(dialoge).toHaveLength(0);
  });

  test('TC-F12-04: nach einem Neuladen bleibt der Bäcker-Tab aktiv', async ({ page }) => {
    // Der Kiosk lädt sich nach einem Update selbst neu – dabei darf die
    // Verkäuferin nicht auf dem Standard-Tab landen.
    await openBaecker(page);
    await expect(page.locator('.k-tab[data-tab="baecker"]')).toHaveClass(/active/);

    await page.reload();
    await expect(page.locator('#panel-baecker .bk-row').first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.k-tab[data-tab="baecker"]')).toHaveClass(/active/);
    await expect(page.locator('#panel-baecker')).toHaveClass(/active/);
  });

  test('TC-F12-05: Spaltenzahl passt zur Fensterbreite', async ({ page }) => {
    await openBaecker(page);
    const gemessen = await page.locator('#panel-baecker .bk-grid').first()
      .evaluate((el) => ({
        spalten: getComputedStyle(el).gridTemplateColumns.split(' ').length,
        breite: window.innerWidth,
      }));
    // Ab 1620px drei, ab 1080px zwei, darunter eine Spalte
    const erwartet = gemessen.breite >= 1620 ? 3 : gemessen.breite >= 1080 ? 2 : 1;
    expect(gemessen.spalten).toBe(erwartet);
  });

  test('TC-F12-06: Zeile bleibt kompakt', async ({ page }, testInfo) => {
    await openBaecker(page);
    const box = await row(page, 'Kaisersemmel').boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);   // Tap-Target bleibt gewahrt
    // Breite Schirme: einzeilig. Schmale: bewusst gestapelt, daher höher.
    const grenze = testInfo.project.name === 'desktop' ? 58 : 130;
    expect(box.height).toBeLessThanOrEqual(grenze);
  });
});
