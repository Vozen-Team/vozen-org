import { expect, test } from '@playwright/test';

test('Vozen uses one compact, static footer across the site', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    for (const path of ['/', '/tts/', '/music/', '/helper/', '/guides/discord-without-a-mic/', '/commands/', '/status', '/premium.html', '/account/', '/dashboard', '/dashboard/', '/privacy', '/terms', '/404.html', '/panel/helper-tracker/', '/panel/collection/']) {
      await page.goto(path);
      const footer = page.locator('footer.vozen-footer');
      await expect(page.locator('footer')).toHaveCount(1);
      await expect(footer.getByRole('link')).toHaveText(['Support server', 'Privacy', 'Terms']);
      await expect(footer.getByRole('link', { name: 'Support server' })).toHaveAttribute('href', 'https://discord.gg/4kYw2WUbNN');
      await expect(footer.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
      await expect(footer.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
      expect(await footer.evaluate(el => el.getBoundingClientRect().height), path).toBeLessThan(90);
    }
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/pt/tts/');
    const footer = page.locator('footer.vozen-footer');
    await expect(footer.getByRole('link')).toHaveCount(3);
    await expect(footer.getByRole('link', { name: 'Privacidade' })).toBeVisible();
    expect(await footer.evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(320);
  } finally {
    await context.close();
  }
});
