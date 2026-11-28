type SessionDate = { session_date: string; end_time: string; status: string }
type ScheduleWindow = { start: string; end: string }
export type ClassWeek<T> = { kind: 'thisWeek' | 'nextWeek' | 'later'; sessions: T[] }
export const CLASS_SCHEDULE_ZONE = 'Asia/Jerusalem'

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

export function getScheduleWindow(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLASS_SCHEDULE_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const part = (type: string) => parts.find(value => value.type === type)?.value
  const today = `${part('year')}-${part('month')}-${part('day')}`
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: CLASS_SCHEDULE_ZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).format(now)
  // UTC is used only for date arithmetic; session times remain Jerusalem local.
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay()
  const nextWeekStart = addDays(today, 7 - weekday)
  return {
    window: { start: today, end: addDays(today, 14) },
    localNow: `${today}T${time}`,
    nextWeekStart,
    friday: addDays(nextWeekStart, -2),
    fetchEnd: addDays(nextWeekStart, 14),
  }
}

export function resolveScheduleWeek(sessions: SessionDate[], schedule: ReturnType<typeof getScheduleWindow>) {
  const { friday, localNow, nextWeekStart, window, fetchEnd } = schedule
  let cutoff = `${friday}T00:00:00`
  for (const session of sessions) {
    if (session.status !== 'scheduled' || session.session_date < friday || session.session_date >= nextWeekStart) continue
    const end = `${session.session_date}T${session.end_time.slice(0, 8)}`
    if (end > cutoff) cutoff = end
  }

  // Friday ends the display week once its final class has finished. A
  // Saturday class, if one is scheduled, still belongs to the current week.
  const rolledOver = localNow >= cutoff
  return {
    groupingBoundary: rolledOver ? addDays(nextWeekStart, 7) : nextWeekStart,
    window: rolledOver ? { start: nextWeekStart, end: fetchEnd } : window,
    refreshAt: rolledOver ? `${nextWeekStart}T00:00:00` : cutoff,
  }
}

export function isUpcomingSession(session: SessionDate, localNow: string) {
  return session.status === 'scheduled' && `${session.session_date}T${session.end_time.slice(0, 8)}` > localNow
}

export function sessionsInWindow<T extends SessionDate>(sessions: T[], window: ScheduleWindow, localNow: string) {
  return sessions.filter(session => session.session_date >= window.start && session.session_date < window.end
    && isUpcomingSession(session, localNow))
}

export function groupClassWeeks<T>(sessions: T[], nextWeekStart: string, getDate: (session: T) => string): ClassWeek<T>[] {
  const followingWeek = addDays(nextWeekStart, 7)
  const thisWeek: ClassWeek<T> = { kind: 'thisWeek', sessions: [] }
  const nextWeek: ClassWeek<T> = { kind: 'nextWeek', sessions: [] }
  const later: ClassWeek<T> = { kind: 'later', sessions: [] }

  for (const session of sessions) {
    const date = getDate(session)
    const group = date < nextWeekStart ? thisWeek : date < followingWeek ? nextWeek : later
    group.sessions.push(session)
  }

  return [thisWeek, nextWeek, later]
}
