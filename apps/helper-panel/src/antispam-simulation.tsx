import { useState } from 'react';
import { helperLocale } from './i18n';
import translations from './antispam-simulation-copy.json';
import scamTranslations from './antiscam-simulation-copy.json';

export const spamSimulationText = () => translations[helperLocale() as keyof typeof translations] ?? translations.en;
export const scamSimulationText = () => scamTranslations[helperLocale() as keyof typeof scamTranslations] ?? scamTranslations.en;
const blockedDomain = 'oferta-nitro.example';

export function ProtectionChatDemo({ scam }: { scam: boolean }) {
  const copy = spamSimulationText();
  const scamCopy = scam ? scamSimulationText() : null;
  const [play, setPlay] = useState(0);
  return <>
    <section className="spam-demo-chat" aria-label={copy.channel}>
      <header className="spam-demo-channel">
        <strong><span aria-hidden="true"># </span>{copy.channel}</strong>
        <small>{copy.sample}</small>
      </header>
      <div className="spam-demo-feed" key={play}>
        <div className="spam-demo-member">
          <span className="spam-demo-avatar" aria-hidden="true">M</span>
          <div>
            <strong>Mia</strong>
            <ul className={scam ? 'spam-demo-messages scam-demo-message' : 'spam-demo-messages'}>
              {scamCopy ? <>
                <li>{scamCopy.message}</li>
                <li><bdi>https://{blockedDomain}</bdi></li>
              </> : copy.messages.map((message, index) => <li key={message}
                style={{ animationDelay: `${index * 320}ms` }}>{message}</li>)}
            </ul>
          </div>
        </div>
        <div className="spam-demo-response">
          {scamCopy && <p className="scam-demo-outcome">{scamCopy.removed}</p>}
          <div className="spam-demo-warning">
            {scamCopy && <small className="scam-demo-log"><bdi># {scamCopy.log}</bdi></small>}
            <div className="spam-demo-bot"><strong>Vozen Helper</strong><span>APP</span></div>
            <b>{scamCopy?.detected ?? copy.detected}</b>
            <p>{scamCopy ? <bdi>{blockedDomain}</bdi> : copy.warning}</p>
          </div>
          <div className="spam-demo-timeout">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
            </svg>
            <span>{scamCopy?.timeout ?? copy.timeout}</span>
          </div>
        </div>
      </div>
    </section>
    <footer className="spam-demo-footer">
      <button type="button" className="secondary" onClick={() => setPlay(value => value + 1)}>
        <span aria-hidden="true">↻ </span>{copy.replay}
      </button>
    </footer>
  </>;
}
