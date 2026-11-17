import { getAdminNotificationCounts } from '@/components/admin/notifications/notification-data'
import AdminSidebar from '@/components/admin/sidebar/admin-sidebar'
import { getAdminSession } from '@/components/admin/admin-session'
import { getLocale } from '@/i18n/get-locale'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await getAdminSession()
  const locale = await getLocale()
  const { counts } = await getAdminNotificationCounts()

  return <AdminSidebar locale={locale} notificationCounts={counts}>{children}</AdminSidebar>
}
