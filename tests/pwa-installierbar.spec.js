// @ts-check
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

/**
 * Installierbarkeit als App (Android/Chrome).
 *
 * Aus dem Laden: „Wir haben Probleme mit Android 12. Die App erscheint hier
 * nicht in der Liste der Apps, obwohl sie auf dem Startbildschirm
 * installiert wurde. Ebenso gehen dann Notifications nicht."
 *
 * Genau diese beiden Symptome hat eine **Verknüpfung** statt einer echten
 * App. Chrome legt nur dann eine echte App (WebAPK) an, wenn die Seite alle
 * Bedingungen erfüllt — darunter ein **auf der Seite verlinktes Manifest**.
 *
 * Ausgerechnet `app.html`, die Anleitungsseite zum Installieren, hatte
 * keinen Manifest-Verweis. Wer der Anleitung folgte und dort installierte,
 * bekam zwangsläufig eine Verknüpfung:
 *   – sie erscheint nicht in der App-Liste,
 *   – sie hat keine eigenen Benachrichtigungen,
 *   – und `beforeinstallprompt` feuert nicht, weshalb der Knopf
 *     „Jetzt installieren" auf der Seite nie erschien.
 *
 * Nicht die Android-Version war der Auslöser, sondern die Seite, von der
 * aus installiert wurde.
 *
 * Ausführen (lokaler Server aus static-site/ auf 8099):
 *   $env:TEST_URL='http://127.0.0.1:8099'
 *   node node_modules\@playwright\test\cli.js test tests/pwa-installierbar.spec.js
 */

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
const LOKAL = /localhost|127\.0\.0\.1/.test(BASE);

/** Kundenseiten – von jeder aus muss sich die App anlegen lassen. */
const KUNDENSEITEN = [
  'index.html', 'app.html', 'shop.html', 'aktuelles.html',
  'oeffnungszeiten.html', 'sortiment.html', 'essen-im-dorfladen.html',
  'mittagstisch-bestellen.html', 'fleisch-bestellen.html',
  'bestellstatus.html', 'bestellungen.html', 'tagesinfo.html',
  'konzept.html', 'beirat.html', 'geschaeftsfuehrung.html',
  'stille-gesellschafter.html', 'bilder.html', 'roter-punkt.html',
  'flyer-wurstaktion.html', 'agb.html', 'impressum.html',
  'datenschutzerklaerung.html', 'widerrufsrecht.html',
];

/** Mitarbeiterseiten – die gehören nicht auf den Startbildschirm eines Kunden. */
const PERSONALSEITEN = [
  'cms.html', 'cms-neu.html', 'cms-klassisch.html', 'lunch-admin.html',
  'shop-admin.html', 'shop-freigabe.html', 'pack.html', 'portal.html',
  'help-workflows.html',
];

function url(seite) {
  return LOKAL ? `${BASE}/${seite}` : `${BASE}/${seite.replace(/\.html$/, '')}`;
}

function quelle(seite) {
  return fs.readFileSync(
    path.join(__dirname, '..', 'static-site', seite), 'utf8');
}

test.describe('App-Installation auf Android', () => {
  test.use({ serviceWorkers: 'block' });

  // ── Die Bedingung, an der es hing ──────────────────────────────────
  for (const seite of KUNDENSEITEN) {
    test(`TC-PWA-01 ${seite} verweist auf ein Manifest`, async () => {
      /* Ohne diesen Verweis bietet Chrome keine Installation an, sondern
         legt nur eine Verknüpfung ab. Geprüft wird die Datei selbst, damit
         der Wächter auch ohne laufende Umgebung trägt. */
      const text = quelle(seite);
      expect(text, `${seite} hat kein <link rel="manifest">`)
        .toMatch(/<link[^>]+rel="manifest"/);
    });
  }

  test('TC-PWA-02 Mitarbeiterseiten bleiben bewusst ohne Manifest', async () => {
    // Die Gegenrichtung: Das Kassen- und Verwaltungswerkzeug soll niemand
    // versehentlich als Kunden-App auf dem Handy haben.
    const versehen = PERSONALSEITEN.filter(
      (s) => /<link[^>]+rel="manifest"[^>]+href="\/manifest\.json"/.test(quelle(s)));
    expect(versehen, `Kunden-Manifest auf Personalseite: ${versehen.join(', ')}`)
      .toHaveLength(0);
  });

  test('TC-PWA-03 Der Kiosk nutzt sein eigenes Manifest', async () => {
    // Sonst hiesse die installierte Kiosk-App „Dorfladen" und startete auf
    // der Kundenseite.
    for (const s of ['kiosk.html', 'kiosk-neu.html', 'kiosk-klassisch.html']) {
      expect(quelle(s), `${s} nutzt nicht kiosk-manifest.json`)
        .toMatch(/rel="manifest"[^>]+href="\/kiosk-manifest\.json"/);
    }
  });

  // ── Das Manifest erfüllt die Bedingungen von Chrome ─────────────────
  test('TC-PWA-04 Das Manifest erfüllt alle Installationsbedingungen',
    async ({ request }) => {
      const res = await request.get(BASE + '/manifest.json');
      expect(res.status()).toBe(200);
      const m = await res.json();

      expect(m.name, 'name fehlt').toBeTruthy();
      expect(m.short_name, 'short_name fehlt').toBeTruthy();
      expect(m.start_url, 'start_url fehlt').toBeTruthy();
      // Nur standalone oder fullscreen ergeben eine echte App; „browser"
      // wuerde Chrome zu einer Verknuepfung zurueckstufen.
      expect(['standalone', 'fullscreen', 'minimal-ui'], 'display untauglich')
        .toContain(m.display);

      const groessen = m.icons.map((i) => i.sizes);
      expect(groessen, '192er Symbol fehlt').toContain('192x192');
      expect(groessen, '512er Symbol fehlt').toContain('512x512');
    });

  // ── Der Service Worker, den Chrome ebenfalls verlangt ───────────────
  test('TC-PWA-05 Der Service Worker beantwortet Abrufe', async ({ request }) => {
    /* Chrome verlangt einen Service Worker mit `fetch`-Behandlung. Ohne ihn
       gaebe es wieder nur eine Verknuepfung. */
    const res = await request.get(BASE + '/sw.js');
    expect(res.status()).toBe(200);
    const js = await res.text();
    expect(js, 'kein fetch-Ereignis im Service Worker')
      .toMatch(/addEventListener\(\s*['"]fetch['"]/);
    expect(js, 'kein push-Ereignis – dann kaemen keine Benachrichtigungen')
      .toMatch(/addEventListener\(\s*['"]push['"]/);
  });

  test('TC-PWA-06 app.html registriert den Service Worker', async () => {
    // Die Anleitungsseite laedt pwa.js – dort steht die Registrierung.
    expect(quelle('app.html'), 'pwa.js wird nicht geladen')
      .toMatch(/src="\/js\/pwa\.js/);
    expect(quelle(path.join('js', 'pwa.js')), 'keine Registrierung in pwa.js')
      .toMatch(/serviceWorker\.register\(\s*['"]\/sw\.js['"]/);
  });

  // ── Die Anleitung darf nicht in die Verknüpfung führen ──────────────
  test('TC-PWA-07 Die Anleitung verwechselt Installation und Verknüpfung nicht',
    async () => {
      /* Die Seite behauptete, „Zum Startbildschirm hinzufügen" sei dasselbe
         wie „App installieren". Das ist es nicht – und genau dieser Satz
         führte in den gemeldeten Zustand. */
      const text = quelle('app.html');
      expect(text, 'die alte Gleichsetzung steht wieder da')
        .not.toMatch(/Zum Startbildschirm hinzufügen[^<]*<\/strong>\s*—\s*\n?\s*das ist dasselbe/);
      expect(text, 'der Unterschied wird nicht erklärt')
        .toContain('Verknüpfung');
      expect(text, 'keine Probe, ob es geklappt hat')
        .toMatch(/Liste\s*\n?\s*<strong>aller Apps<\/strong>|aller Apps/);
    });

  // ── Im Browser gegengeprüft ─────────────────────────────────────────
  test('TC-PWA-08 Der Browser findet Manifest und Symbole', async ({ page, request }) => {
    await page.goto(url('app.html'));
    const href = await page.getAttribute('link[rel="manifest"]', 'href');
    expect(href, 'kein Manifest im geladenen Dokument').toBeTruthy();

    // Das Manifest muss auch wirklich abrufbar und lesbar sein.
    const res = await request.get(BASE + href);
    expect(res.status(), `${href} nicht abrufbar`).toBe(200);
    const m = await res.json();

    for (const i of m.icons) {
      const bild = await request.get(BASE + i.src);
      expect(bild.status(), `${i.src} fehlt`).toBe(200);
    }
  });
});
