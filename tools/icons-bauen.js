// Erzeugt die PNG-Icons aus den SVG-Quellen in static-site/images/.
// Neu erzeugen, wenn app-icon.svg oder app-icon-maskable.svg geaendert wurde:
//   node tools/icons-bauen.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BILDER = path.join(__dirname, '..', 'static-site', 'images');

const auftraege = [
  { quelle: 'app-icon.svg', ziel: 'icon-192.png', groesse: 192 },
  { quelle: 'app-icon.svg', ziel: 'icon-512.png', groesse: 512 },
  { quelle: 'app-icon-maskable.svg', ziel: 'icon-maskable-192.png', groesse: 192 },
  { quelle: 'app-icon-maskable.svg', ziel: 'icon-maskable-512.png', groesse: 512 },
];

// Favicon-Groessen fuer den Browser-Tab
const FAVICON = [16, 32, 48];

/**
 * Packt fertige PNGs in eine .ico-Datei. Seit Vista duerfen ICO-Eintraege
 * direkt PNG-Daten enthalten - damit braucht es keinen BMP-Encoder.
 */
function icoBauen(pngs) {
  const kopf = Buffer.alloc(6);
  kopf.writeUInt16LE(0, 0);           // reserviert
  kopf.writeUInt16LE(1, 2);           // Typ 1 = Icon
  kopf.writeUInt16LE(pngs.length, 4); // Anzahl Bilder
  let offset = 6 + pngs.length * 16;
  const eintraege = [];
  for (const p of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(p.groesse >= 256 ? 0 : p.groesse, 0); // Breite (0 = 256)
    e.writeUInt8(p.groesse >= 256 ? 0 : p.groesse, 1); // Hoehe
    e.writeUInt8(0, 2);                 // Farbanzahl (0 = Truecolor)
    e.writeUInt8(0, 3);                 // reserviert
    e.writeUInt16LE(1, 4);              // Ebenen
    e.writeUInt16LE(32, 6);             // Bit je Pixel
    e.writeUInt32LE(p.daten.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += p.daten.length;
    eintraege.push(e);
  }
  return Buffer.concat([kopf, ...eintraege, ...pngs.map((p) => p.daten)]);
}

(async () => {
  const browser = await chromium.launch();
  const svgQuelle = {};
  const lade = (datei) => (svgQuelle[datei] = svgQuelle[datei] || fs.readFileSync(path.join(BILDER, datei), 'utf8'));
  const male = async (datei, groesse) => {
    const svg = lade(datei);
    const page = await browser.newPage({ viewport: { width: groesse, height: groesse } });
    await page.setContent(
      `<body style="margin:0">${svg.replace(/width="512" height="512"/, `width="${groesse}" height="${groesse}"`)}</body>`
    );
    const daten = await page.locator('svg').screenshot();
    await page.close();
    return daten;
  };

  for (const a of auftraege) {
    fs.writeFileSync(path.join(BILDER, a.ziel), await male(a.quelle, a.groesse));
    console.log(a.ziel + '  (' + a.groesse + 'px)');
  }

  const pngs = [];
  for (const g of FAVICON) pngs.push({ groesse: g, daten: await male('app-icon.svg', g) });
  const ico = path.join(BILDER, '..', 'favicon.ico');
  fs.writeFileSync(ico, icoBauen(pngs));
  console.log('favicon.ico  (' + FAVICON.join(', ') + 'px)');

  await browser.close();
})();
