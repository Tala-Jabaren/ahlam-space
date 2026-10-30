import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminSession } from '@/components/admin/admin-session'
import { getSessionAttendees } from '@/lib/admin-session-attendees'
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
      <Link href="/admin/classes" className="mb-4 inline-block text-sm text-[#617A55] underline-offset-4 hover:underline">
        ← العودة إلى الحصص
      </Link>

      <header className="border-b border-[#617A55]/15 pb-6">
        <h1 className="font-serif text-3xl text-[#617A55]">{session.classes?.name ?? 'حصة'}</h1>
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#25311f]">
          <div><dt className="inline text-[#617A55]/70">التاريخ:</dt> <dd className="inline">{dateLabel}</dd></div>
          <div><dt className="inline text-[#617A55]/70">الوقت:</dt> <dd className="inline" dir="ltr">{timeLabel}</dd></div>
          {session.location && <div><dt className="inline text-[#617A55]/70">الموقع:</dt> <dd className="inline">{session.location}</dd></div>}
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
