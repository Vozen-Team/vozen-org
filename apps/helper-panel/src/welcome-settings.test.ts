import { describe, expect, it } from 'vitest';
import { welcomeSettingsGroups, welcomeSettingCopy, welcomeStepOptions, changeWelcomeStep } from './welcome-settings';

describe('clear Welcome settings', () => {
  it('keeps every setting once in a task-based group', () => {
    const keys = welcomeSettingsGroups('en').flatMap(group => group.keys);
    expect(keys).toEqual(['channel','message','guideEnabled','steps','rulesChannel','introductionsChannel','channelsChannel','sendDm','dmMessage','autoRole','delaySeconds','templateId','farewellChannel','farewellMessage']);
    expect(new Set(keys).size).toBe(14);
    expect(welcomeSettingsGroups('pt')).toHaveLength(5);
    expect(welcomeSettingsGroups('fr')).toEqual(welcomeSettingsGroups('en'));
  });
  it('changes presentation, never API keys, limits or source fields', () => {
    for (const locale of ['en','pt']) for (const key of welcomeSettingsGroups(locale).flatMap(group => group.keys)) {
      const field = {key,label:'Original',help:'Original help',kind:'text',maxLength:2000};
      const copy = welcomeSettingCopy(field,locale);
      expect(copy.label).not.toBe('Original');
      expect(copy.key).toBe(key);
      expect(copy.maxLength).toBe(2000);
      expect(field.label).toBe('Original');
    }
    const unknown = {key:'future',label:'Future',kind:'text'};
    expect(welcomeSettingCopy(unknown,'en')).toEqual(unknown);
    expect(welcomeSettingCopy({key:'rulesChannel',label:'Rules'},'en').emptyLabel).toBe('Hide this link');
  });
  it('uses friendly step labels while retaining the four stored values', () => {
    expect(welcomeStepOptions('en').map(option => option.value)).toEqual(['rules','introductions','channels','help']);
    expect(welcomeStepOptions('pt')[0].label).toBe('Regras');
    expect(welcomeStepOptions('fr')).toEqual(welcomeStepOptions('en'));
  });
  it('preserves selection order, unknown values, and at least one selected step', () => {
    const original = ['rules','introductions','channels'];
    expect(changeWelcomeStep(original,'introductions',false)).toEqual(['rules','channels']);
    expect(changeWelcomeStep(original,'help',true)).toEqual([...original,'help']);
    expect(changeWelcomeStep(original,'rules',true)).toEqual(original);
    expect(changeWelcomeStep(['rules'],'rules',false)).toEqual(['rules']);
    expect(changeWelcomeStep(['future','rules'],'rules',false)).toEqual(['future']);
    expect(changeWelcomeStep(original,'missing',false)).toEqual(original);
    expect(original).toEqual(['rules','introductions','channels']);
  });
});
