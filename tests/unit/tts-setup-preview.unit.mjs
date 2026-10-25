import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('three illustrative setup scenes reuse finite motion without sound or a timed setup promise', () => {
  const html=readFileSync(new URL('../../site/tts/index.html',import.meta.url),'utf8');
  const setup=html.slice(html.indexOf('id="setup"'),html.indexOf('id="commands"'));
  assert.equal((setup.match(/data-feature-scene(?:=""| )/g)||[]).length,3);
  assert.equal((setup.match(/aria-hidden="true"/g)||[]).length,3);
  assert.match(setup,/data-i18n="setup\.1\.t"/);
  assert.match(setup,/data-i18n="setup\.1\.d"/);
  assert.match(setup,/Start in 3 steps/);
  assert.doesNotMatch(setup,/Illustrative examples|fictional data/i);
  assert.match(setup,/\/setup/);
  assert.match(setup,/<h3>\/setup<\/h3>/);
  assert.match(setup,/Choose a text channel and enable auto-read\./);
  assert.match(setup,/Enter a voice channel, run \/join, then type in your configured text channel\./);
  assert.match(setup,/href="docs\/tts\/text-to-speech\/reading-messages\/"/);
  assert.doesNotMatch(setup,/data-i18n="setup\.[23]\./);
  assert.doesNotMatch(setup,/setup\.title|30 seconds|<button|<audio|<canvas|autoplay/);
  const css=readFileSync(new URL('../../site/css/product-preview-v1.css',import.meta.url),'utf8').split('.helper-setup-art.is-demo-active')[0];
  assert.equal((css.match(/animation: setup-[^;]+/g)||[]).length,6);
  for(const animation of css.match(/animation: setup-[^;]+/g)) {
    assert.match(animation,/650ms/);
    assert.doesNotMatch(animation,/infinite/);
  }
});
