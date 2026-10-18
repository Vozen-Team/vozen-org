(function () {
  'use strict';
  const strip = document.querySelector('.eco-social-proof');
  const number = strip?.querySelector('[data-proof-count]');
  const readable = strip?.querySelector('.eco-proof__count-readable');
  if (!number || !readable || number.dataset.proofCounter) return;
  number.dataset.proofCounter = 'ready';
  const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const canAnimate = Boolean(preference && !preference.matches && window.IntersectionObserver);
  const endpoint = ['localhost', '127.0.0.1'].includes(new URL(document.baseURI).hostname)
    ? '/__preview/public-status/stats' : 'https://api.vozen.org/api/public/stats';
  const maxAge = 90000;
  let target = null, observedAt = 0, visible = false, started = false, completed = !canAnimate;
  let frame = 0, timer, expiry, controller;
  const observer = canAnimate ? new window.IntersectionObserver(entries => {
    visible = entries.some(entry => entry.target === strip && entry.isIntersecting && entry.intersectionRatio >= .5);
    start();
  }, { threshold: .5 }) : null;

  function finish() {
    window.cancelAnimationFrame(frame);
    frame = 0;
    if (started) {
      completed = true;
      number.dataset.proofCounter = 'done';
      observer?.disconnect();
    }
    number.textContent = target === null ? '—' : String(target);
  }
  function start() {
    if (started || completed || !visible || document.hidden || target === null) return;
    started = true;
    if (preference.matches) { finish(); return; }
    observer.disconnect();
    const began = performance.now();
    number.textContent = '0';
    function tick(now) {
      const progress = Math.max(0, Math.min(1, (now - began) / 1600));
      number.textContent = String(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
      else finish();
    }
    frame = window.requestAnimationFrame(tick);
  }
  function expire() {
    if (target !== null && Date.now() - observedAt < maxAge) return;
    target = null;
    readable.textContent = '—';
    strip.dataset.proofLive = 'unavailable';
    finish();
  }
  async function refresh() {
    if (document.hidden || controller || typeof window.fetch !== 'function') return;
    window.clearTimeout(timer);
    controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await window.fetch(endpoint, { cache: 'no-store', credentials: 'omit', redirect: 'error', signal: controller.signal });
      if (!response.ok) throw new Error('Count unavailable');
      const data = await response.json();
      const timestamp = typeof data.observedAt === 'string' ? Date.parse(data.observedAt) : NaN;
      const age = Date.now() - timestamp;
      if (data.product !== 'tts' || !Number.isSafeInteger(data.guilds) || data.guilds < 0 || !Number.isFinite(age) || age < -5000 || age >= maxAge) throw new Error('Invalid count');
      // Settle the entrance before adopting a later reading, including a lower count.
      if (frame) finish();
      target = data.guilds;
      observedAt = timestamp;
      readable.textContent = String(target);
      number.textContent = String(target);
      strip.dataset.proofLive = 'live';
      window.clearTimeout(expiry);
      expiry = window.setTimeout(expire, Math.max(0, maxAge - age));
      start();
    } catch (_) { expire(); }
    finally {
      window.clearTimeout(timeout);
      controller = null;
      if (!document.hidden) timer = window.setTimeout(refresh, 15000);
    }
  }
  preference?.addEventListener?.('change', () => {
    if (preference.matches) { completed = true; observer?.disconnect(); finish(); }
  });
  document.addEventListener('visibilitychange', () => {
    window.clearTimeout(timer);
    if (document.hidden) { if (frame) finish(); }
    else { expire(); void refresh(); start(); }
  });
  observer?.observe(strip);
  expire();
  void refresh();
})();
