import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import * as parse5 from 'parse5';
import vm from 'node:vm';

test('local pricing previews preserve prices, full comparisons and paused checkout destinations',()=>{
  for(const product of ['tts','helper']) {
    const html=readFileSync('site/'+product+'/index.html','utf8');
    const nodes=[];
    const visit=node=>{nodes.push(node);for(const child of node.childNodes||[])visit(child);};
    visit(parse5.parse(html));
    const attrs=node=>Object.fromEntries((node.attrs||[]).map(a=>[a.name,a.value]));
    const section=nodes.find(node=>attrs(node).class?.split(' ').includes('plan-preview'));
    assert.ok(section);
    const markup=parse5.serialize(section);
    for(const price of ['€0','€3.99','€37.99','€6.99','€14.99','€66.99','€133.99'])assert.ok(markup.includes(price),product+price);
    assert.match(markup,/Two bots\. One subscription\./);
    assert.match(markup,/TTS \+ Helper Premium for everyone in your selected servers\./);
    const highlights=nodes.filter(node=>attrs(node).class?.split(' ').includes('price-card__highlights'));
    const listCounts=highlights.map(node=>(node.childNodes||[]).filter(child=>child.tagName==='li').length);
    assert.deepEqual(product==='tts'?listCounts:listCounts.filter((_,i)=>i!==1),product==='tts'?[5,7,8]:[4,8]);
    assert.match(markup,/href="\/premium#plans"/);
    assert.doesNotMatch(markup,/class="plan-scene |Google HD|price\.m\.22/);
    assert.doesNotMatch(markup,/data-billing-plan|data-buy|Most popular|−20%|-20%/);
    if(product==='tts')assert.match(markup,/<details class="plan-full-comparison">/);
    else assert.match(html,/<details class="helper-comparison-disclosure">/);
  }
  assert.match(readFileSync('site/js/main-v51.js','utf8'),/const PAYMENTS_ENABLED = false;/);
  const english=JSON.parse(readFileSync('tools/i18n-marketing-src/en.json','utf8'));
  assert.doesNotMatch(JSON.stringify(english.faq),/Google HD/);
  assert.doesNotMatch(readFileSync('site/premium.html','utf8'),/data-i18n="price\.m\.22"/);
});

test('rejected pricing illustrations leave no unused motion or Helper dependency',()=>{
  const css=readFileSync('site/css/product-preview-v1.css','utf8');
  const animations=css.match(/animation: plan-[^;]+/g)||[];
  assert.equal(animations.length,0);
  assert.doesNotMatch(readFileSync('site/helper/index.html','utf8'),/src="js\/tts-features-preview-v1\.js"/);
});

test('plan selection exposes the same pressed state as the existing controls',async()=>{
  let selected=0;const handlers=[];const states=[];
  const buttons=[0,1].map(index=>({classList:{contains:()=>selected===index},setAttribute:(key,value)=>states[index]=[key,value],addEventListener:(_,handler)=>handlers[index]=handler}));
  vm.runInNewContext(readFileSync('site/js/product-preview-v1.js','utf8'),{
    window:{},document:{documentElement:{dataset:{}},querySelectorAll:selector=>selector==='.plan-preview [role="group"]'?[{querySelectorAll:()=>buttons}]:[]},
  });
  assert.deepEqual(states,[['aria-pressed','true'],['aria-pressed','false']]);
  selected=1;handlers[1]();
  assert.deepEqual(states,[['aria-pressed','false'],['aria-pressed','true']]);
  await new Promise(resolve=>setImmediate(resolve));
});
