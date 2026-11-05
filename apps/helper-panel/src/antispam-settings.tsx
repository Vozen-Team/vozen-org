import { useId, useState, type ReactNode } from 'react';
import { helperLocale, helperText } from './i18n';
import copy from './antispam-copy.json';
import scamCopy from './antiscam-settings-copy.json';
import raidCopy from './anti-raid-settings-copy.json';
import moderationCopy from './moderation-copy.json';
import auditCopy from './audit-copy.json';
import './antispam-settings.css';

const spamSettingsText = () => copy[helperLocale() as keyof typeof copy] ?? copy.en;
export const protectionRestorePrompt = () => spamSettingsText()[24];

export function ProtectionSettingsSkeleton({ raid, join, moderation, audit }: { raid: boolean; join: boolean; moderation: boolean; audit: boolean }) {
  const pulse = (shape: string) => <span className={`helper-skeleton__pulse spam-placeholder-${shape}`} />;
  return <div className="detail-page antispam-page spam-settings-skeleton" aria-hidden="true">
    <div className="spam-navigation">
      {pulse('link')}
      {pulse('link')}
    </div>
    <div className="spam-settings">
      <div className="spam-toolbar">
        {pulse('button')}
        {pulse('button')}
      </div>
      {!moderation && <div className="spam-tabs" data-tab-count={raid || join || audit ? 2 : 3}>{(raid || join || audit ? [0, 1] : [0, 1, 2]).map(tab =>
        <span className="helper-skeleton__pulse spam-placeholder-tab" key={tab} />)}
      </div>}
      <div className={moderation ? undefined : raid ? 'raid-detection' : 'spam-detection'}>
        <div className="spam-tab-intro">{pulse('intro')}</div>
        {(raid || moderation ? [0] : [0, 1]).map(group => <div className="spam-group" key={group}>
          {pulse('heading')}
          {pulse('input')}
          {pulse('input')}
        </div>)}
      </div>
      <div className="spam-footer">{pulse('button')}</div>
    </div>
  </div>;
}

const SPAM_GROUPS = [
  { title: 3, tab: 0, keys: ['floodCount', 'windowSeconds', 'duplicateLimit'] },
  { title: 4, tab: 0, keys: ['mentionLimit', 'maxLinks'] },
  { title: 5, tab: 1, keys: ['alertOnly', 'deleteMessage', 'timeoutSeconds'] },
  { title: 6, tab: 1, keys: ['warningDelivery', 'logChannel'] },
  { title: 7, tab: 2, keys: ['ignoredChannels', 'ignoredRoles'] },
] as const;

const SCAM_GROUPS = [
  { title: 3, tab: 0, keys: ['blockInvites', 'blockedDomains'] },
  { title: 4, tab: 0, keys: ['blockedKeywords'] },
  { title: 5, tab: 1, keys: ['alertOnly', 'deleteMessage', 'timeoutSeconds'] },
  { title: 6, tab: 1, keys: ['logChannel'] },
  { title: 7, tab: 2, keys: ['ignoredChannels', 'ignoredRoles'] },
] as const;

const RAID_GROUPS = [
  { title: 3, tab: 0, keys: ['joinThreshold', 'windowSeconds'] },
  { title: 5, tab: 1, keys: ['alertOnly', 'pauseInvites', 'incidentMinutes', 'verification'] },
  { title: 6, tab: 1, keys: ['alertChannel'] },
] as const;

const JOIN_GROUPS = [
  { title: 3, tab: 0, keys: ['minimumAccountDays', 'requireAvatar'] },
  { title: 4, tab: 0, keys: ['blockedNamePatterns'] },
  { title: 5, tab: 1, keys: ['action', 'verifiedRole'] },
  { title: 6, tab: 1, keys: ['autoRole', 'logChannel'] },
] as const;

const MODERATION_GROUPS = [
  { title: 3, tab: 0, keys: ['requireReason', 'maxPurge'] },
] as const;

const AUDIT_GROUPS = [
  { title: 3, tab: 0, keys: ['threshold', 'windowSeconds'] },
  { title: 4, tab: 0, keys: ['shadowMode', 'incidentMinutes'] },
  { title: 6, tab: 1, keys: ['logChannel', 'includeContent'] },
] as const;

export function ProtectionSettings({ kind, title, keys, enabled, onEnabled, onTest, alertOnly, saving, onRestore, onSimulate, onRepair, renderField }: {
  kind: 'spam' | 'scam' | 'raid' | 'join' | 'moderation' | 'audit'; title: string; enabled: boolean; onEnabled: (enabled: boolean) => void; onTest: () => void;
  keys: string[]; alertOnly: boolean; saving: boolean; onRestore?: () => void; onSimulate?: () => void; onRepair?: () => void;
  renderField: (key: string, copy?: { label?: string; help?: string }, inline?: boolean) => ReactNode;
}) {
  const [tab, setTab] = useState(0);
  const id = useId();
  const text = spamSettingsText();
  const locale = helperLocale();
  const scam = kind === 'scam';
  const raid = kind === 'raid';
  const join = kind === 'join';
  const moderation = kind === 'moderation';
  const audit = kind === 'audit';
  const auditText = auditCopy[locale];
  const moderationText = moderationCopy[locale];
  const scamText = scamCopy[locale];
  const raidText = raidCopy[locale];
  const groups = audit ? AUDIT_GROUPS : moderation ? MODERATION_GROUPS : join ? JOIN_GROUPS : raid ? RAID_GROUPS : scam ? SCAM_GROUPS : SPAM_GROUPS;
  const sectionTitles = audit ? { 3: auditText.actions, 4: auditText.response, 6: auditText.records }
    : moderation ? { 3: helperText('Moderation safety') }
    : join ? { 3: helperText('Safe joining'), 4: helperText('Blocked name patterns'), 5: text[5], 6: helperText('Roles and logging') }
    : raid ? { 3: helperText('Join burst protection'), 5: text[5], 6: scamText.logs }
    : scam ? { 3: scamText.links, 4: scamText.phrases, 5: text[5], 6: scamText.logs, 7: text[7] } : text;
  const introductions = audit ? [auditText.intro, auditText.logIntro]
    : moderation ? [moderationText.intro]
    : join ? [helperText('Applies basic checks to new members.'), scamText.actions]
    : raid ? [raidText.detection, scamText.actions]
    : scam ? [scamText.detection, scamText.actions, text[14]] : text.slice(12, 15);
  const tabs = audit ? [text[0], auditText.records] : join ? [helperText('Join verification'), text[1]] : text.slice(0, introductions.length);
  const fieldCopy: Record<string, { label?: string; help?: string }> = {
    floodCount: { label: text[17] },
    windowSeconds: { label: text[18] },
    timeoutSeconds: { label: text[19], help: text[15] },
    alertOnly: raid ? { help: '' } : { label: text[16], help: '' },
    pauseInvites: { label: raidText.gate },
    verification: { label: helperText('Join verification') },
    deleteMessage: { help: text[20] },
    warningDelivery: { help: text[21] },
    logChannel: join || audit ? {} : { help: text[22] },
    shadowMode: { label: auditText.monitor, help: auditText.monitorHelp },
    requireReason: { help: moderationText.reasonHelp },
    maxPurge: { help: moderationText.purgeHelp },
  };
  const field = (key: string) => renderField(key, fieldCopy[key]);
  const frequency = (audit ? auditText.rule : raid ? raidText.rule : text[23]).split(/\{(\w+)\}/);
  const frequencyKeys = [frequency[1], frequency[3]];
  const unknown = keys.filter(key => (kind !== 'spam' || (key !== 'capsPercent' && key !== 'capsMinLetters'))
    && !groups.some(group => (group.keys as readonly string[]).includes(key)));
  return <div className="spam-settings">
    <div className="spam-toolbar">
      <label className="switch-row spam-activation">
        <input type="checkbox" checked={enabled} onChange={event => onEnabled(event.target.checked)} />
        <span className="spam-activation-state">
          <b aria-hidden={!enabled}>{helperText('Active')}</b>
          <b aria-hidden={enabled}>{helperText('Disabled')}</b>
        </span>
      </label>
      <button type="button" className="primary spam-demo-button" onClick={onTest}>
        <span aria-hidden="true">▶ </span>{text[10]}
      </button>
    </div>
    {!moderation && <div className="spam-tabs" data-tab-count={tabs.length} role="tablist" aria-label={title}>
      {tabs.map((label, index) => <button type="button" role="tab" key={index}
        id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={tab === index}
        tabIndex={tab === index ? 0 : -1} onClick={() => setTab(index)} onKeyDown={event => {
          const forward = locale === 'ar' ? 'ArrowLeft' : 'ArrowRight';
          const backward = locale === 'ar' ? 'ArrowRight' : 'ArrowLeft';
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
            : event.key === forward ? (index + 1) % tabs.length
            : event.key === backward ? (index + tabs.length - 1) % tabs.length : null;
          if (next === null) return;
          event.preventDefault(); setTab(next);
          document.getElementById(`${id}-tab-${next}`)?.focus();
        }}>{label}</button>)}
    </div>}
    {tabs.map((_, index) => <div key={index} id={`${id}-panel-${index}`} role={moderation ? 'region' : 'tabpanel'}
      className={index === 0 && !moderation ? (raid ? 'raid-detection' : 'spam-detection') : undefined}
      aria-label={moderation ? title : undefined}
      aria-labelledby={moderation ? undefined : `${id}-tab-${index}`} hidden={tab !== index} tabIndex={0}>
      <p className="spam-tab-intro">{introductions[index]}</p>
      {audit && index === 1 && <p className="spam-tab-intro"><code dir="ltr">/modlogs user:@Mia</code> · {auditText.command}</p>}
      {audit && index === 0 && <p className="spam-tab-intro">{auditText.permission}</p>}
      {moderation && <ul className="moderation-commands" aria-label={helperText('Commands')}>
        {Object.entries(moderationText.commands).map(([command, description]) => <li key={command}>
          <code dir="ltr">{command}</code>
          <span>{description}</span>
        </li>)}
      </ul>}
      {groups.filter(group => group.tab === index).map(group => {
        const fields: string[] = group.keys.filter(key => keys.includes(key));
        const inlineFrequency = group.title === 3 && frequencyKeys.every(key => fields.includes(key));
        const labeledFields = inlineFrequency ? fields.filter(key => !frequencyKeys.includes(key)) : fields;
        return fields.length ? <section className="spam-group" key={group.title} aria-label={sectionTitles[group.title]}>
          <h3>{sectionTitles[group.title]}</h3>
          {inlineFrequency && <div className="spam-rule">
            {frequency[0]}
            {[1, 3].map(index => {
              const key = frequency[index];
              return <span className="spam-rule-part" key={key}>
                {renderField(key, fieldCopy[key], true)}
                <span>{frequency[index + 1].trim()}</span>
              </span>;
            })}
          </div>}
          {group.title === 5 && !join ? <>
            {keys.includes('alertOnly') && field('alertOnly')}
            {alertOnly && <p className="spam-mode-note" role="status">{raid ? raidText.monitor : scam ? scamText.monitor : text[9]}</p>}
            <fieldset className="field-grid" disabled={alertOnly}>
              {fields.filter(key => key !== 'alertOnly').map(key => <div key={key}
                className={key === 'pauseInvites' ? 'raid-gate-field' : undefined}>{field(key)}</div>)}
            </fieldset>
          </> : labeledFields.length > 0 && <div className="field-grid">{labeledFields.map(key => key === 'warningDelivery'
            ? <fieldset key={key} className="spam-warning-field" disabled={alertOnly}>{field(key)}</fieldset>
            : <div key={key}>{field(key)}</div>)}</div>}
          {audit && group.title === 4 && !alertOnly && <p className="spam-mode-note">{auditText.containment}</p>}
        </section> : null;
      })}
      {index === tabs.length - 1 && unknown.length > 0 && <section className="spam-group" aria-label={text[8]}>
        <h3>{text[8]}</h3><div className="field-grid">{unknown.map(key => <div key={key}>{renderField(key)}</div>)}</div>
      </section>}
    </div>)}
    <footer className="spam-footer">
      {onRepair && <button type="button" className="secondary" disabled={saving} onClick={onRepair}>{helperText('Repair publication')}</button>}
      {onSimulate && <button type="button" className="secondary" onClick={onSimulate}>{helperText('Simulate configuration')}</button>}
      <button type="button" className="secondary" disabled={!onRestore || saving} onClick={onRestore}>{text[11]}</button>
    </footer>
  </div>;
}
