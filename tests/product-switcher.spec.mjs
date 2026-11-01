import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const sheets = [
  ['settings', 'site/css/settings-v2.css', 'settings-product-switch'],
  ...(process.env.MUSIC_PRODUCT_CSS ? [['music', process.env.MUSIC_PRODUCT_CSS, 'music-product-switch']] : []),
];
for (const [name, file, className] of sheets) {
  for (const width of [390, 1440]) {
    test(`${name} product icons and trailing checkmark at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.setContent(`<select class="${className}" id="product-switcher" aria-label="Product"><option value="tts">Vozen TTS</option><option value="helper" selected>Vozen Helper</option><option value="music">Vozen Music</option></select>`);
      await page.addStyleTag({ content: await readFile(file, 'utf8') });
      await page.addStyleTag({ content: 'body{margin:32px;background:#0b1523;color:#f4f7ff}select,select::picker(select){appearance:base-select}select{color:inherit;background:#101d2e;padding:12px;border:1px solid #344b68;border-radius:10px}select::picker(select){color:inherit;background:#101d2e;padding:6px;border:1px solid #344b68;border-radius:10px}option{padding:10px}option:checked{background:#183d46}' });
      const select = page.getByRole('combobox', { name: 'Product' });
      await select.click();
      const images = [];
      for (const option of await select.locator('option').all()) {
        const style = await option.evaluate(element => ({
          icon: getComputedStyle(element, '::before').backgroundImage,
          size: getComputedStyle(element, '::before').width,
          order: getComputedStyle(element, '::checkmark').order,
        }));
        expect(style.icon).toContain('data:image/png;base64,');
        expect(style.size).toBe('30px');
        expect(style.order).toBe('1');
        images.push(style.icon);
      }
      expect(new Set(images).size).toBe(3);
      await page.screenshot({ path: `output/product-switcher-${name}-${width}.png` });
      await page.keyboard.press('Escape');
      await expect(select).toHaveValue('helper');
      await select.focus();
      await page.keyboard.press('Space');
      await page.keyboard.press('End');
      await page.keyboard.press('Enter');
      await expect(select).toHaveValue('music');
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    });
  }
}
