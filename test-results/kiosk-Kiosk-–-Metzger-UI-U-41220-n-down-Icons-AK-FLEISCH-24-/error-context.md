# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.js >> Kiosk – Metzger UI/UX (AK-FLEISCH-24) >> T-24-01 Metzger-Karten haben Lucide chevron-down Icons (AK-FLEISCH-24)
- Location: tests\kiosk.spec.js:1464:3

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('#metzger-orders .k-order').first().locator('.k-oc-arrow i[data-lucide="chevron-down"]')
Expected: 1
Received: 0
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for locator('#metzger-orders .k-order').first().locator('.k-oc-arrow i[data-lucide="chevron-down"]')
    14 × locator resolved to 0 elements
       - unexpected value "0"

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
        - generic [ref=e29]: 10:02:43
      - button "Hilfe & Workflows" [ref=e30] [cursor=pointer]:
        - img [ref=e31]
      - button "Aktualisieren" [ref=e34] [cursor=pointer]:
        - img [ref=e35]
  - generic [ref=e40]:
    - generic [ref=e41] [cursor=pointer]:
      - img [ref=e43]
      - text: Mittagstisch
      - generic "1 neue Bestellung" [ref=e47]: "1"
    - generic [ref=e48] [cursor=pointer]:
      - img [ref=e50]
      - text: Online-Shop
      - generic "1 zu packen" [ref=e55]: "1"
    - generic [ref=e56] [cursor=pointer]:
      - img [ref=e58]
      - text: Stammkunden
    - generic [ref=e63] [cursor=pointer]:
      - img [ref=e65]
      - text: Metzger
      - generic [ref=e69]:
        - generic "1 neue Bestellung" [ref=e70]: "1"
        - generic "3 offen" [ref=e71]: "3"
    - generic [ref=e72] [cursor=pointer]:
      - img [ref=e74]
      - text: Social
  - generic [ref=e81]:
    - generic [ref=e82]:
      - button "Zu erledigen 4" [ref=e83] [cursor=pointer]:
        - img [ref=e84]
        - generic [ref=e87]: Zu erledigen
        - generic [ref=e88]: "4"
      - button "Heute abholen 0" [ref=e89] [cursor=pointer]:
        - img [ref=e90]
        - generic [ref=e93]: Heute abholen
        - generic [ref=e94]: "0"
      - button "Sammelbestellung" [ref=e95] [cursor=pointer]:
        - img [ref=e96]
        - generic [ref=e99]: Sammelbestellung
      - button "Nachrichten" [ref=e100] [cursor=pointer]:
        - img [ref=e101]
        - generic [ref=e103]: Nachrichten
      - button "Historie" [ref=e105] [cursor=pointer]:
        - img [ref=e106]
        - generic [ref=e110]: Historie
    - generic [ref=e111]:
      - generic [ref=e112]:
        - generic [ref=e113] [cursor=pointer]:
          - img [ref=e115]
          - generic [ref=e117]: Josef Rumpfinger
          - generic [ref=e118]: 1 Pos.
          - generic [ref=e120]: Beim Metzger
          - button "Abgeholt" [ref=e122]:
            - img [ref=e123]
            - generic [ref=e126]: Abgeholt
        - generic [ref=e127]:
          - generic [ref=e128]:
            - generic [ref=e129]:
              - generic [ref=e130]:
                - img [ref=e131]
                - generic [ref=e134]: FM-20260628-D5B2
              - generic [ref=e135]:
                - img [ref=e136]
                - text: "01737071811"
              - generic [ref=e138]:
                - img [ref=e139]
                - text: 2026-07-02
            - generic [ref=e144]:
              - generic [ref=e145]:
                - checkbox "Beim Metzger bestellt" [checked] [ref=e146] [cursor=pointer]
                - generic [ref=e147]: Dicke
                - generic [ref=e148]: 1.0 kg
                - generic [ref=e149]: 12,66 €
              - generic [ref=e150]:
                - generic [ref=e151]: 12,66 €
                - generic [ref=e152]: "Ersparnis: 2,24 €"
          - generic [ref=e154]:
            - img [ref=e155]
            - strong [ref=e158]: "Antwort:"
            - text: fgghg
          - generic [ref=e159]:
            - button "Abgeholt" [ref=e160] [cursor=pointer]:
              - img [ref=e161]
              - text: Abgeholt
            - button "Nachricht" [ref=e164] [cursor=pointer]:
              - img [ref=e165]
              - text: Nachricht
      - generic [ref=e167]:
        - generic [ref=e168] [cursor=pointer]:
          - img [ref=e170]
          - generic [ref=e172]: Josef Rumpfinger
          - generic [ref=e173]: 1 Pos.
          - generic [ref=e175]: Beim Metzger
          - button "Abgeholt" [ref=e177]:
            - img [ref=e178]
            - generic [ref=e181]: Abgeholt
        - generic [ref=e182]:
          - generic [ref=e183]:
            - generic [ref=e184]:
              - generic [ref=e185]:
                - img [ref=e186]
                - generic [ref=e189]: FM-20260628-7C33
              - generic [ref=e190]:
                - img [ref=e191]
                - text: "01737071811"
              - generic [ref=e193]:
                - img [ref=e194]
                - text: 2026-07-02
            - generic [ref=e199]:
              - generic [ref=e200]:
                - checkbox "Beim Metzger bestellt" [checked] [ref=e201] [cursor=pointer]
                - generic [ref=e202]: Rouladen v. Strohrind
                - generic [ref=e203]: 1.0 kg
                - generic [ref=e204]: 25,41 €
              - generic [ref=e205]:
                - generic [ref=e206]: 25,41 €
                - generic [ref=e207]: "Ersparnis: 4,49 €"
          - generic [ref=e208]:
            - button "Abgeholt" [ref=e209] [cursor=pointer]:
              - img [ref=e210]
              - text: Abgeholt
            - button "Nachricht" [ref=e213] [cursor=pointer]:
              - img [ref=e214]
              - text: Nachricht
      - generic [ref=e216]:
        - generic [ref=e217] [cursor=pointer]:
          - img [ref=e219]
          - generic [ref=e221]: Josef Rumpfinger
          - generic [ref=e222]: 1 Pos.
          - generic [ref=e224]: Beim Metzger
          - button "Abgeholt" [ref=e226]:
            - img [ref=e227]
            - generic [ref=e230]: Abgeholt
        - generic [ref=e231]:
          - generic [ref=e232]:
            - generic [ref=e233]:
              - generic [ref=e234]:
                - img [ref=e235]
                - generic [ref=e238]: FM-20260628-DC21
              - generic [ref=e239]:
                - img [ref=e240]
                - text: "01737071811"
              - generic [ref=e242]:
                - img [ref=e243]
                - text: 2026-07-02
            - generic [ref=e248]:
              - generic [ref=e249]:
                - checkbox "Beim Metzger bestellt" [checked] [ref=e250] [cursor=pointer]
                - generic [ref=e251]: Hackfleisch gem. Strohrind u. -schwein
                - generic [ref=e252]: 1.0 kg
                - generic [ref=e253]: 15,47 €
              - generic [ref=e254]:
                - generic [ref=e255]: 15,47 €
                - generic [ref=e256]: "Ersparnis: 2,73 €"
          - generic [ref=e257]:
            - button "Abgeholt" [ref=e258] [cursor=pointer]:
              - img [ref=e259]
              - text: Abgeholt
            - button "Nachricht" [ref=e262] [cursor=pointer]:
              - img [ref=e263]
              - text: Nachricht
      - generic [ref=e265]:
        - generic [ref=e266] [cursor=pointer]:
          - img [ref=e268]
          - generic [ref=e270]: Josef Rumpfinger
          - generic [ref=e271]: 1 Pos.
          - generic [ref=e273]: Neu
          - generic [ref=e275]: 1/1
        - generic [ref=e276]:
          - generic [ref=e277]:
            - generic [ref=e278]:
              - generic [ref=e279]:
                - img [ref=e280]
                - generic [ref=e283]: FM-20260629-2BA3
              - generic [ref=e284]:
                - img [ref=e285]
                - text: "01737071811"
              - generic [ref=e287]:
                - img [ref=e288]
                - text: 2026-07-02
            - generic [ref=e293]:
              - generic [ref=e294]:
                - checkbox "Beim Metzger bestellt" [checked] [ref=e295] [cursor=pointer]
                - generic [ref=e296]: Dicke
                - generic [ref=e297]: 1.0 kg
                - generic [ref=e298]: 12,66 €
              - generic [ref=e299]:
                - generic [ref=e300]: 12,66 €
                - generic [ref=e301]: "Ersparnis: 2,24 €"
          - generic [ref=e302]:
            - button "Beim Metzger bestellt" [ref=e303] [cursor=pointer]:
              - img [ref=e304]
              - text: Beim Metzger bestellt
            - button "Stornieren" [ref=e307] [cursor=pointer]:
              - img [ref=e308]
              - text: Stornieren
            - button "Nachricht" [ref=e311] [cursor=pointer]:
              - img [ref=e312]
              - text: Nachricht
  - generic [ref=e314]: ⚠ TEST-UMGEBUNG – Nicht die Live-Seite!
```

# Test source

```ts
  1376 |       await expect(mtSection).toHaveCount(0);
  1377 |     } else {
  1378 |       // Before 11, section may or may not exist depending on wochenplan data
  1379 |       // Just verify the function exists and returns array
  1380 |       const fnExists = await page.evaluate(() => typeof socialGetTodayMeals === 'undefined' ? false : Array.isArray(window._socialModule.socialGetTodayMeals()));
  1381 |       expect(typeof fnExists).toBe('boolean');
  1382 |     }
  1383 |   });
  1384 | 
  1385 |   test('T-RD-14b: CMS – Mittagessen nach 11 Uhr ausgeblendet', async ({ page }) => {
  1386 |     await page.goto(`${BASE}/cms`);
  1387 |     await page.waitForTimeout(2000);
  1388 |     const pwField = page.locator('#cms-login-pw');
  1389 |     if (await pwField.isVisible()) {
  1390 |       await pwField.fill('DorfladenCMS!');
  1391 |       await page.locator('#cms-login-btn').click();
  1392 |       await page.waitForTimeout(1000);
  1393 |     }
  1394 |     await page.click('#cms-tab-social');
  1395 |     await page.waitForTimeout(1000);
  1396 |     await page.click('#social-subtab-post');
  1397 |     await page.waitForTimeout(1500);
  1398 |     const hour = new Date().getHours();
  1399 |     const mtSection = page.locator('#social-panel-post', { hasText: 'Heutiges Mittagessen' });
  1400 |     if (hour >= 11) {
  1401 |       await expect(mtSection).toHaveCount(0);
  1402 |     } else {
  1403 |       // Before 11 – just check page loaded without error
  1404 |       const postPanel = page.locator('#social-panel-post');
  1405 |       await expect(postPanel).toBeVisible();
  1406 |     }
  1407 |   });
  1408 | 
  1409 |   test('T-RD-13: CMS – Verlauf-Tab entfernt (AK-RD-12)', async ({ page }) => {
  1410 |     await page.goto(`${BASE}/cms`);
  1411 |     await page.waitForTimeout(2000);
  1412 |     const pwField = page.locator('#cms-login-pw');
  1413 |     if (await pwField.isVisible()) {
  1414 |       await pwField.fill('DorfladenCMS!');
  1415 |       await page.locator('#cms-login-btn').click();
  1416 |       await page.waitForTimeout(1000);
  1417 |     }
  1418 |     await page.click('#cms-tab-social');
  1419 |     await page.waitForTimeout(500);
  1420 |     // Verlauf-Tab button must NOT exist
  1421 |     const verlaufBtn = page.locator('#social-subtab-verlauf');
  1422 |     await expect(verlaufBtn).toHaveCount(0);
  1423 |     // Verlauf panel must NOT exist
  1424 |     const verlaufPanel = page.locator('#social-panel-verlauf');
  1425 |     await expect(verlaufPanel).toHaveCount(0);
  1426 |   });
  1427 | });
  1428 | 
  1429 | // ════════════════════════════════════════════════════
  1430 | //  T-20: Kiosk Touch-Modal für Nachrichten (AK-FLEISCH-19)
  1431 | // ════════════════════════════════════════════════════
  1432 | 
  1433 | test.describe('Kiosk – Metzger Touch-Modal (AK-FLEISCH-19)', () => {
  1434 | 
  1435 |   test('T-20-01 openFmReplyModal Funktion existiert (AK-FLEISCH-19)', async ({ page }) => {
  1436 |     await page.goto(KIOSK_URL);
  1437 |     await page.waitForTimeout(3000);
  1438 |     const hasFn = await page.evaluate(() => typeof K !== 'undefined' && typeof K.openFmReplyModal === 'function');
  1439 |     expect(hasFn).toBe(true);
  1440 |   });
  1441 | 
  1442 |   test('T-20-02 sendFmModalReply Funktion existiert (AK-FLEISCH-19)', async ({ page }) => {
  1443 |     await page.goto(KIOSK_URL);
  1444 |     await page.waitForTimeout(3000);
  1445 |     const hasFn = await page.evaluate(() => typeof K !== 'undefined' && typeof K.sendFmModalReply === 'function');
  1446 |     expect(hasFn).toBe(true);
  1447 |   });
  1448 | 
  1449 |   test('T-20-03 Kein inline sendFmReply mehr (AK-FLEISCH-19)', async ({ page }) => {
  1450 |     await page.goto(KIOSK_URL);
  1451 |     await page.waitForTimeout(3000);
  1452 |     // The old inline sendFmReply should NOT be in K's public API
  1453 |     const hasOldFn = await page.evaluate(() => typeof K !== 'undefined' && typeof K.sendFmReply === 'function');
  1454 |     expect(hasOldFn).toBe(false);
  1455 |   });
  1456 | });
  1457 | 
  1458 | // ════════════════════════════════════════════════════
  1459 | //  Metzger – UI/UX Optimierung (AK-FLEISCH-24)
  1460 | // ════════════════════════════════════════════════════
  1461 | 
  1462 | test.describe('Kiosk – Metzger UI/UX (AK-FLEISCH-24)', () => {
  1463 | 
  1464 |   test('T-24-01 Metzger-Karten haben Lucide chevron-down Icons (AK-FLEISCH-24)', async ({ page }) => {
  1465 |     await page.goto(KIOSK_URL);
  1466 |     await page.locator('.k-tab[data-tab="metzger"]').click();
  1467 |     await page.waitForTimeout(3000);
  1468 |     const cards = page.locator('#metzger-orders .k-order');
  1469 |     const count = await cards.count();
  1470 |     if (count === 0) {
  1471 |       test.skip(true, 'Keine Metzger-Bestellungen');
  1472 |       return;
  1473 |     }
  1474 |     // Arrow should be Lucide icon, not unicode text
  1475 |     const arrow = cards.first().locator('.k-oc-arrow i[data-lucide="chevron-down"]');
> 1476 |     await expect(arrow).toHaveCount(1);
       |                         ^ Error: expect(locator).toHaveCount(expected) failed
  1477 |   });
  1478 | 
  1479 |   test('T-24-02 Metzger-Karten zeigen keine Bestellnummer/Telefon im Header (AK-FLEISCH-24)', async ({ page }) => {
  1480 |     await page.goto(KIOSK_URL);
  1481 |     await page.locator('.k-tab[data-tab="metzger"]').click();
  1482 |     await page.waitForTimeout(3000);
  1483 |     const cards = page.locator('#metzger-orders .k-order');
  1484 |     const count = await cards.count();
  1485 |     if (count === 0) {
  1486 |       test.skip(true, 'Keine Metzger-Bestellungen');
  1487 |       return;
  1488 |     }
  1489 |     const headerText = await cards.first().locator('.k-order-hdr').textContent();
  1490 |     expect(headerText).not.toContain('FM-');
  1491 |     expect(headerText).not.toContain('Tel');
  1492 |   });
  1493 | 
  1494 |   test('T-24-03 Metzger Toggle klappt Karte auf/zu (AK-FLEISCH-24)', async ({ page }) => {
  1495 |     await page.goto(KIOSK_URL);
  1496 |     await page.locator('.k-tab[data-tab="metzger"]').click();
  1497 |     await page.waitForTimeout(3000);
  1498 |     const cards = page.locator('#metzger-orders .k-order');
  1499 |     const count = await cards.count();
  1500 |     if (count === 0) {
  1501 |       test.skip(true, 'Keine Metzger-Bestellungen');
  1502 |       return;
  1503 |     }
  1504 |     const card = cards.first();
  1505 |     const wasCollapsed = await card.evaluate(el => el.classList.contains('oc-collapsed'));
  1506 |     // Click header to toggle
  1507 |     await card.locator('.k-order-hdr').click();
  1508 |     await page.waitForTimeout(300);
  1509 |     const isCollapsed = await card.evaluate(el => el.classList.contains('oc-collapsed'));
  1510 |     expect(isCollapsed).toBe(!wasCollapsed);
  1511 |   });
  1512 | 
  1513 |   test('T-24-04 Metzger-Bestellungen aufsteigend sortiert (AK-FLEISCH-24)', async ({ page }) => {
  1514 |     await page.goto(KIOSK_URL);
  1515 |     await page.locator('.k-tab[data-tab="metzger"]').click();
  1516 |     await page.waitForTimeout(3000);
  1517 |     // Check sort via data attribute dates
  1518 |     const dates = await page.evaluate(() => {
  1519 |       const cards = document.querySelectorAll('#metzger-orders .k-order');
  1520 |       return Array.from(cards).map(c => c.getAttribute('data-fmdate') || '');
  1521 |     });
  1522 |     if (dates.length >= 2) {
  1523 |       for (let i = 1; i < dates.length; i++) {
  1524 |         expect(dates[i] >= dates[i - 1]).toBe(true);
  1525 |       }
  1526 |     }
  1527 |   });
  1528 | 
  1529 |   test('T-24-05 Sammelbestellung API liefert einzelpositionen statt aggregiert (AK-FLEISCH-24)', async ({ request }) => {
  1530 |     // Find next delivery date from API
  1531 |     const kiosk = await request.get(`${BASE}/api/fleisch-order?mode=kiosk`);
  1532 |     const kioskData = await kiosk.json();
  1533 |     if (!kioskData.success || !kioskData.bestellungen || kioskData.bestellungen.length === 0) {
  1534 |       test.skip(true, 'Keine Metzger-Bestellungen');
  1535 |       return;
  1536 |     }
  1537 |     const liefertag = kioskData.bestellungen[0].liefertag;
  1538 |     if (!liefertag) {
  1539 |       test.skip(true, 'Kein Liefertag');
  1540 |       return;
  1541 |     }
  1542 |     const resp = await request.get(`${BASE}/api/fleisch-order?liefertag=${liefertag}`);
  1543 |     expect(resp.status()).toBe(200);
  1544 |     const data = await resp.json();
  1545 |     expect(data.success).toBe(true);
  1546 |     // New field: einzelpositionen (not aggregiert)
  1547 |     expect(Array.isArray(data.einzelpositionen)).toBe(true);
  1548 |     expect(data.aggregiert).toBeUndefined();
  1549 |     if (data.einzelpositionen.length > 0) {
  1550 |       const ep = data.einzelpositionen[0];
  1551 |       expect(typeof ep.bezeichnung).toBe('string');
  1552 |       expect(typeof ep.kunde).toBe('string');
  1553 |       expect(typeof ep.menge_kg).toBe('number');
  1554 |     }
  1555 |   });
  1556 | 
  1557 |   test('T-24-06 Metzger Status-Workflow: kein Status 2 Button (AK-FLEISCH-24)', async ({ page }) => {
  1558 |     await page.goto(KIOSK_URL);
  1559 |     await page.locator('.k-tab[data-tab="metzger"]').click();
  1560 |     await page.waitForTimeout(3000);
  1561 |     // No "Eingetroffen" or status 2 button should exist
  1562 |     const eingetroffenBtn = page.locator('#metzger-orders button:has-text("Eingetroffen")');
  1563 |     await expect(eingetroffenBtn).toHaveCount(0);
  1564 |   });
  1565 | });
  1566 | 
  1567 | // ════════════════════════════════════════════════════
  1568 | //  Mittagstisch – UI/UX Optimierung (AK-FLEISCH-25)
  1569 | // ════════════════════════════════════════════════════
  1570 | 
  1571 | test.describe('Kiosk – Mittagstisch UI/UX (AK-FLEISCH-25)', () => {
  1572 | 
  1573 |   test('T-25-01 Mittagstisch Karten haben Lucide chevron-down Icons (AK-FLEISCH-25)', async ({ page }) => {
  1574 |     await page.goto(KIOSK_URL);
  1575 |     await page.locator('.k-tab[data-tab="mittag"]').click();
  1576 |     await page.waitForTimeout(3000);
```