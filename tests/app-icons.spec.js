// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * App-Icons (PWA).
 *
 * Zwei Dinge gingen bisher schief:
 *  1. Als Icon diente ein Foto des Ladenschilds – eine Wortmarke. Auf dem
 *     Startbildschirm ist das Icon nur ~48px gross, dort wird Schrift zu Matsch.
 *  2. Beide Icons waren als `purpose: "any maskable"` deklariert. „maskable"
 *     erlaubt Android, rund zuzuschneiden, und sichert nur die mittleren 80%.
 *     Der Inhalt lief aber bis an den Rand – Android schnitt ihn an.
 *
 * Die Tests pruefen daher die Einrichtung UND dass beim maskable-Icon
 * tatsaechlich nichts in der Beschnittzone liegt.
 */

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';

const MANIFESTE = ['/manifest.json', '/kiosk-manifest.json', '/posten-manifest.json'];

test.describe('App-Icons', () => {
  test.use({ serviceWorkers: 'block' });

  for (const pfad of MANIFESTE) {
    test(`TC-IC-01 ${pfad} trennt "any" und "maskable"`, async ({ request }) => {
      const res = await request.get(BASE + pfad);
      expect(res.status()).toBe(200);
      const m = await res.json();
      const zwecke = m.icons.map((i) => i.purpose);
      // Kein Icon darf beides gleichzeitig sein – sonst schneidet Android das
      // randfuellende Bild an.
      expect(zwecke).not.toContain('any maskable');
      expect(zwecke).toContain('any');
      expect(zwecke).toContain('maskable');
      const maskable = m.icons.filter((i) => i.purpose === 'maskable');
      expect(maskable.length).toBeGreaterThanOrEqual(1);
      for (const i of maskable) expect(i.src).toContain('maskable');
    });
  }

  test('TC-IC-02 Alle benannten Icon-Dateien sind abrufbar', async ({ request }) => {
    const dateien = [
      '/images/icon-192.png', '/images/icon-512.png',
      '/images/icon-maskable-192.png', '/images/icon-maskable-512.png',
      '/favicon.ico',
    ];
    for (const d of dateien) {
      const res = await request.get(BASE + d);
      expect(res.status(), d).toBe(200);
      const buf = await res.body();
      expect(buf.length, d).toBeGreaterThan(300);
    }
  });

  test('TC-IC-03 Beim maskable-Icon liegt nichts in der Beschnittzone', async ({ page }) => {
    // Erst die Seite oeffnen: sonst ist das Bild fremder Herkunft und der
    // Canvas laesst sich nicht auslesen.
    await page.goto(BASE + '/favicon.ico');
    // Android sichert nur die mittleren 80% zu (Radius 205 von 256).
    // Ausserhalb davon muss reiner Hintergrund stehen.
    const rand = await page.evaluate(async (basis) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = basis + '/images/icon-maskable-512.png';
      await img.decode();
      const cv = document.createElement('canvas');
      cv.width = 512; cv.height = 512;
      const ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, 512, 512).data;
      const bg = [d[0], d[1], d[2]];
      let abweichend = 0;
      for (let y = 0; y < 512; y += 2) {
        for (let x = 0; x < 512; x += 2) {
          const dx = x - 256, dy = y - 256;
          if (dx * dx + dy * dy < 205 * 205) continue; // in der sicheren Zone
          const i = (y * 512 + x) * 4;
          if (Math.abs(d[i] - bg[0]) > 8 || Math.abs(d[i + 1] - bg[1]) > 8 || Math.abs(d[i + 2] - bg[2]) > 8) abweichend++;
        }
      }
      return { abweichend, bg };
    }, BASE);
    expect(rand.abweichend).toBe(0);
  });

  test('TC-IC-04 Das Icon ist eine flaechige Bildmarke, kein Foto', async ({ page }) => {
    await page.goto(BASE + '/favicon.ico');
    // Die alte Wortmarke war ein Foto des Ladenschilds – tausende Farbtoene,
    // nichts davon bei 48px erkennbar. Eine flaechige Bildmarke wird dagegen
    // von wenigen Farben beherrscht; genau das macht sie auch klein lesbar.
    // Geprueft wird die Flaechendominanz, nicht die reine Farbanzahl: weiche
    // Kanten erzeugen zwangslaeufig Zwischentoene.
    const anteil = await page.evaluate(async (basis) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = basis + '/images/icon-512.png';
      await img.decode();
      const cv = document.createElement('canvas');
      cv.width = 512; cv.height = 512;
      const ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, 512, 512).data;
      const zaehler = new Map();
      let gesamt = 0;
      for (let i = 0; i < d.length; i += 4) {
        const k = (d[i] >> 3) + '-' + (d[i + 1] >> 3) + '-' + (d[i + 2] >> 3);
        zaehler.set(k, (zaehler.get(k) || 0) + 1);
        gesamt++;
      }
      const top = Array.from(zaehler.values()).sort((a, b) => b - a).slice(0, 4);
      return top.reduce((s, n) => s + n, 0) / gesamt;
    }, BASE);
    // Vier Farben decken den Grossteil der Flaeche ab
    expect(anteil).toBeGreaterThan(0.9);
  });
});
