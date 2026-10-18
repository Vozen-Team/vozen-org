import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function api() {
  const window = {};
  vm.runInNewContext(readFileSync('site/js/status-v1.js', 'utf8'), { window, document: { querySelector: () => null } });
  assert.ok(window.VozenPublicStatus, 'status normalization is testable without network requests');
  return window.VozenPublicStatus;
}

test('TTS uses actual component states and never upgrades a degraded component', () => {
  const result = api().tts({ status: 'operational', components: { bot: 'operational', database: 'operational', providers: 'degraded' } });
  assert.equal(result.state, 'degraded');
  assert.equal(result.components.providers, 'degraded');
});

test('missing and malformed TTS readings remain unknown, not falsely healthy or offline', () => {
  for (const payload of [null, {}, { status: 'ok' }, { status: 'operational', components: {} }]) {
    assert.equal(api().tts(payload).state, 'unknown');
  }
});

test('a reported TTS outage remains an outage even if other components are healthy', () => {
  assert.equal(api().tts({ status: 'unavailable', components: { bot: 'operational', database: 'operational', providers: 'operational' } }).state, 'unavailable');
});

test('Helper API health does not invent a Discord or database observation', () => {
  const result = api().helper({ status: 'ok' });
  assert.equal(result.state, 'operational');
  assert.equal(result.components.api, 'operational');
  assert.equal(result.components.bot, 'unknown');
  assert.equal(result.components.database, 'unknown');
  assert.equal(api().helper({ status: 'something-else' }).state, 'unknown');
});

test('aggregate summaries preserve outages and missing observations', () => {
  const summarize = api().summarize;
  assert.equal(summarize(['operational', 'operational', 'operational']), 'operational');
  assert.equal(summarize(['operational', 'unknown']), 'unknown');
  assert.equal(summarize(['unknown', 'degraded']), 'degraded');
  assert.equal(summarize(['unknown', 'unavailable']), 'unavailable');
  assert.equal(summarize([]), 'unknown');
});

test('the header links to the same Status page on marketing and docs surfaces', () => {
  const nav = readFileSync('site/js/global-nav-v1.js', 'utf8');
  assert.equal((nav.match(/data-i18n="ecosystem.status"/g) || []).length, 2);
  assert.ok(nav.includes("link('status.html')"));
});

test('the status page does not contain fictional uptime or shard totals', () => {
  const html = readFileSync('site/status.html', 'utf8');
  assert.ok(html.includes('data-status-service="tts"'));
  assert.ok(html.includes('data-status-service="helper"'));
  assert.ok(html.includes('data-status-service="website"'));
  assert.equal(/99\.9|data-demo|fake.?history|shards?\s*[:=]\s*\d/i.test(html), false);
});

test('live status labels use the selected locale rather than the English fallback', () => {
  const window = { VOZEN_I18N: { en: { 'status.degraded': 'Degraded' }, pt: { 'status.degraded': 'Degradado' } }, addEventListener() {} };
  const document = { title: 'Status', body: { dataset: { vozenStaticPage: 'status' } }, documentElement: {}, querySelectorAll: () => [], querySelector: () => null };
  vm.runInNewContext(readFileSync('site/js/static-pages-i18n-v1.js', 'utf8'), { window, document, localStorage: { getItem: () => 'pt' } });
  assert.equal(window.VOZEN_PAGE_T('status.degraded', 'Degraded'), 'Degradado');
});
