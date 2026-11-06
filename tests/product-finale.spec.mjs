import {test,expect} from '@playwright/test';

test('each product ends with the same compact invite card and its official icon',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  const fonts=await page.context().newCDPSession(page);
  await fonts.send('DOM.enable');
  await fonts.send('CSS.enable');
  for(const [route,name,icon,hero] of [
    ['/tts/','TTS','/assets/settings-tts.png','.hero__cta .js-invite'],
    ['/music/','Music','/assets/music/avatar.webp','.music-actions .btn--primary'],
    ['/helper/','Helper','/assets/settings-helper.png','.helper-hero__actions .js-helper-invite'],
    ['/pt/tts/','TTS','/assets/settings-tts.png','.hero__cta .js-invite'],
    ['/pt/helper/','Helper','/assets/settings-helper.png','.helper-hero__actions .js-helper-invite'],
  ]){
    await page.goto(route);
    await page.evaluate(()=>window.vozenPublicI18nReady||Promise.resolve());
    await page.evaluate(()=>document.fonts.ready);
    const card=page.locator('.product-finale');
    const button=card.locator('a');
    await card.scrollIntoViewIfNeeded();
    await page.evaluate(()=>document.fonts.ready);
    const {root}=await fonts.send('DOM.getDocument');
    const {nodeId}=await fonts.send('DOM.querySelector',{nodeId:root.nodeId,selector:'.product-finale__title'});
    expect((await fonts.send('CSS.getPlatformFontsForNode',{nodeId})).fonts.map(font=>font.familyName)).toEqual(['Unbounded']);
    await expect(card).toHaveCount(1);
    await expect(card.locator('.product-finale__name')).toHaveText('Vozen '+name);
    await expect(card.locator('img')).toHaveAttribute('src',icon);
    await expect(button).toHaveAttribute('href',await page.locator(hero).getAttribute('href'));
    await expect(button.locator('svg')).toHaveCount(1);
    await expect(card.locator('.product-finale__note')).toHaveText(route.startsWith('/pt/')?'Essencial gratuito. Sem cartão.':'Free core. No credit card.');
    for(const width of [1440,768,390,320]){
      await page.setViewportSize({width,height:900});
      await card.scrollIntoViewIfNeeded();
      expect(await card.evaluate(el=>{
        const bounds=el.getBoundingClientRect();
        return [...el.querySelectorAll('img,h2,a,p')].every(child=>{
          const box=child.getBoundingClientRect();
          return box.left>=bounds.left-1&&box.right<=bounds.right+1&&child.scrollWidth<=child.clientWidth+1;
        });
      }),route+' clipping at '+width).toBe(true);
      expect((await card.boundingBox()).height).toBeLessThan(width>=1000?260:400);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    await button.focus();
    await expect(button).toHaveCSS('outline-style','solid');
  }
});
