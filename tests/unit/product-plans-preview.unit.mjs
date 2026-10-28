import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import * as parse5 from 'parse5';
import vm from 'node:vm';
import {createHash} from 'node:crypto';

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

test('the TTS FAQ is concise, consistent across locales and uses registered commands',()=>{
  const registered = new Set(JSON.parse(readFileSync('tests/fixtures/command-registration.json','utf8')).tts.commands.map(command=>command.name));
  for (const locale of ['en','pt','fr','es','de','tr','ar','zh','ru','ko']) {
    const {faq} = JSON.parse(readFileSync(`tools/i18n-marketing-src/${locale}.json`,'utf8'));
    assert.equal(faq.length,6,locale);
    assert.equal(new Set(faq.map(([question])=>question)).size,6,locale);
    assert.doesNotMatch(JSON.stringify(faq),/Google HD|€\d/,locale);
    for (const [question,answer] of faq) {
      assert.ok(question.trim() && answer.trim(),locale);
      for (const [,command] of answer.matchAll(/\/([a-z][a-z-]*)/g)) assert.ok(registered.has(command),command);
    }
  }
  const html=readFileSync('site/tts/index.html','utf8');
  const schema=[...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match=>JSON.parse(match[1])).find(data=>data['@type']==='FAQPage');
  const english=JSON.parse(readFileSync('tools/i18n-marketing-src/en.json','utf8'));
  assert.deepEqual(schema.mainEntity.map(entry=>[entry.name,entry.acceptedAnswer.text]),english.faq);
});

test('a refreshed FAQ bundle removes obsolete cached questions',()=>{
  const context={window:{VOZEN_FAQ:Array.from({length:8},()=>[{en:'Old question'},{en:'Old answer'}])}};
  vm.runInNewContext(readFileSync('site/js/i18n-public/en.js','utf8'),context);
  assert.equal(context.window.VOZEN_FAQ.length,6);
  assert.equal(context.window.VOZEN_FAQ[1][0].en,'How do I start using Vozen?');
});

test('locale cache versions match the shipped translation bundles',()=>{
  const loader=readFileSync('site/js/i18n-public-loader-v1.js','utf8');
  const versions=JSON.parse(loader.match(/var bundleVersions = (\{[^\r\n]*\});/)[1]);
  assert.equal(Object.keys(versions).length,10);
  for (const [locale,version] of Object.entries(versions)) {
    assert.equal(version,createHash('sha256').update(readFileSync(`site/js/i18n-public/${locale}.js`,'utf8').replace(/\r\n?/g,'\n')).digest('hex').slice(0,12));
  }
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
    window:{addEventListener() {}},document:{documentElement:{dataset:{}},querySelectorAll:selector=>selector==='.plan-preview [role="group"]'?[{querySelectorAll:()=>buttons}]:[]},
  });
  assert.deepEqual(states,[['aria-pressed','true'],['aria-pressed','false']]);
  selected=1;handlers[1]();
  assert.deepEqual(states,[['aria-pressed','false'],['aria-pressed','true']]);
  await new Promise(resolve=>setImmediate(resolve));
});
