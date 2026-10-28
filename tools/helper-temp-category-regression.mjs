// Isolated API fixtures only; never creates a real Discord category.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.HELPER_TEST_URL||'http://127.0.0.1:5179/panel/helper-tracker/';
const locales=['en','pt','fr','es','de','tr','ar','zh','ru','ko'];
const browser=await chromium.launch();
try{
 for(const scenario of [...locales,'mobile','no-permissions','stale-context','manage-channels-only','collision','uncertain','wrong-guild','wrong-type','save-failure','route-change','guild-switch','reused','disabled-feature','creator-partial','creator-retry','wrong-creator-type','wrong-creator-parent','wrong-creator-guild','creator-missing']){
  if(process.env.TEMP_CATEGORY_SCENARIO&&process.env.TEMP_CATEGORY_SCENARIO!==scenario)continue;
  const page=await browser.newPage(scenario==='mobile'?{viewport:{width:390,height:844}}:{});
  const locale=locales.includes(scenario)?scenario:'en';
  await page.addInitScript(locale=>localStorage.setItem('vozen.lang',locale),locale);
  let guild='10',creates=0,writes=0,revision=1;
  let saved={categoryId:'40',nameTemplate:"{user}'s room",maxActive:10};
  const feature={key:'utility.temp_channels',label:'Temporary channels',category:'utility',enabled:scenario!=='disabled-feature',available:true};
  const mutations=[];
  await page.route('**/api/**',async route=>{
   const request=route.request(),path=new URL(request.url()).pathname.replace(/^.*?(?=\/api\/)/,'');
   let value;
   if(request.method()!=='GET')mutations.push(path);
   if(path==='/api/temp-channels/category'){
    creates++;assert.equal(request.method(),'POST');
    const requestedGuild=guild;
    assert.deepEqual(request.postDataJSON(),{name:'temporary-rooms',guildId:requestedGuild});
    await new Promise(resolve=>setTimeout(resolve,['route-change','guild-switch'].includes(scenario)?1400:250));
    if(['collision','uncertain'].includes(scenario)){await route.fulfill({status:409,json:{code:'temp_category_'+(scenario==='collision'?'channel_name_exists':'creation_uncertain')}});return;}
    const partial=scenario==='creator-partial'||(scenario==='creator-retry'&&creates===1);
    value={guildId:scenario==='wrong-guild'?'99':requestedGuild,channel:{id:'50',name:'temporary-rooms',type:scenario==='wrong-type'?0:4},reused:scenario==='reused'||creates>1,
      creatorChannel:partial||scenario==='creator-missing'?null:{id:'60',name:'➕ Creator Channel',type:scenario==='wrong-creator-type'?0:2,parentId:scenario==='wrong-creator-parent'?'40':'50',guildId:scenario==='wrong-creator-guild'?'99':requestedGuild},
      ...(partial?{creatorError:'temp_creator_permissions_required'}:{})};
   }else if(path==='/api/me')value={id:'qa-user',guildId:guild,dbOk:true};
   else if(path==='/api/guilds')value={guilds:[{id:'10',name:'Alpha',canManage:true},{id:'11',name:'Beta',canManage:true}]};
   else if(path==='/api/session/switch'){guild=request.postDataJSON().guild_id;value={ok:true,guildId:guild};}
   else if(path==='/api/guild-context')value={guildId:guild,name:'Sample',permissions:'8',stale:scenario==='stale-context',channels:[{id:'40',name:'existing-voice',type:'category'}],roles:[],bot:{available:true,permissions:scenario==='no-permissions'?'2048':scenario==='manage-channels-only'?'16':'8'},hierarchy:{known:true},capabilities:{channelSelectors:true,roleSelectors:true,permissionPreflight:true}};
   else if(path==='/api/config/features')value={guildId:guild,features:[feature]};
   else if(path==='/api/config/features/utility.temp_channels'){
    if(request.method()==='PUT'){
     writes++;const body=request.postDataJSON();
     assert.equal(body.enabled,feature.enabled);assert.equal(body.config.categoryId,'50');
     assert.equal(body.config.nameTemplate,"{user}'s room");assert.equal(body.config.maxActive,10);assert.equal(body.expected_revision,revision);
     if(scenario==='save-failure'){await route.fulfill({status:503,json:{code:'temporary_failure'}});return;}
     saved=body.config;revision++;
    }
    value={...feature,guildId:guild,config:saved,defaults:{},revision,schema:{sections:[{title:'Temporary voice rooms',fields:[{key:'categoryId',label:'Category',kind:'category'},{key:'nameTemplate',label:'Room name template',help:'Use {user} for the member display name.',kind:'text'},{key:'maxActive',label:'Maximum active rooms',kind:'number',min:1,max:50}]}]}};
   }else if(path.endsWith('/preflight'))value={guildId:guild,ok:true,issues:[]};
   else if(path==='/api/quotas')value={plan:'Free',limits:{},usage:{}};
   else if(path==='/api/stats')value={guildId:guild,totalCases:0};
   else if(path==='/api/cases')value={cases:[]};
   else if(path==='/api/audit')value={events:[]};
   else if(path==='/api/activity')value={activity:[]};
   else{await route.fulfill({status:503,json:{}});return;}
   await route.fulfill({json:value});
  });
  await page.goto(`${base}#/config/utility.temp_channels`);
  const setup=page.locator('.temp-category-create'),button=setup.getByRole('button');
  await button.waitFor();
  if(scenario!=='mobile'){
   const grid=setup.locator('..').locator('..');
   const name=await grid.locator(':scope > .field input[type="text"]').boundingBox();
   const limit=await grid.locator(':scope > .field input[type="number"]').boundingBox();
   assert.ok(name&&limit&&Math.abs(name.y-limit.y)<1,'room name and room limit inputs must align');
   assert.ok(Math.abs(name.height-limit.height)<1,'aligned inputs keep the same height');
   const titles=await grid.locator(':scope > .field > span > b').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().y));
   assert.equal(titles.length,2);assert.ok(Math.abs(titles[0]-titles[1])<1,'field titles must align too');
  }
  const selected=page.locator('select').filter({has:page.locator('option[value="40"]')});
  assert.equal(await selected.inputValue(),'40');assert.equal(creates,0);
  if(locale!=='en')assert.notEqual(await button.innerText(),'Create category');
  if(['pt','mobile'].includes(scenario)){
   await setup.scrollIntoViewIfNeeded();await mkdir('output/playwright',{recursive:true});
   await page.screenshot({path:`output/playwright/temp-category-before-${scenario}.png`});
  }
  if(['no-permissions','stale-context'].includes(scenario))assert.equal(await button.isDisabled(),true);
  else{
   await setup.getByRole('textbox').fill('../bad');assert.equal(await button.isDisabled(),true);
   await setup.getByRole('textbox').fill('temporary-rooms');await button.click();
   if(['route-change','guild-switch'].includes(scenario)){
    if(scenario==='route-change')await page.evaluate(()=>{location.hash='#/features';});
    else await page.getByRole('combobox',{name:'Current server',exact:true}).selectOption('11');
    await page.waitForTimeout(1700);assert.equal(await page.locator('select option[value="50"]').count(),0);assert.equal(writes,0);
   }else if(['collision','uncertain','wrong-guild','wrong-type'].includes(scenario)){
    await setup.getByRole('alert').waitFor();assert.equal(await selected.inputValue(),'40');assert.equal(writes,0);
   }else if(['creator-partial','creator-retry','wrong-creator-type','wrong-creator-parent','wrong-creator-guild','creator-missing'].includes(scenario)){
    await setup.getByRole('alert').waitFor();assert.equal(await selected.inputValue(),'50');
    assert.equal(await setup.locator('.starboard-channel__success').count(),0);
    assert.equal(await setup.getByRole('textbox').isDisabled(),true);
    await page.waitForTimeout(1500);assert.ok(writes>0);assert.equal(saved.categoryId,'50');
    if(scenario==='creator-retry'){
     assert.equal(await button.innerText(),'Finish setup');await button.click();
     await setup.locator('.starboard-channel__success').waitFor();
     assert.equal(await setup.getByRole('alert').count(),0);assert.equal(creates,2);
     assert.equal(await selected.inputValue(),'50');assert.equal(saved.categoryId,'50');
    }
   }else{
    await setup.locator('.starboard-channel__success').waitFor();assert.equal(await selected.inputValue(),'50');
    await page.waitForTimeout(1500);assert.ok(writes>0);assert.equal(saved.categoryId,scenario==='save-failure'?'40':'50');
    assert.equal(await setup.getByRole('button').count(),0);
    if(['pt','mobile'].includes(scenario)){
     await setup.scrollIntoViewIfNeeded();await mkdir('output/playwright',{recursive:true});
     await page.screenshot({path:`output/playwright/temp-category-${scenario}.png`});
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
   }
   assert.equal(creates,scenario==='creator-retry'?2:1);
  }
  assert.ok(mutations.every(path=>['/api/temp-channels/category','/api/session/switch','/api/config/features/utility.temp_channels','/api/config/features/utility.temp_channels/preflight'].includes(path)));
  console.log(`PASS temp-category-${scenario}`);await page.close();
 }
}finally{await browser.close();}
