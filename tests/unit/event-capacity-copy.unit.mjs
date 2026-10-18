import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

test('event capacity copy explains zero and marks the limit optional', () => {
  const window = {};
  runInNewContext(readFileSync(new URL('../../site/js/i18n-v42.js', import.meta.url), 'utf8'), { window });
  const dictionary = window.VOZEN_I18N;
  assert.equal(dictionary.en['helper.field.defaultCapacity.label'], 'Participant limit (optional)');
  assert.equal(dictionary.pt['helper.field.defaultCapacity.label'], 'Limite de participantes (opcional)');
  assert.equal(dictionary.en['helper.field.defaultCapacity.help'], '0 = unlimited.');
  assert.equal(dictionary.pt['helper.field.defaultCapacity.help'], '0 = sem limite.');
  for (const locale of ['en','pt','fr','es','de','tr','ar','zh','ru','ko']) {
    assert.ok(dictionary[locale]['helper.field.defaultCapacity.help'].includes('0'), locale);
  }
});
