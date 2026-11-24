import { useId, useState, type ReactNode } from 'react';
import { helperLocale, helperText } from './i18n';
import { SettingsFooter, SettingsToolbar } from './antispam-settings';
import translations from './tickets-copy.json';

export function TicketsSettingsPanel({ keys, enabled, saving, onEnabled, onTest, onRestore, onRepair, renderField }: {
  keys: string[]; enabled: boolean; saving: boolean;
  onEnabled: (value: boolean) => void; onTest: () => void; onRestore?: () => void; onRepair?: () => void;
  renderField: (key: string) => ReactNode;
}) {
  const [tab, setTab] = useState(0);
  const id = useId();
  const copy = translations[helperLocale()];
  const groups = [
    { title: copy.panel, hint: copy.panelHint, keys: ['panelChannel', 'panelTitle', 'panelDescription'] },
    { title: copy.support, hint: copy.supportHint, keys: ['categoryId', 'staffRole', 'maxOpen', 'closeAfterHours'] },
    { title: copy.records, hint: copy.recordsHint, keys: ['transcriptChannel'] },
  ];
  const unknown = keys.filter(key => !groups.some(group => group.keys.includes(key)));
  return <div className="spam-settings ticket-settings ticket-tabs">
    <SettingsToolbar enabled={enabled} onEnabled={onEnabled} onTest={onTest} />
    <div className="spam-tabs" data-tab-count="3" role="tablist" aria-label={helperText('Tickets')}>
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
      <section className="spam-group ticket-settings__group" aria-label={group.title}>
        <h3>{group.title}</h3><p className="ticket-settings__hint">{group.hint}</p>
        <div className="field-grid">{group.keys.filter(key => keys.includes(key)).map(key =>
          <div key={key} className={key === 'panelChannel' ? 'ticket-settings__panel-channel'
            : key === 'categoryId' ? 'ticket-settings__category'
            : ['maxOpen', 'closeAfterHours'].includes(key) ? 'ticket-settings__limit' : undefined}>{renderField(key)}</div>)}</div>
      </section>
      {index === 2 && unknown.length > 0 && <section className="spam-group"><h3>{helperText('Other settings')}</h3>
        <div className="field-grid">{unknown.map(key => <div key={key}>{renderField(key)}</div>)}</div>
      </section>}
    </div>)}
    <SettingsFooter saving={saving} onRestore={onRestore} onRepair={onRepair} />
  </div>;
}
