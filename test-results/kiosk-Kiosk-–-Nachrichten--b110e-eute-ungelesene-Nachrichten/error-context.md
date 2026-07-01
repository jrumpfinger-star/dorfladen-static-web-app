# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.js >> Kiosk – Nachrichten-Gelesen >> Tab-Badge zeigt Summe aus neuen Bestellungen (heute) + ungelesene Nachrichten
- Location: tests\kiosk.spec.js:632:3

# Error details

```
Error: expect(locator).not.toHaveClass(expected) failed

Locator: locator('#badge-mittag')
Expected pattern: not /show/
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "not toHaveClass" with timeout 5000ms
  - waiting for locator('#badge-mittag')

```

```yaml
- heading "Dorfladen Kiosk" [level=1]
- img
- text: Dienstag, 30. Juni 2026 22:53:41
- button "Ton ist an (klick = ausschalten)"
- button "Hilfe & Workflows"
- button "Aktualisieren"
- text: Mittagstisch Online-Shop 2 Metzger 3 3 Social Stammkunden
- button "Gestern 29.06"
- button "Heute 30.06"
- button "Morgen 01.07"
- button "Do 02.07"
- button "Fr 03.07"
- button "Sa 04.07"
- button "So 05.07"
- button "Offen 1"
- button "Nachrichten 0"
- button "Erledigt 2"
- button "Alle 3"
- text: ▼ 3× Thai Curry mit Reis oder Pommes Josef Rumpfinger 26,40 € 3× Online
- button "Abgeholt"
- button
- button "Neue Telefonbestellung" [disabled]
- button "Küchenliste drucken"
- text: ⚠ TEST-UMGEBUNG – Nicht die Live-Seite!
```

# Test source

```ts
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
  579 |     await detailBtns.first().click();
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
> 657 |       await expect(badge).not.toHaveClass(/show/);
      |                               ^ Error: expect(locator).not.toHaveClass(expected) failed
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
  680 |       }
  681 |       // Nachrichten list should show Kunde text
  682 |       await page.waitForTimeout(1000);
  683 |       const html = await page.locator('#mittag-orders').innerHTML();
  684 |       expect(html).toContain('Kunde:');
  685 |     }
  686 |   });
  687 | 
  688 |   test('T-17-04 (AK-UI-17e) Nachrichten-Tab: Antwort-Button und Gelesen-Button sichtbar', async ({ page }) => {
  689 |     await page.goto(KIOSK_URL);
  690 |     await page.click('.k-tab[data-tab="mittag"]');
  691 |     await page.waitForTimeout(2000);
  692 |     await page.click('[data-mt-filter="nachrichten"]');
  693 |     await page.waitForTimeout(2000);
  694 |     const orders = await page.locator('#mittag-orders .k-order').count();
  695 |     if (orders === 0) {
  696 |       test.skip(true, 'Keine Nachrichten vorhanden');
  697 |       return;
  698 |     }
  699 |     // Antworten button should exist
  700 |     const replyBtns = page.locator('#mittag-orders button:has-text("Antworten")');
  701 |     expect(await replyBtns.count()).toBeGreaterThan(0);
  702 |   });
  703 | 
  704 |   test('T-17-05 (AK-UI-17f) API mode=messages liefert vollständige Bestellungen', async ({ request }) => {
  705 |     const response = await request.get(`${BASE}/api/lunch-order?mode=messages`);
  706 |     expect(response.status()).toBe(200);
  707 |     const data = await response.json();
  708 |     expect(data.success).toBe(true);
  709 |     expect(typeof data.count).toBe('number');
  710 |     expect(Array.isArray(data.orders)).toBe(true);
  711 |     if (data.orders.length > 0) {
  712 |       const o = data.orders[0];
  713 |       expect(o.kunde_kommentar).toBeTruthy();
  714 |       expect(typeof o.name).toBe('string');
  715 |       expect(typeof o.gericht).toBe('string');
  716 |       expect(typeof o.datum).toBe('string');
  717 |       expect(typeof o.kommentar_gelesen).toBe('boolean');
  718 |     }
  719 |   });
  720 | });
  721 | 
  722 | // ════════════════════════════════════════════════════
  723 | //  Info vs. Actions Design
  724 | // ════════════════════════════════════════════════════
  725 | 
  726 | test.describe('Kiosk – Info vs Actions Design', () => {
  727 | 
  728 |   test('Stats sind flacher Text ohne box-shadow', async ({ page }) => {
  729 |     await page.goto(KIOSK_URL);
  730 |     await page.locator('.k-tab[data-tab="mittag"]').click();
  731 |     await page.waitForTimeout(2000);
  732 |     const stat = page.locator('#mittag-stats .k-stat').first();
  733 |     if (await stat.count() > 0) {
  734 |       const shadow = await stat.evaluate(el => getComputedStyle(el).boxShadow);
  735 |       expect(shadow === 'none' || shadow === '').toBeTruthy();
  736 |       const bg = await stat.evaluate(el => getComputedStyle(el).background);
  737 |       expect(bg).not.toContain('rgb(255, 255, 255)');
  738 |     }
  739 |   });
  740 | 
  741 |   test('Stats verwenden Dot-Separatoren', async ({ page }) => {
  742 |     await page.goto(KIOSK_URL);
  743 |     await page.locator('.k-tab[data-tab="mittag"]').click();
  744 |     await page.waitForTimeout(2000);
  745 |     const dots = page.locator('#mittag-stats .k-stat-dot');
  746 |     const stats = page.locator('#mittag-stats .k-stat');
  747 |     const statCount = await stats.count();
  748 |     if (statCount > 1) {
  749 |       const dotCount = await dots.count();
  750 |       expect(dotCount).toBe(statCount - 1);
  751 |     }
  752 |   });
  753 | 
  754 |   test('Filter-Tabs haben border-bottom statt border/border-radius', async ({ page }) => {
  755 |     await page.goto(KIOSK_URL);
  756 |     const filterBar = page.locator('#abhol-filter-bar');
  757 |     const borderBottom = await filterBar.evaluate(el => getComputedStyle(el).borderBottomStyle);
```