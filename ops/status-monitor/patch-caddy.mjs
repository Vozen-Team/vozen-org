import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export function insertHistoryRoute(input, historyRoute, routeId = 'vozen_status_history') {
  if (!['vozen_status_history', 'vozen_public_stats'].includes(routeId)) throw new Error('Unsupported public route');
  const endpoint = routeId === 'vozen_public_stats' ? '/api/public/stats' : '/api/public/status/history';
  if (!historyRoute.match?.some(match => match.path?.includes(endpoint))) throw new Error('Public route path mismatch');
  const config = structuredClone(input), candidates = [];
  for (const server of Object.values(config.apps?.http?.servers || {})) {
    for (const host of server.routes || []) {
      if (!host.match?.some(match => match.host?.includes('api.vozen.org') && !match.path)) continue;
      function find(value) {
        if (!value || typeof value !== 'object') return;
        if (Array.isArray(value.routes)) {
          value.routes.forEach((route,index) => {
            if (route['@id'] === routeId) throw new Error('Public route already installed');
            if (route.handle?.some(handle=>handle.handler==='reverse_proxy' && handle.upstreams?.some(upstream=>upstream.dial==='localhost:3001'))) candidates.push({routes:value.routes,index});
          });
        }
        for (const child of Object.values(value)) if (child && typeof child==='object') find(child);
      }
      find(host);
    }
  }
  if (candidates.length!==1) throw new Error('Expected exactly one existing API proxy route');
  const addition = structuredClone(historyRoute);
  delete addition.group;
  addition['@id'] = routeId;
  candidates[0].routes.splice(candidates[0].index,0,addition);
  return config;
}

if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const [live,snippet,output,endpoint = '/api/public/status/history',routeId = 'vozen_status_history'] = process.argv.slice(2);
  if (!['/api/public/status/history','/api/public/stats'].includes(endpoint)) throw new Error('Unsupported public endpoint');
  if (!live || !snippet || !output) throw new Error('Usage: patch-caddy.mjs LIVE_JSON ROUTE_CADDY OUTPUT_JSON');
  const source = fs.readFileSync(live);
  const adapted = JSON.parse(execFileSync('/usr/bin/caddy',['adapt','--config',snippet,'--adapter','caddyfile'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}));
  let historyRoute;
  function find(value) {
    if (!value || typeof value!=='object') return;
    if (value.match?.some(match=>match.path?.includes(endpoint))) historyRoute=value;
    for(const child of Object.values(value)) if(child && typeof child==='object') find(child);
  }
  find(adapted);
  if (!historyRoute) throw new Error('History route missing from snippet');
  const candidate = insertHistoryRoute(JSON.parse(source),historyRoute,routeId);
  fs.writeFileSync(output+'.before',source,{mode:0o600,flag:'wx'});
  fs.writeFileSync(output,JSON.stringify(candidate),{mode:0o600,flag:'wx'});
  console.log(JSON.stringify({sourceSha256:createHash('sha256').update(source).digest('hex'),candidateSha256:createHash('sha256').update(JSON.stringify(candidate)).digest('hex'),route:endpoint}));
}
