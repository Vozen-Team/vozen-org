// Synthetic APIs only. Never publishes a panel or changes real Discord roles.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.HELPER_TEST_URL || 'http://127.0.0.1:4190/panel/helper-tracker/';
const catalogue = JSON.parse(await readFile(new URL('./fixtures/helper-features.json', import.meta.url)));
const schema = catalogue.features.find(feature => feature.key === 'community.role_panels').schema;
const browser = await chromium.launch();
try {
  for (const scenario of ['edit', 'mobile', 'future-field', 'manage', 'load-error', 'repair-error', 'delete-error', 'save-error', 'disabled', 'reduced-motion', 'dismiss', 'route-change']) {
    if (process.env.ROLE_PANEL_SCENARIO && scenario !== process.env.ROLE_PANEL_SCENARIO) continue;
    const page = await browser.newPage({ viewport: { width: scenario === 'mobile' ? 390 : 1440, height: 900 } });
    const reduced = scenario === 'reduced-motion';
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    let saved = { channel: '20', roleIds: ['31', '32'], panelTitle: 'Community roles', panelDescription: 'Choose your interests.', maxRoles: 5, selectionMode: 'multiple', removeOnUnselect: true };
    if (scenario === 'future-field') saved.futureOption = 'preserve this';
    let revision = 1, writes = 0, publishes = 0, repairs = 0, deletes = 0;
    let panels = [{ message_id: '100', channel_id: '20', title: saved.panelTitle, role_ids: saved.roleIds, selection_mode: 'multiple' }];
    const enabled = scenario !== 'disabled';
    const feature = { key: 'community.role_panels', label: 'Role panels', category: 'community', available: true, enabled };
    await page.route('**/api/**', async route => {
      const request = route.request(), method = request.method();
      const path = new URL(request.url()).pathname.replace(/^.*?(?=\/api\/)/, '');
      let value;
      if (path === '/api/me') value = { id: 'qa-user', guildId: '10', dbOk: true };
      else if (path === '/api/guilds') value = { guilds: [{ id: '10', name: 'Sample', canManage: true }] };
      else if (path === '/api/guild-context') value = { guildId: '10', name: 'Sample', permissions: '8',
        channels: [{ id: '20', name: 'choose-roles', type: 'text' }], roles: [
          { id: '10', name: 'everyone', position: 0, manageable: false },
          { id: '31', name: 'Gaming', position: 1, manageable: true },
          { id: '32', name: 'Events', position: 2, manageable: true },
          { id: '99', name: 'Locked', position: 10, manageable: false },
        ], hierarchy: { known: true }, capabilities: { channelSelectors: true, roleSelectors: true, permissionPreflight: true } };
      else if (path === '/api/config/features') value = { guildId: '10', features: [feature] };
      else if (path === '/api/config/features/community.role_panels') {
        if (method === 'PUT') {
          writes++;
          const input = request.postDataJSON();
          assert.equal(input.expected_revision, revision);
          assert.equal(input.enabled, enabled);
          assert.equal(input.config.panelDescription, saved.panelDescription);
          assert.equal(input.config.maxRoles, saved.maxRoles);
          if (scenario === 'future-field') assert.equal(input.config.futureOption, 'preserve this');
          if (scenario === 'save-error') { await route.fulfill({ status: 503, json: { code: 'temporary_failure' } }); return; }
          saved = input.config; revision++;
        }
        const sections = schema.sections.map(section => ({ ...section, fields: [...section.fields,
          ...(scenario === 'future-field' ? [{ key: 'futureOption', label: 'Saved option', kind: 'text' }] : [])] }));
        value = { ...feature, guildId: '10', revision, config: saved, defaults: saved, schema: { ...schema, sections } };
      } else if (path.endsWith('/preflight')) value = { guildId: '10', ok: true, issues: [] };
      else if (path === '/api/role-panels' && method === 'GET') {
        if (scenario === 'load-error') { await route.fulfill({ status: 503, json: { code: 'temporary_failure' } }); return; }
        value = { guildId: '10', panels };
      } else if (path === '/api/role-panels/100' && method === 'PUT') {
        publishes++;
        const input = request.postDataJSON();
        assert.deepEqual(input.roleIds, saved.roleIds);
        assert.equal(input.selectionMode, saved.selectionMode);
        panels = [{ ...panels[0], title: input.title, role_ids: input.roleIds, selection_mode: input.selectionMode }];
        // The real API republishes the feature configuration with the panel, which bumps the revision.
        revision++;
        value = { ok: true, messageId: '100', config: saved };
      } else if (path.endsWith('/repair') && method === 'POST') {
        repairs++;
        if (scenario === 'repair-error') { await route.fulfill({ status: 503, json: { code: 'temporary_failure' } }); return; }
        panels = panels.map(panel => ({ ...panel, message_id: '101' }));
        value = { ok: true, messageId: '101', config: saved };
      } else if (path.startsWith('/api/role-panels/') && method === 'DELETE') {
        deletes++;
        if (scenario === 'delete-error') { await route.fulfill({ status: 503, json: { code: 'temporary_failure' } }); return; }
        panels = []; value = { ok: true, messageId: path.split('/').at(-1) };
      } else if (path === '/api/quotas') value = { plan: 'Free', limits: {}, usage: {} };
      else if (path === '/api/stats') value = { guildId: '10', totalCases: 0 };
      else {
        assert.equal(method, 'GET', 'no unexpected mutation ' + path);
        await route.fulfill({ status: 503, json: {} }); return;
      }
      await route.fulfill({ json: value });
    });
    await page.goto(base + '#/config/community.role_panels');
    const tabs = page.getByRole('tab'); await tabs.first().waitFor();
    assert.equal(await tabs.count(), 3);
    await tabs.nth(1).click();
    assert.equal(await page.getByRole('checkbox', { name: /@Locked/ }).isDisabled(), true);
    if (scenario === 'future-field') assert.equal(await page.getByRole('textbox', { name: 'Saved option', exact: true }).inputValue(), 'preserve this');
    await tabs.first().click();
    const title = page.getByRole('textbox', { name: 'Panel title', exact: true });
    if (['edit', 'mobile', 'future-field', 'save-error'].includes(scenario)) {
      await title.fill('My community'); await title.blur();
      assert.equal(await page.locator('.role-panel-preview h4').innerText(), 'My community');
      if (scenario === 'save-error') {
        await page.getByRole('button', { name: 'Try again', exact: true }).waitFor();
        assert.equal(saved.panelTitle, 'Community roles');
        assert.equal(await title.inputValue(), 'My community');
      } else {
        await tabs.nth(2).click();
        await page.locator('.role-panel-manager .template-row b').filter({ hasText: 'My community' }).waitFor();
        assert.ok(writes > 0); assert.ok(publishes > 0); assert.equal(saved.panelTitle, 'My community');
        if (scenario === 'edit') {
          await tabs.first().click();
          const before = publishes;
          await title.fill('');
          await title.pressSequentially('Roles', { delay: 500 });
          await new Promise(resolve => setTimeout(resolve, 600));
          assert.equal(publishes, before, 'typing saves but does not republish the Discord panel');
          await title.blur();
          for (let i = 0; i < 50 && publishes < before + 1; i++) await new Promise(resolve => setTimeout(resolve, 100));
          await new Promise(resolve => setTimeout(resolve, 500));
          assert.equal(publishes, before + 1, 'leaving the field publishes the panel once');
          await tabs.nth(1).click();
          const published = () => page.waitForResponse(response => response.request().method() === 'PUT'
            && new URL(response.url()).pathname.endsWith('/api/role-panels/100'));
          const modeSaved = published();
          await page.getByRole('combobox', { name: /^Members can choose/ }).selectOption('unique');
          await modeSaved;
          assert.equal(saved.selectionMode, 'unique');
          const removalSaved = published();
          await page.getByRole('checkbox', { name: /^Allow members to remove roles/ }).uncheck();
          await removalSaved;
          assert.equal(saved.removeOnUnselect, false);
          const rolesSaved = published();
          await page.getByRole('checkbox', { name: '@Events', exact: true }).uncheck();
          await rolesSaved;
          assert.deepEqual(saved.roleIds, ['31']);
          await tabs.first().click();
          assert.deepEqual(await page.locator('.role-panel-preview .role-panel-chips > span').allTextContents(), ['Gaming']);
          // With no roles there is nothing to publish: leaving a field must not save again.
          await tabs.nth(1).click();
          await page.getByRole('checkbox', { name: '@Gaming', exact: true }).uncheck();
          for (let i = 0; i < 50 && saved.roleIds.length > 0; i++) await new Promise(resolve => setTimeout(resolve, 100));
          assert.deepEqual(saved.roleIds, []);
          await new Promise(resolve => setTimeout(resolve, 600));
          const settled = writes;
          await tabs.first().click();
          for (let i = 0; i < 2; i++) {
            await title.focus(); await title.blur();
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          assert.equal(writes, settled, 'leaving a field with nothing to publish does not save again');
        }
      }
    } else if (scenario === 'manage') {
      await tabs.nth(2).click();
      const manager = page.locator('.role-panel-manager');
      await manager.getByRole('button', { name: 'Repair', exact: true }).click();
      await manager.getByRole('button', { name: 'Delete', exact: true }).click();
      await manager.locator('.template-row').waitFor({ state: 'hidden' });
      assert.equal(repairs, 1); assert.equal(deletes, 1); assert.equal(panels.length, 0);
    } else if (['load-error', 'repair-error', 'delete-error'].includes(scenario)) {
      await tabs.nth(2).click();
      const manager = page.locator('.role-panel-manager');
      if (scenario !== 'load-error') await manager.getByRole('button', { name: scenario === 'repair-error' ? 'Repair' : 'Delete', exact: true }).click();
      await manager.getByRole('alert').waitFor();
      assert.equal(await manager.locator('.template-row').count(), scenario === 'load-error' ? 0 : 1);
      assert.equal(panels.length, 1);
    } else {
      await page.locator('.spam-demo-button').click();
      const dialog = page.getByRole('dialog'); await dialog.waitFor();
      const options = dialog.locator('.role-panel-demo-choices button'), selected = dialog.locator('.role-panel-demo-member .role-panel-chips > span');
      if (scenario === 'dismiss') {
        await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
        assert.equal(await page.locator('.spam-demo-button').evaluate(el => el === document.activeElement), true);
      } else if (scenario === 'route-change') {
        await page.evaluate(() => { window.location.hash = '#/features'; });
        await dialog.waitFor({ state: 'hidden' });
      } else {
        if (reduced) { await page.waitForTimeout(2600); assert.equal(await selected.count(), 0); }
        else { await selected.first().waitFor(); assert.equal(await selected.count(), 1); }
        await dialog.locator('.moderation-demo-scenarios button').first().click();
        await options.first().click(); await options.nth(1).click(); assert.equal(await selected.count(), 2);
        await options.first().click(); assert.equal(await selected.count(), 1);
        await dialog.locator('.moderation-demo-scenarios button').nth(1).click();
        await options.first().click(); await options.nth(1).click(); assert.deepEqual(await selected.allTextContents(), ['Events']);
        await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
      }
      assert.equal(writes + publishes + repairs + deletes, 0, 'demo must never mutate Discord or configuration');
    }
    assert.deepEqual(errors, []);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    console.log('PASS role-panels-' + scenario);
    await page.close();
  }
} finally { await browser.close(); }
