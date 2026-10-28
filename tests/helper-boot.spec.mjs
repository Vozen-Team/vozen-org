import {test,expect} from '@playwright/test';

for(const route of ['#/config/community.economy','#/activity','#/achievements/1524199248248176751']){
  test(`Helper first paint stays quiet before scripts and styles: ${route}`,async({page})=>{
    await page.route('**/panel/helper-tracker/assets/*',request=>request.abort());
    await page.goto(`/panel/helper-tracker/${route}`);
    await expect(page.locator('.helper-boot')).toBeVisible();
    await expect(page.locator('body')).toHaveText('');
    await expect(page.locator('html')).toHaveCSS('background-color','rgb(7, 11, 18)');
  });
}
test('Helper boot indicator respects reduced motion',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.route('**/panel/helper-tracker/assets/*',request=>request.abort());
  await page.goto('/panel/helper-tracker/');
  await expect(page.locator('.helper-boot span')).toHaveCSS('animation-name','none');
});
test('Helper replaces its boot indicator when React starts',async({page})=>{
  await page.route('**/api/**',route=>route.fulfill({status:401,json:{}}));
  await page.goto('/panel/helper-tracker/');
  await expect(page.locator('.helper-boot')).toHaveCount(0);
  await expect(page.locator('#root')).not.toBeEmpty();
});
test('Helper keeps account guidance available without JavaScript',async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false});
  try{
    const page=await context.newPage();
    await page.goto('/panel/helper-tracker/');
    await expect(page.getByRole('heading',{name:'Vozen Helper panel'})).toBeVisible();
    await expect(page.getByRole('link',{name:'Open your Vozen account'})).toBeVisible();
    await expect(page.locator('.helper-boot')).toBeHidden();
  }finally{await context.close();}
});
