const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { PNG } = require('pngjs');
const root = path.resolve(__dirname, '..');
const png = PNG.sync.read(fs.readFileSync(path.join(root, 'assets/hyundai-chemical-mobile.png')));
const count = (box, match) => {
  let result = 0;
  for (let y = box[1] * 4; y < box[3] * 4; y++) for (let x = box[0] * 4; x < box[2] * 4; x++) {
    const offset = (y * png.width + x) * 4;
    if (match(...png.data.subarray(offset, offset + 4))) result++;
  }
  return result;
};
const blue = (r, g, b, a) => r === 111 && g === 169 && b === 223 && a === 255;

test('high-resolution wordmark has no rectangular background', () => {
  assert.equal(png.width, 1040);
  assert.equal(png.height, 352);
  for (const margin of [[0, 0, 260, 5], [0, 83, 260, 88], [0, 0, 12, 88], [248, 0, 260, 88]]) {
    assert.equal(count(margin, (r, g, b, a) => a > 0), 0);
  }
  assert.equal(count([98, 20, 108, 30], (r, g, b, a) => a > 0), 0, 'Circle interior must also be transparent');
});

test('right ring has a horizontal word-height opening, not background paint', () => {
  assert.equal(count([132, 36, 144, 50], blue), 0);
  assert.ok(count([136, 33, 140, 36], blue) > 50, 'Upper cut edge retains the ring');
  assert.ok(count([136, 50, 140, 53], blue) > 50, 'Lower cut edge retains the ring');
  assert.ok(count([132, 36, 144, 50], (r, g, b, a) => a === 0) > 100, 'Gap between letters must be transparent');
  assert.ok(count([65, 36, 76, 50], blue) > 50, 'Left side remains continuous behind the N');
});

test('N keeps its dark fill while the surrounding wordmark remains white', () => {
  assert.ok(count([65, 36, 80, 50], (r, g, b, a) => r === 20 && g === 40 && b === 62 && a === 255) > 100);
  assert.ok(count([18, 36, 60, 50], (r, g, b, a) => r === 255 && g === 255 && b === 255 && a === 255) > 100);
});

test('all Korean and English pages use the same font-independent mobile asset', () => {
  for (const prefix of ['', 'en/']) for (const page of ['index', 'company', 'products', 'business', 'marine', 'contact', 'msds', '404']) {
    const html = fs.readFileSync(path.join(root, `${prefix}${page}.html`), 'utf8');
    assert.match(html, /<source media="\(max-width: 900px\)" srcset="\/assets\/hyundai-chemical-mobile\.png\?v=[^"]+"/);
  }
});
