// Intl locale for dates and numbers: Traditional Chinese (Taiwan) and European Portuguese, like App.tsx and activity-feed.tsx.
export function intlLocale(locale: string): string {
  return locale === 'zh' ? 'zh-TW' : locale === 'pt' ? 'pt-PT' : locale;
}
