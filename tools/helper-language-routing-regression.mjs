// Isolated API fixtures: no Discord requests or customer configuration writes.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

globalThis.window={};
await import('../site/js/i18n-v41.js');
await import('../site/js/i18n-v42.js');
const dictionary=window.VOZEN_I18N;
const read=async name=>JSON.parse(await readFile(new URL(`../apps/helper-panel/src/${name}.json`,import.meta.url),'utf8'));
const paths=await read('panel-paths');
const copy={};
for(const name of ['helper-app-pt-fr-es','helper-app-de-tr','helper-app-ar-zh','helper-app-ru-ko','helper-components-copy','helper-schema-copy','helper-shared-copy']) {
  for(const [source,values] of Object.entries(await read(name)))copy[source]={...copy[source],...values};
}
const locales={en:'English',pt:'Português',fr:'Français',es:'Español',de:'Deutsch',tr:'Türkçe',ar:'العربية',zh:'繁體中文',ru:'Русский',ko:'한국어'};
const expected=(source,locale)=>locale==='en'?source:copy[source]?.[locale]??Object.entries(dictionary.en).map(([key,value])=>value===source?dictionary[locale]?.[key]:null).find(Boolean)??source;
const origin=(process.env.HELPER_TEST_ORIGIN||'http://127.0.0.1:5179').replace(/\/$/,'');
const features=Object.keys(paths).map(key=>({key,label:dictionary.en[`helper.feature.${key}.label`]||key,description:'Manage the server with predictable, auditable controls.',category:key.split('.')[0],enabled:true,available:true,configurable:true,maturity:'operational'}));
const browser=await chromium.launch();
const errors=[];
let writes=0,failWrites=false,simulations=0;
try {
  const context=await browser.newContext();
  await context.addInitScript(()=>localStorage.setItem('vozen.lang',localStorage.getItem('vozen.lang')||'en'));
  await context.route('**/api/**',async route=>{
    const request=route.request(),path=new URL(request.url()).pathname.replace(/^.*?(?=\/api\/)/,'');
    if(path.endsWith('/simulate')) {
      simulations++;
      await route.fulfill({json:{ok:true,key:'management.invite_tracker',mode:'simulation',result:{key:'management.invite_tracker',would_apply:true,effects:[],issues:[]}}});return;
    }
    if(path.endsWith('/preflight')) {
      assert.ok(failWrites,'viewing routes must not start a configuration preflight');
      assert.equal(request.postDataJSON().config.maxEntries,17);
      await route.fulfill({json:{guildId:'10',ok:true,issues:[]}});return;
    }
    if(request.method()!=='GET') {
      writes++;
      assert.ok(failWrites,'viewing routes or changing language must not write settings');
      assert.equal(request.method(),'PUT');
      assert.equal(request.postDataJSON().config.maxEntries,17,'language changes retain the edited value');
      await route.fulfill({status:503,json:{code:'temporary_failure'}});return;
    }
    let value;
    if(path==='/api/me')value={id:'qa',guildId:'10',dbOk:true};
    else if(path==='/api/guilds')value={guilds:[{id:'10',name:'Active',canManage:true}]};
    else if(path==='/api/config/features')value={guildId:'10',features};
    else if(path.startsWith('/api/config/features/')) {
      const key=path.split('/').at(-1),feature=features.find(f=>f.key===key);
      value={...feature,guildId:'10',revision:1,defaults:{},config:{maxEntries:10,includeInviter:true},schema:{sections:key==='management.invite_tracker'?[{title:'Invite overview',description:'Control the staff-facing invite list without scraping or storing invite tokens.',fields:[{key:'maxEntries',label:'Invites shown',kind:'number',min:1,max:50},{key:'includeInviter',label:'Show inviter names',kind:'toggle'}]}]:[]}};
    }
    else if(path==='/api/guild-context')value={guildId:'10',name:'Active',permissions:'8',channels:[{id:'20',name:'Overview',type:'text'}],roles:[],bot:{available:true,permissions:'8'},hierarchy:{known:true},capabilities:{channelSelectors:true,roleSelectors:true,permissionPreflight:true}};
    else if(path==='/api/stats')value={guildId:'10',totalCases:0};
    else if(path==='/api/quotas')value={plan:'Free',usage:{},limits:{}};
    else {await route.fulfill({status:503,json:{code:'unavailable'}});return;}
    await route.fulfill({json:value});
  });
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${origin}/panel/helper-tracker/#/config/management.invite_tracker`);
  await page.waitForURL(url=>url.pathname==='/panel/invites/'&&!url.hash);
  await page.getByRole('spinbutton').waitFor();
  for(const [locale,name] of Object.entries(locales)) {
    await page.locator('.workspace-global-nav__language-button').click();
    await page.locator('.lang__panel').getByRole('button',{name,exact:true}).click();
    await page.waitForFunction(code=>document.documentElement.lang===code,locale);
    assert.equal(await page.locator('.lang__name').innerText(),name);
    assert.equal(await page.getByRole('spinbutton').inputValue(),'10');
    assert.equal(await page.getByRole('spinbutton').getAttribute('aria-label')||await page.getByRole('spinbutton').evaluate(node=>node.closest('label')?.querySelector('b')?.textContent),expected('Invites shown',locale));
    await page.getByText(expected('Invite overview',locale),{exact:true}).waitFor();
    await page.getByText(expected('All settings for this server.',locale),{exact:true}).waitFor();
    assert.equal(await page.locator('select option[value="10"]:checked').innerText(),'Active','server names are user content');
    assert.equal(await page.evaluate(()=>document.documentElement.dir),locale==='ar'?'rtl':'ltr');
    if(locale==='pt') {await mkdir('output/playwright',{recursive:true});await page.screenshot({path:'output/playwright/helper-language-pt.png',fullPage:true});}
    await page.reload();
    await page.getByRole('spinbutton').waitFor();
    assert.equal(await page.locator('.lang__name').innerText(),name,'reload preserves the chosen language');
    assert.equal(new URL(page.url()).hash,'');
    console.log(`PASS shared-language ${locale}`);
  }
  assert.equal(writes,0);
  await page.locator('.workspace-global-nav__language-button').click();
  await page.locator('.lang__panel').getByRole('button',{name:'Português',exact:true}).click();
  for(const [key,slug] of Object.entries(paths)) {
    await page.goto(`${origin}/panel/${slug}/`);
    const canonical=key==='studio.rank_card'?'community.levels':key==='support.welcome_channel'?'support.welcome':key;
    await page.locator('#route-heading').filter({hasText:dictionary.pt[`helper.feature.${canonical}.label`]}).waitFor();
    assert.equal(new URL(page.url()).pathname,`/panel/${slug}/`);
    assert.equal(new URL(page.url()).hash,'');
  }
  console.log('PASS 47 direct feature routes with Portuguese titles');
  await page.goto(`${origin}/panel/invites/`);
  await page.getByRole('spinbutton').waitFor();
  await page.getByRole('button',{name:expected('Simulate configuration','pt'),exact:true}).click();
  await page.getByRole('dialog',{name:dictionary.pt['helper.feature.management.invite_tracker.label'],exact:true}).waitFor();
  const other=await context.newPage();
  await other.goto(`${origin}/panel/invites/`);
  await other.evaluate(()=>localStorage.setItem('vozen.lang','fr'));
  await page.getByRole('dialog',{name:dictionary.fr['helper.feature.management.invite_tracker.label'],exact:true}).waitFor();
  await page.keyboard.press('Escape');
  await other.close();
  assert.equal(simulations,1,'language changes do not repeat the validation request');
  assert.equal(writes,0);
  await page.locator('.workspace-global-nav__language-button').click();
  await page.locator('.lang__panel').getByRole('button',{name:'Português',exact:true}).click();
  console.log('PASS open demonstration follows a cross-tab language change');
  failWrites=true;
  await page.getByRole('spinbutton').fill('17');
  await page.getByRole('alert').waitFor();
  await page.locator('.workspace-global-nav__language-button').click();
  await page.locator('.lang__panel').getByRole('button',{name:'English',exact:true}).click();
  assert.equal(await page.getByRole('spinbutton').inputValue(),'17');
  await page.getByRole('alert').filter({hasText:'Could not save'}).waitFor();
  assert.equal(new URL(page.url()).pathname,'/panel/invites/');
  console.log('PASS failed-save draft retained across language change');
  const mobile=await context.newPage();
  await mobile.setViewportSize({width:390,height:844});
  await mobile.addInitScript(()=>localStorage.setItem('vozen.lang','ar'));
  await mobile.goto(`${origin}/panel/invites/`);
  await mobile.getByRole('spinbutton').waitFor();
  assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Arabic mobile fits the viewport');
  await mobile.screenshot({path:'output/playwright/helper-language-ar-mobile.png',fullPage:true});
  console.log('PASS Arabic mobile layout');
  assert.deepEqual(errors,[]);
} finally {await browser.close();}
