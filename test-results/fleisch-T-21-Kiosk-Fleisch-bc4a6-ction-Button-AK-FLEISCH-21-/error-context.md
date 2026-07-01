# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fleisch.spec.js >> T-21 Kiosk Fleisch Per-Item-Bestellung (AK-FLEISCH-21) >> T-21-09 Status 1+: Header zeigt Quick-Action-Button (AK-FLEISCH-21)
- Location: tests\fleisch.spec.js:353:3

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 1
Received:    0
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
        - generic [ref=e29]: 22:50:00
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
      - button "Zu erledigen 6" [ref=e86] [cursor=pointer]:
        - img [ref=e87]
        - generic [ref=e90]: Zu erledigen
        - generic [ref=e91]: "6"
      - button "Heute abholen 0" [ref=e92] [cursor=pointer]:
        - img [ref=e93]
        - generic [ref=e96]: Heute abholen
        - generic [ref=e97]: "0"
      - button "Sammelbestellung" [ref=e98] [cursor=pointer]:
        - img [ref=e99]
        - generic [ref=e102]: Sammelbestellung
      - button "Nachrichten" [ref=e103] [cursor=pointer]:
        - img [ref=e104]
        - generic [ref=e106]: Nachrichten
      - button "Historie" [ref=e108] [cursor=pointer]:
        - img [ref=e109]
        - generic [ref=e113]: Historie
    - generic [ref=e114]:
      - generic [ref=e115]:
        - generic [ref=e116] [cursor=pointer]:
          - img [ref=e118]
          - generic [ref=e120]:
            - img [ref=e121]
            - text: Do 02.07.2026
          - generic [ref=e123]:
            - generic [ref=e124]: 2 Pos.
            - generic [ref=e125]: 2.0 kg
          - generic [ref=e126]: 2 Best.
        - generic [ref=e127]:
          - generic [ref=e129] [cursor=pointer]:
            - img [ref=e131]
            - generic [ref=e133]: Josef Rumpfinger
            - generic [ref=e134]:
              - generic [ref=e135]: 1 Art.
              - generic [ref=e136]: 1.0 kg
            - generic [ref=e138]: In Bestellung
          - generic [ref=e140] [cursor=pointer]:
            - img [ref=e142]
            - generic [ref=e144]: Josef Rumpfinger
            - generic [ref=e145]:
              - generic [ref=e146]: 1 Art.
              - generic [ref=e147]: 1.0 kg
            - generic [ref=e148]:
              - generic [ref=e149]: In Bestellung
              - generic "Kommentar" [ref=e150]:
                - img [ref=e151]
      - generic [ref=e153]:
        - generic [ref=e154] [cursor=pointer]:
          - img [ref=e156]
          - generic [ref=e158]:
            - img [ref=e159]
            - text: Mo 06.07.2026
          - generic [ref=e161]:
            - generic [ref=e162]: 2 Pos.
            - generic [ref=e163]: 8.0 kg
          - generic [ref=e164]: 1 Best.
        - generic [ref=e167] [cursor=pointer]:
          - img [ref=e169]
          - generic [ref=e171]: Josef Rumpfinger
          - generic [ref=e172]:
            - generic [ref=e173]: 2 Art.
            - generic [ref=e174]: 8.0 kg
          - generic [ref=e176]: Neu
          - generic [ref=e178]: 0/2
      - generic [ref=e179]:
        - generic [ref=e180] [cursor=pointer]:
          - img [ref=e182]
          - generic [ref=e184]:
            - img [ref=e185]
            - text: Do 09.07.2026
          - generic [ref=e187]:
            - generic [ref=e188]: 2 Pos.
            - generic [ref=e189]: 4.5 kg
          - generic [ref=e190]: 1 Best.
        - generic [ref=e193] [cursor=pointer]:
          - img [ref=e195]
          - generic [ref=e197]: Dieter Mücke
          - generic [ref=e198]:
            - generic [ref=e199]: 2 Art.
            - generic [ref=e200]: 4.5 kg
          - generic [ref=e202]: Neu
          - generic [ref=e204]: 0/2
      - generic [ref=e205]:
        - generic [ref=e206] [cursor=pointer]:
          - img [ref=e208]
          - generic [ref=e210]:
            - img [ref=e211]
            - text: Mo 13.07.2026
          - generic [ref=e213]:
            - generic [ref=e214]: 2 Pos.
            - generic [ref=e215]: 2.0 kg
          - generic [ref=e216]: 2 Best.
        - generic [ref=e217]:
          - generic [ref=e219] [cursor=pointer]:
            - img [ref=e221]
            - generic [ref=e223]: Josef Rumpfinger
            - generic [ref=e224]:
              - generic [ref=e225]: 1 Art.
              - generic [ref=e226]: 1.0 kg
            - generic [ref=e228]: In Bestellung
          - generic [ref=e230] [cursor=pointer]:
            - img [ref=e232]
            - generic [ref=e234]: Josef Rumpfinger
            - generic [ref=e235]:
              - generic [ref=e236]: 1 Art.
              - generic [ref=e237]: 1.0 kg
            - generic [ref=e239]: Neu
            - generic [ref=e241]: 0/1
  - generic [ref=e242]: ⚠ TEST-UMGEBUNG – Nicht die Live-Seite!
```

# Test source

```ts
  264 |     const hasFn = await page.evaluate(() => typeof K !== 'undefined' && typeof K.toggleFmItemBestellt === 'function');
  265 |     expect(hasFn).toBe(true);
  266 |   });
  267 | 
  268 |   test('T-21-02 toggleAllFmItems Funktion existiert (AK-FLEISCH-21)', async ({ page }) => {
  269 |     await page.goto(KIOSK_URL);
  270 |     await page.waitForTimeout(3000);
  271 |     const hasFn = await page.evaluate(() => typeof K !== 'undefined' && typeof K.toggleAllFmItems === 'function');
  272 |     expect(hasFn).toBe(true);
  273 |   });
  274 | 
  275 |   test('T-21-03 Metzger-Karte zeigt 2-Spalten-Grid-Layout (AK-FLEISCH-21)', async ({ page }) => {
  276 |     await page.goto(KIOSK_URL);
  277 |     await page.locator('.k-tab[data-tab="metzger"]').click();
  278 |     await page.waitForTimeout(2000);
  279 |     // Expand first order card if any
  280 |     const cards = page.locator('#metzger-orders .k-order');
  281 |     const count = await cards.count();
  282 |     if (count === 0) {
  283 |       test.skip(true, 'Keine Metzger-Bestellungen vorhanden');
  284 |       return;
  285 |     }
  286 |     await cards.first().locator('.k-order-hdr').click();
  287 |     await page.waitForTimeout(300);
  288 |     // Check for grid layout in the body
  289 |     const gridEl = cards.first().locator('.k-order-body div[style*="grid-template-columns"]');
  290 |     const gridCount = await gridEl.count();
  291 |     expect(gridCount).toBeGreaterThanOrEqual(1);
  292 |   });
  293 | 
  294 |   test('T-21-04 Checkboxen bei Status 0/1 sichtbar (AK-FLEISCH-21)', async ({ page }) => {
  295 |     await page.goto(KIOSK_URL);
  296 |     await page.locator('.k-tab[data-tab="metzger"]').click();
  297 |     await page.waitForTimeout(2000);
  298 |     // Find cards with status 0 or 1
  299 |     const openCards = page.locator('#metzger-orders .k-order[data-fmstatus="0"], #metzger-orders .k-order[data-fmstatus="1"]');
  300 |     const count = await openCards.count();
  301 |     if (count === 0) {
  302 |       test.skip(true, 'Keine offenen Metzger-Bestellungen');
  303 |       return;
  304 |     }
  305 |     // Expand first open card
  306 |     await openCards.first().locator('.k-order-hdr').click();
  307 |     await page.waitForTimeout(300);
  308 |     // Should have checkboxes
  309 |     const checkboxes = openCards.first().locator('input[type="checkbox"]');
  310 |     const cbCount = await checkboxes.count();
  311 |     expect(cbCount).toBeGreaterThanOrEqual(1);
  312 |   });
  313 | 
  314 |   test('T-21-05 Status-Badge mit korrekter CSS-Klasse (AK-FLEISCH-21)', async ({ page }) => {
  315 |     await page.goto(KIOSK_URL);
  316 |     await page.locator('.k-tab[data-tab="metzger"]').click();
  317 |     await page.waitForTimeout(2000);
  318 |     const badges = page.locator('#metzger-orders .k-badge');
  319 |     const count = await badges.count();
  320 |     if (count === 0) {
  321 |       test.skip(true, 'Keine Metzger-Bestellungen vorhanden');
  322 |       return;
  323 |     }
  324 |     // Each badge should have one of the status classes
  325 |     for (let i = 0; i < Math.min(count, 5); i++) {
  326 |       const badge = badges.nth(i);
  327 |       const classes = await badge.getAttribute('class');
  328 |       const hasStatusClass = /st-(new|confirm|ready|done|cancel)/.test(classes);
  329 |       expect(hasStatusClass).toBe(true);
  330 |     }
  331 |   });
  332 | 
  333 |   test('T-21-06 Status 0: Header zeigt Fortschritt statt Button (AK-FLEISCH-21)', async ({ page }) => {
  334 |     await page.goto(KIOSK_URL);
  335 |     await page.locator('.k-tab[data-tab="metzger"]').click();
  336 |     await page.waitForTimeout(2000);
  337 |     const newCards = page.locator('#metzger-orders .k-order[data-fmstatus="0"]');
  338 |     const count = await newCards.count();
  339 |     if (count === 0) {
  340 |       test.skip(true, 'Keine Metzger-Bestellungen mit Status 0');
  341 |       return;
  342 |     }
  343 |     // Header should show progress span (X/Y), NOT a button
  344 |     const headerActions = newCards.first().locator('.k-order-hdr .k-oc-actions');
  345 |     const headerBtns = headerActions.locator('button');
  346 |     const headerSpans = headerActions.locator('span[style*="font-size:11px"]');
  347 |     expect(await headerBtns.count()).toBe(0);
  348 |     expect(await headerSpans.count()).toBe(1);
  349 |     const text = await headerSpans.first().textContent();
  350 |     expect(text).toMatch(/\d+\/\d+/);
  351 |   });
  352 | 
  353 |   test('T-21-09 Status 1+: Header zeigt Quick-Action-Button (AK-FLEISCH-21)', async ({ page }) => {
  354 |     await page.goto(KIOSK_URL);
  355 |     await page.locator('.k-tab[data-tab="metzger"]').click();
  356 |     await page.waitForTimeout(2000);
  357 |     const activeCards = page.locator('#metzger-orders .k-order[data-fmstatus="1"], #metzger-orders .k-order[data-fmstatus="2"]');
  358 |     const count = await activeCards.count();
  359 |     if (count === 0) {
  360 |       test.skip(true, 'Keine Metzger-Bestellungen mit Status 1/2');
  361 |       return;
  362 |     }
  363 |     const headerBtns = activeCards.first().locator('.k-order-hdr .k-oc-actions button');
> 364 |     expect(await headerBtns.count()).toBeGreaterThanOrEqual(1);
      |                                      ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
  365 |   });
  366 | 
  367 |   test('T-21-07 API PATCH akzeptiert positionen (AK-FLEISCH-21)', async ({ request }) => {
  368 |     const resp = await request.patch(`${BASE}/api/fleisch-order`, {
  369 |       data: { id: 'nonexistent-id-12345', positionen: [{ bezeichnung: 'Test', bestellt: true }] },
  370 |       headers: { 'Content-Type': 'application/json' }
  371 |     });
  372 |     // 400/404/500 are all acceptable (invalid GUID → Dataverse error)
  373 |     // The key check: positionen is accepted as a field and does NOT cause a parse error
  374 |     expect([400, 404, 500]).toContain(resp.status());
  375 |     const data = await resp.json();
  376 |     expect(data.success).toBe(false);
  377 |     // Should NOT contain "positionen" validation error (the format is valid)
  378 |     expect(data.error || '').not.toContain('Array von Objekten');
  379 |   });
  380 | 
  381 |   test('T-21-08 API PATCH validiert positionen-Format (AK-FLEISCH-21)', async ({ request }) => {
  382 |     const resp = await request.patch(`${BASE}/api/fleisch-order`, {
  383 |       data: { id: 'test', positionen: 'invalid-not-array' },
  384 |       headers: { 'Content-Type': 'application/json' }
  385 |     });
  386 |     expect(resp.status()).toBe(400);
  387 |   });
  388 | });
  389 | 
  390 | // ════════════════════════════════════════════════════
  391 | //  T-22: Kunden-Status-Labels (AK-FLEISCH-22)
  392 | // ════════════════════════════════════════════════════
  393 | 
  394 | test.describe('T-22 Kunden-Status-Labels (AK-FLEISCH-22)', () => {
  395 | 
  396 |   test('T-22-01 API liefert status_label_kunde (AK-FLEISCH-22)', async ({ request }) => {
  397 |     const resp = await request.get(`${BASE}/api/fleisch-order?mode=kiosk`);
  398 |     expect(resp.ok()).toBeTruthy();
  399 |     const data = await resp.json();
  400 |     expect(data.success).toBe(true);
  401 |     const orders = data.bestellungen || [];
  402 |     if (orders.length === 0) { test.skip(); return; }
  403 |     for (const o of orders) {
  404 |       expect(o).toHaveProperty('status_label_kunde');
  405 |       expect(o.status_label_kunde).toBeTruthy();
  406 |     }
  407 |   });
  408 | 
  409 |   test('T-22-02 status_label_kunde Mapping korrekt (AK-FLEISCH-22)', async ({ request }) => {
  410 |     const resp = await request.get(`${BASE}/api/fleisch-order?mode=kiosk`);
  411 |     const data = await resp.json();
  412 |     const EXPECTED = { 0: 'Neu', 1: 'Bestätigt', 2: 'Abholbereit', 3: 'Abgeholt', 4: 'Storniert' };
  413 |     const orders = data.bestellungen || [];
  414 |     if (orders.length === 0) { test.skip(); return; }
  415 |     for (const o of orders) {
  416 |       const expected = EXPECTED[o.status];
  417 |       if (expected) {
  418 |         expect(o.status_label_kunde).toBe(expected);
  419 |       }
  420 |       expect(o.status_label_kunde).not.toBe('Beim Metzger');
  421 |       expect(o.status_label_kunde).not.toBe('Eingetroffen');
  422 |     }
  423 |   });
  424 | 
  425 |   test('T-22-03 Homepage-Widget zeigt Kunden-Labels (AK-FLEISCH-22)', async ({ page }) => {
  426 |     await page.goto(BASE);
  427 |     // Check that the FM_ST map in index.html uses customer labels
  428 |     const labels = await page.evaluate(() => {
  429 |       const scripts = document.querySelectorAll('script');
  430 |       for (const s of scripts) {
  431 |         const txt = s.textContent || '';
  432 |         if (txt.includes('FM_ST') && txt.includes('Bestätigt')) return 'customer-labels';
  433 |         if (txt.includes('FM_ST') && txt.includes('Beim Metzger')) return 'internal-labels';
  434 |       }
  435 |       return 'not-found';
  436 |     });
  437 |     expect(labels).toBe('customer-labels');
  438 |   });
  439 | 
  440 |   test('T-22-04 Bestellstatus-Seite zeigt Kunden-Labels (AK-FLEISCH-22)', async ({ page }) => {
  441 |     await page.goto(`${BASE}/bestellstatus`);
  442 |     const labels = await page.evaluate(() => {
  443 |       const scripts = document.querySelectorAll('script');
  444 |       for (const s of scripts) {
  445 |         const txt = s.textContent || '';
  446 |         if (txt.includes('FM_STATUS_LABELS') && txt.includes('Bestätigt') && txt.includes('Abholbereit')) return 'customer-labels';
  447 |         if (txt.includes('FM_STATUS_LABELS') && txt.includes('Beim Metzger')) return 'internal-labels';
  448 |       }
  449 |       return 'not-found';
  450 |     });
  451 |     expect(labels).toBe('customer-labels');
  452 |   });
  453 | 
  454 |   test('T-22-05 Kiosk behält interne Labels (AK-FLEISCH-22)', async ({ page }) => {
  455 |     await page.goto(`${BASE}/kiosk`);
  456 |     const labels = await page.evaluate(() => {
  457 |       const scripts = document.querySelectorAll('script');
  458 |       for (const s of scripts) {
  459 |         const txt = s.textContent || '';
  460 |         if (txt.includes("STATUS_LABELS") && txt.includes("'Beim Metzger'")) return 'internal-labels';
  461 |       }
  462 |       return 'not-found';
  463 |     });
  464 |     expect(labels).toBe('internal-labels');
```