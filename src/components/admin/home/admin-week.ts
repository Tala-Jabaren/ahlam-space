// Calendar dates, not server-local midnights: Sunday through Saturday in Jerusalem.
export function adminWeekBounds(now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const start = new Date(`${today}T00:00:00Z`)
  start.setUTCDate(start.getUTCDate() - start.getUTCDay())
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 7)
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}
