import { getAdminNotificationCounts } from '@/components/admin/notifications/notification-data'
import AdminSidebar from '@/components/admin/sidebar/admin-sidebar'
import { hasPrimaryAdminAccess } from '@/components/admin/admin-session'
import { getLocale } from '@/i18n/get-locale'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // This layout re-runs on every admin navigation, so these two
  // independent round trips (an RPC call, six count queries) ran one
  // after another on every single page load until now - locale is a
  // plain cookie read, no network call, so it doesn't need to join them.
  const [isPrimaryAdmin, { counts }] = await Promise.all([
    hasPrimaryAdminAccess(),
    getAdminNotificationCounts(),
  ])
  const locale = await getLocale()

  return <AdminSidebar locale={locale} notificationCounts={counts} isPrimaryAdmin={isPrimaryAdmin}>{children}</AdminSidebar>
}
