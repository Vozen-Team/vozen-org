import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../../site/js/helper-demos-v1.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../../site/helper/index.html', import.meta.url), 'utf8');

test('setup retains three static scenes and proposal copy after localization', () => {
  const setup = html.slice(html.indexOf('<section class="helper-setup"'), html.indexOf('<section class="helper-pricing'));
  assert.equal((setup.match(/data-demo="setup-/g)||[]).length,3);
  for (const label of ['Choose modules','Review permissions','Make it yours']) {
    assert.ok(setup.includes('data-preview-copy="'+label+'"'),label);
  }
  assert.doesNotMatch(setup,/<p[ >]|<button|data-demo-toggle|Illustrative examples/);
});

test('six compact illustrated cards retain all eight modules without tabs or dropdowns', () => {
  assert.doesNotMatch(html, /role="tab(?:list|panel)?"|class="helper-module-tab/);
  assert.equal((html.match(/class="helper-story-section /g) || []).length, 5);
  assert.match(html,/id="modules" data-helper-cards/);
  assert.match(html,/class="helper-cards-heading"/);
  const cards=html.slice(html.indexOf('class="helper-stories"'),html.indexOf('class="helper-story-more"'));
  assert.equal((cards.match(/<h3 id="story-/g)||[]).length,5);
  assert.doesNotMatch(html,/data-demo-toggle|Replay example|<figcaption|fictional data|>Illustrative preview</);
  const grid=html.slice(html.indexOf('class="helper-stories"'),html.indexOf('class="helper-setup"'));
  assert.doesNotMatch(grid,/<details|<summary|<select|>Replay<|Explore protection/);
  assert.match(grid,/data-demo="workspace"/);
  for(const card of cards.split('<section class="helper-story-section ').slice(1))assert.ok(card.indexOf('<figure')<card.indexOf('class="helper-story-copy"'));
  for (const id of ['core','security','support','events','community','automate','insights','studio']) {
    assert.ok(html.includes('id="module-' + id + '"'), id);
  }
});

test('workflow illustration stays within message, contains and reply capabilities', () => {
  const workflow = html.slice(html.indexOf('data-demo="automate"'), html.indexOf('id="module-core"'));
  for (const label of ['configured keyword', '>help<', '#guide']) assert.ok(workflow.includes(label), label);
  assert.doesNotMatch(workflow, /demo-workflow|demo-step|data-idle|data-active/);
  assert.doesNotMatch(workflow, /A member joins|Membership rules|Send a welcome/);
});

test('ticket illustration shows private help from the server team without a public-message automation claim', () => {
  const ticket = html.slice(html.indexOf('id="module-support"'), html.indexOf('id="module-events"'));
  assert.match(ticket, /Private ticket/);
  assert.match(ticket, /Help\?/);
  assert.match(ticket, /On it\./);
  assert.match(ticket, /Your team/);
  assert.match(ticket, /aria-label="Illustrative private ticket/);
  assert.doesNotMatch(ticket, /automatically|auto-detect|instant response/);
});

test('every feature result is present in static HTML without a pending stage or changing metric', () => {
  const stories = html.slice(html.indexOf('class="helper-stories"'), html.indexOf('class="helper-story-more"'));
  for (const label of ['crossed-out spam', 'private ticket', 'event signup confirmed', '>13<', 'New role', '#guide']) assert.ok(stories.includes(label), label);
  assert.doesNotMatch(stories, /demo-result|data-idle=|data-active=|Waiting|Ready to run/);
});

test('protection communicates one result without a checklist or waiting for animation', () => {
  const protection = html.slice(html.indexOf('id="module-security"'), html.indexOf('id="module-support"'));
  assert.match(protection, /Less spam\./);
  assert.match(protection, /crossed-out spam message/);
  assert.doesNotMatch(protection, /demo-checks|security-member|Rules checked|Audit recorded|demo-result/);
});

test('scenes run once when visible without replay controls and show immediate results for reduced motion', () => {
  for (const reduced of [false, true]) {
    let callback, disconnected = false;
    const classes = new Set();
    const scene = {
      classList: { add: name => classes.add(name), remove: name => classes.delete(name) },
    };
    vm.runInNewContext(source, {
      document: { querySelectorAll: () => [scene] },
      window: { matchMedia: () => ({ matches: reduced }), requestAnimationFrame: fn => fn() },
      IntersectionObserver: class {
        constructor(fn) { callback = fn; }
        observe() {}
        disconnect() { disconnected = true; }
      },
    });
    if (reduced) assert.equal(callback, undefined);
    else {
      callback([{ isIntersecting: false }]);
      assert.equal(classes.size, 0);
      callback([{ isIntersecting: true }]);
      assert.equal(disconnected, true);
    }
    assert.ok(classes.has('is-demo-active'));
  }
});
