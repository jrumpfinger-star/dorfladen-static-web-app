// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Profil bearbeiten – eigene Angaben ändern
 * Spec: specs/konto-profil-bearbeiten/spec.md
 *
 * Aus dem Laden: „Es muss auch hier möglich sein, sein Profil (Konto) zu
 * bearbeiten und zu ändern, wie es Standard ist in Online-Anwendungen."
 * Bisher gab es unter „Mein Konto" nur einen einzigen Knopf: Abmelden.
 *
 * Name und Telefon ändern sich ohne Hürde. E-Mail und Passwort gelten als
 * sicherheitsrelevant und verlangen zusätzlich das aktuelle Passwort -
 * dieselbe Regel steckt serverseitig in api/auth-profile (siehe
 * tests/test_konto_profil.py).
 */

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const seite = () => `${BASE}/mein-konto.html`;

const KUNDE = { email: 'anna@example.com', vorname: 'Anna', nachname: 'Beispiel', telefon: '' };

async function mockApi(page, opts = {}) {
  const gesendet = { profilPatch: [] };
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = req.url();
    const json = (o, status = 200) => route.fulfill({
      status, contentType: 'application/json', body: JSON.stringify(o),
    });

    if (url.includes('/api/auth-profile') && req.method() === 'GET') {
      return json({ success: true, profil: { ...KUNDE, email_verifiziert: true, hat_bankdaten: false } });
    }
    if (url.includes('/api/auth-profile') && req.method() === 'PATCH') {
      const body = req.postDataJSON();
      gesendet.profilPatch.push(body);
      if (opts.serverFehler) return json({ success: false, error: opts.serverFehler }, opts.serverFehlerCode || 400);
      const neu = {
        id: 'kunde-1',
        vorname: body.vorname ?? KUNDE.vorname,
        nachname: body.nachname ?? KUNDE.nachname,
        email: body.email ?? KUNDE.email,
      };
      return json({
        success: true, token: 'neues-zeichen', kunde: neu,
        email_bestaetigung_gesendet: !!body.email && body.email !== KUNDE.email,
      });
    }
    if (url.includes('/api/lunch-order')) return json({ success: true, orders: [] });
    if (url.includes('/api/shop-order')) return json({ success: true, orders: [] });
    return json({ success: true });
  });
  return gesendet;
}

async function angemeldetOeffnen(page) {
  await page.goto(seite());
  await page.evaluate((k) => {
    try {
      localStorage.setItem('dl_shop_token', 'zeichen-xyz');
      localStorage.setItem('dl_shop_user', JSON.stringify(k));
    } catch (e) {}
  }, KUNDE);
  await page.reload();
  await page.waitForTimeout(1000);
}

test.use({ serviceWorkers: 'block' });

test.describe('Profil bearbeiten', () => {

  test('TC-PB-01: „Profil" führt zum Bearbeiten-Formular, vorbelegt', async ({ page }) => {
    await mockApi(page);
    await angemeldetOeffnen(page);

    await page.click('#mk-zu-profil');
    await expect(page.locator('#mk-profil')).toBeVisible();
    await expect(page.locator('#mk-angemeldet')).toBeHidden();

    await expect(page.locator('#pf-vorname')).toHaveValue('Anna');
    await expect(page.locator('#pf-nachname')).toHaveValue('Beispiel');
    await expect(page.locator('#pf-email')).toHaveValue('anna@example.com');
  });

  test('TC-PB-02: Abbrechen kehrt ohne Speichern zurück', async ({ page }) => {
    const g = await mockApi(page);
    await angemeldetOeffnen(page);
    await page.click('#mk-zu-profil');
    await page.fill('#pf-vorname', 'Geändert');
    await page.click('#pf-abbrechen');

    await expect(page.locator('#mk-angemeldet')).toBeVisible();
    expect(g.profilPatch.length, 'Es wurde trotz Abbrechen etwas gesendet').toBe(0);
  });

  test('TC-PB-03: Name und Telefon ändern sich ohne Passwort', async ({ page }) => {
    const g = await mockApi(page);
    await angemeldetOeffnen(page);
    await page.click('#mk-zu-profil');
    await page.fill('#pf-vorname', 'Anna-Maria');
    await page.fill('#pf-telefon', '08082 123456');
    await page.click('#pf-speichern');

    await expect(page.locator('#pf-ok')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#mk-name')).toContainText('Anna-Maria');
    expect(g.profilPatch[0].aktuelles_passwort, 'Passwort wurde ungefragt mitgeschickt')
      .toBeUndefined();
  });

  test('TC-PB-04: E-Mail ändern ohne aktuelles Passwort wird verständlich gemeldet', async ({ page }) => {
    const g = await mockApi(page);
    await angemeldetOeffnen(page);
    await page.click('#mk-zu-profil');
    await page.fill('#pf-email', 'neu@example.com');
    await page.click('#pf-speichern');

    await expect(page.locator('#pf-fehler'), 'Die Fehlermeldung bleibt unsichtbar')
      .toBeVisible({ timeout: 5000 });
    await expect(page.locator('#pf-fehler')).toContainText('aktuelles Passwort');
    expect(g.profilPatch.length, 'Es wurde trotz fehlendem Passwort gesendet').toBe(0);
  });

  test('TC-PB-05: E-Mail ändern mit Passwort gelingt und aktualisiert die Kopfzeile', async ({ page }) => {
    const g = await mockApi(page);
    await angemeldetOeffnen(page);
    await page.click('#mk-zu-profil');
    await page.fill('#pf-email', 'neu@example.com');
    await page.fill('#pf-akt-pw', 'geheim123');
    await page.click('#pf-speichern');

    await expect(page.locator('#pf-ok'), 'Kein Erfolg gemeldet').toBeVisible({ timeout: 5000 });
    await expect(page.locator('#pf-ok')).toContainText('Bestätigungslink');
    await expect(page.locator('#mk-mail')).toHaveText('neu@example.com');
    expect(g.profilPatch[0].email).toBe('neu@example.com');
    expect(g.profilPatch[0].aktuelles_passwort).toBe('geheim123');

    const zeichen = await page.evaluate(() => localStorage.getItem('dl_shop_token'));
    expect(zeichen, 'Das neue Anmeldezeichen wurde nicht übernommen').toBe('neues-zeichen');
  });

  test('TC-PB-06: Neues Passwort ohne Wiederholung wird abgelehnt', async ({ page }) => {
    const g = await mockApi(page);
    await angemeldetOeffnen(page);
    await page.click('#mk-zu-profil');
    await page.fill('#pf-neu-pw', 'neuesPasswort123');
    await page.fill('#pf-neu-pw2', 'andersHerum123');
    await page.fill('#pf-akt-pw', 'geheim123');
    await page.click('#pf-speichern');

    await expect(page.locator('#pf-fehler')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#pf-fehler')).toContainText('stimmen nicht überein');
    expect(g.profilPatch.length).toBe(0);
  });

  test('TC-PB-07: Zu kurzes neues Passwort wird abgelehnt', async ({ page }) => {
    await mockApi(page);
    await angemeldetOeffnen(page);
    await page.click('#mk-zu-profil');
    await page.fill('#pf-neu-pw', 'kurz');
    await page.fill('#pf-neu-pw2', 'kurz');
    await page.fill('#pf-akt-pw', 'geheim123');
    await page.click('#pf-speichern');

    await expect(page.locator('#pf-fehler')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#pf-fehler')).toContainText('8 Zeichen');
  });

  test('TC-PB-08: Ein vom Server abgelehntes Passwort wird sichtbar gemeldet', async ({ page }) => {
    await mockApi(page, { serverFehler: 'Das aktuelle Passwort stimmt nicht.', serverFehlerCode: 401 });
    await angemeldetOeffnen(page);
    await page.click('#mk-zu-profil');
    await page.fill('#pf-neu-pw', 'neuesPasswort123');
    await page.fill('#pf-neu-pw2', 'neuesPasswort123');
    await page.fill('#pf-akt-pw', 'falsch');
    await page.click('#pf-speichern');

    await expect(page.locator('#pf-fehler'), 'Die Serverfehlermeldung bleibt unsichtbar')
      .toBeVisible({ timeout: 5000 });
    await expect(page.locator('#pf-fehler')).toContainText('stimmt nicht');
  });

  test('TC-PB-09: Leerer Vorname wird ohne Serveranfrage abgelehnt', async ({ page }) => {
    const g = await mockApi(page);
    await angemeldetOeffnen(page);
    await page.click('#mk-zu-profil');
    await page.fill('#pf-vorname', '   ');
    await page.click('#pf-speichern');

    await expect(page.locator('#pf-fehler')).toBeVisible({ timeout: 5000 });
    expect(g.profilPatch.length).toBe(0);
  });
});
