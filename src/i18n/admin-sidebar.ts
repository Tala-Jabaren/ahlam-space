import type { Locale } from './config'

export const adminSidebarCopy = {
  ar: {
    title: 'الإدارة',
    more: 'المزيد',
    notifications: 'إشعارات جديدة',
    openMore: 'فتح المزيد من الأقسام',
    closeMore: 'إغلاق المزيد',
    mobileNavigation: 'التنقّل السريع للإدارة',
    navigation: 'تنقّل الإدارة',
    open: 'فتح قائمة الإدارة',
    close: 'إغلاق قائمة الإدارة',
    administrator: 'مديرة الموقع',
    backToSite: 'العودة للموقع',
  },
  en: {
    title: 'Administration',
    more: 'More',
    notifications: 'new notifications',
    openMore: 'Open more sections',
    closeMore: 'Close more sections',
    mobileNavigation: 'Admin quick navigation',
    navigation: 'Admin navigation',
    open: 'Open admin menu',
    close: 'Close admin menu',
    administrator: 'Administrator',
    backToSite: 'Back to website',
  },
} satisfies Record<Locale, Record<string, string>>
