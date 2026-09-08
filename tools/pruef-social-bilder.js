/* Nachweis der Proxy-Sanierung mit Live-Daten.
 *
 * Prueft die drei gemeldeten Fehler:
 *   1. Abgelaufene SharePoint-Links  -> laedt jedes Bild wirklich?
 *   2. Canvas-Verunreinigung          -> laesst sich das Poster exportieren?
 *   3. Buchstabengenauer Namensabgleich -> findet die normalisierte Suche mehr?
 *
 * Start: node tools\pruef-social-bilder.js
 * Voraussetzung: lokale API auf 7071, Dev-Proxy auf 8790.
 */
const { chromium } = require('@playwright/test');

const BASIS = 'http://localhost:8790';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  const page = await ctx.newPage();

  const fehler = [];
  page.on('console', m => { if (m.type() === 'error') fehler.push(m.text()); });
  page.on('pageerror', e => fehler.push('pageerror: ' + e.message));
  page.on('response', r => { if (r.status() >= 500) fehler.push('HTTP ' + r.status() + ' ' + r.url()); });
  page.on('framenavigated', f => { if (f === page.mainFrame()) console.log('  [Navigation] ' + f.url()); });

  // Service Worker durch eine Attrappe ersetzen (register() muss es geben,
  // sonst verdeckt ein Skriptfehler die eigentlichen Befunde).
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      get: () => ({ register: () => Promise.resolve({}), getRegistrations: () => Promise.resolve([]), ready: new Promise(() => {}), addEventListener: () => {}, controller: null })
    });
  });

  // Der Kiosk laedt sich neu, sobald /version.json einen anderen Build meldet.
  // Fuer die Messung konstant halten, sonst stirbt der Ausfuehrungskontext.
  await page.route('**/version.json*', r => r.fulfill({
    status: 200, contentType: 'application/json', body: '{"build":"pruef"}'
  }));

  await page.goto(BASIS + '/kiosk.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window._socialModule && window.socialLoadKatalog, null, { timeout: 60000 });

  console.log('\n=== 1. Bildquellen ===');
  // Der Kiosk laedt Katalog und Mittagstisch-Bilder beim Start selbst. Darauf
  // warten statt zusaetzliche Aufrufe abzusetzen - das entspricht dem echten
  // Ablauf und belastet die lokale API nicht doppelt.
  await page.waitForFunction(() => window._socialKatLoaded === true, null, { timeout: 180000 });
  await page.waitForFunction(() => window._socialMtBilderLoaded === true, null, { timeout: 180000 });
  const quellen = await page.evaluate(() => {
    const mt = window._socMtBilder_ref() || {};
    const kat = window._socialModule._socialKatalog() || [];
    return Object.keys(mt).map(k => ({ was: 'MT', name: k, url: mt[k].bild_url || '' }))
      .concat(kat.filter(k => k.bild_url).map(k => ({ was: 'Katalog', name: k.name, url: k.bild_url })));
  });
  const ueberProxy = quellen.filter(q => q.url.startsWith('/api/tagesbild'));
  const sharepoint = quellen.filter(q => q.url.indexOf('sharepoint') >= 0);
  console.log(`  Bilder gesamt: ${quellen.length}`);
  console.log(`  ueber Proxy:   ${ueberProxy.length}`);
  console.log(`  noch SharePoint (= ablaufend): ${sharepoint.length}`);
  sharepoint.slice(0, 5).forEach(q => console.log('    ! ' + q.name));

  console.log('\n=== 2. Laden die Bilder wirklich? (Stichprobe 8) ===');
  const probe = ueberProxy.slice(0, 8);
  const nurPoster = process.argv.includes('--nur-poster');
  const ladeErgebnis = nurPoster ? [] : await page.evaluate(async (urls) => {
    // Parallel laden - so wie es der Browser beim Zeichnen auch tut.
    return Promise.all(urls.map(async (u) => {
      const t0 = performance.now();
      try {
        const r = await fetch(u.url);
        const b = await r.blob();
        return { name: u.name, ok: r.ok, status: r.status, kb: Math.round(b.size / 1024), ms: Math.round(performance.now() - t0) };
      } catch (e) {
        return { name: u.name, ok: false, status: 0, fehler: e.message, ms: Math.round(performance.now() - t0) };
      }
    }));
  }, probe);
  let geladen = 0;
  ladeErgebnis.forEach(r => {
    if (r.ok) { geladen++; console.log(`  OK   ${String(r.ms).padStart(5)} ms ${String(r.kb).padStart(4)} KB  ${r.name}`); }
    else console.log(`  FEHL  HTTP ${r.status} ${r.fehler || ''}  ${r.name}`);
  });
  console.log(`  -> ${geladen}/${ladeErgebnis.length} geladen`);

  console.log('\n=== 3. Canvas-Verunreinigung ===');
  const taint = nurPoster ? { export: true, uebersprungen: true } : await page.evaluate(async (url) => {
    // Genau der Weg, den socLoadImgs geht: erst fetch->Blob, sonst crossOrigin.
    const img = await new Promise((res, rej) => {
      fetch(url).then(r => r.blob()).then(b => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = () => rej(new Error('img onerror'));
        i.src = URL.createObjectURL(b);
      }).catch(rej);
    });
    const c = document.createElement('canvas');
    c.width = 300; c.height = 200;
    c.getContext('2d').drawImage(img, 0, 0, 300, 200);
    try { const d = c.toDataURL('image/png'); return { export: true, laenge: d.length, bildBreite: img.naturalWidth }; }
    catch (e) { return { export: false, fehler: e.name + ': ' + e.message }; }
  }, probe[0].url);
  console.log(taint.export
    ? `  Export moeglich: ja (Bild ${taint.bildBreite}px, PNG ${Math.round(taint.laenge / 1024)} KB) - Canvas bleibt sauber`
    : `  Export FEHLGESCHLAGEN: ${taint.fehler}`);

  console.log('\n=== 4. Vollstaendiger Poster-Export ===');
  // Social-Reiter oeffnen, damit die Produktauswahl ueberhaupt gezeichnet ist.
  await page.evaluate(() => {
    const t = document.querySelector('.k-tab[data-tab="social"]');
    if (t) t.click();
    if (typeof window.socialBuildPostItems === 'function') window.socialBuildPostItems();
    else if (window._socialModule && window._socialModule.socialBuildPostItems) window._socialModule.socialBuildPostItems();
  });
  await page.waitForTimeout(2500);
  const poster = await page.evaluate(async () => {
    const kat = window._socialModule._socialKatalog() || [];
    const mitBild = kat.filter(k => k.bild_url).slice(0, 2);
    if (!mitBild.length) return { fehler: 'kein Katalogeintrag mit Bild' };
    // Auswahl setzen wie beim Antippen im Kiosk.
    let gesetzt = 0;
    mitBild.forEach(k => {
      const cb = document.querySelector('.soc-post-cb[value="' + k.id + '"]');
      if (cb) { cb.checked = true; gesetzt++; }
    });
    if (!gesetzt) return { fehler: 'Auswahlfelder nicht gefunden' };
    await window.socialGenPreview();
    const auswahl = window._socialModule.socialGatherSelected();
    const geladen = window._socLoadedImgs || {};
    const mitBildGeladen = auswahl.filter(p => geladen[p.id]).length;
    const cv = document.getElementById('soc-post-canvas');
    let exportOk = false, fehler = '';
    try { cv.toDataURL('image/png'); exportOk = true; } catch (e) { fehler = e.name + ': ' + e.message; }
    return {
      ausgewaehlt: auswahl.length,
      bilderGeladen: mitBildGeladen,
      tainted: !!geladen._tainted,
      exportOk, fehler,
      canvas: cv ? cv.width + 'x' + cv.height : 'fehlt'
    };
  });
  console.log('  ' + JSON.stringify(poster));

  console.log('\n=== 5. Namensabgleich ===');
  const abgleich = await page.evaluate(() => {
    const M = window._socialModule;
    const mt = window._socMtBilder_ref() || {};
    const namen = Object.keys(mt);
    if (!namen.length) return { hinweis: 'keine MT-Bilder' };
    // Varianten, an denen der buchstabengenaue Vergleich bisher scheiterte.
    const proben = namen.slice(0, 3).flatMap(n => [
      n.replace(/und/g, 'u.'),
      n + ' ',
      n.replace(/ß/g, 'ss'),
      n.toLowerCase()
    ]);
    let genau = 0, normalisiert = 0;
    proben.forEach(p => {
      if (mt[p]) genau++;
      if (M.socMtBildFuer && M.socMtBildFuer(p)) normalisiert++;
    });
    return { proben: proben.length, genau, normalisiert };
  });
  console.log('  ' + JSON.stringify(abgleich));

  console.log('\n=== Konsolenfehler ===');
  console.log(fehler.length ? fehler.slice(0, 10).map(f => '  ! ' + f).join('\n') : '  keine');

  await browser.close();

  const bestanden = sharepoint.length === 0 && geladen === ladeErgebnis.length
    && taint.export && poster.exportOk;
  console.log('\nERGEBNIS: ' + (bestanden ? 'BESTANDEN' : 'NICHT BESTANDEN'));
  process.exit(bestanden ? 0 : 1);
})();
