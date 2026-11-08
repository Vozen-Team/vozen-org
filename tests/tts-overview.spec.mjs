import {test,expect} from '@playwright/test';
import {createTtsOverviewPreview} from '../tools/serve-tts-overview-preview.mjs';
import {closeSiteServer} from '../tools/serve-site.mjs';
let preview;
test.beforeAll(async()=>{preview=await createTtsOverviewPreview();});
test.afterAll(async()=>{if(preview)await closeSiteServer(preview.server);});

for(const width of [320,390,768,900,1440])test(`TTS Overview matches the Music layout at ${width}px without production requests`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 const remote=[];page.on('request',request=>{if(!request.url().startsWith(preview.origin))remote.push(request.url());});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(preview.origin+'/dashboard.html');
 await expect(page.locator('#ttsLeaderboard-streak')).toContainText('Streak leaderboard');
 await expect(page.locator('.tts-leaderboard')).toHaveCount(1);
 await expect(page.locator('#tts-pages [data-tts-view] svg')).toHaveCount(3);
 await expect(page.locator('#tts-pages [aria-current=page]')).toHaveCount(1);
 await expect(page.locator('#tts-pages [data-tts-view=overview]')).toHaveCSS('color','rgb(158, 239, 229)');
 for(const icon of await page.locator('#tts-pages .workspace-sidebar__nav-icon').all())await expect(icon).toBeVisible();
 for(const metric of ['streak','messages']){
  if(metric==='messages')await page.getByRole('button',{name:'Messages',exact:true}).click();
  const board=page.locator('.tts-leaderboard[data-metric='+metric+']');
  await expect(board).toBeVisible();
  await expect(page.locator('.tts-leaderboard')).toHaveCount(1);
  await expect(page.locator('.tts-leaderboard-segments button')).toHaveCount(2);
  const [streakButton,messageButton]=await Promise.all(['streak','messages'].map(metric=>page.locator('[data-leaderboard-metric='+metric+']').boundingBox()));
  expect(Math.abs(streakButton.width-messageButton.width)).toBeLessThan(1);
  expect(streakButton.height).toBe(messageButton.height);
  await expect(page.locator('.tts-leaderboard-segments [aria-pressed=true]')).toHaveCount(1);
  await expect(page.locator('[data-leaderboard-metric='+metric+']')).toHaveAttribute('aria-pressed','true');
  await expect(board.locator('tbody tr')).toHaveCount(5);
  await expect(board.getByRole('columnheader',{name:'Rank',exact:true})).toHaveText('#');
  await expect(board.locator('.tts-preview-label')).toHaveText('Preview data');
  await expect(board.locator('.tts-rank-medal')).toHaveCount(3);
  await expect(board.getByRole('img',{name:'Rank 1',exact:true})).toBeVisible();
  for(let index=0;index<3;index++){
   const row=board.locator('tbody tr').nth(index);
   const [medal,avatar]=await Promise.all([row.locator('.tts-rank-medal').boundingBox(),row.locator('.tts-member-avatar').boundingBox()]);
   expect(medal.x+medal.width).toBeLessThanOrEqual(avatar.x);
  }
  const scores=await board.locator('.tts-score-value').allTextContents();
  const numbers=scores.map(x=>Number(x.replaceAll(',','')));
  expect(numbers).toEqual([...numbers].sort((a,b)=>b-a));
  await expect(board.locator('tbody tr').nth(1)).toContainText(metric==='streak'?'Sora':'Mia');
 }
 await expect(page.locator('#ttsLeaderboard-messages')).toContainText('Messages leaderboard');
 await page.keyboard.press('Space');
 await expect(page.locator('#ttsLeaderboard-messages')).toBeVisible();
 await page.getByRole('button',{name:'Streaks',exact:true}).focus();
 await page.keyboard.press('Space');
 await expect(page.locator('#ttsLeaderboard-streak')).toBeVisible();
 await expect(page.getByRole('button',{name:'Streaks',exact:true})).toBeFocused();
 await page.getByRole('button',{name:'Messages',exact:true}).focus();
 await page.keyboard.press('Space');
 await expect(page.locator('#ttsLeaderboard-messages')).toBeVisible();
 await expect(page.locator('.tts-choice')).toHaveCount(4);
 await expect(page.locator('.tts-overview-profile [role=status]')).toBeHidden();
 await page.evaluate(()=>document.fonts.ready);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 const left=await page.locator('.tts-overview-rankings').boundingBox(),side=await page.locator('.tts-overview-side').boundingBox();
 if(width===1440){expect(left.x+left.width).toBeLessThan(side.x);expect(Math.abs(left.y-side.y)).toBeLessThan(1);}
 const choices=await page.locator('.tts-overview-choices').boundingBox(),profile=await page.locator('.tts-overview-profile').boundingBox();
 expect(choices.y+choices.height).toBeLessThan(profile.y);
 if(width===1440)expect(profile.y+profile.height).toBeLessThan(1000);
 await page.screenshot({path:`test-results/tts-overview-${width}.png`,fullPage:true});
 for(const section of ['reading','community','profiles','limits']){
  await page.locator('[data-overview-section='+section+']').click();
  await expect(page.locator('[data-settings-panel='+section+']')).toBeVisible();
  await expect(page.locator('#tts-pages [data-tts-view=settings]')).toHaveCSS('color','rgb(216, 200, 255)');
  await page.locator('[data-tts-view=overview]').click();
  await expect(page.locator('#ttsLeaderboard-messages')).toBeVisible();
 }
 await page.keyboard.press('Tab');
 await page.locator('.tts-overview-profile').focus();
 await expect(page.locator('.tts-profile-overlay')).toHaveCSS('opacity','1');
 await page.keyboard.press('Enter');
 await expect(page.locator('.tts-bot-profile form')).toBeVisible();
 await expect(page.locator('#tts-pages [data-tts-view=bot-profile]')).toHaveCSS('color','rgb(255, 226, 178)');
 await page.locator('input[name=nick]').fill('Local Voice');
 await page.locator('.tts-bot-profile button[type=submit]').click();
 await expect(page.locator('.tts-profile-status')).toContainText(/applied/i);
 await page.locator('[data-tts-view=overview]').click();
 await expect(page.locator('.tts-overview-profile-name strong')).toHaveText('Local Voice');
 expect(remote).toEqual([]);expect(errors).toEqual([]);
});

test('Overview presents missing leaderboard data and failed profile loading without invented activity',async({page})=>{
 await page.addInitScript(()=>{sessionStorage.setItem('vozen.tts.lastGuild','999');sessionStorage.setItem('vozen.ecosystem.dtoken','fixture-token');sessionStorage.setItem('vozen.ecosystem.authexp',String(Date.now()+3600000));});
 await page.route('https://api.vozen.org/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/bot-profile'))return route.fulfill({status:500,json:{error:'unavailable'}});
  const json=path.endsWith('/guilds')?{guilds:[{id:'999',name:'Overview QA'}]}:path.endsWith('/guild/999')?{config:{},capabilities:{},options:{}}:{};
  await route.fulfill({json});
 });
 await page.goto('/dashboard.html');
 await expect(page.locator('.tts-leaderboard-empty')).toHaveCount(1);
 await expect(page.locator('.tts-leaderboard-empty').first()).toHaveText('The server leaderboard is not available yet.');
 await expect(page.locator('.tts-leaderboard tbody')).toHaveCount(0);
 await page.getByRole('button',{name:'Messages',exact:true}).click();
 await expect(page.locator('#ttsLeaderboard-messages')).toBeVisible();
 await expect(page.locator('.tts-leaderboard-empty')).toHaveCount(1);
 await expect(page.locator('.tts-overview-profile [role=status]')).toContainText('unavailable');
 await expect(page.locator('.tts-overview-profile')).toHaveAttribute('href','#/bot-profile');
});

test('Server rankings exclude expired streaks and survive settings saves',async({page})=>{
 const validAvatar='https://cdn.discordapp.com/embed/avatars/0.png';
 const missingAvatar='https://cdn.discordapp.com/embed/avatars/1.png';
 const entries=[{name:'Most messages',avatar:missingAvatar,count:40,streak:0},{name:'Current streak',avatar:validAvatar,count:9,streak:3}];
 const config={autoread:true};
 await page.route(validAvatar,route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="16" fill="#5865f2"/></svg>'}));
 await page.route(missingAvatar,route=>route.fulfill({status:404}));
 await page.addInitScript(()=>{sessionStorage.setItem('vozen.tts.lastGuild','999');sessionStorage.setItem('vozen.ecosystem.dtoken','fixture-token');sessionStorage.setItem('vozen.ecosystem.authexp',String(Date.now()+3600000));});
 await page.route('https://api.vozen.org/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/guilds'))return route.fulfill({json:{guilds:[{id:'999',name:'Overview QA'}]}});
  if(path.endsWith('/guild/999')){
   const payload={config,capabilities:{},options:{}};
   if(route.request().method()==='POST')Object.assign(config,route.request().postDataJSON());
   else payload.leaderboard={entries};
   return route.fulfill({json:payload});
  }
  await route.fulfill({json:{}});
 });
 await page.goto('/dashboard.html');
 const names=page.locator('.tts-leaderboard tbody .tts-member > span:last-child');
 const avatars=page.locator('.tts-leaderboard tbody .tts-member-avatar');
 await expect(names).toHaveText(['Current streak']);
 await expect.poll(()=>avatars.locator('img').evaluate(img=>img.naturalWidth)).toBe(32);
 await page.getByRole('button',{name:'Messages',exact:true}).click();
 await expect(names).toHaveText(['Most messages','Current streak']);
 await expect(avatars.first().locator('img')).toHaveCount(0);
 await expect(avatars.first()).toHaveText('MM');
 await expect.poll(()=>avatars.nth(1).locator('img').evaluate(img=>img.naturalWidth)).toBe(32);
 await page.locator('[data-tts-view=settings]').click();
 await page.locator('[data-k=autoread]').uncheck();
 await page.locator('#dashSave').click();
 await expect(page.locator('#dashStatus')).toContainText(/saved/i);
 await page.locator('[data-tts-view=overview]').click();
 await expect(names).toHaveText(['Most messages','Current streak']);
 await page.getByRole('button',{name:'Streaks',exact:true}).click();
 await expect(names).toHaveText(['Current streak']);
});
