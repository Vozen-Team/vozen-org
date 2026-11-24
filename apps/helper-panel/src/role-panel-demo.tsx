import { useEffect, useState } from 'react';
import { helperLocale } from './i18n';
import { spamSimulationText } from './antispam-simulation';
import translations from './role-panel-copy.json';

export function RolePanelDemo() {
  const copy = translations[helperLocale()];
  const common = spamSimulationText();
  const [unique, setUnique] = useState(false);
  const [step, setStep] = useState(0);
  const [manual, setManual] = useState<number[] | null>(null);
  const sequence = unique ? [[], [0], [1], []] : [[], [0], [0, 1], [1], []];
  const selected = manual ?? sequence[step];
  const roles = [copy.roleOne, copy.roleTwo];
  useEffect(() => {
    if (manual !== null || step === (unique ? 3 : 4) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setTimeout(() => setStep(value => value + 1), 2400);
    return () => window.clearTimeout(timer);
  }, [step, unique, manual]);
  return <>
    <div className="moderation-demo-scenarios">
      {[copy.multiple, copy.unique].map((label, index) => <button type="button" className="secondary" key={index}
        aria-pressed={unique === Boolean(index)} onClick={() => { setUnique(Boolean(index)); setStep(0); setManual(null); }}>{label}</button>)}
    </div>
    <section className="spam-demo-chat role-panel-demo" aria-label={copy.panel}>
      <header className="spam-demo-channel"><strong><bdi># roles</bdi></strong><small>{common.sample}</small></header>
      <div className="spam-demo-feed">
        <div className="spam-demo-bot"><strong>Vozen Helper</strong><span>APP</span></div>
        <div className="role-panel-message"><h3>{copy.demoTitle}</h3><p>{copy.demoDescription}</p>
          <div className="role-panel-demo-choices">{roles.map((role, index) => <button type="button" className="secondary" key={index}
            aria-pressed={selected.includes(index)} onClick={() => setManual(selected.includes(index)
              ? selected.filter(value => value !== index) : unique ? [index] : [...selected, index])}>
            {selected.includes(index) && <span aria-hidden="true">✓ </span>}{role}
          </button>)}</div>
        </div>
        <section className="role-panel-demo-member" aria-label={copy.memberRoles}>
          <div className="spam-demo-member"><span className="spam-demo-avatar" aria-hidden="true">R</span><strong>Rexy</strong></div>
          <small>{copy.memberRoles}</small>
          <div className="role-panel-chips" aria-live="polite">
            {selected.length ? selected.map(index => <span key={index}>{roles[index]}</span>) : <small>{copy.none}</small>}
          </div>
        </section>
      </div>
    </section>
    <footer className="spam-demo-footer"><button type="button" className="secondary" onClick={() => { setStep(0); setManual(null); }}>
      <span aria-hidden="true">↻ </span>{common.replay}
    </button></footer>
  </>;
}
