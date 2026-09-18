// @ts-check
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

/**
 * Abgeholte Bestellungen bleiben den Tag über sichtbar.
 *
 * Spec: specs/mittagstisch-abgeholt-sichtbar/spec.md (TC-A06 … TC-A09)
 *
 * Aus dem Laden: „Das ist das Problem, abgeholt. … So hat der Kunde die
 * Möglichkeit, weiterhin zu dieser Bestellung mit uns zu chatten."
 *
 * Der Kasten auf der Startseite ist der einzige Weg zurück in den
 * Bestellstatus — und dort liegt der Nachrichtenverlauf. Verschwindet die
 * Bestellung beim Abhaken, ist der Faden weg.
 *
 * Ausführen (lokaler Server aus static-site/ auf 8811):
 *   $env:TEST_URL='http://127.0.0.1:8811'
 *   node node_modules\@playwright\test\cli.js test tests/mittagstisch-abgeholt.spec.js
 */

test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://www.dorfladen-oberornau.de';

const GERAET = 'test-geraet-abgeholt';
const NR = 'MT-TEST-9001';

function heute() {
  const d = new Date();
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)
    + '-' + ('0' + d.getDate()).slice(-2);
}

/** Eine abgeholte Bestellung von heute — genau der gemeldete Fall. */
const ABGEHOLT = {
  id: 'o-1',
  bestellnummer: NR,
  name: 'Testkunde',
  gericht: 'Grillteller mit Pommes und Grillgemüse',
  menge: 2,
  preis: 9.8,
  datum: heute(),
  status: 3,
  mitnehmen: false,
  device_id: GERAET,
  personal_antwort: '',
};

async function startseite(page, orders) {
  await page.addInitScript((g) => {
    try {
      localStorage.setItem('dl_push_device_id', g);
      localStorage.removeItem('bs_email');
    } catch (e) { /* Speicher gesperrt */ }
  }, GERAET);

  await page.route('**/api/lunch-order**', (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, orders, count: orders.length }),
    }));

  await page.route('**/api/**', (route) => {
    if (/lunch-order/.test(route.request().url())) return route.fallback();
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [], orders: [], posts: [], threads: [] }),
    });
  });

  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
}

test.describe('Startseite – abgeholte Bestellung bleibt sichtbar', () => {
  test('TC-A06: der Kasten zeigt die abgeholte Bestellung mit „Abgeholt"',
    async ({ page }) => {
      await startseite(page, [ABGEHOLT]);

      /* Vollansicht und Telefon haben je einen eigenen Behälter
         (`desk-my-orders` / `mob-my-orders`). Geprüft wird der, der auf
         dieser Breite tatsächlich sichtbar ist. */
      const sicht = await page.evaluate(() => {
        const ids = ['desk-my-orders', 'mob-my-orders'];
        for (const id of ids) {
          const el = document.getElementById(id);
          if (el && getComputedStyle(el).display !== 'none' && el.innerHTML.trim()) {
            return { id, text: el.textContent.replace(/\s+/g, ' ').trim() };
          }
        }
        return null;
      });

      expect(sicht, 'Kein sichtbarer Bestellkasten gefunden').not.toBeNull();
      // Der Status muss dastehen – sonst wirkt sie wie noch offen.
      expect(sicht.text).toContain('Abgeholt');
      expect(sicht.text).toContain('Grillteller');
    });

  test('TC-A07: ein Klick öffnet den Bestellstatus mit dieser Nummer',
    async ({ page }) => {
      await startseite(page, [ABGEHOLT]);

      // Nicht wirklich navigieren – nur festhalten, wohin es ginge.
      const ziel = await page.evaluate((nr) => {
        return new Promise((fertig) => {
          window.openMittagPopup = (url) => fertig(url);
          const k = document.querySelector('#desk-my-orders [role="button"]')
            || document.querySelector('#mob-my-orders [role="button"]');
          if (k) k.click();
          else fertig('kein Knopf');
          setTimeout(() => fertig('kein Aufruf'), 2000);
        });
      }, NR);

      expect(ziel).toContain('/bestellstatus');
      expect(ziel).toContain(NR);
    });

  test('TC-A06b: ohne abgeholte Bestellung bleibt der Kasten leer',
    async ({ page }) => {
      await startseite(page, []);
      const sichtbar = await page.evaluate(() =>
        ['desk-my-orders', 'mob-my-orders'].some((id) => {
          const el = document.getElementById(id);
          return el && getComputedStyle(el).display !== 'none' && el.innerHTML.trim();
        }));
      expect(sichtbar).toBe(false);
    });
});

test.describe('Bestellstatus – Nachrichten bleiben offen', () => {
  test('TC-A08: das Nachrichtenfeld hängt nicht am Status', () => {
    /* Der Chat auf bestellstatus.html wird nirgends nach Status
       ausgeblendet. Das ist die Voraussetzung dafür, dass das
       Sichtbarmachen überhaupt etwas nützt. */
    const quelle = fs.readFileSync(
      path.join(__dirname, '..', 'static-site', 'bestellstatus.html'), 'utf8');
    expect(quelle).toContain('id="bs-comment"');
    expect(quelle).toContain('id="bs-comment-btn"');
    // Kein Zweig, der die Eingabe bei einem Status abschaltet.
    expect(quelle).not.toMatch(/bs-chat-card[^\n]*display\s*:\s*none/);
    expect(quelle).not.toMatch(/status\s*===?\s*3[^\n]{0,60}bs-comment/);
  });
});

test.describe('Kennzeichen am Tagesgericht', () => {
  test('TC-A09: abgeholt wird als erledigt gezeigt, nicht als offen', () => {
    /* Beide Stellen bauen das Kennzeichen am Gericht. Ohne eigene
       Behandlung bekäme eine abgeholte Bestellung das orange „bestellt"
       und sähe aus wie eine, die noch aussteht. */
    for (const datei of ['index.html', 'tagesinfo.html']) {
      const quelle = fs.readFileSync(
        path.join(__dirname, '..', 'static-site', datei), 'utf8');
      expect(quelle, datei + ': eigene Beschriftung fehlt')
        .toMatch(/status===3\s*\?\s*'abgeholt'/);
      expect(quelle, datei + ': Status 3 gilt nicht als erledigt')
        .toMatch(/status===1\|\|info\.status===3/);
    }
  });
});
