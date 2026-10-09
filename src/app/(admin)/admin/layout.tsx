import Link from 'next/link'
import AdminNavLink from '@/components/admin/admin-nav-link'
import { getAdminSession } from '@/components/admin/admin-session'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await getAdminSession()

  return (
    <div className="min-h-screen bg-[#F7F6F0] text-[#25311f]" dir="rtl">
      <header className="sticky top-0 z-40 border-b border-[#617A55]/15 bg-[#F7F6F0]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/admin"
              className="font-serif text-2xl text-[#617A55]"
            >
              Ahlam Space
            </Link>
            <span className="rounded-full bg-[#D6E2B6] px-3 py-1 text-xs font-semibold text-[#617A55]">
              الإدارة
            </span>
          </div>
          <nav
            className="flex items-center gap-2 overflow-x-auto"
            aria-label="تنقل الإدارة"
          >
            <AdminNavLink href="/admin">الرئيسية</AdminNavLink>
            <AdminNavLink href="/admin/payments">المدفوعات</AdminNavLink>
            <AdminNavLink href="/admin/orders">الطلبات</AdminNavLink>
            <AdminNavLink href="/admin/products">المنتجات</AdminNavLink>
            <AdminNavLink href="/admin/requests">طلبات الجلسات</AdminNavLink>
          </nav>
        </div>
      </header>
      {children}
    </div>
  )
}
