/*
 * T040: Funktionsverzeichnis abgleichen.
 *
 * Vergleicht, welche Bedienpunkte in der Quelle stehen und welche in der
 * erzeugten Seite. Keiner darf fehlen - sonst waere eine Funktion beim
 * Umbau verlorengegangen.
 *
 *   node tools/pruef-funktionen.js [quelle] [ziel]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const wurzel = path.resolve(__dirname, '..');
const quelle = process.argv[2] || path.join(wurzel, 'static-site', 'kiosk.html');
const ziel = process.argv[3] || path.join(wurzel, 'static-site', 'kiosk-neu.html');

function sammle(datei) {
  const t = fs.readFileSync(datei, 'utf8');
  const treffer = { aufrufe: new Set(), kennungen: new Set(), skripte: new Set() };

  // Bedienpunkte: onclick="…", onchange="…" usw.
  const ereignis = /\son(click|change|input|submit|paste|dblclick)\s*=\s*"([^"]+)"/g;
  let m;
  while ((m = ereignis.exec(t))) treffer.aufrufe.add(m[2].trim());

  // Kennungen, ueber die die Module ihre Bereiche finden
  const id = /\sid\s*=\s*"([^"]+)"/g;
  while ((m = id.exec(t))) treffer.kennungen.add(m[1].trim());

  // Eingebundene Fachmodule
  const skript = /<script[^>]*\ssrc\s*=\s*"([^"]+)"/g;
  while ((m = skript.exec(t))) treffer.skripte.add(m[1].trim());

  return treffer;
}

const a = sammle(quelle);
const b = sammle(ziel);

function fehlend(mengeA, mengeB) {
  return [...mengeA].filter((x) => !mengeB.has(x));
}

const berichte = [
  ['Bedienpunkte', fehlend(a.aufrufe, b.aufrufe)],
  ['Kennungen', fehlend(a.kennungen, b.kennungen)],
  ['Fachmodule', fehlend(a.skripte, b.skripte)],
];

console.log('Quelle: ' + path.basename(quelle));
console.log('Ziel:   ' + path.basename(ziel));
console.log('');
console.log(
  `Bedienpunkte ${a.aufrufe.size} → ${b.aufrufe.size} · ` +
  `Kennungen ${a.kennungen.size} → ${b.kennungen.size} · ` +
  `Fachmodule ${a.skripte.size} → ${b.skripte.size}`
);

let fehler = 0;
for (const [name, liste] of berichte) {
  if (!liste.length) continue;
  fehler += liste.length;
  console.log('\nFehlt im Ziel — ' + name + ' (' + liste.length + '):');
  liste.slice(0, 40).forEach((x) => console.log('  · ' + x.slice(0, 110)));
  if (liste.length > 40) console.log('  … und ' + (liste.length - 40) + ' weitere');
}

console.log('');
if (fehler) {
  console.log('BEFUND: ' + fehler + ' Eintraege fehlen.');
  process.exit(1);
}
console.log('Keine Funktion fehlt.');
