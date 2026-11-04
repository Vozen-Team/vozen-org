import { useId, useState, type ReactNode } from 'react';
import { helperLocale, helperText } from './i18n';
import copy from './antispam-copy.json';
import scamCopy from './antiscam-settings-copy.json';
import './antispam-settings.css';

const spamSettingsText = () => copy[helperLocale() as keyof typeof copy] ?? copy.en;
export const protectionRestorePrompt = () => spamSettingsText()[24];

function ProtectionDemoButton({ onClick }: { onClick: () => void }) {
  return <button type="button" className="primary spam-demo-button" onClick={onClick}>
    <span aria-hidden="true">▶ </span>{spamSettingsText()[10]}
  </button>;
}

export function ProtectionSettingsSkeleton() {
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
      <div className="spam-tabs">{[0, 1, 2].map(tab =>
        <span className="helper-skeleton__pulse spam-placeholder-tab" key={tab} />)}
      </div>
      <div className="spam-detection">
        <div className="spam-tab-intro">{pulse('intro')}</div>
        {[0, 1].map(group => <div className="spam-group" key={group}>
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

export function ProtectionSettings({ scam, title, keys, enabled, onEnabled, onTest, alertOnly, saving, onRestore, onSimulate, onRepair, renderField }: {
  scam: boolean; title: string; enabled: boolean; onEnabled: (enabled: boolean) => void; onTest: () => void;
  keys: string[]; alertOnly: boolean; saving: boolean; onRestore?: () => void; onSimulate?: () => void; onRepair?: () => void;
  renderField: (key: string, copy?: { label?: string; help?: string }, inline?: boolean) => ReactNode;
}) {
  const [tab, setTab] = useState(0);
  const id = useId();
  const text = spamSettingsText();
  const scamText = scamCopy[helperLocale()];
  const groups = scam ? SCAM_GROUPS : SPAM_GROUPS;
  const sectionTitles = scam ? { 3: scamText.links, 4: scamText.phrases, 5: text[5], 6: scamText.logs, 7: text[7] } : text;
  const introductions = scam ? [scamText.detection, scamText.actions, text[14]] : text.slice(12, 15);
  const fieldCopy: Record<string, { label?: string; help?: string }> = {
    floodCount: { label: text[17] },
    windowSeconds: { label: text[18] },
    timeoutSeconds: { label: text[19], help: text[15] },
    alertOnly: { label: text[16], help: '' },
    deleteMessage: { help: text[20] },
    warningDelivery: { help: text[21] },
    logChannel: { help: text[22] },
  };
  const field = (key: string) => renderField(key, fieldCopy[key]);
  const frequency = text[23].split(/\{(\w+)\}/);
  const unknown = keys.filter(key => (scam || (key !== 'capsPercent' && key !== 'capsMinLetters'))
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
      <ProtectionDemoButton onClick={onTest} />
    </div>
    <div className="spam-tabs" role="tablist" aria-label={title}>
      {text.slice(0, 3).map((label, index) => <button type="button" role="tab" key={index}
        id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={tab === index}
        tabIndex={tab === index ? 0 : -1} onClick={() => setTab(index)} onKeyDown={event => {
          const rtl = helperLocale() === 'ar';
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2
            : event.key === 'ArrowRight' ? (index + (rtl ? 2 : 1)) % 3
            : event.key === 'ArrowLeft' ? (index + (rtl ? 1 : 2)) % 3 : null;
          if (next === null) return;
          event.preventDefault(); setTab(next);
          document.getElementById(`${id}-tab-${next}`)?.focus();
        }}>{label}</button>)}
    </div>
    {[0, 1, 2].map(index => <div key={index} id={`${id}-panel-${index}`} role="tabpanel"
      className={index === 0 ? 'spam-detection' : undefined}
      aria-labelledby={`${id}-tab-${index}`} hidden={tab !== index} tabIndex={0}>
      <p className="spam-tab-intro">{introductions[index]}</p>
      {groups.filter(group => group.tab === index).map(group => {
        const fields = group.keys.filter(key => keys.includes(key));
        const inlineFrequency = group.title === 3 && fields.includes('floodCount') && fields.includes('windowSeconds');
        const labeledFields = inlineFrequency ? fields.filter(key => key !== 'floodCount' && key !== 'windowSeconds') : fields;
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
          {group.title === 5 ? <>
            {keys.includes('alertOnly') && field('alertOnly')}
            {alertOnly && <p className="spam-mode-note" role="status">{scam ? scamText.monitor : text[9]}</p>}
            <fieldset className="field-grid" disabled={alertOnly}>
              {fields.filter(key => key !== 'alertOnly').map(key => <div key={key}>{field(key)}</div>)}
            </fieldset>
          </> : <div className="field-grid">{labeledFields.map(key => key === 'warningDelivery'
            ? <fieldset key={key} className="spam-warning-field" disabled={alertOnly}>{field(key)}</fieldset>
            : <div key={key}>{field(key)}</div>)}</div>}
        </section> : null;
      })}
      {index === 2 && unknown.length > 0 && <section className="spam-group" aria-label={text[8]}>
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
