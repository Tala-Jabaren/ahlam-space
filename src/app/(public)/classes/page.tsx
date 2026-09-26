import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'
import BookSessionButton from '../schedule/book-session-button'

type ScheduleRow = {
  id: string
  session_date: string
  start_time: string
  end_time: string
  capacity: number
  booked_count: number
  status: string
  location: string | null
  classes: {
    id: string
    name: string
    category: string | null
    price: number
  } | null
}

function isUpcoming(session: ScheduleRow) {
  return (
    session.status === 'scheduled' &&
    new Date(`${session.session_date}T${session.end_time}`) > new Date()
  )
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('ar', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${date}T00:00:00`))
}

function formatTime(time: string) {
  return time.slice(0, 5)
}

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ book?: string }>
}) {
  const { book: requestedSessionId } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const [
    { data: classes, error: classesError },
    { data: sessions, error: sessionsError },
  ] = await Promise.all([
    supabase
      .from('classes')
      .select('*')
      .eq('is_active', true)
      .returns<Tables<'classes'>[]>(),
    supabase
      .from('class_sessions')
      .select(
        'id, session_date, start_time, end_time, capacity, booked_count, status, location, classes(id, name, category, price)'
      )
      .order('session_date', { ascending: true })
      .returns<ScheduleRow[]>(),
  ])

  if (classesError) {
    console.error('Failed to load classes:', classesError.message)
  }
  if (sessionsError) {
    console.error('Failed to load class sessions:', sessionsError.message)
  }

  const sessionsByClass = new Map<string, ScheduleRow[]>()

  for (const session of (sessions ?? []).filter(isUpcoming)) {
    const classId = session.classes?.id
    if (!classId) continue
    const groupedSessions = sessionsByClass.get(classId) ?? []
    groupedSessions.push(session)
    sessionsByClass.set(classId, groupedSessions)
  }

  return (
    <div className="px-5 py-16 sm:px-8 lg:px-10">
      <section className="mx-auto max-w-7xl">
        <div className="max-w-3xl space-y-5">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#617A55]">
            Weekly movement
          </p>
          <h1 className="font-serif text-5xl leading-tight text-[#25311f] sm:text-6xl">
            Classes
          </h1>
          <p className="text-lg leading-8 text-[#4f5d49]">
            Explore yoga, fitness, and dance classes, then choose the upcoming
            session that suits you.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-7xl">
        {!classes || classes.length === 0 ? (
          <div className="rounded-[1.75rem] bg-[#C7D6E8]/55 p-8 text-[#4f5d49]">
            No classes available right now.
          </div>
        ) : (
          <div className="grid gap-7">
            {classes.map((classItem) => {
              const classSessions = sessionsByClass.get(classItem.id) ?? []

              return (
                <article
                  key={classItem.id}
                  className="overflow-hidden rounded-[1.75rem] border border-[#617A55]/10 bg-white/65 shadow-sm"
                >
                  <div className="grid lg:grid-cols-[minmax(250px,0.7fr)_1.5fr]">
                    <div className="bg-[#D6E2B6]/75 p-6 sm:p-8">
                      {classItem.category && (
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617A55]">
                          {classItem.category}
                        </p>
                      )}
                      <h2 className="mt-3 font-serif text-3xl leading-tight text-[#25311f] sm:text-4xl">
                        {classItem.name}
                      </h2>
                      {classItem.description && (
                        <p className="mt-4 leading-7 text-[#4f5d49]">
                          {classItem.description}
                        </p>
                      )}
                      <p className="mt-6 border-t border-[#617A55]/15 pt-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#617A55]">
                        {classItem.duration_minutes} minutes &middot; ₪
                        {classItem.price}
                      </p>
                    </div>

                    <div className="p-5 sm:p-7" dir="rtl">
                      <h3 className="font-serif text-2xl text-[#25311f]">
                        المواعيد القادمة
                      </h3>

                      {classSessions.length === 0 ? (
                        <p className="mt-4 rounded-lg bg-[#C7D6E8]/35 p-4 text-sm text-[#617A55]">
                          لا توجد مواعيد قادمة لهذه الحصة حاليًا.
                        </p>
                      ) : (
                        <div className="mt-4 grid gap-3">
                          {classSessions.map((session) => {
                            const remaining = Math.max(
                              0,
                              session.capacity - session.booked_count
                            )
                            const isRequested = requestedSessionId === session.id

                            return (
                              <section
                                key={session.id}
                                id={`session-${session.id}`}
                                className={`rounded-lg border p-4 transition sm:p-5 ${
                                  isRequested
                                    ? 'border-[#617A55] bg-[#D6E2B6]/35 ring-2 ring-[#617A55]/15'
                                    : 'border-[#617A55]/10 bg-[#F7F6F0]/75'
                                }`}
                              >
                                {isRequested && (
                                  <p className="mb-3 text-sm font-semibold text-[#617A55]">
                                    أكملي الحجز باختيار طريقة الدفع.
                                  </p>
                                )}
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                  <dl className="grid min-w-0 gap-2 text-sm text-[#4f5d49] sm:grid-cols-2 sm:gap-x-6">
                                    <div>
                                      <dt className="sr-only">التاريخ</dt>
                                      <dd className="font-semibold text-[#25311f]">
                                        {formatDate(session.session_date)}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt className="sr-only">الوقت</dt>
                                      <dd>
                                        {formatTime(session.start_time)} -{' '}
                                        {formatTime(session.end_time)}
                                      </dd>
                                    </div>
                                    <div className="sm:col-span-2">
                                      <dt className="sr-only">الموقع</dt>
                                      <dd className="break-words">
                                        {session.location ?? 'مركز أحلام'}
                                      </dd>
                                    </div>
                                    <div className="sm:col-span-2">
                                      <dt className="sr-only">الأماكن المتاحة</dt>
                                      <dd>
                                        {remaining} أماكن متاحة من {session.capacity}
                                      </dd>
                                    </div>
                                  </dl>

                                  <div className="shrink-0 [&>div>button]:min-h-11 [&>div>button]:rounded-lg [&>div>button]:px-6 [&>div>button]:py-3">
                                    <BookSessionButton
                                      sessionId={session.id}
                                      initialRemaining={remaining}
                                      studioAddress={session.location}
                                      showRemaining={false}
                                      autoOpen={isRequested && Boolean(user)}
                                      isAuthenticated={Boolean(user)}
                                    />
                                  </div>
                                </div>
                              </section>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
