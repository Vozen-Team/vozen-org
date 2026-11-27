import { describe, expect, it } from 'vitest';
import { protectionProfileConfigs, roleStepLocked, stepDefaultsStatus, withDraftPatches } from './quick-setup';

const current = {
  antiSpam: { floodCount: 9, ignoredChannels: ['c-keep'], ignoredRoles: ['r-keep'], logChannel: 'old-log', customField: 'x' },
  antiRaid: { alertChannel: 'old-log', joinThreshold: 30 },
};

describe('Quick Setup protection profiles', () => {
  it('keeps exemptions and the current alert channel', () => {
    const { antispam, antiRaid } = protectionProfileConfigs('balanced', '', current);
    expect(antispam).toMatchObject({
      floodCount: 6, ignoredChannels: ['c-keep'], ignoredRoles: ['r-keep'], logChannel: 'old-log', customField: 'x',
    });
    expect(antiRaid).toMatchObject({ joinThreshold: 10, alertChannel: 'old-log' });
  });
  it('uses a chosen alert channel', () => {
    const { antispam, antiRaid } = protectionProfileConfigs('balanced', 'chosen', current);
    expect(antispam.logChannel).toBe('chosen');
    expect(antiRaid.alertChannel).toBe('chosen');
    expect(antispam.ignoredChannels).toEqual(['c-keep']);
  });
  it('falls back to the balanced profile', () => {
    for (const profile of ['toString', undefined]) {
      const { antispam, antiRaid } = protectionProfileConfigs(profile, '', current);
      expect(antispam.floodCount).toBe(6);
      expect(antiRaid.joinThreshold).toBe(10);
    }
  });
  it('keeps the profile values', () => {
    const empty = { antiSpam: {}, antiRaid: {} };
    expect(protectionProfileConfigs('monitor', '', empty)).toEqual({
      antispam: {
        floodCount: 8, windowSeconds: 10, duplicateLimit: 4, maxLinks: 8, deleteMessage: false,
        timeoutSeconds: 0, mentionLimit: 8, alertOnly: true, logChannel: '',
      },
      antiRaid: {
        joinThreshold: 12, windowSeconds: 20, incidentMinutes: 10, verification: 'high',
        pauseInvites: true, alertOnly: true, alertChannel: '',
      },
    });
    expect(protectionProfileConfigs('strict', '', empty)).toEqual({
      antispam: {
        floodCount: 5, windowSeconds: 10, duplicateLimit: 2, maxLinks: 3, deleteMessage: true,
        timeoutSeconds: 300, mentionLimit: 4, alertOnly: false, logChannel: '',
      },
      antiRaid: {
        joinThreshold: 8, windowSeconds: 20, incidentMinutes: 10, verification: 'high',
        pauseInvites: true, alertOnly: false, alertChannel: '',
      },
    });
  });
});

describe('Quick Setup form state', () => {
  it('keeps typed text when defaults arrive', () => {
    const base = { welcome: { channel: 'c1', message: 'Default' }, protection: { profile: 'balanced' } };
    const patches = { welcome: { message: 'Typed' } };
    expect(withDraftPatches(base, patches)).toEqual({
      welcome: { channel: 'c1', message: 'Typed' },
      protection: { profile: 'balanced' },
    });
    const arrived = { welcome: { channel: 'c2', message: 'Server default', mode: 'recommended' }, protection: { profile: 'strict' } };
    expect(withDraftPatches(arrived, patches)).toEqual({
      welcome: { channel: 'c2', message: 'Typed', mode: 'recommended' },
      protection: { profile: 'strict' },
    });
  });
  it('locks the roles step without Premium', () => {
    const rolePanels = { key: 'community.role_panels', premium_required: true, premium_unlocked: false };
    expect(roleStepLocked([rolePanels])).toBe(true);
    expect(roleStepLocked([{ ...rolePanels, premium_unlocked: true }])).toBe(false);
    expect(roleStepLocked([{ key: 'protection.antispam', premium_required: true, premium_unlocked: false }])).toBe(false);
    expect(roleStepLocked([{ ...rolePanels, premium_required: false }])).toBe(false);
  });
  it('blocks only the step whose reads failed', () => {
    for (const step of ['welcome', 'roles', 'moderation', 'protection'])
      expect(stepDefaultsStatus(step, { loading: true, failed: [] })).toBe('loading');
    const spam = { loading: false, failed: ['antiSpam'] };
    expect(stepDefaultsStatus('protection', spam)).toBe('error');
    for (const step of ['welcome', 'roles', 'moderation']) expect(stepDefaultsStatus(step, spam)).toBe('ready');
    const roles = { loading: false, failed: ['roles'] };
    expect(stepDefaultsStatus('roles', roles)).toBe('error');
    for (const step of ['welcome', 'moderation', 'protection']) expect(stepDefaultsStatus(step, roles)).toBe('ready');
  });
});
