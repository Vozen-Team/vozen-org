import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

function fixture({ reduced = false, observer = true, root = true } = {}) {
  const events = {};
  const media = { matches: reduced, addEventListener: (_, fn) => { events.preference = fn; } };
  const button = { hidden: true, attrs: {}, setAttribute(key, value) { this.attrs[key] = value; }, addEventListener: (_, fn) => { events.click = fn; } };
  const orbit = { dataset: {}, querySelector: () => button };
  const document = { hidden: false, querySelector: () => root ? orbit : null, addEventListener: (_, fn) => { events.visibility = fn; } };
  class Observer {
    constructor(fn) { events.intersection = fn; }
    observe(el) { assert.equal(el, orbit); }
  }
  vm.runInNewContext(readFileSync('site/js/home-orbit-v1.js', 'utf8'), {
    document, window: { matchMedia: () => media }, IntersectionObserver: observer ? Observer : undefined,
  }, { filename: fileURLToPath(new URL('../../site/js/home-orbit-v1.js', import.meta.url)) });
  return { orbit, button, document, media, events };
}

test('orbit starts static and only runs while visible', () => {
  const { orbit, events, document, button } = fixture();
  assert.equal(orbit.dataset.orbitRunning, 'false');
  assert.equal(button.hidden, false);
  events.intersection([]);
  events.intersection([{ isIntersecting: true }]);
  assert.equal(orbit.dataset.orbitRunning, 'true');
  document.hidden = true; events.visibility();
  assert.equal(orbit.dataset.orbitRunning, 'false');
  document.hidden = false; events.visibility();
  assert.equal(orbit.dataset.orbitRunning, 'true');
  events.intersection([{ isIntersecting: false }]);
  assert.equal(orbit.dataset.orbitRunning, 'false');
});

test('manual pause persists through visibility changes and can be resumed', () => {
  const { orbit, events, button } = fixture();
  events.intersection([{ isIntersecting: true }]);
  events.click();
  assert.equal(button.attrs['aria-pressed'], 'true');
  assert.equal(orbit.dataset.orbitRunning, 'false');
  events.intersection([{ isIntersecting: false }]);
  events.intersection([{ isIntersecting: true }]);
  assert.equal(orbit.dataset.orbitRunning, 'false');
  events.click();
  assert.equal(button.attrs['aria-pressed'], 'false');
  assert.equal(orbit.dataset.orbitRunning, 'true');
});

test('reduced motion stays static and follows preference changes', () => {
  const { orbit, events, button, media } = fixture({ reduced: true });
  events.intersection([{ isIntersecting: true }]);
  assert.equal(button.hidden, true);
  assert.equal(orbit.dataset.orbitRunning, 'false');
  media.matches = false; events.preference();
  assert.equal(button.hidden, false);
  assert.equal(orbit.dataset.orbitRunning, 'true');
  media.matches = true; events.preference();
  assert.equal(orbit.dataset.orbitRunning, 'false');
});

test('without visibility observation the decorative orbit stays static', () => {
  const { orbit, button } = fixture({ observer: false });
  assert.equal(orbit.dataset.orbitRunning, 'false');
  assert.equal(button.hidden, true);
});

test('orbit controller ignores pages without an orbit', () => {
  const { events } = fixture({ root: false });
  assert.equal(Object.keys(events).length, 0);
});

test('homepage has real links for both orbit nodes and retains clean product cards', () => {
  const html = readFileSync('site/index.html', 'utf8');
  for (const bot of ['tts', 'helper']) {
    assert.ok(html.includes(`class="eco-orbit__node eco-orbit__node--${bot}" href="${bot}/"`), `${bot} orbit link`);
    assert.ok(html.includes(`class="eco-product eco-product--${bot}" href="${bot}/"`), `${bot} card link`);
  }
  assert.ok(html.includes('data-home-orbit'));
  assert.ok(!html.includes('eco-product__preview'));
});

test('planet cards follow an upright path with shared hover and keyboard pause', () => {
  const css = readFileSync('site/css/ecosystem-v1.css', 'utf8');
  assert.ok(css.includes('offset-path: ellipse('), 'cards need an orbit trajectory');
  assert.ok(css.includes('offset-rotate: 0deg'), 'cards must stay upright');
  assert.ok(css.includes('.eco-orbit:hover .eco-orbit__node'), 'pause both cards on hover');
  assert.ok(css.includes('.eco-orbit:has(.eco-orbit__node:focus) .eco-orbit__node'), 'pause both cards for keyboard navigation');
  assert.ok(css.includes('animation-delay: -22s'), 'keep bots half an orbit apart');
});
