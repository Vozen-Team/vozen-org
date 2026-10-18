import { afterEach, describe, expect, it, vi } from 'vitest';
afterEach(() => vi.unstubAllGlobals());
describe('birthday channel API', () => {
  it('creates a birthday channel with only a name, never arbitrary guilds or permissions', async () => {
    vi.stubGlobal('window', { location: { hash: '' } });
    const { api } = await import('./api');
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      guildId: '10', channel: { id: '30', name: 'birthdays', type: 0 }, reused: false,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetch);
    const result = await api.createBirthdayChannel('birthdays');
    expect(result.channel.name).toBe('birthdays');
    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain('/api/birthdays/channel');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ name: 'birthdays' });
  });
});
