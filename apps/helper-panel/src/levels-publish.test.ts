import { describe, expect, it } from 'vitest';
import type { RankCardConfig } from './api';
import { createAutosave } from './autosave';
import { levelsPublishConfig, rankCardUnlocked } from './levels-publish';

const rank: RankCardConfig = {
  font: 'inter',
  primary_color: '#8EE5D2',
  text_color: '#F4F7FB',
  background_color: '#101725',
  overlay_opacity: 0.36,
  background_preset: null,
  background_url: null,
  background_data: null,
  avatar_ring_color: '#8EE5D2',
  avatar_ring_width: 4,
};
const staleRank = { ...rank, font: 'system' };

describe('levels publish payload', () => {
  it('omits the rank card without Premium', () => {
    const config = { xpMin: 20, rankCard: staleRank };
    expect(levelsPublishConfig(config, rank, { premium: false, loaded: true })).toEqual({ xpMin: 20, bannerEnabled: true });
    expect(config).toEqual({ xpMin: 20, rankCard: staleRank });
  });
  it('sends the rank card with Premium once it loaded', () => {
    expect(levelsPublishConfig({ xpMin: 20, rankCard: staleRank }, rank, { premium: true, loaded: true }))
      .toEqual({ xpMin: 20, bannerEnabled: true, rankCard: rank });
  });
  it('omits a rank card that failed to load', () => {
    expect(levelsPublishConfig({ xpMin: 20, rankCard: staleRank }, rank, { premium: true, loaded: false }))
      .toEqual({ xpMin: 20, bannerEnabled: true });
  });
  it('detects an unlocked rank card', () => {
    expect(rankCardUnlocked([{ key: 'studio.rank_card', premium_unlocked: true }])).toBe(true);
    expect(rankCardUnlocked([])).toBe(false);
    expect(rankCardUnlocked([{ key: 'studio.rank_card', premium_unlocked: false }])).toBe(false);
    expect(rankCardUnlocked([{ key: 'community.levels', premium_unlocked: true }])).toBe(false);
  });
  it('reads Premium when the write runs, not when the writer was created', async () => {
    const live = { premium: false, loaded: true };
    const payloads: Record<string, unknown>[] = [];
    const queue = createAutosave({
      revision: 1,
      write: async (sent: { config: Record<string, unknown>; rank: RankCardConfig }, revision: number) => {
        payloads.push(levelsPublishConfig(sent.config, sent.rank, live));
        return { revision: revision + 1 };
      },
      saved: () => undefined,
      state: () => undefined,
    });
    queue.enqueue({ config: { xpMin: 20 }, rank });
    expect(await queue.flush()).toBe(true);
    live.premium = true;
    queue.enqueue({ config: { xpMin: 25 }, rank });
    expect(await queue.flush()).toBe(true);
    expect(payloads).toEqual([
      { xpMin: 20, bannerEnabled: true },
      { xpMin: 25, bannerEnabled: true, rankCard: rank },
    ]);
  });
});
