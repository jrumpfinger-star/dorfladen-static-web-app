/**
 * Bestellreiter auf dem Telefon — der Wächter
 * Spec: specs/kiosk-bestellreiter-mobil/spec.md
 *
 * Dieser Test misst, wie sich die Höhe eines Bestellreiters verteilt:
 * Wie viel steht fest über der Liste, wie viel unter ihr, wie viel bleibt
 * der Arbeitsfläche — und wie viele Artikelzeilen sind ohne Scrollen ganz
 * zu sehen.
 *
 * Er ist bewusst vor der Umsetzung entstanden und beschreibt das Ziel:
 * Solange der Kiosk unverändert ist, schlägt er fehl und nennt den Block,
 * der die Grenze reißt.
 *
 * Voraussetzung an das Markup: Der scrollende Bereich jedes Bestellreiters
 * trägt die Klasse `k-liste`. Ohne diese Markierung ließe sich nicht
 * zuverlässig sagen, was Kopfbereich und was Arbeitsfläche ist.
 *
 *   $env:TEST_URL='http://127.0.0.1:8811'
 *   node node_modules\@playwright\test\cli.js test tests/kiosk-bestellreiter-mobil.spec.js
 */

const { test, expect } = require('@playwright/test');

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

// Das kleine Android-Telefon aus dem Laden. Die Verfassung fordert 375 × 667;
// gearbeitet wird auch auf 360 × 640, und dort ist der Platz am knappsten.
const KLEIN = { width: 360, height: 640 };

const TAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

function iso(d) {
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)
    + '-' + ('0' + d.getDate()).slice(-2);
}
function tagPlus(n) { const d = new Date(); d.setDate(d.getDate() + n); return d; }

/* ── Daten, die den Kopfbereich maximal fordern ────────────────────────
   Absicht: der ungünstigste Fall aus TC-F2-02. Lange Artikelnamen, ein Tag
   mit zwei Lieferanten, Testbetrieb an, eine offene Erinnerung. Wer damit
   die Grenze hält, hält sie immer. */

const ARTIKEL_LANG = [
  { nummer: '1', name: 'Kaisersemmel', gruppe: 'Semmeln & Kleingebäck', menge: 80 },
  { nummer: '33', name: 'Mohnsemmel', gruppe: 'Semmeln & Kleingebäck', menge: 2 },
  { nummer: '34', name: 'Sesamsemmel', gruppe: 'Semmeln & Kleingebäck', menge: 2 },
  { nummer: '39', name: 'Roggensemmel mit Kümmel', gruppe: 'Semmeln & Kleingebäck', menge: 2 },
  { nummer: '53', name: 'Doppelte', gruppe: 'Semmeln & Kleingebäck', menge: 3 },
  { nummer: '126', name: 'Baguette 400g', gruppe: 'Brote & Baguettes', menge: 1 },
  { nummer: '160', name: 'Sonnenblumenkernbrot 750 g', gruppe: 'Brote & Baguettes', menge: 2 },
  { nummer: '188', name: 'Superlaib mit Körner 2kg', gruppe: 'Brote & Baguettes', menge: 1 },
  { nummer: '201', name: '6-Korn-Quarkbrot 500g', gruppe: 'Brote & Baguettes', menge: 1 },
  { nummer: '233', name: 'Dinkelvollkorn Pur 500g', gruppe: 'Brote & Baguettes', menge: 2 },
  { nummer: '301', name: 'König-Ludwig-Brot 1kg', gruppe: 'Brote & Baguettes', menge: 2 },
  { nummer: '410', name: 'Nussschnecke', gruppe: 'Süßes & Sonstiges', menge: 4 },
];

function baeckerTage() {
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = tagPlus(i);
    const ist = d.getDay() !== 0;                 // sonntags keine Lieferung
    const zwei = i === 2;                         // ein Tag mit zwei Bäckereien
    out.push({
      datum: iso(d), wochentag: TAGE[d.getDay()],
      bestelltag: ist, bestellbar: ist && i > 0, heute: i === 0,
      heute_bestellen: i === 1,
      status: !ist ? 'kein_tag' : (i === 0 ? 'vorbei' : 'offen'),
      fertig: 0, gesamt: ist ? (zwei ? 2 : 1) : 0,
      lieferanten: !ist ? [] : (zwei
        ? [{ baeckerei: 'freundl', name: 'Bäckerei Freundl', status: 'offen', druck_offen: false },
           { baeckerei: 'gruener', name: 'Bäckerei Grüner', status: 'offen', druck_offen: false }]
        : [{ baeckerei: 'freundl', name: 'Bäckerei Freundl', status: 'offen', druck_offen: false }]),
    });
  }
  return out;
}

function baeckerBestellung() {
  const t = baeckerTage().find((x) => x.bestellbar);
  return {
    datum: t.datum, wochentag: t.wochentag,
    datum_de: t.datum.split('-').reverse().join('.'),
    status: 0, gesperrt: false, bestellbar: true, korrektur_moeglich: false,
    vorlage_datum: '2026-09-03', vorlage_datum_de: '03.09.2026',
    bestellschluss_datum_de: '10.09.2026', bestellschluss_wochentag: 'Donnerstag',
    protokoll: [], tour_nr: '87', kd_nr: '1190',
    baeckerei: 'freundl', baeckerei_name: 'Bäckerei Freundl',
    papierausdruck: false, gedruckt_am: '', druck_offen: false,
    empfaenger: 'jrumpfinger@t-online.de', testbetrieb: true,
    positionen: ARTIKEL_LANG.map((a) => ({
      nummer: a.nummer, name: a.name, aktiv: true, menge: a.menge,
      retoure: 0, vorbelegt: a.menge, verlauf: [a.menge, a.menge, a.menge], zusatz: false,
    })),
  };
}

const GETRAENKE_ARTIKEL = ARTIKEL_LANG.map((a, i) => ({
  nummer: 'KA4001' + i, name: a.name, gruppe: i < 5 ? 'Bier' : 'Alkoholfrei',
  gebinde: '20 × 0,5 l', preis: 12.5 + i, pfand: 3.1, menge: a.menge % 4,
  // „Übliche Artikel" entscheidet sich an der Zahl früherer Bestellungen.
  bestellungen: 9, ueblich: 4, aktiv: true,
}));

async function mockApi(page) {
  await page.route(/\/api\//, (r) => {
    const url = r.request().url();
    const method = r.request().method();
    const json = (o) => r.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(o),
    });

    if (/cms-config/.test(url)) {
      return json({ success: true, data: { feature_flags: {
        kiosk_mittag: true, kiosk_baecker: true, kiosk_metzger: true,
        kiosk_metzgerbest: true, kiosk_getraenke: true, kiosk_kontakt: true,
      } } });
    }

    /* ── Bäcker ── */
    if (/baecker-artikel/.test(url)) {
      return json({ success: true, artikel: ARTIKEL_LANG.map((a) => ({
        nummer: a.nummer, name: a.name, aktiv: true, bestellt_in: 12, gruppe: a.gruppe,
      })), anzahl_aktiv: ARTIKEL_LANG.length, anzahl_gesamt: 60 });
    }
    if (/baecker-order/.test(url)) {
      if (method === 'POST') return json({ success: true, status: 1, protokoll: [] });
      if (/mode=uebersicht/.test(url)) {
        const tage = baeckerTage();
        return json({ success: true, tage, naechster: tage.find((t) => t.bestellbar).datum,
          offen_gesamt: 1,
          erinnerung: { offen: true, blinkt: false, datum: tage.find((t) => t.bestellbar).datum,
            wochentag: 'Freitag', bestellschluss: '12:00' } });
      }
      if (/mode=verlauf/.test(url)) return json({ success: true, verlauf: [] });
      if (/mode=dokument/.test(url)) return json({ success: true, html: '<p>Formular</p>' });
      return json({ success: true, bestellung: baeckerBestellung() });
    }

    /* ── Metzger ── */
    if (/metzger-artikel/.test(url)) {
      return json({ success: true, artikel: ARTIKEL_LANG.map((a) => ({
        nummer: Number(a.nummer), name: a.name, preis: 12.4, einheit: 'kg',
        gruppe: a.gruppe, aktiv: true, auf_formular: true,
      })) });
    }
    if (/metzger-order/.test(url)) {
      if (method === 'POST') {
        return json({ success: true, status: 1, testbetrieb: true, protokoll: [], summen: {} });
      }
      if (/mode=verlauf/.test(url)) return json({ success: true, verlauf: [] });
      const datum = iso(tagPlus(1));
      const config = { empfaenger: 'jrumpfinger@t-online.de', name: 'Metzgerei Mair',
        kd_nr: '1041', liefertage: [1, 3, 5] };
      if (/metzger-order\/\d{4}-\d{2}-\d{2}/.test(url)) {
        return json({ success: true,
          bestellung: { datum, status: 0, protokoll: [],
            positionen: ARTIKEL_LANG.map((a) => ({
              nummer: Number(a.nummer), name: a.name,
              portionen: [{ anzahl: a.menge || 1, menge: 500, einheit: 'g', vakuum: true }],
              hinweis: '', zusatz: false })) },
          artikel: ARTIKEL_LANG.map((a) => ({
            nummer: Number(a.nummer), name: a.name, preis: 12.4, einheit: 'kg',
            gruppe: a.gruppe, aktiv: true, auf_formular: true })),
          vorschlaege: {}, vorbelegt_aus: '2026-08-24', letzte: null,
          bestelltag: true, bestellbar: true, config, testbetrieb: true, summen: {} });
      }
      return json({ success: true, aktiv: datum, config, testbetrieb: true,
        tage: baeckerTage().map((t) => ({ datum: t.datum, wochentag: t.wochentag,
          bestelltag: t.bestelltag, bestellbar: t.bestellbar, status: 0 })) });
    }

    /* ── Getränke ── */
    if (/getraenke-artikel/.test(url)) {
      return json({ success: true, artikel: GETRAENKE_ARTIKEL });
    }
    if (/getraenke-order/.test(url)) {
      if (method === 'POST') return json({ success: true, status: 1 });
      return json({ success: true,
        termin: iso(tagPlus(4)), kw: 38,
        config: { name: 'Getränke Kratzer', empfaenger: 'jrumpfinger@t-online.de',
          kd_nr: '15554', tour: '1' },
        testbetrieb: true,
        gruppen: ['Bier', 'Alkoholfrei'],
        artikel: GETRAENKE_ARTIKEL,
        positionen: GETRAENKE_ARTIKEL.map((a) => ({ nummer: a.nummer, menge: a.menge })),
        letzte: { datum: iso(tagPlus(-7)), datum_de: '03.09.2026',
          positionen: GETRAENKE_ARTIKEL.map((a) => ({ nummer: a.nummer, menge: a.menge })),
          summe: 553.22 },
        pfand: { '20 × 0,5 l': 3.1 },
        bestellbar: true,
        bestellung: { status: 0, positionen: [] } });
    }

    return json({ success: true });
  });
}

/* ── Messung ───────────────────────────────────────────────────────────
   Der scrollende Bereich trägt `k-liste`. Alles darüber ist fester
   Kopfbereich, alles darunter Fuß- und Reiterleiste. */
async function miss(page, zeileSel) {
  return page.evaluate((sel) => {
    const sichtbar = (e) => e && e.getClientRects().length > 0;
    const liste = [...document.querySelectorAll('.k-liste')].find(sichtbar);
    if (!liste) {
      // Ohne Markierung lässt sich nichts messen — der Reiter ist noch nicht
      // in feste Kopfbereiche und Arbeitsfläche geteilt.
      const bloecke = [...document.querySelectorAll('.k-main *')]
        .filter((e) => sichtbar(e) && e.getBoundingClientRect().height > 40)
        .slice(0, 6)
        .map((e) => (e.className || e.tagName) + ': '
          + Math.round(e.getBoundingClientRect().height) + ' px');
      return { fehlt: true, bloecke };
    }
    const r = liste.getBoundingClientRect();
    const H = window.innerHeight;
    const zeilen = [...document.querySelectorAll(sel)].filter(sichtbar);
    const ganz = zeilen.filter((z) => {
      const zr = z.getBoundingClientRect();
      return zr.top >= r.top - 0.5 && zr.bottom <= r.bottom + 0.5;
    }).length;

    /* Reicht die Liste über den Bildschirm hinaus, ist sie kein begrenzter
       Rollbereich: Die Fußzeile legt sich dann über die letzten Zeilen,
       und die Zählung oben täuscht eine Sichtbarkeit vor, die es nicht
       gibt. Genau das ist beim ersten Umbau passiert. */
    const laeuftUeber = Math.round(r.bottom) > H + 1;

    // Was steht fest über der Liste? Für die Fehlermeldung mit Namen.
    const oben = [];
    let e = liste.previousElementSibling;
    while (e) { if (sichtbar(e)) oben.push((e.className || e.tagName).toString().split(' ')[0]
      + ' ' + Math.round(e.getBoundingClientRect().height)); e = e.previousElementSibling; }
    const kopf = document.querySelector('header');
    if (sichtbar(kopf)) oben.push('header ' + Math.round(kopf.getBoundingClientRect().height));

    return {
      fehlt: false,
      laeuftUeber,
      hoehe: H,
      obenPx: Math.round(r.top),
      untenPx: Math.round(H - r.bottom),
      listePx: Math.round(r.height),
      obenPz: +(r.top / H * 100).toFixed(1),
      untenPz: +((H - r.bottom) / H * 100).toFixed(1),
      zeilenGesamt: zeilen.length,
      zeilenGanz: ganz,
      bloecke: oben,
    };
  }, zeileSel);
}

async function oeffne(page, tab) {
  await mockApi(page);
  await page.goto(KIOSK_URL);
  await page.waitForFunction(() => !!window.K, null, { timeout: 20000 });
  await page.evaluate((t) => window.K.switchTab(t), tab);
  // Der Getränke-Reiter lädt in zwei Schritten (Übersicht, dann Termin);
  // mit 1200 ms war der zweite noch unterwegs.
  await page.waitForTimeout(2600);
}

/** Erwartungen aus F1 und F2, mit sprechender Meldung im Fehlerfall. */
function pruefe(m, name, mindestens) {
  const wo = m.bloecke ? m.bloecke.join(' · ') : '—';
  expect(m.fehlt, `${name}: kein Bereich mit der Klasse „k-liste" gefunden — `
    + `der Reiter ist nicht in festen Kopfbereich und Liste geteilt. `
    + `Große Blöcke: ${wo}`).toBe(false);

  expect(m.laeuftUeber, `${name}: Die Liste reicht über den Bildschirmrand `
    + `hinaus — sie ist kein begrenzter Rollbereich, und die Fußzeile legt `
    + `sich über die letzten Zeilen.`).toBe(false);

  expect(m.obenPz, `${name}: Der feste Kopfbereich nimmt ${m.obenPx} px `
    + `(${m.obenPz} %) — erlaubt sind 45 %. Blöcke über der Liste: ${wo}`)
    .toBeLessThanOrEqual(45);

  expect(m.untenPz, `${name}: Fuß- und Reiterleiste nehmen ${m.untenPx} px `
    + `(${m.untenPz} %) — erlaubt sind 25 %.`).toBeLessThanOrEqual(25);

  expect(m.zeilenGanz, `${name}: nur ${m.zeilenGanz} von ${m.zeilenGesamt} `
    + `Artikelzeilen ganz sichtbar (gefordert: ${mindestens}). `
    + `Liste ${m.listePx} px, Kopfbereich ${m.obenPx} px: ${wo}`)
    .toBeGreaterThanOrEqual(mindestens);
}

const REITER = [
  { tab: 'baecker', name: 'Bäcker', zeile: '.bk-row' },
  { tab: 'metzgerbest', name: 'Mair', zeile: '.mb-zeile' },
  { tab: 'getraenke', name: 'Getränke', zeile: '.gk-row' },
];

test.describe('Bestellreiter auf dem Telefon', () => {
  for (const r of REITER) {
    test(`TC-F1-01/02 + TC-F2-01: ${r.name} bei 360 × 640`, async ({ page }) => {
      await page.setViewportSize(KLEIN);
      await oeffne(page, r.tab);
      const m = await miss(page, r.zeile);
      pruefe(m, `${r.name} (360 × 640)`, 4);
    });

    test(`TC-F1-03 + TC-F2-01: ${r.name} im Projekt-Viewport`, async ({ page }, info) => {
      await oeffne(page, r.tab);
      const m = await miss(page, r.zeile);
      // Auf dem Tablet ist mehr Platz, also gilt die höhere Schwelle.
      const breit = info.project.use.viewport.height >= 1000;
      pruefe(m, `${r.name} (${info.project.name})`, breit ? 10 : 4);
    });
  }

  test('TC-F7-01: Beim Reiterwechsel bleibt nur ein Panel sichtbar', async ({ page }) => {
    // Regression: Ein Reiter mit geteiltem Aufbau (.k-geteilt) trug die
    // Anzeige frueher unabhaengig vom aktiven Tab (display:flex schlug das
    // display:none inaktiver Panels). Beim Wechsel ueberlagerten sich dann
    // zwei Reiter. Sichtbar darf immer nur das aktive Panel sein.
    await page.setViewportSize(KLEIN);
    await oeffne(page, 'getraenke');                 // setzt k-geteilt auf Getraenke
    await page.evaluate(() => window.K.switchTab('metzgerbest'));
    await page.waitForTimeout(2600);
    await page.evaluate(() => window.K.switchTab('baecker'));
    await page.waitForTimeout(2600);
    const sichtbar = await page.evaluate(() => [...document.querySelectorAll('.k-panel')]
      .filter((p) => getComputedStyle(p).display !== 'none')
      .map((p) => p.id));
    expect(sichtbar,
      `Sichtbare Panels: ${sichtbar.join(', ') || 'keins'}`).toEqual(['panel-baecker']);
  });

  test('TC-F3-01: Die Sendeschaltfläche gibt es genau einmal', async ({ page }) => {
    await page.setViewportSize(KLEIN);
    await oeffne(page, 'baecker');
    const treffer = await page.evaluate(() => [...document.querySelectorAll('button')]
      .filter((b) => b.getClientRects().length && /An Bäckerei senden|Korrektur senden/.test(b.textContent))
      .map((b) => b.className));
    expect(treffer.length,
      `Die Sendeschaltfläche steht ${treffer.length}-mal im Bild: ${treffer.join(' · ')}`).toBe(1);
  });

  test('TC-F4-01/04: Tageskacheln zwischen 44 und 56 px', async ({ page }) => {
    await page.setViewportSize(KLEIN);
    await oeffne(page, 'baecker');
    const masse = await page.evaluate(() => [...document.querySelectorAll('.bk-day')]
      .filter((e) => e.getClientRects().length)
      .map((e) => { const r = e.getBoundingClientRect();
        return { h: Math.round(r.height), b: Math.round(r.width), t: e.textContent.trim().slice(0, 14) }; }));
    expect(masse.length).toBeGreaterThan(0);
    for (const k of masse) {
      expect(k.h, `Kachel „${k.t}" ist ${k.h} px hoch — mindestens 44 sind gefordert`)
        .toBeGreaterThanOrEqual(44);
      expect(k.h, `Kachel „${k.t}" ist ${k.h} px hoch — höchstens 56 sind erlaubt`)
        .toBeLessThanOrEqual(56);
      expect(k.b, `Kachel „${k.t}" ist ${k.b} px breit`).toBeGreaterThanOrEqual(44);
    }
  });

  test('TC-F4-02: Wochentag und Datum stehen in einer Zeile', async ({ page }) => {
    await page.setViewportSize(KLEIN);
    await oeffne(page, 'baecker');
    const gleich = await page.evaluate(() => {
      const k = document.querySelector('.bk-day');
      const wt = k.querySelector('span:not(.d):not(.st):not(.bk-who)');
      const dt = k.querySelector('.d');
      if (!wt || !dt) return null;
      return Math.abs(wt.getBoundingClientRect().top - dt.getBoundingClientRect().top) < 3;
    });
    expect(gleich, 'Wochentag und Datum stehen nicht auf derselben Höhe').toBe(true);
  });

  test('TC-F5-02: Keine Antippfläche unter 44 px', async ({ page }) => {
    await page.setViewportSize(KLEIN);
    await oeffne(page, 'baecker');
    const klein = await page.evaluate(() => [...document.querySelectorAll(
      '.k-main button, .k-main input[type=number], .k-main input[type=text], .k-main select')]
      .filter((e) => e.getClientRects().length)
      .map((e) => { const r = e.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height),
          t: (e.textContent || e.className).trim().slice(0, 20) }; })
      .filter((e) => e.h < 44 || e.w < 44));
    expect(klein, `Zu kleine Flächen: ${klein.map((k) => `${k.t} ${k.w}×${k.h}`).join(' · ')}`)
      .toEqual([]);
  });

  test('TC-F2-02: Auch mit allen Hinweisen zugleich', async ({ page }) => {
    // baeckerTage() liefert bewusst einen Tag mit zwei Bäckereien, eine offene
    // Erinnerung und Testbetrieb — der ungünstigste Fall.
    await page.setViewportSize(KLEIN);
    await oeffne(page, 'baecker');
    const m = await miss(page, '.bk-row');
    pruefe(m, 'Bäcker im ungünstigsten Fall', 4);
  });

  test('TC-F6-01: Im Getränke-Reiter scrollt nur die Liste', async ({ page }) => {
    await page.setViewportSize(KLEIN);
    await oeffne(page, 'getraenke');
    const vorher = await page.evaluate(() => {
      const f = document.querySelector('.gk-fest, .k-fest');
      return f ? Math.round(f.getBoundingClientRect().top) : null;
    });
    await page.evaluate(() => {
      const l = document.querySelector('.k-liste');
      if (l) l.scrollTop = l.scrollHeight;
    });
    await page.waitForTimeout(300);
    const nachher = await page.evaluate(() => {
      const f = document.querySelector('.gk-fest, .k-fest');
      return f ? Math.round(f.getBoundingClientRect().top) : null;
    });
    expect(vorher, 'Kein fester Kopfbereich im Getränke-Reiter gefunden').not.toBeNull();
    expect(nachher, 'Der Kopfbereich ist beim Scrollen mitgewandert').toBe(vorher);
  });

  test('TC-F6-02: Getränke-Zeile höchstens 72 px', async ({ page }) => {
    await page.setViewportSize(KLEIN);
    await oeffne(page, 'getraenke');
    const h = await page.evaluate(() => {
      const z = [...document.querySelectorAll('.gk-row')].filter((e) => e.getClientRects().length)[0];
      return z ? Math.round(z.getBoundingClientRect().height) : null;
    });
    expect(h, 'Keine Getränke-Zeile gefunden').not.toBeNull();
    expect(h, `Die Zeile ist ${h} px hoch — höchstens 72 sind erlaubt`).toBeLessThanOrEqual(72);
  });
});

