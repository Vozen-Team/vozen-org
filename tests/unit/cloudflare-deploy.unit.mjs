import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Cloudflare preview is isolated and production only routes the public site', async () => {
  const config = JSON.parse(await readFile('deploy/cloudflare/wrangler.jsonc', 'utf8'));
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
  assert.deepEqual(config.routes, ['vozen.org/*', 'www.vozen.org/*'].map(pattern => ({ pattern, zone_name: 'vozen.org' })));
  assert.equal(config.main, undefined);
  assert.deepEqual(config.env.preview.routes, []);
  assert.equal(config.env.preview.workers_dev, true);
  assert.notEqual(config.env.preview.name, config.name);
  assert.deepEqual(config.env.preview.assets, config.assets);
  assert.equal(config.assets.not_found_handling, '404-page');
});

test('publication requires validation and explicitly enabled protected main deployment', async () => {
  const workflow = await readFile('.github/workflows/pages.yml', 'utf8');
  const job = workflow.slice(workflow.indexOf('  deploy-cloudflare:'));
  assert.match(job, /needs: validate/);
  assert.match(job, /github\.event_name != 'pull_request'/);
  assert.match(job, /github\.ref == 'refs\/heads\/main'/);
  assert.match(job, /vars\.CLOUDFLARE_SITE_PUBLISH == 'true'/);
  assert.match(job, /name: vozen-static-\$\{\{ github\.sha \}\}/);
  assert.ok(job.indexOf('npm ci --prefix deploy/cloudflare --ignore-scripts') < job.indexOf('CLOUDFLARE_API_TOKEN:'));
  assert.equal((await readFile('deploy/cloudflare/package-lock.json', 'utf8')).includes('"wrangler": "4.153.0"'), true);
  const headers = await readFile('deploy/cloudflare/_headers', 'utf8');
  assert.match(headers, /https:\/\/:worker\.:account\.workers\.dev\/\*\s+X-Robots-Tag: noindex/);
});
