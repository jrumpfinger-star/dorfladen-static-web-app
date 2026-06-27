# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.js >> Kiosk – Mittagstisch Tagesauswahl >> 7 Tage, Default=Heute, Wechsel lädt korrekte Daten
- Location: tests\kiosk.spec.js:139:3

# Error details

```
Error: Alle-Zähler für Heute27.06

expect(received).toBe(expected) // Object.is equality

Expected: 0
Received: 4
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - heading "Dorfladen Kiosk" [level=1] [ref=e3]:
      - img [ref=e4]
      - text: Dorfladen Kiosk
    - generic [ref=e8]:
      - generic "0 Bestellungen heute" [ref=e9]:
        - img [ref=e10]
      - generic [ref=e27]:
        - generic [ref=e28]: Samstag, 27. Juni 2026
        - generic [ref=e29]: 14:58:32
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
      - generic "3 offen" [ref=e66]: "3"
    - generic [ref=e67] [cursor=pointer]:
      - img [ref=e69]
      - text: Social
  - generic [ref=e76]:
    - generic [ref=e77]:
      - button "Gestern 26.06" [ref=e78] [cursor=pointer]:
        - generic [ref=e79]: Gestern
        - generic [ref=e80]: "26.06"
      - button "Heute 27.06" [active] [ref=e81] [cursor=pointer]:
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
      - button "Offen 2" [ref=e100] [cursor=pointer]:
        - img [ref=e101]
        - generic [ref=e104]: Offen
        - generic [ref=e105]: "2"
      - button "Nachrichten 1" [ref=e106] [cursor=pointer]:
        - img [ref=e107]
        - generic [ref=e109]: Nachrichten
        - generic [ref=e110]: "1"
      - button "Erledigt 2" [ref=e111] [cursor=pointer]:
        - img [ref=e112]
        - generic [ref=e115]: Erledigt
        - generic [ref=e116]: "2"
      - button "Alle 4" [ref=e117] [cursor=pointer]:
        - generic [ref=e118]: Alle
        - generic [ref=e119]: "4"
    - generic [ref=e121]:
      - img [ref=e123]
      - text: Laden…
  - generic [ref=e132]:
    - button "Neue Telefonbestellung" [ref=e133] [cursor=pointer]:
      - img [ref=e134]
      - text: Neue Telefonbestellung
    - button "Küchenliste drucken" [ref=e136] [cursor=pointer]:
      - img [ref=e137]
      - text: Küchenliste drucken
  - generic [ref=e141]: ⚠ TEST-UMGEBUNG – Nicht die Live-Seite!
```

# Test source

```ts
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
  172 |       await expect(btn).toHaveClass(/active/);
  173 | 
  174 |       // "Alle" Zähler = API order count
  175 |       const alleCount = await page.locator('#mt-fc-alle').textContent();
> 176 |       expect(parseInt(alleCount), `Alle-Zähler für ${label}`).toBe(json.orders.length);
      |                                                               ^ Error: Alle-Zähler für Heute27.06
  177 | 
  178 |       if (json.orders.length > 0) {
  179 |         // Ensure "Alle" filter is active to see all orders
  180 |         await page.locator('#mittag-status-bar button[data-mt-filter="alle"]').click();
  181 |         await page.waitForTimeout(300);
  182 |         const visibleOrders = await page.locator('#mittag-orders .k-order').count();
  183 |         expect(visibleOrders, `${label}: Bestellungen rendern`).toBe(json.orders.length);
  184 |       }
  185 |     }
  186 |   });
  187 | });
  188 | 
  189 | // ════════════════════════════════════════════════════
  190 | //  Mittagstisch – Status-Filter
  191 | // ════════════════════════════════════════════════════
  192 | 
  193 | test.describe('Kiosk – Mittagstisch Filter', () => {
  194 | 
  195 |   test('T-17-01 (AK-UI-17b) Default-Filter ist "Offen", Wechsel funktioniert', async ({ page }) => {
  196 |     await page.goto(KIOSK_URL);
  197 |     await page.locator('.k-tab[data-tab="mittag"]').click();
  198 |     await page.waitForTimeout(1000);
  199 |     const activeBtn = page.locator('#mittag-status-bar .k-filter-btn.active');
  200 |     await expect(activeBtn).toHaveCount(1);
  201 |     const text = await activeBtn.textContent();
  202 |     expect(text).toContain('Offen');
  203 |     // Switch to "Alle"
  204 |     await page.locator('#mittag-status-bar .k-filter-btn[data-mt-filter="alle"]').click();
  205 |     const newActive = page.locator('#mittag-status-bar .k-filter-btn.active');
  206 |     const newText = await newActive.textContent();
  207 |     expect(newText).toContain('Alle');
  208 |     // Switch to "Erledigt"
  209 |     await page.locator('#mittag-status-bar .k-filter-btn[data-mt-filter="erledigt"]').click();
  210 |     const erlActive = page.locator('#mittag-status-bar .k-filter-btn.active');
  211 |     const erlText = await erlActive.textContent();
  212 |     expect(erlText).toContain('Erledigt');
  213 |   });
  214 | 
  215 |   test('T-17-02 (AK-UI-17) Genau 4 Filter-Tabs vorhanden', async ({ page }) => {
  216 |     await page.goto(KIOSK_URL);
  217 |     await page.locator('.k-tab[data-tab="mittag"]').click();
  218 |     await page.waitForTimeout(1000);
  219 |     const filterBtns = page.locator('#mittag-status-bar .k-filter-btn');
  220 |     await expect(filterBtns).toHaveCount(4);
  221 |     const labels = await filterBtns.allTextContents();
  222 |     const joined = labels.join(' ');
  223 |     expect(joined).toContain('Offen');
  224 |     expect(joined).toContain('Nachrichten');
  225 |     expect(joined).toContain('Erledigt');
  226 |     expect(joined).toContain('Alle');
  227 |   });
  228 | });
  229 | 
  230 | // ════════════════════════════════════════════════════
  231 | //  Mittagstisch – Bestellschluss (12:00)
  232 | // ════════════════════════════════════════════════════
  233 | 
  234 | test.describe('Kiosk – Bestellschluss', () => {
  235 |   test('T-17-06 (AK-UI-17g) Button hat id btn-new-order und _isMittagCutoff existiert', async ({ page }) => {
  236 |     await page.goto(KIOSK_URL);
  237 |     await page.locator('.k-tab[data-tab="mittag"]').click();
  238 |     await page.waitForTimeout(1000);
  239 |     const btn = page.locator('#btn-new-order');
  240 |     await expect(btn).toHaveCount(1);
  241 |     // _isMittagCutoff function exists
  242 |     const hasFn = await page.evaluate(() => typeof K._isMittagCutoff === 'function' || document.body.innerHTML.includes('_isMittagCutoff'));
  243 |     expect(hasFn).toBe(true);
  244 |   });
  245 | 
  246 |   test('T-17-07 (AK-UI-17h) Button-Zustand passt zur Uhrzeit', async ({ page }) => {
  247 |     await page.goto(KIOSK_URL);
  248 |     await page.locator('.k-tab[data-tab="mittag"]').click();
  249 |     await page.waitForTimeout(1000);
  250 |     const btn = page.locator('#btn-new-order');
  251 |     const hour = new Date().getHours();
  252 |     if (hour >= 12) {
  253 |       // After cutoff: button should be disabled
  254 |       await expect(btn).toBeDisabled();
  255 |       const opacity = await btn.evaluate(el => getComputedStyle(el).opacity);
  256 |       expect(parseFloat(opacity)).toBeLessThan(1);
  257 |     } else {
  258 |       // Before cutoff: button should be enabled
  259 |       await expect(btn).toBeEnabled();
  260 |     }
  261 |   });
  262 | });
  263 | 
  264 | // ════════════════════════════════════════════════════
  265 | //  Shop – Bestellkarten Redesign
  266 | // ════════════════════════════════════════════════════
  267 | 
  268 | test.describe('Kiosk – Shop Redesign', () => {
  269 |   test('T-35-01 (AK-UI-35) Shop-Karten haben Collapse-Pattern', async ({ page }) => {
  270 |     await page.goto(KIOSK_URL);
  271 |     await page.locator('.k-tab[data-tab="abhol"]').click();
  272 |     await page.waitForTimeout(2000);
  273 |     // Cards should have k-order-hdr (collapsible header) and k-order-body
  274 |     const cards = page.locator('#abhol-orders .k-order');
  275 |     const count = await cards.count();
  276 |     if (count > 0) {
```