#!/usr/bin/env node
/*
 * Prueft den umgebauten Mittagstisch auf der Zweitseite kiosk-neu.html.
 *
 * Geprueft wird bei allen neun Zielbreiten:
 *   1. Ueberlappende Elemente
 *   2. Fettschrift ueber 600  (specs/metzger-bestellung/spec.md, F17)
 *   3. Antippflaechen unter 44 px
 *   4. Waagerechter Ueberlauf
 *   5. Abgeschnittener Text
 *   6. Wie viele Bestellungen ohne Scrollen sichtbar sind
 *
 * Voraussetzung: Testserver auf 8787 (dev-proxy.js mit static-site).
 *
 * Aufruf:  node tools/pruef-kiosk-mittag.js
 */
'use strict';

const { chromium } = require('playwright');

const BASIS = process.env.KIOSK_BASIS || 'http://localhost:8787';
const BREITEN = [
  { w: 320, h: 568, name: 'iPhone SE' },
  { w: 360, h: 740, name: 'Galaxy S8' },
  { w: 390, h: 844, name: 'iPhone 15' },
  { w: 430, h: 932, name: 'iPhone 15 Pro Max' },
  { w: 744, h: 1133, name: 'iPad mini' },
  { w: 768, h: 1024, name: 'Galaxy Tab S2' },
  { w: 1024, h: 768, name: 'Tablet quer' },
  { w: 1280, h: 800, name: 'Desktop' },
  { w: 1920, h: 1080, name: 'Desktop breit' }
];

const messen = () => {
  const panel = document.getElementById('panel-mittag');
  if (!panel) return { fehler: 'panel-mittag fehlt' };

  const sichtbar = e => e.offsetParent !== null && e.getBoundingClientRect().width > 0;
  const befund = { ueberlappung: [], fett: [], klein: [], ueberlauf: [], abgeschnitten: [] };

  // 1. Ueberlappungen zwischen Geschwistern in den Zeilen-Bausteinen
  panel.querySelectorAll('.k-order-hdr, .k-cook-card, .k-sw-bar, .k-dish-sep-row').forEach(c => {
    const kinder = [...c.querySelectorAll(':scope > *, :scope > .k-oc-r2 > *')].filter(sichtbar);
    for (let i = 0; i < kinder.length; i++) {
      for (let j = i + 1; j < kinder.length; j++) {
        const a = kinder[i].getBoundingClientRect(), b = kinder[j].getBoundingClientRect();
        const ux = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const uy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ux > 1 && uy > 1) {
          befund.ueberlappung.push(
            (kinder[i].className || kinder[i].tagName) + ' / ' +
            (kinder[j].className || kinder[j].tagName) + ' um ' + Math.round(ux) + 'x' + Math.round(uy) + 'px');
        }
      }
    }
  });

  // 2. Fettschrift ueber 600 - die Verfassung erlaubt hoechstens halbfett
  panel.querySelectorAll('*').forEach(e => {
    if (!sichtbar(e)) return;
    if (!(e.textContent || '').trim()) return;
    const w = parseInt(getComputedStyle(e).fontWeight, 10);
    if (w > 600) befund.fett.push((e.className || e.tagName) + ' = ' + w);
  });

  // 3. Antippflaechen unter 44 px
  panel.querySelectorAll('button, a, input, [onclick], label').forEach(e => {
    if (!sichtbar(e)) return;
    const r = e.getBoundingClientRect();
    if (r.height < 44 - 0.5 || r.width < 44 - 0.5) {
      // Zeilen und Baender sind selbst gross genug; nur echte Ziele zaehlen.
      if (e.closest('.k-order-hdr') && !e.closest('.k-oc-actions')) return;
      befund.klein.push((e.className || e.tagName) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
  });

  // 4. Waagerechter Ueberlauf ueber den Panelrand hinaus
  const pr = panel.getBoundingClientRect();
  panel.querySelectorAll('.k-order, .k-cook, .k-sw-bar, .k-dish-group').forEach(e => {
    const r = e.getBoundingClientRect();
    if (r.right > pr.right + 1) befund.ueberlauf.push((e.className || e.tagName) + ' um ' + Math.round(r.right - pr.right) + 'px');
  });

  // 5. Abgeschnittener Text (ohne die bewusst gekuerzten Stellen)
  panel.querySelectorAll('*').forEach(e => {
    if (e.children.length || !sichtbar(e)) return;
    const st = getComputedStyle(e);
    if (st.textOverflow === 'ellipsis' || st.webkitLineClamp !== 'none') return;
    if (e.scrollWidth - e.clientWidth > 2 && e.clientWidth > 0) {
      befund.abgeschnitten.push((e.className || e.tagName) + ': "' + (e.textContent || '').trim().slice(0, 24) + '"');
    }
  });

  // 6. Bestellungen ohne Scrollen
  const vh = window.innerHeight;
  let ohneScrollen = 0;
  panel.querySelectorAll('.k-order').forEach(e => {
    const r = e.getBoundingClientRect();
    if (r.top >= 0 && r.bottom <= vh) ohneScrollen++;
  });

  const hoehe = id => { const e = document.getElementById(id); return e ? Math.round(e.getBoundingClientRect().height) : 0; };

  return {
    karten: panel.querySelectorAll('.k-order').length,
    ohneScrollen,
    kochbedarf: hoehe('mittag-cook'),
    sonder: hoehe('mittag-sonder'),
    ...befund
  };
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Der Kiosk laedt version.json und startet bei Aenderung neu - das wuerde
  // die Messung mitten im Lauf abbrechen.
  await page.route('**/version.json*', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"version":"pruef"}' }));

  console.log('Pruefe ' + BASIS + '/kiosk-neu.html\n' + '-'.repeat(74));
  await page.goto(BASIS + '/kiosk-neu.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  await page.evaluate(() => { if (window.K && window.K.switchTab) window.K.switchTab('mittag'); });
  await page.waitForTimeout(6000);

  let gesamtBefunde = 0;
  for (const b of BREITEN) {
    await page.setViewportSize({ width: b.w, height: b.h });
    await page.waitForTimeout(900);
    const r = await page.evaluate(messen);
    if (r.fehler) { console.log(`${String(b.w).padStart(4)} px  FEHLER  ${r.fehler}`); continue; }

    const n = r.ueberlappung.length + r.fett.length + r.klein.length + r.ueberlauf.length + r.abgeschnitten.length;
    gesamtBefunde += n;
    const marke = n === 0 ? 'ok    ' : 'BEFUND';
    console.log(`${String(b.w).padStart(4)} px  ${marke}  ${b.name.padEnd(18)} ` +
      `${r.ohneScrollen}/${r.karten} ohne Scrollen · Kochbedarf ${r.kochbedarf}px · Sonderw. ${r.sonder}px`);
    const zeig = (titel, liste) => {
      if (!liste.length) return;
      const einmalig = [...new Set(liste)];
      console.log(`           ${titel}: ${einmalig.length}`);
      einmalig.slice(0, 4).forEach(x => console.log(`             - ${x}`));
    };
    zeig('Ueberlappung', r.ueberlappung);
    zeig('zu fett (>600)', r.fett);
    zeig('Antippflaeche < 44px', r.klein);
    zeig('ragt heraus', r.ueberlauf);
    zeig('abgeschnitten', r.abgeschnitten);
  }

  console.log('-'.repeat(74));
  console.log(gesamtBefunde === 0 ? 'ERGEBNIS: BESTANDEN - keine Befunde' : `ERGEBNIS: ${gesamtBefunde} Befunde`);
  await browser.close();
  process.exit(gesamtBefunde === 0 ? 0 : 1);
})().catch(e => { console.error('Abbruch:', e.message); process.exit(2); });
