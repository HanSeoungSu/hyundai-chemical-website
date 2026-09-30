import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../functions/api/quote.js', import.meta.url), 'utf8');
const { onRequestPost } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const env = { RESEND_API_KEY: 'test-only', QUOTE_FROM_EMAIL: 'test@example.com' };
const payload = () => ({
  company: '테스트회사', contactName: '담당자', phone: '010-0000-0000',
  email: 'test@example.com', product: '톨루엔', message: '납품 문의', privacyConsent: true,
});
const request = (data) => new Request('https://www.hdchem.co.kr/api/quote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: 'https://www.hdchem.co.kr' },
  body: JSON.stringify(data),
});

test('delivery details reach the standard quote email', async () => {
  const oldFetch = globalThis.fetch;
  let mail;
  globalThis.fetch = async (_url, options) => {
    mail = JSON.parse(options.body);
    return new Response('{"id":"test"}', { status: 200 });
  };
  try {
    const response = await onRequestPost({ request: request({
      ...payload(), quantity: '20L 5통', destination: '울산항',
      deliveryDate: '2026-10-02',
    }), env });
    assert.equal(response.status, 200);
    assert.match(mail.subject, /^\[홈페이지 견적문의\]/);
    assert.match(mail.text, /필요 수량: 20L 5통/);
    assert.match(mail.text, /납품 항만·지역: 울산항/);
    assert.match(mail.text, /납품 희망일: 2026-10-02/);
  } finally { globalThis.fetch = oldFetch; }
});

test('normal enquiries still work without optional delivery fields', async () => {
  const oldFetch = globalThis.fetch;
  let mail;
  globalThis.fetch = async (_url, options) => {
    mail = JSON.parse(options.body);
    return new Response('{"id":"test"}', { status: 200 });
  };
  try {
    assert.equal((await onRequestPost({ request: request(payload()), env })).status, 200);
    assert.match(mail.subject, /^\[홈페이지 견적문의\]/);
    assert.match(mail.text, /필요 수량: 미기재/);
  } finally { globalThis.fetch = oldFetch; }
});

test('invalid dates and missing required fields do not send email', async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('must not send'); };
  try {
    assert.equal((await onRequestPost({ request: request({ ...payload(), deliveryDate: '2026-02-30' }), env })).status, 400);
    assert.equal((await onRequestPost({ request: request({ ...payload(), product: '' }), env })).status, 400);
  } finally { globalThis.fetch = oldFetch; }
});

test('provider failures do not claim receipt', async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('test network error'); };
  try {
    assert.equal((await onRequestPost({ request: request(payload()), env })).status, 502);
  } finally { globalThis.fetch = oldFetch; }
});
