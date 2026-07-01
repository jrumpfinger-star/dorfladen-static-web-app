# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mittagstisch-bestellen.spec.js >> T-MT Mittagstisch bestellen >> T-MT-02 Vergangene Tage zeigen "vorbei" Label (AK-MT-01)
- Location: tests\mittagstisch-bestellen.spec.js:34:3

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
    - heading "🍽 Mittagessen bestellen" [level=1] [ref=e3]
    - text: Dorfladen Oberornau · Dorfplatz 1
  - generic [ref=e4]:
    - generic [ref=e5]: Bestellschluss für heute erreicht
    - generic [ref=e6]: Bestellungen für morgen sind weiterhin möglich
  - generic [ref=e9]:
    - heading "📋 Mittagstisch diese Woche" [level=3] [ref=e10]
    - generic [ref=e11]:
      - generic [ref=e12]: Montag vorbei
      - generic:
        - generic: Halsgrat mit Champignon und Käse überbacken mit Kartoffelsalat und Salat
        - generic: € 9,80
      - generic [ref=e13]: Dienstag vorbei
      - generic:
        - generic: Thai Curry mit Reis oder Pommes
        - generic: € 8,80
      - generic:
        - generic: Kaspressknödl mit Tsatsiki und Salat
        - generic: € 8,80
      - generic [ref=e14]: Mittwoch Bestellschluss erreicht
      - generic:
        - generic: Schweinsbraten mit Knödl und Kartoffelsalat
        - generic: € 8,80
      - generic [ref=e15]: Donnerstag
      - generic [ref=e16] [cursor=pointer]:
        - generic [ref=e17]: Pfefferrahmschnitzel mit Kroketten und Gemüse
        - generic [ref=e18]: € 9,80
        - img [ref=e20]
      - generic [ref=e24]: Freitag
      - generic [ref=e25] [cursor=pointer]:
        - generic [ref=e26]: Schnitzel mit Pommes oder Kartoffelsalat
        - generic [ref=e27]: € 8,80
        - img [ref=e29]
  - generic [ref=e33]: ⚠ TEST-UMGEBUNG – Nicht die Live-Seite!
```

# Test source

```ts
  1   | // @ts-check
  2   | const { test, expect } = require('@playwright/test');
  3   | 
  4   | const BASE = process.env.BASE_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
  5   | 
  6   | /* ───────────────────────────────────────────────
  7   |    T-MT – Mittagstisch bestellen (AK-MT-01 .. AK-MT-06)
  8   |    ─────────────────────────────────────────────── */
  9   | 
  10  | test.describe('T-MT Mittagstisch bestellen', () => {
  11  | 
  12  |   // AK-MT-01: Vergangene Tage nicht bestellbar
  13  |   test('T-MT-01 Vergangene Tage sind ausgegraut und nicht klickbar (AK-MT-01)', async ({ page }) => {
  14  |     await page.goto(BASE + '/mittagstisch-bestellen');
  15  |     await page.waitForSelector('.menu-day-header', { timeout: 10000 });
  16  | 
  17  |     // Get current day of week (1=Mon .. 5=Fri)
  18  |     const todayDow = new Date().getDay(); // 0=Sun
  19  |     if (todayDow <= 1) {
  20  |       test.skip(true, 'Montag oder Sonntag – keine vergangenen Tage');
  21  |     }
  22  | 
  23  |     // Past items should have opacity and pointer-events:none
  24  |     const pastItems = page.locator('.menu-item[style*="pointer-events"]');
  25  |     const pastCount = await pastItems.count();
  26  |     expect(pastCount).toBeGreaterThan(0);
  27  | 
  28  |     // Past items should have line-through
  29  |     const firstPastDish = pastItems.first().locator('.menu-item-dish');
  30  |     await expect(firstPastDish).toHaveCSS('text-decoration-line', 'line-through');
  31  |   });
  32  | 
  33  |   // AK-MT-01: "vorbei" Label
  34  |   test('T-MT-02 Vergangene Tage zeigen "vorbei" Label (AK-MT-01)', async ({ page }) => {
  35  |     await page.goto(BASE + '/mittagstisch-bestellen');
  36  |     await page.waitForSelector('.menu-day-header', { timeout: 10000 });
  37  | 
  38  |     const todayDow = new Date().getDay();
  39  |     if (todayDow <= 1) {
  40  |       test.skip(true, 'Montag oder Sonntag – keine vergangenen Tage');
  41  |     }
  42  | 
  43  |     const headers = page.locator('.menu-day-header');
  44  |     const headerTexts = await headers.allInnerTexts();
  45  |     const hasVorbei = headerTexts.some(t => t.includes('vorbei'));
> 46  |     expect(hasVorbei).toBe(true);
      |                       ^ Error: expect(received).toBe(expected) // Object.is equality
  47  |   });
  48  | 
  49  |   // AK-MT-01: Kein Bestell-Button bei vergangenen Tagen
  50  |   test('T-MT-03 Vergangene Tage haben keinen Bestell-Button (AK-MT-01)', async ({ page }) => {
  51  |     await page.goto(BASE + '/mittagstisch-bestellen');
  52  |     await page.waitForSelector('.menu-day-header', { timeout: 10000 });
  53  | 
  54  |     const todayDow = new Date().getDay();
  55  |     if (todayDow <= 1) {
  56  |       test.skip(true, 'Montag oder Sonntag – keine vergangenen Tage');
  57  |     }
  58  | 
  59  |     const pastItems = page.locator('.menu-item[style*="pointer-events"]');
  60  |     const count = await pastItems.count();
  61  |     for (let i = 0; i < count; i++) {
  62  |       const orderBtn = pastItems.nth(i).locator('.menu-item-order');
  63  |       await expect(orderBtn).toHaveCount(0);
  64  |     }
  65  |   });
  66  | 
  67  |   // AK-MT-03: Zukünftige Tage bestellbar
  68  |   test('T-MT-04 Zukünftige Tage zeigen Bestell-Button (AK-MT-03)', async ({ page }) => {
  69  |     await page.goto(BASE + '/mittagstisch-bestellen');
  70  |     await page.waitForSelector('.menu-day-header', { timeout: 10000 });
  71  | 
  72  |     const todayDow = new Date().getDay();
  73  |     if (todayDow >= 5) {
  74  |       test.skip(true, 'Freitag/Samstag – keine zukünftigen Wochentage');
  75  |     }
  76  | 
  77  |     const activeItems = page.locator('.menu-item:not([style*="pointer-events"])');
  78  |     const activeCount = await activeItems.count();
  79  |     expect(activeCount).toBeGreaterThan(0);
  80  | 
  81  |     const firstActive = activeItems.first().locator('.menu-item-order');
  82  |     await expect(firstActive).toHaveCount(1);
  83  |   });
  84  | 
  85  |   // AK-MT-04: Dynamischer Bestellschluss
  86  |   test('T-MT-05 Bestellschluss wird dynamisch geladen (AK-MT-04)', async ({ page }) => {
  87  |     await page.goto(BASE + '/mittagstisch-bestellen');
  88  |     await page.waitForSelector('#lunch-cd', { timeout: 10000 });
  89  | 
  90  |     const cdEl = page.locator('#lunch-cd');
  91  |     await expect(cdEl).toBeVisible();
  92  | 
  93  |     // Should contain either countdown or "erreicht"
  94  |     const text = await cdEl.innerText();
  95  |     expect(text.length).toBeGreaterThan(0);
  96  |   });
  97  | 
  98  |   // AK-MT-05: TagesInfo Bestell-Button
  99  |   test('T-MT-06 TagesInfo zeigt Mittagessen-Bestell-Button (AK-MT-05)', async ({ page }) => {
  100 |     await page.goto(BASE + '/');
  101 |     // Open TagesInfo modal
  102 |     await page.evaluate(() => {
  103 |       var el = document.getElementById('tp-overlay');
  104 |       if (el) el.classList.add('open');
  105 |     });
  106 |     await page.waitForTimeout(500);
  107 | 
  108 |     const orderBtn = page.locator('.tp-item-order');
  109 |     // Only check if there are Mittagessen items
  110 |     const mittag = page.locator('.tp-section-title:has-text("Mittagessen")');
  111 |     const hasMittag = await mittag.count();
  112 |     if (hasMittag > 0) {
  113 |       await expect(orderBtn.first()).toBeVisible();
  114 |       const href = await orderBtn.first().getAttribute('href');
  115 |       expect(href).toContain('/mittagstisch-bestellen');
  116 |     }
  117 |   });
  118 | 
  119 |   // AK-MT-06: TagesInfo Name nicht abgeschnitten
  120 |   test('T-MT-07 TagesInfo Mittagessen-Name wird nicht abgeschnitten (AK-MT-06)', async ({ page }) => {
  121 |     await page.goto(BASE + '/');
  122 |     await page.evaluate(() => {
  123 |       var el = document.getElementById('tp-overlay');
  124 |       if (el) el.classList.add('open');
  125 |     });
  126 |     await page.waitForTimeout(500);
  127 | 
  128 |     const itemName = page.locator('.tp-item-name').first();
  129 |     const nameCount = await itemName.count();
  130 |     if (nameCount > 0) {
  131 |       const ws = await itemName.evaluate(el => getComputedStyle(el).whiteSpace);
  132 |       expect(ws).not.toBe('nowrap');
  133 |     }
  134 |   });
  135 | 
  136 |   // AK-MT-06: Keine redundante Kategorie "Mittagessen"
  137 |   test('T-MT-08 TagesInfo zeigt nicht redundant "Mittagessen" als Kategorie (AK-MT-06)', async ({ page }) => {
  138 |     await page.goto(BASE + '/');
  139 |     await page.evaluate(() => {
  140 |       var el = document.getElementById('tp-overlay');
  141 |       if (el) el.classList.add('open');
  142 |     });
  143 |     await page.waitForTimeout(500);
  144 | 
  145 |     const mittag = page.locator('.tp-section-title:has-text("Mittagessen")');
  146 |     const hasMittag = await mittag.count();
```