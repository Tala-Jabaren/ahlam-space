import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminSession } from '@/components/admin/admin-session'
import { getSessionAttendees } from '@/lib/admin-session-attendees'
import { classCalendarHref } from '@/lib/admin-class-calendar'
import AttendeesClient from './attendees-client'

type SessionDetail = {
  id: string
  session_date: string
  start_time: string
  end_time: string
  capacity: number
  booked_count: number
  location: string | null
  classes: { name: string } | null
}

export default async function SessionAttendeesPage({
  params,
}: {
  params: Promise<{ classId: string; sessionId: string }>
}) {
  const { classId, sessionId } = await params
  const supabase = await getAdminSession()

  const { data: session } = await supabase
    .from('class_sessions')
    .select('id, session_date, start_time, end_time, capacity, booked_count, location, classes(name)')
    .eq('id', sessionId)
    .eq('class_id', classId)
    .maybeSingle()
    .returns<SessionDetail>()

  if (!session) notFound()

  let attendees: Awaited<ReturnType<typeof getSessionAttendees>> = []
  let loadError = false
  try {
    attendees = await getSessionAttendees(supabase, sessionId)
  } catch {
    loadError = true
  }

  const dateLabel = new Intl.DateTimeFormat('ar', { dateStyle: 'full', timeZone: 'UTC' }).format(
    new Date(`${session.session_date}T00:00:00Z`)
  )
  const timeLabel = `${session.start_time.slice(0, 5)}–${session.end_time.slice(0, 5)}`

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="مسار التنقل" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-[#617A55]/80">
        <Link href={classCalendarHref(session.session_date)} className="underline-offset-4 hover:underline">العودة إلى يوم الحصة</Link>
        <span aria-hidden="true">‹</span>
        <Link href={classCalendarHref(session.session_date, classId)} className="underline-offset-4 hover:underline">{session.classes?.name ?? 'حصة'}</Link>
        <span aria-hidden="true">‹</span>
        <span>{dateLabel}</span>
        <span aria-hidden="true">‹</span>
        <span className="text-[#25311f]">المسجلات</span>
      </nav>

      <header className="rounded-lg border border-[#617A55]/15 bg-white p-5">
        <h1 className="font-serif text-2xl text-[#617A55] sm:text-3xl">{session.classes?.name ?? 'حصة'}</h1>
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#25311f]">
          <div><dt className="inline text-[#617A55]/70">التاريخ:</dt> <dd className="inline">{dateLabel}</dd></div>
          <div><dt className="inline text-[#617A55]/70">الوقت:</dt> <dd className="inline" dir="ltr">{timeLabel}</dd></div>
          {session.location && <div><dt className="inline text-[#617A55]/70">الموقع:</dt> <dd className="inline">{session.location}</dd></div>}
          <div><dt className="inline text-[#617A55]/70">السعة:</dt> <dd className="inline"><bdi>{session.booked_count} / {session.capacity}</bdi></dd></div>
        </dl>
      </header>

      {loadError ? (
        <p role="alert" className="mt-6 rounded-lg bg-[#C7D6E8]/50 p-5">
          تعذر تحميل قائمة المسجلات. تحققي من صلاحيات العرض والاتصال.
        </p>
      ) : (
        <AttendeesClient
          attendees={attendees}
          capacity={session.capacity}
          className={session.classes?.name ?? 'حصة'}
          dateLabel={dateLabel}
          classId={classId}
          sessionId={sessionId}
        />
      )}
    </main>
  )
}
