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
