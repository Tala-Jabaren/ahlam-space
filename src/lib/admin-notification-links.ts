// Pure routing metadata shared by the admin UI and owner emails.
export const notificationKinds = ['booking', 'session_request', 'course_purchase', 'order', 'trip_application'] as const
export type AdminNotificationKind = (typeof notificationKinds)[number]
export type AdminNotificationCounts = Record<AdminNotificationKind, number>

export const notificationDestinations: Record<AdminNotificationKind, { section: string; tab?: string }> = {
  booking: { section: '/admin/classes', tab: 'payments' },
  session_request: { section: '/admin/requests' },
  course_purchase: { section: '/admin/courses', tab: 'payments' },
  order: { section: '/admin/products', tab: 'orders' },
  trip_application: { section: '/admin/trips' },
}

export function adminNotificationHref(kind: AdminNotificationKind, id: string) {
  const { section, tab } = notificationDestinations[kind]
  const params = new URLSearchParams()
  if (tab) params.set('tab', tab)
  if (tab === 'payments') params.set('filter', 'all')
  params.set('item', id)
  return `${section}?${params}`
}
