// Local browser verification: all form submissions are intercepted, no emails sent.
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const screenshots = path.join(root, 'test-results');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };
const pages = ['', 'company', 'products', 'products/trilite-sm210', 'products/sodium-hydroxide', 'products/citric-acid', 'products/potassium-hydroxide', 'business', 'marine', 'contact', 'msds', '404'];

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let name = decodeURIComponent(url.pathname);
    if (name.endsWith('/')) name += 'index.html';
    if (!path.extname(name)) name += '.html';
    const file = path.resolve(root, '.' + name);
    if (!file.startsWith(root + path.sep)) throw new Error('outside root');
    const content = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(content);
  } catch { res.writeHead(404); res.end('Not found'); }
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  await fs.mkdir(screenshots, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
  const errors = [];
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  await context.route('https://oapi.map.naver.com/**', route => route.abort());
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  let notification;
  await page.route('**/api/msds', async route => {
    notification = route.request().postDataJSON();
    await route.fulfill({ json: { ok: true, requestId: notification.requestId, message: 'MSDS 요청이 접수되었습니다. 공급 제품 확인 후 이메일로 안내해 드리겠습니다.' } });
  });
  await page.route('**/api/quote', route => route.fulfill({ json: { ok: true, message: '견적문의가 정상적으로 접수되었습니다.' } }));
  try {
    for (const width of [1440, 1024, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const lang of ['ko', 'en']) for (const name of pages) {
        const url = `${origin}/${lang === 'en' ? 'en/' : ''}${name}`;
        const response = await page.goto(url);
        assert.equal(response.status(), 200, url);
        await page.addStyleTag({ content: '.reveal{opacity:1!important;transform:none!important;visibility:visible!important}' });
        assert.equal(await page.locator('html').getAttribute('lang'), lang);
        assert.equal(await page.locator('.language-switch a').count(), 2);
        const dimensions = await page.evaluate(() => ({ body: document.documentElement.scrollWidth, screen: innerWidth }));
        assert.ok(dimensions.body <= dimensions.screen + 1, `Horizontal overflow: ${url} at ${width}: ${JSON.stringify(dimensions)}`);
        if (lang === 'en') {
          const visible = (await page.locator('body').innerText()).replaceAll('한국어', '');
          assert.ok(!/[가-힣]/.test(visible), `Untranslated visible text on ${url}: ${visible.match(/[^\n]*[가-힣][^\n]*/g)}`);
          const heading = await page.locator('h1').innerText();
          assert.ok(heading.length > 5);
        }
        const brokenImages = await page.locator('img').evaluateAll(images => images.filter(image => image.complete && image.naturalWidth === 0).map(image => image.src));
        assert.deepEqual(brokenImages, [], `Broken images on ${url}`);
        if (name === 'products') {
          assert.equal(await page.locator('#product-list .sds-button').count(), 61);
          await page.locator('#product-search').fill('TEST PAPER');
          const actions = page.locator('#product-list .product-card:visible .product-card-actions');
          assert.equal(await actions.locator('a').count(), 1);
          assert.equal(await actions.innerText(), lang === 'en' ? 'Product Enquiry' : '제품 문의');
          const row = await actions.boundingBox(), button = await actions.locator('a').boundingBox();
          assert.ok(Math.abs(row.width - button.width) <= 1, `Inquiry button must fill the card at ${width}px`);
          if (width === 390) await page.screenshot({ path: path.join(screenshots, `${lang}-product-inquiry-only.png`), fullPage: true });
          await actions.locator('a').click();
          assert.equal(new URL(page.url()).pathname, `/${lang === 'en' ? 'en/' : ''}contact`);
        }
        if (lang === 'en' && ['', 'company', 'msds'].includes(name)) await page.screenshot({ path: path.join(screenshots, `en-${name || 'home'}-${width}.png`), fullPage: true });
      }
    }
    console.log(`PASS: ${pages.length * 2} pages at 4 desktop/tablet/mobile widths; language metadata, images and no untranslated visible text.`);
    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const lang of ['ko', 'en']) {
      await page.goto(`${origin}/${lang === 'en' ? 'en/' : ''}products`);
      await page.locator('#product-search').fill('toluene');
      assert.equal(await page.locator('#product-list .product-card:visible').count(), 1);
      await page.locator('#product-search').fill('톨루엔');
      assert.equal(await page.locator('#product-list .product-card:visible').count(), 1);
      await page.locator('#product-search').fill('6153-56-6');
      const oxalicCard = page.locator('#product-list .product-card:visible');
      assert.equal(await oxalicCard.count(), 1);
      assert.equal(await oxalicCard.locator('h3').innerText(), lang === 'en' ? 'Oxalic Acid (Hydrated)' : '수산(함수)');
      assert.match(await oxalicCard.locator('.product-cas').innerText(), /6153-56-6/);
      await page.locator('#product-search').fill('옥살산');
      assert.equal(await page.locator('#product-list .product-card:visible').count(), 1);
      await page.locator('#product-search').fill('nothing-found-here');
      assert.equal(await page.locator('#product-list .product-card:visible').count(), 0);
      await page.locator('#product-search').fill('');
      await page.locator('[data-filter="chemical"]').click();
      await page.locator('#subcategory-list [data-subcategory="탱크 용제"]').click();
      assert.ok(await page.locator('#product-list .product-card:visible').count() > 0);
      if (lang === 'en') assert.ok(!/[가-힣]/.test((await page.locator('#catalog-results-head').innerText()) + (await page.locator('#product-count').innerText())));
      await page.locator('[data-filter="laboratory"]').click();
      await page.locator('#subcategory-list [data-subcategory="기구·소모품"]').click();
      await page.locator('#detail-list [data-detail="측정·분석기구"]').click();
      assert.ok(await page.locator('#family-single-list .product-card:visible').count() > 0);
      assert.equal(await page.locator('#family-single-list .sds-button').count(), 0, 'Cloned equipment cards must remain inquiry-only');
      assert.ok((await page.locator('#family-single-list .product-card-actions').allTextContents()).every(text => text.trim() === (lang === 'en' ? 'Product Enquiry' : '제품 문의')));
      await page.locator('#family-list [data-family="GLASS BEAKER"]').click();
      assert.ok(await page.locator('#product-list .product-card:visible').count() > 1);
    }
    console.log('PASS: bilingual search, empty state, category hierarchy and cloned product cards.');
    await page.goto(`${origin}/en/products`);
    await page.locator('#product-search').fill('Toluene');
    await page.locator('#product-list .product-card:visible .sds-button').click();
    assert.equal(await page.locator('[name="product"]').inputValue(), 'Toluene');
    await page.locator('[data-lang-switch="ko"]').click();
    assert.equal(await page.locator('[name="product"]').inputValue(), '톨루엔');
    await page.locator('[data-lang-switch="en"]').click();
    assert.equal(await page.locator('[name="product"]').inputValue(), 'Toluene');
    await page.locator('[name="company"]').fill('Local Test Company');
    await page.locator('[name="contactName"]').fill('Local Tester');
    await page.locator('[name="phone"]').fill('+82 52 000 0000');
    await page.locator('[name="email"]').fill('local@example.com');
    await page.locator('[name="privacyConsent"]').check();
    await page.locator('[data-msds-submit]').click();
    await page.locator('.form-status.is-success').waitFor();
    assert.equal(notification.language, 'en');
    assert.equal(notification.product, 'Toluene');
    assert.equal(notification.privacyConsent, true);
    assert.ok((await page.locator('.form-status').innerText()).includes('Reference:'));
    assert.equal(await page.locator('[name="product"]').inputValue(), 'Toluene');
    console.log('PASS: product selection survives language switching, English form submission and confirmation (mock email).');
    await page.goto(`${origin}/en/contact`);
    for (const [name, value] of Object.entries({ company: 'Test', contactName: 'Tester', phone: '1234', email: 'local@example.com', product: 'Toluene', message: 'Local mock only' })) await page.locator(`[name="${name}"]`).fill(value);
    await page.locator('[name="privacyConsent"]').check();
    await page.locator('[data-quote-submit]').click();
    await page.locator('.form-status.is-success').waitFor();
    assert.ok(!/[가-힣]/.test(await page.locator('.form-status').innerText()));
    await page.goto(`${origin}/en/marine`);
    await page.locator('[aria-controls="wwt-gallery"]').click();
    assert.equal(await page.locator('[aria-controls="wwt-gallery"] .marine-photo-cue span').innerText(), 'Close Photos');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.menu-toggle').click();
    assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'true');
    await page.locator('.nav a[href="/en/company"]').click();
    assert.equal(new URL(page.url()).pathname, '/en/company');
    assert.deepEqual(errors, [], 'Browser JavaScript errors');
    console.log('PASS: English quote form, marine gallery, mobile navigation and no browser JavaScript errors.');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
