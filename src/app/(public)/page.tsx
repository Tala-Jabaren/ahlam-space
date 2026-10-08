import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import BookSessionButton from './schedule/book-session-button'

type UpcomingSession = {
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
    duration_minutes: number
    price: number
  } | null
}

const services = [
  {
    title: 'جلسات فردية',
    description: 'جلسات مخصصة حسب احتياجاتك وأهدافك.',
    href: '/private-sessions',
    icon: (
      <>
        <path d="M12 22c4-4 7-7.5 7-12a7 7 0 0 0-14 0c0 4.5 3 8 7 12Z" />
        <path d="M12 22V10M8 14c2.5 0 4 1.5 4 4M16 14c-2.5 0-4 1.5-4 4" />
      </>
    ),
  },
  {
    title: 'كورسات ومحاضرات',
    description: 'برامج متنوعة للوعي، الحركة وتطوير نمط حياة متوازن.',
    href: '/courses',
    icon: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
        <path d="M8 7h8M8 11h6" />
      </>
    ),
  },
  {
    title: 'حصص جماعية',
    description: 'حصص يوغا وحركة ضمن أجواء مريحة وداعمة.',
    href: '/classes',
    icon: (
      <>
        <circle cx="12" cy="5" r="2.5" />
        <path d="M12 8v5M8 21l4-8 4 8M5 14l7-2 7 2" />
      </>
    ),
  },
  {
    title: 'منتجات مختارة بعناية',
    description: 'منتجات تساعدك في رحلتك نحو حياة أكثر توازنًا وراحة.',
    href: '/shop',
    icon: (
      <>
        <path d="M6 8h12l1 13H5L6 8Z" />
        <path d="M9 9V6a3 3 0 0 1 6 0v3" />
      </>
    ),
  },
]

function ServiceIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid size-12 place-items-center rounded-full bg-[#D6E2B6]/70 text-[#617A55]">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </span>
  )
}

function isUpcoming(session: UpcomingSession) {
  return (
    session.status === 'scheduled' &&
    new Date(`${session.session_date}T${session.end_time}`) > new Date()
  )
}

function formatSessionDate(date: string) {
  return new Intl.DateTimeFormat('ar', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${date}T00:00:00`))
}

function formatTime(time: string) {
  return time.slice(0, 5)
}

export default async function HomePage() {
  const supabase = await createClient()
  const [
    {
      data: { user },
    },
    { data: sessions, error: sessionsError },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('class_sessions')
      .select(
        'id, session_date, start_time, end_time, capacity, booked_count, status, location, classes(name, duration_minutes, price)'
      )
      .order('session_date', { ascending: true })
      .order('start_time', { ascending: true })
      .returns<UpcomingSession[]>(),
  ])

  if (sessionsError) {
    console.error('Failed to load upcoming home sessions:', sessionsError.message)
  }

  const upcomingSessions = (sessions ?? []).filter(isUpcoming).slice(0, 3)

  return (
    <div className="overflow-hidden bg-[#F7F6F0] text-[#25311f]" dir="rtl">
      <section className="relative flex min-h-[75vh] items-center overflow-hidden lg:min-h-[82vh]" dir="ltr">
        <Image
          src="/images/hero.png"
          alt="أحلام تجلس للتأمل على سجادة اليوغا في الاستوديو"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[60%_center] md:object-center"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(247,246,240,0.96)_0%,rgba(247,246,240,0.88)_32%,rgba(247,246,240,0.28)_55%,rgba(247,246,240,0)_72%)] max-md:bg-[linear-gradient(90deg,rgba(247,246,240,0.94)_0%,rgba(247,246,240,0.84)_58%,rgba(247,246,240,0.18)_100%)]"
        />

        <div className="relative z-10 flex w-full items-center px-5 py-14 sm:px-8 sm:py-16 lg:px-12 xl:px-[max(3rem,calc((100vw-80rem)/2))]">
          <div
            aria-hidden="true"
            className="absolute -left-12 bottom-8 hidden h-64 w-48 opacity-10 lg:block"
          >
            <span className="absolute bottom-0 left-24 h-60 w-px -rotate-12 bg-[#617A55]" />
            <span className="absolute left-10 top-8 h-20 w-12 -rotate-45 rounded-[100%_0_100%_0] border border-[#617A55]" />
            <span className="absolute left-24 top-24 h-20 w-12 -rotate-12 rounded-[100%_0_100%_0] border border-[#617A55]" />
            <span className="absolute left-28 top-44 h-20 w-12 rotate-12 rounded-[0_100%_0_100%] border border-[#617A55]" />
          </div>

          <div className="relative z-10 max-w-xl" dir="rtl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#617A55]" dir="ltr">
              MOVE · BALANCE · BLOOM
            </p>
            <h1 className="mt-8 font-serif text-5xl leading-tight text-[#25311f] sm:text-6xl">
              مساحة للحركة،
              <br />
              الوعي والتوازن.
            </h1>
            <p className="mt-6 text-base leading-8 text-[#4f5d49] sm:text-lg">
              في <span dir="ltr">Ahlam Space</span> نؤمن بأن الحركة ليست فقط
              تمرينًا للجسم، بل رحلة أعمق نحو حياة أكثر توازنًا ووعيًا.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/classes"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#617A55] px-7 py-3 text-sm font-semibold text-[#F7F6F0] transition-colors hover:bg-[#617A55]/90"
              >
                استكشفي الحصص
              </Link>
              <Link
                href="/classes"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#617A55]/40 px-7 py-3 text-sm font-semibold text-[#617A55] transition-colors hover:bg-[#D6E2B6]/45"
              >
                احجزي الآن
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#617A55]/10 px-5 py-12 sm:px-8 lg:px-10 lg:py-14">
        <div className="mx-auto grid max-w-7xl gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service, index) => (
            <Link
              key={service.title}
              href={service.href}
              className={`group px-2 text-center transition-transform duration-200 hover:-translate-y-1 sm:px-7 ${
                index % 2 !== 0 ? 'sm:border-r sm:border-[#617A55]/15' : ''
              } ${index > 0 ? 'lg:border-r lg:border-[#617A55]/15' : ''}`}
            >
              <span className="flex justify-center">
                <ServiceIcon>{service.icon}</ServiceIcon>
              </span>
              <h2 className="mt-5 font-serif text-xl text-[#25311f]">
                {service.title}
              </h2>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[#4f5d49]">
                {service.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="relative px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-20">
          <div className="relative min-h-[420px] overflow-hidden rounded-[8rem_8rem_0.5rem_0.5rem] sm:min-h-[560px]">
            <Image
              src="/images/about2.png"
              alt="أحلام تمارس اليوغا في مساحة هادئة"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover object-center"
            />
          </div>

          <div>
            <div className="flex items-center gap-4" dir="ltr">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#617A55]">
                THE SPACE
              </p>
              <span className="h-px w-14 bg-[#617A55]/35" />
            </div>
            <h2 className="mt-5 font-serif text-4xl leading-tight text-[#25311f] sm:text-5xl">
              أهلًا بكِ في <span dir="ltr">Ahlam Space</span>
            </h2>
            <p className="mt-6 max-w-xl text-base leading-8 text-[#4f5d49] sm:text-lg">
              مساحة صُممت لتكون أكثر من مجرد مكان للتمرين؛ هي دعوة للعودة إلى
              نفسك، من خلال الحركة، الوعي والتوازن في الحياة اليومية.
            </p>
            <Link
              href="/about"
              className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full border border-[#617A55]/35 px-7 py-3 text-sm font-semibold text-[#617A55] transition-colors hover:bg-[#D6E2B6]/45"
            >
              تعرّفي أكثر
            </Link>
          </div>
        </div>

        <p
          aria-hidden="true"
          className="absolute bottom-14 left-[76%] hidden -rotate-6 font-serif text-3xl leading-relaxed text-[#617A55]/25 xl:block"
          dir="ltr"
        >
          Move
          <br />
          Balance
          <br />
          Bloom
        </p>
      </section>

      <section className="border-t border-[#617A55]/10 px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-serif text-4xl text-[#25311f] sm:text-5xl">
                حصص هذا الأسبوع
              </h2>
              <p className="mt-3 text-base leading-8 text-[#4f5d49]">
                اختاري الوقت المناسب إلك وابدئي رحلتك.
              </p>
            </div>
            <Link
              href="/classes"
              className="text-sm font-semibold text-[#617A55] underline-offset-4 hover:underline"
            >
              عرض جميع الحصص
            </Link>
          </div>

          {sessionsError ? (
            <p className="mt-10 rounded-lg bg-[#C7D6E8]/40 p-6 text-center text-[#617A55]">
              تعذر تحميل الحصص الآن.
            </p>
          ) : upcomingSessions.length === 0 ? (
            <p className="mt-10 rounded-lg bg-[#C7D6E8]/35 p-6 text-center text-[#617A55]">
              لا توجد حصص قادمة متاحة حاليًا.
            </p>
          ) : (
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {upcomingSessions.map((session) => {
                const remaining = Math.max(
                  0,
                  session.capacity - session.booked_count
                )

                return (
                  <article
                    key={session.id}
                    className="flex min-w-0 flex-col rounded-lg border border-[#617A55]/15 p-6"
                  >
                    <p className="text-sm font-semibold text-[#617A55]">
                      {formatSessionDate(session.session_date)}
                    </p>
                    <h3 className="mt-3 font-serif text-2xl text-[#25311f]">
                      {session.classes?.name ?? 'حصة'}
                    </h3>
                    <dl className="mt-5 grid grid-cols-2 gap-3 text-sm text-[#4f5d49]">
                      <div>
                        <dt className="sr-only">الوقت</dt>
                        <dd>
                          {formatTime(session.start_time)} -{' '}
                          {formatTime(session.end_time)}
                        </dd>
                      </div>
                      <div>
                        <dt className="sr-only">المدة</dt>
                        <dd>{session.classes?.duration_minutes ?? '-'} دقيقة</dd>
                      </div>
                      <div>
                        <dt className="sr-only">السعر</dt>
                        <dd>₪{session.classes?.price ?? '-'}</dd>
                      </div>
                      <div>
                        <dt className="sr-only">الأماكن المتبقية</dt>
                        <dd>{remaining} أماكن متبقية</dd>
                      </div>
                    </dl>
                    <div className="mt-6 border-t border-[#617A55]/10 pt-5 [&>div>button]:min-h-11 [&>div>button]:rounded-lg [&>div>button]:px-6 [&>div>button]:py-3">
                      <BookSessionButton
                        sessionId={session.id}
                        initialRemaining={remaining}
                        price={session.classes?.price ?? 0}
                        showRemaining={false}
                        isAuthenticated={Boolean(user)}
                      />
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <section className="bg-[#D6E2B6]/45 px-5 py-20 text-center sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-serif text-4xl leading-tight text-[#25311f] sm:text-5xl">
            خذي وقتًا لنفسك.
          </h2>
          <p className="mt-4 text-base leading-8 text-[#4f5d49] sm:text-lg">
            اختاري الحصة المناسبة وابدئي رحلتك نحو حركة أكثر وعيًا وتوازنًا.
          </p>
          <Link
            href="/classes"
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[#617A55] px-7 py-3 text-sm font-semibold text-[#F7F6F0] transition-colors hover:bg-[#617A55]/90"
          >
            احجزي حصتك
          </Link>
        </div>
      </section>
    </div>
  )
}
