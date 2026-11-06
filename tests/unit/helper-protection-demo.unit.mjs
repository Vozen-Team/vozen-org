import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

for(const reduced of [false,true])test(`Helper protection demo is local, repeatable and respects reduced motion: ${reduced}`,()=>{
  const events={},timers=[],label={dataset:{},textContent:''},status={textContent:''},count={textContent:''};
  const button={disabled:false,querySelector:()=>label,addEventListener:(_,handler)=>events.click=handler};
  const demo={dataset:{state:'ready'},querySelector:selector=>selector==='button'?button:selector==='.helper-protection-demo__count'?count:status,querySelectorAll:()=>Array(5)};
  const document={documentElement:{dataset:{vozenLocale:'pt'},lang:'pt-PT'},querySelectorAll:()=>[demo]};
  const window={VOZEN_I18N:{pt:{'helper.landing.demoBlocked':'Spam bloqueado'}},matchMedia:()=>({matches:reduced}),setTimeout:(fn,ms)=>timers.push([fn,ms]),addEventListener:(event,fn)=>events[event]=fn};
  vm.runInNewContext(readFileSync('site/js/helper-protection-demo-v1.js','utf8'),{document,window});
  assert.equal(label.textContent,'Send spam');
  events.click();
  assert.equal(demo.dataset.state,'passing-first');
  assert.equal(button.disabled,true);
  events.click();
  assert.equal(timers.length,3);
  assert.deepEqual(timers.map(([,ms])=>ms),reduced?[450,900,1300]:[700,1350,2760]);
  for(const [i,state] of ['passing-second','sending','blocked'].entries()){
    timers[i][0]();
    assert.equal(demo.dataset.state,state);
    assert.equal(count.textContent,state==='blocked'?5:0);
  }
  assert.equal(status.textContent,'Spam bloqueado: 5');
  assert.equal(button.disabled,false);
  assert.equal(label.textContent,'Send again');
  events.click();assert.equal(demo.dataset.state,'passing-first');
  assert.equal(count.textContent,0);
});

test('all marketing locales have protection demo copy and routes retain the component',()=>{
  for(const locale of ['en','pt','fr','es','de','tr','ar','zh','ru','ko']){
    const {messages}=JSON.parse(readFileSync(`tools/i18n-marketing-src/${locale}.json`,'utf8'));
    for(const key of ['demoTitle','demoPrompt','demoTag','demoMessage1','demoMessage2','demoBlocked','demoSend','demoSending','demoAgain','demoChecking'])assert.ok(messages[`helper.landing.${key}`],`${locale}:${key}`);
  }
  for(const route of ['helper/index.html','helper.html','pt/helper/index.html']){
    const html=readFileSync(`site/${route}`,'utf8');
    assert.equal((html.match(/\bdata-protection-demo(?:=|\s|>)/g)||[]).length,1,route);
    assert.match(html,/helper-protection-demo-v1\.css/);
    assert.match(html,/helper-protection-demo-v1\.js/);
    assert.equal((html.match(/class="helper-protection-demo__cannon"/g)||[]).length,1,route);
    assert.equal((html.match(/data-packet="SPAM"/g)||[]).length,5,route);
  }
});
