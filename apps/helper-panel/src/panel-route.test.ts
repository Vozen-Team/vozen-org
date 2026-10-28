import { afterEach, describe, expect, it, vi } from 'vitest';
import paths from './panel-paths.json';
import { navigatePanel, panelPath, panelRoute } from './panel-route';

afterEach(() => vi.unstubAllGlobals());
describe('clean Helper routes', () => {
  it('round-trips every feature without internal namespaces or fragments', () => {
    expect(Object.keys(paths)).toHaveLength(47);
    expect(new Set(Object.values(paths)).size).toBe(47);
    for (const [key, slug] of Object.entries(paths)) {
      expect(panelPath(`#/config/${key}`)).toBe(`/panel/${slug}/`);
      expect(panelRoute({pathname:`/panel/${slug}/`,search:'',hash:''})).toBe(`#/config/${key}`);
    }
    expect(panelPath('#/config/management.invite_tracker')).toBe('/panel/invites/');
  });
  it.each([['#/', '/panel/'], ['#/quick-setup','/panel/setup/'], ['#/features','/panel/features/'], ['#/activity','/panel/activity/'], ['#/servers','/panel/servers/'], ['#/rank-card','/panel/rank/']])('supports %s', (route,path) => expect(panelPath(route)).toBe(path));
  it('accepts legacy bookmarks and rejects arbitrary redirect targets', () => {
    expect(panelRoute({pathname:'/panel/helper-tracker/',search:'',hash:'#/config/management.invite_tracker'})).toBe('#/config/management.invite_tracker');
    for (const target of ['https://evil.test','//evil.test','#/config/../../admin','#/config/unknown','#/config/__proto__','#/config/constructor','#/config/toString','#/servers?next=https://evil.test']) expect(panelPath(target)).toBeNull();
  });
  it('keeps private collection credentials out of the path and query', () => {
    const values = new Map<string,string>();
    vi.stubGlobal('sessionStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)});
    const token = 'a'.repeat(64), guild = '1524199248248176751';
    expect(panelPath(`#/achievements/${guild}/${token}?lang=pt`)).toBe(`/panel/collection/?server=${guild}&profile=1`);
    expect(panelRoute({pathname:'/panel/collection/',search:`?server=${guild}&profile=1`,hash:''})).toBe(`#/achievements/${guild}/${token}`);
    expect(panelRoute({pathname:'/panel/collection/',search:'?server=invalid',hash:''})).toBe('#/achievements/invalid');
    expect(panelRoute({pathname:'/panel/collection/',search:'?server=9999999999999999&profile=1',hash:''})).toBe('#/achievements/9999999999999999/expired');
  });
  it('keeps malformed public collection links out of management authentication', () => {
    expect(panelRoute({pathname:'/panel/helper-tracker/',search:'',hash:'#/achievements/not-a-server'})).toBe('#/achievements/invalid');
    expect(panelPath('#/achievements/invalid')).toBe('/panel/collection/');
    expect(panelRoute({pathname:'/panel/collection/',search:'',hash:''})).toBe('#/achievements/invalid');
  });
  it('uses history with a navigation event, never a page reload', () => {
    const pushState=vi.fn(),replaceState=vi.fn(),dispatchEvent=vi.fn();
    vi.stubGlobal('window',{location:{pathname:'/panel/',search:'',hash:''},history:{pushState,replaceState},dispatchEvent});
    expect(navigatePanel('#/config/management.invite_tracker')).toBe(true);
    expect(pushState).toHaveBeenCalledWith(null,'','/panel/invites/');
    expect(dispatchEvent).toHaveBeenCalledOnce();
    expect(navigatePanel('//evil.test')).toBe(false);
    expect(pushState).toHaveBeenCalledOnce();
  });
});
