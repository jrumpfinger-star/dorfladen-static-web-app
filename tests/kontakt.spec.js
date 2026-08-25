/**
 * Kundenkontakt-Chat – Playwright E2E (Homepage + Kiosk)
 *
 * Prueft die Feature-Verdrahtung, wenn das Flag kiosk_kontakt aktiv ist:
 *   - Homepage: Chat-Float ersetzt den WhatsApp-Float, Overlay oeffnet,
 *     1:1-"Frage"-Links oeffnen den Chat, WhatsApp-Gruppe bleibt WhatsApp,
 *     Deep-Link ?chat=1 oeffnet den Chat automatisch.
 *   - Kiosk: Kontakt-Tab sichtbar und Panel schaltbar.
 *
 * Ist das Flag aus, werden die Tests uebersprungen (Feature ist dann versteckt).
 *
 * Hinweis: Die vollstaendige Startseite laesst den Headless-Renderer in dieser
 * CI-/Agent-Umgebung abstuerzen (betrifft auch die Produktionsseite, unabhaengig
 * von diesem Feature). Der self-contained Chat-Client js/kontakt.js macht seinen
 * eigenen /api/cms-config-Fetch und braucht die uebrigen Homepage-Skripte nicht,
 * daher werden Bilder und die schweren Skripte fuer die Homepage-Tests geblockt,
 * um den Renderer stabil zu halten.
 *
 *   npx playwright test tests/kontakt.spec.js
 */
const { test, expect } = require('@playwright/test');

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';

async function flagOn(page) {
  const res = await page.request.get(`${BASE}/api/cms-config?nc=${Date.now()}`);
  if (!res.ok()) return false;
  const j = await res.json();
  let ff = j && j.data && j.data.feature_flags;
  if (typeof ff === 'string') { try { ff = JSON.parse(ff); } catch (e) { ff = {}; } }
  return !!(ff && ff.kiosk_kontakt === true);
}

// Bilder + schwere/instabile Skripte blocken; js/kontakt.js laeuft eigenstaendig.
async function blockHeavy(page) {
  await page.route('**/*', (route) => {
    const u = route.request().url();
    const t = route.request().resourceType();
    if (t === 'image' || t === 'media' || t === 'font') return route.abort();
    if (/roterpunkt-live\.js|\/js\/app\.js|\/js\/mobile\.js|\/js\/pwa\.js|hilfe-popup\.js/.test(u)) return route.abort();
    return route.continue();
  });
}

test.describe('Kundenkontakt – Homepage', () => {
  test('Chat-Float ersetzt WhatsApp-Float und Overlay oeffnet', async ({ page }) => {
    test.skip(!(await flagOn(page)), 'Feature-Flag kiosk_kontakt ist aus');
    await blockHeavy(page);
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#hp-chat-float')).toBeVisible({ timeout: 12000 });
    await expect(page.locator('#hp-wa-float')).toBeHidden();

    await page.locator('#hp-chat-float').click();
    await expect(page.locator('#hp-chat-ov')).toBeVisible();
    await expect(page.locator('#hp-chat-input')).toBeVisible();
    await expect(page.locator('#hp-chat-send')).toBeVisible();
  });

  test('1:1-Frage-Link oeffnet Chat, WhatsApp-Gruppe bleibt WhatsApp', async ({ page }) => {
    test.skip(!(await flagOn(page)), 'Feature-Flag kiosk_kontakt ist aus');
    await blockHeavy(page);
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#hp-chat-float')).toBeVisible({ timeout: 12000 });

    // Footer-WhatsApp-Icon (1:1 "ich habe eine Frage") -> Chat
    await page.locator('a[aria-label="WhatsApp"][href*="wa.me"]').first().click();
    await expect(page.locator('#hp-chat-ov')).toBeVisible();

    // Gruppen-Link bleibt ein echter wa.me-Link (target _blank)
    await expect(page.locator('a[href*="wa.me"][href*="Gruppe"]').first()).toHaveAttribute('target', '_blank');
  });

  test('Deep-Link ?chat=1 oeffnet Chat automatisch', async ({ page }) => {
    test.skip(!(await flagOn(page)), 'Feature-Flag kiosk_kontakt ist aus');
    await blockHeavy(page);
    await page.goto(`${BASE}/?chat=1`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#hp-chat-ov')).toBeVisible({ timeout: 12000 });
  });
});

test.describe('Kundenkontakt – Kiosk', () => {
  test('Kontakt-Tab sichtbar und schaltbar', async ({ page }) => {
    test.skip(!(await flagOn(page)), 'Feature-Flag kiosk_kontakt ist aus');
    await page.route('**/*', (route) => {
      const t = route.request().resourceType();
      if (t === 'image' || t === 'media' || t === 'font') return route.abort();
      return route.continue();
    });
    await page.goto(`${BASE}/kiosk`, { waitUntil: 'domcontentloaded' });

    const tab = page.locator('.k-tab[data-tab="kontakt"]');
    await expect(tab).toBeVisible({ timeout: 12000 });

    // Eventuelles Start-Modal wegklicken, damit der Klick nicht abgefangen wird.
    if (await page.locator('[role="dialog"][aria-modal="true"]').count() > 0) {
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(300);
    }

    await tab.click();
    await expect(page.locator('#panel-kontakt')).toHaveClass(/active/);
  });
});
