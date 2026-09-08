// tests/kiosk-neu.spec.js
//
// Regressionsschutz für den Kiosk-Umbau (specs/kiosk-umbau).
//
// Geprüft wird die Zweitseite `kiosk-neu.html` mit **echten Daten**. Dafür
// muss der Entwicklungs-Proxy laufen und die Adresse gesetzt sein:
//
//   node tools/dev-proxy.js 8787
//   $env:TEST_URL="http://localhost:8787"; npx playwright test tests/kiosk-neu.spec.js
//
// Ohne Proxy überspringt sich die Datei selbst, statt rot zu werden - so
// bleibt ein Lauf gegen die veröffentlichte Seite (Voreinstellung) sauber.
//
// Die allgemeinen Regeln (Überlauf, 44 px, Rollstreifen, Fettschrift) prüft
// `tools/pruef-kiosk-neu.js` über alle elf Breiten. Hier stehen die
// Eigenschaften, die dort nicht ausdrückbar sind: der Ablauf und die
// Entscheidungen, die der Auftraggeber ausdrücklich verlangt hat.

const { test, expect } = require('@playwright/test');

const SEITE = '/kiosk-neu.html';

/** Wartet, bis die Fachmodule ihre echten Daten gezeichnet haben. */
async function reiterOeffnen(page, name) {
  await page.evaluate((n) => window.K && window.K.switchTab && window.K.switchTab(n), name);
  await page.waitForTimeout(1500);
  await page.waitForFunction(
    () => {
      const p = document.querySelector('.k-panel.active');
      return p && p.scrollHeight > 200;
    },
    { timeout: 20000 }
  ).catch(() => { /* Ein leerer Reiter ist auch ein Ergebnis. */ });
  await page.waitForTimeout(1200);
}

test.beforeEach(async ({ page, baseURL }) => {
  test.skip(
    !/localhost|127\.0\.0\.1/.test(String(baseURL || '')),
    'Braucht den Entwicklungs-Proxy: node tools/dev-proxy.js 8787'
  );
  // Die Seite lädt sich neu, sobald die Version wechselt - das würde jede
  // Messung mittendrin abbrechen.
  await page.route('**/version.json', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '{"version":"test"}' })
  );
  await page.goto(SEITE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
});

// ── Metzger Mair ──────────────────────────────────────────────────────

test.describe('Metzger Mair', () => {
  test('zeigt nur Tage, an denen der Metzger liefert', async ({ page }) => {
    await reiterOeffnen(page, 'metzgerbest');
    const tage = await page.evaluate(() =>
      [...document.querySelectorAll('#panel-metzgerbest .mb-days .mb-day')].map((d) => ({
        text: d.textContent.trim(),
        sichtbar: getComputedStyle(d).display !== 'none',
        keinLiefertag: /liefert der Metzger nicht/.test(d.getAttribute('title') || ''),
      }))
    );
    test.skip(tage.length === 0, 'Keine Liefertage geladen');

    // Kein einziger Tag, an dem gar nicht geliefert wird, nimmt Platz weg.
    expect(tage.filter((t) => t.keinLiefertag && t.sichtbar)).toEqual([]);
    // Es bleibt aber mindestens ein wählbarer Tag übrig.
    expect(tage.filter((t) => t.sichtbar).length).toBeGreaterThan(0);
  });

  test('Portions-Badges sind schlank und trotzdem voll antippbar', async ({ page }) => {
    await reiterOeffnen(page, 'metzgerbest');
    const chip = await page.evaluate(() => {
      const c = document.querySelector('#panel-metzgerbest .mb-chip');
      if (!c) return null;
      const r = c.getBoundingClientRect();
      const s = getComputedStyle(c);
      return {
        hoehe: Math.round(r.height),
        randOben: Math.round(parseFloat(s.borderTopWidth) || 0),
        randUnten: Math.round(parseFloat(s.borderBottomWidth) || 0),
      };
    });
    test.skip(!chip, 'Keine erfasste Portion vorhanden');

    // Die Antippfläche bleibt bei 44 px ...
    expect(chip.hoehe).toBeGreaterThanOrEqual(44);
    // ... die gezeichnete Pille ist aber deutlich flacher (durchsichtiger Rand).
    expect(chip.hoehe - chip.randOben - chip.randUnten).toBeLessThanOrEqual(36);
  });

  test('der Knopf zum Hinzufügen steht immer an derselben Stelle', async ({ page }) => {
    await reiterOeffnen(page, 'metzgerbest');
    const spalten = await page.evaluate(() => {
      const rechts = [...document.querySelectorAll('#panel-metzgerbest .mb-add:not(.del)')]
        .filter((a) => a.getBoundingClientRect().width > 0)
        .map((a) => Math.round(a.getBoundingClientRect().right));
      return [...new Set(rechts)];
    });
    test.skip(spalten.length === 0, 'Keine Artikelzeilen geladen');

    // Je Kartenspalte genau eine Kante - nicht je Zeile eine andere.
    // Mehr als drei Kartenspalten gibt es auf keiner Prüfbreite.
    expect(spalten.length).toBeLessThanOrEqual(3);
  });

  test('die Fußzeile nennt keinen geschätzten Betrag mehr', async ({ page }) => {
    await reiterOeffnen(page, 'metzgerbest');
    const text = await page.evaluate(() => {
      const f = document.querySelector('#panel-metzgerbest .mb-foot');
      if (!f) return null;
      return [...f.querySelectorAll('.mb-st')]
        .filter((s) => getComputedStyle(s).display !== 'none')
        .map((s) => s.textContent)
        .join(' ');
    });
    test.skip(text === null, 'Keine Fußzeile vorhanden');
    expect(text).not.toMatch(/gesch(ä|ae)tzt/i);
  });

  test('die Liste scheint nicht unter der Fußzeile hervor', async ({ page }) => {
    await reiterOeffnen(page, 'metzgerbest');
    const lage = await page.evaluate(() => {
      const panel = document.getElementById('panel-metzgerbest');
      const fuss = panel && panel.querySelector('.mb-foot');
      if (!fuss) return null;
      panel.scrollTop = panel.scrollHeight;
      const pb = panel.getBoundingClientRect();
      const fb = fuss.getBoundingClientRect();
      return { lueckeUnten: Math.round(pb.bottom - fb.bottom) };
    });
    test.skip(!lage, 'Keine Fußzeile vorhanden');
    // Bündig: darunter bleibt kein Streifen, in dem Zeilen durchscheinen.
    expect(lage.lueckeUnten).toBeLessThanOrEqual(1);
  });
});

// ── Mittagstisch ──────────────────────────────────────────────────────

test.describe('Mittagstisch', () => {
  test('der Kochbedarf hat keine eigene Überschriftszeile mehr', async ({ page }) => {
    await reiterOeffnen(page, 'mittag');
    const kopf = await page.evaluate(() => {
      const t = document.querySelector('#panel-mittag .k-cook-title');
      const k = document.querySelector('#panel-mittag .k-cook-head');
      if (!k) return null;
      return {
        titelSichtbar: t ? getComputedStyle(t).display !== 'none' : false,
        kopfLiegtInDerEcke: getComputedStyle(k).position === 'absolute',
      };
    });
    test.skip(!kopf, 'Kein Kochbedarf vorhanden');
    expect(kopf.titelSichtbar).toBe(false);
    expect(kopf.kopfLiegtInDerEcke).toBe(true);
  });

  test('das Tagesfeld wiederholt die Tagesleiste nicht', async ({ page }) => {
    await reiterOeffnen(page, 'mittag');
    const oben = await page.evaluate(() => {
      const f = document.querySelector('#mittag-status-bar .k-tag-jetzt');
      return f ? f.getBoundingClientRect().width > 0 : null;
    });
    test.skip(oben === null, 'Kein Tagesfeld vorhanden');
    // Solange die Tagesleiste im Bild ist, bleibt das Feld weg ...
    expect(oben).toBe(false);

    // ... und erscheint, sobald sie weggescrollt ist. Das setzt voraus, dass
    // überhaupt genug Bestellungen da sind, um so weit zu scrollen - an einem
    // ruhigen Tag ist der Reiter kürzer als der Bildschirm.
    const ergebnis = await page.evaluate(async () => {
      const p = document.getElementById('panel-mittag');
      const bar = document.getElementById('mittag-day-bar');
      if (!p || !bar) return { machbar: false };
      const noetig = bar.offsetTop + bar.offsetHeight + 20;
      if (p.scrollHeight - p.clientHeight < noetig) return { machbar: false };

      p.scrollTop = noetig;
      p.dispatchEvent(new Event('scroll'));
      await new Promise((r) => setTimeout(r, 400));
      const f = document.querySelector('#mittag-status-bar .k-tag-jetzt');
      return { machbar: true, sichtbar: f ? f.getBoundingClientRect().width > 0 : false };
    });
    test.skip(!ergebnis.machbar, 'Zu wenige Bestellungen, um die Tagesleiste wegzuscrollen');
    expect(ergebnis.sichtbar).toBe(true);
  });
});

// ── Social: Katalog (TC-F5-06) ────────────────────────────────────────

test.describe('Social-Katalog', () => {
  test('höchstens ein Eintrag ist gleichzeitig offen', async ({ page }) => {
    await reiterOeffnen(page, 'social');
    const zaehlen = () =>
      page.evaluate(() => {
        const p = document.getElementById('panel-social');
        const sichtbar = (e) => {
          const s = getComputedStyle(e);
          const r = e.getBoundingClientRect();
          return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
        };
        const felder = [...p.querySelectorAll('input:not([type=hidden]), select, textarea')]
          .filter(sichtbar)
          .filter((e) => !['checkbox', 'radio', 'file'].includes(e.type));
        return { offen: felder.length, zeilen: p.querySelectorAll('.kneu-kat-zeile').length };
      });

    const vorher = await zaehlen();
    test.skip(vorher.zeilen === 0, 'Katalog nicht geladen');

    // Eingeklappt: weit unter den 20 Feldern aus TC-F5-06.
    expect(vorher.offen).toBeLessThanOrEqual(20);

    await page.evaluate(() =>
      document.querySelector('#soc-pick-grid .kneu-kat-zeile .kneu-kat-btn').click()
    );
    await page.waitForTimeout(400);
    const nachher = await zaehlen();

    // Geöffnet kommen nur die Felder des einen Eintrags dazu.
    expect(nachher.offen).toBeLessThanOrEqual(20);
    expect(nachher.offen).toBeGreaterThan(vorher.offen);
  });

  test('das Fachmodul liest den Preis auch im eingeklappten Zustand', async ({ page }) => {
    await reiterOeffnen(page, 'social');
    const ergebnis = await page.evaluate(async () => {
      const zeile = document.querySelector('#soc-pick-grid .kneu-kat-zeile');
      if (!zeile) return null;
      const feld = zeile.querySelector('.soc-pick-preis');
      const alt = feld.value;
      feld.value = '9,99';
      feld.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 200));

      const kennung = zeile.querySelector('.soc-post-cb').value;
      // Genau der Zugriff, den das Fachmodul beim Absenden benutzt:
      const gelesen = document.querySelector('.soc-pick-preis[data-id="' + kennung + '"]');
      const antwort = {
        eingeklappt: getComputedStyle(zeile.querySelector('.kneu-kat-felder')).display === 'none',
        gelesen: gelesen ? gelesen.value : null,
        anzeige: zeile.querySelector('.kneu-kat-wert').textContent,
      };
      feld.value = alt;
      feld.dispatchEvent(new Event('input', { bubbles: true }));
      return antwort;
    });
    test.skip(!ergebnis, 'Katalog nicht geladen');

    expect(ergebnis.eingeklappt).toBe(true);
    expect(ergebnis.gelesen).toBe('9,99');
    expect(ergebnis.anzeige).toContain('9,99');
  });
});

// ── Terminkalender ────────────────────────────────────────────────────

test.describe('Terminkalender', () => {
  test('ein Datum lässt sich unmittelbar wählen', async ({ page }) => {
    await reiterOeffnen(page, 'kalender');
    const da = await page.evaluate(() => !!document.querySelector('#panel-kalender .kneu-kal-datum'));
    test.skip(!da, 'Kalender nicht geladen');

    const ziel = await page.evaluate(() => {
      const heute = new Date();
      heute.setDate(heute.getDate() + 70); // gut zehn Wochen voraus
      return heute.toISOString().slice(0, 10);
    });

    await page.evaluate((d) => {
      const f = document.querySelector('#panel-kalender .kneu-kal-datum');
      f.value = d;
      f.dispatchEvent(new Event('change', { bubbles: true }));
    }, ziel);
    await page.waitForTimeout(3000);

    const gezeigt = await page.evaluate(() => {
      const tage = [...document.querySelectorAll('#kal-days .kal-day')].map((d) =>
        d.getAttribute('data-day')
      );
      const aktiv = document.querySelector('#kal-days .kal-day.active');
      return { tage, gewaehlt: aktiv ? aktiv.getAttribute('data-day') : null };
    });

    expect(gezeigt.tage).toContain(ziel);
    expect(gezeigt.gewaehlt).toBe(ziel);
  });
});

// ── Bäcker ────────────────────────────────────────────────────────────

test.describe('Bäcker', () => {
  test('der Liefertag steht vor allem anderen und bleibt stehen', async ({ page }) => {
    await reiterOeffnen(page, 'baecker');
    const lage = await page.evaluate(() => {
      const fest = document.querySelector('#panel-baecker .kneu-bk-fest');
      const kopf = document.querySelector('#panel-baecker .bk-sticky');
      if (!fest || !kopf) return null;
      return {
        vorDemKopf: fest.getBoundingClientRect().top < kopf.getBoundingClientRect().top,
        enthaeltTagesleiste: !!fest.querySelector('.bk-days'),
      };
    });
    test.skip(!lage, 'Bäcker-Kopf nicht geladen');
    expect(lage.vorDemKopf).toBe(true);
    expect(lage.enthaeltTagesleiste).toBe(true);

    const beimBlaettern = await page.evaluate(async () => {
      const p = document.getElementById('panel-baecker');
      p.scrollTop = 1200;
      await new Promise((r) => setTimeout(r, 400));
      const fest = document.querySelector('#panel-baecker .kneu-bk-fest');
      const pb = p.getBoundingClientRect();
      const fb = fest.getBoundingClientRect();
      return Math.round(fb.top - pb.top);
    });
    // Bleibt oben kleben statt mit der Liste zu verschwinden.
    expect(beimBlaettern).toBeLessThanOrEqual(30);
  });
});

// ── Rückfrage vor folgenschweren Schritten (TC-F5-05) ─────────────────

test.describe('Rückfrage', () => {
  test('Abbrechen löst nichts aus, Bestätigen genau einmal', async ({ page }) => {
    await reiterOeffnen(page, 'baecker');
    const ergebnis = await page.evaluate(async () => {
      const warte = (ms) => new Promise((r) => setTimeout(r, ms));
      window.__lief = 0;
      const knopf = document.createElement('button');
      knopf.textContent = 'Verwerfen';
      knopf.onclick = () => { window.__lief++; };
      document.getElementById('panel-baecker').appendChild(knopf);

      knopf.click();
      await warte(400);
      const erscheint = !!document.querySelector('.kneu-frage');
      const vorher = window.__lief;

      document.querySelector('.kneu-frage-nein').click();
      await warte(400);
      const nachAbbruch = window.__lief;

      knopf.click();
      await warte(400);
      document.querySelector('.kneu-frage-ja').click();
      await warte(400);
      const nachBestaetigung = window.__lief;

      knopf.remove();
      return { erscheint, vorher, nachAbbruch, nachBestaetigung };
    });

    expect(ergebnis.erscheint).toBe(true);
    expect(ergebnis.vorher).toBe(0);
    expect(ergebnis.nachAbbruch).toBe(0);
    expect(ergebnis.nachBestaetigung).toBe(1);
  });

  test('die Sendeknöpfe fragen vorher nach', async ({ page }) => {
    for (const [reiter, wort] of [['baecker', 'an bäckerei senden'], ['metzgerbest', 'bestellung senden']]) {
      await reiterOeffnen(page, reiter);
      const gefragt = await page.evaluate(async (w) => {
        const b = [...document.querySelectorAll('.k-panel.active button')].find((x) =>
          new RegExp(w, 'i').test(x.textContent)
        );
        if (!b) return 'kein Knopf';
        b.click();
        await new Promise((r) => setTimeout(r, 500));
        const d = document.querySelector('.kneu-frage');
        const titel = d ? d.querySelector('.kneu-frage-titel').textContent : null;
        if (d) document.querySelector('.kneu-frage-nein').click();
        return titel;
      }, wort);

      if (gefragt === 'kein Knopf') continue; // an diesem Tag nichts zu senden
      expect(gefragt).toMatch(/senden\?$/);
    }
  });
});

// ── Meldungen in Alltagssprache (TC-F5-04) ────────────────────────────

test.describe('Meldungen', () => {
  test('technische Texte werden übersetzt, deutsche bleiben stehen', async ({ page }) => {
    const proben = await page.evaluate(() =>
      [
        'Failed to fetch',
        'Fehler: TypeError: Cannot read properties of undefined',
        'HTTP 500 Internal Server Error',
        '401',
        'Die Bestellung wurde gesendet.',
      ].map((t) => ({ ein: t, aus: window.KNeu.klartext(t) }))
    );

    // Kein Ausnahmetext, kein Zustandscode, kein englisches Wort.
    for (const p of proben.slice(0, 4)) {
      expect(p.aus).not.toMatch(/fetch|TypeError|HTTP|\b401\b|\b500\b/i);
      expect(p.aus.length).toBeGreaterThan(20);
    }
    // Was schon verständlich ist, wird nicht angefasst.
    expect(proben[4].aus).toBe('Die Bestellung wurde gesendet.');
  });
});
