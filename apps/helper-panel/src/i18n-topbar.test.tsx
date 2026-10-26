// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EcosystemTopbar } from './ecosystem-topbar';
import { LOCALE_OPTIONS, readLocale, setHelperLocale } from './i18n';

let container: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.clear();
  sessionStorage.setItem('vozen.navuser', JSON.stringify({ user: { username: 'Features' } }));
  setHelperLocale('en');
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => { root.render(<EcosystemTopbar />); });
});

afterEach(async () => {
  await act(async () => { root.unmount(); });
  container.remove();
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function expectLocale(code: string, name: string) {
  expect(readLocale()).toBe(code);
  expect(container.querySelector('.lang__name')?.textContent).toBe(name);
  expect(container.querySelector('[role="option"][aria-selected="true"] .lang__optname')?.textContent).toBe(name);
  expect(container.querySelector('a[href="/commands/"]')?.textContent)
    .toBe(window.VOZEN_I18N![code]['ecosystem.commands']);
  expect(container.querySelector('.nav__login--account')?.textContent).toContain('Features');
  expect(JSON.parse(sessionStorage.getItem('vozen.navuser')!).user.username).toBe('Features');
}

it('rerenders the selected label and navigation for all ten menu choices', async () => {
  for (const { code, name } of LOCALE_OPTIONS) {
    const button = Array.from(container.querySelectorAll<HTMLButtonElement>('.lang__opt'))
      .find(option => option.textContent?.includes(name))!;
    await act(async () => { button.click(); });
    expectLocale(code, name);
  }
});

it('rerenders the topbar when another tab changes or removes the locale', async () => {
  for (const { code, name } of LOCALE_OPTIONS) {
    await act(async () => {
      localStorage.setItem('vozen.lang', code);
      window.dispatchEvent(new StorageEvent('storage', { key: 'vozen.lang', newValue: code, storageArea: localStorage }));
    });
    expectLocale(code, name);
  }
  await act(async () => {
    localStorage.removeItem('vozen.lang');
    window.dispatchEvent(new StorageEvent('storage', { key: 'vozen.lang', newValue: null, storageArea: localStorage }));
  });
  expectLocale('en', 'English');
});

it('keeps label and rendered language aligned with blocked persistence and site events', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  await act(async () => { setHelperLocale('ar'); });
  expectLocale('ar', 'العربية');
  expect(document.documentElement.dir).toBe('rtl');
  await act(async () => {
    window.dispatchEvent(new CustomEvent('vozen:languagechange', { detail: { language: 'pt' } }));
  });
  expectLocale('pt', 'Português');
  expect(document.documentElement.dir).toBe('ltr');
});
