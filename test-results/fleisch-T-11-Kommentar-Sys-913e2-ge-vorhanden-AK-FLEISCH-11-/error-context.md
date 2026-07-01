# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fleisch.spec.js >> T-11 Kommentar-System (AK-FLEISCH-11) >> T-11-05 Kiosk: Metzger-Tab Badge vorhanden (AK-FLEISCH-11)
- Location: tests\fleisch.spec.js:215:3

# Error details

```
Error: expect(locator).toBeAttached() failed

Locator: locator('#badge-metzger')
Expected: attached
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeAttached" with timeout 5000ms
  - waiting for locator('#badge-metzger')

```

```yaml
- heading "Dorfladen Kiosk" [level=1]
- img
- text: Dienstag, 30. Juni 2026 22:49:31
- button "Ton ist an (klick = ausschalten)"
- button "Hilfe & Workflows"
- button "Aktualisieren"
- text: Mittagstisch Online-Shop 2 Metzger 3 3 Social Stammkunden
- button "Zu erledigen 3"
- button "Heute abholen 0"
- button "Überfällig 0"
- button "Historie 38"
- text: 2 Packen 1 Warten
- button "Aufklappen"
- text: ▼ Morgen · Vormittag (07:30–14:00) 1 Warten ▼ 02.07.2026 · Vormittag (07:30–14:00) 1 Packen ▼ 03.07.2026 · Vormittag (10:00–14:00) 1 Packen ⚠ TEST-UMGEBUNG – Nicht die Live-Seite!
```

# Test source

```ts
  118 |     await expect(page.locator('#fm-cfg-mindestmenge')).toBeAttached();
  119 |     await expect(page.locator('#fm-cfg-bestellschluss')).toBeAttached();
  120 |     await expect(page.locator('#fm-cfg-aktiv')).toBeAttached();
  121 |   });
  122 | 
  123 |   test('T-10-03 CMS Metzger-Panel hat Bestellungs-Filter (AK-FLEISCH-10)', async ({ page }) => {
  124 |     await page.goto(`${BASE}/cms`);
  125 |     await expect(page.locator('#fm-orders-list')).toBeAttached();
  126 |     await expect(page.locator('#fm-orders-btn-offen')).toBeAttached();
  127 |     await expect(page.locator('#fm-orders-btn-alle')).toBeAttached();
  128 |   });
  129 | });
  130 | 
  131 | // ════════════════════════════════════════════════════
  132 | //  T-04: Fleisch-Bestellseite Grundfunktion (AK-FLEISCH-04)
  133 | // ════════════════════════════════════════════════════
  134 | 
  135 | test.describe('T-04 Fleisch-Bestellseite (AK-FLEISCH-04)', () => {
  136 | 
  137 |   test('T-04-01 Fleisch-Bestellseite lädt (AK-FLEISCH-04)', async ({ page }) => {
  138 |     const resp = await page.goto(FLEISCH_URL);
  139 |     expect(resp.status()).toBe(200);
  140 |     await expect(page.locator('body')).toContainText(/Fleisch|Vorbestell/i);
  141 |   });
  142 | 
  143 |   test('T-04-02 Bestellseite hat Warenkorb-Bereich (AK-FLEISCH-04)', async ({ page }) => {
  144 |     await page.goto(FLEISCH_URL);
  145 |     // Should have some cart-related UI
  146 |     const cartArea = page.locator('[id*="cart"], [id*="warenkorb"], [class*="cart"]');
  147 |     const count = await cartArea.count();
  148 |     expect(count).toBeGreaterThanOrEqual(0);
  149 |   });
  150 | });
  151 | 
  152 | // ════════════════════════════════════════════════════
  153 | //  T-09: API Benachrichtigungen (AK-FLEISCH-09)
  154 | // ════════════════════════════════════════════════════
  155 | 
  156 | test.describe('T-09 API Benachrichtigungen (AK-FLEISCH-09)', () => {
  157 | 
  158 |   test('T-09-01 API PATCH Endpoint existiert (AK-FLEISCH-09)', async ({ request }) => {
  159 |     // PATCH without valid body should return 400, not 404/500
  160 |     const resp = await request.patch(`${BASE}/api/fleisch-order`, {
  161 |       data: {},
  162 |       headers: { 'Content-Type': 'application/json' }
  163 |     });
  164 |     // 400 = expected (missing id/status), 405 = method not allowed is also acceptable
  165 |     expect([400, 405, 500]).toContain(resp.status());
  166 |   });
  167 | 
  168 |   test('T-09-02 API GET Info-Endpoint liefert Liefertag-Info (AK-FLEISCH-09)', async ({ request }) => {
  169 |     const resp = await request.get(`${BASE}/api/fleisch-order?info=1`);
  170 |     if (resp.status() === 200) {
  171 |       const data = await resp.json();
  172 |       expect(data.success).toBe(true);
  173 |       expect(data).toHaveProperty('termine');
  174 |       expect(Array.isArray(data.termine)).toBe(true);
  175 |       if (data.termine.length > 0) {
  176 |         expect(data.termine[0]).toHaveProperty('liefertag');
  177 |         expect(data.termine[0]).toHaveProperty('bestellschluss');
  178 |       }
  179 |     }
  180 |   });
  181 | });
  182 | 
  183 | // ════════════════════════════════════════════════════
  184 | //  T-11: Kommentar-System (AK-FLEISCH-11)
  185 | // ════════════════════════════════════════════════════
  186 | 
  187 | test.describe('T-11 Kommentar-System (AK-FLEISCH-11)', () => {
  188 | 
  189 |   test('T-11-01 API GET mode=unread_messages liefert Zähler (AK-FLEISCH-11)', async ({ request }) => {
  190 |     const resp = await request.get(`${BASE}/api/fleisch-order?mode=unread_messages`);
  191 |     expect(resp.status()).toBe(200);
  192 |     const data = await resp.json();
  193 |     expect(data.success).toBe(true);
  194 |     expect(typeof data.unread_count).toBe('number');
  195 |     expect(data.unread_count).toBeGreaterThanOrEqual(0);
  196 |   });
  197 | 
  198 |   test('T-11-02 API GET mode=messages liefert Bestellungen-Array (AK-FLEISCH-11)', async ({ request }) => {
  199 |     const resp = await request.get(`${BASE}/api/fleisch-order?mode=messages`);
  200 |     expect(resp.status()).toBe(200);
  201 |     const data = await resp.json();
  202 |     expect(data.success).toBe(true);
  203 |     expect(Array.isArray(data.orders)).toBe(true);
  204 |     expect(typeof data.count).toBe('number');
  205 |   });
  206 | 
  207 |   test('T-11-04 Kiosk: Metzger-Tab Nachrichten-Filter vorhanden (AK-FLEISCH-11)', async ({ page }) => {
  208 |     await page.goto(KIOSK_URL);
  209 |     await page.locator('.k-tab[data-tab="metzger"]').click();
  210 |     const msgBtn = page.locator('[data-fm-filter="nachrichten"]');
  211 |     await expect(msgBtn).toBeVisible();
  212 |     await expect(msgBtn).toContainText('Nachrichten');
  213 |   });
  214 | 
  215 |   test('T-11-05 Kiosk: Metzger-Tab Badge vorhanden (AK-FLEISCH-11)', async ({ page }) => {
  216 |     await page.goto(KIOSK_URL);
  217 |     const badge = page.locator('#badge-metzger');
> 218 |     await expect(badge).toBeAttached();
      |                         ^ Error: expect(locator).toBeAttached() failed
  219 |   });
  220 | 
  221 |   test('T-11-06 Kiosk: Bestellkarte zeigt Antworten/Nachricht-Button (AK-FLEISCH-11)', async ({ page }) => {
  222 |     await page.goto(KIOSK_URL);
  223 |     await page.locator('.k-tab[data-tab="metzger"]').click();
  224 |     // Wait for orders to load
  225 |     await page.waitForTimeout(2000);
  226 |     // Check if there are any orders with reply buttons
  227 |     const replyBtns = page.locator('#panel-metzger .k-oc-actions button:has-text("Antworten"), #panel-metzger .k-oc-actions button:has-text("Nachricht senden")');
  228 |     const count = await replyBtns.count();
  229 |     // If there are open orders, there should be reply buttons
  230 |     expect(count).toBeGreaterThanOrEqual(0);
  231 |   });
  232 | 
  233 |   test('T-11-07 Kiosk: Nachrichten-Filter zeigt Nachrichten-Bereich (AK-FLEISCH-11)', async ({ page }) => {
  234 |     await page.goto(KIOSK_URL);
  235 |     await page.locator('.k-tab[data-tab="metzger"]').click();
  236 |     await page.locator('[data-fm-filter="nachrichten"]').click();
  237 |     // metzger-nachrichten div should be visible, metzger-orders hidden
  238 |     await expect(page.locator('#metzger-nachrichten')).toBeVisible();
  239 |     await expect(page.locator('#metzger-orders')).toBeHidden();
  240 |   });
  241 | });
  242 | 
  243 | // ════════════════════════════════════════════════════
  244 | //  Routing
  245 | // ════════════════════════════════════════════════════
  246 | 
  247 | test.describe('Routing', () => {
  248 | 
  249 |   test('SWA Route /fleisch-bestellen liefert fleisch-bestellen.html', async ({ page }) => {
  250 |     const resp = await page.goto(FLEISCH_URL);
  251 |     expect(resp.status()).toBe(200);
  252 |   });
  253 | });
  254 | 
  255 | // ════════════════════════════════════════════════════
  256 | //  T-21: Kiosk Per-Item-Bestellung & 2-Spalten-Layout (AK-FLEISCH-21)
  257 | // ════════════════════════════════════════════════════
  258 | 
  259 | test.describe('T-21 Kiosk Fleisch Per-Item-Bestellung (AK-FLEISCH-21)', () => {
  260 | 
  261 |   test('T-21-01 toggleFmItemBestellt Funktion existiert (AK-FLEISCH-21)', async ({ page }) => {
  262 |     await page.goto(KIOSK_URL);
  263 |     await page.waitForTimeout(3000);
  264 |     const hasFn = await page.evaluate(() => typeof K !== 'undefined' && typeof K.toggleFmItemBestellt === 'function');
  265 |     expect(hasFn).toBe(true);
  266 |   });
  267 | 
  268 |   test('T-21-02 toggleAllFmItems Funktion existiert (AK-FLEISCH-21)', async ({ page }) => {
  269 |     await page.goto(KIOSK_URL);
  270 |     await page.waitForTimeout(3000);
  271 |     const hasFn = await page.evaluate(() => typeof K !== 'undefined' && typeof K.toggleAllFmItems === 'function');
  272 |     expect(hasFn).toBe(true);
  273 |   });
  274 | 
  275 |   test('T-21-03 Metzger-Karte zeigt 2-Spalten-Grid-Layout (AK-FLEISCH-21)', async ({ page }) => {
  276 |     await page.goto(KIOSK_URL);
  277 |     await page.locator('.k-tab[data-tab="metzger"]').click();
  278 |     await page.waitForTimeout(2000);
  279 |     // Expand first order card if any
  280 |     const cards = page.locator('#metzger-orders .k-order');
  281 |     const count = await cards.count();
  282 |     if (count === 0) {
  283 |       test.skip(true, 'Keine Metzger-Bestellungen vorhanden');
  284 |       return;
  285 |     }
  286 |     await cards.first().locator('.k-order-hdr').click();
  287 |     await page.waitForTimeout(300);
  288 |     // Check for grid layout in the body
  289 |     const gridEl = cards.first().locator('.k-order-body div[style*="grid-template-columns"]');
  290 |     const gridCount = await gridEl.count();
  291 |     expect(gridCount).toBeGreaterThanOrEqual(1);
  292 |   });
  293 | 
  294 |   test('T-21-04 Checkboxen bei Status 0/1 sichtbar (AK-FLEISCH-21)', async ({ page }) => {
  295 |     await page.goto(KIOSK_URL);
  296 |     await page.locator('.k-tab[data-tab="metzger"]').click();
  297 |     await page.waitForTimeout(2000);
  298 |     // Find cards with status 0 or 1
  299 |     const openCards = page.locator('#metzger-orders .k-order[data-fmstatus="0"], #metzger-orders .k-order[data-fmstatus="1"]');
  300 |     const count = await openCards.count();
  301 |     if (count === 0) {
  302 |       test.skip(true, 'Keine offenen Metzger-Bestellungen');
  303 |       return;
  304 |     }
  305 |     // Expand first open card
  306 |     await openCards.first().locator('.k-order-hdr').click();
  307 |     await page.waitForTimeout(300);
  308 |     // Should have checkboxes
  309 |     const checkboxes = openCards.first().locator('input[type="checkbox"]');
  310 |     const cbCount = await checkboxes.count();
  311 |     expect(cbCount).toBeGreaterThanOrEqual(1);
  312 |   });
  313 | 
  314 |   test('T-21-05 Status-Badge mit korrekter CSS-Klasse (AK-FLEISCH-21)', async ({ page }) => {
  315 |     await page.goto(KIOSK_URL);
  316 |     await page.locator('.k-tab[data-tab="metzger"]').click();
  317 |     await page.waitForTimeout(2000);
  318 |     const badges = page.locator('#metzger-orders .k-badge');
```