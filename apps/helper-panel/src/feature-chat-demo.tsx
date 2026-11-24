import { useEffect, useState } from 'react';
import { helperLocale } from './i18n';
import { featureDemoScript, type DemoMessage } from './feature-layouts';
import { spamSimulationText } from './antispam-simulation';
import './feature-chat-demo.css';

function Message({ message, onAction }: { message: DemoMessage; onAction: () => void }) {
  if (message.bot) return <div className="feature-demo-message feature-demo-message--bot">
    <div className="spam-demo-bot"><strong>Vozen Helper</strong><span>APP</span></div>
    {message.text && <p>{message.text}</p>}
    {message.card && <div className={`feature-demo-card feature-demo-card--${message.card.tone ?? 'info'}`}>
      {message.card.title && <h3><bdi>{message.card.title}</bdi></h3>}
      {message.card.body && <p>{message.card.body}</p>}
      {message.card.fields && message.card.fields.length > 0 && <dl>{message.card.fields.map(([name, value]) =>
        <div key={name}><dt>{name}</dt><dd><bdi>{value}</bdi></dd></div>)}</dl>}
      {message.card.buttons && message.card.buttons.length > 0 && <div className="feature-demo-card__buttons">
        {message.card.buttons.map(button => <button type="button" className="secondary" key={button} onClick={onAction}>{button}</button>)}
      </div>}
      {message.card.footer && <small>{message.card.footer}</small>}
    </div>}
    {message.note && <p className="feature-demo-note">{message.note}</p>}
  </div>;
  const author = message.author ?? '';
  return <div className="feature-demo-message">
    <span className="spam-demo-avatar" aria-hidden="true">{Array.from(author)[0] ?? '?'}</span>
    <div>
      <strong><bdi>{author}</bdi></strong>
      {message.command && <p><code dir="ltr">{message.command}</code></p>}
      {message.text && <p>{message.text}</p>}
      {message.note && <p className="feature-demo-note">{message.note}</p>}
    </div>
  </div>;
}

// Scripted, local-only walkthrough. Nothing here calls the API or Discord.
export function FeatureChatDemo({ featureKey }: { featureKey: string }) {
  const script = featureDemoScript(featureKey, helperLocale());
  const common = spamSimulationText();
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(true);
  const last = (script?.stages.length ?? 1) - 1;
  useEffect(() => {
    if (!playing || stage >= last || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setTimeout(() => setStage(value => value + 1), 4000);
    return () => window.clearTimeout(timer);
  }, [stage, playing, last]);
  if (!script) return null;
  const go = (next: number) => { setPlaying(false); setStage(Math.min(next, last)); };
  const current = script.stages[stage];
  return <>
    <div className="moderation-demo-scenarios">
      {script.stages.map((item, index) =>
        <button type="button" key={index} className="secondary" aria-pressed={stage === index} onClick={() => go(index)}>{item.label}</button>)}
    </div>
    <section className="spam-demo-chat feature-chat-demo" aria-label={current.label}>
      <header className="spam-demo-channel"><strong><bdi>{current.channel}</bdi></strong><small>{common.sample}</small></header>
      <div className="spam-demo-feed" key={stage} aria-live="polite">
        {current.messages.map((message, index) => <Message key={index} message={message} onAction={() => go(stage + 1)} />)}
      </div>
    </section>
    <footer className="spam-demo-footer"><button type="button" className="secondary" onClick={() => { setStage(0); setPlaying(true); }}>
      <span aria-hidden="true">↻ </span>{common.replay}
    </button></footer>
  </>;
}
