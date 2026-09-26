import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import BookSessionButton from '../../(public)/schedule/book-session-button'

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
    name: string
    category: string | null
    price: number
  } | null
}

const categoryImages: Record<string, string> = {
  yoga: '/member/yoga-class.png',
  fitness: '/member/fitness-class.png',
  dance: '/member/dance-class.png',
}

function formatDate(date: string) {
  const value = new Date(`${date}T00:00:00`)

  return {
    day: new Intl.DateTimeFormat('ar', { weekday: 'long' }).format(value),
    date: new Intl.DateTimeFormat('ar', {
      day: 'numeric',
      month: 'long',
    }).format(value),
  }
}

function formatTime(time: string) {
  return time.slice(0, 5)
}

function isUpcoming(session: ScheduleRow) {
  return (
    session.status === 'scheduled' &&
    new Date(`${session.session_date}T${session.end_time}`) > new Date()
  )
}

export default async function MemberSchedulePage() {
  const supabase = await createClient()
  const { data: sessions, error } = await supabase
    .from('class_sessions')
    .select(
      'id, session_date, start_time, end_time, capacity, booked_count, status, location, classes(name, category, price)'
    )
    .order('session_date', { ascending: true })
    .returns<ScheduleRow[]>()

  if (error) {
    console.error('Failed to load schedule:', error.message)
  }

  const upcomingSessions = (sessions ?? []).filter(isUpcoming)

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#617A55]/70">
              اختاري مساحتك لهذا الأسبوع
            </p>
            <h1 className="mt-2 font-serif text-4xl text-[#617A55] sm:text-5xl">
              جدول الحصص
            </h1>
          </div>
          <p className="text-sm font-medium text-[#617A55]/75">
            {upcomingSessions.length} حصة متاحة
          </p>
        </div>

        <div className="mt-7 flex items-center gap-2" aria-label="التنقل بين الأسابيع">
          <button
            type="button"
            aria-label="الأسبوع السابق"
            className="grid size-11 place-items-center rounded-lg border border-[#617A55]/20 bg-[#F7F6F0] text-xl transition hover:bg-[#D6E2B6]/60"
          >
            ›
          </button>
          <button
            type="button"
            className="min-h-11 rounded-lg border border-[#617A55]/20 bg-[#D6E2B6]/45 px-5 text-sm font-semibold"
          >
            هذا الأسبوع
          </button>
          <button
            type="button"
            aria-label="الأسبوع التالي"
            className="grid size-11 place-items-center rounded-lg border border-[#617A55]/20 bg-[#F7F6F0] text-xl transition hover:bg-[#D6E2B6]/60"
          >
            ‹
          </button>
        </div>

        {error && (
          <div className="mt-8 rounded-lg bg-[#C7D6E8]/55 p-6">
            تعذر تحميل الحصص الآن.
          </div>
        )}

        {!error && upcomingSessions.length === 0 && (
          <div className="mt-8 rounded-lg bg-[#C7D6E8]/55 p-8 text-center">
            لا توجد حصص قادمة متاحة حالياً.
          </div>
        )}

        {!error && upcomingSessions.length > 0 && (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {upcomingSessions.map((session) => {
              const remaining = Math.max(
                0,
                session.capacity - session.booked_count
              )
              const date = formatDate(session.session_date)
              const category = session.classes?.category ?? 'yoga'

              return (
                <article
                  key={session.id}
                  className="min-w-0 overflow-hidden rounded-lg border border-[#617A55]/10 bg-[#F7F6F0] shadow-sm"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#C7D6E8]/40">
                    <Image
                      src={categoryImages[category] ?? categoryImages.yoga}
                      alt=""
                      fill
                      sizes="(min-width: 1280px) 30vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                    <div className="absolute left-4 top-4 rounded-lg bg-[#F7F6F0]/95 px-4 py-3 text-center shadow-sm">
                      <span className="block text-sm font-bold">{date.day}</span>
                      <span className="mt-1 block text-xs">{date.date}</span>
                    </div>
                  </div>

                  <div className="p-5">
                    <h2 className="font-serif text-2xl leading-tight text-[#617A55]">
                      {session.classes?.name ?? 'حصة'}
                    </h2>

                    <dl className="mt-5 grid gap-3 text-sm">
                      <div className="flex min-w-0 items-start gap-3">
                        <dt aria-label="الوقت">◷</dt>
                        <dd>
                          {formatTime(session.start_time)} -{' '}
                          {formatTime(session.end_time)}
                        </dd>
                      </div>
                      <div className="flex min-w-0 items-start gap-3">
                        <dt aria-label="الموقع">⌖</dt>
                        <dd className="min-w-0 break-words">
                          {session.location ?? 'مركز أحلام'}
                        </dd>
                      </div>
                      <div className="flex min-w-0 items-start gap-3">
                        <dt aria-label="السعة">◉</dt>
                        <dd>
                          {remaining} أماكن متاحة من {session.capacity}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-5 flex items-center gap-3 border-t border-[#617A55]/10 pt-4">
                      <div className="grid size-9 place-items-center rounded-full bg-[#C7D6E8] font-serif text-sm">
                        أ
                      </div>
                      <div>
                        <p className="text-xs text-[#617A55]/65">المدربة</p>
                        <p className="text-sm font-semibold">أحلام</p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
                      <p className="font-serif text-2xl font-semibold">
                        ₪{session.classes?.price ?? '-'}
                      </p>
                      <div className="[&>div>button]:min-h-11 [&>div>button]:rounded-lg [&>div>button]:px-6 [&>div>button]:py-3">
                        <BookSessionButton
                          sessionId={session.id}
                          initialRemaining={remaining}
                          studioAddress={session.location}
                          showRemaining={false}
                        />
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
