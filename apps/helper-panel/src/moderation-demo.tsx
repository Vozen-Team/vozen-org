import { useState } from 'react';
import { helperLocale } from './i18n';
import { spamSimulationText } from './antispam-simulation';
import translations from './moderation-copy.json';

export function ModerationDemo() {
  const copy = translations[helperLocale()];
  const common = spamSimulationText();
  const [cleanup, setCleanup] = useState(false);
  const [play, setPlay] = useState(0);
  return <>
    <div className="moderation-demo-scenarios">
      <button type="button" className="secondary" aria-pressed={!cleanup} onClick={() => setCleanup(false)}>{copy.warnings}</button>
      <button type="button" className="secondary" aria-pressed={cleanup} onClick={() => setCleanup(true)}>{copy.cleanup}</button>
    </div>
    <section className="spam-demo-chat" aria-label={common.channel}>
      <header className="spam-demo-channel">
        <strong><span aria-hidden="true"># </span>{common.channel}</strong>
        <small>{common.sample}</small>
      </header>
      <div className="spam-demo-feed" key={`${cleanup}-${play}`}>
        {cleanup && <div className="moderation-cleanup-messages" aria-hidden="true">
          {common.messages.slice(0, 5).map(message => <p key={message}>{message}</p>)}
        </div>}
        <div className="spam-demo-member">
          <span className="spam-demo-avatar" aria-hidden="true">N</span>
          <div>
            <strong>Noa</strong>
            <ul className="spam-demo-messages">
              <li><bdi>{cleanup ? '/purge count:20' : `/warn user:@Mia reason:${copy.reason}`}</bdi></li>
            </ul>
          </div>
        </div>
        <div className="spam-demo-response">
          {cleanup && <p>{copy.purgePolicy}</p>}
          <div className="spam-demo-warning">
            <div className="spam-demo-bot"><strong>Vozen Helper</strong><span>APP</span></div>
            <p>{cleanup ? copy.purgeResult : copy.warnResult}</p>
          </div>
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
