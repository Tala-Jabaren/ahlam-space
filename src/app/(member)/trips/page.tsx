import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TripPhotoStrip, { type TripPhoto } from '@/components/trips/trip-photo-strip'
import TripCard, { formatTripDate } from '@/components/trips/trip-card'
import WithdrawApplicationButton from '@/components/trips/withdraw-application-button'
import { isTripAcceptingApplications, todayInHebron, type TripRow } from '@/lib/trips'

type TripPhotoWithTripDate = TripPhoto & { display_order: number; trips: { starts_on: string } | null }

// Gentler member-facing wording, deliberately not tripApplicationStatusLabels
// from src/lib/trips.ts (that one's for the admin view).
const memberStatusLabels: Record<string, string> = {
  pending: 'قيد المراجعة',
  approved: 'تم قبولك',
  waitlisted: 'على قائمة الانتظار',
  declined: 'لم نتمكن من إدراجك في هذا المشوار',
  withdrawn: 'تم الانسحاب',
}

const memberStatusStyles: Record<string, string> = {
  pending: 'bg-[#C7D6E8]/60 text-[#4f5d49]',
  approved: 'bg-[#617A55] text-[#F7F6F0]',
  waitlisted: 'bg-[#D6E2B6]/75 text-[#4f5d49]',
  declined: 'border border-[#617A55]/20 bg-transparent text-[#617A55]/70',
  withdrawn: 'border border-[#617A55]/20 bg-transparent text-[#617A55]/70',
}

// Members can only directly SELECT these 6 columns of trip_applications
// (see the column-level grant in supabase/trips.sql) - never full_name/
// phone/email/intention/the health answers/admin_note, even their own.
type MyApplicationRow = {
  id: string
  trip_id: string
  status: string
  created_at: string
  reviewed_at: string | null
  trips: { title: string; starts_on: string; location: string } | null
}

export default async function MyTripsPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (!user) {
    if (userError) console.error('supabase.auth.getUser() failed:', userError.message)
    redirect('/login?returnTo=/trips')
  }

  const [
    { data: openTrips, error: openTripError },
    { data: photos, error: photosError },
    { data: applications, error: applicationsError },
  ] = await Promise.all([
    supabase
      .from('trips')
      .select('id, title, description, location, starts_on, ends_on, application_deadline, capacity, cover_image_url, status, created_at')
      .eq('status', 'open')
      .order('starts_on', { ascending: true })
      .limit(5)
      .returns<TripRow[]>(),
    supabase
      .from('trip_photos')
      .select('id, photo_url, caption, display_order, trips!inner(starts_on)')
      .eq('is_published', true)
      .order('starts_on', { ascending: false, referencedTable: 'trips' })
      .order('display_order', { ascending: true })
      .limit(16)
      .returns<TripPhotoWithTripDate[]>(),
    supabase
      .from('trip_applications')
      .select('id, trip_id, status, created_at, reviewed_at, trips(title, starts_on, location)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .returns<MyApplicationRow[]>(),
  ])

  if (openTripError) console.error('Failed to load the open trip:', openTripError.message)
  if (photosError) console.error('Failed to load trip photos:', photosError.message)
  if (applicationsError) console.error('Failed to load my trip applications:', applicationsError.message)

  const today = todayInHebron()
  // Still "open" but already past ends_on -> no open trip to show at all,
  // same rule as the public home section.
  const openTrip = (openTrips ?? []).find((trip) => trip.ends_on >= today) ?? null
  const visiblePhotos: TripPhoto[] = (photos ?? []).map((photo) => ({
    id: photo.id,
    photo_url: photo.photo_url,
    caption: photo.caption,
    display_order: photo.display_order,
  }))
  const myApplications = applications ?? []
  const hasAlreadyAppliedToOpenTrip = Boolean(
    openTrip && myApplications.some((application) => application.trip_id === openTrip.id && application.status !== 'withdrawn')
  )
  const openTripAccepting = openTrip ? isTripAcceptingApplications(openTrip, today) : false

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="border-b border-[#617A55]/15 pb-6 font-serif text-3xl text-[#617A55]">المشاوير</h1>

      {visiblePhotos.length > 0 && (
        <div className="mt-8">
          <TripPhotoStrip photos={visiblePhotos} />
        </div>
      )}

      {openTrip && (
        <section className="mt-10">
          <h2 className="mb-4 font-serif text-2xl text-[#25311f]">المشوار القادم</h2>
          <TripCard
            trip={openTrip}
            badgeLabel={openTripAccepting ? 'التسجيل مفتوح' : 'انتهى التقديم'}
            deadlineLabel="آخر موعد للتقديم"
            cta={
              !openTripAccepting ? null : hasAlreadyAppliedToOpenTrip ? (
                <p className="text-sm text-[#617A55]">
                  قدّمتِ طلب المشاركة بهذا المشوار بالفعل - تابعي حالته في &quot;طلباتي&quot; أدناه.
                </p>
              ) : (
                <Link
                  href={`/trips/${openTrip.id}/apply`}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#617A55] px-7 py-3 text-sm font-semibold text-[#F7F6F0] transition-colors hover:bg-[#617A55]/90"
                >
                  قدّمي طلب المشاركة
                </Link>
              )
            }
          />
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-4 font-serif text-2xl text-[#25311f]">طلباتي</h2>
        {applicationsError ? (
          <p role="alert" className="rounded-lg bg-[#C7D6E8]/50 p-5 text-sm">
            تعذر تحميل طلباتك. تحققي من الاتصال.
          </p>
        ) : myApplications.length === 0 ? (
          !openTrip && visiblePhotos.length === 0 ? (
            <p className="rounded-lg bg-[#D6E2B6]/35 p-6 text-center text-sm text-[#617A55]">
              لا توجد مشاوير متاحة حاليًا. تابعينا لمعرفة المواعيد القادمة.
            </p>
          ) : (
            <p className="text-sm text-[#617A55]/80">لم تقدّمي أي طلب مشاركة بعد.</p>
          )
        ) : (
          <ul className="space-y-3">
            {myApplications.map((application) => (
              <li
                key={application.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#617A55]/15 bg-white p-5"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[#25311f]">{application.trips?.title ?? 'مشوار'}</p>
                  <p className="mt-1 text-sm text-[#617A55]/75">
                    أرسلتِ الطلب في <bdi>{formatTripDate(application.created_at.slice(0, 10))}</bdi>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${memberStatusStyles[application.status] ?? ''}`}
                  >
                    {memberStatusLabels[application.status] ?? application.status}
                  </span>
                  {(application.status === 'pending' || application.status === 'waitlisted') && (
                    <WithdrawApplicationButton applicationId={application.id} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
