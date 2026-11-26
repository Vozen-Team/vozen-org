import type { FeatureConfig, RankCardConfig } from './api';
export type RankCardPublishState = { premium: boolean; loaded: boolean };
// Premium state is read when a write runs, not when the autosave writer was created.
export function rankCardUnlocked(features: ReadonlyArray<{ key: string; premium_unlocked?: boolean }>): boolean {
  return features.some(item => item.key === 'studio.rank_card' && Boolean(item.premium_unlocked));
}
// A rank card that failed to load is unknown: omitting it keeps the server's card (community.rank_card).
export function levelsPublishConfig(config: FeatureConfig, rank: RankCardConfig, state: RankCardPublishState): FeatureConfig {
  const next: FeatureConfig = { ...config, bannerEnabled: true };
  delete next.rankCard;
  if (state.premium && state.loaded) next.rankCard = rank;
  return next;
}
