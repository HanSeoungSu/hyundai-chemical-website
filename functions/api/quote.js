const DEFAULT_TO_EMAIL = 'hdchem0718@naver.com';
const MAX_BODY_BYTES = 30_000;

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  },
});

const cleanText = (value, maxLength) => String(value ?? '')
  .replace(/\r\n/g, '\n')
  .trim()
  .slice(0, maxLength);

const oneLine = (value) => value.replace(/[\r\n]+/g, ' ');

const escapeHtml = (value) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const parsePayload = async (request) => {
  const contentType = request.headers.get('Content-Type') ?? '';

  if (contentType.includes('application/json')) {
    return request.json();
  }

  const formData = await request.formData();
  return Object.fromEntries(formData.entries());
};

export async function onRequestPost({ request, env }) {
  const contentLength = Number(request.headers.get('Content-Length') ?? 0);

  if (contentLength > MAX_BODY_BYTES) {
    return jsonResponse({ ok: false, message: '문의 내용이 너무 깁니다.' }, 413);
  }

  const origin = request.headers.get('Origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return jsonResponse({ ok: false, message: '허용되지 않은 요청입니다.' }, 403);
  }

  let payload;
  try {
    payload = await parsePayload(request);
  } catch {
    return jsonResponse({ ok: false, message: '입력 내용을 확인해 주세요.' }, 400);
  }

  const website = cleanText(payload.website, 200);
  if (website) {
    return jsonResponse({ ok: true, message: '견적문의가 접수되었습니다.' });
  }

  const inquiry = {
    company: cleanText(payload.company, 100),
    contactName: cleanText(payload.contactName, 50),
    phone: cleanText(payload.phone, 30),
    email: cleanText(payload.email, 254),
    product: cleanText(payload.product, 200),
    message: cleanText(payload.message, 3000),
  };
  const privacyConsent = ['true', '1', 'on', 'yes'].includes(
    String(payload.privacyConsent ?? '').toLowerCase(),
  );

  if (Object.values(inquiry).some((value) => !value) || !privacyConsent) {
    return jsonResponse({ ok: false, message: '모든 항목을 입력하고 개인정보 이용에 동의해 주세요.' }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiry.email)) {
    return jsonResponse({ ok: false, message: '이메일 주소를 정확히 입력해 주세요.' }, 400);
  }

  if (!env.RESEND_API_KEY || !env.QUOTE_FROM_EMAIL) {
    return jsonResponse({ ok: false, message: '메일 전송 설정이 아직 완료되지 않았습니다.' }, 503);
  }

  const receivedAt = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    dateStyle: 'long',
    timeStyle: 'medium',
  }).format(new Date());
  const rows = [
    ['접수 시간', receivedAt],
    ['회사명', inquiry.company],
    ['담당자', inquiry.contactName],
    ['연락처', inquiry.phone],
    ['이메일', inquiry.email],
    ['필요 제품', inquiry.product],
  ];
  const htmlRows = rows.map(([label, value]) => `
    <tr>
      <th style="width:120px;padding:12px;border:1px solid #d7e0e7;background:#eef4f8;text-align:left;">${escapeHtml(label)}</th>
      <td style="padding:12px;border:1px solid #d7e0e7;">${escapeHtml(value)}</td>
    </tr>`).join('');
  const textRows = rows.map(([label, value]) => `${label}: ${value}`).join('\n');
  const subject = `[홈페이지 견적문의] ${oneLine(inquiry.company)} · ${oneLine(inquiry.product)}`;

  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify({
      from: env.QUOTE_FROM_EMAIL,
      to: [env.QUOTE_TO_EMAIL || DEFAULT_TO_EMAIL],
      reply_to: inquiry.email,
      subject,
      html: `
        <div style="max-width:680px;margin:0 auto;font-family:Arial,'Malgun Gothic',sans-serif;color:#172d40;line-height:1.65;">
          <h1 style="margin:0 0 18px;font-size:24px;color:#123f65;">홈페이지 견적문의</h1>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">${htmlRows}</table>
          <h2 style="margin:26px 0 10px;font-size:17px;color:#123f65;">문의 내용</h2>
          <div style="padding:18px;border:1px solid #d7e0e7;background:#f8fafb;white-space:pre-wrap;">${escapeHtml(inquiry.message)}</div>
          <p style="margin:20px 0 0;color:#6a7b89;font-size:12px;">현대케미칼 홈페이지 견적문의에서 자동으로 전달된 메일입니다.</p>
        </div>`,
      text: `홈페이지 견적문의\n\n${textRows}\n\n문의 내용\n${inquiry.message}`,
    }),
  });

  if (!emailResponse.ok) {
    console.error('Quote email provider error:', emailResponse.status);
    return jsonResponse({ ok: false, message: '메일 전송 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.' }, 502);
  }

  return jsonResponse({ ok: true, message: '견적문의가 정상적으로 접수되었습니다.' });
}

export function onRequest() {
  return jsonResponse({ ok: false, message: '지원하지 않는 요청 방식입니다.' }, 405);
}
