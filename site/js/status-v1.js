(function () {
  'use strict';
  const states = new Set(['operational', 'degraded', 'unavailable']);
  const safeState = value => states.has(value) ? value : 'unknown';
  function summarize(values) {
    if (values.includes('unavailable')) return 'unavailable';
    if (values.includes('degraded')) return 'degraded';
    return values.length && values.every(value => value === 'operational') ? 'operational' : 'unknown';
  }
  function tts(data) {
    const components = Object.fromEntries(['bot', 'database', 'providers'].map(key => [key, safeState(data?.components?.[key])]));
    return { state: summarize([safeState(data?.status), ...Object.values(components)]), components };
  }
  function helper(data) {
    const state = data?.status === 'ok' ? 'operational' : 'unknown';
    return { state, components: { api: state, bot: 'unknown', database: 'unknown' } };
  }
  window.VozenPublicStatus = { tts, helper, summarize };
  const root = document.querySelector('[data-vozen-status]');
  if (!root) return;
  const translate = (key, fallback, variables) => typeof window.VOZEN_PAGE_T === 'function' ? window.VOZEN_PAGE_T(key, fallback, variables) : fallback.replace(/\{(\w+)\}/g, (_, name) => variables?.[name] ?? '');
  const label = state => translate('status.' + state, { operational: 'Operational', degraded: 'Degraded', unavailable: 'Unavailable', unknown: 'Not measured' }[state]);
  const cards = [...root.querySelectorAll('[data-status-service]')];
  const button = root.querySelector('[data-status-refresh]');
  const overview = root.querySelector('[data-status-overview]');
  root.querySelectorAll('[data-status-summary], [data-status-label]').forEach(node => node.removeAttribute('data-i18n'));
  const endpoints = { tts: 'https://api.vozen.org/api/public/status', helper: 'https://api.vozen.org/rust/health', website: new URL('/', document.baseURI).href };
  if (['localhost', '127.0.0.1'].includes(new URL(document.baseURI).hostname)) {
    endpoints.tts = '/__preview/public-status/tts';
    endpoints.helper = '/__preview/public-status/helper';
  }
  const results = {};
  let checkedAt = null;
  let timer;
  let busy = false;
  function render() {
    if (['localhost', '127.0.0.1'].includes(new URL(document.baseURI).hostname)) {
      root.querySelector('[data-status-service="website"] h2').textContent = translate('status.previewSite', 'Local preview');
    }
    if (!Object.keys(results).length) return;
    for (const card of cards) {
      const result = results[card.dataset.statusService];
      if (!result) continue;
      card.dataset.state = result.state;
      card.querySelector('[data-status-label]').textContent = result.failed ? translate('status.checkFailed', 'Check unavailable') : label(result.state);
      card.querySelector('[data-status-latency]').textContent = result.failed ? '—' : translate('status.ms', '{n} ms', { n: result.latency });
      card.querySelector('[data-status-note]').textContent = result.failed ? translate('status.checkFailedNotice', 'This browser could not verify the service. This does not confirm an outage.') : result.incident || '';
      card.querySelectorAll('[data-component]').forEach(node => {
        const state = result.components?.[node.dataset.component] || 'unknown';
        node.dataset.state = state;
        node.textContent = label(state);
      });
    }
    const state = summarize(cards.map(card => results[card.dataset.statusService]?.state || 'unknown'));
    overview.dataset.state = state;
    const summaries = { operational: ['status.checksPassing', 'Available public checks are passing'], degraded: ['status.checksDegraded', 'A service reports degraded performance'], unavailable: ['status.checksDown', 'A service reports an interruption'], unknown: ['status.checksUnknown', 'Some checks could not be verified'] };
    root.querySelector('[data-status-summary]').textContent = translate(...summaries[state]);
    if (checkedAt) {
      const time = root.querySelector('[data-status-checked]');
      time.dateTime = checkedAt.toISOString();
      time.textContent = checkedAt.toLocaleString(document.documentElement.lang, { dateStyle: 'medium', timeStyle: 'short' });
    }
  }
  async function readService(key) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    const started = performance.now();
    try {
      const response = await fetch(endpoints[key], { method: key === 'website' ? 'HEAD' : 'GET', cache: 'no-store', credentials: 'omit', signal: controller.signal });
      let result;
      if (key === 'website') result = { state: response.ok ? 'operational' : 'unavailable', components: {} };
      else {
        if (!response.ok) throw new Error('Public check unavailable');
        const data = await response.json();
        result = key === 'tts' ? tts(data) : helper(data);
        if (key === 'tts' && typeof data?.incident === 'string') result.incident = data.incident.slice(0, 240);
      }
      results[key] = { ...result, latency: Math.max(0, Math.round(performance.now() - started)) };
    } catch (_) {
      results[key] = { state: 'unknown', failed: true, components: {} };
    } finally {
      window.clearTimeout(timeout);
      render();
    }
  }
  async function refresh() {
    if (busy || document.hidden) return;
    busy = true;
    window.clearTimeout(timer);
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    await Promise.all(Object.keys(endpoints).map(readService));
    checkedAt = new Date();
    busy = false;
    button.disabled = false;
    button.removeAttribute('aria-busy');
    render();
    if (!document.hidden) timer = window.setTimeout(refresh, 60000);
  }
  button.addEventListener('click', refresh);
  document.addEventListener('visibilitychange', () => {
    window.clearTimeout(timer);
    if (!document.hidden) void refresh();
  });
  window.addEventListener('vozen:i18nready', render);
  window.addEventListener('vozen:languagechange', render);
  void refresh();
})();
