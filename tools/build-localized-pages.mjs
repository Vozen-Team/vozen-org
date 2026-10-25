/* Generate indexable locale routes for the three public product entry pages.
 * English remains the authored HTML source. Portuguese TTS keeps its reviewed,
 * purpose-built page; the other routes use the shared product templates and
 * the isolated locale catalogues.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as parse5 from 'parse5';

const root = path.resolve('site');
const checkOnly = process.argv.includes('--check');
const locales = [
  { code: 'en', html: 'en' },
  { code: 'pt', html: 'pt-PT' },
  { code: 'fr', html: 'fr' },
  { code: 'es', html: 'es' },
  { code: 'de', html: 'de' },
  { code: 'tr', html: 'tr' },
  { code: 'ar', html: 'ar' },
  { code: 'zh', html: 'zh-Hant' },
  { code: 'ru', html: 'ru' },
  { code: 'ko', html: 'ko' },
];
const pages = [
  { route: 'home', slug: '', source: 'index.html', title: 'home.documentTitle', description: 'home.heroLead' },
  { route: 'tts', slug: 'tts/', source: 'tts/index.html', title: 'tts.documentTitle', description: 'hero.sub' },
  { route: 'helper', slug: 'helper/', source: 'helper/index.html', title: 'helper.landing.documentTitle', description: 'helper.landing.heroLede' },
];
const englishCatalogue = JSON.parse(
  fs.readFileSync(path.resolve('tools', 'i18n-marketing-src', 'en.json'), 'utf8'),
);
const normalized = (value) => value.replace(/\r\n?/g, '\n');

function visit(node, callback) {
  if (!node) return;
  callback(node);
  for (const child of node.childNodes || []) visit(child, callback);
  if (node.content) visit(node.content, callback);
}

const attr = (node, name) => node.attrs?.find((item) => item.name === name)?.value;
function setAttr(node, name, value) {
  if (!node) return;
  node.attrs ||= [];
  const current = node.attrs.find((item) => item.name === name);
  if (current) current.value = value;
  else node.attrs.push({ name, value });
}
const isElement = (node, name) => node.tagName === name;
const elements = (document, predicate) => {
  const matches = [];
  visit(document, (node) => { if (node.tagName && predicate(node)) matches.push(node); });
  return matches;
};
const first = (document, predicate) => elements(document, predicate)[0];
const hasClass = (node, name) => (attr(node, 'class') || '').split(/\s+/).includes(name);
const byClass = (document, name) => first(document, (node) => hasClass(node, name));
const allByClass = (document, name) => elements(document, (node) => hasClass(node, name));
const byId = (document, id) => first(document, (node) => attr(node, 'id') === id);
const setText = (node, value) => {
  if (!node) return;
  node.childNodes = [{ nodeName: '#text', value, parentNode: node }];
};
const setOwnText = (node, value) => {
  if (!node) return;
  const textNodes = (node.childNodes || []).filter((child) => child.nodeName === '#text');
  if (!textNodes.length) {
    const textNode = { nodeName: '#text', value, parentNode: node };
    node.childNodes ||= [];
    node.childNodes.push(textNode);
    return;
  }
  const target = textNodes[textNodes.length - 1];
  const leading = target.value.match(/^\s*/)?.[0] || '';
  const trailing = target.value.match(/\s*$/)?.[0] || '';
  target.value = `${leading}${value}${trailing}`;
};
const canonicalFor = (locale, page) =>
  `https://vozen.org/${locale.code === 'en' ? '' : `${locale.code}/`}${page.slug}`;

function alternateMarkup(page) {
  const links = locales.map((locale) =>
    `<link rel="alternate" hreflang="${locale.html}" href="${canonicalFor(locale, page)}">`);
  links.push(`<link rel="alternate" hreflang="x-default" href="${canonicalFor(locales[0], page)}">`);
  return links.join('');
}

function replaceStructuredUrls(value, from, to) {
  if (Array.isArray(value)) return value.map((item) => replaceStructuredUrls(item, from, to));
  if (!value || typeof value !== 'object') return value === from ? to : value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, replaceStructuredUrls(item, from, to)]),
  );
}

export function translationMap(catalogue) {
  const result = new Map();
  const add = (source, translated) => {
    if (typeof source === 'string' && typeof translated === 'string' && source && source !== translated) {
      result.set(source, translated);
    }
  };
  for (const [key, source] of Object.entries(englishCatalogue.messages)) {
    add(source, catalogue.messages[key]);
  }
  for (const collection of ['faq', 'helperFaq']) {
    (englishCatalogue[collection] || []).forEach((pair, index) => {
      add(pair[0], catalogue[collection]?.[index]?.[0]);
      add(pair[1], catalogue[collection]?.[index]?.[1]);
    });
  }
  return result;
}

function replaceStructuredText(value, translations) {
  if (Array.isArray(value)) return value.map((item) => replaceStructuredText(item, translations));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, replaceStructuredText(item, translations)]),
    );
  }
  return typeof value === 'string' && translations.has(value) ? translations.get(value) : value;
}

export function faqEntities(entries) {
  return entries.map(([question, answer]) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  }));
}

function translateExactText(document, translations) {
  visit(document, (node) => {
    if (node.nodeName === '#text' && !['script', 'style', 'noscript'].includes(node.parentNode?.tagName)) {
      const leading = node.value.match(/^\s*/)?.[0] || '';
      const trailing = node.value.match(/\s*$/)?.[0] || '';
      const source = node.value.slice(leading.length, node.value.length - trailing.length || undefined);
      if (translations.has(source)) node.value = `${leading}${translations.get(source)}${trailing}`;
    }
    for (const name of ['aria-label', 'placeholder', 'title']) {
      const value = attr(node, name);
      if (value && translations.has(value)) setAttr(node, name, translations.get(value));
    }
  });
}

// Prerendered fragments are verified separately against the no-JavaScript
// contract. Their children come from the page's runtime at build time, while
// this check still verifies all authored copy, metadata and route attributes.
export function comparableLocalizedHtml(html) {
  const document = parse5.parse(html);
  visit(document, (node) => {
    if (attr(node, 'data-prerender-fragment') != null) node.childNodes = [];
    node.attrs?.sort((left, right) => left.name.localeCompare(right.name));
  });
  return normalized(parse5.serialize(document));
}

function applyHelperTranslations(document, messages) {
  const message = (key) => messages[key];
  const set = (node, key) => { if (message(key) != null) setText(node, message(key)); };
  const setOwn = (node, key) => { if (message(key) != null) setOwnText(node, message(key)); };

  setOwn(byClass(document, 'helper-available'), 'helper.landing.available');
  const heroTitle = byId(document, 'helper-title');
  const heroTitleParts = elements(heroTitle, (node) => isElement(node, 'span'));
  set(heroTitleParts[0], 'helper.landing.heroTitle1');
  set(heroTitleParts[1], 'helper.landing.heroTitle2');
  set(byClass(document, 'helper-hero__lede'), 'helper.landing.heroLede');
  setOwn(byClass(document, 'helper-private-action'), 'helper.landing.getStarted');
  setOwn(byClass(document, 'helper-explore-action'), 'helper.landing.exploreModules');
  set(byClass(document, 'helper-hero__proof'), 'helper.landing.proof');

  const tasks = [
    ['security', 'helper.landing.securityCheck', 'helper.landing.protected'],
    ['ticket', 'helper.landing.ticketRouted', 'helper.landing.support'],
    ['event', 'helper.landing.eventReady', 'helper.landing.members'],
    ['workflow', 'helper.landing.workflowRan', 'helper.landing.replied'],
    ['insight', 'helper.landing.weeklyPulse', 'helper.landing.healthy'],
  ];
  for (const [name, titleKey, detailKey] of tasks) {
    const task = byClass(document, `helper-task--${name}`);
    set(first(task, (node) => isElement(node, 'b')), titleKey);
    set(first(task, (node) => isElement(node, 'small')), detailKey);
  }
  set(byClass(document, 'helper-console__channel'), 'helper.landing.operations');
  set(byClass(document, 'helper-console__preview'), 'helper.landing.preview');
  const consoleHeading = byClass(document, 'helper-console__heading');
  set(first(consoleHeading, (node) => isElement(node, 'span')), 'helper.landing.serverPulse');
  set(first(consoleHeading, (node) => isElement(node, 'strong')), 'helper.landing.everythingView');
  setOwn(byClass(document, 'helper-console__live'), 'helper.landing.live');
  const consoleEvents = [
    ['security', 'helper.landing.securityCheck', 'helper.landing.protected', 'helper.landing.active'],
    ['support', 'helper.landing.ticketRouted', 'helper.landing.support', 'helper.landing.now'],
    ['event', 'helper.landing.eventReady', 'helper.landing.members', 'helper.landing.now'],
  ];
  for (const [name, titleKey, detailKey, stateKey] of consoleEvents) {
    const event = byClass(document, `helper-console-event--${name}`);
    set(first(event, (node) => isElement(node, 'strong')), titleKey);
    set(first(event, (node) => isElement(node, 'small')), detailKey);
    set(byClass(event, 'helper-console-event__state') || byClass(event, 'helper-console-event__time'), stateKey);
  }
  for (const [module, key] of Object.entries({
    security: 'helper.moduleProtection',
    support: 'helper.moduleSupport',
    events: 'helper.moduleEvents',
    insights: 'helper.moduleInsights',
  })) {
    set(first(document, (node) => attr(node, 'data-console-module') === module), key);
  }

}

export function localize(sourceHtml, locale, page, catalogue) {
  const { messages } = catalogue;
  const translations = translationMap(catalogue);
  const document = parse5.parse(sourceHtml);
  const html = first(document, (node) => isElement(node, 'html'));
  const head = first(document, (node) => isElement(node, 'head'));
  setAttr(html, 'lang', locale.html);
  setAttr(html, 'data-vozen-locale', locale.code);
  setAttr(html, 'data-vozen-localized-route', page.route);
  if (locale.code === 'ar') setAttr(html, 'dir', 'rtl');

  let base = first(head, (node) => isElement(node, 'base'));
  if (!base) {
    base = parse5.parseFragment('<base href="../">').childNodes[0];
    base.parentNode = head;
    head.childNodes.unshift(base);
  }
  setAttr(base, 'href', page.route === 'home' ? '../' : '../../');

  const canonical = canonicalFor(locale, page);
  const englishCanonical = canonicalFor(locales[0], page);
  const canonicalLink = first(head, (node) => isElement(node, 'link') && attr(node, 'rel') === 'canonical');
  setAttr(canonicalLink, 'href', canonical);
  head.childNodes = head.childNodes.filter((node) =>
    !(isElement(node, 'link') && attr(node, 'rel') === 'alternate' && attr(node, 'hreflang')));
  const alternates = parse5.parseFragment(alternateMarkup(page)).childNodes;
  for (const node of alternates) node.parentNode = head;
  const canonicalIndex = head.childNodes.indexOf(canonicalLink);
  head.childNodes.splice(canonicalIndex + 1, 0, ...alternates);

  const title = messages[page.title] || messages['home.documentTitle'] || 'Vozen';
  const descriptionBase = messages[page.description] || '';
  const description = descriptionBase.length >= 30
    ? descriptionBase
    : `${descriptionBase} Vozen TTS · Vozen Helper · Discord.`;
  setText(first(head, (node) => isElement(node, 'title')), title);
  for (const meta of elements(head, (node) => isElement(node, 'meta'))) {
    const name = attr(meta, 'name');
    const property = attr(meta, 'property');
    if (name === 'description' || property === 'og:description' || name === 'twitter:description') {
      setAttr(meta, 'content', description);
    } else if (property === 'og:url') setAttr(meta, 'content', canonical);
    else if (property === 'og:title' || name === 'twitter:title') setAttr(meta, 'content', title);
  }

  for (const script of elements(document, (node) => isElement(node, 'script') && attr(node, 'type') === 'application/ld+json')) {
    try {
      let data = replaceStructuredUrls(
        JSON.parse(script.childNodes?.[0]?.value || ''),
        englishCanonical,
        canonical,
      );
      data = replaceStructuredText(data, translations);
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        data.inLanguage = locale.html;
        if (data['@type'] === 'FAQPage') {
          const entries = page.route === 'helper' ? catalogue.helperFaq : page.route === 'tts' ? catalogue.faq : null;
          if (entries) data.mainEntity = faqEntities(entries);
        }
        if (data['@type'] === 'SoftwareApplication' && messages[page.description]) {
          data.description = messages[page.description];
        }
      }
      setText(script, JSON.stringify(data));
    } catch {}
  }

  visit(document, (node) => {
    if (!node.tagName) return;
    const key = attr(node, 'data-i18n');
    if (key && messages[key] != null) setText(node, messages[key]);
    for (const [marker, target] of [
      ['data-i18n-aria-label', 'aria-label'],
      ['data-i18n-placeholder', 'placeholder'],
      ['data-i18n-title', 'title'],
    ]) {
      const attributeKey = attr(node, marker);
      if (attributeKey && messages[attributeKey] != null) setAttr(node, target, messages[attributeKey]);
    }
    if (attr(node, 'data-vozen-nav') != null) setAttr(node, 'data-nav-locale-root', `${locale.code}/`);
    if (isElement(node, 'a')) {
      const href = attr(node, 'href');
      if (href?.startsWith('#')) setAttr(node, 'href', `${canonical}${href}`);
      else if (href === 'tts/' || href === 'helper/') setAttr(node, 'href', `${locale.code}/${href}`);
      else if (href === './') setAttr(node, 'href', canonical);
    }
  });

  if (page.route === 'helper') applyHelperTranslations(document, messages);
  translateExactText(document, translations);

  return parse5.serialize(document).replace(/[ \t]+$/gm, '');
}

export function buildLocalizedPages({ onlyCheck = checkOnly } = {}) {
  const desiredFiles = [];
  for (const locale of locales.slice(1)) {
    const source = JSON.parse(fs.readFileSync(path.resolve('tools', 'i18n-marketing-src', `${locale.code}.json`), 'utf8'));
    for (const page of pages) {
      if (locale.code === 'pt' && page.route === 'tts') continue;
      const sourceHtml = fs.readFileSync(path.join(root, ...page.source.split('/')), 'utf8');
      const output = path.join(root, locale.code, ...page.slug.split('/').filter(Boolean), 'index.html');
      desiredFiles.push([output, localize(sourceHtml, locale, page, source)]);
    }
  }

  let sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  for (const locale of locales) {
    for (const page of pages) {
      const canonical = canonicalFor(locale, page);
      if (!sitemap.includes(`<loc>${canonical}</loc>`)) {
        sitemap = sitemap.replace(/\s*<\/urlset>\s*$/, `\n  <url><loc>${canonical}</loc></url>\n</urlset>\n`);
      }
    }
  }

  const mismatches = [];
  for (const [output, generated] of desiredFiles) {
    let current = '';
    try { current = fs.readFileSync(output, 'utf8'); } catch {}
    if ((onlyCheck ? comparableLocalizedHtml(current) : normalized(current)) !==
        (onlyCheck ? comparableLocalizedHtml(generated) : normalized(generated))) {
      if (onlyCheck) mismatches.push(path.relative(root, output));
      else {
        fs.mkdirSync(path.dirname(output), { recursive: true });
        fs.writeFileSync(output, generated);
      }
    }
  }
  const sitemapPath = path.join(root, 'sitemap.xml');
  if (normalized(fs.readFileSync(sitemapPath, 'utf8')) !== normalized(sitemap)) {
    if (onlyCheck) mismatches.push('sitemap.xml');
    else fs.writeFileSync(sitemapPath, sitemap);
  }

  if (mismatches.length) {
    throw new Error(`localized pages are out of date; run npm run build:localized\n${mismatches.join('\n')}`);
  }
  console.log(`[${onlyCheck ? 'check' : 'build'}-localized-pages] 10 locales × 3 public entry routes are current`);
  return { localeCount: locales.length, pageCount: pages.length, generatedCount: desiredFiles.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildLocalizedPages();
}
