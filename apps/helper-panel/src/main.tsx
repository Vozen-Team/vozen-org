import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../../site/js/tab-title-v1.js';
import App from './App';
import { AchievementsPage } from './achievements-page';
import './styles.css';
import './styles-foundation.css';
import '../../../site/css/workspace-v1.css';
import './ecosystem-nav.css';
import './helper-modern.css';
import { normalizePanelRoute, panelRoute, PANEL_ROUTE_EVENT } from './panel-route';
import { isSupportedLocale, setHelperLocale } from './i18n';

const linkedLocale = /(?:[?&])lang=([a-z]{2})(?:&|$)/.exec(window.location.hash)?.[1] ?? new URLSearchParams(window.location.search).get('lang');
if (isSupportedLocale(linkedLocale)) setHelperLocale(linkedLocale);
normalizePanelRoute();

// Clean /panel/... entries and cached /panel/helper-tracker/ links share this app.
// Authentication and server permissions are
// enforced by the Helper API, not by the static route.
function Root() {
  const [hash,setHash]=useState(panelRoute);
  useEffect(()=>{
    const update=()=>setHash(panelRoute());
    // Management navigation waits for App's draft flush before switching roots.
    const external=()=>{if(hash.startsWith('#/achievements/')) {normalizePanelRoute();update();}};
    window.addEventListener(PANEL_ROUTE_EVENT,update);
    window.addEventListener('hashchange',external);
    window.addEventListener('popstate',external);
    return ()=>{window.removeEventListener(PANEL_ROUTE_EVENT,update);window.removeEventListener('hashchange',external);window.removeEventListener('popstate',external);};
  },[hash]);
  return hash.startsWith('#/achievements/') ? <AchievementsPage key={hash} hash={hash} /> : <App />;
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
