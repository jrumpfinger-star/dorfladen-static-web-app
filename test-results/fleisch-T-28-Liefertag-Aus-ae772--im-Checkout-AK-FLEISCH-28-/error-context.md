# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fleisch.spec.js >> T-28 Liefertag-Auswahl & Vorbestellung (AK-FLEISCH-28) >> T-28-03 Frontend hat Liefertag-Dropdown im Checkout (AK-FLEISCH-28)
- Location: tests\fleisch.spec.js:858:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('#fm-liefertag-select')
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('#fm-liefertag-select')
    14 × locator resolved to <select id="fm-liefertag-select">…</select>
       - unexpected value "hidden"

```

```yaml
- link:
  - /url: javascript:void(0)
- heading "Fleisch & Wurst" [level=1]
- text: Vorbestellen & im Laden abholen
- button
- text: "Naechster Liefertag: Donnerstag, 02.07.2026 Bestellen bis Mittwoch, 01.07.2026 10:00 Noch 21h 2min 15 % Rabatt Auf alle Fleisch- und Wurstprodukte bei Vorbestellung ab 1 kg Alle Fleisch und Wurstwaren"
- textbox "Artikel suchen..."
- button "Listenansicht"
- button "Kachelansicht"
- text: Aufschnitt 19,50 € 16,58 € /kg
- button "♡"
- text: "-15%"
- textbox: 1,0
- text: kg
- button "Bestellen"
- text: Currywurst 16,50 € 14,03 € /kg
- button "♡"
- text: "-15%"
- textbox: 1,0
- text: kg
- button "Bestellen"
- text: Dicke 14,90 € 12,67 € /kg
- button "♡"
- text: "-15%"
- textbox: 1,0
- text: kg
- button "Bestellen"
- text: Hackfleisch gem. Strohrind u. -schwein 18,20 € 15,47 € /kg
- button "♡"
- text: "-15%"
- textbox: 1,0
- text: kg
- button "Bestellen"
- text: Halsgrat o. Kn. v. Strohschwein 16,80 € 14,28 € /kg
- button "♡"
- text: "-15%"
- textbox: 1,0
- text: kg
- button "Bestellen"
- text: Hinterschinken 20,99 € 17,84 € /kg
- button "♡"
- text: "-15%"
- textbox: 1,0
- text: kg
- button "Bestellen"
- text: Leberkäse kalt 15,99 € 13,59 € /kg
- button "♡"
- text: "-15%"
- textbox: 1,0
- text: kg
- button "Bestellen"
- text: Lende v. Strohschwein 19,35 € 16,45 € /kg
- button "♡"
- text: "-15%"
- textbox: 1,0
- text: kg
- button "Bestellen"
- text: Rouladen v. Strohrind 29,90 € 25,42 € /kg
- button "♡"
- text: "-15%"
- textbox: 1,0
- text: kg
- button "Bestellen"
- text: Schnitzel v. Strohschwein 18,99 € 16,14 € /kg
- button "♡"
- text: "-15%"
- textbox: 1,0
- text: kg
- button "Bestellen"
- heading "Warenkorb 0" [level=3]
- button
- paragraph: Warenkorb ist leer
- paragraph: Fuegen Sie Artikel hinzu um zu bestellen
- text: ⚠ TEST-UMGEBUNG – Nicht die Live-Seite!
```

# Test source

```ts
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
  851 |   test('T-28-02 API info enthaelt weiterhin termine (Kompatibilitaet) (AK-FLEISCH-28)', async ({ request }) => {
  852 |     const res = await request.get(`${BASE}/api/fleisch-order?info=1`);
  853 |     const data = await res.json();
  854 |     expect(data.termine).toBeDefined();
  855 |     expect(data.termine.length).toBeLessThanOrEqual(2);
  856 |   });
  857 | 
  858 |   test('T-28-03 Frontend hat Liefertag-Dropdown im Checkout (AK-FLEISCH-28)', async ({ page }) => {
  859 |     await page.goto(FLEISCH_URL);
  860 |     await page.waitForTimeout(4000);
  861 |     const select = page.locator('#fm-liefertag-select');
> 862 |     await expect(select).toBeVisible();
      |                          ^ Error: expect(locator).toBeVisible() failed
  863 |     // Should have multiple options
  864 |     const optionCount = await select.locator('option').count();
  865 |     expect(optionCount).toBeGreaterThan(1);
  866 |   });
  867 | 
  868 |   test('T-28-04 Liefertag-Dropdown zeigt naechster-Label (AK-FLEISCH-28)', async ({ page }) => {
  869 |     await page.goto(FLEISCH_URL);
  870 |     await page.waitForTimeout(4000);
  871 |     const firstOption = await page.locator('#fm-liefertag-select option').first().textContent();
  872 |     expect(firstOption).toContain('naechster');
  873 |   });
  874 | 
  875 |   test('T-28-05 Kiosk Sammelbestellung switchSammelDate existiert (AK-FLEISCH-28)', async ({ page }) => {
  876 |     await page.goto(KIOSK_URL);
  877 |     await page.waitForTimeout(3000);
  878 |     const hasFn = await page.evaluate(() => document.documentElement.innerHTML.includes('switchSammelDate'));
  879 |     expect(hasFn).toBe(true);
  880 |   });
  881 | });
  882 | 
```