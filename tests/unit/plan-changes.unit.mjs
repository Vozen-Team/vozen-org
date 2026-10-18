import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (file) => fs.readFileSync(file, 'utf8');
test('plan management retains the separate new-checkout pause', () => {
  const script = read('site/js/main-v51.js');
  const account = read('site/account/index.html');
  assert.match(script, /const PAYMENTS_ENABLED = false;/);
  assert.match(account, /<dialog[^>]+id="planChangeDialog"/);
  assert.match(account, /id="planChangeConfirm" hidden(?:="")? disabled/);
  assert.match(script, /planApi\("change\/preview"/);
  assert.match(script, /planApi\("change\/confirm", \{ token \}\)/);
  assert.match(script, /if \(busy \|\| !quote\) return;/);
  assert.match(script, /destination.hostname !== "invoice.stripe.com"/);
  const portal = script.slice(script.indexOf('document.getElementById("accountBilling")?.addEventListener'));
  assert.doesNotMatch(portal.split('// Botão de login')[0], /if \(!PAYMENTS_ENABLED\)/);
  assert.match(script, /pass\.inactiveServers/);
  assert.match(read('site/css/account-v6.css'), /\.plan-change::backdrop/);
  assert.match(read('site/css/account-v6.css'), /position: fixed !important; \/\* Override the site's body-child stacking rule/);
});
