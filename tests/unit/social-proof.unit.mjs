import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as parse5 from 'parse5';
import { localize } from '../../tools/build-localized-pages.mjs';

const source = fs.readFileSync('site/index.html', 'utf8');
function nodes(node, predicate) {
  return [...(predicate(node) ? [node] : []), ...(node.childNodes || []).flatMap(child => nodes(child, predicate))];
}
const attr = (node, name) => node.attrs?.find(item => item.name === name)?.value;
const text = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(text).join('');
function proof(html) {
  const matches = nodes(parse5.parse(html), node => (attr(node, 'class') || '').split(' ').includes('eco-social-proof'));
  assert.equal(matches.length, 1, 'exactly one social-proof strip');
  return matches[0];
}

test('homepage proof keeps TTS and its public link without the snapshot caption', () => {
  const strip = proof(source);
  assert.match(text(strip), /Vozen TTS/);
  assert.match(text(strip), /454/);
  assert.match(text(strip), /5\/5/);
  assert.equal(nodes(strip, node => (attr(node, 'class') || '').split(' ').includes('eco-proof__reviews')).length, 0);
  assert.doesNotMatch(text(strip), /\d+\s+reviews/);
  assert.ok(nodes(strip, node => attr(node, 'href') === 'https://top.gg/bot/1523826014935842997').length);
  assert.equal(nodes(strip, node => (attr(node, 'class') || '').split(' ').includes('eco-proof__source')).length, 0);
  assert.doesNotMatch(text(strip), /snapshot|2026-10-18/i);
  assert.doesNotMatch(text(strip), /4300|4\.7|million|streamed|live|trusted/i);
  assert.ok(source.indexOf('eco-social-proof') < source.indexOf('id="products"'));
});

test('all ten locale routes preserve the actual values and translate proof labels before JS', () => {
  const page = { route: 'home', slug: '', source: 'index.html', title: 'home.documentTitle', description: 'home.heroLead' };
  for (const code of ['en', 'pt', 'fr', 'es', 'de', 'tr', 'ar', 'zh', 'ru', 'ko']) {
    const catalogue = JSON.parse(fs.readFileSync(`tools/i18n-marketing-src/${code}.json`, 'utf8'));
    for (const key of ['home.proof.aria', 'home.proof.servers', 'home.proof.rating']) assert.ok(catalogue.messages[key], `${code}: ${key}`);
    const html = localize(source, { code, html: code === 'pt' ? 'pt-PT' : code }, page, catalogue);
    const strip = proof(html);
    const copy = text(strip);
    for (const value of ['454', '5/5']) assert.ok(copy.includes(value), `${code}: ${value}`);
    assert.equal(nodes(strip, node => attr(node, 'data-i18n') === 'home.proof.snapshot').length, 0, code);
    assert.doesNotMatch(copy, /2026-10-18/, code);
    assert.ok(copy.includes(catalogue.messages['home.proof.servers']), code);
    assert.equal(nodes(strip, node => attr(node, 'data-i18n') === 'home.proof.reviews').length, 0, code);
    assert.equal(attr(strip, 'aria-label'), catalogue.messages['home.proof.aria']);
  }
});
