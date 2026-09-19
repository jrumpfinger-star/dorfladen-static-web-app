// @ts-check
/**
 * Gemeinsamer Aufsatz für alle Tests, die den Kiosk öffnen.
 *
 * Seit specs/kiosk-passwortabfrage steht vor dem Kiosk eine Passwortmaske.
 * Ohne Anmeldung sähe jeder dieser Tests nur die Maske und liefe in einen
 * Zeitablauf — was vorher passiert ist: Ein Lauf hing minutenlang, statt
 * mit einer klaren Meldung zu scheitern.
 *
 * Dieser Aufsatz legt den Sitzungsschlüssel vor jedem Laden ab, genau wie
 * es das CMS nach erfolgreicher Anmeldung tut. Die Tests prüfen damit
 * weiterhin ihren eigenen Gegenstand und nicht die Anmeldung.
 *
 * Verwendung statt `@playwright/test`:
 *     const { test, expect } = require('./_kiosk-angemeldet');
 *
 * NICHT verwenden in `kiosk-passwortabfrage.spec.js` — dort ist die
 * gesperrte Ausgangslage gerade der Gegenstand der Prüfung.
 */
const fs = require('fs');
const path = require('path');
const basis = require('@playwright/test');

/* Die Prüfsumme wird aus der Quelldatei gelesen, nicht abgeschrieben.
   Ändert jemand das Passwort, ziehen die Tests von selbst nach — eine
   zweite Kopie wäre sonst still veraltet. */
function pruefsumme() {
  const datei = path.join(__dirname, '..', 'static-site', 'kiosk-klassisch.html');
  const treffer = fs.readFileSync(datei, 'utf8')
    .match(/<script id="cms-pw-hash"[^>]*>"([^"]+)"<\/script>/);
  if (!treffer) {
    throw new Error('_kiosk-angemeldet: Passwort-Prüfsumme in kiosk-klassisch.html nicht gefunden');
  }
  return treffer[1];
}

const HASH = pruefsumme();

/** Legt den Sitzungsschlüssel ab, bevor die Seite lädt. */
function anmelden(ziel) {
  return ziel.addInitScript((h) => {
    try { sessionStorage.setItem('cms_auth_ok', h); } catch (e) { /* Speicher gesperrt */ }
  }, HASH);
}

const test = basis.test.extend({
  /* Manche Tests legen sich einen EIGENEN Kontext an (`browser.newContext`),
     etwa um mehrere Bildschirmbreiten zu prüfen. Deren Seiten gingen am
     `page`-Aufsatz vorbei und liefen in die Passwortmaske. Deshalb wird
     `newContext` umhüllt — so ist jede Seite angemeldet, ganz gleich wo
     sie entsteht. */
  browser: async ({ browser }, use) => {
    const urspruenglich = browser.newContext.bind(browser);
    browser.newContext = async function (opt) {
      const ctx = await urspruenglich(opt);
      await anmelden(ctx);
      return ctx;
    };
    try {
      await use(browser);
    } finally {
      browser.newContext = urspruenglich;   // Zustand nicht verschleppen
    }
  },

  page: async ({ page }, use) => {
    await anmelden(page);
    await use(page);
  },
});

module.exports = { test, expect: basis.expect, PW_HASH: HASH };
