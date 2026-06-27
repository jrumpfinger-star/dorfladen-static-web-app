# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.js >> Kiosk – Detail-Modal Preise >> Shop-Bestellung Detail zeigt Einzelpreise > 0€
- Location: tests\kiosk.spec.js:566:3

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
    51 × waiting for element to be visible, enabled and stable
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
    56 × waiting for element to be visible, enabled and stable
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
        - generic [ref=e29]: 16:17:05
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
  518 |     await detailBtns.first().click();
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
> 583 |     await detailBtns.first().click();
      |                              ^ Error: locator.click: Test timeout of 60000ms exceeded.
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
  619 |       return orders.filter(o => o.kunde_kommentar && o.status !== 2 && !o.kommentar_gelesen).length;
  620 |     });
  621 |     if (unreadCount > 0) {
  622 |       const badgeText = await badge.textContent();
  623 |       expect(badgeText).toContain(String(unreadCount));
  624 |     }
  625 |   });
  626 | 
  627 |   test('API mode=unread_messages liefert unread_count', async ({ request }) => {
  628 |     const response = await request.get(`${BASE}/api/lunch-order?mode=unread_messages`);
  629 |     expect(response.status()).toBe(200);
  630 |     const data = await response.json();
  631 |     expect(data.success).toBe(true);
  632 |     expect(typeof data.unread_count).toBe('number');
  633 |     expect(data.unread_count).toBeGreaterThanOrEqual(0);
  634 |   });
  635 | 
  636 |   test('Tab-Badge zeigt Summe aus neuen Bestellungen (heute) + ungelesene Nachrichten', async ({ page }) => {
  637 |     await page.goto(KIOSK_URL);
  638 |     await page.click('.k-tab[data-tab="mittag"]');
  639 |     // Wait for loadMittagBadge to complete
  640 |     await page.waitForTimeout(3000);
  641 | 
  642 |     // Get today's new orders via API
  643 |     const todayStr = new Date().toISOString().split('T')[0];
  644 |     const todayRes = await page.request.get(`${BASE}/api/lunch-order?datum=${todayStr}&status=0`);
  645 |     const todayData = await todayRes.json();
  646 |     const todayNew = todayData.success ? (todayData.orders || []).length : 0;
  647 | 
  648 |     // Get unread messages via API
  649 |     const msgRes = await page.request.get(`${BASE}/api/lunch-order?mode=unread_messages`);
  650 |     const msgData = await msgRes.json();
  651 |     const unreadMsgs = msgData.success ? (msgData.unread_count || 0) : 0;
  652 | 
  653 |     const expectedTotal = todayNew + unreadMsgs;
  654 |     const badge = page.locator('#badge-mittag');
  655 | 
  656 |     if (expectedTotal > 0) {
  657 |       await expect(badge).toHaveClass(/show/);
  658 |       const badgeText = await badge.textContent();
  659 |       expect(parseInt(badgeText)).toBe(expectedTotal);
  660 |     } else {
  661 |       await expect(badge).not.toHaveClass(/show/);
  662 |     }
  663 |   });
  664 | 
  665 |   test('T-17-03 (AK-UI-17d) Nachrichten-Tab zeigt tagesübergreifende Kommentare', async ({ page }) => {
  666 |     await page.goto(KIOSK_URL);
  667 |     await page.click('.k-tab[data-tab="mittag"]');
  668 |     await page.waitForTimeout(2000);
  669 |     // Click Nachrichten tab
  670 |     const apiPromise = page.waitForResponse(
  671 |       resp => resp.url().includes('/api/lunch-order') && resp.url().includes('mode=messages'),
  672 |       { timeout: 10000 }
  673 |     );
  674 |     await page.click('[data-mt-filter="nachrichten"]');
  675 |     const apiResponse = await apiPromise;
  676 |     expect(apiResponse.status()).toBe(200);
  677 |     const json = await apiResponse.json();
  678 |     expect(json.success).toBe(true);
  679 |     expect(Array.isArray(json.orders)).toBe(true);
  680 |     if (json.orders.length > 0) {
  681 |       // Each order should have kunde_kommentar
  682 |       for (const o of json.orders) {
  683 |         expect(o.kunde_kommentar).toBeTruthy();
```