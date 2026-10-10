import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { getT } from '@/i18n/get-t'
import { I18nProvider } from '@/i18n/i18n-context'
import type { Locale } from '@/i18n/config'
import BookSessionButton from '../../(public)/schedule/book-session-button'
import { getScheduleWindow, sessionsInWindow } from './schedule-weeks'

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

function formatDate(date: string, locale: Locale) {
  const value = new Date(`${date}T00:00:00Z`)
  const intlLocale = locale === 'ar' ? 'ar' : 'en-US'

  return {
    day: new Intl.DateTimeFormat(intlLocale, { weekday: 'long', timeZone: 'UTC' }).format(value),
    date: new Intl.DateTimeFormat(intlLocale, {
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }).format(value),
  }
}

function formatTime(time: string) {
  return time.slice(0, 5)
}

export default async function MemberSchedulePage() {
  const { window, localNow } = getScheduleWindow()
  const supabase = await createClient()
  const { t, locale, dir } = await getT()
  const { data: sessions, error } = await supabase
    .from('class_sessions')
    .select(
      'id, session_date, start_time, end_time, capacity, booked_count, status, location, classes(name, category, price)'
    )
    .gte('session_date', window.start)
    .lt('session_date', window.end)
    .order('session_date', { ascending: true })
    .order('start_time', { ascending: true })
    .returns<ScheduleRow[]>()

  if (error) {
    console.error('Failed to load schedule:', error.message)
  }

  const upcomingSessions = sessionsInWindow(sessions ?? [], window, localNow)

  return (
    <I18nProvider locale={locale} dictionary={t}>
      <main className="px-4 py-8 sm:px-6 lg:px-8" dir={dir}>
        <section className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#617A55]/70">
                {t.memberSchedule.eyebrow}
              </p>
              <h1 className="mt-2 font-serif text-4xl text-[#617A55] sm:text-5xl">
                {t.memberSchedule.heading}
              </h1>
            </div>
            <p className="text-sm font-medium text-[#617A55]/75">
              {upcomingSessions.length} {t.memberSchedule.sessionsAvailable}
            </p>
          </div>

          {error && (
            <div className="mt-8 rounded-lg bg-[#C7D6E8]/55 p-6">
              {t.memberSchedule.loadError}
            </div>
          )}

          {!error && upcomingSessions.length === 0 && (
            <div className="mt-8 rounded-lg bg-[#C7D6E8]/55 p-8 text-center">
              {t.memberSchedule.empty}
            </div>
          )}

          {!error && upcomingSessions.length > 0 && (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {upcomingSessions.map((session) => {
                const remaining = Math.max(
                  0,
                  session.capacity - session.booked_count
                )
                const date = formatDate(session.session_date, locale)
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
                      <div className="absolute start-4 top-4 rounded-lg bg-[#F7F6F0]/95 px-4 py-3 text-center shadow-sm">
                        <span className="block text-sm font-bold">{date.day}</span>
                        <span className="mt-1 block text-xs">{date.date}</span>
                      </div>
                    </div>

                    <div className="p-5">
                      <h2 className="font-serif text-2xl leading-tight text-[#617A55]">
                        {session.classes?.name ?? t.home.sessionNameFallback}
                      </h2>

                      <dl className="mt-5 grid gap-3 text-sm">
                        <div className="flex min-w-0 items-start gap-3">
                          <dt aria-label={t.memberSchedule.timeLabel}>◷</dt>
                          <dd>
                            {formatTime(session.start_time)} -{' '}
                            {formatTime(session.end_time)}
                          </dd>
                        </div>
                        <div className="flex min-w-0 items-start gap-3">
                          <dt aria-label={t.memberSchedule.locationLabel}>⌖</dt>
                          <dd className="min-w-0 break-words">
                            {session.location ?? t.classes.locationFallback}
                          </dd>
                        </div>
                        <div className="flex min-w-0 items-start gap-3">
                          <dt aria-label={t.memberSchedule.capacityLabel}>◉</dt>
                          <dd>
                            {remaining} {t.classes.seatsAvailableOf} {session.capacity}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-5 flex items-center gap-3 border-t border-[#617A55]/10 pt-4">
                        <div className="grid size-9 place-items-center rounded-full bg-[#C7D6E8] font-serif text-sm">
                          {t.memberSchedule.instructorName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs text-[#617A55]/65">
                            {t.memberSchedule.instructorLabel}
                          </p>
                          <p className="text-sm font-semibold">
                            {t.memberSchedule.instructorName}
                          </p>
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
                            price={session.classes?.price ?? 0}
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
    </I18nProvider>
  )
}
