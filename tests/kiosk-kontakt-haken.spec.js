/**
 * Kiosk – Kontakt: Lesehaken, Sortierung und Spalten-Ausrichtung
 *
 * Prüft die WhatsApp-artigen Verbesserungen im Tab "Kontakt":
 *   K1  Ungelesene Konversationen stehen oben, mit sichtbarer Trennung
 *   K2  Gelesene Konversationen tragen einen Doppelhaken
 *   K3  Öffnen einer Konversation markiert sie als gelesen
 *   K4  Die Spalten der Listenzeile sind sauber ausgerichtet
 *
 * Ausführen:
 *   npx playwright test tests/kiosk-kontakt-haken.spec.js
 */

const { test, expect } = require('./_kiosk-angemeldet');

// Der Kiosk ist eine PWA: ohne diesen Schalter beantwortet der Service Worker
// die API-Aufrufe aus seinem Cache und die Mock-Routen greifen nicht.
test.use({ serviceWorkers: 'block' });

const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
// Lokal (python http.server) gibt es keine SWA-Route /kiosk -> Datei ansteuern
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

function threads() {
  return [
    // gelesen, aber juengste Aktivitaet – darf NICHT oben stehen
    {
      id: 'c1', name: 'Anna Gelesen', device_id: 'devaaaa1111', geraet: 'Windows · Chrome',
      kommentar_gelesen: true, modified: '2026-09-04T15:00:00Z',
      verlauf: [
        { who: 'kunde', text: 'Habt ihr Brot?', t: '2026-09-04T14:00:00Z' },
        { who: 'dorfladen', text: 'Ja, frisch da.', t: '2026-09-04T15:00:00Z' },
      ],
    },
    // ungelesen, aelter – muss trotzdem oben stehen
    {
      id: 'c2', name: 'Bert Ungelesen', device_id: 'devbbbb2222', geraet: 'Android · Chrome',
      kommentar_gelesen: false, modified: '2026-09-04T09:00:00Z',
      verlauf: [
        { who: 'dorfladen', text: 'Guten Morgen', t: '2026-09-04T08:00:00Z' },
        { who: 'kunde', text: 'Ist der Mittagstisch noch offen?', t: '2026-09-04T09:00:00Z' },
      ],
    },
    // ungelesen mit zwei offenen Kundennachrichten
    {
      id: 'c3', name: 'Clara Zwei', device_id: 'devcccc3333', geraet: '',
      kommentar_gelesen: false, modified: '2026-09-04T10:00:00Z',
      verlauf: [
        { who: 'kunde', text: 'Hallo', t: '2026-09-04T09:50:00Z' },
        { who: 'kunde', text: 'Noch eine Frage', t: '2026-09-04T10:00:00Z' },
      ],
    },
  ];
}

async function mockApi(page, opts = {}) {
  const patches = [];
  page.__patches = patches;
  // Serverzustand nachbilden: ein PATCH markiert die Konversation dauerhaft
  // als gelesen, damit ein Neuladen nicht wieder "ungelesen" liefert.
  const readIds = new Set();
  const unreadIds = new Set();
  page.on('request', (req) => {
    if (req.method() === 'PATCH' && /contact-message/.test(req.url())) {
      let body = {};
      try { body = JSON.parse(req.postData() || '{}'); } catch (e) { /* ignore */ }
      patches.push({ url: req.url(), body });
      const m = /contact-message\/([^/?]+)/.exec(req.url());
      if (m && body.kommentar_gelesen === true) readIds.add(m[1]);
      // Der Weg zurueck muss der Server ebenfalls behalten - sonst kaeme
      // eine wieder auf ungelesen gesetzte Konversation nach dem Neuladen
      // als gelesen zurueck, und der Waechter prueft nur die Anzeige.
      if (m && body.kommentar_gelesen === false) {
        readIds.delete(m[1]);
        unreadIds.add(m[1]);
      }
    }
  });

  // Reihenfolge zaehlt: zuletzt registrierte Route wird zuerst geprueft.
  // Daher erst die Auffangroute, danach die spezifischen. Regex statt Glob,
  // damit die Muster unabhaengig von Host und Port zuverlaessig greifen.
  await page.route(/\/api\//, (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [], orders: [], threads: [], customers: [] }),
    }));

  await page.route(/\/api\/cms-config/, (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          feature_flags: {
            kiosk_shop: true, kiosk_mittag: true, kiosk_metzger: true,
            kiosk_social: true, kiosk_kontakt: true,
          },
        },
      }),
    }));

  await page.route(/\/api\/contact-message/, (route) => {
    const url = route.request().url();
    const json = (o) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
    if (route.request().method() !== 'GET') return json({ success: true });
    const list = threads().map((t) => Object.assign({}, t, {
      kommentar_gelesen: unreadIds.has(t.id)
        ? false
        : (opts.allRead || t.kommentar_gelesen || readIds.has(t.id)),
    }));
    if (/mode=unread/.test(url)) {
      return json({ success: true, unread_count: list.filter((t) => !t.kommentar_gelesen).length });
    }
    return json({ success: true, threads: list });
  });
}

async function openKontakt(page, opts = {}) {
  await mockApi(page, opts);
  await page.goto(KIOSK_URL);
  await page.locator('.k-tab[data-tab="kontakt"]').click();
  await expect(page.locator('#kontakt-list .kk-card').first()).toBeVisible({ timeout: 20000 });
}

const cards = (page) => page.locator('#kontakt-list .kk-card');

// ════════════════════════════════════════════════════
//  K1 – Ungelesene oben
// ════════════════════════════════════════════════════

test.describe('Kontakt – Sortierung (K1)', () => {

  test('K1-01: ungelesene Konversationen stehen oben', async ({ page }) => {
    await openKontakt(page);
    const names = await page.locator('#kontakt-list .kk-name').allTextContents();
    // Bert und Clara sind ungelesen, Anna gelesen – trotz juengerer Aktivitaet
    expect(names.slice(0, 2).sort()).toEqual(['Bert Ungelesen', 'Clara Zwei']);
    expect(names[2]).toBe('Anna Gelesen');
  });

  test('K1-02: Abschnitte trennen neu und gelesen', async ({ page }) => {
    await openKontakt(page);
    const secs = page.locator('#kontakt-list .kk-sec');
    await expect(secs).toHaveCount(2);
    await expect(secs.nth(0)).toContainText('Neue Nachrichten');
    await expect(secs.nth(0)).toContainText('2 ungelesen');
    await expect(secs.nth(1)).toContainText('Bereits gelesen');
  });

  test('K1-03: ohne ungelesene keine Abschnittsköpfe', async ({ page }) => {
    await openKontakt(page, { allRead: true });
    await expect(page.locator('#kontakt-list .kk-sec')).toHaveCount(0);
    await expect(cards(page)).toHaveCount(3);
  });
});

// ════════════════════════════════════════════════════
//  K2 – Lesehaken
// ════════════════════════════════════════════════════

test.describe('Kontakt – Lesehaken (K2)', () => {

  test('K2-01: gelesene Konversation zeigt Doppelhaken, ungelesene die Anzahl', async ({ page }) => {
    await openKontakt(page);

    const gelesen = cards(page).filter({ hasText: 'Anna Gelesen' });
    await expect(gelesen.locator('.kk-state .kk-ticks')).toHaveCount(1);

    const offen = cards(page).filter({ hasText: 'Clara Zwei' });
    await expect(offen.locator('.kk-state .kk-ticks')).toHaveCount(0);
    await expect(offen.locator('.kk-state')).toContainText('2');
  });

  test('K2-02: Haken an gelesenen Kundennachrichten im Verlauf', async ({ page }) => {
    await openKontakt(page);

    const gelesen = cards(page).filter({ hasText: 'Anna Gelesen' });
    await gelesen.locator('.kk-hdr').click();
    await expect(gelesen.locator('.kk-thread')).toBeVisible();
    // Kundennachricht ist gelesen -> Haken ohne "pending"
    await expect(gelesen.locator('.kk-thread .kk-ticks')).toHaveCount(1);
    await expect(gelesen.locator('.kk-thread .kk-ticks.pending')).toHaveCount(0);
  });

  test('K2-03: eigene Nachrichten tragen keinen Lesehaken', async ({ page }) => {
    await openKontakt(page);

    const gelesen = cards(page).filter({ hasText: 'Anna Gelesen' });
    await gelesen.locator('.kk-hdr').click();
    await expect(gelesen.locator('.kk-thread')).toBeVisible();
    // 2 Nachrichten im Verlauf, aber nur die des Kunden hat einen Haken
    await expect(gelesen.locator('.kk-thread .kk-ticks')).toHaveCount(1);
  });
});

// ════════════════════════════════════════════════════
//  K3 – Öffnen markiert als gelesen
// ════════════════════════════════════════════════════

test.describe('Kontakt – Öffnen markiert gelesen (K3)', () => {

  test('K3-01: Öffnen sendet PATCH und setzt den Haken', async ({ page }) => {
    await openKontakt(page);

    const offen = cards(page).filter({ hasText: 'Clara Zwei' });
    await expect(offen.locator('.kk-state .kk-ticks')).toHaveCount(0);

    await offen.locator('.kk-hdr').click();

    await expect.poll(() => page.__patches.length, { timeout: 10000 }).toBeGreaterThan(0);
    const patch = page.__patches[page.__patches.length - 1];
    expect(patch.url).toContain('/c3');
    expect(patch.body.kommentar_gelesen).toBe(true);

    // Nach dem Öffnen traegt die Zeile den Doppelhaken statt der Zahl
    await expect(offen.locator('.kk-state .kk-ticks')).toHaveCount(1);
    // ... und die zuvor offenen Kundennachrichten gelten als gelesen
    await expect(offen.locator('.kk-thread .kk-ticks')).toHaveCount(2);
    await expect(offen.locator('.kk-thread .kk-ticks.pending')).toHaveCount(0);
  });

  test('K3-02: gelesene Konversation springt nicht sofort weg', async ({ page }) => {
    await openKontakt(page);

    const before = await page.locator('#kontakt-list .kk-name').allTextContents();
    await cards(page).filter({ hasText: 'Clara Zwei' }).locator('.kk-hdr').click();
    await expect(cards(page).filter({ hasText: 'Clara Zwei' }).locator('.kk-thread')).toBeVisible();

    const after = await page.locator('#kontakt-list .kk-name').allTextContents();
    expect(after).toEqual(before);
  });
});

// ════════════════════════════════════════════════════
//  K4 – Spalten-Ausrichtung
// ════════════════════════════════════════════════════

test.describe('Kontakt – Spalten (K4)', () => {

  /**
   * Misst eine Spaltenkante je KARTENSPALTE.
   *
   * Die Kontaktliste steht auf breiten Schirmen mehrspaltig: Bei 1280 px
   * passen zwei Karten à 496 px nebeneinander. Früher verlangten diese
   * Prüfungen EINE gemeinsame x-Position über alle Karten — das konnte nur
   * einspaltig aufgehen und schlug seit dem Umbau fehl (gemessen: 861 und
   * 351, also genau eine Kartenspalte Abstand).
   *
   * Die Absicht bleibt: Innerhalb einer Kartenspalte müssen die Angaben in
   * einer Flucht stehen. Geprüft wird das jetzt je Spalte.
   */
  async function kantenJeSpalte(page, sel, seite = 'left') {
    return page.evaluate(({ s, w }) => {
      const karten = [...document.querySelectorAll('#kontakt-list .kk-card')];
      const spalten = new Map();
      karten.forEach((k) => {
        const el = k.querySelector(s);
        if (!el) return;
        const spalte = Math.round(k.getBoundingClientRect().left);
        const kante = Math.round(el.getBoundingClientRect()[w]);
        if (!spalten.has(spalte)) spalten.set(spalte, []);
        spalten.get(spalte).push(kante);
      });
      return [...spalten.values()];
    }, { s: sel, w: seite });
  }

  test('K4-01: Name, Gerät und Vorschau starten bündig', async ({ page }) => {
    await openKontakt(page);
    /* Die Spaltenform greift ab 620 px KARTENbreite (Container-Abfrage),
       nicht ab einer Fensterbreite — der Profilname ist dafür das falsche
       Kriterium. */
    const breite = await page.locator('#kontakt-list .kk-card').first()
      .evaluate((e) => Math.round(e.getBoundingClientRect().width));
    test.skip(breite < 620, `Karte ist ${breite} px breit – Spaltenform greift erst ab 620`);

    const karten = await page.locator('#kontakt-list .kk-card').count();
    expect(karten, 'zu wenige Karten für eine Aussage').toBe(3);

    for (const sel of ['.kk-name', '.kk-dev', '.kk-prev']) {
      const gruppen = await kantenJeSpalte(page, sel);
      expect(gruppen.length, `${sel}: keine Karten gefunden`).toBeGreaterThan(0);
      for (const g of gruppen) {
        expect(new Set(g).size,
          `${sel}: innerhalb einer Kartenspalte nicht in einer Flucht (${g.join(', ')})`)
          .toBe(1);
      }
    }
  });

  test('K4-02: Zeitspalte endet bündig', async ({ page }) => {
    await openKontakt(page);
    const breite = await page.locator('#kontakt-list .kk-card').first()
      .evaluate((e) => Math.round(e.getBoundingClientRect().width));
    test.skip(breite < 620, `Karte ist ${breite} px breit – Spaltenform greift erst ab 620`);

    const gruppen = await kantenJeSpalte(page, '.kk-time', 'right');
    expect(gruppen.length, 'keine Zeitangaben gefunden').toBeGreaterThan(0);
    for (const g of gruppen) {
      expect(new Set(g).size,
        `Zeitspalte endet nicht bündig (${g.join(', ')})`).toBe(1);
    }
  });

  test('K4-03: kein horizontales Scrollen', async ({ page }) => {
    await openKontakt(page);
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('K4-04: auf schmalen Schirmen zwei feste Zeilen statt freiem Umbruch', async ({ page }) => {
    await openKontakt(page);
    /* Maßgeblich ist die Breite der KARTE, nicht die des Fensters: Das
       zweizeilige Raster greift per Container-Abfrage unter 620 px
       Kartenbreite (`@container kkkarte (max-width:619px)`). Früher
       übersprang sich der Fall nur auf `desktop` — auf dem iPad mini ist
       die Karte aber ebenfalls über 620 px breit und damit einzeilig. */
    const breite = await page.locator('#kontakt-list .kk-card').first()
      .evaluate((e) => Math.round(e.getBoundingClientRect().width));
    test.skip(breite >= 620,
      `Karte ist ${breite} px breit – das zweizeilige Raster greift erst darunter`);

    const box = async (sel) => page.locator('#kontakt-list .kk-card').first()
      .locator(sel).evaluate((e) => { const r = e.getBoundingClientRect(); return { top: Math.round(r.top), left: Math.round(r.left) }; });

    const name = await box('.kk-name');
    const state = await box('.kk-state');
    const prev = await box('.kk-prev');

    // Name und Status teilen sich die erste Zeile
    expect(Math.abs(name.top - state.top)).toBeLessThanOrEqual(6);
    // Die Vorschau steht darunter
    expect(prev.top).toBeGreaterThan(name.top);
  });

  test('K4-05: Namensspalte startet in allen Zeilen gleich', async ({ page }) => {
    await openKontakt(page);
    // Unterschiedlich breite Geraete-Chips duerfen die Namensspalte nicht verschieben
    const gruppen = await kantenJeSpalte(page, '.kk-name');
    expect(gruppen.length, 'keine Karten gefunden').toBeGreaterThan(0);
    for (const g of gruppen) {
      expect(new Set(g).size,
        `Namensspalte verschoben (${g.join(', ')})`).toBe(1);
    }
  });
});

// ════════════════════════════════════════════════════
//  K5 – Bild per Strg+V ins Antwortfeld einfügen
// ════════════════════════════════════════════════════

test.describe('Kontakt – Einfügen aus der Zwischenablage (K5)', () => {

  /** Öffnet die erste Konversation, damit das Antwortfeld sichtbar ist. */
  async function antwortfeldOeffnen(page) {
    await openKontakt(page);
    await cards(page).first().click();
    const ta = page.locator('textarea[id^="kk-rpt-"]').first();
    await expect(ta).toBeVisible({ timeout: 10000 });
    return ta;
  }

  test('K5-01: eingefügtes Bild erscheint als Vorschau', async ({ page }) => {
    const ta = await antwortfeldOeffnen(page);
    const id = await ta.getAttribute('id');
    await page.evaluate(async (feldId) => {
      const cv = document.createElement('canvas');
      cv.width = 40; cv.height = 30;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#2e7d4f'; ctx.fillRect(0, 0, 40, 30);
      const blob = await new Promise((res) => cv.toBlob(res, 'image/png'));
      const dt = new DataTransfer();
      dt.items.add(new File([blob], 'bild.png', { type: 'image/png' }));
      const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
      document.getElementById(feldId).dispatchEvent(ev);
    }, id);
    // Nach dem Einfügen wird die Liste neu gezeichnet – Vorschaubild erscheint
    await expect(page.locator('#kontakt-list img[src^="data:image"]').first())
      .toBeVisible({ timeout: 10000 });
  });

  test('K5-02: bereits getippter Text bleibt erhalten', async ({ page }) => {
    const ta = await antwortfeldOeffnen(page);
    const id = await ta.getAttribute('id');
    await ta.fill('Danke für die');
    await page.evaluate(async (feldId) => {
      const cv = document.createElement('canvas');
      cv.width = 20; cv.height = 20;
      cv.getContext('2d').fillRect(0, 0, 20, 20);
      const blob = await new Promise((res) => cv.toBlob(res, 'image/png'));
      const dt = new DataTransfer();
      dt.items.add(new File([blob], 'b.png', { type: 'image/png' }));
      document.getElementById(feldId).dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    }, id);
    await expect(page.locator('#kontakt-list img[src^="data:image"]').first())
      .toBeVisible({ timeout: 10000 });
    await expect(page.locator('#' + id)).toHaveValue('Danke für die');
  });

  test('K5-03: reiner Text wird normal eingefügt', async ({ page }) => {
    const ta = await antwortfeldOeffnen(page);
    const id = await ta.getAttribute('id');
    await page.evaluate((feldId) => {
      const dt = new DataTransfer();
      dt.setData('text/plain', 'nur Text');
      document.getElementById(feldId).dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    }, id);
    await page.waitForTimeout(500);
    await expect(page.locator('#kontakt-list img[src^="data:image"]')).toHaveCount(0);
  });
});

// ════════════════════════════════════════════════════
//  K9 – Wieder als ungelesen markieren
// ════════════════════════════════════════════════════
// Aus dem Laden: „nachrichten sollen auch wieder als ungelesen markiert
// werden koennen."
//
// Wer eine Nachricht aufklappt, hat sie damit schon als gelesen markiert —
// auch wenn er sie nur kurz ueberflogen hat und sich spaeter darum
// kuemmern wollte. Ohne Weg zurueck verschwindet sie aus „Neue
// Nachrichten" und der Zaehler faellt auf null.

test.describe('Kontakt – wieder als ungelesen (K9)', () => {

  /** Die Karte einer Konversation ueber ihren Namen finden. */
  const karte = (page, name) =>
    page.locator('#kontakt-list .kk-card').filter({ hasText: name });

  test('TC-KU-01: Eine gelesene Konversation traegt einen Knopf',
    async ({ page }) => {
      await openKontakt(page);
      const k = karte(page, 'Anna Gelesen');
      await expect(k.locator('button.kk-ticks')).toHaveCount(1);
      await expect(k.locator('button.kk-ticks'))
        .toHaveAttribute('title', /ungelesen/i);
    });

  test('TC-KU-02: Eine ungelesene hat keinen — dort waere er sinnlos',
    async ({ page }) => {
      await openKontakt(page);
      await expect(karte(page, 'Bert Ungelesen').locator('button.kk-ticks'))
        .toHaveCount(0);
    });

  test('TC-KU-03: Der Klick meldet es dem Server', async ({ page }) => {
    await openKontakt(page);
    await karte(page, 'Anna Gelesen').locator('.kk-state button.kk-ticks').click();
    await page.waitForTimeout(600);
    const raus = page.__patches.filter((p) => p.body.kommentar_gelesen === false);
    expect(raus.length, 'kein PATCH mit kommentar_gelesen:false').toBe(1);
    expect(raus[0].url).toContain('c1');
  });

  test('TC-KU-04: Sie rutscht zurueck zu den neuen Nachrichten',
    async ({ page }) => {
      /* Mit `allRead` sind zunaechst alle gelesen. Wird dann EINE wieder
         auf ungelesen gesetzt, muss sie unter „Neue Nachrichten" stehen
         und die uebrigen unter „Bereits gelesen". (Ohne allRead waeren
         hinterher alle drei ungelesen — dann entfallen die Ueberschriften
         zu Recht, und der Fall prueefte nichts.) */
      await openKontakt(page, { allRead: true });
      await karte(page, 'Anna Gelesen').locator('.kk-state button.kk-ticks').click();
      await page.waitForTimeout(700);

      // Jetzt traegt sie die gruene Zahl statt des Hakens.
      await expect(karte(page, 'Anna Gelesen').locator('.kk-state button.kk-ticks'))
        .toHaveCount(0);

      const lage = await page.evaluate(() => {
        const kinder = [...document.querySelectorAll(
          '#kontakt-list .kk-sec, #kontakt-list .kk-card')];
        let abschnitt = '';
        for (const el of kinder) {
          if (el.classList.contains('kk-sec')) { abschnitt = el.textContent.trim(); continue; }
          if (el.textContent.includes('Anna Gelesen')) return abschnitt;
        }
        return '(kein Abschnitt)';
      });
      expect(lage, `steht unter „${lage}"`).toMatch(/Neue Nachrichten/i);
    });

  test('TC-KU-05: Der Klick klappt die Karte nicht auf', async ({ page }) => {
    /* Der Haken sitzt in der Kopfzeile, und die ist anklickbar. Ohne
       stopPropagation klappte der Verlauf auf — und `toggle()` haette sie
       im selben Atemzug wieder als gelesen markiert. */
    await openKontakt(page);
    await karte(page, 'Anna Gelesen').locator('.kk-state button.kk-ticks').click();
    await page.waitForTimeout(700);
    await expect(page.locator('#kontakt-list .kk-thread')).toHaveCount(0);
    const raus = page.__patches.filter((p) => p.body.kommentar_gelesen === true);
    expect(raus.length, 'wurde sofort wieder als gelesen gemeldet').toBe(0);
  });

  test('TC-KU-06: Ein offener Verlauf wird zugeklappt', async ({ page }) => {
    await openKontakt(page);
    await karte(page, 'Anna Gelesen').locator('.kk-name').click();
    await expect(page.locator('#kontakt-list .kk-thread')).toHaveCount(1);
    await karte(page, 'Anna Gelesen').locator('.kk-state button.kk-ticks').click();
    await page.waitForTimeout(700);
    await expect(page.locator('#kontakt-list .kk-thread'),
      'bliebe er offen, waere die naechste Beruehrung wieder „gelesen"')
      .toHaveCount(0);
  });

  test('TC-KU-07: Es ueberlebt das Neuladen', async ({ page }) => {
    // Sonst waere es nur eine Anzeige, die beim naechsten Blick weg ist.
    await openKontakt(page);
    await karte(page, 'Anna Gelesen').locator('.kk-state button.kk-ticks').click();
    await page.waitForTimeout(700);
    await page.evaluate(() => window.KKontakt.reload());
    await page.waitForTimeout(900);
    await expect(karte(page, 'Anna Gelesen').locator('.kk-state button.kk-ticks'))
      .toHaveCount(0);
  });
});
// ════════════════════════════════════════════════════
//  K10 – Aus einer Nachricht in den Kalender
// ════════════════════════════════════════════════════
// Aus dem Laden: „Es waere auch schoen, wenn z.B. eine Bestellung ueber
// Nachrichten in den Kalender uebertragen werden koennte."
//
// Uebernommen wird der Wortlaut als Titel und der Name als Kunde, Kategorie
// „Vorbestellung". GESPEICHERT wird nicht: Die Nachricht sagt nicht, WANN
// abgeholt wird. Ein Knopf, der ungefragt einen Termin anlegt, erzeugt
// Eintraege am falschen Tag.

test.describe('Kontakt – in den Kalender (K10)', () => {

  const karte = (page, name) =>
    page.locator('#kontakt-list .kk-card').filter({ hasText: name });

  /** Konversation aufklappen und die Blasen zeigen. */
  async function verlaufOeffnen(page, name) {
    await openKontakt(page);
    await karte(page, name).locator('.kk-name').click();
    await expect(page.locator('#kontakt-list .kk-thread')).toHaveCount(1);
  }

  test('TC-KK-01: Kundennachrichten tragen den Kalenderknopf',
    async ({ page }) => {
      await verlaufOeffnen(page, 'Bert Ungelesen');
      // Verlauf: eine eigene Antwort, eine Kundennachricht.
      await expect(page.locator('#kontakt-list .kk-kal')).toHaveCount(1);
    });

  test('TC-KK-02: An der eigenen Antwort steht keiner', async ({ page }) => {
    /* Dort waere er sinnlos - wir bestellen nichts bei uns selbst. */
    await verlaufOeffnen(page, 'Bert Ungelesen');
    const beiUns = await page.evaluate(() =>
      [...document.querySelectorAll('#kontakt-list .kk-thread > div')]
        .filter((b) => b.textContent.includes('Dorfladen'))
        .some((b) => b.querySelector('.kk-kal')));
    expect(beiUns, 'Kalenderknopf an der eigenen Antwort').toBe(false);
  });

  test('TC-KK-03: Der Klick oeffnet den Kalender vorbefuellt',
    async ({ page }) => {
      await verlaufOeffnen(page, 'Bert Ungelesen');
      await page.locator('#kontakt-list .kk-kal').first().click();
      await page.waitForTimeout(600);

      const dlg = page.locator('#kal-modal');
      await expect(dlg, 'Kalenderdialog nicht offen').toBeVisible();
      await expect(page.locator('#kal-title'))
        .toHaveValue('Ist der Mittagstisch noch offen?');
      await expect(page.locator('#kal-kunde')).toHaveValue('Bert Ungelesen');
    });

  test('TC-KK-04: Die Kategorie steht auf Vorbestellung', async ({ page }) => {
    await verlaufOeffnen(page, 'Bert Ungelesen');
    await page.locator('#kontakt-list .kk-kal').first().click();
    await page.waitForTimeout(600);
    const aktiv = await page.evaluate(() => {
      const el = document.querySelector('#kal-catpills .kal-pill.active');
      return el ? (el.dataset.newcat || el.textContent.trim()) : '(keine)';
    });
    expect(aktiv, `aktive Kategorie: ${aktiv}`).toBe('vorbestellung');
  });

  test('TC-KK-05: Es wird nichts still gespeichert', async ({ page }) => {
    /* Der wichtigste Fall. Datum und Uhrzeit kennt nur der Mensch —
       ein ungefragt angelegter Eintrag stuende am falschen Tag. */
    const posts = [];
    page.on('request', (r) => {
      if (r.method() === 'POST' && /\/api\/kalender/.test(r.url())) posts.push(r.url());
    });
    await verlaufOeffnen(page, 'Bert Ungelesen');
    await page.locator('#kontakt-list .kk-kal').first().click();
    await page.waitForTimeout(900);
    expect(posts, `es wurde gespeichert: ${posts.join(', ')}`).toHaveLength(0);
  });

  test('TC-KK-06: Der Titel laesst sich ergaenzen, nicht nur ersetzen',
    async ({ page }) => {
      // Der Text ist vorbefuellt, der Schreibzeiger steht am ENDE –
      // sonst loescht das erste Zeichen die ganze Uebernahme.
      await verlaufOeffnen(page, 'Bert Ungelesen');
      await page.locator('#kontakt-list .kk-kal').first().click();
      await page.waitForTimeout(600);
      await page.keyboard.type(' – Rückruf');
      await expect(page.locator('#kal-title'))
        .toHaveValue('Ist der Mittagstisch noch offen? – Rückruf');
    });
});
// ════════════════════════════════════════════════════
//  K11 – Der Haken an der einzelnen Nachricht
// ════════════════════════════════════════════════════
// Aus dem Laden: „Kann auch eine einzelne Nachricht als ungelesen
// gekennzeichnet werden?"
//
// Ehrlich dazu: Ein Lesezustand JE NACHRICHT wird nicht gespeichert — es
// gibt nur ein Feld für die Konversation. Der Zustand der einzelnen Blase
// wird daraus abgeleitet. Ein Klick auf den Haken IN der Blase markiert
// deshalb die Konversation; damit stehen genau die Kundennachrichten am
// Ende wieder offen. Der Titel sagt das ausdrücklich.

test.describe('Kontakt – Haken in der Blase (K11)', () => {

  const karte = (page, name) =>
    page.locator('#kontakt-list .kk-card').filter({ hasText: name });

  async function verlaufOeffnen(page, name, opts) {
    await openKontakt(page, opts);
    await karte(page, name).locator('.kk-name').click();
    await expect(page.locator('#kontakt-list .kk-thread')).toHaveCount(1);
  }

  test('TC-KB-01: Eine gelesene Blase traegt einen Knopf', async ({ page }) => {
    await verlaufOeffnen(page, 'Anna Gelesen');
    const knopf = page.locator('#kontakt-list .kk-thread button.kk-ticks');
    await expect(knopf).not.toHaveCount(0);
  });

  test('TC-KB-02: Der Titel sagt, dass die Konversation gemeint ist',
    async ({ page }) => {
      /* Sonst erwartet man mehr, als geschieht — ein Lesezustand je
         Nachricht wird nicht gespeichert. */
      await verlaufOeffnen(page, 'Anna Gelesen');
      await expect(page.locator('#kontakt-list .kk-thread button.kk-ticks').first())
        .toHaveAttribute('title', /Konversation/i);
    });

  test('TC-KB-03: Die Wirkung ist an der Karte zu sehen', async ({ page }) => {
    /* Im offenen Verlauf kann eine Blase NIE ungelesen sein - `toggle()`
       markiert die Konversation beim Aufklappen als gelesen. Sichtbar wird
       die Wirkung deshalb an der Karte: Sie traegt danach die gruene Zahl
       statt des Hakens. Ein Test, der eine offene ungelesene Blase
       erwartet, prueft etwas Unmoegliches. */
    await verlaufOeffnen(page, 'Anna Gelesen', { allRead: true });
    await page.locator('#kontakt-list .kk-thread button.kk-ticks').first().click();
    await page.waitForTimeout(800);
    await expect(karte(page, 'Anna Gelesen').locator('.kk-state button.kk-ticks'),
      'die Karte zeigt weiter den Haken').toHaveCount(0);
  });

  test('TC-KB-04: Der Klick meldet es dem Server', async ({ page }) => {
    await verlaufOeffnen(page, 'Anna Gelesen');
    await page.locator('#kontakt-list .kk-thread button.kk-ticks').first().click();
    await page.waitForTimeout(700);
    const raus = page.__patches.filter((p) => p.body.kommentar_gelesen === false);
    expect(raus.length, 'kein PATCH mit kommentar_gelesen:false').toBe(1);
  });

  test('TC-KB-05: Der Klick klappt den Verlauf zu', async ({ page }) => {
    // Bliebe er offen, gaelte die Konversation beim naechsten Blick
    // sofort wieder als gelesen.
    await verlaufOeffnen(page, 'Anna Gelesen');
    await page.locator('#kontakt-list .kk-thread button.kk-ticks').first().click();
    await page.waitForTimeout(800);
    await expect(page.locator('#kontakt-list .kk-thread')).toHaveCount(0);
  });
});

// ════════════════════════════════════════════════════
//  F23 – Das Antwortfeld
// ════════════════════════════════════════════════════
// Aus dem Laden: „Die Nachrichtenbox ist sowohl auf dem Handy, als auch auf
// dem mobile zu klein. Die Box muss auch mit dem Text mitwachsen und Enter
// auf der Tastatur muss einen Zeilenumbruch erzeugen und nicht den Chat
// abschicken."

test.describe('Kontakt – Antwortfeld (F23)', () => {

  /** Öffnet die erste Konversation und gibt das Antwortfeld zurück. */
  async function feld(page) {
    await openKontakt(page);
    await cards(page).first().click();
    const ta = page.locator('textarea[id^="kk-rpt-"]').first();
    await expect(ta).toBeVisible({ timeout: 10000 });
    return ta;
  }

  /** Zählt abgesendete Antworten mit. Gesendet wird als PATCH mit
      `personal_antwort` — nicht als eigener POST. */
  function sendungen(page) {
    return () => (page.__patches || [])
      .filter((p) => p.body && p.body.personal_antwort !== undefined).length;
  }

  test('TC-F23-01: Enter bricht um und schickt nichts ab', async ({ page }) => {
    /* Der gemeldete Fall. Im Laden wird mehrzeilig geantwortet — eine
       halbe Nachricht ist beim Kunden nicht zurückzuholen. */
    const ta = await feld(page);
    const raus = sendungen(page);

    await ta.click();
    await page.keyboard.type('Erste Zeile');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Zweite Zeile');
    await page.waitForTimeout(400);

    expect(await ta.inputValue(), 'kein Zeilenumbruch im Feld')
      .toBe('Erste Zeile\nZweite Zeile');
    expect(raus(), 'Enter hat die Antwort abgeschickt').toBe(0);
    await expect(ta, 'das Feld ist verschwunden').toBeVisible();
  });

  test('TC-F23-02: Strg+Enter schickt weiterhin ab', async ({ page }) => {
    // Die Abkürzung für die Tastatur bleibt — nur nicht mehr auf Enter allein.
    const ta = await feld(page);
    const raus = sendungen(page);

    await ta.click();
    await page.keyboard.type('Kurze Antwort');
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(900);

    expect(raus(), 'Strg+Enter sendet nicht').toBe(1);
  });

  test('TC-F23-03: Das Feld wächst mit dem Text', async ({ page }) => {
    const ta = await feld(page);
    const vorher = (await ta.boundingBox()).height;

    await ta.click();
    for (let i = 0; i < 8; i++) {
      await page.keyboard.type(`Zeile ${i + 1}`);
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(300);
    const nachher = (await ta.boundingBox()).height;

    expect(nachher, `Höhe unverändert bei ${vorher}px`).toBeGreaterThan(vorher + 20);
  });

  test('TC-F23-04: Es schrumpft auch wieder', async ({ page }) => {
    /* Gegenstück zu TC-F23-03: Wer den Text wieder löscht, soll den
       Verlauf zurückbekommen — ein Feld, das nur wachsen kann, frisst
       die halbe Seite. */
    const ta = await feld(page);
    const leer = (await ta.boundingBox()).height;

    await ta.click();
    await page.keyboard.type('a\nb\nc\nd\ne\nf\ng\nh');
    await page.waitForTimeout(300);
    const voll = (await ta.boundingBox()).height;
    expect(voll).toBeGreaterThan(leer);

    await ta.fill('');
    await ta.dispatchEvent('input');
    await page.waitForTimeout(300);
    expect((await ta.boundingBox()).height,
      'bleibt aufgeblaeht').toBeLessThanOrEqual(leer + 2);
  });

  test('TC-F23-05: Das Feld nutzt die ganze Breite', async ({ page }) => {
    /* Der zweite Teil der Meldung. Bisher teilten sich Feld und drei
       Knöpfe eine Flex-Zeile; auf dem Handy blieb dem Feld rund ein
       Drittel. Jetzt steht es allein über die volle Breite. */
    const ta = await feld(page);
    const mass = await ta.evaluate((el) => ({
      feld: el.getBoundingClientRect().width,
      zeile: el.parentElement.getBoundingClientRect().width,
      hoehe: el.getBoundingClientRect().height,
    }));
    expect(mass.feld / mass.zeile,
      `Feld ${Math.round(mass.feld)}px von ${Math.round(mass.zeile)}px`)
      .toBeGreaterThan(0.9);
    expect(mass.hoehe, 'nur eine Zeile hoch').toBeGreaterThanOrEqual(110);
  });

  test('TC-F23-06: Sehr lange Texte sprengen die Seite nicht', async ({ page }) => {
    // Ohne Deckel schiebt ein langer Text den Verlauf aus dem Bild.
    const ta = await feld(page);
    await ta.fill(Array.from({ length: 40 }, (_, i) => `Zeile ${i}`).join('\n'));
    await ta.dispatchEvent('input');
    await page.waitForTimeout(300);

    const mass = await ta.evaluate((el) => ({
      hoehe: el.getBoundingClientRect().height,
      schirm: window.innerHeight,
      rollt: getComputedStyle(el).overflowY,
    }));
    expect(mass.hoehe, 'Feld ist höher als der halbe Schirm')
      .toBeLessThanOrEqual(mass.schirm * 0.5);
    expect(mass.rollt, 'kein Rollen trotz Deckel').toBe('auto');
  });
});