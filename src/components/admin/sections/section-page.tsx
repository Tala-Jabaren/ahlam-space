import Link from 'next/link'
import type { ReactNode } from 'react'
import NotificationBadge from '@/components/admin/notifications/notification-badge'
import { getAdminNotificationCounts } from '@/components/admin/notifications/notification-data'
import type { AdminNotificationKind } from '@/lib/admin-notification-links'

export type AdminSection = 'classes' | 'courses' | 'shop'
const sections: Record<AdminSection, { title: string; href: string; tabs: { id: string; label: string; kind?: AdminNotificationKind }[] }> = {
  classes: { title: 'الحصص', href: '/admin/classes', tabs: [
    { id: 'sessions', label: 'المواعيد' }, { id: 'types', label: 'أنواع الحصص' }, { id: 'payments', label: 'الدفعات', kind: 'booking' },
  ] },
  courses: { title: 'المحاضرات والتأملات', href: '/admin/courses', tabs: [
    { id: 'content', label: 'المحتوى' }, { id: 'payments', label: 'الدفعات', kind: 'course_purchase' },
  ] },
  shop: { title: 'المتجر', href: '/admin/products', tabs: [
    { id: 'products', label: 'المنتجات' }, { id: 'orders', label: 'الطلبات', kind: 'order' }, { id: 'payments', label: 'الدفعات', kind: 'order' },
  ] },
}

export default async function AdminSectionPage({ section, activeTab, itemOpen, children }: { section: AdminSection; activeTab: string; itemOpen?: boolean; children: ReactNode }) {
  const definition = sections[section]
  const { counts } = await getAdminNotificationCounts()
  return <main className="mx-auto min-w-0 max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <header className="min-w-0 border-b border-[#617A55]/15 pb-5">
      <h1 className="font-serif text-3xl text-[#617A55] sm:text-4xl">{definition.title}</h1>
      <nav aria-label={`أقسام ${definition.title}`} className="mt-5 flex max-w-full gap-2 overflow-x-auto pb-2">
        {definition.tabs.map(tab => <Link key={tab.id} href={`${definition.href}?tab=${tab.id}`} aria-current={activeTab === tab.id ? 'page' : undefined} className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full px-5 py-2 text-base transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55] motion-reduce:transition-none ${activeTab === tab.id ? 'bg-[#D6E2B6] font-semibold text-[#25311f]' : 'text-[#617A55] hover:bg-[#D6E2B6]/35'}`}>
          {tab.label}{tab.kind && <NotificationBadge count={counts[tab.kind]} />}
        </Link>)}
      </nav>
    </header>
    {itemOpen && <Link href={`${definition.href}?tab=${activeTab}`} className="mt-3 inline-flex min-h-11 items-center text-sm text-[#617A55] underline underline-offset-4">عرض القائمة كاملة</Link>}
    <div className="mt-5 min-w-0">{children}</div>
  </main>
}
