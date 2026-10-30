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
 function setup(){
  const intro=document.querySelector('#dashRoot .workspace-quick-intro');const form=intro?.closest('.dash-form');if(!form||form.dataset.settingsSetup)return;form.dataset.settingsSetup='true';
  intro.querySelector('h1')?.setAttribute('hidden','');intro.querySelector('.workspace-heading__eyebrow')?.setAttribute('hidden','');
  const confirmed=form.querySelector('.dash-status--ok');if(confirmed?.textContent){const result=document.createElement('p');result.className='settings-setup-result';result.setAttribute('role','status');result.textContent=confirmed.textContent;intro.append(result);}
  const keys=[['ttsChannelId','autoread'],['defaultVoice','locale','xsaid','autojoin','greetOnJoin','stayInCall'],['readBots','textInVoice','antispam','translationEnabled','maxChars','ratePerMin','priorityRoleId','blockedRoleId','streakAnnounce','soundboard','votePromos']];
  const titles=['Reading channel','Voice and language','Reading rules','Review & Save'],panels=[],all=[];const savebar=form.querySelector('.dash-savebar');if(!savebar)return;
  for(let i=0;i<keys.length;i++){const panel=document.createElement('section');panel.className='dash-sec settings-setup-panel';const title=document.createElement('h2');title.textContent=titles[i];panel.append(title);for(const key of keys[i]){const input=form.querySelector('[data-k="'+key+'"]');const row=input?.closest('.dash-row');if(row){panel.append(row);all.push({key,input,row});}}form.insertBefore(panel,savebar);panels.push(panel);}
  form.querySelectorAll('.dash-sec:not(.settings-setup-panel)').forEach(section=>{if(!section.querySelector('[data-k]'))section.remove();});
  const review=document.createElement('section');review.className='settings-setup-review';form.insertBefore(review,savebar);panels.push(review);
  const controls=document.createElement('div');controls.className='settings-setup-controls';const back=document.createElement('button'),next=document.createElement('button'),progress=document.createElement('span');for(const button of [back,next])button.type='button';back.textContent='Back';progress.className='settings-setup-progress';progress.setAttribute('aria-live','polite');controls.append(back,progress,next);form.insertBefore(controls,savebar);let step=0;
  function valid(){for(const field of all){if(panels[step]?.contains(field.input)&&!field.input.checkValidity()){field.input.reportValidity();field.input.focus();return false;}}return true;}
  function show(){panels.forEach((panel,index)=>panel.hidden=index!==step);back.disabled=step===0;next.hidden=step===3;next.textContent=step===2?'Review choices':'Continue';progress.textContent='Step '+(step+1)+' of 4 · '+titles[step];savebar.hidden=step!==3;if(step===3){review.replaceChildren();const h=document.createElement('h2');h.textContent=titles[3];const list=document.createElement('dl');for(const {input,row}of all){const line=document.createElement('div'),term=document.createElement('dt'),description=document.createElement('dd');term.textContent=row.querySelector('.dash-row__l')?.textContent||input.dataset.k;description.textContent=input.type==='checkbox'?(input.checked?'On':'Off'):input.tagName==='SELECT'?(input.selectedOptions[0]?.textContent||'Not selected'):input.value;line.append(term,description);list.append(line);}review.append(h,list);}}
  next.addEventListener('click',()=>{if(valid()){step++;show();controls.scrollIntoView({block:'nearest'});}});back.addEventListener('click',()=>{step--;show();});
  form.querySelector('#dashSave')?.addEventListener('click',event=>{if(step!==3||all.some(({input})=>!input.checkValidity())){event.preventDefault();event.stopImmediatePropagation();}},true);show();
 }
 let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;navigation();setup();});}new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});schedule();
 const viewport=window.visualViewport;if(viewport){const keyboard=()=>document.documentElement.style.setProperty('--settings-keyboard-offset',Math.max(0,innerHeight-viewport.height-viewport.offsetTop)+'px');viewport.addEventListener('resize',keyboard);viewport.addEventListener('scroll',keyboard);}
})();
