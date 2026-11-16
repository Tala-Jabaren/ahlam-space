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
}

export const adminNavItems: readonly AdminNavItem[] = [
  { href: '/admin', label: { ar: 'الرئيسية', en: 'Home' }, icon: 'home', group: 'overview' },
  { href: '/admin/classes', label: { ar: 'الحصص والمواعيد', en: 'Classes & sessions' }, icon: 'calendar', group: 'programs' },
  { href: '/admin/requests', label: { ar: 'طلبات الجلسات الفردية', en: 'Private session requests' }, icon: 'flower', group: 'programs' },
  { href: '/admin/courses', label: { ar: 'المحاضرات والتأملات', en: 'Lectures & meditations' }, icon: 'book', group: 'programs' },
  { href: '/admin/trips', label: { ar: 'المشاوير', en: 'Trips' }, icon: 'compass', group: 'programs' },
  { href: '/admin/products', label: { ar: 'المنتجات', en: 'Products' }, icon: 'shop', group: 'sales' },
  { href: '/admin/orders', label: { ar: 'الطلبات', en: 'Orders' }, icon: 'package', group: 'sales' },
  { href: '/admin/payments', label: { ar: 'الدفعات', en: 'Payments' }, icon: 'wallet', group: 'sales' },
  { href: '/admin/customers', label: { ar: 'الزبائن', en: 'Customers' }, icon: 'users', group: 'community' },
  { href: '/admin/reviews', label: { ar: 'آراء المشاركات', en: 'Reviews' }, icon: 'reviews', group: 'community' },
]
