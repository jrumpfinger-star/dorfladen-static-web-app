# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: playwright-cms-network.spec.js >> CMS Seite: JSON-Antworten prüfen
- Location: playwright-cms-network.spec.js:6:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: false
Received: true
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "\u001c Zurück zur Hauptseite" [ref=e3] [cursor=pointer]:
    - /url: /index.html
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - img "Dorfladen Oberornau" [ref=e7]
        - heading "Dorfladen CMS" [level=2] [ref=e8]
      - generic [ref=e9]: Lade...
    - generic [ref=e10]:
      - button "Wochenplan" [ref=e11] [cursor=pointer]
      - button "Öffnungszeiten" [ref=e12] [cursor=pointer]
      - button "Angebote" [ref=e13] [cursor=pointer]
      - button "Homepage" [ref=e14] [cursor=pointer]
      - button "Aktuelles" [ref=e15] [cursor=pointer]
      - button "⚙ Design" [ref=e16] [cursor=pointer]
    - generic [ref=e18]:
      - generic [ref=e19]:
        - button "←" [ref=e20] [cursor=pointer]
        - generic [ref=e22]: KW --
        - button "→" [ref=e23] [cursor=pointer]
        - button "Diese Woche" [ref=e24] [cursor=pointer]
        - button "Nächste Woche" [ref=e25] [cursor=pointer]
      - generic [ref=e26]:
        - button "Vorschau" [ref=e27] [cursor=pointer]:
          - img [ref=e28]
          - text: Vorschau
        - button "🖨️ Drucken" [ref=e30] [cursor=pointer]
        - button "Teilen" [ref=e31] [cursor=pointer]:
          - img [ref=e32]
          - text: Teilen
        - button "+ Gericht" [ref=e34] [cursor=pointer]
```

# Test source

```ts
  1  | // playwright-cms-network.spec.js
  2  | // Playwright-Test: Überwacht Netzwerkanfragen und prüft JSON-Antworten
  3  | 
  4  | const { test, expect } = require('@playwright/test');
  5  | 
  6  | test('CMS Seite: JSON-Antworten prüfen', async ({ page }) => {
  7  |   let jsonError = false;
  8  | 
  9  |   page.on('response', async (response) => {
  10 |     const url = response.url();
  11 |     if (url.includes('/cms') || url.includes('api')) {
  12 |       try {
  13 |         const body = await response.text();
  14 |         if (response.headers()['content-type']?.includes('application/json')) {
  15 |           try {
  16 |             JSON.parse(body);
  17 |           } catch (e) {
  18 |             jsonError = true;
  19 |             console.error(`❌ Fehlerhafte JSON-Antwort von ${url}:`, e.message);
  20 |             console.error('Antwort:', body);
  21 |           }
  22 |         }
  23 |       } catch (err) {
  24 |         jsonError = true;
  25 |         console.error(`❌ Fehler beim Lesen der Antwort von ${url}:`, err.message);
  26 |       }
  27 |     }
  28 |   });
  29 | 
  30 |   await page.goto('https://kind-pebble-072605b03.7.azurestaticapps.net/cms');
  31 |   await page.waitForTimeout(5000); // 5 Sekunden warten, damit alle Requests durchlaufen
  32 | 
> 33 |   expect(jsonError).toBe(false);
     |                     ^ Error: expect(received).toBe(expected) // Object.is equality
  34 | });
  35 | 
```