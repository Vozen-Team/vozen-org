import type { Guild, Me } from './api';

export function readWorkspaceGuilds(result: unknown): Guild[] {
  const guilds = (result as { guilds?: unknown } | null)?.guilds;
  if (!Array.isArray(guilds) || !guilds.every(guild => guild && typeof guild.id === 'string'
      && typeof guild.name === 'string' && typeof guild.canManage === 'boolean')) {
    throw new Error('Invalid server list');
  }
  return guilds;
}

export function requireWorkspaceGuild(me: Me, guilds: Guild[]): void {
  if (!guilds.some(guild => guild.id === me.guildId && guild.canManage)) {
    throw new Error('Current server unavailable');
  }
}
