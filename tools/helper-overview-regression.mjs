const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch();
const base=process.env.HELPER_TEST_URL||'http://127.0.0.1:5179/panel/helper-tracker/';
try {
  for(const locale of ['en','pt','fr','es','de','tr','ar','zh','ru','ko','pt-mobile','ar-mobile']) {
    const language=locale.split('-')[0];
    const page=await browser.newPage({viewport:{width:locale.includes('mobile')?390:1440,height:900}});
    await page.addInitScript(lang=>localStorage.setItem('vozen.lang',lang),language);
    let writes=0,caseReads=0,mode='normal',guild='a';
    const features=[{key:'protection.antispam',label:'Anti-spam',category:'protection',enabled:true,available:true},{key:'support.welcome',label:'Welcome',category:'management',enabled:false,available:true},{key:'community.levels',label:'Levels & XP',category:'community',enabled:false,available:false}];
    await page.route('**/api/**',async route=>{
      const path=new URL(route.request().url()).pathname.replace(/^.*?(?=\/api\/)/,'');
      let value={};
      if(route.request().method()!=='GET'&&path!=='/api/session/switch') writes++;
      if(path==='/api/me') value={id:'qa-owner',guildId:guild,dbOk:true};
      else if(path==='/api/guilds') value={guilds:[{id:'a',name:'Alpha community',canManage:true},{id:'b',name:'Beta '+('long name '.repeat(12)),canManage:true}]};
      else if(path==='/api/session/switch') {guild=route.request().postDataJSON().guild_id;value={ok:true,guildId:guild};}
      else if(path==='/api/guild-context') value={guildId:guild,name:'Alpha community',permissions:'8',channels:[],roles:[],hierarchy:{known:true},capabilities:{channelSelectors:true,roleSelectors:true,permissionPreflight:true}};
      else if(path==='/api/config/features') value={guildId:guild,features:mode==='empty'?[]:features};
      else if(path==='/api/quick-setup') value={guildId:guild,status:'completed',currentStep:'welcome',revision:1,steps:[],createdResources:[]};
      else if(path.startsWith('/api/config/features/')) value={...features.find(feature=>path.endsWith(feature.key)),guildId:guild,config:{},defaults:{},revision:1,schema:{sections:[]}};
      else if(path==='/api/stats') value={guildId:guild,totalCases:9};
      else if(path==='/api/cases') {caseReads++;value={cases:[]};}
      else if(path==='/api/quotas') value={plan:'Premium',limits:{workflows:25,templates:100,role_panels:10},usage:{workflows:4,templates:2,role_panels:1}};
      else {await route.fulfill({status:503,json:{}});return;}
      await route.fulfill({json:value});
    });
    await page.goto(base+'#/');
    const overview=page.locator('.vozen-overview');
    await overview.waitFor();
    assert.equal(await overview.locator('h1').count(),1);
    assert.equal(await overview.locator('h2').count(),3);
    assert.deepEqual(await overview.locator('dd').allTextContents(),['1','9','Premium']);
    assert.equal(await overview.locator('.vozen-overview__row').count(),6);
    assert.equal(await overview.locator('.vozen-overview__state.is-on').count(),1);
    assert.equal(await overview.locator('.vozen-overview__row:disabled').count(),1);
    assert.equal(await overview.locator('.quota-item').count(),3);
    assert.equal(await overview.locator('.metrics,.helper-overview__snapshot,.quick-grid').count(),0);
    assert.equal(caseReads,0,'overview must not count a truncated case list as recent events');
    assert.ok((await overview.innerText()).length<650,'brief overview copy');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
    assert.equal(await page.locator('html').getAttribute('dir'),language==='ar'?'rtl':'ltr');
    const stateLabels=await overview.locator('.vozen-overview__state').allTextContents();
    assert.equal(new Set(stateLabels).size,3);
    if(language!=='en') assert.ok(stateLabels.every(label=>!['On','Off','Unavailable'].includes(label)),'translated states');
    if(['en','pt','pt-mobile','ar-mobile'].includes(locale)) {
      await mkdir('output/playwright',{recursive:true});
      await page.evaluate(()=>window.scrollTo(0,0));
      await page.screenshot({path:`output/playwright/overview-${locale}.png`,fullPage:true});
    }
    if(locale==='en') {
      for(const [index,path] of [[0,'/panel/antispam/'],[1,'/panel/welcome/'],[3,'/panel/features/'],[4,'/panel/activity/'],[5,'/panel/rank/']]) {
        await overview.locator('.vozen-overview__row').nth(index).click();
        await page.waitForURL(url=>url.pathname===path&&!url.hash);
        await page.goto(base+'#/');await overview.waitFor();
      }
      await overview.locator('header button').click();await page.waitForURL(url=>url.pathname==='/panel/setup/'&&!url.hash);
      await page.goto(base+'#/');await overview.waitFor();
      await page.locator('select[aria-label="Current server"]').selectOption('b');
      await overview.locator('header p').filter({hasText:'Beta'}).waitFor();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'long guild name wraps');
      mode='empty';await page.reload();await overview.waitFor();
      assert.equal(await overview.locator('.vozen-overview__row:disabled').count(),3);
      assert.equal(await overview.locator('dd').first().innerText(),'0');
      await page.keyboard.press('Tab');
      assert.ok(await page.locator(':focus-visible').count(),'keyboard focus remains visible');
    }
    assert.equal(writes,0,'overview navigation never changes settings');
    console.log(`PASS overview ${locale}`);await page.close();
  }
} finally {await browser.close();}
