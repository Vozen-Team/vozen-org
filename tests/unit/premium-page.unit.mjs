import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {parse,serialize} from 'parse5';

test('Premium uses one price row, correct product scopes and paused payments',()=>{
  const html=readFileSync('site/premium.html','utf8');
  const nodes=[];
  const visit=node=>{nodes.push(node);for(const child of node.childNodes||[])visit(child);};
  visit(parse(html));
  const attrs=node=>Object.fromEntries((node.attrs||[]).map(({name,value})=>[name,value]));
  const hasClass=(node,name)=>attrs(node).class?.split(' ').includes(name);
  const cards=nodes.filter(node=>hasClass(node,'price-card'));
  assert.equal(cards.length,3);
  for(const card of cards){
    const row=card.childNodes.find(node=>hasClass(node,'premium-price-row'));
    assert.ok(row);
    assert.ok(row.childNodes.some(node=>hasClass(node,'price-card__price')));
    if(hasClass(card,'price-card--pro'))assert.ok(row.childNodes.some(node=>hasClass(node,'seat-toggle')));
  }
  assert.match(serialize(cards[1]),/TTS \+ Music\./);
  assert.match(serialize(cards[2]),/Premium for every member of your servers\./);
  for(const price of ['€1.99','€18.99','€7.99','€15.99','€37.99','€70.99'])assert.ok(html.includes(price));
  const products=nodes.find(node=>hasClass(node,'premium-products'));
  for(const name of ['Vozen TTS','Vozen Music','Vozen Helper'])assert.ok(serialize(products).includes(name));
  const comparison=nodes.find(node=>hasClass(node,'premium-comparison'));
  assert.equal(comparison.tagName,'details');
  assert.ok(!('open' in attrs(comparison)));
  for(const name of ['Vozen TTS','Vozen Music','Vozen Helper'])assert.ok(serialize(comparison).includes(name));
  const rows=nodes.filter(node=>hasClass(node,'premium-comparison__group'));
  assert.equal(rows.length,3);
  assert.ok(rows.every(row=>row.parentNode.tagName==='tbody'&&attrs(row.childNodes[0]).scope==='rowgroup'));
  const checks=nodes.filter(node=>hasClass(node,'premium-comparison__check'));
  assert.ok(checks.length>10);
  assert.ok(checks.every(check=>attrs(check)['aria-hidden']==='true'&&serialize(check.parentNode).includes('class="sr-only">Included')));
  const matrix=new Map(rows.flatMap(group=>group.parentNode.childNodes.filter(row=>row.tagName==='tr'&&row!==group).map(row=>{
    const [feature,...plans]=row.childNodes.filter(node=>node.tagName);
    return [serialize(feature),plans.map(plan=>hasClass(plan,'premium-comparison__empty')?'—':plan.childNodes.some(cell=>hasClass(cell,'premium-comparison__check'))?'✓':serialize(plan))];
  })));
  assert.deepEqual(matrix.get('Voice effects'),['Robot &amp; Echo','All 8','All 8']);
  assert.deepEqual(matrix.get('Wordle, Word Chain &amp; Chess'),['—','✓','✓']);
  assert.deepEqual(matrix.get('No daily cap on station changes'),['—','✓','✓']);
  assert.deepEqual(matrix.get('Live voice transcription'),['—','—','✓']);
  assert.deepEqual(matrix.get('Fixed voice channel'),['—','—','✓']);
  assert.deepEqual(matrix.get('Automated workflows'),['3','3','25']);
  assert.deepEqual(matrix.get('Ticket transcript history'),['Standard','Standard','Extended']);
  const checkout=nodes.filter(node=>hasClass(node,'premium-unavailable'));
  assert.equal(checkout.length,2);
  for(const button of checkout)assert.ok('disabled' in attrs(button));
  assert.doesNotMatch(html,/data-billing-plan|data-buy|Google HD|Most popular/);
  assert.match(readFileSync('site/js/main-v51.js','utf8'),/const PAYMENTS_ENABLED = false;/);
});
