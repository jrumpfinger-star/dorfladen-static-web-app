// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Bestellungen aus dem Konto heraus stornieren
 * Spec: specs/bestellung-aendern/spec.md
 *
 * Aus dem Laden: „Ich möchte die Bestellungen auch bearbeiten können,
 * z. B. stornieren."
 *
 * Die Kontoseite zeigte Bestellungen bis dahin nur an — ansehen, mehr
 * nicht. Wer absagen wollte, musste den Weg über die Bestellstatus-Seite
 * finden, und dafür die Bestellnummer zur Hand haben.
 *
 * Der heikle Punkt ist nicht der Knopf, sondern **wann** er dasteht:
 * Der Server lässt eine Stornierung nur zu, solange die Küche noch nicht
 * bestätigt hat. Ein Knopf an einer bestätigten Bestellung wäre ein
 * leeres Versprechen — er würde in eine Fehlermeldung führen.
 */

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';

/** Drei Bestellungen: neu (stornierbar), bestätigt, bereits storniert. */
function bestellungen() {
  return [
    { id: 'id-neu', bestellnummer: 'ML-1', gericht: 'Dampfnudeln mit Vanillesoße',
      datum: '2026-09-29', menge: 1, preis: 7.8, status: 0, mitnehmen: false,
      verlauf: [{ who: 'kunde', text: 'Geht auch ohne Soße?' },
                { who: 'dorfladen', text: 'Ja, kein Problem.' }] },
    { id: 'id-ok', bestellnummer: 'ML-2', gericht: 'Fleischpflanzerl',
      datum: '2026-09-30', menge: 2, preis: 8.8, status: 1, mitnehmen: false,
      verlauf: [] },
    { id: 'id-storno', bestellnummer: 'ML-3', gericht: 'Schnitzel',
      datum: '2026-10-01', menge: 1, preis: 8.8, status: 2, mitnehmen: false,
      storno_grund: 'Kundengrund: Termin verschoben', verlauf: [] },
  ];
}

async function mockApi(page, opts = {}) {
  const gesendet = [];
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const json = (o, status = 200) => route.fulfill({
      status, contentType: 'application/json', body: JSON.stringify(o),
    });
    if (req.method() === 'PATCH') {
      gesendet.push({ url: req.url(), body: req.postDataJSON() });
      if (opts.stornoFehler) {
        return json({ success: false,
          error: 'Stornierung nicht mehr möglich – die Bestellung wurde bereits bestätigt' }, 400);
      }
      return json({ success: true });
    }
    return json({ success: true, orders: bestellungen() });
  });
  return gesendet;
}

async function angemeldet(page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('dl_shop_token', 'zeichen-xyz');
      localStorage.setItem('dl_shop_user',
        JSON.stringify({ email: 'anna@example.com', vorname: 'Anna', nachname: 'Beispiel' }));
    } catch (e) { }
  });
}

const seite = () => `${BASE}/mein-konto.html`;

test.describe('Meine Bestellungen: stornieren', () => {
  test.use({ serviceWorkers: 'block' });

  test('TC-BA-01: Nur die offene Bestellung trägt einen Storno-Knopf',
    async ({ page }) => {
      /* Der Kern: Der Server weist eine Stornierung ab, sobald die Küche
         bestätigt hat. Ein Knopf dort wäre ein leeres Versprechen. */
      await angemeldet(page);
      await mockApi(page);
      await page.goto(seite());
      await page.waitForTimeout(1200);

      await expect(page.locator('.mk-best')).toHaveCount(3);
      const knoepfe = page.locator('[data-storno]');
      await expect(knoepfe, 'nicht genau ein Storno-Knopf').toHaveCount(1);
      await expect(knoepfe.first()).toHaveAttribute('data-storno', 'id-neu');
    });

  test('TC-BA-02: Jede Bestellung führt zu ihren Details',
    async ({ page }) => {
      await angemeldet(page);
      await mockApi(page);
      await page.goto(seite());
      await page.waitForTimeout(1200);

      const links = page.locator('.mk-akt a');
      await expect(links).toHaveCount(3);
      await expect(links.first()).toHaveAttribute('href', '/bestellstatus?nr=ML-1');
    });

  test('TC-BA-03: Ohne Grund wird nicht storniert', async ({ page }) => {
    /* Die Küche plant nach Bestellungen ein. Eine Absage ohne Wort
       lässt sie rätseln — deshalb ist der Grund Pflicht. */
    await angemeldet(page);
    const gesendet = await mockApi(page);
    await page.goto(seite());
    await page.waitForTimeout(1200);

    await page.locator('[data-storno]').click();
    await expect(page.locator('#mk-storno-ov')).toBeVisible();
    await expect(page.locator('#mk-storno-ja'), 'ohne Grund schon absendbar')
      .toBeDisabled();

    await page.fill('#mk-storno-grund', '   ');
    await expect(page.locator('#mk-storno-ja'), 'Leerzeichen genügen')
      .toBeDisabled();

    expect(gesendet.length, 'ohne Grund gesendet').toBe(0);
  });

  test('TC-BA-04: Mit Grund geht genau ein PATCH raus', async ({ page }) => {
    await angemeldet(page);
    const gesendet = await mockApi(page);
    await page.goto(seite());
    await page.waitForTimeout(1200);

    await page.locator('[data-storno]').click();
    await page.fill('#mk-storno-grund', 'Termin verschoben');
    await page.click('#mk-storno-ja');
    await page.waitForTimeout(900);

    expect(gesendet.length, 'nicht genau ein Aufruf').toBe(1);
    const a = gesendet[0];
    expect(a.url, 'falsche Bestellung getroffen').toContain('id-neu');
    expect(a.body.status, 'falscher Zielstatus').toBe(2);
    expect(a.body.kunde_storno, 'nicht als Kundenstorno gekennzeichnet').toBe(true);
    expect(a.body.storno_grund).toContain('Termin verschoben');
    expect(a.body.storno_grund, 'der Grund ist nicht als Kundengrund erkennbar')
      .toContain('Kundengrund');
  });

  test('TC-BA-05: „Behalten" storniert nichts', async ({ page }) => {
    await angemeldet(page);
    const gesendet = await mockApi(page);
    await page.goto(seite());
    await page.waitForTimeout(1200);

    await page.locator('[data-storno]').click();
    await page.fill('#mk-storno-grund', 'doch nicht');
    await page.click('#mk-storno-nein');
    await page.waitForTimeout(500);

    await expect(page.locator('#mk-storno-ov')).toBeHidden();
    expect(gesendet.length, 'trotz Abbruch storniert').toBe(0);
  });

  test('TC-BA-06: Weist der Server ab, steht der Grund da',
    async ({ page }) => {
      /* Der Fall, der im Laden wirklich vorkommt: Die Küche bestätigt
         in derselben Minute, in der die Kundin storniert. Dann muss sie
         erfahren, warum es nicht ging — und die Bestellung bleibt. */
      await angemeldet(page);
      await mockApi(page, { stornoFehler: true });
      await page.goto(seite());
      await page.waitForTimeout(1200);

      await page.locator('[data-storno]').click();
      await page.fill('#mk-storno-grund', 'Termin verschoben');
      await page.click('#mk-storno-ja');
      await page.waitForTimeout(900);

      await expect(page.locator('#mk-storno-fehler')).toBeVisible();
      await expect(page.locator('#mk-storno-fehler')).toContainText('bereits bestätigt');
      await expect(page.locator('#mk-storno-ja'), 'kein zweiter Versuch möglich')
        .toBeEnabled();
    });

  test('TC-BA-07: Die Knöpfe sind mit dem Finger zu treffen',
    async ({ page }) => {
      /* 40 px ist die Untergrenze, unter der Treffer zur Glückssache
         werden — im Laden bedient auch, wer nicht gut sieht. */
      await angemeldet(page);
      await mockApi(page);
      await page.goto(seite());
      await page.waitForTimeout(1200);

      for (const w of ['[data-storno]', '.mk-akt a']) {
        const k = page.locator(w).first();
        const kasten = await k.boundingBox();
        expect(kasten && kasten.height, `${w} ist nur ${kasten && kasten.height} px hoch`)
          .toBeGreaterThanOrEqual(40);
      }
    });

  test('TC-BA-08: Escape schließt die Rückfrage', async ({ page }) => {
    await angemeldet(page);
    const gesendet = await mockApi(page);
    await page.goto(seite());
    await page.waitForTimeout(1200);

    await page.locator('[data-storno]').click();
    await expect(page.locator('#mk-storno-ov')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    await expect(page.locator('#mk-storno-ov')).toBeHidden();
    expect(gesendet.length).toBe(0);
  });
});

test.describe('Meine Bestellungen: Nachrichten und Storno-Grund', () => {
  test.use({ serviceWorkers: 'block' });

  test('TC-BA-09: Der eigene Storno-Grund steht da', async ({ page }) => {
    /* Aus dem Laden: „Wenn eine Bestellung storniert wird vom Kunden,
       sieht man den Grund nicht." Er wurde beim Stornieren VERLANGT —
       ihn dann nicht mehr zu zeigen ist schwer erklärbar.
       Der Grund ging bis dahin verloren: gespeichert, aber von
       `_serialize` nie zurückgegeben. (Spec storno-grund-sichtbar) */
    await angemeldet(page);
    await mockApi(page);
    await page.goto(seite());
    await page.waitForTimeout(1200);

    const karte = page.locator('.mk-best', { hasText: 'Schnitzel' });
    await expect(karte).toContainText('Termin verschoben');
  });

  test('TC-BA-10: Jede Bestellung hat einen Nachrichtenfaden',
    async ({ page }) => {
      await angemeldet(page);
      await mockApi(page);
      await page.goto(seite());
      await page.waitForTimeout(1200);

      await expect(page.locator('[data-chat]')).toHaveCount(3);
      await expect(page.locator('[data-chat="id-neu"]'),
        'die Anzahl der Nachrichten fehlt').toContainText('(2)');
    });

  test('TC-BA-11: Der Faden klappt auf und zeigt beide Seiten',
    async ({ page }) => {
      await angemeldet(page);
      await mockApi(page);
      await page.goto(seite());
      await page.waitForTimeout(1200);

      const faden = page.locator('#chat-id-neu');
      await expect(faden).toBeHidden();
      await page.locator('[data-chat="id-neu"]').click();
      await expect(faden).toBeVisible();

      await expect(faden.locator('.mk-msg')).toHaveCount(2);
      await expect(faden.locator('.von-mir')).toContainText('ohne Soße');
      await expect(faden.locator('.von-laden')).toContainText('kein Problem');
    });

  test('TC-BA-12: Eine leere Nachricht geht nicht raus', async ({ page }) => {
    await angemeldet(page);
    const gesendet = await mockApi(page);
    await page.goto(seite());
    await page.waitForTimeout(1200);

    await page.locator('[data-chat="id-neu"]').click();
    const senden = page.locator('[data-senden="id-neu"]');
    await expect(senden, 'ohne Text schon absendbar').toBeDisabled();

    await page.fill('[data-eingabe="id-neu"]', '   ');
    await expect(senden, 'Leerzeichen genügen').toBeDisabled();
    expect(gesendet.length).toBe(0);
  });

  test('TC-BA-13: Mit Text geht genau ein PATCH raus', async ({ page }) => {
    await angemeldet(page);
    const gesendet = await mockApi(page);
    await page.goto(seite());
    await page.waitForTimeout(1200);

    await page.locator('[data-chat="id-neu"]').click();
    await page.fill('[data-eingabe="id-neu"]', 'Bitte ohne Zwiebeln');
    await page.locator('[data-senden="id-neu"]').click();
    await page.waitForTimeout(900);

    expect(gesendet.length, 'nicht genau ein Aufruf').toBe(1);
    expect(gesendet[0].url).toContain('id-neu');
    expect(gesendet[0].body.kunde_kommentar).toBe('Bitte ohne Zwiebeln');
    expect(gesendet[0].body.status,
      'eine Nachricht darf den Status nicht anfassen').toBeUndefined();
  });

  test('TC-BA-14: Nach dem Senden bleibt der Faden offen',
    async ({ page }) => {
      /* Die Liste wird danach neu aufgebaut. Klappte der Faden dabei zu,
         stünde die Kundin vor ihrer eigenen Nachricht — und wüsste
         nicht, ob sie angekommen ist. */
      await angemeldet(page);
      await mockApi(page);
      await page.goto(seite());
      await page.waitForTimeout(1200);

      await page.locator('[data-chat="id-neu"]').click();
      await page.fill('[data-eingabe="id-neu"]', 'Bitte ohne Zwiebeln');
      await page.locator('[data-senden="id-neu"]').click();
      await page.waitForTimeout(1200);

      await expect(page.locator('#chat-id-neu'),
        'der Faden ist nach dem Senden zugeklappt').toBeVisible();
      await expect(page.locator('[data-eingabe="id-neu"]'),
        'der gesendete Text steht noch im Feld').toHaveValue('');
    });

  test('TC-BA-15: Ohne Nachrichten steht ein Satz da, nicht nichts',
    async ({ page }) => {
      await angemeldet(page);
      await mockApi(page);
      await page.goto(seite());
      await page.waitForTimeout(1200);

      await page.locator('[data-chat="id-ok"]').click();
      await expect(page.locator('#chat-id-ok .mk-chat-leer'))
        .toContainText('Noch keine Nachrichten');
    });

  test('TC-BA-16: Abmelden ist mit dem Finger zu treffen',
    async ({ page }) => {
      /* Gemessen waren es 24 px. Wer sich auf einem geteilten Gerät
         wieder abmelden will, soll den Knopf nicht suchen müssen. */
      await angemeldet(page);
      await mockApi(page);
      await page.goto(seite());
      await page.waitForTimeout(1200);

      const kasten = await page.locator('#mk-abmelden').boundingBox();
      expect(kasten && kasten.height,
        `Abmelden ist nur ${kasten && kasten.height} px hoch`)
        .toBeGreaterThanOrEqual(40);
    });
});
