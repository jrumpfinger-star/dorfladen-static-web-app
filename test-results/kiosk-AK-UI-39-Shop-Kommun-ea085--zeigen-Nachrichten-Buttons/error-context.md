# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.js >> AK-UI-39 Shop-Kommunikation >> T-39-01 Shop-Karten zeigen Nachrichten-Buttons
- Location: tests\kiosk.spec.js:972:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('.k-order[id^="soc-"]').first().locator('.k-order-hdr')
    - locator resolved to <div class="k-order-hdr" onclick="K.toggleShopCard('6955ff3e-dc70-f111-ab0e-0022485bb979')">…</div>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
      - waiting 100ms
    51 × waiting for element to be visible, enabled and stable
       - element is not visible
     - retrying click action
       - waiting 500ms
    - waiting for element to be visible, enabled and stable
  - element was detached from the DOM, retrying
    - locator resolved to <div class="k-order-hdr" onclick="K.toggleShopCard('6955ff3e-dc70-f111-ab0e-0022485bb979')">…</div>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
      - waiting 100ms
    56 × waiting for element to be visible, enabled and stable
       - element is not visible
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - heading "Dorfladen Kiosk" [level=1] [ref=e3]:
      - img [ref=e4]
      - text: Dorfladen Kiosk
    - generic [ref=e8]:
      - generic "0 Bestellungen heute" [ref=e9]:
        - img [ref=e10]
      - generic [ref=e27]:
        - generic [ref=e28]: Samstag, 27. Juni 2026
        - generic [ref=e29]: 16:18:51
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
      - generic "7 offen" [ref=e66]: "7"
    - generic [ref=e67] [cursor=pointer]:
      - img [ref=e69]
      - text: Social
  - generic [ref=e76]:
    - generic [ref=e77]:
      - button "Zu erledigen 1" [ref=e78] [cursor=pointer]:
        - img [ref=e79]
        - generic [ref=e83]: Zu erledigen
        - generic [ref=e84]: "1"
      - button "Heute abholen 1" [ref=e85] [cursor=pointer]:
        - img [ref=e86]
        - generic [ref=e88]: Heute abholen
        - generic [ref=e89]: "1"
      - button "Überfällig 1" [ref=e90] [cursor=pointer]:
        - img [ref=e91]
        - generic [ref=e93]: Überfällig
        - generic [ref=e94]: "1"
      - button "Historie 26" [ref=e95] [cursor=pointer]:
        - img [ref=e96]
        - generic [ref=e100]: Historie
        - generic [ref=e101]: "26"
    - generic [ref=e102]:
      - generic [ref=e103]:
        - generic [ref=e104]: "1"
        - generic [ref=e105]: Warten
      - generic [ref=e106]:
        - generic [ref=e107]: "1"
        - generic [ref=e108]: Überfällig
    - generic [ref=e111] [cursor=pointer]:
      - generic [ref=e112]: ▼
      - text: Heute · Vormittag (08:00–13:00)
      - generic [ref=e114]:
        - img [ref=e115]
        - text: 1 Warten
  - generic [ref=e118]: ⚠ TEST-UMGEBUNG – Nicht die Live-Seite!
```

# Test source

```ts
  887  | // ═══════════════════════════════════════════════════
  888  | 
  889  | test.describe('AK-UI-37 – Historie-Filter', () => {
  890  |   test('T-37-01: Historie-Tab zeigt Sub-Filter-Bar', async ({ page }) => {
  891  |     await page.goto(KIOSK_URL);
  892  |     await page.waitForLoadState('networkidle');
  893  | 
  894  |     // Sub-filter bar should be hidden initially
  895  |     await expect(page.locator('#hist-bar')).not.toHaveClass(/show/);
  896  | 
  897  |     // Click Historie tab
  898  |     await page.click('[data-filter="history"]');
  899  |     await page.waitForTimeout(300);
  900  | 
  901  |     // Sub-filter bar should now be visible
  902  |     await expect(page.locator('#hist-bar')).toHaveClass(/show/);
  903  | 
  904  |     // Should have time range pills
  905  |     await expect(page.locator('[data-range="7"]')).toBeVisible();
  906  |     await expect(page.locator('[data-range="30"]')).toBeVisible();
  907  |     await expect(page.locator('[data-range="all"]')).toBeVisible();
  908  | 
  909  |     // Should have status pills
  910  |     await expect(page.locator('[data-hstatus="all"]')).toBeVisible();
  911  |     await expect(page.locator('[data-hstatus="3"]')).toBeVisible();
  912  |     await expect(page.locator('[data-hstatus="4"]')).toBeVisible();
  913  |   });
  914  | 
  915  |   test('T-37-02: Wechsel zu anderem Filter versteckt Sub-Bar', async ({ page }) => {
  916  |     await page.goto(KIOSK_URL);
  917  |     await page.waitForLoadState('networkidle');
  918  | 
  919  |     // Activate history
  920  |     await page.click('[data-filter="history"]');
  921  |     await page.waitForTimeout(200);
  922  |     await expect(page.locator('#hist-bar')).toHaveClass(/show/);
  923  | 
  924  |     // Switch to "Zu erledigen"
  925  |     await page.click('[data-filter="open"]');
  926  |     await page.waitForTimeout(200);
  927  | 
  928  |     // Sub-filter bar should be hidden again
  929  |     await expect(page.locator('#hist-bar')).not.toHaveClass(/show/);
  930  |   });
  931  | 
  932  |   test('T-37-03: Zeitraum-Pills wechseln aktiven Zustand', async ({ page }) => {
  933  |     await page.goto(KIOSK_URL);
  934  |     await page.waitForLoadState('networkidle');
  935  | 
  936  |     await page.click('[data-filter="history"]');
  937  |     await page.waitForTimeout(200);
  938  | 
  939  |     // Default: "7 Tage" active
  940  |     await expect(page.locator('[data-range="7"]')).toHaveClass(/active/);
  941  |     await expect(page.locator('[data-range="30"]')).not.toHaveClass(/active/);
  942  | 
  943  |     // Click "30 Tage"
  944  |     await page.click('[data-range="30"]');
  945  |     await page.waitForTimeout(200);
  946  | 
  947  |     await expect(page.locator('[data-range="30"]')).toHaveClass(/active/);
  948  |     await expect(page.locator('[data-range="7"]')).not.toHaveClass(/active/);
  949  |   });
  950  | 
  951  |   test('T-37-04: Status-Pills wechseln aktiven Zustand', async ({ page }) => {
  952  |     await page.goto(KIOSK_URL);
  953  |     await page.waitForLoadState('networkidle');
  954  | 
  955  |     await page.click('[data-filter="history"]');
  956  |     await page.waitForTimeout(200);
  957  | 
  958  |     // Default: "Alle" status active
  959  |     await expect(page.locator('[data-hstatus="all"]')).toHaveClass(/active/);
  960  | 
  961  |     // Click "Abgeholt"
  962  |     await page.click('[data-hstatus="3"]');
  963  |     await page.waitForTimeout(200);
  964  | 
  965  |     await expect(page.locator('[data-hstatus="3"]')).toHaveClass(/active/);
  966  |     await expect(page.locator('[data-hstatus="all"]')).not.toHaveClass(/active/);
  967  |   });
  968  | });
  969  | 
  970  | // ─── AK-UI-39: Shop-Kommunikation ──────────────────────────────
  971  | test.describe('AK-UI-39 Shop-Kommunikation', () => {
  972  |   test('T-39-01 Shop-Karten zeigen Nachrichten-Buttons', async ({ page }) => {
  973  |     await page.goto(KIOSK_URL);
  974  |     await page.waitForTimeout(2000);
  975  |     // Switch to Shop tab
  976  |     await page.click('[data-tab="abhol"]');
  977  |     await page.waitForTimeout(1500);
  978  | 
  979  |     // Find any shop card and expand it
  980  |     const shopCards = page.locator('.k-order[id^="soc-"]');
  981  |     const count = await shopCards.count();
  982  |     if (count === 0) {
  983  |       test.skip();
  984  |       return;
  985  |     }
  986  |     // Click first card header to expand
> 987  |     await shopCards.first().locator('.k-order-hdr').click();
       |                                                     ^ Error: locator.click: Test timeout of 60000ms exceeded.
  988  |     await page.waitForTimeout(300);
  989  | 
  990  |     // Check that "Antworten" or "Nachricht senden" button exists in the expanded body
  991  |     const replyBtn = shopCards.first().locator('button:has-text("Antworten"), button:has-text("Nachricht senden")');
  992  |     const btnCount = await replyBtn.count();
  993  |     expect(btnCount).toBeGreaterThanOrEqual(0); // Button may not exist for completed/cancelled orders
  994  |   });
  995  | 
  996  |   test('T-39-02 Shop-Antwort-Dialog öffnet sich', async ({ page }) => {
  997  |     await page.goto(KIOSK_URL);
  998  |     await page.waitForTimeout(2000);
  999  |     await page.click('[data-tab="abhol"]');
  1000 |     await page.waitForTimeout(1500);
  1001 | 
  1002 |     const shopCards = page.locator('.k-order[id^="soc-"]:not([data-ostatus="3"]):not([data-ostatus="4"])');
  1003 |     const count = await shopCards.count();
  1004 |     if (count === 0) {
  1005 |       test.skip();
  1006 |       return;
  1007 |     }
  1008 |     // Expand first active card
  1009 |     await shopCards.first().locator('.k-order-hdr').click();
  1010 |     await page.waitForTimeout(300);
  1011 | 
  1012 |     // Click reply/message button
  1013 |     const msgBtn = shopCards.first().locator('button:has-text("Antworten"), button:has-text("Nachricht senden")');
  1014 |     if (await msgBtn.count() > 0) {
  1015 |       await msgBtn.first().click();
  1016 |       await page.waitForTimeout(300);
  1017 |       // Check that reply input is visible
  1018 |       const replyInput = shopCards.first().locator('input[placeholder*="Antwort an Kunden"]');
  1019 |       await expect(replyInput).toBeVisible();
  1020 |       // Check send button
  1021 |       const sendBtn = shopCards.first().locator('button:has-text("Senden")');
  1022 |       await expect(sendBtn.first()).toBeVisible();
  1023 |     }
  1024 |   });
  1025 | 
  1026 |   test('T-39-03 NEU-Badge bei ungelesener Nachricht sichtbar', async ({ page }) => {
  1027 |     await page.goto(KIOSK_URL);
  1028 |     await page.waitForTimeout(2000);
  1029 |     await page.click('[data-tab="abhol"]');
  1030 |     await page.waitForTimeout(1500);
  1031 | 
  1032 |     // Check if any card has a NEU badge (depends on live data)
  1033 |     const neuBadge = page.locator('.k-order[id^="soc-"] .k-order-hdr >> text=NEU');
  1034 |     const badgeCount = await neuBadge.count();
  1035 |     // This is a data-dependent test - just verify the page rendered correctly
  1036 |     expect(badgeCount).toBeGreaterThanOrEqual(0);
  1037 |   });
  1038 | 
  1039 |   test('T-39-04 Kunden-Nachricht und Antwort werden angezeigt', async ({ page }) => {
  1040 |     await page.goto(KIOSK_URL);
  1041 |     await page.waitForTimeout(2000);
  1042 |     await page.click('[data-tab="abhol"]');
  1043 |     await page.waitForTimeout(1500);
  1044 | 
  1045 |     const shopCards = page.locator('.k-order[id^="soc-"]');
  1046 |     const count = await shopCards.count();
  1047 |     if (count === 0) {
  1048 |       test.skip();
  1049 |       return;
  1050 |     }
  1051 |     // Expand first card
  1052 |     await shopCards.first().locator('.k-order-hdr').click();
  1053 |     await page.waitForTimeout(300);
  1054 | 
  1055 |     // Check for message elements (may or may not have messages depending on data)
  1056 |     const kundeMsg = shopCards.first().locator('text=Kunde:');
  1057 |     const antwortMsg = shopCards.first().locator('text=Antwort:');
  1058 |     // Both are data-dependent, just ensure no JS errors
  1059 |     const kundeCount = await kundeMsg.count();
  1060 |     const antwortCount = await antwortMsg.count();
  1061 |     expect(kundeCount).toBeGreaterThanOrEqual(0);
  1062 |     expect(antwortCount).toBeGreaterThanOrEqual(0);
  1063 |   });
  1064 | });
  1065 | 
  1066 | // ─── AK-UI-40: Stammkunden klappbare Karten ──────────────────────
  1067 | test.describe('AK-UI-40 Stammkunden klappbare Karten', () => {
  1068 |   test('T-40-01 Stammkunden-Karten haben klappbaren Header', async ({ page }) => {
  1069 |     await page.goto(KIOSK_URL);
  1070 |     await page.waitForTimeout(2000);
  1071 |     await page.click('[data-tab="kunden"]');
  1072 |     await page.waitForTimeout(500);
  1073 | 
  1074 |     // Load all customers
  1075 |     await page.click('button:has-text("Alle Kunden laden")');
  1076 |     await page.waitForTimeout(2000);
  1077 | 
  1078 |     // Check for collapsible cards with kc- prefix
  1079 |     const kundenCards = page.locator('.k-order[id^="kc-"]');
  1080 |     const count = await kundenCards.count();
  1081 |     if (count === 0) {
  1082 |       test.skip();
  1083 |       return;
  1084 |     }
  1085 | 
  1086 |     // Cards should have k-order-hdr
  1087 |     const header = kundenCards.first().locator('.k-order-hdr');
```