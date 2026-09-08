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
    <div className="px-5 py-16 sm:px-8 lg:px-10">
      <section className="mx-auto max-w-7xl">
        <div className="max-w-3xl space-y-5">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#617A55]">
            Plan your week
          </p>
          <h1 className="font-serif text-5xl leading-tight text-[#25311f] sm:text-6xl">
            Schedule
          </h1>
          <p className="text-lg leading-8 text-[#4f5d49]">
            Upcoming sessions across yoga, fitness, and dance. On smaller
            screens, the schedule scrolls horizontally so every detail stays
            readable.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-7xl">
      {!sessions || sessions.length === 0 ? (
        <div className="rounded-[1.75rem] bg-[#C7D6E8]/55 p-8 text-[#4f5d49]">
          No upcoming sessions.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[1.75rem] border border-[#617A55]/10 bg-white/70 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead className="bg-[#D6E2B6]/70 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[#617A55]">
                <tr>
                  <th className="px-5 py-4">Class</th>
                  <th className="px-5 py-4">Category</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Time</th>
                  <th className="px-5 py-4">Price</th>
                  <th className="px-5 py-4">Spots Left</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#617A55]/10 text-sm text-[#4f5d49]">
                {sessions.map((s) => {
                  const remaining = s.capacity - s.booked_count
                  return (
                    <tr key={s.id} className="align-top">
                      <td className="px-5 py-5 font-medium text-[#25311f]">
                        {s.classes?.name ?? 'Unknown class'}
                      </td>
                      <td className="px-5 py-5">{s.classes?.category ?? '-'}</td>
                      <td className="px-5 py-5">{s.session_date}</td>
                      <td className="px-5 py-5">
                        {s.start_time} - {s.end_time}
                      </td>
                      <td className="px-5 py-5">${s.classes?.price ?? '-'}</td>
                      <td className="px-5 py-5">
                        <span className="rounded-full bg-[#C7D6E8]/70 px-3 py-1 text-[#25311f]">
                          {remaining > 0 ? remaining : 'Full'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </section>
    </div>
  )
}
