import Link from 'next/link'
import { getAdminSession } from '@/components/admin/admin-session'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminNotificationHref } from '@/lib/admin-notification-links'

type PendingApplication = { id: string; full_name: string; created_at: string; trips: { title: string } | null }

export default async function PendingTripRequests() {
  await getAdminSession()
  let rows: PendingApplication[] = []
  let failed = false
  try {
    const result = await createAdminClient().from('trip_applications')
      .select('id, full_name, created_at, trips(title)').eq('status', 'pending')
      .order('created_at', { ascending: true }).returns<PendingApplication[]>()
    rows = result.data ?? []
    failed = Boolean(result.error)
  } catch { failed = true }
  return <main className="mx-auto min-w-0 max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <header className="border-b border-[#617A55]/15 pb-5"><h1 className="font-serif text-3xl text-[#617A55]">طلبات المشاوير</h1><p className="mt-3 text-base text-[#617A55]">طلبات بانتظار مراجعتك.</p><Link href="/admin/trips" className="mt-2 inline-flex min-h-11 items-center text-sm text-[#617A55] underline underline-offset-4">عرض كل المشاوير</Link></header>
    {failed ? <p role="alert" className="mt-5 rounded-xl bg-[#C7D6E8]/40 p-5">تعذر تحميل الطلبات. حاولي مرة أخرى.</p> : !rows.length ? <p className="mt-5 rounded-xl bg-[#D6E2B6]/30 p-5 text-[#617A55]">كل شي تمام، لا توجد طلبات بانتظار المراجعة.</p> : <ul className="mt-5 grid gap-4 sm:grid-cols-2">{rows.map(row => <li key={row.id} className="min-w-0 rounded-xl border border-[#617A55]/15 bg-white p-5">
      <div className="flex items-start justify-between gap-3"><h2 className="break-words text-lg font-semibold text-[#617A55]">{row.full_name}</h2><span className="shrink-0 rounded-full bg-[#C7D6E8]/50 px-3 py-1 text-xs">قيد المراجعة</span></div>
      <p className="mt-3 break-words text-sm text-[#617A55]">{row.trips?.title ?? 'مشوار'}</p><p className="mt-2 text-sm text-[#617A55]">{new Intl.DateTimeFormat('ar', { timeZone: 'Asia/Jerusalem', dateStyle: 'medium' }).format(new Date(row.created_at))}</p>
      <Link href={adminNotificationHref('trip_application', row.id)} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#617A55] px-5 py-2 text-base font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55]">مراجعة الطلب</Link>
    </li>)}</ul>}
  </main>
}
