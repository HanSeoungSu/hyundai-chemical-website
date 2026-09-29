const msdsForm = document.querySelector('#msds-form');
if (msdsForm) {
  const product = new URLSearchParams(location.search).get('product');
  if (product) msdsForm.elements.product.value = product.slice(0, 200);
  const submit = msdsForm.querySelector('[data-msds-submit]');
  const status = msdsForm.querySelector('[data-form-status]');
  let pending = false;
  let lastPayload = '';
  let requestId = '';
  msdsForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (pending || !msdsForm.reportValidity()) return;
    const payload = Object.fromEntries(new FormData(msdsForm));
    payload.privacyConsent = msdsForm.elements.privacyConsent.checked;
    payload.language = language;
    const serialized = JSON.stringify(payload);
    if (lastPayload !== serialized || !requestId) requestId = crypto.randomUUID();
    lastPayload = serialized;
    payload.requestId = requestId;
    pending = true;
    submit.disabled = true;
    submit.textContent = t('접수 중…');
    msdsForm.setAttribute('aria-busy', 'true');
    status.className = 'form-status';
    status.textContent = '';
    try {
      const response = await fetch(msdsForm.action, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(30000),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(t(result.message || '요청을 접수하지 못했습니다.'));
      status.classList.add('is-success');
      status.textContent = `${t(result.message)} ${t('접수번호: {id}', { id: result.requestId })}`;
      msdsForm.reset();
      if (product) msdsForm.elements.product.value = product.slice(0, 200);
      requestId = '';
      lastPayload = '';
    } catch (error) {
      status.classList.add('is-error');
      status.textContent = t(error.name === 'TimeoutError'
        ? '접수 결과를 확인하지 못했습니다. 다시 시도하거나 052) 700-5888로 연락해 주세요.'
        : (error instanceof TypeError ? '접수하지 못했습니다. 052) 700-5888로 연락해 주세요.' : error.message || '접수하지 못했습니다. 052) 700-5888로 연락해 주세요.'));
    } finally {
      pending = false;
      submit.disabled = false;
      submit.textContent = t('MSDS 요청 보내기');
      msdsForm.removeAttribute('aria-busy');
    }
  });
}
