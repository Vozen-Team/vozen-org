import {achievementCatalog} from './achievement-catalog';
import {AchievementMedal} from './achievement-medal';
import {achievementText} from './achievements-i18n';
import {helperLocale,helperT} from './i18n';
import './achievements-page.css';
import './achievement-settings.css';

export function AchievementSettings({guildId,onTest}:{guildId?:string;onTest:()=>void}) {
  const locale=helperLocale();
  return <section className="achievement-settings" aria-label={achievementText(locale,'Achievements','Conquistas')}>
    <div className="achievement-settings__actions">
      {guildId && <a className="primary" href={`#/achievements/${guildId}?lang=${locale}`}>{achievementText(locale,'All achievements','Todas as conquistas')}</a>}
      <button type="button" className="secondary" onClick={onTest}>{helperT('helper.simulate','Simulate configuration')}</button>
    </div>
    <div className="achievement-settings__grid">{Object.entries(achievementCatalog).map(([id,copy])=><article key={id}>
      <AchievementMedal id={id} tier={1} earned />
      <h2>{achievementText(locale,copy.name[0],copy.name[1])}</h2>
    </article>)}</div>
  </section>;
}
