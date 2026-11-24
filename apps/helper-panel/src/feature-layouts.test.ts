import { describe, expect, it } from 'vitest';
import { SUPPORTED_LOCALES } from './i18n';
import { featureDemoScript, featureLayout, featureLayoutKeys } from './feature-layouts';

const sources = Object.values(import.meta.glob<{
  key: string; copy: Record<string, Record<string, string>>;
  tabs: { title: string; intro?: string; commands?: [string, string][]; groups: { title: string; hint?: string; keys: string[] }[] }[];
  fields?: Record<string, { label?: string; help?: string; options?: [string, string][] }>;
  demo: { stages: { label: string; messages: { text?: string; note?: string; card?: { title?: string; body?: string; footer?: string; fields?: [string, string][]; buttons?: string[] } }[] }[] };
}>('./feature-layouts/*.json', { eager: true, import: 'default' }));

function referencedIds(source: (typeof sources)[number]): string[] {
  const ids = source.tabs.flatMap(tab => [tab.title, tab.intro, ...(tab.commands ?? []).map(([, text]) => text),
    ...tab.groups.flatMap(group => [group.title, group.hint])]);
  for (const field of Object.values(source.fields ?? {}))
    ids.push(field.label, field.help, ...(field.options ?? []).map(([, label]) => label));
  for (const stage of source.demo.stages) {
    ids.push(stage.label);
    for (const message of stage.messages) ids.push(message.text, message.note, message.card?.body, message.card?.footer,
      ...(message.card?.buttons ?? []), ...(message.card?.fields ?? []).map(([name]) => name));
  }
  return [...ids.filter((id): id is string => Boolean(id)), 'safety'];
}

describe('feature layouts', () => {
  it('registers each feature once', () => {
    expect(new Set(featureLayoutKeys()).size).toBe(sources.length);
  });

  for (const source of sources) describe(source.key, () => {
    it('translates every copy id in all ten locales', () => {
      const english = Object.keys(source.copy.en);
      for (const locale of SUPPORTED_LOCALES) {
        expect(Object.keys(source.copy[locale] ?? {}).sort(), locale).toEqual([...english].sort());
        for (const value of Object.values(source.copy[locale])) expect(value.trim(), locale).not.toBe('');
      }
    });

    it('writes Chinese in Traditional script like the rest of the panel', () => {
      const simplified = /[们这个设说体会应过进还开发选择频检点击编辑权务认视么时间对让实为门关见从与样讯网络户账钮态类组规则确统计复报预默称]/;
      for (const [id, value] of Object.entries(source.copy.zh)) expect(simplified.test(value), id).toBe(false);
    });

    it('defines every referenced copy id', () => {
      const missing = referencedIds(source).filter(id => !(id in source.copy.en) && !/^[#/🎉🔒@]|^\d/.test(id) && !/^[A-Z][a-z]+$/.test(id));
      expect(missing).toEqual([]);
    });

    it('places each field once and resolves a demo', () => {
      const keys = source.tabs.flatMap(tab => tab.groups.flatMap(group => group.keys));
      expect(new Set(keys).size).toBe(keys.length);
      for (const locale of SUPPORTED_LOCALES) {
        expect(featureLayout(source.key, locale)?.tabs.length).toBe(source.tabs.length);
        expect(featureDemoScript(source.key, locale)?.stages.length).toBeGreaterThan(1);
      }
    });
  });
});
