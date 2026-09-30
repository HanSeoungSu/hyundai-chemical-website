// Regenerate committed English pages from Korean pages and reviewed translations.
// Production serves static files; no server-side build or translation service is used.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index', 'company', 'products', 'products/trilite-sm210', 'business', 'marine', 'contact', 'msds', '404'];
const version = '20260930-1';
const dictionary = JSON.parse(await readFile(path.join(root, 'locales/en.json'), 'utf8'));
const missing = new Set();
const normalize = value => value.replace(/\s+/g, ' ').trim();
const decode = value => value.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&nbsp;', ' ');
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
function translate(value) {
  const key = normalize(decode(value));
  if (!(key in dictionary)) { if (/[가-힣]/.test(key)) missing.add(key); return value; }
  return value.match(/^\s*/)[0] + escape(dictionary[key]) + value.match(/\s*$/)[0];
}
function localPath(page, en = false) { return `${en ? '/en' : ''}/${page === 'index' ? '' : page}`; }
function translateStructuredData(value) {
  if (Array.isArray(value)) return value.map(translateStructuredData);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, translateStructuredData(item)]));
  if (typeof value !== 'string') return value;
  if (value.startsWith('https://www.hdchem.co.kr/')) return value.replace('https://www.hdchem.co.kr/', 'https://www.hdchem.co.kr/en/');
  const key = normalize(value);
  if (key in dictionary) return dictionary[key];
  if (/[가-힣]/.test(key)) missing.add(key);
  return value;
}
function switches(page, en = false) {
  return `<div class="language-switch" role="group" aria-label="${en ? 'Language' : '언어 선택'}"><a data-lang-switch="ko" href="${localPath(page)}" lang="ko" hreflang="ko"${en ? '' : ' aria-current="true"'}>한국어</a><a data-lang-switch="en" href="${localPath(page, true)}" lang="en" hreflang="en"${en ? ' aria-current="true"' : ''}>EN</a></div>`;
}
const outputs = new Map();
for (const page of pages) {
  let ko = await readFile(path.join(root, `${page}.html`), 'utf8');
  ko = ko.replace(/\s*<meta name="color-scheme"[^>]*>/g, '');
  ko = ko.replace(/(<meta name="viewport"[^>]*>)/, '$1\n  <meta name="color-scheme" content="only light" />');
  // The same transparent, pre-rendered wordmark is used in both mobile languages.
  ko = ko.replace(/(<a class="brand"[^>]*>)[\s\S]*?(<\/a>)/, `$1<picture><source media="(max-width: 900px)" srcset="/assets/hyundai-chemical-mobile.png?v=${version}" /><img src="/assets/hyundai-chemical-logo.svg" alt="HYUNDAI CHEMICAL" width="540" height="230" /></picture>$2`);
  ko = ko.replace(/\s*<div class="language-switch"[^\n]*<\/div>/g, '');
  ko = ko.replace(/<button class="menu-toggle"/, `${switches(page)}\n      <button class="menu-toggle"`);
  ko = ko.replace(/\s*<link rel="alternate" hreflang="[^"]+" href="[^"]+"\s*\/>/g, '');
  ko = ko.replace('</head>', `  <link rel="alternate" hreflang="ko" href="https://www.hdchem.co.kr${localPath(page)}" />\n  <link rel="alternate" hreflang="en" href="https://www.hdchem.co.kr${localPath(page, true)}" />\n  <link rel="alternate" hreflang="x-default" href="https://www.hdchem.co.kr${localPath(page)}" />\n</head>`);
  ko = ko.replace(/(?:\s*<script src="\/?(?:translations|i18n)\.js[^\"]*"><\/script>)+/g, '');
  ko = ko.replace(/\s*<script src="\/?script\.js[^\"]*"><\/script>/, `\n  <script src="/translations.js?v=${version}"></script>\n  <script src="/i18n.js?v=${version}"></script>\n  <script src="/script.js?v=${version}"></script>`);
  ko = ko.replace(/((?:href|src)=")(?:\/)?(styles\.css|product-detail\.css|msds\.js)(?:\?[^\"]*)?"/g, `$1/$2?v=${version}"`);
  // Absolute internal URLs also work on nested 404 pages.
  ko = ko.replace(/((?:href|src)=")(assets\/[^\"]+)"/g, '$1/$2"');
  ko = ko.replace(/href="(index|company|products|business|marine|contact|msds)\.html([^\"]*)"/g, (_, p, query) => `href="${localPath(p)}${query}"`);
  ko = ko.replace(/href="tel:0527005888"/g, 'href="tel:+82527005888"');
  // Stable keys keep the catalog hierarchy identical in both languages.
  ko = ko.replace(/<article class="product-card[^\"]*"[^>]*>[\s\S]*?<\/article>/g, card => {
    if (/data-subcategory=/.test(card)) return card;
    const label = card.match(/<small>([^<]+)<\/small>/)?.[1];
    return label ? card.replace('<article ', `<article data-subcategory="${label}" `) : card;
  });
  ko = ko.replace(/"availableLanguage": "ko"/g, '"availableLanguage": ["ko", "en"]');
  outputs.set(`${page}.html`, ko);
  let en = ko.replace('lang="ko"', 'lang="en"');
  en = en.replace(switches(page), switches(page, true));
  en = en.replace(/<script\b[\s\S]*?<\/script>|<!--[\s\S]*?-->|<[^>]*>|[^<]+/g, token => {
    if (/^<script/.test(token)) {
      if (!token.includes('application/ld+json')) return token;
      let json = JSON.parse(token.match(/>([\s\S]*)<\/script>/)[1]);
      if (json['@type'] === 'Organization') {
        json.name = 'HYUNDAI CHEMICAL CO., LTD.';
        json.address.streetAddress = '29, Jangsaengpo-ro 19beon-gil';
        json.address.addressLocality = 'Nam-gu';
        json.address.addressRegion = 'Ulsan';
      } else {
        json = translateStructuredData(json);
      }
      return `<script type="application/ld+json">\n${JSON.stringify(json, null, 2)}\n  </script>`;
    }
    if (token.startsWith('<!--')) return token;
    if (!token.startsWith('<')) return translate(token);
    let tag = token.replace(/\b(alt|placeholder|aria-label|title|content)="([^\"]*)"/g, (_, attr, value) => `${attr}="${translate(value)}"`);
    // Switch URLs and hreflang tags deliberately retain their destination languages.
    if (!tag.includes('data-lang-switch') && !tag.includes('hreflang=')) {
      tag = tag.replace(/href="\/(company|products|business|marine|contact|msds)([/?"#])/g, 'href="/en/$1$2').replace('href="/"', 'href="/en/"');
    }
    if (tag.includes('rel="canonical"') || tag.includes('property="og:url"')) {
      tag = tag.replace(`https://www.hdchem.co.kr${localPath(page)}"`, `https://www.hdchem.co.kr${localPath(page, true)}"`);
    }
    tag = tag.replace('content="ko_KR"', 'content="en_US"');
    if (/href="\/en\/(?:msds|contact)\?product=/.test(tag)) {
      tag = tag.replace(/product=([^"&#]+)/, (_, value) => 'product=' + encodeURIComponent(dictionary[decodeURIComponent(value)] || decodeURIComponent(value)));
    }
    return tag;
  });
  // Language names stay in their native writing system.
  en = en.replace(/(<a data-lang-switch="ko"[^>]*>)[^<]+/, '$1한국어');
  outputs.set(`en/${page}.html`, en);
}
// Data attributes are stable identifiers; their display labels are translated at runtime.
for (const match of outputs.get('products.html').matchAll(/data-(?:family|detail|subcategory)="([^\"]+)"/g)) translate(match[1]);
if (missing.size) {
  console.error('Missing English translations:\n' + JSON.stringify([...missing], null, 2));
  process.exitCode = 1;
} else if (!process.argv.includes('--scan')) {
  outputs.set('translations.js', `// Generated from locales/en.json by scripts/build-locales.mjs.\nwindow.HDChemEnglish = ${JSON.stringify(dictionary, null, 2)};\n`);
  let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';
  for (const page of pages.filter(p => p !== '404')) for (const en of [false, true]) {
    sitemap += `  <url><loc>https://www.hdchem.co.kr${localPath(page, en)}</loc><lastmod>2026-09-30</lastmod><xhtml:link rel="alternate" hreflang="ko" href="https://www.hdchem.co.kr${localPath(page)}"/><xhtml:link rel="alternate" hreflang="en" href="https://www.hdchem.co.kr${localPath(page, true)}"/></url>\n`;
  }
  outputs.set('sitemap.xml', sitemap + '</urlset>\n');
  for (const [file, content] of outputs) {
    const target = path.join(root, file);
    if (process.argv.includes('--check')) {
      const previous = await readFile(target, 'utf8').catch(() => '');
      if (previous.replaceAll('\r\n', '\n') !== content.replaceAll('\r\n', '\n')) {
        const a = previous.replaceAll('\r\n', '\n'), b = content.replaceAll('\r\n', '\n');
        const index = [...a].findIndex((char, i) => char !== b[i]);
        throw new Error(`Regenerate ${file}: ${JSON.stringify(a.slice(index - 30, index + 100))} => ${JSON.stringify(b.slice(index - 30, index + 100))}`);
      }
    } else {
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content);
    }
  }
  console.log(`Verified ${pages.length} Korean and ${pages.length} English pages.`);
}
