import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'parse5';

const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);

test('public documentation and links are removed without removing product entry points', () => {
  assert.equal(fs.existsSync('site/docs'), false);
  for (const route of ['index.html', 'tts/index.html', 'music/index.html', 'helper/index.html', 'commands/index.html', 'account/index.html', 'dashboard/index.html', 'panel/helper-tracker/index.html', 'panel/collection/index.html', 'premium.html']) assert.ok(fs.existsSync(`site/${route}`), route);
  for (const file of walk('site').filter(file => /\.(html|js|xml)$/.test(file))) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /(?:https:\/\/vozen\.org)?\/docs\//i, file);
    if (!file.endsWith('.html')) continue;
    const visit = node => {
      for (const attr of node.attrs || []) if (['href', 'src', 'action'].includes(attr.name)) assert.doesNotMatch(attr.value, /(?:^|\/)docs(?:\/|$)/i, `${file}: ${attr.value}`);
      for (const child of node.childNodes || []) visit(child);
      if (node.content) visit(node.content);
    };
    visit(parse(source));
  }
});
