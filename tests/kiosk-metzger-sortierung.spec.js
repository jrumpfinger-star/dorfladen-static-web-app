/**
 * Metzger – Artikel nach Gruppe und Nummer, mit Suche im Artikelstamm
 *
 * Zwei Meldungen aus dem Laden, eine Wurzel:
 *
 *   „Es sollte auch nach Gruppe und dann aufsteigend nach Nummer sortiert
 *    werden. Außerdem wäre eine Suche hier sinnvoll."
 *
 *   „Warum erscheint Schnitzel vom Strohschwein in einer eigenen Gruppe
 *    Fleisch frisch?"
 *
 * Die Listen liefen in der Reihenfolge des Katalogs, und ein neu angelegter
 * Artikel wird hinten angehängt. Trägt er eine Gruppe, die weiter oben schon
 * vorkam, beginnt am Listenende ein ZWEITER Block mit derselben Überschrift.
 * Nach Gruppen zu sortieren führt die Blöcke zusammen und ordnet zugleich
 * die Nummern.
 *
 * Ausführen (lokaler Server aus static-site/ auf 8099):
 *   $env:TEST_URL='http://127.0.0.1:8099'
 *   node node_modules\@playwright\test\cli.js test tests/kiosk-metzger-sortierung.spec.js
 */

const { test, expect } = require('./_kiosk-angemeldet');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

const TAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const LIEFERTAGE = [1, 4];

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
    if (LIEFERTAGE.includes(d.getDay())) return iso(d);
  }
  return iso(plusTage(1));
}

/* Der Artikelstamm bewusst in der Lage, die gemeldet wurde: „Fleisch frisch"
   steht vorn UND am Ende noch einmal (Nr. 3, nachträglich angelegt), und die
   Nummern laufen innerhalb der Gruppe nicht aufsteigend. */
const ARTIKEL = [
  { name: 'Lende Schwein', nummer: 2, preis: 11.05, einheit: 'kg',
    gruppe: 'Fleisch frisch', aktiv: true, auf_formular: true },
  { name: 'Putenschnitzel', nummer: 360, preis: 17.5, einheit: 'kg',
    gruppe: 'Fleisch frisch', aktiv: true, auf_formular: true },
  { name: 'Braten Rind', nummer: 109, preis: 18.5, einheit: 'kg',
    gruppe: 'Fleisch frisch', aktiv: true, auf_formular: true },
  { name: 'Tafelspitz', nummer: null, preis: null, einheit: 'kg',
    gruppe: 'Fleisch frisch', aktiv: true, auf_formular: true },
  { name: 'Leberkäse z. selberbacken', nummer: 402, preis: 7.65, einheit: 'kg',
    gruppe: 'Brät & Leberkäse', aktiv: true, auf_formular: true },
  { name: 'Milzwurst', nummer: 407, preis: 8, einheit: 'kg',
    gruppe: 'Brät & Leberkäse', aktiv: true, auf_formular: true },
  // Nachträglich angelegt und hinten angehängt – der gemeldete Fall.
  { name: 'Schnitzel vom Strohschwein', nummer: 3, preis: 14.9, einheit: 'kg',
    gruppe: 'Fleisch frisch', aktiv: true, auf_formular: true },
];

const CONFIG = {
  name: 'Metzgerei Mair', empfaenger: 'test@example.org',
  empfaenger_name: 'Test', metzger_mail: '',
  bestelltage: [0, 3], bestellschluss: '12:00', kd_nr: '1041',
};

function tagesleiste() {
  const out = [];
  const heute = iso(new Date());
  for (let i = 0; i < 14; i++) {
    const d = plusTage(i);
    const datum = iso(d);
    const ist = LIEFERTAGE.includes(d.getDay());
    out.push({
      datum, wochentag: TAGE[d.getDay()], bestelltag: ist,
      bestellbar: ist && datum > heute, nur_lesen: false,
      status: null, positionen: 0,
    });
  }
  return out;
}

async function mockApi(page, opts) {
  const j = (o) => ({ status: 200, contentType: 'application/json',
    body: JSON.stringify(o) });
  const datum = naechsterTag();
  const positionen = (opts && opts.positionen) || [];

  await page.route('**/api/metzger-order**', (route) => {
    const url = route.request().url();
    if (route.request().method() === 'POST') {
      return route.fulfill(j({ success: true, status: 0, testbetrieb: true,
        protokoll: [], summen: {} }));
    }
    if (/mode=verlauf/.test(url)) {
      return route.fulfill(j({ success: true, verlauf: [] }));
    }
    if (/metzger-order\/\d{4}-\d{2}-\d{2}/.test(url)) {
      return route.fulfill(j({
        success: true,
        bestellung: { datum, status: 0, positionen: positionen, protokoll: [] },
        artikel: ARTIKEL, vorschlaege: [], letzte: null,
        bestelltag: true, bestellbar: true,
        config: CONFIG, testbetrieb: true, summen: {},
      }));
    }
    return route.fulfill(j({ success: true, tage: tagesleiste(), aktiv: datum,
      config: CONFIG, testbetrieb: true }));
  });

  await page.route('**/api/metzger-artikel**', (route) =>
    route.fulfill(j({ success: true, artikel: ARTIKEL })));
  await page.route('**/api/**', (route) => {
    if (/metzger-order|metzger-artikel/.test(route.request().url())) return route.fallback();
    return route.fulfill(j({ success: true }));
  });
}

async function oeffne(page, reiter, opts) {
  await mockApi(page, opts);
  await page.goto(KIOSK_URL);
  await page.waitForTimeout(2200);
  await page.evaluate(() => window.K.switchTab('metzgerbest'));
  await page.waitForTimeout(1400);
  if (reiter) {
    await page.evaluate((r) => window.KMetzgerBest.sub(r), reiter);
    await page.waitForTimeout(700);
  }
}

/** Die Gruppennamen der Bestellliste, in Anzeigereihenfolge.
 *  Gelesen wird `.mb-gn` — der Kopf trägt seit dem Aufklappen auch
 *  einen Pfeil und einen Zähler. */
async function gruppen(page) {
  return page.evaluate(() => [...document.querySelectorAll('#mb-liste .mb-grp .mb-gn')]
    .map((el) => el.textContent.trim()));
}

/** Die Artikelnummern der Verwaltungsliste, in Anzeigereihenfolge. */
async function nummern(page) {
  return page.evaluate(() => [...document.querySelectorAll('.mb-artikel .mb-nr')]
    .map((el) => el.textContent.trim()));
}

async function namen(page) {
  return page.evaluate(() => [...document.querySelectorAll('.mb-artikel .mb-atxt')]
    .map((el) => el.textContent.trim()));
}

test.describe('Metzger – Sortierung nach Gruppe und Nummer', () => {

  test('TC-MS-01: Jede Gruppe steht nur EINMAL in der Bestellliste',
    async ({ page }) => {
      /* Der gemeldete Fall: „Schnitzel vom Strohschwein" wurde nachträglich
         angelegt und erzeugte am Listenende einen zweiten Block
         „Fleisch frisch". */
      await oeffne(page);
      const g = await gruppen(page);
      const doppelt = g.filter((x, i) => g.indexOf(x) !== i);
      expect(doppelt, `Gruppe doppelt: ${doppelt.join(', ')}`).toHaveLength(0);
    });

  test('TC-MS-02: Der nachgetragene Artikel steht bei seiner Gruppe',
    async ({ page }) => {
      await oeffne(page);
      const reihen = await page.evaluate(() =>
        [...document.querySelectorAll('#mb-liste > *')].map((el) => ({
          gruppe: el.classList.contains('mb-grp'),
          text: el.textContent.trim().slice(0, 40),
        })));
      const iStroh = reihen.findIndex((r) => r.text.includes('Strohschwein'));
      const iBraet = reihen.findIndex((r) => r.gruppe && r.text.includes('Brät'));
      expect(iStroh, 'Strohschwein nicht gefunden').toBeGreaterThan(-1);
      expect(iBraet, 'Brät-Gruppe nicht gefunden').toBeGreaterThan(-1);
      expect(iStroh, 'Strohschwein steht hinter der nächsten Gruppe')
        .toBeLessThan(iBraet);
    });

  test('TC-MS-03: In der Verwaltung laufen die Nummern je Gruppe aufsteigend',
    async ({ page }) => {
      await oeffne(page, 'artikel');
      const nr = await nummern(page);
      // Erwartet: Fleisch frisch 2, 3, 109, 360, dann Tafelspitz (ohne
      // Nummer) ans Ende der Gruppe; danach Brät & Leberkäse 402, 407.
      expect(nr).toEqual(['2', '3', '109', '360', '–', '402', '407']);
    });

  test('TC-MS-04: Artikel ohne Nummer stehen am Ende ihrer Gruppe',
    async ({ page }) => {
      await oeffne(page, 'artikel');
      const n = await namen(page);
      expect(n.indexOf('Tafelspitz'), 'Tafelspitz nicht am Gruppenende')
        .toBe(4);
      expect(n[5]).toBe('Leberkäse z. selberbacken');
    });

  test('TC-MS-05: Die Gruppenfolge bleibt die gewohnte', async ({ page }) => {
    // Nicht alphabetisch: „Brät & Leberkäse" käme sonst vor „Fleisch frisch".
    await oeffne(page);
    const g = await gruppen(page);
    expect(g[0]).toBe('Fleisch frisch');
    expect(g[1]).toBe('Brät & Leberkäse');
  });

  test('TC-MS-06: Die Verwaltung hat ein Suchfeld', async ({ page }) => {
    await oeffne(page, 'artikel');
    await expect(page.locator('#mb-aq')).toBeVisible();
  });

  test('TC-MS-07: Die Suche filtert nach Name, Nummer und Gruppe',
    async ({ page }) => {
      await oeffne(page, 'artikel');

      await page.evaluate(() => window.KMetzgerBest.asuch('stroh'));
      await page.waitForTimeout(300);
      expect(await namen(page)).toEqual(['Schnitzel vom Strohschwein']);

      await page.evaluate(() => window.KMetzgerBest.asuch('402'));
      await page.waitForTimeout(300);
      expect(await namen(page)).toEqual(['Leberkäse z. selberbacken']);

      await page.evaluate(() => window.KMetzgerBest.asuch('Leberkäse'));
      await page.waitForTimeout(300);
      // Trifft die Gruppe „Brät & Leberkäse" UND den Artikelnamen.
      expect((await namen(page)).length).toBe(2);
    });

  test('TC-MS-08: Der Zähler nennt Treffer und Gesamtzahl', async ({ page }) => {
    await oeffne(page, 'artikel');
    await expect(page.locator('.mb-azahl')).toContainText('7 Artikel');
    await page.evaluate(() => window.KMetzgerBest.asuch('stroh'));
    await page.waitForTimeout(300);
    await expect(page.locator('.mb-azahl')).toContainText('1 von 7');
  });

  test('TC-MS-09: Ohne Treffer steht eine Erklärung da', async ({ page }) => {
    await oeffne(page, 'artikel');
    await page.evaluate(() => window.KMetzgerBest.asuch('gibtsnicht'));
    await page.waitForTimeout(300);
    await expect(page.locator('.mb-aleer')).toContainText('Kein Artikel');
    expect(await namen(page)).toHaveLength(0);
  });

  test('TC-MS-10: Die Suche der Verwaltung wirkt nicht in die Bestellliste',
    async ({ page }) => {
      /* Zwei getrennte Listen, zwei getrennte Suchen. Ein mitwanderndes
         Suchwort hätte beim Umschalten unversehens gefiltert. */
      await oeffne(page, 'artikel');
      await page.evaluate(() => window.KMetzgerBest.asuch('stroh'));
      await page.waitForTimeout(300);
      await page.evaluate(() => window.KMetzgerBest.sub('bestellung'));
      await page.waitForTimeout(700);
      const g = await gruppen(page);
      expect(g.length, 'Bestellliste ist mitgefiltert').toBeGreaterThan(1);
      await expect(page.locator('#mb-q')).toHaveValue('');
    });
});

// ════════════════════════════════════════════════════════════
//  Warengruppen auf- und zuklappen
// ════════════════════════════════════════════════════════════
// Aus dem Laden: „kann man die Liste nach Gruppen aufklappbar darstellen?"
// Bei über hundert Artikeln passen eingeklappt alle Gruppen auf einen Blick.

test.describe('Metzger – Warengruppen aufklappen', () => {
  test.use({ serviceWorkers: 'block' });

  const zeilen = (page) => page.locator('#mb-liste .mb-row');
  const arows = (page) => page.locator('.mb-artikel .mb-arow');
  const koepfe = (page) => page.locator('#mb-liste .mb-grp');

  test('TC-MK-01: Beim Öffnen sind alle Gruppen aufgeklappt',
    async ({ page }) => {
      // Nichts verstecken, was bisher zu sehen war.
      await oeffne(page);
      expect(await zeilen(page).count()).toBe(ARTIKEL.length);
    });

  test('TC-MK-02: Ein Klick auf den Kopf klappt die Gruppe zu',
    async ({ page }) => {
      await oeffne(page);
      const vorher = await zeilen(page).count();
      await koepfe(page).first().click();
      await page.waitForTimeout(400);
      const nachher = await zeilen(page).count();
      expect(nachher, 'nichts ausgeblendet').toBeLessThan(vorher);
      // Der Kopf bleibt stehen – sonst käme man nicht wieder heran.
      await expect(koepfe(page).first()).toBeVisible();
      await expect(koepfe(page).first()).toHaveClass(/zu/);
    });

  test('TC-MK-03: Ein zweiter Klick klappt sie wieder auf',
    async ({ page }) => {
      await oeffne(page);
      const vorher = await zeilen(page).count();
      await koepfe(page).first().click();
      await page.waitForTimeout(400);
      await koepfe(page).first().click();
      await page.waitForTimeout(400);
      expect(await zeilen(page).count()).toBe(vorher);
    });

  test('TC-MK-04: Der zugeklappte Kopf nennt die erfassten Positionen',
    async ({ page }) => {
      /* Sonst verschwände die eigene Eingabe hinter einem zugeklappten
         Block und man hielte die Bestellung für unvollständig. */
      await oeffne(page, null, {
        positionen: [{
          nummer: 2, name: 'Lende Schwein',
          portionen: [{ anzahl: 1, menge: 2, einheit: 'kg', vakuum: false }],
        }],
      });
      // Vorbedingung: Die Position ist wirklich da, sonst prüfte der Fall nichts.
      await expect(page.locator('#mb-liste .mb-chip').first(),
        'keine Position erfasst — der Fall prüfte nichts').toBeVisible();

      await page.evaluate(() => window.KMetzgerBest.klapp('b', 'Fleisch frisch'));
      await page.waitForTimeout(400);
      const kopf = koepfe(page).first();
      await expect(kopf).toHaveClass(/zu/);
      await expect(kopf.locator('.mb-gz'),
        'der Zähler verschweigt die erfasste Position').toContainText('1 erfasst');
    });

  test('TC-MK-04b: Ohne Erfasstes nennt der Kopf die Artikelzahl',
    async ({ page }) => {
      await oeffne(page);
      await page.evaluate(() => window.KMetzgerBest.klapp('b', 'Fleisch frisch'));
      await page.waitForTimeout(400);
      const zaehler = await koepfe(page).first().locator('.mb-gz').innerText();
      expect(zaehler).not.toContain('erfasst');
      expect(zaehler.trim()).toMatch(/^\d+$/);
    });

  test('TC-MK-05: Beim Suchen ist alles offen', async ({ page }) => {
    /* Ein Treffer darf nicht hinter einem zugeklappten Block liegen —
       man hielte ihn sonst für nicht vorhanden. */
    await oeffne(page);
    await page.evaluate(() => window.KMetzgerBest.klapp('b', 'Fleisch frisch'));
    await page.waitForTimeout(400);
    await page.evaluate(() => window.KMetzgerBest.such('Lende'));
    await page.waitForTimeout(500);
    await expect(page.locator('#mb-liste')).toContainText('Lende Schwein');
  });

  test('TC-MK-06: Die Verwaltung ist ebenfalls aufklappbar',
    async ({ page }) => {
      await oeffne(page, 'artikel');
      const vorher = await arows(page).count();
      expect(vorher).toBe(ARTIKEL.length);
      await page.locator('.mb-artikel .mb-grp').first().click();
      await page.waitForTimeout(400);
      expect(await arows(page).count()).toBeLessThan(vorher);
    });

  test('TC-MK-07: „Alle zuklappen" räumt die Verwaltung auf',
    async ({ page }) => {
      await oeffne(page, 'artikel');
      await page.evaluate(() => window.KMetzgerBest.klappAlle('a', true));
      await page.waitForTimeout(400);
      expect(await arows(page).count(), 'noch Zeilen sichtbar').toBe(0);
      // Die Gruppenköpfe bleiben – sonst wäre die Seite leer.
      expect(await page.locator('.mb-artikel .mb-grp').count())
        .toBeGreaterThan(0);
      await expect(page.locator('.mb-aklapp')).toContainText('Alle aufklappen');
    });

  test('TC-MK-08: Die beiden Ansichten klappen unabhängig voneinander',
    async ({ page }) => {
      /* Wer den Stamm aufräumt, will deshalb nicht die Bestellliste
         zugeklappt vorfinden. */
      await oeffne(page, 'artikel');
      await page.evaluate(() => window.KMetzgerBest.klappAlle('a', true));
      await page.waitForTimeout(400);
      await page.evaluate(() => window.KMetzgerBest.sub('bestellung'));
      await page.waitForTimeout(700);
      expect(await zeilen(page).count(), 'Bestellliste ist mitgeklappt')
        .toBe(ARTIKEL.length);
    });

  test('TC-MK-09: Eine Sprungmarke öffnet die zugeklappte Gruppe',
    async ({ page }) => {
      await oeffne(page);
      await page.evaluate(() => window.KMetzgerBest.klappAlle('b', true));
      await page.waitForTimeout(400);
      expect(await zeilen(page).count()).toBe(0);
      await page.evaluate(() => window.KMetzgerBest.spring(1));
      await page.waitForTimeout(500);
      expect(await zeilen(page).count(), 'Sprung öffnet nicht')
        .toBeGreaterThan(0);
    });
});
