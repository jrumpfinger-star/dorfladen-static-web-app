# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.js >> Kiosk – Detail-Modal Preise >> Shop-Bestellung Detail zeigt Einzelpreise > 0€
- Location: tests\kiosk.spec.js:562:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('button[onclick*="showOrderDetail"]').first()
    - locator resolved to <button class="k-btn k-btn-sm k-btn-outline" onclick="K.showOrderDetail('42654949-aa74-f111-ab0e-7c1e5255935b')">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
      - waiting 100ms
    50 × waiting for element to be visible, enabled and stable
       - element is not visible
     - retrying click action
       - waiting 500ms
    - waiting for element to be visible, enabled and stable
  - element was detached from the DOM, retrying
    - locator resolved to <button class="k-btn k-btn-sm k-btn-outline" onclick="K.showOrderDetail('42654949-aa74-f111-ab0e-7c1e5255935b')">…</button>
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
      - generic "2 Bestellungen heute" [ref=e9]:
        - img [ref=e10]
      - generic [ref=e27]:
        - generic [ref=e28]: Dienstag, 30. Juni 2026
        - generic [ref=e29]: 22:53:26
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
      - generic [ref=e122]:
        - generic [ref=e123] [cursor=pointer]:
          - generic [ref=e124]: ▼
          - text: Morgen · Vormittag (07:30–14:00)
          - generic [ref=e126]:
            - img [ref=e127]
            - text: 1 Warten
        - generic [ref=e131] [cursor=pointer]:
          - generic [ref=e132]: ▼
          - generic [ref=e133]: Josef Rumpfinger
          - generic [ref=e134]: 2 Pos.
          - generic "Abholung in 517 Min" [ref=e135]:
            - img [ref=e136]
            - generic [ref=e139]: 8h
          - generic "0/2 gepackt" [ref=e140]:
            - img [ref=e141]
            - generic [ref=e144]: 0/2
          - generic [ref=e145]: 0/2 gepackt
          - 'generic "Doppelklick: Status zurücksetzen" [ref=e146]':
            - img [ref=e147]
            - text: Abholbereit
          - generic [ref=e150]: 23,16 €
          - generic [ref=e151]:
            - button "Status zurück" [ref=e152]:
              - img [ref=e153]
            - button "Ausgeben" [ref=e156]:
              - img [ref=e157]
              - generic [ref=e162]: Ausgeben
      - generic [ref=e163]:
        - generic [ref=e164] [cursor=pointer]:
          - generic [ref=e165]: ▼
          - text: 02.07.2026 · Vormittag (07:30–14:00)
          - generic [ref=e167]:
            - img [ref=e168]
            - text: 1 Packen
        - generic [ref=e173] [cursor=pointer]:
          - generic [ref=e174]: ▼
          - generic [ref=e175]: Josef Rumpfinger
          - generic [ref=e176]: 1 Pos.
          - generic "Abholung in 1957 Min" [ref=e177]:
            - img [ref=e178]
            - generic [ref=e181]: 32h
          - generic "0/1 gepackt" [ref=e182]:
            - img [ref=e183]
            - generic [ref=e186]: 0/1
          - generic [ref=e187]: 0/1 gepackt
          - 'generic "Doppelklick: Status zurücksetzen" [ref=e188]':
            - img [ref=e189]
            - text: In Bearbeitung
          - generic [ref=e192]: 34,90 €
          - generic [ref=e193]:
            - button "Status zurück" [ref=e194]:
              - img [ref=e195]
            - button "Packen" [ref=e198]:
              - img [ref=e199]
              - generic [ref=e203]: Packen
      - generic [ref=e204]:
        - generic [ref=e205] [cursor=pointer]:
          - generic [ref=e206]: ▼
          - text: 03.07.2026 · Vormittag (10:00–14:00)
          - generic [ref=e208]:
            - img [ref=e209]
            - text: 1 Packen
        - generic [ref=e214] [cursor=pointer]:
          - generic [ref=e215]: ▼
          - generic [ref=e216]: Josef Rumpfinger
          - generic [ref=e217]: 3 Pos.
          - generic "Abholung in 3547 Min" [ref=e218]:
            - img [ref=e219]
            - generic [ref=e222]: 59h
          - generic "0/3 gepackt" [ref=e223]:
            - img [ref=e224]
            - generic [ref=e227]: 0/3
          - generic [ref=e228]: 0/3 gepackt
          - 'generic "Doppelklick: Status zurücksetzen" [ref=e229]':
            - img [ref=e230]
            - text: In Bearbeitung
          - generic [ref=e233]: 12,90 €
          - generic [ref=e234]:
            - button "Status zurück" [ref=e235]:
              - img [ref=e236]
            - button "Packen" [ref=e239]:
              - img [ref=e240]
              - generic [ref=e244]: Packen
  - generic [ref=e245]: ⚠ TEST-UMGEBUNG – Nicht die Live-Seite!
```

# Test source

```ts
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
  560 | test.describe('Kiosk – Detail-Modal Preise', () => {
  561 | 
  562 |   test('Shop-Bestellung Detail zeigt Einzelpreise > 0€', async ({ page }) => {
  563 |     await page.goto(KIOSK_URL);
  564 |     await page.waitForTimeout(3000);
  565 |     // Expand all groups
  566 |     const headers = page.locator('.k-slot-header');
  567 |     for (let i = 0; i < await headers.count(); i++) {
  568 |       const g = headers.nth(i).locator('..');
  569 |       if (await g.evaluate(el => el.classList.contains('collapsed'))) {
  570 |         await headers.nth(i).click();
  571 |       }
  572 |     }
  573 |     await page.waitForTimeout(300);
  574 |     const detailBtns = page.locator('button[onclick*="showOrderDetail"]');
  575 |     if (await detailBtns.count() === 0) {
  576 |       test.skip(true, 'Keine Bestellungen');
  577 |       return;
  578 |     }
> 579 |     await detailBtns.first().click();
      |                              ^ Error: locator.click: Test timeout of 60000ms exceeded.
  580 |     await page.waitForSelector('#modal-detail.open', { state: 'attached', timeout: 5000 });
  581 |     const priceTexts = await page.locator('#detail-body td:nth-child(4)').allTextContents();
  582 |     const gesamtText = await page.locator('#detail-body tfoot td:last-child').textContent();
  583 |     if (!gesamtText.includes('0,00')) {
  584 |       const allZero = priceTexts.every(t => t.trim() === '0,00€');
  585 |       expect(allZero).toBe(false);
  586 |     }
  587 |   });
  588 | });
  589 | 
  590 | // ════════════════════════════════════════════════════
  591 | //  Nachrichten-Gelesen (Dataverse-basiert)
  592 | // ════════════════════════════════════════════════════
  593 | 
  594 | test.describe('Kiosk – Nachrichten-Gelesen', () => {
  595 | 
  596 |   test('API liefert kommentar_gelesen Boolean für alle Bestellungen', async ({ request }) => {
  597 |     const response = await request.get(`${BASE}/api/lunch-order`);
  598 |     expect(response.status()).toBe(200);
  599 |     const data = await response.json();
  600 |     expect(data.success).toBe(true);
  601 |     expect(data.orders.length).toBeGreaterThan(0);
  602 |     for (const order of data.orders) {
  603 |       expect(typeof order.kommentar_gelesen).toBe('boolean');
  604 |     }
  605 |   });
  606 | 
  607 |   test('Badge-Zähler stimmt mit ungelesenen Kommentaren überein', async ({ page }) => {
  608 |     await page.goto(KIOSK_URL);
  609 |     await page.click('.k-tab[data-tab="mittag"]');
  610 |     await page.waitForTimeout(3000);
  611 |     const badge = page.locator('[data-mt-filter="nachrichten"]');
  612 |     await expect(badge).toBeAttached();
  613 |     const unreadCount = await page.evaluate(() => {
  614 |       if (typeof orders === 'undefined') return -1;
  615 |       return orders.filter(o => o.kunde_kommentar && o.status !== 2 && !o.kommentar_gelesen).length;
  616 |     });
  617 |     if (unreadCount > 0) {
  618 |       const badgeText = await badge.textContent();
  619 |       expect(badgeText).toContain(String(unreadCount));
  620 |     }
  621 |   });
  622 | 
  623 |   test('API mode=unread_messages liefert unread_count', async ({ request }) => {
  624 |     const response = await request.get(`${BASE}/api/lunch-order?mode=unread_messages`);
  625 |     expect(response.status()).toBe(200);
  626 |     const data = await response.json();
  627 |     expect(data.success).toBe(true);
  628 |     expect(typeof data.unread_count).toBe('number');
  629 |     expect(data.unread_count).toBeGreaterThanOrEqual(0);
  630 |   });
  631 | 
  632 |   test('Tab-Badge zeigt Summe aus neuen Bestellungen (heute) + ungelesene Nachrichten', async ({ page }) => {
  633 |     await page.goto(KIOSK_URL);
  634 |     await page.click('.k-tab[data-tab="mittag"]');
  635 |     // Wait for loadMittagBadge to complete
  636 |     await page.waitForTimeout(3000);
  637 | 
  638 |     // Get today's new orders via API
  639 |     const todayStr = new Date().toISOString().split('T')[0];
  640 |     const todayRes = await page.request.get(`${BASE}/api/lunch-order?datum=${todayStr}&status=0`);
  641 |     const todayData = await todayRes.json();
  642 |     const todayNew = todayData.success ? (todayData.orders || []).length : 0;
  643 | 
  644 |     // Get unread messages via API
  645 |     const msgRes = await page.request.get(`${BASE}/api/lunch-order?mode=unread_messages`);
  646 |     const msgData = await msgRes.json();
  647 |     const unreadMsgs = msgData.success ? (msgData.unread_count || 0) : 0;
  648 | 
  649 |     const expectedTotal = todayNew + unreadMsgs;
  650 |     const badge = page.locator('#badge-mittag');
  651 | 
  652 |     if (expectedTotal > 0) {
  653 |       await expect(badge).toHaveClass(/show/);
  654 |       const badgeText = await badge.textContent();
  655 |       expect(parseInt(badgeText)).toBe(expectedTotal);
  656 |     } else {
  657 |       await expect(badge).not.toHaveClass(/show/);
  658 |     }
  659 |   });
  660 | 
  661 |   test('T-17-03 (AK-UI-17d) Nachrichten-Tab zeigt tagesübergreifende Kommentare', async ({ page }) => {
  662 |     await page.goto(KIOSK_URL);
  663 |     await page.click('.k-tab[data-tab="mittag"]');
  664 |     await page.waitForTimeout(2000);
  665 |     // Click Nachrichten tab
  666 |     const apiPromise = page.waitForResponse(
  667 |       resp => resp.url().includes('/api/lunch-order') && resp.url().includes('mode=messages'),
  668 |       { timeout: 10000 }
  669 |     );
  670 |     await page.click('[data-mt-filter="nachrichten"]');
  671 |     const apiResponse = await apiPromise;
  672 |     expect(apiResponse.status()).toBe(200);
  673 |     const json = await apiResponse.json();
  674 |     expect(json.success).toBe(true);
  675 |     expect(Array.isArray(json.orders)).toBe(true);
  676 |     if (json.orders.length > 0) {
  677 |       // Each order should have kunde_kommentar
  678 |       for (const o of json.orders) {
  679 |         expect(o.kunde_kommentar).toBeTruthy();
```