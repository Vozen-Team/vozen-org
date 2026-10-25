const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch();
const base = process.env.HELPER_TEST_URL || 'http://127.0.0.1:5179/panel/helper-tracker/';
const row = (id, kind, category, name='Rexy') => ({id,source:'activity',kind,category,user_id:'1523489275155583056',memberName:name,actor_id:null,actorName:null,detail:'Full technical evidence',outcome:'recorded',created_at:1800000000000-Number(id.split(':')[1] || 0),helper:kind.startsWith('helper_')});
try {
  for (const locale of ['en','pt','fr','es','de','tr','ar','zh','ru','ko']) {
    const page = await browser.newPage({viewport:{width:locale==='pt'?390:1440,height:900}});
    await page.addInitScript(lang=>localStorage.setItem('vozen.lang',lang),locale);
    await page.addInitScript(()=>{const original=window.setInterval;window.setInterval=(fn,delay,...args)=>{if(delay===30000)window.activityPoll=fn;return original(fn,delay,...args);};});
    let guild='a', mode='normal', writes=0;
    const reads=[];
    await page.route('**/api/**',async route=>{
      const url=new URL(route.request().url());
      const path=url.pathname.slice(url.pathname.indexOf('/api/'));
      let value={};
      if(route.request().method()!=='GET' && path!=='/api/session/switch') writes++;
      if(path==='/api/me') value={id:'qa-user',guildId:guild,dbOk:true};
      else if(path==='/api/guilds') value={guilds:[{id:'a',name:'Alpha',canManage:true},{id:'b',name:'Beta',canManage:true}]};
      else if(path==='/api/session/switch') {guild=route.request().postDataJSON().guild_id;value={ok:true,guildId:guild};}
      else if(path==='/api/guild-context') value={guildId:guild,name:guild==='a'?'Alpha':'Beta',permissions:'8',channels:[],roles:[],hierarchy:{known:true},capabilities:{channelSelectors:true,roleSelectors:true,permissionPreflight:true}};
      else if(path==='/api/config/features') value={guildId:guild,features:[]};
      else if(path==='/api/cases') value={cases:[]};
      else if(path==='/api/stats') value={guildId:guild,totalCases:0};
      else if(path==='/api/quotas') value={plan:'Free',limits:{},usage:{}};
      else if(path==='/api/activity/feed') {
        const category=url.searchParams.get('category'); reads.push(category);
        if(mode==='error') {await route.fulfill({status:503,json:{code:'unavailable'}});return;}
        const events=[row('activity:1','member_join','joins'),row('activity:2','member_leave','leaves','Diogosh'),row('activity:3','member_ban','bans'),row('activity:4','member_timeout','timeouts'),row('activity:5','helper_message','other','Vozen Helper')];
        const selected=category==='all'?events:category==='helper'?events.filter(event=>event.helper):events.filter(event=>event.category===category);
        value={guildId:mode==='wrong-guild'?'other':guild,events:mode==='empty'?[]:url.searchParams.has('before')?[row('activity:9','member_join','joins','Older member')]:selected,nextCursor:category==='all'&&!url.searchParams.has('before')&&mode!=='empty'?'older':null};
        if(mode==='delayed'&&category==='joins') await new Promise(resolve=>setTimeout(resolve,500));
      }
      await route.fulfill({json:value}).catch(error=>{if(!/closed|disposed|Invalid InterceptionId/i.test(String(error))) throw error;});
    });
    await page.goto(`${base}#/activity`);
    const feed=page.locator('.activity-feed');
    const filters=feed.locator('nav button');
    await feed.locator('.activity-feed__row').first().waitFor();
    assert.equal(await page.locator('h1').count(),1);
    assert.equal(await filters.count(),6);
    assert.equal(await feed.locator('h2').count(),0);
    assert.equal(await page.locator('.header-state').count(),0);
    assert.equal(await feed.locator('.activity-feed__row').count(),5);
    assert.ok(!(await feed.innerText()).includes('1523489275155583056'));
    await filters.first().click();
    assert.equal(await feed.locator('.activity-feed__row').count(),5,'active chip keeps rows');
    for(const [index,category] of ['joins','leaves','bans','timeouts','helper'].entries()) {
      await filters.nth(index+1).click();
      await page.waitForFunction(()=>document.querySelectorAll('.activity-feed__row').length===1);
      assert.equal(reads.at(-1),category);
      assert.ok((await feed.locator('.activity-feed__row').innerText()).length<180,'compact row');
    }
    await filters.first().click();
    await page.waitForFunction(()=>document.querySelectorAll('.activity-feed__row').length===5);
    await feed.locator('.activity-feed__more').click();
    await page.getByText('Older member',{exact:true}).waitFor();
    assert.equal(await feed.locator('.activity-feed__row').count(),6);
    const pagedReads=reads.length;
    await page.evaluate(()=>window.activityPoll());
    await page.waitForTimeout(50);
    assert.equal(reads.length,pagedReads,'polling cannot skip unseen pages while reading history');
    await feed.locator('.activity-feed__details button').first().click();
    await feed.locator('.activity-feed__expanded').waitFor();
    assert.ok((await feed.locator('.activity-feed__expanded').innerText()).includes('Full technical evidence'));
    assert.equal(await page.locator('[role=dialog]').count(),0);
    await feed.locator('.activity-feed__details button').first().click();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
    if (locale === 'ru') {
      const inner = await page.locator('.vozen-global-nav .nav__inner').boundingBox();
      const actions = await page.locator('.vozen-global-nav .nav__actions').boundingBox();
      assert.ok(actions.x + actions.width <= inner.x + inner.width + 1, 'translated navigation stays inside the shared header width');
    }
    if(['en','pt','ar'].includes(locale)) {
      await mkdir('output/playwright',{recursive:true});
      await page.evaluate(()=>window.scrollTo(0,0));
      await page.screenshot({path:`output/playwright/activity-${locale}.png`,fullPage:true});
    }
    if(locale==='en') {
      mode='error'; await feed.locator('.activity-feed__refresh').click(); await feed.getByRole('alert').waitFor();
      mode='wrong-guild'; await Promise.all([page.waitForResponse(response=>response.url().includes('/activity/feed')),feed.getByRole('alert').getByRole('button').click()]);
      await feed.getByRole('alert').waitFor();
      assert.equal(await feed.locator('.activity-feed__row').count(),0,'foreign guild response rejected');
      mode='empty'; await feed.getByRole('alert').getByRole('button').click(); await page.getByText('No activity yet.',{exact:true}).waitFor();
      mode='delayed'; await Promise.all([page.waitForRequest(request=>request.url().includes('category=joins')),filters.nth(1).click()]);
      await filters.nth(2).click(); await page.getByText('Diogosh',{exact:true}).waitFor();
      await page.waitForTimeout(650);
      assert.equal(await feed.locator('.activity-feed__row').count(),1);
      assert.ok((await feed.innerText()).includes('Diogosh'),'stale filter cannot replace current response');
      await page.locator('select[aria-label="Current server"]').selectOption('b');
      await page.waitForFunction(()=>document.querySelector('select[aria-label="Current server"]')?.value==='b');
      await page.getByText('Rexy',{exact:true}).first().waitFor();
    }
    assert.equal(writes,0,'activity is read-only');
    console.log(`PASS activity ${locale}`);
    await page.close();
  }
} finally {await browser.close();}
