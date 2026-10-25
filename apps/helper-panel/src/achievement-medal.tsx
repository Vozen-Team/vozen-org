import {achievementCatalog} from './achievement-catalog';
export function AchievementMedal({ id, tier, earned }: { id: string; tier: number; earned: boolean }) {
  return <span className={`achievement-medal tier-${tier} ${earned ? 'earned' : 'locked'}`} aria-hidden="true"><span><svg viewBox="-24 -24 48 48" width="80%" height="80%"><path d={achievementCatalog[id]?.path} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span></span>;
}

