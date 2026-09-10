// Baut aus den Live-Antworten der Baecker-API die Datenbasis fuer den Mockup.
// Aufruf: node tools/baecker_mockup_daten.js <uebersicht.json> <tag.json> <artikel.json>
const fs = require('fs');
const path = require('path');

const [uebersichtPfad, tagPfad, artikelPfad] = process.argv.slice(2);
const lies = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));

const uebersicht = lies(uebersichtPfad);
const tag = lies(tagPfad).bestellung;
const artikel = lies(artikelPfad);

const tage = uebersicht.tage.map((t) => ({
  datum: t.datum,
  wochentag: t.wochentag,
  bestelltag: !!t.bestelltag,
  bestellbar: !!t.bestellbar,
  heute_bestellen: !!t.heute_bestellen,
  status: t.status,
  fertig: t.fertig,
  gesamt: t.gesamt,
  lieferanten: (t.lieferanten || []).map((x) => ({
    baeckerei: x.baeckerei, name: x.name, status: x.status, druck_offen: !!x.druck_offen,
  })),
}));

const mengen = {};
(tag.positionen || []).forEach((p) => { if (p.menge) mengen[String(p.nummer)] = p.menge; });

const artikelListe = (artikel.artikel || [])
  .filter((a) => a.aktiv)
  .map((a) => ({ nummer: String(a.nummer), name: a.name, gruppe: a.gruppe || '', menge: mengen[String(a.nummer)] || 0 }));

const daten = {
  stand: new Date().toISOString().slice(0, 10),
  baeckerei: tag.baeckerei_name || 'Bäckerei Freundl',
  datum: tag.datum,
  datum_de: tag.datum_de,
  wochentag: tag.wochentag,
  vorlage_datum_de: tag.vorlage_datum_de || '',
  bestellschluss: (tag.bestellschluss_wochentag || '') + (tag.bestellschluss_datum_de ? ', ' + tag.bestellschluss_datum_de : ''),
  status: tag.status,
  testbetrieb: !!tag.testbetrieb,
  druck_offen: !!tag.druck_offen,
  gruppen: artikel.gruppen || [],
  tage,
  artikel: artikelListe,
};

const ziel = path.join(__dirname, '..', 'mockups', 'baecker-mobil-daten.js');
fs.writeFileSync(ziel,
  '/* Live-Daten des Baecker-Reiters, gezogen am ' + daten.stand + '.\n'
  + '   Erzeugt von tools/baecker_mockup_daten.js - nicht von Hand aendern. */\n'
  + 'window.BKDaten = ' + JSON.stringify(daten, null, 1) + ';\n', 'utf8');

console.log('Geschrieben: ' + ziel);
console.log('  ' + daten.artikel.length + ' aktive Artikel, ' + daten.gruppen.length + ' Gruppen, '
  + daten.tage.length + ' Tage');
console.log('  Mengen vorbelegt: ' + Object.keys(mengen).length);
console.log('  Termin: ' + daten.wochentag + ', ' + daten.datum_de + ' - ' + daten.baeckerei);
