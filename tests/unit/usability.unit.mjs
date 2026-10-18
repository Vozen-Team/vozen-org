import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('Docs drawer is inert while closed on mobile and accessible after resizing to desktop', () => {
  const source = readFileSync('site/docs/shared/docs-shell.js', 'utf8');
  const snippet = source.slice(source.indexOf('    let lastFocus = null;'), source.indexOf("    toggle.addEventListener('click'"));
  const classes = new Set();
  const attrs = new Map();
  const media = { matches: true, addEventListener(_, callback) { this.change = callback; } };
  let focused = null;
  const toggle = { setAttribute(key, value) { attrs.set(key, value); }, focus() { focused = this; } };
  const sidebar = { inert: false, setAttribute(key, value) { attrs.set('sidebar:' + key, value); }, removeAttribute(key) { attrs.delete('sidebar:' + key); }, querySelector() { return { focus() { focused = sidebar; } }; }, contains(node) { return node === sidebar; } };
  const document = { activeElement: toggle, body: { classList: { contains: name => classes.has(name), toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); } } } };
  const scrim = {};
  const context = vm.createContext({ window: { matchMedia: () => media, setTimeout: fn => fn() }, document, sidebar, toggle, scrim });
  vm.runInContext(snippet + '\nglobalThis.openDrawer = setOpen;', context);
  assert.equal(sidebar.inert, true);
  assert.equal(scrim.inert, true);
  context.openDrawer(true);
  assert.equal(sidebar.inert, false);
  assert.equal(scrim.inert, false);
  assert.equal(focused, sidebar);
  context.openDrawer(false);
  assert.equal(sidebar.inert, true);
  assert.equal(focused, toggle);
  media.matches = false;
  media.change();
  assert.equal(sidebar.inert, false);
  assert.equal(attrs.has('sidebar:aria-hidden'), false);
  media.matches = true;
  media.change();
  assert.equal(sidebar.inert, true);
});

test('homepage keeps both product links and icons without the rejected diagrams', () => {
  const html = readFileSync('site/index.html', 'utf8');
  assert.doesNotMatch(html, /class="eco-home-map"/);
  for (const product of ['tts', 'helper']) {
    assert.match(html, new RegExp(`class="eco-product eco-product--${product}" href="${product}/"`));
    assert.ok(!html.includes(`eco-product__preview--${product}`), `${product}: no diagram`);
    assert.ok(html.includes(`eco-product__icon--${product}`), `${product}: keep product icon`);
  }
  assert.ok(!readFileSync('site/css/ecosystem-v1.css', 'utf8').includes('.eco-product__preview'), 'remove unused diagram styles');
  for (const locale of ['pt', 'fr', 'es', 'de', 'tr', 'ar', 'zh', 'ru', 'ko']) {
    const localized = readFileSync(`site/${locale}/index.html`, 'utf8');
    assert.ok(!localized.includes('eco-product__preview'), `${locale}: no diagram`);
  }
});

test('primary homepage action uses a dark foreground on its bright brand gradient', () => {
  const css = readFileSync('site/css/ecosystem-v1.css', 'utf8');
  assert.match(css, /\.eco-home-hero__primary\s*\{\s*color: #07070d;/);
});

test('language menu closes on Escape and when keyboard focus leaves it', () => {
  const source = readFileSync('site/js/main-v51.js', 'utf8').replaceAll('\r\n', '\n');
  const start = source.indexOf('    // clique fora fecha');
  const snippet = source.slice(start, source.indexOf('  }\n  buildLangMenu();', start));
  const events = {};
  const menuEvents = {};
  const inside = {};
  let open = true;
  const closed = [];
  vm.runInNewContext(snippet, {
    document: { addEventListener: (name, fn) => { events[name] = fn; } },
    menu: { contains: node => node === inside, addEventListener: (name, fn) => { menuEvents[name] = fn; } },
    isOpen: () => open, close: focus => { closed.push(focus); open = false; },
  });
  events.keydown({ key: 'Tab' });
  assert.equal(open, true);
  let prevented = false;
  events.keydown({ key: 'Escape', preventDefault: () => { prevented = true; } });
  assert.deepEqual(closed, [true]);
  assert.equal(prevented, true);
  open = true;
  menuEvents.focusout({ relatedTarget: inside });
  menuEvents.focusout({ relatedTarget: null });
  assert.equal(open, true);
  menuEvents.focusout({ relatedTarget: {} });
  assert.deepEqual(closed, [true, false]);
  events.click({ target: {} });
  assert.equal(closed.length, 2);
  open = true;
  events.click({ target: inside });
  assert.equal(open, true);
  events.click({ target: {} });
  assert.deepEqual(closed, [true, false, false]);
});
