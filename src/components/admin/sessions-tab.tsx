'use client'

import { useState } from 'react'
import Link from 'next/link'
import AdminDeleteButton from './admin-delete-button'
import { SessionControls, type BookingContact } from './session-controls'
import type { ClassRecord } from './catalog-editor'

export type SessionRow = {
  id: string
  class_id: string
  session_date: string
  start_time: string
  end_time: string
  capacity: number
  booked_count: number
  status: string
  classes: { name: string } | null
}

const statusLabels: Record<string, string> = { scheduled: 'مجدولة', completed: 'مكتملة', cancelled: 'ملغاة' }
const statusBadgeStyle: Record<string, string> = {
  scheduled: 'bg-[#D6E2B6]/70 text-[#3f5233]',
  completed: 'bg-[#617A55]/15 text-[#617A55]/80',
  cancelled: 'bg-[#E8C7C7]/70 text-[#8a4a4a]',
}

function weekStartOf(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - date.getUTCDay())
  return date.toISOString().slice(0, 10)
}

function weekLabel(weekStart: string, todayWeekStart: string) {
  if (weekStart === todayWeekStart) return 'هذا الأسبوع'
  const diffDays = Math.round((Date.parse(weekStart) - Date.parse(todayWeekStart)) / 86_400_000)
  if (diffDays === 7) return 'الأسبوع القادم'
  if (diffDays === -7) return 'الأسبوع الماضي'
  const dateLabel = new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${weekStart}T00:00:00Z`))
  return `أسبوع ${dateLabel}`
}

function chipStyle(active: boolean) {
  return `inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-4 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55] ${active ? 'bg-[#617A55] text-[#F7F6F0]' : 'border border-[#617A55]/25 text-[#617A55] hover:bg-[#D6E2B6]/50'}`
}

function toggleStyle(active: boolean) {
  return `inline-flex min-h-9 items-center justify-center rounded-full px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55] ${active ? 'bg-[#617A55] text-[#F7F6F0]' : 'text-[#617A55] hover:bg-white/60'}`
}

export default function SessionsTab({
  sessions,
  classes,
  attendeeCounts,
  contactsBySession,
  contactsError,
  today,
  loadError,
  initialClassId,
}: {
  sessions: SessionRow[]
  classes: ClassRecord[]
  attendeeCounts: Record<string, number>
  contactsBySession: Record<string, BookingContact[]>
  contactsError: boolean
  today: string
  loadError: boolean
  initialClassId: string
}) {
  const [classId, setClassId] = useState(initialClassId)
  const [status, setStatus] = useState<'scheduled' | 'cancelled'>('scheduled')

  const filtered = sessions.filter(
    (session) =>
      (classId === 'all' || session.class_id === classId) &&
      (status === 'cancelled' ? session.status === 'cancelled' : session.status !== 'cancelled')
  )

  const todayWeekStart = weekStartOf(today)
  const groups = new Map<string, SessionRow[]>()
  for (const session of filtered) {
    const key = weekStartOf(session.session_date)
    const list = groups.get(key) ?? []
    list.push(session)
    groups.set(key, list)
  }

  return (
    <div className="mt-6">

      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="تصفية حسب الحصة">
          <button type="button" onClick={() => setClassId('all')} className={chipStyle(classId === 'all')}>كل الحصص</button>
          {classes.map((item) => (
            <button key={item.id} type="button" onClick={() => setClassId(item.id)} className={chipStyle(classId === item.id)}>{item.name}</button>
          ))}
        </div>
        <div className="inline-flex shrink-0 rounded-full bg-[#D6E2B6]/40 p-1" role="group" aria-label="حالة المواعيد">
          <button type="button" onClick={() => setStatus('scheduled')} className={toggleStyle(status === 'scheduled')}>مجدولة</button>
          <button type="button" onClick={() => setStatus('cancelled')} className={toggleStyle(status === 'cancelled')}>ملغاة</button>
        </div>
      </div>

      {loadError ? (
        <p role="alert" className="mt-6 rounded-lg bg-[#C7D6E8]/50 p-5">تعذر تحميل المواعيد. تحققي من الاتصال وصلاحيات العرض.</p>
      ) : groups.size === 0 ? (
        <p className="mt-6 rounded-lg bg-[#D6E2B6]/40 p-5">{status === 'cancelled' ? 'لا توجد مواعيد ملغاة.' : 'لا توجد مواعيد ضمن هذه الفترة.'}</p>
      ) : (
        [...groups.entries()].map(([weekStart, items]) => (
          <section key={weekStart} className="mt-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#617A55]/70">{weekLabel(weekStart, todayWeekStart)}</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {items.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  attendeeCount={attendeeCounts[session.id]}
                  contacts={contactsBySession[session.id] ?? []}
                  contactsError={contactsError}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}

function SessionCard({
  session,
  attendeeCount,
  contacts,
  contactsError,
}: {
  session: SessionRow
  attendeeCount: number | undefined
  contacts: BookingContact[]
  contactsError: boolean
}) {
  const pct = session.capacity > 0 ? Math.min(100, Math.round((session.booked_count / session.capacity) * 100)) : 0
  return (
    <article className="min-w-0 rounded-lg border border-[#617A55]/15 bg-white p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-semibold text-[#617A55]">{session.classes?.name ?? 'حصة غير متاحة'}</h3>
          <p className="mt-1 text-sm text-[#617A55]/80">
            {new Intl.DateTimeFormat('ar', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${session.session_date}T00:00:00Z`))}
            {' · '}
            <span dir="ltr">{session.start_time.slice(0, 5)}–{session.end_time.slice(0, 5)}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeStyle[session.status] ?? 'bg-[#617A55]/10 text-[#617A55]/80'}`}>
            {statusLabels[session.status] ?? session.status}
          </span>
          <AdminDeleteButton kind="session" id={session.id} label={`${session.classes?.name ?? 'حصة'} / ${session.session_date}`} />
        </div>
      </header>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-[#617A55]/70"><span>الحجوزات</span><bdi>{session.booked_count} / {session.capacity}</bdi></div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#D6E2B6]/50"><div className="h-full rounded-full bg-[#617A55]" style={{ width: `${pct}%` }} /></div>
      </div>

      <Link
        href={`/admin/classes/${session.class_id}/sessions/${session.id}/attendees`}
        className="mt-4 inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[#617A55] px-4 text-sm font-semibold text-white transition hover:bg-[#617A55]/85"
      >
        المسجلات ({attendeeCount ?? '—'})
      </Link>

      <SessionControls session={session} contacts={contacts} contactsError={contactsError} />
    </article>
  )
}
