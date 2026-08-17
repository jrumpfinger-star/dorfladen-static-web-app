const { test, expect } = require('@playwright/test');

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const HELP_URL = `${BASE}/help-workflows.html`;

const chapters = [
  ['start', 'Überblick'],
  ['mittag', 'Mittagstisch'],
  ['shop', 'Online-Shop'],
  ['metzger', 'Metzger'],
  ['kunden', 'Stammkunden'],
  ['social', 'Social Media'],
  ['kalender', 'Kalender'],
];

test.describe('Kiosk-Handbuch', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(HELP_URL);
  });

  test('TC-F1/F2: professionelle Sprache und belegte Fachbegriffe', async ({ page }) => {
    const text = await page.locator('body').textContent();

    for (const required of [
      'Neue Telefonbestellung', 'Küchenliste drucken',
      'Zu erledigen', 'Heute abholen', 'Überfällig', 'Historie',
      'Sammelbestellung', 'Alle abhaken',
      'Neuer Kunde', 'Deaktivieren',
      'Auf WhatsApp teilen', 'Tagesinfo veröffentlichen', 'Parken',
      'Nur diesen Tag', 'Ganze Serie löschen',
    ]) {
      expect(text, `Begriff fehlt: ${required}`).toContain(required);
    }

    for (const rejected of [
      'Bums', 'Apparillo', 'Todes-Stempel', 'Hämmern Sie', 'Werbeding',
      'kinderleicht', 'Fingerflackern', 'Neu / Bestellen', 'Auswiegen & Kasse',
      'Pfandkonto', 'Guthabenkonto', 'Waagen-Etikett', 'Realgewicht',
    ]) {
      expect(text, `Ungeeigneter oder falscher Begriff vorhanden: ${rejected}`).not.toContain(rejected);
    }
  });

  test('TC-F2/F3: jedes Fachkapitel enthält mehrere Handlungsszenarien', async ({ page }) => {
    for (const [id] of chapters) {
      await page.locator(`#tab-${id}`).click();
      const panel = page.locator(`#sec-${id}`);
      await expect(panel).toBeVisible();
      expect(await panel.locator('h4', { hasText: 'Szenario:' }).count(), `${id} hat zu wenige Szenarien`).toBeGreaterThanOrEqual(2);
    }

    const social = page.locator('#sec-social');
    await page.locator('#tab-social').click();
    await expect(social).toContainText('Tagesbeitrag für frische Ware');
    await expect(social).toContainText('Fehler vor der Veröffentlichung korrigieren');
    await expect(social).toContainText('Beitrag vorbereiten und später veröffentlichen');
    await expect(social).toContainText('Neues Produkt im Katalog anlegen');
  });

  test('TC-F4-01: sieben Tabs schalten genau ein Kapitel sichtbar', async ({ page }) => {
    await expect(page.locator('#nav [role="tab"]')).toHaveCount(7);
    await expect(page.locator('#tab-start')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.section:not([hidden])')).toHaveCount(1);

    for (const [id, label] of chapters) {
      const tab = page.locator(`#tab-${id}`);
      await expect(tab).toHaveText(label);
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator(`#sec-${id}`)).toBeVisible();
      await expect(page.locator('.section:not([hidden])')).toHaveCount(1);
      await expect(page.locator('#nav [role="tab"][aria-selected="true"]')).toHaveCount(1);
    }
  });

  test('TC-F4-02: Pfeiltasten bedienen die Kapitel-Navigation', async ({ page }) => {
    await page.locator('#tab-start').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#tab-mittag')).toBeFocused();
    await expect(page.locator('#tab-mittag')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#sec-mittag')).toBeVisible();

    await page.keyboard.press('End');
    await expect(page.locator('#tab-kalender')).toBeFocused();
    await expect(page.locator('#sec-kalender')).toBeVisible();

    await page.keyboard.press('Home');
    await expect(page.locator('#tab-start')).toBeFocused();
    await expect(page.locator('#sec-start')).toBeVisible();
  });

  test('TC-F4-03: Layout hat keinen horizontalen Dokumentüberlauf', async ({ page }) => {
    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      navScrollWidth: document.querySelector('#nav').scrollWidth,
      navClientWidth: document.querySelector('#nav').clientWidth,
    }));

    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
    expect(dimensions.navScrollWidth).toBeGreaterThanOrEqual(dimensions.navClientWidth);
    await expect(page.locator('#nav')).toBeVisible();
    await expect(page.locator('#tab-kalender')).toBeAttached();
  });
});
