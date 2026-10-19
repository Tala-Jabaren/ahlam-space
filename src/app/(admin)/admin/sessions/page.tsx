import AdminDeleteButton from '@/components/admin/admin-delete-button'
import { getAdminSession } from '@/components/admin/admin-session'
import { CreateSession, SessionControls, type SessionRecord, type BookingContact } from '@/components/admin/session-controls'
import type { ClassRecord } from '@/components/admin/catalog-editor'

const statuses: Record<string, string> = { scheduled: 'مجدول', cancelled: 'ملغى', completed: 'مكتمل' }

export default async function AdminSessionsPage() {
  const supabase = await getAdminSession()
  const now = new Date()
  const dateParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const part = (type: string) => dateParts.find(item => item.type === type)?.value
  const today = `${part('year')}-${part('month')}-${part('day')}`
  const clock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(now)
  const { data: sessions, error } = await supabase.from('class_sessions').select('id, session_date, start_time, end_time, capacity, booked_count, status, classes(name)').gte('session_date', today).order('session_date').order('start_time').returns<SessionRecord[]>()
  const { data: classes, error: classesError } = await supabase.from('classes').select('id, name, description, category, is_active, duration_minutes').eq('is_active', true).order('name').returns<ClassRecord[]>()
  const upcoming = (sessions || []).filter(session => session.session_date > today || session.end_time > clock)
  const cancelledIds = upcoming.filter(session => session.status === 'cancelled').map(session => session.id)
  const bookings = cancelledIds.length ? await supabase.from('bookings').select('id, session_id, profiles(full_name, phone)').in('session_id', cancelledIds).in('status', ['pending', 'confirmed']).returns<BookingContact[]>() : { data: [], error: null }

  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <h1 className="border-b border-[#617A55]/15 pb-6 font-serif text-3xl text-[#617A55]">مواعيد الحصص</h1>
    {classesError ? <p role="alert" className="mt-6 rounded-lg bg-[#C7D6E8]/50 p-5">تعذر تحميل الحصص لإنشاء موعد.</p> : <CreateSession classes={classes || []} today={today} />}
    {!classesError && !classes?.length && <p className="mb-5 text-sm">لا توجد حصص نشطة لإنشاء موعد.</p>}
    {error ? <p role="alert" className="rounded-lg bg-[#C7D6E8]/50 p-5">تعذر تحميل المواعيد. تحققي من الاتصال وصلاحيات العرض.</p> : !upcoming.length ? <p className="bg-[#D6E2B6]/40 p-5">لا توجد مواعيد قادمة.</p> : <div className="grid gap-5 lg:grid-cols-2">{upcoming.map(session => <article key={session.id} className="min-w-0 rounded-lg border border-[#617A55]/15 bg-white p-5"><header className="flex flex-wrap items-center justify-between gap-2"><h2 className="break-words text-xl font-semibold text-[#617A55]">{session.classes?.name || 'حصة غير متاحة'}</h2><div className="flex items-start gap-2"><span className="rounded-full bg-[#D6E2B6]/60 px-3 py-1 text-xs">{statuses[session.status] || session.status}</span><AdminDeleteButton kind="session" id={session.id} label={`${session.classes?.name || 'حصة'} / ${session.session_date}`} /></div></header><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-[#617A55]">التاريخ</dt><dd>{new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${session.session_date}T00:00:00Z`))}</dd></div><div><dt className="text-[#617A55]">الوقت</dt><dd dir="ltr" className="text-right">{session.start_time.slice(0, 5)} – {session.end_time.slice(0, 5)}</dd></div><div className="col-span-2"><dt className="text-[#617A55]">الحجوزات / السعة</dt><dd><bdi>{session.booked_count} / {session.capacity}</bdi></dd></div></dl><SessionControls session={session} contacts={(bookings.data || []).filter(item => item.session_id === session.id)} contactsError={Boolean(bookings.error)} /></article>)}</div>}
  </main>
}
