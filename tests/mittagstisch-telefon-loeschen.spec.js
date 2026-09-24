// @ts-check
const { test, expect } = require('./_kiosk-angemeldet');

/**
 * Mittagstisch – Telefonbestellung löschen
 * Spec: specs/telefon-bestellung-loeschen/spec.md
 *
 * Aus dem Laden: „Telefonbestellung sollen auch gelöscht werden können und
 * nicht nur storniert." Eine Fehleingabe oder Testbestellung bleibt sonst
 * für immer in Listen und Zählern stehen.
 *
 * Alle API-Aufrufe sind abgefangen; es wird nichts gelöscht.
 */

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const LOKAL = /localhost|127\.0\.0\.1/.test(BASE);
const KIOSK_URL = LOKAL ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

function heute() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
    + '-' + String(d.getDate()).padStart(2, '0');
}

const GERICHT = 'Schnitzel mit Pommes oder Kartoffelsalat';

/* quelle 0 = online, 1 = telefonisch, 2 = am Tresen aufgenommen. */
function bestellungen() {
  const basis = [
    { id: 'tel-neu', name: 'Anruf Neu', status: 0, quelle: 1 },
    { id: 'tel-ok', name: 'Anruf Bestätigt', status: 1, quelle: 1 },
    { id: 'tel-storno', name: 'Anruf Storniert', status: 2, quelle: 1 },
    { id: 'tel-abgeholt', name: 'Anruf Abgeholt', status: 3, quelle: 1 },
    { id: 'tresen', name: 'Am Tresen', status: 1, quelle: 2 },
    { id: 'online-neu', name: 'Online Neu', status: 0, quelle: 0 },
    { id: 'online-storno', name: 'Online Storniert', status: 2, quelle: 0 },
  ];
  return basis.map((o) => Object.assign({
    datum: heute(), gericht: GERICHT, menge: 1, preis: 8.8,
    mitnehmen: false, anmerkung: '', kommentar_gelesen: true, verlauf: [],
  }, o));
}

/** Fängt alle Löschaufrufe ab und merkt sie sich. */
async function mockApi(page) {
  const geloescht = [];
  /* Ohne `await` ist die Route unter Last nicht sicher registriert, bevor
     `page.goto` die ersten Aufrufe absetzt. */
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = req.url();
    const json = (o) => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(o),
    });
    if (req.method() === 'DELETE') {
      geloescht.push(url);
      return json({ success: true, message: 'Bestellung gelöscht' });
    }
    if (url.includes('/api/cms-config')) {
      return json({ success: true, data: { feature_flags: { kiosk_mittag: true } } });
    }
    if (url.includes('mode=unread_messages')) return json({ success: true, unread_count: 0 });
    if (url.includes('mode=messages')) return json({ success: true, orders: [] });
    if (url.includes('/api/lunch-order')) return json({ success: true, orders: bestellungen() });
    return json({ success: true, orders: [], data: [] });
  });
  return geloescht;
}

async function openMittag(page) {
  const geloescht = await mockApi(page);
  await page.goto(KIOSK_URL);
  await page.click('[data-tab="mittag"]');
  await page.waitForTimeout(1500);
  return geloescht;
}

/** Wechselt auf den Filter, unter dem die Karte einsortiert ist. */
async function filter(page, name) {
  await page.click(`[data-mt-filter="${name}"]`);
  await page.waitForTimeout(500);
}

const papierkorb = (page, id) => page.locator('#oc-' + id + ' .k-oc-del');

test.describe('Mittagstisch: Telefonbestellung löschen', () => {
  test.use({ serviceWorkers: 'block' });

  test('TC-TL-01: Telefonbestellungen tragen einen Papierkorb',
    async ({ page }) => {
      await openMittag(page);
      await expect(papierkorb(page, 'tel-neu'),
        'kein Papierkorb an der telefonischen Bestellung').toBeVisible();
      await expect(papierkorb(page, 'tel-ok')).toBeVisible();
      await expect(papierkorb(page, 'tresen'),
        'am Tresen aufgenommen — dasselbe Recht').toBeVisible();
    });

  test('TC-TL-02: Online-Bestellungen tragen keinen', async ({ page }) => {
    /* Die sieht der Kunde in seiner eigenen Übersicht. Sie verschwinden
       zu lassen wäre für ihn nicht nachvollziehbar — dort bleibt es beim
       Stornieren. */
    await openMittag(page);
    await expect(papierkorb(page, 'online-neu'),
      'Online-Bestellung ist löschbar').toHaveCount(0);
    await filter(page, 'storniert');
    await expect(papierkorb(page, 'online-storno')).toHaveCount(0);
  });

  test('TC-TL-03: Auch eine stornierte Telefonbestellung lässt sich löschen',
    async ({ page }) => {
      // Genau der gemeldete Fall: eine stornierte Testbestellung soll weg.
      await openMittag(page);
      await filter(page, 'storniert');
      await expect(papierkorb(page, 'tel-storno')).toBeVisible();
    });

  test('TC-TL-04: Erst nach Bestätigung wird gelöscht', async ({ page }) => {
    /* Was weg ist, ist weg — anders als beim Stornieren gibt es keinen
       Weg zurück. Deshalb zweistufig. */
    const geloescht = await openMittag(page);
    await papierkorb(page, 'tel-neu').click();

    const dlg = page.locator('#dl-confirm-overlay');
    await expect(dlg, 'keine Rückfrage').toBeVisible();
    expect(geloescht.length, 'schon gelöscht, bevor bestätigt wurde').toBe(0);

    await expect(dlg).toContainText('Anruf Neu');
    await dlg.locator('button', { hasText: 'Endgültig löschen' }).click();
    await page.waitForTimeout(900);

    expect(geloescht.length, 'nichts gelöscht').toBe(1);
    expect(geloescht[0], 'falsche Bestellung getroffen').toContain('tel-neu');
  });

  test('TC-TL-05: Abbrechen löscht nichts', async ({ page }) => {
    const geloescht = await openMittag(page);
    await papierkorb(page, 'tel-neu').click();
    const dlg = page.locator('#dl-confirm-overlay');
    await expect(dlg).toBeVisible();
    await dlg.locator('button', { hasText: 'Abbrechen' }).click();
    await page.waitForTimeout(700);
    expect(geloescht.length, 'trotz Abbruch gelöscht').toBe(0);
  });

  test('TC-TL-06: Der Klick öffnet nicht zugleich die Karte',
    async ({ page }) => {
      /* Der Papierkorb sitzt in der Kopfzeile, die sonst die Karte
         aufklappt. Ohne stopPropagation stünde hinter der Rückfrage eine
         aufgeklappte Karte. */
      await openMittag(page);
      await papierkorb(page, 'tel-neu').click();
      await expect(page.locator('#dl-confirm-overlay')).toBeVisible();
      await expect(page.locator('#oc-tel-neu .k-order-body'),
        'Karte ist nebenbei aufgeklappt').toBeHidden();
    });
});
