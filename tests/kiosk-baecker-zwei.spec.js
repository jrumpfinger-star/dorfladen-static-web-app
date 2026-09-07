// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Zweite Bäckerei (Martin's Backstube) – F17 bis F26.
 *
 * Der Mock ist EINE Route und antwortet je nach `baeckerei` **unterschiedlich**.
 * Sonst würde die Trennung nur scheinbar geprüft: Käme für beide dasselbe
 * zurück, bestünden die Tests auch dann, wenn der Parameter gar nicht ankommt.
 *
 * `serviceWorkers: 'block'` ist Pflicht – sonst beantwortet der Service Worker
 * der PWA die API-Aufrufe aus dem Cache.
 */

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

const TAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const NAME = { freundl: 'Bäckerei Freundl', martins: "Martin's Backstube" };
// Montag = 0 … Sonntag = 6 (wie im Server)
const LIEFERT = { martins: [0, 1, 5], freundl: [2, 3, 4, 5] };

// Die Nummer 1 bezeichnet bei beiden Häusern einen ANDEREN Artikel – genau
// daran hängt die Trennung der Kataloge.
const KATALOG = {
  freundl: [['1', 'Kaisersemmel'], ['33', 'Mohnsemmel'], ['150', 'Mischbrot 1 kg']],
  martins: [['1', 'Semmel'], ['12', 'Roggensemmel m. Kümmel'], ['104', 'BIO-Ciabatta']],
};

function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function plusTage(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}
function montagBasiert(d) { return (d.getDay() + 6) % 7; }

function liefertAm(d) {
  const wd = montagBasiert(d);
  return ['martins', 'freundl'].filter((bk) => LIEFERT[bk].includes(wd));
}

/** Erster Tag ab heute, an dem GENAU die genannte Bäckerei allein liefert. */
function tagNurFuer(bk) {
  for (let i = 0; i < 14; i++) {
    const d = plusTage(i);
    const wer = liefertAm(d);
    if (wer.length === 1 && wer[0] === bk) return { datum: iso(d), wochentag: TAGE[d.getDay()] };
  }
  throw new Error('kein Tag gefunden für ' + bk);
}

/**
 * Wie `tagNurFuer`, aber garantiert in der Zukunft. Heute ist die Ware längst
 * da – die Felder sind dann gesperrt und lassen sich nicht bedienen.
 */
function tagBestellbarFuer(bk) {
  for (let i = 1; i < 7; i++) {
    const d = plusTage(i);
    const wer = liefertAm(d);
    if (wer.length === 1 && wer[0] === bk) return { datum: iso(d), wochentag: TAGE[d.getDay()] };
  }
  throw new Error('kein bestellbarer Tag gefunden für ' + bk);
}

/** Erster Tag ab heute, an dem BEIDE liefern (Samstag). */
function tagFuerBeide() {
  for (let i = 0; i < 14; i++) {
    const d = plusTage(i);
    if (liefertAm(d).length === 2) return { datum: iso(d), wochentag: TAGE[d.getDay()] };
  }
  throw new Error('kein Samstag gefunden');
}

function tagesleiste(opts) {
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = plusTage(i);
    const datum = iso(d);
    const lieferanten = liefertAm(d).map((bk) => {
      const gesendet = (opts.gesendet || []).some((x) => x.datum === datum && x.bk === bk);
      const druckOffen = (opts.druckOffen || []).some((x) => x.datum === datum && x.bk === bk);
      return {
        baeckerei: bk, name: NAME[bk],
        status: gesendet || druckOffen ? 'gesendet' : 'offen',
        gedruckt: gesendet && bk === 'freundl',
        druck_offen: druckOffen,
      };
    });
    const fertig = lieferanten.filter((x) => x.status !== 'offen' && !x.druck_offen).length;
    // Bestellt wird immer für einen künftigen Liefertag – i === 0 ist heute.
    const bestellbar = i > 0 && lieferanten.length > 0;
    // Bestellschluss: hier vereinfacht der Vortag. Der Kiosk springt auf den
    // Tag, dessen Bestellung HEUTE fällig ist (F31).
    const bs = plusTage(i - 1);
    const bsIso = lieferanten.length ? iso(bs) : '';
    const offenHier = lieferanten.some((x) => x.status === 'offen');
    out.push({
      datum, wochentag: TAGE[d.getDay()], bestelltag: lieferanten.length > 0,
      bestellbar, heute: i === 0,
      bestellschluss_datum: bsIso,
      bestellschluss_datum_de: bsIso ? bsIso.split('-').reverse().join('.') : '',
      bestellschluss_wochentag: bsIso ? TAGE[bs.getDay()] : '',
      heute_bestellen: bestellbar && offenHier && bsIso === iso(plusTage(0)),
      hat_offene: bestellbar && offenHier,
      lieferanten, fertig, gesamt: lieferanten.length,
      status: !lieferanten.length ? 'kein_tag'
        : fertig === lieferanten.length ? 'gesendet'
        : lieferanten.some((x) => x.druck_offen) ? 'druck_offen'
        : !bestellbar ? 'vorbei' : 'offen',
    });
  }
  return out;
}

function bestellung(bk, datum, opts) {
  const gesendet = (opts.gesendet || []).some((x) => x.datum === datum && x.bk === bk);
  const druckOffen = (opts.druckOffen || []).some((x) => x.datum === datum && x.bk === bk);
  const d = new Date(datum + 'T12:00:00');
  // Startwerte aus den Rechnungen: greifen nur ohne echte Vorlage (F29).
  const startwerte = !!opts.startwerte && bk === 'martins';
  // Bestellschluss: in der Regel der Vortag. Der Kiosk schreibt ihn an, damit
  // Liefertag und Bestelltag nicht verwechselt werden (F30).
  const bsD = new Date(datum + 'T12:00:00');
  bsD.setDate(bsD.getDate() - 1);
  const bsIso = bsD.toISOString().slice(0, 10);
  return {
    datum, baeckerei: bk, baeckerei_name: NAME[bk],
    wochentag: TAGE[d.getDay()],
    datum_de: datum.split('-').reverse().join('.'),
    bestellschluss_datum: bsIso,
    bestellschluss_datum_de: bsIso.split('-').reverse().join('.'),
    bestellschluss_wochentag: TAGE[bsD.getDay()],
    status: gesendet || druckOffen ? 1 : 0,
    gesperrt: gesendet || druckOffen,
    bestellbar: new Date(datum + 'T12:00:00') > new Date(new Date().setHours(23, 59, 59, 0)),
    korrektur_moeglich: gesendet && !druckOffen,
    hat_entwurf: false,
    vorlage_datum: bk === 'freundl' ? '2026-09-01' : '',
    vorlage_datum_de: bk === 'freundl' ? '01.09.2026' : '',
    aus_startwerten: startwerte,
    startwerte_meta: startwerte ? { rechnungen: 11, liefertage: 66 } : {},
    // Ein Druckvermerk steht VORNE im Protokoll und trägt weder Positionen
    // noch Stückzahl – genau daran ist die Statuszeile zerbrochen (F34-05).
    protokoll: (gesendet || druckOffen)
      ? (opts.druckVermerk
          ? [{ zeit: datum + 'T11:05:00', art: 'gedruckt', wer: 'Anna' },
             { zeit: datum + 'T10:42:00', art: 'gesendet', wer: 'Anna', positionen: 3, stueck: 90 }]
          : [{ zeit: datum + 'T10:42:00', art: 'gesendet', wer: 'Anna', positionen: 3, stueck: 90 }])
      : [],
    positionen: KATALOG[bk].map(([nummer, name], i) => (startwerte
      // Erste Position bekommt einen Tageswert, die zweite keinen – so wie
      // Semmeln und Brote in den echten Daten.
      ? {
        nummer, name, aktiv: true, menge: i === 0 ? 28 : 0, retoure: 0,
        vorbelegt: i === 0 ? 28 : 0, verlauf: [],
      }
      : {
        nummer, name, aktiv: true, menge: (i + 1) * 10, retoure: 0,
        vorbelegt: (i + 1) * 10, verlauf: [(i + 1) * 10],
      })),
    tour_nr: bk === 'freundl' ? '87' : '',
    kd_nr: bk === 'freundl' ? '1190' : '1015',
    empfaenger: 'jrumpfinger@t-online.de',
    papierausdruck: bk === 'freundl',
    gedruckt_am: gesendet && bk === 'freundl' ? datum + 'T10:43:00' : '',
    druck_offen: druckOffen,
    gruppen: [], testbetrieb: true, record_id: null,
  };
}

/**
 * Eine einzige Route – so kann kein Aufruf an die echte API durchrutschen.
 * Zeichnet POSTs auf, damit sich prüfen lässt, WAS gesendet wurde.
 */
async function mockApi(page, opts = {}) {
  const calls = [];
  page.__calls = calls;
  page.on('request', (req) => {
    if (/^(POST|PATCH)$/.test(req.method()) && /baecker-/.test(req.url())) {
      let body = {};
      try { body = JSON.parse(req.postData() || '{}'); } catch (e) { /* ignore */ }
      calls.push({ url: req.url(), method: req.method(), body });
    }
  });

  await page.route(/\/api\//, (r) => {
    const url = r.request().url();
    const method = r.request().method();
    const json = (o, status = 200) => r.fulfill({
      status, contentType: 'application/json', body: JSON.stringify(o),
    });

    if (/\/api\/cms-config/.test(url)) {
      return json({ success: true, data: { feature_flags: { kiosk_baecker: true, kiosk_mittag: true } } });
    }

    const bk = new URL(url).searchParams.get('baeckerei');

    if (/\/api\/baecker-artikel/.test(url)) {
      if (method !== 'GET') return json({ success: true, meldung: 'gespeichert' });
      // Fehlt die Bäckerei, muss der Server ablehnen – genau das bildet der
      // Mock ab, damit ein vergessener Parameter im Test auffällt.
      if (!bk) return json({ success: false, error: 'Bitte angeben, um welche Bäckerei es geht.' }, 400);
      return json({
        success: true, baeckerei: bk, baeckerei_name: NAME[bk],
        artikel: KATALOG[bk].map(([nummer, name]) => ({ nummer, name, aktiv: true })),
        gruppen: [], anzahl_aktiv: KATALOG[bk].length, anzahl_gesamt: KATALOG[bk].length,
      });
    }

    if (/\/api\/baecker-order/.test(url)) {
      if (method === 'POST') {
        let body = {};
        try { body = JSON.parse(r.request().postData() || '{}'); } catch (e) { /* ignore */ }
        if (body.aktion === 'gedruckt') {
          return json({ success: true, gedruckt_am: '2026-09-12T10:43:00', meldung: 'Ausdruck vermerkt.' });
        }
        const braucht = body.baeckerei === 'freundl';
        return json({
          success: true, status: 1, protokoll: [],
          papierausdruck: braucht, druck_offen: braucht,
          positionen_druck: braucht
            ? KATALOG.freundl.map(([nummer, name], i) => ({ nummer, name, menge: (i + 1) * 10, retoure: 0 }))
            : [],
          meldung: 'Bestellung gesendet. 3 Positionen, 60 Stück.',
        });
      }
      if (/mode=uebersicht/.test(url)) {
        const tage = tagesleiste(opts);
        return json({
          success: true, tage,
          offen_gesamt: (opts.druckOffen || []).length + ((opts.erinnerung || {}).offen ? 1 : 0),
          erinnerung: opts.erinnerung
            || { offen: false, blinkt: false, datum: '', wochentag: '', bestellschluss: '12:00', baeckereien: [] },
        });
      }
      if (/mode=verlauf/.test(url)) {
        return json({ success: true, verlauf: (opts.verlauf || []) });
      }
      if (/mode=config/.test(url)) {
        return json({ success: true, config: { baeckereien: {} } });
      }
      if (!bk) return json({ success: false, error: 'Bitte angeben, um welche Bäckerei es geht.' }, 400);
      const datum = new URL(url).searchParams.get('datum') || tagNurFuer(bk).datum;
      return json({ success: true, bestellung: bestellung(bk, datum, opts) });
    }

    return json({ success: true, data: [], orders: [], threads: [] });
  });
}

async function openBaecker(page, opts = {}) {
  await mockApi(page, opts);
  await page.goto(KIOSK_URL);
  await page.click('.k-tab[data-tab="baecker"]');
  await page.waitForSelector('#panel-baecker .bk-days', { timeout: 15000 });
  await page.waitForTimeout(400);
}

/** Klickt das Tagesplättchen eines Datums an. */
async function tagWaehlen(page, datum) {
  await page.click(`#panel-baecker .bk-day[onclick*="${datum}"]`);
  await page.waitForTimeout(500);
}

test.describe('Zweite Bäckerei', () => {
  test.use({ serviceWorkers: 'block' });

  // ── F18: Der Liefertag bestimmt die Bäckerei ──────────────────────────

  test('TC-B2-F18-01: Ein-Bäckerei-Tag zeigt keine Auswahl', async ({ page }) => {
    await openBaecker(page);
    await tagWaehlen(page, tagNurFuer('martins').datum);
    await expect(page.locator('#panel-baecker .bk-btabs')).toHaveCount(0);
    await expect(page.locator('#panel-baecker .bk-stat .t1')).toContainText("Martin's Backstube");
  });

  test('TC-B2-F18-02: Tageswechsel schaltet die Bäckerei mit', async ({ page }) => {
    await openBaecker(page);
    await tagWaehlen(page, tagNurFuer('martins').datum);
    await expect(page.locator('#panel-baecker .bk-row').first()).toContainText('Semmel');

    await tagWaehlen(page, tagNurFuer('freundl').datum);
    await expect(page.locator('#panel-baecker .bk-stat .t1')).toContainText('Freundl');
    // Nr. 1 heißt jetzt Kaisersemmel – der Katalog wurde tatsächlich getauscht
    await expect(page.locator('#panel-baecker .bk-row').first()).toContainText('Kaisersemmel');
  });

  test('TC-B2-F18-03: Tagesleiste zeigt die Lieferanten', async ({ page }) => {
    await openBaecker(page);
    const sa = tagFuerBeide().datum;
    const samstag = page.locator(`#panel-baecker .bk-day[onclick*="${sa}"]`);
    await expect(samstag.locator('.bk-dot')).toHaveCount(2);
    const mo = tagNurFuer('martins').datum;
    await expect(page.locator(`#panel-baecker .bk-day[onclick*="${mo}"] .bk-dot`)).toHaveCount(1);
    await expect(page.locator(`#panel-baecker .bk-day[onclick*="${mo}"] .bk-dot-martins`)).toHaveCount(1);
  });

  // ── F19: Samstag ──────────────────────────────────────────────────────

  test('TC-B2-F19-01: Reiter nur an Tagen mit zwei Lieferanten', async ({ page }) => {
    await openBaecker(page);
    await tagWaehlen(page, tagNurFuer('freundl').datum);
    await expect(page.locator('#panel-baecker .bk-btabs')).toHaveCount(0);

    await tagWaehlen(page, tagFuerBeide().datum);
    await expect(page.locator('#panel-baecker .bk-btabs')).toHaveCount(1);
    await expect(page.locator('#panel-baecker .bk-btab')).toHaveCount(2);
  });

  test('TC-B2-F19-02: Stand je Reiter und „1 von 2"', async ({ page }) => {
    const sa = tagFuerBeide().datum;
    await openBaecker(page, { gesendet: [{ datum: sa, bk: 'freundl' }] });
    await tagWaehlen(page, sa);
    await expect(page.locator('.bk-btab-martins')).toContainText('offen');
    await expect(page.locator('.bk-btab-freundl')).toContainText('gesendet');
    await expect(page.locator(`#panel-baecker .bk-day[onclick*="${sa}"]`)).toContainText('1 von 2');
  });

  test('TC-B2-F19-03: Reiterwechsel tauscht den Katalog', async ({ page }) => {
    const sa = tagFuerBeide().datum;
    await openBaecker(page);
    await tagWaehlen(page, sa);
    await expect(page.locator('#panel-baecker .bk-row').first()).toContainText('Semmel');

    await page.click('.bk-btab-freundl');
    await page.waitForTimeout(600);
    await expect(page.locator('#panel-baecker .bk-row').first()).toContainText('Kaisersemmel');
    await expect(page.locator('#panel-baecker .bk-stat .t1')).toContainText('Freundl');
  });

  test('TC-B2-F19-05: Zähler zählt Bestellung und Ausdruck', async ({ page }) => {
    const fr = tagNurFuer('freundl').datum;
    await openBaecker(page, {
      druckOffen: [{ datum: fr, bk: 'freundl' }],
      erinnerung: { offen: true, blinkt: false, datum: fr, wochentag: 'Freitag', baeckereien: [NAME.freundl] },
    });
    await expect(page.locator('#badges-baecker .k-tab-badge')).toHaveText('2');
  });

  // ── F23: Papierausdruck ───────────────────────────────────────────────

  test('TC-B2-F23-02: Martin\'s hat keinen Druckschritt', async ({ page }) => {
    const mo = tagNurFuer('martins').datum;
    await openBaecker(page, { gesendet: [{ datum: mo, bk: 'martins' }] });
    await tagWaehlen(page, mo);
    await expect(page.locator('#panel-baecker .bk-stat')).not.toContainText('drucken');
    await expect(page.locator(`#panel-baecker .bk-day[onclick*="${mo}"]`)).not.toContainText('Ausdruck');
  });

  test('TC-B2-F23-03: offener Ausdruck ist sichtbar', async ({ page }) => {
    const fr = tagNurFuer('freundl').datum;
    await openBaecker(page, { druckOffen: [{ datum: fr, bk: 'freundl' }] });
    await tagWaehlen(page, fr);
    await expect(page.locator('#panel-baecker .bk-stat')).toContainText('Papierausdruck steht noch aus');
    // Der Druckknopf tritt an die Stelle von „Korrektur senden"
    await expect(page.locator('#panel-baecker .bk-stat .bk-cta')).toContainText('Jetzt drucken');
    await expect(page.locator('#panel-baecker .bk-stat')).not.toContainText('Korrektur senden');
  });

  test('TC-B2-F23-06: nach dem Druck wird der Ausdruck vermerkt', async ({ page }) => {
    const fr = tagNurFuer('freundl').datum;
    await openBaecker(page, { druckOffen: [{ datum: fr, bk: 'freundl' }] });
    await tagWaehlen(page, fr);
    // Ein echtes Druckfenster würde den Systemdialog öffnen und den Lauf
    // blockieren. Stattdessen ein Ersatz, der sich wie ein Fenster verhält und
    // mitschreibt, was hineingeschrieben wurde.
    await page.evaluate(() => {
      window.__gedruckt = '';
      window.open = () => ({
        document: {
          write(html) { window.__gedruckt = html; },
          close() {},
        },
      });
    });
    await page.click('#panel-baecker .bk-stat .bk-cta');
    await page.waitForTimeout(900);

    const html = await page.evaluate(() => window.__gedruckt);
    expect(html).toContain('Bestellung / Lieferschein');
    expect(html).toContain(NAME.freundl);
    expect(html).toContain('Kaisersemmel');
    expect(html).toContain('1190');          // Kd.-Nr. gehört aufs Blatt

    const gedruckt = page.__calls.filter((c) => c.body && c.body.aktion === 'gedruckt');
    expect(gedruckt.length).toBe(1);
    expect(gedruckt[0].body.baeckerei).toBe('freundl');
    expect(gedruckt[0].body.datum).toBe(fr);
  });

  test('TC-B2-F23-05: „Später drucken" vermerkt nichts', async ({ page }) => {
    const mo = tagNurFuer('freundl').datum;
    await openBaecker(page);
    await tagWaehlen(page, mo);
    await page.evaluate(() => { window.open = () => null; });
    await page.click('#panel-baecker .bk-stat .bk-cta');   // Vorschau öffnen
    await page.waitForTimeout(400);
    await page.click('#bk-send-btn');                      // senden
    await page.waitForTimeout(900);
    // Jetzt steht die Druckaufforderung -> „Später drucken"
    const spaeter = page.locator('.bk-dlg-btns .bk-btn:has-text("Später")');
    await expect(spaeter).toHaveCount(1);
    await spaeter.click();
    await page.waitForTimeout(500);
    const gedruckt = page.__calls.filter((c) => c.body && c.body.aktion === 'gedruckt');
    expect(gedruckt.length).toBe(0);
  });

  test('TC-B2-F23-01: Druckschritt erscheint nach dem Senden', async ({ page }) => {
    await openBaecker(page);
    await tagWaehlen(page, tagNurFuer('freundl').datum);
    await page.click('#panel-baecker .bk-stat .bk-cta');
    await page.waitForTimeout(400);
    await page.click('#bk-send-btn');
    await page.waitForTimeout(900);
    await expect(page.locator('.bk-druck-schritte')).toHaveCount(1);
    await expect(page.locator('.bk-druck-schritte')).toContainText('Ausdruck für den Ordner');
    await expect(page.locator('.bk-dlg-btns')).toContainText('Jetzt drucken');
  });

  test('TC-B2-F23-04: Nachdruck aus dem Verlauf', async ({ page }) => {
    const fr = tagNurFuer('freundl').datum;
    await openBaecker(page, {
      verlauf: [{
        datum: fr, datum_de: fr.split('-').reverse().join('.'), wochentag: 'Freitag',
        baeckerei: 'freundl', baeckerei_name: NAME.freundl, status: 1,
        positionen: 3, stueck: 60, protokoll: [{ zeit: fr + 'T11:38:00', wer: 'Anna' }],
        gedruckt_am: '', papierausdruck: true, druck_offen: true,
      }],
    });
    await page.click('#panel-baecker .k-filter-btn:has-text("Verlauf")');
    await page.waitForTimeout(700);
    await expect(page.locator('.bk-hist')).toContainText(NAME.freundl);
    await expect(page.locator('.bk-hist-druck')).toHaveCount(1);
    await expect(page.locator('.bk-hist-druck')).toContainText('Drucken');
  });

  // ── F17: Trennung über die API ────────────────────────────────────────

  test('TC-B2-F17-02: Kiosk fragt immer mit Bäckerei', async ({ page }) => {
    const gesehen = [];
    await mockApi(page);
    page.on('request', (r) => {
      if (/baecker-(order|artikel)/.test(r.url()) && r.method() === 'GET'
          && !/mode=(uebersicht|verlauf|config)/.test(r.url())) {
        gesehen.push(r.url());
      }
    });
    await page.goto(KIOSK_URL);
    await page.click('.k-tab[data-tab="baecker"]');
    await page.waitForSelector('#panel-baecker .bk-days', { timeout: 15000 });
    await page.waitForTimeout(700);
    expect(gesehen.length).toBeGreaterThan(0);
    // Kein einziger Einzelabruf ohne Bäckerei – sonst träfe er den falschen Katalog
    const ohne = gesehen.filter((u) => !/baeckerei=/.test(u));
    expect(ohne).toEqual([]);
  });

  // ── F26: Responsive ───────────────────────────────────────────────────

  test('TC-B2-F26-01: kein horizontales Scrollen am Samstag', async ({ page }) => {
    await openBaecker(page);
    await tagWaehlen(page, tagFuerBeide().datum);
    const zuBreit = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    expect(zuBreit).toBe(false);
  });

  test('TC-B2-F26-02: Reiter sind groß genug zum Antippen', async ({ page }) => {
    await openBaecker(page);
    await tagWaehlen(page, tagFuerBeide().datum);
    const hoehen = await page.$$eval('#panel-baecker .bk-btab',
      (n) => n.map((x) => x.getBoundingClientRect().height));
    expect(hoehen.length).toBe(2);
    hoehen.forEach((h) => expect(h).toBeGreaterThanOrEqual(44));
  });

  test('TC-B2-F26-04: keine nativen Dialoge', async ({ page }) => {
    await openBaecker(page);
    await page.evaluate(() => {
      window.__nativ = 0;
      window.alert = () => { window.__nativ++; };
      window.confirm = () => { window.__nativ++; return true; };
    });
    await tagWaehlen(page, tagFuerBeide().datum);
    await page.click('.bk-btab-freundl');
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.__nativ)).toBe(0);
  });

  // ── F27: Bestellt wird nur für künftige Liefertage ────────────────────

  test('TC-B2-F27-01: heute lässt sich nicht bestellen', async ({ page }) => {
    // Reale Panne: Am Montag wurde versehentlich eine Bestellung FÜR Montag
    // abgeschickt. Die Ware war da längst geliefert.
    await openBaecker(page);
    const heute = iso(plusTage(0));
    const chip = page.locator(`#panel-baecker .bk-day[onclick*="${heute}"]`);
    if (await chip.count()) {
      await chip.click();
      await page.waitForTimeout(700);
      await expect(page.locator('#panel-baecker .bk-stat')).toContainText('geliefert');
      // Weder in der Statuskarte noch in der Fußzeile darf gesendet werden
      await expect(page.locator('#panel-baecker .bk-stat .bk-cta')).toHaveCount(0);
      await expect(page.locator('#panel-baecker .bk-send')).toHaveCount(0);
    }
  });

  test('TC-B2-F27-02: Vorauswahl ist nie heute, sondern ein künftiger Liefertag', async ({ page }) => {
    // Früher startete der Kiosk stur beim nächsten Liefertag – auch wenn dort
    // längst gesendet war. Man landete auf „gesendet" und hatte nichts zu tun.
    // Seit F31 folgt die Vorauswahl der Arbeit. Unverändert gilt: niemals
    // heute, denn für heute ist die Ware längst da.
    const naechster = [1, 2, 3, 4, 5, 6, 7]
      .map((n) => plusTage(n))
      .find((d) => liefertAm(d).length > 0);
    await openBaecker(page, { gesendet: [{ datum: iso(naechster), bk: liefertAm(naechster)[0] }] });
    const aktiv = page.locator('#panel-baecker .bk-day.active');
    await expect(aktiv).toHaveCount(1);
    const auf = await aktiv.getAttribute('onclick');
    expect(auf).not.toContain(iso(plusTage(0)));      // niemals heute
    // Der gesendete Tag wird übersprungen – dort gibt es nichts mehr zu tun.
    expect(auf).not.toContain(iso(naechster));
  });

  test('TC-B2-F27-03: Zähler nennt im Klartext, was offen ist', async ({ page }) => {
    const morgen = plusTage(1);
    await openBaecker(page, {
      erinnerung: {
        offen: true, blinkt: true, datum: iso(morgen), wochentag: TAGE[morgen.getDay()],
        bestellschluss: '12:00', baeckereien: [NAME.martins],
      },
    });
    const hinweis = page.locator('#panel-baecker .bk-offen');
    await expect(hinweis).toHaveCount(1);
    await expect(hinweis).toContainText('noch offen');
    await expect(hinweis).toContainText('Bestellschluss war um 12:00');
  });

  // ── F28: Verlauf zeigt die bestellten Artikel ─────────────────────────

  test('TC-B2-F28-01: Verlauf zeigt die Artikel als Liste', async ({ page }) => {
    const fr = tagNurFuer('freundl').datum;
    const eintrag = {
      datum: fr, datum_de: fr.split('-').reverse().join('.'), wochentag: 'Freitag',
      baeckerei: 'freundl', baeckerei_name: NAME.freundl, status: 1,
      positionen: 3, stueck: 60, protokoll: [{ zeit: fr + 'T11:38:00', wer: 'Anna' }],
      gedruckt_am: '', papierausdruck: true, druck_offen: false,
    };
    const abrufe = [];
    await mockApi(page, { verlauf: [eintrag] });
    page.on('request', (r) => { if (/baecker-order\?.*datum=/.test(r.url())) abrufe.push(r.url()); });
    await page.goto(KIOSK_URL);
    await page.click('.k-tab[data-tab="baecker"]');
    await page.waitForSelector('#panel-baecker .bk-days', { timeout: 15000 });
    await page.click('#panel-baecker .k-filter-btn:has-text("Verlauf")');
    await page.waitForTimeout(700);

    // Vor dem Aufklappen wird nichts nachgeladen – der Verlauf bleibt schlank
    const vorher = abrufe.length;
    await expect(page.locator('.bk-hist-tab')).toHaveCount(0);

    await page.click('.bk-hist .m');
    await page.waitForTimeout(800);
    await expect(page.locator('.bk-hist-tab')).toHaveCount(1);
    await expect(page.locator('.bk-hist-tab tbody tr')).toHaveCount(3);
    await expect(page.locator('.bk-hist-tab')).toContainText('Kaisersemmel');
    expect(abrufe.length).toBeGreaterThan(vorher);

    // Zuklappen und erneut öffnen darf NICHT erneut laden
    await page.click('.bk-hist .m');
    await page.waitForTimeout(400);
    await expect(page.locator('.bk-hist-tab')).toHaveCount(0);
    const zwischen = abrufe.length;
    await page.click('.bk-hist .m');
    await page.waitForTimeout(600);
    await expect(page.locator('.bk-hist-tab')).toHaveCount(1);
    expect(abrufe.length).toBe(zwischen);
  });

  test('TC-B2-F28-02: Positionen sind nach Nummer sortiert', async ({ page }) => {
    const fr = tagNurFuer('freundl').datum;
    await mockApi(page, { verlauf: [{
      datum: fr, datum_de: fr.split('-').reverse().join('.'), wochentag: 'Freitag',
      baeckerei: 'freundl', baeckerei_name: NAME.freundl, status: 1,
      positionen: 3, stueck: 60, protokoll: [], gedruckt_am: '',
      papierausdruck: false, druck_offen: false,
    }] });
    await page.goto(KIOSK_URL);
    await page.click('.k-tab[data-tab="baecker"]');
    await page.waitForSelector('#panel-baecker .bk-days', { timeout: 15000 });
    await page.click('#panel-baecker .k-filter-btn:has-text("Verlauf")');
    await page.waitForTimeout(700);
    await page.click('.bk-hist .m');
    await page.waitForTimeout(800);
    const nummern = await page.$$eval('.bk-hist-tab td.nr',
      (n) => n.map((x) => parseInt(x.textContent, 10)).filter((x) => !isNaN(x)));
    expect(nummern.length).toBeGreaterThan(1);
    expect(nummern).toEqual([...nummern].sort((a, b) => a - b));
  });
});

// ════════════════════════════════════════════════════════════
//  F29 – Startwerte aus den Rechnungen (Martin's Backstube)
// ════════════════════════════════════════════════════════════
// Für Martins liegen keine alten Bestellzettel vor, nur Rechnungen. Die
// fassen je eine ganze Woche zusammen – eine wochentaggenaue Vorlage lässt
// sich daraus nicht gewinnen, wohl aber ein Durchschnitt je Liefertag.
// Er dient als Starthilfe, bis die erste eigene Bestellung gesendet ist.

test.describe('Bäcker – Startwerte aus Rechnungen (F29)', () => {
  // Ohne diese Zeile beantwortet der Service Worker der PWA die API-Aufrufe
  // und die Mock-Routen greifen nicht – der Tab bliebe leer.
  test.use({ serviceWorkers: 'block' });

  test('TC-F29-01: Statuszeile nennt die Rechnungen statt "keine Vorlage"', async ({ page }) => {
    await openBaecker(page, { startwerte: true });
    await tagWaehlen(page, tagNurFuer('martins').datum);
    const zeile = page.locator('#panel-baecker .bk-stat .t2');
    await expect(zeile).toContainText('Startwerte aus 11 Rechnungen');
    await expect(zeile).not.toContainText('keine Vorlage vorhanden');
  });

  test('TC-F29-02: Kein Wochenschnitt mehr in der Zeile', async ({ page }) => {
    // Der Wochenschnitt war irreführend: Er stand neben einem Tagesfeld und
    // sah aus wie eine Tagesmenge. Angezeigt gehören nur die tatsächlichen
    // Mengen der letzten Lieferungen an genau diesem Wochentag.
    await openBaecker(page, { startwerte: true });
    await tagWaehlen(page, tagNurFuer('martins').datum);
    await expect(page.locator('#panel-baecker .bk-row').first()).toBeVisible();
    const panel = await page.locator('#panel-baecker').innerText();
    expect(panel).not.toContain('Ø Wo');
  });

  test('TC-F29-03: Freundl bleibt bei der echten Vorlage', async ({ page }) => {
    await openBaecker(page, { startwerte: true });
    await tagWaehlen(page, tagNurFuer('freundl').datum);
    const zeile = page.locator('#panel-baecker .bk-stat .t2');
    await expect(zeile).toContainText('01.09.2026');
    await expect(zeile).not.toContainText('Startwerte aus');
  });
});

// ── F30: Liefertag klar benennen, Eingaben still sichern ────────────────
//
// Zwei gemeldete Probleme aus dem Laden:
//  1. Unklar, wofür die Tagesplättchen stehen – es sind LIEFERtage, bestellt
//     wird am Tag davor. „Warum muss ich samstags auswählen, um für Samstag
//     zu erfassen?“
//  2. Ein Neuladen der Seite warf alle erfassten Mengen weg. Sie lagen nur im
//     Speicher des Browsers, bis jemand „Entwurf speichern“ drückte.

test.describe('Bäcker – Liefertag und stille Sicherung (F30)', () => {
  test.use({ serviceWorkers: 'block' });

  test('TC-F30-01: Tagesleiste ist als Liefertag beschriftet', async ({ page }) => {
    await openBaecker(page);
    await expect(page.locator('#panel-baecker .bk-days-lbl')).toContainText('Liefertag wählen');
  });

  test('TC-F30-02: Statuszeile sagt „Lieferung am", nicht „Bestellung für"', async ({ page }) => {
    await openBaecker(page);
    await tagWaehlen(page, tagNurFuer('martins').datum);
    const t1 = page.locator('#panel-baecker .bk-stat .t1');
    await expect(t1).toContainText('Lieferung am');
    await expect(t1).not.toContainText('Bestellung für');
  });

  test('TC-F30-03: Statuszeile nennt den Bestelltag', async ({ page }) => {
    await openBaecker(page);
    const tag = tagNurFuer('martins');
    await tagWaehlen(page, tag.datum);
    const bs = new Date(tag.datum + 'T12:00:00');
    bs.setDate(bs.getDate() - 1);
    const bsDe = bs.toISOString().slice(0, 10).split('-').reverse().join('.');
    const t2 = await page.locator('#panel-baecker .bk-stat .t2').innerText();
    // Entweder der Vortag steht da oder – wenn er heute ist – „heute bestellen“
    expect(t2.includes(bsDe) || t2.includes('heute bestellen')).toBeTruthy();
  });

  test('TC-F30-04: Eine geänderte Menge wird ohne Zutun gesichert', async ({ page }) => {
    await openBaecker(page);
    await tagWaehlen(page, tagBestellbarFuer('martins').datum);
    const vorher = page.__calls.filter((c) => c.method === 'POST').length;
    await page.locator('#panel-baecker .bk-row .step button').nth(1).click();
    // 1,5 s Ruhe, dann geht der Entwurf raus – niemand muss etwas drücken.
    await page.waitForTimeout(2600);
    const nachher = page.__calls.filter((c) => c.method === 'POST');
    expect(nachher.length).toBeGreaterThan(vorher);
    expect(nachher[nachher.length - 1].body.positionen).toBeTruthy();
    await expect(page.locator('#panel-baecker .bk-autosave')).toContainText('gesichert');
  });

  test('TC-F30-05: Schnelle Klicks lösen nur eine Sicherung aus', async ({ page }) => {
    await openBaecker(page);
    await tagWaehlen(page, tagBestellbarFuer('martins').datum);
    const vorher = page.__calls.filter((c) => c.method === 'POST').length;
    const plus = page.locator('#panel-baecker .bk-row .step button').nth(1);
    for (let i = 0; i < 5; i++) await plus.click();
    await page.waitForTimeout(2600);
    const neu = page.__calls.filter((c) => c.method === 'POST').length - vorher;
    expect(neu).toBe(1);
  });

  test('TC-F30-06: Die gesicherten Mengen enthalten die Eingabe', async ({ page }) => {
    // Der eigentliche Schaden: Nach einem Reload fing die Verkäuferin von
    // vorne an. Was still gesichert wird, muss die erfassten Mengen tragen.
    await openBaecker(page);
    await tagWaehlen(page, tagBestellbarFuer('martins').datum);
    await page.locator('#panel-baecker .bk-row .step button').nth(1).click();
    await page.waitForTimeout(2600);
    const posts = page.__calls.filter((c) => c.method === 'POST');
    const entwurf = posts[posts.length - 1].body.positionen;
    expect(entwurf.some((p) => (p.menge || 0) > 0)).toBeTruthy();
  });
});



// ── F31: Der Tab landet dort, wo heute Arbeit liegt ─────────────────────
//
// Gemeldet: „Ich muss auf Dienstag gehen, um die Lieferung für Dienstag
// anzusehen, und es steht gesendet Dienstag. Dienstags möchte ich die
// Bestellung für Mittwoch anlegen."
//
// Die Vorauswahl nahm stur den nächsten Liefertag – am Montag also den
// Dienstag, dessen Bestellung längst raus war. Man landete auf „gesendet"
// und hatte nichts zu tun. Massgeblich ist jetzt der Bestellschluss:
// Der Tag, der HEUTE bestellt werden muss, steht vorne.

test.describe('Bäcker – Vorauswahl folgt der Arbeit (F31)', () => {
  test.use({ serviceWorkers: 'block' });

  /** Der morgige Liefertag – seine Bestellung ist heute fällig. */
  function morgen() {
    const d = plusTage(1);
    return { datum: iso(d), bk: liefertAm(d)[0] };
  }

  test('TC-F31-01: Ohne Bestellung steht der heute fällige Tag vorne', async ({ page }) => {
    await openBaecker(page);
    const m = morgen();
    await expect(page.locator('#panel-baecker .bk-day.active')).toHaveAttribute(
      'onclick', new RegExp(m.datum));
    await expect(page.locator('#panel-baecker .bk-stat .t1')).toContainText('Lieferung am');
  });

  test('TC-F31-02: Der fällige Tag ist als „heute bestellen" markiert', async ({ page }) => {
    await openBaecker(page);
    const faellig = page.locator('#panel-baecker .bk-day.faellig');
    await expect(faellig).toHaveCount(1);
    await expect(faellig).toContainText('heute bestellen');
    await expect(faellig).toHaveAttribute('onclick', new RegExp(morgen().datum));
  });

  test('TC-F31-03: Ist morgen gesendet, springt er auf den nächsten offenen Tag', async ({ page }) => {
    // Genau der gemeldete Fall: Montag, Dienstag ist raus – nicht dort landen.
    const m = morgen();
    await openBaecker(page, { gesendet: [{ datum: m.datum, bk: m.bk }] });
    const aktiv = page.locator('#panel-baecker .bk-day.active');
    await expect(aktiv).not.toHaveAttribute('onclick', new RegExp(m.datum));
    // Und der Tag, auf dem er landet, hat wirklich noch offene Arbeit.
    await expect(aktiv).not.toContainText('gesendet');
  });

  test('TC-F31-04: Ein gesendeter Tag nennt den Liefertag, nicht den Sendetag', async ({ page }) => {
    // „Gesendet – Dienstag" las sich wie „am Dienstag gesendet".
    const m = morgen();
    await openBaecker(page, { gesendet: [{ datum: m.datum, bk: m.bk }] });
    await tagWaehlen(page, m.datum);
    const t1 = page.locator('#panel-baecker .bk-stat .t1');
    await expect(t1).toContainText('Gesendet – Lieferung am');
    await expect(page.locator('#panel-baecker .bk-stat .t2')).toContainText('abgeschickt');
  });

  test('TC-F31-05: Das Plättchen verrät im Tooltip den Bestelltag', async ({ page }) => {
    await openBaecker(page);
    const titel = await page.locator('#panel-baecker .bk-day.faellig').getAttribute('title');
    expect(titel).toContain('zu bestellen bis');
    expect(titel).toContain('Lieferung');
  });
});

// ── F33: Ein Farbschema statt buntem Mischmasch ─────────────────────────
//
// Gemeldet: „Dieses Farbschema bitte komplett bei Bäcker anwenden und nicht
// diesen bunten Mischmasch."
//
// Vorher trug jeder Zustand seine eigene Farbe: bernstein als Grundton, grün
// für gesendet, blau für den Ausdruck, orange für fällig, rot für spät – und
// Freundl/Martin's waren gegenüber dem Entwurf sogar vertauscht. Jetzt führt
// jede Bäckerei EINE Leitfarbe (Freundl petrol, Martin's bernstein), gesetzt
// als Klasse am Panel; alle Bausteine ziehen ihre Werte per CSS-Variable.

test.describe('Bäcker – einheitliches Farbschema (F33)', () => {
  test.use({ serviceWorkers: 'block' });

  const LEIT = { freundl: 'rgb(15, 118, 110)', martins: 'rgb(180, 83, 9)' };

  async function leitfarbe(page) {
    return page.evaluate(() => getComputedStyle(
      document.getElementById('panel-baecker')).getPropertyValue('--bk').trim());
  }

  test('TC-F33-01: Freundl führt petrol', async ({ page }) => {
    await openBaecker(page);
    await tagWaehlen(page, tagNurFuer('freundl').datum);
    await expect(page.locator('#panel-baecker')).toHaveClass(/bk-freundl/);
    expect(await leitfarbe(page)).toBe('#0f766e');
  });

  test('TC-F33-02: Martin\u2019s führt bernstein', async ({ page }) => {
    await openBaecker(page);
    await tagWaehlen(page, tagNurFuer('martins').datum);
    await expect(page.locator('#panel-baecker')).toHaveClass(/bk-martins/);
    expect(await leitfarbe(page)).toBe('#b45309');
  });

  test('TC-F33-03: Der Wechsel der Bäckerei färbt den Tab um', async ({ page }) => {
    await openBaecker(page);
    await tagWaehlen(page, tagNurFuer('freundl').datum);
    const a = await leitfarbe(page);
    await tagWaehlen(page, tagNurFuer('martins').datum);
    const b = await leitfarbe(page);
    expect(a).not.toBe(b);
  });

  test('TC-F33-04: Statuskarte und Tagesleiste folgen der Leitfarbe', async ({ page }) => {
    await openBaecker(page);
    await tagWaehlen(page, tagNurFuer('martins').datum);
    // Die Statuskarte darf keine Fremdfarbe mehr mitbringen.
    const rand = await page.locator('#panel-baecker .bk-stat').evaluate(
      (el) => getComputedStyle(el).borderTopColor);
    expect(rand).not.toBe(LEIT.freundl);
    // Der gewählte Tag ist neutral dunkel, nicht in einer dritten Farbe.
    const aktiv = await page.locator('#panel-baecker .bk-day.active').evaluate(
      (el) => getComputedStyle(el).backgroundColor);
    expect(aktiv).toBe('rgb(31, 41, 55)');
  });

  test('TC-F33-05: Die Punkte je Bäckerei bleiben unterscheidbar', async ({ page }) => {
    await openBaecker(page);
    const f = await page.locator('#panel-baecker .bk-dot-freundl').first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    const m = await page.locator('#panel-baecker .bk-dot-martins').first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(f).toBe(LEIT.freundl);
    expect(m).toBe(LEIT.martins);
  });
});

// ── F34: Korrektur beim Bäcker wie beim Metzger ─────────────────────────
//
// Gemeldet: „Korrigieren bei Metzger Mair ist besser und verständlicher
// gelöst als bei Bäcker. Kannst du dies harmonisieren?"
//
// Beim Bäcker hiess der Knopf „Korrektur senden", schaltete aber nur die
// Felder frei – gesendet wurde nichts. Jetzt heisst er „Korrigieren", genau
// wie beim Metzger; gesendet wird erst im zweiten Schritt.

test.describe('Bäcker – Korrektur wie beim Metzger (F34)', () => {
  test.use({ serviceWorkers: 'block' });

  /** Ein gesendeter Tag, der sich noch korrigieren lässt. */
  async function gesendeterTag(page) {
    const d = plusTage(1);
    const bk = liefertAm(d)[0];
    await openBaecker(page, { gesendet: [{ datum: iso(d), bk: bk }] });
    await tagWaehlen(page, iso(d));
    return { datum: iso(d), bk: bk };
  }

  test('TC-F34-01: Der Knopf heisst „Korrigieren", nicht „Korrektur senden"', async ({ page }) => {
    await gesendeterTag(page);
    const karte = page.locator('#panel-baecker .bk-stat');
    await expect(karte.locator('button', { hasText: 'Korrigieren' })).toBeVisible();
    await expect(karte.locator('button', { hasText: /^.*Korrektur senden.*$/ })).toHaveCount(0);
  });

  test('TC-F34-02: „Korrigieren" gibt die Felder frei, ohne zu senden', async ({ page }) => {
    await gesendeterTag(page);
    const gesperrt = await page.locator('#panel-baecker .bk-row .step input')
      .first().getAttribute('readonly');
    expect(gesperrt).not.toBeNull();
    await page.locator('#panel-baecker .bk-stat button', { hasText: 'Korrigieren' }).click();
    await page.waitForTimeout(400);
    expect(await page.locator('#panel-baecker .bk-row .step input')
      .first().getAttribute('readonly')).toBeNull();
    // Erst jetzt darf gesendet werden – und der Ausstieg steht daneben.
    await expect(page.locator('#panel-baecker .bk-stat button', { hasText: 'Korrektur senden' })).toBeVisible();
    await expect(page.locator('#panel-baecker .bk-stat button', { hasText: 'Verwerfen' })).toBeVisible();
  });

  test('TC-F34-03: Ohne Änderung wird nichts verschickt', async ({ page }) => {
    await gesendeterTag(page);
    await page.locator('#panel-baecker .bk-stat button', { hasText: 'Korrigieren' }).click();
    await page.waitForTimeout(400);
    await page.locator('#panel-baecker .bk-stat button', { hasText: 'Korrektur senden' }).click();
    await page.waitForTimeout(700);
    // Kein Vorschaudialog – stattdessen ein Hinweis.
    await expect(page.locator('.bk-dlg-h')).toHaveCount(0);
  });

  test('TC-F34-04: „Verwerfen" schliesst die Korrektur wieder', async ({ page }) => {
    await gesendeterTag(page);
    await page.locator('#panel-baecker .bk-stat button', { hasText: 'Korrigieren' }).click();
    await page.waitForTimeout(400);
    await page.locator('#panel-baecker .bk-stat button', { hasText: 'Verwerfen' }).click();
    await page.waitForTimeout(900);
    await expect(page.locator('#panel-baecker .bk-stat button', { hasText: 'Korrigieren' })).toBeVisible();
  });

  test('TC-F34-05: Nach dem Drucken steht keine "undefined"-Angabe da', async ({ page }) => {
    // Der Druckvermerk wird VORNE ins Protokoll gestellt und traegt weder
    // Positionen noch Stueckzahl. Wer stumpf den ersten Eintrag nimmt,
    // schreibt „undefined Positionen" an.
    const d = plusTage(1);
    const bk = liefertAm(d)[0];
    await openBaecker(page, { gesendet: [{ datum: iso(d), bk: bk }], druckVermerk: true });
    await tagWaehlen(page, iso(d));
    const txt = await page.locator('#panel-baecker .bk-stat').innerText();
    expect(txt).not.toContain('undefined');
  });
});