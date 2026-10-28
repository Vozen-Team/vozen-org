import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('site/js/tab-title-v1.js', 'utf8');
function fixture(hidden = false, locale = 'en') {
  const events = new Map();
  let observeTitle;
  const document = { title: 'Vozen TTS', hidden, documentElement: { lang: locale }, querySelector: () => ({}), addEventListener: (name, fn) => events.set(name, fn) };
  const context = { document, window: { addEventListener: (name, fn) => events.set(name, fn) }, MutationObserver: class { constructor(fn) { observeTitle = fn; } observe() {} } };
  const run = () => vm.runInNewContext(source, context);
  run();
  return { document, run, mutate: () => observeTitle(), language(value) { document.documentElement.lang = value; events.get('vozen:languagechange')(); }, visibility(value) { document.hidden = value; events.get('visibilitychange')(); } };
}

test('restores each page title on return, including repeated tab switches', () => {
  const f = fixture();
  assert.equal(f.document.title, 'Vozen TTS');
  for (let i = 0; i < 3; i++) {
    f.visibility(true);
    assert.equal(f.document.title, "We're still here 👋");
    f.mutate();
    f.visibility(false);
    assert.equal(f.document.title, 'Vozen TTS');
  }
});

test('supports background loading, dynamic page/language titles and duplicate initialization', () => {
  const f = fixture(true);
  f.run();
  assert.equal(f.document.title, "We're still here 👋");
  f.document.title = 'Vozen Helper — Painel';
  f.mutate();
  assert.equal(f.document.title, "We're still here 👋");
  f.visibility(false);
  assert.equal(f.document.title, 'Vozen Helper — Painel');
  f.document.title = 'Vozen — Comandos';
  f.visibility(true);
  f.visibility(false);
  assert.equal(f.document.title, 'Vozen — Comandos');
});

test('follows all menu languages without reloading or losing the normal title', () => {
  const f = fixture(true);
  const translations = {
    en: "We're still here 👋", pt: 'Ainda estamos por aqui 👋', fr: 'On est toujours là 👋',
    es: 'Seguimos aquí 👋', de: 'Wir sind noch da 👋', tr: 'Hâlâ buradayız 👋',
    ar: 'ما زلنا هنا 👋', zh: '我們還在這裡 👋', ru: 'Мы всё ещё здесь 👋', ko: '아직 여기 있어요 👋',
  };
  for (const [locale, message] of Object.entries(translations)) {
    f.language(locale);
    assert.equal(f.document.title, message);
    f.mutate();
    f.visibility(false);
    assert.equal(f.document.title, 'Vozen TTS');
    f.visibility(true);
  }
  f.document.documentElement.lang = 'pt-PT';
  f.mutate();
  assert.equal(f.document.title, translations.pt);
  for (const locale of ['unsupported', 'constructor', '']) {
    f.language(locale);
    assert.equal(f.document.title, translations.en);
  }
  f.visibility(false);
  assert.equal(f.document.title, 'Vozen TTS');
});
