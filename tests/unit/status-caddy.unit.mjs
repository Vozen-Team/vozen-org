import { test } from 'node:test';
import assert from 'node:assert/strict';
import { insertHistoryRoute } from '../../ops/status-monitor/patch-caddy.mjs';
test('the history route is added only inside the existing API proxy, preserving guards and other hosts',()=>{
  const guard={match:[{host:['api.vozen.org']}],handle:[{handler:'subroute',routes:[{handle:[{handler:'static_response',status_code:403}]}]}]};
  const proxy={handle:[{handler:'reverse_proxy',upstreams:[{dial:'localhost:3001'}]}]};
  const input={apps:{http:{servers:{main:{routes:[guard,{match:[{host:['api.vozen.org']}],handle:[{handler:'subroute',routes:[proxy]}]},{match:[{host:['other.example']}],handle:[{handler:'static_response',status_code:200}]}]}}}}};
  const addition={match:[{path:['/api/public/status/history']}],handle:[{handler:'file_server'}],group:'not-reused'};
  const result=insertHistoryRoute(input,addition);
  const inner=result.apps.http.servers.main.routes[1].handle[0].routes;
  assert.equal(inner.length,2);
  assert.equal(inner[0]['@id'],'vozen_status_history');
  assert.equal(inner[0].group,undefined);
  inner.shift();
  assert.deepEqual(result,input);
  assert.equal(input.apps.http.servers.main.routes[1].handle[0].routes.length,1);
});
test('ambiguous or missing API proxy contracts are rejected',()=>{
  assert.throws(()=>insertHistoryRoute({},{}));
});
test('stats insertion preserves an existing history route and refuses duplicate installation',()=>{
  const history={'@id':'vozen_status_history',handle:[{handler:'file_server'}]};
  const proxy={handle:[{handler:'reverse_proxy',upstreams:[{dial:'localhost:3001'}]}]};
  const input={apps:{http:{servers:{main:{routes:[{match:[{host:['api.vozen.org']}],handle:[{handler:'subroute',routes:[history,proxy]}]}]}}}}};
  const addition={match:[{path:['/api/public/stats']}],handle:[{handler:'file_server'}]};
  const result=insertHistoryRoute(input,addition,'vozen_public_stats');
  const routes=result.apps.http.servers.main.routes[0].handle[0].routes;
  assert.deepEqual(routes[0],history);assert.equal(routes[1]['@id'],'vozen_public_stats');assert.deepEqual(routes[2],proxy);
  assert.throws(()=>insertHistoryRoute(result,addition,'vozen_public_stats'));
  assert.throws(()=>insertHistoryRoute(input,addition,'unrelated'));
});
