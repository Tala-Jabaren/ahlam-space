import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from './logout-button'

type BookingRow = {
  id: string
  status: string
  payment_status: string
  class_sessions: {
    session_date: string
    start_time: string
    end_time: string
    location: string | null
    classes: { name: string } | null
  } | null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (!user) {
    if (error) {
      console.error('supabase.auth.getUser() failed:', error.message)
    }
    redirect('/login')
  }

  const { data: rawBookings, error: bookingsError } = await supabase
    .from('bookings')
    .select(
      'id, status, payment_status, class_sessions(session_date, start_time, end_time, location, classes(name))'
    )
    .eq('user_id', user.id)
    .neq('status', 'cancelled')
    .returns<BookingRow[]>()

  if (bookingsError) {
    console.error('Failed to load bookings:', bookingsError.message)
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const upcomingBookings = (rawBookings ?? [])
    .filter((b) => b.class_sessions && b.class_sessions.session_date >= todayStr)
    .sort((a, b) =>
      a.class_sessions!.session_date.localeCompare(b.class_sessions!.session_date)
    )

  return (
    <div style={{ maxWidth: 600, margin: '40px auto' }}>
      <h1>Dashboard</h1>
      <p>Logged in as: {user.email}</p>

      <h2 style={{ marginTop: 32 }}>Upcoming Bookings</h2>
      {upcomingBookings.length === 0 ? (
        <p>لا يوجد حجوزات قادمة</p>
      ) : (
        <ul>
          {upcomingBookings.map((b) => (
            <li key={b.id} style={{ marginBottom: 16 }}>
              <p>
                <strong>{b.class_sessions?.classes?.name ?? 'Unknown class'}</strong>
              </p>
              <p>
                {b.class_sessions?.session_date} &middot;{' '}
                {b.class_sessions?.start_time} - {b.class_sessions?.end_time}
              </p>
              {b.class_sessions?.location && <p>{b.class_sessions.location}</p>}
              <p>
                Status: {b.status} &middot; Payment: {b.payment_status}
              </p>
            </li>
          ))}
        </ul>
      )}

      <LogoutButton />
    </div>
  )
}
