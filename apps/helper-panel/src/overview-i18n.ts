import {helperLocale,type SupportedLocale} from './i18n';

const languages=['pt','fr','es','de','tr','ar','zh','ru','ko'] as const;
const copy={
  'Plan limits':['Limites do plano','Limites du forfait','Límites del plan','Tariflimits','Plan limitleri','حدود الخطة','方案限制','Лимиты плана','요금제 한도'],
  'XP card':['Cartão de XP','Carte XP','Tarjeta de XP','XP-Karte','XP kartı','بطاقة الخبرة','經驗值卡片','Карточка XP','XP 카드'],
  'Shortcuts':['Atalhos','Raccourcis','Accesos directos','Schnellzugriffe','Kısayollar','اختصارات','捷徑','Быстрые действия','바로가기'],
  'Quick setup':['Configuração rápida','Configuration rapide','Configuración rápida','Schnelleinrichtung','Hızlı kurulum','الإعداد السريع','快速設定','Быстрая настройка','빠른 설정'],
  'Levels & XP':['Níveis e XP','Niveaux et XP','Niveles y XP','Level und XP','Seviyeler ve XP','المستويات والخبرة','等級與經驗值','Уровни и XP','레벨 및 XP'],
  'On':['Ativo','Activé','Activado','Aktiv','Açık','مفعّل','已啟用','Включено','켜짐'],
  'Off':['Desligado','Désactivé','Desactivado','Inaktiv','Kapalı','غير مفعّل','已停用','Выключено','꺼짐'],
  'Unavailable':['Indisponível','Indisponible','No disponible','Nicht verfügbar','Kullanılamıyor','غير متاح','無法使用','Недоступно','사용 불가'],
} as const satisfies Record<string,readonly [string,string,string,string,string,string,string,string,string]>;

export function overviewText(key:keyof typeof copy,locale:SupportedLocale=helperLocale()):string {
  return locale==='en'?key:copy[key][languages.indexOf(locale)];
}
