/* Illustrative feature moments, once on arrival; no sound or simulated live data. */
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('[data-feature-scene]').forEach(scene => {
    const activate = () => scene.classList.add('is-feature-active');
    if (reduced.matches || typeof IntersectionObserver === 'undefined') activate();
    else {
      const observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .4)) return;
        activate();
        observer.disconnect();
      }, { threshold: .4 });
      observer.observe(scene);
    }
    scene.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse' || reduced.matches) return;
      scene.classList.remove('is-feature-active');
      requestAnimationFrame(() => requestAnimationFrame(activate));
    });
  });
})();
