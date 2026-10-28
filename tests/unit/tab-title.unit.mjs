import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('site/js/tab-title-v1.js', 'utf8');
function fixture(hidden = false) {
  const events = new Map();
  let observeTitle;
  const document = { title: 'Vozen TTS', hidden, querySelector: () => ({}), addEventListener: (name, fn) => events.set(name, fn) };
  const context = { document, window: {}, MutationObserver: class { constructor(fn) { observeTitle = fn; } observe() {} } };
  const run = () => vm.runInNewContext(source, context);
  run();
  return { document, run, mutate: () => observeTitle(), visibility(value) { document.hidden = value; events.get('visibilitychange')(); } };
}

test('restores each page title on return, including repeated tab switches', () => {
  const f = fixture();
  assert.equal(f.document.title, 'Vozen TTS');
  for (let i = 0; i < 3; i++) {
    f.visibility(true);
    assert.equal(f.document.title, 'Ainda estamos por aqui 👋');
    f.mutate();
    f.visibility(false);
    assert.equal(f.document.title, 'Vozen TTS');
  }
});

test('supports background loading, dynamic page/language titles and duplicate initialization', () => {
  const f = fixture(true);
  f.run();
  assert.equal(f.document.title, 'Ainda estamos por aqui 👋');
  f.document.title = 'Vozen Helper — Painel';
  f.mutate();
  assert.equal(f.document.title, 'Ainda estamos por aqui 👋');
  f.visibility(false);
  assert.equal(f.document.title, 'Vozen Helper — Painel');
  f.document.title = 'Vozen — Comandos';
  f.visibility(true);
  f.visibility(false);
  assert.equal(f.document.title, 'Vozen — Comandos');
});
