import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Locale } from '@/i18n/config'
import type { ClassBooking, ClassCardData, ClassSession } from '@/components/classes/types'

const ZONE = 'Asia/Hebron'
const TWELVE_HOURS = 12 * 60 * 60 * 1000
const categoryImages: Record<string, string> = {
  yoga: '/member/yoga-class.png', fitness: '/member/fitness-class.png', dance: '/member/dance-class.png',
}

// Convert Hebron wall-clock columns on the server, accounting for DST.
export function sessionStart(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(time)) return null
  const wall = Date.parse(`${date}T${time}Z`)
  if (!Number.isFinite(wall)) return null
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  })
  let instant = wall
  for (let iteration = 0; iteration < 3; iteration++) {
    const parts = formatter.formatToParts(instant)
    const part = (key: string) => Number(parts.find(value => value.type === key)?.value)
    const local = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'))
    const adjusted = wall - (local - instant)
    if (adjusted === instant) break
    instant = adjusted
  }
  const parts = formatter.formatToParts(instant)
  const value = (key: string) => parts.find(part => part.type === key)?.value
  if (`${value('year')}-${value('month')}-${value('day')}` !== date || `${value('hour')}:${value('minute')}` !== time.slice(0, 5)) return null
  return new Date(instant)
}

export function canCancelSession(date: string, time: string, now: Date): boolean {
  const start = sessionStart(date, time)
  return Boolean(start && start.getTime() - now.getTime() > TWELVE_HOURS)
}

export async function loadClassBookings(supabase: SupabaseClient, userId: string | null, ids: string[], now: Date) {
  const bookings = new Map<string, ClassBooking>()
  if (!userId || ids.length === 0) return { bookings, known: true }
  const { data, error } = await supabase.from('bookings')
    .select('id, session_id, status, payment_status, reserved_until')
    .eq('user_id', userId).in('session_id', ids).in('status', ['pending', 'confirmed'])
    .returns<ClassBooking[]>()
  if (error) {
    console.error('Failed to load class registration states:', error.message)
    return { bookings, known: false }
  }
  for (const booking of data ?? []) {
    // Same active-hold rule as the existing admin attendee view.
    if (booking.status === 'pending' && booking.reserved_until && new Date(booking.reserved_until).getTime() < now.getTime()) continue
    if (!bookings.has(booking.session_id) || booking.status === 'confirmed') bookings.set(booking.session_id, booking)
  }
  return { bookings, known: true }
}

export function classCardData(session: ClassSession, locale: Locale, options: {
  now: Date; booking?: ClassBooking; known: boolean; authenticated: boolean; requested?: boolean
  classInfo?: { name: string; category: string | null; price: number | null; image_url?: string | null }
}): ClassCardData {
  const info = options.classInfo ?? session.classes
  const price = typeof info?.price === 'number' && Number.isFinite(info.price) ? info.price : null
  const start = sessionStart(session.session_date, session.start_time)
  const intlLocale = locale === 'ar' ? 'ar' : 'en-US'
  const date = start ?? new Date(`${session.session_date}T12:00:00Z`)
  const weekday = new Intl.DateTimeFormat(intlLocale, { weekday: 'long', timeZone: ZONE }).format(date)
  const day = new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'long', timeZone: ZONE }).format(date)
  return {
    id: session.id, name: info?.name ?? null, category: info?.category ?? null,
    image: info?.image_url || categoryImages[info?.category ?? ''] || null,
    price, priceLabel: price === null ? null : new Intl.NumberFormat(intlLocale, { style: 'currency', currency: 'ILS', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(price),
    dateLabel: `${weekday} · ${day}`, timeLabel: `${session.start_time.slice(0, 5)} – ${session.end_time.slice(0, 5)}`,
    startsAt: start?.toISOString() ?? null, remaining: Math.max(0, session.capacity - session.booked_count),
    isFuture: Boolean(start && start > options.now),
    canCancel: Boolean(options.booking && canCancelSession(session.session_date, session.start_time, options.now)),
    booking: options.booking ?? null, bookingStatusKnown: options.known,
    authenticated: options.authenticated, requested: options.requested ?? false,
  }
}
