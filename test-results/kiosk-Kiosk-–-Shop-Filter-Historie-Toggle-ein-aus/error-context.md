# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.js >> Kiosk – Shop-Filter >> Historie-Toggle ein/aus
- Location: tests\kiosk.spec.js:68:3

# Error details

```
Error: expect(locator).not.toHaveClass(expected) failed

Locator: locator('#btn-history')
Expected pattern: not /active/
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "not toHaveClass" with timeout 5000ms
  - waiting for locator('#btn-history')

```

```yaml
- heading "Dorfladen Kiosk" [level=1]
- img
- text: Samstag, 27. Juni 2026 16:14:17
- button "Hilfe & Workflows"
- button "Aktualisieren"
- text: Mittagstisch 1 Online-Shop Stammkunden Metzger 7 Social
- button "Zu erledigen 1"
- button "Heute abholen 1"
- button "Überfällig 1"
- button "Historie 26"
- text: 1 Warten 1 Überfällig ▼ Heute · Vormittag (08:00–13:00) 1 Warten ⚠ TEST-UMGEBUNG – Nicht die Live-Seite!
```

# Test source

```ts
  1   | /**
  2   |  * Kiosk Tests – Playwright (funktionale E2E-Tests)
  3   |  * 
  4   |  * Testet die kiosk.html Features gegen die Specs:
  5   |  *   - specs/kiosk-ui.md
  6   |  *   - specs/kiosk-packing.md
  7   |  * 
  8   |  * Nur funktionale Tests – keine DOM-Präsenz-, Source-String- oder CSS-Checks.
  9   |  * 
  10  |  * Ausführen:
  11  |  *   npx playwright test tests/kiosk.spec.js
  12  |  */
  13  | 
  14  | const { test, expect } = require('@playwright/test');
  15  | 
  16  | const BASE = process.env.TEST_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
  17  | const KIOSK_URL = `${BASE}/kiosk`;
  18  | 
  19  | // ════════════════════════════════════════════════════
  20  | //  Tab-Navigation & Default-Tab
  21  | // ════════════════════════════════════════════════════
  22  | 
  23  | test.describe('Kiosk – Tab-Navigation', () => {
  24  | 
  25  |   test('Online-Shop ist Default-Tab beim Laden', async ({ page }) => {
  26  |     await page.goto(KIOSK_URL);
  27  |     const activeTab = page.locator('.k-tab.active');
  28  |     await expect(activeTab).toHaveAttribute('data-tab', 'abhol');
  29  |     const activePanel = page.locator('.k-panel.active');
  30  |     await expect(activePanel).toHaveAttribute('id', 'panel-abhol');
  31  |   });
  32  | 
  33  |   test('Tab-Wechsel zeigt korrektes Panel', async ({ page }) => {
  34  |     await page.goto(KIOSK_URL);
  35  |     // Switch to Mittagstisch
  36  |     await page.locator('.k-tab[data-tab="mittag"]').click();
  37  |     await expect(page.locator('.k-tab[data-tab="mittag"]')).toHaveClass(/active/);
  38  |     await expect(page.locator('#panel-mittag')).toHaveClass(/active/);
  39  |     // Switch to Stammkunden
  40  |     await page.locator('.k-tab[data-tab="kunden"]').click();
  41  |     await expect(page.locator('.k-tab[data-tab="kunden"]')).toHaveClass(/active/);
  42  |     await expect(page.locator('#panel-kunden')).toHaveClass(/active/);
  43  |     // Mittagstisch panel should no longer be active
  44  |     await expect(page.locator('#panel-mittag')).not.toHaveClass(/active/);
  45  |   });
  46  | });
  47  | 
  48  | // ════════════════════════════════════════════════════
  49  | //  Online-Shop Filter-Wechsel
  50  | // ════════════════════════════════════════════════════
  51  | 
  52  | test.describe('Kiosk – Shop-Filter', () => {
  53  | 
  54  |   test('Filterwechsel ändert active-Klasse und angezeigte Bestellungen', async ({ page }) => {
  55  |     await page.goto(KIOSK_URL);
  56  |     await page.waitForTimeout(2000);
  57  |     // Click "Heute abholen"
  58  |     const todayBtn = page.locator('.k-filter-btn[data-filter="today"]');
  59  |     await todayBtn.click();
  60  |     await expect(todayBtn).toHaveClass(/active/);
  61  |     // Click back to "Zu erledigen"
  62  |     const openBtn = page.locator('.k-filter-btn[data-filter="open"]');
  63  |     await openBtn.click();
  64  |     await expect(openBtn).toHaveClass(/active/);
  65  |     await expect(todayBtn).not.toHaveClass(/active/);
  66  |   });
  67  | 
  68  |   test('Historie-Toggle ein/aus', async ({ page }) => {
  69  |     await page.goto(KIOSK_URL);
  70  |     const histBtn = page.locator('#btn-history');
> 71  |     await expect(histBtn).not.toHaveClass(/active/);
      |                               ^ Error: expect(locator).not.toHaveClass(expected) failed
  72  |     await histBtn.click();
  73  |     await expect(histBtn).toHaveClass(/active/);
  74  |     await histBtn.click();
  75  |     await expect(histBtn).not.toHaveClass(/active/);
  76  |   });
  77  | 
  78  |   test('Badge-Zahl ≤ "Zu erledigen" Filteranzahl', async ({ page }) => {
  79  |     await page.goto(KIOSK_URL);
  80  |     await page.waitForTimeout(2000);
  81  |     const badgeText = await page.locator('#badge-abhol').textContent();
  82  |     const badgeVal = parseInt(badgeText) || 0;
  83  |     const filterCount = parseInt(await page.locator('#fc-open').textContent()) || 0;
  84  |     expect(badgeVal).toBeLessThanOrEqual(filterCount);
  85  |   });
  86  | });
  87  | 
  88  | // ════════════════════════════════════════════════════
  89  | //  Zeitslot-Gruppen: Auf/Zuklappen + Zustand beibehalten
  90  | // ════════════════════════════════════════════════════
  91  | 
  92  | test.describe('Kiosk – Slot-Gruppen', () => {
  93  | 
  94  |   test('Slot-Gruppen klappen auf/zu und behalten Zustand bei Refresh', async ({ page }) => {
  95  |     await page.goto(KIOSK_URL);
  96  |     await page.waitForTimeout(2000);
  97  |     const headers = page.locator('.k-slot-header');
  98  |     const count = await headers.count();
  99  |     if (count === 0) {
  100 |       test.skip(true, 'Keine Bestellungen – Slot-Gruppen nicht testbar');
  101 |       return;
  102 |     }
  103 |     // Find first collapsed group
  104 |     const firstHeader = headers.first();
  105 |     const group = firstHeader.locator('..');
  106 |     const wasCollapsed = await group.evaluate(el => el.classList.contains('collapsed'));
  107 | 
  108 |     if (wasCollapsed) {
  109 |       // Expand it
  110 |       await firstHeader.click();
  111 |       await expect(group).not.toHaveClass(/collapsed/);
  112 |     } else {
  113 |       // Collapse it
  114 |       await firstHeader.click();
  115 |       await expect(group).toHaveClass(/collapsed/);
  116 |     }
  117 | 
  118 |     // Click Refresh – slot group state should be preserved
  119 |     const groupId = await group.getAttribute('id');
  120 |     await page.locator('button[title="Aktualisieren"]').click();
  121 |     await page.waitForTimeout(3000);
  122 |     const updatedGroup = page.locator('#' + groupId);
  123 |     if (wasCollapsed) {
  124 |       // Was collapsed, we expanded it → after refresh should still be expanded
  125 |       await expect(updatedGroup).not.toHaveClass(/collapsed/);
  126 |     } else {
  127 |       // Was expanded, we collapsed it → after refresh should still be collapsed
  128 |       await expect(updatedGroup).toHaveClass(/collapsed/);
  129 |     }
  130 |   });
  131 | });
  132 | 
  133 | // ════════════════════════════════════════════════════
  134 | //  Mittagstisch – Tagesauswahl + API
  135 | // ════════════════════════════════════════════════════
  136 | 
  137 | test.describe('Kiosk – Mittagstisch Tagesauswahl', () => {
  138 | 
  139 |   test('7 Tage, Default=Heute, Wechsel lädt korrekte Daten', async ({ page }) => {
  140 |     await page.goto(KIOSK_URL);
  141 |     await page.locator('.k-tab[data-tab="mittag"]').click();
  142 |     await page.waitForSelector('#mittag-day-bar button');
  143 | 
  144 |     const dayButtons = page.locator('#mittag-day-bar button');
  145 |     await expect(dayButtons).toHaveCount(7);
  146 | 
  147 |     // Default active = Heute
  148 |     const activeBtn = page.locator('#mittag-day-bar button.active');
  149 |     await expect(activeBtn).toContainText('Heute');
  150 | 
  151 |     // Click each day: verify API call + response + rendering
  152 |     const count = await dayButtons.count();
  153 |     // Set filter to "Alle" first so we see all orders
  154 |     await page.locator('#mittag-status-bar button[data-mt-filter="alle"]').click();
  155 |     await page.waitForTimeout(300);
  156 | 
  157 |     for (let i = 0; i < count; i++) {
  158 |       const btn = dayButtons.nth(i);
  159 |       const label = (await btn.textContent()).trim();
  160 |       const datum = await btn.getAttribute('data-datum');
  161 | 
  162 |       const apiPromise = page.waitForResponse(
  163 |         resp => resp.url().includes('/api/lunch-order') && resp.url().includes(`datum=${datum}`),
  164 |         { timeout: 10000 }
  165 |       );
  166 |       await btn.click();
  167 |       const apiResponse = await apiPromise;
  168 |       expect(apiResponse.status(), `API für "${label}" (${datum})`).toBe(200);
  169 |       const json = await apiResponse.json();
  170 |       expect(json.success).toBe(true);
  171 |       expect(Array.isArray(json.orders)).toBe(true);
```