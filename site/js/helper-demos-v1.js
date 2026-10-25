/* Fictional, one-shot scenes. No requests, storage or Discord actions. */
(() => {
  document.querySelectorAll('[data-demo]').forEach((scene) => {
    const showResult = () => {
      scene.classList.add('is-demo-active');
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || typeof IntersectionObserver === 'undefined') showResult();
    else {
      const observer = new IntersectionObserver((entries) => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        showResult();
        observer.disconnect();
      }, { threshold: .35 });
      observer.observe(scene);
    }
  });
})();
