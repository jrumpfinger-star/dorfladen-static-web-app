/**
 * App-Anleitung unter /app — der Wächter
 * Spec: specs/app-anleitung/spec.md
 *
 * Deckt TC-F1-01 bis TC-F9-02 ab. Ein Test je Testfall.
 *
 * Die Seite ist eine Hilfeseite: Sie wird gerade dann aufgerufen, wenn
 * jemand nicht weiterkommt. Deshalb prüft dieser Wächter besonders, dass
 * sie auch ohne JavaScript vollständig lesbar bleibt und dass kein Knopf
 * erscheint, der nichts bewirkt.
 *
 * Ausführen (kein npx in dieser Umgebung):
 *   python -m http.server 8811 --bind 127.0.0.1    (aus static-site/)
 *   $env:TEST_URL='http://127.0.0.1:8811'
 *   node node_modules\@playwright\test\cli.js test tests/app-anleitung.spec.js
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const LOKAL = /localhost|127\.0\.0\.1/.test(BASE);
const APP_URL = LOKAL ? `${BASE}/app.html` : `${BASE}/app`;

const WEGE = ['ios-safari', 'ios-andere', 'android-chrome', 'android-samsung',
  'android-firefox', 'win-chrome', 'mac-safari', 'mac-chrome'];

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.0.0 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
  androidFirefox: 'Mozilla/5.0 (Android 14; Mobile; rv:127.0) Gecko/127.0 Firefox/127.0',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  macChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
};

/** Öffnet die Seite mit einer bestimmten Browserkennung. */
async function oeffne(browser, opts) {
  opts = opts || {};
  const ctx = await browser.newContext({
    userAgent: opts.ua || UA.androidChrome,
    viewport: opts.viewport || { width: 390, height: 844 },
    serviceWorkers: 'block',
  });
  if (opts.init) await ctx.addInitScript(opts.init);
  const page = await ctx.newPage();
  await page.goto(opts.url || APP_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.AppAnleitung, null, { timeout: 15000 });
  await page.waitForTimeout(350);
  return { ctx, page };
}

/** Die Kennungen aller gerade sichtbaren Wege. */
function sichtbareWege(page) {
  return page.evaluate(() => [...document.querySelectorAll('.app-weg')]
    .filter((s) => getComputedStyle(s).display !== 'none')
    .map((s) => s.getAttribute('data-weg')));
}

function lies(datei) {
  return fs.readFileSync(path.join(__dirname, '..', datei), 'utf8');
}

/* ══════════════════════════════════════════════════════════════════════
   F1 — Die Seite ist erreichbar
   ══════════════════════════════════════════════════════════════════════ */

test('TC-F1-01: Die Anleitung ist unter /app erreichbar', async ({ browser }) => {
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const antwort = await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

  expect(antwort.status(), `${APP_URL} lieferte ${antwort.status()}`).toBeLessThan(400);
  await expect(page).toHaveTitle(/App/i);
  await expect(page.locator('h1')).toContainText('Startbildschirm');
  // Das gemeinsame Seitengerüst muss stehen — sonst wirkt die Seite fremd.
  await expect(page.locator('.mob-header, .nv')).not.toHaveCount(0);
  await ctx.close();
});

/* ══════════════════════════════════════════════════════════════════════
   F2 — Acht Wege, vollständig im HTML
   ══════════════════════════════════════════════════════════════════════ */

test('TC-F2-01: Alle acht Wege stehen im HTML', async ({ browser }) => {
  const { ctx, page } = await oeffne(browser);
  const vorhanden = await page.evaluate(() =>
    [...document.querySelectorAll('.app-weg')].map((s) => s.getAttribute('data-weg')));
  expect(vorhanden.sort()).toEqual(WEGE.slice().sort());
  await ctx.close();
});

test('TC-F2-02: Ohne JavaScript bleiben alle Wege lesbar', async ({ browser }) => {
  // Eine Hilfeseite muss auch dann tragen, wenn das Skript nicht läuft.
  const ctx = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

  const sichtbar = await sichtbareWege(page);
  expect(sichtbar.sort(),
    'Ohne JavaScript fehlen Wege — die Seite ist dann unbrauchbar.')
    .toEqual(WEGE.slice().sort());

  // Die Auswahl wäre ohne Skript wirkungslos und bleibt deshalb verborgen.
  await expect(page.locator('#app-wahl')).toBeHidden();
  await expect(page.locator('.app-ohne-js')).toBeVisible();
  await ctx.close();
});

for (const weg of ['ios-andere', 'android-firefox']) {
  test(`TC-F2-03: ${weg} führt weiter, statt ins Leere zu laufen`, async ({ browser }) => {
    const { ctx, page } = await oeffne(browser);
    const s = page.locator(`.app-weg[data-weg="${weg}"]`);

    await expect(s.locator('.app-kasten-umleitung'),
      'Der Hinweis auf den funktionierenden Weg fehlt.').toHaveCount(1);
    await expect(s.locator('.app-schritte'),
      'Hier stehen Installationsschritte, die auf diesem Weg nicht zum Ziel '
      + 'führen. Das beschädigt das Vertrauen in die ganze Anleitung.')
      .toHaveCount(0);
    await expect(s.locator('[data-zeige]'),
      'Es fehlt der Verweis auf den Weg, der tatsächlich funktioniert.')
      .not.toHaveCount(0);
    await ctx.close();
  });
}

/* ══════════════════════════════════════════════════════════════════════
   F3 — Erkennung und Umschaltung
   ══════════════════════════════════════════════════════════════════════ */

const ERKENNUNG = [
  ['iphone', UA.iphone, 'ios-safari', null],
  ['iphoneChrome', UA.iphoneChrome, 'ios-andere', null],
  ['androidChrome', UA.androidChrome, 'android-chrome', null],
  ['samsung', UA.samsung, 'android-samsung', null],
  ['androidFirefox', UA.androidFirefox, 'android-firefox', null],
  ['windows', UA.windows, 'win-chrome', null],
  ['macSafari', UA.macSafari, 'mac-safari', null],
  ['macChrome', UA.macChrome, 'mac-chrome', null],
];

for (const [name, ua, erwartet] of ERKENNUNG) {
  test(`TC-F3-01: ${name} wählt ${erwartet} vor`, async ({ browser }) => {
    const { ctx, page } = await oeffne(browser, { ua });
    expect(await sichtbareWege(page)).toEqual([erwartet]);
    await ctx.close();
  });
}

test('TC-F3-02: Ein iPad wird nicht für einen Mac gehalten', async ({ browser }) => {
  // iPadOS meldet sich als Macintosh. Ohne die Prüfung auf Tastpunkte
  // bekämen iPad-Nutzer die Mac-Anleitung — einen Weg, den es auf ihrem
  // Gerät gar nicht gibt.
  const { ctx, page } = await oeffne(browser, {
    ua: UA.ipad,
    init: () => Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 }),
  });
  expect(await sichtbareWege(page),
    'Das iPad hat die Mac-Anleitung bekommen.').toEqual(['ios-safari']);
  await ctx.close();
});

test('TC-F3-03: Chrome auf dem iPhone landet beim Hinweis', async ({ browser }) => {
  const { ctx, page } = await oeffne(browser, { ua: UA.iphoneChrome });
  expect(await sichtbareWege(page)).toEqual(['ios-andere']);
  await ctx.close();
});

test('TC-F3-04: Ein Weg in der Adresse schlägt die Erkennung', async ({ browser }) => {
  const { ctx, page } = await oeffne(browser, {
    ua: UA.iphone,
    url: APP_URL + '#mac-safari',
  });
  expect(await sichtbareWege(page),
    'Ein weitergegebener Weg muss gelten, auch wenn das Gerät ein anderes ist.')
    .toEqual(['mac-safari']);
  await ctx.close();
});

test('TC-F3-05: Umschalten zeigt genau einen Weg', async ({ browser }) => {
  const { ctx, page } = await oeffne(browser, { ua: UA.iphone });
  expect(await sichtbareWege(page)).toEqual(['ios-safari']);

  await page.click('#app-geraete .app-wk[data-geraet="android"]');
  await page.waitForTimeout(200);
  expect(await sichtbareWege(page)).toEqual(['android-chrome']);

  await page.click('.app-browserreihe .app-wk[data-weg="android-samsung"]');
  await page.waitForTimeout(200);
  expect(await sichtbareWege(page)).toEqual(['android-samsung']);

  // Nur die Browserreihe des gewählten Geräts steht zur Wahl.
  const reihen = await page.evaluate(() => [...document.querySelectorAll('.app-browserreihe')]
    .filter((r) => getComputedStyle(r).display !== 'none')
    .map((r) => r.getAttribute('data-fuer')));
  expect(reihen).toEqual(['android']);

  // Die eigene Wahl steht in der Adresse und ist damit weiterzugeben.
  expect(await page.evaluate(() => location.hash)).toBe('#android-samsung');
  await ctx.close();
});

test('TC-F3-05b: Beim Öffnen springt die Seite nicht weg', async ({ browser }) => {
  // Stünde die Kennung beim Laden in der Adresse, rollte der Browser zum
  // Abschnitt — Überschrift und Statusband wären aus dem Bild.
  const { ctx, page } = await oeffne(browser, {
    ua: UA.windows, viewport: { width: 1280, height: 900 },
  });
  const y = await page.evaluate(() => Math.round(window.scrollY));
  expect(y, `Die Seite ist beim Öffnen um ${y} px weggerollt.`).toBeLessThanOrEqual(2);
  await expect(page.locator('h1')).toBeInViewport();
  await ctx.close();
});

/* ══════════════════════════════════════════════════════════════════════
   F4 — Statusband
   ══════════════════════════════════════════════════════════════════════ */

test('TC-F4-01: In der App gilt die Installation als erledigt', async ({ browser }) => {
  const { ctx, page } = await oeffne(browser, {
    ua: UA.androidChrome,
    init: () => {
      // Die installierte App vortäuschen.
      const echt = window.matchMedia.bind(window);
      window.matchMedia = (q) => (/display-mode:\s*standalone/.test(q)
        ? { matches: true, media: q, addListener() {}, removeListener() {},
            addEventListener() {}, removeEventListener() {} }
        : echt(q));
    },
  });
  await page.waitForTimeout(500);

  await expect(page.locator('#app-status')).toContainText('bereits als App');

  // Eingeklappt, nicht entfernt: Wer mag, sieht die Schritte weiter.
  const weg = page.locator('.app-weg[data-weg="android-chrome"]');
  await expect(weg.locator('.app-schritte')).toBeHidden();
  await expect(weg.locator('.app-kasten', { hasText: 'schon erledigt' })).toHaveCount(1);

  await weg.locator('button', { hasText: 'Schritte trotzdem anzeigen' }).click();
  await expect(weg.locator('.app-schritte')).toBeVisible();
  await ctx.close();
});

test('TC-F4-02: Abgelehnte Erlaubnis erklärt den Rückweg', async ({ browser }) => {
  const { ctx, page } = await oeffne(browser, {
    ua: UA.androidChrome,
    init: () => {
      Object.defineProperty(window.Notification, 'permission', { get: () => 'denied' });
    },
  });
  await page.waitForTimeout(500);

  await expect(page.locator('#app-status')).toContainText('blockiert');
  // Ein Knopf hilft hier nicht mehr weiter — der Weg führt über die
  // Browsereinstellungen.
  await expect(page.locator('#app-push')).toBeDisabled();
  await expect(page.locator('#app-push-note')).toContainText('Einstellungen');
  await ctx.close();
});

/* ══════════════════════════════════════════════════════════════════════
   F5 — Knöpfe handeln nur, wo der Browser es zulässt
   ══════════════════════════════════════════════════════════════════════ */

test('TC-F5-01: Ohne Angebot des Browsers kein Installationsknopf', async ({ browser }) => {
  const { ctx, page } = await oeffne(browser, { ua: UA.androidChrome });
  const zeilen = page.locator('.app-knopfzeile[data-knopf="installieren"]');
  const n = await zeilen.count();
  for (let i = 0; i < n; i++) {
    await expect(zeilen.nth(i),
      'Ein Knopf, der nichts bewirkt, ist schlimmer als gar keiner.')
      .toBeHidden();
  }
  await ctx.close();
});

test('TC-F5-02: Mit Angebot erscheint der Knopf und löst aus', async ({ browser }) => {
  const { ctx, page } = await oeffne(browser, { ua: UA.androidChrome });

  await page.evaluate(() => {
    window.__geprompt = 0;
    // Das Ereignis selbst trägt prompt() und userChoice — genau wie im
    // echten Browser. pwa.js legt das Ereignis in _pwaPrompt ab; ein
    // separat gesetztes Objekt würde dabei überschrieben.
    const ev = new Event('beforeinstallprompt');
    ev.prompt = () => { window.__geprompt++; };
    ev.userChoice = Promise.resolve({ outcome: 'dismissed' });
    window.dispatchEvent(ev);
  });
  await page.waitForTimeout(250);

  const zeile = page.locator('.app-weg[data-weg="android-chrome"] .app-knopfzeile[data-knopf="installieren"]');
  await expect(zeile).toBeVisible();
  await zeile.locator('button').click();
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__geprompt)).toBe(1);
  await ctx.close();
});

test('TC-F5-03: Auf dem iPhone erklärt der Knopf die Reihenfolge', async ({ browser }) => {
  // Apple lässt Benachrichtigungen nur in der installierten App zu. Das
  // vorher zu sagen, erspart einen Fehlschlag.
  const { ctx, page } = await oeffne(browser, { ua: UA.iphone });
  await page.waitForTimeout(400);
  await expect(page.locator('#app-push')).toBeDisabled();
  await expect(page.locator('#app-push-note')).toContainText('Startbildschirm');
  await ctx.close();
});

/* ══════════════════════════════════════════════════════════════════════
   F6 — Die vier Benachrichtigungsarten
   ══════════════════════════════════════════════════════════════════════ */

test('TC-F6-01: Alle vier Arten sind beschrieben', async ({ browser }) => {
  const { ctx, page } = await oeffne(browser);
  const arten = await page.evaluate(() => [...document.querySelectorAll('[data-art]')]
    .map((a) => a.getAttribute('data-art')));
  expect(arten.sort()).toEqual(['bestellung', 'kontakt', 'news', 'tagesinfo']);

  // Je Art: Nutzen, Beispiel und die beiden Angaben Häufigkeit/Empfänger.
  for (const art of arten) {
    const a = page.locator(`[data-art="${art}"]`);
    await expect(a.locator('.app-art-nutzen'), `${art}: kein Nutzen genannt`).toHaveCount(1);
    await expect(a.locator('.app-beispiel'), `${art}: kein Beispiel`).toHaveCount(1);
    await expect(a.locator('.app-art-fakten > div'), `${art}: Angaben fehlen`).toHaveCount(2);
  }
  await ctx.close();
});

test('TC-F6-02: Bei den persönlichen Arten steht, dass nur der Betroffene sie bekommt',
  async ({ browser }) => {
    // Das ist die häufigste Sorge: „Sieht das jetzt jeder?"
    const { ctx, page } = await oeffne(browser);
    for (const art of ['bestellung', 'kontakt']) {
      await expect(page.locator(`[data-art="${art}"]`),
        `Bei „${art}" fehlt der Hinweis, dass die Nachricht nur an den `
        + 'Betroffenen geht.').toContainText('Nur Sie');
    }
    await ctx.close();
  });

/* ══════════════════════════════════════════════════════════════════════
   F7 — Die Kategorie „Antwort auf meine Nachricht" ist abwählbar
   ══════════════════════════════════════════════════════════════════════ */

test('TC-F7-01: Alle vier Kategorien stehen in den Einstellungen zur Wahl', () => {
  const pwa = lies('static-site/js/pwa.js');

  // Die Kategorie `kontakt` wird beim Schreiben einer Nachricht still
  // mitabonniert (js/kontakt.js, merge:true) und stand bisher nicht zur
  // Wahl — man konnte sie weder sehen noch abschalten.
  expect(pwa, 'CAT_LABELS führt „kontakt" nicht').toMatch(/CAT_LABELS\s*=\s*\{[^}]*kontakt:/);
  expect(pwa, 'CAT_DESC führt „kontakt" nicht').toMatch(/CAT_DESC\s*=\s*\{[^}]*kontakt:/);
  expect(pwa, 'CAT_ICONS führt „kontakt" nicht').toMatch(/CAT_ICONS\s*=\s*\{[^}]*kontakt:/);

  const m = pwa.match(/var PUSH_CATS\s*=\s*\[([^\]]*)\]/);
  expect(m, 'Es gibt keine gemeinsame Kategorienliste PUSH_CATS').not.toBeNull();
  for (const c of ['tagesinfo', 'news', 'bestellung', 'kontakt']) {
    expect(m[1], `PUSH_CATS fehlt „${c}"`).toContain(c);
  }

  // Keine alte, dreielementige Liste mehr: Wird eine davon vergessen,
  // ist die Kategorie nur halb sichtbar.
  expect(pwa.match(/\['tagesinfo','news','bestellung'\]/g),
    'Es steht noch eine Kategorienliste ohne „kontakt" im Code.').toBeNull();

  // Die API kennt die Kategorie bereits.
  const api = lies('api/push-subscribe/__init__.py');
  expect(api).toMatch(/ALL_CATEGORIES\s*=\s*\[[^\]]*"kontakt"/);
});

/* ══════════════════════════════════════════════════════════════════════
   F8 — QR-Code und Druckfassung
   ══════════════════════════════════════════════════════════════════════ */

test('TC-F8-01: Der QR-Code ist eingebunden', async ({ browser }) => {
  const { ctx, page } = await oeffne(browser);
  const qr = page.locator('.app-qr');
  await expect(qr).toHaveAttribute('src', /qr-app\.svg$/);
  await expect(qr).toHaveAttribute('alt', /dorfladen-oberornau\.de\/app/);

  // Das Bild muss auch wirklich ankommen.
  const geladen = await qr.evaluate((i) => i.complete && i.naturalWidth > 0);
  expect(geladen, 'Der QR-Code wurde nicht geladen.').toBe(true);

  // Er trägt die richtige Adresse — sonst führt ein Aushang ins Leere.
  const svg = lies('static-site/images/anleitung/qr-app.svg');
  expect(svg).toContain('https://dorfladen-oberornau.de/app');
  await expect(page.locator('.app-adresse')).toContainText('dorfladen-oberornau.de/app');
  await ctx.close();
});

test('TC-F8-02: Im Druck verschwindet alles zum Bedienen', async ({ browser }) => {
  const { ctx, page } = await oeffne(browser, {
    ua: UA.windows, viewport: { width: 1280, height: 900 },
  });
  await page.emulateMedia({ media: 'print' });
  await page.waitForTimeout(200);

  for (const sel of ['.tb', '.nv', '.ft', '.bc', '.cookie-bar', '#app-wahl',
    '.app-knopfzeile']) {
    const n = await page.locator(sel).count();
    if (!n) continue;
    const sichtbar = await page.evaluate((s) => [...document.querySelectorAll(s)]
      .some((e) => getComputedStyle(e).display !== 'none'), sel);
    expect(sichtbar, `${sel} steht noch auf dem Papier.`).toBe(false);
  }

  // Der QR-Code ist der Zweck des Aushangs und muss bleiben.
  const qrDa = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.app-qr')).display !== 'none');
  expect(qrDa, 'Der QR-Code fehlt im Druck.').toBe(true);

  // Eine zugeklappte Frage nützt auf Papier nichts. CSS allein kann ein
  // <details> nicht öffnen — das muss beim Drucken geschehen.
  const zu = await page.evaluate(() => [...document.querySelectorAll('.app-frage')]
    .filter((d) => !d.open).length);
  expect(zu, `${zu} Fragen sind im Druck zugeklappt.`).toBe(0);

  // Gedruckt wird der gewählte Weg, nicht alle acht.
  expect((await sichtbareWege(page)).length).toBe(1);
  await ctx.close();
});

/* ══════════════════════════════════════════════════════════════════════
   F9 — Einstiege
   ══════════════════════════════════════════════════════════════════════ */

test('TC-F9-01: Der Installationsversuch endet nicht mehr in einem alert', () => {
  const pwa = lies('static-site/js/pwa.js');
  const a = pwa.indexOf('function pwaInstall()');
  expect(a, 'pwaInstall() nicht gefunden').toBeGreaterThan(-1);
  const rumpf = pwa.slice(a, pwa.indexOf('function pwaCloseBanner'));
  // Erläuternde Kommentare dürfen das Wort nennen — geprüft wird der Code.
  const code = rumpf.split('\n').filter((z) => !/^\s*\/\//.test(z)).join('\n');

  expect(code,
    'Der nackte alert() ist zurück. Wer nicht weiß, wie das Teilen-Symbol '
    + 'aussieht, kommt damit nicht weiter.').not.toMatch(/alert\(/);
  expect(code, 'Es fehlt der Weg zur bebilderten Anleitung.').toContain("'/app'");
});

test('TC-F9-02: Die Startseite verweist auf die Anleitung', () => {
  const index = lies('static-site/index.html');
  const treffer = index.match(/href="\/app"/g) || [];
  expect(treffer.length,
    'Auf der Startseite fehlt der Verweis auf die Anleitung.')
    .toBeGreaterThanOrEqual(1);

  // Die Route muss die Adresse auch bedienen.
  const cfg = JSON.parse(lies('staticwebapp.config.json'));
  const route = cfg.routes.find((r) => r.route === '/app');
  expect(route, 'In staticwebapp.config.json fehlt die Route /app.').toBeTruthy();
  expect(route.rewrite).toBe('/app.html');
});

/* ══════════════════════════════════════════════════════════════════════
   Abbildungen — ohne sie ist die Anleitung nur halb so gut
   ══════════════════════════════════════════════════════════════════════ */

test('Alle Abbildungen der acht Wege sind vorhanden', async ({ browser }) => {
  // Geprüft wird, ob die Datei ausgeliefert wird — nicht, ob sie gerade im
  // Bild ist: Die Bilder tragen `loading="lazy"` und werden erst beim
  // Scrollen geholt.
  const { ctx, page } = await oeffne(browser);

  const quellen = await page.evaluate(() => {
    const m = {};
    document.querySelectorAll('.app-weg').forEach((s) => {
      m[s.getAttribute('data-weg')] = [...s.querySelectorAll('img')]
        .map((i) => i.getAttribute('src'));
    });
    return m;
  });

  for (const weg of WEGE) {
    expect(quellen[weg], `Der Weg ${weg} fehlt.`).toBeDefined();
    for (const src of quellen[weg]) {
      const r = await page.request.get(new URL(src, APP_URL).href);
      expect(r.status(), `${weg}: ${src} fehlt (${r.status()}).`).toBeLessThan(400);
    }
  }

  // Zwei Wege sind Hinweise ohne Schrittliste; alle übrigen führen bebildert.
  for (const weg of WEGE.filter((w) => w !== 'ios-andere')) {
    expect(quellen[weg].length, `${weg} hat keine einzige Abbildung.`)
      .toBeGreaterThan(0);
  }
  await ctx.close();
});
