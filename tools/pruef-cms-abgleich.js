#!/usr/bin/env node
/*
 * Funktionsabgleich CMS: alt gegen neu.
 *
 * Spec: specs/cms-redesign/spec.md, F2.
 *
 * Das CMS haengt mit rund 915 Zugriffen an seinem Markup: Kennungen,
 * onclick-Aufrufe, data-action-Paare, Formularfelder. Beim Umbau darf davon
 * nichts verlorengehen - und "nichts verloren" darf keine Behauptung sein,
 * sondern muss nachgewiesen werden.
 *
 * Dieses Werkzeug liest beide Seiten und meldet jede Fehlstelle. Neues darf
 * hinzukommen; Fehlendes ist ein Fehler und setzt den Rueckgabewert auf 1.
 *
 * Aufruf:
 *   node tools/pruef-cms-abgleich.js
 *   node tools/pruef-cms-abgleich.js <alt.html> <neu.html>
 */
'use strict';

const fs = require('fs');
const path = require('path');

const wurzel = path.resolve(__dirname, '..');
const altPfad = process.argv[2] || path.join(wurzel, 'static-site', 'cms-klassisch.html');
const neuPfad = process.argv[3] || path.join(wurzel, 'static-site', 'cms.html');
const skriptPfad = path.join(wurzel, 'static-site', 'cms.js');

function lies(p) {
  if (!fs.existsSync(p)) {
    console.error('Datei fehlt: ' + p);
    process.exit(2);
  }
  return fs.readFileSync(p, 'utf8');
}

/* ── Merkmale einer Seite einsammeln ─────────────────────────────────── */

function alleTreffer(text, muster, gruppe) {
  const out = [];
  let m;
  const re = new RegExp(muster.source, muster.flags.indexOf('g') < 0 ? muster.flags + 'g' : muster.flags);
  while ((m = re.exec(text)) !== null) out.push(m[gruppe === undefined ? 1 : gruppe]);
  return out;
}

/** Ein Element als Zeichenkette in seine Attribute zerlegen. */
function attribute(tag) {
  const out = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(tag)) !== null) out[m[1].toLowerCase()] = m[2];
  return out;
}

function merkmale(text) {
  const ids = alleTreffer(text, /\sid="([^"]+)"/);
  const onclicks = alleTreffer(text, /\sonclick="([^"]*)"/)
    .map(function (s) { return s.replace(/\s+/g, ' ').trim(); });
  const onchange = alleTreffer(text, /\son(change|input|submit|keydown|keyup|blur|focus)="([^"]*)"/, 2)
    .map(function (s) { return s.replace(/\s+/g, ' ').trim(); });

  // data-action mit zugehoeriger data-id: das ist das Bedienpaar, ueber das
  // die zentrale Delegation den Handler findet.
  const aktionen = [];
  const felder = [];
  const klassen = new Set();
  const reTag = /<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g;
  let m;
  while ((m = reTag.exec(text)) !== null) {
    const name = m[1].toLowerCase();
    const a = attribute(m[2]);
    if (a['data-action']) {
      aktionen.push(a['data-action'] + (a['data-id'] ? '#' + a['data-id'] : ''));
    }
    if (a['class']) a['class'].split(/\s+/).forEach(function (k) { if (k) klassen.add(k); });
    if (name === 'input' || name === 'select' || name === 'textarea') {
      felder.push([name, a['type'] || '', a['id'] || '', a['name'] || ''].join('|'));
    }
  }

  return {
    ids: ids,
    onclicks: onclicks,
    handler: onchange,
    aktionen: aktionen,
    felder: felder,
    klassen: Array.from(klassen),
  };
}

/** Kennungen und Klassen, die cms.js zur Laufzeit sucht. */
function gesuchtVomSkript(js) {
  const ids = alleTreffer(js, /getElementById\(\s*'([^']+)'\s*\)/)
    .concat(alleTreffer(js, /getElementById\(\s*"([^"]+)"\s*\)/));
  const wahl = alleTreffer(js, /querySelector(?:All)?\(\s*'([^']+)'\s*\)/)
    .concat(alleTreffer(js, /querySelector(?:All)?\(\s*"([^"]+)"\s*\)/));
  return { ids: Array.from(new Set(ids)), wahl: Array.from(new Set(wahl)) };
}

/* ── Vergleich ───────────────────────────────────────────────────────── */

/** Was in `alt` steht, muss in `neu` stehen - mit gleicher Anzahl. */
function fehlt(alt, neu) {
  const zaehle = function (liste) {
    const m = new Map();
    liste.forEach(function (x) { m.set(x, (m.get(x) || 0) + 1); });
    return m;
  };
  const a = zaehle(alt), n = zaehle(neu);
  const out = [];
  a.forEach(function (anzahl, wert) {
    const da = n.get(wert) || 0;
    if (da < anzahl) out.push({ wert: wert, alt: anzahl, neu: da });
  });
  return out;
}

function berichte(titel, liste, grenze) {
  const max = grenze || 12;
  if (!liste.length) {
    console.log('  ok      ' + titel + ' – vollständig');
    return 0;
  }
  console.log('  FEHLT   ' + titel + ' – ' + liste.length + ' Fehlstelle(n):');
  liste.slice(0, max).forEach(function (f) {
    console.log('            ' + JSON.stringify(f.wert).slice(0, 110)
      + '   (alt ' + f.alt + ', neu ' + f.neu + ')');
  });
  if (liste.length > max) console.log('            … und ' + (liste.length - max) + ' weitere');
  return liste.length;
}

function main() {
  const alt = merkmale(lies(altPfad));
  const neu = merkmale(lies(neuPfad));
  const js = fs.existsSync(skriptPfad) ? gesuchtVomSkript(lies(skriptPfad)) : { ids: [], wahl: [] };

  console.log('Funktionsabgleich CMS');
  console.log('────────────────────────────────────────────────────────────────────────');
  console.log('  alt: ' + path.relative(wurzel, altPfad));
  console.log('  neu: ' + path.relative(wurzel, neuPfad));
  console.log('');

  let fehler = 0;
  fehler += berichte('DOM-Kennungen (' + alt.ids.length + ')', fehlt(alt.ids, neu.ids));
  fehler += berichte('onclick-Aufrufe (' + alt.onclicks.length + ')', fehlt(alt.onclicks, neu.onclicks));
  fehler += berichte('weitere Ereignisse (' + alt.handler.length + ')', fehlt(alt.handler, neu.handler));
  fehler += berichte('data-action (' + alt.aktionen.length + ')', fehlt(alt.aktionen, neu.aktionen));
  fehler += berichte('Formularfelder (' + alt.felder.length + ')', fehlt(alt.felder, neu.felder));
  fehler += berichte('Klassennamen (' + alt.klassen.length + ')', fehlt(alt.klassen, neu.klassen));

  // Was das Skript sucht, muss die neue Seite bieten - unabhaengig davon, ob
  // die alte es hatte. Nur Kennungen, die in der ALTEN Seite stehen, koennen
  // hier fehlschlagen; alles andere erzeugt cms.js selbst zur Laufzeit.
  const skriptIds = js.ids.filter(function (id) { return alt.ids.indexOf(id) >= 0; });
  fehler += berichte('vom Skript gesuchte Kennungen (' + skriptIds.length + ')',
    fehlt(skriptIds, neu.ids));

  // Klassen- und Kennungswahlen aus querySelector, die auf die Seite zielen.
  const gesuchteKlassen = [];
  js.wahl.forEach(function (w) {
    const treffer = w.match(/\.([a-zA-Z][-\w]*)/g);
    if (treffer) treffer.forEach(function (k) {
      const name = k.slice(1);
      if (alt.klassen.indexOf(name) >= 0) gesuchteKlassen.push(name);
    });
  });
  fehler += berichte('vom Skript gesuchte Klassen (' + new Set(gesuchteKlassen).size + ')',
    fehlt(Array.from(new Set(gesuchteKlassen)), neu.klassen));

  console.log('');
  console.log('────────────────────────────────────────────────────────────────────────');
  if (fehler) {
    console.log('  ' + fehler + ' Fehlstelle(n) – der Umbau ist NICHT abnahmefähig.');
    process.exit(1);
  }
  console.log('  0 Fehlstellen – jede Bedienmöglichkeit der alten Seite ist vorhanden.');
  console.log('  (neu zusätzlich: ' + (neu.ids.length - alt.ids.length) + ' Kennungen, '
    + (neu.klassen.length - alt.klassen.length) + ' Klassennamen)');
}

main();
