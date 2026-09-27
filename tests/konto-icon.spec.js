// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Mein Konto als Icon mit Anmeldestatus
 * Spec: specs/konto-icon/spec.md
 *
 * Aus dem Laden: „Mein Konto könnte auch über ein Icon dargestellt
 * werden und man gleich sieht, ob man eingeloggt ist oder nicht. Von
 * hier aus sollte man sich auch neu registrieren können, wenn nicht
 * eingeloggt."
 *
 * Vorher stand dort ein Textlink „Mein Konto" — ohne Hinweis darauf, ob
 * jemand angemeldet ist. Man musste die Seite öffnen, um es zu erfahren.
 */

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';

async function seite(page, anmelden) {
  await page.route('**/api/**', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ success: true, orders: [], data: { feature_flags: {} } }),
  }));
  if (anmelden) {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('dl_shop_token', 'zeichen-xyz');
        localStorage.setItem('dl_shop_user', JSON.stringify({
          email: 'anna@example.com', vorname: 'Anna', nachname: 'Beispiel',
        }));
      } catch (e) { }
    });
  }
  await page.goto(`${BASE}/index.html`);
  await page.waitForTimeout(1200);
}

/** Zeigt diese Breite die Kopfleiste überhaupt?
 *
 *  Sie ist bis 768 px ausgeblendet — dort übernimmt das Menü. Das
 *  betrifft auch das **Ladentablett**: Es hat 1200 Bildpunkte, aber bei
 *  einem Skalierungsfaktor von 1,75 nur 686 CSS-Pixel. Ein Fall, der
 *  dort stur `toBeVisible()` fordert, misst nicht die Funktion, sondern
 *  die Bildschirmbreite. */
async function kopfleisteSichtbar(page) {
  return page.evaluate(() => {
    const tb = document.querySelector('.tb');
    return !!tb && getComputedStyle(tb).display !== 'none';
  });
}

test.describe('Mein Konto: Icon zeigt den Anmeldestatus', () => {
  test.use({ serviceWorkers: 'block' });

  test('TC-KI-01: Abgemeldet steht „Anmelden" da', async ({ page }) => {
    await seite(page, false);
    const el = page.locator('#tb-konto');
    await expect(page.locator('#tb-konto-txt')).toHaveText('Anmelden');
    await expect(el, 'sieht aus wie angemeldet').not.toHaveClass(/\ban\b/);
    /* Sichtbar nur dort, wo die Kopfleiste überhaupt erscheint. Auf
       schmalen Geräten — einschließlich des Ladentabletts — übernimmt
       das Menü, das TC-KI-06 prüft. */
    if (await kopfleisteSichtbar(page)) {
      await expect(el).toBeVisible();
    }
  });

  test('TC-KI-02: Abgemeldet führt der Weg zur Anmeldung',
    async ({ page }) => {
      /* Aus dem Laden nachgereicht: „Macht es nicht mehr Sinn, sich
         anzumelden und nachzufragen, ob schon registriert?" Stimmt — der
         Knopf heißt „Anmelden", führte aber ins Anlegen-Formular. Wer
         noch kein Konto hat, findet gleich darunter „Noch kein Konto?
         Konto anlegen". */
      await seite(page, false);
      await expect(page.locator('#tb-konto')).toHaveAttribute('href', '/mein-konto');
    });

  test('TC-KI-03: Angemeldet stehen Name und Initialen da', async ({ page }) => {
    await seite(page, true);
    const el = page.locator('#tb-konto');
    await expect(el, 'der angemeldete Zustand ist nicht erkennbar')
      .toHaveClass(/\ban\b/);
    await expect(page.locator('#tb-konto-txt')).toHaveText('Anna');
    await expect(page.locator('#tb-konto-ic'),
      'keine Initialen im Kreis').toHaveText('AB');
  });

  test('TC-KI-04: Angemeldet führt der Weg zur Übersicht, nicht zum Anlegen',
    async ({ page }) => {
      await seite(page, true);
      await expect(page.locator('#tb-konto')).toHaveAttribute('href', '/mein-konto');
    });

  test('TC-KI-05: Die beiden Zustände sehen verschieden aus',
    async ({ page, browser }) => {
      /* Ein Zustand, den man nur am Text erkennt, ist keiner: Die
         Meldung sagt ausdrücklich „man gleich sieht". */
      await seite(page, false);
      const aus = await page.evaluate(() => {
        const ic = document.getElementById('tb-konto-ic');
        return getComputedStyle(ic).backgroundColor;
      });

      const ctx = await browser.newContext({ serviceWorkers: 'block' });
      const p2 = await ctx.newPage();
      await seite(p2, true);
      const an = await p2.evaluate(() => {
        const ic = document.getElementById('tb-konto-ic');
        return getComputedStyle(ic).backgroundColor;
      });
      await ctx.close();

      expect(an, `beide Zustände haben denselben Hintergrund (${an})`)
        .not.toBe(aus);
    });

  test('TC-KI-06: Auch das Handy-Menü zeigt den Zustand', async ({ page }) => {
    await seite(page, false);
    await expect(page.locator('#mob-konto-txt')).toContainText('Anmelden');
    await expect(page.locator('#mob-konto')).toHaveAttribute('href', '/mein-konto');
  });

  test('TC-KI-07: Angemeldet nennt das Handy-Menü den Namen',
    async ({ page }) => {
      await seite(page, true);
      await expect(page.locator('#mob-konto-txt')).toContainText('Anna');
      await expect(page.locator('#mob-konto')).toHaveAttribute('href', '/mein-konto');
    });

  test('TC-KI-08: Ohne Namen im Konto bleibt es verständlich',
    async ({ page }) => {
      /* Ein Konto ohne Vornamen darf keine leere Schaltfläche erzeugen.
         Die Initialen kommen dann aus der E-Mail-Adresse. */
      await page.route('**/api/**', (route) => route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, orders: [], data: { feature_flags: {} } }),
      }));
      await page.addInitScript(() => {
        try {
          localStorage.setItem('dl_shop_token', 'zeichen-xyz');
          localStorage.setItem('dl_shop_user', JSON.stringify({ email: 'zeta@example.com' }));
        } catch (e) { }
      });
      await page.goto(`${BASE}/index.html`);
      await page.waitForTimeout(1200);

      await expect(page.locator('#tb-konto-txt')).toHaveText('Mein Konto');
      await expect(page.locator('#tb-konto-ic')).toHaveText('Z');
    });
});
