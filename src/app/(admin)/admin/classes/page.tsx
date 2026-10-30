import Link from 'next/link'
import AdminDeleteButton from '@/components/admin/admin-delete-button'
import { getAdminSession } from '@/components/admin/admin-session'
import CatalogEditor, { type ClassRecord } from '@/components/admin/catalog-editor'
import SessionsTab, { type SessionRow } from '@/components/admin/sessions-tab'
import type { BookingContact } from '@/components/admin/session-controls'
import { getSessionAttendees, isActiveAttendee } from '@/lib/admin-session-attendees'

const categories: Record<string, string> = { yoga: 'يوغا', fitness: 'لياقة', dance: 'رقص' }
const weekdayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
// Same "recent + upcoming" window as the attendees branch: the last two
// weeks plus everything still to come, without an ever-growing history.
const RECENT_DAYS = 14

type ClassRow = ClassRecord & { price: number }

function jerusalemDate(offsetDays: number) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

// The weekly day/time a class meets on only exists as a hardcoded rule inside
// generate_weekly_class_sessions() in supabase/weekly-class-sessions.sql, not
// as a column on classes - this reads it back out of the class's own
// scheduled sessions instead of duplicating that SQL rule table in the UI.
function deriveSchedule(sessions: SessionRow[]): string | null {
  const counts = new Map<string, number>()
  for (const session of sessions) {
    if (session.status === 'cancelled') continue
    const weekday = new Date(`${session.session_date}T00:00:00Z`).getUTCDay()
    const key = `${weekday}|${session.start_time.slice(0, 5)}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  let best: string | null = null
  let bestCount = 0
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key
      bestCount = count
    }
  }
  if (!best) return null
  const [weekday, time] = best.split('|')
  return `كل ${weekdayNames[Number(weekday)]} - ${time}`
}

export default async function AdminClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; classId?: string }>
}) {
  const { tab: tabParam, classId: classIdParam } = await searchParams
  const tab = tabParam === 'types' ? 'types' : 'sessions'
  const supabase = await getAdminSession()

  const { data: classes, error: classesError } = await supabase
    .from('classes')
    .select('id, name, description, category, is_active, duration_minutes, price')
    .order('name')
    .returns<ClassRow[]>()

  const today = jerusalemDate(0)

  const { data: sessions, error: sessionsError } = await supabase
    .from('class_sessions')
    .select('id, class_id, session_date, start_time, end_time, capacity, booked_count, status, classes(name)')
    .gte('session_date', jerusalemDate(-RECENT_DAYS))
    .order('session_date')
    .order('start_time')
    .returns<SessionRow[]>()

  // Attendee counts need the admin RPC (RLS hides other members' bookings
  // from a plain authenticated-client query) - fetched once per session, in
  // parallel, reusing admin_list_session_attendees rather than adding a
  // second counting function.
  const attendeeCounts: Record<string, number> = {}
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
      if (count !== null) attendeeCounts[sessionId] = count
    }
  }

  const cancelledIds = (sessions ?? []).filter((session) => session.status === 'cancelled').map((session) => session.id)
  const bookings = cancelledIds.length
    ? await supabase
        .from('bookings')
        .select('id, session_id, profiles(full_name, phone)')
        .in('session_id', cancelledIds)
        .in('status', ['pending', 'confirmed'])
        .returns<BookingContact[]>()
    : { data: [], error: null }

  const contactsBySession: Record<string, BookingContact[]> = {}
  for (const contact of bookings.data ?? []) {
    const list = contactsBySession[contact.session_id] ?? []
    list.push(contact)
    contactsBySession[contact.session_id] = list
  }

  const sessionsByClass = new Map<string, SessionRow[]>()
  for (const session of sessions ?? []) {
    const list = sessionsByClass.get(session.class_id) ?? []
    list.push(session)
    sessionsByClass.set(session.class_id, list)
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-[#617A55]/15 pb-6">
        <h1 className="font-serif text-3xl text-[#617A55]">الحصص والمواعيد</h1>
        <nav className="mt-5 inline-flex rounded-full bg-[#D6E2B6]/40 p-1" aria-label="التبويبات">
          <Link
            href="/admin/classes?tab=sessions"
            aria-current={tab === 'sessions' ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition ${tab === 'sessions' ? 'bg-[#617A55] text-[#F7F6F0]' : 'text-[#617A55] hover:bg-white/60'}`}
          >
            المواعيد
          </Link>
          <Link
            href="/admin/classes?tab=types"
            aria-current={tab === 'types' ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition ${tab === 'types' ? 'bg-[#617A55] text-[#F7F6F0]' : 'text-[#617A55] hover:bg-white/60'}`}
          >
            أنواع الحصص
          </Link>
        </nav>
      </div>

      {tab === 'sessions' ? (
        <SessionsTab
          sessions={sessions ?? []}
          classes={classes ?? []}
          attendeeCounts={attendeeCounts}
          contactsBySession={contactsBySession}
          contactsError={Boolean(bookings.error)}
          today={today}
          loadError={Boolean(sessionsError)}
          classesError={Boolean(classesError)}
          initialClassId={classIdParam || 'all'}
        />
      ) : (
        <div className="mt-6">
          {classesError ? (
            <p role="alert" className="rounded-lg bg-[#C7D6E8]/50 p-5">تعذر تحميل الحصص. تحققي من صلاحيات العرض والاتصال.</p>
          ) : !classes?.length ? (
            <p className="p-5">لا توجد حصص بعد.</p>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {classes.map((item) => {
                const schedule = deriveSchedule(sessionsByClass.get(item.id) ?? [])
                return (
                  <article key={item.id} className="min-w-0 rounded-lg border border-[#617A55]/15 bg-white p-5">
                    <header className="flex items-start justify-between gap-3">
                      <h2 className="min-w-0 break-words text-xl font-semibold text-[#617A55]">{item.name}</h2>
                      <AdminDeleteButton kind="class" id={item.id} label={item.name} />
                    </header>
                    <p className="my-2 flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-[#617A55]">{categories[item.category || ''] || 'بدون فئة'}</span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${item.is_active ? 'bg-[#D6E2B6]/70 text-[#3f5233]' : 'bg-[#617A55]/10 text-[#617A55]/70'}`}>
                        {item.is_active ? 'نشطة' : 'غير نشطة'}
                      </span>
                    </p>
                    {schedule && <p className="mb-1 text-sm text-[#617A55]/80">{schedule}</p>}
                    <p className="mb-2 text-sm text-[#617A55]/80"><bdi>{item.duration_minutes} دقيقة · ₪{item.price}</bdi></p>
                    <p className="mb-4 whitespace-pre-wrap break-words text-sm leading-7">{item.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/classes?tab=sessions&classId=${item.id}`}
                        className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#617A55]/30 px-4 text-sm font-semibold text-[#617A55] transition hover:bg-[#D6E2B6]/40"
                      >
                        عرض مواعيدها
                      </Link>
                    </div>
                    <div className="mt-4"><CatalogEditor kind="class" record={item} /></div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
