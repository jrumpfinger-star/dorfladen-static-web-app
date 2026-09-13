/**
 * Erzeugt die PDF-Fassung des Besucher-Handbuchs.
 *
 *   python tools\handbuch_bauen.py          (erst das HTML bauen)
 *   python -m http.server 8811 --bind 127.0.0.1   (aus static-site/)
 *   node tools\handbuch_pdf.js
 *
 * Das PDF wird aus derselben HTML-Datei gedruckt, die auch im Browser
 * steht - so koennen beide nicht auseinanderlaufen. Die Druckregeln
 * stehen in der @media-print-Sektion von tools/handbuch_bauen.py.
 *
 * Aus dem CMS wird auf das PDF verlinkt (cms.html und die beiden
 * Schwesterdateien). Wer das Handbuch aendert, muss es hier neu erzeugen.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const QUELLE = process.env.TEST_URL || 'http://127.0.0.1:8811';
const SEITE = QUELLE + '/handbuch/homepage-anwenderhandbuch.html';
const ZIEL = path.join('static-site', 'handbuch', 'homepage-anwenderhandbuch.pdf');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const antwort = await page.goto(SEITE, { waitUntil: 'networkidle' });
  if (!antwort || antwort.status() >= 400) {
    console.error(`FEHLER: ${SEITE} lieferte ${antwort && antwort.status()}.`);
    console.error('Laeuft der lokale Server? python -m http.server 8811 --bind 127.0.0.1');
    await browser.close();
    process.exit(1);
  }
  await page.waitForTimeout(600);

  await page.pdf({
    path: ZIEL,
    format: 'A4',
    printBackground: true,
    margin: { top: '16mm', bottom: '16mm', left: '16mm', right: '16mm' },
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate:
      '<div style="width:100%;font-size:8pt;color:#6b7280;padding:0 16mm;'
      + 'display:flex;justify-content:space-between">'
      + '<span>Dorfladen Oberornau &middot; dorfladen-oberornau.de</span>'
      + '<span class="pageNumber"></span></div>',
  });

  const kb = Math.round(fs.statSync(ZIEL).size / 1024);
  console.log(`ok   ${ZIEL} (${kb} KB)`);
  await browser.close();
})();
