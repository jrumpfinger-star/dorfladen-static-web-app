# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.js >> Kiosk – Info vs Actions Design >> Filter-Tabs haben border-bottom statt border/border-radius
- Location: tests\kiosk.spec.js:754:3

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
        - generic [ref=e11]: Dienstag, 30. Juni 2026
        - generic [ref=e12]: 22:53:57
      - button "Ton ist an (klick = ausschalten)" [ref=e13] [cursor=pointer]:
        - img [ref=e14]
      - button "Hilfe & Workflows" [ref=e18] [cursor=pointer]:
        - img [ref=e19]
      - button "Aktualisieren" [ref=e22] [cursor=pointer]:
        - img [ref=e23]
  - generic [ref=e28]:
    - generic [ref=e29] [cursor=pointer]:
      - img [ref=e31]
      - text: Mittagstisch
    - generic [ref=e34] [cursor=pointer]:
      - img [ref=e36]
      - text: Online-Shop
    - generic [ref=e40] [cursor=pointer]:
      - img [ref=e42]
      - text: Metzger
    - generic [ref=e46] [cursor=pointer]:
      - img [ref=e48]
      - text: Social
    - generic [ref=e54] [cursor=pointer]:
      - img [ref=e56]
      - text: Stammkunden
  - generic [ref=e62]:
    - generic [ref=e63]:
      - button "Zu erledigen -" [ref=e64] [cursor=pointer]:
        - img [ref=e65]
        - generic [ref=e69]: Zu erledigen
        - generic [ref=e70]: "-"
      - button "Heute abholen -" [ref=e71] [cursor=pointer]:
        - img [ref=e72]
        - generic [ref=e74]: Heute abholen
        - generic [ref=e75]: "-"
      - button "Überfällig -" [ref=e76] [cursor=pointer]:
        - img [ref=e77]
        - generic [ref=e79]: Überfällig
        - generic [ref=e80]: "-"
      - button "Historie 0" [ref=e81] [cursor=pointer]:
        - img [ref=e82]
        - generic [ref=e86]: Historie
        - generic [ref=e87]: "0"
    - generic [ref=e90]:
      - img [ref=e92]
      - text: Laden…
  - generic [ref=e97]: ⚠ TEST-UMGEBUNG – Nicht die Live-Seite!
```

# Test source

```ts
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
  758 |     expect(borderBottom).toBe('solid');
  759 |     const activeBtn = page.locator('#abhol-filter-bar .k-filter-btn.active');
  760 |     const btnBorder = await activeBtn.evaluate(el => getComputedStyle(el).borderBottomColor);
  761 |     // Should be green (not transparent)
  762 |     expect(btnBorder).not.toBe('rgba(0, 0, 0, 0)');
  763 |     const btnBg = await activeBtn.evaluate(el => getComputedStyle(el).backgroundColor);
> 764 |     expect(btnBg).toBe('rgba(0, 0, 0, 0)');
      |                   ^ Error: expect(received).toBe(expected) // Object.is equality
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
  812 |     expect(minHeight).toBeLessThanOrEqual(32);
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
```