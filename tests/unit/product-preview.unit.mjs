import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../../site/js/product-preview-v1.js', import.meta.url), 'utf8');

async function runExample(text) {
  const node = { nodeType: 3, textContent: text };
  vm.runInNewContext(source, {
    Node: { TEXT_NODE: 3 },
    window: {
      vozenPublicI18nReady: Promise.resolve(),
      VOZEN_I18N: { pt: { 'tts.reading': 'a ler em voz alta…' } },
    },
    document: {
      documentElement: { dataset: { vozenLocale: 'pt' } },
      querySelectorAll: (selector) => selector.includes('.speaking') ? [{ lastChild: node }, { lastChild: null }] : [],
    },
  });
  await new Promise(resolve => setImmediate(resolve));
  return node.textContent;
}

test('the illustrative voice label resolves after the selected locale loads', async () => {
  assert.equal(await runExample(' tts.reading'), ' a ler em voz alta…');
});

test('the preview leaves already resolved chat labels unchanged', async () => {
  assert.equal(await runExample(' reading it out loud…'), ' reading it out loud…');
});

test('local proposal copy is applied after the translation catalogue is ready', async () => {
  const element = { dataset: { previewCopy: 'Your server.' }, textContent: 'Previous heading' };
  vm.runInNewContext(source, {
    Node: { TEXT_NODE: 3 },
    window: { vozenPublicI18nReady: Promise.resolve() },
    document: {
      documentElement: { dataset: {} },
      querySelectorAll: selector => selector === '[data-preview-copy]' ? [element] : [],
    },
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(element.textContent, 'Your server.');
});

test('authored headline copy is not repainted after initialization', async () => {
  let writes = 0;
  const element = {
    dataset: {previewCopy: 'Out loud.'},
    get textContent() { return 'Out loud.'; },
    set textContent(value) { writes++; },
  };
  vm.runInNewContext(source, {
    Node: {TEXT_NODE: 3},
    window: {vozenPublicI18nReady: Promise.resolve()},
    document: {documentElement: {dataset: {}},
      querySelectorAll: selector => selector === '[data-preview-copy]' ? [element] : []},
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(writes, 0);
  const html = readFileSync(new URL('../../site/tts/index.html', import.meta.url), 'utf8');
  assert.match(html, /data-preview-i18n="hero.title2"/);
  assert.doesNotMatch(html, /data-i18n="hero.title[12]"/);
  const css = readFileSync(new URL('../../site/css/product-preview-v1.css', import.meta.url), 'utf8');
  assert.match(css, /body\.tts-page\s*\{ --product-display: 'Vozen Critical Display'; \}/);
  assert.match(css, /font-family: var\(--product-display, 'Vozen Product Display'\)/);
});
