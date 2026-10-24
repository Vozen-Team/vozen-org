// Synthetic fixtures only: no guild writes, login or Discord messages.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.HELPER_TEST_URL || 'http://127.0.0.1:5179/panel/helper-tracker/';
const guild = '1524199248248176751', token = 'a'.repeat(64);
const rows = [
  ['messages', 'Conversation starter', [20,100,500,1000], 750], ['voice','Stay awhile',[10,60,300,600],60],
  ['reactions','Reaction master',[50,250,1000,2000],0], ['threads_created','Thread creator',[5,25,100,200],0],
  ['threads_joined','Thread explorer',[10,50,250,500],0], ['boost','Server supporter',[1],0], ['xp','XP milestones',[100,1000,10000],1620],
].map(([id,name,thresholds,value])=>({id,name,description:name,thresholds,value,unlocked:thresholds.map(threshold=>value>=threshold)}));
await mkdir('output/playwright',{recursive:true});
const browser = await chromium.launch();
try {
  for (const scenario of ['catalog-en','catalog-pt','personal-en','personal-pt','mobile','expired','unavailable','invalid','empty']) {
    const mobile=scenario==='mobile', personal=scenario.startsWith('personal')||mobile||scenario==='expired', pt=scenario.endsWith('-pt')||mobile;
    const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1050},reducedMotion:'reduce'});
    let writes=0,otherApi=0,profileRequests=0;
    await page.route('https://api.vozen.org/**',async route=>{
      const request=route.request();
      if (request.method()!=='GET') writes++;
      if (!request.url().includes(`/api/achievements/${guild}`)) {otherApi++;return route.fulfill({status:500,body:'blocked'});}
      const privateRequest=request.headers().authorization===`Achievement ${token}`;
      if(privateRequest) profileRequests++;
      if(scenario==='expired'||scenario==='unavailable') return route.fulfill({status:scenario==='expired'?401:404,body:'{}'});
      return route.fulfill({json:{guildId:guild,guildName:'Servidor de demonstração',profile:privateRequest?{name:'Membro de exemplo',avatar:'https://cdn.discordapp.com/embed/avatars/0.png'}:null,achievements:scenario==='empty'?[]:rows.map(row=>privateRequest?row:{...row,value:0,unlocked:row.unlocked.map(()=>false)}),trackedMembers:2,tierCounts:Object.fromEntries(rows.map(row=>[row.id,row.thresholds.map((_,i)=>i===0?1:0)]))}});
    });
    await page.route('https://cdn.discordapp.com/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="48" fill="#243f52"/><text x="48" y="65" text-anchor="middle" fill="#8ee5d2" font-size="48" font-family="sans-serif">M</text></svg>'}));
    await page.goto(`${base}#/achievements/${scenario==='invalid'?'invalid':guild}${personal?`/${token}`:''}?lang=${pt?'pt':'en'}`);
    if (['expired','unavailable','invalid'].includes(scenario)) {
      await page.getByRole('alert').waitFor();
      assert.equal(await page.locator('.achievement-tile').count(),0);
      if(scenario==='expired') assert.match(await page.getByRole('alert').innerText(),/expired/);
    } else {
      await page.locator('.achievement-toolbar').waitFor();
      assert.equal(await page.locator('.achievement-tile').count(),scenario==='empty'?0:7);
      if(scenario!=='empty') {
        assert.equal(await page.locator('.achievement-tile').first().locator('ol li').count(),4);
        await page.screenshot({path:`output/playwright/achievements-page-${scenario}.png`,fullPage:true});
        await page.getByRole('searchbox').fill(pt?'reações':'reaction');
        assert.equal(await page.locator('.achievement-tile').count(),1);
        await page.getByRole('searchbox').fill('no such achievement');
        assert.equal(await page.locator('.achievement-tile').count(),0);
        await page.getByRole('searchbox').fill('');
        if(personal) {
          await page.getByRole('button',{name:pt?'Desbloqueadas':'Unlocked',exact:true}).click();
          assert.equal(await page.locator('.achievement-tile').count(),3);
          await page.getByRole('button',{name:pt?'Todas':'All',exact:true}).click();
          await Promise.all([
            page.waitForResponse(response=>response.url().includes(`/api/achievements/${guild}`)),
            page.getByRole('link',{name:pt?'English':'Português',exact:true}).click(),
          ]);
          await page.locator('.achievement-toolbar').waitFor();
          assert.ok(page.url().includes(token),'language switch must keep the private profile');
          assert.ok(profileRequests>=2);
        }
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no horizontal overflow');
      }
    }
    assert.equal(writes,0); assert.equal(otherApi,0,'public pages must not initialize management authentication');
    console.log(`${scenario}: passed`);
    await page.close();
  }
} finally {await browser.close();}
