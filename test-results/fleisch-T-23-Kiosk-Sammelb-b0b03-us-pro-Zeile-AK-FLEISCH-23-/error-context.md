# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fleisch.spec.js >> T-23 Kiosk Sammelbestellung Status (AK-FLEISCH-23) >> T-23-03 Sammelbestellung zeigt Bestellt-Status pro Zeile (AK-FLEISCH-23)
- Location: tests\fleisch.spec.js:606:3

# Error details

```
Error: expect(received).toMatch(expected)

Expected pattern: /✅|\d+\/\d+|—/
Received string:  ""
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - heading "Dorfladen Kiosk" [level=1] [ref=e3]:
      - img [ref=e4]
      - text: Dorfladen Kiosk
    - generic [ref=e8]:
      - generic "2 Bestellungen heute" [ref=e9]:
        - img [ref=e10]
      - generic [ref=e27]:
        - generic [ref=e28]: Dienstag, 30. Juni 2026
        - generic [ref=e29]: 22:50:59
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
      - button "Sammelbestellung" [active] [ref=e98] [cursor=pointer]:
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
        - heading "Sammelbestellung" [level=4] [ref=e116]:
          - img [ref=e117]
          - text: Sammelbestellung
        - button "Drucken" [ref=e120] [cursor=pointer]:
          - img [ref=e121]
          - text: Drucken
        - button "Alle abhaken" [ref=e125] [cursor=pointer]:
          - img [ref=e126]
          - text: Alle abhaken
      - generic [ref=e129]:
        - button "02.07.2026" [ref=e130] [cursor=pointer]
        - button "06.07.2026" [ref=e131] [cursor=pointer]
        - button "09.07.2026" [ref=e132] [cursor=pointer]
        - button "13.07.2026" [ref=e133] [cursor=pointer]
      - generic [ref=e134]:
        - generic [ref=e135]: "Liefertag: 02.07.2026 | 13 Bestellungen | 14 Positionen"
        - table [ref=e136]:
          - rowgroup [ref=e137]:
            - row "Alle als bestellt markieren Artikel Kunde kg" [ref=e138]:
              - columnheader "Alle als bestellt markieren" [ref=e139]:
                - checkbox "Alle als bestellt markieren" [ref=e140] [cursor=pointer]
              - columnheader "Artikel" [ref=e141]
              - columnheader "Kunde" [ref=e142]
              - columnheader "kg" [ref=e143]
              - columnheader [ref=e144]:
                - img [ref=e145]
          - rowgroup [ref=e147]:
            - row "Currywurst Test Cascade 1.0" [ref=e148] [cursor=pointer]:
              - cell [ref=e149]:
                - checkbox [ref=e150]
              - cell "Currywurst" [ref=e151]
              - cell "Test Cascade" [ref=e152]
              - cell "1.0" [ref=e153]
              - cell [ref=e154]:
                - img [ref=e155]
            - row "Currywurst Josef Rumpfinger 1.0" [ref=e157] [cursor=pointer]:
              - cell [ref=e158]:
                - checkbox [ref=e159]
              - cell "Currywurst" [ref=e160]
              - cell "Josef Rumpfinger" [ref=e161]
              - cell "1.0" [ref=e162]
              - cell [ref=e163]:
                - img [ref=e164]
            - row "Dicke Josef Rumpfinger 1.0" [ref=e166] [cursor=pointer]:
              - cell [ref=e167]:
                - checkbox [ref=e168]
              - cell "Dicke" [ref=e169]
              - cell "Josef Rumpfinger" [ref=e170]
              - cell "1.0" [ref=e171]
              - cell [ref=e172]:
                - img [ref=e173]
            - row "Hackfleisch gem. Strohrind u. -schwein Josef Rumpfinger 1.5" [ref=e175] [cursor=pointer]:
              - cell [ref=e176]:
                - checkbox [ref=e177]
              - cell "Hackfleisch gem. Strohrind u. -schwein" [ref=e178]
              - cell "Josef Rumpfinger" [ref=e179]
              - cell "1.5" [ref=e180]
              - cell [ref=e181]:
                - img [ref=e182]
            - row "Currywurst Josef Rumpfinger 2.0" [ref=e184] [cursor=pointer]:
              - cell [ref=e185]:
                - checkbox [ref=e186]
              - cell "Currywurst" [ref=e187]
              - cell "Josef Rumpfinger" [ref=e188]
              - cell "2.0" [ref=e189]
              - cell [ref=e190]:
                - img [ref=e191]
            - row "Currywurst Josef Rumpfinger 1.0" [ref=e193] [cursor=pointer]:
              - cell [ref=e194]:
                - checkbox [ref=e195]
              - cell "Currywurst" [ref=e196]
              - cell "Josef Rumpfinger" [ref=e197]
              - cell "1.0" [ref=e198]
              - cell [ref=e199]:
                - img [ref=e200]
            - row "Currywurst Josef Rumpfinger 1.0" [ref=e202] [cursor=pointer]:
              - cell [ref=e203]:
                - checkbox [ref=e204]
              - cell "Currywurst" [ref=e205]
              - cell "Josef Rumpfinger" [ref=e206]
              - cell "1.0" [ref=e207]
              - cell [ref=e208]:
                - img [ref=e209]
            - row "Hackfleisch gem. Strohrind u. -schwein Josef Rumpfinger 1.0" [ref=e211] [cursor=pointer]:
              - cell [ref=e212]:
                - checkbox [ref=e213]
              - cell "Hackfleisch gem. Strohrind u. -schwein" [ref=e214]
              - cell "Josef Rumpfinger" [ref=e215]
              - cell "1.0" [ref=e216]
              - cell [ref=e217]:
                - img [ref=e218]
            - row "Hinterschinken Josef Rumpfinger 1.0" [ref=e220] [cursor=pointer]:
              - cell [ref=e221]:
                - checkbox [ref=e222]
              - cell "Hinterschinken" [ref=e223]
              - cell "Josef Rumpfinger" [ref=e224]
              - cell "1.0" [ref=e225]
              - cell [ref=e226]:
                - img [ref=e227]
            - row "Hackfleisch gem. Strohrind u. -schwein Josef Rumpfinger 1.0" [ref=e229]:
              - cell [ref=e230]:
                - checkbox [checked] [disabled] [ref=e231] [cursor=pointer]
              - cell "Hackfleisch gem. Strohrind u. -schwein" [ref=e232]
              - cell "Josef Rumpfinger" [ref=e233]
              - cell "1.0" [ref=e234]
              - cell [ref=e235]:
                - img [ref=e236]
            - row "Dicke Josef Rumpfinger 1.0" [ref=e239]:
              - cell [ref=e240]:
                - checkbox [checked] [disabled] [ref=e241] [cursor=pointer]
              - cell "Dicke" [ref=e242]
              - cell "Josef Rumpfinger" [ref=e243]
              - cell "1.0" [ref=e244]
              - cell [ref=e245]:
                - img [ref=e246]
            - row "Halsgrat o. Kn. v. Strohschwein Josef Rumpfinger 1.0" [ref=e249] [cursor=pointer]:
              - cell [ref=e250]:
                - checkbox [ref=e251]
              - cell "Halsgrat o. Kn. v. Strohschwein" [ref=e252]
              - cell "Josef Rumpfinger" [ref=e253]
              - cell "1.0" [ref=e254]
              - cell [ref=e255]:
                - img [ref=e256]
            - row "Lende v. Strohschwein Josef Rumpfinger 1.0" [ref=e258]:
              - cell [ref=e259]:
                - checkbox [checked] [disabled] [ref=e260] [cursor=pointer]
              - cell "Lende v. Strohschwein" [ref=e261]
              - cell "Josef Rumpfinger" [ref=e262]
              - cell "1.0" [ref=e263]
              - cell [ref=e264]:
                - img [ref=e265]
            - row "Rouladen v. Strohrind Josef Rumpfinger 1.0" [ref=e268] [cursor=pointer]:
              - cell [ref=e269]:
                - checkbox [ref=e270]
              - cell "Rouladen v. Strohrind" [ref=e271]
              - cell "Josef Rumpfinger" [ref=e272]
              - cell "1.0" [ref=e273]
              - cell [ref=e274]:
                - img [ref=e275]
  - generic [ref=e277]: ⚠ TEST-UMGEBUNG – Nicht die Live-Seite!
```

# Test source

```ts
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
  565 |     // Should contain either "Keine" or aggregated article table with "Gesamt-Menge"
  566 |     const hasAggregated = content.includes('Gesamt-Menge') || content.includes('Keine');
  567 |     expect(hasAggregated).toBe(true);
  568 |   });
  569 | });
  570 | 
  571 | // ════════════════════════════════════════════════════
  572 | //  T-23: Sammelbestellung Status & Batch (AK-FLEISCH-23)
  573 | // ════════════════════════════════════════════════════
  574 | 
  575 | test.describe('T-23 Kiosk Sammelbestellung Status (AK-FLEISCH-23)', () => {
  576 | 
  577 |   test('T-23-01 API liefert bestellt_count in Sammelbestellung (AK-FLEISCH-23)', async ({ request }) => {
  578 |     const resp = await request.get(`${BASE}/api/fleisch-order?liefertag=2026-07-02`);
  579 |     if (!resp.ok()) { test.skip(true, 'Keine Daten für Liefertag'); return; }
  580 |     const data = await resp.json();
  581 |     expect(data.success).toBe(true);
  582 |     const agg = data.aggregiert || [];
  583 |     if (agg.length === 0) { test.skip(true, 'Keine aggregierten Artikel'); return; }
  584 |     for (const a of agg) {
  585 |       expect(a).toHaveProperty('bestellt_count');
  586 |       expect(typeof a.bestellt_count).toBe('number');
  587 |       expect(a.bestellt_count).toBeGreaterThanOrEqual(0);
  588 |       expect(a.bestellt_count).toBeLessThanOrEqual(a.anzahl_bestellungen);
  589 |     }
  590 |   });
  591 | 
  592 |   test('T-23-02 Sammelbestellung-Tabelle hat Status-Spalte (AK-FLEISCH-23)', async ({ page }) => {
  593 |     await page.goto(KIOSK_URL);
  594 |     await page.locator('.k-tab[data-tab="metzger"]').click();
  595 |     await page.waitForTimeout(2000);
  596 |     await page.locator('[data-fm-filter="sammel"]').click();
  597 |     await page.waitForTimeout(3000);
  598 |     // Table should have 5 columns (checkbox, Artikel, Gesamt kg, Bestellungen, Status)
  599 |     const thCount = await page.locator('#metzger-sammel-body table thead th').count();
  600 |     if (thCount === 0) { test.skip(true, 'Keine Sammelbestellung-Tabelle'); return; }
  601 |     expect(thCount).toBe(5);
  602 |     const lastTh = page.locator('#metzger-sammel-body table thead th').last();
  603 |     await expect(lastTh).toContainText('Status');
  604 |   });
  605 | 
  606 |   test('T-23-03 Sammelbestellung zeigt Bestellt-Status pro Zeile (AK-FLEISCH-23)', async ({ page }) => {
  607 |     await page.goto(KIOSK_URL);
  608 |     await page.locator('.k-tab[data-tab="metzger"]').click();
  609 |     await page.waitForTimeout(2000);
  610 |     await page.locator('[data-fm-filter="sammel"]').click();
  611 |     await page.waitForTimeout(3000);
  612 |     const rows = page.locator('#metzger-sammel-body table tbody tr');
  613 |     const rowCount = await rows.count();
  614 |     if (rowCount === 0) { test.skip(true, 'Keine Sammelbestellung-Zeilen'); return; }
  615 |     // Each row should have 5 cells (checkbox + 4 data columns)
  616 |     for (let i = 0; i < Math.min(rowCount, 5); i++) {
  617 |       const cells = rows.nth(i).locator('td');
  618 |       expect(await cells.count()).toBe(5);
  619 |       // Last cell = Status (should contain ✅, X/Y, or —)
  620 |       const statusText = await cells.last().textContent();
> 621 |       expect(statusText.trim()).toMatch(/✅|\d+\/\d+|—/);
      |                                 ^ Error: expect(received).toMatch(expected)
  622 |     }
  623 |   });
  624 | 
  625 |   test('T-23-04 Button Text: Alle beim Metzger bestellt (AK-FLEISCH-23)', async ({ page }) => {
  626 |     await page.goto(KIOSK_URL);
  627 |     await page.locator('.k-tab[data-tab="metzger"]').click();
  628 |     await page.waitForTimeout(2000);
  629 |     await page.locator('[data-fm-filter="sammel"]').click();
  630 |     await page.waitForTimeout(1000);
  631 |     const btn = page.locator('#metzger-sammel button:has-text("Alle beim Metzger bestellt")');
  632 |     await expect(btn).toBeVisible();
  633 |   });
  634 | 
  635 |   test('T-23-05 Filter-Leiste sticky ohne Gap (AK-FLEISCH-23)', async ({ page }) => {
  636 |     await page.goto(KIOSK_URL);
  637 |     await page.locator('.k-tab[data-tab="metzger"]').click();
  638 |     await page.waitForTimeout(1000);
  639 |     const filterBar = page.locator('#panel-metzger .k-filter-bar');
  640 |     const style = await filterBar.evaluate(el => {
  641 |       const cs = getComputedStyle(el);
  642 |       return { position: cs.position, marginTop: cs.marginTop };
  643 |     });
  644 |     expect(style.position).toBe('sticky');
  645 |     expect(style.marginTop).toBe('-12px');
  646 |   });
  647 | 
  648 |   test('T-23-06 metzgerAlleGesendet Funktion existiert (AK-FLEISCH-23)', async ({ page }) => {
  649 |     await page.goto(KIOSK_URL);
  650 |     await page.waitForTimeout(3000);
  651 |     const hasFn = await page.evaluate(() => typeof K !== 'undefined' && typeof K.metzgerAlleGesendet === 'function');
  652 |     expect(hasFn).toBe(true);
  653 |   });
  654 | });
  655 | 
  656 | // ════════════════════════════════════════════════════
  657 | //  T-26: Metzger Label-Refactoring, Workflow & Historie (AK-FLEISCH-26)
  658 | // ════════════════════════════════════════════════════
  659 | 
  660 | test.describe('T-26 Metzger Label-Refactoring, Workflow & Historie (AK-FLEISCH-26)', () => {
  661 | 
  662 |   test('T-26-01 Kiosk STATUS_LABELS enthält In Bestellung (AK-FLEISCH-26)', async ({ page }) => {
  663 |     await page.goto(KIOSK_URL);
  664 |     await page.waitForTimeout(3000);
  665 |     const hasLabel = await page.evaluate(() => document.documentElement.innerHTML.includes("1:'In Bestellung'"));
  666 |     expect(hasLabel).toBe(true);
  667 |   });
  668 | 
  669 |   test('T-26-02 Kein Beim Metzger Text in kiosk.html (AK-FLEISCH-26)', async ({ page }) => {
  670 |     await page.goto(KIOSK_URL);
  671 |     await page.waitForTimeout(3000);
  672 |     const hasBM = await page.evaluate(() => document.documentElement.innerHTML.includes('Beim Metzger'));
  673 |     expect(hasBM).toBe(false);
  674 |   });
  675 | 
  676 |   test('T-26-03 shop.html FM_ST enthält In Bestellung (AK-FLEISCH-26)', async ({ page }) => {
  677 |     await page.goto(SHOP_URL);
  678 |     await page.waitForTimeout(3000);
  679 |     const hasLabel = await page.evaluate(() => document.documentElement.innerHTML.includes("1:'In Bestellung'"));
  680 |     expect(hasLabel).toBe(true);
  681 |   });
  682 | 
  683 |   test('T-26-04 fleisch-bestellen.html FM_STATUS enthält In Bestellung (AK-FLEISCH-26)', async ({ page }) => {
  684 |     await page.goto(FLEISCH_URL);
  685 |     await page.waitForTimeout(3000);
  686 |     const hasLabel = await page.evaluate(() => document.documentElement.innerHTML.includes("1:'In Bestellung'"));
  687 |     expect(hasLabel).toBe(true);
  688 |   });
  689 | 
  690 |   test('T-26-05 bestellstatus.html Timeline-Label In Bestellung (AK-FLEISCH-26)', async ({ page }) => {
  691 |     await page.goto(`${BASE}/bestellstatus`);
  692 |     await page.waitForTimeout(3000);
  693 |     const hasLabel = await page.evaluate(() => document.documentElement.innerHTML.includes("label:'In Bestellung'"));
  694 |     expect(hasLabel).toBe(true);
  695 |   });
  696 | 
  697 |   test('T-26-06 Kiosk Metzger-Header zeigt keine X Pos Info (AK-FLEISCH-26)', async ({ page }) => {
  698 |     await page.goto(KIOSK_URL);
  699 |     await page.waitForTimeout(3000);
  700 |     // Click Metzger tab
  701 |     await page.locator('[data-tab="metzger"]').click();
  702 |     await page.waitForTimeout(2000);
  703 |     // Check that no order header contains "Pos." text (except progress counter like 0/1)
  704 |     const headers = page.locator('.k-order-hdr, [class*="k-oc"]');
  705 |     const count = await headers.count();
  706 |     if (count > 0) {
  707 |       for (let i = 0; i < Math.min(count, 5); i++) {
  708 |         const text = await headers.nth(i).textContent();
  709 |         // Should not contain "X Pos." pattern
  710 |         expect(text).not.toMatch(/\d+\s*Pos\./);
  711 |       }
  712 |     }
  713 |   });
  714 | 
  715 |   test('T-26-08 API mode=kiosk_history liefert abgeschlossene Bestellungen (AK-FLEISCH-26)', async ({ request }) => {
  716 |     const res = await request.get(`${BASE}/api/fleisch-order?mode=kiosk_history`);
  717 |     expect(res.status()).toBe(200);
  718 |     const data = await res.json();
  719 |     expect(data.success).toBe(true);
  720 |     expect(Array.isArray(data.bestellungen)).toBe(true);
  721 |     // All returned orders should have status >= 3
```