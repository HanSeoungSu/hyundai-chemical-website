// Supplier-neutral detail pages: static data, discovery, responsive rendering and inquiry links. No email is sent.
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const contentTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml' };
const details = [
  { slug: 'sodium-hydroxide', cas: ['1310-73-2'], search: ['가성소다', '수산화나트륨', '1310732'], product: '가성소다', image: 'solid-alkali-flakes-illustration.png' },
  { slug: 'citric-acid', cas: ['77-92-9', '5949-29-1'], search: ['구연산', '무수구연산', '함수구연산', '77929', '5949291'], product: '구연산', image: 'solid-citric-acid-illustration.png' },
  { slug: 'potassium-hydroxide', cas: ['1310-58-3'], search: ['KOH', '수산화칼륨', '1310583'], product: 'KOH', image: 'solid-alkali-flakes-illustration.png' },
];
const pubchemByCas = {
  '1310-73-2': 'https://pubchem.ncbi.nlm.nih.gov/compound/Sodium-Hydroxide',
  '77-92-9': 'https://pubchem.ncbi.nlm.nih.gov/compound/Citric-Acid',
  '5949-29-1': 'https://pubchem.ncbi.nlm.nih.gov/compound/Citric-acid-monohydrate',
  '1310-58-3': 'https://pubchem.ncbi.nlm.nih.gov/compound/Potassium-Hydroxide',
};
const server = http.createServer(async (req, res) => {
  try {
    let name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (name.endsWith('/')) name += 'index.html';
    if (!path.extname(name)) name += '.html';
    const file = path.resolve(root, '.' + name);
    if (!file.startsWith(root + path.sep)) throw new Error('outside root');
    const content = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': contentTypes[path.extname(file)] || 'application/octet-stream' });
    res.end(content);
  } catch { res.writeHead(404); res.end(); }
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const sitemap = await fs.readFile(path.join(root, 'sitemap.xml'), 'utf8');
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  await context.route('**/api/**', route => route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await fs.mkdir(path.join(root, 'test-results', 'chemical-details'), { recursive: true });
    for (const lang of ['ko', 'en']) {
      const prefix = lang === 'en' ? '/en' : '';
      for (const item of details) {
        const pathname = `${prefix}/products/${item.slug}`;
        const publicUrl = `https://www.hdchem.co.kr${pathname}`;
        for (const width of [320, 390, 768, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          const response = await page.goto(`${origin}${pathname}`);
          assert.equal(response.status(), 200, pathname);
          assert.equal(await page.locator('h1').count(), 1);
          assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), publicUrl);
          assert.ok(sitemap.includes(`<loc>${publicUrl}</loc>`), publicUrl);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${pathname}: overflow at ${width}px`);
          const visible = (await page.locator('body').innerText()).replaceAll('한국어', '');
          if (lang === 'en') assert.ok(!/[가-힣]/.test(visible), `${pathname}: untranslated Korean`);
          assert.equal(await page.locator('.detail-marine-use').count(), 0, `${pathname}: removed marine-use block`);
          if (item.slug === 'citric-acid') {
            const names = await page.locator('.detail-spec-table th').allTextContents();
            assert.deepEqual(names.slice(0, 2), lang === 'ko' ? ['무수구연산', '함수구연산(일수화물)'] : ['Anhydrous citric acid', 'Citric acid monohydrate']);
          }
          for (const cas of item.cas) assert.ok(visible.includes(cas), `${pathname}: missing ${cas}`);
          const references = page.locator('.detail-reference .detail-source-link');
          assert.equal(await references.count(), item.cas.length);
          for (const [index, cas] of item.cas.entries()) {
            const reference = references.nth(index);
            assert.equal(await reference.getAttribute('data-reference-cas'), cas);
            assert.equal(await reference.getAttribute('href'), pubchemByCas[cas]);
            assert.ok((await reference.innerText()).includes(cas));
          }
          const referenceText = await page.locator('.detail-reference').innerText();
          assert.match(referenceText, /PubChem/);
          assert.ok(!referenceText.includes('안전보건공단'));
          assert.match(referenceText, lang === 'ko' ? /실제 납품 제품의 MSDS/ : /not the MSDS/);
          const photo = page.locator('.chemical-photo img');
          assert.ok((await photo.getAttribute('src')).endsWith(item.image));
          assert.ok(await photo.evaluate(image => image.complete && image.naturalWidth > 0), `${pathname}: broken photo`);
          const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
          const product = schema['@graph'].find(value => value['@type'] === 'Product');
          assert.equal(product.url, publicUrl);
          assert.deepEqual(product.additionalProperty.map(value => value.value), item.cas);
          for (const field of ['brand', 'manufacturer', 'offers', 'review', 'aggregateRating', 'gtin', 'image', 'identifier']) assert.equal(product[field], undefined, `${pathname}: unexpected ${field}`);
          assert.equal(await page.locator('link[hreflang="ko"]').getAttribute('href'), `https://www.hdchem.co.kr/products/${item.slug}`);
          assert.equal(await page.locator('link[hreflang="en"]').getAttribute('href'), `https://www.hdchem.co.kr/en/products/${item.slug}`);
          if (lang === 'ko' && width === 390) await page.screenshot({ path: path.join(root, 'test-results', 'chemical-details', `${item.slug}-mobile.png`), fullPage: true });
        }
        await page.locator('.detail-hero-actions a[href*="contact"]').click();
        assert.equal(new URL(page.url()).pathname, `${prefix}/contact`);
        await page.waitForFunction(() => Boolean(document.querySelector('[name="product"]')?.value));
        assert.equal(await page.locator('[name="product"]').inputValue(), new URL(page.url()).searchParams.get('product'));
        await page.goto(`${origin}${pathname}`);
        await page.locator('.detail-hero-actions a[href*="msds"]').click();
        assert.equal(new URL(page.url()).pathname, `${prefix}/msds`);
        await page.waitForFunction(() => Boolean(document.querySelector('[name="product"]')?.value));
        assert.equal(await page.locator('[name="product"]').inputValue(), new URL(page.url()).searchParams.get('product'));
        for (const keyword of item.search) {
          await page.goto(`${origin}${prefix}/products`);
          if (item.slug === 'citric-acid') {
            const casLabel = await page.locator('.product-card[data-cas="77-92-9 5949-29-1"] .product-cas').innerText();
            assert.match(casLabel, lang === 'ko' ? /무수구연산 CAS No\.\s*77-92-9/ : /Anhydrous citric acid CAS No\.\s*77-92-9/);
            assert.match(casLabel, lang === 'ko' ? /함수구연산 CAS No\.\s*5949-29-1/ : /Citric acid monohydrate CAS No\.\s*5949-29-1/);
          }
          await page.locator('#product-search').fill(keyword);
          const link = page.locator(`#product-list .product-card:visible .product-detail-link[href$="${item.slug}"]`).first();
          assert.ok(await link.isVisible(), `${lang}: search ${keyword} → ${item.slug}`);
          await link.click();
          assert.equal(new URL(page.url()).pathname, pathname);
        }
      }
    }
    assert.deepEqual(errors, []);
    console.log('PASS: three supplier-neutral chemical details in both languages, 4 widths, CAS data, search and inquiry routing. No emails sent.');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
