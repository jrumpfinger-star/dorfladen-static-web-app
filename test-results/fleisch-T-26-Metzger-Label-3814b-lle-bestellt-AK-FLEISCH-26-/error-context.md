# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fleisch.spec.js >> T-26 Metzger Label-Refactoring, Workflow & Historie (AK-FLEISCH-26) >> T-26-11 Button Text Alle bestellt (AK-FLEISCH-26)
- Location: tests\fleisch.spec.js:745:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
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
        - generic [ref=e29]: 22:52:02
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
  733 |     // Click Historie filter
  734 |     await page.locator('[data-fm-filter="historie"]').click();
  735 |     await page.waitForTimeout(3000);
  736 |     // Should show orders, not "Keine Bestellungen"
  737 |     const container = page.locator('#metzger-orders');
  738 |     const text = await container.textContent();
  739 |     expect(text).not.toContain('Keine abgeschlossenen Bestellungen');
  740 |     // Should contain at least one status badge (Abgeholt or Storniert)
  741 |     const hasStatus = text.includes('Abgeholt') || text.includes('Storniert');
  742 |     expect(hasStatus).toBe(true);
  743 |   });
  744 | 
  745 |   test('T-26-11 Button Text Alle bestellt (AK-FLEISCH-26)', async ({ page }) => {
  746 |     await page.goto(KIOSK_URL);
  747 |     await page.waitForTimeout(3000);
  748 |     // Check that the "Alle bestellt" button exists and NOT "Alle beim Metzger bestellt"
  749 |     const hasNewText = await page.evaluate(() => document.documentElement.innerHTML.includes('Alle bestellt'));
> 750 |     expect(hasNewText).toBe(true);
      |                        ^ Error: expect(received).toBe(expected) // Object.is equality
  751 |     const hasOldText = await page.evaluate(() => document.documentElement.innerHTML.includes('Alle beim Metzger bestellt'));
  752 |     expect(hasOldText).toBe(false);
  753 |   });
  754 | });
  755 | 
  756 | // ════════════════════════════════════════════════════
  757 | //  T-27: Sammelbestellung Workflow-Fix & 2-Spalten-Layout (AK-FLEISCH-27)
  758 | // ════════════════════════════════════════════════════
  759 | 
  760 | test.describe('T-27 Sammelbestellung Workflow-Fix & 2-Spalten (AK-FLEISCH-27)', () => {
  761 | 
  762 |   test('T-27-01 API einzelpositionen enthalten gesendet-Flag (AK-FLEISCH-27)', async ({ request }) => {
  763 |     // Get the first open delivery day
  764 |     const kioskRes = await request.get(`${BASE}/api/fleisch-order?mode=kiosk`);
  765 |     const kioskData = await kioskRes.json();
  766 |     if (!kioskData.success || !kioskData.bestellungen?.length) return;
  767 |     const liefertag = kioskData.bestellungen[0].liefertag;
  768 |     if (!liefertag) return;
  769 |     const res = await request.get(`${BASE}/api/fleisch-order?liefertag=${liefertag}`);
  770 |     expect(res.status()).toBe(200);
  771 |     const data = await res.json();
  772 |     expect(data.success).toBe(true);
  773 |     // Each einzelposition should have both bestellt and gesendet flags
  774 |     if (data.einzelpositionen?.length > 0) {
  775 |       const ep = data.einzelpositionen[0];
  776 |       expect('bestellt' in ep).toBe(true);
  777 |       expect('gesendet' in ep).toBe(true);
  778 |     }
  779 |   });
  780 | 
  781 |   test('T-27-02 Sammelbestellung hat abhakbare Checkboxen (AK-FLEISCH-27)', async ({ page }) => {
  782 |     await page.goto(KIOSK_URL);
  783 |     await page.waitForTimeout(3000);
  784 |     await page.locator('[data-tab="metzger"]').click();
  785 |     await page.waitForTimeout(2000);
  786 |     await page.locator('[data-fm-filter="sammel"]').click();
  787 |     await page.waitForTimeout(3000);
  788 |     // Check that at least some checkboxes are NOT disabled (i.e., items can be checked)
  789 |     const checkboxes = page.locator('#metzger-sammel-body input[type="checkbox"]:not(#fm-sammel-all-cb)');
  790 |     const count = await checkboxes.count();
  791 |     if (count > 0) {
  792 |       let enabledCount = 0;
  793 |       for (let i = 0; i < count; i++) {
  794 |         const disabled = await checkboxes.nth(i).isDisabled();
  795 |         if (!disabled) enabledCount++;
  796 |       }
  797 |       // At least some items should be uncheckable (gesendet=false)
  798 |       // This may be 0 if all are already gesendet, so we just verify structure exists
  799 |       expect(count).toBeGreaterThan(0);
  800 |     }
  801 |   });
  802 | 
  803 |   test('T-27-03 _fmMarkPositionGesendet Funktion existiert (AK-FLEISCH-27)', async ({ page }) => {
  804 |     await page.goto(KIOSK_URL);
  805 |     await page.waitForTimeout(3000);
  806 |     const hasFn = await page.evaluate(() => document.documentElement.innerHTML.includes('_fmMarkPositionGesendet'));
  807 |     expect(hasFn).toBe(true);
  808 |   });
  809 | 
  810 |   test('T-27-04 2-Spalten-CSS existiert fuer breiten Viewport (AK-FLEISCH-27)', async ({ page }) => {
  811 |     await page.goto(KIOSK_URL);
  812 |     await page.waitForTimeout(3000);
  813 |     // Check that the CSS rule for 2-column grid exists
  814 |     const hasGridRule = await page.evaluate(() => {
  815 |       for (const sheet of document.styleSheets) {
  816 |         try {
  817 |           for (const rule of sheet.cssRules) {
  818 |             if (rule.cssText && rule.cssText.includes('grid-template-columns') && rule.cssText.includes('panel-metzger')) return true;
  819 |           }
  820 |         } catch(e) {}
  821 |       }
  822 |       return false;
  823 |     });
  824 |     expect(hasGridRule).toBe(true);
  825 |   });
  826 | });
  827 | 
  828 | // ════════════════════════════════════════════════════
  829 | //  T-28: Liefertag-Auswahl & Vorbestellung bis 2 Wochen (AK-FLEISCH-28)
  830 | // ════════════════════════════════════════════════════
  831 | 
  832 | test.describe('T-28 Liefertag-Auswahl & Vorbestellung (AK-FLEISCH-28)', () => {
  833 | 
  834 |   test('T-28-01 API info liefert alle_termine mit mehreren Liefertagen (AK-FLEISCH-28)', async ({ request }) => {
  835 |     const res = await request.get(`${BASE}/api/fleisch-order?info=1`);
  836 |     expect(res.status()).toBe(200);
  837 |     const data = await res.json();
  838 |     expect(data.success).toBe(true);
  839 |     expect(data.alle_termine).toBeDefined();
  840 |     expect(Array.isArray(data.alle_termine)).toBe(true);
  841 |     // Should have more than 2 delivery dates (next ~2 weeks)
  842 |     expect(data.alle_termine.length).toBeGreaterThan(2);
  843 |     // Each termin should have required fields
  844 |     const t = data.alle_termine[0];
  845 |     expect(t.liefertag).toBeDefined();
  846 |     expect(t.liefertag_label).toBeDefined();
  847 |     expect(t.bestellschluss).toBeDefined();
  848 |     expect(typeof t.noch_bestellbar).toBe('boolean');
  849 |   });
  850 | 
```