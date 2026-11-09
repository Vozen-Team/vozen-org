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
      const url=new URL(route.request().url());
      const path=url.pathname.replace(/^.*?(?=\/api\/)/,'');
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
      else if(path==='/api/activity/feed' && mode!=='empty') {
        const kinds=url.searchParams.get('limit')==='10' && guild==='a'
          ? ['member_join','helper_message','helper_command','member_leave'] : [];
        value={guildId:guild,nextCursor:null,events:kinds.map((kind,index)=>({
          id:`activity:${index+1}`,source:'activity',kind,user_id:'123',detail:'{}',outcome:'recorded',created_at:10,helper:kind.startsWith('helper_'),
        }))};
      }
      else if(path==='/api/cases') {caseReads++;value={cases:[]};}
      else if(path==='/api/quotas') value={plan:'Premium',limits:{workflows:25,templates:100,role_panels:10},usage:{workflows:4,templates:2,role_panels:1}};
      else {await route.fulfill({status:503,json:{}});return;}
      await route.fulfill({json:value});
    });
    await page.goto(base+'#/');
    const overview=page.locator('.vozen-overview');
    await overview.waitFor();
    assert.equal(await overview.locator('h1').count(),1);
    assert.equal(await overview.locator('h2').count(),2);
    assert.deepEqual(await overview.locator('dd').allTextContents(),['1','9','Premium']);
    assert.equal(await overview.locator('.vozen-overview__row').count(),4);
    assert.equal(await overview.locator('.vozen-overview__state.is-on').count(),1);
    assert.equal(await overview.locator('.vozen-overview__row:disabled').count(),1);
    assert.equal(await overview.locator('.quota-item, .vozen-overview__snapshot img[src="/assets/helper-og-v1.jpg"]').count(),0);
    assert.equal(await overview.locator('.vozen-overview__snapshot button').count(),1);
    assert.equal(await overview.locator('.vozen-overview__snapshot + .vozen-overview__activity').count(),1);
    const activityNumbers=overview.locator('.vozen-overview__activity-stats b');
    await activityNumbers.first().getByText('4',{exact:true}).waitFor();
    assert.deepEqual(await activityNumbers.allTextContents(),['4','2']);
    assert.match(await overview.locator('.vozen-overview__profile').innerText(),/Vozen Helper/);
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
      const featuresTab=page.locator('[data-helper-view="features"]');
      await featuresTab.hover();
      await page.waitForFunction(tab=>getComputedStyle(tab,'::after').opacity==='1'
        && getComputedStyle(tab.querySelector('svg')).transform!=='none',await featuresTab.elementHandle());
      await page.emulateMedia({reducedMotion:'reduce'});
      assert.equal(await featuresTab.locator('svg').evaluate(icon=>getComputedStyle(icon).transform),'none');
      await page.emulateMedia({reducedMotion:'no-preference'});
      await featuresTab.click();
      await page.waitForURL(url=>url.pathname==='/panel/features/');
      assert.equal(await featuresTab.getAttribute('aria-current'),'page');
      await page.goto(base+'#/');await overview.waitFor();
      for(const [control,path] of [
        ['.vozen-overview__row:nth-of-type(1)','/panel/antispam/'],
        ['.vozen-overview__row:nth-of-type(2)','/panel/welcome/'],
        ['.vozen-overview__row:nth-of-type(4)','/panel/rank/'],
        ['.vozen-overview__features','/panel/features/'],
        ['.vozen-overview__activity','/panel/activity/'],
      ]) {
        await overview.locator(control).click();
        await page.waitForURL(url=>url.pathname===path&&!url.hash);
        await page.goto(base+'#/');await overview.waitFor();
      }
      await page.locator('select[aria-label="Current server"]').selectOption('b');
      await overview.locator('.vozen-overview__server-name').filter({hasText:'Beta'}).waitFor();
      await activityNumbers.first().getByText('0',{exact:true}).waitFor();
      assert.deepEqual(await activityNumbers.allTextContents(),['0','0']);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'long guild name wraps');
      mode='empty';await page.reload();await overview.waitFor();
      await overview.getByText('Could not load activity.',{exact:true}).waitFor();
      assert.deepEqual(await activityNumbers.allTextContents(),['—','—']);
      assert.equal(await overview.locator('.vozen-overview__row:disabled').count(),3);
      assert.equal(await overview.locator('dd').first().innerText(),'0');
      assert.match(await overview.locator('.vozen-overview__profile').innerText(),/Vozen Helper/);
      await page.keyboard.press('Tab');
      assert.ok(await page.locator(':focus-visible').count(),'keyboard focus remains visible');
    }
    if(locale==='pt-mobile') {
      await page.locator('.settings-sections-button').click();
      const activityTab=page.locator('[data-helper-view="activity"]');
      await activityTab.locator('svg').waitFor();
      await activityTab.click();
      await page.waitForURL(url=>url.pathname==='/panel/activity/');
      assert.equal(await activityTab.getAttribute('aria-current'),'page');
    }
    assert.equal(writes,0,'overview navigation never changes settings');
    console.log(`PASS overview ${locale}`);await page.close();
  }
} finally {await browser.close();}
