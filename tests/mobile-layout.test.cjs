// Render the actual mobile layout, including text clipped inside overflow:hidden.
// No mail is sent: this server serves static files only.
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const auditOnly = process.env.MOBILE_AUDIT_ONLY === '1';
const directory = path.join(root, 'test-results', auditOnly ? 'mobile-before' : 'mobile-after');
const pages = ['', 'company', 'products', 'products/trilite-sm210', 'business', 'marine', 'contact', 'msds', '404'];
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = http.createServer(async (req, res) => {
  try {
    let name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (name.endsWith('/')) name += 'index.html';
    if (!path.extname(name)) name += '.html';
    const file = path.resolve(root, '.' + name);
    if (!file.startsWith(root + path.sep)) throw new Error('outside root');
    const body = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});

async function clippedText(page) {
  return page.evaluate(() => {
    const failures = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      if (!node.textContent.trim() || parent.closest('script,style,[aria-hidden="true"],.form-honeypot')) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = [...range.getClientRects()].filter(r => r.width > 1 && r.height > 1);
      if (!rects.length) continue;
      let left = 0, right = innerWidth, top = -Infinity, bottom = Infinity;
      for (let ancestor = parent; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        const rect = ancestor.getBoundingClientRect();
        if (['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowX)) {
          left = Math.max(left, rect.left);
          right = Math.min(right, rect.right);
        }
        if (['hidden', 'clip'].includes(style.overflowY)) {
          top = Math.max(top, rect.top);
          bottom = Math.min(bottom, rect.bottom);
        }
      }
      if (rects.some(r => r.left < left - 2 || r.right > right + 2 || r.top < top - 2 || r.bottom > bottom + 2)) {
        failures.push({ element: `${parent.tagName}.${parent.className}`, text: node.textContent.trim().slice(0, 100) });
      }
    }
    return failures;
  });
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  await fs.mkdir(directory, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
  const context = await browser.newContext({ isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await context.route('https://oapi.map.naver.com/**', route => route.abort());
  const page = await context.newPage();
  const results = [];
  async function inspect(label) {
    const clipped = await clippedText(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (clipped.length || overflow) results.push({ label, overflow, clipped });
    const brand = await page.locator('.brand img').evaluate(img => {
      const rect = img.getBoundingClientRect();
      const languages = document.querySelector('.language-switch').getBoundingClientRect();
      return { correctAsset: img.currentSrc.includes('hyundai-chemical-mobile.png'),
        width: rect.width, clearOfControls: rect.right + 7 <= languages.left };
    });
    if (!brand.correctAsset || !brand.clearOfControls || (!label.includes('130%') && brand.width < 135)) results.push({ label, brand });
    if (await page.locator('.home-hero').count()) {
      const hero = await page.evaluate(() => {
        const container = document.querySelector('.hero-grid').getBoundingClientRect();
        const copy = document.querySelector('.hero-copy').getBoundingClientRect();
        const visual = document.querySelector('.supply-visual').getBoundingClientRect();
        return { singleColumn: copy.width >= container.width - 1 && visual.top >= copy.bottom,
          completeGraphic: [...document.querySelectorAll('.supply-core,.orbit-outer')].every(el => {
            const rect = el.getBoundingClientRect();
            return rect.left >= 0 && rect.right <= innerWidth;
          }) };
      });
      if (!hero.singleColumn || !hero.completeGraphic) results.push({ label, hero });
    }
  }
  async function screenshot(name, selector) {
    // Load lazy images before a full-page capture and keep the fixed header at the top.
    await page.locator('img').evaluateAll(async images => {
      images.forEach(img => { img.loading = 'eager'; });
      await Promise.all(images.map(img => img.decode().catch(() => {})));
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    const target = selector ? page.locator(selector) : page;
    // Element captures isolate content; the full-page images retain the real header.
    const headerStyle = selector && selector !== '.home-hero' ? await page.addStyleTag({ content: '.site-header{visibility:hidden!important}' }) : null;
    await target.screenshot({ path: path.join(directory, name + '.png'), ...(selector ? {} : { fullPage: true }) });
    await headerStyle?.evaluate(el => el.remove());
  }
  try {
    for (const width of auditOnly ? [320, 390] : [320, 360, 390, 430, 600, 768, 900]) {
      await page.setViewportSize({ width, height: 844 });
      for (const lang of ['ko', 'en']) for (const name of pages) {
        const prefix = lang === 'en' ? '/en' : '';
        await page.goto(`${origin}${prefix}/${name}`);
        await inspect(`${lang}/${name || 'home'} at ${width}`);
        if (width === 390) {
          await screenshot(`${lang}-${name || 'home'}`);
          if (!name) await screenshot(`${lang}-home-hero`, '.home-hero');
          if (name === 'company') await screenshot(`${lang}-company-copy`, '.company-narrative');
          if (name === 'msds') await screenshot(`${lang}-msds-details`, '.contact-details');
        }
        if (name === 'products') {
          await page.locator('[data-filter="laboratory"]').click();
          await page.locator('#subcategory-list [data-subcategory="기구·소모품"]').click();
          await page.locator('#detail-list [data-detail="측정·분석기구"]').click();
          await inspect(`${lang}/products instruments at ${width}`);
          if (width === 390) await screenshot(`${lang}-products-instruments`);
          await page.locator('#family-list [data-family="GLASS BEAKER"]').click();
          await inspect(`${lang}/products beakers at ${width}`);
        }
        if (name === 'marine') {
          for (const id of ['wwt-gallery', 'packaged-gallery', 'tank-lorry-gallery']) {
            await page.locator(`[aria-controls="${id}"]`).click();
            await inspect(`${lang}/marine ${id} at ${width}`);
            if (width === 390) await screenshot(`${lang}-${id}`, `#${id}`);
          }
          if (width === 390) await screenshot(`${lang}-marine-gallery`);
        }
      }
    }
    if (!auditOnly) {
      // Test actual automatic darkening as well as the OS dark preference.
      const cdp = await context.newCDPSession(page);
      for (const width of [320, 390]) for (const lang of ['ko', 'en']) {
        await page.setViewportSize({ width, height: 844 });
        await page.goto(`${origin}/${lang === 'en' ? 'en/' : ''}`);
        const header = page.locator('.site-header');
        const light = await header.screenshot({ path: path.join(directory, `${lang}-header-${width}-light.png`) });
        await page.emulateMedia({ colorScheme: 'dark' });
        await cdp.send('Emulation.setAutoDarkModeOverride', { enabled: true });
        const dark = await header.screenshot({ path: path.join(directory, `${lang}-header-${width}-dark.png`) });
        assert.ok(light.equals(dark), `Auto dark mode must preserve the ${lang} header at ${width}px`);
        await page.emulateMedia({ colorScheme: 'light' });
        await cdp.send('Emulation.setAutoDarkModeOverride', { enabled: false });
      }
      await cdp.detach();
      // Simulate larger user text without reducing the viewport or disabling zoom.
      await page.setViewportSize({ width: 390, height: 844 });
      for (const lang of ['ko', 'en']) for (const name of pages) {
        await page.goto(`${origin}/${lang === 'en' ? 'en/' : ''}${name}`);
        await page.evaluate(() => {
          const sizes = [...document.querySelectorAll('body,body *')].map(el => [el, parseFloat(getComputedStyle(el).fontSize)]);
          sizes.forEach(([el, size]) => { el.style.fontSize = `${size * 1.3}px`; });
        });
        await inspect(`${lang}/${name || 'home'} with 130% text`);
      }
      // Landscape navigation must scroll inside the available screen height.
      await page.setViewportSize({ width: 844, height: 390 });
      await page.goto(`${origin}/en/`);
      await page.locator('.menu-toggle').click();
      const navBounds = await page.locator('.nav').boundingBox();
      assert.ok(navBounds.y + navBounds.height <= 390);
      await page.locator('.nav .nav-cta').click();
      assert.equal(new URL(page.url()).pathname, '/en/contact');
    }
    await fs.writeFile(path.join(directory, 'audit.json'), JSON.stringify(results, null, 2));
    if (auditOnly) console.log(JSON.stringify(results, null, 2));
    else assert.deepEqual(results, [], 'Visible mobile content must not be clipped');
    console.log(auditOnly ? 'Mobile baseline saved.' : `PASS: ${pages.length * 2} pages and catalog/gallery states at 7 mobile/tablet widths, sharp mobile logos, auto dark mode, 130% text and landscape navigation; no clipped content.`);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
