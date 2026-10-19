import { describe, expect, it } from 'vitest';
import { addLevelReward, levelRewardEntries, levelSettingCopy, LEVEL_SETTING_KEYS } from './levels-settings';

describe('Levels settings presentation', () => {
  it('accounts for every setting without the retired banner switch', () => {
    expect(new Set(LEVEL_SETTING_KEYS).size).toBe(10);
    expect(LEVEL_SETTING_KEYS).not.toContain('bannerEnabled');
  });
  it('keeps saved rewards and unknown legacy values without silently dropping them', () => {
    expect(levelRewardEntries(['5=123', 'future-value'])).toEqual(['5=123', 'future-value']);
    expect(levelRewardEntries('5=123, 10=456')).toEqual(['5=123', '10=456']);
    expect(levelRewardEntries(undefined)).toEqual([]);
    expect(levelRewardEntries(42)).toEqual([]);
  });
  it('adds rewards without mutating other values or duplicating an identical reward', () => {
    const saved = ['5=123', 'future-value'];
    expect(addLevelReward(saved, 10, '456')).toEqual([...saved, '10=456']);
    expect(saved).toEqual(['5=123', 'future-value']);
    expect(addLevelReward(saved, 5, '123')).toEqual(saved);
  });
  it('rejects invalid or unbounded rewards instead of saving malformed settings', () => {
    for (const level of [0, -1, 1.2, NaN, Infinity, 4294967296]) expect(addLevelReward([], level, '123')).toBeNull();
    for (const role of ['', 'abc', '0', '18446744073709551616', '1'.repeat(21)]) expect(addLevelReward([], 5, role)).toBeNull();
    expect(addLevelReward(Array(50).fill('5=123'), 10, '456')).toBeNull();
  });
  it('keeps Portuguese and English field descriptions scoped to Levels', () => {
    for (const locale of ['en', 'pt']) {
      for (const key of LEVEL_SETTING_KEYS.filter(key => key !== 'levelRoles')) expect(levelSettingCopy(key, locale).label).toBeTruthy();
      expect(levelSettingCopy('futureField', locale)).toEqual({});
      expect(levelSettingCopy('announceChannel', locale).emptyLabel).toBeTruthy();
    }
    expect(levelSettingCopy('cooldownSeconds', 'pt').help).toContain('não dão XP');
    expect(addLevelReward([], 4294967295, '18446744073709551615')).toEqual(['4294967295=18446744073709551615']);
  });
});
