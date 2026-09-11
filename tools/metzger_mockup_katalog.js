/**
 * Erzeugt die Live-Daten des Metzger-Katalogs fuer den Mockup.
 *
 * Quelle ist der Startbestand der Anwendung
 * (api/metzger-order/vorlage/katalog.json) - dieselben Artikel, Nummern,
 * Preise und Warengruppen, die der Kiosk ausliefert, solange in Dataverse
 * noch nichts Eigenes liegt.
 *
 * Ziel: mockups/metzger-katalog.js  (window.METZGER_KATALOG)
 *
 * Aufruf:  node tools/metzger_mockup_katalog.js
 */
const fs = require('fs');
const path = require('path');

const WURZEL = path.resolve(__dirname, '..');
const QUELLE = path.join(WURZEL, 'api', 'metzger-order', 'vorlage', 'katalog.json');
const ZIEL = path.join(WURZEL, 'mockups', 'metzger-katalog.js');

const roh = JSON.parse(fs.readFileSync(QUELLE, 'utf8'));
const artikel = Array.isArray(roh) ? roh : (roh.artikel || []);

// Reihenfolge wie im Kiosk: nach Nummer, Positionen ohne Nummer ans Ende.
const sortNr = (n) => {
  const s = String(n === null || n === undefined ? '' : n).trim();
  return /^\d+$/.test(s) ? [0, parseInt(s, 10)] : [1, 0];
};
artikel.sort((a, b) => {
  const [ga, na] = sortNr(a.nummer);
  const [gb, nb] = sortNr(b.nummer);
  if (ga !== gb) return ga - gb;
  if (na !== nb) return na - nb;
  return String(a.name || '').localeCompare(String(b.name || ''), 'de');
});

const gruppen = [];
artikel.forEach((a) => {
  const g = a.gruppe || '';
  if (g && gruppen.indexOf(g) < 0) gruppen.push(g);
});

const daten = {
  stand: new Date().toISOString().slice(0, 10),
  quelle: 'api/metzger-order/vorlage/katalog.json',
  gruppen,
  artikel,
};

const kopf = '// Erzeugt von tools/metzger_mockup_katalog.js - nicht von Hand aendern.\n'
  + '// Live-Daten aus ' + daten.quelle + '\n';

fs.writeFileSync(ZIEL, kopf + 'window.METZGER_KATALOG = '
  + JSON.stringify(daten, null, 1) + ';\n', 'utf8');

const ueblich = artikel.filter((a) => a.aktiv !== false).length;
console.log(`${artikel.length} Artikel (${ueblich} ueblich), ${gruppen.length} Warengruppen`);
console.log('-> ' + path.relative(WURZEL, ZIEL));
