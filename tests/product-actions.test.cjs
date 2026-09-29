// Approved button visibility only; this is not a legal SDS classification.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
const dictionary = JSON.parse(fs.readFileSync(path.join(root, 'locales/en.json'), 'utf8'));
const approved = [
  '샘플병 500ml', '샘플병 200ml', 'LATEX GLOVES', 'VOLUMETRIC FLASK',
  'SQUEEZE BOTTLE (1L)', 'SQUEEZE BOTTLE (500ML)', 'SPONGE', 'TUBE BRUSH',
  'ICE BOX', 'THERMOMETER', 'NESSLER TUBE (100ML)', 'NESSLER TUBE (50ML)',
  'FILTER PAPER', 'GLASS BEAKER (150ML)', 'GLASS BEAKER (400ML)', 'TEST PAPER',
  'PEN RIGHT', 'MEASURING PIPETTE(2ML)', 'MEASURING PIPETTE(5ML)',
  'MEASURING PIPETTE(10ML)', 'PIPETTE FILLER', 'DROPPING BOTTLE 50CC',
  'DROPPING BOTTLE 40CC', 'NESSLER TUBE RACK (100)', 'NESSLER TUBE RACK (50)',
  'FUNNEL', '스포이드 5CC', 'GLASS BEAKER (50ML)', '메스실린더 50ML',
  '메스실린더 100ML', '스포이드 1CC', '스포이드 2CC', '스포이드 3CC',
  '스포이드 10CC', '타올', '20KG (보루)', '10KG (보루)',
];

for (const lang of ['ko', 'en']) test(`${lang}: only the 37 approved cards lose their MSDS button`, () => {
  const prefix = lang === 'en' ? 'en/' : '';
  const html = fs.readFileSync(path.join(root, `${prefix}products.html`), 'utf8');
  const targets = new Set(approved.map(name => lang === 'en' ? dictionary[name] || name : name));
  const found = new Set();
  const cards = [...html.matchAll(/<article\b[^>]*class="product-card[^>]*>([\s\S]*?)<\/article>/g)];
  assert.equal(cards.length, 98);
  let retained = 0;
  for (const [, card] of cards) {
    const name = card.match(/<h3>([^<]+)<\/h3>/)[1];
    const actions = card.match(/<div class="product-card-actions">([\s\S]*?)<\/div>/)[1];
    const links = [...actions.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g)];
    if (targets.has(name)) {
      found.add(name);
      assert.equal(links.length, 1, name);
      assert.equal(links[0][1], `/${prefix}contact`, name);
      assert.equal(links[0][2], lang === 'en' ? 'Product Enquiry' : '제품 문의', name);
      assert.ok(!actions.includes('sds-button'), name);
    } else {
      assert.equal(links.length, 2, name);
      assert.ok(actions.includes('sds-button'), name);
      assert.ok(links.some(link => link[1].startsWith(`/${prefix}msds?product=`)), name);
      retained++;
    }
  }
  assert.deepEqual(found, targets);
  assert.equal(retained, 61);
});
