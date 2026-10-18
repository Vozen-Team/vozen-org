import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function fixture({ reduced = false, observer = true, text = '454', hidden = false } = {}) {
  const source = fs.readFileSync('site/js/social-proof-counter-v1.js', 'utf8');
  const number = { textContent:text, dataset:{} };
  const strip = { querySelector:() => number };
  const preferenceEvents = new Map(), documentEvents = new Map(), frames = new Map();
  const preference = { matches:reduced, addEventListener:(name, fn) => preferenceEvents.set(name, fn), removeEventListener:name => preferenceEvents.delete(name) };
  const document = { hidden, querySelector:() => strip, addEventListener:(name, fn) => documentEvents.set(name, fn), removeEventListener:name => documentEvents.delete(name) };
  let callback, time = 0, frame = 0, observations = 0, disconnected = false;
  const window = { matchMedia:() => preference, requestAnimationFrame:fn => { frames.set(++frame, fn); return frame; }, cancelAnimationFrame:id => frames.delete(id) };
  if (observer) window.IntersectionObserver = class {
    constructor(fn) { callback = fn; }
    observe(target) { assert.equal(target, strip); observations++; }
    disconnect() { disconnected = true; }
  };
  const context = {window, document, performance:{now:() => time}};
  const run = () => vm.runInNewContext(source, context);
  run();
  return {number, frames, preference, document, run,
    get observations() { return observations; },
    get disconnected() { return disconnected; },
    intersect:ratio => callback?.([{target:strip,isIntersecting:ratio > 0,intersectionRatio:ratio}]),
    step:now => { time = now; const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now)); },
    reduce:() => { preference.matches = true; preferenceEvents.get('change')?.(); },
    hide:value => { document.hidden = value; documentEvents.get('visibilitychange')?.(); }
  };
}

test('counter waits until visible, counts up without overshoot, then never replays', () => {
  const f = fixture();
  assert.equal(f.number.textContent,'454');
  assert.equal(f.frames.size,0);
  f.intersect(.3);
  assert.equal(f.frames.size,0);
  f.intersect(.8);
  assert.equal(f.number.textContent,'0');
  f.step(800);
  assert.ok(Number(f.number.textContent) > 0 && Number(f.number.textContent) < 454);
  f.step(1100);
  assert.ok(Number(f.number.textContent) < 454);
  assert.equal(f.frames.size,1);
  f.step(1600);
  assert.equal(f.number.textContent,'454');
  assert.equal(f.frames.size,0);
  assert.equal(f.disconnected,true);
  f.intersect(1);
  f.run();
  assert.equal(f.observations,1);
  assert.equal(f.frames.size,0);
});

test('reduced motion and missing observer keep the final value without scheduling animation', () => {
  for (const options of [{reduced:true},{observer:false},{text:'0'},{text:'invalid'}]) {
    const f = fixture(options);
    assert.equal(f.number.textContent,options.text ?? '454');
    assert.equal(f.observations,0);
    assert.equal(f.frames.size,0);
  }
});

test('enabling reduced motion before or during the count restores the final value', () => {
  for (const running of [false,true]) {
    const f = fixture();
    if (running) { f.intersect(1); f.step(300); }
    f.reduce();
    f.intersect(1);
    assert.equal(f.number.textContent,'454');
    assert.equal(f.frames.size,0);
  }
});

test('background tabs wait for visibility and finish an active count when hidden', () => {
  const f = fixture({hidden:true});
  f.intersect(1);
  assert.equal(f.frames.size,0);
  f.hide(false);
  assert.equal(f.number.textContent,'0');
  f.step(200);
  f.hide(true);
  assert.equal(f.number.textContent,'454');
  assert.equal(f.frames.size,0);
});
