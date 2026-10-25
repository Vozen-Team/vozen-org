import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const main = readFileSync(new URL('../../site/js/main-v51.js', import.meta.url), 'utf8');
const renderer = main.slice(main.indexOf('  const cmdList = $("#cmdList");'), main.indexOf('  /* ── faq'));
const data = {};
vm.runInNewContext(readFileSync(new URL('../../site/js/i18n-public/en.js', import.meta.url), 'utf8'), { window: data });

function fixture({ compact = true, reduced = false, supportsMotion = true } = {}) {
  const clicks = {}, pressed = {}, animations = [];
  const buttons = ['general','voice','fun','admin'].map(tab => ({
    dataset: { tab },
    addEventListener: (_, callback) => clicks[tab] = callback,
    setAttribute: (_, value) => pressed[tab] = value,
    classList: { toggle() {} },
  }));
  const list = { innerHTML: '', closest: () => compact ? {} : null,
    animate: supportsMotion ? (...args) => animations.push(args) : undefined };
  vm.runInNewContext(renderer + '\nrenderCommands();', {
    $: () => list, $$: () => buttons,
    window: { VOZEN_COMMANDS: data.VOZEN_COMMANDS }, lang: 'en', reduce: reduced,
  });
  return { clicks, pressed, list, animations,
    names: () => [...list.innerHTML.matchAll(/<code>(.*?)<\/code>/g)].map(match => match[1]) };
}

test('compact marketing preview prioritizes six essential commands and reuses real catalogue descriptions', () => {
  const f = fixture();
  assert.deepEqual(f.names(), ['/setup','/join','/tts','/skip','/leave','/help']);
  assert.equal(f.pressed.general, 'true');
  assert.match(f.list.innerHTML, /Guided one-step setup/);
  assert.equal(f.animations.length, 0);
  for (const category of ['voice','fun','admin']) {
    f.clicks[category]();
    assert.deepEqual(f.names(), Array.from(data.VOZEN_COMMANDS[category].slice(0,6), row => row[0]));
    assert.equal(f.pressed[category], 'true');
    assert.equal(f.pressed.general, 'false');
  }
  assert.equal(f.animations.length, 3);
  assert.equal(f.animations[0][1].duration, 180);
});

test('non-preview pages retain every command in the original category order', () => {
  const f = fixture({ compact: false });
  for (const category of ['general','voice','fun','admin']) {
    f.clicks[category]();
    assert.deepEqual(f.names(), Array.from(data.VOZEN_COMMANDS[category], row => row[0]));
  }
  assert.equal(f.animations.length, 0);
});

test('reduced motion and missing animation API still switch categories without animation', () => {
  for (const options of [{ reduced: true }, { supportsMotion: false }]) {
    const f = fixture(options);
    f.clicks.voice();
    assert.equal(f.names().length, 6);
    assert.equal(f.animations.length, 0);
  }
});

test('local preview retains full static command fallback and a real catalogue link', () => {
  const html = readFileSync(new URL('../../site/tts/index.html', import.meta.url), 'utf8');
  const section = html.slice(html.indexOf('id="commands"'), html.indexOf('id="premium"'));
  assert.match(section, /data-command-preview/);
  assert.match(section, /class="command-catalogue-link" href="commands\//);
  assert.doesNotMatch(section, /Illustrative example|fictional data/i);
  assert.match(section, /\/server-pronunciation/);
  assert.doesNotMatch(section, /<audio|autoplay|cmd\.sub/);
});
