const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch();
const base=process.env.HELPER_TEST_URL||'http://127.0.0.1:5179/panel/helper-tracker/';
try {
  for(const locale of ['en','pt','fr','es','de','tr','ar','zh','ru','ko','pt-mobile','ar-mobile']) {
    if(process.env.QUICK_SCENARIO)continue;
    const language=locale.split('-')[0];
    const page=await browser.newPage({viewport:{width:locale.includes('mobile')?390:1440,height:900}});
    await page.addInitScript(lang=>localStorage.setItem('vozen.lang',lang),language);
    let writes=0,caseReads=0,mode='normal',guild='a';
    let profileNick='',profileWrites=0;
    const features=[{key:'protection.antispam',label:'Anti-spam',category:'protection',enabled:true,available:true},{key:'support.welcome',label:'Welcome',category:'management',enabled:false,available:true},{key:'community.levels',label:'Levels & XP',category:'community',enabled:false,available:false}];
    await page.route('**/api/**',async route=>{
      const url=new URL(route.request().url());
      const path=url.pathname.replace(/^.*?(?=\/api\/)/,'');
      let value={};
      if(route.request().method()!=='GET'&&path!=='/api/session/switch'&&!path.endsWith('/bot-profile')) writes++;
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
      else if(path===`/api/guilds/${guild}/bot-profile` && mode!=='empty') {
        if(route.request().method()==='PUT') {
          assert.deepEqual(route.request().postDataJSON(),{nick:'Helper QA'});
          profileNick='Helper QA';
          profileWrites++;
        }
        value={guildId:guild,nick:guild==='a'?profileNick:'',avatarUrl:null,bannerUrl:null,customAvatar:false,customBanner:false,canEditImages:guild==='a'};
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
      await page.waitForFunction(icon=>matchMedia('(prefers-reduced-motion: reduce)').matches
        && getComputedStyle(icon).transform==='none',await featuresTab.locator('svg').elementHandle());
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
        ['.vozen-overview__profile','/panel/bot-profile/'],
      ]) {
        await overview.locator(control).click();
        await page.waitForURL(url=>url.pathname===path&&!url.hash);
        if(path==='/panel/bot-profile/') {
          await page.locator('#helperProfileNick').waitFor();
          assert.equal(await page.locator('[data-helper-view="bot-profile"]').getAttribute('aria-current'),'page');
          assert.equal(await page.locator('.helper-bot-profile [data-image]').count(),2);
          await page.locator('#helperProfileNick').fill('Helper QA');
          await page.locator('.helper-bot-profile button[type=submit]').click();
          await page.waitForFunction(()=>document.querySelector('.helper-bot-profile button[type=submit]').disabled
            && !document.querySelector('#helperProfileNick').disabled);
          assert.equal(profileWrites,1);
        }
        await page.goto(base+'#/');await overview.waitFor();
      }
      await page.locator('select[aria-label="Current server"]').selectOption('b');
      await overview.locator('.vozen-overview__server-name').filter({hasText:'Beta'}).waitFor();
      await activityNumbers.first().getByText('0',{exact:true}).waitFor();
      assert.doesNotMatch(await overview.locator('.vozen-overview__profile').innerText(),/Helper QA/);
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
  for (const scenario of ['quick-protection','quick-protection-403','quick-defaults-error','quick-status-error','quick-roles-free','quick-roles-403','quick-channels-403']) {
    if (process.env.QUICK_SCENARIO && scenario !== process.env.QUICK_SCENARIO) continue;
    const page = await browser.newPage({viewport:{width:1440,height:900}});
    await page.addInitScript(() => localStorage.setItem('vozen.lang','en'));
    const calls = [];
    let stepRefused = false;
    let defaultsFail = scenario === 'quick-defaults-error', statusFails = scenario === 'quick-status-error';
    const currentStep = ['quick-roles-free','quick-roles-403'].includes(scenario) ? 'roles' : scenario === 'quick-channels-403' ? 'welcome' : 'protection';
    const order = ['welcome','roles','moderation','protection'];
    const steps = order.map(key => ({key,status:order.indexOf(key) < order.indexOf(currentStep) ? 'applied' : 'pending'}));
    const features = [
      {key:'protection.antispam',label:'Anti-spam',category:'protection',enabled:true,available:true},
      {key:'protection.anti_raid',label:'Anti-raid',category:'protection',enabled:true,available:true},
      {key:'management.moderation',label:'Moderation',category:'management',enabled:true,available:true},
      {key:'support.welcome',label:'Welcome',category:'management',enabled:false,available:true},
      {key:'community.role_panels',label:'Role panels',category:'community',enabled:false,available:true,premium_required:true,premium_unlocked:scenario !== 'quick-roles-free'},
    ];
    const current = {'protection.antispam':{config:{floodCount:9,ignoredChannels:['c-keep'],ignoredRoles:['r-keep'],logChannel:'old-log'},revision:5},
      'protection.anti_raid':{config:{alertChannel:'old-log',joinThreshold:30},revision:7}};
    await page.route('**/api/**',async route => {
      const request = route.request(), method = request.method();
      const path = new URL(request.url()).pathname.replace(/^.*?(?=\/api\/)/,'');
      if (method !== 'GET') calls.push({path,body:request.postDataJSON()});
      let value;
      if (path === '/api/me') value = {id:'qa-owner',guildId:'a',dbOk:true};
      else if (path === '/api/guilds') value = {guilds:[{id:'a',name:'Alpha community',canManage:true}]};
      else if (path === '/api/guild-context') value = {guildId:'a',name:'Alpha community',permissions:'8',channels:[{id:'old-log',name:'alerts',type:'text'},{id:'new-log',name:'vozen-alertas',type:'text'}],roles:[],hierarchy:{known:true},capabilities:{channelSelectors:true,roleSelectors:true,permissionPreflight:true}};
      else if (path === '/api/config/features') value = {guildId:'a',features};
      else if (path === '/api/quick-setup') {
        if (statusFails) {await route.fulfill({status:503,json:{}});return;}
        value = {guildId:'a',status:'in_progress',currentStep,revision:3,steps,createdResources:[]};
      } else if (path.startsWith('/api/quick-setup/steps/')) {
        if (scenario === 'quick-roles-403') {await route.fulfill({status:403,json:{code:'premium_required',message:'premium_required'}});return;}
        if (scenario === 'quick-channels-403' || (scenario === 'quick-protection-403' && !stepRefused)) {
          stepRefused = true;
          await route.fulfill({status:403,json:{code:'quick_setup_manage_channels_required',message:'quick_setup_manage_channels_required'}});return;
        }
        const step = path.split('/').at(-1);
        const nextSteps = steps.map(item => item.key === step ? {...item,status:'applied'} : item);
        // Only quick-protection asks the server to create #vozen-alertas; the retry in quick-protection-403 does not.
        value = {guildId:'a',status:nextSteps.some(item => item.status === 'pending') ? 'in_progress' : 'completed',currentStep:null,revision:4,steps:nextSteps,createdResources:[],
          ...(step === 'protection' ? {draft:scenario === 'quick-protection' ? {profile:'balanced',logChannel:'new-log',createChannel:true} : {profile:'balanced',logChannel:'',createChannel:false}} : {})};
      } else if (path.startsWith('/api/config/features/')) {
        const key = decodeURIComponent(path.slice('/api/config/features/'.length));
        if (method === 'PUT') {
          const body = request.postDataJSON();
          value = {guildId:'a',key,enabled:body.enabled,config:body.config,revision:(body.expected_revision ?? 0) + 1};
        } else {
          if (key === 'protection.antispam' && defaultsFail) {await route.fulfill({status:503,json:{}});return;}
          value = {guildId:'a',key,enabled:true,defaults:{},schema:{sections:[]},config:current[key]?.config ?? {},revision:current[key]?.revision ?? 1};
        }
      } else {await route.fulfill({status:503,json:{}});return;}
      await route.fulfill({json:value});
    });
    await page.goto(base + (scenario === 'quick-status-error' ? '#/' : '#/quick-setup'));
    const apply = page.getByRole('button',{name:'Confirm and apply',exact:true});
    if (scenario === 'quick-protection') {
      // Happy path: a server whose current settings load applies the profile.
      await apply.click();
      await page.getByRole('heading',{name:'You’re all set.',exact:true}).waitFor();
      // The Quick Setup state is updated before the second round of writes, so wait for its final message.
      await page.getByText('Automated protection applied.',{exact:false}).waitFor();
      assert.deepEqual(calls.map(call => call.path),['/api/config/features/protection.antispam','/api/config/features/protection.anti_raid','/api/quick-setup/steps/protection','/api/config/features/protection.antispam','/api/config/features/protection.anti_raid']);
      const [spam,raid,step,spam2,raid2] = calls.map(call => call.body);
      assert.equal(spam.expected_revision,5); assert.deepEqual(spam.config.ignoredChannels,['c-keep']); assert.deepEqual(spam.config.ignoredRoles,['r-keep']);
      assert.equal(spam.config.logChannel,'old-log'); assert.equal(spam.config.floodCount,6);
      assert.equal(raid.expected_revision,7); assert.equal(raid.config.alertChannel,'old-log');
      assert.equal(step.expected_revision,3);
      assert.equal(spam2.expected_revision,6); assert.equal(spam2.config.logChannel,'new-log');
      assert.equal(raid2.expected_revision,8); assert.equal(raid2.config.alertChannel,'new-log');
    }
    if (scenario === 'quick-defaults-error') {
      await page.getByText('Could not load the current settings. Nothing was changed.',{exact:false}).waitFor();
      assert.equal(await apply.isDisabled(),true,'no write without the current settings');
      assert.equal(calls.length,0);
      defaultsFail = false;
      await page.getByRole('alert').filter({hasText:'Could not load the current settings'}).getByRole('button',{name:'Try again',exact:true}).click();
      await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Confirm and apply' && !button.disabled));
    }
    if (scenario === 'quick-status-error') {
      await page.locator('.vozen-overview').waitFor();
      await new Promise(resolve => setTimeout(resolve,600));
      assert.equal(await page.locator('.quick-setup-page').count(),0,'a failed status fetch does not redirect to Quick Setup');
      await page.goto(base + '#/quick-setup');
      await page.getByRole('heading',{name:'Could not load the guided setup',exact:true}).waitFor();
      statusFails = false;
      await page.getByRole('button',{name:'Try again',exact:true}).click();
      await apply.waitFor();
    }
    if (scenario === 'quick-roles-free') {
      await page.getByText('Unlock Vozen Premium for this server to configure it.',{exact:false}).waitFor();
      assert.equal(await apply.isDisabled(),true);
      assert.equal(await page.getByRole('button',{name:/^skip$/i}).isDisabled(),false,'the roles step can still be skipped');
      assert.equal(calls.length,0);
    }
    if (scenario === 'quick-roles-403') {
      await apply.click();
      await page.getByText('Unlock Vozen Premium for this server to configure it.',{exact:false}).waitFor();
      assert.equal(await page.getByText('premium_required',{exact:false}).count(),0);
      assert.equal(await page.getByRole('heading',{name:'Let members choose roles',exact:true}).count(),1,'still on the roles step');
    }
    if (scenario === 'quick-channels-403') {
      const create = page.getByRole('checkbox',{name:/^Create #welcome if it does not exist/});
      assert.equal(await create.isChecked(),true);
      await apply.click();
      await page.getByText('You need the Manage Channels permission to create a channel here. Choose an existing channel instead.',{exact:false}).waitFor();
      // The fallback is applied right after the message; poll instead of reading once.
      for (let i = 0; i < 40 && await create.isChecked(); i++) await new Promise(resolve => setTimeout(resolve,50));
      assert.equal(await create.isChecked(),false,'the step falls back to an existing channel');
      assert.equal(await page.getByText('quick_setup_manage_channels_required',{exact:false}).count(),0);
      assert.equal(calls.length,1);
    }
    if (scenario === 'quick-protection-403') {
      // Protection writes anti-spam and anti-raid before the step call; those writes stay when the step is refused,
      // and the retry must carry their new revisions (6 and 8).
      const create = page.getByRole('checkbox',{name:/^Create #vozen-alerts if it does not exist/});
      await apply.click();
      await page.getByText('You need the Manage Channels permission to create a channel here. Choose an existing channel instead.',{exact:false}).waitFor();
      for (let i = 0; i < 40 && await create.isChecked(); i++) await new Promise(resolve => setTimeout(resolve,50));
      assert.equal(await create.isChecked(),false);
      await apply.click();
      await page.getByRole('heading',{name:'You’re all set.',exact:true}).waitFor();
      await page.getByText('Automated protection applied.',{exact:false}).waitFor();
      assert.deepEqual(calls.map(call => call.path),['/api/config/features/protection.antispam','/api/config/features/protection.anti_raid','/api/quick-setup/steps/protection','/api/config/features/protection.antispam','/api/config/features/protection.anti_raid','/api/quick-setup/steps/protection']);
      const bodies = calls.map(call => call.body);
      assert.equal(bodies[0].expected_revision,5); assert.equal(bodies[1].expected_revision,7);
      assert.equal(bodies[3].expected_revision,6,'the retry uses the revision of the write that stayed');
      assert.equal(bodies[4].expected_revision,8);
      assert.equal(bodies[5].config.createChannel,false);
    }
    console.log(`PASS quick ${scenario}`); await page.close();
  }
} finally {await browser.close();}
