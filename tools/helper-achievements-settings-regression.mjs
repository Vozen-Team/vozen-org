import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch();
const base=process.env.HELPER_TEST_URL||'http://127.0.0.1:5179/panel/helper-tracker/';
const guild='1524199248248176751';
const config={firstThreshold:234,regularThreshold:1234,pillarThreshold:12345,firstRewardRole:'111111111111111111',regularRewardRole:'222222222222222222',pillarRewardRole:'333333333333333333'};
try {
  for(const locale of ['en','pt','fr','es','de','tr','ar','zh','ru','ko','pt-mobile','ar-mobile']) {
    const lang=locale.split('-')[0];
    const page=await browser.newPage({viewport:{width:locale.includes('mobile')?390:1440,height:1000}});
    await page.addInitScript(lang=>localStorage.setItem('vozen.lang',lang),lang);
    let enabled=true,revision=1;const writes=[];
    await page.route('**/api/**',async route=>{
      const path=new URL(route.request().url()).pathname.replace(/^.*?(?=\/api\/)/,'');
      let value={};
      const feature={key:'community.achievements',label:'Achievements',category:'community',available:true,enabled};
      if(path==='/api/me') value={id:'qa-owner',guildId:guild,dbOk:true};
      else if(path==='/api/guilds') value={guilds:[{id:guild,name:'Test community',canManage:true}]};
      else if(path==='/api/guild-context') value={guildId:guild,name:'Test community',permissions:'8',bot:{available:true,permissions:'8'},channels:[],roles:Object.values(config).filter(value=>typeof value==='string').map(id=>({id,name:'Saved role',manageable:true})),hierarchy:{known:true},capabilities:{channelSelectors:true,roleSelectors:true,permissionPreflight:true}};
      else if(path==='/api/config/features') value={guildId:guild,features:[feature]};
      else if(path.endsWith('/preflight')) value={guildId:guild,ok:true,issues:[]};
      else if(path==='/api/config/features/community.achievements') {
        if(route.request().method()==='PUT') {
          const body=route.request().postDataJSON();writes.push(body);
          assert.deepEqual(body.config,config,'hiding legacy fields must preserve their saved values');
          assert.equal(body.expected_revision,revision);enabled=body.enabled;revision++;
        }
        value={...feature,enabled,guildId:guild,revision,config,defaults:{},schema:{sections:[{title:'XP milestones',fields:Object.keys(config).map(key=>({key,label:key,kind:key.endsWith('Role')?'role':'number'}))}]}};
      } else if(path==='/api/quotas') value={plan:'Free',limits:{},usage:{}};
      else if(path==='/api/stats') value={guildId:guild,totalCases:0};
      else {await route.fulfill({status:503,json:{}});return;}
      await route.fulfill({json:value});
    });
    await page.goto(base+'#/config/community.achievements');
    const panel=page.locator('.achievement-settings');await panel.waitFor();
    assert.equal(await panel.locator('article').count(),7);
    assert.equal(await panel.getByRole('heading',{level:2}).count(),7,'collection headings follow the page heading');
    assert.equal(await page.locator('.config-section').count(),0);
    assert.equal(await page.getByRole('spinbutton').count(),0);
    assert.equal(await page.locator('.detail-aside').count(),0);
    assert.equal(await panel.locator('.achievement-medal').count(),7);
    assert.equal(await panel.locator('a').getAttribute('href'),`#/achievements/${guild}?lang=${lang}`);
    assert.equal(writes.length,0,'viewing the collection must not save defaults');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(['en','pt','pt-mobile','ar-mobile'].includes(locale)) {await mkdir('output/playwright',{recursive:true});await page.screenshot({path:`output/playwright/achievements-settings-${locale}.png`,fullPage:true});}
    await Promise.all([page.waitForResponse(response=>response.request().method()==='PUT'),page.locator('.detail-intro input[type=checkbox]').uncheck()]);
    await page.locator('.header-state').filter({hasText:/Saved automatically|Guardado automaticamente/}).waitFor();
    assert.equal(writes.length,1);assert.equal(enabled,false);
    assert.equal(await panel.locator('article').count(),7,'the catalog remains visible while disabled');
    assert.equal(await panel.locator('a').count(),0,'disabled public collection is not linked');
    await page.reload();await panel.waitFor();
    assert.equal(await page.locator('.detail-intro input[type=checkbox]').isChecked(),false);
    assert.equal(writes.length,1,'reload must not rewrite saved configuration');
    console.log(`PASS achievements-settings ${locale}`);await page.close();
  }
} finally {await browser.close();}
