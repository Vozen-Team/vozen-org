import {test,expect} from '@playwright/test';
for(const width of [320,390,768,900,1440])test(`TTS settings workspace preserves fields and save boundary at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});let writes=[];
 const config={autoread:true,readBots:false,textInVoice:false,antispam:true,translationEnabled:false,ttsChannelId:'123456789012345678',defaultVoice:'en_US-amy-medium',xsaid:true,autojoin:true,greetOnJoin:false,stayInCall:false,streakAnnounce:false,soundboard:true,votePromos:false,maxChars:600,ratePerMin:20,locale:'en',priorityRoleId:null,blockedRoleId:null};
 const meta={config,profiles:[],capabilities:{channelProfiles:true,ttsChannelId:true,defaultVoice:true},options:{channels:[{id:'123456789012345678',label:'#tts'}],voices:[{id:'en_US-amy-medium',label:'Amy'}],locales:[{id:'en',label:'English'}],roles:[],voiceChannels:[]}};
 await page.addInitScript(()=>{sessionStorage.setItem('vozen.ecosystem.dtoken','fixture-token');sessionStorage.setItem('vozen.ecosystem.authexp',String(Date.now()+3600000));});
 await page.route('https://api.vozen.org/**',async route=>{const u=new URL(route.request().url());let json={user:{id:'fixture',username:'Fixture'},plus:{active:false},pass:{active:false,servers:[]}};if(u.pathname==='/api/dashboard/guilds')json={guilds:[{id:'999',name:'Vozen community',permissions:'32'}]};else if(u.pathname==='/api/dashboard/guild/999'){if(route.request().method()==='POST'){const patch=route.request().postDataJSON();writes.push(patch);Object.assign(config,patch);}json=meta;}await route.fulfill({json});});
 await page.route('https://static.cloudflareinsights.com/**',r=>r.fulfill({body:''}));await page.route('https://cdn.discordapp.com/**',r=>r.abort());
 await page.goto('/dashboard.html#/quick');
 await page.locator('.dash-server').click();
 await expect(page.locator('[data-tts-view=overview]')).toHaveAttribute('aria-current','page');
 await expect(page.locator('#ttsReadyTitle')).toBeVisible();
 await expect(page.locator('[data-tts-view=quick]')).toHaveCount(0);
 await expect(page.getByRole('button',{name:/continue setup/i})).toHaveCount(0);
 await expect(page.locator('[data-tts-view]')).toHaveCount(3);
 await page.locator('[data-tts-view=settings]').click();
 await expect(page.locator('[data-tts-view=settings]')).toHaveAttribute('aria-current','page');
 await expect(page.locator('[data-tts-view="bot-profile"]')).toBeVisible();
 await expect(page.getByRole('tab')).toHaveCount(4);
 await expect(page.locator('#ttsWorkspace h1:visible')).toHaveCount(1);
 await expect(page.locator('[data-k=ttsChannelId]')).toBeVisible();
 await expect(page.locator('[data-k=defaultVoice]')).toBeVisible();
 if(width===320||width===1440)await page.screenshot({path:`test-results/tts-settings-reading-${width}.png`,fullPage:width===320});
 await page.locator('[data-k=autoread]').uncheck();
 await page.locator('[data-k=readBots]').check();
 await page.getByRole('tab',{name:'Community',exact:true}).click();
 await page.locator('[data-k=soundboard]').uncheck();
 await page.getByRole('tab',{name:'Access & Limits',exact:true}).click();
 await page.locator('[data-k=maxChars]').fill('700');
 await page.getByRole('tab',{name:'Reading & Voice',exact:true}).click();
 await expect(page.locator('[data-k=autoread]')).not.toBeChecked();
 expect(writes).toHaveLength(0);
 await page.locator('#dashSave').click();
 await expect(page.locator('#dashStatus')).toContainText(/saved/i);
 expect(writes).toEqual([{autoread:false,readBots:true,soundboard:false,maxChars:700}]);
 await page.getByRole('tab',{name:'Channel Profiles',exact:true}).click();await expect(page.locator('#dashProfileChannel')).toBeVisible();await expect(page.locator('[data-p]')).toHaveCount(10);await expect(page.locator('[data-p=translationEnabled]')).toHaveAccessibleName('Automatic translation');await expect(page.locator('#dashRoot [data-k]')).toHaveCount(19);await page.evaluate(()=>scrollTo(0,0));
 await expect(page.locator('#ttsServerSelect')).toHaveValue('999');await page.evaluate(()=>document.fonts.ready);expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);for(const control of await page.locator('.workspace-sidebar select').all()){await expect(control).toHaveCSS('align-items','center');await expect(control).toHaveCSS('white-space','nowrap');await expect(control).toHaveCSS('padding-right','12px');}await page.screenshot({path:`test-results/tts-settings-${width}.png`,fullPage:width<900});
 await expect(page.locator('#dashBack')).toHaveCount(0);
 await expect(page.locator('#ttsServerSelect option').last()).toHaveText('Choose another server');
 await page.locator('#ttsServerSelect').selectOption('__choose_server__');
 await expect(page.locator('.dash-server')).toBeVisible();
 expect(writes).toHaveLength(1);
});

async function settingsFixture(page,{profiles=true}={}){
 const config={autoread:true,readBots:false,textInVoice:false,antispam:true,translationEnabled:false,ttsChannelId:'123',defaultVoice:'amy',xsaid:true,autojoin:true,greetOnJoin:false,stayInCall:false,streakAnnounce:false,soundboard:true,votePromos:false,maxChars:600,ratePerMin:20,locale:'en',priorityRoleId:null,blockedRoleId:null};
 const meta={config,channelProfiles:[],capabilities:{channelProfiles:profiles,ttsChannelId:true,defaultVoice:true},options:{channels:[{id:'123',label:'#tts'}],voices:[{id:'amy',label:'Amy'}],locales:[{id:'en',label:'English'}],roles:[],voiceChannels:[]}};
 const writes=[];let failNext=false;
 await page.addInitScript(()=>{sessionStorage.setItem('vozen.tts.lastGuild','999');sessionStorage.setItem('vozen.ecosystem.dtoken','fixture-token');sessionStorage.setItem('vozen.ecosystem.authexp',String(Date.now()+3600000));});
 await page.route('https://api.vozen.org/**',async route=>{
  const path=new URL(route.request().url()).pathname,method=route.request().method();
  let json={user:{id:'fixture',username:'Fixture'},plus:{active:false},pass:{active:false,servers:[]}};
  if(path==='/api/dashboard/guilds')json={guilds:[{id:'999',name:'Settings QA'}]};
  if(path==='/api/dashboard/guild/999'){
   if(method==='POST'){
    const patch=route.request().postDataJSON();writes.push(patch);
    if(failNext){failNext=false;await route.fulfill({status:500,json:{error:'unavailable'}});return;}
    Object.assign(config,patch);
   }json=meta;
  }
  if(path==='/api/dashboard/guild/999/profile/123'){
   if(method==='POST'){const patch=route.request().postDataJSON();writes.push({profile:patch});meta.channelProfiles=[{channelId:'123',...patch}];}
   if(method==='DELETE'){writes.push({deletedProfile:'123'});meta.channelProfiles=[];await route.fulfill({status:204});return;}
   json=meta;
  }
  await route.fulfill({json});
 });
 await page.route('https://static.cloudflareinsights.com/**',r=>r.fulfill({body:''}));
 return {writes,fail:()=>{failNext=true;}};
}

test('Settings keeps drafts across keyboard, history, profile writes, failed saves and language changes',async({page})=>{
 const {writes,fail}=await settingsFixture(page);
 await page.goto('/dashboard.html#/reading');
 await expect(page.getByRole('tab',{name:'Reading & Voice'})).toHaveAttribute('aria-selected','true');
 await page.locator('[data-k=readBots]').check();
 await page.getByRole('tab',{name:'Community',exact:true}).click();
 await page.keyboard.press('ArrowRight');
 await expect(page.getByRole('tab',{name:'Channel Profiles'})).toBeFocused();
 await page.locator('#dashProfileChannel').selectOption('123');
 await page.locator('[data-p=autoRead]').selectOption('true');
 await page.locator('#dashProfileSave').click();
 await expect(page.locator('#dashProfileStatus')).toContainText(/saved/i);
 expect(writes).toHaveLength(1);expect(writes[0].profile.autoRead).toBe(true);
 await page.goBack();
 await expect(page.getByRole('tab',{name:'Community',exact:true})).toHaveAttribute('aria-selected','true');
 await page.goForward();
 await expect(page.locator('#dashProfileChannel')).toBeVisible();
 await page.locator('[data-p=autoRead]').selectOption('false');
 await page.locator('#dashSave').click();
 await expect(page.locator('#dashStatus')).toContainText(/saved/i);
 expect(writes[1]).toEqual({readBots:true});
 await expect(page.locator('[data-p=autoRead]')).toHaveValue('false');
 await page.getByRole('tab',{name:'Reading & Voice'}).click();
 await expect(page.locator('[data-k=readBots]')).toBeChecked();
 await page.locator('[data-k=autoread]').uncheck();
 fail();await page.locator('#dashSave').click();
 await expect(page.locator('#dashStatus')).toContainText(/couldn.t save/i);
 await expect(page.locator('[data-k=autoread]')).not.toBeChecked();
 await expect(page.locator('#dashSave')).toBeEnabled();
 await page.evaluate(()=>{localStorage.setItem('vozen.lang','pt');dispatchEvent(new Event('vozen:languagechange'));});
 await expect(page.locator('#dashRoot h1')).toHaveText('Definições');
 await expect(page.locator('[data-k=autoread]')).not.toBeChecked();
 await page.locator('#dashDiscard').click();
 await expect(page.locator('[data-k=autoread]')).toBeChecked();
 await page.locator('[data-settings-section=profiles]').click();
 await expect(page.locator('[data-p=autoRead]')).toHaveValue('false');
 await page.locator('#dashProfileDelete').click();
 await expect(page.locator('#dashProfileStatus')).toContainText(/guardad/i);
 await expect(page.locator('#dashProfileDelete')).toBeDisabled();
 expect(writes.at(-1)).toEqual({deletedProfile:'123'});
});

for(const section of ['reading','community','profiles','limits'])test(`Legacy ${section} links restore the selected server and section`,async({page})=>{
 const {writes}=await settingsFixture(page);
 await page.goto('/dashboard.html#/'+section);
 await expect(page.locator('[data-settings-section='+section+']')).toHaveAttribute('aria-selected','true');
 await page.reload();
 await expect(page.locator('[data-settings-panel='+section+']')).toBeVisible();
 await expect(page.locator('#ttsServerSelect')).toHaveValue('999');
 expect(writes).toEqual([]);
});

test('Settings hides unsupported channel profiles and preserves the exit guard',async({page})=>{
 await settingsFixture(page,{profiles:false});
 await page.goto('/dashboard.html#/profiles');
 await expect(page.getByRole('tab')).toHaveCount(3);
 await expect(page.locator('[data-settings-panel=reading]')).toBeVisible();
 await page.locator('[data-k=readBots]').check();
 page.once('dialog',dialog=>dialog.dismiss());
 await page.locator('[data-tts-view=overview]').click();
 await expect(page.locator('[data-k=readBots]')).toBeChecked();
 await expect(page.locator('[data-tts-view=settings]')).toHaveAttribute('aria-current','page');
});

test('Rejecting browser Back keeps the edited Settings section and its URL',async({page})=>{
 await settingsFixture(page);
 await page.goto('/dashboard.html');
 await page.locator('[data-tts-view=settings]').click();
 await page.getByRole('tab',{name:'Access & Limits'}).click();
 await page.locator('[data-k=maxChars]').fill('700');
 page.once('dialog',dialog=>dialog.dismiss());
 await page.evaluate(()=>history.go(-2));
 await expect(page).toHaveURL(/#\/settings\/limits$/);
 await expect(page.getByRole('tab',{name:'Access & Limits'})).toHaveAttribute('aria-selected','true');
 await expect(page.locator('[data-k=maxChars]')).toHaveValue('700');
});
