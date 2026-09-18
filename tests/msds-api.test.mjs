import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../functions/api/msds.js', import.meta.url), 'utf8');
const { onRequestPost, onRequest } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const env = { RESEND_API_KEY: 'test-only', QUOTE_FROM_EMAIL: 'test@example.com' };
const payload = () => ({ requestId: crypto.randomUUID(), company: '테스트회사', contactName: '담당자', phone: '010-0000-0000', email: 'test@example.com', product: '톨루엔', privacyConsent: true });
const request = (data, extra = {}) => new Request('https://www.hdchem.co.kr/api/msds', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://www.hdchem.co.kr', ...extra }, body: JSON.stringify(data) });
test('rejects missing consent, malformed dates and header injection without sending', async () => {
  const old = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('must not transmit'); };
  try {
    for (const changed of [{ privacyConsent: false }, { deliveryDate: '2026-02-30' }, { company: 'x\r\nBCC:a@example.com' }, { email: 'bad' }, { requestId: 'bad' }]) {
      assert.equal((await onRequestPost({ request: request({ ...payload(), ...changed }), env })).status, 400);
    }
  } finally { globalThis.fetch = old; }
});
test('rejects cross-origin, large body and unsupported methods', async () => {
  assert.equal((await onRequestPost({ request: request(payload(), { Origin: 'https://other.example' }), env })).status, 403);
  assert.equal((await onRequestPost({ request: request({ ...payload(), message: 'a'.repeat(20000) }), env })).status, 413);
  assert.equal(onRequest().status, 405);
});
test('sends only a request JSON attachment to company and retries with stable body', async () => {
  const old = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url, ...options }); return new Response('{"id":"test"}', { status: 200 }); };
  try {
    const data = payload();
    data.message = '<script>test</script>';
    for (let i = 0; i < 2; i++) assert.equal((await onRequestPost({ request: request(data), env })).status, 200);
    assert.equal(calls[0].body, calls[1].body);
    assert.equal(calls[0].headers['Idempotency-Key'], calls[1].headers['Idempotency-Key']);
    const mail = JSON.parse(calls[0].body);
    assert.deepEqual(mail.to, ['hdchem0718@naver.com']);
    assert.equal(mail.attachments.length, 1);
    const attachment = JSON.parse(Buffer.from(mail.attachments[0].content, 'base64').toString('utf8'));
    assert.equal(attachment.product, '톨루엔');
    assert.equal(attachment.schema, 'hdchem.msds.request.v1');
    assert.equal(attachment.privacyConsent, true);
    assert.ok(!mail.html.includes('<script>'));
    assert.ok(!Object.keys(attachment).some(k => /manufacturer|inventory|price/i.test(k)));
  } finally { globalThis.fetch = old; }
});
test('provider errors do not claim successful receipt', async () => {
  const old = globalThis.fetch;
  globalThis.fetch = async () => new Response('{}', { status: 503 });
  try { assert.equal((await onRequestPost({ request: request(payload()), env })).status, 502); }
  finally { globalThis.fetch = old; }
  assert.equal((await onRequestPost({ request: request(payload()), env: {} })).status, 503);
});
test('old PDF route returns gone without serving any file', async () => {
  const gone = await readFile(new URL('../functions/output/pdf/[[path]].js', import.meta.url), 'utf8');
  const route = await import('data:text/javascript;base64,' + Buffer.from(gone).toString('base64'));
  assert.equal(route.onRequest().status, 410);
});
