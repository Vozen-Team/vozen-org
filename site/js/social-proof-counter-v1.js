(function () {
  'use strict';
  const strip = document.querySelector('.eco-social-proof');
  const number = strip?.querySelector('[data-proof-count]');
  if (!number || number.dataset.proofCounter) return;
  number.dataset.proofCounter = 'ready';
  const finalText = number.textContent.trim();
  const target = /^\d+$/.test(finalText) ? Number(finalText) : NaN;
  if (!Number.isSafeInteger(target) || target <= 0 || typeof window.matchMedia !== 'function') return;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (preference.matches || typeof window.IntersectionObserver !== 'function') return;

  let visible = false, started = false, completed = false, frame = 0;
  const observer = new window.IntersectionObserver(entries => {
    visible = entries.some(entry => entry.target === strip && entry.isIntersecting && entry.intersectionRatio >= .5);
    start();
  }, {threshold:.5});

  function finish() {
    completed = true;
    window.cancelAnimationFrame(frame);
    number.textContent = finalText;
    number.dataset.proofCounter = 'done';
    observer.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    if (preference.removeEventListener) preference.removeEventListener('change', onPreference);
    else preference.removeListener?.(onPreference);
  }
  function start() {
    if (started || completed || !visible || document.hidden) return;
    if (preference.matches) { finish(); return; }
    started = true;
    observer.disconnect();
    const began = performance.now();
    number.textContent = '0';
    function tick(now) {
      if (completed) return;
      const progress = Math.max(0, Math.min(1, (now - began) / 1600));
      number.textContent = String(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
      else finish();
    }
    frame = window.requestAnimationFrame(tick);
  }
  function onPreference() { if (preference.matches) finish(); }
  function onVisibility() {
    if (document.hidden && started) finish();
    else if (!document.hidden) start();
  }
  document.addEventListener('visibilitychange', onVisibility);
  if (preference.addEventListener) preference.addEventListener('change', onPreference);
  else preference.addListener?.(onPreference);
  observer.observe(strip);
})();
