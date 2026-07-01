# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.js >> Kiosk – Kompakte Buttons >> k-btn-sm Buttons sind ≤32px hoch
- Location: tests\kiosk.spec.js:800:3

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 32
Received:    40
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
        - generic [ref=e29]: 22:54:05
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
      - button "Gestern 29.06" [ref=e86] [cursor=pointer]:
        - generic [ref=e87]: Gestern
        - generic [ref=e88]: "29.06"
      - button "Heute 30.06" [ref=e89] [cursor=pointer]:
        - generic [ref=e90]: Heute
        - generic [ref=e91]: "30.06"
      - button "Morgen 01.07" [ref=e92] [cursor=pointer]:
        - generic [ref=e93]: Morgen
        - generic [ref=e94]: "01.07"
      - button "Do 02.07" [ref=e95] [cursor=pointer]:
        - generic [ref=e96]: Do
        - generic [ref=e97]: "02.07"
      - button "Fr 03.07" [ref=e98] [cursor=pointer]:
        - generic [ref=e99]: Fr
        - generic [ref=e100]: "03.07"
      - button "Sa 04.07" [ref=e101] [cursor=pointer]:
        - generic [ref=e102]: Sa
        - generic [ref=e103]: "04.07"
      - button "So 05.07" [ref=e104] [cursor=pointer]:
        - generic [ref=e105]: So
        - generic [ref=e106]: "05.07"
    - generic [ref=e107]:
      - button "Offen 1" [ref=e108] [cursor=pointer]:
        - img [ref=e109]
        - generic [ref=e112]: Offen
        - generic [ref=e113]: "1"
      - button "Nachrichten 0" [ref=e114] [cursor=pointer]:
        - img [ref=e115]
        - generic [ref=e117]: Nachrichten
        - generic [ref=e118]: "0"
      - button "Erledigt 2" [ref=e119] [cursor=pointer]:
        - img [ref=e120]
        - generic [ref=e123]: Erledigt
        - generic [ref=e124]: "2"
      - button "Alle 3" [ref=e125] [cursor=pointer]:
        - generic [ref=e126]: Alle
        - generic [ref=e127]: "3"
    - generic [ref=e129]:
      - generic [ref=e130] [cursor=pointer]:
        - generic [ref=e131]: ▼
        - generic [ref=e132]: 3× Thai Curry mit Reis oder Pommes
      - generic [ref=e135] [cursor=pointer]:
        - img [ref=e137]
        - generic [ref=e139]: Josef Rumpfinger
        - generic [ref=e140]: 26,40 €
        - generic [ref=e141]: 3×
        - generic [ref=e143]: Online
        - generic [ref=e144]:
          - button "Abgeholt" [ref=e145]:
            - img [ref=e146]
            - generic [ref=e151]: Abgeholt
          - button [ref=e152]:
            - img [ref=e153]
  - generic [ref=e156]:
    - button "Neue Telefonbestellung" [disabled] [ref=e157] [cursor=pointer]:
      - img [ref=e158]
      - text: Neue Telefonbestellung
    - button "Küchenliste drucken" [ref=e160] [cursor=pointer]:
      - img [ref=e161]
      - text: Küchenliste drucken
  - generic [ref=e165]: ⚠ TEST-UMGEBUNG – Nicht die Live-Seite!
```

# Test source

```ts
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
  758 |     expect(borderBottom).toBe('solid');
  759 |     const activeBtn = page.locator('#abhol-filter-bar .k-filter-btn.active');
  760 |     const btnBorder = await activeBtn.evaluate(el => getComputedStyle(el).borderBottomColor);
  761 |     // Should be green (not transparent)
  762 |     expect(btnBorder).not.toBe('rgba(0, 0, 0, 0)');
  763 |     const btnBg = await activeBtn.evaluate(el => getComputedStyle(el).backgroundColor);
  764 |     expect(btnBg).toBe('rgba(0, 0, 0, 0)');
  765 |   });
  766 | 
  767 |   test('Tagesauswahl verwendet k-day-pill Klasse', async ({ page }) => {
  768 |     await page.goto(KIOSK_URL);
  769 |     await page.locator('.k-tab[data-tab="mittag"]').click();
  770 |     await page.waitForSelector('#mittag-day-bar button');
  771 |     const pills = page.locator('#mittag-day-bar .k-day-pill');
  772 |     await expect(pills).toHaveCount(7);
  773 |     const activePill = page.locator('#mittag-day-bar .k-day-pill.active');
  774 |     const bg = await activePill.evaluate(el => getComputedStyle(el).backgroundColor);
  775 |     // Active pill should have green background
  776 |     expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  777 |   });
  778 | 
  779 |   test('Bestellquellen-Labels sind als Pill-Badge gestaltet', async ({ page }) => {
  780 |     await page.goto(KIOSK_URL);
  781 |     await page.locator('.k-tab[data-tab="mittag"]').click();
  782 |     await page.waitForTimeout(2000);
  783 |     // Switch to Alle to see all orders
  784 |     await page.locator('#mittag-status-bar .k-filter-btn[data-mt-filter="alle"]').click();
  785 |     await page.waitForTimeout(500);
  786 |     const srcLabels = page.locator('.k-order-src');
  787 |     if (await srcLabels.count() > 0) {
  788 |       const fontSize = await srcLabels.first().evaluate(el => getComputedStyle(el).fontSize);
  789 |       expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(11);
  790 |     }
  791 |   });
  792 | });
  793 | 
  794 | // ════════════════════════════════════════════════════
  795 | //  Kompakte Buttons (Mobile)
  796 | // ════════════════════════════════════════════════════
  797 | 
  798 | test.describe('Kiosk – Kompakte Buttons', () => {
  799 | 
  800 |   test('k-btn-sm Buttons sind ≤32px hoch', async ({ page }) => {
  801 |     await page.goto(KIOSK_URL);
  802 |     await page.locator('.k-tab[data-tab="mittag"]').click();
  803 |     await page.waitForTimeout(2000);
  804 |     const smBtns = page.locator('.k-btn-sm');
  805 |     const count = await smBtns.count();
  806 |     if (count === 0) {
  807 |       test.skip(true, 'Keine k-btn-sm sichtbar');
  808 |       return;
  809 |     }
  810 |     const firstBtn = smBtns.first();
  811 |     const minHeight = await firstBtn.evaluate(el => parseFloat(getComputedStyle(el).minHeight));
> 812 |     expect(minHeight).toBeLessThanOrEqual(32);
      |                       ^ Error: expect(received).toBeLessThanOrEqual(expected)
  813 |   });
  814 | });
  815 | 
  816 | // ═══════════════════════════════════════════════════
  817 | //  AK-UI-36 – Android Zurück-Button
  818 | // ═══════════════════════════════════════════════════
  819 | 
  820 | test.describe('AK-UI-36 – Android Zurück-Button', () => {
  821 |   test('T-36-01: Hilfe-Modal öffnen → Back schließt Modal', async ({ page }) => {
  822 |     await page.goto(KIOSK_URL);
  823 |     await page.waitForLoadState('networkidle');
  824 | 
  825 |     // Open help modal
  826 |     await page.evaluate(() => K.openModal('modal-help'));
  827 |     await expect(page.locator('#modal-help')).toHaveClass(/open/);
  828 | 
  829 |     // Simulate Android back button
  830 |     await page.goBack();
  831 |     await page.waitForTimeout(300);
  832 | 
  833 |     // Modal should be closed
  834 |     await expect(page.locator('#modal-help')).not.toHaveClass(/open/);
  835 |     // Page should still be kiosk (not navigated away)
  836 |     expect(page.url()).toContain('/kiosk');
  837 |   });
  838 | 
  839 |   test('T-36-02: Bestelldetail-Modal öffnen → Back schließt Modal', async ({ page }) => {
  840 |     await page.goto(KIOSK_URL);
  841 |     await page.waitForLoadState('networkidle');
  842 | 
  843 |     // Open detail modal
  844 |     await page.evaluate(() => K.openModal('modal-detail'));
  845 |     await expect(page.locator('#modal-detail')).toHaveClass(/open/);
  846 | 
  847 |     // Simulate Android back
  848 |     await page.goBack();
  849 |     await page.waitForTimeout(300);
  850 | 
  851 |     await expect(page.locator('#modal-detail')).not.toHaveClass(/open/);
  852 |     expect(page.url()).toContain('/kiosk');
  853 |   });
  854 | 
  855 |   test('T-36-03: Zwei Modals → Back schließt nur das oberste', async ({ page }) => {
  856 |     await page.goto(KIOSK_URL);
  857 |     await page.waitForLoadState('networkidle');
  858 | 
  859 |     // Open first modal
  860 |     await page.evaluate(() => K.openModal('modal-detail'));
  861 |     await expect(page.locator('#modal-detail')).toHaveClass(/open/);
  862 | 
  863 |     // Open second modal on top
  864 |     await page.evaluate(() => K.openModal('modal-help'));
  865 |     await expect(page.locator('#modal-help')).toHaveClass(/open/);
  866 | 
  867 |     // Back closes only top modal (help)
  868 |     await page.goBack();
  869 |     await page.waitForTimeout(300);
  870 |     await expect(page.locator('#modal-help')).not.toHaveClass(/open/);
  871 |     await expect(page.locator('#modal-detail')).toHaveClass(/open/);
  872 | 
  873 |     // Second back closes detail
  874 |     await page.goBack();
  875 |     await page.waitForTimeout(300);
  876 |     await expect(page.locator('#modal-detail')).not.toHaveClass(/open/);
  877 |     expect(page.url()).toContain('/kiosk');
  878 |   });
  879 | });
  880 | 
  881 | // ═══════════════════════════════════════════════════
  882 | //  AK-UI-37 – Historie-Filter mit Zeitraum & Status
  883 | // ═══════════════════════════════════════════════════
  884 | 
  885 | test.describe('AK-UI-37 – Historie-Filter', () => {
  886 |   test('T-37-01: Historie-Tab zeigt Sub-Filter-Bar', async ({ page }) => {
  887 |     await page.goto(KIOSK_URL);
  888 |     await page.waitForLoadState('networkidle');
  889 | 
  890 |     // Sub-filter bar should be hidden initially
  891 |     await expect(page.locator('#hist-bar')).not.toHaveClass(/show/);
  892 | 
  893 |     // Click Historie tab
  894 |     await page.click('[data-filter="history"]');
  895 |     await page.waitForTimeout(300);
  896 | 
  897 |     // Sub-filter bar should now be visible
  898 |     await expect(page.locator('#hist-bar')).toHaveClass(/show/);
  899 | 
  900 |     // Should have time range pills
  901 |     await expect(page.locator('[data-range="7"]')).toBeVisible();
  902 |     await expect(page.locator('[data-range="30"]')).toBeVisible();
  903 |     await expect(page.locator('[data-range="all"]')).toBeVisible();
  904 | 
  905 |     // Should have status pills
  906 |     await expect(page.locator('[data-hstatus="all"]')).toBeVisible();
  907 |     await expect(page.locator('[data-hstatus="3"]')).toBeVisible();
  908 |     await expect(page.locator('[data-hstatus="4"]')).toBeVisible();
  909 |   });
  910 | 
  911 |   test('T-37-02: Wechsel zu anderem Filter versteckt Sub-Bar', async ({ page }) => {
  912 |     await page.goto(KIOSK_URL);
```