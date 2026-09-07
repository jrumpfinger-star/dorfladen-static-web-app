// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Installationshinweis (PWA) auf dem Handy.
 *
 * Gemeldet: „Auf Mobile verhindert die Meldung, dass die Seite auch als App
 * installiert werden kann, das Scrollen und es nervt die Kunden."
 *
 * Zwei Ursachen wurden gefunden:
 *  1. Der iOS-Zweig ersetzte den Textblock über den Selektor
 *     `div > div:last-of-type`. Der trifft die ganze Flex-Zeile und löschte
 *     dabei Bild UND beide Knöpfe – der Hinweis liess sich auf dem iPhone
 *     nicht mehr wegtippen.
 *  2. Der Balken liegt fest am unteren Rand, ohne dass Platz freigehalten
 *     wurde. Die letzten Zeilen der Seite blieben dauerhaft verdeckt.
 */

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

/** Besuchszähler vorbelegen – der Hinweis erscheint erst ab dem 2. Besuch. */
async function alsWiederkehrer(page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('pwa-besuche', '5');
      localStorage.removeItem('pwa-dismissed');
    } catch (e) { /* ignore */ }
  });
}

async function startseite(page) {
  await page.route('**/api/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [], orders: [], posts: [] }) })
  );
  await page.goto(BASE + '/', { waitUntil: 'commit' });
}

test.describe('PWA-Installationshinweis stört nicht', () => {
  test.use({ serviceWorkers: 'block', userAgent: IPHONE_UA, viewport: { width: 390, height: 664 } });

  test('TC-PWA-01 Hinweis lässt sich schließen (Knopf überlebt den iOS-Text)', async ({ page }) => {
    await alsWiederkehrer(page);
    await startseite(page);
    const banner = page.locator('#pwa-install-banner');
    await expect(banner).toBeVisible({ timeout: 10000 });
    const zu = page.locator('#pwa-btn-close');
    await expect(zu).toBeVisible();
    // Tap-Target mindestens 44px (Constitution: Touch-Bedienung)
    const box = await zu.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await zu.click();
    await expect(banner).toBeHidden();
  });

  test('TC-PWA-02 Hinweis verdeckt den Seiteninhalt nicht', async ({ page }) => {
    await alsWiederkehrer(page);
    await startseite(page);
    const banner = page.locator('#pwa-install-banner');
    await expect(banner).toBeVisible({ timeout: 10000 });
    const mass = await page.evaluate(() => {
      const b = document.getElementById('pwa-install-banner');
      return {
        bannerHoehe: b.offsetHeight,
        padding: parseInt(getComputedStyle(document.body).paddingBottom, 10) || 0,
      };
    });
    // Der Balken haelt sich seinen Platz selbst frei
    expect(mass.padding).toBeGreaterThanOrEqual(mass.bannerHoehe);
  });

  test('TC-PWA-03 Nach dem Schließen ist der Platz wieder frei', async ({ page }) => {
    await alsWiederkehrer(page);
    await startseite(page);
    await expect(page.locator('#pwa-install-banner')).toBeVisible({ timeout: 10000 });
    await page.locator('#pwa-btn-close').click();
    const padding = await page.evaluate(() => parseInt(getComputedStyle(document.body).paddingBottom, 10) || 0);
    expect(padding).toBeLessThan(40);
  });

  test('TC-PWA-04 Beim ersten Besuch erscheint kein Hinweis', async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.clear(); } catch (e) { /* ignore */ }
    });
    await startseite(page);
    await page.waitForTimeout(6000);
    await expect(page.locator('#pwa-install-banner')).toBeHidden();
  });

  test('TC-PWA-05 Einmal weggetippt bleibt er weg', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('pwa-besuche', '5');
        localStorage.setItem('pwa-dismissed', '1');
      } catch (e) { /* ignore */ }
    });
    await startseite(page);
    await page.waitForTimeout(6000);
    await expect(page.locator('#pwa-install-banner')).toBeHidden();
  });

  test('TC-PWA-06 Hinweis blendet sich von selbst wieder aus', async ({ page }) => {
    await alsWiederkehrer(page);
    await startseite(page);
    const banner = page.locator('#pwa-install-banner');
    await expect(banner).toBeVisible({ timeout: 10000 });
    // 15 s Selbstabschaltung
    await expect(banner).toBeHidden({ timeout: 20000 });
  });

  test('TC-PWA-07 Der Hinweis sperrt das Scrollen nicht', async ({ page }) => {
    await alsWiederkehrer(page);
    // Das Tagesinfo-Popup oeffnet sich auf der Startseite von selbst und sperrt
    // dabei den Bildlauf (position:fixed). Damit dieser Test wirklich den
    // Installationshinweis prueft, wird es als "schon gesehen" markiert.
    await page.addInitScript(() => {
      try {
        const d = new Date().toISOString().substring(0, 10);
        localStorage.setItem('tagespost_seen_' + d, '1');
      } catch (e) { /* ignore */ }
    });
    await startseite(page);
    await expect(page.locator('#pwa-install-banner')).toBeVisible({ timeout: 10000 });
    const erg = await page.evaluate(() => ({
      bodyPosition: getComputedStyle(document.body).position,
      bodyOverflowY: getComputedStyle(document.body).overflowY,
    }));
    // Der Balken darf keinen Bildlauf-Riegel setzen
    expect(erg.bodyPosition).not.toBe('fixed');
    expect(erg.bodyOverflowY).not.toBe('hidden');
  });
});
