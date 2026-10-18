import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const shell = readFileSync('site/docs/shared/docs-shell.js', 'utf8');

function motionFixture({ reduced = false, observer = true } = {}) {
  const icons = [{ dataset: {} }, { dataset: {} }];
  const events = {};
  const preference = { matches: reduced, addEventListener: (_, callback) => { events.preference = callback; } };
  const document = { hidden: false, querySelectorAll: () => icons, addEventListener: (_, callback) => { events.visibility = callback; } };
  let intersection;
  const window = { matchMedia: () => preference };
  if (observer) window.IntersectionObserver = class {
    constructor(callback) { intersection = callback; }
    observe() {}
  };
  const source = shell.match(/  function setupProductIconMotion\(\) \{[\s\S]*?\n  \}/)?.[0];
  assert.ok(source, 'the docs shell has a visibility-aware icon controller');
  vm.runInNewContext(`${source}\nsetupProductIconMotion();`, { window, document, Set });
  return { icons, document, preference, events, intersect: entries => intersection(entries) };
}

test('the sidebar uses a drawn book, not a single-letter placeholder', () => {
  assert.doesNotMatch(shell, /mark: '[DHT]'/);
  assert.match(shell, /docs-sidebar__product-mark[\s\S]*?productMark\(\)/);
  assert.match(shell, /function productMark\(\)[\s\S]*?<svg/);
});

test('product icons animate only while intersecting the visible document', () => {
  const fixture = motionFixture();
  assert.ok(fixture.icons.every(icon => icon.dataset.motion === 'paused'));
  fixture.intersect(fixture.icons.map(target => ({ target, isIntersecting: true })));
  assert.ok(fixture.icons.every(icon => icon.dataset.motion === 'playing'));
  fixture.document.hidden = true;
  fixture.events.visibility();
  assert.ok(fixture.icons.every(icon => icon.dataset.motion === 'paused'));
  fixture.document.hidden = false;
  fixture.events.visibility();
  assert.ok(fixture.icons.every(icon => icon.dataset.motion === 'playing'));
  fixture.intersect([{ target: fixture.icons[0], isIntersecting: false }]);
  assert.equal(fixture.icons[0].dataset.motion, 'paused');
  assert.equal(fixture.icons[1].dataset.motion, 'playing');
});

test('reduced motion is respected on load and after a preference change', () => {
  const fixture = motionFixture({ reduced: true });
  fixture.intersect(fixture.icons.map(target => ({ target, isIntersecting: true })));
  assert.ok(fixture.icons.every(icon => icon.dataset.motion === 'paused'));
  fixture.preference.matches = false;
  fixture.events.preference();
  assert.ok(fixture.icons.every(icon => icon.dataset.motion === 'playing'));
  fixture.preference.matches = true;
  fixture.events.preference();
  assert.ok(fixture.icons.every(icon => icon.dataset.motion === 'paused'));
});

test('without IntersectionObserver icons remain static', () => {
  assert.ok(motionFixture({ observer: false }).icons.every(icon => icon.dataset.motion === 'paused'));
});

test('both product symbols have independent animatable parts and a CSS reduced-motion alternative', () => {
  const html = readFileSync('site/docs/index.html', 'utf8');
  const css = readFileSync('site/docs/shared/docs-shell.css', 'utf8');
  assert.match(html, /class="docs-helper-eyes"/);
  assert.equal((html.match(/class="docs-voice-bar"/g) || []).length, 5);
  assert.match(css, /@keyframes docs-helper-blink/);
  assert.match(css, /@keyframes docs-voice-level/);
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*?\.docs-product-symbol[\s\S]*?animation: none/);
});
