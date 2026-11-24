import { useId, useState, type ReactNode } from 'react';
import { helperLocale, helperText } from './i18n';
import { SettingsFooter, SettingsToolbar } from './antispam-settings';
// Presentation only: preserve the Welcome API keys, values and autosave flow.
export function welcomeSettingsGroups(locale: string) {
  const pt = locale === 'pt';
  return [
    { id:'public', title:pt ? 'Mensagem pública' : helperText('Public welcome'), description:pt ? 'Escolhe onde aparece a saudação e o que diz.' : helperText('Choose where the greeting appears and what it says.'), keys:['channel','message'] },
    { id:'links', title:pt ? 'Atalhos para canais' : helperText('Channel shortcuts'), description:pt ? 'Os botões abrem estes canais. Sem destino escolhido, o respetivo botão fica oculto.' : helperText('Buttons open these channels. A link stays hidden until you choose its destination.'), keys:['guideEnabled','steps','rulesChannel','introductionsChannel','channelsChannel'] },
    { id:'private', title:pt ? 'Mensagem privada' : helperText('Private welcome'), description:pt ? 'Opcional. Só é enviada se ativares esta opção e o membro permitir mensagens privadas.' : helperText('Optional. Sent only when enabled and the member allows direct messages.'), keys:['sendDm','dmMessage'] },
    { id:'options', title:pt ? 'Cargo e envio' : helperText('Role and delivery'), description:pt ? 'Opcional: atribui um cargo, ajusta o tempo ou usa um modelo guardado.' : helperText('Optional: assign a role, adjust the timing or use a saved template.'), keys:['autoRole','delaySeconds','templateId'] },
    { id:'farewell', title:pt ? 'Quando um membro sai' : helperText('When a member leaves'), description:pt ? 'A mensagem de despedida e o canal onde aparece.' : helperText('The goodbye message and where it appears.'), keys:['farewellChannel','farewellMessage'] },
  ];
}

export function welcomeSettingCopy<T extends {key:string;label:string;help?:string}>(field:T, locale:string): T & {emptyLabel?:string} {
  const pt = locale === 'pt';
  const copy: Record<string,[string,string,string?]> = pt ? {
    channel:['Canal de boas-vindas','','Usar o canal de sistema'],
    message:['Mensagem','Podes usar {member} para o membro e {server} para o servidor.'],
    guideEnabled:['Mostrar atalhos para canais',''],
    steps:['Botões a incluir',''],
    rulesChannel:['Regras','','Ocultar este botão'],
    introductionsChannel:['Apresentações','','Ocultar este botão'],
    channelsChannel:['Explorar canais','','Ocultar este botão'],
    sendDm:['Enviar mensagem privada',''],
    dmMessage:['Mensagem privada',''],
    autoRole:['Cargo ao entrar','','Não atribuir cargo'],
    delaySeconds:['Tempo de espera (segundos)','0 envia sem espera.'],
    templateId:['Modelo de mensagem guardado','Opcional. Usa um modelo criado na área de modelos.'],
    farewellChannel:['Canal de despedida','','Usar o canal de sistema'],
    farewellMessage:['Mensagem de despedida','Deixa vazia se não quiseres enviar uma despedida.'],
  } : {
    channel:['Welcome channel','','Use server system channel'],
    message:['Greeting','Use {member} for the member and {server} for the server name.'],
    guideEnabled:['Show channel shortcuts',''],
    steps:['Buttons to include',''],
    rulesChannel:['Rules','','Hide this link'],
    introductionsChannel:['Introductions','','Hide this link'],
    channelsChannel:['Explore channels','','Hide this link'],
    sendDm:['Send a private welcome',''],
    dmMessage:['Private message',''],
    autoRole:['Role on arrival','','No automatic role'],
    delaySeconds:['Wait before sending (seconds)','0 sends without waiting.'],
    templateId:['Saved message template','Optional. Use a template from your message templates.'],
    farewellChannel:['Goodbye channel','','Use server system channel'],
    farewellMessage:['Goodbye message','Leave empty if you do not want to send a goodbye.'],
  };
  const value = copy[field.key];
  return value ? {...field,label:pt ? value[0] : helperText(value[0]),help:pt ? value[1] : helperText(value[1]),...(value[2] ? {emptyLabel:pt ? value[2] : helperText(value[2])} : {})} : field;
}

export function welcomeStepOptions(locale:string) {
  const pt = locale === 'pt';
  return [
    {value:'rules',label:pt ? 'Regras' : helperText('Rules')},
    {value:'introductions',label:pt ? 'Apresentações' : helperText('Introductions')},
    {value:'channels',label:pt ? 'Explorar canais' : helperText('Explore channels')},
    {value:'help',label:pt ? 'Ajuda com comandos' : helperText('Command help')},
  ];
}

export function changeWelcomeStep(steps:string[], step:string, checked:boolean):string[] {
  if (checked) return steps.includes(step) ? [...steps] : [...steps,step];
  const next = steps.filter(value => value !== step);
  return next.length ? next : [...steps];
}

export function WelcomeGuideSteps({value,locale,onChange}:{value:unknown;locale:string;onChange:(steps:string[])=>void}) {
  const pt = locale === 'pt';
  const options = welcomeStepOptions(locale);
  const selected = Array.isArray(value) ? value.filter((item):item is string => typeof item === 'string')
    : typeof value === 'string' ? value.split(',').map(item => item.trim()).filter(Boolean)
    : value === undefined ? ['rules','introductions','channels'] : [];
  const other = selected.filter(step => !options.some(option => option.value === step));
  const visibleOptions = [...options,...other.map(value => ({value,label:`${pt ? 'Opção guardada' : helperText('Saved option')}: ${value}`}))];
  return <fieldset className="welcome-settings__steps">
    <legend>{pt ? 'Botões a incluir' : helperText('Buttons to include')}</legend>
    <div className="welcome-settings__choices">{visibleOptions.map(option => <label key={option.value}>
      <input type="checkbox" checked={selected.includes(option.value)}
        disabled={selected.length === 1 && selected[0] === option.value}
        onChange={event => onChange(changeWelcomeStep(selected,option.value,event.currentTarget.checked))} />
      <span>{option.label}</span>
    </label>)}</div>
    {selected.length === 1 && <small>{pt ? 'Mantém pelo menos uma opção selecionada.' : helperText('Keep at least one option selected.')}</small>}
  </fieldset>;
}

export function WelcomeSettingsPanel({ keys, enabled, guideEnabled, sendDm, saving, onEnabled, onTest, onRestore, onRepair, renderField }: {
  keys: string[]; enabled: boolean; guideEnabled: boolean; sendDm: boolean; saving: boolean;
  onEnabled: (enabled: boolean) => void; onTest: () => void;
  onRestore?: () => void; onRepair?: () => void; renderField: (key: string) => ReactNode;
}) {
  const [tab, setTab] = useState(0);
  const id = useId();
  const groups = welcomeSettingsGroups('en');
  const tabs = [
    { label: helperText('Welcome message'), groups: ['public', 'links'] },
    { label: helperText('Private message and role'), groups: ['private', 'options'] },
    { label: helperText('When a member leaves'), groups: ['farewell'] },
  ];
  const unknown = keys.filter(key => !groups.some(group => group.keys.includes(key)));
  return <div className="spam-settings welcome-settings welcome-tabs">
    <SettingsToolbar enabled={enabled} onEnabled={onEnabled} onTest={onTest} />
    <div className="spam-tabs" data-tab-count="3" role="tablist" aria-label={helperText('Welcome setup')}>
      {tabs.map((item, index) => <button type="button" role="tab" key={index}
        id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={tab === index}
        tabIndex={tab === index ? 0 : -1} onClick={() => setTab(index)} onKeyDown={event => {
          const forward = helperLocale() === 'ar' ? 'ArrowLeft' : 'ArrowRight';
          const backward = helperLocale() === 'ar' ? 'ArrowRight' : 'ArrowLeft';
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2
            : event.key === forward ? (index + 1) % 3 : event.key === backward ? (index + 2) % 3 : null;
          if (next === null) return;
          event.preventDefault(); setTab(next);
          document.getElementById(`${id}-tab-${next}`)?.focus();
        }}>{item.label}</button>)}
    </div>
    {tabs.map((item, index) => <div key={index} role="tabpanel" id={`${id}-panel-${index}`}
      aria-labelledby={`${id}-tab-${index}`} hidden={tab !== index} tabIndex={0}>
      {groups.filter(group => item.groups.includes(group.id)).map(group => {
        const fields = group.keys.filter(key => keys.includes(key));
        const toggle = group.id === 'links' ? 'guideEnabled' : group.id === 'private' ? 'sendDm' : '';
        const disabled = group.id === 'links' ? !guideEnabled : group.id === 'private' ? !sendDm : false;
        return fields.length > 0 && <section className="spam-group welcome-settings__group" data-group={group.id} key={group.id} aria-label={group.title}>
          <h3>{group.title}</h3>
          <p className="welcome-settings__hint">{group.description}</p>
          {toggle && fields.includes(toggle) && renderField(toggle)}
          <fieldset className="field-grid" disabled={disabled}>
            {fields.filter(key => key !== toggle).map(key => <div key={key}
              className={['message', 'steps', 'dmMessage', 'farewellMessage'].includes(key) ? 'welcome-settings__wide' : undefined}>
              {renderField(key)}
            </div>)}
          </fieldset>
        </section>;
      })}
      {index === 2 && unknown.length > 0 && <section className="spam-group"><h3>{helperText('Other settings')}</h3>
        <div className="field-grid">{unknown.map(key => <div key={key}>{renderField(key)}</div>)}</div>
      </section>}
    </div>)}
    <SettingsFooter saving={saving} onRestore={onRestore} onRepair={onRepair} />
  </div>;
}
