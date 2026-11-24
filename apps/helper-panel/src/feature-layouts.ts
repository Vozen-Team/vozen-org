import type { SupportedLocale } from './i18n';

// Each file in ./feature-layouts describes one Helper feature page: how its
// settings are grouped into tabs, local field copy and the scripted chat
// demonstration. Strings are copy ids resolved per locale; unknown ids are
// shown literally (channel names, commands, sample members).
type Copy = Record<string, string>;
type LayoutSource = {
  key: string;
  tabs: { title: string; intro?: string; commands?: [string, string][]; slot?: string;
    groups: { title: string; hint?: string; keys: string[] }[] }[];
  fields?: Record<string, { label?: string; help?: string; options?: [string, string][] }>;
  demo: { stages: DemoStageSource[] };
  copy: Partial<Record<SupportedLocale, Copy>> & { en: Copy };
};
type DemoMessageSource = { author?: string; bot?: boolean; text?: string; command?: string; note?: string;
  card?: { title?: string; body?: string; fields?: [string, string][]; buttons?: string[]; footer?: string; tone?: 'info' | 'success' | 'warning' } };
type DemoStageSource = { label: string; channel: string; messages: DemoMessageSource[] };

export type FeatureLayout = {
  tabs: { title: string; intro?: string; commands?: [string, string][]; slot?: string;
    groups: { title: string; hint?: string; keys: string[] }[] }[];
};
export type DemoMessage = DemoMessageSource;
export type DemoStage = DemoStageSource;
export type FeatureDemoScript = { stages: DemoStage[]; safety: string };

const sources = new Map<string, LayoutSource>(Object.values(
  import.meta.glob<LayoutSource>('./feature-layouts/*.json', { eager: true, import: 'default' }),
).map(source => [source.key, source]));

export function featureLayoutKeys(): string[] {
  return [...sources.keys()];
}

function resolver(source: LayoutSource, locale: string) {
  const copy = source.copy[locale as SupportedLocale] ?? source.copy.en;
  return (id: string | undefined) => id === undefined ? undefined : copy[id] ?? source.copy.en[id] ?? id;
}

export function featureLayout(key: string, locale: string): FeatureLayout | null {
  const source = sources.get(key);
  if (!source) return null;
  const text = resolver(source, locale);
  return { tabs: source.tabs.map(tab => ({
    title: text(tab.title)!,
    intro: text(tab.intro),
    slot: tab.slot,
    commands: tab.commands?.map(([command, description]) => [command, text(description)!] as [string, string]),
    groups: tab.groups.map(group => ({ title: text(group.title)!, hint: text(group.hint), keys: group.keys })),
  })) };
}

export function featureFieldCopy(key: string, locale: string, field: string): { label?: string; help?: string; options?: [string, string][] } {
  const source = sources.get(key);
  const entry = source?.fields?.[field];
  if (!source || !entry) return {};
  const text = resolver(source, locale);
  return {
    ...(entry.label ? { label: text(entry.label) } : {}),
    ...(entry.help ? { help: text(entry.help) } : {}),
    ...(entry.options ? { options: entry.options.map(([value, label]) => [value, text(label)!] as [string, string]) } : {}),
  };
}

export function featureDemoScript(key: string, locale: string): FeatureDemoScript | null {
  const source = sources.get(key);
  if (!source) return null;
  const text = resolver(source, locale);
  const message = (item: DemoMessageSource): DemoMessage => ({
    ...item,
    text: text(item.text),
    note: text(item.note),
    card: item.card && {
      ...item.card,
      title: text(item.card.title),
      body: text(item.card.body),
      footer: text(item.card.footer),
      fields: item.card.fields?.map(([name, value]) => [text(name)!, text(value)!] as [string, string]),
      buttons: item.card.buttons?.map(button => text(button)!),
    },
  });
  return {
    stages: source.demo.stages.map(stage => ({ label: text(stage.label)!, channel: text(stage.channel)!, messages: stage.messages.map(message) })),
    safety: text('safety')!,
  };
}
