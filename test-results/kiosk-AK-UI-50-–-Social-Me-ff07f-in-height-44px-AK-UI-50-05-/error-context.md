# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.js >> AK-UI-50 – Social Media Step-Wizard >> T-50-05: Sub-Tabs mit Lucide-Icons und min-height:44px (AK-UI-50-05)
- Location: tests\kiosk.spec.js:1244:3

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 44
Received:    39
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
        - generic [ref=e29]: 16:21:38
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
  - generic [ref=e77]:
    - generic [ref=e78]:
      - heading "Social Media" [level=3] [ref=e79]:
        - img [ref=e80]
        - text: Social Media
      - paragraph [ref=e86]: Tagespost erstellen und teilen – in 4 einfachen Schritten.
    - generic [ref=e87]:
      - button "Neuer Post" [ref=e88] [cursor=pointer]:
        - img [ref=e89]
        - text: Neuer Post
      - button "Katalog" [ref=e91] [cursor=pointer]:
        - img [ref=e92]
        - text: Katalog
    - generic [ref=e94]:
      - generic [ref=e95]:
        - generic [ref=e96] [cursor=pointer]:
          - generic [ref=e97]: ▼
          - generic [ref=e98]: "1"
          - generic [ref=e99]:
            - img [ref=e100]
            - text: Titel & Text
        - generic [ref=e103]:
          - generic [ref=e104]:
            - generic [ref=e105]: Titel wählen
            - combobox [ref=e106]:
              - option "Heute im Dorfladen – Samstag" [selected]
              - option "Aktuelles"
              - option "Wochenangebot"
              - option "Frisch eingetroffen"
              - option "Mittagstisch – Samstag"
              - option "Sonderangebot"
              - option "✏️ Eigenen Titel eingeben..."
          - generic [ref=e107]:
            - generic [ref=e108]: Freitext (optional)
            - 'textbox "z.B. Frisch aus der Küche! Heute als Dessert: Erdbeer-Sahne-Torte 🍰" [ref=e109]'
      - generic [ref=e110]:
        - generic [ref=e111] [cursor=pointer]:
          - generic [ref=e112]: ▼
          - generic [ref=e113]: "2"
          - generic [ref=e114]:
            - img [ref=e115]
            - text: Produkte auswählen
        - paragraph [ref=e124]: Laden Sie zuerst den Katalog...
      - generic [ref=e126] [cursor=pointer]:
        - generic [ref=e127]: ▼
        - generic [ref=e128]: "3"
        - generic [ref=e129]:
          - img [ref=e130]
          - text: Vorschau
        - button "Aktualisieren" [ref=e134]:
          - img [ref=e135]
          - generic [ref=e140]: Aktualisieren
      - generic [ref=e142] [cursor=pointer]:
        - generic [ref=e143]: ▼
        - generic [ref=e144]: "4"
        - generic [ref=e145]:
          - img [ref=e146]
          - text: Teilen & Veröffentlichen
  - generic [ref=e149]: ⚠ TEST-UMGEBUNG – Nicht die Live-Seite!
```

# Test source

```ts
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
  1182 |     await page.goto(KIOSK_URL);
  1183 |     await page.waitForTimeout(2000);
  1184 |     // Navigate to Social tab
  1185 |     await page.click('[data-tab="social"]');
  1186 |     await page.waitForTimeout(500);
  1187 |   });
  1188 | 
  1189 |   test('T-50-01: 4 nummerierte Step-Karten sichtbar (AK-UI-50-01)', async ({ page }) => {
  1190 |     for (let i = 1; i <= 4; i++) {
  1191 |       const step = page.locator('#soc-step-' + i);
  1192 |       await expect(step).toBeVisible();
  1193 |       // Verify numbered circle
  1194 |       const circle = step.locator('.k-order-hdr >> text="' + i + '"');
  1195 |       await expect(circle).toBeVisible();
  1196 |     }
  1197 |   });
  1198 | 
  1199 |   test('T-50-02: Steps 1+2 offen, Steps 3+4 zugeklappt (AK-UI-50-02)', async ({ page }) => {
  1200 |     // Steps 1 and 2 should NOT have oc-collapsed class
  1201 |     const step1 = page.locator('#soc-step-1');
  1202 |     const step2 = page.locator('#soc-step-2');
  1203 |     await expect(step1).not.toHaveClass(/oc-collapsed/);
  1204 |     await expect(step2).not.toHaveClass(/oc-collapsed/);
  1205 | 
  1206 |     // Steps 3 and 4 SHOULD have oc-collapsed class
  1207 |     const step3 = page.locator('#soc-step-3');
  1208 |     const step4 = page.locator('#soc-step-4');
  1209 |     await expect(step3).toHaveClass(/oc-collapsed/);
  1210 |     await expect(step4).toHaveClass(/oc-collapsed/);
  1211 |   });
  1212 | 
  1213 |   test('T-50-03: Klick auf Step-Header toggled auf/zu (AK-UI-50-03)', async ({ page }) => {
  1214 |     const step1 = page.locator('#soc-step-1');
  1215 |     const step1Hdr = step1.locator('.k-order-hdr');
  1216 | 
  1217 |     // Step 1 starts open – click to collapse
  1218 |     await step1Hdr.click();
  1219 |     await expect(step1).toHaveClass(/oc-collapsed/);
  1220 | 
  1221 |     // Click again to expand
  1222 |     await step1Hdr.click();
  1223 |     await expect(step1).not.toHaveClass(/oc-collapsed/);
  1224 | 
  1225 |     // Step 3 starts collapsed – click to expand
  1226 |     const step3 = page.locator('#soc-step-3');
  1227 |     const step3Hdr = step3.locator('.k-order-hdr');
  1228 |     await step3Hdr.click();
  1229 |     await expect(step3).not.toHaveClass(/oc-collapsed/);
  1230 |   });
  1231 | 
  1232 |   test('T-50-04: Touch-Targets min 44px hoch (AK-UI-50-04)', async ({ page }) => {
  1233 |     // Check title select
  1234 |     const titleSel = page.locator('#soc-post-titel-sel');
  1235 |     const selBox = await titleSel.boundingBox();
  1236 |     expect(selBox.height).toBeGreaterThanOrEqual(44);
  1237 | 
  1238 |     // Check sub-tab buttons
  1239 |     const postTab = page.locator('#social-subtab-post');
  1240 |     const postTabBox = await postTab.boundingBox();
  1241 |     expect(postTabBox.height).toBeGreaterThanOrEqual(44);
  1242 |   });
  1243 | 
  1244 |   test('T-50-05: Sub-Tabs mit Lucide-Icons und min-height:44px (AK-UI-50-05)', async ({ page }) => {
  1245 |     const postBtn = page.locator('#social-subtab-post');
  1246 |     const katalogBtn = page.locator('#social-subtab-katalog');
  1247 |     await expect(postBtn).toBeVisible();
  1248 |     await expect(katalogBtn).toBeVisible();
  1249 | 
  1250 |     // Check min-height
  1251 |     const postBox = await postBtn.boundingBox();
> 1252 |     expect(postBox.height).toBeGreaterThanOrEqual(44);
       |                            ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
  1253 |     const katalogBox = await katalogBtn.boundingBox();
  1254 |     expect(katalogBox.height).toBeGreaterThanOrEqual(44);
  1255 | 
  1256 |     // Check Lucide icons are present (data-lucide attributes)
  1257 |     const postIcon = postBtn.locator('[data-lucide]');
  1258 |     await expect(postIcon).toHaveCount(1);
  1259 |     const katalogIcon = katalogBtn.locator('[data-lucide]');
  1260 |     await expect(katalogIcon).toHaveCount(1);
  1261 |   });
  1262 | 
  1263 |   test('T-50-06: Teilen-Buttons vertikal mit min-height 56px (AK-UI-50-06)', async ({ page }) => {
  1264 |     // Expand step 4
  1265 |     const step4 = page.locator('#soc-step-4');
  1266 |     const step4Hdr = step4.locator('.k-order-hdr');
  1267 |     await step4Hdr.click();
  1268 |     await expect(step4).not.toHaveClass(/oc-collapsed/);
  1269 | 
  1270 |     // WhatsApp button
  1271 |     const waBtn = step4.locator('button', { hasText: 'WhatsApp' });
  1272 |     await expect(waBtn).toBeVisible();
  1273 |     const waBox = await waBtn.boundingBox();
  1274 |     expect(waBox.height).toBeGreaterThanOrEqual(56);
  1275 | 
  1276 |     // Instagram button
  1277 |     const igBtn = step4.locator('button', { hasText: 'Instagram' });
  1278 |     await expect(igBtn).toBeVisible();
  1279 |     const igBox = await igBtn.boundingBox();
  1280 |     expect(igBox.height).toBeGreaterThanOrEqual(56);
  1281 | 
  1282 |     // Tagesinfo button
  1283 |     const tiBtn = step4.locator('button', { hasText: 'Tagesinfo' });
  1284 |     await expect(tiBtn).toBeVisible();
  1285 |   });
  1286 | 
  1287 |   test('T-50-07: Badge "X ausgewählt" in Step 2 Header (AK-UI-50-07)', async ({ page }) => {
  1288 |     // Step-2 count badge should exist in DOM
  1289 |     const badge = page.locator('#soc-step2-count');
  1290 |     await expect(badge).toBeAttached();
  1291 |     // Initially empty (no products selected)
  1292 |     await expect(badge).toHaveText('');
  1293 |   });
  1294 | });
  1295 | 
  1296 | // ═══════════════════════════════════════════════════════════
  1297 | // RD-11/12/13 – Social Feature-Abgleich Kiosk ↔ CMS
  1298 | // ═══════════════════════════════════════════════════════════
  1299 | test.describe('Social Feature-Abgleich (RD-11, RD-12, RD-13)', () => {
  1300 | 
  1301 |   test('T-RD-11: Kiosk – Tagesinfo-Button vorhanden (AK-RD-10)', async ({ page }) => {
  1302 |     await page.goto(KIOSK_URL);
  1303 |     await page.waitForTimeout(2000);
  1304 |     await page.click('[data-tab="social"]');
  1305 |     await page.waitForTimeout(500);
  1306 |     // Step 4 aufklappen damit Button sichtbar wird
  1307 |     const step4Hdr = page.locator('#soc-step-4 .k-order-hdr');
  1308 |     await step4Hdr.click();
  1309 |     await page.waitForTimeout(300);
  1310 |     const tiBtn = page.locator('button', { hasText: 'Tagesinfo' });
  1311 |     await expect(tiBtn).toBeVisible();
  1312 |   });
  1313 | 
  1314 |   test('T-RD-11b: CMS – Tagesinfo-Button vorhanden (AK-RD-10)', async ({ page }) => {
  1315 |     await page.goto(`${BASE}/cms`);
  1316 |     await page.waitForTimeout(2000);
  1317 |     // Login
  1318 |     const pwField = page.locator('#cms-login-pw');
  1319 |     if (await pwField.isVisible()) {
  1320 |       await pwField.fill('DorfladenCMS!');
  1321 |       await page.locator('#cms-login-btn').click();
  1322 |       await page.waitForTimeout(1000);
  1323 |     }
  1324 |     // Navigate to Social tab
  1325 |     await page.click('#cms-tab-social');
  1326 |     await page.waitForTimeout(1000);
  1327 |     // Switch to Post sub-tab
  1328 |     await page.click('#social-subtab-post');
  1329 |     await page.waitForTimeout(500);
  1330 |     const tiBtn = page.locator('button', { hasText: 'Tagesinfo' });
  1331 |     await expect(tiBtn).toBeVisible();
  1332 |   });
  1333 | 
  1334 |   test('T-RD-12: Kiosk – Heutige-Posts-Container vorhanden (AK-RD-11)', async ({ page }) => {
  1335 |     await page.goto(KIOSK_URL);
  1336 |     await page.waitForTimeout(2000);
  1337 |     await page.click('[data-tab="social"]');
  1338 |     await page.waitForTimeout(1500);
  1339 |     // Container must exist in DOM (hidden if no posts today)
  1340 |     const wrap = page.locator('#soc-today-posts');
  1341 |     await expect(wrap).toBeAttached();
  1342 |     const list = page.locator('#soc-today-posts-list');
  1343 |     await expect(list).toBeAttached();
  1344 |   });
  1345 | 
  1346 |   test('T-RD-12b: CMS – Heutige-Posts-Container vorhanden (AK-RD-11)', async ({ page }) => {
  1347 |     await page.goto(`${BASE}/cms`);
  1348 |     await page.waitForTimeout(2000);
  1349 |     const pwField = page.locator('#cms-login-pw');
  1350 |     if (await pwField.isVisible()) {
  1351 |       await pwField.fill('DorfladenCMS!');
  1352 |       await page.locator('#cms-login-btn').click();
```