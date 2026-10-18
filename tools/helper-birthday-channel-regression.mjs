// Synthetic API fixtures only: no real Discord channel or birthday is created.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.HELPER_TEST_URL || 'http://127.0.0.1:5179/panel/helper-tracker/';
const key = 'community.birthdays';
const browser = await chromium.launch();
try {
  for (const scenario of ['create','pt','mobile','no-permissions','collision','permission-error','uncertain','reused','wrong-guild','wrong-type','disabled-feature','save-failure','route-change','guild-switch','double-click']) {
    const page = await browser.newPage(scenario === 'mobile' ? { viewport: { width: 390, height: 844 } } : {});
    const pt = scenario === 'pt';
    const name = pt ? 'aniversarios' : 'birthdays';
    if (pt) await page.addInitScript(() => localStorage.setItem('vozen.lang', 'pt'));
    let guild = '10', creates = 0, writes = 0, revision = 1;
    let saved = { channel: '20', message: 'Happy birthday, {user}!', timezone: 'UTC' };
    const enabled = scenario !== 'disabled-feature';
    const feature = { key, label: 'Birthdays', category: 'community', enabled, available: true };
    const mutations = [];
    await page.route('**/api/**', async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname.replace(/^.*?(?=\/api\/)/, '');
      if (request.method() !== 'GET') mutations.push(path);
      let value;
      if (path === '/api/birthdays/channel') {
        creates++;
        assert.equal(request.method(), 'POST');
        assert.deepEqual(request.postDataJSON(), { name });
        const requestedGuild = guild;
        await new Promise(resolve => setTimeout(resolve, ['route-change','guild-switch'].includes(scenario) ? 1400 : 350));
        const error = { collision: 'birthday_channel_name_exists', 'permission-error': 'birthday_bot_permissions_required', uncertain: 'birthday_creation_uncertain' }[scenario];
        if (error) { await route.fulfill({ status: 409, json: { code: error, message: error } }); return; }
        value = { guildId: scenario === 'wrong-guild' ? '99' : requestedGuild,
          channel: { id: '30', name, type: scenario === 'wrong-type' ? 4 : 0 }, reused: scenario === 'reused' };
      } else if (path === '/api/me') value = { id: 'qa-user', guildId: guild, dbOk: true };
      else if (path === '/api/guilds') value = { guilds: [{ id: '10', name: 'Alpha', canManage: true }, { id: '11', name: 'Beta', canManage: true }] };
      else if (path === '/api/session/switch') { guild = request.postDataJSON().guild_id; value = { ok: true, guildId: guild }; }
      else if (path === '/api/guild-context') value = {
        guildId: guild, name: 'Sample', permissions: '8', channels: [{ id: '20', name: 'general', type: 'text' }], roles: [],
        bot: { available: true, permissions: scenario === 'no-permissions' ? '2048' : '8' }, hierarchy: { known: true },
        capabilities: { channelSelectors: true, roleSelectors: true, permissionPreflight: true },
      };
      else if (path === '/api/config/features') value = { guildId: guild, features: [feature] };
      else if (path === `/api/config/features/${key}`) {
        if (request.method() === 'PUT') {
          writes++;
          const body = request.postDataJSON();
          assert.equal(body.enabled, enabled, 'creation must not enable birthdays');
          assert.equal(body.expected_revision, revision);
          assert.deepEqual(body.config, { ...saved, channel: '30' }, 'creation must preserve the message and timezone');
          if (scenario === 'save-failure') { await route.fulfill({ status: 503, json: { code: 'temporary_failure' } }); return; }
          saved = body.config; revision++;
        }
        value = { ...feature, guildId: guild, config: saved, defaults: {}, revision,
          schema: { sections: [{ title: 'Birthdays', fields: [
            { key: 'channel', label: 'Default channel', kind: 'channel' },
            { key: 'message', label: 'Birthday message', kind: 'textarea' },
            { key: 'timezone', label: 'Time zone', kind: 'text' },
          ] }] } };
      } else if (path.endsWith('/preflight')) value = { guildId: guild, ok: true, issues: [] };
      else if (path === '/api/quotas') value = { plan: 'Free', limits: {}, usage: {} };
      else if (path === '/api/stats') value = { guildId: guild, totalCases: 0 };
      else if (path === '/api/cases') value = { cases: [] };
      else if (path === '/api/audit') value = { events: [] };
      else if (path === '/api/activity') value = { activity: [] };
      else { await route.fulfill({ status: 503, json: {} }); return; }
      await route.fulfill({ json: value });
    });
    await page.goto(`${base}#/config/${key}`);
    const setup = page.getByRole('region', { name: pt ? 'Criar canal de aniversários' : 'Create a birthday channel' });
    const button = setup.getByRole('button', { name: pt ? 'Criar canal de aniversários' : 'Create birthday channel', exact: true });
    await button.waitFor();
    const selected = page.locator('.config-section select').first();
    assert.equal(await selected.inputValue(), '20');
    if (['create','pt','mobile'].includes(scenario)) {
      await mkdir('output/playwright', { recursive: true });
      await page.locator('.config-section').screenshot({ path: `output/playwright/birthday-channel-form-${scenario}.png` });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    if (scenario === 'no-permissions') {
      assert.equal(await button.isDisabled(), true);
      assert.equal(creates, 0);
    } else {
      const input = setup.getByRole('textbox');
      assert.equal(await input.inputValue(), name);
      await input.fill('../bad'); assert.equal(await button.isDisabled(), true);
      await input.fill(name);
      if (scenario === 'double-click') await button.evaluate(element => { element.click(); element.click(); });
      else await button.click();
      assert.equal(await setup.locator('button:enabled').count(), 0, 'creation is disabled in flight or hidden after success');
      if (['route-change','guild-switch'].includes(scenario)) {
        if (scenario === 'route-change') await page.evaluate(() => { window.location.hash = '#/features'; });
        else await page.getByRole('combobox', { name: 'Current server', exact: true }).selectOption('11');
        await page.waitForTimeout(1700);
        assert.equal(await page.locator('select option[value="30"]').count(), 0);
        assert.equal(writes, 0, 'late responses must not save into another guild or view');
      } else if (['collision','permission-error','uncertain','wrong-guild','wrong-type'].includes(scenario)) {
        await setup.getByRole('alert').waitFor();
        assert.equal(await selected.inputValue(), '20');
        assert.equal(writes, 0);
        if (scenario === 'collision') assert.match(await setup.getByRole('alert').innerText(), /already exists/);
        if (scenario === 'permission-error') assert.match(await setup.getByRole('alert').innerText(), /permissions/);
        if (scenario === 'uncertain') assert.match(await setup.getByRole('alert').innerText(), /Check Discord before retrying/);
      } else {
        await setup.getByRole('status').filter({ hasText: pt ? 'está pronto' : 'is ready' }).waitFor();
        assert.equal(await selected.inputValue(), '30');
        await page.waitForTimeout(1500);
        assert.ok(writes > 0, 'selection must auto-save');
        assert.equal(saved.channel, scenario === 'save-failure' ? '20' : '30');
        assert.equal(await setup.getByRole('button').count(), 0);
      }
      assert.equal(creates, 1, 'no duplicate creation requests or automatic retries');
    }
    assert.ok(mutations.every(path => ['/api/birthdays/channel', '/api/session/switch', `/api/config/features/${key}`, `/api/config/features/${key}/preflight`].includes(path)));
    console.log(`PASS birthday-channel-${scenario}`);
    await page.close();
  }
} finally { await browser.close(); }
