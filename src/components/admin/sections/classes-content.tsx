import Link from 'next/link'
import CreateClassForm from '@/components/admin/create-class-form'
import AdminDeleteButton from '@/components/admin/admin-delete-button'
import AddSessionForm from '@/components/admin/add-session-form'
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

// The weekly day/time a recurring class meets on is a real column
// (classes.weekday / default_start_time), read directly from the class
// itself rather than inferred from its past sessions.
function recurrenceLabel(item: ClassRow): string | null {
  if (!item.is_recurring || item.weekday == null || !item.default_start_time) return null
  return `كل ${weekdayNames[item.weekday]} - ${item.default_start_time.slice(0, 5)}`
}

export default async function ClassesContent({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; classId?: string }>
}) {
  const { tab: tabParam, classId: classIdParam } = await searchParams
  const tab = tabParam === 'types' ? 'types' : 'sessions'
  const supabase = await getAdminSession()

  const { data: classes, error: classesError } = await supabase
    .from('classes')
    .select('id, name, description, category, is_active, duration_minutes, price, image_url, is_recurring, weekday, default_start_time')
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

  return (
    <div>
      {tab === 'sessions' ? (
        <SessionsTab
          sessions={sessions ?? []}
          classes={classes ?? []}
          attendeeCounts={attendeeCounts}
          contactsBySession={contactsBySession}
          contactsError={Boolean(bookings.error)}
          today={today}
          loadError={Boolean(sessionsError)}
          initialClassId={classIdParam || 'all'}
        />
      ) : (
        <div>
          <CreateClassForm today={today} />
          {classesError ? (
            <p role="alert" className="rounded-lg bg-[#C7D6E8]/50 p-5">تعذر تحميل الحصص. تحققي من صلاحيات العرض والاتصال.</p>
          ) : !classes?.length ? (
            <p className="p-5">لا توجد حصص بعد.</p>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {classes.map((item) => {
                const schedule = recurrenceLabel(item)
                return (
                  <article key={item.id} className="min-w-0 rounded-lg border border-[#617A55]/15 bg-white p-5">
                    <header className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {item.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image_url} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
                        )}
                        <h2 className="min-w-0 break-words text-xl font-semibold text-[#617A55]">{item.name}</h2>
                      </div>
                      <AdminDeleteButton kind="class" id={item.id} label={item.name} />
                    </header>
                    <p className="my-2 flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-[#617A55]">{categories[item.category || ''] || (schedule ? 'حصة دائمة' : 'حصة لمرة واحدة')}</span>
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
                    <AddSessionForm classId={item.id} durationMinutes={item.duration_minutes} today={today} />
                    <div className="mt-4"><CatalogEditor kind="class" record={item} /></div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
