#!/usr/bin/env node
/*
 * T040 zur Laufzeit: Ist im umgebauten Kiosk jeder Bedienpunkt erreichbar,
 * den der gewohnte Kiosk anbietet?
 *
 * Der statische Abgleich (tools/pruef-funktionen.js) vergleicht nur das
 * Markup. Er sieht nicht, ob ein Knopf durch eine Regel verdeckt, auf null
 * geschrumpft oder ausgeblendet wurde. Deshalb werden hier beide Seiten
 * geladen, alle Reiter geoeffnet und die *sichtbaren* Bedienpunkte
 * verglichen.
 *
 * Voraussetzung: Entwicklungs-Proxy laeuft (node tools/dev-proxy.js 8787).
 *
 *   node tools/pruef-funktionen-laufend.js [--breite 1280]
 */
'use strict';

const { chromium } = require('@playwright/test');

const arg = (n, s) => {
  const i = process.argv.indexOf('--' + n);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : s;
};

const BASIS = arg('basis', 'http://localhost:8787');
const BREITE = parseInt(arg('breite', '1280'), 10);
const REITER = ['mittag', 'abhol', 'metzger', 'baecker', 'metzgerbest', 'kontakt', 'social', 'kalender'];

/* Umbenannt, nicht verloren: Der Umbau ersetzt Kopfzeile und Reiterleiste
 * (Regeln R2/R3) und beschriftet sie verständlicher. Dieselbe Funktion, ein
 * besserer Name — hier festgehalten, damit der Abgleich nicht bei jeder
 * Umbenennung Alarm schlägt und dadurch wertlos wird. */
const GLEICH = new Map([
  ['button:submit|kunden', 'button:submit|stammkunden verwalten'],
  ['a|website', 'a|zur website'],
  ['a|cms', 'a|zum cms'],
  ['button:submit|ton ist an (klick = ausschalten)', 'button:submit|ton ein oder aus'],
  ['button:submit|ton ist aus (klick = einschalten)', 'button:submit|ton ein oder aus'],
  ['button:submit|hilfe & workflows', 'button:submit|hilfe'],
]);

/* Bewusste Abweichungen — jede mit Begründung, jede vom Auftraggeber so
 * gewollt. Sie gelten nicht als fehlende Funktion. */
const BEWUSST = [
  {
    muster: /^button:submit\|(mo|di|mi|do|fr|sa|so)[#.\s]*$/,
    grund: 'Tage ohne Lieferung werden nicht mehr angeboten — sie waren nie wählbar.',
  },
  {
    muster: /^select[^|]*\|ab[#:.\s]*$/,
    grund: 'Uhrzeit steht im Katalog hinter „Bearbeiten" (T026), mit einem Tipp erreichbar.',
  },
];

/** Ist der alte Bedienpunkt im Umbau erreichbar - notfalls unter neuem Namen? */
function gedecktDurch(alt, neuMenge) {
  if (neuMenge.has(alt)) return true;
  const ersatz = GLEICH.get(alt);
  if (ersatz && neuMenge.has(ersatz)) return true;

  // Die Reiter tragen beide Namen: den ausgeschriebenen für die Vorlesehilfe
  // und den kurzen zum Lesen ("mittagstischmittag"). Der alte Text steckt
  // deshalb als Anfang im neuen.
  const teil = alt.split('|');
  if (teil.length === 2 && teil[1]) {
    for (const n of neuMenge) {
      const t2 = n.split('|');
      if (t2[0] === teil[0] && t2[1] && t2[1].startsWith(teil[1])) return true;
    }
  }
  return false;
}

/** Was ein Bedienpunkt fuer die Verkaeuferin ist: etwas Sichtbares zum Antippen. */
function einsammeln() {
  const sichtbar = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const kennung = (el) => {
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    const marke = el.getAttribute('aria-label') || el.getAttribute('title') || '';
    const art = el.tagName.toLowerCase() + (el.type ? ':' + el.type : '');
    // Zaehler wechseln staendig - mal eine Zahl, mal ein Strich, wenn nichts
    // ansteht. Sie gehoeren nicht zur Funktion und wuerden jeden Vergleich
    // zerreissen, deshalb fallen sie am Ende weg.
    const rumpf = (text || marke)
      .replace(/\d+/g, '#')
      .replace(/[#\u2013\u2014\-\s]+$/, '')
      .trim();
    return (art + '|' + rumpf).toLowerCase();
  };
  const wahl = 'button, a[href], input:not([type=hidden]), select, textarea, [onclick], [role=button]';
  const menge = new Set();
  document.querySelectorAll(wahl).forEach((el) => {
    if (!sichtbar(el)) return;
    if (el.closest('.k-umbau-hinweis')) return; // gehoert nur zur Zweitseite
    menge.add(kennung(el));
  });
  return [...menge];
}

async function seiteAbklappern(browser, seite) {
  const page = await browser.newPage({ viewport: { width: BREITE, height: 900 } });
  await page.route('**/version.json', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '{"version":"pruef"}' })
  );
  await page.goto(BASIS + '/' + seite, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);

  const proReiter = {};
  for (const r of REITER) {
    await page.evaluate((n) => window.K && window.K.switchTab && window.K.switchTab(n), r);
    await page.waitForTimeout(5000);
    proReiter[r] = await page.evaluate(einsammeln);
  }
  await page.close();
  return proReiter;
}

(async () => {
  const browser = await chromium.launch();
  console.log('Vergleiche bei ' + BREITE + ' px …\n');

  const alt = await seiteAbklappern(browser, 'kiosk.html');
  const neu = await seiteAbklappern(browser, 'kiosk-neu.html');
  await browser.close();

  let fehlendGesamt = 0;
  const bewusstGesamt = new Map();

  for (const r of REITER) {
    const a = new Set(alt[r] || []);
    const b = new Set(neu[r] || []);

    const offen = [...a].filter((x) => !gedecktDurch(x, b));
    const fehlt = [];
    for (const x of offen) {
      const regel = BEWUSST.find((e) => e.muster.test(x));
      if (regel) {
        if (!bewusstGesamt.has(regel.grund)) bewusstGesamt.set(regel.grund, 0);
        bewusstGesamt.set(regel.grund, bewusstGesamt.get(regel.grund) + 1);
      } else {
        fehlt.push(x);
      }
    }

    const zeile = `${r.padEnd(13)} gewohnt ${String(a.size).padStart(3)} · umgebaut ${String(b.size).padStart(3)}`;
    if (!fehlt.length) {
      console.log(zeile + '  vollständig');
      continue;
    }
    fehlendGesamt += fehlt.length;
    console.log(zeile + `  FEHLT: ${fehlt.length}`);
    fehlt.slice(0, 12).forEach((x) => console.log('    · ' + x));
    if (fehlt.length > 12) console.log('    … und ' + (fehlt.length - 12) + ' weitere');
  }

  if (bewusstGesamt.size) {
    console.log('\nBewusst anders (keine verlorene Funktion):');
    for (const [grund, anzahl] of bewusstGesamt) {
      console.log('  · ' + anzahl + '× ' + grund);
    }
  }

  console.log('');
  if (fehlendGesamt) {
    console.log('BEFUND: ' + fehlendGesamt + ' Bedienpunkte sind im Umbau nicht erreichbar.');
    process.exit(1);
  }
  console.log('Jeder Bedienpunkt des gewohnten Kiosks ist auch im Umbau erreichbar.');
})();
