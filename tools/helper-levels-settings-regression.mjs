// Actual rendered UI, synthetic APIs only: no Discord messages or real writes.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.HELPER_TEST_URL || 'http://127.0.0.1:5179/panel/helper-tracker/';
const fields = [
  {key:'xpMin',kind:'number',min:1,max:1000},{key:'xpMax',kind:'number',min:1,max:2000},{key:'cooldownSeconds',kind:'number',min:0,max:3600},
  {key:'voiceXpEnabled',kind:'toggle'},{key:'voiceXpPerMinute',kind:'number',min:0,max:30},{key:'ignoredChannels',kind:'channels'},
  {key:'levelRoles',kind:'tags'},{key:'stackRoles',kind:'toggle'},{key:'announceChannel',kind:'channel'},{key:'announceTemplate',kind:'text'},
].map(field => ({...field,label:field.key}));
const waitFor = async predicate => {
  const deadline = Date.now() + 7000;
  while (!predicate() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve,50));
  assert.ok(predicate(),'expected isolated autosave did not complete');
};
const browser = await chromium.launch();
try {
  for (const scenario of ['en','pt','mobile','voice','exclusions','rewards','saved-reward','missing-resources','future-field','save-failure','keyboard','premium','disabled-feature','preview-desktop','preview-mobile','preview-short','preview-tablet','preview-pt','preview-small','preview-breakpoint']) {
    if (process.env.LEVELS_SETTINGS_SCENARIO && !process.env.LEVELS_SETTINGS_SCENARIO.split(',').includes(scenario)) continue;
    const pt = scenario === 'pt' || scenario === 'preview-pt';
    const previewScenario = scenario.startsWith('preview-');
    const premium = scenario === 'premium' || previewScenario;
    const narrow = ['mobile','preview-mobile','preview-short'].includes(scenario);
    const page = await browser.newPage({viewport:{width:narrow ? 390 : scenario === 'preview-small' ? 320 : scenario === 'preview-breakpoint' ? 740 : scenario === 'preview-tablet' ? 900 : 1440,height:scenario === 'preview-short' ? 600 : previewScenario ? 844 : 1000}});
    if (pt) await page.addInitScript(() => localStorage.setItem('vozen.lang','pt'));
    if (scenario === 'preview-small') await page.addInitScript(() => sessionStorage.setItem('vozen.navuser',JSON.stringify({user:{username:'VeryLongDiscordUsernameForPreview'}})));
    const initial = {xpMin:15,xpMax:30,cooldownSeconds:60,voiceXpEnabled:false,voiceXpPerMinute:2,ignoredChannels:[],levelRoles:[],stackRoles:true,announceChannel:'',announceTemplate:'{member} reached level {level}!'};
    if (scenario === 'future-field') initial.futureSetting = 'Keep this';
    if (scenario === 'saved-reward') initial.levelRoles = ['3=99'];
    let saved = structuredClone(initial), writes = 0, revision = 1;
    const mutations = [];
    const feature = {key:'community.levels',label:'Levels & XP',category:'community',enabled:scenario !== 'disabled-feature',available:true};
    await page.route('**/api/**',async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname.replace(/^.*?(?=\/api\/)/,'');
      let value;
      if (request.method() !== 'GET') mutations.push(path);
      if (path === '/api/me') value = {id:'qa-user',guildId:'10',dbOk:true};
      else if (path === '/api/guilds') value = {guilds:[{id:'10',name:'Sample server',canManage:true}]};
      else if (path === '/api/guild-context') value = {guildId:'10',name:'Sample server',permissions:'8',channels:[{id:'20',name:'general',type:'text'},{id:'21',name:'announcements',type:'text'}],roles:[{id:'10',name:'everyone',position:0},{id:'30',name:'Active member',position:1,manageable:true},{id:'31',name:'Administrator',position:10,manageable:false},{id:'32',name:'Integration',position:2,managed:true}],hierarchy:{known:true},capabilities:{channelSelectors:scenario !== 'missing-resources',roleSelectors:scenario !== 'missing-resources',permissionPreflight:true},stale:false};
      else if (path === '/api/config/features') value = {guildId:'10',features:[feature,...(premium ? [{key:'studio.rank_card',premium_unlocked:true}] : [])]};
      else if (path === '/api/config/features/community.levels') {
        if (request.method() === 'PUT') {
          writes++;
          const body = request.postDataJSON();
          assert.equal(body.expected_revision,revision);
          assert.equal(body.enabled,feature.enabled);
          assert.equal(body.config.bannerEnabled,true,'card cannot be disabled');
          assert.equal('rankCard' in body.config,premium,'only Premium saves styles');
          if (scenario === 'save-failure') {await route.fulfill({status:503,json:{code:'temporary_failure'}});return;}
          saved = body.config; revision++;
        }
        value = {...feature,guildId:'10',config:saved,defaults:{},revision,schema:{sections:[{title:'XP progression',description:'Tune XP',fields:[...fields,...(scenario === 'future-field' ? [{key:'futureSetting',label:'Future setting',kind:'text'}] : [])]}]}};
      } else if (path.endsWith('/preflight')) value = {guildId:'10',ok:true,issues:[]};
      else if (path === '/api/stats') value = {guildId:'10',totalCases:0};
      else if (path === '/api/cases') value = {cases:[]};
      else if (path === '/api/audit') value = {events:[]};
      else if (path === '/api/activity') value = {activity:[]};
      else if (path === '/api/quotas') value = {plan:premium ? 'Premium' : 'Free',limits:{},usage:{}};
      else {await route.fulfill({status:503,json:{}});return;}
      await route.fulfill({json:value});
    });
    await page.goto(`${base}#/config/community.levels`);
    const setup = page.locator('.levels-settings');
    await setup.waitFor();
    const voice = setup.locator('details').filter({has:page.locator('summary').filter({hasText:pt ? 'XP em canais de voz' : 'Voice channel XP'})});
    const exclusions = setup.locator('details').filter({has:page.locator('summary').filter({hasText:pt ? 'Canais sem XP' : 'Channels without XP'})});
    const rewards = setup.locator('details').filter({has:page.locator('summary').filter({hasText:pt ? 'Recompensas por nível' : 'Level rewards'})});
    assert.equal(await setup.locator('details[open]').count(),0,'optional settings start collapsed without changing their values');
    assert.equal(await setup.getByRole('spinbutton').count(),3,'only the three core XP fields are initially visible');
    assert.equal(await setup.getByRole('combobox').count(),1,'only announcement destination is initially visible');
    assert.equal(writes,0,'opening or expanding the UI must not save defaults');
    const announcement = setup.getByRole('combobox',{name:pt ? /^Canal dos avisos/ : /^Announcement channel/});
    assert.equal(await announcement.locator('option:checked').innerText(),pt ? 'Mesmo canal da mensagem' : 'Same channel as the message');
    if (scenario === 'voice') {
      await voice.locator('summary').click();
      assert.equal(await voice.getByRole('spinbutton').count(),0);
      await voice.getByRole('checkbox').check();
      await waitFor(() => saved.voiceXpEnabled === true);
      await voice.getByRole('spinbutton').fill('4');
      await waitFor(() => saved.voiceXpPerMinute === 4);
      await voice.getByRole('checkbox').uncheck();
      await waitFor(() => saved.voiceXpEnabled === false);
      assert.equal(saved.voiceXpPerMinute,4,'hiding voice options keeps the saved rate');
    } else if (scenario === 'exclusions') {
      await exclusions.locator('summary').click();
      await exclusions.getByRole('checkbox',{name:'#general',exact:true}).check();
      await waitFor(() => saved.ignoredChannels.length === 1);
      assert.deepEqual(saved.ignoredChannels,['20']);
      assert.match(await exclusions.locator('summary').innerText(),/1 selected/);
    } else if (['rewards','saved-reward','missing-resources'].includes(scenario)) {
      await rewards.locator('summary').click();
      const role = rewards.getByRole('combobox',{name:'Give this role',exact:true});
      if (scenario === 'missing-resources') {
        assert.equal(await role.isDisabled(),true);
        assert.equal(await rewards.getByRole('button',{name:'Add reward',exact:true}).isDisabled(),true);
        assert.equal(await announcement.isDisabled(),true);
      } else if (scenario === 'saved-reward') {
        await rewards.getByText('Level 3 · Saved role (99)',{exact:true}).waitFor();
        assert.equal(writes,0,'missing saved roles must not be silently deleted');
      } else {
        assert.equal(await role.locator('option[value="31"]').evaluate(option => option.disabled),true,'roles above Helper must stay unavailable');
        assert.equal(await role.locator('option[value="10"],option[value="32"]').count(),0);
        await role.selectOption('30');
        await rewards.getByRole('button',{name:'Add reward',exact:true}).click();
        await waitFor(() => saved.levelRoles.length === 1);
        assert.deepEqual(saved.levelRoles,['5=30']);
        await rewards.getByText('Level 5 · @Active member',{exact:true}).waitFor();
        await rewards.getByRole('checkbox').uncheck();
        await waitFor(() => saved.stackRoles === false);
        await rewards.getByRole('button',{name:'Remove Level 5 · @Active member',exact:true}).click();
        await waitFor(() => saved.levelRoles.length === 0);
      }
    } else if (scenario === 'save-failure') {
      await announcement.selectOption('21'); await waitFor(() => writes === 1);
      await page.getByText('Changes not saved',{exact:true}).waitFor();
      assert.deepEqual(saved,initial);
    } else if (scenario === 'keyboard') {
      await voice.locator('summary').focus(); await page.keyboard.press('Enter');
      assert.equal(await voice.getAttribute('open'),'');
      await voice.getByRole('checkbox').focus(); await page.keyboard.press('Space');
      await waitFor(() => saved.voiceXpEnabled === true);
    } else if (previewScenario) {
      const appearance = page.locator('.levels-customization');
      await appearance.locator('summary').click();
      const preview = appearance.locator('.preview-panel');
      assert.equal(await preview.evaluate(element => getComputedStyle(element).position),'sticky');
      await appearance.getByRole('button',{name:'Banners',exact:true}).click();
      await waitFor(() => saved.rankCard?.background_preset === 'aurora-lake');
      const lastBanner = appearance.locator('.banner-option').last();
      await lastBanner.click();
      await waitFor(() => saved.rankCard?.background_preset === 'lavender-storm');
      const visiblePreview = async () => {
        const card = await preview.boundingBox();
        const viewport = await page.locator('.workspace-main').boundingBox();
        const header = await page.locator('.workspace-global-nav').boundingBox();
        assert.ok(card.y >= Math.max(viewport.y,header.y + header.height,0) - 1 && card.y + card.height <= Math.min(viewport.y + viewport.height, page.viewportSize().height) + 1,'the entire preview stays inside the visible viewport below navigation');
        assert.equal(await preview.evaluate(element => {const box=element.getBoundingClientRect();return element.contains(document.elementFromPoint(box.x + box.width / 2,box.y + box.height / 2));}),true,'the preview is not hidden behind another panel');
        assert.equal(await appearance.evaluate(element => element.scrollWidth > element.clientWidth),false);
        const cardBody = await preview.locator('.rank-preview').boundingBox(), content = await preview.locator('.rank-content').boundingBox();
        assert.ok(content.y >= cardBody.y && content.y + content.height <= cardBody.y + cardBody.height,'names and XP must not be cropped by the compact preview');
      };
      await visiblePreview();
      const restore = appearance.locator('.rank-actions').getByRole('button');
      await restore.scrollIntoViewIfNeeded();
      await visiblePreview();
      const previewBox = await preview.boundingBox(), restoreBox = await restore.boundingBox();
      assert.ok(restoreBox.y >= previewBox.y + previewBox.height,'the preview must not cover the last control');
      if (process.env.LEVELS_SETTINGS_CAPTURE !== '0') {
        await mkdir('output/playwright',{recursive:true});
        await page.screenshot({path:`output/playwright/rank-${scenario}.png`});
      }
      await appearance.locator('.banner-option').first().click();
      await waitFor(() => saved.rankCard?.background_preset === 'aurora-lake');
      await visiblePreview();
      await restore.click();
      await waitFor(() => saved.rankCard?.background_preset === null);
      await visiblePreview();
      await appearance.locator('summary').click();
      assert.equal(await preview.isVisible(),false,'closing customization must remove the sticky preview');
    } else if (scenario === 'premium') {
      const appearance = page.locator('.levels-customization');
      assert.equal(await appearance.getByRole('combobox').count(),0);
      await appearance.locator('summary').click();
      await appearance.getByRole('combobox',{name:'Font',exact:true}).selectOption('inter');
      await waitFor(() => saved.rankCard?.font === 'inter');
    } else if (scenario === 'future-field') {
      const other = setup.locator('details').filter({hasText:'Other settings'});
      await other.locator('summary').click();
      assert.equal(await other.getByRole('textbox',{name:'Future setting',exact:true}).inputValue(),'Keep this');
      await other.getByRole('textbox').fill('Still here');
      await waitFor(() => saved.futureSetting === 'Still here');
    } else assert.equal(writes,0);
    assert.ok(mutations.every(path => ['/api/config/features/community.levels','/api/config/features/community.levels/preflight'].includes(path)),'no direct Discord actions or Premium purchases');
    assert.equal(await setup.evaluate(element => element.scrollWidth > element.clientWidth),false,'no horizontal overflow');
    if (['en','pt','mobile','rewards','premium'].includes(scenario) && process.env.LEVELS_SETTINGS_CAPTURE !== '0') {
      await mkdir('output/playwright',{recursive:true});
      await page.setViewportSize({width:scenario === 'mobile' ? 390 : 1440,height:2600});
      await page.evaluate(() => document.fonts.ready);
      await setup.screenshot({path:`output/playwright/levels-settings-${scenario}.png`});
      if (scenario === 'premium') await page.locator('.levels-customization').screenshot({path:'output/playwright/levels-settings-customization.png'});
    }
    console.log(`PASS levels-settings-${scenario}`);
    await page.close();
  }
} finally {await browser.close();}
