type SessionDate = { session_date: string; end_time: string; status: string }
type ScheduleWindow = { start: string; end: string }
export type ClassWeek<T> = { kind: 'thisWeek' | 'nextWeek' | 'later'; sessions: T[] }

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

export function getScheduleWindow(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const part = (type: string) => parts.find(value => value.type === type)?.value
  const today = `${part('year')}-${part('month')}-${part('day')}`
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).format(now)
  // UTC is used only for date arithmetic; session times remain Jerusalem local.
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay()
  return {
    window: { start: today, end: addDays(today, 14) },
    localNow: `${today}T${time}`,
    nextWeekStart: addDays(today, 7 - weekday),
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
