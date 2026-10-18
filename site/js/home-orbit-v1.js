(() => {
  const orbit = document.querySelector('[data-home-orbit]');
  if (!orbit) return;

  const button = orbit.querySelector('[data-orbit-pause]');
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canObserve = typeof IntersectionObserver === 'function';
  let visible = false;
  let paused = false;
  const update = () => {
    orbit.dataset.orbitRunning = String(visible && !document.hidden && !preference.matches && !paused);
    button.hidden = preference.matches || !canObserve;
    button.setAttribute('aria-pressed', String(paused));
  };

  button.addEventListener('click', () => { paused = !paused; update(); });
  document.addEventListener('visibilitychange', update);
  preference.addEventListener('change', update);
  if (canObserve) {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      visible = entry.isIntersecting;
      update();
    }, { threshold: .01 });
    observer.observe(orbit);
  }
  update();
})();
