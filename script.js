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

const productSearch = document.querySelector('#product-search');
const filterButtons = [...document.querySelectorAll('.filter-button')];
const productCards = [...document.querySelectorAll('.product-card[data-category]')];
const productCount = document.querySelector('#product-count');
const catalogEmpty = document.querySelector('#catalog-empty');
let activeProductFilter = 'all';

const normalizeSearchText = (value) => value
  .toLocaleLowerCase('ko-KR')
  .replace(/[\s\-·()]/g, '');

const updateProductCatalog = () => {
  const query = normalizeSearchText(productSearch?.value ?? '');
  let visibleCount = 0;

  productCards.forEach((card) => {
    const matchesCategory = activeProductFilter === 'all' || card.dataset.category === activeProductFilter;
    const matchesSearch = normalizeSearchText(card.dataset.search ?? '').includes(query);
    const isVisible = matchesCategory && matchesSearch;

    card.hidden = !isVisible;
    if (isVisible) {
      visibleCount += 1;
      card.classList.add('is-visible');
    }
  });

  if (productCount) {
    productCount.textContent = query || activeProductFilter !== 'all'
      ? `${visibleCount}개 검색 결과`
      : `${visibleCount}개 품목`;
  }

  if (catalogEmpty) {
    catalogEmpty.hidden = visibleCount !== 0;
  }
};

productSearch?.addEventListener('input', updateProductCatalog);

filterButtons.forEach((button) => button.addEventListener('click', () => {
  activeProductFilter = button.dataset.filter ?? 'all';

  filterButtons.forEach((item) => {
    const isActive = item === button;
    item.classList.toggle('is-active', isActive);
    item.setAttribute('aria-pressed', String(isActive));
  });

  updateProductCatalog();
}));

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
