/**
 * Das Blatt hinter dem „i" — der Wächter
 * Spec: specs/kiosk-infoblatt/spec.md
 *
 * Zwei Rückmeldungen aus dem Laden, eine Ursache:
 *   „Info-Button reagiert nicht bei Getränke"
 *   „Die Darstellung schaut nach nichts aus"
 *
 * Das Blatt öffnete sich tatsächlich, schob sich aber ohne jede
 * Abdunkelung von unten herein — man übersah es. Am Rechner lief es über
 * die volle Breite von 1460 px und wirkte wie eine angehängte Fußleiste
 * statt wie ein Dialog. Zusätzlich blieb es bei 80 % der Fensterhöhe
 * stehen, sodass Fußzeile und Reiterleiste hell stehen blieben.
 *
 * Ausführen:
 *   python -m http.server 8811 --bind 127.0.0.1   (aus static-site/)
 *   $env:TEST_URL='http://127.0.0.1:8811'
 *   node node_modules\@playwright\test\cli.js test tests/kiosk-infoblatt.spec.js
 */

const { test, expect } = require('@playwright/test');
const { mockApi } = require('./helpers/bestellreiter-mocks');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const KIOSK = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

/* Die drei Reiter mit ihrem „i"-Knopf. */
const REITER = [
  { tab: 'getraenke', name: 'Getränke', knopf: '#gk-mehr', blatt: '.gk-blatt' },
  { tab: 'metzgerbest', name: 'Mair', knopf: '#panel-metzgerbest .mb-mehr', blatt: '.mb-blatt' },
  { tab: 'baecker', name: 'Bäcker', knopf: '#panel-baecker .bk-mehr', blatt: '.bk-blatt' },
];

const OFFEN = '.gk-blatt:not([hidden]), .mb-blatt:not([hidden]), .bk-blatt:not([hidden])';

/** Öffnet einen Reiter und darin das Blatt hinter dem „i". */
async function oeffneBlatt(page, r) {
  await mockApi(page, {});
  await page.goto(KIOSK, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.K, null, { timeout: 20000 });
  await page.evaluate((t) => window.K.switchTab(t), r.tab);
  await page.waitForTimeout(3200);

  const knopf = page.locator(r.knopf).first();
  await expect(knopf, `Der „i"-Knopf fehlt im Reiter ${r.name}.`).toBeVisible({ timeout: 8000 });
  await knopf.click();
  await page.waitForTimeout(600);
}

/* ══════════════════════════════════════════════════════════════════════
   F1 — Das Öffnen ist zu sehen
   ══════════════════════════════════════════════════════════════════════ */

for (const r of REITER) {
  test(`TC-B1 (${r.name}): Der Hintergrund wird abgedunkelt`, async ({ page }) => {
    await page.setViewportSize({ width: 1460, height: 900 });
    await oeffneBlatt(page, r);

    const z = await page.evaluate((sel) => {
      const bl = document.querySelector(sel);
      if (!bl) return null;
      const s = getComputedStyle(bl);
      const rr = bl.getBoundingClientRect();
      return {
        farbe: s.backgroundColor,
        deckt: Math.round(rr.height) >= window.innerHeight - 2
          && Math.round(rr.width) >= window.innerWidth - 2,
        hoehe: Math.round(rr.height), fenster: window.innerHeight,
      };
    }, OFFEN);

    expect(z, 'Das Blatt hat sich nicht geöffnet.').not.toBeNull();

    // Ohne Abdunkelung wirkt das Öffnen wie „nichts passiert" — genau die
    // Rückmeldung aus dem Laden.
    const m = z.farbe.match(/rgba?\(([^)]+)\)/);
    const teile = m ? m[1].split(',').map((x) => parseFloat(x)) : [];
    const deckkraft = teile.length > 3 ? teile[3] : (z.farbe === 'transparent' ? 0 : 1);
    expect(deckkraft,
      `Der Hintergrund wird nicht abgedunkelt (${z.farbe}). Dann sieht man `
      + 'nicht, dass sich etwas geöffnet hat.').toBeGreaterThan(0.2);

    expect(z.deckt,
      `Die Abdunkelung deckt nur ${z.hoehe} von ${z.fenster} px ab — Fußzeile `
      + 'und Reiterleiste bleiben hell stehen.').toBe(true);
  });
}

/* ══════════════════════════════════════════════════════════════════════
   F2 — Am Rechner ein Dialog, auf dem Telefon ein Blatt
   ══════════════════════════════════════════════════════════════════════ */

for (const r of REITER) {
  test(`TC-B2 (${r.name}): Am Rechner ein Dialog in der Mitte`, async ({ page }) => {
    await page.setViewportSize({ width: 1460, height: 900 });
    await oeffneBlatt(page, r);

    const k = await page.evaluate(() => {
      const karte = document.querySelector('.k-blatt-karte');
      if (!karte) return null;
      const rr = karte.getBoundingClientRect();
      return {
        breite: Math.round(rr.width),
        links: Math.round(rr.left),
        rechts: Math.round(window.innerWidth - rr.right),
      };
    });

    expect(k, 'Es gibt keine Karte — die Gestaltung greift nicht.').not.toBeNull();
    expect(k.breite,
      `Die Karte ist ${k.breite} px breit. Über die volle Bildschirmbreite `
      + 'wirkt sie wie eine angehängte Fußleiste, nicht wie ein Dialog.')
      .toBeLessThan(700);
    // Mittig heißt: links und rechts ungefähr gleich viel Platz.
    expect(Math.abs(k.links - k.rechts),
      `Die Karte steht nicht mittig (links ${k.links}, rechts ${k.rechts}).`)
      .toBeLessThan(20);
  });

  test(`TC-B3 (${r.name}): Auf dem Telefon ein Blatt von unten`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await oeffneBlatt(page, r);

    const k = await page.evaluate(() => {
      const karte = document.querySelector('.k-blatt-karte');
      if (!karte) return null;
      const rr = karte.getBoundingClientRect();
      return {
        breite: Math.round(rr.width),
        untenAbstand: Math.round(window.innerHeight - rr.bottom),
      };
    });

    expect(k).not.toBeNull();
    expect(k.breite,
      'Auf dem Telefon soll das Blatt die volle Breite nutzen.')
      .toBeGreaterThan(360);
    expect(k.untenAbstand,
      'Das Blatt klebt nicht am unteren Rand — dort ist es mit dem Daumen '
      + 'erreichbar.').toBeLessThan(4);
  });
}

/* ══════════════════════════════════════════════════════════════════════
   F3 — Aufbau: Kopf, Körper, Fuß
   ══════════════════════════════════════════════════════════════════════ */

for (const r of REITER) {
  test(`TC-B4 (${r.name}): Kopf mit Schließkreuz, Körper, Fuß`, async ({ page }) => {
    await page.setViewportSize({ width: 1460, height: 900 });
    await oeffneBlatt(page, r);

    const z = await page.evaluate(() => {
      const karte = document.querySelector('.k-blatt-karte');
      if (!karte) return null;
      const kopf = karte.querySelector('.bk-blatt-kopf, .gk-blatt-kopf, .mb-blatt-kopf');
      const kreuz = karte.querySelector('.k-blatt-zu');
      const koerper = karte.querySelector('.k-blatt-koerper');
      const fuss = karte.querySelector('.k-blatt-fuss');
      return {
        kopf: !!kopf, kreuz: !!kreuz, koerper: !!koerper, fuss: !!fuss,
        titel: kopf ? (kopf.querySelector('h4') || {}).textContent : null,
        // Der Schließen-Knopf gehört in den Fuß, nicht mitten in den Text.
        zuImFuss: !!(fuss && fuss.querySelector('.bk-blatt-zu, .gk-blatt-zu, .mb-blatt-zu')),
      };
    });

    expect(z, 'Die Karte fehlt.').not.toBeNull();
    expect(z.kopf, 'Der Kopf fehlt.').toBe(true);
    expect(z.kreuz, 'Das Schließkreuz fehlt — man sieht nicht, wie man '
      + 'wieder herauskommt.').toBe(true);
    expect(z.koerper, 'Der rollende Körper fehlt.').toBe(true);
    expect(z.fuss, 'Der Fuß fehlt.').toBe(true);
    expect(z.zuImFuss, 'Der Schließen-Knopf steht nicht im Fuß.').toBe(true);
    expect((z.titel || '').trim().length, 'Der Titel ist leer.').toBeGreaterThan(3);
  });
}

/* ══════════════════════════════════════════════════════════════════════
   F4 — Das Schließen funktioniert auf allen Wegen
   ══════════════════════════════════════════════════════════════════════ */

test('TC-B5: Das Schließkreuz schließt', async ({ page }) => {
  await page.setViewportSize({ width: 1460, height: 900 });
  await oeffneBlatt(page, REITER[0]);
  await expect(page.locator(OFFEN)).toHaveCount(1);

  await page.locator('.k-blatt-zu').click();
  await page.waitForTimeout(400);
  await expect(page.locator(OFFEN),
    'Nach dem Tippen auf das Kreuz ist das Blatt noch offen.').toHaveCount(0);
});

test('TC-B6: Ein Tipp neben die Karte schließt', async ({ page }) => {
  await page.setViewportSize({ width: 1460, height: 900 });
  await oeffneBlatt(page, REITER[0]);

  // Oben links — dort liegt sicher die Abdunkelung, nicht die Karte.
  await page.mouse.click(40, 40);
  await page.waitForTimeout(400);
  await expect(page.locator(OFFEN),
    'Ein Tipp neben die Karte schließt nicht — bei einem Dialog erwartet man '
    + 'das.').toHaveCount(0);
});

test('TC-B7: Escape schließt', async ({ page }) => {
  await page.setViewportSize({ width: 1460, height: 900 });
  await oeffneBlatt(page, REITER[0]);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await expect(page.locator(OFFEN), 'Escape schließt das Blatt nicht.')
    .toHaveCount(0);
});

/* ══════════════════════════════════════════════════════════════════════
   F5 — Inhalte bleiben vollständig und bedienbar
   ══════════════════════════════════════════════════════════════════════ */

for (const r of REITER) {
  test(`TC-B8 (${r.name}): Kein Bedienelement geht verloren`, async ({ page }) => {
    await page.setViewportSize({ width: 1460, height: 900 });
    await oeffneBlatt(page, r);

    // Die Gestaltung gruppiert nur um. Jeder Knopf und jedes Feld muss
    // erhalten und anklickbar bleiben.
    const z = await page.evaluate((sel) => {
      const bl = document.querySelector(sel);
      const knoepfe = [...bl.querySelectorAll('button')];
      return {
        anzahl: knoepfe.length,
        unsichtbar: knoepfe.filter((b) => {
          const rr = b.getBoundingClientRect();
          return rr.width < 2 || rr.height < 2;
        }).map((b) => (b.textContent || b.title || '?').trim().slice(0, 28)),
        felder: bl.querySelectorAll('input, select').length,
      };
    }, OFFEN);

    expect(z.anzahl, 'Im Blatt steht kein einziger Knopf.').toBeGreaterThan(1);
    expect(z.unsichtbar,
      `Diese Bedienelemente sind nicht mehr sichtbar: ${z.unsichtbar.join(', ')}`)
      .toEqual([]);
  });
}

test('TC-B9: Der Testbetrieb-Hinweis ist als Warnung gekennzeichnet',
  async ({ page }) => {
    // Solange der Testbetrieb läuft, geht die Bestellung nicht an den
    // Lieferanten. Das ist keine beiläufige Auskunft.
    await page.setViewportSize({ width: 1460, height: 900 });
    await oeffneBlatt(page, REITER[0]);

    const z = await page.evaluate((sel) => {
      const bl = document.querySelector(sel);
      const zeilen = [...bl.querySelectorAll('.bk-blatt-z, .gk-blatt-z, .mb-blatt-z')];
      const test = zeilen.find((x) => /testbetrieb/i.test(x.textContent || ''));
      if (!test) return { gefunden: false };
      return { gefunden: true, warn: test.classList.contains('klein'),
               farbe: getComputedStyle(test).borderLeftColor };
    }, OFFEN);

    if (!z.gefunden) return;   // kein Testbetrieb aktiv - dann nichts zu prüfen
    expect(z.warn,
      'Der Testbetrieb-Hinweis steht wie eine beiläufige Auskunft zwischen '
      + 'allem anderen.').toBe(true);
  });

test('TC-B10: Die Terminwahl bleibt bedienbar', async ({ page }) => {
  await page.setViewportSize({ width: 1460, height: 900 });
  await oeffneBlatt(page, REITER[0]);

  const feld = page.locator('#gk-datum');
  await expect(feld, 'Das Terminfeld fehlt.').toBeVisible();
  const breite = await feld.evaluate((e) => Math.round(e.getBoundingClientRect().width));
  expect(breite, 'Das Terminfeld ist zu schmal zum Bedienen.').toBeGreaterThan(200);
});

/* ══════════════════════════════════════════════════════════════════════
   F6 — Ein geschlossenes Blatt darf nichts blockieren

   Aus dem Laden gemeldet: „Die Buttons öffnen im Kiosk nicht die Seite.
   Open link in new tab funktioniert." Genau dieses Muster — Klick tot,
   Kontextmenü heil — bedeutet, dass etwas Unsichtbares darüberliegt.

   Das Blatt liegt mit `inset:0` über dem ganzen Kiosk. Greift die Regel
   `display:none` für den geschlossenen Zustand nicht, fängt es jeden
   Klick ab, ohne dass man es sieht.
   ══════════════════════════════════════════════════════════════════════ */

test('TC-B11: Geschlossene Blätter fangen keine Klicks ab', async ({ page }) => {
  await page.setViewportSize({ width: 1460, height: 900 });
  await mockApi(page, {});
  await page.goto(KIOSK, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.K, null, { timeout: 20000 });

  // Alle drei Reiter einmal aufrufen — danach sind alle Blätter im Baum.
  for (const r of REITER) {
    await page.evaluate((t) => window.K.switchTab(t), r.tab);
    await page.waitForTimeout(2600);
  }

  const z = await page.evaluate(() => {
    const blaetter = [...document.querySelectorAll('.gk-blatt, .mb-blatt, .bk-blatt')]
      .map((x) => ({ id: x.id, hidden: x.hidden, display: getComputedStyle(x).display }));
    const verdeckt = [];
    document.querySelectorAll('.k-header-acts a, .k-header-acts button').forEach((el) => {
      if (el.offsetParent === null) return;      // ausgeblendete überspringen
      const r = el.getBoundingClientRect();
      const o = document.elementFromPoint(Math.round(r.left + r.width / 2),
                                          Math.round(r.top + r.height / 2));
      if (el.contains(o) || o === el) return;
      const name = o ? (o.id || String(o.className).slice(0, 30)) : 'nichts';
      // Nur melden, wenn ein Blatt im Weg ist — andere Überdeckungen
      // (etwa die Reiterleiste bei schmalem Kopf) sind ein anderes Thema.
      if (/-blatt/.test(name)) {
        verdeckt.push((el.getAttribute('href') || el.id || el.title) + ' <- ' + name);
      }
    });
    return { blaetter, verdeckt };
  });

  for (const b of z.blaetter) {
    expect(b.display,
      `Das geschlossene Blatt ${b.id} steht auf display:${b.display}. Es liegt `
      + 'mit inset:0 über dem ganzen Kiosk und fängt jeden Klick ab.')
      .toBe('none');
  }
  expect(z.verdeckt,
    `Diese Bedienelemente sind von einem Blatt verdeckt: ${z.verdeckt.join(', ')}`)
    .toEqual([]);
});

test('TC-B12: Der Knopf zum CMS öffnet die Seite wirklich', async ({ page }) => {
  await page.setViewportSize({ width: 1460, height: 900 });
  await mockApi(page, {});
  await page.goto(KIOSK, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.K, null, { timeout: 20000 });
  for (const r of REITER) {
    await page.evaluate((t) => window.K.switchTab(t), r.tab);
    await page.waitForTimeout(2600);
  }

  const vorher = page.url();
  await page.click('.k-header-acts a[href="/cms.html"]');
  await page.waitForTimeout(1600);
  expect(page.url(),
    'Der Klick auf den CMS-Knopf hat die Seite nicht geöffnet — so wurde es '
    + 'aus dem Laden gemeldet.').not.toBe(vorher);
});

/* ══════════════════════════════════════════════════════════════════════
   F7 — Die Gestaltung hängt an der Umgruppierung

   Bei einer PWA liefert der Service Worker beim Ausrollen eine Weile
   gemischte Stände aus: neues Gestaltungsblatt, altes Skript. Träfe die
   neue Gestaltung auf ein nicht umgruppiertes Blatt, läge dieses als
   bildschirmfüllende Schicht über dem Kiosk — unbedienbar.

   Deshalb verlangt jede neue Regel die Klasse `k-blatt-bereit`, die erst
   nach dem Umgruppieren gesetzt wird.
   ══════════════════════════════════════════════════════════════════════ */

test('TC-B13: Ohne Umgruppierung bleibt der Kiosk bedienbar', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1460, height: 900 } });

  // Ein altes Skript nachstellen: ohne die Umgruppierung der Blätter.
  await ctx.route('**/js/kiosk-neu-shell.js*', async (route) => {
    const a = await route.fetch();
    let js = await a.text();
    js = js.replace(/blaetterFormen\(\);/g, ';')
           .replace(/blaetterBeobachten\(\);/g, ';');
    await route.fulfill({ status: 200, contentType: 'application/javascript', body: js });
  });

  const page = await ctx.newPage();
  await mockApi(page, {});
  await page.goto(KIOSK, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.K, null, { timeout: 20000 });
  await page.evaluate(() => window.K.switchTab('metzgerbest'));
  await page.waitForTimeout(3000);
  await page.locator('#panel-metzgerbest .mb-mehr').first().click();
  await page.waitForTimeout(700);

  const z = await page.evaluate(() => {
    const bl = document.querySelector('.mb-blatt');
    const s = getComputedStyle(bl);
    const a = document.querySelector('.k-header-acts a[href="/cms.html"]');
    const ar = a.getBoundingClientRect();
    const o = document.elementFromPoint(Math.round(ar.left + ar.width / 2),
                                        Math.round(ar.top + ar.height / 2));
    return {
      bereit: bl.classList.contains('k-blatt-bereit'),
      zIndex: s.zIndex,
      cmsFrei: a.contains(o) || o === a,
    };
  });

  expect(z.bereit,
    'Ohne Umgruppierung darf die Klasse nicht gesetzt sein.').toBe(false);
  expect(z.cmsFrei,
    'Mit altem Skript und neuem Gestaltungsblatt verdeckt das Blatt den '
    + 'ganzen Kiosk. Genau so war er nach dem Ausrollen nicht mehr bedienbar.')
    .toBe(true);
  await ctx.close();
});
