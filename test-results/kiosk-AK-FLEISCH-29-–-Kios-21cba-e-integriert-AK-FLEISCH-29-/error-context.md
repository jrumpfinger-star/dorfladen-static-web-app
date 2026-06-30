# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.js >> AK-FLEISCH-29 – Kiosk UI-Verbesserungen >> T-29-06 Aufklappen-Button ist in Stats-Zeile integriert (AK-FLEISCH-29)
- Location: tests\kiosk.spec.js:1631:3

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 1
Received:    0
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
        - generic [ref=e29]: 13:23:41
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
    - generic [ref=e52] [cursor=pointer]:
      - img [ref=e54]
      - text: Stammkunden
    - generic [ref=e59] [cursor=pointer]:
      - img [ref=e61]
      - text: Metzger
      - generic "6 in Bestellung" [ref=e66]: "6"
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
      - button "Überfällig 0" [ref=e90] [cursor=pointer]:
        - img [ref=e91]
        - generic [ref=e93]: Überfällig
        - generic [ref=e94]: "0"
      - button "Historie 37" [ref=e95] [cursor=pointer]:
        - img [ref=e96]
        - generic [ref=e100]: Historie
        - generic [ref=e101]: "37"
    - generic [ref=e103]:
      - generic [ref=e104]: "1"
      - generic [ref=e105]: Warten
    - generic [ref=e108] [cursor=pointer]:
      - generic [ref=e109]: ▼
      - text: 02.07.2026 · Vormittag (07:30–14:00)
      - generic [ref=e111]:
        - img [ref=e112]
        - text: 1 Warten
  - generic [ref=e115]: ⚠ TEST-UMGEBUNG – Nicht die Live-Seite!
```

# Test source

```ts
  1537 |     if (!kioskData.success || !kioskData.bestellungen || kioskData.bestellungen.length === 0) {
  1538 |       test.skip(true, 'Keine Metzger-Bestellungen');
  1539 |       return;
  1540 |     }
  1541 |     const liefertag = kioskData.bestellungen[0].liefertag;
  1542 |     if (!liefertag) {
  1543 |       test.skip(true, 'Kein Liefertag');
  1544 |       return;
  1545 |     }
  1546 |     const resp = await request.get(`${BASE}/api/fleisch-order?liefertag=${liefertag}`);
  1547 |     expect(resp.status()).toBe(200);
  1548 |     const data = await resp.json();
  1549 |     expect(data.success).toBe(true);
  1550 |     // New field: einzelpositionen (not aggregiert)
  1551 |     expect(Array.isArray(data.einzelpositionen)).toBe(true);
  1552 |     expect(data.aggregiert).toBeUndefined();
  1553 |     if (data.einzelpositionen.length > 0) {
  1554 |       const ep = data.einzelpositionen[0];
  1555 |       expect(typeof ep.bezeichnung).toBe('string');
  1556 |       expect(typeof ep.kunde).toBe('string');
  1557 |       expect(typeof ep.menge_kg).toBe('number');
  1558 |     }
  1559 |   });
  1560 | 
  1561 |   test('T-24-06 Metzger Status-Workflow: kein Status 2 Button (AK-FLEISCH-24)', async ({ page }) => {
  1562 |     await page.goto(KIOSK_URL);
  1563 |     await page.locator('.k-tab[data-tab="metzger"]').click();
  1564 |     await page.waitForTimeout(3000);
  1565 |     // No "Eingetroffen" or status 2 button should exist
  1566 |     const eingetroffenBtn = page.locator('#metzger-orders button:has-text("Eingetroffen")');
  1567 |     await expect(eingetroffenBtn).toHaveCount(0);
  1568 |   });
  1569 | });
  1570 | 
  1571 | // ════════════════════════════════════════════════════
  1572 | //  Mittagstisch – UI/UX Optimierung (AK-FLEISCH-25)
  1573 | // ════════════════════════════════════════════════════
  1574 | 
  1575 | test.describe('Kiosk – Mittagstisch UI/UX (AK-FLEISCH-25)', () => {
  1576 | 
  1577 |   test('T-25-01 Mittagstisch Karten haben Lucide chevron-down Icons (AK-FLEISCH-25)', async ({ page }) => {
  1578 |     await page.goto(KIOSK_URL);
  1579 |     await page.locator('.k-tab[data-tab="mittag"]').click();
  1580 |     await page.waitForTimeout(3000);
  1581 |     const cards = page.locator('#mittag-orders .k-order');
  1582 |     const count = await cards.count();
  1583 |     if (count === 0) {
  1584 |       test.skip(true, 'Keine Mittagstisch-Bestellungen');
  1585 |       return;
  1586 |     }
  1587 |     // Arrow should be Lucide icon (rendered as SVG by lucide.createIcons)
  1588 |     const arrow = cards.first().locator('.k-oc-arrow svg');
  1589 |     await expect(arrow).toHaveCount(1);
  1590 |   });
  1591 | 
  1592 |   test('T-25-02 Mittagstisch Header zeigt Preis (AK-FLEISCH-25)', async ({ page }) => {
  1593 |     await page.goto(KIOSK_URL);
  1594 |     await page.locator('.k-tab[data-tab="mittag"]').click();
  1595 |     await page.waitForTimeout(3000);
  1596 |     const cards = page.locator('#mittag-orders .k-order');
  1597 |     const count = await cards.count();
  1598 |     if (count === 0) {
  1599 |       test.skip(true, 'Keine Mittagstisch-Bestellungen');
  1600 |       return;
  1601 |     }
  1602 |     const headerText = await cards.first().locator('.k-order-hdr').textContent();
  1603 |     expect(headerText).toContain('€');
  1604 |   });
  1605 | 
  1606 |   test('T-25-03 Collapse-Toggle kompakt (AK-FLEISCH-25)', async ({ page }) => {
  1607 |     await page.goto(KIOSK_URL);
  1608 |     await page.locator('.k-tab[data-tab="mittag"]').click();
  1609 |     await page.locator('#mittag-status-bar .k-filter-btn[data-mt-filter="alle"]').click();
  1610 |     await page.waitForTimeout(2000);
  1611 |     const cards = page.locator('#mittag-orders .k-order');
  1612 |     const count = await cards.count();
  1613 |     if (count <= 1) {
  1614 |       test.skip(true, 'Zu wenig Bestellungen für Toggle');
  1615 |       return;
  1616 |     }
  1617 |     // Toggle button should exist and be compact (short text)
  1618 |     const toggleBtn = page.locator('#mittag-orders button:has-text("Alle"), #mittag-orders button:has-text("Zu")');
  1619 |     await expect(toggleBtn).toHaveCount(1);
  1620 |     const height = await toggleBtn.evaluate(el => parseInt(getComputedStyle(el).minHeight) || el.offsetHeight);
  1621 |     expect(height).toBeLessThanOrEqual(36);
  1622 |   });
  1623 | });
  1624 | 
  1625 | // ═══════════════════════════════════════════════════════════
  1626 | // AK-FLEISCH-29 – Kiosk UI-Verbesserungen (kiosk.spec.js)
  1627 | // ═══════════════════════════════════════════════════════════
  1628 | 
  1629 | test.describe('AK-FLEISCH-29 – Kiosk UI-Verbesserungen', () => {
  1630 | 
  1631 |   test('T-29-06 Aufklappen-Button ist in Stats-Zeile integriert (AK-FLEISCH-29)', async ({ page }) => {
  1632 |     await page.goto(KIOSK_URL);
  1633 |     await page.waitForTimeout(3000);
  1634 |     // Button should be inside #abhol-stats, not standalone
  1635 |     const btn = page.locator('#abhol-stats button:has-text("Aufklappen"), #abhol-stats button:has-text("Zuklappen")');
  1636 |     const count = await btn.count();
> 1637 |     expect(count).toBeGreaterThanOrEqual(1);
       |                   ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
  1638 |   });
  1639 | 
  1640 |   test('T-29-07 Shop-Karten haben sichtbaren Zurueck-Button (AK-FLEISCH-29)', async ({ page }) => {
  1641 |     await page.goto(KIOSK_URL);
  1642 |     await page.waitForTimeout(3000);
  1643 |     // revertShopStatus must exist in page source
  1644 |     const hasRevert = await page.evaluate(() => document.documentElement.innerHTML.includes('revertShopStatus'));
  1645 |     expect(hasRevert).toBe(true);
  1646 |     // undo-2 icon should be in the page (Zurück button uses it)
  1647 |     const hasUndo = await page.evaluate(() => document.documentElement.innerHTML.includes('undo-2'));
  1648 |     expect(hasUndo).toBe(true);
  1649 |   });
  1650 | 
  1651 |   test('T-29-08 Ring-Label-Wide CSS existiert (AK-FLEISCH-29)', async ({ page }) => {
  1652 |     await page.goto(KIOSK_URL);
  1653 |     await page.waitForTimeout(3000);
  1654 |     const hasClass = await page.evaluate(() => {
  1655 |       for (const sheet of document.styleSheets) {
  1656 |         try {
  1657 |           for (const rule of sheet.cssRules) {
  1658 |             if (rule.selectorText && rule.selectorText.includes('ring-label-wide')) return true;
  1659 |           }
  1660 |         } catch(e) {}
  1661 |       }
  1662 |       return false;
  1663 |     });
  1664 |     expect(hasClass).toBe(true);
  1665 |   });
  1666 | 
  1667 |   test('T-29-09 Mittagstisch 2-Spalten Grid ab 900px (AK-FLEISCH-29)', async ({ page }) => {
  1668 |     await page.goto(KIOSK_URL);
  1669 |     await page.waitForTimeout(3000);
  1670 |     const hasRule = await page.evaluate(() => {
  1671 |       for (const sheet of document.styleSheets) {
  1672 |         try {
  1673 |           for (const rule of sheet.cssRules) {
  1674 |             if (rule.cssText && rule.cssText.includes('mittag-orders') && rule.cssText.includes('grid-template-columns')) return true;
  1675 |           }
  1676 |         } catch(e) {}
  1677 |       }
  1678 |       return false;
  1679 |     });
  1680 |     expect(hasRule).toBe(true);
  1681 |   });
  1682 | });
  1683 | 
```