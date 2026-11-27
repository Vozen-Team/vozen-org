import type { Feature, FeatureConfig } from './api';

const PROTECTION_PROFILES: Record<string, { antispam: FeatureConfig; antiRaid: FeatureConfig }> = {
  monitor: {
    antispam: {
      floodCount: 8,
      windowSeconds: 10,
      duplicateLimit: 4,
      maxLinks: 8,
      deleteMessage: false,
      timeoutSeconds: 0,
      mentionLimit: 8,
      alertOnly: true,
    },
    antiRaid: {
      joinThreshold: 12,
      windowSeconds: 20,
      incidentMinutes: 10,
      verification: 'high',
      pauseInvites: true,
      alertOnly: true,
    },
  },
  balanced: {
    antispam: {
      floodCount: 6,
      windowSeconds: 10,
      duplicateLimit: 3,
      maxLinks: 5,
      deleteMessage: false,
      timeoutSeconds: 60,
      mentionLimit: 5,
      alertOnly: false,
    },
    antiRaid: {
      joinThreshold: 10,
      windowSeconds: 20,
      incidentMinutes: 10,
      verification: 'high',
      pauseInvites: true,
      alertOnly: true,
    },
  },
  strict: {
    antispam: {
      floodCount: 5,
      windowSeconds: 10,
      duplicateLimit: 2,
      maxLinks: 3,
      deleteMessage: true,
      timeoutSeconds: 300,
      mentionLimit: 4,
      alertOnly: false,
    },
    antiRaid: {
      joinThreshold: 8,
      windowSeconds: 20,
      incidentMinutes: 10,
      verification: 'high',
      pauseInvites: true,
      alertOnly: false,
    },
  },
};

// Profiles change thresholds only; exemptions and an existing alert channel are kept.
export function protectionProfileConfigs(
  profile: unknown,
  logChannel: unknown,
  current: { antiSpam: FeatureConfig; antiRaid: FeatureConfig },
): { antispam: FeatureConfig; antiRaid: FeatureConfig } {
  const selected =
    typeof profile === 'string' && Object.hasOwn(PROTECTION_PROFILES, profile)
      ? PROTECTION_PROFILES[profile]
      : PROTECTION_PROFILES.balanced;
  const channel = typeof logChannel === 'string' ? logChannel.trim() : '';
  return {
    antispam: {
      ...current.antiSpam,
      ...selected.antispam,
      logChannel: channel || String(current.antiSpam.logChannel ?? ''),
    },
    antiRaid: {
      ...current.antiRaid,
      ...selected.antiRaid,
      alertChannel: channel || String(current.antiRaid.alertChannel ?? ''),
    },
  };
}

export function withDraftPatches<K extends string>(
  base: Record<K, FeatureConfig>,
  patches: Partial<Record<K, FeatureConfig>>,
): Record<K, FeatureConfig> {
  const result = {} as Record<K, FeatureConfig>;
  for (const key of Object.keys(base) as K[]) result[key] = { ...base[key], ...(patches[key] ?? {}) };
  return result;
}

export function roleStepLocked(
  features: ReadonlyArray<Pick<Feature, 'key' | 'premium_required' | 'premium_unlocked'>>,
): boolean {
  const feature = features.find((item) => item.key === 'community.role_panels');
  return Boolean(feature?.premium_required && !feature.premium_unlocked);
}

// A failed read only blocks the step that needs it.
export function stepDefaultsStatus(
  step: string,
  load: { loading: boolean; failed: readonly string[] },
): 'loading' | 'ready' | 'error' {
  if (load.loading) return 'loading';
  const needs = step === 'protection' ? ['antiSpam', 'antiRaid'] : [step];
  return needs.some((name) => load.failed.includes(name)) ? 'error' : 'ready';
}
