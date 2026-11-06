import {test,expect} from '@playwright/test';

for(const path of ['/tts/','/pt/tts/']) {
  for(const width of [1440,390,320]) {
    test(`${path} sample player keeps its message fixed at ${width}px`,async({page})=>{
      await page.setViewportSize({width,height:900});
      let release;
      const ready=new Promise(resolve=>release=resolve);
      await page.route('**/assets/samples/*.mp3',async route=>{await ready;await route.continue();});
      await page.goto(path);
      await page.evaluate(()=>document.fonts.ready);
      await page.locator('#hear').scrollIntoViewIfNeeded();
      const audio=page.locator('#hearAudio');
      const phrase=page.locator('#hearPhrase');
      const stage=page.locator('#hearStage');
      const button=page.locator('#hearBtn');
      const sound=page.locator('.hear__sound');
      expect(await audio.evaluate(el=>el.paused)).toBe(true);
      await expect(page.locator('.hear__clock')).toHaveCSS('visibility','hidden');
      const messageBox=await phrase.boundingBox();
      const stageBox=await stage.boundingBox();
      expect(Math.abs((await sound.boundingBox()).x-messageBox.x)).toBeLessThan(1);
      await button.click();
      await expect(button).toHaveAttribute('aria-busy','true');
      await expect(page.locator('#hearStatus')).toHaveCSS('clip-path','inset(50%)');
      const still=async()=>{
        const current=await phrase.boundingBox();
        for(const key of ['x','y','width','height'])expect(Math.abs(current[key]-messageBox[key]),key).toBeLessThan(1);
        expect(Math.abs((await stage.boundingBox()).height-stageBox.height)).toBeLessThan(1);
      };
      await still();
      release();
      await expect(stage).toHaveClass(/is-playing/);
      await expect.poll(()=>audio.evaluate(el=>el.currentTime)).toBeGreaterThan(0);
      await expect(page.locator('.hear__clock')).toHaveCSS('visibility','visible');
      await still();
      await button.click();
      await expect(stage).not.toHaveClass(/is-playing/);
      await still();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    });
  }
}
