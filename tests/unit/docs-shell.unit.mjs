import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../site/docs/shared/docs-shell.js', import.meta.url), 'utf8');
const guard = source.slice(0, source.indexOf('  const docsRoot')) + 'window.guardPassed = (window.guardPassed || 0) + 1; })();';

test('prerendered ready markup still attaches runtime interactions, once per window', () => {
  const window = {};
  const document = { currentScript: {}, body: { dataset: { vozenDocsShell: 'ready' } } };
  const context = vm.createContext({ window, document });
  vm.runInContext(guard, context);
  vm.runInContext(guard, context);
  assert.equal(window.guardPassed, 1);
});

test('shell does not initialise without its script element', () => {
  const window = {};
  vm.runInNewContext(guard, { window, document: { currentScript: null } });
  assert.equal(window.guardPassed, undefined);
});

test('Helper runtime data includes its search corpus and real module routes', () => {
  const context = vm.createContext({});
  for (const file of ['search-data.js', 'data/helper-docs-manifest.js']) {
    vm.runInContext(readFileSync(new URL('../../site/docs/helper/' + file, import.meta.url), 'utf8'), context);
  }
  assert.ok(context.VOZEN_DOCS_SEARCH.helper.documents.length > 0);
  const routes = Object.values(context.VOZEN_DOCS_NAV.helper.routes);
  assert.equal(routes.length, 47);
  for (const route of routes) assert.ok(existsSync(new URL('../../site/docs/helper/' + route, import.meta.url)), route);
});

test('navigation stylesheet fallback recognizes bundled entry-page styles', () => {
  const source = readFileSync('site/js/global-nav-v1.js', 'utf8');
  const setup = source.slice(0, source.indexOf('  const AUTH_CHANNEL_NAME')) + '})();';
  for (const stylesheet of ['home-critical-v1.css', 'tts-page-v1.css', 'helper-page-v1.css', 'global-nav-v1.css', 'docs-shell.css']) {
    const added = [];
    const document = {
      querySelectorAll: selector => selector === '[data-vozen-nav]' ? [{}] : [{ href: 'https://vozen.org/css/' + stylesheet + '?v=fixture' }],
      currentScript: { src: 'https://vozen.org/js/global-nav-v1.js' },
      createElement: () => ({}), head: { appendChild: node => added.push(node) },
    };
    vm.runInNewContext(setup, { document, URL });
    assert.equal(added.filter(node => node.rel === 'stylesheet').length, stylesheet === 'docs-shell.css' ? 1 : 0, stylesheet);
    assert.equal(added.filter(node => node.src === 'https://vozen.org/js/tab-title-v1.js').length, 1);
  }
});
