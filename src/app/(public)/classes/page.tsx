import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'
import { getT } from '@/i18n/get-t'
import { getLocale } from '@/i18n/get-locale'
import { getDictionary } from '@/i18n/dictionaries'
import { pageMetadata } from '@/lib/seo'
import ClassesBanner from '@/components/classes/classes-banner'
import ClassesGrid from '@/components/classes/classes-grid'
import type { ClassSession } from '@/components/classes/types'
import { classCardData, loadClassBookings } from '@/lib/class-cards'

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

  const classesById = new Map((classes ?? []).map(classItem => [classItem.id, classItem]))
  const upcoming = (sessions ?? []).filter(isUpcoming)
  const now = new Date()
  const current = await loadClassBookings(supabase, user?.id ?? null, upcoming.map(session => session.id), now)

  // One flat, chronological list of every upcoming session across every
  // class - no longer grouped under a per-class heading, since each class
  // now has its own free-form name rather than a shared category to group
  // by (ClassesGrid offers a name filter instead).
  const cards = upcoming
    .map(session => {
      const classInfo = session.classes?.id ? classesById.get(session.classes.id) : undefined
      return classCardData(session, locale, {
        now, classInfo, booking: current.bookings.get(session.id), known: current.known,
        authenticated: Boolean(user), requested: requestedSessionId === session.id,
      })
    })
    .sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? ''))

  return <div dir={dir}>
    <ClassesBanner title={t.classes.heading} tagline={t.classes.tagline} />
    <div className="px-5 py-16 sm:px-8 lg:px-10">
      <section className="mx-auto max-w-7xl">
        {!classes || classes.length === 0 ? <div className="rounded-[1.75rem] bg-[#C7D6E8]/55 p-8 text-[#4f5d49]">{t.classes.noClasses}</div>
          : <ClassesGrid sessions={cards} allLabel={t.classes.allFilter} emptyLabel={t.classes.noUpcoming} filterLabel={t.classes.filterLabel} />}
      </section>
    </div>
  </div>
}
