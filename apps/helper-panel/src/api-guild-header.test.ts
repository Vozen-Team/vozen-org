import { afterEach, describe, expect, it, vi } from 'vitest';

const GUILD_CHANGED_TEXT = 'The configuration changed in another session. Reload before editing again; your draft is still here.';

function respond(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }));
}

afterEach(async () => {
  (await import('./api')).setExpectedGuild(null);
  vi.unstubAllGlobals();
});

describe('displayed guild header', () => {
  it('sends the guild the tab displays with every write', async () => {
    vi.stubGlobal('window', { location: { hash: '' } });
    const mod = await import('./api');
    const fetch = respond({ guildId: '10', channel: { id: '30', name: 'x', type: 0 }, reused: false });
    vi.stubGlobal('fetch', fetch);
    mod.setExpectedGuild('10');
    const result = await mod.api.createBirthdayChannel('x');
    expect(result.guildId).toBe('10');
    const [, options] = fetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.headers['X-Vozen-Guild']).toBe('10');
  });

  it('does not send it with reads', async () => {
    vi.stubGlobal('window', { location: { hash: '' } });
    const mod = await import('./api');
    const fetch = respond({ id: '1', guildId: '10', expiresAt: '2099-01-01T00:00:00Z' });
    vi.stubGlobal('fetch', fetch);
    mod.setExpectedGuild('10');
    await mod.api.me();
    const [, options] = fetch.mock.calls[0];
    expect(options.headers['X-Vozen-Guild']).toBeUndefined();
  });

  it('does not send it when switching servers', async () => {
    vi.stubGlobal('window', { location: { hash: '' } });
    const mod = await import('./api');
    const fetch = respond({ ok: true, guildId: '20' });
    vi.stubGlobal('fetch', fetch);
    mod.setExpectedGuild('10');
    await mod.api.switchGuild('20');
    const [, options] = fetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.headers['X-Vozen-Guild']).toBeUndefined();
  });

  it('turns a guild_changed conflict into the reload message', async () => {
    vi.stubGlobal('window', { location: { hash: '' } });
    const mod = await import('./api');
    vi.stubGlobal('fetch', respond({ code: 'guild_changed', message: 'guild_changed' }, 409));
    mod.setExpectedGuild('10');
    const error = await mod.api.createBirthdayChannel('x').catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(mod.ApiError);
    expect((error as InstanceType<typeof mod.ApiError>).status).toBe(409);
    expect((error as Error).message).toBe(GUILD_CHANGED_TEXT);
  });

  it('sends nothing while no guild is displayed', async () => {
    vi.stubGlobal('window', { location: { hash: '' } });
    const mod = await import('./api');
    const fetch = respond({ guildId: '10', channel: { id: '30', name: 'x', type: 0 }, reused: false });
    vi.stubGlobal('fetch', fetch);
    mod.setExpectedGuild(null);
    await mod.api.createBirthdayChannel('x');
    const [, options] = fetch.mock.calls[0];
    expect(options.headers['X-Vozen-Guild']).toBeUndefined();
  });
});
