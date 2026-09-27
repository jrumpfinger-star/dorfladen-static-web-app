// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Mein Konto – eigenständige Seite für Anmeldung und eigene Bestellungen
 * Spec: specs/konto-ohne-bankdaten/spec.md
 *
 * Aus dem Laden, in dieser Reihenfolge gemeldet:
 *   1. „Die Kachel-Logik soll bestehen bleiben, da wir viele Ad-hoc-User
 *      haben. Für die ist ein Konto zu viel Aufwand."
 *   2. „Es sollte die Möglichkeit geben, ohne den Bestellshop das Konto
 *      anzulegen, aber IBAN ist dann kein Pflichtfeld."
 *   3. „Dies muss auch funktionieren, wenn Bestellshop nicht aktiv ist."
 *
 * Punkt 3 ist der Grund, warum diese Seite überhaupt existiert: Die
 * Registrierung lag in shop.html — und `orders` steht live auf false.
 * Der Link dorthin ist ausgeblendet, die Kontoanlage war also für
 * Kundinnen unerreichbar.
 *
 * Alle API-Aufrufe sind abgefangen; es entsteht kein echtes Konto.
 */

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';

/** Fängt die Aufrufe ab und merkt sich, was gesendet wurde. */
async function mockApi(page, opts = {}) {
  const gesendet = { register: [], login: [], lunch: [] };
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = req.url();
    const json = (o, status = 200) => route.fulfill({
      status, contentType: 'application/json', body: JSON.stringify(o),
    });

    if (url.includes('/api/auth-register')) {
      gesendet.register.push(req.postDataJSON());
      return json(opts.registerFehler
        ? { success: false, errors: ['Diese E-Mail-Adresse ist bereits registriert.'] }
        : { success: true });
    }
    if (url.includes('/api/auth-login')) {
      gesendet.login.push(req.postDataJSON());
      if (opts.loginFehler) return json({ success: false, error: 'E-Mail oder Passwort stimmt nicht.' });
      return json({
        success: true, token: 'zeichen-xyz',
        kunde: { email: 'anna@example.com', vorname: 'Anna', nachname: 'Beispiel' },
      });
    }
    if (url.includes('/api/lunch-order')) {
      gesendet.lunch.push({ url, headers: req.headers() });
      return json({
        success: true,
        orders: opts.keineBestellungen ? [] : [{
          bestellnummer: 'ML-0042', gericht: 'Dampfnudeln mit Vanillesoße',
          datum: '2026-09-29', menge: 1, preis: 7.8, status: 1, mitnehmen: false,
        }],
      });
    }
    if (url.includes('/api/cms-config')) {
      // Der Bestellshop ist AUS - genau der gemeldete Fall.
      return json({ success: true, data: { feature_flags: { orders: false, mittagstisch: true } } });
    }
    return json({ success: true });
  });
  return gesendet;
}

const seite = () => `${BASE}/mein-konto.html`;

/* Seit „nach dem Anmelden zur Startseite" (Spec anmelden-vor-registrieren)
   fuehrt der Anmeldevorgang von dieser Seite weg. Wer die Kontoseite
   angemeldet betrachten will - etwa ueber den Link „Mein Konto" -, bringt
   sein Anmeldezeichen mit. Genau diesen Zustand stellen die Tests unten
   her; dass das Anmelden selbst zur Startseite fuehrt, prueft TC-AR-03. */
async function angemeldetOeffnen(page) {
  await page.goto(seite());
  /* Bewusst nicht per addInitScript: Das liefe bei JEDEM Seitenaufruf
     erneut - auch auf der Startseite, zu der das Abmelden springt. Das
     Zeichen waere dort sofort wieder da und TC-MK-10 haette einen Fehler
     gemeldet, den es nicht gibt. */
  await page.evaluate(() => {
    try {
      localStorage.setItem('dl_shop_token', 'zeichen-xyz');
      localStorage.setItem('dl_shop_user', JSON.stringify({
        email: 'anna@example.com', vorname: 'Anna', nachname: 'Beispiel',
      }));
    } catch (e) {}
  });
  await page.reload();
  await page.waitForTimeout(1200);
}

test.describe('Mein Konto – ohne aktiven Bestellshop', () => {
  test.use({ serviceWorkers: 'block' });

  test('TC-MK-01: Die Seite ist erreichbar, auch wenn der Shop aus ist',
    async ({ page }) => {
      /* Der Kern der Meldung: Der Shop-Link ist bei orders=false
         ausgeblendet. Diese Seite hängt nicht daran. */
      await mockApi(page);
      await page.goto(seite());
      await expect(page.locator('#mk-anmelden')).toBeVisible();
      await expect(page.locator('#mk-login-knopf')).toBeVisible();
    });

  test('TC-MK-02: Das Konto entsteht ohne IBAN und ohne Adresse',
    async ({ page }) => {
      const g = await mockApi(page);
      await page.goto(seite());
      await page.click('#mk-zu-konto');

      await page.fill('#mk-vorname', 'Anna');
      await page.fill('#mk-nachname', 'Beispiel');
      await page.fill('#mk-neu-mail', 'anna@example.com');
      await page.fill('#mk-neu-pw', 'geheim123');
      await page.fill('#mk-neu-pw2', 'geheim123');
      await page.check('#mk-dsgvo');
      await page.check('#mk-agb');
      await page.click('#mk-neu-knopf');
      await page.waitForTimeout(900);

      expect(g.register.length, 'nichts gesendet').toBe(1);
      const b = g.register[0];
      expect(b.ohne_bankdaten, 'der Schalter fehlt').toBe(true);
      expect(b.iban || '', 'eine IBAN ging mit').toBe('');
      expect(b.sepa_zustimmung || false, 'ein SEPA-Mandat ging mit').toBe(false);
      expect(b.vorname).toBe('Anna');
      expect(b.dsgvo_zustimmung).toBe(true);
    });

  test('TC-MK-03: Auf dem Formular steht kein einziges Bankfeld',
    async ({ page }) => {
      /* Gegenprobe zu TC-MK-02 an der Oberfläche: Was nicht da ist,
         kann auch nicht ausgefüllt werden. */
      await mockApi(page);
      await page.goto(seite());
      await page.click('#mk-zu-konto');

      for (const feld of ['iban', 'kontoinhaber', 'sepa', 'strasse', 'plz', 'ort']) {
        await expect(page.locator(`#mk-neu input[id*="${feld}"]`),
          `Feld "${feld}" steht im schlanken Formular`).toHaveCount(0);
      }
    });

  test('TC-MK-04: Ohne Zustimmung geht nichts raus', async ({ page }) => {
    /* Datenschutz und AGB bleiben Pflicht - der Server weist es ab,
       und der Kunde sieht warum. */
    const g = await mockApi(page, { registerFehler: false });
    await page.route('**/api/auth-register', (route) => route.fulfill({
      status: 400, contentType: 'application/json',
      body: JSON.stringify({ success: false, errors: ['Bitte stimmen Sie der Datenschutzerklärung zu.'] }),
    }));
    await page.goto(seite());
    await page.click('#mk-zu-konto');
    await page.fill('#mk-vorname', 'Anna');
    await page.fill('#mk-nachname', 'Beispiel');
    await page.fill('#mk-neu-mail', 'anna@example.com');
    await page.fill('#mk-neu-pw', 'geheim123');
    await page.fill('#mk-neu-pw2', 'geheim123');
    await page.click('#mk-neu-knopf');
    await page.waitForTimeout(700);
    await expect(page.locator('#mk-neu-fehler')).toContainText('Datenschutz');
  });

  test('TC-MK-05: Zwei verschiedene Passwörter werden bemerkt',
    async ({ page }) => {
      const g = await mockApi(page);
      await page.goto(seite());
      await page.click('#mk-zu-konto');
      await page.fill('#mk-neu-pw', 'geheim123');
      await page.fill('#mk-neu-pw2', 'geheim999');
      await page.click('#mk-neu-knopf');
      await page.waitForTimeout(500);

      await expect(page.locator('#mk-neu-fehler')).toBeVisible();
      expect(g.register.length, 'trotz Abweichung gesendet').toBe(0);
    });

  test('TC-MK-06: Angemeldet stehen die eigenen Bestellungen da',
    async ({ page }) => {
      await mockApi(page);
      await angemeldetOeffnen(page);

      await expect(page.locator('#mk-angemeldet')).toBeVisible();
      await expect(page.locator('#mk-liste')).toContainText('Dampfnudeln');
      await expect(page.locator('#mk-name')).toContainText('Anna');
    });

  test('TC-MK-07: Die Abfrage trägt das Anmeldezeichen, nicht die Adresse',
    async ({ page }) => {
      /* Der Punkt, an dem die Sicherheit hängt: Stünde die Adresse in
         der Adresszeile, könnte jeder eine fremde eintragen.
         (Spec meine-bestellungen-geraete, F3) */
      const g = await mockApi(page);
      await angemeldetOeffnen(page);

      expect(g.lunch.length, 'keine Abfrage gestellt').toBeGreaterThan(0);
      const a = g.lunch[g.lunch.length - 1];
      expect(a.headers['x-shop-token'], 'kein Anmeldezeichen mitgeschickt')
        .toBe('zeichen-xyz');
      expect(a.url, `die Adresse steht offen in: ${a.url}`).not.toContain('email=');
    });

  test('TC-MK-08: Falsches Passwort wird verständlich gemeldet',
    async ({ page }) => {
      await mockApi(page, { loginFehler: true });
      await page.goto(seite());
      await page.fill('#mk-login-mail', 'anna@example.com');
      await page.fill('#mk-login-pw', 'falsch');
      await page.click('#mk-login-knopf');
      await page.waitForTimeout(800);

      await expect(page.locator('#mk-anmelde-fehler')).toBeVisible();
      await expect(page.locator('#mk-angemeldet')).toBeHidden();
    });

  test('TC-MK-09: Ohne Bestellung steht ein Satz da, nicht nichts',
    async ({ page }) => {
      await mockApi(page, { keineBestellungen: true });
      await angemeldetOeffnen(page);
      await expect(page.locator('#mk-liste')).toContainText('keine Bestellung');
    });

  test('TC-MK-10: Abmelden räumt das Anmeldezeichen weg',
    async ({ page }) => {
      await mockApi(page);
      await angemeldetOeffnen(page);
      await page.click('#mk-abmelden');

      /* Das Abmelden fuehrt zur Startseite (Spec
         anmelden-vor-registrieren). Der Speicher gehoert derselben
         Herkunft, laesst sich dort also weiter pruefen - und das ist der
         eigentliche Punkt: Das Zeichen darf nicht liegen bleiben. */
      await page.waitForURL((u) => !/mein-konto/.test(u.pathname), { timeout: 10000 });
      const zeichen = await page.evaluate(() => localStorage.getItem('dl_shop_token'));
      expect(zeichen, 'das Anmeldezeichen liegt noch im Browser').toBeFalsy();
    });

  test('TC-MK-11: Auf keiner Breite wird waagerecht gerollt',
    async ({ page }) => {
      await mockApi(page);
      await page.goto(seite());
      await page.click('#mk-zu-konto');
      await page.waitForTimeout(400);
      const mass = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(mass.scroll, `rollt waagerecht: ${mass.scroll} > ${mass.client}`)
        .toBeLessThanOrEqual(mass.client + 1);
    });
});

test.describe('Shop-Formular: dieselbe Wahl, wenn der Shop läuft', () => {
  test.use({ serviceWorkers: 'block' });

  /* Der Shop ist zurzeit abgeschaltet (orders = false) — deshalb gibt es
     mein-konto.html. Wird er wieder eingeschaltet, soll dort dieselbe
     Wahl stehen. Diese beiden Fälle halten das fest. */

  async function shopOeffnen(page) {
    const gesendet = [];
    await page.route('**/api/**', async (route) => {
      const req = route.request();
      if (req.url().includes('/api/auth-register')) {
        gesendet.push(req.postDataJSON());
      }
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {}, artikel: [], kategorien: [] }),
      });
    });
    await page.goto(`${BASE}/shop.html`);
    /* Das Formular über einen sichtbaren Weg öffnen. Drei Anläufe waren
       nötig, und der Grund steht im Gestaltungsblatt: Unter 768 px
       blendet der Shop `#shop-user-btn` und `#shop-login-banner` mit
       `display:none!important` aus und zeigt stattdessen das Menü. Ein
       Aufruf von `window.showAuth` scheidet aus — die Funktion ist
       gekapselt. */
    const menue = page.locator('#shop-menu-btn');
    if (await menue.isVisible().catch(() => false)) {
      await menue.click();
      await page.click('#shop-menu-account');
    } else {
      await page.click('#shop-user-btn');
    }
    await expect(page.locator('#shop-auth-overlay')).toBeVisible();
    await page.click('.shop-auth-tab[data-tab="register"]');
    await expect(page.locator('#shop-auth-register')).toBeVisible();
    return gesendet;
  }

  test('TC-MK-12: Beim Öffnen sind die Bankfelder bereits ausgeblendet',
    async ({ page }) => {
      /* Der Fehler, den dieser Fall festhält: Die Umschaltung hing nur
         am `change`-Ereignis. Beim Öffnen war „nur ansehen" vorgewählt,
         die Bankfelder standen aber sichtbar da — der Kunde hätte sie
         ausgefüllt, und gesendet worden wären sie trotzdem nicht. */
      await shopOeffnen(page);
      await expect(page.locator('#reg-iban'),
        'die IBAN steht sichtbar da, obwohl „nur ansehen" gewählt ist')
        .toBeHidden();
      await expect(page.locator('#reg-vorname'),
        'der Name ist mit ausgeblendet worden').toBeVisible();
    });

  test('TC-MK-13: Auf „einkaufen" umschalten bringt die Bankfelder zurück',
    async ({ page }) => {
      await shopOeffnen(page);
      await page.check('input[name="reg-zweck"][value="shop"]');
      await page.waitForTimeout(300);
      await expect(page.locator('#reg-iban')).toBeVisible();
      await expect(page.locator('#reg-strasse')).toBeVisible();
    });
});
