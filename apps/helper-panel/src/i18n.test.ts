import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const locales = ['en', 'pt', 'fr', 'es', 'de', 'tr', 'ar', 'zh', 'ru', 'ko'] as const;
let i18n: typeof import('./i18n');
let browser: Window;
let saved: Map<string, string>;
let storage: { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn> };
let root: { lang: string; dir: string };

beforeEach(async () => {
  vi.resetModules();
  saved = new Map([['vozen.lang', 'en'], ['auth', 'private-token']]);
  storage = {
    getItem: vi.fn((key: string) => saved.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { saved.set(key, value); }),
  };
  browser = Object.assign(new EventTarget(), { localStorage: storage }) as unknown as Window;
  root = { lang: 'en', dir: 'ltr' };
  vi.stubGlobal('window', browser);
  vi.stubGlobal('document', { documentElement: root });
  i18n = await import('./i18n');
});

afterEach(() => { vi.unstubAllGlobals(); });

function languageEvent(language?: unknown) {
  browser.dispatchEvent(new CustomEvent('vozen:languagechange', { detail: { language } }));
}

function storageEvent(key: string | null, newValue: string | null, storageArea?: unknown) {
  browser.dispatchEvent(Object.assign(new Event('storage'), { key, newValue, storageArea }));
}

describe('shared Helper locale', () => {
  it('uses the same ten languages as the public site', () => {
    expect(i18n.SUPPORTED_LOCALES).toEqual(locales);
    expect(i18n.LOCALE_OPTIONS.map(option => option.code)).toEqual(locales);
  });

  it.each(locales)('switches labels, persistence and document metadata to %s', locale => {
    const onChange = vi.fn(() => {
      expect(i18n.readLocale()).toBe(locale);
      expect(i18n.helperT('ecosystem.siteLanguage', 'Site language'))
        .toBe(browser.VOZEN_I18N![locale]['ecosystem.siteLanguage']);
    });
    browser.addEventListener('vozen:languagechange', onChange);
    expect(i18n.setHelperLocale(locale)).toBe(locale);
    expect(i18n.helperLocale()).toBe(locale);
    expect(i18n.localeName(locale)).toBe(i18n.LOCALE_OPTIONS.find(option => option.code === locale)!.name);
    expect(saved.get('vozen.lang')).toBe(locale);
    expect(root).toEqual({ lang: locale, dir: locale === 'ar' ? 'rtl' : 'ltr' });
    expect(onChange).toHaveBeenCalledOnce();
    expect(saved.get('auth')).toBe('private-token');
    expect(storage.setItem.mock.calls.every(([key]) => key === 'vozen.lang')).toBe(true);
  });

  it('reads a pre-existing preference and observes a changed stored value', () => {
    saved.set('vozen.lang', 'pt');
    expect(i18n.readLocale()).toBe('pt');
    saved.set('vozen.lang', 'ko');
    expect(i18n.helperLocale()).toBe('ko');
  });

  it('keeps every selection when the storage getter is unavailable', () => {
    Object.defineProperty(browser, 'localStorage', { get() { throw new Error('blocked'); } });
    expect(i18n.readLocale()).toBe('en');
    for (const locale of locales) {
      i18n.setHelperLocale(locale);
      expect(i18n.readLocale()).toBe(locale);
      expect(i18n.helperText('Features')).toBe(browser.VOZEN_I18N![locale]['nav.features']);
      expect(root.lang).toBe(locale);
    }
  });

  it('keeps the chosen language when writes fail but stale storage remains readable', () => {
    saved.set('vozen.lang', 'pt');
    expect(i18n.readLocale()).toBe('pt');
    storage.setItem.mockImplementation(() => { throw new Error('quota'); });
    i18n.setHelperLocale('fr');
    expect(saved.get('vozen.lang')).toBe('pt');
    expect(i18n.readLocale()).toBe('fr');
    expect(i18n.helperText('Features')).toBe('Fonctionnalités');
  });

  it.each(['invalid', 'PT', '__proto__', 'pt-PT', ''])('normalizes invalid locale %j', locale => {
    saved.set('vozen.lang', locale);
    expect(i18n.readLocale()).toBe('en');
    i18n.setHelperLocale('ar');
    expect(i18n.setHelperLocale(locale)).toBe('en');
    expect(root).toEqual({ lang: 'en', dir: 'ltr' });
  });

  it('accepts same-tab site events including an in-memory selection', () => {
    i18n.readLocale();
    languageEvent('tr');
    expect(i18n.readLocale()).toBe('tr');
    expect(root.lang).toBe('tr');
    saved.set('vozen.lang', 'es');
    languageEvent();
    expect(i18n.readLocale()).toBe('es');
    languageEvent('unsupported');
    expect(i18n.readLocale()).toBe('en');
  });

  it('synchronizes all cross-tab selections and notifies existing language subscribers', () => {
    const onChange = vi.fn();
    browser.addEventListener('vozen:languagechange', onChange);
    for (const locale of locales) {
      saved.set('vozen.lang', locale);
      storageEvent('vozen.lang', locale, storage);
      expect(i18n.readLocale()).toBe(locale);
      expect(root.lang).toBe(locale);
      expect(root.dir).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    }
    expect(onChange).toHaveBeenCalledTimes(locales.length);
  });

  it('handles removed, invalid and cleared preferences without reacting to unrelated storage', () => {
    i18n.setHelperLocale('ar');
    storageEvent('auth', 'private');
    storageEvent('vozen.lang', 'pt', {});
    expect(i18n.readLocale()).toBe('ar');
    for (const value of ['invalid', null]) {
      if (value === null) saved.delete('vozen.lang'); else saved.set('vozen.lang', value);
      storageEvent('vozen.lang', value, storage);
      expect(i18n.readLocale()).toBe('en');
    }
    i18n.setHelperLocale('fr');
    saved.delete('vozen.lang');
    storageEvent(null, null, storage);
    expect(i18n.readLocale()).toBe('en');
  });
});

describe('Helper interface text', () => {
  it.each(locales)('translates existing named features through their English source in %s', locale => {
    i18n.setHelperLocale(locale);
    for (const feature of [
      'community.levels', 'community.starboard', 'support.tickets', 'support.welcome',
      'management.moderation', 'community.achievements', 'utility.temp_channels',
      'community.birthdays', 'community.economy',
    ]) {
      const key = `helper.feature.${feature}.label`;
      const dictionary = browser.VOZEN_I18N!;
      expect(i18n.helperText(dictionary.en[key])).toBe(dictionary[locale][key]);
      expect(i18n.helperT(key, 'wrong fallback')).toBe(dictionary[locale][key]);
    }
  });

  it('prioritizes keyed locale copy and preserves unknown sources and missing variables', () => {
    i18n.setHelperLocale('pt');
    expect(i18n.helperT('ecosystem.commands', 'Features')).toBe('Comandos');
    expect(i18n.helperText('Unknown {name}: {n}, {missing}', { name: '$& Alice', n: 0 }))
      .toBe('Unknown $& Alice: 0, {missing}');
    expect(i18n.helperText('{toString}')).toBe('{toString}');
    expect(i18n.helperText('{toString}', {})).toBe('{toString}');
    expect(i18n.helperT('__proto__', 'Unknown')).toBe('Unknown');
    expect(i18n.helperT('missing.key', 'Features')).toBe('Funcionalidades');
  });

  it.each(locales)('interpolates after translation in %s without translating variable content', locale => {
    i18n.setHelperLocale(locale);
    const template = browser.VOZEN_I18N![locale]['ecosystem.accountAria'];
    const expected = template.replace('{name}', 'Features {n}');
    expect(i18n.helperText("Open {name}'s Vozen account", { name: 'Features {n}', n: 42 })).toBe(expected);
    expect(i18n.helperT('ecosystem.accountAria', '', { name: 'Features {n}', n: 42 })).toBe(expected);
  });

  it('falls back to English source when the selected language lacks a key', () => {
    browser.VOZEN_I18N = { en: { only: 'English only' }, pt: {} };
    i18n.setHelperLocale('pt');
    expect(i18n.helperText('English only')).toBe('English only');
    expect(i18n.helperT('only', 'Ignored')).toBe('English only');
  });

  it('supports duplicate English sources, replacement catalogs and readiness invalidation', () => {
    browser.VOZEN_I18N = { en: { first: 'Same', second: 'Same' }, pt: { second: 'Segundo' } };
    i18n.setHelperLocale('pt');
    expect(i18n.helperText('Same')).toBe('Segundo');
    browser.VOZEN_I18N.en = { new: 'New' };
    browser.VOZEN_I18N.pt.new = 'Novo';
    expect(i18n.helperText('New')).toBe('Novo');
    browser.VOZEN_I18N.en.added = 'Added';
    browser.VOZEN_I18N.pt.added = 'Adicionado';
    browser.dispatchEvent(new CustomEvent('vozen:i18nready'));
    expect(i18n.helperText('Added')).toBe('Adicionado');
  });
});
