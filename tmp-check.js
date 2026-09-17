const { chromium } = require('@playwright/test');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await p.goto('https://www.dorfladen-oberornau.de/kiosk', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(4000);

  // Baecker-Verlauf
  await p.evaluate(() => { const t = document.querySelector('.k-tab[data-tab="baecker"]'); if (t) t.click(); });
  await p.waitForTimeout(3000);
  await p.evaluate(() => window.KBaecker && window.KBaecker.sub('verlauf'));
  await p.waitForTimeout(2500);
  const zu = await p.evaluate(() => [...document.querySelectorAll('#panel-baecker .bk-hist')].slice(0, 2).map((z) => ({
    text: z.textContent.replace(/\s+/g, ' ').trim().slice(0, 60),
    knoepfe: [...z.querySelectorAll('button')].map((x) => x.textContent.trim()).filter(Boolean),
  })));
  // aufklappen
  await p.evaluate(() => { const d = document.querySelector('#panel-baecker .bk-hist .d'); if (d) d.click(); });
  await p.waitForTimeout(2000);
  const auf = await p.evaluate(() => [...document.querySelectorAll('#panel-baecker .bk-hist-fuss')].slice(0, 1).map((z) =>
    [...z.querySelectorAll('button')].map((x) => x.textContent.trim()).filter(Boolean)));
  console.log('BAECKER zugeklappt: ' + JSON.stringify(zu, null, 1));
  console.log('BAECKER aufgeklappt: ' + JSON.stringify(auf));

  // Getraenke
  await p.evaluate(() => { const t = document.querySelector('.k-tab[data-tab="getraenke"]'); if (t) t.click(); });
  await p.waitForTimeout(3000);
  const gk = await p.evaluate(() => ({
    modul: typeof window.KGetraenke,
    unterreiter: [...document.querySelectorAll('#panel-getraenke button')].map((b) => b.textContent.trim()).filter(Boolean).slice(0, 12),
  }));
  console.log('GETRAENKE: ' + JSON.stringify(gk, null, 1));
  await b.close();
})();