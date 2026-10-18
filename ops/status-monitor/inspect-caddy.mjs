import fs from 'node:fs';
const config = JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
function walk(value, at='', inside=false) {
  if (!value || typeof value !== 'object') return;
  const target = inside || value.match?.some(match=>match.host?.includes('api.vozen.org'));
  if (target && (value.handle || value.handler)) console.log(JSON.stringify({at, match:value.match?.map(match=>({host:match.host,path:match.path,method:match.method})),handler:value.handler,handlers:value.handle?.map(handle=>handle.handler),upstreams:value.upstreams?.map(upstream=>upstream.dial),status:value.status_code}));
  for(const [key,child] of Object.entries(value)) if(child && typeof child==='object') walk(child,at+'/'+key,target);
}
walk(config);
