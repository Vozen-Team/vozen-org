import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import * as parse5 from 'parse5';

const read = file => fs.readFileSync(file, 'utf8');
const script = read('site/js/main-v51.js');
const documentNodes = file => {
  const found = [];
  function visit(node) {
    found.push(node);
    for (const child of node.childNodes || []) visit(child);
  }
  visit(parse5.parse(read(file)));
  return found;
};
const attrs = node => Object.fromEntries((node.attrs || []).map(({name, value}) => [name, value]));

test('new checkout is enabled and pricing pages provide working purchase entry points', () => {
  assert.ok(/const PAYMENTS_ENABLED = true;/.test(script), 'new checkout enabled');
  const premium = documentNodes('site/premium.html');
  for (const plan of ['plus', 'premium']) {
    const button = premium.find(node => attrs(node)['data-billing-plan'] === plan);
    assert.ok(button);
    assert.equal(attrs(button).disabled, undefined);
  }
  for (const file of ['site/tts.html', 'site/helper.html', 'site/tts/index.html', 'site/helper/index.html']) {
    const nodes = documentNodes(file);
    const links = nodes.filter(node => node.tagName === 'a' && attrs(node).href === '/premium#plans');
    assert.ok(links.length >= 2, file);
    assert.doesNotMatch(read(file), /Payments (?:are )?temporarily disabled|Checkout will return/);
  }
  assert.doesNotMatch(read('site/js/global-nav-v1.js'), /<span[^>]+premium-disabled/);
});

test('checkout labels agree in public and account locale catalogues', () => {
  const context = vm.createContext({window: {dispatchEvent() {}}, CustomEvent: function () {}});
  vm.runInContext(read('site/js/i18n-v41.js'), context);
  vm.runInContext(read('site/js/i18n-v42.js'), context);
  for (const locale of ['en', 'pt', 'fr', 'es', 'de', 'tr', 'ar', 'zh', 'ru', 'ko']) {
    const publicCopy = JSON.parse(read(`tools/i18n-marketing-src/${locale}.json`)).messages;
    assert.equal(context.window.VOZEN_I18N[locale]['price.checkout'], publicCopy['price.checkout']);
    assert.ok(context.window.VOZEN_I18N[locale]['panel.login']);
    assert.ok(context.window.VOZEN_I18N[locale]['claim.help.close']);
  }
});

test('all six checkout selections send only the intended plan and interval', () => {
  const source = script.slice(script.indexOf('  function checkoutRequestBody()'), script.indexOf('  async function continueHostedBillingCheckout()'));
  for (const interval of ['monthly', 'yearly']) {
    for (const [plan, seats, expected] of [['plus', 1, 'plus'], ['premium', 2, 'premium'], ['premium', 5, 'max']]) {
      const body = vm.runInContext(`const billingRequest = ${JSON.stringify({plan, seats, interval})}; ${source}; JSON.stringify(checkoutRequestBody())`, vm.createContext({}));
      assert.deepEqual(JSON.parse(body), {plan: expected, interval});
    }
  }
});

test('checkout requires identity before any provider-session request', () => {
  const hosted = script.slice(script.indexOf('  async function continueHostedBillingCheckout()'), script.indexOf('  async function mountPaymentElement('));
  const embedded = script.slice(script.indexOf('  async function continueBillingCheckout()'), script.indexOf('  async function resumeBillingReturn()'));
  for (const source of [hosted, embedded]) {
    assert.ok(source.indexOf('storedToken()') < source.indexOf('await fetch('));
    assert.match(source, /setBillingPhase\("auth"\); return;/);
  }
  assert.match(script, /result\?\.status === "complete" && result\?\.paymentStatus === "paid"/);
});

test('checkout retains the site font outside the locked page body', () => {
  const modalRule = read('site/css/billing-v3.css').match(/\.billing-modal \{([^}]+)\}/)[1];
  assert.ok(/font-family:/.test(modalRule), 'modal must not inherit the browser serif default');
});
