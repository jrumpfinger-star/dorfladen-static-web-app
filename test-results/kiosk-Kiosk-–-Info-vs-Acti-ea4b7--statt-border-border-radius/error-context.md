# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.js >> Kiosk – Info vs Actions Design >> Filter-Tabs haben border-bottom statt border/border-radius
- Location: tests\kiosk.spec.js:758:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "rgba(0, 0, 0, 0)"
Received: "rgb(46, 125, 79)"
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - heading "Dorfladen Kiosk" [level=1] [ref=e3]:
      - img [ref=e4]
      - text: Dorfladen Kiosk
    - generic [ref=e8]:
      - generic "Bestellungen heute" [ref=e9]
      - generic [ref=e10]:
        - generic [ref=e11]: Samstag, 27. Juni 2026
        - generic [ref=e12]: 16:17:30
      - button "Hilfe & Workflows" [ref=e13] [cursor=pointer]:
        - img [ref=e14]
      - button "Aktualisieren" [ref=e17] [cursor=pointer]:
        - img [ref=e18]
  - generic [ref=e23]:
    - generic [ref=e24] [cursor=pointer]:
      - img [ref=e26]
      - text: Mittagstisch
    - generic [ref=e29] [cursor=pointer]:
      - img [ref=e31]
      - text: Online-Shop
    - generic [ref=e35] [cursor=pointer]:
      - img [ref=e37]
      - text: Stammkunden
    - generic [ref=e42] [cursor=pointer]:
      - img [ref=e44]
      - text: Metzger
    - generic [ref=e48] [cursor=pointer]:
      - img [ref=e50]
      - text: Social
  - generic [ref=e57]:
    - generic [ref=e58]:
      - button "Zu erledigen -" [ref=e59] [cursor=pointer]:
        - img [ref=e60]
        - generic [ref=e64]: Zu erledigen
        - generic [ref=e65]: "-"
      - button "Heute abholen -" [ref=e66] [cursor=pointer]:
        - img [ref=e67]
        - generic [ref=e69]: Heute abholen
        - generic [ref=e70]: "-"
      - button "Überfällig -" [ref=e71] [cursor=pointer]:
        - img [ref=e72]
        - generic [ref=e74]: Überfällig
        - generic [ref=e75]: "-"
      - button "Historie 0" [ref=e76] [cursor=pointer]:
        - img [ref=e77]
        - generic [ref=e81]: Historie
        - generic [ref=e82]: "0"
    - generic [ref=e85]:
      - img [ref=e87]
      - text: Laden…
  - generic [ref=e92]: ⚠ TEST-UMGEBUNG – Nicht die Live-Seite!
```

# Test source

```ts
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
  684 |       }
  685 |       // Nachrichten list should show Kunde text
  686 |       await page.waitForTimeout(1000);
  687 |       const html = await page.locator('#mittag-orders').innerHTML();
  688 |       expect(html).toContain('Kunde:');
  689 |     }
  690 |   });
  691 | 
  692 |   test('T-17-04 (AK-UI-17e) Nachrichten-Tab: Antwort-Button und Gelesen-Button sichtbar', async ({ page }) => {
  693 |     await page.goto(KIOSK_URL);
  694 |     await page.click('.k-tab[data-tab="mittag"]');
  695 |     await page.waitForTimeout(2000);
  696 |     await page.click('[data-mt-filter="nachrichten"]');
  697 |     await page.waitForTimeout(2000);
  698 |     const orders = await page.locator('#mittag-orders .k-order').count();
  699 |     if (orders === 0) {
  700 |       test.skip(true, 'Keine Nachrichten vorhanden');
  701 |       return;
  702 |     }
  703 |     // Antworten button should exist
  704 |     const replyBtns = page.locator('#mittag-orders button:has-text("Antworten")');
  705 |     expect(await replyBtns.count()).toBeGreaterThan(0);
  706 |   });
  707 | 
  708 |   test('T-17-05 (AK-UI-17f) API mode=messages liefert vollständige Bestellungen', async ({ request }) => {
  709 |     const response = await request.get(`${BASE}/api/lunch-order?mode=messages`);
  710 |     expect(response.status()).toBe(200);
  711 |     const data = await response.json();
  712 |     expect(data.success).toBe(true);
  713 |     expect(typeof data.count).toBe('number');
  714 |     expect(Array.isArray(data.orders)).toBe(true);
  715 |     if (data.orders.length > 0) {
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
> 768 |     expect(btnBg).toBe('rgba(0, 0, 0, 0)');
      |                   ^ Error: expect(received).toBe(expected) // Object.is equality
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
  816 |     expect(minHeight).toBeLessThanOrEqual(32);
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
```