# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.js >> AK-FLEISCH-29 – Kiosk UI-Verbesserungen >> T-29-13 Name wird nicht abgeschnitten – kein text-overflow ellipsis (AK-FLEISCH-29)
- Location: tests\kiosk.spec.js:1694:3

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
      - generic "2 Bestellungen heute" [ref=e9]:
        - img [ref=e10]
      - generic [ref=e27]:
        - generic [ref=e28]: Dienstag, 30. Juni 2026
        - generic [ref=e29]: 22:57:44
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
      - button "Zu erledigen 3" [ref=e86] [cursor=pointer]:
        - img [ref=e87]
        - generic [ref=e91]: Zu erledigen
        - generic [ref=e92]: "3"
      - button "Heute abholen 0" [ref=e93] [cursor=pointer]:
        - img [ref=e94]
        - generic [ref=e96]: Heute abholen
        - generic [ref=e97]: "0"
      - button "Überfällig 0" [ref=e98] [cursor=pointer]:
        - img [ref=e99]
        - generic [ref=e101]: Überfällig
        - generic [ref=e102]: "0"
      - button "Historie 38" [ref=e103] [cursor=pointer]:
        - img [ref=e104]
        - generic [ref=e108]: Historie
        - generic [ref=e109]: "38"
    - generic [ref=e110]:
      - generic [ref=e111]:
        - generic [ref=e112]: "2"
        - generic [ref=e113]: Packen
      - generic [ref=e114]:
        - generic [ref=e115]: "1"
        - generic [ref=e116]: Warten
      - button "Aufklappen" [ref=e117] [cursor=pointer]:
        - img [ref=e118]
        - text: Aufklappen
    - generic [ref=e121]:
      - generic [ref=e123] [cursor=pointer]:
        - generic [ref=e124]: ▼
        - text: Morgen · Vormittag (07:30–14:00)
        - generic [ref=e126]:
          - img [ref=e127]
          - text: 1 Warten
      - generic [ref=e131] [cursor=pointer]:
        - generic [ref=e132]: ▼
        - text: 02.07.2026 · Vormittag (07:30–14:00)
        - generic [ref=e134]:
          - img [ref=e135]
          - text: 1 Packen
      - generic [ref=e140] [cursor=pointer]:
        - generic [ref=e141]: ▼
        - text: 03.07.2026 · Vormittag (10:00–14:00)
        - generic [ref=e143]:
          - img [ref=e144]
          - text: 1 Packen
  - generic [ref=e148]: ⚠ TEST-UMGEBUNG – Nicht die Live-Seite!
```

# Test source

```ts
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
> 1707 |     expect(noEllipsis).toBe(true);
       |                        ^ Error: expect(received).toBe(expected) // Object.is equality
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
  1720 |   test('T-29-15 metzgerAlleGesendet setzt bestellt und gesendet (AK-FLEISCH-29)', async ({ page }) => {
  1721 |     await page.goto(KIOSK_URL);
  1722 |     await page.waitForTimeout(3000);
  1723 |     const setsBeide = await page.evaluate(() => {
  1724 |       var src = document.documentElement.innerHTML;
  1725 |       return src.includes('p.bestellt=true') && src.includes('p.gesendet=true');
  1726 |     });
  1727 |     expect(setsBeide).toBe(true);
  1728 |   });
  1729 | });
  1730 | 
  1731 | // ════════════════════════════════════════════════════
  1732 | //  Bestellstatus – Lucide Icons
  1733 | // ════════════════════════════════════════════════════
  1734 | 
  1735 | test.describe('Bestellstatus – Lucide Icons', () => {
  1736 |   test('T-29-16 Bestellstatus laedt Lucide Script (AK-FLEISCH-29)', async ({ page }) => {
  1737 |     await page.goto(`${BASE}/bestellstatus`);
  1738 |     await page.waitForTimeout(3000);
  1739 |     const hasLucide = await page.evaluate(() => typeof window.lucide !== 'undefined' && typeof window.lucide.createIcons === 'function');
  1740 |     expect(hasLucide).toBe(true);
  1741 |   });
  1742 | 
  1743 |   test('T-29-17 Bestellstatus hat Lucide Icons statt Emojis (AK-FLEISCH-29)', async ({ page }) => {
  1744 |     await page.goto(`${BASE}/bestellstatus`);
  1745 |     await page.waitForTimeout(3000);
  1746 |     const svgIcons = await page.locator('svg.lucide').count();
  1747 |     expect(svgIcons).toBeGreaterThan(0);
  1748 |   });
  1749 | });
  1750 | 
  1751 | // ═══════════════════════════════════════════════════════════
  1752 | // AK-ST – Storno mit Begründung
  1753 | // ═══════════════════════════════════════════════════════════
  1754 | test.describe('AK-ST – Storno mit Begründung', () => {
  1755 |   test('T-ST-01 Kiosk Shop-Storno ruft showShopStornoDialog auf (AK-ST-02)', async ({ page }) => {
  1756 |     await page.goto(KIOSK_URL);
  1757 |     await page.waitForTimeout(3000);
  1758 |     const content = await page.content();
  1759 |     expect(content).toContain('showShopStornoDialog');
  1760 |     expect(content).toContain('SHOP_STORNO_REASONS');
  1761 |     expect(content).toContain('Stornierungsgrund (Pflichtfeld)');
  1762 |   });
  1763 | 
  1764 |   test('T-ST-02 Kiosk Metzger-Storno ruft showMetzgerStornoDialog auf (AK-ST-03)', async ({ page }) => {
  1765 |     await page.goto(KIOSK_URL);
  1766 |     await page.waitForTimeout(3000);
  1767 |     const content = await page.content();
  1768 |     expect(content).toContain('showMetzgerStornoDialog');
  1769 |     expect(content).toContain('METZGER_STORNO_REASONS');
  1770 |   });
  1771 | 
  1772 |   test('T-ST-03 Kiosk Shop-Storno: Button disabled ohne Grund (AK-ST-02)', async ({ page }) => {
  1773 |     await page.goto(KIOSK_URL);
  1774 |     await page.waitForTimeout(3000);
  1775 |     // Verify that the confirm button starts disabled in the dialog template
  1776 |     const content = await page.content();
  1777 |     expect(content).toContain('storno-shop-confirm');
  1778 |     expect(content).toContain('disabled>Stornieren');
  1779 |   });
  1780 | 
  1781 |   test('T-ST-04 Kiosk Metzger-Storno: Button disabled ohne Grund (AK-ST-03)', async ({ page }) => {
  1782 |     await page.goto(KIOSK_URL);
  1783 |     await page.waitForTimeout(3000);
  1784 |     const content = await page.content();
  1785 |     expect(content).toContain('storno-fm-confirm');
  1786 |     expect(content).toContain('disabled>Stornieren');
  1787 |   });
  1788 | 
  1789 |   test('T-ST-05 Shop-Kundenansicht: Storno hat Pflicht-Grund-Textfeld (AK-ST-07)', async ({ page }) => {
  1790 |     await page.goto(`${BASE}/shop.html`);
  1791 |     await page.waitForTimeout(3000);
  1792 |     const content = await page.content();
  1793 |     expect(content).toContain('data-cancel-reason');
  1794 |     expect(content).toContain('Pflichtfeld');
  1795 |   });
  1796 | 
  1797 |   test('T-ST-06 Bestellstatus Fleisch-Storno: prompt mit Begründung (AK-ST-08)', async ({ page }) => {
  1798 |     await page.goto(`${BASE}/bestellstatus`);
  1799 |     await page.waitForTimeout(3000);
  1800 |     const content = await page.content();
  1801 |     expect(content).toContain('Bitte geben Sie einen Grund an');
  1802 |     expect(content).toContain('Stornierungsgrund');
  1803 |   });
  1804 | 
  1805 |   test('T-ST-07 CMS Shop-Storno: cmsShowShopStornoDialog (AK-ST-05)', async ({ page }) => {
  1806 |     // cms.js is loaded as external script, fetch it directly
  1807 |     const resp = await page.request.get(`${BASE}/cms.js`);
```