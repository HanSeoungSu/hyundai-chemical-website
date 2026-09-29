(() => {
  const language = document.documentElement.lang === 'en' ? 'en' : 'ko';
  const dictionary = window.HDChemEnglish || {};
  const english = text => dictionary[text] || text;
  const t = (text, values = {}) => (language === 'en' ? english(text) : text)
    .replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);
  window.HDChemI18n = { language, t, english };
  document.querySelectorAll('[data-lang-switch]').forEach(link => {
    const target = new URL(link.href);
    target.search = location.search;
    target.hash = location.hash;
    const product = target.searchParams.get('product');
    if (product) {
      const name = link.dataset.langSwitch === 'en' ? english(product)
        : Object.keys(dictionary).find(key => dictionary[key] === product) || product;
      target.searchParams.set('product', name);
    }
    link.href = target.pathname + target.search + target.hash;
  });
})();
