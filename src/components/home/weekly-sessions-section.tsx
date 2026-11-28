import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { loginHref } from '@/lib/login-redirect'
import BookSessionButton from '@/app/(public)/schedule/book-session-button'

export type UpcomingSession = {
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

type WeeklySessionsCopy = {
  weekSectionHeading: string
  weekSectionSubtitle: string
  weekSectionViewAll: string
  sessionsError: string
  sessionsEmpty: string
  sessionNameFallback: string
  timeLabel: string
  durationLabel: string
  priceLabel: string
  remainingLabel: string
}

function formatWeekday(date: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en-US', { weekday: 'long' }).format(
    new Date(`${date}T00:00:00`)
  )
}

function formatTime(time: string) {
  return time.slice(0, 5)
}

// Remaining spots shown as capacity dots, not just a bare number - the
// first `remaining` dots are filled (dark), the rest are pale (already
// taken), so the row's own fill level reads at a glance before anyone
// reads the "x / y" text next to it.
function CapacityDots({ capacity, remaining }: { capacity: number; remaining: number }) {
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      {Array.from({ length: capacity }, (_, index) => (
        <span
          key={index}
          className={`size-2 rounded-full ${index < remaining ? 'bg-[#55684A]' : 'bg-[#55684A]/20'}`}
        />
      ))}
    </span>
  )
}

export default function WeeklySessionsSection({
  copy,
  minutesSuffix,
  locale,
  sessions,
  sessionsError,
  isAuthenticated,
}: {
  copy: WeeklySessionsCopy
  minutesSuffix: string
  locale: Locale
  sessions: UpcomingSession[]
  sessionsError: boolean
  isAuthenticated: boolean
}) {
  return (
    <section className="scroll-reveal border-t border-[#55684A]/10 bg-[#F6F5EE] px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-serif text-4xl text-[#34472B] sm:text-5xl">{copy.weekSectionHeading}</h2>
            <p className="mt-3 text-base leading-8 text-[#34472B]/75">{copy.weekSectionSubtitle}</p>
          </div>
          <Link
            href={isAuthenticated ? '/classes' : loginHref('/classes')}
            className="text-sm font-semibold text-[#55684A] underline-offset-4 hover:underline"
          >
            {copy.weekSectionViewAll}
          </Link>
        </div>

        {sessionsError ? (
          <p className="mt-10 rounded-lg bg-[#C7D6E8]/40 p-6 text-center text-[#55684A]">{copy.sessionsError}</p>
        ) : sessions.length === 0 ? (
          <p className="mt-10 rounded-lg bg-[#E4ECD6]/60 p-6 text-center text-[#55684A]">{copy.sessionsEmpty}</p>
        ) : (
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {sessions.map((session) => {
              const remaining = Math.max(0, session.capacity - session.booked_count)

              return (
                <article key={session.id} className="flex min-w-0 flex-col rounded-2xl border border-[#55684A]/15 bg-white p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-serif text-2xl text-[#34472B]">
                      {session.classes?.name ?? copy.sessionNameFallback}
                    </h3>
                    <span className="inline-flex shrink-0 rounded-full bg-[#E4ECD6] px-3 py-1 text-xs font-semibold text-[#34472B]">
                      {formatWeekday(session.session_date, locale)}
                    </span>
                  </div>

                  <dl className="mt-5 flex flex-col gap-2 text-sm text-[#34472B]/85">
                    <div className="flex items-center justify-between border-t border-[#55684A]/10 pt-2">
                      <dt className="text-[#34472B]/60">{copy.timeLabel}</dt>
                      <dd>
                        {formatTime(session.start_time)} - {formatTime(session.end_time)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#55684A]/10 pt-2">
                      <dt className="text-[#34472B]/60">{copy.durationLabel}</dt>
                      <dd>
                        {session.classes?.duration_minutes ?? '-'} {minutesSuffix}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#55684A]/10 pt-2">
                      <dt className="text-[#34472B]/60">{copy.priceLabel}</dt>
                      <dd>₪{session.classes?.price ?? '-'}</dd>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#55684A]/10 pt-2">
                      <dt className="text-[#34472B]/60">{copy.remainingLabel}</dt>
                      <dd className="flex items-center gap-2">
                        <span>
                          {session.capacity} / {remaining}
                        </span>
                        <CapacityDots capacity={session.capacity} remaining={remaining} />
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-6 border-t border-[#55684A]/10 pt-5 [&>div>button]:min-h-11 [&>div>button]:w-full [&>div>button]:rounded-full [&>div>button]:px-6 [&>div>button]:py-3">
                    <BookSessionButton
                      sessionId={session.id}
                      initialRemaining={remaining}
                      price={session.classes?.price ?? 0}
                      showRemaining={false}
                      isAuthenticated={isAuthenticated}
                    />
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
