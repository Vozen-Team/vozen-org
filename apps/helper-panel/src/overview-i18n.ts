import {helperLocale,type SupportedLocale} from './i18n';

const languages=['pt','fr','es','de','tr','ar','zh','ru','ko'] as const;
const copy={
  'XP card':['Cartão de XP','Carte XP','Tarjeta de XP','XP-Karte','XP kartı','بطاقة الخبرة','經驗值卡片','Карточка XP','XP 카드'],
  'Your choices':['As tuas escolhas','Vos choix','Tus opciones','Deine Einstellungen','Seçimlerin','اختياراتك','你的選擇','Ваши настройки','내 설정'],
  'Server snapshot':['Resumo do servidor','Aperçu du serveur','Resumen del servidor','Serverüberblick','Sunucu özeti','ملخص الخادم','伺服器摘要','Сводка сервера','서버 요약'],
  'Records':['Registos','Entrées','Registros','Einträge','Kayıtlar','السجلات','紀錄','Записи','기록'],
  'Helper actions':['Ações do Helper','Actions du Helper','Acciones del Helper','Helper-Aktionen','Helper işlemleri','إجراءات Helper','Helper 動作','Действия Helper','Helper 활동'],
  'Up to {limit} recent records':['Até {limit} registos recentes','Jusqu’à {limit} entrées récentes','Hasta {limit} registros recientes','Bis zu {limit} aktuelle Einträge','En fazla {limit} son kayıt','حتى {limit} من أحدث السجلات','最多 {limit} 筆近期紀錄','До {limit} последних записей','최근 기록 최대 {limit}개'],
  'Colours and background':['Cores e fundo','Couleurs et arrière-plan','Colores y fondo','Farben und Hintergrund','Renkler ve arka plan','الألوان والخلفية','色彩和背景','Цвета и фон','색상과 배경'],
  'Open Bot Profile':['Abrir perfil do bot','Ouvrir le profil du bot','Abrir el perfil del bot','Bot-Profil öffnen','Bot profilini aç','فتح ملف البوت','開啟機器人個人檔案','Открыть профиль бота','봇 프로필 열기'],
  'Levels & XP':['Níveis e XP','Niveaux et XP','Niveles y XP','Level und XP','Seviyeler ve XP','المستويات والخبرة','等級與經驗值','Уровни и XP','레벨 및 XP'],
  'On':['Ativo','Activé','Activado','Aktiv','Açık','مفعّل','已啟用','Включено','켜짐'],
  'Off':['Desligado','Désactivé','Desactivado','Inaktiv','Kapalı','غير مفعّل','已停用','Выключено','꺼짐'],
  'Unavailable':['Indisponível','Indisponible','No disponible','Nicht verfügbar','Kullanılamıyor','غير متاح','無法使用','Недоступно','사용 불가'],
} as const satisfies Record<string,readonly [string,string,string,string,string,string,string,string,string]>;

export function overviewText(key:keyof typeof copy,locale:SupportedLocale=helperLocale()):string {
  return locale==='en'?key:copy[key][languages.indexOf(locale)];
}
