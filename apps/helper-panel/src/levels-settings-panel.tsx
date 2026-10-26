import { helperText } from './i18n';
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
  return <>
    <section className="config-section card levels-settings" aria-label={pt ? 'Configurar níveis e XP' : helperText('Levels and XP setup')}>
      <section className="levels-settings__group" aria-labelledby="levels-messages">
        <h3 id="levels-messages">{pt ? 'Ganhar XP com mensagens' : helperText('Earn XP by chatting')}</h3>
        <p>{pt ? 'Cada mensagem elegível dá um valor de XP entre o mínimo e o máximo. Cada 100 XP correspondem a um nível.' : helperText('Each eligible message earns an amount between the minimum and maximum. Every 100 XP adds one level.')}</p>
        <div className="field-grid">{renderField('xpMin')}{renderField('xpMax')}</div>
        <div className="levels-settings__wait">{renderField('cooldownSeconds')}</div>
      </section>
      {keys.some(key => ['announceChannel', 'announceTemplate'].includes(key)) && <section className="levels-settings__group" aria-labelledby="levels-announcements">
        <h3 id="levels-announcements">{pt ? 'Quando um membro sobe de nível' : helperText('When a member levels up')}</h3>
        <p>{pt ? 'Escolhe onde aparece o aviso e o que diz.' : helperText('Choose where the announcement appears and what it says.')}</p>
        {renderField('announceChannel')}{renderField('announceTemplate')}
      </section>}
      <section className="levels-settings__group levels-settings__card-info" aria-labelledby="levels-card">
        <h3 id="levels-card">{pt ? 'Cartão de subida de nível' : helperText('Level-up banners')}</h3>
        <p>{pt ? 'Cada mensagem de subida de nível inclui sempre um cartão. O cartão padrão é gratuito; as imagens de fundo e a personalização são exclusivas do Premium.' : helperText('Every level-up message includes a card. The default card is free; background images and customization require Premium.')}</p>
        {!premium && customization}
      </section>
      {keys.includes('voiceXpEnabled') && <section className="levels-settings__group" aria-labelledby="levels-voice">
        <h3 id="levels-voice">{pt ? 'XP em canais de voz' : helperText('Voice channel XP')}</h3>
        <p>{pt ? 'Opcional. Dá XP também pela participação em voz.' : helperText('Optional. Also award XP for time spent in voice channels.')}</p>
        {renderField('voiceXpEnabled')}
        {config.voiceXpEnabled === true && renderField('voiceXpPerMinute')}
      </section>}
      {keys.includes('ignoredChannels') && <section className="levels-settings__group" aria-label={pt ? 'Canais sem XP' : helperText('Channels without XP')}>
        {renderField('ignoredChannels')}
      </section>}
      {keys.includes('levelRoles') && <section className="levels-settings__group" aria-labelledby="levels-rewards">
        <h3 id="levels-rewards">{pt ? 'Recompensas por nível' : helperText('Level rewards')}</h3>
        <p>{pt ? 'Atribui um cargo quando o membro atinge um nível.' : helperText('Give a member a role when they reach a level.')}</p>
        <LevelRewards value={config.levelRoles} context={context} pt={pt} onChange={value => onChange('levelRoles', value)} />
        {rewards.length > 0 && renderField('stackRoles')}
      </section>}
      {unknown.length > 0 && <details className="levels-settings__disclosure"><summary>{pt ? 'Outras definições' : helperText('Other settings')}</summary>{unknown.map(renderField)}</details>}
    </section>
    {premium && <details className="levels-customization">
      <summary><span>{pt ? 'Personalizar o cartão' : helperText('Customize the card')}</span><small>Premium</small></summary>
      <p className="levels-preview-note">{pt ? 'Pré-visualização com valores de exemplo. Não representa o XP real do servidor.' : helperText('Preview with sample values. This is not your server’s real XP.')}</p>
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
      const label = roleId ? `${pt ? 'Nível' : helperText('Level')} ${rewardLevel} · ${name ? `@${name}` : `${pt ? 'Cargo guardado' : helperText('Saved role')} (${roleId})`}` : entry;
      return <li key={`${entry}:${index}`}><span>{label}</span><button type="button" className="ghost" aria-label={`${pt ? 'Remover' : helperText('Remove')} ${label}`} onClick={() => onChange(rewards.filter((_, at) => at !== index))}>{pt ? 'Remover' : helperText('Remove')}</button></li>;
    })}</ul> : <p>{pt ? 'Ainda não há recompensas. Podes adicionar uma abaixo.' : helperText('No rewards yet. Add one below if you want to use them.')}</p>}
    <div className="levels-rewards__add">
      <label className="field"><span><b>{pt ? 'Ao atingir o nível' : helperText('At level')}</b></span><input type="number" min={1} max={4294967295} value={level} onChange={event => setLevel(event.target.value)} /></label>
      <label className="field"><span><b>{pt ? 'Atribuir o cargo' : helperText('Give this role')}</b></span><select value={role} disabled={!available} onChange={event => setRole(event.target.value)}>
        <option value="">{pt ? 'Escolher cargo' : helperText('Choose a role')}</option>
        {roles.map(option => <option key={option.id} value={option.id} disabled={option.manageable === false}>{option.name}{option.manageable === false ? (pt ? ' · indisponível' : helperText(' · unavailable')) : ''}</option>)}
      </select></label>
      <button type="button" className="secondary" disabled={!canAdd} onClick={() => {if (canAdd && next) {onChange(next); setRole('');}}}>{pt ? 'Adicionar recompensa' : helperText('Add reward')}</button>
    </div>
    {!available && <p role="status">{pt ? 'Recarrega os cargos do Discord para adicionar uma recompensa.' : helperText('Reload Discord roles before adding a reward.')}</p>}
    {rewards.length >= 50 && <p role="status">{pt ? 'Limite de 50 recompensas atingido.' : helperText('The limit of 50 rewards has been reached.')}</p>}
  </div>;
}
