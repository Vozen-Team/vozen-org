import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSiteServer, closeSiteServer } from '../../tools/serve-site.mjs';

test('the loopback preview reads only the three fixed public status endpoints, without visitor credentials', async () => {
  const requests = [];
  const { server, origin } = await createSiteServer(0, { publicStatusPreview: true, fetchPublic: async (url, options) => {
    requests.push({ url, options });
    return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
  } });
  try {
    assert.equal((await fetch(origin + '/__preview/public-status/tts', { headers: { cookie: 'test-cookie', authorization: 'test-credential' } })).status, 200);
    assert.equal((await fetch(origin + '/__preview/public-status/helper')).status, 200);
    assert.equal((await fetch(origin + '/__preview/public-status/history')).status, 200);
    assert.deepEqual(requests.map(request => request.url), ['https://api.vozen.org/api/public/status', 'https://api.vozen.org/rust/health', 'https://api.vozen.org/api/public/status/history']);
    assert.ok(requests.every(request => request.options.redirect === 'error'));
    assert.ok(requests.every(request => !request.options.headers.authorization && !request.options.headers.cookie));
    assert.equal((await fetch(origin + '/__preview/public-status/other?url=https://example.com')).status, 404);
    assert.equal((await fetch(origin + '/__preview/public-status/tts', { method: 'POST' })).status, 405);
    assert.equal(requests.length, 3);
  } finally { await closeSiteServer(server); }
});

test('preview errors do not leak upstream details', async () => {
  const { server, origin } = await createSiteServer(0, { publicStatusPreview: true, fetchPublic: async () => { throw new Error('private internal detail'); } });
  try {
    const response = await fetch(origin + '/__preview/public-status/tts');
    assert.equal(response.status, 502);
    assert.equal(await response.text(), '{"error":"public_check_unavailable"}');
  } finally { await closeSiteServer(server); }
});

test('build servers do not access public APIs unless the preview bridge is explicitly enabled', async () => {
  let calls = 0;
  const { server, origin } = await createSiteServer(0, { fetchPublic: async () => { calls++; return new Response('{}'); } });
  try {
    assert.equal((await fetch(origin + '/__preview/public-status/tts')).status, 404);
    assert.equal(calls, 0);
  } finally { await closeSiteServer(server); }
});
