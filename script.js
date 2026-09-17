const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
const header = document.querySelector('.site-header');

const updateHeader = () => {
  header?.classList.toggle('is-scrolled', window.scrollY > 12);
};

updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

toggle?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
});

nav?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
  nav.classList.remove('open');
  toggle?.setAttribute('aria-expanded', 'false');
}));

const hero = document.querySelector('[data-hero]');
const tiltTarget = hero?.querySelector('[data-tilt]');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (hero && tiltTarget && !reduceMotion && window.matchMedia('(pointer: fine)').matches) {
  hero.addEventListener('pointermove', (event) => {
    const bounds = hero.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    const rotateY = (x - 0.5) * 8;
    const rotateX = (0.5 - y) * 7;

    hero.style.setProperty('--mx', `${x * 100}%`);
    hero.style.setProperty('--my', `${y * 100}%`);
    tiltTarget.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  hero.addEventListener('pointerleave', () => {
    hero.style.setProperty('--mx', '72%');
    hero.style.setProperty('--my', '38%');
    tiltTarget.style.transform = '';
  });
}

const businessAreasSection = document.querySelector('[data-business-areas]');
const businessAreaCards = [...document.querySelectorAll('[data-business-card]')];

if (businessAreasSection && businessAreaCards.length) {
  const setActiveBusinessArea = (card) => {
    const businessArea = card?.dataset.businessCard;

    if (businessArea) {
      businessAreasSection.dataset.activeBusiness = businessArea;
    } else {
      delete businessAreasSection.dataset.activeBusiness;
    }
  };

  businessAreaCards.forEach((card) => {
    card.addEventListener('pointerenter', () => setActiveBusinessArea(card));
    card.addEventListener('pointerleave', () => {
      if (!card.matches(':focus-visible')) setActiveBusinessArea(null);
    });
    card.addEventListener('focus', () => setActiveBusinessArea(card));
    card.addEventListener('blur', () => setActiveBusinessArea(null));
  });
}

const productSearch = document.querySelector('#product-search');
const filterButtons = [...document.querySelectorAll('.filter-button')];
const productCards = [...document.querySelectorAll('.product-card[data-category]')];
const productCount = document.querySelector('#product-count');
const productList = document.querySelector('#product-list');
const subcategoryPanel = document.querySelector('#catalog-subcategories');
const subcategoryList = document.querySelector('#subcategory-list');
const detailPanel = document.querySelector('#catalog-details');
const detailList = document.querySelector('#detail-list');
const familyPanel = document.querySelector('#catalog-families');
const familyList = document.querySelector('#family-list');
const familySingleList = document.querySelector('#family-single-list');
const catalogResultsHead = document.querySelector('#catalog-results-head');
const catalogResultsStep = document.querySelector('#catalog-results-step');
const catalogResultsTitle = document.querySelector('#catalog-results-title');
const catalogEmpty = document.querySelector('#catalog-empty');
const catalogEmptyTitle = document.querySelector('#catalog-empty-title');
const catalogEmptyDescription = document.querySelector('#catalog-empty-description');
let activeProductFilter = '';
let activeProductSubcategory = '';
let activeProductDetail = '';
let activeProductFamily = '';

const productCategoryLabels = new Map(filterButtons.map((button) => [
  button.dataset.filter ?? '',
  button.textContent.trim(),
]));

productCards.forEach((card) => {
  const subcategoryLabel = card.querySelector('.product-card-top small');
  const rawSubcategory = subcategoryLabel?.textContent.trim() || '기타 품목';
  const subcategory = card.dataset.category === 'laboratory'
    && (rawSubcategory === '실험실 소모품' || rawSubcategory === '실험실 기자재')
    ? '기구·소모품'
    : rawSubcategory;

  card.dataset.subcategory = subcategory;
  if (subcategoryLabel) subcategoryLabel.textContent = subcategory;
});

const normalizeSearchText = (value) => value
  .toLocaleLowerCase('ko-KR')
  .replace(/[\s\-·()]/g, '');

const productNameCollator = new Intl.Collator(['ko-KR', 'en-US'], {
  numeric: true,
  sensitivity: 'base',
});

const getProductCardName = (card) => card.querySelector('h3')?.textContent.trim() || '';

const getProductBaseName = (name) => {
  const nameWithoutConcentration = name.replace(/^\d+(?:\.\d+)?\s*%\s*/, '');
  const firstNumberIndex = nameWithoutConcentration.search(/\d/);
  const baseName = firstNumberIndex === -1
    ? nameWithoutConcentration
    : nameWithoutConcentration.slice(0, firstNumberIndex);

  return baseName.replace(/[\s()[\]{}%./-]+$/g, '').trim() || nameWithoutConcentration;
};

const getProductAmount = (name) => {
  const match = name.match(/(\d+(?:\.\d+)?)\s*(ML|CC|KG|L|G)?/i);
  if (!match) return Number.POSITIVE_INFINITY;

  const amount = Number(match[1]);
  const unit = (match[2] || '').toUpperCase();
  if (unit === 'L' || unit === 'KG') return amount * 1000;
  return amount;
};

const compareProductCards = (leftCard, rightCard) => {
  const leftName = getProductCardName(leftCard);
  const rightName = getProductCardName(rightCard);
  const baseNameResult = productNameCollator.compare(
    getProductBaseName(leftName),
    getProductBaseName(rightName),
  );

  if (baseNameResult !== 0) return baseNameResult;

  const amountResult = getProductAmount(leftName) - getProductAmount(rightName);
  if (Number.isFinite(amountResult) && amountResult !== 0) return amountResult;

  return productNameCollator.compare(leftName, rightName);
};

productCards.sort(compareProductCards).forEach((card) => productList?.append(card));

const getSubcategories = (category) => {
  const subcategories = new Map();

  productCards
    .filter((card) => card.dataset.category === category)
    .forEach((card) => {
      const name = card.dataset.subcategory ?? '기타 품목';
      subcategories.set(name, (subcategories.get(name) ?? 0) + 1);
    });

  return [...subcategories.entries()].map(([name, count], index) => ({ name, count, index }));
};

const getProductDetails = (category, subcategory) => {
  const details = new Map();

  productCards
    .filter((card) => card.dataset.category === category && card.dataset.subcategory === subcategory)
    .forEach((card) => {
      const name = card.dataset.detail;
      if (name) details.set(name, (details.get(name) ?? 0) + 1);
    });

  const preferredOrder = subcategory === '기구·소모품'
    ? ['측정·분석기구', '채취·분주용품', '용기·보관용품', '기타']
    : ['증류수', '메탄올'];

  return [...details.entries()]
    .sort(([left], [right]) => {
      const leftIndex = preferredOrder.indexOf(left);
      const rightIndex = preferredOrder.indexOf(right);
      if (leftIndex === -1 && rightIndex === -1) return 0;
      if (leftIndex === -1) return 1;
      if (rightIndex === -1) return -1;
      return leftIndex - rightIndex;
    })
    .map(([name, count], index) => ({ name, count, index }));
};

const getProductFamilies = (category, subcategory, detail) => {
  const families = new Map();
  const matchingCards = productCards.filter((card) => card.dataset.category === category
    && card.dataset.subcategory === subcategory
    && card.dataset.detail === detail);

  matchingCards.forEach((card) => {
    const name = card.dataset.family;
    if (name) families.set(name, (families.get(name) ?? 0) + 1);
  });

  return [...families.entries()]
    .sort(([left], [right]) => productNameCollator.compare(left, right))
    .map(([name, count], index) => ({ name, count, index }));
};

const createCatalogTierButton = ({ name, count, index, isActive, onClick }) => {
  const button = document.createElement('button');
  const step = document.createElement('span');
  const copy = document.createElement('span');
  const title = document.createElement('strong');
  const meta = document.createElement('small');
  const arrow = document.createElement('b');

  button.type = 'button';
  button.className = 'subcategory-button';
  button.classList.toggle('is-active', isActive);
  button.setAttribute('aria-pressed', String(isActive));
  step.className = 'subcategory-index';
  step.textContent = String(index + 1).padStart(2, '0');
  copy.className = 'subcategory-copy';
  title.textContent = name;
  meta.textContent = `${count}개 제품`;
  arrow.className = 'subcategory-arrow';
  arrow.textContent = '↘';
  copy.append(title, meta);
  button.append(step, copy, arrow);
  button.addEventListener('click', onClick);

  return button;
};

const renderProductSubcategories = (query) => {
  if (!subcategoryPanel || !subcategoryList) return [];

  const options = getSubcategories(activeProductFilter);
  const shouldShow = Boolean(activeProductFilter) && !query;
  subcategoryPanel.hidden = !shouldShow;
  subcategoryPanel.classList.toggle('is-visible', shouldShow);
  subcategoryList.replaceChildren();

  if (!shouldShow) return options;

  options.forEach(({ name, count, index }) => {
    const isActive = name === activeProductSubcategory;
    const button = createCatalogTierButton({
      name,
      count,
      index,
      isActive,
      onClick: () => {
        activeProductSubcategory = isActive ? '' : name;
        activeProductDetail = '';
        activeProductFamily = '';
        updateProductCatalog();
      },
    });
    button.dataset.subcategory = name;
    subcategoryList.append(button);
  });

  return options;
};

const renderProductDetails = (query) => {
  if (!detailPanel || !detailList) return [];

  const options = getProductDetails(activeProductFilter, activeProductSubcategory);
  const shouldShow = Boolean(activeProductSubcategory) && options.length > 0 && !query;
  detailPanel.hidden = !shouldShow;
  detailPanel.classList.toggle('is-visible', shouldShow);
  detailList.replaceChildren();

  if (!shouldShow) return options;

  options.forEach(({ name, count, index }) => {
    const isActive = name === activeProductDetail;
    const button = createCatalogTierButton({
      name,
      count,
      index,
      isActive,
      onClick: () => {
        activeProductDetail = isActive ? '' : name;
        activeProductFamily = '';
        updateProductCatalog();
      },
    });
    button.dataset.detail = name;
    detailList.append(button);
  });

  return options;
};

const renderProductFamilies = (query) => {
  if (!familyPanel || !familyList || !familySingleList) return [];

  const options = getProductFamilies(activeProductFilter, activeProductSubcategory, activeProductDetail);
  const selectableOptions = options.filter(({ count }) => count > 1);
  const singleOptions = options.filter(({ count }) => count === 1);
  const shouldShow = Boolean(activeProductDetail) && options.length > 0 && !query;
  familyPanel.hidden = !shouldShow;
  familyPanel.classList.toggle('is-visible', shouldShow);
  familyList.replaceChildren();
  familySingleList.replaceChildren();
  familyList.hidden = !shouldShow || selectableOptions.length === 0;
  familySingleList.hidden = !shouldShow || singleOptions.length === 0;

  if (!shouldShow) return options;

  selectableOptions.forEach(({ name, count }, index) => {
    const isActive = name === activeProductFamily;
    const button = createCatalogTierButton({
      name,
      count,
      index,
      isActive,
      onClick: () => {
        activeProductFamily = isActive ? '' : name;
        updateProductCatalog();
      },
    });
    button.dataset.family = name;
    familyList.append(button);
  });

  singleOptions.forEach(({ name }) => {
    const sourceCard = productCards.find((card) => card.dataset.category === activeProductFilter
      && card.dataset.subcategory === activeProductSubcategory
      && card.dataset.detail === activeProductDetail
      && card.dataset.family === name);

    if (!sourceCard) return;

    const inlineCard = sourceCard.cloneNode(true);
    inlineCard.hidden = false;
    inlineCard.classList.remove('reveal', 'is-visible');
    inlineCard.classList.add('catalog-inline-product');
    familySingleList.append(inlineCard);
  });

  return options;
};

const updateProductCatalog = () => {
  const query = normalizeSearchText(productSearch?.value ?? '');
  const hasCategory = Boolean(activeProductFilter);
  const hasSubcategory = Boolean(activeProductSubcategory);
  const hasDetail = Boolean(activeProductDetail);
  const hasFamily = Boolean(activeProductFamily);
  const hasQuery = Boolean(query);
  const subcategoryOptions = renderProductSubcategories(query);
  const detailOptions = renderProductDetails(query);
  const familyOptions = renderProductFamilies(query);
  const requiresDetail = detailOptions.length > 0;
  const selectableFamilyOptions = familyOptions.filter(({ count }) => count > 1);
  const inlineFamilyNames = new Set(familyOptions
    .filter(({ count }) => count === 1)
    .map(({ name }) => name));
  const hasFamilyChoices = selectableFamilyOptions.length > 0;
  const hasInlineProducts = inlineFamilyNames.size > 0;
  let visibleCount = 0;

  productCards.forEach((card) => {
    const matchesCategory = hasCategory
      ? card.dataset.category === activeProductFilter
      : hasQuery;
    const matchesSubcategory = hasQuery
      ? true
      : hasSubcategory && card.dataset.subcategory === activeProductSubcategory;
    const matchesDetail = hasQuery || !requiresDetail
      ? true
      : hasDetail && card.dataset.detail === activeProductDetail;
    const cardFamily = card.dataset.family || '';
    const matchesFamily = hasQuery
      ? true
      : inlineFamilyNames.has(cardFamily)
        ? false
        : !hasFamilyChoices
          ? true
          : hasFamily && cardFamily === activeProductFamily;
    const matchesSearch = normalizeSearchText(card.dataset.search ?? '').includes(query);
    const isVisible = matchesCategory && matchesSubcategory && matchesDetail && matchesFamily && matchesSearch;

    card.hidden = !isVisible;
    if (isVisible) {
      visibleCount += 1;
      card.classList.add('is-visible');
    }
  });

  const isAwaitingCategory = !hasCategory && !hasQuery;
  const isAwaitingSubcategory = hasCategory && !hasSubcategory && !hasQuery;
  const isAwaitingDetail = hasSubcategory && requiresDetail && !hasDetail && !hasQuery;
  const isAwaitingFamily = hasDetail && hasFamilyChoices && !hasFamily && !hasQuery && !hasInlineProducts;
  productList?.classList.toggle('is-awaiting-filter', isAwaitingCategory
    || isAwaitingSubcategory
    || isAwaitingDetail
    || isAwaitingFamily);

  if (catalogResultsHead) {
    catalogResultsHead.hidden = !(hasQuery
      || (hasSubcategory && !requiresDetail)
      || hasFamily
      || (hasDetail && visibleCount > 0));
  }

  if (catalogResultsStep) {
    catalogResultsStep.textContent = hasQuery
      ? 'SEARCH RESULT'
      : hasFamily
        ? 'STEP 05'
        : hasDetail
          ? 'STEP 04'
          : 'STEP 03';
  }

  if (catalogResultsTitle) {
    catalogResultsTitle.textContent = hasQuery
      ? '제품 검색 결과'
      : hasFamily
        ? `${activeProductFamily} 제품`
        : `${activeProductDetail || activeProductSubcategory} 제품`;
  }

  if (productCount) {
    const categoryLabel = productCategoryLabels.get(activeProductFilter) ?? '';

    if (hasQuery) {
      productCount.textContent = `${visibleCount}개 검색 결과${categoryLabel ? ` · ${categoryLabel}` : ''}`;
    } else if (hasFamily) {
      productCount.textContent = `${activeProductFamily} · ${visibleCount}개 제품`;
    } else if (hasDetail && hasFamilyChoices) {
      productCount.textContent = `${activeProductDetail} · 단일 제품 ${inlineFamilyNames.size}개 · 제품군 ${selectableFamilyOptions.length}개`;
    } else if (hasDetail) {
      const detailProductCount = productCards.filter((card) => card.dataset.category === activeProductFilter
        && card.dataset.subcategory === activeProductSubcategory
        && card.dataset.detail === activeProductDetail).length;
      productCount.textContent = `${activeProductDetail} · ${detailProductCount}개 제품`;
    } else if (requiresDetail) {
      productCount.textContent = `${activeProductSubcategory} · 소분류 ${detailOptions.length}개`;
    } else if (hasSubcategory) {
      productCount.textContent = `${activeProductSubcategory} · ${visibleCount}개 제품`;
    } else if (hasCategory) {
      productCount.textContent = `${categoryLabel} · 중분류 ${subcategoryOptions.length}개`;
    } else {
      productCount.textContent = '대분류를 선택해 주세요';
    }
  }

  if (catalogEmpty) {
    const hasNoResults = (hasQuery
      || hasFamily
      || (hasDetail && !hasFamilyChoices)
      || (hasSubcategory && !requiresDetail)) && visibleCount === 0;
    catalogEmpty.hidden = !(isAwaitingCategory
      || isAwaitingSubcategory
      || isAwaitingDetail
      || isAwaitingFamily
      || hasNoResults);

    if (catalogEmptyTitle) {
      catalogEmptyTitle.textContent = isAwaitingCategory
        ? '대분류를 선택해 주세요.'
        : isAwaitingSubcategory
          ? '중분류를 선택해 주세요.'
          : isAwaitingDetail
            ? '소분류를 선택해 주세요.'
            : isAwaitingFamily
              ? '제품 종류를 선택해 주세요.'
              : '검색 결과가 없습니다.';
    }

    if (catalogEmptyDescription) {
      catalogEmptyDescription.textContent = isAwaitingCategory
        ? '위 대분류를 선택하면 관련 중분류가 단계별로 표시됩니다.'
        : isAwaitingSubcategory
          ? '중분류를 선택하면 해당 제품을 간결한 카드 목록으로 확인할 수 있습니다.'
          : isAwaitingDetail
            ? '소분류를 선택하면 관련 제품군과 단일 제품을 확인할 수 있습니다.'
            : isAwaitingFamily
              ? '규격별 제품군을 선택하면 해당 제품이 표시됩니다.'
              : '검색어나 제품군을 변경해 다시 확인해 주세요.';
    }
  }
};

productSearch?.addEventListener('input', updateProductCatalog);

filterButtons.forEach((button) => button.addEventListener('click', () => {
  activeProductFilter = button.dataset.filter ?? '';
  activeProductSubcategory = '';
  activeProductDetail = '';
  activeProductFamily = '';

  filterButtons.forEach((item) => {
    const isActive = item === button;
    item.classList.toggle('is-active', isActive);
    item.setAttribute('aria-pressed', String(isActive));
  });

  updateProductCatalog();
}));

updateProductCatalog();

const marineGalleryTriggers = document.querySelectorAll('[data-marine-gallery-trigger]');

const setMarineGalleryState = (trigger, isOpen) => {
  const galleryId = trigger.getAttribute('aria-controls');
  const gallery = galleryId ? document.getElementById(galleryId) : null;
  const cueLabel = trigger.querySelector('.marine-photo-cue span');

  trigger.setAttribute('aria-expanded', String(isOpen));
  trigger.classList.toggle('is-open', isOpen);

  if (gallery) {
    gallery.hidden = !isOpen;
  }

  if (cueLabel) {
    cueLabel.textContent = isOpen ? '작업사진 닫기' : '작업사진 보기';
  }
};

marineGalleryTriggers.forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const shouldOpen = trigger.getAttribute('aria-expanded') !== 'true';

    marineGalleryTriggers.forEach((item) => {
      setMarineGalleryState(item, item === trigger && shouldOpen);
    });
  });
});

const quoteForm = document.querySelector('#quote-form');
const quoteSubmit = quoteForm?.querySelector('[data-quote-submit]');
const quoteStatus = quoteForm?.querySelector('[data-form-status]');

quoteForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!quoteForm.checkValidity()) {
    quoteForm.reportValidity();
    return;
  }

  const originalButtonText = quoteSubmit?.textContent ?? '견적문의 보내기';
  const formData = new FormData(quoteForm);
  const payload = Object.fromEntries(formData.entries());
  payload.privacyConsent = formData.has('privacyConsent');

  quoteForm.setAttribute('aria-busy', 'true');
  if (quoteSubmit) {
    quoteSubmit.disabled = true;
    quoteSubmit.textContent = '전송 중...';
  }
  if (quoteStatus) {
    quoteStatus.textContent = '';
    quoteStatus.className = 'form-status';
  }

  try {
    const response = await fetch(quoteForm.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      const fallbackMessage = window.location.protocol === 'http:'
        ? '로컬 미리보기에서는 메일이 발송되지 않습니다. 배포 설정 후 사용할 수 있습니다.'
        : '견적문의를 전송하지 못했습니다.';
      throw new Error(result.message || fallbackMessage);
    }

    quoteForm.reset();
    if (quoteStatus) {
      quoteStatus.textContent = result.message;
      quoteStatus.classList.add('is-success');
    }
  } catch (error) {
    if (quoteStatus) {
      quoteStatus.textContent = error.message || '전송 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
      quoteStatus.classList.add('is-error');
    }
  } finally {
    quoteForm.removeAttribute('aria-busy');
    if (quoteSubmit) {
      quoteSubmit.disabled = false;
      quoteSubmit.textContent = originalButtonText;
    }
  }
});

const naverMapElement = document.querySelector('[data-naver-map]');

if (naverMapElement) {
  const mapShell = naverMapElement.closest('.naver-map-shell');
  const mapStatus = mapShell?.querySelector('[data-map-status]');
  const ncpKeyId = naverMapElement.dataset.ncpKeyId?.trim();
  const latitude = Number(naverMapElement.dataset.latitude);
  const longitude = Number(naverMapElement.dataset.longitude);

  const showMapMessage = (title, message) => {
    if (!mapStatus) return;
    mapStatus.hidden = false;
    const heading = mapStatus.querySelector('strong');
    const copy = mapStatus.querySelector('p');
    if (heading) heading.textContent = title;
    if (copy) copy.textContent = message;
  };

  if (ncpKeyId && Number.isFinite(latitude) && Number.isFinite(longitude)) {
    let mapAuthenticationFailed = false;
    const mapLoadTimeout = window.setTimeout(() => {
      showMapMessage('지도를 불러오지 못했습니다.', '네이버 클라우드의 Web 서비스 URL과 Client ID 설정을 확인해 주세요.');
    }, 10000);

    window.navermap_authFailure = () => {
      mapAuthenticationFailed = true;
      window.clearTimeout(mapLoadTimeout);
      showMapMessage('지도를 불러오지 못했습니다.', '네이버 클라우드의 Web 서비스 URL과 Client ID 설정을 확인해 주세요.');
    };

    const initializeNaverMap = () => {
      window.clearTimeout(mapLoadTimeout);
      if (mapAuthenticationFailed || !window.naver?.maps) {
        if (!mapAuthenticationFailed) {
          showMapMessage('지도를 불러오지 못했습니다.', '네이버 클라우드의 Web 서비스 URL과 Client ID 설정을 확인해 주세요.');
        }
        return;
      }

      try {
        const companyPosition = new window.naver.maps.LatLng(latitude, longitude);
        const map = new window.naver.maps.Map(naverMapElement, {
          center: companyPosition,
          zoom: 17,
          mapTypeControl: true,
          scaleControl: true,
        });
        if (mapStatus) mapStatus.hidden = true;

        try {
          const marker = new window.naver.maps.Marker({
            position: companyPosition,
            map,
          });
          const infoWindow = new window.naver.maps.InfoWindow({
            content: '<div class="naver-map-label"><strong>(주)현대케미칼</strong><span>울산광역시 남구 장생포로 19번길 29</span></div>',
          });

          infoWindow.open(map, marker);
          window.naver.maps.Event.addListener(marker, 'click', () => infoWindow.open(map, marker));
        } catch (error) {
          console.error('[Naver Map] Marker initialization failed.', error);
        }
      } catch (error) {
        console.error('[Naver Map] Map initialization failed.', error);
        showMapMessage('지도를 불러오지 못했습니다.', '잠시 후 다시 시도해 주세요.');
      }
    };

    const mapScript = document.createElement('script');
    mapScript.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(ncpKeyId)}`;
    mapScript.async = true;
    mapScript.onload = initializeNaverMap;
    mapScript.onerror = () => {
      window.clearTimeout(mapLoadTimeout);
      showMapMessage('지도를 불러오지 못했습니다.', '네트워크 연결을 확인한 뒤 다시 시도해 주세요.');
    };
    document.head.appendChild(mapScript);
  }
}

document.querySelectorAll('[data-current-year]').forEach((year) => {
  year.textContent = new Date().getFullYear();
});

const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
