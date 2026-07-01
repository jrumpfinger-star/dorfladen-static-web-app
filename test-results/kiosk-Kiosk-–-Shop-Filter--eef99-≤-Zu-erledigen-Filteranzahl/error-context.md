# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.js >> Kiosk – Shop-Filter >> Badge-Zahl ≤ "Zu erledigen" Filteranzahl
- Location: tests\kiosk.spec.js:78:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.textContent: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('#badge-abhol')

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
        - generic [ref=e29]: 22:50:22
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
  71  |     await expect(histBtn).not.toHaveClass(/active/);
  72  |     await histBtn.click();
  73  |     await expect(histBtn).toHaveClass(/active/);
  74  |     await histBtn.click();
  75  |     await expect(histBtn).not.toHaveClass(/active/);
  76  |   });
  77  | 
  78  |   test('Badge-Zahl ≤ "Zu erledigen" Filteranzahl', async ({ page }) => {
  79  |     await page.goto(KIOSK_URL);
  80  |     await page.waitForTimeout(2000);
> 81  |     const badgeText = await page.locator('#badge-abhol').textContent();
      |                                                          ^ Error: locator.textContent: Test timeout of 60000ms exceeded.
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
  172 |       await expect(btn).toHaveClass(/active/);
  173 | 
  174 |       // "Alle" Zähler = API order count
  175 |       const alleCount = await page.locator('#mt-fc-alle').textContent();
  176 |       expect(parseInt(alleCount), `Alle-Zähler für ${label}`).toBe(json.orders.length);
  177 | 
  178 |       if (json.orders.length > 0) {
  179 |         // Ensure "Alle" filter is active to see all orders
  180 |         await page.locator('#mittag-status-bar button[data-mt-filter="alle"]').click();
  181 |         await page.waitForTimeout(300);
```