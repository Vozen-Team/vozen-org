import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const registration=JSON.parse(readFileSync(new URL('./fixtures/command-registration.json',import.meta.url),'utf8'));

test('TTS separates base access from optional Premium extras',async({page})=>{
  await page.goto('/commands/');
  for(const [name,access] of [['/voice','Free'],['/game','Free'],['/server-stats','Free'],['/server-pronunciation','Admin']]){
    const row=page.locator('.command-row').filter({has:page.getByText(name,{exact:true})});
    await expect(row.locator('.command-tag')).toHaveText([access,'Premium extras']);
  }
  for(const name of ['/rizz <language>','/transcribe','Transcribe voice message']){
    const row=page.locator('.command-row').filter({has:page.getByText(name,{exact:true})});
    await expect(row.locator('.command-tag')).toHaveText(['Premium']);
  }
  await expect(page.locator('#commandGroups')).not.toContainText('Free + Premium');
  await expect(page.locator('#commandGroups')).not.toContainText('Admin + Premium');
});

test('command descriptions share the same left edge at every viewport',async({page})=>{
  await page.goto('/commands/');
  for(const width of [1440,900,641,390,320]){
    await page.setViewportSize({width,height:900});
    for(const product of ['tts','helper']){
      await page.locator('[data-command-product="'+product+'"]').click();
      const positions=await page.locator('.command-row__copy > p').evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect().left));
      expect(Math.max(...positions)-Math.min(...positions)).toBeLessThan(1);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
  }
});

test('commands redesign keeps both complete catalogues, search, filters and keyboard tabs',async({page})=>{
  await page.setViewportSize({width:390,height:900});
  await page.goto('/commands/');
  await expect(page.locator('#commandBrowse')).toHaveCount(0);
  await expect(page.locator('#commandFilters')).toBeVisible();
  const search=page.locator('#commandSearch');
  const tts=page.locator('[data-command-product="tts"]');
  const helper=page.locator('[data-command-product="helper"]');
  await expect(page.locator('.command-row')).toHaveCount(registration.tts.commands.length);
  await tts.focus();
  await page.keyboard.press('ArrowRight');
  await expect(helper).toBeFocused();
  await expect(helper).toHaveAttribute('aria-selected','true');
  await expect(page.locator('.command-row')).toHaveCount(registration.helper.commands.length);
  await search.fill('ticket');
  await expect(page.locator('.command-row')).not.toHaveCount(0);
  for(const command of await page.locator('.command-row code').allTextContents())expect(command).toContain('ticket');
  await search.fill('no-such-command-xyz');
  await expect(page.locator('.command-row')).toHaveCount(0);
  await expect(page.locator('.command-empty')).toBeVisible();
  await tts.click();
  await expect(search).toHaveValue('');
  await page.locator('[data-filter="start"]').click();
  await expect(page.locator('.command-row')).toHaveCount(11);
  await expect(page.locator('.command-group')).toHaveCount(1);
  await page.keyboard.press('/');
  await expect(search).toBeFocused();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('visual commands respect reduced motion',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/commands/');
  expect(await page.locator('#commandGroups').evaluate(el=>el.getAnimations({subtree:true}).length)).toBe(0);
});

test('clearing search restores the complete catalogue',async({page})=>{
  await page.goto('/commands/');
  await page.locator('#commandSearch').fill('transcribe');
  await expect(page.locator('.command-row')).not.toHaveCount(0);
  await page.locator('#commandSearch').fill('');
  await expect(page.locator('.command-row')).toHaveCount(registration.tts.commands.length);
});

test('commands retain complete readable catalogues without JavaScript',async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false,serviceWorkers:'block'});
  try {
    const page=await context.newPage();
    await page.goto('/commands/');
    await expect(page.locator('.command-row')).toHaveCount(registration.tts.commands.length+registration.helper.commands.length);
    await expect(page.locator('.command-row p').first()).toBeVisible();
    await expect(page.locator('#commandInspector')).toHaveCount(0);
  } finally { await context.close(); }
});

test('catalogues match the public registration snapshots, including subcommands and aliases',async({page})=>{
  await page.goto('/commands/');
  for(const product of ['tts','helper']){
    await page.locator('[data-command-product="'+product+'"]').click();
    const rows=page.locator('.command-row');
    const names=await rows.locator('code').allTextContents();
    const expected=registration[product].commands.map(command=>command.type===3?command.name:'/'+command.name);
    expect(names.map(name=>name.split(' <')[0]).sort()).toEqual(expected.sort());
    for(const command of registration[product].commands){
      const index=names.findIndex(name=>name==='/'+command.name||name.startsWith('/'+command.name+' <')||name===command.name);
      for(const subcommand of command.subcommands||[])await expect(rows.nth(index).locator('.command-row__usage')).toContainText(subcommand);
      if(product==='helper'){
        const row=rows.nth(index);
        await expect(row.locator('p')).toHaveText(command.description);
        await expect(row.locator('.command-tag').first()).toHaveText(command.access);
        await expect(row.locator('.command-tag')).toHaveCount(command.premiumExtras?2:1);
        if(command.permission)await expect(row.locator('.command-tag').first()).toHaveAttribute('title',new RegExp(command.permission.toLowerCase().replaceAll('_',' ').replace('manage guild','manage server')));
        if(command.premiumExtras){
          await expect(row.locator('.command-tag--premium')).toHaveText('Premium extras');
          await expect(row.locator('.command-tag--premium')).toHaveAttribute('title',command.premiumExtras);
        }
      }
    }
  }
  await page.locator('[data-command-product="tts"]').click();
  await page.locator('#commandSearch').fill('favorites');
  await expect(page.locator('.command-row code')).toHaveText(['/voice']);
});
