/**
 * Online-Hilfe für Kundinnen und Kunden — der Wächter
 * Spec: specs/online-hilfe/spec.md
 *
 * Die Hilfe war komplett veraltet: Sämtliche Bestellfunktionen fehlten,
 * Benachrichtigungen wurden als „Testphase" beschrieben, und drei
 * Mitarbeiterthemen standen in der Kundenhilfe. Dieser Wächter hält den
 * Stand fest — vor allem die Regel, dass die Hilfe keine Werte nennt, die
 * im CMS geändert werden können.
 *
 * Ausführen:
 *   python -m http.server 8811 --bind 127.0.0.1   (aus static-site/)
 *   $env:TEST_URL='http://127.0.0.1:8811'
 *   node node_modules\@playwright\test\cli.js test tests/online-hilfe.spec.js
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const HILFE_URL = `${BASE}/handbuch/hilfe.html`;
const START_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/index.html` : `${BASE}/`;

/* Die Themen, die zuvor vollständig fehlten. */
const NEUE_THEMEN = ['faq-mittag-bestellen', 'faq-bestellstatus', 'faq-storno',
  'faq-fleisch', 'faq-shop', 'faq-kontakt', 'faq-tagesinfo'];

function lies(datei) {
  return fs.readFileSync(path.join(__dirname, '..', datei), 'utf8');
}

async function oeffneHilfe(page, anker) {
  await page.goto(HILFE_URL + (anker || ''), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.faq', { timeout: 15000 });
  await page.waitForTimeout(250);
}

/* ══════════════════════════════════════════════════════════════════════
   F1 — Alle Kundenfunktionen sind erklärt
   ══════════════════════════════════════════════════════════════════════ */

test('TC-F1-01: Die zuvor fehlenden Themen sind da', async ({ page }) => {
  await oeffneHilfe(page);
  const ids = await page.evaluate(() =>
    [...document.querySelectorAll('.faq')].map((f) => f.id));

  for (const id of NEUE_THEMEN) {
    expect(ids, `Das Thema ${id} fehlt — genau diese Funktionen waren in der `
      + 'alten Hilfe nicht erklärt.').toContain(id);
  }
});

test('TC-F1-02: Jedes Thema ist vollständig', async ({ page }) => {
  await oeffneHilfe(page);
  const maengel = await page.evaluate(() =>
    [...document.querySelectorAll('.faq')].map((f) => {
      const fehlt = [];
      if (!f.querySelector('.fq-sym use')) fehlt.push('Symbol');
      if (!(f.querySelector('.fq-f') || {}).textContent) fehlt.push('Frage');
      if (!(f.querySelector('.fq-k') || {}).textContent) fehlt.push('Kurztext');
      const a = f.querySelector('.faq-a');
      if (!a || a.textContent.trim().length < 120) fehlt.push('Antwort zu kurz');
      return fehlt.length ? f.id + ': ' + fehlt.join(', ') : null;
    }).filter(Boolean));

  expect(maengel, `Unvollständige Themen: ${maengel.join(' | ')}`).toEqual([]);
});

/* ══════════════════════════════════════════════════════════════════════
   F2 — Keine veralteten Aussagen
   ══════════════════════════════════════════════════════════════════════ */

test('TC-F2-01: Kein Hinweis mehr auf eine Testphase', async ({ page }) => {
  await oeffneHilfe(page);
  const text = await page.evaluate(() => document.body.innerText);

  expect(text.toLowerCase(),
    'Die Benachrichtigungen wurden als „Testphase" beschrieben — sie laufen '
    + 'längst produktiv.').not.toContain('testphase');
  expect(text.toLowerCase()).not.toContain('noch nicht offiziell');
});

test('TC-F2-02: Alle vier Benachrichtigungsarten sind genannt', async ({ page }) => {
  await oeffneHilfe(page, '#faq-push');
  const abschnitt = page.locator('#faq-push');

  for (const art of ['TagesInfo', 'News', 'Meine Bestellungen',
    'Antwort auf meine Nachricht']) {
    await expect(abschnitt, `Die Art „${art}" fehlt.`).toContainText(art);
  }
  // Die häufigste Sorge: „Sieht das jetzt jeder?"
  await expect(abschnitt,
    'Bei den persönlichen Arten fehlt der Hinweis, dass sie nur an den '
    + 'Betroffenen gehen.').toContainText('nur an Sie');
});

/* ══════════════════════════════════════════════════════════════════════
   F3 — Keine Werte, die sich ändern können
   ══════════════════════════════════════════════════════════════════════ */

test('TC-F3-01: Kein fester Bestellschluss, kein fester Rabattsatz', async ({ page }) => {
  await oeffneHilfe(page);

  for (const id of ['faq-mittag-bestellen', 'faq-fleisch']) {
    const t = await page.locator(`#${id}`).evaluate((e) => e.textContent);

    // Bestellschluss und Rabatt stehen im CMS. Wer sie hier wiederholt,
    // hat nach der nächsten Änderung wieder eine falsche Hilfe.
    const uhrzeit = t.match(/\b(?:[01]?\d|2[0-3])[:.]\d{2}\s*Uhr/g) || [];
    const erlaubt = uhrzeit.filter((u) => !/11[:.]30|13[:.]00/.test(u));
    expect(erlaubt,
      `${id} nennt eine feste Uhrzeit (${erlaubt.join(', ')}). Der `
      + 'Bestellschluss wird im CMS gepflegt — die Hilfe soll auf die Anzeige '
      + 'der Bestellseite verweisen.').toEqual([]);

    expect(t,
      `${id} nennt einen festen Rabattsatz. Auch der steht im CMS.`)
      .not.toMatch(/\d+\s?(?:%|Prozent)/);
  }
});

/* ══════════════════════════════════════════════════════════════════════
   F4 — Ein Thema, eine Stelle
   ══════════════════════════════════════════════════════════════════════ */

test('TC-F4-01: Abschnitte und Suchdaten stimmen überein', async ({ page }) => {
  await oeffneHilfe(page);
  const befund = await page.evaluate(() => {
    const imText = [...document.querySelectorAll('.faq')].map((f) => f.id).sort();
    // THEMEN steht als const im Skript; über die Suche kommen wir heran.
    const roh = [...document.querySelectorAll('script')]
      .map((s) => s.textContent).join('\n');
    const m = roh.match(/const THEMEN = (\[.*?\]);/s);
    const daten = m ? JSON.parse(m[1]) : [];
    return { imText, inSuche: daten.map((d) => d.id).sort() };
  });

  expect(befund.inSuche.length, 'Die Suchdaten sind leer.').toBeGreaterThan(20);
  expect(befund.inSuche,
    'Abschnitte und Suchdaten laufen auseinander — genau daran ist die alte '
    + 'Hilfe veraltet.').toEqual(befund.imText);
});

test('TC-F4-02: Die Themen stehen nicht doppelt auf der Seite', async ({ page }) => {
  await oeffneHilfe(page);
  const karten = await page.locator('.hcard').count();
  expect(karten,
    'Es gibt wieder ein zweites Raster mit denselben Themen — das macht die '
    + 'Seite doppelt so lang, ohne mehr zu sagen.').toBe(0);
});

/* ══════════════════════════════════════════════════════════════════════
   F5 — Suchen mit und ohne Umlaute
   ══════════════════════════════════════════════════════════════════════ */

test('TC-F5-01: Drei Schreibweisen führen zum selben Ergebnis', async ({ page }) => {
  await oeffneHilfe(page);

  for (const wort of ['öffnungszeiten', 'oeffnungszeiten', 'offnungszeiten']) {
    await page.fill('#hs', wort);
    await page.waitForTimeout(220);
    const n = await page.locator('.rcard').count();
    expect(n, `„${wort}" findet nichts. Am Handy tippt kaum jemand Umlaute aus.`)
      .toBeGreaterThan(0);
    await expect(page.locator('.rcard').first()).toContainText(/geöffnet|Öffnung/i);
  }
});

test('TC-F5-02: Ohne Treffer hilft die Telefonnummer weiter', async ({ page }) => {
  await oeffneHilfe(page);
  await page.fill('#hs', 'blumenkohl');
  await page.waitForTimeout(250);

  await expect(page.locator('.rcard')).toHaveCount(0);
  await expect(page.locator('.nores'),
    'Wer nichts findet, braucht einen Ausweg — nicht nur eine leere Liste.')
    .toContainText('622 99 91');
});

test('TC-F5-03: Die Suche findet die Bestellthemen', async ({ page }) => {
  await oeffneHilfe(page);
  // Kunden suchen nach dem, was sie tun wollen - nicht nach unserer Benennung.
  for (const [wort, erwartet] of [['bestellen', 'Mittagessen'],
    ['stornieren', 'storniere'], ['abholen', /abhol/i]]) {
    await page.fill('#hs', wort);
    await page.waitForTimeout(220);
    const n = await page.locator('.rcard').count();
    expect(n, `„${wort}" findet nichts.`).toBeGreaterThan(0);
    if (typeof erwartet === 'string') {
      await expect(page.locator('#rl')).toContainText(erwartet);
    }
  }
});

/* ══════════════════════════════════════════════════════════════════════
   F6 — Keine Mitarbeiterthemen in der Kundenhilfe
   ══════════════════════════════════════════════════════════════════════ */

test('TC-F6-01: Kiosk-Themen sind fort, der Verweis steht', async ({ page }) => {
  await oeffneHilfe(page);
  const ids = await page.evaluate(() =>
    [...document.querySelectorAll('.faq')].map((f) => f.id));
  const kiosk = ids.filter((i) => i.startsWith('faq-kiosk'));

  expect(kiosk,
    `Mitarbeiterthemen in der Kundenhilfe: ${kiosk.join(', ')}. Kalender und `
    + 'Serien gehören ins Kiosk-Handbuch.').toEqual([]);

  await expect(page.locator('a[href*="help-workflows"]'),
    'Der Verweis aufs Kiosk-Handbuch fehlt.').toHaveCount(1);
});

/* ══════════════════════════════════════════════════════════════════════
   F7 — Symbole statt Emojis
   ══════════════════════════════════════════════════════════════════════ */

test('TC-F7-01: Keine Emojis, dafür Symbole', async ({ page }) => {
  await oeffneHilfe(page);
  const befund = await page.evaluate(() => ({
    emojis: (document.body.innerText.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []),
    symbole: document.querySelectorAll('svg.ic use').length,
  }));

  expect(befund.emojis,
    `Emojis im Text: ${befund.emojis.join(' ')}. Sie sehen auf jedem Gerät `
    + 'anders aus und lassen sich nicht einfärben.').toEqual([]);
  expect(befund.symbole).toBeGreaterThan(20);
});

/* ══════════════════════════════════════════════════════════════════════
   F8 — Das Hilfe-Blatt ist vollständig sichtbar
   ══════════════════════════════════════════════════════════════════════ */

test('TC-F8-01: Das Blatt füllt den Bildschirm', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(START_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.openHilfePopup === 'function',
    null, { timeout: 15000 });
  await page.evaluate(() => window.openHilfePopup());
  await page.waitForTimeout(1600);

  const masse = await page.evaluate(() => {
    const i = document.getElementById('hilfe-dialog-inner');
    const f = document.getElementById('hilfe-dialog-frame');
    return i ? { dialog: Math.round(i.getBoundingClientRect().height),
                 rahmen: Math.round(f.getBoundingClientRect().height) }
             : { dialog: 0, rahmen: 0 };
  });

  // Der Rahmen hatte nur eine Maximalhöhe; ein Flex-Kind erbt daraus keine
  // Höhe, und der eingebettete Rahmen fiel auf 150 px zurück.
  expect(masse.dialog,
    `Das Hilfe-Blatt ist nur ${masse.dialog} px hoch — der Inhalt ist `
    + 'abgeschnitten.').toBeGreaterThan(600);
  expect(masse.rahmen,
    `Der eingebettete Bereich ist nur ${masse.rahmen} px hoch.`)
    .toBeGreaterThan(500);
});

test('TC-F8-02: Ein Anker öffnet das passende Thema', async ({ page }) => {
  await oeffneHilfe(page, '#faq-push');
  await page.waitForTimeout(400);
  await expect(page.locator('#faq-push'),
    'Der Aufruf mit Anker öffnet das Thema nicht.').toHaveClass(/open/);
  await expect(page.locator('#faq-push .faq-a')).toBeVisible();
});

test('TC-F8-03: Ein Tippen klappt auf und wieder zu', async ({ page }) => {
  await oeffneHilfe(page);
  const f = page.locator('#faq-storno');
  const knopf = f.locator('.faq-q');

  await expect(f).not.toHaveClass(/open/);
  await knopf.click();
  await expect(f).toHaveClass(/open/);
  await expect(knopf).toHaveAttribute('aria-expanded', 'true');
  await knopf.click();
  await expect(f).not.toHaveClass(/open/);
  await expect(knopf).toHaveAttribute('aria-expanded', 'false');
});

/* ══════════════════════════════════════════════════════════════════════
   Erzeugung — die Datei muss zum Generator passen
   ══════════════════════════════════════════════════════════════════════ */

test('Die ausgelieferte Datei stammt aus dem Generator', () => {
  const inhalt = lies('tools/hilfe_inhalt.py');
  const html = lies('static-site/handbuch/hilfe.html');

  // Jede Kennung aus der Quelle muss in der Datei stehen. Läuft beides
  // auseinander, wurde von Hand in die erzeugte Datei geschrieben.
  const ids = [...inhalt.matchAll(/"id":\s*"(faq-[a-z-]+)"/g)].map((m) => m[1]);
  expect(ids.length, 'In hilfe_inhalt.py stehen keine Themen.').toBeGreaterThan(20);

  const fehlend = ids.filter((id) => !html.includes(`id="${id}"`));
  expect(fehlend,
    `Diese Themen stehen in der Quelle, aber nicht in der Datei: `
    + `${fehlend.join(', ')}. Bitte python tools/hilfe_bauen.py ausführen.`)
    .toEqual([]);
});

/* ══════════════════════════════════════════════════════════════════════
   F9 — Das Besucher-Handbuch stammt aus derselben Quelle
   ══════════════════════════════════════════════════════════════════════ */

const HANDBUCH_URL = `${BASE}/handbuch/homepage-anwenderhandbuch.html`;

test('TC-F9-01: Alle Themen stehen auch im Handbuch', async ({ page }) => {
  await page.goto(HANDBUCH_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.thema', { timeout: 15000 });

  const inhalt = lies('tools/hilfe_inhalt.py');
  const ids = [...inhalt.matchAll(/"id":\s*"(faq-[a-z-]+)"/g)].map((m) => m[1]);
  const imBuch = await page.evaluate(() =>
    [...document.querySelectorAll('.thema')].map((s) => s.id));

  const fehlend = ids.filter((id) => !imBuch.includes(id));
  expect(fehlend,
    `Im Handbuch fehlen: ${fehlend.join(', ')}. Bitte `
    + 'python tools/handbuch_bauen.py ausführen.').toEqual([]);
});

test('TC-F9-02: Keine veralteten Aussagen im Handbuch', async ({ page }) => {
  await page.goto(HANDBUCH_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.thema', { timeout: 15000 });
  const text = (await page.evaluate(() => document.body.innerText)).toLowerCase();

  // Das Handbuch beschrieb eine „Sidebar am linken Bildschirmrand“ — die
  // gibt es seit Langem nicht mehr.
  expect(text, 'Die Beschreibung der Sidebar ist zurück.').not.toContain('sidebar');
  expect(text, 'Die Benachrichtigungen gelten wieder als Testphase.')
    .not.toContain('testphase');

  // Und die Bestellfunktionen müssen darin vorkommen.
  for (const wort of ['vorbestell', 'bestellnummer', 'stornier']) {
    expect(text, `Im Handbuch fehlt „${wort}“.`).toContain(wort);
  }
});

test('TC-F9-03: Das Inhaltsverzeichnis führt überall hin', async ({ page }) => {
  await page.goto(HANDBUCH_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.ivz a', { timeout: 15000 });

  const tot = await page.evaluate(() => [...document.querySelectorAll('.ivz a')]
    .map((a) => a.getAttribute('href'))
    .filter((h) => h && h.startsWith('#') && !document.getElementById(h.slice(1))));

  expect(tot, `Tote Sprungmarken im Inhalt: ${tot.join(', ')}`).toEqual([]);
  const n = await page.locator('.ivz a').count();
  expect(n, 'Das Inhaltsverzeichnis ist leer.').toBeGreaterThan(20);
});
