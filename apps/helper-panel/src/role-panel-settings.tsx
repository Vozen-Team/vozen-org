import { useId, useState, type ReactNode } from 'react';
import type { FeatureConfig, GuildContext } from './api';
import { helperLocale, helperText } from './i18n';
import { SettingsFooter, SettingsToolbar } from './antispam-settings';
import translations from './role-panel-copy.json';
import './role-panel-settings.css';

export function RolePanelSettings({ keys, config, context, enabled, saving, onEnabled, onTest, onRestore, onRepair, renderField, manager }: {
  keys: string[]; config: FeatureConfig; context: GuildContext | null; enabled: boolean; saving: boolean;
  onEnabled: (value: boolean) => void; onTest: () => void; onRestore?: () => void; onRepair?: () => void;
  renderField: (key: string) => ReactNode; manager: ReactNode;
}) {
  const [tab, setTab] = useState(0);
  const id = useId();
  const copy = translations[helperLocale()];
  const groups = [
    { title: copy.panel, hint: copy.panelHint, keys: ['channel', 'panelTitle', 'panelDescription'] },
    { title: copy.roles, hint: copy.rolesHint, keys: ['roleIds', 'selectionMode', 'removeOnUnselect', 'maxRoles'] },
    { title: copy.published, hint: '', keys: [] },
  ];
  const unknown = keys.filter(key => !groups.some(group => group.keys.includes(key)));
  const roleNames = (Array.isArray(config.roleIds) ? config.roleIds : []).map(id =>
    context?.roles.find(role => role.id === id)?.name ?? helperText('Unavailable resource'));
  return <div className="spam-settings role-panel-settings">
    <SettingsToolbar enabled={enabled} onEnabled={onEnabled} onTest={onTest} />
    <div className="spam-tabs" data-tab-count="3" role="tablist" aria-label={helperText('Role panels')}>
      {groups.map((group, index) => <button type="button" role="tab" key={index}
        id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={tab === index}
        tabIndex={tab === index ? 0 : -1} onClick={() => setTab(index)} onKeyDown={event => {
          const forward = helperLocale() === 'ar' ? 'ArrowLeft' : 'ArrowRight';
          const backward = helperLocale() === 'ar' ? 'ArrowRight' : 'ArrowLeft';
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2
            : event.key === forward ? (index + 1) % 3 : event.key === backward ? (index + 2) % 3 : null;
          if (next === null) return;
          event.preventDefault(); setTab(next);
          document.getElementById(`${id}-tab-${next}`)?.focus();
        }}>{group.title}</button>)}
    </div>
    {groups.map((group, index) => <div key={index} role="tabpanel" id={`${id}-panel-${index}`}
      aria-labelledby={`${id}-tab-${index}`} hidden={tab !== index} tabIndex={0}>
      {index === 2 ? manager : <section className="spam-group">
        <h3>{group.title}</h3><p className="role-panel-hint">{group.hint}</p>
        <div className={index === 0 ? 'role-panel-message-layout' : 'field-grid'}>
          {index === 0 ? <div className="role-panel-fields">{group.keys.filter(key => keys.includes(key)).map(key =>
            <div key={key}>{renderField(key)}</div>)}</div> : group.keys.filter(key => keys.includes(key)).map(key =>
            <div key={key} className={key === 'roleIds' ? 'role-panel-wide' : undefined}>{renderField(key)}</div>)}
          {index === 0 && <aside className="role-panel-preview" aria-label={copy.preview}>
            <small>{copy.preview}</small>
            <div className="role-panel-message">
              <div className="role-panel-bot"><strong>Vozen Helper</strong><span>APP</span></div>
              <h4>{String(config.panelTitle ?? '')}</h4><p>{String(config.panelDescription ?? '')}</p>
              <div className="role-panel-chips">{roleNames.map((name, index) => <span key={index}>{name}</span>)}</div>
              {roleNames.length === 0 && <small>{copy.previewEmpty}</small>}
            </div>
          </aside>}
        </div>
        {index === 0 && enabled && Boolean(config.channel) && roleNames.length > 0 &&
          <p className="role-panel-hint role-panel-publish-note">{copy.publishHint}</p>}
      </section>}
      {index === 1 && unknown.length > 0 && <section className="spam-group"><h3>{helperText('Other settings')}</h3>
        <div className="field-grid">{unknown.map(key => <div key={key}>{renderField(key)}</div>)}</div>
      </section>}
    </div>)}
    <SettingsFooter saving={saving} onRestore={onRestore} onRepair={onRepair} />
  </div>;
}
