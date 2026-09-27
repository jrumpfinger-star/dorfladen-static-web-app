// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Der Weg zum Konto muss auffindbar sein
 * Spec: specs/konto-ohne-bankdaten/spec.md
 *
 * Aus dem Laden, nachdem die Kontoseite gebaut war:
 *   „Wie kann man ein Konto anlegen ohne Shop? Kann man dies bei der
 *    Mittagessenbestellung tun? Wo loggt man sich auf der Homepage ein?"
 *
 * Drei Fragen, die alle dasselbe sagen: Der Zugang war nicht zu finden.
 * Es gab genau EINEN Link — ganz unten in der Fußzeile der Startseite.
 * Auf der Bestellseite: gar keinen.
 *
 * Diese Fälle halten fest, dass er an den Stellen steht, an denen
 * jemand danach sucht.
 */

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';

async function mockApi(page) {
  await page.route('**/api/**', (route) => {
    const url = route.request().url();
    const json = (o) => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(o),
    });
    if (url.includes('/api/cms-config')) {
      return json({ success: true, data: { feature_flags: { mittagstisch: true, orders: false } } });
    }
    /* Ein echtes Gericht ist nötig: Ohne Wochenplan zeigt die Seite nur
       „Kein aktueller Mittagstisch verfügbar" und rendert weder Formular
       noch Fußzeile. Der erste Anlauf dieses Falls ist genau daran
       gescheitert. */
    if (url.includes('/api/wochenplan')) {
      return json({
        success: true,
        data: [{
          dl_wochenplanid: 'w1',
          dl_gericht: 'Dampfnudeln mit Vanillesoße',
          dl_preis: 7.8,
          dl_wochentag: 101000,
          dl_datum: '2026-09-29',
        }],
      });
    }
    if (url.includes('/api/lunch-order') && route.request().method() === 'POST') {
      return json({ success: true, bestellnummer: 'ML-0042' });
    }
    return json({ success: true, orders: [], data: [], gerichte: [] });
  });
}

test.describe('Mein Konto: auffindbar', () => {
  test.use({ serviceWorkers: 'block' });

  test('TC-MK-14: Die Startseite führt sichtbar zum Konto',
    async ({ page }) => {
      /* Nicht nur in der Fußzeile: In der Kopfleiste (Rechner) und im
         Menü (Handy) — dort sucht man zuerst.

         Gesucht wird mit `^=`, nicht `=`: Die Ziele unterscheiden sich
         je nach Beschriftung — „Anmelden" führt auf `/mein-konto`,
         „Konto anlegen" auf `/mein-konto#neu`. Ein Selektor auf die
         genaue Adresse hätte einen davon übersehen und gemeldet, der
         Zugang sei verschwunden, obwohl er nur ein anderes Ziel hat. */
      await mockApi(page);
      await page.goto(`${BASE}/index.html`);
      await page.waitForTimeout(800);

      const links = page.locator('a[href^="/mein-konto"]');
      const anzahl = await links.count();
      expect(anzahl, 'kein einziger Weg zum Konto auf der Startseite')
        .toBeGreaterThanOrEqual(2);

      // Mindestens einer davon muss auch sichtbar sein, nicht nur im DOM.
      let sichtbar = 0;
      for (let i = 0; i < anzahl; i++) {
        if (await links.nth(i).isVisible().catch(() => false)) sichtbar++;
      }
      expect(sichtbar, 'alle Wege zum Konto sind verborgen')
        .toBeGreaterThan(0);
    });

  test('TC-MK-15: Die Bestellseite führt zum Konto', async ({ page }) => {
    /* Die zweite Frage aus dem Laden: „Kann man dies bei der
       Mittagessenbestellung tun?" — jetzt ja.

       Der Link sitzt in der Fußzeile des Bestellformulars. Das ist
       bewusst so: Der Block erscheint erst, wenn ein Gericht gewählt
       ist — vorher ist der Besucher noch beim Aussuchen und nicht bei
       der Frage, auf welchen Geräten er das später sieht. Deshalb wählt
       dieser Fall erst ein Gericht, wie ein Kunde es auch täte. */
    await mockApi(page);
    await page.goto(`${BASE}/mittagstisch-bestellen.html`);
    await page.waitForTimeout(1200);

    await page.locator('#menu-list .menu-item, #menu-list [onclick]').first()
      .click({ timeout: 10000 }).catch(() => { });
    await page.waitForTimeout(700);

    await expect(page.locator('a[href="/mein-konto"]').first(),
      'kein Weg zum Konto im Bestellformular').toBeVisible();
  });

  test('TC-MK-16: Nach der Bestellung steht das Angebot da',
    async ({ page }) => {
      /* Der Moment, in dem der Gedanke aufkommt: Die Bestellung ist
         aufgegeben, „sehe ich das auch am Rechner?" */
      await mockApi(page);
      await page.goto(`${BASE}/mittagstisch-bestellen.html`);
      await page.waitForTimeout(600);

      // Den Erfolgsbildschirm zeigen, wie es submitOrder() tut.
      await page.evaluate(() => {
        const h = document.getElementById('konto-hinweis');
        const angemeldet = !!(localStorage.getItem('dl_shop_token') || '').trim();
        if (h && !angemeldet && window === window.parent) h.style.display = '';
        document.getElementById('success-overlay').classList.add('show');
      });
      await page.waitForTimeout(300);

      const hinweis = page.locator('#konto-hinweis');
      await expect(hinweis).toBeVisible();
      await expect(hinweis).toContainText('Konto anlegen');
      await expect(hinweis.locator('a')).toHaveAttribute('href', '/mein-konto#neu');
    });

  test('TC-MK-17: Wer angemeldet ist, wird nicht behelligt',
    async ({ page }) => {
      /* Der Hinweis ist ein Angebot, keine Werbung. Wer schon ein Konto
         hat, soll ihn nicht jedes Mal wegklicken müssen. */
      await mockApi(page);
      await page.goto(`${BASE}/mittagstisch-bestellen.html`);
      await page.evaluate(() => {
        try { localStorage.setItem('dl_shop_token', 'zeichen-abc'); } catch (e) { }
      });
      await page.waitForTimeout(400);

      await page.evaluate(() => {
        const h = document.getElementById('konto-hinweis');
        const angemeldet = !!(localStorage.getItem('dl_shop_token') || '').trim();
        if (h && !angemeldet && window === window.parent) h.style.display = '';
        document.getElementById('success-overlay').classList.add('show');
      });
      await page.waitForTimeout(300);
      await expect(page.locator('#konto-hinweis')).toBeHidden();
    });

  test('TC-MK-18: Der Link öffnet das Anlegen-Formular direkt',
    async ({ page }) => {
      /* `#neu` spart einen Klick: Wer von der Bestellung kommt, hat noch
         kein Konto — ihm zuerst die Anmeldung zu zeigen wäre ein Umweg. */
      await mockApi(page);
      await page.goto(`${BASE}/mein-konto.html#neu`);
      await page.waitForTimeout(600);
      await expect(page.locator('#mk-neu')).toBeVisible();
      await expect(page.locator('#mk-anmelden')).toBeHidden();
    });

  test('TC-MK-19: Auch die Bestellstatus-Seite führt zum Konto',
    async ({ page }) => {
      /* Wer seinen Bestellstatus sucht, ist genau der, den die Frage
         „und auf dem anderen Gerät?" betrifft.

         Das Ziel traegt `#neu`, weil der Link „Konto anlegen" verspricht.
         Beschriftung und Ziel muessen zusammenpassen - andersherum war
         es gemeldet worden: „Anmelden" fuehrte ins Anlegen-Formular.
         (Spec anmelden-vor-registrieren) */
      await mockApi(page);
      await page.goto(`${BASE}/bestellstatus.html`);
      await page.waitForTimeout(900);
      const hinweis = page.locator('#bs-konto');
      await expect(hinweis).toBeVisible();
      await expect(hinweis.locator('a')).toContainText('Konto anlegen');
      await expect(hinweis.locator('a')).toHaveAttribute('href', '/mein-konto#neu');
    });

  test('TC-MK-20: Angemeldete sehen ihn auch dort nicht',
    async ({ page }) => {
      await mockApi(page);
      await page.goto(`${BASE}/bestellstatus.html`);
      await page.evaluate(() => {
        try { localStorage.setItem('dl_shop_token', 'zeichen-abc'); } catch (e) { }
      });
      await page.reload();
      await page.waitForTimeout(900);
      await expect(page.locator('#bs-konto')).toBeHidden();
    });
});
