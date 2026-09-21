import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from './logout-button'

type UpcomingBooking = {
  id: string
  status: string
  class_sessions: {
    id: string
    session_date: string
    start_time: string
    end_time: string
    location: string | null
    classes: {
      name: string
    } | null
  } | null
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

function formatTime(startTime: string, endTime: string) {
  return `${startTime.slice(0, 5)} - ${endTime.slice(0, 5)}`
}

function isUpcomingBooking(booking: UpcomingBooking) {
  const session = booking.class_sessions

  if (!session) {
    return false
  }

  return new Date(`${session.session_date}T${session.start_time}`) > new Date()
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

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Failed to load profile:', profileError.message)
  }

  const today = new Date().toISOString().slice(0, 10)
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select(
      'id, status, class_sessions!inner(id, session_date, start_time, end_time, location, classes(name))'
    )
    .eq('user_id', user.id)
    .in('status', ['confirmed', 'pending'])
    .gte('class_sessions.session_date', today)
    .order('session_date', {
      ascending: true,
      referencedTable: 'class_sessions',
    })
    .order('start_time', {
      ascending: true,
      referencedTable: 'class_sessions',
    })
    .returns<UpcomingBooking[]>()

  if (bookingsError) {
    console.error('Failed to load upcoming bookings:', bookingsError.message)
  }

  const upcomingBookings = (bookings ?? [])
    .filter(isUpcomingBooking)
    .slice(0, 2)
  const profileName = profile?.full_name?.trim()

  return (
    <main className="min-h-screen bg-[#F7F6F0] px-5 py-12 text-[#25311f] sm:px-8 lg:px-10">
      <section className="mx-auto grid max-w-5xl gap-8">
        <div className="rounded-[2rem] border border-[#617A55]/10 bg-white/70 p-6 shadow-sm sm:p-8">
          <div className="max-w-3xl space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#617A55]">
              Member area
            </p>
            <h1 className="font-serif text-5xl leading-tight sm:text-6xl">
              {profileName ? `Welcome, ${profileName}` : 'Welcome to Ahlam Space'}
            </h1>
            <p className="text-lg leading-8 text-[#4f5d49]">
              Your calm home base for bookings, classes, and studio updates.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#617A55] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#4f6645]"
              href="/schedule"
            >
              Browse classes
            </Link>
            <LogoutButton />
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
          <section className="rounded-[2rem] border border-[#617A55]/10 bg-white/70 p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#617A55]">
                  Upcoming
                </p>
                <h2 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">
                  Your next bookings
                </h2>
              </div>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#617A55]/30 px-6 py-3 text-sm font-semibold text-[#617A55] transition hover:bg-[#D6E2B6]/70"
                href="/bookings"
              >
                See all bookings
              </Link>
            </div>

            {bookingsError && (
              <div className="mt-6 rounded-[1.75rem] bg-[#C7D6E8]/55 p-5 text-sm leading-6 text-[#4f5d49]">
                We couldn&apos;t load your upcoming bookings right now.
              </div>
            )}

            {!bookingsError && upcomingBookings.length === 0 && (
              <div className="mt-6 rounded-[1.75rem] bg-[#C7D6E8]/55 p-6">
                <p className="text-lg leading-8 text-[#4f5d49]">
                  No upcoming bookings yet. Choose a class that fits your week
                  and reserve your spot when you&apos;re ready.
                </p>
                <Link
                  className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[#617A55] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#4f6645]"
                  href="/schedule"
                >
                  Book your first class
                </Link>
              </div>
            )}

            {!bookingsError && upcomingBookings.length > 0 && (
              <div className="mt-6 grid gap-4">
                {upcomingBookings.map((booking) => {
                  const session = booking.class_sessions

                  return (
                    <article
                      className="rounded-[1.75rem] border border-[#617A55]/10 bg-[#F7F6F0]/80 p-5"
                      key={booking.id}
                    >
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#617A55]">
                        {session ? formatDate(session.session_date) : 'Upcoming'}
                      </p>
                      <h3 className="mt-2 font-serif text-2xl leading-tight">
                        {session?.classes?.name ?? 'Class'}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-[#4f5d49]">
                        {session
                          ? formatTime(session.start_time, session.end_time)
                          : 'Time coming soon'}
                      </p>
                      {session?.location && (
                        <p className="mt-1 text-sm leading-6 text-[#4f5d49]">
                          {session.location}
                        </p>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          <aside className="rounded-[2rem] border border-[#617A55]/10 bg-white/70 p-6 shadow-sm sm:p-8">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#617A55]">
              Quick links
            </p>
            <div className="mt-6 grid gap-3">
              <Link
                className="rounded-[1.5rem] bg-[#D6E2B6]/70 p-5 transition hover:bg-[#D6E2B6]"
                href="/schedule"
              >
                <span className="block font-serif text-2xl">
                  Browse classes
                </span>
                <span className="mt-2 block text-sm leading-6 text-[#4f5d49]">
                  Find the next yoga, fitness, or dance session.
                </span>
              </Link>
              <Link
                className="rounded-[1.5rem] bg-[#C7D6E8]/60 p-5 transition hover:bg-[#C7D6E8]"
                href="/shop"
              >
                <span className="block font-serif text-2xl">View shop</span>
                <span className="mt-2 block text-sm leading-6 text-[#4f5d49]">
                  Explore Ahlam Space candles, care items, and rituals.
                </span>
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}
