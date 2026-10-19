// Presentation helpers only. The API keeps its existing configuration format.
export const LEVEL_SETTING_KEYS = ['xpMin', 'xpMax', 'cooldownSeconds', 'announceChannel', 'announceTemplate', 'voiceXpEnabled', 'voiceXpPerMinute', 'ignoredChannels', 'levelRoles', 'stackRoles'];

export function levelRewardEntries(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === 'string');
  if (typeof value === 'string') return value.split(',').map(entry => entry.trim()).filter(Boolean);
  return [];
}

export function addLevelReward(value: unknown, level: number, role: string): string[] | null {
  if (!Number.isInteger(level) || level < 1 || level > 4294967295 || !/^[1-9]\d{0,19}$/.test(role) || BigInt(role) > 18446744073709551615n) return null;
  const entries = levelRewardEntries(value);
  const reward = `${level}=${role}`;
  if (entries.includes(reward)) return entries;
  return entries.length < 50 ? [...entries, reward] : null;
}

export function levelSettingCopy(key: string, locale: string): {label?: string; help?: string; emptyLabel?: string} {
  const pt = locale === 'pt';
  const copy: Record<string, [string, string, string?]> = pt ? {
    xpMin: ['XP mínimo por mensagem', ''],
    xpMax: ['XP máximo por mensagem', ''],
    cooldownSeconds: ['Tempo entre ganhos de XP (segundos)', 'Durante este intervalo, as mensagens seguintes não dão XP.'],
    announceChannel: ['Canal dos avisos', 'Deixa vazio para anunciar no canal onde o membro ganhou XP.', 'Mesmo canal da mensagem'],
    announceTemplate: ['Mensagem de subida de nível', 'Usa {member} para mencionar o membro e {level} para o novo nível.'],
    voiceXpEnabled: ['Dar XP em canais de voz', ''],
    voiceXpPerMinute: ['XP por minuto em voz', ''],
    ignoredChannels: ['Canais sem XP', 'As mensagens nestes canais não contam para o nível.'],
    stackRoles: ['Manter os cargos dos níveis anteriores', 'Se desligares, o Helper remove as outras recompensas de nível ao atribuir uma nova.'],
  } : {
    xpMin: ['XP minimum by message', ''],
    xpMax: ['XP maximum by message', ''],
    cooldownSeconds: ['Time between XP gains (seconds)', 'Messages sent during this wait do not earn more XP.'],
    announceChannel: ['Announcement channel', 'Leave empty to announce in the channel where the member earned XP.', 'Same channel as the message'],
    announceTemplate: ['Level-up message', 'Use {member} to mention the member and {level} for the new level.'],
    voiceXpEnabled: ['Grant XP in voice channels', ''],
    voiceXpPerMinute: ['XP per voice minute', ''],
    ignoredChannels: ['Channels without XP', 'Messages in these channels do not count towards a level.'],
    stackRoles: ['Keep rewards from earlier levels', 'When off, Helper removes the other level rewards when assigning a new one.'],
  };
  const value = copy[key];
  return value ? {label: value[0], help: value[1], ...(value[2] ? {emptyLabel: value[2]} : {})} : {};
}
