type SessionDate = { session_date: string; end_time: string; status: string }
type ScheduleWindow = { start: string; end: string }

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
  return { window: { start: today, end: addDays(today, 14) }, localNow: `${today}T${time}` }
}

export function sessionsInWindow<T extends SessionDate>(sessions: T[], window: ScheduleWindow, localNow: string) {
  return sessions.filter(session => session.status === 'scheduled'
    && session.session_date >= window.start && session.session_date < window.end
    && `${session.session_date}T${session.end_time.slice(0, 8)}` > localNow)
}
