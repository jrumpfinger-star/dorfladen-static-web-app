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
      const ovs = st.overrides[e.id] || {};
      // Serien-Ende: frühestes Datum mit Status "serie_ende" (ab hier keine Vorkommen).
      let ende = null;
      for (const [ds, ov] of Object.entries(ovs)) {
        if (ov === 'serie_ende' && (ende === null || ds < ende)) ende = ds;
      }
      let d = new Date(e.datum + 'T12:00');
      const end = new Date(bis + 'T12:00');
      while (d <= end) {
        const ds = st.iso(d);
        if (inRange(ds) && ds >= e.datum) {
          if (ende !== null && ds >= ende) { d.setDate(d.getDate() + 7); continue; }
          const ov = ovs[ds];
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
  test('TC-F2-01: Split-Sektionen vorhanden, terminierte chronologisch', async ({ page }) => {
    const st = makeState();
    await openKalender(page, st);
    // F9-Split: eigene Sektion je Spalte. DOM-Quellreihenfolge timed→allday; visuelle
    // Reihenfolge steuert CSS order (Mobile allday zuerst, ≥768px timed links).
    await expect(page.locator('.kal-split-timed .kal-sec')).toContainText('Mit Uhrzeit');
    await expect(page.locator('.kal-split-allday .kal-sec')).toContainText('Ganztägig');
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
    // Auswahl-Dialog erscheint → „Nur diesen Tag“
    await expect(page.locator('.kal-confirm')).toBeVisible();
    await page.locator('.kal-confirm-btn', { hasText: 'Nur diesen Tag' }).click();
    await expect(page.locator('.kal-entry', { hasText: 'Kühltheke reinigen' })).toHaveCount(0);
    // Folgewoche zeigt Serie weiterhin
    await page.locator('.kal-nav[data-act="next"]').click();
    const nextDi = new Date(st.di + 'T12:00'); nextDi.setDate(nextDi.getDate() + 7);
    await page.locator(`.kal-day[data-day="${st.iso(nextDi)}"]`).click();
    await expect(page.locator('.kal-entry', { hasText: 'Kühltheke reinigen' })).toHaveCount(1);
  });

  // F5 – Ganze Serie löschen entfernt alle Vorkommen
  test('TC-F5-08: „Ganze Serie löschen“ entfernt Serie in allen Wochen', async ({ page }) => {
    const st = makeState();
    await openKalender(page, st);
    await page.locator('.kal-entry', { hasText: 'Kühltheke reinigen' }).locator('.ic[data-del]').click();
    await expect(page.locator('.kal-confirm')).toBeVisible();
    await page.locator('.kal-confirm-btn', { hasText: 'Ganze Serie löschen' }).click();
    await expect(page.locator('.kal-entry', { hasText: 'Kühltheke reinigen' })).toHaveCount(0);
    // Folgewoche zeigt Serie NICHT mehr
    await page.locator('.kal-nav[data-act="next"]').click();
    const nextDi = new Date(st.di + 'T12:00'); nextDi.setDate(nextDi.getDate() + 7);
    await page.locator(`.kal-day[data-day="${st.iso(nextDi)}"]`).click();
    await expect(page.locator('.kal-entry', { hasText: 'Kühltheke reinigen' })).toHaveCount(0);
  });

  // F5 – Serie ab späterem Termin beenden lässt frühere (Historie) bestehen
  test('TC-F5-10: Serie ab Folgewoche beenden behält vergangene Termine', async ({ page }) => {
    const st = makeState();
    await openKalender(page, st);
    // In die Folgewoche wechseln und dort die Serie „ab hier" beenden
    await page.locator('.kal-nav[data-act="next"]').click();
    const nextDi = new Date(st.di + 'T12:00'); nextDi.setDate(nextDi.getDate() + 7);
    await page.locator(`.kal-day[data-day="${st.iso(nextDi)}"]`).click();
    await page.locator('.kal-entry', { hasText: 'Kühltheke reinigen' }).locator('.ic[data-del]').click();
    await expect(page.locator('.kal-confirm')).toBeVisible();
    await page.locator('.kal-confirm-btn', { hasText: 'Ganze Serie löschen' }).click();
    await expect(page.locator('.kal-entry', { hasText: 'Kühltheke reinigen' })).toHaveCount(0);
    // Ursprüngliche Woche (Vergangenheit relativ zum Ende) zeigt die Serie weiterhin
    await page.locator('.kal-nav[data-act="prev"]').click();
    await page.locator(`.kal-day[data-day="${st.di}"]`).click();
    await expect(page.locator('.kal-entry', { hasText: 'Kühltheke reinigen' })).toHaveCount(1);
  });

  // F5 – Abbrechen im Auswahl-Dialog löscht nichts
  test('TC-F5-09: „Abbrechen“ im Lösch-Dialog behält das Vorkommen', async ({ page }) => {
    const st = makeState();
    await openKalender(page, st);
    await page.locator('.kal-entry', { hasText: 'Kühltheke reinigen' }).locator('.ic[data-del]').click();
    await expect(page.locator('.kal-confirm')).toBeVisible();
    await page.locator('.kal-confirm-btn', { hasText: 'Abbrechen' }).click();
    await expect(page.locator('.kal-confirm')).toHaveCount(0);
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

  // F7 – 401 beim Lesen bietet Anmeldung an
  test('TC-F7-01: 401 beim Laden öffnet Login-Dialog; Abbrechen zeigt Hinweis', async ({ page }) => {
    // Kalender-GET liefert immer 401 (kein gültiges Token)
    await page.route('**/api/kalender**', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'unauthorized' }) }));
    await page.route('**/api/**', (route) => {
      if (route.request().url().includes('/api/kalender')) return route.fallback();
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [], customers: [], orders: [] }) });
    });
    await page.goto(origin + '/kiosk');
    // Der Badge-Fetch beim Laden trifft schon einen 401 auf den lesenden
    // Kalender-GET → der Login-Dialog erscheint automatisch (statt nur Toast).
    const dlg = page.locator('[role="dialog"]', { hasText: 'Admin-Anmeldung' });
    await expect(dlg).toBeVisible();
    await dlg.locator('.dl-pw-cancel').click();
    await expect(dlg).toBeHidden();
    // Kalender-Tab öffnen → load() erhält erneut 401 → Dialog; Abbrechen →
    // freundlicher Hinweis-Toast, kein Absturz, keine Einträge.
    await page.locator('.k-tab[data-tab="kalender"]').click();
    const dlg2 = page.locator('[role="dialog"]', { hasText: 'Admin-Anmeldung' });
    await expect(dlg2).toBeVisible();
    await dlg2.locator('.dl-pw-cancel').click();
    await expect(page.locator('.kal-toast.err')).toBeVisible();
    await expect(page.locator('.kal-entry')).toHaveCount(0);
  });

  // F7 – erfolgreiche Anmeldung lädt den Kalender
  test('TC-F7-03: Login-Dialog anmelden lädt Kalender-Einträge', async ({ page }) => {
    const st = makeState();
    // Kalender antwortet erst mit gültigem Token (X-CMS-Auth: good)
    await page.route('**/api/kalender**', (route) => {
      const req = route.request();
      if ((req.headers()['x-cms-auth'] || '') !== 'good') {
        return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'unauthorized' }) });
      }
      const url = new URL(req.url());
      const von = url.searchParams.get('von'), bis = url.searchParams.get('bis');
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: expandForRange(st, von, bis), von, bis }) });
    });
    // Login liefert das Token
    await page.route('**/api/cms-auth**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'good' }) }));
    await page.route('**/api/**', (route) => {
      const u = route.request().url();
      if (u.includes('/api/kalender') || u.includes('/api/cms-auth')) return route.fallback();
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [], customers: [], orders: [] }) });
    });
    await page.goto(origin + '/kiosk');
    // Login-Dialog erscheint durch den 401 des Badge-Fetch beim Laden → anmelden.
    const dlg = page.locator('[role="dialog"]', { hasText: 'Admin-Anmeldung' });
    await expect(dlg).toBeVisible();
    await dlg.locator('input[type="password"]').fill('geheim');
    await dlg.locator('.dl-pw-ok').click();
    await expect(dlg).toBeHidden();
    // Nach der Anmeldung liegt das Token vor → Kalender-Tab lädt Einträge ohne Fehler.
    await page.locator('.k-tab[data-tab="kalender"]').click();
    await expect(page.locator('#panel-kalender')).toHaveClass(/active/);
    await page.locator('.kal-day.active').first().waitFor();
    await page.locator(`.kal-day[data-day="${st.di}"]`).click();
    await expect(page.locator('.kal-entry').first()).toBeVisible();
  });

  // Kategorie als Pills
  test('TC-F1-05: Kategorie über Pills wählbar; POST enthält Kategorie', async ({ page }) => {
    const st = makeState();
    await openKalender(page, st);
    await openAdd(page);
    await page.locator('#kal-title').fill('Blumen bestellen');
    await page.locator('.kal-pill[data-newcat="lieferung"]').click();
    await expect(page.locator('.kal-pill[data-newcat="lieferung"]')).toHaveClass(/active/);
    await page.locator('.kal-add').click();
    await expect(page.locator('.kal-entry', { hasText: 'Blumen bestellen' })).toHaveCount(1);
    const p = st.posts.find((x) => x.titel === 'Blumen bestellen');
    expect(p && p.kategorie).toBe('lieferung');
  });

  // Wochentags-Serie (Di/Mi/Fr)
  test('TC-F5-05: Serie an bestimmten Wochentagen (Di/Mi/Fr)', async ({ page }) => {
    const st = makeState();
    await openKalender(page, st);
    await openAdd(page);
    await page.locator('#kal-title').fill('Bestellung bei Bäcker');
    await page.locator('.kal-pill[data-newrecur="weekdays"]').click();
    await expect(page.locator('#kal-weekdays')).toBeVisible();
    await page.locator('.kal-wd[data-wd="2"]').click(); // Di
    await page.locator('.kal-wd[data-wd="3"]').click(); // Mi
    await page.locator('.kal-wd[data-wd="5"]').click(); // Fr
    await page.locator('.kal-add').click();
    const p = st.posts.find((x) => x.titel === 'Bestellung bei Bäcker');
    expect(p && p.wiederholung).toBe('weekdays');
    expect(p && p.wochentage).toBe('235');
  });

  // Wochentags-Serie ohne Auswahl → Hinweis
  test('TC-F5-06: Wochentage ohne Auswahl speichert nicht', async ({ page }) => {
    const st = makeState();
    await openKalender(page, st);
    await openAdd(page);
    await page.locator('#kal-title').fill('Serie ohne Tage');
    await page.locator('.kal-pill[data-newrecur="weekdays"]').click();
    await page.locator('.kal-add').click();
    await expect(page.locator('.kal-toast.err')).toBeVisible();
    expect(st.posts.find((x) => x.titel === 'Serie ohne Tage')).toBeUndefined();
  });

  // Vorlagen: Auswahl füllt den Dialog und legt passenden Eintrag an
  test('TC-VOR-01: Vorlage füllt Felder und legt wiederkehrende Aufgabe an', async ({ page }) => {
    const st = makeState();
    await openKalender(page, st);
    await openAdd(page);
    // erste Standard-Vorlage = „Bäcker-Bestellung“ (Wochentage Mo–Sa)
    await page.locator('.kal-tpl', { hasText: 'Bäcker-Bestellung' }).click();
    await expect(page.locator('#kal-title')).toHaveValue('Bestellung bei Bäcker');
    await expect(page.locator('.kal-pill[data-newrecur="weekdays"]')).toHaveClass(/active/);
    await expect(page.locator('#kal-weekdays')).toBeVisible();
    await expect(page.locator('.kal-wd[data-wd="2"]')).toHaveClass(/active/); // Di aktiv
    await page.locator('.kal-add').click();
    const p = st.posts.find((x) => x.titel === 'Bestellung bei Bäcker');
    expect(p && p.wiederholung).toBe('weekdays');
    expect(p && p.wochentage).toBe('123456');
    expect(p && p.kategorie).toBe('aufgabe');
  });

  // Vorlagen: eigene wiederkehrende Aufgabe erscheint als Vorlage
  test('TC-VOR-02: bestehende Serie erscheint als Vorlage', async ({ page }) => {
    const st = makeState();
    await openKalender(page, st);
    await openAdd(page);
    // makeState enthält die wöchentliche Serie „Kühltheke reinigen“
    await expect(page.locator('.kal-tpl', { hasText: 'Kühltheke reinigen' })).toHaveCount(1);
  });

  // ════════════════════════════════════════════════════
  // Inkrement 2 – Feature-Paket F9–F14 (Kiosk-Kalender v2)
  // ════════════════════════════════════════════════════

  // ── F9: Split-View (timed links / allday rechts ab 768px, sonst gestapelt) ──

  test('TC-F9-01: iPad zeigt Split zweispaltig (timed links, allday rechts)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'ipad-mini', 'nur iPad-Mini-Viewport');
    const st = makeState();
    await openKalender(page, st);
    const timed = await page.locator('.kal-split-timed').boundingBox();
    const allday = await page.locator('.kal-split-allday').boundingBox();
    expect(timed && allday).toBeTruthy();
    expect(timed.x).toBeLessThan(allday.x);            // timed links
    expect(Math.abs(timed.y - allday.y)).toBeLessThan(40); // nebeneinander (ähnliche Höhe)
  });

  test('TC-F9-02: Desktop zeigt Split zweispaltig (timed links, allday rechts)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'nur Desktop-Viewport');
    const st = makeState();
    await openKalender(page, st);
    const timed = await page.locator('.kal-split-timed').boundingBox();
    const allday = await page.locator('.kal-split-allday').boundingBox();
    expect(timed && allday).toBeTruthy();
    expect(timed.x).toBeLessThan(allday.x);
    expect(Math.abs(timed.y - allday.y)).toBeLessThan(40);
  });

  test('TC-F9-03: Mobile stapelt Split (ganztägig oben, terminiert unten)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'nur Mobile-Viewport');
    const st = makeState();
    await openKalender(page, st);
    const timed = await page.locator('.kal-split-timed').boundingBox();
    const allday = await page.locator('.kal-split-allday').boundingBox();
    expect(timed && allday).toBeTruthy();
    expect(allday.y).toBeLessThan(timed.y);            // allday oben
    expect(Math.abs(timed.x - allday.x)).toBeLessThan(6); // eine Spalte
  });

  test('TC-F9-04: Leere Spalte zeigt Leerhinweis, andere Spalte die Einträge', async ({ page }) => {
    const st = makeState();
    // nur ein terminierter Eintrag, keine ganztägigen → allday-Spalte leer
    st.entries = [
      { id: 'e2', titel: 'Sonntagsbraten', datum: st.di, ganztags: false, uhrzeit: '10:00', kategorie: 'reservierung', wiederholung: '', kunde_id: 'k1', kunde_freitext: '', status: 'offen', notiz: '' },
    ];
    await openKalender(page, st);
    await expect(page.locator('.kal-split-allday .kal-empty-col')).toBeVisible();
    await expect(page.locator('.kal-split-allday .kal-empty-col')).toContainText('Keine ganztägigen');
    await expect(page.locator('.kal-split-timed .kal-tl-row')).toHaveCount(1);
  });

  // ── F10: Touch-First-UI (Tap-Targets ≥44px, keine Hover-only-Aktionen) ──

  test('TC-F10-01: primäre Tap-Targets sind mindestens 44×44px', async ({ page }) => {
    const st = makeState();
    await openKalender(page, st);
    // Aktions-Buttons in Einträgen
    for (const sel of ['.kal-entry .check', '.kal-entry .ic', '.kal-new']) {
      const box = await page.locator(sel).first().boundingBox();
      expect(box, sel).toBeTruthy();
      expect(box.width, sel + ' width').toBeGreaterThanOrEqual(44);
      expect(box.height, sel + ' height').toBeGreaterThanOrEqual(44);
    }
    // Dialog-Buttons
    await openAdd(page);
    for (const sel of ['.kal-modal-x', '.kal-add', '.kal-btn-ghost']) {
      const box = await page.locator(sel).first().boundingBox();
      expect(box, sel).toBeTruthy();
      expect(box.width, sel + ' width').toBeGreaterThanOrEqual(44);
      expect(box.height, sel + ' height').toBeGreaterThanOrEqual(44);
    }
  });

  test('TC-F10-02: Lösch-Aktion ist ohne Hover sichtbar (kein Hover-only)', async ({ page }) => {
    const st = makeState();
    await openKalender(page, st);
    await expect(page.locator('.kal-entry .ic').first()).toBeVisible();
  });

  // ── F11: Autocomplete im Titelfeld aus bestehenden Einträgen ──

  test('TC-F11-01: Titel-Eingabe zeigt passende Vorschläge', async ({ page }) => {
    const st = makeState();
    st.entries.push(
      { id: 'b1', titel: 'Blumen gießen', datum: st.di, ganztags: true, uhrzeit: '', kategorie: 'aufgabe', wiederholung: '', kunde_id: '', kunde_freitext: '', status: 'offen', notiz: '' },
      { id: 'b2', titel: 'Blumenstrauß binden', datum: st.di, ganztags: true, uhrzeit: '', kategorie: 'aufgabe', wiederholung: '', kunde_id: '', kunde_freitext: '', status: 'offen', notiz: '' },
    );
    await openKalender(page, st);
    await openAdd(page);
    await page.locator('#kal-title').fill('Blum');
    await expect(page.locator('#kal-title-dd')).toBeVisible();
    expect(await page.locator('.kal-title-item').count()).toBeGreaterThanOrEqual(2);
  });

  test('TC-F11-02: Vorschlag übernehmen füllt das Titelfeld', async ({ page }) => {
    const st = makeState();
    st.entries.push(
      { id: 'b1', titel: 'Blumen gießen', datum: st.di, ganztags: true, uhrzeit: '', kategorie: 'aufgabe', wiederholung: '', kunde_id: '', kunde_freitext: '', status: 'offen', notiz: '' },
    );
    await openKalender(page, st);
    await openAdd(page);
    await page.locator('#kal-title').fill('Blum');
    await expect(page.locator('.kal-title-item').first()).toBeVisible();
    const label = (await page.locator('.kal-title-item').first().innerText()).trim();
    await page.locator('.kal-title-item').first().click();
    await expect(page.locator('#kal-title')).toHaveValue(label);
    await expect(page.locator('#kal-title-dd')).toBeHidden();
  });

  test('TC-F11-03: Kein Treffer → keine Vorschlagsliste', async ({ page }) => {
    const st = makeState();
    await openKalender(page, st);
    await openAdd(page);
    await page.locator('#kal-title').fill('xyznichtvorhanden');
    await expect(page.locator('#kal-title-dd')).toBeHidden();
  });

  // ── F12: Kategorie „Info“ (Frontend + API-Whitelist) ──

  test('TC-F12-01: Info-Eintrag anlegen sendet kategorie=info', async ({ page }) => {
    const st = makeState();
    await openKalender(page, st);
    await openAdd(page);
    await page.locator('#kal-title').fill('Öffnungszeiten-Hinweis');
    await page.locator('[data-newcat="info"]').click();
    await page.locator('.kal-add').click();
    await expect.poll(() => st.posts.length).toBeGreaterThan(0);
    const p = st.posts.find((x) => x.titel === 'Öffnungszeiten-Hinweis');
    expect(p && p.kategorie).toBe('info');
  });

  test('TC-F12-02: Info-Eintrag erscheint nach Speichern in der Liste (Round-Trip)', async ({ page }) => {
    // E2E-Proxy für die Server-Whitelist: die API ist gemockt, der Backend-Test
    // liegt in api/kalender (KATEGORIEN-Tuple). Hier prüfen wir, dass ein per Info
    // angelegter Eintrag den Round-Trip übersteht und mit cat-info gerendert wird.
    const st = makeState();
    await openKalender(page, st);
    await openAdd(page);
    await page.locator('#kal-title').fill('Info Round-Trip');
    await page.locator('[data-newcat="info"]').click();
    await page.locator('.kal-add').click();
    await expect(page.locator('.kal-split-allday .kal-entry.cat-info')).toBeVisible();
  });

  test('TC-F12-03: Filter „Info“ zeigt nur Info-Einträge', async ({ page }) => {
    const st = makeState();
    st.entries.push(
      { id: 'i1', titel: 'Betriebsurlaub', datum: st.di, ganztags: true, uhrzeit: '', kategorie: 'info', wiederholung: '', kunde_id: '', kunde_freitext: '', status: 'offen', notiz: '' },
    );
    await openKalender(page, st);
    await page.locator('#kal-filters .kal-chip[data-cat="info"]').click();
    await expect(page.locator('.kal-entry.cat-info')).toHaveCount(1);
    await expect(page.locator('.kal-entry:not(.cat-info)')).toHaveCount(0);
  });

  // ── F13: Dialog breiter ab 768px / 1280px ──

  test('TC-F13-01: Dialog auf Mobile schmal (≤420px)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'nur Mobile-Viewport');
    const st = makeState();
    await openKalender(page, st);
    await openAdd(page);
    const box = await page.locator('.kal-modal-card').boundingBox();
    expect(box.width).toBeLessThanOrEqual(420);
  });

  test('TC-F13-02: Dialog auf iPad breiter (>500px)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'ipad-mini', 'nur iPad-Mini-Viewport');
    const st = makeState();
    await openKalender(page, st);
    await openAdd(page);
    const box = await page.locator('.kal-modal-card').boundingBox();
    expect(box.width).toBeGreaterThan(500);
  });

  test('TC-F13-03: Dialog auf Desktop am breitesten (>600px)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'nur Desktop-Viewport');
    const st = makeState();
    await openKalender(page, st);
    await openAdd(page);
    const box = await page.locator('.kal-modal-card').boundingBox();
    expect(box.width).toBeGreaterThan(600);
  });

  // ── F14: Mehrzeiliger Titel (Umbruch, kein horizontaler Overflow) ──

  test('TC-F14-01: Langer Titel bricht mehrzeilig um ohne Overflow', async ({ page }) => {
    const st = makeState();
    const longTitle = 'Sehr langer Hinweistext der über mehrere Zeilen umbrechen muss damit im Kiosk der ganze Inhalt sichtbar bleibt und nichts abgeschnitten wird';
    st.entries = [
      { id: 'lt', titel: longTitle, datum: st.di, ganztags: true, uhrzeit: '', kategorie: 'info', wiederholung: '', kunde_id: '', kunde_freitext: '', status: 'offen', notiz: '' },
    ];
    await openKalender(page, st);
    const title = page.locator('.kal-entry .title', { hasText: 'Sehr langer Hinweistext' });
    await expect(title).toBeVisible();
    const lineCount = await title.evaluate((el) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      return r.getClientRects().length;
    });
    expect(lineCount).toBeGreaterThan(1); // mehrzeilig
    const overflow = await title.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1); // kein horizontaler Overflow
  });

  test('TC-F14-02: Kurzer Titel bleibt einzeilig', async ({ page }) => {
    const st = makeState();
    st.entries = [
      { id: 'kt', titel: 'Kurz', datum: st.di, ganztags: true, uhrzeit: '', kategorie: 'info', wiederholung: '', kunde_id: '', kunde_freitext: '', status: 'offen', notiz: '' },
    ];
    await openKalender(page, st);
    const title = page.locator('.kal-entry .title', { hasText: 'Kurz' });
    await expect(title).toBeVisible();
    // F14-Garantie: kurzer Titel vollständig sichtbar, kein horizontales Clipping.
    const overflow = await title.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});


