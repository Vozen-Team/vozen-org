// Uses synthetic API fixtures only. Never writes customer configuration or
// sends Discord messages, even when exercising validation failure/retry.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base = process.env.HELPER_TEST_URL || 'http://127.0.0.1:5179/panel/helper-tracker/';
const demoFeature = process.env.FEATURE_DEMO_FEATURE || 'suggestions';
if (!['suggestions', 'giveaways', 'tickets', 'welcome', 'polls', 'events', 'birthdays', 'levels', 'leaderboard', 'achievements', 'economy', 'temp-channels', 'invites'].includes(demoFeature)) throw new Error('Unknown regression feature');
const invites = demoFeature === 'invites';
const tempChannels = demoFeature === 'temp-channels';
const economy = demoFeature === 'economy';
const achievements = demoFeature === 'achievements';
const giveaway = demoFeature === 'giveaways';
const tickets = demoFeature === 'tickets';
const welcome = demoFeature === 'welcome';
const polls = demoFeature === 'polls';
const events = demoFeature === 'events';
const birthdays = demoFeature === 'birthdays';
const levels = demoFeature === 'levels';
const leaderboard = demoFeature === 'leaderboard';
const defaultFeatureKey = invites ? 'management.invite_tracker' : `${tempChannels ? 'utility' : polls ? 'management' : tickets || welcome ? 'support' : 'community'}.${tempChannels ? 'temp_channels' : demoFeature}`;
const browser = await chromium.launch();
try {
  for (const scenario of ['en', 'pt', 'api-failure', 'invalid', 'media-failure', 'mobile', 'close', 'route-change', 'timeout', 'unauthenticated', 'reduced-motion', 'dismiss-outside', 'dismiss-inside', 'dismiss-padding', 'dismiss-drag', 'dismiss-mobile', 'dismiss-touch', 'dismiss-escape', ...(welcome || polls || events || birthdays || levels || leaderboard || achievements || economy || tempChannels || invites ? ['disabled-feature'] : []), ...(events ? ['limited-capacity'] : []), ...(economy ? ['shop-en','shop-pt','shop-fr','shop-es','shop-de','shop-tr','shop-ar','shop-zh','shop-ru','shop-ko','shop-mobile','shop-failure','shop-channel-error','shop-notice-warning','shop-create-error'] : []), ...(leaderboard ? ['ranking-error', 'ranking-data', 'ranking-many', 'ranking-many-pt', 'ranking-many-mobile', 'ranking-ten', 'emoji-copy', 'emoji-copy-pt'] : [])]) {
    if (process.env.SUGGESTIONS_DEMO_SCENARIO && process.env.SUGGESTIONS_DEMO_SCENARIO !== scenario) continue;
    const page = await browser.newPage(scenario === 'dismiss-touch' ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : {});
    const shopScenario=scenario.startsWith('shop-');
    let shopProducts=[];let shopChannel='';
    let shopOrders=[{id:1,userId:'member',displayName:'Readable member',productName:'T-shirt',price:80,delivery:'manual',roleId:null,status:'pending',createdAt:1700000000000}];
    const shopLocale=scenario.split('-')[1];
    const shopWrites=[];
    const dismissScenario = scenario.startsWith('dismiss-');
    const pt = scenario === 'pt' || scenario.endsWith('-pt');
    const emojiCopy = scenario.startsWith('emoji-copy');
    const featureKey = emojiCopy ? 'utility.emojis' : defaultFeatureKey;
    const many = scenario.startsWith('ranking-many');
    let simulations = 0, writes = 0;
    const config = invites ? {maxEntries:10,includeInviter:true} : tempChannels ? {categoryId:'',nameTemplate:"{user}'s room",maxActive:10} : economy ? {currencyName:'credits',dailyReward:100,workReward:50,workCooldownMinutes:60} : achievements ? {firstThreshold:100,regularThreshold:1000,pillarThreshold:10000,firstRewardRole:'',regularRewardRole:'',pillarRewardRole:''} : emojiCopy ? { maxEntries: 10, animatedOnly: false } : leaderboard ? { maxEntries: many ? 100 : 10, public: true }
      : levels ? { xpMin: 20, xpMax: 20, cooldownSeconds: 60, voiceXpEnabled: false, voiceXpPerMinute: 2, ignoredChannels: [], announceChannel: '', announceTemplate: '{member} reached level {level}!', stackRoles: true, levelRoles: [] }
      : birthdays ? { channel: 'sample-birthdays', message: 'Happy birthday, {user}!', timezone: 'UTC' }
      : events ? { defaultDurationHours: 2, defaultCapacity: scenario === 'limited-capacity' ? 20 : 0, announcementChannel: 'sample-events', reminders: true, reminderHours: 1 }
      : polls ? { channel: '', defaultDurationHours: 24 }
      : welcome ? { channel: 'sample-welcome', message: 'Welcome {member} to {server}!', guideEnabled: true, autoRole: '', sendDm: false }
      : tickets ? { panelChannel: 'sample-support', categoryId: '', staffRole: '', transcriptChannel: '', maxOpen: 1, panelTitle: 'Need support?', panelDescription: 'Open a private ticket.', closeAfterHours: 1 }
      : giveaway ? { defaultDurationHours: 24, defaultWinners: 1, requiredRole: '' }
      : { channel: 'sample-suggestions', voteMode: 'up_down', anonymous: false, cooldownHours: 24, requiredRole: '', staffChannel: '' };
    const feature = { key: featureKey, label: invites ? 'Invite tracker' : tempChannels ? 'Temporary channels' : economy ? 'Economy' : achievements ? 'Achievements' : leaderboard ? 'XP leaderboard' : levels ? 'Levels & XP' : birthdays ? 'Birthdays' : events ? 'Server events' : polls ? 'Polls' : welcome ? 'Welcome' : tickets ? 'Tickets' : giveaway ? 'Giveaways' : 'Suggestions', category: invites ? 'management' : tempChannels ? 'utility' : polls ? 'management' : tickets || welcome ? 'support' : 'community', enabled: scenario !== 'disabled-feature', available: true };
    const localizedLabel = invites ? (pt ? 'Rastreador de convites' : 'Invite tracker') : tempChannels ? (pt ? 'Canais temporários' : 'Temporary channels') : economy ? (pt ? 'Economia' : 'Economy') : achievements ? (pt ? 'Conquistas' : 'Achievements') : leaderboard ? (pt ? 'Classificação de XP' : 'XP leaderboard') : levels ? (pt ? 'Níveis e XP' : 'Levels & XP') : birthdays ? (pt ? 'Aniversários' : 'Birthdays') : events ? (pt ? 'Eventos do servidor' : 'Server events') : polls ? (pt ? 'Sondagens' : 'Polls') : welcome ? (pt ? 'Boas-vindas' : 'Welcome') : tickets ? 'Tickets' : pt ? (giveaway ? 'Sorteios' : 'Sugestões') : feature.label;
    if(shopScenario&&['en','pt','fr','es','de','tr','ar','zh','ru','ko'].includes(shopLocale)) await page.addInitScript(locale=>localStorage.setItem('vozen.lang',locale),shopLocale);
    if (pt) await page.addInitScript(() => localStorage.setItem('vozen.lang', 'pt'));
    if (scenario === 'mobile' || scenario === 'shop-mobile' || scenario === 'dismiss-mobile' || scenario === 'ranking-many-mobile') await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: scenario === 'reduced-motion' ? 'reduce' : 'no-preference' });
    if (scenario === 'timeout') await page.addInitScript(() => {
      const original = window.setTimeout;
      window.setTimeout = (callback, delay, ...args) => original(callback, delay === 20000 ? 200 : delay, ...args);
    });
    if (scenario === 'media-failure') await page.route(`**/feature-demos/${demoFeature}-*.gif`, route => route.fulfill({ status: 404, body: '' }));
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname.replace(/^.*?(?=\/api\/)/, '');
      if(economy&&path.startsWith('/api/economy/')) {
        const method=route.request().method();
        if(method==='GET') {await route.fulfill({json:{guildId:'sample',products:shopProducts,orders:shopOrders,nextCursor:null,staffChannel:shopChannel,failedNotices:scenario==='shop-notice-warning'?1:0}});return;}
        assert.equal(new URL(route.request().url()).searchParams.get('guildId'),'sample');
        const body=route.request().postDataJSON();
        shopWrites.push({path,method,body});
        if(path==='/api/economy/channel') {
          assert.deepEqual(body,{name:'shop-orders'});
          if(scenario==='shop-create-error'){await route.fulfill({status:403,json:{code:'starboard_bot_permissions_required'}});return;}
          shopChannel='30';await route.fulfill({json:{guildId:'sample',channel:{id:'30',name:'shop-orders',type:0},reused:false}});return;
        }
        if(path==='/api/economy/notifications') {
          if(scenario==='shop-channel-error'){await route.fulfill({status:400,json:{code:'shop_invalid_channel'}});return;}
          shopChannel=body.channelId;await route.fulfill({json:{ok:true}});return;
        }
        if(scenario==='shop-failure') {await route.fulfill({status:409,json:{code:'shop_changed'}});return;}
        if(path==='/api/economy/products'&&method==='POST') shopProducts.push({...body,id:shopProducts.length+1,version:1});
        else if(path.startsWith('/api/economy/products/')&&method==='PUT') shopProducts=shopProducts.map(p=>p.id===Number(path.split('/').at(-1))?{...body.product,id:p.id,version:p.version+1}:p);
        else if(method==='DELETE') shopProducts=shopProducts.filter(p=>p.id!==Number(path.split('/').at(-1)));
        else if(path.startsWith('/api/economy/orders/')) shopOrders=shopOrders.map(o=>({...o,status:body.status}));
        await route.fulfill({json:{ok:true}});return;
      }
      let value;
      if (path.endsWith('/simulate')) {
        simulations++;
        assert.equal(path, `/api/config/features/${featureKey}/simulate`);
        assert.equal(route.request().method(), 'POST');
        assert.deepEqual(route.request().postDataJSON().config, config);
        if ((scenario === 'api-failure' || scenario === 'unauthenticated') && simulations === 1) {
          await route.fulfill({ status: scenario === 'unauthenticated' ? 401 : 503, json: { code: scenario === 'unauthenticated' ? 'unauthenticated' : 'unavailable' } }); return;
        }
        if (['close', 'route-change', 'timeout'].includes(scenario) || dismissScenario) await new Promise(resolve => setTimeout(resolve, dismissScenario ? 1500 : 700));
        value = { ok: scenario !== 'invalid', key: feature.key, mode: 'simulation', result: { key: feature.key, would_apply: scenario !== 'invalid', effects: ['Synthetic feature preview'], issues: scenario === 'invalid' ? [{ severity: 'error', message: 'Select a valid channel' }] : [] } };
      } else {
        if (!['GET', 'HEAD'].includes(route.request().method())) writes++;
        if (path === '/api/me') value = { id: 'qa-user', guildId: 'sample', dbOk: true };
        else if (path === '/api/guilds') value = { guilds: [{ id: 'sample', name: 'Sample server', canManage: true }] };
        else if (path === '/api/config/features') value = { guildId: 'sample', features: [feature] };
        else if (path === `/api/config/features/${featureKey}`) value = {
          ...feature, guildId: 'sample', config, defaults: {}, revision: 1,
          schema: { sections: invites ? [{title:'Invite overview',fields:[{key:'maxEntries',label:'Invites shown',kind:'number',min:1,max:50},{key:'includeInviter',label:'Show inviter names',kind:'toggle'}]}] : tempChannels ? [{title:'Temporary voice rooms',fields:[{key:'categoryId',label:'Category',kind:'category'},{key:'nameTemplate',label:'Room name template',kind:'text'},{key:'maxActive',label:'Maximum active rooms',kind:'number',min:1,max:50}]}] : economy ? [{title:'Rewards',fields:Object.keys(config).map(key=>({key,label:key,kind:key==='currencyName'?'text':'number'}))}] : achievements ? [{title:'XP milestones',fields:Object.keys(config).map(key=>({key,label:key,kind:key.endsWith('Role')?'role':'number'}))}] : emojiCopy ? [{title: 'Emoji inventory', fields: [{key:'maxEntries',label:'Emojis shown',kind:'number',min:1,max:100}]}] : leaderboard ? [{ title: 'XP leaderboard', fields: [{ key: 'maxEntries', label: 'Maximum entries', kind: 'number', min: 1, max: 100 }, { key: 'public', label: 'Show the leaderboard publicly', kind: 'toggle' }] }]
            : levels ? [{ title: 'Levels & XP', fields: [{ key: 'xpMin', label: 'XP minimum', kind: 'number' }, { key: 'xpMax', label: 'XP maximum', kind: 'number' }, { key: 'cooldownSeconds', label: 'Cooldown (seconds)', kind: 'number' }, { key: 'voiceXpEnabled', label: 'Voice XP', kind: 'toggle' }, { key: 'voiceXpPerMinute', label: 'Voice XP per minute', kind: 'number' }, { key: 'ignoredChannels', label: 'Excluded channels', kind: 'channels' }, { key: 'announceChannel', label: 'Announcement channel', kind: 'channel' }, { key: 'announceTemplate', label: 'Level-up message', kind: 'text' }, { key: 'stackRoles', label: 'Keep previous level roles', kind: 'toggle' }, { key: 'levelRoles', label: 'Level role rewards', kind: 'tags' }] }]
            : birthdays ? [{ title: 'Birthdays', fields: [{ key: 'channel', label: 'Birthday channel', kind: 'channel' }, { key: 'message', label: 'Birthday message', kind: 'textarea' }, { key: 'timezone', label: 'Time zone', kind: 'text' }] }]
            : events ? [{ title: 'Events', fields: [{ key: 'defaultDurationHours', label: 'Default duration (hours)', kind: 'number' }, { key: 'defaultCapacity', label: 'Default capacity', kind: 'number' }, { key: 'announcementChannel', label: 'Announcement channel', kind: 'channel' }, { key: 'reminders', label: 'Send reminders', kind: 'toggle' }, { key: 'reminderHours', label: 'Reminder before start (hours)', kind: 'number' }] }]
            : polls ? [{ title: 'Polls', fields: [{ key: 'channel', label: 'Default channel', kind: 'channel' }, { key: 'defaultDurationHours', label: 'Default duration (hours)', kind: 'number', min: 1, max: 168 }] }]
            : welcome ? [{ title: 'Welcome message', fields: [{ key: 'channel', label: 'Welcome channel', kind: 'channel' }, { key: 'message', label: 'Welcome message', kind: 'textarea' }, { key: 'guideEnabled', label: 'Orientation buttons', kind: 'toggle' }, { key: 'autoRole', label: 'Automatic role', kind: 'role' }, { key: 'sendDm', label: 'Send welcome DM', kind: 'toggle' }] }]
            : tickets ? [{ title: 'Support workflow', fields: [{ key: 'panelChannel', label: 'Ticket panel channel', kind: 'channel' }, { key: 'categoryId', label: 'Ticket category', kind: 'category' }, { key: 'staffRole', label: 'Staff role to notify', kind: 'role' }, { key: 'transcriptChannel', label: 'Transcript channel', kind: 'channel' }, { key: 'maxOpen', label: 'Open tickets per member', kind: 'number' }, { key: 'panelTitle', label: 'Panel title', kind: 'text' }, { key: 'panelDescription', label: 'Panel description', kind: 'textarea' }, { key: 'closeAfterHours', label: 'SLA reminder (hours)', kind: 'number' }] }]
            : giveaway ? [{ title: 'Giveaway defaults', fields: [{ key: 'defaultDurationHours', label: 'Default duration (hours)', kind: 'number' }, { key: 'defaultWinners', label: 'Default winners', kind: 'number' }, { key: 'requiredRole', label: 'Required role (optional)', kind: 'role' }] }]
            : [{ title: 'Suggestion intake', fields: [{ key: 'channel', label: 'Suggestion channel', kind: 'channel' }, { key: 'voteMode', label: 'Voting mode', kind: 'select', options: [['up_down', 'Support / against'], ['up_only', 'Support only']] }, { key: 'anonymous', label: 'Hide author in the public message', kind: 'toggle' }] }, { title: 'Moderation', fields: [{ key: 'cooldownHours', label: 'Cooldown per member (hours)', kind: 'number' }, { key: 'requiredRole', label: 'Required role (optional)', kind: 'role' }, { key: 'staffChannel', label: 'Staff notification channel (optional)', kind: 'channel' }] }] },
        };
        else if (path === '/api/guild-context') value = { guildId: 'sample', name: 'Sample server', permissions: '8', channels: [...(economy?[{id:'20',name:'shop-staff',type:'text'},{id:'21',name:'voice',type:'voice'}]:[]),{ id: 'sample-events', name: 'events', type: 'text' }, { id: 'sample-polls', name: 'polls', type: 'text' }, { id: 'sample-suggestions', name: 'suggestions', type: 'text' }, { id: 'sample-support', name: 'support', type: 'text' }, { id: 'sample-welcome', name: 'welcome', type: 'text' }], roles: economy?[{id:'123',name:'VIP',position:1,manageable:true},{id:'456',name:'Managed',position:2,manageable:false,managed:true}]:[], hierarchy: { known: true }, capabilities: { channelSelectors: true, roleSelectors: true, permissionPreflight: true } };
        else if (path === '/api/stats') value = { guildId: 'sample', totalCases: 0 };
        else if (path === '/api/cases') value = { cases: [] };
        else if (path === '/api/audit') value = { events: [] };
        else if (path === '/api/activity') value = { activity: [] };
        else if (path === '/api/quotas') value = { plan: 'Free', limits: {}, usage: {} };
        else if (path === '/api/leaderboard') {
          if (scenario === 'ranking-error') {
            await route.fulfill({ status: 503, json: { code: 'unavailable' } }); return;
          }
          value = { guildId: 'sample', enabled: true, entries: many || scenario === 'ranking-ten' ? Array.from({length: many ? 100 : 10}, (_,index) => ({userId:`sample-${index+1}`,displayName:`Member ${index+1}`,rank:index+1,xp:2000-index})) : scenario === 'ranking-data' ? [{ userId: 'sample-member', displayName: 'Membro de teste <b>seguro</b>', rank: 1, xp: 1620 }, { userId: 'unavailable-member', rank: 2, xp: 438 }] : [], maxEntries: config.maxEntries, public: true };
        }
        else { await route.fulfill({ status: 503, json: {} }); return; }
      }
      await route.fulfill({ json: value });
    });
    await page.goto(`${base}#/config/${featureKey}`);
    if(shopScenario) {
      const panel=page.locator('.economy-shop');
      await panel.locator('form input').first().waitFor();
      await page.waitForFunction(()=>!document.querySelector('.economy-shop fieldset').disabled);
      assert.equal(shopWrites.length,0,'viewing the shop does not write');
      const notice=panel.locator('.economy-shop__notifications select');
      assert.equal(await notice.inputValue(),'');
      assert.equal(await notice.locator('option[value="21"]').count(),0,'voice channels cannot receive notices');
      if(scenario==='shop-notice-warning') {
        await panel.getByRole('alert').waitFor();
        console.log('PASS shop-notice-warning');await page.close();continue;
      }
      if(scenario!=='shop-failure') {
        await notice.selectOption('20');
        if(scenario==='shop-channel-error') {
          await panel.getByRole('alert').waitFor();assert.equal(await notice.inputValue(),'');
          assert.equal(shopChannel,'');console.log('PASS shop-channel-error');await page.close();continue;
        }
        await page.waitForFunction(()=>document.querySelector('.economy-shop__notifications select').value==='20');
        assert.equal(shopWrites.filter(w=>w.path==='/api/economy/notifications').length,1);
        assert.equal(shopProducts.length,0,'notification settings do not alter products');
      }

      if(scenario!=='shop-failure') {
        const create=panel.locator('.economy-shop__create-channel');
        await create.locator('input').fill('../invalid');
        assert.equal(await create.locator('button').isDisabled(),true);
        await create.locator('input').fill('shop-orders');
        await create.locator('button').click();
        if(scenario==='shop-create-error'){
          await panel.getByRole('alert').waitFor();assert.equal(shopChannel,'20');
          console.log('PASS shop-create-error');await page.close();continue;
        }
        await page.waitForFunction(()=>document.querySelector('.economy-shop__notifications select').value==='30');
        assert.equal(shopWrites.filter(w=>w.path==='/api/economy/channel').length,1);
        assert.equal(await notice.locator('option[value="30"]').textContent(),'#shop-orders');
        assert.equal(shopProducts.length,0,'channel creation does not alter products');
        if(scenario==='shop-pt'){
          await create.scrollIntoViewIfNeeded();
          await mkdir('output/playwright',{recursive:true});
          await page.screenshot({path:'output/playwright/shop-channel-created-pt.png'});
        }
      }
      await panel.locator('form input').first().fill('T-shirt <b>safe</b>');
      await panel.locator('form input[type=number]').fill('80');
      await panel.locator('button[type=submit]').click();
      if(scenario==='shop-failure') {
        await panel.getByRole('alert').waitFor();
        assert.equal(shopProducts.length,0);assert.equal(await panel.locator('form input').first().inputValue(),'T-shirt <b>safe</b>');
      } else {
        await panel.locator('.economy-shop__row strong').filter({hasText:'T-shirt <b>safe</b>'}).waitFor();
        assert.equal(await panel.locator('.economy-shop__row strong b').count(),0);
        await panel.locator('form input').first().fill('VIP');
        await panel.locator('form select').first().selectOption('role');
        await panel.locator('form select').nth(1).selectOption('123');
        assert.equal(await panel.locator('option[value="456"]').count(),0);
        await panel.locator('button[type=submit]').click();
        await page.waitForFunction(()=>document.querySelectorAll('.economy-shop__row').length===2);
        assert.equal(shopProducts[1].roleId,'123');assert.equal(shopProducts[1].delivery,'role');
        await panel.locator('.economy-shop__row').nth(1).getByRole('button').first().click();
        await panel.locator('form input[type=number]').fill('120');
        await panel.locator('button[type=submit]').click();
        await page.waitForFunction(()=>document.querySelector('.economy-shop form input').value==='');
        assert.equal(shopProducts[1].price,120);assert.equal(shopProducts[1].version,2);
        if(['shop-en','shop-pt','shop-mobile'].includes(scenario)){await mkdir('output/playwright',{recursive:true});await panel.screenshot({path:`output/playwright/${scenario}-products.png`});}
        page.on('dialog',dialog=>dialog.accept());
        await panel.locator('.economy-shop__row').first().getByRole('button').last().click();
        await page.waitForFunction(()=>document.querySelectorAll('.economy-shop__row').length===1);
        await panel.locator('.economy-shop__tabs button').nth(1).click();
        await panel.getByText('Readable member',{exact:false}).waitFor();
        await panel.locator('.economy-shop__row').getByRole('button').last().click();
        await page.waitForFunction(()=>document.querySelectorAll('.economy-shop__row button').length===0);
        assert.equal(shopOrders[0].status,'refunded');
        assert.equal(shopWrites.filter(w=>w.path.includes('orders')).length,1);
        await mkdir('output/playwright',{recursive:true});
        await panel.screenshot({path:`output/playwright/${scenario}.png`});
      }
      assert.equal(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth),true);
      assert.equal(writes,0,'shop edits must not overwrite reward configuration');
      console.log(`PASS ${scenario}`);await page.close();continue;
    }
    if (emojiCopy) {
      const control = page.getByRole('spinbutton', {name: pt ? /Emojis apresentados no/ : /Emojis listed by/});
      await control.waitFor();
      await control.locator('..').getByText(pt ? /Não limita a utilização/ : /does not limit emoji usage/).waitFor();
      assert.equal(await control.inputValue(), '10');
      assert.equal(writes, 0);
      console.log(`PASS ${scenario}`);
      await page.close();
      continue;
    }
    if (leaderboard) {
      const preview = many || scenario === 'ranking-ten'
        ? page.locator('section.config-section').filter({has:page.locator('.template-list')})
        : page.locator('section.config-section').filter({ has: page.getByRole('heading', { name: /Leaderboard preview|Pré-visualização da classificação/, exact: true }) });
      if (many || scenario === 'ranking-ten') {
        const visibility = page.getByRole('checkbox', {name: pt ? /Mostrar a resposta do \/leaderboard a todos no canal/ : /Show the \/leaderboard response to everyone in the channel/});
        await visibility.waitFor();
        assert.equal(await visibility.isChecked(), true);
        await page.getByText(pt
          ? 'Ligado: todos no canal veem a resposta. Desligado: só quem usa o comando vê a resposta.'
          : 'On: everyone in the channel can see the response. Off: only the person using the command can see it.', {exact:true}).waitFor();
        const control = page.getByRole('spinbutton', {name: pt ? /Máximo de pessoas na classificação/ : /Maximum members in/});
        await control.waitFor();
        await preview.getByText('#1 · Member 1', {exact:true}).waitFor();
        assert.equal(await control.inputValue(), String(config.maxEntries));
        assert.equal(await control.getAttribute('max'), '100');
        assert.ok((await control.boundingBox()).y < (await preview.boundingBox()).y, 'settings precede preview');
        assert.equal(await preview.locator('.template-row').count(), 10);
        assert.equal(await preview.getByText('…', {exact:true}).count(), many ? 1 : 0);
        if (many) await preview.getByText(pt ? /Mais 90 pessoas/ : /90 more members/).waitFor();
        await mkdir('output/playwright', {recursive:true});
        if (scenario !== 'ranking-many-mobile') await page.setViewportSize({width:1280,height:1800});
        await page.screenshot({path:`output/playwright/leaderboard-settings-${scenario}.png`,fullPage:true});
      }
      if (scenario === 'ranking-error') {
        await preview.getByRole('alert').waitFor();
        assert.equal(await preview.getByText(/No eligible XP data yet/).count(), 0, 'an API failure is not an empty leaderboard');
      } else if (scenario === 'ranking-data') {
        await preview.getByText('#1 · Membro de teste <b>seguro</b>', { exact: true }).waitFor();
        await preview.getByText('#2 · unavailable-member', { exact: true }).waitFor();
        assert.equal(await preview.locator('b b').count(), 0, 'member names are text, not HTML');
        assert.equal(await preview.getByRole('alert').count(), 0);
        assert.equal(await preview.getByText(/No eligible XP data yet/).count(), 0);
      } else if (scenario === 'en') {
        await preview.getByText(/No eligible XP data yet/).waitFor();
      }
    }
    if (events) {
      const capacity = page.getByRole('spinbutton', { name: pt ? /Limite de participantes \(opcional\)/ : /Participant limit \(optional\)/ });
      await capacity.waitFor();
      assert.equal(await capacity.inputValue(), String(config.defaultCapacity), 'presentation must preserve unlimited and configured limits');
      await capacity.locator('..').getByText(pt ? '0 = sem limite.' : '0 = unlimited.', { exact: true }).waitFor();
      if (['en','pt','mobile'].includes(scenario)) {
        await mkdir('output/playwright', { recursive: true });
        await capacity.locator('..').screenshot({ path: `output/playwright/events-capacity-${scenario}.png` });
      }
    }
    if (polls) {
      const channel = page.getByRole('combobox', { name: pt ? /Canal predefinido \(opcional\)/ : /Default channel \(optional\)/ });
      await channel.waitFor();
      assert.equal(await channel.inputValue(), '', 'the command channel remains the default; do not choose a channel automatically');
      assert.equal(await channel.locator('option:checked').textContent(), pt ? 'Canal onde usas /poll' : 'Channel where you use /poll');
      await page.getByText(pt
        ? 'Deixa vazio para publicar a sondagem no canal onde usares /poll. Se escolheres um canal, as sondagens são publicadas aí.'
        : 'Leave empty to post each poll in the channel where you use /poll. Choose a channel to send all polls there.', { exact: true }).waitFor();
      if (['en','pt','mobile'].includes(scenario)) {
        await mkdir('output/playwright', { recursive: true });
        await channel.locator('..').screenshot({ path: `output/playwright/polls-channel-${scenario}.png` });
      }
    }
    const simulate = page.getByRole('button', { name: pt ? 'Simular configuração' : 'Simulate configuration', exact: true });
    await simulate.click();
    const dialog = page.getByRole('dialog', { name: localizedLabel, exact: true });
    await dialog.waitFor();
    if (dismissScenario) {
      const box = await dialog.boundingBox();
      assert.ok(box);
      const outside = { x: Math.max(1, box.x - 8), y: box.y + 100 };
      const padding = { x: box.x + 10, y: box.y + 100 };
      if (scenario === 'dismiss-inside') {
        await dialog.getByRole('heading', { name: feature.label, exact: true }).click();
        assert.equal(await dialog.isVisible(), true, 'content click stays open');
        await page.keyboard.press('Escape');
      } else if (scenario === 'dismiss-padding') {
        await page.mouse.click(padding.x, padding.y);
        assert.equal(await dialog.isVisible(), true, 'dialog padding is not backdrop');
        await page.keyboard.press('Escape');
      } else if (scenario === 'dismiss-drag') {
        await page.mouse.move(padding.x, padding.y); await page.mouse.down();
        await page.mouse.move(outside.x, outside.y); await page.mouse.up();
        assert.equal(await dialog.isVisible(), true, 'dragging out of the form stays open');
        await page.mouse.move(outside.x, outside.y); await page.mouse.down();
        await page.mouse.move(padding.x, padding.y); await page.mouse.up();
        assert.equal(await dialog.isVisible(), true, 'dragging into the form stays open');
        await page.mouse.click(outside.x, outside.y);
      } else if (scenario === 'dismiss-touch') await page.touchscreen.tap(outside.x, outside.y);
      else if (scenario === 'dismiss-escape') await page.keyboard.press('Escape');
      else await page.mouse.click(outside.x, outside.y);
      await dialog.waitFor({ state: 'hidden', timeout: 2000 });
      assert.equal(await simulate.evaluate(element => element === document.activeElement), true, 'focus returns to the simulation trigger');
      await new Promise(resolve => setTimeout(resolve, 1600));
      assert.equal(await dialog.count(), 0, 'late validation response cannot reopen the modal');
      assert.equal(writes, 0, 'dismissal must not write configuration');
      assert.equal(new URL(page.url()).hash, `#/config/${featureKey}`, 'backdrop click must not activate underlying navigation');
      console.log(`PASS ${demoFeature}-demo-${scenario}`);
      await page.close(); continue;
    }
    assert.equal(await dialog.locator('video').count(), 0, 'no video player or native media controls');
    const animation = dialog.locator('img.feature-simulation__animation');
    assert.equal(await animation.count(), 1, `${feature.label} must include its own animation, independent of API validation`);
    assert.equal(await animation.getAttribute('src'), `/panel/helper-tracker/feature-demos/${demoFeature}-${pt ? 'pt' : 'en'}.gif`);
    assert.equal(await dialog.locator('.feature-simulation__steps p').count(), 3);
    if (scenario === 'disabled-feature') await dialog.getByText('This feature is disabled in the editor.', { exact: false }).waitFor();
    if (scenario === 'media-failure') {
      await dialog.getByRole('alert').filter({ hasText: 'animation could not load' }).waitFor();
      assert.equal(await dialog.locator('.feature-simulation__steps').isVisible(), true);
    } else {
      await page.waitForFunction(() => {
        const image = document.querySelector('.feature-simulation__animation');
        return image?.complete && image.naturalWidth > 0;
      });
      assert.equal(await animation.evaluate(element => element.currentSrc.endsWith('.png')), scenario === 'reduced-motion', 'reduced motion uses the static poster');
      if (scenario === 'en') {
        const before = await animation.screenshot();
        await new Promise(resolve => setTimeout(resolve, 2600));
        const after = await animation.screenshot();
        assert.ok(!before.equals(after), 'GIF advances automatically without pressing play');
      }
    }
    if (['api-failure', 'unauthenticated', 'timeout'].includes(scenario)) {
      await dialog.getByRole('alert').filter({ hasText: 'Could not validate' }).waitFor();
      assert.equal(await animation.isVisible(), true, 'API failure must not hide the example');
      assert.equal(await dialog.getByText('The API validated these settings.', { exact: false }).count(), 0);
      if (scenario !== 'timeout') {
        await dialog.getByRole('button', { name: 'Retry validation', exact: true }).click();
        await dialog.getByText('The API validated these settings.', { exact: false }).waitFor();
        assert.equal(simulations, 2);
      }
    } else if (scenario === 'invalid') await dialog.getByText('Select a valid channel', { exact: true }).waitFor();
    if (scenario === 'mobile' || scenario === 'en' || pt || scenario === 'api-failure') {
      await mkdir('output/playwright', { recursive: true });
      await dialog.screenshot({ path: `output/playwright/${demoFeature}-demo-${scenario}.png` });
      assert.equal(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth), true, 'no horizontal modal overflow');
    }
    if (scenario === 'route-change') {
      await page.evaluate(() => { window.location.hash = '#/features'; });
    } else await dialog.getByRole('button', { name: pt ? 'Fechar demonstração' : 'Close demonstration', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    await new Promise(resolve => setTimeout(resolve, scenario === 'close' || scenario === 'route-change' ? 800 : 20));
    assert.equal(await dialog.count(), 0, 'late response cannot reopen a closed demo');
    assert.equal(writes, 0, 'opening, playing, retrying and closing a demo must not write settings');
    assert.equal(await page.getByRole('button', { name: 'Send a test to Discord', exact: true }).count(), 0);
    console.log(`PASS ${demoFeature}-demo-${scenario}`);
    await page.close();
  }
} finally { await browser.close(); }
