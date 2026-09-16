/**
 * Kiosk-Start: kein falscher Bereich beim Laden
 *
 * Beschwerde: „Beim Start von Kiosk erscheint immer kurz dieser Screen."
 * Gemeint war der Online-Shop mit „Laden…" — ein Bereich, der im CMS
 * abgeschaltet ist und dessen Reiter gar nicht erscheint.
 *
 * Ursache: Im HTML war der Shop-Reiter fest als aktiv markiert. Welche
 * Bereiche freigeschaltet sind, stand aber erst nach dem Aufruf von
 * /api/cms-config fest. Gemessen lagen dazwischen rund 1,1 Sekunden, in
 * denen der Inhalt eines Bereichs ohne zugehörigen Reiter auf dem Schirm
 * stand.
 *
 * Diese Tests halten fest, dass beim Start nur zu sehen ist, was auch
 * bleibt.
 *
 * Ausführen:
 *   python -m http.server 8811 --bind 127.0.0.1   (aus static-site/)
 *   $env:TEST_URL='http://127.0.0.1:8811'
 *   node node_modules\@playwright\test\cli.js test tests/kiosk-start.spec.js
 */

const { test, expect } = require('@playwright/test');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const KIOSK = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

/* So sieht es beim Dorfladen tatsächlich aus: Shop und Metzger sind
   abgeschaltet, der Mittagstisch ist der Hauptbereich. */
const FLAGS = {
  kiosk_baecker: true, kiosk_kontakt: true, kiosk_metzger: false,
  kiosk_mittag: true, kiosk_shop: false, kiosk_social: true,
};

/**
 * Legt die Mocks an. Die CMS-Antwort wird verzögert — ohne diese
 * Verzögerung ist das Fenster, in dem der falsche Bereich sichtbar war,
 * auf einem schnellen Rechner kaum zu treffen. Auf dem Kassenrechner im
 * Laden ist es real.
 */
async function mocks(ctx, verzoegerung) {
  await ctx.route('**/api/cms-config*', async (route) => {
    if (verzoegerung) await new Promise((r) => setTimeout(r, verzoegerung));
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { feature_flags: FLAGS } }),
    });
  });
  await ctx.route('**/api/**', (route) => {
    if (/cms-config/.test(route.request().url())) return route.fallback();
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: '{"success":true,"data":[],"artikel":[],"gruppen":[]}',
    });
  });
}

/** Merkt Freigaben und zuletzt genutzten Bereich vor, wie nach einem Besuch. */
async function vorbelegen(page, tab) {
  await page.goto(KIOSK, { waitUntil: 'domcontentloaded' });
  await page.evaluate(([f, t]) => {
    try {
      localStorage.setItem('k-tab-flags', JSON.stringify(f));
      if (t) sessionStorage.setItem('k-active-tab', t);
    } catch (e) { /* egal */ }
  }, [FLAGS, tab || '']);
}

/** Beobachtet, was während des Startens auf dem Schirm steht. */
async function startSpur(page, dauerMs) {
  await page.goto(KIOSK, { waitUntil: 'commit' });
  await page.waitForSelector('.k-panel', { state: 'attached', timeout: 20000 });

  const spur = [];
  const bis = Date.now() + (dauerMs || 2600);
  while (Date.now() < bis) {
    const z = await page.evaluate(() => {
      const t = document.querySelector('.k-tab.active');
      const p = document.querySelector('.k-panel.active');
      return {
        tab: t ? t.dataset.tab : null,
        panel: p ? p.id.replace('panel-', '') : null,
        reiterSichtbar: t ? t.style.display !== 'none' : false,
      };
    }).catch(() => null);
    if (z) {
      const l = spur[spur.length - 1];
      if (!l || l.tab !== z.tab || l.panel !== z.panel
          || l.reiterSichtbar !== z.reiterSichtbar) spur.push(z);
    }
    await page.waitForTimeout(60);
  }
  return spur;
}

test.describe('Kiosk-Start', () => {

  test('TC-S1: Kein Bereich ohne zugehörigen Reiter', async ({ browser }) => {
    // Das war der eigentliche Ärger: Der Shop-Inhalt stand da, obwohl sein
    // Reiter fehlte — man sah einen Bereich, den es gar nicht mehr gibt.
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    await mocks(ctx, 1500);
    const page = await ctx.newPage();
    await vorbelegen(page, '');

    const spur = await startSpur(page);
    const verwaist = spur.filter((z) => z.tab && !z.reiterSichtbar);
    expect(verwaist.map((z) => z.tab),
      `Beim Start war der Inhalt dieser Bereiche zu sehen, ohne dass ihr `
      + `Reiter dastand: ${verwaist.map((z) => z.tab).join(', ')}`).toEqual([]);
    await ctx.close();
  });

  test('TC-S2: Der abgeschaltete Shop blitzt nicht auf', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    await mocks(ctx, 1500);
    const page = await ctx.newPage();
    await vorbelegen(page, '');

    const spur = await startSpur(page);
    const shop = spur.filter((z) => z.panel === 'abhol');
    expect(shop.length,
      'Der Online-Shop ist im CMS abgeschaltet, sein Inhalt war beim Start '
      + 'aber trotzdem zu sehen.').toBe(0);
    await ctx.close();
  });

  test('TC-S3: Mit gemerkten Freigaben steht der Bereich sofort fest',
    async ({ browser }) => {
      // Ab dem zweiten Besuch sind die Freigaben bekannt. Dann darf sich der
      // angezeigte Bereich beim Start überhaupt nicht mehr ändern.
      const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
      await mocks(ctx, 1500);
      const page = await ctx.newPage();
      await vorbelegen(page, 'getraenke');

      const spur = await startSpur(page);
      const bereiche = [...new Set(spur.map((z) => z.panel))];
      expect(bereiche,
        `Der Bereich hat beim Start gewechselt: ${bereiche.join(' -> ')}`)
        .toEqual(['getraenke']);
      await ctx.close();
    });

  test('TC-S4: Ein abgeschalteter Merkwert führt nicht in die Irre',
    async ({ browser }) => {
      // Wer zuletzt im Shop war und ihn danach abgeschaltet bekommt, darf
      // ihn beim nächsten Start nicht wiedersehen.
      const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
      await mocks(ctx, 1500);
      const page = await ctx.newPage();
      await vorbelegen(page, 'abhol');

      const spur = await startSpur(page);
      expect(spur.filter((z) => z.panel === 'abhol').length,
        'Der abgeschaltete Shop wurde wieder geöffnet.').toBe(0);
      expect(spur.length, 'Es war gar kein Bereich aktiv.').toBeGreaterThan(0);
      await ctx.close();
    });

  test('TC-S5: Der zuletzt genutzte Bereich kommt wieder', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    await mocks(ctx, 0);
    const page = await ctx.newPage();
    await vorbelegen(page, 'baecker');

    await page.goto(KIOSK, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    const aktiv = await page.evaluate(() => {
      const t = document.querySelector('.k-tab.active');
      return t ? t.dataset.tab : null;
    });
    expect(aktiv, 'Der zuletzt genutzte Bereich wurde nicht wiederhergestellt.')
      .toBe('baecker');
    await ctx.close();
  });

  test('TC-S6: Der gewählte Bereich wird auch wirklich geladen', async ({ browser }) => {
    // Der Startbereich wird inzwischen schon im HTML gesetzt. Ohne einen
    // switchTab-Aufruf würden die Fachmodule (Bäcker, Mair, Getränke,
    // Kalender) nie hochfahren — der Bereich bliebe leer.
    for (const tab of ['getraenke', 'baecker', 'kalender']) {
      const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
      await mocks(ctx, 0);
      const page = await ctx.newPage();
      await vorbelegen(page, tab);

      await page.goto(KIOSK, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      const inhalt = await page.evaluate(() => {
        const p = document.querySelector('.k-panel.active');
        return p ? p.innerText.trim().length : 0;
      });
      expect(inhalt, `Der Bereich „${tab}" ist beim Start leer geblieben.`)
        .toBeGreaterThan(20);
      await ctx.close();
    }
  });

  test('TC-S7: Ohne Antwort des Servers bleibt der Kiosk bedienbar',
    async ({ browser }) => {
      // Fällt die Verbindung aus, darf der Kiosk nicht ohne Bereich dastehen.
      const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
      await ctx.route('**/api/cms-config*', (route) => route.abort());
      await ctx.route('**/api/**', (route) => {
        if (/cms-config/.test(route.request().url())) return route.fallback();
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: '{"success":true,"data":[]}' });
      });
      const page = await ctx.newPage();
      await page.goto(KIOSK, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);

      const z = await page.evaluate(() => {
        const t = document.querySelector('.k-tab.active');
        return { tab: t ? t.dataset.tab : null,
                 sichtbar: t ? t.style.display !== 'none' : false };
      });
      expect(z.tab, 'Nach einem Verbindungsfehler ist kein Bereich aktiv.')
        .toBeTruthy();
      expect(z.sichtbar, 'Der aktive Bereich hat keinen sichtbaren Reiter.')
        .toBe(true);
      await ctx.close();
    });
});

/* ══════════════════════════════════════════════════════════════════════
   F4 — Das Bau-Werkzeug darf nichts stillschweigend löschen

   kiosk.html wird aus kiosk-klassisch.html erzeugt. Bei dieser Arbeit kam
   heraus, dass das Werkzeug veraltet war: Ein Lauf löschte den
   Getränke-Reiter aus der Seite und 47 Gestaltungsregeln aus
   css/kiosk-base.css — beides stillschweigend.
   ══════════════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const WURZEL = path.join(__dirname, '..');

function lies(datei) {
  return fs.readFileSync(path.join(WURZEL, datei), 'utf8');
}

test.describe('Bau-Werkzeug des Kiosks', () => {

  test('TC-S8a: Die Reiterliste ist vollständig', () => {
    const werkzeug = lies('tools/build-kiosk-neu.js');
    const quelle = lies('static-site/kiosk-klassisch.html');

    const inQuelle = [...quelle.matchAll(/<div class="k-tab[^"]*" data-tab="([a-z]+)"/g)]
      .map((m) => m[1]);
    expect(inQuelle.length, 'In der Quelle stehen keine Reiter.').toBeGreaterThan(5);

    const fehlend = inQuelle.filter((id) => !new RegExp(`id: '${id}'`).test(werkzeug));
    expect(fehlend,
      `Diese Reiter kennt das Werkzeug nicht: ${fehlend.join(', ')}. Ein Lauf `
      + 'würde sie aus kiosk.html löschen — so ist der Getränke-Reiter '
      + 'einmal verschwunden.').toEqual([]);
  });

  test('TC-S8b: Der Mittagstisch ist der Startbereich', () => {
    const werkzeug = lies('tools/build-kiosk-neu.js');
    const zeile = (werkzeug.match(/\{ id: '(\w+)'[^}]*aktiv: true[^}]*\}/) || [])[1];
    expect(zeile,
      'Im Werkzeug ist ein anderer Bereich als der Mittagstisch als Startbereich '
      + 'gesetzt. Der Online-Shop wäre besonders unglücklich — er ist '
      + 'abgeschaltet.').toBe('mittag');

    // Und in den erzeugten Dateien muss es genauso stehen.
    for (const datei of ['static-site/kiosk.html', 'static-site/kiosk-neu.html',
      'static-site/kiosk-klassisch.html']) {
      const t = lies(datei);
      expect((t.match(/class="k-tab active" data-tab="(\w+)"/) || [])[1],
        `${datei}: falscher Startreiter`).toBe('mittag');
      expect((t.match(/class="k-panel active" id="panel-(\w+)"/) || [])[1],
        `${datei}: falscher Startbereich`).toBe('mittag');
    }
  });

  test('TC-S8c: Quelle und erzeugte Dateien sind deckungsgleich', () => {
    // Der eigentliche Wächter gegen erneutes Auseinanderlaufen: Ein Lauf
    // des Werkzeugs darf die ausgelieferten Dateien NICHT verändern. Tut
    // er es doch, wurde direkt in einer erzeugten Datei gepflegt — genau
    // so gingen einmal der Getränke-Reiter und 47 Gestaltungsregeln
    // beinahe verloren.
    const dateien = ['static-site/kiosk.html', 'static-site/kiosk-neu.html',
      'static-site/css/kiosk-base.css'];
    const vorher = {};
    for (const d of dateien) vorher[d] = fs.readFileSync(path.join(WURZEL, d), 'utf8');

    let ausgabe = '';
    let fehlgeschlagen = false;
    try {
      ausgabe = execFileSync('node', ['tools/build-kiosk-neu.js'],
        { cwd: WURZEL, encoding: 'utf8', stdio: 'pipe' });
    } catch (e) {
      fehlgeschlagen = true;
      ausgabe = String(e.stdout || '') + String(e.stderr || '');
    }

    const geaendert = [];
    for (const d of dateien) {
      const jetzt = fs.readFileSync(path.join(WURZEL, d), 'utf8');
      if (jetzt !== vorher[d]) {
        geaendert.push(d);
        fs.writeFileSync(path.join(WURZEL, d), vorher[d]);   // Stand wiederherstellen
      }
    }

    expect(fehlgeschlagen,
      `Das Werkzeug ist abgebrochen:\n${ausgabe.slice(-600)}`).toBe(false);
    expect(geaendert,
      `Ein Lauf von tools/build-kiosk-neu.js würde diese Dateien ändern: `
      + `${geaendert.join(', ')}. Das heißt, es wurde direkt in einer erzeugten `
      + 'Datei gepflegt — bitte nach static-site/kiosk-klassisch.html übertragen.')
      .toEqual([]);
  });
});
