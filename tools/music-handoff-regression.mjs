import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const main = fs.readFileSync(new URL('../site/js/main-v51.js', import.meta.url), 'utf8');
const start = main.indexOf('  let musicBridgeController = null;');
const end = main.indexOf('  // The account page is the single sign-in surface', start);
assert.ok(start >= 0 && end > start);

async function scenario({ ok = true, logout = false, tokenPresent = true } = {}) {
  let token = tokenPresent ? 'fixture-account-token-not-a-real-secret' : null;
  let resolveBridge, handler;
  const calls = [], navigations = [], messages = [];
  const bridge = new Promise(resolve => { resolveBridge = resolve; });
  class Element {
    href = 'https://api.vozen.org/music/dashboard';
    closest(selector) { return selector === 'a.account-task--music' ? this : null; }
    setAttribute() {}
    removeAttribute() {}
  }
  const context = vm.createContext({
    Element, AbortController, PREMIUM_API_BASE: 'https://api.vozen.org',
    storedToken: () => token, showHelperHandoffError: () => messages.push('error'),
    fetch: (url, options) => { calls.push({ url, options }); return url.endsWith('/logout') ? Promise.resolve({ ok: true }) : bridge; },
    document: { addEventListener: (_name, fn) => { handler = fn; } },
    window: { setTimeout, clearTimeout, location: { assign: href => navigations.push(href) } },
  });
  vm.runInContext(`${main.slice(start, end)}\nwireMusicSessionHandoff();`, context);
  const target = new Element();
  let prevented = 0;
  for (let i = 0; i < 2; i++) handler({ target, button: 0, defaultPrevented: false, preventDefault() { prevented++; } });
  if (logout) { token = null; vm.runInContext('clearMusicSession()', context); }
  resolveBridge({ ok });
  await new Promise(resolve => setImmediate(resolve));
  return { calls, navigations, messages, prevented };
}

const success = await scenario();
assert.equal(success.calls.length, 1);
assert.equal(success.calls[0].url, 'https://api.vozen.org/music/auth/vozen');
assert.equal(success.calls[0].options.credentials, 'include');
assert.equal(success.navigations.length, 1);
assert.ok(!success.navigations[0].includes('token'));
const failed = await scenario({ ok: false });
assert.equal(failed.navigations.length, 0);
assert.equal(failed.messages.length, 1);
const signedOut = await scenario({ logout: true });
assert.equal(signedOut.navigations.length, 0);
assert.equal(signedOut.calls[0].options.signal.aborted, true);
assert.ok(signedOut.calls.some(call => call.url.endsWith('/music/auth/vozen/logout')));
const anonymous = await scenario({ tokenPresent: false });
assert.equal(anonymous.prevented, 0);
assert.equal(anonymous.calls.length, 0);
console.log('Music handoff passed: one navigation, failure, logout race and anonymous fallback.');
