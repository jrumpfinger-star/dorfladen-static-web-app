# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.js >> Kiosk – Packen E2E >> Pack-Modal öffnet inline, zeigt Positionen, Checkbox aktualisiert Summe + Fortschritt
- Location: tests\kiosk.spec.js:447:3

# Error details

```
Error: locator.click: Element is not visible
Call log:
  - waiting for locator('button[onclick*="openPackModal"]').first()
    - locator resolved to <button title="Packen" class="k-btn k-btn-sm" onclick="K.openPackModal('fa2c5649-cd73-f111-ab0d-70a8a5189aae')">…</button>
  - attempting click action
    - scrolling into view if needed

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
        - generic [ref=e29]: 22:51:15
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
  450 |     // Find Packen button (status 1 or ungepackte status 2)
  451 |     const packBtn = page.locator('button[onclick*="openPackModal"]').first();
  452 |     if (await packBtn.count() === 0) {
  453 |       test.skip(true, 'Keine packbare Bestellung vorhanden');
  454 |       return;
  455 |     }
  456 |     // Slot group might be collapsed – expand first
  457 |     const group = packBtn.locator('closest=.k-slot-group');
  458 |     // Click Packen
> 459 |     await packBtn.click({ force: true });
      |                   ^ Error: locator.click: Element is not visible
  460 |     expect(page.url()).toContain('/kiosk');
  461 |     await expect(page.locator('#modal-pack')).toBeVisible({ timeout: 10000 });
  462 | 
  463 |     // Wait for items to load
  464 |     await page.waitForSelector('.pk-item', { timeout: 15000 });
  465 |     const checkboxes = page.locator('.pk-item input[type="checkbox"]');
  466 |     const itemCount = await checkboxes.count();
  467 |     expect(itemCount).toBeGreaterThan(0);
  468 | 
  469 |     // Check a box: should update progress and trigger autosave
  470 |     const firstCb = checkboxes.first();
  471 |     const wasChecked = await firstCb.isChecked();
  472 |     if (!wasChecked) {
  473 |       await firstCb.click();
  474 |       await page.waitForTimeout(1500);
  475 |       // Progress text should show updated count
  476 |       const progressText = await page.locator('#pk-progress-text').textContent();
  477 |       expect(progressText).toMatch(/\d+\/\d+ gepackt/);
  478 |       // Autosave indicator should show
  479 |       const autosaveText = await page.locator('#pk-autosave').textContent();
  480 |       expect(autosaveText).toContain('Gespeichert');
  481 |     }
  482 | 
  483 |     // Close modal
  484 |     await page.locator('#modal-pack .k-modal-close').click();
  485 |     await expect(page.locator('#modal-pack')).not.toBeVisible();
  486 |   });
  487 | });
  488 | 
  489 | // ════════════════════════════════════════════════════
  490 | //  Shop-Karten Buttons: Annehmen, Ausgeben, Details
  491 | // ════════════════════════════════════════════════════
  492 | 
  493 | test.describe('Kiosk – Shop-Karten Buttons', () => {
  494 | 
  495 |   test('Details-Button öffnet Detail-Modal mit Bestellinfos', async ({ page }) => {
  496 |     await page.goto(KIOSK_URL);
  497 |     await page.waitForTimeout(3000);
  498 |     // Expand a slot group to find a Details button
  499 |     const headers = page.locator('.k-slot-header');
  500 |     const hCount = await headers.count();
  501 |     for (let i = 0; i < hCount; i++) {
  502 |       const h = headers.nth(i);
  503 |       const g = h.locator('..');
  504 |       if (await g.evaluate(el => el.classList.contains('collapsed'))) {
  505 |         await h.click();
  506 |         await page.waitForTimeout(300);
  507 |       }
  508 |     }
  509 |     const detailBtns = page.locator('button[onclick*="showOrderDetail"]');
  510 |     if (await detailBtns.count() === 0) {
  511 |       test.skip(true, 'Keine Bestellungen mit Details-Button');
  512 |       return;
  513 |     }
  514 |     await detailBtns.first().click();
  515 |     await page.waitForSelector('#modal-detail.open', { state: 'attached', timeout: 5000 });
  516 |     const body = await page.locator('#detail-body').textContent();
  517 |     expect(body).toContain('Kunde');
  518 |     expect(body).toContain('Nr.');
  519 |   });
  520 | 
  521 |   test('API liefert gepackt-Feld für Shop-Bestellungen', async ({ request }) => {
  522 |     const response = await request.get(`${BASE}/api/shop-order?mode=cms`);
  523 |     expect(response.status()).toBe(200);
  524 |     const data = await response.json();
  525 |     expect(data.success).toBe(true);
  526 |     if (data.orders.length > 0) {
  527 |       for (const order of data.orders) {
  528 |         expect(typeof order.gepackt).toBe('boolean');
  529 |       }
  530 |     }
  531 |   });
  532 | 
  533 |   test('Ungepackte Bereit-Bestellung zeigt Packen statt Ausgeben', async ({ page }) => {
  534 |     await page.goto(KIOSK_URL);
  535 |     await page.waitForTimeout(3000);
  536 |     const hasUnpackedBereit = await page.evaluate(() => {
  537 |       if (typeof _allShopOrders === 'undefined') return false;
  538 |       return _allShopOrders.some(o => o.status === 2 && !o.gepackt);
  539 |     });
  540 |     if (hasUnpackedBereit) {
  541 |       // Expand all groups to see buttons
  542 |       const headers = page.locator('.k-slot-header');
  543 |       for (let i = 0; i < await headers.count(); i++) {
  544 |         const g = headers.nth(i).locator('..');
  545 |         if (await g.evaluate(el => el.classList.contains('collapsed'))) {
  546 |           await headers.nth(i).click();
  547 |         }
  548 |       }
  549 |       await page.waitForTimeout(500);
  550 |       const panelHtml = await page.locator('#panel-abhol').innerHTML();
  551 |       expect(panelHtml).toContain('Packen');
  552 |     }
  553 |   });
  554 | });
  555 | 
  556 | // ════════════════════════════════════════════════════
  557 | //  Detail-Modal Preise
  558 | // ════════════════════════════════════════════════════
  559 | 
```