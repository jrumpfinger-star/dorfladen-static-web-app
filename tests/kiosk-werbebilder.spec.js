/* Werbebilder der Waage im Kiosk (specs/kiosk-werbebilder-upload/spec.md).
 *
 * Die Cloud-API (/api/waage-werbebilder) wird durch eine Attrappe mit Zustand ersetzt, die
 * mitschreibt, WAS der Kiosk an sie schickt - und in welcher Reihenfolge. Ihre eigene Pruefung
 * steht in `tests/test_waage_relais_api.py`, die der Bruecke in `tests/test_waage_bruecke.py`.
 */
const { test, expect } = require('./_kiosk-angemeldet');

const BASE = process.env.TEST_URL || 'http://127.0.0.1:8811';
const KIOSK_URL = /localhost|127\.0\.0\.1/.test(BASE) ? `${BASE}/kiosk.html` : `${BASE}/kiosk`;

// 1x1-GIF: ein gueltiges Bild fuer Miniaturen und Vorschau.
const GIF = Buffer.from('R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=', 'base64');

const BRUECKE_ONLINE = { bekannt: true, online: true, vor_s: 12, ok: true, fehler: '', initialisiert: true, direkt: 0 };

/**
 * @param {object} opts
 *   vollbild/dauer  Namen, die schon in der Cloud liegen (alle als "auf der Waage")
 *   wartend         Namen darunter, die noch auf die Bruecke warten
 *   bruecke         Status der Bruecke laut API (siehe BRUECKE_ONLINE)
 *   ablehnen        Dateinamen, die die API mit 415 ablehnt
 *   listeStatus     feste Antwort fuer die Liste (z. B. 503), sonst normal
 *   flags           feature_flags aus dem CMS
 */
async function mockApi(page, opts = {}) {
  const o = Object.assign({
    vollbild: ['10_fruehling.jpg', '20_sommer.gif'], dauer: ['banner.gif'], wartend: [],
    bruecke: BRUECKE_ONLINE, ablehnen: [], flags: { kiosk_werbebilder: true },
  }, opts);
  const eintrag = (n) => ({ name: n, groesse: 2048, etag: 'e' + n.length, status: o.wartend.includes(n) ? 'wartet' : 'auf_waage' });
  const zustand = { vollbild: o.vollbild.map(eintrag), dauer: o.dauer.map(eintrag), bruecke: o.bruecke };
  const log = [];

  await page.route(/\/api\//, (r) => {
    const json = (b) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
    if (/cms-config/.test(r.request().url())) {
      return json({ success: true, data: { feature_flags: o.flags } });
    }
    return json({ success: true, data: [] });
  });

  await page.route(/\/api\/waage-werbebilder/, async (r) => {
    const req = r.request();
    const u = new URL(req.url());
    const art = u.searchParams.get('art');
    const name = u.searchParams.get('name');
    const json = (status, b) => r.fulfill({ status, contentType: 'application/json; charset=utf-8', body: JSON.stringify(b) });
    const eintrag = { methode: req.method(), art, name, host: u.host, pfad: u.pathname };
    if (req.method() === 'POST') {
      eintrag.typ = req.headers()['content-type'];
      eintrag.kopf = (req.postDataBuffer() || Buffer.alloc(0)).slice(0, 3).toString('hex');
    }
    log.push(eintrag);
    if (!zustand[art] || !['vollbild', 'dauer'].includes(art)) return json(404, { success: false, error: 'Unbekannte Art' });

    if (req.method() === 'GET' && !name) {
      if (o.listeStatus) return json(o.listeStatus, { success: false, error: 'Speicher nicht erreichbar' });
      const liste = zustand[art].slice().sort((a, b) => a.name.localeCompare(b.name));
      return json(200, { success: true, art, max: 99, bruecke: zustand.bruecke, bilder: liste });
    }
    if (req.method() === 'GET') return r.fulfill({ status: 200, contentType: 'image/gif', body: GIF });
    if (req.method() === 'POST') {
      if (o.verzoegerung) await new Promise((res) => setTimeout(res, o.verzoegerung));
      if (o.ablehnen.includes(name)) return json(415, { success: false, error: 'Nur JPEG und GIF erlaubt' });
      if (!zustand[art].some((b) => b.name === name)) zustand[art].push({ name, groesse: GIF.length, etag: 'n' + name.length, status: 'wartet' });
      return json(200, { success: true, name, groesse: GIF.length, etag: 'x' });
    }
    if (req.method() === 'DELETE') {
      zustand[art] = zustand[art].filter((b) => b.name !== name);
      return json(200, { success: true });
    }
    return json(405, { success: false });
  });

  return {
    log, zustand,
    anfragen: (methode) => log.filter((l) => l.methode === methode),
    namen: (art) => zustand[art].map((b) => b.name),
  };
}

async function oeffne(page) {
  await page.goto(KIOSK_URL, { waitUntil: 'domcontentloaded' });
  await page.locator('.k-tab[data-tab="werbebilder"]').click();
  await expect(page.locator('#panel-werbebilder')).toHaveClass(/active/);
}

const jpg = (name) => ({ name, mimeType: 'image/jpeg', buffer: GIF });

/* Fuegt per paste-Ereignis ein, was die Zwischenablage haette: ein Bild (png/jpeg/gif) und/oder Text.
   `ziel` = CSS-Selektor des Ereignisziels (Standard: body). Liefert, ob das Ereignis abgefangen wurde. */
async function einfuegenEreignis(page, { typ, text, ziel, gifB64 } = {}) {
  return page.evaluate(async ({ typ, text, ziel, gifB64 }) => {
    const dt = new DataTransfer();
    if (typ === 'image/gif') {
      const bin = Uint8Array.from(atob(gifB64), (c) => c.charCodeAt(0));
      dt.items.add(new File([bin], 'bild.gif', { type: 'image/gif' }));
    } else if (typ) {
      const c = document.createElement('canvas'); c.width = 40; c.height = 20;
      const x = c.getContext('2d'); x.fillStyle = '#c00'; x.fillRect(0, 0, 40, 20);
      const blob = await new Promise((r) => c.toBlob(r, typ));
      dt.items.add(new File([blob], 'bild', { type: typ }));
    }
    if (text) dt.setData('text/plain', text);
    const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    (ziel ? document.querySelector(ziel) : document.body).dispatchEvent(ev);
    return ev.defaultPrevented;
  }, { typ, text, ziel, gifB64 });
}

/* Ersetzt die Zwischenablage-Schnittstelle: items = [{types:[...], blob}] oder 'fehler' / 'keine'. */
async function zwischenablage(page, was) {
  await page.evaluate(async (was) => {
    if (was === 'keine') { Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }); return; }
    const c = document.createElement('canvas'); c.width = 30; c.height = 30;
    const x = c.getContext('2d'); x.fillStyle = '#080'; x.fillRect(0, 0, 30, 30);
    const png = await new Promise((r) => c.toBlob(r, 'image/png'));
    const lesen = was === 'fehler' ? () => Promise.reject(new Error('NotAllowedError'))
      : was === 'text' ? () => Promise.resolve([{ types: ['text/plain'], getType: async () => new Blob(['hallo']) }])
      : () => Promise.resolve([{ types: ['text/plain', 'image/png'], getType: async (t) => (t === 'image/png' ? png : new Blob(['x'])) }]);
    Object.defineProperty(navigator, 'clipboard', { value: { read: lesen }, configurable: true });
  }, was);
}

/* Kamera-Attrappe: getUserMedia liefert einen Strom aus einem Canvas.
   modus: 'ok' | 'verweigert' | 'fehlt' (keine Schnittstelle). Zaehler in window.__stops / __facings. */
async function kameraAttrappe(page, modus = 'ok') {
  await page.addInitScript((modus) => {
    window.__stops = 0; window.__facings = [];
    const md = {
      getUserMedia: async (c) => {
        if (modus === 'verweigert') throw new DOMException('Permission denied', 'NotAllowedError');
        window.__facings.push(c.video.facingMode.ideal);
        const cv = document.createElement('canvas'); cv.width = 640; cv.height = 360;
        const x = cv.getContext('2d'); let t = 0;
        const zeichne = () => { x.fillStyle = 'hsl(' + ((t++ * 7) % 360) + ',70%,45%)'; x.fillRect(0, 0, 640, 360); };
        zeichne(); setInterval(zeichne, 100);
        const s = cv.captureStream(10);
        s.getTracks().forEach((tr) => { const stop = tr.stop.bind(tr); tr.stop = () => { window.__stops++; stop(); }; });
        return s;
      },
    };
    Object.defineProperty(navigator, 'mediaDevices', { value: modus === 'fehlt' ? undefined : md, configurable: true });
  }, modus);
}

test.describe('Werbebilder-Upload', () => {

  test('TC-F27-01: Foto aufnehmen - Live-Kamera, mehrere Fotos, JPEG, Kamera wird freigegeben', async ({ page }) => {
    await kameraAttrappe(page);
    const m = await mockApi(page);
    await oeffne(page);
    await page.locator('[data-wb="kamera"]').click();
    const video = page.locator('#wb-kam video');
    await expect(video).toBeVisible({ timeout: 10000 });
    await expect.poll(() => video.evaluate((v) => v.videoWidth), { timeout: 10000 }).toBeGreaterThan(0);

    await page.locator('[data-wb="kam-foto"]').click();
    await expect(page.locator('#wb-kam-zahl')).toContainText('1 Foto aufgenommen');
    // Die Knoepfe im Dialog muessen sichtbar gestaltet sein (Farbvariablen gelten auch ausserhalb von #wb-root).
    const stil = await page.locator('[data-wb="kam-foto"]').evaluate((e) => {
      const s = getComputedStyle(e); return { bg: s.backgroundColor, rand: s.borderTopColor, farbe: s.color };
    });
    expect(stil.bg).not.toBe('rgba(0, 0, 0, 0)');
    expect(stil.bg).not.toBe(stil.farbe);
    const randWechsel = await page.locator('[data-wb="kam-wechsel"]').evaluate((e) => getComputedStyle(e).borderTopColor);
    expect(randWechsel).not.toBe('rgba(0, 0, 0, 0)');
    await page.locator('[data-wb="kam-foto"]').click();
    await expect(page.locator('#wb-kam-zahl')).toContainText('2 Fotos aufgenommen');
    expect(await page.evaluate(() => window.__facings)).toEqual(['environment']);

    await page.locator('[data-wb="kam-wechsel"]').click();
    await expect.poll(() => page.evaluate(() => window.__facings.length)).toBe(2);
    expect(await page.evaluate(() => window.__facings[1])).toBe('user');

    await page.locator('[data-wb="kam-zu"]').click();
    await expect(page.locator('#wb-kam')).toHaveCount(0);
    expect(await page.evaluate(() => window.__stops)).toBeGreaterThanOrEqual(2);   // beide Stroeme beendet

    const namen = page.locator('#panel-werbebilder .wb-stage .wb-info b');
    await expect(namen).toHaveCount(2);
    const alle = await namen.allInnerTexts();
    expect(new Set(alle).size).toBe(2);
    for (const n of alle) expect(n).toMatch(/^Foto_\d{8}_\d{6}_\d+\.jpg$/);

    await page.locator('[data-wb="hoch"]').click();
    await expect(page.locator('#panel-werbebilder [data-wb-bild^="Foto_"]')).toHaveCount(2, { timeout: 15000 });
    expect(m.anfragen('POST').map((p) => [p.typ, p.kopf])).toEqual([['image/jpeg', 'ffd8ff'], ['image/jpeg', 'ffd8ff']]);
  });

  test('TC-F27-02: Esc, Antippen ausserhalb und Tab-Wechsel geben die Kamera frei; waehrend Uebertragung gesperrt', async ({ page }) => {
    await kameraAttrappe(page);
    await mockApi(page, { verzoegerung: 2000 });
    await oeffne(page);

    await page.locator('[data-wb="kamera"]').click();
    await expect(page.locator('#wb-kam video')).toBeVisible({ timeout: 10000 });
    await page.keyboard.press('Escape');
    await expect(page.locator('#wb-kam')).toHaveCount(0);
    expect(await page.evaluate(() => window.__stops)).toBe(1);

    await page.locator('[data-wb="kamera"]').click();
    await expect(page.locator('#wb-kam video')).toBeVisible({ timeout: 10000 });
    await page.locator('#wb-kam').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('#wb-kam')).toHaveCount(0);
    expect(await page.evaluate(() => window.__stops)).toBe(2);

    await page.locator('[data-wb="kamera"]').click();
    await expect(page.locator('#wb-kam video')).toBeVisible({ timeout: 10000 });
    await page.evaluate(() => K.switchTab('mittagstisch'));
    await expect(page.locator('#wb-kam')).toHaveCount(0, { timeout: 15000 });
    expect(await page.evaluate(() => window.__stops)).toBe(3);

    await page.locator('.k-tab[data-tab="werbebilder"]').click();
    await page.locator('#wb-datei').setInputFiles([jpg('x.jpg')]);
    await page.locator('[data-wb="hoch"]').click();
    await expect(page.locator('[data-wb="kamera"]')).toBeDisabled();
  });

  test('TC-F27-03: Kamera verweigert oder fehlt -> Hinweis und Kamera-App; Foto wird JPEG <= 1920 px', async ({ page }) => {
    for (const modus of ['verweigert', 'fehlt']) {
      const seite = await page.context().newPage();
      await kameraAttrappe(seite, modus);
      await mockApi(seite);
      await oeffne(seite);
      await expect(seite.locator('#wb-kamera')).toHaveAttribute('capture', 'environment');
      await expect(seite.locator('#wb-kamera')).toHaveAttribute('accept', 'image/*');
      await expect(seite.locator('label[data-wb-kamera-app]')).toHaveCount(0);
      await seite.locator('[data-wb="kamera"]').click();
      await expect(seite.locator('#panel-werbebilder .wb-warn').filter({ hasText: 'nicht verfügbar oder nicht erlaubt' })).toBeVisible({ timeout: 10000 });
      await expect(seite.locator('#wb-kam')).toHaveCount(0);

      const gross = Buffer.from(await seite.evaluate(async () => {
        const c = document.createElement('canvas'); c.width = 3000; c.height = 1500;
        const x = c.getContext('2d'); x.fillStyle = '#0a0'; x.fillRect(0, 0, 3000, 1500);
        return c.toDataURL('image/png').split(',')[1];
      }), 'base64');
      const [fc] = await Promise.all([
        seite.waitForEvent('filechooser'),
        seite.locator('label[data-wb-kamera-app]').click(),
      ]);
      await fc.setFiles({ name: 'IMG_0001.png', mimeType: 'image/png', buffer: gross });
      const name = seite.locator('#panel-werbebilder .wb-stage .wb-info b');
      await expect(name).toHaveText(/^Foto_\d{8}_\d{6}_\d+\.jpg$/, { timeout: 15000 });
      await expect(seite.locator('#panel-werbebilder .wb-stage .wb-thumb img')).toBeVisible();
      const breite = await seite.locator('#panel-werbebilder .wb-stage .wb-thumb img').evaluate((i) => i.naturalWidth);
      expect(breite).toBe(1920);
      await seite.close();
    }
  });

  test('TC-F1-01: Tab ist da, braucht keine Anmeldung, zeigt die Bruecke als online', async ({ page }) => {
    await mockApi(page);
    await oeffne(page);
    await expect(page.locator('#wb-stat')).toContainText('Brücke online', { timeout: 15000 });
    await expect(page.locator('#panel-werbebilder input[type="password"]')).toHaveCount(0);
    await expect(page.locator('#panel-werbebilder .wb-drop')).toBeVisible();
  });

  test('TC-F1-02: Schalter aus blendet den Tab aus', async ({ page }) => {
    await mockApi(page, { flags: { kiosk_werbebilder: false } });
    await page.goto(KIOSK_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.k-tab[data-tab="werbebilder"]')).toBeHidden({ timeout: 15000 });
  });

  test('TC-F2-01: nur Vollbild und Dauerwerbung, nie ein Monatsverzeichnis', async ({ page }) => {
    const m = await mockApi(page);
    await oeffne(page);
    const arten = page.locator('#panel-werbebilder [data-wb="art"]');
    await expect(arten).toHaveText(['Vollbild', 'Dauerwerbung']);
    await expect(page.locator('#panel-werbebilder .wb-item')).toHaveCount(2);
    await arten.nth(1).click();
    await expect(page.locator('#panel-werbebilder .wb-item')).toHaveCount(1);
    for (const l of m.log) expect(['vollbild', 'dauer']).toContain(l.art);
    expect(m.log.some((l) => l.art === 'dauer')).toBe(true);
  });

  test('TC-F5-01: Liste in Namensreihenfolge mit Position und Zaehler', async ({ page }) => {
    await mockApi(page, { vollbild: ['30_c.jpg', '10_a.jpg', '20_b.gif'] });
    await oeffne(page);
    const namen = page.locator('#panel-werbebilder [data-wb-bild]');
    await expect(namen).toHaveCount(3);
    await expect(namen.locator('.wb-info b')).toHaveText(['10_a.jpg', '20_b.gif', '30_c.jpg']);
    await expect(namen.locator('.wb-pos')).toHaveText(['1', '2', '3']);
    await expect(page.locator('#wb-zaehl')).toHaveText('3 / 99');
  });

  test('TC-F3-01: Dateiwahl zeigt Vorschau, Hochladen sendet jede Datei und fuellt die Liste', async ({ page }) => {
    const m = await mockApi(page);
    await oeffne(page);
    await page.locator('#wb-datei').setInputFiles([jpg('neu1.jpg'), jpg('neu2.jpg')]);
    await expect(page.locator('#panel-werbebilder .wb-stage .wb-item')).toHaveCount(2);
    await expect(page.locator('#panel-werbebilder .wb-stage .wb-thumb img')).toHaveCount(2);
    expect(m.anfragen('POST')).toHaveLength(0);

    await page.locator('[data-wb="hoch"]').click();
    await expect(page.locator('#panel-werbebilder [data-wb-bild]')).toHaveCount(4, { timeout: 15000 });
    expect(m.anfragen('POST').map((l) => l.name)).toEqual(['neu1.jpg', 'neu2.jpg']);
    expect(m.anfragen('POST').every((l) => l.art === 'vollbild')).toBe(true);
    await expect(page.locator('#panel-werbebilder .wb-stage')).toHaveCount(0);
  });

  test('TC-F3-02: Ziehen und Ablegen nimmt Dateien an', async ({ page }) => {
    await mockApi(page);
    await oeffne(page);
    await page.evaluate((b64) => {
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const dt = new DataTransfer();
      dt.items.add(new File([bin], 'gezogen.gif', { type: 'image/gif' }));
      document.getElementById('wb-root').dispatchEvent(
        new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    }, GIF.toString('base64'));
    await expect(page.locator('#panel-werbebilder .wb-stage .wb-info b')).toHaveText('gezogen.gif');
  });

  test('TC-F4-01: PNG und PDF werden abgewiesen, ohne Anfrage', async ({ page }) => {
    const m = await mockApi(page);
    await oeffne(page);
    await page.locator('#wb-datei').setInputFiles([
      { name: 'logo.png', mimeType: 'image/png', buffer: GIF },
      { name: 'preis.pdf', mimeType: 'application/pdf', buffer: GIF },
    ]);
    await expect(page.locator('#panel-werbebilder .wb-warn').first()).toContainText('logo.png');
    await expect(page.locator('#panel-werbebilder .wb-stage .wb-item')).toHaveCount(0);
    expect(m.anfragen('POST')).toHaveLength(0);
  });

  test('TC-F6-01: Loeschen fragt nach; Abbrechen sendet nichts', async ({ page }) => {
    const m = await mockApi(page);
    await oeffne(page);
    await expect(page.locator('#panel-werbebilder [data-wb-bild]')).toHaveCount(2);

    await page.locator('[data-wb-bild="10_fruehling.jpg"] [data-wb="loeschen"]').click();
    await page.locator('[data-wb="dlg-nein"]').click();
    expect(m.anfragen('DELETE')).toHaveLength(0);
    await expect(page.locator('#panel-werbebilder [data-wb-bild]')).toHaveCount(2);

    await page.locator('[data-wb-bild="10_fruehling.jpg"] [data-wb="loeschen"]').click();
    await page.locator('[data-wb="dlg-ja"]').click();
    await expect(page.locator('#panel-werbebilder [data-wb-bild]')).toHaveCount(1);
    expect(m.anfragen('DELETE').map((l) => `${l.art}/${l.name}`)).toEqual(['vollbild/10_fruehling.jpg']);
  });

  test('TC-F7-01: Alle ersetzen laedt erst hoch und loescht dann die alten', async ({ page }) => {
    const m = await mockApi(page);
    await oeffne(page);
    await page.locator('#wb-datei').setInputFiles([jpg('ostern.jpg')]);
    await page.locator('[data-wb="ersetzen"]').click();
    await page.locator('[data-wb="dlg-ja"]').click();
    await expect(page.locator('#panel-werbebilder [data-wb-bild]')).toHaveCount(1, { timeout: 15000 });

    const folge = m.log.filter((l) => l.methode === 'POST' || l.methode === 'DELETE').map((l) => l.methode);
    expect(folge).toEqual(['POST', 'DELETE', 'DELETE']);
    expect(m.namen('vollbild')).toEqual(['ostern.jpg']);
  });

  test('TC-F7-02: Schlaegt ein Upload fehl, wird nichts geloescht', async ({ page }) => {
    const m = await mockApi(page, { ablehnen: ['kaputt.jpg'] });
    await oeffne(page);
    await page.locator('#wb-datei').setInputFiles([jpg('gut.jpg'), jpg('kaputt.jpg')]);
    await page.locator('[data-wb="ersetzen"]').click();
    await page.locator('[data-wb="dlg-ja"]').click();
    await expect(page.locator('#panel-werbebilder .wb-item.wb-fehler')).toContainText('Nur JPEG und GIF erlaubt', { timeout: 15000 });
    expect(m.anfragen('DELETE')).toHaveLength(0);
    expect(m.namen('vollbild')).toEqual(expect.arrayContaining(['10_fruehling.jpg', '20_sommer.gif', 'gut.jpg']));
  });

  test('TC-F19-01: Bruecke online / offline seit ... / noch nie gemeldet; Hochladen geht immer', async ({ page }) => {
    const m = await mockApi(page, { bruecke: { bekannt: true, online: false, vor_s: 7200, ok: true, fehler: '', initialisiert: true, direkt: 0 } });
    await oeffne(page);
    await expect(page.locator('#wb-stat')).toContainText('offline seit 2 Std.', { timeout: 15000 });
    await expect(page.locator('#panel-werbebilder .wb-warn').first()).toContainText('sobald sie wieder läuft');
    await page.locator('#wb-datei').setInputFiles([jpg('trotzdem.jpg')]);
    await page.locator('[data-wb="hoch"]').click();
    await expect(page.locator('[data-wb-bild="trotzdem.jpg"]')).toBeVisible({ timeout: 15000 });
    expect(m.anfragen('POST')).toHaveLength(1);
  });

  test('TC-F19-01: Bruecke noch nie gemeldet', async ({ page }) => {
    await mockApi(page, { bruecke: { bekannt: false, online: false, vor_s: null, ok: false, fehler: '', initialisiert: false, direkt: 0 } });
    await oeffne(page);
    await expect(page.locator('#wb-stat')).toContainText('noch nie gemeldet', { timeout: 15000 });
    await expect(page.locator('#panel-werbebilder .wb-warn').first()).toContainText('noch nie gemeldet');
  });

  test('TC-F19-01: Fehler beim letzten Abgleich wird gezeigt', async ({ page }) => {
    await mockApi(page, { bruecke: Object.assign({}, BRUECKE_ONLINE, { ok: false, fehler: 'Waage nicht erreichbar: Verbindung abgelehnt' }) });
    await oeffne(page);
    await expect(page.locator('#panel-werbebilder .wb-warn').first()).toContainText('Verbindung abgelehnt', { timeout: 15000 });
    await expect(page.locator('#wb-stat')).toContainText('mit Fehler');
  });

  test('TC-F19-02: je Bild "auf der Waage" oder "wartet auf Uebertragung"', async ({ page }) => {
    await mockApi(page, { wartend: ['20_sommer.gif'] });
    await oeffne(page);
    const a = page.locator('[data-wb-bild="10_fruehling.jpg"] .wb-sync');
    const b = page.locator('[data-wb-bild="20_sommer.gif"] .wb-sync');
    await expect(a).toContainText('auf der Waage', { timeout: 15000 });
    await expect(b).toContainText('wartet auf Übertragung');
  });

  test('TC-F19-03: Die Liste aktualisiert sich von selbst, ohne Klick', async ({ page }) => {
    const m = await mockApi(page, { wartend: ['20_sommer.gif'] });
    await oeffne(page);
    const b = page.locator('[data-wb-bild="20_sommer.gif"] .wb-sync');
    await expect(b).toContainText('wartet auf Übertragung', { timeout: 15000 });
    const vorher = m.anfragen('GET').filter((l) => !l.name).length;
    m.zustand.vollbild.find((x) => x.name === '20_sommer.gif').status = 'auf_waage';   // Bruecke hat uebertragen
    await expect(b).toContainText('auf der Waage', { timeout: 20000 });
    expect(m.anfragen('GET').filter((l) => !l.name).length).toBeGreaterThan(vorher);
  });

  test('TC-F26-01: Strg+V mit einem PNG legt ein JPEG in "Zum Hochladen"; Hochladen sendet echtes JPEG', async ({ page }) => {
    const m = await mockApi(page);
    await oeffne(page);
    const abgefangen = await einfuegenEreignis(page, { typ: 'image/png' });
    expect(abgefangen).toBe(true);
    const name = page.locator('#panel-werbebilder .wb-stage .wb-info b');
    await expect(name).toHaveCount(1, { timeout: 10000 });
    await expect(name).toHaveText(/^Zwischenablage_\d{8}_\d{6}_\d+\.jpg$/);
    await expect(page.locator('#panel-werbebilder .wb-stage .wb-thumb img')).toHaveCount(1);
    expect(m.anfragen('POST')).toHaveLength(0);
    await page.locator('[data-wb="hoch"]').click();
    await expect(page.locator('#panel-werbebilder [data-wb-bild^="Zwischenablage_"]')).toHaveCount(1, { timeout: 15000 });
    const post = m.anfragen('POST')[0];
    expect(post.typ).toBe('image/jpeg');
    expect(post.kopf).toBe('ffd8ff');
    expect(post.name).toMatch(/\.jpg$/);
  });

  test('TC-F26-02: GIF bleibt GIF, JPEG bleibt JPEG', async ({ page }) => {
    const m = await mockApi(page);
    await oeffne(page);
    await einfuegenEreignis(page, { typ: 'image/gif', gifB64: GIF.toString('base64') });
    await einfuegenEreignis(page, { typ: 'image/jpeg' });
    const namen = page.locator('#panel-werbebilder .wb-stage .wb-info b');
    await expect(namen).toHaveCount(2, { timeout: 10000 });
    await expect(namen.nth(0)).toHaveText(/\.gif$/);
    await expect(namen.nth(1)).toHaveText(/\.jpg$/);
    await page.locator('[data-wb="hoch"]').click();
    await expect(page.locator('#panel-werbebilder [data-wb-bild^="Zwischenablage_"]')).toHaveCount(2, { timeout: 15000 });
    const posts = m.anfragen('POST');
    expect(posts.map((p) => [p.typ, p.kopf])).toEqual([['image/gif', '474946'], ['image/jpeg', 'ffd8ff']]);
  });

  test('TC-F26-03: Text in der Zwischenablage legt nichts ab und wird nicht abgefangen', async ({ page }) => {
    await mockApi(page);
    await oeffne(page);
    const abgefangen = await einfuegenEreignis(page, { text: 'nur Text' });
    expect(abgefangen).toBe(false);
    await page.evaluate(() => { const i = document.createElement('input'); i.id = 'fremd'; document.body.appendChild(i); });
    const imFeld = await einfuegenEreignis(page, { typ: 'image/png', ziel: '#fremd' });
    expect(imFeld).toBe(false);
    await page.waitForTimeout(500);
    await expect(page.locator('#panel-werbebilder .wb-stage')).toHaveCount(0);
  });

  test('TC-F26-04: Knopf liest die Zwischenablage; ohne Bild/Berechtigung/Schnittstelle kommt ein Hinweis', async ({ page }) => {
    await mockApi(page);
    await oeffne(page);
    await zwischenablage(page, 'bild');
    await page.locator('[data-wb="einfuegen"]').click();
    await expect(page.locator('#panel-werbebilder .wb-stage .wb-info b')).toHaveText(/^Zwischenablage_.*\.jpg$/, { timeout: 10000 });

    await zwischenablage(page, 'text');
    await page.locator('[data-wb="einfuegen"]').click();
    await expect(page.locator('#panel-werbebilder .wb-warn').filter({ hasText: 'kein Bild' })).toBeVisible();

    await zwischenablage(page, 'fehler');
    await page.locator('[data-wb="einfuegen"]').click();
    await expect(page.locator('#panel-werbebilder .wb-warn').filter({ hasText: 'Strg+V' })).toBeVisible();

    await zwischenablage(page, 'keine');
    await page.locator('[data-wb="einfuegen"]').click();
    await expect(page.locator('#panel-werbebilder .wb-warn').filter({ hasText: 'Strg+V' })).toBeVisible();
    await expect(page.locator('#wb-paste')).toBeVisible();
  });

  test('TC-F26-04: Einfuegen per Langdruck-Feld (#wb-paste) nimmt das Bild auf und bleibt leer', async ({ page }) => {
    await mockApi(page);
    await oeffne(page);
    const abgefangen = await einfuegenEreignis(page, { typ: 'image/png', ziel: '#wb-paste' });
    expect(abgefangen).toBe(true);
    await expect(page.locator('#panel-werbebilder .wb-stage .wb-info b')).toHaveCount(1, { timeout: 10000 });
    await expect(page.locator('#wb-paste')).toHaveText('');
  });

  test('TC-F26-05: Waehrend der Uebertragung und bei offenem Dialog wird nichts aufgenommen; Namen sind eindeutig', async ({ page }) => {
    await mockApi(page, { verzoegerung: 1500 });
    await oeffne(page);
    await einfuegenEreignis(page, { typ: 'image/png' });
    await einfuegenEreignis(page, { typ: 'image/png' });
    const namen = page.locator('#panel-werbebilder .wb-stage .wb-info b');
    await expect(namen).toHaveCount(2, { timeout: 10000 });
    const alle = await namen.allInnerTexts();
    expect(new Set(alle).size).toBe(2);

    await page.locator('[data-wb="hoch"]').click();
    await expect(page.locator('[data-wb="hoch"]')).toBeDisabled();
    await einfuegenEreignis(page, { typ: 'image/png' });
    await expect(page.locator('#panel-werbebilder [data-wb-bild^="Zwischenablage_"]')).toHaveCount(2, { timeout: 20000 });
    await expect(page.locator('#panel-werbebilder .wb-stage')).toHaveCount(0);

    await page.locator('[data-wb-bild="10_fruehling.jpg"] [data-wb="loeschen"]').click();
    const imDialog = await einfuegenEreignis(page, { typ: 'image/png' });
    expect(imDialog).toBe(false);
    await page.locator('[data-wb="dlg-nein"]').click();
    await expect(page.locator('#panel-werbebilder .wb-stage')).toHaveCount(0);
  });

  test('TC-F25-01: keine Adress- und Test-Bedienelemente, alles geht an die eigene API', async ({ page }) => {
    const hosts = new Set();
    page.on('request', (r) => { if (/waage-werbebilder|:8765/.test(r.url())) hosts.add(new URL(r.url()).host); });
    const m = await mockApi(page);
    await oeffne(page);
    await expect(page.locator('#panel-werbebilder [data-wb-bild]')).toHaveCount(2);
    for (const sel of ['#wb-host', '#wb-port', '#wb-schema', '[data-wb="einst"]', '[data-wb="url-test"]', '[data-wb="url-speichern"]']) {
      await expect(page.locator('#panel-werbebilder ' + sel)).toHaveCount(0);
    }
    expect(Array.from(hosts)).toEqual([new URL(KIOSK_URL).host]);
    expect(m.log.every((l) => l.pfad === '/api/waage-werbebilder')).toBe(true);
  });

  test('Fehler: Speicher nicht erreichbar (503) -> Hinweis in einem Satz', async ({ page }) => {
    await mockApi(page, { listeStatus: 503 });
    await oeffne(page);
    await expect(page.locator('#panel-werbebilder .wb-fehler')).toContainText('Bilderspeicher', { timeout: 15000 });
  });

  test('Fehler: keine Verbindung zur Seite -> Hinweis', async ({ page }) => {
    await mockApi(page);
    await page.route(/\/api\/waage-werbebilder/, (r) => r.abort('connectionrefused'));
    await oeffne(page);
    await expect(page.locator('#panel-werbebilder .wb-fehler')).toContainText('Keine Verbindung', { timeout: 15000 });
  });

  test('Fehler: unerwartete Antwort (HTML statt JSON) -> klarer Hinweis mit Statuscode', async ({ page }) => {
    await mockApi(page);
    await page.route(/\/api\/waage-werbebilder/, (r) => r.fulfill({ status: 504, contentType: 'text/html', body: '<h1>Gateway Timeout</h1>' }));
    await oeffne(page);
    await expect(page.locator('#panel-werbebilder .wb-fehler')).toContainText('unerwartet geantwortet (HTTP 504)', { timeout: 15000 });
  });

  test('TC-F15-04: Bilder direkt im Ordner werden mit Hinweis auf den Vorrang gemeldet', async ({ page }) => {
    await mockApi(page, { bruecke: Object.assign({}, BRUECKE_ONLINE, { direkt: 3 }) });
    await oeffne(page);
    await expect(page.locator('#panel-werbebilder .wb-warn')).toContainText('liegen 3 Bild', { timeout: 15000 });
    await expect(page.locator('#panel-werbebilder .wb-warn')).toContainText('fullscreen');
  });

  test('Vorschau: Miniatur oeffnet die Grossansicht, Esc schliesst, Pfeile blaettern', async ({ page }) => {
    await mockApi(page);
    await oeffne(page);
    await expect(page.locator('#panel-werbebilder .wb-thumb img').first()).toBeVisible({ timeout: 15000 });
    await page.locator('[data-wb-bild="10_fruehling.jpg"] .wb-thumb').click();
    const lb = page.locator('#wb-lb');
    await expect(lb.locator('img')).toBeVisible();
    await expect(lb.locator('.wb-lb-name')).toContainText('10_fruehling.jpg');
    await page.keyboard.press('ArrowRight');
    await expect(lb.locator('.wb-lb-name')).toContainText('20_sommer.gif');
    await page.keyboard.press('Escape');
    await expect(lb).toHaveCount(0);
  });

  test('Vorschau: auch ein noch nicht hochgeladenes Bild laesst sich gross ansehen', async ({ page }) => {
    await mockApi(page);
    await oeffne(page);
    await page.locator('#wb-datei').setInputFiles([jpg('vorab.jpg')]);
    await page.locator('.wb-stage .wb-thumb').click();
    await expect(page.locator('#wb-lb img')).toBeVisible();
    await expect(page.locator('#wb-lb .wb-lb-name')).toContainText('vorab.jpg');
    await page.locator('[data-wb="lb-zu"]').click();
    await expect(page.locator('#wb-lb')).toHaveCount(0);
  });

  test('Layout: keine waagerechte Verschiebung, Tippflaechen mindestens 44 px', async ({ page }) => {
    await mockApi(page);
    await oeffne(page);
    await expect(page.locator('#panel-werbebilder [data-wb-bild]')).toHaveCount(2);
    const ueberlauf = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(ueberlauf).toBeLessThanOrEqual(1);
    for (const sel of ['[data-wb="art"]', '[data-wb="loeschen"]', '[data-wb="neu"]']) {
      const boxen = await page.locator('#panel-werbebilder ' + sel).evaluateAll(
        (els) => els.map((e) => e.getBoundingClientRect().height));
      for (const h of boxen) expect(h).toBeGreaterThanOrEqual(43.5);
    }
  });
});

test.describe('Service Worker und LAN-Adressen', () => {
  // sw.js in einer Sandbox ausfuehren und Fetch-Ereignisse einspeisen.
  function swFetch(url, mode) {
    const fs = require('fs');
    const path = require('path');
    const vm = require('vm');
    const handler = {};
    const self = {
      location: { origin: 'https://www.dorfladen-oberornau.de' },
      addEventListener: (n, f) => { handler[n] = f; },
      clients: { claim() {} }, skipWaiting() {},
    };
    const ctx = vm.createContext({ self, URL, Response: function () {}, caches: { match: () => Promise.resolve(undefined), open: () => Promise.resolve({}) }, fetch: () => Promise.resolve({}), console });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'static-site', 'sw.js'), 'utf8'), ctx);
    let beantwortet = false;
    handler.fetch({ request: { url, mode: mode || 'cors', destination: '', method: 'GET' }, respondWith() { beantwortet = true; } });
    return beantwortet;
  }

  test('TC-F25-02: Anfragen an Geraete im LAN beantwortet der Service Worker nicht', () => {
    expect(swFetch('http://192.168.1.27:8765/health')).toBe(false);
    expect(swFetch('http://waage-pc:8765/health')).toBe(false);
    expect(swFetch('https://192.168.1.27:8765/health')).toBe(false);
  });

  test('TC-F25-02: eigene Seiten, die API und Bilder laufen weiter ueber den Service Worker', () => {
    expect(swFetch('https://www.dorfladen-oberornau.de/kiosk', 'navigate')).toBe(true);
    expect(swFetch('https://www.dorfladen-oberornau.de/js/kiosk-werbebilder.js')).toBe(true);
    expect(swFetch('https://www.dorfladen-oberornau.de/api/waage-werbebilder?art=vollbild')).toBe(true);
    expect(swFetch('https://fonts.gstatic.com/s/inter.woff2')).toBe(true);
  });
});
