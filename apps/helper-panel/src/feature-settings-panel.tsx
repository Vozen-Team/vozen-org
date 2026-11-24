import { useId, useState, type ReactNode } from 'react';
import { helperLocale, helperText } from './i18n';
import { SettingsFooter, SettingsToolbar } from './antispam-settings';
import { featureLayout, type FeatureLayout } from './feature-layouts';
import './antispam-settings.css';
import './feature-settings-panel.css';

export function hasFeatureLayout(key: string | undefined): boolean {
  return Boolean(key && featureLayout(key, 'en'));
}

// Shared shell for the Helper settings pages: activation and demonstration in
// the toolbar, settings grouped under tabs, and restore/repair in the footer.
// Fields the layout does not place stay reachable under "Other settings".
export function FeatureSettingsPanel({ featureKey, title, keys, enabled, saving, onEnabled, onTest, onRestore, onRepair, renderField, slots = {}, actions }: {
  featureKey: string; title: string; keys: string[]; enabled: boolean; saving: boolean;
  onEnabled: (enabled: boolean) => void; onTest: () => void; onRestore?: () => void; onRepair?: () => void;
  renderField: (key: string) => ReactNode;
  /** Feature-specific components (managers, previews, provider health) placed by the layout's `slot`. */
  slots?: Record<string, ReactNode>;
  /** Extra footer actions, such as sending a real test message. */
  actions?: ReactNode;
}) {
  const [tab, setTab] = useState(0);
  const id = useId();
  const locale = helperLocale();
  const layout = featureLayout(featureKey, locale) as FeatureLayout;
  const placed = layout.tabs.flatMap(item => item.groups.flatMap(group => group.keys));
  const unknown = keys.filter(key => !placed.includes(key));
  const tabs = layout.tabs.filter(item => item.groups.some(group => group.keys.some(key => keys.includes(key)))
    || item.commands?.length || (item.slot && slots[item.slot]) || item === layout.tabs.at(-1));
  const current = Math.min(tab, tabs.length - 1);
  const tabbed = tabs.length > 1;
  return <div className={`spam-settings feature-settings feature-settings--${featureKey.split('.').at(-1)}`}>
    <SettingsToolbar enabled={enabled} onEnabled={onEnabled} onTest={onTest} />
    {tabbed && <div className="spam-tabs" data-tab-count={tabs.length} role="tablist" aria-label={title}>
      {tabs.map((item, index) => <button type="button" role="tab" key={index}
        id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={current === index}
        tabIndex={current === index ? 0 : -1} onClick={() => setTab(index)} onKeyDown={event => {
          const forward = locale === 'ar' ? 'ArrowLeft' : 'ArrowRight';
          const backward = locale === 'ar' ? 'ArrowRight' : 'ArrowLeft';
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
            : event.key === forward ? (index + 1) % tabs.length
            : event.key === backward ? (index + tabs.length - 1) % tabs.length : null;
          if (next === null) return;
          event.preventDefault(); setTab(next);
          document.getElementById(`${id}-tab-${next}`)?.focus();
        }}>{item.title}</button>)}
    </div>}
    {tabs.map((item, index) => <div key={index} id={`${id}-panel-${index}`}
      role={tabbed ? 'tabpanel' : 'region'} aria-labelledby={tabbed ? `${id}-tab-${index}` : undefined}
      aria-label={tabbed ? undefined : title} hidden={current !== index} tabIndex={0}>
      {item.intro && <p className="spam-tab-intro">{item.intro}</p>}
      {item.commands && item.commands.length > 0 && <ul className="moderation-commands" aria-label={helperText('Commands')}>
        {item.commands.map(([command, description]) => <li key={command}>
          <code dir="ltr">{command}</code><span>{description}</span>
        </li>)}
      </ul>}
      {item.groups.map(group => {
        const fields = group.keys.filter(key => keys.includes(key));
        return fields.length ? <section className="spam-group feature-settings__group" key={group.title} aria-label={group.title}>
          <h3>{group.title}</h3>
          {group.hint && <p className="feature-settings__hint">{group.hint}</p>}
          <div className="field-grid">{fields.map(key => <div key={key}>{renderField(key)}</div>)}</div>
        </section> : null;
      })}
      {item.slot && slots[item.slot] && <div className="feature-settings__slot">{slots[item.slot]}</div>}
      {index === tabs.length - 1 && unknown.length > 0 && <section className="spam-group feature-settings__group" aria-label={helperText('Other settings')}>
        <h3>{helperText('Other settings')}</h3>
        <div className="field-grid">{unknown.map(key => <div key={key}>{renderField(key)}</div>)}</div>
      </section>}
    </div>)}
    <SettingsFooter saving={saving} onRestore={onRestore} onRepair={onRepair}>{actions}</SettingsFooter>
  </div>;
}
