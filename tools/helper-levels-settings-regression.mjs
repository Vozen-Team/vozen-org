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
    const voice = setup.getByRole('region',{name:pt ? 'XP em canais de voz' : 'Voice channel XP',exact:true});
    const exclusions = setup.getByRole('region',{name:pt ? 'Canais sem XP' : 'Channels without XP',exact:true});
    const rewards = setup.getByRole('region',{name:pt ? 'Recompensas por nível' : 'Level rewards',exact:true});
    assert.equal(await voice.count(),1,'voice settings are directly accessible without expanding a section');
    assert.equal(await exclusions.count(),1);
    assert.equal(await rewards.count(),1);
    assert.equal(await setup.getByRole('spinbutton').count(),4,'core XP and reward level fields are initially visible');
    assert.equal(await setup.getByRole('combobox').count(),2,'announcement and role selectors remain available');
    assert.equal(writes,0,'opening or expanding the UI must not save defaults');
    const announcement = setup.getByRole('combobox',{name:pt ? /^Canal dos avisos/ : /^Announcement channel/});
    assert.equal(await announcement.locator('option:checked').innerText(),pt ? 'Mesmo canal da mensagem' : 'Same channel as the message');
    if (scenario === 'voice') {
      assert.equal(await voice.getByRole('spinbutton').count(),0);
      await voice.getByRole('checkbox').check();
      await waitFor(() => saved.voiceXpEnabled === true);
      await voice.getByRole('spinbutton').fill('4');
      await waitFor(() => saved.voiceXpPerMinute === 4);
      await voice.getByRole('checkbox').uncheck();
      await waitFor(() => saved.voiceXpEnabled === false);
      assert.equal(saved.voiceXpPerMinute,4,'hiding voice options keeps the saved rate');
    } else if (scenario === 'exclusions') {
      await exclusions.getByRole('checkbox',{name:'#general',exact:true}).check();
      await waitFor(() => saved.ignoredChannels.length === 1);
      assert.deepEqual(saved.ignoredChannels,['20']);
      assert.match(await exclusions.innerText(),/1 selected/);
    } else if (['rewards','saved-reward','missing-resources'].includes(scenario)) {
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
      await voice.getByRole('checkbox').focus(); await page.keyboard.press('Space');
      await waitFor(() => saved.voiceXpEnabled === true);
    } else if (previewScenario) {
      const appearance = page.locator('.levels-customization');
      await appearance.locator('summary').click();
      const preview = appearance.locator('.preview-panel');
      const controls = appearance.locator('.controls');
      await appearance.locator('.editor-grid').evaluate(element => element.scrollIntoView({block:'start'}));
      const filters = controls.getByRole('group',{name:pt ? 'Personalizar o cartão' : 'Customize the card'});
      assert.equal(await filters.getByRole('button').count(),3);
      const colors = filters.getByRole('button',{name:pt ? 'Cores' : 'Colors',exact:true});
      const text = filters.getByRole('button',{name:pt ? 'Texto' : 'Text',exact:true});
      const background = filters.getByRole('button',{name:pt ? 'Fundo e banners' : 'Background & banners',exact:true});
      assert.equal(await colors.getAttribute('aria-pressed'),'true');
      assert.equal(await controls.getByRole('combobox').count(),0,'font is hidden outside the Text filter');
      const visiblePreview = async () => {
        const card = await preview.boundingBox();
        const viewport = await page.locator('.workspace-main').boundingBox();
        const header = await page.locator('.workspace-global-nav').boundingBox();
        assert.ok(card.y >= Math.max(viewport.y,header.y + header.height,0) - 1 && card.y + card.height <= Math.min(viewport.y + viewport.height, page.viewportSize().height) + 1,`the entire preview stays inside the visible viewport below navigation: ${JSON.stringify({card,viewport,header})}`);
        assert.equal(await preview.evaluate(element => {const box=element.getBoundingClientRect();return element.contains(document.elementFromPoint(box.x + box.width / 2,box.y + box.height / 2));}),true,'the preview is not hidden behind another panel');
        assert.equal(await appearance.evaluate(element => element.scrollWidth > element.clientWidth),false);
        const cardBody = await preview.locator('.rank-preview').boundingBox(), content = await preview.locator('.rank-content').boundingBox();
        assert.ok(content.y >= cardBody.y && content.y + content.height <= cardBody.y + cardBody.height,'names and XP must not be cropped by the compact preview');
        assert.equal(await controls.evaluate(element => element.scrollHeight > element.clientHeight + 1 || ['auto','scroll'].includes(getComputedStyle(element).overflowY)),false,'options have no internal scroll');
      };
      await visiblePreview();
      await text.focus(); await page.keyboard.press('Space');
      await visiblePreview();
      assert.equal(writes,0,'filter navigation does not save defaults');
      assert.equal(await controls.getByRole('slider').count(),0,'color settings are hidden outside Colors');
      await controls.getByRole('combobox').selectOption('inter');
      await waitFor(() => saved.rankCard?.font === 'inter');
      await background.click();
      await visiblePreview();
      await appearance.getByRole('button',{name:'Banners',exact:true}).click();
      await waitFor(() => saved.rankCard?.background_preset === 'aurora-lake');
      await visiblePreview();
      if (process.env.LEVELS_SETTINGS_CAPTURE !== '0') {
        await mkdir('output/playwright',{recursive:true});
        await page.screenshot({path:`output/playwright/rank-gallery-${scenario}.png`});
      }
      const next = appearance.getByRole('button',{name:pt ? 'Banners seguintes' : 'Next banners',exact:true});
      const previous = appearance.getByRole('button',{name:pt ? 'Banners anteriores' : 'Previous banners',exact:true});
      assert.equal(await previous.isDisabled(),true);
      const beforePaging = writes;
      let bannerCount = 0;
      while (true) {
        const banners = appearance.locator('.banner-option');
        assert.equal(await banners.count(),8,'show eight banners before asking users to change pages');
        const boxes = await banners.evaluateAll(elements => elements.map(element => {const {x,y}=element.getBoundingClientRect();return {x,y};}));
        for (let row = 0; row < 4; row++) {
          assert.equal(boxes[row * 2].y,boxes[row * 2 + 1].y,'each row contains two banners');
          assert.equal(boxes[row * 2].x,boxes[0].x,'the gallery keeps exactly two columns');
          if (row > 0) assert.ok(boxes[row * 2].y > boxes[(row - 1) * 2].y,'four distinct rows');
        }
        for (const image of await banners.locator('img').all()) {
          await image.scrollIntoViewIfNeeded();
          await image.evaluate(image => image.decode());
          assert.ok(await image.evaluate(image => image.naturalWidth >= 640),'every thumbnail loads its bundled image');
          await visiblePreview();
        }
        if (bannerCount === 0) {
          await controls.hover();
          for (const delta of [100,140]) {
            await page.mouse.wheel(0,delta);
            await page.waitForTimeout(100);
            await visiblePreview();
          }
        }
        await banners.last().click();
        await waitFor(() => saved.rankCard?.background_preset === (bannerCount === 0 ? 'moonlit-village' : 'clockwork-library'));
        await visiblePreview();
        assert.equal(await banners.last().evaluate(element => {const box=element.getBoundingClientRect();return element.contains(document.elementFromPoint(box.x + box.width / 2,box.y + box.height / 2));}),true,'the last row remains clickable while the preview stays visible');
        if (process.env.LEVELS_SETTINGS_CAPTURE !== '0') await page.screenshot({path:`output/playwright/rank-gallery-bottom-${scenario}.png`});
        bannerCount += await appearance.locator('.banner-option').count();
        if (await next.isDisabled()) break;
        await next.click(); await visiblePreview();
      }
      assert.equal(bannerCount,16,'two complete pages of eight banners');
      assert.equal(writes,beforePaging + 2,'only selecting a banner saves; paging never does');
      for (const [label,id] of [['Crystal Cavern','crystal-cavern'],['Sakura Shrine','sakura-shrine'],['Cosmic Nebula','cosmic-nebula'],['Frost Citadel','frost-citadel'],['Tropical Lagoon','tropical-lagoon'],['Clockwork Library','clockwork-library']]) {
        await appearance.getByRole('button',{name:label,exact:true}).click();
        await waitFor(() => saved.rankCard?.background_preset === id);
        await visiblePreview();
      }
      assert.equal(saved.rankCard.font,'inter');
      await colors.click(); await visiblePreview();
      assert.equal(await controls.getByRole('slider').count(),1);
      await controls.locator('.swatch').nth(1).click();
      await waitFor(() => saved.rankCard?.primary_color === '#7F9CF5');
      await background.click(); await visiblePreview();
      assert.equal(await appearance.getByRole('button',{name:'Clockwork Library',exact:true}).getAttribute('aria-pressed'),'true','returning to Background shows the selected banner page');
      const restore = appearance.locator('.rank-actions').getByRole('button');
      const previewBox = await preview.boundingBox(), restoreBox = await restore.boundingBox();
      assert.ok(restoreBox.x >= previewBox.x + previewBox.width || restoreBox.y >= previewBox.y + previewBox.height,'the preview must not cover the last control');
      if (process.env.LEVELS_SETTINGS_CAPTURE !== '0') {
        await mkdir('output/playwright',{recursive:true});
        await page.screenshot({path:`output/playwright/rank-${scenario}.png`});
      }
      while (!await previous.isDisabled()) await previous.click();
      await appearance.getByRole('button',{name:'Aurora Lake',exact:true}).click();
      await waitFor(() => saved.rankCard?.background_preset === 'aurora-lake');
      await visiblePreview();
      await colors.focus();
      for (let index = 0; index < 100 && !await restore.evaluate(element => element === document.activeElement); index++) await page.keyboard.press('Tab');
      assert.equal(await restore.evaluate(element => element === document.activeElement),true,'all options remain reachable by keyboard');
      await visiblePreview();
      await restore.click();
      await waitFor(() => saved.rankCard?.background_preset === null);
      assert.equal(saved.rankCard.font,'system');
      await visiblePreview();
      await appearance.locator('summary').click();
      assert.equal(await preview.isVisible(),false,'closing customization must remove the sticky preview');
    } else if (scenario === 'premium') {
      const appearance = page.locator('.levels-customization');
      assert.equal(await appearance.getByRole('combobox').count(),0);
      await appearance.locator('summary').click();
      await appearance.getByRole('button',{name:'Text',exact:true}).click();
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
