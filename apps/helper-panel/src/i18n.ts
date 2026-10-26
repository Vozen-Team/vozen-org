/* Shared locale and catalogue access for the React Helper workspace. */
import { useSyncExternalStore } from 'react';
import { helperCopy } from './helper-copy';
import schemaAliases from './helper-schema-aliases.json';
import appAliases from './helper-app-aliases.json';
const sourceAliases: Record<string,string> = {...schemaAliases,...appAliases};
if (typeof window !== 'undefined') {
  // @ts-ignore The public catalogue is a browser side-effect module.
  await import('../../../site/js/i18n-v41.js');
  // @ts-ignore The overlay must load after the base catalogue.
  await import('../../../site/js/i18n-v42.js');
}

export const SUPPORTED_LOCALES = ['en', 'pt', 'fr', 'es', 'de', 'tr', 'ar', 'zh', 'ru', 'ko'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'en';

export const LOCALE_OPTIONS: Array<{ code: SupportedLocale; flag: string; name: string }> = [
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'pt', flag: '🇵🇹', name: 'Português' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'tr', flag: '🇹🇷', name: 'Türkçe' },
  { code: 'ar', flag: '🇸🇦', name: 'العربية' },
  { code: 'zh', flag: '🇹🇼', name: '繁體中文' },
  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
  { code: 'ko', flag: '🇰🇷', name: '한국어' },
];

type Dictionary = Record<string, Record<string, string>>;

declare global {
  interface Window {
    VOZEN_I18N?: Dictionary;
  }
}

const LOCALE_KEY = 'vozen.lang';
let currentLocale: SupportedLocale = DEFAULT_LOCALE;
let storedValue: string | null | undefined;
const localeListeners = new Set<() => void>();

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === 'string' && SUPPORTED_LOCALES.includes(value as SupportedLocale);
}

export function readLocale(): SupportedLocale {
  try {
    const value = window.localStorage.getItem(LOCALE_KEY);
    if (value !== storedValue) {
      storedValue = value;
      currentLocale = isSupportedLocale(value) ? value : DEFAULT_LOCALE;
    }
  } catch {
    // Keep the session's selection when browser storage cannot be read.
  }
  return currentLocale;
}

export const helperLocale = readLocale;

export function setHelperLocale(value: string): SupportedLocale {
  const locale = isSupportedLocale(value) ? value : DEFAULT_LOCALE;
  readLocale();
  currentLocale = locale;
  try {
    window.localStorage.setItem(LOCALE_KEY, locale);
    storedValue = locale;
  } catch {
    // An unchanged stored value must not override this in-memory selection.
  }
  syncHelperDocumentLocale();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vozen:languagechange', { detail: { language: locale } }));
  }
  return locale;
}

function subscribeLocale(listener: () => void): () => void {
  localeListeners.add(listener);
  return () => { localeListeners.delete(listener); };
}

export function useHelperLocale(): SupportedLocale {
  return useSyncExternalStore(subscribeLocale, readLocale, () => DEFAULT_LOCALE);
}

function interpolate(value: string, variables?: Record<string, string | number>): string {
  if (!variables) return value;
  return value.replace(/\{(\w+)\}/g, (placeholder, key: string) =>
    Object.hasOwn(variables, key) ? String(variables[key]) : placeholder);
}

let sourceDictionary: Record<string, string> | undefined;
let sourceKeys = new Map<string, string[]>();

function dictionaryValue(dictionary: Record<string, string> | undefined, key: string): string | undefined {
  return dictionary && Object.hasOwn(dictionary, key) && typeof dictionary[key] === 'string'
    ? dictionary[key] : undefined;
}

// Call only for interface copy; names, messages and other user content stay untouched.
export function helperText(source: string, variables?: Record<string, string | number>): string {
  source = Object.hasOwn(sourceAliases,source) ? sourceAliases[source] : source;
  const locale = readLocale();
  const dictionary = typeof window === 'undefined' ? {} : window.VOZEN_I18N ?? {};
  const translated = helperCopy[source]?.[locale];
  if (translated !== undefined) return interpolate(translated, variables);
  if (locale === 'en') return interpolate(source, variables);
  if (sourceDictionary !== dictionary.en) {
    sourceDictionary = dictionary.en;
    sourceKeys = new Map();
    for (const [key, value] of Object.entries(sourceDictionary ?? {})) {
      const keys = sourceKeys.get(value) ?? [];
      keys.push(key);
      sourceKeys.set(value, keys);
    }
  }
  for (const key of sourceKeys.get(source) ?? []) {
    const value = dictionaryValue(dictionary[locale], key);
    if (value !== undefined) return interpolate(value, variables);
  }
  return interpolate(source, variables);
}

export function helperT(
  key: string,
  fallback: string,
  variables?: Record<string, string | number>,
): string {
  const locale = helperLocale();
  const dictionary = typeof window === 'undefined' ? {} : window.VOZEN_I18N ?? {};
  const value = dictionaryValue(dictionary[locale], key);
  return value === undefined
    ? helperText(dictionaryValue(dictionary.en, key) ?? fallback, variables)
    : interpolate(value, variables);
}

export function localeName(locale: SupportedLocale): string {
  return LOCALE_OPTIONS.find((option) => option.code === locale)?.name ?? 'English';
}

export function syncHelperDocumentLocale(): void {
  if (typeof document === 'undefined') return;
  const locale = helperLocale();
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
}

if (typeof window !== 'undefined') {
  window.addEventListener('vozen:languagechange', (event) => {
    const language = (event as CustomEvent<{ language?: unknown }>).detail?.language;
    if (language !== undefined) {
      readLocale();
      currentLocale = isSupportedLocale(language) ? language : DEFAULT_LOCALE;
    }
    syncHelperDocumentLocale();
    localeListeners.forEach((listener) => listener());
  });
  window.addEventListener('storage', (event) => {
    if (event.key !== LOCALE_KEY && event.key !== null) return;
    try {
      if (event.storageArea && event.storageArea !== window.localStorage) return;
    } catch { /* A blocked storage getter still allows the event's locale. */ }
    storedValue = event.newValue;
    currentLocale = isSupportedLocale(event.newValue) ? event.newValue : DEFAULT_LOCALE;
    window.dispatchEvent(new CustomEvent('vozen:languagechange', { detail: { language: currentLocale } }));
  });
  window.addEventListener('vozen:i18nready', () => {
    sourceDictionary = undefined;
    sourceKeys = new Map();
  });
}
