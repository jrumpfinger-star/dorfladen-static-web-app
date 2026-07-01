# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.js >> Kiosk – Mittagstisch UI/UX (AK-FLEISCH-25) >> T-25-03 Collapse-Toggle kompakt (AK-FLEISCH-25)
- Location: tests\kiosk.spec.js:1606:3

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('#mittag-orders button:has-text("Alle"), #mittag-orders button:has-text("Zu")')
Expected: 1
Received: 0
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for locator('#mittag-orders button:has-text("Alle"), #mittag-orders button:has-text("Zu")')
    13 × locator resolved to 0 elements
       - unexpected value "0"

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - heading "Dorfladen Kiosk" [level=1] [ref=e3]:
      - img [ref=e4]
      - text: Dorfladen Kiosk
    - generic [ref=e8]:
      - generic "2 Bestellungen heute" [ref=e9]:
        - img [ref=e10]
      - generic [ref=e27]:
        - generic [ref=e28]: Dienstag, 30. Juni 2026
        - generic [ref=e29]: 22:57:20
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
  - generic [ref=e84]:
    - generic [ref=e85]:
      - button "Gestern 29.06" [ref=e86] [cursor=pointer]:
        - generic [ref=e87]: Gestern
        - generic [ref=e88]: "29.06"
      - button "Heute 30.06" [ref=e89] [cursor=pointer]:
        - generic [ref=e90]: Heute
        - generic [ref=e91]: "30.06"
      - button "Morgen 01.07" [ref=e92] [cursor=pointer]:
        - generic [ref=e93]: Morgen
        - generic [ref=e94]: "01.07"
      - button "Do 02.07" [ref=e95] [cursor=pointer]:
        - generic [ref=e96]: Do
        - generic [ref=e97]: "02.07"
      - button "Fr 03.07" [ref=e98] [cursor=pointer]:
        - generic [ref=e99]: Fr
        - generic [ref=e100]: "03.07"
      - button "Sa 04.07" [ref=e101] [cursor=pointer]:
        - generic [ref=e102]: Sa
        - generic [ref=e103]: "04.07"
      - button "So 05.07" [ref=e104] [cursor=pointer]:
        - generic [ref=e105]: So
        - generic [ref=e106]: "05.07"
    - generic [ref=e107]:
      - button "Offen 1" [ref=e108] [cursor=pointer]:
        - img [ref=e109]
        - generic [ref=e112]: Offen
        - generic [ref=e113]: "1"
      - button "Nachrichten 0" [ref=e114] [cursor=pointer]:
        - img [ref=e115]
        - generic [ref=e117]: Nachrichten
        - generic [ref=e118]: "0"
      - button "Erledigt 2" [ref=e119] [cursor=pointer]:
        - img [ref=e120]
        - generic [ref=e123]: Erledigt
        - generic [ref=e124]: "2"
      - button "Alle 3" [active] [ref=e125] [cursor=pointer]:
        - generic [ref=e126]: Alle
        - generic [ref=e127]: "3"
      - button "Alle" [ref=e129] [cursor=pointer]:
        - img [ref=e130]
        - text: Alle
    - generic [ref=e133]:
      - generic [ref=e134]:
        - generic [ref=e135] [cursor=pointer]:
          - generic [ref=e136]: ▼
          - generic [ref=e137]: 5× Kaspressknödl mit Tsatsiki und Salat (1 Mitn.)
        - generic [ref=e138]:
          - generic [ref=e140] [cursor=pointer]:
            - img [ref=e142]
            - generic [ref=e144]: Martl
            - generic [ref=e145]: 26,40 €
            - generic [ref=e146]: 3×
            - generic [ref=e147]:
              - generic [ref=e148]: Telefon
              - generic [ref=e149]:
                - img [ref=e150]
                - text: MIT
            - img [ref=e156]
          - generic [ref=e160] [cursor=pointer]:
            - img [ref=e162]
            - generic [ref=e164]: Josef Rumpfinger
            - generic [ref=e165]: 17,60 €
            - generic [ref=e166]: 2×
            - generic [ref=e167]:
              - generic [ref=e168]: Online
              - generic "Anmerkung" [ref=e169]:
                - img [ref=e170]
            - img [ref=e174]
      - generic [ref=e177]:
        - generic [ref=e178] [cursor=pointer]:
          - generic [ref=e179]: ▼
          - generic [ref=e180]: 3× Thai Curry mit Reis oder Pommes
        - generic [ref=e183] [cursor=pointer]:
          - img [ref=e185]
          - generic [ref=e187]: Josef Rumpfinger
          - generic [ref=e188]: 26,40 €
          - generic [ref=e189]: 3×
          - generic [ref=e191]: Online
          - generic [ref=e192]:
            - button "Abgeholt" [ref=e193]:
              - img [ref=e194]
              - generic [ref=e199]: Abgeholt
            - button [ref=e200]:
              - img [ref=e201]
  - generic [ref=e204]:
    - button "Neue Telefonbestellung" [disabled] [ref=e205] [cursor=pointer]:
      - img [ref=e206]
      - text: Neue Telefonbestellung
    - button "Küchenliste drucken" [ref=e208] [cursor=pointer]:
      - img [ref=e209]
      - text: Küchenliste drucken
  - generic [ref=e213]: ⚠ TEST-UMGEBUNG – Nicht die Live-Seite!
```

# Test source

```ts
  1519 |     await page.locator('.k-tab[data-tab="metzger"]').click();
  1520 |     await page.waitForTimeout(3000);
  1521 |     // Check sort via data attribute dates
  1522 |     const dates = await page.evaluate(() => {
  1523 |       const cards = document.querySelectorAll('#metzger-orders .k-order');
  1524 |       return Array.from(cards).map(c => c.getAttribute('data-fmdate') || '');
  1525 |     });
  1526 |     if (dates.length >= 2) {
  1527 |       for (let i = 1; i < dates.length; i++) {
  1528 |         expect(dates[i] >= dates[i - 1]).toBe(true);
  1529 |       }
  1530 |     }
  1531 |   });
  1532 | 
  1533 |   test('T-24-05 Sammelbestellung API liefert einzelpositionen statt aggregiert (AK-FLEISCH-24)', async ({ request }) => {
  1534 |     // Find next delivery date from API
  1535 |     const kiosk = await request.get(`${BASE}/api/fleisch-order?mode=kiosk`);
  1536 |     const kioskData = await kiosk.json();
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
> 1619 |     await expect(toggleBtn).toHaveCount(1);
       |                             ^ Error: expect(locator).toHaveCount(expected) failed
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
  1634 |     // Verify the code adds the button into abhol-stats (source check)
  1635 |     const hasIntegration = await page.evaluate(() => {
  1636 |       var src = document.documentElement.innerHTML;
  1637 |       return src.includes('abhol-stats') && src.includes('expandAllShopCards') && src.includes('collapseAllShopCards');
  1638 |     });
  1639 |     expect(hasIntegration).toBe(true);
  1640 |   });
  1641 | 
  1642 |   test('T-29-07 Shop-Karten haben sichtbaren Zurueck-Button (AK-FLEISCH-29)', async ({ page }) => {
  1643 |     await page.goto(KIOSK_URL);
  1644 |     await page.waitForTimeout(3000);
  1645 |     // revertShopStatus must exist in page source
  1646 |     const hasRevert = await page.evaluate(() => document.documentElement.innerHTML.includes('revertShopStatus'));
  1647 |     expect(hasRevert).toBe(true);
  1648 |     // undo-2 icon should be in the page (Zurück button uses it)
  1649 |     const hasUndo = await page.evaluate(() => document.documentElement.innerHTML.includes('undo-2'));
  1650 |     expect(hasUndo).toBe(true);
  1651 |   });
  1652 | 
  1653 |   test('T-29-08 Ring-Label-Wide CSS existiert (AK-FLEISCH-29)', async ({ page }) => {
  1654 |     await page.goto(KIOSK_URL);
  1655 |     await page.waitForTimeout(3000);
  1656 |     const hasClass = await page.evaluate(() => {
  1657 |       for (const sheet of document.styleSheets) {
  1658 |         try {
  1659 |           for (const rule of sheet.cssRules) {
  1660 |             if (rule.selectorText && rule.selectorText.includes('ring-label-wide')) return true;
  1661 |           }
  1662 |         } catch(e) {}
  1663 |       }
  1664 |       return false;
  1665 |     });
  1666 |     expect(hasClass).toBe(true);
  1667 |   });
  1668 | 
  1669 |   test('T-29-09 Mittagstisch 2-Spalten Grid ab 900px (AK-FLEISCH-29)', async ({ page }) => {
  1670 |     await page.goto(KIOSK_URL);
  1671 |     await page.waitForTimeout(3000);
  1672 |     const hasRule = await page.evaluate(() => {
  1673 |       for (const sheet of document.styleSheets) {
  1674 |         try {
  1675 |           for (const rule of sheet.cssRules) {
  1676 |             if (rule.cssText && rule.cssText.includes('mittag-orders') && rule.cssText.includes('grid-template-columns')) return true;
  1677 |           }
  1678 |         } catch(e) {}
  1679 |       }
  1680 |       return false;
  1681 |     });
  1682 |     expect(hasRule).toBe(true);
  1683 |   });
  1684 | 
  1685 |   test('T-29-12 Mute-Button existiert im Header (AK-FLEISCH-29)', async ({ page }) => {
  1686 |     await page.goto(KIOSK_URL);
  1687 |     await page.waitForTimeout(3000);
  1688 |     const muteBtn = page.locator('#k-mute-btn');
  1689 |     await expect(muteBtn).toBeVisible();
  1690 |     const hasMuteFn = await page.evaluate(() => typeof K.toggleMute === 'function');
  1691 |     expect(hasMuteFn).toBe(true);
  1692 |   });
  1693 | 
  1694 |   test('T-29-13 Name wird nicht abgeschnitten – kein text-overflow ellipsis (AK-FLEISCH-29)', async ({ page }) => {
  1695 |     await page.goto(KIOSK_URL);
  1696 |     await page.waitForTimeout(3000);
  1697 |     const noEllipsis = await page.evaluate(() => {
  1698 |       for (const sheet of document.styleSheets) {
  1699 |         try {
  1700 |           for (const rule of sheet.cssRules) {
  1701 |             if (rule.selectorText && rule.selectorText.includes('k-oc-name') && rule.style.textOverflow === 'ellipsis') return false;
  1702 |           }
  1703 |         } catch(e) {}
  1704 |       }
  1705 |       return true;
  1706 |     });
  1707 |     expect(noEllipsis).toBe(true);
  1708 |   });
  1709 | 
  1710 |   test('T-29-14 Zurueck-Button ist im Header neben Aktions-Button (AK-FLEISCH-29)', async ({ page }) => {
  1711 |     await page.goto(KIOSK_URL);
  1712 |     await page.waitForTimeout(3000);
  1713 |     const inHeader = await page.evaluate(() => {
  1714 |       var src = document.documentElement.innerHTML;
  1715 |       return src.includes('k-oc-actions') && src.includes('revertShopStatus') && src.includes('Status zurück');
  1716 |     });
  1717 |     expect(inHeader).toBe(true);
  1718 |   });
  1719 | 
```