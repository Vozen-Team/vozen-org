import { test, expect } from '@playwright/test';

const locales = ['pt', 'fr', 'es', 'de', 'tr', 'ar', 'zh', 'ru', 'ko', 'en'];
for (const [route, anchor, visual] of [['/', 'products', '.eco-orbit'], ['/tts/', 'hear', '#hearStage'], ['/helper/', 'modules', '[data-helper-cards]']]) {
  test(`${route} keeps its English UI and current location when changing languages`, async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto(`${route}?locale-test=1#${anchor}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('#langPanel .lang__opt'));
    await expect(page.locator(visual)).toHaveCount(1);
    const url = page.url();
    await page.locator(`#${anchor}`).scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
    let navigations = 0;
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });
    for (const locale of locales) {
      const button = await page.locator('#langBtn').boundingBox();
      await page.mouse.click(button.x + button.width / 2, button.y + button.height / 2);
      await page.locator('#langPanel').evaluate(async panel => {
        await Promise.all(panel.getAnimations().map(animation => animation.finished));
      });
      await page.locator('#langPanel').evaluate((panel, code) => {
        const option = panel.querySelector(`[data-lang="${code}"]`);
        panel.scrollTop = option.offsetTop - panel.clientHeight / 2;
      }, locale);
      const option = await page.locator(`.lang__opt[data-lang="${locale}"]`).boundingBox();
      await page.mouse.click(option.x + option.width / 2, option.y + option.height / 2);
      await expect(page.locator('html')).toHaveAttribute('lang', locale === 'pt' ? 'pt-PT' : locale === 'zh' ? 'zh-Hant' : locale);
      expect(page.url()).toBe(url);
      await expect(page.locator(visual)).toHaveCount(1);
      await expect(page.locator('body')).not.toHaveClass(/vozen-guide-page/);
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
    }
    expect(navigations).toBe(0);
  });
}

test('Portuguese TTS uses the same product template and player as English', async ({ page }) => {
  await page.goto('/pt/tts/');
  await expect(page.locator('body')).toHaveClass(/tts-page/);
  await expect(page.locator('#hearStage')).toHaveCount(1);
  await expect(page.locator('.hero .discord')).toHaveCount(1);
});

test('shared navigation language choices stay on the current page', async ({ page }) => {
  for (const route of ['/docs/tts/', '/guides/discord-without-a-mic/', '/privacy.html']) {
    await page.goto(`${route}?locale-test=1#main`);
    const url = page.url();
    await page.locator('[data-vozen-docs-language-button]').click();
    await page.locator('[data-vozen-docs-language-panel] [data-language="pt"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', /^pt(?:-PT)?$/);
    expect(page.url()).toBe(url);
  }
});

test('an explicit language choice persists between the standard product URLs', async ({ page }) => {
  await page.goto('/tts/');
  await page.locator('#langBtn').click();
  await page.locator('.lang__opt[data-lang="pt"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');
  for (const route of ['/helper/', '/', '/tts/']) {
    await page.goto(route);
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');
  }
});
