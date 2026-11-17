import Link from 'next/link'
import { ArrowUpLeft, CalendarDays, Check, Plus, WalletCards } from 'lucide-react'
import { getAdminActionData } from '@/components/admin/home/action-data'

const number = new Intl.NumberFormat('ar')
const date = (value: string) => new Intl.DateTimeFormat('ar', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))

export default async function AdminPage() {
  const data = await getAdminActionData()
  const cards = [
    { label: 'دفعات الحصص', count: data.counts.bookings, href: '/admin/classes?tab=payments', action: 'راجعي الدفعات غير المدفوعة' },
    { label: 'دفعات المحاضرات والتأملات', count: data.counts.courses, href: '/admin/courses?tab=payments', action: 'راجعي الدفعات غير المدفوعة' },
    { label: 'دفعات المتجر', count: data.counts.orders, href: '/admin/products?tab=payments', action: 'راجعي الدفعات غير المدفوعة' },
    { label: 'طلبات جلسات فردية جديدة', count: data.counts.requests, href: '/admin/requests?status=pending', action: 'تابعي الطلبات الجديدة' },
    { label: 'طلبات المشاوير', count: data.counts.applications, href: '/admin/trips?review=pending', action: 'طلبات بانتظار المراجعة' },
  ]
  return <main className="mx-auto min-w-0 max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <header className="border-b border-[#617A55]/15 pb-5">
      <h1 className="font-serif text-3xl text-[#617A55] sm:text-4xl">متابعة اليوم</h1>
      <p className="mt-3 text-base leading-7 text-[#617A55]">الدفعات والطلبات التي تحتاج انتباهك، في مكان واحد.</p>
    </header>
    <section aria-label="ما يحتاج متابعة اليوم" className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map(card => <Link key={card.href} href={card.href} className="group min-w-0 rounded-2xl border border-[#617A55]/15 bg-white p-5 text-[#617A55] transition-colors hover:bg-[#D6E2B6]/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55] motion-reduce:transition-none">
        <div className="flex items-start justify-between gap-3"><h2 className="text-lg font-semibold">{card.label}</h2>{card.count === 0 ? <Check size={20} aria-hidden="true" className="shrink-0" /> : <ArrowUpLeft size={18} aria-hidden="true" className="shrink-0" />}</div>
        <span className="mt-3 block text-4xl font-semibold"><bdi>{card.count === null ? '—' : number.format(card.count)}</bdi></span>
        <p className="mt-2 text-sm leading-6">{card.count === null ? 'تعذر تحميل العدد. افتحي القسم للمراجعة.' : card.count === 0 ? 'كل شي تمام' : card.action}</p>
      </Link>)}
    </section>
    <nav aria-label="إجراءات سريعة" className="mt-5 grid gap-3 sm:flex">
      <Link href="/admin/classes?tab=types&new=1" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#617A55] px-6 py-3 text-base font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55]"><Plus size={20} aria-hidden="true" />إضافة حصة</Link>
      <Link href="/admin/classes?tab=payments" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#617A55]/30 px-6 py-3 text-base text-[#617A55] hover:bg-[#D6E2B6]/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55]"><WalletCards size={20} aria-hidden="true" />تأكيد دفعة</Link>
    </nav>
    <section className="mt-9" aria-labelledby="this-week-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#617A55]/15 pb-4"><h2 id="this-week-title" className="font-serif text-2xl text-[#617A55]">حصص هذا الأسبوع</h2><Link href="/admin/classes?tab=sessions" className="inline-flex min-h-11 items-center text-sm text-[#617A55] underline underline-offset-4">كل المواعيد</Link></div>
      {data.sessionsFailed ? <p role="alert" className="mt-4 rounded-xl bg-[#C7D6E8]/40 p-5">تعذر تحميل الحصص. افتحي المواعيد أو حاولي مجددًا.</p> : data.sessions.length === 0 ? <div className="mt-4 rounded-xl bg-[#D6E2B6]/30 p-5 text-[#617A55]"><p>لا توجد حصص مجدولة لهذا الأسبوع.</p><Link href="/admin/classes?tab=types&new=1" className="mt-2 inline-flex min-h-11 items-center underline underline-offset-4">أضيفي حصة عندما تكونين جاهزة</Link></div> : <ul className="mt-4 grid gap-3">
        {data.sessions.map(session => <li key={session.id} className="min-w-0 rounded-xl border border-[#617A55]/15 bg-white p-4 sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-5">
          <div className="min-w-0"><h3 className="break-words text-lg font-semibold text-[#617A55]">{session.classes?.name ?? 'حصة'}</h3><p className="mt-2 flex items-center gap-2 text-sm text-[#617A55]"><CalendarDays size={16} aria-hidden="true" />{date(session.session_date)}</p><p className="mt-1 text-sm text-[#617A55]"><bdi>{session.start_time.slice(0, 5)}–{session.end_time.slice(0, 5)}</bdi></p><span className="mt-3 inline-flex rounded-full bg-[#C7D6E8]/40 px-3 py-1 text-sm text-[#25311f]">المحجوز: <bdi className="ms-1">{number.format(session.booked_count)} / {number.format(session.capacity)}</bdi></span></div>
          <Link href={`/admin/classes/${session.class_id}/sessions/${session.id}/attendees`} className="mt-4 inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-full border border-[#617A55]/30 px-5 py-2 text-base font-semibold text-[#617A55] hover:bg-[#D6E2B6]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55] sm:mt-0 sm:w-auto">المشتركات</Link>
        </li>)}
      </ul>}
    </section>
  </main>
}
