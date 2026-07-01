# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fleisch.spec.js >> T-23 Kiosk Sammelbestellung Status (AK-FLEISCH-23) >> T-23-04 Button Text: Alle beim Metzger bestellt (AK-FLEISCH-23)
- Location: tests\fleisch.spec.js:625:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('#metzger-sammel button:has-text("Alle beim Metzger bestellt")')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('#metzger-sammel button:has-text("Alle beim Metzger bestellt")')

```

```yaml
- heading "Dorfladen Kiosk" [level=1]
- img
- text: Dienstag, 30. Juni 2026 22:51:11
- button "Ton ist an (klick = ausschalten)"
- button "Hilfe & Workflows"
- button "Aktualisieren"
- text: Mittagstisch Online-Shop 2 Metzger 3 3 Social Stammkunden
- button "Zu erledigen 6"
- button "Heute abholen 0"
- button "Sammelbestellung"
- button "Nachrichten"
- button "Historie"
- heading "Sammelbestellung" [level=4]
- button "Drucken"
- button "Alle abhaken"
- button "02.07.2026"
- button "06.07.2026"
- button "09.07.2026"
- button "13.07.2026"
- text: "Liefertag: 02.07.2026 | 13 Bestellungen | 14 Positionen"
- table:
  - rowgroup:
    - row "Alle als bestellt markieren Artikel Kunde kg":
      - columnheader "Alle als bestellt markieren":
        - checkbox "Alle als bestellt markieren"
      - columnheader "Artikel"
      - columnheader "Kunde"
      - columnheader "kg"
      - columnheader
  - rowgroup:
    - row "Currywurst Test Cascade 1.0":
      - cell:
        - checkbox
      - cell "Currywurst"
      - cell "Test Cascade"
      - cell "1.0"
      - cell
    - row "Currywurst Josef Rumpfinger 1.0":
      - cell:
        - checkbox
      - cell "Currywurst"
      - cell "Josef Rumpfinger"
      - cell "1.0"
      - cell
    - row "Dicke Josef Rumpfinger 1.0":
      - cell:
        - checkbox
      - cell "Dicke"
      - cell "Josef Rumpfinger"
      - cell "1.0"
      - cell
    - row "Hackfleisch gem. Strohrind u. -schwein Josef Rumpfinger 1.5":
      - cell:
        - checkbox
      - cell "Hackfleisch gem. Strohrind u. -schwein"
      - cell "Josef Rumpfinger"
      - cell "1.5"
      - cell
    - row "Currywurst Josef Rumpfinger 2.0":
      - cell:
        - checkbox
      - cell "Currywurst"
      - cell "Josef Rumpfinger"
      - cell "2.0"
      - cell
    - row "Currywurst Josef Rumpfinger 1.0":
      - cell:
        - checkbox
      - cell "Currywurst"
      - cell "Josef Rumpfinger"
      - cell "1.0"
      - cell
    - row "Currywurst Josef Rumpfinger 1.0":
      - cell:
        - checkbox
      - cell "Currywurst"
      - cell "Josef Rumpfinger"
      - cell "1.0"
      - cell
    - row "Hackfleisch gem. Strohrind u. -schwein Josef Rumpfinger 1.0":
      - cell:
        - checkbox
      - cell "Hackfleisch gem. Strohrind u. -schwein"
      - cell "Josef Rumpfinger"
      - cell "1.0"
      - cell
    - row "Hinterschinken Josef Rumpfinger 1.0":
      - cell:
        - checkbox
      - cell "Hinterschinken"
      - cell "Josef Rumpfinger"
      - cell "1.0"
      - cell
    - row "Hackfleisch gem. Strohrind u. -schwein Josef Rumpfinger 1.0":
      - cell:
        - checkbox [checked] [disabled]
      - cell "Hackfleisch gem. Strohrind u. -schwein"
      - cell "Josef Rumpfinger"
      - cell "1.0"
      - cell
    - row "Dicke Josef Rumpfinger 1.0":
      - cell:
        - checkbox [checked] [disabled]
      - cell "Dicke"
      - cell "Josef Rumpfinger"
      - cell "1.0"
      - cell
    - row "Halsgrat o. Kn. v. Strohschwein Josef Rumpfinger 1.0":
      - cell:
        - checkbox
      - cell "Halsgrat o. Kn. v. Strohschwein"
      - cell "Josef Rumpfinger"
      - cell "1.0"
      - cell
    - row "Lende v. Strohschwein Josef Rumpfinger 1.0":
      - cell:
        - checkbox [checked] [disabled]
      - cell "Lende v. Strohschwein"
      - cell "Josef Rumpfinger"
      - cell "1.0"
      - cell
    - row "Rouladen v. Strohrind Josef Rumpfinger 1.0":
      - cell:
        - checkbox
      - cell "Rouladen v. Strohrind"
      - cell "Josef Rumpfinger"
      - cell "1.0"
      - cell
- text: ⚠ TEST-UMGEBUNG – Nicht die Live-Seite!
```

# Test source

```ts
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
  621 |       expect(statusText.trim()).toMatch(/✅|\d+\/\d+|—/);
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
> 632 |     await expect(btn).toBeVisible();
      |                       ^ Error: expect(locator).toBeVisible() failed
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
  722 |     for (const b of data.bestellungen) {
  723 |       expect(b.status).toBeGreaterThanOrEqual(3);
  724 |     }
  725 |   });
  726 | 
  727 |   test('T-26-09 Historie-Tab zeigt Bestellungen (AK-FLEISCH-26)', async ({ page }) => {
  728 |     await page.goto(KIOSK_URL);
  729 |     await page.waitForTimeout(3000);
  730 |     // Click Metzger tab
  731 |     await page.locator('[data-tab="metzger"]').click();
  732 |     await page.waitForTimeout(2000);
```