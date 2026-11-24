import { useEffect, useState } from 'react';
import { helperLocale } from './i18n';
import { spamSimulationText } from './antispam-simulation';
import translations from './tickets-copy.json';

export function TicketsDemo() {
  const copy = translations[helperLocale()];
  const common = spamSimulationText();
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    if (!playing || stage === 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setTimeout(() => setStage(value => value + 1), 4000);
    return () => window.clearTimeout(timer);
  }, [stage, playing]);
  const go = (next: number) => { setPlaying(false); setStage(next); };
  return <>
    <div className="moderation-demo-scenarios">
      {[copy.open, copy.support, copy.closed].map((label, index) =>
        <button type="button" key={index} className="secondary" aria-pressed={stage === index} onClick={() => go(index)}>{label}</button>)}
    </div>
    <section className="spam-demo-chat tickets-demo" aria-label={copy.panel}>
      <header className="spam-demo-channel"><strong><bdi>{stage === 0 ? '# support' : stage === 1 ? '🔒 ticket-rexy' : '# records'}</bdi></strong><small>{common.sample}</small></header>
      <div className="spam-demo-feed" key={stage} aria-live="polite">
        <div className="spam-demo-bot"><strong>Vozen Helper</strong><span>APP</span></div>
        {stage === 0 ? <div className="tickets-demo-card">
          <h3>{copy.title}</h3><p>{copy.description}</p>
          <button type="button" className="primary" onClick={() => go(1)}>{copy.open}</button>
        </div> : stage === 1 ? <>
          <p><bdi>@Rexy · @Support</bdi></p><p>{copy.private}</p>
          <div className="tickets-demo-member"><span className="spam-demo-avatar" aria-hidden="true">R</span><p><strong>Rexy</strong><br />{copy.question}</p></div>
          <div className="tickets-demo-claimed"><strong>{copy.claimed}</strong><p>{copy.answer}</p></div>
          <button type="button" className="secondary" onClick={() => go(2)}>{copy.close}</button>
        </> : <div className="tickets-demo-card">
          <strong>{copy.closed}</strong><p>{copy.recordsHint}</p>
          <div className="tickets-demo-transcript"><strong>{copy.transcript}</strong><p>Rexy · {copy.question}<br />Alex · {copy.answer}</p></div>
        </div>}
      </div>
    </section>
    <footer className="spam-demo-footer"><button type="button" className="secondary" onClick={() => { setStage(0); setPlaying(true); }}>
      <span aria-hidden="true">↻ </span>{common.replay}
    </button></footer>
  </>;
}
