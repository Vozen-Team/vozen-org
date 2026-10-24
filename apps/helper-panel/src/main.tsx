import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AchievementsPage } from './achievements-page';
import './styles.css';
import './styles-foundation.css';
import '../../../site/css/workspace-v1.css';
import './ecosystem-nav.css';
import './helper-modern.css';

// The complete Helper configuration product is publicly served at
// /panel/helper-tracker/. Its authentication and server permissions are
// enforced by the Helper API, not by the static route.
function Root() {
  const [hash,setHash]=useState(window.location.hash);
  useEffect(()=>{const update=()=>setHash(window.location.hash);window.addEventListener('hashchange',update);return ()=>window.removeEventListener('hashchange',update);},[]);
  return hash.startsWith('#/achievements/') ? <AchievementsPage key={hash} hash={hash} /> : <App />;
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
