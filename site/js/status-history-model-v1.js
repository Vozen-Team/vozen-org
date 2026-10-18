(function () {
  'use strict';
  const services = ['tts', 'helper', 'website'];
  const states = ['operational', 'degraded', 'unavailable', 'unknown'];
  const dayMs = 86400000;
  const dateKey = time => new Date(time).toISOString().slice(0, 10);
  const empty = () => ({ version: 1, intervalSeconds: 60, startedAt: null, updatedAt: null, services: Object.fromEntries(services.map(key => [key, []])) });
  function normalize(input) {
    if (!input || input.version !== 1 || input.intervalSeconds !== 60) throw new Error('Unsupported history');
    const result = empty();
    for (const field of ['startedAt', 'updatedAt']) {
      if (input[field] !== null && (typeof input[field] !== 'string' || !Number.isFinite(Date.parse(input[field])))) throw new Error('Invalid timestamp');
      result[field] = input[field];
    }
    for (const key of services) {
      if (!Array.isArray(input.services?.[key]) || input.services[key].length > 90) throw new Error('Invalid history length');
      const dates = new Set();
      result.services[key] = input.services[key].map(row => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !Number.isFinite(Date.parse(row.date)) || dateKey(Date.parse(row.date)) !== row.date || dates.has(row.date)) throw new Error('Invalid history date');
        dates.add(row.date);
        const clean = { date: row.date };
        let total = 0;
        for (const state of states) {
          if (!Number.isInteger(row[state]) || row[state] < 0 || row[state] > 1440) throw new Error('Invalid history count');
          clean[state] = row[state];
          total += row[state];
        }
        if (total > 1440) throw new Error('Too many checks');
        return clean;
      }).sort((a, b) => a.date.localeCompare(b.date));
    }
    return result;
  }
  function record(input, observations, time = Date.now()) {
    const history = normalize(input);
    if (!Number.isFinite(time)) throw new Error('Invalid observation time');
    if (history.updatedAt && Math.floor(Date.parse(history.updatedAt) / 60000) >= Math.floor(time / 60000)) return history;
    const today = dateKey(time), oldest = dateKey(time - 89 * dayMs);
    for (const key of services) {
      history.services[key] = history.services[key].filter(row => row.date >= oldest && row.date <= today);
      let row = history.services[key].find(row => row.date === today);
      if (!row) {
        row = { date: today, operational: 0, degraded: 0, unavailable: 0, unknown: 0 };
        history.services[key].push(row);
      }
      row[states.includes(observations[key]) ? observations[key] : 'unknown']++;
    }
    history.startedAt ||= new Date(time).toISOString();
    history.updatedAt = new Date(time).toISOString();
    return history;
  }
  function days(input, service, time = Date.now()) {
    const history = normalize(input);
    const start = Date.parse(dateKey(time));
    return Array.from({ length: 90 }, (_, index) => {
      const timestamp = start - (89 - index) * dayMs, date = dateKey(timestamp);
      const row = history.services[service]?.find(item => item.date === date) || { operational: 0, degraded: 0, unavailable: 0, unknown: 0 };
      const known = row.operational + row.degraded + row.unavailable;
      const expected = Math.min(1440, Math.floor((time - timestamp) / 60000) + 1);
      const coverage = Math.min(1, known / expected);
      const state = row.unavailable ? 'unavailable' : row.degraded ? 'degraded' : known ? coverage >= 1 ? 'operational' : 'partial' : 'unknown';
      return { ...row, date, known, expected, coverage, state, availability: known ? row.operational / known : null };
    });
  }
  globalThis.VozenStatusHistory = { empty, normalize, record, days, services, states };
})();
