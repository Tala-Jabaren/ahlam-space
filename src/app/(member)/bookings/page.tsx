import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CancelBookingButton from './cancel-booking-button'

type BookingRow = {
  id: string
  status: string
  payment_status: string
  class_sessions: {
    id: string
    session_date: string
    start_time: string
    end_time: string
    location: string | null
    classes: {
      name: string
      description: string | null
      category: string | null
    } | null
  } | null
}

function canCancelBooking(booking: BookingRow) {
  const sessionDate = booking.class_sessions?.session_date

  if (!sessionDate) {
    return false
  }

  const today = new Date().toISOString().slice(0, 10)
  const isCancelableStatus =
    booking.status === 'confirmed' || booking.status === 'pending'

  return isCancelableStatus && sessionDate > today
}

export default async function MyBookingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (!user) {
    if (userError) {
      console.error('supabase.auth.getUser() failed:', userError.message)
    }
    redirect('/login')
  }

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(
      'id, status, payment_status, class_sessions(id, session_date, start_time, end_time, location, classes(name, description, category))'
    )
    .eq('user_id', user.id)
    .order('session_date', {
      ascending: true,
      referencedTable: 'class_sessions',
    })
    .returns<BookingRow[]>()

  if (error) {
    console.error('Failed to load bookings:', error.message)
  }

  return (
    <div className="min-h-screen bg-[#F7F6F0] px-5 py-12 text-[#25311f] sm:px-8 lg:px-10">
      <section className="mx-auto max-w-5xl">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#617A55]">
            Member area
          </p>
          <h1 className="font-serif text-5xl leading-tight sm:text-6xl">
            حجوزاتي
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-[#4f5d49]">
            راجعي حصصك القادمة وحالة الدفع، ويمكنك إلغاء الحجز المتاح قبل
            موعد الحصة بأكثر من 24 ساعة.
          </p>
        </div>

        {error && (
          <div className="mt-10 rounded-[1.75rem] bg-[#C7D6E8]/55 p-6 text-[#4f5d49]">
            تعذر تحميل الحجوزات الآن.
          </div>
        )}

        {!error && (!bookings || bookings.length === 0) && (
          <div className="mt-10 rounded-[1.75rem] bg-[#C7D6E8]/55 p-6 text-[#4f5d49]">
            لا توجد حجوزات حتى الآن.
          </div>
        )}

        {!error && bookings && bookings.length > 0 && (
          <div className="mt-10 grid gap-5">
            {bookings.map((booking) => {
              const session = booking.class_sessions
              const classInfo = session?.classes

              return (
                <article
                  key={booking.id}
                  className="rounded-[1.75rem] border border-[#617A55]/10 bg-white/70 p-6 shadow-sm"
                >
                  <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617A55]">
                          {classInfo?.category ?? 'class'}
                        </p>
                        <h2 className="mt-2 font-serif text-3xl leading-tight">
                          {classInfo?.name ?? 'Unknown class'}
                        </h2>
                        {classInfo?.description && (
                          <p className="mt-3 leading-7 text-[#4f5d49]">
                            {classInfo.description}
                          </p>
                        )}
                      </div>

                      <dl className="grid gap-3 text-sm text-[#4f5d49] sm:grid-cols-2">
                        <div>
                          <dt className="font-semibold text-[#25311f]">
                            Date
                          </dt>
                          <dd>{session?.session_date ?? '-'}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-[#25311f]">
                            Time
                          </dt>
                          <dd>
                            {session
                              ? `${session.start_time} - ${session.end_time}`
                              : '-'}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-[#25311f]">
                            Booking status
                          </dt>
                          <dd>{booking.status}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-[#25311f]">
                            Payment status
                          </dt>
                          <dd>{booking.payment_status}</dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="font-semibold text-[#25311f]">
                            Location
                          </dt>
                          <dd>{session?.location ?? '-'}</dd>
                        </div>
                      </dl>
                    </div>

                    {canCancelBooking(booking) && (
                      <CancelBookingButton bookingId={booking.id} />
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
