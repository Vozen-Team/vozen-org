import assert from 'node:assert/strict';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { parseExpressionAt } from 'acorn';
import { LEVEL_SETTING_KEYS, levelSettingCopy } from '../apps/helper-panel/src/levels-settings.ts';
import { ticketSettingsGroups, ticketSettingCopy } from '../apps/helper-panel/src/ticket-settings.ts';

const directory=new URL('../apps/helper-panel/src/',import.meta.url);
const read=async name=>JSON.parse(await readFile(new URL(`${name}.json`,directory),'utf8'));
globalThis.window={};
await import('../site/js/i18n-v41.js');
await import('../site/js/i18n-v42.js');
const dictionary=window.VOZEN_I18N;
const locales=['pt','fr','es','de','tr','ar','zh','ru','ko'];
const aliases={...await read('helper-schema-aliases'),...await read('helper-app-aliases')};
const copy={};
for(const name of ['helper-app-pt-fr-es','helper-app-de-tr','helper-app-ar-zh','helper-app-ru-ko','helper-components-copy','helper-schema-copy','helper-dependency-copy','helper-presentation-copy','helper-shared-copy']) {
  for(const [source,values] of Object.entries(await read(name)))copy[source]={...copy[source],...values};
}
const placeholders=text=>[...text.matchAll(/\{\w+\}/g)].map(match=>match[0]).sort();
for(const [source,values] of Object.entries(copy))for(const [locale,text] of Object.entries(values)) {
  assert.ok(text&&typeof text==='string',`${source}: empty ${locale}`);
  assert.deepEqual(placeholders(text),placeholders(source),`${source}: placeholders in ${locale}`);
}
const sources=new Set(Object.values(aliases));
for(const name of ['helper-app-source','helper-components-source','helper-schema-source'])for(const source of await read(name))sources.add(aliases[source]??source);
for(const key of LEVEL_SETTING_KEYS)for(const value of Object.values(levelSettingCopy(key,'en')))if(value)sources.add(value);
for(const group of ticketSettingsGroups('en')) {
  sources.add(group.title);sources.add(group.description);
  for(const key of group.keys)for(const [name,value] of Object.entries(ticketSettingCopy({key,label:key},'en'))) {
    if(['label','help','emptyLabel'].includes(name)&&value&&value!==key)sources.add(value);
  }
}
// Include fixed call sites so new interface copy cannot silently ship in English.
for(const name of await readdir(directory)) {
  if(!/\.tsx?$/.test(name)||/\.test\./.test(name))continue;
  const code=await readFile(new URL(name,directory),'utf8');
  for(const match of code.matchAll(/\bhelperText\(\s*(?=['"])/g)) {
    const literal=parseExpressionAt(code,match.index+match[0].length,{ecmaVersion:'latest'});
    if(literal.type==='Literal'&&typeof literal.value==='string')sources.add(aliases[literal.value]??literal.value);
  }
}
const keysBySource=new Map();
for(const [key,source] of Object.entries(dictionary.en))keysBySource.set(source,[...keysBySource.get(source)??[],key]);
const gaps=[];
for(const source of sources)for(const locale of locales) {
  if(copy[source]?.[locale])continue;
  if((keysBySource.get(source)??[]).some(key=>dictionary[locale]?.[key]))continue;
  gaps.push({source,locale});
}
if(gaps.length) {
  await mkdir('output',{recursive:true});
  await writeFile('output/helper-locale-gaps.json',JSON.stringify([...new Set(gaps.map(gap=>gap.source))],null,2));
}
assert.equal(gaps.length,0,`Missing Helper translations: ${[...new Set(gaps.map(gap=>gap.source))].join(' | ')}`);
console.log(`Helper locale coverage: ${sources.size} sources across ${locales.length+1} languages; no missing translations or placeholder mismatches.`);
