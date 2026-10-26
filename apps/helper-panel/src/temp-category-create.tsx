import {useEffect,useRef,useState} from 'react';
import {api,type GuildContext} from './api';
import {helperLocale} from './i18n';
import {validStarboardName} from './starboard-channel';
import './starboard-channel.css';

const copy:Record<string,string[]>={
  en:['Or create a category','Create category','Creating…','Inherits server permissions. Selected automatically.','Use 2–80 unaccented letters, numbers, hyphens or underscores.','Could not confirm creation. Check Discord and Manage Channels permission before retrying.','Refresh Discord resources and check Helper’s Manage Channels permission.',"Category and Creator Channel ready.","Category created, but Creator Channel could not be confirmed. Check Discord before retrying.","Finish setup"],
  pt:['Ou cria uma categoria','Criar categoria','A criar…','Herda as permissões do servidor. Selecionada automaticamente.','Usa 2–80 letras sem acentos, números, hífenes ou underscores.','Não foi possível confirmar a criação. Verifica o Discord e a permissão Gerir canais antes de repetir.','Atualiza os recursos Discord e verifica a permissão Gerir canais do Helper.',"Categoria e Creator Channel prontos.","Categoria criada, mas o Creator Channel não foi confirmado. Verifica o Discord antes de repetir.","Concluir configuração"],
  fr:['Ou créer une catégorie','Créer une catégorie','Création…','Hérite des permissions du serveur. Sélection automatique.','Utilisez 2 à 80 lettres sans accent, chiffres, tirets ou underscores.','Création non confirmée. Vérifiez Discord et la permission Gérer les salons avant de réessayer.','Actualisez les ressources Discord et vérifiez la permission Gérer les salons de Helper.',"Catégorie et Creator Channel prêts.","Catégorie créée, mais Creator Channel non confirmé. Vérifie Discord avant de réessayer.","Terminer la configuration"],
  es:['O crea una categoría','Crear categoría','Creando…','Hereda los permisos del servidor. Se selecciona automáticamente.','Usa entre 2 y 80 letras sin acentos, números, guiones o guiones bajos.','No se pudo confirmar la creación. Revisa Discord y el permiso Gestionar canales antes de reintentar.','Actualiza los recursos de Discord y revisa el permiso Gestionar canales de Helper.',"Categoría y Creator Channel listos.","Categoría creada, pero no se confirmó Creator Channel. Revisa Discord antes de reintentar.","Completar configuración"],
  de:['Oder eine Kategorie erstellen','Kategorie erstellen','Wird erstellt…','Übernimmt die Serverberechtigungen. Wird automatisch ausgewählt.','Nutze 2–80 Buchstaben ohne Akzente, Ziffern, Bindestriche oder Unterstriche.','Erstellung nicht bestätigt. Prüfe Discord und die Berechtigung Kanäle verwalten vor einem erneuten Versuch.','Aktualisiere die Discord-Ressourcen und prüfe Helpers Berechtigung Kanäle verwalten.',"Kategorie und Creator Channel bereit.","Kategorie erstellt, Creator Channel nicht bestätigt. Prüfe Discord vor einem erneuten Versuch.","Einrichtung abschließen"],
  tr:['Veya kategori oluştur','Kategori oluştur','Oluşturuluyor…','Sunucu izinlerini devralır. Otomatik seçilir.','2–80 aksansız harf, rakam, tire veya alt çizgi kullanın.','Oluşturma doğrulanamadı. Tekrar denemeden önce Discord’u ve Kanalları Yönet iznini kontrol edin.','Discord kaynaklarını yenileyin ve Helper’ın Kanalları Yönet iznini kontrol edin.',"Kategori ve Creator Channel hazır.","Kategori oluşturuldu ancak Creator Channel doğrulanamadı. Yeniden denemeden önce Discord’u kontrol et.","Kurulumu tamamla"],
  ar:['أو أنشئ فئة','إنشاء فئة','جارٍ الإنشاء…','ترث أذونات الخادم ويتم اختيارها تلقائياً.','استخدم 2–80 حرفاً لاتينياً دون تشكيل أو أرقاماً أو شرطات.','تعذر تأكيد الإنشاء. تحقق من Discord وإذن إدارة القنوات قبل إعادة المحاولة.','حدّث موارد Discord وتحقق من إذن إدارة القنوات لدى Helper.',"الفئة وCreator Channel جاهزان.","تم إنشاء الفئة، لكن لم يتم تأكيد Creator Channel. تحقق من Discord قبل إعادة المحاولة.","إكمال الإعداد"],
  zh:['或建立分類','建立分類','建立中…','繼承伺服器權限，並自動選取。','使用 2–80 個不含重音的英文字母、數字、連字號或底線。','無法確認建立結果。重試前請檢查 Discord 和管理頻道權限。','重新整理 Discord 資源，並檢查 Helper 的管理頻道權限。',"分類和 Creator Channel 已就緒。","分類已建立，但無法確認 Creator Channel。重試前請檢查 Discord。","完成設定"],
  ru:['Или создайте категорию','Создать категорию','Создание…','Наследует права сервера. Выбирается автоматически.','Используйте 2–80 латинских букв без диакритики, цифры, дефисы или подчёркивания.','Не удалось подтвердить создание. Перед повтором проверьте Discord и право управления каналами.','Обновите ресурсы Discord и проверьте право Helper на управление каналами.',"Категория и Creator Channel готовы.","Категория создана, но Creator Channel не подтверждён. Проверь Discord перед повтором.","Завершить настройку"],
  ko:['또는 카테고리 만들기','카테고리 만들기','만드는 중…','서버 권한을 상속하며 자동으로 선택됩니다.','악센트 없는 영문자, 숫자, 하이픈 또는 밑줄 2–80자를 사용하세요.','생성을 확인하지 못했습니다. 다시 시도하기 전에 Discord와 채널 관리 권한을 확인하세요.','Discord 리소스를 새로 고치고 Helper의 채널 관리 권한을 확인하세요.',"카테고리와 Creator Channel이 준비되었습니다.","카테고리는 만들었지만 Creator Channel을 확인하지 못했습니다. 재시도 전에 Discord를 확인하세요.","설정 완료하기"],
};
const flow:Record<string,string>={
  en:"Creating a category also sets up Creator Channel. Join it to get your room. Empty rooms are deleted automatically.",
  pt:"Criar uma categoria configura também o Creator Channel. Entra nele para teres a tua sala. As salas vazias são apagadas automaticamente.",
  fr:"Créer une catégorie configure aussi Creator Channel. Rejoins-le pour obtenir ton salon. Les salons vides sont supprimés automatiquement.",
  es:"Crear una categoría también configura Creator Channel. Entra para obtener tu sala. Las salas vacías se eliminan automáticamente.",
  de:"Beim Erstellen einer Kategorie wird auch Creator Channel eingerichtet. Tritt bei, um deinen Raum zu erhalten. Leere Räume werden automatisch gelöscht.",
  tr:"Kategori oluşturulduğunda Creator Channel da kurulur. Kendi odan için kanala katıl. Boş odalar otomatik silinir.",
  ar:"يؤدي إنشاء فئة أيضاً إلى إعداد Creator Channel. انضم إليه للحصول على غرفتك. تُحذف الغرف الفارغة تلقائياً.",
  zh:"建立分類時也會設定 Creator Channel。加入後會建立你的房間，空房間會自動刪除。",
  ru:"При создании категории также настраивается Creator Channel. Войди в него, чтобы получить свою комнату. Пустые комнаты удаляются автоматически.",
  ko:"카테고리를 만들면 Creator Channel도 설정됩니다. 참가하면 나만의 방이 생기며 빈 방은 자동 삭제됩니다.",
};
export function canCreateTempCategory(context:GuildContext|null){
  if(!context||context.stale||!context.bot?.available)return false;
  try{const bits=BigInt(context.bot.permissions??'0');return bits>=0n&&(bits&24n)!==0n;}catch{return false;}
}
export function TempCategoryCreate({context,onCreated}:{context:GuildContext|null;onCreated:(category:GuildContext['channels'][number])=>void}){
  const [name,setName]=useState('temporary-rooms');
  const [busy,setBusy]=useState(false);
  const [created,setCreated]=useState('');
  const [partialName,setPartialName]=useState('');
  const [error,setError]=useState(false);
  const alive=useRef(true),submitting=useRef(false);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const [title,createLabel,creating,help,hint,errorMessage,permissions,ready,partialMessage,retryLabel]=copy[helperLocale()]??copy.en;
  const allowed=canCreateTempCategory(context);
  async function create(){
    if(!context||!allowed||submitting.current||!validStarboardName(name))return;
    submitting.current=true;setBusy(true);setError(false);
    try{
      const result=await api.createTempCategory(context.guildId,name.trim().toLowerCase());
      if(!alive.current)return;
      if(result.guildId!==context.guildId||result.channel.type!==4||!result.channel.id||!result.channel.name)throw new Error('invalid_category_response');
      onCreated({id:result.channel.id,name:result.channel.name,type:'category'});
      setPartialName(result.channel.name);
      const creator=result.creatorChannel;
      if(!creator||result.creatorError||creator.guildId!==context.guildId||creator.type!==2||creator.parentId!==result.channel.id||!creator.id||creator.id===result.channel.id||!creator.name)throw new Error('creator_not_ready');
      setPartialName('');setCreated(result.channel.name);
    }catch{if(alive.current)setError(true);}
    finally{submitting.current=false;if(alive.current)setBusy(false);}
  }
  return <section className="starboard-channel temp-category-create" aria-label={createLabel}>
    <p>{flow[helperLocale()]??flow.en}</p>
    {!created&&<><div className="ticket-channel-create__row"><label className="field"><span>{title}</span><input value={name} maxLength={80} disabled={busy||Boolean(partialName)} aria-invalid={!validStarboardName(name)} onChange={event=>setName(event.target.value)}/>{!validStarboardName(name)&&<small>{hint}</small>}</label><button type="button" className="secondary" disabled={busy||!allowed||!validStarboardName(name)} onClick={()=>void create()}>{busy?creating:partialName?retryLabel:createLabel}</button></div><p>{help}</p></>}
    {!allowed&&<p role="status">{permissions}</p>}
    {error&&<p className="starboard-channel__error" role="alert">{partialName?partialMessage:errorMessage}</p>}
    {created&&<p className="starboard-channel__success" role="status">{created} · {ready}</p>}
  </section>;
}
