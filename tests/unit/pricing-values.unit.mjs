import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {parse} from 'parse5';

const plans = [
  ['plus', 199, 1899, 399, 3799, ''],
  ['pro', 399, 3799, 799, 6699, 's2'],
  ['pro', 799, 7099, 1599, 13399, 's5'],
];
const money = cents => '€' + (cents / 100).toFixed(2);
function elements(node) {
  return [node, ...(node.childNodes || []).flatMap(elements)];
}
const classes = node => (node.attrs?.find(attr => attr.name === 'class')?.value || '').split(/\s+/);
const text = node => node.value || (node.childNodes || []).map(text).join('');

test('current and previously listed prices match across product routes and locales', () => {
  const locales = ['pt','fr','es','de','tr','ar','zh','ru','ko'];
  const routes = ['tts/index.html','helper/index.html','music/index.html','premium.html','tts.html','helper.html',
    ...locales.flatMap(locale => [locale + '/tts/index.html', locale + '/helper/index.html'])];
  for (const route of routes) {
    const nodes = elements(parse(readFileSync('site/' + route, 'utf8')));
    for (const [plan, monthly, yearly, previousMonthly, previousYearly, seats] of plans) {
      const card = nodes.find(node => classes(node).includes('price-card--' + plan));
      assert.ok(card, route + ' ' + plan);
      const children = elements(card);
      for (const [period, amount, previous] of [['m', monthly, previousMonthly], ['y', yearly, previousYearly]]) {
        const value = children.find(node => classes(node).includes('amt--' + period) && (!seats || classes(node).includes('amt--' + seats)));
        assert.equal(text(value), money(amount), route + ' ' + plan + seats + period);
        const old = children.filter(node => node.tagName === 's' && classes(node).includes('was--' + period) && (!seats || classes(node).includes('was--' + seats)));
        assert.deepEqual(old.map(text), previous === null ? [] : [money(previous)], route + ' previous ' + plan + seats + period);
        const badge = old[0]?.attrs.find(attr => attr.name === 'data-discount')?.value;
        assert.equal(badge, period === 'm' ? '−' + Math.round((previous - amount) * 100 / previous) + '%' : undefined, route + ' discount ' + plan + seats + period);
      }
      assert.ok(yearly < monthly * 12);
    }
  }
  for (const locale of ['en', ...locales]) {
    const {messages} = JSON.parse(readFileSync('tools/i18n-marketing-src/' + locale + '.json', 'utf8'));
    for (const [plan, yearly] of [['plus', '18.99'], ['pro', '37.99'], ['max', '70.99']]) {
      assert.ok(messages['price.' + plan + '.note'].replaceAll(',', '.').includes(yearly), locale + plan);
    }
    assert.ok(messages['feat.8.d'].replaceAll(',', '.').includes('3.99'), locale + ' feature price');
  }
});
