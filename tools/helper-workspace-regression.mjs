import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
const base = process.env.HELPER_TEST_URL || 'http://127.0.0.1:5179/panel/helper-tracker/';
const browser = await chromium.launch();
const results = [];
const alpha = {id:'a',name:'Alpha workspace QA',canManage:true};
const failedHeading = 'Unable to load your servers';
try {
  for (const scenario of ['http-error','network-error','malformed','null-entry','empty','wrong-server','no-permission','expired','slow','remember-server','real-demo-name']) {
    const page = await browser.newPage();
    let healthy = false, writes = 0, switches = 0, guild = 'a';
    if (scenario === 'remember-server') await page.addInitScript(() => localStorage.setItem('vh_last_guild_owner','b'));
    await page.route('**/api/**', async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname.replace(/^.*?(?=\/api\/)/,'');
      if (request.method() === 'OPTIONS') return route.fulfill({status:204,headers:{'access-control-allow-origin':new URL(base).origin,'access-control-allow-headers':'authorization,content-type','access-control-allow-credentials':'true'}});
      let value;
      if (path === '/api/session/switch') { switches++; guild = request.postDataJSON().guild_id; value = {ok:true,guildId:guild}; }
      else if (!['GET','HEAD'].includes(request.method())) { writes++; return route.fulfill({status:503,json:{}}); }
      else if (path === '/api/me') {
        if (scenario === 'expired') return route.fulfill({status:401,json:{code:'session_expired'}});
        value = {id:'owner',guildId:guild,expiresAt:'2099-01-01T00:00:00Z',dbOk:true};
      } else if (path === '/api/guilds') {
        if (!healthy) {
          if (scenario === 'http-error') return route.fulfill({status:503,json:{code:'unavailable'}});
          if (scenario === 'network-error') return route.abort('connectionfailed');
          if (scenario === 'malformed') return route.fulfill({json:{guilds:{}}});
          if (scenario === 'null-entry') return route.fulfill({json:{guilds:[null]}});
          if (scenario === 'empty') return route.fulfill({json:{guilds:[]}});
          if (scenario === 'wrong-server') return route.fulfill({json:{guilds:[{...alpha,id:'b',name:'Wrong workspace QA'}]}});
          if (scenario === 'no-permission') return route.fulfill({json:{guilds:[{...alpha,canManage:false}]}});
        }
        if (scenario === 'slow') await new Promise(resolve => setTimeout(resolve,1000));
        value = {guilds:scenario === 'real-demo-name' ? [{...alpha,name:'Demo server community'}] : [alpha,{...alpha,id:'b',name:'Beta workspace QA'}]};
      } else if (path === '/api/config/features') value = {guildId:guild,features:[]};
      else if (path === '/api/guild-context') value = {guildId:guild,name:'Alpha workspace QA',channels:[],roles:[],hierarchy:{known:true},capabilities:{},stale:false};
      else if (path === '/api/stats') value = {guildId:guild,totalCases:0};
      else if (path === '/api/cases') value = {cases:[]};
      else if (path === '/api/audit') value = {events:[]};
      else if (path === '/api/activity') value = {activity:[]};
      else if (path === '/api/quotas') value = {plan:'Free',limits:{},usage:{}};
      else return route.fulfill({status:503,json:{}});
      await route.fulfill({json:value});
    });
    await page.route('**/account/', route => route.fulfill({contentType:'text/html',body:'<h1>Account login QA</h1>'}));
    await page.goto(base+'#/servers');
    if (['http-error','network-error','malformed','null-entry','empty','wrong-server','no-permission'].includes(scenario)) {
      await page.getByRole('heading',{name:failedHeading,exact:true}).waitFor();
      assert.equal(await page.getByRole('combobox').count(),0);
      assert.doesNotMatch(await page.locator('body').innerText(), /Demo server|Fully synced|Wrong workspace QA/);
      if (scenario === 'http-error') {
        await page.getByRole('button',{name:'Try again',exact:true}).click();
        await page.getByRole('heading',{name:failedHeading,exact:true}).waitFor();
      }
      healthy = true;
      await page.getByRole('button',{name:'Try again',exact:true}).click();
      await page.getByText('Alpha workspace QA',{exact:true}).waitFor();
      await page.reload();
      await page.getByText('Alpha workspace QA',{exact:true}).waitFor();
    } else if (scenario === 'expired') {
      await page.getByRole('heading',{name:'Account login QA'}).waitFor();
    } else {
      if (scenario === 'slow') {
        await page.locator('[aria-busy="true"]').waitFor();
        assert.doesNotMatch(await page.locator('body').innerText(), /Demo server|Fully synced/);
      }
      await page.getByText(scenario === 'real-demo-name' ? 'Demo server community' : 'Alpha workspace QA',{exact:true}).waitFor();
      assert.equal(switches,scenario === 'remember-server' ? 1 : 0);
    }
    assert.equal(writes,0,'no configuration or provider writes');
    results.push({scenario,passed:true,configurationWrites:writes});
    await page.close();
  }
  console.log(JSON.stringify({base,passed:true,scenarios:results}));
  if (process.env.HELPER_WORKSPACE_RESULT) await writeFile(process.env.HELPER_WORKSPACE_RESULT,JSON.stringify({base,passed:true,scenarios:results},null,2));
} finally { await browser.close(); }
