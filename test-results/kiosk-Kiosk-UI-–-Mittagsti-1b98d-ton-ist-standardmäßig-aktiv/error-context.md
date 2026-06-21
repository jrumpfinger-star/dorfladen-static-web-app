# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.js >> Kiosk UI – Mittagstisch Tagesauswahl >> AK-UI-05b: Heute-Button ist standardmäßig aktiv
- Location: tests\kiosk.spec.js:101:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.waitForSelector: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('#mittag-day-bar button') to be visible
    120 × locator resolved to 7 elements. Proceeding with the first one: <button class="k-filter-btn" data-datum="2026-06-20" onclick="K.setMittagDatum('2026-06-20')">Gestern</button>

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - heading "Dorfladen Kiosk" [level=1] [ref=e3]:
      - img [ref=e4]
      - text: Dorfladen Kiosk
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: Sonntag, 21. Juni 2026
        - generic [ref=e11]: 23:00:24
      - button "Aktualisieren" [ref=e12] [cursor=pointer]:
        - img [ref=e13]
  - generic [ref=e18]:
    - generic [ref=e19] [cursor=pointer]:
      - img [ref=e21]
      - text: Mittagstisch
    - generic [ref=e24] [cursor=pointer]:
      - img [ref=e26]
      - text: Online-Shop
    - generic [ref=e30] [cursor=pointer]:
      - img [ref=e32]
      - text: Stammkunden
  - generic [ref=e38]:
    - generic [ref=e39]:
      - generic [ref=e40]:
        - button "Zu erledigen 3" [ref=e41] [cursor=pointer]:
          - img [ref=e42]
          - text: Zu erledigen 3
        - button "Heute abholen 0" [ref=e46] [cursor=pointer]:
          - img [ref=e47]
          - text: Heute abholen 0
        - button "Überfällig 0" [ref=e49] [cursor=pointer]:
          - img [ref=e50]
          - text: Überfällig 0
        - button "Historie 23" [ref=e52] [cursor=pointer]:
          - img [ref=e53]
          - text: Historie 23
      - generic [ref=e58]:
        - generic [ref=e59]: "3"
        - generic [ref=e60]:
          - img [ref=e61]
          - text: Warten
    - generic [ref=e64]:
      - generic [ref=e66] [cursor=pointer]:
        - generic [ref=e67]: ▼
        - text: Morgen · Nachmittag (17:30–19:00)
        - generic [ref=e69]:
          - img [ref=e70]
          - text: 1 Bereit
      - generic [ref=e74] [cursor=pointer]:
        - generic [ref=e75]: ▼
        - text: Morgen · Vormittag (07:30–14:00)
        - generic [ref=e77]:
          - img [ref=e78]
          - text: 1 Bereit
      - generic [ref=e82] [cursor=pointer]:
        - generic [ref=e83]: ▼
        - text: 23.06.2026 · Vormittag (10:00–14:00)
        - generic [ref=e85]:
          - img [ref=e86]
          - text: 1 Bereit
  - generic [ref=e89]:
    - button "Neue Telefonbestellung" [ref=e90] [cursor=pointer]:
      - img [ref=e91]
      - text: Neue Telefonbestellung
    - button "Küchenliste drucken" [ref=e93] [cursor=pointer]:
      - img [ref=e94]
      - text: Küchenliste drucken
```

# Test source

```ts
  3   |  * 
  4   |  * Testet die kiosk.html Features gegen die Specs:
  5   |  *   - specs/kiosk-ui.md
  6   |  *   - specs/kiosk-packing.md
  7   |  * 
  8   |  * Voraussetzung: SWA CLI oder lokaler Server auf Port 4280
  9   |  *   npx @azure/static-web-apps-cli start static-site --api-location api
  10  |  * 
  11  |  * Ausführen:
  12  |  *   npx playwright test tests/kiosk.spec.js
  13  |  */
  14  | 
  15  | const { test, expect } = require('@playwright/test');
  16  | 
  17  | const BASE = process.env.TEST_URL || 'http://localhost:4280';
  18  | const KIOSK_URL = `${BASE}/kiosk`;
  19  | 
  20  | // ════════════════════════════════════════════════════
  21  | //  AK-UI: Kiosk UI Verbesserungen (specs/kiosk-ui.md)
  22  | // ════════════════════════════════════════════════════
  23  | 
  24  | test.describe('Kiosk UI – Tabs', () => {
  25  | 
  26  |   test('AK-UI-01: Tab zeigt "Online-Shop" statt "Abholungen"', async ({ page }) => {
  27  |     await page.goto(KIOSK_URL);
  28  |     const tabTexts = await page.locator('.k-tab').allTextContents();
  29  |     const joined = tabTexts.join(' ');
  30  |     expect(joined).toContain('Online-Shop');
  31  |     expect(joined).not.toContain('Abholungen');
  32  |   });
  33  | 
  34  |   test('AK-UI-01b: 3 Tabs vorhanden: Mittagstisch, Online-Shop, Stammkunden', async ({ page }) => {
  35  |     await page.goto(KIOSK_URL);
  36  |     const tabs = page.locator('.k-tab');
  37  |     await expect(tabs).toHaveCount(3);
  38  |     const texts = await tabs.allTextContents();
  39  |     expect(texts[0]).toContain('Mittagstisch');
  40  |     expect(texts[1]).toContain('Online-Shop');
  41  |     expect(texts[2]).toContain('Stammkunden');
  42  |   });
  43  | 
  44  |   test('AK-UI-01c: Refresh-Button im Header vorhanden', async ({ page }) => {
  45  |     await page.goto(KIOSK_URL);
  46  |     const refreshBtn = page.locator('.k-header button[title="Aktualisieren"]');
  47  |     await expect(refreshBtn).toBeVisible();
  48  |   });
  49  | });
  50  | 
  51  | test.describe('Kiosk UI – Online-Shop Filter', () => {
  52  | 
  53  |   test('AK-UI-02: 4 Filter-Buttons: Zu erledigen, Heute abholen, Überfällig, Historie', async ({ page }) => {
  54  |     await page.goto(KIOSK_URL);
  55  |     // Switch to Online-Shop tab
  56  |     await page.locator('.k-tab[data-tab="abhol"]').click();
  57  |     const buttons = page.locator('#abhol-filter-bar .k-filter-btn');
  58  |     await expect(buttons).toHaveCount(4);
  59  |     const texts = await buttons.allTextContents();
  60  |     expect(texts[0]).toContain('Zu erledigen');
  61  |     expect(texts[1]).toContain('Heute abholen');
  62  |     expect(texts[2]).toContain('Überfällig');
  63  |     expect(texts[3]).toContain('Historie');
  64  |   });
  65  | 
  66  |   test('AK-UI-09: Badge auf Online-Shop-Tab vorhanden', async ({ page }) => {
  67  |     await page.goto(KIOSK_URL);
  68  |     const badge = page.locator('#badge-abhol');
  69  |     await expect(badge).toBeAttached();
  70  |   });
  71  | 
  72  |   test('AK-UI-13: Shop-Stats zeigen handlungsorientierte Labels', async ({ page }) => {
  73  |     await page.goto(KIOSK_URL);
  74  |     await page.locator('.k-tab[data-tab="abhol"]').click();
  75  |     await page.waitForTimeout(2000);
  76  |     const stats = await page.locator('#abhol-stats').textContent();
  77  |     // Should NOT contain old labels
  78  |     expect(stats).not.toContain('Bearb.');
  79  |     expect(stats).not.toContain('Umsatz');
  80  |     expect(stats).not.toContain('€');
  81  |   });
  82  | 
  83  |   test('AK-UI-14: Mittagstisch-Stats zeigen Portionen statt Umsatz', async ({ page }) => {
  84  |     await page.goto(KIOSK_URL);
  85  |     await page.waitForTimeout(2000);
  86  |     const stats = await page.locator('#mittag-stats').textContent();
  87  |     expect(stats).toContain('Portionen');
  88  |     expect(stats).not.toContain('Umsatz');
  89  |   });
  90  | });
  91  | 
  92  | test.describe('Kiosk UI – Mittagstisch Tagesauswahl', () => {
  93  | 
  94  |   test('AK-UI-05: Tagesauswahl zeigt 7 Tage', async ({ page }) => {
  95  |     await page.goto(KIOSK_URL);
  96  |     await page.waitForSelector('#mittag-day-bar button');
  97  |     const dayButtons = page.locator('#mittag-day-bar button');
  98  |     await expect(dayButtons).toHaveCount(7);
  99  |   });
  100 | 
  101 |   test('AK-UI-05b: Heute-Button ist standardmäßig aktiv', async ({ page }) => {
  102 |     await page.goto(KIOSK_URL);
> 103 |     await page.waitForSelector('#mittag-day-bar button');
      |                ^ Error: page.waitForSelector: Test timeout of 60000ms exceeded.
  104 |     const activeBtn = page.locator('#mittag-day-bar button.active');
  105 |     await expect(activeBtn).toHaveCount(1);
  106 |     await expect(activeBtn).toContainText('Heute');
  107 |   });
  108 | 
  109 |   test('AK-UI-05c: Tagesauswahl enthält "Gestern" und "Morgen"', async ({ page }) => {
  110 |     await page.goto(KIOSK_URL);
  111 |     await page.waitForSelector('#mittag-day-bar button');
  112 |     const texts = await page.locator('#mittag-day-bar button').allTextContents();
  113 |     expect(texts[0]).toContain('Gestern');
  114 |     expect(texts[1]).toContain('Heute');
  115 |     expect(texts[2]).toContain('Morgen');
  116 |   });
  117 | 
  118 |   test('AK-UI-05d: Klick auf anderen Tag wechselt aktiven Button', async ({ page }) => {
  119 |     await page.goto(KIOSK_URL);
  120 |     await page.waitForSelector('#mittag-day-bar button');
  121 |     const morgenBtn = page.locator('#mittag-day-bar button', { hasText: 'Morgen' });
  122 |     await morgenBtn.click();
  123 |     await expect(morgenBtn).toHaveClass(/active/);
  124 |     const heuteBtn = page.locator('#mittag-day-bar button', { hasText: 'Heute' });
  125 |     await expect(heuteBtn).not.toHaveClass(/active/);
  126 |   });
  127 | 
  128 |   test('AK-UI-05e: Jeder Tages-Button liefert API-Daten und aktualisiert Anzeige', async ({ page }) => {
  129 |     await page.goto(KIOSK_URL);
  130 |     // Switch to Mittagstisch tab first
  131 |     await page.locator('.k-tab[data-tab="mittag"]').click();
  132 |     await page.waitForSelector('#mittag-day-bar button');
  133 |     const dayButtons = page.locator('#mittag-day-bar button');
  134 |     const count = await dayButtons.count();
  135 |     expect(count).toBe(7);
  136 | 
  137 |     for (let i = 0; i < count; i++) {
  138 |       const btn = dayButtons.nth(i);
  139 |       const label = (await btn.textContent()).trim();
  140 |       const datum = await btn.getAttribute('data-datum');
  141 | 
  142 |       // Intercept the API call for this date
  143 |       const apiPromise = page.waitForResponse(
  144 |         resp => resp.url().includes('/api/lunch-order') && resp.url().includes(`datum=${datum}`),
  145 |         { timeout: 10000 }
  146 |       );
  147 | 
  148 |       await btn.click();
  149 | 
  150 |       // Wait for API response
  151 |       const apiResponse = await apiPromise;
  152 |       expect(apiResponse.status(), `API für "${label}" (${datum}) sollte 200 liefern`).toBe(200);
  153 | 
  154 |       const json = await apiResponse.json();
  155 |       expect(json.success, `API für "${label}" (${datum}) sollte success=true sein`).toBe(true);
  156 |       expect(Array.isArray(json.orders), `API für "${label}" (${datum}) sollte orders-Array liefern`).toBe(true);
  157 | 
  158 |       // Verify the button is now active
  159 |       await expect(btn).toHaveClass(/active/);
  160 | 
  161 |       // Verify counts update – "Alle" count should match the API count
  162 |       const alleCount = await page.locator('#mt-fc-alle').textContent();
  163 |       expect(parseInt(alleCount), `"Alle" Zähler für "${label}" (${datum}) sollte ${json.orders.length} sein`).toBe(json.orders.length);
  164 | 
  165 |       // If there are orders, verify they are rendered
  166 |       if (json.orders.length > 0) {
  167 |         const orderCards = page.locator('#mittag-orders .k-order');
  168 |         // With filter 'offen' active, count may be less than total, so check total via 'alle' filter
  169 |         // Click "Alle" filter to see all orders
  170 |         await page.locator('#mittag-status-bar button[data-mt-filter="alle"]').click();
  171 |         await page.waitForTimeout(300);
  172 |         const visibleOrders = await page.locator('#mittag-orders .k-order').count();
  173 |         expect(visibleOrders, `"${label}" (${datum}): ${json.orders.length} Bestellungen sollten angezeigt werden`).toBe(json.orders.length);
  174 |         // Reset to 'offen' filter for next iteration
  175 |         await page.locator('#mittag-status-bar button[data-mt-filter="offen"]').click();
  176 |       }
  177 |     }
  178 |   });
  179 | });
  180 | 
  181 | test.describe('Kiosk UI – Stammkunden Formular', () => {
  182 | 
  183 |   test('AK-UI-06: Nachname und Vorname sind separate Felder', async ({ page }) => {
  184 |     await page.goto(KIOSK_URL);
  185 |     await page.locator('.k-tab[data-tab="kunden"]').click();
  186 |     // Open new customer modal
  187 |     await page.locator('text=Neuer Kunde').click();
  188 |     await expect(page.locator('#nk-nachname')).toBeVisible();
  189 |     await expect(page.locator('#nk-vorname')).toBeVisible();
  190 |   });
  191 | 
  192 |   test('AK-UI-06b: Nachname ist Pflichtfeld, Vorname optional', async ({ page }) => {
  193 |     await page.goto(KIOSK_URL);
  194 |     await page.locator('.k-tab[data-tab="kunden"]').click();
  195 |     await page.locator('text=Neuer Kunde').click();
  196 |     // Try submit without Nachname
  197 |     await page.locator('#nk-phone').fill('123');
  198 |     await page.locator('text=Kunde anlegen').click();
  199 |     // Should show error toast
  200 |     await expect(page.locator('#k-toast')).toContainText('Nachname');
  201 |   });
  202 | });
  203 | 
```