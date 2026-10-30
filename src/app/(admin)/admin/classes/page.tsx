import Link from 'next/link'
import AdminDeleteButton from '@/components/admin/admin-delete-button'
import { getAdminSession } from '@/components/admin/admin-session'
import CatalogEditor, { type ClassRecord } from '@/components/admin/catalog-editor'
import { getSessionAttendees, isActiveAttendee } from '@/lib/admin-session-attendees'

const categories: Record<string, string> = { yoga: 'يوغا', fitness: 'لياقة', dance: 'رقص' }
const sessionStatuses: Record<string, string> = { scheduled: 'مجدول', cancelled: 'ملغى', completed: 'مكتمل' }
// How far back "recent" sessions reach - combined with no upper bound on
// the future side, this shows the admin the last two weeks plus everything
// still to come, without an ever-growing unbounded history.
const RECENT_DAYS = 14

type SessionSummary = {
  id: string
  class_id: string
  session_date: string
  start_time: string
  end_time: string
  capacity: number
  booked_count: number
  status: string
}

function windowStartDate() {
  const date = new Date()
  date.setDate(date.getDate() - RECENT_DAYS)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export default async function AdminClassesPage() {
  const supabase = await getAdminSession()
  const { data, error } = await supabase.from('classes').select('id, name, description, category, is_active, duration_minutes').order('name').returns<ClassRecord[]>()

  const { data: sessions, error: sessionsError } = await supabase
    .from('class_sessions')
    .select('id, class_id, session_date, start_time, end_time, capacity, booked_count, status')
    .gte('session_date', windowStartDate())
    .order('session_date')
    .order('start_time')
    .returns<SessionSummary[]>()

  // Attendee counts need the admin RPC (RLS hides other members' bookings
  // from a plain authenticated-client query, same reason admin_list_customers
  // etc. exist) - fetched once per session, in parallel, reusing
  // admin_list_session_attendees rather than adding a second counting
  // function. Fine at this page's scale (a couple of weeks of sessions
  // across all classes); if the session volume grows much larger a
  // dedicated batch-count RPC would be worth adding.
  const attendeeCounts = new Map<string, number>()
  if (sessions?.length) {
    const results = await Promise.all(
      sessions.map(async (session) => {
        try {
          const rows = await getSessionAttendees(supabase, session.id)
          return [session.id, rows.filter(isActiveAttendee).length] as const
        } catch {
          return [session.id, null] as const
        }
      })
    )
    for (const [sessionId, count] of results) {
      if (count !== null) attendeeCounts.set(sessionId, count)
    }
  }

  const sessionsByClass = new Map<string, SessionSummary[]>()
  for (const session of sessions ?? []) {
    const list = sessionsByClass.get(session.class_id) ?? []
    list.push(session)
    sessionsByClass.set(session.class_id, list)
  }

  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <h1 className="border-b border-[#617A55]/15 pb-6 font-serif text-3xl text-[#617A55]">الحصص</h1>
    {error ? <p role="alert" className="mt-6 rounded-lg bg-[#C7D6E8]/50 p-5">تعذر تحميل الحصص. تحققي من صلاحيات العرض والاتصال.</p> : !data?.length ? <p className="mt-6 p-5">لا توجد حصص بعد.</p> : <div className="mt-6 grid gap-5 lg:grid-cols-2">{data.map(item => {
      const classSessions = sessionsByClass.get(item.id) ?? []
      return (
        <article key={item.id} className="min-w-0 rounded-lg border border-[#617A55]/15 bg-white p-5">
          <header className="flex items-start justify-between gap-3"><h2 className="min-w-0 break-words text-xl font-semibold text-[#617A55]">{item.name}</h2><AdminDeleteButton kind="class" id={item.id} label={item.name} /></header>
          <p className="my-2 text-sm text-[#617A55]">{categories[item.category || ''] || 'بدون فئة'} · {item.is_active ? 'نشطة' : 'غير نشطة'}</p>
          <p className="mb-4 whitespace-pre-wrap break-words text-sm leading-7">{item.description}</p>
          <CatalogEditor kind="class" record={item} />

          <div className="mt-5 border-t border-[#617A55]/10 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#617A55]/70">
              المواعيد (آخر {RECENT_DAYS} يومًا والقادمة)
            </p>
            {sessionsError ? (
              <p role="alert" className="rounded-lg bg-[#C7D6E8]/50 p-3 text-sm">تعذر تحميل المواعيد.</p>
            ) : classSessions.length === 0 ? (
              <p className="text-sm text-[#617A55]/70">لا توجد مواعيد ضمن هذه الفترة.</p>
            ) : (
              <ul className="space-y-2">
                {classSessions.map((session) => (
                  <li key={session.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#617A55]/10 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <span className="font-medium">
                        {new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${session.session_date}T00:00:00Z`))}
                      </span>
                      {' · '}
                      <span dir="ltr">{session.start_time.slice(0, 5)}–{session.end_time.slice(0, 5)}</span>
                      {' · '}
                      <span className="text-[#617A55]/70">{sessionStatuses[session.status] ?? session.status}</span>
                      {' · '}
                      <span className="text-[#617A55]/70"><bdi>{session.booked_count}/{session.capacity}</bdi></span>
                    </div>
                    <Link
                      href={`/admin/classes/${item.id}/sessions/${session.id}/attendees`}
                      className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-full bg-[#617A55] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#617A55]/85"
                    >
                      المسجلات ({attendeeCounts.has(session.id) ? attendeeCounts.get(session.id) : '—'})
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </article>
      )
    })}</div>}
  </main>
}
