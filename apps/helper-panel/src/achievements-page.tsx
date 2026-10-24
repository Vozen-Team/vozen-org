import { useEffect, useState } from 'react';
import './achievements-page.css';
import { EcosystemTopbar } from './ecosystem-topbar';
import { helperLocale, isSupportedLocale, setHelperLocale, syncHelperDocumentLocale } from './i18n';
import { achievementText } from './achievements-i18n';

export type Achievement = { id: string; name: string; description: string; value: number; thresholds: number[]; unlocked: boolean[] };
type Collection = { guildId: string; guildName: string | null; profile: { name: string; avatar: string } | null; achievements: Achievement[]; trackedMembers: number; tierCounts: Record<string, number[]> };
const badgePaths: Record<string, string> = {
  messages: 'M-15-12H15V7H-4L-13 15V7H-15Z',
  voice: 'M-16 5V-5A16 16 0 0 1 16-5V5M-16 0H-9V13H-16ZM9 0H16V13H9Z',
  reactions: 'M-15 0A15 15 0 1 0 15 0A15 15 0 1 0-15 0M-7-4H-5M5-4H7M-7 5Q0 13 7 5',
  threads_created: 'M-7-16L-11 16M8-16L4 16M-17-6H17M-17 7H17',
  threads_joined: 'M-15-10H15V13H-15ZM-6-15V-5M6-15V-5M-7 4L-1 10L10-1',
  boost: 'M2-19L-12 3H0L-3 20L14-4H3Z', xp: 'M-15-12L-5 0L-15 12M15-12L5 0L15 12',
};
const ptNames: Record<string, [string, string]> = {
  messages: ['À conversa', 'Envia mensagens no servidor'], voice: ['Fica mais um pouco', 'Passa tempo nos canais de voz'],
  reactions: ['Mestre das reações', 'Adiciona reações a mensagens'], threads_created: ['Criador de tópicos', 'Cria tópicos no servidor'],
  threads_joined: ['Explorador de tópicos', 'Participa em tópicos diferentes'], boost: ['Apoiante do servidor', 'Impulsiona o servidor'],
  xp: ['Marcos de XP', 'Ganha XP no servidor'],
};
export function achievementRoute(hash: string) {
  const match = /^#\/achievements\/(\d{15,22})(?:\/([a-f0-9]{64}))?(?:\?(.*))?$/.exec(hash);
  return match ? { guild: match[1], token: match[2], locale: new URLSearchParams(match[3]).get('lang') } : null;
}
export function achievementScore(rows: Achievement[]) {
  return rows.reduce((score, row) => score + row.unlocked.filter(Boolean).length / Math.max(1, row.thresholds.length), 0);
}
function Medal({ id, tier, earned }: { id: string; tier: number; earned: boolean }) {
  return <span className={`achievement-medal tier-${tier} ${earned ? 'earned' : 'locked'}`} aria-hidden="true"><span><svg viewBox="-24 -24 48 48" width="80%" height="80%"><path d={badgePaths[id]} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span></span>;
}

export function AchievementsPage({ hash }: { hash: string }) {
  const route = achievementRoute(hash);
  const [data, setData] = useState<Collection | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('rarity');
  const [locale, setLocale] = useState(() => isSupportedLocale(route?.locale) ? route.locale : helperLocale());
  const t = (en: string, translated: string) => achievementText(locale, en, translated);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError(''); setQuery(''); setFilter('all');
    if (!route) { setError('invalid'); return; }
    const base = (import.meta.env.VITE_HELPER_API_BASE as string | undefined)?.replace(/\/$/, '') || 'https://api.vozen.org/rust';
    fetch(`${base}/api/achievements/${route.guild}`, {
      signal: controller.signal, credentials: 'omit',
      headers: route.token ? { Authorization: `Achievement ${route.token}` } : {},
    }).then(async response => {
      if (!response.ok) throw new Error(response.status === 401 ? 'expired' : 'unavailable');
      const result: Collection = await response.json();
      if (result.guildId !== route.guild || !Array.isArray(result.achievements)) throw new Error('unavailable');
      if (!controller.signal.aborted) setData(result);
    }).catch(cause => { if (!controller.signal.aborted) setError(cause.message); });
    return () => controller.abort();
  }, [hash]);
  useEffect(() => {
    const previous = { lang: document.documentElement.lang, dir: document.documentElement.dir };
    const change = () => {
      const next = helperLocale();
      setLocale(next);
      syncHelperDocumentLocale();
      if (route) {
        const url = new URL(window.location.href);
        const [path, search] = url.hash.split('?');
        const params = new URLSearchParams(search);
        params.set('lang', next);
        url.hash = `${path}?${params}`;
        window.history.replaceState(null, '', url);
      }
    };
    window.addEventListener('vozen:languagechange', change);
    setHelperLocale(locale);
    return () => {
      window.removeEventListener('vozen:languagechange', change);
      document.documentElement.lang = previous.lang;
      document.documentElement.dir = previous.dir;
    };
  }, []);
  const names: Record<string, [string, string]> = {
    messages: ['Conversation starter', 'Send messages in the server'], voice: ['Stay awhile', 'Spend time in voice channels'],
    reactions: ['Reaction master', 'Add reactions to messages'], threads_created: ['Thread creator', 'Create threads in the server'],
    threads_joined: ['Thread explorer', 'Participate in different threads'], boost: ['Server supporter', 'Boost the server'],
    xp: ['XP milestones', 'Earn XP in the server'],
  };
  const title = (row: Achievement) => t(names[row.id]?.[0] || row.name, ptNames[row.id]?.[0] || row.name);
  const description = (row: Achievement) => t(names[row.id]?.[1] || row.description, ptNames[row.id]?.[1] || row.description);
  const score = achievementScore(data?.achievements || []);
  const rarity = (row: Achievement) => data?.tierCounts[row.id]?.[0] || 0;
  const all = data?.achievements || [];
  const visible = all.filter(row => title(row).toLocaleLowerCase().includes(query.toLocaleLowerCase()) && (filter === 'all' || (filter === 'unlocked' ? row.unlocked.some(Boolean) : !row.unlocked.every(Boolean))))
    .sort((a, b) => sort === 'name' ? title(a).localeCompare(title(b)) : sort === 'progress' ? b.unlocked.filter(Boolean).length / b.thresholds.length - a.unlocked.filter(Boolean).length / a.thresholds.length : rarity(a) - rarity(b));
  const tiers = [t('Bronze', 'Bronze'), t('Silver', 'Prata'), t('Gold', 'Ouro'), t('Diamond', 'Diamante')];
  return <><EcosystemTopbar /><main className="achievement-page">
    <section className="achievement-hero">
      {data?.profile?.avatar.startsWith('https://cdn.discordapp.com/') && <img src={data.profile.avatar} referrerPolicy="no-referrer" alt="" />}
      <div>{data?.guildName && <p>{data.guildName}</p>}<h1>{data?.profile ? data.profile.name : t('Achievements', 'Conquistas')}</h1></div>
      {data && <div className="achievement-total"><strong dir="ltr">{data.profile ? score.toLocaleString(locale, { maximumFractionDigits: 2 }) : all.length}<span>{data.profile ? ` / ${all.length}` : ''}</span></strong><span>{t('Achievements', 'Conquistas')}</span></div>}
    </section>
    {error ? <section className="achievement-notice" role="alert"><h2>{error === 'expired' ? t('This private link has expired', 'Este link privado expirou') : t('Collection unavailable', 'Coleção indisponível')}</h2><p>{error === 'expired' ? t('Use /achievements in Discord to get a new personal link.', 'Usa /achievements no Discord para obteres um novo link pessoal.') : t('Check that Achievements is enabled for this server and try again.', 'Confirma que as Conquistas estão ativas neste servidor e tenta novamente.')}</p></section> : !data ? <p role="status">{t('Loading achievements…', 'A carregar conquistas…')}</p> : <>
      <div className="achievement-quick-help">
        <span>{data.profile ? t('Private link · valid for 1 hour', 'Link privado · válido por 1 hora') : <>{t('Your progress:', 'O teu progresso:')} <code>/achievements</code></>}</span>
        <details className="achievement-help"><summary>{t('How it works', 'Como funciona')}</summary><ul>
          <li>{t('New activity counts from activation. Existing XP is kept.', 'A nova atividade conta desde a ativação. O XP anterior mantém-se.')}</li>
          <li>{t('Member counts include recorded activity only.', 'As contagens incluem apenas membros com atividade registada.')}</li>
          <li>{t('Voice progress includes your current session. Achievements do not award extra XP.', 'O progresso de voz inclui a sessão atual. As conquistas não dão XP extra.')}</li>
          {data.profile && <li>{t('Keep this link private. Use /achievements for a new link; the old one stops working.', 'Mantém este link privado. Usa /achievements para criar outro; o anterior deixa de funcionar.')}</li>}
        </ul></details>
      </div>
      {!data.profile && <section className="achievement-rarest"><div><h2>{t('Rare finds', 'As mais raras')}</h2></div>{[...all].sort((a, b) => rarity(a) - rarity(b)).slice(0, 3).map(row => <a href={`#achievement-${row.id}`} key={row.id} onClick={event => { event.preventDefault(); document.getElementById(`achievement-${row.id}`)?.scrollIntoView({ behavior: 'auto', block: 'center' }); }}><Medal id={row.id} tier={4} earned /><span>{title(row)}<small><bdi dir="ltr">{rarity(row)} / {data.trackedMembers}</bdi> {t('members', 'membros')}</small></span></a>)}</section>}
      <section className="achievement-collection"><div className="achievement-section-heading"><h2>{t('All achievements', 'Todas as conquistas')}</h2>{data.profile && <a href={`#/achievements/${route?.guild}?lang=${locale}`}>{t('Server achievements', 'Conquistas do servidor')}</a>}</div>
        <div className="achievement-toolbar"><label><span className="sr-only">{t('Search achievements', 'Pesquisar conquistas')}</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t('Find an achievement…', 'Encontra uma conquista…')} /></label>{data.profile && <div className="achievement-filters" aria-label={t('Filter achievements', 'Filtrar conquistas')}>{[['all', t('All', 'Todas')], ['unlocked', t('Unlocked', 'Desbloqueadas')], ['locked', t('To complete', 'Por completar')]].map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>}<label className="achievement-sort">{t('Sort by', 'Ordenar por')}<select value={sort} onChange={event => setSort(event.target.value)}><option value="rarity">{t('Rarity', 'Raridade')}</option><option value="name">{t('Name', 'Nome')}</option>{data.profile && <option value="progress">{t('Progress', 'Progresso')}</option>}</select></label></div>
        <div className="achievement-grid">{visible.map(row => {
          const tier = row.unlocked.filter(Boolean).length;
          const next = row.thresholds.find((_, index) => !row.unlocked[index]);
            return <article className="achievement-tile" key={row.id} id={`achievement-${row.id}`}><div className="achievement-tile-top"><Medal id={row.id} tier={data.profile ? Math.max(tier, 1) : 1} earned={!data.profile || tier > 0} /><div><h3>{title(row)}</h3><p>{description(row)}</p></div>{data.profile && <span className="achievement-fraction" dir="ltr">{tier}/{row.thresholds.length}</span>}</div><ol className="achievement-tiers">{row.thresholds.map((threshold, index) => <li key={index} className={data.profile && !row.unlocked[index] ? 'not-earned' : 'is-earned'}><Medal id={row.id} tier={index + 1} earned={!data.profile || row.unlocked[index]} /><span>{data.profile && row.unlocked[index] && <span aria-hidden="true">✓ </span>}{row.thresholds.length === 1 ? t('Unique', 'Única') : tiers[index]}</span><strong dir="ltr">{threshold.toLocaleString(locale)}{row.id === 'voice' ? ` ${t('min', 'min')}` : row.id === 'xp' ? ' XP' : ''}</strong>{data.profile && <span className="sr-only">{row.unlocked[index] ? t('Unlocked', 'Desbloqueada') : t('Locked', 'Bloqueada')}</span>}</li>)}</ol>{data.profile ? <div className="achievement-progress"><div><span>{next ? t('Next milestone', 'Próximo marco') : t('Collection complete', 'Coleção completa')}</span><strong dir="ltr">{row.value.toLocaleString(locale)}{next ? ` / ${next.toLocaleString(locale)}` : ''}</strong></div><progress value={Math.min(row.value, next || row.value || 1)} max={next || row.value || 1} aria-label={title(row)} /></div> : <p className="achievement-server-stat"><bdi dir="ltr">{rarity(row)} / {data.trackedMembers}</bdi> {t('unlocked', 'desbloquearam')}</p>}</article>;
        })}</div>{!visible.length && <p role="status">{t('No achievements match this filter.', 'Não há conquistas com este filtro.')}</p>}
      </section>
    </>}
  </main></>;
}
