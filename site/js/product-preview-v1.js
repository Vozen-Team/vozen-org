/* Local proposal only; shared product and billing behavior stays untouched. */
(() => {
  document.querySelectorAll('.plan-preview [role="group"]').forEach(group => {
    const buttons = group.querySelectorAll('button[data-bill], button[data-seats]');
    const sync = () => buttons.forEach(button => button.setAttribute('aria-pressed', String(button.classList.contains('is-active'))));
    buttons.forEach(button => button.addEventListener('click', sync));
    sync();
  });
  const refreshExample = () => {
    const locale = document.documentElement.dataset.vozenLocale || 'en';
    if (locale === 'en') document.querySelectorAll('[data-preview-copy]').forEach((element) => {
      if (element.textContent !== element.dataset.previewCopy) element.textContent = element.dataset.previewCopy;
    });
    const labels = window.VOZEN_I18N?.[locale] || window.VOZEN_I18N?.en;
    document.querySelectorAll('.product-preview .speaking').forEach((element) => {
      const node = element.lastChild;
      if (node?.nodeType === Node.TEXT_NODE && node.textContent.includes('tts.reading')) {
        node.textContent = ' ' + (labels?.['tts.reading'] || 'reading it out loud…');
      }
    });
  };
  Promise.resolve(window.vozenPublicI18nReady).then(refreshExample);
  window.addEventListener('vozen:languagechange', refreshExample);
  window.addEventListener('vozen:i18nready', refreshExample);
})();
