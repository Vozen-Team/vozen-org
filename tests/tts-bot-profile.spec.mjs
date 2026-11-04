import { test, expect } from '@playwright/test';

const guildId = '123456789012345678';
const botId = '123456789012345679';
const image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGNgAAAAAgABSK+kcQAAAABJRU5ErkJggg==';

for (const [width, locale] of [[390, 'pt'], [1440, 'en']]) {
  test('TTS Bot Profile previews and saves per server at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(({ locale }) => {
      localStorage.setItem('vozen.lang', locale);
      sessionStorage.setItem('vozen.ecosystem.dtoken', 'fixture-token');
      sessionStorage.setItem('vozen.ecosystem.authexp', String(Date.now() + 3600000));
    }, { locale });
    const writes = [];
    const saved = { botId, canEditImages: true, defaultName: 'Vozen TTS', defaultAvatar: null, nick: null, banner: null, avatar: null, bio: '<b>Plain text</b>' };
    let failNext = true;
    await page.route('https://api.vozen.org/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let json = {};
      if (path === '/api/dashboard/guilds') json = { guilds: [{ id: guildId, name: 'Profile QA' }] };
      if (path === '/api/dashboard/guild/' + guildId) json = { config: {} };
      if (path === '/api/dashboard/guild/' + guildId + '/bot-profile') {
        if (route.request().method() === 'POST') {
          const patch = route.request().postDataJSON();
          writes.push(patch);
          if (failNext) {
            failNext = false;
            await route.fulfill({ status: 429, json: { error: 'rate_limited' } });
            return;
          }
          if (patch.reset) Object.assign(saved, { nick: null, banner: null, avatar: null });
          else Object.assign(saved, { nick: patch.nick, avatar: '0123456789abcdef0123456789abcdef' });
        }
        json = saved;
      }
      await route.fulfill({ json });
    });
    await page.route('https://cdn.discordapp.com/**', route => route.abort());
    await page.goto('/dashboard.html');
    await page.getByRole('button', { name: 'Profile QA' }).click();
    if (width < 900) await page.locator('.settings-sections-button').click();
    await page.getByRole('button', { name: /^(Bot Profile|Perfil do bot)$/ }).click();
    const form = page.locator('.tts-bot-profile form');
    await expect(form).toBeVisible();
    await expect(page.locator('.tts-profile-bio')).toHaveText('<b>Plain text</b>');
    await expect(page.locator('.tts-profile-bio b')).toHaveCount(0);
    const apply = form.locator('[type=submit]');
    await expect(apply).toBeDisabled();
    await page.locator('#ttsProfileNick').fill('Vozen QA');
    const avatarInput = form.locator('[name=avatar]');
    const file = { name: 'avatar.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') };
    const avatar = page.locator('.tts-profile-avatar img');
    await avatarInput.setInputFiles(file);
    await expect(avatar).toHaveAttribute('src', /^data:image\/png;base64,/);
    await form.locator('[data-undo=avatar]').click();
    await expect(avatar).toHaveAttribute('src', '/assets/settings-tts.png');
    await avatarInput.setInputFiles(file);
    await expect(avatar).toHaveAttribute('src', /^data:image\/png;base64,/);
    expect(writes).toEqual([]);
    await apply.click();
    await expect(page.locator('.tts-profile-status')).toContainText(/Too many|Demasiados/);
    await expect(page.locator('#ttsProfileNick')).toHaveValue('Vozen QA');
    await apply.click();
    await expect(page.locator('.tts-profile-status')).toContainText(/Discord applied|Discord aplicou/);
    expect(writes).toHaveLength(2);
    expect(writes[0]).toEqual({ nick: 'Vozen QA', avatar: 'data:image/png;base64,' + image });
    expect(writes[1]).toEqual(writes[0]);
    await expect(apply).toBeDisabled();
    page.once('dialog', dialog => dialog.accept());
    await form.locator('[data-reset]').click();
    await expect.poll(() => writes[2]).toEqual({ reset: true });
    await expect(page.locator('#ttsProfileNick')).toHaveValue('');
    await expect(page.locator('.tts-profile-bio')).toHaveText('<b>Plain text</b>');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: 'test-results/tts-bot-profile-' + width + '.png', fullPage: true });
  });
}

test('TTS Bot Profile without guild Premium can rename and restore only the name', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('vozen.lang', 'en');
    sessionStorage.setItem('vozen.ecosystem.dtoken', 'fixture-token');
    sessionStorage.setItem('vozen.ecosystem.authexp', String(Date.now() + 3600000));
  });
  const writes = [];
  const profile = {
    botId, canEditImages: false, defaultName: 'Vozen TTS', nick: 'Existing name',
    avatar: '0123456789abcdef0123456789abcdef', banner: 'fedcba9876543210fedcba9876543210',
  };
  await page.route('https://api.vozen.org/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/dashboard/guilds') {
      return route.fulfill({ json: { guilds: [{ id: guildId, name: 'Profile QA' }] } });
    }
    if (path.endsWith('/bot-profile')) {
      if (route.request().method() === 'POST') {
        const patch = route.request().postDataJSON();
        writes.push(patch);
        profile.nick = patch.nick || null;
      }
      return route.fulfill({ json: profile });
    }
    return route.fulfill({ json: { config: {} } });
  });
  await page.route('https://cdn.discordapp.com/**', route => route.abort());
  await page.goto('/dashboard.html');
  await page.getByRole('button', { name: 'Profile QA' }).click();
  await page.getByRole('button', { name: 'Bot Profile' }).click();
  const form = page.locator('.tts-bot-profile form');
  await expect(form.getByText(/requires Vozen Premium/)).toBeVisible();
  await expect(form.locator('[data-image="avatar"]')).toBeHidden();
  await expect(form.locator('[data-image="banner"]')).toBeHidden();
  const avatar = form.locator('.tts-profile-avatar img');
  const banner = form.locator('.tts-profile-banner img');
  await expect(avatar).toHaveAttribute('src', new RegExp(profile.avatar));
  await expect(banner).toHaveAttribute('src', new RegExp(profile.banner));
  await form.getByLabel('Display name').fill('New name');
  await form.getByRole('button', { name: 'Apply profile' }).click();
  await expect.poll(() => writes).toEqual([{ nick: 'New name' }]);
  await expect(form.getByRole('button', { name: 'Apply profile' })).toBeDisabled();
  page.once('dialog', dialog => dialog.accept());
  await form.getByRole('button', { name: 'Restore default name' }).click();
  await expect.poll(() => writes).toEqual([{ nick: 'New name' }, { nick: '' }]);
  await expect(form.getByLabel('Display name')).toHaveValue('');
  await expect(avatar).toHaveAttribute('src', new RegExp(profile.avatar));
  await expect(banner).toHaveAttribute('src', new RegExp(profile.banner));
});
