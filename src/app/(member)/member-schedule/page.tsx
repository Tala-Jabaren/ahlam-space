import { createClient } from '@/lib/supabase/server'
import { getT } from '@/i18n/get-t'
import { I18nProvider } from '@/i18n/i18n-context'
import ClassCard from '@/components/classes/class-card'
import ClassesBanner from '@/components/classes/classes-banner'
import type { ClassSession } from '@/components/classes/types'
import { classCardData, loadClassBookings } from '@/lib/class-cards'
import styles from '@/components/classes/class-card.module.css'
import { getScheduleWindow, sessionsInWindow } from './schedule-weeks'

type ScheduleRow = ClassSession

export default async function MemberSchedulePage() {
  const { window, localNow } = getScheduleWindow()
  const supabase = await createClient()
  const { t, locale, dir } = await getT()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: sessions, error } = await supabase
    .from('class_sessions')
    .select('id, session_date, start_time, end_time, capacity, booked_count, status, location, classes(name, category, price)')
    .gte('session_date', window.start).lt('session_date', window.end)
    .order('session_date', { ascending: true }).order('start_time', { ascending: true })
    .returns<ScheduleRow[]>()
  if (error) console.error('Failed to load schedule:', error.message)
  const upcomingSessions = sessionsInWindow(sessions ?? [], window, localNow)
  const now = new Date()
  const current = await loadClassBookings(supabase, user?.id ?? null, upcomingSessions.map(session => session.id), now)

  return <I18nProvider locale={locale} dictionary={t}>
    <div dir={dir}>
      <ClassesBanner />
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#617A55]/70">{t.memberSchedule.eyebrow}</p>
              <h1 className="mt-2 font-serif text-4xl text-[#617A55] sm:text-5xl">{t.memberSchedule.heading}</h1>
            </div>
            <p className="text-sm font-medium text-[#617A55]/75">{upcomingSessions.length} {t.memberSchedule.sessionsAvailable}</p>
          </div>
          {error && <div className="mt-8 rounded-lg bg-[#C7D6E8]/55 p-6">{t.memberSchedule.loadError}</div>}
          {!error && upcomingSessions.length === 0 && <div className="mt-8 rounded-lg bg-[#C7D6E8]/55 p-8 text-center">{t.memberSchedule.empty}</div>}
          {!error && upcomingSessions.length > 0 && <div className={`mt-8 ${styles.grid}`}>
            {upcomingSessions.map(session => <ClassCard key={session.id} session={classCardData(session, locale, {
              now, booking: current.bookings.get(session.id), known: current.known, authenticated: Boolean(user),
            })} />)}
          </div>}
        </section>
      </main>
    </div>
  </I18nProvider>
}
