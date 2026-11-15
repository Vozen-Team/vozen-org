import { afterEach, describe, expect, it, vi } from 'vitest';

const token = 's'.repeat(48);

async function loadWith(hash: string, pending?: unknown) {
  const values = new Map<string, string>();
  if (pending !== undefined) values.set('vh_oauth_pending', JSON.stringify(pending));
  const replaceState = vi.fn();
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  vi.stubGlobal('window', {
    location: { pathname: '/panel/helper-tracker/', search: '', hash },
    history: { replaceState },
    addEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
  vi.resetModules();
  await import('./api');
  return { values, replaceState };
}

afterEach(() => vi.unstubAllGlobals());

describe('legacy OAuth #session= fragment', () => {
  it('refuses a session this tab did not request (login CSRF) and strips it from the URL', async () => {
    const { values, replaceState } = await loadWith(`#session=${token}`);
    expect(values.get('vh_session_bearer')).toBeUndefined();
    expect(replaceState).toHaveBeenCalledWith(null, '', '/panel/helper-tracker/#/');
  });

  it('accepts the session once when this tab started the OAuth flow', async () => {
    const { values } = await loadWith(`#session=${token}`, { state: 'signed-state', createdAt: Date.now() });
    expect(values.get('vh_session_bearer')).toBe(token);
    expect(values.has('vh_oauth_pending')).toBe(false);
  });

  it('refuses stale or malformed pending markers', async () => {
    for (const pending of [{ state: 'signed-state', createdAt: Date.now() - 11 * 60_000 }, { state: '', createdAt: Date.now() }, 'garbage']) {
      const { values } = await loadWith(`#session=${token}`, pending);
      expect(values.get('vh_session_bearer')).toBeUndefined();
      expect(values.has('vh_oauth_pending')).toBe(false);
    }
  });

  it('consumes the marker on any load so it cannot be replayed later', async () => {
    const { values } = await loadWith('#/', { state: 'signed-state', createdAt: Date.now() });
    expect(values.has('vh_oauth_pending')).toBe(false);
  });
});
