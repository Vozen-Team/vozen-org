(() => {
  'use strict';
  if (window.vozenTabTitleReady) return;
  window.vozenTabTitleReady = true;

  const messages = {
    en: "We're still here 👋",
    pt: 'Ainda estamos por aqui 👋',
    fr: 'On est toujours là 👋',
    es: 'Seguimos aquí 👋',
    de: 'Wir sind noch da 👋',
    tr: 'Hâlâ buradayız 👋',
    ar: 'ما زلنا هنا 👋',
    zh: '我們還在這裡 👋',
    ru: 'Мы всё ещё здесь 👋',
    ko: '아직 여기 있어요 👋',
  };
  let awayTitle;
  let pageTitle = document.title;
  const update = () => {
    if (document.title !== awayTitle) pageTitle = document.title;
    const locale = document.documentElement.lang.toLowerCase().split('-')[0];
    awayTitle = Object.hasOwn(messages, locale) ? messages[locale] : messages.en;
    const title = document.hidden ? awayTitle : pageTitle;
    if (document.title !== title) document.title = title;
  };
  // Keep the current page/language title when another component updates it.
  const observer = new MutationObserver(update);
  observer.observe(document.querySelector('title'), { childList: true, subtree: true, characterData: true });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  document.addEventListener('visibilitychange', update);
  window.addEventListener('vozen:languagechange', update);
  update();
})();
