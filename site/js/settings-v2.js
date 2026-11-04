/* Progressive layout only: the existing dashboard owns authentication and writes. */
(function () {
 'use strict';
 const mobile=matchMedia('(max-width:900px)');
 function navigation(){
  const sidebar=document.querySelector('.tts-workspace__sidebar');if(!sidebar||sidebar.dataset.settingsNavigation)return;
  sidebar.dataset.settingsNavigation='true';const nav=sidebar.querySelector('nav');if(!nav)return;
  const trigger=document.createElement('button');trigger.type='button';trigger.className='settings-sections-button';trigger.textContent='Sections ▾';trigger.setAttribute('aria-expanded','false');
  function close(focus){sidebar.classList.remove('settings-sections-open');trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus();}
  trigger.addEventListener('click',()=>{const open=sidebar.classList.toggle('settings-sections-open');trigger.setAttribute('aria-expanded',String(open));});
  nav.addEventListener('click',event=>{if(event.target.closest('[data-tts-view]'))close(mobile.matches);});
  sidebar.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close(true);}});nav.append(trigger);
  const label=sidebar.querySelector('.workspace-sidebar__product strong');if(label){const select=document.createElement('select');select.className='settings-product-switch';select.setAttribute('aria-label','Product');for(const [value,text]of [['tts','Vozen TTS'],['music','Vozen Music'],['helper','Vozen Helper']]){const option=new Option(text,value);select.add(option);}select.value='tts';select.addEventListener('change',()=>{const save=document.getElementById('dashSave');if(save&&!save.disabled&&!confirm('You have unsaved changes. Leave this panel?')){select.value='tts';return;}location.assign(select.value==='music'?'/account/?music=1':'/panel/features/');});label.replaceWith(select);}
 }
 let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;navigation();});}new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});schedule();
 const viewport=window.visualViewport;if(viewport){const keyboard=()=>document.documentElement.style.setProperty('--settings-keyboard-offset',Math.max(0,innerHeight-viewport.height-viewport.offsetTop)+'px');viewport.addEventListener('resize',keyboard);viewport.addEventListener('scroll',keyboard);}
})();
