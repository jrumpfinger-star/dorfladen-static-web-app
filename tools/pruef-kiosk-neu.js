#!/usr/bin/env node
/*
 * Prueflauf fuer den umgebauten Kiosk.
 *
 *   node tools/pruef-kiosk-neu.js [--seite kiosk-neu.html] [--breiten 360,768]
 *                                 [--reiter baecker] [--bild]
 *
 * Prueft je Reiter und je Breite mit echten Daten:
 *   - waagerechter Ueberlauf            (F2)
 *   - Antippflaechen unter 44 px        (F4)
 *   - Reiter samt Zaehlern sichtbar     (F1, F9)
 *   - abgeschnittener Text              (F2)
 *   - Fettschrift ueber 600             (F17)
 *   - abgeschnittener Text              (F18)
 *   - waagerechte Rollstreifen          (F19)
 *   - Bilder, die nichts zeigen         (F20)
 *   - Feld gross, Beschriftung winzig   (F21)
 *   - Eckmarke verdeckt ihr Bild        (F22)
 *   - ueberlappende Elemente in Zeilen  (F2)
 *   - Dialoge vollstaendig im Blickfeld (F6)
 *   - Scrolltiefe je Reiter in Bildschirmen
 *
 * Voraussetzung: Dev-Proxy laeuft.
 *   node files/dev-proxy.js 8787 static-site
 */
'use strict';

const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const arg = (n, s) => {
  const i = process.argv.indexOf('--' + n);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : s;
};
const hat = (n) => process.argv.indexOf('--' + n) > 0;

const SEITE = arg('seite', 'kiosk-neu.html');
const BASIS = arg('basis', 'http://localhost:8787');
const BILD = hat('bild');

const ALLE_BREITEN = [
  { w: 320, h: 568, name: 'Klein 320' },
  { w: 360, h: 740, name: 'Galaxy S8' },
  { w: 375, h: 667, name: 'iPhone SE' },
  { w: 390, h: 844, name: 'iPhone 14' },
  { w: 412, h: 915, name: 'Pixel 7' },
  { w: 430, h: 932, name: 'iPhone Pro Max' },
  { w: 744, h: 1133, name: 'iPad mini' },
  { w: 768, h: 1024, name: 'Galaxy Tab S2' },
  { w: 1024, h: 768, name: 'Tablet quer' },
  { w: 1280, h: 800, name: 'Desktop' },
  { w: 1920, h: 1080, name: 'Breitbild' }
];

const ALLE_REITER = ['mittag', 'abhol', 'metzger', 'baecker', 'metzgerbest', 'kontakt', 'social', 'kalender'];

const breiten = arg('breiten', '')
  ? ALLE_BREITEN.filter((b) => arg('breiten', '').split(',').includes(String(b.w)))
  : ALLE_BREITEN;
const reiter = arg('reiter', '') ? arg('reiter', '').split(',') : ALLE_REITER;

/* ── Messung im Browser ──────────────────────────────────────────────── */
function messen() {
  const MIN = 44;
  const befunde = [];
  const merke = (art, text, daten) => befunde.push(Object.assign({ art, text }, daten || {}));

  const sichtbar = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const kennung = (el) => {
    let t = el.tagName.toLowerCase();
    if (el.id) t += '#' + el.id;
    const k = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 3);
    if (k.length) t += '.' + k.join('.');
    const txt = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 32);
    if (txt) t += ' «' + txt + '»';
    return t;
  };

  // Ein Element darf ueber den Rand ragen, wenn ein Vorfahr waagerecht rollt.
  const inRoller = (el) => {
    let p = el.parentElement;
    while (p && p !== document.body) {
      const s = getComputedStyle(p);
      if ((s.overflowX === 'auto' || s.overflowX === 'scroll') && p.scrollWidth > p.clientWidth + 1) return true;
      p = p.parentElement;
    }
    return false;
  };

  /* ── F2: waagerechter Ueberlauf ── */
  const de = document.documentElement;
  if (de.scrollWidth > de.clientWidth + 1) {
    merke('ueberlauf-seite', `Seite rollt waagerecht: ${de.scrollWidth} > ${de.clientWidth}`);
  }
  const bb = de.clientWidth;
  document.querySelectorAll('.k-app *').forEach((el) => {
    if (!sichtbar(el)) return;
    if (el.closest('.k-tab-icon, .k-tab-badges')) return; // Zaehler ragen absichtlich
    if (inRoller(el)) return;
    const r = el.getBoundingClientRect();
    if (r.right > bb + 1.5 || r.left < -1.5) {
      merke('ueberlauf', kennung(el), { links: Math.round(r.left), rechts: Math.round(r.right) });
    }
  });

  /* ── F4: Antippflaechen ── */
  const wahl = 'button, a[href], input:not([type=hidden]), select, textarea, [onclick], [role=button], .k-tab, .k-filter-btn, .k-day-pill, .mb-chip, .kal-day';
  const gesehen = new Set();
  document.querySelectorAll(wahl).forEach((el) => {
    if (!sichtbar(el) || gesehen.has(el)) return;
    gesehen.add(el);
    if (el.closest('.k-umbau-hinweis')) return;
    const r = el.getBoundingClientRect();
    // Ein kleines Element ist in Ordnung, wenn ein antippbarer Vorfahr gross genug ist.
    if (r.height < MIN - 0.5 || r.width < MIN - 0.5) {
      const p = el.parentElement && el.parentElement.closest(wahl);
      if (p) {
        const pr = p.getBoundingClientRect();
        if (pr.height >= MIN - 0.5 && pr.width >= MIN - 0.5) return;
      }
      merke('zu-klein', kennung(el), { b: Math.round(r.width), h: Math.round(r.height) });
    }
  });

  /* ── F2: abgeschnittener Text ── */
  document.querySelectorAll('.k-app h1, .k-app h2, .k-app h3, .k-app h4, .k-tab-lbl, .k-oc-name, .k-filter-label, .mb-nm, .bk-art, .kk-name').forEach((el) => {
    if (!sichtbar(el)) return;
    const s = getComputedStyle(el);
    if (s.overflow === 'visible' && s.overflowY === 'visible') return;
    if (s.webkitLineClamp && s.webkitLineClamp !== 'none') return;
    if (el.scrollHeight > el.clientHeight + 1) {
      merke('text-gekappt', kennung(el), { hat: el.scrollHeight, platz: el.clientHeight });
    }
    if (el.scrollWidth > el.clientWidth + 1 && s.textOverflow === 'ellipsis') {
      merke('text-gekuerzt', kennung(el), { hat: el.scrollWidth, platz: el.clientWidth });
    }
  });

  /* ── F17: Fettschrift ueber 600 ──────────────────────────────────────
   * specs/metzger-bestellung/spec.md: Hervorhebungen laufen ueber
   * font-weight 600. bold/700 ist auf den Kioskschirmen schwer zu lesen
   * und wird im gesamten Kiosk nicht verwendet - auch nicht ueber <b>.
   */
  document.querySelectorAll('.k-app *').forEach((el) => {
    if (!sichtbar(el)) return;
    if (el.closest('.k-umbau-hinweis')) return;
    if (!(el.textContent || '').trim()) return;
    const g = parseInt(getComputedStyle(el).fontWeight, 10);
    if (g > 600) merke('zu-fett', kennung(el), { grad: g });
  });

  /* ── F2: ueberlappende Geschwister in Zeilen und Karten ──────────────
   * Nur innerhalb der Bausteine pruefen, in denen Elemente nebeneinander
   * stehen sollen - dort faellt ein Rasterfehler sofort auf.
   */
  const zeilen = '.k-order-hdr, .k-cook-card, .k-sw-bar, .k-dish-sep-row, .bk-row, .bk-stat, .bk-grp, .bk-foot, .mb-row';
  document.querySelectorAll(zeilen).forEach((c) => {
    const kinder = Array.from(c.children).filter(sichtbar);
    for (let i = 0; i < kinder.length; i++) {
      for (let j = i + 1; j < kinder.length; j++) {
        const a = kinder[i].getBoundingClientRect();
        const b2 = kinder[j].getBoundingClientRect();
        const ux = Math.min(a.right, b2.right) - Math.max(a.left, b2.left);
        const uy = Math.min(a.bottom, b2.bottom) - Math.max(a.top, b2.top);
        if (ux > 1 && uy > 1) {
          merke('ueberlappung', kennung(kinder[i]) + '  /  ' + kennung(kinder[j]),
            { b: Math.round(ux), h: Math.round(uy) });
        }
      }
    }
  });

  /* ── F18: abgeschnittener Text ───────────────────────────────────────
   * "Lieferung am M..." statt "Lieferung am Mittwoch, 10.09.2026" -
   * genau die Angabe, auf die es ankommt, fiel weg. Gemeldet wird jedes
   * Element, dessen eigener Text ueber seinen Rahmen hinauslaeuft.
   */
  document.querySelectorAll('.k-app *').forEach((el) => {
    if (!sichtbar(el)) return;
    const s = getComputedStyle(el);
    if (s.overflowX === 'auto' || s.overflowX === 'scroll') return;
    if (s.overflowY === 'auto' || s.overflowY === 'scroll') return;
    // Nur Elemente, die den Text selbst tragen - sonst meldet jeder Vorfahr mit.
    const eigen = Array.from(el.childNodes).some((k) => k.nodeType === 3 && k.nodeValue.trim());
    if (!eigen) return;
    const breit = el.scrollWidth - el.clientWidth > 1;
    const hoch = el.scrollHeight - el.clientHeight > 1;
    if (breit || hoch) {
      merke('text-abgeschnitten', kennung(el), { richtung: breit ? 'waagerecht' : 'senkrecht' });
    }
  });

  /* ── F19: waagerechte Rollstreifen ───────────────────────────────────
   * Ein Streifen, den man schieben muss, verbirgt, was es ueberhaupt gibt.
   * Filter und Werkzeugleisten muessen vollstaendig sichtbar sein.
   */
  document.querySelectorAll('.k-app .k-filter-bar, .k-app .bk-tools, .k-app .k-day-bar, .k-app .bk-days, .k-app .bk-sub, .k-app .bk-btabs, .k-app .mb-days, .k-app .mb-jump, .k-app .kal-days').forEach((el) => {
    if (!sichtbar(el)) return;
    const s = getComputedStyle(el);
    const rollt = (s.overflowX === 'auto' || s.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 2;
    if (rollt) {
      merke('rollstreifen', kennung(el), { inhalt: el.scrollWidth, platz: el.clientWidth });
    }
  });

  /* ── F20: Bilder, die nichts zeigen ──────────────────────────────────
   * Ein Bild, das nicht laedt oder auf Briefmarkengroesse gequetscht wird,
   * hilft niemandem beim Erkennen der Ware.
   */
  document.querySelectorAll('.k-app img').forEach((im) => {
    if (!sichtbar(im)) return;
    if (im.closest('.k-tab-icon, .k-umbau-hinweis')) return;
    if (im.complete && im.naturalWidth === 0) {
      merke('bild-laedt-nicht', kennung(im), { quelle: (im.currentSrc || im.getAttribute('src') || '').slice(-50) });
      return;
    }
    // Nur echte Fotos pruefen - Sinnbilder duerfen klein sein.
    const quelle = im.currentSrc || im.getAttribute('src') || '';
    if (!/bild|foto|image|thumb/i.test(quelle)) return;
    const r = im.getBoundingClientRect();
    if (im.naturalWidth >= 96 && r.width < 48) {
      merke('bild-zu-klein', kennung(im), { gezeigt: Math.round(r.width), vorhanden: im.naturalWidth });
    }
  });

  /* ── F21: Bedienfeld gross, Beschriftung winzig ──────────────────────
   * Ein 44 px hohes Feld mit 11-px-Schrift wirkt aufgeblasen und ist
   * schlechter zu lesen als ein kleineres Feld mit ordentlicher Schrift.
   */
  document.querySelectorAll('.k-app input:not([type=hidden]):not([type=checkbox]):not([type=radio]), .k-app select, .k-app textarea').forEach((f) => {
    if (!sichtbar(f)) return;
    const r = f.getBoundingClientRect();
    const gr = parseFloat(getComputedStyle(f).fontSize) || 0;
    if (r.height >= 40 && gr > 0 && gr < 13) {
      merke('feld-gross-schrift-klein', kennung(f), { hoehe: Math.round(r.height), schrift: gr });
    }
  });

  /* ── F22: Eckmarke verdeckt ihr Bild ─────────────────────────────────
   * Kleine Knoepfe auf Vorschaubildern werden von der 44-px-Regel leicht
   * so gross, dass sie das Bild zudecken, das sie nur markieren sollen.
   */
  document.querySelectorAll('.k-app img').forEach((im) => {
    if (!sichtbar(im)) return;
    const ib = im.getBoundingClientRect();
    if (ib.width < 8) return;
    const eltern = im.closest('div');
    if (!eltern) return;
    eltern.querySelectorAll('button, [role=button]').forEach((btn) => {
      if (!sichtbar(btn)) return;
      const bb2 = btn.getBoundingClientRect();
      const ux = Math.max(0, Math.min(bb2.right, ib.right) - Math.max(bb2.left, ib.left));
      const uy = Math.max(0, Math.min(bb2.bottom, ib.bottom) - Math.max(bb2.top, ib.top));
      const anteil = (ux * uy) / (ib.width * ib.height);
      if (anteil > 0.45) {
        merke('knopf-verdeckt-bild', kennung(btn), { anteil: Math.round(anteil * 100) + '%' });
      }
    });
  });

  /* ── F1/F9: Reiter und Zaehler ── */
  const tabs = Array.from(document.querySelectorAll('.k-tab')).filter((t) => t.style.display !== 'none');
  const ausserhalb = tabs.filter((t) => {
    const r = t.getBoundingClientRect();
    return r.right > bb + 1 || r.left < -1 || r.bottom > de.clientHeight + 1 || r.top < -1;
  });
  if (ausserhalb.length) merke('reiter-ausserhalb', ausserhalb.map(kennung).join(' | '));

  document.querySelectorAll('.k-tab-badge.show').forEach((b) => {
    if (!sichtbar(b)) merke('zaehler-unsichtbar', kennung(b));
  });

  return {
    befunde,
    reiterSichtbar: tabs.length,
    hoehe: document.querySelector('.k-panel.active') ? document.querySelector('.k-panel.active').scrollHeight : 0,
    platz: document.querySelector('.k-panel.active') ? document.querySelector('.k-panel.active').clientHeight : 0
  };
}

/* ── Ablauf ──────────────────────────────────────────────────────────── */
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  // Service Worker wuerde alte Fassungen ausliefern.
  await ctx.addInitScript(() => {
    // Eine leere Attrappe statt undefined – sonst scheitert register() und
    // der Skriptfehler verdeckt echte Befunde.
    Object.defineProperty(navigator, 'serviceWorker', {
      get: () => ({
        register: () => Promise.resolve({ update: () => {}, unregister: () => Promise.resolve(true) }),
        getRegistrations: () => Promise.resolve([]),
        ready: new Promise(() => {}),
        addEventListener: () => {},
        controller: null
      })
    });
  });
  const page = await ctx.newPage();

  const fehler = [];
  page.on('pageerror', (e) => fehler.push('Skriptfehler: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') fehler.push('Konsole: ' + m.text().slice(0, 160)); });

  let gesamt = 0;
  const zusammen = [];

  for (const b of breiten) {
    await page.setViewportSize({ width: b.w, height: b.h });
    await page.goto(`${BASIS}/${SEITE}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);

    // Alle Reiter fuer die Pruefung einblenden (C2/TC-F8-01).
    await page.evaluate(() => {
      document.querySelectorAll('.k-tab').forEach((t) => { t.style.display = ''; });
    });

    for (const r of reiter) {
      const da = await page.evaluate((id) => {
        // Vor jedem Reiter erneut einblenden: setTabs() laeuft beim Laden der
        // Einstellungen nach und versteckt die abgeschalteten Reiter wieder.
        document.querySelectorAll('.k-tab').forEach((t) => { t.style.display = ''; });
        const t = document.querySelector('.k-tab[data-tab="' + id + '"]');
        if (!t) return false;
        if (window.K && typeof window.K.switchTab === 'function') window.K.switchTab(id);
        else t.click();
        return true;
      }, r);
      if (!da) { zusammen.push({ breite: b.w, reiter: r, n: -1, hinweis: 'Reiter fehlt' }); continue; }

      // Auf echten Inhalt warten statt auf eine feste Zeit – die Module holen
      // ihre Daten und zeigen bis dahin „Laden…".
      try {
        await page.waitForFunction((id) => {
          const el = document.getElementById('panel-' + id);
          if (!el) return true;
          const t = (el.textContent || '').trim();
          return t.length > 40 && !/^\s*Laden…?\s*$/.test(t);
        }, r, { timeout: 12000 });
      } catch (e) {
        zusammen.push({ breite: b.w, reiter: r, n: 0, hinweis: 'Inhalt kam nicht' });
        console.log(`  ! ${b.name} (${b.w}px) · ${r}: Inhalt wurde nicht geladen`);
      }
      await page.waitForTimeout(500);

      // Auch waehrend des Wartens kann setTabs() nachgelaufen sein.
      await page.evaluate(() => {
        document.querySelectorAll('.k-tab').forEach((t) => { t.style.display = ''; });
      });

      const e = await page.evaluate(messen);
      gesamt += e.befunde.length;
      zusammen.push({ breite: b.w, name: b.name, reiter: r, n: e.befunde.length, scroll: (e.hoehe / (e.platz || 1)).toFixed(1) });

      if (e.befunde.length) {
        console.log(`\n▸ ${b.name} (${b.w}px) · ${r} — ${e.befunde.length} Befund(e)`);
        const nachArt = {};
        e.befunde.forEach((f) => { (nachArt[f.art] = nachArt[f.art] || []).push(f); });
        Object.keys(nachArt).forEach((a) => {
          console.log(`   ${a} (${nachArt[a].length}):`);
          nachArt[a].slice(0, 6).forEach((f) => {
            const z = ['b', 'h', 'links', 'rechts', 'hat', 'platz'].filter((k) => f[k] !== undefined).map((k) => `${k}=${f[k]}`).join(' ');
            console.log(`     · ${f.text}${z ? '  [' + z + ']' : ''}`);
          });
          if (nachArt[a].length > 6) console.log(`     … und ${nachArt[a].length - 6} weitere`);
        });
      }

      if (BILD) {
        const d = path.resolve(__dirname, '..', 'files', 'pruefbilder');
        fs.mkdirSync(d, { recursive: true });
        await page.screenshot({ path: path.join(d, `${b.w}-${r}.png`) });
      }
    }
  }

  console.log('\n' + '═'.repeat(72));
  const schlecht = zusammen.filter((z) => z.n > 0);
  console.log(`Geprüft: ${zusammen.length} Kombinationen aus ${breiten.length} Breiten × ${reiter.length} Reitern`);
  console.log(`Befunde gesamt: ${gesamt}${gesamt ? ` in ${schlecht.length} Kombinationen` : '  — sauber'}`);
  if (fehler.length) {
    console.log(`\nSkript-/Konsolenfehler (${fehler.length}):`);
    [...new Set(fehler)].slice(0, 12).forEach((f) => console.log('  · ' + f));
  }
  const tief = zusammen.filter((z) => parseFloat(z.scroll) > 3);
  if (tief.length) {
    console.log(`\nViel Scrollen (> 3 Bildschirme):`);
    tief.forEach((z) => console.log(`  · ${z.breite}px ${z.reiter}: ${z.scroll} Bildschirme`));
  }

  await browser.close();
  process.exit(gesamt > 0 ? 1 : 0);
})();
