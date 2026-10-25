import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../../site/tts/index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../../site/js/tts-features-preview-v1.js', import.meta.url), 'utf8');

test('all twelve features have an illustration while original titles and descriptions stay intact', () => {
  const features = html.slice(html.indexOf('id="features"'), html.indexOf('id="languages"'));
  assert.equal((features.match(/data-feature-scene(?:=""| )/g) || []).length, 12);
  assert.doesNotMatch(features, /Illustrative examples|fictional data/i);
  for (let id = 1; id <= 12; id++) {
    assert.equal((features.match(new RegExp('data-i18n="feat\\.' + id + '\\.t"', 'g')) || []).length, 1);
    assert.equal((features.match(new RegExp('data-i18n="feat\\.' + id + '\\.d"', 'g')) || []).length, 1);
  }
  assert.match(features, /href="https:\/\/github.com\/Rexy40407\/vozen"/);
  assert.doesNotMatch(features, /<button|<audio|<canvas|<details/);
});

test('feature motion runs once on arrival and only mouse hover replays it', () => {
  for (const reduced of [false, true]) {
    let callback, pointer, disconnected = false;
    const classes = new Set();
    const scene = {
      classList: { add: name => classes.add(name), remove: name => classes.delete(name) },
      addEventListener: (_, handler) => pointer = handler,
    };
    vm.runInNewContext(source, {
      document: { querySelectorAll: () => [scene] },
      window: { matchMedia: () => ({ matches: reduced }) },
      requestAnimationFrame: fn => fn(),
      IntersectionObserver: class {
        constructor(fn) { callback = fn; }
        observe() {}
        disconnect() { disconnected = true; }
      },
    });
    if (reduced) assert.equal(callback, undefined);
    else {
      callback([{ isIntersecting: false, intersectionRatio: 0 }]);
      assert.equal(classes.size, 0);
      callback([{ isIntersecting: true, intersectionRatio: .05 }]);
      assert.equal(classes.size, 0);
      assert.equal(disconnected, false);
      callback([{ isIntersecting: true, intersectionRatio: .4 }]);
      assert.equal(disconnected, true);
    }
    assert.ok(classes.has('is-feature-active'));
    classes.clear();
    pointer({ pointerType: 'touch' });
    assert.equal(classes.size, 0);
    pointer({ pointerType: 'mouse' });
    assert.equal(classes.has('is-feature-active'), !reduced);
  }
});
