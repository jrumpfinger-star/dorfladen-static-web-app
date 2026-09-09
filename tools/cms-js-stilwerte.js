#!/usr/bin/env node
/*
 * Zieht die Inline-Gestaltung in static-site/cms.js auf das Designschema.
 *
 * Spec: specs/cms-redesign/spec.md, F4.
 *
 * Warum ein zweites Werkzeug? `build-cms-neu.js` formt das MARKUP um. Ein
 * Teil der Oberflaeche entsteht aber erst zur Laufzeit: cms.js baut Dialoge
 * und Listen als Zeichenketten zusammen und schreibt sie ins Dokument. Diese
 * 580 style-Attribute erreicht die Umformung nicht - die Dialoge trugen
 * deshalb weiter die alten Farben, waehrend der Rest schon im neuen Bild
 * stand.
 *
 * Anders als beim Markup gibt es hier keine erzeugte Datei: cms.js ist und
 * bleibt handgepflegt. Das Werkzeug aendert die Datei deshalb **an Ort und
 * Stelle** und berichtet, was es getan hat. Ein zweiter Lauf aendert nichts
 * mehr (`var(--…)` enthaelt keinen Farbwert).
 *
 * Sicherheitsnetz - angefasst wird nur, was zweifelsfrei ein Stilwert ist:
 *   - nur Zeichenfolgen der Form  style="…"
 *   - nur, wenn der Inhalt KEINE Zeichenkettenverkettung enthaelt
 *     (kein ' + ` ${ und kein Zeilenumbruch) - sonst koennte der Ausdruck
 *     ueber das Ende der Zeichenkette hinausgreifen und Code zerschneiden
 *   - nur Farbwerte, die in tools/cms-stilwerte.json stehen
 *   - Zustandstragende Eigenschaften bleiben unberuehrt
 *
 * Aufruf:
 *   node tools/cms-js-stilwerte.js            (schreibt)
 *   node tools/cms-js-stilwerte.js --probe    (nur berichten)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const wurzel = path.resolve(__dirname, '..');
const datei = path.join(wurzel, 'static-site', 'cms.js');
const tabelle = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'cms-stilwerte.json'), 'utf8'));

const nurProbe = process.argv.includes('--probe');

const ZUSTAND = new Set(tabelle.zustand);
const FARBEIGEN = new Set(tabelle.farbEigenschaften);

/** Enthaelt der Attributwert eine Verkettung? Dann Finger weg. */
function verdaechtig(wert) {
  return /['`+\n\r]|\$\{/.test(wert);
}

function werteUm(stil, zaehler) {
  return stil.split(';').map(function (d) {
    const i = d.indexOf(':');
    if (i < 0) return d;
    const eigen = d.slice(0, i).trim().toLowerCase();
    if (eigen.startsWith('--') || ZUSTAND.has(eigen)) return d;

    let wert = d.slice(i + 1);
    if (FARBEIGEN.has(eigen)) {
      wert = wert.replace(/#[0-9a-fA-F]{3,8}/g, function (h) {
        const ziel = tabelle.farben[h.toLowerCase()];
        if (!ziel) { zaehler.offen.set(h.toLowerCase(), (zaehler.offen.get(h.toLowerCase()) || 0) + 1); return h; }
        zaehler.farben++;
        return ziel;
      });
    }
    const masse = tabelle.masse[eigen];
    if (masse) {
      const schluessel = wert.trim().replace(/\s+/g, ' ');
      if (masse[schluessel]) { zaehler.masse++; wert = wert.replace(schluessel, masse[schluessel]); }
    }
    return d.slice(0, i + 1) + wert;
  }).join(';');
}

function main() {
  if (!fs.existsSync(datei)) {
    console.error('Datei fehlt: ' + datei);
    process.exit(2);
  }
  const vorher = fs.readFileSync(datei, 'utf8');
  const zaehler = { farben: 0, masse: 0, uebersprungen: 0, offen: new Map() };

  const nachher = vorher.replace(/style="([^"\n]*)"/g, function (ganz, stil) {
    if (verdaechtig(stil)) { zaehler.uebersprungen++; return ganz; }
    const neu = werteUm(stil, zaehler);
    return neu === stil ? ganz : 'style="' + neu + '"';
  });

  console.log('Inline-Gestaltung in cms.js auf das Schema ziehen');
  console.log('────────────────────────────────────────────────────────────────────────');
  console.log('  Farbwerte umgestellt:      ' + zaehler.farben);
  console.log('  Maße umgestellt:           ' + zaehler.masse);
  console.log('  übersprungen (Verkettung): ' + zaehler.uebersprungen);
  console.log('  nicht zugeordnet:          '
    + Array.from(zaehler.offen.values()).reduce(function (a, b) { return a + b; }, 0)
    + ' (' + zaehler.offen.size + ' verschiedene)');

  if (zaehler.offen.size) {
    const s = Array.from(zaehler.offen.entries()).sort(function (a, b) { return b[1] - a[1]; });
    console.log('  die häufigsten: '
      + s.slice(0, 8).map(function (e) { return e[0] + '×' + e[1]; }).join(', '));
  }

  if (nurProbe) {
    console.log('');
    console.log('  Probelauf – nichts geschrieben.');
    return;
  }
  if (nachher === vorher) {
    console.log('');
    console.log('  Nichts zu tun – die Datei steht bereits auf dem Schema.');
    return;
  }
  fs.writeFileSync(datei, nachher, 'utf8');
  console.log('');
  console.log('geschrieben: ' + path.relative(wurzel, datei)
    + '  (' + vorher.length + ' → ' + nachher.length + ' Zeichen)');
}

main();
