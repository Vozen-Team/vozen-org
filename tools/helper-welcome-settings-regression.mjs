// Synthetic APIs only. No real configuration writes, messages or Discord actions.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.HELPER_TEST_URL || 'http://127.0.0.1:5179/panel/helper-tracker/';
const fields = [
  {key:'channel',kind:'channel'}, {key:'message',kind:'textarea'}, {key:'delaySeconds',kind:'number',min:0,max:300},
  {key:'sendDm',kind:'toggle'}, {key:'guideEnabled',kind:'toggle'}, {key:'steps',kind:'tags'},
  ...['rulesChannel','introductionsChannel','channelsChannel'].map(key => ({key,kind:'channel'})),
  {key:'dmMessage',kind:'textarea'}, {key:'autoRole',kind:'role'}, {key:'farewellChannel',kind:'channel'},
  {key:'farewellMessage',kind:'textarea'}, {key:'templateId',kind:'select',options:[['','No template'],['saved','Saved example']]},
].map(field => ({...field,label:field.key,help:'Original API explanation',advanced:!['channel','message'].includes(field.key)}));
const waitFor = async predicate => {
  const deadline = Date.now() + 7000;
  while (!predicate() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve,100));
  assert.ok(predicate(),'expected isolated autosave did not complete');
};
const browser = await chromium.launch();
try {
  for (const scenario of ['en','pt','mobile','edit','steps','missing-resources','disabled-feature','future-field','future-step','save-failure']) {
    if (process.env.WELCOME_SETTINGS_SCENARIO && !process.env.WELCOME_SETTINGS_SCENARIO.split(',').includes(scenario)) continue;
    const pt = scenario === 'pt';
    const page = await browser.newPage({viewport:{width:scenario === 'mobile' ? 390 : 1440,height:scenario === 'mobile' ? 844 : 1000}});
    if (pt) await page.addInitScript(() => localStorage.setItem('vozen.lang','pt'));
    const initial = {channel:'20',message:'Welcome {member} to {server}!',delaySeconds:0,sendDm:false,guideEnabled:true,steps:['rules','introductions','channels'],rulesChannel:'',introductionsChannel:'',channelsChannel:'',dmMessage:'Hello {member}!',autoRole:'',farewellChannel:'',farewellMessage:'Goodbye {member}.',templateId:''};
    if (scenario === 'future-field') initial.futureSetting = 'Preserve this';
    if (scenario === 'future-step') initial.steps.push('future');
    let saved = structuredClone(initial), writes = 0, revision = 1;
    const enabled = scenario !== 'disabled-feature';
    const feature = {key:'support.welcome',label:'Welcome',category:'management',enabled,available:true};
    const mutations = [];
    await page.route('**/api/**',async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname.replace(/^.*?(?=\/api\/)/,'');
      let value;
      if (request.method() !== 'GET') mutations.push(path);
      if (path === '/api/me') value = {id:'qa-user',guildId:'10',dbOk:true};
      else if (path === '/api/guilds') value = {guilds:[{id:'10',name:'Sample server',canManage:true}]};
      else if (path === '/api/guild-context') value = {guildId:'10',name:'Sample server',permissions:'8',channels:scenario === 'missing-resources' ? [] : [{id:'20',name:'welcome',type:'text'},{id:'21',name:'rules',type:'text'}],roles:[],hierarchy:{known:true},capabilities:{channelSelectors:scenario !== 'missing-resources',roleSelectors:scenario !== 'missing-resources',permissionPreflight:true}};
      else if (path === '/api/config/features') value = {guildId:'10',features:[feature]};
      else if (path === '/api/config/features/support.welcome') {
        if (request.method() === 'PUT') {
          writes++;
          const body = request.postDataJSON();
          assert.equal(body.enabled,enabled,'editing must not change feature enablement');
          assert.equal(body.expected_revision,revision);
          assert.deepEqual(Object.keys(body.config).sort(),Object.keys(initial).sort());
          if (scenario === 'save-failure') {await route.fulfill({status:503,json:{code:'temporary_failure'}});return;}
          saved = body.config; revision++;
        }
        value = {...feature,guildId:'10',config:saved,defaults:{},revision,schema:{sections:[{title:'Welcome message',description:'Welcome message',fields:[...fields,...(scenario === 'future-field' ? [{key:'futureSetting',label:'Future setting',kind:'text'}] : [])]}]}};
      } else if (path.endsWith('/preflight')) value = {guildId:'10',ok:true,issues:[]};
      else if (path === '/api/stats') value = {guildId:'10',totalCases:0};
      else if (path === '/api/cases') value = {cases:[]};
      else if (path === '/api/audit') value = {events:[]};
      else if (path === '/api/activity') value = {activity:[]};
      else if (path === '/api/quotas') value = {plan:'Free',limits:{},usage:{}};
      else {await route.fulfill({status:503,json:{}});return;}
      await route.fulfill({json:value});
    });
    await page.goto(`${base}#/config/support.welcome`);
    const setup = page.locator('.welcome-settings');
    await setup.waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await setup.locator('.welcome-settings__group').count(),5);
    assert.equal(await setup.locator('details').count(),0,'all settings stay expanded');
    assert.equal(await setup.getByRole('textbox').count(),scenario === 'future-field' ? 4 : 3);
    assert.equal(await setup.getByRole('combobox').count(),7);
    assert.equal(await setup.getByRole('spinbutton').count(),1);
    assert.equal(await setup.getByRole('checkbox').count(),scenario === 'future-step' ? 7 : 6);
    assert.equal(await setup.locator('input[value="rules, introductions, channels"]').count(),0,'no technical CSV field');
    assert.equal(await setup.getByRole('textbox',{name:pt ? 'Mensagem privada' : 'Private message',exact:true}).isVisible(),true,'DM copy stays visible while off');
    const links = setup.locator('[data-group="links"]');
    const channel = links.getByRole('combobox',{name:pt ? /^Regras/ : /^Rules/});
    assert.equal(await channel.inputValue(),'');
    assert.equal(await channel.locator('option:checked').innerText(),pt ? 'Ocultar este botão' : 'Hide this link');
    if (scenario === 'missing-resources') {
      assert.equal(await channel.isDisabled(),true);
      assert.ok((await setup.innerText()).includes('Discord resource data is not available'));
    }
    if (scenario === 'edit' || scenario === 'save-failure') {
      await channel.selectOption('21');
      await waitFor(() => writes === 1);
      if (scenario === 'edit') {
        await waitFor(() => saved.rulesChannel === '21');
        assert.deepEqual(saved,{...initial,rulesChannel:'21'});
        await page.reload(); await setup.waitFor();
        assert.equal(await channel.inputValue(),'21');
      } else assert.deepEqual(saved,initial,'failed save must not alter persisted settings');
    } else if (scenario === 'steps') {
      await links.getByRole('checkbox',{name:'Introductions',exact:true}).uncheck();
      await waitFor(() => writes === 1 && saved.steps.length === 2);
      assert.deepEqual(saved.steps,['rules','channels']);
      await links.getByRole('checkbox',{name:'Command help',exact:true}).focus();
      await page.keyboard.press('Space');
      await waitFor(() => writes === 2);
      assert.deepEqual(saved.steps,['rules','channels','help']);
      await links.getByRole('checkbox',{name:'Rules',exact:true}).uncheck();
      await waitFor(() => writes === 3);
      await links.getByRole('checkbox',{name:'Explore channels',exact:true}).uncheck();
      await waitFor(() => writes === 4);
      assert.deepEqual(saved.steps,['help']);
      assert.equal(await links.getByRole('checkbox',{name:'Command help',exact:true}).isDisabled(),true);
      assert.deepEqual(saved,{...initial,steps:['help']});
    } else if (scenario === 'future-step') {
      await links.getByRole('checkbox',{name:'Saved option: future',exact:true}).focus();
      await page.keyboard.press('Space');
      await waitFor(() => writes === 1);
      assert.deepEqual(saved.steps,['rules','introductions','channels']);
    } else {
      assert.equal(writes,0,'opening the new layout must not save settings');
      if (scenario === 'future-field') assert.equal(await setup.getByRole('textbox',{name:'Future setting',exact:true}).inputValue(),'Preserve this');
    }
    assert.ok(mutations.every(path => ['/api/config/features/support.welcome','/api/config/features/support.welcome/preflight'].includes(path)),`only configuration save and its read-only preflight permitted: ${mutations.join(', ')}`);
    if (['en','pt','mobile'].includes(scenario) && process.env.WELCOME_SETTINGS_CAPTURE !== '0') {
      await mkdir('output/playwright',{recursive:true});
      await page.setViewportSize({width:scenario === 'mobile' ? 390 : 1440,height:3200});
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(await setup.evaluate(element => element.scrollWidth <= element.clientWidth),true,'no horizontal overflow');
      await setup.screenshot({path:`output/playwright/welcome-settings-${scenario}.png`});
      if (scenario === 'mobile') {
        await page.setViewportSize({width:390,height:844});
        await setup.getByRole('heading',{name:'Welcome setup',exact:true}).scrollIntoViewIfNeeded();
        await page.screenshot({path:'output/playwright/welcome-settings-mobile-fold.png'});
      }
    }
    console.log(`PASS welcome-settings-${scenario}`);
    await page.close();
  }
} finally {await browser.close();}
