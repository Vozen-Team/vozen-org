import { test, expect } from '@playwright/test';

test('entry pages do not load standalone navigation CSS already included in their bundles', async ({ page }) => {
  for (const route of ['/', '/tts/', '/helper/']) {
    await page.goto(route);
    await expect(page.locator('link[rel="stylesheet"][href*="global-nav-v1.css"]')).toHaveCount(0);
    await expect(page.locator('.vozen-global-nav')).toHaveCount(1);
  }
});

test('the shared wordmark has a small dedicated font subset', async ({ page }) => {
  const response = await page.request.get('/assets/fonts/unbounded-brand-latin.woff2');
  expect(response.ok()).toBe(true);
  expect((await response.body()).length).toBeLessThan(5000);
});

const entryPages = ['/', '/tts/', '/helper/'];
const widths = [320, 375, 768, 1024, 1440];

test('the shared header stays pinned and darkens consistently across public page families', async ({ page }) => {
  test.setTimeout(60_000);
  await page.route('https://api.vozen.org/api/dashboard/guilds', route => route.fulfill({ json: { guilds: [] } }));
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 700 });
    for (const route of ['/', '/tts/', '/helper/', '/commands/', '/premium.html', '/status.html', '/account/', '/dashboard.html', '/docs/', '/docs/tts/getting-started/install/', '/guides/discord-without-a-mic/', '/privacy.html', '/terms.html']) {
      await test.step(`${route} at ${width}px`, async () => {
        await page.goto(route);
        // Dashboard view initialization resets scroll on its next animation frame.
        if (route === '/dashboard.html') {
          await expect(page.locator('#dashAddServer')).toBeVisible();
          await page.evaluate(() => new Promise(requestAnimationFrame));
        }
        const header = page.locator('header.vozen-global-nav');
        await expect(header).toHaveCount(1);
        await expect(header).not.toHaveClass(/is-stuck/);
        await expect(header).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
        // Exercise scroll behavior even on the signed-out, short account page.
        await page.evaluate(() => { document.body.style.minHeight = '2200px'; window.scrollTo(0, 600); });
        await expect(header).toHaveClass(/is-stuck/);
        await expect(header).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
        expect(Math.abs((await header.boundingBox()).y), route).toBeLessThan(2);
        await page.evaluate(() => window.scrollTo(0, 0));
        await expect(header).not.toHaveClass(/is-stuck/);
      });
    }
  }
});

test('TTS discovers its headline font before the stylesheet finishes', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/tts/');
  const preload = page.locator('link[rel="preload"][as="font"][href="/assets/fonts/unbounded-critical-latin.woff2"]');
  await expect(preload).toHaveAttribute('crossorigin', 'anonymous');
  await expect(preload).toHaveAttribute('type', 'font/woff2');
  expect(await preload.evaluate(node => Boolean(node.compareDocumentPosition(document.querySelector('link[rel="stylesheet"]')) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  await expect(page.locator('#hearFlag img')).toHaveAttribute('src', '/assets/flags-v2/gb.svg');
  await expect(page.locator('.hear__chip img')).toHaveCount(5);
  await expect(page.locator('.voice-options')).not.toContainText(/[\u{1F1E6}-\u{1F1FF}]/u);
  await page.locator('.hear__chip[data-sample="it"]').click();
  await expect(page.locator('#hearFlag img')).toHaveAttribute('src', '/assets/flags-v2/it.svg');
  await page.locator('#hearFlag img').evaluate(image => image.decode());
  await page.locator('#languages').scrollIntoViewIfNeeded();
  await expect(page.locator('#languages')).toBeVisible();
  await expect(page.locator('#languages')).toHaveCSS('content-visibility', 'auto');
});

test('Premium finishes initialization and darkens navigation on scroll while purchases stay paused', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 700 });
    await page.goto('/premium.html', { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator('#nav')).not.toHaveClass(/is-stuck/);
    await page.evaluate(() => window.scrollTo(0, 600));
    await expect(page.locator('#nav')).toHaveClass(/is-stuck/);
    await expect(page.locator('#nav')).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(page.locator('.premium-unavailable')).toHaveCount(2);
    for (const button of await page.locator('.premium-unavailable').all()) await expect(button).toBeDisabled();
    expect(errors).toEqual([]);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator('#nav')).not.toHaveClass(/is-stuck/);
  }
});

test('TTS scroll-reveal sections actually become opaque, not merely clickable', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/tts/', { waitUntil: 'networkidle' });
  for (const section of await page.locator('.reveal:not([data-r])').all()) {
    if (!await section.isVisible()) continue;
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveCSS('opacity', '1');
  }
});

test('selected billing controls meet AA contrast on both product pages', async ({ page }) => {
  for (const path of ['/tts/', '/helper/']) {
    await page.goto(path, { waitUntil: 'networkidle' });
    const contrast = await page.locator('.bill-toggle__btn.is-active').first().evaluate((button) => {
      const luminance = (color) => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
      const style = getComputedStyle(button);
      const foreground = luminance(style.color);
      const background = luminance(style.backgroundColor);
      return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
    });
    expect(contrast, path).toBeGreaterThanOrEqual(4.5);
  }
});

test('Helper does not rewrite translated content for a duplicate locale event', async ({ page }) => {
  await page.goto('/helper/', { waitUntil: 'networkidle' });
  await expect(page.locator('#helper-title')).toHaveCSS('font-family', /Vozen Product Display/);
  expect(await page.evaluate(() => document.fonts.check('600 48px "Vozen Product Display"'))).toBe(true);
  const mutations = await page.evaluate(() => {
    const list = document.querySelector('[data-helper-cards]');
    const observer = new MutationObserver(() => {});
    observer.observe(list, { childList: true, subtree: true, characterData: true });
    window.dispatchEvent(new CustomEvent('vozen:languagechange', { detail: { language: 'en' } }));
    const count = observer.takeRecords().length;
    observer.disconnect();
    return count;
  });
  expect(mutations).toBe(0);
});

test('audio demo reports failure and lets the visitor retry', async ({ page }) => {
  await page.addInitScript(() => {
    let attempts = 0;
    HTMLMediaElement.prototype.play = function () {
      if (++attempts === 1) return Promise.reject(new DOMException('Unavailable', 'NotSupportedError'));
      this.dispatchEvent(new Event('playing'));
      return Promise.resolve();
    };
  });
  await page.goto('/tts/', { waitUntil: 'networkidle' });
  await page.locator('#hearBtn').click();
  await expect(page.locator('#hearStatus')).toContainText('Try again');
  await expect(page.locator('#hearBtn')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#hearBtn').click();
  await expect(page.locator('#hearBtn')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#hearStatus')).toHaveText('');
});

test('audio demo ignores stale failures when switching samples', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      if (this.src.endsWith('/en.mp3')) {
        return new Promise((resolve, reject) => { window.rejectOldSample = reject; });
      }
      this.dispatchEvent(new Event('playing'));
      return Promise.resolve();
    };
  });
  await page.goto('/tts/', { waitUntil: 'networkidle' });
  await page.locator('#hearBtn').click();
  await expect(page.locator('#hearStatus')).toContainText('Loading');
  await page.locator('[data-sample="pt"]').click();
  await page.evaluate(() => window.rejectOldSample(new DOMException('Old request failed', 'NotSupportedError')));
  await expect(page.locator('#hearBtn')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#hearStatus')).toHaveText('');
});

test('audio demo retries the real media request after a temporary server failure', async ({ page }) => {
  let requests = 0;
  await page.route('**/assets/samples/en.mp3', (route) => ++requests === 1
    ? route.fulfill({ status: 503, body: 'Temporarily unavailable' })
    : route.continue());
  await page.goto('/tts/', { waitUntil: 'networkidle' });
  await page.locator('#hearBtn').click();
  await expect(page.locator('#hearStatus')).toContainText('Try again');
  await page.locator('#hearBtn').click();
  await expect(page.locator('#hearBtn')).toHaveAttribute('aria-pressed', 'true');
  expect(requests).toBe(2);
});

test.beforeEach(async ({ page }) => {
  // Keep browser QA deterministic when CI or a sandbox blocks the optional
  // third-party analytics script. All first-party resources remain real.
  await page.route('https://static.cloudflareinsights.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
});

test('the TTS install result explains the first-value path without analytics', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto('/dashboard/?installed=1&install=installed', { waitUntil: 'networkidle' });

  await expect(page.getByRole('heading', { name: 'Vozen TTS is in your server' })).toBeVisible();
  await expect(page.locator('[data-install-outcome="installed"] li')).toHaveCount(3);
  await expect(page.getByText('/setup', { exact: true })).toBeVisible();
  await expect(page.locator('script[src*="cloudflareinsights"]')).toHaveCount(0);
  await expect(page.locator('[data-cf-beacon]')).toHaveCount(0);
  const overflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(overflow.content, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.viewport + 1);
});

test('the TTS install result exposes a useful cancellation state', async ({ page }) => {
  await page.goto('/dashboard/?installed=0&install=cancelled', { waitUntil: 'networkidle' });

  await expect(page.getByRole('heading', { name: 'Installation cancelled' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Try again' })).toHaveAttribute(
    'href',
    'https://api.vozen.org/api/install/tts/start?source=home',
  );
});

for (const path of entryPages) {
  for (const width of widths) {
    test(`${path} has no console, resource or horizontal-overflow failures at ${width}px`, async ({ page }) => {
      const consoleErrors = [];
      const failedResources = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('response', (response) => {
        if (response.status() >= 400) failedResources.push(`${response.status()} ${response.url()}`);
      });
      page.on('requestfailed', (request) => failedResources.push(`FAILED ${request.url()}`));
      await page.setViewportSize({ width, height: width < 640 ? 812 : 900 });
      await page.goto(path, { waitUntil: 'networkidle' });
      await expect(page.locator('h1')).toHaveCount(1);
      const overflow = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      }));
      expect(overflow.content, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.viewport + 1);
      if (path !== '/') {
        expect(overflow.height, `${path}: full-page CSS generation height at ${width}px`).toBeLessThanOrEqual(24_000);
      }
      const clippedPrimaryContent = await page.locator('h1, h1 span, .hero__cta a, .helper-hero__actions a, .eco-home-hero__actions a').evaluateAll((nodes) =>
        nodes.filter((node) => {
          const style = getComputedStyle(node);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
          const rect = node.getBoundingClientRect();
          const paintsOutsideOwnBox = node.scrollWidth > node.clientWidth + 1;
          return rect.width > 0 && (rect.left < -1 || rect.right > window.innerWidth + 1 || paintsOutsideOwnBox);
        }).map((node) => ({
          tag: node.tagName,
          text: node.textContent?.trim().slice(0, 80),
          clientWidth: node.clientWidth,
          scrollWidth: node.scrollWidth,
          font: getComputedStyle(node).font,
          rect: node.getBoundingClientRect().toJSON(),
        })),
      );
      expect(clippedPrimaryContent).toEqual([]);
      expect(consoleErrors).toEqual([]);
      expect(failedResources).toEqual([]);
    });
  }
}

test('localized entry routes expose their own language, title and translated copy', async ({ page }) => {
  const samples = [
    ['/fr/', 'fr', 'Un seul foyer.'],
    ['/de/tts/', 'de', 'Kein Mikro?'],
    ['/pt/helper/', 'pt-PT', 'Uma ajuda mais inteligente'],
    ['/ar/helper/', 'ar', 'مساعدة أذكى'],
    ['/zh/tts/', 'zh-Hant', '没有麦克风？'],
  ];
  for (const [path, language, copy] of samples) {
    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    await expect(page.locator('h1')).toContainText(copy);
    await expect(page).toHaveTitle(/Vozen/);
    if (language === 'ar') await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  }
});

test('every localized homepage heading wraps inside its hero at desktop and mobile widths', async ({ page }) => {
  test.setTimeout(90_000);
  const locales = ['', 'pt/', 'fr/', 'es/', 'de/', 'tr/', 'ar/', 'zh/', 'ru/', 'ko/'];
  for (const locale of locales) {
    for (const width of [320, 375, 768, 1280, 1792]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${locale}`, { waitUntil: 'networkidle' });
      const layout = await page.evaluate(() => {
        const heading = document.querySelector('.eco-home-hero h1');
        const box = heading?.getBoundingClientRect();
        return {
          page: document.documentElement.scrollWidth,
          headingWidth: heading?.clientWidth,
          headingContent: heading?.scrollWidth,
          headingRight: box?.right,
        };
      });
      expect(layout.page, `${locale || 'en'} at ${width}px page overflow: ${JSON.stringify(layout)}`).toBeLessThanOrEqual(width + 1);
      expect(layout.headingContent, `${locale || 'en'} at ${width}px clipped title: ${JSON.stringify(layout)}`).toBeLessThanOrEqual(layout.headingWidth + 1);
      expect(layout.headingRight, `${locale || 'en'} at ${width}px title outside viewport: ${JSON.stringify(layout)}`).toBeLessThanOrEqual(width + 1);
    }
  }
});

test('marketing and Docs language menus use all ten bundled SVG flags', async ({ page }) => {
  const consoleErrors = [];
  const failedResources = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) failedResources.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', (request) => failedResources.push(`FAILED ${request.url()}`));
  await page.goto('/tts/', { waitUntil: 'networkidle' });
  await page.locator('#langBtn').click();
  const marketingFlags = await page.locator('#langPanel .lang__opt img').evaluateAll(async (nodes) => {
    await Promise.all(nodes.map(image => image.decode()));
    return nodes.map(image => image.getAttribute('src'));
  });
  expect(marketingFlags).toHaveLength(10);
  expect(marketingFlags.every((src) => /^\/assets\/flags-v2\/(gb|pt|fr|es|de|tr|sa|tw|ru|kr)\.svg$/.test(src || ''))).toBe(true);
  await expect(page.locator('#langBtnFlag img')).toHaveAttribute('src', '/assets/flags-v2/gb.svg');

  await page.goto('/docs/', { waitUntil: 'networkidle' });
  const docsMenu = page.locator('[data-vozen-docs-language-menu]');
  await docsMenu.locator('[data-vozen-docs-language-button]').click();
  const docsFlags = await docsMenu.locator('[data-vozen-docs-language-panel] img').evaluateAll(async (nodes) => {
    await Promise.all(nodes.map(image => image.decode()));
    return nodes.map(image => image.getAttribute('src'));
  });
  expect(docsFlags).toHaveLength(10);
  expect(docsFlags.every((src) => /^\/assets\/flags-v2\/(gb|pt|fr|es|de|tr|sa|tw|ru|kr)\.svg$/.test(src || ''))).toBe(true);
  expect(consoleErrors).toEqual([]);
  expect(failedResources).toEqual([]);
});

test('the localized Helper page exposes translated product copy and a real accessible FAQ', async ({ page }) => {
  await page.goto('/pt/helper/', { waitUntil: 'networkidle' });

  await expect(page.locator('#helper-title')).toContainText('Uma ajuda mais inteligente');
  await expect(page.locator('[data-helper-cards]')).toBeVisible();
  const faq = page.locator('#helper-faq');
  await expect(faq.getByRole('heading', { name: 'Perguntas, respondidas' })).toBeVisible();
  const questions = faq.locator('details');
  await expect(questions).toHaveCount(5);

  const firstQuestion = questions.first();
  await expect(firstQuestion.locator('summary')).toContainText('O Vozen Helper já está disponível?');
  await firstQuestion.locator('summary').click();
  await expect(firstQuestion).toHaveAttribute('open', '');
  await expect(firstQuestion.locator('p')).toContainText('O Helper está disponível publicamente');
});

test('the language selector navigates to the matching canonical product route', async ({ page }) => {
  await page.goto('/tts/', { waitUntil: 'networkidle' });
  await page.locator('#langBtn').click();
  await page.locator('[data-lang="fr"]').click();
  await page.waitForURL('**/fr/tts/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.locator('h1')).toContainText('Pas de micro ?');
});

test('mobile navigation opens without obscuring the page or losing keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto('/helper/', { waitUntil: 'networkidle' });
  const burger = page.locator('#burger');
  await burger.focus();
  await page.keyboard.press('Enter');
  await expect(burger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.nav__links')).toHaveClass(/is-open/);
  await expect(page.locator('.nav__links a', { hasText: 'Vozen TTS' })).toBeVisible();
  await expect(burger).toHaveAttribute('aria-controls', 'vozen-primary-links');
  await expect(page.locator('.nav__links')).toHaveCSS('display', 'grid');
  const menuIcons = await page.locator('.nav__links a').evaluateAll(links => links.map(link => getComputedStyle(link, '::before').backgroundImage));
  expect(menuIcons).toHaveLength(6);
  expect(menuIcons.every(icon => icon.includes('data:image/svg+xml'))).toBe(true);
  const currentDot = await page.locator('.nav__links a[aria-current="page"]').evaluate(link => getComputedStyle(link, '::after').width);
  expect(currentDot).toBe('6px');
  await page.keyboard.press('Escape');
  await expect(burger).toHaveAttribute('aria-expanded', 'false');
  await expect(burger).toBeFocused();
  await expect(page.locator('.nav__links')).toBeHidden();
  await burger.click();
  await page.mouse.click(2, 700);
  await expect(burger).toHaveAttribute('aria-expanded', 'false');
  await burger.click();
  await page.setViewportSize({width: 1440, height: 900});
  await expect(burger).toHaveAttribute('aria-expanded', 'false');
});

test('Helper FAQ and return link keep 44px mobile touch targets', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto('/helper/', { waitUntil: 'networkidle' });
  await page.locator('#helper-faq').scrollIntoViewIfNeeded();

  for (const target of await page.locator('#helper-faq summary, .eco-back').all()) {
    const box = await target.boundingBox();
    expect(box, 'touch target should have a layout box').not.toBeNull();
    expect(box.height, 'touch target height').toBeGreaterThanOrEqual(44);
  }
});

test('the refreshed TTS FAQ has six useful questions and working mobile answers', async ({ page }) => {
  const localeRequests=[];
  page.on('request', request=>{if(request.url().includes('/i18n-public/'))localeRequests.push(request.url());});
  await page.setViewportSize({width:375,height:812});
  await page.goto('/tts/', {waitUntil:'networkidle'});
  const questions=page.locator('#faq-list .qa__q');
  await expect(questions).toHaveCount(6);
  for (const question of await questions.all()) {
    await question.click();
    await expect(question).toHaveAttribute('aria-expanded','true');
    const id=await question.getAttribute('aria-controls');
    await expect(page.locator(`#${id}`)).toBeVisible();
  }
  await expect(page.locator('#faq-list')).toContainText('/setup');
  await expect(page.locator('#faq-list')).toContainText('/join');
  await expect(page.locator('#faq-list')).toContainText('Payments are currently paused.');
  await questions.first().click();
  await expect(questions.first()).toHaveAttribute('aria-expanded','false');
  for (const locale of ['fr','es','de','tr','ar','zh','ru','ko']) {
    await page.goto(`/${locale}/tts/`);
    await expect(page.locator('#faq-list .qa__q')).toHaveCount(6);
    await expect(page.locator('#faq-list')).not.toContainText('Google HD');
  }
  expect(localeRequests.length).toBeGreaterThan(0);
  for (const url of localeRequests) expect(new URL(url).searchParams.get('v')).toMatch(/^[a-f0-9]{12}$/);
});

test('TTS does not show the removed Top.gg review section in any generated locale', async ({ page }) => {
  for (const locale of ['', 'fr/', 'es/', 'de/', 'tr/', 'ar/', 'zh/', 'ru/', 'ko/']) {
    await page.goto(`/${locale}tts/`);
    await expect(page.locator('#reviews, .review-proof, [data-i18n^="reviews."]')).toHaveCount(0);
  }
});

test('the editorial Portuguese TTS page also omits the removed review section', async ({ page }) => {
  await page.goto('/pt/tts/', { waitUntil: 'networkidle' });

  await expect(page.locator('#reviews, #reviews-title')).toHaveCount(0);
  await expect(page.getByText('Avaliações que podes verificar', { exact: true })).toHaveCount(0);
});

test('the editorial guides expose complete Portuguese counterparts', async ({ page }) => {
  const guides = [
    ['/pt/guides/discord-without-a-mic/', 'Sem microfone? Continua na conversa do Discord.'],
    ['/pt/guides/vozen-vs-generic-discord-tts/', 'Escolhe o TTS para Discord'],
    ['/pt/guides/helper-moderation-tickets-roles/', 'Começa a organizar o servidor'],
  ];

  for (const [path, heading] of guides) {
    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');
    await expect(page.locator('h1')).toContainText(heading);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="pt-PT"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);
    const overflow = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(overflow.content, `${path}: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(overflow.viewport + 1);
  }
});

test('complete styles are active before interaction and scrolling stays stable', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of entryPages) {
    await page.goto(path, { waitUntil: 'networkidle' });
    const completeStyles = path === '/'
      ? page.locator('link[href*="home-full-v1.css"]')
      : page.locator(`link[href*="${path.slice(1, -1)}-page-v1.css"]`);
    await expect(completeStyles).toHaveCount(1);
    for (const stylesheet of await completeStyles.all()) {
      await expect(stylesheet).not.toHaveAttribute('data-deferred-style', '');
      await expect(stylesheet).not.toHaveAttribute('data-progressive-style', '');
      if (path === '/') await expect(stylesheet).toHaveAttribute('media', 'all');
      else await expect(stylesheet).not.toHaveAttribute('media', 'print');
    }
    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    expect(pageHeight, `${path}: full-page CSS generation height`).toBeLessThanOrEqual(24_000);

    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    const overflow = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(overflow.content, `${path}: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(overflow.viewport + 1);
  }
});
