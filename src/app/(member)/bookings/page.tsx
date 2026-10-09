import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PaymentConfirmationBlock from '@/components/payment-confirmation-block'
import CancelBookingButton from './cancel-booking-button'

type BookingRow = {
  id: string
  status: string
  payment_status: string
  reference: string | null
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
      price: number | null
    } | null
  } | null
}

type BookingsView = 'upcoming' | 'past'

const categoryImages: Record<string, string> = {
  yoga: '/member/yoga-class.png',
  fitness: '/member/fitness-class.png',
  dance: '/member/dance-class.png',
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

function isUpcomingBooking(booking: BookingRow, today: string) {
  const sessionDate = booking.class_sessions?.session_date

  return Boolean(
    sessionDate && sessionDate >= today && booking.status !== 'cancelled'
  )
}

function formatDate(date: string) {
  const value = new Date(`${date}T00:00:00`)

  return {
    day: new Intl.DateTimeFormat('ar', { weekday: 'long' }).format(value),
    date: new Intl.DateTimeFormat('ar', {
      day: 'numeric',
      month: 'long',
    }).format(value),
  }
}

function formatTime(time: string) {
  return time.slice(0, 5)
}

function bookingStatusLabel(status: string) {
  if (status === 'confirmed') return 'تم تأكيد الحجز'
  if (status === 'pending') return 'الحجز قيد الانتظار'
  if (status === 'cancelled') return 'تم إلغاء الحجز'
  return status
}

function paymentStatusLabel(status: string) {
  if (status === 'paid') return 'مدفوع'
  if (status === 'unpaid') return 'بانتظار الدفع'
  return status
}

export default async function MyBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const { view } = await searchParams
  const activeView: BookingsView = view === 'past' ? 'past' : 'upcoming'
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
      'id, status, payment_status, reference, class_sessions(id, session_date, start_time, end_time, location, classes(name, description, category, price))'
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

  const today = new Date().toISOString().slice(0, 10)
  const upcomingBookings = (bookings ?? []).filter((booking) =>
    isUpcomingBooking(booking, today)
  )
  const pastBookings = (bookings ?? []).filter(
    (booking) => !isUpcomingBooking(booking, today)
  )
  const visibleBookings =
    activeView === 'upcoming' ? upcomingBookings : pastBookings

  return (
    <main className="px-4 py-8 text-[#617A55] sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-7xl">
        <header className="relative overflow-hidden border-b border-[#617A55]/15 pb-8 sm:pb-10">
          <div className="relative z-10 max-w-2xl">
            <h1 className="font-serif text-4xl leading-tight sm:text-5xl">
              حجوزاتي
            </h1>
            <p className="mt-3 text-base leading-8 text-[#617A55]/80 sm:text-lg">
              تابعي حجوزاتك القادمة وحالة الدفع، وراجعي حصصك السابقة في مكان
              واحد.
            </p>
          </div>

          <div
            aria-hidden="true"
            className="absolute bottom-0 left-5 hidden h-28 w-40 opacity-25 sm:block"
          >
            <span className="absolute bottom-1 left-16 h-24 w-px -rotate-12 bg-[#617A55]" />
            <span className="absolute bottom-14 left-5 h-12 w-7 -rotate-45 rounded-[100%_0_100%_0] bg-[#617A55]" />
            <span className="absolute bottom-8 left-16 h-12 w-7 -rotate-12 rounded-[100%_0_100%_0] bg-[#617A55]" />
            <span className="absolute bottom-16 left-24 h-12 w-7 rotate-12 rounded-[0_100%_0_100%] bg-[#617A55]" />
          </div>
        </header>

        <nav
          className="mt-6 grid grid-cols-2 gap-2 rounded-lg bg-[#C7D6E8]/25 p-1.5 sm:max-w-xl"
          aria-label="تصنيف الحجوزات"
        >
          <Link
            href="/bookings"
            aria-current={activeView === 'upcoming' ? 'page' : undefined}
            className={`flex min-h-12 items-center justify-center rounded-lg px-4 text-sm font-semibold transition ${
              activeView === 'upcoming'
                ? 'bg-[#617A55] text-[#F7F6F0] shadow-sm'
                : 'hover:bg-[#D6E2B6]/60'
            }`}
          >
            القادمة ({upcomingBookings.length})
          </Link>
          <Link
            href="/bookings?view=past"
            aria-current={activeView === 'past' ? 'page' : undefined}
            className={`flex min-h-12 items-center justify-center rounded-lg px-4 text-sm font-semibold transition ${
              activeView === 'past'
                ? 'bg-[#617A55] text-[#F7F6F0] shadow-sm'
                : 'hover:bg-[#D6E2B6]/60'
            }`}
          >
            السابقة ({pastBookings.length})
          </Link>
        </nav>

        {error && (
          <div className="mt-7 rounded-lg bg-[#C7D6E8]/55 p-6 text-center">
            تعذر تحميل الحجوزات الآن.
          </div>
        )}

        {!error && visibleBookings.length === 0 && (
          <div className="mt-7 rounded-lg bg-[#C7D6E8]/40 p-8 text-center">
            <p className="font-serif text-2xl">
              {activeView === 'upcoming'
                ? 'لا توجد حجوزات قادمة حتى الآن.'
                : 'لا توجد حجوزات سابقة حتى الآن.'}
            </p>
          </div>
        )}

        {!error && visibleBookings.length > 0 && (
          <div className="mt-7 grid gap-5">
            {visibleBookings.map((booking) => {
              const session = booking.class_sessions
              const classInfo = session?.classes
              const formattedDate = session
                ? formatDate(session.session_date)
                : null
              const image =
                categoryImages[classInfo?.category ?? ''] ??
                categoryImages.yoga

              return (
                <article
                  key={booking.id}
                  className="overflow-hidden rounded-lg border border-[#617A55]/10 bg-[#F7F6F0] shadow-sm"
                >
                  <div className="grid min-w-0 md:grid-cols-[minmax(240px,34%)_1fr]">
                    <div className="relative aspect-[16/10] min-h-52 overflow-hidden bg-[#C7D6E8]/35 md:aspect-auto md:min-h-72">
                      <Image
                        src={image}
                        alt=""
                        fill
                        sizes="(min-width: 768px) 34vw, 100vw"
                        className="object-cover"
                      />
                      {formattedDate && (
                        <div className="absolute left-4 top-4 rounded-lg bg-[#F7F6F0]/95 px-4 py-3 text-center shadow-sm">
                          <span className="block text-sm font-bold">
                            {formattedDate.day}
                          </span>
                          <span className="mt-1 block text-xs">
                            {formattedDate.date}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-col p-5 sm:p-6 lg:p-7">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h2 className="break-words font-serif text-2xl leading-tight sm:text-3xl">
                            {classInfo?.name ?? 'حصة'}
                          </h2>
                          {classInfo?.description && (
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#617A55]/75">
                              {classInfo.description}
                            </p>
                          )}
                        </div>

                        <span
                          className={`inline-flex min-h-10 shrink-0 items-center self-start rounded-full px-4 text-sm font-semibold ${
                            booking.status === 'confirmed'
                              ? 'bg-[#D6E2B6]/70'
                              : 'bg-[#C7D6E8]/65'
                          }`}
                        >
                          {bookingStatusLabel(booking.status)}
                        </span>
                      </div>

                      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                        <div className="flex min-w-0 items-start gap-3">
                          <dt aria-label="الوقت" className="text-lg">
                            ◷
                          </dt>
                          <dd>
                            {session
                              ? `${formatTime(session.start_time)} - ${formatTime(session.end_time)}`
                              : '-'}
                          </dd>
                        </div>
                        <div className="flex min-w-0 items-start gap-3 sm:col-span-2">
                          <dt aria-label="الموقع" className="text-lg">
                            ⌖
                          </dt>
                          <dd className="min-w-0 break-words">
                            {session?.location ?? '-'}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-auto flex flex-col gap-3 border-t border-[#617A55]/15 pt-5 sm:flex-row sm:items-center sm:justify-between">
                        <span
                          className={`inline-flex min-h-11 items-center self-start rounded-full px-5 text-sm font-semibold ${
                            booking.payment_status === 'paid'
                              ? 'bg-[#617A55] text-[#F7F6F0]'
                              : 'bg-[#C7D6E8] text-[#617A55]'
                          }`}
                        >
                          {paymentStatusLabel(booking.payment_status)}
                        </span>

                        {canCancelBooking(booking) && (
                          <CancelBookingButton bookingId={booking.id} />
                        )}
                      </div>

                      {booking.payment_status === 'unpaid' &&
                        booking.reference &&
                        booking.status !== 'cancelled' && (
                          <div className="mt-5">
                            <PaymentConfirmationBlock
                              amount={classInfo?.price ?? 0}
                              reference={booking.reference}
                            />
                          </div>
                        )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        <aside className="mt-7 overflow-hidden rounded-lg bg-[#D6E2B6]/45 p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div aria-hidden="true" className="flex shrink-0 justify-center">
                <span className="block h-12 w-7 -rotate-12 rounded-[100%_0_100%_0] bg-[#617A55]/70" />
                <span className="-ml-1 mt-6 block h-9 w-5 rotate-12 rounded-[0_100%_0_100%] bg-[#617A55]/45" />
              </div>
              <div>
                <h2 className="font-serif text-xl sm:text-2xl">
                  تريدين حجز المزيد من الحصص؟
                </h2>
                <p className="mt-1 text-sm leading-6 text-[#617A55]/75">
                  مساحة للحركة والهدوء والتوازن.
                </p>
              </div>
            </div>
            <Link
              href="/classes"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-[#617A55] px-7 py-3 text-sm font-semibold text-[#F7F6F0] transition hover:bg-[#617A55]/85"
            >
              تصفحي الحصص
            </Link>
          </div>
        </aside>
      </section>
    </main>
  )
}
