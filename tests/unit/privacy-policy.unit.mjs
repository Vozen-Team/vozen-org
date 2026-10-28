import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { parse } from 'parse5';
import { minifyAsset } from '../../tools/build-public-artifact.mjs';

const policy = readFileSync(new URL('../../site/privacy.html', import.meta.url), 'utf8');
const guide = readFileSync(new URL('../../site/docs/tts/privacy/index.html', import.meta.url), 'utf8');
const attr = (node, name) => node.attrs?.find((entry) => entry.name === name)?.value;
function find(node, predicate) {
  if (predicate(node)) return node;
  for (const child of node.childNodes || []) {
    const result = find(child, predicate);
    if (result) return result;
  }
}
const text = (node) => (node?.nodeName === '#text' ? node.value : (node?.childNodes || []).map(text).join(' ')).replace(/\s+/g, ' ').trim();
function section(document, number) {
  const main = find(document, (node) => node.tagName === 'main');
  let active = false;
  const nodes = [];
  for (const node of main.childNodes) {
    if (node.tagName === 'h2') {
      if (active) break;
      active = text(node).startsWith(`${number}. `);
    }
    if (active) nodes.push(node);
  }
  return nodes.map(text).join(' ');
}

test('published and minified policy keeps the quota erasure exception consistent', async () => {
  for (const html of [policy, await minifyAsset('privacy.html', policy)]) {
    const document = parse(html);
    const collection = section(document, 2);
    const retention = section(document, 11);
    const rights = section(document, 12);
    assert.match(collection, /pseudonymous, not anonymous/);
    assert.match(collection, /HMAC/);
    for (const copy of [retention, rights]) {
      assert.match(copy, /current UTC (?:calendar )?month/);
      assert.match(copy, /first daily cleanup after (?:that month ends|month end)/);
      assert.match(copy, /raw-ID user\/pass/);
      assert.match(copy, /deleted/);
    }
    assert.match(retention, /not message text or audio/);
    assert.match(retention, /Server and service pools.*approximately three-month/);
    assert.match(rights, /pseudonymous vote-limit entry.*at most 30 days/);
    assert.match(collection, /24 hours of Plus.*four grants in a rolling 30-day/);
    assert.ok(find(document, (node) => attr(node, 'id') === 'google-hd-quota-retention'));
  }
});

test('privacy guide links to the same exception and auth copy avoids obsolete blanket claims', () => {
  const document = parse(policy);
  const copy = text(find(document, (node) => node.tagName === 'main'));
  assert.match(copy, /28 October 2026/);
  assert.doesNotMatch(copy, /sets no cookies|no consent banner is required|GitHub Pages|token lives only in your browser session/);
  assert.match(section(document, 7), /browser-held OAuth credentials/);
  assert.match(section(document, 7), /server-side OAuth authorization-code flow/);
  assert.match(section(document, 8), /Secure and HttpOnly/);
  assert.match(section(document, 8), /Closing a tab alone may therefore leave a remembered login/);
  const guideDocument = parse(guide);
  assert.ok(find(guideDocument, (node) => attr(node, 'href') === '/privacy#google-hd-quota-retention'));
  assert.match(text(find(guideDocument, (node) => node.tagName === 'main')), /pseudonymous HMAC.*first daily cleanup/);
  const search = JSON.parse(readFileSync(new URL('../../site/docs/tts/search.json', import.meta.url), 'utf8'));
  const globals = {};
  vm.runInNewContext(readFileSync(new URL('../../site/docs/tts/search-data.js', import.meta.url), 'utf8'), { globalThis: globals });
  const jsonGuide = search.documents.find((entry) => entry.url === 'privacy/index.html');
  const scriptGuide = globals.VOZEN_DOCS_SEARCH.tts.documents.find((entry) => entry.url === 'privacy/index.html');
  assert.equal(scriptGuide.text, jsonGuide.text);
  assert.match(jsonGuide.text, /pseudonymous HMAC.*first daily cleanup/);
});
