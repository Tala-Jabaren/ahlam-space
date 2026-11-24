import 'server-only'
import { cache } from 'react'
import { getAdminSession } from '@/components/admin/admin-session'
import { createAdminClient } from '@/lib/supabase/admin'
import { notificationKinds, type AdminNotificationCounts, type AdminNotificationKind } from '@/lib/admin-notification-links'

export const getAdminNotificationCounts = cache(async () => {
  await getAdminSession()
  const counts: AdminNotificationCounts = { booking: 0, session_request: 0, course_purchase: 0, order: 0, trip_application: 0, package_purchase: 0 }
  // Queue RLS deliberately denies ALL authenticated access, including admins.
  // Keep it unchanged: service-role access is server-only, AFTER the role check.
  // Missing migration/config/network must never prevent the admin from working.
  try {
    const admin = createAdminClient()
    const results = await Promise.all(notificationKinds.map(kind => admin
      .from('admin_notification_queue').select('id', { count: 'exact', head: true })
      .eq('kind', kind).is('seen_at', null)))
    if (results.some(result => result.error)) return { counts, available: false }
    results.forEach((result, index) => { counts[notificationKinds[index]] = result.count ?? 0 })
    return { counts, available: true }
  } catch {
    return { counts, available: false }
  }
})

// Pure, unfolded unseen count for exactly one kind - used where the combined
// "booking" number above would be ambiguous (e.g. telling a booking payment
// apart from a package purchase inside the same "الدفعات" tab). A second,
// cheap query rather than reusing the cache above, so this stays correct
// regardless of whatever folding that function's own callers need.
export const getUnseenNotificationCount = cache(async (kind: AdminNotificationKind): Promise<number> => {
  await getAdminSession()
  try {
    const { count, error } = await createAdminClient()
      .from('admin_notification_queue').select('id', { count: 'exact', head: true })
      .eq('kind', kind).is('seen_at', null)
    return error ? 0 : count ?? 0
  } catch {
    return 0
  }
})

// Email links contain an application ID, not private questionnaire answers.
// Resolve only its parent trip on the server, after the same admin check.
export async function resolveTripNotification(id: string) {
  await getAdminSession()
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null
  try {
    const { data, error } = await createAdminClient().from('trip_applications')
      .select('trip_id').eq('id', id).maybeSingle()
    return error ? null : data?.trip_id as string | null
  } catch {
    return null
  }
}
