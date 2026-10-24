import { describe, expect, it, vi } from 'vitest';
import { achievementLocales, achievementMessages, achievementText } from './achievements-i18n';
vi.mock('./i18n', () => ({ SUPPORTED_LOCALES: ['en','pt','fr','es','de','tr','ar','zh','ru','ko'] }));
import { SUPPORTED_LOCALES } from './i18n';
import { achievementRoute, achievementScore, type Achievement } from './achievements-page';
describe('Achievements public and personal pages', () => {
  it('accepts only a scoped guild and optional full private token', () => {
    const token = 'a'.repeat(64);
    expect(achievementRoute(`#/achievements/1524199248248176751/${token}?lang=pt`)).toEqual({guild:'1524199248248176751',token,locale:'pt'});
    expect(achievementRoute('#/achievements/1524199248248176751')?.token).toBeUndefined();
    for (const hash of ['#/achievements/other', '#/achievements/1524199248248176751/short', '#/achievements/1524199248248176751/<script>']) expect(achievementRoute(hash)).toBeNull();
  });
  it('covers every site locale for all achievement messages', () => {
    expect([...achievementLocales, 'en', 'pt'].sort()).toEqual([...SUPPORTED_LOCALES].sort());
    for (const [key, translations] of Object.entries(achievementMessages)) {
      expect(translations).toHaveLength(8);
      for (const locale of achievementLocales) expect(achievementText(locale, key, '')).toBeTruthy();
    }
  });
  it('weights tiers within a category instead of counting each as a separate achievement', () => {
    const row: Achievement = {id:'messages',name:'Messages',description:'',value:500,thresholds:[20,100,500,1000],unlocked:[true,true,true,false]};
    expect(achievementScore([row])).toBe(0.75);
    expect(achievementScore([])).toBe(0);
  });
});
