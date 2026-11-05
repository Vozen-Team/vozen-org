import { useState } from 'react';
import { helperLocale } from './i18n';
import translations from './antispam-simulation-copy.json';
import scamTranslations from './antiscam-simulation-copy.json';
import raidTranslations from './anti-raid-simulation-copy.json';
import joinTranslations from './join-protection-demo-copy.json';

export const spamSimulationText = () => translations[helperLocale() as keyof typeof translations] ?? translations.en;
export const scamSimulationText = () => scamTranslations[helperLocale() as keyof typeof scamTranslations] ?? scamTranslations.en;
export const raidSimulationText = () => raidTranslations[helperLocale()];
export const joinSimulationText = () => joinTranslations[helperLocale()];
const blockedDomain = 'oferta-nitro.example';
const raidJoins = [
  ['00:00', 'Noa'],
  ['00:03', 'Mika'],
  ['00:07', 'Alex'],
  ['00:11', 'Sam'],
];

export function ProtectionChatDemo({ kind }: { kind: 'spam' | 'scam' | 'raid' | 'join' }) {
  const copy = spamSimulationText();
  const scamCopy = kind === 'scam' ? scamSimulationText() : null;
  const raidCopy = kind === 'raid' ? raidSimulationText() : null;
  const joinCopy = kind === 'join' ? joinSimulationText() : null;
  const entryCopy = raidCopy ?? (joinCopy ? raidSimulationText() : null);
  const logChannel = entryCopy?.log ?? scamCopy?.log;
  const feedLabel = entryCopy?.feed ?? copy.channel;
  const [play, setPlay] = useState(0);
  return <>
    <section className="spam-demo-chat" aria-label={feedLabel}>
      <header className="spam-demo-channel">
        <strong>{!entryCopy && <span aria-hidden="true"># </span>}{feedLabel}</strong>
        <small>{copy.sample}</small>
      </header>
      <div className="spam-demo-feed" key={play}>
        {raidCopy ? <ul className="spam-demo-messages raid-demo-joins">
          {raidJoins.map(([time, name], index) => <li key={name} style={{ animationDelay: `${index * 440}ms` }}>
            <bdi className="raid-demo-time">{time}</bdi>
            <span><strong><bdi>{name}</bdi></strong> {raidCopy.joined}</span>
          </li>)}
        </ul> : <div className="spam-demo-member">
          <span className="spam-demo-avatar" aria-hidden="true">M</span>
          <div>
            <strong>{joinCopy && entryCopy ? <><bdi>Mia</bdi> {entryCopy.joined}</> : 'Mia'}</strong>
            <ul className={scamCopy ? 'spam-demo-messages scam-demo-message' : 'spam-demo-messages'}>
              {joinCopy ? <>
                <li>{joinCopy.age}</li>
                <li style={{ animationDelay: '700ms' }}>{joinCopy.minimum}</li>
              </> : scamCopy ? <>
                <li>{scamCopy.message}</li>
                <li><bdi>https://{blockedDomain}</bdi></li>
              </> : copy.messages.map((message, index) => <li key={message}
                style={{ animationDelay: `${index * 320}ms` }}>{message}</li>)}
            </ul>
          </div>
        </div>}
        <div className="spam-demo-response">
          {scamCopy && <p className="scam-demo-outcome">{scamCopy.removed}</p>}
          <div className="spam-demo-warning">
            {logChannel && <small className="scam-demo-log"><bdi># {logChannel}</bdi></small>}
            <div className="spam-demo-bot"><strong>Vozen Helper</strong><span>APP</span></div>
            <b>{joinCopy?.flagged ?? raidCopy?.detected ?? scamCopy?.detected ?? copy.detected}</b>
            <p>{joinCopy ? joinCopy.outcome : raidCopy ? raidCopy.alert : scamCopy ? <bdi>{blockedDomain}</bdi> : copy.warning}</p>
          </div>
          {!joinCopy && <div className="spam-demo-timeout">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
            </svg>
            <span>{raidCopy?.containment ?? scamCopy?.timeout ?? copy.timeout}</span>
          </div>}
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
