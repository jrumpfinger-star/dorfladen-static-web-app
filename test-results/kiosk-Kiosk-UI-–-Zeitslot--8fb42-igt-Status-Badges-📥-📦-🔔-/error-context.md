# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.js >> Kiosk UI – Zeitslot-Gruppen >> AK-UI-03b: Slot-Header zeigt Status-Badges (📥/📦/🔔)
- Location: tests\kiosk.spec.js:232:3

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
    - heading "Dorfladen Kiosk" [level=1] [ref=e3]:
      - img [ref=e4]
      - text: Dorfladen Kiosk
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: Sonntag, 21. Juni 2026
        - generic [ref=e11]: 23:02:47
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
  204 | // ════════════════════════════════════════════════════
  205 | //  AK-UI: Zeitslot-Gruppen (specs/kiosk-ui.md)
  206 | // ════════════════════════════════════════════════════
  207 | 
  208 | test.describe('Kiosk UI – Zeitslot-Gruppen', () => {
  209 | 
  210 |   test('AK-UI-03 + AK-UI-04: Slot-Gruppen default collapsed, klappbar', async ({ page }) => {
  211 |     await page.goto(KIOSK_URL);
  212 |     await page.locator('.k-tab[data-tab="abhol"]').click();
  213 |     await page.waitForTimeout(2000);
  214 |     const headers = page.locator('.k-slot-header');
  215 |     const count = await headers.count();
  216 |     if (count === 0) {
  217 |       test.skip(true, 'Keine Bestellungen vorhanden – Slot-Gruppen nicht testbar');
  218 |       return;
  219 |     }
  220 |     const firstHeader = headers.first();
  221 |     const group = firstHeader.locator('..');
  222 |     // Default: collapsed
  223 |     await expect(group).toHaveClass(/collapsed/);
  224 |     // Click to expand
  225 |     await firstHeader.click();
  226 |     await expect(group).not.toHaveClass(/collapsed/);
  227 |     // Click again to collapse
  228 |     await firstHeader.click();
  229 |     await expect(group).toHaveClass(/collapsed/);
  230 |   });
  231 | 
  232 |   test('AK-UI-03b: Slot-Header zeigt Status-Badges (📥/📦/🔔)', async ({ page }) => {
  233 |     await page.goto(KIOSK_URL);
  234 |     await page.locator('.k-tab[data-tab="abhol"]').click();
  235 |     await page.waitForTimeout(2000);
  236 |     const counts = page.locator('.k-slot-count');
  237 |     if (await counts.count() === 0) {
  238 |       test.skip(true, 'Keine Slot-Gruppen vorhanden');
  239 |       return;
  240 |     }
  241 |     const firstCount = await counts.first().textContent();
  242 |     // Should contain status icons or "Bestellung(en)"
  243 |     const hasStatusBadges = firstCount.includes('📥') || firstCount.includes('📦') || firstCount.includes('🔔') || firstCount.includes('Bestellung');
> 244 |     expect(hasStatusBadges).toBe(true);
      |                             ^ Error: expect(received).toBe(expected) // Object.is equality
  245 |   });
  246 | });
  247 | 
  248 | // ════════════════════════════════════════════════════
  249 | //  AK-PK: Kiosk Packing (specs/kiosk-packing.md)
  250 | // ════════════════════════════════════════════════════
  251 | 
  252 | test.describe('Kiosk Packing – Modal', () => {
  253 | 
  254 |   test('AK-PK-01: Pack-Modal öffnet inline, keine Navigation', async ({ page }) => {
  255 |     await page.goto(KIOSK_URL);
  256 |     await page.locator('.k-tab[data-tab="abhol"]').click();
  257 |     await page.waitForTimeout(2000);
  258 |     // Find a "Packen" button
  259 |     const packBtn = page.locator('button[onclick*="openPackModal"]').first();
  260 |     if (await packBtn.count() === 0) {
  261 |       test.skip(true, 'Keine packbare Bestellung vorhanden (Status 1 nötig)');
  262 |       return;
  263 |     }
  264 |     await packBtn.click();
  265 |     // Should stay on same page, modal visible
  266 |     expect(page.url()).toContain('/kiosk');
  267 |     await expect(page.locator('#modal-pack')).toBeVisible({ timeout: 10000 });
  268 |   });
  269 | 
  270 |   test('AK-PK-01b: Pack-Modal hat Schließen-Button', async ({ page }) => {
  271 |     await page.goto(KIOSK_URL);
  272 |     await page.locator('.k-tab[data-tab="abhol"]').click();
  273 |     await page.waitForTimeout(2000);
  274 |     const packBtn = page.locator('button[onclick*="openPackModal"]').first();
  275 |     if (await packBtn.count() === 0) {
  276 |       test.skip(true, 'Keine packbare Bestellung vorhanden (Status 1 nötig)');
  277 |       return;
  278 |     }
  279 |     await packBtn.click();
  280 |     await expect(page.locator('#modal-pack')).toBeVisible({ timeout: 10000 });
  281 |     // Close it
  282 |     await page.locator('#modal-pack .k-modal-close').click();
  283 |     await expect(page.locator('#modal-pack')).not.toBeVisible();
  284 |   });
  285 | });
  286 | 
  287 | test.describe('Kiosk Packing – Funktionalität', () => {
  288 | 
  289 |   test('AK-PK-02: Pack-Items haben Checkboxen', async ({ page }) => {
  290 |     await page.goto(KIOSK_URL);
  291 |     await page.locator('.k-tab[data-tab="abhol"]').click();
  292 |     await page.waitForTimeout(2000);
  293 |     const packBtn = page.locator('button[onclick*="openPackModal"]').first();
  294 |     if (await packBtn.count() === 0) {
  295 |       test.skip(true, 'Keine packbare Bestellung vorhanden (Status 1 nötig)');
  296 |       return;
  297 |     }
  298 |     await packBtn.click();
  299 |     await page.waitForSelector('.pk-item', { timeout: 15000 });
  300 |     const checkboxes = page.locator('.pk-item input[type="checkbox"]');
  301 |     expect(await checkboxes.count()).toBeGreaterThan(0);
  302 |   });
  303 | 
  304 |   test('AK-PK-03: Pack-Items haben Mengen-Eingabefelder', async ({ page }) => {
  305 |     await page.goto(KIOSK_URL);
  306 |     await page.locator('.k-tab[data-tab="abhol"]').click();
  307 |     await page.waitForTimeout(2000);
  308 |     const packBtn = page.locator('button[onclick*="openPackModal"]').first();
  309 |     if (await packBtn.count() === 0) {
  310 |       test.skip(true, 'Keine packbare Bestellung vorhanden (Status 1 nötig)');
  311 |       return;
  312 |     }
  313 |     await packBtn.click();
  314 |     await page.waitForSelector('.pk-item', { timeout: 15000 });
  315 |     const qtyInputs = page.locator('.pk-item input[type="number"]');
  316 |     expect(await qtyInputs.count()).toBeGreaterThan(0);
  317 |   });
  318 | 
  319 |   test('AK-PK-04: Beipackzettel-Button vorhanden', async ({ page }) => {
  320 |     await page.goto(KIOSK_URL);
  321 |     await page.locator('.k-tab[data-tab="abhol"]').click();
  322 |     await page.waitForTimeout(2000);
  323 |     const packBtn = page.locator('button[onclick*="openPackModal"]').first();
  324 |     if (await packBtn.count() === 0) {
  325 |       test.skip(true, 'Keine packbare Bestellung vorhanden (Status 1 nötig)');
  326 |       return;
  327 |     }
  328 |     await packBtn.click();
  329 |     await expect(page.locator('#modal-pack')).toBeVisible({ timeout: 10000 });
  330 |     const printBtn = page.locator('#modal-pack button:has-text("Beipackzettel")');
  331 |     await expect(printBtn).toBeVisible();
  332 |   });
  333 | 
  334 |   test('AK-PK-06: Abholbereit-Button vorhanden', async ({ page }) => {
  335 |     await page.goto(KIOSK_URL);
  336 |     await page.locator('.k-tab[data-tab="abhol"]').click();
  337 |     await page.waitForTimeout(2000);
  338 |     const packBtn = page.locator('button[onclick*="openPackModal"]').first();
  339 |     if (await packBtn.count() === 0) {
  340 |       test.skip(true, 'Keine packbare Bestellung vorhanden (Status 1 nötig)');
  341 |       return;
  342 |     }
  343 |     await packBtn.click();
  344 |     await expect(page.locator('#modal-pack')).toBeVisible({ timeout: 10000 });
```