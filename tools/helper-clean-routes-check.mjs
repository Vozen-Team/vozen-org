import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createSiteServer, closeSiteServer } from './serve-site.mjs';

const features=JSON.parse(await readFile(new URL('../apps/helper-panel/src/panel-paths.json',import.meta.url),'utf8'));
assert.equal(Object.keys(features).length,47);
assert.equal(new Set(Object.values(features)).size,47);
const slugs=['','servers','setup','features','activity','collection',...Object.values(features)];
const {server,origin}=await createSiteServer();
try {
  for(const slug of slugs) {
    assert.match(slug,/^(?:[a-z][a-z0-9-]*)?$/);
    const pathname=`/panel/${slug?`${slug}/`:''}`;
    const response=await fetch(origin+pathname);
    assert.equal(response.status,200,`direct entry/reload: ${pathname}`);
    const html=await response.text();
    assert.ok(html.includes(`href="https://vozen.org${pathname}"`),`canonical ${pathname}`);
    assert.match(html,/src="\/panel\/helper-tracker\/assets\/[^"<>]+\.js"/);
    assert.ok(!html.includes('sourceMappingURL'));
  }
  console.log(`Clean Helper entries: ${slugs.length} direct URLs return200 with the shared built app.`);
} finally { await closeSiteServer(server); }
