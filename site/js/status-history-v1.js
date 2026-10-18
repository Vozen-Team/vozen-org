(function () {
  'use strict';
  const model = globalThis.VozenStatusHistory;
  const root = document.querySelector('[data-vozen-status]');
  if (!root || !model) return;
  const t = (key, fallback, values) => window.VOZEN_PAGE_T ? window.VOZEN_PAGE_T(key, fallback, values) : fallback.replace(/\{(\w+)\}/g, (_, key) => values?.[key] ?? '');
  const language = () => document.documentElement.lang || 'en';
  const percent = value => {
    const format = new Intl.NumberFormat(language(), { maximumFractionDigits: 2 });
    return value > 0 && value < 0.0001 ? '<' + format.format(0.01) : format.format(value * 100);
  };
  const dateLabel = date => new Intl.DateTimeFormat(language(), { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(date));
  const stateLabel = state => t(state === 'unknown' ? 'status.historyNoData' : 'status.' + state, { operational:'Operational', degraded:'Degraded', unavailable:'Unavailable', unknown:'No history', partial:'Partial data' }[state]);
  let history = model.empty();
  let busy = false;
  const charts = [...root.querySelectorAll('[data-status-history]')].map(container => {
    const key = container.closest('[data-status-service]').dataset.statusService;
    const heading = document.createElement('div'); heading.className = 'status-uptime__head';
    const caption = document.createElement('span'); caption.dataset.historyCaption = '';
    const score = document.createElement('strong'); score.textContent = '—'; heading.append(caption, score);
    const timeline = document.createElement('div'); timeline.className = 'status-timeline';
    const bars = Array.from({ length:90 }, () => { const bar = document.createElement('span'); bar.className = 'status-day'; bar.dataset.state = 'unknown'; bar.setAttribute('aria-hidden','true'); timeline.append(bar); return bar; });
    const control = document.createElement('input'); control.type = 'range'; control.min = '0'; control.max = '89'; control.step = '1'; control.value = '89'; control.className = 'status-day-picker';
    const detail = document.createElement('p'); detail.className = 'status-day-detail'; detail.id = 'status-day-' + key; control.setAttribute('aria-describedby',detail.id);
    timeline.append(control);
    const axis = document.createElement('div'); axis.className = 'status-timeline-axis';
    const start = document.createElement('span'), end = document.createElement('span'); axis.append(start,end);
    const coverage = document.createElement('p'); coverage.className = 'status-uptime__coverage';
    container.append(heading,timeline,axis,detail,coverage);
    const chart = { key,caption,score,timeline,bars,control,detail,start,end,coverage,days:[] };
    control.addEventListener('input', () => select(chart));
    return chart;
  });
  function select(chart) {
    const index = Number(chart.control.value), day = chart.days[index];
    if (!day) return;
    chart.bars.forEach((bar, i) => { bar.dataset.selected = String(i === index); });
    const description = t('status.historyDaily', '{date}: {state} · {count} recorded checks · {coverage}% coverage', { date:dateLabel(day.date), state:stateLabel(day.state), count:new Intl.NumberFormat(language()).format(day.known), coverage:percent(day.coverage) });
    chart.detail.textContent = description;
    chart.control.setAttribute('aria-valuetext',description);
  }
  function render() {
    for (const chart of charts) {
      chart.days = model.days(history,chart.key);
      chart.caption.textContent = t('status.historyDays','Last 90 days · recorded checks');
      chart.control.setAttribute('aria-label',t('status.historySelect','Select a day; use the arrow keys to explore history'));
      let known = 0, operational = 0, expected = 0;
      chart.days.forEach((day,index) => { chart.bars[index].dataset.state = day.state; chart.bars[index].title = dateLabel(day.date) + ' · ' + stateLabel(day.state); known += day.known; operational += day.operational; expected += day.expected; });
      chart.score.textContent = known ? percent(operational / known) + '%' : '—';
      chart.start.textContent = dateLabel(chart.days[0].date);
      chart.end.textContent = t('status.historyToday','Today');
      chart.coverage.textContent = known ? t('status.historyCoverage','{n}% of this period has recorded checks. Missing checks are not counted as uptime or downtime.',{n:percent(known / expected)}) : t('status.historyEmpty','No historical measurements yet. Pale green hatching marks days without history, not confirmed uptime.');
      select(chart);
    }
  }
  async function refresh() {
    if (busy || document.hidden) return;
    busy = true;
    try {
      const endpoint = ['localhost','127.0.0.1'].includes(location.hostname) ? '/__preview/public-status/history' : 'https://api.vozen.org/api/public/status/history';
      const response = await fetch(endpoint,{ credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error('History unavailable');
      const text = await response.text();
      if (text.length > 131072) throw new Error('History too large');
      history = model.normalize(JSON.parse(text));
      root.querySelector('[data-history-error]').hidden = true;
    } catch {
      root.querySelector('[data-history-error]').hidden = false;
    } finally { busy = false; render(); }
  }
  root.querySelector('[data-status-refresh]').addEventListener('click',refresh);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void refresh(); });
  window.addEventListener('vozen:i18nready',render);
  window.addEventListener('vozen:languagechange',render);
  window.setInterval(refresh,60000);
  render();
  void refresh();
})();
