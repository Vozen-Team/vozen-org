import features from './panel-paths.json';

const pages: Record<string, string> = { '#/': '', '#/servers': 'servers', '#/quick-setup': 'setup', '#/features': 'features', '#/activity': 'activity' };
const featurePaths: Record<string, string> = features;
const profileTokens = new Map<string, string>();
export const PANEL_ROUTE_EVENT = 'vozen:routechange';

type Location = { pathname: string; search: string; hash: string };
const collectionPattern = /^#\/achievements\/(\d{15,22})(?:\/([a-f0-9]{64}))?(?:\?lang=([a-z]{2}))?$/;

function profileToken(guild: string, token?: string): string | null {
  const key = `vh_achievement_profile:${guild}`;
  if (token) profileTokens.set(guild, token);
  try {
    if (token) sessionStorage.setItem(key, token);
    const saved = sessionStorage.getItem(key);
    if (saved && /^[a-f0-9]{64}$/.test(saved)) return saved;
  } catch { /* The current tab still works when browser storage is blocked. */ }
  return profileTokens.get(guild) ?? null;
}

export function panelPath(route: string): string | null {
  if (route === '#/achievements/invalid') return '/panel/collection/';
  if (route === '#/config') route = '#/features';
  if (route === '#/rank-card') route = '#/config/studio.rank_card';
  if (Object.hasOwn(pages, route)) return `/panel/${pages[route]}${pages[route] ? '/' : ''}`;
  const feature = /^#\/config\/([a-z0-9._-]+)$/.exec(route)?.[1];
  if (feature && Object.hasOwn(featurePaths,feature)) return `/panel/${featurePaths[feature]}/`;
  const collection = collectionPattern.exec(route);
  if (!collection) return null;
  const [, guild, token] = collection;
  if (token) profileToken(guild, token);
  return `/panel/collection/?server=${guild}${token ? '&profile=1' : ''}`;
}

export function panelRoute(location: Location = window.location): string {
  // Cached links and Discord profile links remain valid, including their fragment-only credentials.
  if (location.hash && panelPath(location.hash)) return location.hash;
  if (location.hash.startsWith('#/achievements/')) return '#/achievements/invalid';
  const path = location.pathname.replace(/\/$/, '');
  if (path === '/panel/collection') {
    const query = new URLSearchParams(location.search);
    const guild = query.get('server');
    if (!guild || !/^\d{15,22}$/.test(guild)) return '#/achievements/invalid';
    const token = query.get('profile') === '1' ? profileToken(guild) : null;
    // A missing private credential must not silently show a public member profile.
    return `#/achievements/${guild}${query.get('profile') === '1' ? `/${token ?? 'expired'}` : ''}`;
  }
  if (path === '/panel' || path === '/panel/helper-tracker' || path === '') return '#/';
  const slug = path.replace(/^\/panel\//, '');
  const page = Object.entries(pages).find(([, candidate]) => candidate === slug)?.[0];
  if (page) return page;
  const feature = Object.entries(featurePaths).find(([, candidate]) => candidate === slug)?.[0];
  return feature ? `#/config/${feature}` : '#/';
}

export function navigatePanel(route: string, replace = false): boolean {
  const path = panelPath(route);
  if (!path) return false;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (path === current) return true;
  window.history[replace ? 'replaceState' : 'pushState'](null, '', path);
  window.dispatchEvent(new Event(PANEL_ROUTE_EVENT));
  return true;
}

export function normalizePanelRoute(): void {
  // OAuth bearer fragments are consumed by api.ts before this bootstrap runs.
  if (window.location.hash.startsWith('#session=')) return;
  navigatePanel(panelRoute(), true);
}
