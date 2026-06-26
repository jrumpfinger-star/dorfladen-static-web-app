# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.js >> AK-UI-50 – Social Media Step-Wizard >> T-50-01: 4 nummerierte Step-Karten sichtbar (AK-UI-50-01)
- Location: tests\kiosk.spec.js:1192:3

# Error details

```
ReferenceError: BASE_URL is not defined
```

# Test source

```ts
  1082 |       test.skip();
  1083 |       return;
  1084 |     }
  1085 | 
  1086 |     // Cards should have k-order-hdr
  1087 |     const header = kundenCards.first().locator('.k-order-hdr');
  1088 |     await expect(header).toBeVisible();
  1089 | 
  1090 |     // Cards should start collapsed
  1091 |     await expect(kundenCards.first()).toHaveClass(/oc-collapsed/);
  1092 |   });
  1093 | 
  1094 |   test('T-40-02 Stammkunden-Karte klappt auf/zu', async ({ page }) => {
  1095 |     await page.goto(KIOSK_URL);
  1096 |     await page.waitForTimeout(2000);
  1097 |     await page.click('[data-tab="kunden"]');
  1098 |     await page.waitForTimeout(500);
  1099 | 
  1100 |     await page.click('button:has-text("Alle Kunden laden")');
  1101 |     await page.waitForTimeout(2000);
  1102 | 
  1103 |     const kundenCards = page.locator('.k-order[id^="kc-"]');
  1104 |     const count = await kundenCards.count();
  1105 |     if (count === 0) {
  1106 |       test.skip();
  1107 |       return;
  1108 |     }
  1109 | 
  1110 |     // Click header to expand
  1111 |     await kundenCards.first().locator('.k-order-hdr').click();
  1112 |     await page.waitForTimeout(300);
  1113 | 
  1114 |     // Should no longer be collapsed
  1115 |     await expect(kundenCards.first()).not.toHaveClass(/oc-collapsed/);
  1116 | 
  1117 |     // Body should be visible
  1118 |     const body = kundenCards.first().locator('.k-order-body');
  1119 |     await expect(body).toBeVisible();
  1120 | 
  1121 |     // Click again to collapse
  1122 |     await kundenCards.first().locator('.k-order-hdr').click();
  1123 |     await page.waitForTimeout(300);
  1124 |     await expect(kundenCards.first()).toHaveClass(/oc-collapsed/);
  1125 |   });
  1126 | 
  1127 |   test('T-40-03 Header zeigt Bestellen-Button', async ({ page }) => {
  1128 |     await page.goto(KIOSK_URL);
  1129 |     await page.waitForTimeout(2000);
  1130 |     await page.click('[data-tab="kunden"]');
  1131 |     await page.waitForTimeout(500);
  1132 | 
  1133 |     await page.click('button:has-text("Alle Kunden laden")');
  1134 |     await page.waitForTimeout(2000);
  1135 | 
  1136 |     const kundenCards = page.locator('.k-order[id^="kc-"]');
  1137 |     const count = await kundenCards.count();
  1138 |     if (count === 0) {
  1139 |       test.skip();
  1140 |       return;
  1141 |     }
  1142 | 
  1143 |     // Header should contain Bestellen button
  1144 |     const bestellBtn = kundenCards.first().locator('.k-order-hdr .k-oc-actions button:has-text("Bestellen")');
  1145 |     await expect(bestellBtn).toBeVisible();
  1146 |   });
  1147 | 
  1148 |   test('T-40-04 Body zeigt Bearbeiten und Löschen', async ({ page }) => {
  1149 |     await page.goto(KIOSK_URL);
  1150 |     await page.waitForTimeout(2000);
  1151 |     await page.click('[data-tab="kunden"]');
  1152 |     await page.waitForTimeout(500);
  1153 | 
  1154 |     await page.click('button:has-text("Alle Kunden laden")');
  1155 |     await page.waitForTimeout(2000);
  1156 | 
  1157 |     const kundenCards = page.locator('.k-order[id^="kc-"]');
  1158 |     const count = await kundenCards.count();
  1159 |     if (count === 0) {
  1160 |       test.skip();
  1161 |       return;
  1162 |     }
  1163 | 
  1164 |     // Expand first card
  1165 |     await kundenCards.first().locator('.k-order-hdr').click();
  1166 |     await page.waitForTimeout(300);
  1167 | 
  1168 |     // Body should have Bearbeiten and delete buttons
  1169 |     const editBtn = kundenCards.first().locator('.k-order-body button:has-text("Bearbeiten")');
  1170 |     await expect(editBtn).toBeVisible();
  1171 | 
  1172 |     const deleteBtn = kundenCards.first().locator('.k-order-body .k-btn-cancel');
  1173 |     await expect(deleteBtn).toBeVisible();
  1174 |   });
  1175 | });
  1176 | 
  1177 | // ═══════════════════════════════════════════════════════════
  1178 | // AK-UI-50 – Social Media Step-Wizard
  1179 | // ═══════════════════════════════════════════════════════════
  1180 | test.describe('AK-UI-50 – Social Media Step-Wizard', () => {
  1181 |   test.beforeEach(async ({ page }) => {
> 1182 |     await page.goto(BASE_URL + '/kiosk.html');
       |                     ^ ReferenceError: BASE_URL is not defined
  1183 |     await page.fill('#cms-pw-input', CMS_PW);
  1184 |     await page.click('#cms-pw-btn');
  1185 |     await page.waitForSelector('.k-main', { timeout: 10000 });
  1186 |     // Navigate to Social tab
  1187 |     const socialTab = page.locator('.k-tab[data-tab="social"]');
  1188 |     await socialTab.click();
  1189 |     await page.waitForSelector('#panel-social.active', { timeout: 5000 });
  1190 |   });
  1191 | 
  1192 |   test('T-50-01: 4 nummerierte Step-Karten sichtbar (AK-UI-50-01)', async ({ page }) => {
  1193 |     for (let i = 1; i <= 4; i++) {
  1194 |       const step = page.locator('#soc-step-' + i);
  1195 |       await expect(step).toBeVisible();
  1196 |       // Verify numbered circle
  1197 |       const circle = step.locator('.k-order-hdr >> text="' + i + '"');
  1198 |       await expect(circle).toBeVisible();
  1199 |     }
  1200 |   });
  1201 | 
  1202 |   test('T-50-02: Steps 1+2 offen, Steps 3+4 zugeklappt (AK-UI-50-02)', async ({ page }) => {
  1203 |     // Steps 1 and 2 should NOT have oc-collapsed class
  1204 |     const step1 = page.locator('#soc-step-1');
  1205 |     const step2 = page.locator('#soc-step-2');
  1206 |     await expect(step1).not.toHaveClass(/oc-collapsed/);
  1207 |     await expect(step2).not.toHaveClass(/oc-collapsed/);
  1208 | 
  1209 |     // Steps 3 and 4 SHOULD have oc-collapsed class
  1210 |     const step3 = page.locator('#soc-step-3');
  1211 |     const step4 = page.locator('#soc-step-4');
  1212 |     await expect(step3).toHaveClass(/oc-collapsed/);
  1213 |     await expect(step4).toHaveClass(/oc-collapsed/);
  1214 |   });
  1215 | 
  1216 |   test('T-50-03: Klick auf Step-Header toggled auf/zu (AK-UI-50-03)', async ({ page }) => {
  1217 |     const step1 = page.locator('#soc-step-1');
  1218 |     const step1Hdr = step1.locator('.k-order-hdr');
  1219 | 
  1220 |     // Step 1 starts open – click to collapse
  1221 |     await step1Hdr.click();
  1222 |     await expect(step1).toHaveClass(/oc-collapsed/);
  1223 | 
  1224 |     // Click again to expand
  1225 |     await step1Hdr.click();
  1226 |     await expect(step1).not.toHaveClass(/oc-collapsed/);
  1227 | 
  1228 |     // Step 3 starts collapsed – click to expand
  1229 |     const step3 = page.locator('#soc-step-3');
  1230 |     const step3Hdr = step3.locator('.k-order-hdr');
  1231 |     await step3Hdr.click();
  1232 |     await expect(step3).not.toHaveClass(/oc-collapsed/);
  1233 |   });
  1234 | 
  1235 |   test('T-50-04: Touch-Targets min 44px hoch (AK-UI-50-04)', async ({ page }) => {
  1236 |     // Check title select
  1237 |     const titleSel = page.locator('#soc-post-titel-sel');
  1238 |     const selBox = await titleSel.boundingBox();
  1239 |     expect(selBox.height).toBeGreaterThanOrEqual(44);
  1240 | 
  1241 |     // Check sub-tab buttons
  1242 |     const postTab = page.locator('#social-subtab-post');
  1243 |     const postTabBox = await postTab.boundingBox();
  1244 |     expect(postTabBox.height).toBeGreaterThanOrEqual(44);
  1245 |   });
  1246 | 
  1247 |   test('T-50-05: Sub-Tabs mit Lucide-Icons und min-height:44px (AK-UI-50-05)', async ({ page }) => {
  1248 |     const postBtn = page.locator('#social-subtab-post');
  1249 |     const katalogBtn = page.locator('#social-subtab-katalog');
  1250 |     await expect(postBtn).toBeVisible();
  1251 |     await expect(katalogBtn).toBeVisible();
  1252 | 
  1253 |     // Check min-height
  1254 |     const postBox = await postBtn.boundingBox();
  1255 |     expect(postBox.height).toBeGreaterThanOrEqual(44);
  1256 |     const katalogBox = await katalogBtn.boundingBox();
  1257 |     expect(katalogBox.height).toBeGreaterThanOrEqual(44);
  1258 | 
  1259 |     // Check Lucide icons are present (data-lucide attributes)
  1260 |     const postIcon = postBtn.locator('[data-lucide]');
  1261 |     await expect(postIcon).toHaveCount(1);
  1262 |     const katalogIcon = katalogBtn.locator('[data-lucide]');
  1263 |     await expect(katalogIcon).toHaveCount(1);
  1264 |   });
  1265 | 
  1266 |   test('T-50-06: Teilen-Buttons vertikal mit min-height 56px (AK-UI-50-06)', async ({ page }) => {
  1267 |     // Expand step 4
  1268 |     const step4 = page.locator('#soc-step-4');
  1269 |     const step4Hdr = step4.locator('.k-order-hdr');
  1270 |     await step4Hdr.click();
  1271 |     await expect(step4).not.toHaveClass(/oc-collapsed/);
  1272 | 
  1273 |     // WhatsApp button
  1274 |     const waBtn = step4.locator('button', { hasText: 'WhatsApp' });
  1275 |     await expect(waBtn).toBeVisible();
  1276 |     const waBox = await waBtn.boundingBox();
  1277 |     expect(waBox.height).toBeGreaterThanOrEqual(56);
  1278 | 
  1279 |     // Instagram button
  1280 |     const igBtn = step4.locator('button', { hasText: 'Instagram' });
  1281 |     await expect(igBtn).toBeVisible();
  1282 |     const igBox = await igBtn.boundingBox();
```