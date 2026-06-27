# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.js >> Kiosk – Shop-Karten Buttons >> Details-Button öffnet Detail-Modal mit Bestellinfos
- Location: tests\kiosk.spec.js:499:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('button[onclick*="showOrderDetail"]').first()
    - locator resolved to <button class="k-btn k-btn-sm k-btn-outline" onclick="K.showOrderDetail('6955ff3e-dc70-f111-ab0e-0022485bb979')">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
      - waiting 100ms
    52 × waiting for element to be visible, enabled and stable
       - element is not visible
     - retrying click action
       - waiting 500ms
    - waiting for element to be visible, enabled and stable
  - element was detached from the DOM, retrying
    - locator resolved to <button class="k-btn k-btn-sm k-btn-outline" onclick="K.showOrderDetail('6955ff3e-dc70-f111-ab0e-0022485bb979')">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
      - waiting 100ms
    55 × waiting for element to be visible, enabled and stable
       - element is not visible
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - heading "Dorfladen Kiosk" [level=1] [ref=e3]:
      - img [ref=e4]
      - text: Dorfladen Kiosk
    - generic [ref=e8]:
      - generic "0 Bestellungen heute" [ref=e9]:
        - img [ref=e10]
      - generic [ref=e27]:
        - generic [ref=e28]: Samstag, 27. Juni 2026
        - generic [ref=e29]: 16:15:59
      - button "Hilfe & Workflows" [ref=e30] [cursor=pointer]:
        - img [ref=e31]
      - button "Aktualisieren" [ref=e34] [cursor=pointer]:
        - img [ref=e35]
  - generic [ref=e40]:
    - generic [ref=e41] [cursor=pointer]:
      - img [ref=e43]
      - text: Mittagstisch
      - generic "1 💬" [ref=e46]: "1"
    - generic [ref=e47] [cursor=pointer]:
      - img [ref=e49]
      - text: Online-Shop
    - generic [ref=e53] [cursor=pointer]:
      - img [ref=e55]
      - text: Stammkunden
    - generic [ref=e60] [cursor=pointer]:
      - img [ref=e62]
      - text: Metzger
      - generic "7 offen" [ref=e66]: "7"
    - generic [ref=e67] [cursor=pointer]:
      - img [ref=e69]
      - text: Social
  - generic [ref=e76]:
    - generic [ref=e77]:
      - button "Zu erledigen 1" [ref=e78] [cursor=pointer]:
        - img [ref=e79]
        - generic [ref=e83]: Zu erledigen
        - generic [ref=e84]: "1"
      - button "Heute abholen 1" [ref=e85] [cursor=pointer]:
        - img [ref=e86]
        - generic [ref=e88]: Heute abholen
        - generic [ref=e89]: "1"
      - button "Überfällig 1" [ref=e90] [cursor=pointer]:
        - img [ref=e91]
        - generic [ref=e93]: Überfällig
        - generic [ref=e94]: "1"
      - button "Historie 26" [ref=e95] [cursor=pointer]:
        - img [ref=e96]
        - generic [ref=e100]: Historie
        - generic [ref=e101]: "26"
    - generic [ref=e102]:
      - generic [ref=e103]:
        - generic [ref=e104]: "1"
        - generic [ref=e105]: Warten
      - generic [ref=e106]:
        - generic [ref=e107]: "1"
        - generic [ref=e108]: Überfällig
    - generic [ref=e110]:
      - generic [ref=e111] [cursor=pointer]:
        - generic [ref=e112]: ▼
        - text: Heute · Vormittag (08:00–13:00)
        - generic [ref=e114]:
          - img [ref=e115]
          - text: 1 Warten
      - generic [ref=e119] [cursor=pointer]:
        - generic [ref=e120]: ▼
        - generic [ref=e121]: Josef Rumpfinger
        - generic [ref=e122]: 7 Pos.
        - generic "Abholung in 0 Min" [ref=e123]:
          - img [ref=e124]
          - generic [ref=e127]: 0m
        - generic "0/7 gepackt" [ref=e128]:
          - img [ref=e129]
          - generic [ref=e132]: 0/7
        - 'generic "Doppelklick: Status zurücksetzen" [ref=e133]':
          - img [ref=e134]
          - text: Überfällig
        - generic [ref=e136]: 21,14 €
        - button "Ausgeben" [ref=e138]:
          - img [ref=e139]
          - generic [ref=e144]: Ausgeben
  - generic [ref=e145]: ⚠ TEST-UMGEBUNG – Nicht die Live-Seite!
```

# Test source

```ts
  418 |         preis: 5.00,
  419 |         datum: '2026-06-22T00:00:00Z',
  420 |         wochentag_label: 'Montag',
  421 |         quelle: 0
  422 |       }
  423 |     });
  424 |     expect(response.status()).toBe(201);
  425 |     const body = await response.json();
  426 |     expect(body.success).toBe(true);
  427 |     expect(body.order.datum).toBe('2026-06-22');
  428 |     expect(body.order.datum).not.toContain('T');
  429 |   });
  430 | 
  431 |   test('GET findet Bestellungen und alle Datums-Felder normalisiert', async ({ request }) => {
  432 |     const response = await request.get(`${BASE}/api/lunch-order`);
  433 |     expect(response.status()).toBe(200);
  434 |     const body = await response.json();
  435 |     expect(body.success).toBe(true);
  436 |     for (const order of body.orders) {
  437 |       if (order.datum) {
  438 |         expect(order.datum).not.toContain('T00:00:00Z');
  439 |         expect(order.datum).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  440 |       }
  441 |     }
  442 |   });
  443 | });
  444 | 
  445 | // ════════════════════════════════════════════════════
  446 | //  Pack-Modal – E2E Workflow
  447 | // ════════════════════════════════════════════════════
  448 | 
  449 | test.describe('Kiosk – Packen E2E', () => {
  450 | 
  451 |   test('Pack-Modal öffnet inline, zeigt Positionen, Checkbox aktualisiert Summe + Fortschritt', async ({ page }) => {
  452 |     await page.goto(KIOSK_URL);
  453 |     await page.waitForTimeout(2000);
  454 |     // Find Packen button (status 1 or ungepackte status 2)
  455 |     const packBtn = page.locator('button[onclick*="openPackModal"]').first();
  456 |     if (await packBtn.count() === 0) {
  457 |       test.skip(true, 'Keine packbare Bestellung vorhanden');
  458 |       return;
  459 |     }
  460 |     // Slot group might be collapsed – expand first
  461 |     const group = packBtn.locator('closest=.k-slot-group');
  462 |     // Click Packen
  463 |     await packBtn.click({ force: true });
  464 |     expect(page.url()).toContain('/kiosk');
  465 |     await expect(page.locator('#modal-pack')).toBeVisible({ timeout: 10000 });
  466 | 
  467 |     // Wait for items to load
  468 |     await page.waitForSelector('.pk-item', { timeout: 15000 });
  469 |     const checkboxes = page.locator('.pk-item input[type="checkbox"]');
  470 |     const itemCount = await checkboxes.count();
  471 |     expect(itemCount).toBeGreaterThan(0);
  472 | 
  473 |     // Check a box: should update progress and trigger autosave
  474 |     const firstCb = checkboxes.first();
  475 |     const wasChecked = await firstCb.isChecked();
  476 |     if (!wasChecked) {
  477 |       await firstCb.click();
  478 |       await page.waitForTimeout(1500);
  479 |       // Progress text should show updated count
  480 |       const progressText = await page.locator('#pk-progress-text').textContent();
  481 |       expect(progressText).toMatch(/\d+\/\d+ gepackt/);
  482 |       // Autosave indicator should show
  483 |       const autosaveText = await page.locator('#pk-autosave').textContent();
  484 |       expect(autosaveText).toContain('Gespeichert');
  485 |     }
  486 | 
  487 |     // Close modal
  488 |     await page.locator('#modal-pack .k-modal-close').click();
  489 |     await expect(page.locator('#modal-pack')).not.toBeVisible();
  490 |   });
  491 | });
  492 | 
  493 | // ════════════════════════════════════════════════════
  494 | //  Shop-Karten Buttons: Annehmen, Ausgeben, Details
  495 | // ════════════════════════════════════════════════════
  496 | 
  497 | test.describe('Kiosk – Shop-Karten Buttons', () => {
  498 | 
  499 |   test('Details-Button öffnet Detail-Modal mit Bestellinfos', async ({ page }) => {
  500 |     await page.goto(KIOSK_URL);
  501 |     await page.waitForTimeout(3000);
  502 |     // Expand a slot group to find a Details button
  503 |     const headers = page.locator('.k-slot-header');
  504 |     const hCount = await headers.count();
  505 |     for (let i = 0; i < hCount; i++) {
  506 |       const h = headers.nth(i);
  507 |       const g = h.locator('..');
  508 |       if (await g.evaluate(el => el.classList.contains('collapsed'))) {
  509 |         await h.click();
  510 |         await page.waitForTimeout(300);
  511 |       }
  512 |     }
  513 |     const detailBtns = page.locator('button[onclick*="showOrderDetail"]');
  514 |     if (await detailBtns.count() === 0) {
  515 |       test.skip(true, 'Keine Bestellungen mit Details-Button');
  516 |       return;
  517 |     }
> 518 |     await detailBtns.first().click();
      |                              ^ Error: locator.click: Test timeout of 60000ms exceeded.
  519 |     await page.waitForSelector('#modal-detail.open', { state: 'attached', timeout: 5000 });
  520 |     const body = await page.locator('#detail-body').textContent();
  521 |     expect(body).toContain('Kunde');
  522 |     expect(body).toContain('Nr.');
  523 |   });
  524 | 
  525 |   test('API liefert gepackt-Feld für Shop-Bestellungen', async ({ request }) => {
  526 |     const response = await request.get(`${BASE}/api/shop-order?mode=cms`);
  527 |     expect(response.status()).toBe(200);
  528 |     const data = await response.json();
  529 |     expect(data.success).toBe(true);
  530 |     if (data.orders.length > 0) {
  531 |       for (const order of data.orders) {
  532 |         expect(typeof order.gepackt).toBe('boolean');
  533 |       }
  534 |     }
  535 |   });
  536 | 
  537 |   test('Ungepackte Bereit-Bestellung zeigt Packen statt Ausgeben', async ({ page }) => {
  538 |     await page.goto(KIOSK_URL);
  539 |     await page.waitForTimeout(3000);
  540 |     const hasUnpackedBereit = await page.evaluate(() => {
  541 |       if (typeof _allShopOrders === 'undefined') return false;
  542 |       return _allShopOrders.some(o => o.status === 2 && !o.gepackt);
  543 |     });
  544 |     if (hasUnpackedBereit) {
  545 |       // Expand all groups to see buttons
  546 |       const headers = page.locator('.k-slot-header');
  547 |       for (let i = 0; i < await headers.count(); i++) {
  548 |         const g = headers.nth(i).locator('..');
  549 |         if (await g.evaluate(el => el.classList.contains('collapsed'))) {
  550 |           await headers.nth(i).click();
  551 |         }
  552 |       }
  553 |       await page.waitForTimeout(500);
  554 |       const panelHtml = await page.locator('#panel-abhol').innerHTML();
  555 |       expect(panelHtml).toContain('Packen');
  556 |     }
  557 |   });
  558 | });
  559 | 
  560 | // ════════════════════════════════════════════════════
  561 | //  Detail-Modal Preise
  562 | // ════════════════════════════════════════════════════
  563 | 
  564 | test.describe('Kiosk – Detail-Modal Preise', () => {
  565 | 
  566 |   test('Shop-Bestellung Detail zeigt Einzelpreise > 0€', async ({ page }) => {
  567 |     await page.goto(KIOSK_URL);
  568 |     await page.waitForTimeout(3000);
  569 |     // Expand all groups
  570 |     const headers = page.locator('.k-slot-header');
  571 |     for (let i = 0; i < await headers.count(); i++) {
  572 |       const g = headers.nth(i).locator('..');
  573 |       if (await g.evaluate(el => el.classList.contains('collapsed'))) {
  574 |         await headers.nth(i).click();
  575 |       }
  576 |     }
  577 |     await page.waitForTimeout(300);
  578 |     const detailBtns = page.locator('button[onclick*="showOrderDetail"]');
  579 |     if (await detailBtns.count() === 0) {
  580 |       test.skip(true, 'Keine Bestellungen');
  581 |       return;
  582 |     }
  583 |     await detailBtns.first().click();
  584 |     await page.waitForSelector('#modal-detail.open', { state: 'attached', timeout: 5000 });
  585 |     const priceTexts = await page.locator('#detail-body td:nth-child(4)').allTextContents();
  586 |     const gesamtText = await page.locator('#detail-body tfoot td:last-child').textContent();
  587 |     if (!gesamtText.includes('0,00')) {
  588 |       const allZero = priceTexts.every(t => t.trim() === '0,00€');
  589 |       expect(allZero).toBe(false);
  590 |     }
  591 |   });
  592 | });
  593 | 
  594 | // ════════════════════════════════════════════════════
  595 | //  Nachrichten-Gelesen (Dataverse-basiert)
  596 | // ════════════════════════════════════════════════════
  597 | 
  598 | test.describe('Kiosk – Nachrichten-Gelesen', () => {
  599 | 
  600 |   test('API liefert kommentar_gelesen Boolean für alle Bestellungen', async ({ request }) => {
  601 |     const response = await request.get(`${BASE}/api/lunch-order`);
  602 |     expect(response.status()).toBe(200);
  603 |     const data = await response.json();
  604 |     expect(data.success).toBe(true);
  605 |     expect(data.orders.length).toBeGreaterThan(0);
  606 |     for (const order of data.orders) {
  607 |       expect(typeof order.kommentar_gelesen).toBe('boolean');
  608 |     }
  609 |   });
  610 | 
  611 |   test('Badge-Zähler stimmt mit ungelesenen Kommentaren überein', async ({ page }) => {
  612 |     await page.goto(KIOSK_URL);
  613 |     await page.click('.k-tab[data-tab="mittag"]');
  614 |     await page.waitForTimeout(3000);
  615 |     const badge = page.locator('[data-mt-filter="nachrichten"]');
  616 |     await expect(badge).toBeAttached();
  617 |     const unreadCount = await page.evaluate(() => {
  618 |       if (typeof orders === 'undefined') return -1;
```