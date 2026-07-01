# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: meine-bestellungen.spec.js >> T-MB-01 Unified Order View – DOM-Struktur (AK-MB-01, AK-MB-06) >> T-MB-01-02 renderMyOrders Funktion existiert
- Location: tests\meine-bestellungen.spec.js:14:3

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
    - generic [ref=e3]:
      - link "Dorfladen" [ref=e4] [cursor=pointer]:
        - /url: /
        - img "Dorfladen" [ref=e5]
      - generic [ref=e6]:
        - text: Online bestellen
        - generic [ref=e7]: Abholen im Dorfladen
      - button "Heute · NM 17:30–19:00" [ref=e9] [cursor=pointer]:
        - img
        - generic [ref=e10]: Heute · NM 17:30–19:00
        - img
      - link "Shop Verwaltung" [ref=e11] [cursor=pointer]:
        - /url: /shop-admin.html
        - img
      - button "Meine Bestellungen" [ref=e12] [cursor=pointer]:
        - img
      - button "Anmelden" [ref=e13] [cursor=pointer]:
        - img
      - button "Warenkorb" [ref=e15] [cursor=pointer]:
        - img
    - generic [ref=e16] [cursor=pointer]: 🔑 Anmelden um zu bestellen und Bestellhistorie zu sehen
    - searchbox "Artikel suchen..." [ref=e18]
    - generic [ref=e19]:
      - generic [ref=e20] [cursor=pointer]:
        - img [ref=e21]
        - text: Beliebt
      - generic [ref=e23]:
        - generic [ref=e24] [cursor=pointer]:
          - img [ref=e25]
          - text: Backwaren
        - generic [ref=e31] [cursor=pointer]:
          - img [ref=e32]
          - text: Molkereiprodukte
        - generic [ref=e35] [cursor=pointer]:
          - img [ref=e36]
          - text: Obst und Gemüse
        - generic [ref=e39] [cursor=pointer]:
          - img [ref=e40]
          - text: Diät und Kindernahrung
        - generic [ref=e43] [cursor=pointer]:
          - img [ref=e44]
          - text: Eier
        - generic [ref=e46] [cursor=pointer]:
          - img [ref=e47]
          - text: Eis
        - generic [ref=e51] [cursor=pointer]:
          - img [ref=e52]
          - text: Fleisch und Wurstwaren
        - generic [ref=e56] [cursor=pointer]:
          - img [ref=e57]
          - text: Gewürze
        - generic [ref=e60] [cursor=pointer]:
          - img [ref=e61]
          - text: Lebensmittel
        - generic [ref=e64] [cursor=pointer]:
          - img [ref=e65]
          - text: Alle
  - generic [ref=e70]:
    - generic [ref=e72]:
      - button [ref=e73] [cursor=pointer]:
        - img [ref=e74]
      - button [ref=e76] [cursor=pointer]:
        - img [ref=e77]
    - link "15 % Rabatt auf Fleisch & Wurst Ab 1 kg vorbestellen & 15 % sparen Bestellen" [ref=e79] [cursor=pointer]:
      - /url: /fleisch-bestellen
      - generic [ref=e80]:
        - img [ref=e82]
        - generic [ref=e86]:
          - generic [ref=e87]: 15 % Rabatt auf Fleisch & Wurst
          - generic [ref=e88]: Ab 1 kg vorbestellen & 15 % sparen
        - generic [ref=e89]:
          - text: Bestellen
          - img [ref=e90]
    - generic [ref=e93]:
      - img [ref=e94]
      - text: Nur kurz verfügbar
      - generic [ref=e97]: (2)
    - generic [ref=e98]:
      - generic [ref=e99]:
        - button "♡" [ref=e100] [cursor=pointer]
        - generic [ref=e102]:
          - img [ref=e103]
          - text: Nur kurz (bis 02.07.)
        - generic [ref=e106]: 🍦
        - generic [ref=e107]:
          - generic [ref=e108]: Cornetto Erdbeer 120ml
          - generic [ref=e109]: Eis
          - generic [ref=e110]: 1,80 €
        - generic [ref=e111]:
          - generic [ref=e112]:
            - button "-" [ref=e113] [cursor=pointer]
            - spinbutton [ref=e114]: "1"
            - button "+" [ref=e115] [cursor=pointer]
          - button "+ Hinzufügen" [ref=e116] [cursor=pointer]
      - generic [ref=e117]:
        - button "♡" [ref=e118] [cursor=pointer]
        - generic [ref=e119]:
          - generic [ref=e120]:
            - img [ref=e121]
            - text: Nur kurz (bis 02.07.)
          - generic [ref=e124]:
            - img [ref=e125]
            - text: Beliebt
        - generic [ref=e128]: 🍦
        - generic [ref=e129]:
          - generic [ref=e130]: Cornetto Go 110ml
          - generic [ref=e131]: Eis
          - generic [ref=e132]: 1,90 €
        - generic [ref=e133]:
          - generic [ref=e134]:
            - button "-" [ref=e135] [cursor=pointer]
            - spinbutton [ref=e136]: "1"
            - button "+" [ref=e137] [cursor=pointer]
          - button "+ Hinzufügen" [ref=e138] [cursor=pointer]
    - generic [ref=e140]:
      - img [ref=e141]
      - text: Beliebt
      - generic [ref=e144]: (20)
    - generic [ref=e145]:
      - generic [ref=e146]:
        - button "♡" [ref=e147] [cursor=pointer]
        - generic [ref=e149]:
          - img [ref=e150]
          - text: Beliebt
        - generic [ref=e153]: 🥚
        - generic [ref=e154]:
          - generic [ref=e155]: 1 Kg Schachtel 18 St.
          - generic [ref=e156]: Eier
          - generic [ref=e157]: 6,50 €
        - generic [ref=e158]:
          - generic [ref=e159]:
            - button "-" [ref=e160] [cursor=pointer]
            - spinbutton [ref=e161]: "1"
            - button "+" [ref=e162] [cursor=pointer]
          - button "+ Hinzufügen" [ref=e163] [cursor=pointer]
      - generic [ref=e164]:
        - button "♡" [ref=e165] [cursor=pointer]
        - generic [ref=e167]:
          - img [ref=e168]
          - text: Beliebt
        - generic [ref=e171]: 🍎
        - generic [ref=e172]:
          - generic [ref=e173]: Äpfel Gala BIO
          - generic [ref=e174]: Obst und Gemüse
          - generic [ref=e175]: 3,60 € /1 kg
        - generic [ref=e176]:
          - generic [ref=e177]:
            - button "-" [ref=e178] [cursor=pointer]
            - spinbutton [ref=e179]: "500"
            - button "+" [ref=e180] [cursor=pointer]
          - generic [ref=e181]: g
          - button "+ Hinzufügen" [ref=e182] [cursor=pointer]
      - generic [ref=e183]:
        - button "♡" [ref=e184] [cursor=pointer]
        - generic [ref=e186]:
          - img [ref=e187]
          - text: Beliebt
        - generic [ref=e190]:
          - generic [ref=e191]: BGL Bio Quark Laktosefrei 250 g
          - generic [ref=e192]: Molkereiprodukte
          - generic [ref=e193]: 1,59 € /250 g
        - generic [ref=e194]:
          - generic [ref=e195]:
            - button "-" [ref=e196] [cursor=pointer]
            - spinbutton [ref=e197]: "1"
            - button "+" [ref=e198] [cursor=pointer]
          - button "+ Hinzufügen" [ref=e199] [cursor=pointer]
      - generic [ref=e200]:
        - button "♡" [ref=e201] [cursor=pointer]
        - generic [ref=e202]:
          - generic [ref=e203]:
            - img [ref=e204]
            - text: Beliebt
          - generic [ref=e207]: "-6%"
        - generic [ref=e208]:
          - generic [ref=e209]: BGL Bio Schlagrahm laktosefrei 200g
          - generic [ref=e210]: Molkereiprodukte
          - generic [ref=e211]: 1,59 € /200 g
        - generic [ref=e212]:
          - generic [ref=e213]:
            - button "-" [ref=e214] [cursor=pointer]
            - spinbutton [ref=e215]: "1"
            - button "+" [ref=e216] [cursor=pointer]
          - button "+ Hinzufügen" [ref=e217] [cursor=pointer]
      - generic [ref=e218]:
        - button "♡" [ref=e219] [cursor=pointer]
        - generic [ref=e221]:
          - img [ref=e222]
          - text: Beliebt
        - generic [ref=e225]:
          - generic [ref=e226]: Breze
          - generic [ref=e227]: Backwaren
          - generic [ref=e228]: 0,90 €
        - generic [ref=e229]:
          - generic [ref=e230]:
            - button "-" [ref=e231] [cursor=pointer]
            - spinbutton [ref=e232]: "1"
            - button "+" [ref=e233] [cursor=pointer]
          - button "+ Hinzufügen" [ref=e234] [cursor=pointer]
      - generic [ref=e235]:
        - button "♡" [ref=e236] [cursor=pointer]
        - generic [ref=e238]:
          - img [ref=e239]
          - text: Beliebt
        - generic [ref=e242]:
          - generic [ref=e243]: Buttercroissant
          - generic [ref=e244]: Backwaren
          - generic [ref=e245]: 1,60 €
        - generic [ref=e246]:
          - generic [ref=e247]:
            - button "-" [ref=e248] [cursor=pointer]
            - spinbutton [ref=e249]: "1"
            - button "+" [ref=e250] [cursor=pointer]
          - button "+ Hinzufügen" [ref=e251] [cursor=pointer]
  - generic [ref=e252]:
    - generic [ref=e253]:
      - heading "Warenkorb" [level=3] [ref=e254]:
        - img [ref=e255]
        - text: Warenkorb
      - button [ref=e259] [cursor=pointer]:
        - img [ref=e260]
    - generic [ref=e265]:
      - generic [ref=e266]: 🛒
      - paragraph [ref=e267]: Ihr Warenkorb ist leer
      - paragraph [ref=e268]: Fügen Sie Artikel hinzu, um zu bestellen
  - generic [ref=e269]: ⚠ TEST-UMGEBUNG – Nicht die Live-Seite!
```

# Test source

```ts
  1   | // @ts-check
  2   | const { test, expect } = require('@playwright/test');
  3   | 
  4   | const BASE = process.env.BASE_URL || 'https://witty-island-064f9d903.7.azurestaticapps.net';
  5   | 
  6   | test.describe('T-MB-01 Unified Order View – DOM-Struktur (AK-MB-01, AK-MB-06)', () => {
  7   |   test('T-MB-01-01 loadMyOrders Funktion existiert', async ({ page }) => {
  8   |     await page.goto(BASE + '/shop');
  9   |     await page.waitForLoadState('networkidle');
  10  |     const exists = await page.evaluate(() => typeof loadMyOrders === 'function');
  11  |     expect(exists).toBe(true);
  12  |   });
  13  | 
  14  |   test('T-MB-01-02 renderMyOrders Funktion existiert', async ({ page }) => {
  15  |     await page.goto(BASE + '/shop');
  16  |     await page.waitForLoadState('networkidle');
  17  |     const exists = await page.evaluate(() => typeof renderMyOrders === 'function');
> 18  |     expect(exists).toBe(true);
      |                    ^ Error: expect(received).toBe(expected) // Object.is equality
  19  |   });
  20  | 
  21  |   test('T-MB-01-03 _myOrdersFilter Default ist open', async ({ page }) => {
  22  |     await page.goto(BASE + '/shop');
  23  |     await page.waitForLoadState('networkidle');
  24  |     const val = await page.evaluate(() => _myOrdersFilter);
  25  |     expect(val).toBe('open');
  26  |   });
  27  | 
  28  |   test('T-MB-01-04 shop-history-btn existiert im DOM', async ({ page }) => {
  29  |     await page.goto(BASE + '/shop');
  30  |     await page.waitForLoadState('networkidle');
  31  |     const el = await page.$('#shop-history-btn');
  32  |     expect(el).not.toBeNull();
  33  |   });
  34  | });
  35  | 
  36  | test.describe('T-MB-06 Filter-Tabs HTML (AK-MB-06)', () => {
  37  |   test('T-MB-06-01 Filter-Buttons werden nach Login + Klick auf Bestellungen gerendert', async ({ page }) => {
  38  |     await page.goto(BASE + '/shop');
  39  |     await page.waitForLoadState('networkidle');
  40  | 
  41  |     // Inject mock data to avoid needing real login
  42  |     const filterButtons = await page.evaluate(() => {
  43  |       // Simulate cached orders
  44  |       if (typeof _myOrdersCache !== 'undefined') {
  45  |         window._myOrdersCache = [
  46  |           { _type: 'shop', _isOpen: true, _sortDate: new Date().toISOString(), status: 0, bestelldatum: new Date().toISOString(), gesamtsumme: 25, positionen: [], bestellnummer: 'DL-TEST-01' }
  47  |         ];
  48  |         window._myOrdersFilter = 'open';
  49  |         if (typeof renderMyOrders === 'function') renderMyOrders();
  50  |         var btns = document.querySelectorAll('[data-order-filter]');
  51  |         return Array.from(btns).map(function(b) { return b.getAttribute('data-order-filter'); });
  52  |       }
  53  |       return [];
  54  |     });
  55  |     // If we got filter buttons, verify all 4 exist
  56  |     if (filterButtons.length > 0) {
  57  |       expect(filterButtons).toContain('open');
  58  |       expect(filterButtons).toContain('7d');
  59  |       expect(filterButtons).toContain('30d');
  60  |       expect(filterButtons).toContain('all');
  61  |     }
  62  |   });
  63  | });
  64  | 
  65  | test.describe('T-MB-07 Filter-Logik (AK-MB-07, AK-MB-08, AK-MB-09, AK-MB-10)', () => {
  66  |   test('T-MB-07-01 Filter open zeigt nur offene Bestellungen', async ({ page }) => {
  67  |     await page.goto(BASE + '/shop');
  68  |     await page.waitForLoadState('networkidle');
  69  | 
  70  |     const result = await page.evaluate(() => {
  71  |       var orders = [
  72  |         { _type: 'shop', _isOpen: true, _sortDate: new Date().toISOString(), status: 0, bestelldatum: new Date().toISOString(), gesamtsumme: 10, positionen: [], bestellnummer: 'DL-TEST-A1' },
  73  |         { _type: 'shop', _isOpen: false, _sortDate: new Date().toISOString(), status: 3, bestelldatum: new Date().toISOString(), gesamtsumme: 20, positionen: [], bestellnummer: 'DL-TEST-A2' },
  74  |         { _type: 'fm', _isOpen: true, _sortDate: new Date().toISOString(), status: 0, bestelldatum: new Date().toISOString(), gesamtsumme: 30, positionen: [], bestellnummer: 'FM-TEST-A3' },
  75  |         { _type: 'fm', _isOpen: false, _sortDate: new Date().toISOString(), status: 4, bestelldatum: new Date().toISOString(), gesamtsumme: 40, positionen: [], bestellnummer: 'FM-TEST-A4' }
  76  |       ];
  77  |       window._myOrdersCache = orders;
  78  |       window._myOrdersFilter = 'open';
  79  |       renderMyOrders();
  80  |       var cards = document.querySelectorAll('.shop-order-card');
  81  |       return cards.length;
  82  |     });
  83  |     expect(result).toBe(2); // only 2 open orders
  84  |   });
  85  | 
  86  |   test('T-MB-07-02 Filter all zeigt alle Bestellungen', async ({ page }) => {
  87  |     await page.goto(BASE + '/shop');
  88  |     await page.waitForLoadState('networkidle');
  89  | 
  90  |     const result = await page.evaluate(() => {
  91  |       var orders = [
  92  |         { _type: 'shop', _isOpen: true, _sortDate: new Date().toISOString(), status: 0, bestelldatum: new Date().toISOString(), gesamtsumme: 10, positionen: [], bestellnummer: 'DL-TEST-B1' },
  93  |         { _type: 'shop', _isOpen: false, _sortDate: new Date().toISOString(), status: 3, bestelldatum: new Date().toISOString(), gesamtsumme: 20, positionen: [], bestellnummer: 'DL-TEST-B2' },
  94  |         { _type: 'fm', _isOpen: true, _sortDate: new Date().toISOString(), status: 1, bestelldatum: new Date().toISOString(), gesamtsumme: 30, positionen: [], bestellnummer: 'FM-TEST-B3' }
  95  |       ];
  96  |       window._myOrdersCache = orders;
  97  |       window._myOrdersFilter = 'all';
  98  |       renderMyOrders();
  99  |       var cards = document.querySelectorAll('.shop-order-card');
  100 |       return cards.length;
  101 |     });
  102 |     expect(result).toBe(3);
  103 |   });
  104 | 
  105 |   test('T-MB-07-03 Filter 7d zeigt nur Bestellungen der letzten 7 Tage', async ({ page }) => {
  106 |     await page.goto(BASE + '/shop');
  107 |     await page.waitForLoadState('networkidle');
  108 | 
  109 |     const result = await page.evaluate(() => {
  110 |       var now = new Date();
  111 |       var recent = new Date(now.getTime() - 2 * 86400000).toISOString(); // 2 days ago
  112 |       var old = new Date(now.getTime() - 10 * 86400000).toISOString(); // 10 days ago
  113 |       var orders = [
  114 |         { _type: 'shop', _isOpen: false, _sortDate: recent, status: 3, bestelldatum: recent, gesamtsumme: 10, positionen: [], bestellnummer: 'DL-TEST-C1' },
  115 |         { _type: 'shop', _isOpen: false, _sortDate: old, status: 3, bestelldatum: old, gesamtsumme: 20, positionen: [], bestellnummer: 'DL-TEST-C2' }
  116 |       ];
  117 |       window._myOrdersCache = orders;
  118 |       window._myOrdersFilter = '7d';
```