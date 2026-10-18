import fs from 'node:fs';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
const before=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const active=JSON.parse(fs.readFileSync('/var/lib/caddy/.config/caddy/autosave.json','utf8'));
let removed=0;
function remove(value) {
  if(!value || typeof value!=='object') return;
  if(Array.isArray(value)) {
    for(let index=value.length-1;index>=0;index--) if(Array.isArray(value[index]?.match) && value[index].match.some(match=>match.path?.length===1 && match.path[0]==='/api/public/status/history')) {value.splice(index,1);removed++;}
  }
  for(const child of Object.values(value)) if(child && typeof child==='object') remove(child);
}
remove(active);
assert.equal(removed,1);
if (!isDeepStrictEqual(active,before)) throw new Error('Unrelated routing or security settings differ; inspect privately');
console.log('Persisted Caddy config preserves all previous settings plus exactly one history route.');
