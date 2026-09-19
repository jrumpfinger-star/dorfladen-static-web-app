/**
 * Bestellungen löschen + Status je Liefertag (Bäcker und Metzger)
 *
 * Deckt specs/bestellung-loeschen/spec.md ab (TC-D01 … TC-D16).
 *
 * Aus dem Laden: „Es sollte auch möglich sein, bei Bäcker und Metzger
 * bestehende Bestellungen zu löschen, da dies z. B. nur Testbestellungen
 * waren." Und: „Es sollte auch hier der Status der Bestellung angezeigt
 * werden … Es sollten die letzten 3 Bestellungen auch angezeigt werden,
 * … aber nur im Read Modus."
 *
 * Ausführen (lokaler Server aus static-site/ auf 8811):
 *   $env:TEST_URL='http://127.0.0.1:8811'
 *   node node_modules\@playwright\test\cli.js test tests/kiosk-bestellung-loeschen.spec.js
 */

const { test, expect } = require('./_kiosk-angemeldet');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://www.dorfladen-oberornau.de';
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

const WT = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

function iso(d) {
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)
    + '-' + ('0' + d.getDate()).slice(-2);
}
function tagPlus(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
const HEUTE = iso(tagPlus(0));
const GESTERN = iso(tagPlus(-1));
const VORGESTERN = iso(tagPlus(-2));
const MORGEN = iso(tagPlus(1));

/* ── Metzger ──────────────────────────────────────────────────────────── */

const M_ARTIKEL = [
  { name: 'Putenschnitzel', nummer: 360, preis: 17.5, einheit: 'kg',
    gruppe: 'Fleisch frisch', aktiv: true, auf_formular: true, standard: [] },
  { name: 'Braten Rind', nummer: 109, preis: 18.5, einheit: 'kg',
    gruppe: 'Fleisch frisch', aktiv: true, auf_formular: true, standard: [] },
];

/** Tagesleiste inklusive der beiden vergangenen, gesendeten Liefertage. */
function mTage() {
  const out = [
    { datum: VORGESTERN, wochentag: WT[tagPlus(-2).getDay()], bestelltag: true,
      bestellbar: false, nur_lesen: true, status: 1, positionen: 5 },
    { datum: GESTERN, wochentag: WT[tagPlus(-1).getDay()], bestelltag: true,
      bestellbar: false, nur_lesen: true, status: 2, positionen: 4 },
  ];
  for (let i = 0; i < 14; i++) {
    const d = tagPlus(i);
    out.push({
      datum: iso(d), wochentag: WT[d.getDay()],
      bestelltag: true,
      bestellbar: i > 0,
      nur_lesen: false,
      status: i === 1 ? 1 : undefined,
      positionen: i === 1 ? 3 : 0,
    });
  }
  return out;
}

const M_VERLAUF = [
  { datum: GESTERN, wochentag: WT[tagPlus(-1).getDay()], status: 2,
    summen: { positionen: 4, kg: 24.25, vakuum: 9 }, protokoll: [], hat_dokument: true },
  { datum: VORGESTERN, wochentag: WT[tagPlus(-2).getDay()], status: 1,
    summen: { positionen: 5, kg: 25.5, vakuum: 9 }, protokoll: [], hat_dokument: false },
];

/** Sammelt jeden Löschaufruf, damit die Tests ihn nachweisen können. */
function sammle(page) {
  const raus = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && /loeschen/.test(r.url())) {
      let leib = {};
      try { leib = JSON.parse(r.postData() || '{}'); } catch (e) { /* egal */ }
      raus.push({ url: r.url(), leib });
    }
  });
  return raus;
}

async function mockMetzger(page, opts = {}) {
  const j = (o, st) => ({ status: st || 200, contentType: 'application/json',
    body: JSON.stringify(o) });

  await page.route('**/api/metzger-artikel**', (route) =>
    route.fulfill(j({ success: true, artikel: M_ARTIKEL })));

  await page.route('**/api/metzger-order**', (route) => {
    const u = route.request().url();
    if (/loeschen/.test(u)) {
      if (opts.loeschFehler) {
        return route.fulfill(j({ success: false, error: 'Der Speicher antwortet nicht.' }, 502));
      }
      return route.fulfill(j({ success: true, meldung: 'Die Bestellung wurde gelöscht.' }));
    }
    if (/mode=verlauf/.test(u)) {
      return route.fulfill(j({ success: true, verlauf: opts.leererVerlauf ? [] : M_VERLAUF }));
    }
    if (/metzger-order\/\d{4}-\d{2}-\d{2}/.test(u)) {
      const datum = (u.match(/(\d{4}-\d{2}-\d{2})/) || [])[1];
      const alt = datum < HEUTE;
      return route.fulfill(j({
        success: true,
        bestellung: {
          datum, status: alt ? 1 : 0, protokoll: [],
          positionen: M_ARTIKEL.map((a) => ({
            nummer: a.nummer, name: a.name,
            portionen: alt ? [{ anzahl: 1, menge: 1, einheit: 'kg', vakuum: false }] : [],
            hinweis: '', zusatz: false,
          })),
        },
        artikel: M_ARTIKEL, vorschlaege: {}, vorbelegt_aus: null, letzte: null,
        bestelltag: true, bestellbar: !alt, nur_lesen: alt,
        config: { name: 'Metzgerei Mair', empfaenger: 'test@example.com' },
        testbetrieb: true, summen: {},
      }));
    }
    return route.fulfill(j({
      success: true, tage: mTage(), aktiv: MORGEN,
      config: { name: 'Metzgerei Mair', empfaenger: 'test@example.com' },
      testbetrieb: true,
    }));
  });

  await page.route('**/api/**', (route) => {
    if (/metzger-(order|artikel)/.test(route.request().url())) return route.fallback();
    return route.fulfill(j({ success: true }));
  });
}

async function metzgerOeffnen(page, opts = {}) {
  await mockMetzger(page, opts);
  await page.goto(KIOSK_URL, { waitUntil: 'domcontentloaded' });
  await page.locator('.k-tab[data-tab="metzgerbest"]').click();
  await page.locator('#panel-metzgerbest .mb-day').first().waitFor({ timeout: 15000 });
}

/** In den Bereich „Verlauf" wechseln – er liegt im Blatt hinter dem „i". */
async function metzgerVerlauf(page) {
  await page.locator('#panel-metzgerbest .mb-mehr').click();
  await page.locator('#mb-blatt').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('#mb-blatt').getByRole('button', { name: /Verlauf/ })
    .first().click();
  await page.locator('#panel-metzgerbest .mb-vrow').first().waitFor({ timeout: 8000 });
}

test.describe('Metzger – Bestellung löschen', () => {
  test('TC-D01: jeder Verlaufseintrag hat „Löschen"', async ({ page }) => {
    await metzgerOeffnen(page);
    await metzgerVerlauf(page);

    const zeilen = page.locator('#panel-metzgerbest .mb-vrow');
    const n = await zeilen.count();
    expect(n).toBe(M_VERLAUF.length);
    for (let i = 0; i < n; i++) {
      await expect(zeilen.nth(i).getByRole('button', { name: 'Löschen' })).toHaveCount(1);
    }
  });

  test('TC-D02/D05: die Rückfrage nennt den Tag und warnt vor der Mail',
    async ({ page }) => {
      const rufe = sammle(page);
      await metzgerOeffnen(page);
      await metzgerVerlauf(page);

      await page.locator('#panel-metzgerbest .mb-vrow').first()
        .getByRole('button', { name: 'Löschen' }).click();

      const dlg = page.locator('.mb-overlay .mb-dlg');
      await expect(dlg).toBeVisible();
      await expect(dlg).toContainText('löschen');
      // Der Liefertag muss dastehen – sonst weiß niemand, was wegkommt.
      const de = GESTERN.slice(8) + '.' + GESTERN.slice(5, 7) + '.' + GESTERN.slice(0, 4);
      await expect(dlg).toContainText(de);
      // Gesendet: Die Mail bleibt draußen. Das muss dastehen.
      await expect(dlg).toContainText(/E-Mail/i);
      // Bis hierher darf NICHTS gesendet worden sein.
      expect(rufe).toEqual([]);
    });

  test('TC-D03: Abbrechen sendet nichts', async ({ page }) => {
    const rufe = sammle(page);
    await metzgerOeffnen(page);
    await metzgerVerlauf(page);

    await page.locator('#panel-metzgerbest .mb-vrow').first()
      .getByRole('button', { name: 'Löschen' }).click();
    await page.locator('.mb-overlay [data-ab]').click();

    await page.waitForTimeout(600);
    expect(rufe).toEqual([]);
    await expect(page.locator('#panel-metzgerbest .mb-vrow')).toHaveCount(M_VERLAUF.length);
  });

  test('TC-D04: Bestätigen schickt den Löschauftrag', async ({ page }) => {
    const rufe = sammle(page);
    await metzgerOeffnen(page);
    await metzgerVerlauf(page);

    await page.locator('#panel-metzgerbest .mb-vrow').first()
      .getByRole('button', { name: 'Löschen' }).click();
    await page.locator('.mb-overlay [data-ok]').click();

    await expect.poll(() => rufe.length, { timeout: 8000 }).toBe(1);
    expect(rufe[0].url).toContain('/metzger-order/' + GESTERN + '/loeschen');
  });
});

test.describe('Metzger – Status je Liefertag', () => {
  test('TC-D13: die Kachel zeigt den Stand und die Positionszahl', async ({ page }) => {
    await metzgerOeffnen(page);

    const kachel = page.locator('#panel-metzgerbest .mb-day[onclick*="' + GESTERN + '"]');
    await expect(kachel).toHaveCount(1);
    await expect(kachel).toContainText('korrigiert');
    await expect(kachel).toContainText('4 Pos.');
  });

  test('TC-D14: vergangene Liefertage sind anklickbar und abgesetzt',
    async ({ page }) => {
      await metzgerOeffnen(page);

      const kachel = page.locator('#panel-metzgerbest .mb-day[onclick*="' + VORGESTERN + '"]');
      await expect(kachel).toHaveCount(1);
      await expect(kachel).toHaveClass(/lesen/);
      // Nicht gesperrt: Anschauen muss möglich sein.
      expect(await kachel.getAttribute('disabled')).toBeNull();
      await expect(kachel).toContainText('gesendet');
    });

  test('TC-D15: ein vergangener Tag bietet kein „Korrigieren"', async ({ page }) => {
    await metzgerOeffnen(page);

    await page.locator('#panel-metzgerbest .mb-day[onclick*="' + VORGESTERN + '"]').click();
    await page.waitForTimeout(1200);

    const fuss = page.locator('#mb-foot');
    await expect(fuss).toContainText('nur zum Nachsehen');
    await expect(fuss.getByRole('button', { name: 'Korrigieren' })).toHaveCount(0);
    // Und auch nicht erfassbar.
    await expect(fuss.getByRole('button', { name: /senden/i })).toHaveCount(0);
  });
});

/* ── Bäcker ───────────────────────────────────────────────────────────── */

const B_ARTIKEL = [
  { nummer: '852', name: 'Semmel', key: 'a1' },
  { nummer: '860', name: 'Brezen', key: 'a2' },
];

const B_VERLAUF = [
  { datum: GESTERN, datum_de: GESTERN.slice(8) + '.' + GESTERN.slice(5, 7) + '.' + GESTERN.slice(0, 4),
    wochentag: WT[tagPlus(-1).getDay()], baeckerei: 'freundl', baeckerei_name: 'Bäckerei Freundl',
    status: 1, positionen: 2, stueck: 30, protokoll: [], gedruckt_am: '',
    papierausdruck: false, druck_offen: false },
];

function bTage() {
  const out = [
    { datum: GESTERN, wochentag: WT[tagPlus(-1).getDay()], bestelltag: true,
      bestellbar: false, heute: false, nur_lesen: true,
      bestellschluss_datum: '', bestellschluss_datum_de: '', bestellschluss_wochentag: '',
      heute_bestellen: false, hat_offene: false,
      lieferanten: [{ baeckerei: 'freundl', name: 'Bäckerei Freundl',
        status: 'gesendet', gedruckt: false, druck_offen: false, positionen: 2 }],
      fertig: 1, gesamt: 1, status: 'gesendet' },
  ];
  for (let i = 0; i < 7; i++) {
    const d = tagPlus(i);
    out.push({
      datum: iso(d), wochentag: WT[d.getDay()], bestelltag: true,
      bestellbar: i > 0, heute: i === 0, nur_lesen: false,
      bestellschluss_datum: '', bestellschluss_datum_de: '', bestellschluss_wochentag: '',
      heute_bestellen: false, hat_offene: i > 0,
      lieferanten: [{ baeckerei: 'freundl', name: 'Bäckerei Freundl',
        status: 'offen', gedruckt: false, druck_offen: false }],
      fertig: 0, gesamt: 1, status: i > 0 ? 'offen' : 'vorbei',
    });
  }
  return out;
}

async function mockBaecker(page, opts = {}) {
  const j = (o, st) => ({ status: st || 200, contentType: 'application/json',
    body: JSON.stringify(o) });

  await page.route('**/api/baecker-order**', (route) => {
    const u = route.request().url();
    if (/loeschen/.test(u)) {
      if (opts.loeschFehler) {
        return route.fulfill(j({ success: false, error: 'Der Speicher antwortet nicht.' }, 502));
      }
      return route.fulfill(j({ success: true, meldung: 'Die Bestellung wurde gelöscht.' }));
    }
    if (/mode=uebersicht/.test(u)) {
      return route.fulfill(j({ success: true, tage: bTage(), offen_gesamt: 0,
        erinnerung: { offen: false, blinkt: false, datum: '', wochentag: '',
          bestellschluss: '', baeckereien: [] } }));
    }
    if (/mode=verlauf/.test(u)) {
      const v = opts.mitDruck
        ? [Object.assign({}, B_VERLAUF[0], { papierausdruck: true, druck_offen: true })]
        : B_VERLAUF;
      return route.fulfill(j({ success: true, verlauf: v }));
    }
    if (/mode=config/.test(u)) {
      return route.fulfill(j({ success: true,
        config: { freundl: { name: 'Bäckerei Freundl', bestellschluss: '12:00' } },
        baeckereien: ['freundl'] }));
    }
    return route.fulfill(j({
      success: true,
      bestellung: {
        datum: MORGEN, baeckerei: 'freundl', baeckerei_name: 'Bäckerei Freundl',
        wochentag: WT[tagPlus(1).getDay()], datum_de: '', status: 0,
        gesperrt: false, bestellbar: true, korrektur_moeglich: false,
        nur_lesen: false, hat_entwurf: false, vorlage_datum: '', vorlage_datum_de: '',
        artikel: B_ARTIKEL,
        positionen: B_ARTIKEL.map((a) => ({
          nummer: a.nummer, name: a.name, menge: 10, retoure: 0,
          vorbelegt: 0, verlauf: [], key: a.key,
        })),
        protokoll: [],
      },
    }));
  });

  await page.route('**/api/**', (route) => {
    if (/baecker-order/.test(route.request().url())) return route.fallback();
    return route.fulfill(j({ success: true }));
  });
}

async function baeckerOeffnen(page, opts = {}) {
  await mockBaecker(page, opts);
  await page.goto(KIOSK_URL, { waitUntil: 'domcontentloaded' });
  await page.locator('.k-tab[data-tab="baecker"]').click();
  await page.locator('#panel-baecker .bk-day').first().waitFor({ timeout: 15000 });
}

test.describe('Bäcker – Bestellung löschen', () => {
  test('TC-D06/D07: „Löschen" ist ohne Aufklappen da und löscht mit Bäckerei',
    async ({ page }) => {
      const rufe = sammle(page);
      await baeckerOeffnen(page);

      /* Auf schmalen Schirmen liegt „Verlauf" hinter dem Blatt. Geprüft wird
         hier das Löschen, nicht der Weg dorthin — den decken die
         Navigationstests ab. Deshalb direkt in den Bereich. */
      await page.evaluate(() => window.KBaecker && window.KBaecker.sub('verlauf'));
      await page.locator('#panel-baecker .bk-hist').first().waitFor({ timeout: 8000 });

      /* F16: Der Knopf muss OHNE Aufklappen dastehen. Vorher lag er hinter
         dem Aufklappen und wurde im Laden schlicht nicht gefunden. */
      await expect(page.locator('#panel-baecker .bk-hist-liste')).toHaveCount(0);
      const weg = page.locator('#panel-baecker .bk-hist').first()
        .locator('.bk-hist-weg');
      await expect(weg).toHaveCount(1);

      await weg.click();

      const dlg = page.locator('#bk-overlay .bk-dlg');
      await expect(dlg).toBeVisible();
      await expect(dlg).toContainText('Bäckerei Freundl');
      await expect(dlg).toContainText(/E-Mail/i);
      expect(rufe).toEqual([]);

      await dlg.getByRole('button', { name: 'Löschen' }).click();

      await expect.poll(() => rufe.length, { timeout: 8000 }).toBe(1);
      expect(rufe[0].url).toContain('/baecker-order/' + GESTERN + '/loeschen');
      expect(rufe[0].leib.baeckerei).toBe('freundl');
    });

  test('TC-D16: vergangene Liefertage sind abgesetzt und beschriftet',
    async ({ page }) => {
      await baeckerOeffnen(page);

      const kachel = page.locator('#panel-baecker .bk-day[onclick*="' + GESTERN + '"]');
      await expect(kachel).toHaveCount(1);
      await expect(kachel).toHaveClass(/lesen/);
      await expect(kachel).toContainText('geliefert');
    });

  test('TC-D24: „Löschen" bleibt in derselben Zeile wie „Drucken"',
    async ({ page }) => {
      /* Das Zeilenraster hatte genau vier Spalten (`150px 1fr auto auto`).
         Der zusätzliche Knopf war der fünfte und rutschte unter den
         Wochentag — live gesehen. Der Wächter hält die eine Reihe fest. */
      await mockBaecker(page, { mitDruck: true });
      await page.goto(KIOSK_URL, { waitUntil: 'domcontentloaded' });
      await page.locator('.k-tab[data-tab="baecker"]').click();
      await page.locator('#panel-baecker .bk-day').first().waitFor({ timeout: 15000 });
      await page.evaluate(() => window.KBaecker && window.KBaecker.sub('verlauf'));
      await page.locator('#panel-baecker .bk-hist').first().waitFor({ timeout: 8000 });

      const lage = await page.evaluate(() => {
        const z = document.querySelector('#panel-baecker .bk-hist');
        const weg = z.querySelector('.bk-hist-weg');
        const druck = z.querySelector('.bk-hist-druck');
        if (!weg || !druck) return null;
        const d = druck.getBoundingClientRect(), w = weg.getBoundingClientRect();
        const panel = document.getElementById('panel-baecker').getBoundingClientRect();
        return {
          /* Massgeblich ist: Beide Knöpfe teilen sich EINE Reihe. Auf
             schmalen Schirmen bricht die Zeile bewusst um, dort stehen sie
             gemeinsam in der Knopfreihe — ein Vergleich mit dem Wochentag
             wäre dort falsch. */
          gleicheReihe: Math.abs((d.top + d.height / 2) - (w.top + w.height / 2)) < 12,
          wegRechts: w.left >= d.left,
          imBild: w.right <= panel.right + 1 && w.left >= panel.left - 1,
          breite: Math.round(w.width),
        };
      });

      expect(lage, 'Kein Druck- oder Löschknopf gefunden').not.toBeNull();
      expect(lage.gleicheReihe).toBe(true);
      expect(lage.wegRechts).toBe(true);
      expect(lage.imBild).toBe(true);
      expect(lage.breite).toBeGreaterThan(40);
    });
});

/* ── Getränke ─────────────────────────────────────────────────────────
   Aus dem Laden: "Ich hab doch gesagt, dass Bäcker und Getränke
   Bestellungen auch gelöscht werden sollen" und "Bei Getränke möchte ich
   nach Klick auch sehen, was bestellt wurde." */

const G_VERLAUF = [
  { datum: GESTERN, datum_de: GESTERN.slice(8) + '.' + GESTERN.slice(5, 7) + '.' + GESTERN.slice(0, 4),
    kw: 38, status: 2,
    summen: { kisten: 65, positionen: 3, wert: 0, pfand_max: 0 },
    positionen: [
      { nummer: '101', name: 'Spezi', gebinde: '20x0,5', menge: 30 },
      { nummer: '102', name: 'Mineralwasser', gebinde: '12x1,0', menge: 25 },
      { nummer: '103', name: 'Apfelschorle', gebinde: '12x0,7', menge: 10 },
    ],
    protokoll: [] },
];

async function mockGetraenke(page, opts = {}) {
  const j = (o, st) => ({ status: st || 200, contentType: 'application/json',
    body: JSON.stringify(o) });

  await page.route('**/api/getraenke-order**', (route) => {
    const u = route.request().url();
    if (/loeschen/.test(u)) {
      if (opts.loeschFehler) {
        return route.fulfill(j({ success: false, error: 'Der Speicher antwortet nicht.' }, 502));
      }
      return route.fulfill(j({ success: true, meldung: 'Die Bestellung wurde gelöscht.' }));
    }
    if (/mode=verlauf/.test(u)) {
      return route.fulfill(j({ success: true, verlauf: G_VERLAUF }));
    }
    if (/getraenke-order\/\d{4}-\d{2}-\d{2}/.test(u)) {
      return route.fulfill(j({
        success: true,
        bestellung: { datum: MORGEN, status: 0, positionen: [], protokoll: [] },
        artikel: [], gruppen: [], pfand: {}, letzte: null,
        bestellbar: true, config: { name: 'Kratzer' }, testbetrieb: true,
        summen: { kisten: 0, positionen: 0 },
      }));
    }
    return route.fulfill(j({
      success: true, termin: MORGEN, kw: 38, letzte: null,
      config: { name: 'Kratzer' }, testbetrieb: true,
    }));
  });

  await page.route('**/api/**', (route) => {
    if (/getraenke-order/.test(route.request().url())) return route.fallback();
    return route.fulfill(j({ success: true }));
  });
}

async function getraenkeVerlauf(page, opts = {}) {
  await mockGetraenke(page, opts);
  await page.goto(KIOSK_URL, { waitUntil: 'domcontentloaded' });
  await page.locator('.k-tab[data-tab="getraenke"]').click();
  await page.waitForTimeout(1500);
  /* Auf schmalen Schirmen liegt der Reiter „Verlauf" hinter dem Blatt und
     ist für Playwright „not visible". Geprüft wird hier das Löschen und
     das Nachsehen, nicht der Weg dorthin — deshalb der Unterreiter direkt
     über sein `data-sub`. */
  await page.evaluate(() => {
    const b = document.querySelector('#panel-getraenke [data-sub="verlauf"]');
    if (b) b.click();
  });
  await page.locator('#panel-getraenke .gk-vrow').first().waitFor({ timeout: 10000 });
}

test.describe('Getränke – Bestellung löschen und nachsehen', () => {
  test('TC-D17: jeder Verlaufseintrag hat „Löschen"', async ({ page }) => {
    await getraenkeVerlauf(page);
    const zeilen = page.locator('#panel-getraenke .gk-vrow');
    await expect(zeilen).toHaveCount(G_VERLAUF.length);
    await expect(zeilen.first().getByRole('button', { name: 'Löschen' })).toHaveCount(1);
  });

  test('TC-D18/D19: Klick zeigt die Positionen, erneut klappt zu', async ({ page }) => {
    await getraenkeVerlauf(page);

    // Zugeklappt ist noch nichts zu sehen.
    await expect(page.locator('#panel-getraenke .gk-vliste')).toHaveCount(0);

    await page.locator('#panel-getraenke .gk-vkopf').first().click();
    const liste = page.locator('#panel-getraenke .gk-vliste');
    await expect(liste).toHaveCount(1);
    // Genau die bestellten Positionen, mit Menge.
    await expect(liste).toContainText('Spezi');
    await expect(liste).toContainText('Mineralwasser');
    await expect(liste).toContainText('Apfelschorle');
    await expect(liste.locator('tbody tr')).toHaveCount(3);
    await expect(liste).toContainText('20x0,5');

    await page.locator('#panel-getraenke .gk-vkopf').first().click();
    await expect(page.locator('#panel-getraenke .gk-vliste')).toHaveCount(0);
  });

  test('TC-D20/D21: Rückfrage warnt, Abbrechen sendet nichts, Bestätigen löscht',
    async ({ page }) => {
      const rufe = sammle(page);
      await getraenkeVerlauf(page);

      await page.locator('#panel-getraenke .gk-vrow').first()
        .getByRole('button', { name: 'Löschen' }).click();

      const dlg = page.locator('#gk-weg-blatt');
      await expect(dlg).toBeVisible();
      // Gesendet: Die Mail bleibt draußen. Das muss dastehen.
      await expect(dlg).toContainText(/E-Mail/i);
      expect(rufe).toEqual([]);

      // TC-D21: Abbrechen
      await dlg.getByRole('button', { name: 'Abbrechen' }).click();
      await page.waitForTimeout(500);
      expect(rufe).toEqual([]);
      await expect(page.locator('#panel-getraenke .gk-vrow')).toHaveCount(G_VERLAUF.length);

      // TC-D20: Bestätigen
      await page.locator('#panel-getraenke .gk-vrow').first()
        .getByRole('button', { name: 'Löschen' }).click();
      await page.locator('#gk-weg-blatt').getByRole('button', { name: 'Löschen' }).click();

      await expect.poll(() => rufe.length, { timeout: 8000 }).toBe(1);
      expect(rufe[0].url).toContain('/getraenke-order/' + GESTERN + '/loeschen');
    });
});