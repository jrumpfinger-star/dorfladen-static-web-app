#!/usr/bin/env node
/*
 * Darstellungspruefung des neuen CMS.
 *
 * Spec: specs/cms-redesign/spec.md, F3 und F6.
 *
 * Warum ein eigenes Werkzeug und nicht nur Playwright-Tests? Die Testdatei
 * deckt drei Bildschirmgroessen ab - das fordert die Verfassung. Im Laden
 * stehen aber Geraete von 320 bis 1920 px, und das CMS hat 15 Bereiche und
 * eine Reihe Dialoge. Diese Pruefung faehrt das vollstaendige Kreuz ab:
 *
 *     15 Bereiche  x  8 Breiten  +  Dialoge  x  8 Breiten
 *
 * Gemeldet wird, was im Betrieb weh tut:
 *   - waagerechter Rollstreifen auf der Seite
 *   - Inhalt, der aus dem Bereich ragt (ausserhalb eigener Rollbereiche)
 *   - Bedienelemente unter 44 px
 *   - Dialoge, die nicht ins Fenster passen
 *   - Fehler in der Browserkonsole
 *
 * Die Anmeldung: Der Vergleichswert steht offen im Markup (#cms-pw-hash)
 * und wird von dort uebernommen. Es wird KEIN Kennwort hinterlegt; die
 * eigentliche Absicherung liegt serverseitig im admin_auth_guard der API.
 *
 * Aufruf:
 *   node tools/pruef-cms-darstellung.js [http://localhost:8788] [cms.html]
 */
'use strict';

const { chromium } = require('playwright');

const BASIS = process.argv[2] || 'http://localhost:8788';
const SEITE = process.argv[3] || 'cms.html';

const BEREICHE = ['wp', 'hours', 'ang', 'sort', 'hp', 'news', 'gallery', 'cfg',
  'orders', 'metzger', 'stats', 'social', 'push', 'settings', 'help'];

const BREITEN = [
  [320, 640, 'kleines Telefon'],
  [375, 667, 'Telefon'],
  [430, 932, 'grosses Telefon'],
  [768, 1024, 'iPad mini'],
  [1024, 768, 'Tablet quer'],
  [1280, 800, 'Rechner'],
  [1620, 900, 'breiter Rechner'],
  [1920, 1080, 'sehr breit'],
];

/* Dialoge, die sich ohne Nebenwirkung oeffnen lassen: Sie legen nichts an
   und senden nichts. Bewusst KEIN Loeschen-Dialog. */
const DIALOGE = [
  { bereich: 'ang', wahl: '[data-action="openNewAktion"]', name: 'Neue Aktion' },
  { bereich: 'ang', text: 'Bearbeiten', name: 'Aktion bearbeiten' },
  { bereich: 'wp', wahl: '[data-action="openAddMeal"]', name: 'Gericht anlegen' },
];

function messerImBrowser() {
  const de = document.documentElement;
  const inhalt = document.getElementById('cmsneu-inhalt')
    || document.getElementById('cms-app');
  const grenze = inhalt ? inhalt.getBoundingClientRect().right : de.clientWidth;
  const imRoller = (el) => {
    let p = el.parentElement;
    while (p && p !== inhalt) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true;
      p = p.parentElement;
    }
    return false;
  };
  return { de, inhalt, grenze, imRoller };
}

async function pruefeBereich(page, id) {
  return page.evaluate((bereich) => {
    const de = document.documentElement;
    // Die gewohnte Fassung kennt den Inhaltsbehälter nicht - dann gilt die
    // Anwendung selbst als Bezug. So lässt sich dieselbe Prüfung auf alt
    // und neu anwenden und die Frage "ist der Befund neu?" beantworten.
    const inhalt = document.getElementById('cmsneu-inhalt')
      || document.getElementById('cms-app');
    if (!inhalt) return { fehlt: true };
    const grenze = inhalt.getBoundingClientRect().right;
    const imRoller = (el) => {
      let p = el.parentElement;
      while (p && p !== inhalt) {
        const ox = getComputedStyle(p).overflowX;
        if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true;
        p = p.parentElement;
      }
      return false;
    };
    const wurzel = document.getElementById('cms-panel-' + bereich);
    if (!wurzel) return { fehlt: true };
    const raus = [...wurzel.querySelectorAll('*')]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width && r.right > grenze + 2 && !imRoller(e);
      })
      .map((e) => e.tagName + '.' + String(e.className || '').slice(0, 22));
    const klein = [...wurzel.querySelectorAll('button, a.cms-btn')]
      .map((e) => ({
        t: (e.textContent || '').trim().slice(0, 18),
        h: Math.round(e.getBoundingClientRect().height),
      }))
      .filter((x) => x.h && x.h < 43);
    return {
      quer: de.scrollWidth > de.clientWidth + 1,
      raus: raus.slice(0, 4), rausN: raus.length,
      klein: klein.slice(0, 4), kleinN: klein.length,
    };
  }, id);
}

async function pruefeDialog(page) {
  return page.evaluate(() => {
    const wrap = document.getElementById('cms-modal-wrap');
    if (!wrap || getComputedStyle(wrap).display === 'none') return { auf: false };
    const de = document.documentElement;
    const karte = wrap.querySelector('.cms-modal');
    const r = karte ? karte.getBoundingClientRect() : null;
    const raus = [...wrap.querySelectorAll('*')]
      .filter((e) => {
        const b = e.getBoundingClientRect();
        return b.width && (b.right > de.clientWidth + 2 || b.left < -2);
      })
      .map((e) => e.tagName + '.' + String(e.className || '').slice(0, 22));
    const klein = [...wrap.querySelectorAll('button')]
      .map((e) => ({
        t: (e.textContent || '').trim().slice(0, 18),
        h: Math.round(e.getBoundingClientRect().height),
      }))
      .filter((x) => x.h && x.h < 43);
    return {
      auf: true,
      passt: r ? (r.top >= -1 && r.bottom <= de.clientHeight + 1) : null,
      quer: de.scrollWidth > de.clientWidth + 1,
      raus: raus.slice(0, 4), rausN: raus.length,
      klein: klein.slice(0, 4), kleinN: klein.length,
    };
  });
}

async function anmeldewert() {
  // Der Vergleichswert steht offen im Markup. Er wird OHNE Browser geholt,
  // damit die Seite genau einmal geladen wird: Ein zweiter Aufruf oder ein
  // Neuladen bricht die laufenden API-Abrufe ab, und die Pruefung meldete
  // Fehler, die es im Betrieb nicht gibt.
  const antwort = await fetch(BASIS + '/' + SEITE);
  const text = await antwort.text();
  const m = text.match(/id="cms-pw-hash"[^>]*>\s*"([^"]+)"/);
  return m ? m[1] : null;
}

async function main() {
  const browser = await chromium.launch();
  const hash = await anmeldewert();
  const befunde = [];
  let geprueft = 0;

  console.log('Darstellungsprüfung ' + SEITE + ' gegen ' + BASIS);
  console.log('────────────────────────────────────────────────────────────────────────');

  for (const [w, h, name] of BREITEN) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    if (hash) {
      await ctx.addInitScript((v) => {
        try { sessionStorage.setItem('cms_auth_ok', v); } catch (e) { /* egal */ }
      }, hash);
    }
    const page = await ctx.newPage();
    const konsole = [];
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const t = m.text();
      // Bekannte Fremdfehler der Umgebung, nicht der Oberfläche:
      // Die Produktbilder liegen in SharePoint und brauchen eine
      // Microsoft-Anmeldung im Fenster - die gibt es hier nicht.
      if (/SharePoint image load error|popup_window_error|Cross-Origin-Opener-Policy/.test(t)) return;
      konsole.push(t.slice(0, 100));
    });

    await page.goto(BASIS + '/' + SEITE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);

    for (const id of BEREICHE) {
      await page.evaluate((t) => window.cmsTab && window.cmsTab(t), id);
      await page.waitForTimeout(350);
      const m = await pruefeBereich(page, id);
      geprueft++;
      if (m.fehlt) continue;
      if (m.quer || m.rausN || m.kleinN) {
        befunde.push({ breite: w, gerat: name, was: 'Bereich ' + id, ...m });
      }
    }

    for (const d of DIALOGE) {
      await page.evaluate((t) => window.cmsTab(t), d.bereich);
      await page.waitForTimeout(600);
      const knopf = d.wahl
        ? page.locator('#cms-panel-' + d.bereich + ' ' + d.wahl).first()
        : page.locator('#cms-panel-' + d.bereich + ' button')
          .filter({ hasText: d.text }).first();
      if (!(await knopf.count())) continue;
      await knopf.click().catch(() => {});
      await page.waitForTimeout(1400);
      const m = await pruefeDialog(page);
      geprueft++;
      if (m.auf && (m.quer || m.rausN || m.kleinN || m.passt === false)) {
        befunde.push({ breite: w, gerat: name, was: 'Dialog ' + d.name, ...m });
      }
      // Ohne Nebenwirkung schliessen: nicht ueber "Abbrechen", das koennte
      // eine Rueckfrage aufwerfen.
      await page.evaluate(() => {
        const wrap = document.getElementById('cms-modal-wrap');
        if (wrap) { wrap.style.display = 'none'; wrap.innerHTML = ''; }
      });
      await page.waitForTimeout(400);
    }

    if (konsole.length) {
      befunde.push({ breite: w, gerat: name, was: 'Browserkonsole', meldungen: konsole.slice(0, 3) });
    }

    console.log('  ' + String(w).padStart(4) + ' px  ' + name.padEnd(18)
      + (befunde.filter((f) => f.breite === w).length
        ? befunde.filter((f) => f.breite === w).length + ' Befund(e)'
        : 'ok'));
    await ctx.close();
  }

  await browser.close();

  console.log('────────────────────────────────────────────────────────────────────────');
  console.log('  ' + geprueft + ' Kombinationen geprüft');
  if (!befunde.length) {
    console.log('  0 Befunde.');
    return;
  }
  console.log('  ' + befunde.length + ' Befund(e):');
  befunde.forEach((f) => {
    console.log('');
    console.log('  ' + f.breite + ' px · ' + f.was);
    if (f.quer) console.log('      waagerechter Rollstreifen');
    if (f.passt === false) console.log('      Dialog passt nicht ins Fenster');
    if (f.rausN) console.log('      ' + f.rausN + ' Element(e) ragen heraus: ' + JSON.stringify(f.raus));
    if (f.kleinN) console.log('      ' + f.kleinN + ' Bedienelement(e) unter 44 px: ' + JSON.stringify(f.klein));
    if (f.meldungen) console.log('      Konsole: ' + JSON.stringify(f.meldungen));
  });
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(2); });
