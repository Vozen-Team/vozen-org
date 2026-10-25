import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../../site/js/tts-player-preview-v1.js', import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));

function fixture({ reduced = false, supported = true, broken = false } = {}) {
  const listeners = {};
  const elements = {};
  const frames = new Map();
  const bars = [];
  let created = 0, routed = 0, observer;
  for (const id of ['hearAudio','hearWave','hearElapsed','hearDuration','hear']) {
    elements[id] = { addEventListener: (event, callback) => { listeners[id + ':' + event] = callback; } };
  }
  Object.assign(elements.hearAudio, { paused: true, ended: false, error: null, currentTime: 0, duration: NaN });
  Object.assign(elements.hearWave, { width: 640, height: 96, getContext: () => ({ clearRect: () => bars.length = 0, fillRect: (...rect) => bars.push(rect) }) });
  const preference = { matches: reduced, addEventListener: (_, callback) => listeners.preference = callback };
  const document = { hidden: false, querySelector: selector => elements[selector.slice(1)], addEventListener: (event, callback) => listeners[event] = callback };
  class AudioContext {
    constructor() { created++; this.state = 'running'; this.destination = {}; }
    async resume() { if (broken) throw Error('unavailable'); }
    createAnalyser() { return { getByteTimeDomainData: data => data.fill(164) }; }
    createMediaElementSource() { routed++; return { connect() {} }; }
  }
  vm.runInNewContext(source, {
    document, window: { matchMedia: () => preference, AudioContext: supported ? AudioContext : undefined },
    Uint8Array,
    requestAnimationFrame: callback => { const id = frames.size + 1; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    IntersectionObserver: class { constructor(callback) { observer = callback; } observe() {} },
  });
  return { elements, listeners, frames, bars, document, preference,
    click: () => listeners['hear:click']({ target: { closest: () => true } }),
    visibility: value => observer([{ isIntersecting: value }]),
    get created() { return created; }, get routed() { return routed; },
  };
}

test('visualizer is dormant before a gesture and reuses one audio graph', async () => {
  const f = fixture();
  assert.equal(f.created, 0);
  assert.equal(f.frames.size, 0);
  assert.equal(f.bars.length, 40);
  assert.ok(f.bars.every(rect => rect[3] === 4));
  f.click();
  f.elements.hearAudio.paused = false;
  await tick();
  assert.equal(f.routed, 1);
  assert.equal(f.frames.size, 1);
  assert.ok(f.bars.every(rect => rect[3] > 4));
  await f.listeners['hearAudio:playing']();
  assert.equal(f.created, 1);
  assert.equal(f.routed, 1);
  assert.equal(f.frames.size, 1);
  f.elements.hearAudio.paused = true;
  f.listeners['hearAudio:pause']();
  assert.equal(f.frames.size, 0);
  assert.ok(f.bars.every(rect => rect[3] === 4));
});

test('real media timing resets on source changes and analysis stops offscreen or hidden', async () => {
  const f = fixture();
  f.click(); f.elements.hearAudio.paused = false; await tick();
  Object.assign(f.elements.hearAudio, { currentTime: 3.9, duration: 65.2 });
  f.listeners['hearAudio:timeupdate']();
  assert.equal(f.elements.hearElapsed.textContent, '0:03');
  assert.equal(f.elements.hearDuration.textContent, '1:05');
  f.visibility(false);
  assert.equal(f.frames.size, 0);
  f.visibility(true); await tick();
  assert.equal(f.frames.size, 1);
  f.document.hidden = true;
  f.listeners.visibilitychange();
  assert.equal(f.frames.size, 0);
  Object.assign(f.elements.hearAudio, { currentTime: 0, duration: NaN });
  f.listeners['hearAudio:emptied']();
  assert.equal(f.elements.hearElapsed.textContent, '0:00');
  assert.equal(f.elements.hearDuration.textContent, '—');
});

test('reduced motion, missing Web Audio and failed analysis leave the normal player alone', async () => {
  for (const options of [{ reduced: true }, { supported: false }, { broken: true }]) {
    const f = fixture(options);
    f.click(); f.elements.hearAudio.paused = false;
    await f.listeners['hearAudio:playing']();
    assert.equal(f.routed, 0);
    assert.equal(f.frames.size, 0);
    assert.equal(f.elements.hearAudio.paused, false);
  }
});
