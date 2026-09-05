import { createClient } from '@/lib/supabase/server'

type ScheduleRow = {
  id: string
  session_date: string
  start_time: string
  end_time: string
  capacity: number
  booked_count: number
  status: string
  classes: {
    name: string
    category: string | null
    price: number
  } | null
}

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data: sessions, error } = await supabase
    .from('class_sessions')
    .select(
      'id, session_date, start_time, end_time, capacity, booked_count, status, classes(name, category, price)'
    )
    .order('session_date', { ascending: true })
    .returns<ScheduleRow[]>()

  if (error) {
    console.error('Failed to load schedule:', error.message)
  }

  return (
    <div style={{ maxWidth: 900, margin: '40px auto' }}>
      <h1>Schedule</h1>
      {!sessions || sessions.length === 0 ? (
        <p>No upcoming sessions.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Class</th>
              <th style={{ textAlign: 'left' }}>Category</th>
              <th style={{ textAlign: 'left' }}>Date</th>
              <th style={{ textAlign: 'left' }}>Time</th>
              <th style={{ textAlign: 'left' }}>Price</th>
              <th style={{ textAlign: 'left' }}>Spots Left</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => {
              const remaining = s.capacity - s.booked_count
              return (
                <tr key={s.id}>
                  <td>{s.classes?.name ?? 'Unknown class'}</td>
                  <td>{s.classes?.category ?? '-'}</td>
                  <td>{s.session_date}</td>
                  <td>
                    {s.start_time} - {s.end_time}
                  </td>
                  <td>${s.classes?.price ?? '-'}</td>
                  <td>{remaining > 0 ? remaining : 'Full'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
