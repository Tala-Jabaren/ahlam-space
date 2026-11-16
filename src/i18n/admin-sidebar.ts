import type { Locale } from './config'

export const adminSidebarCopy = {
  ar: {
    title: 'الإدارة',
    navigation: 'تنقّل الإدارة',
    open: 'فتح قائمة الإدارة',
    close: 'إغلاق قائمة الإدارة',
    administrator: 'مديرة الموقع',
    backToSite: 'العودة للموقع',
  },
  en: {
    title: 'Administration',
    navigation: 'Admin navigation',
    open: 'Open admin menu',
    close: 'Close admin menu',
    administrator: 'Administrator',
    backToSite: 'Back to website',
  },
} satisfies Record<Locale, Record<string, string>>
