export type SessionFilter = 'all' | 'active' | 'cancelled'

export function calendarDate(value: string | undefined, fallback: string) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return fallback
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : fallback
}

export function classCalendarMonth(date: string) {
  const start = `${date.slice(0, 7)}-01`
  const first = new Date(`${start}T00:00:00Z`)
  const offsetMonth = (offset: number, day = 1) => {
    const shifted = new Date(first)
    shifted.setUTCMonth(shifted.getUTCMonth() + offset, day)
    return shifted.toISOString().slice(0, 10)
  }
  return {
    start,
    end: offsetMonth(1, 0),
    firstWeekday: first.getUTCDay(),
    previous: start === '0001-01-01' ? null : offsetMonth(-1),
    next: start === '9999-12-01' ? null : offsetMonth(1),
  }
}

export function classCalendarHref(date: string, classId = 'all', status: SessionFilter = 'all') {
  const params = new URLSearchParams({ tab: 'sessions', date })
  if (classId !== 'all') params.set('classId', classId)
  if (status !== 'all') params.set('status', status)
  return `/admin/classes?${params}`
}
