import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parse } from 'parse5';

const attr = (node, name) => node.attrs?.find(item => item.name === name)?.value;
const has = (node, name) => node.attrs?.some(item => item.name === name);
const walk = node => [node, ...(node.childNodes || []).flatMap(walk)];
const document = parse(fs.readFileSync('site/status.html', 'utf8'));
const nodes = walk(document);
const cards = nodes.filter(node => has(node, 'data-status-service'));

test('timeline colors are vivid, distinct and contrast with the card surface', () => {
  const css = fs.readFileSync('site/css/status-v2.css', 'utf8');
  const luminance = hex => {
    const rgb = hex.match(/\w{2}/g).map(value => parseInt(value,16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  };
  const colors = ['operational','degraded','unavailable','partial','unknown'].map(state => {
    const rule = css.split(`.status-day[data-state='${state}'],`)[1]?.split('}')[0];
    const hex = rule?.match(/background:\s*#([a-f\d]{6})/i)?.[1];
    assert.ok(hex, state);
    const channels = hex.match(/\w{2}/g).map(value => parseInt(value,16));
    assert.ok((Math.max(...channels) - Math.min(...channels)) / Math.max(...channels) >= .4, `${state}: vivid color`);
    const contrast = (luminance(hex) + .05) / (luminance('10141f') + .05);
    assert.ok(contrast >= (state === 'unknown' ? 6 : 3), `${state}: contrast`);
    return hex;
  });
  assert.equal(new Set(colors).size,5);
});

test('timeline focus marks the selected day without outlining the whole history', () => {
  const css = fs.readFileSync('site/css/status-v2.css', 'utf8');
  assert.doesNotMatch(css, /\.status-timeline:focus-within\s*\{/);
  assert.match(css, /\.status-timeline:focus-within \.status-day\[data-selected='true'\]\s*\{[^}]*outline-width:\s*2px/);
});

test('each status card keeps explanations and help in one closed disclosure', () => {
  assert.equal(cards.length, 3);
  for (const card of cards) {
    const details = walk(card).filter(node => node.tagName === 'details');
    assert.equal(details.length, 1);
    assert.ok(!has(details[0], 'open'));
    const nested = walk(details[0]);
    assert.ok(nested.some(node => has(node, 'data-history-measurements')));
    assert.ok(nested.some(node => /Scope$/.test(attr(node, 'data-i18n') || '')));
    assert.ok(nested.some(node => node.tagName === 'a' && attr(node, 'href')?.startsWith('docs/')));
    const summary = details[0].childNodes.find(node => node.tagName === 'summary');
    assert.ok(walk(summary).some(node => has(node, 'data-status-latency')));
  }
});

test('history legend and refresh failures stay outside the optional methodology', () => {
  const history = nodes.find(node => attr(node, 'class') === 'status-history');
  assert.ok(history);
  const method = walk(history).find(node => node.tagName === 'details');
  assert.ok(method && !has(method, 'open'));
  assert.ok(!walk(method).some(node => has(node, 'data-history-error')));
  assert.ok(!walk(method).some(node => attr(node, 'class') === 'status-history-legend'));
});
