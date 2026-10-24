import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { api, type ActivityFeedRecord } from './api';
import { activityText as t } from './activity-i18n';
import { activityAction, activityName, activityStatus, mergeActivity, validActivityFeed } from './activity-model';
import { helperLocale } from './i18n';
import { isAbortError } from './load-lifecycle';
import './activity-feed.css';

const categories = ['all','joins','leaves','bans','timeouts','helper'] as const;
type Category = typeof categories[number];

export function ActivityFeed({ guildId, preview = false }: { guildId: string; preview?: boolean }) {
  const [category,setCategory] = useState<Category>('all');
  const [rows,setRows] = useState<ActivityFeedRecord[]>([]);
  const [cursor,setCursor] = useState<string|null>(null);
  const [expanded,setExpanded] = useState<string|null>(null);
  const [loading,setLoading] = useState(!preview && !!guildId);
  const [error,setError] = useState(false);
  const request = useRef<{sequence:number;controller?:AbortController;busy:boolean;paged:boolean}>({sequence:0,busy:false,paged:false});
  const load = useCallback(async (mode: 'reset'|'refresh'|'more', before?: string) => {
    if (!guildId || preview) {setLoading(false);return;}
    request.current.controller?.abort();
    const controller = new AbortController();
    const sequence = ++request.current.sequence;
    request.current.controller = controller;
    request.current.busy = true;
    setLoading(true); setError(false);
    if (mode === 'reset') { setExpanded(null); setRows([]); setCursor(null); request.current.paged = false; }
    try {
      const result = await api.activityFeed(category,before,{signal:controller.signal});
      if (controller.signal.aborted || sequence !== request.current.sequence) return;
      if (!validActivityFeed(result,guildId)) throw new Error('Invalid activity response');
      setRows(previous => mode === 'more' ? mergeActivity(previous,result.events) : result.events);
      setCursor(result.nextCursor);
      if (mode === 'more') request.current.paged = true;
    } catch (cause) {
      if (!controller.signal.aborted && sequence === request.current.sequence && !isAbortError(cause)) setError(true);
    } finally {
      if (sequence === request.current.sequence) { request.current.busy = false; setLoading(false); }
    }
  },[category,guildId,preview]);
  useEffect(() => {
    void load('reset');
    const interval = window.setInterval(() => { if (document.visibilityState === 'visible' && !request.current.busy && !request.current.paged) void load('refresh'); },30000);
    return () => { window.clearInterval(interval); request.current.controller?.abort(); request.current.sequence++; request.current.busy=false; };
  },[load]);
  const locale = helperLocale() === 'pt' ? 'pt-PT' : helperLocale() === 'zh' ? 'zh-TW' : helperLocale();
  const dates = new Intl.DateTimeFormat(locale,{dateStyle:'short',timeStyle:'short'});
  const labels = {all:t('All'),joins:t('Joins'),leaves:t('Leaves'),bans:t('Bans'),timeouts:t('Timeouts'),helper:'Helper'};
  return <section className="activity-feed" aria-label={t('Activity list')}>
    <div className="activity-feed__toolbar">
      <nav className="activity-feed__filters" aria-label={t('Activity filters')}>{categories.map(value=><button key={value} type="button" aria-pressed={category===value} onClick={()=>{if(value!==category){setExpanded(null);setRows([]);setCursor(null);setCategory(value);}}}>{labels[value]}</button>)}</nav>
      <button className="secondary activity-feed__refresh" type="button" disabled={loading || preview} onClick={()=>void load('reset')}>{t('Refresh')}</button>
    </div>
    {error && <div className="activity-feed__error" role="alert"><span>{t('Could not load activity.')}</span><button type="button" className="secondary" onClick={()=>void load('reset')}>{t('Try again')}</button></div>}
    <div className="activity-feed__table card" aria-busy={loading}>
      <table><thead><tr><th scope="col">{t('Action')}</th><th scope="col">{t('Member')}</th><th scope="col">{t('Status')}</th><th scope="col">{t('Date')}</th><th scope="col"><span className="activity-feed__sr">{t('Details')}</span></th></tr></thead>
      <tbody>{rows.map(row=>{
        const status=activityStatus(row);
        const name=activityName(row.user_id,row.memberName);
        const actor=activityName(row.actor_id,row.actorName);
        const date=new Date(row.created_at);
        return <Fragment key={row.id}><tr className="activity-feed__row">
          <td className="activity-feed__action">{activityAction(row)}</td>
          <td className="activity-feed__member"><strong><bdi>{name}</bdi></strong>{row.actor_id && row.actor_id !== row.user_id && <small>{t('By')} <bdi>{actor}</bdi></small>}</td>
          <td className="activity-feed__status"><span className={`activity-feed__badge activity-feed__badge--${status.tone}`}>{status.text}</span></td>
          <td className="activity-feed__date">{Number.isNaN(date.valueOf())?'—':<time dateTime={date.toISOString()}>{dates.format(date)}</time>}</td>
          <td className="activity-feed__details"><button type="button" aria-expanded={expanded===row.id} aria-controls={`activity-details-${row.id}`} onClick={()=>setExpanded(previous=>previous===row.id?null:row.id)}>{t('Details')}</button></td>
        </tr>{expanded===row.id && <tr className="activity-feed__expanded" id={`activity-details-${row.id}`}><td colSpan={5}>
            <p>{t('Member')}: <bdi>{name}</bdi> <code dir="ltr">{row.user_id}</code></p>
            {row.actor_id && <p>{t('Actor')}: <bdi>{actor}</bdi> <code dir="ltr">{row.actor_id}</code></p>}
            <code dir="ltr">{row.kind} · {row.outcome}</code><pre>{row.detail}</pre>
        </td></tr>}</Fragment>;
      })}</tbody></table>
      {!rows.length && !error && <p className="activity-feed__empty" role="status">{loading?t('Loading…'):category==='all'?t('No activity yet.'):t('No activity in this filter.')}</p>}
    </div>
    {cursor && <button className="secondary activity-feed__more" type="button" disabled={loading} onClick={()=>void load('more',cursor)}>{loading?t('Loading…'):t('Load more')}</button>}
  </section>;
}
