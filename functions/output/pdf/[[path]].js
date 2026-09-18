export function onRequest() {
  return new Response('MSDS는 공급 제품 확인 후 개별 제공됩니다. https://www.hdchem.co.kr/msds 에서 요청해 주세요.', {
    status: 410, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, noarchive' },
  });
}
