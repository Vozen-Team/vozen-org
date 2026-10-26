import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GuildContext } from './api';

const translation = vi.hoisted(() => ({ locale: 'en', sources: [] as string[] }));
vi.mock('./api', () => ({ api: {} }));
vi.mock('./i18n', () => {
  const helperText = (source: string, variables?: Record<string, string | number>) => {
    translation.sources.push(source);
    const text = translation.locale === 'en' ? source : `⟦${translation.locale}:${source}⟧`;
    return text.replace(/\{(\w+)\}/g, (placeholder, key: string) => String(variables?.[key] ?? placeholder));
  };
  return {
    helperLocale: () => translation.locale,
    helperText,
    helperT: (_key: string, source: string, variables?: Record<string, string | number>) => helperText(source, variables),
  };
});

import { AchievementSettings } from './achievement-settings';
import { BirthdayChannel } from './birthday-channel-setup';
import { featureDemo } from './feature-demo';
import { FeatureSimulation } from './feature-simulation';
import { LevelsSettings } from './levels-settings-panel';
import { PremiumBannerSwitch } from './premium-banner-switch';
import { ResourceMultiSelect } from './resource-multi-select';
import { StarboardChannel } from './starboard-channel-setup';
import { TicketPanelChannel } from './ticket-channel-setup';
import { WelcomeGuideSteps, welcomeSettingCopy, welcomeSettingsGroups } from './welcome-settings';
import gaps from './helper-components-source.json';
import componentCopy from './helper-components-copy.json';

const translations: Record<string, Partial<Record<string, string>>> = componentCopy;
const nonEnglishLocales = ['pt', 'fr', 'es', 'de', 'tr', 'ar', 'zh', 'ru', 'ko'];

afterEach(() => { translation.locale = 'en'; translation.sources = []; });

describe('component source translation delegation', () => {
  for (const locale of ['en', 'pt', 'fr', 'es', 'de', 'tr', 'ar', 'zh', 'ru', 'ko']) {
    it(`keeps media assets and API values while selecting ${locale} text`, () => {
      translation.locale = locale;
      const demo = featureDemo('community.birthdays', locale)!;
      expect(demo.asset).toBe(`birthdays-${locale === 'pt' ? 'pt' : 'en'}`);
      expect(demo.steps.join(' ')).toContain('/birthday-set');
      expect(demo.steps.join(' ')).toContain('/birthday-remove');
      if (locale === 'pt') expect(demo.title).toContain('Aniversários');
      else if (locale !== 'en') expect(demo.title).toBe(translations['How Birthdays work · looping animation'][locale]);
      const groups = welcomeSettingsGroups(locale);
      expect(groups.flatMap(group => group.keys)).toContain('dmMessage');
      const original = { key: 'rulesChannel', label: 'Original', maxLength: 80 };
      expect(welcomeSettingCopy(original, locale)).toMatchObject({ key: 'rulesChannel', maxLength: 80 });
      expect(original.label).toBe('Original');
      if (!['en', 'pt'].includes(locale)) expect(groups[0].title).toContain(`⟦${locale}:`);
    });
  }

  it('translates admin, levels, resource and Premium copy without looking up user data', () => {
    translation.locale = 'fr';
    const name = 'Features custom role';
    const context = {
      guildId: '111', roles: [{ id: '222', name }], channels: [],
      capabilities: { roleSelectors: true }, bot: { available: false },
    } as unknown as GuildContext;
    const html = renderToStaticMarkup(<>
      <BirthdayChannel context={null} onCreated={() => {}} />
      <StarboardChannel context={null} onCreated={() => {}} />
      <TicketPanelChannel context={null} onCreated={() => {}} />
      <TicketPanelChannel context={null} category onCreated={() => {}} />
      <ResourceMultiSelect label="Custom channel" options={[{ id: '222', label: name }]} value={['333']} onChange={() => {}} />
      <LevelsSettings config={{ levelRoles: ['5=222'] }} keys={['levelRoles']} context={context} locale="fr"
        renderField={() => null} onChange={() => {}} customization={null} premium={false} />
      <WelcomeGuideSteps value={['future_custom_step']} locale="fr" onChange={() => {}} />
      <PremiumBannerSwitch guildId="111" guildName="Features server" onActivated={async () => {}} />
    </>);
    for (const source of ['Create a birthday channel', 'Dedicated Starboard channel', 'Create a ticket panel channel',
      'Create a private ticket category', 'Unavailable resource', 'Level rewards', 'Saved option', 'Activate Premium on this server?']) {
      expect(translation.sources).toContain(source);
    }
    expect(html).toContain(name);
    expect(html).toContain('future_custom_step');
    for (const value of [name, 'Features server', 'future_custom_step', '333']) expect(translation.sources).not.toContain(value);
  });

  it('passes the full site locale to the simulation transcript', () => {
    translation.locale = 'ko';
    const html = renderToStaticMarkup(<FeatureSimulation draft={{ guildId: '111', key: 'community.birthdays',
      label: 'Custom feature name', config: {}, enabled: false }} onClose={() => {}} />);
    expect(html).toContain('생일 작동 방식');
    expect(html).toContain('birthdays-en.gif');
    expect(html).toContain('Custom feature name');
    expect(translation.sources).not.toContain('Custom feature name');
  });

  it('opens the clean collection route without a language query', () => {
    const html = renderToStaticMarkup(<AchievementSettings guildId="111" onTest={() => {}} />);
    expect(html).toContain('href="/panel/collection/?server=111"');
    expect(html).not.toContain('?lang=');
  });

  it('keeps untranslated sources unique and records fixed placeholders, never names', () => {
    expect(gaps.length).toBe(new Set(gaps).size);
    expect(gaps).toContain('#{channel} is ready and selected. Check automatic saving above. Enable Birthdays to send announcements.');
    expect(gaps).not.toContain('Features server');
    expect(gaps).not.toContain('birthdays-en');
  });

  it('provides every audited gap in all nine non-English locales with intact placeholders and commands', () => {
    for (const source of gaps) for (const locale of nonEnglishLocales) {
      const text = translations[source]?.[locale];
      expect(text, `${locale}: ${source}`).toBeTruthy();
      expect(text).not.toBe(source);
      expect(text).not.toContain('ZXQ');
      expect(text!.match(/\{\w+\}/g)?.sort() ?? []).toEqual(source.match(/\{\w+\}/g)?.sort() ?? []);
      for (const command of source.match(/\/[a-z][a-z_-]+(?: opt_out: true)?/g) ?? []) expect(text).toContain(command);
      for (const name of ['Helper', 'Discord', 'Starboard', 'Creator Channel', 'Premium', '@everyone', '#starboard']) {
        if (source.includes(name)) expect(text).toContain(name);
      }
    }
  });

  it('translates all 14 demo transcripts independently of the selected media language', () => {
    const keys = ['management.invite_tracker', 'utility.temp_channels', 'community.economy', 'community.achievements',
      'community.leaderboard', 'community.levels', 'community.birthdays', 'community.events', 'management.polls',
      'community.starboard', 'community.suggestions', 'community.giveaways', 'support.tickets', 'support.welcome'];
    for (const key of keys) {
      const english = featureDemo(key, 'en')!;
      for (const locale of nonEnglishLocales) {
        const demo = featureDemo(key, locale)!;
        expect(demo.title).toBe(translations[english.title][locale]);
        expect(demo.example).toBe(translations[english.example][locale]);
        expect(demo.steps).toEqual(english.steps.map(step => translations[step][locale]));
        expect(demo.asset).toBe(english.asset.replace(/-en$/, locale === 'pt' ? '-pt' : '-en'));
      }
    }
  });
});
