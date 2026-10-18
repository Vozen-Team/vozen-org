import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import '../../site/js/status-history-model-v1.js';
import { probe, collect } from '../../tools/status-monitor.mjs';
const model = globalThis.VozenStatusHistory;
const now = Date.parse('2026-10-18T12:00:00Z');
const healthy = { tts:'operational', helper:'operational', website:'operational' };
test('90 UTC days remain unmeasured when no observations exist', () => {
  const days = model.days(model.empty(), 'tts', now);
  assert.equal(days.length,90);
  assert.equal(days[89].date,'2026-10-18');
  assert.ok(days.every(day => day.state==='unknown' && day.availability===null));
});

test('unmeasured days have a distinct green visual without claiming uptime', async () => {
  const css = await fs.readFile('site/css/status-v2.css', 'utf8');
  assert.match(css, /\.status-day\[data-state='unknown'\],[\s\S]*?\.status-history-legend \[data-state='unknown'\]::before\s*\{[^}]*background:[^}]*#[0-9a-f]+[^}]*repeating-linear-gradient/i);
  const html = await fs.readFile('site/status.html', 'utf8');
  assert.match(html, /Pale green hatching means no history/);
  for (const locale of ['en', 'pt']) {
    const catalogue = JSON.parse(await fs.readFile(`tools/i18n-marketing-src/${locale}.json`, 'utf8'));
    assert.doesNotMatch(catalogue.messages['status.historyEmpty'], /grey|cinzento/i);
    assert.equal(catalogue.messages['status.historyNoData'], locale === 'pt' ? 'Sem histórico' : 'No history');
  }
});
test('one successful check is partial coverage, not a complete green day', () => {
  const history = model.record(model.empty(),healthy,now);
  const today = model.days(history,'tts',now).at(-1);
  assert.equal(today.known,1);
  assert.equal(today.state,'partial');
  assert.equal(today.expected,721);
  assert.deepEqual(model.record(history,healthy,now+1000),history);
});
test('gaps do not become observations; midnight and retention use UTC', () => {
  let history = model.empty();
  for(let index=0;index<100;index++) history=model.record(history,healthy,now+index*86400000);
  assert.equal(history.services.tts.length,90);
  assert.equal(history.services.tts[0].operational,1);
  history=model.record(history,{...healthy,tts:'unavailable'},now+100*86400000);
  assert.equal(model.days(history,'tts',now+100*86400000).at(-1).state,'unavailable');
});
test('malformed, duplicate and impossible history is rejected', () => {
  for(const row of [{date:'2026-02-30',operational:1,degraded:0,unavailable:0,unknown:0},{date:'2026-10-18',operational:1441,degraded:0,unavailable:0,unknown:0}]) {
    const history=model.empty();history.services.tts.push(row);assert.throws(()=>model.normalize(history));
  }
  const history=model.record(model.empty(),healthy,now);history.services.tts.push(history.services.tts[0]);assert.throws(()=>model.normalize(history));
});
test('complete and partial days distinguish healthy, degraded, failed and unmeasured checks',()=>{
  const history=model.empty();
  history.services.tts.push({date:'2026-10-17',operational:1440,degraded:0,unavailable:0,unknown:0});
  assert.equal(model.days(history,'tts',now).at(-2).state,'operational');
  history.services.tts[0].operational=1439;history.services.tts[0].degraded=1;
  assert.equal(model.days(history,'tts',now).at(-2).state,'degraded');
  history.services.tts[0].degraded=0;history.services.tts[0].unknown=1;
  assert.equal(model.days(history,'tts',now).at(-2).state,'partial');
  history.services.tts[0].unknown=0;history.services.tts[0].unavailable=1;
  assert.equal(model.days(history,'tts',now).at(-2).state,'unavailable');
});
test('probes use only fixed public endpoints without credentials or redirects',async()=>{
  const requests=[];
  const observed=await probe(async(url,options)=>{requests.push({url,options});return new Response(JSON.stringify(url.includes('/rust/')?{status:'ok'}:{status:'operational',components:{bot:'operational',database:'operational',providers:'operational'}}));});
  assert.deepEqual(observed,healthy);
  assert.equal(requests.length,3);
  assert.ok(requests.every(({options})=>options.credentials==='omit' && options.redirect==='error' && !options.headers.authorization));
  assert.deepEqual(await probe(async()=>{throw Error('private failure');}),{tts:'unknown',helper:'unknown',website:'unknown'});
});
test('collection survives restart and refuses to replace corrupt persisted data',async()=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'vozen-status-test-'));
  try {
    const fetcher=async()=>new Response('{}');
    await collect(directory,{fetcher,time:now});
    await collect(directory,{fetcher,time:now+60000});
    assert.equal(JSON.parse(await fs.readFile(path.join(directory,'history.json'),'utf8')).services.tts[0].unknown,2);
    await fs.writeFile(path.join(directory,'history.json'),'invalid');
    await assert.rejects(collect(directory,{fetcher,time:now+120000}));
    assert.equal(await fs.readFile(path.join(directory,'history.json'),'utf8'),'invalid');
  } finally { await fs.rm(directory,{recursive:true,force:true}); }
});
