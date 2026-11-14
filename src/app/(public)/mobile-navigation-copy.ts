import type { Locale } from '@/i18n/config'

// Header-only copy; the shared navigation labels still come from the site dictionary.
const copy = {
  ar: {
    open: 'فتح القائمة',
    close: 'إغلاق القائمة',
    navigation: 'قائمة التنقّل',
    language: 'لغة الموقع',
    signUp: 'إنشاء حساب',
  },
  en: {
    open: 'Open menu',
    close: 'Close menu',
    navigation: 'Navigation menu',
    language: 'Site language',
    signUp: 'Create an account',
  },
}

export function mobileNavigationCopy(locale: Locale) {
  return copy[locale]
}
