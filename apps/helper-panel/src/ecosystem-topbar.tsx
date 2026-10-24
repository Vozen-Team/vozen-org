import { useEffect, useRef, useState } from 'react';
import { helperLocale, helperT, LOCALE_OPTIONS, setHelperLocale } from './i18n';

type EcosystemAccount = {
  id?: string;
  username?: string;
  avatar?: string | null;
  avatarDecorationAsset?: string | null;
  avatar_decoration_asset?: string | null;
  avatarDecorationData?: { asset?: string | null } | null;
  avatar_decoration_data?: { asset?: string | null } | null;
};

function readCachedEcosystemAccount(): EcosystemAccount | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem('vozen.navuser');
    const parsed = raw ? JSON.parse(raw) : null;
    // The public navigation stores `{ user }`, while a few older account
    // restores wrote the user object directly. Accept both shapes so the
    // product header never falls back to a generic account after a valid
    // session is restored.
    const account = parsed?.user ?? parsed;
    return account && typeof account.username === 'string' ? account : null;
  } catch {
    return null;
  }
}

export function discordAvatarUrl(account: EcosystemAccount): string | null {
  const id = String(account.id ?? '');
  const avatar = String(account.avatar ?? '');
  if (!/^\d{16,22}$/.test(id) || !/^(?:a_)?[A-Za-z0-9_]{1,128}$/.test(avatar)) {
    return null;
  }
  const extension = avatar.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${id}/${avatar}.${extension}?size=96`;
}

function discordDecorationUrl(account: EcosystemAccount): string | null {
  const asset = String(
    account.avatarDecorationAsset
      ?? account.avatar_decoration_asset
      ?? account.avatarDecorationData?.asset
      ?? account.avatar_decoration_data?.asset
      ?? '',
  );
  return /^[A-Za-z0-9_]{1,128}$/.test(asset)
    ? `https://cdn.discordapp.com/avatar-decoration-presets/${asset}.png?size=96`
    : null;
}

export function EcosystemAccountAvatar({
  src,
  initial,
}: {
  src: string | null;
  initial: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return <span className="workspace-global-nav__account-avatar--fallback">{initial}</span>;
  }

  return (
    <img
      className="workspace-global-nav__account-avatar"
      src={src}
      alt=""
      width="24"
      height="24"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

function EcosystemLanguageMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const locale = helperLocale();
  const localeOption = LOCALE_OPTIONS.find((option) => option.code === locale) ?? LOCALE_OPTIONS[0];

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const chooseLocale = (nextLocale: string) => {
    setHelperLocale(nextLocale);
    setOpen(false);
  };

  return (
    <div
      className={`workspace-global-nav__language${open ? ' is-open' : ''}`}
      ref={rootRef}
    >
      <button
        className="workspace-global-nav__language-button"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={helperT('ecosystem.siteLanguage', 'Site language')}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="workspace-global-nav__language-flag" aria-hidden="true">{localeOption.flag}</span>
        <span className="workspace-global-nav__language-name">{localeOption.name}</span>
        <svg className="workspace-global-nav__language-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <ul
        className="workspace-global-nav__language-panel"
        role="listbox"
        aria-label={helperT('ecosystem.chooseLanguage', 'Choose language')}
      >
        {LOCALE_OPTIONS.map((option) => {
          const active = option.code === locale;
          return (
            <li role="option" aria-selected={active} key={option.code}>
              <button
                className={`workspace-global-nav__language-option${active ? ' is-active' : ''}`}
                type="button"
                onClick={() => chooseLocale(option.code)}
              >
                <span className="workspace-global-nav__language-flag" aria-hidden="true">{option.flag}</span>
                <span className="workspace-global-nav__language-option-name">{option.name}</span>
                <span className="workspace-global-nav__language-check" aria-hidden="true">✓</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function useEcosystemAccount() {
  const [account, setAccount] = useState<EcosystemAccount | null>(() => readCachedEcosystemAccount());

  useEffect(() => {
    // Account login writes this cache before navigating to a product. Refresh
    // after mount and on session/page updates so a restored Discord profile is
    // reflected without requiring a full reload.
    const refresh = () => setAccount(readCachedEcosystemAccount());
    refresh();
    const restoreTimer = window.setTimeout(refresh, 150);
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'vozen.navuser' || event.key === 'vozen.ecosystem.dtoken') refresh();
    };
    const onAuthSync = () => refresh();
    const onPageShow = () => refresh();
    window.addEventListener('storage', onStorage);
    window.addEventListener('vozen:authsync', onAuthSync);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.clearTimeout(restoreTimer);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('vozen:authsync', onAuthSync);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  return account;
}

export function EcosystemTopbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!navRef.current?.contains(event.target as Node)) setMenuOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, []);
  const account = useEcosystemAccount();
  const username = account?.username?.trim() || '';
  const initial = username.slice(0, 1).toUpperCase() || 'V';
  const avatar = account ? discordAvatarUrl(account) : null;
  const decoration = account ? discordDecorationUrl(account) : null;

  return (
    <header ref={navRef} className="workspace-global-nav workspace-standalone__topbar" aria-label={helperT('ecosystem.navAria', 'Vozen ecosystem navigation')}>
      <div className="workspace-global-nav__inner">
        <a className="workspace-global-nav__brand" href="/" aria-label={helperT('ecosystem.homeAria', 'Vozen ecosystem home')}>
          <span className="workspace-global-nav__mark" aria-hidden="true">
            <img src="/assets/vozen-ecosystem-icon.png" alt="" />
          </span>
          <span className="workspace-global-nav__word">Vozen</span>
          <span className="workspace-global-nav__product">{helperT('ecosystem.ecosystem', 'Ecosystem')}</span>
        </a>
        <nav id="ecosystem-products" className={`workspace-global-nav__links${menuOpen ? ' is-open' : ''}`} onClick={() => setMenuOpen(false)} aria-label={helperT('ecosystem.productsAria', 'Vozen products')}>
          <a href="/tts/">{helperT('ecosystem.tts', 'Vozen TTS')}</a>
          <a href="/helper/" aria-current="page">{helperT('ecosystem.helper', 'Vozen Helper')}</a>
          <a href="/docs/">{helperT('ecosystem.docs', 'Docs')}</a>
          <a href="/commands/">{helperT('ecosystem.commands', 'Commands')}</a>
          <span aria-disabled="true" title={helperT('ecosystem.premiumUnavailable', 'Premium is temporarily unavailable')}>{helperT('helper.premium', 'Premium')}</span>
        </nav>
        <div className="workspace-global-nav__actions">
          <a className="workspace-global-nav__github" href="https://github.com/Rexy40407/vozen" target="_blank" rel="noreferrer" aria-label={helperT('ecosystem.githubAria', 'Vozen on GitHub')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 .6a11.4 11.4 0 0 0-3.61 22.21c.57.1.78-.25.78-.55v-2.02c-3.17.69-3.84-1.34-3.84-1.34-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.02 1.75 2.67 1.25 3.32.96.1-.74.4-1.25.72-1.54-2.53-.29-5.19-1.27-5.19-5.64 0-1.25.45-2.27 1.19-3.07-.12-.3-.52-1.46.11-3.03 0 0 .97-.31 3.15 1.17A10.9 10.9 0 0 1 12 6.2c.98 0 1.97.13 2.89.38 2.18-1.48 3.15-1.17 3.15-1.17.63 1.57.23 2.73.11 3.03.74.8 1.19 1.82 1.19 3.07 0 4.38-2.67 5.35-5.21 5.63.41.36.77 1.07.77 2.16v3.2c0 .3.2.66.79.55A11.4 11.4 0 0 0 12 .6Z" />
            </svg>
          </a>
          <EcosystemLanguageMenu />
          {account ? (
            <a className="workspace-global-nav__account" href="/account/" aria-label={helperT('ecosystem.accountAria', `Open ${username}'s Vozen account`, { name: username })}>
              <span className="workspace-global-nav__account-avatar-wrap" aria-hidden="true">
                <EcosystemAccountAvatar src={avatar} initial={initial} />
                {decoration ? <img className="workspace-global-nav__account-avatar-decoration" src={decoration} alt="" width="32" height="32" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.hidden = true; }} /> : null}
              </span>
              <span>{username}</span>
            </a>
          ) : (
            <a className="workspace-global-nav__account workspace-global-nav__account--login" href="/account/" aria-label={helperT('ecosystem.loginAria', 'Log in to Vozen')}>
              <svg viewBox="0 0 24 18" aria-hidden="true">
                <path d="M20.3 1.6A19.8 19.8 0 0 0 15.4.1a14 14 0 0 0-.6 1.3 18.3 18.3 0 0 0-5.5 0A13 13 0 0 0 8.6.1 19.7 19.7 0 0 0 3.7 1.6C.6 6.3-.3 10.8.2 15.3a19.9 19.9 0 0 0 6 3 14.7 14.7 0 0 0 1.3-2.1 12.9 12.9 0 0 1-2-1c.2-.1.3-.3.5-.4a14.2 14.2 0 0 0 12 0l.5.4a12.8 12.8 0 0 1-2 1 14.5 14.5 0 0 0 1.3 2.1 19.8 19.8 0 0 0 6-3c.6-5.2-.8-9.7-3.5-13.7ZM8 12.6c-1.2 0-2.1-1.1-2.1-2.4S6.8 7.8 8 7.8s2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4Zm8 0c-1.2 0-2-1-2-2.3 0-1.24.88-2.28 2-2.28s2.02 1.04 2 2.28c0 1.26-.9 2.3-2 2.3Z" />
              </svg>
              <span>{helperT('ecosystem.login', 'Log in')}</span>
            </a>
          )}
          <button className="workspace-global-nav__menu" type="button" aria-label={helperT('common.menu', 'Menu')} aria-controls="ecosystem-products" aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d={menuOpen ? 'M6 6l12 12M6 18L18 6' : 'M3 6h18M3 12h18M3 18h18'} /></svg>
          </button>
        </div>
      </div>
    </header>
  );
}

