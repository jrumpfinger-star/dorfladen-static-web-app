// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Meine Bestellungen: Shop und Mittagstisch, in zwei Reitern
 * Spec: specs/bestelluebersicht/spec.md
 *
 * Aus dem Laden: „Hab Mittagessen bestellt, aber erscheint nicht in
 * Online-Einkauf. Es wäre auch schön, wenn hier erst nur die aktuellen
 * Einkäufe von gestern bis in die Zukunft dargestellt werden und in
 * einem weiteren Tab die älteren. Eventuell dann auch mit einem Badge
 * versehen, wie viele Bestellungen noch offen sind."
 *
 * Drei Mängel auf einmal:
 *   1. Der Mittagstisch fehlte ganz — geholt wurde nur /api/shop-order.
 *   2. Alles stand in einer Liste, auch Abholungen aus dem Juni.
 *   3. Der Zähler nannte alle offenen, auch längst vergangene.
 */

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';

function tag(versatz) {
  const d = new Date();
  d.setDate(d.getDate() + versatz);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
    + '-' + String(d.getDate()).padStart(2, '0');
}

async function seite(page, opts = {}) {
  const gerufen = { shop: 0, mittag: [] };
  await page.route('**/api/**', (route) => {
    const u = route.request().url();
    const j = (o) => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(o),
    });
    if (u.includes('/api/shop-order')) {
      gerufen.shop++;
      return j({ success: true, orders: opts.ohneShop ? [] : [
        // morgen, noch offen
        { bestellnummer: 'DL-SHOP-NEU', abholdatum: tag(2), status: 0,
          gesamtsumme: '14.30', positionen: [{ menge: 8 }] },
        // im Juli, nie abgeholt — „offen", aber längst vorbei
        { bestellnummer: 'DL-SHOP-ALT', abholdatum: '2026-07-01', status: 2,
          gesamtsumme: '23.16', positionen: [{ menge: 5 }] },
      ] });
    }
    if (u.includes('/api/lunch-order')) {
      gerufen.mittag.push(u);
      return j({ success: true, orders: [
        { bestellnummer: 'ML-NEU', gericht: 'Dampfnudeln mit Vanillesoße',
          datum: tag(1), menge: 1, preis: 7.8, status: 0 },
        { bestellnummer: 'ML-ALT', gericht: 'Schnitzel',
          datum: '2026-08-15', menge: 1, preis: 8.8, status: 3 },
      ] });
    }
    return j({ success: true, orders: [], data: { feature_flags: {} } });
  });

  await page.addInitScript((mitKonto) => {
    try {
      localStorage.setItem('dl_push_device_id', 'geraet-1');
      if (mitKonto) {
        localStorage.setItem('dl_shop_token', 'zeichen-xyz');
        localStorage.setItem('dl_shop_user',
          JSON.stringify({ email: 'anna@example.com', vorname: 'Anna', nachname: 'Beispiel' }));
      }
    } catch (e) { }
  }, !opts.ohneKonto);

  await page.goto(`${BASE}/index.html`);
  await page.waitForTimeout(1800);
  return gerufen;
}

async function popupOeffnen(page) {
  await page.evaluate(() => document.getElementById('orders-overlay').classList.add('open'));
  await page.waitForTimeout(400);
}

test.describe('Meine Bestellungen: Reiter und Badge', () => {
  test.use({ serviceWorkers: 'block' });

  test('TC-BU-01: Der Mittagstisch erscheint mit', async ({ page }) => {
    // Der gemeldete Fall: „Hab Mittagessen bestellt, aber erscheint nicht."
    await seite(page);
    await popupOeffnen(page);
    await expect(page.locator('#orders-body')).toContainText('Dampfnudeln');
  });

  test('TC-BU-02: Aktuell ist ab gestern, Früheres liegt im zweiten Reiter',
    async ({ page }) => {
      await seite(page);
      const auf = await page.evaluate(() => ({
        aktuell: (window._dlBestellungen.aktuell || []).map((o) => o.nr),
        frueher: (window._dlBestellungen.frueher || []).map((o) => o.nr),
      }));
      expect(auf.aktuell.sort(), 'falsche Aufteilung')
        .toEqual(['ML-NEU', 'SHOP-NEU'].sort());
      expect(auf.frueher.sort()).toEqual(['ML-ALT', 'SHOP-ALT'].sort());
    });

  test('TC-BU-03: Der Zähler nennt nur die offenen AKTUELLEN',
    async ({ page }) => {
      /* Vorher zählte er alle offenen — auch die Abholung vom 1. Juli,
         die nie abgeholt wurde. Im Bildschirmfoto aus dem Laden stand
         deshalb „7", obwohl nur eine Bestellung wirklich anstand. */
      await seite(page);
      // aktuell offen: SHOP-NEU (Status 0) und ML-NEU (Status 0) = 2
      await expect(page.locator('#promo-orders-count')).toHaveText('2');
    });

  test('TC-BU-04: Beide Reiter stehen da, auch wenn einer leer wäre',
    async ({ page }) => {
      await seite(page);
      await popupOeffnen(page);
      await expect(page.locator('.ord-tab')).toHaveCount(2);
      await expect(page.locator('.ord-tab[data-tab="aktuell"]')).toHaveClass(/\ban\b/);
    });

  test('TC-BU-05: Umschalten zeigt die älteren', async ({ page }) => {
    await seite(page);
    await popupOeffnen(page);
    await expect(page.locator('#orders-body')).toContainText('Dampfnudeln');

    await page.click('.ord-tab[data-tab="frueher"]');
    await page.waitForTimeout(400);
    await expect(page.locator('#orders-body')).toContainText('Schnitzel');
    await expect(page.locator('#orders-body'),
      'die aktuelle Bestellung steht noch im Rückblick').not.toContainText('Dampfnudeln');
  });

  test('TC-BU-06: Ohne Konto kommt der Mittagstisch trotzdem',
    async ({ page }) => {
      /* Die Ad-hoc-Kundschaft: Der Shop braucht ein Konto, der
         Mittagstisch findet die Bestellung über die Geräte-Kennung. */
      const gerufen = await seite(page, { ohneKonto: true });
      expect(gerufen.shop, 'ohne Konto wurde der Shop abgefragt').toBe(0);
      expect(gerufen.mittag.length, 'der Mittagstisch wurde nicht abgefragt')
        .toBeGreaterThan(0);
      expect(gerufen.mittag.some((u) => u.includes('device_id=geraet-1')),
        `ohne Geräte-Kennung findet er nichts: ${gerufen.mittag.join(' , ')}`).toBe(true);

      await popupOeffnen(page);
      await expect(page.locator('#orders-body')).toContainText('Dampfnudeln');
    });

  test('TC-BU-07: Die Abfrage holt auch Älteres', async ({ page }) => {
    /* Ohne `tage_zurueck` lieferte mode=my nur ab heute — im Rückblick
       hätte dann ausgerechnet der Mittagstisch gefehlt.

       Geprüft wird mit `some`, nicht am ersten Aufruf: Die Seite fragt
       `lunch-order` ZWEIMAL — einmal für die Kachel (nur ab heute, über
       `dlMeineBestellungen`) und einmal für diese Übersicht (mit
       Rückblick). Welcher zuerst ankommt, ist nicht festgelegt. */
    const gerufen = await seite(page);
    expect(gerufen.mittag.some((u) => u.includes('tage_zurueck=')),
      `kein Aufruf mit Rückblick: ${gerufen.mittag.join(' , ')}`).toBe(true);
  });

  test('TC-BU-08: Das Popup heißt nicht mehr nur „Online-Einkauf"',
    async ({ page }) => {
      /* Es zeigt jetzt beides — ein Titel, der nur den Shop nennt, wäre
         irreführend. */
      await seite(page);
      await popupOeffnen(page);
      await expect(page.locator('.orders-modal-head h2')).toHaveText('Meine Bestellungen');
    });

  test('TC-BU-09: Mittagsbestellungen führen auf ihre Statusseite',
    async ({ page }) => {
      await seite(page);
      await popupOeffnen(page);
      const karte = page.locator('.ord-card', { hasText: 'Dampfnudeln' });
      await expect(karte).toHaveAttribute('onclick', /bestellstatus\?nr=ML-NEU/);
    });
});
