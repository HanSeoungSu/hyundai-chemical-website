// Export the approved Arial wordmark once so phones cannot substitute fonts or
// recolor separate SVG text/background elements. The delivered PNG has alpha.
// Requires Playwright, Chromium and Arial on the export machine, not on visitors' devices.
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const svg = await fs.readFile(path.join(root, 'assets/hyundai-chemical-mobile-ko.svg'), 'utf8');
  const browser = await chromium.launch({ headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 260, height: 88 }, deviceScaleFactor: 4 });
    await page.setContent(`<body style="margin:0;background:transparent"><img width="260" height="88" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" style="display:block"></body>`);
    await page.locator('img').evaluate(img => img.decode());
    await page.screenshot({ path: path.join(root, 'assets/hyundai-chemical-mobile.png'), omitBackground: true });
    console.log('Exported transparent mobile wordmark at 1040 × 352 pixels.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
