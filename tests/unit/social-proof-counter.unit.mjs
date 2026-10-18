import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const epoch = Date.parse('2026-10-18T12:00:00Z');
const flush = () => new Promise(resolve => setImmediate(resolve));
function fixture({reduced=false,observer=true,hidden=false}={}) {
  const source=fs.readFileSync('site/js/social-proof-counter-v1.js','utf8');
  const number={textContent:'—',dataset:{}}, readable={textContent:'—'};
  const strip={dataset:{},querySelector:selector=>selector==='[data-proof-count]'?number:readable};
  const frames=new Map(), timers=new Map(), events=new Map(), preferences=new Map(), requests=[];
  let time=0,id=0,callback;
  const preference={matches:reduced,addEventListener:(key,fn)=>preferences.set(key,fn)};
  const document={hidden,baseURI:'https://vozen.org/',querySelector:()=>strip,addEventListener:(key,fn)=>events.set(key,fn)};
  const window={matchMedia:()=>preference,requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:key=>frames.delete(key),
    setTimeout:(fn,delay)=>{timers.set(++id,{fn,at:time+delay});return id;},clearTimeout:key=>timers.delete(key),
    fetch:(url,options)=>new Promise((resolve,reject)=>{requests.push({url,options,resolve,reject});options.signal.addEventListener('abort',()=>reject(new Error('aborted')));})};
  if(observer) window.IntersectionObserver=class {constructor(fn){callback=fn;} observe(){} disconnect(){}};
  class Clock extends Date {static now(){return epoch+time;}}
  const context={window,document,performance:{now:()=>time},Date:Clock,URL,AbortController};
  const run=()=>vm.runInNewContext(source,context,{filename:fs.realpathSync('site/js/social-proof-counter-v1.js')});
  run();
  return {number,readable,strip,requests,frames,run,
    reply:async (data={product:'tts',guilds:501,observedAt:new Date(epoch+time).toISOString()},ok=true)=>{requests.at(-1).resolve({ok,json:async()=>data});await flush();},
    fail:async()=>{requests.at(-1).reject(new Error('offline'));await flush();},
    intersect:ratio=>callback?.([{target:strip,isIntersecting:ratio>0,intersectionRatio:ratio}]),
    step:now=>{time=now;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));},
    advance:async now=>{time=now;const due=[...timers].filter(([,timer])=>timer.at<=now);for(const [key,timer] of due){if(timers.delete(key))timer.fn();}await flush();},
    reduce:()=>{preference.matches=true;preferences.get('change')?.();},
    hide:value=>{document.hidden=value;events.get('visibilitychange')?.();}
  };
}

test('live value animates once on visibility over 1.6 seconds, without overshooting',async()=>{
  const f=fixture();assert.equal(f.number.textContent,'—');await f.reply();assert.equal(f.number.textContent,'501');
  f.intersect(.3);assert.equal(f.frames.size,0);f.intersect(.8);assert.equal(f.number.textContent,'0');assert.equal(f.readable.textContent,'501');
  f.step(1100);assert.ok(Number(f.number.textContent)>0 && Number(f.number.textContent)<501);
  f.step(1600);assert.equal(f.number.textContent,'501');f.intersect(1);f.run();assert.equal(f.frames.size,0);assert.equal(f.requests.length,1);
});
test('reduced motion, missing observer and changed preference keep live updates',async()=>{
  for(const options of [{reduced:true},{observer:false}]) {
    const f=fixture(options);await f.reply();f.intersect(1);assert.equal(f.number.textContent,'501');assert.equal(f.frames.size,0);
    await f.advance(15000);await f.reply({product:'tts',guilds:502,observedAt:new Date(epoch+15000).toISOString()});assert.equal(f.number.textContent,'502');
  }
  const f=fixture();await f.reply();f.intersect(1);f.step(300);f.reduce();assert.equal(f.number.textContent,'501');assert.equal(f.frames.size,0);
});
test('polls every 15 seconds, including decreases and zero, without replaying entrance',async()=>{
  const f=fixture();await f.reply();f.intersect(1);f.step(1600);
  for(const [index,count] of [502,500,0].entries()) {
    const now=(index+1)*15000;await f.advance(now);await f.reply({product:'tts',guilds:count,observedAt:new Date(epoch+now).toISOString()});
    assert.equal(f.number.textContent,String(count));assert.equal(f.readable.textContent,String(count));assert.equal(f.frames.size,0);
  }
  assert.equal(f.requests[0].url,'https://api.vozen.org/api/public/stats');
  assert.equal(f.requests[0].options.credentials,'omit');assert.equal(f.requests[0].options.redirect,'error');assert.equal(f.requests[0].options.cache,'no-store');
});
test('hidden tabs pause network polling and resume with one fresh request',async()=>{
  const f=fixture({hidden:true});assert.equal(f.requests.length,0);f.hide(false);await f.reply();f.intersect(1);f.step(300);f.hide(true);
  assert.equal(f.number.textContent,'501');assert.equal(f.frames.size,0);await f.advance(15000);assert.equal(f.requests.length,1);
  f.hide(false);f.hide(false);assert.equal(f.requests.length,2);await f.reply();await f.advance(30000);assert.equal(f.requests.length,3);
});
test('untrusted, stale or unavailable readings never become live counts',async()=>{
  for(const patch of [{guilds:'999'},{guilds:-1},{guilds:1.5},{guilds:Number.MAX_SAFE_INTEGER+1},{product:'helper'},{observedAt:'bad'},{observedAt:new Date(epoch-91000).toISOString()},{observedAt:new Date(epoch+60000).toISOString()}]) {
    const f=fixture();await f.reply({product:'tts',guilds:501,observedAt:new Date(epoch).toISOString(),...patch});assert.equal(f.number.textContent,'—');assert.equal(f.strip.dataset.proofLive,'unavailable');
  }
  const f=fixture();await f.reply({},false);assert.equal(f.number.textContent,'—');
});
test('errors preserve a recent reading only until expiry, then recovery works',async()=>{
  const f=fixture({reduced:true});await f.reply();await f.advance(15000);await f.fail();assert.equal(f.number.textContent,'501');
  await f.advance(91000);assert.equal(f.number.textContent,'—');assert.equal(f.readable.textContent,'—');await f.reply();assert.equal(f.number.textContent,'501');
});
test('stalled requests time out without overlapping and retry later',async()=>{
  const f=fixture();f.hide(false);assert.equal(f.requests.length,1);await f.advance(8000);assert.equal(f.requests[0].options.signal.aborted,true);assert.equal(f.number.textContent,'—');
  await f.advance(23000);assert.equal(f.requests.length,2);await f.reply();assert.equal(f.number.textContent,'501');
});
