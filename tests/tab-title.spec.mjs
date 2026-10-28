import { test, expect } from '@playwright/test';

test('shared navigation loads the away title and restores a dynamic title', async ({ page }) => {
  await page.goto('/tts/');
  await page.waitForFunction(() => window.vozenTabTitleReady);
  const original = await page.title();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page).toHaveTitle("We're still here 👋");
  await page.evaluate(() => { document.title = 'Vozen — Updated title'; });
  await expect(page).toHaveTitle("We're still here 👋");
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page).toHaveTitle('Vozen — Updated title');
  expect(original).toContain('Vozen');
});

test('updates the away title live when the site language changes, without navigation', async ({ page }) => {
  await page.goto('/tts/');
  await page.waitForFunction(() => window.vozenTabTitleReady);
  let navigations = 0;
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page).toHaveTitle("We're still here 👋");
  for (const [locale, title] of [['pt-PT', 'Ainda estamos por aqui 👋'], ['fr', 'On est toujours là 👋'], ['en', "We're still here 👋"]]) {
    await page.evaluate(language => {
      document.documentElement.lang = language;
      window.dispatchEvent(new CustomEvent('vozen:languagechange', { detail: { language: language.split('-')[0] } }));
    }, locale);
    await expect(page).toHaveTitle(title);
  }
  expect(navigations).toBe(0);
});

test('the real language menu also translates the away title, not just the normal title', async ({ page }) => {
  await page.goto('/');
  await page.locator('#langBtn').click();
  await page.locator('.lang__opt[data-lang="tr"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
  await page.waitForFunction(() => window.vozenTabTitleReady);
  const original = await page.title();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page).toHaveTitle('Hâlâ buradayız 👋');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page).toHaveTitle(original);
});
