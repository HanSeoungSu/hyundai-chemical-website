// Email notification only. No inventory connection or automatic document delivery.
const MAX_BYTES = 16000;
const reply = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});
const escape = (text) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function readBounded(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('empty');
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) { await reader.cancel(); throw new Error('large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return reply({ ok: false, message: '허용되지 않은 요청입니다.' }, 403);
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return reply({ ok: false, message: '입력 형식을 확인해 주세요.' }, 415);
  let data;
  try { data = await readBounded(request); } catch (error) {
    return reply({ ok: false, message: '입력 내용과 길이를 확인해 주세요.' }, error.message === 'large' ? 413 : 400);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return reply({ ok: false, message: '입력 내용을 확인해 주세요.' }, 400);
  const requestId = data.requestId;
  if (!uuid.test(requestId || '')) return reply({ ok: false, message: '페이지를 새로 열어 다시 요청해 주세요.' }, 400);
  if (data.website) return reply({ ok: true, requestId, message: 'MSDS 요청이 접수되었습니다.' });
  const limits = { company: 100, contactName: 50, phone: 30, email: 254, product: 200, deliveryDate: 10, reference: 150, message: 2000 };
  const inquiry = {};
  for (const [key, limit] of Object.entries(limits)) {
    const value = data[key] ?? '';
    if (typeof value !== 'string' || value.length > limit || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) return reply({ ok: false, message: '입력 내용을 확인해 주세요.' }, 400);
    inquiry[key] = value.trim();
    if (key !== 'message' && /[\r\n]/.test(value)) return reply({ ok: false, message: '입력 내용을 확인해 주세요.' }, 400);
  }
  if (!['company', 'contactName', 'phone', 'email', 'product'].every(key => inquiry[key]) || data.privacyConsent !== true
      || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(inquiry.email)) return reply({ ok: false, message: '필수 항목과 개인정보 이용 동의를 확인해 주세요.' }, 400);
  if (inquiry.deliveryDate && (!/^\d{4}-\d{2}-\d{2}$/.test(inquiry.deliveryDate) || Number.isNaN(Date.parse(inquiry.deliveryDate)) || new Date(inquiry.deliveryDate).toISOString().slice(0, 10) !== inquiry.deliveryDate)) return reply({ ok: false, message: '납품일을 확인해 주세요.' }, 400);
  if (!env.RESEND_API_KEY || !env.QUOTE_FROM_EMAIL) return reply({ ok: false, message: '온라인 접수가 준비 중입니다. 052) 700-5888로 연락해 주세요.' }, 503);
  // Keep retries identical so a network timeout does not create duplicate notifications.
  const language = data.language === 'en' ? 'English' : '한국어';
  const labels = { company: '회사명', contactName: '담당자', phone: '연락처', email: '수신 이메일', product: '제품', deliveryDate: '납품일', reference: '명세서·로트번호', message: '추가 요청' };
  const text = `홈페이지 MSDS 요청\n접수번호: ${requestId}\n요청 언어: ${language}\n` + Object.entries(labels).map(([key, label]) => `${label}: ${inquiry[key] || '-'}`).join('\n')
    + '\n\n담당자가 요청 제품과 공급 내역을 확인한 뒤 회신해 주세요. 이 메일에 답장하면 요청 고객에게 전달됩니다.';
  const rows = Object.entries(labels).map(([key, label]) => `<tr><th style="padding:12px;border:1px solid #d7e0e7;text-align:left;background:#eef4f8;width:125px">${label}</th><td style="padding:12px;border:1px solid #d7e0e7;white-space:pre-wrap">${escape(inquiry[key] || '-')}</td></tr>`).join('');
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(20000),
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `msds-${requestId}` },
      body: JSON.stringify({ from: env.QUOTE_FROM_EMAIL, to: [env.MSDS_TO_EMAIL || env.QUOTE_TO_EMAIL || 'hdchem0718@naver.com'],
        reply_to: inquiry.email, subject: `[MSDS 요청] ${inquiry.company} · ${inquiry.product}`, text,
        html: `<div style="max-width:720px;font-family:Arial,'Malgun Gothic',sans-serif;color:#172d40;line-height:1.6"><h1>홈페이지 MSDS 요청</h1><p>접수번호: ${requestId}<br>요청 언어: ${language}</p><table style="width:100%;border-collapse:collapse">${rows}</table><p>담당자가 요청 제품과 공급 내역을 확인한 뒤 회신해 주세요.<br>이 메일에 답장하면 요청 고객에게 전달됩니다.</p></div>`,
      }),
    });
    if (!response.ok) return reply({ ok: false, message: '접수 결과를 확인하지 못했습니다. 다시 시도하거나 대표전화로 연락해 주세요.' }, 502);
  } catch {
    return reply({ ok: false, message: '접수 결과를 확인하지 못했습니다. 다시 시도하거나 대표전화로 연락해 주세요.' }, 502);
  }
  return reply({ ok: true, requestId, message: 'MSDS 요청이 접수되었습니다. 공급 제품 확인 후 이메일로 안내해 드리겠습니다.' });
}
export function onRequest() { return reply({ ok: false, message: '지원하지 않는 요청 방식입니다.' }, 405); }
