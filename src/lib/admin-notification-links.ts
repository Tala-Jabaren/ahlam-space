// Pure routing metadata shared by the admin UI and owner emails.
export const notificationKinds = ['booking', 'session_request', 'course_purchase', 'order', 'trip_application', 'package_purchase'] as const
export type AdminNotificationKind = (typeof notificationKinds)[number]
export type AdminNotificationCounts = Record<AdminNotificationKind, number>

export const notificationDestinations: Record<AdminNotificationKind, { section: string; tab?: string }> = {
  booking: { section: '/admin/classes', tab: 'payments' },
  session_request: { section: '/admin/requests' },
  course_purchase: { section: '/admin/courses', tab: 'payments' },
  order: { section: '/admin/products', tab: 'orders' },
  trip_application: { section: '/admin/trips' },
  // Rendered inside the "الباقات" tab, alongside the package catalog
  // (src/components/admin/sections/package-payments.tsx) - not the
  // booking "الدفعات" tab, which only ever lists booking payments.
  package_purchase: { section: '/admin/classes', tab: 'packages' },
}

export function adminNotificationHref(kind: AdminNotificationKind, id: string) {
  const { section, tab } = notificationDestinations[kind]
  const params = new URLSearchParams()
  if (tab) params.set('tab', tab)
  if (tab === 'payments') params.set('filter', 'all')
  // PackagePayments defaults to its "unpaid" filter - force "all" so a
  // notification for an already-paid purchase doesn't land on a filtered
  // view that hides the very item it's pointing at.
  if (kind === 'package_purchase') params.set('pfilter', 'all')
  params.set('item', id)
  return `${section}?${params}`
}
