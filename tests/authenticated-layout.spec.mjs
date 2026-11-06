import { test, expect } from '@playwright/test';
import { mockPublicStatus } from './public-status.fixture.mjs';

for (const width of [390, 1024, 1440]) {
  test(`shared header keeps the same visual profile across pages at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    let reference;
    for (const path of ['/commands/', '/', '/tts/', '/helper/', '/account/', '/guides/discord-without-a-mic/', '/pt/guides/discord-without-a-mic/', '/pt/tts/', '/privacy.html', '/terms.html', '/status.html', '/404.html']) {
      await page.goto(path, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const profile = await page.locator('header.vozen-global-nav').evaluate(header => {
        const rect = element => {
          const { x, y, width, height } = element.getBoundingClientRect();
          return [x, y, width, height].map(value => Math.round(value * 10) / 10);
        };
        const style = element => {
          const css = getComputedStyle(element);
          return [css.fontFamily, css.fontSize, css.fontWeight, css.letterSpacing, css.color];
        };
        return {
          header: rect(header), inner: rect(header.querySelector('.nav__inner')),
          mark: rect(header.querySelector('.brand__mark')),
          brand: style(header.querySelector('.brand')),
          word: style(header.querySelector('.brand__word')),
          product: style(header.querySelector('.nav__product')),
          link: style(header.querySelector('.nav__links a:not(.is-current)')),
        };
      });
      reference ||= profile;
      expect(profile, path).toEqual(reference);
      if (width === 390) {
        await page.locator('.nav__burger').click();
        await expect(page.locator('.nav__links')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.locator('.nav__links')).toBeHidden();
      }
    }
  });
}

// Local, intercepted profile only: never use a real Discord token in visual QA.
const user = { id: '123456789012345678', username: 'Rexy', avatar: 'testavatar', avatar_decoration_data: { asset: 'testdecoration' } };
test.beforeEach(async ({ page }) => {
  await mockPublicStatus(page);
  await page.addInitScript((user) => {
    sessionStorage.setItem('vozen.oauth.client', '1537738930722443364');
    sessionStorage.setItem('vozen.ecosystem.authrev', String(Date.now()));
    sessionStorage.setItem('vozen.ecosystem.dtoken', 'local-visual-fixture-token-only');
    sessionStorage.setItem('vozen.ecosystem.authexp', String(Date.now() + 3600000));
    sessionStorage.setItem('vozen.navuser', JSON.stringify({ user }));
  }, user);
  await page.route('https://api.vozen.org/**', route => route.fulfill({ json: { user, plus: { active: false }, pass: { active: false, servers: [] } } }));
  await page.route('https://static.cloudflareinsights.com/**', route => route.fulfill({ body: '' }));
  await page.route('https://cdn.discordapp.com/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="#36cbbf"/></svg>' }));
});

for (const path of ['/', '/tts/', '/helper/', '/account/']) {
  for (const width of [320, 375, 768, 1024, 1440]) {
    test(`authenticated ${path} stays compact at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path, { waitUntil: 'networkidle' });
      await expect(page.locator('#navLogin')).toContainText('Rexy');
      await page.screenshot({ path: `test-results/auth-${path.replaceAll('/', '') || 'home'}-${width}.png` });
      const avatar = page.locator('#navLogin .nav__login-av');
      await expect(avatar).toBeVisible();
      const bounds = await page.locator('#navLogin').boundingBox();
      expect(bounds.height).toBeLessThanOrEqual(60);
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
      const brand = await page.locator('.vozen-global-nav .brand').boundingBox();
      expect(brand.x).toBeGreaterThanOrEqual(10);
      await expect(page.locator('#navLogin .discord-avatar__decoration')).toHaveCSS('position', 'absolute');
      await expect(avatar).not.toHaveAttribute('alt', /account\./);
      expect(await page.evaluate(() => [...document.fonts].some(font => font.family.replaceAll('"', '') === 'Twemoji Country Flags'))).toBe(true);
      if (width === 1024) {
        await expect(page.locator('.nav__burger')).toBeVisible();
        await page.locator('.nav__burger').click();
        await expect(page.locator('.nav__links')).toBeVisible();
        await page.locator('.nav__burger').click();
      }
      if (path === '/account/') {
        await expect(page.locator('.ppanel__av')).toBeVisible();
        expect(await page.locator('img.ppanel__av').evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
      }
    });
  }
}

test('profile remains compact while the progressive stylesheet is unavailable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route('**/css/home-full-v1.css*', route => route.abort());
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.locator('#navLogin')).toContainText('Rexy');
  expect((await page.locator('#navLogin').boundingBox()).height).toBeLessThanOrEqual(60);
  await expect(page.locator('.discord-avatar__decoration')).toHaveCSS('position', 'absolute');
});

test('failed Discord images leave a legible initial without broken decorations', async ({ page }) => {
  await page.route('https://cdn.discordapp.com/**', route => route.fulfill({ status: 404, body: '' }));
  await page.goto('/account/', { waitUntil: 'networkidle' });
  await expect(page.locator('.ppanel__av--none')).toHaveText('R');
  await expect(page.locator('.nav__login-av--none')).toHaveText('R');
  await expect(page.locator('.discord-avatar__decoration')).toHaveCount(0);
});

for (const path of ['/commands/', '/privacy.html', '/terms.html', '/premium.html']) {
  for (const width of [375, 768, 1440]) {
    test(`public surface ${path} fits ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path, { waitUntil: 'networkidle' });
      await expect(page.locator('h1').first()).toBeVisible();
      const dimensions = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
      expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
      await page.screenshot({ path: `test-results/surface-${path.replaceAll('/', '')}-${width}.png`, fullPage: true });
    });
  }
}
