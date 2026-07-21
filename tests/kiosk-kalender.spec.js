/**
 * Kiosk-Kalender – Playwright E2E (Feature: specs/kiosk-kalender)
 *
 * Deckt TC-F1..TC-F8 ab. Vollständig self-contained:
 *   - startet einen lokalen Static-Server für static-site/
 *   - mockt alle /api/*-Routen (kein Dataverse nötig)
 *   - läuft über die drei Viewport-Projekte (mobile/ipad-mini/desktop)
 *
 * Ausführen:  npx playwright test tests/kiosk-kalender.spec.js
 */
const { test, expect } = require('@playwright/test');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'static-site');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
};

let server, origin;

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/' || p === '') p = '/index.html';
    if (p === '/kiosk') p = '/kiosk.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  origin = `http://127.0.0.1:${server.address().port}`;
});

test.afterAll(async () => { if (server) await new Promise((r) => server.close(r)); });

// ── In-Memory-Kalender-Backend ──
function makeState() {
  const today = new Date();
  const pad = (n) => (n < 10 ? '0' : '') + n;
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const dow = (today.getDay() + 6) % 7;
  const monday = new Date(today); monday.setDate(today.getDate() - dow);
  const di = new Date(monday); di.setDate(monday.getDate() + 1);
  return {
    iso, today: iso(today), monday: iso(monday), di: iso(di),
    seq: 100,
    posts: [],
    entries: [
      { id: 'e1', titel: 'Kühltheke reinigen', datum: iso(di), ganztags: true, uhrzeit: '', kategorie: 'aufgabe', wiederholung: 'weekly', kunde_id: '', kunde_freitext: '', status: 'offen', notiz: 'Jeden Di' },
      { id: 'e2', titel: 'Sonntagsbraten', datum: iso(di), ganztags: false, uhrzeit: '10:00', kategorie: 'reservierung', wiederholung: '', kunde_id: 'k1', kunde_freitext: '', status: 'offen', notiz: '' },
      { id: 'e3', titel: 'Käseplatte', datum: iso(di), ganztags: false, uhrzeit: '14:30', kategorie: 'vorbestellung', wiederholung: '', kunde_id: '', kunde_freitext: 'Frau Schmidt', status: 'erledigt', notiz: '' },
    ],
    overrides: {}, // id -> {datum -> status}
  };
}

function expandForRange(st, von, bis) {
  const out = [];
  const inRange = (d) => d >= von && d <= bis;
  for (const e of st.entries) {
    if (e.wiederholung === 'weekly') {
      // einfache wöchentliche Expansion für Testbereich
      let d = new Date(e.datum + 'T12:00');
      const end = new Date(bis + 'T12:00');
      while (d <= end) {
        const ds = st.iso(d);
        if (inRange(ds) && ds >= e.datum) {
          const ov = (st.overrides[e.id] || {})[ds];
          if (ov === 'geloescht') { d.setDate(d.getDate() + 7); continue; }
          out.push(Object.assign({}, e, { datum: ds, _ist_vorkommen: true, _serien_id: e.id, status: ov === 'erledigt' ? 'erledigt' : 'offen' }));
        }
        d.setDate(d.getDate() + 7);
      }
    } else if (inRange(e.datum)) {
      out.push(Object.assign({}, e));
    }
  }
  out.sort((a, b) => (a.ganztags === b.ganztags ? String(a.uhrzeit).localeCompare(String(b.uhrzeit)) : (a.ganztags ? -1 : 1)));
  return out;
}

async function installRoutes(page, st) {
  await page.addInitScript(() => { try { sessionStorage.setItem('cms_auth_token', 'test-token'); } catch (e) {} });
  // Kalender
  await page.route('**/api/kalender**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const json = (o, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(o) });
    if (method === 'GET') {
      const von = url.searchParams.get('von'), bis = url.searchParams.get('bis');
      return json({ success: true, data: expandForRange(st, von, bis), von, bis });
    }
    const idMatch = url.pathname.match(/\/api\/kalender\/([^/?]+)/);
    const id = idMatch ? idMatch[1] : null;
    const body = req.postData() ? JSON.parse(req.postData()) : {};
    if (method === 'POST' && !id) {
      if (!body.titel) return json({ success: false, errors: ['Bitte einen Titel eingeben.'] }, 400);
      if (!body.ganztags && !body.uhrzeit) return json({ success: false, errors: ['Bitte eine Uhrzeit angeben oder „Ganztags“ wählen.'] }, 400);
      st.posts.push(body);
      const e = Object.assign({ id: 'n' + (++st.seq), status: 'offen', kunde_id: '', kunde_freitext: '', notiz: '', uhrzeit: '', wiederholung: '' }, body);
      st.entries.push(e);
      return json({ success: true, eintrag: e }, 201);
    }
    if (method === 'POST' && id && url.searchParams.get('override')) {
      const d = url.searchParams.get('override');
      st.overrides[id] = st.overrides[id] || {};
      if (body.status === 'offen') delete st.overrides[id][d]; else st.overrides[id][d] = body.status;
      return json({ success: true }, 201);
    }
    if (method === 'PATCH' && id) {
      const e = st.entries.find((x) => x.id === id);
      if (e && 'status' in body) e.status = body.status;
      return json({ success: true });
    }
    if (method === 'DELETE' && id) {
      st.entries = st.entries.filter((x) => x.id !== id);
      return json({ success: true });
    }
    return json({ success: false }, 405);
  });
  // Stammkunden-Autocomplete
  await page.route('**/api/stammkunden**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, customers: [{ id: 'k1', name: 'Familie Huber' }, { id: 'k2', name: 'Herr Bauer' }] }) }));
  // Alle übrigen APIs neutralisieren, damit kiosk.html stabil lädt
  await page.route('**/api/**', (route) => {
    if (route.request().url().includes('/api/kalender') || route.request().url().includes('/api/stammkunden')) return route.fallback();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [], customers: [], orders: [] }) });
  });
}

async function openKalender(page, st) {
  await installRoutes(page, st);
  await page.goto(origin + '/kiosk');
  await page.locator('.k-tab[data-tab="kalender"]').click();
  await expect(page.locator('#panel-kalender')).toHaveClass(/active/);
  await page.locator('.kal-day.active').first().waitFor();
  // auf Dienstag (Beispieldaten) wechseln
  await page.locator(`.kal-day[data-day="${st.di}"]`).click();
}

// Öffnet den Erfassungs-Dialog (Erfassung liegt in eigenem Modal).
async function openAdd(page) {
  await page.locator('.kal-new').click();
  await page.locator('#kal-modal').waitFor({ state: 'visible' });
  await page.locator('#kal-title').waitFor({ state: 'visible' });
}

// ════════════════════════════════════════════════════
test.describe('Kiosk-Kalender', () => {

  // F6 – Tagesansicht & Wochennavigation
  test('TC-F6-01/03: Kalender-Tab öffnet, heute markiert, „Heute“ springt zurück', async ({ page }) => {
    const st = makeState();
    await installRoutes(page, st);
    await page.goto(origin + '/kiosk');
    await page.locator('.k-tab[data-tab="kalender"]').click();
    await expect(page.locator('#panel-kalender')).toHaveClass(/active/);
    await expect(page.locator('.kal-day.today')).toHaveCount(1);
    await page.locator('.kal-nav[data-act="next"]').click();
    await page.locator('.kal-today').click();
    await expect(page.locator(`.kal-day[data-day="${st.today}"]`)).toHaveClass(/active/);
  });

  // F2 – Gruppierung ganztags/uhrzeit
  test('TC-F2-01: Ganztägig-Gruppe zuerst, terminierte chronologisch', async ({ page }) => {
    const st = makeState();
    await openKalender(page, st);
    const secs = page.locator('.kal-sec');
    await expect(secs.first()).toContainText('Ganztägig');
    await expect(secs.nth(1)).toContainText('Mit Uhrzeit');
    // terminierte Einträge liegen als Timeline-Zeilen vor; nur 10:00 offen (14:30 erledigt/ausgeblendet)
    const times = await page.locator('.kal-tl-row:not(.done) .kal-tl-time').allTextContents();
    expect(times.length).toBe(1);
    expect(times[0]).toContain('10:00');
  });

  // F3 – Erledigt
  test('TC-F3-03: Erledigte ein-/ausblenden', async ({ page }) => {
    const st = makeState();
    await openKalender(page, st);
    // e3 (Käseplatte) ist erledigt → zunächst versteckt
    await expect(page.locator('.kal-entry', { hasText: 'Käseplatte' })).toHaveCount(0);
    await page.locator('.kal-donechip').click();
    await expect(page.locator('.kal-entry', { hasText: 'Käseplatte' })).toHaveCount(1);
    await expect(page.locator('.kal-entry.done', { hasText: 'Käseplatte' })).toHaveCount(1);
  });

  test('TC-F3-01: Eintrag abhaken blendet ihn aus (Historie bleibt)', async ({ page }) => {
    const st = makeState();
    await openKalender(page, st);
    const braten = page.locator('.kal-entry', { hasText: 'Sonntagsbraten' });
    await braten.locator('.check').click();
    await expect(page.locator('.kal-entry', { hasText: 'Sonntagsbraten' })).toHaveCount(0);
    await page.locator('.kal-donechip').click();
    await expect(page.locator('.kal-entry.done', { hasText: 'Sonntagsbraten' })).toHaveCount(1);
  });

  // F1 – Erfassung
  test('TC-F1-01: Ganztägigen Eintrag anlegen', async ({ page }) => {
    const st = makeState();
    await openKalender(page, st);
    await openAdd(page);
    await page.locator('#kal-title').fill('Wochenware bestellen');
    await page.locator('.kal-toggle button', { hasText: 'Ganztags' }).click();
    await page.locator('.kal-add').click();
    await expect(page.locator('.kal-entry', { hasText: 'Wochenware bestellen' })).toHaveCount(1);
  });

  test('TC-F1-02: Terminierten Eintrag anlegen', async ({ page }) => {
    const st = makeState();
    await openKalender(page, st);
    await openAdd(page);
    await page.locator('#kal-title').fill('Blumenstrauß abholbereit');
    await page.locator('.kal-toggle button', { hasText: 'Uhrzeit' }).click();
    await page.locator('#kal-time').fill('11:00');
    await page.locator('.kal-add').click();
    const row = page.locator('.kal-tl-row', { hasText: 'Blumenstrauß abholbereit' });
    await expect(row).toHaveCount(1);
    await expect(row.locator('.kal-tl-time')).toContainText('11:00');
  });

  test('TC-F1-03: Leerer Titel wird nicht gespeichert', async ({ page }) => {
    const st = makeState();
    await openKalender(page, st);
    await openAdd(page);
    const before = await page.locator('.kal-entry').count();
    await page.locator('#kal-title').fill('');
    await page.locator('.kal-add').click();
    await expect(page.locator('.kal-entry')).toHaveCount(before);
    await expect(page.locator('#kal-title')).toBeFocused();
  });

  // F4 – Kundenverknüpfung
  test('TC-F4-02: Kunde als Freitext', async ({ page }) => {
    const st = makeState();
    await openKalender(page, st);
    await openAdd(page);
    await page.locator('#kal-title').fill('Extrawurst');
    await page.locator('#kal-kunde').fill('Laufkundschaft Meier');
    await page.locator('.kal-add').click();
    const e = page.locator('.kal-entry', { hasText: 'Extrawurst' });
    await expect(e.locator('.badge.kunde')).toContainText('Laufkundschaft Meier');
  });

  // F5 – Wiederkehrend
  test('TC-F5-01: Wöchentliche Serie zeigt ↻-Badge; nächste Woche erneut', async ({ page }) => {
    const st = makeState();
    await openKalender(page, st);
    const serie = page.locator('.kal-entry', { hasText: 'Kühltheke reinigen' });
    await expect(serie.locator('.badge.recur')).toContainText('wöchentlich');
    // nächste Woche → gleicher Dienstag zeigt Vorkommen erneut
    await page.locator('.kal-nav[data-act="next"]').click();
    const nextDi = new Date(st.di + 'T12:00'); nextDi.setDate(nextDi.getDate() + 7);
    await page.locator(`.kal-day[data-day="${st.iso(nextDi)}"]`).click();
    await expect(page.locator('.kal-entry', { hasText: 'Kühltheke reinigen' })).toHaveCount(1);
  });

  test('TC-F5-02: Serien-Vorkommen abhaken gilt nur für diesen Tag', async ({ page }) => {
    const st = makeState();
    await openKalender(page, st);
    await page.locator('.kal-entry', { hasText: 'Kühltheke reinigen' }).locator('.check').click();
    // dieses Vorkommen jetzt erledigt → ausgeblendet
    await expect(page.locator('.kal-entry', { hasText: 'Kühltheke reinigen' })).toHaveCount(0);
    // nächste Woche weiterhin offen
    await page.locator('.kal-nav[data-act="next"]').click();
    const nextDi = new Date(st.di + 'T12:00'); nextDi.setDate(nextDi.getDate() + 7);
    await page.locator(`.kal-day[data-day="${st.iso(nextDi)}"]`).click();
    await expect(page.locator('.kal-entry', { hasText: 'Kühltheke reinigen' })).toHaveCount(1);
  });

  // F8 – keine nativen Dialoge
  test('TC-F8-02: Fehlerpfad nutzt In-App-Toast statt alert()', async ({ page }) => {
    const st = makeState();
    let nativeDialog = false;
    page.on('dialog', (d) => { nativeDialog = true; d.dismiss(); });
    await openKalender(page, st);
    await openAdd(page);
    // Uhrzeit-Modus ohne Uhrzeit → freundlicher Hinweis (kein alert)
    await page.locator('#kal-title').fill('Ohne Zeit');
    await page.locator('.kal-toggle button', { hasText: 'Uhrzeit' }).click();
    await page.locator('#kal-time').fill('');
    await page.locator('.kal-add').click();
    await expect(page.locator('.kal-toast.err')).toBeVisible();
    expect(nativeDialog).toBe(false);
  });

  // ── Ergänzende Abdeckung ──

  // F1
  test('TC-F1-04: Uhrzeit-Modus ohne Uhrzeit speichert nicht', async ({ page }) => {
    const st = makeState();
    await openKalender(page, st);
    await openAdd(page);
    const before = await page.locator('.kal-entry').count();
    await page.locator('#kal-title').fill('Termin ohne Zeit');
    await page.locator('.kal-toggle button', { hasText: 'Uhrzeit' }).click();
    await page.locator('#kal-time').fill('');
    await page.locator('.kal-add').click();
    await expect(page.locator('.kal-toast.err')).toBeVisible();
    await expect(page.locator('.kal-entry')).toHaveCount(before);
  });

  // F2 – Leerer Tag
  test('TC-F2-02: Tag ohne Einträge zeigt freundlichen Leerzustand', async ({ page }) => {
    const st = makeState();
    await openKalender(page, st);
    // Mittwoch der Woche hat keine Einträge
    const mi = new Date(st.di + 'T12:00'); mi.setDate(mi.getDate() + 1);
    await page.locator(`.kal-day[data-day="${st.iso(mi)}"]`).click();
    await expect(page.locator('.kal-empty')).toBeVisible();
    await expect(page.locator('.kal-entry')).toHaveCount(0);
  });

  // F3 – Rückgängig
  test('TC-F3-02: Erledigt rückgängig macht Eintrag wieder offen', async ({ page }) => {
    const st = makeState();
    await openKalender(page, st);
    const braten = page.locator('.kal-entry', { hasText: 'Sonntagsbraten' });
    await braten.locator('.check').click();
    await expect(page.locator('.kal-entry', { hasText: 'Sonntagsbraten' })).toHaveCount(0);
    // Erledigte einblenden und wieder auf „offen“ setzen
    await page.locator('.kal-donechip').click();
    await page.locator('.kal-entry.done', { hasText: 'Sonntagsbraten' }).locator('.check').click();
    await expect(page.locator('.kal-entry:not(.done)', { hasText: 'Sonntagsbraten' })).toHaveCount(1);
  });

  // F4 – Stammkunde verknüpfen / ohne Kunde
  test('TC-F4-01: Stammkunde verknüpfen sendet kunde_id und zeigt Namen', async ({ page }) => {
    const st = makeState();
    await openKalender(page, st);
    await openAdd(page);
    await page.locator('#kal-title').fill('Braten reservieren');
    await page.locator('#kal-kunde').fill('Familie Huber'); // triggert Autocomplete
    await page.waitForTimeout(400); // Debounce + Map-Befüllung
    await page.locator('.kal-add').click();
    const e = page.locator('.kal-entry', { hasText: 'Braten reservieren' });
    await expect(e.locator('.badge.kunde')).toContainText('Familie Huber');
    const linked = st.posts.find((p) => p.titel === 'Braten reservieren');
    expect(linked && linked.kunde_id).toBe('k1');
  });

  test('TC-F4-03: Ohne Kunde kein Kunden-Badge', async ({ page }) => {
    const st = makeState();
    await openKalender(page, st);
    await openAdd(page);
    await page.locator('#kal-title').fill('Nur eine Aufgabe');
    await page.locator('.kal-add').click();
    const e = page.locator('.kal-entry', { hasText: 'Nur eine Aufgabe' });
    await expect(e).toHaveCount(1);
    await expect(e.locator('.badge.kunde')).toHaveCount(0);
  });

  // F5 – Einzel-Vorkommen löschen lässt Serie bestehen
  test('TC-F5-04: Einzelnes Serien-Vorkommen löschen lässt Serie bestehen', async ({ page }) => {
    const st = makeState();
    await openKalender(page, st);
    await page.locator('.kal-entry', { hasText: 'Kühltheke reinigen' }).locator('.ic[data-del]').click();
    await expect(page.locator('.kal-entry', { hasText: 'Kühltheke reinigen' })).toHaveCount(0);
    // Folgewoche zeigt Serie weiterhin
    await page.locator('.kal-nav[data-act="next"]').click();
    const nextDi = new Date(st.di + 'T12:00'); nextDi.setDate(nextDi.getDate() + 7);
    await page.locator(`.kal-day[data-day="${st.iso(nextDi)}"]`).click();
    await expect(page.locator('.kal-entry', { hasText: 'Kühltheke reinigen' })).toHaveCount(1);
  });

  // F6 – Woche vor/zurück
  test('TC-F6-02: Woche vor und zurück aktualisiert den Bereich', async ({ page }) => {
    const st = makeState();
    await openKalender(page, st);
    const range0 = await page.locator('#kal-range').textContent();
    await page.locator('.kal-nav[data-act="next"]').click();
    const range1 = await page.locator('#kal-range').textContent();
    expect(range1).not.toBe(range0);
    await page.locator('.kal-nav[data-act="prev"]').click();
    await expect(page.locator('#kal-range')).toHaveText(range0);
  });

  // F7 – 401 ohne gültige Sitzung
  test('TC-F7-01: 401 beim Laden zeigt freundlichen Hinweis, kein Absturz', async ({ page }) => {
    const st = makeState();
    await page.addInitScript(() => { try { sessionStorage.setItem('cms_auth_token', 'test-token'); } catch (e) {} });
    // Kalender-GET liefert 401
    await page.route('**/api/kalender**', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'unauthorized' }) }));
    await page.route('**/api/**', (route) => {
      if (route.request().url().includes('/api/kalender')) return route.fallback();
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [], customers: [], orders: [] }) });
    });
    await page.goto(origin + '/kiosk');
    await page.locator('.k-tab[data-tab="kalender"]').click();
    await expect(page.locator('.kal-toast.err')).toBeVisible();
    await expect(page.locator('.kal-entry')).toHaveCount(0);
  });
});
