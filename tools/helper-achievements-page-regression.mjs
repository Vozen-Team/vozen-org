// Synthetic fixtures only: no guild writes, login or Discord messages.
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
const source = await readFile(new URL('../apps/helper-panel/src/achievements-page.tsx', import.meta.url), 'utf8');
const catalogue = await readFile(new URL('../apps/helper-panel/src/achievements-i18n.ts', import.meta.url), 'utf8');
for (const match of source.matchAll(/\bt\('([^']+)'/g)) assert.ok(catalogue.includes(`'${match[1]}'`), `Missing translation: ${match[1]}`);
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
    await page.locator('.workspace-global-nav').waitFor();
    assert.equal(await page.locator('.workspace-global-nav').count(),1);
    const header = page.locator('header.vozen-global-nav');
    assert.equal(await header.locator('.nav__links a').count(),6);
    assert.equal(await header.locator('a[href="/status.html"]').count(),1);
    assert.equal(await header.locator('a[href="/premium#plans"]').count(),1);
    assert.equal(await header.evaluate(node => getComputedStyle(node).position),'sticky');
    assert.equal(await header.evaluate(node => getComputedStyle(node).backgroundColor),'rgba(0, 0, 0, 0)');
    await page.evaluate(() => document.fonts.ready);
    if (!mobile) {
      assert.equal(await header.locator('.brand__mark').evaluate(node => node.getBoundingClientRect().width),52);
      assert.ok(await header.locator('.brand__word').evaluate(node => node.getBoundingClientRect().width > 100), 'the real Vozen wordmark font loads under the production CSP');
    }
    if(mobile) {
      assert.equal((await header.boundingBox()).height,70,'same compact mobile height as the public header');
      const menu = page.locator('.workspace-global-nav__menu');
      await menu.click();
      await page.locator('#ecosystem-products a[href="/commands/"]').waitFor({state:'visible'});
      const drawer = await page.locator('#ecosystem-products').boundingBox();
      assert.ok(drawer && Math.abs(drawer.x + drawer.width - 390) < 2, 'same right-edge drawer as the public site');
      assert.ok(drawer.height >= 844, 'drawer fills the viewport');
      await page.keyboard.press('Escape');
      assert.equal(await menu.getAttribute('aria-expanded'),'false');
      assert.equal(await page.locator('#ecosystem-products').isVisible(),false);
    }
    if (['expired','unavailable','invalid'].includes(scenario)) {
      await page.getByRole('alert').waitFor();
      assert.equal(await page.locator('.achievement-tile').count(),0);
      if(scenario==='expired') assert.match(await page.getByRole('alert').innerText(),/expired/);
    } else {
      await page.locator('.achievement-toolbar').waitFor();
      if (scenario === 'catalog-en' || mobile) {
        await page.evaluate(() => window.scrollTo(0, 500));
        await page.waitForFunction(() => document.querySelector('header.vozen-global-nav')?.classList.contains('is-stuck'));
        await page.waitForFunction(() => getComputedStyle(document.querySelector('header.vozen-global-nav')).backgroundColor !== 'rgba(0, 0, 0, 0)');
        assert.notEqual(await header.evaluate(node => getComputedStyle(node).backgroundColor),'rgba(0, 0, 0, 0)');
        assert.ok(Math.abs((await header.boundingBox()).y) < 2, 'header stays at the viewport top');
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForFunction(() => !document.querySelector('header.vozen-global-nav')?.classList.contains('is-stuck'));
      }
      assert.equal(await page.locator('.achievement-tile').count(),scenario==='empty'?0:7);
      const helpText=page.getByText(pt?'A nova atividade conta desde a ativação. O XP anterior mantém-se.':'New activity counts from activation. Existing XP is kept.',{exact:true});
      assert.equal(await helpText.isVisible(),false,'extra explanations start collapsed');
      const help=page.locator('.achievement-help summary');
      await help.press('Enter');
      await helpText.waitFor({state:'visible'});
      await help.press('Enter');
      assert.equal(await helpText.isVisible(),false);
      if(personal) assert.match(await page.locator('.achievement-quick-help>span').innerText(),pt?/Link privado.*1 hora/:/Private link.*1 hour/);
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
          await page.locator('.workspace-global-nav__language-button').click();
          await page.getByRole('button',{name:pt?'English':'Português',exact:true}).click();
          await page.getByRole('heading',{name:pt?'All achievements':'Todas as conquistas',exact:true}).waitFor();
          assert.ok(page.url().includes(token),'language switch must keep the private profile');
          assert.equal(profileRequests,1,'language changes reuse the loaded private profile');
        }
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no horizontal overflow');
      }
    }
    assert.equal(writes,0); assert.equal(otherApi,0,'public pages must not initialize management authentication');
    console.log(`${scenario}: passed`);
    await page.close();
  }
  for (const [locale, heading] of Object.entries({fr:'Tous les succès',es:'Todos los logros',de:'Alle Erfolge',tr:'Tüm başarımlar',ar:'كل الإنجازات',zh:'所有成就',ru:'Все достижения',ko:'모든 업적'})) {
    for (const personal of [false,true]) {
      const page=await browser.newPage({viewport:{width:390,height:844}});
      let requests=0;
      await page.route('https://api.vozen.org/**',route=>{
        assert.ok(route.request().url().includes(`/api/achievements/${guild}`));
        requests++;
        assert.equal(route.request().headers().authorization,personal?`Achievement ${token}`:undefined);
        return route.fulfill({json:{guildId:guild,guildName:'Test',profile:personal?{name:'Test member',avatar:''}:null,achievements:rows,trackedMembers:2,tierCounts:{}}});
      });
      await page.goto(`${base}#/achievements/${guild}${personal?`/${token}`:''}?lang=${locale}`);
      await page.getByRole('heading',{name:heading,exact:true}).waitFor();
      assert.equal(await page.locator('.achievement-tile').count(),7);
      assert.equal(await page.locator('html').getAttribute('dir'),locale==='ar'?'rtl':'ltr');
      assert.equal(await page.locator('html').getAttribute('lang'),locale);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.equal(await page.evaluate(()=>localStorage.getItem('vozen.lang')),locale);
      await page.reload();
      await page.getByRole('heading',{name:heading,exact:true}).waitFor();
      if(locale==='ar'||locale==='ko') await page.screenshot({path:`output/playwright/achievements-page-${locale}-${personal?'personal':'catalog'}.png`,fullPage:true});
      assert.equal(requests,2);
      await page.close();
    }
    console.log(`${locale}: public/private passed`);
  }
} finally {await browser.close();}
