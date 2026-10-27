import assert from 'node:assert/strict';

// Layout tests use synthetic public data; the preview bridge has its own unit tests.
export async function mockPublicStatus(page) {
  const responses = {
    tts: {status:'operational',components:{bot:'operational',database:'operational',providers:'operational'}},
    helper: {status:'ok'},
    stats: {product:'tts',guilds:42,observedAt:'2026-10-27T00:00:00.000Z'},
    history: {version:1,intervalSeconds:60,startedAt:null,updatedAt:null,services:{tts:[],helper:[],website:[]}},
  };
  await page.route('**/__preview/public-status/*', route => {
    const key = new URL(route.request().url()).pathname.split('/').pop();
    assert.ok(Object.hasOwn(responses,key), `Unknown public status fixture: ${key}`);
    return route.fulfill({json:responses[key]});
  });
}
