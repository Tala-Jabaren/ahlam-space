import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'
import { getT } from '@/i18n/get-t'
import { getLocale } from '@/i18n/get-locale'
import { getDictionary } from '@/i18n/dictionaries'
import { pageMetadata } from '@/lib/seo'
import { loginHref } from '@/lib/login-redirect'
import { PACKAGES_ENABLED } from '@/lib/feature-flags'
import ClassesBanner from '@/components/classes/classes-banner'
import ClassesGrid from '@/components/classes/classes-grid'
import ClassWeekRefresh from '@/components/classes/class-week-refresh'
import type { ClassSession } from '@/components/classes/types'
import { classCardData, loadClassBookings, sessionStart } from '@/lib/class-cards'
import { CLASS_SCHEDULE_ZONE, getScheduleWindow, groupClassWeeks, isUpcomingSession, resolveScheduleWeek } from '@/lib/class-schedule-weeks'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = getDictionary(locale)
  // Requires an account now (see the redirect below) - nothing a crawler
  // without one could actually reach here, same reasoning as course pages.
  return { ...pageMetadata({ ...t.seo.classes, path: '/classes', locale }), robots: { index: false, follow: false } }
}

type ScheduleRow = ClassSession

export default async function ClassesPage({ searchParams }: {
  searchParams: Promise<{ book?: string }>
}) {
  const { book: requestedSessionId } = await searchParams
  const supabase = await createClient()
  const { t, locale, dir } = await getT()
  const { data: { user } } = await supabase.auth.getUser()
  // Browsing/booking classes now requires an account - guests are sent to
  // log in first, then land back here via returnTo.
  if (!user) redirect(loginHref('/classes'))
  const now = new Date()
  const schedule = getScheduleWindow(now)
  const [
    { data: classes, error: classesError },
    { data: sessions, error: sessionsError },
  ] = await Promise.all([
    // Only needed for image_url - the session query below already embeds
    // name/category/price directly.
    supabase.from('classes').select('*').eq('is_active', true).returns<Tables<'classes'>[]>(),
    supabase.from('class_sessions')
      .select('id, session_date, start_time, end_time, capacity, booked_count, status, location, classes(id, name, description, category, price)')
      .gte('session_date', schedule.window.start)
      .order('session_date', { ascending: true }).returns<ScheduleRow[]>(),
  ])
  if (classesError) console.error('Failed to load classes:', classesError.message)
  if (sessionsError) console.error('Failed to load class sessions:', sessionsError.message)

  const classesById = new Map((classes ?? []).map(classItem => [classItem.id, classItem]))
  const displayWeek = resolveScheduleWeek(sessions ?? [], schedule)
  const [refreshDate, refreshTime] = displayWeek.refreshAt.split('T')
  const refreshAt = sessionStart(refreshDate, refreshTime, CLASS_SCHEDULE_ZONE)?.toISOString()
  const upcoming = (sessions ?? []).filter(session => isUpcomingSession(session, schedule.localNow))
  // Packages (purchase, balance, package-aware booking) live only in the
  // member area now - see /member-schedule's "باقات" tab - so this public
  // page never passes packageCredit and keeps includePackageInfo only for
  // existing package-paid bookings' cancel behaviour to stay correct if a
  // logged-in member happens to view one here.
  const current = await loadClassBookings(supabase, user?.id ?? null, upcoming.map(session => session.id), now, { includePackageInfo: PACKAGES_ENABLED })

  const cards = upcoming
    .map(session => {
      const classInfo = session.classes?.id ? classesById.get(session.classes.id) : undefined
      const card = classCardData(session, locale, {
        now,
        // Force package_eligible out regardless of what the row actually
        // has - packages aren't this page's concern at all anymore (see
        // /member-schedule), so neither the "لا تشمل الباقات" badge nor
        // the price-labeled register button should ever appear here.
        classInfo: classInfo ? { ...classInfo, package_eligible: undefined } : undefined,
        booking: current.bookings.get(session.id), known: current.known,
        authenticated: Boolean(user), requested: requestedSessionId === session.id,
      })
      return { ...card, sessionDate: session.session_date }
    })
    .sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? ''))
  const weeks = groupClassWeeks(cards, displayWeek.groupingBoundary, card => card.sessionDate)

  return <div dir={dir}>
    <ClassesBanner title={t.classes.heading} tagline={t.classes.tagline} />
    <div className="px-5 py-16 sm:px-8 lg:px-10">
      <section className="mx-auto max-w-7xl">
        <div id="sessions-list">
          {refreshAt && !sessionsError && <ClassWeekRefresh at={refreshAt} />}
          {!classes || classes.length === 0 ? (
            <div className="rounded-[1.75rem] bg-[#C7D6E8]/55 p-8 text-[#4f5d49]">{t.classes.noClasses}</div>
          ) : (
            <ClassesGrid weeks={weeks} weekLabels={t.classes.weekGroups} allLabel={t.classes.allFilter} filterLabel={t.classes.filterLabel} />
          )}
        </div>
      </section>
    </div>
  </div>
}
