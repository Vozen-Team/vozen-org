import { useState, type ReactNode } from 'react';
import type { FeatureConfig, GuildContext } from './api';
import { addLevelReward, levelRewardEntries, LEVEL_SETTING_KEYS } from './levels-settings';
import './levels-settings.css';

export function LevelsSettings({ config, keys, context, locale, renderField, onChange, customization, premium }: {
  config: FeatureConfig; keys: string[]; context: GuildContext | null; locale: string;
  renderField: (key: string) => ReactNode; onChange: (key: string, value: unknown) => void;
  customization: ReactNode; premium: boolean;
}) {
  const pt = locale === 'pt';
  const rewards = levelRewardEntries(config.levelRoles);
  const unknown = keys.filter(key => !LEVEL_SETTING_KEYS.includes(key));
  const excluded = Array.isArray(config.ignoredChannels) ? config.ignoredChannels.length : 0;
  return <>
    <section className="config-section card levels-settings" aria-label={pt ? 'Configurar níveis e XP' : 'Levels and XP setup'}>
      <section className="levels-settings__group" aria-labelledby="levels-messages">
        <h3 id="levels-messages">{pt ? 'Ganhar XP com mensagens' : 'Earn XP by chatting'}</h3>
        <p>{pt ? 'Cada mensagem elegível dá um valor de XP entre o mínimo e o máximo. Cada 100 XP correspondem a um nível.' : 'Each eligible message earns an amount between the minimum and maximum. Every 100 XP adds one level.'}</p>
        <div className="field-grid">{renderField('xpMin')}{renderField('xpMax')}</div>
        <div className="levels-settings__wait">{renderField('cooldownSeconds')}</div>
      </section>
      {keys.some(key => ['announceChannel', 'announceTemplate'].includes(key)) && <section className="levels-settings__group" aria-labelledby="levels-announcements">
        <h3 id="levels-announcements">{pt ? 'Quando um membro sobe de nível' : 'When a member levels up'}</h3>
        <p>{pt ? 'Escolhe onde aparece o aviso e o que diz.' : 'Choose where the announcement appears and what it says.'}</p>
        {renderField('announceChannel')}{renderField('announceTemplate')}
      </section>}
      <section className="levels-settings__group levels-settings__card-info" aria-labelledby="levels-card">
        <h3 id="levels-card">{pt ? 'Cartão de subida de nível' : 'Level-up banners'}</h3>
        <p>{pt ? 'Cada mensagem de subida de nível inclui sempre um cartão. O cartão padrão é gratuito; as imagens de fundo e a personalização são exclusivas do Premium.' : 'Every level-up message includes a card. The default card is free; background images and customization require Premium.'}</p>
        {!premium && customization}
      </section>
      {keys.includes('voiceXpEnabled') && <details className="levels-settings__disclosure">
        <summary><span>{pt ? 'XP em canais de voz' : 'Voice channel XP'}</span><small>{config.voiceXpEnabled ? (pt ? 'Ativado' : 'On') : (pt ? 'Desativado' : 'Off')}</small></summary>
        <p>{pt ? 'Opcional. Dá XP também pela participação em voz.' : 'Optional. Also award XP for time spent in voice channels.'}</p>
        {renderField('voiceXpEnabled')}
        {config.voiceXpEnabled === true && renderField('voiceXpPerMinute')}
      </details>}
      {keys.includes('ignoredChannels') && <details className="levels-settings__disclosure">
        <summary><span>{pt ? 'Canais sem XP' : 'Channels without XP'}</span><small>{excluded ? `${excluded} ${pt ? 'selecionados' : 'selected'}` : (pt ? 'Nenhum' : 'None')}</small></summary>
        {renderField('ignoredChannels')}
      </details>}
      {keys.includes('levelRoles') && <details className="levels-settings__disclosure">
        <summary><span>{pt ? 'Recompensas por nível' : 'Level rewards'}</span><small>{rewards.length ? `${rewards.length} ${pt ? 'configuradas' : 'configured'}` : (pt ? 'Opcional' : 'Optional')}</small></summary>
        <p>{pt ? 'Atribui um cargo quando o membro atinge um nível.' : 'Give a member a role when they reach a level.'}</p>
        <LevelRewards value={config.levelRoles} context={context} pt={pt} onChange={value => onChange('levelRoles', value)} />
        {rewards.length > 0 && renderField('stackRoles')}
      </details>}
      {unknown.length > 0 && <details className="levels-settings__disclosure"><summary>{pt ? 'Outras definições' : 'Other settings'}</summary>{unknown.map(renderField)}</details>}
    </section>
    {premium && <details className="levels-customization">
      <summary><span>{pt ? 'Personalizar o cartão' : 'Customize the card'}</span><small>Premium</small></summary>
      <p className="levels-preview-note">{pt ? 'Pré-visualização com valores de exemplo. Não representa o XP real do servidor.' : 'Preview with sample values. This is not your server’s real XP.'}</p>
      {customization}
    </details>}
  </>;
}

function LevelRewards({ value, context, pt, onChange }: {value: unknown; context: GuildContext | null; pt: boolean; onChange: (value: string[]) => void}) {
  const [level, setLevel] = useState('5');
  const [role, setRole] = useState('');
  const rewards = levelRewardEntries(value);
  const available = context?.capabilities.roleSelectors === true;
  const roles = (context?.roles ?? []).filter(option => option.id !== context?.guildId && !option.managed);
  const selected = roles.find(option => option.id === role);
  const next = addLevelReward(value, Number(level), role);
  const canAdd = available && selected && selected.manageable !== false && next && next.length > rewards.length;
  return <div className="levels-rewards">
    {rewards.length > 0 ? <ul>{rewards.map((entry, index) => {
      const [rewardLevel, roleId] = entry.split('=');
      const name = context?.roles.find(option => option.id === roleId?.trim())?.name;
      const label = roleId ? `${pt ? 'Nível' : 'Level'} ${rewardLevel} · ${name ? `@${name}` : `${pt ? 'Cargo guardado' : 'Saved role'} (${roleId})`}` : entry;
      return <li key={`${entry}:${index}`}><span>{label}</span><button type="button" className="ghost" aria-label={`${pt ? 'Remover' : 'Remove'} ${label}`} onClick={() => onChange(rewards.filter((_, at) => at !== index))}>{pt ? 'Remover' : 'Remove'}</button></li>;
    })}</ul> : <p>{pt ? 'Ainda não há recompensas. Podes adicionar uma abaixo.' : 'No rewards yet. Add one below if you want to use them.'}</p>}
    <div className="levels-rewards__add">
      <label className="field"><span><b>{pt ? 'Ao atingir o nível' : 'At level'}</b></span><input type="number" min={1} max={4294967295} value={level} onChange={event => setLevel(event.target.value)} /></label>
      <label className="field"><span><b>{pt ? 'Atribuir o cargo' : 'Give this role'}</b></span><select value={role} disabled={!available} onChange={event => setRole(event.target.value)}>
        <option value="">{pt ? 'Escolher cargo' : 'Choose a role'}</option>
        {roles.map(option => <option key={option.id} value={option.id} disabled={option.manageable === false}>{option.name}{option.manageable === false ? (pt ? ' · indisponível' : ' · unavailable') : ''}</option>)}
      </select></label>
      <button type="button" className="secondary" disabled={!canAdd} onClick={() => {if (canAdd && next) {onChange(next); setRole('');}}}>{pt ? 'Adicionar recompensa' : 'Add reward'}</button>
    </div>
    {!available && <p role="status">{pt ? 'Recarrega os cargos do Discord para adicionar uma recompensa.' : 'Reload Discord roles before adding a reward.'}</p>}
    {rewards.length >= 50 && <p role="status">{pt ? 'Limite de 50 recompensas atingido.' : 'The limit of 50 rewards has been reached.'}</p>}
  </div>;
}
