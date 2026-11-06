import { expect, test } from '@playwright/test';

test('Music atmosphere moves quietly without autoplay and respects motion preferences', async ({page}) => {
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/music/');
  const hero=page.locator('.music-hero');
  const notation=hero.locator('.music-notation');
  const note=hero.locator('.music-note').first();
  await expect(notation).toHaveAttribute('aria-hidden','true');
  await expect(hero.locator('.music-aura-spectrum')).toHaveCount(0);
  await expect(notation.locator('.music-note')).toHaveCount(6);
  expect(await notation.locator('.music-note use').evaluateAll(notes=>notes.map(note=>note.getAttribute('href'))))
    .toEqual(['#music-ambient-note','#music-quarter-note','#music-eighth-note','#music-quarter-note','#music-ambient-note','#music-eighth-note']);
  expect(await notation.locator('.music-note').evaluateAll(notes=>notes.map(note=>getComputedStyle(note).animationDelay)))
    .toEqual(['-3s','-6s','-9s','-12s','-15s','-18s']);
  expect(await page.locator('#music-audio').evaluate(el=>el.paused)).toBe(true);
  await expect(note).toHaveCSS('animation-name','music-phrase');
  await expect(note).toHaveCSS('animation-duration','18s');
  await expect(note).toHaveCSS('animation-timing-function','linear');
  const distances=await note.evaluate(el=>{
    const animation=el.getAnimations()[0];
    animation.pause();
    const samples=[0,3000,6000,9000,12000].map(time=>{
      animation.currentTime=time;
      return parseFloat(getComputedStyle(el).offsetDistance);
    });
    animation.play();
    return samples;
  });
  for(let i=1;i<distances.length;i++) expect(distances[i]-distances[i-1]).toBeCloseTo(100/6,2);
  const before=await note.evaluate(el=>getComputedStyle(el).offsetDistance);
  await expect.poll(()=>note.evaluate(el=>getComputedStyle(el).offsetDistance)).not.toBe(before);
  await page.getByRole('button',{name:'Play preview',exact:true}).click();
  await expect(notation).toHaveCSS('opacity','1');
  await page.getByRole('button',{name:'Pause preview',exact:true}).click();
  await expect(notation).toHaveCSS('opacity','0.8');
  await page.locator('#plans').scrollIntoViewIfNeeded();
  await expect(hero).toHaveClass(/is-motion-paused/);
  await expect(note).toHaveCSS('animation-play-state','paused');
  await hero.scrollIntoViewIfNeeded();
  await expect(hero).not.toHaveClass(/is-motion-paused/);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(note).toHaveCSS('animation-name','none');
  for(const width of [1900,1024,390,320]){
    await page.setViewportSize({width,height:900});
    expect(await notation.locator('.music-staff path').evaluateAll(paths=>paths.every(path=>{
      const matrix=path.getScreenCTM();
      const start=path.getPointAtLength(0).matrixTransform(matrix);
      const end=path.getPointAtLength(path.getTotalLength()).matrixTransform(matrix);
      return start.x < 0 && end.x > window.innerWidth;
    })), 'staff ends stay outside the viewport at '+width).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(page.getByRole('button',{name:'Play preview',exact:true})).toBeVisible();
  }
});

test('Music hero starts with TTS and product hero actions share its buttons', async ({ page }) => {
  await page.setViewportSize({width:1900,height:944});
  await page.emulateMedia({reducedMotion:'reduce'});
  const style = el => {
    const css = getComputedStyle(el);
    return ['fontSize','padding','borderRadius','color','backgroundColor','backgroundImage'].map(key => css[key]);
  };
  await page.goto('/tts/');
  const titleTop = (await page.locator('h1').boundingBox()).y;
  const brandTop = (await page.locator('.product-hero-brand').boundingBox()).y;
  await expect(page.locator('.product-hero-brand img')).toHaveAttribute('src','/assets/settings-tts.png');
  const primary = await page.locator('.hero__cta .btn--primary').evaluate(style);
  const support = await page.locator('.hero__cta .js-support').evaluate(style);
  for (const route of ['/music/','/helper/','/pt/helper/']) {
    await page.goto(route);
    const actions = page.locator('.music-actions,.helper-hero__actions');
    const brand = page.locator('.product-hero-brand');
    await expect(brand).toContainText(route === '/music/' ? 'Vozen Music' : 'Vozen Helper');
    await expect(brand.locator('img')).toHaveAttribute('src',route === '/music/' ? '/assets/music/avatar.webp' : '/assets/settings-helper.png');
    if(route.includes('/helper/')) {
      await expect(page.locator('img.helper-console__bot')).toHaveAttribute('src','/assets/settings-helper.png');
      await expect.poll(()=>page.locator('img.helper-console__bot').evaluate(img=>img.naturalWidth)).toBeGreaterThan(0);
    }
    expect(Math.abs((await brand.boundingBox()).y-brandTop)).toBeLessThan(8);
    expect(Math.abs((await page.locator('h1').boundingBox()).y-titleTop)).toBeLessThan(8);
    const link = actions.locator('.js-support');
    await expect(link).toHaveAttribute('href','https://discord.gg/4kYw2WUbNN');
    await expect(link).toHaveText(route.startsWith('/pt/') ? 'Servidor de suporte' : 'Join support server');
    expect(await link.evaluate(style)).toEqual(support);
    if (route === '/music/') {
      expect(Math.abs((await page.locator('h1').boundingBox()).y-titleTop)).toBeLessThan(8);
      expect(await actions.locator('.btn--primary').evaluate(style)).toEqual(primary);
      await expect(actions.locator('.btn--primary svg')).toHaveCount(1);
      expect(new URL(await actions.locator('.btn--primary').getAttribute('href')).searchParams.get('client_id')).toBe('1564573935234973817');
    }
    for(const width of [390,320]) {
      await page.setViewportSize({width,height:844});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await expect(brand).toBeVisible();
      await expect(link).toBeVisible();
    }
    await page.setViewportSize({width:1900,height:944});
  }
});

test('the homepage orbit fits three official bot cards throughout a rotation', async ({ page }) => {
  await page.goto('/');
  const orbit = page.locator('[data-home-orbit]');
  const cards = orbit.locator('.eco-orbit__node');
  await expect(cards).toHaveCount(3);
  await expect(orbit.getByRole('link', { name: 'Vozen Music' })).toHaveAttribute('href', '/music/');
  expect(await cards.locator('img').evaluateAll(icons => icons.map(icon => icon.getAttribute('src'))))
    .toEqual(['/assets/settings-tts.png', '/assets/music/avatar.webp', '/assets/settings-helper.png']);
  await expect.poll(() => cards.locator('img').evaluateAll(icons => icons.every(icon => icon.naturalWidth > 0))).toBe(true);
  await expect(cards.first()).toHaveCSS('animation-name', 'eco-planet-travel');

  for (const width of [320, 481, 768, 1001, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const issue = await orbit.evaluate(root => {
      const nodes = [...root.querySelectorAll('.eco-orbit__node')];
      const animations = nodes.map(node => node.getAnimations().find(animation => animation.animationName === 'eco-planet-travel'));
      animations.forEach(animation => animation.pause());
      const bounds = root.getBoundingClientRect();
      for (let time = 0; time < 44000; time += 550) {
        animations.forEach(animation => { animation.currentTime = time; });
        const boxes = nodes.map(node => node.getBoundingClientRect());
        if (boxes.some(box => box.left < bounds.left - 1 || box.right > bounds.right + 1 || box.top < bounds.top - 1 || box.bottom > bounds.bottom + 1)) return 'clipping at ' + time;
        if (boxes.some((box, i) => boxes.slice(i + 1).some(other => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top))) return 'overlap at ' + time;
      }
      return null;
    });
    expect(issue, 'orbit at ' + width + 'px').toBeNull();
  }

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/pt/');
  await expect(orbit.getByRole('link', { name: 'Vozen Music' })).toHaveAttribute('href', '/music/');
  await expect(orbit.getByRole('link', { name: 'Vozen Helper' })).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.eco-home-hero__copy > p')).toContainText('Três bots');
});

test('homepage product cards give all three bots official icons and equal space', async ({ page }) => {
  for (const route of ['/', '/pt/']) {
    await page.goto(route);
    const cards = page.locator('.eco-products .eco-product');
    await expect(cards).toHaveCount(3);
    await expect(cards.locator('h2')).toHaveText(['TTS', 'Music', 'Helper']);
    await expect(cards.nth(1)).toHaveAttribute('href', '/music/');
    expect(await cards.locator('img.eco-product__icon').evaluateAll(images => images.map(img => img.getAttribute('src'))))
      .toEqual(['/assets/settings-tts.png', '/assets/music/avatar.webp', '/assets/settings-helper.png']);
    await expect.poll(() => cards.locator('img').evaluateAll(images => images.every(img => img.naturalWidth > 0))).toBe(true);
    await expect(cards.nth(1)).toContainText(route === '/' ? 'Explore Music' : 'Explorar Music');
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const boxes = await cards.evaluateAll(elements => elements.map(el => el.getBoundingClientRect().toJSON()));
      expect(Math.max(...boxes.map(box => box.width)) - Math.min(...boxes.map(box => box.width))).toBeLessThan(2);
      if (width > 720) expect(Math.max(...boxes.map(box => box.y)) - Math.min(...boxes.map(box => box.y))).toBeLessThan(2);
      else expect(boxes[1].y).toBeGreaterThanOrEqual(boxes[0].y + boxes[0].height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  }
});

test('all three bots appear in one Premium bundle across product pages', async ({ page }) => {
  for (const path of ['/tts/', '/music/', '/helper/', '/premium.html', '/pt/tts/', '/pt/helper/']) {
    await page.goto(path);
    const ribbon = page.locator('.bundle-ribbon, .premium-bundle');
    if (path === '/premium.html') {
      await expect(page.locator('#premiumTitle')).toHaveText('Three bots. One subscription.');
      await expect(ribbon).toContainText('TTS + Music + Helper');
    } else {
      await expect(ribbon.locator('strong')).toHaveText(path.startsWith('/pt/') ? 'Três bots. Uma subscrição.' : 'Three bots. One subscription.');
      await expect(ribbon).toContainText(/TTS, Music (and|e) Helper Premium/);
    }
    const icons = ribbon.locator('.plan-bundle-art > .eco-product__icon');
    await expect(icons).toHaveCount(3);
    expect(await icons.evaluateAll(elements => elements.map(el => el.getAttribute('src'))))
      .toEqual(['/assets/settings-tts.png', '/assets/music/avatar.webp', '/assets/settings-helper.png']);
    await expect.poll(() => icons.evaluateAll(elements => elements.every(el => el.naturalWidth > 0))).toBe(true);

    for (const width of [1440, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await icons.evaluateAll(elements => {
        const sizes = elements.map(el => el.getBoundingClientRect());
        return sizes.every(size => size.width > 0 && size.width === size.height && size.width === sizes[0].width);
      }), path + ' icons at ' + width + 'px').toBe(true);
      expect(await ribbon.evaluate(el => {
        const { left, right } = el.getBoundingClientRect();
        return [...el.querySelectorAll('.eco-product__icon, strong')].every(child => {
          const bounds = child.getBoundingClientRect();
          return bounds.left >= left - 1 && bounds.right <= right + 1;
        });
      }), path + ' at ' + width + 'px').toBe(true);
      if (await ribbon.evaluate(el => el.classList.contains('bundle-ribbon'))) {
        const expectedIcon = width === 1440 ? 56 : 48;
        expect(await icons.first().evaluate((el, expected) => Math.abs(parseFloat(getComputedStyle(el).width) - expected), expectedIcon)).toBeLessThan(.1);
        await expect(ribbon.locator('strong')).toHaveCSS('font-size', width === 1440 ? '28px' : '22px');
        expect(await ribbon.evaluate(el => {
          const content = [...el.querySelectorAll('.plan-bundle-art, .bundle-ribbon__copy')].map(node => node.getBoundingClientRect());
          const left = Math.min(...content.map(box => box.left));
          const right = Math.max(...content.map(box => box.right));
          const ribbon = el.getBoundingClientRect();
          return Math.abs((left + right) / 2 - (ribbon.left + ribbon.right) / 2);
        })).toBeLessThan(2);
      }
    }
    if (path === '/premium.html') {
      await expect(page.locator('#paymentsNotice')).toBeVisible();
      for (const button of await page.locator('.premium-unavailable').all()) await expect(button).toBeDisabled();
    }
  }
});

test('Music skip link is hidden until keyboard focus', async ({ page }) => {
  await page.goto('/music/');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).not.toBeInViewport();
  await page.keyboard.press('Tab');
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('main#music')).toBeFocused();
});

test('Music plan previews match the TTS cards and switch prices without checkout', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tts/');
  const ttsPremium = page.locator('#premium .price-card--pro');
  const premiumBackground = await ttsPremium.evaluate(el => getComputedStyle(el).backgroundImage);
  const buttonColors = await page.locator('#premium .price-card__buy').evaluateAll(links => links.map(el => getComputedStyle(el).color));
  await page.goto('/music/#plans');
  const plans = page.locator('#plans');
  const premium = plans.locator('.price-card--pro');
  const amount = card => card.locator('.amt:visible');
  await expect(plans.locator('.price-card')).toHaveCount(3);
  await expect(premium).toHaveCSS('background-image', premiumBackground);
  expect(await plans.locator('.price-card__buy').evaluateAll(links => links.map(el => getComputedStyle(el).color))).toEqual(buttonColors);
  await expect(amount(premium)).toHaveText('€3.99');
  await expect(amount(plans.locator('.price-card--plus'))).toHaveText('€1.99');
  await plans.getByRole('button', { name: '5 servers' }).click();
  await expect(amount(premium)).toHaveText('€7.99');
  await plans.getByRole('button', { name: 'Yearly', exact: true }).click();
  await expect(amount(premium)).toHaveText('€70.99');
  await expect(amount(plans.locator('.price-card--plus'))).toHaveText('€18.99');
  await plans.getByRole('button', { name: '2 servers' }).click();
  await expect(amount(premium)).toHaveText('€37.99');
  await expect(plans.getByRole('link', { name: 'View Premium' })).toHaveAttribute('href', '/premium#plans');
  await expect(plans.locator('form, [href*="checkout"], [href*="stripe.com"]')).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 820 });
  const cards = await plans.locator('.price-card').evaluateAll(elements => elements.map(el => el.getBoundingClientRect().x));
  expect(new Set(cards).size).toBe(1);
});

test('product plan prices share a row despite different pitches and server selectors', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of ['/music/', '/tts/', '/helper/', '/pt/tts/', '/pt/helper/']) {
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    for (const width of [1440, 1280, 1201, 1100, 1001, 900, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const boxes = await page.locator('.plan-preview .price-card:not([hidden])').evaluateAll(cards => cards.map(card => ({
        card: card.getBoundingClientRect().toJSON(),
        price: card.querySelector('.price-card__price').getBoundingClientRect().toJSON(),
        pitch: card.querySelector('.price-card__pitch').getBoundingClientRect().toJSON(),
      })));
      if (width > 1000) {
        expect(Math.max(...boxes.map(box => box.price.y)) - Math.min(...boxes.map(box => box.price.y)), route + ' at ' + width).toBeLessThan(1);
        for (const box of boxes) expect(box.price.y - box.pitch.bottom).toBeLessThan(50);
      } else {
        for (const box of boxes) expect(box.price.bottom).toBeLessThanOrEqual(box.card.bottom);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const premium = page.locator('.plan-preview .price-card--pro');
      for (const yearly of [false, true]) {
        await page.locator('.plan-preview [data-bill="' + (yearly ? 'year' : 'month') + '"]').click();
        await premium.locator('[data-seats="5"]').click();
        if (width > 1000) {
          const amountTops = await page.locator('.plan-preview .amt:visible').evaluateAll(amounts => amounts.map(amount => amount.getBoundingClientRect().top));
          expect(Math.max(...amountTops) - Math.min(...amountTops), route + ' visible amounts at ' + width).toBeLessThan(1);
        }
        const layout = await premium.evaluate(card => ({
          amount: [...card.querySelectorAll('.amt')].find(el => el.getBoundingClientRect().width > 0).getBoundingClientRect().toJSON(),
          toggle: card.querySelector('.seat-toggle').getBoundingClientRect().toJSON(),
          card: card.getBoundingClientRect().toJSON(),
          buttons: [...card.querySelectorAll('.seat-toggle__btn')].map(button => ({
            fontSize: parseFloat(getComputedStyle(button).fontSize),
            height: button.getBoundingClientRect().height,
            clipped: button.scrollWidth > button.clientWidth,
          })),
        }));
        expect(layout.toggle.left, route + ' selector beside price at ' + width).toBeGreaterThanOrEqual(layout.amount.right);
        expect(Math.abs((layout.toggle.y + layout.toggle.height / 2) - (layout.amount.y + layout.amount.height / 2)), route + ' selector height at ' + width).toBeLessThan(15);
        expect(layout.toggle.right).toBeLessThanOrEqual(layout.card.right);
        if (width >= 1440) expect(layout.toggle.width).toBeGreaterThan(160);
        for (const button of layout.buttons) {
          expect(button.fontSize).toBeGreaterThanOrEqual(12);
          expect(button.height).toBeGreaterThanOrEqual(44);
          expect(button.clipped, route + ' selector text at ' + width).toBe(false);
        }
      }
    }
  }
});

test('approved monthly and yearly prices agree across pages while payments stay paused', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of ['/tts/', '/music/', '/helper/', '/premium.html', '/pt/tts/', '/pt/helper/']) {
    await page.goto(route);
    const premium = page.locator('.pricing .price-card--pro');
    const plus = page.locator('.pricing .price-card--plus');
    for (const yearly of [false, true]) {
      await page.locator('.bill-toggle [data-bill="' + (yearly ? 'year' : 'month') + '"]').click();
      for (const [seats, amount] of [['2', yearly ? '€37.99' : '€3.99'], ['5', yearly ? '€70.99' : '€7.99']]) {
        await premium.locator('[data-seats="' + seats + '"]').click();
        await expect(premium.locator('.amt:visible')).toHaveText(amount);
        await expect(premium.locator('[data-discount]')).toHaveCount(0);
      }
      if (await plus.isVisible()) {
        await expect(plus.locator('.amt:visible')).toHaveText(yearly ? '€18.99' : '€1.99');
        await expect(plus.locator('[data-discount]')).toHaveCount(0);
      }
    }
    if (route === '/premium.html') {
      await expect(page.locator('#paymentsNotice')).toBeVisible();
      for (const button of await page.locator('.premium-unavailable').all()) await expect(button).toBeDisabled();
    } else {
      await expect(page.locator('.plan-preview [data-buy], .plan-preview [data-billing-plan]')).toHaveCount(0);
    }
  }
});

test('Premium description puts its own bot first and fits on one line', async ({ page }) => {
  test.setTimeout(90_000);
  const routes = ['/music/', '/premium.html', ...['', 'pt/', 'fr/', 'es/', 'de/', 'tr/', 'ar/', 'zh/', 'ru/', 'ko/'].flatMap(locale => ['/' + locale + 'tts/', '/' + locale + 'helper/'])];
  for (const route of routes) {
    await page.goto(route);
    await page.evaluate(() => window.vozenPublicI18nReady || Promise.resolve());
    const expected = route.includes('/music/') ? 'Music + TTS + Helper.' : route.includes('/helper/') ? 'Helper + Music + TTS.' : 'TTS + Music + Helper.';
    await expect(page.locator('.price-card--pro .price-card__products')).toHaveText(expected);
    if (route.includes('/tts/') || route.includes('/music/')) {
      await expect(page.locator('.price-card--plus .price-card__products'))
        .toHaveText(route.includes('/music/') ? 'Music + TTS.' : 'TTS + Music.');
    }
    await expect(page.locator('.price-card--pro .price-card__audience')).toBeVisible();
    const locale = route.split('/')[1] || 'en';
    const audience = ({pt:'Premium para todos nos teus servidores.',fr:'Premium pour tous sur vos serveurs.',es:'Premium para todos en tus servidores.',de:'Premium für alle auf deinen Servern.',tr:'Sunucularındaki herkes için Premium.',ar:'مزايا Premium لجميع أعضاء خوادمك.',zh:'伺服器所有成員都能享有 Premium 福利。',ru:'Premium для всех на ваших серверах.',ko:'서버의 모든 멤버를 위한 Premium 혜택.'})[locale] || 'Premium for every member of your servers.';
    await expect(page.locator('.price-card--pro .price-card__audience')).toHaveText(audience);
    await page.evaluate(() => document.fonts.ready);
    for (const width of [1440, 1001, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const pitch = await page.locator('.price-card--pro .price-card__products').evaluate(el => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return { lines: Math.round(range.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)), clipped: el.scrollWidth > el.clientWidth };
      });
      expect(pitch.lines, route + width).toBe(1);
      expect(pitch.clipped, route + width).toBe(false);
      if (width >= 1440) {
        const lines = await page.locator('.price-card--pro .price-card__audience').evaluate(el => {
          const range = document.createRange();
          range.selectNodeContents(el);
          return Math.round(range.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));
        });
        expect(lines, route + ' audience at ' + width).toBe(1);
      }
      const clearance = await page.locator('.price-card--pro').evaluate(card => ({
        audience: card.querySelector('.price-card__audience').getBoundingClientRect().bottom,
        productsTop: card.querySelector('.price-card__products').getBoundingClientRect().top,
        productsBottom: card.querySelector('.price-card__products').getBoundingClientRect().bottom,
        current: [...card.querySelectorAll('.amt')].find(el => el.getBoundingClientRect().width > 0).getBoundingClientRect().top,
      }));
      expect(clearance.productsTop, route + width).toBeGreaterThanOrEqual(clearance.audience);
      expect(clearance.current, route + width).toBeGreaterThanOrEqual(clearance.productsBottom);
    }
  }
});

test('Music compares Free, Plus and Premium below the plan cards', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tts/#premium');
  const comparisonBackground = await page.locator('.plan-full-comparison .plan-comparison').evaluate(el => getComputedStyle(el).backgroundColor);
  await page.goto('/music/#plans');
  const details = page.locator('#plans .plan-full-comparison');
  const summary = details.locator('summary');
  const table = details.getByRole('table');
  await expect(summary).toHaveText('Compare all Free, Plus & Premium features');
  await expect(table).toBeHidden();
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(table).toBeVisible();
  await expect(details.locator('.plan-comparison')).toHaveCSS('background-color', comparisonBackground);
  await expect(table.getByRole('columnheader')).toHaveText(['Features', 'Free', 'Vozen Plus', 'Vozen Premium']);
  for (const [feature, values] of [
    ['Private track likes', ['✓', '✓', '✓']],
    ['Skip tracks', ['—', '✓', '✓']],
    ['My Station: build a server station', ['—', '—', '✓']],
  ]) {
    await expect(table.getByRole('row').filter({ has: page.getByRole('rowheader', { name: feature, exact: true }) }).getByRole('cell')).toHaveText(values);
  }
  await page.setViewportSize({ width: 320, height: 820 });
  await expect(table.getByRole('row', { name: /Curated music stations/ })).toHaveCSS('display', 'grid');
  expect(await details.evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(await details.evaluate(el => el.clientWidth));
  await summary.click();
  await expect(table).toBeHidden();
});

test('all three bots use rounded FAQ cards with product-specific answers', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 820 });
  for (const [path, question, answer] of [
    ['/tts/', 'How do I get Vozen to read my messages?', '/setup'],
    ['/helper/', 'How do I set up private tickets?', 'publish a ticket panel'],
    ['/music/', 'How do I start playing music?', '/play'],
  ]) {
    await page.goto(path);
    const faq = page.locator('.product-faq');
    await expect(faq.getByRole('heading', { name: 'Questions, answered' })).toBeVisible();
    const toggle = faq.locator('.qa__q', { hasText: question });
    await expect(toggle).toHaveCSS('min-height', '64px');
    await expect(toggle.locator('..')).toHaveCSS('border-radius', '15px');
    await toggle.focus();
    await page.keyboard.press('Enter');
    const panel = toggle.locator('..').locator('.qa__a');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(answer);
    expect(await faq.evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(320);
  }
  await expect(page.locator('#music-start-title')).toHaveText('Start in three steps');
});

test('FAQ headings render every glyph in Outfit, including Portuguese accents', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  for (const route of ['/tts/', '/helper/', '/music/', '/pt/tts/', '/pt/helper/']) {
    await page.goto(route);
    await page.locator('.product-faq h2').scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    const { root } = await cdp.send('DOM.getDocument');
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '.product-faq h2' });
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    expect(fonts, route).toHaveLength(1);
    expect(fonts[0].familyName, route).toMatch(/^Outfit\b/);
  }
});

test('both lines of the Music headline use the TTS display face', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/music/');
  const heading = page.locator('#music-title');
  await expect(heading).toHaveText('Music for your calls.');
  await expect(heading).toHaveCSS('font-weight', '800');
  await expect(heading).toHaveCSS('font-family', '"Vozen Critical Display", sans-serif');
  await expect(page.locator('link[rel="preload"][href="/assets/fonts/unbounded-critical-latin.woff2"]')).toHaveAttribute('as', 'font');
  await page.evaluate(() => document.fonts.ready);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '#music-title > span' });
  expect(nodeIds).toHaveLength(2);
  for (const nodeId of nodeIds) {
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    expect(fonts.map(({ familyName, isCustomFont }) => [familyName, isCustomFont])).toEqual([['Unbounded', true]]);
  }
});

test('Music and Helper show the product figures in a responsive strip', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [path, figures] of [['/music/', ['16', '12h 51m', '3', '∞']], ['/helper/', ['4', '89', '3', '∞']], ['/pt/helper/', ['4', '89', '3', '∞']]]) {
    await page.goto(path);
    const strip = page.locator('.product-stats');
    await expect(strip.locator('b')).toHaveText(figures);
    if (path === '/music/') {
      await expect(strip.locator('span')).toHaveText(['Stations', 'Music time', 'Setup steps', 'Core free forever']);
      expect(await strip.evaluate(el => el.previousElementSibling.id)).toBe('stations');
    }
    for (const [width, columns] of [[1440, 4], [320, 2]]) {
      await page.setViewportSize({ width, height: 820 });
      expect(await strip.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(columns);
      expect(await strip.evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(width);
    }
  }
  await expect(page.locator('.product-stats span')).toHaveText(['Proteções', 'Comandos', 'Passos de configuração', 'essencial grátis p/ sempre']);
});

test('Music and Helper statistics count up once when first seen', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 480 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const [route, figures, target] of [['/music/', ['16', '12h 51m', '3', '∞'], 16], ['/helper/', ['4', '89', '3', '∞'], 89], ['/pt/helper/', ['4', '89', '3', '∞'], 89]]) {
    await page.goto(route);
    const strip = page.locator('.product-stats');
    await expect(strip.locator('[data-counted]')).toHaveCount(0);
    await strip.evaluate(el => {
      window.statFrames = [];
      new MutationObserver(() => window.statFrames.push([...el.querySelectorAll('b')].map(number => number.textContent)))
        .observe(el, { childList: true, subtree: true });
    });
    await strip.scrollIntoViewIfNeeded();
    await expect(strip.locator('[data-counted="true"]')).toHaveCount(3);
    await expect(strip.locator('b')).toHaveText(figures);
    const frames = await page.evaluate(() => window.statFrames);
    expect(frames.some(frame => frame.some(value => Number(value) > 0 && Number(value) < target))).toBe(true);
    expect(frames.every(frame => frame[3] === '∞')).toBe(true);
    await page.evaluate(() => { window.statFrames = []; window.scrollTo({ top: 0, behavior: 'instant' }); });
    await expect(strip).not.toBeInViewport();
    await strip.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => window.statFrames)).toEqual([]);
    await expect(strip.locator('b')).toHaveText(figures);
  }
});

test('station carousel shows five desktop cards with smaller sides and reaches every preview', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/music/#stations');
  const previous = page.getByRole('button', { name: 'Previous stations', exact: true });
  const next = page.getByRole('button', { name: 'Next stations', exact: true });
  const position = page.locator('#music-stations-position');
  await expect(position).toHaveText('1–5 / 16');
  await expect(previous).toBeEnabled();
  expect((await position.boundingBox()).width).toBeLessThan(2);
  expect((await page.locator('#music-stations-rotation').boundingBox()).width).toBeLessThan(2);
  const card = page.locator('[data-station="lofi"]');
  const cardBox = await card.boundingBox();
  const imageBox = await card.locator('img').boundingBox();
  expect(Math.abs(cardBox.height - imageBox.height)).toBeLessThan(3);
  expect(await card.evaluate(el => getComputedStyle(el, '::before').backgroundImage)).toContain('linear-gradient');
  const visibleCards = () => page.locator('#music-stations-track').evaluate(el => {
    const bounds = el.getBoundingClientRect();
    return [...el.children].filter(card => {
      const box = card.getBoundingClientRect();
      return box.left >= bounds.left - 2 && box.right <= bounds.right + 2;
    }).map(card => card.dataset.station);
  });
  expect(await visibleCards()).toEqual(['lofi', 'jazz', 'piano', 'ambient', 'electronic']);
  const heights = await page.locator('[data-station]').evaluateAll(cards => ['lofi', 'jazz', 'piano', 'ambient', 'electronic'].map(id => cards.find(card => card.dataset.station === id).getBoundingClientRect().height));
  expect(heights[2]).toBeGreaterThan(heights[1]);
  expect(heights[1]).toBeGreaterThan(heights[0]);
  expect(Math.abs(heights[0] - heights[4])).toBeLessThan(2);
  await expect.poll(() => page.locator('[data-station] img').evaluateAll(images => images.every(img => img.complete && img.naturalWidth >= 640))).toBe(true);
  const order = ['lofi', 'jazz', 'piano', 'ambient', 'electronic', 'cinematic', 'rock', 'night', 'rain', 'sleep', 'synthwave', 'acoustic', 'chiptune', 'chill-house', 'drum-and-bass', 'bossa-nova'];
  await previous.click();
  await expect(position).toHaveText('16–4 / 16');
  await expect.poll(visibleCards).toEqual(['bossa-nova', 'lofi', 'jazz', 'piano', 'ambient']);
  for (let index = 0; index < 18; index++) {
    await next.click();
    const start = index % 16;
    await expect(position).toHaveText(`${start + 1}–${(start + 4) % 16 + 1} / 16`);
    await expect.poll(visibleCards).toEqual(Array.from({ length: 5 }, (_, offset) => order[(start + offset) % 16]));
  }
  await expect(next).toBeEnabled();
  await expect(previous).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => (await visibleCards()).length).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('station browsing advances every four seconds without starting audio and can pause', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.goto('/music/#stations');
  await page.mouse.move(0, 0);
  const position = page.locator('#music-stations-position');
  // Keep the browser scroll synchronous while testing the timer cadence.
  await page.addStyleTag({ content: '.music-station-grid { scroll-behavior: auto !important; }' });
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  const toggleRotation = async () => {
    await page.keyboard.press('Shift');
    await page.locator('#music-stations-rotation').focus();
    await page.keyboard.press('Enter');
    await page.locator('#music-stations-rotation').evaluate(el => el.blur());
    await page.mouse.move(0, 0);
  };
  await toggleRotation();
  await toggleRotation();
  await expect(position).toHaveText('1–5 / 16');
  await page.clock.runFor(3999);
  await expect(position).toHaveText('1–5 / 16');
  await page.clock.runFor(1);
  await expect(position).toHaveText('2–6 / 16');
  expect(await page.locator('#music-audio').evaluate(el => el.paused)).toBe(true);
  await page.locator('#music-stations-track').hover();
  await page.clock.runFor(4000);
  await expect(position).toHaveText('2–6 / 16');
  await page.mouse.move(0, 0);
  await toggleRotation();
  await page.clock.runFor(8000);
  await expect(position).toHaveText('2–6 / 16');
  await toggleRotation();
  await page.clock.runFor(4000);
  await expect(position).toHaveText('3–7 / 16');
  for (const range of ['4–8', '5–9', '6–10', '7–11', '8–12', '9–13', '10–14', '11–15', '12–16', '13–1', '14–2', '15–3', '16–4', '1–5']) {
    await page.clock.runFor(4000);
    await expect(position).toHaveText(`${range} / 16`);
  }
  await expect(position).toHaveText('1–5 / 16');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByRole('button', { name: 'Start automatic station browsing' })).toBeVisible();
  await page.clock.runFor(4000);
  await expect(position).toHaveText('1–5 / 16');
});

test('station rotation counts from navigation even before the carousel enters view', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 480 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.route('**/js/music-preview-v1.js', async route => {
    await page.clock.runFor(1500);
    await route.continue();
  });
  await page.goto('/music/');
  await page.mouse.move(0, 0);
  await page.addStyleTag({ content: '.music-station-grid { scroll-behavior: auto !important; }' });
  expect(await page.locator('#music-stations-track').evaluate(el => el.getBoundingClientRect().top)).toBeGreaterThan(480);
  const remaining = await page.evaluate(() => Math.max(0, 4000 - performance.now()));
  await page.clock.runFor(Math.max(0, remaining - 1));
  await expect(page.locator('#music-stations-position')).toHaveText('1–5 / 16');
  await page.clock.runFor(2);
  await expect(page.locator('#music-stations-position')).toHaveText('2–6 / 16');
});

test('the Music preview works with real samples and the shared navigation', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/music/');

  const audio = page.locator('#music-audio');
  await expect(page.locator('.music-hero .music-deck')).toHaveCount(1);
  await expect(page.locator('#features .music-feature')).toHaveCount(6);
  expect(await audio.evaluate(el => el.paused)).toBe(true);
  await page.getByRole('button', { name: 'Play preview' }).click();
  await expect.poll(() => audio.evaluate(el => el.currentTime)).toBeGreaterThan(0);
  await expect(page.locator('.music-deck .music-bars i').first()).toHaveCSS('animation-name', 'none');

  await page.getByRole('button', { name: 'Decrease preview volume' }).click();
  await expect(page.locator('#music-volume')).toHaveText('40%');
  await page.getByRole('button', { name: 'Increase preview volume' }).click();
  await expect(page.locator('#music-volume')).toHaveText('50%');
  const repeat = page.getByRole('button', { name: 'Repeat current preview' });
  await repeat.click();
  await expect(repeat).toHaveAttribute('aria-pressed', 'true');
  expect(await audio.evaluate(el => el.loop)).toBe(true);
  await repeat.click();
  const like = page.getByRole('button', { name: 'Like or unlike preview track' });
  await like.click();
  await expect(page.locator('#music-feedback')).toHaveText('Liked in this preview.');
  await like.click();
  await expect(page.locator('#music-feedback')).toHaveText('Like removed from this preview.');
  await page.getByRole('button', { name: 'Next station preview' }).click();
  await expect(page.locator('#music-track')).toHaveText('Catchy Swing');
  await expect(page.locator('#music-artist')).toHaveText('Doge');
  await expect(page.locator('#music-artist')).toHaveAttribute('href', 'https://opengameart.org/content/catchy-swing');
  await page.getByRole('button', { name: 'Previous station preview' }).click();
  await expect(page.locator('#music-track')).toHaveText('Families');
  await page.getByRole('button', { name: 'Leave preview' }).click();
  await expect(page.locator('#music-state')).toHaveText('Stopped');
  expect(await audio.evaluate(el => [el.paused, el.currentTime])).toEqual([true, 0]);

  await expect(page.locator('[data-station]')).toHaveCount(16);
  for (const [station, track] of [
    ['Jazz', 'Catchy Swing'], ['Piano', 'Regret – Short Emotional Piano'], ['Ambient', 'Echoes of the Past'],
    ['Electronic', 'Safety'], ['Cinematic', 'The Final Battle'], ['Rock', 'Across the Stars'],
    ['Night', 'Not It (Lofi)'], ['Rain', 'Morning Coffee'], ['Sleep', 'Aurora'],
    ['Synthwave', 'Drama'], ['Acoustic', 'A Small Fire Will Do (Calming Loop)'], ['Chiptune', 'Asteroids'],
    ['Chill House', 'Funky House'], ['Drum & Bass', 'Black Diamond'], ['Bossa Nova', 'Bossa Nova'],
  ]) {
    await page.getByRole('button', { name: station, exact: true }).click();
    await expect(page.getByRole('button', { name: station, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#music-track')).toHaveText(track);
    await expect.poll(() => audio.evaluate(el => el.currentTime)).toBeGreaterThan(0);
    await expect.poll(() => page.locator('#music-art').evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
  }
  await page.getByRole('button', { name: 'Pause preview' }).click();
  await expect(page.getByRole('button', { name: 'Play preview' })).toBeVisible();
  expect(await audio.evaluate(el => el.paused)).toBe(true);
  const currentStation = page.getByRole('button', { name: 'Sleep', exact: true });
  await currentStation.click();
  await expect(currentStation).toHaveClass(/is-playing/);
  await currentStation.click();
  await expect(currentStation).not.toHaveClass(/is-playing/);
  expect(await audio.evaluate(el => el.paused)).toBe(true);

  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');

  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `overflow at ${width}px`).toBeLessThanOrEqual(width);
    const stations = await page.locator('#stations').boundingBox();
    const player = await page.locator('.music-hero .music-deck').boundingBox();
    const artwork = await page.locator('#music-art').boundingBox();
    const console = await page.locator('.music-console').boundingBox();
    expect(stations.y).toBeGreaterThan(player.y + player.height);
    if (width > 520) {
      expect(artwork.x + artwork.width).toBeLessThan(console.x);
    } else {
      expect(artwork.y + artwork.height).toBeLessThan(console.y);
    }
    const lines = await page.locator('#music-title > span').evaluateAll(spans => spans.map(span => span.offsetHeight / parseFloat(getComputedStyle(span).lineHeight)));
    for (const line of lines) expect(line, `headline at ${width}px`).toBeLessThan(1.1);
  }
  expect(errors).toEqual([]);
});

test('the shared menu places Music between TTS and Helper', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const route of ['/music/', '/tts/', '/helper/']) {
    await page.goto(route);
    const links = page.locator('.vozen-global-nav .nav__links a');
    await expect(links.nth(0)).toHaveText('Vozen TTS');
    await expect(links.nth(1)).toHaveText('Vozen Music');
    await expect(links.nth(2)).toHaveText('Vozen Helper');
    await expect(links.nth(1)).toHaveAttribute('href', '/music/');
    if (route === '/music/') await expect(links.nth(1)).toHaveAttribute('aria-current', 'page');
    for (const width of [1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const actions = await page.locator('.vozen-global-nav .nav__actions').boundingBox();
      const last = await links.last().boundingBox();
      expect(last.x + last.width).toBeLessThanOrEqual(actions.x);
      expect(actions.x + actions.width).toBeLessThanOrEqual(width);
    }
  }
});

test('Music uses the same header dimensions and scroll treatment as both product pages', async ({ page }) => {
  // Warm the shared font cache before comparing the product pages.
  await page.goto('/tts/');
  await page.evaluate(() => Promise.all([
    document.fonts.load('700 29px "Vozen Header Display"'),
    document.fonts.load('500 17px "Vozen Nav Outfit"'),
  ]));
  for (const width of [390, 1280, 1896]) {
    await page.setViewportSize({ width, height: 900 });
    let reference;
    for (const route of ['/tts/', '/helper/', '/music/']) {
      await page.goto(route);
      const nav = page.locator('header.vozen-global-nav');
      await expect(nav.locator('.nav__links a[href="/music/"]')).toBeAttached();
      await page.evaluate(() => document.fonts.ready);
      const geometry = await nav.evaluate(header => ['', '.nav__inner', '.brand__mark', '.nav__links', '.lang__btn', '.nav__login'].map(selector => {
        const { x, width, height } = (selector ? header.querySelector(selector) : header).getBoundingClientRect();
        return [x, width, height].map(Math.round);
      }));
      reference ??= geometry;
      expect(geometry, `${route} at ${width}px`).toEqual(reference);
      await expect(nav).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      await page.evaluate(() => window.scrollTo(0, 240));
      await expect(nav).toHaveCSS('background-color', 'rgba(5, 6, 15, 0.84)');
      expect((await nav.boundingBox()).y).toBeCloseTo(0, 0);
    }
  }
});

test('switching product pages does not move the header when navigation scripts finish', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tts/');
  const nav = page.locator('header.vozen-global-nav');
  const position = () => nav.evaluate(header => [
    header, ...header.querySelectorAll('.brand__mark, .nav__links a, .lang__btn, .nav__login'),
  ].map(el => {
    const { x, y, width, height } = el.getBoundingClientRect();
    return [x, y, width, height].map(Math.round);
  }));
  for (const name of ['Vozen Music', 'Vozen Helper', 'Vozen TTS']) {
    let release;
    const held = new Promise(resolve => { release = resolve; });
    const deferNav = async route => {
      await held;
      await route.continue();
    };
    await page.route('**/js/global-nav-v1.js*', deferNav);
    let beforeScripts;
    try {
      await Promise.all([
        page.waitForEvent('framenavigated', { predicate: frame => frame === page.mainFrame() }),
        nav.getByRole('link', { name, exact: true }).click(),
      ]);
      await expect(nav.getByRole('link', { name, exact: true })).toHaveAttribute('aria-current', 'page');
      await page.evaluate(() => document.fonts.ready);
      beforeScripts = await position();
    } finally {
      release();
    }
    await page.waitForLoadState('domcontentloaded');
    await page.unroute('**/js/global-nav-v1.js*', deferNav);
    expect(await position(), `${name} after scripts`).toEqual(beforeScripts);
  }
});

test('late fonts do not move the product navigation after its first paint', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const route of ['/tts/', '/music/', '/helper/']) {
    let release;
    const held = new Promise(resolve => { release = resolve; });
    const fonts = /(?:unbounded-brand-latin|outfit-400-latin)\.woff2/;
    const delayFont = async request => {
      await held;
      await request.continue();
    };
    await page.route(fonts, delayFont);
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    const position = () => page.locator('.vozen-global-nav :is(.brand__word, .nav__product, .nav__links a, .lang__btn, .nav__login)').evaluateAll(elements =>
      elements.map(el => {
        const { x, width } = el.getBoundingClientRect();
        return [x, width].map(Math.round);
      }));
    let firstPaint;
    try {
      // Let the optional font's block period expire before measuring the visible fallback.
      await page.waitForFunction(() => performance.now() > 350 && performance.getEntriesByName('first-contentful-paint').length > 0);
      firstPaint = await position();
    } finally {
      release();
    }
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState('load');
    expect(await position(), route).toEqual(firstPaint);
    await page.unroute(fonts, delayFont);
  }
});
