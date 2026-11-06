import { test, expect } from '@playwright/test';

test('public pages and the Helper dashboard have no documentation navigation', async ({ page, request }) => {
  for (const route of ['/', '/pt/', '/tts/', '/pt/tts/', '/music/', '/helper/', '/pt/helper/', '/commands/', '/status.html', '/premium.html', '/account/', '/dashboard/', '/panel/helper-tracker/', '/panel/collection/']) {
    await page.goto(route);
    await expect(page.locator('a[href*="/docs/"], a[href^="docs/"], a[data-i18n="ecosystem.docs"]')).toHaveCount(0);
    await expect(page.locator('.nav__links a[href*="commands/"]').first()).toHaveCount(1);
  }
  for (const route of ['/docs/', '/docs/tts/', '/docs/helper/']) expect((await request.get(route)).status()).toBe(404);
  await page.goto('/helper/');
  await expect(page.locator('.helper-story-copy h3')).toHaveText(['Protection', 'Private tickets', 'Events', 'Levels & roles', 'Auto replies', 'Server tools']);
  await expect(page.locator('.helper-tools-links > span')).toHaveText(['Core', 'Insights', 'Studio']);
});
