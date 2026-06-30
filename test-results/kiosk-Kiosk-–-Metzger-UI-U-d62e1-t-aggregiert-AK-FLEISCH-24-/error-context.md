# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.js >> Kiosk – Metzger UI/UX (AK-FLEISCH-24) >> T-24-05 Sammelbestellung API liefert einzelpositionen statt aggregiert (AK-FLEISCH-24)
- Location: tests\kiosk.spec.js:1529:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
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
  1476 |     await expect(arrow).toHaveCount(1);
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
> 1547 |     expect(Array.isArray(data.einzelpositionen)).toBe(true);
       |                                                  ^ Error: expect(received).toBe(expected) // Object.is equality
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
  1577 |     const cards = page.locator('#mittag-orders .k-order');
  1578 |     const count = await cards.count();
  1579 |     if (count === 0) {
  1580 |       test.skip(true, 'Keine Mittagstisch-Bestellungen');
  1581 |       return;
  1582 |     }
  1583 |     // Arrow should be Lucide icon
  1584 |     const arrow = cards.first().locator('.k-oc-arrow i[data-lucide="chevron-down"]');
  1585 |     await expect(arrow).toHaveCount(1);
  1586 |   });
  1587 | 
  1588 |   test('T-25-02 Mittagstisch Header zeigt Preis (AK-FLEISCH-25)', async ({ page }) => {
  1589 |     await page.goto(KIOSK_URL);
  1590 |     await page.locator('.k-tab[data-tab="mittag"]').click();
  1591 |     await page.waitForTimeout(3000);
  1592 |     const cards = page.locator('#mittag-orders .k-order');
  1593 |     const count = await cards.count();
  1594 |     if (count === 0) {
  1595 |       test.skip(true, 'Keine Mittagstisch-Bestellungen');
  1596 |       return;
  1597 |     }
  1598 |     const headerText = await cards.first().locator('.k-order-hdr').textContent();
  1599 |     expect(headerText).toContain('€');
  1600 |   });
  1601 | 
  1602 |   test('T-25-03 Collapse-Toggle kompakt (AK-FLEISCH-25)', async ({ page }) => {
  1603 |     await page.goto(KIOSK_URL);
  1604 |     await page.locator('.k-tab[data-tab="mittag"]').click();
  1605 |     await page.locator('#mittag-status-bar .k-filter-btn[data-mt-filter="alle"]').click();
  1606 |     await page.waitForTimeout(2000);
  1607 |     const cards = page.locator('#mittag-orders .k-order');
  1608 |     const count = await cards.count();
  1609 |     if (count <= 1) {
  1610 |       test.skip(true, 'Zu wenig Bestellungen für Toggle');
  1611 |       return;
  1612 |     }
  1613 |     // Toggle button should exist and be compact (short text)
  1614 |     const toggleBtn = page.locator('#mittag-orders button:has-text("Alle"), #mittag-orders button:has-text("Zu")');
  1615 |     await expect(toggleBtn).toHaveCount(1);
  1616 |     const height = await toggleBtn.evaluate(el => parseInt(getComputedStyle(el).minHeight) || el.offsetHeight);
  1617 |     expect(height).toBeLessThanOrEqual(36);
  1618 |   });
  1619 | });
  1620 | 
```