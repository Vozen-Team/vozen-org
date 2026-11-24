// Synthetic APIs only: no live server settings or Discord actions.
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createSiteServer, closeSiteServer } from './serve-site.mjs';

const fixture = JSON.parse(await readFile(new URL('./fixtures/antispam-settings.json', import.meta.url)));
const translations = JSON.parse(await readFile(new URL('../apps/helper-panel/src/antispam-copy.json', import.meta.url)));
const preview = await createSiteServer(0);
const browser = await chromium.launch();
const directory = 'output/antispam-review-20261102';
await mkdir(directory, { recursive: true });
try {
  for (const scenario of ['pt', 'en', 'mobile', 'tablet', 'fr', 'es', 'de', 'tr', 'ar', 'zh', 'ru', 'ko', 'save-error', 'missing-resources']) {
    const locale = ['mobile', 'tablet', 'save-error', 'missing-resources'].includes(scenario) ? 'pt' : scenario;
    const page = await browser.newPage({ viewport: scenario === 'mobile' ? { width: 390, height: 844 } : scenario === 'tablet' ? { width: 900, height: 1000 } : { width: 1440, height: 1200 } });
    await page.addInitScript(locale => localStorage.setItem('vozen.lang', locale), locale);
    let config = { ...structuredClone(fixture.config), futureSetting: 'Keep this' }, revision = 1, writes = 0;
    let enabled = true;
    const original = structuredClone(config);
    const legacyFields = scenario === 'pt' ? [
      { key: 'capsPercent', label: 'Legacy uppercase percentage', kind: 'number' },
      { key: 'capsMinLetters', label: 'Legacy uppercase minimum', kind: 'number' },
    ] : [];
    const feature = { key: 'protection.antispam', label: 'Spam protection', category: 'protection', enabled, available: true, configurable: true };
    await page.route('**/api/**', async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname.replace(/^.*?(?=\/api\/)/, '');
      let value;
      if (path === '/api/me') value = { id: 'qa-user', guildId: '10', dbOk: true };
      else if (path === '/api/guilds') value = { guilds: [{ id: '10', name: 'Servidor de teste', canManage: true }] };
      else if (path === '/api/guild-context') value = { guildId: '10', name: 'Servidor de teste', permissions: '8', channels: [{ id: '20', name: 'geral', type: 'text' }, { id: '21', name: 'moderação', type: 'text' }], roles: [{ id: '10', name: 'everyone', position: 0 }, { id: '30', name: 'Equipa', position: 1, manageable: true }], capabilities: { channelSelectors: scenario !== 'missing-resources', roleSelectors: scenario !== 'missing-resources', permissionPreflight: true }, stale: false };
      else if (path === '/api/config/features') value = { guildId: '10', features: [feature] };
      else if (path === '/api/config/features/protection.antispam') {
        if (request.method() === 'PUT') {
          writes++;
          const body = request.postDataJSON();
          assert.equal(body.expected_revision, revision);
          assert.equal(body.config.futureSetting, 'Keep this');
          if (scenario === 'save-error') { await route.fulfill({ status: 503, json: { code: 'temporary_failure' } }); return; }
          config = body.config; enabled = body.enabled; revision++;
        }
        value = { ...feature, enabled, guildId: '10', config, defaults: fixture.config, revision, schema: { sections: [{ title: 'Resposta automática', description: '', fields: [...fixture.fields, ...legacyFields, { key: 'futureSetting', label: 'Future setting', kind: 'text' }] }] } };
      } else if (path.endsWith('/preflight')) value = { guildId: '10', ok: true, issues: [] };
      else if (path === '/api/stats') value = { guildId: '10', totalCases: 0 };
      else if (path === '/api/quotas') value = { plan: 'Free', limits: {}, usage: {} };
      else if (['/api/cases', '/api/audit', '/api/activity'].includes(path)) value = { cases: [], events: [], activity: [] };
      else { await route.fulfill({ status: 503, json: {} }); return; }
      await route.fulfill({ json: value });
    });
    await page.goto(`${preview.origin}/panel/antispam/`);
    const setup = page.locator('.antispam-page:not(.spam-settings-skeleton) .spam-settings');
    await setup.waitFor();
    const tabs = setup.getByRole('tab');
    assert.equal(await tabs.count(), 3);
    assert.deepEqual(await tabs.allTextContents(), translations[locale].slice(0, 3));
    assert.equal(await setup.getByRole('spinbutton').count(), 5);
    assert.equal(await setup.getByRole('spinbutton', { name: translations[locale][17], exact: true }).count(), 1);
    assert.equal(await setup.locator('.spam-tab-intro:visible').textContent(), translations[locale][12]);
    assert.equal(await setup.getByRole('region', { name: translations[locale][3], exact: true }).getByRole('spinbutton').count(), 3);
    assert.equal(await setup.getByRole('region', { name: translations[locale][4], exact: true }).getByRole('spinbutton').count(), 2);
    assert.equal(await setup.locator('.spam-toolbar').getByRole('button', { name: translations[locale][10], exact: true }).count(), 1);
    await tabs.nth(1).click();
    assert.equal(await setup.getByRole('spinbutton').count(), 1);
    assert.ok((await setup.innerText()).includes(translations[locale][15]));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (['pt', 'mobile', 'en'].includes(scenario)) await page.screenshot({ path: `${directory}/${scenario}-actions.png`, fullPage: true });
    await tabs.nth(2).click();
    assert.equal(await setup.getByRole('spinbutton').count(), 0, 'legacy uppercase fields stay hidden');
    assert.equal(await setup.getByRole('textbox').inputValue(), 'Keep this');
    await tabs.nth(0).focus();
    await tabs.nth(0).press(locale === 'ar' ? 'ArrowLeft' : 'ArrowRight');
    await page.getByRole('tab', { selected: true }).waitFor();
    assert.equal(await tabs.nth(1).getAttribute('aria-selected'), 'true');
    assert.equal(writes, 0, 'opening groups must not write configuration');
    assert.deepEqual(config, original);
    if (scenario === 'pt') {
      await setup.getByRole('tabpanel', { name: translations[locale][1] }).getByRole('checkbox').first().check();
      await page.waitForFunction(() => document.querySelector('.spam-mode-note'));
      assert.equal(await setup.getByRole('spinbutton').isDisabled(), true);
      assert.equal(await setup.locator('.spam-warning-field select').isDisabled(), true);
      assert.equal(await setup.locator('select').last().isDisabled(), false, 'staff logs remain configurable');
      await page.waitForTimeout(1000);
      assert.equal(config.alertOnly, true);
      assert.equal(config.timeoutSeconds, 60);
      assert.equal(config.floodCount, 6);
      await setup.getByRole('tabpanel', { name: translations[locale][1] }).getByRole('checkbox').first().uncheck();
      await page.waitForTimeout(1000);
      assert.equal(config.alertOnly, false);
      assert.equal(await setup.locator('.spam-warning-field select').isDisabled(), false);
      await tabs.nth(2).click();
      await setup.getByRole('checkbox', { name: '#geral', exact: true }).check();
      await page.waitForTimeout(1000);
      assert.deepEqual(config.ignoredChannels, ['20']);
    } else if (scenario === 'save-error') {
      await setup.getByRole('spinbutton').fill('90');
      await page.waitForTimeout(1200);
      assert.equal(config.timeoutSeconds, 60);
      assert.ok(writes > 0);
      assert.equal(await setup.getByRole('spinbutton').inputValue(), '90');
    } else if (scenario === 'missing-resources') {
      await tabs.nth(2).click();
      assert.equal(await setup.getByRole('checkbox', { name: '#geral', exact: true }).isDisabled(), true);
    }
    await tabs.nth(0).click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (['pt', 'mobile', 'en', 'ar'].includes(scenario)) await page.screenshot({ path: `${directory}/${scenario}.png`, fullPage: true });
    if (scenario === 'pt') {
      const saved = page.waitForResponse(response => response.url().endsWith('/api/config/features/protection.antispam')
        && response.request().method() === 'PUT' && response.ok());
      await setup.getByRole('spinbutton', { name: translations.pt[17], exact: true }).fill('8');
      await saved;
      assert.equal(config.floodCount, 8);
      assert.equal(config.windowSeconds, 10);
    }
    console.log(`PASS antispam-${scenario}`);
    await page.close();
  }
} finally { await browser.close(); await closeSiteServer(preview.server); }
