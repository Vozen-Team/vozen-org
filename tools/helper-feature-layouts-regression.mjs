// Walks every Helper feature that uses the shared settings layout against the
// loopback preview (tools/helper-feature-preview.mjs). Read-only: no saves.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import { readdir, readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const base = process.env.HELPER_PREVIEW_URL || 'http://127.0.0.1:4183';
const shots = new URL('../output/playwright/feature-layouts/', import.meta.url);
await mkdir(shots, { recursive: true });
const dir = new URL('../apps/helper-panel/src/feature-layouts/', import.meta.url);
const paths = JSON.parse(await readFile(new URL('../apps/helper-panel/src/panel-paths.json', import.meta.url), 'utf8'));
const keys = [];
for (const file of await readdir(dir)) keys.push(JSON.parse(await readFile(new URL(file, dir), 'utf8')).key);
const only = process.env.FEATURES?.split(',');
const runs = [
  { locale: 'en', width: 1440 },
  { locale: 'pt', width: 1440 },
  { locale: 'ar', width: 390 },
  { locale: 'zh', width: 390 },
];
const problems = [];
const browser = await chromium.launch();
try {
  for (const key of keys.filter(key => !only || only.includes(key)).sort()) {
    for (const run of runs) {
      const page = await browser.newPage({ viewport: { width: run.width, height: 900 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error' && !/503|Failed to load resource|Loading the font/.test(message.text())) errors.push(message.text()); });
      let writes = 0;
      page.on('request', request => { if (request.method() !== 'GET' && request.url().includes('/api/')) writes++; });
      const label = `${key} ${run.locale}@${run.width}`;
      try {
        await page.goto(`${base}/panel/${paths[key]}/?lang=${run.locale}`);
        const panel = page.locator('.feature-settings');
        await panel.waitFor({ timeout: 15000 });
        const tabs = await panel.locator('[role=tab]').count();
        for (let index = 0; index < Math.max(tabs, 1); index++) {
          if (tabs) await panel.locator('[role=tab]').nth(index).click();
          const visible = panel.locator('[role=tabpanel]:not([hidden]), [role=region]:not([hidden])');
          if (!(await visible.count())) problems.push(`${label}: tab ${index} has no visible panel`);
          const empty = await visible.evaluate(node => !node.querySelector('.field-grid > *, .feature-settings__slot, .moderation-commands, .spam-tab-intro'));
          if (empty) problems.push(`${label}: tab ${index} is empty`);
        }
        const leftovers = await panel.locator('.feature-settings__group h3').allTextContents();
        if (leftovers.some(text => /Other settings|Outras definições/.test(text))) problems.push(`${label}: fields fell through to "Other settings"`);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
        if (overflow) problems.push(`${label}: horizontal overflow`);
        if (run.width === 1440) await page.screenshot({ path: fileURLToPath(new URL(`${paths[key]}-${run.locale}.png`, shots)), fullPage: true });
        await panel.locator('.spam-demo-button').click();
        const dialog = page.locator('dialog.feature-simulation[open]');
        await dialog.waitFor();
        const stages = dialog.locator('.moderation-demo-scenarios button');
        const count = await stages.count();
        if (count < 2) problems.push(`${label}: demo has ${count} stages`);
        for (let index = 0; index < count; index++) {
          await stages.nth(index).click();
          if (!(await dialog.locator('.feature-demo-message').count())) problems.push(`${label}: demo stage ${index} is empty`);
        }
        const dialogOverflow = await dialog.evaluate(node => node.scrollWidth > node.clientWidth + 1);
        if (dialogOverflow) problems.push(`${label}: demo overflows horizontally`);
        if (run.width !== 1440 && run.locale === 'ar') await page.screenshot({ path: fileURLToPath(new URL(`${paths[key]}-demo-${run.locale}.png`, shots)) });
        await dialog.getByRole('button').first().click();
        if (writes) problems.push(`${label}: ${writes} write request(s) while browsing`);
      } catch (error) {
        problems.push(`${label}: ${error.message.split('\n')[0]}`);
      }
      if (errors.length) problems.push(`${label}: console ${errors.join(' | ').slice(0, 200)}`);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
console.log(`${keys.length} layouts checked in ${runs.length} configurations.`);
if (problems.length) { console.log(problems.join('\n')); process.exitCode = 1; } else console.log('No problems found.');
