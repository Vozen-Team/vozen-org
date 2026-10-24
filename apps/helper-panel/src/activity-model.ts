import type { ActivityFeedRecord } from './api';
import { activityText as t, type ActivityKey } from './activity-i18n';

export function validActivityFeed(value: unknown, guildId: string): value is {guildId:string;events:ActivityFeedRecord[];nextCursor:string|null} {
  if (!value || typeof value !== 'object') return false;
  const data=value as Record<string,unknown>;
  const nullableString=(value:unknown)=>value==null || typeof value==='string';
  return data.guildId===guildId && (data.nextCursor===null || typeof data.nextCursor==='string') && Array.isArray(data.events) && data.events.every(row=>
    row && typeof row==='object' && typeof row.id==='string' && ['activity','case','audit'].includes(row.source) && typeof row.kind==='string' && typeof row.user_id==='string' && nullableString(row.actor_id) && nullableString(row.memberName) && nullableString(row.actorName) && typeof row.detail==='string' && typeof row.outcome==='string' && Number.isFinite(row.created_at) && typeof row.helper==='boolean');
}

export function activityMetadata(row: ActivityFeedRecord): Record<string, unknown> {
  try { const value: unknown = JSON.parse(row.detail); return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string,unknown> : {}; } catch { return {}; }
}

export function activityAction(row: ActivityFeedRecord): string {
  const kind = row.kind.replaceAll('-', '_');
  const labels: Record<string,ActivityKey> = {member_join:'Joined',join:'Joined',member_leave:'Left',leave:'Left',member_ban:'Ban',ban:'Ban',tempban:'Ban',softban:'Ban',member_unban:'Unban',unban:'Unban',timeout:'Timeout',mute:'Timeout',member_timeout:'Timeout',untimeout:'Timeout removed',unmute:'Timeout removed',member_timeout_end:'Timeout removed',warn:'Warning',kick:'Kick',helper_message:'Message',helper_message_edit:'Message',helper_action:'Helper action'};
  if (kind === 'helper_command') { const command = activityMetadata(row).command; return `${t('Command')}${typeof command === 'string' ? ` /${command}` : ''}`; }
  if (kind === 'anti_spam') return 'Anti-spam';
  if (kind === 'anti_scam') return 'Anti-scam';
  if (kind.startsWith('anti_')) return t('Protection');
  return labels[kind] ? t(labels[kind]) : t(row.source === 'audit' ? 'Settings' : row.helper ? 'Helper action' : 'Event');
}

export function activityStatus(row: ActivityFeedRecord): {text:string;tone:string} {
  const raw = row.outcome.toLowerCase();
  if (raw.includes('shadow') || raw.includes('simulat')) return {text:t('Simulation'),tone:'muted'};
  if (['failed','failure','error','errored'].some(value=>raw.includes(value))) return {text:t('Failed'),tone:'danger'};
  if (['blocked','denied','rejected','forbidden'].some(value=>raw.includes(value))) return {text:t('Blocked'),tone:'danger'};
  if (raw.includes('skip') || raw.includes('ignored')) return {text:t('Skipped'),tone:'muted'};
  if (raw==='detected') return {text:t('Detected'),tone:'warning'};
  const labels: Record<string,ActivityKey> = {sent:'Sent',processed:'Processed',updated:'Updated',success:'Done',succeeded:'Done',applied:'Done',allowed:'Done'};
  return {text:t(labels[raw] || 'Recorded'),tone:labels[raw]?'success':'muted'};
}

export function activityName(id: string | null | undefined, name?: string | null): string {
  if (name?.trim()) return name;
  if (['auto','system','helper','bot','anti-spam','anti-scam','anti_spam','anti_scam'].includes(id || '')) return 'Helper';
  if (id === 'discord-audit-log') return 'Discord';
  return t('Name unavailable');
}

export function mergeActivity(previous: ActivityFeedRecord[], incoming: ActivityFeedRecord[]) {
  const rows = new Map(previous.map(row=>[row.id,row]));
  for (const row of incoming) rows.set(row.id,row);
  return [...rows.values()].sort((a,b)=>b.created_at-a.created_at || ({activity:0,case:1,audit:2}[b.source]-{activity:0,case:1,audit:2}[a.source]) || b.id.localeCompare(a.id,'en',{numeric:true}));
}
