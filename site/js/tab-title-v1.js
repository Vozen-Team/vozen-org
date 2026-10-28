(() => {
  'use strict';
  if (window.vozenTabTitleReady) return;
  window.vozenTabTitleReady = true;

  const awayTitle = 'Ainda estamos por aqui 👋';
  let pageTitle = document.title;
  const update = () => {
    if (document.title !== awayTitle) pageTitle = document.title;
    const title = document.hidden ? awayTitle : pageTitle;
    if (document.title !== title) document.title = title;
  };
  // Keep the current page/language title when another component updates it.
  new MutationObserver(update).observe(document.querySelector('title'), { childList: true, subtree: true, characterData: true });
  document.addEventListener('visibilitychange', update);
  update();
})();
