/**
 * Mittagstisch – telefonische Bestellung für die folgenden Tage
 *
 * Aus dem Laden: „Es sollte auch möglich sein eine telefonische Bestellung
 * für die folgenden Tage erfassen zu können. Es wird momentan immer das
 * Menü des heutigen Tages angezeigt."
 *
 * Die Gerichteauswahl las `new Date()` statt den gewählten Tagesreiter.
 * Schwerer wog die Folge: Das Datum der Bestellung stammte aus dem Gericht
 * (`selectedDish.dl_datum || today()`), also wurde sie auch noch auf heute
 * gebucht — unter dem gewählten Tag tauchte sie nie auf.
 *
 * Ausführen (lokaler Server aus static-site/ auf 8099):
 *   $env:TEST_URL='http://127.0.0.1:8099'
 *   node node_modules\@playwright\test\cli.js test tests/kiosk-mittag-tagwahl.spec.js
 */

const { test, expect } = require('./_kiosk-angemeldet');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

function iso(d) {
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)
    + '-' + ('0' + d.getDate()).slice(-2);
}
function plusTage(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
/** Dataverse-Wert des Wochentags: 101000 = Montag … 101005 = Samstag. */
function wtWert(d) {
  const t = d.getDay();
  return t === 0 ? null : 100999 + t;
}
/** ISO-Kalenderwoche – dieselbe Rechnung wie im Kiosk. */
function isoWoche(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const tag = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - tag);
  const start = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return {
    kw: Math.ceil((((t - start) / 86400000) + 1) / 7),
    jahr: t.getUTCFullYear(),
  };
}

const HEUTE = plusTage(0);
const MORGEN = plusTage(1);

function gericht(datum, name, preis) {
  const w = isoWoche(datum);
  return {
    dl_wochenplanid: 'wp-' + iso(datum),
    dl_gericht: name,
    dl_preis: preis,
    /* MIT Zeitanteil, genau wie Dataverse liefert ("2026-09-25T00:00:00Z").
       Mein erster Mock schrieb nur "2026-09-25" - damit ging der
       Vergleich im Kiosk scheinbar auf, und der gemeldete Fehler
       ("Es wird kein Gericht vorgeblendet") blieb unentdeckt. */
    dl_datum: iso(datum) + 'T00:00:00Z',
    dl_wochentag: wtWert(datum),
    dl_kalenderwoche: w.kw,
    dl_jahr: w.jahr,
    dl_status: 101001,
  };
}

const HEUTE_GERICHT = gericht(HEUTE, 'Heutiges Schnitzel mit Pommes', 9.8);
const MORGEN_GERICHT = gericht(MORGEN, 'Morgiger Schweinebraten mit Knödel', 10.4);

/** Sammelt die gesendeten Bestellungen. */
function sammle(page) {
  const raus = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && /lunch-order/.test(r.url())) {
      try { raus.push(JSON.parse(r.postData() || '{}')); } catch (e) { /* egal */ }
    }
  });
  return raus;
}

async function mockApi(page, gerichte) {
  const j = (o) => ({ status: 200, contentType: 'application/json',
    body: JSON.stringify(o) });

  await page.route('**/api/wochenplan**', (route) => {
    /* Der Server liefert je Abruf NUR die angefragte Woche – genau daran
       hängt der Nachladeweg für Tage der Folgewoche. Bildet der Mock das
       nicht nach, prüft der Test die halbe Wahrheit. */
    const url = route.request().url();
    const filter = decodeURIComponent(
      (url.match(/\$filter=([^&]*)/) || [])[1] || '');
    const kw = (filter.match(/dl_kalenderwoche eq (\d+)/) || [])[1];
    const daten = kw
      ? gerichte.filter((g) => String(g.dl_kalenderwoche) === kw)
      : gerichte.filter((g) => g.dl_kalenderwoche === isoWoche(HEUTE).kw);
    return route.fulfill(j({ success: true, data: daten }));
  });

  await page.route('**/api/lunch-order**', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill(j({ success: true, bestellnummer: 'MT-TEST-1' }));
    }
    return route.fulfill(j({ success: true, orders: [] }));
  });
  await page.route('**/api/stammkunden**', (route) =>
    route.fulfill(j({ success: true, customers: [] })));
  await page.route('**/api/cms-config**', (route) =>
    route.fulfill(j({ success: true, data: { bestellschluss_uhr: '11:00' } })));
  await page.route('**/api/**', (route) => {
    if (/wochenplan|lunch-order|stammkunden|cms-config/.test(route.request().url())) {
      return route.fallback();
    }
    return route.fulfill(j({ success: true }));
  });
}

/** Kiosk öffnen, einen Tag wählen und den Dialog „Neue Bestellung" zeigen. */
async function oeffneDialog(page, zielDatum, gerichte) {
  await mockApi(page, gerichte || [HEUTE_GERICHT, MORGEN_GERICHT]);
  await page.goto(KIOSK_URL);
  await page.waitForTimeout(2200);
  await page.evaluate(() => window.K.switchTab('mittag'));
  await page.waitForTimeout(1000);
  if (zielDatum) {
    await page.evaluate((d) => window.K.setMittagDatum(d), zielDatum);
    await page.waitForTimeout(700);
  }
  await page.evaluate(() => window.K.openNewOrder());
  await page.locator('#no-kunde-search').waitFor({ state: 'visible', timeout: 8000 });
  await page.waitForTimeout(700);
}

async function gerichteImDialog(page) {
  return page.evaluate(() => [...document.querySelectorAll('#no-dishes .k-dish-opt')]
    .map((el) => el.querySelector('.do-name').textContent.trim()));
}

test.describe('Mittagstisch – Telefonbestellung für einen anderen Tag', () => {

  test('TC-TW-01: Der Dialog zeigt das Menü des GEWÄHLTEN Tages',
    async ({ page }) => {
      // Der gemeldete Fall: Reiter „Morgen", aber das heutige Menü stand da.
      await oeffneDialog(page, iso(MORGEN));
      const namen = await gerichteImDialog(page);
      expect(namen, 'das morgige Gericht fehlt').toContain(MORGEN_GERICHT.dl_gericht);
      expect(namen, 'das heutige Gericht gehört nicht hierher')
        .not.toContain(HEUTE_GERICHT.dl_gericht);
    });

  test('TC-TW-02: Für heute bleibt es beim heutigen Menü', async ({ page }) => {
    // Die Gegenprobe – der Normalfall darf nicht kaputtgehen.
    await oeffneDialog(page, iso(HEUTE));
    const namen = await gerichteImDialog(page);
    expect(namen).toContain(HEUTE_GERICHT.dl_gericht);
    expect(namen).not.toContain(MORGEN_GERICHT.dl_gericht);
  });

  test('TC-TW-03: Die Bestellung wird auf den gewählten Tag gebucht',
    async ({ page }) => {
      /* Der eigentliche Schaden: Das Datum stammte aus dem Gericht. Eine
         Bestellung für morgen landete auf heute und war unter dem
         gewählten Reiter nicht zu finden. */
      await oeffneDialog(page, iso(MORGEN));
      const gesendet = sammle(page);
      await page.locator('#no-dishes .k-dish-opt').first().click();
      await page.locator('#no-kunde-search').fill('Frau Huber');
      await page.evaluate(() => window.K.submitNewOrder());
      await page.waitForTimeout(900);

      expect(gesendet.length, 'nichts gesendet').toBe(1);
      expect(gesendet[0].datum, 'auf den falschen Tag gebucht').toBe(iso(MORGEN));
      expect(gesendet[0].gericht).toBe(MORGEN_GERICHT.dl_gericht);
      expect(gesendet[0].quelle, 'telefonisch erfasst').toBe(1);
    });

  test('TC-TW-04: Der Dialog schreibt den Liefertag an', async ({ page }) => {
    // Ohne diese Zeile ist am Dialog nicht zu sehen, für welchen Tag
    // erfasst wird – der Tagesreiter liegt dahinter verdeckt.
    await oeffneDialog(page, iso(MORGEN));
    const text = await page.locator('#no-tag').innerText();
    expect(text).toContain('Liefertag');
    const tag = ('0' + MORGEN.getDate()).slice(-2) + '.'
      + ('0' + (MORGEN.getMonth() + 1)).slice(-2) + '.';
    expect(text, `${tag} fehlt in „${text}"`).toContain(tag);
  });

  test('TC-TW-05: Ohne Gericht für den Tag wird nichts Falsches angeboten',
    async ({ page }) => {
      /* Früher fiel die Liste auf ALLE Gerichte zurück. Wer nicht genau
         hinsah, bestellte ein Gericht, das es an dem Tag gar nicht gibt. */
      await oeffneDialog(page, iso(MORGEN), [HEUTE_GERICHT]);
      const namen = await gerichteImDialog(page);
      expect(namen, 'fremdes Gericht angeboten').toHaveLength(0);
      await expect(page.locator('#no-dishes')).toContainText('kein Gericht');
    });

  test('TC-TW-06: Ein Tag der Folgewoche lädt seinen eigenen Plan',
    async ({ page }) => {
      /* Der Standardabruf liefert nur die laufende Woche, die Tagesleiste
         reicht aber fünf Tage voraus. Für Tage jenseits der Wochengrenze
         muss der Plan nachgeladen werden. */
      const spaet = plusTage(5);
      const spaetGericht = gericht(spaet, 'Gericht der Folgewoche', 11.2);
      await oeffneDialog(page, iso(spaet),
        [HEUTE_GERICHT, MORGEN_GERICHT, spaetGericht]);

      const namen = await gerichteImDialog(page);
      if (isoWoche(spaet).kw === isoWoche(HEUTE).kw) {
        // Fällt der Tag noch in dieselbe Woche, greift der Normalweg.
        expect(namen).toContain(spaetGericht.dl_gericht);
      } else {
        expect(namen, 'Plan der Folgewoche nicht nachgeladen')
          .toContain(spaetGericht.dl_gericht);
        expect(namen).not.toContain(HEUTE_GERICHT.dl_gericht);
      }
    });
});
