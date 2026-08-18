const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Set viewport to A4 size in pixels at ~96 DPI
  await page.setViewportSize({ width: 794, height: 1123 });
  
  const filePath = `file:///${path.resolve('docs/flyer-mittagstisch-v2.html').replace(/\\/g, '/')}`;
  console.log(`Loading: ${filePath}`);
  
  await page.goto(filePath, { waitUntil: 'networkidle' });
  
  const outPath = path.resolve('docs/flyer-mittagstisch-v2.jpg');
  await page.screenshot({ 
    path: outPath, 
    type: 'jpeg', 
    quality: 100,
    fullPage: true 
  });
  
  console.log(`Saved screenshot to ${outPath}`);
  
  await browser.close();
})();
