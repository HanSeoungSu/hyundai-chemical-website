// Static SEO, responsive layout and inquiry routing. Never sends a real email.
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const slug = 'products/trilite-sm210';
const shots = path.join(root, 'test-results', 'trilite-sm210');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  try {
    let name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (name.endsWith('/')) name += 'index.html';
    if (!path.extname(name)) name += '.html';
    const file = path.resolve(root, '.' + name);
    if (!file.startsWith(root + path.sep)) throw new Error('outside root');
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(await fs.readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
  const errors = [];
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  await context.route('**/api/**', route => route.abort());
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const sitemap = await fs.readFile(path.join(root, 'sitemap.xml'), 'utf8');
  try {
    await fs.mkdir(shots, { recursive: true });
    for (const lang of ['ko', 'en']) {
      const prefix = lang === 'en' ? '/en' : '';
      const url = `${origin}${prefix}/${slug}`;
      const publicUrl = `https://www.hdchem.co.kr${prefix}/${slug}`;
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        const response = await page.goto(url);
        assert.equal(response.status(), 200);
        assert.equal(await page.locator('h1').count(), 1);
        assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), publicUrl);
        assert.equal(await page.locator('meta[property="og:url"]').getAttribute('content'), publicUrl);
        assert.ok(sitemap.includes(`<loc>${publicUrl}</loc>`));
        assert.equal(await page.locator('link[hreflang="ko"]').getAttribute('href'), `https://www.hdchem.co.kr/${slug}`);
        assert.equal(await page.locator('link[hreflang="en"]').getAttribute('href'), `https://www.hdchem.co.kr/en/${slug}`);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `overflow ${lang} ${width}`);
        const visible = (await page.locator('body').innerText()).replaceAll('한국어', '');
        if (lang === 'en') assert.ok(!/[가-힣]/.test(visible), visible);
        assert.match(visible, /SM210/);
        const data = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
        const product = data['@graph'].find(item => item['@type'] === 'Product');
        assert.equal(product.url, publicUrl);
        assert.equal(product.brand.name, 'TRILITE');
        assert.equal(product.model, 'SM210');
        assert.equal(product.manufacturer.name, lang === 'en' ? 'Samyang Corporation' : '삼양사');
        for (const field of ['offers', 'review', 'aggregateRating', 'gtin']) assert.equal(product[field], undefined, `Do not invent ${field}`);
        const crumbs = data['@graph'].find(item => item['@type'] === 'BreadcrumbList').itemListElement;
        assert.equal(crumbs.at(-1).item, publicUrl);
        assert.equal(crumbs[1].item, `https://www.hdchem.co.kr${prefix}/products`);
        const values = await page.locator('.detail-spec-table td').allTextContents();
        assert.ok(values.includes('0.3–1.2 mm'));
        assert.ok(values.includes('52–60%'));
        assert.ok(values.includes('≤ 1.6'));
        assert.ok(values.includes('≤ 60 °C'));
        assert.ok(values.includes('0–14'));
        if ([390, 1440].includes(width)) {
          await page.screenshot({ path: path.join(shots, `${lang}-${width}-full.png`), fullPage: true });
          await page.screenshot({ path: path.join(shots, `${lang}-${width}-hero.png`) });
        }
      }
      await page.locator(`[data-lang-switch="${lang === 'en' ? 'ko' : 'en'}"]`).click();
      assert.equal(new URL(page.url()).pathname, `${lang === 'en' ? '' : '/en'}/${slug}`);
      await page.goto(url);
      await page.locator('.detail-hero-actions a[href*="contact"]').click();
      assert.equal(new URL(page.url()).pathname, `${prefix}/contact`);
      assert.equal(await page.locator('[name="product"]').inputValue(), 'TRILITE SM210');
      await page.locator(`[data-lang-switch="${lang === 'en' ? 'ko' : 'en'}"]`).click();
      assert.equal(await page.locator('[name="product"]').inputValue(), 'TRILITE SM210');
      await page.goto(url);
      await page.locator('.detail-hero-actions a[href*="msds"]').click();
      assert.equal(new URL(page.url()).pathname, `${prefix}/msds`);
      assert.equal(await page.locator('[name="product"]').inputValue(), 'TRILITE SM210');
      await page.goto(`${origin}${prefix}/products`);
      await page.locator('.featured-product').click();
      assert.equal(new URL(page.url()).pathname, `${prefix}/${slug}`);
      for (const keyword of ['SM210', '트리라이트', '삼양', 'TRILITE']) {
        await page.goto(`${origin}${prefix}/products`);
        await page.locator('#product-search').fill(keyword);
        assert.equal(await page.locator('#product-list .product-card:visible').count(), 1, keyword);
        await page.locator('#product-list .product-card:visible .product-detail-link').click();
        assert.equal(new URL(page.url()).pathname, `${prefix}/${slug}`);
      }
      // Navigation works without JavaScript; the product content is static HTML.
      const plain = await browser.newContext({ javaScriptEnabled: false });
      const plainPage = await plain.newPage();
      await plainPage.goto(`${origin}${prefix}/products`);
      await plainPage.locator('.featured-product').click();
      assert.equal(new URL(plainPage.url()).pathname, `${prefix}/${slug}`);
      assert.ok(await plainPage.locator('#product-title').isVisible());
      assert.ok(await plainPage.locator('.detail-spec-table').isVisible());
      await plain.close();
    }
    await page.goto(`${origin}/contact?product=${encodeURIComponent('<img src=x onerror=alert(1)>')}`);
    assert.equal(await page.locator('[name="product"]').inputValue(), '<img src=x onerror=alert(1)>');
    assert.equal(await page.locator('#quote-form img').count(), 0);
    await page.goto(`${origin}/contact?product=${'a'.repeat(250)}`);
    assert.equal((await page.locator('[name="product"]').inputValue()).length, 200);
    assert.deepEqual(errors, []);
    console.log('PASS: SM210 static SEO, truthful product data, both languages, 4 widths, catalog discovery, quote/MSDS prefill, no-JS navigation and safe query handling. No emails sent.');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
