const STUDIO_TIME_ZONE = 'Asia/Jerusalem'

const studioDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: STUDIO_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const studioTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: STUDIO_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export const MAX_PREFERRED_SLOTS = 8

export function studioMinute(now = new Date()) {
  return `${studioDate.format(now)}T${studioTime.format(now)}`
}

// Proposals are stored as the studio's wall-clock times. Use UTC when
// formatting the stored clock values so the viewer's timezone cannot shift them.
export function formatPreferredSlot(slot: string, locale: string) {
  const date = new Date(`${slot.slice(0, 16)}:00Z`)
  if (!Number.isFinite(date.getTime())) return null

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date)
}
