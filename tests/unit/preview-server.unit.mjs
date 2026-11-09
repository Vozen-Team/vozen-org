import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { request } from 'node:http';
import { once } from 'node:events';
import { createSiteServer, closeSiteServer } from '../../tools/serve-site.mjs';

test('invalid URL requests return 400 without stopping the local preview', async(t)=>{
  const {server,origin}=await createSiteServer();
  t.after(()=>closeSiteServer(server));
  for(const pathname of ['//','/%ZZ']) {
    const status=await new Promise((resolve,reject)=>{
      const req=request(origin,{path:pathname},res=>{res.resume();resolve(res.statusCode);});
      req.on('error',reject);
      req.setTimeout(500,()=>req.destroy(new Error('invalid request hung')));
      req.end();
    });
    assert.equal(status,400);
    assert.equal((await fetch(origin+'/helper/')).status,200);
  }
});

test('local plan links resolve both paid checkout buttons on the Premium page', async(t)=>{
  const {server,origin}=await createSiteServer();
  t.after(()=>closeSiteServer(server));
  const response=await fetch(origin+'/premium');
  assert.equal(response.status,200);
  const html=await response.text();
  assert.deepEqual([...html.matchAll(/data-billing-plan="([^"]+)"/g)].map(match=>match[1]),['plus','premium']);
});

test('clean page URLs serve HTML and old URLs redirect without losing their query', async (t) => {
  const { server, origin } = await createSiteServer();
  t.after(() => closeSiteServer(server));
  for (const [oldPath, cleanPath] of [
    ['/status.html', '/status'], ['/premium.html', '/premium'], ['/privacy.html', '/privacy'],
    ['/terms.html', '/terms'], ['/dashboard.html', '/dashboard'], ['/404.html', '/404'],
    ['/tts.html', '/tts'], ['/helper.html', '/helper'], ['/account.html', '/account'],
    ['/commands/index.html', '/commands/'], ['/pt/tts', '/pt/tts/'], ['/index.html', '/'],
    ['/dashboard/index.html', '/dashboard/'],
  ]) {
    const response = await fetch(origin + oldPath + '?lang=pt&add=1', { redirect: 'manual' });
    assert.equal(response.status, 307, oldPath);
    assert.equal(response.headers.get('location'), cleanPath + '?lang=pt&add=1');
    assert.match((await fetch(origin + cleanPath)).headers.get('content-type'), /^text\/html/, cleanPath);
  }
  assert.equal((await fetch(origin + '/missing.html')).status, 404);
  assert.match(await (await fetch(origin + '/dashboard')).text(), /data-i18n-document-title="dashboard.documentTitle"/);
  assert.match(await (await fetch(origin + '/dashboard/')).text(), /Vozen TTS installation/);
  const home = await (await fetch(origin)).text();
  assert.match(home, /href="\/status"[^>]*data-i18n="ecosystem.status"/);
  assert.match(home, /href="\/premium"[^>]*data-i18n="nav.premium"/);
});

test('preview shutdown closes unfinished browser connections', async (t) => {
  const { server, origin } = await createSiteServer();
  const socket = net.connect(Number(new URL(origin).port), '127.0.0.1');
  t.after(() => { socket.destroy(); server.closeAllConnections(); server.close(); });
  await once(socket, 'connect');
  socket.write('GET / HTTP/1.1\r\nHost: localhost\r\n');
  await Promise.race([
    closeSiteServer(server),
    new Promise((_, reject) => {
      const timeout = setTimeout(() => reject(new Error('preview shutdown hung')), 1_000);
      timeout.unref();
    }),
  ]);
  assert.equal(server.listening, false);
});
