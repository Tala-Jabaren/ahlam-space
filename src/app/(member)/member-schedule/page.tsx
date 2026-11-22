import { createClient } from '@/lib/supabase/server'
import { getT } from '@/i18n/get-t'
import { I18nProvider } from '@/i18n/i18n-context'
import ClassWeekSections from '@/components/classes/class-week-sections'
import ClassesBanner from '@/components/classes/classes-banner'
import type { ClassSession } from '@/components/classes/types'
import { classCardData, loadClassBookings } from '@/lib/class-cards'
import { getScheduleWindow, groupClassWeeks, sessionsInWindow } from '@/lib/class-schedule-weeks'
import { PACKAGES_ENABLED } from '@/lib/feature-flags'

type ScheduleRow = ClassSession

export default async function MemberSchedulePage() {
  const now = new Date()
  const { window, localNow, nextWeekStart } = getScheduleWindow(now)
  const supabase = await createClient()
  const { t, locale, dir } = await getT()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: sessions, error } = await supabase
    .from('class_sessions')
    .select('id, session_date, start_time, end_time, capacity, booked_count, status, location, classes(name, category, price, image_url)')
    .gte('session_date', window.start).lt('session_date', window.end)
    .order('session_date', { ascending: true }).order('start_time', { ascending: true })
    .returns<ScheduleRow[]>()
  if (error) console.error('Failed to load schedule:', error.message)
  const upcomingSessions = sessionsInWindow(sessions ?? [], window, localNow)
  const current = await loadClassBookings(supabase, user?.id ?? null, upcomingSessions.map(session => session.id), now, { includePackageInfo: PACKAGES_ENABLED })
  const weeks = groupClassWeeks(upcomingSessions, nextWeekStart, session => session.session_date).map(({ kind, sessions }) => ({
    kind,
    sessions: sessions.map(session => classCardData(session, locale, {
      now, booking: current.bookings.get(session.id), known: current.known, authenticated: Boolean(user),
    })),
  }))

  return <I18nProvider locale={locale} dictionary={t}>
    <div dir={dir}>
      <ClassesBanner />
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {error ? (
            <div className="rounded-lg bg-[#C7D6E8]/55 p-6">{t.memberSchedule.loadError}</div>
          ) : (
            <ClassWeekSections weeks={weeks} labels={t.classes.weekGroups} />
          )}
        </div>
      </main>
    </div>
  </I18nProvider>
}
