# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.js >> Kiosk – Shop Redesign >> T-35-05 (AK-UI-35h) Aufklappen/Zuklappen Toggle vorhanden
- Location: tests\kiosk.spec.js:341:3

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('#abhol-orders button:has-text("Aufklappen"), #abhol-orders button:has-text("Zuklappen")')
Expected: 1
Received: 0
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for locator('#abhol-orders button:has-text("Aufklappen"), #abhol-orders button:has-text("Zuklappen")')
    13 × locator resolved to 0 elements
       - unexpected value "0"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - heading "Dorfladen Kiosk" [level=1] [ref=e3]:
      - img [ref=e4]
      - text: Dorfladen Kiosk
    - generic [ref=e8]:
      - generic "2 Bestellungen heute" [ref=e9]:
        - img [ref=e10]
      - generic [ref=e27]:
        - generic [ref=e28]: Dienstag, 30. Juni 2026
        - generic [ref=e29]: 22:51:03
      - button "Ton ist an (klick = ausschalten)" [ref=e30] [cursor=pointer]:
        - img [ref=e31]
      - button "Hilfe & Workflows" [ref=e35] [cursor=pointer]:
        - img [ref=e36]
      - button "Aktualisieren" [ref=e39] [cursor=pointer]:
        - img [ref=e40]
  - generic [ref=e45]:
    - generic [ref=e46] [cursor=pointer]:
      - img [ref=e48]
      - text: Mittagstisch
    - generic [ref=e51] [cursor=pointer]:
      - img [ref=e53]
      - text: Online-Shop
      - generic "2 zu packen" [ref=e58]: "2"
    - generic [ref=e59] [cursor=pointer]:
      - img [ref=e61]
      - text: Metzger
      - generic [ref=e65]:
        - generic "3 neue Bestellungen" [ref=e66]: "3"
        - generic "3 in Bestellung" [ref=e67]: "3"
    - generic [ref=e68] [cursor=pointer]:
      - img [ref=e70]
      - text: Social
    - generic [ref=e76] [cursor=pointer]:
      - img [ref=e78]
      - text: Stammkunden
  - generic [ref=e84]:
    - generic [ref=e85]:
      - button "Zu erledigen 3" [ref=e86] [cursor=pointer]:
        - img [ref=e87]
        - generic [ref=e91]: Zu erledigen
        - generic [ref=e92]: "3"
      - button "Heute abholen 0" [ref=e93] [cursor=pointer]:
        - img [ref=e94]
        - generic [ref=e96]: Heute abholen
        - generic [ref=e97]: "0"
      - button "Überfällig 0" [ref=e98] [cursor=pointer]:
        - img [ref=e99]
        - generic [ref=e101]: Überfällig
        - generic [ref=e102]: "0"
      - button "Historie 38" [ref=e103] [cursor=pointer]:
        - img [ref=e104]
        - generic [ref=e108]: Historie
        - generic [ref=e109]: "38"
    - generic [ref=e110]:
      - generic [ref=e111]:
        - generic [ref=e112]: "2"
        - generic [ref=e113]: Packen
      - generic [ref=e114]:
        - generic [ref=e115]: "1"
        - generic [ref=e116]: Warten
      - button "Aufklappen" [ref=e117] [cursor=pointer]:
        - img [ref=e118]
        - text: Aufklappen
    - generic [ref=e121]:
      - generic [ref=e123] [cursor=pointer]:
        - generic [ref=e124]: ▼
        - text: Morgen · Vormittag (07:30–14:00)
        - generic [ref=e126]:
          - img [ref=e127]
          - text: 1 Warten
      - generic [ref=e131] [cursor=pointer]:
        - generic [ref=e132]: ▼
        - text: 02.07.2026 · Vormittag (07:30–14:00)
        - generic [ref=e134]:
          - img [ref=e135]
          - text: 1 Packen
      - generic [ref=e140] [cursor=pointer]:
        - generic [ref=e141]: ▼
        - text: 03.07.2026 · Vormittag (10:00–14:00)
        - generic [ref=e143]:
          - img [ref=e144]
          - text: 1 Packen
  - generic [ref=e148]: ⚠ TEST-UMGEBUNG – Nicht die Live-Seite!
```

# Test source

```ts
  249 |     await page.waitForTimeout(1000);
  250 |     const btn = page.locator('#btn-new-order');
  251 |     const hour = new Date().getHours();
  252 |     if (hour >= 12) {
  253 |       // After cutoff: button should be disabled
  254 |       await expect(btn).toBeDisabled();
  255 |       const opacity = await btn.evaluate(el => getComputedStyle(el).opacity);
  256 |       expect(parseFloat(opacity)).toBeLessThan(1);
  257 |     } else {
  258 |       // Before cutoff: button should be enabled
  259 |       await expect(btn).toBeEnabled();
  260 |     }
  261 |   });
  262 | });
  263 | 
  264 | // ════════════════════════════════════════════════════
  265 | //  Shop – Bestellkarten Redesign
  266 | // ════════════════════════════════════════════════════
  267 | 
  268 | test.describe('Kiosk – Shop Redesign', () => {
  269 |   test('T-35-01 (AK-UI-35) Shop-Karten haben Collapse-Pattern', async ({ page }) => {
  270 |     await page.goto(KIOSK_URL);
  271 |     await page.locator('.k-tab[data-tab="abhol"]').click();
  272 |     await page.waitForTimeout(2000);
  273 |     // Cards should have k-order-hdr (collapsible header) and k-order-body
  274 |     const cards = page.locator('#abhol-orders .k-order');
  275 |     const count = await cards.count();
  276 |     if (count > 0) {
  277 |       const hdr = cards.first().locator('.k-order-hdr');
  278 |       await expect(hdr).toHaveCount(1);
  279 |       const body = cards.first().locator('.k-order-body');
  280 |       await expect(body).toHaveCount(1);
  281 |       // Default collapsed
  282 |       await expect(cards.first()).toHaveClass(/oc-collapsed/);
  283 |     }
  284 |   });
  285 | 
  286 |   test('T-35-02 (AK-UI-35b) Header zeigt Name, Status-Badge, Preis', async ({ page }) => {
  287 |     await page.goto(KIOSK_URL);
  288 |     await page.locator('.k-tab[data-tab="abhol"]').click();
  289 |     await page.waitForTimeout(2000);
  290 |     const cards = page.locator('#abhol-orders .k-order');
  291 |     const count = await cards.count();
  292 |     if (count > 0) {
  293 |       const hdr = cards.first().locator('.k-order-hdr');
  294 |       // Name
  295 |       const name = hdr.locator('.k-oc-name');
  296 |       await expect(name).toHaveCount(1);
  297 |       const nameText = await name.textContent();
  298 |       expect(nameText.length).toBeGreaterThan(0);
  299 |       // Price (€)
  300 |       const priceText = await hdr.textContent();
  301 |       expect(priceText).toContain('€');
  302 |     }
  303 |   });
  304 | 
  305 |   test('T-35-03 (AK-UI-35d) Primär-Action im Header erreichbar', async ({ page }) => {
  306 |     await page.goto(KIOSK_URL);
  307 |     await page.locator('.k-tab[data-tab="abhol"]').click();
  308 |     await page.waitForTimeout(2000);
  309 |     const cards = page.locator('#abhol-orders .k-order');
  310 |     const count = await cards.count();
  311 |     if (count > 0) {
  312 |       const hdrActions = cards.first().locator('.k-order-hdr .k-oc-actions');
  313 |       await expect(hdrActions).toHaveCount(1);
  314 |       const btns = hdrActions.locator('.k-btn');
  315 |       const btnCount = await btns.count();
  316 |       expect(btnCount).toBeGreaterThanOrEqual(1);
  317 |     }
  318 |   });
  319 | 
  320 |   test('T-35-04 (AK-UI-35f) Details-Button im Body ist vollwertiger Button', async ({ page }) => {
  321 |     await page.goto(KIOSK_URL);
  322 |     await page.locator('.k-tab[data-tab="abhol"]').click();
  323 |     await page.waitForTimeout(2000);
  324 |     // Switch to "Heute" filter so all statuses are visible
  325 |     const todayFilter = page.locator('#abhol-filter-bar .k-filter-btn[data-filter="today"]');
  326 |     if (await todayFilter.count() > 0) await todayFilter.click();
  327 |     await page.waitForTimeout(1000);
  328 |     const cards = page.locator('#abhol-orders .k-order');
  329 |     const count = await cards.count();
  330 |     if (count > 0) {
  331 |       // Expand first card via JS to avoid visibility issues
  332 |       await cards.first().evaluate(el => el.classList.remove('oc-collapsed'));
  333 |       await page.waitForTimeout(300);
  334 |       // Find Details button (icon-only with file-text SVG)
  335 |       const detailBtn = cards.first().locator('.k-order-body button:has(svg.lucide-file-text)');
  336 |       const detailCount = await detailBtn.count();
  337 |       expect(detailCount).toBeGreaterThanOrEqual(1);
  338 |     }
  339 |   });
  340 | 
  341 |   test('T-35-05 (AK-UI-35h) Aufklappen/Zuklappen Toggle vorhanden', async ({ page }) => {
  342 |     await page.goto(KIOSK_URL);
  343 |     await page.locator('.k-tab[data-tab="abhol"]').click();
  344 |     await page.waitForTimeout(2000);
  345 |     const cards = page.locator('#abhol-orders .k-order');
  346 |     const count = await cards.count();
  347 |     if (count > 1) {
  348 |       const toggleBtn = page.locator('#abhol-orders button:has-text("Aufklappen"), #abhol-orders button:has-text("Zuklappen")');
> 349 |       await expect(toggleBtn).toHaveCount(1);
      |                               ^ Error: expect(locator).toHaveCount(expected) failed
  350 |     }
  351 |   });
  352 | });
  353 | 
  354 | // ════════════════════════════════════════════════════
  355 | //  Mittagstisch – Bestätigen-Dialog
  356 | // ════════════════════════════════════════════════════
  357 | 
  358 | test.describe('Kiosk – Bestätigen-Dialog', () => {
  359 | 
  360 |   test('Bestätigen öffnet Dialog mit Textfeld, Abbrechen schließt ihn', async ({ page }) => {
  361 |     await page.goto(KIOSK_URL);
  362 |     await page.locator('.k-tab[data-tab="mittag"]').click();
  363 |     await page.waitForTimeout(2000);
  364 |     const confirmBtn = page.locator('.k-order-actions .k-btn-confirm:has-text("Bestätigen")').first();
  365 |     if (await confirmBtn.count() === 0) {
  366 |       test.skip(true, 'Keine offene Bestellung vorhanden');
  367 |       return;
  368 |     }
  369 |     await confirmBtn.click();
  370 |     const dialog = page.locator('.k-confirm-dialog').first();
  371 |     await expect(dialog).toBeVisible();
  372 |     // Optionales Textfeld vorhanden
  373 |     const input = page.locator('.k-confirm-input').first();
  374 |     await expect(input).toBeVisible();
  375 |     await expect(input).toHaveAttribute('placeholder', /optional/i);
  376 |     // Abbrechen schließt Dialog
  377 |     await page.locator('.k-btn-outline:has-text("Abbrechen")').first().click();
  378 |     await expect(dialog).not.toBeVisible();
  379 |   });
  380 | });
  381 | 
  382 | // ════════════════════════════════════════════════════
  383 | //  Stammkunden – Formular-Validierung
  384 | // ════════════════════════════════════════════════════
  385 | 
  386 | test.describe('Kiosk – Stammkunden Formular', () => {
  387 | 
  388 |   test('Nachname Pflichtfeld: Submit ohne Nachname zeigt Fehler', async ({ page }) => {
  389 |     await page.goto(KIOSK_URL);
  390 |     await page.locator('.k-tab[data-tab="kunden"]').click();
  391 |     await page.locator('text=Neuer Kunde').click();
  392 |     await expect(page.locator('#nk-nachname')).toBeVisible();
  393 |     await expect(page.locator('#nk-vorname')).toBeVisible();
  394 |     // Submit without Nachname
  395 |     await page.locator('#nk-phone').fill('123');
  396 |     await page.locator('text=Kunde anlegen').click();
  397 |     await expect(page.locator('#k-toast')).toContainText('Nachname');
  398 |   });
  399 | });
  400 | 
  401 | // ════════════════════════════════════════════════════
  402 | //  Datum-Normalisierung – lunch-order API
  403 | // ════════════════════════════════════════════════════
  404 | 
  405 | test.describe('Datum-Normalisierung – API', () => {
  406 | 
  407 |   test('POST normalisiert ISO-Datum auf YYYY-MM-DD', async ({ request }) => {
  408 |     const response = await request.post(`${BASE}/api/lunch-order`, {
  409 |       data: {
  410 |         name: 'Datum-Test ISO',
  411 |         email: 'datumtest@test.de',
  412 |         gericht: 'Testgericht Datum',
  413 |         menge: 1,
  414 |         preis: 5.00,
  415 |         datum: '2026-06-22T00:00:00Z',
  416 |         wochentag_label: 'Montag',
  417 |         quelle: 0
  418 |       }
  419 |     });
  420 |     expect(response.status()).toBe(201);
  421 |     const body = await response.json();
  422 |     expect(body.success).toBe(true);
  423 |     expect(body.order.datum).toBe('2026-06-22');
  424 |     expect(body.order.datum).not.toContain('T');
  425 |   });
  426 | 
  427 |   test('GET findet Bestellungen und alle Datums-Felder normalisiert', async ({ request }) => {
  428 |     const response = await request.get(`${BASE}/api/lunch-order`);
  429 |     expect(response.status()).toBe(200);
  430 |     const body = await response.json();
  431 |     expect(body.success).toBe(true);
  432 |     for (const order of body.orders) {
  433 |       if (order.datum) {
  434 |         expect(order.datum).not.toContain('T00:00:00Z');
  435 |         expect(order.datum).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  436 |       }
  437 |     }
  438 |   });
  439 | });
  440 | 
  441 | // ════════════════════════════════════════════════════
  442 | //  Pack-Modal – E2E Workflow
  443 | // ════════════════════════════════════════════════════
  444 | 
  445 | test.describe('Kiosk – Packen E2E', () => {
  446 | 
  447 |   test('Pack-Modal öffnet inline, zeigt Positionen, Checkbox aktualisiert Summe + Fortschritt', async ({ page }) => {
  448 |     await page.goto(KIOSK_URL);
  449 |     await page.waitForTimeout(2000);
```