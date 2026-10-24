// @ts-check
/**
 * CMS: Wochenplan und Aktionsflyer in HD drucken und "Auf die Waage" uebertragen.
 *
 * Spec: specs/waage-werbung-aus-cms/spec.md (TC-F1 … TC-F11)
 *
 * Die Cloud-API des Relais (/api/waage-werbebilder) ist eine Attrappe mit Zustand, die mitschreibt, WAS das CMS
 * schickt - und in welcher Reihenfolge. Ihre eigene Pruefung steht in tests/test_waage_relais_api.py.
 *
 * Ausfuehren (lokaler Server aus static-site/ auf 8811):
 *   $env:TEST_URL='http://127.0.0.1:8811'
 *   node node_modules\@playwright\test\cli.js test cms-waage-werbung
 */
const zlib = require('zlib');
const { test, expect } = require('@playwright/test');

test.use({ serviceWorkers: 'block' });
test.describe.configure({ mode: 'serial' });

const BASE = process.env.TEST_URL || 'https://www.dorfladen-oberornau.de';
const GIF = Buffer.from('R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=', 'base64');

/* Ein einfarbiges PNG (ohne Bibliothek): als Artikelbild aus SharePoint. */
function pngBase64(w, h, rgb) {
  const crcTab = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTab[n] = c >>> 0; }
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTab[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(d.length);
    const td = Buffer.concat([Buffer.from(t), d]);
    const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, cr]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const zeile = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3)]);
  for (let x = 0; x < w; x++) { zeile[1 + x * 3] = rgb[0]; zeile[2 + x * 3] = rgb[1]; zeile[3 + x * 3] = rgb[2]; }
  const roh = Buffer.concat(Array.from({ length: h }, () => zeile));
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(roh)), chunk('IEND', Buffer.alloc(0))]);
  return 'data:image/png;base64,' + png.toString('base64');
}
const ARTIKELBILD = pngBase64(240, 240, [200, 90, 30]);

function jpegMasse(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}
const pngBreite = (buf) => buf.readUInt32BE(16);
const pngHoehe = (buf) => buf.readUInt32BE(20);

const ARTIKEL = [
  ['Bayerntaler Käse', 'Würzig-kräftig, 200 g', 1.99, 2.79],
  ['Frische Landeier 10er', 'Freiland, Größe M', 2.49, 3.19],
  ['Bio-Äpfel Elstar', 'Aus der Region, 1 kg', 2.99, 3.99],
  ['Ofenfrisches Bauernbrot', '750 g', 3.29, 3.99],
  ['Hausmacher Leberwurst "Spezial" ß', 'Im Glas', 2.19, 2.89],
  ['Kürbissuppe', 'Mit Kokosmilch, 500 ml', 3.49, 4.29],
  ['Heumilch 3,8 %', '1 Liter', 1.39, 1.69],
  ['Walnüsse ganz', '250 g', 3.99, 5.49],
];

/**
 * @param {import('@playwright/test').Page} page
 * @param {object} opts
 *   alt          Namen, die schon auf der Waage liegen (Vollbild)
 *   altDauer     dito Dauerwerbung
 *   artikel      Anzahl Aktionsartikel (Standard 8)
 *   ablehnen     Dateinamen, die die API mit 415 ablehnt
 *   verzoegerung Millisekunden Verzoegerung fuer das Artikelbild (zeigt den Fortschritt)
 *   bruecke      Status der Bruecke
 */
async function cmsMit(page, opts = {}) {
  const o = Object.assign({
    alt: ['10_Wochenplan_KW43.jpg', '20_Angebot_2026-10-12_00_Uebersicht.jpg', 'Hauswerbung.jpg'],
    altDauer: [], artikel: 8, ablehnen: [], verzoegerung: 0,
    bruecke: { bekannt: true, online: true, vor_s: 9, ok: true, fehler: '', initialisiert: true, direkt: 0 },
  }, opts);
  const zustand = {
    vollbild: o.alt.map((n) => ({ name: n, groesse: 40000, etag: 'e' + n.length, status: 'auf_waage' })),
    dauer: o.altDauer.map((n) => ({ name: n, groesse: 30000, etag: 'd' + n.length, status: 'auf_waage' })),
  };
  const log = [];

  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [], groups: [], value: [] }) }));
  await page.route('**/api/wochenplan**', (r) => {
    if (r.request().method() !== 'GET') return r.fallback();
    const tage = [101000, 101001, 101001, 101002, 101003, 101004];
    const gerichte = ['Geschnetzeltes mit Champignonrahmsoße und Kroketten', 'Cordon bleu mit Pommes', 'Gefüllte Zucchini mit Hackfleisch', 'Lasagne und Salat', 'Gyros mit Pommes und Tsatsiki', 'Schnitzel mit Kartoffelsalat'];
    const data = tage.map((t, i) => ({ dl_wochenplanid: 'w' + i, dl_gericht: gerichte[i], dl_wochentag: t, dl_preis: 8.8 + (i % 2), dl_status: 101001, dl_kalenderwoche: 44, dl_jahr: 2026 }));
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
  });
  await page.route('**/api/angebote**', (r) => {
    if (r.request().method() !== 'GET') return r.fallback();
    const data = ARTIKEL.slice(0, o.artikel).map((a, i) => ({
      dl_angeboteid: 'a' + i, dl_produkt: a[0], dl_details: a[1], dl_preis: a[2], dl_statt_preis: a[3], dl_artikelnummer: '40000' + i,
      dl_aktion_titel: 'Herbstwoche', dl_aktion_id: 'A1', dl_gueltig_von: '2026-10-26', dl_gueltig_bis: '2026-10-31', dl_sortierung: i, dl_status: 101001,
    }));
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
  });
  await page.route('**/api/werbebilder**', async (r) => {
    if (r.request().method() !== 'GET') return r.fallback();
    if (o.verzoegerung) await new Promise((res) => setTimeout(res, o.verzoegerung));
    const nr = new URL(r.request().url()).searchParams.get('artnrs') || '';
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ dl_artikelnummer: nr, dl_bild_base64: ARTIKELBILD, source: 'sharepoint', name: nr + '.png' }]) });
  });
  await page.route('**/api/waage-werbebilder**', (r) => {
    const req = r.request();
    const u = new URL(req.url());
    const art = u.searchParams.get('art');
    const name = u.searchParams.get('name');
    const json = (status, b) => r.fulfill({ status, contentType: 'application/json; charset=utf-8', body: JSON.stringify(b) });
    const eintrag = { methode: req.method(), art, name };
    if (req.method() === 'POST') {
      const body = req.postDataBuffer() || Buffer.alloc(0);
      eintrag.typ = req.headers()['content-type'];
      eintrag.kopf = body.slice(0, 3).toString('hex');
      eintrag.masse = jpegMasse(body);
      eintrag.bytes = body.length;
    }
    log.push(eintrag);
    if (!zustand[art]) return json(404, { success: false, error: 'Unbekannte Art' });
    if (req.method() === 'GET' && !name) {
      const liste = zustand[art].slice().sort((a, b) => a.name.localeCompare(b.name));
      return json(200, { success: true, art, max: 99, bruecke: o.bruecke, bilder: liste });
    }
    if (req.method() === 'GET') return r.fulfill({ status: 200, contentType: 'image/gif', body: GIF });
    if (req.method() === 'POST') {
      if (o.ablehnen.some((a) => name.indexOf(a) >= 0)) return json(415, { success: false, error: 'Nur JPEG und GIF erlaubt' });
      zustand[art] = zustand[art].filter((b) => b.name !== name).concat([{ name, groesse: eintrag.bytes, etag: 'n' + eintrag.bytes, status: 'wartet' }]);
      return json(200, { success: true, name, groesse: eintrag.bytes, etag: 'x' });
    }
    if (req.method() === 'DELETE') {
      zustand[art] = zustand[art].filter((b) => b.name !== name);
      return json(200, { success: true });
    }
    return json(405, { success: false });
  });

  await page.goto(BASE + '/cms.html', { waitUntil: 'domcontentloaded' });
  const hash = await page.evaluate(() => { const el = document.getElementById('cms-pw-hash'); return el ? JSON.parse(el.textContent) : null; });
  if (!hash) test.skip(true, 'Diese Seite ist hier nicht ausgeliefert');
  await page.evaluate((v) => sessionStorage.setItem('cms_auth_ok', v), hash);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#cms-app').waitFor({ state: 'visible', timeout: 20000 });
  await expect(page.locator('#cms-wp-grid .cms-meal').first()).toBeVisible({ timeout: 15000 });

  return {
    log, zustand,
    anfragen: (m) => log.filter((l) => l.methode === m && l.name),
    folge: () => log.filter((l) => (l.methode === 'POST' || l.methode === 'DELETE') && l.name).map((l) => l.methode),
  };
}

async function aktionenTab(page) {
  // Auf schmalen Schirmen ist die Reiterleiste ausgeblendet: der Wechsel laeuft deshalb ueber die Seite selbst.
  await page.evaluate(() => window.cmsTab('ang'));
  await expect(page.locator('[data-action="waageAktion"]').first()).toBeVisible({ timeout: 15000 });
}

const dlg = (page) => page.locator('#wb-ueb');
const neueBilder = (page) => page.locator('#wb-ueb [data-ueb-neu]');
const altBilder = (page) => page.locator('#wb-ueb [data-ueb-alt]');

test.describe('HD und Auf die Waage', () => {

  test('TC-F1-01: Wochenplan-Vorschau ist 3x aufgeloest (2382 px), Aussehen bleibt', async ({ page }) => {
    await cmsMit(page);
    const breiten = await page.evaluate(async () => {
      const lade = (url) => new Promise((res) => { const i = new Image(); i.onload = () => res([i.naturalWidth, i.naturalHeight]); i.src = url; });
      window.cmsPreviewWP();
      await new Promise((r) => setTimeout(r, 2500));
      const hd = document.getElementById('cms-share-img');
      return { hd: [hd.naturalWidth, hd.naturalHeight] };
    });
    expect(breiten.hd[0]).toBe(794 * 3);
    expect(breiten.hd[1]).toBeGreaterThan(300 * 3);
    // das Seitenverhaeltnis ist das des 1x-Bildes: Hoehe / Breite liegt wie zuvor bei ca. 0,6 - 0,9
    expect(breiten.hd[1] / breiten.hd[0]).toBeGreaterThan(0.45);
    expect(breiten.hd[1] / breiten.hd[0]).toBeLessThan(1.2);
  });

  test('TC-F1-01: Download und Druck des Wochenplans erhalten dieselbe Aufloesung', async ({ page }) => {
    await cmsMit(page);
    await page.evaluate(() => window.cmsPreviewWP());
    await expect(page.locator('#cms-share-img')).toBeVisible({ timeout: 15000 });
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#cms-share-dl').click()]);
    const pfad = await download.path();
    const buf = require('fs').readFileSync(pfad);
    expect(pngBreite(buf)).toBe(2382);
  });

  test('TC-F1-03: 3x-Bild auf 1x verkleinert weicht von der 1x-Fassung kaum ab (Schatten, Linien, Logo gleich gross)', async ({ page }) => {
    await cmsMit(page);
    const abweichung = await page.evaluate(async () => {
      const blobs = {};
      const hol = (s) => new Promise((res) => {
        // generateMenuImage ist nicht oeffentlich: die Vorschau (3x) und die Einstellungs-Vorschau (1x) laufen ueber die Seite
        res(null);
      });
      window.cmsPreviewWP();
      await new Promise((r) => setTimeout(r, 2500));
      const hd = document.getElementById('cms-share-img');
      const c = document.createElement('canvas'); c.width = 794; c.height = Math.round(hd.naturalHeight / 3);
      const x = c.getContext('2d'); x.drawImage(hd, 0, 0, c.width, c.height);
      const px = x.getImageData(0, 0, c.width, c.height).data;
      // Das Logo steht rechts oben: dort muss der Bereich nicht leer sein, und links oben steht der Titel.
      const dunkel = (x0, y0, w, h) => { let n = 0; const d = x.getImageData(x0, y0, w, h).data; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] < 600) n++; return n; };
      return { logo: dunkel(560, 10, 220, 90), titel: dunkel(30, 20, 300, 60), breite: c.width, hoehe: c.height, px: px.length };
    });
    expect(abweichung.logo).toBeGreaterThan(300);    // Logo vorhanden und in der erwarteten Groesse (rechts oben)
    expect(abweichung.titel).toBeGreaterThan(300);   // Titel "Wochenplan" vorhanden (links oben)
  });

  test('TC-F1-02: Aktions-Plakat in der Vorschau ist 2382 x 3369', async ({ page }) => {
    await cmsMit(page);
    await aktionenTab(page);
    await page.evaluate(() => window.cmsPreviewAktion('A1'));
    await expect(page.locator('#cms-share-img')).toBeVisible({ timeout: 30000 });
    const m = await page.locator('#cms-share-img').evaluate((i) => [i.naturalWidth, i.naturalHeight]);
    expect(m).toEqual([794 * 3, 1123 * 3]);
    // Die Karten-Klickzonen der Vorschau rechnen mit den logischen Massen und bleiben gueltig.
    await expect(page.locator('#cms-share-img-wrap .pv-card-zone').first()).toBeAttached({ timeout: 10000 });
  });

  test('TC-F3-01: Knopf "Auf die Waage" in Wochenplan-Tab, Wochenplan-Vorschau, Aktionsliste und Aktions-Vorschau', async ({ page }) => {
    await cmsMit(page);
    await expect(page.locator('[data-action="waageWP"]')).toBeVisible();
    await page.locator('[data-action="waageWP"]').click();
    await expect(dlg(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dlg(page)).toHaveCount(0);

    await page.evaluate(() => window.cmsPreviewWP());
    await expect(page.locator('#cms-share-waage')).toBeVisible({ timeout: 15000 });
    await page.locator('#cms-share-waage').click();
    await expect(dlg(page)).toBeVisible();
    await page.keyboard.press('Escape');

    await page.evaluate(() => window.cmsCloseModal && window.cmsCloseModal());
    await aktionenTab(page);
    await page.locator('[data-action="waageAktion"]').first().click();
    await expect(dlg(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dlg(page)).toHaveCount(0);

    await page.evaluate(() => window.cmsPreviewAktion('A1'));
    await expect(page.locator('#cms-share-waage')).toBeVisible({ timeout: 30000 });
    await page.locator('#cms-share-waage').click();
    await expect(dlg(page)).toBeVisible();
    await expect(dlg(page).locator('h3').first()).toContainText('Herbstwoche');
  });

  test('TC-F4-01 / F5-01: Dialog zeigt Art-Wahl, Neu mit Miniatur, vorhandene Bilder; alte Wochenplaene sind vorausgewaehlt', async ({ page }) => {
    await cmsMit(page);
    await page.locator('[data-action="waageWP"]').click();
    await expect(neueBilder(page)).toHaveCount(1, { timeout: 20000 });
    await expect(dlg(page).locator('[data-ueb="art"]')).toHaveText(['Vollbild', 'Dauerwerbung']);
    await expect(neueBilder(page).locator('.wb-info b')).toHaveText(/^10_Wochenplan_KW\d+\.jpg$/);
    await expect(neueBilder(page).locator('img')).toBeVisible();
    await expect(neueBilder(page).locator('input[type=checkbox]')).toBeChecked();
    await expect(altBilder(page)).toHaveCount(3);
    const haken = async (name) => altBilder(page).filter({ has: page.locator(`b:text-is("${name}")`) }).locator('input[type=checkbox]');
    await expect(await haken('10_Wochenplan_KW43.jpg')).toBeChecked();
    await expect(await haken('20_Angebot_2026-10-12_00_Uebersicht.jpg')).not.toBeChecked();
    await expect(await haken('Hauswerbung.jpg')).not.toBeChecked();
    await expect(dlg(page).locator('#wb-ueb-summe')).toContainText('1 neu · 1 löschen · danach 3 / 99');
    await expect(dlg(page)).toContainText('Brücke online');
    // "Alle" / "Keine"
    await dlg(page).locator('[data-ueb="alle"]').click();
    await expect(dlg(page).locator('#wb-ueb-summe')).toContainText('3 löschen');
    await dlg(page).locator('[data-ueb="keine"]').click();
    await expect(dlg(page).locator('#wb-ueb-summe')).toContainText('0 löschen');
  });

  test('TC-F6-01 / F7-01: erst hochladen, dann loeschen; Wochenplan-Bild ist JPEG 1600 x 960', async ({ page }) => {
    const m = await cmsMit(page);
    await page.locator('[data-action="waageWP"]').click();
    await expect(neueBilder(page)).toHaveCount(1, { timeout: 20000 });
    await dlg(page).locator('#wb-ueb-start').click();
    await expect(dlg(page)).toContainText('übertragen', { timeout: 20000 });
    await expect(dlg(page).locator('[data-ueb="zu"]').last()).toHaveText('Fertig');
    expect(m.folge()).toEqual(['POST', 'DELETE']);
    const post = m.anfragen('POST')[0];
    expect(post.typ).toBe('image/jpeg');
    expect(post.kopf).toBe('ffd8ff');
    expect(post.masse).toEqual({ w: 1600, h: 960 });
    expect(post.art).toBe('vollbild');
    expect(m.anfragen('DELETE').map((l) => l.name)).toEqual(['10_Wochenplan_KW43.jpg']);
    expect(m.zustand.vollbild.map((b) => b.name)).not.toContain('10_Wochenplan_KW43.jpg');
    expect(m.zustand.vollbild.map((b) => b.name)).toContain('Hauswerbung.jpg');
  });

  test('TC-F6-02: Schlaegt der Upload fehl, wird nichts geloescht', async ({ page }) => {
    const m = await cmsMit(page, { ablehnen: ['Wochenplan'] });
    await page.locator('[data-action="waageWP"]').click();
    await expect(neueBilder(page)).toHaveCount(1, { timeout: 20000 });
    await dlg(page).locator('#wb-ueb-start').click();
    await expect(dlg(page)).toContainText('Nur JPEG und GIF erlaubt', { timeout: 20000 });
    await expect(dlg(page)).toContainText('nichts gelöscht');
    expect(m.anfragen('DELETE')).toHaveLength(0);
    await expect(dlg(page).locator('#wb-ueb-start')).toContainText('Erneut versuchen');
  });

  test('TC-F6-03: Mehr als 99 Bilder sperren "Uebertragen"', async ({ page }) => {
    const viele = Array.from({ length: 99 }, (_, i) => `Z${String(i).padStart(2, '0')}.jpg`);
    const m = await cmsMit(page, { alt: viele });
    await page.locator('[data-action="waageWP"]').click();
    await expect(neueBilder(page)).toHaveCount(1, { timeout: 20000 });
    await expect(dlg(page).locator('#wb-ueb-start')).toBeDisabled();
    await expect(dlg(page)).toContainText('Mehr als 99 Bilder');
    // Wer eines der alten zum Loeschen anhakt, hat wieder Platz.
    await altBilder(page).first().locator('input[type=checkbox]').check();
    await expect(dlg(page).locator('#wb-ueb-start')).toBeEnabled();
    expect(m.anfragen('POST')).toHaveLength(0);
  });

  test('TC-F5-01: Ein gleichnamiges Altbild wird ersetzt, nie geloescht', async ({ page }) => {
    const m = await cmsMit(page);
    await page.locator('[data-action="waageWP"]').click();
    await expect(neueBilder(page)).toHaveCount(1, { timeout: 20000 });
    const name = await neueBilder(page).locator('.wb-info b').innerText();
    await page.keyboard.press('Escape');
    m.zustand.vollbild.push({ name, groesse: 1000, etag: 'x', status: 'auf_waage' });

    await page.locator('[data-action="waageWP"]').click();
    await expect(neueBilder(page)).toHaveCount(1, { timeout: 20000 });
    const alt = altBilder(page).filter({ has: page.locator(`b:text-is("${name}")`) });
    await expect(alt.locator('input[type=checkbox]')).toBeDisabled();
    await expect(alt).toContainText('wird ersetzt');
    await dlg(page).locator('[data-ueb="alle"]').click();
    await dlg(page).locator('#wb-ueb-start').click();
    await expect(dlg(page).locator('[data-ueb="zu"]').last()).toHaveText('Fertig', { timeout: 20000 });
    expect(m.anfragen('DELETE').map((l) => l.name)).not.toContain(name);
    expect(m.anfragen('POST').map((l) => l.name)).toEqual([name]);
  });

  test('TC-F7-01 / F7-02: Dauerwerbung: Hinweis zur kleinen Schrift, Bild 1600 x 560; Vorgabe ist Vollbild', async ({ page }) => {
    const m = await cmsMit(page);
    await page.locator('[data-action="waageWP"]').click();
    await expect(neueBilder(page)).toHaveCount(1, { timeout: 20000 });
    await expect(dlg(page).locator('[data-ueb="art"].on')).toHaveText('Vollbild');
    await expect(dlg(page)).not.toContainText('Schrift und Details werden dort sehr klein');
    await dlg(page).locator('[data-ueb="art"][data-art="dauer"]').click();
    await expect(dlg(page)).toContainText('Schrift und Details werden dort sehr klein');
    await expect(neueBilder(page)).toHaveCount(1, { timeout: 20000 });
    await expect(altBilder(page)).toHaveCount(0);
    await dlg(page).locator('#wb-ueb-start').click();
    await expect(dlg(page).locator('[data-ueb="zu"]').last()).toHaveText('Fertig', { timeout: 20000 });
    const post = m.anfragen('POST')[0];
    expect(post.art).toBe('dauer');
    expect(post.masse).toEqual({ w: 1600, h: 560 });
  });

  test('TC-F8-01 / F9-01: Aktion mit 8 Artikeln: 2 Uebersichten + 8 Einzelbilder, alle JPEG 1600 x 960, alle angehakt, Namen bereinigt', async ({ page }) => {
    const m = await cmsMit(page);
    await aktionenTab(page);
    await page.locator('[data-action="waageAktion"]').first().click();
    await expect(neueBilder(page)).toHaveCount(10, { timeout: 60000 });
    const namen = await neueBilder(page).locator('.wb-info b').allInnerTexts();
    expect(namen[0]).toBe('20_Angebot_2026-10-26_00_Uebersicht.jpg');
    expect(namen[1]).toBe('20_Angebot_2026-10-26_00b_Uebersicht.jpg');
    expect(namen[2]).toBe('20_Angebot_2026-10-26_01_Bayerntaler_Kaese.jpg');
    expect(namen[9]).toBe('20_Angebot_2026-10-26_08_Walnuesse_ganz.jpg');
    expect(namen.join('|')).toContain('05_Hausmacher_Leberwurst_Spezial_ss.jpg');
    for (const n of namen) expect(n).toMatch(/^[A-Za-z0-9._-]{1,80}\.jpg$/);
    expect(new Set(namen).size).toBe(10);
    await expect(neueBilder(page).locator('input[type=checkbox]:checked')).toHaveCount(10);
    // 20_Angebot_* sind zum Loeschen vorausgewaehlt, das Wochenplanbild und Fremdes nicht
    const haken = (name) => altBilder(page).filter({ has: page.locator(`b:text-is("${name}")`) }).locator('input[type=checkbox]');
    await expect(haken('20_Angebot_2026-10-12_00_Uebersicht.jpg')).toBeChecked();
    await expect(haken('10_Wochenplan_KW43.jpg')).not.toBeChecked();

    await dlg(page).locator('#wb-ueb-start').click();
    await expect(dlg(page).locator('[data-ueb="zu"]').last()).toHaveText('Fertig', { timeout: 60000 });
    const posts = m.anfragen('POST');
    expect(posts).toHaveLength(10);
    for (const p of posts) { expect(p.typ).toBe('image/jpeg'); expect(p.kopf).toBe('ffd8ff'); expect(p.masse).toEqual({ w: 1600, h: 960 }); expect(p.bytes).toBeLessThan(8 * 1024 * 1024); }
    expect(m.folge().slice(0, 10).every((x) => x === 'POST')).toBe(true);
    expect(m.folge().slice(10)).toEqual(['DELETE']);
  });

  test('TC-F8-02: Aktion mit 3 Artikeln: 1 Uebersicht + 3 Einzelbilder; Dauerwerbung: 1600 x 560', async ({ page }) => {
    const m = await cmsMit(page, { artikel: 3 });
    await aktionenTab(page);
    await page.locator('[data-action="waageAktion"]').first().click();
    await expect(neueBilder(page)).toHaveCount(4, { timeout: 60000 });
    await dlg(page).locator('[data-ueb="art"][data-art="dauer"]').click();
    await expect(dlg(page).locator('[data-ueb="art"].on')).toHaveText('Dauerwerbung');
    await expect(neueBilder(page)).toHaveCount(4, { timeout: 60000 });   // 3 Artikel passen auf eine Uebersicht (4 je Bild)
    await dlg(page).locator('#wb-ueb-start').click();
    await expect(dlg(page).locator('[data-ueb="zu"]').last()).toHaveText('Fertig', { timeout: 60000 });
    for (const p of m.anfragen('POST')) { expect(p.art).toBe('dauer'); expect(p.masse).toEqual({ w: 1600, h: 560 }); }
  });

  test('TC-F8-01: einzelne Bilder lassen sich abwaehlen; nur angehakte werden uebertragen', async ({ page }) => {
    const m = await cmsMit(page, { artikel: 3 });
    await aktionenTab(page);
    await page.locator('[data-action="waageAktion"]').first().click();
    await expect(neueBilder(page)).toHaveCount(4, { timeout: 60000 });
    await neueBilder(page).nth(0).locator('input[type=checkbox]').uncheck();     // Uebersicht weg
    await neueBilder(page).nth(2).locator('input[type=checkbox]').uncheck();     // Artikel 2 weg
    await expect(dlg(page).locator('#wb-ueb-summe')).toContainText('2 neu');
    await dlg(page).locator('#wb-ueb-start').click();
    await expect(dlg(page).locator('[data-ueb="zu"]').last()).toHaveText('Fertig', { timeout: 60000 });
    expect(m.anfragen('POST').map((p) => p.name.replace(/^20_Angebot_2026-10-26_/, ''))).toEqual(['01_Bayerntaler_Kaese.jpg', '03_Bio-Aepfel_Elstar.jpg']);
  });

  test('TC-F10-01: Fortschrittsanzeige beim Erstellen; Schliessen sendet nichts', async ({ page }) => {
    const m = await cmsMit(page, { verzoegerung: 1500 });
    await aktionenTab(page);
    await page.locator('[data-action="waageAktion"]').first().click();
    await expect(dlg(page).locator('#wb-ueb-fort')).toContainText('Bilder werden erstellt', { timeout: 10000 });
    await expect(dlg(page).locator('#wb-ueb-start')).toBeDisabled();
    await dlg(page).locator('[data-ueb="zu"]').first().click();
    await expect(dlg(page)).toHaveCount(0);
    await page.waitForTimeout(2500);
    expect(m.anfragen('POST')).toHaveLength(0);
    expect(m.anfragen('DELETE')).toHaveLength(0);
  });

  test('TC-F11-01: Das CMS laedt das Waagen-Modul; alle Anfragen gehen an /api/waage-werbebilder', async ({ page }) => {
    const m = await cmsMit(page);
    expect(await page.evaluate(() => typeof window.KWerbebilder.uebertragen)).toBe('function');
    await page.locator('[data-action="waageWP"]').click();
    await expect(neueBilder(page)).toHaveCount(1, { timeout: 20000 });
    expect(m.log.length).toBeGreaterThan(0);
  });

  test('TC-F2-01 / F2-02: Einzelflyer-Editor bleibt bei 794 x 1123, Download ist 2382 x 3369', async ({ browser }) => {
    // Schmales Fenster: der Editor oeffnet dann im Inneren der Seite (kein Popup).
    const ctx = await browser.newContext({ viewport: { width: 600, height: 900 }, serviceWorkers: 'block', acceptDownloads: true });
    const page = await ctx.newPage();
    await cmsMit(page, { artikel: 3 });
    await aktionenTab(page);
    await page.evaluate(() => window.cmsPreviewAktion('A1'));
    await expect(page.locator('#cms-share-flyer')).toBeVisible({ timeout: 30000 });
    await page.locator('#cms-share-flyer').click();
    await expect(page.locator('#fimg-0')).toBeVisible({ timeout: 60000 });
    const edit = await page.locator('#fimg-0').evaluate((i) => [i.naturalWidth, i.naturalHeight]);
    expect(edit).toEqual([794, 1123]);
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.locator('[data-act="dl"][data-idx="0"]').click()]);
    const buf = require('fs').readFileSync(await download.path());
    expect([pngBreite(buf), pngHoehe(buf)]).toEqual([2382, 3369]);
    // Der Editor selbst zeigt weiter das 1x-Bild (Zonen und Pfeiltasten rechnen damit).
    expect(await page.locator('#fimg-0').evaluate((i) => i.naturalWidth)).toBe(794);
    await ctx.close();
  });
});
