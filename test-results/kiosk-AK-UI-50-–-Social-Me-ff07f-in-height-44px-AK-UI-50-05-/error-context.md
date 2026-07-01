# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.js >> AK-UI-50 – Social Media Step-Wizard >> T-50-05: Sub-Tabs mit Lucide-Icons und min-height:44px (AK-UI-50-05)
- Location: tests\kiosk.spec.js:1248:3

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
      - generic "2 Bestellungen heute" [ref=e9]:
        - img [ref=e10]
      - generic [ref=e27]:
        - generic [ref=e28]: Dienstag, 30. Juni 2026
        - generic [ref=e29]: 22:55:51
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
  - generic [ref=e85]:
    - generic [ref=e86]:
      - heading "Social Media" [level=3] [ref=e87]:
        - img [ref=e88]
        - text: Social Media
      - paragraph [ref=e94]: Tagespost erstellen und teilen – in 4 einfachen Schritten.
    - generic [ref=e95]:
      - button "Neuer Post" [ref=e96] [cursor=pointer]:
        - img [ref=e97]
        - text: Neuer Post
      - button "Katalog" [ref=e99] [cursor=pointer]:
        - img [ref=e100]
        - text: Katalog
    - generic [ref=e102]:
      - generic [ref=e103]:
        - generic [ref=e104] [cursor=pointer]:
          - generic [ref=e105]: ▼
          - generic [ref=e106]: "1"
          - generic [ref=e107]:
            - img [ref=e108]
            - text: Titel & Text
        - generic [ref=e111]:
          - generic [ref=e112]:
            - generic [ref=e113]:
              - img [ref=e114]
              - text: Post für
            - generic [ref=e116]:
              - button "Heute" [ref=e117] [cursor=pointer]
              - button "Morgen" [ref=e118] [cursor=pointer]
            - text: Dienstag, 30. Juni
          - generic [ref=e119]:
            - generic [ref=e120]: Titel wählen
            - combobox [ref=e121]:
              - option "Heute im Dorfladen – Dienstag" [selected]
              - option "Aktuelles"
              - option "Wochenangebot"
              - option "Frisch eingetroffen"
              - option "Mittagstisch – Dienstag"
              - option "Sonderangebot"
              - option "✏️ Eigenen Titel eingeben..."
          - generic [ref=e122]:
            - generic [ref=e123]: Freitext (optional)
            - 'textbox "z.B. Frisch aus der Küche! Heute als Dessert: Erdbeer-Sahne-Torte 🍰" [ref=e124]'
      - generic [ref=e125]:
        - generic [ref=e126] [cursor=pointer]:
          - generic [ref=e127]: ▼
          - generic [ref=e128]: "2"
          - generic [ref=e129]:
            - img [ref=e130]
            - text: Produkte auswählen
        - paragraph [ref=e139]: Laden Sie zuerst den Katalog...
      - generic [ref=e141] [cursor=pointer]:
        - generic [ref=e142]: ▼
        - generic [ref=e143]: "3"
        - generic [ref=e144]:
          - img [ref=e145]
          - text: Vorschau
        - button "Aktualisieren" [ref=e149]:
          - img [ref=e150]
          - generic [ref=e155]: Aktualisieren
      - generic [ref=e157] [cursor=pointer]:
        - generic [ref=e158]: ▼
        - generic [ref=e159]: "4"
        - generic [ref=e160]:
          - img [ref=e161]
          - text: Teilen & Veröffentlichen
  - generic [ref=e164]: ⚠ TEST-UMGEBUNG – Nicht die Live-Seite!
```

# Test source

```ts
  1156 |     await page.waitForTimeout(500);
  1157 | 
  1158 |     await page.click('button:has-text("Alle Kunden laden")');
  1159 |     await page.waitForTimeout(2000);
  1160 | 
  1161 |     const kundenCards = page.locator('.k-order[id^="kc-"]');
  1162 |     const count = await kundenCards.count();
  1163 |     if (count === 0) {
  1164 |       test.skip();
  1165 |       return;
  1166 |     }
  1167 | 
  1168 |     // Expand first card
  1169 |     await kundenCards.first().locator('.k-order-hdr').click();
  1170 |     await page.waitForTimeout(300);
  1171 | 
  1172 |     // Body should have Bearbeiten and delete buttons
  1173 |     const editBtn = kundenCards.first().locator('.k-order-body button:has-text("Bearbeiten")');
  1174 |     await expect(editBtn).toBeVisible();
  1175 | 
  1176 |     const deleteBtn = kundenCards.first().locator('.k-order-body .k-btn-cancel');
  1177 |     await expect(deleteBtn).toBeVisible();
  1178 |   });
  1179 | });
  1180 | 
  1181 | // ═══════════════════════════════════════════════════════════
  1182 | // AK-UI-50 – Social Media Step-Wizard
  1183 | // ═══════════════════════════════════════════════════════════
  1184 | test.describe('AK-UI-50 – Social Media Step-Wizard', () => {
  1185 |   test.beforeEach(async ({ page }) => {
  1186 |     await page.goto(KIOSK_URL);
  1187 |     await page.waitForTimeout(2000);
  1188 |     // Navigate to Social tab
  1189 |     await page.click('[data-tab="social"]');
  1190 |     await page.waitForTimeout(500);
  1191 |   });
  1192 | 
  1193 |   test('T-50-01: 4 nummerierte Step-Karten sichtbar (AK-UI-50-01)', async ({ page }) => {
  1194 |     for (let i = 1; i <= 4; i++) {
  1195 |       const step = page.locator('#soc-step-' + i);
  1196 |       await expect(step).toBeVisible();
  1197 |       // Verify numbered circle
  1198 |       const circle = step.locator('.k-order-hdr >> text="' + i + '"');
  1199 |       await expect(circle).toBeVisible();
  1200 |     }
  1201 |   });
  1202 | 
  1203 |   test('T-50-02: Steps 1+2 offen, Steps 3+4 zugeklappt (AK-UI-50-02)', async ({ page }) => {
  1204 |     // Steps 1 and 2 should NOT have oc-collapsed class
  1205 |     const step1 = page.locator('#soc-step-1');
  1206 |     const step2 = page.locator('#soc-step-2');
  1207 |     await expect(step1).not.toHaveClass(/oc-collapsed/);
  1208 |     await expect(step2).not.toHaveClass(/oc-collapsed/);
  1209 | 
  1210 |     // Steps 3 and 4 SHOULD have oc-collapsed class
  1211 |     const step3 = page.locator('#soc-step-3');
  1212 |     const step4 = page.locator('#soc-step-4');
  1213 |     await expect(step3).toHaveClass(/oc-collapsed/);
  1214 |     await expect(step4).toHaveClass(/oc-collapsed/);
  1215 |   });
  1216 | 
  1217 |   test('T-50-03: Klick auf Step-Header toggled auf/zu (AK-UI-50-03)', async ({ page }) => {
  1218 |     const step1 = page.locator('#soc-step-1');
  1219 |     const step1Hdr = step1.locator('.k-order-hdr');
  1220 | 
  1221 |     // Step 1 starts open – click to collapse
  1222 |     await step1Hdr.click();
  1223 |     await expect(step1).toHaveClass(/oc-collapsed/);
  1224 | 
  1225 |     // Click again to expand
  1226 |     await step1Hdr.click();
  1227 |     await expect(step1).not.toHaveClass(/oc-collapsed/);
  1228 | 
  1229 |     // Step 3 starts collapsed – click to expand
  1230 |     const step3 = page.locator('#soc-step-3');
  1231 |     const step3Hdr = step3.locator('.k-order-hdr');
  1232 |     await step3Hdr.click();
  1233 |     await expect(step3).not.toHaveClass(/oc-collapsed/);
  1234 |   });
  1235 | 
  1236 |   test('T-50-04: Touch-Targets min 44px hoch (AK-UI-50-04)', async ({ page }) => {
  1237 |     // Check title select
  1238 |     const titleSel = page.locator('#soc-post-titel-sel');
  1239 |     const selBox = await titleSel.boundingBox();
  1240 |     expect(selBox.height).toBeGreaterThanOrEqual(44);
  1241 | 
  1242 |     // Check sub-tab buttons
  1243 |     const postTab = page.locator('#social-subtab-post');
  1244 |     const postTabBox = await postTab.boundingBox();
  1245 |     expect(postTabBox.height).toBeGreaterThanOrEqual(44);
  1246 |   });
  1247 | 
  1248 |   test('T-50-05: Sub-Tabs mit Lucide-Icons und min-height:44px (AK-UI-50-05)', async ({ page }) => {
  1249 |     const postBtn = page.locator('#social-subtab-post');
  1250 |     const katalogBtn = page.locator('#social-subtab-katalog');
  1251 |     await expect(postBtn).toBeVisible();
  1252 |     await expect(katalogBtn).toBeVisible();
  1253 | 
  1254 |     // Check min-height
  1255 |     const postBox = await postBtn.boundingBox();
> 1256 |     expect(postBox.height).toBeGreaterThanOrEqual(44);
       |                            ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
  1257 |     const katalogBox = await katalogBtn.boundingBox();
  1258 |     expect(katalogBox.height).toBeGreaterThanOrEqual(44);
  1259 | 
  1260 |     // Check Lucide icons are present (data-lucide attributes)
  1261 |     const postIcon = postBtn.locator('[data-lucide]');
  1262 |     await expect(postIcon).toHaveCount(1);
  1263 |     const katalogIcon = katalogBtn.locator('[data-lucide]');
  1264 |     await expect(katalogIcon).toHaveCount(1);
  1265 |   });
  1266 | 
  1267 |   test('T-50-06: Teilen-Buttons vertikal mit min-height 56px (AK-UI-50-06)', async ({ page }) => {
  1268 |     // Expand step 4
  1269 |     const step4 = page.locator('#soc-step-4');
  1270 |     const step4Hdr = step4.locator('.k-order-hdr');
  1271 |     await step4Hdr.click();
  1272 |     await expect(step4).not.toHaveClass(/oc-collapsed/);
  1273 | 
  1274 |     // WhatsApp button
  1275 |     const waBtn = step4.locator('button', { hasText: 'WhatsApp' });
  1276 |     await expect(waBtn).toBeVisible();
  1277 |     const waBox = await waBtn.boundingBox();
  1278 |     expect(waBox.height).toBeGreaterThanOrEqual(56);
  1279 | 
  1280 |     // Instagram button
  1281 |     const igBtn = step4.locator('button', { hasText: 'Instagram' });
  1282 |     await expect(igBtn).toBeVisible();
  1283 |     const igBox = await igBtn.boundingBox();
  1284 |     expect(igBox.height).toBeGreaterThanOrEqual(56);
  1285 | 
  1286 |     // Tagesinfo button
  1287 |     const tiBtn = step4.locator('button', { hasText: 'Tagesinfo' });
  1288 |     await expect(tiBtn).toBeVisible();
  1289 |   });
  1290 | 
  1291 |   test('T-50-07: Badge "X ausgewählt" in Step 2 Header (AK-UI-50-07)', async ({ page }) => {
  1292 |     // Step-2 count badge should exist in DOM
  1293 |     const badge = page.locator('#soc-step2-count');
  1294 |     await expect(badge).toBeAttached();
  1295 |     // Initially empty (no products selected)
  1296 |     await expect(badge).toHaveText('');
  1297 |   });
  1298 | });
  1299 | 
  1300 | // ═══════════════════════════════════════════════════════════
  1301 | // RD-11/12/13 – Social Feature-Abgleich Kiosk ↔ CMS
  1302 | // ═══════════════════════════════════════════════════════════
  1303 | test.describe('Social Feature-Abgleich (RD-11, RD-12, RD-13)', () => {
  1304 | 
  1305 |   test('T-RD-11: Kiosk – Tagesinfo-Button vorhanden (AK-RD-10)', async ({ page }) => {
  1306 |     await page.goto(KIOSK_URL);
  1307 |     await page.waitForTimeout(2000);
  1308 |     await page.click('[data-tab="social"]');
  1309 |     await page.waitForTimeout(500);
  1310 |     // Step 4 aufklappen damit Button sichtbar wird
  1311 |     const step4Hdr = page.locator('#soc-step-4 .k-order-hdr');
  1312 |     await step4Hdr.click();
  1313 |     await page.waitForTimeout(300);
  1314 |     const tiBtn = page.locator('button', { hasText: 'Tagesinfo' });
  1315 |     await expect(tiBtn).toBeVisible();
  1316 |   });
  1317 | 
  1318 |   test('T-RD-11b: CMS – Tagesinfo-Button vorhanden (AK-RD-10)', async ({ page }) => {
  1319 |     await page.goto(`${BASE}/cms`);
  1320 |     await page.waitForTimeout(2000);
  1321 |     // Login
  1322 |     const pwField = page.locator('#cms-login-pw');
  1323 |     if (await pwField.isVisible()) {
  1324 |       await pwField.fill('DorfladenCMS!');
  1325 |       await page.locator('#cms-login-btn').click();
  1326 |       await page.waitForTimeout(1000);
  1327 |     }
  1328 |     // Navigate to Social tab
  1329 |     await page.click('#cms-tab-social');
  1330 |     await page.waitForTimeout(1000);
  1331 |     // Switch to Post sub-tab
  1332 |     await page.click('#social-subtab-post');
  1333 |     await page.waitForTimeout(500);
  1334 |     const tiBtn = page.locator('button', { hasText: 'Tagesinfo' });
  1335 |     await expect(tiBtn).toBeVisible();
  1336 |   });
  1337 | 
  1338 |   test('T-RD-12: Kiosk – Heutige-Posts-Container vorhanden (AK-RD-11)', async ({ page }) => {
  1339 |     await page.goto(KIOSK_URL);
  1340 |     await page.waitForTimeout(2000);
  1341 |     await page.click('[data-tab="social"]');
  1342 |     await page.waitForTimeout(1500);
  1343 |     // Container must exist in DOM (hidden if no posts today)
  1344 |     const wrap = page.locator('#soc-today-posts');
  1345 |     await expect(wrap).toBeAttached();
  1346 |     const list = page.locator('#soc-today-posts-list');
  1347 |     await expect(list).toBeAttached();
  1348 |   });
  1349 | 
  1350 |   test('T-RD-12b: CMS – Heutige-Posts-Container vorhanden (AK-RD-11)', async ({ page }) => {
  1351 |     await page.goto(`${BASE}/cms`);
  1352 |     await page.waitForTimeout(2000);
  1353 |     const pwField = page.locator('#cms-login-pw');
  1354 |     if (await pwField.isVisible()) {
  1355 |       await pwField.fill('DorfladenCMS!');
  1356 |       await page.locator('#cms-login-btn').click();
```