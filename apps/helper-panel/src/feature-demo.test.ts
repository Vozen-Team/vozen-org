import { describe, expect, it } from 'vitest';
import { featureDemo } from './feature-demo';

describe('feature-specific demonstrations', () => {
  it('shows join-to-create, automatic moving and last-member cleanup for temporary rooms', () => {
    const demo = featureDemo('utility.temp_channels', 'en');
    expect(demo?.asset).toBe('temp-channels-en');
    expect(demo?.example).toMatch(/illustrative/i);
    expect(demo?.example).toMatch(/no Discord channels are created or deleted/i);
    for (const phrase of ['/temp-channel', 'Creator Channel', 'moves you automatically', 'last member leaves', 'Creator Channel stays']) expect(demo?.steps.join(' ')).toContain(phrase);
    expect(featureDemo('utility.temp_channels', 'pt')?.asset).toBe('temp-channels-pt');
    expect(featureDemo('utility.temp_channels', 'fr')?.asset).toBe('temp-channels-en');
  });
  it('explains economy commands and cooldowns without changing balances', () => {
    const demo = featureDemo('community.economy', 'en');
    expect(demo?.example).toMatch(/does not change balances/);
    for (const command of ['/daily', '/work', '/balance', '/economy-top', '24 hours', 'cooldown']) expect(demo?.steps.join(' ')).toContain(command);
    expect(featureDemo('community.economy', 'pt')?.asset).toBe('economy-pt');
    expect(featureDemo('community.economy', 'fr')?.asset).toBe('economy-en');
  });
  it('explains activity medals and existing XP without obsolete milestone controls', () => {
    const demo = featureDemo('community.achievements', 'en');
    expect(demo?.asset).toBe('achievements-en');
    expect(demo?.example).toMatch(/sample data/i);
    expect(demo?.example).toMatch(/no XP.*roles/i);
    expect(demo?.steps).toHaveLength(3);
    expect(demo?.steps.join(' ')).toMatch(/messages, voice, reactions, threads, boosts and XP/);
    expect(demo?.steps.join(' ')).toMatch(/do not award extra XP/);
    expect(demo?.steps.join(' ')).not.toMatch(/set the three|optional.*role/i);
    expect(demo?.steps.join(' ')).toMatch(/\/achievements/);
    expect(featureDemo('community.achievements', 'pt')?.asset).toBe('achievements-pt');
    expect(featureDemo('community.achievements', 'fr')?.asset).toBe('achievements-en');
  });
  it('explains leaderboard order, visibility and opt-out with sample data', () => {
    const demo = featureDemo('community.leaderboard', 'en');
    expect(demo?.asset).toBe('leaderboard-en');
    expect(demo?.example).toMatch(/sample data/i);
    expect(demo?.example).toMatch(/no messages are sent/i);
    expect(demo?.steps).toHaveLength(3);
    expect(demo?.steps.join(' ')).toMatch(/highest XP/i);
    expect(demo?.steps.join(' ')).toMatch(/public.*private/i);
    expect(demo?.steps.join(' ')).toMatch(/\/leaderboard-privacy opt_out: true/);
    expect(featureDemo('community.leaderboard', 'pt')?.asset).toBe('leaderboard-pt');
    expect(featureDemo('community.leaderboard', 'pt')?.steps.join(' ')).toMatch(/não apaga o XP/);
    expect(featureDemo('community.leaderboard', 'fr')?.asset).toBe('leaderboard-en');
  });
  it('explains levels, XP cooldowns and rank using sample data without awarding real XP', () => {
    const demo = featureDemo('community.levels', 'en');
    expect(demo?.asset).toBe('levels-en');
    expect(demo?.example).toMatch(/sample data/i);
    expect(demo?.example).toMatch(/accelerated time/i);
    expect(demo?.example).toMatch(/no XP is awarded/i);
    expect(demo?.steps).toHaveLength(3);
    expect(demo?.steps.join(' ')).toMatch(/cooldown/i);
    expect(demo?.steps.join(' ')).toMatch(/excluded channels/i);
    expect(demo?.steps.join(' ')).toMatch(/\/rank/);
    expect(demo?.steps.join(' ')).toMatch(/Role rewards are optional/);
    expect(demo?.steps.join(' ')).toMatch(/Voice XP is optional/);
    expect(featureDemo('community.levels', 'pt')?.asset).toBe('levels-pt');
    expect(featureDemo('community.levels', 'fr')?.asset).toBe('levels-en');
  });
  it('explains birthdays using day/month, configured timezone and optional removal without real messages', () => {
    const demo = featureDemo('community.birthdays', 'en');
    expect(demo?.asset).toBe('birthdays-en');
    expect(demo?.example).toMatch(/sample data/i);
    expect(demo?.example).toMatch(/no messages are sent/i);
    expect(demo?.steps).toHaveLength(3);
    expect(demo?.steps.join(' ')).toMatch(/\/birthday-set/);
    expect(demo?.steps.join(' ')).toMatch(/day and month/);
    expect(demo?.steps.join(' ')).toMatch(/time zone/);
    expect(demo?.steps.join(' ')).toMatch(/configured channel/);
    expect(demo?.steps.join(' ')).toMatch(/\/birthday-remove/);
    expect(featureDemo('community.birthdays', 'pt')?.asset).toBe('birthdays-pt');
    expect(featureDemo('community.birthdays', 'pt')?.steps.join(' ')).toMatch(/fuso horário/);
    expect(featureDemo('community.birthdays', 'fr')?.asset).toBe('birthdays-en');
  });
  for (const [key, asset] of [['community.starboard', 'starboard'], ['community.suggestions', 'suggestions'], ['community.giveaways', 'giveaways'], ['support.tickets', 'tickets'], ['support.welcome', 'welcome'], ['management.polls', 'polls'], ['community.events', 'events']]) {
    for (const locale of ['en', 'pt']) {
      it(`selects the owned ${locale} animation and written steps for ${key}`, () => {
        const demo = featureDemo(key, locale);
        expect(demo?.asset).toBe(`${asset}-${locale}`);
        expect(demo?.title).toMatch(/animation|animação/);
        expect(demo?.example.length).toBeGreaterThan(20);
        expect(demo?.steps).toHaveLength(3);
      });
    }
  }
  it('does not misrepresent a Starboard video as a different feature', () => {
    expect(featureDemo('community.economy', 'en')?.asset).toBe('economy-en');
    expect(featureDemo('unknown', 'pt')).toBeNull();
  });
  it('explains ticket privacy and staff handling without claiming real server actions', () => {
    const demo = featureDemo('support.tickets', 'en');
    expect(demo?.example).toMatch(/sample data/i);
    expect(demo?.steps.join(' ')).toMatch(/Open ticket/);
    expect(demo?.steps.join(' ')).toMatch(/private channel/);
    expect(demo?.steps.join(' ')).toMatch(/Claim/);
    expect(demo?.steps.join(' ')).toMatch(/Close/);
    expect(featureDemo('support.tickets', 'fr')?.asset).toBe('tickets-en');
  });
  it('uses English media when a localized video is unavailable', () => {
    expect(featureDemo('community.suggestions', 'fr')?.asset).toBe('suggestions-en');
  });
  it('explains native events, registrations and optional reminders without real server actions', () => {
    const demo = featureDemo('community.events', 'en');
    expect(demo?.example).toMatch(/sample data/i);
    expect(demo?.example).toMatch(/accelerated time/i);
    expect(demo?.example).toMatch(/no events are created/i);
    expect(demo?.steps.join(' ')).toMatch(/\/event-create/);
    expect(demo?.steps.join(' ')).toMatch(/\/event-register/);
    expect(demo?.steps.join(' ')).toMatch(/\/event-checkin/);
    expect(demo?.steps.join(' ')).toMatch(/enabled.*announcement channel/i);
    expect(featureDemo('community.events', 'pt')?.steps.join(' ')).toMatch(/lotação/);
    expect(featureDemo('community.events', 'fr')?.asset).toBe('events-en');
  });
  it('explains poll creation, voting and automatic closing using sample data', () => {
    const demo = featureDemo('management.polls', 'en');
    expect(demo?.example).toMatch(/sample data/i);
    expect(demo?.example).toMatch(/accelerated time/i);
    expect(demo?.example).toMatch(/no polls are created/i);
    expect(demo?.steps.join(' ')).toMatch(/\/poll/);
    expect(demo?.steps.join(' ')).toMatch(/buttons/);
    expect(demo?.steps.join(' ')).toMatch(/duration ends/);
    expect(featureDemo('management.polls', 'fr')?.asset).toBe('polls-en');
  });
  it('explains optional Welcome actions without claiming they are enabled or sent', () => {
    const demo = featureDemo('support.welcome', 'en');
    expect(demo?.example).toMatch(/sample data/i);
    expect(demo?.example).toMatch(/optional/i);
    expect(demo?.example).toMatch(/no messages are sent/i);
    expect(demo?.steps.join(' ')).toMatch(/joins/);
    expect(demo?.steps.join(' ')).toMatch(/configured channel/);
    expect(demo?.steps.join(' ')).toMatch(/permissions/);
    expect(demo?.example).toMatch(/direct links/i);
    expect(demo?.steps.join(' ')).toMatch(/without a destination are hidden/);
    expect(featureDemo('support.welcome', 'fr')?.asset).toBe('welcome-en');
  });
});
