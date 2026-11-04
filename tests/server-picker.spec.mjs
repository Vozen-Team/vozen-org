import {test,expect} from '@playwright/test';

for(const product of ['tts','helper']) for(const width of [320,768,1440,1910]) test(`${product} real server picker preserves scale and selection at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  let activeGuild = '999';
  let otherServerAvailable = true;
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const guilds=[{id:'999',name:'Community <safe>',permissions:'32',canManage:true,icon:'fixture',iconUrl:'https://cdn.discordapp.com/icons/999/fixture.png'},{id:'998',name:'A long server name that must wrap without overflowing the viewport',permissions:'32',canManage:true}];
  await page.addInitScript(()=>{sessionStorage.setItem('vozen.ecosystem.dtoken','fixture-token');sessionStorage.setItem('vozen.ecosystem.authexp',String(Date.now()+3600000));});
  await page.route('https://api.vozen.org/**',async route=>{
    const path=new URL(route.request().url()).pathname;let json={};
    if(path.endsWith('/api/dashboard/guilds'))json={guilds:otherServerAvailable?guilds:guilds.slice(0,1)};
    else if(/\/api\/dashboard\/guild\/99[89]$/.test(path))json={config:{},profiles:[],capabilities:{},options:{}};
    else if(path.endsWith('/api/me'))json={id:'owner',guildId:activeGuild,expiresAt:'2099-01-01T00:00:00Z',dbOk:true};
    else if(path.endsWith('/api/guilds'))json={guilds};
    else if(path.endsWith('/api/session/switch')){
      activeGuild=route.request().postDataJSON().guild_id;
      json={ok:true,guildId:activeGuild};
    }
    else if(path.endsWith('/api/config/features'))json={guildId:activeGuild,features:[]};
    else if(path.endsWith('/api/guild-context'))json={guildId:activeGuild,name:guilds.find(guild=>guild.id===activeGuild).name,channels:[],roles:[],hierarchy:{known:true},capabilities:{}};
    else if(path.endsWith('/api/quotas'))json={plan:'Free',limits:{},usage:{}};
    else if(path.endsWith('/api/stats'))json={guildId:activeGuild,totalCases:0};
    else if(path.endsWith('/api/cases'))json={cases:[]};
    else if(path.endsWith('/api/audit'))json={events:[]};
    else if(path.endsWith('/api/activity'))json={activity:[]};
    else json={user:{id:'owner',username:'Fixture'},plus:{active:false},pass:{active:false,servers:[]}};
    await route.fulfill({json});
  });
  await page.route('https://static.cloudflareinsights.com/**',r=>r.fulfill({body:''}));
  await page.route('https://cdn.discordapp.com/icons/999/**',route=>
    width===320 ? route.abort() : route.fulfill({path:'site/assets/settings-tts.png'}));
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
  const server = page.locator('.workspace-server-picker select');
  const avatar = page.locator('.workspace-server-avatar');
  await expect(server).toHaveValue('999');
  await expect(avatar).toBeVisible();
  if (width===320) {
    await expect(avatar.locator('img')).toHaveCount(0);
    await expect(page.locator('.workspace-server-avatar[data-initials], .workspace-server-avatar [data-initials]')).toHaveAttribute('data-initials','C<');
  } else {
    await expect.poll(()=>avatar.locator('img').evaluate(img=>img.naturalWidth)).toBeGreaterThan(0);
  }
  const productPicker = page.getByRole('combobox',{name:'Product'});
  expect(await productPicker.locator('option').evaluateAll(options=>options.map(option=>option.value))).toEqual(['tts','music','helper']);
  expect(await productPicker.evaluate(select=>select.offsetHeight)).toBe(44);
  expect(await server.evaluate(select=>select.offsetHeight)).toBe(width<=900?44:47);
  await expect(server).toHaveCSS('padding-inline-start',width<=900?'35px':'40px');
  await expect(server.locator('option').last()).toHaveAttribute('value','__choose_server__');
  if (width===1440) {
    await server.selectOption('998');
    await expect(server).toHaveValue('998');
    await expect(page.getByText(guilds[1].name,{exact:true}).filter({visible:true}).last()).toBeVisible();
    await page.reload();
    await expect(server).toHaveValue('998');
    await expect(picker).toHaveCount(0);
    if (product==='tts') {
      otherServerAvailable=false;
      await page.reload();
      await expect(picker.locator('.vp-server')).toHaveCount(1);
      otherServerAvailable=true;
      await page.reload();
      await expect(picker.locator('.vp-server')).toHaveCount(2);
      await picker.locator('.vp-server').first().click();
      await expect(server).toHaveValue('999');
    }
  }
  await server.selectOption('__choose_server__');
  await expect(picker.locator('.vp-server')).toHaveCount(2);
  if (width===1440) {
    await page.reload();
    await expect(picker.locator('.vp-server')).toHaveCount(2);
  }
  expect(errors).toEqual([]);
});

for(const product of ['tts','helper']) for(const width of [320,768,1440,1910]) test(`${product} picker skeleton matches its loaded rows at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  let release;const pending=new Promise(resolve=>{release=resolve;});
  let requestStarted;const requested=new Promise(resolve=>{requestStarted=resolve;});
  await page.addInitScript(()=>{sessionStorage.setItem('vozen.ecosystem.dtoken','fixture-token');sessionStorage.setItem('vozen.ecosystem.authexp',String(Date.now()+3600000));});
  await page.route('https://api.vozen.org/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith('/api/dashboard/guilds')||path.endsWith('/api/guilds')){
      requestStarted();await pending;return route.fulfill({json:{guilds:[{id:'999',name:'Community',permissions:'32',canManage:true},{id:'998',name:'Another server',permissions:'32',canManage:true}]}});
    }
    return route.fulfill({json:path.endsWith('/api/me')?{id:'owner',guildId:'999',expiresAt:'2099-01-01T00:00:00Z',dbOk:true}:{user:{id:'owner',username:'Fixture'},plus:{active:false},pass:{active:false,servers:[]}}});
  });
  try{
    await page.goto(product==='tts'?'/dashboard.html':'/panel/helper-tracker/#/servers');
    await requested;
    const loading=page.locator('.vp-loading:visible');await expect(loading).toBeVisible();
    await expect(loading).toHaveAttribute('aria-busy','true');
    await expect(loading.locator('.vp-server')).toHaveCount(4);
    await expect(loading.locator('button,a,input')).toHaveCount(0);
    await expect(page.locator('.helper-skeleton,.dash-skeleton--picker')).toHaveCount(0);
    await page.evaluate(()=>document.fonts.ready);
    const before=await loading.locator('.vp-server').first().evaluate(row=>row.getBoundingClientRect().toJSON());
    await page.screenshot({path:`test-results/skeleton-${product}-${width}.png`,fullPage:true});
    release();await expect(page.locator('.vp-loading')).toHaveCount(0);
    const row=page.locator('.vozen-server-picker .vp-server').first();await expect(row).toBeVisible();
    await row.evaluate(el=>Promise.all(el.getAnimations().map(animation=>animation.finished)));
    const after=await row.evaluate(element=>element.getBoundingClientRect().toJSON());
    expect(after.x).toBeCloseTo(before.x,0);expect(after.y).toBeCloseTo(before.y,0);expect(after.width).toBeCloseTo(before.width,0);expect(after.height).toBeCloseTo(before.height,0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  }finally{release();}
});

test('TTS first paint uses the picker skeleton before dashboard JavaScript',async({page})=>{
  await page.route('**/js/dashboard-v8.js*',route=>route.abort());
  await page.goto('/dashboard.html');
  await expect(page.locator('#ttsBootFallback .vp-loading')).toBeVisible();
  await expect(page.locator('#ttsBootFallback .vp-server')).toHaveCount(4);
  await expect(page.locator('.account-hero')).toBeHidden();
});
