import {test,expect} from '@playwright/test';

for(const product of ['tts','helper']) for(const width of [320,768,1440,1910]) test(`${product} real server picker preserves scale and selection at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const guilds=[{id:'999',name:'Community <safe>',permissions:'32',canManage:true},{id:'998',name:'A long server name that must wrap without overflowing the viewport',permissions:'32',canManage:true}];
  await page.addInitScript(()=>{sessionStorage.setItem('vozen.ecosystem.dtoken','fixture-token');sessionStorage.setItem('vozen.ecosystem.authexp',String(Date.now()+3600000));});
  await page.route('https://api.vozen.org/**',async route=>{
    const path=new URL(route.request().url()).pathname;let json={};
    if(path.endsWith('/api/dashboard/guilds'))json={guilds};
    else if(path.endsWith('/api/dashboard/guild/999'))json={config:{},profiles:[],capabilities:{},options:{}};
    else if(path.endsWith('/api/me'))json={id:'owner',guildId:'999',expiresAt:'2099-01-01T00:00:00Z',dbOk:true};
    else if(path.endsWith('/api/guilds'))json={guilds};
    else if(path.endsWith('/api/session/switch'))json={ok:true,guildId:'999'};
    else if(path.endsWith('/api/config/features'))json={guildId:'999',features:[]};
    else if(path.endsWith('/api/guild-context'))json={guildId:'999',name:guilds[0].name,channels:[],roles:[],hierarchy:{known:true},capabilities:{}};
    else if(path.endsWith('/api/quotas'))json={plan:'Free',limits:{},usage:{}};
    else if(path.endsWith('/api/stats'))json={guildId:'999',totalCases:0};
    else if(path.endsWith('/api/cases'))json={cases:[]};
    else if(path.endsWith('/api/audit'))json={events:[]};
    else if(path.endsWith('/api/activity'))json={activity:[]};
    else json={user:{id:'owner',username:'Fixture'},plus:{active:false},pass:{active:false,servers:[]}};
    await route.fulfill({json});
  });
  await page.route('https://static.cloudflareinsights.com/**',r=>r.fulfill({body:''}));
  await page.goto(product==='tts'?'/dashboard.html':'/panel/helper-tracker/#/servers');
  const picker=page.locator('.vozen-server-picker:visible');
  await expect(picker.locator('.vp-server')).toHaveCount(2);
  await expect(picker.locator('h1')).toHaveText('Your servers.');
  await expect(picker.locator('input')).toHaveCount(0);
  await expect(picker.locator('.vp-server').first()).toHaveCSS('border-top-color','rgb(39, 52, 72)');
  await expect(picker.locator('.vp-server').first()).toHaveCSS('background-image','linear-gradient(110deg, rgb(20, 32, 51), rgb(16, 24, 38) 60%)');
  if(product==='tts')await expect(page.locator('.account-hero')).toBeHidden();
  await expect(picker.locator('.vp-name').first()).toHaveText(guilds[0].name);
  await page.evaluate(()=>document.fonts.ready);
  await picker.locator('.vp-server').evaluateAll(rows=>Promise.all(rows.flatMap(row=>row.getAnimations().map(animation=>animation.finished))));
  if(width===1910){expect((await picker.boundingBox()).width).toBeCloseTo(1232,0);expect((await page.locator('header.vozen-global-nav .nav__inner').boundingBox()).width).toBeCloseTo(1280,0);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await page.screenshot({path:`test-results/picker-${product}-${width}.png`,fullPage:true});
  await picker.locator('.vp-server').first().click();
  await expect(picker).toHaveCount(0);
  expect(errors).toEqual([]);
});
