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

test('local plan links resolve the existing paused Premium page', async(t)=>{
  const {server,origin}=await createSiteServer();
  t.after(()=>closeSiteServer(server));
  const response=await fetch(origin+'/premium');
  assert.equal(response.status,200);
  const html=await response.text();
  assert.equal((html.match(/class="[^"]*premium-unavailable"[^>]* disabled/g)||[]).length,2);
  assert.doesNotMatch(html,/data-billing-plan=/);
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
