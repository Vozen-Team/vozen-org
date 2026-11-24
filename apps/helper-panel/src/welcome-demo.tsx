import { useState } from 'react';
import { helperLocale, helperText } from './i18n';
import { spamSimulationText } from './antispam-simulation';
import { welcomeStepOptions } from './welcome-settings';
import translations from './welcome-demo-copy.json';

export function WelcomeDemo() {
  const copy = translations[helperLocale()];
  const common = spamSimulationText();
  const [departure, setDeparture] = useState(false);
  const [play, setPlay] = useState(0);
  return <>
    <div className="moderation-demo-scenarios">
      <button type="button" className="secondary" aria-pressed={!departure} onClick={() => setDeparture(false)}>{copy.arrival}</button>
      <button type="button" className="secondary" aria-pressed={departure} onClick={() => setDeparture(true)}>{copy.departure}</button>
    </div>
    <section className="spam-demo-chat" aria-label={helperText('Welcome channel')}>
      <header className="spam-demo-channel">
        <strong><bdi># welcome</bdi></strong><small>{common.sample}</small>
      </header>
      <div className="spam-demo-feed" key={`${departure}-${play}`}>
        <ul className="spam-demo-messages"><li>{departure ? copy.left : copy.joined}</li></ul>
        <div className="spam-demo-response">
          <div className="spam-demo-warning">
            <div className="spam-demo-bot"><strong>Vozen Helper</strong><span>APP</span></div>
            <p>{departure ? copy.farewell : copy.greeting}</p>
            {!departure && <div className="welcome-demo-shortcuts" aria-label={helperText('Channel shortcuts')}>
              {welcomeStepOptions('en').slice(0, 3).map(step => <span key={step.value}>{step.label}<span aria-hidden="true"> ↗</span></span>)}
            </div>}
          </div>
          {!departure && <>
            <p className="welcome-demo-role">{copy.roleApplied} · <strong>{copy.role}</strong></p>
            <section className="welcome-demo-dm">
              <small>{helperText('Private message')}</small>
              <div className="spam-demo-bot"><strong>Vozen Helper</strong><span>APP</span></div>
              <p>{copy.private}</p>
            </section>
          </>}
        </div>
      </div>
    </section>
    <footer className="spam-demo-footer">
      <button type="button" className="secondary" onClick={() => setPlay(value => value + 1)}>
        <span aria-hidden="true">↻ </span>{common.replay}
      </button>
    </footer>
  </>;
}
