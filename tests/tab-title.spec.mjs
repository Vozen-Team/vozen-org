import { test, expect } from '@playwright/test';

test('shared navigation loads the away title and restores a dynamic title', async ({ page }) => {
  await page.goto('/tts/');
  await page.waitForFunction(() => window.vozenTabTitleReady);
  const original = await page.title();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page).toHaveTitle('Ainda estamos por aqui 👋');
  await page.evaluate(() => { document.title = 'Vozen — Updated title'; });
  await expect(page).toHaveTitle('Ainda estamos por aqui 👋');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page).toHaveTitle('Vozen — Updated title');
  expect(original).toContain('Vozen');
});
