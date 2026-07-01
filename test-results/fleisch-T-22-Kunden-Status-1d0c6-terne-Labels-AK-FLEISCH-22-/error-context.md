# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fleisch.spec.js >> T-22 Kunden-Status-Labels (AK-FLEISCH-22) >> T-22-05 Kiosk behält interne Labels (AK-FLEISCH-22)
- Location: tests\fleisch.spec.js:454:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "internal-labels"
Received: "not-found"
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - heading "Dorfladen Kiosk" [level=1] [ref=e3]:
      - img [ref=e4]
      - text: Dorfladen Kiosk
    - generic [ref=e8]:
      - generic "Bestellungen heute" [ref=e9]
      - generic [ref=e10]:
        - generic [ref=e11]: Dienstag, 30. Juni 2026
        - generic [ref=e12]: 22:50:07
      - button "Ton ist an (klick = ausschalten)" [ref=e13] [cursor=pointer]:
        - img [ref=e14]
      - button "Hilfe & Workflows" [ref=e18] [cursor=pointer]:
        - img [ref=e19]
      - button "Aktualisieren" [ref=e22] [cursor=pointer]:
        - img [ref=e23]
  - generic [ref=e28]:
    - generic [ref=e29] [cursor=pointer]:
      - img [ref=e31]
      - text: Mittagstisch
    - generic [ref=e34] [cursor=pointer]:
      - img [ref=e36]
      - text: Online-Shop
    - generic [ref=e40] [cursor=pointer]:
      - img [ref=e42]
      - text: Metzger
    - generic [ref=e46] [cursor=pointer]:
      - img [ref=e48]
      - text: Social
    - generic [ref=e54] [cursor=pointer]:
      - img [ref=e56]
      - text: Stammkunden
  - generic [ref=e62]:
    - generic [ref=e63]:
      - button "Zu erledigen -" [ref=e64] [cursor=pointer]:
        - img [ref=e65]
        - generic [ref=e69]: Zu erledigen
        - generic [ref=e70]: "-"
      - button "Heute abholen -" [ref=e71] [cursor=pointer]:
        - img [ref=e72]
        - generic [ref=e74]: Heute abholen
        - generic [ref=e75]: "-"
      - button "Überfällig -" [ref=e76] [cursor=pointer]:
        - img [ref=e77]
        - generic [ref=e79]: Überfällig
        - generic [ref=e80]: "-"
      - button "Historie 0" [ref=e81] [cursor=pointer]:
        - img [ref=e82]
        - generic [ref=e86]: Historie
        - generic [ref=e87]: "0"
    - generic [ref=e90]:
      - img [ref=e92]
      - text: Laden…
  - generic [ref=e97]: ⚠ TEST-UMGEBUNG – Nicht die Live-Seite!
```

# Test source

```ts
  364 |     expect(await headerBtns.count()).toBeGreaterThanOrEqual(1);
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
> 464 |     expect(labels).toBe('internal-labels');
      |                    ^ Error: expect(received).toBe(expected) // Object.is equality
  465 |   });
  466 | });
  467 | 
  468 | // ════════════════════════════════════════════════════
  469 | //  T-18: CMS-Metzger Lesbarkeit & Bestelldetails (AK-FLEISCH-17)
  470 | // ════════════════════════════════════════════════════
  471 | 
  472 | test.describe('T-18 CMS Metzger Bestelldetails (AK-FLEISCH-17)', () => {
  473 | 
  474 |   async function cmsLogin(page) {
  475 |     await page.goto(`${BASE}/cms`);
  476 |     await page.waitForTimeout(2000);
  477 |     const pwField = page.locator('#cms-login-pw');
  478 |     if (await pwField.isVisible()) {
  479 |       await pwField.fill('DorfladenCMS!');
  480 |       await page.locator('#cms-login-btn').click();
  481 |       await page.waitForTimeout(1000);
  482 |     }
  483 |   }
  484 | 
  485 |   test('T-18-01 Bestellkarten aufklappbar (AK-FLEISCH-17)', async ({ page }) => {
  486 |     await cmsLogin(page);
  487 |     await page.click('#cms-tab-metzger');
  488 |     await page.waitForTimeout(500);
  489 |     await page.click('#fm-orders-btn-alle');
  490 |     await page.waitForTimeout(3000);
  491 |     const toggleCount = await page.evaluate(() => document.querySelectorAll('[data-fm-toggle]').length);
  492 |     // If there are orders, they should have toggle elements
  493 |     if (toggleCount > 0) {
  494 |       // Click first toggle to expand
  495 |       await page.click('[data-fm-toggle="0"]');
  496 |       await page.waitForTimeout(300);
  497 |       const detail = page.locator('[data-fm-detail="0"]');
  498 |       await expect(detail).toBeVisible();
  499 |     }
  500 |     // At minimum the cmsLoadFleischOrders function should exist
  501 |     const hasFn = await page.evaluate(() => typeof cmsLoadFleischOrders === 'function');
  502 |     expect(hasFn).toBe(true);
  503 |   });
  504 | 
  505 |   test('T-18-02 Status-Buttons vorhanden (AK-FLEISCH-17)', async ({ page }) => {
  506 |     await cmsLogin(page);
  507 |     await page.click('#cms-tab-metzger');
  508 |     await page.waitForTimeout(500);
  509 |     await page.click('#fm-orders-btn-alle');
  510 |     await page.waitForTimeout(3000);
  511 |     const toggleCount = await page.evaluate(() => document.querySelectorAll('[data-fm-toggle]').length);
  512 |     if (toggleCount > 0) {
  513 |       await page.click('[data-fm-toggle="0"]');
  514 |       await page.waitForTimeout(300);
  515 |       const statusBtnCount = await page.evaluate(() => document.querySelectorAll('[data-fm-status]').length);
  516 |       expect(statusBtnCount).toBeGreaterThan(0);
  517 |     }
  518 |     // Source code should contain FM_STATUS_L
  519 |     const src = await page.evaluate(() => typeof FM_STATUS_L !== 'undefined' || document.querySelector('script[src*="cms"]') !== null);
  520 |     expect(src).toBe(true);
  521 |   });
  522 | 
  523 |   test('T-18-03 Nachricht-Button vorhanden (AK-FLEISCH-17)', async ({ page }) => {
  524 |     await cmsLogin(page);
  525 |     await page.click('#cms-tab-metzger');
  526 |     await page.waitForTimeout(500);
  527 |     await page.click('#fm-orders-btn-alle');
  528 |     await page.waitForTimeout(3000);
  529 |     const toggleCount = await page.evaluate(() => document.querySelectorAll('[data-fm-toggle]').length);
  530 |     if (toggleCount > 0) {
  531 |       await page.click('[data-fm-toggle="0"]');
  532 |       await page.waitForTimeout(300);
  533 |       const replyBtn = page.locator('[data-fm-reply]').first();
  534 |       await expect(replyBtn).toBeVisible();
  535 |     }
  536 |   });
  537 | });
  538 | 
  539 | // ════════════════════════════════════════════════════
  540 | //  T-19: CMS Sammelbestellung aufsummiert (AK-FLEISCH-18)
  541 | // ════════════════════════════════════════════════════
  542 | 
  543 | test.describe('T-19 CMS Sammelbestellung (AK-FLEISCH-18)', () => {
  544 | 
  545 |   async function cmsLogin(page) {
  546 |     await page.goto(`${BASE}/cms`);
  547 |     await page.waitForTimeout(2000);
  548 |     const pwField = page.locator('#cms-login-pw');
  549 |     if (await pwField.isVisible()) {
  550 |       await pwField.fill('DorfladenCMS!');
  551 |       await page.locator('#cms-login-btn').click();
  552 |       await page.waitForTimeout(1000);
  553 |     }
  554 |   }
  555 | 
  556 |   test('T-19-01 Sammelbestellung zeigt aggregierte Artikel (AK-FLEISCH-18)', async ({ page }) => {
  557 |     await cmsLogin(page);
  558 |     await page.click('#cms-tab-metzger');
  559 |     await page.waitForTimeout(500);
  560 |     await page.click('#fm-orders-btn-sammel');
  561 |     await page.waitForTimeout(3000);
  562 |     // The Sammelbestellung should either show "Keine offenen Bestellungen" or grouped tables
  563 |     const content = await page.locator('#fm-orders-list').innerHTML();
  564 |     // Should NOT contain individual order numbers (no FM- prefix in table)
```