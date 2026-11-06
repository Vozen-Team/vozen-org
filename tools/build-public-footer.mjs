import { readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'parse5';
import { walkHtml } from './site-meta-utils.mjs';

const root = resolve('site');
const stylesheet = '/css/vozen-footer-v1.css';
const locales = new Set(['pt', 'fr', 'es', 'de', 'tr', 'ar', 'zh', 'ru', 'ko']);
const escape = (value) => value.replace(/[&<>]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char]);

export function withSharedFooter(html, route) {
  const segment = route.split('/')[0];
  if (segment === 'concepts' || /<meta\b[^>]*http-equiv=["']refresh["']/i.test(html)) return html;
  const locale = locales.has(segment) ? segment : 'en';
  const { messages } = JSON.parse(readFileSync(new URL(`./i18n-marketing-src/${locale}.json`, import.meta.url), 'utf8'));
  const label = (key, fallback) => escape(messages[key] || fallback);
  const link = (href, key, fallback) => `<a href="${href}" data-i18n="${key}">${label(key, fallback)}</a>`;
  const footer = `<footer class="vozen-footer" id="site-footer">
  <div class="vozen-footer__inner">
    <span class="vozen-footer__brand"><img src="/favicon.svg" width="28" height="28" alt="">© 2026 Vozen</span>
    <nav class="vozen-footer__links" aria-label="Vozen footer">
      ${link('https://discord.gg/4kYw2WUbNN', 'foot.support', 'Support server')}
      ${link('/privacy.html', 'foot.privacy', 'Privacy')}
      ${link('/terms.html', 'foot.terms', 'Terms')}
    </nav>
    <span class="vozen-footer__disclaimer" data-i18n="foot.legal">${label('foot.legal', 'Not affiliated with Discord')}</span>
  </div>
</footer>`;
  const document = parse(html, { sourceCodeLocationInfo: true });
  const rootNode = document.childNodes.find(node => node.tagName === 'html');
  const head = rootNode.childNodes.find(node => node.tagName === 'head');
  const body = rootNode.childNodes.find(node => node.tagName === 'body');
  const oldFooter = body.childNodes.find(node => node.tagName === 'footer');
  const start = oldFooter?.sourceCodeLocation.startOffset ?? body.sourceCodeLocation.endTag.startOffset;
  const end = oldFooter?.sourceCodeLocation.endOffset ?? start;
  const updated = html.slice(0, start) + footer + html.slice(end);
  if (head.childNodes.some(node => node.tagName === 'link' && node.attrs.some(attr => attr.name === 'href' && attr.value.split('?')[0] === stylesheet))) return updated;
  const cssAt = head.sourceCodeLocation.endTag.startOffset;
  return updated.slice(0, cssAt) + `<link rel="stylesheet" href="${stylesheet}">\n` + updated.slice(cssAt);
}

export function buildSharedFooters() {
  let changed = 0;
  for (const file of walkHtml(root)) {
    const html = readFileSync(file, 'utf8');
    const updated = withSharedFooter(html, relative(root, file).replaceAll('\\', '/'));
    if (updated === html) continue;
    writeFileSync(file, updated);
    changed++;
  }
  console.log(`Shared footer updated in ${changed} pages.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) buildSharedFooters();
