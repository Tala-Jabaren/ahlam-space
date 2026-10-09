import Link from 'next/link'
import { getAdminSession } from '@/components/admin/admin-session'

export default async function AdminPage() {
  const supabase = await getAdminSession()
  const [orders, bookings, courses, requests] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('payment_status', 'unpaid').neq('status', 'cancelled'),
    supabase.from('course_purchases').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('session_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ])
  const summaries = [
    { label: 'طلبات متجر غير مدفوعة', result: orders, href: '/admin/payments?tab=order&filter=unpaid' },
    { label: 'حجوزات غير مدفوعة', result: bookings, href: '/admin/payments?tab=booking&filter=unpaid' },
    { label: 'مشتريات كورسات غير مدفوعة', result: courses, href: '/admin/payments?tab=course&filter=unpaid' },
    { label: 'طلبات جلسات جديدة', result: requests, href: '/admin/requests' },
  ]

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b border-[#617A55]/15 pb-6">
        <h1 className="font-serif text-3xl text-[#617A55] sm:text-4xl">ملخص الإدارة</h1>
        <p className="mt-3 leading-7 text-[#617A55]">المدفوعات المعلّقة وطلبات الجلسات الجديدة.</p>
      </header>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaries.map((summary) => (
          <Link key={summary.href} href={summary.href} className="min-w-0 rounded-lg border border-[#617A55]/15 bg-white p-5 transition hover:bg-[#D6E2B6]/35 focus-visible:outline-2 focus-visible:outline-[#617A55]">
            <span className="block text-sm leading-6 text-[#617A55]">{summary.label}</span>
            <span className="mt-4 block text-3xl font-semibold text-[#617A55]">
              {summary.result.error ? '—' : new Intl.NumberFormat('ar').format(summary.result.count ?? 0)}
            </span>
            {summary.result.error && <span className="mt-2 block text-sm text-[#617A55]">تعذر تحميل العدد.</span>}
          </Link>
        ))}
      </div>
    </main>
  )
}
