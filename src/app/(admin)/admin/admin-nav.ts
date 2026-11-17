import type { AdminNotificationKind } from '@/lib/admin-notification-links'
import type { Locale } from '@/i18n/config'

// Regroup or relabel the existing routes here; the sidebar reads only this file.
export const adminNavGroups = [
  { id: 'overview', label: { ar: 'الإدارة', en: 'Overview' } },
  { id: 'programs', label: { ar: 'البرامج والحجوزات', en: 'Programs & bookings' } },
  { id: 'sales', label: { ar: 'المتجر والدفعات', en: 'Shop & payments' } },
  { id: 'community', label: { ar: 'المجتمع', en: 'Community' } },
] as const

export type AdminNavGroup = (typeof adminNavGroups)[number]['id']
export type AdminNavIcon = 'home' | 'calendar' | 'flower' | 'book' | 'compass' | 'shop' | 'package' | 'wallet' | 'users' | 'reviews'
export type AdminNavItem = {
  label: Record<Locale, string>
  href: string
  icon: AdminNavIcon
  group: AdminNavGroup
  notificationKind?: AdminNotificationKind
}

export const adminNavItems: readonly AdminNavItem[] = [
  { href: '/admin', label: { ar: 'الرئيسية', en: 'Home' }, icon: 'home', group: 'overview' },
  { href: '/admin/classes', label: { ar: 'الحصص', en: 'Classes' }, icon: 'calendar', group: 'programs', notificationKind: 'booking' },
  { href: '/admin/requests', label: { ar: 'الجلسات الفردية', en: 'Private sessions' }, icon: 'flower', group: 'programs', notificationKind: 'session_request' },
  { href: '/admin/courses', label: { ar: 'المحاضرات والتأملات', en: 'Lectures & meditations' }, icon: 'book', group: 'programs', notificationKind: 'course_purchase' },
  { href: '/admin/trips', label: { ar: 'المشاوير', en: 'Trips' }, icon: 'compass', group: 'programs', notificationKind: 'trip_application' },
  { href: '/admin/products', label: { ar: 'المتجر', en: 'Shop' }, icon: 'shop', group: 'sales', notificationKind: 'order' },
  { href: '/admin/customers', label: { ar: 'الزبائن', en: 'Customers' }, icon: 'users', group: 'community' },
  { href: '/admin/reviews', label: { ar: 'آراء المشاركات', en: 'Reviews' }, icon: 'reviews', group: 'community' },
]
