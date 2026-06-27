# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.js >> Kiosk – Kompakte Buttons >> k-btn-sm Buttons sind ≤32px hoch
- Location: tests\kiosk.spec.js:804:3

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
      - generic "0 Bestellungen heute" [ref=e9]:
        - img [ref=e10]
      - generic [ref=e27]:
        - generic [ref=e28]: Samstag, 27. Juni 2026
        - generic [ref=e29]: 16:17:37
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
      - button "Gestern 26.06" [ref=e78] [cursor=pointer]:
        - generic [ref=e79]: Gestern
        - generic [ref=e80]: "26.06"
      - button "Heute 27.06" [ref=e81] [cursor=pointer]:
        - generic [ref=e82]: Heute
        - generic [ref=e83]: "27.06"
      - button "Morgen 28.06" [ref=e84] [cursor=pointer]:
        - generic [ref=e85]: Morgen
        - generic [ref=e86]: "28.06"
      - button "Mo 29.06" [ref=e87] [cursor=pointer]:
        - generic [ref=e88]: Mo
        - generic [ref=e89]: "29.06"
      - button "Di 30.06" [ref=e90] [cursor=pointer]:
        - generic [ref=e91]: Di
        - generic [ref=e92]: "30.06"
      - button "Mi 01.07" [ref=e93] [cursor=pointer]:
        - generic [ref=e94]: Mi
        - generic [ref=e95]: "01.07"
      - button "Do 02.07" [ref=e96] [cursor=pointer]:
        - generic [ref=e97]: Do
        - generic [ref=e98]: "02.07"
    - generic [ref=e99]:
      - button "Offen 0" [ref=e100] [cursor=pointer]:
        - img [ref=e101]
        - generic [ref=e104]: Offen
        - generic [ref=e105]: "0"
      - button "Nachrichten 1" [ref=e106] [cursor=pointer]:
        - img [ref=e107]
        - generic [ref=e109]: Nachrichten
        - generic [ref=e110]: "1"
      - button "Erledigt 0" [ref=e111] [cursor=pointer]:
        - img [ref=e112]
        - generic [ref=e115]: Erledigt
        - generic [ref=e116]: "0"
      - button "Alle 0" [ref=e117] [cursor=pointer]:
        - generic [ref=e118]: Alle
        - generic [ref=e119]: "0"
    - generic [ref=e121]:
      - img [ref=e123]
      - text: Keine Bestellungen für heute
  - generic [ref=e126]:
    - button "Neue Telefonbestellung" [disabled] [ref=e127] [cursor=pointer]:
      - img [ref=e128]
      - text: Neue Telefonbestellung
    - button "Küchenliste drucken" [ref=e130] [cursor=pointer]:
      - img [ref=e131]
      - text: Küchenliste drucken
  - generic [ref=e135]: ⚠ TEST-UMGEBUNG – Nicht die Live-Seite!
```

# Test source

```ts
  716 |       const o = data.orders[0];
  717 |       expect(o.kunde_kommentar).toBeTruthy();
  718 |       expect(typeof o.name).toBe('string');
  719 |       expect(typeof o.gericht).toBe('string');
  720 |       expect(typeof o.datum).toBe('string');
  721 |       expect(typeof o.kommentar_gelesen).toBe('boolean');
  722 |     }
  723 |   });
  724 | });
  725 | 
  726 | // ════════════════════════════════════════════════════
  727 | //  Info vs. Actions Design
  728 | // ════════════════════════════════════════════════════
  729 | 
  730 | test.describe('Kiosk – Info vs Actions Design', () => {
  731 | 
  732 |   test('Stats sind flacher Text ohne box-shadow', async ({ page }) => {
  733 |     await page.goto(KIOSK_URL);
  734 |     await page.locator('.k-tab[data-tab="mittag"]').click();
  735 |     await page.waitForTimeout(2000);
  736 |     const stat = page.locator('#mittag-stats .k-stat').first();
  737 |     if (await stat.count() > 0) {
  738 |       const shadow = await stat.evaluate(el => getComputedStyle(el).boxShadow);
  739 |       expect(shadow === 'none' || shadow === '').toBeTruthy();
  740 |       const bg = await stat.evaluate(el => getComputedStyle(el).background);
  741 |       expect(bg).not.toContain('rgb(255, 255, 255)');
  742 |     }
  743 |   });
  744 | 
  745 |   test('Stats verwenden Dot-Separatoren', async ({ page }) => {
  746 |     await page.goto(KIOSK_URL);
  747 |     await page.locator('.k-tab[data-tab="mittag"]').click();
  748 |     await page.waitForTimeout(2000);
  749 |     const dots = page.locator('#mittag-stats .k-stat-dot');
  750 |     const stats = page.locator('#mittag-stats .k-stat');
  751 |     const statCount = await stats.count();
  752 |     if (statCount > 1) {
  753 |       const dotCount = await dots.count();
  754 |       expect(dotCount).toBe(statCount - 1);
  755 |     }
  756 |   });
  757 | 
  758 |   test('Filter-Tabs haben border-bottom statt border/border-radius', async ({ page }) => {
  759 |     await page.goto(KIOSK_URL);
  760 |     const filterBar = page.locator('#abhol-filter-bar');
  761 |     const borderBottom = await filterBar.evaluate(el => getComputedStyle(el).borderBottomStyle);
  762 |     expect(borderBottom).toBe('solid');
  763 |     const activeBtn = page.locator('#abhol-filter-bar .k-filter-btn.active');
  764 |     const btnBorder = await activeBtn.evaluate(el => getComputedStyle(el).borderBottomColor);
  765 |     // Should be green (not transparent)
  766 |     expect(btnBorder).not.toBe('rgba(0, 0, 0, 0)');
  767 |     const btnBg = await activeBtn.evaluate(el => getComputedStyle(el).backgroundColor);
  768 |     expect(btnBg).toBe('rgba(0, 0, 0, 0)');
  769 |   });
  770 | 
  771 |   test('Tagesauswahl verwendet k-day-pill Klasse', async ({ page }) => {
  772 |     await page.goto(KIOSK_URL);
  773 |     await page.locator('.k-tab[data-tab="mittag"]').click();
  774 |     await page.waitForSelector('#mittag-day-bar button');
  775 |     const pills = page.locator('#mittag-day-bar .k-day-pill');
  776 |     await expect(pills).toHaveCount(7);
  777 |     const activePill = page.locator('#mittag-day-bar .k-day-pill.active');
  778 |     const bg = await activePill.evaluate(el => getComputedStyle(el).backgroundColor);
  779 |     // Active pill should have green background
  780 |     expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  781 |   });
  782 | 
  783 |   test('Bestellquellen-Labels sind als Pill-Badge gestaltet', async ({ page }) => {
  784 |     await page.goto(KIOSK_URL);
  785 |     await page.locator('.k-tab[data-tab="mittag"]').click();
  786 |     await page.waitForTimeout(2000);
  787 |     // Switch to Alle to see all orders
  788 |     await page.locator('#mittag-status-bar .k-filter-btn[data-mt-filter="alle"]').click();
  789 |     await page.waitForTimeout(500);
  790 |     const srcLabels = page.locator('.k-order-src');
  791 |     if (await srcLabels.count() > 0) {
  792 |       const fontSize = await srcLabels.first().evaluate(el => getComputedStyle(el).fontSize);
  793 |       expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(11);
  794 |     }
  795 |   });
  796 | });
  797 | 
  798 | // ════════════════════════════════════════════════════
  799 | //  Kompakte Buttons (Mobile)
  800 | // ════════════════════════════════════════════════════
  801 | 
  802 | test.describe('Kiosk – Kompakte Buttons', () => {
  803 | 
  804 |   test('k-btn-sm Buttons sind ≤32px hoch', async ({ page }) => {
  805 |     await page.goto(KIOSK_URL);
  806 |     await page.locator('.k-tab[data-tab="mittag"]').click();
  807 |     await page.waitForTimeout(2000);
  808 |     const smBtns = page.locator('.k-btn-sm');
  809 |     const count = await smBtns.count();
  810 |     if (count === 0) {
  811 |       test.skip(true, 'Keine k-btn-sm sichtbar');
  812 |       return;
  813 |     }
  814 |     const firstBtn = smBtns.first();
  815 |     const minHeight = await firstBtn.evaluate(el => parseFloat(getComputedStyle(el).minHeight));
> 816 |     expect(minHeight).toBeLessThanOrEqual(32);
      |                       ^ Error: expect(received).toBeLessThanOrEqual(expected)
  817 |   });
  818 | });
  819 | 
  820 | // ═══════════════════════════════════════════════════
  821 | //  AK-UI-36 – Android Zurück-Button
  822 | // ═══════════════════════════════════════════════════
  823 | 
  824 | test.describe('AK-UI-36 – Android Zurück-Button', () => {
  825 |   test('T-36-01: Hilfe-Modal öffnen → Back schließt Modal', async ({ page }) => {
  826 |     await page.goto(KIOSK_URL);
  827 |     await page.waitForLoadState('networkidle');
  828 | 
  829 |     // Open help modal
  830 |     await page.evaluate(() => K.openModal('modal-help'));
  831 |     await expect(page.locator('#modal-help')).toHaveClass(/open/);
  832 | 
  833 |     // Simulate Android back button
  834 |     await page.goBack();
  835 |     await page.waitForTimeout(300);
  836 | 
  837 |     // Modal should be closed
  838 |     await expect(page.locator('#modal-help')).not.toHaveClass(/open/);
  839 |     // Page should still be kiosk (not navigated away)
  840 |     expect(page.url()).toContain('/kiosk');
  841 |   });
  842 | 
  843 |   test('T-36-02: Bestelldetail-Modal öffnen → Back schließt Modal', async ({ page }) => {
  844 |     await page.goto(KIOSK_URL);
  845 |     await page.waitForLoadState('networkidle');
  846 | 
  847 |     // Open detail modal
  848 |     await page.evaluate(() => K.openModal('modal-detail'));
  849 |     await expect(page.locator('#modal-detail')).toHaveClass(/open/);
  850 | 
  851 |     // Simulate Android back
  852 |     await page.goBack();
  853 |     await page.waitForTimeout(300);
  854 | 
  855 |     await expect(page.locator('#modal-detail')).not.toHaveClass(/open/);
  856 |     expect(page.url()).toContain('/kiosk');
  857 |   });
  858 | 
  859 |   test('T-36-03: Zwei Modals → Back schließt nur das oberste', async ({ page }) => {
  860 |     await page.goto(KIOSK_URL);
  861 |     await page.waitForLoadState('networkidle');
  862 | 
  863 |     // Open first modal
  864 |     await page.evaluate(() => K.openModal('modal-detail'));
  865 |     await expect(page.locator('#modal-detail')).toHaveClass(/open/);
  866 | 
  867 |     // Open second modal on top
  868 |     await page.evaluate(() => K.openModal('modal-help'));
  869 |     await expect(page.locator('#modal-help')).toHaveClass(/open/);
  870 | 
  871 |     // Back closes only top modal (help)
  872 |     await page.goBack();
  873 |     await page.waitForTimeout(300);
  874 |     await expect(page.locator('#modal-help')).not.toHaveClass(/open/);
  875 |     await expect(page.locator('#modal-detail')).toHaveClass(/open/);
  876 | 
  877 |     // Second back closes detail
  878 |     await page.goBack();
  879 |     await page.waitForTimeout(300);
  880 |     await expect(page.locator('#modal-detail')).not.toHaveClass(/open/);
  881 |     expect(page.url()).toContain('/kiosk');
  882 |   });
  883 | });
  884 | 
  885 | // ═══════════════════════════════════════════════════
  886 | //  AK-UI-37 – Historie-Filter mit Zeitraum & Status
  887 | // ═══════════════════════════════════════════════════
  888 | 
  889 | test.describe('AK-UI-37 – Historie-Filter', () => {
  890 |   test('T-37-01: Historie-Tab zeigt Sub-Filter-Bar', async ({ page }) => {
  891 |     await page.goto(KIOSK_URL);
  892 |     await page.waitForLoadState('networkidle');
  893 | 
  894 |     // Sub-filter bar should be hidden initially
  895 |     await expect(page.locator('#hist-bar')).not.toHaveClass(/show/);
  896 | 
  897 |     // Click Historie tab
  898 |     await page.click('[data-filter="history"]');
  899 |     await page.waitForTimeout(300);
  900 | 
  901 |     // Sub-filter bar should now be visible
  902 |     await expect(page.locator('#hist-bar')).toHaveClass(/show/);
  903 | 
  904 |     // Should have time range pills
  905 |     await expect(page.locator('[data-range="7"]')).toBeVisible();
  906 |     await expect(page.locator('[data-range="30"]')).toBeVisible();
  907 |     await expect(page.locator('[data-range="all"]')).toBeVisible();
  908 | 
  909 |     // Should have status pills
  910 |     await expect(page.locator('[data-hstatus="all"]')).toBeVisible();
  911 |     await expect(page.locator('[data-hstatus="3"]')).toBeVisible();
  912 |     await expect(page.locator('[data-hstatus="4"]')).toBeVisible();
  913 |   });
  914 | 
  915 |   test('T-37-02: Wechsel zu anderem Filter versteckt Sub-Bar', async ({ page }) => {
  916 |     await page.goto(KIOSK_URL);
```