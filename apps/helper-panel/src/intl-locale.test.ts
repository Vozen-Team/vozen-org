import { expect, it } from 'vitest';
import { intlLocale } from './intl-locale';
it('maps panel locales to the regional Intl locale used across the panel', () => {
  expect(intlLocale('zh')).toBe('zh-TW');
  expect(intlLocale('pt')).toBe('pt-PT');
  expect(intlLocale('en')).toBe('en');
  expect(intlLocale('ko')).toBe('ko');
});
