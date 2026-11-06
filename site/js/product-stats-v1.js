(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      const start = performance.now();
      for (const element of entry.target.querySelectorAll('[data-count-to]')) {
        const target = Number(element.dataset.countTo);
        const finalText = element.textContent;
        const tick = now => {
          const progress = reducedMotion.matches ? 1 : Math.min(1, (now - start) / 1100);
          const value = Math.round(target * (1 - Math.pow(1 - progress, 3)));
          const text = progress === 1 ? finalText : element.dataset.countFormat === 'duration'
            ? `${Math.floor(value / 60)}h ${value % 60}m` : String(value);
          if (element.textContent !== text) element.textContent = text;
          if (progress < 1) requestAnimationFrame(tick);
          else element.dataset.counted = 'true';
        };
        requestAnimationFrame(tick);
      }
    }
  }, { threshold: .5 });
  document.querySelectorAll('.product-stats').forEach(strip => observer.observe(strip));
})();
