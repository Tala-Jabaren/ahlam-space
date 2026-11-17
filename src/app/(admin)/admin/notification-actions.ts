'use server'

import { revalidatePath } from 'next/cache'
import { getAdminSession } from '@/components/admin/admin-session'
import { createAdminClient } from '@/lib/supabase/admin'
import { notificationKinds, type AdminNotificationKind } from '@/lib/admin-notification-links'

export async function markAdminNotificationSeen(kind: AdminNotificationKind, id: string) {
  // Never trust a layout check or a client-provided role for an action.
  await getAdminSession()
  if (!notificationKinds.includes(kind) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return false
  try {
    const { error } = await createAdminClient().from('admin_notification_queue')
      .update({ seen_at: new Date().toISOString() })
      .eq('kind', kind).eq('ref_id', id).is('seen_at', null)
    if (error) return false // Includes the pre-migration missing-column case.
  } catch {
    return false
  }
  revalidatePath('/admin', 'layout')
  return true
}
