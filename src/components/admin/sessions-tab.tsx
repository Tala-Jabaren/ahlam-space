import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import AdminDeleteButton from './admin-delete-button'
import { SessionControls, type BookingContact } from './session-controls'
import type { ClassRecord } from './catalog-editor'
import { classCalendarHref, classCalendarMonth, type SessionFilter } from '@/lib/admin-class-calendar'
import CalendarAddClass from './calendar-add-class'

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


const weekdays = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
const monthFormat = new Intl.DateTimeFormat('ar', { year: 'numeric', month: 'long', timeZone: 'UTC' })
const dayFormat = new Intl.DateTimeFormat('ar', { dateStyle: 'full', timeZone: 'UTC' })
const number = new Intl.NumberFormat('ar')
const monthNavStyle = 'grid size-11 flex-none place-items-center rounded-full border border-[#617A55]/25 text-[#465d3d] hover:bg-[#D6E2B6]/45 focus-visible:outline-2'

function chipStyle(active: boolean) {
  return `inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55] ${active ? 'bg-[#617A55] text-white' : 'border border-[#617A55]/25 text-[#465d3d] hover:bg-[#D6E2B6]/50'}`
}

export default function SessionsTab({
  sessions,
  sessionCounts,
  classes,
  attendeeCounts,
  contactsBySession,
  contactsError,
  today,
  selectedDate,
  loadError,
  classId,
  status,
  packagesEnabled,
}: {
  sessions: SessionRow[]
  sessionCounts: Record<string, number>
  classes: ClassRecord[]
  attendeeCounts: Record<string, number>
  contactsBySession: Record<string, BookingContact[]>
  contactsError: boolean
  today: string
  selectedDate: string
  loadError: boolean
  classId: string
  status: SessionFilter
  packagesEnabled: boolean
}) {
  const month = classCalendarMonth(selectedDate)
  const dateHref = (date: string) => classCalendarHref(date, classId, status)
  const filterHref = (filterClassId: string, filterStatus: SessionFilter) => classCalendarHref(selectedDate, filterClassId, filterStatus)
  const statusOptions = [
    ['all', 'كل الحالات'],
    ['active', 'مجدولة ومكتملة'],
    ['cancelled', 'ملغاة'],
  ] as const

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="تصفية حسب الحصة">
          <Link href={filterHref('all', status)} prefetch={false} scroll={false} aria-current={classId === 'all' ? 'true' : undefined} className={chipStyle(classId === 'all')}>كل الحصص</Link>
          {classes.map((item) => (
            <Link key={item.id} href={filterHref(item.id, status)} prefetch={false} scroll={false} aria-current={classId === item.id ? 'true' : undefined} className={chipStyle(classId === item.id)}>{item.name}</Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="حالة المواعيد">
          {statusOptions.map(([value, label]) => (
            <Link key={value} href={filterHref(classId, value)} prefetch={false} scroll={false} aria-current={status === value ? 'true' : undefined} className={chipStyle(status === value)}>{label}</Link>
          ))}
        </div>
      </div>

      <div className="mt-5 grid items-start gap-6 xl:grid-cols-[minmax(19rem,1fr)_minmax(0,1.35fr)]">
        <section aria-label="تقويم الحصص" className="min-w-0 rounded-xl border border-[#617A55]/15 bg-white p-3 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            {month.previous ? (
              <Link aria-label="الشهر السابق" href={dateHref(month.previous)} prefetch={false} scroll={false} className={monthNavStyle}>
                <ChevronRight size={18} aria-hidden="true" className="ltr:rotate-180" />
              </Link>
            ) : <span className="size-11" aria-hidden="true" />}
            <h2 className="text-center text-lg text-[#465d3d]">{monthFormat.format(new Date(`${month.start}T00:00:00Z`))}</h2>
            {month.next ? (
              <Link aria-label="الشهر التالي" href={dateHref(month.next)} prefetch={false} scroll={false} className={monthNavStyle}>
                <ChevronLeft size={18} aria-hidden="true" className="ltr:rotate-180" />
              </Link>
            ) : <span className="size-11" aria-hidden="true" />}
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center sm:gap-1">
            {weekdays.map((day) => <span key={day} className="py-2 text-[10px] font-semibold text-[#465d3d] sm:text-xs">{day}</span>)}
            {Array.from({ length: month.firstWeekday }, (_, index) => <span key={`blank-${index}`} aria-hidden="true" />)}
            {Array.from({ length: Number(month.end.slice(8)) }, (_, index) => {
              const day = index + 1
              const date = `${month.start.slice(0, 7)}-${String(day).padStart(2, '0')}`
              const count = sessionCounts[date] ?? 0
              const selected = date === selectedDate
              const label = dayFormat.format(new Date(`${date}T00:00:00Z`))
              const style = selected ? 'bg-[#465d3d] text-white' : count ? 'bg-[#D6E2B6]/50 text-[#25311f] hover:bg-[#D6E2B6]' : 'text-[#465d3d] hover:bg-[#F7F6F0]'
              return (
                <Link
                  key={date}
                  href={dateHref(date) + '#calendar-day'}
                  prefetch={false}
                  aria-current={selected ? 'date' : undefined}
                  aria-label={`${label}${count ? `، عدد الحصص ${number.format(count)}` : ''}`}
                  className={`flex min-h-11 min-w-0 flex-col items-center justify-center rounded-lg text-sm font-semibold focus-visible:outline-2 ${style} ${date === today && !selected ? 'ring-1 ring-inset ring-[#617A55]' : ''}`}
                >
                  {number.format(day)}
                  {count > 0 && <span aria-hidden="true" className={`rounded-full px-1 text-[10px] leading-4 ${selected ? 'bg-white/20' : 'bg-[#D6E2B6]'}`}>{number.format(count)}</span>}
                </Link>
              )
            })}
          </div>
          <div className="mt-3 border-t border-[#617A55]/15 pt-2">
            <Link href={dateHref(today)} prefetch={false} scroll={false} className="inline-flex min-h-10 items-center rounded-lg px-2 text-sm font-semibold text-[#465d3d] hover:bg-[#D6E2B6]/40 focus-visible:outline-2">العودة إلى اليوم</Link>
          </div>
        </section>

        <section id="calendar-day" className="min-w-0 scroll-mt-24">
          <h2 className="mb-3 text-lg text-[#465d3d]">{dayFormat.format(new Date(`${selectedDate}T00:00:00Z`))}</h2>
          {selectedDate >= today && (
            <CalendarAddClass key={`${selectedDate}-${classId}`} date={selectedDate} today={today} classes={classes} classId={classId} packagesEnabled={packagesEnabled} />
          )}
          {loadError ? (
            <p role="alert" className="rounded-lg bg-[#C7D6E8]/50 p-5">تعذر تحميل المواعيد. تحققي من الاتصال وصلاحيات العرض.</p>
          ) : sessions.length === 0 ? (
            <p className="rounded-lg bg-[#D6E2B6]/40 p-5 text-sm">لا توجد حصص مطابقة في هذا اليوم.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  attendeeCount={attendeeCounts[session.id]}
                  contacts={contactsBySession[session.id] ?? []}
                  contactsError={contactsError}
                />
              ))}
            </div>
          )}
        </section>
      </div>
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
        التفاصيل والمسجّلات ({attendeeCount ?? '—'})
      </Link>

      <SessionControls session={session} contacts={contacts} contactsError={contactsError} />
    </article>
  )
}
