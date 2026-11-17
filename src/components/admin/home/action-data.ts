import 'server-only'
import { getAdminSession } from '@/components/admin/admin-session'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminWeekBounds } from './admin-week'

export type WeeklyAdminSession = {
  id: string; class_id: string; session_date: string; start_time: string; end_time: string
  booked_count: number; capacity: number; classes: { name: string } | null
}

export async function getAdminActionData() {
  await getAdminSession()
  const week = adminWeekBounds()
  try {
    // State-based action counts, independent of notification seen_at or sent_at.
    // The existing service-role client is only used after the server admin check.
    const admin = createAdminClient()
    const [bookings, courses, orders, requests, applications, sessions] = await Promise.all([
      admin.from('bookings').select('id', { count: 'exact', head: true }).eq('payment_status', 'unpaid').neq('status', 'cancelled'),
      admin.from('course_purchases').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      admin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      admin.from('session_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      admin.from('trip_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      admin.from('class_sessions').select('id, class_id, session_date, start_time, end_time, booked_count, capacity, classes(name)')
        .gte('session_date', week.start).lt('session_date', week.end).eq('status', 'scheduled')
        .order('session_date').order('start_time').returns<WeeklyAdminSession[]>(),
    ])
    const count = (result: { error: unknown; count: number | null }) => result.error ? null : result.count ?? 0
    return { week, counts: { bookings: count(bookings), courses: count(courses), orders: count(orders), requests: count(requests), applications: count(applications) }, sessions: sessions.data ?? [], sessionsFailed: Boolean(sessions.error) }
  } catch {
    return { week, counts: { bookings: null, courses: null, orders: null, requests: null, applications: null }, sessions: [] as WeeklyAdminSession[], sessionsFailed: true }
  }
}
