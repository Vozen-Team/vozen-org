import { describe, expect, it } from 'vitest';
import { achievementRoute, achievementScore, type Achievement } from './achievements-page';
describe('Achievements public and personal pages', () => {
  it('accepts only a scoped guild and optional full private token', () => {
    const token = 'a'.repeat(64);
    expect(achievementRoute(`#/achievements/1524199248248176751/${token}?lang=pt`)).toEqual({guild:'1524199248248176751',token,pt:true});
    expect(achievementRoute('#/achievements/1524199248248176751')?.token).toBeUndefined();
    for (const hash of ['#/achievements/other', '#/achievements/1524199248248176751/short', '#/achievements/1524199248248176751/<script>']) expect(achievementRoute(hash)).toBeNull();
  });
  it('weights tiers within a category instead of counting each as a separate achievement', () => {
    const row: Achievement = {id:'messages',name:'Messages',description:'',value:500,thresholds:[20,100,500,1000],unlocked:[true,true,true,false]};
    expect(achievementScore([row])).toBe(0.75);
    expect(achievementScore([])).toBe(0);
  });
});
