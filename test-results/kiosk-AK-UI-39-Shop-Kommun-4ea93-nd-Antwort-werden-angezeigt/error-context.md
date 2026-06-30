# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.js >> AK-UI-39 Shop-Kommunikation >> T-39-04 Kunden-Nachricht und Antwort werden angezeigt
- Location: tests\kiosk.spec.js:1035:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('.k-order[id^="soc-"]').first().locator('.k-order-hdr')
    - locator resolved to <div class="k-order-hdr" onclick="K.toggleShopCard('fa2c5649-cd73-f111-ab0d-70a8a5189aae')">…</div>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
      - waiting 100ms
    49 × waiting for element to be visible, enabled and stable
       - element is not visible
     - retrying click action
       - waiting 500ms
    - waiting for element to be visible, enabled and stable
  - element was detached from the DOM, retrying
    - locator resolved to <div class="k-order-hdr" onclick="K.toggleShopCard('fa2c5649-cd73-f111-ab0d-70a8a5189aae')">…</div>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
      - waiting 100ms
    54 × waiting for element to be visible, enabled and stable
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
        - generic [ref=e28]: Dienstag, 30. Juni 2026
        - generic [ref=e29]: 10:25:50
      - button "Hilfe & Workflows" [ref=e30] [cursor=pointer]:
        - img [ref=e31]
      - button "Aktualisieren" [ref=e34] [cursor=pointer]:
        - img [ref=e35]
  - generic [ref=e40]:
    - generic [ref=e41] [cursor=pointer]:
      - img [ref=e43]
      - text: Mittagstisch
    - generic [ref=e46] [cursor=pointer]:
      - img [ref=e48]
      - text: Online-Shop
      - generic "1 zu packen" [ref=e53]: "1"
    - generic [ref=e54] [cursor=pointer]:
      - img [ref=e56]
      - text: Stammkunden
    - generic [ref=e61] [cursor=pointer]:
      - img [ref=e63]
      - text: Metzger
      - generic [ref=e67]:
        - generic "1 neue Bestellung" [ref=e68]: "1"
        - generic "3 beim Metzger" [ref=e69]: "3"
    - generic [ref=e70] [cursor=pointer]:
      - img [ref=e72]
      - text: Social
  - generic [ref=e79]:
    - generic [ref=e80]:
      - button "Zu erledigen 2" [ref=e81] [cursor=pointer]:
        - img [ref=e82]
        - generic [ref=e86]: Zu erledigen
        - generic [ref=e87]: "2"
      - button "Heute abholen 1" [ref=e88] [cursor=pointer]:
        - img [ref=e89]
        - generic [ref=e91]: Heute abholen
        - generic [ref=e92]: "1"
      - button "Überfällig 0" [ref=e93] [cursor=pointer]:
        - img [ref=e94]
        - generic [ref=e96]: Überfällig
        - generic [ref=e97]: "0"
      - button "Historie 36" [ref=e98] [cursor=pointer]:
        - img [ref=e99]
        - generic [ref=e103]: Historie
        - generic [ref=e104]: "36"
    - generic [ref=e105]:
      - generic [ref=e106]:
        - generic [ref=e107]: "1"
        - generic [ref=e108]: Packen
      - generic [ref=e109]:
        - generic [ref=e110]: "1"
        - generic [ref=e111]: Warten
    - generic [ref=e112]:
      - button "Aufklappen" [ref=e114] [cursor=pointer]:
        - img [ref=e115]
        - text: Aufklappen
      - generic [ref=e119] [cursor=pointer]:
        - generic [ref=e120]: ▼
        - text: 02.07.2026 · Vormittag (07:30–14:00)
        - generic [ref=e122]:
          - img [ref=e123]
          - text: 1 Packen
      - generic [ref=e127]:
        - generic [ref=e128] [cursor=pointer]:
          - generic [ref=e129]: ▼
          - text: Heute · Vormittag (07:30–14:00)
          - generic [ref=e130]:
            - img [ref=e131]
            - text: Jetzt
          - generic [ref=e135]:
            - img [ref=e136]
            - text: 1 Warten
        - generic [ref=e140] [cursor=pointer]:
          - generic [ref=e141]: ▼
          - generic [ref=e142]: Josef Rumpfinger
          - generic [ref=e143]: 2 Pos.
          - generic "Abholung in 0 Min" [ref=e144]:
            - img [ref=e145]
            - generic [ref=e148]: 0m
          - generic "0/2 gepackt" [ref=e149]:
            - img [ref=e150]
            - generic [ref=e153]: 0/2
          - 'generic "Doppelklick: Status zurücksetzen" [ref=e154]':
            - img [ref=e155]
            - text: Abholbereit
          - generic [ref=e158]: 16,09 €
          - button "Ausgeben" [ref=e160]:
            - img [ref=e161]
            - generic [ref=e166]: Ausgeben
  - generic [ref=e167]: ⚠ TEST-UMGEBUNG – Nicht die Live-Seite!
```

# Test source

```ts
  948  |     await page.goto(KIOSK_URL);
  949  |     await page.waitForLoadState('networkidle');
  950  | 
  951  |     await page.click('[data-filter="history"]');
  952  |     await page.waitForTimeout(200);
  953  | 
  954  |     // Default: "Alle" status active
  955  |     await expect(page.locator('[data-hstatus="all"]')).toHaveClass(/active/);
  956  | 
  957  |     // Click "Abgeholt"
  958  |     await page.click('[data-hstatus="3"]');
  959  |     await page.waitForTimeout(200);
  960  | 
  961  |     await expect(page.locator('[data-hstatus="3"]')).toHaveClass(/active/);
  962  |     await expect(page.locator('[data-hstatus="all"]')).not.toHaveClass(/active/);
  963  |   });
  964  | });
  965  | 
  966  | // ─── AK-UI-39: Shop-Kommunikation ──────────────────────────────
  967  | test.describe('AK-UI-39 Shop-Kommunikation', () => {
  968  |   test('T-39-01 Shop-Karten zeigen Nachrichten-Buttons', async ({ page }) => {
  969  |     await page.goto(KIOSK_URL);
  970  |     await page.waitForTimeout(2000);
  971  |     // Switch to Shop tab
  972  |     await page.click('[data-tab="abhol"]');
  973  |     await page.waitForTimeout(1500);
  974  | 
  975  |     // Find any shop card and expand it
  976  |     const shopCards = page.locator('.k-order[id^="soc-"]');
  977  |     const count = await shopCards.count();
  978  |     if (count === 0) {
  979  |       test.skip();
  980  |       return;
  981  |     }
  982  |     // Click first card header to expand
  983  |     await shopCards.first().locator('.k-order-hdr').click();
  984  |     await page.waitForTimeout(300);
  985  | 
  986  |     // Check that message icon button exists in the expanded body (icon-only, no text)
  987  |     const replyBtn = shopCards.first().locator('button svg.lucide-message-circle');
  988  |     const btnCount = await replyBtn.count();
  989  |     expect(btnCount).toBeGreaterThanOrEqual(0); // Button may not exist for completed/cancelled orders
  990  |   });
  991  | 
  992  |   test('T-39-02 Shop-Antwort-Dialog öffnet sich', async ({ page }) => {
  993  |     await page.goto(KIOSK_URL);
  994  |     await page.waitForTimeout(2000);
  995  |     await page.click('[data-tab="abhol"]');
  996  |     await page.waitForTimeout(1500);
  997  | 
  998  |     const shopCards = page.locator('.k-order[id^="soc-"]:not([data-ostatus="3"]):not([data-ostatus="4"])');
  999  |     const count = await shopCards.count();
  1000 |     if (count === 0) {
  1001 |       test.skip();
  1002 |       return;
  1003 |     }
  1004 |     // Expand first active card
  1005 |     await shopCards.first().locator('.k-order-hdr').click();
  1006 |     await page.waitForTimeout(300);
  1007 | 
  1008 |     // Click reply/message icon button
  1009 |     const msgBtn = shopCards.first().locator('button:has(svg.lucide-message-circle)');
  1010 |     if (await msgBtn.count() > 0) {
  1011 |       await msgBtn.first().click();
  1012 |       await page.waitForTimeout(300);
  1013 |       // Check that reply input is visible
  1014 |       const replyInput = shopCards.first().locator('input[placeholder*="Antwort"]');
  1015 |       await expect(replyInput).toBeVisible();
  1016 |       // Check send button (icon-only with lucide send icon)
  1017 |       const sendBtn = shopCards.first().locator('[id^="shop-rpl-"] button:has(svg.lucide-send)');
  1018 |       await expect(sendBtn.first()).toBeVisible();
  1019 |     }
  1020 |   });
  1021 | 
  1022 |   test('T-39-03 NEU-Badge bei ungelesener Nachricht sichtbar', async ({ page }) => {
  1023 |     await page.goto(KIOSK_URL);
  1024 |     await page.waitForTimeout(2000);
  1025 |     await page.click('[data-tab="abhol"]');
  1026 |     await page.waitForTimeout(1500);
  1027 | 
  1028 |     // Check if any card has a NEU badge (depends on live data)
  1029 |     const neuBadge = page.locator('.k-order[id^="soc-"] .k-order-hdr >> text=NEU');
  1030 |     const badgeCount = await neuBadge.count();
  1031 |     // This is a data-dependent test - just verify the page rendered correctly
  1032 |     expect(badgeCount).toBeGreaterThanOrEqual(0);
  1033 |   });
  1034 | 
  1035 |   test('T-39-04 Kunden-Nachricht und Antwort werden angezeigt', async ({ page }) => {
  1036 |     await page.goto(KIOSK_URL);
  1037 |     await page.waitForTimeout(2000);
  1038 |     await page.click('[data-tab="abhol"]');
  1039 |     await page.waitForTimeout(1500);
  1040 | 
  1041 |     const shopCards = page.locator('.k-order[id^="soc-"]');
  1042 |     const count = await shopCards.count();
  1043 |     if (count === 0) {
  1044 |       test.skip();
  1045 |       return;
  1046 |     }
  1047 |     // Expand first card
> 1048 |     await shopCards.first().locator('.k-order-hdr').click();
       |                                                     ^ Error: locator.click: Test timeout of 60000ms exceeded.
  1049 |     await page.waitForTimeout(300);
  1050 | 
  1051 |     // Check for message elements (may or may not have messages depending on data)
  1052 |     const kundeMsg = shopCards.first().locator('text=Kunde:');
  1053 |     const antwortMsg = shopCards.first().locator('text=Antwort:');
  1054 |     // Both are data-dependent, just ensure no JS errors
  1055 |     const kundeCount = await kundeMsg.count();
  1056 |     const antwortCount = await antwortMsg.count();
  1057 |     expect(kundeCount).toBeGreaterThanOrEqual(0);
  1058 |     expect(antwortCount).toBeGreaterThanOrEqual(0);
  1059 |   });
  1060 | });
  1061 | 
  1062 | // ─── AK-UI-40: Stammkunden klappbare Karten ──────────────────────
  1063 | test.describe('AK-UI-40 Stammkunden klappbare Karten', () => {
  1064 |   test('T-40-01 Stammkunden-Karten haben klappbaren Header', async ({ page }) => {
  1065 |     await page.goto(KIOSK_URL);
  1066 |     await page.waitForTimeout(2000);
  1067 |     await page.click('[data-tab="kunden"]');
  1068 |     await page.waitForTimeout(500);
  1069 | 
  1070 |     // Load all customers
  1071 |     await page.click('button:has-text("Alle Kunden laden")');
  1072 |     await page.waitForTimeout(2000);
  1073 | 
  1074 |     // Check for collapsible cards with kc- prefix
  1075 |     const kundenCards = page.locator('.k-order[id^="kc-"]');
  1076 |     const count = await kundenCards.count();
  1077 |     if (count === 0) {
  1078 |       test.skip();
  1079 |       return;
  1080 |     }
  1081 | 
  1082 |     // Cards should have k-order-hdr
  1083 |     const header = kundenCards.first().locator('.k-order-hdr');
  1084 |     await expect(header).toBeVisible();
  1085 | 
  1086 |     // Cards should start collapsed
  1087 |     await expect(kundenCards.first()).toHaveClass(/oc-collapsed/);
  1088 |   });
  1089 | 
  1090 |   test('T-40-02 Stammkunden-Karte klappt auf/zu', async ({ page }) => {
  1091 |     await page.goto(KIOSK_URL);
  1092 |     await page.waitForTimeout(2000);
  1093 |     await page.click('[data-tab="kunden"]');
  1094 |     await page.waitForTimeout(500);
  1095 | 
  1096 |     await page.click('button:has-text("Alle Kunden laden")');
  1097 |     await page.waitForTimeout(2000);
  1098 | 
  1099 |     const kundenCards = page.locator('.k-order[id^="kc-"]');
  1100 |     const count = await kundenCards.count();
  1101 |     if (count === 0) {
  1102 |       test.skip();
  1103 |       return;
  1104 |     }
  1105 | 
  1106 |     // Click header to expand
  1107 |     await kundenCards.first().locator('.k-order-hdr').click();
  1108 |     await page.waitForTimeout(300);
  1109 | 
  1110 |     // Should no longer be collapsed
  1111 |     await expect(kundenCards.first()).not.toHaveClass(/oc-collapsed/);
  1112 | 
  1113 |     // Body should be visible
  1114 |     const body = kundenCards.first().locator('.k-order-body');
  1115 |     await expect(body).toBeVisible();
  1116 | 
  1117 |     // Click again to collapse
  1118 |     await kundenCards.first().locator('.k-order-hdr').click();
  1119 |     await page.waitForTimeout(300);
  1120 |     await expect(kundenCards.first()).toHaveClass(/oc-collapsed/);
  1121 |   });
  1122 | 
  1123 |   test('T-40-03 Header zeigt Bestellen-Button', async ({ page }) => {
  1124 |     await page.goto(KIOSK_URL);
  1125 |     await page.waitForTimeout(2000);
  1126 |     await page.click('[data-tab="kunden"]');
  1127 |     await page.waitForTimeout(500);
  1128 | 
  1129 |     await page.click('button:has-text("Alle Kunden laden")');
  1130 |     await page.waitForTimeout(2000);
  1131 | 
  1132 |     const kundenCards = page.locator('.k-order[id^="kc-"]');
  1133 |     const count = await kundenCards.count();
  1134 |     if (count === 0) {
  1135 |       test.skip();
  1136 |       return;
  1137 |     }
  1138 | 
  1139 |     // Header should contain Bestellen button
  1140 |     const bestellBtn = kundenCards.first().locator('.k-order-hdr .k-oc-actions button:has-text("Bestellen")');
  1141 |     await expect(bestellBtn).toBeVisible();
  1142 |   });
  1143 | 
  1144 |   test('T-40-04 Body zeigt Bearbeiten und Löschen', async ({ page }) => {
  1145 |     await page.goto(KIOSK_URL);
  1146 |     await page.waitForTimeout(2000);
  1147 |     await page.click('[data-tab="kunden"]');
  1148 |     await page.waitForTimeout(500);
```