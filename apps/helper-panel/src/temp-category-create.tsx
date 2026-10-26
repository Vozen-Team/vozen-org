import {useEffect,useRef,useState} from 'react';
import {api,type GuildContext} from './api';
import {helperLocale} from './i18n';
import {validStarboardName} from './starboard-channel';
import './starboard-channel.css';

const copy:Record<string,string[]>={
  en:['Or create a category','Create category','Creating…','Inherits server permissions. Selected automatically.','Use 2–80 unaccented letters, numbers, hyphens or underscores.','Could not confirm creation. Check Discord and Manage Channels permission before retrying.','Refresh Discord resources and check Helper’s Manage Channels permission.','Created and selected.'],
  pt:['Ou cria uma categoria','Criar categoria','A criar…','Herda as permissões do servidor. Selecionada automaticamente.','Usa 2–80 letras sem acentos, números, hífenes ou underscores.','Não foi possível confirmar a criação. Verifica o Discord e a permissão Gerir canais antes de repetir.','Atualiza os recursos Discord e verifica a permissão Gerir canais do Helper.','Criada e selecionada.'],
  fr:['Ou créer une catégorie','Créer une catégorie','Création…','Hérite des permissions du serveur. Sélection automatique.','Utilisez 2 à 80 lettres sans accent, chiffres, tirets ou underscores.','Création non confirmée. Vérifiez Discord et la permission Gérer les salons avant de réessayer.','Actualisez les ressources Discord et vérifiez la permission Gérer les salons de Helper.','Créée et sélectionnée.'],
  es:['O crea una categoría','Crear categoría','Creando…','Hereda los permisos del servidor. Se selecciona automáticamente.','Usa entre 2 y 80 letras sin acentos, números, guiones o guiones bajos.','No se pudo confirmar la creación. Revisa Discord y el permiso Gestionar canales antes de reintentar.','Actualiza los recursos de Discord y revisa el permiso Gestionar canales de Helper.','Creada y seleccionada.'],
  de:['Oder eine Kategorie erstellen','Kategorie erstellen','Wird erstellt…','Übernimmt die Serverberechtigungen. Wird automatisch ausgewählt.','Nutze 2–80 Buchstaben ohne Akzente, Ziffern, Bindestriche oder Unterstriche.','Erstellung nicht bestätigt. Prüfe Discord und die Berechtigung Kanäle verwalten vor einem erneuten Versuch.','Aktualisiere die Discord-Ressourcen und prüfe Helpers Berechtigung Kanäle verwalten.','Erstellt und ausgewählt.'],
  tr:['Veya kategori oluştur','Kategori oluştur','Oluşturuluyor…','Sunucu izinlerini devralır. Otomatik seçilir.','2–80 aksansız harf, rakam, tire veya alt çizgi kullanın.','Oluşturma doğrulanamadı. Tekrar denemeden önce Discord’u ve Kanalları Yönet iznini kontrol edin.','Discord kaynaklarını yenileyin ve Helper’ın Kanalları Yönet iznini kontrol edin.','Oluşturuldu ve seçildi.'],
  ar:['أو أنشئ فئة','إنشاء فئة','جارٍ الإنشاء…','ترث أذونات الخادم ويتم اختيارها تلقائياً.','استخدم 2–80 حرفاً لاتينياً دون تشكيل أو أرقاماً أو شرطات.','تعذر تأكيد الإنشاء. تحقق من Discord وإذن إدارة القنوات قبل إعادة المحاولة.','حدّث موارد Discord وتحقق من إذن إدارة القنوات لدى Helper.','تم الإنشاء والاختيار.'],
  zh:['或建立分類','建立分類','建立中…','繼承伺服器權限，並自動選取。','使用 2–80 個不含重音的英文字母、數字、連字號或底線。','無法確認建立結果。重試前請檢查 Discord 和管理頻道權限。','重新整理 Discord 資源，並檢查 Helper 的管理頻道權限。','已建立並選取。'],
  ru:['Или создайте категорию','Создать категорию','Создание…','Наследует права сервера. Выбирается автоматически.','Используйте 2–80 латинских букв без диакритики, цифры, дефисы или подчёркивания.','Не удалось подтвердить создание. Перед повтором проверьте Discord и право управления каналами.','Обновите ресурсы Discord и проверьте право Helper на управление каналами.','Создана и выбрана.'],
  ko:['또는 카테고리 만들기','카테고리 만들기','만드는 중…','서버 권한을 상속하며 자동으로 선택됩니다.','악센트 없는 영문자, 숫자, 하이픈 또는 밑줄 2–80자를 사용하세요.','생성을 확인하지 못했습니다. 다시 시도하기 전에 Discord와 채널 관리 권한을 확인하세요.','Discord 리소스를 새로 고치고 Helper의 채널 관리 권한을 확인하세요.','생성하고 선택했습니다.'],
};
export function canCreateTempCategory(context:GuildContext|null){
  if(!context||context.stale||!context.bot?.available)return false;
  try{const bits=BigInt(context.bot.permissions??'0');return bits>=0n&&(bits&24n)!==0n;}catch{return false;}
}
export function TempCategoryCreate({context,onCreated}:{context:GuildContext|null;onCreated:(category:GuildContext['channels'][number])=>void}){
  const [name,setName]=useState('temporary-rooms');
  const [busy,setBusy]=useState(false);
  const [created,setCreated]=useState('');
  const [error,setError]=useState(false);
  const alive=useRef(true),submitting=useRef(false);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const [title,createLabel,creating,help,hint,errorMessage,permissions,ready]=copy[helperLocale()]??copy.en;
  const allowed=canCreateTempCategory(context);
  async function create(){
    if(!context||!allowed||submitting.current||!validStarboardName(name))return;
    submitting.current=true;setBusy(true);setError(false);
    try{
      const result=await api.createTempCategory(context.guildId,name.trim().toLowerCase());
      if(!alive.current)return;
      if(result.guildId!==context.guildId||result.channel.type!==4||!result.channel.id||!result.channel.name)throw new Error('invalid_category_response');
      onCreated({id:result.channel.id,name:result.channel.name,type:'category'});
      setCreated(result.channel.name);
    }catch{if(alive.current)setError(true);}
    finally{submitting.current=false;if(alive.current)setBusy(false);}
  }
  return <section className="starboard-channel temp-category-create" aria-label={createLabel}>
    {!created&&<><div className="ticket-channel-create__row"><label className="field"><span>{title}</span><input value={name} maxLength={80} disabled={busy} aria-invalid={!validStarboardName(name)} onChange={event=>setName(event.target.value)}/>{!validStarboardName(name)&&<small>{hint}</small>}</label><button type="button" className="secondary" disabled={busy||!allowed||!validStarboardName(name)} onClick={()=>void create()}>{busy?creating:createLabel}</button></div><p>{help}</p></>}
    {!allowed&&<p role="status">{permissions}</p>}
    {error&&<p className="starboard-channel__error" role="alert">{errorMessage}</p>}
    {created&&<p className="starboard-channel__success" role="status">{created} · {ready}</p>}
  </section>;
}
