import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'
import { getT } from '@/i18n/get-t'
import { getLocale } from '@/i18n/get-locale'
import { getDictionary } from '@/i18n/dictionaries'
import { pageMetadata } from '@/lib/seo'
import ClassCard from '@/components/classes/class-card'
import ClassesBanner from '@/components/classes/classes-banner'
import type { ClassSession } from '@/components/classes/types'
import { classCardData, loadClassBookings } from '@/lib/class-cards'
import styles from '@/components/classes/class-card.module.css'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = getDictionary(locale)
  return pageMetadata({ ...t.seo.classes, path: '/classes', locale })
}

type ScheduleRow = ClassSession

function isUpcoming(session: ScheduleRow) {
  return (
    session.status === 'scheduled' &&
    new Date(`${session.session_date}T${session.end_time}`) > new Date()
  )
}

export default async function ClassesPage({ searchParams }: {
  searchParams: Promise<{ book?: string }>
}) {
  const { book: requestedSessionId } = await searchParams
  const supabase = await createClient()
  const { t, locale, dir } = await getT()
  const { data: { user } } = await supabase.auth.getUser()
  const [
    { data: classes, error: classesError },
    { data: sessions, error: sessionsError },
  ] = await Promise.all([
    supabase.from('classes').select('*').eq('is_active', true).returns<Tables<'classes'>[]>(),
    supabase.from('class_sessions')
      .select('id, session_date, start_time, end_time, capacity, booked_count, status, location, classes(id, name, category, price)')
      .order('session_date', { ascending: true }).returns<ScheduleRow[]>(),
  ])
  if (classesError) console.error('Failed to load classes:', classesError.message)
  if (sessionsError) console.error('Failed to load class sessions:', sessionsError.message)

  const sessionsByClass = new Map<string, ScheduleRow[]>()
  const upcoming = (sessions ?? []).filter(isUpcoming)
  for (const session of upcoming) {
    const classId = session.classes?.id
    if (!classId) continue
    const groupedSessions = sessionsByClass.get(classId) ?? []
    groupedSessions.push(session)
    sessionsByClass.set(classId, groupedSessions)
  }
  const now = new Date()
  const current = await loadClassBookings(supabase, user?.id ?? null, upcoming.map(session => session.id), now)

  return <div dir={dir}>
    <ClassesBanner title={t.classes.heading} tagline={t.classes.tagline} />
    <div className="px-5 py-16 sm:px-8 lg:px-10">
      <section className="mx-auto max-w-7xl">
        {!classes || classes.length === 0 ? <div className="rounded-[1.75rem] bg-[#C7D6E8]/55 p-8 text-[#4f5d49]">{t.classes.noClasses}</div>
          : <div className="grid gap-10">
            {classes.map(classItem => {
              const classSessions = sessionsByClass.get(classItem.id) ?? []
              return <section key={classItem.id} aria-labelledby={`class-${classItem.id}`}>
                <h2 id={`class-${classItem.id}`} className="mb-5 font-serif text-3xl text-[#25311f]">{classItem.name}</h2>
                {classSessions.length === 0 ? <p className="rounded-lg bg-[#C7D6E8]/35 p-4 text-sm text-[#4f5d49]">{t.classes.noUpcoming}</p>
                  : <div className={styles.grid}>
                    {classSessions.map(session => <ClassCard key={session.id} headingLevel={3} session={classCardData(session, locale, {
                      now, classInfo: classItem, booking: current.bookings.get(session.id), known: current.known,
                      authenticated: Boolean(user), requested: requestedSessionId === session.id,
                    })} />)}
                  </div>}
              </section>
            })}
          </div>}
      </section>
    </div>
  </div>
}
